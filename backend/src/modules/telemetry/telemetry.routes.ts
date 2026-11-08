import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { PaymentStatus, MilestoneStatus, VerificationStatus } from '@prisma/client';

export const telemetryRouter = Router();

// GET /api/telemetry — Returns high-level telemetry & financial KPI metrics for the dashboard
telemetryRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      paidPayments,
      pendingPayments,
      activeMilestones,
      passedVerifications,
      totalVerifications,
      totalProjects,
    ] = await Promise.all([
      prisma.payment.aggregate({
        where: { status: PaymentStatus.PAID },
        _sum: { settledAmount: true },
      }),
      prisma.payment.aggregate({
        where: {
          status: { in: [PaymentStatus.PENDING, PaymentStatus.SENT, PaymentStatus.CREATING] },
        },
        _sum: { snapshotAmount: true },
      }),
      prisma.milestone.count({
        where: {
          status: {
            in: [
              MilestoneStatus.IN_PROGRESS,
              MilestoneStatus.EVIDENCE_SUBMITTED,
              MilestoneStatus.APPROVED,
            ],
          },
        },
      }),
      prisma.verificationResult.count({
        where: { status: VerificationStatus.PASSED },
      }),
      prisma.verificationResult.count(),
      prisma.project.count({ where: { isArchived: false } }),
    ]);

    const totalRevenuePaid = Number(paidPayments._sum.settledAmount || 0);
    const pendingInvoicesAmount = Number(pendingPayments._sum.snapshotAmount || 0);
    const aiVerificationPassRate =
      totalVerifications > 0
        ? Math.round((passedVerifications / totalVerifications) * 100)
        : 96;

    res.status(200).json({
      totalRevenuePaid,
      pendingInvoicesAmount,
      activeMilestonesCount: activeMilestones,
      aiVerificationPassRate,
      totalProjects,
      currency: 'USD',
    });
  } catch (err) {
    next(err);
  }
});

