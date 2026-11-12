import { z } from 'zod';
import {
  ApplicationStatus,
  DeveloperAvailability,
  OpportunityStatus,
  OpportunityVisibility,
  SkillRequirementLevel,
} from '@prisma/client';

export const SearchDevelopersQuerySchema = z.object({
  q: z.string().trim().max(500).optional(),
  skills: z.string().trim().max(500).optional(), // comma-separated
  technologies: z.string().trim().max(500).optional(),
  minExperience: z.coerce.number().int().min(0).max(50).optional(),
  availability: z.nativeEnum(DeveloperAvailability).optional(),
  maxHourlyRate: z.coerce.number().positive().optional(),
  location: z.string().trim().max(120).optional(),
  timezone: z.string().trim().max(80).optional(),
  sortBy: z.enum(['relevance', 'experience', 'completeness', 'rate_asc', 'rate_desc']).default('completeness'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(12),
});

export const AIMatchDevelopersSchema = z.object({
  query: z.string().trim().min(10, 'Describe your project requirements in at least 10 characters.').max(4000),
  opportunityId: z.string().uuid().optional(),
  availability: z.nativeEnum(DeveloperAvailability).optional(),
  maxHourlyRate: z.coerce.number().positive().optional(),
  location: z.string().trim().max(120).optional(),
  timezone: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().positive().max(30).default(12),
});

export const OpportunitySkillInputSchema = z.object({
  name: z.string().trim().min(1).max(60),
  category: z.string().trim().max(40).default('general'),
  requirementLevel: z.nativeEnum(SkillRequirementLevel).default(SkillRequirementLevel.MANDATORY),
});

export const CreateOpportunitySchema = z.object({
  linkedProjectId: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(4).max(140),
  organizationName: z.string().trim().max(120).optional().nullable(),
  description: z.string().trim().min(20).max(6000),
  deliverablesSummary: z.array(z.string().trim().min(2).max(240)).max(20).default([]),
  aiEnhancedDescription: z.string().trim().max(6000).optional().nullable(),
  aiApprovedByClient: z.boolean().default(false),
  visibility: z.nativeEnum(OpportunityVisibility).default(OpportunityVisibility.PRIVATE),
  experienceLevel: z.string().trim().max(60).optional().nullable(),
  minYearsExperience: z.coerce.number().int().min(0).max(40).optional().nullable(),
  budgetMin: z.coerce.number().positive().optional().nullable(),
  budgetMax: z.coerce.number().positive().optional().nullable(),
  currency: z.string().trim().toUpperCase().length(3).default('USD'),
  expectedDuration: z.string().trim().max(80).optional().nullable(),
  locationPreference: z.string().trim().max(120).optional().nullable(),
  timezonePreference: z.string().trim().max(80).optional().nullable(),
  applicationDeadline: z.string().datetime().optional().nullable(),
  skills: z.array(OpportunitySkillInputSchema).max(40).default([]),
});

export const UpdateOpportunitySchema = CreateOpportunitySchema.partial().extend({
  status: z.nativeEnum(OpportunityStatus).optional(),
});

export const PublishOpportunitySchema = z.object({
  visibility: z.enum([OpportunityVisibility.DISCOVERABLE, OpportunityVisibility.INVITE_ONLY]),
  aiApprovedByClient: z.boolean().optional(),
});

export const AIRefineOpportunitySchema = z.object({
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().min(15).max(5000),
  expectedDuration: z.string().trim().max(80).optional(),
  budgetMin: z.coerce.number().positive().optional(),
  budgetMax: z.coerce.number().positive().optional(),
});

export const SearchOpportunitiesQuerySchema = z.object({
  q: z.string().trim().max(400).optional(),
  skills: z.string().trim().max(400).optional(),
  experienceLevel: z.string().trim().max(60).optional(),
  minBudget: z.coerce.number().nonnegative().optional(),
  maxBudget: z.coerce.number().positive().optional(),
  mine: z.enum(['true', 'false']).optional(),
  savedOnly: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(15),
});

export const ApplyOpportunitySchema = z.object({
  proposal: z.string().trim().min(20, 'Please include a short proposal (at least 20 characters).').max(4000),
  proposedBudget: z.coerce.number().positive().optional().nullable(),
  currency: z.string().trim().toUpperCase().length(3).default('USD'),
  estimatedTimeline: z.string().trim().max(100).optional().nullable(),
  selectedPortfolioIds: z.array(z.string().uuid()).max(10).default([]),
  allowResumeDownload: z.boolean().default(false),
});

export const UpdateApplicationStatusSchema = z.object({
  status: z.enum([
    ApplicationStatus.UNDER_REVIEW,
    ApplicationStatus.SHORTLISTED,
    ApplicationStatus.INTERVIEWING,
    ApplicationStatus.ACCEPTED,
    ApplicationStatus.REJECTED,
  ]),
  clientNotes: z.string().trim().max(2000).optional().nullable(),
});

export const CompareCandidatesSchema = z.object({
  applicationIds: z.array(z.string().uuid()).min(2).max(5).optional(),
  profileIds: z.array(z.string().uuid()).min(2).max(5).optional(),
});

