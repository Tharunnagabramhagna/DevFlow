import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../../services/notification.service';

export class NotificationsController {
  async getUserNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const isRead = req.query.isRead !== undefined ? req.query.isRead === 'true' : undefined;

      const result = await notificationService.getUserNotifications(req.user!.id, {
        page,
        limit,
        isRead,
      });

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const count = await notificationService.getUnreadCount(req.user!.id);
      res.status(200).json({ unreadCount: count });
    } catch (err) {
      next(err);
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await notificationService.markAsRead(req.user!.id, req.params.id);
      res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  }

  async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updatedCount = await notificationService.markAllAsRead(req.user!.id);
      res.status(200).json({ success: true, updatedCount });
    } catch (err) {
      next(err);
    }
  }
}

export const notificationsController = new NotificationsController();

