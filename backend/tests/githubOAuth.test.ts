import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/database';
import { env } from '../src/config/env';
import { hashToken } from '../src/utils/crypto';

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
    },
    accountLinkingChallenge: {
      create: vi.fn(),
    },
  },
}));

describe('Phase 2: GitHub OAuth 2.0 & Account Linking Lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (env as any).GITHUB_CLIENT_ID = 'test-gh-client-id';
    (env as any).GITHUB_CLIENT_SECRET = 'test-gh-client-secret';
    (env as any).GITHUB_CALLBACK_URL = 'http://localhost:3000/api/auth/github/callback';
  });

  describe('GET /api/auth/github (Initiate OAuth)', () => {
    it('redirects to GitHub authorize URL with PKCE challenge and sets SameSite=Lax state cookie', async () => {
      (prisma.oAuthState.create as any).mockResolvedValue({ id: 'os-1' });

      const res = await request(app).get('/api/auth/github');

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('https://github.com/login/oauth/authorize');
      expect(res.headers.location).toContain('client_id=test-gh-client-id');
      expect(res.headers.location).toContain('code_challenge=');
      expect(res.headers.location).toContain('code_challenge_method=S256');

      // Verify cookie attributes: must be SameSite=Lax for GitHub redirect compatibility
      const setCookie = res.headers['set-cookie'];
      expect(setCookie).toBeDefined();
      const stateCookie = setCookie.find((c: string) => c.includes('devflow_oauth_state'));
      expect(stateCookie).toBeDefined();
      expect(stateCookie).toContain('SameSite=Lax');
      expect(stateCookie).toContain('HttpOnly');
    });
  });

  describe('GET /api/auth/github/callback (Process Callback)', () => {
    it('rejects callback with missing state or code with 400 Validation Error', async () => {
      const res = await request(app).get('/api/auth/github/callback');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects callback if state does not match cookie', async () => {
      const res = await request(app)
        .get('/api/auth/github/callback?code=valid-code&state=mismatched-state')
        .set('Cookie', ['devflow_oauth_state=original-state']);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('aborts callback when GitHub account lacks a verified primary email address', async () => {
      const rawState = 'valid-test-state';
      const stateHash = hashToken(rawState);

      (prisma.oAuthState.findUnique as any).mockResolvedValue({
        id: 'os-1',
        stateHash,
        pkceVerifier: null,
        usedAt: null,
        expiresAt: new Date(Date.now() + 100000),
      });
      (prisma.oAuthState.update as any).mockResolvedValue({ id: 'os-1' });

      // Mock GitHub API responses
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('access_token')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ access_token: 'gho_token_123' }),
          });
        }
        if (url.includes('/user/emails')) {
          // No verified emails!
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([
              { email: 'unverified@example.com', primary: true, verified: false },
            ]),
          });
        }
        if (url.includes('/user')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 12345, login: 'ghuser', name: 'GH User', avatar_url: null }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      }) as any;

      try {
        const res = await request(app)
          .get(`/api/auth/github/callback?code=gh-code&state=${rawState}`)
          .set('Cookie', [`devflow_oauth_state=${rawState}`]);

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('UNVERIFIED_GITHUB_EMAIL');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('requires secure account linking (never auto-linking) when verified email matches existing account', async () => {
      const rawState = 'valid-test-state-2';
      const stateHash = hashToken(rawState);

      (prisma.oAuthState.findUnique as any).mockResolvedValue({
        id: 'os-2',
        stateHash,
        pkceVerifier: null,
        usedAt: null,
        expiresAt: new Date(Date.now() + 100000),
      });
      (prisma.oAuthState.update as any).mockResolvedValue({ id: 'os-2' });

      // User not linked by githubId yet
      (prisma.user.findUnique as any).mockImplementation(({ where }: any) => {
        if (where.githubId) return Promise.resolve(null);
        if (where.email === 'alice@devflow.dev') {
          return Promise.resolve({
            id: 'usr-alice',
            email: 'alice@devflow.dev',
            passwordHash: 'hashed',
          });
        }
        return Promise.resolve(null);
      });

      (prisma.accountLinkingChallenge.create as any).mockResolvedValue({ id: 'alc-1' });

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('access_token')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ access_token: 'gho_token_456' }),
          });
        }
        if (url.includes('/user/emails')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([
              { email: 'alice@devflow.dev', primary: true, verified: true },
            ]),
          });
        }
        if (url.includes('/user')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 98765, login: 'alicegh', name: 'Alice', avatar_url: null }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      }) as any;

      try {
        const res = await request(app)
          .get(`/api/auth/github/callback?code=gh-code-2&state=${rawState}`)
          .set('Cookie', [`devflow_oauth_state=${rawState}`]);

        // Must redirect to link-account frontend modal
        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('/oauth/link-account?ticket=');

        // Must verify challenge was created with null encrypted token
        expect(prisma.accountLinkingChallenge.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              userId: 'usr-alice',
              githubId: '98765',
              encryptedGithubToken: null,
            }),
          })
        );

        // Must set linking challenge cookie with SameSite=Lax
        const setCookie = res.headers['set-cookie'];
        const challengeCookie = setCookie.find((c: string) => c.includes('devflow_linking_challenge'));
        expect(challengeCookie).toBeDefined();
        expect(challengeCookie).toContain('SameSite=Lax');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('provisions new FREELANCER user when neither githubId nor verified email exists', async () => {
      const rawState = 'valid-test-state-3';
      const stateHash = hashToken(rawState);

      (prisma.oAuthState.findUnique as any).mockResolvedValue({
        id: 'os-3',
        stateHash,
        pkceVerifier: null,
        usedAt: null,
        expiresAt: new Date(Date.now() + 100000),
      });
      (prisma.oAuthState.update as any).mockResolvedValue({ id: 'os-3' });

      // No matching user
      (prisma.user.findUnique as any).mockResolvedValue(null);
      (prisma.user.create as any).mockResolvedValue({
        id: 'usr-new-gh',
        email: 'brandnew@devflow.dev',
        name: 'New Dev',
        githubId: '55555',
      });
      (prisma.oAuthExchangeCode.create as any).mockResolvedValue({ id: 'oec-3' });

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('access_token')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ access_token: 'gho_token_789' }),
          });
        }
        if (url.includes('/user/emails')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([
              { email: 'brandnew@devflow.dev', primary: true, verified: true },
            ]),
          });
        }
        if (url.includes('/user')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 55555, login: 'newdev', name: 'New Dev', avatar_url: null }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      }) as any;

      try {
        const res = await request(app)
          .get(`/api/auth/github/callback?code=gh-code-3&state=${rawState}`)
          .set('Cookie', [`devflow_oauth_state=${rawState}`]);

        expect(res.status).toBe(302);
        expect(res.headers.location).toContain('/oauth/callback?code=');
        expect(prisma.user.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              email: 'brandnew@devflow.dev',
              githubId: '55555',
            }),
          })
        );
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});

