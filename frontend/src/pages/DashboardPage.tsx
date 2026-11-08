import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import { devFlowApi } from '@/services/api';
import {
  Project,
  Milestone,
  DeveloperTelemetry,
} from '@/types';
import {
  FolderGit2,
  Sparkles,
  CreditCard,
  Bell,
  Search,
  Plus,
  ChevronDown,
  MoreVertical,
  Menu,
  X,
  FileCode,
  LogOut,
  BriefcaseBusiness,
  Code2,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { openMobileSidebar } = useSidebar();
  const { user, role, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [telemetry, setTelemetry] = useState<DeveloperTelemetry | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);

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

  // New Project Modal State
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newRepo, setNewRepo] = useState('northstar-studio/payment-gateway');
  const [newBudget, setNewBudget] = useState('18500');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search input state
  const [searchQuery, setSearchQuery] = useState('');

  // Notifications dropdown state
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // User details from auth context or profile storage
  const displayName = user?.name || 'Alex Morgan';
  const firstName = displayName.split(' ')[0];
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'AM';

  const isClientRole = role === 'CLIENT';
  const roleBadgeLabel = isClientRole ? 'Client' : 'Developer';

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      try {
        const [telemetryRes, projectsRes, milestonesRes] = await Promise.all([
          devFlowApi.getTelemetry(),
          devFlowApi.getProjects(),
          devFlowApi.getMilestones(),
        ]);

        setTelemetry(telemetryRes.data);
        setProjects(projectsRes.data);
        setMilestones(milestonesRes.data);
      } catch (err) {
        console.error('Failed to load dashboard telemetry:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

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

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !newClientName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await devFlowApi.createProject({
        name: newProjectName,
        description: `Client deliverable scope for ${newClientName}`,
        clientName: newClientName,
        clientEmail: `${newClientName.toLowerCase().replace(/\s+/g, '.')}@partner.io`,
        githubRepo: newRepo,
        totalBudget: parseFloat(newBudget) || 10000,
        currency: 'USD',
      });
      setProjects([res.data, ...projects]);
      setIsNewProjectModalOpen(false);
      setNewProjectName('');
      setNewClientName('');
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#080D18]">
      {/* TOP HEADER */}
      <header className="h-14 border-b border-[#26344B] bg-[#080D18]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0">
        {/* Header Left */}
        <div className="flex items-center gap-3">
          {/* Mobile Slide-in Drawer Trigger */}
          <button
            onClick={openMobileSidebar}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#101A2D] transition-colors"
            aria-label="Open mobile navigation menu"
            title="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">Dashboard</h1>
        </div>

          {/* Header Right */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Search Field */}
            <div className="relative hidden sm:block w-48 lg:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#101A2D] text-xs text-white placeholder-slate-500 pl-8 pr-3 py-1.5 rounded-lg border border-[#26344B] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#101A2D] transition-colors relative"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-[#080D18]" />
              </button>

              {/* Notification Popover */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-[#111C30] border border-[#26344B] rounded-xl shadow-2xl p-3 z-50 text-xs space-y-2">
                  <div className="font-bold text-white flex justify-between items-center pb-2 border-b border-[#26344B]">
                    <span>Notifications</span>
                    <span className="text-[10px] text-blue-400 cursor-pointer" onClick={() => setNotificationsOpen(false)}>
                      Close
                    </span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    <div className="p-2 rounded bg-[#080D18] border border-[#26344B]">
                      <div className="font-semibold text-white">Payment Received</div>
                      <div className="text-[11px] text-slate-400">$4,500 settled via PayPal Webhook (Sandbox)</div>
                    </div>
                    <div className="p-2 rounded bg-[#080D18] border border-[#26344B]">
                      <div className="font-semibold text-white">Milestone Verified</div>
                      <div className="text-[11px] text-slate-400">94.2% AI score on SHA a1e9482</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile with Dropdown */}
            <div ref={userMenuRef} className="relative pl-2 border-l border-[#26344B]">
              <div
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
              >
                <div
                  className={`w-8 h-8 rounded-lg ${
                    isClientRole
                      ? 'bg-gradient-to-tr from-[#2563EB] to-[#60A5FA]'
                      : 'bg-gradient-to-tr from-purple-600 to-indigo-400'
                  } text-white flex items-center justify-center font-bold text-xs ring-1 ring-[#26344B] shadow-xs`}
                >
                  {initials}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-semibold text-white leading-tight">{displayName}</span>
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded-full border ${
                        isClientRole
                          ? 'bg-blue-950/80 text-blue-400 border-blue-800/60'
                          : 'bg-purple-950/80 text-purple-300 border-purple-800/60'
                      }`}
                    >
                      {roleBadgeLabel}
                    </span>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#111C30] border border-[#26344B] rounded-xl shadow-2xl py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3.5 py-2 border-b border-[#26344B]/70">
                    <p className="font-bold text-white truncate">{displayName}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user?.email || 'user@devflow.io'}</p>
                    <span
                      className={`inline-flex items-center gap-1 text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full mt-1.5 border ${
                        isClientRole
                          ? 'bg-blue-950/80 text-blue-400 border-blue-800/60'
                          : 'bg-purple-950/80 text-purple-300 border-purple-800/60'
                      }`}
                    >
                      {isClientRole ? (
                        <BriefcaseBusiness className="w-2.5 h-2.5" />
                      ) : (
                        <Code2 className="w-2.5 h-2.5" />
                      )}
                      <span>{roleBadgeLabel} Account</span>
                    </span>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate('/settings');
                      }}
                      className="w-full text-left px-3.5 py-2 text-slate-300 hover:text-white hover:bg-[#1B2A47] transition-colors"
                    >
                      Account Settings
                    </button>
                  </div>
                  <div className="border-t border-[#26344B]/70 pt-1">
                    <button
                      onClick={async () => {
                        setUserMenuOpen(false);
                        await logout();
                        navigate('/login');
                      }}
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* SCROLLABLE DASHBOARD BODY */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-[1600px] w-full mx-auto">
          {/* 3. WELCOME SECTION */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#26344B]/40">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Welcome back, {firstName}
                </h2>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    isClientRole
                      ? 'bg-blue-950/80 text-blue-400 border-blue-800/60'
                      : 'bg-purple-950/80 text-purple-300 border-purple-800/60'
                  }`}
                >
                  {roleBadgeLabel.toUpperCase()}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                {isClientRole
                  ? `${user?.organization || 'Meridian Labs'} \u2022 Milestone approvals, AST proof audits and PayPal invoice release.`
                  : `${user?.organization || 'Northstar Digital Studio'} \u2022 Real-time telemetry, commit proofs and milestone intelligence.`}
              </p>
            </div>
            <button
              onClick={() => setIsNewProjectModalOpen(true)}
              className="self-start sm:self-auto bg-[#2563EB] hover:bg-blue-600 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-md shadow-blue-600/30 flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Project</span>
            </button>
          </div>

          {/* 4. KPI CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3.5">
            {/* Card 1: Active Projects */}
            <div className="p-4 rounded-xl bg-[#111C30] border border-[#26344B] flex flex-col justify-between hover:border-slate-600 transition-colors">
              <span className="text-xs text-slate-400 font-medium">Active Projects</span>
              <div className="flex items-center justify-between mt-3">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-white">
                  {String(projects.length || 4).padStart(2, '0')}
                </span>
                {/* Mini Trend Sparkline */}
                <svg className="w-16 h-7 text-[#2563EB]" viewBox="0 0 60 25" fill="none">
                  <path
                    d="M2 18 Q 15 5, 28 16 T 58 6"
                    stroke="#2563EB"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>

            {/* Card 2: Total Milestones */}
            <div className="p-4 rounded-xl bg-[#111C30] border border-[#26344B] flex flex-col justify-between hover:border-slate-600 transition-colors">
              <span className="text-xs text-slate-400 font-medium">Total Milestones</span>
              <div className="mt-3 text-2xl sm:text-3xl font-bold font-mono text-white">
                {String(milestones.length || 14).padStart(2, '0')}
              </div>
            </div>

            {/* Card 3: Pending Approvals */}
            <div className="p-4 rounded-xl bg-[#171E30] border border-amber-900/60 flex flex-col justify-between hover:border-amber-700 transition-colors">
              <span className="text-xs text-slate-400 font-medium">Pending Client Review</span>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-2xl sm:text-3xl font-bold font-mono text-amber-400">
                  02
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] animate-pulse" />
              </div>
            </div>

            {/* Card 4: Outstanding Invoices */}
            <div className="p-4 rounded-xl bg-[#111C30] border border-[#26344B] flex flex-col justify-between hover:border-slate-600 transition-colors">
              <span className="text-xs text-slate-400 font-medium">Outstanding Invoices</span>
              <div className="mt-3 text-xl sm:text-2xl font-bold font-mono text-white">
                ${telemetry ? telemetry.pendingInvoicesAmount.toLocaleString() : '4,500'}
              </div>
            </div>

            {/* Card 5: Confirmed Payments */}
            <div className="p-4 rounded-xl bg-[#111C30] border border-[#26344B] flex flex-col justify-between col-span-2 sm:col-span-1 hover:border-slate-600 transition-colors">
              <span className="text-xs text-slate-400 font-medium">Confirmed Settlements</span>
              <div className="mt-3 text-xl sm:text-2xl font-bold font-mono text-emerald-400">
                ${telemetry ? telemetry.totalRevenuePaid.toLocaleString() : '9,500'}
              </div>
            </div>
          </div>

          {/* 5 & 6. MAIN CONTENT & FINANCIAL OVERVIEW (2-Column Grid) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column: Project Overview + AI Agent Activity (lg:col-span-8) */}
            <div className="lg:col-span-8 space-y-5">
              {/* SECTION: PROJECT OVERVIEW */}
              <div className="p-4 sm:p-5 rounded-xl bg-[#111C30] border border-[#26344B] space-y-4">
                {/* Table Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#26344B]">
                  <div className="flex items-center gap-2.5">
                    <FolderGit2 className="w-4 h-4 text-blue-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Active Projects &amp; Deliverables
                    </h3>
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-blue-950/70 border border-blue-800/60 text-blue-400 px-2.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span>4 Active Projects &bull; Fictional Demo Data</span>
                  </div>
                </div>

                {/* Overview Table */}
                <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-[#26344B]/70 text-[11px] text-slate-400 uppercase tracking-wider">
                        <th className="pb-3 font-semibold">Project Name</th>
                        <th className="pb-3 font-semibold">Client</th>
                        <th className="pb-3 font-semibold">Progress</th>
                        <th className="pb-3 font-semibold">Current Deliverable</th>
                        <th className="pb-3 font-semibold">Target Date</th>
                        <th className="pb-3 font-semibold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#26344B]/40">
                      {projects.map((proj, idx) => {
                        const progress = idx === 0 ? 75 : idx === 1 ? 100 : idx === 2 ? 40 : 25;
                        const milestoneLabel = idx === 0 ? 'PayPal Webhook Engine' : idx === 1 ? 'Settlement Reconciler' : idx === 2 ? 'REST Route Hardening' : 'AST Evidence Audit';
                        const statusLabel = idx === 1 ? 'Verified' : idx === 0 ? 'In Review' : 'In Progress';
                        const statusStyle = idx === 1
                          ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800/60'
                          : idx === 0
                          ? 'bg-amber-950/70 text-amber-400 border-amber-800/60'
                          : 'bg-blue-950/70 text-blue-400 border-blue-800/60';
                        return (
                          <tr
                            key={proj.id}
                            onClick={() => navigate('/projects')}
                            className="hover:bg-[#15233D] transition-colors cursor-pointer"
                          >
                            <td className="py-3.5 font-bold text-white">{proj.name}</td>
                            <td className="py-3.5 text-slate-300">{proj.clientName}</td>
                            <td className="py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-[#1E2E4E] h-1.5 rounded-full overflow-hidden">
                                  <div className="bg-[#2563EB] h-full rounded-full" style={{ width: `${progress}%` }} />
                                </div>
                                <span className="text-[11px] font-mono text-slate-400">{progress}%</span>
                              </div>
                            </td>
                            <td className="py-3.5 font-mono text-slate-300 text-xs">{milestoneLabel}</td>
                            <td className="py-3.5 text-slate-400 font-mono text-xs">Nov {10 + idx * 3}</td>
                            <td className="py-3.5 text-right">
                              <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-md ${statusStyle}`}>
                                {statusLabel}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 7. AI AGENT ACTIVITY SECTION */}
              <div className="p-4 sm:p-5 rounded-xl bg-[#111C30] border border-[#26344B] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#26344B]">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Autonomous Verification Agents
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono bg-[#080D18] px-2 py-0.5 rounded border border-[#26344B]">
                    AST Code Parser &bull; Human-in-the-Loop Governance
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  AI agents validate cryptographic commits and AST proofs against requirement acceptance criteria. Human client sign-off is always required prior to invoice creation and money movement.
                </p>

                {/* 4 Agent Cards in a Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  {/* Card 1: AST Syntax Auditor */}
                  <div className="p-3.5 rounded-xl bg-[#080D18] border border-[#26344B] space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[10px] font-mono text-slate-400">AGENT 01</span>
                        <MoreVertical className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="font-bold text-xs text-white mt-1">AST Syntax Auditor</h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>Active &bull; 98% Pass</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-2">Parsed TypeScript abstract syntax trees</p>
                    </div>
                    <div className="pt-2 border-t border-[#26344B]/60 text-[10px] text-slate-500 flex items-center gap-1">
                      <span>Verified commit a1e9482</span>
                    </div>
                  </div>

                  {/* Card 2: Requirement Matcher */}
                  <div className="p-3.5 rounded-xl bg-[#080D18] border border-[#26344B] space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[10px] font-mono text-slate-400">AGENT 02</span>
                        <MoreVertical className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="font-bold text-xs text-white mt-1">Requirement Matcher</h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-blue-400 mt-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        <span>Evaluating &bull; 94.2%</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-2">Matching milestone acceptance criteria</p>
                    </div>
                    <div className="pt-2 border-t border-[#26344B]/60 text-[10px] text-slate-500 flex items-center gap-1">
                      <span>4 criteria satisfied</span>
                    </div>
                  </div>

                  {/* Card 3: Milestone Intelligence Agent */}
                  <div className="p-3.5 rounded-xl bg-[#080D18] border border-[#26344B] space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[10px] font-mono text-slate-400">AGENT 03</span>
                        <MoreVertical className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="font-bold text-xs text-white mt-1">Milestone Intelligence</h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>Audit Ready</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-2">Synthesizing evidence audit report</p>
                    </div>
                    <div className="pt-2 border-t border-[#26344B]/60 text-[10px] text-slate-500 flex items-center gap-1">
                      <span>Client review queued</span>
                    </div>
                  </div>

                  {/* Card 4: Payment Assistant */}
                  <div className="p-3.5 rounded-xl bg-[#080D18] border border-[#26344B] space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[10px] font-mono text-slate-400">AGENT 04</span>
                        <MoreVertical className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="font-bold text-xs text-white mt-1">Payment Assistant</h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-400 mt-1">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        <span>Awaiting Sign-off</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-2">PayPal Invoicing REST client standby</p>
                    </div>
                    <div className="pt-2 border-t border-[#26344B]/60 text-[10px] text-slate-500 flex items-center gap-1">
                      <span>Awaiting human approval</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Financial Overview + Recent Activity (lg:col-span-4) */}
            <div className="lg:col-span-4 space-y-5">
              {/* 6. FINANCIAL OVERVIEW CARD */}
              <div className="p-4 sm:p-5 rounded-xl bg-[#111C30] border border-[#26344B] space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#26344B]">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Financial Telemetry
                    </h3>
                  </div>
                  <span className="text-[9px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                    SANDBOX
                  </span>
                </div>

                {/* Submetrics */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                      <span>Confirmed (Demo)</span>
                    </div>
                    <div className="text-base font-bold font-mono text-white mt-0.5">$9,500.00</div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1.5 text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-[#38BDF8]" />
                      <span>Pending Client</span>
                    </div>
                    <div className="text-base font-bold font-mono text-white mt-0.5">$4,500.00</div>
                  </div>
                </div>

                {/* Smooth Two-Line Area Chart */}
                <div className="pt-2">
                  <svg className="w-full h-28" viewBox="0 0 300 100" fill="none">
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 10 75 Q 70 85, 120 45 T 220 55 T 290 15 L 290 95 L 10 95 Z"
                      fill="url(#areaGradient)"
                    />
                    <path
                      d="M 10 75 Q 70 85, 120 45 T 220 55 T 290 15"
                      stroke="#2563EB"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 10 90 Q 80 75, 140 70 T 230 40 T 290 35"
                      stroke="#38BDF8"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      strokeLinecap="round"
                      opacity="0.8"
                    />
                  </svg>
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono pt-1">
                    <span>Aug</span>
                    <span>Sep</span>
                    <span>Oct</span>
                    <span>Nov</span>
                  </div>
                </div>
              </div>

              {/* 8. RECENT ACTIVITY TIMELINE CARD */}
              <div className="p-4 sm:p-5 rounded-xl bg-[#111C30] border border-[#26344B] space-y-4 relative overflow-hidden">
                <div className="flex items-center justify-between pb-2 border-b border-[#26344B]">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-blue-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Audit Activity Feed
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Live Sync</span>
                </div>

                {/* Timeline */}
                <div className="relative pl-6 space-y-4 text-xs before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#26344B]">
                  {/* Item 1 */}
                  <div className="relative">
                    <span className="absolute -left-6 top-0.5 w-3 h-3 rounded-full bg-[#2563EB] ring-4 ring-[#111C30]" />
                    <div className="font-semibold text-white leading-snug">
                      AST code verification passed for Commit a1e9482
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">10m ago &bull; 94.2% confidence</div>
                  </div>

                  {/* Item 2 */}
                  <div className="relative">
                    <span className="absolute -left-6 top-0.5 w-3 h-3 rounded-full bg-slate-500 ring-4 ring-[#111C30]" />
                    <div className="font-semibold text-white leading-snug">
                      Sandbox Invoice #INV-2026-0843 drafted ($5,000)
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">1h ago &bull; Meridian Labs</div>
                  </div>

                  {/* Item 3 */}
                  <div className="relative">
                    <span className="absolute -left-6 top-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-4 ring-[#111C30]" />
                    <div className="font-semibold text-white leading-snug">
                      Marcus Vance approved Milestone 2 deliverables
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">3h ago &bull; Human Sign-off</div>
                  </div>

                  {/* Item 4 */}
                  <div className="relative">
                    <span className="absolute -left-6 top-0.5 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-[#111C30]" />
                    <div className="font-semibold text-white leading-snug">
                      PayPal Webhook verified PAYMENT.INVOICE.PAID ($4,500)
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">1d ago &bull; TXN-DEMO-948124</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

      {/* NEW PROJECT MODAL */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#111C30] border border-[#26344B] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#26344B]">
              <h3 className="text-base font-bold text-white">Create New Project</h3>
              <button
                onClick={() => setIsNewProjectModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Payment Gateway Integration"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full bg-[#080D18] border border-[#26344B] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Client Name / Organization</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Meridian Labs"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full bg-[#080D18] border border-[#26344B] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Monitored GitHub Repo</label>
                <input
                  type="text"
                  value={newRepo}
                  onChange={(e) => setNewRepo(e.target.value)}
                  className="w-full bg-[#080D18] border border-[#26344B] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Total Deliverable Budget (USD)</label>
                <input
                  type="number"
                  value={newBudget}
                  onChange={(e) => setNewBudget(e.target.value)}
                  className="w-full bg-[#080D18] border border-[#26344B] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#26344B]">
                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#080D18] border border-[#26344B] text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30 transition-all"
                >
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
