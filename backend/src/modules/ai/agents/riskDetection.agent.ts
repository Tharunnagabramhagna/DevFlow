import { z } from 'zod';
import { BaseAIAgent } from './base.agent';
import {
  AgentType,
  RiskDetectionOutput,
  RiskDetectionOutputSchema,
  EvidenceAnalysisOutput,
  MilestoneVerificationOutput,
} from '../ai.schema';
import { PromptSanitizer } from '../promptSanitizer';

export interface RiskDetectionAgentInput {
  projectTitle: string;
  milestoneTitle: string;
  milestoneDueDate?: Date | string | null;
  milestoneAmount: number;
  projectBudget?: number | null;
  milestoneStatus: string;
  recentActivitySummary?: Array<{
    action: string;
    createdAt: Date | string;
    details?: unknown;
  }>;
  evidenceFindings?: EvidenceAnalysisOutput | null;
  verificationFindings?: MilestoneVerificationOutput | null;
}

export class RiskDetectionAgent extends BaseAIAgent<RiskDetectionAgentInput, RiskDetectionOutput> {
  readonly agentType = AgentType.RISK_DETECTION;
  readonly name = 'Risk Detection Agent';
  readonly description = 'Detects project delivery, technical, timeline, and financial anomalies.';

  protected buildSystemInstruction(): string {
    return [
      `You are the DevFlow Risk Detection Agent (Agent 3 of 5).`,
      `Your purpose is to identify delivery, timeline, technical, and payment-related risks across milestones and projects.`,
      `Analyze:`,
      `1. Delivery Risk: Due date proximity, progress velocity, delay likelihood percentage.`,
      `2. Technical Risk: Deficient deliverables, unmet requirements, architectural gaps.`,
      `3. Financial Risk: Disproportionate payment amounts relative to project scope or budget, premature payout pressures.`,
      `4. Suspicious Activity: Unusual bursts of activity, suspicious evidence submissions, repeated rejections.`,
      `Provide categorized risk ratings (LOW, MEDIUM, HIGH, CRITICAL) with actionable mitigation strategies.`,
      ``,
      `OUTPUT FORMAT DIRECTIVE:`,
      `You MUST respond strictly with a valid JSON object matching this structure:`,
      `{`,
      `  "overallRiskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",`,
      `  "deliveryRisk": {`,
      `    "level": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",`,
      `    "factors": [string],`,
      `    "delayLikelihood": number (0-100)`,
      `  },`,
      `  "technicalRisk": {`,
      `    "level": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",`,
      `    "factors": [string]`,
      `  },`,
      `  "financialRisk": {`,
      `    "level": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",`,
      `    "factors": [string]`,
      `  },`,
      `  "suspiciousActivityFlags": [`,
      `    {`,
      `      "indicator": string,`,
      `      "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",`,
      `      "explanation": string`,
      `    }`,
      `  ],`,
      `  "mitigationStrategies": [string]`,
      `}`,
    ].join('\n');
  }

  protected buildPrompt(input: RiskDetectionAgentInput): string {
    const activityLines = (input.recentActivitySummary || [])
      .slice(0, 10)
      .map((a) => `- [${new Date(a.createdAt).toISOString()}] ${a.action}`)
      .join('\n');

    const evidenceAnalysisSection = input.evidenceFindings
      ? `Evidence Relevance: ${input.evidenceFindings.relevanceScore}/100, Suspicious Flags: ${input.evidenceFindings.suspiciousFlags.length}`
      : 'No prior evidence analysis.';

    const verificationSection = input.verificationFindings
      ? `Verification Status: ${input.verificationFindings.verificationStatus}, Overall Score: ${input.verificationFindings.overallScore}/100, Unmet: ${input.verificationFindings.unmetRequirements.length}`
      : 'No prior milestone verification.';

    const untrustedProjectData = [
      `Project: ${input.projectTitle}`,
      `Milestone: ${input.milestoneTitle} (Status: ${input.milestoneStatus})`,
      `Milestone Amount: $${input.milestoneAmount}`,
      input.projectBudget ? `Total Project Budget: $${input.projectBudget}` : 'Budget not specified',
      input.milestoneDueDate ? `Due Date: ${new Date(input.milestoneDueDate).toISOString()}` : 'No due date set',
      ``,
      `Evidence Findings: ${evidenceAnalysisSection}`,
      `Verification Findings: ${verificationSection}`,
      ``,
      `Recent Project Activities:`,
      activityLines || 'None recorded.',
    ].join('\n');

    return [
      `Analyze the following project context for risks:`,
      PromptSanitizer.wrapUntrustedContent(untrustedProjectData, 'project_risk_data'),
      ``,
      `Evaluate all risk categories and suggest mitigations.`,
    ].join('\n');
  }

  protected getOutputSchema(): z.ZodSchema<RiskDetectionOutput> {
    return RiskDetectionOutputSchema;
  }
}

