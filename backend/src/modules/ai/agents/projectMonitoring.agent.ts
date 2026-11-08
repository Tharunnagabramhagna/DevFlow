import { z } from 'zod';
import { BaseAIAgent } from './base.agent';
import { AgentType, ProjectMonitoringOutput, ProjectMonitoringOutputSchema } from '../ai.schema';
import { PromptSanitizer } from '../promptSanitizer';

export interface ProjectMonitoringAgentInput {
  projectId: string;
  projectTitle: string;
  projectDescription?: string | null;
  projectStatus: string;
  budget?: number | null;
  currency: string;
  milestones: Array<{
    id: string;
    title: string;
    status: string;
    paymentAmount: number;
    dueDate?: Date | string | null;
    orderIndex: number;
  }>;
  membersCount: number;
  recentActivities?: Array<{
    action: string;
    createdAt: Date | string;
  }>;
}

export class ProjectMonitoringAgent extends BaseAIAgent<
  ProjectMonitoringAgentInput,
  ProjectMonitoringOutput
> {
  readonly agentType = AgentType.PROJECT_MONITORING;
  readonly name = 'Project Monitoring Agent';
  readonly description = 'Monitors cross-milestone progress, bottlenecks, timeline adherence, and project health.';

  protected buildSystemInstruction(): string {
    return [
      `You are the DevFlow Project Monitoring Agent (Agent 4 of 5).`,
      `Your purpose is to monitor full project execution health across all milestones and activity streams.`,
      `Evaluate:`,
      `1. Overall completion percentage and project health category (EXCELLENT, GOOD, AT_RISK, CRITICAL).`,
      `2. Milestones breakdown: pending, in-progress, submitted, approved, paid, and overdue.`,
      `3. Bottlenecks: Highlight tasks stalled in review, unassigned milestones, or overdue delivery.`,
      `4. Produce an executive summary for stakeholders with concrete recommended actions.`,
    ].join('\n');
  }

  protected buildPrompt(input: ProjectMonitoringAgentInput): string {
    const now = new Date();
    const formattedMilestones = input.milestones
      .map((m, idx) => {
        const isOverdue = m.dueDate && new Date(m.dueDate) < now && m.status !== 'APPROVED' && m.status !== 'PAID';
        return `Milestone ${idx + 1} (ID: ${m.id}): "${m.title}" - Status: ${m.status}, Amount: $${m.paymentAmount}, Due: ${
          m.dueDate ? new Date(m.dueDate).toISOString() : 'None'
        } ${isOverdue ? '[OVERDUE]' : ''}`;
      })
      .join('\n');

    const activitySummary = (input.recentActivities || [])
      .slice(0, 8)
      .map((a) => `- [${new Date(a.createdAt).toISOString()}] ${a.action}`)
      .join('\n');

    const untrustedData = [
      `Project Title: ${input.projectTitle}`,
      input.projectDescription ? `Description: ${input.projectDescription}` : '',
      `Status: ${input.projectStatus}`,
      `Budget: ${input.budget ? `$${input.budget} ${input.currency}` : 'Unspecified'}`,
      `Members Count: ${input.membersCount}`,
      ``,
      `Milestones List (${input.milestones.length} total):`,
      formattedMilestones || 'No milestones created yet.',
      ``,
      `Recent Activities:`,
      activitySummary || 'No recent activity.',
    ].join('\n');

    return [
      `Analyze the overall project health and execution status:`,
      PromptSanitizer.wrapUntrustedContent(untrustedData, 'project_monitoring_data'),
      ``,
      `Provide a comprehensive status assessment and summary.`,
    ].join('\n');
  }

  protected getOutputSchema(): z.ZodSchema<ProjectMonitoringOutput> {
    return ProjectMonitoringOutputSchema;
  }
}

