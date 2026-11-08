import { z } from 'zod';
import { ProjectStatus, ProjectMemberRole, ProjectInvitationRole } from '@prisma/client';

export const CreateProjectSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(100, 'Title cannot exceed 100 characters'),
  description: z.string().trim().max(2000, 'Description cannot exceed 2000 characters').optional(),
  brief: z.string().trim().max(5000, 'Brief cannot exceed 5000 characters').optional(),
  budget: z.coerce.number().positive('Budget must be greater than zero').optional(),
  currency: z.string().trim().toUpperCase().length(3, 'Currency must be a 3-letter code').default('USD'),
  githubRepoOwner: z.string().trim().optional(),
  githubRepoName: z.string().trim().optional(),
});

export const UpdateProjectSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(100).optional(),
  description: z.string().trim().max(2000).optional(),
  brief: z.string().trim().max(5000).optional(),
  budget: z.coerce.number().positive('Budget must be greater than zero').optional(),
  currency: z.string().trim().toUpperCase().length(3).optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  githubRepoOwner: z.string().trim().optional(),
  githubRepoName: z.string().trim().optional(),
  isArchived: z.boolean().optional(),
});

export const ProjectQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.nativeEnum(ProjectStatus).optional(),
  search: z.string().trim().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'budget']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const InviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  role: z.nativeEnum(ProjectInvitationRole),
});

export const UpdateMemberRoleSchema = z.object({
  role: z.nativeEnum(ProjectMemberRole),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type ProjectQueryInput = z.infer<typeof ProjectQuerySchema>;
export type InviteMemberInput = z.infer<typeof InviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof UpdateMemberRoleSchema>;

