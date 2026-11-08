import { Request, Response, NextFunction } from 'express';
import { invitationsService } from './invitations.service';

export class InvitationsController {
  async getUserInvitations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const invitations = await invitationsService.getUserInvitations(req.user!.email);
      res.status(200).json(invitations);
    } catch (err) {
      next(err);
    }
  }

  async acceptInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.params.token;
      const result = await invitationsService.acceptInvitation(req.user!.id, token);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async declineInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.params.token;
      const result = await invitationsService.declineInvitation(req.user!.id, token);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const invitationsController = new InvitationsController();

