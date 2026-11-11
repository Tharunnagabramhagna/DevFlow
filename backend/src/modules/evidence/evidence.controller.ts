import { Request, Response, NextFunction } from 'express';
import { evidenceService } from './evidence.service';
import { SubmitEvidenceSchema } from './evidence.schema';
import { assertVerifiedUser } from '../../middleware/auth';

export class EvidenceController {
  async submitEvidence(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const milestoneId = req.params.milestoneId || req.params.id;

      // Parse JSON body or form-data fields
      const parsedBody = SubmitEvidenceSchema.parse(req.body);

      const evidence = await evidenceService.submitEvidence(
        req.user!.id,
        milestoneId,
        parsedBody,
        req.file
      );

      res.status(201).json(evidence);
    } catch (err) {
      next(err);
    }
  }

  async getMilestoneEvidence(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const milestoneId = req.params.milestoneId || req.params.id;
      const evidenceList = await evidenceService.getMilestoneEvidence(milestoneId);
      res.status(200).json(evidenceList);
    } catch (err) {
      next(err);
    }
  }

  async getEvidenceById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const evidence = await evidenceService.getEvidenceById(req.params.id);
      res.status(200).json(evidence);
    } catch (err) {
      next(err);
    }
  }

  async downloadEvidenceFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = assertVerifiedUser(req);
      const { stream, fileName, mimeType, fileSize } = await evidenceService.downloadEvidenceFile(
        user.id,
        user.role,
        req.params.id
      );

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'");
      if (fileSize > 0) {
        res.setHeader('Content-Length', fileSize);
      }

      stream.pipe(res);
    } catch (err) {
      next(err);
    }
  }

  async deleteEvidence(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = assertVerifiedUser(req);
      const result = await evidenceService.deleteEvidence(
        user.id,
        user.role,
        req.params.id
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const evidenceController = new EvidenceController();

