import { z } from 'zod';
import { BaseAIAgent } from './base.agent';
import { AgentType, EvidenceAnalysisOutput, EvidenceAnalysisOutputSchema } from '../ai.schema';
import { PromptSanitizer } from '../promptSanitizer';

export interface EvidenceAnalysisAgentInput {
  milestoneTitle: string;
  milestoneDescription?: string | null;
  milestoneRequirements: string[];
  evidenceItems: Array<{
    id: string;
    type: string;
    title: string;
    description?: string | null;
    fileName?: string | null;
    fileSize?: number | null;
    mimeType?: string | null;
    githubCommitSha?: string | null;
    githubPrNumber?: number | null;
    externalUrl?: string | null;
    textNote?: string | null;
  }>;
}

export class EvidenceAnalysisAgent extends BaseAIAgent<EvidenceAnalysisAgentInput, EvidenceAnalysisOutput> {
  readonly agentType = AgentType.EVIDENCE_ANALYSIS;
  readonly name = 'Evidence Analysis Agent';
  readonly description = 'Evaluates submitted evidence for relevance, completeness, consistency, and suspicious patterns.';

  protected buildSystemInstruction(): string {
    return [
      `You are the DevFlow Evidence Analysis Agent (Agent 1 of 5).`,
      `Your purpose is to rigorously inspect evidence artifacts submitted for milestone delivery.`,
      `Assess:`,
      `1. Relevance: Do the artifacts directly address the milestone's stated purpose and technical requirements?`,
      `2. Completeness: Are all required deliverables evidenced, or are key items omitted?`,
      `3. Consistency: Do the Git commits, PRs, documents, and notes harmonize with one another?`,
      `4. Suspicious Anomalies: Identify empty repositories, placeholder URLs, dummy commits, or manipulative claims.`,
      `Respond with structured scores (0-100), itemized findings, suspicious flags, and actionable recommendations.`,
      ``,
      `OUTPUT FORMAT DIRECTIVE:`,
      `You MUST respond strictly with a valid JSON object matching this structure:`,
      `{`,
      `  "relevanceScore": number (0-100),`,
      `  "completenessScore": number (0-100),`,
      `  "consistencyScore": number (0-100),`,
      `  "overallConfidence": number (0-100),`,
      `  "findings": [`,
      `    {`,
      `      "aspect": string,`,
      `      "status": "SATISFIED" | "DEFICIENT" | "SUSPICIOUS" | "INCOMPLETE",`,
      `      "details": string`,
      `    }`,
      `  ],`,
      `  "suspiciousFlags": [`,
      `    {`,
      `      "flag": string,`,
      `      "severity": "LOW" | "MEDIUM" | "HIGH",`,
      `      "explanation": string`,
      `    }`,
      `  ],`,
      `  "missingItems": [string],`,
      `  "recommendations": [string]`,
      `}`,
    ].join('\n');
  }

  protected buildPrompt(input: EvidenceAnalysisAgentInput): string {
    const formattedEvidence = input.evidenceItems
      .map((ev, index) => {
        const details = [
          `Item ${index + 1}: [${ev.type}] "${ev.title}" (ID: ${ev.id})`,
          ev.description ? `Description: ${ev.description}` : null,
          ev.fileName ? `File: ${ev.fileName} (${ev.mimeType || 'unknown'}, ${ev.fileSize || 0} bytes)` : null,
          ev.githubCommitSha ? `Commit SHA: ${ev.githubCommitSha}` : null,
          ev.githubPrNumber ? `Pull Request: #${ev.githubPrNumber}` : null,
          ev.externalUrl ? `External URL: ${ev.externalUrl}` : null,
          ev.textNote ? `Note: ${ev.textNote}` : null,
        ]
          .filter(Boolean)
          .join('\n');

        return PromptSanitizer.wrapUntrustedContent(details, `evidence_item_${index + 1}`);
      })
      .join('\n\n');

    return [
      `Milestone Details:`,
      `Title: ${input.milestoneTitle}`,
      input.milestoneDescription ? `Description: ${input.milestoneDescription}` : '',
      `Requirements Checklist:`,
      ...input.milestoneRequirements.map((r, i) => `  ${i + 1}. ${r}`),
      ``,
      `Submitted Evidence Items (${input.evidenceItems.length} items):`,
      formattedEvidence || 'No evidence items attached.',
      ``,
      `Analyze the evidence thoroughly according to your directives.`,
    ].join('\n');
  }

  protected getOutputSchema(): z.ZodSchema<EvidenceAnalysisOutput> {
    return EvidenceAnalysisOutputSchema;
  }
}

