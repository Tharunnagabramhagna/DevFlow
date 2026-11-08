import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Role, ProjectMemberRole, ProjectStatus, InvitationStatus, ProjectInvitationRole } from '@prisma/client';
import { app } from '../src/app';
import { prisma } from '../src/config/database';
import { env } from '../src/config/env';
import { projectsService } from '../src/modules/projects/projects.service';
import { invitationsService } from '../src/modules/invitations/invitations.service';
import { hashToken } from '../src/utils/crypto';

vi.mock('../src/config/database', () => {
  const mockPrisma: any = {
    user: {
      findUnique: vi.fn(),
    },
    project: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    projectMember: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    projectInvitation: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    notification: {
      create: vi.fn(),
      createMany: vi.fn(),
    },
    milestone: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(mockPrisma)),
  };
  return { prisma: mockPrisma };
});

const generateTestToken = (userId: string, email: string, role: Role = Role.FREELANCER) => {
  return jwt.sign({ sub: userId, email, role }, env.JWT_SECRET, { expiresIn: '1h' });
};

describe('Phase 3: Projects & Membership Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Project Creation & Ownership', () => {
    it('creates project and assigns creator as OWNER member with leadDeveloperId for freelancer', async () => {
      const freelancerId = 'free-uuid-1';
      (prisma.user.findUnique as any).mockResolvedValue({
        id: freelancerId,
        email: 'freelancer@devflow.dev',
        name: 'Dev Flow Lead',
        role: Role.FREELANCER,
      });

      (prisma.project.create as any).mockResolvedValue({
        id: 'proj-uuid-1',
        title: 'PayPal Invoicing Gateway',
        status: ProjectStatus.DRAFT,
        createdById: freelancerId,
        leadDeveloperId: freelancerId,
        clientId: null,
      });

      const project = await projectsService.createProject(freelancerId, {
        title: 'PayPal Invoicing Gateway',
        description: 'Payment integration',
        budget: 5000,
      });

      expect(project.id).toBe('proj-uuid-1');
      expect(prisma.project.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'PayPal Invoicing Gateway',
            createdById: freelancerId,
            leadDeveloperId: freelancerId,
            clientId: undefined,
          }),
        })
      );
      expect(prisma.projectMember.create).toHaveBeenCalledWith({
        data: {
          projectId: 'proj-uuid-1',
          userId: freelancerId,
          role: ProjectMemberRole.OWNER,
        },
      });
      expect(prisma.activityLog.create).toHaveBeenCalled();
    });

    it('creates project and assigns creator as OWNER member with clientId for client user', async () => {
      const clientId = 'client-uuid-1';
      (prisma.user.findUnique as any).mockResolvedValue({
        id: clientId,
        email: 'client@company.com',
        name: 'Client Acme Corp',
        role: Role.CLIENT,
      });

      (prisma.project.create as any).mockResolvedValue({
        id: 'proj-uuid-2',
        title: 'Client Web Platform',
        createdById: clientId,
        clientId: clientId,
        leadDeveloperId: null,
      });

      const project = await projectsService.createProject(clientId, {
        title: 'Client Web Platform',
        budget: 12000,
      });

      expect(project.id).toBe('proj-uuid-2');
      expect(prisma.project.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clientId,
            leadDeveloperId: undefined,
          }),
        })
      );
    });
  });

  describe('Project Retrieval & Authorization', () => {
    it('non-admin user queries only projects where they are creator or member', async () => {
      (prisma.project.count as any).mockResolvedValue(1);
      (prisma.project.findMany as any).mockResolvedValue([
        { id: 'proj-1', title: 'Allowed Project', createdById: 'user-1' },
      ]);

      const result = await projectsService.getProjects('user-1', Role.FREELANCER, {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(result.items).toHaveLength(1);
      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: [
              {
                OR: [
                  { createdById: 'user-1' },
                  { clientId: 'user-1' },
                  { leadDeveloperId: 'user-1' },
                  { members: { some: { userId: 'user-1' } } },
                ],
              },
            ],
          }),
        })
      );
    });

    it('admin user can retrieve all projects without creator restriction', async () => {
      (prisma.project.count as any).mockResolvedValue(5);
      (prisma.project.findMany as any).mockResolvedValue([{ id: 'proj-1' }, { id: 'proj-2' }]);

      await projectsService.getProjects('admin-user', Role.ADMIN, {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isArchived: false },
        })
      );
    });

    it('getProjectById denies unauthorized non-member with ForbiddenError', async () => {
      (prisma.project.findUnique as any).mockResolvedValue({
        id: 'proj-secret',
        createdById: 'owner-user',
        members: [{ userId: 'member-user' }],
      });

      await expect(
        projectsService.getProjectById('stranger-user', Role.FREELANCER, 'proj-secret')
      ).rejects.toThrow('Access denied. You are not a member of this project');
    });
  });

  describe('Project Invitations & Counterparty Separation', () => {
    it('invites a member and generates secure token hash and in-app notification', async () => {
      (prisma.project.findUnique as any).mockResolvedValue({
        id: 'proj-1',
        title: 'Fintech App',
      });
      (prisma.projectMember.findFirst as any).mockResolvedValue(null);
      (prisma.projectInvitation.findFirst as any).mockResolvedValue(null);
      (prisma.projectInvitation.create as any).mockResolvedValue({
        id: 'inv-1',
        projectId: 'proj-1',
        email: 'collaborator@devflow.dev',
        role: ProjectInvitationRole.MEMBER,
      });
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-collab',
        email: 'collaborator@devflow.dev',
      });

      const { invitation, rawToken } = await projectsService.inviteMember('owner-id', 'proj-1', {
        email: 'Collaborator@devflow.dev',
        role: ProjectInvitationRole.MEMBER,
      });

      expect(invitation.id).toBe('inv-1');
      expect(rawToken).toBeDefined();
      expect(prisma.projectInvitation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'collaborator@devflow.dev',
            role: ProjectInvitationRole.MEMBER,
          }),
        })
      );
      expect(prisma.notification.create).toHaveBeenCalled();
    });

    it('rejects duplicate pending invitation for the same email with ConflictError', async () => {
      (prisma.project.findUnique as any).mockResolvedValue({ id: 'proj-1' });
      (prisma.projectMember.findFirst as any).mockResolvedValue(null);
      (prisma.projectInvitation.findFirst as any).mockResolvedValue({
        id: 'existing-inv',
        status: InvitationStatus.PENDING,
      });

      await expect(
        projectsService.inviteMember('owner-id', 'proj-1', {
          email: 'duplicate@devflow.dev',
          role: ProjectInvitationRole.MEMBER,
        })
      ).rejects.toThrow('A pending invitation already exists for this email address');
    });

    it('acceptInvitation creates ProjectMember and updates status to ACCEPTED', async () => {
      const rawToken = 'invitation-secret-token-12345';
      const tokenHash = hashToken(rawToken);

      (prisma.projectInvitation.findUnique as any).mockResolvedValue({
        id: 'inv-1',
        projectId: 'proj-1',
        email: 'dev@devflow.dev',
        role: ProjectInvitationRole.LEAD_DEVELOPER,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 100000),
        invitedById: 'owner-id',
        project: {
          id: 'proj-1',
          title: 'Dev Project',
          clientId: 'client-user-1',
          leadDeveloperId: null,
        },
      });

      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'dev-user-id',
        email: 'dev@devflow.dev',
        name: 'Dev Lead',
      });

      (prisma.projectMember.findUnique as any).mockResolvedValue(null);
      (prisma.projectMember.create as any).mockResolvedValue({
        id: 'member-1',
        projectId: 'proj-1',
        userId: 'dev-user-id',
        role: ProjectMemberRole.LEAD_DEVELOPER,
      });

      const result = await invitationsService.acceptInvitation('dev-user-id', rawToken);

      expect(result.message).toBe('Invitation accepted successfully');
      expect(prisma.projectMember.create).toHaveBeenCalledWith({
        data: {
          projectId: 'proj-1',
          userId: 'dev-user-id',
          role: ProjectMemberRole.LEAD_DEVELOPER,
        },
      });
      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: 'proj-1' },
        data: { leadDeveloperId: 'dev-user-id' },
      });
      expect(prisma.projectInvitation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: InvitationStatus.ACCEPTED }),
        })
      );
    });

    it('acceptInvitation enforces counterparty separation (client cannot be same as lead developer)', async () => {
      const rawToken = 'client-token-12345';
      (prisma.projectInvitation.findUnique as any).mockResolvedValue({
        id: 'inv-client',
        projectId: 'proj-1',
        email: 'sameperson@devflow.dev',
        role: ProjectInvitationRole.CLIENT,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 100000),
        project: {
          id: 'proj-1',
          title: 'Conflict Project',
          clientId: null,
          leadDeveloperId: 'sameperson-user-id', // User is already leadDeveloper!
        },
      });

      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'sameperson-user-id',
        email: 'sameperson@devflow.dev',
        name: 'Conflict User',
      });

      (prisma.projectMember.findUnique as any).mockResolvedValue(null);

      await expect(
        invitationsService.acceptInvitation('sameperson-user-id', rawToken)
      ).rejects.toThrow('A project lead developer cannot also be assigned as the client');
    });
  });

  describe('HTTP Project API Routes', () => {
    it('POST /api/projects rejects unauthenticated request with 401', async () => {
      const res = await request(app).post('/api/projects').send({ title: 'Test Project' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('POST /api/projects validates input schema (requires title min 3 chars)', async () => {
      const token = generateTestToken('user-1', 'user1@devflow.dev');
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'ab' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('POST /api/projects creates project and returns 201', async () => {
      const token = generateTestToken('user-1', 'user1@devflow.dev');
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-1',
        email: 'user1@devflow.dev',
        name: 'User One',
        role: Role.FREELANCER,
      });

      (prisma.project.create as any).mockResolvedValue({
        id: 'proj-api-1',
        title: 'New API Project',
        budget: '2500.00',
        currency: 'USD',
        status: ProjectStatus.DRAFT,
        createdById: 'user-1',
      });

      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'New API Project', budget: 2500 });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe('proj-api-1');
      expect(res.body.title).toBe('New API Project');
    });
  });
});

