import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 10000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://devflow:devflow@localhost:5432/devflow?schema=public',
      JWT_SECRET: 'devflow_test_jwt_auth_signing_token_2026_d8f7a1e3b5c9',
      CLIENT_URL: 'http://localhost:3000',
    },
  },
});
