import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const getTestDatabaseUrl = (): string => {
  if (process.env.TEST_DATABASE_URL) {
    return process.env.TEST_DATABASE_URL;
  }
  const baseUrl = process.env.DATABASE_URL;
  if (baseUrl) {
    try {
      const u = new URL(baseUrl);
      if (!u.pathname.endsWith('_test')) {
        u.pathname = '/devflow_test';
      }
      return u.toString();
    } catch {
      // Fall through to default test URL
    }
  }
  return 'postgresql://devflow:devflow@localhost:5432/devflow_test?schema=public';
};

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 10000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: getTestDatabaseUrl(),
      JWT_SECRET: process.env.JWT_SECRET || 'devflow_test_jwt_auth_signing_token_2026_d8f7a1e3b5c9',
      CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
      AI_PROVIDER: 'mock',
    },
  },
});
