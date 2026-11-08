import React, { useState } from 'react';
import { DevFlowLogo, BrandHeroBanner, ThemeToggle } from '@/components/common';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  GitBranch,
  Sparkles,
  CreditCard,
  ArrowRight,
  CheckCircle2,
  Menu,
  X,
  Check,
  Lock,
  Layers,
  Wand2,
  FolderGit2,
  Users,
  AlertTriangle,
  Clock,
  LayoutDashboard,
  CheckCheck,
} from 'lucide-react';

// Custom PayPal Logo Mark
const PayPalIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path
      d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.789.789 0 0 1 .777-.66h7.026c2.81 0 4.887.675 5.86 1.905.922 1.168.995 2.802.215 4.86-.022.057-.046.113-.07.168-.783 2.113-2.22 3.613-4.27 4.457-.866.357-1.892.538-3.05.538H9.362a.788.788 0 0 0-.777.66l-.992 5.093a.64.64 0 0 1-.517.596z"
      fill="#0079C1"
    />
    <path
      d="M8.585 14.989l1.107-7.009a.788.788 0 0 1 .778-.66h5.36c2.518 0 4.385.64 5.258 1.808.825 1.106.89 2.656.192 4.607-.749 2.022-2.124 3.456-4.086 4.263-.83.342-1.81.515-2.918.515h-1.92a.788.788 0 0 0-.777.66l-.758 4.793a.64.64 0 0 1-.633.541H6.71a.641.641 0 0 1-.633-.74l2.508-8.778z"
      fill="#00457C"
    />
  </svg>
);

// Custom GitHub Octocat Logo Mark
const GitHubIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#080D1B] text-[#F1F5F9] font-sans selection:bg-[#0070BA] selection:text-white overflow-x-hidden antialiased">
      {/* 1. Header Navigation */}
      <header className="sticky top-0 z-50 bg-[#080D1B]/85 backdrop-blur-md border-b border-[#1E293B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <DevFlowLogo variant="horizontal" theme="auto" size="md" />
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-slate-400">
            <button
              onClick={() => scrollToSection('preview')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Product
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('trust')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              About
            </button>
          </nav>

          {/* Desktop Right CTA: Theme Toggle + Login + Sign Up + Get Started */}
          <div className="hidden md:flex items-center gap-2.5">
            <ThemeToggle />
            <button
              onClick={() => navigate('/login')}
              className="text-xs font-semibold text-slate-300 hover:text-white transition-colors px-3 py-1.5"
            >
              Login
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="text-xs font-semibold text-slate-200 hover:text-white bg-[#1A2538] hover:bg-[#22324C] border border-[#2B3E5C] px-3.5 py-1.5 rounded-full transition-all"
            >
              Sign Up
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="text-xs font-semibold bg-[#0070BA] hover:bg-[#005ea6] text-white px-4 py-2 rounded-full transition-all shadow-md shadow-[#0070BA]/25 hover:shadow-[#0070BA]/40"
            >
              Get Started
            </button>
          </div>

          {/* Mobile Right Actions: Theme Toggle + Menu Hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-[#1E293B] transition-colors"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-[#1E293B] bg-[#0A0F1D] px-5 py-4 space-y-3">
            <button
              onClick={() => scrollToSection('preview')}
              className="block w-full text-left py-2 text-xs font-medium text-slate-300 hover:text-white"
            >
              Product
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="block w-full text-left py-2 text-xs font-medium text-slate-300 hover:text-white"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="block w-full text-left py-2 text-xs font-medium text-slate-300 hover:text-white"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('trust')}
              className="block w-full text-left py-2 text-xs font-medium text-slate-300 hover:text-white"
            >
              About
            </button>
            <div className="pt-2 flex flex-col gap-2 border-t border-[#1E293B]">
              <div className="pb-1">
                <ThemeToggle variant="labeled" />
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full text-center py-2 text-xs font-semibold text-slate-300 bg-[#1E293B] rounded-lg"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="w-full text-center py-2 text-xs font-semibold text-slate-200 border border-[#334155] bg-[#141E33] rounded-lg"
              >
                Sign Up
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="w-full text-center py-2 text-xs font-semibold text-white bg-[#0070BA] rounded-lg"
              >
                Get Started
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-28 overflow-hidden">
        {/* Subtle background ambient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-r from-blue-600/10 via-cyan-500/5 to-purple-600/10 blur-3xl pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
          {/* Centered Hero Branding Banner */}
          <div className="flex flex-col items-center justify-center text-center">
            <BrandHeroBanner
              className="max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-3xl"
              glow
              priority
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Headline & CTA */}
            <div className="lg:col-span-5 space-y-6 text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.08]">
                From Code <br />
                to Cash.
              </h1>

              <p className="text-sm sm:text-base text-slate-400 max-w-md leading-relaxed font-normal">
                Turn development progress into verified milestones and seamless payments with
                AI-powered project intelligence.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => navigate('/signup')}
                  className="bg-[#0070BA] hover:bg-[#005ea6] text-white text-xs sm:text-sm font-semibold px-6 py-3 rounded-full transition-all shadow-lg shadow-[#0070BA]/30 hover:shadow-[#0070BA]/50 flex items-center gap-2"
                >
                  Get Started
                </button>
                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className="bg-[#0F172A] hover:bg-[#1E293B] border border-[#1E293B] hover:border-slate-600 text-slate-300 hover:text-white text-xs sm:text-sm font-semibold px-6 py-3 rounded-full transition-all"
                >
                  Explore How It Works
                </button>
              </div>
            </div>

            {/* Right Column: Hero Dashboard Mockup + Overlapping Payment Status */}
            <div className="lg:col-span-7 relative">
              {/* Outer Dashboard Mockup Shell */}
              <div className="bg-[#0B1222] border border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden">
                {/* Window Chrome Header */}
                <div className="flex items-center justify-between pb-3.5 border-b border-[#1E293B] text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    <span className="font-mono text-slate-500 ml-2">DevFlow Intelligence Command</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE TELEMETRY &bull; SANDBOX DEMO
                  </div>
                </div>

                {/* Inner Mockup Layout: Mini Sidebar + Main Viewport */}
                <div className="grid grid-cols-12 gap-3 pt-3.5">
                  {/* Mini Sidebar */}
                  <div className="col-span-3 border-r border-[#1E293B] pr-3 space-y-1 text-[11px]">
                    <div className="flex items-center gap-1.5 font-bold text-white mb-3">
                      <DevFlowLogo variant="icon" size="xs" />
                      <span>DevFlow</span>
                    </div>
                    <div className="space-y-1">
                      <div className="p-1.5 rounded bg-blue-950/60 text-blue-400 font-semibold flex items-center gap-1.5">
                        <LayoutDashboard className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Dashboard</span>
                      </div>
                      <div className="p-1.5 rounded text-slate-400 hover:text-slate-200 flex items-center gap-1.5">
                        <FolderGit2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Projects</span>
                      </div>
                      <div className="p-1.5 rounded text-slate-400 hover:text-slate-200 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Milestones</span>
                      </div>
                      <div className="p-1.5 rounded text-slate-400 hover:text-slate-200 flex items-center gap-1.5">
                        <GitBranch className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Evidence</span>
                      </div>
                      <div className="p-1.5 rounded text-slate-400 hover:text-slate-200 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">AI Verify</span>
                      </div>
                    </div>
                  </div>

                  {/* Mini Dashboard Workspace */}
                  <div className="col-span-9 space-y-3 pl-1">
                    {/* Top Row: Milestone Tracking + Mini Stat */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2 p-2.5 rounded-xl bg-[#0F172A] border border-[#1E293B] space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-white">Milestone Tracking</span>
                          <span className="text-emerald-400 font-mono text-[10px] bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-800/40">
                            94.2% AI Pass
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                            <span>Order Routing &amp; Webhooks</span>
                            <span>100%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[#1E293B] overflow-hidden">
                            <div className="h-full bg-emerald-400 w-full rounded-full" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                            <span>AST Syntax Verification</span>
                            <span>94.2%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[#1E293B] overflow-hidden">
                            <div className="h-full bg-blue-500 w-[94%] rounded-full" />
                          </div>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#0F172A] border border-[#1E293B] flex flex-col justify-between">
                        <span className="text-[10px] text-slate-400 font-medium">Expected Volume</span>
                        <div>
                          <div className="text-lg font-bold font-mono text-white">$18,500.00</div>
                          <span className="text-[10px] text-emerald-400 font-mono">4 Milestones</span>
                        </div>
                      </div>
                    </div>

                    {/* Commit Stream Snippet */}
                    <div className="p-2.5 rounded-xl bg-[#0F172A] border border-[#1E293B] text-[11px] space-y-1.5 font-mono">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <GitHubIcon className="w-3.5 h-3.5 text-slate-300" />
                          <span>northstar-studio/payment-gateway</span>
                        </span>
                        <span className="text-blue-400">main</span>
                      </div>
                      <div className="text-[10px] text-slate-300 truncate bg-[#080D1B] p-1.5 rounded border border-[#1E293B]">
                        commit <span className="text-amber-400">a1e9482</span> &bull; feat(payments): implement PayPal webhook verification and signature check
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Overlapping Floating "Payment Status" Panel (Matches Reference) */}
              <div className="sm:absolute sm:-bottom-6 sm:-right-4 mt-4 sm:mt-0 bg-[#0F172A] border border-[#1E293B] rounded-2xl p-4 shadow-2xl space-y-3 w-full sm:w-72 backdrop-blur-md">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300 border-b border-[#1E293B] pb-2">
                  <div className="flex items-center gap-1.5">
                    <span>Payment Status</span>
                    <span className="text-[9px] font-mono font-bold bg-blue-950/80 text-blue-400 border border-blue-800/60 px-1.5 py-0.5 rounded">DEMO</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                    <Check className="w-3.5 h-3.5" />
                    <span>Settled (Sandbox)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-950/70 border border-blue-800/50 flex items-center justify-center">
                      <PayPalIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">PayPal Invoicing</div>
                      <div className="text-[10px] text-slate-400 font-mono">Instant Payout &bull; Milestone 2</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold font-mono text-emerald-400">$4,500.00</div>
                    <div className="text-[9px] text-slate-500">USD Net</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-[#1E293B]/70 font-mono">
                  <span className="flex items-center gap-1">
                    <GitHubIcon className="w-3 h-3 text-slate-400" />
                    <span>SHA a1e9482</span>
                  </span>
                  <span className="text-blue-400 font-sans">Human Sign-off</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PROBLEM AND SOLUTION SECTION */}
      <section className="py-20 bg-[#060A15] border-t border-b border-[#1E293B]/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Section Heading */}
          <div className="text-center space-y-3">
            <span className="inline-block text-[11px] font-bold tracking-widest text-blue-400 uppercase bg-blue-950/60 border border-blue-800/50 px-3 py-1 rounded-full">
              PROBLEM &amp; SOLUTION
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              The manual process is broken.
            </h2>
            <p className="text-sm text-slate-400 max-w-xl mx-auto">
              Traditional milestone verification wastes developer hours and delays payments.
              DevFlow turns evidence into instant settlement.
            </p>
          </div>

          {/* Two-Column Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* Left: The Manual Process (Red Accents) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1">
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                  The Manual Process
                </h3>
              </div>

              {/* Card 1: Manual Milestone Tracking */}
              <div className="p-5 rounded-2xl bg-[#0F172A] border border-[#1E293B] hover:border-rose-900/50 transition-colors space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>Manual Milestone Tracking</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-950/50 text-rose-400 border border-rose-800/40 px-2 py-0.5 rounded-full">
                    Broken
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Milestones, metrics and progress left unverified in scattered emails, spreadsheets,
                  and unverified chat messages.
                </p>
              </div>

              {/* Card 2: Client Approval Delays */}
              <div className="p-5 rounded-2xl bg-[#0F172A] border border-[#1E293B] hover:border-rose-900/50 transition-colors space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <Clock className="w-4 h-4 text-rose-400" />
                    <span>Client Approvals</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-950/50 text-rose-400 border border-rose-800/40 px-2 py-0.5 rounded-full">
                    Delayed
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Payment delayed for weeks while waiting for manual review cycles, disputed
                  criteria, and unclear commit verification.
                </p>
              </div>

              {/* Card 3: Payment Administration */}
              <div className="p-5 rounded-2xl bg-[#0F172A] border border-[#1E293B] hover:border-rose-900/50 transition-colors space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <CreditCard className="w-4 h-4 text-rose-400" />
                    <span>Payment Administration</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-950/50 text-rose-400 border border-rose-800/40 px-2 py-0.5 rounded-full">
                    Friction
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Manual invoice drafting, bank wire delays, and zero visibility into webhook
                  cryptographic confirmation.
                </p>
              </div>
            </div>

            {/* Right: The DevFlow Way (Green Accents) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                  The DevFlow Way
                </h3>
              </div>

              {/* Card 1: Evidence Collection */}
              <div className="p-5 rounded-2xl bg-[#0F172A] border border-[#1E293B] hover:border-emerald-800/50 transition-colors space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <GitBranch className="w-4 h-4 text-emerald-400" />
                    <span>Evidence Collection</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-950/50 text-emerald-400 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                    Smart
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Cryptographic git commits, PR diffs, and test suites tied directly to requirement
                  acceptance criteria automatically.
                </p>
              </div>

              {/* Card 2: Transparent Approvals */}
              <div className="p-5 rounded-2xl bg-[#0F172A] border border-[#1E293B] hover:border-emerald-800/50 transition-colors space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Transparent Approvals</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-950/50 text-emerald-400 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                    Verified
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Explainable AI AST scoring provides clients with indisputable proof-of-work
                  citations for rapid, confident sign-off.
                </p>
              </div>

              {/* Card 3: Automated Payment Workflows */}
              <div className="p-5 rounded-2xl bg-[#0F172A] border border-[#1E293B] hover:border-emerald-800/50 transition-colors space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <PayPalIcon className="w-4 h-4" />
                    <span>Automated Workflows</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-950/50 text-emerald-400 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                    Instant
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Automated PayPal sandbox invoice generation upon approved milestone delivery with
                  cryptographic webhook receipts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-20 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Section Heading */}
          <div className="text-center space-y-3">
            <span className="inline-block text-[11px] font-bold tracking-widest text-blue-400 uppercase bg-blue-950/60 border border-blue-800/50 px-3 py-1 rounded-full">
              HOW IT WORKS
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              From commit to payment in four connected steps.
            </h2>
            <p className="text-sm text-slate-400 max-w-xl mx-auto">
              DevFlow bridges developer workflow directly into client milestone sign-off and PayPal settlement.
            </p>
          </div>

          {/* 4 Connected Step Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 relative">
            {/* Step 1: Connect GitHub */}
            <div className="p-6 rounded-2xl bg-[#0F172A] border border-[#1E293B] hover:border-blue-500/50 transition-all space-y-4 relative group">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black font-mono text-slate-600 group-hover:text-blue-400 transition-colors">
                  01
                </span>
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-[#1E293B] flex items-center justify-center text-white">
                  <GitHubIcon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-white">Connect GitHub</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  DevFlow listens to monitored repository branches, cryptographic commit SHAs, and pull requests.
                </p>
              </div>
            </div>

            {/* Step 2: Analyze with AI */}
            <div className="p-6 rounded-2xl bg-[#0F172A] border border-[#1E293B] hover:border-purple-500/50 transition-all space-y-4 relative group">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black font-mono text-slate-600 group-hover:text-purple-400 transition-colors">
                  02
                </span>
                <div className="w-10 h-10 rounded-xl bg-purple-950/50 border border-purple-800/50 flex items-center justify-center text-purple-400">
                  <Wand2 className="w-5 h-5" />
                </div>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-white">Analyse with AI</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  AST syntax analysis scores code diffs deterministically against milestone acceptance criteria.
                </p>
              </div>
            </div>

            {/* Step 3: Approve Milestones */}
            <div className="p-6 rounded-2xl bg-[#0F172A] border border-[#1E293B] hover:border-emerald-500/50 transition-all space-y-4 relative group">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black font-mono text-slate-600 group-hover:text-emerald-400 transition-colors">
                  03
                </span>
                <div className="w-10 h-10 rounded-xl bg-emerald-950/50 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
                  <CheckCheck className="w-5 h-5" />
                </div>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-white">Approve Milestones</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Clients inspect clear evidence citations with human-in-the-loop review authority.
                </p>
              </div>
            </div>

            {/* Step 4: Get Paid */}
            <div className="p-6 rounded-2xl bg-[#0F172A] border border-[#1E293B] hover:border-[#0070BA]/50 transition-all space-y-4 relative group">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black font-mono text-slate-600 group-hover:text-[#0070BA] transition-colors">
                  04
                </span>
                <div className="w-10 h-10 rounded-xl bg-blue-950/50 border border-blue-800/50 flex items-center justify-center">
                  <PayPalIcon className="w-5 h-5" />
                </div>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-white">Get Paid</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Instant invoice dispatch via PayPal Invoicing REST API v2 with verified webhook receipt.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CORE FEATURES SECTION */}
      <section id="features" className="py-20 bg-[#060A15] border-t border-b border-[#1E293B]/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Section Heading */}
          <div className="text-center space-y-3">
            <span className="inline-block text-[11px] font-bold tracking-widest text-blue-400 uppercase bg-blue-950/60 border border-blue-800/50 px-3 py-1 rounded-full">
              CORE FEATURES
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Engineered for autonomous engineering delivery.
            </h2>
            <p className="text-sm text-slate-400 max-w-xl mx-auto">
              Purpose-built tools for freelancers, dev teams, and enterprises seeking transparent proof-of-work.
            </p>
          </div>

          {/* 6 Feature Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1: AI Agent Intelligence */}
            <div className="p-6 rounded-2xl bg-[#0F172A] border border-[#1E293B] hover:border-blue-500/50 transition-all space-y-4 group">
              <div className="w-10 h-10 rounded-xl bg-blue-950/60 border border-blue-800/50 flex items-center justify-center text-blue-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                  AI Agent Intelligence
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  AST syntax analysis and pattern matching evaluate code directly against milestone criteria with 0-100% confidence scores.
                </p>
              </div>
              {/* Mini UI Preview */}
              <div className="p-2.5 rounded-xl bg-[#080D1B] border border-[#1E293B] text-[10px] font-mono text-slate-400 space-y-1">
                <div className="flex justify-between text-blue-400">
                  <span>Confidence Gauge</span>
                  <span className="text-emerald-400 font-bold">94.2%</span>
                </div>
                <div className="w-full h-1 bg-[#1E293B] rounded-full overflow-hidden">
                  <div className="w-[94%] h-full bg-blue-500 rounded-full" />
                </div>
              </div>
            </div>

            {/* Feature 2: GitHub Evidence Integration */}
            <div className="p-6 rounded-2xl bg-[#0F172A] border border-[#1E293B] hover:border-blue-500/50 transition-all space-y-4 group">
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-[#1E293B] flex items-center justify-center text-white">
                <GitBranch className="w-5 h-5 text-purple-400" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                  GitHub Evidence Integration
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Inspect diffs, line additions/deletions, and PR approvals linked directly to requirement IDs.
                </p>
              </div>
              {/* Mini UI Preview */}
              <div className="p-2.5 rounded-xl bg-[#080D1B] border border-[#1E293B] text-[10px] font-mono space-y-1">
                <div className="text-emerald-400 truncate">+1,240 lines added (docker-compose.yml)</div>
                <div className="text-slate-500">SHA 54813f0 verified via webhook</div>
              </div>
            </div>

            {/* Feature 3: Smart Milestone Tracking */}
            <div className="p-6 rounded-2xl bg-[#0F172A] border border-[#1E293B] hover:border-blue-500/50 transition-all space-y-4 group">
              <div className="w-10 h-10 rounded-xl bg-blue-950/60 border border-blue-800/50 flex items-center justify-center text-blue-400">
                <Layers className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                  Smart Milestone Tracking
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Interactive deliverable states from draft, to evidence submission, to verified client payout.
                </p>
              </div>
              {/* Mini UI Preview */}
              <div className="p-2.5 rounded-xl bg-[#080D1B] border border-[#1E293B] text-[10px] flex items-center justify-between text-slate-300">
                <span>Phase 1 Architecture</span>
                <span className="text-emerald-400 font-mono font-bold">COMPLETED</span>
              </div>
            </div>

            {/* Feature 4: Human Approval */}
            <div className="p-6 rounded-2xl bg-[#0F172A] border border-[#1E293B] hover:border-blue-500/50 transition-all space-y-4 group">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
                <Users className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Human Approval
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  AI acts as an objective validator, but clients always retain the final sign-off authority before any payment is dispatched.
                </p>
              </div>
              {/* Mini UI Preview */}
              <div className="p-2.5 rounded-xl bg-[#080D1B] border border-[#1E293B] text-[10px] flex items-center justify-between text-slate-300">
                <span>Client Gatekeeper</span>
                <span className="text-blue-400 font-semibold">Marcus Vance (Meridian Labs) &bull; Approved</span>
              </div>
            </div>

            {/* Feature 5: PayPal Invoicing */}
            <div className="p-6 rounded-2xl bg-[#0F172A] border border-[#1E293B] hover:border-blue-500/50 transition-all space-y-4 group">
              <div className="w-10 h-10 rounded-xl bg-blue-950/60 border border-blue-800/50 flex items-center justify-center">
                <PayPalIcon className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                  PayPal Invoicing
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Auto-generates itemized invoices via PayPal Invoicing REST API v2 with line items, tax routing, and due dates.
                </p>
              </div>
              {/* Mini UI Preview */}
              <div className="p-2.5 rounded-xl bg-[#080D1B] border border-[#1E293B] text-[10px] font-mono flex items-center justify-between">
                <span className="text-slate-400">INV-DEVFLOW-003</span>
                <span className="text-emerald-400 font-bold">$3,200.00 USD</span>
              </div>
            </div>

            {/* Feature 6: Payment Verification */}
            <div className="p-6 rounded-2xl bg-[#0F172A] border border-[#1E293B] hover:border-blue-500/50 transition-all space-y-4 group">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Payment Verification
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Cryptographically verified webhook listeners capture PAYMENT.INVOICING.INVOICE.PAID events in real time.
                </p>
              </div>
              {/* Mini UI Preview */}
              <div className="p-2.5 rounded-xl bg-[#080D1B] border border-[#1E293B] text-[10px] font-mono flex items-center justify-between">
                <span className="text-slate-400">WH-78M9-VERIFIED</span>
                <span className="text-emerald-400 font-bold">100% Settled</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. PRODUCT PREVIEW SECTION */}
      <section id="preview" className="py-20 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Section Heading */}
          <div className="text-center space-y-3">
            <span className="inline-block text-[11px] font-bold tracking-widest text-blue-400 uppercase bg-blue-950/60 border border-blue-800/50 px-3 py-1 rounded-full">
              PRODUCT PREVIEW
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Turn development progress into verified milestones and seamless payments.
            </h2>
            <p className="text-sm text-slate-400 max-w-xl mx-auto">
              Real-time developer telemetry, explainable code diff audits, and automated PayPal invoicing unified.
            </p>
          </div>

          {/* Large Realistic Enterprise Dark Dashboard Composition */}
          <div className="bg-[#0B1222] border border-[#1E293B] rounded-2xl p-4 sm:p-6 shadow-2xl relative space-y-5">
            {/* Window Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-[#1E293B]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="font-mono text-xs text-slate-400 ml-3">devflow.team/workspace/overview</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Connected &bull; GitHub Webhook Active</span>
              </div>
            </div>

            {/* Dashboard Inner Screen */}
            <div className="grid grid-cols-12 gap-5">
              {/* Left Mini Nav */}
              <div className="col-span-12 lg:col-span-3 border-b lg:border-b-0 lg:border-r border-[#1E293B] pb-4 lg:pb-0 lg:pr-5 space-y-4">
                <div className="flex items-center gap-2.5">
                  <DevFlowLogo variant="icon" size="sm" />
                  <div>
                    <h4 className="text-xs font-bold text-white">DevFlow Platform</h4>
                    <p className="text-[10px] text-slate-400">Milestone Intelligence</p>
                  </div>
                </div>

                <div className="space-y-1 text-xs font-medium">
                  <div className="p-2 rounded-xl bg-blue-950/70 border border-blue-800/40 text-blue-400 flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Command Center</span>
                  </div>
                  <div className="p-2 rounded-xl text-slate-400 hover:text-white flex items-center gap-2">
                    <FolderGit2 className="w-4 h-4" />
                    <span>Projects (2)</span>
                  </div>
                  <div className="p-2 rounded-xl text-slate-400 hover:text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Milestones (4)</span>
                  </div>
                  <div className="p-2 rounded-xl text-slate-400 hover:text-white flex items-center gap-2">
                    <GitBranch className="w-4 h-4" />
                    <span>GitHub Evidence</span>
                  </div>
                  <div className="p-2 rounded-xl text-slate-400 hover:text-white flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    <span>PayPal Invoices</span>
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="col-span-12 lg:col-span-9 space-y-4">
                {/* Metric Cards Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#0F172A] border border-[#1E293B]">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Settled Paid</div>
                    <div className="text-lg font-bold font-mono text-emerald-400 mt-1">$7,600.00</div>
                    <div className="text-[10px] text-slate-500">2 settled invoices</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#0F172A] border border-[#1E293B]">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Pending Review</div>
                    <div className="text-lg font-bold font-mono text-amber-400 mt-1">$3,200.00</div>
                    <div className="text-[10px] text-slate-500">Awaiting client sign-off</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#0F172A] border border-[#1E293B]">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">AI Pass Rate</div>
                    <div className="text-lg font-bold font-mono text-blue-400 mt-1">94.2%</div>
                    <div className="text-[10px] text-slate-500">AST syntax evaluation</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#0F172A] border border-[#1E293B]">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Active Scope</div>
                    <div className="text-lg font-bold font-mono text-white mt-1">4 Deliverables</div>
                    <div className="text-[10px] text-slate-500">northstar-studio/payment-gateway</div>
                  </div>
                </div>

                {/* Split Evidence + Invoice Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* GitHub Evidence Analysis Box */}
                  <div className="p-4 rounded-xl bg-[#0F172A] border border-[#1E293B] space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-bold text-white">
                        <GitBranch className="w-4 h-4 text-purple-400" />
                        <span>Git Proof-of-Work</span>
                      </div>
                      <span className="font-mono text-[10px] bg-purple-950/60 text-purple-400 border border-purple-800/50 px-2 py-0.5 rounded">
                        SHA a1e9482
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-mono">
                      feat(payments): implement PayPal webhook verification and signature check
                    </p>
                    <div className="p-2.5 rounded-lg bg-[#080D1B] border border-[#1E293B] text-[10px] font-mono space-y-1">
                      <div className="text-emerald-400">+182 lines &bull; webhook.service.ts</div>
                      <div className="text-blue-400">+ AST validation satisfied req_02_paypal</div>
                    </div>
                  </div>

                  {/* PayPal Webhook Invoice Settlement Box */}
                  <div className="p-4 rounded-xl bg-[#0F172A] border border-[#1E293B] space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-bold text-white">
                        <PayPalIcon className="w-4 h-4" />
                        <span>PayPal Settlement</span>
                      </div>
                      <span className="font-mono text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 px-2 py-0.5 rounded">
                        PAID &bull; Settled
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-slate-400 font-mono">INV-DEVFLOW-003</span>
                      <span className="text-base font-bold font-mono text-emerald-400">$3,200.00 USD</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#080D1B] border border-[#1E293B] text-[10px] font-mono text-slate-400 flex items-center justify-between">
                      <span>Webhook WH-78M9 verified</span>
                      <span className="text-slate-300">Instant Settlement</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. TRUST AND SECURITY SECTION */}
      <section id="trust" className="py-20 bg-[#060A15] border-t border-b border-[#1E293B]/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Section Heading */}
          <div className="text-center space-y-3">
            <span className="inline-block text-[11px] font-bold tracking-widest text-blue-400 uppercase bg-blue-950/60 border border-blue-800/50 px-3 py-1 rounded-full">
              TRUST AND SECURITY
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Enterprise guarantees for developers and clients.
            </h2>
            <p className="text-sm text-slate-400 max-w-xl mx-auto">
              DevFlow combines deterministic code proofs with PayPal financial safeguards.
            </p>
          </div>

          {/* 3 Trust Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#0F172A] border border-[#1E293B] space-y-4">
              <div className="w-10 h-10 rounded-xl bg-blue-950/60 border border-blue-800/50 flex items-center justify-center text-blue-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-white">Evidence-Based AI</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Deterministic AST pattern matching and explainable citations link every evaluation to verifiable git commit SHAs. No black-box claims.
                </p>
              </div>
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-blue-400 bg-blue-950/50 border border-blue-800/40 px-2.5 py-1 rounded-full">
                  <Check className="w-3 h-3" />
                  <span>Explainable Citations</span>
                </span>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#0F172A] border border-[#1E293B] space-y-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-white">Human-in-the-Loop Approval</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  AI functions strictly as an objective intelligence copilot. Clients retain complete authority and final sign-off before invoice disbursement.
                </p>
              </div>
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 px-2.5 py-1 rounded-full">
                  <Lock className="w-3 h-3" />
                  <span>Client Gatekeeper</span>
                </span>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#0F172A] border border-[#1E293B] space-y-4">
              <div className="w-10 h-10 rounded-xl bg-blue-950/60 border border-blue-800/50 flex items-center justify-center">
                <PayPalIcon className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-white">Verified PayPal Integration</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Built on PayPal Invoicing REST API v2 with cryptographic webhook signatures to confirm transparent, dispute-free settlements.
                </p>
              </div>
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-blue-400 bg-blue-950/50 border border-blue-800/40 px-2.5 py-1 rounded-full">
                  <Check className="w-3 h-3" />
                  <span>Cryptographic Webhooks</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FINAL CTA */}
      <section className="py-20 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative p-10 sm:p-16 rounded-3xl bg-gradient-to-b from-[#0F172A] to-[#0A0F1D] border border-[#1E293B] text-center space-y-6 overflow-hidden shadow-2xl">
            {/* Ambient Cyan/Blue Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[250px] bg-blue-600/15 blur-3xl rounded-full pointer-events-none" />

            {/* Decorative Sparkle Accent (Bottom Right) */}
            <div className="absolute -bottom-6 -right-6 w-28 h-28 opacity-20 pointer-events-none text-blue-400">
              <svg viewBox="0 0 100 100" fill="currentColor">
                <path d="M50 0 L55 35 L90 40 L60 60 L70 95 L50 70 L30 95 L40 60 L10 40 L45 35 Z" />
              </svg>
            </div>

            {/* Brand Banner in CTA */}
            <div className="relative z-10 flex justify-center mb-2">
              <BrandHeroBanner className="max-w-xs sm:max-w-sm md:max-w-md" glow={false} />
            </div>

            <div className="relative z-10 space-y-3">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
                Your work deserves a <br className="hidden sm:inline" />
                smarter way to get paid.
              </h2>
              <p className="text-sm sm:text-base text-slate-400 max-w-lg mx-auto">
                Start automating your milestones and invoicing today.
              </p>
            </div>

            <div className="relative z-10 pt-2">
              <button
                onClick={() => navigate('/signup')}
                className="bg-[#0070BA] hover:bg-[#005ea6] text-white text-sm sm:text-base font-semibold px-8 py-3.5 rounded-full transition-all shadow-xl shadow-[#0070BA]/35 hover:shadow-[#0070BA]/55 inline-flex items-center gap-2"
              >
                <span>Start with DevFlow</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer className="border-t border-[#1E293B] bg-[#050811] text-slate-400 text-xs py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            {/* Brand Column */}
            <div className="col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <DevFlowLogo variant="horizontal" theme="auto" size="sm" />
              </div>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                From Code to Cash. Autonomous milestone intelligence and PayPal payment platform for modern engineering teams.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <a
                  href="https://github.com/northstar-studio/payment-gateway"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-lg bg-[#0F172A] border border-[#1E293B] flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
                  title="GitHub Repository"
                >
                  <GitHubIcon className="w-4 h-4" />
                </a>
                <a
                  href="https://developer.paypal.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-lg bg-[#0F172A] border border-[#1E293B] flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
                  title="PayPal Developer"
                >
                  <PayPalIcon className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Column: Product */}
            <div className="space-y-2.5">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Product</h4>
              <ul className="space-y-1.5">
                <li>
                  <button onClick={() => navigate('/dashboard')} className="hover:text-white transition-colors">
                    Command Center
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/projects')} className="hover:text-white transition-colors">
                    Projects Directory
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/milestones')} className="hover:text-white transition-colors">
                    Milestones
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/payments')} className="hover:text-white transition-colors">
                    PayPal Invoices
                  </button>
                </li>
              </ul>
            </div>

            {/* Column: Features */}
            <div className="space-y-2.5">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Features</h4>
              <ul className="space-y-1.5">
                <li>
                  <button onClick={() => navigate('/verification')} className="hover:text-white transition-colors">
                    AI Verification
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/evidence')} className="hover:text-white transition-colors">
                    GitHub Evidence
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('how-it-works')} className="hover:text-white transition-colors">
                    How It Works
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/settings')} className="hover:text-white transition-colors">
                    Settings &amp; Webhooks
                  </button>
                </li>
              </ul>
            </div>

            {/* Column: Resources & Legal */}
            <div className="space-y-2.5">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Resources</h4>
              <ul className="space-y-1.5">
                <li>
                  <a
                    href="https://github.com/northstar-studio/payment-gateway"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    GitHub Repository
                  </a>
                </li>
                <li>
                  <a
                    href="https://developer.paypal.com/docs/api/invoicing/v2/"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    PayPal Invoicing API
                  </a>
                </li>
                <li>
                  <button onClick={() => navigate('/settings')} className="hover:text-white transition-colors">
                    Security Policy
                  </button>
                </li>
                <li>
                  <span className="text-slate-600">Privacy &amp; Terms</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-[#1E293B] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <div>
              &copy; {new Date().getFullYear()} DevFlow. All rights reserved. Built for PayPal Hackathon.
            </div>
            <div className="flex items-center gap-4">
              <span>PayPal Invoicing REST API v2 Sandbox</span>
              <span>&bull;</span>
              <span>GitHub Webhooks Verified</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
