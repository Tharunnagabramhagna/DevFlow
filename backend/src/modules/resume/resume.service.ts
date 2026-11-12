import path from 'path';
import {
  ApplicationStatus,
  DeveloperProfile,
  Prisma,
  ProfileVisibility,
  ResumeParseStatus,
  Role,
  SkillSource,
} from '@prisma/client';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { LocalStorageService } from '../../services/storage.service';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../utils/errors';
import { aiOrchestrator } from '../ai/ai.orchestrator';
import { ResumeExtractionOutput } from '../ai/ai.schema';
import { githubService } from '../github/github.service';
import {
  buildResumeDocxBuffer,
  buildResumePdfBuffer,
  getResumeTemplateOrThrow,
  RESUME_TEMPLATES,
  StructuredResumeDocument,
} from './resumeExport.service';
import { validateAndExtractResumeText } from './resumeParser.service';
import {
  ExportResumeSchema,
  GenerateResumeTemplateSchema,
  ReviewResumeExtractionSchema,
  UpdateCareerProfileSchema,
} from './resume.schema';
import { z } from 'zod';
import logger from '../../utils/logger';

export const resumeStorage = new LocalStorageService(
  path.join(env.UPLOAD_DIR || 'uploads', 'resumes')
);

export function normalizeSkillName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function computeCompletenessScore(params: {
  headline?: string | null;
  summary?: string | null;
  yearsOfExperience?: number | null;
  availability?: string | null;
  skillsCount: number;
  portfolioCount: number;
  hasReviewedResume: boolean;
  hasAnyResume: boolean;
  githubConnected: boolean;
}): { score: number; breakdown: Array<{ label: string; completed: boolean; weight: number }> } {
  const breakdown = [
    {
      label: 'Headline & professional summary',
      completed: Boolean(params.headline?.trim() && params.summary && params.summary.trim().length >= 30),
      weight: 20,
    },
    {
      label: 'Experience & availability details',
      completed: params.yearsOfExperience !== null && params.yearsOfExperience !== undefined && Boolean(params.availability),
      weight: 15,
    },
    {
      label: 'At least 3 approved technical skills',
      completed: params.skillsCount >= 3,
      weight: 25,
    },
    {
      label: 'Portfolio or selected project evidence',
      completed: params.portfolioCount >= 1,
      weight: 20,
    },
    {
      label: 'Uploaded & reviewed resume',
      completed: params.hasReviewedResume,
      weight: params.hasReviewedResume ? 15 : params.hasAnyResume ? 5 : 0,
    },
    {
      label: 'Connected GitHub account',
      completed: params.githubConnected,
      weight: 5,
    },
  ];

  const score = breakdown.reduce((acc, item) => {
    if (item.label === 'Uploaded & reviewed resume') {
      return acc + item.weight;
    }
    return acc + (item.completed ? item.weight : 0);
  }, 0);

  return { score: Math.min(100, score), breakdown };
}

export class ResumeService {
  async ensureDeveloperProfile(userId: string): Promise<DeveloperProfile> {
    const existing = await prisma.developerProfile.findUnique({ where: { userId } });
    if (existing) {
      return existing;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, bio: true, githubUsername: true },
    });
    if (!user) {
      throw new NotFoundError('Developer account not found');
    }

    return prisma.developerProfile.create({
      data: {
        userId: user.id,
        displayName: user.name,
        summary: user.bio || null,
        githubProfileUrl: user.githubUsername ? `https://github.com/${user.githubUsername}` : null,
        visibility: ProfileVisibility.PRIVATE,
        allowClientResumeDownload: false,
      },
    });
  }

  async getDeveloperStudioState(userId: string) {
    const profile = await this.ensureDeveloperProfile(userId);

    const [fullProfile, user, resumes] = await Promise.all([
      prisma.developerProfile.findUniqueOrThrow({
        where: { id: profile.id },
        include: {
          skills: { orderBy: [{ source: 'asc' }, { name: 'asc' }] },
          portfolioProjects: { orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }] },
        },
      }),
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          githubId: true,
          githubUsername: true,
          githubConnectedAt: true,
        },
      }),
      prisma.developerResume.findMany({
        where: { userId, isArchived: false },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
        include: { file: true },
      }),
    ]);

    const approvedSkillsCount = fullProfile.skills.filter((s) => s.isApproved).length;
    const hasReviewedResume = resumes.some((r) => r.reviewedByDeveloper);
    const { score, breakdown } = computeCompletenessScore({
      headline: fullProfile.headline,
      summary: fullProfile.summary,
      yearsOfExperience: fullProfile.yearsOfExperience,
      availability: fullProfile.availability,
      skillsCount: approvedSkillsCount,
      portfolioCount: fullProfile.portfolioProjects.length,
      hasReviewedResume,
      hasAnyResume: resumes.length > 0,
      githubConnected: Boolean(user.githubId && user.githubUsername),
    });

    if (score !== fullProfile.completenessScore) {
      await prisma.developerProfile.update({
        where: { id: fullProfile.id },
        data: { completenessScore: score },
      });
    }

    let githubRepositories: Array<{
      id: number;
      fullName: string;
      htmlUrl: string;
      description: string | null;
      language: string | null;
      private: boolean;
      pushedAt: string | null;
    }> = [];

    if (user.githubId) {
      try {
        const repoList = await githubService.listRepositories(userId, { perPage: 12 });
        githubRepositories = repoList.repositories
          .filter((r) => !r.private)
          .slice(0, 8)
          .map((r) => ({
            id: r.id,
            fullName: r.fullName,
            htmlUrl: r.htmlUrl,
            description: r.description,
            language: r.language,
            private: r.private,
            pushedAt: r.pushedAt,
          }));
      } catch {
        githubRepositories = [];
      }
    }

    return {
      profile: {
        ...fullProfile,
        hourlyRateMin: fullProfile.hourlyRateMin ? Number(fullProfile.hourlyRateMin) : null,
        hourlyRateMax: fullProfile.hourlyRateMax ? Number(fullProfile.hourlyRateMax) : null,
        completenessScore: score,
        completenessBreakdown: breakdown,
        githubUsername: user.githubUsername,
        githubConnected: Boolean(user.githubId),
      },
      resumes: resumes.map((r) => ({
        id: r.id,
        versionNumber: r.versionNumber,
        isPrimary: r.isPrimary,
        parseStatus: r.parseStatus,
        parseError: r.parseError,
        parserMethod: r.parserMethod,
        aiModelName: r.aiModelName,
        extractionConfidence: r.extractionConfidence,
        lowConfidenceFields: r.lowConfidenceFields,
        extractedTextExcerpt: r.extractedTextExcerpt,
        extractedData: r.extractedData,
        approvedData: r.approvedData,
        reviewedByDeveloper: r.reviewedByDeveloper,
        reviewedAt: r.reviewedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
        file: r.file
          ? {
              originalName: r.file.originalName,
              detectedMimeType: r.file.detectedMimeType,
              fileExtension: r.file.fileExtension,
              sizeBytes: r.file.sizeBytes,
              createdAt: r.file.createdAt.toISOString(),
            }
          : null,
      })),
      githubRepositories,
      templates: RESUME_TEMPLATES,
    };
  }

  async updateCareerProfile(
    userId: string,
    input: z.infer<typeof UpdateCareerProfileSchema>
  ) {
    const profile = await this.ensureDeveloperProfile(userId);

    if (
      input.hourlyRateMin !== undefined &&
      input.hourlyRateMin !== null &&
      input.hourlyRateMax !== undefined &&
      input.hourlyRateMax !== null &&
      input.hourlyRateMax < input.hourlyRateMin
    ) {
      throw new BadRequestError('Maximum hourly rate cannot be below minimum hourly rate.');
    }

    await prisma.$transaction(async (tx) => {
      const nextPublishedAt =
        input.visibility && input.visibility !== ProfileVisibility.PRIVATE
          ? profile.publishedAt || new Date()
          : input.visibility === ProfileVisibility.PRIVATE
            ? null
            : profile.publishedAt;

      await tx.developerProfile.update({
        where: { id: profile.id },
        data: {
          ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
          ...(input.headline !== undefined ? { headline: input.headline } : {}),
          ...(input.summary !== undefined ? { summary: input.summary } : {}),
          ...(input.yearsOfExperience !== undefined
            ? { yearsOfExperience: input.yearsOfExperience }
            : {}),
          ...(input.availability !== undefined ? { availability: input.availability } : {}),
          ...(input.hourlyRateMin !== undefined
            ? {
                hourlyRateMin:
                  input.hourlyRateMin !== null ? new Prisma.Decimal(input.hourlyRateMin) : null,
              }
            : {}),
          ...(input.hourlyRateMax !== undefined
            ? {
                hourlyRateMax:
                  input.hourlyRateMax !== null ? new Prisma.Decimal(input.hourlyRateMax) : null,
              }
            : {}),
          ...(input.currency !== undefined ? { currency: input.currency } : {}),
          ...(input.location !== undefined ? { location: input.location } : {}),
          ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
          ...(input.portfolioUrl !== undefined
            ? { portfolioUrl: input.portfolioUrl || null }
            : {}),
          ...(input.linkedinUrl !== undefined ? { linkedinUrl: input.linkedinUrl || null } : {}),
          ...(input.githubProfileUrl !== undefined
            ? { githubProfileUrl: input.githubProfileUrl || null }
            : {}),
          ...(input.visibility !== undefined
            ? { visibility: input.visibility, publishedAt: nextPublishedAt }
            : {}),
          ...(input.shareContactEmail !== undefined
            ? { shareContactEmail: input.shareContactEmail }
            : {}),
          ...(input.shareGitHubRepos !== undefined
            ? { shareGitHubRepos: input.shareGitHubRepos }
            : {}),
          ...(input.allowClientResumeDownload !== undefined
            ? { allowClientResumeDownload: input.allowClientResumeDownload }
            : {}),
          ...(input.selectedTemplateId !== undefined
            ? { selectedTemplateId: input.selectedTemplateId }
            : {}),
          lastReviewedAt: new Date(),
        },
      });

      if (input.skills !== undefined) {
        await tx.developerSkill.deleteMany({
          where: { profileId: profile.id, source: SkillSource.SELF_DECLARED },
        });
        if (input.skills.length > 0) {
          const uniqueMap = new Map<string, (typeof input.skills)[number]>();
          for (const sk of input.skills) {
            uniqueMap.set(normalizeSkillName(sk.name), sk);
          }
          await tx.developerSkill.createMany({
            data: Array.from(uniqueMap.entries()).map(([normalizedName, sk]) => ({
              profileId: profile.id,
              name: sk.name.trim(),
              normalizedName,
              category: sk.category || 'tool',
              source: SkillSource.SELF_DECLARED,
              yearsUsed: sk.yearsUsed ?? null,
              proficiency: sk.proficiency ?? null,
              confidence: 100,
              needsReview: false,
              isApproved: true,
            })),
          });
        }
      }

      if (input.portfolioProjects !== undefined) {
        await tx.portfolioProject.deleteMany({
          where: { profileId: profile.id, source: 'MANUAL' },
        });
        if (input.portfolioProjects.length > 0) {
          await tx.portfolioProject.createMany({
            data: input.portfolioProjects.map((proj, index) => ({
              profileId: profile.id,
              title: proj.title,
              role: proj.role ?? null,
              summary: proj.summary,
              technologies: proj.technologies,
              projectUrl: proj.projectUrl || null,
              repoFullName: proj.repoFullName ?? null,
              startDate: proj.startDate ?? null,
              endDate: proj.endDate ?? null,
              source: 'MANUAL',
              isPublic: proj.isPublic,
              displayOrder: index,
            })),
          });
        }
      }
    });

    return this.getDeveloperStudioState(userId);
  }

  async syncGitHubToCareerProfile(userId: string) {
    const profile = await this.ensureDeveloperProfile(userId);
    const status = await githubService.getStatus(userId);
    if (!status.connected || !status.username) {
      throw new BadRequestError(
        'Connect your GitHub account before syncing observed languages and repositories.',
        undefined,
        'GITHUB_NOT_CONNECTED'
      );
    }

    const reposRes = await githubService.listRepositories(userId, { perPage: 50 });
    const publicRepos = reposRes.repositories.filter((r) => !r.private);

    const languageCounts = new Map<string, number>();
    for (const r of publicRepos) {
      if (r.language) {
        languageCounts.set(r.language, (languageCounts.get(r.language) || 0) + 1);
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.developerProfile.update({
        where: { id: profile.id },
        data: {
          githubProfileUrl: `https://github.com/${status.username}`,
        },
      });

      await tx.developerSkill.deleteMany({
        where: { profileId: profile.id, source: SkillSource.GITHUB_OBSERVED },
      });

      const observedEntries = Array.from(languageCounts.entries());
      if (observedEntries.length > 0) {
        await tx.developerSkill.createMany({
          data: observedEntries.map(([lang, repoCount]) => ({
            profileId: profile.id,
            name: lang,
            normalizedName: normalizeSkillName(lang),
            category: 'language',
            source: SkillSource.GITHUB_OBSERVED,
            confidence: 95,
            needsReview: false,
            isApproved: true,
            sourceExcerpt: `Observed in ${repoCount} public GitHub ${repoCount === 1 ? 'repository' : 'repositories'}`,
          })),
        });
      }
    });

    return this.getDeveloperStudioState(userId);
  }

  async uploadAndParseResume(params: {
    userId: string;
    file: Express.Multer.File;
    replaceResumeId?: string;
    allowDuplicate?: boolean;
  }) {
    const profile = await this.ensureDeveloperProfile(params.userId);
    const validated = await validateAndExtractResumeText(
      params.file.buffer,
      params.file.originalname,
      params.file.mimetype
    );

    // Check duplicate accidental uploads for this developer unless replacing or explicitly allowed
    if (!params.allowDuplicate && !params.replaceResumeId) {
      const duplicateFile = await prisma.resumeFile.findFirst({
        where: {
          userId: params.userId,
          sha256Hash: validated.sha256Hash,
          resume: { isArchived: false },
        },
      });
      if (duplicateFile) {
        throw new ConflictError(
          `This identical file (${duplicateFile.originalName}) is already uploaded in your Resume Studio. Choose "Replace" or rename/modify your document to upload a new version.`,
          undefined,
          'DUPLICATE_RESUME_UPLOAD'
        );
      }
    }

    let replacedResumeKey: string | null = null;
    if (params.replaceResumeId) {
      const existingToReplace = await prisma.developerResume.findUnique({
        where: { id: params.replaceResumeId },
        include: { file: true },
      });
      if (!existingToReplace || existingToReplace.userId !== params.userId) {
        throw new NotFoundError('Resume to replace was not found.');
      }
      replacedResumeKey = existingToReplace.file?.storageKey ?? null;
    }

    const stored = await resumeStorage.saveBuffer(
      params.file.buffer,
      params.file.originalname,
      validated.detectedMimeType
    );

    const latestVersion = await prisma.developerResume.findFirst({
      where: { userId: params.userId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });
    const nextVersion = (latestVersion?.versionNumber ?? 0) + 1;

    const resumeRecord = await prisma.$transaction(async (tx) => {
      if (params.replaceResumeId) {
        await tx.developerResume.delete({ where: { id: params.replaceResumeId } });
      }
      await tx.developerResume.updateMany({
        where: { userId: params.userId, isArchived: false },
        data: { isPrimary: false },
      });

      const created = await tx.developerResume.create({
        data: {
          profileId: profile.id,
          userId: params.userId,
          versionNumber: nextVersion,
          isPrimary: true,
          parseStatus: ResumeParseStatus.PROCESSING,
          parserMethod: validated.parserMethod,
          extractedTextExcerpt: validated.extractedText.slice(0, 6000),
          file: {
            create: {
              userId: params.userId,
              storageKey: stored.key,
              originalName: params.file.originalname,
              detectedMimeType: validated.detectedMimeType,
              declaredMimeType: params.file.mimetype || 'application/octet-stream',
              fileExtension: validated.fileExtension,
              sizeBytes: stored.size,
              sha256Hash: validated.sha256Hash,
            },
          },
        },
        include: { file: true },
      });

      await tx.developerProfile.update({
        where: { id: profile.id },
        data: { activeResumeId: created.id },
      });

      return created;
    });

    if (replacedResumeKey) {
      await resumeStorage.deleteFile(replacedResumeKey);
    }

    return await this.runAiResumeParse(resumeRecord.id, params.userId, validated.extractedText);
  }

  async runAiResumeParse(resumeId: string, userId: string, preExtractedText?: string) {
    const resume = await prisma.developerResume.findUnique({
      where: { id: resumeId },
      include: { file: true },
    });

    if (!resume || resume.isArchived) {
      throw new NotFoundError('Resume not found');
    }
    if (resume.userId !== userId) {
      throw new ForbiddenError('You can only parse your own resumes.');
    }

    let text = preExtractedText || resume.extractedTextExcerpt || '';
    if (!text && resume.file) {
      const stream = resumeStorage.getFileStream(resume.file.storageKey);
      const chunks: Buffer[] = [];
      for await (const c of stream) {
        chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
      }
      const reExtracted = await validateAndExtractResumeText(
        Buffer.concat(chunks),
        resume.file.originalName,
        resume.file.detectedMimeType
      );
      text = reExtracted.extractedText;
    }

    if (!text) {
      throw new BadRequestError('No readable resume text available to parse.');
    }

    try {
      const aiResult = await aiOrchestrator.parseResumeDocument({
        fileName: resume.file?.originalName || 'resume',
        mimeType: resume.file?.detectedMimeType || 'text/plain',
        extractedText: text,
      });

      const parsed: ResumeExtractionOutput = aiResult.data;
      const needsReview =
        parsed.overallConfidence < 75 || parsed.lowConfidenceFields.length > 0;

      const updated = await prisma.developerResume.update({
        where: { id: resume.id },
        data: {
          parseStatus: needsReview ? ResumeParseStatus.NEEDS_REVIEW : ResumeParseStatus.COMPLETED,
          parseError: null,
          aiModelName: aiResult.modelName,
          extractionConfidence: Math.round(parsed.overallConfidence),
          lowConfidenceFields: parsed.lowConfidenceFields,
          extractedData: parsed as unknown as Prisma.InputJsonValue,
        },
        include: { file: true },
      });

      await prisma.aIAnalysis.create({
        data: {
          agentType: 'RESUME_PARSING',
          promptTokens: aiResult.promptTokens,
          completionTokens: aiResult.completionTokens,
          rawResponse: aiResult.rawResponse,
        },
      });

      return updated;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI extraction failed';
      logger.error('Resume AI extraction failed', { resumeId, error: msg });
      const failed = await prisma.developerResume.update({
        where: { id: resume.id },
        data: {
          parseStatus: ResumeParseStatus.FAILED,
          parseError: msg,
        },
        include: { file: true },
      });
      return failed;
    }
  }

  async reviewAndApplyResumeExtraction(
    resumeId: string,
    userId: string,
    input: z.infer<typeof ReviewResumeExtractionSchema>
  ) {
    const resume = await prisma.developerResume.findUnique({
      where: { id: resumeId },
      include: { profile: true },
    });

    if (!resume || resume.isArchived) {
      throw new NotFoundError('Resume not found');
    }
    if (resume.userId !== userId) {
      throw new ForbiddenError('Only the resume owner can review or approve extracted data.');
    }

    const approvedPayload = {
      fullName: input.fullName ?? null,
      headline: input.headline ?? null,
      summary: input.summary ?? null,
      yearsOfExperience: input.yearsOfExperience ?? null,
      contactLinks: input.contactLinks ?? { portfolioUrls: [], githubUrls: [], linkedinUrls: [] },
      skills: input.skills,
      previousRoles: input.previousRoles,
      projects: input.projects,
      education: input.education,
      certifications: input.certifications,
    };

    await prisma.$transaction(async (tx) => {
      await tx.developerResume.update({
        where: { id: resume.id },
        data: {
          approvedData: approvedPayload as unknown as Prisma.InputJsonValue,
          reviewedByDeveloper: true,
          reviewedAt: new Date(),
          parseStatus: ResumeParseStatus.COMPLETED,
        },
      });

      if (input.applyToProfile) {
        const profile = resume.profile;
        await tx.developerProfile.update({
          where: { id: profile.id },
          data: {
            ...(input.fullName ? { displayName: input.fullName } : {}),
            ...(input.headline !== undefined ? { headline: input.headline } : {}),
            ...(input.summary !== undefined ? { summary: input.summary } : {}),
            ...(input.yearsOfExperience !== undefined
              ? { yearsOfExperience: input.yearsOfExperience }
              : {}),
            ...(input.contactLinks?.portfolioUrls?.[0] && !profile.portfolioUrl
              ? { portfolioUrl: input.contactLinks.portfolioUrls[0] }
              : {}),
            ...(input.contactLinks?.githubUrls?.[0] && !profile.githubProfileUrl
              ? { githubProfileUrl: input.contactLinks.githubUrls[0] }
              : {}),
            ...(input.contactLinks?.linkedinUrls?.[0] && !profile.linkedinUrl
              ? { linkedinUrl: input.contactLinks.linkedinUrls[0] }
              : {}),
            activeResumeId: resume.id,
            lastReviewedAt: new Date(),
          },
        });

        await tx.developerSkill.deleteMany({
          where: { profileId: profile.id, source: SkillSource.RESUME_EXTRACTED },
        });

        const approvedSkills = input.skills.filter((s) => s.approved !== false);
        if (approvedSkills.length > 0) {
          const dedup = new Map<string, (typeof approvedSkills)[number]>();
          for (const sk of approvedSkills) {
            dedup.set(normalizeSkillName(sk.name), sk);
          }
          await tx.developerSkill.createMany({
            data: Array.from(dedup.entries()).map(([normalizedName, sk]) => ({
              profileId: profile.id,
              name: sk.name.trim(),
              normalizedName,
              category: sk.category || 'tool',
              source: SkillSource.RESUME_EXTRACTED,
              yearsUsed: sk.yearsUsed ?? null,
              confidence: 100,
              needsReview: false,
              isApproved: true,
              sourceExcerpt: sk.sourceExcerpt ?? null,
            })),
          });
        }

        if (input.syncPortfolioProjects && input.projects.length > 0) {
          await tx.portfolioProject.deleteMany({
            where: { profileId: profile.id, source: 'RESUME_IMPORTED' },
          });
          await tx.portfolioProject.createMany({
            data: input.projects.map((p, index) => ({
              profileId: profile.id,
              title: p.title,
              role: p.role ?? null,
              summary: p.summary,
              technologies: p.technologies,
              projectUrl: p.url || null,
              source: 'RESUME_IMPORTED',
              isPublic: true,
              displayOrder: 50 + index,
            })),
          });
        }
      }
    });

    return this.getDeveloperStudioState(userId);
  }

  async listResumes(userId: string) {
    return prisma.developerResume.findMany({
      where: { userId, isArchived: false },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
      include: {
        file: {
          select: {
            originalName: true,
            detectedMimeType: true,
            fileExtension: true,
            sizeBytes: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async getResumeById(resumeId: string, userId: string) {
    const resume = await prisma.developerResume.findUnique({
      where: { id: resumeId },
      include: { file: true },
    });
    if (!resume || resume.isArchived) {
      throw new NotFoundError('Resume not found');
    }
    if (resume.userId !== userId) {
      throw new ForbiddenError('Access denied: private resume belongs to another user.');
    }
    return resume;
  }

  async setPrimaryResume(resumeId: string, userId: string) {
    const resume = await this.getResumeById(resumeId, userId);
    await prisma.$transaction([
      prisma.developerResume.updateMany({
        where: { userId, isArchived: false },
        data: { isPrimary: false },
      }),
      prisma.developerResume.update({
        where: { id: resume.id },
        data: { isPrimary: true },
      }),
      prisma.developerProfile.update({
        where: { id: resume.profileId },
        data: { activeResumeId: resume.id },
      }),
    ]);
    return this.getDeveloperStudioState(userId);
  }

  async deleteResume(resumeId: string, userId: string) {
    const resume = await this.getResumeById(resumeId, userId);
    const storageKey = resume.file?.storageKey;

    await prisma.developerResume.delete({ where: { id: resume.id } });
    if (storageKey) {
      await resumeStorage.deleteFile(storageKey);
    }

    const fallbackNext = await prisma.developerResume.findFirst({
      where: { userId, isArchived: false },
      orderBy: { createdAt: 'desc' },
    });
    await prisma.developerProfile.update({
      where: { id: resume.profileId },
      data: { activeResumeId: fallbackNext?.id ?? null },
    });
    if (fallbackNext) {
      await prisma.developerResume.update({
        where: { id: fallbackNext.id },
        data: { isPrimary: true },
      });
    }

    return { deleted: true, resumeId };
  }

  async getAuthorizedResumeFileDownload(
    resumeId: string,
    requestingUser: { id: string; role: Role }
  ) {
    const resume = await prisma.developerResume.findUnique({
      where: { id: resumeId },
      include: {
        file: true,
        profile: true,
      },
    });

    if (!resume || resume.isArchived || !resume.file) {
      throw new NotFoundError('Resume file not found');
    }

    const isOwner = resume.userId === requestingUser.id;
    const isAdmin = requestingUser.role === Role.ADMIN;

    let isAuthorizedClient = false;
    if (!isOwner && !isAdmin && requestingUser.role === Role.CLIENT) {
      const publicProfileAllows =
        resume.profile.visibility !== ProfileVisibility.PRIVATE &&
        resume.profile.allowClientResumeDownload;

      const applicationConsent = await prisma.opportunityApplication.findFirst({
        where: {
          developerId: resume.userId,
          allowResumeDownload: true,
          status: { not: ApplicationStatus.WITHDRAWN },
          opportunity: { clientId: requestingUser.id },
        },
        select: { id: true },
      });

      isAuthorizedClient = publicProfileAllows || Boolean(applicationConsent);
    }

    if (!isOwner && !isAdmin && !isAuthorizedClient) {
      throw new ForbiddenError(
        'Access denied: the developer has not authorized download of this private resume.'
      );
    }

    const stream = resumeStorage.getFileStream(resume.file.storageKey);
    return {
      stream,
      fileName: resume.file.originalName,
      mimeType: resume.file.detectedMimeType,
      sizeBytes: resume.file.sizeBytes,
    };
  }

  async buildStructuredDocumentFromProfile(
    userId: string,
    templateId: string,
    customSections?: z.infer<typeof GenerateResumeTemplateSchema>['customSections'],
    persistDraft = false
  ): Promise<StructuredResumeDocument> {
    const template = getResumeTemplateOrThrow(templateId);
    const profile = await this.ensureDeveloperProfile(userId);

    const [fullProfile, primaryResume] = await Promise.all([
      prisma.developerProfile.findUniqueOrThrow({
        where: { id: profile.id },
        include: {
          skills: { where: { isApproved: true }, orderBy: { name: 'asc' } },
          portfolioProjects: { orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }] },
        },
      }),
      prisma.developerResume.findFirst({
        where: { userId, isArchived: false },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    const approved = (primaryResume?.approvedData || primaryResume?.extractedData || {}) as Partial<{
      previousRoles: Array<{
        title: string;
        company?: string | null;
        startDate?: string | null;
        endDate?: string | null;
        summary?: string | null;
      }>;
      education: Array<{ degree: string; institution: string; graduationYear?: string | null }>;
      certifications: Array<{ name: string; issuer?: string | null; year?: string | null }>;
    }>;

    const links = customSections?.links ?? [
      fullProfile.githubProfileUrl,
      fullProfile.portfolioUrl,
      fullProfile.linkedinUrl,
    ].filter((u): u is string => Boolean(u));

    const document: StructuredResumeDocument = {
      template,
      fullName: customSections?.fullName || fullProfile.displayName,
      headline: customSections?.headline ?? (fullProfile.headline || ''),
      summary: customSections?.summary ?? (fullProfile.summary || ''),
      location: customSections?.location ?? fullProfile.location ?? null,
      links,
      skills:
        customSections?.skills ??
        Array.from(new Set(fullProfile.skills.map((s) => s.name))),
      experience:
        customSections?.experience ??
        (approved.previousRoles || []).map((r) => ({
          title: r.title,
          company: r.company || undefined,
          period: [r.startDate, r.endDate].filter(Boolean).join(' – ') || undefined,
          summary: r.summary || undefined,
        })),
      projects:
        customSections?.projects ??
        fullProfile.portfolioProjects.map((p) => ({
          title: p.title,
          technologies: p.technologies,
          summary: p.summary,
          url: p.projectUrl || undefined,
        })),
      education:
        customSections?.education ??
        (approved.education || []).map((e) => ({
          degree: e.degree,
          institution: e.institution,
          year: e.graduationYear || undefined,
        })),
      certifications:
        customSections?.certifications ??
        (approved.certifications || []).map((c) => ({
          name: c.name,
          issuer: c.issuer || undefined,
          year: c.year || undefined,
        })),
    };

    if (persistDraft) {
      await prisma.developerProfile.update({
        where: { id: fullProfile.id },
        data: {
          selectedTemplateId: template.id,
          templateDraftJson: {
            templateId: template.id,
            fullName: document.fullName,
            headline: document.headline,
            summary: document.summary,
            location: document.location,
            links: document.links,
            skills: document.skills,
            experience: document.experience,
            projects: document.projects,
            education: document.education,
            certifications: document.certifications,
          } as unknown as Prisma.InputJsonValue,
        },
      });
    }

    return document;
  }

  async exportResumeDocument(
    userId: string,
    input: z.infer<typeof ExportResumeSchema>
  ): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
    const document = await this.buildStructuredDocumentFromProfile(
      userId,
      input.templateId,
      input.customSections,
      true
    );

    const safeSlug = document.fullName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'developer-resume';

    if (input.format === 'pdf') {
      const buffer = await buildResumePdfBuffer(document);
      return {
        buffer,
        mimeType: 'application/pdf',
        fileName: `${safeSlug}-${document.template.id}.pdf`,
      };
    }

    const buffer = await buildResumeDocxBuffer(document);
    return {
      buffer,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      fileName: `${safeSlug}-${document.template.id}.docx`,
    };
  }
}

export const resumeService = new ResumeService();
