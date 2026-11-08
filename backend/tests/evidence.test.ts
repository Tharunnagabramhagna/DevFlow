import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { EvidenceType, MilestoneStatus, Role, ProjectMemberRole } from '@prisma/client';
import { app } from '../src/app';
import { prisma } from '../src/config/database';
import { env } from '../src/config/env';
import { evidenceService } from '../src/modules/evidence/evidence.service';
import { storageService } from '../src/services/storage.service';

vi.mock('../src/config/database', () => {
  const mockPrisma: any = {
    milestone: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    evidence: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    projectMember: {
      findUnique: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(mockPrisma)),
  };
  return { prisma: mockPrisma };
});

vi.mock('../src/services/storage.service', async () => {
  const actual = await vi.importActual<any>('../src/services/storage.service');
  return {
    ...actual,
    storageService: {
      saveFile: vi.fn().mockResolvedValue({
        key: 'test_file_key_123.pdf',
        size: 1024,
        mimeType: 'application/pdf',
        originalName: 'specs.pdf',
      }),
      getFileStream: vi.fn(),
      fileExists: vi.fn().mockResolvedValue(true),
      deleteFile: vi.fn(),
    },
  };
});

const generateTestToken = (userId: string, email: string, role: Role = Role.FREELANCER) => {
  return jwt.sign({ sub: userId, email, role }, env.JWT_SECRET, { expiresIn: '1h' });
};

describe('Phase 3: Evidence Management & Secure Storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Evidence Submission & Metadata Validation', () => {
    it('submits GITHUB_COMMIT evidence and transitions PENDING milestone to IN_PROGRESS', async () => {
      (prisma.milestone.findUnique as any).mockResolvedValue({
        id: 'ms-1',
        projectId: 'proj-1',
        status: MilestoneStatus.PENDING,
        project: { id: 'proj-1' },
      });

      (prisma.evidence.create as any).mockResolvedValue({
        id: 'ev-commit-1',
        milestoneId: 'ms-1',
        uploadedById: 'dev-1',
        type: EvidenceType.GITHUB_COMMIT,
        title: 'Initial Commit Evidence',
        githubCommitSha: 'e9a4f21bc901a23456789abcdef0123456789abc',
      });

      const evidence = await evidenceService.submitEvidence('dev-1', 'ms-1', {
        type: EvidenceType.GITHUB_COMMIT,
        title: 'Initial Commit Evidence',
        githubCommitSha: 'e9a4f21bc901a23456789abcdef0123456789abc',
      });

      expect(evidence.id).toBe('ev-commit-1');
      expect(prisma.milestone.update).toHaveBeenCalledWith({
        where: { id: 'ms-1' },
        data: { status: MilestoneStatus.IN_PROGRESS },
      });
      expect(prisma.activityLog.create).toHaveBeenCalled();
    });

    it('submits FILE evidence using storage service', async () => {
      (prisma.milestone.findUnique as any).mockResolvedValue({
        id: 'ms-2',
        projectId: 'proj-1',
        status: MilestoneStatus.IN_PROGRESS,
        project: { id: 'proj-1' },
      });

      (prisma.evidence.create as any).mockResolvedValue({
        id: 'ev-file-1',
        milestoneId: 'ms-2',
        type: EvidenceType.FILE,
        title: 'Architecture Blueprint',
        fileKey: 'test_file_key_123.pdf',
        fileName: 'specs.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
      });

      const mockMulterFile = {
        originalname: 'specs.pdf',
        size: 1024,
        mimetype: 'application/pdf',
        buffer: Buffer.from('PDF content'),
      } as Express.Multer.File;

      const evidence = await evidenceService.submitEvidence(
        'dev-1',
        'ms-2',
        {
          type: EvidenceType.FILE,
          title: 'Architecture Blueprint',
        },
        mockMulterFile
      );

      expect(evidence.id).toBe('ev-file-1');
      expect(storageService.saveFile).toHaveBeenCalledWith(mockMulterFile);
    });

    it('rejects evidence submission if milestone is already APPROVED or PAID', async () => {
      (prisma.milestone.findUnique as any).mockResolvedValue({
        id: 'ms-approved',
        status: MilestoneStatus.APPROVED,
        project: { id: 'proj-1' },
      });

      await expect(
        evidenceService.submitEvidence('dev-1', 'ms-approved', {
          type: EvidenceType.TEXT_NOTE,
          title: 'Post approval note',
          textNote: 'Trying to add evidence after approval',
        })
      ).rejects.toThrow("Cannot attach evidence to a milestone in 'APPROVED' status");
    });
  });

  describe('Evidence Retrieval & File Download', () => {
    it('getMilestoneEvidence filters out deleted records', async () => {
      (prisma.evidence.findMany as any).mockResolvedValue([
        { id: 'ev-1', isDeleted: false, title: 'Valid Evidence' },
      ]);

      const result = await evidenceService.getMilestoneEvidence('ms-1');

      expect(result).toHaveLength(1);
      expect(prisma.evidence.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { milestoneId: 'ms-1', isDeleted: false },
        })
      );
    });

    it('downloadEvidenceFile rejects access if user is not in the project', async () => {
      (prisma.evidence.findUnique as any).mockResolvedValue({
        id: 'ev-download',
        type: EvidenceType.FILE,
        fileKey: 'file.pdf',
        isDeleted: false,
        milestone: {
          project: {
            id: 'proj-1',
            createdById: 'owner-1',
            members: [{ userId: 'allowed-member' }],
          },
        },
      });

      await expect(
        evidenceService.downloadEvidenceFile('intruder-user', Role.FREELANCER, 'ev-download')
      ).rejects.toThrow('You do not have access to download this project file');
    });
  });

  describe('Soft Deletion of Evidence', () => {
    it('allows uploader or project OWNER to soft delete evidence', async () => {
      (prisma.evidence.findUnique as any).mockResolvedValue({
        id: 'ev-del-1',
        uploadedById: 'dev-uploader',
        isDeleted: false,
        milestone: {
          status: MilestoneStatus.IN_PROGRESS,
          project: {
            createdById: 'owner-1',
            members: [{ userId: 'owner-1', role: ProjectMemberRole.OWNER }],
          },
        },
      });

      (prisma.evidence.update as any).mockResolvedValue({
        id: 'ev-del-1',
        isDeleted: true,
      });

      const res = await evidenceService.deleteEvidence('dev-uploader', Role.FREELANCER, 'ev-del-1');

      expect(res.success).toBe(true);
      expect(prisma.evidence.update).toHaveBeenCalledWith({
        where: { id: 'ev-del-1' },
        data: { isDeleted: true },
      });
    });

    it('denies deletion from unauthorized member with ForbiddenError', async () => {
      (prisma.evidence.findUnique as any).mockResolvedValue({
        id: 'ev-del-2',
        uploadedById: 'dev-original-author',
        isDeleted: false,
        milestone: {
          status: MilestoneStatus.IN_PROGRESS,
          project: {
            createdById: 'owner-1',
            members: [{ userId: 'other-member', role: ProjectMemberRole.MEMBER }],
          },
        },
      });

      await expect(
        evidenceService.deleteEvidence('other-member', Role.FREELANCER, 'ev-del-2')
      ).rejects.toThrow('You can only delete evidence you uploaded or you must be a project OWNER/ADMIN');
    });
  });

  describe('HTTP Evidence API Routes', () => {
    it('POST /api/milestones/:id/evidence validates schema (rejects GITHUB_COMMIT without SHA)', async () => {
      const token = generateTestToken('dev-1', 'dev1@devflow.dev');

      (prisma.milestone.findUnique as any).mockResolvedValue({
        id: 'ms-test',
        projectId: 'proj-1',
        project: { id: 'proj-1', createdById: 'dev-1' },
      });

      const res = await request(app)
        .post('/api/milestones/ms-test/evidence')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'GITHUB_COMMIT',
          title: 'Missing SHA',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});

