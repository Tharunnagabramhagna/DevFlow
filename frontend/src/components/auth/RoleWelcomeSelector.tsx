import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { EffectiveRole } from '@/types';
import { RoleAccountCards } from './RoleAccountCards';
import { GuestPersonaSelector } from './GuestPersonaSelector';

export interface RoleWelcomeSelectorProps {
  title: string;
  subtitle: string;
  error: string | null;
  isGuestSelectOpen: boolean;
  guestLoading: boolean;
  bottomPromptText?: string;
  bottomLinkLabel?: string;
  bottomLinkTo?: string;
  showBottomPrompt?: boolean;
  showGuestCard?: boolean;
  onSelectRole: (role: EffectiveRole) => void;
  onToggleGuestSelect: (open: boolean) => void;
  onContinueAsGuest: (persona: EffectiveRole) => void;
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
}

/**
 * Shared Step-1 selector rendering either the DevFlow entry screen
 * (Client, Developer / Project Creator) or the Guest Demo persona selector.
 */
export const RoleWelcomeSelector: React.FC<RoleWelcomeSelectorProps> = ({
  title,
  subtitle,
  error,
  isGuestSelectOpen,
  guestLoading,
  bottomPromptText,
  bottomLinkLabel,
  bottomLinkTo,
  showBottomPrompt = false,
  showGuestCard = false,
  onSelectRole,
  onToggleGuestSelect,
  onContinueAsGuest,
  clientTitle,
  clientBadge,
  clientDescription,
  clientCta,
  developerTitle,
  developerBadge,
  developerDescription,
  developerCta,
  guestTitle,
  guestBadge,
  guestDescription,
}) => {
  if (isGuestSelectOpen) {
    return (
      <GuestPersonaSelector
        onBack={() => onToggleGuestSelect(false)}
        onSelectPersona={onContinueAsGuest}
        loading={guestLoading}
        error={error}
        backLabel="Back to Account Types"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1.5 mb-6">
        <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {title}
        </h1>
        <p className="font-sans text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
          {subtitle}
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs sm:text-sm flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Role Selection Cards */}
      <RoleAccountCards
        onSelectRole={onSelectRole}
        onSelectGuest={() => onToggleGuestSelect(true)}
        showGuestCard={showGuestCard}
        clientTitle={clientTitle}
        clientBadge={clientBadge}
        clientDescription={clientDescription}
        clientCta={clientCta}
        developerTitle={developerTitle}
        developerBadge={developerBadge}
        developerDescription={developerDescription}
        developerCta={developerCta}
        guestTitle={guestTitle}
        guestBadge={guestBadge}
        guestDescription={guestDescription}
      />

      {showBottomPrompt && bottomPromptText && bottomLinkLabel && bottomLinkTo && (
        <div className="text-center pt-3 border-t border-[#26344B]/60 text-xs text-slate-400">
          <span>{bottomPromptText} </span>
          <Link
            to={bottomLinkTo}
            className="text-[#60A5FA] hover:text-blue-300 font-semibold underline underline-offset-4"
          >
            {bottomLinkLabel}
          </Link>
        </div>
      )}
    </div>
  );
};

export default RoleWelcomeSelector;
