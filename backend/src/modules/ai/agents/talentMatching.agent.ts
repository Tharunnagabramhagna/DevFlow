import { z } from 'zod';
import { BaseAIAgent } from './base.agent';
import {
  AgentType,
  TalentCandidateEvaluationOutput,
  TalentCandidateEvaluationOutputSchema,
  TalentQueryExtractionOutput,
  TalentQueryExtractionOutputSchema,
} from '../ai.schema';
import { PromptSanitizer } from '../promptSanitizer';

export interface TalentQueryInput {
  naturalLanguageQuery: string;
}

export interface TalentRerankCandidateSummary {
  profileId: string;
  displayName: string;
  headline: string | null;
  yearsOfExperience: number | null;
  availability: string;
  declaredSkills: string[];
  resumeExtractedSkills: string[];
  githubObservedLanguages: string[];
  githubPublicReposCount: number;
  portfolioProjects: Array<{ title: string; summary: string; technologies: string[] }>;
}

export interface TalentRerankInput {
  queryText: string;
  mandatorySkills: string[];
  preferredSkills: string[];
  minYearsExperience: number | null;
  candidates: TalentRerankCandidateSummary[];
}

export class TalentQueryAnalyzerAgent extends BaseAIAgent<
  TalentQueryInput,
  TalentQueryExtractionOutput
> {
  readonly agentType = AgentType.TALENT_MATCHING;
  readonly name = 'Talent Query Requirement Analyzer';
  readonly description =
    'Extracts mandatory technical skills, preferred skills, experience level, and scope from client project descriptions.';

  protected buildSystemInstruction(): string {
    return `You are DevFlow's Talent Requirement Extraction Agent (${AgentType.TALENT_MATCHING}::QUERY).
Extract technical project requirements from a client's natural-language request.
Do NOT include non-technical personal traits (gender, age, nationality, ethnicity, religion, family status).
Distinguish core/mandatory technologies from preferred/nice-to-have skills accurately.
Return strictly valid JSON.`;
  }

  protected buildPrompt(input: TalentQueryInput): string {
    const safeQuery = PromptSanitizer.wrapUntrustedContent(
      input.naturalLanguageQuery.slice(0, 4000),
      'CLIENT_TALENT_QUERY'
    );

    return `Extract structured talent requirements from the client description below:
Schema:
{
  "mandatorySkills": string[],
  "preferredSkills": string[],
  "minYearsExperience": number | null,
  "domainKeywords": string[],
  "scopeSummary": string
}

${safeQuery}`;
  }

  protected getOutputSchema(): z.ZodSchema<TalentQueryExtractionOutput> {
    return TalentQueryExtractionOutputSchema as unknown as z.ZodSchema<TalentQueryExtractionOutput>;
  }
}

export class TalentCandidateEvaluationAgent extends BaseAIAgent<
  TalentRerankInput,
  TalentCandidateEvaluationOutput
> {
  readonly agentType = AgentType.TALENT_MATCHING;
  readonly name = 'Talent Candidate Explainability & Rerank Agent';
  readonly description =
    'Provides grounded semantic relevance adjustments and explainable match reasoning without inventing candidate qualifications.';

  protected buildSystemInstruction(): string {
    return `You are DevFlow's Explainable Talent Evaluation Agent (${AgentType.TALENT_MATCHING}::EVALUATE).
STRICT ETHICAL AND ACCURACY RULES:
1. Evaluate strictly from the provided skills, projects, and GitHub languages. NEVER invent skills, degrees, employers, or years of experience.
2. Distinguish between GitHub-observed languages and resume/self-declared skills — never claim a resume-only skill is cryptographically or GitHub-verified.
3. Ignore all personal demographics or protected characteristics. Evaluate technical and scope fit only.
4. Keep "semanticAdjustment" bounded strictly within [-15, 15] to adjust deterministic skill scoring for transferable architecture/domain evidence.
5. Return strictly valid JSON.`;
  }

  protected buildPrompt(input: TalentRerankInput): string {
    const wrappedCandidates = PromptSanitizer.wrapUntrustedContent(
      JSON.stringify(input.candidates.slice(0, 12), null, 2),
      'CANDIDATE_PROFILES'
    );
    const singleLineQuery = input.queryText.replace(/[\r\n]+/g, ' ').trim();

    return `Evaluate candidate alignment against this client requirement:
Query: ${singleLineQuery}
Mandatory Skills: ${input.mandatorySkills.join(', ') || 'None specified'}
Preferred Skills: ${input.preferredSkills.join(', ') || 'None specified'}
Min Years Experience: ${input.minYearsExperience ?? 'Unspecified'}

Return JSON:
{
  "evaluations": [
    {
      "profileId": string,
      "semanticAdjustment": number (-15 to 15),
      "explanation": string,
      "evidenceHighlights": string[],
      "missingOrUnverifiedNotes": string[]
    }
  ]
}

${wrappedCandidates}`;
  }

  protected getOutputSchema(): z.ZodSchema<TalentCandidateEvaluationOutput> {
    return TalentCandidateEvaluationOutputSchema as unknown as z.ZodSchema<TalentCandidateEvaluationOutput>;
  }
}

