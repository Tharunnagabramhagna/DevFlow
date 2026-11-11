import { DevFlowLogo, GuestGuardModal } from '@/components/common';
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  CheckCircle2,
  FileText,
  Settings,
  Bell,
  Search,
  Plus,
  Copy,
  Check,
  X,
  Menu,
  ChevronDown,
  Printer,
  CreditCard,
  Lock,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowRight,
  Clock,
  Download,
} from 'lucide-react';
import { devFlowApi } from '@/services/api';
import { Milestone, Project } from '@/types';

// Custom PayPal Logo Mark
const PayPalIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path
      d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.789.789 0 0 1 .777-.66h7.026c2.81 0 4.887.675 5.86 1.905.922 1.168.995 2.802.215 4.86-.022.057-.046.113-.07.168-.783 2.113-2.22 3.613-4.27 4.457-.866.357-1.892.538-3.05.538H9.362a.788.788 0 0 0-.777.66l-.992 5.093a.64.64 0 0 1-.517.596z"
      fill="#0079C1"
    />
    <path
      d="M19.068 7.378c-.783 2.113-2.22 3.613-4.27 4.457-.866.357-1.892.538-3.05.538H9.362a.788.788 0 0 0-.777.66l-.992 5.093a.64.64 0 0 1-.517.596H2.47a.641.641 0 0 1-.633-.74L4.944 3.72"
      fill="#00457C"
      opacity="0.2"
    />
    <path
      d="M9.135 12.373l.865-4.444.027-.142A.789.789 0 0 1 10.804 7.1h5.05c2.02 0 3.513.486 4.212 1.37.562.712.67 1.706.324 2.953-.61 2.19-2.074 3.42-4.137 3.42h-2.126a.788.788 0 0 0-.777.66l-.68 3.49-.135.68h-3.4zm7.68-4.273h-3.93a.473.473 0 0 0-.466.395l-.624 3.204h1.53c1.47 0 2.515-.878 2.952-2.443.207-.743.085-1.156-.462-1.156z"
      fill="#0079C1"
    />
  </svg>
);

// Extended Invoice Item for unified table and detail rendering
export interface UnifiedInvoiceItem {
  id: string;
  invoiceNumber: string;
  project: string;
  client: string;
  clientEmail: string;
  clientAddress?: string;
  clientDescription?: string;
  relatedMilestone: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  status: 'Paid' | 'Sent' | 'Pending' | 'Overdue' | 'Draft';
  referenceNumber: string;
  timelineCreated: string;
  timelineSent: string;
  timelineStatus: string;
  hostedInvoiceUrl: string;
  notes?: string;
  paypalWebhookEventId?: string;
}

export const PaymentsPage: React.FC = () => {
  const navigate = useNavigate();

  // Navigation & Layout States
  const { openMobileSidebar } = useSidebar();
  const { user, isGuest, isClient, logout } = useAuth();
  const [isGuestGuardOpen, setIsGuestGuardOpen] = useState(false);
  const [guardActionTitle, setGuardActionTitle] = useState('Create Invoice');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const clientDisplayName = isGuest ? 'Client Guest' : user?.name || 'Client Account';
  const clientInitials = isGuest
    ? 'CG'
    : clientDisplayName
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'CL';

  // Data Loading & Live State
  const [, setMilestones] = useState<Milestone[]>([]);
  const [, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Sent' | 'Pending' | 'Overdue' | 'Draft'>('All');
  const [projectFilter, setProjectFilter] = useState<string>('Select Project');
  const [clientFilter, setClientFilter] = useState<string>('Select Client');
  const [dateFilter, setDateFilter] = useState<string>('Select Range');

  // Selected Invoice ID (Defaulting to INV-2026-002 as depicted in the reference screenshot)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('INV-2026-002');

  // Pagination States
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals & Drawers States
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isCreateInvoiceModalOpen, setIsCreateInvoiceModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // Form State for Create Invoice Modal
  const [newClient, setNewClient] = useState('');
  const [newProject, setNewProject] = useState('');
  const [newMilestone, setNewMilestone] = useState('');
  const [newAmount, setNewAmount] = useState('8500');
  const [newDueDate, setNewDueDate] = useState('2026-11-28');

  // Sandbox Checkout Simulation States
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'review' | 'processing' | 'success' | 'error'>('review');

  // Copy Feedback State
  const [copiedLink, setCopiedLink] = useState(false);
  const [, setToastMessage] = useState<{ title: string; desc: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (title: string, desc: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const [milestonesRes, projectsRes] = await Promise.all([
        devFlowApi.getMilestones(),
        devFlowApi.getProjects(),
      ]);
      setMilestones(milestonesRes.data);
      setProjects(projectsRes.data);
    } catch (err) {
      console.error('Failed to load invoice telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  // Static/Demo Table Entries matching the visual reference screenshot
  const initialInvoiceList: UnifiedInvoiceItem[] = useMemo(() => [
    {
      id: 'inv-1',
      invoiceNumber: 'INV-2026-001',
      project: 'Apollo Mobile',
      client: 'Acme Corp',
      clientEmail: 'billing@acme-corp.com',
      clientAddress: '100 Market St, San Francisco, CA',
      clientDescription: 'Enterprise mobile platform for client logistics.',
      relatedMilestone: 'Milestone 3: API Integration',
      amount: 7500.0,
      issueDate: 'Oct 26, 2026',
      dueDate: 'Nov 9, 2026',
      status: 'Paid',
      referenceNumber: 'REF-8849201940',
      timelineCreated: 'Oct 26, 2026',
      timelineSent: 'Oct 26, 2026',
      timelineStatus: 'Settled via PayPal (Webhook verified)',
      hostedInvoiceUrl: 'devflow.com/invoice/INV-2026-001',
      notes: 'API integration endpoints verified against AST requirement specifications.',
      paypalWebhookEventId: 'WH-EVT-772910-PAID',
    },
    {
      id: 'inv-2',
      invoiceNumber: 'INV-2026-002',
      project: 'Alpha Portal',
      client: 'Stellar Innovations',
      clientEmail: 'contacts@stellarinnov.com',
      clientAddress: '123 Stellar St, Future City',
      clientDescription: 'Connected Innovation.',
      relatedMilestone: 'Milestone 1: Design Sync',
      amount: 12000.0,
      issueDate: 'Nov 1, 2026',
      dueDate: 'Nov 15, 2026',
      status: 'Sent',
      referenceNumber: 'REF-1133557799',
      timelineCreated: 'Nov 1, 2026',
      timelineSent: 'Nov 1, 2026',
      timelineStatus: 'Awaiting Payment',
      hostedInvoiceUrl: 'devflow.com/invoice/INV-2026-002',
      notes: 'Design tokens and component architecture approved in Milestone 1.',
    },
    {
      id: 'inv-3',
      invoiceNumber: 'INV-2026-003',
      project: 'Gamma Analytics',
      client: 'Global Dynamics',
      clientEmail: 'accounts@globaldynamics.io',
      clientAddress: '450 Fifth Ave, New York, NY',
      clientDescription: 'Real-time telemetry and reporting backend.',
      relatedMilestone: 'Milestone 4: Security Audit',
      amount: 18500.0,
      issueDate: 'Nov 5, 2026',
      dueDate: 'Nov 19, 2026',
      status: 'Overdue',
      referenceNumber: 'REF-9920148102',
      timelineCreated: 'Nov 5, 2026',
      timelineSent: 'Nov 5, 2026',
      timelineStatus: 'Payment Overdue by 3 days',
      hostedInvoiceUrl: 'devflow.com/invoice/INV-2026-003',
      notes: 'Security audit report and automated penetration test suite delivered.',
    },
    {
      id: 'inv-4',
      invoiceNumber: 'INV-2026-004',
      project: 'Delta Platform',
      client: 'Future Tech',
      clientEmail: 'finance@futuretech.dev',
      clientAddress: '78 Silicon Alley, Austin, TX',
      clientDescription: 'High-scale event streaming platform.',
      relatedMilestone: 'Milestone 2: Feature Launch',
      amount: 9000.0,
      issueDate: 'Nov 7, 2026',
      dueDate: 'Nov 21, 2026',
      status: 'Pending',
      referenceNumber: 'REF-4491028374',
      timelineCreated: 'Nov 7, 2026',
      timelineSent: 'Nov 7, 2026',
      timelineStatus: 'Client Review in Progress',
      hostedInvoiceUrl: 'devflow.com/invoice/INV-2026-004',
      notes: 'Feature flag integration and distributed tracing telemetry delivered.',
    },
    {
      id: 'inv-5',
      invoiceNumber: 'INV-2026-005',
      project: 'Beta Engine',
      client: 'TechSolutions',
      clientEmail: 'invoicing@techsolutions.com',
      clientAddress: '900 Technology Blvd, Seattle, WA',
      clientDescription: 'Core computational pipeline and worker services.',
      relatedMilestone: 'Milestone 5: Cloud Deployment',
      amount: 15000.0,
      issueDate: 'Nov 8, 2026',
      dueDate: 'Nov 22, 2026',
      status: 'Draft',
      referenceNumber: 'REF-5520194820',
      timelineCreated: 'Nov 8, 2026',
      timelineSent: 'Pending Dispatch',
      timelineStatus: 'Drafted in PayPal Sandbox',
      hostedInvoiceUrl: 'devflow.com/invoice/INV-2026-005',
      notes: 'Automated CI/CD Terraform scripts and Kubernetes manifest verification.',
    },
  ], []);

  const [invoices, setInvoices] = useState<UnifiedInvoiceItem[]>(initialInvoiceList);

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.project.toLowerCase().includes(q) ||
          inv.client.toLowerCase().includes(q) ||
          inv.relatedMilestone.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Status Filter
      if (statusFilter !== 'All' && inv.status !== statusFilter) return false;

      // Project Filter
      if (projectFilter !== 'Select Project' && inv.project !== projectFilter) return false;

      // Client Filter
      if (clientFilter !== 'Select Client' && inv.client !== clientFilter) return false;

      return true;
    });
  }, [invoices, searchQuery, statusFilter, projectFilter, clientFilter]);

  // Selected Invoice object
  const selectedInvoice = useMemo(() => {
    return (
      invoices.find((inv) => inv.invoiceNumber === selectedInvoiceId) ||
      invoices[1] ||
      invoices[0]
    );
  }, [invoices, selectedInvoiceId]);

  // Financial Summary KPIs (Matching reference: $128,450.00, $89,120.00, $22,350.00, $16,980.00)
  const summaryMetrics = useMemo(() => {
    return {
      totalInvoiced: 128450.0,
      paidInvoices: 89120.0,
      pendingInvoices: 22350.0,
      overdueInvoices: 16980.0,
    };
  }, []);

  // Copy hosted link
  const handleCopyHostedLink = async () => {
    try {
      const link = `https://${selectedInvoice.hostedInvoiceUrl}`;
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(link);
      }
      setCopiedLink(true);
      showToast('Link Copied', `Hosted PayPal invoice URL copied to clipboard: ${link}`, 'info');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      showToast('Copy Failed', 'Could not access clipboard.', 'error');
    }
  };

  // Sandbox Checkout Execution
  const handleExecuteSandboxCheckout = async () => {
    setIsProcessingCheckout(true);
    setCheckoutStep('processing');
    try {
      await new Promise((res) => setTimeout(res, 1200));
      // Mark current invoice as Paid
      setInvoices((prev) =>
        prev.map((item) =>
          item.invoiceNumber === selectedInvoice.invoiceNumber
            ? {
                ...item,
                status: 'Paid',
                timelineStatus: 'Settled via PayPal (Webhook verified)',
                paypalWebhookEventId: `WH-SIM-${Date.now().toString().slice(-6)}`,
              }
            : item
        )
      );
      setCheckoutStep('success');
      showToast('Sandbox Settlement Complete', `Simulated payment recorded for ${selectedInvoice.invoiceNumber}.`, 'success');
    } catch {
      setCheckoutStep('error');
      showToast('Simulation Failed', 'Could not process sandbox settlement.', 'error');
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  // Handle Generate Invoice for Unbilled Milestone
  const handleGenerateInvoiceForUnbilled = () => {
    if (isGuest) {
      setGuardActionTitle('Generate PayPal Invoice');
      setIsGuestGuardOpen(true);
      return;
    }
    const newInv: UnifiedInvoiceItem = {
      id: `inv-${Date.now()}`,
      invoiceNumber: `INV-2026-00${invoices.length + 1}`,
      project: 'Apollo Mobile',
      client: 'Acme Corp',
      clientEmail: 'billing@acme-corp.com',
      clientAddress: '100 Market St, San Francisco, CA',
      clientDescription: 'Enterprise mobile platform for client logistics.',
      relatedMilestone: 'Milestone 4: QA Testing',
      amount: 8200.0,
      issueDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      dueDate: new Date(Date.now() + 14 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'Sent',
      referenceNumber: `REF-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      timelineCreated: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      timelineSent: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      timelineStatus: 'Awaiting Payment',
      hostedInvoiceUrl: `devflow.com/invoice/INV-2026-00${invoices.length + 1}`,
      notes: 'Generated from approved QA Testing milestone acceptance proofs.',
    };
    setInvoices([newInv, ...invoices]);
    setSelectedInvoiceId(newInv.invoiceNumber);
    showToast('Invoice Generated', `Created ${newInv.invoiceNumber} for $8,200.00 via PayPal Invoicing API.`, 'success');
  };

  // Handle Manual Invoice Creation
  const handleCreateNewInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.trim() || !newProject.trim()) return;

    const newInv: UnifiedInvoiceItem = {
      id: `inv-${Date.now()}`,
      invoiceNumber: `INV-2026-00${invoices.length + 1}`,
      project: newProject,
      client: newClient,
      clientEmail: `${newClient.toLowerCase().replace(/\s+/g, '')}@partner.io`,
      clientDescription: `Client milestone deliverable for ${newProject}.`,
      relatedMilestone: newMilestone || 'Milestone Deliverable',
      amount: parseFloat(newAmount) || 5000.0,
      issueDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      dueDate: new Date(newDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'Sent',
      referenceNumber: `REF-${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      timelineCreated: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      timelineSent: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      timelineStatus: 'Awaiting Payment',
      hostedInvoiceUrl: `devflow.com/invoice/INV-2026-00${invoices.length + 1}`,
      notes: 'Standard milestone payment request.',
    };

    setInvoices([newInv, ...invoices]);
    setSelectedInvoiceId(newInv.invoiceNumber);
    setIsCreateInvoiceModalOpen(false);
    setNewClient('');
    setNewProject('');
    setNewMilestone('');
    showToast('Invoice Issued', `Invoice ${newInv.invoiceNumber} dispatched to ${newInv.client}.`, 'success');
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#080D18] text-white">
        <div className="flex items-center gap-2.5 text-xs text-slate-400 font-mono">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] animate-ping" />
          <span>Synchronizing PayPal Invoicing Ledger...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* PHASE 3: PAGE HEADER */}
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
                {isClient ? 'Invoices' : 'Invoices & Earnings'}
              </h1>
              <p className="font-sans text-xs text-slate-400 mt-1 hidden sm:block">
                {isClient
                  ? 'Manage milestone-based invoices and release verified client payments via PayPal.'
                  : 'Track milestone-based invoices, payout disbursements and developer earnings.'}
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Settings Icon */}
            <button
              onClick={() => navigate('/settings')}
              className="p-2 text-slate-300 hover:text-white hover:bg-[#152238] rounded-xl transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

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
                  <div className="flex items-center justify-between border-b border-[#26344B] pb-2 font-bold text-white">
                    <span>Invoicing Notifications</span>
                    <button
                      onClick={() => setNotificationsOpen(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#152238] text-xs text-slate-300">
                    <span className="font-semibold text-emerald-400">INV-2026-001</span> settled via PayPal Webhook ($7,500.00).
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#152238] text-xs text-slate-300">
                    <span className="font-semibold text-amber-400">INV-2026-004</span> client review completed.
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Avatar */}
            <div
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 cursor-pointer p-1 rounded-xl hover:bg-[#152238] transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#2563EB] to-[#60A5FA] text-white flex items-center justify-center font-bold text-xs ring-2 ring-blue-500/40">
                {clientInitials}
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>

            {/* Action Button: Role Specific */}
            {isClient ? (
              <button
                onClick={() => {
                  if (isGuest) {
                    setGuardActionTitle('Create Invoice');
                    setIsGuestGuardOpen(true);
                    return;
                  }
                  setIsCreateInvoiceModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/30 flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>Create Invoice</span>
              </button>
            ) : (
              <button
                onClick={() => setIsPrintModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/30 flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>Export Statement</span>
              </button>
            )}
          </div>
        </header>

        {/* Scrollable Dashboard Workspace */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-7 py-5 space-y-6 max-w-[1600px] w-full mx-auto">
          {/* PHASE 4: SEARCH & FILTER TOOLBAR */}
          <div className="rounded-2xl bg-[#111C30] border border-[#26344B] p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-3.5">
              {/* Search input */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search invoices, clients, or projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0C1524] text-xs sm:text-sm text-white placeholder-slate-400 pl-10 pr-4 py-2.5 rounded-xl border border-[#26344B] focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Status Dropdown */}
              <div className="relative min-w-[140px]">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full bg-[#0C1524] text-xs sm:text-sm text-slate-200 px-3.5 py-2.5 rounded-xl border border-[#26344B] focus:border-blue-500 focus:outline-hidden appearance-none pr-8 cursor-pointer"
                >
                  <option value="All">Status: All</option>
                  <option value="Paid">Paid</option>
                  <option value="Sent">Sent</option>
                  <option value="Pending">Pending</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Draft">Draft</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Project Dropdown */}
              <div className="relative min-w-[170px]">
                <select
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  className="w-full bg-[#0C1524] text-xs sm:text-sm text-slate-200 px-3.5 py-2.5 rounded-xl border border-[#26344B] focus:border-blue-500 focus:outline-hidden appearance-none pr-8 cursor-pointer"
                >
                  <option value="Select Project">Project: Select Project</option>
                  <option value="Apollo Mobile">Apollo Mobile</option>
                  <option value="Alpha Portal">Alpha Portal</option>
                  <option value="Gamma Analytics">Gamma Analytics</option>
                  <option value="Delta Platform">Delta Platform</option>
                  <option value="Beta Engine">Beta Engine</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Client Dropdown */}
              <div className="relative min-w-[160px]">
                <select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className="w-full bg-[#0C1524] text-xs sm:text-sm text-slate-200 px-3.5 py-2.5 rounded-xl border border-[#26344B] focus:border-blue-500 focus:outline-hidden appearance-none pr-8 cursor-pointer"
                >
                  <option value="Select Client">Client: Select Client</option>
                  <option value="Acme Corp">Acme Corp</option>
                  <option value="Stellar Innovations">Stellar Innovations</option>
                  <option value="Global Dynamics">Global Dynamics</option>
                  <option value="Future Tech">Future Tech</option>
                  <option value="TechSolutions">TechSolutions</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Date Range Dropdown */}
              <div className="relative min-w-[150px]">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full bg-[#0C1524] text-xs sm:text-sm text-slate-200 px-3.5 py-2.5 rounded-xl border border-[#26344B] focus:border-blue-500 focus:outline-hidden appearance-none pr-8 cursor-pointer"
                >
                  <option value="Select Range">Date: Select Range</option>
                  <option value="This Month">This Month</option>
                  <option value="Last 30 Days">Last 30 Days</option>
                  <option value="Q4 2026">Q4 2026</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Clear Filters Button if filtered */}
              {(searchQuery || statusFilter !== 'All' || projectFilter !== 'Select Project' || clientFilter !== 'Select Client') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('All');
                    setProjectFilter('Select Project');
                    setClientFilter('Select Client');
                    setDateFilter('Select Range');
                  }}
                  className="text-xs sm:text-sm text-blue-400 hover:text-white flex items-center gap-1.5 font-semibold transition-colors px-2 py-1"
                >
                  <X className="w-4 h-4" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* PHASE 5: FINANCIAL SUMMARY (4 KPI CARDS) */}
          <div className="space-y-2">
            <span className="font-heading text-xs font-bold text-slate-400 uppercase tracking-wider block">
              3. FINANCIAL SUMMARY
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Invoiced */}
              <div className="rounded-xl bg-[#111C30] border border-[#26344B] p-4 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="font-sans text-xs text-slate-400 block font-medium">Total Invoiced</span>
                  <div className="text-xl sm:text-2xl font-extrabold text-white font-sans tabular-nums tracking-tight truncate">
                    ${summaryMetrics.totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Card 2: Paid Invoices */}
              <div className="rounded-xl bg-[#111C30] border border-[#26344B] p-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-sans text-xs text-slate-400 block font-medium">Paid Invoices</span>
                    <div className="text-xl sm:text-2xl font-extrabold text-white font-sans tabular-nums tracking-tight truncate">
                      ${summaryMetrics.paidInvoices.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold font-sans bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-500/30 shrink-0">
                  <TrendingUp className="w-3 h-3" />
                  <span>Trend</span>
                </div>
              </div>

              {/* Card 3: Pending Invoices */}
              <div className="rounded-xl bg-[#111C30] border border-[#26344B] p-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-sans text-xs text-slate-400 block font-medium">Pending Invoices</span>
                    <div className="text-xl sm:text-2xl font-extrabold text-white font-sans tabular-nums tracking-tight truncate">
                      ${summaryMetrics.pendingInvoices.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-blue-400 font-semibold font-sans bg-blue-950/40 px-2 py-0.5 rounded-lg border border-blue-500/30 shrink-0">
                  <TrendingUp className="w-3 h-3" />
                  <span>Trend</span>
                </div>
              </div>

              {/* Card 4: Overdue Invoices */}
              <div className="rounded-xl bg-[#111C30] border border-[#26344B] p-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-sans text-xs text-slate-400 block font-medium">Overdue Invoices</span>
                    <div className="text-xl sm:text-2xl font-extrabold text-white font-sans tabular-nums tracking-tight truncate">
                      ${summaryMetrics.overdueInvoices.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-rose-400 font-semibold bg-rose-950/40 px-2 py-0.5 rounded-lg border border-rose-500/30 shrink-0">
                  <TrendingDown className="w-3 h-3" />
                  <span>Trend</span>
                </div>
              </div>
            </div>
          </div>

          {/* MAIN GRID: INVOICE TABLE (LEFT 8 COLS) + INVOICE DETAILS PANEL (RIGHT 4 COLS) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* PHASE 6: INVOICE TABLE (8 COLS) */}
            <div className="lg:col-span-8 rounded-2xl bg-[#111C30] border border-[#26344B] overflow-hidden flex flex-col justify-between">
              <div>
                <div className="px-5 py-4 border-b border-[#26344B] bg-[#0C1524] flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    4. INVOICE TABLE
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {filteredInvoices.length} invoices
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-[#26344B] text-xs text-slate-400 uppercase tracking-wider bg-[#0C1524]/60">
                        <th className="py-3 px-4 font-semibold">Invoice #</th>
                        <th className="py-3 px-4 font-semibold">Project</th>
                        <th className="py-3 px-4 font-semibold">Client</th>
                        <th className="py-3 px-4 font-semibold">Related Milestone</th>
                        <th className="py-3 px-4 font-semibold">Amount</th>
                        <th className="py-3 px-4 font-semibold">Issue Date</th>
                        <th className="py-3 px-4 font-semibold">Due Date</th>
                        <th className="py-3 px-4 font-semibold">Payment Status</th>
                        <th className="py-3 px-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#26344B]/40">
                      {filteredInvoices.map((row) => {
                        const isSelected = row.invoiceNumber === selectedInvoiceId;
                        return (
                          <tr
                            key={row.id}
                            onClick={() => setSelectedInvoiceId(row.invoiceNumber)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-[#182C4E] border-l-4 border-l-[#2563EB] text-white'
                                : 'hover:bg-[#152238]/60 text-slate-300'
                            }`}
                          >
                            {/* Invoice # */}
                            <td className="py-4 px-4 font-mono font-bold text-xs sm:text-sm whitespace-nowrap">
                              <span className={isSelected ? 'text-white' : 'text-blue-400'}>
                                {row.invoiceNumber}
                              </span>
                            </td>

                            {/* Project */}
                            <td className="py-4 px-4 font-semibold text-slate-200 whitespace-nowrap">
                              {row.project}
                            </td>

                            {/* Client */}
                            <td className="py-4 px-4 text-slate-300 whitespace-nowrap">
                              {row.client}
                            </td>

                            {/* Related Milestone */}
                            <td className="py-4 px-4 text-slate-400 text-xs sm:text-sm max-w-[180px] truncate">
                              {row.relatedMilestone}
                            </td>

                            {/* Amount */}
                            <td className="py-4 px-4 font-mono font-bold text-white whitespace-nowrap">
                              ${row.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>

                            {/* Issue Date */}
                            <td className="py-4 px-4 font-mono text-xs text-slate-400 whitespace-nowrap">
                              {row.issueDate}
                            </td>

                            {/* Due Date */}
                            <td className="py-4 px-4 font-mono text-xs text-slate-400 whitespace-nowrap">
                              {row.dueDate}
                            </td>

                            {/* Payment Status Pill */}
                            <td className="py-4 px-4 whitespace-nowrap">
                              <span
                                className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                                  row.status === 'Paid'
                                    ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-500/30'
                                    : row.status === 'Sent'
                                    ? 'bg-blue-950/70 text-blue-400 border border-blue-500/30'
                                    : row.status === 'Overdue'
                                    ? 'bg-rose-950/70 text-rose-400 border border-rose-500/30'
                                    : row.status === 'Pending'
                                    ? 'bg-amber-950/70 text-amber-400 border border-amber-500/30'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}
                              >
                                {row.status}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-4 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => setIsPrintModalOpen(true)}
                                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#152238] transition-colors"
                                  title="Printable Invoice View"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                                {row.status !== 'Paid' && (
                                  <button
                                    onClick={() => {
                                      if (isGuest) {
                                        setGuardActionTitle('Release Payment');
                                        setIsGuestGuardOpen(true);
                                        return;
                                      }
                                      setSelectedInvoiceId(row.invoiceNumber);
                                      setCheckoutStep('review');
                                      setIsCheckoutModalOpen(true);
                                    }}
                                    className="p-1.5 text-blue-400 hover:text-blue-300 rounded-lg hover:bg-[#152238] transition-colors"
                                    title="Pay via Sandbox"
                                  >
                                    <CreditCard className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Table Footer with Rows per page and Pagination */}
              <div className="p-4 bg-[#0C1524] border-t border-[#26344B] flex flex-wrap items-center justify-between text-xs sm:text-sm text-slate-400 gap-3">
                <div className="flex items-center gap-2.5">
                  <span>Rows-per-page:</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => setRowsPerPage(Number(e.target.value))}
                    className="bg-[#111C30] border border-[#26344B] text-slate-300 rounded-lg px-2.5 py-1 focus:outline-hidden"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono">Page {currentPage} of 1</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30"
                    >
                      |&lt;
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30"
                    >
                      &lt;
                    </button>
                    <button
                      onClick={() => setCurrentPage(1)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30"
                    >
                      &gt;
                    </button>
                    <button
                      onClick={() => setCurrentPage(1)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30"
                    >
                      &gt;|
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* PHASE 7: INVOICE DETAILS SIDE PANEL (4 COLS) */}
            <div className="lg:col-span-4 rounded-2xl bg-[#111C30] border border-[#26344B] p-5 sm:p-6 space-y-5 relative overflow-hidden">
              {/* Header: Title & Reference */}
              <div className="pb-3.5 border-b border-[#26344B]/60 space-y-1.5">
                <h3 className="text-base font-bold text-white tracking-wide">
                  {selectedInvoice.invoiceNumber}: {selectedInvoice.project}
                </h3>
                <div className="flex items-center gap-1.5 font-mono text-xs sm:text-sm text-blue-400">
                  <span>{selectedInvoice.referenceNumber}</span>
                  <PayPalIcon className="w-3.5 h-3.5 text-[#0079C1]" />
                </div>
              </div>

              {/* Client Info */}
              <div className="space-y-1.5 text-xs sm:text-sm">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Client Info
                </span>
                <div className="text-slate-200 font-semibold">{selectedInvoice.client}</div>
                <div className="text-xs text-slate-400 font-mono">{selectedInvoice.clientEmail}</div>
                <div className="text-xs text-slate-400">{selectedInvoice.clientAddress || '123 Stellar St, Future City'}</div>
              </div>

              {/* Client Project */}
              <div className="space-y-1.5 text-xs sm:text-sm pt-3 border-t border-[#26344B]/40">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Client
                </span>
                <div className="text-slate-200 font-semibold">{selectedInvoice.project}</div>
                <div className="text-xs text-slate-400">{selectedInvoice.clientDescription || 'Connected Innovation.'}</div>
              </div>

              {/* Amount */}
              <div className="space-y-1.5 pt-3 border-t border-[#26344B]/40">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Amount
                </span>
                <div className="text-3xl font-extrabold text-white font-mono tracking-tight">
                  ${selectedInvoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <span className="text-xs text-slate-400 block">Approved milestone amount</span>
              </div>

              {/* Timeline */}
              <div className="space-y-2.5 pt-3 border-t border-[#26344B]/40">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Timeline
                </span>
                <div className="space-y-2 text-xs sm:text-sm text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                    <span>Created: {selectedInvoice.timelineCreated}</span>
                  </div>
                  <div className="pl-1 text-slate-500 font-mono text-xs leading-none">|</div>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                    <span>Sent to Client: {selectedInvoice.timelineSent}</span>
                  </div>
                  <div className="pl-1 text-slate-500 font-mono text-xs leading-none">|</div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full border ${
                        selectedInvoice.status === 'Paid'
                          ? 'bg-emerald-400 border-emerald-400'
                          : 'border-slate-400'
                      }`}
                    />
                    <span className={selectedInvoice.status === 'Paid' ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                      {selectedInvoice.timelineStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              <div className="space-y-1.5 pt-3 border-t border-[#26344B]/40">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Payment History
                </span>
                {selectedInvoice.status === 'Paid' ? (
                  <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 font-mono">
                    Paid via PayPal Webhook: {selectedInvoice.paypalWebhookEventId || 'WH-EVT-772910-PAID'}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic">No payments yet</div>
                )}
              </div>

              {/* Hosted Invoice Link with Copy */}
              <div className="space-y-1.5 pt-3 border-t border-[#26344B]/40">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Hosted Invoice:
                </span>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0C1524] border border-[#26344B] text-xs sm:text-sm">
                  <span className="font-mono text-blue-400 text-xs truncate">
                    {selectedInvoice.hostedInvoiceUrl}
                  </span>
                  <button
                    onClick={handleCopyHostedLink}
                    className="p-1.5 text-slate-400 hover:text-white transition-colors"
                    title="Copy Hosted Invoice URL"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Quick Action Buttons for Selected Invoice */}
              <div className="pt-3 flex items-center gap-2.5 border-t border-[#26344B]/40">
                <button
                  onClick={() => setIsPrintModalOpen(true)}
                  className="flex-1 py-2.5 rounded-xl bg-[#152238] hover:bg-[#1E2E4E] border border-[#26344B] text-xs sm:text-sm font-semibold text-slate-200 transition-colors flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4 text-slate-300" />
                  <span>Print View</span>
                </button>
                {selectedInvoice.status !== 'Paid' ? (
                  isClient ? (
                    <button
                      onClick={() => {
                        if (isGuest) {
                          setGuardActionTitle('Release Payment');
                          setIsGuestGuardOpen(true);
                          return;
                        }
                        setCheckoutStep('review');
                        setIsCheckoutModalOpen(true);
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-600/30 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <PayPalIcon className="w-4 h-4" />
                      <span>Pay Sandbox</span>
                    </button>
                  ) : (
                    <div className="flex-1 py-2.5 px-3 rounded-xl bg-amber-950/60 border border-amber-500/30 text-amber-400 text-xs font-semibold flex items-center justify-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Awaiting Client Release</span>
                    </div>
                  )
                ) : (
                  <div className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isClient ? 'Payment Settled' : 'Payout Received'}</span>
                  </div>
                )}
              </div>

              {/* Decorative Sparkle Graphic from visual reference */}
              <div className="absolute bottom-16 right-2 opacity-25 pointer-events-none">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor" className="text-blue-300">
                  <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                </svg>
              </div>
            </div>
          </div>

          {/* PHASE 8: UNBILLED APPROVED MILESTONES & PENDING MILESTONE APPROVALS */}
          <div className="rounded-2xl bg-[#111C30] border border-[#26344B] p-5 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Left Column: Unbilled Approved Milestones / Claimable Earnings */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  {isClient ? 'Unbilled Approved Milestones' : 'Claimable Milestone Earnings'}
                </span>
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#0C1524] border border-[#26344B]">
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <span className="font-semibold text-white">Acme Corp</span>
                    <span className="text-slate-500">→</span>
                    <span className="text-slate-300">Apollo Mobile</span>
                    <span className="text-slate-500">→</span>
                    <span className="text-blue-400 font-medium">Milestone 4: QA Testing</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-white text-xs sm:text-sm">$8,200.00</span>
                    <button
                      onClick={handleGenerateInvoiceForUnbilled}
                      className="text-xs sm:text-sm text-blue-400 hover:text-white font-semibold transition-colors cursor-pointer"
                    >
                      {isClient ? 'Generate Invoice' : 'Submit for Invoicing'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Pending Milestone Approvals */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Pending Milestone Approvals
                </span>
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0C1524] border border-[#26344B]">
                  <div className="text-xs sm:text-sm text-slate-300">
                    <span className="font-semibold text-white">Stellar Innovations</span> &bull; Alpha Portal (Milestone 2)
                  </div>
                  <button
                    onClick={() => {
                      if (isGuest) {
                        setGuardActionTitle('Create Invoice');
                        setIsGuestGuardOpen(true);
                        return;
                      }
                      setIsCreateInvoiceModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/30 transition-colors"
                  >
                    Create Invoice
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>

      {/* MODAL 1: PRINTABLE INVOICE DOCUMENT (Preserves #printable-invoice-container for selective printing!) */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs no-print-backdrop">
          <div className="w-full max-w-2xl rounded-2xl bg-[#111C30] border border-[#26344B] shadow-2xl p-6 space-y-4 animate-in fade-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#26344B] pb-3 no-print">
              <div>
                <h3 className="text-sm font-bold text-white">Printable Invoice Document</h3>
                <span className="text-[11px] text-slate-400">
                  Formatted for client export and standard printing
                </span>
              </div>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1E2E4E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Print Container with ID for CSS Print Rules */}
            <div
              id="printable-invoice-container"
              className="p-6 bg-white text-[#111827] rounded-xl space-y-6 shadow-xs border border-slate-200"
            >
              {/* Header / Brand */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-4 print-avoid-break">
                <div>
                  <div className="flex items-center gap-2">
                    <DevFlowLogo variant="icon" size="sm" />
                     <h2 className="text-xl font-bold tracking-tight text-[#111827]">DevFlow</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Autonomous Milestone Invoicing Platform</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold font-mono text-[#0070BA]">
                    {selectedInvoice.invoiceNumber}
                  </span>
                  <p className="text-xs text-slate-500">Issue Date: {selectedInvoice.issueDate}</p>
                  <p className="text-xs text-slate-500">Due Date: {selectedInvoice.dueDate}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                    STATUS: {selectedInvoice.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Billed To / From */}
              <div className="grid grid-cols-2 gap-6 text-xs print-avoid-break">
                <div>
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    Billed To:
                  </span>
                  <p className="font-semibold text-sm text-[#111827] mt-1">{selectedInvoice.client}</p>
                  <p className="text-slate-600">{selectedInvoice.clientEmail}</p>
                  <p className="text-slate-600">{selectedInvoice.clientAddress || '123 Stellar St, Future City'}</p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    Remittance Routing:
                  </span>
                  <p className="font-semibold text-sm text-[#111827] mt-1">DevFlow PayPal Gateway</p>
                  <p className="text-slate-600">Reference: {selectedInvoice.referenceNumber}</p>
                  <p className="text-slate-600">Settlement Currency: USD</p>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden print-avoid-break">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="p-3 text-left">Service Description</th>
                      <th className="p-3 text-center">Project</th>
                      <th className="p-3 text-right">Amount (USD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-3 font-medium text-slate-800">
                        {selectedInvoice.relatedMilestone} &bull; Verified Deliverable Execution
                      </td>
                      <td className="p-3 text-center text-slate-600">{selectedInvoice.project}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        ${selectedInvoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end pt-2 print-avoid-break">
                <div className="w-56 space-y-1.5 text-xs text-right">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono">${selectedInvoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tax (0%):</span>
                    <span className="font-mono">$0.00</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 pt-1.5 border-t border-slate-200">
                    <span>Total Due:</span>
                    <span className="font-mono text-[#0070BA]">
                      ${selectedInvoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                    </span>
                  </div>
                </div>
              </div>

              {selectedInvoice.notes && (
                <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-500 print-avoid-break">
                  <span className="font-semibold text-slate-700">Invoice Notes: </span>
                  {selectedInvoice.notes}
                </div>
              )}
            </div>

            {/* Modal Footer Controls (Hidden during print) */}
            <div className="flex items-center justify-between pt-3 border-t border-[#26344B] no-print">
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#152238] hover:bg-[#1E2E4E] text-slate-300 text-xs font-semibold"
              >
                Close Preview
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: PAYPAL SANDBOX CHECKOUT SIMULATION */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-[#111C30] border border-[#26344B] shadow-2xl p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-[#26344B] pb-3">
              <div className="flex items-center gap-2">
                <PayPalIcon className="w-5 h-5 text-[#0079C1]" />
                <h3 className="text-sm font-bold text-white">PayPal Sandbox Checkout Simulation</h3>
              </div>
              <button
                onClick={() => setIsCheckoutModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1E2E4E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {checkoutStep === 'review' && (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-xl bg-[#0C1524] border border-[#26344B] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-blue-400">Payer Sandbox Account</span>
                    <span className="text-[10px] bg-blue-950/60 text-blue-300 border border-blue-500/30 px-1.5 py-0.2 rounded">
                      SANDBOX MODE
                    </span>
                  </div>
                  <div className="text-xl font-bold text-white font-mono">
                    ${selectedInvoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Client Payer: {selectedInvoice.client} ({selectedInvoice.clientEmail})
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#152238] border border-[#26344B] text-[11px] text-slate-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <Lock className="w-3.5 h-3.5 text-blue-400" />
                    <span>Cryptographic Verification Gate</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Executing this payment will fire a simulated PayPal webhook listener event and mark invoice {selectedInvoice.invoiceNumber} as PAID.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#26344B]">
                  <button
                    onClick={() => setIsCheckoutModalOpen(false)}
                    className="px-3.5 py-2 rounded-lg bg-[#152238] hover:bg-[#1E2E4E] text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExecuteSandboxCheckout}
                    disabled={isProcessingCheckout}
                    className="px-4 py-2 rounded-lg bg-[#0079C1] hover:bg-[#005ea6] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-900/30"
                  >
                    <PayPalIcon className="w-3.5 h-3.5" />
                    <span>Confirm Sandbox Payment</span>
                  </button>
                </div>
              </div>
            )}

            {checkoutStep === 'processing' && (
              <div className="py-8 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
                <p className="text-sm font-bold text-white">Processing Sandbox Settlement...</p>
                <p className="text-xs text-slate-400">Validating HMAC webhook signature & settlement ledger</p>
              </div>
            )}

            {checkoutStep === 'success' && (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Payment Successfully Settled</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  PayPal Webhook event <strong className="text-white font-mono">PAYMENT.INVOICING.INVOICE.PAID</strong> captured and cryptographically recorded.
                </p>
                <button
                  onClick={() => setIsCheckoutModalOpen(false)}
                  className="mt-2 px-5 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold"
                >
                  Close Receipt
                </button>
              </div>
            )}

            {checkoutStep === 'error' && (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-400 mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Simulation Failed</h3>
                <p className="text-xs text-slate-400">Could not record simulated webhook event.</p>
                <button
                  onClick={() => setIsCheckoutModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#152238] text-white text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: CREATE INVOICE FORM */}
      {isCreateInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-[#111C30] border border-[#26344B] shadow-2xl p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-[#26344B] pb-3">
              <h3 className="text-sm font-bold text-white">Create New Milestone Invoice</h3>
              <button
                onClick={() => setIsCreateInvoiceModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1E2E4E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewInvoice} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Client / Company Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corp"
                  value={newClient}
                  onChange={(e) => setNewClient(e.target.value)}
                  className="w-full bg-[#0C1524] text-xs text-white px-3 py-2 rounded-lg border border-[#26344B] focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Project Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apollo Mobile"
                  value={newProject}
                  onChange={(e) => setNewProject(e.target.value)}
                  className="w-full bg-[#0C1524] text-xs text-white px-3 py-2 rounded-lg border border-[#26344B] focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Milestone Scope
                </label>
                <input
                  type="text"
                  placeholder="e.g. Milestone 4: QA Testing"
                  value={newMilestone}
                  onChange={(e) => setNewMilestone(e.target.value)}
                  className="w-full bg-[#0C1524] text-xs text-white px-3 py-2 rounded-lg border border-[#26344B] focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Amount (USD)
                  </label>
                  <input
                    type="number"
                    required
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full bg-[#0C1524] text-xs text-white px-3 py-2 rounded-lg border border-[#26344B] focus:border-blue-500 focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full bg-[#0C1524] text-xs text-white px-3 py-2 rounded-lg border border-[#26344B] focus:border-blue-500 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#26344B]">
                <button
                  type="button"
                  onClick={() => setIsCreateInvoiceModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg bg-[#152238] hover:bg-[#1E2E4E] text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-600/30"
                >
                  Issue Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: HELP CENTER */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-[#111C30] border border-[#26344B] shadow-2xl p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-[#26344B] pb-3">
              <h3 className="text-sm font-bold text-white">DevFlow Invoicing Guide</h3>
              <button
                onClick={() => setIsHelpModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1E2E4E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                Invoices on DevFlow are tied strictly to verified milestone acceptance criteria and client sign-offs.
              </p>
              <div className="p-3 rounded-xl bg-[#0C1524] border border-[#26344B] space-y-1">
                <span className="font-bold text-white block">Key Rules:</span>
                <ul className="space-y-1 text-slate-400 text-[11px]">
                  <li>• Unbilled milestones cannot be invoiced without prior deliverable approval.</li>
                  <li>• PayPal Sandbox settlements simulate payment receipts and webhook triggers.</li>
                  <li>• Use the Print View button to generate client-ready PDF exports.</li>
                </ul>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsHelpModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-semibold"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* USER PROFILE MODAL */}
      {userMenuOpen && (
        <div className="fixed bottom-16 left-4 z-50 w-56 rounded-xl bg-[#111C30] border border-[#26344B] shadow-2xl p-3 text-xs space-y-2 animate-in fade-in duration-150">
          <div className="font-bold text-white border-b border-[#26344B] pb-2">
            {clientDisplayName}
            <div className="text-[10px] text-slate-400 font-normal">
              {isGuest ? 'DEMO MODE \u2022 Client Invoices Preview' : user?.organization || 'Client Workspace'}
            </div>
          </div>
          {!isGuest && (
            <button
              onClick={() => {
                setUserMenuOpen(false);
                navigate('/settings');
              }}
              className="w-full text-left py-1 text-slate-300 hover:text-white"
            >
              Billing Preferences
            </button>
          )}
          <button
            onClick={async () => {
              setUserMenuOpen(false);
              await logout();
              navigate(isClient ? '/login/client' : '/login', { replace: true });
            }}
            className="w-full text-left py-1 text-rose-400 hover:text-rose-300"
          >
            {isGuest ? 'Exit Demo Mode' : 'Sign Out'}
          </button>
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
