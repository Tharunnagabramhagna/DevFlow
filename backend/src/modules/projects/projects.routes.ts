import { Router } from 'express';
import { ProjectMemberRole } from '@prisma/client';
import { authenticate } from '../../middleware/auth';
import { requireProjectRole } from '../../middleware/projectAuth';
import { validateBody, validateQuery } from '../../middleware/validate';
import { projectsController } from './projects.controller';
import {
  CreateProjectSchema,
  UpdateProjectSchema,
  ProjectQuerySchema,
  InviteMemberSchema,
  UpdateMemberRoleSchema,
} from './projects.schema';

const router = Router();

// Project Collection CRUD
router.post(
  '/',
  authenticate,
  validateBody(CreateProjectSchema),
  projectsController.createProject
);

router.get(
  '/',
  authenticate,
  validateQuery(ProjectQuerySchema),
  projectsController.getProjects
);

// Individual Project Operations
router.get(
  '/:id',
  authenticate,
  projectsController.getProjectById
);

router.patch(
  '/:id',
  authenticate,
  requireProjectRole([ProjectMemberRole.OWNER]),
  validateBody(UpdateProjectSchema),
  projectsController.updateProject
);

router.delete(
  '/:id',
  authenticate,
  requireProjectRole([ProjectMemberRole.OWNER]),
  projectsController.deleteProject
);

// Project Member Management
router.get(
  '/:id/members',
  authenticate,
  requireProjectRole([
    ProjectMemberRole.OWNER,
    ProjectMemberRole.CLIENT,
    ProjectMemberRole.LEAD_DEVELOPER,
    ProjectMemberRole.MEMBER,
    ProjectMemberRole.VIEWER,
  ]),
  projectsController.getMembers
);

router.patch(
  '/:id/members/:userId',
  authenticate,
  requireProjectRole([ProjectMemberRole.OWNER]),
  validateBody(UpdateMemberRoleSchema),
  projectsController.updateMemberRole
);

router.delete(
  '/:id/members/:userId',
  authenticate,
  projectsController.removeMember
);

// Project Invitations
router.post(
  '/:id/invitations',
  authenticate,
  requireProjectRole([ProjectMemberRole.OWNER]),
  validateBody(InviteMemberSchema),
  projectsController.inviteMember
);

router.get(
  '/:id/invitations',
  authenticate,
  requireProjectRole([ProjectMemberRole.OWNER]),
  projectsController.getProjectInvitations
);

router.delete(
  '/:id/invitations/:invitationId',
  authenticate,
  requireProjectRole([ProjectMemberRole.OWNER]),
  projectsController.cancelInvitation
);

// Project Activity Log
router.get(
  '/:id/activity',
  authenticate,
  requireProjectRole([
    ProjectMemberRole.OWNER,
    ProjectMemberRole.CLIENT,
    ProjectMemberRole.LEAD_DEVELOPER,
    ProjectMemberRole.MEMBER,
    ProjectMemberRole.VIEWER,
  ]),
  projectsController.getProjectActivities
);

export const projectsRouter = router;

