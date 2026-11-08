import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

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

