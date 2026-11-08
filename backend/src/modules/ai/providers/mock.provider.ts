import { z } from 'zod';
import { IAIProvider, AIProviderOptions, AIProviderResponse } from './ai.provider.interface';
import { PromptSanitizer } from '../promptSanitizer';
import { AgentType } from '../ai.schema';
import logger from '../../../utils/logger';

export class MockAIProvider implements IAIProvider {
  readonly name = 'mock-ai-provider';

  async generateStructured<T>(
    prompt: string,
    systemInstruction: string,
    schema: z.ZodSchema<T>,
    _options?: AIProviderOptions
  ): Promise<AIProviderResponse<T>> {
    const startTime = Date.now();
    logger.debug('MockAIProvider generating structured response', { systemLength: systemInstruction.length });

    // Check for injection attempts in the prompt
    const injectionCheck = PromptSanitizer.detectInjectionAttempt(prompt);

    // Candidates for each agent type
    const candidates = [
      () => this.generateEvidenceAnalysis(injectionCheck.hasInjection),
      () => this.generateMilestoneVerification(injectionCheck.hasInjection),
      () => this.generateRiskDetection(injectionCheck.hasInjection),
      () => this.generateProjectMonitoring(),
      () => this.generatePaymentCoordination(injectionCheck.hasInjection, prompt),
    ];

    let parsedData: T | null = null;
    let successfulResult: any = null;

    // 1. Try keyword matching from system instruction or prompt
    if (
      systemInstruction.includes('Evidence Analysis') ||
      systemInstruction.includes(AgentType.EVIDENCE_ANALYSIS)
    ) {
      successfulResult = this.generateEvidenceAnalysis(injectionCheck.hasInjection);
    } else if (
      systemInstruction.includes('Milestone Verification') ||
      systemInstruction.includes(AgentType.MILESTONE_VERIFICATION)
    ) {
      successfulResult = this.generateMilestoneVerification(injectionCheck.hasInjection);
    } else if (
      systemInstruction.includes('Risk Detection') ||
      systemInstruction.includes(AgentType.RISK_DETECTION)
    ) {
      successfulResult = this.generateRiskDetection(injectionCheck.hasInjection);
    } else if (
      systemInstruction.includes('Project Monitoring') ||
      systemInstruction.includes(AgentType.PROJECT_MONITORING)
    ) {
      successfulResult = this.generateProjectMonitoring();
    } else if (
      systemInstruction.includes('Payment Coordination') ||
      systemInstruction.includes(AgentType.PAYMENT_COORDINATION)
    ) {
      successfulResult = this.generatePaymentCoordination(injectionCheck.hasInjection, prompt);
    }

    if (successfulResult) {
      const parsed = schema.safeParse(successfulResult);
      if (parsed.success) {
        parsedData = parsed.data;
      }
    }

    // 2. Schema-matching fallback
    if (!parsedData) {
      for (const candidateFn of candidates) {
        const candidate = candidateFn();
        const parsed = schema.safeParse(candidate);
        if (parsed.success) {
          parsedData = parsed.data;
          successfulResult = candidate;
          break;
        }
      }
    }

    // 3. Generic fallback
    if (!parsedData) {
      successfulResult = {
        summary: 'Mock automated analysis completed.',
        overallScore: 85,
        recommendations: ['Review attached evidence', 'Proceed with standard workflow'],
      };
      parsedData = schema.parse(successfulResult);
    }

    const latencyMs = Date.now() - startTime;
    const rawResponse = JSON.stringify(successfulResult);

    return {
      data: parsedData,
      modelName: 'mock-gemini-2.0-flash',
      promptTokens: Math.ceil(prompt.length / 4),
      completionTokens: Math.ceil(rawResponse.length / 4),
      latencyMs,
      rawResponse,
    };
  }

  private generateEvidenceAnalysis(isSuspicious: boolean) {
    if (isSuspicious) {
      return {
        relevanceScore: 30,
        completenessScore: 25,
        consistencyScore: 40,
        overallConfidence: 85,
        findings: [
          {
            aspect: 'Prompt Security',
            status: 'SUSPICIOUS' as const,
            details: 'Potential prompt injection attempt or manipulative instruction override detected in evidence payload.',
          },
          {
            aspect: 'Completeness',
            status: 'DEFICIENT' as const,
            details: 'Evidence contains anomalous formatting without verifiable test artifacts.',
          },
        ],
        suspiciousFlags: [
          {
            flag: 'INSTRUCTION_OVERRIDE_ATTEMPT',
            severity: 'HIGH' as const,
            explanation: 'User-provided text attempted to bypass verification constraints.',
          },
        ],
        missingItems: ['Unit test report', 'Working commit demonstration'],
        recommendations: ['Conduct manual review of submitted artifacts', 'Request sanitized evidence re-upload'],
      };
    }

    return {
      relevanceScore: 92,
      completenessScore: 88,
      consistencyScore: 95,
      overallConfidence: 90,
      findings: [
        {
          aspect: 'Code Artifacts',
          status: 'SATISFIED' as const,
          details: 'Git commits and pull request references directly correspond to milestone requirements.',
        },
        {
          aspect: 'Documentation',
          status: 'SATISFIED' as const,
          details: 'Technical documentation and test evidence demonstrate expected functionality.',
        },
      ],
      suspiciousFlags: [],
      missingItems: [],
      recommendations: [
        'Evidence is consistent and verified against acceptance criteria.',
        'Proceed to milestone requirement comparison.',
      ],
    };
  }

  private generateMilestoneVerification(isSuspicious: boolean) {
    if (isSuspicious) {
      return {
        verificationStatus: 'FAILED' as const,
        overallScore: 20,
        checklistResults: [
          {
            requirement: 'Core Implementation',
            status: 'UNMET' as const,
            evidenceReference: 'None',
            gapAnalysis: 'Evidence failed security and completeness inspection.',
          },
        ],
        unmetRequirements: ['All acceptance criteria require re-validation'],
        advisoryDecision: 'RECOMMEND_REJECTION' as const,
        summary: 'Milestone evidence is deficient or contains suspicious patterns. Rejection recommended.',
        recommendations: ['Do not approve without human manual inspection', 'Request resubmission from developer'],
      };
    }

    return {
      verificationStatus: 'PASSED' as const,
      overallScore: 95,
      checklistResults: [
        {
          requirement: 'Functional Acceptance Criteria',
          status: 'MET' as const,
          evidenceReference: 'Commit & test documentation',
          gapAnalysis: 'All declared criteria verified successfully.',
        },
      ],
      unmetRequirements: [],
      advisoryDecision: 'RECOMMEND_APPROVAL' as const,
      summary: 'All milestone acceptance criteria have been verified against submitted evidence.',
      recommendations: ['Milestone is ready for client review and final human approval.'],
    };
  }

  private generateRiskDetection(isSuspicious: boolean) {
    return {
      overallRiskLevel: isSuspicious ? ('HIGH' as const) : ('LOW' as const),
      deliveryRisk: {
        level: isSuspicious ? ('HIGH' as const) : ('LOW' as const),
        factors: isSuspicious ? ['Suspicious evidence submission', 'Unverified deliverables'] : ['Milestones tracking on schedule'],
        delayLikelihood: isSuspicious ? 75 : 10,
      },
      technicalRisk: {
        level: isSuspicious ? ('HIGH' as const) : ('LOW' as const),
        factors: isSuspicious ? ['Deficient test coverage'] : ['Architecture adheres to project conventions'],
      },
      financialRisk: {
        level: isSuspicious ? ('HIGH' as const) : ('LOW' as const),
        factors: isSuspicious ? ['Potential premature payout request'] : ['Payment milestone amount proportionate to deliverables'],
      },
      suspiciousActivityFlags: isSuspicious
        ? [
            {
              indicator: 'SUSPICIOUS_PAYLOAD',
              severity: 'HIGH' as const,
              explanation: 'Unusual patterns detected in submitted milestone evidence.',
            },
          ]
        : [],
      mitigationStrategies: [
        'Maintain separation of duties during milestone review.',
        'Ensure human client reviews evidence before payment release.',
      ],
    };
  }

  private generateProjectMonitoring() {
    return {
      projectHealth: 'GOOD' as const,
      completionPercentage: 65,
      milestonesSummary: {
        total: 4,
        pending: 1,
        inProgress: 1,
        submitted: 1,
        approved: 1,
        paid: 0,
        overdue: 0,
      },
      bottlenecks: [],
      overdueMilestones: [],
      executiveSummary: 'Project is progressing in accordance with estimated roadmap. 1 milestone approved, 1 currently submitted for client review.',
      recommendedActions: [
        'Review submitted milestone evidence.',
        'Keep open communication with developer regarding upcoming milestones.',
      ],
    };
  }

  private generatePaymentCoordination(isSuspicious: boolean, prompt = '') {
    const amountMatch = prompt.match(/Milestone Amount:\s*(\d+(?:\.\d+)?)/);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 1500;

    return {
      isPaymentReady: !isSuspicious,
      readinessScore: isSuspicious ? 15 : 95,
      milestoneId: 'ms-verified',
      amount,
      currency: 'USD',
      paymentInconsistencies: isSuspicious
        ? [
            {
              code: 'UNVERIFIED_EVIDENCE',
              severity: 'BLOCKING' as const,
              message: 'Milestone evidence has not passed advisory verification.',
            },
          ]
        : [],
      advisoryRecommendation: isSuspicious
        ? 'Do not release payment. Milestone requires resubmission and verification.'
        : 'Milestone is verified. Ready for client to authorize invoicing or payout.',
      prerequisitesMet: [
        {
          prerequisite: 'Milestone Deliverables Verified',
          met: !isSuspicious,
          notes: isSuspicious ? 'Failed advisory check' : 'Verified',
        },
        {
          prerequisite: 'No Blocking Financial Inconsistencies',
          met: true,
          notes: 'Currency and amount match project agreement',
        },
      ],
      isAdvisoryOnly: true as const,
    };
  }
}
