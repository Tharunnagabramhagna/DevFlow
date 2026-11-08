import { Request, Response, NextFunction } from 'express';
import { ProjectMemberRole, Role, ProjectMember, Project, Milestone, Evidence, Payment } from '@prisma/client';
import { prisma } from '../config/database';
import { UnauthorizedError, ForbiddenError, NotFoundError, BadRequestError } from '../utils/errors';

declare global {
  namespace Express {
    interface Request {
      project?: Project;
      projectMember?: ProjectMember;
      milestone?: Milestone;
      evidence?: Evidence;
      payment?: Payment;
    }
  }
}

/**
 * Project-level RBAC guard validating that the authenticated user possesses an allowed project role.
 * - Global ADMIN role bypasses project membership checks.
 * - Project creator (createdById) is treated as having OWNER permissions.
 * - Project members are verified against their assigned ProjectMemberRole.
 */
export const requireProjectRole = (allowedRoles: ProjectMemberRole[]) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required to access project resources');
      }

      // Global ADMIN bypass
      if (req.user.role === Role.ADMIN) {
        return next();
      }

      const projectId = req.params.projectId || req.params.id;
      if (!projectId) {
        throw new BadRequestError('Project identifier is required');
      }

      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw new NotFoundError(`Project with ID ${projectId} not found`);
      }

      req.project = project;

      // Project creator is considered OWNER
      if (project.createdById === req.user.id && allowedRoles.includes(ProjectMemberRole.OWNER)) {
        return next();
      }

      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: req.user.id,
          },
        },
      });

      if (!member || !allowedRoles.includes(member.role)) {
        throw new ForbiddenError(
          `Access denied. Requires one of the following project roles: [${allowedRoles.join(', ')}]`,
          undefined,
          'INSUFFICIENT_PROJECT_ROLE'
        );
      }

      req.projectMember = member;
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Milestone-level RBAC guard that resolves milestone's parent project and enforces project roles.
 */
export const requireMilestoneRole = (allowedRoles: ProjectMemberRole[]) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required to access milestone');
      }

      const milestoneId = req.params.milestoneId || req.params.id;
      if (!milestoneId) {
        throw new BadRequestError('Milestone identifier is required');
      }

      const milestone = await prisma.milestone.findUnique({
        where: { id: milestoneId },
        include: { project: true },
      });

      if (!milestone) {
        throw new NotFoundError(`Milestone with ID ${milestoneId} not found`);
      }

      req.milestone = milestone;
      req.project = milestone.project;

      // Global ADMIN bypass
      if (req.user.role === Role.ADMIN) {
        return next();
      }

      // Project creator is OWNER
      if (milestone.project.createdById === req.user.id && allowedRoles.includes(ProjectMemberRole.OWNER)) {
        return next();
      }

      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: milestone.projectId,
            userId: req.user.id,
          },
        },
      });

      if (!member || !allowedRoles.includes(member.role)) {
        throw new ForbiddenError(
          `Access denied. Requires one of the following project roles: [${allowedRoles.join(', ')}]`,
          undefined,
          'INSUFFICIENT_PROJECT_ROLE'
        );
      }

      req.projectMember = member;
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Evidence-level RBAC guard that resolves evidence -> milestone -> project and enforces project roles.
 */
export const requireEvidenceRole = (allowedRoles: ProjectMemberRole[]) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required to access evidence');
      }

      const evidenceId = req.params.evidenceId || req.params.id;
      if (!evidenceId) {
        throw new BadRequestError('Evidence identifier is required');
      }

      const evidence = await prisma.evidence.findUnique({
        where: { id: evidenceId },
        include: {
          milestone: {
            include: { project: true },
          },
        },
      });

      if (!evidence || evidence.isDeleted) {
        throw new NotFoundError(`Evidence with ID ${evidenceId} not found`);
      }

      req.evidence = evidence;
      req.milestone = evidence.milestone;
      req.project = evidence.milestone.project;

      // Global ADMIN bypass
      if (req.user.role === Role.ADMIN) {
        return next();
      }

      // Project creator is OWNER
      if (evidence.milestone.project.createdById === req.user.id && allowedRoles.includes(ProjectMemberRole.OWNER)) {
        return next();
      }

      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: evidence.milestone.projectId,
            userId: req.user.id,
          },
        },
      });

      if (!member || !allowedRoles.includes(member.role)) {
        throw new ForbiddenError(
          `Access denied. Requires one of the following project roles: [${allowedRoles.join(', ')}]`,
          undefined,
          'INSUFFICIENT_PROJECT_ROLE'
        );
      }

      req.projectMember = member;
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Payment-level RBAC guard that resolves payment -> milestone -> project and enforces project roles.
 */
export const requirePaymentRole = (allowedRoles: ProjectMemberRole[]) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required to access payment');
      }

      const paymentId = req.params.paymentId || req.params.id;
      if (!paymentId) {
        throw new BadRequestError('Payment identifier is required');
      }

      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          milestone: {
            include: { project: true },
          },
        },
      });

      if (!payment) {
        throw new NotFoundError(`Payment with ID ${paymentId} not found`);
      }

      req.payment = payment;
      req.milestone = payment.milestone;
      req.project = payment.milestone.project;

      // Global ADMIN bypass
      if (req.user.role === Role.ADMIN) {
        return next();
      }

      // Project creator is OWNER
      if (payment.milestone.project.createdById === req.user.id && allowedRoles.includes(ProjectMemberRole.OWNER)) {
        return next();
      }

      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: payment.milestone.projectId,
            userId: req.user.id,
          },
        },
      });

      if (!member || !allowedRoles.includes(member.role)) {
        throw new ForbiddenError(
          `Access denied. Requires one of the following project roles: [${allowedRoles.join(', ')}]`,
          undefined,
          'INSUFFICIENT_PROJECT_ROLE'
        );
      }

      req.projectMember = member;
      next();
    } catch (err) {
      next(err);
    }
  };
};
