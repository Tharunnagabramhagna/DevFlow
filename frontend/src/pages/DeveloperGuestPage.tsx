import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { DevFlowLogo, ThemeToggle, AmbientBackground, GuestGuardModal, Button } from '@/components/common';
import { devFlowApi } from '@/services/api';
import { Project, Milestone } from '@/types';
import { DEMO_CONFIG } from '@/services/mockData';
import {
  ArrowLeft,
  Search,
  RefreshCw,
  Clock,
  DollarSign,
  CheckCircle2,
  Circle,
  Layers,
  LogIn,
  UserPlus,
  Eye,
  ArrowUpDown,
  GitBranch,
  Calendar,
  Code2,
  Cpu,
  Shield,
  FileCode,
  Mail,
  MapPin,
  User,
  Terminal,
  AlertCircle,
  ServerOff,
  Loader2,
} from 'lucide-react';

type SortOption = 'recent' | 'budget' | 'milestones';

export const DeveloperGuestPage: React.FC = () => {
  const navigate = useNavigate();

  // Async data state
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBackendOffline, setIsBackendOffline] = useState(false);
  const [lastSuccessfulFetchTime, setLastSuccessfulFetchTime] = useState<string | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('recent');
  const [activeTab, setActiveTab] = useState<'opportunities' | 'milestones' | 'profile'>('opportunities');

  // Guest guard modal state
  const [showGuardModal, setShowGuardModal] = useState(false);
  const [guardAction, setGuardAction] = useState('');

  const handleRestrictedAction = (actionTitle: string) => {
    setGuardAction(actionTitle);
    setShowGuardModal(true);
  };

  // Asynchronous data-fetch operation
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [projRes, mileRes] = await Promise.all([
        devFlowApi.getProjects(),
        devFlowApi.getMilestones(),
      ]);

      setProjects(projRes.data);
      setMilestones(mileRes.data);
      const isMockData = projRes.isMock || mileRes.isMock;
      setIsBackendOffline(isMockData);

      // Last Updated changes only after successful real backend data retrieval
      if (!isMockData) {
        setLastSuccessfulFetchTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch developer data. Backend services may be unavailable.');
      setIsBackendOffline(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let list = [...projects];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.clientName.toLowerCase().includes(q)
      );
    }

    switch (sortOption) {
      case 'budget':
        list.sort((a, b) => b.totalBudget - a.totalBudget);
        break;
      case 'milestones':
        list.sort((a, b) => b.milestonesCount - a.milestonesCount);
        break;
      case 'recent':
      default:
        list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
    }

    return list;
  }, [projects, searchQuery, sortOption]);

  // Combined milestones with project names
  const allMilestones = useMemo(() => {
    return milestones.map((ms) => {
      const project = projects.find((p) => p.id === ms.projectId);
      return { ...ms, projectName: project?.name || 'DevFlow Milestone' };
    });
  }, [milestones, projects]);

  const tabs = [
    { key: 'opportunities' as const, label: 'Project Opportunities', icon: Layers },
    { key: 'milestones' as const, label: 'Milestone Details', icon: CheckCircle2 },
    { key: 'profile' as const, label: 'Developer Profile Preview', icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-[#060B16] text-[#0F172A] dark:text-[#F8FAFC] relative overflow-x-hidden antialiased">
      <AmbientBackground />

      {/* Demo Mode & Backend Connectivity Banner */}
      <div className="sticky top-0 z-50 bg-purple-50/95 dark:bg-purple-950/85 border-b border-purple-200/60 dark:border-purple-700/30 backdrop-blur-md px-4 py-2">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
            <span className="text-[11px] font-semibold text-purple-800 dark:text-purple-300">
              DEVELOPER GUEST MODE — DEMO DATA
            </span>
            {isBackendOffline && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-purple-200/50 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700">
                <ServerOff className="w-3 h-3" />
                Backend Offline (Fallback Active)
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-purple-700 dark:text-purple-400 font-mono">
              {lastSuccessfulFetchTime ? `Last Updated: ${lastSuccessfulFetchTime}` : 'Demo Data Active • Backend Offline'}
            </span>
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-1 rounded-md hover:bg-purple-200/50 dark:hover:bg-purple-800/30 transition-colors disabled:opacity-50"
              title="Refresh data from API"
              aria-label="Refresh data"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-purple-700 dark:text-purple-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Top Navigation */}
      <header className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-5 flex items-center justify-between relative z-10">
        <Link to="/" className="cursor-pointer group select-none flex items-center gap-2">
          <DevFlowLogo variant="horizontal" theme="auto" size="md" />
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => navigate('/guest/developer')}
            className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Guest Options
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-12 relative z-10 space-y-8">
        {/* Page Header */}
        <div className="space-y-1">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Developer Dashboard
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Browse project opportunities, explore milestone workflows, and preview the developer experience.
          </p>
        </div>

        {/* Error Alert State */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <Button size="sm" variant="secondary" onClick={fetchData} className="text-xs py-1 px-3">
              Retry
            </Button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-white/80 dark:bg-[#0F172A]/85 border border-white/80 dark:border-white/10 rounded-xl p-1 backdrop-blur-2xl overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Project Opportunities */}
        {activeTab === 'opportunities' && (
          <div className="space-y-5">
            {/* Search and Sort */}
            <div className="bg-white/80 dark:bg-[#0F172A]/85 border border-white/80 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-glass-elevated dark:shadow-dark-glass-elevated backdrop-blur-2xl">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search projects, technologies..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#080D18] border border-slate-200 dark:border-[#26344B] rounded-lg pl-9 pr-3 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as SortOption)}
                    className="bg-slate-50 dark:bg-[#080D18] border border-slate-200 dark:border-[#26344B] rounded-lg px-2.5 py-1.5 text-[11px] text-slate-700 dark:text-slate-300 focus:outline-none focus:border-purple-500"
                  >
                    <option value="recent">Most Recent</option>
                    <option value="budget">Highest Budget</option>
                    <option value="milestones">Most Milestones</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section heading */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h2 className="font-heading text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Available Projects
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                  {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-700/30 text-[10px] font-semibold text-amber-700 dark:text-amber-400 font-mono">
                <Eye className="w-3 h-3" />
                DEMO DATA
              </span>
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="bg-white/80 dark:bg-[#0F172A]/85 border border-white/80 dark:border-white/10 rounded-2xl p-12 text-center backdrop-blur-2xl">
                <Loader2 className="w-8 h-8 text-purple-600 dark:text-purple-400 animate-spin mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Loading project opportunities...</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Querying DevFlow repository records</p>
              </div>
            ) : filteredProjects.length === 0 ? (
              /* Empty State */
              <div className="bg-white/80 dark:bg-[#0F172A]/85 border border-white/80 dark:border-white/10 rounded-2xl p-8 text-center backdrop-blur-2xl">
                <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No project opportunities match</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Try adjusting your search criteria.
                </p>
              </div>
            ) : (
              /* Project Grid */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredProjects.map((project) => {
                  const progressPct =
                    project.milestonesCount > 0
                      ? Math.round((project.completedMilestonesCount / project.milestonesCount) * 100)
                      : 0;
                  const remainingBudget =
                    project.totalBudget * (1 - project.completedMilestonesCount / (project.milestonesCount || 1));

                  return (
                    <div
                      key={project.id}
                      className="bg-white/80 dark:bg-[#0F172A]/85 border border-white/80 dark:border-white/10 rounded-2xl p-5 shadow-glass-elevated dark:shadow-dark-glass-elevated backdrop-blur-2xl hover:border-purple-500/30 transition-all group"
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1 min-w-0">
                            <h3 className="font-heading text-base font-bold text-slate-900 dark:text-white group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors truncate">
                              {project.name}
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                              {project.description}
                            </p>
                          </div>
                        </div>

                        {/* Meta info */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <Code2 className="w-3 h-3" />
                            {project.clientName}
                          </span>
                          <span className="flex items-center gap-1 font-tabular">
                            <DollarSign className="w-3 h-3" />
                            ${project.totalBudget.toLocaleString()} total
                          </span>
                          <span className="flex items-center gap-1">
                            <GitBranch className="w-3 h-3" />
                            {project.githubRepo.split('/').pop()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(project.updatedAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-600 dark:text-slate-400">
                              {project.completedMilestonesCount}/{project.milestonesCount} milestones completed
                            </span>
                            <span className="font-semibold font-tabular text-purple-700 dark:text-purple-300">
                              ~${Math.round(remainingBudget).toLocaleString()} remaining
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-600 to-sky-500 rounded-full transition-all duration-500"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>

                        {/* Action */}
                        <button
                          onClick={() => handleRestrictedAction('Apply to work on this project')}
                          className="w-full py-2 px-3 rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-300 text-[11px] font-semibold hover:bg-purple-500/20 transition-colors"
                        >
                          Apply to Project
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: Milestone Details */}
        {activeTab === 'milestones' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h2 className="font-heading text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Milestone Information
                </h2>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-700/30 text-[10px] font-semibold text-amber-700 dark:text-amber-400 font-mono">
                <Eye className="w-3 h-3" />
                DEMO DATA
              </span>
            </div>

            {loading ? (
              <div className="bg-white/80 dark:bg-[#0F172A]/85 border border-white/80 dark:border-white/10 rounded-2xl p-12 text-center backdrop-blur-2xl">
                <Loader2 className="w-8 h-8 text-purple-600 dark:text-purple-400 animate-spin mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Loading milestones...</p>
              </div>
            ) : allMilestones.length === 0 ? (
              <div className="bg-white/80 dark:bg-[#0F172A]/85 border border-white/80 dark:border-white/10 rounded-2xl p-8 text-center backdrop-blur-2xl">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No milestones available.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {allMilestones.map((ms) => (
                  <div
                    key={ms.id}
                    className="bg-white/80 dark:bg-[#0F172A]/85 border border-white/80 dark:border-white/10 rounded-2xl p-5 shadow-glass-elevated dark:shadow-dark-glass-elevated backdrop-blur-2xl"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            {ms.status === 'paid' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                            )}
                            <h3 className="font-heading text-sm font-bold text-slate-900 dark:text-white">
                              {ms.title}
                            </h3>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-6">
                            {ms.description}
                          </p>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                            ms.status === 'paid'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                              : ms.status === 'ai_verified'
                              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40'
                              : 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10'
                          }`}
                        >
                          {ms.status.charAt(0).toUpperCase() + ms.status.slice(1).replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 pl-6">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          {ms.projectName}
                        </span>
                        <span className="flex items-center gap-1 font-tabular">
                          <DollarSign className="w-3 h-3" />
                          ${ms.amount.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Due: {new Date(ms.dueDate).toLocaleDateString()}
                        </span>
                        {ms.commitsCount > 0 && (
                          <span className="flex items-center gap-1">
                            <GitBranch className="w-3 h-3" />
                            {ms.commitsCount} commits
                          </span>
                        )}
                      </div>

                      {/* Requirements */}
                      {ms.requirements && ms.requirements.length > 0 && (
                        <div className="pl-6 space-y-1.5 pt-1">
                          <p className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-500 tracking-wider">
                            Requirements
                          </p>
                          {ms.requirements.map((req) => (
                            <div key={req.id} className="flex items-center gap-2 text-[11px]">
                              {req.satisfied ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                              ) : (
                                <Circle className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />
                              )}
                              <span className="text-slate-700 dark:text-slate-300">{req.title}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* AI Report summary */}
                      {ms.aiReport && (
                        <div className="pl-6 flex items-center gap-2 p-2.5 rounded-lg bg-purple-50/80 dark:bg-purple-950/20 border border-purple-200/40 dark:border-purple-700/20">
                          <Cpu className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                          <span className="text-[11px] text-purple-700 dark:text-purple-300">
                            AI Confidence: <span className="font-semibold font-tabular">{ms.aiReport.confidenceScore}%</span>
                            {' • '}
                            {ms.aiReport.automatedChecks.passed}/{ms.aiReport.automatedChecks.total} checks passed
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Developer Profile Preview */}
        {activeTab === 'profile' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h2 className="font-heading text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Your Developer Profile Preview
                </h2>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-700/30 text-[10px] font-semibold text-amber-700 dark:text-amber-400 font-mono">
                <Eye className="w-3 h-3" />
                PREVIEW
              </span>
            </div>

            <div className="bg-white/80 dark:bg-[#0F172A]/85 border border-white/80 dark:border-white/10 rounded-2xl p-6 shadow-glass-elevated dark:shadow-dark-glass-elevated backdrop-blur-2xl">
              <div className="space-y-6">
                {/* Profile header */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-sky-500 flex items-center justify-center text-white font-bold text-xl">
                    ?
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white">Your Developer Persona</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Full-Stack / Smart Contract Engineer</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      Preview of how clients evaluate your credentials, linked repositories, and verified milestone track records.
                    </p>
                  </div>
                </div>

                {/* What your profile includes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { icon: Code2, label: 'Skills & Technologies', desc: 'Languages, frameworks, and tools you work with' },
                    { icon: GitBranch, label: 'GitHub Integration', desc: 'Your linked repositories and contribution history' },
                    { icon: Shield, label: 'Verification History', desc: 'Past milestone completions and AI verification scores' },
                    { icon: FileCode, label: 'Portfolio Projects', desc: 'Completed projects showcasing your expertise' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5"
                    >
                      <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                        <item.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-white">{item.label}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* GitHub Integration Info */}
                <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">How GitHub Integration Works</h4>
                  </div>
                  <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    <p>1. <strong>Link your GitHub account</strong> — Connect repositories to DevFlow projects in 1-click.</p>
                    <p>2. <strong>Commit-based evidence</strong> — Your commits and pull requests are parsed into cryptographic evidence.</p>
                    <p>3. <strong>AI Verification</strong> — AST parsers analyze changes against acceptance criteria to grant automated verification.</p>
                    <p>4. <strong>Instant Invoicing</strong> — PayPal Invoicing automatically triggers upon milestone completion.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CTA Section */}
        <section className="bg-white/80 dark:bg-[#0F172A]/85 border border-white/80 dark:border-white/10 rounded-2xl p-6 sm:p-8 shadow-glass-elevated dark:shadow-dark-glass-elevated backdrop-blur-2xl">
          <div className="text-center space-y-4 max-w-md mx-auto">
            <h2 className="font-heading text-xl font-bold text-slate-900 dark:text-white">
              Ready to start building?
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Create a developer account to apply for projects, submit milestone evidence, and receive secure payments.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
              <button
                onClick={() => navigate('/signup/developer')}
                className="w-full sm:w-auto py-2.5 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-sky-500 hover:from-purple-700 hover:to-sky-600 text-white font-semibold text-sm transition-all shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Create Developer Account
              </button>
              <button
                onClick={() => navigate('/login/developer')}
                className="w-full sm:w-auto py-2.5 px-6 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-white/[0.04] text-slate-900 dark:text-white font-semibold text-sm transition-all hover:bg-white/90 dark:hover:bg-white/[0.08] flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Log In
              </button>
            </div>
          </div>
        </section>

        {/* Footer info */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-500 dark:text-slate-500 pt-4">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {lastSuccessfulFetchTime ? `Last Updated: ${lastSuccessfulFetchTime}` : 'Live data unavailable • Demo mode'}
          </span>
          <span className="flex items-center gap-1">
            <Mail className="w-3 h-3" />
            {DEMO_CONFIG.organization.handle}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            DevFlow Demo Sandbox
          </span>
        </div>
      </main>

      {/* Guest Guard Modal */}
      <GuestGuardModal
        isOpen={showGuardModal}
        onClose={() => setShowGuardModal(false)}
        actionTitle={guardAction}
      />
    </div>
  );
};

export default DeveloperGuestPage;
