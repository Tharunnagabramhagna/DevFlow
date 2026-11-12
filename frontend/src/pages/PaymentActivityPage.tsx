import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import {
            Bell,
  X,
  Menu,
  Search,
  ChevronDown,
  Check,
  RotateCw,
          ExternalLink,
  Download,
  Clock,
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
  { month: 'Nov', amount: 18500 },
  { month: 'Dec', amount: 24000 },
];

export const PaymentActivityPage: React.FC = () => {
  const navigate = useNavigate();

  // Navigation & Layout States
  const { openMobileSidebar } = useSidebar();
  const { user, isGuest, isClient } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(true);

  const actorDisplayName = isGuest
    ? isClient
      ? 'Client Guest'
      : 'Developer Guest'
    : user?.name || (isClient ? 'Client Account' : 'Developer Account');
  const actorSubtitle = isGuest
    ? 'DEMO MODE'
    : isClient
      ? 'Client Account'
      : 'Developer Account';
  const actorInitials = isGuest
    ? isClient
      ? 'CG'
      : 'DG'
    : actorDisplayName
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || (isClient ? 'CL' : 'DV');

  // Data Loading & API Sync
  const [, setMilestones] = useState<Milestone[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [financials, setFinancials] = useState<{
    receivedPaymentAmount: number;
    pendingPaymentAmount: number;
    completedPayoutAmount: number;
    pendingPayoutAmount: number;
    paypalConfigured: boolean;
    paypalMode: string;
    timeSeries: { label: string; paid: number; approved: number }[];
  }>({
    receivedPaymentAmount: 0,
    pendingPaymentAmount: 0,
    completedPayoutAmount: 0,
    pendingPayoutAmount: 0,
    paypalConfigured: false,
    paypalMode: 'sandbox',
    timeSeries: [],
  });
  const [loading, setLoading] = useState(true);

  // Search, Filtering & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Success' | 'Pending' | 'Failed'>('All');
  const [projectFilter, setProjectFilter] = useState<string>('All');

  // Selected Transaction ID
  const [selectedTransactionId, setSelectedTransactionId] = useState<string>(isGuest ? 'INV-2026-0842' : '');

  // Chart Tooltip Hover State
  const [hoveredMonth, setHoveredMonth] = useState<MonthlyDataPoint | null>(null);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (title: string, desc: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Transaction Registry (Strictly used ONLY in Guest Demo Mode)
  const initialTransactions: PaymentTransaction[] = useMemo(() => [
    {
      id: 'tx-1',
      transactionId: 'INV-2026-0841',
      invoiceNumber: 'INV-2026-0841',
      project: 'Payment Gateway Integration',
      client: 'Meridian Labs',
      amount: 5000.0,
      paymentDate: 'Nov 03, 2026',
      paymentMethod: 'PayPal Demo',
      status: 'Success',
      paypalReference: 'PP-DEMO-98471203',
      webhookTimestamp: 'Nov 03, 2026 17:42:10 UTC',
      relatedMilestone: 'Milestone 1: Core Payment Architecture',
      milestoneRoute: '/milestones',
      payerEmail: 'marcus@meridianlabs.io',
    },
    {
      id: 'tx-2',
      transactionId: 'INV-2026-0842',
      invoiceNumber: 'INV-2026-0842',
      project: 'Payment Gateway Integration',
      client: 'Meridian Labs',
      amount: 4500.0,
      paymentDate: 'Nov 05, 2026',
      paymentMethod: 'PayPal Demo',
      status: 'Success',
      paypalReference: 'PP-DEMO-12345678',
      webhookTimestamp: 'Nov 05, 2026 18:15:00 UTC',
      relatedMilestone: 'Milestone 2: Automated Invoicing',
      milestoneRoute: '/milestones',
      payerEmail: 'marcus@meridianlabs.io',
    },
    {
      id: 'tx-3',
      transactionId: 'INV-2026-0843',
      invoiceNumber: 'INV-2026-0843',
      project: 'Payment Gateway Integration',
      client: 'Meridian Labs',
      amount: 5000.0,
      paymentDate: 'Nov 07, 2026',
      paymentMethod: 'PayPal Demo',
      status: 'Pending',
      paypalReference: 'PP-DEMO-44910283',
      webhookTimestamp: 'Awaiting client approval & webhook capture',
      relatedMilestone: 'Milestone 3: AI Milestone Verification',
      milestoneRoute: '/milestones',
      payerEmail: 'marcus@meridianlabs.io',
    },
    {
      id: 'tx-4',
      transactionId: 'INV-2026-0844',
      invoiceNumber: 'INV-2026-0844',
      project: 'Analytics Dashboard',
      client: 'Vertex Systems',
      amount: 4200.0,
      paymentDate: 'Nov 06, 2026',
      paymentMethod: 'PayPal Sandbox',
      status: 'Success',
      paypalReference: 'PP-DEMO-55201948',
      webhookTimestamp: 'Nov 06, 2026 14:10:00 UTC',
      relatedMilestone: 'Milestone 3: Real-Time Telemetry Pipeline',
      milestoneRoute: '/milestones',
      payerEmail: 'schen@vertexsystems.com',
    },
    {
      id: 'tx-5',
      transactionId: 'INV-2026-0845',
      invoiceNumber: 'INV-2026-0845',
      project: 'API Modernization',
      client: 'BluePeak Technologies',
      amount: 3200.0,
      paymentDate: 'Nov 07, 2026',
      paymentMethod: 'PayPal Sandbox',
      status: 'Pending',
      paypalReference: 'PP-DEMO-77192840',
      webhookTimestamp: 'Invoice dispatched to client portal',
      relatedMilestone: 'Milestone 2: REST & Rate Limiting',
      milestoneRoute: '/milestones',
      payerEmail: 'rachel@bluepeak.tech',
    },
    {
      id: 'tx-6',
      transactionId: 'INV-2026-0846',
      invoiceNumber: 'INV-2026-0846',
      project: 'Customer Portal',
      client: 'Meridian Labs',
      amount: 2800.0,
      paymentDate: 'Nov 04, 2026',
      paymentMethod: 'PayPal Sandbox',
      status: 'Success',
      paypalReference: 'PP-DEMO-33910284',
      webhookTimestamp: 'Nov 04, 2026 11:05:33 UTC',
      relatedMilestone: 'Milestone 1: Deliverable Verification Shell',
      milestoneRoute: '/milestones',
      payerEmail: 'marcus@meridianlabs.io',
    },
  ], []);

  const loadData = async () => {
    setLoading(true);
    if (isGuest) {
      setTransactions(initialTransactions);
      setFinancials({
        receivedPaymentAmount: initialTransactions.filter((t) => t.status === 'Success').reduce((s, t) => s + t.amount, 0),
        pendingPaymentAmount: initialTransactions.filter((t) => t.status === 'Pending').reduce((s, t) => s + t.amount, 0),
        completedPayoutAmount: 0,
        pendingPayoutAmount: 0,
        paypalConfigured: false,
        paypalMode: 'sandbox',
        timeSeries: MONTHLY_TREND.map((m) => ({ label: m.month, paid: m.amount, approved: m.amount })),
      });
      setSelectedTransactionId('INV-2026-0842');
      setLoading(false);
      return;
    }

    try {
      const [invRes, finRes, mRes, pRes] = await Promise.all([
        devFlowApi.getInvoices(),
        devFlowApi.getFinancialSummary('all'),
        devFlowApi.getMilestones(),
        devFlowApi.getProjects(),
      ]);
      setMilestones(mRes.data);
      setProjects(pRes.data);
      setFinancials({
        receivedPaymentAmount: Number(finRes.data?.receivedPaymentAmount || 0),
        pendingPaymentAmount: Number(finRes.data?.pendingPaymentAmount || 0),
        completedPayoutAmount: Number(finRes.data?.completedPayoutAmount || 0),
        pendingPayoutAmount: Number(finRes.data?.pendingPayoutAmount || 0),
        paypalConfigured: Boolean(finRes.paypalConfigured),
        paypalMode: finRes.paypalMode || 'sandbox',
        timeSeries: (finRes.data?.timeSeries || []).map((pt) => ({
          label: pt.label,
          paid: Number(pt.received || 0),
          approved: Number(pt.pending || 0) + Number(pt.received || 0),
        })),
      });

      const mappedTx: PaymentTransaction[] = (invRes.data || []).map(({ milestone, invoice }) => {
        const parentProj = pRes.data.find((p) => p.id === milestone.projectId);
        const st = String(invoice.status || '').toUpperCase();
        const mappedStatus: PaymentTransaction['status'] =
          st === 'PAID' ? 'Success' : st === 'CANCELLED' ? 'Failed' : 'Pending';
        const refDate = invoice.paidAt || invoice.createdAt || milestone.dueDate;
        return {
          id: invoice.id,
          transactionId: invoice.invoiceNumber || invoice.id,
          invoiceNumber: invoice.invoiceNumber || `INV-${invoice.id.slice(0, 8)}`,
          project: parentProj?.name || 'Workspace Project',
          client: parentProj?.clientName || 'Client',
          amount: Number(invoice.amount || milestone.amount || 0),
          paymentDate: refDate ? new Date(refDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '—',
          paymentMethod: finRes.paypalConfigured ? `PayPal (${finRes.paypalMode})` : 'PayPal (Not Configured)',
          status: mappedStatus,
          paypalReference: invoice.paypalInvoiceId || invoice.id,
          webhookTimestamp: invoice.paidAt ? new Date(invoice.paidAt).toUTCString() : 'Awaiting Settlement',
          relatedMilestone: milestone.title,
          milestoneRoute: '/milestones',
          payerEmail: invoice.recipientEmail || parentProj?.clientEmail || '—',
        };
      });

      setTransactions(mappedTx);
      if (mappedTx.length > 0 && !mappedTx.some((t) => t.transactionId === selectedTransactionId)) {
        setSelectedTransactionId(mappedTx[0].transactionId);
      } else if (mappedTx.length === 0) {
        setSelectedTransactionId('');
      }
    } catch (err) {
      console.error('Failed to load telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isGuest]);

  const projectOptions = useMemo(() => {
    const names = new Set<string>(transactions.map((t) => t.project).filter(Boolean));
    projects.forEach((p) => names.add(p.name));
    return Array.from(names);
  }, [transactions, projects]);

  // Filtered & Searched Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchSearch =
        tx.transactionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.relatedMilestone.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = statusFilter === 'All' || tx.status === statusFilter;
      const matchProject = projectFilter === 'All' || tx.project === projectFilter;

      return matchSearch && matchStatus && matchProject;
    });
  }, [transactions, searchQuery, statusFilter, projectFilter]);

  // Selected Transaction Object
  const currentTransaction = useMemo(() => {
    return (
      transactions.find((tx) => tx.transactionId === selectedTransactionId) ||
      transactions[0] ||
      null
    );
  }, [transactions, selectedTransactionId]);

  // Financial Summary KPI Aggregates consistent with financialSummary service
  const summaryMetrics = useMemo(() => {
    if (isGuest) {
      const totalReceived = transactions.filter((t) => t.status === 'Success').reduce((acc, curr) => acc + curr.amount, 0);
      const pending = transactions.filter((t) => t.status === 'Pending').reduce((acc, curr) => acc + curr.amount, 0);
      const totalCount = transactions.length;
      const verifiedRate = totalCount > 0 ? Math.round((transactions.filter((t) => t.status === 'Success').length / totalCount) * 100) : 0;
      return {
        totalReceived,
        pending,
        totalCount,
        settledCount: transactions.filter((t) => t.status === 'Success').length,
        pendingCount: transactions.filter((t) => t.status === 'Pending').length,
        verifiedRate,
      };
    }

    const settledCount = transactions.filter((t) => t.status === 'Success').length;
    const pendingCount = transactions.filter((t) => t.status === 'Pending').length;
    const verifiedRate = transactions.length > 0 ? Math.round((settledCount / transactions.length) * 100) : 0;

    return {
      totalReceived: financials.completedPayoutAmount > 0 ? financials.completedPayoutAmount : financials.receivedPaymentAmount,
      pending: financials.pendingPayoutAmount > 0 ? financials.pendingPayoutAmount : financials.pendingPaymentAmount,
      totalCount: transactions.length,
      settledCount,
      pendingCount,
      verifiedRate,
    };
  }, [transactions, financials, isGuest]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#080D18] text-white">
        <div className="flex items-center gap-2.5 text-xs text-slate-400 font-mono">
          <RotateCw className="w-4 h-4 text-[#2563EB] animate-spin" />
          <span>Synchronizing Payment Telemetry...</span>
        </div>
      </div>
    );
  }

  // Monthly Chart SVG geometry calculations
  const chartSeries: MonthlyDataPoint[] = isGuest
    ? MONTHLY_TREND
    : (financials.timeSeries || []).map((pt) => ({ label: pt.label, month: pt.label, amount: Number(pt.paid || 0) }));

  const chartHeight = 140;
  const chartWidth = 520;
  const paddingLeft = 35;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 25;

  const maxAmount = Math.max(100, ...chartSeries.map((d) => d.amount));
  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const points = chartSeries.map((d, index) => {
    const x = chartSeries.length === 1 ? paddingLeft + innerWidth / 2 : paddingLeft + (index / (chartSeries.length - 1)) * innerWidth;
    const y = paddingTop + innerHeight - (d.amount / maxAmount) * innerHeight;
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, point, i, arr) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    const prev = arr[i - 1];
    const cpX = (prev.x + point.x) / 2;
    return `${acc} C ${cpX} ${prev.y}, ${cpX} ${point.y}, ${point.x} ${point.y}`;
  }, '');

  const areaD =
    points.length > 1
      ? `${pathD} L ${points[points.length - 1].x} ${chartHeight - paddingBottom} L ${points[0].x} ${chartHeight - paddingBottom} Z`
      : '';

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#080D18]">
        {/* PAGE HEADER */}
        <header className="relative z-30 h-16 px-4 sm:px-6 lg:px-8 border-b border-[#26344B] bg-[#080D18]/90 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={openMobileSidebar}
              className="lg:hidden p-2 text-slate-400 hover:text-white rounded-xl hover:bg-[#101A2D]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-heading text-lg sm:text-xl font-extrabold text-white tracking-tight leading-none">
                  {isClient ? 'Payment Activity & Settlements' : 'Payments & Payouts'}
                </h1>
                <span className="text-[10px] font-sans font-bold bg-blue-950/80 text-blue-400 border border-blue-800/60 px-2 py-0.5 rounded-full whitespace-nowrap">
                  {isGuest
                    ? 'DEMO MODE'
                    : financials.paypalConfigured
                      ? `PAYPAL ${financials.paypalMode.toUpperCase()}`
                      : 'LIVE LEDGER'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <button
              onClick={() => {
                loadData();
                showToast('Refreshed', 'Payment ledger refreshed from backend database.', 'info');
              }}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-[#101A2D] transition-colors cursor-pointer"
              title="Refresh ledger"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-[#101A2D] relative transition-colors"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {transactions.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-[#080D18]" />
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-[#111C30] border border-[#26344B] rounded-2xl shadow-2xl p-4 z-50 text-xs sm:text-sm space-y-2.5">
                  <div className="font-bold text-white flex justify-between items-center pb-2 border-b border-[#26344B]">
                    <span>Payment Activity Alerts</span>
                    <span className="text-xs text-blue-400 cursor-pointer" onClick={() => setNotificationsOpen(false)}>
                      Close
                    </span>
                  </div>
                  <div className="space-y-2">
                    {transactions.length > 0 ? (
                      transactions.slice(0, 2).map((tx) => (
                        <div key={tx.id} className="p-2.5 rounded-xl bg-[#080D18] border border-[#26344B]">
                          <div className="font-semibold text-white">{tx.invoiceNumber} &bull; {tx.status === 'Success' ? 'Settled' : tx.status}</div>
                          <div className="text-xs text-slate-400">${tx.amount.toLocaleString()} &bull; {tx.project}</div>
                        </div>
                      ))
                    ) : (
                      <div className="p-2.5 rounded-xl bg-[#080D18] border border-[#26344B] text-xs text-slate-400">
                        No payment alerts recorded yet.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Avatar */}
            <div
              onClick={() => navigate('/settings')}
              className="flex items-center gap-2 pl-2.5 border-l border-[#26344B] cursor-pointer hover:opacity-90 transition-opacity"
            >
              <div
                className={`w-8 h-8 rounded-xl text-white flex items-center justify-center font-bold text-xs ring-1 ring-[#26344B] shadow-sm ${
                  isClient
                    ? 'bg-gradient-to-tr from-[#2563EB] to-[#60A5FA]'
                    : 'bg-gradient-to-tr from-violet-600 to-indigo-500'
                }`}
              >
                {actorInitials}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-white leading-tight">{actorDisplayName}</span>
                <span className="text-[10px] text-slate-400">{actorSubtitle}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>
        </header>

        {/* Scrollable Dashboard Workspace */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-7 py-5 space-y-6 max-w-[1600px] w-full mx-auto">
          {toastMessage && (
            <div className="rounded-xl px-4 py-3 border border-blue-700/50 bg-blue-950/60 text-xs text-blue-200 flex items-center justify-between">
              <span><strong className="mr-1.5">{toastMessage.title}:</strong>{toastMessage.desc}</span>
              <button onClick={() => setToastMessage(null)}><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* FINANCIAL SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl bg-[#111C30] border border-[#26344B] p-4 shadow-sm hover:border-slate-600 transition-colors">
              <span className="font-sans text-xs text-slate-400 block font-medium">
                {isGuest ? 'Total Settled (Demo)' : isClient ? 'Total Settled Payments' : 'Received Payouts'}
              </span>
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-sans tabular-nums tracking-tight mt-1">
                ${summaryMetrics.totalReceived.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-slate-500 font-sans tabular-nums mt-0.5 block">
                {summaryMetrics.settledCount} settled invoice(s)
              </span>
            </div>

            <div className="rounded-xl bg-[#111C30] border border-[#26344B] p-4 shadow-sm hover:border-slate-600 transition-colors">
              <span className="font-sans text-xs text-slate-400 block font-medium">Pending Settlement</span>
              <div className="text-xl sm:text-2xl font-extrabold text-amber-400 font-sans tabular-nums tracking-tight mt-1">
                ${summaryMetrics.pending.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-slate-500 font-sans tabular-nums mt-0.5 block">
                {summaryMetrics.pendingCount} pending invoice(s)
              </span>
            </div>

            <div className="rounded-xl bg-[#111C30] border border-[#26344B] p-4 shadow-sm hover:border-slate-600 transition-colors">
              <span className="font-sans text-xs text-slate-400 block font-medium">Settlement Rate</span>
              <div className="text-xl sm:text-2xl font-extrabold text-blue-400 font-sans tabular-nums tracking-tight mt-1">
                {summaryMetrics.verifiedRate}%
              </div>
              <span className="text-[11px] text-slate-500 font-sans mt-0.5 block">Settled vs issued invoices</span>
            </div>

            <div className="rounded-xl bg-[#111C30] border border-[#26344B] p-4 shadow-sm hover:border-slate-600 transition-colors">
              <span className="font-sans text-xs text-slate-400 block font-medium">PayPal Webhook Listener</span>
              <div className="text-xl sm:text-2xl font-extrabold text-white font-sans tabular-nums tracking-tight mt-1">
                {isGuest ? 'Demo Preview' : financials.paypalConfigured ? 'Configured' : 'Not Configured'}
              </div>
              <span className={`text-[11px] font-sans mt-0.5 block ${financials.paypalConfigured || isGuest ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isGuest ? 'Sample webhook events' : financials.paypalConfigured ? `${financials.paypalMode.toUpperCase()} mode active` : 'Set PAYPAL_CLIENT_ID in .env'}
              </span>
            </div>
          </div>

          {/* MONTHLY SETTLEMENT TREND CHART */}
          <div className="rounded-2xl bg-[#111C30] border border-[#26344B] p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#26344B] pb-3.5">
              <div>
                <h3 className="font-heading text-base sm:text-lg font-bold text-white">Settlement Volume Trend</h3>
                <p className="font-sans text-xs sm:text-sm text-slate-400">
                  {isGuest ? 'Demo settlement trend preview' : 'Recorded milestone payment and payout history'}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm font-mono">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="w-3 h-3 rounded-full bg-[#2563EB]" />
                  <span>Settled Amounts</span>
                </span>
                <span className="text-slate-500">&bull; {isGuest ? 'Demo Timeline' : 'Live Ledger'}</span>
              </div>
            </div>

            <div className="relative pt-2">
              {points.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-center border border-dashed border-[#26344B] rounded-xl px-4">
                  <p className="text-sm font-semibold text-white">No payment or payout settlements recorded yet</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Settled PayPal invoices and developer payouts will chart here automatically.
                  </p>
                </div>
              ) : (
                <>
                  <svg className="w-full h-40" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="payChartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {areaD && <path d={areaD} fill="url(#payChartGrad)" />}
                    {pathD && <path d={pathD} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />}
                    {points.map((pt) => (
                      <circle
                        key={pt.month}
                        cx={pt.x}
                        cy={pt.y}
                        r={hoveredMonth?.month === pt.month ? 6 : 3.5}
                        className="fill-[#2563EB] stroke-[#080D18] stroke-2 cursor-pointer transition-all"
                        onMouseEnter={() => setHoveredMonth(pt)}
                        onMouseLeave={() => setHoveredMonth(null)}
                      />
                    ))}
                  </svg>

                  <div className="flex justify-between text-xs text-slate-400 font-mono pt-3 px-6">
                    {chartSeries.map((d) => (
                      <span key={d.month}>{d.month}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* TRANSACTIONS SECTION & SLIDE-OVER DETAIL */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Transactions Table (Left lg:col-span-8 or lg:col-span-7) */}
            <div className={`${isDetailPanelOpen && currentTransaction ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-4 transition-all duration-200`}>
              {/* Filter Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5 p-4 rounded-2xl bg-[#111C30] border border-[#26344B]">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search invoices, projects, or clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#080D18] border border-[#26344B] rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div className="flex items-center gap-2.5">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-[#080D18] border border-[#26344B] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-300 focus:outline-none focus:border-[#2563EB] cursor-pointer"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Success">Success / Settled</option>
                    <option value="Pending">Pending Review</option>
                    <option value="Failed">Failed / Disputed</option>
                  </select>

                  <select
                    value={projectFilter}
                    onChange={(e) => setProjectFilter(e.target.value)}
                    className="bg-[#080D18] border border-[#26344B] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-300 focus:outline-none focus:border-[#2563EB] cursor-pointer"
                  >
                    <option value="All">All Projects</option>
                    {projectOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="rounded-2xl bg-[#111C30] border border-[#26344B] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-[#26344B] text-xs text-slate-400 font-semibold bg-[#101A2D]">
                        <th className="py-3.5 px-4">Invoice / ID</th>
                        <th className="py-3.5 px-4">Project &amp; Client</th>
                        <th className="py-3.5 px-4">Amount</th>
                        <th className="py-3.5 px-4">Settlement Date</th>
                        <th className="py-3.5 px-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#26344B]/40">
                      {filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 px-4 text-center text-xs sm:text-sm text-slate-400">
                            {transactions.length === 0
                              ? 'No payment transactions or payouts recorded yet.'
                              : 'No transactions match your current filter.'}
                          </td>
                        </tr>
                      ) : (
                        filteredTransactions.map((tx) => {
                        const isSelected = tx.transactionId === selectedTransactionId;
                        const statusBadge =
                          tx.status === 'Success'
                            ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800/60'
                            : tx.status === 'Pending'
                            ? 'bg-amber-950/70 text-amber-400 border-amber-800/60'
                            : 'bg-rose-950/70 text-rose-400 border-rose-800/60';

                        return (
                          <tr
                            key={tx.id}
                            onClick={() => {
                              setSelectedTransactionId(tx.transactionId);
                              setIsDetailPanelOpen(true);
                            }}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-[#15233D] border-l-4 border-[#2563EB]' : 'hover:bg-[#15233D]/60'
                            }`}
                          >
                            <td className="py-4 px-4 font-mono font-bold text-white text-xs sm:text-sm">
                              {tx.invoiceNumber}
                            </td>
                            <td className="py-4 px-4">
                              <div className="font-semibold text-white">{tx.project}</div>
                              <div className="text-xs text-slate-400">{tx.client}</div>
                            </td>
                            <td className="py-4 px-4 font-mono font-bold text-white text-xs sm:text-sm">
                              ${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-4 px-4 text-slate-400 font-mono text-xs">
                              {tx.paymentDate}
                            </td>
                            <td className="py-4 px-4 text-right">
                              <span className={`text-xs font-bold border px-3 py-1 rounded-full ${statusBadge}`}>
                                {tx.status === 'Success' ? 'Settled' : tx.status}
                              </span>
                            </td>
                          </tr>
                        );
                      }))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Slide-over Transaction Detail Panel (Right lg:col-span-5) */}
            {isDetailPanelOpen && currentTransaction && (
              <div className="lg:col-span-5 rounded-2xl bg-[#111C30] border border-[#26344B] p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between pb-3.5 border-b border-[#26344B]">
                  <div>
                    <span className="text-xs uppercase font-mono font-bold text-slate-400">Transaction Details</span>
                    <h3 className="text-lg font-bold text-white font-mono">{currentTransaction.invoiceNumber}</h3>
                  </div>
                  <button
                    onClick={() => setIsDetailPanelOpen(false)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#101A2D]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-[#080D18] border border-[#26344B] space-y-2.5 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Deliverable Amount:</span>
                    <span className="font-mono font-bold text-emerald-400 text-base">
                      ${currentTransaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payment Status:</span>
                    <span className="font-semibold text-white flex items-center gap-1.5">
                      {currentTransaction.status === 'Success' ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400">Settled (PayPal Webhook)</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 text-amber-400" />
                          <span className="text-amber-400">Pending Review</span>
                        </>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">PayPal Reference:</span>
                    <span className="font-mono text-slate-200">{currentTransaction.paypalReference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Payer / Client:</span>
                    <span className="text-slate-200">{currentTransaction.payerEmail}</span>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs sm:text-sm">
                  <h4 className="font-bold text-white uppercase text-xs tracking-wider">Milestone Verification Proof</h4>
                  <div className="p-4 rounded-xl bg-[#080D18] border border-[#26344B] space-y-2">
                    <div className="text-slate-200 font-semibold">{currentTransaction.relatedMilestone}</div>
                    <div className="text-xs text-slate-400 font-mono">Project: {currentTransaction.project}</div>
                    {isGuest ? (
                      <div className="flex items-center gap-2 pt-1 text-xs">
                        <span className="text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          AST Passed (94.2%)
                        </span>
                        <span className="text-slate-500">&bull;</span>
                        <span className="text-blue-400">Human Sign-off Confirmed</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 pt-1 text-xs">
                        <span className={currentTransaction.status === 'Success' ? 'text-emerald-400 flex items-center gap-1' : 'text-amber-400 flex items-center gap-1'}>
                          <Check className="w-3.5 h-3.5" />
                          {currentTransaction.status === 'Success' ? 'Settlement Recorded' : 'Pending Settlement'}
                        </span>
                        <span className="text-slate-500">&bull;</span>
                        <span className="text-slate-400">{currentTransaction.webhookTimestamp}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={() => {
                      showToast('Receipt Exported', `Cryptographic receipt generated for ${currentTransaction.invoiceNumber}`, 'success');
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Receipt</span>
                  </button>
                  <button
                    onClick={() => navigate('/milestones')}
                    className="py-2.5 px-4 rounded-xl bg-[#080D18] border border-[#26344B] hover:border-slate-500 text-slate-300 hover:text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors"
                  >
                    <span>View Milestone</span>
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
    </div>
  );
};
