import crypto from 'crypto';
import { describe, it, expect, afterEach } from 'vitest';
import {
  CombinedEnvSchema,
  env,
  normalizePemPrivateKey,
  parseTrustProxySetting,
  resolveGitHubAppPrivateKey,
} from '../src/config/env';
import { createApp } from '../src/app';

const BASE_ENV = {
  NODE_ENV: 'development',
  PORT: 3001,
  DATABASE_URL: 'postgresql://devflow:devflow@localhost:5432/devflow?schema=public',
  JWT_SECRET: 'devflow_local_jwt_auth_signing_token_2026_d8f7a1e3b5c9',
  CLIENT_URL: 'http://localhost:3000',
};

function generateTestPemKey(): string {
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
    publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
  });
  return privateKey.trim();
}

describe('Stage 1: GitHub App & Reverse Proxy Environment Configuration', () => {
  const originalTrustProxy = env.TRUST_PROXY;

  afterEach(() => {
    (env as { TRUST_PROXY?: string }).TRUST_PROXY = originalTrustProxy;
  });

  it('starts cleanly when optional GitHub App variables are absent or empty strings', () => {
    const parsed = CombinedEnvSchema.safeParse({
      ...BASE_ENV,
      GITHUB_APP_ID: '',
      GITHUB_APP_SLUG: '',
      GITHUB_APP_PRIVATE_KEY: '   ',
      GITHUB_APP_PRIVATE_KEY_BASE64: '',
      GITHUB_APP_ALLOWED_ACCOUNT_ID: '',
      GITHUB_APP_WEBHOOK_SECRET: '',
      GITHUB_APP_WEBHOOK_URL: '',
      GITHUB_APP_SETUP_URL: '',
      TRUST_PROXY: '',
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.GITHUB_APP_ID).toBeUndefined();
      expect(parsed.data.GITHUB_APP_PRIVATE_KEY).toBeUndefined();
      expect(parsed.data.GITHUB_APP_ALLOWED_ACCOUNT_ID).toBeUndefined();
      expect(parsed.data.TRUST_PROXY).toBeUndefined();
      expect(resolveGitHubAppPrivateKey(parsed.data)).toBeUndefined();
    }
  });

  it('accepts valid GitHub App configuration and normalizes escaped PEM newlines', () => {
    const testPem = generateTestPemKey();
    const escapedPem = `"${testPem.replace(/\n/g, '\\n')}"`;

    const parsed = CombinedEnvSchema.safeParse({
      ...BASE_ENV,
      GITHUB_APP_ID: '5728161',
      GITHUB_APP_SLUG: 'devflowwebsite',
      GITHUB_APP_PRIVATE_KEY: escapedPem,
      GITHUB_APP_ALLOWED_ACCOUNT_ID: '12345678',
      GITHUB_APP_WEBHOOK_SECRET: 'whsec_test_app_secret',
      GITHUB_APP_WEBHOOK_URL: 'https://devflow-tunnel.example.com/api/github/webhooks',
      GITHUB_APP_SETUP_URL: 'http://localhost:3001/api/github/app/setup',
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.GITHUB_APP_ID).toBe('5728161');
      expect(parsed.data.GITHUB_APP_SLUG).toBe('devflowwebsite');
      expect(parsed.data.GITHUB_APP_ALLOWED_ACCOUNT_ID).toBe('12345678');
      expect(parsed.data.GITHUB_APP_PRIVATE_KEY).toBe(testPem);
      expect(resolveGitHubAppPrivateKey(parsed.data)).toBe(testPem);
    }
  });

  it('accepts valid base64-encoded GitHub App private key fallback', () => {
    const testPem = generateTestPemKey();
    const base64Pem = Buffer.from(testPem, 'utf8').toString('base64');

    const parsed = CombinedEnvSchema.safeParse({
      ...BASE_ENV,
      GITHUB_APP_ID: '5728161',
      GITHUB_APP_PRIVATE_KEY_BASE64: base64Pem,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(resolveGitHubAppPrivateKey(parsed.data)).toBe(normalizePemPrivateKey(testPem));
    }
  });

  it('rejects invalid GitHub App ID, account ID, PEM keys, and URLs', () => {
    const parsed = CombinedEnvSchema.safeParse({
      ...BASE_ENV,
      GITHUB_APP_ID: 'not-a-number',
      GITHUB_APP_SLUG: 'invalid slug!',
      GITHUB_APP_PRIVATE_KEY: 'not-a-pem-key',
      GITHUB_APP_PRIVATE_KEY_BASE64: 'bm90LWEtcGVt',
      GITHUB_APP_ALLOWED_ACCOUNT_ID: '0',
      GITHUB_APP_WEBHOOK_URL: 'ftp://invalid-protocol.example.com/hook',
      GITHUB_APP_SETUP_URL: 'not-a-url',
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const errorPaths = parsed.error.issues.map((issue) => issue.path[0]);
      expect(errorPaths).toContain('GITHUB_APP_ID');
      expect(errorPaths).toContain('GITHUB_APP_SLUG');
      expect(errorPaths).toContain('GITHUB_APP_PRIVATE_KEY');
      expect(errorPaths).toContain('GITHUB_APP_PRIVATE_KEY_BASE64');
      expect(errorPaths).toContain('GITHUB_APP_ALLOWED_ACCOUNT_ID');
      expect(errorPaths).toContain('GITHUB_APP_WEBHOOK_URL');
      expect(errorPaths).toContain('GITHUB_APP_SETUP_URL');
    }
  });

  it('preserves Google, Facebook, and existing GitHub OAuth configuration validation', () => {
    const parsed = CombinedEnvSchema.safeParse({
      ...BASE_ENV,
      ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      GITHUB_CLIENT_ID: 'oauth_gh_client_id',
      GITHUB_CLIENT_SECRET: 'oauth_gh_client_secret',
      GITHUB_CALLBACK_URL: 'http://localhost:3001/api/auth/github/callback',
      GITHUB_WEBHOOK_SECRET: 'oauth_whsec_test',
      GOOGLE_CLIENT_ID: 'google_client_id',
      GOOGLE_CLIENT_SECRET: 'google_client_secret',
      GOOGLE_CALLBACK_URL: 'http://localhost:3001/api/auth/oauth/google/callback',
      FACEBOOK_APP_ID: 'fb_app_id',
      FACEBOOK_APP_SECRET: 'fb_app_secret',
      FACEBOOK_CALLBACK_URL: 'http://localhost:3001/api/auth/oauth/facebook/callback',
      FACEBOOK_GRAPH_API_VERSION: '27.0',
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.GITHUB_CLIENT_ID).toBe('oauth_gh_client_id');
      expect(parsed.data.GOOGLE_CLIENT_ID).toBe('google_client_id');
      expect(parsed.data.FACEBOOK_APP_ID).toBe('fb_app_id');
      expect(parsed.data.FACEBOOK_GRAPH_API_VERSION).toBe('v27.0');
    }
  });

  it('rejects unbounded TRUST_PROXY=true and configures safe proxy trust only when specified', () => {
    const unsafe = CombinedEnvSchema.safeParse({
      ...BASE_ENV,
      TRUST_PROXY: 'true',
    });
    expect(unsafe.success).toBe(false);

    expect(parseTrustProxySetting(undefined)).toBe(false);
    expect(parseTrustProxySetting('false')).toBe(false);
    expect(parseTrustProxySetting('1')).toBe(1);
    expect(parseTrustProxySetting('loopback')).toBe('loopback');

    (env as { TRUST_PROXY?: string }).TRUST_PROXY = undefined;
    expect(createApp().get('trust proxy')).toBe(false);

    (env as { TRUST_PROXY?: string }).TRUST_PROXY = 'loopback';
    expect(createApp().get('trust proxy')).toBe('loopback');
  });
});

