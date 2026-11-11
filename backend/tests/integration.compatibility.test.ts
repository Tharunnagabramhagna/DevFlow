import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Role, ProjectMemberRole, EvidenceType, PaymentStatus, MilestoneStatus } from '@prisma/client';
import { app } from '../src/app';
import { prisma } from '../src/config/database';
import { env } from '../src/config/env';

vi.mock('../src/config/database', () => {
  const mockPrisma: any = {
    payment: {
      aggregate: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    milestone: {
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    milestoneApproval: {
      create: vi.fn(),
    },
    verificationResult: {
      count: vi.fn(),
      findUnique: vi.fn(),
    },
    project: {
      count: vi.fn(),
      findUnique: vi.fn(),
    },
    evidence: {
      findMany: vi.fn(),
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

const generateTestToken = (userId: string, email: string, role: Role = Role.CLIENT) => {
  return jwt.sign({ sub: userId, email, role }, env.JWT_SECRET, { expiresIn: '1h' });
};

describe('Phase 6: Frontend Integration & Telemetry Compatibility Suite', () => {
  const clientToken = generateTestToken('user-client-1', 'client@example.com', Role.CLIENT);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const guestToken = jwt.sign(
    { sub: 'guest-user-1', email: 'guest@devflow.local', role: 'GUEST', isGuest: true },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  describe('GET /api/telemetry', () => {
    it('rejects unauthenticated requests with 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/telemetry');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects guest JWTs with 403 GUEST_RESTRICTED', async () => {
      const res = await request(app)
        .get('/api/telemetry')
        .set('Authorization', `Bearer ${guestToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('GUEST_RESTRICTED');
    });

    it('rejects cross-project telemetry query when user lacks membership', async () => {
      (prisma.project.findUnique as any).mockResolvedValue({
        id: 'proj-other',
        createdById: 'other-owner',
        clientId: 'other-client',
        leadDeveloperId: 'other-dev',
        members: [],
      });

      const res = await request(app)
        .get('/api/telemetry?projectId=proj-other')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(403);
    });

    it('returns high-level telemetry metrics scoped to authenticated user projects', async () => {
      (prisma.payment.aggregate as any)
        .mockResolvedValueOnce({ _sum: { settledAmount: 15400 } }) // Paid
        .mockResolvedValueOnce({ _sum: { snapshotAmount: 3200 } }); // Pending

      (prisma.milestone.count as any).mockResolvedValue(5);
      (prisma.verificationResult.count as any)
        .mockResolvedValueOnce(18) // Passed
        .mockResolvedValueOnce(20); // Total

      (prisma.project.count as any).mockResolvedValue(4);

      const res = await request(app)
        .get('/api/telemetry')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.totalRevenuePaid).toBe(15400);
      expect(res.body.pendingInvoicesAmount).toBe(3200);
      expect(res.body.activeMilestonesCount).toBe(5);
      expect(res.body.aiVerificationPassRate).toBe(90); // 18 / 20 = 90%
      expect(res.body.totalProjects).toBe(4);
      expect(res.body.currency).toBe('USD');
      expect(prisma.project.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { createdById: 'user-client-1' },
              { clientId: 'user-client-1' },
              { leadDeveloperId: 'user-client-1' },
            ]),
          }),
        })
      );
    });
  });

  describe('GET /api/github/commits and GET /api/github/pulls', () => {
    it('rejects unauthenticated and guest access to GitHub evidence endpoints', async () => {
      const unauthCommits = await request(app).get('/api/github/commits');
      expect(unauthCommits.status).toBe(401);

      const unauthPulls = await request(app).get('/api/github/pulls');
      expect(unauthPulls.status).toBe(401);

      const guestCommits = await request(app)
        .get('/api/github/commits')
        .set('Authorization', `Bearer ${guestToken}`);
      expect(guestCommits.status).toBe(403);
      expect(guestCommits.body.error.code).toBe('GUEST_RESTRICTED');

      const guestPulls = await request(app)
        .get('/api/github/pulls')
        .set('Authorization', `Bearer ${guestToken}`);
      expect(guestPulls.status).toBe(403);
      expect(guestPulls.body.error.code).toBe('GUEST_RESTRICTED');
    });

    it('rejects cross-project GitHub evidence requests for non-members', async () => {
      (prisma.project.findUnique as any).mockResolvedValue({
        id: 'proj-secret',
        createdById: 'other-owner',
        clientId: null,
        leadDeveloperId: null,
        members: [],
      });

      const res = await request(app)
        .get('/api/github/commits?projectId=proj-secret')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(403);
    });

    it('returns evidence commits formatted for frontend GitHubCommitEvidence', async () => {
      (prisma.evidence.findMany as any).mockResolvedValue([
        {
          id: 'ev-commit-1',
          type: EvidenceType.GITHUB_COMMIT,
          githubCommitSha: 'abc123def456789012345678901234567890abcd',
          title: 'feat: add paypal client',
          description: 'Initialized PayPal REST v2 client',
          externalUrl: 'https://github.com/org/repo/commit/abc123',
          createdAt: new Date('2026-11-08T10:00:00Z'),
          milestoneId: 'ms-1',
          uploadedBy: { name: 'Alice Developer', avatarUrl: 'https://avatar.url/1' },
        },
      ]);

      const res = await request(app)
        .get('/api/github/commits')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].sha).toBe('abc123def456789012345678901234567890abcd');
      expect(res.body[0].author).toBe('Alice Developer');
      expect(res.body[0].linkedRequirementId).toBe('ms-1');
      expect(prisma.evidence.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            milestone: expect.objectContaining({
              project: expect.objectContaining({
                OR: expect.arrayContaining([{ clientId: 'user-client-1' }]),
              }),
            }),
          }),
        })
      );
    });

    it('returns evidence pull requests formatted for frontend GitHubPullRequestEvidence', async () => {
      (prisma.evidence.findMany as any).mockResolvedValue([
        {
          id: 'ev-pr-1',
          type: EvidenceType.GITHUB_PR,
          githubPrNumber: 42,
          title: 'PR #42: Core Payment Engine',
          externalUrl: 'https://github.com/org/repo/pull/42',
          createdAt: new Date('2026-11-08T11:00:00Z'),
          uploadedBy: { name: 'Bob Lead', avatarUrl: undefined },
        },
      ]);

      const res = await request(app)
        .get('/api/github/pulls')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].number).toBe(42);
      expect(res.body[0].title).toBe('PR #42: Core Payment Engine');
      expect(res.body[0].state).toBe('merged');
    });
  });

  describe('Milestone Approval Compatibility (POST /api/milestones/:id/approval)', () => {
    it('accepts frontend approval payload { status: "approved" } and reviews milestone', async () => {
      (prisma.milestone.findUnique as any).mockResolvedValue({
        id: 'ms-compat-1',
        title: 'Compatibility Feature',
        status: MilestoneStatus.EVIDENCE_SUBMITTED,
        submittedById: 'dev-submitter',
        assignedDeveloperId: 'dev-submitter',
        project: {
          id: 'proj-1',
          createdById: 'user-client-1',
          members: [{ userId: 'user-client-1', role: ProjectMemberRole.CLIENT }],
        },
      });

      (prisma.milestoneApproval.create as any).mockResolvedValue({
        id: 'appr-1',
        milestoneId: 'ms-compat-1',
        approvedById: 'user-client-1',
        decision: 'APPROVED',
        feedback: 'Looks good',
      });

      (prisma.milestone.update as any).mockResolvedValue({
        id: 'ms-compat-1',
        status: MilestoneStatus.APPROVED,
        approvedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/milestones/ms-compat-1/approval')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          status: 'approved',
          feedback: 'Looks good',
        });

      expect(res.status).toBe(200);
      expect(res.body.milestone.status).toBe(MilestoneStatus.APPROVED);
    });
  });

  describe('Frontend Array & Query Compatibility', () => {
    it('GET /api/projects returns direct Project array when unpaginated', async () => {
      (prisma.project.findMany as any) = vi.fn().mockResolvedValue([
        { id: 'proj-1', title: 'DevFlow Alpha', createdById: 'user-client-1' },
      ]);
      (prisma.project.count as any) = vi.fn().mockResolvedValue(1);

      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('DevFlow Alpha');
    });

    it('GET /api/milestones returns direct Milestone array for authenticated user', async () => {
      (prisma.milestone.findMany as any) = vi.fn().mockResolvedValue([
        { id: 'ms-user-1', title: 'Setup Repo', projectId: 'proj-1' },
      ]);

      const res = await request(app)
        .get('/api/milestones')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Setup Repo');
    });

    it('GET /api/payments/invoices returns formatted { milestone, invoice } list', async () => {
      (prisma.payment.findMany as any) = vi.fn().mockResolvedValue([
        {
          id: 'pay-1',
          paypalInvoiceId: 'INV2-TEST',
          snapshotAmount: 2500,
          snapshotCurrency: 'USD',
          status: PaymentStatus.SENT,
          createdAt: new Date('2026-11-08T10:00:00Z'),
          paidAt: null,
          milestone: {
            id: 'ms-1',
            title: 'Core API',
            project: { id: 'proj-1', title: 'DevFlow' },
          },
        },
      ]);

      const res = await request(app)
        .get('/api/payments/invoices')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].invoice.paypalInvoiceId).toBe('INV2-TEST');
      expect(res.body[0].milestone.title).toBe('Core API');
    });

    it('POST /api/payments/webhooks/simulate-paid marks sandbox invoice as paid', async () => {
      (prisma.payment.findFirst as any) = vi.fn().mockResolvedValue({
        id: 'pay-1',
        milestoneId: 'ms-1',
        snapshotAmount: 2500,
        paypalInvoiceId: 'INV2-TEST',
        milestone: {
          project: {
            createdById: 'user-client-1',
            clientId: 'user-client-1',
            members: [],
          },
        },
      });
      (prisma.payment.update as any) = vi.fn().mockResolvedValue({
        id: 'pay-1',
        status: PaymentStatus.PAID,
        settledAmount: 2500,
      });
      (prisma.milestone.update as any) = vi.fn().mockResolvedValue({
        id: 'ms-1',
        status: MilestoneStatus.PAID,
      });

      const res = await request(app)
        .post('/api/payments/webhooks/simulate-paid')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ invoiceId: 'INV2-TEST' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(PaymentStatus.PAID);
    });
  });
});

