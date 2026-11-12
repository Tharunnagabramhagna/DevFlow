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
  githubRepoOwner?: string | null;
  githubRepoName?: string | null;
  githubDefaultBranch?: string | null;
  githubVisibility?: string | null;
  githubSyncStatus?: 'NOT_CONNECTED' | 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'REAUTH_REQUIRED' | string | null;
  githubSyncedAt?: string | null;
  githubSyncError?: string | null;
  githubLastCommitSha?: string | null;
  githubLastCommitMessage?: string | null;
  githubLastCommitAt?: string | null;
  status?: string;
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
  url: string | null;
  filesChanged?: number | null;
  additions?: number | null;
  deletions?: number | null;
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
  number: number | null;
  title: string;
  author: string;
  authorAvatar?: string;
  state: 'open' | 'closed' | 'merged';
  url: string | null;
  createdAt?: string;
  mergedAt?: string;
  headRef?: string;
  baseRef?: string;
  additions?: number | null;
  deletions?: number | null;
  commitsCount?: number | null;
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

export type TelemetryRange = '7d' | '30d' | '90d' | 'all';

export interface FinancialTimeSeriesPoint {
  label: string;
  isoDate: string;
  received: number;
  pending: number;
  disbursed: number;
}

export interface FinancialSummary {
  range: TelemetryRange;
  currency: string;
  approvedMilestoneAmount: number;
  invoicedAmount: number;
  pendingPaymentAmount: number;
  receivedPaymentAmount: number;
  pendingPayoutAmount: number;
  completedPayoutAmount: number;
  pendingEarningsAmount: number;
  hasFinancialData: boolean;
  timeSeries: FinancialTimeSeriesPoint[];
}

export interface AIAgentStatusItem {
  agentType: string;
  code: string;
  label: string;
  description: string;
  status: 'IDLE' | 'COMPLETED' | 'FAILED' | 'UNAVAILABLE';
  providerMode: 'GEMINI_LIVE' | 'FALLBACK_MOCK';
  modelUsed: string | null;
  confidenceScore: number | null;
  summary: string | null;
  errorMessage: string | null;
  lastRunAt: string | null;
  totalRuns: number;
}

export interface DashboardActivityItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  projectId: string;
  projectTitle: string | null;
  actorName: string;
  details: Record<string, any>;
  createdAt: string;
}

export interface DashboardProjectSummary {
  id: string;
  title: string;
  status: string;
  clientName: string | null;
  leadDeveloperName: string | null;
  progress: number;
  totalMilestones: number;
  completedMilestones: number;
  milestonesInReview: number;
  currentDeliverable: string | null;
  currentMilestoneId: string | null;
  targetDate: string | null;
  githubRepoOwner: string | null;
  githubRepoName: string | null;
  githubSyncStatus: string;
  githubSyncedAt: string | null;
  githubLastCommitSha: string | null;
  githubLastCommitMessage: string | null;
  githubLastCommitAt: string | null;
}

export interface GitHubAppInstallationInfo {
  id: string;
  installationId: number;
  accountId: number;
  accountLogin: string;
  accountType: string;
  repositorySelection: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'UNINSTALLED' | string;
  authorizedRepoCount?: number;
}

export interface GitHubIntegrationOverview {
  identityConnected: boolean;
  identityUsername: string | null;
  appInstalled: boolean;
  appInstallation: GitHubAppInstallationInfo | null;
  authorizedRepoCount: number;
}

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
  appInstalled?: boolean;
  appInstallation?: GitHubAppInstallationInfo | null;
  authorizedRepoCount?: number;
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

export interface ProjectGitHubActivity {
  projectId: string;
  projectTitle: string;
  repoLinked: boolean;
  repository: {
    owner: string;
    name: string;
    fullName: string;
    defaultBranch: string | null;
    visibility: string | null;
    htmlUrl: string;
    description: string | null;
    language: string | null;
    openIssuesCount: number | null;
    pushedAt: string | null;
  } | null;
  syncStatus: string;
  syncError: string | null;
  lastSyncedAt: string | null;
  lastCommit: {
    sha: string;
    shortSha: string;
    message: string | null;
    at: string | null;
  } | null;
  commits: Array<{
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
  }>;
  pullRequests: Array<{
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
  }>;
  issues: Array<{
    id: number;
    number: number;
    title: string;
    state: 'open' | 'closed';
    author: string;
    url: string;
    createdAt: string;
    updatedAt: string | null;
  }>;
  latestCommitFiles?: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
  }>;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  linkUrl?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface DeveloperTelemetry {
  totalRevenuePaid: number;
  pendingInvoicesAmount: number;
  activeMilestonesCount: number;
  aiVerificationPassRate: number;
  totalVerifications?: number;
  totalProjects: number;
  totalMilestones?: number;
  milestonesInReview?: number;
  approvedMilestonesCount?: number;
  currency: string;
  range?: TelemetryRange;
  financials?: FinancialSummary;
  projects?: DashboardProjectSummary[];
  aiAgents?: AIAgentStatusItem[];
  recentActivity?: DashboardActivityItem[];
  integrations?: {
    github: {
      oauthConfigured: boolean;
      webhookConfigured: boolean;
      connected: boolean;
      username: string | null;
      connectedAt: string | null;
      appInstalled?: boolean;
      appInstallation?: GitHubAppInstallationInfo | null;
      authorizedRepoCount?: number;
    };
    paypal: {
      configured: boolean;
      mode: 'sandbox' | 'live' | string;
    };
    ai: {
      provider: string;
      geminiConfigured: boolean;
      liveMode: boolean;
    };
  };
}

// User & Role-Based Authentication Types
export type EffectiveRole = 'CLIENT' | 'DEVELOPER';
export type UserRole = 'CLIENT' | 'DEVELOPER' | 'ADMIN' | 'GUEST';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string | null;
  bio?: string | null;
  organization?: string;
  githubConnected?: boolean;
  githubUsername?: string | null;
  githubConnectedAt?: string | null;
  createdAt?: string;
  isGuest?: boolean;
  guestPersona?: 'CLIENT' | 'DEVELOPER' | null;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
}

// =========================================================================
// Feature 1: Developer Resume Studio Types
// =========================================================================
export type ProfileVisibilityType = 'PRIVATE' | 'MARKETPLACE' | 'PUBLIC';
export type DeveloperAvailabilityType = 'AVAILABLE' | 'PARTIALLY_AVAILABLE' | 'UNAVAILABLE';
export type SkillSourceType = 'SELF_DECLARED' | 'RESUME_EXTRACTED' | 'GITHUB_OBSERVED';
export type ResumeParseStatusType = 'UPLOADED' | 'PARSING' | 'PARSED' | 'REVIEWED' | 'FAILED';

export interface DeveloperSkillItem {
  id: string;
  profileId?: string;
  name: string;
  normalizedName: string;
  category: string;
  source: SkillSourceType;
  yearsUsed: number | null;
  confidence: number | null;
  sourceExcerpt: string | null;
  isApproved: boolean;
}

export interface PortfolioProjectItem {
  id?: string;
  title: string;
  summary: string;
  role: string | null;
  technologies: string[];
  projectUrl: string | null;
  repoFullName: string | null;
  isPublic: boolean;
  displayOrder?: number;
}

export interface ResumeFileMeta {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256Hash: string;
  extension: string;
}

export interface ParsedResumeReviewPayload {
  fullName?: string | null;
  headline?: string | null;
  summary?: string | null;
  yearsOfExperience?: number | null;
  contactLinks?: {
    portfolioUrls: string[];
    githubUrls: string[];
    linkedinUrls: string[];
  };
  skills?: Array<{
    name: string;
    category: 'language' | 'framework' | 'database' | 'tool' | 'domain';
    yearsUsed?: number | null;
    confidence: number;
    sourceExcerpt?: string | null;
  }>;
  previousRoles?: Array<{
    title: string;
    company?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    summary?: string | null;
    confidence: number;
    sourceExcerpt?: string | null;
  }>;
  projects?: Array<{
    title: string;
    role?: string | null;
    summary: string;
    technologies: string[];
    url?: string | null;
    confidence: number;
    sourceExcerpt?: string | null;
  }>;
  education?: Array<{
    degree: string;
    institution: string;
    graduationYear?: string | null;
    confidence: number;
  }>;
  certifications?: Array<{
    name: string;
    issuer?: string | null;
    year?: string | null;
    confidence: number;
  }>;
  overallConfidence?: number;
  lowConfidenceFields?: string[];
}

export interface DeveloperResumeRecord {
  id: string;
  profileId: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  parseStatus: ResumeParseStatusType;
  parseError: string | null;
  parsedJson: ParsedResumeReviewPayload | null;
  confidenceScore: number | null;
  lowConfidenceFields: string[];
  reviewedByUser: boolean;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
  file?: ResumeFileMeta | null;
  extractedTextPreview?: string | null;
}

export interface CompletenessBreakdownItem {
  label: string;
  completed: boolean;
  weight: number;
}

export interface DeveloperCareerProfile {
  id: string;
  userId: string;
  displayName: string;
  headline: string | null;
  summary: string | null;
  yearsOfExperience: number | null;
  availability: DeveloperAvailabilityType;
  visibility: ProfileVisibilityType;
  hourlyRateMin: number | null;
  hourlyRateMax: number | null;
  currency: string;
  location: string | null;
  timezone: string | null;
  portfolioUrl: string | null;
  linkedinUrl: string | null;
  allowClientResumeDownload: boolean;
  showPortfolioToClients: boolean;
  shareGitHubRepos: boolean;
  completenessScore: number;
  completenessBreakdown?: CompletenessBreakdownItem[];
  githubUsername?: string | null;
  githubProfileUrl?: string | null;
  githubConnected?: boolean;
  skills: DeveloperSkillItem[];
  portfolioProjects: PortfolioProjectItem[];
  primaryResume?: {
    id: string;
    fileName: string;
    parseStatus: ResumeParseStatusType;
    reviewedByUser: boolean;
    updatedAt: string;
  } | null;
}

export interface ResumeTemplateItem {
  id: string;
  name: string;
  focus: string;
  recommendedSections: string[];
  sectionOrder: Array<'summary' | 'skills' | 'experience' | 'projects' | 'education' | 'certifications'>;
  atsGuidance: string;
}

export interface StructuredResumePreviewDocument {
  template: ResumeTemplateItem;
  fullName: string;
  headline: string;
  summary: string;
  location: string | null;
  links: string[];
  skills: string[];
  experience: Array<{ title: string; company?: string; period?: string; summary?: string }>;
  projects: Array<{ title: string; technologies?: string[]; summary: string; url?: string }>;
  education: Array<{ degree: string; institution: string; year?: string }>;
  certifications: Array<{ name: string; issuer?: string; year?: string }>;
}

export interface DeveloperStudioState {
  profile: DeveloperCareerProfile;
  resumes: DeveloperResumeRecord[];
  githubRepositories: GitHubRepositorySummary[];
  templates: ResumeTemplateItem[];
}

// =========================================================================
// Feature 2: AI-Powered Talent Marketplace Types
// =========================================================================
export type OpportunityVisibilityType = 'PRIVATE' | 'DISCOVERABLE' | 'INVITE_ONLY';
export type OpportunityStatusType = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'CLOSED';
export type SkillRequirementLevelType = 'MANDATORY' | 'PREFERRED';
export type ApplicationStatusType =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'SHORTLISTED'
  | 'INTERVIEWING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'WITHDRAWN';

export interface ExplainableSkillAssessmentItem {
  skill: string;
  requirementLevel: 'mandatory' | 'preferred';
  status: 'STRONG_MATCH' | 'GITHUB_OBSERVED' | 'RESUME_STATED' | 'PARTIAL_MATCH' | 'MISSING';
  label: string;
}

export interface CandidateMatchAssessmentItem {
  profileId: string;
  matchScore: number | null;
  insufficientData: boolean;
  isAdvisoryScore: true;
  methodologyNote: string;
  explanation: string;
  matchedSkills: ExplainableSkillAssessmentItem[];
  missingSkills: string[];
  evidenceHighlights: string[];
  missingOrUnverifiedNotes: string[];
  aiModelName: string | null;
}

export interface MarketplaceDeveloperCard {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  headline: string | null;
  summary: string | null;
  yearsOfExperience: number | null;
  availability: DeveloperAvailabilityType;
  visibility: ProfileVisibilityType;
  hourlyRateMin: number | null;
  hourlyRateMax: number | null;
  currency: string;
  location: string | null;
  timezone: string | null;
  portfolioUrl: string | null;
  linkedinUrl: string | null;
  githubUsername: string | null;
  githubProfileUrl: string | null;
  allowClientResumeDownload: boolean;
  completenessScore: number;
  skills: DeveloperSkillItem[];
  portfolioProjects: PortfolioProjectItem[];
  match?: CandidateMatchAssessmentItem | null;
}

export interface MarketplaceOpportunityItem {
  id: string;
  clientId: string;
  clientDisplayName: string;
  organizationName: string | null;
  linkedProjectId: string | null;
  title: string;
  description: string;
  deliverablesSummary: string | null;
  aiEnhancedDescription: string | null;
  aiApprovedByClient: boolean;
  visibility: OpportunityVisibilityType;
  status: OpportunityStatusType;
  experienceLevel: string | null;
  minYearsExperience: number | null;
  budgetMin: number | null;
  budgetMax: number | null;
  currency: string;
  expectedDuration: string | null;
  locationPreference: string | null;
  timezonePreference: string | null;
  applicationDeadline: string | null;
  publishedAt: string | null;
  createdAt: string;
  skills: Array<{
    id?: string;
    name: string;
    category: string;
    requirementLevel: SkillRequirementLevelType;
  }>;
  isSaved: boolean;
  applicantCount?: number;
  myApplication?: { id: string; status: ApplicationStatusType; submittedAt?: string } | null;
}

export interface OpportunityApplicationRecord {
  id: string;
  opportunityId: string;
  developerId: string;
  profileId?: string;
  status: ApplicationStatusType;
  proposal: string;
  proposedBudget: number | null;
  currency: string;
  estimatedTimeline: string | null;
  selectedPortfolioIds: string[];
  allowResumeDownload: boolean;
  matchScoreSnapshot: number | null;
  matchSummarySnapshot?: CandidateMatchAssessmentItem | null;
  clientNotes: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  opportunity?: {
    id: string;
    title: string;
    organizationName: string | null;
    clientId?: string;
    status?: OpportunityStatusType;
    visibility?: OpportunityVisibilityType;
    budgetMin?: number | null;
    budgetMax?: number | null;
    currency?: string;
    expectedDuration?: string | null;
    client?: { id: string; name: string };
    skills?: Array<{ id?: string; name: string; requirementLevel: SkillRequirementLevelType }>;
  };
  profile?: MarketplaceDeveloperCard & {
    resumes?: Array<{ id: string; fileName: string; parseStatus: ResumeParseStatusType; updatedAt: string }>;
  };
}

