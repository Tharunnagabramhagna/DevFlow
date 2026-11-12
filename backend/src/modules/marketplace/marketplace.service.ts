import {
  ApplicationStatus,
  DeveloperAvailability,
  NotificationType,
  OpportunityStatus,
  OpportunityVisibility,
  Prisma,
  ProfileVisibility,
  Role,
  SkillRequirementLevel,
  SkillSource,
} from '@prisma/client';
import { prisma } from '../../config/database';
import { notificationService } from '../../services/notification.service';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../utils/errors';
import { aiOrchestrator } from '../ai/ai.orchestrator';
import { normalizeSkillName } from '../resume/resume.service';
import {
  AIMatchDevelopersSchema,
  ApplyOpportunitySchema,
  CompareCandidatesSchema,
  CreateOpportunitySchema,
  SearchDevelopersQuerySchema,
  SearchOpportunitiesQuerySchema,
  UpdateApplicationStatusSchema,
  UpdateOpportunitySchema,
} from './marketplace.schema';
import {
  CandidateMatchAssessment,
  CandidateSignalSource,
  talentMatchingService,
} from './talentMatching.service';
import { z } from 'zod';

type ProfileWithSignals = Prisma.DeveloperProfileGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        email: true;
        avatarUrl: true;
        githubUsername: true;
      };
    };
    skills: true;
    portfolioProjects: true;
  };
}>;

function toSignalSource(p: ProfileWithSignals): CandidateSignalSource {
  return {
    profileId: p.id,
    userId: p.userId,
    displayName: p.displayName,
    headline: p.headline,
    summary: p.summary,
    yearsOfExperience: p.yearsOfExperience,
    availability: p.availability,
    hourlyRateMin: p.hourlyRateMin ? Number(p.hourlyRateMin) : null,
    hourlyRateMax: p.hourlyRateMax ? Number(p.hourlyRateMax) : null,
    currency: p.currency,
    location: p.location,
    timezone: p.timezone,
    completenessScore: p.completenessScore,
    githubUsername: p.shareGitHubRepos ? p.user.githubUsername : null,
    githubProfileUrl: p.shareGitHubRepos ? p.githubProfileUrl : null,
    shareGitHubRepos: p.shareGitHubRepos,
    skills: p.skills.map((s) => ({
      name: s.name,
      normalizedName: s.normalizedName,
      category: s.category,
      source: s.source,
      isApproved: s.isApproved,
    })),
    portfolioProjects: p.portfolioProjects
      .filter((proj) => proj.isPublic)
      .map((proj) => ({
        id: proj.id,
        title: proj.title,
        summary: proj.summary,
        technologies: proj.technologies,
        projectUrl: proj.projectUrl,
        repoFullName: proj.repoFullName,
        isPublic: proj.isPublic,
      })),
  };
}

function serializePublicDeveloperProfile(
  p: ProfileWithSignals,
  assessment?: CandidateMatchAssessment | null
) {
  const approvedSkills = p.skills.filter((s) => s.isApproved);
  return {
    id: p.id,
    userId: p.userId,
    displayName: p.displayName,
    avatarUrl: p.user.avatarUrl,
    headline: p.headline,
    summary: p.summary,
    yearsOfExperience: p.yearsOfExperience,
    availability: p.availability,
    hourlyRateMin: p.hourlyRateMin ? Number(p.hourlyRateMin) : null,
    hourlyRateMax: p.hourlyRateMax ? Number(p.hourlyRateMax) : null,
    currency: p.currency,
    location: p.location,
    timezone: p.timezone,
    portfolioUrl: p.portfolioUrl,
    linkedinUrl: p.linkedinUrl,
    githubProfileUrl: p.shareGitHubRepos ? p.githubProfileUrl : null,
    githubUsername: p.shareGitHubRepos ? p.user.githubUsername : null,
    contactEmail: p.shareContactEmail ? p.user.email : null,
    allowClientResumeDownload: p.allowClientResumeDownload,
    activeResumeId: p.allowClientResumeDownload ? p.activeResumeId : null,
    completenessScore: p.completenessScore,
    declaredSkills: approvedSkills
      .filter((s) => s.source === SkillSource.SELF_DECLARED)
      .map((s) => ({ name: s.name, category: s.category, yearsUsed: s.yearsUsed })),
    resumeSkills: approvedSkills
      .filter((s) => s.source === SkillSource.RESUME_EXTRACTED)
      .map((s) => ({ name: s.name, category: s.category })),
    githubObservedLanguages: p.shareGitHubRepos
      ? approvedSkills
          .filter((s) => s.source === SkillSource.GITHUB_OBSERVED)
          .map((s) => ({ name: s.name, sourceExcerpt: s.sourceExcerpt }))
      : [],
    portfolioProjects: p.portfolioProjects
      .filter((proj) => proj.isPublic)
      .map((proj) => ({
        id: proj.id,
        title: proj.title,
        role: proj.role,
        summary: proj.summary,
        technologies: proj.technologies,
        projectUrl: proj.projectUrl,
        repoFullName: p.shareGitHubRepos ? proj.repoFullName : null,
      })),
    match: assessment || null,
  };
}

export class MarketplaceService {
  private buildProfileFilterWhere(params: {
    q?: string;
    skills?: string;
    technologies?: string;
    minExperience?: number;
    availability?: DeveloperAvailability;
    maxHourlyRate?: number;
    location?: string;
    timezone?: string;
  }): Prisma.DeveloperProfileWhereInput {
    const skillTerms = [
      ...(params.skills ? params.skills.split(',') : []),
      ...(params.technologies ? params.technologies.split(',') : []),
    ]
      .map((s) => normalizeSkillName(s))
      .filter(Boolean);

    const andFilters: Prisma.DeveloperProfileWhereInput[] = [
      { visibility: { in: [ProfileVisibility.MARKETPLACE, ProfileVisibility.PUBLIC] } },
      { user: { role: { not: Role.CLIENT } } },
    ];

    if (params.availability) {
      andFilters.push({ availability: params.availability });
    }
    if (params.minExperience !== undefined) {
      andFilters.push({ yearsOfExperience: { gte: params.minExperience } });
    }
    if (params.maxHourlyRate !== undefined) {
      andFilters.push({
        OR: [{ hourlyRateMin: null }, { hourlyRateMin: { lte: params.maxHourlyRate } }],
      });
    }
    if (params.location) {
      andFilters.push({ location: { contains: params.location, mode: 'insensitive' } });
    }
    if (params.timezone) {
      andFilters.push({ timezone: { contains: params.timezone, mode: 'insensitive' } });
    }
    if (params.q) {
      const q = params.q.trim();
      andFilters.push({
        OR: [
          { displayName: { contains: q, mode: 'insensitive' } },
          { headline: { contains: q, mode: 'insensitive' } },
          { summary: { contains: q, mode: 'insensitive' } },
          {
            skills: {
              some: {
                isApproved: true,
                name: { contains: q, mode: 'insensitive' },
              },
            },
          },
          {
            portfolioProjects: {
              some: {
                isPublic: true,
                OR: [
                  { title: { contains: q, mode: 'insensitive' } },
                  { technologies: { has: q } },
                ],
              },
            },
          },
        ],
      });
    }
    for (const term of skillTerms) {
      andFilters.push({
        OR: [
          {
            skills: {
              some: {
                isApproved: true,
                normalizedName: { contains: term },
              },
            },
          },
          {
            portfolioProjects: {
              some: {
                isPublic: true,
                summary: { contains: term, mode: 'insensitive' },
              },
            },
          },
        ],
      });
    }

    return { AND: andFilters };
  }

  async searchDevelopers(query: z.infer<typeof SearchDevelopersQuerySchema>) {
    const where = this.buildProfileFilterWhere(query);
    const orderBy: Prisma.DeveloperProfileOrderByWithRelationInput =
      query.sortBy === 'experience'
        ? { yearsOfExperience: 'desc' }
        : query.sortBy === 'rate_asc'
          ? { hourlyRateMin: 'asc' }
          : query.sortBy === 'rate_desc'
            ? { hourlyRateMin: 'desc' }
            : { completenessScore: 'desc' };

    const skip = (query.page - 1) * query.limit;

    const [total, rows] = await Promise.all([
      prisma.developerProfile.count({ where }),
      prisma.developerProfile.findMany({
        where,
        orderBy,
        skip,
        take: query.limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
              githubUsername: true,
            },
          },
          skills: { where: { isApproved: true } },
          portfolioProjects: { where: { isPublic: true }, orderBy: { displayOrder: 'asc' } },
        },
      }),
    ]);

    return {
      developers: rows.map((p) => serializePublicDeveloperProfile(p, null)),
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  }

  async aiMatchDevelopers(
    clientId: string,
    input: z.infer<typeof AIMatchDevelopersSchema>
  ) {
    const where = this.buildProfileFilterWhere({
      availability: input.availability,
      maxHourlyRate: input.maxHourlyRate,
      location: input.location,
      timezone: input.timezone,
    });

    const candidates = await prisma.developerProfile.findMany({
      where,
      take: 40,
      orderBy: { completenessScore: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            githubUsername: true,
          },
        },
        skills: { where: { isApproved: true } },
        portfolioProjects: { where: { isPublic: true }, orderBy: { displayOrder: 'asc' } },
      },
    });

    let explicitMandatory: string[] = [];
    let explicitPreferred: string[] = [];
    let explicitMinYears: number | null = null;

    if (input.opportunityId) {
      const opp = await prisma.marketplaceOpportunity.findUnique({
        where: { id: input.opportunityId },
        include: { skills: true },
      });
      if (opp && opp.clientId === clientId) {
        explicitMandatory = opp.skills
          .filter((s) => s.requirementLevel === SkillRequirementLevel.MANDATORY)
          .map((s) => s.name);
        explicitPreferred = opp.skills
          .filter((s) => s.requirementLevel === SkillRequirementLevel.PREFERRED)
          .map((s) => s.name);
        explicitMinYears = opp.minYearsExperience;
      }
    }

    const ranking = await talentMatchingService.rankCandidatesForQuery({
      naturalLanguageQuery: input.query,
      candidates: candidates.map(toSignalSource),
      explicitMandatorySkills: explicitMandatory,
      explicitPreferredSkills: explicitPreferred,
      explicitMinYears,
    });

    // Persist explainable match snapshots
    const persistRows = candidates.slice(0, input.limit).map((cand) => {
      const a = ranking.assessments.get(cand.id);
      return {
        clientId,
        opportunityId: input.opportunityId || null,
        profileId: cand.id,
        queryText: input.query.slice(0, 1000),
        matchScore: a?.matchScore ?? null,
        insufficientData: a?.insufficientData ?? true,
        explanation: a?.explanation || 'Insufficient profile data.',
        matchedSkills: (a?.matchedSkills || []) as unknown as Prisma.InputJsonValue,
        missingSkills: a?.missingSkills || [],
        aiModelName: ranking.aiModelName,
      };
    });

    if (persistRows.length > 0) {
      await prisma.talentMatchResult.createMany({ data: persistRows });
    }

    const rankedDevelopers = candidates
      .map((cand) => {
        const assessment = ranking.assessments.get(cand.id) || null;
        return serializePublicDeveloperProfile(cand, assessment);
      })
      .sort((a, b) => {
        const sa = a.match?.insufficientData ? -1 : (a.match?.matchScore ?? -1);
        const sb = b.match?.insufficientData ? -1 : (b.match?.matchScore ?? -1);
        return sb - sa;
      })
      .slice(0, input.limit);

    return {
      query: input.query,
      extractedRequirements: ranking.extractedRequirements,
      aiModelName: ranking.aiModelName,
      disclaimer:
        'AI Match scores reflect estimated technical & profile relevance only — never guaranteed performance or automated hiring decisions.',
      developers: rankedDevelopers,
    };
  }

  async getPublicDeveloperProfile(
    profileId: string,
    viewer: { id: string; role: Role }
  ) {
    const profile = await prisma.developerProfile.findUnique({
      where: { id: profileId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            githubUsername: true,
          },
        },
        skills: { where: { isApproved: true } },
        portfolioProjects: { where: { isPublic: true }, orderBy: { displayOrder: 'asc' } },
      },
    });

    if (!profile) {
      throw new NotFoundError('Developer profile not found');
    }

    const isOwner = profile.userId === viewer.id;
    const isAdmin = viewer.role === Role.ADMIN;
    if (profile.visibility === ProfileVisibility.PRIVATE && !isOwner && !isAdmin) {
      throw new ForbiddenError('This developer profile is set to private.');
    }

    return serializePublicDeveloperProfile(profile, null);
  }

  async refineOpportunityWithAi(
    input: { title: string; description: string; expectedDuration?: string; budgetMin?: number; budgetMax?: number }
  ) {
    const res = await aiOrchestrator.refineOpportunityScope(input);
    return {
      suggestion: res.data,
      modelName: res.modelName,
      requiresClientApproval: true,
    };
  }

  async createOpportunity(
    clientId: string,
    input: z.infer<typeof CreateOpportunitySchema>
  ) {
    if (input.budgetMin && input.budgetMax && input.budgetMax < input.budgetMin) {
      throw new BadRequestError('Maximum budget cannot be lower than minimum budget.');
    }

    if (input.linkedProjectId) {
      const proj = await prisma.project.findUnique({ where: { id: input.linkedProjectId } });
      if (!proj || (proj.createdById !== clientId && proj.clientId !== clientId)) {
        throw new ForbiddenError('You can only link opportunities to your own projects.');
      }
    }

    const skillMap = new Map<string, (typeof input.skills)[number]>();
    for (const sk of input.skills) {
      skillMap.set(normalizeSkillName(sk.name), sk);
    }

    return prisma.marketplaceOpportunity.create({
      data: {
        clientId,
        linkedProjectId: input.linkedProjectId ?? null,
        title: input.title,
        organizationName: input.organizationName ?? null,
        description: input.description,
        deliverablesSummary: input.deliverablesSummary,
        aiEnhancedDescription: input.aiEnhancedDescription ?? null,
        aiApprovedByClient: input.aiApprovedByClient,
        visibility: input.visibility,
        status: OpportunityStatus.DRAFT,
        experienceLevel: input.experienceLevel ?? null,
        minYearsExperience: input.minYearsExperience ?? null,
        budgetMin: input.budgetMin !== undefined && input.budgetMin !== null ? new Prisma.Decimal(input.budgetMin) : null,
        budgetMax: input.budgetMax !== undefined && input.budgetMax !== null ? new Prisma.Decimal(input.budgetMax) : null,
        currency: input.currency,
        expectedDuration: input.expectedDuration ?? null,
        locationPreference: input.locationPreference ?? null,
        timezonePreference: input.timezonePreference ?? null,
        applicationDeadline: input.applicationDeadline ? new Date(input.applicationDeadline) : null,
        skills: {
          create: Array.from(skillMap.entries()).map(([normalizedName, sk]) => ({
            name: sk.name.trim(),
            normalizedName,
            category: sk.category || 'general',
            requirementLevel: sk.requirementLevel,
          })),
        },
      },
      include: { skills: true },
    });
  }

  async updateOpportunity(
    opportunityId: string,
    user: { id: string; role: Role },
    input: z.infer<typeof UpdateOpportunitySchema>
  ) {
    const existing = await prisma.marketplaceOpportunity.findUnique({ where: { id: opportunityId } });
    if (!existing) {
      throw new NotFoundError('Opportunity not found');
    }
    if (existing.clientId !== user.id && user.role !== Role.ADMIN) {
      throw new ForbiddenError('Only the opportunity owner can edit it.');
    }

    return prisma.$transaction(async (tx) => {
      if (input.skills !== undefined) {
        await tx.opportunitySkill.deleteMany({ where: { opportunityId } });
        if (input.skills.length > 0) {
          const map = new Map<string, (typeof input.skills)[number]>();
          for (const sk of input.skills) {
            map.set(normalizeSkillName(sk.name), sk);
          }
          await tx.opportunitySkill.createMany({
            data: Array.from(map.entries()).map(([normalizedName, sk]) => ({
              opportunityId,
              name: sk.name.trim(),
              normalizedName,
              category: sk.category || 'general',
              requirementLevel: sk.requirementLevel,
            })),
          });
        }
      }

      return tx.marketplaceOpportunity.update({
        where: { id: opportunityId },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.organizationName !== undefined ? { organizationName: input.organizationName } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.deliverablesSummary !== undefined ? { deliverablesSummary: input.deliverablesSummary } : {}),
          ...(input.aiEnhancedDescription !== undefined ? { aiEnhancedDescription: input.aiEnhancedDescription } : {}),
          ...(input.aiApprovedByClient !== undefined ? { aiApprovedByClient: input.aiApprovedByClient } : {}),
          ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.experienceLevel !== undefined ? { experienceLevel: input.experienceLevel } : {}),
          ...(input.minYearsExperience !== undefined ? { minYearsExperience: input.minYearsExperience } : {}),
          ...(input.budgetMin !== undefined
            ? { budgetMin: input.budgetMin !== null ? new Prisma.Decimal(input.budgetMin) : null }
            : {}),
          ...(input.budgetMax !== undefined
            ? { budgetMax: input.budgetMax !== null ? new Prisma.Decimal(input.budgetMax) : null }
            : {}),
          ...(input.currency !== undefined ? { currency: input.currency } : {}),
          ...(input.expectedDuration !== undefined ? { expectedDuration: input.expectedDuration } : {}),
          ...(input.locationPreference !== undefined ? { locationPreference: input.locationPreference } : {}),
          ...(input.timezonePreference !== undefined ? { timezonePreference: input.timezonePreference } : {}),
          ...(input.applicationDeadline !== undefined
            ? { applicationDeadline: input.applicationDeadline ? new Date(input.applicationDeadline) : null }
            : {}),
        },
        include: { skills: true },
      });
    });
  }

  async publishOpportunity(
    opportunityId: string,
    user: { id: string; role: Role },
    visibility: OpportunityVisibility
  ) {
    const existing = await prisma.marketplaceOpportunity.findUnique({ where: { id: opportunityId } });
    if (!existing) {
      throw new NotFoundError('Opportunity not found');
    }
    if (existing.clientId !== user.id && user.role !== Role.ADMIN) {
      throw new ForbiddenError('Only the opportunity owner can publish it.');
    }
    if (visibility === OpportunityVisibility.PRIVATE) {
      throw new BadRequestError('Select DISCOVERABLE or INVITE_ONLY visibility to publish an opportunity.');
    }

    return prisma.marketplaceOpportunity.update({
      where: { id: opportunityId },
      data: {
        visibility,
        status: OpportunityStatus.PUBLISHED,
        publishedAt: existing.publishedAt || new Date(),
      },
      include: { skills: true },
    });
  }

  async unpublishOpportunity(opportunityId: string, user: { id: string; role: Role }) {
    const existing = await prisma.marketplaceOpportunity.findUnique({ where: { id: opportunityId } });
    if (!existing) {
      throw new NotFoundError('Opportunity not found');
    }
    if (existing.clientId !== user.id && user.role !== Role.ADMIN) {
      throw new ForbiddenError('Only the opportunity owner can unpublish it.');
    }

    return prisma.marketplaceOpportunity.update({
      where: { id: opportunityId },
      data: {
        visibility: OpportunityVisibility.PRIVATE,
        status: OpportunityStatus.DRAFT,
      },
      include: { skills: true },
    });
  }

  async searchOpportunities(
    viewer: { id: string; role: Role },
    query: z.infer<typeof SearchOpportunitiesQuerySchema>
  ) {
    const andFilters: Prisma.MarketplaceOpportunityWhereInput[] = [];

    if (viewer.role === Role.CLIENT && query.mine === 'true') {
      andFilters.push({ clientId: viewer.id });
    } else if (viewer.role === Role.ADMIN && query.mine === 'true') {
      // admin inspecting all
    } else {
      // Marketplace discovery NEVER surfaces PRIVATE or DRAFT opportunities
      andFilters.push({ status: OpportunityStatus.PUBLISHED });
      andFilters.push({ visibility: OpportunityVisibility.DISCOVERABLE });
    }

    if (query.q) {
      const q = query.q.trim();
      andFilters.push({
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { organizationName: { contains: q, mode: 'insensitive' } },
          {
            skills: {
              some: { name: { contains: q, mode: 'insensitive' } },
            },
          },
        ],
      });
    }

    if (query.skills) {
      const terms = query.skills
        .split(',')
        .map((s) => normalizeSkillName(s))
        .filter(Boolean);
      for (const term of terms) {
        andFilters.push({
          skills: { some: { normalizedName: { contains: term } } },
        });
      }
    }

    if (query.experienceLevel) {
      andFilters.push({
        experienceLevel: { contains: query.experienceLevel, mode: 'insensitive' },
      });
    }
    if (query.minBudget !== undefined) {
      andFilters.push({
        OR: [{ budgetMax: null }, { budgetMax: { gte: query.minBudget } }],
      });
    }
    if (query.maxBudget !== undefined) {
      andFilters.push({
        OR: [{ budgetMin: null }, { budgetMin: { lte: query.maxBudget } }],
      });
    }
    if (query.savedOnly === 'true') {
      andFilters.push({
        savedBy: { some: { userId: viewer.id } },
      });
    }

    const where: Prisma.MarketplaceOpportunityWhereInput =
      andFilters.length > 0 ? { AND: andFilters } : {};
    const skip = (query.page - 1) * query.limit;

    const [total, rows] = await Promise.all([
      prisma.marketplaceOpportunity.count({ where }),
      prisma.marketplaceOpportunity.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: query.limit,
        include: {
          client: { select: { id: true, name: true } },
          skills: true,
          savedBy: { where: { userId: viewer.id }, select: { id: true } },
          applications:
            viewer.role === Role.CLIENT
              ? { select: { id: true, status: true } }
              : { where: { developerId: viewer.id }, select: { id: true, status: true } },
        },
      }),
    ]);

    return {
      opportunities: rows.map((opp) => ({
        id: opp.id,
        clientId: opp.clientId,
        clientDisplayName: opp.organizationName || opp.client.name,
        organizationName: opp.organizationName,
        linkedProjectId: opp.linkedProjectId,
        title: opp.title,
        description: opp.description,
        deliverablesSummary: opp.deliverablesSummary,
        aiEnhancedDescription: opp.aiEnhancedDescription,
        aiApprovedByClient: opp.aiApprovedByClient,
        visibility: opp.visibility,
        status: opp.status,
        experienceLevel: opp.experienceLevel,
        minYearsExperience: opp.minYearsExperience,
        budgetMin: opp.budgetMin ? Number(opp.budgetMin) : null,
        budgetMax: opp.budgetMax ? Number(opp.budgetMax) : null,
        currency: opp.currency,
        expectedDuration: opp.expectedDuration,
        locationPreference: opp.locationPreference,
        timezonePreference: opp.timezonePreference,
        applicationDeadline: opp.applicationDeadline?.toISOString() ?? null,
        publishedAt: opp.publishedAt?.toISOString() ?? null,
        createdAt: opp.createdAt.toISOString(),
        skills: opp.skills,
        isSaved: opp.savedBy.length > 0,
        applicantCount: viewer.role === Role.CLIENT ? opp.applications.length : undefined,
        myApplication:
          viewer.role !== Role.CLIENT && opp.applications[0] ? opp.applications[0] : null,
      })),
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  }

  async getOpportunityById(
    opportunityId: string,
    viewer: { id: string; role: Role }
  ) {
    const opp = await prisma.marketplaceOpportunity.findUnique({
      where: { id: opportunityId },
      include: {
        client: { select: { id: true, name: true } },
        skills: true,
        savedBy: { where: { userId: viewer.id }, select: { id: true } },
        applications:
          viewer.role === Role.CLIENT
            ? { select: { id: true, status: true } }
            : { where: { developerId: viewer.id }, select: { id: true, status: true, submittedAt: true } },
      },
    });

    if (!opp) {
      throw new NotFoundError('Opportunity not found');
    }

    const isOwner = opp.clientId === viewer.id;
    const isAdmin = viewer.role === Role.ADMIN;
    if (!isOwner && !isAdmin) {
      if (
        opp.status !== OpportunityStatus.PUBLISHED ||
        opp.visibility !== OpportunityVisibility.DISCOVERABLE
      ) {
        throw new ForbiddenError('This opportunity is private or unpublished.');
      }
    }

    return {
      id: opp.id,
      clientId: opp.clientId,
      clientDisplayName: opp.organizationName || opp.client.name,
      organizationName: opp.organizationName,
      linkedProjectId: opp.linkedProjectId,
      title: opp.title,
      description: opp.description,
      deliverablesSummary: opp.deliverablesSummary,
      aiEnhancedDescription: isOwner || isAdmin ? opp.aiEnhancedDescription : null,
      aiApprovedByClient: opp.aiApprovedByClient,
      visibility: opp.visibility,
      status: opp.status,
      experienceLevel: opp.experienceLevel,
      minYearsExperience: opp.minYearsExperience,
      budgetMin: opp.budgetMin ? Number(opp.budgetMin) : null,
      budgetMax: opp.budgetMax ? Number(opp.budgetMax) : null,
      currency: opp.currency,
      expectedDuration: opp.expectedDuration,
      locationPreference: opp.locationPreference,
      timezonePreference: opp.timezonePreference,
      applicationDeadline: opp.applicationDeadline?.toISOString() ?? null,
      publishedAt: opp.publishedAt?.toISOString() ?? null,
      createdAt: opp.createdAt.toISOString(),
      skills: opp.skills,
      isSaved: opp.savedBy.length > 0,
      applicantCount: isOwner || isAdmin ? opp.applications.length : undefined,
      myApplication: viewer.role !== Role.CLIENT && opp.applications[0] ? opp.applications[0] : null,
    };
  }

  async toggleSaveOpportunity(userId: string, opportunityId: string, save: boolean) {
    const opp = await prisma.marketplaceOpportunity.findUnique({ where: { id: opportunityId } });
    if (!opp || opp.status !== OpportunityStatus.PUBLISHED || opp.visibility !== OpportunityVisibility.DISCOVERABLE) {
      throw new NotFoundError('Discoverable opportunity not found');
    }

    if (save) {
      await prisma.savedOpportunity.upsert({
        where: { userId_opportunityId: { userId, opportunityId } },
        create: { userId, opportunityId },
        update: {},
      });
    } else {
      await prisma.savedOpportunity.deleteMany({
        where: { userId, opportunityId },
      });
    }

    return { saved: save, opportunityId };
  }

  async applyToOpportunity(
    developerId: string,
    opportunityId: string,
    input: z.infer<typeof ApplyOpportunitySchema>
  ) {
    const opp = await prisma.marketplaceOpportunity.findUnique({
      where: { id: opportunityId },
      include: { skills: true },
    });

    if (!opp) {
      throw new NotFoundError('Opportunity not found');
    }
    if (opp.clientId === developerId) {
      throw new ForbiddenError('You cannot apply to your own opportunity.');
    }
    if (opp.status !== OpportunityStatus.PUBLISHED || opp.visibility === OpportunityVisibility.PRIVATE) {
      throw new BadRequestError('This opportunity is not currently accepting marketplace applications.');
    }
    if (opp.applicationDeadline && opp.applicationDeadline.getTime() < Date.now()) {
      throw new BadRequestError('The application deadline for this opportunity has passed.');
    }

    const duplicate = await prisma.opportunityApplication.findUnique({
      where: { opportunityId_developerId: { opportunityId, developerId } },
    });
    if (duplicate) {
      throw new ConflictError(
        'You have already submitted an application to this opportunity.',
        undefined,
        'DUPLICATE_APPLICATION'
      );
    }

    const profile = await prisma.developerProfile.findUnique({
      where: { userId: developerId },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true, githubUsername: true } },
        skills: { where: { isApproved: true } },
        portfolioProjects: { where: { isPublic: true } },
      },
    });

    let matchScoreSnapshot: number | null = null;
    let matchSummarySnapshot: Record<string, unknown> | null = null;
    if (profile) {
      const det = talentMatchingService.evaluateDeterministicMatch({
        candidate: toSignalSource(profile),
        mandatorySkills: opp.skills
          .filter((s) => s.requirementLevel === SkillRequirementLevel.MANDATORY)
          .map((s) => s.name),
        preferredSkills: opp.skills
          .filter((s) => s.requirementLevel === SkillRequirementLevel.PREFERRED)
          .map((s) => s.name),
        minYearsExperience: opp.minYearsExperience,
        domainKeywords: [],
      });
      matchScoreSnapshot = det.matchScore;
      matchSummarySnapshot = {
        insufficientData: det.insufficientData,
        explanation: det.explanation,
        matchedSkills: det.matchedSkills,
        missingSkills: det.missingSkills,
      };
    }

    const application = await prisma.opportunityApplication.create({
      data: {
        opportunityId,
        developerId,
        profileId: profile?.id ?? null,
        resumeId: input.allowResumeDownload ? profile?.activeResumeId ?? null : null,
        status: ApplicationStatus.SUBMITTED,
        proposal: input.proposal,
        proposedBudget:
          input.proposedBudget !== undefined && input.proposedBudget !== null
            ? new Prisma.Decimal(input.proposedBudget)
            : null,
        currency: input.currency,
        estimatedTimeline: input.estimatedTimeline ?? null,
        selectedPortfolioIds: input.selectedPortfolioIds,
        allowResumeDownload: input.allowResumeDownload,
        matchScoreSnapshot,
        matchSummarySnapshot: matchSummarySnapshot
          ? (matchSummarySnapshot as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
      include: {
        opportunity: { select: { id: true, title: true, organizationName: true } },
      },
    });

    await notificationService.sendNotification({
      userId: opp.clientId,
      type: NotificationType.OPPORTUNITY_APPLIED,
      title: `New applicant for ${opp.title}`,
      message: `${profile?.displayName || 'A developer'} applied to your marketplace opportunity.`,
      linkUrl: '/talent-pipeline',
    });

    return application;
  }

  async getDeveloperApplications(developerId: string) {
    const rows = await prisma.opportunityApplication.findMany({
      where: { developerId },
      orderBy: { submittedAt: 'desc' },
      include: {
        opportunity: {
          include: {
            client: { select: { id: true, name: true } },
            skills: true,
          },
        },
      },
    });

    return rows.map((app) => ({
      id: app.id,
      opportunityId: app.opportunityId,
      status: app.status,
      proposal: app.proposal,
      proposedBudget: app.proposedBudget ? Number(app.proposedBudget) : null,
      currency: app.currency,
      estimatedTimeline: app.estimatedTimeline,
      allowResumeDownload: app.allowResumeDownload,
      clientNotes: app.clientNotes,
      matchScoreSnapshot: app.matchScoreSnapshot,
      submittedAt: app.submittedAt.toISOString(),
      reviewedAt: app.reviewedAt?.toISOString() ?? null,
      withdrawnAt: app.withdrawnAt?.toISOString() ?? null,
      opportunity: {
        id: app.opportunity.id,
        title: app.opportunity.title,
        clientDisplayName: app.opportunity.organizationName || app.opportunity.client.name,
        budgetMin: app.opportunity.budgetMin ? Number(app.opportunity.budgetMin) : null,
        budgetMax: app.opportunity.budgetMax ? Number(app.opportunity.budgetMax) : null,
        currency: app.opportunity.currency,
        expectedDuration: app.opportunity.expectedDuration,
        status: app.opportunity.status,
        skills: app.opportunity.skills,
      },
    }));
  }

  async withdrawApplication(applicationId: string, developerId: string) {
    const app = await prisma.opportunityApplication.findUnique({ where: { id: applicationId } });
    if (!app) {
      throw new NotFoundError('Application not found');
    }
    if (app.developerId !== developerId) {
      throw new ForbiddenError('You can only withdraw your own applications.');
    }
    if (app.status === ApplicationStatus.ACCEPTED) {
      throw new BadRequestError('Accepted applications cannot be withdrawn automatically.');
    }

    return prisma.opportunityApplication.update({
      where: { id: applicationId },
      data: {
        status: ApplicationStatus.WITHDRAWN,
        withdrawnAt: new Date(),
      },
    });
  }

  async getOpportunityApplicationsForClient(
    opportunityId: string,
    user: { id: string; role: Role }
  ) {
    const opp = await prisma.marketplaceOpportunity.findUnique({
      where: { id: opportunityId },
      include: { skills: true },
    });
    if (!opp) {
      throw new NotFoundError('Opportunity not found');
    }
    if (opp.clientId !== user.id && user.role !== Role.ADMIN) {
      throw new ForbiddenError('Only the owning client can review opportunity applicants.');
    }

    const applications = await prisma.opportunityApplication.findMany({
      where: { opportunityId },
      orderBy: [{ submittedAt: 'desc' }],
      include: {
        developer: { select: { id: true, name: true, avatarUrl: true, githubUsername: true } },
        profile: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true, githubUsername: true },
            },
            skills: { where: { isApproved: true } },
            portfolioProjects: { where: { isPublic: true } },
          },
        },
      },
    });

    return {
      opportunity: opp,
      applications: applications.map((a) => ({
        id: a.id,
        status: a.status,
        proposal: a.proposal,
        proposedBudget: a.proposedBudget ? Number(a.proposedBudget) : null,
        currency: a.currency,
        estimatedTimeline: a.estimatedTimeline,
        allowResumeDownload: a.allowResumeDownload,
        resumeId: a.allowResumeDownload ? a.resumeId : null,
        clientNotes: a.clientNotes,
        matchScoreSnapshot: a.matchScoreSnapshot,
        matchSummarySnapshot: a.matchSummarySnapshot,
        submittedAt: a.submittedAt.toISOString(),
        reviewedAt: a.reviewedAt?.toISOString() ?? null,
        candidate: a.profile
          ? serializePublicDeveloperProfile(a.profile, null)
          : {
              id: null,
              userId: a.developerId,
              displayName: a.developer.name,
              avatarUrl: a.developer.avatarUrl,
              headline: null,
              summary: null,
              yearsOfExperience: null,
              availability: 'OPEN_TO_OFFERS',
              declaredSkills: [],
              resumeSkills: [],
              githubObservedLanguages: [],
              portfolioProjects: [],
              completenessScore: 0,
            },
      })),
    };
  }

  async updateApplicationStatus(
    applicationId: string,
    user: { id: string; role: Role },
    input: z.infer<typeof UpdateApplicationStatusSchema>
  ) {
    const application = await prisma.opportunityApplication.findUnique({
      where: { id: applicationId },
      include: { opportunity: true },
    });
    if (!application) {
      throw new NotFoundError('Application not found');
    }
    if (application.opportunity.clientId !== user.id && user.role !== Role.ADMIN) {
      throw new ForbiddenError('Only the opportunity owner can update application statuses.');
    }
    if (application.status === ApplicationStatus.WITHDRAWN) {
      throw new BadRequestError('Cannot update an application already withdrawn by the developer.');
    }

    const updated = await prisma.opportunityApplication.update({
      where: { id: applicationId },
      data: {
        status: input.status,
        ...(input.clientNotes !== undefined ? { clientNotes: input.clientNotes } : {}),
        reviewedAt: new Date(),
      },
    });

    await notificationService.sendNotification({
      userId: application.developerId,
      type: NotificationType.APPLICATION_STATUS_UPDATED,
      title: `Application ${input.status.replace(/_/g, ' ').toLowerCase()}`,
      message: `Your application for "${application.opportunity.title}" is now ${input.status.replace(/_/g, ' ')}.`,
      linkUrl: '/my-applications',
    });

    return updated;
  }

  async compareCandidatesForOpportunity(
    opportunityId: string,
    user: { id: string; role: Role },
    input: z.infer<typeof CompareCandidatesSchema>
  ) {
    const opp = await prisma.marketplaceOpportunity.findUnique({
      where: { id: opportunityId },
      include: { skills: true },
    });
    if (!opp) {
      throw new NotFoundError('Opportunity not found');
    }
    if (opp.clientId !== user.id && user.role !== Role.ADMIN) {
      throw new ForbiddenError('Only the opportunity owner can compare candidates.');
    }

    const mandatory = opp.skills
      .filter((s) => s.requirementLevel === SkillRequirementLevel.MANDATORY)
      .map((s) => s.name);
    const preferred = opp.skills
      .filter((s) => s.requirementLevel === SkillRequirementLevel.PREFERRED)
      .map((s) => s.name);

    const comparisonEntries: Array<{
      applicationId: string | null;
      applicationStatus: string | null;
      proposedBudget: number | null;
      currency: string;
      candidate: ReturnType<typeof serializePublicDeveloperProfile>;
      assessment: CandidateMatchAssessment;
    }> = [];

    if (input.applicationIds && input.applicationIds.length > 0) {
      const apps = await prisma.opportunityApplication.findMany({
        where: { id: { in: input.applicationIds }, opportunityId },
        include: {
          profile: {
            include: {
              user: { select: { id: true, name: true, email: true, avatarUrl: true, githubUsername: true } },
              skills: { where: { isApproved: true } },
              portfolioProjects: { where: { isPublic: true } },
            },
          },
        },
      });
      for (const app of apps) {
        if (!app.profile) continue;
        const det = talentMatchingService.evaluateDeterministicMatch({
          candidate: toSignalSource(app.profile),
          mandatorySkills: mandatory,
          preferredSkills: preferred,
          minYearsExperience: opp.minYearsExperience,
          domainKeywords: [],
        });
        const assessment: CandidateMatchAssessment = { ...det, aiModelName: null };
        comparisonEntries.push({
          applicationId: app.id,
          applicationStatus: app.status,
          proposedBudget: app.proposedBudget ? Number(app.proposedBudget) : null,
          currency: app.currency,
          candidate: serializePublicDeveloperProfile(app.profile, assessment),
          assessment,
        });
      }
    } else if (input.profileIds && input.profileIds.length > 0) {
      const profiles = await prisma.developerProfile.findMany({
        where: {
          id: { in: input.profileIds },
          visibility: { in: [ProfileVisibility.MARKETPLACE, ProfileVisibility.PUBLIC] },
        },
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true, githubUsername: true } },
          skills: { where: { isApproved: true } },
          portfolioProjects: { where: { isPublic: true } },
        },
      });
      for (const profile of profiles) {
        const det = talentMatchingService.evaluateDeterministicMatch({
          candidate: toSignalSource(profile),
          mandatorySkills: mandatory,
          preferredSkills: preferred,
          minYearsExperience: opp.minYearsExperience,
          domainKeywords: [],
        });
        const assessment: CandidateMatchAssessment = { ...det, aiModelName: null };
        comparisonEntries.push({
          applicationId: null,
          applicationStatus: null,
          proposedBudget: null,
          currency: opp.currency,
          candidate: serializePublicDeveloperProfile(profile, assessment),
          assessment,
        });
      }
    } else {
      throw new BadRequestError('Provide at least two applicationIds or profileIds to compare.');
    }

    if (comparisonEntries.length < 2) {
      throw new BadRequestError('At least two valid candidates are required for side-by-side comparison.');
    }

    return {
      opportunity: {
        id: opp.id,
        title: opp.title,
        mandatorySkills: mandatory,
        preferredSkills: preferred,
        minYearsExperience: opp.minYearsExperience,
        budgetMin: opp.budgetMin ? Number(opp.budgetMin) : null,
        budgetMax: opp.budgetMax ? Number(opp.budgetMax) : null,
        currency: opp.currency,
      },
      isAdvisoryOnly: true,
      disclaimer:
        'Side-by-side comparison summarizes observed profile, resume, and GitHub signals. Final selection must be made by the client.',
      candidates: comparisonEntries,
    };
  }
}

export const marketplaceService = new MarketplaceService();
