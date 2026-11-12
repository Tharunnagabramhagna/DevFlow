import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env file from backend root or monorepo root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const emptyToUndefined = (val: unknown) => (typeof val === 'string' && val.trim() === '' ? undefined : val);

const PEM_PRIVATE_KEY_PATTERN =
  /^-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----\n[\s\S]+\n-----END (?:[A-Z0-9 ]+ )?PRIVATE KEY-----$/;

/**
 * Normalizes a PEM private key string from environment configuration by unwrapping
 * optional quotes and converting literal `\n` / `\r\n` sequences to real newlines.
 */
export const normalizePemPrivateKey = (val: unknown): string | undefined => {
  const cleaned = emptyToUndefined(val);
  if (typeof cleaned !== 'string') {
    return undefined;
  }

  let normalized = cleaned.trim();
  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1).trim();
  }

  normalized = normalized.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\r\n/g, '\n').trim();
  return normalized.length > 0 ? normalized : undefined;
};

const isValidBase64PemPrivateKey = (val: string): boolean => {
  const compact = val.replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(compact) || compact.length % 4 !== 0) {
    return false;
  }
  const decoded = normalizePemPrivateKey(Buffer.from(compact, 'base64').toString('utf8'));
  return Boolean(decoded && PEM_PRIVATE_KEY_PATTERN.test(decoded));
};

const isHttpOrHttpsUrl = (val: string): boolean => {
  try {
    const parsed = new URL(val);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const parseTrustProxySetting = (val?: string): boolean | number | string => {
  if (!val || val === 'false' || val === '0') {
    return false;
  }
  if (/^[1-5]$/.test(val)) {
    return Number.parseInt(val, 10);
  }
  return val;
};

export const CombinedEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  TRUST_PROXY: z.preprocess(
    emptyToUndefined,
    z
      .enum(['false', '0', '1', '2', '3', '4', '5', 'loopback', 'linklocal', 'uniquelocal'])
      .optional()
  ),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.preprocess(
    (val) => val || process.env.JWT_ACCESS_SECRET,
    z.string({ required_error: 'JWT_SECRET (or JWT_ACCESS_SECRET) is required' }).min(32, "JWT_SECRET must be at least 32 characters long")
  ),
  CLIENT_URL: z.preprocess(
    emptyToUndefined,
    process.env.NODE_ENV === 'production'
      ? z.string({ required_error: 'CLIENT_URL is required in production' }).url()
      : z.string().url().default('http://localhost:3000')
  ),
  ENCRYPTION_KEY: z.preprocess(
    emptyToUndefined,
    z.string().regex(/^[0-9a-fA-F]{64}$/, "ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes)").optional()
  ),
  REFRESH_COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  UPLOAD_DIR: z.string().default('uploads'),

  // GitHub OAuth Configuration
  GITHUB_CLIENT_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  GITHUB_CLIENT_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  GITHUB_CALLBACK_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  GITHUB_WEBHOOK_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),

  // GitHub App Configuration (DevFlowWebsite)
  GITHUB_APP_ID: z.preprocess(
    emptyToUndefined,
    z.string().regex(/^[1-9]\d*$/, 'GITHUB_APP_ID must be a positive numeric GitHub App ID').optional()
  ),
  GITHUB_APP_SLUG: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .regex(/^[a-zA-Z0-9-]+$/, 'GITHUB_APP_SLUG must contain only letters, numbers, and hyphens')
      .optional()
  ),
  GITHUB_APP_PRIVATE_KEY: z.preprocess(
    normalizePemPrivateKey,
    z
      .string()
      .regex(
        PEM_PRIVATE_KEY_PATTERN,
        'GITHUB_APP_PRIVATE_KEY must be a valid PEM-encoded private key'
      )
      .optional()
  ),
  GITHUB_APP_PRIVATE_KEY_BASE64: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .refine(
        isValidBase64PemPrivateKey,
        'GITHUB_APP_PRIVATE_KEY_BASE64 must base64-decode to a valid PEM-encoded private key'
      )
      .optional()
  ),
  GITHUB_APP_ALLOWED_ACCOUNT_ID: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .regex(/^[1-9]\d*$/, 'GITHUB_APP_ALLOWED_ACCOUNT_ID must be a positive numeric GitHub account ID')
      .optional()
  ),
  GITHUB_APP_WEBHOOK_SECRET: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  GITHUB_APP_WEBHOOK_URL: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .url()
      .refine(isHttpOrHttpsUrl, 'GITHUB_APP_WEBHOOK_URL must use http or https protocol')
      .optional()
  ),
  GITHUB_APP_SETUP_URL: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .url()
      .refine(isHttpOrHttpsUrl, 'GITHUB_APP_SETUP_URL must use http or https protocol')
      .optional()
  ),

  // Email / SMTP Configuration
  EMAIL_HOST: z.preprocess(emptyToUndefined, z.string().optional()),
  EMAIL_PORT: z.coerce.number().default(587),
  EMAIL_USER: z.preprocess(emptyToUndefined, z.string().optional()),
  EMAIL_PASSWORD: z.preprocess(emptyToUndefined, z.string().optional()),
  EMAIL_FROM: z.string().default('noreply@devflow.dev'),

  // AI Configuration
  AI_PROVIDER: z.enum(['mock', 'gemini']).default('mock'),
  GEMINI_API_KEY: z.preprocess(
    emptyToUndefined,
    z.string().optional().default(process.env.AI_PROVIDER_API_KEY || '')
  ),
  AI_MODEL: z.string().default('gemini-3.5-flash'),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().default(30000),
  AI_MAX_RETRIES: z.coerce.number().default(2),

  // PayPal Configuration
  PAYPAL_CLIENT_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  PAYPAL_CLIENT_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  PAYPAL_BASE_URL: z.preprocess(
    emptyToUndefined,
    z.string().url().default('https://api-m.sandbox.paypal.com')
  ),
  PAYPAL_WEBHOOK_ID: z.preprocess(emptyToUndefined, z.string().optional()),

  // Google OAuth Configuration
  GOOGLE_CLIENT_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  GOOGLE_CLIENT_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  GOOGLE_CALLBACK_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),

  // Facebook OAuth Configuration
  FACEBOOK_APP_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  FACEBOOK_APP_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  FACEBOOK_CALLBACK_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  FACEBOOK_GRAPH_API_VERSION: z.preprocess(
    (val) => {
      if (!val || typeof val !== 'string' || val.trim() === '') return 'v27.0';
      const clean = val.trim();
      return clean.startsWith('v') ? clean : `v${clean}`;
    },
    z.string().default('v27.0')
  ),
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

/**
 * Resolves the normalized GitHub App PEM private key from either
 * GITHUB_APP_PRIVATE_KEY or GITHUB_APP_PRIVATE_KEY_BASE64.
 */
export const resolveGitHubAppPrivateKey = (
  config: Pick<ValidatedEnv, 'GITHUB_APP_PRIVATE_KEY' | 'GITHUB_APP_PRIVATE_KEY_BASE64'> = env
): string | undefined => {
  if (config.GITHUB_APP_PRIVATE_KEY) {
    return normalizePemPrivateKey(config.GITHUB_APP_PRIVATE_KEY);
  }
  if (config.GITHUB_APP_PRIVATE_KEY_BASE64) {
    const compact = config.GITHUB_APP_PRIVATE_KEY_BASE64.replace(/\s+/g, '');
    return normalizePemPrivateKey(Buffer.from(compact, 'base64').toString('utf8'));
  }
  return undefined;
};

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
