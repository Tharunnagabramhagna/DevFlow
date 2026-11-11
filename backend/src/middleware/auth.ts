import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../config/env';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

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

export interface VerifiedAccountUser {
  id: string;
  email: string;
  role: Role;
}

export function isNonGuestUser(user: AuthenticatedUser | undefined): user is VerifiedAccountUser {
  return Boolean(user && !user.isGuest && user.role !== 'GUEST');
}

export function assertVerifiedUser(req: Request): VerifiedAccountUser {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required.');
  }
  const role = getAuthenticatedRole(req.user);
  return {
    id: req.user.id,
    email: req.user.email,
    role,
  };
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
    const isGuest = Boolean(decoded.isGuest || decoded.role === 'GUEST');

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      isGuest,
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
    const isGuest = Boolean(decoded.isGuest || decoded.role === 'GUEST');
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      isGuest,
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
  if (!req.user || req.user.role === 'GUEST' || req.user.isGuest) {
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
 * Asserts that the authenticated user is not a guest and possesses a valid database Role.
 * Explicitly rejects guests by throwing ForbiddenError, narrowing the type to Prisma Role.
 */
export function getAuthenticatedRole(user: AuthenticatedUser | undefined): Role {
  if (!user || user.role === 'GUEST' || user.isGuest) {
    throw new ForbiddenError(
      'Guest Mode: Please sign in or create an account to use this feature.',
      undefined,
      'GUEST_RESTRICTED'
    );
  }
  return user.role;
}

/**
 * RBAC guard ensuring authenticated user possesses one of the allowed roles.
 */
export const requireRole = (allowedRoles: (Role | 'GUEST')[]) => {
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

    if (req.user.role === 'GUEST' || !allowedRoles.includes(req.user.role)) {
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
