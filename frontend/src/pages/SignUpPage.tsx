import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { DevFlowLogo, ThemeToggle, SocialAuthButtons, AmbientBackground } from '@/components/common';
import { RoleAccountCards } from '@/components/auth/RoleAccountCards';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole, EffectiveRole } from '@/types';
import {
  BriefcaseBusiness,
  Code2,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  Lock,
  Mail,
  User,
  Building,
  Github,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

export interface SignUpPageProps {
  initialRole?: UserRole;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({ initialRole }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, continueAsGuest, loading } = useAuth();

  // Step 1: Role selection | Step 2: Registration form
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(initialRole || null);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [organizationOrHandle, setOrganizationOrHandle] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestLoading, setGuestLoading] = useState(false);

  // Sync URL query parameters and route role params for browser-refresh persistence
  useEffect(() => {
    const rawSearch =
      location.search ||
      (window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '');
    const params = new URLSearchParams(rawSearch);
    const err = params.get('error');
    if (err) {
      setError(decodeURIComponent(err));
    }
    const r = params.get('role');
    if (r === 'CLIENT' || r === 'DEVELOPER') {
      setSelectedRole(r as UserRole);
    } else if (initialRole) {
      setSelectedRole(initialRole);
    } else if (location.pathname === '/signup' || location.pathname === '/register') {
      setSelectedRole(null);
    }
  }, [location, initialRole]);

  const handleSelectRole = (role: EffectiveRole) => {
    setSelectedRole(role);
    setError(null);
    navigate(role === 'CLIENT' ? '/signup/client' : '/signup/developer');
  };

  const handleBackToRoleSelection = () => {
    setSelectedRole(null);
    setError(null);
    navigate('/signup');
  };

  const handleContinueAsGuest = async () => {
    const persona: EffectiveRole = selectedRole === 'DEVELOPER' ? 'DEVELOPER' : 'CLIENT';
    setGuestLoading(true);
    setError(null);
    try {
      await continueAsGuest(persona);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Unable to start guest demo session.');
    } finally {
      setGuestLoading(false);
    }
  };

  // Password validation helpers
  const isPasswordLongEnough = password.length >= 8;
  const doPasswordsMatch = password && confirmPassword && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) {
      setError('Please select your account type first.');
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    if (!agreeTerms) {
      setError('You must accept the Terms of Service and Privacy Policy to continue.');
      return;
    }

    setError(null);

    try {
      await register({
        name: trimmedName,
        email: trimmedEmail,
        password,
        role: selectedRole,
        organization: organizationOrHandle.trim() || undefined,
      });

      // Redirect to dashboard on successful registration
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-[#060B16] text-[#0F172A] dark:text-[#F8FAFC] flex flex-col justify-between selection:bg-[#0070BA] selection:text-white relative overflow-x-hidden antialiased py-8 px-4 sm:px-6">
      {/* Dynamic ambient glass lighting */}
      <AmbientBackground />

      {/* Top Bar with Logo and Theme Toggle */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between pb-6 relative z-10">
        <Link to="/" className="cursor-pointer group select-none flex items-center gap-2">
          <DevFlowLogo variant="horizontal" theme="auto" size="md" />
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            to="/"
            className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className={`w-full relative z-10 my-auto transition-all duration-300 ${selectedRole ? 'max-w-[32rem] mx-auto' : 'max-w-2xl mx-auto'}`}>
        <div className="bg-white/80 dark:bg-[#0F172A]/80 border border-white/80 dark:border-white/[0.12] rounded-2xl p-6 sm:p-9 shadow-glass-elevated dark:shadow-dark-glass-elevated backdrop-blur-2xl ring-1 ring-white/20 dark:ring-white/[0.06]">
          {/* STEP 1: TWO ROLE ACCOUNT OPTIONS */}
          {!selectedRole ? (
            <div className="space-y-6 sm:space-y-7">
              <div className="text-center space-y-2">
                <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Choose Your DevFlow Role
                </h1>
                <p className="font-sans text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  Select your workspace role to create an account or explore in Demo Mode.
                </p>
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs sm:text-sm flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <RoleAccountCards onSelectRole={handleSelectRole} />

              {/* Bottom Login Link */}
              <div className="text-center pt-2 border-t border-slate-200 dark:border-[#26344B]/60 text-xs text-slate-600 dark:text-slate-400">
                <span>Already have an account? </span>
                <Link
                  to="/login"
                  className="text-[#2563EB] hover:text-blue-600 dark:hover:text-blue-400 font-semibold underline underline-offset-4"
                >
                  Login
                </Link>
              </div>
            </div>
          ) : (
            /* STEP 2: REGISTRATION FORM */
            <div className="space-y-6">
              {/* Header with Role Indicator & Back Button */}
              <div>
                <button
                  type="button"
                  onClick={handleBackToRoleSelection}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-3"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Change Role</span>
                </button>

                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Create Account</h1>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      selectedRole === 'CLIENT'
                        ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60'
                        : 'bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60'
                    }`}
                  >
                    {selectedRole === 'CLIENT' ? (
                      <BriefcaseBusiness className="w-3.5 h-3.5" />
                    ) : (
                      <Code2 className="w-3.5 h-3.5" />
                    )}
                    <span>{selectedRole === 'CLIENT' ? 'Client' : 'Developer'}</span>
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Fill in your details to set up your {selectedRole.toLowerCase()} workspace.
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Social Authentication: Google & Facebook */}
              <SocialAuthButtons
                role={selectedRole}
                intent="signup"
                onError={(err) => setError(err)}
                disabled={loading}
              />

              {/* Registration Form */}
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                {/* Full Name */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex Morgan"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#080D18] border border-slate-200 dark:border-[#26344B] rounded-lg pl-9 pr-3 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#2563EB] transition-colors"
                      autoComplete="name"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#080D18] border border-slate-200 dark:border-[#26344B] rounded-lg pl-9 pr-3 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#2563EB] transition-colors"
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-700 dark:text-slate-300 font-semibold">Password *</label>
                    <span
                      className={`text-[10px] font-mono ${
                        isPasswordLongEnough ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {password.length}/8+ chars
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      placeholder="Minimum 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#080D18] border border-slate-200 dark:border-[#26344B] rounded-lg pl-9 pr-10 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#2563EB] transition-colors"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-700 dark:text-slate-300 font-semibold">Confirm Password *</label>
                    {confirmPassword && (
                      <span
                        className={`text-[10px] flex items-center gap-1 ${
                          doPasswordsMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
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
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full bg-slate-50 dark:bg-[#080D18] border rounded-lg pl-9 pr-10 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none transition-colors ${
                        confirmPassword && !doPasswordsMatch
                          ? 'border-rose-500/60 focus:border-rose-500'
                          : 'border-slate-200 dark:border-[#26344B] focus:border-[#2563EB]'
                      }`}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Role Specific Optional Field */}
                {selectedRole === 'CLIENT' ? (
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                      Company / Organization Name <span className="text-slate-400 dark:text-slate-500 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="e.g. Acme Corp, Meridian Labs"
                        value={organizationOrHandle}
                        onChange={(e) => setOrganizationOrHandle(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#080D18] border border-slate-200 dark:border-[#26344B] rounded-lg pl-9 pr-3 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#2563EB] transition-colors"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                      Developer Team or GitHub Handle <span className="text-slate-400 dark:text-slate-500 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <Github className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="e.g. @octocat, Northstar Studio"
                        value={organizationOrHandle}
                        onChange={(e) => setOrganizationOrHandle(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#080D18] border border-slate-200 dark:border-[#26344B] rounded-lg pl-9 pr-3 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#2563EB] transition-colors"
                      />
                    </div>
                  </div>
                )}

                {/* Terms and Conditions Checkbox */}
                <div className="pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      required
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded-sm border-slate-300 dark:border-[#26344B] bg-slate-50 dark:bg-[#080D18] text-[#2563EB] focus:ring-[#2563EB] cursor-pointer"
                    />
                    <span className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                      I agree to the{' '}
                      <span className="text-slate-900 dark:text-white hover:underline cursor-pointer">Terms of Service</span>{' '}
                      and{' '}
                      <span className="text-slate-900 dark:text-white hover:underline cursor-pointer">Privacy Policy</span>.
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || guestLoading}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#2563EB] hover:bg-blue-600 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 mt-3 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating your account...</span>
                    </>
                  ) : (
                    <span>
                      {selectedRole === 'CLIENT'
                        ? 'Create Client Account'
                        : 'Create Developer Account'}
                    </span>
                  )}
                </button>
              </form>

              {/* Subtle Divider + Secondary Continue as Guest */}
              <div className="space-y-2.5 pt-1">
                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-200 dark:border-[#26344B]/80" />
                  <span className="shrink mx-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Or explore in Demo Mode
                  </span>
                  <div className="flex-grow border-t border-slate-200 dark:border-[#26344B]/80" />
                </div>

                <button
                  type="button"
                  onClick={handleContinueAsGuest}
                  disabled={loading || guestLoading}
                  className="w-full py-2.5 px-4 rounded-lg border border-slate-300 dark:border-white/[0.14] bg-slate-100/70 dark:bg-white/[0.04] hover:bg-slate-200/80 dark:hover:bg-white/[0.09] disabled:opacity-50 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {guestLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Starting Guest Demo...</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span>
                        Continue as Guest ({selectedRole === 'CLIENT' ? 'Client' : 'Developer'})
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-70" />
                    </>
                  )}
                </button>
                <p className="text-[11px] text-center text-slate-500 dark:text-slate-400">
                  Read-only demo experience — no account created and actions are disabled.
                </p>
              </div>

              {/* Bottom Login Link */}
              <div className="text-center pt-2 border-t border-slate-200 dark:border-[#26344B]/60 text-xs text-slate-600 dark:text-slate-400">
                <span>Already have an account? </span>
                <Link
                  to={selectedRole === 'DEVELOPER' ? '/login/developer' : '/login/client'}
                  className="text-[#2563EB] hover:text-blue-600 dark:hover:text-blue-400 font-semibold underline underline-offset-4"
                >
                  Login
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-500 pt-6 relative z-10">
        <span>DevFlow Autonomous Milestone Platform &bull; PayPal Hackathon &bull; 2026</span>
      </footer>
    </div>
  );
};

export default SignUpPage;

