import { Evidence, EvidenceType, MilestoneStatus, ActivityAction, Role, ProjectMemberRole } from '@prisma/client';
import { prisma } from '../../config/database';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../utils/errors';
import { storageService } from '../../services/storage.service';
import { activityService } from '../../services/activity.service';
import { SubmitEvidenceInput } from './evidence.schema';

export class EvidenceService {
  /**
   * Submits evidence for a milestone.
   */
  async submitEvidence(
    actorId: string,
    milestoneId: string,
    input: SubmitEvidenceInput,
    file?: Express.Multer.File
  ): Promise<Evidence> {
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { project: true },
    });

    if (!milestone) {
      throw new NotFoundError(`Milestone with ID ${milestoneId} not found`);
    }

    if (milestone.status === MilestoneStatus.PAID || milestone.status === MilestoneStatus.APPROVED) {
      throw new BadRequestError(`Cannot attach evidence to a milestone in '${milestone.status}' status`);
    }

    let fileKey: string | null = null;
    let fileName: string | null = null;
    let fileSize: number | null = null;
    let mimeType: string | null = null;

    if (input.type === EvidenceType.FILE) {
      if (!file) {
        throw new BadRequestError('File attachment is required when evidence type is FILE');
      }

      const saved = await storageService.saveFile(file);
      fileKey = saved.key;
      fileName = saved.originalName;
      fileSize = saved.size;
      mimeType = saved.mimeType;
    }

    return await prisma.$transaction(async (tx) => {
      const evidence = await tx.evidence.create({
        data: {
          milestoneId,
          uploadedById: actorId,
          type: input.type,
          title: input.title,
          description: input.description,
          fileKey,
          fileName,
          fileSize,
          mimeType,
          githubCommitSha: input.githubCommitSha,
          githubPrNumber: input.githubPrNumber,
          githubRepoOwner: input.githubRepoOwner,
          githubRepoName: input.githubRepoName,
          externalUrl: input.externalUrl,
          textNote: input.textNote,
        },
        include: {
          uploadedBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      });

      // If milestone was PENDING, transition it to IN_PROGRESS upon evidence attachment
      if (milestone.status === MilestoneStatus.PENDING) {
        await tx.milestone.update({
          where: { id: milestoneId },
          data: { status: MilestoneStatus.IN_PROGRESS },
        });
      }

      await activityService.logActivity(
        {
          projectId: milestone.projectId,
          userId: actorId,
          action: ActivityAction.EVIDENCE_SUBMITTED,
          entityType: 'EVIDENCE',
          entityId: evidence.id,
          details: { title: evidence.title, type: evidence.type },
        },
        tx
      );

      return evidence;
    });
  }

  /**
   * Retrieves all non-deleted evidence for a milestone.
   */
  async getMilestoneEvidence(milestoneId: string) {
    const evidenceList = await prisma.evidence.findMany({
      where: {
        milestoneId,
        isDeleted: false,
      },
      include: {
        uploadedBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return evidenceList;
  }

  /**
   * Retrieves a single evidence item.
   */
  async getEvidenceById(evidenceId: string) {
    const evidence = await prisma.evidence.findUnique({
      where: { id: evidenceId },
      include: {
        uploadedBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
        milestone: {
          select: {
            id: true,
            title: true,
            status: true,
            projectId: true,
          },
        },
      },
    });

    if (!evidence || evidence.isDeleted) {
      throw new NotFoundError(`Evidence with ID ${evidenceId} not found`);
    }

    return evidence;
  }

  /**
   * Prepares file stream for secure evidence download.
   */
  async downloadEvidenceFile(actorId: string, actorRole: Role, evidenceId: string) {
    const evidence = await prisma.evidence.findUnique({
      where: { id: evidenceId },
      include: {
        milestone: {
          include: {
            project: {
              include: { members: true },
            },
          },
        },
      },
    });

    if (!evidence || evidence.isDeleted) {
      throw new NotFoundError(`Evidence with ID ${evidenceId} not found`);
    }

    if (evidence.type !== EvidenceType.FILE || !evidence.fileKey) {
      throw new BadRequestError('This evidence item does not have a downloadable file');
    }

    // Access check: ADMIN, project creator, or project member
    if (actorRole !== Role.ADMIN) {
      const project = evidence.milestone.project;
      const isCreator = project.createdById === actorId;
      const isMember = project.members.some((m) => m.userId === actorId);

      if (!isCreator && !isMember) {
        throw new ForbiddenError('You do not have access to download this project file');
      }
    }

    const stream = storageService.getFileStream(evidence.fileKey);

    return {
      stream,
      fileName: evidence.fileName || 'evidence_file',
      mimeType: evidence.mimeType || 'application/octet-stream',
      fileSize: evidence.fileSize || 0,
    };
  }

  /**
   * Soft deletes an evidence record.
   */
  async deleteEvidence(actorId: string, actorRole: Role, evidenceId: string) {
    const evidence = await prisma.evidence.findUnique({
      where: { id: evidenceId },
      include: {
        milestone: {
          include: {
            project: {
              include: { members: true },
            },
          },
        },
      },
    });

    if (!evidence || evidence.isDeleted) {
      throw new NotFoundError(`Evidence with ID ${evidenceId} not found`);
    }

    if (evidence.milestone.status === MilestoneStatus.PAID || evidence.milestone.status === MilestoneStatus.APPROVED) {
      throw new BadRequestError('Cannot delete evidence from an approved or paid milestone');
    }

    // Authorization: uploader, project OWNER, or global ADMIN
    const isUploader = evidence.uploadedById === actorId;
    const isAdmin = actorRole === Role.ADMIN;
    const isOwner =
      evidence.milestone.project.createdById === actorId ||
      evidence.milestone.project.members.some(
        (m) => m.userId === actorId && m.role === ProjectMemberRole.OWNER
      );

    if (!isUploader && !isAdmin && !isOwner) {
      throw new ForbiddenError('You can only delete evidence you uploaded or you must be a project OWNER/ADMIN');
    }

    await prisma.evidence.update({
      where: { id: evidenceId },
      data: { isDeleted: true },
    });

    return { success: true };
  }
}

export const evidenceService = new EvidenceService();

