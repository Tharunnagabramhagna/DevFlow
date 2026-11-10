import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from '@/contexts/SidebarContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { GuestGuardModal } from '@/components/common';
import {
              Bell,
  Settings,
  X,
  Menu,
  ChevronRight,
  ExternalLink,
  Shield,
  Smartphone,
  Laptop,
  Check,
  KeyRound,
  Eye,
  EyeOff,
  User,
  Info,
} from 'lucide-react';

// Storage Keys (Preserved and backward-compatible)
const PROFILE_STORAGE_KEY = 'devflow_user_profile_preferences';
const NOTIFICATIONS_STORAGE_KEY = 'devflow_user_notification_preferences';
const ACCOUNT_STORAGE_KEY = 'devflow_user_account_preferences';
const AI_PREFS_STORAGE_KEY = 'devflow_user_ai_preferences';
const IN_APP_STORAGE_KEY = 'devflow_in_app_preferences';

interface ProfileData {
  fullName: string;
  email: string;
  role: string;
  organization: string;
  avatarUrl: string;
}

interface NotificationToggles {
  email: boolean;
  milestones: boolean;
  inApp: boolean;
  githubActivity: boolean;
  aiResults: boolean;
  payments: boolean;
}

interface InAppToggles {
  milestones: boolean;
  githubActivity: boolean;
  aiResults: boolean;
  payments: boolean;
}

interface AccountPreferences {
  timeZone: string;
  dateFormat: string;
  currency: string;
  theme: string;
}

interface AiPreferences {
  model: string;
  approvalGitHub: boolean;
  approvalPayments: boolean;
  strictAstVerification: boolean;
}

const DEFAULT_PROFILE: ProfileData = {
  fullName: 'Alex Morgan',
  email: 'alex.morgan@northstar.studio',
  role: 'Project Administrator',
  organization: 'Northstar Digital Studio',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=faces',
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
};

const DEFAULT_AI: AiPreferences = {
  model: 'GPT-4o',
  approvalGitHub: true,
  approvalPayments: true,
  strictAstVerification: true,
};

// Valid Time Zone Definitions (Corrected and standardized)
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
  { value: 'Dark', label: '🌙 Dark (Fintech High-Contrast)' },
  { value: 'Light', label: '☀️ Light (High-Contrast)' },
];

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();

  // Navigation & Layout states
  const { openMobileSidebar } = useSidebar();
  const { theme: currentTheme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'Profile' | 'Account' | 'Security' | 'Notifications' | 'Integrations' | 'AI Preferences'>('Profile');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  useEffect(() => {
    setAccount((prev) => ({
      ...prev,
      theme: currentTheme === 'light' ? 'Light' : 'Dark',
    }));
  }, [currentTheme]);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { isGuest } = useAuth();
  const [isGuestGuardOpen, setIsGuestGuardOpen] = useState(false);
  const [guardActionTitle, setGuardActionTitle] = useState('Change Settings');

  // Modals
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);
  const [twoFactorSimulated, setTwoFactorSimulated] = useState(false);
  const [manageAccountModalOpen, setManageAccountModalOpen] = useState(false);
  const [activeSessionDetailModal, setActiveSessionDetailModal] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Toast feedback
  const [, setToastMessage] = useState<{ title: string; desc: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (title: string, desc: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Profile State (Loaded safely from localStorage with backward-compatibility)
  const [profile, setProfile] = useState<ProfileData>(() => {
    try {
      const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          fullName: parsed.fullName || parsed.name || DEFAULT_PROFILE.fullName,
          email: parsed.email || DEFAULT_PROFILE.email,
          role: parsed.role || DEFAULT_PROFILE.role,
          organization: parsed.organization || DEFAULT_PROFILE.organization,
          avatarUrl: DEFAULT_PROFILE.avatarUrl,
        };
      }
    } catch {
      // safe fallback
    }
    return DEFAULT_PROFILE;
  });

  // 2. Notifications State (Loaded safely with backward-compatibility)
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
          aiResults: typeof parsed.aiResults === 'boolean' ? parsed.aiResults : (typeof parsed.notifyOnAiComplete === 'boolean' ? parsed.notifyOnAiComplete : DEFAULT_NOTIFICATIONS.aiResults),
          payments: typeof parsed.payments === 'boolean' ? parsed.payments : (typeof parsed.notifyOnPaymentSettled === 'boolean' ? parsed.notifyOnPaymentSettled : DEFAULT_NOTIFICATIONS.payments),
        };
      }
    } catch {
      // safe fallback
    }
    return DEFAULT_NOTIFICATIONS;
  });

  // 3. In-App Preferences State
  const [inApp, setInApp] = useState<InAppToggles>(() => {
    try {
      const raw = localStorage.getItem(IN_APP_STORAGE_KEY);
      if (raw) return { ...DEFAULT_IN_APP, ...JSON.parse(raw) };
    } catch {
      // safe fallback
    }
    return DEFAULT_IN_APP;
  });

  // 4. Account Preferences State (Fixes any legacy malformed timezone like USD-2.8 PaM)
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
        };
      }
    } catch {
      // safe fallback
    }
    return DEFAULT_ACCOUNT;
  });

  // 5. AI Preferences State
  const [ai, setAi] = useState<AiPreferences>(() => {
    try {
      const raw = localStorage.getItem(AI_PREFS_STORAGE_KEY);
      if (raw) return { ...DEFAULT_AI, ...JSON.parse(raw) };
    } catch {
      // safe fallback
    }
    return DEFAULT_AI;
  });

  // Backup of saved state for "Cancel" operation
  const [savedSnapshot, setSavedSnapshot] = useState({
    profile: { ...profile },
    notifications: { ...notifications },
    inApp: { ...inApp },
    account: { ...account },
    ai: { ...ai },
  });

  // Update backup snapshot when initial load completes
  useEffect(() => {
    setSavedSnapshot({
      profile: { ...profile },
      notifications: { ...notifications },
      inApp: { ...inApp },
      account: { ...account },
      ai: { ...ai },
    });
  }, []);

  // Save changes handler (Preserves backward compatibility, persists only non-sensitive preferences)
  const handleSaveChanges = () => {
    if (isGuest) {
      setGuardActionTitle('Save Account Settings');
      setIsGuestGuardOpen(true);
      return;
    }
    try {
      // 1. Save profile with both fullName and legacy name keys
      const profileToSave = {
        name: profile.fullName.trim() || DEFAULT_PROFILE.fullName,
        fullName: profile.fullName.trim() || DEFAULT_PROFILE.fullName,
        email: profile.email.trim() || DEFAULT_PROFILE.email,
        role: profile.role.trim() || DEFAULT_PROFILE.role,
        organization: profile.organization.trim() || DEFAULT_PROFILE.organization,
        currency: account.currency,
      };
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profileToSave));

      // 2. Save notifications with both new toggles and legacy boolean flags
      const notificationsToSave = {
        email: notifications.email,
        milestones: notifications.milestones,
        inApp: notifications.inApp,
        githubActivity: notifications.githubActivity,
        aiResults: notifications.aiResults,
        payments: notifications.payments,
        notifyOnAiComplete: notifications.aiResults,
        notifyOnPaymentSettled: notifications.payments,
        notifyWeeklyDigest: false,
      };
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notificationsToSave));

      // 3. Save in-app toggles
      localStorage.setItem(IN_APP_STORAGE_KEY, JSON.stringify(inApp));

      // 4. Save account preferences (validated timezone, date format, currency, theme)
      localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(account));

      // 5. Save AI preferences (model choice, human approvals)
      localStorage.setItem(AI_PREFS_STORAGE_KEY, JSON.stringify(ai));

      // Update snapshot
      setSavedSnapshot({
        profile: { ...profile },
        notifications: { ...notifications },
        inApp: { ...inApp },
        account: { ...account },
        ai: { ...ai },
      });

      showToast('Settings Saved', 'Profile, notification, account, and AI preferences successfully persisted.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Save Failed', 'Unable to write preferences to browser storage.', 'error');
    }
  };

  // Cancel / Revert changes handler (Restores last saved state accurately)
  const handleCancelChanges = () => {
    setProfile({ ...savedSnapshot.profile });
    setNotifications({ ...savedSnapshot.notifications });
    setInApp({ ...savedSnapshot.inApp });
    setAccount({ ...savedSnapshot.account });
    setAi({ ...savedSnapshot.ai });
    showToast('Changes Reverted', 'All inputs restored to your last saved preferences.', 'info');
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#080D18]">
        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-7">
          <div className="max-w-[1780px] mx-auto space-y-7">
            {/* PAGE HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={openMobileSidebar}
                    className="lg:hidden p-2 -ml-1 text-[#AAB6C8] hover:text-white rounded-xl hover:bg-[#172235]"
                    aria-label="Toggle navigation menu"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                  <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#F1F5F9]">Settings</h1>
                </div>
                <p className="text-sm sm:text-base text-[#AAB6C8] mt-1.5">
                  Manage your account, security and application preferences.
                </p>
              </div>

              {/* Right Side Header Controls */}
              <div className="flex items-center gap-3 self-end sm:self-auto relative">
                {/* Notification Bell */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setNotificationsOpen(!notificationsOpen);
                      setUserMenuOpen(false);
                    }}
                    className="relative p-2.5 rounded-xl text-[#AAB6C8] hover:text-white bg-[#172235] hover:bg-[#20304B] border border-[#293B55] transition-colors"
                    title="Quick Alerts"
                  >
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#2879E8] animate-pulse" />
                  </button>

                  {/* Dropdown */}
                  {notificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-[#172235] border border-[#293B55] shadow-2xl p-4 z-50 text-xs sm:text-sm animate-in fade-in duration-150">
                      <div className="flex items-center justify-between pb-2.5 border-b border-[#293B55]">
                        <span className="font-semibold text-white">Alerts</span>
                        <button
                          onClick={() => {
                            setNotificationsOpen(false);
                            navigate('/notifications');
                          }}
                          className="text-xs text-[#2879E8] font-bold hover:underline"
                        >
                          View All
                        </button>
                      </div>
                      <div className="py-2.5 space-y-2 text-[#AAB6C8]">
                        <div className="p-2.5 rounded-xl bg-[#101A2D] text-xs">
                          <span className="text-white font-medium">Sprint 8 AST Analysis</span> completed
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#101A2D] text-xs">
                          <span className="text-white font-medium">Invoice INV-2026-004</span> settled via PayPal
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Settings Icon */}
                <button
                  onClick={() => showToast('Settings Synchronized', 'Current workspace preferences verified against schema.', 'info')}
                  className="p-2.5 rounded-xl text-[#AAB6C8] hover:text-white bg-[#172235] hover:bg-[#20304B] border border-[#293B55] transition-colors"
                  title="Refresh Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>

                {/* User Avatar */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setUserMenuOpen(!userMenuOpen);
                      setNotificationsOpen(false);
                    }}
                    className="w-10 h-10 rounded-xl ring-2 ring-[#293B55] hover:ring-[#2879E8] transition-all overflow-hidden flex items-center justify-center bg-[#172235]"
                    title="User Profile"
                  >
                    <img
                      src={profile.avatarUrl}
                      alt={profile.fullName}
                      className="w-full h-full object-cover"
                    />
                  </button>

                  {/* User Profile Popover */}
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#172235] border border-[#293B55] shadow-2xl p-3 z-50 text-xs sm:text-sm animate-in fade-in duration-150">
                      <div className="px-3.5 py-2.5 border-b border-[#293B55]/70 mb-1.5">
                        <div className="font-semibold text-white">{profile.fullName}</div>
                        <div className="text-xs text-[#AAB6C8] truncate">{profile.email}</div>
                      </div>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          setActiveTab('Profile');
                        }}
                        className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-[#20304B] text-[#AAB6C8] hover:text-white transition-colors flex items-center gap-2"
                      >
                        <User className="w-4 h-4" />
                        Edit Profile
                      </button>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          navigate('/');
                        }}
                        className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-rose-500/10 text-rose-400 transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SETTINGS NAVIGATION TABS */}
            <div className="flex items-center border-b border-[#293B55] text-xs sm:text-sm font-semibold space-x-7 overflow-x-auto pb-px">
              {(['Profile', 'Account', 'Security', 'Notifications', 'Integrations', 'AI Preferences'] as const).map(
                (tab) => {
                  const isActive = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`pb-3.5 transition-colors relative whitespace-nowrap ${
                        isActive
                          ? 'text-[#2879E8] font-bold border-b-2 border-[#2879E8]'
                          : 'text-[#AAB6C8] hover:text-[#F1F5F9]'
                      }`}
                    >
                      {tab}
                    </button>
                  );
                }
              )}
            </div>

            {/* TAB CONTEXT NOTICE (When navigating between tabs) */}
            {activeTab !== 'Profile' && (
              <div className="p-4 rounded-xl bg-[#101A2D] border border-[#293B55] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs sm:text-sm animate-in fade-in">
                <div className="flex items-center gap-2.5 text-[#AAB6C8]">
                  <Info className="w-4 h-4 text-[#2879E8] shrink-0" />
                  <span>
                    Viewing section: <strong className="text-white">{activeTab}</strong>. You can configure properties here or switch back to <button onClick={() => setActiveTab('Profile')} className="text-[#2879E8] hover:underline font-semibold">Profile</button> to see the full 3-column overview.
                  </span>
                </div>
                {activeTab === 'Integrations' && (
                  <button
                    onClick={() => navigate('/integrations')}
                    className="px-3.5 py-1.5 rounded-lg bg-[#2879E8] hover:bg-blue-600 text-white font-semibold text-xs shrink-0 transition-colors"
                  >
                    Open Integrations Hub &rarr;
                  </button>
                )}
              </div>
            )}

            {/* 3-COLUMN SETTINGS DASHBOARD (Matches Reference Screenshot Layout) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
              {/* ================= COLUMN 1: PROFILE AND NOTIFICATIONS ================= */}
              <div className={`space-y-6 ${activeTab !== 'Profile' && activeTab !== 'Notifications' ? 'opacity-85' : ''}`}>
                {/* A. PROFILE CARD */}
                <div
                  className={`rounded-2xl bg-[#172235] border p-6 space-y-4.5 transition-all ${
                    activeTab === 'Profile'
                      ? 'border-[#2879E8]/80 shadow-lg shadow-blue-500/10 ring-1 ring-[#2879E8]/30'
                      : 'border-[#293B55]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-[#AAB6C8] uppercase tracking-wider">
                      PROFILE
                    </div>
                    {activeTab === 'Profile' && (
                      <span className="text-xs font-semibold text-[#2879E8] bg-[#2879E8]/10 px-2.5 py-0.5 rounded-full">
                        Active Tab
                      </span>
                    )}
                  </div>

                  {/* Avatar + Full Name in horizontal row */}
                  <div className="flex items-center gap-3.5">
                    <div className="relative shrink-0">
                      <img
                        src={profile.avatarUrl}
                        alt={profile.fullName}
                        className="w-14 h-14 rounded-full object-cover ring-2 ring-[#293B55]"
                      />
                      <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#2879E8] flex items-center justify-center text-white ring-2 ring-[#172235]">
                        <Check className="w-3 h-3" />
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs font-semibold text-[#AAB6C8] mb-1">Full name</label>
                      <input
                        type="text"
                        value={profile.fullName}
                        onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#101A2D] border border-[#293B55] text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-[#2879E8]"
                        placeholder="Full Name"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-[#AAB6C8] mb-1">Email</label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#101A2D] border border-[#293B55] text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-[#2879E8]"
                      placeholder="Email Address"
                    />
                  </div>

                  {/* Role */}
                  <div>
                    <label className="block text-xs font-semibold text-[#AAB6C8] mb-1">Role</label>
                    <input
                      type="text"
                      value={profile.role}
                      onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#101A2D] border border-[#293B55] text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-[#2879E8]"
                      placeholder="Role"
                    />
                  </div>

                  {/* Organisation */}
                  <div>
                    <label className="block text-xs font-semibold text-[#AAB6C8] mb-1">Organisation</label>
                    <input
                      type="text"
                      value={profile.organization}
                      onChange={(e) => setProfile({ ...profile, organization: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#101A2D] border border-[#293B55] text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-[#2879E8]"
                      placeholder="Organisation"
                    />
                  </div>

                  {/* Change Password Button */}
                  <div className="pt-1">
                    <button
                      onClick={() => {
                      if (isGuest) {
                        setGuardActionTitle('Change Password');
                        setIsGuestGuardOpen(true);
                        return;
                      }
                      setPasswordModalOpen(true);
                    }}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#101A2D] hover:bg-[#1E2E48] border border-[#293B55] hover:border-[#3B4F6E] text-xs sm:text-sm text-white font-semibold transition-colors"
                    >
                      Change Password
                    </button>
                  </div>
                </div>

                {/* B. NOTIFICATIONS CARD */}
                <div
                  className={`rounded-2xl bg-[#172235] border p-6 space-y-4 transition-all ${
                    activeTab === 'Notifications'
                      ? 'border-[#2879E8]/80 shadow-lg shadow-blue-500/10 ring-1 ring-[#2879E8]/30'
                      : 'border-[#293B55]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-[#AAB6C8] uppercase tracking-wider">
                      NOTIFICATIONS
                    </div>
                    {activeTab === 'Notifications' && (
                      <span className="text-xs font-semibold text-[#2879E8] bg-[#2879E8]/10 px-2.5 py-0.5 rounded-full">
                        Active Tab
                      </span>
                    )}
                  </div>

                  <div className="space-y-3.5 pt-1 text-xs sm:text-sm">
                    {/* Email */}
                    <div className="flex items-center justify-between">
                      <span className="text-[#F1F5F9] font-medium">Email</span>
                      <button
                        onClick={() => setNotifications({ ...notifications, email: !notifications.email })}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          notifications.email ? 'bg-[#2879E8]' : 'bg-[#101A2D] border border-[#293B55]'
                        }`}
                        role="switch"
                        aria-checked={notifications.email}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            notifications.email ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Milestones */}
                    <div className="flex items-center justify-between">
                      <span className="text-[#F1F5F9] font-medium">Milestones</span>
                      <button
                        onClick={() => setNotifications({ ...notifications, milestones: !notifications.milestones })}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          notifications.milestones ? 'bg-[#2879E8]' : 'bg-[#101A2D] border border-[#293B55]'
                        }`}
                        role="switch"
                        aria-checked={notifications.milestones}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            notifications.milestones ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* In-app */}
                    <div className="flex items-center justify-between">
                      <span className="text-[#F1F5F9] font-medium">In-app</span>
                      <button
                        onClick={() => setNotifications({ ...notifications, inApp: !notifications.inApp })}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          notifications.inApp ? 'bg-[#2879E8]' : 'bg-[#101A2D] border border-[#293B55]'
                        }`}
                        role="switch"
                        aria-checked={notifications.inApp}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            notifications.inApp ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* GitHub Activity */}
                    <div className="flex items-center justify-between">
                      <span className="text-[#F1F5F9] font-medium">GitHub Activity</span>
                      <button
                        onClick={() => setNotifications({ ...notifications, githubActivity: !notifications.githubActivity })}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          notifications.githubActivity ? 'bg-[#2879E8]' : 'bg-[#101A2D] border border-[#293B55]'
                        }`}
                        role="switch"
                        aria-checked={notifications.githubActivity}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            notifications.githubActivity ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* AI Results */}
                    <div className="flex items-center justify-between">
                      <span className="text-[#F1F5F9] font-medium">AI Results</span>
                      <button
                        onClick={() => setNotifications({ ...notifications, aiResults: !notifications.aiResults })}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          notifications.aiResults ? 'bg-[#2879E8]' : 'bg-[#101A2D] border border-[#293B55]'
                        }`}
                        role="switch"
                        aria-checked={notifications.aiResults}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            notifications.aiResults ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Payments */}
                    <div className="flex items-center justify-between">
                      <span className="text-[#F1F5F9] font-medium">Payments</span>
                      <button
                        onClick={() => setNotifications({ ...notifications, payments: !notifications.payments })}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          notifications.payments ? 'bg-[#2879E8]' : 'bg-[#101A2D] border border-[#293B55]'
                        }`}
                        role="switch"
                        aria-checked={notifications.payments}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            notifications.payments ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ================= COLUMN 2: SECURITY AND IN-APP PREFERENCES ================= */}
              <div className={`space-y-6 ${activeTab !== 'Profile' && activeTab !== 'Security' ? 'opacity-85' : ''}`}>
                {/* A. SECURITY CARD */}
                <div
                  className={`rounded-2xl bg-[#172235] border p-6 space-y-4.5 transition-all ${
                    activeTab === 'Security'
                      ? 'border-[#2879E8]/80 shadow-lg shadow-blue-500/10 ring-1 ring-[#2879E8]/30'
                      : 'border-[#293B55]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-[#AAB6C8] uppercase tracking-wider">
                      SECURITY
                    </div>
                    {activeTab === 'Security' && (
                      <span className="text-xs font-semibold text-[#2879E8] bg-[#2879E8]/10 px-2.5 py-0.5 rounded-full">
                        Active Tab
                      </span>
                    )}
                  </div>

                  {/* Password Management */}
                  <button
                    onClick={() => {
                      if (isGuest) {
                        setGuardActionTitle('Change Password');
                        setIsGuestGuardOpen(true);
                        return;
                      }
                      setPasswordModalOpen(true);
                    }}
                    className="w-full flex items-center justify-between py-2 text-xs sm:text-sm text-white hover:text-[#2879E8] transition-colors group"
                  >
                    <span className="font-semibold">Password management</span>
                    <ChevronRight className="w-4 h-4 text-[#AAB6C8] group-hover:text-[#2879E8] transition-colors" />
                  </button>

                  {/* Active Sessions */}
                  <div className="space-y-2.5 pt-2 border-t border-[#293B55]/70">
                    <div className="flex items-center justify-between text-xs text-[#AAB6C8]">
                      <span className="font-semibold">Active sessions</span>
                      <span className="text-xs text-slate-500 font-mono">Demo Telemetry</span>
                    </div>

                    {/* Device 1 */}
                    <div
                      onClick={() => setActiveSessionDetailModal('Device 1: Current Desktop Browser')}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#101A2D] border border-[#293B55] hover:border-[#3B4F6E] text-xs sm:text-sm cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Laptop className="w-5 h-5 text-[#35C987]" />
                        <div>
                          <div className="font-semibold text-white">Device 1 (Current Session)</div>
                          <div className="text-xs text-[#AAB6C8]">Location: Desktop &bull; Active Now</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#AAB6C8]" />
                    </div>

                    {/* Device 2 */}
                    <div
                      onClick={() => setActiveSessionDetailModal('Device 2: Mobile Client (Demo Sync)')}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#101A2D] border border-[#293B55] hover:border-[#3B4F6E] text-xs sm:text-sm cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-5 h-5 text-[#AAB6C8]" />
                        <div>
                          <div className="font-semibold text-white">Device 2 setup</div>
                          <div className="text-xs text-[#AAB6C8]">Location: Mobile Phone &bull; Demo Sync</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#AAB6C8]" />
                    </div>
                  </div>

                  {/* Two-factor authentication setting (Clear DEMO Labeling) */}
                  <div className="pt-2.5 border-t border-[#293B55]/70 flex items-center justify-between">
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
                        <span>Two-factor authentication</span>
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">DEMO</span>
                      </div>
                      <div className="text-xs text-[#AAB6C8]">
                        {twoFactorSimulated ? 'Simulated (Demo Mode)' : 'Disabled'}
                      </div>
                    </div>
                    <button
                      onClick={() => setTwoFactorModalOpen(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#101A2D] hover:bg-[#1E2E48] border border-[#293B55] text-xs sm:text-sm text-white font-semibold transition-colors"
                    >
                      {twoFactorSimulated ? 'Manage' : 'Enable'}
                    </button>
                  </div>

                  {/* Security Information Links */}
                  <div className="pt-2.5 border-t border-[#293B55]/70 space-y-2 text-xs sm:text-sm">
                    <a
                      href="#/integrations"
                      className="flex items-center justify-between text-[#2879E8] hover:text-[#60A5FA] transition-colors py-0.5"
                    >
                      <span>Security credentials policy</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <a
                      href="#/integrations"
                      className="flex items-center justify-between text-[#2879E8] hover:text-[#60A5FA] transition-colors py-0.5"
                    >
                      <span>Handling & permissions audit</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* B. IN-APP PREFERENCES CARD */}
                <div className="rounded-2xl bg-[#172235] border border-[#293B55] p-6 space-y-4">
                  <div className="text-xs font-bold text-[#AAB6C8] uppercase tracking-wider">
                    IN-APP PREFERENCES
                  </div>

                  <div className="space-y-3.5 pt-1 text-xs sm:text-sm">
                    {/* Milestones */}
                    <div className="flex items-center justify-between">
                      <span className="text-[#F1F5F9] font-medium">Milestones</span>
                      <button
                        onClick={() => setInApp({ ...inApp, milestones: !inApp.milestones })}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          inApp.milestones ? 'bg-[#2879E8]' : 'bg-[#101A2D] border border-[#293B55]'
                        }`}
                        role="switch"
                        aria-checked={inApp.milestones}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            inApp.milestones ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* GitHub Activity */}
                    <div className="flex items-center justify-between">
                      <span className="text-[#F1F5F9] font-medium">GitHub Activity</span>
                      <button
                        onClick={() => setInApp({ ...inApp, githubActivity: !inApp.githubActivity })}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          inApp.githubActivity ? 'bg-[#2879E8]' : 'bg-[#101A2D] border border-[#293B55]'
                        }`}
                        role="switch"
                        aria-checked={inApp.githubActivity}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            inApp.githubActivity ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* AI Results */}
                    <div className="flex items-center justify-between">
                      <span className="text-[#F1F5F9] font-medium">AI Results</span>
                      <button
                        onClick={() => setInApp({ ...inApp, aiResults: !inApp.aiResults })}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          inApp.aiResults ? 'bg-[#2879E8]' : 'bg-[#101A2D] border border-[#293B55]'
                        }`}
                        role="switch"
                        aria-checked={inApp.aiResults}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            inApp.aiResults ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Payments */}
                    <div className="flex items-center justify-between">
                      <span className="text-[#F1F5F9] font-medium">Payments</span>
                      <button
                        onClick={() => setInApp({ ...inApp, payments: !inApp.payments })}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          inApp.payments ? 'bg-[#2879E8]' : 'bg-[#101A2D] border border-[#293B55]'
                        }`}
                        role="switch"
                        aria-checked={inApp.payments}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            inApp.payments ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ================= COLUMN 3: AI PREFERENCES, ACCOUNT PREFERENCES & ACTIONS ================= */}
              <div className={`space-y-5 ${activeTab !== 'Profile' && activeTab !== 'Account' && activeTab !== 'AI Preferences' ? 'opacity-85' : ''}`}>
                {/* A. AI PREFERENCES CARD */}
                <div
                  className={`rounded-2xl bg-[#172235] border p-6 space-y-4 transition-all ${
                    activeTab === 'AI Preferences'
                      ? 'border-[#2879E8]/80 shadow-lg shadow-blue-500/10 ring-1 ring-[#2879E8]/30'
                      : 'border-[#293B55]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-[#AAB6C8] uppercase tracking-wider">
                      AI PREFERENCES
                    </div>
                    {activeTab === 'AI Preferences' && (
                      <span className="text-[11px] font-semibold text-[#2879E8] bg-[#2879E8]/10 px-2.5 py-1 rounded-full">
                        Active Tab
                      </span>
                    )}
                  </div>

                  {/* AI Provider / Model */}
                  <div>
                    <label className="block text-xs font-semibold text-[#AAB6C8] mb-1.5">AI Provider/Model</label>
                    <select
                      value={ai.model}
                      onChange={(e) => setAi({ ...ai, model: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#101A2D] border border-[#2879E8] text-xs sm:text-sm text-white focus:outline-hidden"
                    >
                      <option value="GPT-4o">GPT-4o (Autonomous AST Engine)</option>
                      <option value="Claude-3.5-Sonnet">Claude 3.5 Sonnet (Extended Reasoning)</option>
                      <option value="DevFlow-AI-Core-v1.2">DevFlow AI Core v1.2 (Fine-tuned Fintech)</option>
                    </select>
                    <p className="text-[11px] text-[#AAB6C8] mt-1.5 leading-snug">
                      Configures the LLM reasoning agent used for PR diff parsing and automated milestone verification.
                    </p>
                  </div>

                  {/* Human Approval (e.g. supported) */}
                  <div className="pt-3 border-t border-[#293B55]/70 space-y-2.5">
                    <span className="block text-xs font-semibold text-white">
                      Human Approval Requirements
                    </span>

                    <div className="flex flex-wrap gap-2.5 text-xs sm:text-sm">
                      {/* GitHub Evidence Chip */}
                      <button
                        type="button"
                        onClick={() => setAi({ ...ai, approvalGitHub: !ai.approvalGitHub })}
                        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-medium transition-colors ${
                          ai.approvalGitHub
                            ? 'bg-[#152B4D] border-[#2879E8] text-[#60A5FA]'
                            : 'bg-[#101A2D] border-[#293B55] text-[#AAB6C8]'
                        }`}
                      >
                        <Check className={`w-4 h-4 ${ai.approvalGitHub ? 'text-[#2879E8]' : 'opacity-0'}`} />
                        <span>GitHub Evidence</span>
                      </button>

                      {/* Payments Chip */}
                      <button
                        type="button"
                        onClick={() => setAi({ ...ai, approvalPayments: !ai.approvalPayments })}
                        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-medium transition-colors ${
                          ai.approvalPayments
                            ? 'bg-[#152B4D] border-[#2879E8] text-[#60A5FA]'
                            : 'bg-[#101A2D] border-[#293B55] text-[#AAB6C8]'
                        }`}
                      >
                        <Check className={`w-4 h-4 ${ai.approvalPayments ? 'text-[#2879E8]' : 'opacity-0'}`} />
                        <span>Payments</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* B. ACCOUNT PREFERENCES CARD (With Validated Time Zones, Date Formats, Currencies, Themes) */}
                <div
                  className={`rounded-2xl bg-[#172235] border p-6 space-y-4 transition-all ${
                    activeTab === 'Account'
                      ? 'border-[#2879E8]/80 shadow-lg shadow-blue-500/10 ring-1 ring-[#2879E8]/30'
                      : 'border-[#293B55]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-[#AAB6C8] uppercase tracking-wider">
                      ACCOUNT PREFERENCES
                    </div>
                    {activeTab === 'Account' && (
                      <span className="text-[11px] font-semibold text-[#2879E8] bg-[#2879E8]/10 px-2.5 py-1 rounded-full">
                        Active Tab
                      </span>
                    )}
                  </div>

                  {/* Standardized Time Zone */}
                  <div>
                    <label className="block text-xs font-semibold text-[#AAB6C8] mb-1.5">Time zone</label>
                    <select
                      value={account.timeZone}
                      onChange={(e) => setAccount({ ...account, timeZone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#101A2D] border border-[#2879E8] text-xs sm:text-sm text-white focus:outline-hidden"
                    >
                      {TIME_ZONE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Standardized Date Format */}
                  <div>
                    <label className="block text-xs font-semibold text-[#AAB6C8] mb-1.5">Date format</label>
                    <select
                      value={account.dateFormat}
                      onChange={(e) => setAccount({ ...account, dateFormat: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#101A2D] border border-[#293B55] text-xs sm:text-sm text-white focus:outline-hidden"
                    >
                      {DATE_FORMAT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Standardized Currency Preference */}
                  <div>
                    <label className="block text-xs font-semibold text-[#AAB6C8] mb-1.5">Currency preference</label>
                    <select
                      value={account.currency}
                      onChange={(e) => setAccount({ ...account, currency: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#101A2D] border border-[#293B55] text-xs sm:text-sm text-white focus:outline-hidden"
                    >
                      {CURRENCY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Standardized Theme */}
                  <div>
                    <label className="block text-xs font-semibold text-[#AAB6C8] mb-1.5">Theme</label>
                    <select
                      value={account.theme}
                      onChange={(e) => {
                        const newTheme = e.target.value;
                        setAccount({ ...account, theme: newTheme });
                        setTheme(newTheme.toLowerCase() as 'dark' | 'light');
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#101A2D] border border-[#293B55] text-xs sm:text-sm text-white focus:outline-hidden"
                    >
                      {THEME_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* C. BOTTOM ACTION BAR (Cancel, Save Changes, Manage Account >) */}
                <div className="space-y-2.5 pt-2">
                  <div className="text-xs font-bold text-[#AAB6C8] uppercase tracking-wider">
                    ACTIONS
                  </div>
                  <div className="flex items-center gap-3.5">
                    <button
                      onClick={handleCancelChanges}
                      className="px-5 py-2.5 rounded-xl bg-[#101A2D] hover:bg-[#1E2E48] border border-[#293B55] text-xs sm:text-sm font-semibold text-white transition-colors"
                      title="Revert to previously saved values"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={handleSaveChanges}
                      className="px-6 py-2.5 rounded-xl bg-[#2879E8] hover:bg-blue-600 text-xs sm:text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-colors"
                      title="Persist non-sensitive preferences safely"
                    >
                      Save Changes
                    </button>

                    <button
                      onClick={() => setManageAccountModalOpen(true)}
                      className="ml-auto text-xs sm:text-sm font-medium text-[#2879E8] hover:text-[#60A5FA] flex items-center gap-1.5 transition-colors"
                    >
                      <span>Manage Account</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
        </div>
      </div>
      </div>
      </div>
      {/* MODAL 1: CHANGE PASSWORD (Demo Simulated With Clear Disclosures) */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-[#172235] border border-[#293B55] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-[#293B55]">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#2879E8]" />
                <div>
                  <h3 className="font-bold text-white text-base">Change Password</h3>
                  <span className="text-[10px] text-amber-400 font-medium">DEMO INTERFACE &bull; NOT TRANSMITTED TO BACKEND</span>
                </div>
              </div>
              <button
                onClick={() => setPasswordModalOpen(false)}
                className="text-[#AAB6C8] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block text-xs sm:text-sm text-[#AAB6C8] mb-1.5">Current Password (Demo)</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter current demo password"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#101A2D] border border-[#293B55] text-white focus:outline-hidden focus:border-[#2879E8]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-[#AAB6C8] hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm text-[#AAB6C8] mb-1.5">New Password</label>
                <input
                  type="password"
                  placeholder="Enter at least 8 characters"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#101A2D] border border-[#293B55] text-white focus:outline-hidden focus:border-[#2879E8]"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm text-[#AAB6C8] mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  placeholder="Confirm new password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#101A2D] border border-[#293B55] text-white focus:outline-hidden focus:border-[#2879E8]"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#101A2D] border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
                <Info className="w-4.5 h-4.5 shrink-0 text-amber-400 mt-0.5" />
                <span>
                  <strong>Security Audit Disclosure:</strong> This password form is a frontend presentation interface. Passwords are never stored in localStorage or transmitted without an enterprise identity server.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#293B55]">
              <button
                onClick={() => setPasswordModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm text-[#AAB6C8] hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setPasswordModalOpen(false);
                  showToast('Password Simulation', 'Demo credentials checked in client memory.', 'info');
                }}
                className="px-5 py-2.5 rounded-xl bg-[#2879E8] hover:bg-blue-600 text-white text-xs sm:text-sm font-semibold"
              >
                Validate Password (Demo)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: TWO-FACTOR AUTHENTICATION (Transparent Demo Disclosures — No Fake Keys) */}
      {twoFactorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-[#172235] border border-[#293B55] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-[#293B55]">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#35C987]" />
                <div>
                  <h3 className="font-bold text-white text-base">Two-Factor Authentication</h3>
                  <span className="text-[10px] text-amber-400 font-medium">DEMO CONFIGURATION ONLY</span>
                </div>
              </div>
              <button
                onClick={() => setTwoFactorModalOpen(false)}
                className="text-[#AAB6C8] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs sm:text-sm">
              <div className="p-3.5 rounded-xl bg-[#101A2D] border border-amber-500/30 text-xs text-amber-300 leading-relaxed">
                <strong>Audit Notice:</strong> Live two-factor authentication requires a connected backend TOTP/OAuth service. In this hackathon build, no secret keys or production tokens are generated or saved.
              </div>

              <div className="p-4.5 rounded-xl bg-[#101A2D] border border-[#293B55] text-center space-y-2.5">
                <div className="w-28 h-28 mx-auto bg-white rounded-xl p-2.5 flex items-center justify-center text-slate-800 text-center font-mono text-xs">
                  [Demo QR Preview]
                </div>
                <div className="text-xs text-[#AAB6C8]">
                  Demo Status: <span className="text-white font-semibold">{twoFactorSimulated ? 'Simulation Enabled' : 'Simulation Disabled'}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm text-[#AAB6C8] mb-1.5">Demo verification code</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="6-digit preview code"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#101A2D] border border-[#293B55] text-white font-mono text-center text-sm sm:text-base tracking-widest focus:outline-hidden focus:border-[#2879E8]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#293B55]">
              {twoFactorSimulated && (
                <button
                  onClick={() => {
                    setTwoFactorSimulated(false);
                    setTwoFactorModalOpen(false);
                    showToast('2FA Demo Simulation', 'Demo 2FA state turned off.', 'info');
                  }}
                  className="text-xs sm:text-sm text-rose-400 hover:text-rose-300 font-medium"
                >
                  Turn off demo 2FA
                </button>
              )}
              <div className="flex items-center gap-3 ml-auto">
                <button
                  onClick={() => setTwoFactorModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm text-[#AAB6C8] hover:text-white"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setTwoFactorSimulated(true);
                    setTwoFactorModalOpen(false);
                    showToast('2FA Demo Simulation', 'Demo 2FA switch updated in client memory.', 'info');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#2879E8] hover:bg-blue-600 text-white text-xs sm:text-sm font-semibold"
                >
                  Save Demo State
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ACTIVE SESSIONS DETAIL (Honest Demo Disclosures) */}
      {activeSessionDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-[#172235] border border-[#293B55] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-[#293B55]">
              <div className="flex items-center gap-2">
                <Laptop className="w-5 h-5 text-[#2879E8]" />
                <h3 className="font-bold text-white text-base">Session Telemetry</h3>
              </div>
              <button
                onClick={() => setActiveSessionDetailModal(null)}
                className="text-[#AAB6C8] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs sm:text-sm">
              <div className="p-3.5 rounded-xl bg-[#101A2D] border border-[#293B55] space-y-2.5">
                <div className="font-semibold text-white">{activeSessionDetailModal}</div>
                <div className="text-xs text-[#AAB6C8]">
                  IP Address: 127.0.0.1 (Localhost / Sandbox Environment)
                </div>
                <div className="text-xs text-[#AAB6C8]">
                  Browser: Current Chromium Runtime
                </div>
                <div className="text-xs text-[#35C987] flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#35C987] animate-pulse" />
                  Authenticated in DevFlow Sandbox Session
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#101A2D] border border-[#293B55] text-xs text-[#AAB6C8]">
                <strong>Notice:</strong> Remote session invalidation requires backend server coordination and is not simulated destructively on client state.
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#293B55]">
              <button
                onClick={() => setActiveSessionDetailModal(null)}
                className="px-5 py-2.5 rounded-xl bg-[#2879E8] hover:bg-blue-600 text-white text-xs sm:text-sm font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: MANAGE ACCOUNT SUMMARY */}
      {manageAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-[#172235] border border-[#293B55] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-[#293B55]">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-[#2879E8]" />
                <h3 className="font-bold text-white text-base">Account Summary</h3>
              </div>
              <button
                onClick={() => setManageAccountModalOpen(false)}
                className="text-[#AAB6C8] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs sm:text-sm">
              <div className="p-3.5 rounded-xl bg-[#101A2D] border border-[#293B55] space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-[#AAB6C8]">Workspace Tier:</span>
                  <span className="font-semibold text-white">DevFlow Enterprise (Sandbox)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#AAB6C8]">Organization:</span>
                  <span className="text-white">{profile.organization}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#AAB6C8]">Billing Currency:</span>
                  <span className="text-white">{account.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#AAB6C8]">Monitored Repository:</span>
                  <span className="text-white truncate max-w-[200px]">northstar-studio/payment-gateway</span>
                </div>
              </div>

              <p className="text-xs text-[#AAB6C8]">
                For organization transfer or workspace deletion, manage access keys on the dedicated <a href="#/integrations" className="text-[#2879E8] underline">Integrations Hub</a>.
              </p>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#293B55]">
              <button
                onClick={() => setManageAccountModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-[#2879E8] hover:bg-blue-600 text-white text-xs sm:text-sm font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guest Mode Restriction Guard Modal */}
      <GuestGuardModal
        isOpen={isGuestGuardOpen}
        onClose={() => setIsGuestGuardOpen(false)}
        actionTitle={guardActionTitle}
        message="Guest Mode: Please sign in or create an account to use this feature."
      />
    </div>
  );
};
