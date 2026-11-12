import React, { useState } from 'react';
import { devFlowApi } from '@/services/api';
import {
  ShieldCheck,
  GitBranch,
  Lock,
  ArrowRight,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';

interface GitHubConnectModalProps {
  open: boolean;
  oauthConfigured?: boolean;
  onSkip: () => void;
  returnPath?: string;
}

export const GitHubConnectModal: React.FC<GitHubConnectModalProps> = ({
  open,
  oauthConfigured = true,
  onSkip,
  returnPath = '/dashboard',
}) => {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const { authorizeUrl } = await devFlowApi.initiateGitHubConnect(returnPath);
      window.location.href = authorizeUrl;
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to start GitHub OAuth flow. Check backend GitHub credentials.'
      );
      setConnecting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="github-onboarding-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-[#26344B] bg-[#0B1220] text-[#F8FAFC] shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-[#1E293B]">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#111C30] border border-[#2A3954] flex items-center justify-center text-white shrink-0">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
            </div>
            <div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30 mb-1">
                Developer Onboarding
              </span>
              <h2 id="github-onboarding-title" className="text-lg font-bold tracking-tight text-white">
                Connect your GitHub account
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onSkip}
            aria-label="Skip GitHub connection for now"
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            Link your GitHub account to import your real public and private repositories, synchronize commits and pull requests, and attach verifiable code evidence to your project milestones.
          </p>

          <div className="rounded-xl border border-[#1E293B] bg-[#0F172A]/80 p-4 space-y-3">
            <div className="flex items-start gap-2.5 text-xs text-slate-300">
              <GitBranch className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">Repository &amp; Commit Access</span>
                <p className="text-slate-400 mt-0.5">
                  Browse repositories you own or collaborate on and sync real commit SHAs, branches, PRs, and open issues.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-slate-300">
              <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">Encrypted Token Storage</span>
                <p className="text-slate-400 mt-0.5">
                  OAuth tokens are encrypted with AES-256-GCM on the server and are never exposed to browsers or other users.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">Requested Scopes</span>
                <p className="text-slate-400 mt-0.5">
                  <code className="text-[11px] text-slate-200 bg-[#1E293B] px-1.5 py-0.5 rounded">read:user</code>{' '}
                  <code className="text-[11px] text-slate-200 bg-[#1E293B] px-1.5 py-0.5 rounded">user:email</code>{' '}
                  <code className="text-[11px] text-slate-200 bg-[#1E293B] px-1.5 py-0.5 rounded">repo</code>
                </p>
              </div>
            </div>
          </div>

          {!oauthConfigured && !error && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-2.5 text-xs text-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-100">GitHub OAuth credentials not configured</p>
                <p className="text-amber-200/80 mt-0.5">
                  Add <code className="font-mono">GITHUB_CLIENT_ID</code> and{' '}
                  <code className="font-mono">GITHUB_CLIENT_SECRET</code> to your root{' '}
                  <code className="font-mono">.env</code> file to enable OAuth authorization, or skip for now.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 flex items-start gap-2.5 text-xs text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-[#0E1729] border-t border-[#1E293B]">
          <button
            type="button"
            onClick={onSkip}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-[#26344B] transition-colors"
          >
            Skip for now — Continue to dashboard
          </button>
          <button
            type="button"
            onClick={handleConnect}
            disabled={connecting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-semibold transition-colors shadow-lg shadow-blue-600/20"
          >
            {connecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Redirecting to GitHub...
              </>
            ) : (
              <>
                Connect GitHub
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

