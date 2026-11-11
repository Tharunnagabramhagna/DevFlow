import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from '@/contexts/SidebarContext';
import {
        Sparkles,
      Bell,
  ChevronDown,
  ChevronUp,
  FileSearch,
  Cpu,
  Wallet,
  Activity,
  ArrowRight,
  CheckCircle,
  Clock,
  RotateCw,
  ExternalLink,
  ShieldAlert,
  X,
  Menu,
  Terminal,
  FileCode,
  Check,
} from 'lucide-react';
import { devFlowApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { GuestGuardModal } from '@/components/common';
import { Milestone, Project } from '@/types';

// Octocat GitHub SVG Icon
const GitHubIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

// Types for Executions and Logs
interface AgentExecution {
  id: string;
  name: string;
  project: string;
  agent: string;
  status: 'SUCCESS' | 'FAILED' | 'RUNNING';
  statusCodeDesc: string;
  timestamp: string;
  fullDate: string;
}

interface ActivityItem {
  id: string;
  timeAgo: string;
  agentName: string;
  description: string;
}

export const VerificationPage: React.FC = () => {
  const navigate = useNavigate();

  // Navigation & UI States
  const { openMobileSidebar } = useSidebar();
  const { isGuest, isClient } = useAuth();
  const [isGuestGuardOpen, setIsGuestGuardOpen] = useState(false);
  const [guardActionTitle, setGuardActionTitle] = useState('AI Verification Action');
  const [activeTab, setActiveTab] = useState<'recent' | 'projects' | 'agents'>('recent');
  const [selectedAgentModal, setSelectedAgentModal] = useState<string | null>(null);
  const [approvalAccordionOpen, setApprovalAccordionOpen] = useState(true);
  const [changesModalOpen, setChangesModalOpen] = useState(false);
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [changesFeedback, setChangesFeedback] = useState('');
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const [, setToastMessage] = useState<{ title: string; desc: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Sample data vs Live mode state
  const [sampleDataMode, setSampleDataMode] = useState<'sample' | 'live'>('sample');
  const [sampleDataDropdownOpen, setSampleDataDropdownOpen] = useState(false);

  // Live Data & Loading
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Approval status state for the interactive card
  const [approvalState, setApprovalState] = useState<'pending' | 'approved' | 'changes_requested'>('pending');

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
      const [mRes, pRes] = await Promise.all([
        devFlowApi.getMilestones(),
        devFlowApi.getProjects(),
      ]);
      setMilestones(mRes.data);
      setProjects(pRes.data);
    } catch (err) {
      console.error('Failed to load telemetry for AI Agents:', err);
    } finally {
      setLoading(false);
    }
  };

  // Execution Records for Left Main Table
  const executionRecords: AgentExecution[] = [
    {
      id: 'exec-1',
      name: 'Milestone 3 #33',
      project: 'Project Nova',
      agent: 'Analyzer',
      status: 'SUCCESS',
      statusCodeDesc: 'Status codes: 200, mtins and logs',
      timestamp: '10 Apr 28 20:06:39',
      fullDate: '2026-04-28 20:06:39 UTC',
    },
    {
      id: 'exec-2',
      name: 'Milestone 3 #39',
      project: 'Project Nova',
      agent: 'GitHub',
      status: 'FAILED',
      statusCodeDesc: 'Status codes: 200, mtins and logs',
      timestamp: '10 Apr 25 22:02:38',
      fullDate: '2026-04-25 22:02:38 UTC',
    },
    {
      id: 'exec-3',
      name: 'Milestone 3 #39',
      project: 'Project Nova',
      agent: 'Milestone',
      status: 'RUNNING',
      statusCodeDesc: 'Status codes: 400, ntins and logs',
      timestamp: '10 Apr 23 20:06:37',
      fullDate: '2026-04-23 20:06:37 UTC',
    },
    {
      id: 'exec-4',
      name: 'Milestone 3 #39',
      project: 'Project Nova',
      agent: 'Milestone',
      status: 'RUNNING',
      statusCodeDesc: 'Status codes: 200, ntins and logs',
      timestamp: '10 Apr 25 20:07:42',
      fullDate: '2026-04-25 20:07:42 UTC',
    },
  ];

  // Right Panel Compact Recent Executions
  const rightRecentExecutions = [
    {
      id: 'r-exec-1',
      execution: 'Agreement N1',
      agent: 'Project Nova',
      status: 'SUCCESS',
      statusDesc: 'Status codes: 420 logs',
      time: '13 hours ago',
    },
    {
      id: 'r-exec-2',
      execution: 'Milestone #2',
      agent: 'Aether',
      status: 'FAILED',
      statusDesc: 'Status codes: 4381 Logs: Error: not failed successfull...',
      time: '12 hours ago',
    },
  ];

  // Activity Log Timeline items
  const activityLogs: ActivityItem[] = [
    {
      id: 'act-1',
      timeAgo: '16h ago',
      agentName: 'Agreement Analyzer',
      description: 'completed M1 structuring for Project Nova',
    },
    {
      id: 'act-2',
      timeAgo: '18h ago',
      agentName: 'GitHub Evidence Agent',
      description: 'mapped 15 commits to PR #39 to illustrative',
    },
    {
      id: 'act-3',
      timeAgo: '16h ago',
      agentName: 'Agreement Analyzer',
      description: 'completed M1 structuring Project Nova',
    },
    {
      id: 'act-4',
      timeAgo: '10h ago',
      agentName: 'Agreement Analyzer',
      description: 'completed M1 Project Not #29',
    },
    {
      id: 'act-5',
      timeAgo: '10h ago',
      agentName: 'GitHub Evidence Agent',
      description: 'mapped 15 commits to PR #39',
    },
  ];

  // Filtered executions based on active tab
  const displayedExecutions = executionRecords.filter((record) => {
    if (activeTab === 'projects') return record.project === 'Project Nova';
    if (activeTab === 'agents') return record.agent !== '';
    return true;
  });

  // Action Handlers
  const handleApproveAndPay = async () => {
    if (isGuest) {
      setGuardActionTitle('Approve & Dispatch Verification');
      setIsGuestGuardOpen(true);
      return;
    }
    if (!isClient) {
      setApprovalState('approved');
      showToast(
        'Evidence Submitted for Client Review',
        'AI verification packet dispatched. Client sign-off is required before invoice creation.',
        'info'
      );
      return;
    }
    setIsSubmittingApproval(true);
    try {
      const targetMilestone = milestones[0];
      if (targetMilestone) {
        await devFlowApi.submitClientApproval(targetMilestone.id, 'approved', 'Client accepted AI verification.');
      }
      setApprovalState('approved');
      showToast('Approved & Prepared for Invoice', 'Human approval logged. Payment preparation is ready.', 'success');
    } catch {
      showToast('Approval Failed', 'Could not record approval state.', 'error');
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const handleRequestChanges = async () => {
    if (isGuest) {
      setChangesModalOpen(false);
      setGuardActionTitle('Request Changes');
      setIsGuestGuardOpen(true);
      return;
    }
    if (!changesFeedback.trim()) return;
    setIsSubmittingApproval(true);
    try {
      const targetMilestone = milestones[0];
      if (targetMilestone) {
        await devFlowApi.submitClientApproval(targetMilestone.id, 'changes_requested', changesFeedback);
      }
      setApprovalState('changes_requested');
      setChangesModalOpen(false);
      setChangesFeedback('');
      showToast('Changes Requested', 'Feedback dispatched to developer and agent queue.', 'info');
    } catch {
      showToast('Action Failed', 'Could not dispatch feedback.', 'error');
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#080D18] text-white">
        <div className="flex items-center gap-2.5 text-xs text-slate-400 font-mono">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] animate-ping" />
          <span>Synchronizing DevFlow AI Agent Telemetry...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 px-4 sm:px-6 lg:px-8 border-b border-[#26344B] bg-[#0A101D] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={openMobileSidebar}
              className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-[#152238] rounded-xl"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-heading text-lg sm:text-xl font-extrabold text-white tracking-tight leading-none">
                AI Agents
              </h1>
              <p className="font-sans text-xs text-slate-400 mt-1 hidden sm:block">
                Your intelligent workforce for project analysis and payment workflows.
              </p>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 text-slate-300 hover:text-white hover:bg-[#152238] rounded-xl relative transition-colors"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#0A101D]" />
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-[#111C30] border border-[#26344B] rounded-2xl shadow-2xl p-4 z-50 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b border-[#26344B] pb-2.5 font-bold text-white text-sm">
                    <span>Agent Activity Notifications</span>
                    <button
                      onClick={() => setNotificationsOpen(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#152238] text-xs text-slate-300">
                    <span className="font-semibold text-blue-400">GitHub Evidence Agent</span> mapped 15 commits for Project Nova.
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#152238] text-xs text-slate-300">
                    <span className="font-semibold text-emerald-400">Milestone Intelligence</span> verified AST syntax for V1.1.
                  </div>
                </div>
              )}
            </div>

            {/* User Profile & Sample Data Dropdown */}
            <div className="relative">
              <button
                onClick={() => setSampleDataDropdownOpen(!sampleDataDropdownOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#111C30] hover:bg-[#152238] border border-[#26344B] transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">
                  TM
                </div>
                <span className="text-xs font-semibold text-slate-200 whitespace-nowrap">
                  {sampleDataMode === 'sample' ? 'Sample data' : 'Live API'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {sampleDataDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#111C30] border border-[#26344B] rounded-2xl shadow-2xl p-2.5 z-50 space-y-1.5 text-xs">
                  <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Data Environment
                  </div>
                  <button
                    onClick={() => {
                      setSampleDataMode('sample');
                      setSampleDataDropdownOpen(false);
                      showToast('Environment: Sample Data', 'Loaded illustrative sandbox agent telemetry.', 'info');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                      sampleDataMode === 'sample'
                        ? 'bg-[#2563EB] text-white font-medium'
                        : 'text-slate-300 hover:bg-[#152238]'
                    }`}
                  >
                    <span className="text-xs sm:text-sm">Sample Data (Mock)</span>
                    {sampleDataMode === 'sample' && <Check className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => {
                      setSampleDataMode('live');
                      setSampleDataDropdownOpen(false);
                      loadData();
                      showToast('Environment: Live API', 'Querying backend service /api endpoints.', 'success');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                      sampleDataMode === 'live'
                        ? 'bg-[#2563EB] text-white font-medium'
                        : 'text-slate-300 hover:bg-[#152238]'
                    }`}
                  >
                    <span className="text-xs sm:text-sm">Live Backend API</span>
                    {sampleDataMode === 'live' && <Check className="w-4 h-4" />}
                  </button>
                  <div className="pt-1.5 border-t border-[#26344B]/60 text-xs text-slate-400 px-2 leading-tight">
                    Explicitly distinguishes mock hackathon data from connected backend states.
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Dashboard Body */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-7 py-5 space-y-6 max-w-[1600px] w-full mx-auto">
          {/* SECTION 1: AGENT OVERVIEW */}
          <div>
            <h2 className="font-heading text-base sm:text-lg font-bold text-white mb-3.5 tracking-wide">
              Agent Overview
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* CARD 1: Agreement Analyzer */}
              <div className="rounded-2xl bg-[#111C30] border border-[#26344B] p-5 flex flex-col justify-between hover:border-[#3B82F6]/50 transition-all">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-base">Agreement Analyzer</span>
                  </div>

                  {/* Icon illustration */}
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-[#16233B] border border-[#26344B] flex items-center justify-center my-2 shadow-inner">
                    <div className="relative">
                      <FileSearch className="w-9 h-9 text-[#60A5FA]" />
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#132A30] border border-emerald-500/30 text-xs">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <span>READY</span>
                    </div>
                    {/* Activity bars */}
                    <div className="flex items-end gap-1 h-3.5">
                      <span className="w-0.5 h-2 bg-emerald-400 rounded-xs" />
                      <span className="w-0.5 h-3.5 bg-emerald-400 rounded-xs" />
                      <span className="w-0.5 h-2 bg-emerald-400 rounded-xs" />
                    </div>
                  </div>

                  {/* Current Task Description */}
                  <div className="text-xs text-slate-400 leading-relaxed">
                    <span className="text-slate-300 font-medium block">Current Task</span>
                    <span>(No current task</span>
                    <br />
                    <span>Last executed: 10 mins ago)</span>
                  </div>
                </div>

                <div className="pt-3.5 border-t border-[#26344B]/60 mt-3.5">
                  <button
                    onClick={() => setSelectedAgentModal('analyzer')}
                    className="text-xs sm:text-sm font-semibold text-[#38BDF8] hover:text-white transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>

              {/* CARD 2: GitHub Evidence Agent */}
              <div className="rounded-2xl bg-[#111C30] border border-[#26344B] p-5 flex flex-col justify-between hover:border-[#3B82F6]/50 transition-all">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-base">GitHub Evidence Agent</span>
                  </div>

                  {/* Icon illustration */}
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-[#16233B] border border-[#26344B] flex items-center justify-center my-2 shadow-inner">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30">
                      <GitHubIcon className="w-8 h-8 text-white" />
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#132644] border border-blue-500/30 text-xs">
                    <div className="flex items-center gap-2 text-blue-400 font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
                      <span>ACTIVE</span>
                    </div>
                    <RotateCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                  </div>

                  {/* Current Task Description */}
                  <div className="text-xs text-slate-400 leading-relaxed">
                    <span className="text-slate-300 font-medium block">Current Task</span>
                    <span>Retrieving PR #42 for &apos;Aether Platform&apos;</span>
                  </div>
                </div>

                <div className="pt-3.5 border-t border-[#26344B]/60 mt-3.5">
                  <button
                    onClick={() => setSelectedAgentModal('github')}
                    className="text-xs sm:text-sm font-semibold text-[#38BDF8] hover:text-white transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>

              {/* CARD 3: Milestone Intelligence Agent */}
              <div className="rounded-2xl bg-[#111C30] border border-[#26344B] p-5 flex flex-col justify-between hover:border-[#3B82F6]/50 transition-all">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-base">Milestone Intelligence...</span>
                  </div>

                  {/* Icon illustration */}
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-[#16233B] border border-[#26344B] flex items-center justify-center my-2 shadow-inner">
                    <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                      <Cpu className="w-8 h-8 text-[#38BDF8]" />
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#2B2215] border border-amber-500/30 text-xs">
                    <div className="flex items-center gap-2 text-amber-400 font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span>STANDBY</span>
                    </div>
                    <span className="text-[11px] text-amber-400/80 font-medium">Amber idle</span>
                  </div>

                  {/* Current Task Description */}
                  <div className="text-xs text-slate-400 leading-relaxed">
                    <span className="text-slate-300 font-medium block">Current Task</span>
                    <span>Awaiting next trigger</span>
                  </div>
                </div>

                <div className="pt-3.5 border-t border-[#26344B]/60 mt-3.5">
                  <button
                    onClick={() => setSelectedAgentModal('milestone')}
                    className="text-xs sm:text-sm font-semibold text-[#38BDF8] hover:text-white transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>

              {/* CARD 4: Payment Assistant */}
              <div className="rounded-2xl bg-[#111C30] border border-[#26344B] p-5 flex flex-col justify-between hover:border-[#3B82F6]/50 transition-all">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-base">Payment Assistant</span>
                  </div>

                  {/* Icon illustration */}
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-[#16233B] border border-[#26344B] flex items-center justify-center my-2 shadow-inner">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                      <Wallet className="w-8 h-8 text-emerald-400" />
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#132A30] border border-emerald-500/30 text-xs">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <span>READY</span>
                    </div>
                  </div>

                  {/* Current Task Description */}
                  <div className="text-xs text-slate-400 leading-relaxed">
                    <span className="text-slate-300 font-medium block">Current Task</span>
                    <span>Preparing invoice information</span>
                  </div>
                </div>

                <div className="pt-3.5 border-t border-[#26344B]/60 mt-3.5">
                  <button
                    onClick={() => setSelectedAgentModal('payment')}
                    className="text-xs sm:text-sm font-semibold text-[#38BDF8] hover:text-white transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: AI WORKFLOW PIPELINE */}
          <div className="rounded-2xl bg-[#111C30] border border-[#26344B] p-5 sm:p-6">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-5">
              {/* STAGE 1: Agreement Analysis */}
              <div className="flex flex-col items-center text-center space-y-2.5 flex-1 w-full lg:w-auto">
                <div className="w-14 h-14 rounded-2xl bg-[#16233B] border border-[#26344B] flex items-center justify-center">
                  <FileSearch className="w-7 h-7 text-[#60A5FA]" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-slate-200">
                  Agreement Analysis
                </span>
                <span className="text-xs text-emerald-400 font-medium bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-500/30">
                  Complete
                </span>
              </div>

              {/* Connector 1 */}
              <div className="hidden lg:flex items-center justify-center flex-1">
                <div className="h-0.5 w-full bg-gradient-to-r from-blue-500 to-blue-400" />
                <ArrowRight className="w-4 h-4 text-blue-400 -ml-1 shrink-0" />
              </div>

              {/* STAGE 2: GitHub Evidence Retrieval */}
              <div className="flex flex-col items-center text-center space-y-2.5 flex-1 w-full lg:w-auto">
                <div className="w-14 h-14 rounded-2xl bg-[#16233B] border border-blue-500/40 flex items-center justify-center shadow-lg shadow-blue-500/10">
                  <GitHubIcon className="w-7 h-7 text-white" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-slate-200">
                  GitHub Evidence Retrieval
                </span>
                <span className="text-xs text-blue-400 font-medium bg-blue-950/40 px-2.5 py-1 rounded-md border border-blue-500/30 animate-pulse">
                  Active
                </span>
              </div>

              {/* Connector 2 */}
              <div className="hidden lg:flex items-center justify-center flex-1">
                <div className="h-0.5 w-full bg-gradient-to-r from-blue-400 to-cyan-400" />
                <ArrowRight className="w-4 h-4 text-cyan-400 -ml-1 shrink-0" />
              </div>

              {/* STAGE 3: Milestone Intelligence */}
              <div className="flex flex-col items-center text-center space-y-2.5 flex-1 w-full lg:w-auto">
                <div className="w-14 h-14 rounded-2xl bg-[#16233B] border border-[#26344B] flex items-center justify-center">
                  <Cpu className="w-7 h-7 text-[#38BDF8]" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-slate-200">
                  Milestone Intelligence
                </span>
                <span className="text-xs text-slate-400 font-medium bg-slate-800/40 px-2.5 py-1 rounded-md border border-slate-700">
                  Standby
                </span>
              </div>

              {/* Connector 3 */}
              <div className="hidden lg:flex items-center justify-center flex-1">
                <div className="h-0.5 w-full bg-gradient-to-r from-cyan-400 to-indigo-400" />
                <ArrowRight className="w-4 h-4 text-indigo-400 -ml-1 shrink-0" />
              </div>

              {/* STAGE 4: Human Approval */}
              <div className="flex flex-col items-center text-center space-y-2.5 flex-1 w-full lg:w-auto">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-[#16233B] border border-[#26344B] flex items-center justify-center overflow-hidden">
                    <div className="w-9 h-9 rounded-full bg-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold text-xs">
                      TM
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-black text-[10px] font-bold">
                    👍
                  </div>
                </div>
                <span className="text-xs sm:text-sm font-semibold text-slate-200">
                  Human Approval
                </span>
                <span className="text-xs text-amber-400 font-medium bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-500/30">
                  Pending Review
                </span>
              </div>

              {/* Connector 4 (Dotted Arrow to show Human Gate before payment release) */}
              <div className="hidden lg:flex items-center justify-center flex-1">
                <div className="h-0.5 w-full border-t border-dashed border-slate-500" />
                <ArrowRight className="w-4 h-4 text-slate-500 -ml-1 shrink-0" />
              </div>

              {/* STAGE 5: Payment Preparation */}
              <div className="flex flex-col items-center text-center space-y-2.5 flex-1 w-full lg:w-auto">
                <div className="w-14 h-14 rounded-2xl bg-[#16233B] border border-[#26344B] flex items-center justify-center">
                  <Wallet className="w-7 h-7 text-emerald-400" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-slate-200">
                  Payment Preparation
                </span>
                <span className="text-xs text-slate-400 font-medium bg-slate-800/40 px-2.5 py-1 rounded-md border border-slate-700">
                  Awaiting Approval
                </span>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-[#26344B]/60 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                DevFlow Human-in-the-Loop Gate: Reaching Payment Preparation does NOT execute payments until client signs off.
              </span>
              <span className="text-xs font-mono text-slate-400 hidden sm:inline">
                Pipeline v2.4 (Gemini 2.5 Flash)
              </span>
            </div>
          </div>

          {/* SECTION 3: SPLIT GRID (LEFT: RECENT EXECUTIONS TABLE, RIGHT: EXECUTION + APPROVAL + LOG) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT 7 COLS: RECENT EXECUTIONS TABLE */}
            <div className="lg:col-span-7 space-y-6">
              <div className="rounded-2xl bg-[#111C30] border border-[#26344B] overflow-hidden">
                {/* Tabs Header */}
                <div className="flex items-center justify-between px-5 sm:px-7 pt-4 border-b border-[#26344B] overflow-x-auto">
                  <div className="flex items-center gap-6 text-xs sm:text-sm font-semibold">
                    <button
                      onClick={() => setActiveTab('recent')}
                      className={`pb-3.5 border-b-2 transition-colors whitespace-nowrap ${
                        activeTab === 'recent'
                          ? 'border-[#2563EB] text-white'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Recent Executions
                    </button>
                    <button
                      onClick={() => setActiveTab('projects')}
                      className={`pb-3.5 border-b-2 transition-colors whitespace-nowrap ${
                        activeTab === 'projects'
                          ? 'border-[#2563EB] text-white'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Related Projects
                    </button>
                    <button
                      onClick={() => setActiveTab('agents')}
                      className={`pb-3.5 border-b-2 transition-colors whitespace-nowrap ${
                        activeTab === 'agents'
                          ? 'border-[#2563EB] text-white'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Agent
                    </button>
                  </div>
                  <span className="text-xs text-slate-400 font-mono pb-3.5 hidden sm:inline">
                    Showing {displayedExecutions.length} runs
                  </span>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#26344B] text-xs text-slate-400 uppercase tracking-wider bg-[#0C1524]">
                        <th className="py-3.5 px-4 font-semibold">
                          <span className="flex items-center gap-1.5">
                            Execution <span className="text-[#38BDF8]">↓</span>
                          </span>
                        </th>
                        <th className="py-3.5 px-4 font-semibold">Related Project</th>
                        <th className="py-3.5 px-4 font-semibold">Agent</th>
                        <th className="py-3.5 px-4 font-semibold">Status</th>
                        <th className="py-3.5 px-4 font-semibold">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#26344B]/60">
                      {displayedExecutions.map((row) => (
                        <tr
                          key={row.id}
                          className="hover:bg-[#152238]/60 transition-colors cursor-pointer group"
                          onClick={() => {
                            showToast(`Inspecting ${row.name}`, `${row.agent} run on ${row.project}`, 'info');
                          }}
                        >
                          <td className="py-4 px-4 font-medium text-blue-400 group-hover:text-blue-300">
                            {row.name}
                          </td>
                          <td className="py-4 px-4 text-slate-300">
                            {row.project}
                          </td>
                          <td className="py-4 px-4 text-slate-300">
                            {row.agent}
                          </td>
                          <td className="py-4 px-4">
                            <div className="space-y-0.5">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold tracking-wider ${
                                  row.status === 'SUCCESS'
                                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                                    : row.status === 'FAILED'
                                    ? 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                                    : 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                                }`}
                              >
                                {row.status}
                              </span>
                              <div className="text-xs text-slate-400 font-mono">
                                {row.statusCodeDesc}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-slate-400 font-mono text-xs">
                            {row.timestamp}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-3.5 bg-[#0C1524] border-t border-[#26344B] flex items-center justify-between text-xs text-slate-400">
                  <span>Filtered by: {activeTab.toUpperCase()}</span>
                  <button
                    onClick={() => {
                      loadData();
                      showToast('Executions Refreshed', 'Telemetry synced with AST validation engine.', 'success');
                    }}
                    className="text-[#38BDF8] hover:text-white flex items-center gap-1.5 font-semibold"
                  >
                    <RotateCw className="w-3.5 h-3.5" /> Refresh Logs
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT 5 COLS: COMPACT RECENT EXECUTION + HUMAN APPROVAL + ACTIVITY LOG */}
            <div className="lg:col-span-5 space-y-6">
              {/* 1. RECENT EXECUTION (COMPACT CARD) */}
              <div className="rounded-2xl bg-[#111C30] border border-[#26344B] p-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#26344B]">
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    Recent Execution
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">Real-time Stream</span>
                </div>

                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="text-xs text-slate-400 uppercase tracking-wider border-b border-[#26344B]/60">
                        <th className="py-2.5 font-medium">Execution</th>
                        <th className="py-2.5 font-medium">Agent</th>
                        <th className="py-2.5 font-medium">Status</th>
                        <th className="py-2.5 font-medium text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#26344B]/40">
                      {rightRecentExecutions.map((r) => (
                        <tr key={r.id} className="hover:bg-[#152238]/40 transition-colors">
                          <td className="py-3 font-medium text-slate-200 text-xs sm:text-sm">
                            {r.execution}
                          </td>
                          <td className="py-3 text-slate-300 text-xs sm:text-sm">
                            {r.agent}
                          </td>
                          <td className="py-3">
                            <div>
                              <span
                                className={`inline-block text-xs font-bold px-2 py-0.5 rounded-md ${
                                  r.status === 'SUCCESS'
                                    ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-rose-950/70 text-rose-400 border border-rose-500/30'
                                }`}
                              >
                                {r.status}
                              </span>
                              <div className="text-[10px] text-slate-400 font-mono max-w-[130px] truncate">
                                {r.statusDesc}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 text-right text-slate-400 font-mono text-xs whitespace-nowrap">
                            {r.time}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. HUMAN APPROVAL QUEUE */}
              <div className="rounded-2xl bg-[#111C30] border border-[#26344B] p-5">
                <div className="pb-3 border-b border-[#26344B]">
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    Human Approval Queue
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    AI-generated recommendations awaiting review.
                  </p>
                </div>

                {/* Collapsible Recommendation Item */}
                <div className="mt-3.5 rounded-xl bg-[#0C1524] border border-[#26344B] p-4 space-y-3.5">
                  <div
                    onClick={() => setApprovalAccordionOpen(!approvalAccordionOpen)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                      <span className="text-sm font-bold text-white">
                        Acceptance for Alpha Milestone 3
                      </span>
                    </div>
                    {approvalAccordionOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>

                  {approvalAccordionOpen && (
                    <div className="space-y-3.5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-[#26344B]/60 pt-3">
                      <p>
                        <strong className="text-slate-100">Summary:</strong> AI Alpha Milestone 3 receives notation scope operating, acceptance for commendante: storomnarez to entrote-useo, and, and aeviliotm-dusionity to comsats a commnts-and recommendation, review.
                      </p>

                      {/* Approval Status State pill if triggered */}
                      {approvalState === 'approved' && (
                        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm flex items-center gap-2.5 font-medium">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          <span>Milestone approved by client. Ready for PayPal invoicing.</span>
                        </div>
                      )}
                      {approvalState === 'changes_requested' && (
                        <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs sm:text-sm flex items-center gap-2.5 font-medium">
                          <Clock className="w-4 h-4 text-amber-400" />
                          <span>Changes requested. Developer notified in backlog.</span>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center gap-2.5 pt-1.5">
                        <span className="text-xs font-semibold text-slate-400 mr-1">Actions:</span>
                        <button
                          onClick={() => setEvidenceModalOpen(true)}
                          className="px-3.5 py-2 rounded-xl bg-[#152238] hover:bg-[#1E2E4E] border border-[#26344B] text-slate-200 text-xs sm:text-sm font-medium transition-colors"
                        >
                          Review Evidence
                        </button>
                        {isClient ? (
                          <>
                            <button
                              onClick={() => {
                                if (isGuest) {
                                  setGuardActionTitle('Request Changes');
                                  setIsGuestGuardOpen(true);
                                  return;
                                }
                                setChangesModalOpen(true);
                              }}
                              className="px-3.5 py-2 rounded-xl bg-[#152238] hover:bg-[#1E2E4E] border border-[#26344B] text-slate-200 text-xs sm:text-sm font-medium transition-colors"
                            >
                              Request Changes
                            </button>
                            <button
                              onClick={handleApproveAndPay}
                              disabled={isSubmittingApproval || approvalState === 'approved'}
                              className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-600 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/30 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <Sparkles className="w-4 h-4" />
                              <span>{approvalState === 'approved' ? 'Approved' : 'Approve & Pay'}</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={handleApproveAndPay}
                            disabled={isSubmittingApproval || approvalState === 'approved'}
                            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-md shadow-violet-600/30 flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <Sparkles className="w-4 h-4" />
                            <span>
                              {approvalState === 'approved'
                                ? 'Dispatched to Client'
                                : 'Submit Packet for Client Review'}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. ACTIVITY LOG */}
              <div className="rounded-xl bg-[#111C30] border border-[#26344B] p-4 relative overflow-hidden">
                <div className="flex items-center justify-between pb-3 border-b border-[#26344B]">
                  <h3 className="text-xs font-bold text-white tracking-wide">
                    Activity Log
                  </h3>
                  <Activity className="w-3.5 h-3.5 text-blue-400" />
                </div>

                {/* Vertical Timeline */}
                <div className="relative pl-6 space-y-4 pt-3">
                  {/* Vertical Line */}
                  <div className="absolute top-4 bottom-4 left-2.5 w-0.5 bg-blue-500/30" />

                  {activityLogs.map((item) => (
                    <div key={item.id} className="relative flex items-start gap-2 text-xs">
                      {/* Node Dot */}
                      <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#2563EB] ring-4 ring-[#111C30]" />
                      <div className="text-[11px] leading-relaxed">
                        <span className="font-mono text-slate-400 mr-2">{item.timeAgo}</span>
                        <strong className="text-slate-200 font-semibold">{item.agentName}</strong>{' '}
                        <span className="text-slate-400">{item.description}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Decorative Sparkle Graphic (from reference image) */}
                <div className="absolute bottom-2 right-2 opacity-20 pointer-events-none">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" className="text-blue-300">
                    <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </main>

      {/* MODAL 1: AGENT TELEMETRY DETAILS */}
      {selectedAgentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-[#111C30] border border-[#26344B] shadow-2xl p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-[#26344B] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white capitalize">
                    {selectedAgentModal.replace('_', ' ')} Agent Details
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Model: Gemini 2.5 Flash &bull; Context Window: 1M Tokens
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedAgentModal(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1E2E4E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-[#0C1524] border border-[#26344B] space-y-2">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Agent Specification
                </span>
                <p className="leading-relaxed">
                  Autonomous micro-agent tasked with analyzing repository AST syntax proofs, PR diffs, and test suites to verify milestone deliverable acceptance criteria without human bias.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-[#152238] border border-[#26344B]">
                  <span className="text-[10px] text-slate-400 block">Total Evaluations</span>
                  <span className="text-base font-bold text-white font-mono">1,428</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#152238] border border-[#26344B]">
                  <span className="text-[10px] text-slate-400 block">Syntactic Accuracy</span>
                  <span className="text-base font-bold text-emerald-400 font-mono">98.4%</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0C1524] border border-[#26344B] space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Grounding & Safety Policy
                </span>
                <p className="text-[11px] text-slate-400 leading-snug">
                  AI Agents never generate finalized PayPal payment requests or draw client escrow funds automatically. Every invoice release requires explicit human authorization.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-[#26344B]">
              <button
                onClick={() => setSelectedAgentModal(null)}
                className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-semibold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: REQUEST CHANGES DIALOG */}
      {changesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-[#111C30] border border-[#26344B] shadow-2xl p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-[#26344B] pb-3">
              <h3 className="text-sm font-bold text-white">Request Changes on Milestone</h3>
              <button
                onClick={() => setChangesModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1E2E4E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300">
              Provide actionable guidance for the developer and the AI verification pipeline to re-inspect:
            </p>
            <textarea
              value={changesFeedback}
              onChange={(e) => setChangesFeedback(e.target.value)}
              placeholder="e.g., Unit test coverage is below the required 95% threshold on auth routes. Please add MFA unit tests before approval."
              className="w-full h-28 px-3 py-2 rounded-xl bg-[#0C1524] border border-[#26344B] text-white text-xs focus:outline-hidden focus:border-blue-500 resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setChangesModalOpen(false)}
                className="px-3.5 py-2 rounded-lg bg-[#152238] hover:bg-[#1E2E4E] text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestChanges}
                disabled={!changesFeedback.trim() || isSubmittingApproval}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold"
              >
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: REVIEW EVIDENCE MODAL */}
      {evidenceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-[#111C30] border border-[#26344B] shadow-2xl p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-[#26344B] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">GitHub Evidence & Verification Proofs</h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  Milestone: V1.1 Release &bull; Repo: devflow-core
                </span>
              </div>
              <button
                onClick={() => setEvidenceModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1E2E4E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-[#0C1524] border border-[#26344B] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-blue-400" />
                    PR #124: Multi-Factor Authentication Gateway
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                    MERGED
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Adds TOTP validator, encrypted session tokens, and recovery codes with 98% branch coverage.
                </p>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                  <span>SHA: 4a2f819</span>
                  <span>&bull;</span>
                  <span>14 files changed</span>
                  <span>&bull;</span>
                  <span>+482 / -31 lines</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0C1524] border border-[#26344B] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-blue-400" />
                    PR #130: PayPal Sandbox Webhook Integration
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                    MERGED
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Implements webhook event verification, invoice settlement listener, and HMAC signature validations.
                </p>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                  <span>SHA: 8c1d302</span>
                  <span>&bull;</span>
                  <span>8 files changed</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-[#26344B]">
              <button
                onClick={() => {
                  setEvidenceModalOpen(false);
                  navigate('/evidence');
                }}
                className="text-xs text-blue-400 hover:text-white flex items-center gap-1 font-semibold"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Full Evidence Workspace
              </button>
              <button
                onClick={() => setEvidenceModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-semibold"
              >
                Close Evidence
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: HELP & DOCUMENTATION */}
      {helpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-[#111C30] border border-[#26344B] shadow-2xl p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-[#26344B] pb-3">
              <h3 className="text-sm font-bold text-white">AI Agents Architecture Guide</h3>
              <button
                onClick={() => setHelpModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1E2E4E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                DevFlow combines Gemini-powered semantic analysis with strict syntactic Git AST diffs to guarantee code deliverables match client agreements before invoices can be prepared.
              </p>
              <div className="p-3 rounded-xl bg-[#0C1524] border border-[#26344B] space-y-1">
                <span className="font-bold text-white block">Key Security Safeguards:</span>
                <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                  <li>AI recommendations are advisory and require client sign-off.</li>
                  <li>Invoices are simulated in PayPal Sandbox mode for hackathon demonstration.</li>
                  <li>All AST verification executions are immutable and logged.</li>
                </ul>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setHelpModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-semibold"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      <GuestGuardModal
        isOpen={isGuestGuardOpen}
        onClose={() => setIsGuestGuardOpen(false)}
        actionTitle={guardActionTitle}
        message="Submitting verification packets or dispatching milestone changes is disabled in Guest Demo Mode."
      />
    </div>
  );
};
