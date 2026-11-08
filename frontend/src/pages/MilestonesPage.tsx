import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from '@/contexts/SidebarContext';
import { devFlowApi } from '@/services/api';
import { Milestone, Requirement, Project } from '@/types';
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
  }, []);

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
        const version = versionTags[idx % versionTags.length];

        return {
          ...m,
          versionTag: version,
          projectName: parent?.name || 'Apollo Portal',
          evidenceLinkedCount: 8,
          evidenceTotalCount: 11,
          requiredDeliverables: ['Codebase Deployment', 'User Documentation', 'Test Reports'],
          missingRequirements: ['4 Unit Tests failing', 'User Docs draft incomplete', '2 Mobile UI issues open'],
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
      const newDisplay: DisplayMilestone = {
        ...res.data,
        versionTag: `V1.${milestones.length} RELEASE`,
        projectName: parent?.name || 'Apollo Portal',
        evidenceLinkedCount: 8,
        evidenceTotalCount: 11,
        requiredDeliverables: ['Codebase Deployment', 'User Documentation', 'Test Reports'],
        missingRequirements: ['User Docs draft incomplete'],
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
    } catch {
      showToast('Approval Error', 'Failed to record approval.', 'error');
    }
  };

  const handleGenerateInvoice = async (milestoneId: string) => {
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
        matchesStatus = m.status === 'ai_verified' || m.status === 'client_approved';

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

  // KPI Calculations
  const totalMilestonesCount = 24; // Visual anchor matching reference image
  const completedCount = 12;
  const inProgressCount = 8;
  const awaitingReviewCount = 4;

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
        <main className="flex-1 overflow-y-auto px-4 sm:px-7 py-5 space-y-6">
          {/* PHASE 2: PAGE HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={openMobileSidebar}
                  className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#101A2D]"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Milestones</h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-400">
                Track deliverables, evaluate progress and manage milestone approvals.
              </p>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <button
                onClick={() => setIsNewModalOpen(true)}
                className="bg-[#2563EB] hover:bg-blue-600 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create Milestone</span>
              </button>

              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg bg-[#111C30] border border-[#26344B] transition-colors relative"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-[#111C30]" />
                </button>
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-[#111C30] border border-[#26344B] rounded-xl shadow-2xl p-3 z-50 text-xs space-y-2">
                    <div className="font-bold text-white flex justify-between items-center pb-2 border-b border-[#26344B]">
                      <span>Milestone Alerts</span>
                      <span className="text-[10px] text-blue-400 cursor-pointer" onClick={() => setNotificationsOpen(false)}>
                        Close
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="p-2 rounded bg-[#080D18] border border-[#26344B]">
                        <div className="font-semibold text-white">V1.1 Release Approved</div>
                        <div className="text-[11px] text-slate-400">Ready for PayPal Invoice dispatch</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Initial Badge */}
              <div className="w-8 h-8 rounded-lg bg-[#111C30] border border-[#26344B] flex items-center justify-center font-bold text-xs text-white">
                NV
              </div>

              {/* User Avatar */}
              <div
                onClick={() => navigate('/settings')}
                className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#2563EB] to-[#60A5FA] text-white flex items-center justify-center font-bold text-xs ring-1 ring-[#26344B] cursor-pointer shadow-sm"
                title="Account Settings"
              >
                AM
              </div>
            </div>
          </div>

          {/* PHASE 3: COMPACT FILTER TOOLBAR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 p-2 rounded-xl bg-[#111C30] border border-[#26344B] text-xs">
            {/* 1. Project Selector Dropdown */}
            <select
              value={selectedProjectFilter}
              onChange={(e) => setSelectedProjectFilter(e.target.value)}
              className="bg-[#080D18] text-slate-300 border border-[#26344B] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#2563EB] truncate"
            >
              <option value="all">All Projects (Northstar)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  Project: {p.name}
                </option>
              ))}
            </select>

            {/* 2. Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#080D18] text-xs text-white placeholder-slate-500 pl-8 pr-3 py-2 rounded-lg border border-[#26344B] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            {/* 3. Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#080D18] text-slate-300 border border-[#26344B] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#2563EB]"
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
              className="bg-[#080D18] text-slate-300 border border-[#26344B] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#2563EB]"
            >
              <option value="all">Deadline: This Month</option>
              <option value="next_month">Deadline: Next Month</option>
              <option value="quarter">Deadline: This Quarter</option>
            </select>

            {/* 5. Approval Dropdown */}
            <select
              value={approvalFilter}
              onChange={(e) => setApprovalFilter(e.target.value)}
              className="bg-[#080D18] text-slate-300 border border-[#26344B] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#2563EB]"
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
                <span className="text-xs text-slate-400 font-medium">Total Milestones</span>
                <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-1">
                  {totalMilestonesCount}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#080D18] border border-[#26344B] text-slate-400">
                <Flag className="w-5 h-5" />
              </div>
            </div>

            {/* Card 2: Completed */}
            <div className="p-4 rounded-xl bg-[#111C30] border border-[#26344B] flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium">Completed</span>
                <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-1">
                  {completedCount}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#080D18] border border-[#26344B] text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            {/* Card 3: In Progress */}
            <div className="p-4 rounded-xl bg-[#111C30] border border-[#26344B] flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium">In Progress</span>
                <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-1">
                  {String(inProgressCount).padStart(2, '0')}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#080D18] border border-[#26344B] text-blue-400">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            {/* Card 4: Awaiting Review */}
            <div className="p-4 rounded-xl bg-[#111C30] border border-[#26344B] flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium">Awaiting Review</span>
                <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-1">
                  {String(awaitingReviewCount).padStart(2, '0')}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#080D18] border border-[#26344B] text-amber-400">
                <MessageSquare className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* PHASE 5 & 6: TIMELINE & MILESTONE DETAIL WORKSPACE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column: Vertical Timeline (lg:col-span-4) */}
            <div className="lg:col-span-4 space-y-3 relative">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                MILESTONE TIMELINE
              </div>

              {/* Vertical Timeline Track Line */}
              <div className="relative pl-6 space-y-3.5 before:absolute before:left-2.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-[#26344B]">
                {filteredMilestones.map((ms) => {
                  const isSelected = selectedMilestone?.id === ms.id;

                  return (
                    <div key={ms.id} className="relative">
                      {/* Timeline Node Indicator */}
                      <span
                        className={`absolute -left-6 top-4 w-3.5 h-3.5 rounded-full transition-all ring-4 ring-[#080D18] ${
                          isSelected
                            ? 'bg-[#2563EB] shadow-md shadow-blue-500/50 scale-110 ring-blue-900/50'
                            : 'bg-slate-600'
                        }`}
                      />

                      {/* Milestone Timeline Card */}
                      <div
                        onClick={() => setSelectedMilestoneId(ms.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#15233D] border-[#2563EB] shadow-lg shadow-blue-900/20'
                            : 'bg-[#111C30] border-[#26344B] hover:border-slate-500 hover:bg-[#132038]'
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0 pr-2">
                          <h4
                            className={`text-xs font-bold uppercase tracking-wider truncate ${
                              isSelected ? 'text-white' : 'text-slate-300'
                            }`}
                          >
                            {ms.versionTag || ms.title}
                          </h4>
                          <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider truncate">
                            PROJECT: {ms.projectName || 'APOLLO PORTAL'}
                          </p>
                        </div>
                        <ChevronRight
                          className={`w-4 h-4 shrink-0 transition-transform ${
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
                <div className="p-5 sm:p-6 rounded-xl bg-[#111C30] border border-[#26344B] shadow-2xl space-y-6">
                  {/* DETAIL HEADER */}
                  <div className="flex items-start justify-between border-b border-[#26344B] pb-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight uppercase">
                          MILESTONE: {selectedMilestone.versionTag || selectedMilestone.title}
                        </h3>
                      </div>
                      <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                        PROJECT: {selectedMilestone.projectName || 'APOLLO PORTAL'}
                      </p>
                    </div>

                    <button
                      onClick={() => setIsDetailExpanded(!isDetailExpanded)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1B2A47] transition-colors"
                      title={isDetailExpanded ? 'Collapse view' : 'Expand view'}
                    >
                      {isDetailExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {isDetailExpanded && (
                    <>
                      {/* DESCRIPTION */}
                      <p className="text-xs text-slate-300 leading-relaxed font-normal">
                        {selectedMilestone.description ||
                          'Deploy V1.1 Release, including multi-factor authentication and payment gateway integration.'}
                      </p>

                      {/* TWO-COLUMN DETAIL BODY */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        {/* LEFT COLUMN: CRITERIA & DELIVERABLES */}
                        <div className="space-y-4">
                          {/* 1. Acceptance Criteria */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-white tracking-wide">
                              Acceptance Criteria
                            </h4>
                            <div className="space-y-1.5 text-xs text-slate-300">
                              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                                <Check className="w-3.5 h-3.5" />
                                <span className="text-slate-200">MFA fully implemented</span>
                              </div>
                              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                                <Check className="w-3.5 h-3.5" />
                                <span className="text-slate-200">Payment integration tested</span>
                              </div>
                              <div className="flex items-center gap-2 text-amber-400 font-medium">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span className="text-slate-200">Unit tests &gt; 95% coverage</span>
                              </div>
                              <div className="flex items-center gap-2 text-rose-400 font-medium">
                                <X className="w-3.5 h-3.5" />
                                <span className="text-slate-200">Mobile responsive bugs fixed</span>
                              </div>
                            </div>
                          </div>

                          {/* 2. Required Deliverables */}
                          <div className="space-y-1.5 pt-1">
                            <h4 className="text-xs font-bold text-white tracking-wide">
                              Required Deliverables
                            </h4>
                            <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                              <li>Codebase Deployment</li>
                              <li>User Documentation</li>
                              <li>Test Reports</li>
                            </ul>
                          </div>

                          {/* 3. Missing Requirements */}
                          <div className="space-y-1.5 pt-1">
                            <h4 className="text-xs font-bold text-white tracking-wide">
                              Missing Requirements
                            </h4>
                            <ul className="text-xs text-rose-400 space-y-1 list-disc list-inside">
                              <li>4 Unit Tests failing</li>
                              <li>User Docs draft incomplete</li>
                              <li>2 Mobile UI issues open</li>
                            </ul>
                          </div>
                        </div>

                        {/* RIGHT COLUMN: GITHUB EVIDENCE & AI CONFIDENCE */}
                        <div className="space-y-4">
                          {/* Associated GitHub Evidence */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-white tracking-wide">
                              Associated GitHub Evidence
                            </h4>
                            <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase">
                              EVIDENCE STATUS: 8/11 ITEMS LINKED
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-950/80 text-blue-400 border border-blue-800/60 font-bold">
                                2 PRs (#124, #130)
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-950/80 text-blue-400 border border-blue-800/60 font-bold">
                                27 COMMITS
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-950/80 text-blue-400 border border-blue-800/60 font-bold">
                                3 ISSUES
                              </span>
                            </div>
                          </div>

                          {/* AI Confidence */}
                          <div className="space-y-1.5 p-3 rounded-xl bg-[#080D18] border border-[#26344B]">
                            <div className="text-xs font-bold text-emerald-400 font-mono flex items-center justify-between">
                              <span>AI CONFIDENCE: 88%</span>
                              <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            </div>
                            <p className="text-[11px] text-slate-300 leading-relaxed">
                              Based on analysis, requirements are partially met. Documentation needs final
                              update. MFA and Payment features verified.
                            </p>
                          </div>

                          {/* Missing Requirements Tags */}
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-bold text-white">Missing Requirements</span>
                            <div className="flex flex-wrap gap-1.5">
                              <span className="text-[10px] bg-rose-950/60 text-rose-300 border border-rose-800/50 px-2 py-0.5 rounded">
                                4 Unit Tests failing
                              </span>
                              <span className="text-[10px] bg-rose-950/60 text-rose-300 border border-rose-800/50 px-2 py-0.5 rounded">
                                User Docs draft incomplete
                              </span>
                              <span className="text-[10px] bg-rose-950/60 text-rose-300 border border-rose-800/50 px-2 py-0.5 rounded">
                                2 Mobile UI issues open
                              </span>
                            </div>
                          </div>

                          {/* Related Invoice Information */}
                          <div className="space-y-1 pt-1 border-t border-[#26344B]/70 text-xs">
                            <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                              Related Invoice Information
                            </div>
                            <div className="text-[11px] text-amber-400 font-semibold font-mono">
                              INVOICE STATUS: PENDING APPROVAL
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-300 font-mono">
                              <PayPalIcon className="w-3.5 h-3.5" />
                              <span>INV-2023-11-04 (PayPal)</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* BOTTOM WORKFLOW BAR */}
                      <div className="pt-4 border-t border-[#26344B] flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
                        {/* Left: Preview Badges & Pagination */}
                        <div className="space-y-2">
                          <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                            MILESTONE TIMELINE AND DETAILS PREVIEW
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#080D18] border border-[#26344B] text-slate-300">
                              8/11 ITEMS LINKED
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#080D18] border border-[#26344B] text-slate-300">
                              2 PRs (#124, #130)
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#080D18] border border-[#26344B] text-slate-300">
                              27 COMMITS
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#080D18] border border-[#26344B] text-slate-300">
                              3 ISSUES (3)
                            </span>

                            {/* Pagination Controls */}
                            <div className="flex items-center gap-1 pl-2 font-mono text-xs text-slate-400">
                              <button className="p-1 hover:text-white" title="First page">
                                <ChevronsLeft className="w-3.5 h-3.5" />
                              </button>
                              <button className="p-1 hover:text-white" title="Previous page">
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-[10px] text-slate-300 px-1">Page 1 / 1</span>
                              <button className="p-1 hover:text-white" title="Next page">
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                              <button className="p-1 hover:text-white" title="Last page">
                                <ChevronsRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Right: Approval Actions */}
                        <div className="space-y-2 text-right self-start xl:self-auto">
                          <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                            APPROVAL WORKFLOW
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => navigate('/evidence')}
                              className="px-3.5 py-2 rounded-lg bg-[#080D18] border border-[#26344B] hover:border-slate-400 text-xs text-slate-200 transition-colors"
                            >
                              Review Evidence
                            </button>
                            <button
                              onClick={() =>
                                showToast('Changes Requested', 'Notified developer team to resolve open unit tests.', 'info')
                              }
                              className="px-3.5 py-2 rounded-lg bg-[#080D18] border border-[#26344B] hover:border-slate-400 text-xs text-slate-200 transition-colors"
                            >
                              Request Changes
                            </button>
                            <button
                              onClick={() => {
                                handleClientApprove(selectedMilestone.id);
                                handleGenerateInvoice(selectedMilestone.id);
                              }}
                              className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center gap-1.5"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve Milestone</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="p-12 text-center rounded-xl bg-[#111C30] border border-[#26344B] text-slate-400">
                  <FileCode className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Select a milestone on the left to inspect its deliverables.</p>
                </div>
              )}
            </div>
          </div>
        </main>

      {/* CREATE NEW MILESTONE MODAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#111C30] border border-[#26344B] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#26344B]">
              <h3 className="text-base font-bold text-white">Create New Milestone</h3>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMilestone} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Target Project</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full bg-[#080D18] border border-[#26344B] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#2563EB]"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Milestone Deliverable Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. V1.2 - Automated Payment Gateway Integration"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#080D18] border border-[#26344B] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Payout Amount (USD) *</label>
                  <input
                    type="number"
                    required
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full bg-[#080D18] border border-[#26344B] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Target Due Date *</label>
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full bg-[#080D18] border border-[#26344B] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Scope Description</label>
                <textarea
                  rows={2}
                  placeholder="Detailed functional goals of this milestone release..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-[#080D18] border border-[#26344B] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Acceptance Criteria (one per line)
                </label>
                <textarea
                  rows={3}
                  placeholder="MFA authentication enabled&#10;PayPal sandbox tests passing&#10;Unit tests coverage &gt; 95%"
                  value={newCriteria}
                  onChange={(e) => setNewCriteria(e.target.value)}
                  className="w-full bg-[#080D18] border border-[#26344B] rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#26344B]">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#080D18] border border-[#26344B] text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30 transition-all"
                >
                  {isSubmitting ? 'Creating...' : 'Create Milestone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
