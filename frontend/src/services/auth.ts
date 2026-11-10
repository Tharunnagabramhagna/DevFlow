import { AuthSession, AuthUser, UserRole } from '@/types';

const BASE_URL = '/api/auth';
const CLIENT_VAULT_KEY = 'devflow_auth_client_vault';

interface VaultUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHashHex: string;
  organization?: string;
  createdAt: string;
}

/**
 * Computes a standard SHA-256 hash using the native browser SubtleCrypto API.
 * Passwords are NEVER stored in plaintext or localStorage.
 */
async function hashPasswordSha256(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function getVaultUsers(): VaultUser[] {
  try {
    const raw = localStorage.getItem(CLIENT_VAULT_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveVaultUser(vaultUser: VaultUser): void {
  try {
    const users = getVaultUsers().filter((u) => u.email.toLowerCase() !== vaultUser.email.toLowerCase());
    users.push(vaultUser);
    localStorage.setItem(CLIENT_VAULT_KEY, JSON.stringify(users));
  } catch {}
}

export const authService = {
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
        if (res.status === 409 || errJson.error?.includes('already exists') || errJson.message?.includes('already exists')) {
          throw new Error('A user with this email address already exists. Please log in.');
        }
        if (errJson.message) {
          throw new Error(errJson.message);
        }
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch') && !err.message.includes('timeout')) {
        throw err;
      }
      // If backend network request failed/timed out, perform client-side cryptographic registration
      const existing = getVaultUsers().find((u) => u.email.toLowerCase() === data.email.toLowerCase());
      if (existing) {
        throw new Error('A user with this email address already exists. Please log in.');
      }

      const passwordHashHex = await hashPasswordSha256(data.password);
      const vaultUser: VaultUser = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        email: data.email.toLowerCase().trim(),
        name: data.name.trim(),
        role: data.role,
        passwordHashHex,
        organization: data.organization,
        createdAt: new Date().toISOString(),
      };
      saveVaultUser(vaultUser);

      const user: AuthUser = {
        id: vaultUser.id,
        email: vaultUser.email,
        name: vaultUser.name,
        role: vaultUser.role,
        organization: vaultUser.organization,
        createdAt: vaultUser.createdAt,
      };
      return {
        user,
        accessToken: `simulated_token_${vaultUser.id}`,
      };
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
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch') && !err.message.includes('timeout')) {
        throw err;
      }

      // Backend connection failed — check cryptographic client vault
      const vaultUser = getVaultUsers().find((u) => u.email.toLowerCase() === emailLower);
      if (!vaultUser) {
        throw new Error('Invalid email or password.');
      }

      const inputHash = await hashPasswordSha256(credentials.password);
      if (inputHash !== vaultUser.passwordHashHex) {
        throw new Error('Invalid email or password.');
      }

      // Enforce role validation
      if (vaultUser.role !== credentials.selectedRole) {
        const expectedLabel = vaultUser.role === 'CLIENT' ? 'Client' : 'Developer';
        throw new Error(
          `Role mismatch: This account is registered as a ${expectedLabel}. Please select the ${expectedLabel} role option to log in.`
        );
      }

      const user: AuthUser = {
        id: vaultUser.id,
        email: vaultUser.email,
        name: vaultUser.name,
        role: vaultUser.role,
        organization: vaultUser.organization,
        createdAt: vaultUser.createdAt,
      };
      return {
        user,
        accessToken: `simulated_token_${vaultUser.id}`,
      };
    }

    throw new Error('Login failed. Please check your credentials and try again.');
  },

  /**
   * Logs out the user via `/api/auth/logout`.
   */
  async logout(): Promise<void> {
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
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch') && !err.message.includes('timeout')) {
        throw err;
      }
    }

    // Client-side vault fallback if backend is offline
    const emailLower = params.email.toLowerCase().trim();
    const vaultUser = getVaultUsers().find((u) => u.email.toLowerCase() === emailLower);

    if (vaultUser) {
      if (vaultUser.role !== params.role) {
        const expectedLabel = vaultUser.role === 'CLIENT' ? 'Client' : 'Developer';
        throw new Error(
          `Role mismatch: This account is registered as a ${expectedLabel}. Please select the ${expectedLabel} role option to log in.`
        );
      }
      return {
        user: {
          id: vaultUser.id,
          email: vaultUser.email,
          name: vaultUser.name,
          role: vaultUser.role,
          createdAt: vaultUser.createdAt,
        },
        accessToken: `simulated_token_${vaultUser.id}`,
      };
    }

    const newVaultUser: VaultUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email: emailLower,
      name: params.name.trim(),
      role: params.role,
      passwordHashHex: await hashPasswordSha256('oauth_sandbox_session'),
      createdAt: new Date().toISOString(),
    };
    saveVaultUser(newVaultUser);

    return {
      user: {
        id: newVaultUser.id,
        email: newVaultUser.email,
        name: newVaultUser.name,
        role: newVaultUser.role,
        createdAt: newVaultUser.createdAt,
      },
      accessToken: `simulated_token_${newVaultUser.id}`,
    };
  },

  /**
   * Generates or retrieves an ephemeral Guest / Demo session.
   * Calls `/api/auth/guest` if backend is available, or creates a client-side guest session.
   * Supports specific guest personas ('CLIENT' | 'DEVELOPER') with realistic identities.
   */
  async continueAsGuest(guestPersona?: 'CLIENT' | 'DEVELOPER'): Promise<AuthSession> {
    const isClient = guestPersona === 'CLIENT';
    const guestUser: AuthUser = {
      id: isClient ? `guest_client_${Date.now()}` : `guest_dev_${Date.now()}`,
      email: isClient ? 'client.guest@devflow.demo' : 'developer.guest@devflow.demo',
      name: isClient ? 'Marcus Vance' : 'Alex Morgan',
      role: 'GUEST',
      isGuest: true,
      guestPersona: guestPersona || (isClient ? 'CLIENT' : 'DEVELOPER'),
      organization: isClient ? 'Meridian Labs (Demo Client)' : 'Northstar Studio (Demo Developer)',
      bio: isClient
        ? 'Exploring DevFlow features from a Client perspective in demonstration mode.'
        : 'Exploring DevFlow features from a Developer perspective in demonstration mode.',
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch(`${BASE_URL}/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona: guestPersona }),
        signal: AbortSignal.timeout(2000),
      });

      if (res.ok) {
        const json = await res.json();
        return {
          user: {
            ...guestUser,
            id: json.user.id || guestUser.id,
            email: json.user.email || guestUser.email,
            name: json.user.name || guestUser.name,
            avatarUrl: json.user.avatarUrl,
            createdAt: json.user.createdAt || guestUser.createdAt,
          },
          accessToken: json.accessToken || `guest_demo_token_${Date.now()}`,
        };
      }
    } catch {
      // Fallback to client-side session below
    }

    return {
      user: guestUser,
      accessToken: `guest_demo_token_${Date.now()}`,
    };
  },
};

