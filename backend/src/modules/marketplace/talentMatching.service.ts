import { SkillSource } from '@prisma/client';
import { aiOrchestrator } from '../ai/ai.orchestrator';
import { TalentRerankCandidateSummary } from '../ai/agents/talentMatching.agent';

export interface CandidateSignalSource {
  profileId: string;
  userId: string;
  displayName: string;
  headline: string | null;
  summary: string | null;
  yearsOfExperience: number | null;
  availability: string;
  hourlyRateMin: number | null;
  hourlyRateMax: number | null;
  currency: string;
  location: string | null;
  timezone: string | null;
  completenessScore: number;
  githubUsername: string | null;
  githubProfileUrl: string | null;
  shareGitHubRepos: boolean;
  skills: Array<{
    name: string;
    normalizedName: string;
    category: string;
    source: SkillSource;
    isApproved: boolean;
  }>;
  portfolioProjects: Array<{
    id: string;
    title: string;
    summary: string;
    technologies: string[];
    projectUrl: string | null;
    repoFullName: string | null;
    isPublic: boolean;
  }>;
}

export interface ExplainableSkillAssessment {
  skill: string;
  requirementLevel: 'mandatory' | 'preferred';
  status:
    | 'STRONG_MATCH'
    | 'GITHUB_OBSERVED'
    | 'RESUME_STATED'
    | 'PARTIAL_MATCH'
    | 'MISSING';
  label: string;
}

export interface CandidateMatchAssessment {
  profileId: string;
  matchScore: number | null;
  insufficientData: boolean;
  isAdvisoryScore: true;
  methodologyNote: string;
  explanation: string;
  matchedSkills: ExplainableSkillAssessment[];
  missingSkills: string[];
  evidenceHighlights: string[];
  missingOrUnverifiedNotes: string[];
  aiModelName: string | null;
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9.+#/ ]+/g, '');
}

const SKILL_ALIASES: Record<string, string[]> = {
  'node.js': ['node', 'nodejs', 'express', 'nestjs'],
  postgresql: ['postgres', 'psql', 'sql', 'prisma'],
  typescript: ['ts', 'tsx'],
  javascript: ['js', 'es6'],
  react: ['reactjs', 'next.js', 'nextjs'],
  'paypal api': ['paypal', 'paypal integration', 'payments', 'checkout'],
  python: ['py', 'fastapi', 'django'],
  docker: ['containers', 'dockerfile', 'kubernetes'],
};

function matchesToken(candidateSet: Set<string>, corpus: string, targetSkill: string): 'exact' | 'alias' | 'none' {
  const norm = normalizeToken(targetSkill);
  if (!norm) return 'none';
  if (candidateSet.has(norm) || corpus.includes(norm)) {
    return 'exact';
  }
  const aliases = SKILL_ALIASES[norm] || [];
  for (const alias of aliases) {
    if (candidateSet.has(alias) || corpus.includes(alias)) {
      return 'alias';
    }
  }
  return 'none';
}

export class TalentMatchingService {
  evaluateDeterministicMatch(params: {
    candidate: CandidateSignalSource;
    mandatorySkills: string[];
    preferredSkills: string[];
    minYearsExperience: number | null;
    domainKeywords: string[];
  }): Omit<CandidateMatchAssessment, 'aiModelName'> {
    const { candidate, mandatorySkills, preferredSkills, minYearsExperience, domainKeywords } = params;

    const approvedSkills = candidate.skills.filter((s) => s.isApproved);
    const githubSkills = approvedSkills.filter((s) => s.source === SkillSource.GITHUB_OBSERVED);
    const declaredSkills = approvedSkills.filter((s) => s.source === SkillSource.SELF_DECLARED);
    const resumeSkills = approvedSkills.filter((s) => s.source === SkillSource.RESUME_EXTRACTED);
    const publicProjects = candidate.portfolioProjects.filter((p) => p.isPublic);

    const hasSignal =
      approvedSkills.length > 0 ||
      publicProjects.length > 0 ||
      Boolean(candidate.headline?.trim()) ||
      Boolean(candidate.summary?.trim());

    if (!hasSignal || candidate.completenessScore < 15) {
      return {
        profileId: candidate.profileId,
        matchScore: null,
        insufficientData: true,
        isAdvisoryScore: true,
        methodologyNote:
          'Estimated relevance score withheld because developer profile lacks sufficient approved skill, project, or summary data.',
        explanation:
          'Insufficient profile data: developer needs approved skills, portfolio projects, or summary details before relevance can be estimated.',
        matchedSkills: [],
        missingSkills: [...mandatorySkills, ...preferredSkills],
        evidenceHighlights: [],
        missingOrUnverifiedNotes: ['Insufficient profile data for reliable matching.'],
      };
    }

    const ghSet = new Set(githubSkills.map((s) => normalizeToken(s.name)));
    const declaredSet = new Set(declaredSkills.map((s) => normalizeToken(s.name)));
    const resumeSet = new Set(resumeSkills.map((s) => normalizeToken(s.name)));
    const projectTechSet = new Set(
      publicProjects.flatMap((p) => p.technologies.map((t) => normalizeToken(t)))
    );
    const corpus = normalizeToken(
      [
        candidate.headline || '',
        candidate.summary || '',
        ...publicProjects.map((p) => `${p.title} ${p.summary} ${p.technologies.join(' ')}`),
      ].join(' ')
    );

    const matchedSkills: ExplainableSkillAssessment[] = [];
    const missingSkills: string[] = [];
    const notes: string[] = [];

    const assessRequirement = (
      skill: string,
      level: 'mandatory' | 'preferred'
    ): { weightRatio: number; entry: ExplainableSkillAssessment } => {
      const inGh = matchesToken(ghSet, '', skill) !== 'none';
      const inDeclared = matchesToken(declaredSet, '', skill) !== 'none';
      const inProject = matchesToken(projectTechSet, corpus, skill);
      const inResume = matchesToken(resumeSet, '', skill) !== 'none';

      if (inGh && (inDeclared || inResume || inProject === 'exact')) {
        return {
          weightRatio: 1.0,
          entry: {
            skill,
            requirementLevel: level,
            status: 'STRONG_MATCH',
            label: `${skill}: Strong match (profile + GitHub repository language observed)`,
          },
        };
      }
      if (inDeclared && inProject === 'exact') {
        return {
          weightRatio: 0.95,
          entry: {
            skill,
            requirementLevel: level,
            status: 'STRONG_MATCH',
            label: `${skill}: Strong match (declared skill + portfolio project)`,
          },
        };
      }
      if (inGh) {
        return {
          weightRatio: 0.9,
          entry: {
            skill,
            requirementLevel: level,
            status: 'GITHUB_OBSERVED',
            label: `${skill}: Observed in connected GitHub repositories`,
          },
        };
      }
      if (inDeclared) {
        return {
          weightRatio: 0.85,
          entry: {
            skill,
            requirementLevel: level,
            status: 'STRONG_MATCH',
            label: `${skill}: Declared on developer career profile`,
          },
        };
      }
      if (inResume) {
        notes.push(`${skill} is stated on the uploaded resume (self-reported, not independently verified).`);
        return {
          weightRatio: 0.72,
          entry: {
            skill,
            requirementLevel: level,
            status: 'RESUME_STATED',
            label: `${skill}: Resume-stated (unverified)`,
          },
        };
      }
      if (inProject === 'alias') {
        return {
          weightRatio: 0.55,
          entry: {
            skill,
            requirementLevel: level,
            status: 'PARTIAL_MATCH',
            label: `${skill}: Partial/related stack alignment`,
          },
        };
      }

      missingSkills.push(skill);
      return {
        weightRatio: 0,
        entry: {
          skill,
          requirementLevel: level,
          status: 'MISSING',
          label: `${skill}: Not demonstrated on profile`,
        },
      };
    };

    let mandatoryScore = 0;
    if (mandatorySkills.length > 0) {
      let sum = 0;
      for (const req of mandatorySkills) {
        const res = assessRequirement(req, 'mandatory');
        matchedSkills.push(res.entry);
        sum += res.weightRatio;
      }
      mandatoryScore = (sum / mandatorySkills.length) * 55;
    } else {
      // No specific mandatory skills passed: base on overall profile richness + query domain overlap
      mandatoryScore = approvedSkills.length >= 3 ? 35 : 22;
    }

    let preferredScore = 0;
    if (preferredSkills.length > 0) {
      let sum = 0;
      for (const pref of preferredSkills) {
        const res = assessRequirement(pref, 'preferred');
        matchedSkills.push(res.entry);
        sum += res.weightRatio;
      }
      preferredScore = (sum / preferredSkills.length) * 15;
    } else {
      preferredScore = Math.min(12, approvedSkills.length * 1.5);
    }

    // Experience & domain score (up to 15)
    let expScore = 6;
    if (minYearsExperience !== null && minYearsExperience > 0) {
      if (candidate.yearsOfExperience === null || candidate.yearsOfExperience === undefined) {
        expScore = 4;
        notes.push('Years of experience not specified on profile.');
      } else if (candidate.yearsOfExperience >= minYearsExperience) {
        expScore = 10;
      } else {
        expScore = Math.max(2, Math.round((candidate.yearsOfExperience / minYearsExperience) * 8));
        notes.push(
          `Requested ~${minYearsExperience}+ years experience; profile lists ${candidate.yearsOfExperience} yr(s).`
        );
      }
    } else if (candidate.yearsOfExperience && candidate.yearsOfExperience >= 2) {
      expScore = 9;
    }

    let domainOverlap = 0;
    for (const kw of domainKeywords) {
      if (corpus.includes(normalizeToken(kw))) {
        domainOverlap += 2.5;
      }
    }
    const projectScore = Math.min(5, publicProjects.length * 2 + Math.min(3, domainOverlap));

    const deterministicTotal = Math.round(
      Math.max(0, Math.min(85, mandatoryScore + preferredScore + expScore + projectScore))
    );

    const evidenceHighlights: string[] = [];
    if (githubSkills.length > 0) {
      evidenceHighlights.push(
        `GitHub languages observed: ${githubSkills.slice(0, 5).map((s) => s.name).join(', ')}`
      );
    }
    if (publicProjects.length > 0) {
      evidenceHighlights.push(
        `Portfolio evidence: ${publicProjects.slice(0, 2).map((p) => p.title).join(', ')}`
      );
    }

    return {
      profileId: candidate.profileId,
      matchScore: deterministicTotal,
      insufficientData: false,
      isAdvisoryScore: true,
      methodologyNote:
        'Estimated relevance score combining deterministic requirement matching (0–85 pts) and bounded AI semantic alignment (-15 to +15 pts). Not a hiring guarantee.',
      explanation: `Matched ${
        matchedSkills.filter((m) => m.status !== 'MISSING').length
      } of ${matchedSkills.length || approvedSkills.length} evaluated criteria deterministically.`,
      matchedSkills,
      missingSkills,
      evidenceHighlights,
      missingOrUnverifiedNotes: notes,
    };
  }

  async rankCandidatesForQuery(params: {
    naturalLanguageQuery: string;
    candidates: CandidateSignalSource[];
    explicitMandatorySkills?: string[];
    explicitPreferredSkills?: string[];
    explicitMinYears?: number | null;
  }): Promise<{
    extractedRequirements: {
      mandatorySkills: string[];
      preferredSkills: string[];
      minYearsExperience: number | null;
      domainKeywords: string[];
      scopeSummary: string;
    };
    assessments: Map<string, CandidateMatchAssessment>;
    aiModelName: string | null;
  }> {
    const queryResult = await aiOrchestrator.analyzeTalentSearchQuery(params.naturalLanguageQuery);
    const mandatorySkills = Array.from(
      new Set([...(params.explicitMandatorySkills || []), ...queryResult.data.mandatorySkills])
    );
    const preferredSkills = Array.from(
      new Set(
        [...(params.explicitPreferredSkills || []), ...queryResult.data.preferredSkills].filter(
          (s) => !mandatorySkills.some((m) => m.toLowerCase() === s.toLowerCase())
        )
      )
    );
    const minYearsExperience =
      params.explicitMinYears ?? queryResult.data.minYearsExperience ?? null;
    const domainKeywords = queryResult.data.domainKeywords || [];

    const detMap = new Map<string, Omit<CandidateMatchAssessment, 'aiModelName'>>();
    const sufficientForAi: TalentRerankCandidateSummary[] = [];

    for (const candidate of params.candidates) {
      const det = this.evaluateDeterministicMatch({
        candidate,
        mandatorySkills,
        preferredSkills,
        minYearsExperience,
        domainKeywords,
      });
      detMap.set(candidate.profileId, det);

      if (!det.insufficientData) {
        sufficientForAi.push({
          profileId: candidate.profileId,
          displayName: candidate.displayName,
          headline: candidate.headline,
          yearsOfExperience: candidate.yearsOfExperience,
          availability: candidate.availability,
          declaredSkills: candidate.skills
            .filter((s) => s.isApproved && s.source === SkillSource.SELF_DECLARED)
            .map((s) => s.name),
          resumeExtractedSkills: candidate.skills
            .filter((s) => s.isApproved && s.source === SkillSource.RESUME_EXTRACTED)
            .map((s) => s.name),
          githubObservedLanguages: candidate.skills
            .filter((s) => s.isApproved && s.source === SkillSource.GITHUB_OBSERVED)
            .map((s) => s.name),
          githubPublicReposCount: candidate.shareGitHubRepos ? (candidate.githubUsername ? 1 : 0) : 0,
          portfolioProjects: candidate.portfolioProjects
            .filter((p) => p.isPublic)
            .slice(0, 4)
            .map((p) => ({
              title: p.title,
              summary: p.summary.slice(0, 240),
              technologies: p.technologies,
            })),
        });
      }
    }

    let evalModelName: string | null = queryResult.modelName;
    const aiEvalMap = new Map<
      string,
      {
        semanticAdjustment: number;
        explanation: string;
        evidenceHighlights: string[];
        missingOrUnverifiedNotes: string[];
      }
    >();

    if (sufficientForAi.length > 0) {
      // Top 12 candidates sent for bounded semantic alignment explanation
      const topCandidates = [...sufficientForAi]
        .sort(
          (a, b) =>
            (detMap.get(b.profileId)?.matchScore ?? 0) - (detMap.get(a.profileId)?.matchScore ?? 0)
        )
        .slice(0, 12);

      const rerankRes = await aiOrchestrator.evaluateTalentCandidates({
        queryText: params.naturalLanguageQuery,
        mandatorySkills,
        preferredSkills,
        minYearsExperience,
        candidates: topCandidates,
      });
      evalModelName = rerankRes.modelName;
      for (const item of rerankRes.data.evaluations) {
        aiEvalMap.set(item.profileId, item);
      }
    }

    const assessments = new Map<string, CandidateMatchAssessment>();
    for (const [profileId, det] of detMap.entries()) {
      const aiEval = aiEvalMap.get(profileId);
      if (det.insufficientData || det.matchScore === null) {
        assessments.set(profileId, { ...det, aiModelName: evalModelName });
      } else {
        const adjustment = aiEval ? Math.max(-15, Math.min(15, Math.round(aiEval.semanticAdjustment))) : 0;
        const finalScore = Math.max(0, Math.min(100, det.matchScore + adjustment));
        assessments.set(profileId, {
          ...det,
          matchScore: finalScore,
          explanation: aiEval?.explanation || det.explanation,
          evidenceHighlights:
            aiEval?.evidenceHighlights && aiEval.evidenceHighlights.length > 0
              ? aiEval.evidenceHighlights
              : det.evidenceHighlights,
          missingOrUnverifiedNotes: Array.from(
            new Set([
              ...det.missingOrUnverifiedNotes,
              ...(aiEval?.missingOrUnverifiedNotes || []),
            ])
          ),
          aiModelName: evalModelName,
        });
      }
    }

    return {
      extractedRequirements: {
        mandatorySkills,
        preferredSkills,
        minYearsExperience,
        domainKeywords,
        scopeSummary: queryResult.data.scopeSummary,
      },
      assessments,
      aiModelName: evalModelName,
    };
  }
}

export const talentMatchingService = new TalentMatchingService();

