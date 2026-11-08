import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { app } from '../src/app';
import {
  hashToken,
  encryptSecret,
  decryptSecret,
  generateSecureToken,
  generateOtp,
} from '../src/utils/crypto';
import {
  RegisterSchema,
  LoginSchema,
  AccountLinkingOtpSchema,
} from '../src/modules/auth/auth.schema';
import { env } from '../src/config/env';

describe('Phase 2: Cryptographic Engine & Hash Utilities', () => {
  it('hashToken produces consistent SHA-256 hex digest', () => {
    const raw = 'my-test-refresh-token-value-12345';
    const hash1 = hashToken(raw);
    const hash2 = hashToken(raw);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(hash1)).toBe(true);
  });

  it('AES-256-GCM authenticated encryption and decryption round-trip', () => {
    const secret = 'gho_github_oauth_access_token_super_secret_payload_12345';
    const encrypted = encryptSecret(secret);

    expect(encrypted).toContain(':');
    const parts = encrypted.split(':');
    expect(parts).toHaveLength(3); // [iv, tag, ciphertext]

    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(secret);
  });

  it('AES-256-GCM fails decryption if ciphertext or auth tag is tampered', () => {
    const secret = 'sensitive_pkce_verifier_code';
    const encrypted = encryptSecret(secret);
    const [iv, tag, ciphertext] = encrypted.split(':');

    // Tamper with ciphertext by modifying last character
    const tamperedCipher = ciphertext.slice(0, -2) + (ciphertext.slice(-2) === 'aa' ? 'bb' : 'aa');
    const tampered = `${iv}:${tag}:${tamperedCipher}`;

    expect(() => decryptSecret(tampered)).toThrow();
  });

  it('generateOtp produces 6-digit numeric code and verifiable SHA-256 hash', () => {
    const { otp, otpHash } = generateOtp();

    expect(otp).toHaveLength(6);
    expect(/^\d{6}$/.test(otp)).toBe(true);
    expect(otpHash).toBe(hashToken(otp));
  });
});

describe('Phase 2: Zod Authentication Schemas', () => {
  it('validates compliant registration payload', () => {
    const valid = {
      email: 'Developer@Example.COM',
      password: 'StrongPassword123!',
      name: 'Alice Developer',
      role: 'FREELANCER',
    };

    const parsed = RegisterSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBe('developer@example.com'); // Lowercased
      expect(parsed.data.role).toBe('FREELANCER');
    }
  });

  it('rejects password shorter than 8 characters', () => {
    const invalid = {
      email: 'test@example.com',
      password: 'short',
      name: 'Bob',
      role: 'CLIENT',
    };

    const parsed = RegisterSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('rejects malformed email format', () => {
    const invalid = {
      email: 'not-an-email',
      password: 'StrongPassword123!',
      name: 'Charlie',
      role: 'CLIENT',
    };

    const parsed = RegisterSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('validates 6-digit OTP strictly', () => {
    expect(AccountLinkingOtpSchema.safeParse({ otp: '123456' }).success).toBe(true);
    expect(AccountLinkingOtpSchema.safeParse({ otp: '12345' }).success).toBe(false);
    expect(AccountLinkingOtpSchema.safeParse({ otp: '1234567' }).success).toBe(false);
    expect(AccountLinkingOtpSchema.safeParse({ otp: 'abcdef' }).success).toBe(false);
  });
});

describe('Phase 2: HTTP Route Scaffolding & Input Validation', () => {
  it('POST /api/auth/register rejects empty body with 400 Validation Error', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/auth/login rejects invalid email with 400 Validation Error', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'invalid-email',
      password: 'password123',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/auth/me rejects unauthenticated request with 401 Unauthorized', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/auth/me accepts valid Bearer token and returns user context', async () => {
    const token = jwt.sign(
      { sub: 'user-uuid-1', email: 'alice@example.com', role: 'FREELANCER' },
      env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toEqual({
      id: 'user-uuid-1',
      email: 'alice@example.com',
      role: 'FREELANCER',
    });
  });

  it('GET /api/auth/me rejects expired Bearer token with 401 TOKEN_EXPIRED', async () => {
    const expiredToken = jwt.sign(
      { sub: 'user-uuid-1', email: 'alice@example.com', role: 'FREELANCER' },
      env.JWT_SECRET,
      { expiresIn: '-1s' } // Expired in past
    );

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });
});

