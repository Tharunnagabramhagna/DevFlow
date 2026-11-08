import { Prisma, Milestone, MilestoneStatus, ActivityAction, NotificationType, Role } from '@prisma/client';
import { prisma } from '../../config/database';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../utils/errors';
import { generateSecureToken } from '../../utils/crypto';
import { activityService } from '../../services/activity.service';
import { notificationService } from '../../services/notification.service';
import {
  CreateMilestoneInput,
  UpdateMilestoneInput,
  ReviewMilestoneInput,
  MilestoneQueryInput,
} from './milestones.schema';

export class MilestonesService {
  /**
   * Creates a new milestone for a project.
   */
  async createMilestone(actorId: string, projectId: string, input: CreateMilestoneInput): Promise<Milestone> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });

    if (!project) {
      throw new NotFoundError(`Project with ID ${projectId} not found`);
    }

    // Validate assigned developer is a member if provided
    if (input.assignedDeveloperId) {
      const isMember = project.members.some((m) => m.userId === input.assignedDeveloperId);
      const isCreator = project.createdById === input.assignedDeveloperId;
      if (!isMember && !isCreator) {
        throw new BadRequestError('Assigned developer must be an active member of this project');
      }
    }

    const publicToken = generateSecureToken(16);

    return await prisma.$transaction(async (tx) => {
      const milestone = await tx.milestone.create({
        data: {
          projectId,
          title: input.title,
          description: input.description,
          requirements: input.requirements,
          paymentAmount: new Prisma.Decimal(input.paymentAmount),
          currency: input.currency || 'USD',
          dueDate: input.dueDate,
          assignedDeveloperId: input.assignedDeveloperId,
          orderIndex: input.orderIndex,
          publicToken,
          status: MilestoneStatus.PENDING,
        },
      });

      await activityService.logActivity(
        {
          projectId,
          userId: actorId,
          action: ActivityAction.MILESTONE_CREATED,
          entityType: 'MILESTONE',
          entityId: milestone.id,
          details: { title: milestone.title, paymentAmount: input.paymentAmount },
        },
        tx
      );

      return milestone;
    });
  }

  /**
   * Retrieves all milestones for a project with query filtering.
   */
  async getProjectMilestones(projectId: string, query?: MilestoneQueryInput) {
    const where: Prisma.MilestoneWhereInput = {
      projectId,
      ...(query?.status ? { status: query.status } : {}),
      ...(query?.assignedDeveloperId ? { assignedDeveloperId: query.assignedDeveloperId } : {}),
    };

    const milestones = await prisma.milestone.findMany({
      where,
      orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
      include: {
        assignedDeveloper: { select: { id: true, name: true, email: true, avatarUrl: true } },
        submittedBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
        _count: {
          select: {
            evidence: true,
            approvals: true,
          },
        },
      },
    });

    return milestones;
  }

  /**
   * Retrieves all milestones accessible to the user across projects.
   */
  async getUserMilestones(userId: string, role: Role, query?: MilestoneQueryInput) {
    const where: Prisma.MilestoneWhereInput = {
      ...(query?.status ? { status: query.status } : {}),
      ...(query?.assignedDeveloperId ? { assignedDeveloperId: query.assignedDeveloperId } : {}),
    };

    if (role !== Role.ADMIN) {
      where.project = {
        isArchived: false,
        OR: [
          { createdById: userId },
          { clientId: userId },
          { leadDeveloperId: userId },
          { members: { some: { userId } } },
        ],
      };
    }

    const milestones = await prisma.milestone.findMany({
      where,
      orderBy: [{ orderIndex: 'asc' }, { createdAt: 'desc' }],
      include: {
        assignedDeveloper: { select: { id: true, name: true, email: true, avatarUrl: true } },
        submittedBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
        _count: {
          select: {
            evidence: true,
            approvals: true,
          },
        },
      },
    });

    return milestones;
  }

  /**
   * Retrieves a single milestone with complete evidence and approval history.
   */
  async getMilestoneById(milestoneId: string) {
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            createdById: true,
            clientId: true,
            leadDeveloperId: true,
          },
        },
        assignedDeveloper: { select: { id: true, name: true, email: true, avatarUrl: true } },
        submittedBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
        evidence: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
          include: {
            uploadedBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        approvals: {
          orderBy: { createdAt: 'desc' },
          include: {
            approvedBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
      },
    });

    if (!milestone) {
      throw new NotFoundError(`Milestone with ID ${milestoneId} not found`);
    }

    return milestone;
  }

  /**
   * Updates milestone attributes.
   */
  async updateMilestone(
    actorId: string,
    milestoneId: string,
    input: UpdateMilestoneInput
  ): Promise<Milestone> {
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { project: { include: { members: true } } },
    });

    if (!milestone) {
      throw new NotFoundError(`Milestone with ID ${milestoneId} not found`);
    }

    if (milestone.status === MilestoneStatus.PAID) {
      throw new BadRequestError('Cannot modify a milestone that has already been paid');
    }

    if (milestone.status === MilestoneStatus.APPROVED && input.paymentAmount !== undefined) {
      throw new BadRequestError('Cannot change payment amount on an approved milestone');
    }

    // Validate assigned developer if updated
    if (input.assignedDeveloperId) {
      const isMember = milestone.project.members.some((m) => m.userId === input.assignedDeveloperId);
      const isCreator = milestone.project.createdById === input.assignedDeveloperId;
      if (!isMember && !isCreator) {
        throw new BadRequestError('Assigned developer must be a member of the project');
      }
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.milestone.update({
        where: { id: milestoneId },
        data: {
          title: input.title,
          description: input.description,
          requirements: input.requirements,
          paymentAmount: input.paymentAmount !== undefined ? new Prisma.Decimal(input.paymentAmount) : undefined,
          currency: input.currency,
          dueDate: input.dueDate,
          assignedDeveloperId: input.assignedDeveloperId,
          orderIndex: input.orderIndex,
          isPubliclyVisible: input.isPubliclyVisible,
          status: input.status,
        },
      });

      await activityService.logActivity(
        {
          projectId: milestone.projectId,
          userId: actorId,
          action: ActivityAction.MILESTONE_UPDATED,
          entityType: 'MILESTONE',
          entityId: milestoneId,
          details: input as Record<string, unknown>,
        },
        tx
      );

      return updated;
    });
  }

  /**
   * Deletes a milestone.
   */
  async deleteMilestone(actorId: string, milestoneId: string): Promise<{ success: boolean }> {
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { payments: true },
    });

    if (!milestone) {
      throw new NotFoundError(`Milestone with ID ${milestoneId} not found`);
    }

    if (milestone.status === MilestoneStatus.PAID || milestone.payments.length > 0) {
      throw new BadRequestError('Cannot delete a milestone with associated financial records');
    }

    await prisma.$transaction(async (tx) => {
      await tx.milestoneApproval.deleteMany({ where: { milestoneId } });
      await tx.evidence.deleteMany({ where: { milestoneId } });
      await tx.milestone.delete({ where: { id: milestoneId } });
    });

    return { success: true };
  }

  /**
   * Submits a milestone for review.
   * Requires at least 1 non-deleted evidence record.
   */
  async submitMilestone(actorId: string, milestoneId: string): Promise<Milestone> {
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        project: true,
        evidence: { where: { isDeleted: false } },
      },
    });

    if (!milestone) {
      throw new NotFoundError(`Milestone with ID ${milestoneId} not found`);
    }

    if (milestone.status === MilestoneStatus.PAID || milestone.status === MilestoneStatus.APPROVED) {
      throw new BadRequestError(`Cannot submit milestone in ${milestone.status} state`);
    }

    if (milestone.evidence.length === 0) {
      throw new BadRequestError('Cannot submit milestone without evidence. Please attach at least one evidence item first.');
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.milestone.update({
        where: { id: milestoneId },
        data: {
          status: MilestoneStatus.EVIDENCE_SUBMITTED,
          submittedAt: new Date(),
          submittedById: actorId,
        },
      });

      // Notify project client or creator
      const recipientId = milestone.project.clientId || milestone.project.createdById;
      if (recipientId && recipientId !== actorId) {
        await notificationService.sendNotification(
          {
            userId: recipientId,
            type: NotificationType.MILESTONE_SUBMITTED,
            title: 'Milestone Submitted for Review',
            message: `Milestone "${milestone.title}" in project "${milestone.project.title}" has been submitted with evidence for your review.`,
            linkUrl: `/projects/${milestone.projectId}/milestones/${milestone.id}`,
          },
          tx
        );
      }

      await activityService.logActivity(
        {
          projectId: milestone.projectId,
          userId: actorId,
          action: ActivityAction.EVIDENCE_SUBMITTED,
          entityType: 'MILESTONE',
          entityId: milestoneId,
          details: { title: milestone.title, evidenceCount: milestone.evidence.length },
        },
        tx
      );

      return updated;
    });
  }

  /**
   * Reviews and approves or rejects a submitted milestone.
   * ENFORCES STRICT ANTI-SELF-APPROVAL / SEPARATION OF DUTIES.
   */
  async reviewMilestone(
    actorId: string,
    milestoneId: string,
    input: ReviewMilestoneInput
  ): Promise<{ milestone: Milestone; approval: any }> {
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        project: true,
      },
    });

    if (!milestone) {
      throw new NotFoundError(`Milestone with ID ${milestoneId} not found`);
    }

    if (milestone.status !== MilestoneStatus.EVIDENCE_SUBMITTED) {
      throw new BadRequestError(`Milestone cannot be reviewed in status '${milestone.status}'. It must be in 'EVIDENCE_SUBMITTED' status.`);
    }

    // STRICT ANTI-SELF-APPROVAL ENFORCEMENT
    // A user cannot approve their own submission under any circumstances
    if (actorId === milestone.submittedById) {
      throw new ForbiddenError(
        'Separation of duties violation: You cannot approve or review a milestone that you submitted yourself',
        undefined,
        'SELF_APPROVAL_PROHIBITED'
      );
    }

    if (actorId === milestone.assignedDeveloperId) {
      throw new ForbiddenError(
        'Separation of duties violation: Assigned developer cannot approve their own milestone',
        undefined,
        'SELF_APPROVAL_PROHIBITED'
      );
    }

    return await prisma.$transaction(async (tx) => {
      // Create approval record
      const approval = await tx.milestoneApproval.create({
        data: {
          milestoneId,
          approvedById: actorId,
          decision: input.decision,
          feedback: input.feedback,
        },
        include: {
          approvedBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      });

      const isApproved = input.decision === 'APPROVED';
      const newStatus = isApproved ? MilestoneStatus.APPROVED : MilestoneStatus.REJECTED;

      const updatedMilestone = await tx.milestone.update({
        where: { id: milestoneId },
        data: {
          status: newStatus,
          approvedAt: isApproved ? new Date() : null,
        },
      });

      // Notify submitter and assigned developer
      const targetUserIds = [milestone.submittedById, milestone.assignedDeveloperId].filter(
        (id): id is string => Boolean(id) && id !== actorId
      );

      const notifType = isApproved ? NotificationType.MILESTONE_APPROVED : NotificationType.MILESTONE_REJECTED;
      const notifTitle = isApproved ? 'Milestone Approved' : 'Milestone Changes Requested';
      const notifMsg = isApproved
        ? `Milestone "${milestone.title}" has been approved!`
        : `Milestone "${milestone.title}" was reviewed and rejected: ${input.feedback || 'Please review feedback and resubmit.'}`;

      await notificationService.sendBatchNotifications(
        targetUserIds,
        {
          type: notifType,
          title: notifTitle,
          message: notifMsg,
          linkUrl: `/projects/${milestone.projectId}/milestones/${milestone.id}`,
        },
        tx
      );

      await activityService.logActivity(
        {
          projectId: milestone.projectId,
          userId: actorId,
          action: isApproved ? ActivityAction.MILESTONE_APPROVED : ActivityAction.MILESTONE_REJECTED,
          entityType: 'MILESTONE',
          entityId: milestoneId,
          details: { decision: input.decision, feedback: input.feedback },
        },
        tx
      );

      return {
        milestone: updatedMilestone,
        approval,
      };
    });
  }
}

export const milestonesService = new MilestonesService();

