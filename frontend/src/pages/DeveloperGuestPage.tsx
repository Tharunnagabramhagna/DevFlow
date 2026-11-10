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
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  ArrowRight,
  GitBranch,
  Github,
  Terminal,
  Play,
  Loader2,
  Clock,
  Check,
  Zap,
} from 'lucide-react';

export const DeveloperGuestPage: React.FC = () => {
  const navigate = useNavigate();

  // Guard restriction modal
  const [guardModalOpen, setGuardModalOpen] = useState(false);
  const [guardTitle, setGuardTitle] = useState('');
  const [guardMessage, setGuardMessage] = useState('');

  // Interactive GitHub linking demo state
  const [selectedRepo, setSelectedRepo] = useState('northstar-studio/payment-gateway');
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [webhookStatus, setWebhookStatus] = useState<'idle' | 'testing' | 'received'>('idle');

  // Interactive AI verification demo state
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditStep, setAuditStep] = useState(0);
  const [auditDone, setAuditDone] = useState(false);

  const triggerGuard = (actionTitle: string, message: string) => {
    setGuardTitle(actionTitle);
    setGuardMessage(message);
    setGuardModalOpen(true);
  };

  const handleTestWebhook = () => {
    setWebhookStatus('testing');
    setTimeout(() => {
      setWebhookStatus('received');
      setTimeout(() => setWebhookStatus('idle'), 4000);
    }, 1200);
  };

  const handleRunAiAudit = () => {
    setAuditRunning(true);
    setAuditDone(false);
    setAuditStep(1);

    setTimeout(() => {
      setAuditStep(2);
      setTimeout(() => {
        setAuditStep(3);
        setTimeout(() => {
          setAuditStep(4);
          setTimeout(() => {
            setAuditRunning(false);
            setAuditDone(true);
          }, 600);
        }, 600);
      }, 600);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-[#060B16] text-[#0F172A] dark:text-[#F8FAFC] flex flex-col selection:bg-[#0070BA] selection:text-white relative overflow-x-hidden antialiased font-sans">
      {/* Dynamic ambient glass lighting */}
      <AmbientBackground />

      {/* TOP DEMO MODE PERSPECTIVE BANNER */}
      <div className="sticky top-0 z-40 bg-sky-700/90 dark:bg-[#071F38]/95 border-b border-sky-500/30 px-4 sm:px-6 py-2.5 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5 text-white">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse shrink-0" />
            <span className="font-heading font-bold text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 dark:bg-sky-500/20 border border-white/30 dark:border-sky-400/40 font-mono">
              DEMO MODE: DEVELOPER PERSPECTIVE
            </span>
            <span className="hidden md:inline text-sky-100 dark:text-sky-200">
              Exploring DevFlow from a Developer's viewpoint with demonstration data. Repository changes and real payouts are simulated.
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/guest/client')}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors border border-white/20"
            >
              <BriefcaseBusiness className="w-3.5 h-3.5" />
              <span>Switch to Client View</span>
            </button>
            <Link
              to="/signup"
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-white text-sky-950 hover:bg-sky-50 transition-colors shadow-xs"
            >
              <span>Create Account</span>
            </Link>
            <Link
              to="/signup"
              className="text-xs text-sky-100 hover:text-white underline underline-offset-2 px-1"
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
          <span className="hidden sm:inline-block text-xs font-semibold px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-mono">
            Developer Workspace (Demo)
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

      {/* MAIN DEVELOPER DASHBOARD CONTENT */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-4 flex-1 space-y-6 relative z-10">
        {/* DEVELOPER HERO CARD */}
        <div className="p-6 sm:p-7 rounded-2xl bg-white/70 dark:bg-[#0D1527]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-2xl shadow-glass dark:shadow-dark-glass flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 font-mono uppercase">
                Developer Identity
              </span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">@northstar-lead</span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Developer Pipeline &amp; Milestone Deliverable Studio
            </h1>
            <p className="font-sans text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              Link GitHub repositories, trigger cryptographic AI requirement verification against commit SHAs, and receive instant automated PayPal milestone payouts.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="primary"
              onClick={() =>
                triggerGuard(
                  'Repository Link Restricted',
                  'In demo mode, linking live private repositories is disabled. Sign in or register a Developer account to connect live GitHub accounts.'
                )
              }
              className="gap-2 text-xs font-semibold shadow-md bg-purple-600 hover:bg-purple-500"
            >
              <Github className="w-4 h-4" />
              <span>Link GitHub Repo</span>
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                triggerGuard(
                  'Withdraw Funds Restricted',
                  'In demo mode, payouts are simulated. Sign in or register a Developer account with a verified PayPal email to withdraw funds.'
                )
              }
              className="gap-2 text-xs font-semibold"
            >
              <CreditCard className="w-4 h-4" />
              <span>Withdraw Payout</span>
            </Button>
          </div>
        </div>

        {/* DEVELOPER METRICS / KPIS (TABULAR NUMERALS) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-white/60 dark:bg-[#0B132B]/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Total Payouts Received</span>
              <CreditCard className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-tabular mt-2">
              $9,500.00
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Instant PayPal settlement</span>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-white/60 dark:bg-[#0B132B]/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Pending Milestone Escrow</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="font-heading text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400 font-tabular mt-2">
              $4,500.00
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              <span>Awaiting client signature</span>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-white/60 dark:bg-[#0B132B]/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>AI Verification Pass Rate</span>
              <ShieldCheck className="w-4 h-4 text-purple-500" />
            </div>
            <div className="font-heading text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400 font-tabular mt-2">
              98.2%
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-purple-600 dark:text-purple-400 font-medium">
              <span>Top 2% of DevFlow Engineers</span>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-white/60 dark:bg-[#0B132B]/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>Linked Repositories</span>
              <GitBranch className="w-4 h-4 text-sky-500" />
            </div>
            <div className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-tabular mt-2">
              3 Repos
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-sky-600 dark:text-sky-400 font-medium">
              <span>Active GitHub Webhooks</span>
            </div>
          </div>
        </div>

        {/* SECTION 1: GITHUB REPOSITORY LINKING DEMONSTRATION */}
        <div className="p-6 rounded-2xl bg-white/70 dark:bg-[#0D1527]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-2xl shadow-glass dark:shadow-dark-glass space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Github className="w-5 h-5 text-slate-900 dark:text-white" />
                <h2 className="font-heading text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  GitHub Repository &amp; Webhook Integration (Interactive Demo)
                </h2>
              </div>
              <p className="font-sans text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                DevFlow listens to push events and automatically indexes commits for cryptographic milestone verification.
              </p>
            </div>

            <Badge variant="success" className="self-start sm:self-auto font-mono text-xs">
              Live Webhook Connected
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {/* Repo Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Selected Repository:
              </label>
              <select
                value={selectedRepo}
                onChange={(e) => setSelectedRepo(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#080D1A] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="northstar-studio/payment-gateway">northstar-studio/payment-gateway</option>
                <option value="northstar-studio/analytics-dashboard">northstar-studio/analytics-dashboard</option>
                <option value="northstar-studio/api-modernization">northstar-studio/api-modernization</option>
              </select>
            </div>

            {/* Branch Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Active Tracking Branch:
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#080D1A] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="main">main (Production)</option>
                <option value="feature/paypal-sdk">feature/paypal-sdk</option>
                <option value="develop">develop (Staging)</option>
              </select>
            </div>

            {/* Webhook Action */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Simulate Webhook Push Event:
              </label>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleTestWebhook}
                disabled={webhookStatus === 'testing'}
                className="w-full justify-center gap-1.5 text-xs font-semibold"
              >
                {webhookStatus === 'testing' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Emitting GitHub Webhook...</span>
                  </>
                ) : webhookStatus === 'received' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">Push Event Received (200 OK)</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Test Ping Webhook</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Webhook notification card */}
          {webhookStatus === 'received' && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                  GitHub event <code className="font-mono font-bold">push::commit[c3a8e91]</code> received and indexed by DevFlow Webhook Daemon.
                </span>
              </div>
              <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">Latency: 48ms</span>
            </div>
          )}
        </div>

        {/* SECTION 2: MILESTONE SUBMISSION & DELIVERABLE VERIFICATION DEMO */}
        <div className="p-6 rounded-2xl bg-white/70 dark:bg-[#0D1527]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-2xl shadow-glass dark:shadow-dark-glass space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h2 className="font-heading text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Milestone Submission &amp; AI Verification (Interactive Demo)
                </h2>
              </div>
              <p className="font-sans text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                Simulate how code deliverables are evaluated by autonomous AI agents to certify compliance and release escrow.
              </p>
            </div>

            <span className="text-xs font-mono text-purple-600 dark:text-purple-400 font-semibold px-2.5 py-1 rounded-md bg-purple-500/10 border border-purple-500/20">
              Contract Value: $4,500.00 USD
            </span>
          </div>

          <div className="p-5 rounded-xl bg-slate-50/80 dark:bg-[#080D1A]/70 border border-slate-200/80 dark:border-white/10 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Target Milestone:</span>
                <div className="p-2.5 rounded-lg bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white">
                  Milestone #3: OAuth 2.0 PKCE &amp; HMAC Webhook Security Adapter
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Deliverable Commit SHA:</span>
                <div className="p-2.5 rounded-lg bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-900 dark:text-white flex items-center justify-between">
                  <span>c3a8e91 - feat: implement HMAC webhook verification</span>
                  <span className="text-[10px] text-emerald-500 font-bold uppercase">Pushed</span>
                </div>
              </div>
            </div>

            {/* Run Audit Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click below to simulate real-time AI Agent commit diff analysis and cryptographic proof generation:
              </p>

              <Button
                variant="primary"
                onClick={handleRunAiAudit}
                disabled={auditRunning}
                className="w-full sm:w-auto text-xs font-semibold gap-2 bg-purple-600 hover:bg-purple-500 shadow-sm"
              >
                {auditRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing Deliverables...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Run AI Verification Audit</span>
                  </>
                )}
              </Button>
            </div>

            {/* Audit Progress or Result Display */}
            {auditRunning && (
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2 text-xs">
                <div className="flex items-center justify-between text-purple-700 dark:text-purple-300 font-semibold">
                  <span>Verification in Progress...</span>
                  <span className="font-mono">{auditStep * 25}%</span>
                </div>
                <div className="w-full h-2 bg-purple-200 dark:bg-purple-950/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600 rounded-full transition-all duration-500"
                    style={{ width: `${auditStep * 25}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                  {auditStep === 1 && '› Fetching AST git diff from GitHub API...'}
                  {auditStep === 2 && '› Running static security & cryptographic secret scan...'}
                  {auditStep === 3 && '› Validating test execution coverage & requirement assertions...'}
                  {auditStep === 4 && '› Sealing Merkle tree & calculating SHA-256 verification hash...'}
                </div>
              </div>
            )}

            {auditDone && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-3 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span>Milestone Verification Passed (Score: 98.4%)</span>
                  </div>
                  <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                    Proof Hash: 0x4f8a...6f5a
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>HMAC-SHA256 Implementation: Confirmed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>OAuth 2.0 PKCE Spec: Compliant</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Unit Test Coverage: 94.2%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Secrets Audit: Clean</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-500/20 flex justify-end">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() =>
                      triggerGuard(
                        'Deliverable Submission Restricted',
                        'In demo mode, submitting deliverables for live client payment release is disabled. Sign in or register a Developer account to submit real milestones.'
                      )
                    }
                    className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-500"
                  >
                    Submit Deliverable to Client for $4,500.00 Payout
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: PROJECT OPPORTUNITIES BOARD (DEVELOPER PERSPECTIVE) */}
        <div className="p-6 rounded-2xl bg-white/70 dark:bg-[#0D1527]/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-2xl shadow-glass dark:shadow-dark-glass space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Available Developer Contracts &amp; Milestones
              </h2>
              <p className="font-sans text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Explore verified client milestones backed by funded escrow ready for developer proposals.
              </p>
            </div>
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 font-mono">
              3 Opportunities Open
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {/* Contract 1 */}
            <div className="p-5 rounded-xl bg-slate-50/80 dark:bg-[#080D1A]/70 border border-slate-200/80 dark:border-white/10 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono">
                    Escrow Funded
                  </span>
                  <span className="font-heading font-bold text-sm text-slate-900 dark:text-white font-tabular">
                    $8,500.00
                  </span>
                </div>
                <h4 className="font-heading text-sm font-bold text-slate-900 dark:text-white">
                  High-Throughput PayPal Webhook Router
                </h4>
                <p className="font-sans text-xs text-slate-500 dark:text-slate-400 line-clamp-3">
                  Meridian Labs is contracting an engineer to build a resilient multi-tenant webhook event consumer with automatic retries and HMAC validation.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-mono">3 Milestones</span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    triggerGuard(
                      'Proposal Submission Restricted',
                      'To submit proposals and take on funded contracts, register a verified Developer account.'
                    )
                  }
                  className="text-xs font-semibold"
                >
                  Apply for Contract
                </Button>
              </div>
            </div>

            {/* Contract 2 */}
            <div className="p-5 rounded-xl bg-slate-50/80 dark:bg-[#080D1A]/70 border border-slate-200/80 dark:border-white/10 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono">
                    Escrow Funded
                  </span>
                  <span className="font-heading font-bold text-sm text-slate-900 dark:text-white font-tabular">
                    $6,200.00
                  </span>
                </div>
                <h4 className="font-heading text-sm font-bold text-slate-900 dark:text-white">
                  SOC-2 Compliance Audit Automation
                </h4>
                <p className="font-sans text-xs text-slate-500 dark:text-slate-400 line-clamp-3">
                  Vertex Systems needs automated cryptographic audit log generation for database migrations and credential rotation pipelines.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-mono">2 Milestones</span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    triggerGuard(
                      'Proposal Submission Restricted',
                      'To submit proposals and take on funded contracts, register a verified Developer account.'
                    )
                  }
                  className="text-xs font-semibold"
                >
                  Apply for Contract
                </Button>
              </div>
            </div>

            {/* Contract 3 */}
            <div className="p-5 rounded-xl bg-slate-50/80 dark:bg-[#080D1A]/70 border border-slate-200/80 dark:border-white/10 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono">
                    Escrow Funded
                  </span>
                  <span className="font-heading font-bold text-sm text-slate-900 dark:text-white font-tabular">
                    $11,000.00
                  </span>
                </div>
                <h4 className="font-heading text-sm font-bold text-slate-900 dark:text-white">
                  Cross-Chain Escrow Oracle Engine
                </h4>
                <p className="font-sans text-xs text-slate-500 dark:text-slate-400 line-clamp-3">
                  BluePeak Tech requires a high-security oracle connector bridging GitHub release events to automated smart contract milestone settlement.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-mono">4 Milestones</span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    triggerGuard(
                      'Proposal Submission Restricted',
                      'To submit proposals and take on funded contracts, register a verified Developer account.'
                    )
                  }
                  className="text-xs font-semibold"
                >
                  Apply for Contract
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM CALL TO ACTION SWITCHER */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-sky-500/10 via-purple-500/10 to-teal-500/10 border border-sky-500/20 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-heading text-base font-bold text-slate-900 dark:text-white">
              Ready to link your repositories and receive guaranteed payouts?
            </h3>
            <p className="font-sans text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Create a free Developer account or switch to the Client perspective to explore project hiring.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="secondary"
              onClick={() => navigate('/guest/client')}
              className="text-xs font-semibold gap-1.5"
            >
              <BriefcaseBusiness className="w-3.5 h-3.5" />
              <span>Client Guest View</span>
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
          <span>DevFlow &bull; Enterprise Milestone Verification &amp; Developer Escrow</span>
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
