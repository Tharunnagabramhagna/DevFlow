import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { prisma } from './config/database';
import { generalRateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './modules/auth/auth.routes';
import logger from './utils/logger';

export const createApp = (): Express => {
  const app = express();

  // Shift-Left Security Middleware
  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Idempotency-Key'],
    })
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
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

  // Mount API Module Routes
  app.use('/api/auth', authRouter);

  // Global Centralized Error Handler
  app.use(errorHandler);

  return app;
};

export const app = createApp();
export default app;
