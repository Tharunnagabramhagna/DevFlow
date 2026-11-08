import { VerificationStatus, ActivityAction, NotificationType } from '@prisma/client';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AgentType, ExecuteAgentOptions } from './ai.schema';
import { IAIProvider } from './providers/ai.provider.interface';
import { MockAIProvider } from './providers/mock.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { BaseAIAgent } from './agents/base.agent';
import { EvidenceAnalysisAgent } from './agents/evidenceAnalysis.agent';
import { MilestoneVerificationAgent } from './agents/milestoneVerification.agent';
import { RiskDetectionAgent } from './agents/riskDetection.agent';
import { ProjectMonitoringAgent } from './agents/projectMonitoring.agent';
import { PaymentCoordinationAgent } from './agents/paymentCoordination.agent';
import { activityService } from '../../services/activity.service';
import { notificationService } from '../../services/notification.service';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import logger from '../../utils/logger';

export class AIOrchestrationService {
  private primaryProvider: IAIProvider;
  private fallbackProvider: IAIProvider;
  private agents: Map<AgentType, BaseAIAgent<any, any>> = new Map();

  // In-memory cache for recent executions to prevent duplicate rapid executions (2 minutes TTL)
  private recentExecutionCache: Map<string, { timestamp: number; data: any }> = new Map();

  constructor() {
    this.fallbackProvider = new MockAIProvider();

    if (env.AI_PROVIDER === 'gemini' && env.GEMINI_API_KEY) {
      this.primaryProvider = new GeminiProvider(env.GEMINI_API_KEY, env.AI_MODEL);
    } else {
      this.primaryProvider = this.fallbackProvider;
    }

    this.registerDefaultAgents();
  }

  private registerDefaultAgents(): void {
    this.registerAgent(new EvidenceAnalysisAgent());
    this.registerAgent(new MilestoneVerificationAgent());
    this.registerAgent(new RiskDetectionAgent());
    this.registerAgent(new ProjectMonitoringAgent());
    this.registerAgent(new PaymentCoordinationAgent());
  }

  registerAgent(agent: BaseAIAgent<any, any>): void {
    this.agents.set(agent.agentType, agent);
    logger.debug(`Registered AI agent: ${agent.name} (${agent.agentType})`);
  }

  getAgent(agentType: AgentType): BaseAIAgent<any, any> {
    const agent = this.agents.get(agentType);
    if (!agent) {
      throw new BadRequestError(`AI Agent not registered for type: ${agentType}`);
    }
    return agent;
  }

  /**
   * Executes an agent with automated retry and fallback.
   */
  async executeWithRetry<TInput, TOutput>(
    agent: BaseAIAgent<TInput, TOutput>,
    input: TInput,
    retries = env.AI_MAX_RETRIES || 2
  ) {
    let lastError: Error | null = null;
    let currentProvider = this.primaryProvider;

    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        return await agent.run(input, currentProvider);
      } catch (err: any) {
        lastError = err;
        logger.warn(
          `AI Agent [${agent.agentType}] attempt ${attempt} failed on provider [${currentProvider.name}]: ${err.message}`
        );

        // Switch to fallback mock provider on failure if not already using it
        if (currentProvider !== this.fallbackProvider) {
          logger.info(`Switching Agent [${agent.agentType}] to fallback provider [${this.fallbackProvider.name}]`);
          currentProvider = this.fallbackProvider;
        }

        // Backoff delay before retry
        if (attempt <= retries) {
          const delay = Math.pow(2, attempt) * 200;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error(`AI Agent [${agent.agentType}] execution failed after retries`);
  }

  /**
   * Runs the full multi-agent verification pipeline on a submitted milestone.
   */
  async runMilestonePipeline(
    milestoneId: string,
    actorId: string,
    options: ExecuteAgentOptions = { async: false, forceRefresh: false }
  ) {
    const cacheKey = `milestone:${milestoneId}:pipeline`;

    if (!options.forceRefresh) {
      const cached = this.recentExecutionCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 2 * 60 * 1000) {
        logger.info(`Returning cached AI analysis for milestone ${milestoneId}`);
        return cached.data;
      }
    }

    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        project: {
          include: {
            activityLogs: { take: 10, orderBy: { createdAt: 'desc' } },
          },
        },
        evidence: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!milestone) {
      throw new NotFoundError(`Milestone with ID ${milestoneId} not found`);
    }

    if (milestone.evidence.length === 0) {
      throw new BadRequestError('Cannot run AI verification pipeline on a milestone with no attached evidence.');
    }

    const executeWork = async () => {
      // 1. Evidence Analysis Agent
      const evidenceAgent = this.getAgent(AgentType.EVIDENCE_ANALYSIS);
      const evidenceResult = await this.executeWithRetry(evidenceAgent, {
        milestoneTitle: milestone.title,
        milestoneDescription: milestone.description,
        milestoneRequirements: milestone.requirements,
        evidenceItems: milestone.evidence,
      });

      // 2. Milestone Verification Agent
      const verificationAgent = this.getAgent(AgentType.MILESTONE_VERIFICATION);
      const verificationResult = await this.executeWithRetry(verificationAgent, {
        milestoneTitle: milestone.title,
        milestoneDescription: milestone.description,
        requirements: milestone.requirements,
        evidenceAnalysisFindings: evidenceResult.data,
        evidenceItems: milestone.evidence,
      });

      // 3. Risk Detection Agent
      const riskAgent = this.getAgent(AgentType.RISK_DETECTION);
      const riskResult = await this.executeWithRetry(riskAgent, {
        projectTitle: milestone.project.title,
        milestoneTitle: milestone.title,
        milestoneDueDate: milestone.dueDate,
        milestoneAmount: Number(milestone.paymentAmount),
        projectBudget: milestone.project.budget ? Number(milestone.project.budget) : null,
        milestoneStatus: milestone.status,
        recentActivitySummary: milestone.project.activityLogs,
        evidenceFindings: evidenceResult.data,
        verificationFindings: verificationResult.data,
      });

      // 4. Payment Coordination Agent
      const paymentCoordinationAgent = this.getAgent(AgentType.PAYMENT_COORDINATION);
      const paymentResult = await this.executeWithRetry(paymentCoordinationAgent, {
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
        milestoneStatus: milestone.status,
        milestoneAmount: Number(milestone.paymentAmount),
        milestoneCurrency: milestone.currency,
        projectBudget: milestone.project.budget ? Number(milestone.project.budget) : null,
        projectCurrency: milestone.project.currency,
        verificationStatus: verificationResult.data.verificationStatus,
        verificationScore: verificationResult.data.overallScore,
        existingPaymentsCount: 0,
      });

      // Map verification status
      let dbVerificationStatus: VerificationStatus = VerificationStatus.UNVERIFIED;
      if (verificationResult.data.verificationStatus === 'PASSED') {
        dbVerificationStatus = VerificationStatus.PASSED;
      } else if (verificationResult.data.verificationStatus === 'FAILED') {
        dbVerificationStatus = VerificationStatus.FAILED;
      } else {
        dbVerificationStatus = VerificationStatus.MANUAL_REVIEW_REQUIRED;
      }

      // Persist results atomically in database
      const savedRecord = await prisma.$transaction(async (tx) => {
        // Upsert VerificationResult
        const vr = await tx.verificationResult.upsert({
          where: { milestoneId },
          create: {
            milestoneId,
            status: dbVerificationStatus,
            overallScore: verificationResult.data.overallScore,
            summary: verificationResult.data.summary,
            checklistResults: verificationResult.data.checklistResults,
            riskAssessment: riskResult.data,
            recommendations: verificationResult.data.recommendations,
            modelName: verificationResult.modelName,
          },
          update: {
            status: dbVerificationStatus,
            overallScore: verificationResult.data.overallScore,
            summary: verificationResult.data.summary,
            checklistResults: verificationResult.data.checklistResults,
            riskAssessment: riskResult.data,
            recommendations: verificationResult.data.recommendations,
            modelName: verificationResult.modelName,
            analyzedAt: new Date(),
          },
        });

        // Store individual agent analyses
        await tx.aIAnalysis.createMany({
          data: [
            {
              verificationResultId: vr.id,
              agentType: AgentType.EVIDENCE_ANALYSIS,
              promptTokens: evidenceResult.promptTokens,
              completionTokens: evidenceResult.completionTokens,
              rawResponse: evidenceResult.rawResponse,
            },
            {
              verificationResultId: vr.id,
              agentType: AgentType.MILESTONE_VERIFICATION,
              promptTokens: verificationResult.promptTokens,
              completionTokens: verificationResult.completionTokens,
              rawResponse: verificationResult.rawResponse,
            },
            {
              verificationResultId: vr.id,
              agentType: AgentType.RISK_DETECTION,
              promptTokens: riskResult.promptTokens,
              completionTokens: riskResult.completionTokens,
              rawResponse: riskResult.rawResponse,
            },
            {
              verificationResultId: vr.id,
              agentType: AgentType.PAYMENT_COORDINATION,
              promptTokens: paymentResult.promptTokens,
              completionTokens: paymentResult.completionTokens,
              rawResponse: paymentResult.rawResponse,
            },
          ],
        });

        // Update milestone verificationStatus
        await tx.milestone.update({
          where: { id: milestoneId },
          data: { verificationStatus: dbVerificationStatus },
        });

        // Record activity log
        await activityService.logActivity(
          {
            projectId: milestone.projectId,
            userId: actorId,
            action: ActivityAction.AI_VERIFICATION_COMPLETED,
            entityType: 'MILESTONE_VERIFICATION',
            entityId: vr.id,
            details: {
              status: dbVerificationStatus,
              score: verificationResult.data.overallScore,
              decision: verificationResult.data.advisoryDecision,
            },
          },
          tx
        );

        // Notify client or creator that advisory analysis is ready
        const recipientId = milestone.project.clientId || milestone.project.createdById;
        if (recipientId) {
          await notificationService.sendNotification(
            {
              userId: recipientId,
              type: NotificationType.VERIFICATION_READY,
              title: 'AI Verification Analysis Ready',
              message: `AI analysis for milestone "${milestone.title}" is ready. Verification status: ${dbVerificationStatus} (Score: ${verificationResult.data.overallScore}/100)`,
              linkUrl: `/projects/${milestone.projectId}/milestones/${milestone.id}`,
            },
            tx
          );
        }

        return {
          verificationResult: vr,
          evidenceAnalysis: evidenceResult.data,
          milestoneVerification: verificationResult.data,
          riskDetection: riskResult.data,
          paymentCoordination: paymentResult.data,
        };
      });

      this.recentExecutionCache.set(cacheKey, { timestamp: Date.now(), data: savedRecord });
      return savedRecord;
    };

    if (options.async) {
      // Fire-and-forget in background
      executeWork().catch((err) => {
        logger.error(`Background milestone pipeline failed for ${milestoneId}`, { error: err.message });
      });
      return {
        status: 'PENDING',
        message: 'AI multi-agent verification pipeline initiated in the background.',
        milestoneId,
      };
    }

    return await executeWork();
  }

  /**
   * Executes the Project Monitoring Agent across a full project.
   */
  async runProjectMonitoring(
    projectId: string,
    actorId: string,
    options: ExecuteAgentOptions = { async: false, forceRefresh: false }
  ) {
    const cacheKey = `project:${projectId}:monitoring`;

    if (!options.forceRefresh) {
      const cached = this.recentExecutionCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 2 * 60 * 1000) {
        return cached.data;
      }
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        milestones: {
          orderBy: { orderIndex: 'asc' },
        },
        members: true,
        activityLogs: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!project) {
      throw new NotFoundError(`Project with ID ${projectId} not found`);
    }

    const monitoringAgent = this.getAgent(AgentType.PROJECT_MONITORING);

    const executeWork = async () => {
      const result = await this.executeWithRetry(monitoringAgent, {
        projectId: project.id,
        projectTitle: project.title,
        projectDescription: project.description,
        projectStatus: project.status,
        budget: project.budget ? Number(project.budget) : null,
        currency: project.currency,
        milestones: project.milestones.map((m) => ({
          id: m.id,
          title: m.title,
          status: m.status,
          paymentAmount: Number(m.paymentAmount),
          dueDate: m.dueDate,
          orderIndex: m.orderIndex,
        })),
        membersCount: project.members.length,
        recentActivities: project.activityLogs,
      });

      // Save AIAnalysis record linked to project
      await prisma.aIAnalysis.create({
        data: {
          projectId,
          agentType: AgentType.PROJECT_MONITORING,
          promptTokens: result.promptTokens,
          completionTokens: result.completionTokens,
          rawResponse: result.rawResponse,
        },
      });

      const responsePayload = {
        projectId,
        monitoring: result.data,
        analyzedAt: new Date(),
      };

      this.recentExecutionCache.set(cacheKey, { timestamp: Date.now(), data: responsePayload });
      return responsePayload;
    };

    if (options.async) {
      executeWork().catch((err) => {
        logger.error(`Background project monitoring failed for ${projectId}`, { error: err.message });
      });
      return {
        status: 'PENDING',
        message: 'Project monitoring analysis initiated in background.',
        projectId,
      };
    }

    return await executeWork();
  }

  /**
   * Retrieves latest verification results for a milestone.
   */
  async getMilestoneVerificationResults(milestoneId: string) {
    const result = await prisma.verificationResult.findUnique({
      where: { milestoneId },
      include: {
        analyses: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!result) {
      throw new NotFoundError(`No verification results found for milestone ${milestoneId}`);
    }

    return result;
  }

  /**
   * Retrieves latest project monitoring results.
   */
  async getProjectMonitoringResults(projectId: string) {
    const analysis = await prisma.aIAnalysis.findFirst({
      where: {
        projectId,
        agentType: AgentType.PROJECT_MONITORING,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!analysis || !analysis.rawResponse) {
      throw new NotFoundError(`No project monitoring analysis found for project ${projectId}`);
    }

    return {
      projectId,
      monitoring: JSON.parse(analysis.rawResponse),
      analyzedAt: analysis.createdAt,
    };
  }
}

export const aiOrchestrator = new AIOrchestrationService();
