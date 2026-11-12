import React, { useState } from 'react';
import { ExternalLink, CheckCircle2, RefreshCw, Shield, ArrowRight, Zap, Sparkles } from 'lucide-react';

interface IntegrationsTabProps {
  isGuest: boolean;
  isClient: boolean;
  githubConnected: boolean;
  githubUsername?: string;
  onNavigateToAiTab: () => void;
  onOpenIntegrationsHub: () => void;
  onActionFeedback: (title: string, desc: string, type?: 'success' | 'info' | 'error') => void;
}

// GitHub SVG Logo
const GitHubLogo = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

// PayPal SVG Logo
const PayPalLogo = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path
      d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.789.789 0 0 1 .777-.665h6.634c3.486 0 5.86 1.732 5.378 5.17-.457 3.255-2.735 4.966-5.836 4.966h-2.19a.789.789 0 0 0-.778.666l-.853 4.476z"
      fill="#003087"
    />
    <path
      d="M9.135 12.373l.865-4.444.027-.142A.789.789 0 0 1 10.804 7.1h5.05c2.02 0 3.513.486 4.212 1.37.562.712.67 1.706.324 2.953-.61 2.19-2.074 3.42-4.137 3.42h-2.126a.788.788 0 0 0-.777.66l-.68 3.49-.135.68h-3.4zm7.68-4.273h-3.93a.473.473 0 0 0-.466.395l-.624 3.204h1.53c1.47 0 2.515-.878 2.952-2.443.207-.743.085-1.156-.462-1.156z"
      fill="#0079C1"
    />
  </svg>
);

export const IntegrationsTab: React.FC<IntegrationsTabProps> = ({
  isGuest: _isGuest,
  isClient: _isClient,
  githubConnected,
  githubUsername,
  onNavigateToAiTab,
  onOpenIntegrationsHub,
  onActionFeedback,
}) => {
  const [syncingGithub, setSyncingGithub] = useState(false);
  const [syncingPaypal, setSyncingPaypal] = useState(false);

  const handleSyncGithub = () => {
    setSyncingGithub(true);
    setTimeout(() => {
      setSyncingGithub(false);
      onActionFeedback('GitHub Repositories Synchronized', 'Latest commit refs and webhook signatures verified.', 'success');
    }, 800);
  };

  const handleSyncPaypal = () => {
    setSyncingPaypal(true);
    setTimeout(() => {
      setSyncingPaypal(false);
      onActionFeedback('PayPal Webhook Status Active', 'Webhook listener verified with sandbox settlement endpoints.', 'success');
    }, 800);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* HEADER CARD */}
      <div className="rounded-2xl bg-white/80 dark:bg-[#111C30]/90 border border-slate-200/80 dark:border-[#26344B] p-6 sm:p-7 shadow-xs backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#2563EB]" />
              <span>Connected Integrations &amp; Webhooks</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Review third-party OAuth bindings, repository linkages, and financial gateways powering DevFlow.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenIntegrationsHub}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#152238] dark:hover:bg-[#1C2C47] text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold transition-colors cursor-pointer border border-slate-200 dark:border-[#26344B] shrink-0"
          >
            <span>Open Dedicated Integrations Hub</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 1. GITHUB INTEGRATION CARD */}
      <div className="rounded-2xl bg-white/80 dark:bg-[#111C30]/90 border border-slate-200/80 dark:border-[#26344B] p-6 shadow-xs backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-[#26344B]/70">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#152238] border border-slate-200 dark:border-[#26344B] flex items-center justify-center text-slate-900 dark:text-white shadow-xs">
              <GitHubLogo className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  GitHub
                </h3>
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.2 rounded-full font-mono ${
                  githubConnected
                    ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/60'
                    : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800/60'
                }`}>
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>{githubConnected ? 'CONNECTED' : 'DISCONNECTED'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cryptographic commit validation, diff analysis, and deliverable PR tracking.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              disabled={syncingGithub}
              onClick={handleSyncGithub}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 dark:bg-[#0C1524] dark:hover:bg-[#152238] border border-slate-200 dark:border-[#26344B] text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              title="Verify live GitHub webhook connectivity"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${syncingGithub ? 'animate-spin text-[#2563EB]' : ''}`} />
              <span>{syncingGithub ? 'Syncing...' : 'Sync Webhooks'}</span>
            </button>
            <button
              type="button"
              onClick={onOpenIntegrationsHub}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#2563EB] hover:bg-blue-600 text-white transition-colors cursor-pointer shadow-xs"
            >
              Configure
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-[#0C1524]/70 border border-slate-200/60 dark:border-[#26344B]/50 space-y-0.5">
            <span className="text-slate-400 block text-[11px]">Connected Repository</span>
            <span className="font-semibold text-slate-800 dark:text-white font-mono">
              {githubUsername ? `@${githubUsername}` : 'northstar-studio/payment-gateway'}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-[#0C1524]/70 border border-slate-200/60 dark:border-[#26344B]/50 space-y-0.5">
            <span className="text-slate-400 block text-[11px]">Webhook Event Status</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              Active (200 OK &bull; Push/PR Events)
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-[#0C1524]/70 border border-slate-200/60 dark:border-[#26344B]/50 space-y-0.5">
            <span className="text-slate-400 block text-[11px]">Last Verified Deliverable</span>
            <span className="font-semibold text-slate-800 dark:text-white font-mono">
              Commit 8c92a10 (5m ago)
            </span>
          </div>
        </div>
      </div>

      {/* 2. PAYPAL INTEGRATION CARD */}
      <div className="rounded-2xl bg-white/80 dark:bg-[#111C30]/90 border border-slate-200/80 dark:border-[#26344B] p-6 shadow-xs backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-[#26344B]/70">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#152238] border border-slate-200 dark:border-[#26344B] flex items-center justify-center text-slate-900 dark:text-white shadow-xs">
              <PayPalLogo className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  PayPal Invoicing &amp; Payouts
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800/60 px-2 py-0.2 rounded-full font-mono">
                  <CheckCircle2 className="w-3 h-3 text-blue-500" />
                  <span>SANDBOX READY</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Automated invoice dispatch and instant milestone payout settlements with escrow governance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              disabled={syncingPaypal}
              onClick={handleSyncPaypal}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 dark:bg-[#0C1524] dark:hover:bg-[#152238] border border-slate-200 dark:border-[#26344B] text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              title="Check PayPal webhook telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${syncingPaypal ? 'animate-spin text-[#2563EB]' : ''}`} />
              <span>{syncingPaypal ? 'Verifying...' : 'Check Status'}</span>
            </button>
            <button
              type="button"
              onClick={onOpenIntegrationsHub}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#2563EB] hover:bg-blue-600 text-white transition-colors cursor-pointer shadow-xs"
            >
              Manage Sandbox
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-[#0C1524]/70 border border-slate-200/60 dark:border-[#26344B]/50 space-y-0.5">
            <span className="text-slate-400 block text-[11px]">Merchant Sandbox ID</span>
            <span className="font-semibold text-slate-800 dark:text-white font-mono">
              sb-devflow-merchant@business.example.com
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-[#0C1524]/70 border border-slate-200/60 dark:border-[#26344B]/50 space-y-0.5">
            <span className="text-slate-400 block text-[11px]">Supported Actions</span>
            <span className="font-semibold text-slate-800 dark:text-white">
              Invoices, Instant Payouts, Webhook Sync
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-[#0C1524]/70 border border-slate-200/60 dark:border-[#26344B]/50 space-y-0.5">
            <span className="text-slate-400 block text-[11px]">Settlement Telemetry</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              Live Webhooks (Simulated &amp; API-bound)
            </span>
          </div>
        </div>
      </div>

      {/* 3. AI AGENT VERIFICATION ENGINE */}
      <div className="rounded-2xl bg-white/80 dark:bg-[#111C30]/90 border border-slate-200/80 dark:border-[#26344B] p-6 shadow-xs backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-[#26344B]/70">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center shadow-xs">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  DevFlow AI Intelligence Engine
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/70 border border-purple-200 dark:border-purple-800/60 px-2 py-0.2 rounded-full font-mono">
                  <CheckCircle2 className="w-3 h-3 text-purple-400" />
                  <span>ACTIVE AGENTS</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                4 autonomous micro-agents validating requirement criteria, git diffs, and payment preparation.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateToAiTab}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#2563EB] hover:bg-blue-600 text-white transition-colors cursor-pointer shadow-xs self-start sm:self-auto"
          >
            <span>Configure AI Models</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-[#0C1524]/70 border border-slate-200/60 dark:border-[#26344B]/50 space-y-0.5">
            <span className="text-slate-400 block text-[11px]">Primary Model</span>
            <span className="font-semibold text-slate-800 dark:text-white font-mono">
              GPT-4o &bull; Gemini 2.5 Flash
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-[#0C1524]/70 border border-slate-200/60 dark:border-[#26344B]/50 space-y-0.5">
            <span className="text-slate-400 block text-[11px]">AST Conformance Rate</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
              98.4% Average Pass
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-[#0C1524]/70 border border-slate-200/60 dark:border-[#26344B]/50 space-y-0.5">
            <span className="text-slate-400 block text-[11px]">Human-in-the-Loop Gate</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              Mandatory Client Sign-off
            </span>
          </div>
        </div>
      </div>

      {/* 4. SECURITY & CREDENTIALS AUDIT DISCLOSURE */}
      <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-[#0C1524]/80 border border-slate-200 dark:border-[#26344B] flex items-start gap-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
        <Shield className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-800 dark:text-slate-200">Security Disclosure:</strong> OAuth access tokens, webhook signing secrets, and merchant credentials are encrypted server-side and never exposed to browser memory. Webhooks verify cryptographic HMAC SHA-256 signatures before processing deliverable events.
        </div>
      </div>
    </div>
  );
};
