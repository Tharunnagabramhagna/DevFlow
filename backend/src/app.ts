import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env, parseTrustProxySetting } from './config/env';
import { prisma } from './config/database';
import { generalRateLimiter, authRateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { isTrustedClientOrigin } from './middleware/csrf';
import { authRouter } from './modules/auth/auth.routes';
import { projectsRouter } from './modules/projects/projects.routes';
import { milestonesRouter, projectMilestonesRouter } from './modules/milestones/milestones.routes';
import { evidenceRouter, milestoneEvidenceRouter } from './modules/evidence/evidence.routes';
import { invitationsRouter } from './modules/invitations/invitations.routes';
import { notificationsRouter } from './modules/notifications/notifications.routes';
import { milestoneAIRouter, projectAIRouter, aiCompatibilityRouter } from './modules/ai/ai.routes';
import { paymentsRouter, projectPaymentsRouter } from './modules/payments/payments.routes';
import { webhooksRouter } from './modules/webhooks/webhooks.routes';
import { telemetryRouter } from './modules/telemetry/telemetry.routes';
import { githubRouter } from './modules/github/github.routes';
import { resumeRouter } from './modules/resume/resume.routes';
import { marketplaceRouter } from './modules/marketplace/marketplace.routes';
import logger from './utils/logger';

export const createApp = (): Express => {
  const app = express();

  const trustProxy = parseTrustProxySetting(env.TRUST_PROXY);
  if (trustProxy !== false) {
    app.set('trust proxy', trustProxy);
  }

  // Shift-Left Security Middleware
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        callback(null, !origin || isTrustedClientOrigin(origin));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Idempotency-Key'],
    })
  );
  app.use(cookieParser());
  app.use(
    express.json({
      limit: '10mb',
      verify: (req, _res, buf) => {
        (req as Request & { rawBody?: Buffer }).rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Global Rate Limiting
  app.use('/api', generalRateLimiter);

  // Health Check Endpoint
  app.get('/api/health', async (_req: Request, res: Response) => {
    let dbStatus = 'disconnected';
    let dbError: string | undefined;

    try {
      // Execute a quick connection test
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch (err) {
      dbError = err instanceof Error ? err.message : 'Database query failed';
      logger.warn('Health check database probe failed', { error: dbError });
    }

    const isHealthy = dbStatus === 'connected';

    return res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'degraded',
      service: 'devflow-backend',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.NODE_ENV,
      database: {
        status: dbStatus,
        ...(dbError ? { error: dbError } : {}),
      },
    });
  });

  // Root Welcome / Discovery
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      message: 'DevFlow Backend Service — AI-Powered Milestone Intelligence & Payment Orchestration',
      version: '0.1.0',
      status: 'active',
      docs: '/api/docs',
      health: '/api/health',
    });
  });

  // Mount Auth Module Routes with targeted rate limiter
  app.use('/api/auth', authRateLimiter, authRouter);

  // Mount Core DevFlow Module Routes (Phase 3)
  app.use('/api/projects/:projectId/milestones', projectMilestonesRouter);
  app.use('/api/projects/:id/milestones', projectMilestonesRouter);
  app.use('/api/projects/:projectId/ai', projectAIRouter);
  app.use('/api/projects/:id/ai', projectAIRouter);
  app.use('/api/projects', projectsRouter);

  app.use('/api/milestones/:milestoneId/evidence', milestoneEvidenceRouter);
  app.use('/api/milestones/:id/evidence', milestoneEvidenceRouter);
  app.use('/api/milestones/:milestoneId/ai', milestoneAIRouter);
  app.use('/api/milestones/:id/ai', milestoneAIRouter);
  app.use('/api/milestones', milestonesRouter);

  app.use('/api/evidence', evidenceRouter);
  app.use('/api/invitations', invitationsRouter);
  app.use('/api/notifications', notificationsRouter);

  // Mount Payments and Webhooks Module Routes (Phase 5)
  app.use('/api/projects/:projectId/payments', projectPaymentsRouter);
  app.use('/api/projects/:id/payments', projectPaymentsRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/webhooks', webhooksRouter);

  // Mount Integration & Telemetry Routes (Phase 6)
  app.use('/api/telemetry', telemetryRouter);
  app.use('/api/github', githubRouter);
  app.use('/api/ai', aiCompatibilityRouter);

  // Mount Resume Studio & Talent Marketplace Routes
  app.use('/api/resumes', resumeRouter);
  app.use('/api/marketplace', marketplaceRouter);

  // Global Centralized Error Handler
  app.use(errorHandler);

  return app;
};

export const app = createApp();
export default app;
