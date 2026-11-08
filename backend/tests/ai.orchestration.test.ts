import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VerificationStatus } from '@prisma/client';
import { prisma } from '../src/config/database';
import { aiOrchestrator } from '../src/modules/ai/ai.orchestrator';
import { AgentType } from '../src/modules/ai/ai.schema';
import { BaseAIAgent } from '../src/modules/ai/agents/base.agent';
import { z } from 'zod';

vi.mock('../src/config/database', () => {
  const mockPrisma: any = {
    milestone: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
    },
    verificationResult: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
    aIAnalysis: {
      create: vi.fn(),
      createMany: vi.fn(),
      findFirst: vi.fn(),
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

describe('Phase 4: AI Orchestration & Multi-Agent Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Milestone Verification Pipeline', () => {
    it('executes full 4-agent pipeline and persists VerificationResult and AIAnalysis records', async () => {
      (prisma.milestone.findUnique as any).mockResolvedValue({
        id: 'ms-pipe-1',
        title: 'Authentication Module',
        description: 'Implement JWT and OAuth',
        requirements: ['JWT token rotation', 'GitHub OAuth flow'],
        paymentAmount: 1500,
        currency: 'USD',
        status: 'EVIDENCE_SUBMITTED',
        dueDate: new Date(Date.now() + 100000),
        project: {
          id: 'proj-1',
          title: 'DevFlow API',
          budget: 5000,
          currency: 'USD',
          createdById: 'owner-1',
          clientId: 'client-1',
          activityLogs: [],
        },
        evidence: [
          {
            id: 'ev-1',
            type: 'GITHUB_COMMIT',
            title: 'OAuth commit',
            githubCommitSha: '1234567890abcdef1234567890abcdef12345678',
            isDeleted: false,
          },
        ],
      });

      (prisma.verificationResult.upsert as any).mockResolvedValue({
        id: 'vr-1',
        milestoneId: 'ms-pipe-1',
        status: VerificationStatus.PASSED,
        overallScore: 95,
      });

      const result = await aiOrchestrator.runMilestonePipeline('ms-pipe-1', 'client-1', {
        forceRefresh: true,
      });

      expect(result.verificationResult).toBeDefined();
      expect(result.evidenceAnalysis).toBeDefined();
      expect(result.milestoneVerification).toBeDefined();
      expect(result.riskDetection).toBeDefined();
      expect(result.paymentCoordination).toBeDefined();

      expect(prisma.verificationResult.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { milestoneId: 'ms-pipe-1' },
          create: expect.objectContaining({
            milestoneId: 'ms-pipe-1',
            status: VerificationStatus.PASSED,
          }),
        })
      );

      expect(prisma.aIAnalysis.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ agentType: AgentType.EVIDENCE_ANALYSIS }),
          expect.objectContaining({ agentType: AgentType.MILESTONE_VERIFICATION }),
          expect.objectContaining({ agentType: AgentType.RISK_DETECTION }),
          expect.objectContaining({ agentType: AgentType.PAYMENT_COORDINATION }),
        ]),
      });

      expect(prisma.milestone.update).toHaveBeenCalledWith({
        where: { id: 'ms-pipe-1' },
        data: { verificationStatus: VerificationStatus.PASSED },
      });

      expect(prisma.activityLog.create).toHaveBeenCalled();
      expect(prisma.notification.create).toHaveBeenCalled();
    });

    it('rejects pipeline execution on milestone with zero evidence', async () => {
      (prisma.milestone.findUnique as any).mockResolvedValue({
        id: 'ms-empty',
        title: 'Empty Milestone',
        evidence: [], // Zero evidence!
        project: { id: 'proj-1' },
      });

      await expect(
        aiOrchestrator.runMilestonePipeline('ms-empty', 'client-1', { forceRefresh: true })
      ).rejects.toThrow('Cannot run AI verification pipeline on a milestone with no attached evidence');
    });

    it('returns PENDING response immediately when async: true is requested', async () => {
      (prisma.milestone.findUnique as any).mockResolvedValue({
        id: 'ms-async-1',
        title: 'Async Milestone',
        requirements: ['Task 1'],
        paymentAmount: 1000,
        currency: 'USD',
        status: 'EVIDENCE_SUBMITTED',
        project: { id: 'proj-1', title: 'Proj', activityLogs: [] },
        evidence: [{ id: 'ev-1', isDeleted: false, type: 'TEXT_NOTE', title: 'Note' }],
      });

      (prisma.verificationResult.upsert as any).mockResolvedValue({ id: 'vr-async' });

      const res = await aiOrchestrator.runMilestonePipeline('ms-async-1', 'client-1', {
        async: true,
        forceRefresh: true,
      });

      expect(res.status).toBe('PENDING');
      expect(res.milestoneId).toBe('ms-async-1');
    });
  });

  describe('Project Monitoring Execution', () => {
    it('executes Project Monitoring Agent across full project and stores AIAnalysis', async () => {
      (prisma.project.findUnique as any).mockResolvedValue({
        id: 'proj-mon-1',
        title: 'Active Platform',
        status: 'ACTIVE',
        budget: 10000,
        currency: 'USD',
        milestones: [
          { id: 'm-1', title: 'M1', status: 'APPROVED', paymentAmount: 2000, orderIndex: 1 },
          { id: 'm-2', title: 'M2', status: 'PENDING', paymentAmount: 3000, orderIndex: 2 },
        ],
        members: [{ id: 'pm-1' }, { id: 'pm-2' }],
        activityLogs: [],
      });

      (prisma.aIAnalysis.create as any).mockResolvedValue({
        id: 'ai-mon-1',
        projectId: 'proj-mon-1',
        agentType: AgentType.PROJECT_MONITORING,
      });

      const result = await aiOrchestrator.runProjectMonitoring('proj-mon-1', 'user-1', {
        forceRefresh: true,
      });

      expect(result.projectId).toBe('proj-mon-1');
      expect(result.monitoring).toBeDefined();
      expect(result.monitoring.projectHealth).toBeDefined();

      expect(prisma.aIAnalysis.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          projectId: 'proj-mon-1',
          agentType: AgentType.PROJECT_MONITORING,
        }),
      });
    });
  });

  describe('Retry & Fallback Resilience', () => {
    it('switches to fallback provider and retries if primary provider throws', async () => {
      const failingProvider = {
        name: 'failing-primary',
        generateStructured: vi
          .fn()
          .mockRejectedValueOnce(new Error('Network connection timeout'))
          .mockResolvedValueOnce({
            data: { result: 'recovered' },
            modelName: 'mock-fallback',
            latencyMs: 10,
            rawResponse: '{"result":"recovered"}',
          }),
      };

      class TestAgent extends BaseAIAgent<any, any> {
        readonly agentType = AgentType.EVIDENCE_ANALYSIS;
        readonly name = 'Test Resilience Agent';
        readonly description = 'Test';
        protected buildSystemInstruction() { return 'Test'; }
        protected buildPrompt() { return 'Test'; }
        protected getOutputSchema() { return z.object({ result: z.string() }); }
      }

      const agent = new TestAgent();
      
      // Configure primary provider to fail once, falling back to mock provider
      (aiOrchestrator as any).primaryProvider = failingProvider;
      (aiOrchestrator as any).fallbackProvider = {
        name: 'mock-fallback',
        generateStructured: vi.fn().mockResolvedValue({
          data: { result: 'recovered' },
          modelName: 'mock-fallback',
          latencyMs: 10,
          rawResponse: '{"result":"recovered"}',
        }),
      };

      const res = await aiOrchestrator.executeWithRetry(agent, {}, 2);

      expect(res.data.result).toBe('recovered');
      expect(failingProvider.generateStructured).toHaveBeenCalledTimes(1);
    });
  });
});
