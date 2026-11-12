import React, { useState, useEffect } from 'react';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import { devFlowApi } from '@/services/api';
import { DeveloperTelemetry, FinancialSummary, Project, Milestone } from '@/types';
import {
  Zap,
  TrendingUp,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Download,
  Menu,
  Bell,
  X,
} from 'lucide-react';

interface MonthlyDataPoint {
  month: string;
  spend: number;
  velocity: number;
}

const DEMO_MONTHLY_SERIES: MonthlyDataPoint[] = [
  { month: 'Jan', spend: 4200, velocity: 82 },
  { month: 'Feb', spend: 8500, velocity: 86 },
  { month: 'Mar', spend: 11200, velocity: 90 },
  { month: 'Apr', spend: 9800, velocity: 88 },
  { month: 'May', spend: 14400, velocity: 92 },
  { month: 'Jun', spend: 12100, velocity: 91 },
  { month: 'Jul', spend: 18400, velocity: 94 },
  { month: 'Aug', spend: 15600, velocity: 93 },
  { month: 'Sep', spend: 19500, velocity: 96 },
  { month: 'Oct', spend: 21800, velocity: 97 },
  { month: 'Nov', spend: 23500, velocity: 98 },
  { month: 'Dec', spend: 24000, velocity: 98 },
];

export const AnalyticsPage: React.FC = () => {
  const { openMobileSidebar } = useSidebar();
  const { isClient, isGuest } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<MonthlyDataPoint | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [telemetry, setTelemetry] = useState<DeveloperTelemetry | null>(null);
  const [financials, setFinancials] = useState<FinancialSummary | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  useEffect(() => {
    let active = true;
    const loadAnalytics = async () => {
      setLoading(true);
      if (isGuest) {
        if (active) {
          setLoading(false);
        }
        return;
      }
      try {
        const [telRes, finRes, projRes, msRes] = await Promise.all([
          devFlowApi.getTelemetry('all'),
          devFlowApi.getFinancialSummary('all'),
          devFlowApi.getProjects(),
          devFlowApi.getMilestones(),
        ]);
        if (!active) return;
        setTelemetry(telRes.data);
        setFinancials(finRes.data);
        setProjects(projRes.data);
        setMilestones(msRes.data);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadAnalytics();
    return () => {
      active = false;
    };
  }, [isGuest]);

  const handleExport = () => {
    setExportNotice(
      isClient
        ? 'Financial statement compiled. Opening print dialog...'
        : 'Developer velocity report compiled. Opening print dialog...'
    );
    setTimeout(() => {
      window.print();
      setExportNotice(null);
    }, 600);
  };

  // Real time series when authenticated, static fixture strictly in Demo Mode
  const activeSeries: MonthlyDataPoint[] = isGuest
    ? DEMO_MONTHLY_SERIES
    : (financials?.timeSeries || telemetry?.financials?.timeSeries || []).map((pt) => ({
        month: pt.label,
        spend: Number(pt.received || 0),
        velocity:
          pt.pending + pt.received > 0
            ? Math.min(100, Math.round((pt.received / Math.max(pt.pending + pt.received, 1)) * 100))
            : 0,
      }));

  // Chart configuration
  const chartWidth = 900;
  const chartHeight = 220;
  const paddingX = 40;
  const paddingY = 25;
  const innerW = chartWidth - paddingX * 2;
  const innerH = chartHeight - paddingY * 2;

  const maxVal = isClient
    ? Math.max(100, ...activeSeries.map((d) => d.spend))
    : 100;

  const points =
    activeSeries.length > 0
      ? activeSeries.map((d, index) => {
          const val = isClient ? d.spend : d.velocity;
          const x =
            activeSeries.length === 1
              ? paddingX + innerW / 2
              : paddingX + (index / (activeSeries.length - 1)) * innerW;
          const y = paddingY + innerH - (val / maxVal) * innerH;
          return { x, y, ...d };
        })
      : [];

  const pathD = points.reduce((acc, point, i, arr) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    const prev = arr[i - 1];
    const cpX = (prev.x + point.x) / 2;
    return `${acc} C ${cpX} ${prev.y}, ${cpX} ${point.y}, ${point.x} ${point.y}`;
  }, '');

  const areaD =
    points.length > 1
      ? `${pathD} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`
      : '';

  const totalAllocatedBudget = projects.reduce((sum, p) => sum + Number(p.totalBudget || 0), 0);
  const settledSpend = Number(financials?.receivedPaymentAmount ?? telemetry?.financials?.receivedPaymentAmount ?? 0);
  const pendingSpend = Number(financials?.pendingPaymentAmount ?? telemetry?.financials?.pendingPaymentAmount ?? 0);
  const remainingBuffer = Math.max(0, totalAllocatedBudget - settledSpend);

  const totalMilestonesCount = milestones.length;
  const completedMilestonesCount = milestones.filter(
    (m) => m.status === 'client_approved' || m.status === 'paid'
  ).length;
  const deliveryRate =
    totalMilestonesCount > 0 ? Math.round((completedMilestonesCount / totalMilestonesCount) * 100) : 0;
  const verificationRate = Number(telemetry?.aiVerificationPassRate ?? 0);
  const earnedPayouts = Number(
    financials?.completedPayoutAmount ??
      financials?.receivedPaymentAmount ??
      telemetry?.totalRevenuePaid ??
      0
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50 dark:bg-[#080D18] text-slate-900 dark:text-white transition-colors duration-200">
      {/* HEADER */}
      <header className="relative z-30 h-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200/80 dark:border-[#26344B] bg-white/80 dark:bg-[#080D18]/90 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={openMobileSidebar}
            className="lg:hidden p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-[#101A2D]"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-heading text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
                {isClient ? 'Financial Analytics' : 'Development Analytics'}
              </h1>
              <span
                className={`text-[10px] font-sans font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                  isClient
                    ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60'
                    : 'bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60'
                }`}
              >
                {isClient ? 'PAYPAL SPEND TELEMETRY' : 'AST VELOCITY METRICS'}
              </span>
            </div>
            <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-1 hidden sm:block">
              {isClient
                ? 'Budget expenditure, milestone spend burn, outstanding liabilities and PayPal settlement history.'
                : 'Delivery velocity, milestone completion rate, AST code verification pass rate and earned payouts.'}
            </p>
          </div>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <button
            onClick={handleExport}
            className="px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/30 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">
              {isClient ? 'Export Statement' : 'Export Metrics'}
            </span>
          </button>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-[#101A2D] relative transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white dark:ring-[#080D18]" />
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#111C30] border border-slate-200 dark:border-[#26344B] rounded-2xl shadow-2xl p-4 z-50 text-xs space-y-2.5">
                <div className="font-bold text-slate-900 dark:text-white flex justify-between items-center pb-2 border-b border-slate-200 dark:border-[#26344B]">
                  <span>Telemetry Feeds</span>
                  <button
                    onClick={() => setNotificationsOpen(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#080D18] border border-slate-200 dark:border-[#26344B]">
                  {isGuest ? (
                    <>
                      <div className="font-semibold text-slate-800 dark:text-white">
                        {isClient ? 'Escrow Release Completed (Demo)' : 'AST Verification Confirmed (Demo)'}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {isClient
                          ? '$4,500.00 settled via PayPal sandbox for Milestone 2'
                          : '98.4% syntax score confirmed on sample commit'}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-semibold text-slate-800 dark:text-white">
                        Workspace Telemetry Status
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {projects.length > 0
                          ? `${projects.length} project(s) and ${milestones.length} milestone(s) tracked.`
                          : 'No live projects or payment settlements recorded yet.'}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {exportNotice && (
        <div className="bg-blue-600 text-white text-xs font-semibold py-2 px-4 text-center">
          {exportNotice}
        </div>
      )}

      {/* DASHBOARD WORKSPACE BODY */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-7 py-5 space-y-6 max-w-[1600px] w-full mx-auto">
        {/* KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isClient ? (
            <>
              <div className="rounded-2xl bg-white dark:bg-[#111C30] border border-slate-200/80 dark:border-[#26344B] p-5 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                  <span className="font-medium">Total Allocated Budget</span>
                  <DollarSign className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono mt-2">
                  ${(isGuest ? 38500 : totalAllocatedBudget).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{isGuest ? 'Across 4 demo projects' : `Across ${projects.length} project(s)`}</span>
                </div>
              </div>

              <div className="rounded-2xl bg-white dark:bg-[#111C30] border border-slate-200/80 dark:border-[#26344B] p-5 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                  <span className="font-medium">Settled Milestone Spend</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-2">
                  ${(isGuest ? 23500 : settledSpend).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {isGuest ? 'Confirmed via PayPal demo webhooks' : 'Settled invoices & payments'}
                </div>
              </div>

              <div className="rounded-2xl bg-white dark:bg-[#111C30] border border-slate-200/80 dark:border-[#26344B] p-5 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                  <span className="font-medium">Outstanding Invoices</span>
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono mt-2">
                  ${(isGuest ? 4500 : pendingSpend).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                  {isGuest ? '2 deliverables pending review' : 'Awaiting invoice settlement'}
                </div>
              </div>

              <div className="rounded-2xl bg-white dark:bg-[#111C30] border border-slate-200/80 dark:border-[#26344B] p-5 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                  <span className="font-medium">Remaining Capital Buffer</span>
                  <ShieldCheck className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 font-mono mt-2">
                  ${(isGuest ? 10500 : remainingBuffer).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Remaining allocated project budget
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-2xl bg-white dark:bg-[#111C30] border border-slate-200/80 dark:border-[#26344B] p-5 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                  <span className="font-medium">Delivery Velocity</span>
                  <Zap className="w-4 h-4 text-purple-500" />
                </div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono mt-2">
                  {isGuest ? '94.2%' : `${deliveryRate}%`}
                </div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{isGuest ? 'On-schedule demo completion' : 'Milestone approval rate'}</span>
                </div>
              </div>

              <div className="rounded-2xl bg-white dark:bg-[#111C30] border border-slate-200/80 dark:border-[#26344B] p-5 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                  <span className="font-medium">AST Code Verification</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-2">
                  {isGuest ? '98.4%' : `${verificationRate}%`}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Verified evidence acceptance score
                </div>
              </div>

              <div className="rounded-2xl bg-white dark:bg-[#111C30] border border-slate-200/80 dark:border-[#26344B] p-5 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                  <span className="font-medium">Completed Milestones</span>
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 font-mono mt-2">
                  {isGuest ? '14 / 16' : `${completedMilestonesCount} / ${totalMilestonesCount}`}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {isGuest ? '87.5% demo achievement' : `${deliveryRate}% deliverable achievement rate`}
                </div>
              </div>

              <div className="rounded-2xl bg-white dark:bg-[#111C30] border border-slate-200/80 dark:border-[#26344B] p-5 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                  <span className="font-medium">Total Earned Payouts</span>
                  <DollarSign className="w-4 h-4 text-teal-500" />
                </div>
                <div className="text-2xl font-extrabold text-teal-600 dark:text-teal-400 font-mono mt-2">
                  ${(isGuest ? 28000 : earnedPayouts).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Settled developer milestone earnings
                </div>
              </div>
            </>
          )}
        </div>

        {/* PRIMARY TELEMETRY CHART */}
        <div className="rounded-2xl bg-white dark:bg-[#111C30] border border-slate-200/80 dark:border-[#26344B] p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-[#26344B] pb-3.5">
            <div>
              <h3 className="font-heading text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {isClient ? 'Capital Expenditure & Spend Burn' : 'Sprint Velocity & Financial Burndown'}
              </h3>
              <p className="font-sans text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {isClient
                  ? 'Milestone invoice settlements across active developer engagements'
                  : 'Milestone completion progress and verified payout telemetry'}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs sm:text-sm font-mono text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded-full ${isClient ? 'bg-[#2563EB]' : 'bg-purple-500'}`} />
                <span className="text-slate-700 dark:text-slate-300">
                  {isClient ? 'Spend ($ USD)' : 'Completion Ratio (%)'}
                </span>
              </span>
              <span>&bull; {isGuest ? 'Demo Sample' : 'Live Telemetry'}</span>
            </div>
          </div>

          <div className="relative pt-2">
            {loading && !isGuest ? (
              <div className="h-44 flex items-center justify-center text-xs text-slate-400 font-mono">
                Loading analytics series...
              </div>
            ) : points.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-center border border-dashed border-[#26344B] rounded-xl px-4">
                <p className="text-sm font-semibold text-white">No analytics telemetry recorded yet</p>
                <p className="text-xs text-slate-400 mt-1 max-w-md">
                  Approve milestones, submit deliverables, or settle invoices to populate live time-series analytics.
                </p>
              </div>
            ) : (
              <>
                <svg
                  className="w-full h-44"
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="analyticsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={isClient ? '#2563EB' : '#8B5CF6'} stopOpacity="0.35" />
                      <stop offset="100%" stopColor={isClient ? '#2563EB' : '#8B5CF6'} stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {areaD && <path d={areaD} fill="url(#analyticsGrad)" />}
                  {pathD && (
                    <path
                      d={pathD}
                      fill="none"
                      stroke={isClient ? '#2563EB' : '#8B5CF6'}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  )}
                  {points.map((pt) => (
                    <circle
                      key={pt.month}
                      cx={pt.x}
                      cy={pt.y}
                      r={hoveredPoint?.month === pt.month ? 6 : 3.5}
                      className={`${
                        isClient ? 'fill-[#2563EB]' : 'fill-[#8B5CF6]'
                      } stroke-white dark:stroke-[#080D18] stroke-2 cursor-pointer transition-all`}
                      onMouseEnter={() => setHoveredPoint(pt)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  ))}
                </svg>

                <div className="flex justify-between text-xs text-slate-400 font-mono pt-3 px-4">
                  {activeSeries.map((d) => (
                    <span key={d.month}>{d.month}</span>
                  ))}
                </div>

                {hoveredPoint && (
                  <div className="mt-2 text-center text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                    {hoveredPoint.month}: {isClient ? `$${hoveredPoint.spend.toLocaleString()} spent` : `${hoveredPoint.velocity}% ratio`}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* DETAILED BREAKDOWN TABLE */}
        <div className="rounded-2xl bg-white dark:bg-[#111C30] border border-slate-200/80 dark:border-[#26344B] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-[#26344B]">
            <h3 className="font-heading text-base font-bold text-slate-900 dark:text-white">
              {isClient ? 'Project Budget Allocation & Burn Ledger' : 'Milestone Verification & Payout Feed'}
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {isGuest ? 'Demo Sample Ledger' : 'Database Ledger'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#26344B] text-slate-400 text-xs uppercase tracking-wider font-semibold">
                  <th className="pb-3 px-3">Project / Deliverable</th>
                  <th className="pb-3 px-3">{isClient ? 'Assigned Studio' : 'Client Organization'}</th>
                  <th className="pb-3 px-3">{isClient ? 'Total Budget' : 'Milestone Amount'}</th>
                  <th className="pb-3 px-3">{isClient ? 'Progress' : 'Verification Score'}</th>
                  <th className="pb-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#26344B]/60 font-sans">
                {isGuest ? (
                  isClient ? (
                    <>
                      <tr className="hover:bg-slate-50 dark:hover:bg-[#152238]/40 transition-colors">
                        <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">Payment Gateway Integration</td>
                        <td className="py-3 px-3 text-slate-500 dark:text-slate-300">Northstar Digital Studio</td>
                        <td className="py-3 px-3 font-mono font-semibold">$18,500.00</td>
                        <td className="py-3 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">$9,500.00</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            Active Invoicing
                          </span>
                        </td>
                      </tr>
                    </>
                  ) : (
                    <>
                      <tr className="hover:bg-slate-50 dark:hover:bg-[#152238]/40 transition-colors">
                        <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">OAuth2 PKCE Flow &amp; Token Rotation</td>
                        <td className="py-3 px-3 text-slate-500 dark:text-slate-300">Meridian Labs</td>
                        <td className="py-3 px-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400 font-bold">$4,500.00</td>
                        <td className="py-3 px-3 font-mono text-blue-600 dark:text-blue-400 font-bold">98.4% (Demo)</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Settled (Demo)
                          </span>
                        </td>
                      </tr>
                    </>
                  )
                ) : isClient ? (
                  projects.length > 0 ? (
                    projects.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-[#152238]/40 transition-colors">
                        <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">{p.name}</td>
                        <td className="py-3 px-3 text-slate-500 dark:text-slate-300">{p.clientName}</td>
                        <td className="py-3 px-3 font-mono font-semibold">${Number(p.totalBudget || 0).toLocaleString()}</td>
                        <td className="py-3 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          {p.completedMilestonesCount || 0} / {p.milestonesCount || 0}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-950/80 text-blue-300 border border-blue-800">
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-xs text-slate-400">
                        No project budget entries yet.
                      </td>
                    </tr>
                  )
                ) : milestones.length > 0 ? (
                  milestones.map((m) => {
                    const parent = projects.find((p) => p.id === m.projectId);
                    return (
                      <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-[#152238]/40 transition-colors">
                        <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">{m.title}</td>
                        <td className="py-3 px-3 text-slate-500 dark:text-slate-300">{parent?.clientName || 'Workspace'}</td>
                        <td className="py-3 px-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400 font-bold">
                          ${Number(m.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 font-mono text-blue-600 dark:text-blue-400 font-bold">
                          {typeof (m.aiReport?.confidence ?? m.aiReport?.confidenceScore ?? m.aiReport?.overallScore) === 'number'
                            ? `${m.aiReport?.confidence ?? m.aiReport?.confidenceScore ?? m.aiReport?.overallScore}%`
                            : 'Pending AI Check'}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-950/80 text-blue-300 border border-blue-800 uppercase">
                            {m.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-xs text-slate-400">
                      No milestone deliverables recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AnalyticsPage;
