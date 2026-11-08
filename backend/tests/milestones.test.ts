import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { MilestoneStatus, Role, ProjectMemberRole } from '@prisma/client';
import { app } from '../src/app';
import { prisma } from '../src/config/database';
import { env } from '../src/config/env';
import { milestonesService } from '../src/modules/milestones/milestones.service';

vi.mock('../src/config/database', () => {
  const mockPrisma: any = {
    project: {
      findUnique: vi.fn(),
    },
    projectMember: {
      findUnique: vi.fn(),
    },
    milestone: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    milestoneApproval: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    evidence: {
      deleteMany: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
    },
    notification: {
      create: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(mockPrisma)),
  };
  return { prisma: mockPrisma };
});

const generateTestToken = (userId: string, email: string, role: Role = Role.FREELANCER) => {
  return jwt.sign({ sub: userId, email, role }, env.JWT_SECRET, { expiresIn: '1h' });
};

describe('Phase 3: Milestones & Anti-Self-Approval Review Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Milestone Creation & Validation', () => {
    it('creates milestone with generated publicToken and logs activity', async () => {
      (prisma.project.findUnique as any).mockResolvedValue({
        id: 'proj-1',
        title: 'Fintech API',
        createdById: 'owner-1',
        members: [{ userId: 'dev-1' }],
      });

      (prisma.milestone.create as any).mockResolvedValue({
        id: 'ms-1',
        projectId: 'proj-1',
        title: 'Sprint 1: OAuth & Auth',
        requirements: ['GitHub OAuth', 'JWT Rotation'],
        paymentAmount: '1500.00',
        currency: 'USD',
        status: MilestoneStatus.PENDING,
        publicToken: 'abc123token',
        orderIndex: 1,
      });

      const milestone = await milestonesService.createMilestone('owner-1', 'proj-1', {
        title: 'Sprint 1: OAuth & Auth',
        requirements: ['GitHub OAuth', 'JWT Rotation'],
        paymentAmount: 1500,
        assignedDeveloperId: 'dev-1',
        orderIndex: 1,
      });

      expect(milestone.id).toBe('ms-1');
      expect(prisma.milestone.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Sprint 1: OAuth & Auth',
            requirements: ['GitHub OAuth', 'JWT Rotation'],
            assignedDeveloperId: 'dev-1',
            status: MilestoneStatus.PENDING,
          }),
        })
      );
      expect(prisma.activityLog.create).toHaveBeenCalled();
    });

    it('rejects milestone creation when assigned developer is not a project member', async () => {
      (prisma.project.findUnique as any).mockResolvedValue({
        id: 'proj-1',
        createdById: 'owner-1',
        members: [{ userId: 'member-1' }], // dev-stranger is not a member!
      });

      await expect(
        milestonesService.createMilestone('owner-1', 'proj-1', {
          title: 'Sprint 1',
          requirements: ['Requirement 1'],
          paymentAmount: 1000,
          assignedDeveloperId: 'dev-stranger',
        })
      ).rejects.toThrow('Assigned developer must be an active member of this project');
    });
  });

  describe('Milestone Submission Workflow', () => {
    it('rejects submission if milestone has 0 attached evidence records', async () => {
      (prisma.milestone.findUnique as any).mockResolvedValue({
        id: 'ms-no-evidence',
        title: 'Sprint 1',
        status: MilestoneStatus.PENDING,
        evidence: [], // Empty evidence!
        project: { id: 'proj-1', title: 'Proj 1', clientId: 'client-1' },
      });

      await expect(
        milestonesService.submitMilestone('dev-1', 'ms-no-evidence')
      ).rejects.toThrow('Cannot submit milestone without evidence');
    });

    it('submits milestone successfully when evidence exists, updating status to EVIDENCE_SUBMITTED', async () => {
      (prisma.milestone.findUnique as any).mockResolvedValue({
        id: 'ms-with-evidence',
        title: 'Sprint 1 Done',
        status: MilestoneStatus.IN_PROGRESS,
        evidence: [{ id: 'ev-1', isDeleted: false }],
        project: { id: 'proj-1', title: 'Proj 1', clientId: 'client-1', createdById: 'owner-1' },
      });

      (prisma.milestone.update as any).mockResolvedValue({
        id: 'ms-with-evidence',
        status: MilestoneStatus.EVIDENCE_SUBMITTED,
        submittedById: 'dev-1',
      });

      const updated = await milestonesService.submitMilestone('dev-1', 'ms-with-evidence');

      expect(updated.status).toBe(MilestoneStatus.EVIDENCE_SUBMITTED);
      expect(prisma.milestone.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: MilestoneStatus.EVIDENCE_SUBMITTED,
            submittedById: 'dev-1',
          }),
        })
      );
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'client-1',
            type: 'MILESTONE_SUBMITTED',
          }),
        })
      );
    });
  });

  describe('STRICT Anti-Self-Approval & Review Enforcement', () => {
    it('CRITICAL: prevents submitter from approving their own milestone (Separation of Duties)', async () => {
      const submitterId = 'freelancer-submitter-id';

      (prisma.milestone.findUnique as any).mockResolvedValue({
        id: 'ms-review-1',
        title: 'Milestone Under Review',
        status: MilestoneStatus.EVIDENCE_SUBMITTED,
        submittedById: submitterId, // Submitter is this user
        assignedDeveloperId: submitterId,
        project: { id: 'proj-1', title: 'Proj 1', createdById: submitterId },
      });

      // Submitter attempts to approve their own work!
      await expect(
        milestonesService.reviewMilestone(submitterId, 'ms-review-1', {
          decision: 'APPROVED',
          feedback: 'I approve my own code!',
        })
      ).rejects.toThrow(
        'Separation of duties violation: You cannot approve or review a milestone that you submitted yourself'
      );
    });

    it('allows project client or authorized reviewer to approve milestone', async () => {
      const submitterId = 'developer-user-id';
      const clientApproverId = 'client-approver-id';

      (prisma.milestone.findUnique as any).mockResolvedValue({
        id: 'ms-review-2',
        title: 'Verified Feature',
        status: MilestoneStatus.EVIDENCE_SUBMITTED,
        submittedById: submitterId,
        assignedDeveloperId: submitterId,
        project: { id: 'proj-1', title: 'Proj 1', clientId: clientApproverId },
      });

      (prisma.milestoneApproval.create as any).mockResolvedValue({
        id: 'appr-1',
        milestoneId: 'ms-review-2',
        approvedById: clientApproverId,
        decision: 'APPROVED',
      });

      (prisma.milestone.update as any).mockResolvedValue({
        id: 'ms-review-2',
        status: MilestoneStatus.APPROVED,
        approvedAt: new Date(),
      });

      const result = await milestonesService.reviewMilestone(clientApproverId, 'ms-review-2', {
        decision: 'APPROVED',
        feedback: 'Looks solid, all acceptance criteria verified.',
      });

      expect(result.milestone.status).toBe(MilestoneStatus.APPROVED);
      expect(prisma.milestoneApproval.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            decision: 'APPROVED',
            approvedById: clientApproverId,
          }),
        })
      );
      expect(prisma.notification.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              userId: submitterId,
              type: 'MILESTONE_APPROVED',
            }),
          ]),
        })
      );
    });

    it('rejecting a milestone updates status to REJECTED and notifies developer with feedback', async () => {
      const submitterId = 'dev-sub-id';
      const clientApproverId = 'client-appr-id';

      (prisma.milestone.findUnique as any).mockResolvedValue({
        id: 'ms-review-3',
        title: 'Defective Feature',
        status: MilestoneStatus.EVIDENCE_SUBMITTED,
        submittedById: submitterId,
        assignedDeveloperId: submitterId,
        project: { id: 'proj-1', title: 'Proj 1', clientId: clientApproverId },
      });

      (prisma.milestoneApproval.create as any).mockResolvedValue({
        id: 'appr-rej-1',
        decision: 'REJECTED',
        feedback: 'Edge case handling in auth flow failed.',
      });

      (prisma.milestone.update as any).mockResolvedValue({
        id: 'ms-review-3',
        status: MilestoneStatus.REJECTED,
      });

      const result = await milestonesService.reviewMilestone(clientApproverId, 'ms-review-3', {
        decision: 'REJECTED',
        feedback: 'Edge case handling in auth flow failed.',
      });

      expect(result.milestone.status).toBe(MilestoneStatus.REJECTED);
      expect(prisma.notification.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              userId: submitterId,
              type: 'MILESTONE_REJECTED',
            }),
          ]),
        })
      );
    });
  });

  describe('HTTP Milestone API Endpoints', () => {
    it('PATCH /api/milestones/:id enforces project permission checks', async () => {
      const token = generateTestToken('stranger-user', 'stranger@devflow.dev');

      (prisma.milestone.findUnique as any).mockResolvedValue({
        id: 'ms-protected',
        projectId: 'proj-secret',
        project: { id: 'proj-secret', createdById: 'creator-user' },
      });
      (prisma.projectMember.findUnique as any).mockResolvedValue(null);

      const res = await request(app)
        .patch('/api/milestones/ms-protected')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Hacked Title' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('INSUFFICIENT_PROJECT_ROLE');
    });
  });
});

