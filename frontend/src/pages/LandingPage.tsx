import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  GitBranch,
  Sparkles,
  CreditCard,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FolderGit2,
  Menu,
  X,
  Layers,
  Zap,
  AlertCircle,
} from 'lucide-react';
import { Badge, Button } from '@/components/common';

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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-[#0070BA] selection:text-white overflow-x-hidden">
      {/* ──────────────────────────────────────────────────────────────────────────
          1. NAVIGATION
      ────────────────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#003087] via-[#004B87] to-[#0070BA] flex items-center justify-center text-white font-bold text-base shadow-sm">
              DF
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-lg tracking-tight">DevFlow</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-[#0070BA]/20 text-sky-400 border border-sky-400/30 px-1.5 py-0.2 rounded">
                  PayPal
                </span>
              </div>
              <span className="text-[10px] text-slate-400 hidden xs:inline">Milestone Intelligence</span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-300">
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('ai-verification')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              AI Verification
            </button>
            <button
              onClick={() => scrollToSection('github-evidence')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              GitHub Evidence
            </button>
            <button
              onClick={() => scrollToSection('paypal-workflow')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              PayPal Payments
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Features
            </button>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="https://github.com/Tharunnagabramhagna/DevFlow"
              target="_blank"
              rel="noreferrer"
              className="p-2 text-slate-400 hover:text-white transition-colors"
              title="View Repository on GitHub"
            >
              <GitBranch className="w-4 h-4" />
            </a>
            <Button
              variant="paypal"
              size="sm"
              onClick={() => navigate('/dashboard')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              data-testid="landing-open-dashboard"
            >
              Open Dashboard
            </Button>
          </div>

          {/* Mobile Menu Trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition-colors"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-150">
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="block w-full text-left py-2 text-sm font-semibold text-slate-300 hover:text-white"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('ai-verification')}
              className="block w-full text-left py-2 text-sm font-semibold text-slate-300 hover:text-white"
            >
              AI Verification
            </button>
            <button
              onClick={() => scrollToSection('github-evidence')}
              className="block w-full text-left py-2 text-sm font-semibold text-slate-300 hover:text-white"
            >
              GitHub Evidence
            </button>
            <button
              onClick={() => scrollToSection('paypal-workflow')}
              className="block w-full text-left py-2 text-sm font-semibold text-slate-300 hover:text-white"
            >
              PayPal Payments
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="block w-full text-left py-2 text-sm font-semibold text-slate-300 hover:text-white"
            >
              Features
            </button>
            <div className="pt-2 border-t border-slate-800">
              <Button
                variant="paypal"
                size="sm"
                className="w-full"
                onClick={() => navigate('/dashboard')}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Open Dashboard
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* ──────────────────────────────────────────────────────────────────────────
          2. HERO SECTION
      ────────────────────────────────────────────────────────────────────────── */}
      <section className="relative pt-16 sm:pt-24 pb-16 sm:pb-24 overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-[#003087]/30 to-[#0070BA]/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center space-y-6 sm:space-y-8">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-sky-300 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#0070BA] animate-pulse" />
            <span className="font-semibold">PayPal Hackathon Project</span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-slate-400">Milestone Verification &amp; Settlement</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
            Turn Verified Work Into{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-[#0070BA] to-emerald-400">
              Trusted Payments.
            </span>
          </h1>

          {/* Supporting Text */}
          <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            DevFlow connects GitHub evidence, AI-powered milestone verification and PayPal payment workflows in one
            transparent platform.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              variant="paypal"
              size="lg"
              onClick={() => navigate('/dashboard')}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="w-full sm:w-auto text-sm px-6 py-3"
              data-testid="hero-explore-dashboard-btn"
            >
              Explore Dashboard
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => scrollToSection('how-it-works')}
              className="w-full sm:w-auto text-sm px-6 py-3 bg-slate-900/60 border-slate-700 text-slate-200 hover:bg-slate-800"
            >
              See How It Works
            </Button>
          </div>

          {/* Trust Highlights */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Cryptographic Webhook Validation
            </span>
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              AST Semantic Code Verification
            </span>
            <span className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#0070BA]" />
              Official PayPal REST Invoicing v2
            </span>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          3. PRODUCT PREVIEW (Interactive Dashboard Mockup)
      ────────────────────────────────────────────────────────────────────────── */}
      <section className="py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden backdrop-blur-md">
          {/* Mock Browser Title Bar */}
          <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 text-xs font-mono text-slate-400">devflow.team/#/dashboard</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Monitored Repo: Tharunnagabramhagna/DevFlow
            </div>
          </div>

          {/* Mock Dashboard Body */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* Mock Top Metrics Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Active Projects</span>
                <div className="text-2xl font-bold font-mono text-white">2</div>
                <span className="text-[10px] text-emerald-400">100% webhooks active</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Fulfilled Milestones</span>
                <div className="text-2xl font-bold font-mono text-white">2 / 4</div>
                <span className="text-[10px] text-emerald-400">50% completed</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">AI Verification</span>
                <div className="text-2xl font-bold font-mono text-violet-400">90%</div>
                <span className="text-[10px] text-amber-400">Milestone 3 Awaiting Client</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">PayPal Settled</span>
                <div className="text-2xl font-bold font-mono text-emerald-400">$7,600.00</div>
                <span className="text-[10px] text-slate-400">Verified via webhook signatures</span>
              </div>
            </div>

            {/* Mock Milestones Table Strip */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>Active Deliverables Pipeline</span>
                <span className="font-mono text-[11px] text-slate-500">Representative Demonstration Data</span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="font-semibold text-white">Milestone 1: Backend Architecture &amp; Database</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 font-bold">$3,200.00 USD</span>
                    <Badge variant="success" size="sm">
                      PAID &bull; Settled
                    </Badge>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="font-semibold text-white">Milestone 2: PayPal Invoicing API &amp; Webhook Verifier</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 font-bold">$4,400.00 USD</span>
                    <Badge variant="success" size="sm">
                      PAID &bull; Settled
                    </Badge>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                    <span className="font-semibold text-white">Milestone 3: AI Verification &amp; Evidence Analysis</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sky-300 font-bold">$3,200.00 USD</span>
                    <Badge variant="ai" size="sm">
                      AI Verified (90%)
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Banner */}
            <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
              <span>All 7 workspace views are fully interactive in the dashboard.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="bg-slate-950 border-slate-700 text-sky-400 hover:bg-slate-800 text-xs"
              >
                Launch Live App &rarr;
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          4. HOW IT WORKS
      ────────────────────────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <Badge variant="paypal" size="sm">
            Transparent Workflow
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">How DevFlow Works</h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            From Git commit to PayPal settlement &mdash; zero ambiguity, objective verification, and client trust.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Step 1 */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3 hover:border-slate-700 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-slate-800 text-sky-400 flex items-center justify-center font-bold text-sm font-mono">
              01
            </div>
            <h3 className="font-bold text-sm text-white">Connect GitHub</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Link the repository branch. DevFlow indexes commits, pull requests, and file diffs in real time.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3 hover:border-slate-700 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-slate-800 text-sky-400 flex items-center justify-center font-bold text-sm font-mono">
              02
            </div>
            <h3 className="font-bold text-sm text-white">Track Milestones</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Define measurable acceptance criteria, deliverable scopes, and agreed milestone payout values.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3 hover:border-violet-500/50 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-violet-950 text-violet-300 flex items-center justify-center font-bold text-sm font-mono">
              03
            </div>
            <h3 className="font-bold text-sm text-white">Review AI Scoring</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              DevFlow analyzes code diffs against requirements, producing citations, test suite stats, and confidence scores.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3 hover:border-slate-700 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-slate-800 text-amber-400 flex items-center justify-center font-bold text-sm font-mono">
              04
            </div>
            <h3 className="font-bold text-sm text-white">Client Sign-Off</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Human-in-the-loop approval. Clients inspect evidence and approve deliverables before any invoice is actioned.
            </p>
          </div>

          {/* Step 5 */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3 hover:border-emerald-500/50 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-emerald-950 text-emerald-300 flex items-center justify-center font-bold text-sm font-mono">
              05
            </div>
            <h3 className="font-bold text-sm text-white">PayPal Settlement</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Invoices are issued via PayPal REST API v2; cryptographically verified webhook events mark invoices paid.
            </p>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          5. AI VERIFICATION SECTION
      ────────────────────────────────────────────────────────────────────────── */}
      <section id="ai-verification" className="py-16 sm:py-24 bg-slate-900/50 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <Badge variant="ai" size="sm">
                Objective Code Intelligence
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Explainable AI Verification Without Hallucinations
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                DevFlow matches technical acceptance criteria with exact syntactic code evidence from repository pull requests.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/verification')}
              className="self-start lg:self-auto bg-slate-950 border-slate-700 text-slate-200"
            >
              Inspect Live Reports &rarr;
            </Button>
          </div>

          {/* Sample AI Report Card */}
          <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400">REPORT #ai_rep_03</span>
                  <Badge variant="success" size="sm">
                    Passed (90%)
                  </Badge>
                  <span className="text-[10px] text-violet-400 font-mono bg-violet-950/60 px-2 py-0.5 rounded border border-violet-800/50">
                    DevFlow-AI v0.1.0
                  </span>
                </div>
                <h4 className="text-base font-bold text-white mt-1">
                  Milestone 3: AI Milestone Verification &amp; Evidence Analysis
                </h4>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-3xl font-black font-mono text-emerald-400">90%</div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Confidence</span>
                </div>
              </div>
            </div>

            {/* Requirement Breakdown Sample */}
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold text-white">
                      Requirement Acceptance Criteria Evaluation Engine
                    </span>
                  </div>
                  <span className="font-mono text-emerald-400 font-bold">91% Match</span>
                </div>
                <p className="text-slate-400 pl-6 leading-relaxed">
                  AST analyzer identifies code syntax matching schema validation requirements. Confirmed against TypeScript types.
                </p>
                <div className="pl-6 flex items-center gap-2 font-mono text-[11px] text-slate-400">
                  <span>Matched commit evidence:</span>
                  <span className="bg-slate-800 px-2 py-0.5 rounded text-sky-400">3e41b99</span>
                </div>
              </div>
            </div>

            {/* Mandatory Human-in-the-Loop Callout */}
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 flex items-start gap-3 text-xs text-amber-200">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-amber-100">Human-in-the-Loop Architecture</p>
                <p className="text-amber-300/90 leading-relaxed">
                  AI verification produces automated pattern matching only. AI confidence is NOT proof of correctness.
                  AI verification is NOT client approval. Human review by the client is required before any invoice is issued or paid.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          6. GITHUB EVIDENCE SECTION
      ────────────────────────────────────────────────────────────────────────── */}
      <section id="github-evidence" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <Badge variant="neutral" size="sm">
              Source of Truth
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Immutable GitHub Evidence Trail
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Every deliverable links directly to audited git commits, pull request discussions, and structured file diffs.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/evidence')}
            className="self-start lg:self-auto bg-slate-900 border-slate-700 text-slate-200"
          >
            Open Evidence Audit &rarr;
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Monitored Commits</div>
            <div className="text-2xl font-bold font-mono text-white">4 Verified</div>
            <p className="text-xs text-slate-400">Indexed commit hashes on monitored main branch</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cumulative Line Diff</div>
            <div className="text-2xl font-bold font-mono text-emerald-400">+1,807 / -67</div>
            <p className="text-xs text-slate-400">Calculated across repository source files</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Milestone Mapping</div>
            <div className="text-2xl font-bold font-mono text-sky-400">100% Associated</div>
            <p className="text-xs text-slate-400">Every acceptance criterion cites specific commit SHAs</p>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          7. PAYPAL PAYMENT WORKFLOW SECTION
      ────────────────────────────────────────────────────────────────────────── */}
      <section id="paypal-workflow" className="py-16 sm:py-24 bg-slate-900/40 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge variant="paypal" size="sm">
              Financial Integration
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Official PayPal REST Invoicing &amp; Webhooks
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              No manual bank wires or disputed hours. Invoices are issued via PayPal REST API v2 and automatically reconciled
              upon cryptographic webhook verification.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Flow Card 1: Invoicing */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#0070BA]/20 text-sky-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Automated Invoicing API</h4>
                  <p className="text-xs text-slate-400">POST /v2/invoicing/invoices</p>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                When a client signs off on verified milestone deliverables, DevFlow creates and dispatches an official PayPal
                invoice directly to the client's email with net terms and itemized deliverable lines.
              </p>
              <div className="p-3 rounded-lg bg-slate-900 font-mono text-[11px] text-slate-400 space-y-1">
                <div>&bull; Sandbox Client: AUJ892X-SANDBOX-PAYPAL-CLIENT-ID</div>
                <div>&bull; Supported Currencies: USD, EUR, GBP, CAD, AUD</div>
              </div>
            </div>

            {/* Flow Card 2: Cryptographic Webhook */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Cryptographic Webhook Reconciliation</h4>
                  <p className="text-xs text-slate-400">PAYMENT.INVOICING.INVOICE.PAID</p>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Settlement is only recorded when PayPal emits a signed webhook event. DevFlow verifies transmission ID,
                timestamp CRC32 body hash, and cert URL against PayPal's official PKI certificate.
              </p>
              <div className="p-3 rounded-lg bg-slate-900 font-mono text-[11px] text-emerald-400">
                &check; Zero unauthorized status alterations permitted
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          8. CORE FEATURES GRID
      ────────────────────────────────────────────────────────────────────────── */}
      <section id="features" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <Badge variant="neutral" size="sm">
            Platform Capabilities
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">Built for High-Trust Engineering</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Everything software agencies and freelance developers need to establish unshakeable client confidence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 hover:border-slate-700 transition-colors">
            <div className="p-2 rounded-xl bg-sky-950 text-sky-400 w-fit">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white">Evidence Transparency</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every single line of code altered is tracked and linked to a specific contract milestone requirement.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 hover:border-slate-700 transition-colors">
            <div className="p-2 rounded-xl bg-violet-950 text-violet-400 w-fit">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white">Automated AST Evaluation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Objective Abstract Syntax Tree pattern evaluation matches code architecture without hallucinations.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 hover:border-slate-700 transition-colors">
            <div className="p-2 rounded-xl bg-emerald-950 text-emerald-400 w-fit">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white">Instant PayPal Reconciliation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automatic PayPal invoice generation and real-time webhook settlement updates.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 hover:border-slate-700 transition-colors">
            <div className="p-2 rounded-xl bg-slate-800 text-slate-300 w-fit">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white">Shared Team Workspace</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Synchronized tracking for engineering teams working on shared repository branches and multi-milestone budgets.
            </p>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          9. FINAL CTA
      ────────────────────────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-14 rounded-3xl bg-gradient-to-r from-slate-900 via-[#003087]/50 to-slate-900 border border-slate-800 text-center space-y-6 relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              Make every milestone measurable. Make every payment transparent.
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Experience the future of freelance and agency milestone billing built on PayPal.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              variant="paypal"
              size="lg"
              onClick={() => navigate('/dashboard')}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="w-full sm:w-auto px-7 py-3 text-sm"
              data-testid="final-cta-open-dashboard"
            >
              Launch Developer Dashboard
            </Button>
            <a
              href="https://github.com/Tharunnagabramhagna/DevFlow"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800 text-sm font-semibold w-full sm:w-auto transition-colors"
            >
              <GitBranch className="w-4 h-4" />
              <span>View on GitHub</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────────
          10. FOOTER
      ────────────────────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800 bg-slate-950 py-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#0070BA] text-white flex items-center justify-center font-bold text-xs">
                  DF
                </div>
                <span className="font-bold text-white text-base">DevFlow</span>
              </div>
              <p className="text-slate-400">AI-Powered Milestone Verification &amp; PayPal Settlement Platform</p>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-slate-400">
              <button onClick={() => scrollToSection('how-it-works')} className="hover:text-white cursor-pointer">
                How It Works
              </button>
              <button onClick={() => scrollToSection('ai-verification')} className="hover:text-white cursor-pointer">
                AI Verification
              </button>
              <button onClick={() => scrollToSection('paypal-workflow')} className="hover:text-white cursor-pointer">
                PayPal Integration
              </button>
              <button onClick={() => navigate('/dashboard')} className="hover:text-white cursor-pointer">
                Dashboard
              </button>
              <a
                href="https://github.com/Tharunnagabramhagna/DevFlow"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white inline-flex items-center gap-1"
              >
                <span>GitHub Repo</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-600">
            <div>
              &copy; {new Date().getFullYear()} DevFlow Team &bull; Developed for the PayPal Global Hackathon.
            </div>
            <div>
              Team: Sowjanya Sappala (Frontend), Tharun Nagabramhagna (Core), Ganesh (Client Portal &amp; Testing) &amp; Teammates.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
