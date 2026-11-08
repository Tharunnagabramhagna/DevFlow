import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { Prisma, PaymentStatus, PaymentPayoutStatus, CaptureStatus, RefundStatus } from '@prisma/client';
import { app } from '../src/app';
import { prisma } from '../src/config/database';
import { paypalService } from '../src/services/paypal.service';
import { paymentsService } from '../src/modules/payments/payments.service';
import { aiOrchestrator } from '../src/modules/ai/ai.orchestrator';
import { AgentType } from '../src/modules/ai/ai.schema';
import { BaseAIAgent } from '../src/modules/ai/agents/base.agent';
import { z } from 'zod';

vi.mock('../src/config/database', () => {
  const mockPrisma: any = {
    payment: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
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
    verificationResult: {
      upsert: vi.fn(),
    },
    aIAnalysis: {
      create: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $transaction: vi.fn((callback) => callback(mockPrisma)),
  };
  return { prisma: mockPrisma };
});

describe('Phase 7: System Reliability & Fault Tolerance Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Database Resilience & Health Probes', () => {
    it('returns HTTP 503 degraded when database connection probe fails without crashing service', async () => {
      (prisma.$queryRaw as any).mockRejectedValueOnce(new Error('Connection terminated unexpectedly'));

      const res = await request(app).get('/api/health');

      expect(res.status).toBe(503);
      expect(res.body.status).toBe('degraded');
      expect(res.body.database.status).toBe('disconnected');
      expect(res.body.database.error).toBe('Connection terminated unexpectedly');
    });
  });

  describe('PayPal External Provider Failure & Two-Phase Recovery', () => {
    it('marks payment FAILED and releases locks if external PayPal invoice call times out', async () => {
      const milestoneId = '11111111-1111-1111-1111-111111111111';

      (prisma.milestone.findUnique as any).mockResolvedValue({
        id: milestoneId,
        title: 'Mission Critical Module',
        paymentAmount: new Prisma.Decimal('5000.00'),
        currency: 'USD',
        project: {
          id: 'proj-1',
          createdById: 'owner-id',
          createdBy: { email: 'owner@example.com' },
          client: { email: 'client@example.com', name: 'Client' },
          members: [{ userId: 'owner-id', role: 'OWNER' }],
        },
      });

      (prisma.payment.findFirst as any).mockResolvedValue(null);
      (prisma.payment.count as any).mockResolvedValue(0);

      (prisma.payment.create as any).mockResolvedValue({
        id: 'pay-fail-test',
        milestoneId,
        createdById: 'owner-id',
        status: PaymentStatus.CREATING,
        snapshotAmount: new Prisma.Decimal('5000.00'),
        snapshotCurrency: 'USD',
      });

      // Simulate PayPal REST endpoint throwing a network timeout
      vi.spyOn(paypalService, 'createInvoice').mockRejectedValueOnce(new Error('ETIMEDOUT: PayPal gateway unresponsive'));

      (prisma.payment.update as any).mockResolvedValue({
        id: 'pay-fail-test',
        status: PaymentStatus.FAILED,
        errorMessage: 'ETIMEDOUT: PayPal gateway unresponsive',
      });

      await expect(
        paymentsService.createInvoice('owner-id', { milestoneId })
      ).rejects.toThrow('ETIMEDOUT: PayPal gateway unresponsive');

      // Verify payment was marked FAILED in DB to prevent stuck CREATING state
      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pay-fail-test' },
          data: expect.objectContaining({
            status: PaymentStatus.FAILED,
            errorMessage: 'ETIMEDOUT: PayPal gateway unresponsive',
          }),
        })
      );
    });

    it('marks pending refund FAILED and restores headroom if external PayPal refund fails', async () => {
      const paymentId = 'pay-refund-fail';
      const captureId = 'cap-refund-fail';

      (prisma.paymentRefund.findUnique as any).mockResolvedValue(null);

      (prisma.payment.findUnique as any).mockResolvedValue({
        id: paymentId,
        snapshotCurrency: 'USD',
        captures: [
          {
            id: captureId,
            paypalCaptureId: 'CAP-LIVE',
            status: CaptureStatus.COMPLETED,
            grossAmount: new Prisma.Decimal('1000.00'),
          },
        ],
        refunds: [],
        milestone: {
          project: {
            id: 'proj-1',
            createdById: 'owner-id',
            members: [{ userId: 'owner-id', role: 'OWNER' }],
          },
        },
      });

      (prisma.paymentRefund.create as any).mockResolvedValue({
        id: 'ref-fail-id',
        paymentId,
        captureId,
        status: RefundStatus.PENDING,
        grossAmount: new Prisma.Decimal('500.00'),
      });

      // Simulate PayPal refund endpoint rejecting with 500
      vi.spyOn(paypalService, 'refundCapture').mockRejectedValueOnce(new Error('INTERNAL_SERVER_ERROR from PayPal'));

      (prisma.paymentRefund.update as any).mockResolvedValue({
        id: 'ref-fail-id',
        status: RefundStatus.FAILED,
      });

      (prisma.payment.update as any).mockResolvedValue({
        id: paymentId,
        status: PaymentStatus.PAID,
      });

      await expect(
        paymentsService.createRefund('owner-id', 'CLIENT' as any, paymentId, {
          captureId,
          grossAmount: 500,
          idempotencyKey: 'idemp-fail-key',
        })
      ).rejects.toThrow('INTERNAL_SERVER_ERROR from PayPal');

      // Ensure reservation was released to FAILED
      expect(prisma.paymentRefund.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ref-fail-id' },
          data: { status: RefundStatus.FAILED },
        })
      );
    });
  });

  describe('AI Orchestrator Resilience & Dynamic Fallback', () => {
    it('transparently recovers from primary AI provider failure using configured secondary fallback', async () => {
      const failingPrimary = {
        name: 'failing-primary',
        generateStructured: vi
          .fn()
          .mockRejectedValueOnce(new Error('503 Service Unavailable: Gemini overloaded')),
      };

      const healthyFallback = {
        name: 'healthy-fallback',
        generateStructured: vi.fn().mockResolvedValue({
          data: { analysisResult: 'fallback_success', score: 92 },
          modelName: 'healthy-fallback',
          latencyMs: 12,
          rawResponse: '{"analysisResult":"fallback_success","score":92}',
        }),
      };

      class ResilienceAgent extends BaseAIAgent<any, any> {
        readonly agentType = AgentType.EVIDENCE_ANALYSIS;
        readonly name = 'Resilience Test Agent';
        readonly description = 'Tests dynamic fallback';
        protected buildSystemInstruction() { return 'Resilience directive'; }
        protected buildPrompt() { return 'Evaluate evidence'; }
        protected getOutputSchema() {
          return z.object({ analysisResult: z.string(), score: z.number() });
        }
      }

      const agent = new ResilienceAgent();

      (aiOrchestrator as any).primaryProvider = failingPrimary;
      (aiOrchestrator as any).fallbackProvider = healthyFallback;

      const result = await aiOrchestrator.executeWithRetry(agent, { sample: 'data' }, 2);

      expect(result).toBeDefined();
      expect(result.data.analysisResult).toBe('fallback_success');
      expect(result.data.score).toBe(92);
      expect(failingPrimary.generateStructured).toHaveBeenCalledTimes(1);
      expect(healthyFallback.generateStructured).toHaveBeenCalledTimes(1);
    });
  });
});
