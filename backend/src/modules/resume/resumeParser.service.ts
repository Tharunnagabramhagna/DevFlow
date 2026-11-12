import crypto from 'crypto';
import path from 'path';
import type pdfParseFn from 'pdf-parse';
// Direct submodule import avoids pdf-parse/index.js self-test ENOENT side-effect under ESM/Vitest loaders
// @ts-expect-error -- internal CJS entrypoint exported by pdf-parse
import pdfParseModule from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';
import { BadRequestError } from '../../utils/errors';

const pdfParse = pdfParseModule as unknown as typeof pdfParseFn;

export const RESUME_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export const SUPPORTED_RESUME_FORMATS = [
  {
    extension: '.pdf',
    mimeType: 'application/pdf',
    label: 'PDF (.pdf)',
    parser: 'pdf-parse',
  },
  {
    extension: '.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    label: 'Microsoft Word (.docx)',
    parser: 'mammoth',
  },
  {
    extension: '.txt',
    mimeType: 'text/plain',
    label: 'Plain Text (.txt fallback)',
    parser: 'utf8-plain-text',
  },
] as const;

const DISALLOWED_EXECUTABLE_OR_SCRIPT_PATTERNS = [
  /<script\b/i,
  /<iframe\b/i,
  /javascript:/i,
];

export interface ValidatedResumeParseResult {
  detectedMimeType: string;
  fileExtension: '.pdf' | '.docx' | '.txt';
  parserMethod: 'pdf-parse' | 'mammoth' | 'plain-text';
  sha256Hash: string;
  extractedText: string;
}

function hasExecutableBinaryHeader(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  // MZ (Windows PE/EXE/DLL), \x7fELF (Linux binary), #! (shebang script), Mach-O
  if (buffer[0] === 0x4d && buffer[1] === 0x5a) return true;
  if (buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
    return true;
  }
  if (buffer[0] === 0x23 && buffer[1] === 0x21) return true;
  // Legacy MS OLE2 (.doc / .msi / .xls binary)
  if (
    buffer.length >= 8 &&
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0
  ) {
    return true;
  }
  return false;
}

function detectActualResumeType(
  buffer: Buffer,
  originalName: string,
  declaredMimeType: string
): { ext: '.pdf' | '.docx' | '.txt'; detectedMime: string } {
  if (buffer.length === 0) {
    throw new BadRequestError('Uploaded resume file is empty.', undefined, 'EMPTY_FILE');
  }
  if (buffer.length > RESUME_MAX_BYTES) {
    throw new BadRequestError(
      'Resume exceeds the 5 MB maximum upload limit.',
      undefined,
      'FILE_TOO_LARGE'
    );
  }
  if (hasExecutableBinaryHeader(buffer)) {
    throw new BadRequestError(
      'Executable, legacy binary (.doc), or script files are rejected for security reasons. Upload a valid .pdf, .docx, or .txt file.',
      undefined,
      'UNSUPPORTED_FILE_TYPE'
    );
  }

  const ext = path.extname(originalName || '').toLowerCase();

  // 1. Validate PDF magic signature: %PDF-
  const headerAscii = buffer.subarray(0, 8).toString('latin1');
  if (headerAscii.startsWith('%PDF-')) {
    if (ext !== '.pdf') {
      throw new BadRequestError(
        'File extension does not match PDF content signature.',
        undefined,
        'MIME_MISMATCH'
      );
    }
    return { ext: '.pdf', detectedMime: 'application/pdf' };
  }

  // 2. Validate DOCX OpenXML ZIP signature + internal word/document.xml structure
  const isZipHeader =
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05);

  if (isZipHeader) {
    if (ext !== '.docx') {
      throw new BadRequestError(
        'Only Microsoft Word .docx archives are supported (other archive formats are rejected).',
        undefined,
        'UNSUPPORTED_FILE_TYPE'
      );
    }
    if (!buffer.includes(Buffer.from('word/document.xml', 'utf8'))) {
      throw new BadRequestError(
        'Invalid or corrupt .docx archive: missing word/document.xml payload.',
        undefined,
        'CORRUPT_DOCUMENT'
      );
    }
    return {
      ext: '.docx',
      detectedMime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  }

  // 3. Plain text validation (.txt fallback only)
  if (ext === '.txt' && (declaredMimeType === 'text/plain' || declaredMimeType === 'application/octet-stream' || !declaredMimeType)) {
    // Reject NUL bytes (binary content disguised as .txt)
    if (buffer.includes(0x00)) {
      throw new BadRequestError(
        'Invalid plain-text resume: binary null bytes detected.',
        undefined,
        'INVALID_FILE_CONTENT'
      );
    }
    const decoded = buffer.toString('utf8');
    // Check control-character ratio (excluding \t \n \r)
    let controlCount = 0;
    const sample = decoded.slice(0, 4096);
    for (let i = 0; i < sample.length; i++) {
      const code = sample.charCodeAt(i);
      if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
        controlCount++;
      }
    }
    if (sample.length > 0 && controlCount / sample.length > 0.03) {
      throw new BadRequestError(
        'Uploaded .txt file contains non-text control characters.',
        undefined,
        'INVALID_FILE_CONTENT'
      );
    }
    if (DISALLOWED_EXECUTABLE_OR_SCRIPT_PATTERNS.some((rx) => rx.test(decoded))) {
      throw new BadRequestError(
        'Uploaded .txt file contains disallowed script or HTML markup.',
        undefined,
        'UNSAFE_FILE_CONTENT'
      );
    }
    return { ext: '.txt', detectedMime: 'text/plain' };
  }

  if (ext === '.doc') {
    throw new BadRequestError(
      'Legacy .doc format is not supported for security and parser reliability reasons. Please save and upload as .pdf or .docx.',
      undefined,
      'UNSUPPORTED_FILE_TYPE'
    );
  }

  throw new BadRequestError(
    `Unsupported resume format "${ext || declaredMimeType}". Accepted formats: PDF (.pdf), Word (.docx), and Plain Text (.txt).`,
    undefined,
    'UNSUPPORTED_FILE_TYPE'
  );
}

export async function validateAndExtractResumeText(
  buffer: Buffer,
  originalName: string,
  declaredMimeType: string
): Promise<ValidatedResumeParseResult> {
  const { ext, detectedMime } = detectActualResumeType(buffer, originalName, declaredMimeType);
  const sha256Hash = crypto.createHash('sha256').update(buffer).digest('hex');

  let extractedText = '';
  let parserMethod: 'pdf-parse' | 'mammoth' | 'plain-text' = 'plain-text';

  try {
    if (ext === '.pdf') {
      parserMethod = 'pdf-parse';
      // Isolate into an unpooled ArrayBuffer so pdf-parse's pdf.js does not read Node's Buffer slab outside byteOffset
      const isolatedPdfBytes = new Uint8Array(new ArrayBuffer(buffer.length));
      isolatedPdfBytes.set(buffer);
      const parsed = await pdfParse(isolatedPdfBytes as unknown as Buffer);
      extractedText = (parsed.text || '').trim();
    } else if (ext === '.docx') {
      parserMethod = 'mammoth';
      const result = await mammoth.extractRawText({ buffer });
      extractedText = (result.value || '').trim();
    } else {
      parserMethod = 'plain-text';
      extractedText = buffer.toString('utf8').trim();
    }
  } catch (err) {
    throw new BadRequestError(
      `Failed to read ${ext} document contents. The file may be corrupted or encrypted: ${
        err instanceof Error ? err.message : 'Parser error'
      }`,
      undefined,
      'CORRUPT_DOCUMENT'
    );
  }

  if (!extractedText || extractedText.length < 20) {
    throw new BadRequestError(
      'The uploaded resume does not contain readable text (e.g., scanned image-only PDF). Please upload a text-based PDF, DOCX, or TXT file.',
      undefined,
      'UNREADABLE_RESUME_TEXT'
    );
  }

  return {
    detectedMimeType: detectedMime,
    fileExtension: ext,
    parserMethod,
    sha256Hash,
    extractedText: extractedText.replace(/\r\n/g, '\n').slice(0, 60000),
  };
}
