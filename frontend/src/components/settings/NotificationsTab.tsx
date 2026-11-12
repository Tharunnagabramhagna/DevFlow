import React from 'react';
import { Bell, Mail, Smartphone, GitCommit, Sparkles, CreditCard, CheckCircle2 } from 'lucide-react';
import { NotificationToggles, InAppToggles } from './types';

interface NotificationsTabProps {
  notifications: NotificationToggles;
  onChangeNotifications: (updated: NotificationToggles) => void;
  inApp: InAppToggles;
  onChangeInApp: (updated: InAppToggles) => void;
  isGuest: boolean;
}

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
  label: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, disabled = false, label }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 dark:focus:ring-offset-[#111C30] disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-[#2563EB]' : 'bg-slate-200 dark:bg-[#1E2E4A]'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
};

export const NotificationsTab: React.FC<NotificationsTabProps> = ({
  notifications,
  onChangeNotifications,
  inApp,
  onChangeInApp,
  isGuest: _isGuest,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. EMAIL NOTIFICATIONS SECTION */}
      <div className="rounded-2xl bg-white/80 dark:bg-[#111C30]/90 border border-slate-200/80 dark:border-[#26344B] p-6 sm:p-7 shadow-xs backdrop-blur-xl space-y-6">
        <div className="pb-4 border-b border-slate-200/70 dark:border-[#26344B]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#2563EB]" />
              <span>Email Notification Channels</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Choose which project, deliverable, and financial milestones dispatch emails to your inbox.
            </p>
          </div>
          <div className="flex items-center gap-2.5 self-start sm:self-auto bg-slate-50 dark:bg-[#0C1524] px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-[#26344B]">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Master Email Switch
            </span>
            <ToggleSwitch
              label="Enable all email notifications"
              checked={notifications.email}
              onChange={(val) => onChangeNotifications({ ...notifications, email: val })}
            />
          </div>
        </div>

        <div className={`space-y-4 divide-y divide-slate-100 dark:divide-[#26344B]/50 ${!notifications.email ? 'opacity-60 pointer-events-none' : ''}`}>
          {/* Milestones */}
          <div className="pt-3 first:pt-0 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white block">
                  Milestones &amp; Deliverables
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Receive email alerts when deliverables are submitted, reviewed, or approved.
                </span>
              </div>
            </div>
            <ToggleSwitch
              label="Email on milestone events"
              checked={notifications.milestones}
              onChange={(val) => onChangeNotifications({ ...notifications, milestones: val })}
            />
          </div>

          {/* GitHub Activity */}
          <div className="pt-3 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0 mt-0.5">
                <GitCommit className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white block">
                  GitHub Repository Activity
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Notify on new commit evidence, pull request integrations, and webhook dispatches.
                </span>
              </div>
            </div>
            <ToggleSwitch
              label="Email on GitHub activity"
              checked={notifications.githubActivity}
              onChange={(val) => onChangeNotifications({ ...notifications, githubActivity: val })}
            />
          </div>

          {/* AI Verification Results */}
          <div className="pt-3 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white block">
                  AI Verification Results
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Alerts when AI agents finish parsing AST trees and publish verification confidence scores.
                </span>
              </div>
            </div>
            <ToggleSwitch
              label="Email on AI verification results"
              checked={notifications.aiResults}
              onChange={(val) => onChangeNotifications({ ...notifications, aiResults: val })}
            />
          </div>

          {/* Payments & Settlement */}
          <div className="pt-3 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white block">
                  Payments &amp; PayPal Invoicing
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Instant emails when PayPal invoices are generated or milestone payout funds are disbursed.
                </span>
              </div>
            </div>
            <ToggleSwitch
              label="Email on payments"
              checked={notifications.payments}
              onChange={(val) => onChangeNotifications({ ...notifications, payments: val })}
            />
          </div>
        </div>
      </div>

      {/* 2. IN-APP NOTIFICATIONS SECTION */}
      <div className="rounded-2xl bg-white/80 dark:bg-[#111C30]/90 border border-slate-200/80 dark:border-[#26344B] p-6 sm:p-7 shadow-xs backdrop-blur-xl space-y-6">
        <div className="pb-4 border-b border-slate-200/70 dark:border-[#26344B]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-500" />
              <span>In-App Real-Time Notifications</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Control toast alerts and notification badges rendered directly inside the DevFlow application.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 px-3 py-1 rounded-full self-start sm:self-auto font-mono">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Live Workspace Sync</span>
          </span>
        </div>

        <div className="space-y-4 divide-y divide-slate-100 dark:divide-[#26344B]/50">
          {/* Milestones In-App */}
          <div className="pt-3 first:pt-0 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white block">
                  Milestone Status Updates
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Toast notifications when milestone progress advances or reviews are completed.
                </span>
              </div>
            </div>
            <ToggleSwitch
              label="In-app milestone notifications"
              checked={inApp.milestones}
              onChange={(val) => onChangeInApp({ ...inApp, milestones: val })}
            />
          </div>

          {/* GitHub Activity In-App */}
          <div className="pt-3 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0 mt-0.5">
                <GitCommit className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white block">
                  GitHub Evidence Commits
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Popups when new commits are linked to deliverables via webhook sync.
                </span>
              </div>
            </div>
            <ToggleSwitch
              label="In-app GitHub notifications"
              checked={inApp.githubActivity}
              onChange={(val) => onChangeInApp({ ...inApp, githubActivity: val })}
            />
          </div>

          {/* AI Results In-App */}
          <div className="pt-3 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white block">
                  AI Agent Completion
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Show banner toast when Agreement and GitHub agents conclude verification runs.
                </span>
              </div>
            </div>
            <ToggleSwitch
              label="In-app AI results notifications"
              checked={inApp.aiResults}
              onChange={(val) => onChangeInApp({ ...inApp, aiResults: val })}
            />
          </div>

          {/* Payments In-App */}
          <div className="pt-3 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white block">
                  Payment &amp; Payout Confirmations
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Real-time notification when PayPal Webhook receives settlement authorization.
                </span>
              </div>
            </div>
            <ToggleSwitch
              label="In-app payment notifications"
              checked={inApp.payments}
              onChange={(val) => onChangeInApp({ ...inApp, payments: val })}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
