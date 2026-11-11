import React from 'react';
import { BriefcaseBusiness, Code2, ArrowRight } from 'lucide-react';
import { EffectiveRole } from '@/types';

export interface RoleAccountCardsProps {
  onSelectRole: (role: EffectiveRole) => void;
  clientCta?: string;
  developerCta?: string;
}

export const RoleAccountCards: React.FC<RoleAccountCardsProps> = ({
  onSelectRole,
  clientCta = 'Continue as Client',
  developerCta = 'Continue as Developer',
}) => {
  return (
    <div className="flex flex-col gap-4 sm:gap-5 w-full max-w-xl mx-auto">
      {/* 1. CLIENT ACCOUNT CARD (Blue Accents) */}
      <button
        type="button"
        onClick={() => onSelectRole('CLIENT')}
        className="w-full min-h-[192px] text-left p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-[#1E2E4A] bg-white/75 dark:bg-[#0D1526]/90 backdrop-blur-xl hover:bg-white dark:hover:bg-[#111C33] hover:border-[#2563EB]/80 hover:shadow-lg hover:shadow-blue-600/15 transition-all duration-200 group flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-[#2563EB] cursor-pointer"
      >
        <div className="space-y-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="p-3 rounded-xl bg-blue-500/15 text-[#2563EB] dark:text-[#60A5FA] border border-blue-500/30 group-hover:scale-105 transition-transform shrink-0">
              <BriefcaseBusiness className="w-6 h-6" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 font-mono">
              CLIENT ACCOUNT
            </span>
          </div>

          <div>
            <h2 className="font-heading text-lg font-bold text-slate-900 dark:text-white group-hover:text-[#2563EB] dark:group-hover:text-[#60A5FA] transition-colors">
              Client Account
            </h2>
            <p className="font-sans text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
              Hire developers, define project milestones, review evidence, approve deliverables and manage payments.
            </p>
          </div>
        </div>

        <div className="mt-5 pt-3.5 border-t border-slate-200/70 dark:border-white/10 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#2563EB] dark:text-[#60A5FA]">
            {clientCta}
          </span>
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 text-[#2563EB] dark:text-[#60A5FA] group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </button>

      {/* 2. DEVELOPER ACCOUNT CARD (Violet Accents) */}
      <button
        type="button"
        onClick={() => onSelectRole('DEVELOPER')}
        className="w-full min-h-[192px] text-left p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-[#1E2E4A] bg-white/75 dark:bg-[#0D1526]/90 backdrop-blur-xl hover:bg-white dark:hover:bg-[#111C33] hover:border-violet-500/80 hover:shadow-lg hover:shadow-violet-600/15 transition-all duration-200 group flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
      >
        <div className="space-y-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="p-3 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30 group-hover:scale-105 transition-transform shrink-0">
              <Code2 className="w-6 h-6" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-violet-50 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-500/30 font-mono">
              DEVELOPER ACCOUNT
            </span>
          </div>

          <div>
            <h2 className="font-heading text-lg font-bold text-slate-900 dark:text-white group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors">
              Developer Account
            </h2>
            <p className="font-sans text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
              Create projects, connect GitHub repositories, submit deliverable evidence and manage development milestones.
            </p>
          </div>
        </div>

        <div className="mt-5 pt-3.5 border-t border-slate-200/70 dark:border-white/10 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-violet-600 dark:text-violet-400">
            {developerCta}
          </span>
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 group-hover:bg-violet-600 group-hover:text-white transition-colors">
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </button>
    </div>
  );
};

export default RoleAccountCards;

