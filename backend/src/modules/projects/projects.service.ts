import { Prisma, Project, Role, ProjectMemberRole, ProjectStatus, InvitationStatus, ActivityAction, NotificationType } from '@prisma/client';
import { prisma } from '../../config/database';
import { BadRequestError, NotFoundError, ForbiddenError, ConflictError } from '../../utils/errors';
import { generateSecureToken, hashToken } from '../../utils/crypto';
import { activityService } from '../../services/activity.service';
import { notificationService } from '../../services/notification.service';
import {
  CreateProjectInput,
  UpdateProjectInput,
  ProjectQueryInput,
  InviteMemberInput,
} from './projects.schema';

export class ProjectsService {
  /**
   * Creates a new project and atomically adds the creator as an OWNER member.
   */
  async createProject(userId: string, input: CreateProjectInput): Promise<Project> {
    const creator = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, name: true, email: true },
    });

    if (!creator) {
      throw new NotFoundError('Creator user not found');
    }

    // Assign counterparty pointer based on creator's global role
    const isClient = creator.role === Role.CLIENT;
    const clientId = isClient ? creator.id : undefined;
    const leadDeveloperId = !isClient ? creator.id : undefined;

    return await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          title: input.title,
          description: input.description,
          brief: input.brief,
          budget: input.budget ? new Prisma.Decimal(input.budget) : null,
          currency: input.currency || 'USD',
          status: ProjectStatus.DRAFT,
          createdById: creator.id,
          clientId,
          leadDeveloperId,
          githubRepoOwner: input.githubRepoOwner,
          githubRepoName: input.githubRepoName,
        },
      });

      // Atomic creator OWNER membership
      await tx.projectMember.create({
        data: {
          projectId: project.id,
          userId: creator.id,
          role: ProjectMemberRole.OWNER,
        },
      });

      await activityService.logActivity(
        {
          projectId: project.id,
          userId: creator.id,
          action: ActivityAction.PROJECT_CREATED,
          entityType: 'PROJECT',
          entityId: project.id,
          details: { title: project.title, budget: input.budget },
        },
        tx
      );

      return project;
    });
  }

  /**
   * Retrieves paginated projects list belonging to or accessible by the user.
   */
  async getProjects(userId: string, role: Role, query: ProjectQueryInput) {
    const page = Math.max(1, query.page);
    const limit = Math.min(100, Math.max(1, query.limit));
    const skip = (page - 1) * limit;

    const where: Prisma.ProjectWhereInput = {
      isArchived: false,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    // Non-admin users can only view projects they created or belong to as members
    if (role !== Role.ADMIN) {
      where.AND = [
        {
          OR: [
            { createdById: userId },
            { clientId: userId },
            { leadDeveloperId: userId },
            { members: { some: { userId } } },
          ],
        },
      ];
    }

    const orderBy: Prisma.ProjectOrderByWithRelationInput = {
      [query.sortBy]: query.sortOrder,
    };

    const [total, items] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          createdBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
          client: { select: { id: true, name: true, email: true, avatarUrl: true } },
          leadDeveloper: { select: { id: true, name: true, email: true, avatarUrl: true } },
          _count: { select: { members: true, milestones: true } },
        },
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves full project details. Enforces project access control.
   */
  async getProjectById(userId: string, role: Role, projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        createdBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
        client: { select: { id: true, name: true, email: true, avatarUrl: true } },
        leadDeveloper: { select: { id: true, name: true, email: true, avatarUrl: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
          },
        },
        milestones: {
          orderBy: { orderIndex: 'asc' },
          include: {
            assignedDeveloper: { select: { id: true, name: true, email: true, avatarUrl: true } },
            _count: { select: { evidence: true, approvals: true } },
          },
        },
        _count: { select: { members: true, milestones: true } },
      },
    });

    if (!project) {
      throw new NotFoundError(`Project with ID ${projectId} not found`);
    }

    // Access check: ADMIN or project creator or active member
    if (role !== Role.ADMIN) {
      const isMember = project.members.some((m) => m.userId === userId);
      const isCreator = project.createdById === userId;
      if (!isMember && !isCreator) {
        throw new ForbiddenError('Access denied. You are not a member of this project');
      }
    }

    return project;
  }

  /**
   * Updates project details.
   */
  async updateProject(userId: string, projectId: string, input: UpdateProjectInput): Promise<Project> {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundError(`Project with ID ${projectId} not found`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.project.update({
        where: { id: projectId },
        data: {
          title: input.title,
          description: input.description,
          brief: input.brief,
          budget: input.budget !== undefined ? (input.budget ? new Prisma.Decimal(input.budget) : null) : undefined,
          currency: input.currency,
          status: input.status,
          githubRepoOwner: input.githubRepoOwner,
          githubRepoName: input.githubRepoName,
          isArchived: input.isArchived,
        },
      });

      await activityService.logActivity(
        {
          projectId,
          userId,
          action: ActivityAction.PROJECT_UPDATED,
          entityType: 'PROJECT',
          entityId: projectId,
          details: input as Record<string, unknown>,
        },
        tx
      );

      return result;
    });

    return updated;
  }

  /**
   * Deletes or archives a project.
   */
  async deleteProject(userId: string, projectId: string): Promise<{ success: boolean; archived: boolean }> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        milestones: {
          where: {
            status: { in: ['APPROVED', 'PAID'] },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundError(`Project with ID ${projectId} not found`);
    }

    // If project has approved/paid milestones or payments, soft archive instead of hard delete
    if (project.milestones.length > 0) {
      await prisma.project.update({
        where: { id: projectId },
        data: { isArchived: true, status: ProjectStatus.ARCHIVED },
      });
      return { success: true, archived: true };
    }

    await prisma.$transaction(async (tx) => {
      await tx.projectInvitation.deleteMany({ where: { projectId } });
      await tx.projectMember.deleteMany({ where: { projectId } });
      await tx.activityLog.deleteMany({ where: { projectId } });
      await tx.milestone.deleteMany({ where: { projectId } });
      await tx.project.delete({ where: { id: projectId } });
    });

    return { success: true, archived: false };
  }

  /**
   * Lists all members of a project.
   */
  async getMembers(projectId: string) {
    const members = await prisma.projectMember.findMany({
      where: { projectId },
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
      orderBy: { joinedAt: 'asc' },
    });

    return members;
  }

  /**
   * Updates a member's project role.
   */
  async updateMemberRole(
    actorId: string,
    projectId: string,
    targetUserId: string,
    newRole: ProjectMemberRole
  ) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError(`Project with ID ${projectId} not found`);
    }

    // Cannot demote project creator from OWNER
    if (project.createdById === targetUserId && newRole !== ProjectMemberRole.OWNER) {
      throw new BadRequestError('Cannot change or demote the project creator role');
    }

    const member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId: targetUserId },
      },
    });

    if (!member) {
      throw new NotFoundError('Member not found in project');
    }

    const updated = await prisma.projectMember.update({
      where: { id: member.id },
      data: { role: newRole },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    return updated;
  }

  /**
   * Removes a member from a project.
   */
  async removeMember(actorId: string, projectId: string, targetUserId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError(`Project with ID ${projectId} not found`);
    }

    // Cannot remove creator
    if (project.createdById === targetUserId) {
      throw new BadRequestError('Cannot remove project creator from project');
    }

    const member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId: targetUserId },
      },
    });

    if (!member) {
      throw new NotFoundError('Member not found in project');
    }

    // Authorization: Actor must be OWNER/creator of the project, or the target user themselves (leaving)
    const isSelf = actorId === targetUserId;
    if (!isSelf) {
      const actorMember = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: actorId } },
      });
      const isOwner = project.createdById === actorId || actorMember?.role === ProjectMemberRole.OWNER;
      if (!isOwner) {
        throw new ForbiddenError('Only project owners can remove other members from the project');
      }
    }

    await prisma.projectMember.delete({
      where: { id: member.id },
    });

    return { success: true };
  }

  /**
   * Invites a new member to the project by email.
   */
  async inviteMember(actorId: string, projectId: string, input: InviteMemberInput) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError(`Project with ID ${projectId} not found`);
    }

    const normalizedEmail = input.email.trim().toLowerCase();

    // Check if user is already a member
    const existingMember = await prisma.projectMember.findFirst({
      where: {
        projectId,
        user: { email: normalizedEmail },
      },
    });

    if (existingMember) {
      throw new ConflictError('User is already a member of this project');
    }

    // Check for existing pending invitation
    const existingInvitation = await prisma.projectInvitation.findFirst({
      where: {
        projectId,
        email: normalizedEmail,
        status: InvitationStatus.PENDING,
      },
    });

    if (existingInvitation) {
      throw new ConflictError('A pending invitation already exists for this email address');
    }

    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await prisma.$transaction(async (tx) => {
      const created = await tx.projectInvitation.create({
        data: {
          projectId,
          invitedById: actorId,
          email: normalizedEmail,
          role: input.role,
          tokenHash,
          expiresAt,
          status: InvitationStatus.PENDING,
        },
      });

      // If registered user exists, notify them in-app
      const registeredUser = await tx.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (registeredUser) {
        await notificationService.sendNotification(
          {
            userId: registeredUser.id,
            type: NotificationType.INVITATION_RECEIVED,
            title: 'Project Invitation Received',
            message: `You have been invited to join project "${project.title}" as ${input.role}`,
            linkUrl: `/invitations?token=${rawToken}`,
          },
          tx
        );
      }

      await activityService.logActivity(
        {
          projectId,
          userId: actorId,
          action: ActivityAction.INVITATION_SENT,
          entityType: 'INVITATION',
          entityId: created.id,
          details: { email: normalizedEmail, role: input.role },
        },
        tx
      );

      return created;
    });

    return {
      invitation,
      rawToken,
    };
  }

  /**
   * Lists all pending invitations for a project.
   */
  async getProjectInvitations(projectId: string) {
    return prisma.projectInvitation.findMany({
      where: {
        projectId,
        status: InvitationStatus.PENDING,
      },
      include: {
        invitedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Cancels a pending invitation.
   */
  async cancelInvitation(projectId: string, invitationId: string) {
    const invitation = await prisma.projectInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation || invitation.projectId !== projectId) {
      throw new NotFoundError('Invitation not found for this project');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestError('Only pending invitations can be cancelled');
    }

    await prisma.projectInvitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.REVOKED },
    });

    return { success: true };
  }
}

export const projectsService = new ProjectsService();

