import { Router } from 'express';
import { ProjectMemberRole } from '@prisma/client';
import { authenticate } from '../../middleware/auth';
import { requireMilestoneRole, requireProjectRole } from '../../middleware/projectAuth';
import { aiController } from './ai.controller';

// Router for Milestone AI Intelligence endpoints (/api/milestones/:id/ai)
const milestoneAIRouter = Router({ mergeParams: true });

milestoneAIRouter.post(
  '/pipeline',
  authenticate,
  requireMilestoneRole([
    ProjectMemberRole.OWNER,
    ProjectMemberRole.CLIENT,
    ProjectMemberRole.LEAD_DEVELOPER,
    ProjectMemberRole.MEMBER,
  ]),
  aiController.runMilestonePipeline
);

milestoneAIRouter.post(
  '/evidence-analysis',
  authenticate,
  requireMilestoneRole([
    ProjectMemberRole.OWNER,
    ProjectMemberRole.CLIENT,
    ProjectMemberRole.LEAD_DEVELOPER,
    ProjectMemberRole.MEMBER,
  ]),
  aiController.runEvidenceAnalysis
);

milestoneAIRouter.post(
  '/verify',
  authenticate,
  requireMilestoneRole([
    ProjectMemberRole.OWNER,
    ProjectMemberRole.CLIENT,
    ProjectMemberRole.LEAD_DEVELOPER,
    ProjectMemberRole.MEMBER,
  ]),
  aiController.runMilestoneVerification
);

milestoneAIRouter.post(
  '/risk-analysis',
  authenticate,
  requireMilestoneRole([
    ProjectMemberRole.OWNER,
    ProjectMemberRole.CLIENT,
    ProjectMemberRole.LEAD_DEVELOPER,
    ProjectMemberRole.MEMBER,
  ]),
  aiController.runRiskDetection
);

milestoneAIRouter.post(
  '/payment-readiness',
  authenticate,
  requireMilestoneRole([
    ProjectMemberRole.OWNER,
    ProjectMemberRole.CLIENT,
    ProjectMemberRole.LEAD_DEVELOPER,
    ProjectMemberRole.MEMBER,
  ]),
  aiController.runPaymentCoordination
);

milestoneAIRouter.get(
  '/results',
  authenticate,
  requireMilestoneRole([
    ProjectMemberRole.OWNER,
    ProjectMemberRole.CLIENT,
    ProjectMemberRole.LEAD_DEVELOPER,
    ProjectMemberRole.MEMBER,
    ProjectMemberRole.VIEWER,
  ]),
  aiController.getMilestoneVerificationResults
);

// Router for Project AI Intelligence endpoints (/api/projects/:id/ai)
const projectAIRouter = Router({ mergeParams: true });

projectAIRouter.post(
  '/monitoring',
  authenticate,
  requireProjectRole([
    ProjectMemberRole.OWNER,
    ProjectMemberRole.CLIENT,
    ProjectMemberRole.LEAD_DEVELOPER,
    ProjectMemberRole.MEMBER,
  ]),
  aiController.runProjectMonitoring
);

projectAIRouter.get(
  '/monitoring',
  authenticate,
  requireProjectRole([
    ProjectMemberRole.OWNER,
    ProjectMemberRole.CLIENT,
    ProjectMemberRole.LEAD_DEVELOPER,
    ProjectMemberRole.MEMBER,
    ProjectMemberRole.VIEWER,
  ]),
  aiController.getProjectMonitoringResults
);

export { milestoneAIRouter, projectAIRouter };

// Frontend compatibility router: /api/ai/verify/:milestoneId
export const aiCompatibilityRouter = Router();

aiCompatibilityRouter.post(
  '/verify/:id',
  authenticate,
  requireMilestoneRole([
    ProjectMemberRole.OWNER,
    ProjectMemberRole.CLIENT,
    ProjectMemberRole.LEAD_DEVELOPER,
    ProjectMemberRole.MEMBER,
  ]),
  aiController.runMilestoneVerification
);

aiCompatibilityRouter.post(
  '/verify/:milestoneId',
  authenticate,
  requireMilestoneRole([
    ProjectMemberRole.OWNER,
    ProjectMemberRole.CLIENT,
    ProjectMemberRole.LEAD_DEVELOPER,
    ProjectMemberRole.MEMBER,
  ]),
  aiController.runMilestoneVerification
);

