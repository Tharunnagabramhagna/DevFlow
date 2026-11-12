import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/database';
import { env } from '../src/config/env';
import { encryptSecret, hashToken } from '../src/utils/crypto';

vi.mock('../src/config/database', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
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
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

describe('Google & Facebook Social OAuth 2.0 Integration Suite', () => {
  const originalEnv = { ...env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    (env as any).NODE_ENV = 'development';
    (env as any).PORT = 3001;
    (env as any).CLIENT_URL = 'http://localhost:3000';
    (env as any).GOOGLE_CLIENT_ID = 'test-google-client-id.apps.googleusercontent.com';
    (env as any).GOOGLE_CLIENT_SECRET = 'test-google-client-secret-super-hidden';
    (env as any).GOOGLE_CALLBACK_URL = 'http://localhost:3001/api/auth/oauth/google/callback';
    (env as any).FACEBOOK_APP_ID = '1234567890123456';
    (env as any).FACEBOOK_APP_SECRET = '0123456789abcdef0123456789abcdef';
    (env as any).FACEBOOK_CALLBACK_URL = 'http://localhost:3001/api/auth/oauth/facebook/callback';
    (env as any).FACEBOOK_GRAPH_API_VERSION = 'v27.0';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    Object.assign(env, originalEnv);
  });

  describe('Provider Readiness Endpoint', () => {
    it('GET /api/auth/oauth/providers reports status without exposing client secrets', async () => {
      const res = await request(app).get('/api/auth/oauth/providers');

      expect(res.status).toBe(200);
      expect(res.body.google.configured).toBe(true);
      expect(res.body.facebook.configured).toBe(true);
      const serialized = JSON.stringify(res.body);
      expect(serialized).not.toContain('test-google-client-secret-super-hidden');
      expect(serialized).not.toContain('0123456789abcdef0123456789abcdef');
    });

    it('returns *_OAUTH_NOT_CONFIGURED error code when credentials are empty', async () => {
      (env as any).GOOGLE_CLIENT_ID = '';
      (env as any).GOOGLE_CLIENT_SECRET = '';
      (env as any).FACEBOOK_APP_ID = '   ';
      (env as any).FACEBOOK_APP_SECRET = '';

      const gRes = await request(app)
        .post('/api/auth/oauth/google/initiate')
        .send({ role: 'CLIENT', intent: 'login' });
      expect(gRes.status).toBe(400);
      expect(gRes.body.error.code).toBe('GOOGLE_OAUTH_NOT_CONFIGURED');

      const fRes = await request(app)
        .post('/api/auth/oauth/facebook/initiate')
        .send({ role: 'DEVELOPER', intent: 'signup' });
      expect(fRes.status).toBe(400);
      expect(fRes.body.error.code).toBe('FACEBOOK_OAUTH_NOT_CONFIGURED');
    });
  });

  describe('OAuth Initiation & Role Preservation', () => {
    it('POST /api/auth/oauth/google/initiate builds Google auth URL, persists state, and sets SameSite=Lax cookie', async () => {
      (prisma.oAuthState.create as any).mockResolvedValue({ id: 'state-1' });

      const res = await request(app)
        .post('/api/auth/oauth/google/initiate')
        .send({ role: 'CLIENT', intent: 'login' });

      expect(res.status).toBe(200);
      expect(res.body.authUrl).toBeDefined();
      expect(res.body.rawState).toBeUndefined();

      const authUrl = new URL(res.body.authUrl);
      expect(authUrl.origin + authUrl.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
      expect(authUrl.searchParams.get('client_id')).toBe('test-google-client-id.apps.googleusercontent.com');
      expect(authUrl.searchParams.get('redirect_uri')).toBe('http://localhost:3001/api/auth/oauth/google/callback');
      expect(authUrl.searchParams.get('scope')).toBe('openid email profile');
      expect(authUrl.searchParams.get('response_type')).toBe('code');
      expect(authUrl.searchParams.get('state')).toMatch(/^[0-9a-f]{64}$/);
      expect(res.body.authUrl).not.toContain('test-google-client-secret-super-hidden');

      const cookies = res.headers['set-cookie'] as string[];
      const stateCookie = cookies.find((c) => c.startsWith('devflow_oauth_state='));
      expect(stateCookie).toBeDefined();
      expect(stateCookie).toContain('HttpOnly');
      expect(stateCookie).toContain('SameSite=Lax');

      expect(prisma.oAuthState.create).toHaveBeenCalledTimes(1);
    });

    it('POST /api/auth/oauth/facebook/initiate normalizes DEVELOPER alias to FREELANCER and sets cookie', async () => {
      (prisma.oAuthState.create as any).mockResolvedValue({ id: 'state-fb-1' });

      const res = await request(app)
        .post('/api/auth/oauth/facebook/initiate')
        .send({ role: 'DEVELOPER', intent: 'signup' });

      expect(res.status).toBe(200);
      const authUrl = new URL(res.body.authUrl);
      expect(authUrl.origin + authUrl.pathname).toBe('https://www.facebook.com/v27.0/dialog/oauth');
      expect(authUrl.searchParams.get('client_id')).toBe('1234567890123456');
      expect(authUrl.searchParams.get('redirect_uri')).toBe('http://localhost:3001/api/auth/oauth/facebook/callback');
      expect(authUrl.searchParams.get('scope')).toBe('email,public_profile');
      expect(res.body.authUrl).not.toContain('0123456789abcdef0123456789abcdef');
    });

    it('GET /api/auth/oauth/google supports direct browser redirect initiation', async () => {
      (prisma.oAuthState.create as any).mockResolvedValue({ id: 'state-get-1' });

      const res = await request(app).get('/api/auth/oauth/google?role=CLIENT&intent=signup');

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      const cookies = res.headers['set-cookie'] as string[];
      expect(cookies.some((c) => c.startsWith('devflow_oauth_state='))).toBe(true);
    });

    it('rejects ADMIN role and untrusted external callbackUrl on initiation', async () => {
      const adminRes = await request(app)
        .post('/api/auth/oauth/google/initiate')
        .send({ role: 'ADMIN', intent: 'login' });
      expect(adminRes.status).toBe(400);

      const evilCallbackRes = await request(app)
        .post('/api/auth/oauth/google/initiate')
        .send({ role: 'CLIENT', intent: 'login', callbackUrl: 'https://evil.example.com/steal' });
      expect(evilCallbackRes.status).toBe(400);
    });
  });

  describe('Google OAuth Callback & User Resolution', () => {
    it('creates a CLIENT account on valid Google callback and redirects to /#/oauth/callback?code=...', async () => {
      const rawState = '1'.repeat(64);
      const encryptedMetadata = encryptSecret(
        JSON.stringify({
          provider: 'google',
          role: 'CLIENT',
          intent: 'signup',
          redirectUri: 'http://localhost:3001/api/auth/oauth/google/callback',
          createdAt: Date.now(),
        })
      );

      (prisma.oAuthState.findUnique as any).mockResolvedValue({
        id: 'os-g1',
        stateHash: hashToken(rawState),
        pkceVerifier: encryptedMetadata,
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),
      });
      (prisma.oAuthState.update as any).mockResolvedValue({ id: 'os-g1' });
      (prisma.user.findUnique as any).mockResolvedValue(null);
      (prisma.user.create as any).mockResolvedValue({
        id: 'usr-g-client',
        email: 'client.oauth@gmail.com',
        name: 'Clara Client',
        role: 'CLIENT',
        avatarUrl: 'https://lh3.googleusercontent.com/avatar.png',
        bio: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (prisma.oAuthExchangeCode.create as any).mockResolvedValue({ id: 'oec-g1' });

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url === 'https://oauth2.googleapis.com/token') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ access_token: 'google-access-tok' }),
          });
        }
        if (url === 'https://www.googleapis.com/oauth2/v3/userinfo') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              sub: 'google-sub-1',
              email: 'Client.OAuth@gmail.com',
              email_verified: true,
              name: 'Clara Client',
              picture: 'https://lh3.googleusercontent.com/avatar.png',
            }),
          });
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      }) as any;

      const res = await request(app)
        .get(`/api/auth/oauth/google/callback?code=google-auth-code&state=${rawState}`)
        .set('Cookie', [`devflow_oauth_state=${rawState}`]);

      expect(res.status).toBe(302);
      expect(res.headers.location).toMatch(/^http:\/\/localhost:3000\/#\/oauth\/callback\?code=/);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'client.oauth@gmail.com',
            role: 'CLIENT',
          }),
        })
      );
    });

    it('rejects unverified Google emails and redirects back with error', async () => {
      const rawState = '2'.repeat(64);
      const encryptedMetadata = encryptSecret(
        JSON.stringify({ provider: 'google', role: 'CLIENT', intent: 'login' })
      );

      (prisma.oAuthState.findUnique as any).mockResolvedValue({
        id: 'os-g2',
        stateHash: hashToken(rawState),
        pkceVerifier: encryptedMetadata,
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),
      });
      (prisma.oAuthState.update as any).mockResolvedValue({ id: 'os-g2' });

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url === 'https://oauth2.googleapis.com/token') {
          return Promise.resolve({ ok: true, json: async () => ({ access_token: 'tok' }) });
        }
        if (url === 'https://www.googleapis.com/oauth2/v3/userinfo') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              email: 'unverified@customdomain.test',
              email_verified: false,
              name: 'Unverified User',
            }),
          });
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      }) as any;

      const res = await request(app)
        .get(`/api/auth/oauth/google/callback?code=code-1&state=${rawState}`)
        .set('Cookie', [`devflow_oauth_state=${rawState}`]);

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('http://localhost:3000/#/login/client?error=');
      expect(decodeURIComponent(res.headers.location)).toContain('verified email');
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('prevents cross-role login and redirects back with role mismatch error', async () => {
      const rawState = '3'.repeat(64);
      const encryptedMetadata = encryptSecret(
        JSON.stringify({ provider: 'google', role: 'FREELANCER', intent: 'login' })
      );

      (prisma.oAuthState.findUnique as any).mockResolvedValue({
        id: 'os-g3',
        stateHash: hashToken(rawState),
        pkceVerifier: encryptedMetadata,
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),
      });
      (prisma.oAuthState.update as any).mockResolvedValue({ id: 'os-g3' });
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'usr-existing-client',
        email: 'dual@company.com',
        role: 'CLIENT',
        name: 'Existing Client',
        avatarUrl: null,
        bio: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url === 'https://oauth2.googleapis.com/token') {
          return Promise.resolve({ ok: true, json: async () => ({ access_token: 'tok' }) });
        }
        if (url === 'https://www.googleapis.com/oauth2/v3/userinfo') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              email: 'dual@company.com',
              email_verified: true,
              name: 'Existing Client',
            }),
          });
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      }) as any;

      const res = await request(app)
        .get(`/api/auth/oauth/google/callback?code=code-2&state=${rawState}`)
        .set('Cookie', [`devflow_oauth_state=${rawState}`]);

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('http://localhost:3000/#/login/developer?error=');
      expect(decodeURIComponent(res.headers.location)).toContain('Role mismatch');
    });

    it('rejects mismatched state cookie and cross-provider state replay', async () => {
      const rawState = '4'.repeat(64);

      const mismatchRes = await request(app)
        .get(`/api/auth/oauth/google/callback?code=c&state=${rawState}`)
        .set('Cookie', ['devflow_oauth_state=different-state']);
      expect(mismatchRes.status).toBe(302);
      expect(decodeURIComponent(mismatchRes.headers.location)).toContain('state mismatch');

      // Facebook state submitted to Google callback endpoint
      const fbMetadata = encryptSecret(
        JSON.stringify({ provider: 'facebook', role: 'CLIENT', intent: 'login' })
      );
      (prisma.oAuthState.findUnique as any).mockResolvedValue({
        id: 'os-fb-replay',
        stateHash: hashToken(rawState),
        pkceVerifier: fbMetadata,
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),
      });
      (prisma.oAuthState.update as any).mockResolvedValue({ id: 'os-fb-replay' });

      const crossProviderRes = await request(app)
        .get(`/api/auth/oauth/google/callback?code=c&state=${rawState}`)
        .set('Cookie', [`devflow_oauth_state=${rawState}`]);
      expect(crossProviderRes.status).toBe(302);
      expect(decodeURIComponent(crossProviderRes.headers.location)).toContain('provider or role mismatch');
    });
  });

  describe('Facebook OAuth Callback & Session Exchange', () => {
    it('authenticates Developer via Facebook callback and exchanges one-time code for JWT + refresh cookie', async () => {
      const rawState = '5'.repeat(64);
      const encryptedMetadata = encryptSecret(
        JSON.stringify({
          provider: 'facebook',
          role: 'FREELANCER',
          intent: 'login',
          redirectUri: 'http://localhost:3001/api/auth/oauth/facebook/callback',
        })
      );

      (prisma.oAuthState.findUnique as any).mockResolvedValue({
        id: 'os-fb1',
        stateHash: hashToken(rawState),
        pkceVerifier: encryptedMetadata,
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),
      });
      (prisma.oAuthState.update as any).mockResolvedValue({ id: 'os-fb1' });
      (prisma.user.findUnique as any).mockResolvedValue(null);
      (prisma.user.create as any).mockResolvedValue({
        id: 'usr-fb-dev',
        email: 'dev.fb@example.com',
        name: 'Devon Meta',
        role: 'FREELANCER',
        avatarUrl: 'https://fbcdn.test/avatar.jpg',
        bio: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (prisma.oAuthExchangeCode.create as any).mockResolvedValue({ id: 'oec-fb1' });

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/oauth/access_token')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ access_token: 'fb-tok-123' }),
          });
        }
        if (url.includes('/me?fields=id,name,email,picture.type(large)')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              id: 'fb-1001',
              name: 'Devon Meta',
              email: 'dev.fb@example.com',
              picture: { data: { url: 'https://fbcdn.test/avatar.jpg' } },
            }),
          });
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      }) as any;

      const cbRes = await request(app)
        .get(`/api/auth/oauth/facebook/callback?code=fb-code-1&state=${rawState}`)
        .set('Cookie', [`devflow_oauth_state=${rawState}`]);

      expect(cbRes.status).toBe(302);
      expect(cbRes.headers.location).toMatch(/^http:\/\/localhost:3000\/#\/oauth\/callback\?code=/);

      const callbackUrl = new URL(cbRes.headers.location);
      const hashQuery = callbackUrl.hash.split('?')[1];
      const oneTimeCode = new URLSearchParams(hashQuery).get('code');
      expect(oneTimeCode).toBeTruthy();

      // Step 2: Exchange one-time code for JWT & refresh cookie
      (prisma.oAuthExchangeCode.findUnique as any).mockResolvedValue({
        id: 'oec-fb1',
        codeHash: hashToken(oneTimeCode!),
        userId: 'usr-fb-dev',
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),
        user: {
          id: 'usr-fb-dev',
          email: 'dev.fb@example.com',
          name: 'Devon Meta',
          role: 'FREELANCER',
          avatarUrl: 'https://fbcdn.test/avatar.jpg',
          bio: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      (prisma.oAuthExchangeCode.update as any).mockResolvedValue({ id: 'oec-fb1' });
      (prisma.refreshToken.create as any).mockResolvedValue({ id: 'rt-1' });

      const exchangeRes = await request(app)
        .post('/api/auth/oauth/exchange')
        .send({ code: oneTimeCode });

      expect(exchangeRes.status).toBe(200);
      expect(exchangeRes.body.accessToken).toBeDefined();
      expect(exchangeRes.body.user.email).toBe('dev.fb@example.com');
      expect(exchangeRes.body.user.role).toBe('FREELANCER');

      const setCookie = exchangeRes.headers['set-cookie'] as string[];
      const refreshCookie = setCookie?.find((c) => c.startsWith('devflow_refresh_token='));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toContain('HttpOnly');

      // Step 3: Replay of same exchange code is rejected
      (prisma.oAuthExchangeCode.findUnique as any).mockResolvedValue({
        id: 'oec-fb1',
        codeHash: hashToken(oneTimeCode!),
        userId: 'usr-fb-dev',
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 60000),
        user: { id: 'usr-fb-dev', email: 'dev.fb@example.com', role: 'FREELANCER' },
      });

      const replayRes = await request(app)
        .post('/api/auth/oauth/exchange')
        .send({ code: oneTimeCode });
      expect(replayRes.status).toBe(401);
    });

    it('redirects back to signup role page with clear error when Facebook does not provide email', async () => {
      const rawState = '6'.repeat(64);
      const encryptedMetadata = encryptSecret(
        JSON.stringify({ provider: 'facebook', role: 'CLIENT', intent: 'signup' })
      );

      (prisma.oAuthState.findUnique as any).mockResolvedValue({
        id: 'os-fb2',
        stateHash: hashToken(rawState),
        pkceVerifier: encryptedMetadata,
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),
      });
      (prisma.oAuthState.update as any).mockResolvedValue({ id: 'os-fb2' });

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/oauth/access_token')) {
          return Promise.resolve({ ok: true, json: async () => ({ access_token: 'fb-tok' }) });
        }
        if (url.includes('/me?fields=')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ id: 'fb-no-email', name: 'Phone Only User' }),
          });
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      }) as any;

      const res = await request(app)
        .get(`/api/auth/oauth/facebook/callback?code=fb-code-2&state=${rawState}`)
        .set('Cookie', [`devflow_oauth_state=${rawState}`]);

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('http://localhost:3000/#/signup/client?error=');
      expect(decodeURIComponent(res.headers.location)).toContain('Facebook did not return a verified email address');
    });

    it('preserves role and intent when user cancels consent on provider screen', async () => {
      const rawState = '7'.repeat(64);
      const encryptedMetadata = encryptSecret(
        JSON.stringify({ provider: 'google', role: 'FREELANCER', intent: 'signup' })
      );

      (prisma.oAuthState.findUnique as any).mockResolvedValue({
        id: 'os-cancel',
        stateHash: hashToken(rawState),
        pkceVerifier: encryptedMetadata,
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),
      });

      const res = await request(app).get(
        `/api/auth/oauth/google/callback?error=access_denied&state=${rawState}`
      );

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('http://localhost:3000/#/signup/developer?error=');
      expect(decodeURIComponent(res.headers.location)).toContain('cancelled');
    });
  });
});

