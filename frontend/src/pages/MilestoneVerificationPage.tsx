import { DevFlowLogo } from '@/components/common';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderGit2,
  FileCode,
  ShieldCheck,
  Users,
  Settings,
  Bell,
  User,
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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Milestone Selector States
  const [selectedProject, setSelectedProject] = useState('Project Alpha v1.2');
  const [selectedSprint, setSelectedSprint] = useState('Sprint 8 - Backend API');

  // Live Data & Telemetry
  const [, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
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
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (title: string, desc: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, mRes] = await Promise.all([
        devFlowApi.getProjects(),
        devFlowApi.getMilestones(),
      ]);
      setProjects(pRes.data);
      setMilestones(mRes.data);
    } catch (err) {
      console.error('Failed to load milestone verification data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Requirement Analysis Rows
  const requirements: RequirementAnalysisItem[] = [
    {
      id: 'req-1',
      description: 'Implement user authentication with JWT',
      evidenceRef: 'commit: 8d49432',
      supportStatus: 'Green',
      confidence: 'High Confidence',
      shortExplanation: 'AI Explanation Implement user authenticatio with JWT. Implemes user cap...',
      fullExplanation:
        'Implementation fully supports user authentication with JWT. Validates token signatures, enforces expiration bounds, and securely reads private keys via environment variables.',
      matchedCommits: ['8d494325368', '3e41b99a81c'],
      testStatus: 'passed',
    },
    {
      id: 'req-2',
      description: 'Implement user authentication with astovints',
      evidenceRef: 'commit: 5a2b109',
      supportStatus: 'Amber',
      confidence: 'High Confidence',
      shortExplanation: 'AI Explanation Implement user authenticatio with JWT. Implemes user cap...',
      fullExplanation:
        'Access token renewal endpoints are partially covered. Token exchange operates as expected, but background blacklisting on revocation requires additional test coverage.',
      matchedCommits: ['5a2b109f42c'],
      testStatus: 'pending',
    },
    {
      id: 'req-3',
      description: 'Implement user authentication with proauentication',
      evidenceRef: 'commit: 7c1e884',
      supportStatus: 'Amber',
      confidence: 'High Confidence',
      shortExplanation: 'AI Explanation Implement user authenticatio with JWT. Implemes user cap...',
      fullExplanation:
        'Protection layer implements basic IP rate limiting. Session hijack defense is implemented at router level but lacks automated regression suite validation.',
      matchedCommits: ['7c1e884d09a'],
      testStatus: 'pending',
    },
    {
      id: 'req-4',
      description: 'Implement user authentication with userausers',
      evidenceRef: 'commit: 9f03c11',
      supportStatus: 'Amber',
      confidence: 'High Confidence',
      shortExplanation: 'AI Explanation Implement user authenticatio with JWT. Implemes user cap...',
      fullExplanation:
        'User roles and authorization claims are parsed in JWT payloads. Admin role escalation barriers are in place; client-level scopes require sign-off.',
      matchedCommits: ['9f03c11e741'],
      testStatus: 'passed',
    },
    {
      id: 'req-5',
      description: 'Implement user authentication with from user.',
      evidenceRef: 'commit: 2d88b40',
      supportStatus: 'Amber',
      confidence: 'High Confidence',
      shortExplanation: 'AI Explanation Implement user authenticatio with JWT. Implemes user cap...',
      fullExplanation:
        'Granular resource permission checks mapped against user identity. Minor documentation gaps identified in OpenAPI route declarations.',
      matchedCommits: ['2d88b40a359'],
      testStatus: 'passed',
    },
  ];

  // Dynamic Metrics based on selected sprint
  const metrics = {
    requirementsEvaluated: 12,
    supportedRequirements: 9,
    partiallySupported: 2,
    missingEvidence: 1,
    overallSupport: 85,
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
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#080D18] text-white">
        <div className="flex items-center gap-2.5 text-xs text-slate-400 font-mono">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] animate-ping" />
          <span>Loading Milestone Verification Engine...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-30 flex bg-[#080D18] text-[#F8FAFC] font-sans antialiased overflow-hidden select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[70] flex items-center gap-3 px-4 py-3 rounded-xl bg-[#111C30] border border-[#2563EB]/40 shadow-xl shadow-blue-900/30 text-xs animate-in fade-in slide-in-from-top duration-200">
          <span
            className={`w-2 h-2 rounded-full ${
              toastMessage.type === 'success'
                ? 'bg-emerald-400'
                : toastMessage.type === 'error'
                ? 'bg-rose-400'
                : 'bg-blue-400'
            }`}
          />
          <div>
            <div className="font-bold text-white">{toastMessage.title}</div>
            <div className="text-slate-400 text-[11px]">{toastMessage.desc}</div>
          </div>
        </div>
      )}

      {/* 1. FIXED DARK ENTERPRISE SIDEBAR (Matching reference: Dashboard, Projects, Repositories, Verification, Team) */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-60 bg-[#101A2D] border-r border-[#26344B] flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex-1 overflow-y-auto py-5 px-3 space-y-6">
          {/* Logo Header */}
          <div className="flex items-center justify-between px-3">
            <div
              onClick={() => navigate('/')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <DevFlowLogo variant="horizontal" theme="light" size="sm" />
            </div>
            {/* Mobile Close Button */}
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1E2E4E]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <div className="space-y-1.5 text-xs">
            <button
              onClick={() => {
                setMobileSidebarOpen(false);
                navigate('/dashboard');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#152238] transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-slate-400" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => {
                setMobileSidebarOpen(false);
                navigate('/projects');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#152238] transition-colors"
            >
              <FolderGit2 className="w-4 h-4 text-slate-400" />
              <span>Projects</span>
            </button>

            <button
              onClick={() => {
                setMobileSidebarOpen(false);
                navigate('/evidence');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#152238] transition-colors"
            >
              <FileCode className="w-4 h-4 text-slate-400" />
              <span>Repositories</span>
            </button>

            {/* Verification Active Pill */}
            <button
              onClick={() => {
                setMobileSidebarOpen(false);
                navigate('/milestone-verification');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#2563EB] text-white font-semibold shadow-md shadow-blue-600/30"
            >
              <ShieldCheck className="w-4 h-4 text-white" />
              <span>Verification</span>
            </button>

            <button
              onClick={() => {
                setMobileSidebarOpen(false);
                showToast('Team Roster', 'Viewing 4 active contributors for Project Alpha.', 'info');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#152238] transition-colors"
            >
              <Users className="w-4 h-4 text-slate-400" />
              <span>Team</span>
            </button>
          </div>
        </div>

        {/* Sidebar Bottom Nav (settings, Notifications, User) */}
        <div className="p-3 border-t border-[#26344B] space-y-1 text-xs">
          <button
            onClick={() => navigate('/settings')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#152238] transition-colors"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>settings</span>
          </button>

          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#152238] transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-slate-400" />
              <span>Notifications</span>
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          </button>

          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#152238] transition-colors"
          >
            <User className="w-4 h-4 text-slate-400" />
            <span>User</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* 2. MAIN CONTENT VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* PHASE 1: PAGE HEADER & MILESTONE SELECTOR */}
        <header className="px-4 sm:px-8 pt-5 pb-4 border-b border-[#26344B] bg-[#0A101D] shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-[#152238] rounded-lg"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-none">
                  Milestone Verification
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Review AI-generated evidence assessments and milestone requirements.
                </p>
              </div>
            </div>

            {/* Quick Link to AI Agents page if user wants pipeline view */}
            <button
              onClick={() => navigate('/verification')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111C30] hover:bg-[#152238] border border-[#26344B] text-xs text-blue-400 font-medium transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Agents Pipeline</span>
            </button>
          </div>

          {/* Milestone Selector Section */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Milestone Selector
            </span>
            <div className="flex flex-wrap items-center gap-3">
              {/* Project Dropdown */}
              <div className="relative min-w-[200px]">
                <select
                  value={selectedProject}
                  onChange={(e) => {
                    setSelectedProject(e.target.value);
                    showToast('Project Selected', `Loaded verification scope for ${e.target.value}.`, 'info');
                  }}
                  className="w-full bg-[#111C30] text-xs font-semibold text-white px-3.5 py-2 rounded-lg border border-[#26344B] focus:border-blue-500 focus:outline-hidden appearance-none cursor-pointer pr-8"
                >
                  <option value="Project Alpha v1.2">Project Alpha v1.2</option>
                  <option value="Apollo Portal">Apollo Portal</option>
                  <option value="Project Nova">Project Nova</option>
                  <option value="Aether Platform">Aether Platform</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Sprint Dropdown */}
              <div className="relative min-w-[220px]">
                <select
                  value={selectedSprint}
                  onChange={(e) => {
                    setSelectedSprint(e.target.value);
                    showToast('Sprint Selected', `Telemetry synchronized for ${e.target.value}.`, 'info');
                  }}
                  className="w-full bg-[#111C30] text-xs font-semibold text-white px-3.5 py-2 rounded-lg border border-[#26344B] focus:border-blue-500 focus:outline-hidden appearance-none cursor-pointer pr-8"
                >
                  <option value="Sprint 8 - Backend API">Sprint 8 - Backend API</option>
                  <option value="Sprint 7 - Auth Gateway">Sprint 7 - Auth Gateway</option>
                  <option value="Sprint 9 - PayPal Settlements">Sprint 9 - PayPal Settlements</option>
                  <option value="Sprint 10 - Enterprise Audit">Sprint 10 - Enterprise Audit</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Dashboard Body */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-5 space-y-5">
          {/* PHASE 2: VERIFICATION SUMMARY CARD */}
          <div className="rounded-xl bg-[#111C30] border border-[#26344B] p-4 sm:p-5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
              Verification Summary
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 items-center">
              {/* 1. Requirements Evaluated */}
              <div className="space-y-1">
                <span className="text-xs text-slate-400 block font-medium">Requirements Evaluated</span>
                <div className="text-2xl font-bold text-white font-mono">
                  {metrics.requirementsEvaluated}
                </div>
              </div>

              {/* 2. Supported Requirements */}
              <div className="space-y-1">
                <span className="text-xs text-slate-400 block font-medium">Supported Requirements</span>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-2xl font-bold text-white font-mono">
                    {metrics.supportedRequirements}
                  </span>
                </div>
              </div>

              {/* 3. Partially Supported */}
              <div className="space-y-1">
                <span className="text-xs text-slate-400 block font-medium">Partially Supported</span>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="text-2xl font-bold text-white font-mono">
                    {metrics.partiallySupported}
                  </span>
                </div>
              </div>

              {/* 4. Missing Evidence */}
              <div className="space-y-1">
                <span className="text-xs text-slate-400 block font-medium">Missing Evidence</span>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-[8px] font-bold text-amber-400">
                    !
                  </div>
                  <span className="text-2xl font-bold text-white font-mono">
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
            <div className="lg:col-span-6 rounded-xl bg-[#111C30] border border-[#26344B] overflow-hidden flex flex-col justify-between">
              <div>
                <div className="px-4 py-3 border-b border-[#26344B] bg-[#0C1524] flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Requirement Analysis
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    5 Criteria
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#26344B] text-[10px] text-slate-400 uppercase tracking-wider bg-[#0C1524]/60">
                        <th className="py-2.5 px-3 font-semibold">Description</th>
                        <th className="py-2.5 px-2 font-semibold text-center">Evidence Reference</th>
                        <th className="py-2.5 px-2 font-semibold">Evidence Support Status</th>
                        <th className="py-2.5 px-2 font-semibold">Confidence Indicator</th>
                        <th className="py-2.5 px-3 font-semibold">AI Explanation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#26344B]/40">
                      {requirements.map((req) => {
                        const isExpanded = !!expandedRows[req.id];
                        return (
                          <React.Fragment key={req.id}>
                            <tr
                              onClick={() => toggleRow(req.id)}
                              className="hover:bg-[#152238]/60 transition-colors cursor-pointer group"
                            >
                              {/* Description */}
                              <td className="py-3 px-3 max-w-[150px] font-medium text-slate-200 leading-snug">
                                {req.description}
                              </td>

                              {/* Evidence Reference Icon */}
                              <td className="py-3 px-2 text-center whitespace-nowrap">
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
                                  <RotateCw className="w-3 h-3" />
                                </span>
                              </td>

                              {/* Support Status Badge */}
                              <td className="py-3 px-2 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                    req.supportStatus === 'Green'
                                      ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-500/30'
                                      : 'bg-amber-950/70 text-amber-400 border border-amber-500/30'
                                  }`}
                                >
                                  {req.supportStatus === 'Green' ? (
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                  ) : (
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                  )}
                                  <span>{req.supportStatus}</span>
                                </span>
                              </td>

                              {/* Confidence Indicator */}
                              <td className="py-3 px-2 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">{req.confidence}</span>
                                </span>
                              </td>

                              {/* AI Explanation / Accordion trigger */}
                              <td className="py-3 px-3 text-slate-300">
                                <div className="flex items-center justify-between gap-1 max-w-[150px]">
                                  <span className="truncate text-[11px] text-slate-400">
                                    {req.shortExplanation}
                                  </span>
                                  {isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  )}
                                </div>
                              </td>
                            </tr>

                            {/* Expanded Explanation Accordion */}
                            {isExpanded && (
                              <tr className="bg-[#0C1524]">
                                <td colSpan={5} className="p-3 text-xs text-slate-300 border-b border-[#26344B]">
                                  <div className="space-y-2 p-2.5 rounded-lg bg-[#111C30] border border-[#26344B]/80">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                                        Full AST Evaluation Proof
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        Evidence: {req.evidenceRef}
                                      </span>
                                    </div>
                                    <p className="text-[11px] leading-relaxed text-slate-300">
                                      {req.fullExplanation}
                                    </p>
                                    {req.matchedCommits && (
                                      <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400 font-mono">
                                        <span>Matched Commit Hashes:</span>
                                        {req.matchedCommits.map((sha) => (
                                          <span
                                            key={sha}
                                            className="px-1.5 py-0.5 rounded bg-[#152238] text-slate-200 border border-[#26344B]"
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

              <div className="p-3 bg-[#0C1524] border-t border-[#26344B] flex items-center justify-between text-[11px] text-slate-400">
                <span>Click any row to inspect complete syntactic proof.</span>
                <span className="font-mono text-emerald-400">100% Evaluated</span>
              </div>
            </div>

            {/* PHASE 4: EVIDENCE PANEL (MIDDLE 3 COLS) */}
            <div className="lg:col-span-3 rounded-xl bg-[#111C30] border border-[#26344B] p-4 space-y-4">
              <div className="pb-2 border-b border-[#26344B]/60">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Evidence Panel
                </span>
              </div>

              {/* Subsection A: Commit References */}
              <div className="space-y-1.5 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Commit References
                </span>
                <div className="p-2.5 rounded-lg bg-[#0C1524] border border-[#26344B] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-blue-400 font-semibold">
                      commit: 8d494325368
                    </span>
                    <button
                      onClick={() => handleCopySha('8d494325368')}
                      className="px-1.5 py-0.5 rounded bg-[#152238] border border-[#26344B] text-[10px] text-slate-300 hover:text-white flex items-center gap-1 font-mono"
                      title="Copy full commit SHA"
                    >
                      {copiedSha === '8d494325368' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>protocol</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Author: <span className="text-white font-medium">Dackerd Alpha</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Timestamp: 8 Jul 2024 11:33:47
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    Commit message: Implement user auth...
                  </div>
                </div>
              </div>

              {/* Subsection B: Changed Files */}
              <div className="space-y-1.5 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Changed Files
                </span>
                <div className="p-2.5 rounded-lg bg-[#0C1524] border border-[#26344B] space-y-1 font-mono text-[11px] text-slate-300">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>changed.iss</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>document.php</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>cooument.json</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>changed.log</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>changed.me</span>
                  </div>
                </div>
              </div>

              {/* Subsection C: Test Results */}
              <div className="space-y-1.5 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Test Results
                </span>
                <div className="p-2.5 rounded-lg bg-[#0C1524] border border-[#26344B] space-y-1.5 text-[11px]">
                  <div className="flex items-center gap-2 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Test results: high</span>
                  </div>
                  <div className="flex items-center gap-2 text-amber-400 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Test results: missind</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Test results: high</span>
                  </div>
                </div>
              </div>
            </div>

            {/* PHASE 5: AI ANALYSIS PANEL (RIGHT 3 COLS) */}
            <div className="lg:col-span-3 rounded-xl bg-[#111C30] border border-[#26344B] p-4 space-y-4 relative overflow-hidden">
              <div className="pb-2 border-b border-[#26344B]/60">
                <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                  AI Analysis Panel
                </span>
              </div>

              {/* Section A: What is Supported */}
              <div className="space-y-1 text-xs">
                <span className="font-bold text-slate-200 text-xs block">
                  What is Supported
                </span>
                <ul className="space-y-1 text-[11px] text-slate-300">
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>What is supported</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>What is supported</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>What is user supported</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>What is auchentication</span>
                  </li>
                </ul>
              </div>

              {/* Section B: What is Incomplete */}
              <div className="space-y-1 text-xs pt-1 border-t border-[#26344B]/40">
                <span className="font-bold text-slate-200 text-xs block">
                  What is Incomplete
                </span>
                <ul className="space-y-1 text-[11px] text-slate-300">
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>What is Incomplete</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>What is Incomplete</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>What is Incompliate Missing</span>
                  </li>
                </ul>
              </div>

              {/* Section C: What Evidence is Missing */}
              <div className="space-y-1 text-xs pt-1 border-t border-[#26344B]/40">
                <span className="font-bold text-slate-200 text-xs block">
                  What Evidence is Missing
                </span>
                <ul className="space-y-1 text-[11px] text-slate-300">
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-500 font-bold">•</span>
                    <span>What Evidence is Missing</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-500 font-bold">•</span>
                    <span>What Evidence is Missing Missing</span>
                  </li>
                </ul>
              </div>

              {/* Section D: Suggested Next Steps */}
              <div className="space-y-1 text-xs pt-1 border-t border-[#26344B]/40">
                <span className="font-bold text-slate-200 text-xs block">
                  Suggested Next Steps
                </span>
                <ul className="space-y-1 text-[11px] text-blue-400 font-medium">
                  <li className="flex items-start gap-1.5 hover:text-white cursor-pointer transition-colors">
                    <span>•</span>
                    <span>Suggested struse of Client Review</span>
                  </li>
                  <li className="flex items-start gap-1.5 hover:text-white cursor-pointer transition-colors">
                    <span>•</span>
                    <span>Request libed Next Steps</span>
                  </li>
                  <li className="flex items-start gap-1.5 hover:text-white cursor-pointer transition-colors">
                    <span>•</span>
                    <span>Suggested Next Steps for confidences</span>
                  </li>
                </ul>
              </div>

              {/* Decorative Sparkle Graphic (from reference image) */}
              <div className="absolute bottom-2 right-2 opacity-25 pointer-events-none">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" className="text-blue-300">
                  <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                </svg>
              </div>
            </div>
          </div>

          {/* PHASE 6: HUMAN REVIEW SECTION (FULL-WIDTH BOTTOM CARD) */}
          <div className="rounded-xl bg-[#111C30] border border-[#26344B] p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white tracking-wide">
                  Human Review Section
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Authorize milestone transition or request evidence before client sign-off.
                </p>
              </div>

              {/* Live Review Status Badge */}
              {reviewState === 'approved' && (
                <span className="px-2.5 py-1 rounded-md bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> Approved for Client Review
                </span>
              )}
              {reviewState === 'evidence_requested' && (
                <span className="px-2.5 py-1 rounded-md bg-amber-950/70 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> Additional Evidence Requested
                </span>
              )}
              {reviewState === 'further_review' && (
                <span className="px-2.5 py-1 rounded-md bg-blue-950/70 text-blue-300 border border-blue-500/40 text-xs font-bold flex items-center gap-1.5">
                  <RotateCw className="w-3.5 h-3.5" /> Queued for Technical Audit
                </span>
              )}
            </div>

            {/* Three Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={() => setApproveModalOpen(true)}
                disabled={reviewState === 'approved'}
                className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-colors"
              >
                Approve for Client Review
              </button>

              <button
                onClick={() => setRequestEvidenceModalOpen(true)}
                className="px-4 py-2 rounded-lg bg-[#152238] hover:bg-[#1E2E4E] border border-[#26344B] text-slate-200 text-xs font-medium transition-colors"
              >
                Request Additional Evidence
              </button>

              <button
                onClick={() => setFurtherReviewModalOpen(true)}
                className="px-4 py-2 rounded-lg bg-[#152238] hover:bg-[#1E2E4E] border border-[#26344B] text-slate-200 text-xs font-medium transition-colors"
              >
                Mark as Needing Further Review
              </button>
            </div>

            <div className="pt-2 border-t border-[#26344B]/40 text-[10px] text-slate-400">
              DevFlow Escrow Gate: Approving for client review does NOT trigger payment settlement. Invoices are dispatched solely after formal client sign-off.
            </div>
          </div>
        </main>
      </div>

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
            Alex Mercer
            <div className="text-[10px] text-slate-400 font-normal">Lead Verification Auditor</div>
          </div>
          <button
            onClick={() => {
              setUserMenuOpen(false);
              navigate('/settings');
            }}
            className="w-full text-left py-1 text-slate-300 hover:text-white"
          >
            Account Preferences
          </button>
          <button
            onClick={() => {
              setUserMenuOpen(false);
              navigate('/');
            }}
            className="w-full text-left py-1 text-rose-400 hover:text-rose-300"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};
