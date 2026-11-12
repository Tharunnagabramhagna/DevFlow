import { z } from 'zod';
import { BaseAIAgent } from './base.agent';
import { AgentType, ResumeExtractionOutput, ResumeExtractionOutputSchema } from '../ai.schema';
import { PromptSanitizer } from '../promptSanitizer';

export interface ResumeParsingInput {
  fileName: string;
  mimeType: string;
  extractedText: string;
}

export class ResumeParsingAgent extends BaseAIAgent<ResumeParsingInput, ResumeExtractionOutput> {
  readonly agentType = AgentType.RESUME_PARSING;
  readonly name = 'Resume Parsing & Career Extraction Agent';
  readonly description =
    'Extracts structured developer skills, experience, projects, education, and links from resume text without fabricating unstated qualifications.';

  protected buildSystemInstruction(): string {
    return `You are DevFlow's Resume Parsing Agent (${AgentType.RESUME_PARSING}).
Extract ONLY information explicitly present in the uploaded resume text.

STRICT GROUNDING RULES:
1. NEVER invent, infer, or embellish job titles, employers, degrees, years of experience, certifications, URLs, or skills that are not clearly supported by the source text.
2. For skills, roles, and projects, provide a short verbatim "sourceExcerpt" (<= 160 chars) quoting the resume where it appears.
3. Categorize skills cleanly as "language", "framework", "database", "tool", or "domain".
4. Assign honest confidence scores (0-100). If a field is ambiguous, partial, or OCR-noisy, give confidence < 70 and add that field name to "lowConfidenceFields" for manual developer review.
5. Set fullName, headline, summary, and yearsOfExperience to null if not reasonably supported in the text.
6. Return strictly valid JSON matching the requested schema.`;
  }

  protected buildPrompt(input: ResumeParsingInput): string {
    const safeFileName = input.fileName.replace(/[\r\n]+/g, ' ').trim();
    const cleanText = PromptSanitizer.wrapUntrustedContent(
      input.extractedText.slice(0, 28000),
      `RESUME_TEXT (${safeFileName})`
    );

    return `Analyze the following uploaded developer resume (${input.mimeType}) and return structured JSON matching:
{
  "fullName": string | null,
  "headline": string | null,
  "summary": string | null,
  "yearsOfExperience": number | null,
  "contactLinks": { "portfolioUrls": string[], "githubUrls": string[], "linkedinUrls": string[] },
  "skills": [{ "name": string, "category": "language"|"framework"|"database"|"tool"|"domain", "yearsUsed": number|null, "confidence": number, "sourceExcerpt": string|null }],
  "previousRoles": [{ "title": string, "company": string|null, "startDate": string|null, "endDate": string|null, "summary": string|null, "confidence": number, "sourceExcerpt": string|null }],
  "projects": [{ "title": string, "role": string|null, "summary": string, "technologies": string[], "url": string|null, "confidence": number, "sourceExcerpt": string|null }],
  "education": [{ "degree": string, "institution": string, "graduationYear": string|null, "confidence": number }],
  "certifications": [{ "name": string, "issuer": string|null, "year": string|null, "confidence": number }],
  "overallConfidence": number,
  "lowConfidenceFields": string[]
}

${cleanText}`;
  }

  protected getOutputSchema(): z.ZodSchema<ResumeExtractionOutput> {
    return ResumeExtractionOutputSchema as unknown as z.ZodSchema<ResumeExtractionOutput>;
  }
}

