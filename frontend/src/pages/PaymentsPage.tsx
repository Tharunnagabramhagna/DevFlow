import React, { useEffect, useState, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmptyState,
  Input,
  Modal,
  Skeleton,
  useToast,
} from '@/components/common';
import { devFlowApi } from '@/services/api';
import { Milestone, PayPalInvoice, Project } from '@/types';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Printer,
  CreditCard,
  ShieldCheck,
  ExternalLink,
  Search,
  ArrowUpDown,
  Info,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  Building2,
  Lock,
  User,
} from 'lucide-react';

// ─── Status Utilities ─────────────────────────────────────────────────────────

function getStatusBadge(status: PayPalInvoice['status']) {
  switch (status) {
    case 'PAID':
      return (
        <Badge variant="success" size="sm" dot>
          PAID &bull; Settled
        </Badge>
      );
    case 'SENT':
      return (
        <Badge variant="paypal" size="sm" dot>
          SENT &bull; Unpaid
        </Badge>
      );
    case 'OVERDUE':
      return (
        <Badge variant="danger" size="sm" dot pulseDot>
          OVERDUE &bull; Action Req.
        </Badge>
      );
    case 'DRAFT':
    default:
      return (
        <Badge variant="neutral" size="sm">
          DRAFT &bull; Pending Send
        </Badge>
      );
  }
}

// ─── Print Styles Helper ──────────────────────────────────────────────────────

const printStyles = `
@media print {
  body * {
    visibility: hidden;
  }
  #printable-invoice-container, #printable-invoice-container * {
    visibility: visible;
  }
  #printable-invoice-container {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    margin: 0;
    padding: 20px;
    background: white;
  }
  .no-print {
    display: none !important;
  }
}
`;

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

const PaymentsSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[0, 1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="pt-5 space-y-2">
            <Skeleton variant="text" className="w-24 h-3" />
            <Skeleton variant="text" className="w-32 h-7" />
            <Skeleton variant="text" className="w-40 h-3" />
          </CardContent>
        </Card>
      ))}
    </div>
    <Card>
      <CardContent className="pt-6 space-y-4">
        <Skeleton variant="text" className="w-full h-10" />
        <Skeleton variant="text" className="w-full h-12" />
        <Skeleton variant="text" className="w-full h-12" />
        <Skeleton variant="text" className="w-full h-12" />
      </CardContent>
    </Card>
  </div>
);

// ─── Main Payments Page Component ─────────────────────────────────────────────

export const PaymentsPage: React.FC = () => {
  const { toast } = useToast();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMockData, setIsMockData] = useState(false);

  // Filters, Search & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'PAID' | 'SENT' | 'OVERDUE' | 'DRAFT'>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');

  // Modal States
  const [selectedInvoiceData, setSelectedInvoiceData] = useState<{
    invoice: PayPalInvoice;
    milestone: Milestone;
  } | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  // PayPal Checkout Simulation State
  const [checkoutStep, setCheckoutStep] = useState<'idle' | 'authorizing' | 'webhook_simulating' | 'success' | 'failed'>('idle');
  const [simulateFailureMode, setSimulateFailureMode] = useState(false);
  const [generatedWebhookId, setGeneratedWebhookId] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [msRes, projRes] = await Promise.all([
        devFlowApi.getMilestones(),
        devFlowApi.getProjects(),
      ]);
      setMilestones(msRes.data);
      setProjects(projRes.data);
      setIsMockData(msRes.isMock);
    } catch (err) {
      console.error('Failed to load payments data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Compile all invoices
  const allInvoices = useMemo(() => {
    return milestones
      .filter((m) => m.invoice)
      .map((m) => ({ milestone: m, invoice: m.invoice! }));
  }, [milestones]);

  // KPI Metrics Calculation
  const totalInvoicesCount = allInvoices.length;
  const paidInvoices = allInvoices.filter((item) => item.invoice.status === 'PAID');
  const pendingInvoices = allInvoices.filter((item) => item.invoice.status === 'SENT' || item.invoice.status === 'DRAFT');
  const overdueInvoices = allInvoices.filter((item) => item.invoice.status === 'OVERDUE');

  const totalInvoiceValue = allInvoices.reduce((sum, item) => sum + item.invoice.amount, 0);
  const paidInvoiceValue = paidInvoices.reduce((sum, item) => sum + item.invoice.amount, 0);
  const pendingInvoiceValue = pendingInvoices.reduce((sum, item) => sum + item.invoice.amount, 0);
  const overdueInvoiceValue = overdueInvoices.reduce((sum, item) => sum + item.invoice.amount, 0);

  // Search & Filter Logic
  const filteredInvoices = useMemo(() => {
    return allInvoices
      .filter(({ milestone, invoice }) => {
        const query = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !query ||
          invoice.invoiceNumber.toLowerCase().includes(query) ||
          invoice.recipientName.toLowerCase().includes(query) ||
          invoice.recipientEmail.toLowerCase().includes(query) ||
          milestone.title.toLowerCase().includes(query) ||
          (invoice.paypalInvoiceId && invoice.paypalInvoiceId.toLowerCase().includes(query));

        const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') {
          return new Date(b.invoice.createdAt).getTime() - new Date(a.invoice.createdAt).getTime();
        }
        if (sortBy === 'date_asc') {
          return new Date(a.invoice.createdAt).getTime() - new Date(b.invoice.createdAt).getTime();
        }
        if (sortBy === 'amount_desc') {
          return b.invoice.amount - a.invoice.amount;
        }
        if (sortBy === 'amount_asc') {
          return a.invoice.amount - b.invoice.amount;
        }
        return 0;
      });
  }, [allInvoices, searchQuery, statusFilter, sortBy]);

  // Actions
  const handleOpenDetails = (invoice: PayPalInvoice, milestone: Milestone) => {
    setSelectedInvoiceData({ invoice, milestone });
    setIsDetailsModalOpen(true);
  };

  const handleOpenPreview = (invoice: PayPalInvoice, milestone: Milestone) => {
    setSelectedInvoiceData({ invoice, milestone });
    setIsPreviewModalOpen(true);
  };

  const handleOpenCheckout = (invoice: PayPalInvoice, milestone: Milestone) => {
    setSelectedInvoiceData({ invoice, milestone });
    setCheckoutStep('idle');
    setSimulateFailureMode(false);
    setIsCheckoutModalOpen(true);
  };

  // PayPal Sandbox Checkout Execution
  const handleExecutePaymentSimulation = async () => {
    if (!selectedInvoiceData) return;
    setCheckoutStep('authorizing');

    setTimeout(async () => {
      if (simulateFailureMode) {
        setCheckoutStep('failed');
        toast.error('Payment Authorization Declined', 'Simulated PayPal Sandbox payment failure: Insufficient sandbox funds or card rejected.');
        return;
      }

      setCheckoutStep('webhook_simulating');

      try {
        const res = await devFlowApi.recordPayPalPaymentEvent(selectedInvoiceData.invoice.id);
        const webhookId = res.data.paypalWebhookEventId || `WH-SIMULATED-${Date.now()}`;
        setGeneratedWebhookId(webhookId);
        setCheckoutStep('success');
        toast.success(
          'PayPal Webhook Confirmed',
          `Payment for ${selectedInvoiceData.invoice.invoiceNumber} verified via webhook (${webhookId}).`
        );
        await loadData();
      } catch {
        setCheckoutStep('failed');
        toast.error('Webhook Verification Failed', 'Could not record simulated webhook event.');
      }
    }, 1200);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <PaymentsSkeleton />;

  return (
    <div className="space-y-6">
      {/* Print stylesheet injection */}
      <style>{printStyles}</style>

      {/* Demonstration / Sandbox Transparency Banner */}
      {isMockData && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 rounded-xl bg-sky-50/90 border border-sky-200/90 text-xs text-sky-950 shadow-xs">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#0070BA] shrink-0" />
            <span className="leading-snug">
              <strong>PayPal Sandbox Environment:</strong> Transactions and webhook listeners operate in
              demonstration mode. Real payment methods are never charged. Settled status requires verified webhook signatures.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <Badge variant="paypal" size="sm" dot pulseDot>
              REST v2 Sandbox
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadData}
              leftIcon={<RefreshCw className="w-3 h-3" />}
              className="text-xs py-1 h-7 text-[#0070BA]"
            >
              Refresh
            </Button>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">PayPal Invoices &amp; Settlements</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated milestone invoicing, PayPal REST API integration, and cryptographically verified webhook settlement ledger
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <a
            href="https://developer.paypal.com/docs/api/invoicing/v2/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
          >
            <span>PayPal Docs v2</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>
        </div>
      </div>

      {/* 1. Invoice Dashboard KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Volume */}
        <Card className="hover:border-slate-300 transition-colors">
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Invoiced
              </CardTitle>
              <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                <FileText className="w-3.5 h-3.5" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black font-mono tabular-nums text-slate-900">
              ${totalInvoiceValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-mono">
              {totalInvoicesCount} invoices issued across projects
            </p>
          </CardContent>
        </Card>

        {/* Metric 2: Settled / Paid Volume */}
        <Card className="hover:border-emerald-200 transition-colors">
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Settled (Paid)
              </CardTitle>
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black font-mono tabular-nums text-emerald-700">
              ${paidInvoiceValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3 h-3" />
              <span>{paidInvoices.length} verified via PayPal webhooks</span>
            </p>
          </CardContent>
        </Card>

        {/* Metric 3: Pending Invoices */}
        <Card className="hover:border-sky-200 transition-colors">
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Pending Settlement
              </CardTitle>
              <div className="p-1.5 rounded-lg bg-sky-50 text-[#0070BA]">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black font-mono tabular-nums text-[#0070BA]">
              ${pendingInvoiceValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {pendingInvoices.length} awaiting sandbox client review
            </p>
          </CardContent>
        </Card>

        {/* Metric 4: Overdue Invoices */}
        <Card className="hover:border-rose-200 transition-colors">
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Overdue
              </CardTitle>
              <div className="p-1.5 rounded-lg bg-rose-50 text-rose-700">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black font-mono tabular-nums text-rose-700">
              ${overdueInvoiceValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-rose-600 mt-1 font-medium">
              {overdueInvoices.length} invoices past payment term
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2. Invoice Management Toolbar & Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        {/* Search */}
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search by invoice #, client, milestone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            className="text-xs py-1.5"
            data-testid="search-invoices"
          />
        </div>

        {/* Status Tabs + Sort Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto max-w-full">
          <div className="flex items-center gap-1 overflow-x-auto p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              data-testid="filter-all"
            >
              All ({allInvoices.length})
            </button>
            <button
              onClick={() => setStatusFilter('PAID')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                statusFilter === 'PAID' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              data-testid="filter-paid"
            >
              Paid ({paidInvoices.length})
            </button>
            <button
              onClick={() => setStatusFilter('SENT')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                statusFilter === 'SENT' ? 'bg-[#0070BA] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              data-testid="filter-sent"
            >
              Pending ({pendingInvoices.length})
            </button>
            <button
              onClick={() => setStatusFilter('OVERDUE')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                statusFilter === 'OVERDUE' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              data-testid="filter-overdue"
            >
              Overdue ({overdueInvoices.length})
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1 pl-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="amount_desc">Amount: High to Low</option>
              <option value="amount_asc">Amount: Low to High</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Invoicing Ledger Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Invoicing Ledger &amp; Cryptographic Receipts</CardTitle>
              <CardDescription>
                Invoices are generated upon milestone acceptance. Payments are verified via signed PayPal webhook payloads.
              </CardDescription>
            </div>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              Showing {filteredInvoices.length} of {allInvoices.length}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Invoice #</TableHead>
                  <TableHead className="min-w-[150px]">Client</TableHead>
                  <TableHead className="min-w-[180px]">Milestone / Deliverable</TableHead>
                  <TableHead className="whitespace-nowrap">Amount (USD)</TableHead>
                  <TableHead className="whitespace-nowrap">Issue Date</TableHead>
                  <TableHead className="whitespace-nowrap">Due Date</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                  <TableHead className="min-w-[200px]">Webhook Reference</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 ? (
                  <TableEmptyState
                    colSpan={9}
                    icon={<AlertCircle className="w-8 h-8 text-slate-300" />}
                    title="No Invoices Found"
                    description="No invoices match your search query or status filter. Try clearing filters."
                  />
                ) : (
                  filteredInvoices.map(({ milestone, invoice }) => (
                    <TableRow
                      key={invoice.id}
                      className="hover:bg-slate-50/80 transition-colors"
                      data-testid={`invoice-row-${invoice.invoiceNumber}`}
                    >
                      {/* Invoice ID */}
                      <TableCell className="font-mono text-xs font-bold text-[#0070BA] whitespace-nowrap">
                        <button
                          onClick={() => handleOpenDetails(invoice, milestone)}
                          className="hover:underline flex items-center gap-1 text-left"
                        >
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          <span>{invoice.invoiceNumber}</span>
                        </button>
                      </TableCell>

                      {/* Client */}
                      <TableCell>
                        <div className="font-medium text-slate-900 text-xs">{invoice.recipientName}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
                          {invoice.recipientEmail}
                        </div>
                      </TableCell>

                      {/* Milestone */}
                      <TableCell>
                        <div className="font-semibold text-xs text-slate-800 line-clamp-1">{milestone.title}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          ID: {milestone.id} &bull; Order #{milestone.order}
                        </div>
                      </TableCell>

                      {/* Amount */}
                      <TableCell className="font-mono tabular-nums font-bold text-slate-900 whitespace-nowrap">
                        ${invoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </TableCell>

                      {/* Issue Date */}
                      <TableCell className="text-xs text-slate-600 font-mono whitespace-nowrap">
                        {new Date(invoice.createdAt).toLocaleDateString()}
                      </TableCell>

                      {/* Due Date */}
                      <TableCell className="text-xs text-slate-600 font-mono whitespace-nowrap">
                        {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '—'}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="whitespace-nowrap">{getStatusBadge(invoice.status)}</TableCell>

                      {/* Webhook ID */}
                      <TableCell className="font-mono text-xs">
                        {invoice.paypalWebhookEventId ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/70 text-[11px]">
                            <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="truncate max-w-[180px]">{invoice.paypalWebhookEventId}</span>
                          </span>
                        ) : invoice.paypalInvoiceId ? (
                          <span className="inline-flex items-center gap-1 text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200/70 text-[11px]">
                            <Lock className="w-3 h-3 text-[#0070BA] shrink-0" />
                            <span>{invoice.paypalInvoiceId}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Awaiting dispatch</span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Details Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDetails(invoice, milestone)}
                            title="View Itemized Breakdown"
                            data-testid={`btn-details-${invoice.invoiceNumber}`}
                          >
                            Details
                          </Button>

                          {/* Print Preview Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenPreview(invoice, milestone)}
                            leftIcon={<Printer className="w-3.5 h-3.5" />}
                            title="Print / PDF Invoice"
                            data-testid={`btn-print-${invoice.invoiceNumber}`}
                          >
                            PDF
                          </Button>

                          {/* Pay / Settle Button */}
                          {invoice.status !== 'PAID' ? (
                            <Button
                              variant="paypal"
                              size="sm"
                              onClick={() => handleOpenCheckout(invoice, milestone)}
                              leftIcon={<CreditCard className="w-3.5 h-3.5" />}
                              data-testid={`btn-pay-${invoice.invoiceNumber}`}
                            >
                              Pay
                            </Button>
                          ) : (
                            <span className="p-1 px-2 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-semibold flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>Settled</span>
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 4. Recent Payment Webhook Activity Feed */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Webhook Settlement Log</CardTitle>
              <CardDescription>
                Real-time stream of cryptographic webhook events validated by the DevFlow payment module
              </CardDescription>
            </div>
            <Badge variant="success" size="sm" dot>
              Listener Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {paidInvoices.map(({ milestone, invoice }) => (
              <div
                key={invoice.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{invoice.invoiceNumber}</span>
                      <span className="text-slate-400">&bull;</span>
                      <span className="font-semibold text-slate-800 truncate">{milestone.title}</span>
                    </div>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Settled via <strong>{invoice.paymentMethod || 'PayPal Instant Settlement'}</strong> to{' '}
                      <span className="font-mono text-slate-700">{invoice.recipientEmail}</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] font-mono text-slate-400">
                      <span>Event: PAYMENT.INVOICING.INVOICE.PAID</span>
                      <span>&bull;</span>
                      <span>ID: {invoice.paypalWebhookEventId}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-sm font-mono font-black text-emerald-700">
                    +${invoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {invoice.paidAt ? new Date(invoice.paidAt).toLocaleString() : 'Settled'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ──────────────────────────────────────────────────────────────────────────
          MODAL 1: INVOICE DETAILS VIEW
      ────────────────────────────────────────────────────────────────────────── */}
      {selectedInvoiceData && (
        <Modal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          title={`Invoice: ${selectedInvoiceData.invoice.invoiceNumber}`}
          description={`Issued for milestone "${selectedInvoiceData.milestone.title}"`}
          size="lg"
          footer={
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    setIsPreviewModalOpen(true);
                  }}
                  leftIcon={<Printer className="w-3.5 h-3.5" />}
                >
                  Print / Preview
                </Button>
                {selectedInvoiceData.invoice.status !== 'PAID' && (
                  <Button
                    variant="paypal"
                    size="sm"
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      setIsCheckoutModalOpen(true);
                    }}
                    leftIcon={<CreditCard className="w-3.5 h-3.5" />}
                  >
                    Open PayPal Checkout
                  </Button>
                )}
              </div>
              <Button variant="secondary" size="sm" onClick={() => setIsDetailsModalOpen(false)}>
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-5 text-xs">
            {/* Top Info Banner */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Current Status
                </span>
                <div className="mt-1">{getStatusBadge(selectedInvoiceData.invoice.status)}</div>
              </div>
              <div className="sm:text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Total Payable
                </span>
                <div className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                  ${selectedInvoiceData.invoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                  {selectedInvoiceData.invoice.currency}
                </div>
              </div>
            </div>

            {/* Billed To / Billed By Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Billed Client
                </span>
                <p className="font-bold text-slate-900 text-sm">{selectedInvoiceData.invoice.recipientName}</p>
                <p className="text-slate-500 font-mono">{selectedInvoiceData.invoice.recipientEmail}</p>
                <p className="text-slate-400 text-[11px]">Organization: Fintech Ventures Ltd.</p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  Service Provider
                </span>
                <p className="font-bold text-slate-900 text-sm">DevFlow Engineering Platform</p>
                <p className="text-slate-500 font-mono">billing@devflow.team</p>
                <p className="text-slate-400 text-[11px]">Monitored Repo: Tharunnagabramhagna/DevFlow</p>
              </div>
            </div>

            {/* Itemized Services Breakdown */}
            <div className="space-y-2">
              <span className="text-[11px] uppercase font-bold text-slate-600 tracking-wider">
                Itemized Deliverable Breakdown
              </span>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="text-left p-2.5 pl-3">Item Description</th>
                      <th className="text-center p-2.5 w-16">Qty</th>
                      <th className="text-right p-2.5 w-28">Unit Price</th>
                      <th className="text-right p-2.5 pr-3 w-28">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {selectedInvoiceData.invoice.items && selectedInvoiceData.invoice.items.length > 0 ? (
                      selectedInvoiceData.invoice.items.map((item) => (
                        <tr key={item.id}>
                          <td className="p-2.5 pl-3 font-medium text-slate-800">{item.description}</td>
                          <td className="p-2.5 text-center font-mono text-slate-500">{item.quantity}</td>
                          <td className="p-2.5 text-right font-mono text-slate-700">
                            ${item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-2.5 pr-3 text-right font-mono font-semibold text-slate-900">
                            ${item.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-2.5 pl-3 font-medium text-slate-800">
                          {selectedInvoiceData.milestone.title}
                        </td>
                        <td className="p-2.5 text-center font-mono text-slate-500">1</td>
                        <td className="p-2.5 text-right font-mono text-slate-700">
                          ${selectedInvoiceData.invoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2.5 pr-3 text-right font-mono font-semibold text-slate-900">
                          ${selectedInvoiceData.invoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200 font-mono text-xs">
                    <tr>
                      <td colSpan={3} className="text-right p-2 pr-3 text-slate-500">
                        Subtotal:
                      </td>
                      <td className="text-right p-2 pr-3 font-semibold text-slate-800">
                        ${selectedInvoiceData.invoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="text-right p-2 pr-3 text-slate-500">
                        Estimated Tax / Processing Fee (0%):
                      </td>
                      <td className="text-right p-2 pr-3 text-slate-500">$0.00</td>
                    </tr>
                    <tr className="border-t border-slate-200 bg-slate-100/70 font-bold text-slate-900">
                      <td colSpan={3} className="text-right p-2.5 pr-3">
                        Total Payable:
                      </td>
                      <td className="text-right p-2.5 pr-3 text-sm text-[#0070BA]">
                        ${selectedInvoiceData.invoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Payment References & Cryptographic Verifications */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                PayPal Sandbox Gateway References
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px]">PayPal Invoice ID:</span>
                  <span className="text-slate-800 font-semibold">
                    {selectedInvoiceData.invoice.paypalInvoiceId || 'Pending REST registration'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Verified Webhook Event ID:</span>
                  {selectedInvoiceData.invoice.paypalWebhookEventId ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {selectedInvoiceData.invoice.paypalWebhookEventId}
                    </span>
                  ) : (
                    <span className="text-amber-700 italic">No webhook payment event recorded yet</span>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Timeline */}
            <div className="space-y-2">
              <span className="text-[11px] uppercase font-bold text-slate-600 tracking-wider">
                Milestone &amp; Payment Audit Timeline
              </span>
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-3">
                {selectedInvoiceData.invoice.timeline && selectedInvoiceData.invoice.timeline.length > 0 ? (
                  selectedInvoiceData.invoice.timeline.map((event, idx) => (
                    <div key={idx} className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900 text-xs">{event.event}</span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-500 text-[11px] leading-snug mt-0.5">{event.description}</p>
                        {event.actor && (
                          <span className="text-[10px] text-slate-400 font-mono">Actor: {event.actor}</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                      <Clock className="w-3 h-3" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-xs">Invoice Drafted</p>
                      <p className="text-slate-500 text-[11px]">
                        Created on {new Date(selectedInvoiceData.invoice.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          MODAL 2: PRINTABLE INVOICE PREVIEW
      ────────────────────────────────────────────────────────────────────────── */}
      {selectedInvoiceData && (
        <Modal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          title="Printable Invoice Document"
          description="High-fidelity print preview with official DevFlow & PayPal layout"
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-slate-400 no-print">Print view formatted for standard A4 / Letter PDF</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  leftIcon={<Printer className="w-3.5 h-3.5" />}
                  className="no-print"
                >
                  Print / Save PDF
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="no-print"
                >
                  Close
                </Button>
              </div>
            </div>
          }
        >
          {/* Printable Container */}
          <div
            id="printable-invoice-container"
            className="p-6 bg-white border border-slate-200 rounded-xl space-y-6 text-slate-900 font-sans shadow-xs"
          >
            {/* Header: Branding + Invoice Number */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#0070BA] text-white flex items-center justify-center font-bold text-sm">
                    DF
                  </div>
                  <span className="text-xl font-bold tracking-tight text-slate-900">DevFlow</span>
                </div>
                <p className="text-xs text-slate-500">AI-Powered Milestone Verification &amp; Payments</p>
                <p className="text-[11px] text-slate-400">PayPal Hackathon Submission Platform</p>
              </div>

              <div className="text-right space-y-1">
                <h3 className="text-lg font-black font-mono tracking-tight text-[#0070BA]">
                  {selectedInvoiceData.invoice.invoiceNumber}
                </h3>
                <div className="text-xs text-slate-500 font-mono">
                  Issued: {new Date(selectedInvoiceData.invoice.createdAt).toLocaleDateString()}
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  Due:{' '}
                  {selectedInvoiceData.invoice.dueDate
                    ? new Date(selectedInvoiceData.invoice.dueDate).toLocaleDateString()
                    : 'Upon Acceptance'}
                </div>
                <div className="mt-1">{getStatusBadge(selectedInvoiceData.invoice.status)}</div>
              </div>
            </div>

            {/* Billed From & Billed To */}
            <div className="grid grid-cols-2 gap-6 text-xs border-b border-slate-200 pb-5">
              <div>
                <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">From:</span>
                <p className="font-bold text-slate-900">DevFlow Engineering Services</p>
                <p className="text-slate-600">billing@devflow.team</p>
                <p className="text-slate-500 mt-1">Repository: Tharunnagabramhagna/DevFlow</p>
                <p className="text-slate-500">Branch: main</p>
              </div>

              <div>
                <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">Billed To:</span>
                <p className="font-bold text-slate-900">{selectedInvoiceData.invoice.recipientName}</p>
                <p className="text-slate-600">{selectedInvoiceData.invoice.recipientEmail}</p>
                <p className="text-slate-500 mt-1">
                  Project: {projects.find((p) => p.id === selectedInvoiceData.milestone.projectId)?.name || 'DevFlow Milestone Intelligence'}
                </p>
                <p className="text-slate-500">Milestone ID: {selectedInvoiceData.milestone.id}</p>
              </div>
            </div>

            {/* Itemized Table */}
            <div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase font-semibold">
                    <th className="text-left py-2">Service Description</th>
                    <th className="text-center py-2 w-16">Qty</th>
                    <th className="text-right py-2 w-28">Rate (USD)</th>
                    <th className="text-right py-2 w-28">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedInvoiceData.invoice.items && selectedInvoiceData.invoice.items.length > 0 ? (
                    selectedInvoiceData.invoice.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2.5 text-slate-800 font-medium">{item.description}</td>
                        <td className="py-2.5 text-center font-mono text-slate-500">{item.quantity}</td>
                        <td className="py-2.5 text-right font-mono text-slate-700">
                          ${item.unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                          ${item.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-2.5 text-slate-800 font-medium">
                        {selectedInvoiceData.milestone.title} &mdash; Full Acceptance
                      </td>
                      <td className="py-2.5 text-center font-mono text-slate-500">1</td>
                      <td className="py-2.5 text-right font-mono text-slate-700">
                        ${selectedInvoiceData.invoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                        ${selectedInvoiceData.invoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="border-t border-slate-200 pt-3 flex justify-end font-mono text-xs">
                <div className="w-64 space-y-1.5">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal:</span>
                    <span>
                      ${selectedInvoiceData.invoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Platform Fee (0%):</span>
                    <span>$0.00</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-slate-900 pt-2 border-t border-slate-200">
                    <span>Total Due:</span>
                    <span className="text-[#0070BA]">
                      ${selectedInvoiceData.invoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                      USD
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Remittance & Settlement Footer */}
            <div className="border-t border-slate-200 pt-4 text-xs text-slate-500 space-y-1">
              <p className="font-bold text-slate-700">Payment Instructions (PayPal Sandbox Integration):</p>
              <p>
                Invoices are processed automatically using the PayPal REST Invoicing v2 API. Payments made via PayPal
                Sandbox trigger an instant webhook receipt validation.
              </p>
              {selectedInvoiceData.invoice.paypalWebhookEventId && (
                <div className="mt-2 p-2 rounded bg-emerald-50 text-emerald-800 text-[11px] font-mono flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>
                    Cryptographically Settled Webhook Event: {selectedInvoiceData.invoice.paypalWebhookEventId}
                  </span>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          MODAL 3: PAYPAL CHECKOUT SIMULATION EXPERIENCE
      ────────────────────────────────────────────────────────────────────────── */}
      {selectedInvoiceData && (
        <Modal
          isOpen={isCheckoutModalOpen}
          onClose={() => setIsCheckoutModalOpen(false)}
          title="PayPal Sandbox Checkout Experience"
          description="Interactive demo of the client-side PayPal payment & webhook validation workflow"
          size="md"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] text-slate-400">Sandbox Test Mode</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsCheckoutModalOpen(false)}
                disabled={checkoutStep === 'authorizing' || checkoutStep === 'webhook_simulating'}
              >
                {checkoutStep === 'success' ? 'Finished' : 'Cancel'}
              </Button>
            </div>
          }
        >
          <div className="space-y-5 text-xs">
            {/* PayPal Branded Order Summary Card */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-[#003087] via-[#004B87] to-[#0070BA] text-white space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base tracking-tight text-white">PayPal</span>
                  <span className="text-[10px] uppercase font-semibold bg-white/20 px-1.5 py-0.5 rounded text-sky-100">
                    Sandbox
                  </span>
                </div>
                <span className="font-mono text-xs text-sky-200">
                  {selectedInvoiceData.invoice.invoiceNumber}
                </span>
              </div>
              <div>
                <p className="text-[11px] text-sky-100">Deliverable Payment Scope:</p>
                <p className="font-semibold text-white text-sm truncate">{selectedInvoiceData.milestone.title}</p>
              </div>
              <div className="pt-2 border-t border-white/20 flex items-center justify-between">
                <span className="text-xs text-sky-100">Amount to Authorize:</span>
                <span className="text-xl font-bold font-mono text-white">
                  ${selectedInvoiceData.invoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                </span>
              </div>
            </div>

            {/* Test Mode Selector (Success vs Failure) */}
            {checkoutStep === 'idle' && (
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-700 font-medium">Simulation Response Mode:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSimulateFailureMode(false)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                      !simulateFailureMode
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Simulate Success
                  </button>
                  <button
                    onClick={() => setSimulateFailureMode(true)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                      simulateFailureMode
                        ? 'bg-rose-600 text-white'
                        : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Simulate Failure
                  </button>
                </div>
              </div>
            )}

            {/* STATE 1: IDLE / READY TO PAY */}
            {checkoutStep === 'idle' && (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-slate-500 text-center">
                  Select payment method to test the PayPal REST invoice settlement callback:
                </p>

                {/* Golden PayPal Button */}
                <button
                  onClick={handleExecutePaymentSimulation}
                  className="w-full py-3 px-4 rounded-xl bg-[#FFC439] hover:bg-[#F2BA36] active:bg-[#E5AF30] text-[#003087] font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-all"
                  data-testid="paypal-checkout-gold-btn"
                >
                  <span className="italic font-black text-base tracking-tight text-[#003087]">Pay</span>
                  <span className="italic font-black text-base tracking-tight text-[#0070BA]">Pal</span>
                  <span className="font-semibold text-xs ml-1 text-slate-800">Checkout</span>
                </button>

                {/* Dark Debit / Credit Card Option */}
                <button
                  onClick={handleExecutePaymentSimulation}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all"
                >
                  <CreditCard className="w-4 h-4 text-slate-300" />
                  <span>Debit or Credit Card</span>
                </button>

                <div className="text-[11px] text-slate-400 text-center pt-1">
                  Protected by PayPal Sandbox Encryption &bull; Zero Real Funds
                </div>
              </div>
            )}

            {/* STATE 2 & 3: PROCESSING / WEBHOOK VERIFYING */}
            {(checkoutStep === 'authorizing' || checkoutStep === 'webhook_simulating') && (
              <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
                <div className="w-12 h-12 rounded-full border-4 border-[#0070BA] border-t-transparent animate-spin" />
                <div className="space-y-1">
                  <p className="font-bold text-slate-900 text-sm">
                    {checkoutStep === 'authorizing'
                      ? 'Authorizing with PayPal OAuth2 Sandbox...'
                      : 'Verifying Signed Webhook Event...'}
                  </p>
                  <p className="text-xs text-slate-500 font-mono">
                    {checkoutStep === 'authorizing'
                      ? 'POST https://api-m.sandbox.paypal.com/v2/invoicing/invoices'
                      : 'Validating CRC32 payload hash & cert URL headers'}
                  </p>
                </div>
              </div>
            )}

            {/* STATE 4: SUCCESS */}
            {checkoutStep === 'success' && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
                <div className="flex items-center gap-2.5 text-emerald-800">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Payment Verified &amp; Settled!</h4>
                    <p className="text-xs text-emerald-700">
                      PayPal webhook transmission confirmed by DevFlow payment module.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white border border-emerald-200 font-mono text-xs space-y-1.5 text-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Invoice:</span>
                    <span className="font-bold">{selectedInvoiceData.invoice.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Settled Amount:</span>
                    <span className="font-bold text-emerald-700">
                      ${selectedInvoiceData.invoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                      USD
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Webhook Event ID:</span>
                    <span className="text-emerald-800 font-bold truncate max-w-[200px]">
                      {generatedWebhookId || selectedInvoiceData.invoice.paypalWebhookEventId}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Method:</span>
                    <span>PayPal Instant Settlement</span>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCheckoutModalOpen(false)}
                    className="border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                  >
                    Done &bull; View In Ledger
                  </Button>
                </div>
              </div>
            )}

            {/* STATE 5: FAILED STATE */}
            {checkoutStep === 'failed' && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-3">
                <div className="flex items-center gap-2.5 text-rose-800">
                  <div className="w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0">
                    <X className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Sandbox Payment Declined</h4>
                    <p className="text-xs text-rose-700">
                      Simulated PayPal Sandbox failure: Transaction rejected or timed out.
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  No invoice status changes were recorded. The invoice remains in its previous state in the ledger.
                </p>

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSimulateFailureMode(false);
                      setCheckoutStep('idle');
                    }}
                  >
                    Retry in Success Mode
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setIsCheckoutModalOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
