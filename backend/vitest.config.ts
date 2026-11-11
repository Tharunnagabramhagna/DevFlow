import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from project root (.env) or backend (.env)
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * Validates a test database URL according to strict isolation requirements.
 *
 * Requirements:
 * 1. Validate that the URL uses PostgreSQL ('postgresql:' or 'postgres:').
 * 2. Validate that a hostname is present.
 * 3. Validate that the database name is exactly 'devflow_test'.
 * 4. Provide clear errors without exposing credentials or full connection strings.
 * 5. Never rewrite or redirect the primary DATABASE_URL.
 */
export function validateTestDatabaseUrl(testDbUrl: string): string {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(testDbUrl);
  } catch {
    throw new Error(
      `[CONFIG_ERROR] TEST_DATABASE_URL is not a valid URL format.\n` +
      `Please ensure TEST_DATABASE_URL follows the format: postgresql://<user>:<password>@<host>:<port>/devflow_test?schema=public`
    );
  }

  // 1. Validate PostgreSQL protocol ('postgresql:' or 'postgres:')
  if (parsedUrl.protocol !== 'postgresql:' && parsedUrl.protocol !== 'postgres:') {
    throw new Error(
      `[CONFIG_ERROR] Invalid TEST_DATABASE_URL protocol: '${parsedUrl.protocol}'.\n` +
      `TEST_DATABASE_URL must use the 'postgresql:' or 'postgres:' protocol.`
    );
  }

  // 2. Validate that a hostname is present
  if (!parsedUrl.hostname || parsedUrl.hostname.trim() === '') {
    throw new Error(
      `[CONFIG_ERROR] TEST_DATABASE_URL must include a valid hostname.\n` +
      `Please ensure a database host (e.g. 'localhost' or '127.0.0.1') is specified.`
    );
  }

  // 3. Validate database name is exactly 'devflow_test'
  const databaseName = parsedUrl.pathname.replace(/^\//, '').split('?')[0];

  if (databaseName !== 'devflow_test') {
    throw new Error(
      `[SECURITY_ERROR] Database test isolation violation: TEST_DATABASE_URL must target exactly 'devflow_test', but was configured for target '${databaseName}'.\n` +
      `Tests are strictly prohibited from connecting to primary or development databases.\n` +
      `Please configure TEST_DATABASE_URL to target 'devflow_test'.`
    );
  }

  return testDbUrl;
}

/**
 * Resolves the database URL for Vitest test execution.
 *
 * - When TEST_DATABASE_URL is provided, it is strictly validated against 'devflow_test'.
 * - When TEST_DATABASE_URL is not configured:
 *   - Pure unit tests (which mock Prisma) remain fully runnable without establishing
 *     an actual PostgreSQL connection.
 *   - Does not silently fall back to DATABASE_URL.
 *   - Injects a non-routable placeholder URL targeting 'devflow_test' to satisfy Zod
 *     environment validation while ensuring any live database test fails safely
 *     rather than reaching the primary development database.
 */
export function resolveTestDatabaseUrl(): string {
  const testDbUrl = process.env.TEST_DATABASE_URL;

  if (testDbUrl && testDbUrl.trim() !== '') {
    return validateTestDatabaseUrl(testDbUrl);
  }

  // Isolated non-routable placeholder targeting 'devflow_test' on port 0.
  // Never uses or falls back to DATABASE_URL.
  return 'postgresql://devflow_unit_test:mock_isolated_password@127.0.0.1:0/devflow_test?schema=public';
}

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 10000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: resolveTestDatabaseUrl(),
      JWT_SECRET: process.env.JWT_SECRET || 'devflow_test_jwt_auth_signing_token_2026_d8f7a1e3b5c9',
      CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
      AI_PROVIDER: 'mock',
    },
  },
});
