import { z } from 'zod';
import { MilestoneStatus } from '@prisma/client';

export const CreateMilestoneSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(150, 'Title cannot exceed 150 characters'),
  description: z.string().trim().max(3000, 'Description cannot exceed 3000 characters').optional(),
  requirements: z.array(z.string().trim().min(1, 'Requirement cannot be empty')).min(1, 'At least one requirement is required'),
  paymentAmount: z.coerce.number().positive('Payment amount must be greater than zero'),
  currency: z.string().trim().toUpperCase().length(3, 'Currency must be a 3-letter code').default('USD'),
  dueDate: z.coerce.date().optional(),
  assignedDeveloperId: z.string().uuid('Invalid developer ID').optional(),
  orderIndex: z.coerce.number().int().min(0).default(0),
});

export const UpdateMilestoneSchema = z.object({
  title: z.string().trim().min(3).max(150).optional(),
  description: z.string().trim().max(3000).optional(),
  requirements: z.array(z.string().trim().min(1)).min(1).optional(),
  paymentAmount: z.coerce.number().positive().optional(),
  currency: z.string().trim().toUpperCase().length(3).optional(),
  dueDate: z.coerce.date().nullable().optional(),
  assignedDeveloperId: z.string().uuid().nullable().optional(),
  orderIndex: z.coerce.number().int().min(0).optional(),
  isPubliclyVisible: z.boolean().optional(),
  status: z.nativeEnum(MilestoneStatus).optional(),
});

export const ReviewMilestoneSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  feedback: z.string().trim().max(2000).optional(),
}).refine(
  (data) => data.decision !== 'REJECTED' || (data.feedback && data.feedback.length >= 5),
  {
    message: 'Feedback of at least 5 characters is required when rejecting a milestone',
    path: ['feedback'],
  }
);

export const MilestoneQuerySchema = z.object({
  status: z.nativeEnum(MilestoneStatus).optional(),
  assignedDeveloperId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type CreateMilestoneInput = z.infer<typeof CreateMilestoneSchema>;
export type UpdateMilestoneInput = z.infer<typeof UpdateMilestoneSchema>;
export type ReviewMilestoneInput = z.infer<typeof ReviewMilestoneSchema>;
export type MilestoneQueryInput = z.infer<typeof MilestoneQuerySchema>;

