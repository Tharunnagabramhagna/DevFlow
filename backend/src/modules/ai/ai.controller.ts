import { Request, Response, NextFunction } from 'express';
import { aiOrchestrator } from './ai.orchestrator';
import { AgentType, ExecuteAgentOptionsSchema } from './ai.schema';
import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError } from '../../utils/errors';

export class AIController {
  /**
   * Triggers the full 4-agent verification pipeline on a milestone.
   */
  async runMilestonePipeline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const milestoneId = req.params.milestoneId || req.params.id;
      const options = ExecuteAgentOptionsSchema.parse(req.body || {});

      const result = await aiOrchestrator.runMilestonePipeline(milestoneId, req.user!.id, options);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Executes only Agent 1: Evidence Analysis Agent on a milestone.
   */
  async runEvidenceAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const milestoneId = req.params.milestoneId || req.params.id;
      const milestone = await prisma.milestone.findUnique({
        where: { id: milestoneId },
        include: { evidence: { where: { isDeleted: false } } },
      });

      if (!milestone) throw new NotFoundError(`Milestone ${milestoneId} not found`);
      if (milestone.evidence.length === 0) throw new BadRequestError('Milestone has no attached evidence');

      const agent = aiOrchestrator.getAgent(AgentType.EVIDENCE_ANALYSIS);
      const result = await aiOrchestrator.executeWithRetry(agent, {
        milestoneTitle: milestone.title,
        milestoneDescription: milestone.description,
        milestoneRequirements: milestone.requirements,
        evidenceItems: milestone.evidence,
      });

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Executes only Agent 2: Milestone Verification Agent on a milestone.
   */
  async runMilestoneVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const milestoneId = req.params.milestoneId || req.params.id;
      const milestone = await prisma.milestone.findUnique({
        where: { id: milestoneId },
        include: { evidence: { where: { isDeleted: false } } },
      });

      if (!milestone) throw new NotFoundError(`Milestone ${milestoneId} not found`);

      const agent = aiOrchestrator.getAgent(AgentType.MILESTONE_VERIFICATION);
      const result = await aiOrchestrator.executeWithRetry(agent, {
        milestoneTitle: milestone.title,
        milestoneDescription: milestone.description,
        requirements: milestone.requirements,
        evidenceItems: milestone.evidence,
      });

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Executes only Agent 3: Risk Detection Agent on a milestone.
   */
  async runRiskDetection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const milestoneId = req.params.milestoneId || req.params.id;
      const milestone = await prisma.milestone.findUnique({
        where: { id: milestoneId },
        include: {
          project: { include: { activityLogs: { take: 10, orderBy: { createdAt: 'desc' } } } },
        },
      });

      if (!milestone) throw new NotFoundError(`Milestone ${milestoneId} not found`);

      const agent = aiOrchestrator.getAgent(AgentType.RISK_DETECTION);
      const result = await aiOrchestrator.executeWithRetry(agent, {
        projectTitle: milestone.project.title,
        milestoneTitle: milestone.title,
        milestoneDueDate: milestone.dueDate,
        milestoneAmount: Number(milestone.paymentAmount),
        projectBudget: milestone.project.budget ? Number(milestone.project.budget) : null,
        milestoneStatus: milestone.status,
        recentActivitySummary: milestone.project.activityLogs,
      });

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Executes only Agent 5: Payment Coordination Agent on a milestone.
   */
  async runPaymentCoordination(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const milestoneId = req.params.milestoneId || req.params.id;
      const milestone = await prisma.milestone.findUnique({
        where: { id: milestoneId },
        include: {
          project: true,
          verificationResult: true,
          payments: true,
        },
      });

      if (!milestone) throw new NotFoundError(`Milestone ${milestoneId} not found`);

      const agent = aiOrchestrator.getAgent(AgentType.PAYMENT_COORDINATION);
      const result = await aiOrchestrator.executeWithRetry(agent, {
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
        milestoneStatus: milestone.status,
        milestoneAmount: Number(milestone.paymentAmount),
        milestoneCurrency: milestone.currency,
        projectBudget: milestone.project.budget ? Number(milestone.project.budget) : null,
        projectCurrency: milestone.project.currency,
        verificationStatus: milestone.verificationResult?.status,
        verificationScore: milestone.verificationResult?.overallScore,
        existingPaymentsCount: milestone.payments.length,
      });

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves stored verification analysis for a milestone.
   */
  async getMilestoneVerificationResults(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const milestoneId = req.params.milestoneId || req.params.id;
      const results = await aiOrchestrator.getMilestoneVerificationResults(milestoneId);
      res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Executes Agent 4: Project Monitoring Agent across a full project.
   */
  async runProjectMonitoring(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params.projectId || req.params.id;
      const options = ExecuteAgentOptionsSchema.parse(req.body || {});

      const result = await aiOrchestrator.runProjectMonitoring(projectId, req.user!.id, options);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves latest project monitoring analysis.
   */
  async getProjectMonitoringResults(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params.projectId || req.params.id;
      const results = await aiOrchestrator.getProjectMonitoringResults(projectId);
      res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  }
}

export const aiController = new AIController();

