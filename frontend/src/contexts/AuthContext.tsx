import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { AuthSession, AuthUser, EffectiveRole, UserRole } from '@/types';
import { authService } from '@/services/auth';
import { API_BASE_URL } from '@/config/api';
import {
  clearDevOfflineVault,
  isOfflineAuthSimulationEnabled,
} from '@/services/devOfflineAuth';

export interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  role: UserRole | null;
  effectiveRole: EffectiveRole | null;
  guestPersona: EffectiveRole | null;
  hasSession: boolean;
  isAuthenticated: boolean;
  isClient: boolean;
  isDeveloper: boolean;
  isGuest: boolean;
  githubConnected: boolean;
  shouldShowGitHubOnboarding: boolean;
  dismissGitHubOnboardingForSession: () => void;
  updateGitHubConnectionState: (connected: boolean, username?: string | null, connectedAt?: string | null) => void;
  login: (credentials: { email: string; password: string; selectedRole: UserRole }) => Promise<void>;
  register: (data: { name: string; email: string; password: string; role: UserRole; organization?: string }) => Promise<void>;
  continueAsGuest: (guestPersona?: EffectiveRole) => Promise<void>;
  handleOAuthExchange: (code: string) => Promise<void>;
  handleMockSocialAuth: (params: { provider: 'google' | 'facebook'; email: string; name: string; role: UserRole; avatarUrl?: string }) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AUTH_STORAGE_KEY = 'devflow_auth_session';
const PROFILE_STORAGE_KEY = 'devflow_user_profile_preferences';
const GH_SKIP_SESSION_KEY_PREFIX = 'devflow_gh_onboarding_skipped_';

function isJwtExpired(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    ) as { exp?: number };
    return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

function parseAndValidateSession(raw: string | null): AuthSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.user || !parsed.user.id || !parsed.accessToken) {
      return null;
    }

    const isGuestUser = parsed.user.role === 'GUEST' || Boolean(parsed.user.isGuest);
    if (isGuestUser) {
      const persona: EffectiveRole = parsed.user.guestPersona === 'CLIENT' ? 'CLIENT' : 'DEVELOPER';
      return {
        accessToken: parsed.accessToken,
        user: {
          ...parsed.user,
          role: 'GUEST',
          isGuest: true,
          guestPersona: persona,
          name: persona === 'CLIENT' ? 'Client Guest' : 'Developer Guest',
          email: persona === 'CLIENT' ? 'client.demo@devflow.demo' : 'developer.demo@devflow.demo',
          organization: persona === 'CLIENT' ? 'Demo Client Workspace' : 'Demo Developer Workspace',
        },
      };
    }

    // Never honor development-only simulated tokens outside opted-in dev simulation mode
    if (
      typeof parsed.accessToken !== 'string' ||
      (parsed.accessToken.startsWith('simulated_token_') &&
        !isOfflineAuthSimulationEnabled()) ||
      parsed.accessToken.startsWith('guest_demo_token_') ||
      isJwtExpired(parsed.accessToken)
    ) {
      return null;
    }

    if (
      parsed.user.role !== 'CLIENT' &&
      parsed.user.role !== 'DEVELOPER' &&
      parsed.user.role !== 'ADMIN'
    ) {
      return null;
    }

    return {
      accessToken: parsed.accessToken,
      user: {
        ...parsed.user,
        isGuest: false,
        guestPersona: null,
      },
    };
  } catch {
    return null;
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(() => {
    try {
      return parseAndValidateSession(localStorage.getItem(AUTH_STORAGE_KEY));
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState<boolean>(false);

  const isGuestSession = Boolean(
    session?.user && (session.user.role === 'GUEST' || session.user.isGuest)
  );

  // Persist validated session cleanly; never store personal profile preferences for guest sessions
  const persistSession = useCallback((nextSession: AuthSession | null) => {
    const guestFlag = Boolean(
      nextSession?.user &&
        (nextSession.user.role === 'GUEST' || nextSession.user.isGuest)
    );
    if (nextSession?.user) {
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));

        if (!guestFlag) {
          const roleLabel =
            nextSession.user.role === 'CLIENT'
              ? 'Client / Project Administrator'
              : 'Lead Developer';
          const orgLabel = nextSession.user.organization || 'DevFlow Workspace';

          localStorage.setItem(
            PROFILE_STORAGE_KEY,
            JSON.stringify({
              name: nextSession.user.name,
              fullName: nextSession.user.name,
              email: nextSession.user.email,
              role: roleLabel,
              organization: orgLabel,
            })
          );
        } else {
          localStorage.removeItem(PROFILE_STORAGE_KEY);
        }
      } catch {}
    } else {
      try {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } catch {}
    }
    setSession(nextSession);
  }, []);

  useEffect(() => {
    if (!isOfflineAuthSimulationEnabled()) {
      clearDevOfflineVault();
    }
    persistSession(session);

    // Verify real backend JWT against /api/auth/me if active; purge revoked/forged sessions
    if (
      session?.accessToken &&
      session.user?.role !== 'GUEST' &&
      !session.user?.isGuest &&
      !session.accessToken.startsWith('simulated_token_')
    ) {
      authService.verifyServerSession(session.accessToken).then((res) => {
        if (!res.valid) {
          persistSession(null);
        }
      });
    }
  }, []); // initial verification and cleanup only

  const [githubDismissTick, setGithubDismissTick] = useState(0);

  const clearSkipFlag = useCallback((userId?: string | null) => {
    try {
      if (userId) {
        sessionStorage.removeItem(`${GH_SKIP_SESSION_KEY_PREFIX}${userId}`);
      }
    } catch {}
    setGithubDismissTick((t) => t + 1);
  }, []);

  const updateGitHubConnectionState = useCallback(
    (connected: boolean, username?: string | null, connectedAt?: string | null) => {
      setSession((prev) => {
        if (!prev) return prev;
        const updated: AuthSession = {
          ...prev,
          user: {
            ...prev.user,
            githubConnected: connected,
            githubUsername: username !== undefined ? username : prev.user.githubUsername,
            githubConnectedAt: connectedAt !== undefined ? connectedAt : prev.user.githubConnectedAt,
          },
        };
        try {
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    },
    []
  );

  // Sync live GitHub connection state from backend once when authenticated developer loads workspace
  useEffect(() => {
    if (!session?.user || isGuestSession || session.user.role === 'CLIENT') {
      return;
    }
    let active = true;
    fetch(`${API_BASE_URL}/github/status`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      signal: AbortSignal.timeout(5000),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data && (typeof data.connected === 'boolean' || typeof data.appInstalled === 'boolean')) {
          const isConnected = Boolean(data.connected || data.appInstalled);
          updateGitHubConnectionState(
            isConnected,
            data.username ?? data.appInstallation?.accountLogin ?? null,
            data.connectedAt ?? data.appInstallation?.installedAt ?? null
          );
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [session?.user?.id, session?.user?.role, session?.accessToken, isGuestSession, updateGitHubConnectionState]);

  const dismissGitHubOnboardingForSession = useCallback(() => {
    if (session?.user?.id) {
      try {
        sessionStorage.setItem(`${GH_SKIP_SESSION_KEY_PREFIX}${session.user.id}`, '1');
      } catch {}
    }
    setGithubDismissTick((t) => t + 1);
  }, [session?.user?.id]);

  const login = useCallback(async (credentials: { email: string; password: string; selectedRole: UserRole }) => {
    setLoading(true);
    try {
      const newSession = await authService.login(credentials);
      clearSkipFlag(newSession.user.id);
      persistSession(newSession);
    } finally {
      setLoading(false);
    }
  }, [persistSession, clearSkipFlag]);

  const register = useCallback(async (data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    organization?: string;
  }) => {
    setLoading(true);
    try {
      const newSession = await authService.register(data);
      clearSkipFlag(newSession.user.id);
      persistSession(newSession);
    } finally {
      setLoading(false);
    }
  }, [persistSession, clearSkipFlag]);

  const continueAsGuest = useCallback(async (guestPersona?: EffectiveRole) => {
    setLoading(true);
    try {
      const guestSession = await authService.continueAsGuest(guestPersona);
      persistSession(guestSession);
    } finally {
      setLoading(false);
    }
  }, [persistSession]);

  const handleOAuthExchange = useCallback(async (code: string) => {
    setLoading(true);
    try {
      const newSession = await authService.exchangeOAuthCode(code);
      clearSkipFlag(newSession.user.id);
      persistSession(newSession);
    } finally {
      setLoading(false);
    }
  }, [persistSession, clearSkipFlag]);

  const handleMockSocialAuth = useCallback(async (params: {
    provider: 'google' | 'facebook';
    email: string;
    name: string;
    role: UserRole;
    avatarUrl?: string;
  }) => {
    setLoading(true);
    try {
      const newSession = await authService.mockSocialAuth(params);
      clearSkipFlag(newSession.user.id);
      persistSession(newSession);
    } finally {
      setLoading(false);
    }
  }, [persistSession, clearSkipFlag]);

  const logout = useCallback(async () => {
    setLoading(true);
    const currentUserId = session?.user?.id;
    try {
      await authService.logout(isGuestSession);
      clearSkipFlag(currentUserId);
      persistSession(null);
      try {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(PROFILE_STORAGE_KEY);
      } catch {}
    } finally {
      setLoading(false);
    }
  }, [isGuestSession, persistSession, clearSkipFlag, session?.user?.id]);

  const contextValue = useMemo<AuthContextType>(() => {
    const guestPersona: EffectiveRole | null = isGuestSession
      ? session?.user?.guestPersona === 'CLIENT'
        ? 'CLIENT'
        : 'DEVELOPER'
      : null;

    const effectiveRole: EffectiveRole | null = !session?.user
      ? null
      : isGuestSession
      ? guestPersona
      : session.user.role === 'CLIENT'
      ? 'CLIENT'
      : 'DEVELOPER';

    const githubConnected = Boolean(session?.user?.githubConnected);
    let skippedThisSession = false;
    if (session?.user?.id) {
      try {
        skippedThisSession =
          sessionStorage.getItem(`${GH_SKIP_SESSION_KEY_PREFIX}${session.user.id}`) === '1';
      } catch {}
    }

    const shouldShowGitHubOnboarding = Boolean(
      session?.user &&
        !isGuestSession &&
        effectiveRole === 'DEVELOPER' &&
        !githubConnected &&
        !skippedThisSession
    );

    return {
      user: session?.user || null,
      token: isGuestSession ? null : session?.accessToken || null,
      role: session?.user?.role || null,
      effectiveRole,
      guestPersona,
      hasSession: Boolean(session?.user),
      isAuthenticated: Boolean(session?.user && !isGuestSession),
      isClient: effectiveRole === 'CLIENT',
      isDeveloper: effectiveRole === 'DEVELOPER',
      isGuest: isGuestSession,
      githubConnected,
      shouldShowGitHubOnboarding,
      dismissGitHubOnboardingForSession,
      updateGitHubConnectionState,
      login,
      register,
      continueAsGuest,
      handleOAuthExchange,
      handleMockSocialAuth,
      logout,
      loading,
    };
  }, [
    session,
    isGuestSession,
    loading,
    githubDismissTick,
    dismissGitHubOnboardingForSession,
    updateGitHubConnectionState,
    login,
    register,
    continueAsGuest,
    handleOAuthExchange,
    handleMockSocialAuth,
    logout,
  ]);

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

