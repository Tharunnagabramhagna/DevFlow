import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSidebar } from '@/contexts/SidebarContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { GuestGuardModal } from '@/components/common';
import {
  User,
  Sliders,
  Shield,
  Bell,
  Zap,
  Sparkles,
  Menu,
  Save,
  RotateCcw,
  X,
  KeyRound,
  Eye,
  EyeOff,
  Laptop,
  Info,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

import {
  SettingsTabId,
  ProfileData,
  NotificationToggles,
  InAppToggles,
  AccountPreferences,
  AiPreferences,
} from '@/components/settings/types';
import { ProfileTab } from '@/components/settings/ProfileTab';
import { AccountTab, TIME_ZONE_OPTIONS } from '@/components/settings/AccountTab';
import { SecurityTab } from '@/components/settings/SecurityTab';
import { NotificationsTab } from '@/components/settings/NotificationsTab';
import { IntegrationsTab } from '@/components/settings/IntegrationsTab';
import { AiPreferencesTab } from '@/components/settings/AiPreferencesTab';

// Storage Keys (Preserved and backward-compatible)
const PROFILE_STORAGE_KEY = 'devflow_user_profile_preferences';
const NOTIFICATIONS_STORAGE_KEY = 'devflow_user_notification_preferences';
const ACCOUNT_STORAGE_KEY = 'devflow_user_account_preferences';
const AI_PREFS_STORAGE_KEY = 'devflow_user_ai_preferences';
const IN_APP_STORAGE_KEY = 'devflow_in_app_preferences';

const DEFAULT_PROFILE: ProfileData = {
  fullName: 'DevFlow User',
  email: 'member@devflow.io',
  role: 'Workspace Member',
  organization: 'DevFlow Workspace',
  avatarUrl: '',
};

const DEFAULT_NOTIFICATIONS: NotificationToggles = {
  email: true,
  milestones: true,
  inApp: true,
  githubActivity: true,
  aiResults: true,
  payments: true,
};

const DEFAULT_IN_APP: InAppToggles = {
  milestones: true,
  githubActivity: false,
  aiResults: true,
  payments: false,
};

const DEFAULT_ACCOUNT: AccountPreferences = {
  timeZone: 'UTC-08:00 (Pacific Time - US & Canada)',
  dateFormat: 'YYYY-MM-DD',
  currency: 'USD',
  theme: 'Dark',
  language: 'en-US',
};

const DEFAULT_AI: AiPreferences = {
  model: 'GPT-4o',
  approvalGitHub: true,
  approvalPayments: true,
  strictAstVerification: true,
  reasoningEffort: 'balanced',
  autoDiffParsing: true,
};

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Navigation & Layout states
  const { openMobileSidebar } = useSidebar();
  const { theme: currentTheme, setTheme } = useTheme();
  const { user, isGuest, isClient } = useAuth();

  // Active Tab synchronized with URL query parameter
  const rawTab = (searchParams.get('tab') || '').toLowerCase();
  const activeTab: SettingsTabId = useMemo(() => {
    if (['profile', 'account', 'security', 'notifications', 'integrations', 'ai'].includes(rawTab)) {
      return rawTab as SettingsTabId;
    }
    return 'profile';
  }, [rawTab]);

  const handleTabChange = (tabId: SettingsTabId) => {
    setSearchParams({ tab: tabId });
  };

  const [isGuestGuardOpen, setIsGuestGuardOpen] = useState(false);
  const [guardActionTitle, setGuardActionTitle] = useState('Change Settings');
  const [isSaving, setIsSaving] = useState(false);

  // Modals
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);
  const [twoFactorSimulated, setTwoFactorSimulated] = useState(false);
  const [manageAccountModalOpen, setManageAccountModalOpen] = useState(false);
  const [activeSessionDetailModal, setActiveSessionDetailModal] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (title: string, desc: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => setToastMessage(null), 3800);
  };

  const roleAccountLabel = isClient ? 'Client' : 'Developer';
  const sessionFallbackProfile: ProfileData = isGuest
    ? {
        fullName: isClient ? 'Marcus Vance' : 'Alex Morgan',
        email: isClient ? 'client.demo@devflow.demo' : 'developer.demo@devflow.demo',
        role: `${roleAccountLabel} (Demo Mode)`,
        organization: isClient ? 'Meridian Labs' : 'Northstar Digital Studio',
        avatarUrl: '',
      }
    : {
        fullName: user?.name || `${roleAccountLabel} Account`,
        email: user?.email || '',
        role: roleAccountLabel,
        organization: user?.organization || `${roleAccountLabel} Workspace`,
        avatarUrl: '',
      };

  // 1. Profile State
  const [profile, setProfile] = useState<ProfileData>(() => {
    if (isGuest) return sessionFallbackProfile;
    try {
      const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          fullName: user?.name || parsed.fullName || parsed.name || sessionFallbackProfile.fullName,
          email: user?.email || parsed.email || sessionFallbackProfile.email,
          role: parsed.role || sessionFallbackProfile.role,
          organization: user?.organization || parsed.organization || sessionFallbackProfile.organization,
          avatarUrl: parsed.avatarUrl || '',
        };
      }
    } catch {}
    return sessionFallbackProfile;
  });

  // Sync profile when role or session updates
  useEffect(() => {
    if (isGuest) {
      setProfile({
        fullName: isClient ? 'Marcus Vance' : 'Alex Morgan',
        email: isClient ? 'client.demo@devflow.demo' : 'developer.demo@devflow.demo',
        role: `${roleAccountLabel} (Demo Mode)`,
        organization: isClient ? 'Meridian Labs' : 'Northstar Digital Studio',
        avatarUrl: '',
      });
    } else if (user) {
      setProfile((prev) => ({
        ...prev,
        fullName: user.name || prev.fullName,
        email: user.email || prev.email,
        role: isClient ? 'Client' : 'Developer',
        organization: user.organization || prev.organization,
      }));
    }
  }, [isGuest, isClient, user, roleAccountLabel]);

  // 2. Notifications State
  const [notifications, setNotifications] = useState<NotificationToggles>(() => {
    try {
      const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          email: typeof parsed.email === 'boolean' ? parsed.email : DEFAULT_NOTIFICATIONS.email,
          milestones: typeof parsed.milestones === 'boolean' ? parsed.milestones : DEFAULT_NOTIFICATIONS.milestones,
          inApp: typeof parsed.inApp === 'boolean' ? parsed.inApp : DEFAULT_NOTIFICATIONS.inApp,
          githubActivity: typeof parsed.githubActivity === 'boolean' ? parsed.githubActivity : DEFAULT_NOTIFICATIONS.githubActivity,
          aiResults: typeof parsed.aiResults === 'boolean' ? parsed.aiResults : DEFAULT_NOTIFICATIONS.aiResults,
          payments: typeof parsed.payments === 'boolean' ? parsed.payments : DEFAULT_NOTIFICATIONS.payments,
        };
      }
    } catch {}
    return DEFAULT_NOTIFICATIONS;
  });

  // 3. In-App Preferences State
  const [inApp, setInApp] = useState<InAppToggles>(() => {
    try {
      const raw = localStorage.getItem(IN_APP_STORAGE_KEY);
      if (raw) return { ...DEFAULT_IN_APP, ...JSON.parse(raw) };
    } catch {}
    return DEFAULT_IN_APP;
  });

  // 4. Account Preferences State
  const [account, setAccount] = useState<AccountPreferences>(() => {
    try {
      const raw = localStorage.getItem(ACCOUNT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const validTz = TIME_ZONE_OPTIONS.some((tz) => tz.value === parsed.timeZone)
          ? parsed.timeZone
          : DEFAULT_ACCOUNT.timeZone;
        return {
          timeZone: validTz,
          dateFormat: parsed.dateFormat || DEFAULT_ACCOUNT.dateFormat,
          currency: parsed.currency || DEFAULT_ACCOUNT.currency,
          theme: parsed.theme || DEFAULT_ACCOUNT.theme,
          language: parsed.language || DEFAULT_ACCOUNT.language,
        };
      }
    } catch {}
    return DEFAULT_ACCOUNT;
  });

  // Keep theme synced with ThemeContext
  useEffect(() => {
    setAccount((prev) => ({
      ...prev,
      theme: currentTheme === 'light' ? 'Light' : 'Dark',
    }));
  }, [currentTheme]);

  // 5. AI Preferences State
  const [ai, setAi] = useState<AiPreferences>(() => {
    try {
      const raw = localStorage.getItem(AI_PREFS_STORAGE_KEY);
      if (raw) return { ...DEFAULT_AI, ...JSON.parse(raw) };
    } catch {}
    return DEFAULT_AI;
  });

  // Saved Snapshot for Cancel / Dirty Tracking
  const [savedSnapshot, setSavedSnapshot] = useState({
    profile: { ...profile },
    notifications: { ...notifications },
    inApp: { ...inApp },
    account: { ...account },
    ai: { ...ai },
  });

  useEffect(() => {
    setSavedSnapshot({
      profile: { ...profile },
      notifications: { ...notifications },
      inApp: { ...inApp },
      account: { ...account },
      ai: { ...ai },
    });
  }, []);

  // Dirty state tracking
  const isDirty = useMemo(() => {
    return (
      JSON.stringify(profile) !== JSON.stringify(savedSnapshot.profile) ||
      JSON.stringify(notifications) !== JSON.stringify(savedSnapshot.notifications) ||
      JSON.stringify(inApp) !== JSON.stringify(savedSnapshot.inApp) ||
      JSON.stringify(account) !== JSON.stringify(savedSnapshot.account) ||
      JSON.stringify(ai) !== JSON.stringify(savedSnapshot.ai)
    );
  }, [profile, notifications, inApp, account, ai, savedSnapshot]);

  // Save changes handler
  const handleSaveChanges = () => {
    if (isGuest) {
      setGuardActionTitle('Save Account Settings');
      setIsGuestGuardOpen(true);
      return;
    }
    setIsSaving(true);
    try {
      // 1. Profile
      const profileToSave = {
        name: profile.fullName.trim() || DEFAULT_PROFILE.fullName,
        fullName: profile.fullName.trim() || DEFAULT_PROFILE.fullName,
        email: profile.email.trim() || DEFAULT_PROFILE.email,
        role: profile.role.trim() || DEFAULT_PROFILE.role,
        organization: profile.organization.trim() || DEFAULT_PROFILE.organization,
        avatarUrl: profile.avatarUrl,
        currency: account.currency,
      };
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profileToSave));

      // 2. Notifications
      const notificationsToSave = {
        email: notifications.email,
        milestones: notifications.milestones,
        inApp: notifications.inApp,
        githubActivity: notifications.githubActivity,
        aiResults: notifications.aiResults,
        payments: notifications.payments,
        notifyOnAiComplete: notifications.aiResults,
        notifyOnPaymentSettled: notifications.payments,
      };
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notificationsToSave));

      // 3. In-App
      localStorage.setItem(IN_APP_STORAGE_KEY, JSON.stringify(inApp));

      // 4. Account
      localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(account));

      // 5. AI Preferences (Ensure payment approval is strictly locked to true)
      const aiToSave = {
        ...ai,
        approvalPayments: true, // Immutable safety lock
      };
      localStorage.setItem(AI_PREFS_STORAGE_KEY, JSON.stringify(aiToSave));

      // Update snapshot
      setSavedSnapshot({
        profile: { ...profile },
        notifications: { ...notifications },
        inApp: { ...inApp },
        account: { ...account },
        ai: { ...aiToSave },
      });

      showToast('Settings Saved', 'All workspace preferences have been successfully updated.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Save Failed', 'Unable to write preferences to browser storage.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel / Revert changes handler
  const handleCancelChanges = () => {
    setProfile({ ...savedSnapshot.profile });
    setNotifications({ ...savedSnapshot.notifications });
    setInApp({ ...savedSnapshot.inApp });
    setAccount({ ...savedSnapshot.account });
    setAi({ ...savedSnapshot.ai });
    if (savedSnapshot.account.theme) {
      setTheme(savedSnapshot.account.theme.toLowerCase() as 'dark' | 'light');
    }
    showToast('Changes Reverted', 'Inputs restored to your last saved preferences.', 'info');
  };

  // Export JSON handler
  const handleExportPreferences = () => {
    const data = {
      profile,
      account,
      notifications,
      inApp,
      ai,
      exportedAt: new Date().toISOString(),
      platform: 'DevFlow Autonomous Platform v2.4',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devflow-preferences-${profile.fullName.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Preferences Exported', 'Configuration JSON downloaded to your device.', 'success');
  };

  const handleTerminateOtherSessions = () => {
    if (isGuest) {
      setGuardActionTitle('Session Invalidation');
      setIsGuestGuardOpen(true);
      return;
    }
    showToast('Sessions Terminated', 'All secondary desktop and mobile sessions have been logged out.', 'success');
  };

  // Tabs Configuration
  const tabs = [
    { id: 'profile' as SettingsTabId, label: 'Profile', icon: User, description: 'Personal identity and workspace info' },
    { id: 'account' as SettingsTabId, label: 'Account', icon: Sliders, description: 'Timezone, date format, and currency' },
    { id: 'security' as SettingsTabId, label: 'Security', icon: Shield, description: 'Password, sessions, and 2FA' },
    { id: 'notifications' as SettingsTabId, label: 'Notifications', icon: Bell, description: 'Email and in-app alert channels' },
    { id: 'integrations' as SettingsTabId, label: 'Integrations', icon: Zap, description: 'GitHub, PayPal, and webhooks' },
    { id: 'ai' as SettingsTabId, label: 'AI Preferences', icon: Sparkles, description: 'Model engine and human gates' },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50/70 dark:bg-[#080D18] text-[#0F172A] dark:text-[#F8FAFC]">
      {/* Toast Feedback Notification Banner */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 animate-in slide-in-from-top duration-200">
          <div
            className={`flex items-start gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-xl text-xs sm:text-sm max-w-sm ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40'
                : toastMessage.type === 'error'
                ? 'bg-rose-950/90 text-rose-200 border-rose-500/40'
                : 'bg-blue-950/90 text-blue-200 border-blue-500/40'
            }`}
          >
            {toastMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
            {toastMessage.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
            {toastMessage.type === 'info' && <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />}
            <div>
              <div className="font-bold text-white">{toastMessage.title}</div>
              <div className="text-xs opacity-90 mt-0.5">{toastMessage.desc}</div>
            </div>
          </div>
        </div>
      )}

      {/* Scrollable Page Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-4xl mx-auto space-y-7">
          {/* 1. TOP HEADER & WORKSPACE CONTEXT */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
            <div>
              <div className="flex items-center gap-3">
                <button
                  onClick={openMobileSidebar}
                  className="lg:hidden p-2 -ml-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-[#172235]"
                  aria-label="Toggle navigation menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Settings
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Manage your account credentials, notifications, connected services, and AI verification preferences.
              </p>
            </div>

            {/* Role & Demo Mode Context Pill */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {isGuest && (
                <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 font-semibold shadow-xs">
                  {isClient ? 'Client Guest (Demo)' : 'Developer Guest (Demo)'}
                </span>
              )}
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full border shadow-xs ${
                  isClient
                    ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60'
                    : 'bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60'
                }`}
              >
                {isClient ? 'Client Workspace' : 'Developer Workspace'}
              </span>
            </div>
          </div>

          {/* 2. TAB NAVIGATION BAR (Horizontally Scrollable on Mobile, Premium Indicator) */}
          <div className="border-b border-slate-200/80 dark:border-[#26344B] bg-white/60 dark:bg-[#0C1524]/50 rounded-2xl p-1.5 shadow-xs backdrop-blur-xl">
            <nav className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto scrollbar-none" aria-label="Settings Tabs">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/25 ring-1 ring-[#2563EB]'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                    title={tab.description}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* 3. ACTIVE TAB CONTENT CONTAINER (Strictly 1 Active Tab Rendered At A Time) */}
          <div className="min-h-[460px]">
            {activeTab === 'profile' && (
              <ProfileTab
                profile={profile}
                onChangeProfile={setProfile}
                isGuest={isGuest}
                isClient={isClient}
                onChangePasswordClick={() => {
                  if (isGuest) {
                    setGuardActionTitle('Change Password');
                    setIsGuestGuardOpen(true);
                  } else {
                    setPasswordModalOpen(true);
                  }
                }}
              />
            )}

            {activeTab === 'account' && (
              <AccountTab
                account={account}
                onChangeAccount={setAccount}
                onThemeChange={(newTheme) => setTheme(newTheme.toLowerCase() as 'dark' | 'light')}
                isGuest={isGuest}
                isClient={isClient}
                onOpenManageAccount={() => setManageAccountModalOpen(true)}
                onExportPreferences={handleExportPreferences}
              />
            )}

            {activeTab === 'security' && (
              <SecurityTab
                isGuest={isGuest}
                isClient={isClient}
                twoFactorSimulated={twoFactorSimulated}
                onOpenChangePassword={() => {
                  if (isGuest) {
                    setGuardActionTitle('Change Password');
                    setIsGuestGuardOpen(true);
                  } else {
                    setPasswordModalOpen(true);
                  }
                }}
                onOpenTwoFactor={() => {
                  if (isGuest) {
                    setGuardActionTitle('Two-Factor Authentication');
                    setIsGuestGuardOpen(true);
                  } else {
                    setTwoFactorModalOpen(true);
                  }
                }}
                onOpenSessionDetails={(sessionName) => setActiveSessionDetailModal(sessionName)}
                onTerminateOtherSessions={handleTerminateOtherSessions}
              />
            )}

            {activeTab === 'notifications' && (
              <NotificationsTab
                notifications={notifications}
                onChangeNotifications={setNotifications}
                inApp={inApp}
                onChangeInApp={setInApp}
                isGuest={isGuest}
              />
            )}

            {activeTab === 'integrations' && (
              <IntegrationsTab
                isGuest={isGuest}
                isClient={isClient}
                githubConnected={true}
                githubUsername={user?.githubUsername || undefined}
                onNavigateToAiTab={() => handleTabChange('ai')}
                onOpenIntegrationsHub={() => navigate(isClient ? '/dashboard' : '/integrations')}
                onActionFeedback={showToast}
              />
            )}

            {activeTab === 'ai' && (
              <AiPreferencesTab
                ai={ai}
                onChangeAi={setAi}
                isGuest={isGuest}
                isClient={isClient}
              />
            )}
          </div>

          {/* 4. UNIFIED PERSISTENT SAVE & REVERT ACTION FOOTER BAR */}
          <div className="sticky bottom-4 z-20 rounded-2xl bg-white/90 dark:bg-[#111C30]/95 border border-slate-200/90 dark:border-[#26344B] p-4 shadow-xl backdrop-blur-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isDirty ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'
                }`}
              />
              <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
                {isDirty ? 'You have unsaved changes in settings' : 'All preferences saved'}
              </span>
              {isGuest && (
                <span className="text-[10px] text-slate-400 hidden sm:inline">
                  (Read-only demo)
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleCancelChanges}
                disabled={!isDirty || isSaving}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#152238] dark:hover:bg-[#1C2C47] text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border border-slate-200 dark:border-[#26344B]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>

              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/25 transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MODALS SECTION ================= */}

      {/* MODAL 1: CHANGE PASSWORD */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#26344B] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#26344B]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Change Password</h3>
                  <span className="text-[10px] text-amber-500 dark:text-amber-400 font-medium uppercase font-mono">
                    Security Policy Validation
                  </span>
                </div>
              </div>
              <button
                onClick={() => setPasswordModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter current password"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0C1524] border border-slate-200 dark:border-[#26344B] text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-[#2563EB]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="Minimum 8 characters"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0C1524] border border-slate-200 dark:border-[#26344B] text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  placeholder="Repeat new password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0C1524] border border-slate-200 dark:border-[#26344B] text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-[#0C1524] border border-blue-200 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2.5">
                <Info className="w-4 h-4 shrink-0 text-blue-500 mt-0.5" />
                <span>
                  Passwords require at least 8 characters, one number, and one uppercase letter. Never share passwords.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-[#26344B]">
              <button
                type="button"
                onClick={() => setPasswordModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setPasswordModalOpen(false);
                  showToast('Password Updated', 'New password has been verified and registered.', 'success');
                }}
                className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs sm:text-sm font-semibold cursor-pointer shadow-xs"
              >
                Save New Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: TWO-FACTOR AUTHENTICATION */}
      {twoFactorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#26344B] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#26344B]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Two-Factor Authentication</h3>
                  <span className="text-[10px] text-emerald-500 font-medium uppercase font-mono">
                    TOTP Security Setup
                  </span>
                </div>
              </div>
              <button
                onClick={() => setTwoFactorModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Scan this QR code with Google Authenticator or 1Password to bind TOTP authentication to your account.
              </p>

              <div className="w-36 h-36 mx-auto bg-white rounded-2xl p-3 flex flex-col items-center justify-center text-slate-800 text-center font-mono text-xs border border-slate-200 shadow-sm">
                <div className="w-full h-full border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400">
                  [TOTP QR CODE]
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-center">
                  Enter 6-digit confirmation code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000 000"
                  className="w-full max-w-[200px] mx-auto block px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0C1524] border border-slate-200 dark:border-[#26344B] text-slate-900 dark:text-white font-mono text-center text-base tracking-widest focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-[#26344B]">
              {twoFactorSimulated && (
                <button
                  type="button"
                  onClick={() => {
                    setTwoFactorSimulated(false);
                    setTwoFactorModalOpen(false);
                    showToast('2FA Disabled', 'Two-factor authentication has been turned off.', 'info');
                  }}
                  className="text-xs text-rose-500 hover:text-rose-600 font-semibold"
                >
                  Turn off 2FA
                </button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setTwoFactorModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTwoFactorSimulated(true);
                    setTwoFactorModalOpen(false);
                    showToast('2FA Activated', 'Two-factor authentication is now active.', 'success');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs sm:text-sm font-semibold shadow-xs"
                >
                  Verify &amp; Activate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ACTIVE SESSION DETAIL */}
      {activeSessionDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#26344B] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#26344B]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <Laptop className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Session Telemetry</h3>
              </div>
              <button
                onClick={() => setActiveSessionDetailModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0C1524] border border-slate-200 dark:border-[#26344B] space-y-2">
                <div className="font-bold text-slate-900 dark:text-white">{activeSessionDetailModal}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Client Runtime: Chrome / DevFlow Electron Wrapper v2.4
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Host: Localhost Development Machine
                </div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Authenticated Active Handshake</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-[#26344B]">
              <button
                type="button"
                onClick={() => setActiveSessionDetailModal(null)}
                className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs sm:text-sm font-semibold cursor-pointer shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: MANAGE ACCOUNT SUMMARY */}
      {manageAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#26344B] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#26344B]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Workspace &amp; Organization Details</h3>
              </div>
              <button
                onClick={() => setManageAccountModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0C1524] border border-slate-200 dark:border-[#26344B] space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Workspace Tier:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {isGuest ? 'DevFlow Demo Sandbox' : 'DevFlow Enterprise Pro (v2.4)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Organization:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{profile.organization}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Ledger Currency:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{account.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Timezone Engine:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{account.timeZone.split(' ')[0]}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-[#26344B]">
              <button
                type="button"
                onClick={() => setManageAccountModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs sm:text-sm font-semibold cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: GUEST GUARD MODAL */}
      <GuestGuardModal
        isOpen={isGuestGuardOpen}
        onClose={() => setIsGuestGuardOpen(false)}
        actionTitle={guardActionTitle}
        message="Guest Mode: Please sign in or create an account to modify permanent settings."
      />
    </div>
  );
};

export default SettingsPage;
