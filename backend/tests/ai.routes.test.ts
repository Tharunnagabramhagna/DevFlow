import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { app } from '../src/app';
import { prisma } from '../src/config/database';
import { env } from '../src/config/env';

vi.mock('../src/config/database', () => {
  const mockPrisma: any = {
    milestone: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
    },
    projectMember: {
      findUnique: vi.fn(),
    },
    verificationResult: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
    aIAnalysis: {
      create: vi.fn(),
      createMany: vi.fn(),
      findFirst: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(mockPrisma)),
  };
  return { prisma: mockPrisma };
});

const generateTestToken = (userId: string, email: string, role: Role = Role.FREELANCER) => {
  return jwt.sign({ sub: userId, email, role }, env.JWT_SECRET, { expiresIn: '1h' });
};

describe('Phase 4: AI HTTP API Endpoints & RBAC Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication & Project RBAC Enforcement', () => {
    it('rejects unauthenticated request to AI pipeline with 401 UNAUTHORIZED', async () => {
      const res = await request(app).post('/api/milestones/ms-123/ai/pipeline');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects unauthorized non-member with 403 INSUFFICIENT_PROJECT_ROLE', async () => {
      const token = generateTestToken('stranger-user', 'stranger@devflow.dev');

      (prisma.milestone.findUnique as any).mockResolvedValue({
        id: 'ms-protected',
        projectId: 'proj-secret',
        project: { id: 'proj-secret', createdById: 'owner-user' },
      });
      (prisma.projectMember.findUnique as any).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/milestones/ms-protected/ai/pipeline')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('INSUFFICIENT_PROJECT_ROLE');
    });
  });

  describe('Milestone AI Execution Endpoints', () => {
    it('POST /api/milestones/:id/ai/pipeline runs full pipeline and returns 200', async () => {
      const token = generateTestToken('member-1', 'member@devflow.dev');

      (prisma.milestone.findUnique as any).mockResolvedValue({
        id: 'ms-allowed',
        title: 'Sprint 1',
        requirements: ['Core Auth'],
        paymentAmount: 1500,
        currency: 'USD',
        status: 'EVIDENCE_SUBMITTED',
        projectId: 'proj-1',
        project: {
          id: 'proj-1',
          createdById: 'member-1',
          activityLogs: [],
        },
        evidence: [
          {
            id: 'ev-1',
            type: 'GITHUB_COMMIT',
            title: 'Commit 1',
            isDeleted: false,
          },
        ],
      });

      (prisma.verificationResult.upsert as any).mockResolvedValue({
        id: 'vr-1',
        status: 'PASSED',
        overallScore: 92,
      });

      const res = await request(app)
        .post('/api/milestones/ms-allowed/ai/pipeline')
        .set('Authorization', `Bearer ${token}`)
        .send({ forceRefresh: true });

      expect(res.status).toBe(200);
      expect(res.body.verificationResult).toBeDefined();
      expect(res.body.evidenceAnalysis).toBeDefined();
      expect(res.body.milestoneVerification).toBeDefined();
      expect(res.body.riskDetection).toBeDefined();
      expect(res.body.paymentCoordination).toBeDefined();
    });

    it('GET /api/milestones/:id/ai/results retrieves stored verification result', async () => {
      const token = generateTestToken('member-1', 'member@devflow.dev');

      (prisma.milestone.findUnique as any).mockResolvedValue({
        id: 'ms-allowed',
        projectId: 'proj-1',
        project: { id: 'proj-1', createdById: 'member-1' },
      });

      (prisma.verificationResult.findUnique as any).mockResolvedValue({
        id: 'vr-stored',
        milestoneId: 'ms-allowed',
        status: 'PASSED',
        overallScore: 90,
        analyses: [],
      });

      const res = await request(app)
        .get('/api/milestones/ms-allowed/ai/results')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('vr-stored');
      expect(res.body.status).toBe('PASSED');
    });
  });

  describe('Project AI Monitoring Endpoints', () => {
    it('POST /api/projects/:id/ai/monitoring runs project monitoring and returns 200', async () => {
      const token = generateTestToken('owner-user', 'owner@devflow.dev');

      (prisma.project.findUnique as any).mockResolvedValue({
        id: 'proj-mon',
        title: 'Project Under Monitoring',
        createdById: 'owner-user',
        status: 'ACTIVE',
        budget: 10000,
        currency: 'USD',
        milestones: [],
        members: [{ id: 'm-1' }],
        activityLogs: [],
      });

      (prisma.aIAnalysis.create as any).mockResolvedValue({ id: 'ai-mon' });

      const res = await request(app)
        .post('/api/projects/proj-mon/ai/monitoring')
        .set('Authorization', `Bearer ${token}`)
        .send({ forceRefresh: true });

      expect(res.status).toBe(200);
      expect(res.body.projectId).toBe('proj-mon');
      expect(res.body.monitoring).toBeDefined();
      expect(res.body.monitoring.projectHealth).toBeDefined();
    });
  });
});

