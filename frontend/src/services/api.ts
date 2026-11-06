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

// In-memory state for interactive client modifications during the session
let localProjects: Project[] = [...MOCK_PROJECTS];
let localMilestones: Milestone[] = [...MOCK_MILESTONES];

export const devFlowApi = {
  /**
   * Fetch high-level developer telemetry metrics
   */
  async getTelemetry(): Promise<{ data: DeveloperTelemetry; isMock: boolean }> {
    try {
      const res = await fetch(`${BASE_URL}/telemetry`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        const data = await res.json();
        return { data, isMock: false };
      }
    } catch {
      // Backend service not reachable or endpoint not yet registered
    }
    return { data: MOCK_TELEMETRY, isMock: true };
  },

  /**
   * Fetch all registered projects
   */
  async getProjects(): Promise<{ data: Project[]; isMock: boolean }> {
    try {
      const res = await fetch(`${BASE_URL}/projects`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        const data = await res.json();
        return { data, isMock: false };
      }
    } catch {
      // Fallback
    }
    return { data: localProjects, isMock: true };
  },

  /**
   * Create a new project
   */
  async createProject(
    projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'milestonesCount' | 'completedMilestonesCount'>
  ): Promise<{ data: Project; isMock: boolean }> {
    try {
      const res = await fetch(`${BASE_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = await res.json();
        return { data, isMock: false };
      }
    } catch {
      // Fallback
    }

    const newProject: Project = {
      ...projectData,
      id: `proj_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      milestonesCount: 0,
      completedMilestonesCount: 0,
    };
    localProjects = [newProject, ...localProjects];
    return { data: newProject, isMock: true };
  },

  /**
   * Create a new milestone
   */
  async createMilestone(
    milestoneData: Omit<Milestone, 'id' | 'commitsCount'>
  ): Promise<{ data: Milestone; isMock: boolean }> {
    try {
      const res = await fetch(`${BASE_URL}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(milestoneData),
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = await res.json();
        return { data, isMock: false };
      }
    } catch {
      // Fallback
    }

    const newMilestone: Milestone = {
      ...milestoneData,
      id: `ms_${Date.now()}`,
      commitsCount: 0,
    };
    localMilestones = [...localMilestones, newMilestone];
    return { data: newMilestone, isMock: true };
  },

  /**
   * Fetch project milestones
   */
  async getMilestones(projectId?: string): Promise<{ data: Milestone[]; isMock: boolean }> {
    try {
      const url = projectId ? `${BASE_URL}/projects/${projectId}/milestones` : `${BASE_URL}/milestones`;
      const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        const data = await res.json();
        return { data, isMock: false };
      }
    } catch {
      // Fallback
    }
    const filtered = projectId
      ? localMilestones.filter((m) => m.projectId === projectId)
      : localMilestones;
    return { data: filtered, isMock: true };
  },

  /**
   * Fetch single milestone by ID
   */
  async getMilestoneById(id: string): Promise<{ data: Milestone | undefined; isMock: boolean }> {
    try {
      const res = await fetch(`${BASE_URL}/milestones/${id}`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        const data = await res.json();
        return { data, isMock: false };
      }
    } catch {
      // Fallback
    }
    const found = localMilestones.find((m) => m.id === id);
    return { data: found, isMock: true };
  },

  /**
   * Fetch recent GitHub commits
   */
  async getGitHubCommits(): Promise<{ data: GitHubCommitEvidence[]; isMock: boolean }> {
    try {
      const res = await fetch(`${BASE_URL}/github/commits`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        const data = await res.json();
        return { data, isMock: false };
      }
    } catch {
      // Fallback
    }
    return { data: MOCK_COMMITS, isMock: true };
  },

  /**
   * Fetch GitHub Pull Requests
   */
  async getGitHubPullRequests(): Promise<{ data: GitHubPullRequestEvidence[]; isMock: boolean }> {
    try {
      const res = await fetch(`${BASE_URL}/github/pulls`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        const data = await res.json();
        return { data, isMock: false };
      }
    } catch {
      // Fallback
    }
    return { data: MOCK_PULL_REQUESTS, isMock: true };
  },

  /**
   * Trigger AI Verification analysis for a milestone
   */
  async runAIVerification(milestoneId: string): Promise<{ data: AIVerificationReport; isMock: boolean }> {
    try {
      const res = await fetch(`${BASE_URL}/ai/verify/${milestoneId}`, {
        method: 'POST',
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) {
        const data = await res.json();
        return { data, isMock: false };
      }
    } catch {
      // Fallback simulated execution
    }

    const report: AIVerificationReport = {
      id: `ai_rep_${Date.now()}`,
      milestoneId,
      overallScore: 92,
      status: 'passed',
      summary:
        'Analyzed 4 matching GitHub commits. Code implementation satisfies technical criteria. Test suites pass.',
      confidence: 92,
      analyzedAt: new Date().toISOString(),
      engineVersion: 'DevFlow-AI v0.1.0 (Gemini Pro)',
      commitsSampled: 4,
      disclaimer:
        'AI analysis provides automated pattern matching only. AI confidence is NOT proof of correctness. AI verification is NOT client approval. Human review is required before any payment action.',
      requirementsAnalysis: [
        {
          requirementId: 'req_auto_01',
          requirementTitle: 'Core Implementation',
          status: 'satisfied',
          score: 94,
          explanation: 'Syntactic matching with commit diff confirmed.',
          matchedCommits: ['54813f0a9b8c7d6e'],
          missingEvidence: undefined,
        },
      ],
      recommendations: ['Requires human-in-the-loop client sign-off before invoice generation.'],
    };

    localMilestones = localMilestones.map((m) =>
      m.id === milestoneId ? { ...m, status: 'ai_verified', aiReport: report } : m
    );

    return { data: report, isMock: true };
  },

  /**
   * Submit Client Approval / Feedback
   */
  async submitClientApproval(
    milestoneId: string,
    status: 'approved' | 'changes_requested',
    feedback?: string
  ): Promise<{ success: boolean; isMock: boolean }> {
    try {
      const res = await fetch(`${BASE_URL}/milestones/${milestoneId}/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, feedback }),
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        return { success: true, isMock: false };
      }
    } catch {
      // Fallback
    }

    localMilestones = localMilestones.map((m) => {
      if (m.id === milestoneId) {
        return {
          ...m,
          status: status === 'approved' ? 'client_approved' : 'evidence_submitted',
          clientApproval: {
            id: `appr_${Date.now()}`,
            milestoneId,
            approvedBy: 'Client Representative',
            approvedAt: status === 'approved' ? new Date().toISOString() : undefined,
            status,
            feedback,
          },
        };
      }
      return m;
    });

    return { success: true, isMock: true };
  },

  /**
   * Get all invoices across milestones
   */
  async getInvoices(): Promise<{ data: { milestone: Milestone; invoice: PayPalInvoice }[]; isMock: boolean }> {
    try {
      const res = await fetch(`${BASE_URL}/payments/invoices`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = await res.json();
        return { data, isMock: false };
      }
    } catch {
      // Fallback
    }

    const invoices = localMilestones
      .filter((m) => m.invoice)
      .map((m) => ({ milestone: m, invoice: m.invoice! }));

    return { data: invoices, isMock: true };
  },

  /**
   * Generate PayPal Invoice for approved milestone
   */
  async generatePayPalInvoice(milestoneId: string): Promise<{ data: PayPalInvoice; isMock: boolean }> {
    try {
      const res = await fetch(`${BASE_URL}/payments/invoices/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestoneId }),
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = await res.json();
        return { data, isMock: false };
      }
    } catch {
      // Fallback
    }

    const milestone = localMilestones.find((m) => m.id === milestoneId);
    const invoice: PayPalInvoice = {
      id: `inv_${Date.now()}`,
      invoiceNumber: `INV-DEVFLOW-00${localMilestones.length + 1}`,
      milestoneId,
      projectId: milestone?.projectId || 'proj_devflow_01',
      recipientEmail: 'alex.mercer@fintechventures.io',
      recipientName: 'Alex Mercer',
      amount: milestone?.amount || 2500.0,
      currency: 'USD',
      status: 'SENT', // Invoice sent, not paid yet!
      paypalInvoiceId: `INV2-${Math.random().toString(36).substring(2, 6).toUpperCase()}-SANDBOX`,
      createdAt: new Date().toISOString(),
      sentAt: new Date().toISOString(),
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
      subtotal: milestone?.amount || 2500.0,
      tax: 0,
      notes: `Invoice generated for deliverable: ${milestone?.title || 'Milestone deliverable'}`,
      items: [
        {
          id: `item_${Date.now()}`,
          description: milestone?.title || 'Milestone Deliverable Execution',
          quantity: 1,
          unitPrice: milestone?.amount || 2500.0,
          total: milestone?.amount || 2500.0,
        },
      ],
      timeline: [
        {
          event: 'INVOICE_CREATED',
          timestamp: new Date().toISOString(),
          description: 'Invoice created with PayPal Invoicing REST API v2',
          actor: 'DevFlow Billing Agent',
        },
        {
          event: 'INVOICE_SENT',
          timestamp: new Date().toISOString(),
          description: 'Dispatched to alex.mercer@fintechventures.io',
          actor: 'PayPal Gateway',
        },
      ],
    };

    localMilestones = localMilestones.map((m) =>
      m.id === milestoneId ? { ...m, status: 'invoiced', invoice } : m
    );

    return { data: invoice, isMock: true };
  },

  /**
   * Record verified PayPal Webhook payment event
   */
  async recordPayPalPaymentEvent(invoiceId: string): Promise<{ data: PayPalInvoice; isMock: boolean }> {
    try {
      const res = await fetch(`${BASE_URL}/payments/webhooks/simulate-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId }),
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = await res.json();
        return { data, isMock: false };
      }
    } catch {
      // Fallback
    }

    let updatedInvoice: PayPalInvoice | undefined;

    localMilestones = localMilestones.map((m) => {
      if (m.invoice && (m.invoice.id === invoiceId || m.invoice.paypalInvoiceId === invoiceId)) {
        updatedInvoice = {
          ...m.invoice,
          status: 'PAID',
          paidAt: new Date().toISOString(),
          paypalWebhookEventId: `WH-${Math.random().toString(36).substring(2, 10).toUpperCase()}-VERIFIED`,
          paymentMethod: 'PayPal Instant Settlement',
        };
        return { ...m, status: 'paid', invoice: updatedInvoice };
      }
      return m;
    });

    if (!updatedInvoice) {
      throw new Error(`Invoice with ID ${invoiceId} not found.`);
    }

    return { data: updatedInvoice, isMock: true };
  },
};
