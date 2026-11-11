import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '@/types';
import { authService } from '@/services/auth';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Info, Sparkles, X } from 'lucide-react';

export const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={`${className} shrink-0`} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export const FacebookIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={`${className} shrink-0`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"
      fill="#1877F2"
    />
  </svg>
);

export interface SocialAuthButtonsProps {
  role: UserRole;
  intent: 'login' | 'signup';
  onError: (error: string) => void;
  disabled?: boolean;
}

export const SocialAuthButtons: React.FC<SocialAuthButtonsProps> = ({
  role,
  intent,
  onError,
  disabled = false,
}) => {
  const navigate = useNavigate();
  const { handleMockSocialAuth } = useAuth();
  const [connectingProvider, setConnectingProvider] = useState<'google' | 'facebook' | null>(null);

  // Setup assistance dialog for unconfigured credentials in local dev
  const [setupModalProvider, setSetupModalProvider] = useState<'google' | 'facebook' | null>(null);

  const handleSocialClick = async (provider: 'google' | 'facebook') => {
    if (disabled || connectingProvider) return;

    setConnectingProvider(provider);
    try {
      await authService.initiateSocialAuth(provider, role, intent);
    } catch (err: any) {
      if (
        err.message === 'GOOGLE_OAUTH_NOT_CONFIGURED' ||
        err.message === 'FACEBOOK_OAUTH_NOT_CONFIGURED'
      ) {
        setSetupModalProvider(provider);
      } else {
        onError(err.message || `${provider} authentication failed. Please try again.`);
      }
    } finally {
      setConnectingProvider(null);
    }
  };

  const handleContinueWithSandboxAuth = async () => {
    if (!setupModalProvider || !import.meta.env.DEV) return;
    const provider = setupModalProvider;
    setSetupModalProvider(null);
    setConnectingProvider(provider);

    try {
      const email =
        provider === 'google'
          ? `${role.toLowerCase()}-google@devflow.io`
          : `${role.toLowerCase()}-facebook@devflow.io`;
      const name =
        provider === 'google'
          ? `${role === 'CLIENT' ? 'Client' : 'Developer'} Google User`
          : `${role === 'CLIENT' ? 'Client' : 'Developer'} Facebook User`;

      await handleMockSocialAuth({
        provider,
        email,
        name,
        role,
        avatarUrl:
          provider === 'google'
            ? 'https://lh3.googleusercontent.com/a/default-user'
            : 'https://platform-lookaside.fbsbx.com/platform/profilepic/',
      });

      navigate('/dashboard');
    } catch (err: any) {
      onError(err.message || 'Sandbox social authentication failed.');
    } finally {
      setConnectingProvider(null);
    }
  };

  return (
    <>
      <div className="space-y-3 w-full">
        {/* GOOGLE BUTTON */}
        <button
          type="button"
          onClick={() => handleSocialClick('google')}
          disabled={disabled || connectingProvider !== null}
          className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-[#26344B] bg-white dark:bg-[#0A101D] text-slate-800 dark:text-white font-medium text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-[#152238] hover:border-slate-300 dark:hover:border-[#2563EB] transition-all flex items-center justify-center gap-3 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 disabled:opacity-60 cursor-pointer"
          aria-label="Continue with Google"
        >
          {connectingProvider === 'google' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span>Connecting to Google...</span>
            </>
          ) : (
            <>
              <GoogleIcon className="w-5 h-5" />
              <span>Continue with Google</span>
            </>
          )}
        </button>

        {/* FACEBOOK BUTTON */}
        <button
          type="button"
          onClick={() => handleSocialClick('facebook')}
          disabled={disabled || connectingProvider !== null}
          className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-[#26344B] bg-white dark:bg-[#0A101D] text-slate-800 dark:text-white font-medium text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-[#152238] hover:border-slate-300 dark:hover:border-[#2563EB] transition-all flex items-center justify-center gap-3 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 disabled:opacity-60 cursor-pointer"
          aria-label="Continue with Facebook"
        >
          {connectingProvider === 'facebook' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#1877F2]" />
              <span>Connecting to Facebook...</span>
            </>
          ) : (
            <>
              <FacebookIcon className="w-5 h-5" />
              <span>Continue with Facebook</span>
            </>
          )}
        </button>
      </div>

      {/* DIVIDER: OR CONTINUE WITH EMAIL */}
      <div className="relative my-5 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200 dark:border-[#26344B]" />
        </div>
        <span className="relative px-3 bg-white dark:bg-[#111C30] text-[10px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400 select-none">
          OR CONTINUE WITH EMAIL
        </span>
      </div>

      {/* SETUP ASSISTANCE MODAL FOR LOCAL ENV */}
      {setupModalProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#26344B] rounded-2xl max-w-md w-full p-6 shadow-2xl text-left space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                {setupModalProvider === 'google' ? (
                  <GoogleIcon className="w-6 h-6" />
                ) : (
                  <FacebookIcon className="w-6 h-6" />
                )}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                    {setupModalProvider} OAuth Setup Notice
                  </h3>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    Backend Environment Notice
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSetupModalProvider(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 text-xs text-blue-900 dark:text-blue-200 space-y-2">
              <p className="font-semibold flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                <Info className="w-4 h-4 shrink-0" />
                <span>
                  {setupModalProvider === 'google'
                    ? 'GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET'
                    : 'FACEBOOK_APP_ID & FACEBOOK_APP_SECRET'}
                </span>
              </p>
              <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                To enable live external {setupModalProvider === 'google' ? 'Google' : 'Facebook'} authorization, add your provider credentials to <code className="text-blue-600 dark:text-blue-400 font-mono">DevFlow/backend/.env</code>.
              </p>
            </div>

            <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
              <p className="font-semibold text-slate-900 dark:text-white">How would you like to proceed?</p>
              <ul className="list-disc list-inside text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                <li>
                  <strong className="text-slate-900 dark:text-white">Sandbox Mode:</strong> Verifies the complete OAuth role validation, role mismatch detection, and dashboard hydration using a verified {setupModalProvider} sandbox identity with role <strong className="text-blue-600 dark:text-blue-400">{role}</strong>.
                </li>
                <li>
                  <strong className="text-slate-900 dark:text-white">Email & Password:</strong> Use the standard credentials form below.
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              {import.meta.env.DEV && (
                <button
                  type="button"
                  onClick={handleContinueWithSandboxAuth}
                  className="flex-1 py-2 px-3 rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Dev Sandbox as {role === 'CLIENT' ? 'Client' : 'Developer'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSetupModalProvider(null)}
                className="flex-1 py-2 px-3 rounded-lg border border-slate-200 dark:border-[#26344B] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A253A] text-xs font-medium transition-colors"
              >
                Use Email Form
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SocialAuthButtons;
