import { z } from 'zod';
import { DeveloperAvailability, ProfileVisibility } from '@prisma/client';

export const SkillItemInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  category: z.enum(['language', 'framework', 'database', 'tool', 'domain', 'general']).default('tool'),
  yearsUsed: z.coerce.number().int().min(0).max(50).nullable().optional(),
  proficiency: z.string().trim().max(40).nullable().optional(),
});

export const PortfolioItemInputSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(120),
  role: z.string().trim().max(80).nullable().optional(),
  summary: z.string().trim().min(10).max(2000),
  technologies: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  projectUrl: z.string().trim().url().nullable().optional().or(z.literal('')),
  repoFullName: z.string().trim().max(150).nullable().optional(),
  startDate: z.string().trim().max(40).nullable().optional(),
  endDate: z.string().trim().max(40).nullable().optional(),
  isPublic: z.boolean().default(true),
});

export const UpdateCareerProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(100).optional(),
  headline: z.string().trim().max(160).nullable().optional(),
  summary: z.string().trim().max(3000).nullable().optional(),
  yearsOfExperience: z.coerce.number().int().min(0).max(60).nullable().optional(),
  availability: z.nativeEnum(DeveloperAvailability).optional(),
  hourlyRateMin: z.coerce.number().min(0).max(10000).nullable().optional(),
  hourlyRateMax: z.coerce.number().min(0).max(10000).nullable().optional(),
  currency: z.string().trim().toUpperCase().length(3).optional(),
  location: z.string().trim().max(120).nullable().optional(),
  timezone: z.string().trim().max(80).nullable().optional(),
  portfolioUrl: z.string().trim().url().nullable().optional().or(z.literal('')),
  linkedinUrl: z.string().trim().url().nullable().optional().or(z.literal('')),
  githubProfileUrl: z.string().trim().url().nullable().optional().or(z.literal('')),
  visibility: z.nativeEnum(ProfileVisibility).optional(),
  shareContactEmail: z.boolean().optional(),
  shareGitHubRepos: z.boolean().optional(),
  allowClientResumeDownload: z.boolean().optional(),
  selectedTemplateId: z.string().trim().min(2).max(60).optional(),
  skills: z.array(SkillItemInputSchema).max(60).optional(),
  portfolioProjects: z.array(PortfolioItemInputSchema).max(25).optional(),
});

export const ReviewResumeExtractionSchema = z.object({
  fullName: z.string().trim().max(100).nullable().optional(),
  headline: z.string().trim().max(160).nullable().optional(),
  summary: z.string().trim().max(3000).nullable().optional(),
  yearsOfExperience: z.coerce.number().int().min(0).max(60).nullable().optional(),
  contactLinks: z
    .object({
      portfolioUrls: z.array(z.string().trim()).max(10).default([]),
      githubUrls: z.array(z.string().trim()).max(10).default([]),
      linkedinUrls: z.array(z.string().trim()).max(10).default([]),
    })
    .optional(),
  skills: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(60),
        category: z.enum(['language', 'framework', 'database', 'tool', 'domain', 'general']).default('tool'),
        yearsUsed: z.coerce.number().int().min(0).max(50).nullable().optional(),
        approved: z.boolean().default(true),
        sourceExcerpt: z.string().max(240).nullable().optional(),
      })
    )
    .max(80)
    .default([]),
  previousRoles: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(120),
        company: z.string().trim().max(120).nullable().optional(),
        startDate: z.string().trim().max(40).nullable().optional(),
        endDate: z.string().trim().max(40).nullable().optional(),
        summary: z.string().trim().max(1500).nullable().optional(),
      })
    )
    .max(25)
    .default([]),
  projects: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(120),
        role: z.string().trim().max(80).nullable().optional(),
        summary: z.string().trim().min(1).max(1500),
        technologies: z.array(z.string().trim().max(50)).max(20).default([]),
        url: z.string().trim().max(300).nullable().optional(),
      })
    )
    .max(25)
    .default([]),
  education: z
    .array(
      z.object({
        degree: z.string().trim().min(1).max(160),
        institution: z.string().trim().min(1).max(160),
        graduationYear: z.string().trim().max(20).nullable().optional(),
      })
    )
    .max(15)
    .default([]),
  certifications: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(160),
        issuer: z.string().trim().max(120).nullable().optional(),
        year: z.string().trim().max(20).nullable().optional(),
      })
    )
    .max(25)
    .default([]),
  applyToProfile: z.boolean().default(true),
  syncPortfolioProjects: z.boolean().default(false),
});

export const GenerateResumeTemplateSchema = z.object({
  templateId: z.string().trim().min(2).max(60),
  customSections: z
    .object({
      fullName: z.string().trim().max(120).optional(),
      headline: z.string().trim().max(180).optional(),
      summary: z.string().trim().max(3000).optional(),
      location: z.string().trim().max(120).optional(),
      links: z.array(z.string().trim().max(300)).max(10).optional(),
      skills: z.array(z.string().trim().max(60)).max(60).optional(),
      experience: z
        .array(
          z.object({
            title: z.string().trim().max(120),
            company: z.string().trim().max(120).optional(),
            period: z.string().trim().max(60).optional(),
            summary: z.string().trim().max(1500).optional(),
          })
        )
        .max(20)
        .optional(),
      projects: z
        .array(
          z.object({
            title: z.string().trim().max(120),
            technologies: z.array(z.string().trim().max(50)).max(15).optional(),
            summary: z.string().trim().max(1500),
            url: z.string().trim().max(300).optional(),
          })
        )
        .max(20)
        .optional(),
      education: z
        .array(
          z.object({
            degree: z.string().trim().max(160),
            institution: z.string().trim().max(160),
            year: z.string().trim().max(20).optional(),
          })
        )
        .max(15)
        .optional(),
      certifications: z
        .array(
          z.object({
            name: z.string().trim().max(160),
            issuer: z.string().trim().max(120).optional(),
            year: z.string().trim().max(20).optional(),
          })
        )
        .max(20)
        .optional(),
    })
    .optional(),
});

export const ExportResumeSchema = z.object({
  templateId: z.string().trim().min(2).max(60).default('software-engineer'),
  format: z.enum(['pdf', 'docx']),
  customSections: GenerateResumeTemplateSchema.shape.customSections,
});

