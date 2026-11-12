import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { EvidenceType, Role } from '@prisma/client';
import { authenticate, requireNonGuest, assertVerifiedUser, VerifiedAccountUser } from '../../middleware/auth';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../utils/errors';
import { authService } from '../auth/auth.service';
import { githubService } from './github.service';

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

// GET /api/github/status — Check user's real GitHub OAuth connection & configuration state
githubRouter.get('/status', authenticate, requireNonGuest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = assertVerifiedUser(req);
    const status = await githubService.getStatus(user.id);
    res.status(200).json(status);
  } catch (err) {
    next(err);
  }
});

// POST /api/github/oauth/connect — Initiate GitHub OAuth connection for an authenticated Developer/Admin
githubRouter.post('/oauth/connect', authenticate, requireNonGuest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = assertVerifiedUser(req);
    if (user.role === Role.CLIENT) {
      throw new ForbiddenError('Only Developer or Admin accounts can connect personal GitHub repositories.');
    }

    const returnPath = typeof req.body?.returnPath === 'string' ? req.body.returnPath : '/dashboard';
    const { authorizeUrl, rawState } = await authService.initiateGitHubConnectOAuth(user.id, returnPath);

    res.cookie('devflow_oauth_state', rawState, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60 * 1000,
    });

    res.status(200).json({ authorizeUrl });
  } catch (err) {
    next(err);
  }
});

// POST /api/github/disconnect — Clear GitHub repository access token and link metadata
githubRouter.post('/disconnect', authenticate, requireNonGuest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = assertVerifiedUser(req);
    const result = await githubService.disconnect(user.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/github/repos — List real accessible GitHub repositories for the connected user
githubRouter.get('/repos', authenticate, requireNonGuest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = assertVerifiedUser(req);
    if (user.role === Role.CLIENT) {
      throw new ForbiddenError('Client accounts do not browse personal GitHub repositories.');
    }

    const page = typeof req.query.page === 'string' ? Number.parseInt(req.query.page, 10) || 1 : 1;
    const perPage = typeof req.query.perPage === 'string' ? Number.parseInt(req.query.perPage, 10) || 50 : 50;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;

    const result = await githubService.listRepositories(user.id, { page, perPage, q });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/github/projects/:projectId/connect — Bind a real GitHub repository to a project and perform initial sync
githubRouter.post('/projects/:projectId/connect', authenticate, requireNonGuest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = assertVerifiedUser(req);
    const projectId = req.params.projectId;
    const { repoFullName, owner, repo } = (req.body || {}) as {
      repoFullName?: string;
      owner?: string;
      repo?: string;
    };
    if (!repoFullName && (!owner || !repo)) {
      throw new BadRequestError('Provide either repoFullName ("owner/repo") or both owner and repo.');
    }
    const result = await githubService.connectProjectRepo(projectId, user, { repoFullName, owner, repo });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/github/projects/:projectId/sync — Sync real commits, PRs, and issues from GitHub for a linked project
githubRouter.post('/projects/:projectId/sync', authenticate, requireNonGuest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = assertVerifiedUser(req);
    const projectId = req.params.projectId;
    const force = req.body?.force === true || req.query.force === 'true';
    const result = await githubService.syncProjectRepo(projectId, user, force);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/github/projects/:projectId/activity — Read synced GitHub repository state & submitted repo evidence
githubRouter.get('/projects/:projectId/activity', authenticate, requireNonGuest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = assertVerifiedUser(req);
    const result = await githubService.getProjectActivity(req.params.projectId, user);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/github/webhooks — Public HMAC-verified GitHub webhook receiver
githubRouter.post('/webhooks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    const signatureHeader = req.header('x-hub-signature-256');
    const eventType = req.header('x-github-event');
    const deliveryId = req.header('x-github-delivery');
    const result = await githubService.handleWebhook({
      rawBody,
      signatureHeader,
      eventType,
      deliveryId,
      payload: (req.body || {}) as Record<string, unknown>,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

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
      url:
        ev.externalUrl ||
        (ev.githubRepoOwner && ev.githubRepoName && ev.githubCommitSha
          ? `https://github.com/${ev.githubRepoOwner}/${ev.githubRepoName}/commit/${ev.githubCommitSha}`
          : null),
      filesChanged: null,
      additions: null,
      deletions: null,
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
      number: ev.githubPrNumber || null,
      title: ev.title,
      author: ev.uploadedBy?.name || 'Developer',
      authorAvatar: ev.uploadedBy?.avatarUrl || undefined,
      state: 'merged' as const,
      url:
        ev.externalUrl ||
        (ev.githubRepoOwner && ev.githubRepoName && ev.githubPrNumber
          ? `https://github.com/${ev.githubRepoOwner}/${ev.githubRepoName}/pull/${ev.githubPrNumber}`
          : null),
      createdAt: ev.createdAt.toISOString(),
      mergedAt: ev.createdAt.toISOString(),
      additions: null,
      deletions: null,
      commitsCount: null,
    }));

    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
});
