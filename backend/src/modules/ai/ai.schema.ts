import { z } from 'zod';

export enum AgentType {
  EVIDENCE_ANALYSIS = 'EVIDENCE_ANALYSIS',
  MILESTONE_VERIFICATION = 'MILESTONE_VERIFICATION',
  RISK_DETECTION = 'RISK_DETECTION',
  PROJECT_MONITORING = 'PROJECT_MONITORING',
  PAYMENT_COORDINATION = 'PAYMENT_COORDINATION',
}

// -------------------------------------------------------------
// AGENT 1: Evidence Analysis Agent Schema
// -------------------------------------------------------------
export const EvidenceAnalysisFindingSchema = z.object({
  aspect: z.string(),
  status: z.enum(['SATISFIED', 'DEFICIENT', 'SUSPICIOUS', 'INCOMPLETE']),
  details: z.string(),
});

export const EvidenceSuspiciousFlagSchema = z.object({
  flag: z.string(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  explanation: z.string(),
});

export const EvidenceAnalysisOutputSchema = z.object({
  relevanceScore: z.number().min(0).max(100),
  completenessScore: z.number().min(0).max(100),
  consistencyScore: z.number().min(0).max(100),
  overallConfidence: z.number().min(0).max(100),
  findings: z.array(EvidenceAnalysisFindingSchema),
  suspiciousFlags: z.array(EvidenceSuspiciousFlagSchema),
  missingItems: z.array(z.string()),
  recommendations: z.array(z.string()),
});

export type EvidenceAnalysisOutput = z.infer<typeof EvidenceAnalysisOutputSchema>;

// -------------------------------------------------------------
// AGENT 2: Milestone Verification Agent Schema
// -------------------------------------------------------------
export const ChecklistResultSchema = z.object({
  requirement: z.string(),
  status: z.enum(['MET', 'PARTIALLY_MET', 'UNMET']),
  evidenceReference: z.string().optional(),
  gapAnalysis: z.string().optional(),
});

export const MilestoneVerificationOutputSchema = z.object({
  verificationStatus: z.enum(['PASSED', 'FAILED', 'MANUAL_REVIEW_REQUIRED']),
  overallScore: z.number().min(0).max(100),
  checklistResults: z.array(ChecklistResultSchema),
  unmetRequirements: z.array(z.string()),
  advisoryDecision: z.enum(['RECOMMEND_APPROVAL', 'RECOMMEND_REJECTION', 'MANUAL_REVIEW_REQUIRED']),
  summary: z.string(),
  recommendations: z.array(z.string()),
});

export type MilestoneVerificationOutput = z.infer<typeof MilestoneVerificationOutputSchema>;

// -------------------------------------------------------------
// AGENT 3: Risk Detection Agent Schema
// -------------------------------------------------------------
export const RiskCategoryLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const RiskDetectionOutputSchema = z.object({
  overallRiskLevel: RiskCategoryLevelSchema,
  deliveryRisk: z.object({
    level: RiskCategoryLevelSchema,
    factors: z.array(z.string()),
    delayLikelihood: z.number().min(0).max(100),
  }),
  technicalRisk: z.object({
    level: RiskCategoryLevelSchema,
    factors: z.array(z.string()),
  }),
  financialRisk: z.object({
    level: RiskCategoryLevelSchema,
    factors: z.array(z.string()),
  }),
  suspiciousActivityFlags: z.array(
    z.object({
      indicator: z.string(),
      severity: RiskCategoryLevelSchema,
      explanation: z.string(),
    })
  ),
  mitigationStrategies: z.array(z.string()),
});

export type RiskDetectionOutput = z.infer<typeof RiskDetectionOutputSchema>;

// -------------------------------------------------------------
// AGENT 4: Project Monitoring Agent Schema
// -------------------------------------------------------------
export const ProjectMonitoringOutputSchema = z.object({
  projectHealth: z.enum(['EXCELLENT', 'GOOD', 'AT_RISK', 'CRITICAL']),
  completionPercentage: z.number().min(0).max(100),
  milestonesSummary: z.object({
    total: z.number(),
    pending: z.number(),
    inProgress: z.number(),
    submitted: z.number(),
    approved: z.number(),
    paid: z.number(),
    overdue: z.number(),
  }),
  bottlenecks: z.array(
    z.object({
      area: z.string(),
      severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
      description: z.string(),
      suggestedAction: z.string(),
    })
  ),
  overdueMilestones: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      dueDate: z.string().optional(),
      daysOverdue: z.number(),
    })
  ),
  executiveSummary: z.string(),
  recommendedActions: z.array(z.string()),
});

export type ProjectMonitoringOutput = z.infer<typeof ProjectMonitoringOutputSchema>;

// -------------------------------------------------------------
// AGENT 5: Payment Coordination Agent Schema
// -------------------------------------------------------------
export const PaymentCoordinationOutputSchema = z.object({
  isPaymentReady: z.boolean(),
  readinessScore: z.number().min(0).max(100),
  milestoneId: z.string(),
  amount: z.number(),
  currency: z.string(),
  paymentInconsistencies: z.array(
    z.object({
      code: z.string(),
      severity: z.enum(['WARNING', 'BLOCKING']),
      message: z.string(),
    })
  ),
  advisoryRecommendation: z.string(),
  prerequisitesMet: z.array(
    z.object({
      prerequisite: z.string(),
      met: z.boolean(),
      notes: z.string().optional(),
    })
  ),
  isAdvisoryOnly: z.literal(true),
});

export type PaymentCoordinationOutput = z.infer<typeof PaymentCoordinationOutputSchema>;

// -------------------------------------------------------------
// AI Request Options & Envelope Schemas
// -------------------------------------------------------------
export const ExecuteAgentOptionsSchema = z.object({
  async: z.boolean().default(false),
  forceRefresh: z.boolean().default(false),
});

export type ExecuteAgentOptions = z.infer<typeof ExecuteAgentOptionsSchema>;

