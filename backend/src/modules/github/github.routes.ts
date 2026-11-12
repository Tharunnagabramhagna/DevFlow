import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { EvidenceType, Role } from '@prisma/client';
import { authenticate, requireNonGuest, assertVerifiedUser, VerifiedAccountUser } from '../../middleware/auth';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../utils/errors';
import { authService } from '../auth/auth.service';
import {
  GITHUB_APP_INSTALL_STATE_COOKIE,
  githubAppInstallService,
} from './github-app-install.service';
import { githubAppWebhookService } from './github-app-webhook.service';
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

// POST /api/github/app/install — Initiate GitHub App installation flow for an authenticated Developer/Admin
githubRouter.post('/app/install', authenticate, requireNonGuest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = assertVerifiedUser(req);
    const returnPath = typeof req.body?.returnPath === 'string' ? req.body.returnPath : '/dashboard';
    const { installUrl, rawState } = await githubAppInstallService.initiateInstallation(user, returnPath);

    res.cookie(GITHUB_APP_INSTALL_STATE_COOKIE, rawState, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60 * 1000,
    });

    res.status(200).json({ installUrl });
  } catch (err) {
    next(err);
  }
});

// GET /api/github/app/setup — GitHub App Setup URL callback verifying state, App ID, allowlist, ownership & reconciling repos
githubRouter.get('/app/setup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawCookieState = req.cookies?.[GITHUB_APP_INSTALL_STATE_COOKIE] as string | undefined;
    res.clearCookie(GITHUB_APP_INSTALL_STATE_COOKIE, { path: '/' });

    const state = typeof req.query.state === 'string' ? req.query.state : undefined;
    const installationId =
      typeof req.query.installation_id === 'string' ? req.query.installation_id : undefined;
    const setupAction =
      typeof req.query.setup_action === 'string' ? req.query.setup_action : undefined;

    const result = await githubAppInstallService.handleSetupCallback({
      state,
      rawCookieState,
      installationId,
      setupAction,
    });

    const accept = req.headers.accept || '';
    if (accept.includes('application/json') && !accept.includes('text/html')) {
      res.status(200).json({
        connected: true,
        installation: result.installation,
        reconciledRepoCount: result.reconciledRepoCount,
        returnPath: result.returnPath,
      });
      return;
    }

    res.redirect(
      `${env.CLIENT_URL}/#${result.returnPath}?github_app=connected&installation_id=${result.installation.installationId}`
    );
  } catch (err) {
    next(err);
  }
});

// GET /api/github/app/repositories — List repositories accessible to the user's active GitHub App installation
githubRouter.get('/app/repositories', authenticate, requireNonGuest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = assertVerifiedUser(req);
    const page = typeof req.query.page === 'string' ? Number.parseInt(req.query.page, 10) || 1 : 1;
    const perPage = typeof req.query.perPage === 'string' ? Number.parseInt(req.query.perPage, 10) || 50 : 50;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;

    const result = await githubAppInstallService.listUserInstallationRepositories(user, {
      page,
      perPage,
      q,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/github/app/projects/:projectId/connect — Bind a repository from the user's active GitHub App installation to a project
githubRouter.post('/app/projects/:projectId/connect', authenticate, requireNonGuest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = assertVerifiedUser(req);
    const result = await githubAppInstallService.connectProjectWithInstallation(
      req.params.projectId,
      user,
      (req.body || {}) as {
        githubRepoId?: number | string;
        repoFullName?: string;
        owner?: string;
        repo?: string;
      }
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/github/app/projects/:projectId/sync — Sync commits, PRs, issues, and safe changed files via installation access token
githubRouter.post('/app/projects/:projectId/sync', authenticate, requireNonGuest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = assertVerifiedUser(req);
    const force = req.body?.force === true || req.query.force === 'true';
    const result = await githubAppInstallService.syncProjectWithInstallation(
      req.params.projectId,
      user,
      force
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/github/app/webhooks — Dedicated HMAC-SHA256 verified GitHub App webhook receiver
githubRouter.post('/app/webhooks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    const signatureHeader = req.header('x-hub-signature-256');
    const eventType = req.header('x-github-event');
    const deliveryId = req.header('x-github-delivery');
    const result = await githubAppWebhookService.handleWebhook({
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

// GET /api/github/app/projects/:projectId/status — Inspect project GitHub App sync status and linked repository metadata
githubRouter.get('/app/projects/:projectId/status', authenticate, requireNonGuest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = assertVerifiedUser(req);
    const result = await githubAppInstallService.getProjectAppSyncStatus(req.params.projectId, user);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});
