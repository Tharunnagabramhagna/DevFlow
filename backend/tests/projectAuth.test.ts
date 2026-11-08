import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import { ProjectMemberRole, Role } from '@prisma/client';
import { requireProjectRole } from '../src/middleware/projectAuth';
import { errorHandler } from '../src/middleware/errorHandler';
import { prisma } from '../src/config/database';

vi.mock('../src/config/database', () => ({
  prisma: {
    project: {
      findUnique: vi.fn(),
    },
    projectMember: {
      findUnique: vi.fn(),
    },
  },
}));

describe('Phase 2: Project-Level Authorization Middleware', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());

    // Mock auth middleware injector
    app.use((req: Request, _res: Response, next: NextFunction) => {
      const authHeader = req.headers['x-mock-user'];
      if (authHeader) {
        req.user = JSON.parse(authHeader as string);
      }
      next();
    });

    // Protected project routes
    app.get(
      '/api/projects/:projectId/manage',
      requireProjectRole([ProjectMemberRole.OWNER, ProjectMemberRole.MANAGER]),
      (req: Request, res: Response) => {
        res.status(200).json({ success: true, member: req.projectMember });
      }
    );

    app.get(
      '/api/projects/:projectId/contribute',
      requireProjectRole([ProjectMemberRole.OWNER, ProjectMemberRole.MANAGER, ProjectMemberRole.CONTRIBUTOR]),
      (_req: Request, res: Response) => {
        res.status(200).json({ success: true });
      }
    );

    app.use(errorHandler);
  });

  it('rejects unauthenticated request with 401 Unauthorized', async () => {
    const res = await request(app).get('/api/projects/proj-123/manage');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('allows global ADMIN to bypass project role checks unconditionally', async () => {
    const adminUser = { id: 'admin-uuid', email: 'admin@devflow.dev', role: Role.ADMIN };

    const res = await request(app)
      .get('/api/projects/proj-123/manage')
      .set('x-mock-user', JSON.stringify(adminUser));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Project query should not even be required when user is ADMIN
    expect(prisma.project.findUnique).not.toHaveBeenCalled();
  });

  it('allows project creator (createdById) as OWNER without separate member row', async () => {
    const creatorUser = { id: 'creator-uuid', email: 'creator@devflow.dev', role: Role.CLIENT };

    (prisma.project.findUnique as any).mockResolvedValue({
      id: 'proj-123',
      createdById: 'creator-uuid',
    });

    const res = await request(app)
      .get('/api/projects/proj-123/manage')
      .set('x-mock-user', JSON.stringify(creatorUser));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('allows project member with matching role (e.g. MANAGER)', async () => {
    const managerUser = { id: 'manager-uuid', email: 'mgr@devflow.dev', role: Role.CLIENT };

    (prisma.project.findUnique as any).mockResolvedValue({
      id: 'proj-123',
      createdById: 'someone-else',
    });

    (prisma.projectMember.findUnique as any).mockResolvedValue({
      id: 'pm-1',
      projectId: 'proj-123',
      userId: 'manager-uuid',
      role: ProjectMemberRole.MANAGER,
    });

    const res = await request(app)
      .get('/api/projects/proj-123/manage')
      .set('x-mock-user', JSON.stringify(managerUser));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('rejects project member with insufficient role (e.g. VIEWER on manage route)', async () => {
    const viewerUser = { id: 'viewer-uuid', email: 'viewer@devflow.dev', role: Role.FREELANCER };

    (prisma.project.findUnique as any).mockResolvedValue({
      id: 'proj-123',
      createdById: 'someone-else',
    });

    (prisma.projectMember.findUnique as any).mockResolvedValue({
      id: 'pm-2',
      projectId: 'proj-123',
      userId: 'viewer-uuid',
      role: ProjectMemberRole.VIEWER,
    });

    const res = await request(app)
      .get('/api/projects/proj-123/manage')
      .set('x-mock-user', JSON.stringify(viewerUser));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('INSUFFICIENT_PROJECT_ROLE');
  });

  it('rejects non-member user with 403 Forbidden', async () => {
    const strangerUser = { id: 'stranger-uuid', email: 'stranger@devflow.dev', role: Role.FREELANCER };

    (prisma.project.findUnique as any).mockResolvedValue({
      id: 'proj-123',
      createdById: 'someone-else',
    });

    (prisma.projectMember.findUnique as any).mockResolvedValue(null);

    const res = await request(app)
      .get('/api/projects/proj-123/manage')
      .set('x-mock-user', JSON.stringify(strangerUser));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('INSUFFICIENT_PROJECT_ROLE');
  });

  it('returns 404 NotFound if target project does not exist', async () => {
    const regularUser = { id: 'user-uuid', email: 'user@devflow.dev', role: Role.FREELANCER };

    (prisma.project.findUnique as any).mockResolvedValue(null);

    const res = await request(app)
      .get('/api/projects/non-existent-proj/manage')
      .set('x-mock-user', JSON.stringify(regularUser));

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

