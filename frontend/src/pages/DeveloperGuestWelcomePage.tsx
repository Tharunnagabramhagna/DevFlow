import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { DevFlowLogo, ThemeToggle, AmbientBackground } from '@/components/common';
import {
  Code2,
  ArrowLeft,
  ArrowRight,
  LogIn,
  UserPlus,
  Eye,
  GitBranch,
  Cpu,
  Layers,
  Terminal,
} from 'lucide-react';

export const DeveloperGuestWelcomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-[#060B16] text-[#0F172A] dark:text-[#F8FAFC] flex flex-col justify-between selection:bg-[#0070BA] selection:text-white relative overflow-x-hidden antialiased py-8 px-4 sm:px-6">
      <AmbientBackground />

      {/* Top Bar */}
      <header className="max-w-3xl mx-auto w-full flex items-center justify-between pb-6 relative z-10">
        <Link to="/" className="cursor-pointer group select-none flex items-center gap-2">
          <DevFlowLogo variant="horizontal" theme="auto" size="md" />
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => navigate('/signup')}
            className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All Options
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-3xl mx-auto relative z-10 my-auto">
        <div className="bg-white/80 dark:bg-[#0F172A]/85 border border-white/80 dark:border-white/15 rounded-2xl p-6 sm:p-9 shadow-glass-elevated dark:shadow-dark-glass-elevated backdrop-blur-2xl">
          <div className="space-y-7">
            {/* Header */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-950/80 border border-purple-200 dark:border-purple-800/60">
                <Code2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-[11px] font-semibold uppercase text-purple-700 dark:text-purple-300 font-mono">
                  Developer Experience
                </span>
              </div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Developer Guest Mode
              </h1>
              <p className="font-sans text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
                Explore DevFlow from a developer's perspective. Discover project opportunities, see how GitHub integration works, and explore milestone verification.
              </p>
            </div>

            {/* What you can explore */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: Layers, label: 'Project Opportunities', desc: 'Browse available projects and budgets' },
                { icon: GitBranch, label: 'GitHub Integration', desc: 'See how repos link to milestones' },
                { icon: Cpu, label: 'AI Verification', desc: 'Explore automated evidence analysis' },
                { icon: Terminal, label: 'Developer Workflow', desc: 'Preview the development lifecycle' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5"
                >
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{item.label}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Demo notice */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-700/30">
              <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                Guest mode uses demonstration data. No account required. Actions like submissions and payouts are disabled.
              </p>
            </div>

            {/* Three CTAs */}
            <div className="space-y-3">
              {/* Primary: Continue as Guest */}
              <button
                onClick={() => navigate('/guest/developer/dashboard')}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-sky-500 hover:from-purple-700 hover:to-sky-600 text-white font-semibold text-sm transition-all shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2.5 group"
              >
                <Eye className="w-4.5 h-4.5" />
                <span>Continue as Developer Guest</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Secondary: Login or Sign Up */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => navigate('/login/developer')}
                  className="py-2.5 px-4 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-white/[0.04] backdrop-blur-md hover:bg-white/90 dark:hover:bg-white/[0.08] text-slate-900 dark:text-white font-semibold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <LogIn className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>Developer Login</span>
                </button>
                <button
                  onClick={() => navigate('/signup/developer')}
                  className="py-2.5 px-4 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-white/[0.04] backdrop-blur-md hover:bg-white/90 dark:hover:bg-white/[0.08] text-slate-900 dark:text-white font-semibold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  <span>Developer Sign Up</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-500 pt-6 relative z-10">
        <span>DevFlow Autonomous Milestone Platform &bull; PayPal Hackathon &bull; 2026</span>
      </footer>
    </div>
  );
};

export default DeveloperGuestWelcomePage;

