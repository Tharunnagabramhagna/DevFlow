import { describe, it, expect } from 'vitest';
import { MockAIProvider } from '../src/modules/ai/providers/mock.provider';
import { EvidenceAnalysisAgent } from '../src/modules/ai/agents/evidenceAnalysis.agent';
import { MilestoneVerificationAgent } from '../src/modules/ai/agents/milestoneVerification.agent';
import { RiskDetectionAgent } from '../src/modules/ai/agents/riskDetection.agent';
import { ProjectMonitoringAgent } from '../src/modules/ai/agents/projectMonitoring.agent';
import { PaymentCoordinationAgent } from '../src/modules/ai/agents/paymentCoordination.agent';
import { AgentType } from '../src/modules/ai/ai.schema';

describe('Phase 4: Five Specialized AI Agents Suite', () => {
  const provider = new MockAIProvider();

  describe('Agent 1: Evidence Analysis Agent', () => {
    it('analyzes submitted evidence and produces structured scores and findings', async () => {
      const agent = new EvidenceAnalysisAgent();
      expect(agent.agentType).toBe(AgentType.EVIDENCE_ANALYSIS);

      const result = await agent.run(
        {
          milestoneTitle: 'Payment Gateway Integration',
          milestoneDescription: 'Integrate PayPal orders API',
          milestoneRequirements: ['PayPal SDK initialized', 'Webhook handler tested'],
          evidenceItems: [
            {
              id: 'ev-1',
              type: 'GITHUB_COMMIT',
              title: 'feat: add paypal client',
              githubCommitSha: 'a1b2c3d4e5f6789012345678901234567890abcd',
            },
            {
              id: 'ev-2',
              type: 'FILE',
              title: 'test_report.pdf',
              fileName: 'test_report.pdf',
              fileSize: 45000,
              mimeType: 'application/pdf',
            },
          ],
        },
        provider
      );

      expect(result.data.relevanceScore).toBeGreaterThanOrEqual(0);
      expect(result.data.relevanceScore).toBeLessThanOrEqual(100);
      expect(result.data.findings.length).toBeGreaterThan(0);
      expect(Array.isArray(result.data.recommendations)).toBe(true);
      expect(result.agentName).toBe('Evidence Analysis Agent');
    });
  });

  describe('Agent 2: Milestone Verification Agent', () => {
    it('compares evidence against checklist requirements and provides advisory decision', async () => {
      const agent = new MilestoneVerificationAgent();
      expect(agent.agentType).toBe(AgentType.MILESTONE_VERIFICATION);

      const result = await agent.run(
        {
          milestoneTitle: 'Database Migrations & Models',
          requirements: ['Prisma schema valid', 'PostgreSQL migration applied'],
          evidenceItems: [
            {
              id: 'ev-1',
              type: 'GITHUB_PR',
              title: 'PR #12: Database migrations',
              githubPrNumber: 12,
            },
          ],
        },
        provider
      );

      expect(['PASSED', 'FAILED', 'MANUAL_REVIEW_REQUIRED']).toContain(result.data.verificationStatus);
      expect(result.data.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.data.checklistResults.length).toBeGreaterThan(0);
      expect(['RECOMMEND_APPROVAL', 'RECOMMEND_REJECTION', 'MANUAL_REVIEW_REQUIRED']).toContain(
        result.data.advisoryDecision
      );
      expect(typeof result.data.summary).toBe('string');
    });
  });

  describe('Agent 3: Risk Detection Agent', () => {
    it('evaluates delivery, technical, and financial risks with categorized severity', async () => {
      const agent = new RiskDetectionAgent();
      expect(agent.agentType).toBe(AgentType.RISK_DETECTION);

      const result = await agent.run(
        {
          projectTitle: 'E-Commerce Platform',
          milestoneTitle: 'Sprint 2: Checkout Engine',
          milestoneAmount: 3000,
          projectBudget: 10000,
          milestoneStatus: 'IN_PROGRESS',
          milestoneDueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          recentActivitySummary: [
            { action: 'MILESTONE_CREATED', createdAt: new Date() },
          ],
        },
        provider
      );

      expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(result.data.overallRiskLevel);
      expect(result.data.deliveryRisk).toBeDefined();
      expect(result.data.technicalRisk).toBeDefined();
      expect(result.data.financialRisk).toBeDefined();
      expect(Array.isArray(result.data.mitigationStrategies)).toBe(true);
    });
  });

  describe('Agent 4: Project Monitoring Agent', () => {
    it('monitors cross-milestone progress, overdue items, and executive summary', async () => {
      const agent = new ProjectMonitoringAgent();
      expect(agent.agentType).toBe(AgentType.PROJECT_MONITORING);

      const result = await agent.run(
        {
          projectId: 'proj-123',
          projectTitle: 'DevFlow Hackathon Project',
          projectStatus: 'ACTIVE',
          budget: 8000,
          currency: 'USD',
          milestones: [
            { id: 'm-1', title: 'Milestone 1', status: 'PAID', paymentAmount: 2000, orderIndex: 1 },
            { id: 'm-2', title: 'Milestone 2', status: 'IN_PROGRESS', paymentAmount: 3000, orderIndex: 2 },
          ],
          membersCount: 3,
        },
        provider
      );

      expect(['EXCELLENT', 'GOOD', 'AT_RISK', 'CRITICAL']).toContain(result.data.projectHealth);
      expect(result.data.completionPercentage).toBeGreaterThanOrEqual(0);
      expect(result.data.completionPercentage).toBeLessThanOrEqual(100);
      expect(result.data.milestonesSummary.total).toBeGreaterThanOrEqual(1);
      expect(typeof result.data.executiveSummary).toBe('string');
      expect(Array.isArray(result.data.recommendedActions)).toBe(true);
    });
  });

  describe('Agent 5: Payment Coordination Agent', () => {
    it('produces payment readiness advisory and enforces isAdvisoryOnly: true', async () => {
      const agent = new PaymentCoordinationAgent();
      expect(agent.agentType).toBe(AgentType.PAYMENT_COORDINATION);

      const result = await agent.run(
        {
          milestoneId: 'ms-verified-1',
          milestoneTitle: 'Frontend & API Final Delivery',
          milestoneStatus: 'APPROVED',
          milestoneAmount: 2500,
          milestoneCurrency: 'USD',
          projectBudget: 5000,
          projectCurrency: 'USD',
          verificationStatus: 'PASSED',
          verificationScore: 95,
          existingPaymentsCount: 0,
        },
        provider
      );

      expect(typeof result.data.isPaymentReady).toBe('boolean');
      expect(result.data.readinessScore).toBeGreaterThanOrEqual(0);
      expect(result.data.amount).toBe(2500);
      expect(result.data.currency).toBe('USD');
      // SECURITY DIRECTIVE: Must be strictly advisory
      expect(result.data.isAdvisoryOnly).toBe(true);
      expect(Array.isArray(result.data.prerequisitesMet)).toBe(true);
    });
  });
});

