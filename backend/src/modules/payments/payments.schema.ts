import { z } from 'zod';
import { PaymentStatus } from '@prisma/client';

export const CreateInvoiceSchema = z.object({
  milestoneId: z.string().uuid('Invalid milestone ID'),
  note: z.string().trim().max(1000).optional(),
  memo: z.string().trim().max(1000).optional(),
});

export const CancelInvoiceSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const CreateRefundSchema = z.object({
  captureId: z.string().uuid('Invalid capture ID'),
  grossAmount: z.coerce.number().positive('Refund gross amount must be greater than zero'),
  reason: z.string().trim().max(500).optional(),
  idempotencyKey: z.string().trim().min(8, 'idempotencyKey must be at least 8 characters'),
});

export const PaymentQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  status: z.nativeEnum(PaymentStatus).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;
export type CancelInvoiceInput = z.infer<typeof CancelInvoiceSchema>;
export type CreateRefundInput = z.infer<typeof CreateRefundSchema>;
export type PaymentQueryInput = z.infer<typeof PaymentQuerySchema>;

