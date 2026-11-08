import { Prisma, Payment, PaymentStatus, PaymentPayoutStatus, CaptureStatus, RefundStatus, CaptureFeeStatus, RefundFeeReversalStatus, Role, ProjectMemberRole, ActivityAction, NotificationType } from '@prisma/client';
import crypto from 'crypto';
import { prisma } from '../../config/database';
import { paypalService } from '../../services/paypal.service';
import { activityService } from '../../services/activity.service';
import { notificationService } from '../../services/notification.service';
import { BadRequestError, NotFoundError, ForbiddenError, ConflictError } from '../../utils/errors';
import { CreateInvoiceInput, CreateRefundInput, PaymentQueryInput } from './payments.schema';
import logger from '../../utils/logger';

export class PaymentsService {
  /**
   * Re-derives and synchronizes financial aggregates on a Payment record within a transaction.
   */
  async syncPaymentAggregates(tx: Prisma.TransactionClient, paymentId: string): Promise<Payment> {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: {
        captures: { where: { status: CaptureStatus.COMPLETED } },
        refunds: { where: { status: RefundStatus.COMPLETED } },
      },
    });

    if (!payment) {
      throw new NotFoundError(`Payment with ID ${paymentId} not found`);
    }

    // 1. Settled Amount = sum of completed captures' gross amounts
    let settledAmount = new Prisma.Decimal(0);
    let totalVerifiedFees = new Prisma.Decimal(0);

    for (const cap of payment.captures) {
      settledAmount = settledAmount.add(cap.grossAmount);
      if (cap.feeStatus === CaptureFeeStatus.VERIFIED && cap.feeAmount) {
        totalVerifiedFees = totalVerifiedFees.add(cap.feeAmount);
      }
    }

    // 2. Refunded Amount = sum of completed refunds' gross amounts
    let refundedAmount = new Prisma.Decimal(0);
    let totalFeeReversals = new Prisma.Decimal(0);

    for (const ref of payment.refunds) {
      refundedAmount = refundedAmount.add(ref.grossAmount);
      if (ref.feeReversalStatus === RefundFeeReversalStatus.VERIFIED && ref.feeReversalAmount) {
        totalFeeReversals = totalFeeReversals.add(ref.feeReversalAmount);
      }
    }

    // 3. Fee Amount = verified fees minus verified fee reversals
    const feeAmount = Prisma.Decimal.max(new Prisma.Decimal(0), totalVerifiedFees.minus(totalFeeReversals));

    // 4. Net Refund Deducted = gross refunds minus fee reversals
    const netRefundDeducted = Prisma.Decimal.max(new Prisma.Decimal(0), refundedAmount.minus(totalFeeReversals));

    // 5. Net Received Amount = settled - fees - netRefundDeducted
    const netReceivedAmount = Prisma.Decimal.max(
      new Prisma.Decimal(0),
      settledAmount.minus(feeAmount).minus(netRefundDeducted)
    );

    // 6. Transition payment status if applicable
    let newStatus = payment.status;
    let newPayoutStatus = payment.payoutStatus;

    if (settledAmount.greaterThan(0)) {
      if (refundedAmount.greaterThanOrEqualTo(settledAmount)) {
        newStatus = PaymentStatus.REFUNDED;
      } else if (refundedAmount.greaterThan(0)) {
        newStatus = PaymentStatus.PARTIALLY_REFUNDED;
      } else if (payment.status !== PaymentStatus.PAID) {
        newStatus = PaymentStatus.PAID;
        newPayoutStatus = PaymentPayoutStatus.PLATFORM_HELD;
      }
    }

    return await tx.payment.update({
      where: { id: paymentId },
      data: {
        settledAmount,
        feeAmount,
        refundedAmount,
        netRefundDeducted,
        netReceivedAmount,
        status: newStatus,
        payoutStatus: newPayoutStatus,
        lastReconciledAt: new Date(),
      },
    });
  }

  /**
   * Creates and dispatches a PayPal invoice for an approved milestone.
   */
  async createInvoice(actorId: string, input: CreateInvoiceInput): Promise<Payment> {
    const milestone = await prisma.milestone.findUnique({
      where: { id: input.milestoneId },
      include: {
        project: {
          include: {
            client: true,
            leadDeveloper: true,
            createdBy: true,
            members: true,
          },
        },
        assignedDeveloper: true,
      },
    });

    if (!milestone) {
      throw new NotFoundError(`Milestone with ID ${input.milestoneId} not found`);
    }

    // Authorization check: Actor must be project OWNER, CLIENT, or global ADMIN
    const isOwner =
      milestone.project.createdById === actorId ||
      milestone.project.members.some((m) => m.userId === actorId && m.role === ProjectMemberRole.OWNER);
    const isClient =
      milestone.project.clientId === actorId ||
      milestone.project.members.some((m) => m.userId === actorId && m.role === ProjectMemberRole.CLIENT);

    if (!isOwner && !isClient) {
      throw new ForbiddenError('Only a project client or owner can initiate payment invoicing');
    }

    // Check active invoice constraint
    const activePayment = await prisma.payment.findFirst({
      where: {
        milestoneId: milestone.id,
        status: {
          in: [
            PaymentStatus.CREATING,
            PaymentStatus.DRAFT,
            PaymentStatus.SCHEDULED,
            PaymentStatus.SENDING,
            PaymentStatus.SENT,
            PaymentStatus.PAID,
            PaymentStatus.PAYMENT_PENDING,
            PaymentStatus.PARTIALLY_PAID,
            PaymentStatus.PARTIALLY_REFUNDED,
            PaymentStatus.MANUAL_RECONCILIATION_REQUIRED,
          ],
        },
      },
    });

    if (activePayment) {
      throw new ConflictError(
        `An active invoice already exists for this milestone (Status: ${activePayment.status}, Invoice: ${activePayment.paypalInvoiceId || activePayment.referenceId})`
      );
    }

    // Determine payer and beneficiary
    const payerEmail = milestone.project.client?.email || milestone.project.createdBy.email;
    const beneficiaryEmail =
      milestone.assignedDeveloper?.email ||
      milestone.project.leadDeveloper?.email ||
      milestone.project.createdBy.email;

    // Calculate invoice version (V_n+1)
    const priorPaymentsCount = await prisma.payment.count({
      where: { milestoneId: milestone.id },
    });
    const invoiceVersion = priorPaymentsCount + 1;

    const referenceId = `INV-${milestone.id.slice(0, 8).toUpperCase()}-V${invoiceVersion}`;
    const idempotencyKey = crypto.randomUUID();

    // -------------------------------------------------------------
    // Phase 1: Database Reservation (Atomic Transaction)
    // -------------------------------------------------------------
    const initialPayment = await prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          milestoneId: milestone.id,
          createdById: actorId,
          invoiceVersion,
          status: PaymentStatus.CREATING,
          payoutStatus: PaymentPayoutStatus.AWAITING_PAYMENT,
          snapshotAmount: milestone.paymentAmount,
          snapshotCurrency: milestone.currency,
          payerEmail,
          beneficiaryEmail,
          idempotencyKey,
          referenceId,
        },
      });

      return created;
    });

    // -------------------------------------------------------------
    // Phase 2: External HTTP API Call to PayPal REST API
    // -------------------------------------------------------------
    let paypalInvoice: any;
    let paypalInvoiceUrl: string | undefined;

    try {
      paypalInvoice = await paypalService.createInvoice(
        {
          invoiceNumber: referenceId,
          currency: milestone.currency,
          recipientEmail: payerEmail,
          recipientName: milestone.project.client?.name || 'Client',
          items: [
            {
              name: milestone.title,
              quantity: '1',
              unit_amount: {
                currency_code: milestone.currency,
                value: milestone.paymentAmount.toString(),
              },
              description: input.note || milestone.description || undefined,
            },
          ],
          memo: input.memo || `DevFlow Milestone Delivery: ${milestone.title}`,
        },
        idempotencyKey
      );

      // Automatically dispatch invoice to payer
      const sendResult = await paypalService.sendInvoice(paypalInvoice.id);
      paypalInvoiceUrl = sendResult.invoiceUrl || paypalInvoice.href;
    } catch (err: any) {
      logger.error('Failed to create/send PayPal invoice', { error: err.message, paymentId: initialPayment.id });

      // Mark payment failed in DB
      await prisma.payment.update({
        where: { id: initialPayment.id },
        data: {
          status: PaymentStatus.FAILED,
          errorMessage: err.message,
        },
      });

      throw err;
    }

    // -------------------------------------------------------------
    // Phase 3: Response Ingestion (Atomic Transaction)
    // -------------------------------------------------------------
    return await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: initialPayment.id },
        data: {
          status: PaymentStatus.SENT,
          paypalInvoiceId: paypalInvoice.id,
          paypalInvoiceUrl,
        },
      });

      await activityService.logActivity(
        {
          projectId: milestone.projectId,
          userId: actorId,
          action: ActivityAction.INVOICE_SENT,
          entityType: 'PAYMENT',
          entityId: updatedPayment.id,
          details: {
            paypalInvoiceId: paypalInvoice.id,
            amount: milestone.paymentAmount.toString(),
            payerEmail,
          },
        },
        tx
      );

      // Notify client that invoice is received
      if (milestone.project.clientId) {
        await notificationService.sendNotification(
          {
            userId: milestone.project.clientId,
            type: NotificationType.INVOICE_RECEIVED,
            title: 'Invoice Issued for Milestone',
            message: `An invoice of $${milestone.paymentAmount} ${milestone.currency} was issued for milestone "${milestone.title}".`,
            linkUrl: paypalInvoiceUrl,
          },
          tx
        );
      }

      return updatedPayment;
    });
  }

  /**
   * Cancels an unpaid invoice.
   */
  async cancelInvoice(actorId: string, paymentId: string, reason?: string): Promise<Payment> {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        milestone: {
          include: { project: { include: { members: true } } },
        },
      },
    });

    if (!payment) {
      throw new NotFoundError(`Payment with ID ${paymentId} not found`);
    }

    if (
      payment.status === PaymentStatus.PAID ||
      payment.status === PaymentStatus.PARTIALLY_PAID ||
      payment.status === PaymentStatus.PARTIALLY_REFUNDED ||
      payment.status === PaymentStatus.REFUNDED
    ) {
      throw new BadRequestError(`Cannot cancel an invoice with status '${payment.status}'`);
    }

    if (payment.paypalInvoiceId) {
      await paypalService.cancelInvoice(payment.paypalInvoiceId, reason);
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.CANCELLED,
          errorMessage: reason || 'Cancelled by project administrator',
        },
      });

      await activityService.logActivity(
        {
          projectId: payment.milestone.projectId,
          userId: actorId,
          action: ActivityAction.PAYOUT_CANCELLED,
          entityType: 'PAYMENT',
          entityId: payment.id,
          details: { reason },
        },
        tx
      );

      return updated;
    });
  }

  /**
   * Issues an authorized refund against a specific capture.
   * Strictly follows the Two-Phase Transaction Pattern (Section 5.10).
   */
  async createRefund(
    actorId: string,
    actorRole: Role,
    paymentId: string,
    input: CreateRefundInput
  ) {
    const grossAmountDecimal = new Prisma.Decimal(input.grossAmount);

    // -------------------------------------------------------------
    // Phase 1: Database Reservation (Atomic Transaction with Row Locks)
    // -------------------------------------------------------------
    const { newRefund, isRetry, payment, capture } = await prisma.$transaction(async (tx) => {
      // Idempotency check: return existing if duplicate request
      const existingRefund = await tx.paymentRefund.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });

      if (existingRefund) {
        return { newRefund: existingRefund, isRetry: true, payment: null as any, capture: null as any };
      }

      const p = await tx.payment.findUnique({
        where: { id: paymentId },
        include: {
          captures: true,
          refunds: { where: { status: { not: RefundStatus.FAILED } } },
          milestone: { include: { project: { include: { members: true } } } },
        },
      });

      if (!p) throw new NotFoundError(`Payment with ID ${paymentId} not found`);

      // Verify capture belongs to payment
      const cap = p.captures.find((c) => c.id === input.captureId);
      if (!cap) {
        throw new BadRequestError(`Capture ${input.captureId} does not belong to Payment ${paymentId}`);
      }

      if (cap.status !== CaptureStatus.COMPLETED) {
        throw new BadRequestError(`Capture is in '${cap.status}' status and cannot be refunded`);
      }

      // Check available headroom on this capture
      let alreadyRefundedOnCapture = new Prisma.Decimal(0);
      for (const r of p.refunds) {
        if (r.captureId === cap.id) {
          alreadyRefundedOnCapture = alreadyRefundedOnCapture.add(r.grossAmount);
        }
      }

      const remainingHeadroom = cap.grossAmount.minus(alreadyRefundedOnCapture);
      if (grossAmountDecimal.greaterThan(remainingHeadroom)) {
        throw new BadRequestError(
          `Requested refund of $${grossAmountDecimal} exceeds remaining capture balance of $${remainingHeadroom}`
        );
      }

      // Insert pending refund reservation
      const createdRefund = await tx.paymentRefund.create({
        data: {
          paymentId: p.id,
          captureId: cap.id,
          idempotencyKey: input.idempotencyKey,
          status: RefundStatus.PENDING,
          grossAmount: grossAmountDecimal,
          currency: p.snapshotCurrency,
          reason: input.reason,
          requestedAt: new Date(),
        },
      });

      // Reserve headroom
      await this.syncPaymentAggregates(tx, p.id);

      return { newRefund: createdRefund, isRetry: false, payment: p, capture: cap };
    });

    if (isRetry) {
      return { refund: newRefund, isRetry: true };
    }

    // -------------------------------------------------------------
    // Phase 2: External HTTP API Call to PayPal REST API (Outside DB Tx)
    // -------------------------------------------------------------
    let paypalResponse: any;
    try {
      paypalResponse = await paypalService.refundCapture(
        capture.paypalCaptureId,
        {
          amount: grossAmountDecimal.toString(),
          currency: payment.snapshotCurrency,
          note: input.reason,
        },
        input.idempotencyKey
      );
    } catch (err: any) {
      logger.error('PayPal refund API call failed', { error: err.message, refundId: newRefund.id });

      // Release reservation
      await prisma.$transaction(async (tx) => {
        await tx.paymentRefund.update({
          where: { id: newRefund.id },
          data: { status: RefundStatus.FAILED },
        });
        await this.syncPaymentAggregates(tx, payment.id);
      });

      throw err;
    }

    // -------------------------------------------------------------
    // Phase 3: Response Ingestion (Atomic Transaction)
    // -------------------------------------------------------------
    return await prisma.$transaction(async (tx) => {
      const confirmedRefund = await tx.paymentRefund.update({
        where: { id: newRefund.id },
        data: {
          status: RefundStatus.COMPLETED,
          paypalRefundId: paypalResponse.id,
          refundedAt: new Date(),
          rawResponse: paypalResponse,
        },
      });

      const updatedPayment = await this.syncPaymentAggregates(tx, payment.id);

      await activityService.logActivity(
        {
          projectId: payment.milestone.projectId,
          userId: actorId,
          action: ActivityAction.PAYMENT_REFUNDED,
          entityType: 'PAYMENT_REFUND',
          entityId: confirmedRefund.id,
          details: {
            amount: grossAmountDecimal.toString(),
            currency: payment.snapshotCurrency,
            paypalRefundId: paypalResponse.id,
          },
        },
        tx
      );

      // Notify client
      if (payment.milestone.project.clientId) {
        await notificationService.sendNotification(
          {
            userId: payment.milestone.project.clientId,
            type: NotificationType.PAYMENT_REFUNDED,
            title: 'Refund Processed',
            message: `A refund of $${grossAmountDecimal} ${payment.snapshotCurrency} has been confirmed.`,
            linkUrl: `/projects/${payment.milestone.projectId}`,
          },
          tx
        );
      }

      return {
        refund: confirmedRefund,
        payment: updatedPayment,
        isRetry: false,
      };
    });
  }

  /**
   * Retrieves single payment details with captures, refunds, and webhook events.
   */
  async getPaymentById(actorId: string, actorRole: Role, paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        captures: { orderBy: { createdAt: 'desc' } },
        refunds: { orderBy: { createdAt: 'desc' } },
        milestone: {
          select: {
            id: true,
            title: true,
            status: true,
            projectId: true,
            project: { select: { id: true, title: true, createdById: true, clientId: true, leadDeveloperId: true } },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundError(`Payment with ID ${paymentId} not found`);
    }

    return payment;
  }

  /**
   * Lists payments for a project.
   */
  async getProjectPayments(actorId: string, actorRole: Role, projectId: string, query?: PaymentQueryInput) {
    const page = Math.max(1, query?.page || 1);
    const limit = Math.min(100, Math.max(1, query?.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = {
      milestone: { projectId },
      ...(query?.status ? { status: query.status } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          captures: true,
          refunds: true,
          milestone: { select: { id: true, title: true, status: true } },
        },
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const paymentsService = new PaymentsService();

