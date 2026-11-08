import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { NotificationType, Role } from '@prisma/client';
import { app } from '../src/app';
import { prisma } from '../src/config/database';
import { env } from '../src/config/env';
import { notificationService } from '../src/services/notification.service';

vi.mock('../src/config/database', () => {
  const mockPrisma: any = {
    notification: {
      count: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
  };
  return { prisma: mockPrisma };
});

const generateTestToken = (userId: string, email: string, role: Role = Role.FREELANCER) => {
  return jwt.sign({ sub: userId, email, role }, env.JWT_SECRET, { expiresIn: '1h' });
};

describe('Phase 3: Notifications Service & Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Notification Retrieval', () => {
    it('retrieves paginated notifications for authenticated user', async () => {
      (prisma.notification.count as any).mockResolvedValue(2);
      (prisma.notification.findMany as any).mockResolvedValue([
        {
          id: 'notif-1',
          userId: 'user-1',
          type: NotificationType.MILESTONE_APPROVED,
          title: 'Milestone Approved',
          message: 'Your milestone has been approved',
          isRead: false,
        },
        {
          id: 'notif-2',
          userId: 'user-1',
          type: NotificationType.INVITATION_RECEIVED,
          title: 'New Invitation',
          message: 'You have been invited to a project',
          isRead: true,
        },
      ]);

      const result = await notificationService.getUserNotifications('user-1', { page: 1, limit: 10 });

      expect(result.items).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          skip: 0,
          take: 10,
        })
      );
    });

    it('getUnreadCount returns accurate unread count', async () => {
      (prisma.notification.count as any).mockResolvedValue(5);

      const count = await notificationService.getUnreadCount('user-1');

      expect(count).toBe(5);
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
      });
    });
  });

  describe('Marking Notifications as Read', () => {
    it('markAsRead updates target notification status to isRead: true', async () => {
      (prisma.notification.updateMany as any).mockResolvedValue({ count: 1 });

      await notificationService.markAsRead('user-1', 'notif-1');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId: 'user-1' },
        data: { isRead: true },
      });
    });

    it('markAllAsRead marks all unread notifications as read', async () => {
      (prisma.notification.updateMany as any).mockResolvedValue({ count: 4 });

      const updatedCount = await notificationService.markAllAsRead('user-1');

      expect(updatedCount).toBe(4);
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
        data: { isRead: true },
      });
    });
  });

  describe('HTTP Notification API Endpoints', () => {
    it('GET /api/notifications returns 200 with notification list', async () => {
      const token = generateTestToken('user-1', 'user1@devflow.dev');
      (prisma.notification.count as any).mockResolvedValue(1);
      (prisma.notification.findMany as any).mockResolvedValue([
        {
          id: 'notif-1',
          userId: 'user-1',
          type: NotificationType.MILESTONE_SUBMITTED,
          title: 'Review Required',
          message: 'Milestone submitted for review',
          isRead: false,
        },
      ]);

      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.pagination.total).toBe(1);
    });

    it('GET /api/notifications/unread-count returns unread badge count', async () => {
      const token = generateTestToken('user-1', 'user1@devflow.dev');
      (prisma.notification.count as any).mockResolvedValue(3);

      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.unreadCount).toBe(3);
    });

    it('PATCH /api/notifications/:id/read returns 200', async () => {
      const token = generateTestToken('user-1', 'user1@devflow.dev');
      (prisma.notification.updateMany as any).mockResolvedValue({ count: 1 });

      const res = await request(app)
        .patch('/api/notifications/notif-1/read')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('PATCH /api/notifications/read-all returns 200 with updatedCount', async () => {
      const token = generateTestToken('user-1', 'user1@devflow.dev');
      (prisma.notification.updateMany as any).mockResolvedValue({ count: 2 });

      const res = await request(app)
        .patch('/api/notifications/read-all')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.updatedCount).toBe(2);
    });
  });
});

