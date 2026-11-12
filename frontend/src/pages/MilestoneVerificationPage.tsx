import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from '@/contexts/SidebarContext';
import {
                  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Copy,
  Check,
  X,
  Menu,
  RotateCw,
  Sparkles,
  Send,
  MessageSquare,
  FileText,
} from 'lucide-react';
import { devFlowApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { GuestGuardModal } from '@/components/common';
import { Project, Milestone } from '@/types';

// Circular Progress Gauge Component
interface CircularGaugeProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

const CircularGauge: React.FC<CircularGaugeProps> = ({
  percentage,
  size = 54,
  strokeWidth = 5,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Track Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1E2E4E"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={percentage >= 90 ? '#10B981' : percentage >= 75 ? '#F59E0B' : '#EF4444'}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-mono text-xs font-bold text-white tracking-tight">
          {percentage}%
        </span>
      </div>
    </div>
  );
};

// Requirement Analysis Item Model
interface RequirementAnalysisItem {
  id: string;
  description: string;
  evidenceRef: string;
  supportStatus: 'Green' | 'Amber' | 'Missing';
  confidence: 'High Confidence' | 'Medium Confidence' | 'Low Confidence';
  shortExplanation: string;
  fullExplanation: string;
  matchedCommits?: string[];
  testStatus?: 'passed' | 'failed' | 'pending';
}

export const MilestoneVerificationPage: React.FC = () => {
  const navigate = useNavigate();

  // Navigation & Layout States
  const { openMobileSidebar } = useSidebar();
  const { user, isGuest, isClient, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isGuestGuardOpen, setIsGuestGuardOpen] = useState(false);
  const [guardActionTitle, setGuardActionTitle] = useState('Milestone Approval');

  // Milestone Selector States
  const [selectedProject, setSelectedProject] = useState(isGuest ? 'Project Alpha v1.2' : '');
  const [selectedSprint, setSelectedSprint] = useState(isGuest ? 'Sprint 8 - Backend API' : '');

  // Live Data & Telemetry
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [commits, setCommits] = useState<import('@/types').GitHubCommitEvidence[]>([]);
  const [loading, setLoading] = useState(true);

  // SHA Copy State
  const [copiedSha, setCopiedSha] = useState<string | null>(null);

  // Expanded Row IDs
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // Human Review Modal States
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [requestEvidenceModalOpen, setRequestEvidenceModalOpen] = useState(false);
  const [furtherReviewModalOpen, setFurtherReviewModalOpen] = useState(false);
  const [evidenceFeedback, setEvidenceFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Review Status Banner State
  const [reviewState, setReviewState] = useState<'pending' | 'approved' | 'evidence_requested' | 'further_review'>('pending');

  // Toast Notification
  const [, setToastMessage] = useState<{ title: string; desc: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (title: string, desc: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    setSelectedProject(isGuest ? 'Project Alpha v1.2' : '');
    setSelectedSprint(isGuest ? 'Sprint 8 - Backend API' : '');
    loadData();
  }, [isGuest]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, mRes, cRes] = await Promise.all([
        devFlowApi.getProjects(),
        devFlowApi.getMilestones(),
        devFlowApi.getGitHubCommits(),
      ]);
      setProjects(pRes.data);
      setMilestones(mRes.data);
      setCommits(cRes.data);

      if (!isGuest) {
        const firstProj = pRes.data[0];
        if (firstProj) {
          setSelectedProject((prev) => prev || firstProj.id);
          if (firstProj.githubRepo) {
            const actRes = await devFlowApi.getProjectGitHubActivity(firstProj.id);
            if (actRes.data?.commits) {
              setCommits(
                actRes.data.commits.map((c) => ({
                  sha: c.sha,
                  message: c.message,
                  author: c.author,
                  authorAvatar: c.authorAvatar || undefined,
                  date: c.date,
                  url: c.url,
                  filesChanged: c.filesChanged,
                  additions: c.additions,
                  deletions: c.deletions,
                }))
              );
            }
          }
        }
        const firstMs = mRes.data[0];
        if (firstMs) {
          setSelectedSprint((prev) => prev || firstMs.id);
        }
      }
    } catch (err) {
      console.error('Failed to load milestone verification data:', err);
    } finally {
      setLoading(false);
    }
  };

  const projectMilestones = milestones.filter((m) => !selectedProject || m.projectId === selectedProject);
  const activeMilestone =
    projectMilestones.find((m) => m.id === selectedSprint) ||
    projectMilestones[0] ||
    milestones[0] ||
    null;

  // Demo Requirement Analysis Rows (Guest Mode only)
  const demoRequirements: RequirementAnalysisItem[] = [
    {
      id: 'req-1',
      description: 'Implement user authentication with JWT',
      evidenceRef: 'commit: 8d49432',
      supportStatus: 'Green',
      confidence: 'High Confidence',
      shortExplanation: 'Validates JWT signatures and key rotation.',
      fullExplanation:
        'Implementation fully supports user authentication with JWT. Validates token signatures, enforces expiration bounds, and securely reads private keys via environment variables.',
      matchedCommits: ['8d494325368', '3e41b99a81c'],
      testStatus: 'passed',
    },
    {
      id: 'req-2',
      description: 'Implement refresh token rotation and revocation',
      evidenceRef: 'commit: 5a2b109',
      supportStatus: 'Amber',
      confidence: 'High Confidence',
      shortExplanation: 'Token rotation active; revocation test pending.',
      fullExplanation:
        'Access token renewal endpoints are partially covered. Token exchange operates as expected, but background blacklisting on revocation requires additional test coverage.',
      matchedCommits: ['5a2b109f42c'],
      testStatus: 'pending',
    },
    {
      id: 'req-3',
      description: 'Implement rate limiting and session protection',
      evidenceRef: 'commit: 7c1e884',
      supportStatus: 'Amber',
      confidence: 'High Confidence',
      shortExplanation: 'Rate limiter wired; regression tests pending.',
      fullExplanation:
        'Protection layer implements basic IP rate limiting. Session hijack defense is implemented at router level but lacks automated regression suite validation.',
      matchedCommits: ['7c1e884d09a'],
      testStatus: 'pending',
    },
  ];

  const liveRequirements: RequirementAnalysisItem[] = React.useMemo(() => {
    if (!activeMilestone) return [];
    const analysis = activeMilestone.aiReport?.requirementsAnalysis || [];
    if (analysis.length > 0) {
      return analysis.map((item) => ({
        id: item.requirementId,
        description: item.requirementTitle,
        evidenceRef: item.matchedCommits?.[0] ? `commit: ${item.matchedCommits[0].substring(0, 7)}` : 'Pending',
        supportStatus: item.status === 'satisfied' ? 'Green' : item.status === 'partial' ? 'Amber' : 'Missing',
        confidence: item.score >= 80 ? 'High Confidence' : item.score >= 50 ? 'Medium Confidence' : 'Low Confidence',
        shortExplanation: item.explanation,
        fullExplanation: item.explanation,
        matchedCommits: item.matchedCommits || [],
        testStatus: item.status === 'satisfied' ? 'passed' : 'pending',
      }));
    }
    return (activeMilestone.requirements || []).map((req) => ({
      id: req.id,
      description: req.title,
      evidenceRef: req.verifiedCommitSha ? `commit: ${req.verifiedCommitSha.substring(0, 7)}` : 'Unlinked',
      supportStatus: req.satisfied ? 'Green' : 'Missing',
      confidence: req.satisfied ? 'High Confidence' : 'Low Confidence',
      shortExplanation: req.description || 'Awaiting AI verification analysis.',
      fullExplanation: req.description || 'Run AI verification to generate code-to-requirement mapping explanation.',
      matchedCommits: req.verifiedCommitSha ? [req.verifiedCommitSha] : [],
      testStatus: req.satisfied ? 'passed' : 'pending',
    }));
  }, [activeMilestone]);

  const requirements = isGuest ? demoRequirements : liveRequirements;

  // Dynamic Metrics
  const metrics = isGuest
    ? {
        requirementsEvaluated: 12,
        supportedRequirements: 9,
        partiallySupported: 2,
        missingEvidence: 1,
        overallSupport: 85,
      }
    : {
        requirementsEvaluated: requirements.length,
        supportedRequirements: requirements.filter((r) => r.supportStatus === 'Green').length,
        partiallySupported: requirements.filter((r) => r.supportStatus === 'Amber').length,
        missingEvidence: requirements.filter((r) => r.supportStatus === 'Missing').length,
        overallSupport:
          activeMilestone?.aiReport?.confidenceScore ??
          activeMilestone?.aiReport?.overallScore ??
          activeMilestone?.aiReport?.confidence ??
          (requirements.length > 0
            ? Math.round((requirements.filter((r) => r.supportStatus === 'Green').length / requirements.length) * 100)
            : 0),
      };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopySha = async (sha: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(sha);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = sha;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedSha(sha);
      setTimeout(() => setCopiedSha(null), 2000);
    } catch {
      showToast('Copy Failed', 'Could not access system clipboard.', 'error');
    }
  };

  // Review Action Handlers
  const handleApproveForClientReview = async () => {
    if (isGuest) {
      setApproveModalOpen(false);
      setGuardActionTitle('Approve Deliverable');
      setIsGuestGuardOpen(true);
      return;
    }
    if (!isClient) {
      showToast('Client Action Only', 'Only client accounts can approve deliverables.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const targetMilestone = milestones[0];
      if (targetMilestone) {
        await devFlowApi.submitClientApproval(
          targetMilestone.id,
          'approved',
          'Milestone evidence verified by lead auditor. Approved for client review.'
        );
      }
      setReviewState('approved');
      setApproveModalOpen(false);
      showToast(
        'Approved for Client Review',
        'Milestone marked ready for client sign-off. Settlement pending client acceptance.',
        'success'
      );
    } catch {
      showToast('Approval Failed', 'Could not record milestone approval.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestAdditionalEvidence = async () => {
    if (isGuest) {
      setRequestEvidenceModalOpen(false);
      setGuardActionTitle('Request Additional Evidence');
      setIsGuestGuardOpen(true);
      return;
    }
    if (!evidenceFeedback.trim()) return;
    setIsSubmitting(true);
    try {
      const targetMilestone = milestones[0];
      if (targetMilestone) {
        await devFlowApi.submitClientApproval(
          targetMilestone.id,
          'changes_requested',
          evidenceFeedback
        );
      }
      setReviewState('evidence_requested');
      setRequestEvidenceModalOpen(false);
      setEvidenceFeedback('');
      showToast(
        'Evidence Requested',
        'Developer and repository agents notified to provide supplementary proofs.',
        'info'
      );
    } catch {
      showToast('Request Failed', 'Could not dispatch evidence request.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkNeedingFurtherReview = async () => {
    if (isGuest) {
      setFurtherReviewModalOpen(false);
      setGuardActionTitle('Flag for Secondary Audit');
      setIsGuestGuardOpen(true);
      return;
    }
    setIsSubmitting(true);
    try {
      setReviewState('further_review');
      setFurtherReviewModalOpen(false);
      showToast(
        'Flagged for Further Review',
        'Milestone queued for secondary technical audit.',
        'info'
      );
    } catch {
      showToast('Action Failed', 'Could not update review state.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#080D18] text-white">
        <div className="flex items-center gap-2.5 text-xs text-slate-400 font-mono">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] animate-ping" />
          <span>Loading Milestone Verification Engine...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* PHASE 1: PAGE HEADER & MILESTONE SELECTOR */}
        <header className="px-4 sm:px-6 lg:px-8 pt-4 pb-4 border-b border-[#26344B] bg-[#0A101D] shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={openMobileSidebar}
                className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-[#152238] rounded-xl"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-heading text-lg sm:text-xl font-extrabold text-white tracking-tight leading-none">
                  Milestone Verification
                </h1>
                <p className="font-sans text-xs text-slate-400 mt-1">
                  Review AI-generated evidence assessments and milestone requirements.
                </p>
              </div>
            </div>

            {/* Quick Link to AI Agents page if user wants pipeline view */}
            <button
              onClick={() => navigate('/verification')}
              className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#111C30] hover:bg-[#152238] border border-[#26344B] text-xs text-blue-400 font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Agents Pipeline</span>
            </button>
          </div>

          {/* Milestone Selector Section */}
          <div className="space-y-1.5 pt-0.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Milestone Selector
            </span>
            <div className="flex flex-wrap items-center gap-3">
              {/* Project Dropdown */}
              <div className="relative min-w-[200px]">
                <select
                  value={selectedProject}
                  onChange={(e) => {
                    setSelectedProject(e.target.value);
                    showToast('Project Selected', 'Updated verification scope for selected project.', 'info');
                  }}
                  className="w-full bg-[#111C30] text-xs sm:text-sm font-semibold text-white px-3.5 py-2 rounded-xl border border-[#26344B] focus:border-blue-500 focus:outline-hidden appearance-none cursor-pointer pr-9"
                >
                  {isGuest ? (
                    <>
                      <option value="Project Alpha v1.2">Project Alpha v1.2 (DEMO)</option>
                      <option value="Project Nova">Project Nova (DEMO)</option>
                      <option value="Aether Platform">Aether Platform (DEMO)</option>
                    </>
                  ) : projects.length === 0 ? (
                    <option value="">No projects created yet</option>
                  ) : (
                    projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))
                  )}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Milestone Dropdown */}
              <div className="relative min-w-[220px]">
                <select
                  value={selectedSprint}
                  onChange={(e) => {
                    setSelectedSprint(e.target.value);
                    showToast('Milestone Selected', 'Synchronized requirement verification panel.', 'info');
                  }}
                  className="w-full bg-[#111C30] text-xs sm:text-sm font-semibold text-white px-3.5 py-2 rounded-xl border border-[#26344B] focus:border-blue-500 focus:outline-hidden appearance-none cursor-pointer pr-9"
                >
                  {isGuest ? (
                    <>
                      <option value="Sprint 8 - Backend API">Sprint 8 - Backend API (DEMO)</option>
                      <option value="Sprint 7 - Auth Gateway">Sprint 7 - Auth Gateway (DEMO)</option>
                    </>
                  ) : projectMilestones.length === 0 ? (
                    <option value="">No milestones in this project</option>
                  ) : (
                    projectMilestones.map((m) => (
                      <option key={m.id} value={m.id}>{m.title}</option>
                    ))
                  )}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Dashboard Body */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-7 py-5 space-y-6 max-w-[1600px] w-full mx-auto">
          {/* PHASE 2: VERIFICATION SUMMARY CARD */}
          <div className="rounded-xl bg-[#111C30] border border-[#26344B] p-4 sm:p-5">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Verification Summary
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 items-center">
              {/* 1. Requirements Evaluated */}
              <div className="space-y-1">
                <span className="text-xs text-slate-400 block font-medium">Requirements Evaluated</span>
                <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
                  {metrics.requirementsEvaluated}
                </div>
              </div>

              {/* 2. Supported Requirements */}
              <div className="space-y-1">
                <span className="text-xs text-slate-400 block font-medium">Supported Requirements</span>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-2xl sm:text-3xl font-bold text-white font-mono">
                    {metrics.supportedRequirements}
                  </span>
                </div>
              </div>

              {/* 3. Partially Supported */}
              <div className="space-y-1">
                <span className="text-xs text-slate-400 block font-medium">Partially Supported</span>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="text-2xl sm:text-3xl font-bold text-white font-mono">
                    {metrics.partiallySupported}
                  </span>
                </div>
              </div>

              {/* 4. Missing Evidence */}
              <div className="space-y-1">
                <span className="text-xs text-slate-400 block font-medium">Missing Evidence</span>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-[9px] font-bold text-amber-400">
                    !
                  </div>
                  <span className="text-2xl sm:text-3xl font-bold text-white font-mono">
                    {metrics.missingEvidence}
                  </span>
                </div>
              </div>

              {/* 5. Overall Evidence Support with Circular Gauge */}
              <div className="flex items-center justify-between sm:justify-end gap-3 col-span-2 sm:col-span-1 border-t sm:border-t-0 sm:border-l border-[#26344B]/60 pt-3 sm:pt-0 sm:pl-4">
                <div className="text-right">
                  <span className="text-xs text-slate-400 block font-medium">Overall Evidence Support</span>
                  <span className="text-xl font-bold text-white font-mono">{metrics.overallSupport}%</span>
                </div>
                <CircularGauge percentage={metrics.overallSupport} />
              </div>
            </div>
          </div>

          {/* MIDDLE GRID: 3 PANELS (REQUIREMENT ANALYSIS, EVIDENCE PANEL, AI ANALYSIS PANEL) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* PHASE 3: REQUIREMENT ANALYSIS (LEFT 6 COLS) */}
            <div className="lg:col-span-6 rounded-2xl bg-[#111C30] border border-[#26344B] overflow-hidden flex flex-col justify-between">
              <div>
                <div className="px-5 py-3.5 border-b border-[#26344B] bg-[#0C1524] flex items-center justify-between">
                  <span className="text-xs sm:text-[13px] font-bold text-slate-400 uppercase tracking-wider">
                    Requirement Analysis
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {requirements.length} Criteria
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#26344B] text-xs text-slate-400 uppercase tracking-wider bg-[#0C1524]/60">
                        <th className="py-3 px-3.5 font-semibold">Description</th>
                        <th className="py-3 px-2.5 font-semibold text-center">Evidence Reference</th>
                        <th className="py-3 px-2.5 font-semibold">Evidence Support Status</th>
                        <th className="py-3 px-2.5 font-semibold">Confidence Indicator</th>
                        <th className="py-3 px-3.5 font-semibold">AI Explanation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#26344B]/40">
                      {requirements.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-10 px-4 text-center text-xs text-slate-400">
                            No milestone requirements available to analyze yet. Select or create a milestone with acceptance criteria.
                          </td>
                        </tr>
                      ) : requirements.map((req) => {
                        const isExpanded = !!expandedRows[req.id];
                        return (
                          <React.Fragment key={req.id}>
                            <tr
                              onClick={() => toggleRow(req.id)}
                              className="hover:bg-[#152238]/60 transition-colors cursor-pointer group"
                            >
                              {/* Description */}
                              <td className="py-3.5 px-3.5 max-w-[170px] font-medium text-slate-200 leading-snug text-xs sm:text-sm">
                                {req.description}
                              </td>

                              {/* Evidence Reference Icon */}
                              <td className="py-3.5 px-2.5 text-center whitespace-nowrap">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
                                  <RotateCw className="w-3.5 h-3.5" />
                                </span>
                              </td>

                              {/* Support Status Badge */}
                              <td className="py-3.5 px-2.5 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                                    req.supportStatus === 'Green'
                                      ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-500/30'
                                      : 'bg-amber-950/70 text-amber-400 border border-amber-500/30'
                                  }`}
                                >
                                  {req.supportStatus === 'Green' ? (
                                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                  ) : (
                                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                                  )}
                                  <span>{req.supportStatus}</span>
                                </span>
                              </td>

                              {/* Confidence Indicator */}
                              <td className="py-3.5 px-2.5 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-medium text-emerald-400">
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span className="hidden sm:inline">{req.confidence}</span>
                                </span>
                              </td>

                              {/* AI Explanation / Accordion trigger */}
                              <td className="py-3.5 px-3.5 text-slate-300">
                                <div className="flex items-center justify-between gap-1.5 max-w-[170px]">
                                  <span className="truncate text-xs text-slate-400">
                                    {req.shortExplanation}
                                  </span>
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                                  )}
                                </div>
                              </td>
                            </tr>

                            {/* Expanded Explanation Accordion */}
                            {isExpanded && (
                              <tr className="bg-[#0C1524]">
                                <td colSpan={5} className="p-4 text-sm text-slate-300 border-b border-[#26344B]">
                                  <div className="space-y-2.5 p-3.5 rounded-xl bg-[#111C30] border border-[#26344B]/80">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                                        Full AST Evaluation Proof
                                      </span>
                                      <span className="text-xs text-slate-400 font-mono">
                                        Evidence: {req.evidenceRef}
                                      </span>
                                    </div>
                                    <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
                                      {req.fullExplanation}
                                    </p>
                                    {req.matchedCommits && (
                                      <div className="flex items-center gap-2 pt-1.5 text-xs text-slate-400 font-mono">
                                        <span>Matched Commit Hashes:</span>
                                        {req.matchedCommits.map((sha) => (
                                          <span
                                            key={sha}
                                            className="px-2 py-0.5 rounded bg-[#152238] text-slate-200 border border-[#26344B]"
                                          >
                                            {sha.substring(0, 7)}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-3.5 bg-[#0C1524] border-t border-[#26344B] flex items-center justify-between text-xs text-slate-400">
                <span>Click any row to inspect complete syntactic proof.</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {requirements.length > 0 ? `${metrics.overallSupport}% Evaluated` : 'Awaiting Analysis'}
                </span>
              </div>
            </div>

            {/* PHASE 4: EVIDENCE PANEL (MIDDLE 3 COLS) */}
            <div className="lg:col-span-3 rounded-2xl bg-[#111C30] border border-[#26344B] p-5 space-y-5">
              <div className="pb-2.5 border-b border-[#26344B]/60">
                <span className="text-xs sm:text-[13px] font-bold text-slate-400 uppercase tracking-wider">
                  Evidence Panel
                </span>
              </div>

              {/* Subsection A: Commit References */}
              <div className="space-y-2 text-xs sm:text-sm">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Commit References
                </span>
                {isGuest ? (
                  <div className="p-3 rounded-xl bg-[#0C1524] border border-[#26344B] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs sm:text-sm text-blue-400 font-semibold">
                        commit: 8d494325368 (DEMO)
                      </span>
                      <button
                        onClick={() => handleCopySha('8d494325368')}
                        className="px-2 py-0.5 rounded-md bg-[#152238] border border-[#26344B] text-xs text-slate-300 hover:text-white flex items-center gap-1 font-mono cursor-pointer"
                        title="Copy full commit SHA"
                      >
                        {copiedSha === '8d494325368' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="text-xs sm:text-sm text-slate-300">
                      Author: <span className="text-white font-medium">Demo Contributor</span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      Timestamp: Sample Commit Record
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      Commit message: Implement JWT authentication flow
                    </div>
                  </div>
                ) : commits.length === 0 ? (
                  <div className="p-3 rounded-xl bg-[#0C1524] border border-[#26344B] text-xs text-slate-400">
                    No synced repository commits for this project yet.
                  </div>
                ) : (
                  commits.slice(0, 2).map((c) => (
                    <div key={c.sha} className="p-3 rounded-xl bg-[#0C1524] border border-[#26344B] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs sm:text-sm text-blue-400 font-semibold">
                          commit: {c.sha.substring(0, 11)}
                        </span>
                        <button
                          onClick={() => handleCopySha(c.sha)}
                          className="px-2 py-0.5 rounded-md bg-[#152238] border border-[#26344B] text-xs text-slate-300 hover:text-white flex items-center gap-1 font-mono cursor-pointer"
                          title="Copy full commit SHA"
                        >
                          {copiedSha === c.sha ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="text-xs text-slate-300">
                        Author: <span className="text-white font-medium">{c.author}</span>
                      </div>
                      <div className="text-xs text-slate-400 truncate">{c.message}</div>
                    </div>
                  ))
                )}
              </div>

              {/* Subsection B: Changed Files */}
              <div className="space-y-2 text-xs sm:text-sm">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Changed Files
                </span>
                <div className="p-3 rounded-xl bg-[#0C1524] border border-[#26344B] space-y-1.5 font-mono text-xs text-slate-300">
                  {isGuest ? (
                    <>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>src/auth/jwt.service.ts</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>src/middleware/auth.ts</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>tests/auth.test.ts</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-slate-400 font-sans">
                      {commits[0]?.changedFiles && commits[0].changedFiles.length > 0
                        ? commits[0].changedFiles.map((f) => f.filename).join(', ')
                        : 'Changed file paths are inspected via linked GitHub repository commits.'}
                    </div>
                  )}
                </div>
              </div>

              {/* Subsection C: Test Results */}
              <div className="space-y-2 text-xs sm:text-sm">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Test &amp; Verification Status
                </span>
                <div className="p-3 rounded-xl bg-[#0C1524] border border-[#26344B] space-y-2 text-xs sm:text-sm">
                  {isGuest ? (
                    <>
                      <div className="flex items-center gap-2 text-emerald-400 font-medium">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Auth unit tests: Passed (DEMO)</span>
                      </div>
                      <div className="flex items-center gap-2 text-amber-400 font-medium">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Revocation suite: Pending (DEMO)</span>
                      </div>
                    </>
                  ) : activeMilestone?.aiReport ? (
                    <div className="flex items-center gap-2 text-emerald-400 font-medium">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>AI Verification Score: {metrics.overallSupport}%</span>
                    </div>
                  ) : (
                    <div className="text-slate-400 text-xs">No automated test report recorded yet.</div>
                  )}
                </div>
              </div>
            </div>

            {/* PHASE 5: AI ANALYSIS PANEL (RIGHT 3 COLS) */}
            <div className="lg:col-span-3 rounded-2xl bg-[#111C30] border border-[#26344B] p-5 space-y-5 relative overflow-hidden">
              <div className="pb-2.5 border-b border-[#26344B]/60">
                <span className="text-xs sm:text-[13px] font-bold text-white uppercase tracking-wider">
                  AI Analysis Panel
                </span>
              </div>

              {/* Section A: What is Supported */}
              <div className="space-y-1.5 text-xs sm:text-sm">
                <span className="font-bold text-slate-200 text-xs sm:text-sm block">
                  What is Supported
                </span>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {(isGuest
                    ? ['JWT authentication flow validated (DEMO)', 'Role claims enforced in middleware (DEMO)']
                    : requirements.filter((r) => r.supportStatus === 'Green').map((r) => r.description)
                  ).length === 0 ? (
                    <li className="text-slate-400">No verified requirements recorded yet.</li>
                  ) : (
                    (isGuest
                      ? ['JWT authentication flow validated (DEMO)', 'Role claims enforced in middleware (DEMO)']
                      : requirements.filter((r) => r.supportStatus === 'Green').map((r) => r.description)
                    ).map((txt, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{txt}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              {/* Section B: What is Incomplete */}
              <div className="space-y-1.5 text-xs sm:text-sm pt-1.5 border-t border-[#26344B]/40">
                <span className="font-bold text-slate-200 text-xs sm:text-sm block">
                  What is Incomplete
                </span>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {(isGuest
                    ? ['Token revocation regression suite pending (DEMO)']
                    : requirements.filter((r) => r.supportStatus === 'Amber').map((r) => r.description)
                  ).length === 0 ? (
                    <li className="text-slate-400">None flagged.</li>
                  ) : (
                    (isGuest
                      ? ['Token revocation regression suite pending (DEMO)']
                      : requirements.filter((r) => r.supportStatus === 'Amber').map((r) => r.description)
                    ).map((txt, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>{txt}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              {/* Section C: What Evidence is Missing */}
              <div className="space-y-1.5 text-xs sm:text-sm pt-1.5 border-t border-[#26344B]/40">
                <span className="font-bold text-slate-200 text-xs sm:text-sm block">
                  What Evidence is Missing
                </span>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {(isGuest
                    ? ['Revocation integration test proof (DEMO)']
                    : requirements.filter((r) => r.supportStatus === 'Missing').map((r) => r.description)
                  ).length === 0 ? (
                    <li className="text-slate-400">No missing requirement evidence flagged.</li>
                  ) : (
                    (isGuest
                      ? ['Revocation integration test proof (DEMO)']
                      : requirements.filter((r) => r.supportStatus === 'Missing').map((r) => r.description)
                    ).map((txt, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-500 font-bold">•</span>
                        <span>{txt}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              {/* Section D: Suggested Next Steps */}
              <div className="space-y-1.5 text-xs sm:text-sm pt-1.5 border-t border-[#26344B]/40">
                <span className="font-bold text-slate-200 text-xs sm:text-sm block">
                  Suggested Next Steps
                </span>
                <ul className="space-y-1.5 text-xs text-blue-400 font-medium">
                  {isGuest ? (
                    <>
                      <li className="flex items-start gap-2">
                        <span>•</span>
                        <span>Add integration tests for token revocation (DEMO)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span>•</span>
                        <span>Submit deliverable for client sign-off (DEMO)</span>
                      </li>
                    </>
                  ) : (activeMilestone?.aiReport?.recommendations || []).length === 0 ? (
                    <li className="text-slate-400 font-normal">
                      Run AI verification on a milestone with a linked GitHub repo to view tailored next steps.
                    </li>
                  ) : (
                    (activeMilestone?.aiReport?.recommendations || []).map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span>•</span>
                        <span>{rec}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              {/* Decorative Sparkle Graphic (from reference image) */}
              <div className="absolute bottom-2 right-2 opacity-25 pointer-events-none">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" className="text-blue-300">
                  <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                </svg>
              </div>
            </div>
          </div>

          {/* PHASE 6: HUMAN REVIEW SECTION (FULL-WIDTH BOTTOM CARD) */}
          <div className="rounded-2xl bg-[#111C30] border border-[#26344B] p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Human Review Section
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Authorize milestone transition or request evidence before client sign-off.
                </p>
              </div>

              {/* Live Review Status Badge */}
              {reviewState === 'approved' && (
                <span className="px-3 py-1 rounded-lg bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 text-xs sm:text-sm font-bold flex items-center gap-2">
                  <Check className="w-4 h-4" /> Approved for Client Review
                </span>
              )}
              {reviewState === 'evidence_requested' && (
                <span className="px-3 py-1 rounded-lg bg-amber-950/70 text-amber-300 border border-amber-500/40 text-xs sm:text-sm font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Additional Evidence Requested
                </span>
              )}
              {reviewState === 'further_review' && (
                <span className="px-3 py-1 rounded-lg bg-blue-950/70 text-blue-300 border border-blue-500/40 text-xs sm:text-sm font-bold flex items-center gap-2">
                  <RotateCw className="w-4 h-4" /> Queued for Technical Audit
                </span>
              )}
            </div>

            {/* Three Action Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 pt-1.5">
              <button
                onClick={() => setApproveModalOpen(true)}
                disabled={reviewState === 'approved'}
                className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/30 transition-colors cursor-pointer"
              >
                Approve for Client Review
              </button>

              <button
                onClick={() => setRequestEvidenceModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-[#152238] hover:bg-[#1E2E4E] border border-[#26344B] text-slate-200 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                Request Additional Evidence
              </button>

              <button
                onClick={() => setFurtherReviewModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-[#152238] hover:bg-[#1E2E4E] border border-[#26344B] text-slate-200 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                Mark as Needing Further Review
              </button>
            </div>

            <div className="pt-2.5 border-t border-[#26344B]/40 text-xs text-slate-400">
              DevFlow Escrow Gate: Approving for client review does NOT trigger payment settlement. Invoices are dispatched solely after formal client sign-off.
            </div>
          </div>
        </main>

      {/* CONFIRMATION MODAL 1: APPROVE FOR CLIENT REVIEW */}
      {approveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-[#111C30] border border-[#26344B] shadow-2xl p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-[#26344B] pb-3">
              <h3 className="text-sm font-bold text-white">Approve for Client Review?</h3>
              <button
                onClick={() => setApproveModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1E2E4E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This confirms that <strong className="text-white">{selectedSprint}</strong> meets the 85% evidence threshold. The milestone will be marked ready for client sign-off.
            </p>
            <div className="p-3 rounded-xl bg-[#0C1524] border border-[#26344B] text-[11px] text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Scope:</span>
                <strong className="text-white">{selectedProject}</strong>
              </div>
              <div className="flex justify-between">
                <span>Evaluated:</span>
                <strong className="text-emerald-400">9 of 12 Criteria Verified</strong>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setApproveModalOpen(false)}
                className="px-3.5 py-2 rounded-lg bg-[#152238] hover:bg-[#1E2E4E] text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveForClientReview}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-blue-600/30"
              >
                {isSubmitting ? 'Recording...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: REQUEST ADDITIONAL EVIDENCE */}
      {requestEvidenceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-[#111C30] border border-[#26344B] shadow-2xl p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-[#26344B] pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Request Additional Evidence</h3>
              </div>
              <button
                onClick={() => setRequestEvidenceModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1E2E4E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Detail specific missing unit test suites, PR links, or architectural diagrams required before verification:
            </p>
            <textarea
              value={evidenceFeedback}
              onChange={(e) => setEvidenceFeedback(e.target.value)}
              placeholder="e.g. Unit test results for session protection are missing. Please link PR #108 with passing test coverage."
              className="w-full h-28 px-3 py-2 rounded-xl bg-[#0C1524] border border-[#26344B] text-white text-xs focus:outline-hidden focus:border-blue-500 resize-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRequestEvidenceModalOpen(false)}
                className="px-3.5 py-2 rounded-lg bg-[#152238] hover:bg-[#1E2E4E] text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestAdditionalEvidence}
                disabled={!evidenceFeedback.trim() || isSubmitting}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Request</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL 3: MARK AS NEEDING FURTHER REVIEW */}
      {furtherReviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-[#111C30] border border-[#26344B] shadow-2xl p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-[#26344B] pb-3">
              <h3 className="text-sm font-bold text-white">Mark for Secondary Audit?</h3>
              <button
                onClick={() => setFurtherReviewModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1E2E4E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This milestone will remain held in the verification queue for escalated technical review. Client invoices will stay locked.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setFurtherReviewModalOpen(false)}
                className="px-3.5 py-2 rounded-lg bg-[#152238] hover:bg-[#1E2E4E] text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkNeedingFurtherReview}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold"
              >
                Confirm Hold
              </button>
            </div>
          </div>
        </div>
      )}

      {/* USER PROFILE MODAL */}
      {userMenuOpen && (
        <div className="fixed bottom-16 left-4 z-50 w-56 rounded-xl bg-[#111C30] border border-[#26344B] shadow-2xl p-3 text-xs space-y-2 animate-in fade-in duration-150">
          <div className="font-bold text-white border-b border-[#26344B] pb-2">
            {isGuest ? 'Client Guest' : user?.name || 'Client Account'}
            <div className="text-[10px] text-slate-400 font-normal">
              {isGuest ? 'DEMO MODE \u2022 Client Review Preview' : user?.organization || 'Client Workspace'}
            </div>
          </div>
          {!isGuest && (
            <button
              onClick={() => {
                setUserMenuOpen(false);
                navigate('/settings');
              }}
              className="w-full text-left py-1 text-slate-300 hover:text-white"
            >
              Account Preferences
            </button>
          )}
          <button
            onClick={async () => {
              setUserMenuOpen(false);
              await logout();
              navigate('/login/client', { replace: true });
            }}
            className="w-full text-left py-1 text-rose-400 hover:text-rose-300"
          >
            {isGuest ? 'Exit Demo Mode' : 'Sign Out'}
          </button>
        </div>
      )}

      <GuestGuardModal
        isOpen={isGuestGuardOpen}
        onClose={() => setIsGuestGuardOpen(false)}
        actionTitle={guardActionTitle}
        message="Approving milestones and requesting deliverable changes are disabled in Guest Demo Mode."
      />
    </div>
  );
};
