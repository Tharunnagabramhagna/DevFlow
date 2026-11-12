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
  User,
  Building,
  Github,
  AlertCircle,
  Loader2,
  CheckCircle2,
  X,
} from 'lucide-react';

export interface SignUpPageProps {
  initialRole?: UserRole;
}

type SignUpFieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  agreeTerms?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_COMPLEXITY_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/]).{8,}$/;

const toEffectiveRole = (role?: string | null): EffectiveRole | null =>
  role === 'CLIENT' || role === 'DEVELOPER' ? role : null;

export const SignUpPage: React.FC<SignUpPageProps> = ({ initialRole }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, continueAsGuest, loading } = useAuth();

  // Step 1: Role Selection | Step 2: Role-Specific Registration Form
  const [selectedRole, setSelectedRole] = useState<EffectiveRole | null>(() =>
    toEffectiveRole(initialRole)
  );
  const [isGuestSelectOpen, setIsGuestSelectOpen] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [organizationOrHandle, setOrganizationOrHandle] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  // UI & validation state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<SignUpFieldErrors>({});
  const [legalNotice, setLegalNotice] = useState<'terms' | 'privacy' | null>(null);

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
    setLegalNotice(null);

    const queryRole = toEffectiveRole(params.get('role'));
    const propRole = toEffectiveRole(initialRole);
    if (queryRole) {
      setSelectedRole(queryRole);
      setIsGuestSelectOpen(false);
    } else if (propRole) {
      setSelectedRole(propRole);
      setIsGuestSelectOpen(false);
    } else if (location.pathname === '/signup' || location.pathname === '/register') {
      setSelectedRole(null);
    }
  }, [location, initialRole]);

  const handleSelectRole = (role: EffectiveRole) => {
    setSelectedRole(role);
    setIsGuestSelectOpen(false);
    setError(null);
    setFieldErrors({});
    navigate(role === 'CLIENT' ? '/signup/client' : '/signup/developer');
  };

  const handleBackToRoleSelection = () => {
    setSelectedRole(null);
    setIsGuestSelectOpen(false);
    setError(null);
    setFieldErrors({});
    navigate('/signup');
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

  const isPasswordLongEnough = password.length >= 8;
  const isPasswordStrong = PASSWORD_COMPLEXITY_REGEX.test(password);
  const doPasswordsMatch = Boolean(password && confirmPassword && password === confirmPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) {
      setError('Please select your account type first.');
      return;
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const nextErrors: SignUpFieldErrors = {};

    if (!trimmedName || trimmedName.length < 2) {
      nextErrors.name = 'Please enter your full name (at least 2 characters).';
    }
    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      nextErrors.email = 'Please enter a valid email address.';
    }
    if (password.length < 8) {
      nextErrors.password = 'Password must contain at least 8 characters.';
    } else if (!PASSWORD_COMPLEXITY_REGEX.test(password)) {
      nextErrors.password =
        'Password must include an uppercase letter, lowercase letter, number, and special character.';
    }
    if (!confirmPassword || password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match. Please re-enter your password.';
    }
    if (!agreeTerms) {
      nextErrors.agreeTerms = 'You must agree to the Terms of Service and Privacy Policy.';
    }

    if (
      nextErrors.name ||
      nextErrors.email ||
      nextErrors.password ||
      nextErrors.confirmPassword ||
      nextErrors.agreeTerms
    ) {
      setFieldErrors(nextErrors);
      setError(
        nextErrors.name ||
          nextErrors.email ||
          nextErrors.password ||
          nextErrors.confirmPassword ||
          nextErrors.agreeTerms ||
          'Please fix the highlighted fields to continue.'
      );
      return;
    }

    setFieldErrors({});
    setError(null);

    try {
      await register({
        name: trimmedName,
        email: trimmedEmail,
        password,
        role: selectedRole,
        organization: organizationOrHandle.trim() || undefined,
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.');
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
          title="Join DevFlow"
          subtitle="Select how you plan to use DevFlow to create your account."
          error={error}
          isGuestSelectOpen={isGuestSelectOpen}
          guestLoading={guestLoading}
          bottomPromptText="Already have an account?"
          bottomLinkLabel="Login"
          bottomLinkTo="/login"
          onSelectRole={handleSelectRole}
          onToggleGuestSelect={(open) => {
            setError(null);
            setIsGuestSelectOpen(open);
          }}
          onContinueAsGuest={handleContinueAsGuest}
        />
      ) : (
        <div className="space-y-5">
          <AuthStepHeader
            role={selectedRole}
            title="Create Account"
            subtitle={
              isClient
                ? 'Fill in your details to set up your client workspace.'
                : 'Fill in your details to set up your developer workspace.'
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

          <SocialAuthButtons
            role={selectedRole}
            intent="signup"
            onError={(err) => setError(err)}
            disabled={loading || guestLoading}
          />

          <form onSubmit={handleSubmit} noValidate className="space-y-4 text-xs">
            {/* Full Name */}
            <div>
              <label
                htmlFor="signup-name"
                className="block text-slate-700 dark:text-slate-200 font-semibold mb-1.5"
              >
                Full Name <span className="text-slate-400">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="signup-name"
                  type="text"
                  placeholder="e.g. Alex Morgan"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  aria-invalid={Boolean(fieldErrors.name)}
                  className={`w-full bg-slate-50 dark:bg-[#131C2E]/90 border rounded-lg pl-9 pr-3 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none transition-colors ${
                    fieldErrors.name
                      ? 'border-rose-500/70 focus:border-rose-500'
                      : `border-slate-200 dark:border-[#24324B] ${focusRingClass}`
                  }`}
                  autoComplete="name"
                />
              </div>
              {fieldErrors.name && (
                <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{fieldErrors.name}</p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label
                htmlFor="signup-email"
                className="block text-slate-700 dark:text-slate-200 font-semibold mb-1.5"
              >
                Email Address <span className="text-slate-400">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="signup-email"
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
                  htmlFor="signup-password"
                  className="text-slate-700 dark:text-slate-200 font-semibold"
                >
                  Password <span className="text-slate-400">*</span>
                </label>
                <span
                  className={`text-[10px] font-mono ${
                    isPasswordStrong
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : isPasswordLongEnough
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-400 dark:text-slate-400'
                  }`}
                >
                  {password.length}/8+ chars
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 8 chars (A-z, 0-9, symbol)"
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
                  autoComplete="new-password"
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
              {fieldErrors.password ? (
                <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">{fieldErrors.password}</p>
              ) : (
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Must include uppercase, lowercase, number, and special character.
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="signup-confirm-password"
                  className="text-slate-700 dark:text-slate-200 font-semibold"
                >
                  Confirm Password <span className="text-slate-400">*</span>
                </label>
                {confirmPassword && (
                  <span
                    className={`text-[10px] flex items-center gap-1 ${
                      doPasswordsMatch
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {doPasswordsMatch ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" /> Passwords match
                      </>
                    ) : (
                      'Does not match'
                    )}
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="signup-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) {
                      setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                    }
                  }}
                  aria-invalid={Boolean(fieldErrors.confirmPassword || (confirmPassword && !doPasswordsMatch))}
                  className={`w-full bg-slate-50 dark:bg-[#131C2E]/90 border rounded-lg pl-9 pr-10 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none transition-colors ${
                    fieldErrors.confirmPassword || (confirmPassword && !doPasswordsMatch)
                      ? 'border-rose-500/70 focus:border-rose-500'
                      : `border-slate-200 dark:border-[#24324B] ${focusRingClass}`
                  }`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            {/* Role-Specific Optional Field (strict role isolation) */}
            {isClient ? (
              <div>
                <label
                  htmlFor="signup-organization"
                  className="block text-slate-700 dark:text-slate-200 font-semibold mb-1.5"
                >
                  Company / Organization Name{' '}
                  <span className="text-slate-400 dark:text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="signup-organization"
                    type="text"
                    placeholder="e.g. Acme Corp, Meridian Labs"
                    value={organizationOrHandle}
                    onChange={(e) => setOrganizationOrHandle(e.target.value)}
                    className={`w-full bg-slate-50 dark:bg-[#131C2E]/90 border border-slate-200 dark:border-[#24324B] rounded-lg pl-9 pr-3 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none transition-colors ${focusRingClass}`}
                  />
                </div>
              </div>
            ) : (
              <div>
                <label
                  htmlFor="signup-handle"
                  className="block text-slate-700 dark:text-slate-200 font-semibold mb-1.5"
                >
                  Developer Team or GitHub Handle{' '}
                  <span className="text-slate-400 dark:text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Github className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="signup-handle"
                    type="text"
                    placeholder="e.g. @octocat, Northstar Studio"
                    value={organizationOrHandle}
                    onChange={(e) => setOrganizationOrHandle(e.target.value)}
                    className={`w-full bg-slate-50 dark:bg-[#131C2E]/90 border border-slate-200 dark:border-[#24324B] rounded-lg pl-9 pr-3 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none transition-colors ${focusRingClass}`}
                  />
                </div>
              </div>
            )}

            {/* Terms and Conditions Checkbox */}
            <div className="pt-0.5 space-y-2">
              <AuthCheckbox
                id="signup-agree-terms"
                checked={agreeTerms}
                hasError={Boolean(fieldErrors.agreeTerms)}
                onChange={(checked) => {
                  setAgreeTerms(checked);
                  if (checked && fieldErrors.agreeTerms) {
                    setFieldErrors((prev) => ({ ...prev, agreeTerms: undefined }));
                  }
                }}
                label={
                  <>
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setLegalNotice(legalNotice === 'terms' ? null : 'terms');
                      }}
                      className="text-slate-900 dark:text-white font-semibold hover:underline cursor-pointer"
                    >
                      Terms of Service
                    </button>{' '}
                    and{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setLegalNotice(legalNotice === 'privacy' ? null : 'privacy');
                      }}
                      className="text-slate-900 dark:text-white font-semibold hover:underline cursor-pointer"
                    >
                      Privacy Policy
                    </button>
                    .
                  </>
                }
              />

              {fieldErrors.agreeTerms && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400">{fieldErrors.agreeTerms}</p>
              )}

              {legalNotice && (
                <div className="p-3 rounded-lg bg-slate-100/90 dark:bg-[#131C2E] border border-slate-200 dark:border-[#24324B] text-[11px] text-slate-600 dark:text-slate-300 flex items-start justify-between gap-2">
                  <span>
                    {legalNotice === 'terms'
                      ? 'Terms of Service: Milestones, evidence verification, and payment actions follow role-based workspace authorization.'
                      : 'Privacy Policy: DevFlow stores account metadata securely and never shares credentials or OAuth tokens with third parties.'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setLegalNotice(null)}
                    aria-label="Close legal notice"
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-white shrink-0 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Primary Account Creation CTA */}
            <button
              type="submit"
              disabled={loading || guestLoading}
              className="w-full py-2.5 px-4 rounded-lg bg-[#2563EB] hover:bg-blue-600 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-md shadow-blue-600/25 flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating your account...</span>
                </>
              ) : (
                <span>{isClient ? 'Create Client Account' : 'Create Developer Account'}</span>
              )}
            </button>
          </form>

          <AuthDemoModeSection
            role={selectedRole}
            loading={guestLoading}
            disabled={loading}
            onContinueAsGuest={handleContinueAsGuest}
          />

          {/* Role-Preserving Cross-Link to Login */}
          <div className="text-center pt-3 border-t border-slate-200 dark:border-[#23314A]/80 text-xs text-slate-600 dark:text-slate-400">
            <span>Already have an account? </span>
            <Link
              to={isClient ? '/login/client' : '/login/developer'}
              className="text-[#2563EB] hover:text-blue-600 dark:text-[#60A5FA] dark:hover:text-blue-300 font-semibold underline underline-offset-4"
            >
              Login
            </Link>
          </div>
        </div>
      )}
    </AuthPageShell>
  );
};

export default SignUpPage;
