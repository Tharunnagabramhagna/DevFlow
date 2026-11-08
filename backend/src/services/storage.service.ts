import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { env } from '../config/env';
import { BadRequestError, NotFoundError } from '../utils/errors';
import logger from '../utils/logger';

export interface StorageFileResult {
  key: string;
  size: number;
  mimeType: string;
  originalName: string;
}

export interface IStorageService {
  saveFile(file: Express.Multer.File): Promise<StorageFileResult>;
  saveBuffer(buffer: Buffer, originalName: string, mimeType: string): Promise<StorageFileResult>;
  getFileStream(key: string): fs.ReadStream;
  deleteFile(key: string): Promise<void>;
  fileExists(key: string): Promise<boolean>;
}

export class LocalStorageService implements IStorageService {
  private baseDir: string;

  constructor(uploadDir?: string) {
    this.baseDir = path.resolve(process.cwd(), uploadDir || env.UPLOAD_DIR || 'uploads');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private resolveSafePath(key: string): string {
    // Prevent directory traversal attacks
    const sanitizedKey = key.replace(/^[/\\]+/, '');
    const resolvedPath = path.resolve(this.baseDir, sanitizedKey);

    if (!resolvedPath.startsWith(this.baseDir)) {
      throw new BadRequestError('Invalid file key: Path traversal attempt detected');
    }

    return resolvedPath;
  }

  async saveFile(file: Express.Multer.File): Promise<StorageFileResult> {
    const ext = path.extname(file.originalname);
    const sanitizedBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const randomSuffix = crypto.randomBytes(8).toString('hex');
    const filename = `${Date.now()}_${sanitizedBase}_${randomSuffix}${ext}`;
    const destinationPath = path.join(this.baseDir, filename);

    if (file.buffer) {
      await fs.promises.writeFile(destinationPath, file.buffer);
    } else if (file.path) {
      await fs.promises.copyFile(file.path, destinationPath);
      await fs.promises.unlink(file.path).catch(() => {});
    } else {
      throw new BadRequestError('No file data available to save');
    }

    return {
      key: filename,
      size: file.size,
      mimeType: file.mimetype,
      originalName: file.originalname,
    };
  }

  async saveBuffer(buffer: Buffer, originalName: string, mimeType: string): Promise<StorageFileResult> {
    const ext = path.extname(originalName);
    const sanitizedBase = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const randomSuffix = crypto.randomBytes(8).toString('hex');
    const filename = `${Date.now()}_${sanitizedBase}_${randomSuffix}${ext}`;
    const destinationPath = path.join(this.baseDir, filename);

    await fs.promises.writeFile(destinationPath, buffer);

    return {
      key: filename,
      size: buffer.length,
      mimeType,
      originalName,
    };
  }

  getFileStream(key: string): fs.ReadStream {
    const filePath = this.resolveSafePath(key);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('Stored file not found on disk');
    }
    return fs.createReadStream(filePath);
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const filePath = this.resolveSafePath(key);
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const filePath = this.resolveSafePath(key);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (err) {
      logger.warn('Failed to delete file from disk storage', { key, error: err });
    }
  }
}

export const storageService = new LocalStorageService();

// Allowed MIME types for evidence attachments (Strict: executable HTML/scripts explicitly excluded)
export const ALLOWED_EVIDENCE_MIME_TYPES = [
  // Documents
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  // Images
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  // Archives
  'application/zip',
  'application/x-zip-compressed',
  'application/gzip',
  'application/x-tar',
];

export const MAX_EVIDENCE_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export const evidenceUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_EVIDENCE_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_EVIDENCE_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestError(`Unsupported file type: ${file.mimetype}. Allowed types include PDF, Images, Archives, and Text documents.`));
    }
  },
});

