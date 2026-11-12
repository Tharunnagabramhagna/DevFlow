import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSidebar } from '@/contexts/SidebarContext';
import { devFlowApi } from '@/services/api';
import { Milestone, Requirement, Project } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { GuestGuardModal } from '@/components/common';
import {
  CheckCircle2,
  Sparkles,
  Bell,
  Search,
  Plus,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  X,
  Check,
  AlertTriangle,
  Menu,
  Flag,
  Clock,
  MessageSquare,
  FileCode,
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

// Extended Milestone with Sequence tag matching the reference (e.g. V1.0 Alpha, V1.1 Release, V1.2 Scaling)
interface DisplayMilestone extends Milestone {
  versionTag?: string;
  projectName?: string;
  missingRequirements?: string[];
  requiredDeliverables?: string[];
  evidenceLinkedCount?: number;
  evidenceTotalCount?: number;
}

export const MilestonesPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isGuest, isClient } = useAuth();
  const userInitials = isGuest
    ? 'DG'
    : (user?.name || 'DU')
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((n) => n[0]?.toUpperCase() || '')
        .join('') || 'DU';
  const isDeliverablesView = new URLSearchParams(location.search).get('view') === 'deliverables';
  const [isGuestGuardOpen, setIsGuestGuardOpen] = useState(false);
  const [guardActionTitle, setGuardActionTitle] = useState('Create Milestone');
  const [milestones, setMilestones] = useState<DisplayMilestone[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Milestone for the Detail Workspace
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>('');

  // Expand / Collapse state of the main detail workspace card
  const [isDetailExpanded, setIsDetailExpanded] = useState(true);

  // Filter Toolbar States
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deadlineFilter, setDeadlineFilter] = useState<string>('all');
  const [approvalFilter, setApprovalFilter] = useState<string>('all');

  // New Milestone Modal State
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('3200.00');
  const [newDueDate, setNewDueDate] = useState('2026-11-28');
  const [newDesc, setNewDesc] = useState('');
  const [newCriteria, setNewCriteria] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast notification banner state
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Mobile sidebar state
  const { openMobileSidebar } = useSidebar();

  // Notifications Popover
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // User Profile

  useEffect(() => {
    loadMilestonesData();
  }, [isGuest]);

  const showToast = (title: string, desc: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadMilestonesData = async () => {
    setLoading(true);
    try {
      const [mRes, pRes] = await Promise.all([
        devFlowApi.getMilestones(),
        devFlowApi.getProjects(),
      ]);

      setProjects(pRes.data);
      if (pRes.data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(pRes.data[0].id);
      }

      const versionTags = ['V1.0 ALPHA', 'V1.1 RELEASE', 'V1.2 SCALING', 'V2.0 ENTERPRISE', 'V2.1 POLISH'];

      const mapped: DisplayMilestone[] = mRes.data.map((m, idx) => {
        const parent = pRes.data.find((p) => p.id === m.projectId);
        const version = isGuest ? versionTags[idx % versionTags.length] : undefined;
        const reqs = Array.isArray(m.requirements) ? m.requirements : [];
        const unsatisfied = reqs.filter((r) => !r.satisfied).map((r) => r.title);
        const satisfiedCount = reqs.filter((r) => r.satisfied).length;

        return {
          ...m,
          versionTag: version,
          projectName: parent?.name || (isGuest ? 'Apollo Portal' : 'Unassigned Project'),
          evidenceLinkedCount: isGuest ? 8 : (m.commitsCount || 0),
          evidenceTotalCount: isGuest ? 11 : Math.max(reqs.length, m.commitsCount || 0),
          requiredDeliverables: isGuest
            ? ['Codebase Deployment', 'User Documentation', 'Test Reports']
            : reqs.map((r) => r.title),
          missingRequirements: isGuest
            ? ['4 Unit Tests failing', 'User Docs draft incomplete', '2 Mobile UI issues open']
            : unsatisfied.length > 0
              ? unsatisfied
              : satisfiedCount === reqs.length
                ? []
                : [],
        };
      });

      setMilestones(mapped);
      if (mapped.length > 0) {
        // Default to V1.1 Release or index 1 if exists, matching the reference image!
        const defaultSelected = mapped.length > 1 ? mapped[1].id : mapped[0].id;
        setSelectedMilestoneId(defaultSelected);
      }
    } catch (err) {
      console.error('Failed to load milestones:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAmount || !newDueDate) return;

    setIsSubmitting(true);
    const criteriaList: Requirement[] = newCriteria
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line, idx) => ({
        id: `req_custom_${Date.now()}_${idx}`,
        milestoneId: '',
        title: line.trim(),
        description: line.trim(),
        satisfied: true,
      }));

    try {
      const res = await devFlowApi.createMilestone({
        projectId: selectedProjectId || (projects[0]?.id || 'proj_devflow_01'),
        title: newTitle.trim(),
        description: newDesc.trim() || 'Custom deliverable scope.',
        order: milestones.length + 1,
        amount: parseFloat(newAmount) || 2500,
        currency: 'USD',
        dueDate: newDueDate,
        status: 'in_progress',
        requirements:
          criteriaList.length > 0
            ? criteriaList
            : [
                {
                  id: `req_default_${Date.now()}`,
                  milestoneId: '',
                  title: 'Core module implementation verified',
                  description: 'All unit test suites green and documentation updated.',
                  satisfied: true,
                },
              ],
      });

      const parent = projects.find((p) => p.id === res.data.projectId);
      const reqs = Array.isArray(res.data.requirements) ? res.data.requirements : [];
      const newDisplay: DisplayMilestone = {
        ...res.data,
        versionTag: isGuest ? `V1.${milestones.length} RELEASE` : undefined,
        projectName: parent?.name || (isGuest ? 'Apollo Portal' : 'Workspace Project'),
        evidenceLinkedCount: res.data.commitsCount || 0,
        evidenceTotalCount: Math.max(reqs.length, res.data.commitsCount || 0),
        requiredDeliverables: reqs.map((r) => r.title),
        missingRequirements: reqs.filter((r) => !r.satisfied).map((r) => r.title),
      };

      setMilestones([newDisplay, ...milestones]);
      setSelectedMilestoneId(newDisplay.id);
      setIsNewModalOpen(false);
      setNewTitle('');
      setNewDesc('');
      setNewCriteria('');
      showToast('Milestone Created', `Successfully generated "${newDisplay.title}"`);
    } catch (err) {
      console.error('Failed to create milestone:', err);
      showToast('Creation Failed', 'Could not create milestone.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClientApprove = async (milestoneId: string) => {
    if (isGuest) {
      setGuardActionTitle('Approve Deliverable');
      setIsGuestGuardOpen(true);
      return false;
    }
    if (!isClient) {
      showToast('Client Action Only', 'Only client accounts can approve deliverables.', 'error');
      return false;
    }
    try {
      await devFlowApi.submitClientApproval(
        milestoneId,
        'approved',
        'Client reviewed code evidence and confirmed acceptance criteria met.'
      );
      showToast(
        'Milestone Approved',
        'Human-in-the-loop review completed. Milestone is approved and ready for settlement.'
      );
      setMilestones((prev) =>
        prev.map((m) =>
          m.id === milestoneId ? { ...m, status: 'client_approved' } : m
        )
      );
      return true;
    } catch {
      showToast('Approval Error', 'Failed to record approval.', 'error');
      return false;
    }
  };

  const handleGenerateInvoice = async (milestoneId: string) => {
    if (isGuest) {
      setGuardActionTitle('Generate PayPal Invoice');
      setIsGuestGuardOpen(true);
      return;
    }
    if (!isClient) {
      showToast('Client Action Only', 'Only client accounts can generate invoices.', 'error');
      return;
    }
    try {
      const res = await devFlowApi.generatePayPalInvoice(milestoneId);
      showToast(
        'PayPal Invoice Dispatched',
        `Invoice ${res.data.invoiceNumber} ($${res.data.amount.toFixed(2)} USD) drafted via PayPal API.`
      );
      setMilestones((prev) =>
        prev.map((m) =>
          m.id === milestoneId ? { ...m, status: 'invoiced', invoice: res.data } : m
        )
      );
    } catch {
      showToast('Invoicing Failed', 'Could not generate invoice.', 'error');
    }
  };

  // Filter Logic
  const filteredMilestones = useMemo(() => {
    return milestones.filter((m) => {
      const matchesSearch =
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.versionTag && m.versionTag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesProject =
        selectedProjectFilter === 'all' || m.projectId === selectedProjectFilter;

      let matchesStatus = true;
      if (statusFilter === 'completed') matchesStatus = m.status === 'paid';
      if (statusFilter === 'in_progress') matchesStatus = m.status === 'in_progress';
      if (statusFilter === 'review')
        matchesStatus = m.status === 'ai_verified' || m.status === 'client_approved' || m.status === 'client_review';

      return matchesSearch && matchesProject && matchesStatus;
    });
  }, [milestones, searchQuery, selectedProjectFilter, statusFilter]);

  // Selected Milestone Object
  const selectedMilestone = useMemo(() => {
    return (
      milestones.find((m) => m.id === selectedMilestoneId) ||
      milestones[0] ||
      null
    );
  }, [milestones, selectedMilestoneId]);

  // Live KPI Calculations from active dataset
  const totalMilestonesCount = milestones.length;
  const completedCount = milestones.filter((m) => m.status === 'paid' || m.status === 'client_approved').length;
  const inProgressCount = milestones.filter(
    (m) =>
      m.status === 'in_progress' ||
      m.status === 'ai_analyzing' ||
      m.status === 'evidence_submitted'
  ).length;
  const awaitingReviewCount = milestones.filter(
    (m) => m.status === 'client_review' || m.status === 'ai_verified'
  ).length;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#080D18] text-white">
        <div className="flex items-center gap-2.5 text-xs text-slate-400 font-mono">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] animate-ping" />
          <span>Loading DevFlow Milestones...</span>
        </div>
      </div>
    );
  }

  return (
    
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#080D18]">
        {/* Toast Alert Banner */}
        {toastMessage && (
          <div className="bg-[#111C30] border-b border-blue-500/40 px-4 py-2 text-xs flex items-center justify-between z-50 text-white animate-fadeIn">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
              <span>
                <strong>{toastMessage.title}:</strong> {toastMessage.desc}
              </span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* SCROLLABLE MILESTONES BODY */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-7 py-5 space-y-6 max-w-[1600px] w-full mx-auto">
          {/* PHASE 2: PAGE HEADER */}
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
                  {isDeliverablesView ? 'Deliverables' : 'Milestones'}
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-400">
                {isDeliverablesView
                  ? 'Prepare code deliverables, run AI verification and track client sign-off.'
                  : isClient
                  ? 'Review submitted deliverables, approve milestone completions and authorize payment release.'
                  : 'Track assigned development deliverables, satisfy acceptance criteria and submit milestone proof.'}
              </p>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
              <button
                onClick={() => {
                  if (isGuest) {
                    setGuardActionTitle(isClient ? 'Create Milestone' : 'Submit Deliverable');
                    setIsGuestGuardOpen(true);
                    return;
                  }
                  setIsNewModalOpen(true);
                }}
                className="bg-[#2563EB] hover:bg-blue-600 text-white font-semibold text-xs sm:text-sm px-4 py-2 rounded-xl shadow-md shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>{isDeliverablesView ? 'Submit Deliverable' : 'Create Milestone'}</span>
              </button>

              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="p-2.5 text-slate-400 hover:text-white rounded-xl bg-[#111C30] border border-[#26344B] transition-colors relative"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-[#111C30]" />
                </button>
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-[#111C30] border border-[#26344B] rounded-2xl shadow-2xl p-4 z-50 text-xs space-y-2.5">
                    <div className="font-bold text-white flex justify-between items-center pb-2.5 border-b border-[#26344B]">
                      <span className="text-sm">Milestone Alerts</span>
                      <span className="text-xs text-blue-400 cursor-pointer hover:underline" onClick={() => setNotificationsOpen(false)}>
                        Close
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      <div className="p-3 rounded-xl bg-[#080D18] border border-[#26344B]">
                        <div className="font-semibold text-white text-xs sm:text-sm">V1.1 Release Approved</div>
                        <div className="text-xs text-slate-400 mt-0.5">Ready for PayPal Invoice dispatch</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Initial Badge */}
              <div className="w-9 h-9 rounded-xl bg-[#111C30] border border-[#26344B] flex items-center justify-center font-bold text-xs sm:text-sm text-white">
                NV
              </div>

              {/* User Avatar */}
              <div
                onClick={() => navigate('/settings')}
                className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#2563EB] to-[#60A5FA] text-white flex items-center justify-center font-bold text-xs sm:text-sm ring-1 ring-[#26344B] cursor-pointer shadow-sm"
                title="Account Settings"
              >
                {userInitials}
              </div>
            </div>
          </div>

          {/* PHASE 3: COMPACT FILTER TOOLBAR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-3 sm:p-4 rounded-2xl bg-[#111C30] border border-[#26344B] text-xs sm:text-sm">
            {/* 1. Project Selector Dropdown */}
            <select
              value={selectedProjectFilter}
              onChange={(e) => setSelectedProjectFilter(e.target.value)}
              className="bg-[#080D18] text-slate-300 border border-[#26344B] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#2563EB] truncate"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  Project: {p.name}
                </option>
              ))}
            </select>

            {/* 2. Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search milestones..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#080D18] text-xs sm:text-sm text-white placeholder-slate-500 pl-10 pr-3.5 py-2.5 rounded-xl border border-[#26344B] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            {/* 3. Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#080D18] text-slate-300 border border-[#26344B] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#2563EB]"
            >
              <option value="all">Status: All</option>
              <option value="completed">Status: Completed</option>
              <option value="in_progress">Status: In Progress</option>
              <option value="review">Status: Awaiting Review</option>
            </select>

            {/* 4. Deadline Dropdown */}
            <select
              value={deadlineFilter}
              onChange={(e) => setDeadlineFilter(e.target.value)}
              className="bg-[#080D18] text-slate-300 border border-[#26344B] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#2563EB]"
            >
              <option value="all">Deadline: This Month</option>
              <option value="next_month">Deadline: Next Month</option>
              <option value="quarter">Deadline: This Quarter</option>
            </select>

            {/* 5. Approval Dropdown */}
            <select
              value={approvalFilter}
              onChange={(e) => setApprovalFilter(e.target.value)}
              className="bg-[#080D18] text-slate-300 border border-[#26344B] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#2563EB]"
            >
              <option value="all">Approval: All</option>
              <option value="approved">Approval: Approved</option>
              <option value="pending">Approval: Pending</option>
            </select>
          </div>

          {/* PHASE 4: KPI SUMMARY CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Total Milestones */}
            <div className="p-4 rounded-xl bg-[#111C30] border border-[#26344B] flex items-center justify-between">
              <div>
                <span className="font-sans text-xs text-slate-400 font-semibold">Total Milestones</span>
                <div className="text-2xl sm:text-3xl font-black font-sans tabular-nums text-white mt-1">
                  {totalMilestonesCount}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#080D18] border border-[#26344B] text-slate-400">
                <Flag className="w-4 h-4" />
              </div>
            </div>

            {/* Card 2: Completed */}
            <div className="p-4 rounded-xl bg-[#111C30] border border-[#26344B] flex items-center justify-between">
              <div>
                <span className="font-sans text-xs text-slate-400 font-semibold">Completed</span>
                <div className="text-2xl sm:text-3xl font-black font-sans tabular-nums text-white mt-1">
                  {completedCount}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#080D18] border border-[#26344B] text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>

            {/* Card 3: In Progress */}
            <div className="p-4 rounded-xl bg-[#111C30] border border-[#26344B] flex items-center justify-between">
              <div>
                <span className="font-sans text-xs text-slate-400 font-semibold">In Progress</span>
                <div className="text-2xl sm:text-3xl font-black font-sans tabular-nums text-white mt-1">
                  {String(inProgressCount).padStart(2, '0')}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#080D18] border border-[#26344B] text-blue-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            {/* Card 4: Awaiting Review */}
            <div className="p-4 rounded-xl bg-[#111C30] border border-[#26344B] flex items-center justify-between">
              <div>
                <span className="font-sans text-xs text-slate-400 font-semibold">Awaiting Review</span>
                <div className="text-2xl sm:text-3xl font-black font-sans tabular-nums text-white mt-1">
                  {String(awaitingReviewCount).padStart(2, '0')}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#080D18] border border-[#26344B] text-amber-400">
                <MessageSquare className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* PHASE 5 & 6: TIMELINE & MILESTONE DETAIL WORKSPACE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column: Vertical Timeline (lg:col-span-4) */}
            <div className="lg:col-span-4 space-y-3.5 relative">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                MILESTONE TIMELINE
              </div>

              {/* Vertical Timeline Track Line */}
              <div className="relative pl-7 space-y-4 before:absolute before:left-3 before:top-4 before:bottom-4 before:w-0.5 before:bg-[#26344B]">
                {filteredMilestones.map((ms) => {
                  const isSelected = selectedMilestone?.id === ms.id;

                  return (
                    <div key={ms.id} className="relative">
                      {/* Timeline Node Indicator */}
                      <span
                        className={`absolute -left-7 top-4 w-4 h-4 rounded-full transition-all ring-4 ring-[#080D18] ${
                          isSelected
                            ? 'bg-[#2563EB] shadow-md shadow-blue-500/50 scale-110 ring-blue-900/50'
                            : 'bg-slate-600'
                        }`}
                      />

                      {/* Milestone Timeline Card */}
                      <div
                        onClick={() => setSelectedMilestoneId(ms.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#15233D] border-[#2563EB] shadow-lg shadow-blue-900/20'
                            : 'bg-[#111C30] border-[#26344B] hover:border-slate-500 hover:bg-[#132038]'
                        }`}
                      >
                        <div className="space-y-1 min-w-0 pr-2">
                          <h4
                            className={`font-heading text-sm font-bold uppercase tracking-wider truncate ${
                              isSelected ? 'text-white' : 'text-slate-300'
                            }`}
                          >
                            {ms.versionTag || ms.title}
                          </h4>
                          <p className="text-xs text-slate-400 uppercase font-sans tracking-wider truncate">
                            PROJECT: {ms.projectName || 'Workspace Project'}
                          </p>
                        </div>
                        <ChevronRight
                          className={`w-5 h-5 shrink-0 transition-transform ${
                            isSelected ? 'text-[#38BDF8] translate-x-0.5' : 'text-slate-500'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Expanded Detail Card (lg:col-span-8) */}
            <div className="lg:col-span-8">
              {selectedMilestone ? (
                <div className="p-6 sm:p-7 rounded-2xl bg-[#111C30] border border-[#26344B] shadow-2xl space-y-6">
                  {/* DETAIL HEADER */}
                  <div className="flex items-start justify-between border-b border-[#26344B] pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        <h3 className="font-heading text-lg sm:text-xl font-extrabold text-white tracking-tight uppercase">
                          MILESTONE: {selectedMilestone.versionTag || selectedMilestone.title}
                        </h3>
                      </div>
                      <p className="text-xs font-sans uppercase tracking-wider text-slate-400">
                        PROJECT: {selectedMilestone.projectName || 'Workspace Project'}
                      </p>
                    </div>

                    <button
                      onClick={() => setIsDetailExpanded(!isDetailExpanded)}
                      className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1B2A47] transition-colors"
                      title={isDetailExpanded ? 'Collapse view' : 'Expand view'}
                    >
                      {isDetailExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>

                  {isDetailExpanded && (
                    <>
                      {/* DESCRIPTION */}
                      <p className="font-sans text-sm text-slate-300 leading-relaxed font-normal">
                        {selectedMilestone.description || 'No milestone description provided yet.'}
                      </p>

                      {/* TWO-COLUMN DETAIL BODY */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        {/* LEFT COLUMN: CRITERIA & DELIVERABLES */}
                        <div className="space-y-5">
                          {/* 1. Acceptance Criteria */}
                          <div className="space-y-2.5">
                            <h4 className="font-heading text-sm font-bold text-white tracking-wide">
                              Acceptance Criteria
                            </h4>
                            <div className="space-y-2 text-xs sm:text-sm text-slate-300">
                              {isGuest && (!selectedMilestone.requirements || selectedMilestone.requirements.length === 0) ? (
                                <>
                                  <div className="flex items-center gap-2.5 text-emerald-400 font-medium">
                                    <Check className="w-4 h-4" />
                                    <span className="text-slate-200 font-sans">MFA fully implemented</span>
                                  </div>
                                  <div className="flex items-center gap-2.5 text-emerald-400 font-medium">
                                    <Check className="w-4 h-4" />
                                    <span className="text-slate-200 font-sans">Payment integration tested</span>
                                  </div>
                                  <div className="flex items-center gap-2.5 text-amber-400 font-medium">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span className="text-slate-200 font-sans">Unit tests &gt; 95% coverage</span>
                                  </div>
                                </>
                              ) : selectedMilestone.requirements && selectedMilestone.requirements.length > 0 ? (
                                selectedMilestone.requirements.map((req) => (
                                  <div
                                    key={req.id}
                                    className={`flex items-center gap-2.5 font-medium ${
                                      req.satisfied ? 'text-emerald-400' : 'text-amber-400'
                                    }`}
                                  >
                                    {req.satisfied ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                                    <span className="text-slate-200 font-sans">{req.title}</span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-slate-400">No acceptance criteria defined for this milestone.</p>
                              )}
                            </div>
                          </div>

                          {/* 2. Required Deliverables */}
                          <div className="space-y-2 pt-1">
                            <h4 className="font-heading text-sm font-bold text-white tracking-wide">
                              Required Deliverables
                            </h4>
                            {(selectedMilestone.requiredDeliverables || []).length > 0 ? (
                              <ul className="text-xs sm:text-sm text-slate-400 space-y-1.5 list-disc list-inside">
                                {(selectedMilestone.requiredDeliverables || []).map((item, idx) => (
                                  <li key={idx}>{item}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-slate-400">No separate deliverable checklist attached.</p>
                            )}
                          </div>

                          {/* 3. Missing Requirements */}
                          <div className="space-y-2 pt-1">
                            <h4 className="text-sm font-bold text-white tracking-wide">
                              Pending / Unsatisfied Criteria
                            </h4>
                            {(selectedMilestone.missingRequirements || []).length > 0 ? (
                              <ul className="text-xs sm:text-sm text-rose-400 space-y-1.5 list-disc list-inside">
                                {(selectedMilestone.missingRequirements || []).map((item, idx) => (
                                  <li key={idx}>{item}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-emerald-400">All listed milestone criteria satisfied.</p>
                            )}
                          </div>
                        </div>

                        {/* RIGHT COLUMN: GITHUB EVIDENCE & AI CONFIDENCE */}
                        <div className="space-y-5">
                          {/* Associated GitHub Evidence */}
                          <div className="space-y-2.5">
                            <h4 className="text-sm font-bold text-white tracking-wide">
                              Associated Deliverable Evidence
                            </h4>
                            <div className="text-xs font-mono text-emerald-400 font-bold uppercase">
                              EVIDENCE STATUS: {selectedMilestone.commitsCount ?? selectedMilestone.evidenceLinkedCount ?? 0} ITEM(S) SUBMITTED
                            </div>
                            {isGuest && (
                              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                <span className="px-2.5 py-1 rounded-md text-xs font-mono bg-blue-950/80 text-blue-400 border border-blue-800/60 font-bold">
                                  Demo PRs (#124, #130)
                                </span>
                                <span className="px-2.5 py-1 rounded-md text-xs font-mono bg-blue-950/80 text-blue-400 border border-blue-800/60 font-bold">
                                  27 COMMITS (DEMO)
                                </span>
                              </div>
                            )}
                          </div>

                          {/* AI Confidence */}
                          {(() => {
                            const score = selectedMilestone.aiReport?.confidence ?? selectedMilestone.aiReport?.confidenceScore ?? selectedMilestone.aiReport?.overallScore;
                            return (
                          <div className="space-y-2 p-4 rounded-xl bg-[#080D18] border border-[#26344B]">
                            <div className="text-sm font-bold text-emerald-400 font-mono flex items-center justify-between">
                              <span>
                                AI CONFIDENCE:{' '}
                                {isGuest
                                  ? '88%'
                                  : typeof score === 'number'
                                    ? `${score}%`
                                    : 'Pending Verification'}
                              </span>
                              <span
                                className={`w-2.5 h-2.5 rounded-full ${
                                  typeof score === 'number' || isGuest
                                    ? 'bg-emerald-400'
                                    : 'bg-slate-600'
                                }`}
                              />
                            </div>
                            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                              {isGuest
                                ? 'Demo analysis: requirements partially met. Documentation needs final update.'
                                : typeof score === 'number'
                                  ? `Automated AI pipeline evaluated submitted evidence with ${score}% confidence.`
                                  : 'Submit evidence to trigger AI requirement verification for this milestone.'}
                            </p>
                          </div>
                            );
                          })()}

                          {/* Missing Requirements Tags */}
                          {(selectedMilestone.missingRequirements || []).length > 0 && (
                            <div className="space-y-2">
                              <span className="text-xs sm:text-sm font-bold text-white">Open Blockers</span>
                              <div className="flex flex-wrap gap-2">
                                {(selectedMilestone.missingRequirements || []).map((req, idx) => (
                                  <span
                                    key={idx}
                                    className="text-xs bg-rose-950/60 text-rose-300 border border-rose-800/50 px-2.5 py-1 rounded-md"
                                  >
                                    {req}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Related Invoice Information */}
                          <div className="space-y-1.5 pt-1.5 border-t border-[#26344B]/70 text-xs sm:text-sm">
                            <div className="text-xs font-mono text-slate-400 uppercase font-bold">
                              Milestone Budget &amp; Settlement Status
                            </div>
                            <div className="text-xs sm:text-sm text-amber-400 font-semibold font-mono uppercase">
                              STATUS: {selectedMilestone.status.replace(/_/g, ' ')}
                            </div>
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300 font-mono">
                              <PayPalIcon className="w-4 h-4" />
                              <span>
                                ${Number(selectedMilestone.amount || 0).toLocaleString()} {selectedMilestone.currency || 'USD'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* BOTTOM WORKFLOW BAR */}
                      <div className="pt-5 border-t border-[#26344B] flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
                        {/* Left: Preview Badges & Pagination */}
                        <div className="space-y-2">
                          <div className="text-xs font-mono uppercase text-slate-400 font-bold">
                            MILESTONE DETAILS &amp; EVIDENCE SUMMARY
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-1 rounded-md text-xs font-mono bg-[#080D18] border border-[#26344B] text-slate-300">
                              {selectedMilestone.commitsCount ?? 0} EVIDENCE ITEM(S)
                            </span>
                            <span className="px-2.5 py-1 rounded-md text-xs font-mono bg-[#080D18] border border-[#26344B] text-slate-300">
                              {(selectedMilestone.requirements || []).length} ACCEPTANCE CRITERIA
                            </span>
                            <span className="px-2.5 py-1 rounded-md text-xs font-mono bg-[#080D18] border border-[#26344B] text-slate-300">
                              DUE {selectedMilestone.dueDate ? new Date(selectedMilestone.dueDate).toLocaleDateString() : '—'}
                            </span>

                            {/* Pagination Controls */}
                            <div className="flex items-center gap-1.5 pl-2 font-mono text-xs text-slate-400">
                              <button className="p-1.5 hover:text-white" title="First page">
                                <ChevronsLeft className="w-4 h-4" />
                              </button>
                              <button className="p-1.5 hover:text-white" title="Previous page">
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                              <span className="text-xs text-slate-300 px-1.5">Page 1 / 1</span>
                              <button className="p-1.5 hover:text-white" title="Next page">
                                <ChevronRight className="w-4 h-4" />
                              </button>
                              <button className="p-1.5 hover:text-white" title="Last page">
                                <ChevronsRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Right: Role-Aware Workflow Actions */}
                        <div className="space-y-2 text-right self-start xl:self-auto">
                          <div className="text-xs font-mono uppercase text-slate-400 font-bold">
                            {isClient ? 'APPROVAL WORKFLOW' : 'DELIVERABLE WORKFLOW'}
                          </div>
                          <div className="flex flex-wrap items-center gap-2.5">
                            <button
                              onClick={() => navigate('/evidence')}
                              className="px-4 py-2.5 rounded-xl bg-[#080D18] border border-[#26344B] hover:border-slate-400 text-xs sm:text-sm text-slate-200 transition-colors cursor-pointer"
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
                                    showToast('Changes Requested', 'Notified developer team to resolve open unit tests.', 'info');
                                  }}
                                  className="px-4 py-2.5 rounded-xl bg-[#080D18] border border-[#26344B] hover:border-slate-400 text-xs sm:text-sm text-slate-200 transition-colors cursor-pointer"
                                >
                                  Request Changes
                                </button>
                                <button
                                  onClick={async () => {
                                    const approved = await handleClientApprove(selectedMilestone.id);
                                    if (approved) {
                                      await handleGenerateInvoice(selectedMilestone.id);
                                    }
                                  }}
                                  className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer"
                                >
                                  <Check className="w-4 h-4" />
                                  <span>Approve Milestone</span>
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => {
                                  if (isGuest) {
                                    setGuardActionTitle('Submit Deliverable');
                                    setIsGuestGuardOpen(true);
                                    return;
                                  }
                                  navigate('/verification');
                                }}
                                className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-violet-600/30 transition-all flex items-center gap-2 cursor-pointer"
                              >
                                <Sparkles className="w-4 h-4" />
                                <span>Run AI Verification</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="p-14 text-center rounded-2xl bg-[#111C30] border border-[#26344B] text-slate-400">
                  <FileCode className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Select a milestone on the left to inspect its deliverables.</p>
                </div>
              )}
            </div>
          </div>
        </main>

      {/* CREATE NEW MILESTONE MODAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#111C30] border border-[#26344B] rounded-2xl w-full max-w-lg p-7 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#26344B]">
              <h3 className="text-lg font-bold text-white">Create New Milestone</h3>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMilestone} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Target Project</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full bg-[#080D18] border border-[#26344B] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#2563EB]"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Milestone Deliverable Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. V1.2 - Automated Payment Gateway Integration"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#080D18] border border-[#26344B] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">Payout Amount (USD) *</label>
                  <input
                    type="number"
                    required
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full bg-[#080D18] border border-[#26344B] rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">Target Due Date *</label>
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full bg-[#080D18] border border-[#26344B] rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Scope Description</label>
                <textarea
                  rows={2}
                  placeholder="Detailed functional goals of this milestone release..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-[#080D18] border border-[#26344B] rounded-xl p-3 text-white text-sm focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Acceptance Criteria (one per line)
                </label>
                <textarea
                  rows={3}
                  placeholder="MFA authentication enabled&#10;PayPal sandbox tests passing&#10;Unit tests coverage &gt; 95%"
                  value={newCriteria}
                  onChange={(e) => setNewCriteria(e.target.value)}
                  className="w-full bg-[#080D18] border border-[#26344B] rounded-xl p-3 text-white text-sm font-mono focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#26344B]">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-[#080D18] border border-[#26344B] text-slate-300 hover:text-white text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white font-semibold text-sm shadow-md shadow-blue-600/30 transition-all cursor-pointer"
                >
                  {isSubmitting ? 'Creating...' : 'Create Milestone'}
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
        actionTitle={guardActionTitle}
        message="Guest Mode: Please sign in or create an account to use this feature."
      />
    </div>
  );
};
