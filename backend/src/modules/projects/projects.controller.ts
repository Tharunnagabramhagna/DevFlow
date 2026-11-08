import { Request, Response, NextFunction } from 'express';
import { ProjectMemberRole } from '@prisma/client';
import { projectsService } from './projects.service';
import { activityService } from '../../services/activity.service';
import { ForbiddenError } from '../../utils/errors';

export class ProjectsController {
  async createProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await projectsService.createProject(req.user!.id, req.body);
      res.status(201).json(project);
    } catch (err) {
      next(err);
    }
  }

  async getProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await projectsService.getProjects(req.user!.id, req.user!.role, req.query as any);
      const urlHasPagination = req.url.includes('page=') || req.url.includes('limit=') || req.url.includes('envelope=true');
      if (urlHasPagination) {
        res.status(200).json(result);
        return;
      }
      res.status(200).json(result.items);
    } catch (err) {
      next(err);
    }
  }

  async getProjectById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await projectsService.getProjectById(req.user!.id, req.user!.role, req.params.id);
      res.status(200).json(project);
    } catch (err) {
      next(err);
    }
  }

  async updateProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await projectsService.updateProject(req.user!.id, req.params.id, req.body);
      res.status(200).json(project);
    } catch (err) {
      next(err);
    }
  }

  async deleteProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await projectsService.deleteProject(req.user!.id, req.params.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const members = await projectsService.getMembers(req.params.id);
      res.status(200).json(members);
    } catch (err) {
      next(err);
    }
  }

  async updateMemberRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const member = await projectsService.updateMemberRole(
        req.user!.id,
        req.params.id,
        req.params.userId,
        req.body.role
      );
      res.status(200).json(member);
    } catch (err) {
      next(err);
    }
  }

  async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetUserId = req.params.userId;
      const isSelf = req.user!.id === targetUserId;
      const isAdmin = req.user!.role === 'ADMIN';
      const isOwner = req.projectMember?.role === ProjectMemberRole.OWNER || req.project?.createdById === req.user!.id;

      if (!isSelf && !isAdmin && !isOwner) {
        throw new ForbiddenError('You can only remove yourself, or you must be an OWNER/ADMIN to remove members');
      }

      const result = await projectsService.removeMember(req.user!.id, req.params.id, targetUserId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async inviteMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await projectsService.inviteMember(req.user!.id, req.params.id, req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getProjectInvitations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const invitations = await projectsService.getProjectInvitations(req.params.id);
      res.status(200).json(invitations);
    } catch (err) {
      next(err);
    }
  }

  async cancelInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await projectsService.cancelInvitation(req.params.id, req.params.invitationId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getProjectActivities(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const activities = await activityService.getProjectActivities(req.params.id, req.query as any);
      res.status(200).json(activities);
    } catch (err) {
      next(err);
    }
  }
}

export const projectsController = new ProjectsController();

