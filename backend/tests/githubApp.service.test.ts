import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { env } from '../src/config/env';
import { GitHubAppService } from '../src/modules/github/github-app.service';

function createEphemeralRsaPair(): { privateKey: string; publicKey: string } {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
    publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
  });
  return { privateKey, publicKey };
}

function mockJsonResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

describe('Stage 3: GitHubAppService (JWT Auth, Ephemeral Token Cache & Error Classification)', () => {
  let service: GitHubAppService;
  let originalFetch: typeof global.fetch;
  let originalEnv: {
    GITHUB_APP_ID?: string;
    GITHUB_APP_PRIVATE_KEY?: string;
    GITHUB_APP_PRIVATE_KEY_BASE64?: string;
  };
  let keyPair: { privateKey: string; publicKey: string };

  beforeEach(() => {
    service = new GitHubAppService();
    originalFetch = global.fetch;
    originalEnv = {
      GITHUB_APP_ID: env.GITHUB_APP_ID,
      GITHUB_APP_PRIVATE_KEY: env.GITHUB_APP_PRIVATE_KEY,
      GITHUB_APP_PRIVATE_KEY_BASE64: env.GITHUB_APP_PRIVATE_KEY_BASE64,
    };

    keyPair = createEphemeralRsaPair();
    (env as { GITHUB_APP_ID?: string }).GITHUB_APP_ID = '5728161';
    (env as { GITHUB_APP_PRIVATE_KEY?: string }).GITHUB_APP_PRIVATE_KEY = keyPair.privateKey;
    (env as { GITHUB_APP_PRIVATE_KEY_BASE64?: string }).GITHUB_APP_PRIVATE_KEY_BASE64 = undefined;
  });

  afterEach(() => {
    service.clearTokenCache();
    global.fetch = originalFetch;
    (env as { GITHUB_APP_ID?: string }).GITHUB_APP_ID = originalEnv.GITHUB_APP_ID;
    (env as { GITHUB_APP_PRIVATE_KEY?: string }).GITHUB_APP_PRIVATE_KEY =
      originalEnv.GITHUB_APP_PRIVATE_KEY;
    (env as { GITHUB_APP_PRIVATE_KEY_BASE64?: string }).GITHUB_APP_PRIVATE_KEY_BASE64 =
      originalEnv.GITHUB_APP_PRIVATE_KEY_BASE64;
    vi.restoreAllMocks();
  });

  it('signs a valid RS256 App JWT with correct issuer and <=10 minute lifetime', () => {
    const fixedNow = 1_700_000_000_000;
    const token = service.signAppJwt(fixedNow);

    const decoded = jwt.verify(token, keyPair.publicKey, {
      algorithms: ['RS256'],
      clockTimestamp: Math.floor(fixedNow / 1000),
    }) as jwt.JwtPayload;

    expect(decoded.iss).toBe('5728161');
    expect(decoded.iat).toBe(Math.floor(fixedNow / 1000) - 60);
    expect(decoded.exp).toBe(Math.floor(fixedNow / 1000) + 540);
    expect((decoded.exp ?? 0) - (decoded.iat ?? 0)).toBe(600);
  });

  it('supports escaped PEM newlines and base64 private key fallback', () => {
    (env as { GITHUB_APP_PRIVATE_KEY?: string }).GITHUB_APP_PRIVATE_KEY =
      keyPair.privateKey.replace(/\n/g, '\\n');
    const tokenFromEscaped = service.signAppJwt();
    expect(() => jwt.verify(tokenFromEscaped, keyPair.publicKey, { algorithms: ['RS256'] })).not.toThrow();

    (env as { GITHUB_APP_PRIVATE_KEY?: string }).GITHUB_APP_PRIVATE_KEY = undefined;
    (env as { GITHUB_APP_PRIVATE_KEY_BASE64?: string }).GITHUB_APP_PRIVATE_KEY_BASE64 = Buffer.from(
      keyPair.privateKey,
      'utf8'
    ).toString('base64');
    const tokenFromBase64 = service.signAppJwt();
    expect(() => jwt.verify(tokenFromBase64, keyPair.publicKey, { algorithms: ['RS256'] })).not.toThrow();
  });

  it('throws 503 GITHUB_APP_NOT_CONFIGURED when App ID or private key is missing', () => {
    (env as { GITHUB_APP_ID?: string }).GITHUB_APP_ID = undefined;
    expect(service.isConfigured()).toBe(false);
    expect(() => service.signAppJwt()).toThrowError(/not configured/i);
  });

  it('exchanges App JWT for installation token, caches within expiry buffer, and deduplicates concurrent requests', async () => {
    const futureExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const fetchMock = vi.fn().mockImplementation(async () =>
      mockJsonResponse(201, {
        token: 'ghs_ephemeral_token_1',
        expires_at: futureExpiry,
      })
    );
    global.fetch = fetchMock as unknown as typeof global.fetch;

    const [first, second, third] = await Promise.all([
      service.getInstallationToken(9001),
      service.getInstallationToken(9001),
      service.getInstallationToken(9001),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first.token).toBe('ghs_ephemeral_token_1');
    expect(second.token).toBe('ghs_ephemeral_token_1');
    expect(third.token).toBe('ghs_ephemeral_token_1');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.github.com/app/installations/9001/access_tokens');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toMatch(/^Bearer eyJ/);

    // Subsequent call uses in-memory cache
    const cached = await service.getInstallationToken(9001);
    expect(cached.token).toBe('ghs_ephemeral_token_1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refreshes installation token proactively when remaining TTL is inside the 5-minute safety margin', async () => {
    const nearExpiry = new Date(Date.now() + 2 * 60 * 1000).toISOString();
    const freshExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockJsonResponse(201, { token: 'ghs_short_ttl', expires_at: nearExpiry }))
      .mockResolvedValueOnce(mockJsonResponse(201, { token: 'ghs_fresh_ttl', expires_at: freshExpiry }));
    global.fetch = fetchMock as unknown as typeof global.fetch;

    const first = await service.getInstallationToken(42);
    const second = await service.getInstallationToken(42);

    expect(first.token).toBe('ghs_short_ttl');
    expect(second.token).toBe('ghs_fresh_ttl');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retrieves installation metadata using App JWT', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockJsonResponse(200, {
        id: 777,
        app_id: 5728161,
        app_slug: 'devflowwebsite',
        target_type: 'User',
        account: { id: 999111, login: 'tharun-dev', type: 'User' },
        repository_selection: 'selected',
        permissions: { contents: 'read', metadata: 'read', pull_requests: 'read', issues: 'read' },
        suspended_at: null,
        html_url: 'https://github.com/settings/installations/777',
        updated_at: '2026-11-12T15:00:00Z',
      })
    );
    global.fetch = fetchMock as unknown as typeof global.fetch;

    const metadata = await service.getInstallationMetadata(777);
    expect(metadata).toMatchObject({
      id: 777,
      appId: 5728161,
      appSlug: 'devflowwebsite',
      account: { id: 999111, login: 'tharun-dev', type: 'User' },
      repositorySelection: 'selected',
      suspendedAt: null,
    });
  });

  it('lists authorized repositories through the installation access token', async () => {
    const validExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/access_tokens')) {
        return mockJsonResponse(201, { token: 'ghs_repo_list_token', expires_at: validExpiry });
      }
      if (url.includes('/installation/repositories')) {
        expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer ghs_repo_list_token');
        return mockJsonResponse(200, {
          total_count: 1,
          repositories: [
            {
              id: 101,
              name: 'devflow-core',
              full_name: 'tharun-dev/devflow-core',
              private: true,
              default_branch: 'main',
              html_url: 'https://github.com/tharun-dev/devflow-core',
              description: 'Core repo',
              language: 'TypeScript',
              updated_at: '2026-11-12T12:00:00Z',
              pushed_at: '2026-11-12T12:00:00Z',
              owner: { login: 'tharun-dev' },
            },
          ],
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;

    const result = await service.listInstallationRepositories(555, { page: 1, perPage: 25 });
    expect(result.totalCount).toBe(1);
    expect(result.hasMore).toBe(false);
    expect(result.repositories[0]).toMatchObject({
      id: 101,
      owner: 'tharun-dev',
      name: 'devflow-core',
      fullName: 'tharun-dev/devflow-core',
      private: true,
      defaultBranch: 'main',
    });
  });

  it('refreshes token once on 401 and succeeds on retry', async () => {
    const validExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    let repoCallCount = 0;

    const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/access_tokens')) {
        const token = repoCallCount === 0 ? 'ghs_stale_token' : 'ghs_refreshed_token';
        return mockJsonResponse(201, { token, expires_at: validExpiry });
      }
      if (url.includes('/installation/repositories')) {
        repoCallCount += 1;
        const auth = (init?.headers as Record<string, string>).Authorization;
        if (auth === 'Bearer ghs_stale_token') {
          return mockJsonResponse(401, { message: 'Bad credentials' });
        }
        return mockJsonResponse(200, { total_count: 0, repositories: [] });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;

    const res = await service.listInstallationRepositories(300);
    expect(res.repositories).toEqual([]);
    expect(repoCallCount).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('does NOT invalidate cached token on rate-limit 403 or permission 403', async () => {
    const validExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    let mintCalls = 0;
    let mode: 'rate_limit' | 'permission' | 'ok' = 'rate_limit';

    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.endsWith('/access_tokens')) {
        mintCalls += 1;
        return mockJsonResponse(201, { token: 'ghs_valid_cached_token', expires_at: validExpiry });
      }
      if (url.includes('/installation/repositories')) {
        if (mode === 'rate_limit') {
          return mockJsonResponse(
            403,
            { message: 'API rate limit exceeded' },
            { 'x-ratelimit-remaining': '0', 'retry-after': '60' }
          );
        }
        if (mode === 'permission') {
          return mockJsonResponse(403, { message: 'Resource not accessible by integration' });
        }
        return mockJsonResponse(200, { total_count: 0, repositories: [] });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;

    await expect(service.listInstallationRepositories(808)).rejects.toMatchObject({
      statusCode: 429,
      code: 'GITHUB_RATE_LIMITED',
    });

    mode = 'permission';
    await expect(service.listInstallationRepositories(808)).rejects.toMatchObject({
      statusCode: 403,
      code: 'GITHUB_APP_PERMISSION_DENIED',
    });

    // Cached token must still be reused without a second POST /access_tokens call
    mode = 'ok';
    const okRes = await service.listInstallationRepositories(808);
    expect(okRes.repositories).toEqual([]);
    expect(mintCalls).toBe(1);
  });

  it('invalidates cached token and reports suspension or uninstall cleanly', async () => {
    const validExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    let scenario: 'mint_ok' | 'suspended' | 'not_found' | 'server_error' = 'mint_ok';

    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.endsWith('/access_tokens')) {
        if (scenario === 'suspended') {
          return mockJsonResponse(403, { message: 'This installation has been suspended.' });
        }
        if (scenario === 'not_found') {
          return mockJsonResponse(404, { message: 'Not Found' });
        }
        if (scenario === 'server_error') {
          return mockJsonResponse(502, { message: 'Bad Gateway' });
        }
        return mockJsonResponse(201, { token: 'ghs_initial_token', expires_at: validExpiry });
      }
      if (url.endsWith('/app/installations/909')) {
        if (scenario === 'not_found') {
          return mockJsonResponse(404, { message: 'Not Found' });
        }
      }
      if (url.includes('/installation/repositories')) {
        if (scenario === 'suspended') {
          return mockJsonResponse(403, { message: 'This installation has been suspended' });
        }
        if (scenario === 'not_found') {
          return mockJsonResponse(404, { message: 'Not Found' });
        }
        if (scenario === 'server_error') {
          return mockJsonResponse(500, { message: 'Internal Error' });
        }
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;

    // Seed cache first
    await service.getInstallationToken(909);

    // 5xx keeps cached token intact
    scenario = 'server_error';
    await expect(service.listInstallationRepositories(909)).rejects.toMatchObject({
      statusCode: 502,
      code: 'GITHUB_API_UNAVAILABLE',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2); // 1 mint + 1 repo call

    // Suspension invalidates cache, forcing re-mint attempt next time (which also sees suspended)
    scenario = 'suspended';
    await expect(service.listInstallationRepositories(909)).rejects.toMatchObject({
      statusCode: 403,
      code: 'GITHUB_APP_SUSPENDED',
    });
    await expect(service.getInstallationToken(909)).rejects.toMatchObject({
      statusCode: 403,
      code: 'GITHUB_APP_SUSPENDED',
    });

    // Uninstalled 404 on mint/metadata throws 404 GITHUB_APP_INSTALLATION_NOT_FOUND
    scenario = 'not_found';
    await expect(service.getInstallationMetadata(909)).rejects.toMatchObject({
      statusCode: 404,
      code: 'GITHUB_APP_INSTALLATION_NOT_FOUND',
    });
  });

  it('rejects invalid non-positive installation IDs', async () => {
    await expect(service.getInstallationToken(0)).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_INSTALLATION_ID',
    });
    await expect(service.getInstallationMetadata(-5)).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_INSTALLATION_ID',
    });
  });
});
