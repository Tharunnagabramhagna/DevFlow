import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import {
  ApplicationStatus,
  DeveloperAvailability,
  OpportunityStatus,
  OpportunityVisibility,
  ProfileVisibility,
  Role,
  SkillRequirementLevel,
  SkillSource,
} from '@prisma/client';
import { app } from '../src/app';
import { prisma } from '../src/config/database';
import { env } from '../src/config/env';
import { talentMatchingService } from '../src/modules/marketplace/talentMatching.service';

vi.mock('../src/config/database', () => {
  const mockPrisma: any = {
    user: {
      findUnique: vi.fn(),
    },
    developerProfile: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    marketplaceOpportunity: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    opportunityApplication: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    savedOpportunity: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    talentMatchResult: {
      createMany: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
  };
  return { prisma: mockPrisma };
});

function signTestJwt(userId: string, email: string, role: Role | 'GUEST', isGuest = false) {
  return jwt.sign({ sub: userId, email, role, isGuest }, env.JWT_SECRET, { expiresIn: '1h' });
}

describe('Feature 2: AI-Powered Talent Marketplace Suite', () => {
  const devToken = signTestJwt('dev-1', 'dev@devflow.test', Role.FREELANCER);
  const clientToken = signTestJwt('client-1', 'client@devflow.test', Role.CLIENT);
  const otherClientToken = signTestJwt('client-2', 'otherclient@devflow.test', Role.CLIENT);
  const guestToken = signTestJwt('guest-1', 'guest@devflow.test', 'GUEST', true);

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.user.findUnique as any).mockImplementation(({ where }: any) => {
      if (where.id === 'dev-1') {
        return Promise.resolve({
          id: 'dev-1',
          email: 'dev@devflow.test',
          name: 'Ada Developer',
          role: Role.FREELANCER,
          isVerified: true,
        });
      }
      if (where.id === 'client-1') {
        return Promise.resolve({
          id: 'client-1',
          email: 'client@devflow.test',
          name: 'Grace Client',
          role: Role.CLIENT,
          isVerified: true,
        });
      }
      if (where.id === 'client-2') {
        return Promise.resolve({
          id: 'client-2',
          email: 'otherclient@devflow.test',
          name: 'Other Client',
          role: Role.CLIENT,
          isVerified: true,
        });
      }
      return Promise.resolve(null);
    });
  });

  it('produces explainable match scores and distinguishes GitHub-observed vs resume/self-declared skills, handling insufficient data cleanly', async () => {
    const result = await talentMatchingService.rankCandidatesForQuery({
      naturalLanguageQuery: 'Looking for a senior TypeScript and PostgreSQL developer for milestone APIs',
      explicitMandatorySkills: ['TypeScript', 'PostgreSQL'],
      explicitPreferredSkills: ['React'],
      explicitMinYears: 3,
      candidates: [
        {
          profileId: 'prof-rich',
          userId: 'dev-1',
          displayName: 'Ada Developer',
          headline: 'Senior Backend TypeScript Engineer',
          summary: 'Experienced designing PostgreSQL schemas and Node.js APIs.',
          yearsOfExperience: 5,
          availability: DeveloperAvailability.AVAILABLE,
          hourlyRateMin: 60,
          hourlyRateMax: 95,
          currency: 'USD',
          location: 'Remote',
          timezone: 'UTC',
          completenessScore: 90,
          githubUsername: 'adalovelace',
          githubProfileUrl: 'https://github.com/adalovelace',
          shareGitHubRepos: true,
          skills: [
            {
              name: 'TypeScript',
              normalizedName: 'typescript',
              category: 'language',
              source: SkillSource.GITHUB_OBSERVED,
              isApproved: true,
            },
            {
              name: 'PostgreSQL',
              normalizedName: 'postgresql',
              category: 'database',
              source: SkillSource.RESUME_EXTRACTED,
              isApproved: true,
            },
          ],
          portfolioProjects: [
            {
              id: 'proj-1',
              title: 'Escrow Ledger API',
              summary: 'Built TypeScript APIs with PostgreSQL transactions.',
              technologies: ['TypeScript', 'PostgreSQL'],
              projectUrl: null,
              repoFullName: 'adalovelace/escrow-ledger',
              isPublic: true,
            },
          ],
        },
        {
          profileId: 'prof-sparse',
          userId: 'dev-2',
          displayName: 'New User',
          headline: null,
          summary: null,
          yearsOfExperience: null,
          availability: DeveloperAvailability.AVAILABLE,
          hourlyRateMin: null,
          hourlyRateMax: null,
          currency: 'USD',
          location: null,
          timezone: null,
          completenessScore: 10,
          githubUsername: null,
          githubProfileUrl: null,
          shareGitHubRepos: false,
          skills: [],
          portfolioProjects: [],
        },
      ],
    });

    const rich = result.assessments.get('prof-rich')!;
    expect(rich.insufficientData).toBe(false);
    expect(rich.matchScore).toBeGreaterThan(50);
    const tsMatch = rich.matchedSkills.find((s) => s.skill === 'TypeScript');
    const pgMatch = rich.matchedSkills.find((s) => s.skill === 'PostgreSQL');
    expect(tsMatch?.status).toBe('STRONG_MATCH');
    expect(pgMatch?.status).toBe('RESUME_STATED');
    expect(rich.missingSkills).toContain('React');

    const sparse = result.assessments.get('prof-sparse')!;
    expect(sparse.insufficientData).toBe(true);
    expect(sparse.matchScore).toBeNull();
    expect(sparse.explanation).toMatch(/Insufficient profile data/i);
  });

  it('enforces strict Client vs Developer vs Guest marketplace role separation', async () => {
    const guestRes = await request(app)
      .get('/api/marketplace/opportunities')
      .set('Authorization', `Bearer ${guestToken}`);
    expect(guestRes.status).toBe(403);

    const devSearchRes = await request(app)
      .get('/api/marketplace/developers')
      .set('Authorization', `Bearer ${devToken}`);
    expect(devSearchRes.status).toBe(403);

    const clientApplyRes = await request(app)
      .post('/api/marketplace/opportunities/opp-1/apply')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ proposal: 'Hello there, let me apply as client!' });
    expect(clientApplyRes.status).toBe(403);
  });

  it('queries only MARKETPLACE/PUBLIC developer profiles in AI matching and appends advisory disclaimer', async () => {
    (prisma.developerProfile.findMany as any).mockResolvedValue([
      {
        id: 'prof-1',
        userId: 'dev-1',
        displayName: 'Ada Developer',
        headline: 'Fullstack TypeScript Engineer',
        summary: 'Builds scalable Node and React apps.',
        yearsOfExperience: 4,
        availability: DeveloperAvailability.AVAILABLE,
        visibility: ProfileVisibility.PUBLIC,
        hourlyRateMin: 55,
        hourlyRateMax: 85,
        currency: 'USD',
        location: 'Remote',
        timezone: 'UTC',
        allowClientResumeDownload: false,
        showPortfolioToClients: true,
        shareGitHubRepos: true,
        completenessScore: 85,
        user: {
          id: 'dev-1',
          name: 'Ada Developer',
          email: 'dev@devflow.test',
          avatarUrl: null,
          githubUsername: 'adalovelace',
        },
        skills: [
          {
            id: 's1',
            name: 'TypeScript',
            normalizedName: 'typescript',
            category: 'language',
            source: SkillSource.GITHUB_OBSERVED,
            isApproved: true,
            yearsUsed: 4,
          },
        ],
        portfolioProjects: [],
      },
    ]);
    (prisma.talentMatchResult.createMany as any).mockResolvedValue({ count: 1 });

    const res = await request(app)
      .post('/api/marketplace/developers/match')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ query: 'Need TypeScript developer for REST API' });

    expect(res.status).toBe(200);
    expect(res.body.disclaimer).toMatch(/advisory|estimated technical|never guaranteed/i);
    expect(res.body.developers).toHaveLength(1);
    expect(prisma.developerProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              visibility: { in: [ProfileVisibility.MARKETPLACE, ProfileVisibility.PUBLIC] },
            }),
          ]),
        }),
      })
    );
  });

  it('requires explicit client approval metadata on AI opportunity refinement', async () => {
    const res = await request(app)
      .post('/api/marketplace/opportunities/ai-refine')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        title: 'Escrow Milestone Portal',
        description: 'Need an engineer to build TypeScript APIs and PostgreSQL migrations.',
      });

    expect(res.status).toBe(200);
    expect(res.body.requiresClientApproval).toBe(true);
    expect(res.body.suggestion.improvedDescription).toBeTruthy();
  });

  it('prevents duplicate applications with 409 and isolates client pipeline management', async () => {
    (prisma.marketplaceOpportunity.findUnique as any).mockResolvedValue({
      id: 'opp-1',
      clientId: 'client-1',
      title: 'Public Fintech Backend',
      status: OpportunityStatus.PUBLISHED,
      visibility: OpportunityVisibility.DISCOVERABLE,
      applicationDeadline: null,
      skills: [{ name: 'TypeScript', requirementLevel: SkillRequirementLevel.MANDATORY }],
    });
    (prisma.opportunityApplication.findUnique as any).mockResolvedValue({
      id: 'existing-app',
    });

    const dupRes = await request(app)
      .post('/api/marketplace/opportunities/opp-1/apply')
      .set('Authorization', `Bearer ${devToken}`)
      .send({
        proposal: 'I have 5 years of production TypeScript and PostgreSQL milestone delivery experience.',
        allowResumeDownload: true,
      });

    expect(dupRes.status).toBe(409);
    expect(dupRes.body.error.code).toBe('DUPLICATE_APPLICATION');

    // Non-owner client cannot inspect opp-1 applications
    const nonOwnerRes = await request(app)
      .get('/api/marketplace/opportunities/opp-1/applications')
      .set('Authorization', `Bearer ${otherClientToken}`);
    expect(nonOwnerRes.status).toBe(403);
  });

  it('returns advisory-only flag when comparing candidates side-by-side', async () => {
    const appUuid1 = '11111111-1111-4111-8111-111111111111';
    const appUuid2 = '22222222-2222-4222-8222-222222222222';
    (prisma.marketplaceOpportunity.findUnique as any).mockResolvedValue({
      id: 'opp-1',
      clientId: 'client-1',
      title: 'Public Fintech Backend',
      skills: [],
    });
    (prisma.opportunityApplication.findMany as any).mockResolvedValue([
      {
        id: appUuid1,
        developerId: 'dev-1',
        status: ApplicationStatus.SHORTLISTED,
        proposedBudget: 4000,
        currency: 'USD',
        estimatedTimeline: '4 weeks',
        allowResumeDownload: true,
        matchScoreSnapshot: 88,
        submittedAt: new Date(),
        profile: {
          id: 'prof-1',
          userId: 'dev-1',
          displayName: 'Ada Developer',
          headline: 'Senior Backend Engineer',
          summary: 'Experienced backend systems engineer.',
          yearsOfExperience: 5,
          availability: DeveloperAvailability.AVAILABLE,
          visibility: ProfileVisibility.PUBLIC,
          hourlyRateMin: 70,
          hourlyRateMax: 100,
          currency: 'USD',
          location: 'Remote',
          timezone: 'UTC',
          allowClientResumeDownload: true,
          showPortfolioToClients: true,
          shareGitHubRepos: true,
          completenessScore: 90,
          user: {
            id: 'dev-1',
            name: 'Ada Developer',
            email: 'dev@devflow.test',
            avatarUrl: null,
            githubUsername: 'adalovelace',
          },
          skills: [],
          portfolioProjects: [],
        },
      },
      {
        id: appUuid2,
        developerId: 'dev-2',
        status: ApplicationStatus.UNDER_REVIEW,
        proposedBudget: 4500,
        currency: 'USD',
        estimatedTimeline: '5 weeks',
        allowResumeDownload: false,
        matchScoreSnapshot: 76,
        submittedAt: new Date(),
        profile: {
          id: 'prof-2',
          userId: 'dev-2',
          displayName: 'Alan Backend',
          headline: 'API Architect',
          summary: 'Designs PostgreSQL microservices.',
          yearsOfExperience: 4,
          availability: DeveloperAvailability.AVAILABLE,
          visibility: ProfileVisibility.MARKETPLACE,
          hourlyRateMin: 65,
          hourlyRateMax: 90,
          currency: 'USD',
          location: 'Remote',
          timezone: 'UTC',
          allowClientResumeDownload: false,
          showPortfolioToClients: true,
          shareGitHubRepos: false,
          completenessScore: 80,
          user: {
            id: 'dev-2',
            name: 'Alan Backend',
            email: 'alan@devflow.test',
            avatarUrl: null,
            githubUsername: null,
          },
          skills: [],
          portfolioProjects: [],
        },
      },
    ]);

    const compareRes = await request(app)
      .post('/api/marketplace/opportunities/opp-1/compare')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ applicationIds: [appUuid1, appUuid2] });

    expect(compareRes.status).toBe(200);
    expect(compareRes.body.isAdvisoryOnly).toBe(true);
    expect(compareRes.body.candidates).toHaveLength(2);
    expect(compareRes.body.candidates[0].candidate.allowClientResumeDownload).toBe(true);
    expect(compareRes.body.candidates[1].candidate.allowClientResumeDownload).toBe(false);
  });
});
