import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { DevFlowLogo, ThemeToggle, AmbientBackground } from '@/components/common';
import { RoleAccountCards } from '@/components/auth/RoleAccountCards';
import { EffectiveRole } from '@/types';

export const GetStartedPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSelectRole = (role: EffectiveRole) => {
    navigate(role === 'CLIENT' ? '/login/client' : '/login/developer');
  };

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-[#060B16] text-[#0F172A] dark:text-[#F8FAFC] flex flex-col justify-between selection:bg-[#0070BA] selection:text-white relative overflow-x-hidden antialiased py-8 px-4 sm:px-6">
      <AmbientBackground />

      {/* Top Bar */}
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

      {/* Centered Vertical Account Card Group */}
      <main className="flex-1 w-full max-w-2xl mx-auto relative z-10 flex items-center justify-center py-4">
        <div className="w-full bg-white/80 dark:bg-[#0A1122]/85 border border-slate-200/80 dark:border-white/[0.12] rounded-2xl p-6 sm:p-9 shadow-glass-elevated dark:shadow-dark-glass-elevated backdrop-blur-2xl ring-1 ring-white/20 dark:ring-white/[0.06] space-y-6 sm:space-y-7">
          <div className="text-center space-y-2">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Get Started with DevFlow
            </h1>
            <p className="font-sans text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Choose your workspace role to continue to login or explore in Demo Mode.
            </p>
          </div>

          <RoleAccountCards onSelectRole={handleSelectRole} />

          <div className="text-center pt-2 border-t border-slate-200 dark:border-[#26344B]/60 text-xs text-slate-600 dark:text-slate-400">
            <span>New to DevFlow? </span>
            <Link
              to="/signup"
              className="text-[#2563EB] hover:text-blue-600 dark:hover:text-blue-400 font-semibold underline underline-offset-4"
            >
              Create an account
            </Link>
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

export default GetStartedPage;

