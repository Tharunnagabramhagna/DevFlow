import {
  Prisma,
  PaymentStatus,
  PaymentPayoutStatus,
  MilestoneStatus,
  CaptureStatus,
  RefundStatus,
  CaptureFeeStatus,
  RefundFeeReversalStatus,
  ActivityAction,
  NotificationType,
} from '@prisma/client';
import { prisma } from '../../config/database';
import { paypalService } from '../../services/paypal.service';
import { paymentsService } from '../payments/payments.service';
import { activityService } from '../../services/activity.service';
import { notificationService } from '../../services/notification.service';
import { BadRequestError, UnauthorizedError } from '../../utils/errors';
import logger from '../../utils/logger';

export class WebhooksService {
  /**
   * Processes incoming PayPal webhook events with cryptographic signature verification,
   * idempotency tracking, and state synchronization.
   */
  async handlePayPalWebhook(headers: Record<string, any>, payload: any): Promise<any> {
    const authAlgo = (headers['paypal-auth-algo'] || headers['PAYPAL-AUTH-ALGO']) as string;
    const certUrl = (headers['paypal-cert-url'] || headers['PAYPAL-CERT-URL']) as string;
    const transmissionId = (headers['paypal-transmission-id'] || headers['PAYPAL-TRANSMISSION-ID']) as string;
    const transmissionSig = (headers['paypal-transmission-sig'] || headers['PAYPAL-TRANSMISSION-SIG']) as string;
    const transmissionTime = (headers['paypal-transmission-time'] || headers['PAYPAL-TRANSMISSION-TIME']) as string;

    if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
      throw new BadRequestError('Missing required PayPal webhook verification headers');
    }

    // Cryptographic signature verification
    const isValid = await paypalService.verifyWebhookSignature({
      authAlgo,
      certUrl,
      transmissionId,
      transmissionSig,
      transmissionTime,
      webhookEvent: payload,
    });

    if (!isValid) {
      logger.warn('Rejected PayPal webhook with invalid signature', { transmissionId });
      throw new UnauthorizedError('Invalid PayPal webhook signature');
    }

    const eventId = payload.id;
    const eventType = payload.event_type;

    if (!eventId || !eventType) {
      throw new BadRequestError('Invalid webhook payload: missing event id or event_type');
    }

    // -------------------------------------------------------------
    // Idempotency: Check whether event was already processed
    // -------------------------------------------------------------
    const existing = await prisma.webhookEvent.findUnique({
      where: {
        provider_eventId: {
          provider: 'PAYPAL',
          eventId,
        },
      },
    });

    if (existing?.status === 'PROCESSED') {
      logger.info('Duplicate PayPal webhook ignored (already processed)', { eventId, eventType });
      return { success: true, duplicate: true, eventId, status: 'PROCESSED' };
    }

    const webhookRecord =
      existing ||
      (await prisma.webhookEvent.create({
        data: {
          provider: 'PAYPAL',
          eventId,
          eventType,
          summary: payload.summary || null,
          resourceId: payload.resource?.id || null,
          payload: payload,
          status: 'RECEIVED',
        },
      }));

    try {
      switch (eventType) {
        case 'INVOICING.INVOICE.PAID': {
          await this.handleInvoicePaid(webhookRecord.id, payload.resource);
          break;
        }

        case 'PAYMENT.CAPTURE.COMPLETED': {
          await this.handleCaptureCompleted(webhookRecord.id, payload.resource);
          break;
        }

        case 'PAYMENT.CAPTURE.REFUNDED': {
          await this.handleCaptureRefunded(webhookRecord.id, payload.resource, eventId);
          break;
        }

        case 'PAYMENT.CAPTURE.DENIED':
        case 'PAYMENT.CAPTURE.REVERSED': {
          await this.handleCaptureDenied(webhookRecord.id, payload.resource);
          break;
        }

        case 'INVOICING.INVOICE.CANCELLED': {
          await this.handleInvoiceCancelled(webhookRecord.id, payload.resource);
          break;
        }

        default: {
          logger.info(`Unhandled webhook event type: ${eventType}`, { eventId });
          await prisma.webhookEvent.update({
            where: { id: webhookRecord.id },
            data: { status: 'PROCESSED', processedAt: new Date() },
          });
          break;
        }
      }

      return { success: true, eventId, eventType };
    } catch (err: any) {
      logger.error('Failed to process PayPal webhook event', { eventId, eventType, error: err.message });
      await prisma.webhookEvent.update({
        where: { id: webhookRecord.id },
        data: {
          status: 'FAILED',
          errorMessage: err.message,
        },
      });
      throw err;
    }
  }

  private async handleInvoicePaid(webhookEventId: string, invoice: any) {
    const paypalInvoiceId = invoice?.id;
    if (!paypalInvoiceId) return;

    const payment = await prisma.payment.findFirst({
      where: { paypalInvoiceId },
      include: {
        milestone: {
          include: { project: true },
        },
      },
    });

    if (!payment) {
      logger.warn('Payment not found for paid invoice', { paypalInvoiceId });
      await prisma.webhookEvent.update({
        where: { id: webhookEventId },
        data: { status: 'PROCESSED', processedAt: new Date() },
      });
      return;
    }

    await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          payoutStatus: PaymentPayoutStatus.PLATFORM_HELD,
          paidAt: new Date(),
        },
      });

      await tx.milestone.update({
        where: { id: payment.milestoneId },
        data: {
          status: MilestoneStatus.PAID,
          paidAt: new Date(),
        },
      });

      await tx.webhookEvent.update({
        where: { id: webhookEventId },
        data: {
          paymentId: payment.id,
          status: 'PROCESSED',
          processedAt: new Date(),
        },
      });

      await activityService.logActivity(
        {
          projectId: payment.milestone.projectId,
          userId: payment.createdById,
          action: ActivityAction.PAYMENT_RECEIVED,
          entityType: 'PAYMENT',
          entityId: updatedPayment.id,
          details: {
            paypalInvoiceId,
            amount: payment.snapshotAmount.toString(),
            currency: payment.snapshotCurrency,
          },
        },
        tx
      );

      if (payment.milestone.assignedDeveloperId) {
        await notificationService.sendNotification(
          {
            userId: payment.milestone.assignedDeveloperId,
            type: NotificationType.PAYMENT_CONFIRMED,
            title: 'Payment Received',
            message: `Payment of $${payment.snapshotAmount} ${payment.snapshotCurrency} was received for milestone "${payment.milestone.title}".`,
            linkUrl: `/projects/${payment.milestone.projectId}`,
          },
          tx
        );
      }
    });
  }

  private async handleCaptureCompleted(webhookEventId: string, capture: any) {
    const paypalCaptureId = capture?.id;
    if (!paypalCaptureId) return;

    const invoiceId = capture?.invoice_id || capture?.supplementary_data?.related_ids?.invoice_id;
    const customId = capture?.custom_id;

    let payment = await prisma.payment.findFirst({
      where: {
        OR: [
          ...(invoiceId ? [{ paypalInvoiceId: invoiceId }, { referenceId: invoiceId }] : []),
          ...(customId ? [{ id: customId }, { referenceId: customId }] : []),
        ],
      },
      include: {
        milestone: {
          include: { project: true },
        },
      },
    });

    if (!payment) {
      const existingCapture = await prisma.paymentCapture.findUnique({
        where: { paypalCaptureId },
        include: { payment: { include: { milestone: { include: { project: true } } } } },
      });
      if (existingCapture) {
        payment = existingCapture.payment;
      }
    }

    if (!payment) {
      logger.warn('Payment not found for completed capture', { paypalCaptureId, invoiceId, customId });
      await prisma.webhookEvent.update({
        where: { id: webhookEventId },
        data: { status: 'PROCESSED', processedAt: new Date() },
      });
      return;
    }

    await prisma.$transaction(async (tx) => {
      const existingCap = await tx.paymentCapture.findUnique({
        where: { paypalCaptureId },
      });

      const gross = new Prisma.Decimal(capture.amount?.value || '0');
      const fee = capture.seller_receivable_breakdown?.paypal_fee?.value
        ? new Prisma.Decimal(capture.seller_receivable_breakdown.paypal_fee.value)
        : null;
      const net = capture.seller_receivable_breakdown?.net_amount?.value
        ? new Prisma.Decimal(capture.seller_receivable_breakdown.net_amount.value)
        : fee
        ? gross.minus(fee)
        : null;
      const feeStatus = fee ? CaptureFeeStatus.VERIFIED : CaptureFeeStatus.PENDING_CONFIRMATION;

      if (!existingCap) {
        await tx.paymentCapture.create({
          data: {
            paymentId: payment.id,
            paypalCaptureId,
            status: CaptureStatus.COMPLETED,
            grossAmount: gross,
            feeAmount: fee,
            netAmount: net,
            currency: capture.amount?.currency_code || payment.snapshotCurrency,
            feeStatus,
            capturedAt: capture.create_time ? new Date(capture.create_time) : new Date(),
            rawResponse: capture,
          },
        });
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          payoutStatus: PaymentPayoutStatus.PLATFORM_HELD,
          paidAt: payment.paidAt || new Date(),
        },
      });

      await tx.milestone.update({
        where: { id: payment.milestoneId },
        data: {
          status: MilestoneStatus.PAID,
          paidAt: payment.milestone.paidAt || new Date(),
        },
      });

      await paymentsService.syncPaymentAggregates(tx, payment.id);

      await tx.webhookEvent.update({
        where: { id: webhookEventId },
        data: {
          paymentId: payment.id,
          status: 'PROCESSED',
          processedAt: new Date(),
        },
      });

      await activityService.logActivity(
        {
          projectId: payment.milestone.projectId,
          userId: payment.createdById,
          action: ActivityAction.PAYMENT_RECEIVED,
          entityType: 'PAYMENT_CAPTURE',
          entityId: paypalCaptureId,
          details: {
            paypalCaptureId,
            grossAmount: gross.toString(),
            feeAmount: fee?.toString(),
            netAmount: net?.toString(),
          },
        },
        tx
      );
    });
  }

  private async handleCaptureRefunded(webhookEventId: string, refund: any, eventId: string) {
    const paypalRefundId = refund?.id;
    let captureIdFromLink: string | undefined;

    if (Array.isArray(refund?.links)) {
      const upLink = refund.links.find((l: any) => l.rel === 'up');
      if (upLink?.href) {
        captureIdFromLink = upLink.href.split('/').pop();
      }
    }

    const paypalCaptureId = refund?.capture_id || captureIdFromLink;

    if (!paypalCaptureId) {
      logger.warn('Could not determine capture ID for refund event', { paypalRefundId });
      await prisma.webhookEvent.update({
        where: { id: webhookEventId },
        data: { status: 'PROCESSED', processedAt: new Date() },
      });
      return;
    }

    const capture = await prisma.paymentCapture.findUnique({
      where: { paypalCaptureId },
      include: { payment: { include: { milestone: { include: { project: true } } } } },
    });

    if (!capture) {
      logger.warn('Capture not found for refunded capture event', { paypalCaptureId, paypalRefundId });
      await prisma.webhookEvent.update({
        where: { id: webhookEventId },
        data: { status: 'PROCESSED', processedAt: new Date() },
      });
      return;
    }

    await prisma.$transaction(async (tx) => {
      const gross = new Prisma.Decimal(refund.amount?.value || '0');
      const feeReversal = refund.seller_payable_breakdown?.paypal_fee?.value
        ? new Prisma.Decimal(refund.seller_payable_breakdown.paypal_fee.value)
        : null;
      const feeReversalStatus = feeReversal
        ? RefundFeeReversalStatus.VERIFIED
        : RefundFeeReversalStatus.PENDING_CONFIRMATION;

      const existingRefund = paypalRefundId
        ? await tx.paymentRefund.findUnique({ where: { paypalRefundId } })
        : null;

      if (existingRefund) {
        await tx.paymentRefund.update({
          where: { id: existingRefund.id },
          data: {
            status: RefundStatus.COMPLETED,
            feeReversalAmount: feeReversal || existingRefund.feeReversalAmount,
            feeReversalStatus,
            refundedAt: refund.create_time ? new Date(refund.create_time) : new Date(),
            rawResponse: refund,
          },
        });
      } else {
        await tx.paymentRefund.create({
          data: {
            paymentId: capture.paymentId,
            captureId: capture.id,
            paypalRefundId,
            idempotencyKey: `paypal_webhook_${eventId}`,
            status: RefundStatus.COMPLETED,
            grossAmount: gross,
            currency: refund.amount?.currency_code || capture.currency,
            feeReversalAmount: feeReversal,
            feeReversalStatus,
            refundedAt: refund.create_time ? new Date(refund.create_time) : new Date(),
            rawResponse: refund,
          },
        });
      }

      await paymentsService.syncPaymentAggregates(tx, capture.paymentId);

      await tx.webhookEvent.update({
        where: { id: webhookEventId },
        data: {
          paymentId: capture.paymentId,
          status: 'PROCESSED',
          processedAt: new Date(),
        },
      });

      await activityService.logActivity(
        {
          projectId: capture.payment.milestone.projectId,
          userId: capture.payment.createdById,
          action: ActivityAction.PAYMENT_REFUNDED,
          entityType: 'PAYMENT_REFUND',
          entityId: paypalRefundId || webhookEventId,
          details: {
            paypalRefundId,
            grossAmount: gross.toString(),
            feeReversalAmount: feeReversal?.toString(),
          },
        },
        tx
      );
    });
  }

  private async handleCaptureDenied(webhookEventId: string, capture: any) {
    const paypalCaptureId = capture?.id;
    if (!paypalCaptureId) return;

    const existingCapture = await prisma.paymentCapture.findUnique({
      where: { paypalCaptureId },
      include: { payment: true },
    });

    if (existingCapture) {
      await prisma.$transaction(async (tx) => {
        await tx.paymentCapture.update({
          where: { id: existingCapture.id },
          data: { status: CaptureStatus.FAILED },
        });

        await tx.payment.update({
          where: { id: existingCapture.paymentId },
          data: { status: PaymentStatus.MANUAL_RECONCILIATION_REQUIRED },
        });

        await paymentsService.syncPaymentAggregates(tx, existingCapture.paymentId);

        await tx.webhookEvent.update({
          where: { id: webhookEventId },
          data: {
            paymentId: existingCapture.paymentId,
            status: 'PROCESSED',
            processedAt: new Date(),
          },
        });
      });
    }
  }

  private async handleInvoiceCancelled(webhookEventId: string, invoice: any) {
    const paypalInvoiceId = invoice?.id;
    if (!paypalInvoiceId) return;

    const payment = await prisma.payment.findFirst({
      where: { paypalInvoiceId },
      include: { milestone: true },
    });

    if (payment && payment.status !== PaymentStatus.PAID) {
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.CANCELLED },
        });

        await tx.webhookEvent.update({
          where: { id: webhookEventId },
          data: {
            paymentId: payment.id,
            status: 'PROCESSED',
            processedAt: new Date(),
          },
        });

        await activityService.logActivity(
          {
            projectId: payment.milestone.projectId,
            userId: payment.createdById,
            action: ActivityAction.PAYOUT_CANCELLED,
            entityType: 'PAYMENT',
            entityId: payment.id,
            details: { paypalInvoiceId },
          },
          tx
        );
      });
    }
  }
}

export const webhooksService = new WebhooksService();

