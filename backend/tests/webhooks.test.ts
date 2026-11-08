import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { Prisma, PaymentStatus, PaymentPayoutStatus, MilestoneStatus, CaptureStatus, RefundStatus, CaptureFeeStatus, RefundFeeReversalStatus } from '@prisma/client';
import { app } from '../src/app';
import { prisma } from '../src/config/database';
import { paypalService } from '../src/services/paypal.service';

vi.mock('../src/config/database', () => {
  const mockPrisma: any = {
    webhookEvent: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    paymentCapture: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    paymentRefund: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    milestone: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(mockPrisma)),
  };
  return { prisma: mockPrisma };
});

describe('Phase 5: PayPal Webhook Ingestion & Idempotent Processing Suite', () => {
  const validHeaders = {
    'paypal-auth-algo': 'SHA256withRSA',
    'paypal-cert-url': 'https://api.paypal.com/v1/notifications/certs/CERT-12345',
    'paypal-transmission-id': 'transmission-unique-uuid-1',
    'paypal-transmission-sig': 'valid-base64-rsa-signature-string',
    'paypal-transmission-time': '2026-11-08T12:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Signature Verification & Header Validation', () => {
    it('rejects webhook with 400 Bad Request when verification headers are missing', async () => {
      const res = await request(app)
        .post('/api/webhooks/paypal')
        .send({
          id: 'WH-123',
          event_type: 'INVOICING.INVOICE.PAID',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Missing required PayPal webhook verification headers');
    });

    it('rejects webhook with 401 Unauthorized when signature check fails', async () => {
      vi.spyOn(paypalService, 'verifyWebhookSignature').mockResolvedValueOnce(false);

      const res = await request(app)
        .post('/api/webhooks/paypal')
        .set(validHeaders)
        .send({
          id: 'WH-123',
          event_type: 'INVOICING.INVOICE.PAID',
          resource: { id: 'INV2-TEST' },
        });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toContain('Invalid PayPal webhook signature');
    });
  });

  describe('Idempotency & Replay Handling', () => {
    it('returns 200 without reprocessing when duplicate event was already processed', async () => {
      vi.spyOn(paypalService, 'verifyWebhookSignature').mockResolvedValueOnce(true);

      (prisma.webhookEvent.findUnique as any).mockResolvedValue({
        id: 'wh-record-1',
        provider: 'PAYPAL',
        eventId: 'WH-ALREADY-PROCESSED',
        eventType: 'INVOICING.INVOICE.PAID',
        status: 'PROCESSED',
      });

      const res = await request(app)
        .post('/api/webhooks/paypal')
        .set(validHeaders)
        .send({
          id: 'WH-ALREADY-PROCESSED',
          event_type: 'INVOICING.INVOICE.PAID',
          resource: { id: 'INV2-DUPLICATE' },
        });

      expect(res.status).toBe(200);
      expect(res.body.duplicate).toBe(true);
      expect(res.body.status).toBe('PROCESSED');
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });
  });

  describe('Event: INVOICING.INVOICE.PAID', () => {
    it('marks payment PAID and payoutStatus PLATFORM_HELD, and updates milestone status to PAID', async () => {
      vi.spyOn(paypalService, 'verifyWebhookSignature').mockResolvedValueOnce(true);

      (prisma.webhookEvent.findUnique as any).mockResolvedValue(null);
      (prisma.webhookEvent.create as any).mockResolvedValue({
        id: 'wh-new-1',
        eventId: 'WH-PAID-1',
        status: 'RECEIVED',
      });

      (prisma.payment.findFirst as any).mockResolvedValue({
        id: 'pay-1',
        milestoneId: 'm-1',
        paypalInvoiceId: 'INV2-MOCK-PAID',
        status: PaymentStatus.SENT,
        snapshotAmount: new Prisma.Decimal('1500.00'),
        snapshotCurrency: 'USD',
        createdById: 'user-owner',
        milestone: {
          id: 'm-1',
          title: 'Phase 5 Delivery',
          projectId: 'p-1',
          assignedDeveloperId: 'dev-1',
          project: { id: 'p-1' },
        },
      });

      (prisma.payment.update as any).mockResolvedValue({
        id: 'pay-1',
        status: PaymentStatus.PAID,
        payoutStatus: PaymentPayoutStatus.PLATFORM_HELD,
      });

      const res = await request(app)
        .post('/api/webhooks/paypal')
        .set(validHeaders)
        .send({
          id: 'WH-PAID-1',
          event_type: 'INVOICING.INVOICE.PAID',
          resource: {
            id: 'INV2-MOCK-PAID',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pay-1' },
          data: expect.objectContaining({
            status: PaymentStatus.PAID,
            payoutStatus: PaymentPayoutStatus.PLATFORM_HELD,
          }),
        })
      );
      expect(prisma.milestone.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'm-1' },
          data: expect.objectContaining({
            status: MilestoneStatus.PAID,
          }),
        })
      );
    });
  });

  describe('Event: PAYMENT.CAPTURE.COMPLETED', () => {
    it('creates PaymentCapture and synchronizes aggregates with verified fee breakdown', async () => {
      vi.spyOn(paypalService, 'verifyWebhookSignature').mockResolvedValueOnce(true);

      (prisma.webhookEvent.findUnique as any).mockResolvedValue(null);
      (prisma.webhookEvent.create as any).mockResolvedValue({
        id: 'wh-cap-1',
        eventId: 'WH-CAPTURE-1',
        status: 'RECEIVED',
      });

      (prisma.payment.findFirst as any).mockResolvedValue({
        id: 'pay-1',
        milestoneId: 'm-1',
        paypalInvoiceId: 'INV2-CAPTURE-REF',
        referenceId: 'INV-MILESTONE-V1',
        status: PaymentStatus.SENT,
        payoutStatus: PaymentPayoutStatus.AWAITING_PAYMENT,
        snapshotCurrency: 'USD',
        createdById: 'user-owner',
        milestone: {
          id: 'm-1',
          projectId: 'p-1',
          project: { id: 'p-1' },
        },
      });

      (prisma.paymentCapture.findUnique as any).mockResolvedValue(null);

      // syncPaymentAggregates findUnique mock
      (prisma.payment.findUnique as any).mockResolvedValue({
        id: 'pay-1',
        status: PaymentStatus.PAID,
        payoutStatus: PaymentPayoutStatus.PLATFORM_HELD,
        snapshotAmount: new Prisma.Decimal('2000.00'),
        snapshotCurrency: 'USD',
        captures: [
          {
            id: 'cap-created-1',
            status: CaptureStatus.COMPLETED,
            grossAmount: new Prisma.Decimal('2000.00'),
            feeAmount: new Prisma.Decimal('60.00'),
            feeStatus: CaptureFeeStatus.VERIFIED,
          },
        ],
        refunds: [],
      });

      (prisma.payment.update as any).mockResolvedValue({
        id: 'pay-1',
        status: PaymentStatus.PAID,
      });

      const res = await request(app)
        .post('/api/webhooks/paypal')
        .set(validHeaders)
        .send({
          id: 'WH-CAPTURE-1',
          event_type: 'PAYMENT.CAPTURE.COMPLETED',
          resource: {
            id: 'CAP-PAYPAL-999',
            invoice_id: 'INV2-CAPTURE-REF',
            amount: { value: '2000.00', currency_code: 'USD' },
            seller_receivable_breakdown: {
              gross_amount: { value: '2000.00', currency_code: 'USD' },
              paypal_fee: { value: '60.00', currency_code: 'USD' },
              net_amount: { value: '1940.00', currency_code: 'USD' },
            },
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(prisma.paymentCapture.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paypalCaptureId: 'CAP-PAYPAL-999',
            status: CaptureStatus.COMPLETED,
            grossAmount: new Prisma.Decimal('2000.00'),
            feeAmount: new Prisma.Decimal('60.00'),
            feeStatus: CaptureFeeStatus.VERIFIED,
          }),
        })
      );
    });
  });

  describe('Event: INVOICING.INVOICE.CANCELLED', () => {
    it('updates unpaid payment to CANCELLED status', async () => {
      vi.spyOn(paypalService, 'verifyWebhookSignature').mockResolvedValueOnce(true);

      (prisma.webhookEvent.findUnique as any).mockResolvedValue(null);
      (prisma.webhookEvent.create as any).mockResolvedValue({
        id: 'wh-cancel-1',
        eventId: 'WH-CANCEL-1',
        status: 'RECEIVED',
      });

      (prisma.payment.findFirst as any).mockResolvedValue({
        id: 'pay-to-cancel',
        milestoneId: 'm-1',
        paypalInvoiceId: 'INV2-CANCELLED',
        status: PaymentStatus.SENT,
        createdById: 'user-owner',
        milestone: { projectId: 'p-1' },
      });

      const res = await request(app)
        .post('/api/webhooks/paypal')
        .set(validHeaders)
        .send({
          id: 'WH-CANCEL-1',
          event_type: 'INVOICING.INVOICE.CANCELLED',
          resource: { id: 'INV2-CANCELLED' },
        });

      expect(res.status).toBe(200);
      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pay-to-cancel' },
          data: expect.objectContaining({
            status: PaymentStatus.CANCELLED,
          }),
        })
      );
    });
  });
});
