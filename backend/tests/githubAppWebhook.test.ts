import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';
import { env } from '../src/config/env';
import { githubAppService } from '../src/modules/github/github-app.service';
import { githubAppInstallService } from '../src/modules/github/github-app-install.service';
import { githubAppWebhookService } from '../src/modules/github/github-app-webhook.service';

vi.mock('../src/config/database', () => {
  const mockPrisma = {
    gitHubAppInstallation: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    gitHubAuthorizedRepo: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
      upsert: vi.fn(),
    },
    project: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    webhookEvent: {
      create: vi.fn(),
      update: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
    },
  };
  return { prisma: mockPrisma };
});

const TEST_WEBHOOK_SECRET = 'test_webhook_signing_secret_32_characters_long_1234';

function signPayload(payloadString: string, secret = TEST_WEBHOOK_SECRET): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
}

describe('Stage 5: GitHub App Webhook Integration Suite', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    (env as { GITHUB_APP_WEBHOOK_SECRET?: string }).GITHUB_APP_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
  });

  describe('HMAC-SHA256 Signature Verification & Timing-Safe Checks', () => {
    it('rejects webhooks with missing signature header with 401', async () => {
      const payload = { zen: 'Non-blocking is better than blocking.' };
      const res = await request(app)
        .post('/api/github/app/webhooks')
        .set('Content-Type', 'application/json')
        .set('x-github-event', 'ping')
        .send(payload);

      expect(res.status).toBe(401);
      expect(res.body.error?.code).toBe('INVALID_WEBHOOK_SIGNATURE');
      expect(prisma.webhookEvent.create).not.toHaveBeenCalled();
    });

    it('rejects forged webhooks with invalid HMAC signature with 401 and causes zero database mutations', async () => {
      const payload = { action: 'deleted', installation: { id: 181330413 } };
      const rawString = JSON.stringify(payload);
      const forgedSig = 'sha256=' + '0'.repeat(64);

      const res = await request(app)
        .post('/api/github/app/webhooks')
        .set('Content-Type', 'application/json')
        .set('x-hub-signature-256', forgedSig)
        .set('x-github-event', 'installation')
        .send(rawString);

      expect(res.status).toBe(401);
      expect(res.body.error?.code).toBe('INVALID_WEBHOOK_SIGNATURE');
      expect(prisma.webhookEvent.create).not.toHaveBeenCalled();
      expect(prisma.gitHubAppInstallation.update).not.toHaveBeenCalled();
    });

    it('accepts valid HMAC-SHA256 signed payload and processes event', async () => {
      const payload = { action: 'created', installation: { id: 181330413 } };
      const rawString = JSON.stringify(payload);
      const validSig = signPayload(rawString);

      vi.mocked(prisma.webhookEvent.create).mockResolvedValueOnce({
        id: 'wh-evt-1',
      } as any);

      vi.mocked(prisma.gitHubAppInstallation.findUnique).mockResolvedValueOnce({
        id: 'inst-rec-1',
        installationId: 181330413,
      } as any);

      vi.spyOn(githubAppInstallService, 'reconcileInstallationRepositories').mockResolvedValueOnce([
        { id: 1, fullName: 'org/repo1' } as any,
      ]);

      vi.mocked(prisma.webhookEvent.update).mockResolvedValueOnce({} as any);

      const res = await request(app)
        .post('/api/github/app/webhooks')
        .set('Content-Type', 'application/json')
        .set('x-hub-signature-256', validSig)
        .set('x-github-event', 'installation')
        .set('x-github-delivery', 'delivery-uuid-1')
        .send(rawString);

      expect(res.status).toBe(200);
      expect(res.body.duplicate).toBe(false);
      expect(res.body.status).toBe('RECONCILED');
      expect(res.body.reconciledRepoCount).toBe(1);
      expect(prisma.webhookEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          provider: 'GITHUB_APP',
          eventId: 'delivery-uuid-1',
          eventType: 'installation',
          resourceId: '181330413',
          status: 'RECEIVED',
        }),
      });
    });
  });

  describe('Duplicate & Idempotent Event Handling', () => {
    it('returns ALREADY_PROCESSED for duplicate deliveries without re-executing mutations', async () => {
      const payload = { action: 'created', installation: { id: 181330413 } };
      const rawString = JSON.stringify(payload);
      const validSig = signPayload(rawString);

      const knownError = new (class extends Error {
        code = 'P2002';
      })('Unique constraint failed');
      Object.setPrototypeOf(knownError, (prisma as any).constructor?.PrismaClientKnownRequestError?.prototype || Error.prototype);
      // Simulate Prisma P2002 error
      vi.mocked(prisma.webhookEvent.create).mockRejectedValueOnce(knownError);

      const res = await request(app)
        .post('/api/github/app/webhooks')
        .set('Content-Type', 'application/json')
        .set('x-hub-signature-256', validSig)
        .set('x-github-event', 'installation')
        .set('x-github-delivery', 'duplicate-delivery-1')
        .send(rawString);

      expect(res.status).toBe(200);
      expect(res.body.duplicate).toBe(true);
      expect(res.body.status).toBe('ALREADY_PROCESSED');
      expect(prisma.gitHubAppInstallation.update).not.toHaveBeenCalled();
    });
  });

  describe('Installation Suspension & Deletion Handling', () => {
    it('handles installation.suspend by updating status to SUSPENDED and invalidating tokens', async () => {
      const payload = { action: 'suspend', installation: { id: 181330413 } };
      const rawString = JSON.stringify(payload);
      const validSig = signPayload(rawString);

      vi.mocked(prisma.webhookEvent.create).mockResolvedValueOnce({ id: 'wh-evt-2' } as any);
      vi.mocked(prisma.gitHubAppInstallation.findUnique).mockResolvedValueOnce({
        id: 'inst-rec-1',
        installationId: 181330413,
      } as any);

      const invalidateSpy = vi.spyOn(githubAppService, 'invalidateInstallationToken');
      vi.mocked(prisma.gitHubAppInstallation.update).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.webhookEvent.update).mockResolvedValueOnce({} as any);

      const res = await request(app)
        .post('/api/github/app/webhooks')
        .set('Content-Type', 'application/json')
        .set('x-hub-signature-256', validSig)
        .set('x-github-event', 'installation')
        .set('x-github-delivery', 'delivery-uuid-suspend')
        .send(rawString);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('SUSPENDED');
      expect(invalidateSpy).toHaveBeenCalledWith(181330413);
      expect(prisma.gitHubAppInstallation.update).toHaveBeenCalledWith({
        where: { id: 'inst-rec-1' },
        data: expect.objectContaining({ status: 'SUSPENDED' }),
      });
    });

    it('handles installation.deleted by marking UNINSTALLED, invalidating tokens, and safely detaching projects', async () => {
      const payload = { action: 'deleted', installation: { id: 181330413 } };
      const rawString = JSON.stringify(payload);
      const validSig = signPayload(rawString);

      vi.mocked(prisma.webhookEvent.create).mockResolvedValueOnce({ id: 'wh-evt-3' } as any);
      vi.mocked(prisma.gitHubAppInstallation.findUnique).mockResolvedValueOnce({
        id: 'inst-rec-1',
        installationId: 181330413,
      } as any);

      const invalidateSpy = vi.spyOn(githubAppService, 'invalidateInstallationToken');
      vi.mocked(prisma.project.updateMany).mockResolvedValueOnce({ count: 2 } as any);
      vi.mocked(prisma.gitHubAppInstallation.update).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.webhookEvent.update).mockResolvedValueOnce({} as any);

      const res = await request(app)
        .post('/api/github/app/webhooks')
        .set('Content-Type', 'application/json')
        .set('x-hub-signature-256', validSig)
        .set('x-github-event', 'installation')
        .set('x-github-delivery', 'delivery-uuid-delete')
        .send(rawString);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UNINSTALLED');
      expect(res.body.detachedProjects).toBe(2);
      expect(invalidateSpy).toHaveBeenCalledWith(181330413);
      expect(prisma.project.updateMany).toHaveBeenCalledWith({
        where: { githubInstallationRecordId: 'inst-rec-1' },
        data: expect.objectContaining({
          githubInstallationRecordId: null,
          githubSyncStatus: 'FAILED',
        }),
      });
      expect(prisma.gitHubAppInstallation.update).toHaveBeenCalledWith({
        where: { id: 'inst-rec-1' },
        data: expect.objectContaining({ status: 'UNINSTALLED' }),
      });
    });
  });

  describe('Authoritative Repository Reconciliation on installation_repositories', () => {
    it('reconciles repositories from GitHub API and safely detaches removed project bindings', async () => {
      const payload = {
        action: 'removed',
        installation: { id: 181330413 },
        repositories_removed: [{ id: 999, full_name: 'Tharun/old-repo' }],
      };
      const rawString = JSON.stringify(payload);
      const validSig = signPayload(rawString);

      vi.mocked(prisma.webhookEvent.create).mockResolvedValueOnce({ id: 'wh-evt-4' } as any);
      vi.mocked(prisma.gitHubAppInstallation.findUnique).mockResolvedValueOnce({
        id: 'inst-rec-1',
        installationId: 181330413,
      } as any);

      // Authoritative reconciliation returns remaining active repo
      vi.spyOn(githubAppInstallService, 'reconcileInstallationRepositories').mockResolvedValueOnce([
        { id: 101, fullName: 'Tharun/active-repo' } as any,
      ]);

      vi.mocked(prisma.project.findMany).mockResolvedValueOnce([
        {
          id: 'proj-1',
          githubRepoOwner: 'Tharun',
          githubRepoName: 'old-repo',
          githubInstallationRecordId: 'inst-rec-1',
        } as any,
      ]);

      vi.mocked(prisma.project.update).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.webhookEvent.update).mockResolvedValueOnce({} as any);

      const res = await request(app)
        .post('/api/github/app/webhooks')
        .set('Content-Type', 'application/json')
        .set('x-hub-signature-256', validSig)
        .set('x-github-event', 'installation_repositories')
        .set('x-github-delivery', 'delivery-uuid-repos')
        .send(rawString);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('RECONCILED');
      expect(res.body.reconciledRepoCount).toBe(1);
      expect(res.body.detachedProjects).toBe(1);
      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: 'proj-1' },
        data: expect.objectContaining({
          githubInstallationRecordId: null,
          githubSyncStatus: 'FAILED',
        }),
      });
    });
  });

  describe('Real-Time Activity Events: push & pull_request', () => {
    it('updates connected projects on push events', async () => {
      const payload = {
        repository: { name: 'DevFlow', owner: { login: 'Tharunnagabramhagna' } },
        head_commit: {
          id: 'commit-sha-1234567890',
          message: 'feat: live webhook sync',
          timestamp: '2026-11-12T17:00:00Z',
          author: { name: 'Tharun', username: 'Tharunnagabramhagna' },
        },
        installation: { id: 181330413 },
      };
      const rawString = JSON.stringify(payload);
      const validSig = signPayload(rawString);

      vi.mocked(prisma.webhookEvent.create).mockResolvedValueOnce({ id: 'wh-evt-5' } as any);
      vi.mocked(prisma.project.findMany).mockResolvedValueOnce([
        {
          id: 'proj-live-1',
          githubRepoOwner: 'Tharunnagabramhagna',
          githubRepoName: 'DevFlow',
          githubCachedData: { commits: [] },
        } as any,
      ]);

      vi.mocked(prisma.project.update).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.webhookEvent.update).mockResolvedValueOnce({} as any);

      const res = await request(app)
        .post('/api/github/app/webhooks')
        .set('Content-Type', 'application/json')
        .set('x-hub-signature-256', validSig)
        .set('x-github-event', 'push')
        .set('x-github-delivery', 'delivery-push-1')
        .send(rawString);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('PROCESSED');
      expect(res.body.updatedProjects).toBe(1);
      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: 'proj-live-1' },
        data: expect.objectContaining({
          githubLastCommitSha: 'commit-sha-1234567890',
          githubLastCommitMessage: 'feat: live webhook sync',
          githubSyncStatus: 'SYNCED',
        }),
      });
    });

    it('updates connected projects on pull_request events', async () => {
      const payload = {
        action: 'opened',
        repository: { name: 'DevFlow', owner: { login: 'Tharunnagabramhagna' } },
        pull_request: {
          id: 55,
          number: 12,
          title: 'feat: integrate Stage 5 webhooks',
          state: 'open',
          user: { login: 'Tharunnagabramhagna' },
        },
        installation: { id: 181330413 },
      };
      const rawString = JSON.stringify(payload);
      const validSig = signPayload(rawString);

      vi.mocked(prisma.webhookEvent.create).mockResolvedValueOnce({ id: 'wh-evt-6' } as any);
      vi.mocked(prisma.project.findMany).mockResolvedValueOnce([
        {
          id: 'proj-live-1',
          githubRepoOwner: 'Tharunnagabramhagna',
          githubRepoName: 'DevFlow',
          githubCachedData: { pullRequests: [] },
        } as any,
      ]);

      vi.mocked(prisma.project.update).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.webhookEvent.update).mockResolvedValueOnce({} as any);

      const res = await request(app)
        .post('/api/github/app/webhooks')
        .set('Content-Type', 'application/json')
        .set('x-hub-signature-256', validSig)
        .set('x-github-event', 'pull_request')
        .set('x-github-delivery', 'delivery-pr-1')
        .send(rawString);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('PROCESSED');
      expect(res.body.updatedProjects).toBe(1);
      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: 'proj-live-1' },
        data: expect.objectContaining({
          githubSyncStatus: 'SYNCED',
          githubCachedData: expect.objectContaining({
            pullRequests: expect.arrayContaining([
              expect.objectContaining({
                number: 12,
                title: 'feat: integrate Stage 5 webhooks',
              }),
            ]),
          }),
        }),
      });
    });
  });

  describe('Unexpected & Unsupported Payloads', () => {
    it('safely ignores unhandled event types without throwing errors', async () => {
      const payload = { action: 'starred', repository: { name: 'DevFlow' } };
      const rawString = JSON.stringify(payload);
      const validSig = signPayload(rawString);

      vi.mocked(prisma.webhookEvent.create).mockResolvedValueOnce({ id: 'wh-evt-7' } as any);
      vi.mocked(prisma.webhookEvent.update).mockResolvedValueOnce({} as any);

      const res = await request(app)
        .post('/api/github/app/webhooks')
        .set('Content-Type', 'application/json')
        .set('x-hub-signature-256', validSig)
        .set('x-github-event', 'star')
        .set('x-github-delivery', 'delivery-star-1')
        .send(rawString);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('IGNORED');
      expect(res.body.eventType).toBe('star');
    });

    it('handles out-of-order push events without overwriting newer commit metadata', async () => {
      const olderPushPayload = {
        repository: { name: 'DevFlow', owner: { login: 'Tharunnagabramhagna' } },
        head_commit: {
          id: 'older-commit-sha',
          message: 'chore: older commit arriving late',
          timestamp: '2026-11-12T10:00:00Z',
          author: { name: 'Tharun', username: 'Tharunnagabramhagna' },
        },
        installation: { id: 181330413 },
      };
      const rawString = JSON.stringify(olderPushPayload);
      const validSig = signPayload(rawString);

      vi.mocked(prisma.webhookEvent.create).mockResolvedValueOnce({ id: 'wh-evt-8' } as any);
      vi.mocked(prisma.project.findMany).mockResolvedValueOnce([
        {
          id: 'proj-live-1',
          githubRepoOwner: 'Tharunnagabramhagna',
          githubRepoName: 'DevFlow',
          githubLastCommitSha: 'newer-commit-sha',
          githubLastCommitMessage: 'feat: newer commit already applied',
          githubLastCommitAt: new Date('2026-11-12T16:00:00Z'),
          githubCachedData: { commits: [] },
        } as any,
      ]);

      vi.mocked(prisma.project.update).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.webhookEvent.update).mockResolvedValueOnce({} as any);

      const res = await request(app)
        .post('/api/github/app/webhooks')
        .set('Content-Type', 'application/json')
        .set('x-hub-signature-256', validSig)
        .set('x-github-event', 'push')
        .set('x-github-delivery', 'delivery-push-late')
        .send(rawString);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('PROCESSED');
      // Must not overwrite githubLastCommitSha with older commit sha
      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: 'proj-live-1' },
        data: expect.not.objectContaining({
          githubLastCommitSha: 'older-commit-sha',
        }),
      });
    });

    it('marks webhookEvent FAILED and preserves record when handler throws an unexpected error', async () => {
      const payload = { action: 'created', installation: { id: 181330413 } };
      const rawString = JSON.stringify(payload);
      const validSig = signPayload(rawString);

      vi.mocked(prisma.webhookEvent.create).mockResolvedValueOnce({ id: 'wh-evt-err-1' } as any);
      vi.mocked(prisma.gitHubAppInstallation.findUnique).mockRejectedValueOnce(
        new Error('Database connectivity blip')
      );
      vi.mocked(prisma.webhookEvent.update).mockResolvedValueOnce({} as any);

      const res = await request(app)
        .post('/api/github/app/webhooks')
        .set('Content-Type', 'application/json')
        .set('x-hub-signature-256', validSig)
        .set('x-github-event', 'installation')
        .set('x-github-delivery', 'delivery-error-1')
        .send(rawString);

      expect(res.status).toBe(500);
      expect(prisma.webhookEvent.update).toHaveBeenCalledWith({
        where: { id: 'wh-evt-err-1' },
        data: expect.objectContaining({
          status: 'FAILED',
          errorMessage: 'Database connectivity blip',
        }),
      });
    });
  });
});

