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
    const repoSignals = this.extractRepositorySignals(prompt);

    // Candidates for each agent type
    const candidates = [
      () => this.generateEvidenceAnalysis(injectionCheck.hasInjection, repoSignals),
      () => this.generateMilestoneVerification(injectionCheck.hasInjection, repoSignals),
      () => this.generateRiskDetection(injectionCheck.hasInjection, repoSignals),
      () => this.generateProjectMonitoring(repoSignals),
      () => this.generatePaymentCoordination(injectionCheck.hasInjection, prompt),
    ];

    let parsedData: T | null = null;
    let successfulResult: any = null;

    // 1. Try keyword matching from system instruction or prompt
    if (
      systemInstruction.includes('Evidence Analysis') ||
      systemInstruction.includes(AgentType.EVIDENCE_ANALYSIS)
    ) {
      successfulResult = this.generateEvidenceAnalysis(injectionCheck.hasInjection, repoSignals);
    } else if (
      systemInstruction.includes('Milestone Verification') ||
      systemInstruction.includes(AgentType.MILESTONE_VERIFICATION)
    ) {
      successfulResult = this.generateMilestoneVerification(injectionCheck.hasInjection, repoSignals);
    } else if (
      systemInstruction.includes('Risk Detection') ||
      systemInstruction.includes(AgentType.RISK_DETECTION)
    ) {
      successfulResult = this.generateRiskDetection(injectionCheck.hasInjection, repoSignals);
    } else if (
      systemInstruction.includes('Project Monitoring') ||
      systemInstruction.includes(AgentType.PROJECT_MONITORING)
    ) {
      successfulResult = this.generateProjectMonitoring(repoSignals);
    } else if (
      systemInstruction.includes('Payment Coordination') ||
      systemInstruction.includes(AgentType.PAYMENT_COORDINATION)
    ) {
      successfulResult = this.generatePaymentCoordination(injectionCheck.hasInjection, prompt);
    } else if (systemInstruction.includes(AgentType.RESUME_PARSING)) {
      successfulResult = this.generateResumeExtraction(prompt);
    } else if (systemInstruction.includes(`${AgentType.TALENT_MATCHING}::QUERY`)) {
      successfulResult = this.generateTalentQueryExtraction(prompt);
    } else if (systemInstruction.includes(`${AgentType.TALENT_MATCHING}::EVALUATE`)) {
      successfulResult = this.generateTalentEvaluations(prompt);
    } else if (systemInstruction.includes(AgentType.OPPORTUNITY_REFINEMENT)) {
      successfulResult = this.generateOpportunityRefinement(prompt);
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

  private extractRepositorySignals(prompt: string): {
    hasLinkedRepo: boolean;
    repoName: string | null;
    commitCount: number;
    prCount: number;
    issueCount: number;
    latestCommitHeadline: string | null;
    hasSubmittedEvidence: boolean;
    hasSubmittedGitItem: boolean;
  } {
    const repoBlockMatch = prompt.match(
      /<untrusted_user_content type="github_repository_evidence">([\s\S]*?)<\/untrusted_user_content>/i
    );
    const block = repoBlockMatch?.[1] || '';
    const hasLinkedRepo = Boolean(repoBlockMatch);
    const repoName = block.match(/Repository:\s*([^\s(]+)/)?.[1] || null;
    const commitCount = Number.parseInt(block.match(/Commits \((\d+)\):/)?.[1] || '0', 10) || 0;
    const prCount = Number.parseInt(block.match(/Pull Requests \((\d+)\):/)?.[1] || '0', 10) || 0;
    const issueCount = Number.parseInt(block.match(/Issues \((\d+)\):/)?.[1] || '0', 10) || 0;
    const latestCommitMatch = block.match(/- \[([a-zA-Z0-9]+)\] "([^"]+)"/);
    const latestCommitHeadline = latestCommitMatch
      ? `${latestCommitMatch[1]}: ${latestCommitMatch[2]}`
      : null;

    const hasZeroSubmitted =
      prompt.includes('Submitted Evidence Items (0 items)') ||
      prompt.includes('No evidence items attached.');
    const hasSubmittedEvidence = !hasZeroSubmitted;
    const hasSubmittedGitItem = /\[GITHUB_COMMIT\]|\[GITHUB_PR\]|Commit SHA:|Pull Request:/i.test(
      prompt
    );

    return {
      hasLinkedRepo,
      repoName,
      commitCount,
      prCount,
      issueCount,
      latestCommitHeadline,
      hasSubmittedEvidence,
      hasSubmittedGitItem,
    };
  }

  private generateEvidenceAnalysis(
    isSuspicious: boolean,
    repo: ReturnType<MockAIProvider['extractRepositorySignals']>
  ) {
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

    const hasRepoEvidence = repo.hasLinkedRepo && (repo.commitCount > 0 || repo.prCount > 0);
    if (!repo.hasSubmittedEvidence && !hasRepoEvidence) {
      return {
        relevanceScore: 15,
        completenessScore: 10,
        consistencyScore: 50,
        overallConfidence: 90,
        findings: [
          {
            aspect: 'Evidence Availability',
            status: 'INCOMPLETE' as const,
            details: repo.hasLinkedRepo
              ? `Connected repository ${repo.repoName || ''} has 0 synced commits/PRs and no submitted milestone artifacts.`
              : 'No submitted milestone evidence items or synced repository activity were provided.',
          },
        ],
        suspiciousFlags: [],
        missingItems: ['Verified repository commits or pull requests', 'Submitted milestone deliverable artifact'],
        recommendations: [
          'Sync active repository commits/PRs or attach concrete deliverable artifacts before requesting verification.',
        ],
      };
    }

    const codeArtifactDetails = hasRepoEvidence
      ? `Observed ${repo.commitCount} commit(s) and ${repo.prCount} pull request(s) in ${repo.repoName || 'linked repository'}${
          repo.latestCommitHeadline ? ` (latest: ${repo.latestCommitHeadline})` : ''
        }.`
      : repo.hasSubmittedGitItem
        ? 'Submitted Git commit and pull request references correspond to milestone requirements.'
        : 'Submitted documentation and deliverable artifacts correspond to milestone requirements.';

    return {
      relevanceScore: 92,
      completenessScore: 88,
      consistencyScore: 95,
      overallConfidence: 90,
      findings: [
        {
          aspect: 'Code Artifacts',
          status: 'SATISFIED' as const,
          details: codeArtifactDetails,
        },
        {
          aspect: 'Documentation',
          status: 'SATISFIED' as const,
          details: 'Available evidence metadata demonstrates expected milestone progress.',
        },
      ],
      suspiciousFlags: [],
      missingItems: [],
      recommendations: [
        'Evidence is consistent with observed artifacts and ready for human review.',
        'Proceed to milestone requirement comparison.',
      ],
    };
  }

  private generateMilestoneVerification(
    isSuspicious: boolean,
    repo: ReturnType<MockAIProvider['extractRepositorySignals']>
  ) {
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

    const hasRepoEvidence = repo.hasLinkedRepo && (repo.commitCount > 0 || repo.prCount > 0);
    if (!repo.hasSubmittedEvidence && !hasRepoEvidence) {
      return {
        verificationStatus: 'MANUAL_REVIEW_REQUIRED' as const,
        overallScore: 25,
        checklistResults: [
          {
            requirement: 'Functional Acceptance Criteria',
            status: 'UNMET' as const,
            evidenceReference: 'None',
            gapAnalysis: 'No commits, pull requests, or milestone artifacts are available to verify requirements.',
          },
        ],
        unmetRequirements: ['Verifiable deliverable or synced repository activity missing'],
        advisoryDecision: 'MANUAL_REVIEW_REQUIRED' as const,
        summary: 'Verification cannot pass without verifiable milestone or repository evidence.',
        recommendations: [
          'Do not approve until repository commits/PRs or deliverable evidence are attached and reviewed.',
        ],
      };
    }

    const evidenceReference = hasRepoEvidence
      ? `Repository ${repo.repoName || ''} (${repo.commitCount} commits, ${repo.prCount} PRs${
          repo.latestCommitHeadline ? `, latest ${repo.latestCommitHeadline}` : ''
        })`
      : repo.hasSubmittedGitItem
        ? 'Submitted Git commit/PR evidence'
        : 'Submitted milestone documentation';

    return {
      verificationStatus: 'PASSED' as const,
      overallScore: 95,
      checklistResults: [
        {
          requirement: 'Functional Acceptance Criteria',
          status: 'MET' as const,
          evidenceReference,
          gapAnalysis: 'Evaluated criteria supported by observed evidence.',
        },
      ],
      unmetRequirements: [],
      advisoryDecision: 'RECOMMEND_APPROVAL' as const,
      summary: `Advisory verification passed based on ${evidenceReference}. Human client approval is still required.`,
      recommendations: ['Milestone is ready for client review and final human approval.'],
    };
  }

  private generateRiskDetection(
    isSuspicious: boolean,
    repo: ReturnType<MockAIProvider['extractRepositorySignals']>
  ) {
    const emptyRepoRisk =
      repo.hasLinkedRepo && repo.commitCount === 0 && repo.prCount === 0 && !repo.hasSubmittedEvidence;

    return {
      overallRiskLevel: isSuspicious
        ? ('HIGH' as const)
        : emptyRepoRisk
          ? ('MEDIUM' as const)
          : ('LOW' as const),
      deliveryRisk: {
        level: isSuspicious
          ? ('HIGH' as const)
          : emptyRepoRisk
            ? ('MEDIUM' as const)
            : ('LOW' as const),
        factors: isSuspicious
          ? ['Suspicious evidence submission', 'Unverified deliverables']
          : emptyRepoRisk
            ? [`Repository ${repo.repoName || ''} currently shows 0 synced commits and 0 pull requests`]
            : repo.hasLinkedRepo
              ? [
                  `Repository ${repo.repoName || ''} shows ${repo.commitCount} commit(s), ${repo.prCount} PR(s), and ${repo.issueCount} issue(s)`,
                ]
              : ['Milestones tracking on schedule'],
        delayLikelihood: isSuspicious ? 75 : emptyRepoRisk ? 45 : 10,
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

  private generateProjectMonitoring(repo: ReturnType<MockAIProvider['extractRepositorySignals']>) {
    const repoNote = repo.hasLinkedRepo
      ? ` Synced repository ${repo.repoName || ''} reports ${repo.commitCount} commit(s), ${repo.prCount} pull request(s), and ${repo.issueCount} issue(s).`
      : '';

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
      executiveSummary: `Project is progressing in accordance with estimated roadmap. 1 milestone approved, 1 currently submitted for client review.${repoNote}`,
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

  private extractKnownTechKeywords(text: string): Array<{ name: string; category: 'language' | 'framework' | 'database' | 'tool' | 'domain' }> {
    const catalog: Array<[RegExp, string, 'language' | 'framework' | 'database' | 'tool' | 'domain']> = [
      [/\btypescript\b/i, 'TypeScript', 'language'],
      [/\bjavascript\b/i, 'JavaScript', 'language'],
      [/\bpython\b/i, 'Python', 'language'],
      [/\bgo(lang)?\b/i, 'Go', 'language'],
      [/\brust\b/i, 'Rust', 'language'],
      [/\bjava\b(?!script)/i, 'Java', 'language'],
      [/\breact\b/i, 'React', 'framework'],
      [/\bnext\.?js\b/i, 'Next.js', 'framework'],
      [/\bnode\.?js\b/i, 'Node.js', 'framework'],
      [/\bexpress\b/i, 'Express', 'framework'],
      [/\bfastapi\b/i, 'FastAPI', 'framework'],
      [/\bdjango\b/i, 'Django', 'framework'],
      [/\btailwind/i, 'Tailwind CSS', 'framework'],
      [/\bpostgresql\b|\bpostgres\b/i, 'PostgreSQL', 'database'],
      [/\bmongodb\b/i, 'MongoDB', 'database'],
      [/\bredis\b/i, 'Redis', 'database'],
      [/\bprisma\b/i, 'Prisma', 'database'],
      [/\bdocker\b/i, 'Docker', 'tool'],
      [/\bkubernetes\b/i, 'Kubernetes', 'tool'],
      [/\baws\b/i, 'AWS', 'tool'],
      [/\bgit(hub)?\b/i, 'GitHub', 'tool'],
      [/\bpaypal\b/i, 'PayPal API', 'domain'],
      [/\bfintech\b/i, 'Fintech', 'domain'],
      [/\boauth\b/i, 'OAuth 2.0', 'domain'],
    ];
    const found: Array<{ name: string; category: 'language' | 'framework' | 'database' | 'tool' | 'domain' }> = [];
    for (const [rx, label, category] of catalog) {
      if (rx.test(text)) {
        found.push({ name: label, category });
      }
    }
    return found;
  }

  private generateResumeExtraction(prompt: string) {
    const lines = prompt
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('Analyze the following') && !l.startsWith('---'));

    const candidateName =
      lines.find(
        (l) =>
          /^[A-Z][a-z]+(?:\s+[A-Z][a-z.'-]+){1,3}$/.test(l) &&
          l.length < 48 &&
          !/resume|curriculum|vitae|summary|skills|experience/i.test(l)
      ) || null;

    const yearsMatch = prompt.match(/(\d{1,2})\+?\s+years?\s+(?:of\s+)?experience/i);
    const yearsOfExperience = yearsMatch ? Math.min(50, parseInt(yearsMatch[1], 10)) : null;

    const urlMatches = prompt.match(/https?:\/\/[^\s)>"']+/gi) || [];
    const githubUrls = urlMatches.filter((u) => /github\.com/i.test(u)).slice(0, 5);
    const linkedinUrls = urlMatches.filter((u) => /linkedin\.com/i.test(u)).slice(0, 5);
    const portfolioUrls = urlMatches
      .filter((u) => !/github\.com|linkedin\.com/i.test(u))
      .slice(0, 5);

    const detectedTech = this.extractKnownTechKeywords(prompt);
    const skills = detectedTech.map((tech) => {
      const snippetLine = lines.find((l) => l.toLowerCase().includes(tech.name.toLowerCase().split(' ')[0])) || null;
      return {
        name: tech.name,
        category: tech.category,
        yearsUsed: null,
        confidence: 78,
        sourceExcerpt: snippetLine ? snippetLine.slice(0, 140) : null,
      };
    });

    const headlineLine =
      lines.find((l) =>
        /(engineer|developer|architect|full[- ]stack|backend|frontend)/i.test(l) && l.length <= 100
      ) || null;

    const lowConfidenceFields: string[] = [];
    if (!candidateName) lowConfidenceFields.push('fullName');
    if (yearsOfExperience === null) lowConfidenceFields.push('yearsOfExperience');
    if (skills.length === 0) lowConfidenceFields.push('skills');

    return {
      fullName: candidateName,
      headline: headlineLine,
      summary: null,
      yearsOfExperience,
      contactLinks: {
        portfolioUrls,
        githubUrls,
        linkedinUrls,
      },
      skills,
      previousRoles: [],
      projects: [],
      education: [],
      certifications: [],
      overallConfidence: skills.length >= 2 ? 72 : 45,
      lowConfidenceFields,
    };
  }

  private generateTalentQueryExtraction(prompt: string) {
    const queryBlockMatch = prompt.match(/<CLIENT_TALENT_QUERY>([\s\S]*?)<\/CLIENT_TALENT_QUERY>/);
    const queryText = queryBlockMatch ? queryBlockMatch[1] : prompt;
    const techs = this.extractKnownTechKeywords(queryText);
    const yearsMatch = queryText.match(/(\d{1,2})\+?\s+years?/i);

    const mandatorySkills: string[] = [];
    const preferredSkills: string[] = [];
    for (const tech of techs) {
      const idx = queryText.toLowerCase().indexOf(tech.name.toLowerCase().split(' ')[0]);
      const context = idx >= 0 ? queryText.slice(Math.max(0, idx - 35), idx + 35).toLowerCase() : '';
      if (/bonus|nice to have|optional|prefer|plus/.test(context)) {
        preferredSkills.push(tech.name);
      } else {
        mandatorySkills.push(tech.name);
      }
    }

    return {
      mandatorySkills,
      preferredSkills,
      minYearsExperience: yearsMatch ? parseInt(yearsMatch[1], 10) : null,
      domainKeywords: techs.filter((t) => t.category === 'domain').map((t) => t.name),
      scopeSummary: queryText.trim().slice(0, 260) || 'Technical requirement extracted from query.',
    };
  }

  private generateTalentEvaluations(prompt: string) {
    const blockMatch = prompt.match(/<CANDIDATE_PROFILES>([\s\S]*?)<\/CANDIDATE_PROFILES>/);
    let parsedCandidates: Array<{
      profileId: string;
      declaredSkills?: string[];
      resumeExtractedSkills?: string[];
      githubObservedLanguages?: string[];
      portfolioProjects?: Array<{ title: string }>;
    }> = [];
    try {
      if (blockMatch) {
        parsedCandidates = JSON.parse(blockMatch[1]);
      }
    } catch {
      parsedCandidates = [];
    }

    return {
      evaluations: parsedCandidates.map((c) => {
        const ghCount = c.githubObservedLanguages?.length || 0;
        const projCount = c.portfolioProjects?.length || 0;
        const adjustment = Math.min(8, ghCount * 2 + projCount * 2);
        return {
          profileId: c.profileId,
          semanticAdjustment: adjustment,
          explanation: `Aligned ${c.declaredSkills?.length || 0} declared skill(s), ${
            c.resumeExtractedSkills?.length || 0
          } resume-stated skill(s), and ${ghCount} GitHub-observed language(s).`,
          evidenceHighlights: (c.portfolioProjects || []).slice(0, 2).map((p) => p.title),
          missingOrUnverifiedNotes:
            (c.resumeExtractedSkills?.length || 0) > 0 && ghCount === 0
              ? ['Resume skills are self/document-stated and not yet linked to GitHub repositories.']
              : [],
        };
      }),
    };
  }

  private generateOpportunityRefinement(prompt: string) {
    const techs = this.extractKnownTechKeywords(prompt);
    const titleMatch = prompt.match(/"title":\s*"([^"]+)"/);
    const title = titleMatch ? titleMatch[1] : 'Software Engineering Engagement';

    return {
      improvedDescription: `Scoped engineering engagement for "${title}". Deliverables focus on maintainable implementation, documented milestones, and verifiable repository checkpoints.`,
      deliverables: [
        'Architecture setup and core feature implementation',
        'Automated test coverage and verification evidence',
        'Deployment documentation and handover',
      ],
      mandatorySkills: techs.slice(0, 5).map((t) => ({ name: t.name, category: t.category })),
      preferredSkills: techs.slice(5, 8).map((t) => ({ name: t.name, category: t.category })),
      recommendedExperienceLevel: 'Mid-Senior',
      estimatedMinYears: 3,
    };
  }
}
