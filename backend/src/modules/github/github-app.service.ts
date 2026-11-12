import jwt from 'jsonwebtoken';
import { env, resolveGitHubAppPrivateKey } from '../../config/env';
import {
  AppError,
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../utils/errors';
import logger from '../../utils/logger';
import type { GitHubRepositorySummary } from './github.service';

export interface GitHubAppInstallationMetadata {
  id: number;
  appId: number;
  appSlug: string | null;
  targetType: string;
  account: {
    id: number;
    login: string;
    type: string;
  };
  repositorySelection: 'all' | 'selected' | string;
  permissions: Record<string, string>;
  suspendedAt: string | null;
  htmlUrl: string | null;
  updatedAt: string | null;
}

export interface GitHubInstallationTokenResult {
  token: string;
  expiresAt: Date;
}

interface CachedInstallationToken {
  token: string;
  expiresAtMs: number;
}

interface GitHubRawInstallationResponse {
  id: number;
  app_id: number;
  app_slug?: string | null;
  target_type?: string;
  account?: {
    id?: number;
    login?: string;
    type?: string;
  } | null;
  repository_selection?: string;
  permissions?: Record<string, string>;
  suspended_at?: string | null;
  html_url?: string | null;
  updated_at?: string | null;
}

interface GitHubRawRepository {
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
}

const GITHUB_API_BASE = 'https://api.github.com';
const REQUEST_TIMEOUT_MS = 10_000;
const APP_JWT_TTL_SECONDS = 9 * 60; // GitHub max is 10 minutes
const APP_JWT_CLOCK_SKEW_SECONDS = 60;
const TOKEN_EXPIRY_SAFETY_BUFFER_MS = 5 * 60 * 1000;
const MAX_TOKEN_CACHE_ENTRIES = 500;

function mapRawRepository(repo: GitHubRawRepository): GitHubRepositorySummary {
  return {
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
  };
}

function buildGitHubHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'DevFlow-Backend',
  };
}

function buildTokenCacheKey(installationId: number, repositories?: string[]): string {
  if (!repositories || repositories.length === 0) {
    return `${installationId}:*`;
  }
  const normalized = Array.from(new Set(repositories.map((r) => r.trim()).filter(Boolean))).sort();
  return normalized.length > 0 ? `${installationId}:${normalized.join(',')}` : `${installationId}:*`;
}

function assertValidInstallationId(installationId: number): void {
  if (!Number.isInteger(installationId) || installationId <= 0) {
    throw new BadRequestError(
      'GitHub App installation ID must be a positive integer.',
      undefined,
      'INVALID_INSTALLATION_ID'
    );
  }
}

async function readGitHubErrorBody(response: Response): Promise<{ message: string }> {
  try {
    const parsed = (await response.json()) as { message?: unknown };
    return {
      message: typeof parsed?.message === 'string' ? parsed.message : '',
    };
  } catch {
    return { message: '' };
  }
}

function isRateLimitedResponse(response: Response, message: string): boolean {
  if (response.status === 429) {
    return true;
  }
  if (response.status !== 403) {
    return false;
  }
  const remaining = response.headers.get('x-ratelimit-remaining');
  const retryAfter = response.headers.get('retry-after');
  return (
    remaining === '0' ||
    Boolean(retryAfter) ||
    /rate limit/i.test(message)
  );
}

function isSuspendedMessage(message: string): boolean {
  return /suspend/i.test(message);
}

/**
 * Authenticates as the DevFlowWebsite GitHub App using RS256 App JWTs and mints
 * ephemeral, memory-cached installation access tokens. Never persists secrets or tokens.
 */
export class GitHubAppService {
  private readonly tokenCache = new Map<string, CachedInstallationToken>();
  private readonly inFlightTokenRequests = new Map<string, Promise<GitHubInstallationTokenResult>>();

  isConfigured(): boolean {
    return Boolean(env.GITHUB_APP_ID && resolveGitHubAppPrivateKey(env));
  }

  /**
   * Signs a short-lived RS256 GitHub App JWT (`iss = GITHUB_APP_ID`, max 10 min lifetime).
   */
  signAppJwt(nowMs = Date.now()): string {
    const appId = env.GITHUB_APP_ID;
    const privateKey = resolveGitHubAppPrivateKey(env);

    if (!appId || !privateKey) {
      throw new AppError(
        503,
        'GITHUB_APP_NOT_CONFIGURED',
        'GitHub App credentials (GITHUB_APP_ID and private key) are not configured on this server.'
      );
    }

    const nowSec = Math.floor(nowMs / 1000);
    return jwt.sign(
      {
        iat: nowSec - APP_JWT_CLOCK_SKEW_SECONDS,
        exp: nowSec + APP_JWT_TTL_SECONDS,
        iss: appId,
      },
      privateKey,
      { algorithm: 'RS256' }
    );
  }

  /**
   * Evicts all cached installation tokens (wildcard and repo-scoped) for an installation ID.
   */
  invalidateInstallationToken(installationId: number): void {
    const prefix = `${installationId}:`;
    for (const key of this.tokenCache.keys()) {
      if (key.startsWith(prefix)) {
        this.tokenCache.delete(key);
      }
    }
    for (const key of this.inFlightTokenRequests.keys()) {
      if (key.startsWith(prefix)) {
        this.inFlightTokenRequests.delete(key);
      }
    }
  }

  clearTokenCache(): void {
    this.tokenCache.clear();
    this.inFlightTokenRequests.clear();
  }

  /**
   * Returns a cached installation token when safely within its expiry margin, or exchanges
   * an App JWT for a fresh short-lived token (deduplicating concurrent mint requests).
   */
  async getInstallationToken(
    installationId: number,
    opts: { repositories?: string[]; forceRefresh?: boolean } = {}
  ): Promise<GitHubInstallationTokenResult> {
    assertValidInstallationId(installationId);

    const cacheKey = buildTokenCacheKey(installationId, opts.repositories);
    if (!opts.forceRefresh) {
      const cached = this.tokenCache.get(cacheKey);
      if (cached && cached.expiresAtMs - Date.now() > TOKEN_EXPIRY_SAFETY_BUFFER_MS) {
        return {
          token: cached.token,
          expiresAt: new Date(cached.expiresAtMs),
        };
      }
      if (cached) {
        this.tokenCache.delete(cacheKey);
      }

      const existingPromise = this.inFlightTokenRequests.get(cacheKey);
      if (existingPromise) {
        return existingPromise;
      }
    } else {
      this.tokenCache.delete(cacheKey);
    }

    const mintPromise = this.mintInstallationToken(installationId, opts.repositories)
      .then((result) => {
        this.storeCachedToken(cacheKey, result.token, result.expiresAt.getTime());
        return result;
      })
      .finally(() => {
        if (this.inFlightTokenRequests.get(cacheKey) === mintPromise) {
          this.inFlightTokenRequests.delete(cacheKey);
        }
      });

    this.inFlightTokenRequests.set(cacheKey, mintPromise);
    return mintPromise;
  }

  private storeCachedToken(cacheKey: string, token: string, expiresAtMs: number): void {
    if (this.tokenCache.has(cacheKey)) {
      this.tokenCache.delete(cacheKey);
    } else if (this.tokenCache.size >= MAX_TOKEN_CACHE_ENTRIES) {
      const oldestKey = this.tokenCache.keys().next().value;
      if (oldestKey) {
        this.tokenCache.delete(oldestKey);
      }
    }
    this.tokenCache.set(cacheKey, { token, expiresAtMs });
  }

  private async mintInstallationToken(
    installationId: number,
    repositories?: string[]
  ): Promise<GitHubInstallationTokenResult> {
    const appJwt = this.signAppJwt();
    const url = `${GITHUB_API_BASE}/app/installations/${installationId}/access_tokens`;
    const scopedRepos = repositories?.map((r) => r.trim()).filter(Boolean) || [];

    const response = await this.performGitHubFetch(url, {
      method: 'POST',
      headers: {
        ...buildGitHubHeaders(appJwt),
        ...(scopedRepos.length > 0 ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(scopedRepos.length > 0 ? { body: JSON.stringify({ repositories: scopedRepos }) } : {}),
    });

    if (!response.ok) {
      await this.throwClassifiedAppJwtError(response, installationId, 'mint_access_token');
    }

    const payload = (await response.json()) as { token?: string; expires_at?: string };
    if (!payload.token || !payload.expires_at) {
      throw new AppError(
        502,
        'GITHUB_API_ERROR',
        'GitHub returned an incomplete installation access token response.'
      );
    }

    const expiresAt = new Date(payload.expires_at);
    if (Number.isNaN(expiresAt.getTime())) {
      throw new AppError(
        502,
        'GITHUB_API_ERROR',
        'GitHub returned an invalid installation token expiration timestamp.'
      );
    }

    return { token: payload.token, expiresAt };
  }

  /**
   * Retrieves authoritative installation metadata directly from GitHub via App JWT.
   */
  async getInstallationMetadata(installationId: number): Promise<GitHubAppInstallationMetadata> {
    assertValidInstallationId(installationId);
    const appJwt = this.signAppJwt();
    const url = `${GITHUB_API_BASE}/app/installations/${installationId}`;

    const response = await this.performGitHubFetch(url, {
      method: 'GET',
      headers: buildGitHubHeaders(appJwt),
    });

    if (!response.ok) {
      await this.throwClassifiedAppJwtError(response, installationId, 'get_installation');
    }

    const raw = (await response.json()) as GitHubRawInstallationResponse;
    if (!raw?.id || !raw?.account?.id || !raw?.account?.login || !raw?.account?.type) {
      throw new AppError(
        502,
        'GITHUB_API_ERROR',
        'GitHub returned incomplete installation metadata.'
      );
    }

    return {
      id: raw.id,
      appId: raw.app_id,
      appSlug: raw.app_slug ?? null,
      targetType: raw.target_type ?? raw.account.type,
      account: {
        id: raw.account.id,
        login: raw.account.login,
        type: raw.account.type,
      },
      repositorySelection: raw.repository_selection ?? 'selected',
      permissions: raw.permissions ?? {},
      suspendedAt: raw.suspended_at ?? null,
      htmlUrl: raw.html_url ?? null,
      updatedAt: raw.updated_at ?? null,
    };
  }

  /**
   * Lists repositories accessible to a GitHub App installation, automatically handling
   * a single 401 token refresh without discarding tokens on unrelated 403/429/5xx errors.
   */
  async listInstallationRepositories(
    installationId: number,
    opts: { page?: number; perPage?: number } = {}
  ): Promise<{
    repositories: GitHubRepositorySummary[];
    totalCount: number;
    page: number;
    hasMore: boolean;
  }> {
    assertValidInstallationId(installationId);
    const page = Math.max(1, opts.page || 1);
    const perPage = Math.min(100, Math.max(1, opts.perPage || 50));

    return this.executeWithInstallationToken(installationId, async (token) => {
      const url = `${GITHUB_API_BASE}/installation/repositories?per_page=${perPage}&page=${page}`;
      const response = await this.performGitHubFetch(url, {
        method: 'GET',
        headers: buildGitHubHeaders(token),
      });

      if (!response.ok) {
        return { ok: false as const, response };
      }

      const body = (await response.json()) as {
        total_count?: number;
        repositories?: GitHubRawRepository[];
      };

      const rawRepos = Array.isArray(body.repositories) ? body.repositories : [];
      const repositories: GitHubRepositorySummary[] = rawRepos.map(mapRawRepository);

      const totalCount = typeof body.total_count === 'number' ? body.total_count : repositories.length;
      const hasMore =
        repositories.length === perPage && (page - 1) * perPage + repositories.length < totalCount;

      return {
        ok: true as const,
        value: {
          repositories,
          totalCount,
          page,
          hasMore,
        },
      };
    });
  }

  /**
   * Fetches repository metadata using an installation access token (never an OAuth token).
   */
  async getInstallationRepository(
    installationId: number,
    owner: string,
    repo: string
  ): Promise<GitHubRepositorySummary> {
    assertValidInstallationId(installationId);

    return this.executeWithInstallationToken(installationId, async (token) => {
      const url = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
      const response = await this.performGitHubFetch(url, {
        method: 'GET',
        headers: buildGitHubHeaders(token),
      });

      if (!response.ok) {
        return { ok: false as const, response };
      }

      const body = (await response.json()) as GitHubRawRepository;
      if (!body?.id || !body?.full_name || !body?.owner?.login) {
        throw new AppError(
          502,
          'GITHUB_API_ERROR',
          'GitHub returned incomplete repository metadata.'
        );
      }

      return {
        ok: true as const,
        value: mapRawRepository(body),
      };
    });
  }

  /**
   * Executes a read-only GET JSON request against GitHub API using the installation access token
   * while preserving Stage 3 token caching and error classification semantics.
   */
  async fetchJsonWithInstallationToken<T>(
    installationId: number,
    url: string,
    opts: { allowNonFatalStatuses?: number[] } = {}
  ): Promise<{ ok: boolean; status: number; data: T | null }> {
    assertValidInstallationId(installationId);

    if (!url.startsWith(`${GITHUB_API_BASE}/`)) {
      throw new BadRequestError(
        'GitHub App installation API URL must target api.github.com.',
        undefined,
        'INVALID_GITHUB_API_URL'
      );
    }

    return this.executeWithInstallationToken<{ ok: boolean; status: number; data: T | null }>(
      installationId,
      async (token) => {
      const response = await this.performGitHubFetch(url, {
        method: 'GET',
        headers: buildGitHubHeaders(token),
      });

      if (!response.ok) {
        if (opts.allowNonFatalStatuses?.includes(response.status)) {
          return {
            ok: true as const,
            value: { ok: false, status: response.status, data: null },
          };
        }
        return { ok: false as const, response };
      }

      const data = (await response.json()) as T;
      return {
        ok: true as const,
        value: { ok: true, status: response.status, data },
      };
    });
  }

  /**
   * Executes a GitHub API operation using a cached installation token.
   * - On 401: invalidates the cached token, mints one fresh token, retries once,
   *   and probes installation metadata if the retry still fails 401.
   * - On 403 rate-limit or 403 permission denied: keeps the valid cached token intact.
   * - On 403 suspended: invalidates cache and fails closed with GITHUB_APP_SUSPENDED.
   */
  async executeWithInstallationToken<T>(
    installationId: number,
    operation: (token: string) => Promise<{ ok: true; value: T } | { ok: false; response: Response }>,
    opts: { repositories?: string[] } = {}
  ): Promise<T> {
    assertValidInstallationId(installationId);

    let tokenResult = await this.getInstallationToken(installationId, {
      repositories: opts.repositories,
    });
    let outcome = await operation(tokenResult.token);

    if (!outcome.ok && outcome.response.status === 401) {
      this.invalidateInstallationToken(installationId);
      tokenResult = await this.getInstallationToken(installationId, {
        repositories: opts.repositories,
        forceRefresh: true,
      });
      outcome = await operation(tokenResult.token);

      if (!outcome.ok && outcome.response.status === 401) {
        await this.probeInstallationAfterRepeated401(installationId);
        throw new UnauthorizedError(
          'GitHub App installation authorization expired or was revoked.',
          { installationId },
          'GITHUB_APP_REAUTH_REQUIRED'
        );
      }
    }

    if (outcome.ok) {
      return outcome.value;
    }

    return this.throwClassifiedInstallationError(outcome.response, installationId);
  }

  private async probeInstallationAfterRepeated401(installationId: number): Promise<void> {
    try {
      const metadata = await this.getInstallationMetadata(installationId);
      if (metadata.suspendedAt) {
        this.invalidateInstallationToken(installationId);
        throw new ForbiddenError(
          'GitHub App installation is currently suspended.',
          { installationId, suspendedAt: metadata.suspendedAt },
          'GITHUB_APP_SUSPENDED'
        );
      }
    } catch (err) {
      if (err instanceof AppError && err.code !== 'GITHUB_APP_AUTH_FAILED') {
        throw err;
      }
    }
  }

  private async performGitHubFetch(url: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      logger.warn('GitHub App API network request failed', {
        url,
        error: err instanceof Error ? err.message : 'Unknown network error',
      });
      throw new AppError(
        503,
        'GITHUB_API_UNAVAILABLE',
        'Unable to reach GitHub API. Please try again shortly.'
      );
    }
  }

  private async throwClassifiedAppJwtError(
    response: Response,
    installationId: number,
    operation: 'mint_access_token' | 'get_installation'
  ): Promise<never> {
    const { message } = await readGitHubErrorBody(response);

    if (response.status === 401) {
      throw new UnauthorizedError(
        'GitHub App JWT authentication failed. Verify GITHUB_APP_ID and the configured private key.',
        { installationId, operation },
        'GITHUB_APP_AUTH_FAILED'
      );
    }

    if (isRateLimitedResponse(response, message)) {
      const retryAfter = response.headers.get('retry-after');
      throw new AppError(
        429,
        'GITHUB_RATE_LIMITED',
        'GitHub API rate limit exceeded. Please try again later.',
        retryAfter ? { retryAfter } : undefined
      );
    }

    if ((response.status === 403 || response.status === 422) && isSuspendedMessage(message)) {
      this.invalidateInstallationToken(installationId);
      throw new ForbiddenError(
        'GitHub App installation is suspended and cannot issue access tokens.',
        { installationId },
        'GITHUB_APP_SUSPENDED'
      );
    }

    if (response.status === 403) {
      throw new ForbiddenError(
        message || 'GitHub App lacks permission to access this installation.',
        { installationId, operation },
        'GITHUB_APP_PERMISSION_DENIED'
      );
    }

    if (response.status === 404) {
      this.invalidateInstallationToken(installationId);
      throw new NotFoundError(
        `GitHub App installation ${installationId} was not found or has been uninstalled.`,
        { installationId },
        'GITHUB_APP_INSTALLATION_NOT_FOUND'
      );
    }

    if (response.status >= 500) {
      throw new AppError(
        502,
        'GITHUB_API_UNAVAILABLE',
        `GitHub API returned temporary server error (${response.status}).`,
        { installationId, status: response.status }
      );
    }

    throw new AppError(
      502,
      'GITHUB_API_ERROR',
      message || `GitHub App request failed with status ${response.status}.`,
      { installationId, status: response.status }
    );
  }

  private async throwClassifiedInstallationError(
    response: Response,
    installationId: number
  ): Promise<never> {
    const { message } = await readGitHubErrorBody(response);

    if (isRateLimitedResponse(response, message)) {
      // Do NOT invalidate the cached installation token when rate-limited
      const retryAfter = response.headers.get('retry-after');
      throw new AppError(
        429,
        'GITHUB_RATE_LIMITED',
        'GitHub API rate limit exceeded. Please try again later.',
        retryAfter ? { retryAfter } : undefined
      );
    }

    if ((response.status === 403 || response.status === 422) && isSuspendedMessage(message)) {
      this.invalidateInstallationToken(installationId);
      throw new ForbiddenError(
        'GitHub App installation is suspended.',
        { installationId },
        'GITHUB_APP_SUSPENDED'
      );
    }

    if (response.status === 403) {
      // Do NOT discard valid installation tokens on per-resource permission errors
      throw new ForbiddenError(
        message || 'GitHub App installation does not have permission for this resource.',
        { installationId },
        'GITHUB_APP_PERMISSION_DENIED'
      );
    }

    if (response.status === 404) {
      throw new NotFoundError(
        message || 'Requested GitHub repository or installation resource was not found.',
        { installationId },
        'GITHUB_RESOURCE_NOT_FOUND'
      );
    }

    if (response.status >= 500) {
      throw new AppError(
        502,
        'GITHUB_API_UNAVAILABLE',
        `GitHub API returned temporary server error (${response.status}).`,
        { installationId, status: response.status }
      );
    }

    throw new AppError(
      502,
      'GITHUB_API_ERROR',
      message || `GitHub API returned unexpected status ${response.status}.`,
      { installationId, status: response.status }
    );
  }
}

export const githubAppService = new GitHubAppService();
