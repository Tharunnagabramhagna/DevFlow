import { AuthSession, AuthUser, UserRole } from '@/types';
import {
  clearDevOfflineVault,
  devOfflineLogin,
  devOfflineMockSocialAuth,
  devOfflineRegister,
  isOfflineAuthSimulationEnabled,
} from './devOfflineAuth';

const BASE_URL = '/api/auth';

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
   * If the backend is unavailable, gracefully falls back to secure cryptographic storage.
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name.trim(),
          email: data.email.toLowerCase().trim(),
          password: data.password,
          role: backendRole,
        }),
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        const json = await res.json();
        const mappedRole: UserRole = json.user.role === 'FREELANCER' ? 'DEVELOPER' : (json.user.role as UserRole);
        const user: AuthUser = {
          id: json.user.id,
          email: json.user.email,
          name: json.user.name,
          role: mappedRole,
          avatarUrl: json.user.avatarUrl,
          bio: json.user.bio,
          organization: data.organization,
          createdAt: json.user.createdAt,
        };
        return { user, accessToken: json.accessToken };
      } else {
        const errJson = await res.json().catch(() => ({}));
        if (res.status === 409 || errJson.error?.includes?.('already exists') || errJson.message?.includes?.('already exists')) {
          throw new Error('A user with this email address already exists. Please log in.');
        }
        if (errJson.message) {
          throw new Error(errJson.message);
        }
        if (errJson.error?.message) {
          throw new Error(errJson.error.message);
        }
        if (res.status >= 500) {
          throw new Error('Failed to fetch backend');
        }
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch') && !err.message.includes('timeout')) {
        throw err;
      }
      if (isOfflineAuthSimulationEnabled()) {
        return devOfflineRegister(data);
      }
      throw new Error(
        'Authentication server is unreachable. Real account registration requires the backend server.'
      );
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailLower,
          password: credentials.password,
        }),
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        const json = await res.json();
        const registeredRole: UserRole = json.user.role === 'FREELANCER' ? 'DEVELOPER' : (json.user.role as UserRole);

        // Strict Role Validation Check
        if (registeredRole !== credentials.selectedRole) {
          const expectedLabel = registeredRole === 'CLIENT' ? 'Client' : 'Developer';
          throw new Error(
            `Role mismatch: This account is registered as a ${expectedLabel}. Please select the ${expectedLabel} role option to log in.`
          );
        }

        const user: AuthUser = {
          id: json.user.id,
          email: json.user.email,
          name: json.user.name,
          role: registeredRole,
          avatarUrl: json.user.avatarUrl,
          bio: json.user.bio,
          createdAt: json.user.createdAt,
        };
        return { user, accessToken: json.accessToken };
      } else {
        const errJson = await res.json().catch(() => ({}));
        if (res.status === 401) {
          throw new Error('Invalid email or password.');
        }
        if (errJson.message) {
          throw new Error(errJson.message);
        }
        if (errJson.error?.message) {
          throw new Error(errJson.error.message);
        }
        if (res.status >= 500) {
          throw new Error('Failed to fetch backend');
        }
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch') && !err.message.includes('timeout')) {
        throw err;
      }

      if (isOfflineAuthSimulationEnabled()) {
        return devOfflineLogin(credentials);
      }
      throw new Error(
        'Authentication server is unreachable. Real account sign-in requires the backend server.'
      );
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
        signal: AbortSignal.timeout(2000),
      });
    } catch {}
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
    } catch {}
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

    try {
      const res = await fetch(`${BASE_URL}/oauth/${provider}/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          role: backendRole,
          intent,
        }),
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.authUrl) {
          window.location.href = json.authUrl;
          return;
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        if (errJson.error?.code === 'GOOGLE_OAUTH_NOT_CONFIGURED' || errJson.message?.includes('Google OAuth is not configured')) {
          throw new Error('GOOGLE_OAUTH_NOT_CONFIGURED');
        }
        if (errJson.error?.code === 'FACEBOOK_OAUTH_NOT_CONFIGURED' || errJson.message?.includes('Facebook OAuth is not configured')) {
          throw new Error('FACEBOOK_OAUTH_NOT_CONFIGURED');
        }
        if (errJson.message) {
          throw new Error(errJson.message);
        }
      }
    } catch (err: any) {
      if (
        err.message === 'GOOGLE_OAUTH_NOT_CONFIGURED' ||
        err.message === 'FACEBOOK_OAUTH_NOT_CONFIGURED'
      ) {
        throw err;
      }
      if (err.message && !err.message.includes('fetch') && !err.message.includes('timeout')) {
        throw err;
      }
      // If network unreachable, throw configuration notice for offline fallback
      throw new Error(
        provider === 'google'
          ? 'GOOGLE_OAUTH_NOT_CONFIGURED'
          : 'FACEBOOK_OAUTH_NOT_CONFIGURED'
      );
    }
  },

  /**
   * Exchanges short-lived one-time OAuth code for user session.
   */
  async exchangeOAuthCode(code: string): Promise<AuthSession> {
    const res = await fetch(`${BASE_URL}/oauth/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const json = await res.json();
      const mappedRole: UserRole =
        json.user.role === 'FREELANCER' ? 'DEVELOPER' : (json.user.role as UserRole);
      const user: AuthUser = {
        id: json.user.id,
        email: json.user.email,
        name: json.user.name,
        role: mappedRole,
        avatarUrl: json.user.avatarUrl,
        bio: json.user.bio,
        createdAt: json.user.createdAt,
      };
      return { user, accessToken: json.accessToken };
    }

    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.message || 'OAuth exchange failed. The code may be expired.');
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
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        const json = await res.json();
        const mappedRole: UserRole =
          json.user.role === 'FREELANCER' ? 'DEVELOPER' : (json.user.role as UserRole);
        const user: AuthUser = {
          id: json.user.id,
          email: json.user.email,
          name: json.user.name,
          role: mappedRole,
          avatarUrl: json.user.avatarUrl,
          bio: json.user.bio,
          createdAt: json.user.createdAt,
        };
        return { user, accessToken: json.accessToken };
      } else {
        const errJson = await res.json().catch(() => ({}));
        if (errJson.message) {
          throw new Error(errJson.message);
        }
        if (errJson.error?.message) {
          throw new Error(errJson.error.message);
        }
        if (res.status >= 500) {
          throw new Error('Failed to fetch backend');
        }
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch') && !err.message.includes('timeout')) {
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

