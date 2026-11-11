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
  Users,
  LogIn,
  UserPlus,
  Eye,
  Filter,
  ArrowUpDown,
  GitBranch,
  Calendar,
  BriefcaseBusiness,
  Mail,
  MapPin,
  Star,
  AlertCircle,
  ServerOff,
  Loader2,
} from 'lucide-react';

type CategoryFilter = 'all' | 'payment' | 'analytics' | 'api' | 'portal';
type SortOption = 'recent' | 'budget' | 'progress';

export const ClientGuestPage: React.FC = () => {
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
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('recent');

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
      setError(err?.message || 'Failed to fetch project listings. Backend services may be unavailable.');
      setIsBackendOffline(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Map projects to categories
  const getProjectCategory = (name: string): CategoryFilter => {
    const lower = name.toLowerCase();
    if (lower.includes('payment') || lower.includes('gateway')) return 'payment';
    if (lower.includes('analytics') || lower.includes('dashboard')) return 'analytics';
    if (lower.includes('api') || lower.includes('modernization')) return 'api';
    if (lower.includes('portal') || lower.includes('customer')) return 'portal';
    return 'all';
  };

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

    if (categoryFilter !== 'all') {
      list = list.filter((p) => getProjectCategory(p.name) === categoryFilter);
    }

    switch (sortOption) {
      case 'budget':
        list.sort((a, b) => b.totalBudget - a.totalBudget);
        break;
      case 'progress':
        list.sort(
          (a, b) =>
            b.completedMilestonesCount / (b.milestonesCount || 1) -
            a.completedMilestonesCount / (a.milestonesCount || 1)
        );
        break;
      case 'recent':
      default:
        list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
    }

    return list;
  }, [projects, searchQuery, categoryFilter, sortOption]);

  const getProjectMilestones = (projectId: string) => {
    return milestones.filter((m) => m.projectId === projectId);
  };

  const categories: { key: CategoryFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'payment', label: 'Payments' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'api', label: 'API' },
    { key: 'portal', label: 'Portal' },
  ];

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-[#060B16] text-[#0F172A] dark:text-[#F8FAFC] relative overflow-x-hidden antialiased">
      <AmbientBackground />

      {/* Demo Mode & Backend Connectivity Banner */}
      <div className="sticky top-0 z-50 bg-amber-50/95 dark:bg-amber-950/85 border-b border-amber-200/60 dark:border-amber-700/30 backdrop-blur-md px-4 py-2">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
              CLIENT GUEST MODE — DEMO DATA
            </span>
            {isBackendOffline && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-amber-200/50 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                <ServerOff className="w-3 h-3" />
                Backend Offline (Fallback Active)
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono">
              {lastSuccessfulFetchTime ? `Last Updated: ${lastSuccessfulFetchTime}` : 'Demo Data Active • Backend Offline'}
            </span>
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-1 rounded-md hover:bg-amber-200/50 dark:hover:bg-amber-800/30 transition-colors disabled:opacity-50"
              title="Refresh data from API"
              aria-label="Refresh data"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-700 dark:text-amber-400 ${loading ? 'animate-spin' : ''}`} />
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
            onClick={() => navigate('/guest/client')}
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
            Client Dashboard
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Explore project listings, developer profiles, and milestone tracking from a client's perspective.
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

        {/* Search and Filters Bar */}
        <div className="bg-white/80 dark:bg-[#0F172A]/85 border border-white/80 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-glass-elevated dark:shadow-dark-glass-elevated backdrop-blur-2xl">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search projects, clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#080D18] border border-slate-200 dark:border-[#26344B] rounded-lg pl-9 pr-3 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#2563EB] transition-colors"
              />
            </div>

            {/* Category filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setCategoryFilter(cat.key)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                    categoryFilter === cat.key
                      ? 'bg-[#2563EB] text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/[0.08]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="bg-slate-50 dark:bg-[#080D18] border border-slate-200 dark:border-[#26344B] rounded-lg px-2.5 py-1.5 text-[11px] text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#2563EB]"
              >
                <option value="recent">Most Recent</option>
                <option value="budget">Highest Budget</option>
                <option value="progress">Most Progress</option>
              </select>
            </div>
          </div>
        </div>

        {/* Project Discovery Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#2563EB] dark:text-[#60A5FA]" />
              <h2 className="font-heading text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Project Discovery
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
              <Loader2 className="w-8 h-8 text-[#2563EB] dark:text-[#60A5FA] animate-spin mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Loading project listings...</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Connecting to DevFlow API service</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            /* Empty State */
            <div className="bg-white/80 dark:bg-[#0F172A]/85 border border-white/80 dark:border-white/10 rounded-2xl p-8 text-center backdrop-blur-2xl">
              <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No projects match your filter</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Try adjusting your search query or reset the category filter.
              </p>
            </div>
          ) : (
            /* Project Grid */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredProjects.map((project) => {
                const projectMilestones = getProjectMilestones(project.id);
                const progressPct =
                  project.milestonesCount > 0
                    ? Math.round((project.completedMilestonesCount / project.milestonesCount) * 100)
                    : 0;

                return (
                  <div
                    key={project.id}
                    className="bg-white/80 dark:bg-[#0F172A]/85 border border-white/80 dark:border-white/10 rounded-2xl p-5 shadow-glass-elevated dark:shadow-dark-glass-elevated backdrop-blur-2xl hover:border-[#2563EB]/30 transition-all group"
                  >
                    <div className="space-y-4">
                      {/* Project header */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1 min-w-0">
                          <h3 className="font-heading text-base font-bold text-slate-900 dark:text-white group-hover:text-[#2563EB] dark:group-hover:text-[#60A5FA] transition-colors truncate">
                            {project.name}
                          </h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                            {project.description}
                          </p>
                        </div>
                      </div>

                      {/* Project meta */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <BriefcaseBusiness className="w-3 h-3" />
                          {project.clientName}
                        </span>
                        <span className="flex items-center gap-1 font-tabular">
                          <DollarSign className="w-3 h-3" />
                          ${project.totalBudget.toLocaleString()}
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

                      {/* Milestone progress */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-600 dark:text-slate-400">Milestone Progress</span>
                          <span className="font-semibold font-tabular text-slate-900 dark:text-white">
                            {project.completedMilestonesCount}/{project.milestonesCount}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#2563EB] to-teal-500 rounded-full transition-all duration-500"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>

                        {/* Milestone list */}
                        {projectMilestones.length > 0 && (
                          <div className="space-y-1 pt-1">
                            {projectMilestones.slice(0, 3).map((ms) => (
                              <div
                                key={ms.id}
                                className="flex items-center gap-2 text-[11px]"
                              >
                                {ms.status === 'paid' ? (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                ) : (
                                  <Circle className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />
                                )}
                                <span className="text-slate-700 dark:text-slate-300 truncate flex-1">
                                  {ms.title}
                                </span>
                                <span className="font-tabular text-slate-500 dark:text-slate-400 font-medium">
                                  ${ms.amount.toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleRestrictedAction('View full project details')}
                          className="flex-1 py-2 px-3 rounded-lg bg-[#2563EB]/10 text-[#2563EB] dark:text-[#60A5FA] text-[11px] font-semibold hover:bg-[#2563EB]/20 transition-colors"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleRestrictedAction('Hire developer for this project')}
                          className="flex-1 py-2 px-3 rounded-lg bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 text-[11px] font-semibold hover:bg-slate-200 dark:hover:bg-white/[0.08] transition-colors"
                        >
                          Hire Developer
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Developer Directory Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h2 className="font-heading text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              Developer Directory
            </h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-700/30 text-[10px] font-semibold text-amber-700 dark:text-amber-400 font-mono">
              <Eye className="w-3 h-3" />
              DEMO PROFILES
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                name: DEMO_CONFIG.user.name,
                role: 'Full-Stack Developer',
                skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
                projects: 4,
                rating: 4.9,
              },
              {
                name: 'Jordan Reed',
                role: 'Backend Engineer',
                skills: ['Python', 'Go', 'AWS', 'Docker'],
                projects: 3,
                rating: 4.8,
              },
              {
                name: 'Taylor Kim',
                role: 'DevOps & Cloud Architect',
                skills: ['Kubernetes', 'Terraform', 'CI/CD', 'GCP'],
                projects: 5,
                rating: 4.7,
              },
            ].map((dev) => (
              <div
                key={dev.name}
                className="bg-white/80 dark:bg-[#0F172A]/85 border border-white/80 dark:border-white/10 rounded-2xl p-5 shadow-glass-elevated dark:shadow-dark-glass-elevated backdrop-blur-2xl"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                      {dev.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{dev.name}</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{dev.role}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {dev.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.04] text-[10px] font-medium text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-white/5"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      {dev.projects} projects
                    </span>
                    <span className="flex items-center gap-1 font-tabular">
                      <Star className="w-3 h-3 text-amber-500" />
                      {dev.rating}
                    </span>
                  </div>

                  <button
                    onClick={() => handleRestrictedAction(`View ${dev.name}'s full profile`)}
                    className="w-full py-2 px-3 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-400 text-[11px] font-semibold hover:bg-teal-500/20 transition-colors"
                  >
                    View Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-white/80 dark:bg-[#0F172A]/85 border border-white/80 dark:border-white/10 rounded-2xl p-6 sm:p-8 shadow-glass-elevated dark:shadow-dark-glass-elevated backdrop-blur-2xl">
          <div className="text-center space-y-4 max-w-md mx-auto">
            <h2 className="font-heading text-xl font-bold text-slate-900 dark:text-white">
              Ready to start hiring?
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Create a client account to post projects, define milestones, and manage secure payments through DevFlow.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
              <button
                onClick={() => navigate('/signup/client')}
                className="w-full sm:w-auto py-2.5 px-6 rounded-xl bg-gradient-to-r from-[#2563EB] to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Create Account
              </button>
              <button
                onClick={() => navigate('/login/client')}
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

export default ClientGuestPage;
