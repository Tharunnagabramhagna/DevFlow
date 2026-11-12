import React from 'react';
import { Link } from 'react-router-dom';
import { DevFlowLogo, ThemeToggle, AmbientBackground } from '@/components/common';

export interface AuthPageShellProps {
  /** 'wide' for signup selector, 'medium' for compact 2-card Welcome panel, 'narrow' for credential forms */
  width?: 'wide' | 'medium' | 'narrow';
  children: React.ReactNode;
}

const widthClassMap: Record<NonNullable<AuthPageShellProps['width']>, string> = {
  wide: 'max-w-[52rem]',
  medium: 'max-w-[710px]',
  narrow: 'max-w-[30rem]',
};

/**
 * Shared dark-navy glass shell for all DevFlow authentication pages,
 * unifying header navigation, ambient background, centered card surface, and footer.
 */
export const AuthPageShell: React.FC<AuthPageShellProps> = ({
  width = 'narrow',
  children,
}) => {
  return (
    <div className="min-h-[100svh] bg-slate-50/70 dark:bg-[#050A15] text-[#0F172A] dark:text-[#F8FAFC] flex flex-col justify-between selection:bg-[#0070BA] selection:text-white relative overflow-x-hidden antialiased py-2.5 sm:py-3.5 px-4 sm:px-6">
      <AmbientBackground />

      <header className="max-w-5xl mx-auto w-full flex items-center justify-between pb-2 sm:pb-2.5 relative z-10">
        <Link to="/" className="cursor-pointer group select-none flex items-center gap-2">
          <DevFlowLogo variant="horizontal" theme="auto" size="sm" />
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

      <main
        className={`w-full relative z-10 my-auto transition-all duration-300 mx-auto ${widthClassMap[width]}`}
      >
        <div className="bg-white/85 dark:bg-[#0B1222]/90 border border-slate-200/90 dark:border-white/[0.11] rounded-2xl px-5 py-4 sm:px-7 sm:py-4 shadow-glass-elevated dark:shadow-dark-glass-elevated backdrop-blur-2xl ring-1 ring-white/20 dark:ring-white/[0.05]">
          {children}
        </div>
      </main>

      <footer className="text-center text-[11px] text-slate-500 pt-2 sm:pt-2.5 relative z-10">
        <span>DevFlow Autonomous Milestone Platform &bull; PayPal Hackathon &bull; 2026</span>
      </footer>
    </div>
  );
};

export default AuthPageShell;

