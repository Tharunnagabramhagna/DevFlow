import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role, User } from '@prisma/client';
import { env } from '../../config/env';
import { prisma as defaultPrisma } from '../../config/database';
import { emailService, IEmailService } from '../../services/email.service';
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
  constructor(
    private prisma: PrismaClient = defaultPrisma,
    private mailer: IEmailService = emailService
  ) {}

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
   * Strict Single-Use Atomic Refresh Token Rotation.
   * - Employs atomic conditional update (updateMany) to enforce race-condition safety.
   * - On reuse detection: transactionally revokes the entire token family, commits to DB, and throws TOKEN_REUSE_DETECTED.
   */
  async rotateRefreshToken(rawToken: string): Promise<{ accessToken: string; rawRefreshToken: string }> {
    if (!rawToken) {
      throw new UnauthorizedError('Refresh token required');
    }

    const tokenHash = hashToken(rawToken);

    // 1. Fetch token record to check status
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // 2. Token was already revoked: Replay attack detected!
    if (tokenRecord.revokedAt !== null) {
      // Commit revocation of all tokens in this family first before throwing
      await this.prisma.refreshToken.updateMany({
        where: { familyId: tokenRecord.familyId },
        data: { revokedAt: new Date() },
      });

      throw new UnauthorizedError('Token reuse detected. Family revoked.', undefined, 'TOKEN_REUSE_DETECTED');
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token has expired');
    }

    // 3. Atomically claim and rotate in a database transaction
    const rotationResult = await this.prisma.$transaction(async (tx) => {
      // Atomic conditional update: only 1 request can revoke the token when revokedAt is null
      const updateResult = await tx.refreshToken.updateMany({
        where: {
          id: tokenRecord.id,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: {
          revokedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        // Concurrency race: another request won the race
        return { raced: true, successorRaw: null as string | null, accessToken: null as string | null };
      }

      // Issue single-use successor in the same family
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

      await tx.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { replacedByTokenId: successor.id },
      });

      const accessToken = this.generateAccessToken(tokenRecord.user);
      return { raced: false, successorRaw, accessToken };
    });

    // 4. Handle concurrent race condition: commit family revocation and throw
    if (rotationResult.raced || !rotationResult.successorRaw || !rotationResult.accessToken) {
      await this.prisma.refreshToken.updateMany({
        where: { familyId: tokenRecord.familyId },
        data: { revokedAt: new Date() },
      });

      throw new UnauthorizedError('Token reuse detected. Family revoked.', undefined, 'TOKEN_REUSE_DETECTED');
    }

    return {
      accessToken: rotationResult.accessToken,
      rawRefreshToken: rotationResult.successorRaw,
    };
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
   * Generates a single-use password reset token and dispatches email.
   * Returns generic success to prevent user enumeration.
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean; resetToken?: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Anti-enumeration: return uniform success response
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

    // Dispatch email notification
    await this.mailer.sendPasswordResetEmail(user.email, rawResetToken);

    return {
      success: true,
      resetToken: env.NODE_ENV !== 'production' ? rawResetToken : undefined,
    };
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

      // Invalidate all active refresh token families for this user
      await tx.refreshToken.updateMany({
        where: { userId: resetRecord.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
  }

  /**
   * Generates authorization redirect URL for GitHub OAuth with PKCE.
   */
  async initiateGitHubOAuth(): Promise<{ authorizeUrl: string; rawState: string }> {
    if (!env.GITHUB_CLIENT_ID) {
      throw new BadRequestError('GitHub OAuth is not configured on this server');
    }

    // Generate PKCE verifier and challenge
    const codeVerifier = generateSecureToken(32);
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    const { rawState } = await this.createOAuthState(codeVerifier);

    const redirectUri = env.GITHUB_CALLBACK_URL || `${env.CLIENT_URL}/api/auth/github/callback`;
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: redirectUri,
      scope: 'read:user user:email',
      state: rawState,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    const authorizeUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
    return { authorizeUrl, rawState };
  }

  /**
   * Handles GitHub OAuth callback, verifies state + PKCE, validates verified email, and processes login/linking.
   */
  async handleGitHubCallback(
    code: string,
    state: string,
    rawCookieState?: string
  ): Promise<
    | { action: 'EXCHANGE'; code: string }
    | { action: 'LINK_REQUIRED'; ticket: string }
  > {
    // 1. Validate browser-bound state and decrypt PKCE verifier
    const codeVerifier = await this.validateOAuthState(state, rawCookieState);

    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
      throw new BadRequestError('GitHub OAuth credentials not configured');
    }

    // 2. Exchange authorization code with GitHub for access token
    const redirectUri = env.GITHUB_CALLBACK_URL || `${env.CLIENT_URL}/api/auth/github/callback`;
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        code_verifier: codeVerifier || undefined,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      throw new BadRequestError('Failed to exchange code with GitHub');
    }

    const tokenData = (await tokenResponse.json()) as { access_token?: string; error?: string };
    if (!tokenData.access_token) {
      throw new BadRequestError(tokenData.error || 'GitHub did not return an access token');
    }

    const githubAccessToken = tokenData.access_token;

    // 3. Fetch GitHub profile
    const profileResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        'User-Agent': 'DevFlow-Backend',
      },
    });

    if (!profileResponse.ok) {
      throw new BadRequestError('Failed to retrieve GitHub user profile');
    }

    const profile = (await profileResponse.json()) as {
      id: number;
      login: string;
      name: string | null;
      avatar_url: string | null;
    };

    const githubId = String(profile.id);

    // 4. Fetch GitHub verified email addresses
    const emailResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        'User-Agent': 'DevFlow-Backend',
      },
    });

    if (!emailResponse.ok) {
      throw new BadRequestError('Failed to retrieve GitHub email addresses');
    }

    const emails = (await emailResponse.json()) as Array<{
      email: string;
      primary: boolean;
      verified: boolean;
    }>;

    const primaryVerified = emails.find((e) => e.primary && e.verified);
    if (!primaryVerified) {
      throw new BadRequestError(
        'A verified primary email address is required on your GitHub account',
        undefined,
        'UNVERIFIED_GITHUB_EMAIL'
      );
    }

    const verifiedEmail = primaryVerified.email.toLowerCase();

    // 5. User resolution logic:
    // Case A: User already linked by githubId
    const existingByGithub = await this.prisma.user.findUnique({
      where: { githubId },
    });

    if (existingByGithub) {
      const exchangeCode = await this.createOAuthExchangeCode(existingByGithub.id);
      return { action: 'EXCHANGE', code: exchangeCode };
    }

    // Case B: User with matching verified email exists but is NOT linked to this githubId
    // CRITICAL SECURITY RULE: NEVER AUTO-LINK. Require explicit account confirmation.
    const existingByEmail = await this.prisma.user.findUnique({
      where: { email: verifiedEmail },
    });

    if (existingByEmail) {
      // Create account linking challenge without storing raw GitHub access tokens
      const ticket = await this.createAccountLinkingChallenge(existingByEmail.id, githubId);
      return { action: 'LINK_REQUIRED', ticket };
    }

    // Case C: Brand new user: provision account
    const newUser = await this.prisma.user.create({
      data: {
        email: verifiedEmail,
        name: profile.name || profile.login,
        avatarUrl: profile.avatar_url,
        githubId,
        role: Role.FREELANCER,
      },
    });

    const exchangeCode = await this.createOAuthExchangeCode(newUser.id);
    return { action: 'EXCHANGE', code: exchangeCode };
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
   * Encrypted token is set to null since token retention is not required for authentication.
   */
  async createAccountLinkingChallenge(userId: string, githubId: string): Promise<string> {
    const rawTicket = generateSecureToken(32);
    const challengeHash = hashToken(rawTicket);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.prisma.accountLinkingChallenge.create({
      data: {
        challengeHash,
        userId,
        githubId,
        encryptedGithubToken: null,
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

      // Link GitHub account without storing raw access tokens
      const updatedUser = await tx.user.update({
        where: { id: challenge.userId },
        data: {
          githubId: challenge.githubId,
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
      include: { user: true },
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

    await this.mailer.sendAccountLinkingOtp(challenge.user.email, otp);

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

      // Link GitHub account without storing raw access tokens
      const updatedUser = await tx.user.update({
        where: { id: challenge.userId },
        data: {
          githubId: challenge.githubId,
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
