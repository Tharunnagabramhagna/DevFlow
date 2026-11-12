import { z } from 'zod';
import { BaseAIAgent } from './base.agent';
import { AgentType, ProjectMonitoringOutput, ProjectMonitoringOutputSchema } from '../ai.schema';
import { PromptSanitizer } from '../promptSanitizer';
import {
  formatGitHubAIContextText,
  SanitizedGitHubRepositoryContext,
} from '../../github/github-sync.helper';

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
  repositoryEvidence?: SanitizedGitHubRepositoryContext | null;
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
      `4. Produce an executive summary for stakeholders with concrete recommended actions, incorporating synced GitHub repository activity when provided without fabricating unrecorded commits or PRs.`,
      ``,
      `OUTPUT FORMAT DIRECTIVE:`,
      `You MUST respond strictly with a valid JSON object matching this structure:`,
      `{`,
      `  "projectHealth": "EXCELLENT" | "GOOD" | "AT_RISK" | "CRITICAL",`,
      `  "completionPercentage": number (0-100),`,
      `  "milestonesSummary": {`,
      `    "total": number,`,
      `    "pending": number,`,
      `    "inProgress": number,`,
      `    "submitted": number,`,
      `    "approved": number,`,
      `    "paid": number,`,
      `    "overdue": number`,
      `  },`,
      `  "bottlenecks": [`,
      `    {`,
      `      "area": string,`,
      `      "severity": "LOW" | "MEDIUM" | "HIGH",`,
      `      "description": string,`,
      `      "suggestedAction": string`,
      `    }`,
      `  ],`,
      `  "overdueMilestones": [`,
      `    {`,
      `      "id": string,`,
      `      "title": string,`,
      `      "dueDate": string (optional),`,
      `      "daysOverdue": number`,
      `    }`,
      `  ],`,
      `  "executiveSummary": string,`,
      `  "recommendedActions": [string]`,
      `}`,
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
      `Synced GitHub Repository Evidence:`,
      formatGitHubAIContextText(input.repositoryEvidence),
      ``,
      `Provide a comprehensive status assessment and summary.`,
    ].join('\n');
  }

  protected getOutputSchema(): z.ZodSchema<ProjectMonitoringOutput> {
    return ProjectMonitoringOutputSchema;
  }
}

