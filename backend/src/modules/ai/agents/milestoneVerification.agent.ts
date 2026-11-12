import { z } from 'zod';
import { BaseAIAgent } from './base.agent';
import {
  AgentType,
  MilestoneVerificationOutput,
  MilestoneVerificationOutputSchema,
  EvidenceAnalysisOutput,
} from '../ai.schema';
import { PromptSanitizer } from '../promptSanitizer';
import {
  formatGitHubAIContextText,
  SanitizedGitHubRepositoryContext,
} from '../../github/github-sync.helper';

export interface MilestoneVerificationAgentInput {
  milestoneTitle: string;
  milestoneDescription?: string | null;
  requirements: string[];
  evidenceAnalysisFindings?: EvidenceAnalysisOutput | null;
  evidenceItems: Array<{
    id: string;
    type: string;
    title: string;
    description?: string | null;
    githubCommitSha?: string | null;
    githubPrNumber?: number | null;
    externalUrl?: string | null;
    textNote?: string | null;
  }>;
  repositoryEvidence?: SanitizedGitHubRepositoryContext | null;
}

export class MilestoneVerificationAgent extends BaseAIAgent<
  MilestoneVerificationAgentInput,
  MilestoneVerificationOutput
> {
  readonly agentType = AgentType.MILESTONE_VERIFICATION;
  readonly name = 'Milestone Verification Agent';
  readonly description = 'Compares submitted evidence against requirements and produces itemized checklist verification results.';

  protected buildSystemInstruction(): string {
    return [
      `You are the DevFlow Milestone Verification Agent (Agent 2 of 5).`,
      `Your duty is to perform systematic, checklist-by-checklist verification of milestone acceptance criteria.`,
      `For every single requirement in the milestone's requirements checklist:`,
      `1. Evaluate whether evidence proves it is MET, PARTIALLY_MET, or UNMET.`,
      `2. Reference specific evidence IDs or artifacts that support the claim.`,
      `3. For any unmet or partially met criteria, state concrete gap analysis.`,
      `4. Determine an advisory decision: RECOMMEND_APPROVAL (if all requirements met with score >= 80), RECOMMEND_REJECTION (if core deliverables missing or score < 50), or MANUAL_REVIEW_REQUIRED.`,
      `CRITICAL RULE: Your recommendation is strictly advisory for the authorized human client. You cannot approve the milestone, trigger payments, or write to repositories. Never report PASSED or RECOMMEND_APPROVAL without verifiable evidence, and never fabricate commits or pull requests.`,
      ``,
      `OUTPUT FORMAT DIRECTIVE:`,
      `You MUST respond strictly with a valid JSON object matching this structure:`,
      `{`,
      `  "verificationStatus": "PASSED" | "FAILED" | "MANUAL_REVIEW_REQUIRED",`,
      `  "overallScore": number (0-100),`,
      `  "checklistResults": [`,
      `    {`,
      `      "requirement": string,`,
      `      "status": "MET" | "PARTIALLY_MET" | "UNMET",`,
      `      "evidenceReference": string (optional),`,
      `      "gapAnalysis": string (optional)`,
      `    }`,
      `  ],`,
      `  "unmetRequirements": [string],`,
      `  "advisoryDecision": "RECOMMEND_APPROVAL" | "RECOMMEND_REJECTION" | "MANUAL_REVIEW_REQUIRED",`,
      `  "summary": string,`,
      `  "recommendations": [string]`,
      `}`,
    ].join('\n');
  }

  protected buildPrompt(input: MilestoneVerificationAgentInput): string {
    const formattedRequirements = input.requirements
      .map((req, idx) => `Requirement ${idx + 1}: ${req}`)
      .join('\n');

    const formattedEvidence = input.evidenceItems
      .map((ev, idx) => {
        const item = `[${ev.type}] ID: ${ev.id} - "${ev.title}" ${ev.description ? `(${ev.description})` : ''} ${
          ev.githubCommitSha ? `Commit: ${ev.githubCommitSha}` : ''
        } ${ev.textNote ? `Note: ${ev.textNote}` : ''}`;
        return PromptSanitizer.wrapUntrustedContent(item, `evidence_${idx + 1}`);
      })
      .join('\n');

    const priorAnalysisSummary = input.evidenceAnalysisFindings
      ? [
          `Prior Evidence Analysis Scores:`,
          `  Relevance: ${input.evidenceAnalysisFindings.relevanceScore}/100`,
          `  Completeness: ${input.evidenceAnalysisFindings.completenessScore}/100`,
          `  Consistency: ${input.evidenceAnalysisFindings.consistencyScore}/100`,
          input.evidenceAnalysisFindings.suspiciousFlags.length > 0
            ? `  Suspicious Flags: ${JSON.stringify(input.evidenceAnalysisFindings.suspiciousFlags)}`
            : `  Suspicious Flags: None`,
        ].join('\n')
      : 'Prior Evidence Analysis: None conducted yet.';

    return [
      `Milestone Under Verification:`,
      `Title: ${input.milestoneTitle}`,
      input.milestoneDescription ? `Description: ${input.milestoneDescription}` : '',
      ``,
      `Mandatory Requirements Checklist:`,
      formattedRequirements,
      ``,
      `Prior Evidence Analysis:`,
      priorAnalysisSummary,
      ``,
      `Evidence Items Submitted:`,
      formattedEvidence || 'No evidence items attached.',
      ``,
      `Synced GitHub Repository Evidence:`,
      formatGitHubAIContextText(input.repositoryEvidence),
      ``,
      `Evaluate each requirement individually and produce verification results.`,
    ].join('\n');
  }

  protected getOutputSchema(): z.ZodSchema<MilestoneVerificationOutput> {
    return MilestoneVerificationOutputSchema;
  }
}

