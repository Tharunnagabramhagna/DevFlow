import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { notificationsController } from './notifications.controller';

const router = Router();

router.get(
  '/',
  authenticate,
  notificationsController.getUserNotifications
);

router.get(
  '/unread-count',
  authenticate,
  notificationsController.getUnreadCount
);

router.patch(
  '/:id/read',
  authenticate,
  notificationsController.markAsRead
);

router.patch(
  '/read-all',
  authenticate,
  notificationsController.markAllAsRead
);

export const notificationsRouter = router;

