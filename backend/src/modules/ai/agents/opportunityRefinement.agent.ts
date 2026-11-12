import { z } from 'zod';
import { BaseAIAgent } from './base.agent';
import {
  AgentType,
  OpportunityRefinementOutput,
  OpportunityRefinementOutputSchema,
} from '../ai.schema';
import { PromptSanitizer } from '../promptSanitizer';

export interface OpportunityRefinementInput {
  title: string;
  description: string;
  expectedDuration?: string;
  budgetMin?: number;
  budgetMax?: number;
}

export class OpportunityRefinementAgent extends BaseAIAgent<
  OpportunityRefinementInput,
  OpportunityRefinementOutput
> {
  readonly agentType = AgentType.OPPORTUNITY_REFINEMENT;
  readonly name = 'Opportunity Scope & Requirement Advisor';
  readonly description =
    'Refines client project descriptions into structured deliverables and mandatory/preferred skills for human review before publishing.';

  protected buildSystemInstruction(): string {
    return `You are DevFlow's Opportunity Structuring Agent (${AgentType.OPPORTUNITY_REFINEMENT}).
Rewrite rough project notes into clear, well-scoped engineering deliverables and categorized technical requirements for human client review before publishing.
Do NOT invent budgets, unrealistic deadlines, or private company details not provided.
Return strictly valid JSON.`;
  }

  protected buildPrompt(input: OpportunityRefinementInput): string {
    const wrapped = PromptSanitizer.wrapUntrustedContent(
      JSON.stringify(input, null, 2),
      'CLIENT_OPPORTUNITY_DRAFT'
    );

    return `Refine this client project draft and extract structured requirements:
{
  "improvedDescription": string,
  "deliverables": string[],
  "mandatorySkills": [{ "name": string, "category": "language"|"framework"|"database"|"tool"|"domain" }],
  "preferredSkills": [{ "name": string, "category": "language"|"framework"|"database"|"tool"|"domain" }],
  "recommendedExperienceLevel": string,
  "estimatedMinYears": number | null
}

${wrapped}`;
  }

  protected getOutputSchema(): z.ZodSchema<OpportunityRefinementOutput> {
    return OpportunityRefinementOutputSchema as unknown as z.ZodSchema<OpportunityRefinementOutput>;
  }
}

