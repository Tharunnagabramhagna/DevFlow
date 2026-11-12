import React from 'react';
import { BriefcaseBusiness, Code2, UserRound } from 'lucide-react';
import { EffectiveRole } from '@/types';

export interface RoleAccountCardsProps {
  onSelectRole: (role: EffectiveRole) => void;
  onSelectGuest?: () => void;
  clientTitle?: string;
  clientBadge?: string;
  clientDescription?: string;
  developerTitle?: string;
  developerBadge?: string;
  developerDescription?: string;
  guestTitle?: string;
  guestBadge?: string;
  guestDescription?: string;
  showGuestCard?: boolean;
}

export const RoleAccountCards: React.FC<RoleAccountCardsProps> = ({
  onSelectRole,
  onSelectGuest,
  clientTitle = 'Client',
  clientBadge = 'HIRING / MANAGEMENT',
  clientDescription = 'Hire developers, define project milestones, review cryptographic verification proofs and release payments via PayPal.',
  developerTitle = 'Developer / Project Creator',
  developerBadge = 'BUILDING / CODE',
  developerDescription = 'Build projects, link GitHub repositories, submit deliverable evidence for automated AI verification and receive payments.',
  guestTitle = 'Continue as Guest',
  guestBadge = 'DEMO MODE',
  guestDescription = 'Explore DevFlow features using demonstration data without creating an account.',
  showGuestCard,
}) => {
  const showGuest = showGuestCard ?? Boolean(onSelectGuest);

  return (
    <div className="space-y-3.5 pt-0.5 w-full">
      {/* 1. CLIENT ACCOUNT CARD */}
      <button
        type="button"
        onClick={() => onSelectRole('CLIENT')}
        className="w-full text-left p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl hover:bg-white/90 dark:hover:bg-white/[0.07] hover:border-[#2563EB]/70 hover:shadow-md hover:shadow-blue-500/10 transition-all duration-200 group flex items-start gap-4 sm:gap-5 focus:outline-none focus:ring-2 focus:ring-[#2563EB] cursor-pointer"
      >
        <div className="p-3 rounded-xl bg-[#2563EB]/15 text-[#2563EB] dark:text-[#60A5FA] border border-[#2563EB]/30 group-hover:scale-105 transition-transform shrink-0 mt-0.5">
          <BriefcaseBusiness className="w-6 h-6" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="font-heading text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-[#2563EB] dark:group-hover:text-[#60A5FA] transition-colors">
              {clientTitle}
            </h2>
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 font-mono shrink-0">
              {clientBadge}
            </span>
          </div>
          <p className="font-sans text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
            {clientDescription}
          </p>
        </div>
      </button>

      {/* 2. DEVELOPER ACCOUNT CARD */}
      <button
        type="button"
        onClick={() => onSelectRole('DEVELOPER')}
        className="w-full text-left p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl hover:bg-white/90 dark:hover:bg-white/[0.07] hover:border-purple-500/70 hover:shadow-md hover:shadow-purple-500/10 transition-all duration-200 group flex items-start gap-4 sm:gap-5 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
      >
        <div className="p-3 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 group-hover:scale-105 transition-transform shrink-0 mt-0.5">
          <Code2 className="w-6 h-6" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="font-heading text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
              {developerTitle}
            </h2>
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 font-mono shrink-0">
              {developerBadge}
            </span>
          </div>
          <p className="font-sans text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
            {developerDescription}
          </p>
        </div>
      </button>

      {/* 3. CONTINUE AS GUEST CARD */}
      {showGuest && (
        <button
          type="button"
          onClick={onSelectGuest}
          className="w-full text-left p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl hover:bg-white/90 dark:hover:bg-white/[0.07] hover:border-teal-500/70 hover:shadow-md hover:shadow-teal-500/10 transition-all duration-200 group flex items-start gap-4 sm:gap-5 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
        >
          <div className="p-3 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 group-hover:scale-105 transition-transform shrink-0 mt-0.5">
            <UserRound className="w-6 h-6" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="font-heading text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors">
                {guestTitle}
              </h2>
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 font-mono shrink-0">
                {guestBadge}
              </span>
            </div>
            <p className="font-sans text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
              {guestDescription}
            </p>
          </div>
        </button>
      )}
    </div>
  );
};

export default RoleAccountCards;

