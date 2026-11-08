import { Router } from 'express';
import { ProjectMemberRole } from '@prisma/client';
import { authenticate } from '../../middleware/auth';
import { requireProjectRole, requireMilestoneRole } from '../../middleware/projectAuth';
import { validateBody, validateQuery } from '../../middleware/validate';
import { milestonesController } from './milestones.controller';
import {
  CreateMilestoneSchema,
  UpdateMilestoneSchema,
  ReviewMilestoneSchema,
  MilestoneQuerySchema,
} from './milestones.schema';

// Router for /api/milestones
const milestonesRouter = Router();

// List user accessible milestones across projects (frontend compatibility)
milestonesRouter.get(
  '/',
  authenticate,
  validateQuery(MilestoneQuerySchema),
  milestonesController.getUserMilestones
);

milestonesRouter.get(
  '/:id',
  authenticate,
  requireMilestoneRole([
    ProjectMemberRole.OWNER,
    ProjectMemberRole.CLIENT,
    ProjectMemberRole.LEAD_DEVELOPER,
    ProjectMemberRole.MEMBER,
    ProjectMemberRole.VIEWER,
  ]),
  milestonesController.getMilestoneById
);

milestonesRouter.patch(
  '/:id',
  authenticate,
  requireMilestoneRole([ProjectMemberRole.OWNER, ProjectMemberRole.CLIENT]),
  validateBody(UpdateMilestoneSchema),
  milestonesController.updateMilestone
);

milestonesRouter.delete(
  '/:id',
  authenticate,
  requireMilestoneRole([ProjectMemberRole.OWNER]),
  milestonesController.deleteMilestone
);

milestonesRouter.post(
  '/:id/submit',
  authenticate,
  requireMilestoneRole([
    ProjectMemberRole.OWNER,
    ProjectMemberRole.LEAD_DEVELOPER,
    ProjectMemberRole.MEMBER,
  ]),
  milestonesController.submitMilestone
);

milestonesRouter.post(
  '/:id/review',
  authenticate,
  requireMilestoneRole([ProjectMemberRole.OWNER, ProjectMemberRole.CLIENT]),
  validateBody(ReviewMilestoneSchema),
  milestonesController.reviewMilestone
);

// Frontend compatibility alias: POST /api/milestones/:id/approval
milestonesRouter.post(
  '/:id/approval',
  authenticate,
  requireMilestoneRole([ProjectMemberRole.OWNER, ProjectMemberRole.CLIENT]),
  async (req, res, next) => {
    if (req.body?.status) {
      req.body.decision = req.body.status === 'approved' ? 'APPROVED' : 'REJECTED';
    }
    return milestonesController.reviewMilestone(req, res, next);
  }
);

// Router for /api/projects/:projectId/milestones (mounted in app or nested)
const projectMilestonesRouter = Router({ mergeParams: true });

projectMilestonesRouter.post(
  '/',
  authenticate,
  requireProjectRole([ProjectMemberRole.OWNER, ProjectMemberRole.CLIENT]),
  validateBody(CreateMilestoneSchema),
  milestonesController.createMilestone
);

projectMilestonesRouter.get(
  '/',
  authenticate,
  requireProjectRole([
    ProjectMemberRole.OWNER,
    ProjectMemberRole.CLIENT,
    ProjectMemberRole.LEAD_DEVELOPER,
    ProjectMemberRole.MEMBER,
    ProjectMemberRole.VIEWER,
  ]),
  validateQuery(MilestoneQuerySchema),
  milestonesController.getProjectMilestones
);

export { milestonesRouter, projectMilestonesRouter };

