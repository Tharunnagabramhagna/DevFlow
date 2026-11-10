import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { AuthSession, AuthUser, UserRole } from '@/types';
import { authService } from '@/services/auth';

export interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  role: UserRole | null;
  guestPersona?: 'CLIENT' | 'DEVELOPER' | null;
  isAuthenticated: boolean;
  isClient: boolean;
  isDeveloper: boolean;
  isGuest: boolean;
  login: (credentials: { email: string; password: string; selectedRole: UserRole }) => Promise<void>;
  register: (data: { name: string; email: string; password: string; role: UserRole; organization?: string }) => Promise<void>;
  continueAsGuest: (guestPersona?: 'CLIENT' | 'DEVELOPER') => Promise<void>;
  handleOAuthExchange: (code: string) => Promise<void>;
  handleMockSocialAuth: (params: { provider: 'google' | 'facebook'; email: string; name: string; role: UserRole; avatarUrl?: string }) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AUTH_STORAGE_KEY = 'devflow_auth_session';
const PROFILE_STORAGE_KEY = 'devflow_user_profile_preferences';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(() => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  });

  const [loading, setLoading] = useState<boolean>(false);

  // Sync profile storage when session changes
  useEffect(() => {
    if (session?.user) {
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
        const roleLabel =
          session.user.role === 'GUEST'
            ? 'Guest Explorer (Demo Mode)'
            : session.user.role === 'CLIENT'
            ? 'Client / Project Administrator'
            : 'Lead Developer';
        const orgLabel =
          session.user.role === 'GUEST'
            ? 'DevFlow Sandbox Demo'
            : session.user.organization || 'Northstar Digital Studio';

        localStorage.setItem(
          PROFILE_STORAGE_KEY,
          JSON.stringify({
            name: session.user.name,
            email: session.user.email,
            role: roleLabel,
            organization: orgLabel,
          })
        );
      } catch {}
    } else {
      try {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } catch {}
    }
  }, [session]);

  const login = async (credentials: { email: string; password: string; selectedRole: UserRole }) => {
    setLoading(true);
    try {
      const newSession = await authService.login(credentials);
      setSession(newSession);
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    organization?: string;
  }) => {
    setLoading(true);
    try {
      const newSession = await authService.register(data);
      setSession(newSession);
    } finally {
      setLoading(false);
    }
  };

  const continueAsGuest = async (guestPersona?: 'CLIENT' | 'DEVELOPER') => {
    setLoading(true);
    try {
      const guestSession = await authService.continueAsGuest(guestPersona);
      setSession(guestSession);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthExchange = async (code: string) => {
    setLoading(true);
    try {
      const newSession = await authService.exchangeOAuthCode(code);
      setSession(newSession);
    } finally {
      setLoading(false);
    }
  };

  const handleMockSocialAuth = async (params: {
    provider: 'google' | 'facebook';
    email: string;
    name: string;
    role: UserRole;
    avatarUrl?: string;
  }) => {
    setLoading(true);
    try {
      const newSession = await authService.mockSocialAuth(params);
      setSession(newSession);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authService.logout();
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  const contextValue = useMemo<AuthContextType>(
    () => ({
      user: session?.user || null,
      token: session?.accessToken || null,
      role: session?.user?.role || null,
      guestPersona: session?.user?.guestPersona || (session?.user?.role === 'GUEST' ? 'DEVELOPER' : null),
      isAuthenticated: !!session?.user,
      isClient: session?.user?.role === 'CLIENT',
      isDeveloper: session?.user?.role === 'DEVELOPER',
      isGuest: session?.user?.role === 'GUEST' || Boolean(session?.user?.isGuest),
      login,
      register,
      continueAsGuest,
      handleOAuthExchange,
      handleMockSocialAuth,
      logout,
      loading,
    }),
    [session, loading]
  );

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

