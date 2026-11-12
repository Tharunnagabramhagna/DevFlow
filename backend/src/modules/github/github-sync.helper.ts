import { PromptSanitizer } from '../ai/promptSanitizer';
import type {
  GitHubCommitItem,
  GitHubIssueItem,
  GitHubPullRequestItem,
  GitHubRepoCachedData,
} from './github.service';

export interface GitHubSyncJsonResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
}

export type GitHubSyncJsonFetcher = <T>(
  url: string,
  opts?: { allowNonFatalStatuses?: number[] }
) => Promise<GitHubSyncJsonResult<T>>;

export interface SanitizedGitHubRepositoryContext {
  repoFullName: string;
  defaultBranch: string | null;
  visibility: string | null;
  syncStatus: string | null;
  lastSyncedAt: string | null;
  pushedAt: string | null;
  openIssuesCount: number | null;
  commits: Array<{
    shortSha: string;
    message: string;
    author: string;
    date: string;
  }>;
  pullRequests: Array<{
    number: number;
    title: string;
    state: string;
    author: string;
    updatedAt: string | null;
    mergedAt: string | null;
  }>;
  issues: Array<{
    number: number;
    title: string;
    state: string;
    author: string;
    updatedAt: string | null;
  }>;
  changedFilesSummary: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
  }>;
}

const MAX_COMMITS_STORED = 10;
const MAX_PULLS_STORED = 10;
const MAX_ISSUES_STORED = 10;
const MAX_FILES_STORED = 15;
const MAX_AI_ITEMS = 8;

const SENSITIVE_PATH_PATTERNS: RegExp[] = [
  /(?:^|\/)\.env(?:\.[^/]+)?$/i,
  /\.pem$/i,
  /\.key$/i,
  /\.p12$/i,
  /\.pfx$/i,
  /\.jks$/i,
  /\.keystore$/i,
  /\.ppk$/i,
  /(?:^|\/)id_(?:rsa|dsa|ecdsa|ed25519)(?:\.pub)?$/i,
  /(?:^|\/)\.(?:npmrc|pypirc|netrc|dockercfg|git-credentials)$/i,
  /(?:^|\/)\.git(?:\/|$)/i,
  /(?:^|\/)[^/]*(?:secret|credential|service[-_]?account)[^/]*\.(?:json|ya?ml|toml|ini|txt)$/i,
];

/**
 * Returns true if a repository file path matches sensitive secret, key, or environment patterns.
 */
export function isSensitiveRepoPath(filePath: string): boolean {
  if (!filePath || typeof filePath !== 'string') {
    return true;
  }
  const normalized = filePath.replace(/\\/g, '/').trim();
  if (!normalized || normalized.includes('..') || /[\x00-\x1f\x7f]/.test(normalized)) {
    return true;
  }
  return SENSITIVE_PATH_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * Scrubs secret patterns, removes control characters, and bounds untrusted text length.
 */
export function sanitizeBoundedText(input: string | null | undefined, maxLength: number): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  const singleLine = input
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[\x00-\x1f\x7f]/g, '')
    .trim();
  const scrubbed = PromptSanitizer.scrubSecrets(singleLine);
  if (scrubbed.length <= maxLength) {
    return scrubbed;
  }
  return `${scrubbed.slice(0, Math.max(0, maxLength - 3))}...`;
}

export interface RawGitHubRepoDetails {
  id: number;
  name: string;
  full_name: string;
  default_branch: string;
  private: boolean;
  html_url: string;
  description: string | null;
  language: string | null;
  open_issues_count: number;
  pushed_at: string | null;
  owner: { login: string };
}

interface RawGitHubCommit {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: { name: string; date: string } | null;
  };
  author: { login: string; avatar_url: string } | null;
}

interface RawGitHubCommitDetail {
  stats?: { additions: number; deletions: number; total: number };
  files?: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
  }>;
}

interface RawGitHubPull {
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
}

interface RawGitHubIssue {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  html_url: string;
  created_at: string;
  updated_at: string;
  pull_request?: unknown;
  user: { login: string } | null;
}

export interface GitHubSyncSnapshot {
  repoMetadata: RawGitHubRepoDetails;
  cachedData: GitHubRepoCachedData;
  latestCommit: {
    sha: string;
    message: string;
    date: Date | null;
  } | null;
  commits: GitHubCommitItem[];
  pullRequests: GitHubPullRequestItem[];
  issues: GitHubIssueItem[];
}

/**
 * Fetches and builds a bounded, secret-scrubbed repository metadata snapshot without
 * retrieving or persisting raw source file contents, patches, or sensitive files.
 */
export async function fetchAndBuildGitHubSyncSnapshot(
  owner: string,
  repo: string,
  fetchJson: GitHubSyncJsonFetcher
): Promise<GitHubSyncSnapshot> {
  const encodedOwner = encodeURIComponent(owner);
  const encodedRepo = encodeURIComponent(repo);
  const baseRepoUrl = `https://api.github.com/repos/${encodedOwner}/${encodedRepo}`;

  const [repoRes, commitsRes, pullsRes, issuesRes] = await Promise.all([
    fetchJson<RawGitHubRepoDetails>(baseRepoUrl),
    fetchJson<RawGitHubCommit[]>(`${baseRepoUrl}/commits?per_page=${MAX_COMMITS_STORED}`, {
      allowNonFatalStatuses: [404, 409],
    }),
    fetchJson<RawGitHubPull[]>(
      `${baseRepoUrl}/pulls?state=all&sort=updated&direction=desc&per_page=${MAX_PULLS_STORED}`,
      { allowNonFatalStatuses: [404] }
    ),
    fetchJson<RawGitHubIssue[]>(
      `${baseRepoUrl}/issues?state=all&sort=updated&direction=desc&per_page=15`,
      { allowNonFatalStatuses: [404, 410] }
    ),
  ]);

  if (!repoRes.ok || !repoRes.data) {
    throw new Error(`Unable to fetch metadata for GitHub repository ${owner}/${repo}.`);
  }

  const rawCommits = Array.isArray(commitsRes.data) ? commitsRes.data.slice(0, MAX_COMMITS_STORED) : [];
  const headCommit = rawCommits[0];

  let latestCommitStats: { additions: number; deletions: number; filesChanged: number } | null = null;
  let latestCommitFiles: NonNullable<GitHubRepoCachedData['latestCommitFiles']> = [];

  if (headCommit?.sha) {
    const commitDetail = await fetchJson<RawGitHubCommitDetail>(
      `${baseRepoUrl}/commits/${encodeURIComponent(headCommit.sha)}`,
      { allowNonFatalStatuses: [404, 422] }
    );

    if (commitDetail.ok && commitDetail.data) {
      const safeFiles = (commitDetail.data.files || [])
        .filter((f) => !isSensitiveRepoPath(f.filename))
        .slice(0, MAX_FILES_STORED)
        .map((f) => ({
          filename: sanitizeBoundedText(f.filename, 200),
          status: sanitizeBoundedText(f.status || 'modified', 32),
          additions: Number(f.additions) || 0,
          deletions: Number(f.deletions) || 0,
        }));

      latestCommitFiles = safeFiles;
      latestCommitStats = {
        additions: Number(commitDetail.data.stats?.additions) || 0,
        deletions: Number(commitDetail.data.stats?.deletions) || 0,
        filesChanged: safeFiles.length,
      };
    }
  }

  const commits: GitHubCommitItem[] = rawCommits.map((c, index) => ({
    sha: c.sha,
    shortSha: c.sha.slice(0, 7),
    message: sanitizeBoundedText((c.commit?.message || 'Commit').split('\n')[0], 240) || 'Commit',
    author:
      sanitizeBoundedText(c.commit?.author?.name || c.author?.login || 'GitHub User', 80) ||
      'GitHub User',
    authorLogin: c.author?.login ? sanitizeBoundedText(c.author.login, 80) : null,
    authorAvatar: c.author?.avatar_url || null,
    date: c.commit?.author?.date || new Date().toISOString(),
    url: c.html_url,
    ...(index === 0 && latestCommitStats
      ? {
          filesChanged: latestCommitStats.filesChanged,
          additions: latestCommitStats.additions,
          deletions: latestCommitStats.deletions,
        }
      : {}),
  }));

  const rawPulls = Array.isArray(pullsRes.data) ? pullsRes.data.slice(0, MAX_PULLS_STORED) : [];
  const pullRequests: GitHubPullRequestItem[] = rawPulls.map((pr) => ({
    id: pr.id,
    number: pr.number,
    title: sanitizeBoundedText(pr.title || `Pull Request #${pr.number}`, 200),
    state: pr.merged_at ? 'merged' : pr.state,
    author: sanitizeBoundedText(pr.user?.login || 'GitHub User', 80) || 'GitHub User',
    authorAvatar: pr.user?.avatar_url || null,
    url: pr.html_url,
    createdAt: pr.created_at,
    updatedAt: pr.updated_at,
    mergedAt: pr.merged_at,
    headBranch: pr.head?.ref ? sanitizeBoundedText(pr.head.ref, 100) : null,
    baseBranch: pr.base?.ref ? sanitizeBoundedText(pr.base.ref, 100) : null,
  }));

  const rawIssues = Array.isArray(issuesRes.data) ? issuesRes.data : [];
  const issues: GitHubIssueItem[] = rawIssues
    .filter((i) => !i.pull_request)
    .slice(0, MAX_ISSUES_STORED)
    .map((issue) => ({
      id: issue.id,
      number: issue.number,
      title: sanitizeBoundedText(issue.title || `Issue #${issue.number}`, 200),
      state: issue.state,
      author: sanitizeBoundedText(issue.user?.login || 'GitHub User', 80) || 'GitHub User',
      url: issue.html_url,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
    }));

  const cachedData: GitHubRepoCachedData = {
    repoUrl: repoRes.data.html_url,
    description: repoRes.data.description
      ? sanitizeBoundedText(repoRes.data.description, 300)
      : null,
    language: repoRes.data.language ? sanitizeBoundedText(repoRes.data.language, 60) : null,
    openIssuesCount: Number(repoRes.data.open_issues_count) || 0,
    pushedAt: repoRes.data.pushed_at,
    commits,
    pullRequests,
    issues,
    latestCommitFiles,
  };

  const latestCommit = headCommit
    ? {
        sha: headCommit.sha,
        message:
          sanitizeBoundedText((headCommit.commit?.message || 'Commit').split('\n')[0], 240) ||
          'Commit',
        date: headCommit.commit?.author?.date ? new Date(headCommit.commit.author.date) : null,
      }
    : null;

  return {
    repoMetadata: repoRes.data,
    cachedData,
    latestCommit,
    commits,
    pullRequests,
    issues,
  };
}

/**
 * Extracts a strict allowlisted, secret-scrubbed repository summary from persisted Project
 * metadata before passing it into AI agents. Never passes patches, raw file contents, or secrets.
 */
export function buildSanitizedGitHubAIContext(project?: {
  githubRepoOwner?: string | null;
  githubRepoName?: string | null;
  githubDefaultBranch?: string | null;
  githubVisibility?: string | null;
  githubSyncStatus?: string | null;
  githubSyncedAt?: Date | string | null;
  githubCachedData?: unknown;
} | null): SanitizedGitHubRepositoryContext | null {
  if (!project?.githubRepoOwner || !project?.githubRepoName) {
    return null;
  }

  const cached = (
    project.githubCachedData && typeof project.githubCachedData === 'object'
      ? project.githubCachedData
      : {}
  ) as Partial<GitHubRepoCachedData>;

  const rawCommits = Array.isArray(cached.commits) ? cached.commits : [];
  const rawPulls = Array.isArray(cached.pullRequests) ? cached.pullRequests : [];
  const rawIssues = Array.isArray(cached.issues) ? cached.issues : [];
  const rawFiles = Array.isArray(cached.latestCommitFiles) ? cached.latestCommitFiles : [];

  const lastSyncedIso = project.githubSyncedAt
    ? new Date(project.githubSyncedAt).toISOString()
    : null;

  return {
    repoFullName: `${sanitizeBoundedText(project.githubRepoOwner, 100)}/${sanitizeBoundedText(project.githubRepoName, 100)}`,
    defaultBranch: project.githubDefaultBranch
      ? sanitizeBoundedText(project.githubDefaultBranch, 100)
      : null,
    visibility: project.githubVisibility
      ? sanitizeBoundedText(project.githubVisibility, 20)
      : null,
    syncStatus: project.githubSyncStatus
      ? sanitizeBoundedText(project.githubSyncStatus, 40)
      : null,
    lastSyncedAt: lastSyncedIso,
    pushedAt: typeof cached.pushedAt === 'string' ? cached.pushedAt : null,
    openIssuesCount: typeof cached.openIssuesCount === 'number' ? cached.openIssuesCount : null,
    commits: rawCommits.slice(0, MAX_AI_ITEMS).map((c) => ({
      shortSha: sanitizeBoundedText(c.shortSha || c.sha?.slice(0, 7) || '', 12),
      message: sanitizeBoundedText(c.message || 'Commit', 200),
      author: sanitizeBoundedText(c.authorLogin || c.author || 'Developer', 80),
      date: typeof c.date === 'string' ? c.date : '',
    })),
    pullRequests: rawPulls.slice(0, MAX_AI_ITEMS).map((pr) => ({
      number: Number(pr.number) || 0,
      title: sanitizeBoundedText(pr.title || '', 180),
      state: sanitizeBoundedText(pr.state || 'open', 20),
      author: sanitizeBoundedText(pr.author || 'Developer', 80),
      updatedAt: typeof pr.updatedAt === 'string' ? pr.updatedAt : null,
      mergedAt: typeof pr.mergedAt === 'string' ? pr.mergedAt : null,
    })),
    issues: rawIssues.slice(0, MAX_AI_ITEMS).map((issue) => ({
      number: Number(issue.number) || 0,
      title: sanitizeBoundedText(issue.title || '', 180),
      state: sanitizeBoundedText(issue.state || 'open', 20),
      author: sanitizeBoundedText(issue.author || 'Developer', 80),
      updatedAt: typeof issue.updatedAt === 'string' ? issue.updatedAt : null,
    })),
    changedFilesSummary: rawFiles
      .filter((f) => !isSensitiveRepoPath(f.filename))
      .slice(0, 10)
      .map((f) => ({
        filename: sanitizeBoundedText(f.filename, 180),
        status: sanitizeBoundedText(f.status || 'modified', 24),
        additions: Number(f.additions) || 0,
        deletions: Number(f.deletions) || 0,
      })),
  };
}

/**
 * Formats sanitized repository evidence inside PromptSanitizer untrusted-content boundaries.
 */
export function formatGitHubAIContextText(
  context: SanitizedGitHubRepositoryContext | null | undefined
): string {
  if (!context) {
    return 'Synced GitHub Repository Evidence: None linked or synced for this project.';
  }

  const commitsLines =
    context.commits.length > 0
      ? context.commits
          .map((c) => `- [${c.shortSha}] "${c.message}" by ${c.author} (${c.date || 'unknown date'})`)
          .join('\n')
      : '- No synced commits recorded.';

  const prLines =
    context.pullRequests.length > 0
      ? context.pullRequests
          .map(
            (pr) =>
              `- PR #${pr.number} [${pr.state}]: "${pr.title}" by ${pr.author} (updated: ${
                pr.updatedAt || 'unknown'
              }${pr.mergedAt ? `, merged: ${pr.mergedAt}` : ''})`
          )
          .join('\n')
      : '- No synced pull requests recorded.';

  const issueLines =
    context.issues.length > 0
      ? context.issues
          .map(
            (issue) =>
              `- Issue #${issue.number} [${issue.state}]: "${issue.title}" by ${issue.author} (updated: ${
                issue.updatedAt || 'unknown'
              })`
          )
          .join('\n')
      : '- No synced issues recorded.';

  const filesLines =
    context.changedFilesSummary.length > 0
      ? context.changedFilesSummary
          .map((f) => `- ${f.filename} (${f.status}: +${f.additions}/-${f.deletions})`)
          .join('\n')
      : '- No changed file path summary recorded.';

  const body = [
    `Repository: ${context.repoFullName} (${context.visibility || 'unknown'}, default branch: ${
      context.defaultBranch || 'unknown'
    })`,
    `Sync Status: ${context.syncStatus || 'UNKNOWN'} | Last Synced At: ${
      context.lastSyncedAt || 'Never'
    } | Last Push At: ${context.pushedAt || 'Unknown'}`,
    `Open Issues Count: ${context.openIssuesCount ?? 'Unknown'}`,
    `Commits (${context.commits.length}):`,
    commitsLines,
    `Pull Requests (${context.pullRequests.length}):`,
    prLines,
    `Issues (${context.issues.length}):`,
    issueLines,
    `Latest Commit Changed File Paths (${context.changedFilesSummary.length}):`,
    filesLines,
  ].join('\n');

  return PromptSanitizer.wrapUntrustedContent(body, 'github_repository_evidence');
}

