import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  DevFlowLogo,
  ThemeToggle,
  AmbientBackground,
  GuestGuardModal,
  Button,
  Badge,
} from '@/components/common';
import {
  BriefcaseBusiness,
  Code2,
  FolderGit2,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  ArrowRight,
  Star,
  Clock,
  FileCode,
  X,
  Copy,
  Check,
} from 'lucide-react';

export const ClientGuestPage: React.FC = () => {
  const navigate = useNavigate();

  // Guest Restriction Modal State
  const [guardModalOpen, setGuardModalOpen] = useState(false);
  const [guardTitle, setGuardTitle] = useState('');
  const [guardMessage, setGuardMessage] = useState('');

  // Proof Modal State
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [copiedProof, setCopiedProof] = useState(false);

  const triggerGuard = (actionTitle: string, message: string) => {
    setGuardTitle(actionTitle);
    setGuardMessage(message);
    setGuardModalOpen(true);
  };

  const handleCopyProof = () => {
    navigator.clipboard?.writeText(
      '0x4f8a7e2b1c9d3f5a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a'
    );
    setCopiedProof(true);
    setTimeout(() => setCopiedProof(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-[#060B16] text-[#0F172A] dark:text-[#F8FAFC] flex flex-col selection:bg-[#0070BA] selection:text-white relative overflow-x-hidden antialiased font-sans">
      {/* Dynamic ambient glass lighting */}
      <AmbientBackground />

      {/* TOP DEMO MODE PERSPECTIVE BANNER */}
      <div className="sticky top-0 z-40 bg-teal-600/90 dark:bg-[#082226]/95 border-b border-teal-500/30 px-4 sm:px-6 py-2.5 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5 text-white">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-300 dark:bg-teal-400 animate-pulse shrink-0" />
            <span className="font-heading font-bold text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 dark:bg-teal-500/20 border border-white/30 dark:border-teal-400/40 font-mono">
              DEMO MODE: CLIENT PERSPECTIVE
            </span>
            <span className="hidden md:inline text-teal-100 dark:text-teal-200">
              Exploring DevFlow from a Client's viewpoint with demonstration data. Financial actions and hiring are simulated.
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/guest/developer')}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors border border-white/20"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Switch to Developer View</span>
            </button>
            <Link
              to="/signup"
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-white text-teal-900 hover:bg-teal-50 transition-colors shadow-xs"
            >
              <span>Create Account</span>
            </Link>
            <Link
              to="/signup"
              className="text-xs text-teal-100 hover:text-white underline underline-offset-2 px-1"
            >
              Exit
            </Link>
          </div>
        </div>
      </div>

      {/* HEADER NAVIGATION */}
      <header className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-5 pb-4 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4">
          <Link to="/" className="cursor-pointer group select-none flex items-center gap-2">
            <DevFlowLogo variant="horizontal" theme="auto" size="md" />
          </Link>
          <span className="hidden sm:inline-block text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-mono">
            Client Portal (Demo)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/signup')}
            className="text-xs font-semibold hidden sm:inline-flex"
          >
            Back to Signup
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/login')}
            className="text-xs font-semibold shadow-xs"
          >
            Sign In
          </Button>
        </div>
      </header>

      {/* MAIN CLIENT DASHBOARD CONTENT */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-4 flex-1 space-y-6 relative z-10">
        {/* CLIENT WELCOME HERO CARD */}
        <div className="p-6 sm:p-7 rounded-2xl bg-white/70 dark:bg-[#0D1527]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-2xl shadow-glass dark:shadow-dark-glass flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 font-mono uppercase">
                Client Workspace
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Meridian Labs Inc.</span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Client Project Management & Escrow Overview
            </h1>
            <p className="font-sans text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              Define milestone specifications, review cryptographic AI verification proofs, and authorize automated milestone payments with full escrow protection.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="primary"
              onClick={() =>
                triggerGuard(
                  'Create Project Restricted',
                  'In demo mode, creating live client projects is disabled. Sign in or register a verified Client account to launch production projects.'
                )
              }
              className="gap-2 text-xs font-semibold shadow-md bg-[#2563EB] hover:bg-[#1D4ED8]"
            >
              <BriefcaseBusiness className="w-4 h-4" />
              <span>+ New Project</span>
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                triggerGuard(
                  'Deposit Escrow Restricted',
                  'In demo mode, escrow deposits via PayPal Sandbox are simulated. Create an account to fund live milestones.'
                )
              }
              className="gap-2 text-xs font-semibold"
            >
              <CreditCard className="w-4 h-4" />
              <span>Fund Escrow</span>
            </Button>
          </div>
        </div>

        {/* CLIENT METRICS / KPIS (TABULAR NUMERALS) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-white/60 dark:bg-[#0B132B]/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Escrow Funds Committed</span>
              <CreditCard className="w-4 h-4 text-blue-500" />
            </div>
            <div className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-tabular mt-2">
              $32,700.00
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>100% Secured in PayPal Escrow</span>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-white/60 dark:bg-[#0B132B]/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Active Client Projects</span>
              <FolderGit2 className="w-4 h-4 text-purple-500" />
            </div>
            <div className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-tabular mt-2">
              3 Projects
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              <span>Across 4 hired developers</span>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-white/60 dark:bg-[#0B132B]/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Milestones Verified</span>
              <CheckCircle2 className="w-4 h-4 text-teal-500" />
            </div>
            <div className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-tabular mt-2">
              9 / 11
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-teal-600 dark:text-teal-400 font-medium">
              <span>81.8% Overall delivery rate</span>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-white/60 dark:bg-[#0B132B]/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Pending Client Review</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="font-heading text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400 font-tabular mt-2">
              1 Milestone
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              <span>Ready for your approval</span>
            </div>
          </div>
        </div>

        {/* SECTION 1: MILESTONE TRACKING & CRYPTOGRAPHIC VERIFICATION REVIEW (CLIENT PERSPECTIVE) */}
        <div className="p-6 rounded-2xl bg-white/70 dark:bg-[#0D1527]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-2xl shadow-glass dark:shadow-dark-glass space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <h2 className="font-heading text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Milestone Verification Review
                </h2>
              </div>
              <p className="font-sans text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                Review submitted evidence and cryptographic verification proofs before approving payment release.
              </p>
            </div>

            <Badge variant="warning" className="self-start sm:self-auto font-mono text-xs">
              Awaiting Client Approval
            </Badge>
          </div>

          {/* Interactive Milestone Card */}
          <div className="p-5 rounded-xl bg-slate-50/80 dark:bg-[#080D1A]/70 border border-slate-200/80 dark:border-white/10 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 font-mono">
                  Payment Gateway Integration • Milestone #3
                </span>
                <h3 className="font-heading text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  OAuth 2.0 PKCE & HMAC Webhook Security Adapter
                </h3>
                <p className="font-sans text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Assigned Developer: <span className="font-semibold text-slate-900 dark:text-slate-200">Alex Morgan (@northstar-lead)</span> • Linked Repo:{' '}
                  <span className="font-mono text-slate-700 dark:text-slate-300">northstar-studio/payment-gateway</span>
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs text-slate-500 dark:text-slate-400 block">Milestone Value</span>
                <span className="font-heading text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-tabular">
                  $4,500.00 USD
                </span>
              </div>
            </div>

            {/* AI Verification Score Box */}
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading text-sm font-bold text-emerald-700 dark:text-emerald-300">
                      AI Verification Agent: PASSED (96.4% Confidence)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono font-semibold">
                      SHA-256 Proof Valid
                    </span>
                  </div>
                  <p className="font-sans text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    All 4 deliverable criteria mathematically confirmed against GitHub commit history.
                  </p>
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setProofModalOpen(true)}
                className="text-xs font-semibold shrink-0 gap-1.5"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>View Cryptographic Proof</span>
              </Button>
            </div>

            {/* Requirements Checklist */}
            <div className="space-y-2 pt-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Cryptographic Deliverable Checklist
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-lg bg-white/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">HMAC-SHA256 Signature Verification</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                      Verified in commit c3a8e91
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">OAuth 2.0 PKCE Flow for Merchants</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                      Verified in commit 8b2f140
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Test Suite Coverage &gt; 90%</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                      94.2% test branch coverage verified
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Zero Hardcoded Secrets Audit</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                      Entropy analysis zero high-entropy keys
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200/80 dark:border-white/10">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Approving releases funds immediately from PayPal escrow to developer account.
              </span>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    triggerGuard(
                      'Request Revision Restricted',
                      'In demo mode, revision requests cannot be dispatched to developers. Create a Client account to collaborate.'
                    )
                  }
                  className="w-full sm:w-auto text-xs font-semibold"
                >
                  Request Revision
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    triggerGuard(
                      'Payment Release Restricted',
                      'Demo Mode: Real payment execution is restricted. Sign in or register a verified Client account to release live PayPal escrow funds.'
                    )
                  }
                  className="w-full sm:w-auto text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                >
                  Approve &amp; Release Payment ($4,500.00)
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: SAMPLE CLIENT PROJECTS */}
        <div className="p-6 rounded-2xl bg-white/70 dark:bg-[#0D1527]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-2xl shadow-glass dark:shadow-dark-glass space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Active Client Projects
              </h2>
              <p className="font-sans text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Track progress, linked GitHub repositories, and budget allocation.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                triggerGuard(
                  'Project Creation Restricted',
                  'Register a Client account to create and manage client projects.'
                )
              }
              className="text-xs font-semibold"
            >
              + Add Project
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {/* Project 1 */}
            <div className="p-4.5 rounded-xl bg-slate-50/80 dark:bg-[#080D1A]/70 border border-slate-200/80 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 font-mono">
                  In Progress
                </span>
                <span className="font-heading font-bold text-xs text-slate-900 dark:text-white font-tabular">
                  $18,500.00
                </span>
              </div>
              <div>
                <h4 className="font-heading text-sm font-bold text-slate-900 dark:text-white">
                  Payment Gateway Integration
                </h4>
                <p className="font-sans text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                  Autonomous requirement validation against GitHub commits with PayPal instant invoice settlement.
                </p>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-slate-200/80 dark:border-white/10">
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Milestones: 2 of 4</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">75% Complete</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full w-3/4" />
                </div>
              </div>
            </div>

            {/* Project 2 */}
            <div className="p-4.5 rounded-xl bg-slate-50/80 dark:bg-[#080D1A]/70 border border-slate-200/80 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono">
                  Completed
                </span>
                <span className="font-heading font-bold text-xs text-slate-900 dark:text-white font-tabular">
                  $14,200.00
                </span>
              </div>
              <div>
                <h4 className="font-heading text-sm font-bold text-slate-900 dark:text-white">
                  Real-time Analytics Dashboard
                </h4>
                <p className="font-sans text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                  Developer telemetry, milestone metric analysis, and live audit telemetry feeds.
                </p>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-slate-200/80 dark:border-white/10">
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Milestones: 3 of 3</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">100% Complete</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-full" />
                </div>
              </div>
            </div>

            {/* Project 3 */}
            <div className="p-4.5 rounded-xl bg-slate-50/80 dark:bg-[#080D1A]/70 border border-slate-200/80 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 font-mono">
                  Active
                </span>
                <span className="font-heading font-bold text-xs text-slate-900 dark:text-white font-tabular">
                  $12,000.00
                </span>
              </div>
              <div>
                <h4 className="font-heading text-sm font-bold text-slate-900 dark:text-white">
                  Enterprise Auth0 &amp; RBAC Portal
                </h4>
                <p className="font-sans text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                  Multi-tenant authorization, role governance, and cryptographic session proofs.
                </p>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-slate-200/80 dark:border-white/10">
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Milestones: 1 of 3</span>
                  <span className="font-semibold text-purple-600 dark:text-purple-400">33% Complete</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full w-1/3" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: DEVELOPER TALENT DIRECTORY (CLIENT PERSPECTIVE) */}
        <div className="p-6 rounded-2xl bg-white/70 dark:bg-[#0D1527]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-2xl shadow-glass dark:shadow-dark-glass space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                DevFlow Verified Developer Directory
              </h2>
              <p className="font-sans text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Browse pre-vetted engineers with cryptographic verification track records.
              </p>
            </div>
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 font-mono">
              3 Developers Featured
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {/* Developer 1 */}
            <div className="p-5 rounded-xl bg-slate-50/80 dark:bg-[#080D1A]/70 border border-slate-200/80 dark:border-white/10 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-bold text-white text-sm shadow-xs">
                    AM
                  </div>
                  <div>
                    <h4 className="font-heading text-sm font-bold text-slate-900 dark:text-white">
                      Alex Morgan
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Lead Full-Stack &amp; Cryptography
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1 text-amber-500 font-semibold">
                    <Star className="w-3.5 h-3.5 fill-current" /> 5.0 (42)
                  </span>
                  <span>•</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    98.4% AI Pass Rate
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['React', 'Node.js', 'PayPal SDK', 'Rust'].map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-200/70 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-mono"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                <div>
                  <span className="font-heading font-bold text-sm text-slate-900 dark:text-white font-tabular">
                    $95
                  </span>
                  <span className="text-xs text-slate-500">/hr</span>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    triggerGuard(
                      'Hiring Restricted in Demo',
                      'To hire Alex Morgan or assign milestones, create an official Client account.'
                    )
                  }
                  className="text-xs font-semibold"
                >
                  Hire Developer
                </Button>
              </div>
            </div>

            {/* Developer 2 */}
            <div className="p-5 rounded-xl bg-slate-50/80 dark:bg-[#080D1A]/70 border border-slate-200/80 dark:border-white/10 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center font-bold text-white text-sm shadow-xs">
                    ER
                  </div>
                  <div>
                    <h4 className="font-heading text-sm font-bold text-slate-900 dark:text-white">
                      Elena Rostova
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Distributed Systems &amp; Security
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1 text-amber-500 font-semibold">
                    <Star className="w-3.5 h-3.5 fill-current" /> 4.9 (38)
                  </span>
                  <span>•</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    96.8% AI Pass Rate
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['Go', 'TypeScript', 'PostgreSQL', 'ZK-Proofs'].map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-200/70 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-mono"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                <div>
                  <span className="font-heading font-bold text-sm text-slate-900 dark:text-white font-tabular">
                    $110
                  </span>
                  <span className="text-xs text-slate-500">/hr</span>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    triggerGuard(
                      'Hiring Restricted in Demo',
                      'To hire Elena Rostova or assign milestones, create an official Client account.'
                    )
                  }
                  className="text-xs font-semibold"
                >
                  Hire Developer
                </Button>
              </div>
            </div>

            {/* Developer 3 */}
            <div className="p-5 rounded-xl bg-slate-50/80 dark:bg-[#080D1A]/70 border border-slate-200/80 dark:border-white/10 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-500 flex items-center justify-center font-bold text-white text-sm shadow-xs">
                    MS
                  </div>
                  <div>
                    <h4 className="font-heading text-sm font-bold text-slate-900 dark:text-white">
                      Marcus Sterling
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Smart Contracts &amp; Payments
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1 text-amber-500 font-semibold">
                    <Star className="w-3.5 h-3.5 fill-current" /> 4.8 (29)
                  </span>
                  <span>•</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    95.2% AI Pass Rate
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['Solidity', 'Python', 'API Gateway', 'Docker'].map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-200/70 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-mono"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                <div>
                  <span className="font-heading font-bold text-sm text-slate-900 dark:text-white font-tabular">
                    $85
                  </span>
                  <span className="text-xs text-slate-500">/hr</span>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    triggerGuard(
                      'Hiring Restricted in Demo',
                      'To hire Marcus Sterling or assign milestones, create an official Client account.'
                    )
                  }
                  className="text-xs font-semibold"
                >
                  Hire Developer
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM CALL TO ACTION SWITCHER */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-teal-500/10 via-blue-500/10 to-purple-500/10 border border-teal-500/20 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-heading text-base font-bold text-slate-900 dark:text-white">
              Ready to experience DevFlow with your real team?
            </h3>
            <p className="font-sans text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Create a free Client account or switch to the Developer perspective to test commit verification.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="secondary"
              onClick={() => navigate('/guest/developer')}
              className="text-xs font-semibold gap-1.5"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Developer Guest View</span>
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/signup')}
              className="text-xs font-semibold gap-1.5 shadow-sm"
            >
              <span>Create Free Account</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 text-center text-xs text-slate-500 dark:text-slate-400 relative z-10 border-t border-slate-200/80 dark:border-white/10 mt-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>DevFlow &bull; Enterprise Milestone Verification &amp; Payment Escrow</span>
          <div className="flex items-center gap-4">
            <Link to="/signup" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Signup Options
            </Link>
            <Link to="/login" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Login
            </Link>
            <Link to="/" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Home
            </Link>
          </div>
        </div>
      </footer>

      {/* CRYPTOGRAPHIC PROOF DETAIL MODAL */}
      {proofModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setProofModalOpen(false)}
          />
          <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-[#0D1527] border border-slate-200 dark:border-white/10 p-6 shadow-2xl z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <h3 className="font-heading text-base font-bold text-slate-900 dark:text-white">
                  Cryptographic Verification Receipt
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setProofModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-sans">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block mb-1">Merkle Root Hash (SHA-256):</span>
                <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 font-mono text-[11px] text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span className="truncate pr-2">0x4f8a7e2b1c9d3f5a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a</span>
                  <button
                    type="button"
                    onClick={handleCopyProof}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    {copiedProof ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5">
                  <span className="text-slate-400 block text-[10px]">Verified Commit:</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">c3a8e91</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5">
                  <span className="text-slate-400 block text-[10px]">AI Model Auditor:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Gemini 1.5 Pro Verifier</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-xs">
                This verification proof is cryptographically sealed and cannot be altered by either client or developer.
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setProofModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* REUSABLE GUEST GUARD RESTRICTION MODAL */}
      <GuestGuardModal
        isOpen={guardModalOpen}
        onClose={() => setGuardModalOpen(false)}
        actionTitle={guardTitle}
        message={guardMessage}
      />
    </div>
  );
};
