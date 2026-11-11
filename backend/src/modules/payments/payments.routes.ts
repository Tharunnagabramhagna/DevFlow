import { Router } from 'express';
import { ProjectMemberRole, PaymentStatus, MilestoneStatus, Role } from '@prisma/client';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { authenticate, requireNonGuest, requireRole, assertVerifiedUser } from '../../middleware/auth';
import { requireProjectRole, requirePaymentRole } from '../../middleware/projectAuth';
import { validateBody, validateQuery } from '../../middleware/validate';
import { ForbiddenError } from '../../utils/errors';
import { paymentsController } from './payments.controller';
import {
  CreateInvoiceSchema,
  CancelInvoiceSchema,
  CreateRefundSchema,
  PaymentQuerySchema,
} from './payments.schema';

export const paymentsRouter = Router();
paymentsRouter.use(authenticate, requireNonGuest);

// Create and dispatch an invoice for a completed milestone
paymentsRouter.post(
  '/invoices',
  authenticate,
  requireNonGuest,
  validateBody(CreateInvoiceSchema),
  paymentsController.createInvoice
);

// Frontend compatibility alias: POST /api/payments/invoices/generate
paymentsRouter.post(
  '/invoices/generate',
  authenticate,
  requireNonGuest,
  validateBody(CreateInvoiceSchema),
  paymentsController.createInvoice
);

// Frontend compatibility alias: GET /api/payments/invoices
paymentsRouter.get(
  '/invoices',
  authenticate,
  async (req, res, next) => {
    try {
      const user = assertVerifiedUser(req);
      const payments = await prisma.payment.findMany({
        where:
          user.role === Role.ADMIN
            ? undefined
            : {
                milestone: {
                  project: {
                    isArchived: false,
                    OR: [
                      { createdById: user.id },
                      { clientId: user.id },
                      { leadDeveloperId: user.id },
                      { members: { some: { userId: user.id } } },
                    ],
                  },
                },
              },
        include: {
          milestone: {
            include: { project: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = payments.map((p) => ({
        milestone: p.milestone,
        invoice: {
          id: p.id,
          paypalInvoiceId: p.paypalInvoiceId,
          amount: Number(p.snapshotAmount),
          currency: p.snapshotCurrency,
          status: p.status,
          createdAt: p.createdAt.toISOString(),
          paidAt: p.paidAt?.toISOString(),
        },
      }));

      res.status(200).json(formatted);
    } catch (err) {
      next(err);
    }
  }
);

// Frontend sandbox simulation endpoint: POST /api/payments/webhooks/simulate-paid
// Strictly disabled in production. Requires authentication and project client/owner role in development.
paymentsRouter.post(
  '/webhooks/simulate-paid',
  authenticate,
  requireNonGuest,
  async (req, res, next) => {
    try {
      const user = assertVerifiedUser(req);
      // 1. Strict production lockout: cannot be activated in production
      if (env.NODE_ENV === 'production') {
        throw new ForbiddenError(
          'Payment simulation endpoint is strictly disabled in production environments',
          undefined,
          'SIMULATION_DISABLED_IN_PRODUCTION'
        );
      }

      if (user.role === Role.FREELANCER) {
        throw new ForbiddenError(
          'Unauthorized to simulate payments for this project',
          undefined,
          'UNAUTHORIZED_SIMULATION'
        );
      }

      const { invoiceId } = req.body;
      if (!invoiceId) {
        return res.status(200).json({
          id: 'inv_simulated',
          status: 'PAID',
          paidAt: new Date().toISOString(),
          simulated: true,
        });
      }

      const payment = await prisma.payment.findFirst({
        where: {
          OR: [
            { id: invoiceId },
            { paypalInvoiceId: invoiceId },
          ],
        },
        include: {
          milestone: {
            include: {
              project: {
                include: { members: true },
              },
            },
          },
        },
      });

      if (!payment) {
        return res.status(200).json({
          id: invoiceId,
          status: 'PAID',
          paidAt: new Date().toISOString(),
          simulated: true,
        });
      }

      // 2. Strict authorization: verify caller is project owner, client, or platform admin (and never lead developer)
      if (payment.milestone?.project && user.role !== Role.ADMIN) {
        const project = payment.milestone.project;
        const isCreator = project.createdById === user.id;
        const isClient = project.clientId === user.id;
        const isLeadDeveloper = project.leadDeveloperId === user.id;
        const isOwnerOrClientMember = project.members?.some(
          (m) =>
            m.userId === user.id &&
            (m.role === ProjectMemberRole.OWNER || m.role === ProjectMemberRole.CLIENT)
        );

        if (isLeadDeveloper || (!isCreator && !isClient && !isOwnerOrClientMember)) {
          throw new ForbiddenError(
            'Unauthorized to simulate payments for this project',
            undefined,
            'UNAUTHORIZED_SIMULATION'
          );
        }
      }

      // 3. Local simulation update only (no external PayPal calls or money movement)
      const updated = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          settledAmount: payment.snapshotAmount,
          netReceivedAmount: payment.snapshotAmount,
          paidAt: new Date(),
        },
      });

      await prisma.milestone.update({
        where: { id: payment.milestoneId },
        data: { status: MilestoneStatus.PAID },
      });

      return res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }
);

// Cancel an unpaid invoice
paymentsRouter.post(
  '/:id/cancel',
  authenticate,
  requireRole([Role.CLIENT, Role.ADMIN]),
  requirePaymentRole([ProjectMemberRole.OWNER, ProjectMemberRole.CLIENT]),
  validateBody(CancelInvoiceSchema),
  paymentsController.cancelInvoice
);

// Issue a refund against a specific capture
paymentsRouter.post(
  '/:id/refund',
  authenticate,
  requireRole([Role.CLIENT, Role.ADMIN]),
  requirePaymentRole([ProjectMemberRole.OWNER, ProjectMemberRole.CLIENT]),
  validateBody(CreateRefundSchema),
  paymentsController.createRefund
);

// Get single payment details with captures and refunds
paymentsRouter.get(
  '/:id',
  authenticate,
  requirePaymentRole([
    ProjectMemberRole.OWNER,
    ProjectMemberRole.CLIENT,
    ProjectMemberRole.LEAD_DEVELOPER,
    ProjectMemberRole.MEMBER,
    ProjectMemberRole.VIEWER,
  ]),
  paymentsController.getPaymentById
);

// List payments with query filters
paymentsRouter.get(
  '/',
  authenticate,
  validateQuery(PaymentQuerySchema),
  paymentsController.getProjectPayments
);

// Project-nested router: /api/projects/:projectId/payments
export const projectPaymentsRouter = Router({ mergeParams: true });
projectPaymentsRouter.use(authenticate, requireNonGuest);

projectPaymentsRouter.get(
  '/',
  authenticate,
  requireProjectRole([
    ProjectMemberRole.OWNER,
    ProjectMemberRole.CLIENT,
    ProjectMemberRole.LEAD_DEVELOPER,
    ProjectMemberRole.MEMBER,
    ProjectMemberRole.VIEWER,
  ]),
  validateQuery(PaymentQuerySchema),
  paymentsController.getProjectPayments
);

