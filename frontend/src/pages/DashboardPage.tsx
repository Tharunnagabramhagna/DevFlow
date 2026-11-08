import { DevFlowLogo } from '@/components/common';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { devFlowApi } from '@/services/api';
import {
  Project,
  Milestone,
  DeveloperTelemetry,
} from '@/types';
import {
  LayoutDashboard,
  FolderGit2,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Bell,
  Settings,
  Search,
  Plus,
  ChevronDown,
  MoreVertical,
  Menu,
  X,
  FileText,
  Zap,
  FileCode,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isMockData, setIsMockData] = useState(false);
  const [telemetry, setTelemetry] = useState<DeveloperTelemetry | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  // Mobile sidebar state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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

  // User name from localStorage or default
  const [userName] = useState<string>(() => {
    try {
      const raw = localStorage.getItem('devflow_user_profile_preferences');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.name) {
          return parsed.name.split(' ')[0];
        }
      }
    } catch {}
    return 'Alex';
  });

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      try {
        const [telemetryRes, projectsRes, milestonesRes, commitsRes, invoicesRes] = await Promise.all([
          devFlowApi.getTelemetry(),
          devFlowApi.getProjects(),
          devFlowApi.getMilestones(),
          devFlowApi.getGitHubCommits(),
          devFlowApi.getInvoices(),
        ]);

        setTelemetry(telemetryRes.data);
        setProjects(projectsRes.data);
        setMilestones(milestonesRes.data);
        setIsMockData(
          telemetryRes.isMock || projectsRes.isMock || milestonesRes.isMock || commitsRes.isMock || invoicesRes.isMock
        );
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
    <div className="fixed inset-0 z-30 flex bg-[#080D18] text-[#F8FAFC] font-sans antialiased overflow-hidden select-none">
      {/* 1. FIXED DARK NAVY SIDEBAR */}
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

          {/* Navigation Groups */}
          <div className="space-y-6 text-xs">
            {/* GROUP: WORKSPACE */}
            <div className="space-y-1">
              <div className="px-3 text-[10px] font-bold tracking-wider uppercase text-slate-500">
                WORKSPACE
              </div>
              <button
                onClick={() => {
                  setMobileSidebarOpen(false);
                  navigate('/dashboard');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#1B2A47] text-white font-semibold shadow-xs"
              >
                <LayoutDashboard className="w-4 h-4 text-[#2563EB]" />
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
                  navigate('/milestones');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#152238] transition-colors"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-400" />
                <span>Milestones</span>
              </button>
            </div>

            {/* GROUP: INTELLIGENCE */}
            <div className="space-y-1">
              <div className="px-3 text-[10px] font-bold tracking-wider uppercase text-slate-500">
                INTELLIGENCE
              </div>
              <button
                onClick={() => {
                  setMobileSidebarOpen(false);
                  navigate('/verification');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#152238] transition-colors"
              >
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>AI Agents</span>
              </button>
              <button
                onClick={() => {
                  setMobileSidebarOpen(false);
                  navigate('/evidence');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#152238] transition-colors"
              >
                <FileCode className="w-4 h-4 text-slate-400" />
                <span>Evidence</span>
              </button>
              <button
                onClick={() => {
                  setMobileSidebarOpen(false);
                  navigate('/verification');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#152238] transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verification</span>
              </button>
            </div>

            {/* GROUP: FINANCE */}
            <div className="space-y-1">
              <div className="px-3 text-[10px] font-bold tracking-wider uppercase text-slate-500">
                FINANCE
              </div>
              <button
                onClick={() => {
                  setMobileSidebarOpen(false);
                  navigate('/payments');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#152238] transition-colors"
              >
                <FileText className="w-4 h-4 text-slate-400" />
                <span>Invoices</span>
              </button>
              <button
                onClick={() => {
                  setMobileSidebarOpen(false);
                  navigate('/payments');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#152238] transition-colors"
              >
                <CreditCard className="w-4 h-4 text-blue-400" />
                <span>Payments</span>
              </button>
            </div>

            {/* GROUP: SYSTEM */}
            <div className="space-y-1">
              <div className="px-3 text-[10px] font-bold tracking-wider uppercase text-slate-500">
                SYSTEM
              </div>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#152238] transition-colors"
              >
                <Bell className="w-4 h-4 text-slate-400" />
                <span>Notifications</span>
              </button>
              <button
                onClick={() => {
                  setMobileSidebarOpen(false);
                  navigate('/settings');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#152238] transition-colors"
              >
                <Zap className="w-4 h-4 text-slate-400" />
                <span>Integrations</span>
              </button>
              <button
                onClick={() => {
                  setMobileSidebarOpen(false);
                  navigate('/settings');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#152238] transition-colors"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                <span>Settings</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Footer Info */}
        <div className="p-3 border-t border-[#26344B] text-[10px] text-slate-500 flex items-center justify-between">
          <span>DevFlow Sandbox v2.4 {isMockData ? '(Demo)' : ''}</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* 2. MAIN CONTENT VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#080D18]">
        {/* TOP HEADER */}
        <header className="h-14 border-b border-[#26344B] bg-[#080D18]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0">
          {/* Header Left */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#101A2D]"
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

            {/* User Profile */}
            <div
              onClick={() => navigate('/settings')}
              className="flex items-center gap-2.5 pl-2 border-l border-[#26344B] cursor-pointer hover:opacity-90 transition-opacity"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#2563EB] to-[#60A5FA] text-white flex items-center justify-center font-bold text-xs ring-1 ring-[#26344B] shadow-sm">
                AM
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-white leading-tight">Alex Morgan</span>
                <span className="text-[10px] text-slate-400">Project Administrator</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
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
                  Welcome back, {userName}
                </h2>
                <span className="text-[10px] font-mono font-bold bg-blue-950/80 text-blue-400 border border-blue-800/60 px-2 py-0.5 rounded-full">
                  DEMO MODE
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Project Administrator &bull; Northstar Digital Studio &bull; Real-time telemetry and milestone intelligence.
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
      </div>

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
