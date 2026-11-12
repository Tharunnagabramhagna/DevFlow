import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { SocialAuthButtons } from '@/components/common';
import { AuthPageShell } from '@/components/auth/AuthPageShell';
import { AuthStepHeader } from '@/components/auth/AuthStepHeader';
import { AuthDemoModeSection } from '@/components/auth/AuthDemoModeSection';
import { AuthCheckbox } from '@/components/auth/AuthCheckbox';
import { RoleWelcomeSelector } from '@/components/auth/RoleWelcomeSelector';
import { useAuth } from '@/contexts/AuthContext';
import { EffectiveRole, UserRole } from '@/types';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

export interface LoginPageProps {
  initialRole?: UserRole;
}

type LoginFieldErrors = {
  email?: string;
  password?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toEffectiveRole = (role?: string | null): EffectiveRole | null =>
  role === 'CLIENT' || role === 'DEVELOPER' ? role : null;

export const LoginPage: React.FC<LoginPageProps> = ({ initialRole }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, continueAsGuest, loading } = useAuth();

  // Step 1: Role Selection | Step 2: Credentials Login Form
  const [selectedRole, setSelectedRole] = useState<EffectiveRole | null>(() =>
    toEffectiveRole(initialRole)
  );
  const [isGuestSelectOpen, setIsGuestSelectOpen] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // UI & validation state
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);

  // Synchronize role state with route & query parameters
  useEffect(() => {
    const rawSearch =
      location.search ||
      (window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '');
    const params = new URLSearchParams(rawSearch);
    const err = params.get('error');
    if (err) {
      setError(err);
    } else {
      setError(null);
    }
    setFieldErrors({});
    setForgotPasswordSent(false);

    const queryRole = toEffectiveRole(params.get('role'));
    const propRole = toEffectiveRole(initialRole);
    if (queryRole) {
      setSelectedRole(queryRole);
      setIsGuestSelectOpen(false);
    } else if (propRole) {
      setSelectedRole(propRole);
      setIsGuestSelectOpen(false);
    } else if (location.pathname === '/login') {
      setSelectedRole(null);
      setIsGuestSelectOpen(false);
    }
  }, [location, initialRole]);

  const handleSelectRole = (role: EffectiveRole) => {
    setSelectedRole(role);
    setIsGuestSelectOpen(false);
    setError(null);
    setFieldErrors({});
    navigate(role === 'CLIENT' ? '/login/client' : '/login/developer');
  };

  const handleBackToRoleSelection = () => {
    setSelectedRole(null);
    setIsGuestSelectOpen(false);
    setError(null);
    setFieldErrors({});
    navigate('/login');
  };

  const handleContinueAsGuest = async (persona: EffectiveRole) => {
    setGuestLoading(true);
    setError(null);
    try {
      await continueAsGuest(persona);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize guest demo session. Please try again.');
    } finally {
      setGuestLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) {
      setError('Please select an account type before logging in.');
      return;
    }

    const emailTrimmed = email.trim();
    const nextFieldErrors: LoginFieldErrors = {};

    if (!emailTrimmed || !EMAIL_REGEX.test(emailTrimmed)) {
      nextFieldErrors.email = 'Please enter a valid email address.';
    }
    if (!password) {
      nextFieldErrors.password = 'Please enter your password.';
    }

    if (nextFieldErrors.email || nextFieldErrors.password) {
      setFieldErrors(nextFieldErrors);
      setError(nextFieldErrors.email || nextFieldErrors.password || 'Please complete all required fields.');
      return;
    }

    setFieldErrors({});
    setError(null);

    try {
      await login({
        email: emailTrimmed,
        password,
        selectedRole,
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify your credentials.');
    }
  };

  const handleForgotPassword = async () => {
    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed || !EMAIL_REGEX.test(emailTrimmed)) {
      setFieldErrors((prev) => ({
        ...prev,
        email: 'Enter your email address above to receive a password reset link.',
      }));
      setError('Enter a valid email address above to receive a password reset link.');
      return;
    }

    setForgotPasswordLoading(true);
    setError(null);
    setFieldErrors({});
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailTrimmed }),
      }).catch(() => {});
      setForgotPasswordSent(true);
      setTimeout(() => setForgotPasswordSent(false), 6000);
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const isClient = selectedRole === 'CLIENT';
  const focusRingClass = isClient
    ? 'focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/30'
    : 'focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30';

  return (
    <AuthPageShell width={selectedRole ? 'narrow' : 'wide'}>
      {!selectedRole ? (
        <RoleWelcomeSelector
          title="Welcome Back to DevFlow"
          subtitle="Select your workspace role to log in or explore in Demo Mode."
          error={error}
          isGuestSelectOpen={isGuestSelectOpen}
          guestLoading={guestLoading}
          bottomPromptText="Don't have an account yet?"
          bottomLinkLabel="Sign Up"
          bottomLinkTo="/signup"
          onSelectRole={handleSelectRole}
          onToggleGuestSelect={(open) => {
            setError(null);
            setIsGuestSelectOpen(open);
          }}
          onContinueAsGuest={handleContinueAsGuest}
          clientTitle="Client Account"
          clientBadge="CLIENT ACCOUNT"
          developerTitle="Developer Account"
          developerBadge="DEVELOPER ACCOUNT"
        />
      ) : (
        <div className="space-y-5">
          <AuthStepHeader
            role={selectedRole}
            title="Welcome back"
            subtitle={
              isClient
                ? 'Sign in to your client workspace to manage projects and milestones.'
                : 'Sign in to your developer workspace to ship code and submit evidence.'
            }
            onChangeRole={handleBackToRoleSelection}
          />

          {error && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5 animate-fadeIn"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {forgotPasswordSent && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>If an account matches that email, a password reset link has been dispatched.</span>
            </div>
          )}

          <SocialAuthButtons
            role={selectedRole}
            intent="login"
            onError={(err) => setError(err)}
            disabled={loading || guestLoading}
          />

          <form onSubmit={handleSubmit} noValidate className="space-y-4 text-xs">
            {/* Email Address */}
            <div>
              <label
                htmlFor="login-email"
                className="block text-slate-700 dark:text-slate-200 font-semibold mb-1.5"
              >
                Email Address <span className="text-slate-400">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  aria-invalid={Boolean(fieldErrors.email)}
                  className={`w-full bg-slate-50 dark:bg-[#131C2E]/90 border rounded-lg pl-9 pr-3 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none transition-colors ${
                    fieldErrors.email
                      ? 'border-rose-500/70 focus:border-rose-500'
                      : `border-slate-200 dark:border-[#24324B] ${focusRingClass}`
                  }`}
                  autoComplete="email"
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password"
                  className="text-slate-700 dark:text-slate-200 font-semibold"
                >
                  Password <span className="text-slate-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={forgotPasswordLoading}
                  className="text-[11px] text-[#2563EB] hover:text-blue-600 dark:text-[#60A5FA] dark:hover:text-blue-300 font-medium underline underline-offset-2 cursor-pointer"
                >
                  {forgotPasswordLoading ? 'Dispatching...' : 'Forgot password?'}
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  aria-invalid={Boolean(fieldErrors.password)}
                  className={`w-full bg-slate-50 dark:bg-[#131C2E]/90 border rounded-lg pl-9 pr-10 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none transition-colors ${
                    fieldErrors.password
                      ? 'border-rose-500/70 focus:border-rose-500'
                      : `border-slate-200 dark:border-[#24324B] ${focusRingClass}`
                  }`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{fieldErrors.password}</p>
              )}
            </div>

            {/* Remember Session */}
            <div className="pt-0.5">
              <AuthCheckbox
                id="login-remember"
                checked={rememberMe}
                onChange={setRememberMe}
                label="Remember this browser session"
              />
            </div>

            {/* Primary Login Submit */}
            <button
              type="submit"
              disabled={loading || guestLoading}
              className="w-full py-2.5 px-4 rounded-lg bg-[#2563EB] hover:bg-blue-600 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>{isClient ? 'Sign in as Client' : 'Sign in as Developer'}</span>
              )}
            </button>
          </form>

          <AuthDemoModeSection
            role={selectedRole}
            loading={guestLoading}
            disabled={loading}
            onContinueAsGuest={handleContinueAsGuest}
          />

          {/* Role-Preserving Cross-Link to Registration */}
          <div className="text-center pt-3 border-t border-slate-200 dark:border-[#23314A]/80 text-xs text-slate-600 dark:text-slate-400">
            <span>Don't have an account? </span>
            <Link
              to={isClient ? '/signup/client' : '/signup/developer'}
              className="text-[#2563EB] hover:text-blue-600 dark:text-[#60A5FA] dark:hover:text-blue-300 font-semibold underline underline-offset-4"
            >
              Create account
            </Link>
          </div>
        </div>
      )}
    </AuthPageShell>
  );
};

export default LoginPage;
