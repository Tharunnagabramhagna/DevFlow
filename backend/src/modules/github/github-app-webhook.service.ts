import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../config/database';
import {
  AppError,
  BadRequestError,
  ForbiddenError,
  UnauthorizedError,
} from '../../utils/errors';
import logger from '../../utils/logger';
import { githubAppService } from './github-app.service';
import { githubAppInstallService } from './github-app-install.service';
import type { GitHubCommitItem, GitHubPullRequestItem, GitHubRepoCachedData } from './github.service';

export interface GitHubAppWebhookParams {
  rawBody?: Buffer;
  signatureHeader?: string;
  eventType?: string;
  deliveryId?: string;
  payload: Record<string, unknown>;
}

export interface GitHubAppWebhookResult {
  duplicate: boolean;
  eventId: string;
  status: 'PROCESSED' | 'ALREADY_PROCESSED' | 'IGNORED' | 'SUSPENDED' | 'UNINSTALLED' | 'RECONCILED';
  eventType: string;
  action?: string;
  installationId?: number;
  reconciledRepoCount?: number;
  updatedProjects?: number;
  detachedProjects?: number;
}

/**
 * Service for securely receiving, verifying, and dispatching GitHub App webhook events.
 */
export class GitHubAppWebhookService {
  /**
   * Resolves the configured GitHub App webhook secret from environment variables.
   * Prioritizes GITHUB_APP_WEBHOOK_SECRET, falling back to GITHUB_WEBHOOK_SECRET.
   */
  getWebhookSecret(): string | undefined {
    return env.GITHUB_APP_WEBHOOK_SECRET || env.GITHUB_WEBHOOK_SECRET || undefined;
  }

  isConfigured(): boolean {
    return Boolean(this.getWebhookSecret());
  }

  /**
   * Verifies the X-Hub-Signature-256 HMAC-SHA256 signature against raw request bytes.
   */
  verifySignature(rawBody: Buffer | undefined, signatureHeader: string | undefined): void {
    const secret = this.getWebhookSecret();
    if (!secret) {
      throw new AppError(
        503,
        'GITHUB_APP_WEBHOOK_NOT_CONFIGURED',
        'GitHub App webhook secret (GITHUB_APP_WEBHOOK_SECRET or GITHUB_WEBHOOK_SECRET) is not configured.'
      );
    }

    if (!rawBody || !Buffer.isBuffer(rawBody) || rawBody.length === 0) {
      throw new BadRequestError(
        'Missing raw request body for GitHub App webhook signature verification.',
        undefined,
        'MISSING_WEBHOOK_BODY'
      );
    }

    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
      throw new UnauthorizedError(
        'Missing or malformed X-Hub-Signature-256 header.',
        undefined,
        'INVALID_WEBHOOK_SIGNATURE'
      );
    }

    const expectedSig = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const providedBuf = Buffer.from(signatureHeader, 'utf8');
    const expectedBuf = Buffer.from(expectedSig, 'utf8');

    if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
      throw new UnauthorizedError(
        'Invalid GitHub App webhook signature.',
        undefined,
        'INVALID_WEBHOOK_SIGNATURE'
      );
    }
  }

  /**
   * Dispatches and processes an authenticated GitHub App webhook event.
   */
  async handleWebhook(params: GitHubAppWebhookParams): Promise<GitHubAppWebhookResult> {
    // 1. Verify cryptographic signature first — rejects forgeries before DB access
    this.verifySignature(params.rawBody, params.signatureHeader);

    const eventType = (params.eventType || 'unknown').trim();
    const eventId =
      params.deliveryId?.trim() ||
      (params.rawBody
        ? crypto.createHash('sha256').update(params.rawBody).digest('hex')
        : crypto.randomUUID());

    const payload = params.payload || {};
    const action = typeof payload.action === 'string' ? payload.action.trim() : undefined;
    const rawInstallation = payload.installation as
      | { id?: number; account?: { id?: number; login?: string; type?: string } }
      | undefined;
    const installationId = typeof rawInstallation?.id === 'number' ? rawInstallation.id : undefined;

    // 2. Idempotent delivery tracking using unique (provider, eventId)
    let webhookEventId: string;
    try {
      const created = await prisma.webhookEvent.create({
        data: {
          provider: 'GITHUB_APP',
          eventId,
          eventType,
          resourceId: installationId ? String(installationId) : null,
          summary: `GitHub App ${eventType}${action ? `.${action}` : ''} event`,
          payload: payload as unknown as Prisma.InputJsonValue,
          status: 'RECEIVED',
        },
      });
      webhookEventId = created.id;
    } catch (err) {
      const isP2002 =
        (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') ||
        (err && typeof err === 'object' && (err as { code?: string }).code === 'P2002');

      if (isP2002) {
        logger.info('Duplicate GitHub App webhook event ignored', { eventId, eventType });
        return {
          duplicate: true,
          eventId,
          status: 'ALREADY_PROCESSED',
          eventType,
          action,
          installationId,
        };
      }
      throw err;
    }

    try {
      let result: GitHubAppWebhookResult;

      switch (eventType) {
        case 'installation':
          result = await this.handleInstallationEvent(eventId, action, payload, installationId);
          break;

        case 'installation_repositories':
          result = await this.handleInstallationRepositoriesEvent(eventId, action, payload, installationId);
          break;

        case 'installation_target':
          result = await this.handleInstallationTargetEvent(eventId, action, payload, installationId);
          break;

        case 'push':
          result = await this.handlePushEvent(eventId, payload, installationId);
          break;

        case 'pull_request':
          result = await this.handlePullRequestEvent(eventId, action, payload, installationId);
          break;

        case 'pull_request_review':
        case 'pull_request_review_comment':
          result = await this.handleReviewEvent(eventId, eventType, action, payload, installationId);
          break;

        default:
          result = {
            duplicate: false,
            eventId,
            status: 'IGNORED',
            eventType,
            action,
            installationId,
          };
      }

      await prisma.webhookEvent.update({
        where: { id: webhookEventId },
        data: {
          status: result.status,
          processedAt: new Date(),
        },
      });

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Webhook processing failed';
      logger.error('GitHub App webhook processing error', { eventId, eventType, action, error: errorMsg });

      await prisma.webhookEvent.update({
        where: { id: webhookEventId },
        data: {
          status: 'FAILED',
          errorMessage: errorMsg,
          processedAt: new Date(),
        },
      });

      throw err;
    }
  }

  /**
   * Handles installation life-cycle events: created, deleted, suspend, unsuspend, new_permissions_accepted.
   */
  private async handleInstallationEvent(
    eventId: string,
    action: string | undefined,
    payload: Record<string, unknown>,
    installationId: number | undefined
  ): Promise<GitHubAppWebhookResult> {
    if (!installationId) {
      return { duplicate: false, eventId, status: 'IGNORED', eventType: 'installation', action };
    }

    const installation = await prisma.gitHubAppInstallation.findUnique({
      where: { installationId },
    });

    if (!installation) {
      logger.info('Received installation event for untracked installation ID', { installationId, action });
      return { duplicate: false, eventId, status: 'IGNORED', eventType: 'installation', action, installationId };
    }

    const now = new Date();

    if (action === 'suspend') {
      githubAppService.invalidateInstallationToken(installationId);
      await prisma.gitHubAppInstallation.update({
        where: { id: installation.id },
        data: {
          status: 'SUSPENDED',
          suspendedAt: now,
        },
      });

      return {
        duplicate: false,
        eventId,
        status: 'SUSPENDED',
        eventType: 'installation',
        action,
        installationId,
      };
    }

    if (action === 'unsuspend') {
      githubAppService.invalidateInstallationToken(installationId);
      await prisma.gitHubAppInstallation.update({
        where: { id: installation.id },
        data: {
          status: 'ACTIVE',
          suspendedAt: null,
        },
      });

      const repos = await githubAppInstallService.reconcileInstallationRepositories(
        installation.id,
        installationId
      );

      return {
        duplicate: false,
        eventId,
        status: 'RECONCILED',
        eventType: 'installation',
        action,
        installationId,
        reconciledRepoCount: repos.length,
      };
    }

    if (action === 'deleted') {
      githubAppService.invalidateInstallationToken(installationId);

      // Detach all bound projects safely while preserving their historical sync/evidence data
      const detachedResult = await prisma.project.updateMany({
        where: { githubInstallationRecordId: installation.id },
        data: {
          githubInstallationRecordId: null,
          githubSyncStatus: 'FAILED',
          githubSyncError: 'GitHub App installation was uninstalled by account owner.',
        },
      });

      await prisma.gitHubAppInstallation.update({
        where: { id: installation.id },
        data: {
          status: 'UNINSTALLED',
          uninstalledAt: now,
        },
      });

      return {
        duplicate: false,
        eventId,
        status: 'UNINSTALLED',
        eventType: 'installation',
        action,
        installationId,
        detachedProjects: detachedResult.count,
      };
    }

    if (action === 'created' || action === 'new_permissions_accepted') {
      const repos = await githubAppInstallService.reconcileInstallationRepositories(
        installation.id,
        installationId
      );

      return {
        duplicate: false,
        eventId,
        status: 'RECONCILED',
        eventType: 'installation',
        action,
        installationId,
        reconciledRepoCount: repos.length,
      };
    }

    return { duplicate: false, eventId, status: 'PROCESSED', eventType: 'installation', action, installationId };
  }

  /**
   * Handles installation_repositories events: added, removed.
   * Authoritatively reconciles against GitHub App API rather than trusting payload diff alone.
   */
  private async handleInstallationRepositoriesEvent(
    eventId: string,
    action: string | undefined,
    payload: Record<string, unknown>,
    installationId: number | undefined
  ): Promise<GitHubAppWebhookResult> {
    if (!installationId) {
      return { duplicate: false, eventId, status: 'IGNORED', eventType: 'installation_repositories', action };
    }

    const installation = await prisma.gitHubAppInstallation.findUnique({
      where: { installationId },
    });

    if (!installation) {
      return {
        duplicate: false,
        eventId,
        status: 'IGNORED',
        eventType: 'installation_repositories',
        action,
        installationId,
      };
    }

    // Authoritative reconciliation: query GitHub API directly to ensure complete state
    const reconciledRepos = await githubAppInstallService.reconcileInstallationRepositories(
      installation.id,
      installationId
    );

    const authorizedRepoIds = new Set(reconciledRepos.map((r) => r.id));

    // If projects were connected to repos no longer in the authorized set, detach them safely
    const projects = await prisma.project.findMany({
      where: {
        githubInstallationRecordId: installation.id,
        isArchived: false,
      },
    });

    let detachedCount = 0;
    for (const proj of projects) {
      const match = reconciledRepos.some(
        (r) =>
          r.fullName.toLowerCase() ===
          `${proj.githubRepoOwner || ''}/${proj.githubRepoName || ''}`.toLowerCase()
      );

      if (!match) {
        await prisma.project.update({
          where: { id: proj.id },
          data: {
            githubInstallationRecordId: null,
            githubSyncStatus: 'FAILED',
            githubSyncError: 'Repository is no longer authorized under the connected GitHub App installation.',
          },
        });
        detachedCount++;
      }
    }

    return {
      duplicate: false,
      eventId,
      status: 'RECONCILED',
      eventType: 'installation_repositories',
      action,
      installationId,
      reconciledRepoCount: reconciledRepos.length,
      detachedProjects: detachedCount,
    };
  }

  /**
   * Handles installation_target events (e.g. renamed account).
   */
  private async handleInstallationTargetEvent(
    eventId: string,
    action: string | undefined,
    payload: Record<string, unknown>,
    installationId: number | undefined
  ): Promise<GitHubAppWebhookResult> {
    if (!installationId) {
      return { duplicate: false, eventId, status: 'IGNORED', eventType: 'installation_target', action };
    }

    const installation = await prisma.gitHubAppInstallation.findUnique({
      where: { installationId },
    });

    if (!installation) {
      return { duplicate: false, eventId, status: 'IGNORED', eventType: 'installation_target', action, installationId };
    }

    const account = payload.account as { login?: string; type?: string } | undefined;
    if (account?.login) {
      await prisma.gitHubAppInstallation.update({
        where: { id: installation.id },
        data: {
          accountLogin: account.login,
          accountType: account.type || installation.accountType,
        },
      });
    }

    const repos = await githubAppInstallService.reconcileInstallationRepositories(
      installation.id,
      installationId
    );

    return {
      duplicate: false,
      eventId,
      status: 'RECONCILED',
      eventType: 'installation_target',
      action,
      installationId,
      reconciledRepoCount: repos.length,
    };
  }

  /**
   * Handles push events by updating projects linked via GitHub App installation.
   */
  private async handlePushEvent(
    eventId: string,
    payload: Record<string, unknown>,
    installationId: number | undefined
  ): Promise<GitHubAppWebhookResult> {
    const repoPayload = payload.repository as
      | { id?: number; full_name?: string; name?: string; owner?: { login?: string; name?: string } }
      | undefined;

    const repoOwner = repoPayload?.owner?.login || repoPayload?.owner?.name || null;
    const repoName = repoPayload?.name || null;
    const repoId = repoPayload?.id;

    if (!repoOwner || !repoName) {
      return { duplicate: false, eventId, status: 'IGNORED', eventType: 'push', installationId };
    }

    const projects = await prisma.project.findMany({
      where: {
        isArchived: false,
        githubRepoOwner: { equals: repoOwner, mode: 'insensitive' },
        githubRepoName: { equals: repoName, mode: 'insensitive' },
      },
    });

    if (projects.length === 0) {
      return { duplicate: false, eventId, status: 'IGNORED', eventType: 'push', installationId, updatedProjects: 0 };
    }

    const now = new Date();
    const headCommit = payload.head_commit as
      | { id?: string; message?: string; timestamp?: string; url?: string; author?: { name?: string; username?: string } }
      | undefined;

    let updatedCount = 0;
    for (const proj of projects) {
      const existingCached = ((proj.githubCachedData || {}) as GitHubRepoCachedData) || {};
      const nextCommits = Array.isArray(existingCached.commits) ? [...existingCached.commits] : [];

      if (headCommit?.id) {
        const pushCommit: GitHubCommitItem = {
          sha: headCommit.id,
          shortSha: headCommit.id.slice(0, 7),
          message: (headCommit.message || 'Push commit').split('\n')[0],
          author: headCommit.author?.name || headCommit.author?.username || 'GitHub User',
          authorLogin: headCommit.author?.username || null,
          authorAvatar: null,
          date: headCommit.timestamp || now.toISOString(),
          url: headCommit.url || `https://github.com/${repoOwner}/${repoName}/commit/${headCommit.id}`,
        };

        const commitDate = headCommit.timestamp ? new Date(headCommit.timestamp) : now;
        const isNewerCommit = !proj.githubLastCommitAt || commitDate >= proj.githubLastCommitAt;

        const deduped = [pushCommit, ...nextCommits.filter((c) => c.sha !== pushCommit.sha)]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 10);

        await prisma.project.update({
          where: { id: proj.id },
          data: {
            ...(isNewerCommit
              ? {
                  githubLastCommitSha: headCommit.id,
                  githubLastCommitMessage: pushCommit.message,
                  githubLastCommitAt: commitDate,
                }
              : {}),
            githubSyncedAt: now,
            githubSyncStatus: 'SYNCED',
            githubSyncError: null,
            githubCachedData: {
              ...existingCached,
              pushedAt: isNewerCommit ? now.toISOString() : existingCached.pushedAt,
              commits: deduped,
            } as unknown as Prisma.InputJsonValue,
          },
        });
        updatedCount++;
      }
    }

    return {
      duplicate: false,
      eventId,
      status: 'PROCESSED',
      eventType: 'push',
      installationId,
      updatedProjects: updatedCount,
    };
  }

  /**
   * Handles pull_request events by updating projects linked via GitHub App installation.
   */
  private async handlePullRequestEvent(
    eventId: string,
    action: string | undefined,
    payload: Record<string, unknown>,
    installationId: number | undefined
  ): Promise<GitHubAppWebhookResult> {
    const repoPayload = payload.repository as
      | { id?: number; full_name?: string; name?: string; owner?: { login?: string; name?: string } }
      | undefined;

    const repoOwner = repoPayload?.owner?.login || repoPayload?.owner?.name || null;
    const repoName = repoPayload?.name || null;

    if (!repoOwner || !repoName) {
      return { duplicate: false, eventId, status: 'IGNORED', eventType: 'pull_request', action, installationId };
    }

    const projects = await prisma.project.findMany({
      where: {
        isArchived: false,
        githubRepoOwner: { equals: repoOwner, mode: 'insensitive' },
        githubRepoName: { equals: repoName, mode: 'insensitive' },
      },
    });

    if (projects.length === 0) {
      return {
        duplicate: false,
        eventId,
        status: 'IGNORED',
        eventType: 'pull_request',
        action,
        installationId,
        updatedProjects: 0,
      };
    }

    const pr = payload.pull_request as
      | {
          id?: number;
          number?: number;
          title?: string;
          state?: 'open' | 'closed';
          merged?: boolean;
          merged_at?: string | null;
          html_url?: string;
          created_at?: string;
          updated_at?: string;
          user?: { login?: string; avatar_url?: string } | null;
          head?: { ref?: string } | null;
          base?: { ref?: string } | null;
        }
      | undefined;

    if (!pr?.number || !pr.title) {
      return {
        duplicate: false,
        eventId,
        status: 'IGNORED',
        eventType: 'pull_request',
        action,
        installationId,
        updatedProjects: 0,
      };
    }

    const now = new Date();
    const item: GitHubPullRequestItem = {
      id: pr.id ?? pr.number,
      number: pr.number,
      title: pr.title,
      state: pr.merged ? 'merged' : pr.state || 'open',
      author: pr.user?.login || 'GitHub User',
      authorAvatar: pr.user?.avatar_url || null,
      url: pr.html_url || `https://github.com/${repoOwner}/${repoName}/pull/${pr.number}`,
      createdAt: pr.created_at || now.toISOString(),
      updatedAt: pr.updated_at || now.toISOString(),
      mergedAt: pr.merged_at || null,
      headBranch: pr.head?.ref || null,
      baseBranch: pr.base?.ref || null,
    };

    let updatedCount = 0;
    for (const proj of projects) {
      const existingCached = ((proj.githubCachedData || {}) as GitHubRepoCachedData) || {};
      const nextPrs = Array.isArray(existingCached.pullRequests) ? [...existingCached.pullRequests] : [];
      const dedupedPrs = [item, ...nextPrs.filter((p) => p.number !== item.number)]
        .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
        .slice(0, 10);

      await prisma.project.update({
        where: { id: proj.id },
        data: {
          githubSyncedAt: now,
          githubSyncStatus: 'SYNCED',
          githubSyncError: null,
          githubCachedData: {
            ...existingCached,
            pullRequests: dedupedPrs,
          } as unknown as Prisma.InputJsonValue,
        },
      });
      updatedCount++;
    }

    return {
      duplicate: false,
      eventId,
      status: 'PROCESSED',
      eventType: 'pull_request',
      action,
      installationId,
      updatedProjects: updatedCount,
    };
  }

  /**
   * Handles pull_request_review and pull_request_review_comment events.
   */
  private async handleReviewEvent(
    eventId: string,
    eventType: string,
    action: string | undefined,
    payload: Record<string, unknown>,
    installationId: number | undefined
  ): Promise<GitHubAppWebhookResult> {
    const repoPayload = payload.repository as
      | { full_name?: string; name?: string; owner?: { login?: string } }
      | undefined;

    return {
      duplicate: false,
      eventId,
      status: 'PROCESSED',
      eventType,
      action,
      installationId,
    };
  }
}

export const githubAppWebhookService = new GitHubAppWebhookService();

