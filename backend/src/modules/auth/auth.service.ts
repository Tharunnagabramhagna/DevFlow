import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Prisma, PrismaClient, Role, User } from '@prisma/client';
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
  AppError,
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
  role: Role | 'GUEST';
  avatarUrl: string | null;
  bio: string | null;
  isGuest?: boolean;
  guestPersona?: 'CLIENT' | 'DEVELOPER' | null;
  organization?: string;
  githubConnected?: boolean;
  githubUsername?: string | null;
  githubConnectedAt?: Date | null;
  createdAt: Date;
}

export const sanitizeUser = (user: User): SanitizedUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  avatarUrl: user.avatarUrl,
  bio: user.bio,
  githubConnected: Boolean(user.githubId && user.githubAccessToken),
  githubUsername: user.githubUsername ?? null,
  githubConnectedAt: user.githubConnectedAt ?? null,
  createdAt: user.createdAt,
});

function sanitizeReturnPath(returnPath?: string | null): string {
  if (!returnPath || typeof returnPath !== 'string') {
    return '/dashboard';
  }
  const trimmed = returnPath.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('://')) {
    return '/dashboard';
  }
  return trimmed;
}

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

    let user: User;
    try {
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          name: dto.name,
          role: dto.role as Role,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictError('A user with this email address already exists');
      }
      throw err;
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
   * Generates a guest demonstration session with limited permissions and a signed JWT.
   * Supports role-based guest persona ('CLIENT' | 'DEVELOPER') with realistic identities.
   */
  async createGuestSession(persona?: 'CLIENT' | 'DEVELOPER'): Promise<{ user: SanitizedUser; accessToken: string }> {
    const isClient = persona === 'CLIENT';
    const isDeveloper = persona === 'DEVELOPER';
    const guestId = `guest_${generateSecureToken(12)}`;

    let name = 'Guest Explorer';
    let email = 'guest@devflow.demo';
    let organization = 'DevFlow Sandbox Demo';
    let bio = 'Exploring DevFlow features in demonstration mode.';

    if (isClient) {
      name = 'Marcus Vance';
      email = 'client.guest@devflow.demo';
      organization = 'Meridian Labs (Demo Client)';
      bio = "Exploring DevFlow features from a Client perspective in demonstration mode.";
    } else if (isDeveloper) {
      name = 'Alex Morgan';
      email = 'developer.guest@devflow.demo';
      organization = 'Northstar Studio (Demo Developer)';
      bio = "Exploring DevFlow features from a Developer perspective in demonstration mode.";
    }

    const guestUser: SanitizedUser = {
      id: guestId,
      email,
      name,
      role: 'GUEST',
      avatarUrl: null,
      bio,
      isGuest: true,
      guestPersona: persona || null,
      organization,
      createdAt: new Date(),
    };

    const accessToken = jwt.sign(
      {
        sub: guestUser.id,
        email: guestUser.email,
        role: 'GUEST',
        isGuest: true,
        guestPersona: guestUser.guestPersona,
      },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return {
      user: guestUser,
      accessToken,
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
   * Generates GitHub OAuth 2.0 + PKCE authorize URL for an already-authenticated user connecting repositories.
   */
  async initiateGitHubConnectOAuth(
    userId: string,
    returnPath = '/dashboard'
  ): Promise<{ authorizeUrl: string; rawState: string }> {
    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
      throw new AppError(
        503,
        'GITHUB_NOT_CONFIGURED',
        'GitHub OAuth is not configured on this server. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in backend environment settings.'
      );
    }

    const codeVerifier = generateSecureToken(32);
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    const safeReturnPath = sanitizeReturnPath(returnPath);
    const { rawState } = await this.createOAuthState(codeVerifier, {
      initiatingUserId: userId,
      purpose: 'CONNECT_GITHUB',
      returnPath: safeReturnPath,
    });
    const redirectUri = env.GITHUB_CALLBACK_URL || `${env.CLIENT_URL}/api/auth/github/callback`;
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: redirectUri,
      scope: 'read:user user:email repo',
      state: rawState,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return {
      authorizeUrl: `https://github.com/login/oauth/authorize?${params.toString()}`,
      rawState,
    };
  }

  /**
   * Handles GitHub OAuth callback, verifies state + PKCE, and processes either CONNECT_GITHUB or LOGIN/linking.
   */
  async handleGitHubCallback(
    code: string | undefined,
    state: string | undefined,
    rawCookieState?: string,
    oauthError?: string
  ): Promise<
    | { action: 'EXCHANGE'; code: string }
    | { action: 'LINK_REQUIRED'; ticket: string }
    | { action: 'REDIRECT'; redirectUrl: string }
  > {
    if (oauthError) {
      let safeReturnPath = '/dashboard';
      let purpose = 'LOGIN';
      if (state) {
        try {
          const stateContext = await this.validateGitHubOAuthState(state, rawCookieState);
          purpose = stateContext.purpose;
          safeReturnPath = sanitizeReturnPath(stateContext.returnPath);
        } catch {
          // Ignore expired/mismatched state on user-cancelled callback and fall back cleanly
        }
      }
      if (purpose === 'CONNECT_GITHUB') {
        return {
          action: 'REDIRECT',
          redirectUrl: `${env.CLIENT_URL}/#${safeReturnPath}?github_error=${encodeURIComponent(oauthError)}`,
        };
      }
      return {
        action: 'REDIRECT',
        redirectUrl: `${env.CLIENT_URL}/#/login?oauth_error=${encodeURIComponent(oauthError)}`,
      };
    }

    if (!code || !state) {
      throw new BadRequestError('Authorization code and state parameter are required');
    }

    // 1. Validate browser-bound state and decrypt PKCE verifier
    const { codeVerifier, purpose, initiatingUserId, returnPath } = await this.validateGitHubOAuthState(
      state,
      rawCookieState
    );
    const safeReturnPath = sanitizeReturnPath(returnPath);

    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
      if (purpose === 'CONNECT_GITHUB') {
        return {
          action: 'REDIRECT',
          redirectUrl: `${env.CLIENT_URL}/#${safeReturnPath}?github_error=github_not_configured`,
        };
      }
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
        Accept: 'application/vnd.github+json',
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
    const encryptedGithubAccessToken = encryptSecret(githubAccessToken);

    // Authenticated Developer GitHub Connection flow (does NOT create a new auth session)
    if (purpose === 'CONNECT_GITHUB' && initiatingUserId) {
      const existingOwner = await this.prisma.user.findUnique({
        where: { githubId },
      });

      if (existingOwner && existingOwner.id !== initiatingUserId) {
        return {
          action: 'REDIRECT',
          redirectUrl: `${env.CLIENT_URL}/#${safeReturnPath}?github_error=github_account_in_use`,
        };
      }

      await this.prisma.user.update({
        where: { id: initiatingUserId },
        data: {
          githubId,
          githubAccessToken: encryptedGithubAccessToken,
          githubUsername: profile.login,
          githubConnectedAt: new Date(),
        },
      });

      return {
        action: 'REDIRECT',
        redirectUrl: `${env.CLIENT_URL}/#${safeReturnPath}?github=connected`,
      };
    }

    // 4. Fetch GitHub verified email addresses
    const emailResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: 'application/vnd.github+json',
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
      await this.prisma.user.update({
        where: { id: existingByGithub.id },
        data: {
          githubAccessToken: encryptedGithubAccessToken,
          githubUsername: profile.login,
          githubConnectedAt: existingByGithub.githubConnectedAt ?? new Date(),
        },
      });
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
        githubAccessToken: encryptedGithubAccessToken,
        githubUsername: profile.login,
        githubConnectedAt: new Date(),
        role: Role.FREELANCER,
      },
    });

    const exchangeCode = await this.createOAuthExchangeCode(newUser.id);
    return { action: 'EXCHANGE', code: exchangeCode };
  }

  /**
   * Creates an encrypted PKCE OAuth state.
   */
  async createOAuthState(
    pkceVerifier?: string,
    options?: {
      initiatingUserId?: string;
      purpose?: 'LOGIN' | 'CONNECT_GITHUB';
      returnPath?: string;
    }
  ): Promise<{ rawState: string }> {
    const rawState = generateSecureToken(32);
    const stateHash = hashToken(rawState);
    const encryptedPkce = pkceVerifier ? encryptSecret(pkceVerifier) : null;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.prisma.oAuthState.create({
      data: {
        stateHash,
        pkceVerifier: encryptedPkce,
        ...(options?.initiatingUserId ? { initiatingUserId: options.initiatingUserId } : {}),
        ...(options?.purpose ? { purpose: options.purpose } : {}),
        ...(options?.returnPath ? { returnPath: options.returnPath } : {}),
        expiresAt,
      },
    });

    return { rawState };
  }

  private async validateGitHubOAuthState(
    state: string,
    rawCookieState?: string
  ): Promise<{
    codeVerifier: string | null;
    purpose: string;
    initiatingUserId: string | null;
    returnPath: string | null;
  }> {
    if (!state) {
      throw new UnauthorizedError('OAuth state mismatch or missing cookie state');
    }

    if (rawCookieState !== undefined) {
      const stateBuf = Buffer.from(state, 'utf8');
      const cookieBuf = Buffer.from(rawCookieState, 'utf8');
      if (stateBuf.length !== cookieBuf.length || !crypto.timingSafeEqual(stateBuf, cookieBuf)) {
        throw new UnauthorizedError('OAuth state mismatch or missing cookie state');
      }
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

    return {
      codeVerifier: record.pkceVerifier ? decryptSecret(record.pkceVerifier) : null,
      purpose: record.purpose || 'LOGIN',
      initiatingUserId: record.initiatingUserId || null,
      returnPath: record.returnPath || null,
    };
  }

  /**
   * Validates and atomically consumes OAuth state.
   */
  async validateOAuthState(state: string, rawCookieState?: string): Promise<string | null> {
    if (!state) {
      throw new UnauthorizedError('OAuth state mismatch or missing cookie state');
    }

    if (rawCookieState !== undefined) {
      const stateBuf = Buffer.from(state, 'utf8');
      const cookieBuf = Buffer.from(rawCookieState, 'utf8');
      if (stateBuf.length !== cookieBuf.length || !crypto.timingSafeEqual(stateBuf, cookieBuf)) {
        throw new UnauthorizedError('OAuth state mismatch or missing cookie state');
      }
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

  /**
   * Returns provider configuration readiness status for Google and Facebook OAuth.
   */
  getOAuthProvidersStatus(): {
    google: { configured: boolean; clientIdPrefix?: string };
    facebook: { configured: boolean; appIdPrefix?: string };
  } {
    const googleClientId = env.GOOGLE_CLIENT_ID?.trim();
    const googleClientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
    const facebookAppId = env.FACEBOOK_APP_ID?.trim();
    const facebookAppSecret = env.FACEBOOK_APP_SECRET?.trim();

    return {
      google: {
        configured: Boolean(googleClientId && googleClientSecret),
        clientIdPrefix: googleClientId ? `${googleClientId.substring(0, 10)}...` : undefined,
      },
      facebook: {
        configured: Boolean(facebookAppId && facebookAppSecret),
        appIdPrefix: facebookAppId ? `${facebookAppId.substring(0, 6)}...` : undefined,
      },
    };
  }

  /**
   * Centralized Meta / Facebook Graph API version (configurable via env.FACEBOOK_GRAPH_API_VERSION).
   */
  get facebookGraphApiVersion(): string {
    return env.FACEBOOK_GRAPH_API_VERSION?.trim() || 'v27.0';
  }

  /**
   * Normalizes and validates social OAuth initiation role, intent, and optional callback URL.
   */
  normalizeSocialOAuthParams(input: {
    role?: unknown;
    intent?: unknown;
    callbackUrl?: unknown;
  }): { role: Role; intent: 'login' | 'signup'; callbackUrl?: string } {
    const rawRole = typeof input.role === 'string' ? input.role.trim().toUpperCase() : 'FREELANCER';
    let role: Role;
    if (rawRole === 'CLIENT') {
      role = Role.CLIENT;
    } else if (rawRole === 'FREELANCER' || rawRole === 'DEVELOPER') {
      role = Role.FREELANCER;
    } else {
      throw new BadRequestError('Unsupported OAuth role. Select Client or Developer.');
    }

    const rawIntent = typeof input.intent === 'string' ? input.intent.trim().toLowerCase() : 'login';
    if (rawIntent !== 'login' && rawIntent !== 'signup') {
      throw new BadRequestError('Unsupported OAuth intent. Expected login or signup.');
    }

    const callbackUrl =
      typeof input.callbackUrl === 'string' && input.callbackUrl.trim()
        ? input.callbackUrl.trim()
        : undefined;

    return { role, intent: rawIntent, callbackUrl };
  }

  /**
   * Resolves and validates the server OAuth callback URL to enforce redirect_uri consistency.
   */
  private resolveSocialCallbackUrl(provider: 'google' | 'facebook', requestedCallbackUrl?: string): string {
    const configured =
      provider === 'google'
        ? env.GOOGLE_CALLBACK_URL?.trim() || `http://localhost:${env.PORT}/api/auth/oauth/google/callback`
        : env.FACEBOOK_CALLBACK_URL?.trim() || `http://localhost:${env.PORT}/api/auth/oauth/facebook/callback`;

    if (!requestedCallbackUrl) {
      return configured;
    }

    let requestedUrl: URL;
    let configuredUrl: URL;
    try {
      requestedUrl = new URL(requestedCallbackUrl);
      configuredUrl = new URL(configured);
    } catch {
      throw new BadRequestError('Invalid OAuth callback URL.');
    }

    if (
      requestedUrl.origin !== configuredUrl.origin ||
      requestedUrl.pathname !== configuredUrl.pathname
    ) {
      throw new BadRequestError('Untrusted OAuth callback URL.');
    }

    return configured;
  }

  /**
   * Safely peeks role/intent from an OAuth state token so cancellation or errors return to the same role step.
   */
  async peekSocialOAuthStateContext(
    state?: string
  ): Promise<{ role?: Role; intent?: 'login' | 'signup' } | null> {
    if (!state) return null;
    try {
      const record = await this.prisma.oAuthState.findUnique({
        where: { stateHash: hashToken(state) },
      });
      if (!record?.pkceVerifier) return null;
      const metadata = JSON.parse(decryptSecret(record.pkceVerifier)) as {
        role?: Role;
        intent?: 'login' | 'signup';
      };
      return {
        role: metadata.role === Role.CLIENT || metadata.role === Role.FREELANCER ? metadata.role : undefined,
        intent: metadata.intent === 'login' || metadata.intent === 'signup' ? metadata.intent : undefined,
      };
    } catch {
      return null;
    }
  }

  private async extractOAuthErrorDetail(res: Response, fallback: string): Promise<string> {
    try {
      const text = await res.text();
      if (!text) return fallback;
      try {
        const parsed = JSON.parse(text) as {
          error?: string | { message?: string };
          error_description?: string;
          message?: string;
        };
        if (parsed.error_description) return parsed.error_description;
        if (typeof parsed.error === 'object' && parsed.error?.message) return parsed.error.message;
        if (typeof parsed.error === 'string') return parsed.error;
        if (parsed.message) return parsed.message;
      } catch {
        // Ignore non-JSON bodies so raw HTML error pages are not dumped into URLs
      }
      return fallback;
    } catch {
      return fallback;
    }
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
    if (params.role !== Role.CLIENT && params.role !== Role.FREELANCER) {
      throw new BadRequestError('Unsupported OAuth role. Select Client or Developer.');
    }

    const googleClientId = env.GOOGLE_CLIENT_ID?.trim();
    const googleClientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
    const facebookAppId = env.FACEBOOK_APP_ID?.trim();
    const facebookAppSecret = env.FACEBOOK_APP_SECRET?.trim();

    if (isGoogle) {
      if (!googleClientId || !googleClientSecret) {
        throw new BadRequestError(
          'Google OAuth is not configured on this server. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.',
          undefined,
          'GOOGLE_OAUTH_NOT_CONFIGURED'
        );
      }
    } else {
      if (!facebookAppId || !facebookAppSecret) {
        throw new BadRequestError(
          'Facebook OAuth is not configured on this server. Please configure FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in .env.',
          undefined,
          'FACEBOOK_OAUTH_NOT_CONFIGURED'
        );
      }
    }

    const redirectUri = this.resolveSocialCallbackUrl(params.provider, params.callbackUrl);

    // Embed metadata securely into the state's encrypted verifier payload
    const metadata = JSON.stringify({
      provider: params.provider,
      role: params.role,
      intent: params.intent,
      redirectUri,
      createdAt: Date.now(),
    });

    const { rawState } = await this.createOAuthState(metadata);

    let authUrl = '';

    if (isGoogle) {
      const query = new URLSearchParams({
        client_id: googleClientId!,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state: rawState,
        access_type: 'offline',
        prompt: 'select_account',
      });
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${query.toString()}`;
    } else {
      const query = new URLSearchParams({
        client_id: facebookAppId!,
        redirect_uri: redirectUri,
        state: rawState,
        scope: 'email,public_profile',
        response_type: 'code',
      });
      authUrl = `https://www.facebook.com/${this.facebookGraphApiVersion}/dialog/oauth?${query.toString()}`;
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
    if (params.selectedRole !== Role.CLIENT && params.selectedRole !== Role.FREELANCER) {
      throw new BadRequestError('Unsupported role for social authentication.');
    }

    const normalizedEmail = params.email.toLowerCase().trim();

    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      if (existingUser.role === Role.ADMIN) {
        throw new ConflictError(
          'Administrator accounts cannot sign in through Client or Developer social login.'
        );
      }

      // STRICT ROLE VALIDATION: Cross-role social login is strictly blocked!
      if (existingUser.role !== params.selectedRole) {
        const expectedRoleLabel = existingUser.role === 'CLIENT' ? 'Client' : 'Developer';
        throw new ConflictError(
          `Role mismatch: This account is registered as a ${expectedRoleLabel}. Please select the ${expectedRoleLabel} role option to log in.`
        );
      }

      let resolvedUser = existingUser;
      // If user exists and roles match, update avatar if missing
      if (!existingUser.avatarUrl && params.avatarUrl) {
        const updated = await this.prisma.user.update({
          where: { id: existingUser.id },
          data: { avatarUrl: params.avatarUrl },
        });
        resolvedUser = { ...existingUser, ...(updated?.id ? updated : { avatarUrl: params.avatarUrl }) };
      }

      const exchangeCode = await this.createOAuthExchangeCode(existingUser.id);
      return {
        exchangeCode,
        user: sanitizeUser(resolvedUser),
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

    let metadata: {
      provider?: string;
      role?: Role;
      intent?: 'login' | 'signup';
      redirectUri?: string;
    };
    try {
      metadata = JSON.parse(decryptedState);
    } catch {
      throw new UnauthorizedError('Corrupt OAuth state payload');
    }

    if (
      metadata.provider !== 'google' ||
      (metadata.role !== Role.CLIENT && metadata.role !== Role.FREELANCER)
    ) {
      throw new UnauthorizedError('OAuth state provider or role mismatch');
    }

    if (!params.code || !params.code.trim()) {
      throw new BadRequestError('Google did not return an authorization code.');
    }

    const googleClientId = env.GOOGLE_CLIENT_ID?.trim();
    const googleClientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
    if (!googleClientId || !googleClientSecret) {
      throw new BadRequestError('Google OAuth is not configured on this server.', undefined, 'GOOGLE_OAUTH_NOT_CONFIGURED');
    }

    const redirectUri =
      metadata.redirectUri || this.resolveSocialCallbackUrl('google', params.callbackUrl);

    // Exchange code with Google
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: params.code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const detail = await this.extractOAuthErrorDetail(
        tokenRes,
        'Failed to exchange authorization code with Google'
      );
      throw new UnauthorizedError(`Google authentication failed: ${detail}`);
    }

    const tokenData = (await tokenRes.json()) as { access_token?: string };
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      throw new UnauthorizedError('Google did not return an OAuth access token');
    }

    // Fetch verified profile from Google UserInfo endpoint
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileRes.ok) {
      throw new UnauthorizedError('Failed to fetch verified user profile from Google');
    }

    const profile = (await profileRes.json()) as {
      email?: string;
      email_verified?: boolean | string;
      name?: string;
      picture?: string;
    };

    const isUnverifiedEmail =
      profile.email_verified !== undefined &&
      profile.email_verified !== true &&
      profile.email_verified !== 'true';

    if (!profile.email || isUnverifiedEmail) {
      throw new BadRequestError('Google did not return a verified email address');
    }

    return this.handleSocialUserResolution({
      provider: 'google',
      email: profile.email,
      name: profile.name || 'Google User',
      avatarUrl: profile.picture || null,
      selectedRole: metadata.role,
      intent: metadata.intent === 'signup' ? 'signup' : 'login',
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

    let metadata: {
      provider?: string;
      role?: Role;
      intent?: 'login' | 'signup';
      redirectUri?: string;
    };
    try {
      metadata = JSON.parse(decryptedState);
    } catch {
      throw new UnauthorizedError('Corrupt OAuth state payload');
    }

    if (
      metadata.provider !== 'facebook' ||
      (metadata.role !== Role.CLIENT && metadata.role !== Role.FREELANCER)
    ) {
      throw new UnauthorizedError('OAuth state provider or role mismatch');
    }

    if (!params.code || !params.code.trim()) {
      throw new BadRequestError('Facebook did not return an authorization code.');
    }

    const facebookAppId = env.FACEBOOK_APP_ID?.trim();
    const facebookAppSecret = env.FACEBOOK_APP_SECRET?.trim();
    if (!facebookAppId || !facebookAppSecret) {
      throw new BadRequestError('Facebook OAuth is not configured on this server.', undefined, 'FACEBOOK_OAUTH_NOT_CONFIGURED');
    }

    const redirectUri =
      metadata.redirectUri || this.resolveSocialCallbackUrl('facebook', params.callbackUrl);

    // Exchange code with Facebook Graph API
    const tokenQuery = new URLSearchParams({
      client_id: facebookAppId,
      client_secret: facebookAppSecret,
      redirect_uri: redirectUri,
      code: params.code,
    });

    const tokenRes = await fetch(
      `https://graph.facebook.com/${this.facebookGraphApiVersion}/oauth/access_token?${tokenQuery.toString()}`
    );
    if (!tokenRes.ok) {
      const detail = await this.extractOAuthErrorDetail(
        tokenRes,
        'Failed to exchange authorization code with Facebook'
      );
      throw new UnauthorizedError(`Facebook authentication failed: ${detail}`);
    }

    const tokenData = (await tokenRes.json()) as { access_token?: string };
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      throw new UnauthorizedError('Facebook did not return an OAuth access token');
    }

    // Fetch user profile from Facebook Graph API (preserving id, name, email, picture fields)
    const profileRes = await fetch(
      `https://graph.facebook.com/${this.facebookGraphApiVersion}/me?fields=id,name,email,picture.type(large)&access_token=${accessToken}`
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
      intent: metadata.intent === 'signup' ? 'signup' : 'login',
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
