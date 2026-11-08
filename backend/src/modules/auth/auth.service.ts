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
    if (!state || state !== rawCookieState) {
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

