import { AuthSession, AuthUser, UserRole } from '@/types';
import {
  clearDevOfflineVault,
  devOfflineLogin,
  devOfflineMockSocialAuth,
  devOfflineRegister,
  isOfflineAuthSimulationEnabled,
} from './devOfflineAuth';

import { API_BASE_URL } from '@/config/api';

const BASE_URL = `${API_BASE_URL}/auth`;
const AUTH_MUTATION_TIMEOUT_MS = 15000;
const oauthExchangeInFlight = new Map<string, Promise<AuthSession>>();

const getBackendUnreachableMessage = () => {
  return import.meta.env.DEV
    ? 'Authentication server timed out or is unreachable. Ensure the backend server (port 3001) and database are running, and open DevFlow on http://localhost:3000.'
    : 'Authentication server timed out or is unreachable. Please verify your backend API deployment status.';
};

function extractApiErrorMessage(errJson: any): string | null {
  const details = errJson?.error?.details;
  if (Array.isArray(details) && details.length > 0) {
    const firstIssueMsg = details.find(
      (issue: any) => typeof issue?.message === 'string' && issue.message.trim()
    )?.message;
    if (firstIssueMsg) {
      return firstIssueMsg;
    }
  } else if (details && typeof details === 'object') {
    for (const val of Object.values(details)) {
      if (Array.isArray(val) && typeof val[0] === 'string' && val[0].trim()) {
        return val[0];
      }
    }
  }

  if (typeof errJson?.error?.message === 'string' && errJson.error.message.trim()) {
    return errJson.error.message;
  }
  if (typeof errJson?.message === 'string' && errJson.message.trim()) {
    return errJson.message;
  }
  return null;
}

async function throwFromFailedAuthResponse(
  res: Response,
  options?: { unauthorizedMessage?: string; conflictMessage?: string }
): Promise<never> {
  const errJson = await res.json().catch(() => ({}));
  if (options?.unauthorizedMessage && res.status === 401) {
    throw new Error(options.unauthorizedMessage);
  }

  const apiMsg = extractApiErrorMessage(errJson);
  if (
    options?.conflictMessage &&
    (res.status === 409 ||
      errJson?.error?.code === 'CONFLICT' ||
      apiMsg?.toLowerCase().includes('already exists'))
  ) {
    throw new Error(options.conflictMessage);
  }

  if (res.status === 503 || errJson?.error?.code === 'DATABASE_UNAVAILABLE') {
    throw new Error(
      apiMsg || 'Authentication database is unavailable. Ensure PostgreSQL is running and try again.'
    );
  }

  if (apiMsg) {
    throw new Error(apiMsg);
  }

  if (res.status >= 500) {
    // Empty/non-JSON 5xx typically indicates Vite proxy ECONNREFUSED to a down backend
    throw new Error('Failed to fetch backend');
  }

  throw new Error(`Authentication request failed with status ${res.status}.`);
}

function isNetworkOrTimeoutError(err: unknown): boolean {
  const e = err as { name?: string; message?: string } | null;
  if (e?.name === 'AbortError' || e?.name === 'TimeoutError') {
    return true;
  }
  if (typeof e?.message === 'string') {
    const msg = e.message.toLowerCase();
    return (
      msg.includes('fetch') ||
      msg.includes('network') ||
      msg.includes('timeout') ||
      msg.includes('timed out')
    );
  }
  return false;
}

function mapBackendAuthResponse(json: any, organization?: string): AuthSession {
  const mappedRole: UserRole =
    json.user.role === 'FREELANCER' ? 'DEVELOPER' : (json.user.role as UserRole);
  const user: AuthUser = {
    id: json.user.id,
    email: json.user.email,
    name: json.user.name,
    role: mappedRole,
    avatarUrl: json.user.avatarUrl,
    bio: json.user.bio,
    githubConnected: Boolean(json.user.githubConnected),
    githubUsername: json.user.githubUsername ?? null,
    githubConnectedAt: json.user.githubConnectedAt ?? null,
    ...(organization !== undefined ? { organization } : {}),
    createdAt: json.user.createdAt,
  };
  return { user, accessToken: json.accessToken };
}

if (!isOfflineAuthSimulationEnabled()) {
  clearDevOfflineVault();
}

export const authService = {
  /**
   * Validates an existing Bearer token against `/api/auth/me`.
   * Returns `valid: false` if the server explicitly rejects the session (401/403).
   */
  async verifyServerSession(accessToken: string): Promise<{ valid: boolean; unreachable?: boolean }> {
    try {
      const res = await fetch(`${BASE_URL}/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) return { valid: true };
      if (res.status === 401 || res.status === 403) return { valid: false };
      return { valid: true, unreachable: true };
    } catch {
      return { valid: true, unreachable: true };
    }
  },
  /**
   * Registers a new user. Calls the backend `/api/auth/register` endpoint.
   * Falls back to offline simulation only when explicitly opted in for development.
   */
  async register(data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    organization?: string;
  }): Promise<AuthSession> {
    const backendRole = data.role === 'DEVELOPER' ? 'FREELANCER' : 'CLIENT';

    try {
      const res = await fetch(`${BASE_URL}/register`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          name: data.name.trim(),
          email: data.email.toLowerCase().trim(),
          password: data.password,
          role: backendRole,
        }),
        signal: AbortSignal.timeout(AUTH_MUTATION_TIMEOUT_MS),
      });

      if (res.ok) {
        const json = await res.json();
        return mapBackendAuthResponse(json, data.organization);
      }

      await throwFromFailedAuthResponse(res, {
        conflictMessage: 'A user with this email address already exists. Please log in.',
      });
    } catch (err: any) {
      if (!isNetworkOrTimeoutError(err) && err?.message !== 'Failed to fetch backend') {
        throw err;
      }
      if (isOfflineAuthSimulationEnabled()) {
        return devOfflineRegister(data);
      }
      throw new Error(getBackendUnreachableMessage());
    }

    throw new Error('Registration failed. Please try again.');
  },

  /**
   * Logs in a user. Validates credentials via `/api/auth/login` and enforces role matching.
   */
  async login(credentials: {
    email: string;
    password: string;
    selectedRole: UserRole;
  }): Promise<AuthSession> {
    const emailLower = credentials.email.toLowerCase().trim();

    try {
      const res = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          email: emailLower,
          password: credentials.password,
        }),
        signal: AbortSignal.timeout(AUTH_MUTATION_TIMEOUT_MS),
      });

      if (res.ok) {
        const json = await res.json();
        const session = mapBackendAuthResponse(json);

        // Strict Role Validation Check
        if (session.user.role !== credentials.selectedRole) {
          const expectedLabel = session.user.role === 'CLIENT' ? 'Client' : 'Developer';
          throw new Error(
            `Role mismatch: This account is registered as a ${expectedLabel}. Please select the ${expectedLabel} role option to log in.`
          );
        }

        return session;
      }

      await throwFromFailedAuthResponse(res, {
        unauthorizedMessage: 'Invalid email or password.',
      });
    } catch (err: any) {
      if (!isNetworkOrTimeoutError(err) && err?.message !== 'Failed to fetch backend') {
        throw err;
      }

      if (isOfflineAuthSimulationEnabled()) {
        return devOfflineLogin(credentials);
      }
      throw new Error(getBackendUnreachableMessage());
    }

    throw new Error('Login failed. Please check your credentials and try again.');
  },

  /**
   * Logs out an authenticated user via `/api/auth/logout`.
   * Guest demo sessions are purely ephemeral and require no server revocation.
   */
  async logout(isGuestSession = false): Promise<void> {
    if (isGuestSession) return;
    try {
      await fetch(`${BASE_URL}/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
        signal: AbortSignal.timeout(2000),
      });
    } catch { }
  },

  /**
   * Checks provider configuration status for Google and Facebook OAuth.
   */
  async getOAuthProvidersStatus(): Promise<{
    google: { configured: boolean; clientIdPrefix?: string };
    facebook: { configured: boolean; appIdPrefix?: string };
  }> {
    try {
      const res = await fetch(`${BASE_URL}/oauth/providers`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        return await res.json();
      }
    } catch { }
    return {
      google: { configured: false },
      facebook: { configured: false },
    };
  },

  /**
   * Initiates Google or Facebook OAuth 2.0 redirect flow with role preservation.
   */
  async initiateSocialAuth(
    provider: 'google' | 'facebook',
    role: UserRole,
    intent: 'login' | 'signup'
  ): Promise<void> {
    const backendRole = role === 'DEVELOPER' ? 'FREELANCER' : 'CLIENT';
    const providerLabel = provider === 'google' ? 'Google' : 'Facebook';

    try {
      const res = await fetch(`${BASE_URL}/oauth/${provider}/initiate`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          role: backendRole,
          intent,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        if (json.authUrl) {
          window.location.href = json.authUrl;
          return;
        }
        throw new Error(`Authorization URL was not returned by the server for ${providerLabel} login.`);
      }

      const errJson = await res.json().catch(() => ({}));
      const errCode = errJson?.error?.code;
      const apiMsg = extractApiErrorMessage(errJson);

      if (
        errCode === 'GOOGLE_OAUTH_NOT_CONFIGURED' ||
        apiMsg?.includes('Google OAuth is not configured')
      ) {
        throw new Error('GOOGLE_OAUTH_NOT_CONFIGURED');
      }
      if (
        errCode === 'FACEBOOK_OAUTH_NOT_CONFIGURED' ||
        apiMsg?.includes('Facebook OAuth is not configured')
      ) {
        throw new Error('FACEBOOK_OAUTH_NOT_CONFIGURED');
      }

      if (apiMsg) {
        throw new Error(apiMsg);
      }

      throw new Error(
        `Unable to start ${providerLabel} authentication (HTTP ${res.status}). Ensure the DevFlow backend server and database are running.`
      );
    } catch (err: any) {
      if (
        err?.message === 'GOOGLE_OAUTH_NOT_CONFIGURED' ||
        err?.message === 'FACEBOOK_OAUTH_NOT_CONFIGURED'
      ) {
        throw err;
      }

      if (isNetworkOrTimeoutError(err)) {
        throw new Error(
          import.meta.env.DEV
            ? `Could not reach the DevFlow authentication server to start ${providerLabel} sign-in. Ensure the backend server (port 3001) and database are running.`
            : `Could not reach the DevFlow authentication server to start ${providerLabel} sign-in. Please verify backend API deployment status.`
        );
      }

      throw err instanceof Error ? err : new Error(`${providerLabel} authentication failed.`);
    }
  },

  /**
   * Exchanges short-lived one-time OAuth code for user session.
   * Deduplicates concurrent calls for the same code (React StrictMode double-mount protection).
   */
  async exchangeOAuthCode(code: string): Promise<AuthSession> {
    const existingRequest = oauthExchangeInFlight.get(code);
    if (existingRequest) {
      return existingRequest;
    }

    const requestPromise = (async (): Promise<AuthSession> => {
      const res = await fetch(`${BASE_URL}/oauth/exchange`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ code }),
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        const json = await res.json();
        return mapBackendAuthResponse(json);
      }

      const errJson = await res.json().catch(() => ({}));
      const apiMsg = extractApiErrorMessage(errJson);
      throw new Error(apiMsg || 'OAuth exchange failed. The code may be expired.');
    })().catch((err) => {
      oauthExchangeInFlight.delete(code);
      throw err;
    });

    oauthExchangeInFlight.set(code, requestPromise);
    return requestPromise;
  },

  /**
   * Development sandbox social authentication for testing OAuth flows without API credentials.
   */
  async mockSocialAuth(params: {
    provider: 'google' | 'facebook';
    email: string;
    name: string;
    role: UserRole;
    avatarUrl?: string;
  }): Promise<AuthSession> {
    const backendRole = params.role === 'DEVELOPER' ? 'FREELANCER' : 'CLIENT';

    try {
      const res = await fetch(`${BASE_URL}/oauth/mock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: params.provider,
          email: params.email.toLowerCase().trim(),
          name: params.name.trim(),
          role: backendRole,
          avatarUrl: params.avatarUrl,
        }),
        signal: AbortSignal.timeout(AUTH_MUTATION_TIMEOUT_MS),
      });

      if (res.ok) {
        const json = await res.json();
        return mapBackendAuthResponse(json);
      }
      await throwFromFailedAuthResponse(res);
    } catch (err: any) {
      if (!isNetworkOrTimeoutError(err) && err?.message !== 'Failed to fetch backend') {
        throw err;
      }
    }

    if (isOfflineAuthSimulationEnabled()) {
      return devOfflineMockSocialAuth({
        email: params.email,
        name: params.name,
        role: params.role,
      });
    }

    throw new Error(
      'Authentication server is unreachable. Sandbox OAuth requires a running development backend.'
    );
  },

  /**
   * Generates an ephemeral Guest / Demo session without creating any permanent account
   * or calling registration APIs.
   * Preserves the selected persona ('CLIENT' | 'DEVELOPER') without exposing personal info.
   */
  async continueAsGuest(guestPersona?: 'CLIENT' | 'DEVELOPER'): Promise<AuthSession> {
    const persona: 'CLIENT' | 'DEVELOPER' = guestPersona === 'CLIENT' ? 'CLIENT' : 'DEVELOPER';
    const isClient = persona === 'CLIENT';

    const guestUser: AuthUser = {
      id: isClient ? `guest_client_${Date.now()}` : `guest_dev_${Date.now()}`,
      email: isClient ? 'client.demo@devflow.demo' : 'developer.demo@devflow.demo',
      name: isClient ? 'Client Guest' : 'Developer Guest',
      role: 'GUEST',
      isGuest: true,
      guestPersona: persona,
      organization: isClient ? 'Demo Client Workspace' : 'Demo Developer Workspace',
      bio: isClient
        ? 'Exploring DevFlow features from a Client perspective in Demo Mode.'
        : 'Exploring DevFlow features from a Developer perspective in Demo Mode.',
      createdAt: new Date().toISOString(),
    };

    return {
      user: guestUser,
      accessToken: `guest_demo_token_${Date.now()}`,
    };
  },
};

