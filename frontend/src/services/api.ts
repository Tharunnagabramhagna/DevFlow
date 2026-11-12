import {
  Project,
  Milestone,
  DeveloperTelemetry,
  TelemetryRange,
  FinancialSummary,
  GitHubCommitEvidence,
  GitHubPullRequestEvidence,
  GitHubConnectionStatus,
  GitHubRepositorySummary,
  ProjectGitHubActivity,
  NotificationItem,
  PayPalInvoice,
  AIVerificationReport,
  DeveloperStudioState,
  DeveloperResumeRecord,
  StructuredResumePreviewDocument,
  MarketplaceDeveloperCard,
  MarketplaceOpportunityItem,
  OpportunityApplicationRecord,
  CandidateMatchAssessmentItem,
} from '@/types';
import {
  MOCK_TELEMETRY,
  MOCK_PROJECTS,
  MOCK_MILESTONES,
  MOCK_COMMITS,
  MOCK_PULL_REQUESTS,
} from './mockData';

const BASE_URL = '/api';
const AUTH_STORAGE_KEY = 'devflow_auth_session';

function getSessionContext(): { isGuest: boolean; token: string | null } {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return { isGuest: false, token: null };
    const parsed = JSON.parse(raw);
    const isGuest = parsed?.user?.role === 'GUEST' || Boolean(parsed?.user?.isGuest);
    if (isGuest) {
      return { isGuest: true, token: null };
    }
    const token =
      typeof parsed?.accessToken === 'string' &&
      !parsed.accessToken.startsWith('simulated_token_') &&
      !parsed.accessToken.startsWith('guest_demo_token_')
        ? parsed.accessToken
        : null;
    return { isGuest: false, token };
  } catch {
    return { isGuest: false, token: null };
  }
}

function getAuthHeaders(includeJson = false): HeadersInit {
  const { token } = getSessionContext();
  const headers: Record<string, string> = {};
  if (includeJson) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function normalizeProject(raw: any): Project {
  const milestones = Array.isArray(raw.milestones) ? raw.milestones : [];
  return {
    id: raw.id,
    name: raw.name || raw.title || 'Untitled Project',
    description: raw.description || '',
    clientName: raw.clientName || raw.client?.name || 'Unassigned Client',
    clientEmail: raw.clientEmail || raw.client?.email || '',
    githubRepo:
      raw.githubRepo ||
      (raw.githubRepoOwner && raw.githubRepoName
        ? `${raw.githubRepoOwner}/${raw.githubRepoName}`
        : ''),
    githubRepoOwner: raw.githubRepoOwner ?? null,
    githubRepoName: raw.githubRepoName ?? null,
    githubDefaultBranch: raw.githubDefaultBranch ?? null,
    githubVisibility: raw.githubVisibility ?? null,
    githubSyncStatus:
      raw.githubSyncStatus ??
      (raw.githubRepoOwner && raw.githubRepoName ? 'PENDING' : 'NOT_CONNECTED'),
    githubSyncedAt: raw.githubSyncedAt ?? null,
    githubSyncError: raw.githubSyncError ?? null,
    githubLastCommitSha: raw.githubLastCommitSha ?? null,
    githubLastCommitMessage: raw.githubLastCommitMessage ?? null,
    githubLastCommitAt: raw.githubLastCommitAt ?? null,
    status: raw.status || 'ACTIVE',
    totalBudget: Number(raw.totalBudget ?? raw.budget ?? 0),
    currency: raw.currency || 'USD',
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
    milestonesCount: raw.milestonesCount ?? raw._count?.milestones ?? milestones.length,
    completedMilestonesCount:
      raw.completedMilestonesCount ??
      milestones.filter((m: any) => m.status === 'APPROVED' || m.status === 'PAID').length,
  };
}

function normalizeMilestone(raw: any): Milestone {
  const statusMap: Record<string, Milestone['status']> = {
    PENDING: 'in_progress',
    IN_PROGRESS: 'in_progress',
    EVIDENCE_SUBMITTED: 'evidence_submitted',
    APPROVED: 'client_approved',
    REJECTED: 'rejected',
    PAID: 'paid',
  };
  return {
    id: raw.id,
    projectId: raw.projectId,
    title: raw.title,
    description: raw.description || '',
    order: raw.order ?? raw.orderIndex ?? 0,
    amount: Number(raw.amount ?? raw.paymentAmount ?? 0),
    currency: raw.currency || 'USD',
    dueDate: raw.dueDate || new Date().toISOString(),
    status: statusMap[raw.status] || raw.status || 'in_progress',
    requirements: Array.isArray(raw.requirements)
      ? raw.requirements.map((r: any, idx: number) =>
          typeof r === 'string'
            ? { id: `req_${idx}`, milestoneId: raw.id, title: r, description: r, satisfied: false }
            : r
        )
      : [],
    githubBranch: raw.githubBranch,
    aiReport: raw.aiReport,
    clientApproval: raw.clientApproval,
    invoice: raw.invoice,
    commitsCount: raw.commitsCount ?? raw._count?.evidence ?? 0,
  };
}

const EMPTY_FINANCIAL_SUMMARY: FinancialSummary = {
  range: '30d',
  currency: 'USD',
  approvedMilestoneAmount: 0,
  invoicedAmount: 0,
  pendingPaymentAmount: 0,
  receivedPaymentAmount: 0,
  pendingPayoutAmount: 0,
  completedPayoutAmount: 0,
  pendingEarningsAmount: 0,
  hasFinancialData: false,
  timeSeries: [],
};

const EMPTY_TELEMETRY: DeveloperTelemetry = {
  totalRevenuePaid: 0,
  pendingInvoicesAmount: 0,
  activeMilestonesCount: 0,
  aiVerificationPassRate: 0,
  totalVerifications: 0,
  totalProjects: 0,
  totalMilestones: 0,
  milestonesInReview: 0,
  approvedMilestonesCount: 0,
  currency: 'USD',
  range: '30d',
  financials: EMPTY_FINANCIAL_SUMMARY,
  projects: [],
  aiAgents: [],
  recentActivity: [],
};

// Isolated in-memory demo state exclusively for Guest Mode
const demoProjects: Project[] = [...MOCK_PROJECTS];
const demoMilestones: Milestone[] = [...MOCK_MILESTONES];

export const devFlowApi = {
  /**
   * Fetch high-level workspace telemetry metrics
   */
  async getTelemetry(
    range: TelemetryRange = '30d',
    projectId?: string
  ): Promise<{ data: DeveloperTelemetry; isMock: boolean; error?: string }> {
    const { isGuest, token } = getSessionContext();
    if (isGuest) {
      return { data: MOCK_TELEMETRY, isMock: true };
    }
    if (!token) {
      return { data: EMPTY_TELEMETRY, isMock: false };
    }

    try {
      const qs = new URLSearchParams({ range });
      if (projectId) qs.set('projectId', projectId);
      const res = await fetch(`${BASE_URL}/telemetry?${qs.toString()}`, {
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        return { data, isMock: false };
      }
      const err = await res.json().catch(() => ({}));
      return {
        data: EMPTY_TELEMETRY,
        isMock: false,
        error: err?.error?.message || `Failed to load telemetry (${res.status}).`,
      };
    } catch (err: any) {
      return {
        data: EMPTY_TELEMETRY,
        isMock: false,
        error: err?.message || 'Unable to reach DevFlow backend telemetry endpoint.',
      };
    }
  },

  /**
   * Fetch all registered projects
   */
  async getProjects(): Promise<{ data: Project[]; isMock: boolean }> {
    const { isGuest, token } = getSessionContext();
    if (isGuest) {
      return { data: demoProjects, isMock: true };
    }
    if (!token) {
      return { data: [], isMock: false };
    }

    try {
      const res = await fetch(`${BASE_URL}/projects`, {
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) {
        const raw = await res.json();
        const list = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
        return { data: list.map(normalizeProject), isMock: false };
      }
    } catch {
      // Do not replace authenticated user view with demo fixtures
    }
    return { data: [], isMock: false };
  },

  /**
   * Create a new project (disabled in Guest Mode)
   */
  async createProject(
    projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'milestonesCount' | 'completedMilestonesCount'>
  ): Promise<{ data: Project; isMock: boolean }> {
    const { isGuest } = getSessionContext();
    if (isGuest) {
      throw new Error('Guest Mode: Creating projects requires signing in to an account.');
    }

    const parts = (projectData.githubRepo || '').trim().split('/').filter(Boolean);
    const repoFields =
      parts.length === 2
        ? { githubRepoOwner: parts[0], githubRepoName: parts[1] }
        : {};

    const res = await fetch(`${BASE_URL}/projects`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({
        title: projectData.name,
        description: projectData.description,
        budget: projectData.totalBudget,
        currency: projectData.currency,
        ...repoFields,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      return { data: normalizeProject(data), isMock: false };
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || err?.message || 'Failed to create project.');
  },

  /**
   * Create a new milestone (disabled in Guest Mode)
   */
  async createMilestone(
    milestoneData: Omit<Milestone, 'id' | 'commitsCount'>
  ): Promise<{ data: Milestone; isMock: boolean }> {
    const { isGuest } = getSessionContext();
    if (isGuest) {
      throw new Error('Guest Mode: Creating milestones requires signing in to an account.');
    }

    const res = await fetch(`${BASE_URL}/projects/${milestoneData.projectId}/milestones`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(milestoneData),
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      return { data: normalizeMilestone(data), isMock: false };
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || err?.message || 'Failed to create milestone.');
  },

  /**
   * Fetch project milestones
   */
  async getMilestones(projectId?: string): Promise<{ data: Milestone[]; isMock: boolean }> {
    const { isGuest, token } = getSessionContext();
    if (isGuest) {
      const filtered = projectId
        ? demoMilestones.filter((m) => m.projectId === projectId)
        : demoMilestones;
      return { data: filtered, isMock: true };
    }
    if (!token) {
      return { data: [], isMock: false };
    }

    try {
      const url = projectId ? `${BASE_URL}/projects/${projectId}/milestones` : `${BASE_URL}/milestones`;
      const res = await fetch(url, {
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) {
        const raw = await res.json();
        const list = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
        return { data: list.map(normalizeMilestone), isMock: false };
      }
    } catch {
      // Do not replace authenticated user view with demo fixtures
    }
    return { data: [], isMock: false };
  },

  /**
   * Fetch single milestone by ID
   */
  async getMilestoneById(id: string): Promise<{ data: Milestone | undefined; isMock: boolean }> {
    const { isGuest, token } = getSessionContext();
    if (isGuest) {
      return { data: demoMilestones.find((m) => m.id === id), isMock: true };
    }
    if (!token) {
      return { data: undefined, isMock: false };
    }

    try {
      const res = await fetch(`${BASE_URL}/milestones/${id}`, {
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) {
        const data = await res.json();
        return { data: normalizeMilestone(data), isMock: false };
      }
    } catch {
      // Fallback safely without demo leakage
    }
    return { data: undefined, isMock: false };
  },

  /**
   * Fetch recent GitHub commits
   */
  async getGitHubCommits(): Promise<{ data: GitHubCommitEvidence[]; isMock: boolean }> {
    const { isGuest, token } = getSessionContext();
    if (isGuest) {
      return { data: MOCK_COMMITS, isMock: true };
    }
    if (!token) {
      return { data: [], isMock: false };
    }

    try {
      const res = await fetch(`${BASE_URL}/github/commits`, {
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) {
        const data = await res.json();
        return { data, isMock: false };
      }
    } catch {
      // Do not replace authenticated user view with demo fixtures
    }
    return { data: [], isMock: false };
  },

  /**
   * Fetch GitHub Pull Requests
   */
  async getGitHubPullRequests(): Promise<{ data: GitHubPullRequestEvidence[]; isMock: boolean }> {
    const { isGuest, token } = getSessionContext();
    if (isGuest) {
      return { data: MOCK_PULL_REQUESTS, isMock: true };
    }
    if (!token) {
      return { data: [], isMock: false };
    }

    try {
      const res = await fetch(`${BASE_URL}/github/pulls`, {
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) {
        const data = await res.json();
        return { data, isMock: false };
      }
    } catch {
      // Do not replace authenticated user view with demo fixtures
    }
    return { data: [], isMock: false };
  },

  /**
   * Trigger AI Verification analysis for a milestone (read-only/restricted in Guest Mode)
   */
  async runAIVerification(milestoneId: string): Promise<{ data: AIVerificationReport; isMock: boolean }> {
    const { isGuest } = getSessionContext();
    if (isGuest) {
      throw new Error('Guest Mode: Triggering live AI verification requires signing in.');
    }

    const res = await fetch(`${BASE_URL}/ai/verify/${milestoneId}`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      const data = await res.json();
      return { data, isMock: false };
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || err?.message || 'Failed to run AI verification.');
  },

  /**
   * Submit Client Approval / Feedback (disabled in Guest Mode)
   */
  async submitClientApproval(
    milestoneId: string,
    status: 'approved' | 'changes_requested',
    feedback?: string
  ): Promise<{ success: boolean; isMock: boolean }> {
    const { isGuest } = getSessionContext();
    if (isGuest) {
      throw new Error('Guest Mode: Milestone approval requires signing in as a Client.');
    }

    const res = await fetch(`${BASE_URL}/milestones/${milestoneId}/approval`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ status, feedback }),
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      return { success: true, isMock: false };
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || err?.message || 'Failed to submit milestone approval.');
  },

  /**
   * Get all invoices across milestones
   */
  async getInvoices(): Promise<{ data: { milestone: Milestone; invoice: PayPalInvoice }[]; isMock: boolean }> {
    const { isGuest, token } = getSessionContext();
    if (isGuest) {
      const invoices = demoMilestones
        .filter((m) => m.invoice)
        .map((m) => ({ milestone: m, invoice: m.invoice! }));
      return { data: invoices, isMock: true };
    }
    if (!token) {
      return { data: [], isMock: false };
    }

    try {
      const res = await fetch(`${BASE_URL}/payments/invoices`, {
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) {
        const data = await res.json();
        return { data, isMock: false };
      }
    } catch {
      // Do not replace authenticated user view with demo fixtures
    }

    return { data: [], isMock: false };
  },

  /**
   * Generate PayPal Invoice for approved milestone (disabled in Guest Mode)
   */
  async generatePayPalInvoice(milestoneId: string): Promise<{ data: PayPalInvoice; isMock: boolean }> {
    const { isGuest } = getSessionContext();
    if (isGuest) {
      throw new Error('Guest Mode: Generating PayPal invoices requires signing in.');
    }

    const res = await fetch(`${BASE_URL}/payments/invoices/generate`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ milestoneId }),
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const data = await res.json();
      return { data, isMock: false };
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || err?.message || 'Failed to generate PayPal invoice.');
  },

  /**
   * Record verified PayPal Webhook payment event (disabled in Guest Mode)
   */
  async recordPayPalPaymentEvent(invoiceId: string): Promise<{ data: PayPalInvoice; isMock: boolean }> {
    const { isGuest } = getSessionContext();
    if (isGuest) {
      throw new Error('Guest Mode: Payment execution is disabled in Demo Mode.');
    }

    const res = await fetch(`${BASE_URL}/payments/webhooks/simulate-paid`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ invoiceId }),
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      return { data, isMock: false };
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || err?.message || 'Failed to record payment event.');
  },

  /**
   * Fetch live GitHub OAuth connection & repository scope status
   */
  async getGitHubStatus(): Promise<{
    data: GitHubConnectionStatus;
    isMock: boolean;
    error?: string;
  }> {
    const { isGuest, token } = getSessionContext();
    if (isGuest) {
      return {
        data: {
          oauthConfigured: false,
          webhookConfigured: false,
          connected: true,
          reauthRequired: false,
          username: 'alex-morgan-demo',
          githubId: 'demo-gh-1',
          avatarUrl: null,
          connectedAt: null,
          scopes: ['read:user', 'repo'],
          hasRepoScope: true,
          githubApiReachable: false,
          message: 'Guest Demo Mode uses simulated GitHub repository fixtures.',
        },
        isMock: true,
      };
    }
    if (!token) {
      return {
        data: {
          oauthConfigured: false,
          webhookConfigured: false,
          connected: false,
          reauthRequired: false,
          username: null,
          githubId: null,
          avatarUrl: null,
          connectedAt: null,
          scopes: [],
          hasRepoScope: false,
          githubApiReachable: false,
        },
        isMock: false,
      };
    }

    try {
      const res = await fetch(`${BASE_URL}/github/status`, {
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const data = (await res.json()) as GitHubConnectionStatus;
        return { data, isMock: false };
      }
      const err = await res.json().catch(() => ({}));
      return {
        data: {
          oauthConfigured: false,
          webhookConfigured: false,
          connected: false,
          reauthRequired: false,
          username: null,
          githubId: null,
          avatarUrl: null,
          connectedAt: null,
          scopes: [],
          hasRepoScope: false,
          githubApiReachable: false,
        },
        isMock: false,
        error: err?.error?.message || `Failed to inspect GitHub connection (${res.status}).`,
      };
    } catch (err: any) {
      return {
        data: {
          oauthConfigured: false,
          webhookConfigured: false,
          connected: false,
          reauthRequired: false,
          username: null,
          githubId: null,
          avatarUrl: null,
          connectedAt: null,
          scopes: [],
          hasRepoScope: false,
          githubApiReachable: false,
        },
        isMock: false,
        error: err?.message || 'Unable to check GitHub connection status.',
      };
    }
  },

  /**
   * Initiate authenticated GitHub OAuth flow returning the provider authorize URL
   */
  async initiateGitHubConnect(returnPath = '/dashboard'): Promise<{ authorizeUrl: string }> {
    const { isGuest, token } = getSessionContext();
    if (isGuest || !token) {
      throw new Error('Sign in with a Developer account to connect GitHub.');
    }

    const res = await fetch(`${BASE_URL}/github/oauth/connect`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ returnPath }),
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      return (await res.json()) as { authorizeUrl: string };
    }

    const err = await res.json().catch(() => ({}));
    throw new Error(
      err?.error?.message || 'Unable to initiate GitHub OAuth connection.'
    );
  },

  /**
   * Disconnect the authenticated user's GitHub OAuth token
   */
  async disconnectGitHub(): Promise<void> {
    const { isGuest, token } = getSessionContext();
    if (isGuest || !token) {
      throw new Error('Authentication required to disconnect GitHub.');
    }

    const res = await fetch(`${BASE_URL}/github/disconnect`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || 'Failed to disconnect GitHub.');
    }
  },

  /**
   * List repositories accessible by the authenticated user's GitHub token
   */
  async getGitHubRepositories(
    opts: { q?: string; page?: number; perPage?: number } = {}
  ): Promise<{
    data: GitHubRepositorySummary[];
    hasMore: boolean;
    error?: string;
    code?: string;
  }> {
    const { isGuest, token } = getSessionContext();
    if (isGuest || !token) {
      return { data: [], hasMore: false };
    }

    try {
      const qs = new URLSearchParams();
      if (opts.q) qs.set('q', opts.q);
      if (opts.page) qs.set('page', String(opts.page));
      if (opts.perPage) qs.set('perPage', String(opts.perPage));
      const res = await fetch(`${BASE_URL}/github/repos?${qs.toString()}`, {
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const json = await res.json();
        return {
          data: Array.isArray(json.repositories) ? json.repositories : [],
          hasMore: Boolean(json.hasMore),
        };
      }
      const err = await res.json().catch(() => ({}));
      return {
        data: [],
        hasMore: false,
        error: err?.error?.message || `Failed to load GitHub repositories (${res.status}).`,
        code: err?.error?.code,
      };
    } catch (err: any) {
      return {
        data: [],
        hasMore: false,
        error: err?.message || 'Unable to reach GitHub repository list endpoint.',
      };
    }
  },

  /**
   * Connect a real GitHub repository ("owner/repo") to a DevFlow project and sync
   */
  async connectProjectRepo(projectId: string, repoFullName: string): Promise<ProjectGitHubActivity> {
    const { isGuest, token } = getSessionContext();
    if (isGuest || !token) {
      throw new Error('Authentication required to connect a repository.');
    }

    const res = await fetch(`${BASE_URL}/github/projects/${projectId}/connect`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ repoFullName }),
      signal: AbortSignal.timeout(12000),
    });

    if (res.ok) {
      return (await res.json()) as ProjectGitHubActivity;
    }

    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Failed to connect GitHub repository to project.');
  },

  /**
   * Force or trigger GitHub repository activity synchronization for a project
   */
  async syncProjectRepo(projectId: string, force = true): Promise<ProjectGitHubActivity> {
    const { isGuest, token } = getSessionContext();
    if (isGuest || !token) {
      throw new Error('Authentication required to synchronize a repository.');
    }

    const res = await fetch(`${BASE_URL}/github/projects/${projectId}/sync`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ force }),
      signal: AbortSignal.timeout(12000),
    });

    if (res.ok) {
      return (await res.json()) as ProjectGitHubActivity;
    }

    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Failed to sync GitHub repository activity.');
  },

  /**
   * Read persisted & synced GitHub repository activity for a project
   */
  async getProjectGitHubActivity(projectId: string): Promise<{
    data: ProjectGitHubActivity | null;
    isMock: boolean;
    error?: string;
  }> {
    const { isGuest, token } = getSessionContext();
    if (isGuest || !token) {
      return { data: null, isMock: isGuest };
    }

    try {
      const res = await fetch(`${BASE_URL}/github/projects/${projectId}/activity`, {
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        return { data: (await res.json()) as ProjectGitHubActivity, isMock: false };
      }
      const err = await res.json().catch(() => ({}));
      return {
        data: null,
        isMock: false,
        error: err?.error?.message || `Failed to load project GitHub activity (${res.status}).`,
      };
    } catch (err: any) {
      return {
        data: null,
        isMock: false,
        error: err?.message || 'Unable to load project GitHub activity.',
      };
    }
  },

  /**
   * Fetch authoritative financial summary consistent across Dashboard, Payments, and Analytics
   */
  async getFinancialSummary(
    range: TelemetryRange = 'all',
    projectId?: string
  ): Promise<{
    data: FinancialSummary;
    isMock: boolean;
    paypalConfigured: boolean;
    paypalMode: string;
    error?: string;
  }> {
    const { isGuest, token } = getSessionContext();
    if (isGuest) {
      return {
        data: {
          range,
          currency: 'USD',
          approvedMilestoneAmount: 14000,
          invoicedAmount: 14000,
          pendingPaymentAmount: MOCK_TELEMETRY.pendingInvoicesAmount,
          receivedPaymentAmount: MOCK_TELEMETRY.totalRevenuePaid,
          pendingPayoutAmount: 0,
          completedPayoutAmount: MOCK_TELEMETRY.totalRevenuePaid,
          pendingEarningsAmount: MOCK_TELEMETRY.pendingInvoicesAmount,
          hasFinancialData: true,
          timeSeries: [],
        },
        isMock: true,
        paypalConfigured: false,
        paypalMode: 'sandbox',
      };
    }
    if (!token) {
      return {
        data: { ...EMPTY_FINANCIAL_SUMMARY, range },
        isMock: false,
        paypalConfigured: false,
        paypalMode: 'sandbox',
      };
    }

    try {
      const qs = new URLSearchParams({ range });
      if (projectId) qs.set('projectId', projectId);
      const res = await fetch(`${BASE_URL}/payments/summary?${qs.toString()}`, {
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const json = await res.json();
        return {
          data: json as FinancialSummary,
          isMock: false,
          paypalConfigured: Boolean(json.paypalConfigured),
          paypalMode: json.paypalMode || 'sandbox',
        };
      }
      const err = await res.json().catch(() => ({}));
      return {
        data: { ...EMPTY_FINANCIAL_SUMMARY, range },
        isMock: false,
        paypalConfigured: false,
        paypalMode: 'sandbox',
        error: err?.error?.message || `Failed to load financial summary (${res.status}).`,
      };
    } catch (err: any) {
      return {
        data: { ...EMPTY_FINANCIAL_SUMMARY, range },
        isMock: false,
        paypalConfigured: false,
        paypalMode: 'sandbox',
        error: err?.message || 'Unable to load financial summary.',
      };
    }
  },

  /**
   * Fetch database-backed user notifications
   */
  async getNotifications(): Promise<{
    data: NotificationItem[];
    unreadCount: number;
    isMock: boolean;
    error?: string;
  }> {
    const { isGuest, token } = getSessionContext();
    if (isGuest) {
      return {
        data: [
          {
            id: 'demo-notif-1',
            type: 'MILESTONE_APPROVED',
            title: 'Demo Milestone Approved',
            message: 'Simulated milestone verification completed in Demo Mode.',
            isRead: false,
            createdAt: new Date().toISOString(),
          },
        ],
        unreadCount: 1,
        isMock: true,
      };
    }
    if (!token) {
      return { data: [], unreadCount: 0, isMock: false };
    }

    try {
      const res = await fetch(`${BASE_URL}/notifications`, {
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const json = await res.json();
        const items = Array.isArray(json)
          ? json
          : Array.isArray(json?.items)
            ? json.items
            : Array.isArray(json?.notifications)
              ? json.notifications
              : [];
        const unreadCount =
          typeof json?.unreadCount === 'number'
            ? json.unreadCount
            : items.filter((n: NotificationItem) => !n.isRead).length;
        return { data: items, unreadCount, isMock: false };
      }
      const err = await res.json().catch(() => ({}));
      return {
        data: [],
        unreadCount: 0,
        isMock: false,
        error: err?.error?.message || `Failed to load notifications (${res.status}).`,
      };
    } catch (err: any) {
      return {
        data: [],
        unreadCount: 0,
        isMock: false,
        error: err?.message || 'Unable to reach notification service.',
      };
    }
  },

  async markNotificationRead(id: string): Promise<void> {
    const { isGuest, token } = getSessionContext();
    if (isGuest || !token) return;
    await fetch(`${BASE_URL}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(3000),
    });
  },

  async markAllNotificationsRead(): Promise<void> {
    const { isGuest, token } = getSessionContext();
    if (isGuest || !token) return;
    await fetch(`${BASE_URL}/notifications/read-all`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(3000),
    });
  },
};

function parseApiErrorMessage(payload: any, fallback: string): string {
  return payload?.error?.message || payload?.message || fallback;
}

export const resumeApi = {
  async getStudioState(): Promise<{ state: DeveloperStudioState; isDemo: boolean }> {
    const { isGuest, token } = getSessionContext();
    if (isGuest || !token) {
      throw new Error(
        isGuest
          ? 'Guest Demo sessions cannot access private database Resume Studio persistence. Sign in with a Developer account.'
          : 'Authentication required.'
      );
    }

    const res = await fetch(`${BASE_URL}/resumes/profile`, {
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(10000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(parseApiErrorMessage(json, `Failed to load Resume Studio (${res.status}).`));
    }
    return { state: json as DeveloperStudioState, isDemo: false };
  },

  async updateCareerProfile(payload: Record<string, unknown>): Promise<DeveloperStudioState> {
    const { isGuest, token } = getSessionContext();
    if (isGuest || !token) {
      throw new Error('Sign in with a verified Developer account to save career profile updates.');
    }
    const res = await fetch(`${BASE_URL}/resumes/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(true),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(parseApiErrorMessage(json, 'Failed to update career profile.'));
    }
    return json as DeveloperStudioState;
  },

  async syncGitHubSkills(): Promise<DeveloperStudioState> {
    const { isGuest, token } = getSessionContext();
    if (isGuest || !token) {
      throw new Error('Sign in as a Developer to sync GitHub languages into your career profile.');
    }
    const res = await fetch(`${BASE_URL}/resumes/github-sync`, {
      method: 'POST',
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(12000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(parseApiErrorMessage(json, 'GitHub career sync failed.'));
    }
    return json as DeveloperStudioState;
  },

  uploadResumeWithProgress(params: {
    file: File;
    replaceResumeId?: string;
    allowDuplicate?: boolean;
    onProgress?: (percent: number) => void;
    onAbortReady?: (abortFn: () => void) => void;
  }): Promise<{ resume: DeveloperResumeRecord }> {
    const { isGuest, token } = getSessionContext();
    if (isGuest || !token) {
      return Promise.reject(
        new Error('Guest Demo sessions cannot upload or parse private resume files.')
      );
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', params.file);
      if (params.replaceResumeId) formData.append('replaceResumeId', params.replaceResumeId);
      if (params.allowDuplicate) formData.append('allowDuplicate', 'true');

      if (params.onAbortReady) {
        params.onAbortReady(() => xhr.abort());
      }

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && params.onProgress) {
          const pct = Math.min(95, Math.round((event.loaded / event.total) * 100));
          params.onProgress(pct);
        }
      });

      xhr.addEventListener('load', () => {
        params.onProgress?.(100);
        let parsed: any = {};
        try {
          parsed = JSON.parse(xhr.responseText || '{}');
        } catch {
          parsed = {};
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(parsed as { resume: DeveloperResumeRecord });
        } else {
          const err = new Error(
            parseApiErrorMessage(parsed, `Resume upload failed (${xhr.status}).`)
          ) as Error & { code?: string; status?: number };
          err.code = parsed?.error?.code;
          err.status = xhr.status;
          reject(err);
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error while uploading resume file.'));
      });

      xhr.addEventListener('abort', () => {
        const err = new Error('Upload cancelled by user.') as Error & { code?: string };
        err.code = 'ABORTED';
        reject(err);
      });

      xhr.open('POST', `${BASE_URL}/resumes/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  },

  async reparseResume(resumeId: string): Promise<DeveloperResumeRecord> {
    const res = await fetch(`${BASE_URL}/resumes/${resumeId}/parse`, {
      method: 'POST',
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(20000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(parseApiErrorMessage(json, 'Failed to re-run AI resume extraction.'));
    }
    return json.resume as DeveloperResumeRecord;
  },

  async reviewAndApplyResumeExtraction(
    resumeId: string,
    payload: Record<string, unknown>
  ): Promise<DeveloperStudioState> {
    const res = await fetch(`${BASE_URL}/resumes/${resumeId}/review`, {
      method: 'PUT',
      headers: getAuthHeaders(true),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(parseApiErrorMessage(json, 'Failed to apply reviewed resume details.'));
    }
    return json as DeveloperStudioState;
  },

  async setPrimaryResume(resumeId: string): Promise<DeveloperStudioState> {
    const res = await fetch(`${BASE_URL}/resumes/${resumeId}/set-primary`, {
      method: 'POST',
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(8000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(parseApiErrorMessage(json, 'Failed to set primary resume.'));
    }
    return json as DeveloperStudioState;
  },

  async deleteResume(resumeId: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/resumes/${resumeId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(parseApiErrorMessage(json, 'Failed to delete resume.'));
    }
  },

  async downloadResumeFile(resumeId: string, fallbackFileName = 'resume'): Promise<void> {
    const res = await fetch(`${BASE_URL}/resumes/${resumeId}/download`, {
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(parseApiErrorMessage(json, 'You are not authorized to download this resume.'));
    }
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="?([^"]+)"?/i);
    const filename = match?.[1] || fallbackFileName;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  async previewTemplateResume(
    templateId: string,
    customSections?: Record<string, unknown>
  ): Promise<StructuredResumePreviewDocument> {
    const res = await fetch(`${BASE_URL}/resumes/generate`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ templateId, customSections }),
      signal: AbortSignal.timeout(10000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(parseApiErrorMessage(json, 'Failed to generate resume preview.'));
    }
    return json.document as StructuredResumePreviewDocument;
  },

  async exportFormattedResume(
    templateId: string,
    format: 'pdf' | 'docx',
    customSections?: Record<string, unknown>
  ): Promise<void> {
    const res = await fetch(`${BASE_URL}/resumes/export`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ templateId, format, customSections }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(parseApiErrorMessage(json, `Failed to export ${format.toUpperCase()} resume.`));
    }
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="?([^"]+)"?/i);
    const filename = match?.[1] || `devflow-resume.${format}`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

export const marketplaceApi = {
  async searchDevelopers(params: Record<string, string | number | undefined>): Promise<{
    developers: MarketplaceDeveloperCard[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const { isGuest, token } = getSessionContext();
    if (isGuest || !token) {
      return { developers: [], pagination: { total: 0, page: 1, limit: 12, totalPages: 1 } };
    }
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    });
    const res = await fetch(`${BASE_URL}/marketplace/developers?${qs.toString()}`, {
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(10000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(parseApiErrorMessage(json, 'Failed to search developers.'));
    }
    return json;
  },

  async aiMatchDevelopers(payload: {
    query: string;
    opportunityId?: string;
    availability?: string;
    minYears?: number;
    maxHourlyRate?: number;
    limit?: number;
  }): Promise<{
    query: string;
    extractedRequirements: {
      mandatorySkills: string[];
      preferredSkills: string[];
      minYearsExperience?: number | null;
      domainKeywords: string[];
      scopeSummary: string;
    };
    aiModelName: string;
    disclaimer: string;
    developers: MarketplaceDeveloperCard[];
  }> {
    const { isGuest, token } = getSessionContext();
    if (isGuest || !token) {
      throw new Error('Sign in with a verified Client account to run AI Talent Matching.');
    }
    const res = await fetch(`${BASE_URL}/marketplace/developers/match`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(parseApiErrorMessage(json, 'AI Talent Matching failed.'));
    }
    return json;
  },

  async getDeveloperProfileDetail(profileId: string): Promise<MarketplaceDeveloperCard> {
    const res = await fetch(`${BASE_URL}/marketplace/developers/${profileId}`, {
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(8000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(parseApiErrorMessage(json, 'Failed to load developer profile.'));
    }
    return json.profile as MarketplaceDeveloperCard;
  },

  async aiRefineOpportunity(payload: {
    title: string;
    description: string;
    expectedDuration?: string;
    budgetMin?: number;
    budgetMax?: number;
  }): Promise<{
    suggestion: {
      improvedDescription: string;
      deliverables: string[];
      mandatorySkills: Array<{ name: string; category: string }>;
      preferredSkills: Array<{ name: string; category: string }>;
      recommendedExperienceLevel: string;
      estimatedMinYears?: number | null;
    };
    modelName: string;
    requiresClientApproval: boolean;
  }> {
    const res = await fetch(`${BASE_URL}/marketplace/opportunities/ai-refine`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(parseApiErrorMessage(json, 'AI refinement failed.'));
    }
    return json;
  },

  async createOpportunity(payload: Record<string, unknown>): Promise<MarketplaceOpportunityItem> {
    const res = await fetch(`${BASE_URL}/marketplace/opportunities`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(parseApiErrorMessage(json, 'Failed to create opportunity.'));
    }
    return json.opportunity as MarketplaceOpportunityItem;
  },

  async updateOpportunity(
    opportunityId: string,
    payload: Record<string, unknown>
  ): Promise<MarketplaceOpportunityItem> {
    const res = await fetch(`${BASE_URL}/marketplace/opportunities/${opportunityId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(true),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(parseApiErrorMessage(json, 'Failed to update opportunity.'));
    }
    return json.opportunity as MarketplaceOpportunityItem;
  },

  async publishOpportunity(
    opportunityId: string,
    visibility: 'DISCOVERABLE' | 'INVITE_ONLY'
  ): Promise<MarketplaceOpportunityItem> {
    const res = await fetch(`${BASE_URL}/marketplace/opportunities/${opportunityId}/publish`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ visibility }),
      signal: AbortSignal.timeout(8000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(parseApiErrorMessage(json, 'Failed to publish opportunity.'));
    }
    return json.opportunity as MarketplaceOpportunityItem;
  },

  async unpublishOpportunity(opportunityId: string): Promise<MarketplaceOpportunityItem> {
    const res = await fetch(`${BASE_URL}/marketplace/opportunities/${opportunityId}/unpublish`, {
      method: 'POST',
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(8000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(parseApiErrorMessage(json, 'Failed to unpublish opportunity.'));
    }
    return json.opportunity as MarketplaceOpportunityItem;
  },

  async searchOpportunities(params: Record<string, string | number | boolean | undefined>): Promise<{
    opportunities: MarketplaceOpportunityItem[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const { isGuest, token } = getSessionContext();
    if (isGuest || !token) {
      return { opportunities: [], pagination: { total: 0, page: 1, limit: 15, totalPages: 1 } };
    }
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    });
    const res = await fetch(`${BASE_URL}/marketplace/opportunities?${qs.toString()}`, {
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(10000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(parseApiErrorMessage(json, 'Failed to load marketplace opportunities.'));
    }
    return json;
  },

  async toggleSaveOpportunity(opportunityId: string, save: boolean): Promise<{ saved: boolean }> {
    const res = await fetch(`${BASE_URL}/marketplace/opportunities/${opportunityId}/save`, {
      method: save ? 'POST' : 'DELETE',
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(6000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(parseApiErrorMessage(json, 'Failed to update saved state.'));
    }
    return json;
  },

  async applyToOpportunity(
    opportunityId: string,
    payload: {
      proposal: string;
      proposedBudget?: number | null;
      currency?: string;
      estimatedTimeline?: string | null;
      selectedPortfolioIds?: string[];
      allowResumeDownload: boolean;
    }
  ): Promise<OpportunityApplicationRecord> {
    const res = await fetch(`${BASE_URL}/marketplace/opportunities/${opportunityId}/apply`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(parseApiErrorMessage(json, 'Failed to submit application.'));
    }
    return json.application as OpportunityApplicationRecord;
  },

  async getMyApplications(): Promise<OpportunityApplicationRecord[]> {
    const { isGuest, token } = getSessionContext();
    if (isGuest || !token) return [];
    const res = await fetch(`${BASE_URL}/marketplace/applications/mine`, {
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(10000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(parseApiErrorMessage(json, 'Failed to load your applications.'));
    }
    return (json.applications || []) as OpportunityApplicationRecord[];
  },

  async withdrawApplication(applicationId: string): Promise<OpportunityApplicationRecord> {
    const res = await fetch(`${BASE_URL}/marketplace/applications/${applicationId}/withdraw`, {
      method: 'POST',
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(8000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(parseApiErrorMessage(json, 'Failed to withdraw application.'));
    }
    return json.application as OpportunityApplicationRecord;
  },

  async getOpportunityApplications(opportunityId: string): Promise<{
    opportunity: MarketplaceOpportunityItem;
    applications: OpportunityApplicationRecord[];
  }> {
    const res = await fetch(`${BASE_URL}/marketplace/opportunities/${opportunityId}/applications`, {
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(10000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(parseApiErrorMessage(json, 'Failed to load applicants.'));
    }
    return json;
  },

  async updateApplicationStatus(
    applicationId: string,
    status: 'UNDER_REVIEW' | 'SHORTLISTED' | 'INTERVIEWING' | 'ACCEPTED' | 'REJECTED',
    clientNotes?: string
  ): Promise<OpportunityApplicationRecord> {
    const res = await fetch(`${BASE_URL}/marketplace/applications/${applicationId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ status, clientNotes }),
      signal: AbortSignal.timeout(8000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(parseApiErrorMessage(json, 'Failed to update application status.'));
    }
    return json.application as OpportunityApplicationRecord;
  },

  async compareCandidates(
    opportunityId: string,
    payload: { applicationIds?: string[]; profileIds?: string[] }
  ): Promise<{
    opportunity: Record<string, unknown>;
    isAdvisoryOnly: boolean;
    disclaimer: string;
    candidates: Array<{
      applicationId: string | null;
      applicationStatus: string | null;
      proposedBudget: number | null;
      currency: string;
      candidate: MarketplaceDeveloperCard;
      assessment: CandidateMatchAssessmentItem;
    }>;
  }> {
    const res = await fetch(`${BASE_URL}/marketplace/opportunities/${opportunityId}/compare`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(parseApiErrorMessage(json, 'Candidate comparison failed.'));
    }
    return json;
  },
};

