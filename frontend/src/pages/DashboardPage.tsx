import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import { devFlowApi } from '@/services/api';
import {
  DeveloperTelemetry,
  Project,
  Milestone,
  TelemetryRange,
  NotificationItem,
} from '@/types';
import {
  Search,
  Bell,
  Plus,
  FolderGit2,
  GitBranch,
  Sparkles,
  LineChart,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  ShieldCheck,
  FileCode,
  Wallet,
  X,
  BriefcaseBusiness,
  Code2,
  Eye,
  Settings,
  LogOut,
  ChevronDown,
  UserPlus,
  RefreshCw,
  AlertCircle,
  Link2,
} from 'lucide-react';
import { MobileMenuTrigger } from '@/components/layout/Sidebar';
import { GuestGuardModal } from '@/components/common';
import { GitHubConnectModal } from '@/components/github/GitHubConnectModal';

const RANGE_OPTIONS: Array<{ value: TelemetryRange; label: string }> = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: 'all', label: 'All' },
];

function formatMoney(amount: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  } catch {
    return `$${(amount || 0).toLocaleString()}`;
  }
}

function formatRelativeTime(iso?: string | null): string {
  if (!iso) return 'Never';
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return '—';
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatShortDate(iso?: string | null): string {
  if (!iso) return '—';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatActivityLabel(action: string, details: Record<string, any>): string {
  switch (action) {
    case 'GITHUB_REPO_CONNECTED':
      return `Linked repository ${details?.repoFullName || ''}`.trim();
    case 'GITHUB_REPO_SYNCED':
      return `Synced ${details?.repoFullName || 'GitHub'} (${details?.commitsCount ?? 0} commits)`;
    case 'EVIDENCE_SUBMITTED':
      return `Submitted deliverable evidence`;
    case 'AI_VERIFICATION_COMPLETED':
      return `AI verification completed (${details?.overallScore ?? 'scored'})`;
    case 'MILESTONE_APPROVED':
      return `Milestone approved by client`;
    case 'MILESTONE_REJECTED':
      return `Changes requested on milestone`;
    case 'INVOICE_CREATED':
    case 'INVOICE_SENT':
      return `Invoice generated for milestone`;
    case 'PAYMENT_RECEIVED':
      return `Payment settled`;
    case 'PAYOUT_DISBURSED':
      return `Developer payout disbursed`;
    case 'PROJECT_CREATED':
      return `Project created`;
    default:
      return action.replace(/_/g, ' ').toLowerCase();
  }
}

export const DashboardPage: React.FC = () => {
  const { openMobileSidebar: toggleMobileSidebar } = useSidebar();
  const {
    user,
    isClient,
    isDeveloper,
    isGuest,
    githubConnected,
    shouldShowGitHubOnboarding,
    dismissGitHubOnboardingForSession,
    updateGitHubConnectionState,
    logout,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRange, setSelectedRange] = useState<TelemetryRange>('30d');
  const [telemetry, setTelemetry] = useState<DeveloperTelemetry | null>(null);
  const [telemetryError, setTelemetryError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isGuestGuardOpen, setIsGuestGuardOpen] = useState(false);

  // Manual trigger for GitHub onboarding modal (e.g. clicking "Connect GitHub" chip)
  const [manualConnectModalOpen, setManualConnectModalOpen] = useState(false);
  const [oauthBanner, setOauthBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [syncingRepoId, setSyncingRepoId] = useState<string | null>(null);

  // User Profile Dropdown state
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [userMenuOpen]);

  // New Project Modal State (clean defaults, zero placeholder orgs)
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newRepo, setNewRepo] = useState('');
  const [newBudget, setNewBudget] = useState('');
  const [projectFormError, setProjectFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search input state
  const [searchQuery, setSearchQuery] = useState('');

  // Notifications dropdown state
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // User details from auth context
  const displayName =
    user?.name ||
    user?.email ||
    (isGuest ? (isClient ? 'Client Demo' : 'Developer Demo') : 'Workspace Member');
  const firstName = displayName.split(' ')[0];
  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || (isClient ? 'CL' : 'DV');

  const roleBadgeLabel = isGuest
    ? isClient
      ? 'Client Guest'
      : 'Developer Guest'
    : isClient
      ? 'Client'
      : 'Developer';

  const avatarGradient = isGuest
    ? isClient
      ? 'bg-gradient-to-tr from-blue-500 to-teal-400'
      : 'bg-gradient-to-tr from-purple-500 to-indigo-400'
    : isClient
      ? 'bg-gradient-to-tr from-[#2563EB] to-[#60A5FA]'
      : 'bg-gradient-to-tr from-purple-600 to-indigo-400';

  const loadDashboard = useCallback(
    async (rangeToUse: TelemetryRange = selectedRange, isManualRefresh = false) => {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setTelemetryError(null);
      try {
        const [telemetryRes, projectsRes, milestonesRes, notificationsRes] = await Promise.all([
          devFlowApi.getTelemetry(rangeToUse),
          devFlowApi.getProjects(),
          devFlowApi.getMilestones(),
          devFlowApi.getNotifications(),
        ]);

        setTelemetry(telemetryRes.data);
        if (telemetryRes.error) {
          setTelemetryError(telemetryRes.error);
        }
        setProjects(projectsRes.data);
        setMilestones(milestonesRes.data);
        setNotifications(notificationsRes.data);
        setUnreadCount(notificationsRes.unreadCount);
      } catch (err: any) {
        setTelemetryError(err?.message || 'Failed to load dashboard telemetry.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedRange]
  );

  // Handle return query parameters from GitHub OAuth connect callback
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ghStatus = params.get('github');
    const ghError = params.get('github_error');

    if (ghStatus === 'connected') {
      updateGitHubConnectionState(true);
      setManualConnectModalOpen(false);
      setOauthBanner({
        type: 'success',
        message: 'GitHub account connected successfully. You can now browse and sync repositories.',
      });
      navigate(location.pathname, { replace: true });
      loadDashboard(selectedRange, true);
    } else if (ghError) {
      const errorMessages: Record<string, string> = {
        access_denied: 'GitHub authorization was cancelled before granting access.',
        github_account_in_use:
          'This GitHub account is already linked to a different DevFlow user.',
        github_not_configured:
          'GitHub OAuth is not configured on the server (.env GITHUB_CLIENT_ID / SECRET missing).',
      };
      setOauthBanner({
        type: 'error',
        message: errorMessages[ghError] || `GitHub connection failed: ${ghError}`,
      });
      navigate(location.pathname, { replace: true });
    }
  }, [location.search, location.pathname, navigate, updateGitHubConnectionState, loadDashboard, selectedRange]);

  useEffect(() => {
    loadDashboard(selectedRange, false);
  }, [selectedRange, loadDashboard]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) {
      setIsNewProjectModalOpen(false);
      setIsGuestGuardOpen(true);
      return;
    }
    if (!newProjectName.trim()) {
      setProjectFormError('Project title is required.');
      return;
    }

    setProjectFormError(null);
    setIsSubmitting(true);
    try {
      await devFlowApi.createProject({
        name: newProjectName.trim(),
        description: newClientName.trim()
          ? `Workspace deliverable project for ${newClientName.trim()}`
          : 'Milestone delivery & verification workspace',
        clientName: newClientName.trim() || 'Workspace Client',
        clientEmail: '',
        githubRepo: newRepo.trim(),
        totalBudget: Number(newBudget) || 0,
        currency: 'USD',
      });
      setIsNewProjectModalOpen(false);
      setNewProjectName('');
      setNewClientName('');
      setNewRepo('');
      setNewBudget('');
      await loadDashboard(selectedRange, true);
    } catch (err: any) {
      setProjectFormError(err?.message || 'Failed to create project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSyncProject = async (projectId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isGuest) {
      setIsGuestGuardOpen(true);
      return;
    }
    setSyncingRepoId(projectId);
    try {
      await devFlowApi.syncProjectRepo(projectId, true);
      await loadDashboard(selectedRange, true);
    } catch (err: any) {
      setOauthBanner({
        type: 'error',
        message: err?.message || 'Failed to synchronize repository.',
      });
    } finally {
      setSyncingRepoId(null);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    await devFlowApi.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  // Authoritative project rows (backend telemetry.projects for real users; isolated guest projects in Guest Mode)
  const displayProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (isGuest) {
      return projects
        .map((proj) => {
          const projMilestones = milestones.filter((m) => m.projectId === proj.id);
          const done = projMilestones.filter(
            (m) => m.status === 'client_approved' || m.status === 'paid'
          ).length;
          const progress =
            projMilestones.length > 0 ? Math.round((done / projMilestones.length) * 100) : 0;
          const nextMs = projMilestones[0];
          return {
            id: proj.id,
            title: proj.name,
            status: 'DEMO',
            clientName: proj.clientName,
            leadDeveloperName: 'Demo Developer',
            progress,
            totalMilestones: projMilestones.length,
            completedMilestones: done,
            milestonesInReview: projMilestones.filter((m) => m.status === 'evidence_submitted').length,
            currentDeliverable: nextMs?.title || 'Demo Deliverable',
            targetDate: nextMs?.dueDate || null,
            githubRepoOwner: proj.githubRepo?.split('/')[0] || null,
            githubRepoName: proj.githubRepo?.split('/')[1] || null,
            githubSyncStatus: 'DEMO',
            githubSyncedAt: null,
          };
        })
        .filter((p) => !q || p.title.toLowerCase().includes(q) || (p.clientName || '').toLowerCase().includes(q));
    }

    const source = telemetry?.projects || [];
    return source.filter((p) => {
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        (p.clientName || '').toLowerCase().includes(q) ||
        (p.leadDeveloperName || '').toLowerCase().includes(q) ||
        (p.currentDeliverable || '').toLowerCase().includes(q) ||
        `${p.githubRepoOwner || ''}/${p.githubRepoName || ''}`.toLowerCase().includes(q)
      );
    });
  }, [isGuest, projects, milestones, telemetry?.projects, searchQuery]);

  const financials = telemetry?.financials;
  const currency = telemetry?.currency || financials?.currency || 'USD';

  const activeProjectsCount = isGuest
    ? projects.length
    : telemetry?.totalProjects ?? displayProjects.length;
  const totalMilestonesCount = isGuest
    ? milestones.length
    : telemetry?.totalMilestones ?? telemetry?.activeMilestonesCount ?? milestones.length;
  const inReviewCount = isGuest
    ? milestones.filter((m) => m.status === 'evidence_submitted').length
    : telemetry?.milestonesInReview ?? 0;

  const clientPaidAmount = isGuest
    ? telemetry?.totalRevenuePaid ?? 0
    : financials?.receivedPaymentAmount ?? telemetry?.totalRevenuePaid ?? 0;
  const clientPendingAmount = isGuest
    ? telemetry?.pendingInvoicesAmount ?? 0
    : financials?.pendingPaymentAmount ?? telemetry?.pendingInvoicesAmount ?? 0;

  const devPendingEarnings = isGuest
    ? telemetry?.pendingInvoicesAmount ?? 0
    : financials?.pendingEarningsAmount ?? 0;
  const devReceivedPayouts = isGuest
    ? telemetry?.totalRevenuePaid ?? 0
    : financials?.completedPayoutAmount ?? 0;
  const devHeldPayouts = financials?.pendingPayoutAmount ?? 0;

  const aiAgentsList = useMemo(() => {
    if (isGuest) {
      return [
        {
          agentType: 'EVIDENCE_ANALYSIS',
          code: 'AGENT 01',
          label: 'Evidence & Syntax Auditor',
          status: 'COMPLETED' as const,
          providerMode: 'FALLBACK_MOCK' as const,
          summary: 'Demo simulation ready',
          confidenceScore: 94,
          lastRunAt: null,
          totalRuns: 3,
        },
        {
          agentType: 'MILESTONE_VERIFICATION',
          code: 'AGENT 02',
          label: 'Requirement Verifier',
          status: 'COMPLETED' as const,
          providerMode: 'FALLBACK_MOCK' as const,
          summary: 'Demo requirements verified',
          confidenceScore: 92,
          lastRunAt: null,
          totalRuns: 3,
        },
        {
          agentType: 'RISK_DETECTION',
          code: 'AGENT 03',
          label: 'Risk & Schedule Monitor',
          status: 'COMPLETED' as const,
          providerMode: 'FALLBACK_MOCK' as const,
          summary: 'No delivery blockers detected',
          confidenceScore: 90,
          lastRunAt: null,
          totalRuns: 2,
        },
        {
          agentType: 'PAYMENT_COORDINATION',
          code: 'AGENT 04',
          label: 'Payment Readiness Advisor',
          status: 'COMPLETED' as const,
          providerMode: 'FALLBACK_MOCK' as const,
          summary: 'Awaiting client sign-off',
          confidenceScore: 95,
          lastRunAt: null,
          totalRuns: 2,
        },
      ];
    }
    return telemetry?.aiAgents || [];
  }, [isGuest, telemetry?.aiAgents]);

  // Linked GitHub project status summary for Repository & Verification Feed
  const linkedRepoProject = useMemo(() => {
    const list = telemetry?.projects || [];
    return list.find((p) => p.githubRepoOwner && p.githubRepoName) || null;
  }, [telemetry?.projects]);

  // Dynamic SVG polyline points from real financial timeSeries
  const chartPlot = useMemo(() => {
    const pts = financials?.timeSeries || [];
    if (pts.length === 0) return null;
    const maxVal = Math.max(
      1,
      ...pts.map((p) => Math.max(p.received, p.pending, p.disbursed))
    );
    const width = 300;
    const height = 85;
    const stepX = pts.length > 1 ? width / (pts.length - 1) : 0;

    const toCoords = (selector: (p: typeof pts[number]) => number) =>
      pts
        .map((p, idx) => {
          const x = pts.length === 1 ? width / 2 : idx * stepX;
          const y = height - (selector(p) / maxVal) * 70 - 5;
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');

    return {
      points: pts,
      primaryLine: toCoords((p) => (isDeveloper ? p.disbursed || p.received : p.received)),
      secondaryLine: toCoords((p) => p.pending),
    };
  }, [financials?.timeSeries, isDeveloper]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#080D18] text-white">
        <div className="flex items-center gap-2.5 text-xs text-slate-400 font-mono">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] animate-ping" />
          <span>Loading DevFlow Telemetry...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden bg-transparent text-[#0F172A] dark:text-[#F8FAFC] transition-colors duration-200">
      {/* Sticky Top Navbar */}
      <header className="sticky top-0 z-30 h-14 bg-white/80 dark:bg-[#080D18]/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <MobileMenuTrigger onClick={toggleMobileSidebar} />
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#0F172A] dark:text-white">
            Dashboard
          </h1>
          {isGuest && (
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
              DEMO MODE
            </span>
          )}
        </div>

        {/* Right Controls: Search + Notifications + User Profile */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          <div className="relative hidden md:block w-56 lg:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects, repos..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-[#111C30] border border-slate-200 dark:border-[#26344B] rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => {
                setNotificationsOpen((prev) => !prev);
                setUserMenuOpen(false);
              }}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#101A2D] rounded-lg transition-colors relative cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-blue-500 absolute top-1.5 right-1.5 ring-2 ring-[#080D18]" />
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-[#26344B] rounded-xl shadow-2xl p-3 z-50 text-xs text-slate-700 dark:text-slate-300 space-y-2 opacity-100">
                <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-white pb-1.5 border-b border-slate-200 dark:border-[#1E293B]">
                  <span>Notifications</span>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && !isGuest && (
                      <button
                        type="button"
                        onClick={handleMarkAllNotificationsRead}
                        className="text-[10px] text-blue-400 hover:text-blue-300 cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                    <button
                      type="button"
                      className="text-[10px] text-slate-400 hover:text-white cursor-pointer"
                      onClick={() => setNotificationsOpen(false)}
                    >
                      Close
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-4 text-center text-[11px] text-slate-400">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.slice(0, 6).map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (!n.isRead && !isGuest) {
                            devFlowApi.markNotificationRead(n.id);
                          }
                          setNotificationsOpen(false);
                          navigate('/notifications');
                        }}
                        className={`p-2 rounded-lg cursor-pointer transition-colors ${
                          n.isRead
                            ? 'bg-slate-50/70 dark:bg-[#0B1220]/70 hover:bg-slate-100 dark:hover:bg-[#1E293B]'
                            : 'bg-blue-50/60 dark:bg-blue-950/30 border border-blue-500/20 hover:bg-blue-950/50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-slate-900 dark:text-white truncate">
                            {n.title}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {formatRelativeTime(n.createdAt)}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                          {n.message}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNotificationsOpen(false);
                    navigate('/notifications');
                  }}
                  className="w-full py-1.5 text-center text-[11px] font-medium text-blue-400 hover:text-blue-300 border-t border-slate-200 dark:border-[#1E293B] pt-2 cursor-pointer"
                >
                  View all notifications
                </button>
              </div>
            )}
          </div>

          {/* Interactive User Profile Dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen(false);
                setUserMenuOpen((prev) => !prev);
              }}
              className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-[#1E293B] hover:bg-slate-100 dark:hover:bg-[#111C30]/80 pr-2 py-1 rounded-lg transition-colors cursor-pointer"
              aria-expanded={userMenuOpen}
            >
              <div
                className={`w-7 h-7 rounded-lg ${avatarGradient} flex items-center justify-center text-white text-[11px] font-bold shadow-sm`}
              >
                {initials}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-slate-900 dark:text-white leading-none truncate max-w-[110px]">
                  {displayName}
                </div>
                <div
                  className={`text-[9px] font-semibold uppercase tracking-wider mt-0.5 ${
                    isGuest
                      ? 'text-teal-600 dark:text-teal-400'
                      : isClient
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-purple-600 dark:text-purple-400'
                  }`}
                >
                  {roleBadgeLabel}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-[#26344B] rounded-xl shadow-2xl py-2 z-50 text-xs text-slate-700 dark:text-slate-200 opacity-100">
                <div className="px-3.5 py-2 border-b border-slate-200 dark:border-[#1E293B]">
                  <p className="font-semibold text-slate-900 dark:text-white truncate">{displayName}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {isGuest ? 'Guest Demo Workspace' : user?.email || ''}
                  </p>
                  <span
                    className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider border ${
                      isGuest
                        ? 'bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-500/30'
                        : isClient
                          ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30'
                          : 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30'
                    }`}
                  >
                    {isGuest ? (
                      <Eye className="w-2.5 h-2.5" />
                    ) : isClient ? (
                      <BriefcaseBusiness className="w-2.5 h-2.5" />
                    ) : (
                      <Code2 className="w-2.5 h-2.5" />
                    )}
                    {roleBadgeLabel}
                  </span>
                </div>

                {isGuest ? (
                  <>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate('/signup');
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-slate-100 dark:hover:bg-[#1E293B] flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-medium cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Create Full Account
                    </button>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate('/login');
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-slate-100 dark:hover:bg-[#1E293B] flex items-center gap-2.5 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 text-slate-400" /> Sign In to Account
                    </button>
                  </>
                ) : (
                  <>
                    {isDeveloper && !githubConnected && (
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          setManualConnectModalOpen(true);
                        }}
                        className="w-full px-3.5 py-2 text-left hover:bg-slate-100 dark:hover:bg-[#1E293B] flex items-center gap-2.5 text-blue-400 cursor-pointer"
                      >
                        <GitBranch className="w-3.5 h-3.5" /> Connect GitHub
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate('/settings');
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-slate-100 dark:hover:bg-[#1E293B] flex items-center gap-2.5 cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-400" /> Account Settings
                    </button>
                    <button
                      onClick={async () => {
                        setUserMenuOpen(false);
                        await logout();
                        navigate('/login');
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-slate-100 dark:hover:bg-[#1E293B] flex items-center gap-2.5 text-rose-600 dark:text-rose-400 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Scrollable Main Container */}
      <div className="flex-1 overflow-y-auto">
        <main className="p-4 sm:p-6 max-w-[1440px] w-full mx-auto space-y-6">
        {/* OAuth / Sync Banner */}
        {oauthBanner && (
          <div
            className={`rounded-xl px-4 py-3 border flex items-center justify-between gap-3 text-xs ${
              oauthBanner.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {oauthBanner.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{oauthBanner.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setOauthBanner(null)}
              className="text-slate-400 hover:text-white"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Honest Telemetry Error Banner */}
        {telemetryError && !isGuest && (
          <div className="rounded-xl px-4 py-3 border bg-rose-500/10 border-rose-500/30 text-rose-200 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{telemetryError}</span>
            </div>
            <button
              type="button"
              onClick={() => loadDashboard(selectedRange, true)}
              className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-100 font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        {/* Hero Greeting Row */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Welcome back, {firstName}
              </h2>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                  isGuest
                    ? 'bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-500/30'
                    : isClient
                      ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30'
                      : 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/30'
                }`}
              >
                {isGuest
                  ? isClient
                    ? 'Client (Demo Mode)'
                    : 'Developer (Demo Mode)'
                  : isClient
                    ? 'Client'
                    : 'Developer'}
              </span>
              {!isGuest && isDeveloper && (
                <button
                  type="button"
                  onClick={() =>
                    githubConnected
                      ? navigate('/integrations')
                      : setManualConnectModalOpen(true)
                  }
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border transition-colors cursor-pointer ${
                    githubConnected
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-blue-500/50 hover:text-white'
                  }`}
                >
                  <GitBranch className="w-3 h-3" />
                  {githubConnected
                    ? `GitHub: @${user?.githubUsername || telemetry?.integrations?.github?.username || 'connected'}`
                    : 'Connect GitHub'}
                </button>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {isGuest
                ? isClient
                  ? 'Demo Workspace • Milestone approvals, AI proof audits and PayPal workflow preview.'
                  : 'Demo Workspace • Repository sync, commit proofs and milestone telemetry preview.'
                : isClient
                  ? `${user?.organization ? `${user.organization} • ` : ''}Project approvals, verification evidence and invoice tracking.`
                  : `${user?.organization ? `${user.organization} • ` : ''}Live repository telemetry, commit evidence and milestone earnings.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            <button
              onClick={() => loadDashboard(selectedRange, true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 bg-slate-900/60 hover:bg-slate-800 border border-[#26344B] text-slate-300 px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh workspace telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {isClient ? (
              <>
                <button
                  onClick={() => {
                    if (isGuest) {
                      setIsGuestGuardOpen(true);
                      return;
                    }
                    setIsNewProjectModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 bg-[#2563EB] hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-lg shadow-blue-600/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  New Project
                </button>
                <button
                  onClick={() => navigate('/milestones')}
                  className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-[#26344B] text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Review Milestones
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/evidence')}
                  className="inline-flex items-center gap-2 bg-[#2563EB] hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-lg shadow-blue-600/20 cursor-pointer"
                >
                  <FileCode className="w-4 h-4" />
                  Submit Evidence
                </button>
                <button
                  onClick={() => {
                    if (isGuest) {
                      setIsGuestGuardOpen(true);
                      return;
                    }
                    setIsNewProjectModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-[#26344B] text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  New Project
                </button>
              </>
            )}
          </div>
        </section>

        {/* 5 KPI Summary Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1 */}
          <div
            onClick={() => navigate('/projects')}
            className="bg-[#0B1220] border border-[#1E293B] hover:border-blue-500/40 rounded-xl p-4 shadow-sm transition-colors cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{isClient ? 'Active Projects' : 'Assigned Projects'}</span>
              <FolderGit2 className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="flex items-end justify-between mt-3">
              <span className="text-2xl font-bold text-white tabular-nums">
                {String(activeProjectsCount).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-slate-400">
                {displayProjects.filter((p) => p.githubRepoOwner).length} linked repos
              </span>
            </div>
          </div>

          {/* Card 2 */}
          <div
            onClick={() => navigate('/milestones')}
            className="bg-[#0B1220] border border-[#1E293B] hover:border-slate-700 rounded-xl p-4 shadow-sm transition-colors cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{isClient ? 'Active Milestones' : 'Total Milestones'}</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="flex items-end justify-between mt-3">
              <span className="text-2xl font-bold text-white tabular-nums">
                {String(totalMilestonesCount).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-slate-400">
                {telemetry?.approvedMilestonesCount ?? 0} approved
              </span>
            </div>
          </div>

          {/* Card 3 */}
          <div
            onClick={() => navigate('/verification')}
            className="bg-[#0B1220] border border-[#1E293B] hover:border-amber-500/40 rounded-xl p-4 shadow-sm transition-colors cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{isClient ? 'Pending Review' : 'Deliverables in Review'}</span>
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-2xl font-bold text-amber-400 tabular-nums">
                {String(inReviewCount).padStart(2, '0')}
              </span>
              {inReviewCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </div>
          </div>

          {/* Card 4 */}
          <div
            onClick={() => navigate(isClient ? '/payments' : '/invoices')}
            className="bg-[#0B1220] border border-[#1E293B] hover:border-slate-700 rounded-xl p-4 shadow-sm transition-colors cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{isClient ? 'Total Paid' : 'Pending Earnings'}</span>
              <Wallet className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="flex items-end justify-between mt-3">
              <span className="text-2xl font-bold text-white tabular-nums">
                {formatMoney(isClient ? clientPaidAmount : devPendingEarnings, currency)}
              </span>
            </div>
            {!isClient && devHeldPayouts > 0 && (
              <p className="text-[10px] text-sky-400 mt-1">
                +{formatMoney(devHeldPayouts, currency)} held for payout
              </p>
            )}
          </div>

          {/* Card 5 */}
          <div
            onClick={() => navigate(isClient ? '/invoices' : '/payments')}
            className="bg-[#0B1220] border border-[#1E293B] hover:border-emerald-500/40 rounded-xl p-4 shadow-sm transition-colors cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{isClient ? 'Pending Invoices' : 'Received Payouts'}</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="flex items-end justify-between mt-3">
              <span
                className={`text-2xl font-bold tabular-nums ${
                  isClient ? 'text-white' : 'text-emerald-400'
                }`}
              >
                {formatMoney(isClient ? clientPendingAmount : devReceivedPayouts, currency)}
              </span>
            </div>
          </div>
        </section>

        {/* Main 2-Column Responsive Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (lg:col-span-8) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Projects & Deliverables Table */}
            <div className="bg-[#0B1220] border border-[#1E293B] rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-[#1E293B] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FolderGit2 className="w-4 h-4 text-blue-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                    {isClient ? 'Active Projects & Milestones' : 'Assigned Projects & Deliverables'}
                  </h3>
                </div>
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {displayProjects.length} {displayProjects.length === 1 ? 'Project' : 'Projects'}
                </span>
              </div>

              {displayProjects.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <FolderGit2 className="w-8 h-8 text-slate-600 mx-auto" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">
                      {searchQuery
                        ? 'No matching projects found'
                        : 'No projects in your workspace yet'}
                    </p>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      {searchQuery
                        ? 'Try clearing or refining your search filter.'
                        : 'Create a new project or accept a project invitation to begin tracking repositories and deliverables.'}
                    </p>
                  </div>
                  {!searchQuery && (
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          isGuest ? setIsGuestGuardOpen(true) : setIsNewProjectModalOpen(true)
                        }
                        className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Create Project
                      </button>
                      {isDeveloper && !githubConnected && !isGuest && (
                        <button
                          type="button"
                          onClick={() => setManualConnectModalOpen(true)}
                          className="px-4 py-2 rounded-lg bg-[#111C30] hover:bg-[#1A2845] border border-[#26344B] text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <GitBranch className="w-3.5 h-3.5" /> Connect GitHub
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#1E293B] text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        <th className="py-3 px-5">Project &amp; Repo</th>
                        <th className="py-3 px-4">{isClient ? 'Lead Developer' : 'Client'}</th>
                        <th className="py-3 px-4">Progress</th>
                        <th className="py-3 px-4">Current Deliverable</th>
                        <th className="py-3 px-4">Target Date</th>
                        <th className="py-3 px-5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E293B] text-xs">
                      {displayProjects.slice(0, 6).map((proj) => {
                        const counterparty = isClient
                          ? proj.leadDeveloperName || 'Unassigned'
                          : proj.clientName || 'Workspace Client';
                        const hasRepo = Boolean(proj.githubRepoOwner && proj.githubRepoName);
                        const statusColor =
                          proj.milestonesInReview > 0
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            : proj.status === 'COMPLETED' || proj.progress === 100
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : 'bg-blue-500/10 text-blue-300 border-blue-500/30';
                        const statusText =
                          proj.milestonesInReview > 0
                            ? `${proj.milestonesInReview} In Review`
                            : proj.status;

                        return (
                          <tr
                            key={proj.id}
                            onClick={() => navigate('/projects')}
                            className="hover:bg-white/[0.02] transition-colors cursor-pointer group"
                          >
                            <td className="py-3.5 px-5 font-medium text-white">
                              <div className="group-hover:text-blue-400 transition-colors">
                                {proj.title}
                              </div>
                              <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400">
                                {hasRepo ? (
                                  <>
                                    <GitBranch className="w-3 h-3 text-emerald-400" />
                                    <span className="font-mono">
                                      {proj.githubRepoOwner}/{proj.githubRepoName}
                                    </span>
                                    <span className="text-slate-500">
                                      • {proj.githubSyncStatus || 'Linked'}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-slate-500">No repository linked</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-300">{counterparty}</td>
                            <td className="py-3.5 px-4 w-32">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      proj.progress === 100 ? 'bg-emerald-500' : 'bg-[#2563EB]'
                                    }`}
                                    style={{ width: `${proj.progress}%` }}
                                  />
                                </div>
                                <span className="text-[11px] font-mono text-slate-400">
                                  {proj.progress}%
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-300 max-w-[180px] truncate">
                              {proj.currentDeliverable || 'No milestones yet'}
                            </td>
                            <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                              {formatShortDate(proj.targetDate)}
                            </td>
                            <td className="py-3.5 px-5 text-right">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusColor}`}
                              >
                                {statusText}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Autonomous Verification Agents Section */}
            <div className="bg-[#0B1220] border border-[#1E293B] rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                    Autonomous Verification Agents
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-mono px-2.5 py-1 rounded border ${
                      isGuest
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        : telemetry?.integrations?.ai?.liveMode
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : 'bg-[#111C30] text-slate-400 border-[#26344B]'
                    }`}
                  >
                    {isGuest
                      ? 'Demo Simulation'
                      : telemetry?.integrations?.ai?.liveMode
                        ? `Gemini Live (${telemetry?.integrations?.ai?.provider})`
                        : 'Fallback Provider Active'}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate('/agents')}
                    className="text-[11px] font-medium text-blue-400 hover:text-blue-300 cursor-pointer"
                  >
                    Open Console →
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                AI agents inspect submitted code evidence against milestone acceptance criteria. Human client sign-off is required prior to invoicing and payout movement.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {aiAgentsList.map((agent, index) => {
                  const statusStyle =
                    agent.status === 'COMPLETED'
                      ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
                      : agent.status === 'FAILED'
                        ? 'text-rose-300 bg-rose-500/10 border-rose-500/30'
                        : agent.status === 'UNAVAILABLE'
                          ? 'text-amber-300 bg-amber-500/10 border-amber-500/30'
                          : 'text-slate-400 bg-slate-800/80 border-slate-700';

                  const accentColors = [
                    'text-blue-400',
                    'text-purple-400',
                    'text-amber-400',
                    'text-emerald-400',
                  ];

                  return (
                    <div
                      key={agent.agentType}
                      onClick={() => navigate('/agents')}
                      className="bg-[#0F172A] border border-[#1E293B] hover:border-blue-500/40 rounded-xl p-4 flex flex-col justify-between transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-semibold text-slate-400">
                          {agent.code}
                        </span>
                        <span
                          className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded border ${statusStyle}`}
                        >
                          {agent.status}
                        </span>
                      </div>
                      <div className="mt-2.5">
                        <h4
                          className={`text-xs font-bold text-white transition-colors ${accentColors[index % accentColors.length]}`}
                        >
                          {agent.label}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                          {agent.summary ||
                            (agent.status === 'IDLE'
                              ? 'Idle — awaits milestone verification run.'
                              : 'Ready')}
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-[#1E293B] flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 font-mono">
                          {agent.lastRunAt ? formatRelativeTime(agent.lastRunAt) : 'Not run yet'}
                        </span>
                        <span className="text-slate-300 font-mono">
                          {agent.confidenceScore !== null && agent.confidenceScore !== undefined
                            ? `${agent.confidenceScore}% conf`
                            : `${agent.totalRuns} runs`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column (lg:col-span-4) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Financial Telemetry Card */}
            <div className="bg-[#0B1220] border border-[#1E293B] rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <LineChart className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                    Financial Telemetry
                  </h3>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                    isGuest
                      ? 'text-amber-300 bg-amber-500/10 border-amber-500/25'
                      : telemetry?.integrations?.paypal?.configured
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                        : 'text-slate-400 bg-slate-800/80 border-slate-700'
                  }`}
                >
                  {isGuest
                    ? 'DEMO MODE'
                    : telemetry?.integrations?.paypal?.configured
                      ? telemetry.integrations.paypal.mode === 'sandbox'
                        ? 'PAYPAL SANDBOX'
                        : 'PAYPAL LIVE'
                      : 'PAYPAL UNCONFIGURED'}
                </span>
              </div>

              {/* Date Range Selector */}
              <div className="flex items-center gap-1 bg-[#080D18] p-1 rounded-lg border border-[#1E293B]">
                {RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedRange(opt.value)}
                    className={`flex-1 py-1 rounded-md text-[10px] font-semibold transition-colors cursor-pointer ${
                      selectedRange === opt.value
                        ? 'bg-[#1E293B] text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                    <span>{isClient ? 'Settled Payments' : 'Completed Payouts'}</span>
                  </div>
                  <div className="text-lg font-bold text-white mt-1 tabular-nums">
                    {formatMoney(isClient ? clientPaidAmount : devReceivedPayouts, currency)}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                    <span>{isClient ? 'Pending Invoices' : 'Pending Earnings'}</span>
                  </div>
                  <div className="text-lg font-bold text-white mt-1 tabular-nums">
                    {formatMoney(isClient ? clientPendingAmount : devPendingEarnings, currency)}
                  </div>
                </div>
              </div>

              {!isClient && devHeldPayouts > 0 && (
                <div className="rounded-lg bg-[#0F172A] border border-[#1E293B] px-3 py-2 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Platform-Held Client Payments</span>
                  <span className="font-mono font-semibold text-sky-300">
                    {formatMoney(devHeldPayouts, currency)}
                  </span>
                </div>
              )}

              {/* Real Dynamic Financial Chart or Honest Empty State */}
              {isGuest ? (
                <div className="relative h-32 w-full pt-2">
                  <svg viewBox="0 0 300 90" className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="demoRevGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 0,80 C 60,70 100,40 160,35 C 220,30 250,75 300,20 L 300,90 L 0,90 Z"
                      fill="url(#demoRevGrad)"
                    />
                    <path
                      d="M 0,80 C 60,70 100,40 160,35 C 220,30 250,75 300,20"
                      fill="none"
                      stroke="#3B82F6"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 0,85 C 70,82 140,65 210,50 C 250,42 280,45 300,25"
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth="2"
                      strokeDasharray="4,4"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 px-1">
                    <span>Demo Period</span>
                    <span>Simulated Curve</span>
                  </div>
                </div>
              ) : chartPlot && chartPlot.points.length > 0 ? (
                <div className="relative w-full pt-2">
                  <svg viewBox="0 0 300 90" className="w-full h-28 overflow-visible">
                    <line x1="0" y1="85" x2="300" y2="85" stroke="#1E293B" strokeWidth="1" />
                    <polyline
                      fill="none"
                      stroke="#3B82F6"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={chartPlot.primaryLine}
                    />
                    <polyline
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth="2"
                      strokeDasharray="4,4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={chartPlot.secondaryLine}
                    />
                  </svg>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 px-1">
                    <span>{chartPlot.points[0]?.label}</span>
                    {chartPlot.points.length > 1 && (
                      <span>{chartPlot.points[chartPlot.points.length - 1]?.label}</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-28 rounded-lg border border-dashed border-[#1E293B] bg-[#080D18]/60 flex flex-col items-center justify-center text-center px-4">
                  <span className="text-[11px] font-medium text-slate-400">
                    No financial transactions in this window
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5">
                    Real chart data appears after approved milestones or settled payments.
                  </span>
                </div>
              )}
            </div>

            {/* Repository & Verification Feed */}
            <div className="bg-[#0B1220] border border-[#1E293B] rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                    Repository &amp; Verification Feed
                  </h3>
                </div>
                {isGuest ? (
                  <span className="text-[10px] text-amber-300 font-medium">Demo Feed</span>
                ) : linkedRepoProject ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {linkedRepoProject.githubSyncStatus === 'SYNCED' && linkedRepoProject.githubSyncedAt
                        ? `Synced ${formatRelativeTime(linkedRepoProject.githubSyncedAt)}`
                        : linkedRepoProject.githubSyncStatus}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleSyncProject(linkedRepoProject.id, e)}
                      disabled={syncingRepoId === linkedRepoProject.id}
                      className="p-1 rounded hover:bg-[#1E293B] text-slate-400 hover:text-white cursor-pointer"
                      title="Sync repository now"
                    >
                      <RefreshCw
                        className={`w-3 h-3 ${
                          syncingRepoId === linkedRepoProject.id ? 'animate-spin' : ''
                        }`}
                      />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      isDeveloper && !githubConnected
                        ? setManualConnectModalOpen(true)
                        : navigate('/integrations')
                    }
                    className="text-[10px] text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Link2 className="w-3 h-3" />
                    {githubConnected ? 'Link Repo' : 'Not Connected'}
                  </button>
                )}
              </div>

              {isGuest ? (
                <div className="space-y-4 pt-1">
                  <div className="flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-200 font-medium">
                        Demo verification &amp; webhook stream active
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Guest Demo Mode • Sample milestones
                      </p>
                    </div>
                  </div>
                </div>
              ) : (telemetry?.recentActivity || []).length === 0 ? (
                <div className="py-5 text-center space-y-2.5 border border-dashed border-[#1E293B] rounded-lg bg-[#080D18]/50 px-3">
                  <GitBranch className="w-5 h-5 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">
                    No repository sync or verification events recorded yet.
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    {isDeveloper && !githubConnected && (
                      <button
                        type="button"
                        onClick={() => setManualConnectModalOpen(true)}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold cursor-pointer"
                      >
                        Connect GitHub
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate('/integrations')}
                      className="px-3 py-1.5 rounded-lg bg-[#111C30] hover:bg-[#1E293B] border border-[#26344B] text-slate-300 text-[11px] font-medium cursor-pointer"
                    >
                      Manage Integrations
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5 pt-1">
                  {(telemetry?.recentActivity || [])
                    .filter((item) => {
                      const q = searchQuery.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        (item.projectTitle || '').toLowerCase().includes(q) ||
                        item.action.toLowerCase().includes(q)
                      );
                    })
                    .slice(0, 6)
                    .map((item) => (
                      <div key={item.id} className="flex items-start gap-3">
                        <span className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-slate-200 font-medium truncate">
                            {formatActivityLabel(item.action, item.details || {})}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                            {formatRelativeTime(item.createdAt)} •{' '}
                            {item.projectTitle || item.actorName}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
        </main>
      </div>

      {/* Create Project Modal */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1220] border border-[#1E293B] rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Create New Project
              </h3>
              <button
                onClick={() => setIsNewProjectModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
              {projectFormError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300">
                  {projectFormError}
                </div>
              )}
              <div>
                <label className="block text-slate-400 font-medium mb-1">Project Title *</label>
                <input
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Payment Microservice v2"
                  className="w-full px-3 py-2 bg-[#111C30] border border-[#26344B] rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Client / Organization (optional)
                </label>
                <input
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Client or organization name"
                  className="w-full px-3 py-2 bg-[#111C30] border border-[#26344B] rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    GitHub Repository (optional)
                  </label>
                  <input
                    value={newRepo}
                    onChange={(e) => setNewRepo(e.target.value)}
                    placeholder="owner/repository"
                    className="w-full px-3 py-2 bg-[#111C30] border border-[#26344B] rounded-lg text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Budget (USD)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newBudget}
                    onChange={(e) => setNewBudget(e.target.value)}
                    placeholder="5000"
                    className="w-full px-3 py-2 bg-[#111C30] border border-[#26344B] rounded-lg text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Developer GitHub Onboarding Modal */}
      <GitHubConnectModal
        open={manualConnectModalOpen || shouldShowGitHubOnboarding}
        oauthConfigured={telemetry?.integrations?.github?.oauthConfigured ?? true}
        appInstalled={Boolean(telemetry?.integrations?.github?.appInstalled)}
        onSkip={() => {
          setManualConnectModalOpen(false);
          dismissGitHubOnboardingForSession();
        }}
        returnPath="/dashboard"
      />

      <GuestGuardModal
        isOpen={isGuestGuardOpen}
        onClose={() => setIsGuestGuardOpen(false)}
        actionTitle="Create Project or Modify Workspace"
      />
    </div>
  );
};
