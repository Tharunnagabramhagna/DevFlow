import React from 'react';
import { Sliders, Globe, Calendar, DollarSign, Palette, Shield, Download, ChevronRight, CheckCircle2 } from 'lucide-react';
import { AccountPreferences } from './types';

export const TIME_ZONE_OPTIONS = [
  { value: 'UTC-08:00 (Pacific Time - US & Canada)', label: 'UTC-08:00 (Pacific Time - US & Canada)' },
  { value: 'UTC-05:00 (Eastern Time - US & Canada)', label: 'UTC-05:00 (Eastern Time - US & Canada)' },
  { value: 'UTC+00:00 (Greenwich Mean Time - London)', label: 'UTC+00:00 (Greenwich Mean Time - London)' },
  { value: 'UTC+01:00 (Central European Time - Berlin)', label: 'UTC+01:00 (Central European Time - Berlin)' },
  { value: 'UTC+05:30 (India Standard Time - New Delhi)', label: 'UTC+05:30 (India Standard Time - New Delhi)' },
  { value: 'UTC+08:00 (Singapore, Hong Kong)', label: 'UTC+08:00 (Singapore, Hong Kong)' },
  { value: 'UTC+09:00 (Tokyo Standard Time)', label: 'UTC+09:00 (Tokyo Standard Time)' },
];

export const DATE_FORMAT_OPTIONS = [
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (e.g. 2026-11-07)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (e.g. 11/07/2026)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (e.g. 07/11/2026)' },
  { value: 'MMM DD, YYYY', label: 'MMM DD, YYYY (e.g. Nov 07, 2026)' },
];

export const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($) - US Dollar' },
  { value: 'EUR', label: 'EUR (€) - Euro' },
  { value: 'GBP', label: 'GBP (£) - British Pound' },
];

export const THEME_OPTIONS = [
  { value: 'Dark', label: '🌙 Dark (Fintech High-Contrast Navy)' },
  { value: 'Light', label: '☀️ Light (High-Contrast Clean)' },
];

export const LANGUAGE_OPTIONS = [
  { value: 'en-US', label: 'English (United States)' },
  { value: 'en-GB', label: 'English (United Kingdom)' },
  { value: 'es-ES', label: 'Español (Spanish)' },
  { value: 'de-DE', label: 'Deutsch (German)' },
  { value: 'ja-JP', label: '日本語 (Japanese)' },
];

interface AccountTabProps {
  account: AccountPreferences;
  onChangeAccount: (updated: AccountPreferences) => void;
  onThemeChange: (theme: 'Dark' | 'Light') => void;
  isGuest: boolean;
  isClient: boolean;
  onOpenManageAccount: () => void;
  onExportPreferences: () => void;
}

export const AccountTab: React.FC<AccountTabProps> = ({
  account,
  onChangeAccount,
  onThemeChange,
  isGuest,
  isClient,
  onOpenManageAccount,
  onExportPreferences,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. REGIONAL & WORKSPACE PREFERENCES CARD */}
      <div className="rounded-2xl bg-white/80 dark:bg-[#111C30]/90 border border-slate-200/80 dark:border-[#26344B] p-6 sm:p-7 shadow-xs backdrop-blur-xl space-y-6">
        <div className="pb-4 border-b border-slate-200/70 dark:border-[#26344B]/80">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#2563EB]" />
            <span>Workspace & Localization Preferences</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Configure timezone calculation, calendar formats, invoice currencies, and appearance themes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Time Zone */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span>Time Zone</span>
            </label>
            <select
              value={account.timeZone}
              onChange={(e) => onChangeAccount({ ...account, timeZone: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/80 dark:bg-[#0C1524] border border-slate-200 dark:border-[#26344B] text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#2563EB] transition-colors"
            >
              {TIME_ZONE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400">
              Timestamps for commit verification and PayPal webhook settlement will use this timezone.
            </p>
          </div>

          {/* Date Format */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Date Format</span>
            </label>
            <select
              value={account.dateFormat}
              onChange={(e) => onChangeAccount({ ...account, dateFormat: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/80 dark:bg-[#0C1524] border border-slate-200 dark:border-[#26344B] text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#2563EB] transition-colors"
            >
              {DATE_FORMAT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400">
              Affects milestones deadlines, telemetry graphs, and audit history tables.
            </p>
          </div>

          {/* Currency Preference */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
              <span>Currency Preference</span>
            </label>
            <select
              value={account.currency}
              onChange={(e) => onChangeAccount({ ...account, currency: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/80 dark:bg-[#0C1524] border border-slate-200 dark:border-[#26344B] text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#2563EB] transition-colors"
            >
              {CURRENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400">
              Default billing and milestone invoice currency across PayPal Sandboxes.
            </p>
          </div>

          {/* Theme Preference */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-slate-400" />
              <span>Theme Preference</span>
            </label>
            <select
              value={account.theme}
              onChange={(e) => {
                const newTheme = e.target.value as 'Dark' | 'Light';
                onChangeAccount({ ...account, theme: newTheme });
                onThemeChange(newTheme);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/80 dark:bg-[#0C1524] border border-slate-200 dark:border-[#26344B] text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#2563EB] transition-colors"
            >
              {THEME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400">
              Instantly toggles between high-contrast Dark Fintech and Clean Light styling.
            </p>
          </div>

          {/* Language Preference */}
          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span>Application Language</span>
            </label>
            <select
              value={account.language || 'en-US'}
              onChange={(e) => onChangeAccount({ ...account, language: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/80 dark:bg-[#0C1524] border border-slate-200 dark:border-[#26344B] text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#2563EB] transition-colors"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. ACCOUNT MANAGEMENT & STATUS INFORMATION CARD */}
      <div className="rounded-2xl bg-white/80 dark:bg-[#111C30]/90 border border-slate-200/80 dark:border-[#26344B] p-6 sm:p-7 shadow-xs backdrop-blur-xl space-y-6">
        <div className="pb-4 border-b border-slate-200/70 dark:border-[#26344B]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-500" />
              <span>Account Status &amp; Workspace Tier</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Verify your operational workspace quota, authentication state, and organization binding.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-3 py-1 rounded-full self-start sm:self-auto font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Active &amp; Good Standing</span>
          </span>
        </div>

        {/* Telemetry info row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-[#0C1524]/70 border border-slate-200/70 dark:border-[#26344B]/60 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Workspace Tier
            </span>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {isGuest ? 'Demo Sandbox Tier' : 'Enterprise Sandbox (v2.4)'}
            </div>
            <div className="text-[11px] text-slate-400">
              Unlimited verified milestones
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-[#0C1524]/70 border border-slate-200/70 dark:border-[#26344B]/60 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Workspace Type
            </span>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {isClient ? 'Client Operations' : 'Developer Task Stream'}
            </div>
            <div className="text-[11px] text-slate-400">
              {isClient ? 'Approvals & Escrow' : 'AST Code Proofs'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-[#0C1524]/70 border border-slate-200/70 dark:border-[#26344B]/60 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Billing Ledger
            </span>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {account.currency} (PayPal Integrated)
            </div>
            <div className="text-[11px] text-slate-400">
              Instant payout settlements
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={onExportPreferences}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#152238] dark:hover:bg-[#1C2C47] text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold transition-colors cursor-pointer border border-slate-200 dark:border-[#26344B]"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Configuration JSON</span>
          </button>

          <button
            type="button"
            onClick={onOpenManageAccount}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <span>Manage Workspace Details</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

