import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { DevFlowLogo, ThemeToggle, SocialAuthButtons, AmbientBackground } from '@/components/common';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import {
  BriefcaseBusiness,
  Code2,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  Lock,
  Mail,
  UserRound,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

export interface LoginPageProps {
  initialRole?: UserRole;
}

export const LoginPage: React.FC<LoginPageProps> = ({ initialRole }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, continueAsGuest, loading } = useAuth();

  // Step 1: Role selection | Step 2: Login form | Guest Persona selection
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(initialRole || null);
  const [isGuestSelectOpen, setIsGuestSelectOpen] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);

  // Check URL query parameters for OAuth error and pre-selected role
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
    }
  }, [location]);

  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
    setIsGuestSelectOpen(false);
    setError(null);
  };

  const handleBackToRoleSelection = () => {
    setSelectedRole(null);
    setIsGuestSelectOpen(false);
    setError(null);
  };

  const handleContinueAsGuest = async (persona: 'CLIENT' | 'DEVELOPER') => {
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
    if (!emailTrimmed) {
      setError('Please enter your email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setError(null);

    try {
      await login({
        email: emailTrimmed,
        password,
        selectedRole,
      });

      // Redirect to authenticated workspace on success
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Enter your email address above to receive a password reset link.');
      return;
    }

    setForgotPasswordLoading(true);
    setError(null);
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      }).catch(() => {});
      setForgotPasswordSent(true);
      setTimeout(() => setForgotPasswordSent(false), 6000);
    } finally {
      setForgotPasswordLoading(false);
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
      <main className={`w-full relative z-10 my-auto transition-all duration-300 ${selectedRole ? 'max-w-[32rem] mx-auto' : 'max-w-4xl mx-auto'}`}>
        <div className="bg-white/80 dark:bg-[#0F172A]/80 border border-white/80 dark:border-white/[0.12] rounded-2xl p-6 sm:p-9 shadow-glass-elevated dark:shadow-dark-glass-elevated backdrop-blur-2xl ring-1 ring-white/20 dark:ring-white/[0.06]">
          {/* STEP 1: ACCOUNT SELECTION & GUEST PERSONA SELECTION */}
          {!selectedRole ? (
            isGuestSelectOpen ? (
              /* GUEST PERSONA SELECTION SCREEN */
              <div className="space-y-6 sm:space-y-7">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsGuestSelectOpen(false)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Account Types</span>
                  </button>
                  <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 font-semibold">
                    Demo Mode
                  </span>
                </div>

                <div className="text-center space-y-2">
                  <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Explore DevFlow as a Guest
                  </h1>
                  <p className="font-sans text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
                    Select your perspective to preview DevFlow features with interactive demonstration data.
                  </p>
                </div>

                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs sm:text-sm flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Two Distinct Guest Persona Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 pt-1">
                  {/* OPTION A: CONTINUE AS CLIENT GUEST */}
                  <button
                    type="button"
                    disabled={guestLoading}
                    onClick={() => handleContinueAsGuest('CLIENT')}
                    className="w-full text-left p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl hover:bg-white/90 dark:hover:bg-white/[0.07] hover:border-[#2563EB]/70 hover:shadow-md hover:shadow-blue-500/10 dark:hover:shadow-blue-500/5 transition-all duration-200 group flex flex-col justify-between h-full focus:outline-none focus:ring-2 focus:ring-[#2563EB] shadow-xs cursor-pointer ring-1 ring-transparent dark:ring-white/[0.04] hover:ring-[#2563EB]/20 disabled:opacity-50"
                  >
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div className="p-3 rounded-xl bg-[#2563EB]/15 text-[#2563EB] dark:text-[#38BDF8] border border-[#2563EB]/30 group-hover:scale-105 transition-transform shrink-0">
                          <BriefcaseBusiness className="w-6 h-6 text-[#2563EB] group-hover:text-[#1D4ED8] dark:group-hover:text-[#60A5FA]" />
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-semibold uppercase px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 font-mono">
                          Client Perspective
                        </span>
                      </div>

                      <div>
                        <h3 className="font-heading text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-[#2563EB] dark:group-hover:text-[#60A5FA] transition-colors">
                          Explore as Client
                        </h3>
                        <p className="font-sans text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                          Explore project management, milestone tracking, developer deliverables, verification and payment management from a client's perspective.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs font-semibold text-[#2563EB] dark:text-[#38BDF8]">
                      <span>{guestLoading ? 'Starting Demo Session...' : 'Enter Client Dashboard'}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>

                  {/* OPTION B: CONTINUE AS DEVELOPER GUEST */}
                  <button
                    type="button"
                    disabled={guestLoading}
                    onClick={() => handleContinueAsGuest('DEVELOPER')}
                    className="w-full text-left p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl hover:bg-white/90 dark:hover:bg-white/[0.07] hover:border-purple-500/70 hover:shadow-md hover:shadow-purple-500/10 dark:hover:shadow-purple-500/5 transition-all duration-200 group flex flex-col justify-between h-full focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-xs cursor-pointer ring-1 ring-transparent dark:ring-white/[0.04] hover:ring-purple-500/20 disabled:opacity-50"
                  >
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div className="p-3 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 group-hover:scale-105 transition-transform shrink-0">
                          <Code2 className="w-6 h-6 text-purple-600 dark:text-purple-400 group-hover:text-purple-700 dark:group-hover:text-purple-300" />
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-semibold uppercase px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 font-mono">
                          Developer Perspective
                        </span>
                      </div>

                      <div>
                        <h3 className="font-heading text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                          Explore as Developer
                        </h3>
                        <p className="font-sans text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                          Explore project development, assigned milestones, evidence submission, AI verification and developer payments.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs font-semibold text-purple-600 dark:text-purple-400">
                      <span>{guestLoading ? 'Starting Demo Session...' : 'Enter Developer Dashboard'}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              /* WELCOME BACK TO DEVFLOW 3-OPTION VIEW */
              <div className="space-y-6 sm:space-y-7">
                <div className="text-center space-y-2">
                  <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Welcome Back to DevFlow
                  </h1>
                  <p className="font-sans text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
                    Select your account type to log in to your workspace, or explore DevFlow instantly in guest demo mode.
                  </p>
                </div>

                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs sm:text-sm flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* 3 Selectable Account Options (Stacked) */}
                <div className="space-y-4 pt-1">
                  {/* OPTION 1: CLIENT LOGIN */}
                  <button
                    type="button"
                    onClick={() => handleSelectRole('CLIENT')}
                    className="w-full text-left p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl hover:bg-white/90 dark:hover:bg-white/[0.07] hover:border-[#2563EB]/70 hover:shadow-md hover:shadow-blue-500/10 dark:hover:shadow-blue-500/5 transition-all duration-200 group flex items-start gap-4 sm:gap-5 focus:outline-none focus:ring-2 focus:ring-[#2563EB] shadow-xs cursor-pointer ring-1 ring-transparent dark:ring-white/[0.04] hover:ring-[#2563EB]/20"
                  >
                    <div className="p-3 rounded-xl bg-[#2563EB]/15 text-[#2563EB] dark:text-[#38BDF8] border border-[#2563EB]/30 group-hover:scale-105 transition-transform shrink-0 mt-0.5">
                      <BriefcaseBusiness className="w-6 h-6 text-[#2563EB] group-hover:text-[#1D4ED8] dark:group-hover:text-[#60A5FA]" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-heading text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-[#2563EB] dark:group-hover:text-[#60A5FA] transition-colors">
                          Client
                        </h3>
                        <span className="text-[10px] sm:text-[11px] font-semibold uppercase px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 font-mono shrink-0">
                          HIRING / MANAGEMENT
                        </span>
                      </div>
                      <p className="font-sans text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                        Hire developers, define project milestones, review cryptographic verification proofs and release payments via PayPal.
                      </p>
                    </div>
                  </button>

                  {/* OPTION 2: DEVELOPER / PROJECT CREATOR LOGIN */}
                  <button
                    type="button"
                    onClick={() => handleSelectRole('DEVELOPER')}
                    className="w-full text-left p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl hover:bg-white/90 dark:hover:bg-white/[0.07] hover:border-purple-500/70 hover:shadow-md hover:shadow-purple-500/10 dark:hover:shadow-purple-500/5 transition-all duration-200 group flex items-start gap-4 sm:gap-5 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-xs cursor-pointer ring-1 ring-transparent dark:ring-white/[0.04] hover:ring-purple-500/20"
                  >
                    <div className="p-3 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 group-hover:scale-105 transition-transform shrink-0 mt-0.5">
                      <Code2 className="w-6 h-6 text-purple-600 dark:text-purple-400 group-hover:text-purple-700 dark:group-hover:text-purple-300" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-heading text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                          Developer / Project Creator
                        </h3>
                        <span className="text-[10px] sm:text-[11px] font-semibold uppercase px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 font-mono shrink-0">
                          BUILDING / CODE
                        </span>
                      </div>
                      <p className="font-sans text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                        Build projects, link GitHub repositories, submit deliverable evidence for automated AI verification and receive payments.
                      </p>
                    </div>
                  </button>

                  {/* OPTION 3: CONTINUE AS GUEST */}
                  <button
                    type="button"
                    onClick={() => setIsGuestSelectOpen(true)}
                    className="w-full text-left p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl hover:bg-white/90 dark:hover:bg-white/[0.07] hover:border-teal-500/70 hover:shadow-md hover:shadow-teal-500/10 dark:hover:shadow-teal-500/5 transition-all duration-200 group flex items-start gap-4 sm:gap-5 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-xs cursor-pointer ring-1 ring-transparent dark:ring-white/[0.04] hover:ring-teal-500/20"
                  >
                    <div className="p-3 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 group-hover:scale-105 transition-transform shrink-0 mt-0.5">
                      <UserRound className="w-6 h-6 text-teal-600 dark:text-teal-400 group-hover:text-teal-700 dark:group-hover:text-teal-300" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-heading text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors">
                          Continue as Guest
                        </h3>
                        <span className="text-[10px] sm:text-[11px] font-semibold uppercase px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 font-mono shrink-0">
                          DEMO MODE
                        </span>
                      </div>
                      <p className="font-sans text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                        Explore DevFlow features using demonstration data without creating an account.
                      </p>
                    </div>
                  </button>
                </div>

                {/* Bottom Sign Up Link */}
                <div className="text-center pt-2 border-t border-slate-200 dark:border-[#26344B]/60 text-xs text-slate-600 dark:text-slate-400">
                  <span>Don't have an account yet? </span>
                  <Link
                    to="/signup"
                    className="text-[#2563EB] hover:text-blue-600 dark:hover:text-blue-400 font-semibold underline underline-offset-4"
                  >
                    Sign Up
                  </Link>
                </div>
              </div>
            )
          ) : (
            /* STEP 2: CREDENTIALS LOGIN FORM */
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
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Welcome back</h1>
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
                  Sign in to your account to continue your journey.
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Forgot Password Success Message */}
              {forgotPasswordSent && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs flex items-start gap-2.5 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>If an account matches that email, a password reset link has been dispatched.</span>
                </div>
              )}

              {/* Social Authentication: Google & Facebook */}
              <SocialAuthButtons
                role={selectedRole}
                intent="login"
                onError={(err) => setError(err)}
                disabled={loading}
              />

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                {/* Email Address */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5 uppercase text-[10px] tracking-wider">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
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
                    <label className="text-slate-700 dark:text-slate-300 font-semibold uppercase text-[10px] tracking-wider">
                      Password *
                    </label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={forgotPasswordLoading}
                      className="text-[11px] text-[#2563EB] hover:text-blue-600 dark:hover:text-blue-400 font-medium underline underline-offset-2"
                    >
                      {forgotPasswordLoading ? 'Dispatching...' : 'Forgot password?'}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#080D18] border border-slate-200 dark:border-[#26344B] rounded-lg pl-9 pr-10 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#2563EB] transition-colors"
                      autoComplete="current-password"
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

                {/* Remember Me */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded-sm border-slate-300 dark:border-[#26344B] bg-slate-50 dark:bg-[#080D18] text-[#2563EB] focus:ring-[#2563EB] cursor-pointer"
                    />
                    <span className="text-slate-700 dark:text-slate-300 text-[11px]">Remember this browser session</span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#2563EB] hover:bg-blue-600 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authenticating credentials...</span>
                    </>
                  ) : (
                    <span>Sign in as {selectedRole === 'CLIENT' ? 'Client' : 'Developer'}</span>
                  )}
                </button>
              </form>

              {/* Bottom Sign Up Link */}
              <div className="text-center pt-2 border-t border-slate-200 dark:border-[#26344B]/60 text-xs text-slate-600 dark:text-slate-400">
                <span>Don't have an account? </span>
                <Link
                  to="/signup"
                  className="text-[#2563EB] hover:text-blue-600 dark:hover:text-blue-400 font-semibold underline underline-offset-4"
                >
                  Create account
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

export default LoginPage;

