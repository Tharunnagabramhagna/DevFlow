import { InvitationStatus, ProjectMemberRole, ProjectInvitationRole, ActivityAction, NotificationType } from '@prisma/client';
import { prisma } from '../../config/database';
import { BadRequestError, NotFoundError, ConflictError } from '../../utils/errors';
import { hashToken } from '../../utils/crypto';
import { activityService } from '../../services/activity.service';
import { notificationService } from '../../services/notification.service';

export class InvitationsService {
  /**
   * Retrieves all pending invitations for the authenticated user's email.
   */
  async getUserInvitations(userEmail: string) {
    const normalizedEmail = userEmail.trim().toLowerCase();

    return prisma.projectInvitation.findMany({
      where: {
        email: normalizedEmail,
        status: InvitationStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            description: true,
            budget: true,
            currency: true,
            status: true,
          },
        },
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Accepts an invitation atomically.
   */
  async acceptInvitation(userId: string, rawToken: string) {
    const tokenHash = hashToken(rawToken);

    const invitation = await prisma.projectInvitation.findUnique({
      where: { tokenHash },
      include: {
        project: true,
      },
    });

    if (!invitation) {
      throw new NotFoundError('Invitation not found or invalid token');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestError(`Invitation has already been ${invitation.status.toLowerCase()}`);
    }

    if (invitation.expiresAt < new Date()) {
      await prisma.projectInvitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new BadRequestError('Invitation has expired');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Email check (must match invited email)
    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new BadRequestError('This invitation was sent to a different email address');
    }

    // Map invitation role to member role
    let memberRole: ProjectMemberRole;
    switch (invitation.role) {
      case ProjectInvitationRole.CLIENT:
        memberRole = ProjectMemberRole.CLIENT;
        break;
      case ProjectInvitationRole.LEAD_DEVELOPER:
        memberRole = ProjectMemberRole.LEAD_DEVELOPER;
        break;
      case ProjectInvitationRole.VIEWER:
        memberRole = ProjectMemberRole.VIEWER;
        break;
      case ProjectInvitationRole.MEMBER:
      default:
        memberRole = ProjectMemberRole.MEMBER;
        break;
    }

    return await prisma.$transaction(async (tx) => {
      // Check if user is already a member
      const existingMember = await tx.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: invitation.projectId,
            userId,
          },
        },
      });

      if (existingMember) {
        await tx.projectInvitation.update({
          where: { id: invitation.id },
          data: { status: InvitationStatus.ACCEPTED, acceptedAt: new Date() },
        });
        return { message: 'You are already a member of this project', member: existingMember };
      }

      // Counterparty separation verification
      if (invitation.role === ProjectInvitationRole.CLIENT) {
        if (invitation.project.leadDeveloperId === userId) {
          throw new ConflictError('A project lead developer cannot also be assigned as the client');
        }
        await tx.project.update({
          where: { id: invitation.projectId },
          data: { clientId: userId },
        });
      } else if (invitation.role === ProjectInvitationRole.LEAD_DEVELOPER) {
        if (invitation.project.clientId === userId) {
          throw new ConflictError('A project client cannot also be assigned as the lead developer');
        }
        await tx.project.update({
          where: { id: invitation.projectId },
          data: { leadDeveloperId: userId },
        });
      }

      // Add to project members
      const newMember = await tx.projectMember.create({
        data: {
          projectId: invitation.projectId,
          userId,
          role: memberRole,
        },
      });

      // Mark invitation accepted
      await tx.projectInvitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
      });

      // Send in-app notification to inviter
      await notificationService.sendNotification(
        {
          userId: invitation.invitedById,
          type: NotificationType.INVITATION_ACCEPTED,
          title: 'Invitation Accepted',
          message: `${user.name} accepted your invitation to join "${invitation.project.title}" as ${invitation.role}`,
          linkUrl: `/projects/${invitation.projectId}`,
        },
        tx
      );

      // Log project activity
      await activityService.logActivity(
        {
          projectId: invitation.projectId,
          userId,
          action: ActivityAction.INVITATION_ACCEPTED,
          entityType: 'INVITATION',
          entityId: invitation.id,
          details: { role: invitation.role, userEmail: user.email },
        },
        tx
      );

      return {
        message: 'Invitation accepted successfully',
        member: newMember,
      };
    });
  }

  /**
   * Declines an invitation.
   */
  async declineInvitation(userId: string, rawToken: string) {
    const tokenHash = hashToken(rawToken);

    const invitation = await prisma.projectInvitation.findUnique({
      where: { tokenHash },
    });

    if (!invitation) {
      throw new NotFoundError('Invitation not found or invalid token');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestError(`Invitation has already been ${invitation.status.toLowerCase()}`);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user || user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new BadRequestError('This invitation was sent to a different email address');
    }

    await prisma.projectInvitation.update({
      where: { id: invitation.id },
      data: { status: InvitationStatus.DECLINED },
    });

    return { message: 'Invitation declined' };
  }
}

export const invitationsService = new InvitationsService();

