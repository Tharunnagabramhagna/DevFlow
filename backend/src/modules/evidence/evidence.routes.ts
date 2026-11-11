import { Router } from 'express';
import { ProjectMemberRole } from '@prisma/client';
import { authenticate, requireNonGuest } from '../../middleware/auth';
import { requireMilestoneRole, requireEvidenceRole } from '../../middleware/projectAuth';
import { evidenceUpload } from '../../services/storage.service';
import { evidenceController } from './evidence.controller';

// Router for /api/evidence
const evidenceRouter = Router();
evidenceRouter.use(authenticate, requireNonGuest);

evidenceRouter.get(
  '/:id',
  authenticate,
  requireEvidenceRole([
    ProjectMemberRole.OWNER,
    ProjectMemberRole.CLIENT,
    ProjectMemberRole.LEAD_DEVELOPER,
    ProjectMemberRole.MEMBER,
    ProjectMemberRole.VIEWER,
  ]),
  evidenceController.getEvidenceById
);

evidenceRouter.get(
  '/:id/download',
  authenticate,
  requireEvidenceRole([
    ProjectMemberRole.OWNER,
    ProjectMemberRole.CLIENT,
    ProjectMemberRole.LEAD_DEVELOPER,
    ProjectMemberRole.MEMBER,
    ProjectMemberRole.VIEWER,
  ]),
  evidenceController.downloadEvidenceFile
);

evidenceRouter.delete(
  '/:id',
  authenticate,
  requireEvidenceRole([
    ProjectMemberRole.OWNER,
    ProjectMemberRole.CLIENT,
    ProjectMemberRole.LEAD_DEVELOPER,
    ProjectMemberRole.MEMBER,
  ]),
  evidenceController.deleteEvidence
);

// Router for /api/milestones/:id/evidence
const milestoneEvidenceRouter = Router({ mergeParams: true });
milestoneEvidenceRouter.use(authenticate, requireNonGuest);

milestoneEvidenceRouter.post(
  '/',
  authenticate,
  requireMilestoneRole([
    ProjectMemberRole.OWNER,
    ProjectMemberRole.LEAD_DEVELOPER,
    ProjectMemberRole.MEMBER,
  ]),
  evidenceUpload.single('file'),
  evidenceController.submitEvidence
);

milestoneEvidenceRouter.get(
  '/',
  authenticate,
  requireMilestoneRole([
    ProjectMemberRole.OWNER,
    ProjectMemberRole.CLIENT,
    ProjectMemberRole.LEAD_DEVELOPER,
    ProjectMemberRole.MEMBER,
    ProjectMemberRole.VIEWER,
  ]),
  evidenceController.getMilestoneEvidence
);

export { evidenceRouter, milestoneEvidenceRouter };

