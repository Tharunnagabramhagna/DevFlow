import React from 'react';
import { Link } from 'react-router-dom';
import { DevFlowLogo, ThemeToggle, AmbientBackground } from '@/components/common';

export interface AuthPageShellProps {
  /** 'wide' for signup selector, 'medium' for 2-card Welcome panel, 'narrow' for credential forms */
  width?: 'wide' | 'medium' | 'narrow';
  children: React.ReactNode;
}

const widthClassMap: Record<NonNullable<AuthPageShellProps['width']>, string> = {
  wide: 'max-w-[48rem]',
  medium: 'max-w-[38rem]',
  narrow: 'max-w-[28rem]',
};

/**
 * Shared dark-navy shell for all DevFlow authentication pages,
 * unifying header navigation, ambient background, centered card surface.
 */
export const AuthPageShell: React.FC<AuthPageShellProps> = ({
  width = 'narrow',
  children,
}) => {
  return (
    <div className="min-h-screen bg-[#070C16] text-[#F8FAFC] flex flex-col justify-between selection:bg-[#0070BA] selection:text-white relative overflow-x-hidden antialiased py-3 sm:py-5 px-4 sm:px-6">
      <AmbientBackground />

      <header className="max-w-5xl mx-auto w-full flex items-center justify-between pb-3 relative z-10">
        <Link to="/" className="cursor-pointer group select-none flex items-center gap-2">
          <DevFlowLogo variant="horizontal" theme="light" size="sm" />
        </Link>
        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <Link
            to="/"
            className="text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </header>

      <main
        className={`w-full relative z-10 my-auto transition-all duration-300 mx-auto ${widthClassMap[width]}`}
      >
        <div className="bg-[#0B1220]/95 border border-[#1E293B] rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
          {children}
        </div>
      </main>

      <div className="h-6 relative z-10" />
    </div>
  );
};

export default AuthPageShell;
