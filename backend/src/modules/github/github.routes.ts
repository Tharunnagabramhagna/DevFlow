import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { EvidenceType, Role } from '@prisma/client';
import { authenticate, requireNonGuest, assertVerifiedUser, VerifiedAccountUser } from '../../middleware/auth';
import { ForbiddenError, NotFoundError } from '../../utils/errors';

export const githubRouter = Router();

async function buildEvidenceProjectScope(req: Request, user: VerifiedAccountUser) {
  const requestedProjectId =
    typeof req.query.projectId === 'string' && req.query.projectId.trim().length > 0
      ? req.query.projectId.trim()
      : undefined;

  if (requestedProjectId && user.role !== Role.ADMIN) {
    const project = await prisma.project.findUnique({
      where: { id: requestedProjectId },
      include: { members: { where: { userId: user.id } } },
    });
    if (!project) {
      throw new NotFoundError(`Project with ID ${requestedProjectId} not found`);
    }
    const hasAccess =
      project.createdById === user.id ||
      project.clientId === user.id ||
      project.leadDeveloperId === user.id ||
      project.members.length > 0;
    if (!hasAccess) {
      throw new ForbiddenError('Access denied. You do not have permission to view GitHub evidence for this project.');
    }
  }

  if (user.role === Role.ADMIN) {
    return requestedProjectId ? { project: { id: requestedProjectId, isArchived: false } } : undefined;
  }

  return {
    project: {
      ...(requestedProjectId ? { id: requestedProjectId } : {}),
      isArchived: false,
      OR: [
        { createdById: user.id },
        { clientId: user.id },
        { leadDeveloperId: user.id },
        { members: { some: { userId: user.id } } },
      ],
    },
  };
}

// GET /api/github/commits — Return recent GitHub commit evidence scoped to authenticated member projects
githubRouter.get('/commits', authenticate, requireNonGuest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = assertVerifiedUser(req);
    const milestoneScope = await buildEvidenceProjectScope(req, user);
    const commitEvidences = await prisma.evidence.findMany({
      where: {
        type: EvidenceType.GITHUB_COMMIT,
        isDeleted: false,
        ...(milestoneScope ? { milestone: milestoneScope } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        uploadedBy: { select: { name: true, avatarUrl: true } },
      },
    });

    const data = commitEvidences.map((ev) => ({
      sha: ev.githubCommitSha || ev.id.replace(/-/g, '').slice(0, 40),
      message: ev.description || ev.title,
      author: ev.uploadedBy?.name || 'Developer',
      authorAvatar: ev.uploadedBy?.avatarUrl || undefined,
      date: ev.createdAt.toISOString(),
      url: ev.externalUrl || (ev.githubRepoOwner && ev.githubRepoName && ev.githubCommitSha
        ? `https://github.com/${ev.githubRepoOwner}/${ev.githubRepoName}/commit/${ev.githubCommitSha}`
        : `https://github.com/devflow/commit/${ev.githubCommitSha || 'mock'}`),
      filesChanged: 3,
      additions: 120,
      deletions: 15,
      linkedRequirementId: ev.milestoneId,
    }));

    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/github/pulls — Return recent GitHub pull request evidence
githubRouter.get('/pulls', authenticate, requireNonGuest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = assertVerifiedUser(req);
    const milestoneScope = await buildEvidenceProjectScope(req, user);
    const prEvidences = await prisma.evidence.findMany({
      where: {
        type: EvidenceType.GITHUB_PR,
        isDeleted: false,
        ...(milestoneScope ? { milestone: milestoneScope } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        uploadedBy: { select: { name: true, avatarUrl: true } },
      },
    });

    const data = prEvidences.map((ev) => ({
      id: ev.id,
      number: ev.githubPrNumber || 1,
      title: ev.title,
      author: ev.uploadedBy?.name || 'Developer',
      authorAvatar: ev.uploadedBy?.avatarUrl || undefined,
      state: 'merged' as const,
      url: ev.externalUrl || (ev.githubRepoOwner && ev.githubRepoName && ev.githubPrNumber
        ? `https://github.com/${ev.githubRepoOwner}/${ev.githubRepoName}/pull/${ev.githubPrNumber}`
        : `https://github.com/devflow/pull/${ev.githubPrNumber || 1}`),
      createdAt: ev.createdAt.toISOString(),
      mergedAt: ev.createdAt.toISOString(),
      additions: 250,
      deletions: 30,
      commitsCount: 4,
    }));

    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
});

