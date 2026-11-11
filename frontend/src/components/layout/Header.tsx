import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { useAuth } from '@/contexts/AuthContext';
import {
  Bell,
  HelpCircle,
  Search,
  ChevronDown,
  User,
  Shield,
  LogOut,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  CreditCard,
  Check,
} from 'lucide-react';
import { MobileMenuTrigger } from './Sidebar';

export interface HeaderProps {
  onOpenMobileMenu: () => void;
  onOpenCommandPalette?: () => void;
}

const breadcrumbMap: Record<string, { title: string; subtitle: string; section: string }> = {
  '/dashboard': {
    title: 'Developer Command Center',
    subtitle: 'Milestone telemetry, AI analysis confidence, and PayPal invoice tracking',
    section: 'Analytics',
  },
  '/projects': {
    title: 'Active Projects Directory',
    subtitle: 'Track repository branches, team allocations, and milestone scopes',
    section: 'Workspace',
  },
  '/milestones': {
    title: 'Milestone Deliverables',
    subtitle: 'Acceptance criteria verification, evidence submissions, and approval status',
    section: 'Management',
  },
  '/evidence': {
    title: 'GitHub Evidence Audit',
    subtitle: 'Inspect PR diffs, commit hashes, and author signoffs',
    section: 'Intelligence',
  },
  '/verification': {
    title: 'AI Verification Reports',
    subtitle: 'Explainable AI requirements validation and automated code scoring',
    section: 'Intelligence',
  },
  '/payments': {
    title: 'PayPal Invoices & Settlements',
    subtitle: 'Generate sandbox invoices and verify cryptographically signed webhook receipts',
    section: 'Financials',
  },
  '/settings': {
    title: 'Platform Settings',
    subtitle: 'Configure GitHub webhooks, PayPal sandbox credentials, and team roles',
    section: 'Configuration',
  },
};

interface NotificationItem {
  id: string;
  category: 'all' | 'milestones' | 'ai' | 'payments';
  title: string;
  desc: string;
  time: string;
  type: 'success' | 'ai' | 'warning' | 'info';
  read: boolean;
  actionUrl?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileMenu,
  onOpenCommandPalette,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isGuest, isClient } = useAuth();
  const headerDisplayName = isGuest
    ? isClient
      ? 'Client Guest'
      : 'Developer Guest'
    : user?.name || (isClient ? 'Client Account' : 'Developer Account');
  const headerRoleLabel = isGuest ? 'DEMO MODE' : isClient ? 'Client' : 'Developer';
  const headerEmail = isGuest
    ? isClient
      ? 'client.demo@devflow.demo'
      : 'developer.demo@devflow.demo'
    : user?.email || '';
  const headerOrg = isGuest
    ? isClient
      ? 'Demo Client Workspace'
      : 'Demo Developer Workspace'
    : user?.organization || 'DevFlow Workspace';
  const headerInitials = isGuest
    ? isClient
      ? 'CG'
      : 'DG'
    : headerDisplayName
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || (isClient ? 'CL' : 'DV');
  const currentMeta = breadcrumbMap[location.pathname] || {
    title: 'DevFlow Workspace',
    subtitle: 'Milestone intelligence and payments',
    section: 'Platform',
  };

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'all' | 'milestones' | 'ai' | 'payments'>('all');

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: '1',
      category: 'payments',
      title: 'Milestone 2 Verified & Paid',
      desc: 'PayPal webhook verified PAYMENT.INVOICING.INVOICE.PAID ($4,500.00)',
      time: '12m ago',
      type: 'success',
      read: false,
      actionUrl: '/payments',
    },
    {
      id: '2',
      category: 'ai',
      title: 'AI Analysis Completed',
      desc: 'Milestone 3 scored 94.2% confidence across 5 commit hashes',
      time: '1h ago',
      type: 'ai',
      read: false,
      actionUrl: '/verification',
    },
    {
      id: '3',
      category: 'milestones',
      title: 'Client Review Pending',
      desc: 'Marcus Vance opened Milestone 3 evidence submission for review',
      time: '2h ago',
      type: 'warning',
      read: false,
      actionUrl: '/milestones',
    },
    {
      id: '4',
      category: 'payments',
      title: 'Sandbox Invoice Draft Ready',
      desc: 'Invoice #INV-2026-0843 created for Payment Gateway Integration',
      time: '5h ago',
      type: 'info',
      read: true,
      actionUrl: '/payments',
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeCategory === 'all') return true;
    return n.category === activeCategory;
  });

  return (
    <header className="sticky top-0 z-20 backdrop-blur-xl bg-white/75 dark:bg-[#090E1D]/75 border-b border-slate-200/70 dark:border-white/10 shadow-xs select-none transition-colors duration-200">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Left: Mobile Trigger + Breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <MobileMenuTrigger onClick={onOpenMobileMenu} />

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="hidden xs:inline text-[11px] font-sans font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0">
                {currentMeta.section}
              </span>
              <span className="hidden xs:inline text-slate-300 dark:text-slate-600">/</span>
              <h1 className="font-heading text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
                {currentMeta.title}
              </h1>
            </div>
            <p className="hidden md:block font-sans text-xs text-slate-500 dark:text-slate-400 truncate max-w-md">
              {currentMeta.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Quick Command Search + Notifications + Help + Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Quick Search / Command Palette Trigger */}
          <button
            onClick={onOpenCommandPalette}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl backdrop-blur-md bg-white/60 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-blue-400/50 dark:hover:border-blue-400/40 hover:bg-white/80 dark:hover:bg-white/10 transition-all duration-150 text-xs w-48 sm:w-60 lg:w-72 shadow-xs cursor-pointer"
            title="Open Command Palette (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate flex-1 text-left">Search projects, invoices...</span>
            <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-white/80 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-[10px] font-mono shadow-xs text-slate-600 dark:text-slate-300">
              ⌘K
            </kbd>
          </button>

          {/* Sandbox Status Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/30 text-[11px] font-semibold text-blue-700 dark:text-blue-300 shadow-xs whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-[#0070BA] animate-pulse" />
            <span>PayPal Sandbox</span>
          </div>

          {/* Notifications Button & Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsNotificationsOpen(!isNotificationsOpen);
                setIsProfileOpen(false);
              }}
              className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10 border border-transparent hover:border-slate-200/50 dark:hover:border-white/10 transition-all cursor-pointer"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#0070BA] ring-2 ring-white dark:ring-[#090E1D]" />
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-sm backdrop-blur-2xl bg-white/90 dark:bg-[#0E172A]/90 text-slate-900 dark:text-white rounded-2xl shadow-2xl border border-white/60 dark:border-white/15 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-2.5 border-b border-slate-200/70 dark:border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Activity & Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.2 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-semibold">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[11px] text-[#0070BA] hover:underline font-medium flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Filter category pills */}
                <div className="px-3 py-1.5 flex items-center gap-1 border-b border-[#E9EAF2] bg-[#F8F9FC]">
                  {(['all', 'milestones', 'ai', 'payments'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={cn(
                        'text-[10px] font-semibold px-2 py-0.5 rounded-lg capitalize transition-colors',
                        activeCategory === cat
                          ? 'bg-white text-[#25263A] shadow-xs border border-[#E9EAF2]'
                          : 'text-[#777B91] hover:text-[#25263A]'
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Notification Items */}
                <div className="divide-y divide-[#E9EAF2] max-h-72 overflow-y-auto">
                  {filteredNotifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#777B91]">
                      No notifications in this category.
                    </div>
                  ) : (
                    filteredNotifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          markAsRead(n.id);
                          if (n.actionUrl) {
                            navigate(n.actionUrl);
                            setIsNotificationsOpen(false);
                          }
                        }}
                        className={cn(
                          'p-3 hover:bg-[#F7F8FC] transition-colors flex items-start gap-3 cursor-pointer',
                          !n.read && 'bg-[#EFF6FF]/30'
                        )}
                      >
                        <div className="mt-0.5 shrink-0">
                          {n.type === 'success' && (
                            <div className="w-6 h-6 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-center text-[#15803D]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                          )}
                          {n.type === 'ai' && (
                            <div className="w-6 h-6 rounded-lg bg-[#F5F3FF] border border-[#DDD6FE] flex items-center justify-center text-[#6D28D9]">
                              <Sparkles className="w-3.5 h-3.5" />
                            </div>
                          )}
                          {n.type === 'warning' && (
                            <div className="w-6 h-6 rounded-lg bg-[#FEFCE8] border border-[#FEF08A] flex items-center justify-center text-[#A16207]">
                              <AlertCircle className="w-3.5 h-3.5" />
                            </div>
                          )}
                          {n.type === 'info' && (
                            <div className="w-6 h-6 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#1D4ED8]">
                              <CreditCard className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p
                              className={cn(
                                'text-xs truncate',
                                !n.read ? 'font-bold text-[#25263A]' : 'font-medium text-[#777B91]'
                              )}
                            >
                              {n.title}
                            </p>
                            <span className="text-[10px] text-[#9D9EAF] shrink-0 ml-2">{n.time}</span>
                          </div>
                          <p className="text-[11px] text-[#777B91] mt-0.5 leading-snug">{n.desc}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="px-4 py-2 border-t border-[#E9EAF2] text-center bg-[#F8F9FC]">
                  <button
                    onClick={() => {
                      navigate('/payments');
                      setIsNotificationsOpen(false);
                    }}
                    className="text-xs text-[#0070BA] font-semibold hover:underline"
                  >
                    View all invoice & webhook audit logs →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Help Button */}
          <button
            onClick={() => window.open('https://github.com/northstar-studio/payment-gateway#readme', '_blank')}
            className="p-2 rounded-xl text-[#777B91] hover:text-[#25263A] hover:bg-[#F1F3FA] transition-colors"
            title="DevFlow Architecture Docs"
            aria-label="DevFlow Docs"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Developer Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsProfileOpen(!isProfileOpen);
                setIsNotificationsOpen(false);
              }}
              className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-xl hover:bg-[#F1F3FA] transition-colors"
              aria-label="User profile menu"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#2563EB] to-[#60A5FA] text-white flex items-center justify-center font-bold text-xs shadow-card-subtle">
                {headerInitials}
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-semibold text-[#25263A] leading-tight">{headerDisplayName}</span>
                <span className="text-[10px] text-[#777B91]">{headerRoleLabel}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#9D9EAF]" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-56 backdrop-blur-2xl bg-white/90 dark:bg-[#0E172A]/90 text-slate-900 dark:text-white rounded-2xl shadow-2xl border border-white/60 dark:border-white/15 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3.5 py-2 border-b border-slate-200/70 dark:border-white/10">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{headerDisplayName}</p>
                  {headerEmail && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{headerEmail}</p>
                  )}
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#86DDBB]" />
                    <span className="text-[10px] text-[#15803D] dark:text-emerald-400 font-medium">{headerOrg}</span>
                  </div>
                </div>

                <div className="py-1">
                  <a
                    href="#/settings"
                    className="flex items-center gap-2 px-3.5 py-2 text-xs text-[#25263A] hover:bg-[#F1F3FA]"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <User className="w-3.5 h-3.5 text-[#777B91]" />
                    <span>Profile & API Keys</span>
                  </a>
                  <a
                    href="https://developer.paypal.com/dashboard/"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between px-3.5 py-2 text-xs text-[#25263A] hover:bg-[#F1F3FA]"
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-[#777B91]" />
                      <span>PayPal Sandbox Portal</span>
                    </div>
                    <ExternalLink className="w-3 h-3 text-[#9D9EAF]" />
                  </a>
                </div>

                <div className="border-t border-[#E9EAF2] pt-1">
                  <button
                    onClick={() => setIsProfileOpen(false)}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-[#C2410C] hover:bg-[#FFF7ED] text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Disconnect Session</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
