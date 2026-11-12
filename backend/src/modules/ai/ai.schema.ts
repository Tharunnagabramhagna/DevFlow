import { z } from 'zod';

export enum AgentType {
  EVIDENCE_ANALYSIS = 'EVIDENCE_ANALYSIS',
  MILESTONE_VERIFICATION = 'MILESTONE_VERIFICATION',
  RISK_DETECTION = 'RISK_DETECTION',
  PROJECT_MONITORING = 'PROJECT_MONITORING',
  PAYMENT_COORDINATION = 'PAYMENT_COORDINATION',
  RESUME_PARSING = 'RESUME_PARSING',
  TALENT_MATCHING = 'TALENT_MATCHING',
  OPPORTUNITY_REFINEMENT = 'OPPORTUNITY_REFINEMENT',
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

// -------------------------------------------------------------
// AGENT 6: Resume Parsing Agent Schema
// -------------------------------------------------------------
export const ExtractedSkillSchema = z.object({
  name: z.string(),
  category: z.enum(['language', 'framework', 'database', 'tool', 'domain']).default('tool'),
  yearsUsed: z.number().nullable().optional(),
  confidence: z.number().min(0).max(100),
  sourceExcerpt: z.string().nullable().optional(),
});

export const ExtractedRoleSchema = z.object({
  title: z.string(),
  company: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  confidence: z.number().min(0).max(100),
  sourceExcerpt: z.string().nullable().optional(),
});

export const ExtractedProjectSchema = z.object({
  title: z.string(),
  role: z.string().nullable().optional(),
  summary: z.string(),
  technologies: z.array(z.string()).default([]),
  url: z.string().nullable().optional(),
  confidence: z.number().min(0).max(100),
  sourceExcerpt: z.string().nullable().optional(),
});

export const ExtractedEducationSchema = z.object({
  degree: z.string(),
  institution: z.string(),
  graduationYear: z.string().nullable().optional(),
  confidence: z.number().min(0).max(100),
});

export const ExtractedCertificationSchema = z.object({
  name: z.string(),
  issuer: z.string().nullable().optional(),
  year: z.string().nullable().optional(),
  confidence: z.number().min(0).max(100),
});

export const ResumeExtractionOutputSchema = z.object({
  fullName: z.string().nullable().optional(),
  headline: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  yearsOfExperience: z.number().min(0).max(60).nullable().optional(),
  contactLinks: z
    .object({
      portfolioUrls: z.array(z.string()).default([]),
      githubUrls: z.array(z.string()).default([]),
      linkedinUrls: z.array(z.string()).default([]),
    })
    .default({ portfolioUrls: [], githubUrls: [], linkedinUrls: [] }),
  skills: z.array(ExtractedSkillSchema).default([]),
  previousRoles: z.array(ExtractedRoleSchema).default([]),
  projects: z.array(ExtractedProjectSchema).default([]),
  education: z.array(ExtractedEducationSchema).default([]),
  certifications: z.array(ExtractedCertificationSchema).default([]),
  overallConfidence: z.number().min(0).max(100),
  lowConfidenceFields: z.array(z.string()).default([]),
});

export type ResumeExtractionOutput = z.infer<typeof ResumeExtractionOutputSchema>;

// -------------------------------------------------------------
// AGENT 7: Talent Matching Agent Schemas
// -------------------------------------------------------------
export const TalentQueryExtractionOutputSchema = z.object({
  mandatorySkills: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),
  minYearsExperience: z.number().min(0).max(40).nullable().optional(),
  domainKeywords: z.array(z.string()).default([]),
  scopeSummary: z.string(),
});

export type TalentQueryExtractionOutput = z.infer<typeof TalentQueryExtractionOutputSchema>;

export const TalentCandidateEvaluationOutputSchema = z.object({
  evaluations: z
    .array(
      z.object({
        profileId: z.string(),
        semanticAdjustment: z.number().min(-15).max(15),
        explanation: z.string(),
        evidenceHighlights: z.array(z.string()).default([]),
        missingOrUnverifiedNotes: z.array(z.string()).default([]),
      })
    )
    .default([]),
});

export type TalentCandidateEvaluationOutput = z.infer<
  typeof TalentCandidateEvaluationOutputSchema
>;

// -------------------------------------------------------------
// AGENT 8: Opportunity Refinement Agent Schema
// -------------------------------------------------------------
export const OpportunityRefinementOutputSchema = z.object({
  improvedDescription: z.string(),
  deliverables: z.array(z.string()).default([]),
  mandatorySkills: z
    .array(z.object({ name: z.string(), category: z.string().default('general') }))
    .default([]),
  preferredSkills: z
    .array(z.object({ name: z.string(), category: z.string().default('general') }))
    .default([]),
  recommendedExperienceLevel: z.string(),
  estimatedMinYears: z.number().min(0).max(30).nullable().optional(),
});

export type OpportunityRefinementOutput = z.infer<typeof OpportunityRefinementOutputSchema>;

