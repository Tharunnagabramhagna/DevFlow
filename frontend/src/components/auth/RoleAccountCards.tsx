import React from 'react';
import { BriefcaseBusiness, Code2, UserRound, ArrowRight } from 'lucide-react';
import { EffectiveRole } from '@/types';

export interface RoleAccountCardsProps {
  onSelectRole: (role: EffectiveRole) => void;
  onSelectGuest?: () => void;
  clientTitle?: string;
  clientBadge?: string;
  clientDescription?: string;
  clientCta?: string;
  developerTitle?: string;
  developerBadge?: string;
  developerDescription?: string;
  developerCta?: string;
  guestTitle?: string;
  guestBadge?: string;
  guestDescription?: string;
  showGuestCard?: boolean;
}

export const RoleAccountCards: React.FC<RoleAccountCardsProps> = ({
  onSelectRole,
  onSelectGuest,
  clientTitle = 'Client Account',
  clientBadge = 'CLIENT ACCOUNT',
  clientDescription = 'Hire developers, define project milestones, review evidence, approve deliverables and manage payments.',
  clientCta = 'Continue as Client',
  developerTitle = 'Developer Account',
  developerBadge = 'DEVELOPER ACCOUNT',
  developerDescription = 'Create projects, connect GitHub repositories, submit deliverable evidence and manage development milestones.',
  developerCta = 'Continue as Developer',
  guestTitle = 'Continue as Guest',
  guestBadge = 'DEMO MODE',
  guestDescription = 'Explore DevFlow features using demonstration data without creating an account.',
  showGuestCard = false,
}) => {
  return (
    <div className="space-y-4 pt-1 w-full">
      {/* 1. CLIENT ACCOUNT CARD */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelectRole('CLIENT')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectRole('CLIENT');
          }
        }}
        className="w-full text-left p-5 sm:p-6 rounded-2xl border border-[#1E293B] bg-[#0E1729]/80 hover:bg-[#111C30] hover:border-blue-500/60 shadow-lg transition-all duration-200 group flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform shrink-0">
            <BriefcaseBusiness className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-semibold tracking-wider uppercase px-3 py-1 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 font-sans shrink-0">
            {clientBadge}
          </span>
        </div>

        <div className="mt-4 mb-4">
          <h2 className="font-heading text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
            {clientTitle}
          </h2>
          <p className="font-sans text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
            {clientDescription}
          </p>
        </div>

        <div className="pt-3.5 border-t border-[#1E293B] flex items-center justify-between">
          <span className="text-xs sm:text-sm font-semibold text-blue-400 group-hover:text-blue-300 transition-colors">
            {clientCta}
          </span>
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 2. DEVELOPER ACCOUNT CARD */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelectRole('DEVELOPER')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectRole('DEVELOPER');
          }
        }}
        className="w-full text-left p-5 sm:p-6 rounded-2xl border border-[#1E293B] bg-[#0E1729]/80 hover:bg-[#111C30] hover:border-purple-500/60 shadow-lg transition-all duration-200 group flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform shrink-0">
            <Code2 className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-semibold tracking-wider uppercase px-3 py-1 rounded-full bg-purple-600/20 text-purple-400 border border-purple-500/30 font-sans shrink-0">
            {developerBadge}
          </span>
        </div>

        <div className="mt-4 mb-4">
          <h2 className="font-heading text-lg font-bold text-white group-hover:text-purple-300 transition-colors">
            {developerTitle}
          </h2>
          <p className="font-sans text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
            {developerDescription}
          </p>
        </div>

        <div className="pt-3.5 border-t border-[#1E293B] flex items-center justify-between">
          <span className="text-xs sm:text-sm font-semibold text-purple-400 group-hover:text-purple-300 transition-colors">
            {developerCta}
          </span>
          <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all shrink-0">
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 3. CONTINUE AS GUEST CARD (optional) */}
      {showGuestCard && (
        <div
          role="button"
          tabIndex={0}
          onClick={onSelectGuest}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectGuest?.();
            }
          }}
          className="w-full text-left p-5 sm:p-6 rounded-2xl border border-[#1E293B] bg-[#0E1729]/80 hover:bg-[#111C30] hover:border-teal-500/60 shadow-lg transition-all duration-200 group flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/25 flex items-center justify-center text-teal-400 group-hover:scale-105 transition-transform shrink-0">
              <UserRound className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold tracking-wider uppercase px-3 py-1 rounded-full bg-teal-600/20 text-teal-400 border border-teal-500/30 font-sans shrink-0">
              {guestBadge}
            </span>
          </div>

          <div className="mt-4 mb-4">
            <h2 className="font-heading text-lg font-bold text-white group-hover:text-teal-300 transition-colors">
              {guestTitle}
            </h2>
            <p className="font-sans text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
              {guestDescription}
            </p>
          </div>

          <div className="pt-3.5 border-t border-[#1E293B] flex items-center justify-between">
            <span className="text-xs sm:text-sm font-semibold text-teal-400 group-hover:text-teal-300 transition-colors">
              Explore Demo Mode
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-600/20 border border-teal-500/30 text-teal-400 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-all shrink-0">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleAccountCards;
