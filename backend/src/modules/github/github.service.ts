import crypto from 'crypto';
import { ActivityAction, EvidenceType, Prisma, ProjectMemberRole, Role } from '@prisma/client';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { decryptSecret } from '../../utils/crypto';
import {
  AppError,
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../utils/errors';
import { VerifiedAccountUser } from '../../middleware/auth';
import logger from '../../utils/logger';

export interface GitHubConnectionStatus {
  oauthConfigured: boolean;
  webhookConfigured: boolean;
  connected: boolean;
  reauthRequired: boolean;
  username: string | null;
  githubId: string | null;
  avatarUrl: string | null;
  connectedAt: string | null;
  scopes: string[];
  hasRepoScope: boolean;
  githubApiReachable: boolean;
  message?: string;
}

export interface GitHubRepositorySummary {
  id: number;
  owner: string;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  htmlUrl: string;
  description: string | null;
  language: string | null;
  updatedAt: string | null;
  pushedAt: string | null;
}

export interface GitHubCommitItem {
  sha: string;
  shortSha: string;
  message: string;
  author: string;
  authorLogin: string | null;
  authorAvatar: string | null;
  date: string;
  url: string;
  filesChanged?: number | null;
  additions?: number | null;
  deletions?: number | null;
}

export interface GitHubPullRequestItem {
  id: number | string;
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  author: string;
  authorAvatar: string | null;
  url: string;
  createdAt: string;
  updatedAt: string | null;
  mergedAt: string | null;
  headBranch: string | null;
  baseBranch: string | null;
}

export interface GitHubIssueItem {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  author: string;
  url: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface GitHubRepoCachedData {
  repoUrl?: string;
  description?: string | null;
  language?: string | null;
  openIssuesCount?: number;
  pushedAt?: string | null;
  commits?: GitHubCommitItem[];
  pullRequests?: GitHubPullRequestItem[];
  issues?: GitHubIssueItem[];
  latestCommitFiles?: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
  }>;
}

const VALID_GITHUB_SEGMENT = /^[A-Za-z0-9_.-]{1,100}$/;

function githubHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'DevFlow-Backend',
  };
}

function parseRepoTarget(input: { repoFullName?: string; owner?: string; repo?: string }): {
  owner: string;
  repo: string;
} {
  let owner = input.owner?.trim() || '';
  let repo = input.repo?.trim() || '';

  if (input.repoFullName && input.repoFullName.trim()) {
    const trimmed = input.repoFullName
      .trim()
      .replace(/^https?:\/\/github\.com\//i, '')
      .replace(/\.git$/i, '')
      .replace(/^\/+|\/+$/g, '');
    const parts = trimmed.split('/');
    if (parts.length !== 2) {
      throw new BadRequestError('Repository must be specified in "owner/repo" format.');
    }
    owner = parts[0];
    repo = parts[1];
  }

  if (!VALID_GITHUB_SEGMENT.test(owner) || !VALID_GITHUB_SEGMENT.test(repo)) {
    throw new BadRequestError('Invalid GitHub repository owner or repository name.');
  }

  return { owner, repo };
}

export class GitHubService {
  private async fetchGitHubJson<T>(
    url: string,
    token: string
  ): Promise<{ ok: boolean; status: number; data: T | null; scopes: string[]; rateLimited: boolean }> {
    const response = await fetch(url, {
      headers: githubHeaders(token),
      signal: AbortSignal.timeout(10000),
    });

    const rawScopes = response.headers.get('x-oauth-scopes') || '';
    const scopes = rawScopes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const remaining = response.headers.get('x-ratelimit-remaining');
    const rateLimited = response.status === 403 && remaining === '0';

    if (!response.ok) {
      return { ok: false, status: response.status, data: null, scopes, rateLimited };
    }

    const data = (await response.json()) as T;
    return { ok: true, status: response.status, data, scopes, rateLimited };
  }

  private async getUserDecryptedToken(userId: string): Promise<{
    token: string;
    username: string | null;
    githubId: string | null;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, githubId: true, githubAccessToken: true, githubUsername: true },
    });

    if (!user?.githubId || !user?.githubAccessToken) {
      throw new BadRequestError(
        'GitHub account is not connected. Connect your GitHub account first.',
        undefined,
        'GITHUB_NOT_CONNECTED'
      );
    }

    try {
      const token = decryptSecret(user.githubAccessToken);
      return { token, username: user.githubUsername, githubId: user.githubId };
    } catch {
      throw new UnauthorizedError(
        'Stored GitHub credentials could not be decrypted. Please reconnect GitHub.',
        undefined,
        'GITHUB_REAUTH_REQUIRED'
      );
    }
  }

  async getStatus(userId: string): Promise<GitHubConnectionStatus> {
    const oauthConfigured = Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
    const webhookConfigured = Boolean(env.GITHUB_WEBHOOK_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        githubId: true,
        githubAccessToken: true,
        githubUsername: true,
        githubConnectedAt: true,
        avatarUrl: true,
      },
    });

    if (!user?.githubId || !user?.githubAccessToken) {
      return {
        oauthConfigured,
        webhookConfigured,
        connected: false,
        reauthRequired: false,
        username: user?.githubUsername ?? null,
        githubId: user?.githubId ?? null,
        avatarUrl: null,
        connectedAt: null,
        scopes: [],
        hasRepoScope: false,
        githubApiReachable: true,
        message: oauthConfigured
          ? 'No GitHub account is connected yet.'
          : 'GitHub OAuth is not configured on this server (GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET missing).',
      };
    }

    let token: string;
    try {
      token = decryptSecret(user.githubAccessToken);
    } catch {
      return {
        oauthConfigured,
        webhookConfigured,
        connected: false,
        reauthRequired: true,
        username: user.githubUsername ?? null,
        githubId: user.githubId,
        avatarUrl: null,
        connectedAt: user.githubConnectedAt?.toISOString() ?? null,
        scopes: [],
        hasRepoScope: false,
        githubApiReachable: true,
        message: 'GitHub credentials expired or invalid. Please reconnect GitHub.',
      };
    }

    try {
      const result = await this.fetchGitHubJson<{
        id: number;
        login: string;
        avatar_url: string | null;
      }>('https://api.github.com/user', token);

      if (result.status === 401) {
        return {
          oauthConfigured,
          webhookConfigured,
          connected: false,
          reauthRequired: true,
          username: user.githubUsername ?? null,
          githubId: user.githubId,
          avatarUrl: null,
          connectedAt: user.githubConnectedAt?.toISOString() ?? null,
          scopes: [],
          hasRepoScope: false,
          githubApiReachable: true,
          message: 'GitHub access token was revoked or expired. Please reconnect your GitHub account.',
        };
      }

      if (!result.ok || !result.data) {
        return {
          oauthConfigured,
          webhookConfigured,
          connected: true,
          reauthRequired: false,
          username: user.githubUsername ?? null,
          githubId: user.githubId,
          avatarUrl: user.avatarUrl ?? null,
          connectedAt: user.githubConnectedAt?.toISOString() ?? null,
          scopes: result.scopes,
          hasRepoScope: result.scopes.includes('repo') || result.scopes.includes('public_repo'),
          githubApiReachable: false,
          message: result.rateLimited
            ? 'GitHub API rate limit temporarily exceeded.'
            : 'GitHub is linked, but live verification with GitHub API is temporarily unavailable.',
        };
      }

      const liveLogin = result.data.login;
      if (liveLogin && liveLogin !== user.githubUsername) {
        await prisma.user.update({
          where: { id: user.id },
          data: { githubUsername: liveLogin },
        });
      }

      const hasRepoScope =
        result.scopes.includes('repo') || result.scopes.includes('public_repo');

      return {
        oauthConfigured,
        webhookConfigured,
        connected: true,
        reauthRequired: false,
        username: liveLogin || user.githubUsername || null,
        githubId: user.githubId,
        avatarUrl: result.data.avatar_url || user.avatarUrl || null,
        connectedAt: user.githubConnectedAt?.toISOString() ?? null,
        scopes: result.scopes,
        hasRepoScope,
        githubApiReachable: true,
        ...(hasRepoScope
          ? {}
          : {
              message:
                'GitHub is connected with read-only profile scopes. Reconnect with repository access to browse private repositories.',
            }),
      };
    } catch (err) {
      logger.warn('Live GitHub status probe failed', {
        userId,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      return {
        oauthConfigured,
        webhookConfigured,
        connected: true,
        reauthRequired: false,
        username: user.githubUsername ?? null,
        githubId: user.githubId,
        avatarUrl: user.avatarUrl ?? null,
        connectedAt: user.githubConnectedAt?.toISOString() ?? null,
        scopes: [],
        hasRepoScope: false,
        githubApiReachable: false,
        message: 'Unable to reach GitHub API right now; showing saved connection status.',
      };
    }
  }

  async disconnect(userId: string): Promise<{ connected: false }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        githubAccessToken: null,
        githubUsername: null,
        githubConnectedAt: null,
        // Keep githubId when user has no passwordHash so GitHub sign-in recovery still works
        ...(user.passwordHash ? { githubId: null } : {}),
      },
    });

    return { connected: false };
  }

  async listRepositories(
    userId: string,
    opts: { page?: number; perPage?: number; q?: string } = {}
  ): Promise<{ repositories: GitHubRepositorySummary[]; page: number; hasMore: boolean }> {
    const { token } = await this.getUserDecryptedToken(userId);
    const page = Math.max(1, opts.page || 1);
    const perPage = Math.min(100, Math.max(1, opts.perPage || 50));
    const search = opts.q?.trim().toLowerCase() || '';

    const url = `https://api.github.com/user/repos?sort=updated&direction=desc&affiliation=owner,collaborator,organization_member&per_page=${perPage}&page=${page}`;
    const res = await this.fetchGitHubJson<
      Array<{
        id: number;
        name: string;
        full_name: string;
        private: boolean;
        default_branch: string;
        html_url: string;
        description: string | null;
        language: string | null;
        updated_at: string | null;
        pushed_at: string | null;
        owner: { login: string };
      }>
    >(url, token);

    if (res.status === 401) {
      throw new UnauthorizedError(
        'GitHub authorization expired or was revoked. Please reconnect GitHub.',
        undefined,
        'GITHUB_REAUTH_REQUIRED'
      );
    }

    if (res.rateLimited) {
      throw new AppError(429, 'GITHUB_RATE_LIMITED', 'GitHub API rate limit exceeded. Please try again later.');
    }

    if (!res.ok || !res.data) {
      throw new AppError(502, 'GITHUB_API_ERROR', 'Failed to fetch repositories from GitHub.');
    }

    const normalized: GitHubRepositorySummary[] = res.data
      .map((repo) => ({
        id: repo.id,
        owner: repo.owner.login,
        name: repo.name,
        fullName: repo.full_name,
        private: repo.private,
        defaultBranch: repo.default_branch,
        htmlUrl: repo.html_url,
        description: repo.description,
        language: repo.language,
        updatedAt: repo.updated_at,
        pushedAt: repo.pushed_at,
      }))
      .filter((repo) => {
        if (!search) return true;
        return (
          repo.fullName.toLowerCase().includes(search) ||
          (repo.description || '').toLowerCase().includes(search) ||
          (repo.language || '').toLowerCase().includes(search)
        );
      });

    return {
      repositories: normalized,
      page,
      hasMore: res.data.length === perPage,
    };
  }

  async assertProjectAccess(
    projectId: string,
    user: VerifiedAccountUser,
    requireWrite = false
  ) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: { where: { userId: user.id } },
      },
    });

    if (!project || project.isArchived) {
      throw new NotFoundError(`Project with ID ${projectId} not found`);
    }

    if (user.role === Role.ADMIN) {
      return project;
    }

    const isCreator = project.createdById === user.id;
    const isClient = project.clientId === user.id;
    const isLeadDev = project.leadDeveloperId === user.id;
    const membership = project.members[0];
    const hasReadAccess = isCreator || isClient || isLeadDev || Boolean(membership);

    if (!hasReadAccess) {
      throw new ForbiddenError('You do not have permission to access this project.');
    }

    if (requireWrite) {
      const hasWriteAccess =
        isCreator ||
        isLeadDev ||
        membership?.role === ProjectMemberRole.LEAD_DEVELOPER ||
        membership?.role === ProjectMemberRole.MEMBER ||
        membership?.role === ProjectMemberRole.OWNER;

      if (!hasWriteAccess) {
        throw new ForbiddenError(
          'Only project developers or owners can link or synchronize GitHub repositories.'
        );
      }
    }

    return project;
  }

  private async resolveSyncTokenForProject(
    actingUserId: string,
    project: { createdById: string; leadDeveloperId: string | null }
  ): Promise<string> {
    const candidateIds = Array.from(
      new Set([actingUserId, project.leadDeveloperId, project.createdById].filter(Boolean) as string[])
    );

    const users = await prisma.user.findMany({
      where: { id: { in: candidateIds } },
      select: { id: true, githubAccessToken: true },
    });

    for (const candidateId of candidateIds) {
      const record = users.find((u) => u.id === candidateId);
      if (record?.githubAccessToken) {
        try {
          return decryptSecret(record.githubAccessToken);
        } catch {
          continue;
        }
      }
    }

    throw new BadRequestError(
      'No active GitHub connection is available to sync this repository. Please connect GitHub first.',
      undefined,
      'GITHUB_NOT_CONNECTED'
    );
  }

  async connectProjectRepo(
    projectId: string,
    user: VerifiedAccountUser,
    input: { repoFullName?: string; owner?: string; repo?: string }
  ) {
    await this.assertProjectAccess(projectId, user, true);
    const { owner, repo } = parseRepoTarget(input);
    const { token } = await this.getUserDecryptedToken(user.id);

    const repoCheck = await this.fetchGitHubJson<{
      id: number;
      name: string;
      full_name: string;
      private: boolean;
      default_branch: string;
      html_url: string;
      description: string | null;
      language: string | null;
      pushed_at: string | null;
      owner: { login: string };
    }>(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, token);

    if (repoCheck.status === 401) {
      throw new UnauthorizedError(
        'GitHub authorization expired. Please reconnect GitHub.',
        undefined,
        'GITHUB_REAUTH_REQUIRED'
      );
    }

    if (repoCheck.status === 404 || repoCheck.status === 403 || !repoCheck.ok || !repoCheck.data) {
      throw new BadRequestError(
        `Unable to access GitHub repository "${owner}/${repo}". Confirm the repository exists and your GitHub connection has access.`
      );
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        githubRepoOwner: repoCheck.data.owner.login,
        githubRepoName: repoCheck.data.name,
        githubDefaultBranch: repoCheck.data.default_branch,
        githubVisibility: repoCheck.data.private ? 'private' : 'public',
        githubSyncStatus: 'SYNCING',
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
          repoFullName: repoCheck.data.full_name,
          visibility: repoCheck.data.private ? 'private' : 'public',
          defaultBranch: repoCheck.data.default_branch,
        },
      },
    });

    return this.syncProjectRepo(projectId, user, true);
  }

  async syncProjectRepo(
    projectId: string,
    user: VerifiedAccountUser,
    force = false
  ) {
    const project = await this.assertProjectAccess(projectId, user, true);

    if (!project.githubRepoOwner || !project.githubRepoName) {
      throw new BadRequestError(
        'This project does not have a linked GitHub repository yet.',
        undefined,
        'GITHUB_REPO_NOT_LINKED'
      );
    }

    // Cooldown: reuse recently cached snapshot unless force-synced
    if (
      !force &&
      project.githubSyncedAt &&
      project.githubSyncStatus === 'SYNCED' &&
      Date.now() - project.githubSyncedAt.getTime() < 30_000
    ) {
      return this.formatProjectActivityResponse(project);
    }

    let token: string;
    try {
      token = await this.resolveSyncTokenForProject(user.id, project);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'GitHub connection missing';
      await prisma.project.update({
        where: { id: project.id },
        data: { githubSyncStatus: 'NOT_CONNECTED', githubSyncError: msg },
      });
      throw err;
    }

    const owner = encodeURIComponent(project.githubRepoOwner);
    const repo = encodeURIComponent(project.githubRepoName);
    const baseRepoUrl = `https://api.github.com/repos/${owner}/${repo}`;

    try {
      const [repoRes, commitsRes, pullsRes, issuesRes] = await Promise.all([
        this.fetchGitHubJson<{
          default_branch: string;
          private: boolean;
          html_url: string;
          description: string | null;
          language: string | null;
          open_issues_count: number;
          pushed_at: string | null;
        }>(baseRepoUrl, token),
        this.fetchGitHubJson<
          Array<{
            sha: string;
            html_url: string;
            commit: {
              message: string;
              author: { name: string; date: string } | null;
            };
            author: { login: string; avatar_url: string } | null;
          }>
        >(`${baseRepoUrl}/commits?per_page=10`, token),
        this.fetchGitHubJson<
          Array<{
            id: number;
            number: number;
            title: string;
            state: 'open' | 'closed';
            html_url: string;
            created_at: string;
            updated_at: string;
            merged_at: string | null;
            user: { login: string; avatar_url: string } | null;
            head: { ref: string } | null;
            base: { ref: string } | null;
          }>
        >(`${baseRepoUrl}/pulls?state=all&sort=updated&direction=desc&per_page=10`, token),
        this.fetchGitHubJson<
          Array<{
            id: number;
            number: number;
            title: string;
            state: 'open' | 'closed';
            html_url: string;
            created_at: string;
            updated_at: string;
            pull_request?: unknown;
            user: { login: string } | null;
          }>
        >(`${baseRepoUrl}/issues?state=all&sort=updated&direction=desc&per_page=15`, token),
      ]);

      if (repoRes.status === 401 || commitsRes.status === 401) {
        const msg = 'GitHub token expired or revoked. Reconnect GitHub to resume repository sync.';
        await prisma.project.update({
          where: { id: project.id },
          data: { githubSyncStatus: 'REAUTH_REQUIRED', githubSyncError: msg },
        });
        throw new UnauthorizedError(msg, undefined, 'GITHUB_REAUTH_REQUIRED');
      }

      if (repoRes.rateLimited || commitsRes.rateLimited) {
        const msg = 'GitHub API rate limit exceeded. Sync will resume shortly.';
        await prisma.project.update({
          where: { id: project.id },
          data: { githubSyncStatus: 'FAILED', githubSyncError: msg },
        });
        throw new AppError(429, 'GITHUB_RATE_LIMITED', msg);
      }

      if (!repoRes.ok || !repoRes.data) {
        const msg = `GitHub repository ${project.githubRepoOwner}/${project.githubRepoName} returned status ${repoRes.status}.`;
        await prisma.project.update({
          where: { id: project.id },
          data: { githubSyncStatus: 'FAILED', githubSyncError: msg },
        });
        throw new AppError(502, 'GITHUB_SYNC_FAILED', msg);
      }

      const rawCommits = commitsRes.ok && commitsRes.data ? commitsRes.data : [];
      const latestCommit = rawCommits[0];

      // Fetch real changed files/stats for the latest commit if present
      let latestCommitStats: { additions: number; deletions: number; filesChanged: number } | null = null;
      let latestCommitFiles: GitHubRepoCachedData['latestCommitFiles'] = [];
      if (latestCommit?.sha) {
        const commitDetail = await this.fetchGitHubJson<{
          stats?: { additions: number; deletions: number; total: number };
          files?: Array<{
            filename: string;
            status: string;
            additions: number;
            deletions: number;
          }>;
        }>(`${baseRepoUrl}/commits/${latestCommit.sha}`, token);

        if (commitDetail.ok && commitDetail.data) {
          latestCommitFiles = (commitDetail.data.files || []).slice(0, 15).map((f) => ({
            filename: f.filename,
            status: f.status,
            additions: f.additions,
            deletions: f.deletions,
          }));
          latestCommitStats = {
            additions: commitDetail.data.stats?.additions ?? 0,
            deletions: commitDetail.data.stats?.deletions ?? 0,
            filesChanged: commitDetail.data.files?.length ?? 0,
          };
        }
      }

      const commits: GitHubCommitItem[] = rawCommits.map((c, index) => ({
        sha: c.sha,
        shortSha: c.sha.slice(0, 7),
        message: c.commit.message.split('\n')[0] || 'Commit',
        author: c.commit.author?.name || c.author?.login || 'GitHub User',
        authorLogin: c.author?.login || null,
        authorAvatar: c.author?.avatar_url || null,
        date: c.commit.author?.date || new Date().toISOString(),
        url: c.html_url,
        ...(index === 0 && latestCommitStats
          ? {
              filesChanged: latestCommitStats.filesChanged,
              additions: latestCommitStats.additions,
              deletions: latestCommitStats.deletions,
            }
          : {}),
      }));

      const pullRequests: GitHubPullRequestItem[] = (pullsRes.ok && pullsRes.data ? pullsRes.data : []).map((pr) => ({
        id: pr.id,
        number: pr.number,
        title: pr.title,
        state: pr.merged_at ? 'merged' : pr.state,
        author: pr.user?.login || 'GitHub User',
        authorAvatar: pr.user?.avatar_url || null,
        url: pr.html_url,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        mergedAt: pr.merged_at,
        headBranch: pr.head?.ref || null,
        baseBranch: pr.base?.ref || null,
      }));

      const issues: GitHubIssueItem[] = (issuesRes.ok && issuesRes.data ? issuesRes.data : [])
        .filter((i) => !i.pull_request)
        .slice(0, 10)
        .map((issue) => ({
          id: issue.id,
          number: issue.number,
          title: issue.title,
          state: issue.state,
          author: issue.user?.login || 'GitHub User',
          url: issue.html_url,
          createdAt: issue.created_at,
          updatedAt: issue.updated_at,
        }));

      const cachedData: GitHubRepoCachedData = {
        repoUrl: repoRes.data.html_url,
        description: repoRes.data.description,
        language: repoRes.data.language,
        openIssuesCount: repoRes.data.open_issues_count,
        pushedAt: repoRes.data.pushed_at,
        commits,
        pullRequests,
        issues,
        latestCommitFiles,
      };

      const syncedAt = new Date();
      const updated = await prisma.project.update({
        where: { id: project.id },
        data: {
          githubDefaultBranch: repoRes.data.default_branch,
          githubVisibility: repoRes.data.private ? 'private' : 'public',
          githubSyncedAt: syncedAt,
          githubSyncStatus: 'SYNCED',
          githubSyncError: null,
          githubLastCommitSha: latestCommit?.sha ?? null,
          githubLastCommitMessage: latestCommit?.commit.message.split('\n')[0] ?? null,
          githubLastCommitAt: latestCommit?.commit.author?.date
            ? new Date(latestCommit.commit.author.date)
            : null,
          githubCachedData: cachedData as unknown as Prisma.InputJsonValue,
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
            repoFullName: `${project.githubRepoOwner}/${project.githubRepoName}`,
            commitsCount: commits.length,
            pullRequestsCount: pullRequests.length,
            issuesCount: issues.length,
            latestCommitSha: latestCommit?.sha || null,
          },
        },
      });

      return this.formatProjectActivityResponse(updated);
    } catch (err) {
      if (err instanceof AppError) {
        throw err;
      }
      const msg = err instanceof Error ? err.message : 'GitHub repository sync failed';
      await prisma.project.update({
        where: { id: project.id },
        data: { githubSyncStatus: 'FAILED', githubSyncError: msg },
      });
      throw new AppError(502, 'GITHUB_SYNC_FAILED', msg);
    }
  }

  async getProjectActivity(projectId: string, user: VerifiedAccountUser) {
    const project = await this.assertProjectAccess(projectId, user, false);
    const evidences = await prisma.evidence.findMany({
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

    return this.formatProjectActivityResponse(project, evidences);
  }

  private formatProjectActivityResponse(
    project: {
      id: string;
      title: string;
      githubRepoOwner: string | null;
      githubRepoName: string | null;
      githubDefaultBranch: string | null;
      githubVisibility: string | null;
      githubSyncedAt: Date | null;
      githubSyncStatus: string | null;
      githubSyncError: string | null;
      githubLastCommitSha: string | null;
      githubLastCommitMessage: string | null;
      githubLastCommitAt: Date | null;
      githubCachedData: Prisma.JsonValue | null;
    },
    evidences: Array<{
      id: string;
      type: EvidenceType;
      title: string;
      githubCommitSha: string | null;
      githubPrNumber: number | null;
      externalUrl: string | null;
      createdAt: Date;
      milestone: { id: string; title: string };
      uploadedBy: { name: string; avatarUrl: string | null } | null;
    }> = []
  ) {
    const cached = (project.githubCachedData || {}) as GitHubRepoCachedData;
    const isLinked = Boolean(project.githubRepoOwner && project.githubRepoName);

    return {
      projectId: project.id,
      projectTitle: project.title,
      repoLinked: isLinked,
      repository: isLinked
        ? {
            owner: project.githubRepoOwner,
            name: project.githubRepoName,
            fullName: `${project.githubRepoOwner}/${project.githubRepoName}`,
            defaultBranch: project.githubDefaultBranch,
            visibility: project.githubVisibility,
            htmlUrl: cached.repoUrl || `https://github.com/${project.githubRepoOwner}/${project.githubRepoName}`,
            description: cached.description || null,
            language: cached.language || null,
            openIssuesCount: cached.openIssuesCount ?? null,
            pushedAt: cached.pushedAt || null,
          }
        : null,
      syncStatus: isLinked ? project.githubSyncStatus || 'PENDING' : 'NOT_CONNECTED',
      syncError: project.githubSyncError,
      lastSyncedAt: project.githubSyncedAt?.toISOString() ?? null,
      lastCommit: project.githubLastCommitSha
        ? {
            sha: project.githubLastCommitSha,
            shortSha: project.githubLastCommitSha.slice(0, 7),
            message: project.githubLastCommitMessage,
            at: project.githubLastCommitAt?.toISOString() ?? null,
          }
        : null,
      commits: Array.isArray(cached.commits) ? cached.commits : [],
      pullRequests: Array.isArray(cached.pullRequests) ? cached.pullRequests : [],
      issues: Array.isArray(cached.issues) ? cached.issues : [],
      latestCommitFiles: Array.isArray(cached.latestCommitFiles) ? cached.latestCommitFiles : [],
      submittedEvidence: evidences.map((ev) => ({
        id: ev.id,
        type: ev.type,
        title: ev.title,
        sha: ev.githubCommitSha,
        prNumber: ev.githubPrNumber,
        url: ev.externalUrl,
        milestoneId: ev.milestone.id,
        milestoneTitle: ev.milestone.title,
        uploadedBy: ev.uploadedBy?.name || null,
        createdAt: ev.createdAt.toISOString(),
      })),
    };
  }

  async handleWebhook(params: {
    rawBody?: Buffer;
    signatureHeader?: string;
    eventType?: string;
    deliveryId?: string;
    payload: Record<string, unknown>;
  }) {
    if (!env.GITHUB_WEBHOOK_SECRET) {
      throw new AppError(
        503,
        'GITHUB_WEBHOOK_NOT_CONFIGURED',
        'GitHub webhook verification secret is not configured.'
      );
    }

    if (!params.rawBody || !params.signatureHeader || !params.signatureHeader.startsWith('sha256=')) {
      throw new UnauthorizedError('Missing or malformed X-Hub-Signature-256 header.');
    }

    const expectedSig =
      'sha256=' +
      crypto
        .createHmac('sha256', env.GITHUB_WEBHOOK_SECRET)
        .update(params.rawBody)
        .digest('hex');

    const providedBuf = Buffer.from(params.signatureHeader, 'utf8');
    const expectedBuf = Buffer.from(expectedSig, 'utf8');
    if (providedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(providedBuf, expectedBuf)) {
      throw new UnauthorizedError('Invalid GitHub webhook signature.');
    }

    const eventType = params.eventType || 'unknown';
    const eventId =
      params.deliveryId ||
      crypto.createHash('sha256').update(params.rawBody).digest('hex');

    const repoPayload = params.payload.repository as
      | { full_name?: string; name?: string; owner?: { login?: string; name?: string } }
      | undefined;

    const repoOwner = repoPayload?.owner?.login || repoPayload?.owner?.name || null;
    const repoName = repoPayload?.name || null;

    let webhookEventId: string;
    try {
      const created = await prisma.webhookEvent.create({
        data: {
          provider: 'GITHUB',
          eventId,
          eventType,
          resourceId: repoPayload?.full_name || null,
          summary: `GitHub ${eventType} event`,
          payload: params.payload as unknown as Prisma.InputJsonValue,
          status: 'RECEIVED',
        },
      });
      webhookEventId = created.id;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return { duplicate: true, eventId, status: 'ALREADY_PROCESSED' };
      }
      throw err;
    }

    if (!repoOwner || !repoName) {
      await prisma.webhookEvent.update({
        where: { id: webhookEventId },
        data: { status: 'IGNORED', processedAt: new Date() },
      });
      return { duplicate: false, eventId, status: 'IGNORED', updatedProjects: 0 };
    }

    const matchingProjects = await prisma.project.findMany({
      where: {
        isArchived: false,
        githubRepoOwner: { equals: repoOwner, mode: 'insensitive' },
        githubRepoName: { equals: repoName, mode: 'insensitive' },
      },
    });

    const now = new Date();
    const headCommit = params.payload.head_commit as
      | { id?: string; message?: string; timestamp?: string; url?: string; author?: { name?: string; username?: string } }
      | undefined;

    for (const proj of matchingProjects) {
      const existingCached = ((proj.githubCachedData || {}) as GitHubRepoCachedData) || {};
      const nextCommits = Array.isArray(existingCached.commits) ? [...existingCached.commits] : [];
      const nextPrs = Array.isArray(existingCached.pullRequests) ? [...existingCached.pullRequests] : [];

      if (eventType === 'push' && headCommit?.id) {
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
        const deduped = [pushCommit, ...nextCommits.filter((c) => c.sha !== pushCommit.sha)].slice(0, 10);
        await prisma.project.update({
          where: { id: proj.id },
          data: {
            githubLastCommitSha: headCommit.id,
            githubLastCommitMessage: pushCommit.message,
            githubLastCommitAt: headCommit.timestamp ? new Date(headCommit.timestamp) : now,
            githubSyncedAt: now,
            githubSyncStatus: 'SYNCED',
            githubSyncError: null,
            githubCachedData: {
              ...existingCached,
              pushedAt: now.toISOString(),
              commits: deduped,
            } as unknown as Prisma.InputJsonValue,
          },
        });
      } else if (eventType === 'pull_request') {
        const pr = params.payload.pull_request as
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

        if (pr?.number && pr.title) {
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
          const dedupedPrs = [item, ...nextPrs.filter((p) => p.number !== item.number)].slice(0, 10);
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
        }
      }

      await prisma.activityLog.create({
        data: {
          projectId: proj.id,
          action: ActivityAction.GITHUB_REPO_SYNCED,
          entityType: 'PROJECT',
          entityId: proj.id,
          details: {
            source: 'webhook',
            eventType,
            repoFullName: `${repoOwner}/${repoName}`,
          },
        },
      });
    }

    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: { status: 'PROCESSED', processedAt: new Date() },
    });

    return {
      duplicate: false,
      eventId,
      status: 'PROCESSED',
      updatedProjects: matchingProjects.length,
    };
  }
}

export const githubService = new GitHubService();
