import { Request, Response, NextFunction } from 'express';
import { milestonesService } from './milestones.service';
import { assertVerifiedUser } from '../../middleware/auth';

export class MilestonesController {
  async createMilestone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params.projectId || req.params.id;
      const milestone = await milestonesService.createMilestone(req.user!.id, projectId, req.body);
      res.status(201).json(milestone);
    } catch (err) {
      next(err);
    }
  }

  async getProjectMilestones(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params.projectId || req.params.id;
      const milestones = await milestonesService.getProjectMilestones(projectId, req.query as any);
      res.status(200).json(milestones);
    } catch (err) {
      next(err);
    }
  }

  async getUserMilestones(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = assertVerifiedUser(req);
      const milestones = await milestonesService.getUserMilestones(user.id, user.role, req.query as any);
      res.status(200).json(milestones);
    } catch (err) {
      next(err);
    }
  }

  async getMilestoneById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const milestone = await milestonesService.getMilestoneById(req.params.id);
      res.status(200).json(milestone);
    } catch (err) {
      next(err);
    }
  }

  async updateMilestone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const milestone = await milestonesService.updateMilestone(req.user!.id, req.params.id, req.body);
      res.status(200).json(milestone);
    } catch (err) {
      next(err);
    }
  }

  async deleteMilestone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await milestonesService.deleteMilestone(req.user!.id, req.params.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async submitMilestone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = assertVerifiedUser(req);
      const milestone = await milestonesService.submitMilestone(user.id, req.params.id, user.role);
      res.status(200).json(milestone);
    } catch (err) {
      next(err);
    }
  }

  async reviewMilestone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = assertVerifiedUser(req);
      const result = await milestonesService.reviewMilestone(user.id, req.params.id, req.body, user.role);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const milestonesController = new MilestonesController();

