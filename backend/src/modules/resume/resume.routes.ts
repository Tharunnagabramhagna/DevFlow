import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticate, requireNonGuest } from '../../middleware/auth';
import { BadRequestError } from '../../utils/errors';
import { RESUME_MAX_BYTES } from './resumeParser.service';
import { resumeController } from './resume.controller';

const resumeMemoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: RESUME_MAX_BYTES,
    files: 1,
  },
});

function handleResumeUploadMiddleware(req: Request, res: Response, next: NextFunction) {
  resumeMemoryUpload.single('file')(req, res, (err: any) => {
    if (!err) {
      return next();
    }
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return next(
        new BadRequestError(
          'Resume file exceeds the 5 MB maximum upload limit.',
          undefined,
          'FILE_TOO_LARGE'
        )
      );
    }
    return next(
      new BadRequestError(err.message || 'Resume upload error', undefined, 'UPLOAD_FAILED')
    );
  });
}

export const resumeRouter = Router();
resumeRouter.use(authenticate, requireNonGuest);

resumeRouter.get('/templates', resumeController.getTemplates);
resumeRouter.get('/profile', resumeController.getStudioProfile);
resumeRouter.put('/profile', resumeController.updateStudioProfile);
resumeRouter.post('/github-sync', resumeController.syncGitHubProfile);

resumeRouter.post('/upload', handleResumeUploadMiddleware, resumeController.uploadResume);
resumeRouter.post('/generate', resumeController.generateResumePreview);
resumeRouter.post('/export', resumeController.exportResume);

resumeRouter.get('/', resumeController.listResumes);
resumeRouter.get('/:id', resumeController.getResumeById);
resumeRouter.get('/:id/download', resumeController.downloadResumeFile);
resumeRouter.post('/:id/parse', resumeController.reparseResume);
resumeRouter.put('/:id/review', resumeController.reviewResumeExtraction);
resumeRouter.post('/:id/set-primary', resumeController.setPrimaryResume);
resumeRouter.delete('/:id', resumeController.deleteResume);

