import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import { GuestGuardModal } from '@/components/common';
import {
              Bell,
  Settings,
    Menu,
  Mail,
  MessageSquare,
  Smartphone,
  ExternalLink,
  CheckCheck,
  Flag,
  } from 'lucide-react';

// GitHub SVG Logo Icon
const GitHubLogo: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

// PayPal SVG Logo Icon
const PayPalLogo: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path
      d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.789.789 0 0 1 .777-.66h7.026c2.81 0 4.887.675 5.86 1.905.922 1.168.995 2.802.215 4.86-.022.057-.046.113-.07.168-.783 2.113-2.22 3.613-4.27 4.457-.866.357-1.892.538-3.05.538H9.362a.788.788 0 0 0-.777.66l-.992 5.093a.64.64 0 0 1-.517.596z"
      fill="#0079C1"
    />
    <path
      d="M19.068 7.378c-.783 2.113-2.22 3.613-4.27 4.457-.866.357-1.892.538-3.05.538H9.362a.788.788 0 0 0-.777.66l-.992 5.093a.64.64 0 0 1-.517.596H2.47a.641.641 0 0 1-.633-.74L4.944 3.72"
      fill="#00457C"
      opacity="0.4"
    />
    <path
      d="M9.135 12.373l.865-4.444.027-.142A.789.789 0 0 1 10.804 7.1h5.05c2.02 0 3.513.486 4.212 1.37.562.712.67 1.706.324 2.953-.61 2.19-2.074 3.42-4.137 3.42h-2.126a.788.788 0 0 0-.777.66l-.68 3.49-.135.68h-3.4zm7.68-4.273h-3.93a.473.473 0 0 0-.466.395l-.624 3.204h1.53c1.47 0 2.515-.878 2.952-2.443.207-.743.085-1.156-.462-1.156z"
      fill="#0079C1"
    />
  </svg>
);

// Brain SVG Icon
const BrainIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
    <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
    <path d="M12 5v13" />
    <path d="m15.5 10-3.5 2.5" />
    <path d="m8.5 10 3.5 2.5" />
    <path d="m14 15-2 1" />
    <path d="m10 15 2 1" />
  </svg>
);

export type NotificationCategory = 'Projects' | 'AI Activity' | 'Payments';

export interface NotificationItem {
  id: string;
  type: 'ai' | 'paypal' | 'github' | 'milestone';
  category: NotificationCategory;
  title: string;
  description: string;
  project: string;
  projectBadgeColor: 'amber' | 'blue' | 'slate';
  timestamp: string;
  read: boolean;
  linkText?: string;
  linkRoute?: string;
  actions?: {
    primaryText?: string;
    primaryAction?: () => void;
    secondaryText?: string;
    secondaryAction?: () => void;
  };
}

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();

  // Navigation & UI States
  const { openMobileSidebar } = useSidebar();
  const { user, isGuest, isClient, isDeveloper, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'All' | 'Unread' | 'Projects' | 'AI Activity' | 'Payments'>('All');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isGuestGuardOpen, setIsGuestGuardOpen] = useState(false);

  const actorDisplayName = isGuest
    ? isClient
      ? 'Client Guest'
      : 'Developer Guest'
    : user?.name || (isClient ? 'Client Account' : 'Developer Account');
  const actorEmail = isGuest
    ? isClient
      ? 'client.demo@devflow.demo'
      : 'developer.demo@devflow.demo'
    : user?.email || '';
  const actorInitials = isGuest
    ? isClient
      ? 'CG'
      : 'DG'
    : actorDisplayName
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || (isClient ? 'CL' : 'DV');

  // Toast feedback
  const [, setToastMessage] = useState<{ title: string; desc: string; type: 'success' | 'info' } | null>(null);

  const showToast = (title: string, desc: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Notification Preferences (Interactive with safe local persistence)
  const [preferences, setPreferences] = useState<{ email: boolean; slack: boolean; push: boolean }>(() => {
    if (isGuest) {
      return { email: true, slack: false, push: false };
    }
    try {
      const saved = localStorage.getItem('devflow_notification_preferences');
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore storage errors
    }
    return { email: true, slack: false, push: false };
  });

  const handleTogglePreference = (channel: 'email' | 'slack' | 'push') => {
    if (isGuest) {
      setIsGuestGuardOpen(true);
      return;
    }
    setPreferences((prev) => {
      const next = { ...prev, [channel]: !prev[channel] };
      try {
        localStorage.setItem('devflow_notification_preferences', JSON.stringify(next));
      } catch {
        // Safe fallback
      }
      showToast(
        'Preferences Updated',
        `${channel.toUpperCase()} alerts ${next[channel] ? 'enabled' : 'disabled'}.`,
        'info'
      );
      return next;
    });
  };

  // Seed Notifications Matching Reference Screenshot Exactly
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-1',
      type: 'ai',
      category: 'AI Activity',
      title: 'AI Milestone Analysis Completed',
      description: 'Analysis of Milestone: Sprint 8 Backend API complete.',
      project: 'Alpha v1.2',
      projectBadgeColor: 'amber',
      timestamp: '5 mins ago',
      read: false,
      actions: {
        primaryText: 'View Analysis',
        primaryAction: () => navigate('/milestone-verification'),
      },
    },
    {
      id: 'notif-2',
      type: 'paypal',
      category: 'Payments',
      title: 'PayPal Payment Verified',
      description: 'Invoice INV-2026-004 ($8,000.00) verified as paid.',
      project: 'Delta Platform',
      projectBadgeColor: 'blue',
      timestamp: '10 mins ago',
      read: false,
      actions: {
        primaryText: 'View Invoice',
        primaryAction: () => navigate('/invoices'),
        secondaryText: 'View Payment',
        secondaryAction: () => navigate('/payments'),
      },
    },
    {
      id: 'notif-3',
      type: 'github',
      category: 'Projects',
      title: 'GitHub Pull Request Detected',
      description: 'PR #102 created for Apollo Mobile repository.',
      project: 'Apollo Mobile',
      projectBadgeColor: 'amber',
      timestamp: '1 hour ago',
      read: true,
      linkText: 'Included text link to PR repository(Project:ApolloMobile)',
      linkRoute: '/evidence',
    },
    {
      id: 'notif-4',
      type: 'milestone',
      category: 'Projects',
      title: 'Milestone Awaiting Review',
      description: 'Milestone: Gamma v2.1 Alpha ready for final approval.',
      project: 'Gamma Analytics',
      projectBadgeColor: 'slate',
      timestamp: '2 hours ago',
      read: true,
      actions: {
        primaryText: 'Review Milestone',
        primaryAction: () => navigate('/milestones'),
      },
    },
    {
      id: 'notif-5',
      type: 'ai',
      category: 'AI Activity',
      title: 'Autonomous AST Evidence Verification Passed',
      description: 'DevFlow AI Engine verified 15 unit tests and 4 commit diffs against acceptance criteria.',
      project: 'DeFi Staking Hub',
      projectBadgeColor: 'blue',
      timestamp: '4 hours ago',
      read: true,
      actions: {
        primaryText: 'View Scorecard',
        primaryAction: () => navigate('/verification'),
      },
    },
    {
      id: 'notif-6',
      type: 'paypal',
      category: 'Payments',
      title: 'PayPal Webhook Notification Event Received',
      description: 'Instant settlement event PAYMENT.CAPTURE.COMPLETED logged from PayPal Sandbox.',
      project: 'Nebula API Gateway',
      projectBadgeColor: 'amber',
      timestamp: '6 hours ago',
      read: true,
      actions: {
        primaryText: 'View Webhook Logs',
        primaryAction: () => navigate('/integrations'),
      },
    },
  ]);

  // Derived filtered notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      if (activeTab === 'All') return true;
      if (activeTab === 'Unread') return !item.read;
      if (activeTab === 'Projects') return item.category === 'Projects';
      if (activeTab === 'AI Activity') return item.category === 'AI Activity';
      if (activeTab === 'Payments') return item.category === 'Payments';
      return true;
    });
  }, [notifications, activeTab]);

  // Dynamic Unread Counter
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  // Dismiss notification
  const handleDismiss = (id: string) => {
    const target = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((item) => item.id !== id));
    showToast('Notification Dismissed', target?.title || 'Notification removed from your feed.', 'info');
  };

  // Mark single as read/unread toggle
  const handleToggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: !item.read } : item))
    );
  };

  // Mark all as read
  const handleMarkAllAsRead = () => {
    if (unreadCount === 0) {
      showToast('All Caught Up', 'You have no unread notifications.', 'info');
      return;
    }
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    showToast('All Notifications Marked Read', `${unreadCount} notification(s) marked as read.`, 'success');
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#080D18]">
        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-7 py-5">
          <div className="max-w-[1600px] mx-auto space-y-6">
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
                  <h1 className="font-heading text-xl sm:text-2xl font-extrabold tracking-tight text-[#F1F5F9]">Notifications</h1>
                </div>
                <p className="text-xs sm:text-sm text-[#AAB6C8] mt-1">
                  Stay informed about important project, verification, and payment activity.
                </p>
              </div>

              {/* Right Side Header Controls */}
              <div className="flex items-center gap-3 self-end sm:self-auto relative">
                {/* User Avatar */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setUserMenuOpen(!userMenuOpen);
                      setNotificationsOpen(false);
                    }}
                    className={`w-10 h-10 rounded-xl ring-2 ring-[#293B55] hover:ring-[#2879E8] transition-all flex items-center justify-center font-bold text-xs text-white ${
                      isClient
                        ? 'bg-gradient-to-tr from-[#2563EB] to-[#60A5FA]'
                        : 'bg-gradient-to-tr from-violet-600 to-indigo-500'
                    }`}
                    title="User Profile"
                  >
                    {actorInitials}
                  </button>

                  {/* User Profile Popover */}
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#172235] border border-[#293B55] shadow-2xl p-3 z-50 text-xs sm:text-sm animate-in fade-in duration-150">
                      <div className="px-3.5 py-2.5 border-b border-[#293B55]/70 mb-1.5">
                        <div className="font-semibold text-white">{actorDisplayName}</div>
                        {actorEmail && <div className="text-xs text-[#AAB6C8] truncate">{actorEmail}</div>}
                      </div>
                      {!isGuest && (
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            navigate('/settings');
                          }}
                          className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-[#20304B] text-[#AAB6C8] hover:text-white transition-colors flex items-center gap-2"
                        >
                          <Settings className="w-4 h-4" />
                          Account Settings
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          setUserMenuOpen(false);
                          await logout();
                          navigate(isDeveloper ? '/login/developer' : '/login/client', { replace: true });
                        }}
                        className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-rose-500/10 text-rose-400 transition-colors"
                      >
                        {isGuest ? 'Exit Demo Mode' : 'Sign Out'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Quick Notification Bell */}
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
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#2879E8] animate-pulse" />
                    )}
                  </button>

                  {/* Quick Notifications Dropdown */}
                  {notificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-[#172235] border border-[#293B55] shadow-2xl p-4 z-50 text-xs sm:text-sm animate-in fade-in duration-150">
                      <div className="flex items-center justify-between pb-2.5 border-b border-[#293B55]">
                        <span className="font-semibold text-white">Latest Notifications</span>
                        <span className="text-xs text-[#2879E8] font-bold">{unreadCount} Unread</span>
                      </div>
                      <div className="py-2.5 space-y-2 max-h-64 overflow-y-auto">
                        {notifications.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            onClick={() => {
                              handleToggleRead(item.id);
                              setNotificationsOpen(false);
                            }}
                            className="p-2.5 rounded-xl bg-[#101A2D] hover:bg-[#1A2840] cursor-pointer transition-colors"
                          >
                            <div className="font-medium text-white truncate text-xs sm:text-sm">{item.title}</div>
                            <div className="text-xs text-[#AAB6C8] mt-0.5">{item.timestamp}</div>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => setNotificationsOpen(false)}
                        className="w-full text-center py-2 rounded-xl bg-[#2879E8]/10 hover:bg-[#2879E8]/20 text-[#2879E8] text-xs font-semibold transition-colors"
                      >
                        Close Preview
                      </button>
                    </div>
                  )}
                </div>

                {/* Settings Icon */}
                <button
                  onClick={() => navigate('/settings')}
                  className="p-2.5 rounded-xl text-[#AAB6C8] hover:text-white bg-[#172235] hover:bg-[#20304B] border border-[#293B55] transition-colors"
                  title="Workspace Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* MAIN TWO-COLUMN CONTENT GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
              {/* LEFT & CENTER COLUMN: NOTIFICATION FEED (8 of 12 cols) */}
              <div className="lg:col-span-8 space-y-5">
                {/* NOTIFICATION FILTER TABS */}
                <div className="flex items-center border-b border-[#293B55] text-xs sm:text-sm font-medium space-x-7">
                  {(['All', 'Unread', 'Projects', 'AI Activity', 'Payments'] as const).map((tab) => {
                    const isActive = activeTab === tab;
                    return (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-3.5 transition-colors relative flex items-center gap-2 ${
                          isActive
                            ? 'text-[#2879E8] font-bold border-b-2 border-[#2879E8]'
                            : 'text-[#AAB6C8] hover:text-[#F1F5F9]'
                        }`}
                      >
                        <span>{tab}</span>
                        {tab === 'Unread' && unreadCount > 0 && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              isActive ? 'bg-[#2879E8] text-white' : 'bg-[#172235] text-[#AAB6C8]'
                            }`}
                          >
                            {unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* NOTIFICATION CARDS LIST */}
                <div className="space-y-4">
                  {filteredNotifications.length === 0 ? (
                    <div className="p-12 text-center rounded-2xl bg-[#172235] border border-[#293B55] space-y-3.5">
                      <div className="w-14 h-14 rounded-full bg-[#101A2D] text-[#AAB6C8] mx-auto flex items-center justify-center">
                        <CheckCheck className="w-7 h-7 text-[#35C987]" />
                      </div>
                      <div className="text-lg font-bold text-white">No notifications in this filter</div>
                      <p className="text-xs sm:text-sm text-[#AAB6C8] max-w-sm mx-auto">
                        You have addressed all alerts under <span className="text-[#2879E8] font-medium">"{activeTab}"</span>.
                        Switch to "All" to review recent activity.
                      </p>
                      <button
                        onClick={() => setActiveTab('All')}
                        className="px-5 py-2.5 rounded-xl bg-[#2879E8] hover:bg-blue-600 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-500/20 transition-colors"
                      >
                        View All Activity
                      </button>
                    </div>
                  ) : (
                    filteredNotifications.map((item) => {
                      const isUnread = !item.read;

                      return (
                        <div
                          key={item.id}
                          className={`relative rounded-2xl transition-all duration-200 p-5 sm:p-6 ${
                            isUnread
                              ? 'bg-[#172235] border border-[#2879E8] shadow-lg shadow-blue-500/5'
                              : 'bg-[#172235] border border-[#293B55] hover:border-[#3B4F6E]'
                          }`}
                        >
                          {/* Top Row: Unread/Read Badge & Timestamp */}
                          <div className="flex items-center justify-between text-xs mb-3">
                            <div>
                              {isUnread ? (
                                <span className="font-extrabold text-[#2879E8] tracking-wider uppercase text-xs">
                                  UNREAD
                                </span>
                              ) : (
                                <span className="font-semibold text-[#7A8B9E] tracking-wider uppercase text-xs">
                                  READ
                                </span>
                              )}
                            </div>
                            <span className="text-[#AAB6C8] text-xs font-mono">{item.timestamp}</span>
                          </div>

                          {/* Card Body: Icon + Details */}
                          <div className="flex items-start gap-4">
                            {/* Card Icon */}
                            <div className="shrink-0 mt-0.5">
                              {item.type === 'ai' && (
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#2879E8] to-[#60A5FA] flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
                                  <BrainIcon className="w-6 h-6 text-white" />
                                </div>
                              )}
                              {item.type === 'paypal' && (
                                <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shadow-sm">
                                  <PayPalLogo className="w-6 h-6" />
                                </div>
                              )}
                              {item.type === 'github' && (
                                <div className="w-11 h-11 rounded-xl bg-[#101A2D] border border-[#293B55] flex items-center justify-center text-white shadow-sm">
                                  <GitHubLogo className="w-6 h-6 text-white" />
                                </div>
                              )}
                              {item.type === 'milestone' && (
                                <div className="w-11 h-11 rounded-xl bg-[#101A2D] border border-[#293B55] flex items-center justify-center text-[#AAB6C8] shadow-sm">
                                  <Flag className="w-5 h-5 text-[#AAB6C8]" />
                                </div>
                              )}
                            </div>

                            {/* Details & Actions */}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-heading text-base font-bold text-white tracking-tight leading-snug">
                                {item.title}
                              </h3>

                              <div className="text-xs sm:text-sm text-[#AAB6C8] mt-1.5 flex flex-wrap items-center gap-2 leading-relaxed">
                                <span>{item.description}</span>
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${
                                    item.projectBadgeColor === 'amber'
                                      ? 'bg-[#382B14] text-[#FBBF24] border border-[#784F17]'
                                      : item.projectBadgeColor === 'blue'
                                      ? 'bg-[#152B4D] text-[#60A5FA] border border-[#2563EB]/40'
                                      : 'bg-[#1E293B] text-[#94A3B8] border border-[#334155]'
                                  }`}
                                >
                                  (Project: {item.project})
                                </span>
                              </div>

                              {/* Clickable text link reference if present */}
                              {item.linkText && (
                                <div className="mt-2.5">
                                  <button
                                    onClick={() => {
                                      if (item.linkRoute) navigate(item.linkRoute);
                                    }}
                                    className="text-xs sm:text-sm text-[#2879E8] hover:text-[#60A5FA] underline font-medium inline-flex items-center gap-1.5 transition-colors text-left"
                                  >
                                    <span>{item.linkText}</span>
                                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                  </button>
                                </div>
                              )}

                              {/* Card Action Buttons */}
                              <div className="flex flex-wrap items-center gap-2.5 mt-4 pt-1">
                                {item.actions?.primaryText && (
                                  <button
                                    onClick={item.actions.primaryAction}
                                    className="px-4 py-2 rounded-xl bg-[#2879E8] hover:bg-blue-600 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors"
                                  >
                                    {item.actions.primaryText}
                                  </button>
                                )}

                                {item.actions?.secondaryText && (
                                  <button
                                    onClick={item.actions.secondaryAction}
                                    className="px-4 py-2 rounded-xl bg-[#152438] hover:bg-[#1E334F] text-[#60A5FA] border border-[#2879E8]/30 text-xs sm:text-sm font-medium transition-colors"
                                  >
                                    {item.actions.secondaryText}
                                  </button>
                                )}

                                <button
                                  onClick={() => handleDismiss(item.id)}
                                  className="px-3 py-2 rounded-xl text-[#AAB6C8] hover:text-white hover:bg-[#101A2D] text-xs sm:text-sm font-medium transition-colors"
                                >
                                  Dismiss
                                </button>

                                <button
                                  onClick={() => handleToggleRead(item.id)}
                                  className="ml-auto px-2.5 py-1 text-xs text-[#AAB6C8] hover:text-white transition-colors"
                                  title={isUnread ? 'Mark as read' : 'Mark as unread'}
                                >
                                  {isUnread ? 'Mark as read' : 'Mark as unread'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: NOTIFICATION UTILITY PANEL (4 of 12 cols) */}
              <div className="lg:col-span-4 space-y-5">
                {/* 1. UNREAD COUNT CARD */}
                <div className="rounded-2xl bg-[#172235] border border-[#293B55] p-6 space-y-4">
                  <div className="text-xs font-bold text-[#AAB6C8] uppercase tracking-wider">
                    NOTIFICATION UTILITY PANEL
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-base font-medium text-white">Unread Count:</span>
                    <span className="text-4xl font-extrabold text-[#2879E8] tabular-nums">
                      {unreadCount}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-[#293B55]/70 flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-[#AAB6C8]">Quick Action</span>
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-[#2879E8] hover:text-[#60A5FA] font-semibold transition-colors inline-flex items-center gap-1.5"
                    >
                      <CheckCheck className="w-4 h-4" />
                      Mark all as read
                    </button>
                  </div>
                </div>

                {/* 2. NOTIFICATION PREFERENCES CARD */}
                <div className="rounded-2xl bg-[#172235] border border-[#293B55] p-6 space-y-5">
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      Notification Preferences
                    </h3>
                    <p className="text-xs sm:text-sm text-[#AAB6C8] mt-1">
                      Manage your channel settings.
                    </p>
                  </div>

                  {/* Channel Toggles */}
                  <div className="space-y-3.5 pt-1">
                    {/* Email Toggle */}
                    <div className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-3 text-xs sm:text-sm text-[#F1F5F9] font-medium">
                        <Mail className="w-5 h-5 text-[#AAB6C8]" />
                        <span>Email</span>
                      </div>
                      <button
                        onClick={() => handleTogglePreference('email')}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          preferences.email ? 'bg-[#2879E8]' : 'bg-[#101A2D] border border-[#293B55]'
                        }`}
                        role="switch"
                        aria-checked={preferences.email}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            preferences.email ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Slack Toggle */}
                    <div className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-3 text-xs sm:text-sm text-[#F1F5F9] font-medium">
                        <MessageSquare className="w-5 h-5 text-[#AAB6C8]" />
                        <span>Slack</span>
                      </div>
                      <button
                        onClick={() => handleTogglePreference('slack')}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          preferences.slack ? 'bg-[#2879E8]' : 'bg-[#101A2D] border border-[#293B55]'
                        }`}
                        role="switch"
                        aria-checked={preferences.slack}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            preferences.slack ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Push Toggle */}
                    <div className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-3 text-xs sm:text-sm text-[#F1F5F9] font-medium">
                        <Smartphone className="w-5 h-5 text-[#AAB6C8]" />
                        <span>Push</span>
                      </div>
                      <button
                        onClick={() => handleTogglePreference('push')}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          preferences.push ? 'bg-[#2879E8]' : 'bg-[#101A2D] border border-[#293B55]'
                        }`}
                        role="switch"
                        aria-checked={preferences.push}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            preferences.push ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Informational Footer */}
                  <div className="pt-3 border-t border-[#293B55]/70">
                    <p className="text-[11px] text-[#AAB6C8] leading-tight">
                      {isGuest
                        ? 'Guest Demo Mode: notification preferences are read-only previews.'
                        : 'Preferences are saved locally in your browser session.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <GuestGuardModal
          isOpen={isGuestGuardOpen}
          onClose={() => setIsGuestGuardOpen(false)}
          actionTitle="Update Notification Preferences"
          message="Notification delivery settings are disabled in Guest Demo Mode."
        />
      </div>
  );
};
