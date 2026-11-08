import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env file from backend root or monorepo root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const CombinedEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters long"),
  CLIENT_URL: z.string().url(),
  ENCRYPTION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, "ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes)").optional(),
  REFRESH_COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  UPLOAD_DIR: z.string().default('uploads'),

  // GitHub OAuth Configuration
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_CALLBACK_URL: z.string().url().optional(),

  // Email / SMTP Configuration
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.coerce.number().default(587),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().default('noreply@devflow.dev'),

  // AI Configuration
  AI_PROVIDER: z.enum(['mock', 'gemini']).default('mock'),
  GEMINI_API_KEY: z.string().optional().default(process.env.AI_PROVIDER_API_KEY || ''),
  AI_MODEL: z.string().default('gemini-2.0-flash'),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().default(30000),
  AI_MAX_RETRIES: z.coerce.number().default(2),

  // PayPal Configuration
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_BASE_URL: z.string().url().default('https://api-m.sandbox.paypal.com'),
  PAYPAL_WEBHOOK_ID: z.string().optional(),
}).superRefine((parsed, ctx) => {
  // Reject insecure JWT defaults
  const blacklist = ['secret', 'password', 'change_me', 'super_secret'];
  if (blacklist.some(item => parsed.JWT_SECRET.toLowerCase().includes(item))) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "JWT_SECRET contains an insecure default or blacklisted phrase",
      path: ['JWT_SECRET'],
    });
  }

  // Reject mock AI in production
  if (parsed.NODE_ENV === 'production' && parsed.AI_PROVIDER === 'mock') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "AI_PROVIDER cannot be 'mock' in production environments",
      path: ['AI_PROVIDER'],
    });
  }

  // Enforce Gemini API Key when provider is gemini
  if (parsed.AI_PROVIDER === 'gemini' && !parsed.GEMINI_API_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "GEMINI_API_KEY is required when AI_PROVIDER is 'gemini'",
      path: ['GEMINI_API_KEY'],
    });
  }
});

export type ValidatedEnv = z.infer<typeof CombinedEnvSchema>;

export const validateEnv = (config: Record<string, unknown> = process.env): ValidatedEnv => {
  const result = CombinedEnvSchema.safeParse(config);
  if (!result.success) {
    console.error("Environment Validation Failed:", JSON.stringify(result.error.format(), null, 2));
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw new Error("Environment Validation Failed: " + JSON.stringify(result.error.format()));
  }
  return result.data;
};

export const env = validateEnv(process.env);
