import React, { useState, useMemo, useEffect } from 'react';
import { DevFlowLogo } from '@/components/common';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderGit2,
  CheckCircle2,
  CreditCard,
  Users,
  Settings,
  Bell,
  X,
  Menu,
  Search,
  ChevronDown,
  Check,
  HelpCircle,
  Plus,
  RotateCw,
} from 'lucide-react';
import { devFlowApi } from '@/services/api';
import { Milestone, Project } from '@/types';

// Transaction Item Interface
export interface PaymentTransaction {
  id: string;
  transactionId: string;
  invoiceNumber: string;
  project: string;
  client: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  status: 'Success' | 'Pending' | 'Failed';
  paypalReference: string;
  webhookTimestamp: string;
  relatedMilestone: string;
  milestoneRoute?: string;
  payerEmail?: string;
}

// Monthly Chart Data Point
interface MonthlyDataPoint {
  month: string;
  amount: number;
}

const MONTHLY_TREND: MonthlyDataPoint[] = [
  { month: 'Jan', amount: 4200 },
  { month: 'Feb', amount: 11500 },
  { month: 'Mar', amount: 14200 },
  { month: 'Apr', amount: 12800 },
  { month: 'May', amount: 18400 },
  { month: 'Jun', amount: 14100 },
  { month: 'Jul', amount: 22400 },
  { month: 'Aug', amount: 13600 },
  { month: 'Sep', amount: 19500 },
  { month: 'Oct', amount: 21800 },
  { month: 'Nov', amount: 17200 },
  { month: 'Dec', amount: 28500 },
];

export const PaymentActivityPage: React.FC = () => {
  const navigate = useNavigate();

  // Navigation & Layout States
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(true);

  // Data Loading & API Sync
  const [, setMilestones] = useState<Milestone[]>([]);
  const [, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Search, Filtering & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Success' | 'Pending' | 'Failed'>('All');
  const [projectFilter, setProjectFilter] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Selected Transaction ID (defaulting to INV-2026-002 as depicted in the reference screenshot)
  const [selectedTransactionId, setSelectedTransactionId] = useState<string>('INV-2026-002');

  // Chart Tooltip Hover State
  const [hoveredMonth, setHoveredMonth] = useState<MonthlyDataPoint | null>(null);

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
      const [mRes, pRes] = await Promise.all([
        devFlowApi.getMilestones(),
        devFlowApi.getProjects(),
      ]);
      setMilestones(mRes.data);
      setProjects(pRes.data);
    } catch (err) {
      console.error('Failed to load telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  // Transaction Registry matching reference screenshot
  const initialTransactions: PaymentTransaction[] = useMemo(() => [
    {
      id: 'tx-1',
      transactionId: 'INV-2026-001',
      invoiceNumber: 'INV-2026-001',
      project: 'Apollo Mobile',
      client: 'Acme Corp',
      amount: 7500.0,
      paymentDate: 'Oct 26, 2026',
      paymentMethod: 'PayPal',
      status: 'Success',
      paypalReference: 'PP-9847120394',
      webhookTimestamp: 'Oct 26, 2026 14:22:10 UTC',
      relatedMilestone: 'Milestone 3: API Integration',
      milestoneRoute: '/milestones',
      payerEmail: 'billing@acme-corp.com',
    },
    {
      id: 'tx-2',
      transactionId: 'INV-2026-002',
      invoiceNumber: 'INV-2026-002',
      project: 'Alpha Portal',
      client: 'Acme Corp',
      amount: 1000.0,
      paymentDate: 'Nov 15, 2026',
      paymentMethod: 'PayPal',
      status: 'Success',
      paypalReference: 'PP-1234567890',
      webhookTimestamp: '1m ago',
      relatedMilestone: 'Alpha Launch v1.0',
      milestoneRoute: '/milestones',
      payerEmail: 'accounts@acmepartner.io',
    },
    {
      id: 'tx-3',
      transactionId: 'INV-2026-003',
      invoiceNumber: 'INV-2026-003',
      project: 'Stellar Innovations',
      client: 'Acme Portal',
      amount: 1550.0,
      paymentDate: 'Nov 15, 2028',
      paymentMethod: 'PayPal',
      status: 'Pending',
      paypalReference: 'PP-4491028374',
      webhookTimestamp: 'Awaiting webhook capture',
      relatedMilestone: 'Security Audit v1.1',
      milestoneRoute: '/milestones',
      payerEmail: 'contact@stellarinnov.com',
    },
    {
      id: 'tx-4',
      transactionId: 'INV-2026-004',
      invoiceNumber: 'INV-2026-004',
      project: 'Gamma Analytics',
      client: 'Global Dynamics',
      amount: 1500.0,
      paymentDate: 'Nov 19, 2028',
      paymentMethod: 'PayPal',
      status: 'Failed',
      paypalReference: 'PP-5520194820',
      webhookTimestamp: 'Nov 19, 2028 09:15:00 UTC',
      relatedMilestone: 'Telemetry Pipeline v2.0',
      milestoneRoute: '/milestones',
      payerEmail: 'finance@globaldynamics.io',
    },
    {
      id: 'tx-5',
      transactionId: 'INV-2026-004-b',
      invoiceNumber: 'INV-2026-004',
      project: 'Delta Platform',
      client: 'Future Tech',
      amount: 8000.0,
      paymentDate: 'Nov 17, 2026',
      paymentMethod: 'PayPal',
      status: 'Failed',
      paypalReference: 'PP-7719284012',
      webhookTimestamp: 'Nov 17, 2026 18:40:12 UTC',
      relatedMilestone: 'Event Streaming v1.0',
      milestoneRoute: '/milestones',
      payerEmail: 'accounts@futuretech.dev',
    },
    {
      id: 'tx-6',
      transactionId: 'INV-2026-005',
      invoiceNumber: 'INV-2026-005',
      project: 'Beta Engine',
      client: 'TechSolutions',
      amount: 1500.0,
      paymentDate: 'Nov 22, 2026',
      paymentMethod: 'PayPal',
      status: 'Success',
      paypalReference: 'PP-3391028475',
      webhookTimestamp: 'Nov 22, 2026 11:05:33 UTC',
      relatedMilestone: 'Worker Engine Scaling',
      milestoneRoute: '/milestones',
      payerEmail: 'invoicing@techsolutions.com',
    },
    {
      id: 'tx-7',
      transactionId: 'INV-2026-006',
      invoiceNumber: 'INV-2026-006',
      project: 'Beta Engine',
      client: 'Acme Engine',
      amount: 1500.0,
      paymentDate: 'Nov 22, 2026',
      paymentMethod: 'PayPal',
      status: 'Success',
      paypalReference: 'PP-8820194721',
      webhookTimestamp: 'Nov 22, 2026 11:30:19 UTC',
      relatedMilestone: 'Production Deploy v2.2',
      milestoneRoute: '/milestones',
      payerEmail: 'devops@acme-engine.io',
    },
  ], []);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return initialTransactions.filter((tx) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          tx.transactionId.toLowerCase().includes(q) ||
          tx.invoiceNumber.toLowerCase().includes(q) ||
          tx.project.toLowerCase().includes(q) ||
          tx.client.toLowerCase().includes(q) ||
          tx.relatedMilestone.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Status
      if (statusFilter !== 'All' && tx.status !== statusFilter) return false;

      // Project
      if (projectFilter !== 'All' && tx.project !== projectFilter) return false;

      return true;
    });
  }, [initialTransactions, searchQuery, statusFilter, projectFilter]);

  // Selected Transaction Object
  const selectedTransaction = useMemo(() => {
    return (
      initialTransactions.find((tx) => tx.transactionId === selectedTransactionId) ||
      initialTransactions[1] ||
      initialTransactions[0]
    );
  }, [initialTransactions, selectedTransactionId]);

  // Summary Metrics matching reference screenshot ($148,200 | $24,500 | $12,800 | 34)
  const summaryMetrics = {
    totalReceived: 148200,
    pendingPayments: 24500,
    outstandingAmount: 12800,
    successfulTransactions: 34,
  };

  // SVG Area Chart calculations
  const chartHeight = 160;
  const chartWidth = 900;
  const paddingLeft = 65;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;
  const maxVal = 30000;

  const points = useMemo(() => {
    const innerW = chartWidth - paddingLeft - paddingRight;
    const innerH = chartHeight - paddingTop - paddingBottom;
    return MONTHLY_TREND.map((d, i) => {
      const x = paddingLeft + (i / (MONTHLY_TREND.length - 1)) * innerW;
      const y = paddingTop + innerH - (d.amount / maxVal) * innerH;
      return { x, y, ...d };
    });
  }, [chartWidth, paddingLeft, paddingRight, paddingTop, paddingBottom, maxVal]);

  const curvePath = useMemo(() => {
    return points.reduce((acc, curr, idx) => {
      if (idx === 0) return `M ${curr.x} ${curr.y}`;
      const prev = points[idx - 1];
      const cx = (prev.x + curr.x) / 2;
      return `${acc} C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
    }, '');
  }, [points]);

  const areaPath = useMemo(() => {
    const lastX = points[points.length - 1].x;
    const firstX = points[0].x;
    const bottomY = chartHeight - paddingBottom;
    return `${curvePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [curvePath, points, chartHeight, paddingBottom]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#F4F6FA] text-slate-800">
        <div className="flex items-center gap-2.5 text-xs text-slate-500 font-mono">
          <RotateCw className="w-4 h-4 text-[#1683ED] animate-spin" />
          <span>Synchronizing Payment Telemetry...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-30 flex bg-[#F4F6FA] text-[#111827] font-sans antialiased overflow-hidden select-none">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[70] flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-slate-200 shadow-xl text-xs animate-in fade-in slide-in-from-top duration-200">
          <span
            className={`w-2 h-2 rounded-full ${
              toastMessage.type === 'success'
                ? 'bg-emerald-500'
                : toastMessage.type === 'error'
                ? 'bg-rose-500'
                : 'bg-blue-500'
            }`}
          />
          <div>
            <div className="font-bold text-slate-900">{toastMessage.title}</div>
            <div className="text-slate-500 text-[11px]">{toastMessage.desc}</div>
          </div>
        </div>
      )}

      {/* 1. FIXED DARK SIDEBAR (Matching reference: Dashboard, Projects, Milestones, Payments, Users, Configurations) */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-60 bg-[#101D32] border-r border-[#1B2D4A] flex flex-col justify-between transition-transform duration-200 ease-in-out ${
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
          <div className="space-y-1 text-xs">
            <button
              onClick={() => {
                setMobileSidebarOpen(false);
                navigate('/dashboard');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#152744] transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-slate-400" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => {
                setMobileSidebarOpen(false);
                navigate('/projects');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#152744] transition-colors"
            >
              <FolderGit2 className="w-4 h-4 text-slate-400" />
              <span>Projects</span>
            </button>

            <button
              onClick={() => {
                setMobileSidebarOpen(false);
                navigate('/milestones');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#152744] transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-400" />
              <span>Milestones</span>
            </button>

            {/* Payments Active Pill (Solid Bright Blue) */}
            <button
              onClick={() => {
                setMobileSidebarOpen(false);
                navigate('/payments');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#1683ED] text-white font-semibold shadow-md shadow-blue-600/30"
            >
              <CreditCard className="w-4 h-4 text-white" />
              <span>Payments</span>
            </button>

            <button
              onClick={() => {
                setMobileSidebarOpen(false);
                showToast('Team Directory', 'Viewing authorized billing users.', 'info');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#152744] transition-colors"
            >
              <Users className="w-4 h-4 text-slate-400" />
              <span>Users</span>
            </button>

            <button
              onClick={() => {
                setMobileSidebarOpen(false);
                navigate('/settings');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#152744] transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Configurations</span>
            </button>
          </div>
        </div>

        {/* Sidebar Bottom Nav (+ Quick-add, Help center) */}
        <div className="p-3 border-t border-[#1B2D4A] space-y-1 text-xs">
          <button
            onClick={() => {
              navigate('/invoices');
              showToast('Navigating', 'Opening Invoice creation workspace.', 'info');
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-[#152744] transition-colors font-medium"
          >
            <Plus className="w-4 h-4 text-[#1683ED]" />
            <span>+ Quick-add</span>
          </button>
          <button
            onClick={() => showToast('Help Center', 'PayPal settlement & escrow documentation.', 'info')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#152744] transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <span>Help center</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* 2. MAIN CONTENT VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* PHASE 4: PAGE HEADER */}
        <header className="h-16 px-4 sm:px-8 border-b border-[#DCE2EA] bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight leading-none">
                Payments
              </h1>
              <p className="text-xs text-[#64748B] mt-1 hidden sm:block">
                Monitor payment activity and financial progress across your projects.
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            {/* Settings Gear */}
            <button
              onClick={() => navigate('/settings')}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg relative transition-colors"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl p-3 z-50 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 font-bold text-slate-900">
                    <span>Payment Activity Alerts</span>
                    <button
                      onClick={() => setNotificationsOpen(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50 text-[11px] text-emerald-800 border border-emerald-100">
                    <span className="font-semibold">PayPal Webhook:</span> $1,000.00 settled for Alpha Portal.
                  </div>
                  <div className="p-2 rounded-lg bg-blue-50 text-[11px] text-blue-800 border border-blue-100">
                    <span className="font-semibold">Escrow Released:</span> Milestone 3 settled.
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Avatar */}
            <div
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-1.5 cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <img
                src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&crop=faces"
                alt="Tharun"
                className="w-7 h-7 rounded-full object-cover ring-1 ring-blue-500/30"
              />
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>
        </header>

        {/* Scrollable Dashboard Workspace */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-5 space-y-5">
          {/* PHASE 5: FINANCIAL SUMMARY CARDS (4 IN A ROW) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Received */}
            <div className="rounded-xl bg-white border border-[#DCE2EA] p-4 shadow-xs">
              <span className="text-xs text-[#64748B] block font-medium">Total Received</span>
              <div className="text-2xl font-bold text-[#111827] font-mono tracking-tight mt-1">
                ${summaryMetrics.totalReceived.toLocaleString('en-US')}
              </div>
            </div>

            {/* Card 2: Pending Payments */}
            <div className="rounded-xl bg-white border border-[#DCE2EA] p-4 shadow-xs">
              <span className="text-xs text-[#64748B] block font-medium">Pending Payments</span>
              <div className="text-2xl font-bold text-[#111827] font-mono tracking-tight mt-1">
                ${summaryMetrics.pendingPayments.toLocaleString('en-US')}
              </div>
            </div>

            {/* Card 3: Outstanding Amount */}
            <div className="rounded-xl bg-white border border-[#DCE2EA] p-4 shadow-xs">
              <span className="text-xs text-[#64748B] block font-medium">Outstanding Amount</span>
              <div className="text-2xl font-bold text-[#111827] font-mono tracking-tight mt-1">
                ${summaryMetrics.outstandingAmount.toLocaleString('en-US')}
              </div>
            </div>

            {/* Card 4: Successful Transactions */}
            <div className="rounded-xl bg-white border border-[#DCE2EA] p-4 shadow-xs">
              <span className="text-xs text-[#64748B] block font-medium">Successful Transactions</span>
              <div className="text-2xl font-bold text-[#111827] font-mono tracking-tight mt-1">
                {summaryMetrics.successfulTransactions}
              </div>
            </div>
          </div>

          {/* PHASE 6: MONTHLY PAYMENT TREND CHART */}
          <div className="rounded-xl bg-white border border-[#DCE2EA] p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#111827] tracking-tight">
                Monthly Payment trend
              </h3>
              {hoveredMonth && (
                <div className="text-xs font-mono font-semibold text-[#1683ED] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                  {hoveredMonth.month}: ${hoveredMonth.amount.toLocaleString()}
                </div>
              )}
            </div>

            {/* Responsive Smooth Curve Area Chart */}
            <div className="relative w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full min-w-[700px] h-[160px] overflow-visible"
              >
                <defs>
                  <linearGradient id="paymentTrendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1683ED" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#1683ED" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Y-Axis Grid Lines & Labels */}
                {[30000, 20000, 10000, 0].map((val) => {
                  const innerH = chartHeight - paddingTop - paddingBottom;
                  const y = paddingTop + innerH - (val / maxVal) * innerH;
                  return (
                    <g key={val}>
                      <text
                        x={paddingLeft - 10}
                        y={y + 4}
                        textAnchor="end"
                        className="text-[10px] font-mono fill-slate-400 font-medium"
                      >
                        ${val.toLocaleString()}
                      </text>
                      <line
                        x1={paddingLeft}
                        y1={y}
                        x2={chartWidth - paddingRight}
                        y2={y}
                        stroke="#E2E8F0"
                        strokeDasharray={val === 0 ? '' : '3 3'}
                        strokeWidth="1"
                      />
                    </g>
                  );
                })}

                {/* Shaded Area */}
                <path d={areaPath} fill="url(#paymentTrendGradient)" />

                {/* Blue Curve Line */}
                <path
                  d={curvePath}
                  fill="none"
                  stroke="#1683ED"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Month Data Points and Hover Target Nodes */}
                {points.map((pt, idx) => (
                  <g
                    key={idx}
                    className="cursor-pointer group"
                    onMouseEnter={() => setHoveredMonth(pt)}
                    onMouseLeave={() => setHoveredMonth(null)}
                  >
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="4"
                      className="fill-white stroke-[#1683ED] stroke-2 group-hover:scale-125 group-hover:fill-[#1683ED] transition-transform"
                    />
                    <text
                      x={pt.x}
                      y={chartHeight - 10}
                      textAnchor="middle"
                      className={`text-[10px] font-medium transition-colors ${
                        hoveredMonth?.month === pt.month ? 'fill-[#1683ED] font-bold' : 'fill-slate-500'
                      }`}
                    >
                      {pt.month}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* MAIN SPLIT: TRANSACTION HISTORY TABLE (LEFT) + PAYMENT DETAILS PANEL (RIGHT) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* PHASE 7: TRANSACTION HISTORY TABLE */}
            <div
              className={`${
                isDetailPanelOpen ? 'lg:col-span-8' : 'lg:col-span-12'
              } rounded-xl bg-white border border-[#DCE2EA] shadow-xs overflow-hidden transition-all duration-200`}
            >
              {/* Table Filter & Search Controls */}
              <div className="p-3.5 border-b border-[#DCE2EA] flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <div className="relative w-full max-w-xs">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search transactions, invoices..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white text-xs text-slate-900 placeholder-slate-400 pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 focus:border-[#1683ED] focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Project Filter */}
                  <select
                    value={projectFilter}
                    onChange={(e) => setProjectFilter(e.target.value)}
                    className="bg-white border border-slate-300 text-xs text-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-hidden"
                  >
                    <option value="All">Project: All</option>
                    <option value="Apollo Mobile">Apollo Mobile</option>
                    <option value="Alpha Portal">Alpha Portal</option>
                    <option value="Stellar Innovations">Stellar Innovations</option>
                    <option value="Gamma Analytics">Gamma Analytics</option>
                    <option value="Delta Platform">Delta Platform</option>
                    <option value="Beta Engine">Beta Engine</option>
                  </select>

                  {/* Status Filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-white border border-slate-300 text-xs text-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-hidden"
                  >
                    <option value="All">Status: All</option>
                    <option value="Success">Success</option>
                    <option value="Pending">Pending</option>
                    <option value="Failed">Failed</option>
                  </select>

                  {!isDetailPanelOpen && (
                    <button
                      onClick={() => setIsDetailPanelOpen(true)}
                      className="text-xs text-[#1683ED] hover:underline font-semibold"
                    >
                      Show Detail Panel
                    </button>
                  )}
                </div>
              </div>

              {/* High-Density Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#DCE2EA] text-[11px] text-[#64748B] font-semibold bg-slate-50">
                      <th className="py-2.5 px-3">Transaction ID</th>
                      <th className="py-2.5 px-3">Invoice number</th>
                      <th className="py-2.5 px-3">Project</th>
                      <th className="py-2.5 px-3">Client</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Payment date</th>
                      <th className="py-2.5 px-3">Payment method</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {filteredTransactions.map((tx) => {
                      const isSelected = tx.transactionId === selectedTransactionId;
                      return (
                        <tr
                          key={tx.id}
                          onClick={() => {
                            setSelectedTransactionId(tx.transactionId);
                            setIsDetailPanelOpen(true);
                          }}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[#EBF3FC] font-medium text-slate-900'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          {/* Transaction ID */}
                          <td className="py-2.5 px-3 font-mono font-medium text-xs whitespace-nowrap">
                            {tx.transactionId}
                          </td>

                          {/* Invoice Number */}
                          <td className="py-2.5 px-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                            {tx.invoiceNumber}
                          </td>

                          {/* Project */}
                          <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                            {tx.project}
                          </td>

                          {/* Client */}
                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                            {tx.client}
                          </td>

                          {/* Amount */}
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                            ${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Payment Date */}
                          <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                            {tx.paymentDate}
                          </td>

                          {/* Payment Method */}
                          <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap font-medium">
                            {tx.paymentMethod}
                          </td>

                          {/* Status Pill Badge */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                tx.status === 'Success'
                                  ? 'bg-[#E7F7EF] text-[#159B62] border border-[#A8E4C7]'
                                  : tx.status === 'Pending'
                                  ? 'bg-[#FEF7EB] text-[#E9A52A] border border-[#FCDCA5]'
                                  : 'bg-[#FDF2F2] text-[#E45B5B] border border-[#F9BABA]'
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="p-3 bg-slate-50 border-t border-[#DCE2EA] flex items-center justify-between text-[11px] text-slate-500">
                <span>Showing {filteredTransactions.length} transaction records</span>
                <div className="flex items-center gap-1 font-mono">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-1 rounded text-slate-600 hover:text-slate-900 disabled:opacity-30"
                  >
                    &lt;
                  </button>
                  <span className="px-2 font-semibold">1</span>
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled
                    className="p-1 rounded text-slate-600 hover:text-slate-900 disabled:opacity-30"
                  >
                    &gt;
                  </button>
                </div>
              </div>
            </div>

            {/* PHASE 8: PAYMENT DETAILS SIDE PANEL */}
            {isDetailPanelOpen && (
              <div className="lg:col-span-4 rounded-xl bg-white border border-[#DCE2EA] shadow-xs p-5 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#DCE2EA] pb-3">
                  <h3 className="text-sm font-bold text-[#111827]">Payment Detail</h3>
                  <button
                    onClick={() => setIsDetailPanelOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
                    title="Close Details Panel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Section 1: PayPal Transaction Reference */}
                <div className="space-y-1">
                  <span className="text-xs text-[#64748B] block font-medium">
                    PayPal Transaction Reference
                  </span>
                  <div className="text-xs font-mono font-bold text-slate-900">
                    {selectedTransaction.paypalReference}
                  </div>
                </div>

                {/* Section 2: Verified Payment Status */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-xs text-[#64748B] block font-medium">
                    Verified Payment Status
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-[#159B62] flex items-center justify-center text-white shrink-0 shadow-xs">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </div>
                </div>

                {/* Section 3: Webhook Timestamp */}
                <div className="space-y-1 pt-2 border-t border-slate-100">
                  <span className="text-xs text-[#64748B] block font-medium">
                    Webhook Timestamp
                  </span>
                  <div className="text-xs font-medium text-slate-800">
                    {selectedTransaction.webhookTimestamp}
                  </div>
                </div>

                {/* Section 4: Related Milestone */}
                <div className="space-y-1 pt-2 border-t border-slate-100">
                  <span className="text-xs text-[#64748B] block font-medium">
                    Related Milestone
                  </span>
                  <button
                    onClick={() => navigate('/milestones')}
                    className="text-xs font-semibold text-[#1683ED] hover:underline flex items-center gap-1 text-left"
                  >
                    <span>{selectedTransaction.relatedMilestone}</span>
                  </button>
                </div>

                {/* Extra Context Details */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5 mt-2">
                  <div className="flex justify-between text-slate-600 text-[11px]">
                    <span>Invoice:</span>
                    <strong className="text-slate-900 font-mono">{selectedTransaction.invoiceNumber}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600 text-[11px]">
                    <span>Client Payer:</span>
                    <strong className="text-slate-900">{selectedTransaction.client}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600 text-[11px]">
                    <span>Amount:</span>
                    <strong className="text-emerald-700 font-mono">
                      ${selectedTransaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      navigate('/invoices');
                      showToast('Navigating to Invoice', `Opening details for ${selectedTransaction.invoiceNumber}`, 'info');
                    }}
                    className="text-xs text-[#1683ED] hover:underline font-semibold"
                  >
                    View Full Invoice Record →
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* USER PROFILE MODAL */}
      {userMenuOpen && (
        <div className="fixed top-16 right-6 z-50 w-56 rounded-xl bg-white border border-slate-200 shadow-2xl p-3 text-xs space-y-2 animate-in fade-in duration-150">
          <div className="font-bold text-slate-900 border-b border-slate-100 pb-2">
            Tharun
            <div className="text-[10px] text-slate-500 font-normal">Fintech Invoicing Lead</div>
          </div>
          <button
            onClick={() => {
              setUserMenuOpen(false);
              navigate('/settings');
            }}
            className="w-full text-left py-1 text-slate-700 hover:text-slate-900"
          >
            Billing Preferences
          </button>
          <button
            onClick={() => {
              setUserMenuOpen(false);
              navigate('/');
            }}
            className="w-full text-left py-1 text-rose-600 hover:text-rose-700"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};
