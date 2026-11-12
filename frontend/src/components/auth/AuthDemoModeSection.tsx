import React from 'react';
import { ArrowRight, Eye, Loader2 } from 'lucide-react';
import { EffectiveRole } from '@/types';

export interface AuthDemoModeSectionProps {
  role: EffectiveRole;
  loading: boolean;
  disabled?: boolean;
  onContinueAsGuest: (persona: EffectiveRole) => void;
}

/**
 * Shared Demo Mode fallback block rendered below Login / Registration submit CTA:
 * divider, full-width Continue as Guest (<Role>) button, and read-only caption.
 */
export const AuthDemoModeSection: React.FC<AuthDemoModeSectionProps> = ({
  role,
  loading,
  disabled = false,
  onContinueAsGuest,
}) => {
  const roleLabel = role === 'CLIENT' ? 'Client' : 'Developer';

  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-200 dark:bg-[#23314A]" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none">
          OR EXPLORE IN DEMO MODE
        </span>
        <div className="flex-1 h-px bg-slate-200 dark:bg-[#23314A]" />
      </div>

      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => onContinueAsGuest(role)}
        className="w-full py-2.5 px-4 rounded-lg border border-slate-200 dark:border-[#24324B] bg-slate-100/80 dark:bg-[#10182B]/90 hover:bg-slate-200/70 dark:hover:bg-[#16213A] hover:border-teal-500/60 dark:hover:border-teal-500/50 disabled:opacity-50 text-slate-800 dark:text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-teal-500 dark:text-teal-400" />
            <span>Starting Demo Session...</span>
          </>
        ) : (
          <>
            <Eye className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>Continue as Guest ({roleLabel})</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
          </>
        )}
      </button>

      <p className="text-center text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
        Read-only demo experience — no account created and actions are disabled.
      </p>
    </div>
  );
};

export default AuthDemoModeSection;

