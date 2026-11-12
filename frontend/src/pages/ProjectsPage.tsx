import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import { devFlowApi } from '@/services/api';
import { Project, Milestone, DashboardActivityItem, GitHubRepositorySummary, ProjectGitHubActivity } from '@/types';
import { GuestGuardModal } from '@/components/common';
import {
  FolderGit2,
  Bell,
  Search,
  Plus,
  X,
  Check,
  Grid,
  List,
  ArrowRight,
  Menu,
  RefreshCw,
  Link2,
  AlertCircle,
} from 'lucide-react';

// Custom PayPal Logo Mark
const PayPalIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path
      d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.789.789 0 0 1 .777-.66h7.026c2.81 0 4.887.675 5.86 1.905.922 1.168.995 2.802.215 4.86-.022.057-.046.113-.07.168-.783 2.113-2.22 3.613-4.27 4.457-.866.357-1.892.538-3.05.538H9.362a.788.788 0 0 0-.777.66l-.992 5.093a.64.64 0 0 1-.517.596z"
      fill="#0079C1"
    />
    <path
      d="M8.585 14.989l1.107-7.009a.788.788 0 0 1 .778-.66h5.36c2.518 0 4.385.64 5.258 1.808.825 1.106.89 2.656.192 4.607-.749 2.022-2.124 3.456-4.086 4.263-.83.342-1.81.515-2.918.515h-1.92a.788.788 0 0 0-.777.66l-.758 4.793a.64.64 0 0 1-.633.541H6.71a.641.641 0 0 1-.633-.74l2.508-8.778z"
      fill="#00457C"
    />
  </svg>
);

// Custom GitHub Octocat Logo Mark
const GitHubIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

// Extended Project Item for UI showcase matching reference image
interface DisplayProject extends Project {
  currentMilestoneTitle?: string;
  deadline?: string;
  progressPercent?: number;
  paidAmount?: number;
  paymentStatus?: 'Active' | 'Review' | 'Paid';
  connectedRepoName?: string;
}

// Reference demonstration projects from the specification image
const REFERENCE_PROJECTS: DisplayProject[] = [
  {
    id: 'proj_nebula_01',
    name: 'Nebula API Gateway',
    clientName: 'Aether Labs',
    clientEmail: 'team@aetherlabs.io',
    description: 'High-throughput API gateway with automated rate limiting.',
    githubRepo: 'aether-labs/nebula-gateway',
    totalBudget: 18000,
    currency: 'USD',
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-11-05T12:00:00Z',
    milestonesCount: 6,
    completedMilestonesCount: 4,
    currentMilestoneTitle: 'Milestone 3 - Auth Integration',
    deadline: 'Dec 12, 2026',
    progressPercent: 68,
    paidAmount: 12400,
    paymentStatus: 'Active',
    connectedRepoName: 'nebula-gateway',
  },
  {
    id: 'proj_defi_02',
    name: 'DeFi Staking Hub',
    clientName: 'Solas Finance',
    clientEmail: 'billing@solasfinance.org',
    description: 'Smart contract development and frontend staking dashboard.',
    githubRepo: 'solas-finance/staking-hub',
    totalBudget: 32000,
    currency: 'USD',
    createdAt: '2026-09-15T08:00:00Z',
    updatedAt: '2026-11-04T16:30:00Z',
    milestonesCount: 5,
    completedMilestonesCount: 5,
    currentMilestoneTitle: 'Milestone 5 - Audit & Launch',
    deadline: 'Nov 28, 2026',
    progressPercent: 85,
    paidAmount: 32000,
    paymentStatus: 'Review',
    connectedRepoName: 'staking-hub',
  },
  {
    id: 'proj_pulse_03',
    name: 'Pulse Analytics Dashboard',
    clientName: 'Vortex Tech',
    clientEmail: 'devs@vortextech.co',
    description: 'Real-time telemetry and user behaviour tracking interface.',
    githubRepo: 'vortex-tech/pulse-analytics',
    totalBudget: 24000,
    currency: 'USD',
    createdAt: '2026-10-20T11:00:00Z',
    updatedAt: '2026-11-06T09:15:00Z',
    milestonesCount: 8,
    completedMilestonesCount: 2,
    currentMilestoneTitle: 'Milestone 2 - Data pipeline',
    deadline: 'Jan 15, 2027',
    progressPercent: 32,
    paidAmount: 5000,
    paymentStatus: 'Active',
    connectedRepoName: 'pulse-analytics',
  },
];

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { openMobileSidebar } = useSidebar();
  const { isGuest, isClient } = useAuth();
  const [projects, setProjects] = useState<DisplayProject[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGuestGuardOpen, setIsGuestGuardOpen] = useState(false);

  // Layout View Mode (Grid vs List)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<string>('deadline_asc');

  // Slide-over detail drawer
  const [selectedProject, setSelectedProject] = useState<DisplayProject | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Real Telemetry / GitHub State
  const [recentActivity, setRecentActivity] = useState<DashboardActivityItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [availableRepos, setAvailableRepos] = useState<GitHubRepositorySummary[]>([]);
  const [projectActivity, setProjectActivity] = useState<ProjectGitHubActivity | null>(null);
  const [drawerRepoInput, setDrawerRepoInput] = useState('');
  const [syncingProjectId, setSyncingProjectId] = useState<string | null>(null);
  const [drawerMessage, setDrawerMessage] = useState<string | null>(null);

  // New Project Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [totalBudget, setTotalBudget] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    loadProjectsData();
  }, [isGuest]);

  const loadProjectsData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [pRes, mRes, telRes, reposRes] = await Promise.all([
        devFlowApi.getProjects(),
        devFlowApi.getMilestones(),
        devFlowApi.getTelemetry('30d').catch(() => ({ data: { recentActivity: [] as DashboardActivityItem[] }, isMock: false })),
        !isGuest
          ? devFlowApi.getGitHubRepositories({ perPage: 30 }).catch(() => ({ data: [] as GitHubRepositorySummary[], hasMore: false }))
          : Promise.resolve({ data: [] as GitHubRepositorySummary[], hasMore: false }),
      ]);

      setMilestones(mRes.data);
      setAvailableRepos(reposRes.data || []);

      // Map API projects into display projects using verified backend records
      const apiProjectsMapped: DisplayProject[] = pRes.data.map((p) => {
        const projMilestones = mRes.data.filter((m) => m.projectId === p.id);
        const paidMilestones = projMilestones.filter((m) => m.status === 'paid');
        const completedCount = paidMilestones.length;
        const totalCount = projMilestones.length > 0 ? projMilestones.length : (p.milestonesCount || 0);
        const calcPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        const nextMilestone = projMilestones.find((m) => m.status !== 'paid') || projMilestones[0];
        const dueDateFormatted = nextMilestone?.dueDate
          ? new Date(nextMilestone.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : '—';
        const paidTotal = paidMilestones.reduce((sum, m) => sum + Number(m.amount || 0), 0);
        const inReview = projMilestones.some(
          (m) => m.status === 'evidence_submitted' || m.status === 'ai_analyzing' || m.status === 'client_review'
        );

        return {
          ...p,
          progressPercent: calcPercent,
          currentMilestoneTitle: nextMilestone?.title || 'No milestones yet',
          deadline: dueDateFormatted,
          paidAmount: paidTotal,
          paymentStatus: inReview ? 'Review' : calcPercent === 100 && totalCount > 0 ? 'Paid' : 'Active',
          connectedRepoName: p.githubRepo ? (p.githubRepo.split('/').pop() || p.githubRepo) : '',
        };
      });

      if (isGuest) {
        const combined = [...apiProjectsMapped];
        REFERENCE_PROJECTS.forEach((ref) => {
          if (!combined.some((item) => item.name.toLowerCase() === ref.name.toLowerCase())) {
            combined.push(ref);
          }
        });
        setProjects(combined);
      } else {
        setProjects(apiProjectsMapped);
      }

      setRecentActivity(telRes.data?.recentActivity || []);
    } catch (err) {
      console.error('Failed to load projects data:', err);
      if (isGuest) {
        setProjects(REFERENCE_PROJECTS);
      } else {
        setProjects([]);
        setLoadError('Failed to load projects from the server.');
      }
    } finally {
      setLoading(false);
    }
  };

  const openProjectDrawer = async (proj: DisplayProject) => {
    setSelectedProject(proj);
    setDrawerRepoInput(proj.githubRepo || '');
    setDrawerMessage(null);
    setProjectActivity(null);
    setIsDrawerOpen(true);

    if (!isGuest && proj.githubRepo) {
      const actRes = await devFlowApi.getProjectGitHubActivity(proj.id);
      if (actRes.data) {
        setProjectActivity(actRes.data);
      }
    }
  };

  const handleLinkRepoInDrawer = async () => {
    if (!selectedProject || !drawerRepoInput.trim() || isGuest) return;
    setSyncingProjectId(selectedProject.id);
    setDrawerMessage(null);
    try {
      const linked = await devFlowApi.connectProjectRepo(selectedProject.id, drawerRepoInput.trim());
      const resolvedFullName = linked.repository?.fullName || drawerRepoInput.trim();
      setProjectActivity(linked);
      setDrawerRepoInput(resolvedFullName);
      setSelectedProject((prev) =>
        prev
          ? {
              ...prev,
              githubRepo: resolvedFullName,
              connectedRepoName: resolvedFullName.split('/').pop() || resolvedFullName,
              githubSyncStatus: linked.syncStatus,
              githubSyncedAt: linked.lastSyncedAt,
            }
          : prev
      );
      setProjects((prev) =>
        prev.map((item) =>
          item.id === selectedProject.id
            ? {
                ...item,
                githubRepo: resolvedFullName,
                connectedRepoName: resolvedFullName.split('/').pop() || resolvedFullName,
                githubSyncStatus: linked.syncStatus,
                githubSyncedAt: linked.lastSyncedAt,
              }
            : item
        )
      );
      setDrawerMessage(`Repository ${resolvedFullName} linked and synced.`);
    } catch (err) {
      setDrawerMessage(err instanceof Error ? err.message : 'Failed to connect repository');
    } finally {
      setSyncingProjectId(null);
    }
  };

  const handleSyncProjectRepo = async (projectId: string) => {
    if (isGuest) return;
    setSyncingProjectId(projectId);
    setDrawerMessage(null);
    try {
      const synced = await devFlowApi.syncProjectRepo(projectId, true);
      const syncedName = synced.repository?.fullName || synced.projectTitle;
      setProjectActivity(synced);
      setProjects((prev) =>
        prev.map((item) =>
          item.id === projectId
            ? {
                ...item,
                githubSyncStatus: synced.syncStatus,
                githubSyncedAt: synced.lastSyncedAt,
              }
            : item
        )
      );
      if (selectedProject?.id === projectId) {
        setSelectedProject((prev) =>
          prev ? { ...prev, githubSyncStatus: synced.syncStatus, githubSyncedAt: synced.lastSyncedAt } : prev
        );
      }
      setDrawerMessage(`Synced ${syncedName} (${synced.commits.length} commits fetched).`);
    } catch (err) {
      setDrawerMessage(err instanceof Error ? err.message : 'Repository sync failed');
    } finally {
      setSyncingProjectId(null);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !clientName.trim()) return;

    const budgetNum = parseFloat(totalBudget);
    if (!Number.isFinite(budgetNum) || budgetNum <= 0) {
      setCreateError('Please enter a valid positive project budget.');
      return;
    }

    setCreateError(null);
    setIsSubmitting(true);
    try {
      const res = await devFlowApi.createProject({
        name: projectName.trim(),
        description: projectDesc.trim() || `Client deliverable scope for ${clientName.trim()}`,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        githubRepo: githubRepo.trim(),
        totalBudget: budgetNum,
        currency: 'USD',
      });

      const newDisplay: DisplayProject = {
        ...res.data,
        progressPercent: 0,
        currentMilestoneTitle: 'No milestones yet',
        deadline: '—',
        paidAmount: 0,
        paymentStatus: 'Active',
        connectedRepoName: res.data.githubRepo ? (res.data.githubRepo.split('/').pop() || res.data.githubRepo) : '',
      };

      setProjects([newDisplay, ...projects]);
      setIsCreateModalOpen(false);
      setProjectName('');
      setClientName('');
      setClientEmail('');
      setGithubRepo('');
      setTotalBudget('');
      setProjectDesc('');
    } catch (err) {
      console.error('Failed to create project:', err);
      setCreateError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Distinct clients list for filter
  const clientOptions = useMemo(() => {
    const set = new Set(projects.map((p) => p.clientName));
    return Array.from(set);
  }, [projects]);

  // Filtering & Sorting Logic
  const filteredAndSortedProjects = useMemo(() => {
    let list = projects.filter((p) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        p.name.toLowerCase().includes(query) ||
        p.clientName.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.githubRepo.toLowerCase().includes(query);

      const matchesClient = clientFilter === 'all' || p.clientName === clientFilter;

      let matchesStatus = true;
      if (statusFilter === 'active') {
        matchesStatus = (p.progressPercent || 0) < 100;
      } else if (statusFilter === 'completed') {
        matchesStatus = (p.progressPercent || 0) >= 100 || p.paymentStatus === 'Paid';
      } else if (statusFilter === 'on_hold') {
        matchesStatus = p.paymentStatus === 'Review';
      }

      return matchesSearch && matchesClient && matchesStatus;
    });

    // Sorting
    list = [...list].sort((a, b) => {
      if (sortOrder === 'deadline_asc') {
        return (a.deadline || '').localeCompare(b.deadline || '');
      } else if (sortOrder === 'budget_desc') {
        return b.totalBudget - a.totalBudget;
      } else if (sortOrder === 'name_asc') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    return list;
  }, [projects, searchQuery, clientFilter, statusFilter, sortOrder]);

  const activeCount = projects.filter((p) => (p.progressPercent || 0) < 100).length;
  const completedCount = projects.filter((p) => (p.progressPercent || 0) >= 100).length;
  const onHoldCount = projects.filter((p) => p.paymentStatus === 'Review').length;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#080D18] text-white">
        <div className="flex items-center gap-2.5 text-xs text-slate-400 font-mono">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] animate-ping" />
          <span>Loading DevFlow Projects...</span>
        </div>
      </div>
    );
  }

  return (

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#080D18]">
        {/* SCROLLABLE PROJECTS BODY */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-7 py-5 space-y-6 max-w-[1600px] w-full mx-auto">
          {/* 1. PAGE HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <button
                  onClick={openMobileSidebar}
                  className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-[#101A2D]"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <h1 className="font-heading text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  {isClient ? 'My Projects' : 'Projects'}
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-400">
                {isClient
                  ? 'Manage and monitor your contracted projects, milestone deliverables and assigned developers.'
                  : 'Manage your assigned development projects, repository connections and milestone progress.'}
              </p>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
              <button
                onClick={() => {
                  if (isGuest) {
                    setIsGuestGuardOpen(true);
                    return;
                  }
                  setIsCreateModalOpen(true);
                }}
                className="bg-[#2563EB] hover:bg-blue-600 text-white font-semibold text-xs sm:text-sm px-4 py-2 rounded-xl shadow-md shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>New Project</span>
              </button>

              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="p-2.5 text-slate-400 hover:text-white rounded-xl bg-[#111C30] border border-[#26344B] hover:border-slate-500 transition-colors relative"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-[#111C30]" />
                </button>

                {/* Notifications Popover */}
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-[#111C30] border border-[#26344B] rounded-2xl shadow-2xl p-4 z-50 text-xs space-y-3">
                    <div className="font-bold text-white flex justify-between items-center pb-2.5 border-b border-[#26344B]">
                      <span className="text-sm">Project Alerts</span>
                      <span className="text-xs text-blue-400 cursor-pointer hover:underline" onClick={() => setNotificationsOpen(false)}>
                        Close
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      <div className="p-3 rounded-xl bg-[#080D18] border border-[#26344B]">
                        <div className="font-semibold text-white text-xs sm:text-sm">Payment Gateway Integration</div>
                        <div className="text-xs text-slate-400 mt-0.5">Milestone 3 passed AI AST analysis (94.2%)</div>
                      </div>
                      <div className="p-3 rounded-xl bg-[#080D18] border border-[#26344B]">
                        <div className="font-semibold text-white text-xs sm:text-sm">Analytics Dashboard</div>
                        <div className="text-xs text-slate-400 mt-0.5">Settlement of $4,500.00 confirmed via PayPal Webhook</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => document.getElementById('project-search-input')?.focus()}
                className="p-2.5 text-slate-400 hover:text-white rounded-xl bg-[#111C30] border border-[#26344B] hover:border-slate-500 transition-colors"
                title="Search Focus"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          {loadError && !isGuest && (
            <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/60 flex items-center justify-between text-xs text-rose-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{loadError}</span>
              </div>
              <button
                onClick={loadProjectsData}
                className="px-3 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-900 text-white font-semibold"
              >
                Retry
              </button>
            </div>
          )}

          {/* 2. KPI SUMMARY CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Total Projects */}
            <div className="p-4 rounded-xl bg-[#111C30] border border-[#26344B] flex flex-col justify-between">
              <span className="font-sans text-xs text-slate-400 font-semibold">Total Projects</span>
              <div className="mt-2.5 flex items-baseline justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black font-sans tabular-nums text-white">
                    {String(projects.length).padStart(2, '0')}
                  </span>
                  {isGuest && (
                    <span className="text-xs text-slate-500 font-sans tabular-nums">Demo Set</span>
                  )}
                </div>
                {/* Green Trend Sparkline */}
                <svg className="w-14 h-6 text-emerald-400 shrink-0" viewBox="0 0 50 20" fill="none">
                  <path d="M2 15 Q 12 18, 25 10 T 48 4" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* Card 2: Active Projects */}
            <div className="p-4 rounded-xl bg-[#111C30] border border-[#26344B] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-sans text-xs text-slate-400 font-semibold">Active Projects</span>
                <span className="w-2 h-2 rounded-full bg-blue-500" />
              </div>
              <div className="mt-2.5 flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-black font-sans tabular-nums text-white">
                  {String(activeCount).padStart(2, '0')}
                </span>
                {/* Blue Trend Sparkline */}
                <svg className="w-14 h-6 text-blue-500 shrink-0" viewBox="0 0 50 20" fill="none">
                  <path d="M2 14 Q 15 5, 28 12 T 48 6" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* Card 3: Completed Projects */}
            <div className="p-4 rounded-xl bg-[#111C30] border border-[#26344B] flex flex-col justify-between">
              <div className="flex items-center gap-1.5">
                <span className="font-sans text-xs text-slate-400 font-semibold">Completed Projects</span>
                <Check className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="mt-2.5 flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-black font-sans tabular-nums text-white">
                  {String(completedCount).padStart(2, '0')}
                </span>
                {/* Cyan Trend Sparkline */}
                <svg className="w-14 h-6 text-slate-300 shrink-0" viewBox="0 0 50 20" fill="none">
                  <path d="M2 12 Q 15 16, 28 8 T 48 5" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* Card 4: On Hold */}
            <div className="p-4 rounded-xl bg-[#111C30] border border-[#26344B] flex flex-col justify-between">
              <span className="font-sans text-xs text-slate-400 font-semibold">In Review / Hold</span>
              <div className="mt-2.5 flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-black font-sans tabular-nums text-slate-400">
                  {String(onHoldCount).padStart(2, '0')}
                </span>
                {/* Muted Sparkline */}
                <svg className="w-14 h-6 text-slate-600 shrink-0" viewBox="0 0 50 20" fill="none">
                  <path d="M2 8 Q 15 12, 28 10 T 48 11" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>

          {/* 3. SEARCH AND FILTER TOOLBAR */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3 rounded-xl bg-[#111C30] border border-[#26344B]">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="project-search-input"
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#080D18] text-xs sm:text-sm text-white placeholder-slate-500 pl-10 pr-4 py-2.5 rounded-xl border border-[#26344B] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm">
              {/* Status Dropdown */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#080D18] text-slate-300 border border-[#26344B] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#2563EB]"
              >
                <option value="all">Status: All</option>
                <option value="active">Status: Active</option>
                <option value="completed">Status: Completed</option>
                <option value="on_hold">Status: On Hold</option>
              </select>

              {/* Client Dropdown */}
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="bg-[#080D18] text-slate-300 border border-[#26344B] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#2563EB] max-w-[150px] truncate"
              >
                <option value="all">Client: All</option>
                {clientOptions.map((client) => (
                  <option key={client} value={client}>
                    {client.split('(')[0].trim()}
                  </option>
                ))}
              </select>

              {/* Sort Dropdown */}
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="bg-[#080D18] text-slate-300 border border-[#26344B] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#2563EB]"
              >
                <option value="deadline_asc">Sort by deadline</option>
                <option value="budget_desc">Sort by budget</option>
                <option value="name_asc">Sort by name</option>
              </select>

              {/* Grid / List Toggle */}
              <div className="flex items-center gap-1 bg-[#080D18] p-1.5 rounded-xl border border-[#26344B]">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs sm:text-sm font-semibold transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-[#1B2A47] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Grid view"
                >
                  <Grid className="w-4 h-4" />
                  <span className="hidden sm:inline">Grid</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs sm:text-sm font-semibold transition-colors ${
                    viewMode === 'list'
                      ? 'bg-[#1B2A47] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="List view"
                >
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">List</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4 & 5. MAIN CONTENT AREA (Split with Right Sidebar Panel) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Main Directory Area (lg:col-span-8 or 9) */}
            <div className="lg:col-span-8 xl:col-span-9 space-y-4">
              {filteredAndSortedProjects.length === 0 ? (
                <div className="text-center py-16 px-4 rounded-xl bg-[#111C30] border border-[#26344B] text-slate-400">
                  <FolderGit2 className="w-10 h-10 mx-auto mb-2 opacity-40 text-blue-400" />
                  <h3 className="text-sm font-semibold text-white">
                    {projects.length === 0 ? 'No projects created yet' : 'No projects found'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    {projects.length === 0
                      ? 'Create your first client project and optionally link a GitHub repository to track milestones and payouts.'
                      : 'Try adjusting your search query or status filter.'}
                  </p>
                  {projects.length === 0 && !isGuest && (
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-semibold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create First Project</span>
                    </button>
                  )}
                </div>
              ) : viewMode === 'grid' ? (
                /* GRID VIEW: 3-column responsive layout */
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filteredAndSortedProjects.map((proj) => {
                    const percent = proj.progressPercent ?? 0;
                    const hasRepo = Boolean(proj.githubRepo && proj.githubRepo.trim().length > 0);
                    const repoSynced = hasRepo && proj.githubSyncStatus === 'SYNCED';

                    return (
                      <div
                        key={proj.id}
                        onClick={() => openProjectDrawer(proj)}
                        className="p-5 sm:p-6 rounded-2xl bg-[#111C30] border border-[#26344B] hover:border-blue-500/50 hover:bg-[#132038] transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
                      >
                        {/* HEADER */}
                        <div className="space-y-1.5">
                          <h3 className="font-heading text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                            {proj.name}
                          </h3>
                          <div className="font-sans text-xs sm:text-sm text-slate-400 font-medium">
                            {proj.clientName}
                          </div>
                          <p className="font-sans text-xs sm:text-sm text-slate-400 line-clamp-2 pt-1 leading-relaxed">
                            {proj.description}
                          </p>
                        </div>

                        {/* PROGRESS */}
                        <div className="space-y-2 pt-1">
                          <div className="flex justify-between items-center text-xs sm:text-sm font-sans tabular-nums">
                            <span className="text-slate-400">Progress</span>
                            <span className="text-white font-bold">{percent}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-[#1A263D] overflow-hidden">
                            <div
                              className="h-full bg-[#2563EB] rounded-full transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>

                        {/* MILESTONE DETAILS */}
                        <div className="pt-2.5 border-t border-[#26344B]/70 space-y-1.5 text-xs sm:text-[13px] font-sans">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Milestones:</span>
                            <span className="font-sans tabular-nums text-white font-semibold">
                              {proj.completedMilestonesCount || 0}/{proj.milestonesCount || 0}
                            </span>
                          </div>
                          <div className="text-slate-300 truncate">
                            Current: {proj.currentMilestoneTitle || 'No milestones yet'}
                          </div>
                          <div className="text-slate-400 tabular-nums">
                            Deadline: {proj.deadline || '—'}
                          </div>
                        </div>

                        {/* GITHUB SECTION */}
                        <div className="pt-2.5 border-t border-[#26344B]/70 flex items-center justify-between text-xs sm:text-[13px] font-sans">
                          <div className="flex items-center gap-2 text-slate-300">
                            <GitHubIcon className="w-4 h-4" />
                            <span className="truncate max-w-[130px] font-medium font-mono text-xs">
                              {hasRepo ? proj.connectedRepoName || proj.githubRepo : 'Not linked'}
                            </span>
                          </div>
                          {hasRepo ? (
                            <div
                              className={`flex items-center gap-1.5 font-semibold ${
                                repoSynced
                                  ? 'text-emerald-400'
                                  : proj.githubSyncStatus === 'ERROR'
                                    ? 'text-rose-400'
                                    : 'text-amber-400'
                              }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  repoSynced
                                    ? 'bg-emerald-400'
                                    : proj.githubSyncStatus === 'ERROR'
                                      ? 'bg-rose-400'
                                      : 'bg-amber-400'
                                }`}
                              />
                              <span>
                                {repoSynced ? 'Synced' : proj.githubSyncStatus === 'ERROR' ? 'Sync Error' : 'Linked'}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                              <span className="w-2 h-2 rounded-full bg-slate-600" />
                              <span>Unlinked</span>
                            </div>
                          )}
                        </div>

                        {/* PAYMENT SECTION */}
                        <div className="pt-2.5 border-t border-[#26344B]/70 space-y-2">
                          <div className="flex justify-between items-center text-xs sm:text-[13px]">
                            <div className="text-slate-400 flex items-center gap-1.5 font-sans tabular-nums">
                              <span>Payment:</span>
                              <span className="text-white font-bold">
                                ${(proj.paidAmount ?? 0).toLocaleString()} / ${proj.totalBudget.toLocaleString()}
                              </span>
                            </div>
                            {/* Payment Status Badge */}
                            <div className="flex items-center gap-1.5">
                              <PayPalIcon className="w-3.5 h-3.5" />
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                                  proj.paymentStatus === 'Review'
                                    ? 'bg-amber-950/70 text-amber-400 border-amber-800/60'
                                    : 'bg-emerald-950/70 text-emerald-400 border-emerald-800/60'
                                }`}
                              >
                                {proj.paymentStatus || 'Active'}
                              </span>
                            </div>
                          </div>
                          {/* Mini payment progress bar */}
                          <div className="w-full h-1.5 rounded-full bg-[#1A263D] overflow-hidden">
                            <div
                              className="h-full bg-emerald-400 rounded-full"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.round(((proj.paidAmount || 0) / (proj.totalBudget || 1)) * 100)
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* LIST VIEW: Compact Table */
                <div className="p-5 rounded-2xl bg-[#111C30] border border-[#26344B] overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-[#26344B] text-xs text-slate-400 uppercase tracking-wider">
                        <th className="pb-3.5 font-semibold">Project Name</th>
                        <th className="pb-3.5 font-semibold">Client</th>
                        <th className="pb-3.5 font-semibold">Progress</th>
                        <th className="pb-3.5 font-semibold">Milestones</th>
                        <th className="pb-3.5 font-semibold">Repository</th>
                        <th className="pb-3.5 font-semibold">Deadline</th>
                        <th className="pb-3.5 font-semibold text-right">Payment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#26344B]/50">
                      {filteredAndSortedProjects.map((proj) => (
                        <tr
                          key={proj.id}
                          onClick={() => openProjectDrawer(proj)}
                          className="hover:bg-[#15233D] transition-colors cursor-pointer"
                        >
                          <td className="py-4 font-bold text-white">{proj.name}</td>
                          <td className="py-4 text-slate-300">{proj.clientName}</td>
                          <td className="py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-24 bg-[#1A263D] h-2 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#2563EB] rounded-full"
                                  style={{ width: `${proj.progressPercent ?? 0}%` }}
                                />
                              </div>
                              <span className="font-mono text-xs text-slate-300">
                                {proj.progressPercent ?? 0}%
                              </span>
                            </div>
                          </td>
                          <td className="py-4 font-mono text-slate-300">
                            {proj.completedMilestonesCount || 0}/{proj.milestonesCount || 0}
                          </td>
                          <td className="py-4 font-mono text-slate-400 flex items-center gap-2">
                            <GitHubIcon className="w-4 h-4" />
                            <span>{proj.connectedRepoName || 'Not linked'}</span>
                          </td>
                          <td className="py-4 font-mono text-slate-400">{proj.deadline || '—'}</td>
                          <td className="py-4 text-right">
                            <span className="font-mono font-bold text-emerald-400">
                              ${proj.totalBudget.toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right Sidebar Panel (lg:col-span-4 or 3) */}
            <div className="lg:col-span-4 xl:col-span-3 space-y-5">
              {/* 5. RECENT PROJECT ACTIVITY CARD */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#111C30] border border-[#26344B] space-y-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                  Recent Project Activity
                </h3>

                <div className="space-y-4 text-xs sm:text-sm">
                  {recentActivity.length > 0 ? (
                    recentActivity.slice(0, 5).map((item) => (
                      <div key={item.id} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#080D18] border border-[#26344B] flex items-center justify-center shrink-0 text-white mt-0.5">
                          <GitHubIcon className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <div className="font-bold text-white truncate">
                            {item.projectTitle || item.action.replace(/_/g, ' ')}
                          </div>
                          <p className="text-xs text-slate-400 break-words">
                            {item.actorName} &bull; {typeof item.details === 'string' ? item.details : JSON.stringify(item.details)}
                          </p>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {new Date(item.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : isGuest ? (
                    <>
                      {/* Item 1: GitHub Push (Demo) */}
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#080D18] border border-[#26344B] flex items-center justify-center shrink-0 text-white mt-0.5">
                          <GitHubIcon className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5">
                          <div className="font-bold text-white">GitHub push by jdoe</div>
                          <p className="text-xs text-slate-400 font-mono">
                            4 commits to nebula-gateway
                          </p>
                          <span className="text-[11px] text-slate-500 font-mono">10m ago</span>
                        </div>
                      </div>

                      {/* Item 2: Milestone Approved (Demo) */}
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-950/70 border border-emerald-800/50 flex items-center justify-center shrink-0 text-emerald-400 mt-0.5">
                          <Check className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5">
                          <div className="font-bold text-white">Milestone 3</div>
                          <p className="text-xs text-slate-400">
                            Approved by AI Agent &amp; client
                          </p>
                          <span className="text-[11px] text-slate-500 font-mono">1h ago</span>
                        </div>
                      </div>

                      {/* Item 3: Invoice Paid (Demo) */}
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-950/70 border border-blue-800/50 flex items-center justify-center shrink-0 text-blue-400 mt-0.5">
                          <PayPalIcon className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5">
                          <div className="font-bold text-white">Invoice #1042</div>
                          <p className="text-xs text-slate-400 font-mono">
                            Paid ($4,500) via PayPal
                          </p>
                          <span className="text-[11px] text-slate-500 font-mono">3h ago</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-slate-400 py-3">
                      No recorded project activity yet. Activity will appear here as repositories sync, evidence is submitted, or payments settle.
                    </div>
                  )}
                </div>
              </div>

              {/* 6. CREATE PROJECT QUICK ACTION (Dashed Border Card) */}
              <div className="p-6 sm:p-7 rounded-2xl bg-[#080D18] border-2 border-dashed border-[#26344B] text-center space-y-4 hover:border-blue-500/50 transition-colors">
                <div className="w-12 h-12 rounded-xl border border-[#26344B] flex items-center justify-center mx-auto text-blue-400">
                  <Plus className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-white">Create New Project</h4>
                  <p className="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto">
                    Add custom workflow and quick-start button.
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (isGuest) {
                      setIsGuestGuardOpen(true);
                      return;
                    }
                    setIsCreateModalOpen(true);
                  }}
                  className="w-full bg-[#2563EB] hover:bg-blue-600 text-white font-semibold text-xs sm:text-sm py-3 rounded-xl shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add custom workflow</span>
                </button>
              </div>
            </div>
          </div>
        </main>

      {/* PROJECT DETAIL SLIDE-OVER DRAWER */}
      {isDrawerOpen && selectedProject && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#101A2D] border-l border-[#26344B] h-full flex flex-col justify-between shadow-2xl p-7 overflow-y-auto space-y-6">
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#26344B]">
                <div className="flex items-center gap-2">
                  <FolderGit2 className="w-5 h-5 text-blue-400" />
                  <h3 className="text-base font-bold text-white">{selectedProject.name}</h3>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1E2E4E]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status & Contract Stats */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#080D18] border border-[#26344B]">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Total Budget</span>
                  <div className="text-base font-bold font-mono text-emerald-400 mt-1">
                    ${selectedProject.totalBudget.toLocaleString()} {selectedProject.currency}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#080D18] border border-[#26344B]">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Milestones</span>
                  <div className="text-base font-bold font-mono text-white mt-1">
                    {selectedProject.completedMilestonesCount} / {selectedProject.milestonesCount}
                  </div>
                </div>
              </div>

              {/* Client Profile */}
              <div className="p-4 rounded-xl bg-[#080D18] border border-[#26344B] space-y-2 text-xs">
                <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                  Client Information
                </h4>
                <div className="flex justify-between">
                  <span className="text-slate-400">Client Organization:</span>
                  <span className="font-semibold text-white">{selectedProject.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Contact Email:</span>
                  <span className="font-mono text-slate-300">{selectedProject.clientEmail || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Repository:</span>
                  <span className="font-mono text-blue-400">{selectedProject.githubRepo || 'Not linked'}</span>
                </div>
              </div>

              {!isGuest && (
                <div className="p-4 rounded-xl bg-[#080D18] border border-[#26344B] space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                      GitHub Repository Binding &amp; Sync
                    </h4>
                    {selectedProject.githubRepo && (
                      <button
                        type="button"
                        onClick={() => handleSyncProjectRepo(selectedProject.id)}
                        disabled={syncingProjectId === selectedProject.id}
                        className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-semibold cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncingProjectId === selectedProject.id ? 'animate-spin' : ''}`} />
                        <span>Sync Now</span>
                      </button>
                    )}
                  </div>

                  {availableRepos.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={drawerRepoInput}
                        onChange={(e) => setDrawerRepoInput(e.target.value)}
                        className="flex-1 bg-[#111C30] border border-[#26344B] rounded-lg px-2.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Select repository...</option>
                        {availableRepos.map((repo) => (
                          <option key={repo.id} value={repo.fullName}>
                            {repo.fullName} {repo.private ? '(private)' : ''}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleLinkRepoInDrawer}
                        disabled={!drawerRepoInput.trim() || syncingProjectId === selectedProject.id}
                        className="px-3 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        <span>Link</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="owner/repository"
                        value={drawerRepoInput}
                        onChange={(e) => setDrawerRepoInput(e.target.value)}
                        className="flex-1 bg-[#111C30] border border-[#26344B] rounded-lg px-2.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={handleLinkRepoInDrawer}
                        disabled={!drawerRepoInput.trim() || syncingProjectId === selectedProject.id}
                        className="px-3 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white font-semibold cursor-pointer disabled:opacity-50"
                      >
                        Bind
                      </button>
                    </div>
                  )}

                  {drawerMessage && (
                    <div className="text-[11px] text-slate-300 bg-[#111C30] border border-[#26344B] rounded-lg px-2.5 py-1.5">
                      {drawerMessage}
                    </div>
                  )}

                  {projectActivity && projectActivity.commits.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                        Latest Commits ({projectActivity.commits.length})
                      </div>
                      {projectActivity.commits.slice(0, 3).map((commit) => (
                        <div key={commit.sha} className="flex items-center justify-between text-[11px] text-slate-300 font-mono">
                          <span className="truncate max-w-[260px]">{commit.message}</span>
                          <span className="text-slate-500 shrink-0 ml-2">{commit.shortSha}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Project Milestones */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                    Project Milestones
                  </h4>
                  <button
                    onClick={() => navigate('/milestones')}
                    className="text-blue-400 hover:underline"
                  >
                    View All &rarr;
                  </button>
                </div>
                {milestones
                  .filter((m) => m.projectId === selectedProject.id)
                  .map((ms) => (
                    <div
                      key={ms.id}
                      className="p-3 rounded-lg bg-[#080D18] border border-[#26344B] flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-white">{ms.title}</div>
                        <div className="text-[10px] text-slate-500 font-mono">Due {ms.dueDate}</div>
                      </div>
                      <span className="font-mono font-bold text-emerald-400">
                        ${ms.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="pt-4 border-t border-[#26344B] flex items-center justify-between gap-3">
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="w-1/2 py-2.5 text-sm font-semibold text-slate-300 bg-[#080D18] border border-[#26344B] rounded-xl hover:text-white"
              >
                Close Drawer
              </button>
              <button
                onClick={() => navigate('/milestones')}
                className="w-1/2 py-2.5 text-sm font-semibold text-white bg-[#2563EB] hover:bg-blue-600 rounded-xl flex items-center justify-center gap-2"
              >
                <span>Milestones</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW PROJECT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#111C30] border border-[#26344B] rounded-2xl w-full max-w-lg p-7 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#26344B]">
              <h3 className="text-lg font-bold text-white">Create New Project</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4 text-sm">
              {createError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 text-xs text-rose-200">
                  {createError}
                </div>
              )}
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nebula API Gateway"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full bg-[#080D18] border border-[#26344B] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Client Name / Org *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aether Labs"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-[#080D18] border border-[#26344B] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Client Invoicing Email</label>
                <input
                  type="email"
                  placeholder="billing@aetherlabs.io"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full bg-[#080D18] border border-[#26344B] rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">GitHub Repository (owner/repo, optional)</label>
                {availableRepos.length > 0 ? (
                  <select
                    value={githubRepo}
                    onChange={(e) => setGithubRepo(e.target.value)}
                    className="w-full bg-[#080D18] border border-[#26344B] rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-[#2563EB]"
                  >
                    <option value="">Link later</option>
                    {availableRepos.map((repo) => (
                      <option key={repo.id} value={repo.fullName}>
                        {repo.fullName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="owner/repository (optional)"
                    value={githubRepo}
                    onChange={(e) => setGithubRepo(e.target.value)}
                    className="w-full bg-[#080D18] border border-[#26344B] rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-[#2563EB]"
                  />
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Total Deliverable Budget (USD) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  placeholder="e.g. 5000"
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(e.target.value)}
                  className="w-full bg-[#080D18] border border-[#26344B] rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Project Description</label>
                <textarea
                  rows={2}
                  placeholder="High-throughput API gateway with automated rate limiting..."
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  className="w-full bg-[#080D18] border border-[#26344B] rounded-xl p-3 text-white text-sm focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#26344B]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-[#080D18] border border-[#26344B] text-slate-300 hover:text-white text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white font-semibold text-sm shadow-md shadow-blue-600/30 transition-all cursor-pointer"
                >
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Guest Mode Restriction Guard Modal */}
      <GuestGuardModal
        isOpen={isGuestGuardOpen}
        onClose={() => setIsGuestGuardOpen(false)}
        actionTitle="Create Project"
        message="Guest Mode: Please sign in or create an account to use this feature."
      />
    </div>
  );
};
