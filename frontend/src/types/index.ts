// DevFlow Domain Models & API Contracts

export type MilestoneStatus =
  | 'draft'
  | 'in_progress'
  | 'evidence_submitted'
  | 'ai_analyzing'
  | 'ai_verified'
  | 'client_review'
  | 'client_approved'
  | 'invoiced'
  | 'paid'
  | 'rejected';

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED';

export interface Project {
  id: string;
  name: string;
  description: string;
  clientName: string;
  clientEmail: string;
  githubRepo: string; // e.g. "northstar-studio/payment-gateway"
  totalBudget: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  milestonesCount: number;
  completedMilestonesCount: number;
}

export interface Requirement {
  id: string;
  milestoneId: string;
  title: string;
  description: string;
  satisfied: boolean;
  aiConfidence?: number; // 0 to 100
  evidenceSource?: string; // Commit SHA or PR link
  verifiedCommitSha?: string;
}

export interface DiffLine {
  type: 'added' | 'removed' | 'context' | 'header';
  content: string;
  lineNumber?: number;
}

export interface ChangedFile {
  filename: string;
  additions: number;
  deletions: number;
  diff: DiffLine[];
}

export interface GitHubCommitEvidence {
  sha: string;
  message: string;
  author: string;
  authorAvatar?: string;
  date: string;
  url: string;
  filesChanged: number;
  additions: number;
  deletions: number;
  linkedRequirementId?: string;
  changedFiles?: ChangedFile[];
}

export interface TestSuiteResult {
  name: string;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  tests: { name: string; status: 'passed' | 'failed' | 'skipped'; durationMs: number }[];
}

export interface GitHubPullRequestEvidence {
  id?: string;
  number: number;
  title: string;
  author: string;
  authorAvatar?: string;
  state: 'open' | 'closed' | 'merged';
  url: string;
  createdAt?: string;
  mergedAt?: string;
  headRef?: string;
  baseRef?: string;
  additions?: number;
  deletions?: number;
  commitsCount?: number;
}

export interface AIVerificationReport {
  id: string;
  milestoneId: string;
  overallScore?: number; // 0 - 100
  status?: 'passed' | 'review_required' | 'failed';
  overallStatus?: string;
  summary: string;
  confidence?: number;
  confidenceScore?: number;
  analyzedAt?: string;
  evaluatedAt?: string;
  engineVersion?: string;
  commitsSampled?: number;
  testSuiteResult?: TestSuiteResult;
  automatedChecks?: any;
  criteriaBreakdown?: any[];
  requirementsAnalysis?: {
    requirementId: string;
    requirementTitle: string;
    status: 'satisfied' | 'partial' | 'unsatisfied';
    score: number;
    explanation: string;
    matchedCommits: string[]; // SHAs
    missingEvidence?: string;
  }[];
  recommendations: string[];
  disclaimer?: string;
}

export interface ClientApproval {
  id: string;
  milestoneId: string;
  approvedBy: string;
  approvedAt?: string;
  status: 'pending' | 'approved' | 'changes_requested';
  feedback?: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PaymentTimelineEvent {
  event: string;
  timestamp: string;
  description: string;
  actor?: string;
  referenceId?: string;
}

export interface PayPalInvoice {
  id: string;
  invoiceNumber: string;
  milestoneId: string;
  projectId: string;
  recipientEmail: string;
  recipientName: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  paypalInvoiceId?: string; // Real PayPal Sandbox Invoice ID
  createdAt: string;
  dueDate?: string;
  sentAt?: string;
  paidAt?: string;
  paypalWebhookEventId?: string; // Verified webhook ID
  paymentMethod?: string;
  items?: InvoiceLineItem[];
  subtotal?: number;
  tax?: number;
  notes?: string;
  timeline?: PaymentTimelineEvent[];
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description: string;
  order: number;
  amount: number;
  currency: string;
  dueDate: string;
  status: MilestoneStatus;
  requirements: Requirement[];
  githubBranch?: string;
  aiReport?: AIVerificationReport;
  clientApproval?: ClientApproval;
  invoice?: PayPalInvoice;
  commitsCount: number;
}

export interface DeveloperTelemetry {
  totalRevenuePaid: number;
  pendingInvoicesAmount: number;
  activeMilestonesCount: number;
  aiVerificationPassRate: number; // e.g. 96
  totalProjects: number;
  currency: string;
}

// User & Role-Based Authentication Types
export type UserRole = 'CLIENT' | 'DEVELOPER' | 'ADMIN' | 'GUEST';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string | null;
  bio?: string | null;
  organization?: string;
  createdAt?: string;
  isGuest?: boolean;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
}
