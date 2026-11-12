import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { assertVerifiedUser } from '../../middleware/auth';
import { BadRequestError, ForbiddenError } from '../../utils/errors';
import { RESUME_TEMPLATES } from './resumeExport.service';
import { SUPPORTED_RESUME_FORMATS, RESUME_MAX_BYTES } from './resumeParser.service';
import { resumeService } from './resume.service';
import {
  ExportResumeSchema,
  GenerateResumeTemplateSchema,
  ReviewResumeExtractionSchema,
  UpdateCareerProfileSchema,
} from './resume.schema';

function assertDeveloperOrAdmin(role: Role): void {
  if (role === Role.CLIENT) {
    throw new ForbiddenError('Resume Studio is restricted to Developer accounts.');
  }
}

export class ResumeController {
  async getTemplates(_req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json({
        templates: RESUME_TEMPLATES,
        supportedUploadFormats: SUPPORTED_RESUME_FORMATS,
        maxUploadBytes: RESUME_MAX_BYTES,
      });
    } catch (err) {
      next(err);
    }
  }

  async getStudioProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = assertVerifiedUser(req);
      assertDeveloperOrAdmin(user.role);
      const state = await resumeService.getDeveloperStudioState(user.id);
      res.status(200).json(state);
    } catch (err) {
      next(err);
    }
  }

  async updateStudioProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = assertVerifiedUser(req);
      assertDeveloperOrAdmin(user.role);
      const parsed = UpdateCareerProfileSchema.parse(req.body);
      const state = await resumeService.updateCareerProfile(user.id, parsed);
      res.status(200).json(state);
    } catch (err) {
      next(err);
    }
  }

  async syncGitHubProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = assertVerifiedUser(req);
      assertDeveloperOrAdmin(user.role);
      const state = await resumeService.syncGitHubToCareerProfile(user.id);
      res.status(200).json(state);
    } catch (err) {
      next(err);
    }
  }

  async uploadResume(req: Request, res: Response, next: NextFunction) {
    try {
      const user = assertVerifiedUser(req);
      assertDeveloperOrAdmin(user.role);

      if (!req.file) {
        throw new BadRequestError('Please attach a resume file (.pdf, .docx, or .txt).');
      }

      const replaceResumeId =
        typeof req.body?.replaceResumeId === 'string' && req.body.replaceResumeId.trim()
          ? req.body.replaceResumeId.trim()
          : undefined;
      const allowDuplicate = req.body?.allowDuplicate === 'true' || req.body?.allowDuplicate === true;

      const resume = await resumeService.uploadAndParseResume({
        userId: user.id,
        file: req.file,
        replaceResumeId,
        allowDuplicate,
      });

      res.status(201).json({ resume });
    } catch (err) {
      next(err);
    }
  }

  async listResumes(req: Request, res: Response, next: NextFunction) {
    try {
      const user = assertVerifiedUser(req);
      assertDeveloperOrAdmin(user.role);
      const resumes = await resumeService.listResumes(user.id);
      res.status(200).json({ resumes });
    } catch (err) {
      next(err);
    }
  }

  async getResumeById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = assertVerifiedUser(req);
      assertDeveloperOrAdmin(user.role);
      const resume = await resumeService.getResumeById(req.params.id, user.id);
      res.status(200).json({ resume });
    } catch (err) {
      next(err);
    }
  }

  async reparseResume(req: Request, res: Response, next: NextFunction) {
    try {
      const user = assertVerifiedUser(req);
      assertDeveloperOrAdmin(user.role);
      const resume = await resumeService.runAiResumeParse(req.params.id, user.id);
      res.status(200).json({ resume });
    } catch (err) {
      next(err);
    }
  }

  async reviewResumeExtraction(req: Request, res: Response, next: NextFunction) {
    try {
      const user = assertVerifiedUser(req);
      assertDeveloperOrAdmin(user.role);
      const parsed = ReviewResumeExtractionSchema.parse(req.body);
      const state = await resumeService.reviewAndApplyResumeExtraction(
        req.params.id,
        user.id,
        parsed
      );
      res.status(200).json(state);
    } catch (err) {
      next(err);
    }
  }

  async setPrimaryResume(req: Request, res: Response, next: NextFunction) {
    try {
      const user = assertVerifiedUser(req);
      assertDeveloperOrAdmin(user.role);
      const state = await resumeService.setPrimaryResume(req.params.id, user.id);
      res.status(200).json(state);
    } catch (err) {
      next(err);
    }
  }

  async deleteResume(req: Request, res: Response, next: NextFunction) {
    try {
      const user = assertVerifiedUser(req);
      assertDeveloperOrAdmin(user.role);
      const result = await resumeService.deleteResume(req.params.id, user.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async downloadResumeFile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = assertVerifiedUser(req);
      const result = await resumeService.getAuthorizedResumeFileDownload(req.params.id, user);

      const safeFilename = result.fileName.replace(/["\r\n]/g, '_');
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, no-store');

      result.stream.on('error', next);
      result.stream.pipe(res);
    } catch (err) {
      next(err);
    }
  }

  async generateResumePreview(req: Request, res: Response, next: NextFunction) {
    try {
      const user = assertVerifiedUser(req);
      assertDeveloperOrAdmin(user.role);
      const parsed = GenerateResumeTemplateSchema.parse(req.body);
      const document = await resumeService.buildStructuredDocumentFromProfile(
        user.id,
        parsed.templateId,
        parsed.customSections,
        true
      );
      res.status(200).json({ document });
    } catch (err) {
      next(err);
    }
  }

  async exportResume(req: Request, res: Response, next: NextFunction) {
    try {
      const user = assertVerifiedUser(req);
      assertDeveloperOrAdmin(user.role);
      const parsed = ExportResumeSchema.parse(req.body);
      const exported = await resumeService.exportResumeDocument(user.id, parsed);

      res.setHeader('Content-Type', exported.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${exported.fileName}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, no-store');
      res.status(200).send(exported.buffer);
    } catch (err) {
      next(err);
    }
  }
}

export const resumeController = new ResumeController();

