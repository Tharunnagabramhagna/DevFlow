import React, { useState } from 'react';
import { User, Mail, Building, ShieldCheck, KeyRound, Check, Camera, Sparkles } from 'lucide-react';
import { ProfileData } from './types';

interface ProfileTabProps {
  profile: ProfileData;
  onChangeProfile: (updated: ProfileData) => void;
  isGuest: boolean;
  isClient: boolean;
  onChangePasswordClick: () => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  profile,
  onChangeProfile,
  isGuest,
  isClient,
  onChangePasswordClick,
}) => {
  const [showAvatarUrlInput, setShowAvatarUrlInput] = useState(false);

  const initials = profile.fullName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || (isClient ? 'CL' : 'DV');

  const avatarGradient = isClient
    ? 'bg-gradient-to-tr from-[#2563EB] to-[#60A5FA]'
    : 'bg-gradient-to-tr from-violet-600 to-indigo-500';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. PRIMARY PROFILE INFORMATION CARD */}
      <div className="rounded-2xl bg-white/80 dark:bg-[#111C30]/90 border border-slate-200/80 dark:border-[#26344B] p-6 sm:p-7 shadow-xs backdrop-blur-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/70 dark:border-[#26344B]/80">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <User className="w-5 h-5 text-[#2563EB]" />
              <span>Personal & Workspace Profile</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Manage your display identity, contact email, and workspace organization details.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${
                isClient
                  ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60'
                  : 'bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isClient ? 'Client Role' : 'Developer Role'}</span>
            </span>
            {isGuest && (
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 font-semibold">
                Demo Mode
              </span>
            )}
          </div>
        </div>

        {/* Avatar Presentation Section */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 p-4 rounded-xl bg-slate-50/70 dark:bg-[#0C1524]/70 border border-slate-200/70 dark:border-[#26344B]/60">
          <div className="relative shrink-0">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.fullName}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-slate-200 dark:ring-[#26344B] shadow-sm"
              />
            ) : (
              <div
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center font-bold text-xl sm:text-2xl text-white shadow-md ${avatarGradient} ring-2 ring-white/10`}
              >
                {initials}
              </div>
            )}
            <span
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-[#2563EB] text-white flex items-center justify-center shadow-xs ring-2 ring-white dark:ring-[#0C1524]"
              title="Verified Identity"
            >
              <Check className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={isGuest}
                onClick={() => setShowAvatarUrlInput(!showAvatarUrlInput)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-[#152238] border border-slate-200 dark:border-[#26344B] hover:border-[#2563EB] text-slate-700 dark:text-slate-200 hover:text-[#2563EB] transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{profile.avatarUrl ? 'Change Avatar URL' : 'Set Custom Avatar URL'}</span>
              </button>
              {profile.avatarUrl && !isGuest && (
                <button
                  type="button"
                  onClick={() => onChangeProfile({ ...profile, avatarUrl: '' })}
                  className="text-xs text-rose-500 hover:text-rose-600 font-medium cursor-pointer"
                >
                  Remove custom avatar
                </button>
              )}
            </div>

            {showAvatarUrlInput && (
              <div className="pt-2 animate-in fade-in duration-150">
                <input
                  type="url"
                  disabled={isGuest}
                  value={profile.avatarUrl}
                  onChange={(e) => onChangeProfile({ ...profile, avatarUrl: e.target.value })}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full max-w-md px-3.5 py-2 rounded-lg text-xs bg-white dark:bg-[#080D18] border border-slate-300 dark:border-[#26344B] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            )}

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Avatar images are shown next to your verified deliverables, PR evidence commits, and PayPal invoice audit trails.
            </p>
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Full Name</span>
            </label>
            <input
              type="text"
              disabled={isGuest}
              value={profile.fullName}
              onChange={(e) => onChangeProfile({ ...profile, fullName: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/80 dark:bg-[#0C1524] border border-slate-200 dark:border-[#26344B] text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#2563EB] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              placeholder="e.g. Alex Morgan"
            />
          </div>

          {/* Email Address */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              disabled={isGuest}
              value={profile.email}
              onChange={(e) => onChangeProfile({ ...profile, email: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/80 dark:bg-[#0C1524] border border-slate-200 dark:border-[#26344B] text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#2563EB] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              placeholder="e.g. alex@northstar.studio"
            />
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-slate-400" />
              <span>Role Title</span>
            </label>
            <input
              type="text"
              disabled={isGuest}
              value={profile.role}
              onChange={(e) => onChangeProfile({ ...profile, role: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/80 dark:bg-[#0C1524] border border-slate-200 dark:border-[#26344B] text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#2563EB] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              placeholder="e.g. Lead Full-Stack Architect"
            />
          </div>

          {/* Organization / Workspace */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>Organisation or Workspace Name</span>
            </label>
            <input
              type="text"
              disabled={isGuest}
              value={profile.organization}
              onChange={(e) => onChangeProfile({ ...profile, organization: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/80 dark:bg-[#0C1524] border border-slate-200 dark:border-[#26344B] text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#2563EB] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              placeholder="e.g. Northstar Digital Studio"
            />
          </div>
        </div>
      </div>

      {/* 2. CREDENTIALS & SECURITY SHORTCUT CARD */}
      <div className="rounded-2xl bg-white/80 dark:bg-[#111C30]/90 border border-slate-200/80 dark:border-[#26344B] p-6 shadow-xs backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#2563EB]" />
            <span>Password & Security Management</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Update your account password or configure active sessions and two-factor authentication.
          </p>
        </div>
        <button
          type="button"
          onClick={onChangePasswordClick}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs sm:text-sm font-semibold transition-colors shadow-sm shadow-blue-500/20 cursor-pointer shrink-0"
        >
          <KeyRound className="w-4 h-4" />
          <span>Change Password</span>
        </button>
      </div>
    </div>
  );
};

