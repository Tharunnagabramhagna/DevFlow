import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Prisma, PaymentStatus, PaymentPayoutStatus, CaptureStatus, RefundStatus, CaptureFeeStatus, Role, ProjectMemberRole } from '@prisma/client';
import { app } from '../src/app';
import { prisma } from '../src/config/database';
import { env } from '../src/config/env';
import { paymentsService } from '../src/modules/payments/payments.service';

vi.mock('../src/config/database', () => {
  const mockPrisma: any = {
    payment: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    paymentCapture: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    paymentRefund: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    milestone: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
    },
    projectMember: {
      findUnique: vi.fn(),
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

vi.mock('../src/services/paypal.service', () => ({
  paypalService: {
    isConfigured: vi.fn().mockReturnValue(true),
    getAccessToken: vi.fn().mockResolvedValue('mock_sandbox_access_token_12345'),
    createInvoice: vi.fn().mockImplementation(async (payload: any) => ({
      id: 'INV2-MOCK-TEST',
      status: 'DRAFT',
      href: 'https://www.sandbox.paypal.com/invoice/payerView/details/INV2-MOCK-TEST',
      detail: {
        invoice_number: payload.invoiceNumber,
        invoice_date: new Date().toISOString().split('T')[0],
        currency_code: payload.currency,
      },
    })),
    sendInvoice: vi.fn().mockImplementation(async (invoiceId: string) => ({
      success: true,
      invoiceUrl: `https://www.sandbox.paypal.com/invoice/payerView/details/${invoiceId}`,
    })),
    getInvoice: vi.fn().mockImplementation(async (invoiceId: string) => ({
      id: invoiceId,
      status: 'SENT',
      detail: { invoice_number: 'INV-12345', currency_code: 'USD' },
    })),
    cancelInvoice: vi.fn().mockResolvedValue({ success: true }),
    refundCapture: vi.fn().mockImplementation(async (_captureId: string, params: any) => ({
      id: 'REF-MOCK-123',
      status: 'COMPLETED',
      net_amount_breakdown: {
        gross_amount: { value: params.amount, currency_code: params.currency },
        paypal_fee: { value: '0.00', currency_code: params.currency },
        net_amount: { value: params.amount, currency_code: params.currency },
      },
    })),
    verifyWebhookSignature: vi.fn().mockResolvedValue(true),
  },
}));

const generateTestToken = (userId: string, email: string, role: Role = Role.FREELANCER) => {
  return jwt.sign({ sub: userId, email, role }, env.JWT_SECRET, { expiresIn: '1h' });
};

describe('Phase 5: Payments & Invoicing REST Integration Suite', () => {
  const ownerToken = generateTestToken('user-owner', 'owner@example.com', Role.CLIENT);
  const clientToken = generateTestToken('user-client', 'client@example.com', Role.CLIENT);
  const devToken = generateTestToken('user-dev', 'dev@example.com', Role.FREELANCER);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Financial Aggregates Derivation (syncPaymentAggregates)', () => {
    it('correctly derives settled, verified fees, and net received amounts', async () => {
      const mockPaymentId = 'pay-agg-1';

      (prisma.payment.findUnique as any).mockResolvedValue({
        id: mockPaymentId,
        status: PaymentStatus.SENT,
        payoutStatus: PaymentPayoutStatus.AWAITING_PAYMENT,
        snapshotAmount: new Prisma.Decimal('1000.00'),
        snapshotCurrency: 'USD',
        captures: [
          {
            id: 'cap-1',
            status: CaptureStatus.COMPLETED,
            grossAmount: new Prisma.Decimal('1000.00'),
            feeAmount: new Prisma.Decimal('30.00'),
            feeStatus: CaptureFeeStatus.VERIFIED,
          },
        ],
        refunds: [],
      });

      (prisma.payment.update as any).mockImplementation(({ data }: any) => {
        return { id: mockPaymentId, ...data };
      });

      const updated = await paymentsService.syncPaymentAggregates(prisma as any, mockPaymentId);

      expect(updated.settledAmount.toString()).toBe('1000');
      expect(updated.feeAmount.toString()).toBe('30');
      expect(updated.netReceivedAmount.toString()).toBe('970');
      expect(updated.status).toBe(PaymentStatus.PAID);
      expect(updated.payoutStatus).toBe(PaymentPayoutStatus.PLATFORM_HELD);
    });

    it('handles partial refund and transitions status to PARTIALLY_REFUNDED', async () => {
      const mockPaymentId = 'pay-agg-2';

      (prisma.payment.findUnique as any).mockResolvedValue({
        id: mockPaymentId,
        status: PaymentStatus.PAID,
        payoutStatus: PaymentPayoutStatus.PLATFORM_HELD,
        snapshotAmount: new Prisma.Decimal('1000.00'),
        snapshotCurrency: 'USD',
        captures: [
          {
            id: 'cap-1',
            status: CaptureStatus.COMPLETED,
            grossAmount: new Prisma.Decimal('1000.00'),
            feeAmount: new Prisma.Decimal('30.00'),
            feeStatus: CaptureFeeStatus.VERIFIED,
          },
        ],
        refunds: [
          {
            id: 'ref-1',
            status: RefundStatus.COMPLETED,
            grossAmount: new Prisma.Decimal('400.00'),
            feeReversalAmount: null,
            feeReversalStatus: 'NO_FEE_REVERSAL',
          },
        ],
      });

      (prisma.payment.update as any).mockImplementation(({ data }: any) => {
        return { id: mockPaymentId, ...data };
      });

      const updated = await paymentsService.syncPaymentAggregates(prisma as any, mockPaymentId);

      expect(updated.settledAmount.toString()).toBe('1000');
      expect(updated.refundedAmount.toString()).toBe('400');
      expect(updated.status).toBe(PaymentStatus.PARTIALLY_REFUNDED);
    });

    it('handles full refund and transitions status to REFUNDED', async () => {
      const mockPaymentId = 'pay-agg-3';

      (prisma.payment.findUnique as any).mockResolvedValue({
        id: mockPaymentId,
        status: PaymentStatus.PAID,
        payoutStatus: PaymentPayoutStatus.PLATFORM_HELD,
        snapshotAmount: new Prisma.Decimal('1000.00'),
        snapshotCurrency: 'USD',
        captures: [
          {
            id: 'cap-1',
            status: CaptureStatus.COMPLETED,
            grossAmount: new Prisma.Decimal('1000.00'),
            feeAmount: new Prisma.Decimal('30.00'),
            feeStatus: CaptureFeeStatus.VERIFIED,
          },
        ],
        refunds: [
          {
            id: 'ref-1',
            status: RefundStatus.COMPLETED,
            grossAmount: new Prisma.Decimal('1000.00'),
            feeReversalAmount: null,
            feeReversalStatus: 'NO_FEE_REVERSAL',
          },
        ],
      });

      (prisma.payment.update as any).mockImplementation(({ data }: any) => {
        return { id: mockPaymentId, ...data };
      });

      const updated = await paymentsService.syncPaymentAggregates(prisma as any, mockPaymentId);

      expect(updated.refundedAmount.toString()).toBe('1000');
      expect(updated.status).toBe(PaymentStatus.REFUNDED);
    });
  });

  describe('Invoice Creation (POST /api/payments/invoices)', () => {
    it('creates and sends PayPal draft invoice when authorized by project owner/client', async () => {
      (prisma.milestone.findUnique as any).mockResolvedValue({
        id: '22222222-2222-2222-2222-222222222222',
        title: 'Backend API Implementation',
        description: 'Complete Phase 5 PayPal Integration',
        paymentAmount: new Prisma.Decimal('2500.00'),
        currency: 'USD',
        projectId: '11111111-1111-1111-1111-111111111111',
        project: {
          id: '11111111-1111-1111-1111-111111111111',
          createdById: 'user-owner',
          clientId: 'user-client',
          client: { email: 'client@example.com', name: 'Acme Client' },
          createdBy: { email: 'owner@example.com' },
          leadDeveloper: { email: 'lead@example.com' },
          members: [
            { userId: 'user-owner', role: ProjectMemberRole.OWNER },
            { userId: 'user-client', role: ProjectMemberRole.CLIENT },
          ],
        },
        assignedDeveloper: { email: 'freelancer@example.com' },
      });

      // No active payment exists
      (prisma.payment.findFirst as any).mockResolvedValue(null);
      (prisma.payment.count as any).mockResolvedValue(0);

      (prisma.payment.create as any).mockResolvedValue({
        id: '33333333-3333-3333-3333-333333333333',
        milestoneId: '22222222-2222-2222-2222-222222222222',
        createdById: 'user-owner',
        invoiceVersion: 1,
        status: PaymentStatus.CREATING,
        snapshotAmount: new Prisma.Decimal('2500.00'),
        snapshotCurrency: 'USD',
        payerEmail: 'client@example.com',
        beneficiaryEmail: 'freelancer@example.com',
      });

      (prisma.payment.update as any).mockResolvedValue({
        id: '33333333-3333-3333-3333-333333333333',
        milestoneId: '22222222-2222-2222-2222-222222222222',
        status: PaymentStatus.SENT,
        paypalInvoiceId: 'INV2-MOCK-TEST',
        paypalInvoiceUrl: 'https://www.sandbox.paypal.com/invoice/payerView/details/INV2-MOCK-TEST',
      });

      const res = await request(app)
        .post('/api/payments/invoices')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          milestoneId: '22222222-2222-2222-2222-222222222222',
          note: 'Approved delivery for milestone 1',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe(PaymentStatus.SENT);
      expect(res.body.paypalInvoiceId).toBeDefined();
    });

    it('rejects invoice creation with 409 Conflict if active invoice already exists', async () => {
      (prisma.milestone.findUnique as any).mockResolvedValue({
        id: '22222222-2222-2222-2222-222222222222',
        title: 'Backend API Implementation',
        paymentAmount: new Prisma.Decimal('2500.00'),
        currency: 'USD',
        projectId: '11111111-1111-1111-1111-111111111111',
        project: {
          id: '11111111-1111-1111-1111-111111111111',
          createdById: 'user-owner',
          members: [{ userId: 'user-owner', role: ProjectMemberRole.OWNER }],
          createdBy: { email: 'owner@example.com' },
        },
      });

      // Active payment already exists
      (prisma.payment.findFirst as any).mockResolvedValue({
        id: 'pay-existing-active',
        milestoneId: '22222222-2222-2222-2222-222222222222',
        status: PaymentStatus.SENT,
        paypalInvoiceId: 'INV2-ALREADY-EXISTS',
        referenceId: 'INV-MILESTONE-V1',
      });

      const res = await request(app)
        .post('/api/payments/invoices')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          milestoneId: '22222222-2222-2222-2222-222222222222',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toContain('active invoice already exists');
    });

    it('rejects invoice creation if user lacks project OWNER or CLIENT role', async () => {
      (prisma.milestone.findUnique as any).mockResolvedValue({
        id: '22222222-2222-2222-2222-222222222222',
        title: 'Backend API',
        paymentAmount: new Prisma.Decimal('1000.00'),
        currency: 'USD',
        projectId: '11111111-1111-1111-1111-111111111111',
        project: {
          id: '11111111-1111-1111-1111-111111111111',
          createdById: 'user-owner',
          members: [{ userId: 'user-dev', role: ProjectMemberRole.MEMBER }],
          createdBy: { email: 'owner@example.com' },
        },
      });

      const res = await request(app)
        .post('/api/payments/invoices')
        .set('Authorization', `Bearer ${devToken}`)
        .send({
          milestoneId: '22222222-2222-2222-2222-222222222222',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toContain('client or owner');
    });
  });

  describe('Invoice Cancellation (POST /api/payments/:id/cancel)', () => {
    it('cancels an unpaid invoice and transitions status to CANCELLED', async () => {
      const paymentId = '33333333-3333-3333-3333-333333333333';

      (prisma.payment.findUnique as any).mockResolvedValue({
        id: paymentId,
        status: PaymentStatus.SENT,
        paypalInvoiceId: 'INV2-MOCK-TO-CANCEL',
        milestone: {
          projectId: '11111111-1111-1111-1111-111111111111',
          project: {
            id: '11111111-1111-1111-1111-111111111111',
            createdById: 'user-owner',
            members: [{ userId: 'user-owner', role: ProjectMemberRole.OWNER }],
          },
        },
      });

      (prisma.payment.update as any).mockResolvedValue({
        id: paymentId,
        status: PaymentStatus.CANCELLED,
        errorMessage: 'Scope changed',
      });

      const res = await request(app)
        .post(`/api/payments/${paymentId}/cancel`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ reason: 'Scope changed' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(PaymentStatus.CANCELLED);
    });

    it('rejects cancellation of an already paid invoice', async () => {
      const paymentId = '33333333-3333-3333-3333-333333333333';

      (prisma.payment.findUnique as any).mockResolvedValue({
        id: paymentId,
        status: PaymentStatus.PAID,
        paypalInvoiceId: 'INV2-PAID',
        milestone: {
          projectId: '11111111-1111-1111-1111-111111111111',
          project: {
            id: '11111111-1111-1111-1111-111111111111',
            createdById: 'user-owner',
            members: [{ userId: 'user-owner', role: ProjectMemberRole.OWNER }],
          },
        },
      });

      const res = await request(app)
        .post(`/api/payments/${paymentId}/cancel`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ reason: 'Try cancel paid' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Cannot cancel an invoice with status');
    });
  });

  describe('Two-Phase Refund Workflow (POST /api/payments/:id/refund)', () => {
    it('successfully processes refund when within capture balance headroom', async () => {
      const paymentId = '33333333-3333-3333-3333-333333333333';
      const captureId = '44444444-4444-4444-4444-444444444444';
      const refundKey = 'refund-idemp-key-12345';

      // Phase 1 check: findUnique for payment
      (prisma.payment.findUnique as any).mockResolvedValue({
        id: paymentId,
        status: PaymentStatus.PAID,
        payoutStatus: PaymentPayoutStatus.PLATFORM_HELD,
        snapshotCurrency: 'USD',
        captures: [
          {
            id: captureId,
            paypalCaptureId: 'CAP-PAYPAL-1',
            status: CaptureStatus.COMPLETED,
            grossAmount: new Prisma.Decimal('1000.00'),
          },
        ],
        refunds: [],
        milestone: {
          id: 'm-1',
          projectId: '11111111-1111-1111-1111-111111111111',
          project: {
            id: '11111111-1111-1111-1111-111111111111',
            createdById: 'user-owner',
            clientId: 'user-client',
            members: [{ userId: 'user-owner', role: ProjectMemberRole.OWNER }],
          },
        },
      });

      // No prior refund with this key
      (prisma.paymentRefund.findUnique as any).mockResolvedValue(null);

      // Pending reservation
      (prisma.paymentRefund.create as any).mockResolvedValue({
        id: '55555555-5555-5555-5555-555555555555',
        paymentId,
        captureId,
        idempotencyKey: refundKey,
        status: RefundStatus.PENDING,
        grossAmount: new Prisma.Decimal('250.00'),
        currency: 'USD',
      });

      // Confirmation
      (prisma.paymentRefund.update as any).mockResolvedValue({
        id: '55555555-5555-5555-5555-555555555555',
        paymentId,
        captureId,
        status: RefundStatus.COMPLETED,
        grossAmount: new Prisma.Decimal('250.00'),
        paypalRefundId: 'REF-MOCK-123',
      });

      (prisma.payment.update as any).mockResolvedValue({
        id: paymentId,
        status: PaymentStatus.PARTIALLY_REFUNDED,
        settledAmount: new Prisma.Decimal('1000.00'),
        refundedAmount: new Prisma.Decimal('250.00'),
      });

      const res = await request(app)
        .post(`/api/payments/${paymentId}/refund`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          captureId,
          grossAmount: 250.0,
          reason: 'Partial deliverable adjustment',
          idempotencyKey: refundKey,
        });

      expect(res.status).toBe(200);
      expect(res.body.isRetry).toBe(false);
      expect(res.body.refund.status).toBe(RefundStatus.COMPLETED);
    });

    it('rejects refund when grossAmount exceeds capture balance headroom', async () => {
      const paymentId = '33333333-3333-3333-3333-333333333333';
      const captureId = '44444444-4444-4444-4444-444444444444';

      (prisma.payment.findUnique as any).mockResolvedValue({
        id: paymentId,
        status: PaymentStatus.PAID,
        snapshotCurrency: 'USD',
        captures: [
          {
            id: captureId,
            paypalCaptureId: 'CAP-1',
            status: CaptureStatus.COMPLETED,
            grossAmount: new Prisma.Decimal('500.00'),
          },
        ],
        refunds: [
          {
            id: 'prior-ref',
            captureId,
            status: RefundStatus.COMPLETED,
            grossAmount: new Prisma.Decimal('400.00'),
          },
        ],
        milestone: {
          project: {
            id: '11111111-1111-1111-1111-111111111111',
            createdById: 'user-owner',
            members: [{ userId: 'user-owner', role: ProjectMemberRole.OWNER }],
          },
        },
      });

      (prisma.paymentRefund.findUnique as any).mockResolvedValue(null);

      // Attempt to refund $200 when only $100 headroom remains ($500 - $400)
      const res = await request(app)
        .post(`/api/payments/${paymentId}/refund`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          captureId,
          grossAmount: 200.0,
          idempotencyKey: 'refund-excess-headroom',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('exceeds remaining capture balance');
    });

    it('returns existing refund idempotently on repeated invocation', async () => {
      const paymentId = '33333333-3333-3333-3333-333333333333';
      const captureId = '44444444-4444-4444-4444-444444444444';
      const existingRefundKey = 'idemp-duplicate-test';

      // Existing refund with this idempotency key
      (prisma.paymentRefund.findUnique as any).mockResolvedValue({
        id: 'existing-ref-id',
        paymentId,
        captureId,
        idempotencyKey: existingRefundKey,
        status: RefundStatus.COMPLETED,
        grossAmount: new Prisma.Decimal('150.00'),
      });

      // Role check for payment
      (prisma.payment.findUnique as any).mockResolvedValue({
        id: paymentId,
        milestone: {
          project: {
            id: '11111111-1111-1111-1111-111111111111',
            createdById: 'user-owner',
            members: [{ userId: 'user-owner', role: ProjectMemberRole.OWNER }],
          },
        },
      });

      const res = await request(app)
        .post(`/api/payments/${paymentId}/refund`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          captureId,
          grossAmount: 150.0,
          idempotencyKey: existingRefundKey,
        });

      expect(res.status).toBe(200);
      expect(res.body.isRetry).toBe(true);
      expect(res.body.refund.id).toBe('existing-ref-id');
    });
  });

  describe('PayPalService Credential Validation (isConfigured)', () => {
    it('correctly validates configured status against empty, whitespace, and template placeholders', async () => {
      const { PayPalService } = await vi.importActual<any>('../src/services/paypal.service');
      const service = new PayPalService();

      // Placeholder credentials
      service.clientId = 'your_paypal_sandbox_client_id';
      service.clientSecret = 'your_paypal_sandbox_client_secret';
      expect(service.isConfigured()).toBe(false);

      // Empty / whitespace
      service.clientId = '   ';
      service.clientSecret = 'valid_secret';
      expect(service.isConfigured()).toBe(false);

      service.clientId = 'valid_client_id';
      service.clientSecret = '';
      expect(service.isConfigured()).toBe(false);

      // Example template
      service.clientId = 'example_client';
      service.clientSecret = 'example_secret';
      expect(service.isConfigured()).toBe(false);

      // Valid sandbox / production credentials
      service.clientId = 'A21AAH_TEST_CLIENT_ID_XYZ123';
      service.clientSecret = 'ELq_TEST_SECRET_ABC789';
      expect(service.isConfigured()).toBe(true);
    });
  });
});
