import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { DevFlowLogo, ThemeToggle, SocialAuthButtons } from '@/components/common';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import {
  BriefcaseBusiness,
  Code2,
  Eye,
  EyeOff,
  ArrowLeft,
  Lock,
  Mail,
  User,
  Building,
  Github,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

export const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, loading } = useAuth();

  // Step 1: Role selection | Step 2: Registration form
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

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
    setError(null);
  };

  const handleBackToRoleSelection = () => {
    setSelectedRole(null);
    setError(null);
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
    <div className="min-h-screen bg-[#080D18] text-[#F8FAFC] flex flex-col justify-between selection:bg-[#0070BA] selection:text-white relative overflow-x-hidden antialiased py-8 px-4 sm:px-6">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-r from-blue-600/10 via-cyan-500/5 to-purple-600/10 blur-3xl pointer-events-none rounded-full" />

      {/* Top Bar with Logo and Theme Toggle */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between pb-6 relative z-10">
        <Link to="/" className="cursor-pointer group select-none flex items-center gap-2">
          <DevFlowLogo variant="horizontal" theme="auto" size="md" />
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            to="/"
            className="text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="max-w-md mx-auto w-full relative z-10 my-auto">
        <div className="bg-[#111C30] border border-[#26344B] rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {/* STEP 1: ROLE SELECTION SCREEN */}
          {!selectedRole ? (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Join DevFlow
                </h1>
                <p className="text-xs sm:text-sm text-slate-400">
                  Select how you plan to use DevFlow to create your account.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Role Option Cards */}
              <div className="space-y-3.5 pt-1">
                {/* OPTION A: JOIN AS A CLIENT */}
                <button
                  type="button"
                  onClick={() => handleSelectRole('CLIENT')}
                  className="w-full text-left p-4 rounded-xl border border-[#26344B] bg-[#0A101D] hover:bg-[#152238] hover:border-[#2563EB] transition-all group flex items-start gap-4 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                >
                  <div className="p-2.5 rounded-lg bg-[#2563EB]/15 text-[#38BDF8] border border-[#2563EB]/30 group-hover:scale-105 transition-transform shrink-0">
                    <BriefcaseBusiness className="w-6 h-6 text-[#2563EB] group-hover:text-[#60A5FA]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white group-hover:text-[#60A5FA] transition-colors">
                        Client
                      </span>
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-blue-950/80 text-blue-400 border border-blue-800/60 font-mono">
                        Hiring / Management
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Hire developers, define project milestones, review cryptographic verification proofs and release payments via PayPal.
                    </p>
                  </div>
                </button>

                {/* OPTION B: JOIN AS A DEVELOPER */}
                <button
                  type="button"
                  onClick={() => handleSelectRole('DEVELOPER')}
                  className="w-full text-left p-4 rounded-xl border border-[#26344B] bg-[#0A101D] hover:bg-[#152238] hover:border-[#2563EB] transition-all group flex items-start gap-4 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                >
                  <div className="p-2.5 rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/30 group-hover:scale-105 transition-transform shrink-0">
                    <Code2 className="w-6 h-6 text-purple-400 group-hover:text-purple-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                        Developer / Project Creator
                      </span>
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/60 font-mono">
                        Building / Code
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Build projects, link GitHub repositories, submit deliverable evidence for automated AI verification and receive payments.
                    </p>
                  </div>
                </button>
              </div>

              {/* Bottom Login Link */}
              <div className="text-center pt-2 border-t border-[#26344B]/60 text-xs text-slate-400">
                <span>Already have an account? </span>
                <Link
                  to="/login"
                  className="text-[#2563EB] hover:text-blue-400 font-semibold underline underline-offset-4"
                >
                  Log In
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
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-3"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Change Role</span>
                </button>

                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold text-white tracking-tight">Create Account</h1>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      selectedRole === 'CLIENT'
                        ? 'bg-blue-950/80 text-blue-400 border-blue-800/60'
                        : 'bg-purple-950/80 text-purple-300 border-purple-800/60'
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
                <p className="text-xs text-slate-400 mt-1">
                  Fill in your details to set up your {selectedRole.toLowerCase()} workspace.
                </p>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2.5 animate-fadeIn">
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
                  <label className="block text-slate-300 font-semibold mb-1.5">
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
                      className="w-full bg-[#080D18] border border-[#26344B] rounded-lg pl-9 pr-3 py-2.5 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#2563EB] transition-colors"
                      autoComplete="name"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">
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
                      className="w-full bg-[#080D18] border border-[#26344B] rounded-lg pl-9 pr-3 py-2.5 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#2563EB] transition-colors"
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-300 font-semibold">Password *</label>
                    <span
                      className={`text-[10px] font-mono ${
                        isPasswordLongEnough ? 'text-emerald-400' : 'text-slate-500'
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
                      className="w-full bg-[#080D18] border border-[#26344B] rounded-lg pl-9 pr-10 py-2.5 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#2563EB] transition-colors"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-300 font-semibold">Confirm Password *</label>
                    {confirmPassword && (
                      <span
                        className={`text-[10px] flex items-center gap-1 ${
                          doPasswordsMatch ? 'text-emerald-400' : 'text-rose-400'
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
                      className={`w-full bg-[#080D18] border rounded-lg pl-9 pr-10 py-2.5 text-white placeholder-slate-500 text-xs focus:outline-none transition-colors ${
                        confirmPassword && !doPasswordsMatch
                          ? 'border-rose-500/60 focus:border-rose-500'
                          : 'border-[#26344B] focus:border-[#2563EB]'
                      }`}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Role Specific Optional Field */}
                {selectedRole === 'CLIENT' ? (
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5">
                      Company / Organization Name <span className="text-slate-500 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="e.g. Acme Corp, Meridian Labs"
                        value={organizationOrHandle}
                        onChange={(e) => setOrganizationOrHandle(e.target.value)}
                        className="w-full bg-[#080D18] border border-[#26344B] rounded-lg pl-9 pr-3 py-2.5 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#2563EB] transition-colors"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5">
                      Developer Team or GitHub Handle <span className="text-slate-500 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <Github className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="e.g. @octocat, Northstar Studio"
                        value={organizationOrHandle}
                        onChange={(e) => setOrganizationOrHandle(e.target.value)}
                        className="w-full bg-[#080D18] border border-[#26344B] rounded-lg pl-9 pr-3 py-2.5 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#2563EB] transition-colors"
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
                      className="w-4 h-4 mt-0.5 rounded-sm border-[#26344B] bg-[#080D18] text-[#2563EB] focus:ring-[#2563EB] cursor-pointer"
                    />
                    <span className="text-slate-400 text-[11px] leading-relaxed">
                      I agree to the{' '}
                      <span className="text-white hover:underline cursor-pointer">Terms of Service</span>{' '}
                      and{' '}
                      <span className="text-white hover:underline cursor-pointer">Privacy Policy</span>.
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#2563EB] hover:bg-blue-600 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 mt-3"
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

              {/* Bottom Login Link */}
              <div className="text-center pt-2 border-t border-[#26344B]/60 text-xs text-slate-400">
                <span>Already have an account? </span>
                <Link
                  to="/login"
                  className="text-[#2563EB] hover:text-blue-400 font-semibold underline underline-offset-4"
                >
                  Log In
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

