import {
  Project,
  Milestone,
  DeveloperTelemetry,
  GitHubCommitEvidence,
  GitHubPullRequestEvidence,
  PayPalInvoice,
  AIVerificationReport,
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
    clientName: raw.clientName || raw.client?.name || 'Client Workspace',
    clientEmail: raw.clientEmail || raw.client?.email || '',
    githubRepo:
      raw.githubRepo ||
      (raw.githubRepoOwner && raw.githubRepoName
        ? `${raw.githubRepoOwner}/${raw.githubRepoName}`
        : ''),
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

const EMPTY_TELEMETRY: DeveloperTelemetry = {
  totalRevenuePaid: 0,
  pendingInvoicesAmount: 0,
  activeMilestonesCount: 0,
  aiVerificationPassRate: 0,
  totalProjects: 0,
  currency: 'USD',
};

// Isolated in-memory demo state exclusively for Guest Mode
const demoProjects: Project[] = [...MOCK_PROJECTS];
const demoMilestones: Milestone[] = [...MOCK_MILESTONES];

export const devFlowApi = {
  /**
   * Fetch high-level workspace telemetry metrics
   */
  async getTelemetry(): Promise<{ data: DeveloperTelemetry; isMock: boolean }> {
    const { isGuest, token } = getSessionContext();
    if (isGuest) {
      return { data: MOCK_TELEMETRY, isMock: true };
    }
    if (!token) {
      return { data: EMPTY_TELEMETRY, isMock: false };
    }

    try {
      const res = await fetch(`${BASE_URL}/telemetry`, {
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) {
        const data = await res.json();
        return { data, isMock: false };
      }
    } catch {
      // Backend service unreachable
    }
    return { data: EMPTY_TELEMETRY, isMock: false };
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

    const res = await fetch(`${BASE_URL}/projects`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({
        title: projectData.name,
        description: projectData.description,
        budget: projectData.totalBudget,
        currency: projectData.currency,
      }),
      signal: AbortSignal.timeout(3000),
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
};
