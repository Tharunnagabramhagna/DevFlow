import { z } from 'zod';
import { EvidenceType } from '@prisma/client';

export const SubmitEvidenceSchema = z.object({
  type: z.nativeEnum(EvidenceType),
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(150, 'Title cannot exceed 150 characters'),
  description: z.string().trim().max(3000, 'Description cannot exceed 3000 characters').optional(),
  githubCommitSha: z.string().trim().regex(/^[0-9a-fA-F]{7,40}$/, 'Invalid git commit SHA').optional(),
  githubPrNumber: z.coerce.number().int().positive().optional(),
  githubRepoOwner: z.string().trim().optional(),
  githubRepoName: z.string().trim().optional(),
  externalUrl: z.string().trim().url('Invalid URL format').optional(),
  textNote: z.string().trim().max(10000, 'Text note cannot exceed 10000 characters').optional(),
}).superRefine((data, ctx) => {
  if (data.type === EvidenceType.GITHUB_COMMIT && !data.githubCommitSha) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'githubCommitSha is required when evidence type is GITHUB_COMMIT',
      path: ['githubCommitSha'],
    });
  }

  if (data.type === EvidenceType.GITHUB_PR && !data.githubPrNumber) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'githubPrNumber is required when evidence type is GITHUB_PR',
      path: ['githubPrNumber'],
    });
  }

  if (data.type === EvidenceType.URL && !data.externalUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'externalUrl is required when evidence type is URL',
      path: ['externalUrl'],
    });
  }

  if (data.type === EvidenceType.TEXT_NOTE && !data.textNote) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'textNote is required when evidence type is TEXT_NOTE',
      path: ['textNote'],
    });
  }
});

export type SubmitEvidenceInput = z.infer<typeof SubmitEvidenceSchema>;

