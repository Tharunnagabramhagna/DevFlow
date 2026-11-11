import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { requireNonGuest, requireRole, getAuthenticatedRole, AuthenticatedUser } from '../src/middleware/auth';
import { ForbiddenError } from '../src/utils/errors';
import { env } from '../src/config/env';

describe('Phase 8: Guest Role Type Safety & Access Control Suite', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('1. getAuthenticatedRole() Type Narrowing & Security Guard', () => {
    it('returns valid Role.CLIENT when authenticated as CLIENT', () => {
      const user: AuthenticatedUser = {
        id: 'client-123',
        email: 'client@example.com',
        role: Role.CLIENT,
        isGuest: false,
      };
      const role = getAuthenticatedRole(user);
      expect(role).toBe(Role.CLIENT);
    });

    it('returns valid Role.FREELANCER when authenticated as FREELANCER', () => {
      const user: AuthenticatedUser = {
        id: 'dev-123',
        email: 'dev@example.com',
        role: Role.FREELANCER,
        isGuest: false,
      };
      const role = getAuthenticatedRole(user);
      expect(role).toBe(Role.FREELANCER);
    });

    it('throws ForbiddenError (GUEST_RESTRICTED) when user has role GUEST', () => {
      const guestUser: AuthenticatedUser = {
        id: 'guest-123',
        email: 'guest@devflow.demo',
        role: 'GUEST',
        isGuest: true,
      };

      expect(() => getAuthenticatedRole(guestUser)).toThrow(ForbiddenError);
      try {
        getAuthenticatedRole(guestUser);
      } catch (err: any) {
        expect(err.statusCode).toBe(403);
        expect(err.code).toBe('GUEST_RESTRICTED');
        expect(err.message).toContain('Guest Mode');
      }
    });

    it('throws ForbiddenError when user is undefined or has isGuest: true', () => {
      expect(() => getAuthenticatedRole(undefined)).toThrow(ForbiddenError);

      const sneakyUser: AuthenticatedUser = {
        id: 'sneaky-123',
        email: 'sneaky@devflow.demo',
        role: Role.CLIENT,
        isGuest: true, // Marked as guest
      };
      expect(() => getAuthenticatedRole(sneakyUser)).toThrow(ForbiddenError);
    });
  });

  describe('2. requireNonGuest Middleware Guard', () => {
    it('allows non-guest users to proceed to protected handler', async () => {
      app.get(
        '/test/protected-action',
        (req: Request, _res: Response, next: NextFunction) => {
          req.user = {
            id: 'real-user-1',
            email: 'real@example.com',
            role: Role.CLIENT,
            isGuest: false,
          };
          next();
        },
        requireNonGuest,
        (_req: Request, res: Response) => {
          res.status(200).json({ ok: true, message: 'Action executed' });
        }
      );

      const res = await request(app).get('/test/protected-action');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it('rejects guest users with 403 GUEST_RESTRICTED', async () => {
      app.get(
        '/test/guest-blocked',
        (req: Request, _res: Response, next: NextFunction) => {
          req.user = {
            id: 'guest-temp-1',
            email: 'guest@devflow.demo',
            role: 'GUEST',
            isGuest: true,
          };
          next();
        },
        requireNonGuest,
        (_req: Request, res: Response) => {
          res.status(200).json({ ok: true });
        }
      );

      const res = await request(app).get('/test/guest-blocked');
      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('GUEST_RESTRICTED');
      expect(res.body.error.message).toContain('Guest Mode');
    });

    it('rejects unauthenticated requests lacking req.user', async () => {
      app.get(
        '/test/no-user',
        requireNonGuest,
        (_req: Request, res: Response) => {
          res.status(200).json({ ok: true });
        }
      );

      const res = await request(app).get('/test/no-user');
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('GUEST_RESTRICTED');
    });
  });

  describe('3. requireRole RBAC Guard Against Guest Users', () => {
    it('blocks guest user when route requires CLIENT role', async () => {
      app.post(
        '/test/client-only',
        (req: Request, _res: Response, next: NextFunction) => {
          req.user = {
            id: 'guest-temp-2',
            email: 'guest@devflow.demo',
            role: 'GUEST',
            isGuest: true,
          };
          next();
        },
        requireRole([Role.CLIENT]),
        (_req: Request, res: Response) => {
          res.status(200).json({ success: true });
        }
      );

      const res = await request(app).post('/test/client-only');
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('blocks guest user when route requires FREELANCER role', async () => {
      app.post(
        '/test/dev-only',
        (req: Request, _res: Response, next: NextFunction) => {
          req.user = {
            id: 'guest-temp-3',
            email: 'guest@devflow.demo',
            role: 'GUEST',
            isGuest: true,
          };
          next();
        },
        requireRole([Role.FREELANCER]),
        (_req: Request, res: Response) => {
          res.status(200).json({ success: true });
        }
      );

      const res = await request(app).post('/test/dev-only');
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});

