import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../config/env';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role | 'GUEST';
  isGuest?: boolean;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role | 'GUEST';
  isGuest?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Validates in-memory JWT bearer token from Authorization header.
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Missing or malformed Bearer token.',
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      isGuest: Boolean(decoded.isGuest || decoded.role === 'GUEST'),
    };

    next();
  } catch (err) {
    const isExpired = err instanceof jwt.TokenExpiredError;
    res.status(401).json({
      error: {
        code: isExpired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
        message: isExpired ? 'Access token has expired' : 'Invalid access token signature',
        timestamp: new Date().toISOString(),
      },
    });
  }
};

/**
 * Optional authentication: attaches req.user if a valid token is provided,
 * but allows unauthenticated requests to proceed.
 */
export const optionalAuthenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      isGuest: Boolean(decoded.isGuest || decoded.role === 'GUEST'),
    };
  } catch {
    // Ignore invalid tokens on optional auth
  }

  next();
};

/**
 * Guard ensuring guest users cannot perform write or financial operations.
 */
export const requireNonGuest = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.role === ('GUEST' as Role) || req.user?.isGuest) {
    res.status(403).json({
      error: {
        code: 'GUEST_RESTRICTED',
        message: 'Guest Mode: Please sign in or create an account to use this feature.',
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }
  next();
};

/**
 * RBAC guard ensuring authenticated user possesses one of the allowed roles.
 */
export const requireRole = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]`,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    next();
  };
};
