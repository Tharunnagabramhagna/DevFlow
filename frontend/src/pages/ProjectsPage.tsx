import React, { useEffect, useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Button,
  Input,
  Modal,
  Skeleton,
  useToast,
} from '@/components/common';
import { devFlowApi } from '@/services/api';
import { Project } from '@/types';
import {
  Plus,
  GitBranch,
  Users,
  DollarSign,
  Calendar,
  Search,
  ExternalLink,
  FolderGit2,
  Sparkles,
  Info,
} from 'lucide-react';

export const ProjectsPage: React.FC = () => {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMockData, setIsMockData] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Project Form State
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [githubRepo, setGithubRepo] = useState('Tharunnagabramhagna/DevFlow');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [totalBudget, setTotalBudget] = useState('10000');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await devFlowApi.getProjects();
      setProjects(res.data);
      setIsMockData(res.isMock);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !clientName.trim() || !clientEmail.trim()) {
      toast.error('Validation Error', 'Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await devFlowApi.createProject({
        name: projectName,
        description: projectDesc || 'Project managed with DevFlow AI milestone verification.',
        githubRepo: githubRepo.trim(),
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        totalBudget: parseFloat(totalBudget) || 5000,
        currency: 'USD',
      });

      toast.success(
        'Project Connected',
        `Successfully linked ${res.data.name} to GitHub repo ${res.data.githubRepo}`
      );
      setIsCreateModalOpen(false);
      resetForm();
      await loadProjects();
    } catch (err) {
      toast.error('Creation Failed', 'Could not create project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setProjectName('');
    setProjectDesc('');
    setClientName('');
    setClientEmail('');
    setTotalBudget('10000');
  };

  // Filter & Search Logic
  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.githubRepo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.clientName.toLowerCase().includes(searchQuery.toLowerCase());

    const isCompleted = p.completedMilestonesCount === p.milestonesCount && p.milestonesCount > 0;
    if (filterStatus === 'active') return matchesSearch && !isCompleted;
    if (filterStatus === 'completed') return matchesSearch && isCompleted;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Simulation / Data Transparency Notice */}
      {isMockData && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-sky-50/80 border border-sky-200/90 text-xs text-sky-950">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#0070BA] shrink-0" />
            <span className="leading-snug">
              <strong>Project Storage Status:</strong> Synchronized with local in-memory state.
              Backend projects endpoint registered for integration.
            </span>
          </div>
          <Badge variant="paypal" size="sm" className="self-start sm:self-auto shrink-0">
            Live Preview
          </Badge>
        </div>
      )}

      {/* Header & New Project CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Project Management</h2>
          <p className="text-xs text-slate-500">
            Repositories connected to automated AI milestone tracking, client reviews, and PayPal settlement
          </p>
        </div>
        <Button
          variant="paypal"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Connect Project
        </Button>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        {/* Search */}
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search projects, repos, or clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            className="text-xs py-1.5"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterStatus === 'all'
                ? 'bg-slate-900 text-white font-semibold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All ({projects.length})
          </button>
          <button
            onClick={() => setFilterStatus('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterStatus === 'active'
                ? 'bg-fintech-paypal-blue text-white font-semibold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterStatus === 'completed'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredProjects.length === 0 && (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">No Projects Found</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {searchQuery
                ? `No projects matching "${searchQuery}". Try adjusting your search or filters.`
                : 'No projects registered yet. Connect your first GitHub repository to start.'}
            </p>
            {searchQuery ? (
              <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                Clear Filter
              </Button>
            ) : (
              <Button
                variant="paypal"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => setIsCreateModalOpen(true)}
              >
                Connect Project
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Projects Grid */}
      {!loading && filteredProjects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredProjects.map((proj) => {
            const isFullyCompleted =
              proj.completedMilestonesCount === proj.milestonesCount && proj.milestonesCount > 0;
            const completionPercent = proj.milestonesCount
              ? Math.round((proj.completedMilestonesCount / proj.milestonesCount) * 100)
              : 0;

            return (
              <Card
                key={proj.id}
                variant="default"
                className="flex flex-col justify-between hover:border-slate-300 transition-all shadow-card-subtle"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant={isFullyCompleted ? 'success' : 'paypal'} size="sm" dot>
                      {isFullyCompleted ? 'Fully Settled' : 'Active Engagement'}
                    </Badge>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(proj.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <CardTitle className="text-lg mt-2.5 font-bold text-slate-900 tracking-tight">
                    {proj.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 mt-1">
                    {proj.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Metadata Specs Box */}
                  <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <GitBranch className="w-3.5 h-3.5 text-slate-400" />
                        Monitored Repo
                      </span>
                      <a
                        href={`https://github.com/${proj.githubRepo}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono font-semibold text-fintech-paypal-blue hover:underline inline-flex items-center gap-1"
                      >
                        <span>{proj.githubRepo}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        Client Contact
                      </span>
                      <div className="text-right">
                        <span className="font-semibold text-slate-800">{proj.clientName}</span>
                        <p className="text-[11px] text-slate-400">{proj.clientEmail}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                        Contract Value
                      </span>
                      <span className="font-mono font-bold text-slate-900 text-sm tabular-nums">
                        ${proj.totalBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                        {proj.currency}
                      </span>
                    </div>
                  </div>

                  {/* Milestone Completion Overview */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span className="font-medium">Milestone Completion</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {proj.completedMilestonesCount} / {proj.milestonesCount} ({completionPercent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-fintech-paypal-blue to-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${completionPercent}%` }}
                      />
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Sparkles className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                    <span>AI Verification Enabled</span>
                  </div>
                  <a href="#/milestones" className="w-full sm:w-auto">
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                      Inspect Milestones &rarr;
                    </Button>
                  </a>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Connect Project Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Connect New GitHub Project"
        description="Link a repository to DevFlow for automated milestone evidence analysis and PayPal invoicing."
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="paypal"
              size="sm"
              isLoading={isSubmitting}
              onClick={handleCreateProject}
            >
              Connect & Register
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          <Input
            label="Project Name *"
            placeholder="e.g., DevFlow Milestone Intelligence"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            required
          />
          <Input
            label="GitHub Repository (owner/repo) *"
            placeholder="e.g., Tharunnagabramhagna/DevFlow"
            value={githubRepo}
            onChange={(e) => setGithubRepo(e.target.value)}
            leftIcon={<GitBranch className="w-4 h-4" />}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Client Name *"
              placeholder="e.g., Alex Mercer"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
            />
            <Input
              label="Client Invoicing Email *"
              type="email"
              placeholder="alex@fintechventures.io"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              required
            />
          </div>
          <Input
            label="Total Agreed Budget (USD) *"
            type="number"
            placeholder="12500"
            value={totalBudget}
            onChange={(e) => setTotalBudget(e.target.value)}
            leftIcon={<DollarSign className="w-4 h-4" />}
            required
          />
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">Project Overview</label>
            <textarea
              className="w-full rounded-fintech border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-fintech-paypal-subtle"
              rows={2}
              placeholder="Brief description of the development engagement..."
              value={projectDesc}
              onChange={(e) => setProjectDesc(e.target.value)}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
