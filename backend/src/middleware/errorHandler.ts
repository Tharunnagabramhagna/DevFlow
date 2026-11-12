import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

const DB_UNAVAILABLE_CODES = new Set(['P1000', 'P1001', 'P1002', 'P1008', 'P1017']);

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(err.toResponse());
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request payload validation failed',
        details: err.flatten().fieldErrors,
        timestamp: new Date().toISOString(),
      },
    });
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    logger.error('Database initialization/connection error', err);
    return res.status(503).json({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database service is unavailable. Ensure PostgreSQL is running and accessible.',
        timestamp: new Date().toISOString(),
      },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (DB_UNAVAILABLE_CODES.has(err.code)) {
      logger.error('Database connection failure', { code: err.code, message: err.message });
      return res.status(503).json({
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: 'Database service is unavailable. Ensure PostgreSQL is running and accessible.',
          timestamp: new Date().toISOString(),
        },
      });
    }
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'A record with this unique value already exists.',
          timestamp: new Date().toISOString(),
        },
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Requested record was not found.',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  logger.error('Unhandled Exception Caught in Error Middleware', err);

  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred',
      timestamp: new Date().toISOString(),
    },
  });
};

export default errorHandler;

