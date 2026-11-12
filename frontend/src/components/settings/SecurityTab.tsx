import React from 'react';
import { Shield, KeyRound, Laptop, Smartphone, Lock, ExternalLink, ChevronRight, CheckCircle2 } from 'lucide-react';

interface SecurityTabProps {
  isGuest: boolean;
  isClient: boolean;
  twoFactorSimulated: boolean;
  onOpenChangePassword: () => void;
  onOpenTwoFactor: () => void;
  onOpenSessionDetails: (sessionName: string) => void;
  onTerminateOtherSessions: () => void;
}

export const SecurityTab: React.FC<SecurityTabProps> = ({
  isGuest,
  isClient: _isClient,
  twoFactorSimulated,
  onOpenChangePassword,
  onOpenTwoFactor,
  onOpenSessionDetails,
  onTerminateOtherSessions,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. PASSWORD & AUTHENTICATION CREDENTIALS */}
      <div className="rounded-2xl bg-white/80 dark:bg-[#111C30]/90 border border-slate-200/80 dark:border-[#26344B] p-6 sm:p-7 shadow-xs backdrop-blur-xl space-y-6">
        <div className="pb-4 border-b border-slate-200/70 dark:border-[#26344B]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-[#2563EB]" />
              <span>Password &amp; Authentication Management</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Secure your account credentials and manage primary authentication methods.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 px-3 py-1 rounded-full self-start sm:self-auto font-mono">
            <Lock className="w-3.5 h-3.5" />
            <span>Encrypted Credentials</span>
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4.5 rounded-xl bg-slate-50/70 dark:bg-[#0C1524]/70 border border-slate-200/70 dark:border-[#26344B]/60 gap-4">
          <div className="space-y-1">
            <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Account Password</span>
              <span className="text-xs font-mono font-medium text-slate-400">••••••••••••</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isGuest
                ? 'Demo mode uses guest telemetry without storing live master passwords.'
                : 'Last updated 14 days ago. Minimum 8 characters with alphanumeric requirements.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenChangePassword}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs cursor-pointer shrink-0"
          >
            <KeyRound className="w-4 h-4" />
            <span>Change Password</span>
          </button>
        </div>
      </div>

      {/* 2. TWO-FACTOR AUTHENTICATION (2FA) */}
      <div className="rounded-2xl bg-white/80 dark:bg-[#111C30]/90 border border-slate-200/80 dark:border-[#26344B] p-6 sm:p-7 shadow-xs backdrop-blur-xl space-y-5">
        <div className="pb-4 border-b border-slate-200/70 dark:border-[#26344B]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-500" />
              <span>Two-Factor Authentication (2FA)</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Protect your account from unauthorized milestone payouts and repository access.
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border self-start sm:self-auto ${
              twoFactorSimulated
                ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                : 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{twoFactorSimulated ? '2FA Simulated Active' : '2FA Recommended'}</span>
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4.5 rounded-xl bg-slate-50/70 dark:bg-[#0C1524]/70 border border-slate-200/70 dark:border-[#26344B]/60 gap-4">
          <div className="space-y-1">
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              Authenticator App (TOTP Verification)
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Use Google Authenticator, 1Password, or Authy to generate 6-digit confirmation codes when logging in or withdrawing funds.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenTwoFactor}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white dark:bg-[#152238] border border-slate-200 dark:border-[#26344B] hover:border-[#2563EB] text-slate-800 dark:text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer shrink-0"
          >
            <span>{twoFactorSimulated ? 'Manage 2FA' : 'Configure 2FA'}</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* 3. ACTIVE BROWSER SESSIONS */}
      <div className="rounded-2xl bg-white/80 dark:bg-[#111C30]/90 border border-slate-200/80 dark:border-[#26344B] p-6 sm:p-7 shadow-xs backdrop-blur-xl space-y-5">
        <div className="pb-4 border-b border-slate-200/70 dark:border-[#26344B]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Laptop className="w-5 h-5 text-[#2563EB]" />
              <span>Active Browser Sessions</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Devices and client runtimes currently signed into your DevFlow workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={onTerminateOtherSessions}
            className="text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors cursor-pointer self-start sm:self-auto"
          >
            Sign out of all other sessions
          </button>
        </div>

        <div className="space-y-3">
          {/* Device 1: Current Session */}
          <div
            onClick={() => onOpenSessionDetails('Current Desktop Browser Session')}
            className="flex items-center justify-between p-4 rounded-xl bg-slate-50/70 dark:bg-[#0C1524]/70 border border-slate-200/70 dark:border-[#26344B]/60 hover:border-[#2563EB] cursor-pointer transition-colors group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <Laptop className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Current Browser Session</span>
                  <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.2 rounded-full">
                    Active Now
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Web Client (Chrome / Edge) &bull; IP: 127.0.0.1 (Localhost Sandbox)
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#2563EB] transition-colors" />
          </div>

          {/* Device 2: Mobile Client */}
          <div
            onClick={() => onOpenSessionDetails('Secondary Mobile Client (Demo Sync)')}
            className="flex items-center justify-between p-4 rounded-xl bg-slate-50/70 dark:bg-[#0C1524]/70 border border-slate-200/70 dark:border-[#26344B]/60 hover:border-[#2563EB] cursor-pointer transition-colors group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/20">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Mobile Device Sync</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    2 hours ago
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  iOS / Android Companion &bull; Push Notification Channel Verified
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#2563EB] transition-colors" />
          </div>
        </div>
      </div>

      {/* 4. SECURITY POLICIES & AUDIT INFORMATION */}
      <div className="rounded-2xl bg-white/80 dark:bg-[#111C30]/90 border border-slate-200/80 dark:border-[#26344B] p-6 shadow-xs backdrop-blur-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#2563EB]" />
          <span>DevFlow Cryptographic Security &amp; Escrow Standards</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-300">
          <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-[#0C1524]/70 border border-slate-200/60 dark:border-[#26344B]/40 space-y-1">
            <span className="font-semibold text-slate-900 dark:text-white block">
              Cryptographic Commit Proofs
            </span>
            <span>
              All deliverables require signed Git commits validated against requirement AST acceptance trees before payout release.
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-[#0C1524]/70 border border-slate-200/60 dark:border-[#26344B]/40 space-y-1">
            <span className="font-semibold text-slate-900 dark:text-white block">
              Zero-Trust Payment Gate
            </span>
            <span>
              Autonomous verification agents cannot authorize PayPal escrow payouts without explicit human client cryptographic sign-off.
            </span>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-[#2563EB] dark:text-[#60A5FA]">
          <a
            href="#/integrations"
            className="inline-flex items-center gap-1.5 hover:underline font-medium"
          >
            <span>Review API credentials policy</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href="#/verification"
            className="inline-flex items-center gap-1.5 hover:underline font-medium"
          >
            <span>AST verification proof standards</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
