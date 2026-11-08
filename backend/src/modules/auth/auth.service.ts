import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role, User } from '@prisma/client';
import { env } from '../../config/env';
import { prisma as defaultPrisma } from '../../config/database';
import {
  hashToken,
  encryptSecret,
  decryptSecret,
  generateSecureToken,
  generateOtp,
} from '../../utils/crypto';
import {
  BadRequestError,
  UnauthorizedError,
  ConflictError,
  NotFoundError,
} from '../../utils/errors';
import { RegisterDto, LoginDto } from './auth.schema';

export interface SanitizedUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: Date;
}

export const sanitizeUser = (user: User): SanitizedUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  avatarUrl: user.avatarUrl,
  bio: user.bio,
  createdAt: user.createdAt,
});

export class AuthService {
  constructor(private prisma: PrismaClient = defaultPrisma) {}

  /**
   * Registers a new user with bcrypt password hashing.
   */
  async register(dto: RegisterDto): Promise<{ user: SanitizedUser; accessToken: string; rawRefreshToken: string }> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictError('A user with this email address already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        role: dto.role as Role,
      },
    });

    const accessToken = this.generateAccessToken(user);
    const rawRefreshToken = await this.issueRefreshToken(user.id);

    return {
      user: sanitizeUser(user),
      accessToken,
      rawRefreshToken,
    };
  }

  /**
   * Authenticates user credentials and issues session token pair.
   */
  async login(dto: LoginDto): Promise<{ user: SanitizedUser; accessToken: string; rawRefreshToken: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const accessToken = this.generateAccessToken(user);
    const rawRefreshToken = await this.issueRefreshToken(user.id);

    return {
      user: sanitizeUser(user),
      accessToken,
      rawRefreshToken,
    };
  }

  /**
   * 2-Step Atomic Refresh Token Rotation with 30s Grace Period and Family Reuse Revocation.
   */
  async rotateRefreshToken(rawToken: string): Promise<{ accessToken: string; rawRefreshToken: string | null; isGraceReplay: boolean }> {
    if (!rawToken) {
      throw new UnauthorizedError('Refresh token required');
    }

    const tokenHash = hashToken(rawToken);

    return await this.prisma.$transaction(async (tx) => {
      // Find token record with row lock
      const tokenRecord = await tx.refreshToken.findUnique({
        where: { tokenHash },
      });

      if (!tokenRecord) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      if (tokenRecord.expiresAt < new Date()) {
        throw new UnauthorizedError('Refresh token has expired');
      }

      // Check if token was already revoked / rotated
      if (tokenRecord.revokedAt !== null) {
        const gracePeriodMs = 30 * 1000; // 30-second token family grace period
        const isWithinGrace = tokenRecord.revokedAt.getTime() + gracePeriodMs > Date.now();

        if (isWithinGrace) {
          // Concurrency race across sibling tabs: return active successor access token
          const user = await tx.user.findUnique({
            where: { id: tokenRecord.userId },
          });
          if (!user) throw new UnauthorizedError('User not found');

          const accessToken = this.generateAccessToken(user);
          return { accessToken, rawRefreshToken: null, isGraceReplay: true };
        }

        // Security Breach Detected: Outside grace period reuse -> Revoke entire token family
        await tx.refreshToken.updateMany({
          where: { familyId: tokenRecord.familyId },
          data: { revokedAt: new Date() },
        });

        throw new UnauthorizedError('TOKEN_REUSE_DETECTED: Token family has been revoked due to reuse');
      }

      // Normal Rotation: generate successor
      const successorRaw = generateSecureToken(32);
      const successorHash = hashToken(successorRaw);
      const successorExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const successor = await tx.refreshToken.create({
        data: {
          familyId: tokenRecord.familyId,
          tokenHash: successorHash,
          userId: tokenRecord.userId,
          expiresAt: successorExpiresAt,
        },
      });

      // Atomically mark current token as revoked and linked to successor
      await tx.refreshToken.update({
        where: { id: tokenRecord.id },
        data: {
          revokedAt: new Date(),
          replacedByTokenId: successor.id,
        },
      });

      const user = await tx.user.findUnique({
        where: { id: tokenRecord.userId },
      });
      if (!user) throw new UnauthorizedError('User not found');

      const accessToken = this.generateAccessToken(user);

      return {
        accessToken,
        rawRefreshToken: successorRaw,
        isGraceReplay: false,
      };
    });
  }

  /**
   * Revokes current refresh token on user logout.
   */
  async logout(rawToken?: string): Promise<void> {
    if (!rawToken) return;
    const tokenHash = hashToken(rawToken);

    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Generates a single-use password reset token.
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean; resetToken?: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Prevent user enumeration: return generic success
      return { success: true };
    }

    const rawResetToken = generateSecureToken(32);
    const tokenHash = hashToken(rawResetToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    return { success: true, resetToken: rawResetToken };
  }

  /**
   * Atomically consumes password reset token, updates password, and revokes all refresh token families.
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(token);

    await this.prisma.$transaction(async (tx) => {
      const resetRecord = await tx.passwordResetToken.findUnique({
        where: { tokenHash },
      });

      if (!resetRecord || resetRecord.usedAt !== null || resetRecord.expiresAt < new Date()) {
        throw new BadRequestError('Invalid or expired password reset token');
      }

      // Mark token as used
      await tx.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      });

      // Update password hash
      const passwordHash = await bcrypt.hash(newPassword, 12);
      await tx.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
      });

      // Revoke all active refresh tokens for user
      await tx.refreshToken.updateMany({
        where: { userId: resetRecord.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
  }

  /**
   * Creates an encrypted PKCE OAuth state.
   */
  async createOAuthState(pkceVerifier?: string): Promise<{ rawState: string }> {
    const rawState = generateSecureToken(32);
    const stateHash = hashToken(rawState);
    const encryptedPkce = pkceVerifier ? encryptSecret(pkceVerifier) : null;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.prisma.oAuthState.create({
      data: {
        stateHash,
        pkceVerifier: encryptedPkce,
        expiresAt,
      },
    });

    return { rawState };
  }

  /**
   * Validates and atomically consumes OAuth state.
   */
  async validateOAuthState(state: string, rawCookieState?: string): Promise<string | null> {
    if (!state || (rawCookieState && state !== rawCookieState)) {
      throw new UnauthorizedError('OAuth state mismatch or missing cookie state');
    }

    const stateHash = hashToken(state);

    const record = await this.prisma.oAuthState.findUnique({
      where: { stateHash },
    });

    if (!record || record.usedAt !== null || record.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid or expired OAuth state');
    }

    await this.prisma.oAuthState.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    return record.pkceVerifier ? decryptSecret(record.pkceVerifier) : null;
  }

  /**
   * Issues a short-lived one-time exchange code for frontend OAuth redirection.
   */
  async createOAuthExchangeCode(userId: string): Promise<string> {
    const rawCode = generateSecureToken(32);
    const codeHash = hashToken(rawCode);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await this.prisma.oAuthExchangeCode.create({
      data: {
        codeHash,
        userId,
        expiresAt,
      },
    });

    return rawCode;
  }

  /**
   * Atomically exchanges one-time OAuth code for user session.
   */
  async exchangeOAuthCode(code: string): Promise<{ user: SanitizedUser; accessToken: string; rawRefreshToken: string }> {
    const codeHash = hashToken(code);

    const record = await this.prisma.oAuthExchangeCode.findUnique({
      where: { codeHash },
      include: { user: true },
    });

    if (!record || record.usedAt !== null || record.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid or expired OAuth exchange code');
    }

    await this.prisma.oAuthExchangeCode.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    const accessToken = this.generateAccessToken(record.user);
    const rawRefreshToken = await this.issueRefreshToken(record.user.id);

    return {
      user: sanitizeUser(record.user),
      accessToken,
      rawRefreshToken,
    };
  }

  /**
   * Creates an account linking challenge when an OAuth email collides with an existing account.
   */
  async createAccountLinkingChallenge(userId: string, githubId: string, githubAccessToken: string): Promise<string> {
    const rawTicket = generateSecureToken(32);
    const challengeHash = hashToken(rawTicket);
    const encryptedGithubToken = encryptSecret(githubAccessToken);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.prisma.accountLinkingChallenge.create({
      data: {
        challengeHash,
        userId,
        githubId,
        encryptedGithubToken,
        expiresAt,
      },
    });

    return rawTicket;
  }

  /**
   * Retrieves challenge status for frontend modal.
   */
  async getAccountLinkingStatus(challengeTicket: string): Promise<{ email: string; requiresPassword: boolean }> {
    const challengeHash = hashToken(challengeTicket);
    const challenge = await this.prisma.accountLinkingChallenge.findUnique({
      where: { challengeHash },
      include: { user: true },
    });

    if (!challenge || challenge.usedAt !== null || challenge.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid or expired account linking challenge');
    }

    return {
      email: challenge.user.email,
      requiresPassword: !!challenge.user.passwordHash,
    };
  }

  /**
   * Resolves account linking via password verification.
   */
  async verifyAccountLinkingPassword(challengeTicket: string, password: string): Promise<{ user: SanitizedUser; accessToken: string; rawRefreshToken: string }> {
    const challengeHash = hashToken(challengeTicket);

    return await this.prisma.$transaction(async (tx) => {
      const challenge = await tx.accountLinkingChallenge.findUnique({
        where: { challengeHash },
        include: { user: true },
      });

      if (!challenge || challenge.usedAt !== null || challenge.expiresAt < new Date()) {
        throw new UnauthorizedError('Invalid or expired account linking challenge');
      }

      if (!challenge.user.passwordHash) {
        throw new BadRequestError('User does not have a password configured');
      }

      const isValid = await bcrypt.compare(password, challenge.user.passwordHash);
      if (!isValid) {
        throw new UnauthorizedError('Incorrect password');
      }

      // Mark challenge used
      await tx.accountLinkingChallenge.update({
        where: { id: challenge.id },
        data: { usedAt: new Date() },
      });

      // Link GitHub account
      const updatedUser = await tx.user.update({
        where: { id: challenge.userId },
        data: {
          githubId: challenge.githubId,
          githubAccessToken: challenge.encryptedGithubToken,
        },
      });

      const accessToken = this.generateAccessToken(updatedUser);
      const rawRefreshToken = await this.issueRefreshToken(updatedUser.id);

      return {
        user: sanitizeUser(updatedUser),
        accessToken,
        rawRefreshToken,
      };
    });
  }

  /**
   * Dispatches a 6-digit OTP for passwordless account linking.
   */
  async sendAccountLinkingOtp(challengeTicket: string): Promise<{ success: boolean; cooldownSeconds: number; devOtp?: string }> {
    const challengeHash = hashToken(challengeTicket);
    const challenge = await this.prisma.accountLinkingChallenge.findUnique({
      where: { challengeHash },
    });

    if (!challenge || challenge.usedAt !== null || challenge.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid or expired account linking challenge');
    }

    // Cooldown check (60s)
    if (challenge.otpSentAt) {
      const elapsed = Math.floor((Date.now() - challenge.otpSentAt.getTime()) / 1000);
      if (elapsed < challenge.resendCooldownSeconds) {
        return { success: false, cooldownSeconds: challenge.resendCooldownSeconds - elapsed };
      }
    }

    const { otp, otpHash } = generateOtp();

    await this.prisma.accountLinkingChallenge.update({
      where: { id: challenge.id },
      data: {
        otpHash,
        otpSentAt: new Date(),
        otpAttempts: 0,
      },
    });

    return {
      success: true,
      cooldownSeconds: 60,
      devOtp: env.NODE_ENV !== 'production' ? otp : undefined,
    };
  }

  /**
   * Resolves account linking via OTP verification.
   */
  async verifyAccountLinkingOtp(challengeTicket: string, otp: string): Promise<{ user: SanitizedUser; accessToken: string; rawRefreshToken: string }> {
    const challengeHash = hashToken(challengeTicket);

    return await this.prisma.$transaction(async (tx) => {
      const challenge = await tx.accountLinkingChallenge.findUnique({
        where: { challengeHash },
        include: { user: true },
      });

      if (!challenge || challenge.usedAt !== null || challenge.expiresAt < new Date()) {
        throw new UnauthorizedError('Invalid or expired account linking challenge');
      }

      if (challenge.otpAttempts >= challenge.maxOtpAttempts) {
        throw new UnauthorizedError('Maximum OTP attempts exceeded. Please request a new code.');
      }

      const inputHash = hashToken(otp);
      if (inputHash !== challenge.otpHash) {
        await tx.accountLinkingChallenge.update({
          where: { id: challenge.id },
          data: { otpAttempts: { increment: 1 } },
        });
        throw new UnauthorizedError('Invalid 6-digit verification code');
      }

      // Mark challenge used
      await tx.accountLinkingChallenge.update({
        where: { id: challenge.id },
        data: { usedAt: new Date() },
      });

      // Link GitHub account
      const updatedUser = await tx.user.update({
        where: { id: challenge.userId },
        data: {
          githubId: challenge.githubId,
          githubAccessToken: challenge.encryptedGithubToken,
        },
      });

      const accessToken = this.generateAccessToken(updatedUser);
      const rawRefreshToken = await this.issueRefreshToken(updatedUser.id);

      return {
        user: sanitizeUser(updatedUser),
        accessToken,
        rawRefreshToken,
      };
    });
  }

  /**
   * Returns provider configuration readiness status for Google and Facebook OAuth.
   */
  getOAuthProvidersStatus(): {
    google: { configured: boolean; clientIdPrefix?: string };
    facebook: { configured: boolean; appIdPrefix?: string };
  } {
    return {
      google: {
        configured: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
        clientIdPrefix: env.GOOGLE_CLIENT_ID ? `${env.GOOGLE_CLIENT_ID.substring(0, 10)}...` : undefined,
      },
      facebook: {
        configured: Boolean(env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET),
        appIdPrefix: env.FACEBOOK_APP_ID ? `${env.FACEBOOK_APP_ID.substring(0, 6)}...` : undefined,
      },
    };
  }

  /**
   * Initiates Google or Facebook OAuth flow with cryptographic role preservation.
   */
  async initiateSocialOAuth(params: {
    provider: 'google' | 'facebook';
    role: Role;
    intent: 'login' | 'signup';
    callbackUrl?: string;
  }): Promise<{ authUrl: string; rawState: string }> {
    const isGoogle = params.provider === 'google';

    if (isGoogle) {
      if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
        throw new BadRequestError(
          'Google OAuth is not configured on this server. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env.',
          undefined,
          'GOOGLE_OAUTH_NOT_CONFIGURED'
        );
      }
    } else {
      if (!env.FACEBOOK_APP_ID || !env.FACEBOOK_APP_SECRET) {
        throw new BadRequestError(
          'Facebook OAuth is not configured on this server. Please configure FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in backend/.env.',
          undefined,
          'FACEBOOK_OAUTH_NOT_CONFIGURED'
        );
      }
    }

    // Embed metadata securely into the state's encrypted verifier payload
    const metadata = JSON.stringify({
      provider: params.provider,
      role: params.role,
      intent: params.intent,
      createdAt: Date.now(),
    });

    const { rawState } = await this.createOAuthState(metadata);

    let authUrl = '';

    if (isGoogle) {
      const redirectUri =
        params.callbackUrl ||
        env.GOOGLE_CALLBACK_URL ||
        `http://localhost:3001/api/auth/oauth/google/callback`;
      const query = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID!,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state: rawState,
        access_type: 'offline',
        prompt: 'select_account',
      });
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${query.toString()}`;
    } else {
      const redirectUri =
        params.callbackUrl ||
        env.FACEBOOK_CALLBACK_URL ||
        `http://localhost:3001/api/auth/oauth/facebook/callback`;
      const query = new URLSearchParams({
        client_id: env.FACEBOOK_APP_ID!,
        redirect_uri: redirectUri,
        state: rawState,
        scope: 'email,public_profile',
        response_type: 'code',
      });
      authUrl = `https://www.facebook.com/v19.0/dialog/oauth?${query.toString()}`;
    }

    return { authUrl, rawState };
  }

  /**
   * Resolves social OAuth user identity against database with strict role verification.
   */
  async handleSocialUserResolution(params: {
    provider: 'google' | 'facebook';
    email: string;
    name: string;
    avatarUrl?: string | null;
    selectedRole: Role;
    intent: 'login' | 'signup';
  }): Promise<{ exchangeCode: string; user: SanitizedUser }> {
    const normalizedEmail = params.email.toLowerCase().trim();

    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      // STRICT ROLE VALIDATION: Cross-role social login is strictly blocked!
      if (existingUser.role !== params.selectedRole) {
        const expectedRoleLabel = existingUser.role === 'CLIENT' ? 'Client' : 'Developer';
        throw new ConflictError(
          `Role mismatch: This account is registered as a ${expectedRoleLabel}. Please select the ${expectedRoleLabel} role option to log in.`
        );
      }

      // If user exists and roles match, update avatar if missing
      if (!existingUser.avatarUrl && params.avatarUrl) {
        await this.prisma.user.update({
          where: { id: existingUser.id },
          data: { avatarUrl: params.avatarUrl },
        });
      }

      const exchangeCode = await this.createOAuthExchangeCode(existingUser.id);
      return {
        exchangeCode,
        user: sanitizeUser(existingUser),
      };
    }

    // New user provisioning: create account with the preserved selectedRole
    const newUser = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        name: params.name || (params.selectedRole === 'CLIENT' ? 'Client User' : 'Developer User'),
        role: params.selectedRole,
        avatarUrl: params.avatarUrl || null,
      },
    });

    const exchangeCode = await this.createOAuthExchangeCode(newUser.id);
    return {
      exchangeCode,
      user: sanitizeUser(newUser),
    };
  }

  /**
   * Handles Google OAuth callback code exchange and profile retrieval.
   */
  async handleGoogleOAuthCallback(params: {
    code: string;
    state: string;
    rawCookieState?: string;
    callbackUrl?: string;
  }): Promise<{ exchangeCode: string; user: SanitizedUser }> {
    const decryptedState = await this.validateOAuthState(params.state, params.rawCookieState);
    if (!decryptedState) {
      throw new UnauthorizedError('Invalid or expired OAuth state metadata');
    }

    let metadata: { provider: string; role: Role; intent: 'login' | 'signup' };
    try {
      metadata = JSON.parse(decryptedState);
    } catch {
      throw new UnauthorizedError('Corrupt OAuth state payload');
    }

    const redirectUri =
      params.callbackUrl ||
      env.GOOGLE_CALLBACK_URL ||
      `http://localhost:3001/api/auth/oauth/google/callback`;

    // Exchange code with Google
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: params.code,
        client_id: env.GOOGLE_CLIENT_ID || '',
        client_secret: env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text().catch(() => '');
      throw new UnauthorizedError(`Failed to exchange authorization code with Google: ${errBody}`);
    }

    const tokenData = (await tokenRes.json()) as { access_token: string };
    const accessToken = tokenData.access_token;

    // Fetch verified profile from Google UserInfo endpoint
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileRes.ok) {
      throw new UnauthorizedError('Failed to fetch verified user profile from Google');
    }

    const profile = (await profileRes.json()) as {
      email?: string;
      name?: string;
      picture?: string;
    };

    if (!profile.email) {
      throw new BadRequestError('Google did not return a verified email address');
    }

    return this.handleSocialUserResolution({
      provider: 'google',
      email: profile.email,
      name: profile.name || 'Google User',
      avatarUrl: profile.picture || null,
      selectedRole: metadata.role,
      intent: metadata.intent,
    });
  }

  /**
   * Handles Facebook OAuth callback code exchange and profile retrieval.
   */
  async handleFacebookOAuthCallback(params: {
    code: string;
    state: string;
    rawCookieState?: string;
    callbackUrl?: string;
  }): Promise<{ exchangeCode: string; user: SanitizedUser }> {
    const decryptedState = await this.validateOAuthState(params.state, params.rawCookieState);
    if (!decryptedState) {
      throw new UnauthorizedError('Invalid or expired OAuth state metadata');
    }

    let metadata: { provider: string; role: Role; intent: 'login' | 'signup' };
    try {
      metadata = JSON.parse(decryptedState);
    } catch {
      throw new UnauthorizedError('Corrupt OAuth state payload');
    }

    const redirectUri =
      params.callbackUrl ||
      env.FACEBOOK_CALLBACK_URL ||
      `http://localhost:3001/api/auth/oauth/facebook/callback`;

    // Exchange code with Facebook Graph API
    const tokenQuery = new URLSearchParams({
      client_id: env.FACEBOOK_APP_ID || '',
      client_secret: env.FACEBOOK_APP_SECRET || '',
      redirect_uri: redirectUri,
      code: params.code,
    });

    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?${tokenQuery.toString()}`
    );
    if (!tokenRes.ok) {
      const errBody = await tokenRes.text().catch(() => '');
      throw new UnauthorizedError(`Failed to exchange authorization code with Facebook: ${errBody}`);
    }

    const tokenData = (await tokenRes.json()) as { access_token: string };
    const accessToken = tokenData.access_token;

    // Fetch user profile from Facebook Graph API
    const profileRes = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${accessToken}`
    );

    if (!profileRes.ok) {
      throw new UnauthorizedError('Failed to retrieve user profile from Facebook');
    }

    const profile = (await profileRes.json()) as {
      email?: string;
      name?: string;
      picture?: { data?: { url?: string } };
    };

    if (!profile.email) {
      throw new BadRequestError(
        'Facebook did not return a verified email address. Please ensure email permissions are granted, or sign up with email and password.'
      );
    }

    return this.handleSocialUserResolution({
      provider: 'facebook',
      email: profile.email,
      name: profile.name || 'Facebook User',
      avatarUrl: profile.picture?.data?.url || null,
      selectedRole: metadata.role,
      intent: metadata.intent,
    });
  }

  /**
   * Sandbox mock social auth for hackathon verification when OAuth credentials are unset.
   */
  async mockSocialAuth(params: {
    provider: 'google' | 'facebook';
    email: string;
    name: string;
    selectedRole: Role;
    avatarUrl?: string;
  }): Promise<{ user: SanitizedUser; accessToken: string; rawRefreshToken: string }> {
    const normalizedEmail = params.email.toLowerCase().trim();

    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      if (existingUser.role !== params.selectedRole) {
        const expectedRoleLabel = existingUser.role === 'CLIENT' ? 'Client' : 'Developer';
        throw new ConflictError(
          `Role mismatch: This account is registered as a ${expectedRoleLabel}. Please select the ${expectedRoleLabel} role option to log in.`
        );
      }

      const accessToken = this.generateAccessToken(existingUser);
      const rawRefreshToken = await this.issueRefreshToken(existingUser.id);
      return {
        user: sanitizeUser(existingUser),
        accessToken,
        rawRefreshToken,
      };
    }

    const newUser = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        name: params.name,
        role: params.selectedRole,
        avatarUrl: params.avatarUrl || null,
      },
    });

    const accessToken = this.generateAccessToken(newUser);
    const rawRefreshToken = await this.issueRefreshToken(newUser.id);
    return {
      user: sanitizeUser(newUser),
      accessToken,
      rawRefreshToken,
    };
  }

  // Helper: Generates 15-minute in-memory JWT access token
  private generateAccessToken(user: User): string {
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      env.JWT_SECRET,
      { expiresIn: '15m' }
    );
  }

  // Helper: Issues and stores a new 7-day refresh token in DB
  private async issueRefreshToken(userId: string): Promise<string> {
    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);
    const familyId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        familyId,
        tokenHash,
        userId,
        expiresAt,
      },
    });

    return rawToken;
  }
}

export const authService = new AuthService();

