import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { CombinedEnvSchema } from '../src/config/env';

describe('Phase 1 Foundation: Server & Health Endpoints', () => {
  it('GET / returns 200 with service metadata', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('version', '0.1.0');
    expect(res.body.message).toContain('DevFlow Backend Service');
    expect(res.body.status).toBe('active');
  });

  it('GET /api/health returns valid health envelope structure', async () => {
    const res = await request(app).get('/api/health');
    // Depending on whether local PostgreSQL is currently running, status is either 200 (healthy) or 503 (degraded)
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('service', 'devflow-backend');
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('environment');
    expect(res.body).toHaveProperty('database');
    expect(res.body.database).toHaveProperty('status');
  });

  it('Environment Schema Validation rejects insecure default JWT secret', () => {
    const insecureConfig = {
      NODE_ENV: 'development',
      PORT: 3001,
      DATABASE_URL: 'postgresql://devflow:devflow@localhost:5432/devflow?schema=public',
      JWT_SECRET: 'this_is_a_super_secret_jwt_token_2026', // contains 'super_secret'
      CLIENT_URL: 'http://localhost:5173',
    };

    const parsed = CombinedEnvSchema.safeParse(insecureConfig);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issues = parsed.error.issues;
      expect(issues.some((i) => i.message.includes('insecure default or blacklisted phrase'))).toBe(true);
    }
  });

  it('Environment Schema Validation accepts valid production-grade JWT secret', () => {
    const validConfig = {
      NODE_ENV: 'development',
      PORT: 3001,
      DATABASE_URL: 'postgresql://devflow:devflow@localhost:5432/devflow?schema=public',
      JWT_SECRET: 'devflow_local_jwt_auth_signing_token_2026_d8f7a1e3b5c9',
      CLIENT_URL: 'http://localhost:5173',
    };

    const parsed = CombinedEnvSchema.safeParse(validConfig);
    expect(parsed.success).toBe(true);
  });
});

