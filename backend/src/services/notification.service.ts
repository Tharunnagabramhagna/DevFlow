import { Prisma, NotificationType } from '@prisma/client';
import { prisma } from '../config/database';
import logger from '../utils/logger';

export interface SendNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string | null;
}

export class NotificationService {
  /**
   * Dispatches an in-app notification. Can be run inside an existing transaction `tx`.
   */
  async sendNotification(
    params: SendNotificationParams,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const db = tx || prisma;
    try {
      await db.notification.create({
        data: {
          userId: params.userId,
          type: params.type,
          title: params.title,
          message: params.message,
          linkUrl: params.linkUrl || null,
        },
      });
    } catch (err) {
      logger.error('Failed to create in-app notification', { params, error: err });
      if (tx) {
        throw err;
      }
    }
  }

  /**
   * Dispatches notifications to multiple users simultaneously.
   */
  async sendBatchNotifications(
    userIds: string[],
    params: Omit<SendNotificationParams, 'userId'>,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const uniqueUserIds = Array.from(new Set(userIds)).filter(Boolean);
    if (uniqueUserIds.length === 0) return;

    const db = tx || prisma;
    try {
      await db.notification.createMany({
        data: uniqueUserIds.map((userId) => ({
          userId,
          type: params.type,
          title: params.title,
          message: params.message,
          linkUrl: params.linkUrl || null,
        })),
      });
    } catch (err) {
      logger.error('Failed to create batch in-app notifications', { userIds: uniqueUserIds, error: err });
      if (tx) {
        throw err;
      }
    }
  }

  /**
   * Retrieves paginated notifications for a user.
   */
  async getUserNotifications(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      isRead?: boolean;
    } = {}
  ) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(typeof options.isRead === 'boolean' ? { isRead: options.isRead } : {}),
    };

    const [total, notifications] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Gets unread notifications count for a user.
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  /**
   * Marks a specific notification as read.
   */
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        isRead: true,
      },
    });
  }

  /**
   * Marks all notifications as read for a user.
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
    return result.count;
  }
}

export const notificationService = new NotificationService();

