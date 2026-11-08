import { z } from 'zod';
import { BaseAIAgent } from './base.agent';
import {
  AgentType,
  PaymentCoordinationOutput,
  PaymentCoordinationOutputSchema,
} from '../ai.schema';
import { PromptSanitizer } from '../promptSanitizer';

export interface PaymentCoordinationAgentInput {
  milestoneId: string;
  milestoneTitle: string;
  milestoneStatus: string;
  milestoneAmount: number;
  milestoneCurrency: string;
  projectBudget?: number | null;
  projectCurrency: string;
  verificationStatus?: string | null;
  verificationScore?: number | null;
  existingPaymentsCount: number;
}

export class PaymentCoordinationAgent extends BaseAIAgent<
  PaymentCoordinationAgentInput,
  PaymentCoordinationOutput
> {
  readonly agentType = AgentType.PAYMENT_COORDINATION;
  readonly name = 'Payment Coordination Agent';
  readonly description = 'Analyzes verified milestone and financial data to prepare payment readiness recommendations.';

  protected buildSystemInstruction(): string {
    return [
      `You are the DevFlow Payment Coordination Agent (Agent 5 of 5).`,
      `Your purpose is to evaluate whether a milestone is logically and procedurally ready for payment processing.`,
      `Evaluate:`,
      `1. Payment Readiness: Is the milestone completed, verified, and free of blocking issues?`,
      `2. Financial Consistency: Do the milestone amount and currency align with project budget specifications?`,
      `3. Inconsistencies: Flag any warnings (e.g. low verification score, missing client approval, excessive amount).`,
      `4. Check prerequisites: Deliverables verified, amounts reconciled, approvals in place.`,
      `CRITICAL NON-NEGOTIABLE SECURITY DIRECTIVES:`,
      `- You have ZERO AUTHORITY to execute payments, create invoices, trigger payouts, or modify ledger records.`,
      `- You are an advisory intelligence agent ONLY. Your output is recommendations for human clients and administrators.`,
      `- Your output must always have isAdvisoryOnly: true.`,
      ``,
      `OUTPUT FORMAT DIRECTIVE:`,
      `You MUST respond strictly with a valid JSON object matching this structure:`,
      `{`,
      `  "isPaymentReady": boolean,`,
      `  "readinessScore": number (0-100),`,
      `  "milestoneId": string,`,
      `  "amount": number,`,
      `  "currency": string,`,
      `  "paymentInconsistencies": [`,
      `    {`,
      `      "code": string,`,
      `      "severity": "WARNING" | "BLOCKING",`,
      `      "message": string`,
      `    }`,
      `  ],`,
      `  "advisoryRecommendation": string,`,
      `  "prerequisitesMet": [`,
      `    {`,
      `      "prerequisite": string,`,
      `      "met": boolean,`,
      `      "notes": string (optional)`,
      `    }`,
      `  ],`,
      `  "isAdvisoryOnly": true`,
      `}`,
    ].join('\n');
  }

  protected buildPrompt(input: PaymentCoordinationAgentInput): string {
    const isApproved = input.milestoneStatus === 'APPROVED' || input.milestoneStatus === 'PAID';
    const hasPassedVerification = input.verificationStatus === 'PASSED';

    const untrustedData = [
      `Milestone ID: ${input.milestoneId}`,
      `Milestone Title: ${input.milestoneTitle}`,
      `Milestone Status: ${input.milestoneStatus}`,
      `Milestone Amount: ${input.milestoneAmount} ${input.milestoneCurrency}`,
      `Project Budget: ${input.projectBudget ? `${input.projectBudget} ${input.projectCurrency}` : 'Unspecified'}`,
      `Verification Status: ${input.verificationStatus || 'UNVERIFIED'} (Score: ${input.verificationScore ?? 0}/100)`,
      `Prior Invoices/Payments Attached: ${input.existingPaymentsCount}`,
      `Client Approved: ${isApproved ? 'YES' : 'NO'}`,
      `Verification Passed: ${hasPassedVerification ? 'YES' : 'NO'}`,
    ].join('\n');

    return [
      `Evaluate payment readiness for this milestone:`,
      PromptSanitizer.wrapUntrustedContent(untrustedData, 'payment_milestone_data'),
      ``,
      `Determine readiness score, list any inconsistencies, and produce an advisory recommendation.`,
    ].join('\n');
  }

  protected getOutputSchema(): z.ZodSchema<PaymentCoordinationOutput> {
    return PaymentCoordinationOutputSchema;
  }
}

