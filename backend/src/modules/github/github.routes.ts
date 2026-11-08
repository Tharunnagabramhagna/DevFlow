import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { EvidenceType } from '@prisma/client';

export const githubRouter = Router();

// GET /api/github/commits — Return recent GitHub commit evidence
githubRouter.get('/commits', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const commitEvidences = await prisma.evidence.findMany({
      where: {
        type: EvidenceType.GITHUB_COMMIT,
        isDeleted: false,
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
githubRouter.get('/pulls', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const prEvidences = await prisma.evidence.findMany({
      where: {
        type: EvidenceType.GITHUB_PR,
        isDeleted: false,
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

