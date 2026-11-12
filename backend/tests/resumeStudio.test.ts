import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { ApplicationStatus, ProfileVisibility, ResumeParseStatus, Role } from '@prisma/client';
import { app } from '../src/app';
import { prisma } from '../src/config/database';
import { env } from '../src/config/env';
import { validateAndExtractResumeText, RESUME_MAX_BYTES } from '../src/modules/resume/resumeParser.service';
import {
  buildResumeDocxBuffer,
  buildResumePdfBuffer,
  getResumeTemplateOrThrow,
  RESUME_TEMPLATES,
  StructuredResumeDocument,
} from '../src/modules/resume/resumeExport.service';

vi.mock('../src/config/database', () => {
  const mockPrisma: any = {
    user: {
      findUnique: vi.fn(),
    },
    developerProfile: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    developerResume: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    resumeFile: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    developerSkill: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
    portfolioProject: {
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    opportunityApplication: {
      findFirst: vi.fn(),
    },
    project: {
      findMany: vi.fn(),
    },
  };
  return { prisma: mockPrisma };
});

function signTestJwt(userId: string, email: string, role: Role | 'GUEST', isGuest = false) {
  return jwt.sign({ sub: userId, email, role, isGuest }, env.JWT_SECRET, { expiresIn: '1h' });
}

describe('Feature 1: Developer Resume Studio Security, Parsing & Export Suite', () => {
  const devToken = signTestJwt('dev-1', 'dev@devflow.test', Role.FREELANCER);
  const clientToken = signTestJwt('client-1', 'client@devflow.test', Role.CLIENT);
  const guestToken = signTestJwt('guest-1', 'guest@devflow.test', 'GUEST', true);

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.user.findUnique as any).mockImplementation(({ where }: any) => {
      if (where.id === 'dev-1') {
        return Promise.resolve({
          id: 'dev-1',
          email: 'dev@devflow.test',
          name: 'Ada Lovelace',
          role: Role.FREELANCER,
          isVerified: true,
          avatarUrl: null,
          githubUsername: 'adalovelace',
          githubRepos: [],
        });
      }
      if (where.id === 'client-1') {
        return Promise.resolve({
          id: 'client-1',
          email: 'client@devflow.test',
          name: 'Grace Client',
          role: Role.CLIENT,
          isVerified: true,
        });
      }
      return Promise.resolve(null);
    });
  });

  it('exposes all 8 ATS templates and supported file metadata', async () => {
    const res = await request(app)
      .get('/api/resumes/templates')
      .set('Authorization', `Bearer ${devToken}`);

    expect(res.status).toBe(200);
    expect(res.body.templates).toHaveLength(8);
    expect(RESUME_TEMPLATES.map((t) => t.id)).toContain('fullstack-developer');
    expect(res.body.maxUploadBytes).toBe(RESUME_MAX_BYTES);
  });

  it('rejects Guest demo and Client accounts from Developer Resume Studio', async () => {
    const guestRes = await request(app)
      .get('/api/resumes/profile')
      .set('Authorization', `Bearer ${guestToken}`);
    expect(guestRes.status).toBe(403);

    const clientRes = await request(app)
      .get('/api/resumes/profile')
      .set('Authorization', `Bearer ${clientToken}`);
    expect(clientRes.status).toBe(403);
  });

  it('validates content signatures and blocks executables, legacy .doc, scripts, and oversized uploads', async () => {
    // 1. PE Executable masquerading as .pdf
    const exeBuf = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]);
    await expect(
      validateAndExtractResumeText(exeBuf, 'malware.pdf', 'application/pdf')
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_FILE_TYPE' });

    // 2. Legacy OLE2 .doc binary
    const legacyDocBuf = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    await expect(
      validateAndExtractResumeText(legacyDocBuf, 'legacy.doc', 'application/msword')
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_FILE_TYPE' });

    // 3. Script injection in .txt
    const scriptBuf = Buffer.from('<html><script>alert(1)</script></html>', 'utf8');
    await expect(
      validateAndExtractResumeText(scriptBuf, 'bad.txt', 'text/plain')
    ).rejects.toThrow(/script|HTML/i);

    // 4. Oversized file (>5MB)
    const bigBuf = Buffer.alloc(RESUME_MAX_BYTES + 10, 0x61);
    await expect(
      validateAndExtractResumeText(bigBuf, 'huge.txt', 'text/plain')
    ).rejects.toMatchObject({ code: 'FILE_TOO_LARGE' });

    // 5. Valid plain-text resume
    const txtBuf = Buffer.from(
      'Ada Lovelace\nSenior Full-Stack Engineer\nSkills: TypeScript, React, PostgreSQL, Node.js\nExperience: Built payment verification APIs.',
      'utf8'
    );
    const parsedTxt = await validateAndExtractResumeText(txtBuf, 'resume.txt', 'text/plain');
    expect(parsedTxt.fileExtension).toBe('.txt');
    expect(parsedTxt.extractedText).toContain('TypeScript');
    expect(parsedTxt.sha256Hash).toHaveLength(64);
  });

  it('generates real ATS PDF and DOCX buffers and parses them back round-trip', async () => {
    const template = getResumeTemplateOrThrow('fullstack-developer');
    const sampleDoc: StructuredResumeDocument = {
      template,
      fullName: 'Ada Lovelace',
      headline: 'Full-Stack TypeScript & PostgreSQL Engineer',
      location: 'Remote',
      links: ['dev@devflow.test', 'https://github.com/adalovelace'],
      summary: 'Built verifiable milestone delivery pipelines and REST APIs using TypeScript and Prisma.',
      skills: ['TypeScript', 'PostgreSQL', 'React', 'Node.js'],
      projects: [
        {
          title: 'MilestoneLedger',
          summary: 'Escrow-backed software delivery tracker.',
          technologies: ['TypeScript', 'PostgreSQL'],
        },
      ],
      experience: [
        {
          title: 'Senior Software Engineer',
          company: 'Analytical Systems',
          period: '2022 - Present',
          summary: 'Architected microservice pipelines and automated test suites.',
        },
      ],
      education: [{ degree: 'B.S. Computer Science', institution: 'London Tech', year: '2020' }],
      certifications: [{ name: 'AWS Solutions Architect', issuer: 'Amazon', year: '2023' }],
    };

    const pdfBuf = await buildResumePdfBuffer(sampleDoc);
    expect(pdfBuf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    const parsedPdf = await validateAndExtractResumeText(pdfBuf, 'ada.pdf', 'application/pdf');
    expect(parsedPdf.fileExtension).toBe('.pdf');
    expect(parsedPdf.extractedText).toContain('Ada Lovelace');

    const docxBuf = await buildResumeDocxBuffer(sampleDoc);
    expect(docxBuf.subarray(0, 2).toString('latin1')).toBe('PK');
    const parsedDocx = await validateAndExtractResumeText(
      docxBuf,
      'ada.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    expect(parsedDocx.fileExtension).toBe('.docx');
    expect(parsedDocx.extractedText).toContain('MilestoneLedger');
  });

  it('prevents duplicate identical resume uploads unless replace/allowDuplicate is requested', async () => {
    (prisma.developerProfile.findUnique as any).mockResolvedValue({
      id: 'prof-1',
      userId: 'dev-1',
      skills: [],
      portfolioProjects: [],
    });
    (prisma.resumeFile.findFirst as any).mockResolvedValue({
      id: 'existing-file-1',
      originalName: 'resume.txt',
      createdAt: new Date('2026-11-01T00:00:00Z'),
    });

    const txtContent =
      'Ada Lovelace\nSenior Engineer with TypeScript, PostgreSQL, Docker, and GraphQL experience spanning 5 years.';

    const res = await request(app)
      .post('/api/resumes/upload')
      .set('Authorization', `Bearer ${devToken}`)
      .attach('file', Buffer.from(txtContent, 'utf8'), 'resume.txt');

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_RESUME_UPLOAD');
  });

  it('enforces strict resume download consent boundaries between developer owner and clients', async () => {
    (prisma.developerResume.findUnique as any).mockResolvedValue({
      id: 'res-1',
      profileId: 'prof-1',
      fileName: 'ada.pdf',
      mimeType: 'application/pdf',
      parseStatus: ResumeParseStatus.PARSED,
      profile: {
        id: 'prof-1',
        userId: 'dev-1',
        visibility: ProfileVisibility.PUBLIC,
        allowClientResumeDownload: false,
      },
      file: {
        id: 'file-1',
        storageKey: 'nonexistent-file-for-404-or-403-check.pdf',
      },
    });

    // Without allowClientResumeDownload and without an application granting download, Client is denied 403
    (prisma.opportunityApplication.findFirst as any).mockResolvedValue(null);
    const deniedClient = await request(app)
      .get('/api/resumes/res-1/download')
      .set('Authorization', `Bearer ${clientToken}`);
    expect(deniedClient.status).toBe(403);

    // Private profile denies download even if client tries
    (prisma.developerResume.findUnique as any).mockResolvedValueOnce({
      id: 'res-1',
      profileId: 'prof-1',
      fileName: 'ada.pdf',
      mimeType: 'application/pdf',
      parseStatus: ResumeParseStatus.PARSED,
      profile: {
        id: 'prof-1',
        userId: 'dev-1',
        visibility: ProfileVisibility.PRIVATE,
        allowClientResumeDownload: true,
      },
      file: { id: 'file-1', storageKey: 'missing.pdf' },
    });
    const privateDenied = await request(app)
      .get('/api/resumes/res-1/download')
      .set('Authorization', `Bearer ${clientToken}`);
    expect(privateDenied.status).toBe(403);

    // Consented application allows access check to pass cleanly past authorization (missing disk file returns 404, not 403)
    (prisma.opportunityApplication.findFirst as any).mockResolvedValue({
      id: 'app-1',
      status: ApplicationStatus.SUBMITTED,
    });
    const allowedPastAuthz = await request(app)
      .get('/api/resumes/res-1/download')
      .set('Authorization', `Bearer ${clientToken}`);
    expect(allowedPastAuthz.status).toBe(404);
  });
});
