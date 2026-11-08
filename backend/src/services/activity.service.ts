import { Prisma, ActivityAction } from '@prisma/client';
import { prisma } from '../config/database';
import logger from '../utils/logger';

export interface LogActivityParams {
  projectId: string;
  userId?: string | null;
  action: ActivityAction;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown> | Prisma.InputJsonValue;
}

export class ActivityService {
  /**
   * Logs a project activity. Can accept a transaction client `tx` or use root `prisma`.
   */
  async logActivity(
    params: LogActivityParams,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const db = tx || prisma;
    try {
      await db.activityLog.create({
        data: {
          projectId: params.projectId,
          userId: params.userId || null,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          details: (params.details as Prisma.InputJsonValue) || {},
        },
      });
    } catch (err) {
      // Activity logging should not fail critical business transactions if called standalone
      logger.error('Failed to write activity log', { params, error: err });
      if (tx) {
        throw err;
      }
    }
  }

  /**
   * Retrieves paginated activity logs for a project.
   */
  async getProjectActivities(
    projectId: string,
    options: {
      page?: number;
      limit?: number;
      action?: ActivityAction;
      entityType?: string;
    } = {}
  ) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ActivityLogWhereInput = {
      projectId,
      ...(options.action ? { action: options.action } : {}),
      ...(options.entityType ? { entityType: options.entityType } : {}),
    };

    const [total, activities] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
              role: true,
            },
          },
        },
      }),
    ]);

    return {
      items: activities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const activityService = new ActivityService();

