import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
  ActivityAction,
  GitHubInstallationStatus,
  ProjectMemberRole,
  Role,
} from '@prisma/client';
import { app } from '../src/app';
import { prisma } from '../src/config/database';
import { env } from '../src/config/env';
import { hashToken } from '../src/utils/crypto';
import { githubAppService } from '../src/modules/github/github-app.service';

vi.mock('../src/config/database', () => {
  const mockPrisma: any = {
    user: {
      findUnique: vi.fn(),
    },
    oAuthState: {
      create: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    gitHubAppInstallation: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
    gitHubAuthorizedRepo: {
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
      upsert: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<unknown>) =>
    callback(mockPrisma)
  );
  return { prisma: mockPrisma };
});

function signTestJwt(userId: string, email: string, role: Role | 'GUEST', isGuest = false): string {
  return jwt.sign({ sub: userId, email, role, isGuest }, env.JWT_SECRET, { expiresIn: '1h' });
}

function mockJsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

describe('Stage 4: GitHub App Installation, Setup Callback & Project Binding', () => {
  const devToken = signTestJwt('user-dev-1', 'dev1@devflow.test', Role.DEVELOPER);
  const otherDevToken = signTestJwt('user-dev-2', 'dev2@devflow.test', Role.DEVELOPER);
  const clientToken = signTestJwt('user-client-1', 'client@devflow.test', Role.CLIENT);
  const guestToken = signTestJwt('guest-1', 'guest@devflow.test', 'GUEST', true);

  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  let originalFetch: typeof global.fetch;
  let envSnapshot: Record<string, string | undefined>;

  beforeEach(() => {
    vi.clearAllMocks();
    githubAppService.clearTokenCache();
    (prisma.$transaction as any).mockImplementation(async (callback: (tx: any) => Promise<unknown>) =>
      callback(prisma)
    );

    originalFetch = global.fetch;
    envSnapshot = {
      GITHUB_APP_ID: env.GITHUB_APP_ID,
      GITHUB_APP_SLUG: env.GITHUB_APP_SLUG,
      GITHUB_APP_PRIVATE_KEY: env.GITHUB_APP_PRIVATE_KEY,
      GITHUB_APP_PRIVATE_KEY_BASE64: env.GITHUB_APP_PRIVATE_KEY_BASE64,
      GITHUB_APP_ALLOWED_ACCOUNT_ID: env.GITHUB_APP_ALLOWED_ACCOUNT_ID,
    };

    (env as any).GITHUB_APP_ID = '5728161';
    (env as any).GITHUB_APP_SLUG = 'devflowwebsite';
    (env as any).GITHUB_APP_PRIVATE_KEY = privateKey;
    (env as any).GITHUB_APP_PRIVATE_KEY_BASE64 = undefined;
    (env as any).GITHUB_APP_ALLOWED_ACCOUNT_ID = '777001';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    Object.entries(envSnapshot).forEach(([key, value]) => {
      (env as any)[key] = value;
    });
    githubAppService.clearTokenCache();
  });

  describe('POST /api/github/app/install', () => {
    it('enforces authentication, blocks guests and clients, and sets dedicated installation state cookie', async () => {
      const unauthRes = await request(app).post('/api/github/app/install');
      expect(unauthRes.status).toBe(401);

      const guestRes = await request(app)
        .post('/api/github/app/install')
        .set('Authorization', `Bearer ${guestToken}`);
      expect(guestRes.status).toBe(403);

      const clientRes = await request(app)
        .post('/api/github/app/install')
        .set('Authorization', `Bearer ${clientToken}`);
      expect(clientRes.status).toBe(403);

      (prisma.oAuthState.create as any).mockResolvedValue({ id: 'state-rec-1' });

      const res = await request(app)
        .post('/api/github/app/install')
        .set('Authorization', `Bearer ${devToken}`)
        .send({ returnPath: '/projects/proj-1' });

      expect(res.status).toBe(200);
      expect(res.body.installUrl).toMatch(
        /^https:\/\/github\.com\/apps\/devflowwebsite\/installations\/new\?state=[0-9a-f]{64}$/
      );

      const setCookies = res.headers['set-cookie'] as string[];
      const appCookie = setCookies.find((c) => c.startsWith('devflow_github_app_state='));
      const oauthCookie = setCookies.find((c) => c.startsWith('devflow_oauth_state='));
      expect(appCookie).toBeDefined();
      expect(appCookie).toContain('HttpOnly');
      expect(appCookie).toContain('SameSite=Lax');
      expect(oauthCookie).toBeUndefined();

      expect(prisma.oAuthState.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            initiatingUserId: 'user-dev-1',
            purpose: 'INSTALL_GITHUB_APP',
            returnPath: '/projects/proj-1',
          }),
        })
      );
    });

    it('fails closed with 503 when GitHub App configuration is incomplete', async () => {
      (env as any).GITHUB_APP_ALLOWED_ACCOUNT_ID = undefined;
      const res = await request(app)
        .post('/api/github/app/install')
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe('GITHUB_APP_NOT_CONFIGURED');
    });
  });

  describe('GET /api/github/app/setup', () => {
    const rawState = 'a'.repeat(64);
    const stateHash = hashToken(rawState);

    function mockValidStateConsumption() {
      (prisma.oAuthState.findUnique as any).mockResolvedValue({
        id: 'os-app-1',
        stateHash,
        initiatingUserId: 'user-dev-1',
        purpose: 'INSTALL_GITHUB_APP',
        returnPath: '/dashboard',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        usedAt: null,
      });
      (prisma.oAuthState.updateMany as any).mockResolvedValue({ count: 1 });
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'user-dev-1', role: Role.DEVELOPER });
    }

    it('rejects missing cookie, mismatched state, invalid, expired, and reused state', async () => {
      const missingCookieRes = await request(app).get(
        `/api/github/app/setup?installation_id=9901&setup_action=install&state=${rawState}`
      );
      expect(missingCookieRes.status).toBe(401);
      expect(missingCookieRes.body.error.code).toBe('GITHUB_APP_STATE_MISMATCH');

      const mismatchRes = await request(app)
        .get(`/api/github/app/setup?installation_id=9901&setup_action=install&state=${rawState}`)
        .set('Cookie', [`devflow_github_app_state=${'b'.repeat(64)}`]);
      expect(mismatchRes.status).toBe(401);
      expect(mismatchRes.body.error.code).toBe('GITHUB_APP_STATE_MISMATCH');

      (prisma.oAuthState.findUnique as any).mockResolvedValueOnce(null);
      const invalidRes = await request(app)
        .get(`/api/github/app/setup?installation_id=9901&setup_action=install&state=${rawState}`)
        .set('Cookie', [`devflow_github_app_state=${rawState}`]);
      expect(invalidRes.status).toBe(401);
      expect(invalidRes.body.error.code).toBe('GITHUB_APP_STATE_INVALID');

      (prisma.oAuthState.findUnique as any).mockResolvedValueOnce({
        id: 'os-exp',
        stateHash,
        initiatingUserId: 'user-dev-1',
        purpose: 'INSTALL_GITHUB_APP',
        expiresAt: new Date(Date.now() - 10_000),
        usedAt: null,
      });
      const expiredRes = await request(app)
        .get(`/api/github/app/setup?installation_id=9901&setup_action=install&state=${rawState}`)
        .set('Cookie', [`devflow_github_app_state=${rawState}`]);
      expect(expiredRes.status).toBe(401);
      expect(expiredRes.body.error.code).toBe('GITHUB_APP_STATE_EXPIRED');

      (prisma.oAuthState.findUnique as any).mockResolvedValueOnce({
        id: 'os-used',
        stateHash,
        initiatingUserId: 'user-dev-1',
        purpose: 'INSTALL_GITHUB_APP',
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: new Date(),
      });
      const reusedRes = await request(app)
        .get(`/api/github/app/setup?installation_id=9901&setup_action=install&state=${rawState}`)
        .set('Cookie', [`devflow_github_app_state=${rawState}`]);
      expect(reusedRes.status).toBe(401);
      expect(reusedRes.body.error.code).toBe('GITHUB_APP_STATE_REUSED');

      // Concurrent replay race: updateMany returns count 0
      (prisma.oAuthState.findUnique as any).mockResolvedValueOnce({
        id: 'os-race',
        stateHash,
        initiatingUserId: 'user-dev-1',
        purpose: 'INSTALL_GITHUB_APP',
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
      });
      (prisma.oAuthState.updateMany as any).mockResolvedValueOnce({ count: 0 });
      const raceRes = await request(app)
        .get(`/api/github/app/setup?installation_id=9901&setup_action=install&state=${rawState}`)
        .set('Cookie', [`devflow_github_app_state=${rawState}`]);
      expect(raceRes.status).toBe(401);
      expect(raceRes.body.error.code).toBe('GITHUB_APP_STATE_REUSED');
    });

    it('rejects wrong App ID from GitHub metadata', async () => {
      mockValidStateConsumption();
      global.fetch = vi.fn().mockResolvedValueOnce(
        mockJsonResponse(200, {
          id: 9901,
          app_id: 9999999,
          app_slug: 'rogue-app',
          target_type: 'User',
          account: { id: 777001, login: 'tharun-dev', type: 'User' },
          repository_selection: 'selected',
          permissions: { contents: 'read' },
          suspended_at: null,
        })
      ) as any;

      const res = await request(app)
        .get(`/api/github/app/setup?installation_id=9901&setup_action=install&state=${rawState}`)
        .set('Cookie', [`devflow_github_app_state=${rawState}`]);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('GITHUB_APP_ID_MISMATCH');
      expect(prisma.gitHubAppInstallation.upsert).not.toHaveBeenCalled();
    });

    it('rejects installation account mismatch against GITHUB_APP_ALLOWED_ACCOUNT_ID', async () => {
      mockValidStateConsumption();
      global.fetch = vi.fn().mockResolvedValueOnce(
        mockJsonResponse(200, {
          id: 9901,
          app_id: 5728161,
          app_slug: 'devflowwebsite',
          target_type: 'User',
          account: { id: 888999, login: 'other-account', type: 'User' },
          repository_selection: 'selected',
          permissions: { contents: 'read' },
          suspended_at: null,
        })
      ) as any;

      const res = await request(app)
        .get(`/api/github/app/setup?installation_id=9901&setup_action=install&state=${rawState}`)
        .set('Cookie', [`devflow_github_app_state=${rawState}`]);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('GITHUB_APP_ACCOUNT_NOT_ALLOWED');
      expect(prisma.gitHubAppInstallation.upsert).not.toHaveBeenCalled();
    });

    it('rejects unsupported setup_action, non-User account type, and suspended installations', async () => {
      mockValidStateConsumption();
      const badActionRes = await request(app)
        .get(`/api/github/app/setup?installation_id=9901&setup_action=request&state=${rawState}`)
        .set('Cookie', [`devflow_github_app_state=${rawState}`]);
      expect(badActionRes.status).toBe(400);
      expect(badActionRes.body.error.code).toBe('GITHUB_APP_INSTALL_PENDING_APPROVAL');

      mockValidStateConsumption();
      global.fetch = vi.fn().mockResolvedValueOnce(
        mockJsonResponse(200, {
          id: 9901,
          app_id: 5728161,
          app_slug: 'devflowwebsite',
          target_type: 'Organization',
          account: { id: 777001, login: 'tharun-org', type: 'Organization' },
          repository_selection: 'selected',
          permissions: { contents: 'read' },
          suspended_at: null,
        })
      ) as any;
      const orgRes = await request(app)
        .get(`/api/github/app/setup?installation_id=9901&setup_action=install&state=${rawState}`)
        .set('Cookie', [`devflow_github_app_state=${rawState}`]);
      expect(orgRes.status).toBe(403);
      expect(orgRes.body.error.code).toBe('GITHUB_APP_UNSUPPORTED_ACCOUNT_TYPE');

      mockValidStateConsumption();
      global.fetch = vi.fn().mockResolvedValueOnce(
        mockJsonResponse(200, {
          id: 9901,
          app_id: 5728161,
          app_slug: 'devflowwebsite',
          target_type: 'User',
          account: { id: 777001, login: 'tharun-dev', type: 'User' },
          repository_selection: 'selected',
          permissions: { contents: 'read' },
          suspended_at: '2026-11-12T10:00:00Z',
        })
      ) as any;
      const suspendedRes = await request(app)
        .get(`/api/github/app/setup?installation_id=9901&setup_action=install&state=${rawState}`)
        .set('Cookie', [`devflow_github_app_state=${rawState}`]);
      expect(suspendedRes.status).toBe(403);
      expect(suspendedRes.body.error.code).toBe('GITHUB_APP_SUSPENDED');
    });

    it('prevents cross-user ownership conflicts when installation is already linked to another user', async () => {
      mockValidStateConsumption();
      global.fetch = vi.fn().mockResolvedValueOnce(
        mockJsonResponse(200, {
          id: 9901,
          app_id: 5728161,
          app_slug: 'devflowwebsite',
          target_type: 'User',
          account: { id: 777001, login: 'tharun-dev', type: 'User' },
          repository_selection: 'selected',
          permissions: { contents: 'read' },
          suspended_at: null,
        })
      ) as any;

      (prisma.gitHubAppInstallation.findUnique as any).mockResolvedValue({
        id: 'inst-rec-other',
        installationId: 9901,
        userId: 'user-dev-2',
        status: GitHubInstallationStatus.ACTIVE,
      });

      const res = await request(app)
        .get(`/api/github/app/setup?installation_id=9901&setup_action=install&state=${rawState}`)
        .set('Cookie', [`devflow_github_app_state=${rawState}`]);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('GITHUB_APP_INSTALLATION_CONFLICT');
      expect(prisma.gitHubAppInstallation.upsert).not.toHaveBeenCalled();
    });

    it('verifies installation, reconciles authorized repos atomically, and never persists tokens', async () => {
      mockValidStateConsumption();
      const validExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url === 'https://api.github.com/app/installations/9901') {
          return mockJsonResponse(200, {
            id: 9901,
            app_id: 5728161,
            app_slug: 'devflowwebsite',
            target_type: 'User',
            account: { id: 777001, login: 'tharun-dev', type: 'User' },
            repository_selection: 'selected',
            permissions: { contents: 'read', pull_requests: 'read', issues: 'read' },
            suspended_at: null,
          });
        }
        if (url === 'https://api.github.com/app/installations/9901/access_tokens') {
          return mockJsonResponse(201, { token: 'ghs_ephemeral_setup_token', expires_at: validExpiry });
        }
        if (url.startsWith('https://api.github.com/installation/repositories')) {
          return mockJsonResponse(200, {
            total_count: 1,
            repositories: [
              {
                id: 501,
                name: 'devflow-app',
                full_name: 'tharun-dev/devflow-app',
                private: true,
                default_branch: 'main',
                html_url: 'https://github.com/tharun-dev/devflow-app',
                description: 'Main app',
                language: 'TypeScript',
                updated_at: '2026-11-12T12:00:00Z',
                pushed_at: '2026-11-12T12:00:00Z',
                owner: { login: 'tharun-dev' },
              },
            ],
          });
        }
        throw new Error(`Unexpected fetch URL: ${url}`);
      }) as any;

      (prisma.gitHubAppInstallation.findUnique as any).mockResolvedValue(null);
      (prisma.gitHubAppInstallation.upsert as any).mockResolvedValue({
        id: 'inst-rec-1',
        installationId: 9901,
        userId: 'user-dev-1',
        accountId: 777001,
        accountLogin: 'tharun-dev',
        accountType: 'User',
        repositorySelection: 'selected',
        status: GitHubInstallationStatus.ACTIVE,
      });

      const res = await request(app)
        .get(`/api/github/app/setup?installation_id=9901&setup_action=install&state=${rawState}`)
        .set('Accept', 'application/json')
        .set('Cookie', [`devflow_github_app_state=${rawState}`]);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        connected: true,
        reconciledRepoCount: 1,
        installation: {
          id: 'inst-rec-1',
          installationId: 9901,
          accountLogin: 'tharun-dev',
          status: 'ACTIVE',
        },
      });
      expect(JSON.stringify(res.body)).not.toContain('ghs_ephemeral_setup_token');

      expect(prisma.gitHubAuthorizedRepo.deleteMany).toHaveBeenCalledWith({
        where: {
          installationRecordId: 'inst-rec-1',
          githubRepoId: { notIn: [501] },
        },
      });
      expect(prisma.gitHubAuthorizedRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            installationRecordId: 'inst-rec-1',
            githubRepoId: 501,
            fullName: 'tharun-dev/devflow-app',
            defaultBranch: 'main',
            isPrivate: true,
          }),
        })
      );
      const serializedUpsert = JSON.stringify((prisma.gitHubAppInstallation.upsert as any).mock.calls);
      expect(serializedUpsert).not.toContain('ghs_ephemeral_setup_token');
    });
  });

  describe('GET /api/github/app/repositories (Cross-user Isolation & Installation Token)', () => {
    it('isolates repository listing to the authenticated user active installation without OAuth fallback', async () => {
      (prisma.gitHubAppInstallation.findFirst as any).mockResolvedValue(null);

      const noInstallRes = await request(app)
        .get('/api/github/app/repositories')
        .set('Authorization', `Bearer ${otherDevToken}`);

      expect(noInstallRes.status).toBe(400);
      expect(noInstallRes.body.error.code).toBe('GITHUB_APP_NOT_INSTALLED');
      expect(prisma.gitHubAppInstallation.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-dev-2', status: GitHubInstallationStatus.ACTIVE },
        })
      );

      (prisma.gitHubAppInstallation.findFirst as any).mockResolvedValueOnce({
        id: 'inst-rec-1',
        installationId: 9901,
        userId: 'user-dev-1',
        accountId: 777001,
        accountLogin: 'tharun-dev',
        accountType: 'User',
        repositorySelection: 'selected',
        status: GitHubInstallationStatus.ACTIVE,
      });

      const validExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        if (url === 'https://api.github.com/app/installations/9901/access_tokens') {
          return mockJsonResponse(201, { token: 'ghs_list_only_token', expires_at: validExpiry });
        }
        if (url.startsWith('https://api.github.com/installation/repositories')) {
          expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer ghs_list_only_token');
          return mockJsonResponse(200, {
            total_count: 1,
            repositories: [
              {
                id: 501,
                name: 'devflow-app',
                full_name: 'tharun-dev/devflow-app',
                private: true,
                default_branch: 'main',
                html_url: 'https://github.com/tharun-dev/devflow-app',
                description: 'Main app',
                language: 'TypeScript',
                updated_at: '2026-11-12T12:00:00Z',
                pushed_at: '2026-11-12T12:00:00Z',
                owner: { login: 'tharun-dev' },
              },
            ],
          });
        }
        throw new Error(`Unexpected fetch URL: ${url}`);
      }) as any;

      const listRes = await request(app)
        .get('/api/github/app/repositories')
        .set('Authorization', `Bearer ${devToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.repositories).toHaveLength(1);
      expect(listRes.body.repositories[0].fullName).toBe('tharun-dev/devflow-app');
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/github/app/projects/:projectId/connect', () => {
    it('denies unauthorized project access with 403', async () => {
      (prisma.project.findUnique as any).mockResolvedValue({
        id: 'proj-1',
        isArchived: false,
        createdById: 'user-dev-1',
        clientId: 'user-client-1',
        leadDeveloperId: 'user-dev-1',
        members: [],
      });

      const res = await request(app)
        .post('/api/github/app/projects/proj-1/connect')
        .set('Authorization', `Bearer ${otherDevToken}`)
        .send({ githubRepoId: 501 });

      expect(res.status).toBe(403);
      expect(prisma.project.update).not.toHaveBeenCalled();
    });

    it('rejects repository selection outside the user active installation', async () => {
      (prisma.project.findUnique as any).mockResolvedValue({
        id: 'proj-1',
        isArchived: false,
        createdById: 'user-dev-1',
        clientId: 'user-client-1',
        leadDeveloperId: 'user-dev-1',
        members: [{ userId: 'user-dev-1', role: ProjectMemberRole.LEAD_DEVELOPER }],
      });
      (prisma.gitHubAppInstallation.findFirst as any).mockResolvedValue({
        id: 'inst-rec-1',
        installationId: 9901,
        userId: 'user-dev-1',
        accountId: 777001,
        accountLogin: 'tharun-dev',
        accountType: 'User',
        repositorySelection: 'selected',
        status: GitHubInstallationStatus.ACTIVE,
      });
      (prisma.gitHubAuthorizedRepo.findFirst as any).mockResolvedValue(null);

      const validExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url === 'https://api.github.com/app/installations/9901/access_tokens') {
          return mockJsonResponse(201, { token: 'ghs_reconcile_token', expires_at: validExpiry });
        }
        if (url.startsWith('https://api.github.com/installation/repositories')) {
          return mockJsonResponse(200, {
            total_count: 1,
            repositories: [
              {
                id: 501,
                name: 'devflow-app',
                full_name: 'tharun-dev/devflow-app',
                private: true,
                default_branch: 'main',
                html_url: 'https://github.com/tharun-dev/devflow-app',
                description: null,
                language: 'TypeScript',
                updated_at: null,
                pushed_at: null,
                owner: { login: 'tharun-dev' },
              },
            ],
          });
        }
        throw new Error(`Unexpected fetch URL: ${url}`);
      }) as any;

      const res = await request(app)
        .post('/api/github/app/projects/proj-1/connect')
        .set('Authorization', `Bearer ${devToken}`)
        .send({ githubRepoId: 999999 });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('GITHUB_REPO_NOT_AUTHORIZED');
      expect(prisma.project.update).not.toHaveBeenCalled();
    });

    it('binds authorized repository and installation record relation onto project', async () => {
      (prisma.project.findUnique as any).mockResolvedValue({
        id: 'proj-1',
        isArchived: false,
        createdById: 'user-dev-1',
        clientId: 'user-client-1',
        leadDeveloperId: 'user-dev-1',
        members: [{ userId: 'user-dev-1', role: ProjectMemberRole.LEAD_DEVELOPER }],
      });
      (prisma.gitHubAppInstallation.findFirst as any).mockResolvedValue({
        id: 'inst-rec-1',
        installationId: 9901,
        userId: 'user-dev-1',
        accountId: 777001,
        accountLogin: 'tharun-dev',
        accountType: 'User',
        repositorySelection: 'selected',
        status: GitHubInstallationStatus.ACTIVE,
      });
      (prisma.gitHubAuthorizedRepo.findFirst as any).mockResolvedValue({
        id: 'auth-repo-1',
        installationRecordId: 'inst-rec-1',
        githubRepoId: 501,
        fullName: 'tharun-dev/devflow-app',
        defaultBranch: 'main',
        isPrivate: true,
      });
      (prisma.project.update as any).mockResolvedValue({
        id: 'proj-1',
        githubInstallationRecordId: 'inst-rec-1',
        githubRepoOwner: 'tharun-dev',
        githubRepoName: 'devflow-app',
        githubDefaultBranch: 'main',
        githubVisibility: 'private',
        githubSyncStatus: 'PENDING',
      });
      (prisma.activityLog.create as any).mockResolvedValue({ id: 'act-1' });

      const validExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        if (url === 'https://api.github.com/app/installations/9901/access_tokens') {
          return mockJsonResponse(201, { token: 'ghs_bind_token', expires_at: validExpiry });
        }
        if (url === 'https://api.github.com/repos/tharun-dev/devflow-app') {
          expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer ghs_bind_token');
          return mockJsonResponse(200, {
            id: 501,
            name: 'devflow-app',
            full_name: 'tharun-dev/devflow-app',
            private: true,
            default_branch: 'main',
            html_url: 'https://github.com/tharun-dev/devflow-app',
            description: 'Main app',
            language: 'TypeScript',
            updated_at: '2026-11-12T12:00:00Z',
            pushed_at: '2026-11-12T12:00:00Z',
            owner: { login: 'tharun-dev' },
          });
        }
        throw new Error(`Unexpected fetch URL: ${url}`);
      }) as any;

      const res = await request(app)
        .post('/api/github/app/projects/proj-1/connect')
        .set('Authorization', `Bearer ${devToken}`)
        .send({ githubRepoId: 501, repoFullName: 'tharun-dev/devflow-app' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        connected: true,
        authMethod: 'GITHUB_APP',
        project: {
          id: 'proj-1',
          githubInstallationRecordId: 'inst-rec-1',
          githubRepoOwner: 'tharun-dev',
          githubRepoName: 'devflow-app',
          githubDefaultBranch: 'main',
          githubVisibility: 'private',
          githubSyncStatus: 'PENDING',
        },
      });
      expect(JSON.stringify(res.body)).not.toContain('ghs_bind_token');

      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: 'proj-1' },
        data: {
          githubInstallationRecordId: 'inst-rec-1',
          githubRepoOwner: 'tharun-dev',
          githubRepoName: 'devflow-app',
          githubDefaultBranch: 'main',
          githubVisibility: 'private',
          githubSyncStatus: 'PENDING',
          githubSyncError: null,
        },
      });
      expect(prisma.activityLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            projectId: 'proj-1',
            userId: 'user-dev-1',
            action: ActivityAction.GITHUB_REPO_CONNECTED,
          }),
        })
      );
    });
  });
});

