import crypto from 'crypto';
import {
  ActivityAction,
  EvidenceType,
  GitHubInstallationStatus,
  Prisma,
  Role,
} from '@prisma/client';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { VerifiedAccountUser } from '../../middleware/auth';
import { generateSecureToken, hashToken } from '../../utils/crypto';
import { PromptSanitizer } from '../ai/promptSanitizer';
import {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
} from '../../utils/errors';
import logger from '../../utils/logger';
import { githubAppService } from './github-app.service';
import { fetchAndBuildGitHubSyncSnapshot } from './github-sync.helper';
import { githubService, GitHubRepositorySummary } from './github.service';

export const GITHUB_APP_INSTALL_STATE_COOKIE = 'devflow_github_app_state';
const INSTALL_STATE_PURPOSE = 'INSTALL_GITHUB_APP';
const INSTALL_STATE_TTL_MS = 10 * 60 * 1000;
const MAX_RECONCILE_PAGES = 50;
const VALID_GITHUB_SEGMENT = /^[A-Za-z0-9_.-]{1,100}$/;
const ALLOWED_SETUP_ACTIONS = new Set(['install', 'update']);

export interface SanitizedInstallationSummary {
  id: string;
  installationId: number;
  accountId: number;
  accountLogin: string;
  accountType: string;
  repositorySelection: string;
  status: GitHubInstallationStatus;
}

function sanitizeReturnPath(returnPath?: string | null): string {
  if (!returnPath || typeof returnPath !== 'string') {
    return '/dashboard';
  }
  const trimmed = returnPath.trim();
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.includes('://') ||
    trimmed.includes('\\') ||
    trimmed.includes('..')
  ) {
    return '/dashboard';
  }
  return trimmed;
}

function parsePositiveIntId(raw: unknown, code: string, label: string): number {
  if (typeof raw === 'number') {
    if (!Number.isSafeInteger(raw) || raw <= 0) {
      throw new BadRequestError(`${label} must be a positive integer.`, undefined, code);
    }
    return raw;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!/^[1-9]\d*$/.test(trimmed)) {
      throw new BadRequestError(`${label} must be a positive integer.`, undefined, code);
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
      throw new BadRequestError(`${label} must be a positive integer.`, undefined, code);
    }
    return parsed;
  }
  throw new BadRequestError(`${label} is required and must be a positive integer.`, undefined, code);
}

function parseRepoTarget(input: {
  repoFullName?: string;
  owner?: string;
  repo?: string;
}): { owner: string; repo: string } {
  let owner = typeof input.owner === 'string' ? input.owner.trim() : '';
  let repo = typeof input.repo === 'string' ? input.repo.trim() : '';

  if (typeof input.repoFullName === 'string' && input.repoFullName.trim()) {
    const trimmed = input.repoFullName
      .trim()
      .replace(/^https?:\/\/github\.com\//i, '')
      .replace(/\.git$/i, '')
      .replace(/^\/+|\/+$/g, '');
    const parts = trimmed.split('/');
    if (parts.length !== 2) {
      throw new BadRequestError(
        'Repository must be specified in "owner/repo" format.',
        undefined,
        'INVALID_REPOSITORY_TARGET'
      );
    }
    owner = parts[0];
    repo = parts[1];
  }

  if (
    !VALID_GITHUB_SEGMENT.test(owner) ||
    !VALID_GITHUB_SEGMENT.test(repo) ||
    owner === '.' ||
    owner === '..' ||
    repo === '.' ||
    repo === '..'
  ) {
    throw new BadRequestError(
      'Invalid GitHub repository owner or repository name.',
      undefined,
      'INVALID_REPOSITORY_TARGET'
    );
  }

  return { owner, repo };
}

function assertDeveloperOrAdmin(role: Role): void {
  if (role === Role.CLIENT) {
    throw new ForbiddenError(
      'Only Developer or Admin accounts can install or manage GitHub App repository connections.',
      undefined,
      'GITHUB_APP_FORBIDDEN_ROLE'
    );
  }
}

function assertAllowedInstallationAccount(accountId: number, accountType: string): void {
  if (!env.GITHUB_APP_ALLOWED_ACCOUNT_ID) {
    throw new AppError(
      503,
      'GITHUB_APP_NOT_CONFIGURED',
      'GITHUB_APP_ALLOWED_ACCOUNT_ID must be configured before connecting GitHub App installations.'
    );
  }

  if (String(accountId) !== env.GITHUB_APP_ALLOWED_ACCOUNT_ID) {
    throw new ForbiddenError(
      'This GitHub App installation belongs to an account outside the server allowlist.',
      { accountId },
      'GITHUB_APP_ACCOUNT_NOT_ALLOWED'
    );
  }

  // Single-personal-account mode; extend to include 'Organization' when org installations are enabled.
  if (accountType !== 'User') {
    throw new ForbiddenError(
      'Only personal User GitHub account installations are permitted in the current setup.',
      { accountType },
      'GITHUB_APP_UNSUPPORTED_ACCOUNT_TYPE'
    );
  }
}

function toInstallationSummary(record: {
  id: string;
  installationId: number;
  accountId: number;
  accountLogin: string;
  accountType: string;
  repositorySelection: string;
  status: GitHubInstallationStatus;
}): SanitizedInstallationSummary {
  return {
    id: record.id,
    installationId: record.installationId,
    accountId: record.accountId,
    accountLogin: record.accountLogin,
    accountType: record.accountType,
    repositorySelection: record.repositorySelection,
    status: record.status,
  };
}

/**
 * Handles GitHub App installation handshake, Setup URL verification, authorized repository
 * reconciliation, installation-scoped listing, and project binding without legacy OAuth fallback.
 */
export class GitHubAppInstallService {
  /**
   * Generates a single-use installation state backed by SHA-256 hash and cookie binding.
   */
  async initiateInstallation(
    user: VerifiedAccountUser,
    returnPath?: string
  ): Promise<{ installUrl: string; rawState: string }> {
    assertDeveloperOrAdmin(user.role);

    if (
      !githubAppService.isConfigured() ||
      !env.GITHUB_APP_SLUG ||
      !env.GITHUB_APP_ALLOWED_ACCOUNT_ID
    ) {
      throw new AppError(
        503,
        'GITHUB_APP_NOT_CONFIGURED',
        'GitHub App configuration (GITHUB_APP_ID, GITHUB_APP_SLUG, private key, and GITHUB_APP_ALLOWED_ACCOUNT_ID) is incomplete.'
      );
    }

    const rawState = generateSecureToken(32);
    const stateHash = hashToken(rawState);
    const safeReturnPath = sanitizeReturnPath(returnPath);
    const expiresAt = new Date(Date.now() + INSTALL_STATE_TTL_MS);

    await prisma.oAuthState.create({
      data: {
        stateHash,
        initiatingUserId: user.id,
        purpose: INSTALL_STATE_PURPOSE,
        returnPath: safeReturnPath,
        expiresAt,
      },
    });

    const installUrl = `https://github.com/apps/${encodeURIComponent(env.GITHUB_APP_SLUG)}/installations/new?state=${encodeURIComponent(rawState)}`;
    return { installUrl, rawState };
  }

  /**
   * Validates Setup URL state against the dedicated cookie and atomically consumes it once.
   */
  private async consumeSetupState(
    state?: string,
    rawCookieState?: string
  ): Promise<{ userId: string; returnPath: string }> {
    if (
      typeof state !== 'string' ||
      !state.trim() ||
      typeof rawCookieState !== 'string' ||
      !rawCookieState
    ) {
      throw new UnauthorizedError(
        'Missing GitHub App installation state or verification cookie.',
        undefined,
        'GITHUB_APP_STATE_MISMATCH'
      );
    }

    const stateBuf = Buffer.from(state, 'utf8');
    const cookieBuf = Buffer.from(rawCookieState, 'utf8');
    if (stateBuf.length !== cookieBuf.length || !crypto.timingSafeEqual(stateBuf, cookieBuf)) {
      throw new UnauthorizedError(
        'GitHub App installation state mismatch against verification cookie.',
        undefined,
        'GITHUB_APP_STATE_MISMATCH'
      );
    }

    const stateHash = hashToken(state);
    const now = new Date();
    const record = await prisma.oAuthState.findUnique({
      where: { stateHash },
    });

    if (!record || record.purpose !== INSTALL_STATE_PURPOSE || !record.initiatingUserId) {
      throw new UnauthorizedError(
        'Invalid GitHub App installation state.',
        undefined,
        'GITHUB_APP_STATE_INVALID'
      );
    }

    if (record.usedAt !== null) {
      throw new UnauthorizedError(
        'GitHub App installation state has already been used.',
        undefined,
        'GITHUB_APP_STATE_REUSED'
      );
    }

    if (record.expiresAt <= now) {
      throw new UnauthorizedError(
        'GitHub App installation state has expired.',
        undefined,
        'GITHUB_APP_STATE_EXPIRED'
      );
    }

    const consumed = await prisma.oAuthState.updateMany({
      where: {
        id: record.id,
        stateHash,
        purpose: INSTALL_STATE_PURPOSE,
        usedAt: null,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    });

    if (consumed.count !== 1) {
      throw new UnauthorizedError(
        'GitHub App installation state has already been used or expired.',
        undefined,
        'GITHUB_APP_STATE_REUSED'
      );
    }

    const initiatingUser = await prisma.user.findUnique({
      where: { id: record.initiatingUserId },
      select: { id: true, role: true },
    });

    if (!initiatingUser) {
      throw new UnauthorizedError('Initiating DevFlow user account was not found.');
    }

    assertDeveloperOrAdmin(initiatingUser.role);

    return {
      userId: initiatingUser.id,
      returnPath: sanitizeReturnPath(record.returnPath),
    };
  }

  /**
   * Verifies Setup URL callback parameters against GitHub App APIs, links installation to
   * the authenticated initiator, and reconciles authorized repositories.
   */
  async handleSetupCallback(params: {
    state?: string;
    rawCookieState?: string;
    installationId?: string;
    setupAction?: string;
  }): Promise<{
    installation: SanitizedInstallationSummary;
    reconciledRepoCount: number;
    returnPath: string;
  }> {
    const { userId, returnPath } = await this.consumeSetupState(params.state, params.rawCookieState);

    if (params.setupAction === 'request') {
      throw new BadRequestError(
        'GitHub App installation is pending organization admin approval.',
        undefined,
        'GITHUB_APP_INSTALL_PENDING_APPROVAL'
      );
    }

    if (!params.setupAction || !ALLOWED_SETUP_ACTIONS.has(params.setupAction)) {
      throw new BadRequestError(
        'Invalid or missing GitHub App setup_action parameter.',
        undefined,
        'INVALID_SETUP_ACTION'
      );
    }

    const installationId = parsePositiveIntId(
      params.installationId,
      'INVALID_INSTALLATION_ID',
      'GitHub App installation_id'
    );

    if (!env.GITHUB_APP_ID || !env.GITHUB_APP_ALLOWED_ACCOUNT_ID) {
      throw new AppError(
        503,
        'GITHUB_APP_NOT_CONFIGURED',
        'GitHub App credentials or allowlist are not configured on this server.'
      );
    }

    const metadata = await githubAppService.getInstallationMetadata(installationId);

    if (String(metadata.appId) !== env.GITHUB_APP_ID) {
      throw new ForbiddenError(
        'GitHub App installation does not match the configured GITHUB_APP_ID.',
        { actualAppId: metadata.appId },
        'GITHUB_APP_ID_MISMATCH'
      );
    }

    assertAllowedInstallationAccount(metadata.account.id, metadata.account.type);

    if (metadata.suspendedAt) {
      throw new ForbiddenError(
        'This GitHub App installation is currently suspended.',
        { installationId },
        'GITHUB_APP_SUSPENDED'
      );
    }

    const existing = await prisma.gitHubAppInstallation.findUnique({
      where: { installationId },
    });

    if (existing && existing.userId !== userId) {
      throw new ConflictError(
        'This GitHub App installation is already connected to another DevFlow account.',
        { installationId },
        'GITHUB_APP_INSTALLATION_CONFLICT'
      );
    }

    const installationRecord = await prisma.gitHubAppInstallation.upsert({
      where: { installationId },
      create: {
        installationId,
        userId,
        accountId: metadata.account.id,
        accountLogin: metadata.account.login,
        accountType: metadata.account.type,
        repositorySelection: metadata.repositorySelection,
        status: GitHubInstallationStatus.ACTIVE,
        permissionsSnapshot: metadata.permissions as Prisma.InputJsonValue,
        suspendedAt: null,
        uninstalledAt: null,
      },
      update: {
        accountId: metadata.account.id,
        accountLogin: metadata.account.login,
        accountType: metadata.account.type,
        repositorySelection: metadata.repositorySelection,
        status: GitHubInstallationStatus.ACTIVE,
        permissionsSnapshot: metadata.permissions as Prisma.InputJsonValue,
        suspendedAt: null,
        uninstalledAt: null,
      },
    });

    const reconciledRepos = await this.reconcileInstallationRepositories(
      installationRecord.id,
      installationId
    );

    logger.info('GitHub App installation verified and reconciled', {
      userId,
      installationRecordId: installationRecord.id,
      installationId,
      accountLogin: metadata.account.login,
      reconciledRepoCount: reconciledRepos.length,
    });

    return {
      installation: toInstallationSummary(installationRecord),
      reconciledRepoCount: reconciledRepos.length,
      returnPath,
    };
  }

  /**
   * Pulls the complete authorized repository list for an installation via installation tokens
   * and atomically reconciles `GitHubAuthorizedRepo`.
   */
  async reconcileInstallationRepositories(
    installationRecordId: string,
    githubInstallationId: number
  ): Promise<GitHubRepositorySummary[]> {
    const repoMap = new Map<number, GitHubRepositorySummary>();
    let page = 1;

    while (page <= MAX_RECONCILE_PAGES) {
      const result = await githubAppService.listInstallationRepositories(githubInstallationId, {
        page,
        perPage: 100,
      });

      for (const repo of result.repositories) {
        repoMap.set(repo.id, repo);
      }

      if (!result.hasMore) {
        break;
      }
      page += 1;
    }

    const repos = Array.from(repoMap.values());
    const fetchedRepoIds = repos.map((repo) => repo.id);

    await prisma.$transaction(async (tx) => {
      await tx.gitHubAuthorizedRepo.deleteMany({
        where: {
          installationRecordId,
          ...(fetchedRepoIds.length > 0 ? { githubRepoId: { notIn: fetchedRepoIds } } : {}),
        },
      });

      for (const repo of repos) {
        await tx.gitHubAuthorizedRepo.upsert({
          where: {
            installationRecordId_githubRepoId: {
              installationRecordId,
              githubRepoId: repo.id,
            },
          },
          create: {
            installationRecordId,
            githubRepoId: repo.id,
            fullName: repo.fullName,
            defaultBranch: repo.defaultBranch,
            isPrivate: repo.private,
          },
          update: {
            fullName: repo.fullName,
            defaultBranch: repo.defaultBranch,
            isPrivate: repo.private,
          },
        });
      }
    });

    return repos;
  }

  private async getActiveInstallationForUser(userId: string) {
    const active = await prisma.gitHubAppInstallation.findFirst({
      where: {
        userId,
        status: GitHubInstallationStatus.ACTIVE,
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!active) {
      const suspended = await prisma.gitHubAppInstallation.findFirst({
        where: {
          userId,
          status: GitHubInstallationStatus.SUSPENDED,
        },
        orderBy: { updatedAt: 'desc' },
      });

      if (suspended) {
        throw new ForbiddenError(
          'Your GitHub App installation is currently suspended.',
          { installationId: suspended.installationId },
          'GITHUB_APP_SUSPENDED'
        );
      }

      throw new BadRequestError(
        'No active GitHub App installation is connected for your account.',
        undefined,
        'GITHUB_APP_NOT_INSTALLED'
      );
    }

    assertAllowedInstallationAccount(active.accountId, active.accountType);
    return active;
  }

  /**
   * Lists repositories accessible to the authenticated user's own active GitHub App installation.
   */
  async listUserInstallationRepositories(
    user: VerifiedAccountUser,
    opts: { page?: number; perPage?: number; q?: string } = {}
  ) {
    assertDeveloperOrAdmin(user.role);
    const installation = await this.getActiveInstallationForUser(user.id);

    const page = Math.max(1, opts.page || 1);
    const perPage = Math.min(100, Math.max(1, opts.perPage || 50));
    const search = opts.q?.trim().toLowerCase() || '';

    const result = await githubAppService.listInstallationRepositories(installation.installationId, {
      page,
      perPage,
    });

    const filtered = search
      ? result.repositories.filter(
          (repo) =>
            repo.fullName.toLowerCase().includes(search) ||
            (repo.description || '').toLowerCase().includes(search) ||
            (repo.language || '').toLowerCase().includes(search)
        )
      : result.repositories;

    return {
      installation: toInstallationSummary(installation),
      repositories: filtered,
      totalCount: result.totalCount,
      page: result.page,
      hasMore: result.hasMore,
    };
  }

  private async findAuthorizedRepoForInstallation(
    installationRecordId: string,
    githubRepoId?: number,
    fullName?: string
  ) {
    return prisma.gitHubAuthorizedRepo.findFirst({
      where: {
        installationRecordId,
        ...(githubRepoId !== undefined ? { githubRepoId } : {}),
        ...(fullName ? { fullName: { equals: fullName, mode: 'insensitive' } } : {}),
      },
    });
  }

  /**
   * Binds an authorized repository from the authenticated user's active GitHub App installation
   * to an authorized DevFlow project, rejecting arbitrary repository IDs and cross-user access.
   */
  async connectProjectWithInstallation(
    projectId: string,
    user: VerifiedAccountUser,
    input: { githubRepoId?: number | string; repoFullName?: string; owner?: string; repo?: string }
  ) {
    assertDeveloperOrAdmin(user.role);
    await githubService.assertProjectAccess(projectId, user, true);

    const hasRepoId = input.githubRepoId !== undefined && input.githubRepoId !== null && input.githubRepoId !== '';
    const hasRepoNameInput = Boolean(
      (typeof input.repoFullName === 'string' && input.repoFullName.trim()) ||
        (typeof input.owner === 'string' && input.owner.trim()) ||
        (typeof input.repo === 'string' && input.repo.trim())
    );

    if (!hasRepoId && !hasRepoNameInput) {
      throw new BadRequestError(
        'Provide either githubRepoId or repoFullName ("owner/repo") to bind a repository.',
        undefined,
        'MISSING_REPOSITORY_SELECTION'
      );
    }

    const requestedRepoId = hasRepoId
      ? parsePositiveIntId(input.githubRepoId, 'INVALID_GITHUB_REPO_ID', 'githubRepoId')
      : undefined;
    const requestedTarget = hasRepoNameInput ? parseRepoTarget(input) : undefined;
    const requestedFullName = requestedTarget
      ? `${requestedTarget.owner}/${requestedTarget.repo}`
      : undefined;

    const installation = await this.getActiveInstallationForUser(user.id);

    let authorizedRepo = await this.findAuthorizedRepoForInstallation(
      installation.id,
      requestedRepoId,
      requestedFullName
    );

    if (!authorizedRepo) {
      await this.reconcileInstallationRepositories(installation.id, installation.installationId);
      authorizedRepo = await this.findAuthorizedRepoForInstallation(
        installation.id,
        requestedRepoId,
        requestedFullName
      );
    }

    if (!authorizedRepo) {
      throw new ForbiddenError(
        'The selected repository is not authorized under your active GitHub App installation.',
        undefined,
        'GITHUB_REPO_NOT_AUTHORIZED'
      );
    }

    const { owner, repo } = parseRepoTarget({ repoFullName: authorizedRepo.fullName });
    const liveRepo = await githubAppService.getInstallationRepository(
      installation.installationId,
      owner,
      repo
    );

    if (liveRepo.id !== authorizedRepo.githubRepoId) {
      throw new ForbiddenError(
        'Repository identity mismatch against your authorized GitHub App installation.',
        undefined,
        'GITHUB_REPO_NOT_AUTHORIZED'
      );
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        githubInstallationRecordId: installation.id,
        githubRepoOwner: liveRepo.owner,
        githubRepoName: liveRepo.name,
        githubDefaultBranch: liveRepo.defaultBranch,
        githubVisibility: liveRepo.private ? 'private' : 'public',
        githubSyncStatus: 'PENDING',
        githubSyncError: null,
      },
    });

    await prisma.activityLog.create({
      data: {
        projectId,
        userId: user.id,
        action: ActivityAction.GITHUB_REPO_CONNECTED,
        entityType: 'PROJECT',
        entityId: projectId,
        details: {
          repoFullName: liveRepo.fullName,
          githubRepoId: liveRepo.id,
          visibility: liveRepo.private ? 'private' : 'public',
          defaultBranch: liveRepo.defaultBranch,
          installationId: installation.installationId,
          authMethod: 'GITHUB_APP',
        },
      },
    });

    return {
      connected: true,
      authMethod: 'GITHUB_APP' as const,
      project: {
        id: updatedProject.id,
        githubInstallationRecordId: updatedProject.githubInstallationRecordId,
        githubRepoOwner: updatedProject.githubRepoOwner,
        githubRepoName: updatedProject.githubRepoName,
        githubDefaultBranch: updatedProject.githubDefaultBranch,
        githubVisibility: updatedProject.githubVisibility,
        githubSyncStatus: updatedProject.githubSyncStatus,
      },
      repository: liveRepo,
      installation: toInstallationSummary(installation),
    };
  }

  /**
   * Synchronizes bounded repository metadata (repo details, commits, PRs, issues, and filtered
   * changed file paths) using short-lived GitHub App installation access tokens.
   */
  async syncProjectWithInstallation(
    projectId: string,
    user: VerifiedAccountUser,
    force = false
  ) {
    assertDeveloperOrAdmin(user.role);
    const project = await githubService.assertProjectAccess(projectId, user, true);

    if (!project.githubInstallationRecordId || !project.githubRepoOwner || !project.githubRepoName) {
      throw new BadRequestError(
        'This project is not connected to a GitHub App installation repository.',
        undefined,
        'GITHUB_APP_PROJECT_NOT_CONNECTED'
      );
    }

    const installation = await this.getActiveInstallationForUser(user.id);
    if (project.githubInstallationRecordId !== installation.id) {
      throw new ForbiddenError(
        'Project is connected to a different GitHub App installation that you do not own.',
        undefined,
        'GITHUB_APP_INSTALLATION_MISMATCH'
      );
    }

    const repoFullName = `${project.githubRepoOwner}/${project.githubRepoName}`;
    let authorizedRepo = await this.findAuthorizedRepoForInstallation(
      installation.id,
      undefined,
      repoFullName
    );

    if (!authorizedRepo) {
      await this.reconcileInstallationRepositories(installation.id, installation.installationId);
      authorizedRepo = await this.findAuthorizedRepoForInstallation(
        installation.id,
        undefined,
        repoFullName
      );
    }

    if (!authorizedRepo) {
      const msg =
        'The connected repository is no longer authorized under your active GitHub App installation.';
      await prisma.project.update({
        where: { id: project.id },
        data: { githubSyncStatus: 'FAILED', githubSyncError: msg },
      });
      throw new ForbiddenError(msg, undefined, 'GITHUB_REPO_NOT_AUTHORIZED');
    }

    if (
      !force &&
      project.githubSyncedAt &&
      project.githubSyncStatus === 'SYNCED' &&
      Date.now() - project.githubSyncedAt.getTime() < 30_000
    ) {
      const cachedEvidences = await this.loadProjectGitHubEvidences(project.id);
      return {
        ...githubService.formatProjectActivityResponse(project, cachedEvidences),
        authMethod: 'GITHUB_APP' as const,
        installationId: installation.installationId,
      };
    }

    try {
      const snapshot = await fetchAndBuildGitHubSyncSnapshot(
        project.githubRepoOwner,
        project.githubRepoName,
        (url, opts) =>
          githubAppService.fetchJsonWithInstallationToken(installation.installationId, url, opts)
      );

      if (snapshot.repoMetadata.id !== authorizedRepo.githubRepoId) {
        throw new ForbiddenError(
          'Repository identity mismatch against your authorized GitHub App installation.',
          undefined,
          'GITHUB_REPO_NOT_AUTHORIZED'
        );
      }

      const syncedAt = new Date();
      const updated = await prisma.project.update({
        where: { id: project.id },
        data: {
          githubDefaultBranch: snapshot.repoMetadata.default_branch,
          githubVisibility: snapshot.repoMetadata.private ? 'private' : 'public',
          githubSyncedAt: syncedAt,
          githubSyncStatus: 'SYNCED',
          githubSyncError: null,
          githubLastCommitSha: snapshot.latestCommit?.sha ?? null,
          githubLastCommitMessage: snapshot.latestCommit?.message ?? null,
          githubLastCommitAt: snapshot.latestCommit?.date ?? null,
          githubCachedData: snapshot.cachedData as unknown as Prisma.InputJsonValue,
        },
      });

      await prisma.activityLog.create({
        data: {
          projectId: project.id,
          userId: user.id,
          action: ActivityAction.GITHUB_REPO_SYNCED,
          entityType: 'PROJECT',
          entityId: project.id,
          details: {
            repoFullName,
            authMethod: 'GITHUB_APP',
            installationId: installation.installationId,
            commitsCount: snapshot.commits.length,
            pullRequestsCount: snapshot.pullRequests.length,
            issuesCount: snapshot.issues.length,
            latestCommitSha: snapshot.latestCommit?.sha ?? null,
          },
        },
      });

      const evidences = await this.loadProjectGitHubEvidences(project.id);
      return {
        ...githubService.formatProjectActivityResponse(updated, evidences),
        authMethod: 'GITHUB_APP' as const,
        installationId: installation.installationId,
      };
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : 'GitHub App repository sync failed.';
      const safeMessage = PromptSanitizer.scrubSecrets(rawMessage).slice(0, 500);
      const nextStatus =
        err instanceof UnauthorizedError ||
        (err instanceof AppError &&
          (err.code === 'GITHUB_APP_SUSPENDED' || err.code === 'GITHUB_APP_REAUTH_REQUIRED'))
          ? 'REAUTH_REQUIRED'
          : 'FAILED';

      await prisma.project.update({
        where: { id: project.id },
        data: {
          githubSyncStatus: nextStatus,
          githubSyncError: safeMessage,
        },
      });

      if (err instanceof AppError) {
        throw err;
      }
      throw new AppError(502, 'GITHUB_SYNC_FAILED', safeMessage);
    }
  }

  /**
   * Returns project-level GitHub App sync status and linked repository summary.
   */
  async getProjectAppSyncStatus(projectId: string, user: VerifiedAccountUser) {
    const project = await githubService.assertProjectAccess(projectId, user, false);
    const repoLinked = Boolean(project.githubRepoOwner && project.githubRepoName);

    return {
      projectId: project.id,
      projectTitle: project.title,
      repoLinked,
      installationLinked: Boolean(project.githubInstallationRecordId),
      authMethod: project.githubInstallationRecordId ? ('GITHUB_APP' as const) : ('OAUTH' as const),
      syncStatus: repoLinked ? project.githubSyncStatus || 'PENDING' : 'NOT_CONNECTED',
      syncError: project.githubSyncError,
      lastSyncedAt: project.githubSyncedAt?.toISOString() ?? null,
      repository: repoLinked
        ? {
            owner: project.githubRepoOwner,
            name: project.githubRepoName,
            fullName: `${project.githubRepoOwner}/${project.githubRepoName}`,
            defaultBranch: project.githubDefaultBranch,
            visibility: project.githubVisibility,
          }
        : null,
      lastCommit: project.githubLastCommitSha
        ? {
            sha: project.githubLastCommitSha,
            shortSha: project.githubLastCommitSha.slice(0, 7),
            message: project.githubLastCommitMessage,
            at: project.githubLastCommitAt?.toISOString() ?? null,
          }
        : null,
    };
  }

  private async loadProjectGitHubEvidences(projectId: string) {
    if (!prisma.evidence?.findMany) {
      return [];
    }
    return prisma.evidence.findMany({
      where: {
        isDeleted: false,
        milestone: { projectId },
        type: { in: [EvidenceType.GITHUB_COMMIT, EvidenceType.GITHUB_PR] },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        uploadedBy: { select: { name: true, avatarUrl: true } },
        milestone: { select: { id: true, title: true } },
      },
    });
  }
}

export const githubAppInstallService = new GitHubAppInstallService();

