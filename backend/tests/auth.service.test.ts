import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import { AuthService } from '../src/modules/auth/auth.service';
import { hashToken, encryptSecret } from '../src/utils/crypto';
import { UnauthorizedError, ConflictError, BadRequestError } from '../src/utils/errors';

describe('Phase 2: AuthService Unit & Domain Mechanics', () => {
  let authService: AuthService;
  let mockPrisma: any;
  let mockMailer: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      refreshToken: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      passwordResetToken: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      oAuthState: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      oAuthExchangeCode: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      accountLinkingChallenge: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => {
        return await cb(mockPrisma);
      }),
    };

    mockMailer = {
      sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
      sendAccountLinkingOtp: vi.fn().mockResolvedValue(undefined),
    };

    authService = new AuthService(mockPrisma, mockMailer);
  });

  describe('User Registration', () => {
    it('successfully registers a new user with hashed password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'usr-123',
        email: 'alice@example.com',
        passwordHash: 'hashed_pw',
        name: 'Alice',
        role: 'CLIENT',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });

      const result = await authService.register({
        email: 'alice@example.com',
        password: 'Password123!',
        name: 'Alice',
        role: 'CLIENT',
      });

      expect(result.user.email).toBe('alice@example.com');
      expect(result.accessToken).toBeDefined();
      expect(result.rawRefreshToken).toBeDefined();
      expect(mockPrisma.user.create).toHaveBeenCalledOnce();
    });

    it('throws ConflictError if email is already registered', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'usr-existing' });

      await expect(
        authService.register({
          email: 'existing@example.com',
          password: 'Password123!',
          name: 'Bob',
          role: 'FREELANCER',
        })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('User Login', () => {
    it('successfully logs in with valid credentials', async () => {
      const passwordHash = await bcrypt.hash('CorrectPassword123!', 4);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'usr-456',
        email: 'bob@example.com',
        passwordHash,
        name: 'Bob',
        role: 'FREELANCER',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-2' });

      const result = await authService.login({
        email: 'bob@example.com',
        password: 'CorrectPassword123!',
      });

      expect(result.user.id).toBe('usr-456');
      expect(result.accessToken).toBeDefined();
      expect(result.rawRefreshToken).toBeDefined();
    });

    it('rejects invalid password with UnauthorizedError', async () => {
      const passwordHash = await bcrypt.hash('CorrectPassword123!', 4);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'usr-456',
        email: 'bob@example.com',
        passwordHash,
        isActive: true,
      });

      await expect(
        authService.login({
          email: 'bob@example.com',
          password: 'WrongPassword!',
        })
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('Refresh Token Lifecycle & Concurrency', () => {
    it('rotates valid active token to a new successor within the same family atomically', async () => {
      const rawToken = 'valid-refresh-token';
      const tokenHash = hashToken(rawToken);

      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-old',
        familyId: 'fam-uuid-1',
        tokenHash,
        userId: 'usr-1',
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: null,
        user: {
          id: 'usr-1',
          email: 'usr@example.com',
          role: 'FREELANCER',
        },
      });

      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.refreshToken.create.mockResolvedValue({
        id: 'rt-new',
        familyId: 'fam-uuid-1',
      });

      const res = await authService.rotateRefreshToken(rawToken);

      expect(res.rawRefreshToken).toBeDefined();
      expect(res.accessToken).toBeDefined();
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'rt-old',
            revokedAt: null,
            expiresAt: expect.any(Object),
          },
          data: {
            revokedAt: expect.any(Date),
          },
        })
      );
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            familyId: 'fam-uuid-1',
          }),
        })
      );
      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rt-old' },
          data: { replacedByTokenId: 'rt-new' },
        })
      );
    });

    it('REGRESSION: replaying a revoked token commits revocation of every token in its family before rejecting', async () => {
      const rawToken = 'already-revoked-token';
      const tokenHash = hashToken(rawToken);
      const familyId = 'fam-compromised-uuid';

      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-revoked',
        familyId,
        tokenHash,
        userId: 'usr-1',
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: new Date(Date.now() - 5000), // Already revoked 5s ago
        user: { id: 'usr-1', email: 'usr@example.com', role: 'FREELANCER' },
      });

      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 3 }); // 3 tokens in family revoked

      let errorThrown: any;
      try {
        await authService.rotateRefreshToken(rawToken);
      } catch (err) {
        errorThrown = err;
      }

      // 1. Verify that error was thrown with correct code
      expect(errorThrown).toBeDefined();
      expect(errorThrown).toBeInstanceOf(UnauthorizedError);
      expect(errorThrown.code).toBe('TOKEN_REUSE_DETECTED');

      // 2. CRITICAL REGRESSION ASSERTION: Verify that updateMany was executed to revoke the ENTIRE family
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { familyId },
          data: { revokedAt: expect.any(Date) },
        })
      );
    });

    it('REGRESSION: concurrent race condition on rotation commits family revocation and throws TOKEN_REUSE_DETECTED', async () => {
      const rawToken = 'racing-token';
      const tokenHash = hashToken(rawToken);
      const familyId = 'fam-race-uuid';

      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-racing',
        familyId,
        tokenHash,
        userId: 'usr-1',
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: null, // Appeared active initially
        user: { id: 'usr-1', email: 'usr@example.com', role: 'FREELANCER' },
      });

      // Another request won the atomic race -> updateMany count is 0
      mockPrisma.refreshToken.updateMany.mockResolvedValueOnce({ count: 0 });

      let errorThrown: any;
      try {
        await authService.rotateRefreshToken(rawToken);
      } catch (err) {
        errorThrown = err;
      }

      expect(errorThrown).toBeDefined();
      expect(errorThrown).toBeInstanceOf(UnauthorizedError);
      expect(errorThrown.code).toBe('TOKEN_REUSE_DETECTED');

      // Must have called updateMany to revoke the entire family
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { familyId },
          data: { revokedAt: expect.any(Date) },
        })
      );
    });
  });

  describe('Password Reset Lifecycle', () => {
    it('returns success: true without error when requesting reset for non-existent email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const res = await authService.requestPasswordReset('nonexistent@example.com');
      expect(res.success).toBe(true);
      expect(res.resetToken).toBeUndefined();
      expect(mockMailer.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('dispatches password reset email and creates reset token for existing user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'usr-reset',
        email: 'user@example.com',
      });
      mockPrisma.passwordResetToken.create.mockResolvedValue({ id: 'prt-1' });

      const res = await authService.requestPasswordReset('user@example.com');
      expect(res.success).toBe(true);
      expect(mockMailer.sendPasswordResetEmail).toHaveBeenCalledWith(
        'user@example.com',
        expect.any(String)
      );
    });

    it('resets password, marks token used, and revokes all active refresh tokens for the user', async () => {
      const rawResetToken = 'raw-reset-token-value';
      const tokenHash = hashToken(rawResetToken);

      mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'prt-1',
        tokenHash,
        userId: 'usr-reset',
        usedAt: null,
        expiresAt: new Date(Date.now() + 100000),
      });

      await authService.resetPassword(rawResetToken, 'NewSecurePassword123!');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'usr-reset' },
        })
      );
      expect(mockPrisma.passwordResetToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prt-1' },
          data: expect.objectContaining({ usedAt: expect.any(Date) }),
        })
      );
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'usr-reset', revokedAt: null },
        })
      );
    });
  });

  describe('Account Linking Challenge & Token Omission', () => {
    it('creates account linking challenge with null encrypted token (never storing unneeded access tokens)', async () => {
      mockPrisma.accountLinkingChallenge.create.mockResolvedValue({ id: 'alc-1' });

      const ticket = await authService.createAccountLinkingChallenge('usr-1', 'gh-999');

      expect(ticket).toBeDefined();
      expect(mockPrisma.accountLinkingChallenge.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'usr-1',
            githubId: 'gh-999',
            encryptedGithubToken: null, // Must be null or omitted!
          }),
        })
      );
    });

    it('enforces 60-second cooldown on sending linking OTP', async () => {
      mockPrisma.accountLinkingChallenge.findUnique.mockResolvedValue({
        id: 'alc-1',
        otpSentAt: new Date(Date.now() - 20000), // 20s ago (cooldown is 60s)
        resendCooldownSeconds: 60,
        usedAt: null,
        expiresAt: new Date(Date.now() + 100000),
        user: { email: 'usr@example.com' },
      });

      const res = await authService.sendAccountLinkingOtp('alc-1');
      expect(res.success).toBe(false);
      expect(res.cooldownSeconds).toBeGreaterThan(0);
      expect(res.cooldownSeconds).toBeLessThanOrEqual(40);
    });

    it('locks challenge when OTP verification attempts exceed maxOtpAttempts', async () => {
      mockPrisma.accountLinkingChallenge.findUnique.mockResolvedValue({
        id: 'alc-1',
        otpAttempts: 5,
        maxOtpAttempts: 5,
        usedAt: null,
        expiresAt: new Date(Date.now() + 100000),
      });

      await expect(
        authService.verifyAccountLinkingOtp('alc-1', '123456')
      ).rejects.toThrow(/Maximum OTP attempts exceeded/);
    });
  });

  describe('OAuth PKCE State & Exchange Lifecycle', () => {
    it('creates OAuth state with encrypted PKCE verifier', async () => {
      mockPrisma.oAuthState.create.mockResolvedValue({ id: 'os-1' });

      const res = await authService.createOAuthState('my-pkce-verifier');

      expect(res.rawState).toBeDefined();
      expect(mockPrisma.oAuthState.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stateHash: expect.any(String),
            pkceVerifier: expect.any(String),
          }),
        })
      );
    });

    it('verifies and decrypts OAuth state successfully', async () => {
      const rawState = 'raw-oauth-state-token';
      const stateHash = hashToken(rawState);
      const rawVerifier = 'my-pkce-code-verifier-string';
      const encryptedVerifier = encryptSecret(rawVerifier);

      mockPrisma.oAuthState.findUnique.mockResolvedValue({
        id: 'os-1',
        stateHash,
        pkceVerifier: encryptedVerifier,
        usedAt: null,
        expiresAt: new Date(Date.now() + 100000),
      });

      const verifier = await authService.validateOAuthState(rawState, rawState);

      expect(verifier).toBe(rawVerifier);
      expect(mockPrisma.oAuthState.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'os-1' },
          data: expect.objectContaining({ usedAt: expect.any(Date) }),
        })
      );
    });

    it('creates and consumes OAuth single-use exchange code', async () => {
      mockPrisma.oAuthExchangeCode.create.mockResolvedValue({ id: 'oec-1' });

      const exchangeCode = await authService.createOAuthExchangeCode('usr-100');
      expect(exchangeCode).toBeDefined();
      expect(typeof exchangeCode).toBe('string');

      const codeHash = hashToken(exchangeCode);
      mockPrisma.oAuthExchangeCode.findUnique.mockResolvedValue({
        id: 'oec-1',
        codeHash,
        userId: 'usr-100',
        usedAt: null,
        expiresAt: new Date(Date.now() + 100000),
        user: {
          id: 'usr-100',
          email: 'oauth@example.com',
          role: 'CLIENT',
          name: 'OAuth User',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-oauth' });

      const session = await authService.exchangeOAuthCode(exchangeCode);

      expect(session.user.id).toBe('usr-100');
      expect(session.accessToken).toBeDefined();
      expect(session.rawRefreshToken).toBeDefined();
      expect(mockPrisma.oAuthExchangeCode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'oec-1' },
          data: expect.objectContaining({ usedAt: expect.any(Date) }),
        })
      );
    });
  });
});
