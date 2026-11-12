import crypto from 'crypto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import {
  ActivityAction,
  EvidenceType,
  MilestoneStatus,
  PaymentPayoutStatus,
  PaymentStatus,
  PayoutRecordStatus,
  Prisma,
  ProjectMemberRole,
  ProjectStatus,
  Role,
  VerificationStatus,
} from '@prisma/client';
import { AgentType } from '../src/modules/ai/ai.schema';
import { app } from '../src/app';
import { prisma } from '../src/config/database';
import { env } from '../src/config/env';
import { encryptSecret } from '../src/utils/crypto';

vi.mock('../src/config/database', () => {
  const mockPrisma: any = {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    oAuthState: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    project: {
      count: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    milestone: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    verificationResult: {
      count: vi.fn(),
    },
    aIAnalysis: {
      findMany: vi.fn(),
    },
    payment: {
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
    evidence: {
      findMany: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    webhookEvent: {
      create: vi.fn(),
      update: vi.fn(),
    },
  };
  return { prisma: mockPrisma };
});

function signTestJwt(userId: string, email: string, role: Role | 'GUEST', isGuest = false) {
  return jwt.sign({ sub: userId, email, role, isGuest }, env.JWT_SECRET, { expiresIn: '1h' });
}

describe('Phase 7: GitHub Onboarding, Repo Sync, Webhooks & Real Telemetry Suite', () => {
  const devToken = signTestJwt('user-dev-1', 'dev@devflow.test', Role.DEVELOPER);
  const clientToken = signTestJwt('user-client-1', 'client@devflow.test', Role.CLIENT);
  const outsiderToken = signTestJwt('user-dev-2', 'other@devflow.test', Role.DEVELOPER);
  const guestToken = signTestJwt('guest-1', 'guest@devflow.test', 'GUEST', true);

  let originalEnvSnapshot: {
    GITHUB_CLIENT_ID?: string;
    GITHUB_CLIENT_SECRET?: string;
    GITHUB_WEBHOOK_SECRET?: string;
    GEMINI_API_KEY?: string;
    AI_PROVIDER: string;
  };
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    originalFetch = global.fetch;
    originalEnvSnapshot = {
      GITHUB_CLIENT_ID: env.GITHUB_CLIENT_ID,
      GITHUB_CLIENT_SECRET: env.GITHUB_CLIENT_SECRET,
      GITHUB_WEBHOOK_SECRET: env.GITHUB_WEBHOOK_SECRET,
      GEMINI_API_KEY: env.GEMINI_API_KEY,
      AI_PROVIDER: env.AI_PROVIDER,
    };
    (env as any).GITHUB_CLIENT_ID = 'gh-test-client-id';
    (env as any).GITHUB_CLIENT_SECRET = 'gh-test-client-secret';
    (env as any).GITHUB_WEBHOOK_SECRET = 'whsec_test_github_secret_123';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    (env as any).GITHUB_CLIENT_ID = originalEnvSnapshot.GITHUB_CLIENT_ID;
    (env as any).GITHUB_CLIENT_SECRET = originalEnvSnapshot.GITHUB_CLIENT_SECRET;
    (env as any).GITHUB_WEBHOOK_SECRET = originalEnvSnapshot.GITHUB_WEBHOOK_SECRET;
    (env as any).GEMINI_API_KEY = originalEnvSnapshot.GEMINI_API_KEY;
    (env as any).AI_PROVIDER = originalEnvSnapshot.AI_PROVIDER;
  });

  describe('GitHub Connection Status & Onboarding OAuth', () => {
    it('GET /api/github/status reports unconfigured and disconnected accurately', async () => {
      (env as any).GITHUB_CLIENT_ID = undefined;
      (env as any).GITHUB_CLIENT_SECRET = undefined;
      (env as any).GITHUB_WEBHOOK_SECRET = undefined;
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-dev-1',
        githubId: null,
        githubAccessToken: null,
        githubUsername: null,
        githubConnectedAt: null,
        avatarUrl: null,
      });

      const res = await request(app)
        .get('/api/github/status')
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.oauthConfigured).toBe(false);
      expect(res.body.webhookConfigured).toBe(false);
      expect(res.body.connected).toBe(false);
      expect(res.body.reauthRequired).toBe(false);
    });

    it('GET /api/github/status probes GitHub API and detects connected scopes', async () => {
      const encryptedToken = encryptSecret('gho_valid_test_token_123');
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-dev-1',
        githubId: '998877',
        githubAccessToken: encryptedToken,
        githubUsername: 'dev-octo',
        githubConnectedAt: new Date('2026-11-10T10:00:00.000Z'),
        avatarUrl: 'https://avatars.githubusercontent.com/u/998877',
      });

      global.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: 998877,
            login: 'dev-octo',
            avatar_url: 'https://avatars.githubusercontent.com/u/998877',
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json',
              'x-oauth-scopes': 'read:user, user:email, repo',
            },
          }
        )
      ) as any;

      const res = await request(app)
        .get('/api/github/status')
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.connected).toBe(true);
      expect(res.body.username).toBe('dev-octo');
      expect(res.body.hasRepoScope).toBe(true);
      expect(res.body.githubApiReachable).toBe(true);
      expect(res.body.webhookConfigured).toBe(true);
    });

    it('GET /api/github/status flags reauthRequired when GitHub API rejects revoked token with 401', async () => {
      const encryptedToken = encryptSecret('gho_revoked_test_token');
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-dev-1',
        githubId: '998877',
        githubAccessToken: encryptedToken,
        githubUsername: 'dev-octo',
        githubConnectedAt: new Date('2026-11-10T10:00:00.000Z'),
        avatarUrl: null,
      });

      global.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'Bad credentials' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        })
      ) as any;

      const res = await request(app)
        .get('/api/github/status')
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.connected).toBe(false);
      expect(res.body.reauthRequired).toBe(true);
    });

    it('POST /api/github/oauth/connect rejects CLIENT and GUEST, but returns PKCE repo-scoped URL for DEVELOPER', async () => {
      const clientRes = await request(app)
        .post('/api/github/oauth/connect')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ returnPath: '/integrations' });
      expect(clientRes.status).toBe(403);

      const guestRes = await request(app)
        .post('/api/github/oauth/connect')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({ returnPath: '/integrations' });
      expect(guestRes.status).toBe(403);

      (prisma.oAuthState.create as any).mockResolvedValue({ id: 'oauth-state-connect-1' });
      const devRes = await request(app)
        .post('/api/github/oauth/connect')
        .set('Authorization', `Bearer ${devToken}`)
        .send({ returnPath: '/integrations' });

      expect(devRes.status).toBe(200);
      expect(devRes.body.authorizeUrl).toContain('https://github.com/login/oauth/authorize');
      expect(devRes.body.authorizeUrl).toContain('repo');
      expect(devRes.body.authorizeUrl).toContain('code_challenge=');
      const setCookie = devRes.headers['set-cookie'] as string[];
      expect(setCookie.some((c) => c.includes('devflow_oauth_state='))).toBe(true);
    });

    it('POST /api/github/disconnect clears GitHub access metadata', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-dev-1',
        passwordHash: '$2b$12$existinghash',
      });
      (prisma.user.update as any).mockResolvedValue({ id: 'user-dev-1' });

      const res = await request(app)
        .post('/api/github/disconnect')
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ connected: false });
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-dev-1' },
          data: expect.objectContaining({
            githubAccessToken: null,
            githubUsername: null,
            githubConnectedAt: null,
            githubId: null,
          }),
        })
      );
    });
  });

  describe('Repository Listing, Project Binding & Synchronization', () => {
    it('GET /api/github/repos returns normalized GitHub repositories with query filter', async () => {
      const encryptedToken = encryptSecret('gho_repo_token');
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-dev-1',
        githubId: '101',
        githubAccessToken: encryptedToken,
        githubUsername: 'octodev',
      });

      global.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify([
            {
              id: 11,
              name: 'payment-api',
              full_name: 'octodev/payment-api',
              private: true,
              default_branch: 'main',
              html_url: 'https://github.com/octodev/payment-api',
              description: 'TypeScript settlement service',
              language: 'TypeScript',
              updated_at: '2026-11-11T10:00:00.000Z',
              pushed_at: '2026-11-11T12:00:00.000Z',
              owner: { login: 'octodev' },
            },
            {
              id: 12,
              name: 'docs-site',
              full_name: 'octodev/docs-site',
              private: false,
              default_branch: 'main',
              html_url: 'https://github.com/octodev/docs-site',
              description: 'Marketing documentation',
              language: 'Markdown',
              updated_at: '2026-11-10T10:00:00.000Z',
              pushed_at: '2026-11-10T10:00:00.000Z',
              owner: { login: 'octodev' },
            },
          ]),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      ) as any;

      const res = await request(app)
        .get('/api/github/repos?q=payment')
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.repositories).toHaveLength(1);
      expect(res.body.repositories[0]).toMatchObject({
        fullName: 'octodev/payment-api',
        private: true,
        defaultBranch: 'main',
        language: 'TypeScript',
      });
    });

    it('POST /api/github/projects/:projectId/connect denies unauthorized non-member user with 403', async () => {
      (prisma.project.findUnique as any).mockResolvedValue({
        id: 'proj-1',
        isArchived: false,
        createdById: 'user-dev-1',
        clientId: 'user-client-1',
        leadDeveloperId: 'user-dev-1',
        members: [],
      });

      const res = await request(app)
        .post('/api/github/projects/proj-1/connect')
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({ repoFullName: 'octodev/payment-api' });

      expect(res.status).toBe(403);
    });

    it('POST /api/github/projects/:projectId/connect binds and synchronizes commits, PRs, issues, and files', async () => {
      const encryptedToken = encryptSecret('gho_sync_token');
      const baseProject = {
        id: 'proj-1',
        title: 'Settlement Engine',
        isArchived: false,
        createdById: 'user-dev-1',
        clientId: 'user-client-1',
        leadDeveloperId: 'user-dev-1',
        members: [{ userId: 'user-dev-1', role: ProjectMemberRole.LEAD_DEVELOPER }],
        githubRepoOwner: null,
        githubRepoName: null,
        githubDefaultBranch: null,
        githubVisibility: null,
        githubSyncedAt: null,
        githubSyncStatus: 'NOT_CONNECTED',
        githubSyncError: null,
        githubLastCommitSha: null,
        githubLastCommitMessage: null,
        githubLastCommitAt: null,
        githubCachedData: null,
      };

      const boundProject = {
        ...baseProject,
        githubRepoOwner: 'octodev',
        githubRepoName: 'payment-api',
        githubDefaultBranch: 'main',
        githubVisibility: 'private',
        githubSyncStatus: 'SYNCING',
      };

      let persistedCachedData: any = null;
      (prisma.project.findUnique as any)
        .mockResolvedValueOnce(baseProject)
        .mockResolvedValueOnce(boundProject);
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-dev-1',
        githubId: '101',
        githubAccessToken: encryptedToken,
        githubUsername: 'octodev',
      });
      (prisma.user.findMany as any).mockResolvedValue([
        { id: 'user-dev-1', githubAccessToken: encryptedToken },
      ]);
      (prisma.project.update as any).mockImplementation(async ({ data }: any) => {
        if (data.githubCachedData) {
          persistedCachedData = data.githubCachedData;
        }
        return {
          ...boundProject,
          ...data,
        };
      });
      (prisma.activityLog.create as any).mockResolvedValue({ id: 'act-1' });

      global.fetch = vi.fn(async (input: any) => {
        const url = String(input);
        if (url.endsWith('/commits?per_page=10')) {
          return new Response(
            JSON.stringify([
              {
                sha: 'abc1234567890def',
                html_url: 'https://github.com/octodev/payment-api/commit/abc1234567890def',
                commit: {
                  message: 'feat: implement webhook idempotency guard',
                  author: { name: 'Octo Dev', date: '2026-11-11T15:00:00.000Z' },
                },
                author: { login: 'octodev', avatar_url: 'https://avatars/u/101' },
              },
            ]),
            { status: 200, headers: { 'content-type': 'application/json' } }
          );
        }
        if (url.includes('/commits/abc1234567890def')) {
          return new Response(
            JSON.stringify({
              stats: { additions: 42, deletions: 8, total: 50 },
              files: [
                { filename: 'src/webhook.ts', status: 'modified', additions: 42, deletions: 8 },
              ],
            }),
            { status: 200, headers: { 'content-type': 'application/json' } }
          );
        }
        if (url.includes('/pulls?')) {
          return new Response(
            JSON.stringify([
              {
                id: 501,
                number: 18,
                title: 'Add webhook guard',
                state: 'open',
                html_url: 'https://github.com/octodev/payment-api/pull/18',
                created_at: '2026-11-11T14:00:00.000Z',
                updated_at: '2026-11-11T14:30:00.000Z',
                merged_at: null,
                user: { login: 'octodev', avatar_url: null },
                head: { ref: 'feat/webhook-guard' },
                base: { ref: 'main' },
              },
            ]),
            { status: 200, headers: { 'content-type': 'application/json' } }
          );
        }
        if (url.includes('/issues?')) {
          return new Response(
            JSON.stringify([
              {
                id: 701,
                number: 4,
                title: 'Document HMAC header validation',
                state: 'open',
                html_url: 'https://github.com/octodev/payment-api/issues/4',
                created_at: '2026-11-10T09:00:00.000Z',
                updated_at: '2026-11-10T09:00:00.000Z',
                user: { login: 'octodev' },
              },
            ]),
            { status: 200, headers: { 'content-type': 'application/json' } }
          );
        }
        return new Response(
          JSON.stringify({
            id: 11,
            name: 'payment-api',
            full_name: 'octodev/payment-api',
            private: true,
            default_branch: 'main',
            html_url: 'https://github.com/octodev/payment-api',
            description: 'TypeScript settlement service',
            language: 'TypeScript',
            open_issues_count: 1,
            pushed_at: '2026-11-11T15:00:00.000Z',
            owner: { login: 'octodev' },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }) as any;

      const res = await request(app)
        .post('/api/github/projects/proj-1/connect')
        .set('Authorization', `Bearer ${devToken}`)
        .send({ repoFullName: 'octodev/payment-api' });

      expect(res.status).toBe(200);
      expect(res.body.repoLinked).toBe(true);
      expect(res.body.syncStatus).toBe('SYNCED');
      expect(res.body.repository.fullName).toBe('octodev/payment-api');
      expect(res.body.commits).toHaveLength(1);
      expect(res.body.commits[0].shortSha).toBe('abc1234');
      expect(res.body.commits[0].filesChanged).toBe(1);
      expect(res.body.pullRequests).toHaveLength(1);
      expect(res.body.issues).toHaveLength(1);
      expect(persistedCachedData?.latestCommitFiles?.[0]?.filename).toBe('src/webhook.ts');
      expect(prisma.activityLog.create).toHaveBeenCalledTimes(2);
    });

    it('GET /api/github/projects/:projectId/activity returns repository snapshot and submitted evidence', async () => {
      (prisma.project.findUnique as any).mockResolvedValue({
        id: 'proj-1',
        title: 'Settlement Engine',
        isArchived: false,
        createdById: 'user-dev-1',
        clientId: 'user-client-1',
        leadDeveloperId: 'user-dev-1',
        members: [],
        githubRepoOwner: 'octodev',
        githubRepoName: 'payment-api',
        githubDefaultBranch: 'main',
        githubVisibility: 'private',
        githubSyncedAt: new Date('2026-11-11T15:05:00.000Z'),
        githubSyncStatus: 'SYNCED',
        githubSyncError: null,
        githubLastCommitSha: 'abc1234567890def',
        githubLastCommitMessage: 'feat: implement webhook idempotency guard',
        githubLastCommitAt: new Date('2026-11-11T15:00:00.000Z'),
        githubCachedData: {
          commits: [{ sha: 'abc1234567890def', shortSha: 'abc1234', message: 'feat: guard', author: 'octodev', authorLogin: 'octodev', authorAvatar: null, date: '2026-11-11T15:00:00.000Z', url: 'https://github.com/octodev/payment-api/commit/abc1234567890def' }],
          pullRequests: [],
          issues: [],
          latestCommitFiles: [],
        },
      });
      (prisma.evidence.findMany as any).mockResolvedValue([
        {
          id: 'ev-1',
          type: EvidenceType.GITHUB_COMMIT,
          title: 'Initial milestone commit',
          githubCommitSha: 'abc1234567890def',
          githubPrNumber: null,
          externalUrl: 'https://github.com/octodev/payment-api/commit/abc1234567890def',
          createdAt: new Date('2026-11-11T15:10:00.000Z'),
          milestone: { id: 'ms-1', title: 'Webhook Security' },
          uploadedBy: { name: 'Octo Dev', avatarUrl: null },
        },
      ]);

      const res = await request(app)
        .get('/api/github/projects/proj-1/activity')
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.repoLinked).toBe(true);
      expect(res.body.commits).toHaveLength(1);
      expect(res.body.submittedEvidence).toHaveLength(1);
      expect(res.body.submittedEvidence[0].milestoneTitle).toBe('Webhook Security');
    });
  });

  describe('GitHub Webhook Listener (HMAC-SHA256 & Idempotency)', () => {
    function signPayload(payload: object): { raw: string; sig: string } {
      const raw = JSON.stringify(payload);
      const sig =
        'sha256=' +
        crypto
          .createHmac('sha256', env.GITHUB_WEBHOOK_SECRET as string)
          .update(Buffer.from(raw, 'utf8'))
          .digest('hex');
      return { raw, sig };
    }

    it('rejects requests with missing or tampered X-Hub-Signature-256 with 401', async () => {
      const res = await request(app)
        .post('/api/github/webhooks')
        .set('Content-Type', 'application/json')
        .set('X-GitHub-Event', 'push')
        .set('X-GitHub-Delivery', 'deliv-bad-1')
        .set('X-Hub-Signature-256', 'sha256=' + '0'.repeat(64))
        .send(JSON.stringify({ repository: { full_name: 'octodev/payment-api' } }));

      expect(res.status).toBe(401);
    });

    it('accepts valid signed push webhook and updates linked project metadata', async () => {
      const payload = {
        repository: {
          name: 'payment-api',
          full_name: 'octodev/payment-api',
          owner: { login: 'octodev' },
        },
        head_commit: {
          id: 'deadbeef1234567890',
          message: 'fix: tighten signature comparison',
          timestamp: '2026-11-12T08:00:00.000Z',
          url: 'https://github.com/octodev/payment-api/commit/deadbeef1234567890',
          author: { name: 'Octo Dev', username: 'octodev' },
        },
      };
      const { raw, sig } = signPayload(payload);

      (prisma.webhookEvent.create as any).mockResolvedValue({ id: 'wh-row-1' });
      (prisma.webhookEvent.update as any).mockResolvedValue({ id: 'wh-row-1' });
      (prisma.project.findMany as any).mockResolvedValue([
        {
          id: 'proj-1',
          githubRepoOwner: 'octodev',
          githubRepoName: 'payment-api',
          githubCachedData: { commits: [], pullRequests: [] },
        },
      ]);
      (prisma.project.update as any).mockResolvedValue({ id: 'proj-1' });
      (prisma.activityLog.create as any).mockResolvedValue({ id: 'act-wh-1' });

      const res = await request(app)
        .post('/api/github/webhooks')
        .set('Content-Type', 'application/json')
        .set('X-GitHub-Event', 'push')
        .set('X-GitHub-Delivery', 'deliv-valid-1')
        .set('X-Hub-Signature-256', sig)
        .send(raw);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        duplicate: false,
        eventId: 'deliv-valid-1',
        status: 'PROCESSED',
        updatedProjects: 1,
      });
      expect(prisma.project.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'proj-1' },
          data: expect.objectContaining({
            githubLastCommitSha: 'deadbeef1234567890',
            githubLastCommitMessage: 'fix: tighten signature comparison',
            githubSyncStatus: 'SYNCED',
          }),
        })
      );
    });

    it('handles duplicate delivery IDs idempotently via Prisma P2002', async () => {
      const payload = { repository: { name: 'payment-api', owner: { login: 'octodev' } } };
      const { raw, sig } = signPayload(payload);

      (prisma.webhookEvent.create as any).mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '5.22.0',
        })
      );

      const res = await request(app)
        .post('/api/github/webhooks')
        .set('Content-Type', 'application/json')
        .set('X-GitHub-Event', 'push')
        .set('X-GitHub-Delivery', 'deliv-dup-1')
        .set('X-Hub-Signature-256', sig)
        .send(raw);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        duplicate: true,
        eventId: 'deliv-dup-1',
        status: 'ALREADY_PROCESSED',
      });
    });
  });

  describe('Telemetry & Financial Summary Consistency', () => {
    it('GET /api/telemetry returns zeroed financial/AI baselines (not hardcoded 96%) for an empty account', async () => {
      (prisma.payment.aggregate as any)
        .mockResolvedValueOnce({ _sum: { settledAmount: null } })
        .mockResolvedValueOnce({ _sum: { snapshotAmount: null } });
      (prisma.milestone.count as any).mockResolvedValue(0);
      (prisma.verificationResult.count as any).mockResolvedValue(0);
      (prisma.project.count as any).mockResolvedValue(0);
      (prisma.milestone.findMany as any).mockResolvedValue([]);
      (prisma.project.findMany as any).mockResolvedValue([]);
      (prisma.aIAnalysis.findMany as any).mockResolvedValue([]);
      (prisma.activityLog.findMany as any).mockResolvedValue([]);
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-dev-1',
        githubId: null,
        githubAccessToken: null,
        githubUsername: null,
        githubConnectedAt: null,
      });

      const res = await request(app)
        .get('/api/telemetry')
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.totalRevenuePaid).toBe(0);
      expect(res.body.pendingInvoicesAmount).toBe(0);
      expect(res.body.aiVerificationPassRate).toBe(0);
      expect(res.body.totalProjects).toBe(0);
      expect(res.body.financials.hasFinancialData).toBe(false);
      expect(res.body.aiAgents).toHaveLength(4);
      expect(res.body.aiAgents.every((a: any) => a.status === 'IDLE')).toBe(true);
      expect(res.body.integrations.github.connected).toBe(false);
      expect(res.body.integrations.github.oauthConfigured).toBe(true);
    });

    it('GET /api/telemetry and GET /api/payments/summary return matching Decimal financial figures and real AI status', async () => {
      const milestoneFixtures = [
        {
          id: 'ms-paid-1',
          status: MilestoneStatus.PAID,
          paymentAmount: new Prisma.Decimal('2500.00'),
          currency: 'USD',
          updatedAt: new Date('2026-11-10T10:00:00.000Z'),
          createdAt: new Date('2026-11-01T10:00:00.000Z'),
          payments: [
            {
              id: 'pay-1',
              status: PaymentStatus.PAID,
              payoutStatus: PaymentPayoutStatus.DISBURSED,
              snapshotAmount: new Prisma.Decimal('2500.00'),
              snapshotCurrency: 'USD',
              settledAmount: new Prisma.Decimal('2500.00'),
              netReceivedAmount: new Prisma.Decimal('2500.00'),
              paidAt: new Date('2026-11-10T11:00:00.000Z'),
              createdAt: new Date('2026-11-10T09:00:00.000Z'),
              payoutRecords: [
                {
                  id: 'po-1',
                  amount: new Prisma.Decimal('2500.00'),
                  status: PayoutRecordStatus.DISBURSED,
                  initiatedAt: new Date('2026-11-10T11:30:00.000Z'),
                  disbursedAt: new Date('2026-11-10T12:00:00.000Z'),
                },
              ],
            },
          ],
        },
        {
          id: 'ms-pending-1',
          status: MilestoneStatus.APPROVED,
          paymentAmount: new Prisma.Decimal('1200.50'),
          currency: 'USD',
          updatedAt: new Date('2026-11-11T10:00:00.000Z'),
          createdAt: new Date('2026-11-02T10:00:00.000Z'),
          payments: [
            {
              id: 'pay-2',
              status: PaymentStatus.SENT,
              payoutStatus: PaymentPayoutStatus.NOT_STARTED,
              snapshotAmount: new Prisma.Decimal('1200.50'),
              snapshotCurrency: 'USD',
              settledAmount: new Prisma.Decimal('0.00'),
              netReceivedAmount: new Prisma.Decimal('0.00'),
              paidAt: null,
              createdAt: new Date('2026-11-11T10:05:00.000Z'),
              payoutRecords: [],
            },
          ],
        },
      ];

      (prisma.payment.aggregate as any)
        .mockResolvedValueOnce({ _sum: { settledAmount: new Prisma.Decimal('2500.00') } })
        .mockResolvedValueOnce({ _sum: { snapshotAmount: new Prisma.Decimal('1200.50') } });
      (prisma.milestone.count as any).mockResolvedValue(1);
      (prisma.verificationResult.count as any)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2);
      (prisma.project.count as any).mockResolvedValue(1);
      (prisma.milestone.findMany as any).mockResolvedValue(milestoneFixtures);
      (prisma.project.findMany as any).mockResolvedValue([
        {
          id: 'proj-1',
          title: 'Core API',
          status: ProjectStatus.ACTIVE,
          client: { id: 'user-client-1', name: 'Acme Client' },
          leadDeveloper: { id: 'user-dev-1', name: 'Dev One' },
          githubRepoOwner: 'octodev',
          githubRepoName: 'payment-api',
          githubSyncStatus: 'SYNCED',
          githubSyncedAt: new Date('2026-11-11T15:00:00.000Z'),
          githubLastCommitSha: 'abc1234',
          githubLastCommitMessage: 'feat: API',
          githubLastCommitAt: new Date('2026-11-11T14:55:00.000Z'),
          milestones: [
            {
              id: 'ms-paid-1',
              title: 'Milestone 1',
              status: MilestoneStatus.PAID,
              dueDate: null,
              paymentAmount: new Prisma.Decimal('2500.00'),
              currency: 'USD',
            },
            {
              id: 'ms-pending-1',
              title: 'Milestone 2',
              status: MilestoneStatus.APPROVED,
              dueDate: null,
              paymentAmount: new Prisma.Decimal('1200.50'),
              currency: 'USD',
            },
          ],
        },
      ]);
      (prisma.aIAnalysis.findMany as any).mockResolvedValue([
        {
          id: 'ai-1',
          agentType: AgentType.EVIDENCE_ANALYSIS,
          rawResponse: JSON.stringify({
            confidenceScore: 92,
            summary: 'AST check passed cleanly.',
            modelUsed: 'gemini-2.5-flash',
          }),
          createdAt: new Date('2026-11-11T12:00:00.000Z'),
          verificationResult: {
            overallScore: 92,
            summary: 'AST check passed cleanly.',
            modelName: 'gemini-2.5-flash',
            status: VerificationStatus.PASSED,
          },
        },
        {
          id: 'ai-2',
          agentType: AgentType.MILESTONE_VERIFICATION,
          rawResponse: JSON.stringify({
            error: 'Gemini quota limit reached',
          }),
          createdAt: new Date('2026-11-11T12:05:00.000Z'),
          verificationResult: {
            overallScore: 0,
            summary: 'Failed',
            modelName: 'gemini-2.5-flash',
            status: VerificationStatus.FAILED,
          },
        },
      ]);
      (prisma.activityLog.findMany as any).mockResolvedValue([
        {
          id: 'act-1',
          action: ActivityAction.GITHUB_REPO_SYNCED,
          entityType: 'PROJECT',
          entityId: 'proj-1',
          projectId: 'proj-1',
          details: { repoFullName: 'octodev/payment-api' },
          createdAt: new Date('2026-11-11T15:00:00.000Z'),
          user: { id: 'user-dev-1', name: 'Dev One' },
          project: { id: 'proj-1', title: 'Core API' },
        },
      ]);
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-dev-1',
        githubId: '101',
        githubAccessToken: encryptSecret('gho_abc'),
        githubUsername: 'octodev',
        githubConnectedAt: new Date('2026-11-10T10:00:00.000Z'),
      });

      const telRes = await request(app)
        .get('/api/telemetry?range=all')
        .set('Authorization', `Bearer ${devToken}`);

      expect(telRes.status).toBe(200);
      expect(telRes.body.aiVerificationPassRate).toBe(50);
      expect(telRes.body.financials.receivedPaymentAmount).toBe(2500);
      expect(telRes.body.financials.pendingPaymentAmount).toBe(1200.5);
      expect(telRes.body.financials.completedPayoutAmount).toBe(2500);
      expect(telRes.body.financials.pendingEarningsAmount).toBe(1200.5);
      expect(telRes.body.financials.hasFinancialData).toBe(true);

      const evidenceAgent = telRes.body.aiAgents.find(
        (a: any) => a.agentType === 'EVIDENCE_ANALYSIS'
      );
      const verifierAgent = telRes.body.aiAgents.find(
        (a: any) => a.agentType === 'MILESTONE_VERIFICATION'
      );
      expect(evidenceAgent.status).toBe('COMPLETED');
      expect(evidenceAgent.confidenceScore).toBe(92);
      expect(verifierAgent.status).toBe('FAILED');
      expect(verifierAgent.errorMessage).toContain('Gemini quota limit reached');

      const paySummaryRes = await request(app)
        .get('/api/payments/summary?range=all')
        .set('Authorization', `Bearer ${devToken}`);

      expect(paySummaryRes.status).toBe(200);
      expect(paySummaryRes.body.receivedPaymentAmount).toBe(
        telRes.body.financials.receivedPaymentAmount
      );
      expect(paySummaryRes.body.pendingPaymentAmount).toBe(
        telRes.body.financials.pendingPaymentAmount
      );
      expect(paySummaryRes.body.completedPayoutAmount).toBe(
        telRes.body.financials.completedPayoutAmount
      );
      expect(paySummaryRes.body.pendingEarningsAmount).toBe(
        telRes.body.financials.pendingEarningsAmount
      );
    });
  });
});
