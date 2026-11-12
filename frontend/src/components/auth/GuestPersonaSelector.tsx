import React from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Code2,
} from 'lucide-react';
import { EffectiveRole } from '@/types';

export interface GuestPersonaSelectorProps {
  onBack: () => void;
  onSelectPersona: (persona: EffectiveRole) => void;
  loading?: boolean;
  error?: string | null;
  backLabel?: string;
  title?: string;
  subtitle?: string;
}

export const GuestPersonaSelector: React.FC<GuestPersonaSelectorProps> = ({
  onBack,
  onSelectPersona,
  loading = false,
  error = null,
  backLabel = 'Back to Account Types',
  title = 'Explore DevFlow as a Guest',
  subtitle = 'Select your perspective to preview DevFlow features with interactive demonstration data.',
}) => {
  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/70 dark:border-white/10">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{backLabel}</span>
        </button>
        <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 font-semibold">
          Demo Mode
        </span>
      </div>

      <div className="text-center space-y-2">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          {title}
        </h1>
        <p className="font-sans text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
          {subtitle}
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs sm:text-sm flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 pt-1">
        {/* OPTION A: CLIENT GUEST */}
        <button
          type="button"
          disabled={loading}
          onClick={() => onSelectPersona('CLIENT')}
          className="w-full text-left p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl hover:bg-white/90 dark:hover:bg-white/[0.07] hover:border-[#2563EB]/70 hover:shadow-md hover:shadow-blue-500/10 transition-all duration-200 group flex flex-col justify-between h-full focus:outline-none focus:ring-2 focus:ring-[#2563EB] cursor-pointer disabled:opacity-50"
        >
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-xl bg-[#2563EB]/15 text-[#2563EB] dark:text-[#38BDF8] border border-[#2563EB]/30 group-hover:scale-105 transition-transform shrink-0">
                <BriefcaseBusiness className="w-6 h-6" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 font-mono">
                Client Perspective
              </span>
            </div>

            <div>
              <h2 className="font-heading text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-[#2563EB] dark:group-hover:text-[#60A5FA] transition-colors">
                Explore as Client
              </h2>
              <p className="font-sans text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                Explore project management, milestone tracking, developer deliverables, verification and payment management from a client's perspective.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs font-semibold text-[#2563EB] dark:text-[#38BDF8]">
            <span>{loading ? 'Starting Demo Session...' : 'Enter Client Dashboard'}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* OPTION B: DEVELOPER GUEST */}
        <button
          type="button"
          disabled={loading}
          onClick={() => onSelectPersona('DEVELOPER')}
          className="w-full text-left p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl hover:bg-white/90 dark:hover:bg-white/[0.07] hover:border-purple-500/70 hover:shadow-md hover:shadow-purple-500/10 transition-all duration-200 group flex flex-col justify-between h-full focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer disabled:opacity-50"
        >
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 group-hover:scale-105 transition-transform shrink-0">
                <Code2 className="w-6 h-6" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 font-mono">
                Developer Perspective
              </span>
            </div>

            <div>
              <h2 className="font-heading text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                Explore as Developer
              </h2>
              <p className="font-sans text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                Explore project development, assigned milestones, evidence submission, AI verification and developer payments.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs font-semibold text-purple-600 dark:text-purple-400">
            <span>{loading ? 'Starting Demo Session...' : 'Enter Developer Dashboard'}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>
    </div>
  );
};

export default GuestPersonaSelector;

