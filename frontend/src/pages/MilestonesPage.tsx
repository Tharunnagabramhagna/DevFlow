import React, { useEffect, useState } from 'react';
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
  Input,
  Modal,
  Skeleton,
  useToast,
} from '@/components/common';
import { devFlowApi } from '@/services/api';
import { Milestone, Requirement, Project } from '@/types';
import {
  Sparkles,
  Plus,
  GitCommit,
  Clock,
  DollarSign,
  FileCheck,
  ChevronRight,
  Filter,
  Search,
  ShieldCheck,
  Check,
  Info,
} from 'lucide-react';

export const MilestonesPage: React.FC = () => {
  const { toast } = useToast();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMockData, setIsMockData] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state for new milestone
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('2500.00');
  const [newDueDate, setNewDueDate] = useState('2026-11-20');
  const [newDesc, setNewDesc] = useState('');
  const [newCriteria, setNewCriteria] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('proj_devflow_01');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [milestonesRes, projectsRes] = await Promise.all([
        devFlowApi.getMilestones(),
        devFlowApi.getProjects(),
      ]);
      setMilestones(milestonesRes.data);
      setProjects(projectsRes.data);
      setIsMockData(milestonesRes.isMock);
    } catch (err) {
      console.error('Failed to load milestones:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = (ms: Milestone) => {
    setSelectedMilestone(ms);
    setIsDetailModalOpen(true);
  };

  const handleRunAIAnalysis = async (milestoneId: string) => {
    setIsAnalyzing(true);
    toast.info('AI Service Triggered', 'AST parser evaluating code diffs against acceptance criteria...');
    try {
      const res = await devFlowApi.runAIVerification(milestoneId);
      toast.success(
        'AI Verification Complete',
        `Milestone validated with ${res.data.overallScore}% confidence score.`
      );
      await loadData();
      if (selectedMilestone && selectedMilestone.id === milestoneId) {
        const updated = await devFlowApi.getMilestoneById(milestoneId);
        if (updated.data) setSelectedMilestone(updated.data);
      }
    } catch {
      toast.error('Analysis Failed', 'Could not complete AI verification.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClientApprove = async (milestoneId: string) => {
    try {
      await devFlowApi.submitClientApproval(
        milestoneId,
        'approved',
        'Client reviewed code evidence and confirmed acceptance criteria met.'
      );
      toast.success(
        'Client Sign-Off Confirmed',
        'Human-in-the-loop review completed. Milestone is now eligible for PayPal invoicing.'
      );
      await loadData();
      if (selectedMilestone?.id === milestoneId) {
        const updated = await devFlowApi.getMilestoneById(milestoneId);
        if (updated.data) setSelectedMilestone(updated.data);
      }
    } catch {
      toast.error('Error', 'Failed to record approval.');
    }
  };

  const handleGenerateInvoice = async (milestoneId: string) => {
    try {
      const res = await devFlowApi.generatePayPalInvoice(milestoneId);
      toast.success(
        'PayPal Invoice Dispatched',
        `Created ${res.data.invoiceNumber} ($${res.data.amount.toFixed(2)} USD) via PayPal Invoicing API.`
      );
      await loadData();
      if (selectedMilestone?.id === milestoneId) {
        const updated = await devFlowApi.getMilestoneById(milestoneId);
        if (updated.data) setSelectedMilestone(updated.data);
      }
    } catch {
      toast.error('Invoicing Failed', 'Could not generate invoice.');
    }
  };

  const handleSimulateWebhookPaid = async (invoiceId: string) => {
    setIsSimulatingPayment(true);
    try {
      await devFlowApi.recordPayPalPaymentEvent(invoiceId);
      toast.success(
        'Verified Webhook Received',
        'Cryptographic check passed for PAYMENT.INVOICING.INVOICE.PAID. Settlement complete!'
      );
      await loadData();
      if (selectedMilestone) {
        const updated = await devFlowApi.getMilestoneById(selectedMilestone.id);
        if (updated.data) setSelectedMilestone(updated.data);
      }
    } catch {
      toast.error('Simulation Failed', 'Could not process webhook.');
    } finally {
      setIsSimulatingPayment(false);
    }
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAmount) {
      toast.error('Validation Error', 'Title and amount are required.');
      return;
    }

    try {
      const criteriaList = newCriteria
        .split('\n')
        .filter((c) => c.trim().length > 0)
        .map((crit, idx) => ({
          id: `req_${Date.now()}_${idx}`,
          milestoneId: '',
          title: crit.trim(),
          description: 'Automated acceptance verification requirement.',
          satisfied: false,
        }));

      await devFlowApi.createMilestone({
        projectId: selectedProjectId,
        title: newTitle.trim(),
        description: newDesc || 'Milestone deliverable managed with DevFlow AI.',
        order: milestones.length + 1,
        amount: parseFloat(newAmount) || 2000,
        currency: 'USD',
        dueDate: newDueDate,
        status: 'in_progress',
        requirements: criteriaList.length > 0 ? criteriaList : [
          {
            id: `req_${Date.now()}_default`,
            milestoneId: '',
            title: 'Verify implementation matches technical requirements',
            description: 'Analyzed via commit diff and test passes.',
            satisfied: false,
          },
        ],
      });

      toast.success('Milestone Initialized', `Added ${newTitle} to project.`);
      setIsNewModalOpen(false);
      setNewTitle('');
      setNewDesc('');
      setNewCriteria('');
      await loadData();
    } catch {
      toast.error('Creation Error', 'Could not create milestone.');
    }
  };

  // Search & Filter
  const filteredMilestones = milestones.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterStatus === 'all') return true;
    if (filterStatus === 'paid') return m.status === 'paid';
    if (filterStatus === 'ai_verified') return m.status === 'ai_verified';
    if (filterStatus === 'client_approved') return m.status === 'client_approved';
    if (filterStatus === 'in_progress') return m.status === 'in_progress';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Simulation / Data Transparency Notice */}
      {isMockData && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-sky-50/80 border border-sky-200/90 text-xs text-sky-950">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#0070BA] shrink-0" />
            <span className="leading-snug">
              <strong>Backend Coordination:</strong> Live backend milestones and AI evaluation modules
              are synchronizing. Interactive simulation active.
            </span>
          </div>
          <Badge variant="paypal" size="sm" className="self-start sm:self-auto shrink-0">
            Sandbox Ready
          </Badge>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Milestone Management</h2>
          <p className="text-xs text-slate-500">
            Define deliverables, track GitHub evidence, review AI validation scores, and trigger client approval
          </p>
        </div>
        <Button
          variant="paypal"
          size="sm"
          onClick={() => setIsNewModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Create Milestone
        </Button>
      </div>

      {/* Search and Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        {/* Search */}
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search milestone by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            className="text-xs py-1.5"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto self-start sm:self-auto">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              filterStatus === 'all'
                ? 'bg-slate-900 text-white font-semibold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All ({milestones.length})
          </button>
          <button
            onClick={() => setFilterStatus('in_progress')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              filterStatus === 'in_progress'
                ? 'bg-slate-200 text-slate-900 font-semibold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => setFilterStatus('ai_verified')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              filterStatus === 'ai_verified'
                ? 'bg-violet-600 text-white font-semibold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            AI Verified
          </button>
          <button
            onClick={() => setFilterStatus('client_approved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              filterStatus === 'client_approved'
                ? 'bg-amber-600 text-white font-semibold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Client Approved
          </button>
          <button
            onClick={() => setFilterStatus('paid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              filterStatus === 'paid'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Paid via PayPal
          </button>
        </div>
      </div>

      {/* Skeletons */}
      {loading && (
        <Card className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </Card>
      )}

      {/* Milestones Data Table */}
      {!loading && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Milestone Deliverables & Financial Lifecycle</CardTitle>
                <CardDescription>
                  Milestone stages: Scope &rarr; GitHub Evidence &rarr; AI Verification &rarr; Client Review &rarr; PayPal Invoiced &rarr; Paid
                </CardDescription>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                <Filter className="w-3.5 h-3.5" />
                <span>{filteredMilestones.length} deliverables matching</span>
              </div>
            </div>
          </CardHeader>
          <CardContent><div className="overflow-x-auto"><Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deliverable Title</TableHead>
                  <TableHead>Target Due</TableHead>
                  <TableHead>Amount (USD)</TableHead>
                  <TableHead>Evidence</TableHead>
                  <TableHead>AI Confidence</TableHead>
                  <TableHead>Client Review</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMilestones.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-500 text-xs">
                      No milestones matching the active filter.
                    </td>
                  </tr>
                ) : (
                  filteredMilestones.map((ms) => (
                    <TableRow
                      key={ms.id}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => handleOpenDetail(ms)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-slate-400">
                            #{ms.order}
                          </span>
                          <div>
                            <div className="font-semibold text-slate-900 text-xs sm:text-sm">
                              {ms.title}
                            </div>
                            <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                              {ms.description}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-600 whitespace-nowrap">
                        {ms.dueDate}
                      </TableCell>
                      <TableCell className="font-mono tabular-nums font-bold text-slate-900 whitespace-nowrap">
                        ${ms.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600">
                          <GitCommit className="w-3.5 h-3.5 text-fintech-paypal-blue" />
                          <span>{ms.commitsCount} commits</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {ms.aiReport ? (
                          <Badge variant="ai" size="sm" dot>
                            <Sparkles className="w-3 h-3 text-violet-600 mr-1" />
                            {ms.aiReport.overallScore}% Score
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Not analyzed</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {ms.clientApproval?.status === 'approved' ? (
                          <Badge variant="success" size="sm" dot>
                            Client Approved
                          </Badge>
                        ) : ms.status === 'ai_verified' ? (
                          <Badge variant="warning" size="sm" dot>
                            Awaiting Client
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400">&mdash;</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {ms.invoice?.status === 'PAID' ? (
                          <Badge variant="success" size="sm" dot>
                            PAID &bull; Settled
                          </Badge>
                        ) : ms.invoice?.status === 'SENT' ? (
                          <Badge variant="paypal" size="sm" dot>
                            SENT &bull; Unpaid
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">
                            Uninvoiced
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDetail(ms)}
                          rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table></div></CardContent></Card>)}

      {/* Part 3: Detailed Milestone View Modal */}
      {selectedMilestone && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Milestone #${selectedMilestone.order}: ${selectedMilestone.title}`}
          description={`Project: ${
            projects.find((p) => p.id === selectedMilestone.projectId)?.name || 'DevFlow'
          } • Target Payout: $${selectedMilestone.amount.toLocaleString()} USD`}
          size="xl"
          footer={
            <div className="flex flex-wrap items-center justify-between w-full gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {/* 1. Run AI Verification */}
                <Button
                  variant="ai"
                  size="sm"
                  isLoading={isAnalyzing}
                  leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                  onClick={() => handleRunAIAnalysis(selectedMilestone.id)}
                >
                  {selectedMilestone.aiReport ? 'Re-run AI Analysis' : 'Run AI Verification'}
                </Button>

                {/* 2. Client Approval Button (Explicit distinction from AI) */}
                {selectedMilestone.status === 'ai_verified' && (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<FileCheck className="w-3.5 h-3.5 text-emerald-600" />}
                    onClick={() => handleClientApprove(selectedMilestone.id)}
                  >
                    Simulate Client Sign-off
                  </Button>
                )}

                {/* 3. PayPal Invoice Generation */}
                {(selectedMilestone.status === 'client_approved' ||
                  (selectedMilestone.status === 'ai_verified' && !selectedMilestone.invoice)) && (
                  <Button
                    variant="paypal"
                    size="sm"
                    leftIcon={<DollarSign className="w-3.5 h-3.5" />}
                    onClick={() => handleGenerateInvoice(selectedMilestone.id)}
                  >
                    Generate PayPal Invoice
                  </Button>
                )}

                {/* 4. PayPal Webhook Simulation if invoiced & unpaid */}
                {selectedMilestone.invoice && selectedMilestone.invoice.status !== 'PAID' && (
                  <Button
                    variant="paypal"
                    size="sm"
                    isLoading={isSimulatingPayment}
                    leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
                    onClick={() => handleSimulateWebhookPaid(selectedMilestone.invoice!.id)}
                  >
                    Simulate Webhook Settlement
                  </Button>
                )}
              </div>

              <Button variant="secondary" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                Done
              </Button>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Top State Summary */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                  Lifecycle Status
                </span>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      selectedMilestone.status === 'paid'
                        ? 'success'
                        : selectedMilestone.status === 'ai_verified'
                        ? 'ai'
                        : selectedMilestone.status === 'client_approved'
                        ? 'warning'
                        : 'neutral'
                    }
                    size="md"
                    dot
                  >
                    {selectedMilestone.status.toUpperCase()}
                  </Badge>
                  {selectedMilestone.aiReport && (
                    <span className="font-mono text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      AI Score: {selectedMilestone.aiReport.overallScore}%
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                  Target Invoice Amount
                </span>
                <p className="font-mono text-base font-bold text-slate-900 tabular-nums">
                  ${selectedMilestone.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                  USD
                </p>
              </div>
            </div>

            {/* Scope Overview */}
            <div>
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Deliverable Description & Scope
              </h4>
              <p className="text-xs text-slate-600 bg-white p-3.5 rounded-xl border border-slate-200 leading-relaxed">
                {selectedMilestone.description}
              </p>
            </div>

            {/* Acceptance Criteria & Evidence Matching */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Acceptance Criteria ({selectedMilestone.requirements.length})
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">
                  Evaluated against commit SHAs
                </span>
              </div>

              <div className="space-y-2">
                {selectedMilestone.requirements.map((req: Requirement) => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {req.satisfied ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                            <Clock className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <span className="text-xs font-semibold text-slate-900">{req.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 pl-7">{req.description}</p>
                    </div>

                    <div className="text-right shrink-0">
                      {req.aiConfidence ? (
                        <span className="text-xs font-mono font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-200">
                          {req.aiConfidence}% Match
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Pending analysis</span>
                      )}
                      {req.evidenceSource && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono mt-1 justify-end">
                          <GitCommit className="w-3 h-3 text-fintech-paypal-blue" />
                          <span>{req.evidenceSource.substring(0, 7)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Analysis Summary Breakdown */}
            {selectedMilestone.aiReport ? (
              <div className="p-4 rounded-xl bg-violet-50/60 border border-violet-200/80 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-violet-950">
                    <Sparkles className="w-4 h-4 text-violet-600" />
                    <span>Explainable AI Verification Findings</span>
                  </div>
                  <Badge variant="ai" size="sm">
                    {selectedMilestone.aiReport.overallScore}% Confidence
                  </Badge>
                </div>
                <p className="text-violet-800 text-[11px] leading-relaxed">
                  {selectedMilestone.aiReport.summary}
                </p>
                <div className="text-[11px] text-violet-700 pt-2 border-t border-violet-200/60">
                  <strong>AI Next-Step Recommendation:</strong>{' '}
                  {selectedMilestone.aiReport.recommendations[0]}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center space-y-2">
                <Sparkles className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="text-xs font-medium text-slate-700">No AI Verification Performed Yet</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Click &quot;Run AI Verification&quot; below to evaluate repository commits and generate an automated audit report.
                </p>
              </div>
            )}

            {/* Client Approval Status (Human in the loop) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-slate-700" />
                  <span className="font-semibold text-slate-900">
                    Human-in-the-Loop Client Approval Status
                  </span>
                </div>
                {selectedMilestone.clientApproval?.status === 'approved' ? (
                  <Badge variant="success" size="sm" dot>
                    Approved
                  </Badge>
                ) : (
                  <Badge variant="warning" size="sm" dot>
                    Awaiting Sign-off
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                {selectedMilestone.clientApproval?.feedback ||
                  'AI verification provides algorithmic analysis, but milestone payouts require explicit client review and sign-off.'}
              </p>
              {selectedMilestone.clientApproval?.approvedAt && (
                <div className="text-[10px] text-slate-400 font-mono">
                  Approved at: {new Date(selectedMilestone.clientApproval.approvedAt).toLocaleString()}
                </div>
              )}
            </div>

            {/* PayPal Invoicing & Webhook Information */}
            {selectedMilestone.invoice ? (
              <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sky-950 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-fintech-paypal-blue" />
                    PayPal Invoicing: {selectedMilestone.invoice.invoiceNumber}
                  </span>
                  <Badge
                    variant={selectedMilestone.invoice.status === 'PAID' ? 'success' : 'paypal'}
                    size="sm"
                    dot
                  >
                    {selectedMilestone.invoice.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-sky-900 font-mono pt-1">
                  <div>PayPal ID: {selectedMilestone.invoice.paypalInvoiceId}</div>
                  <div>Recipient: {selectedMilestone.invoice.recipientEmail}</div>
                </div>
                {selectedMilestone.invoice.paypalWebhookEventId ? (
                  <div className="pt-2 border-t border-sky-200/60 flex items-center gap-1.5 text-emerald-800 font-mono text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      Verified Webhook: {selectedMilestone.invoice.paypalWebhookEventId}
                    </span>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-sky-200/60 text-slate-500 text-[11px]">
                    Invoice dispatched to client. Payment confirmation pending webhook arrival.
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </Modal>
      )}

      {/* Create Milestone Modal */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Create New Milestone Deliverable"
        description="Add a milestone deliverable scope, target payout amount, and acceptance criteria."
        size="md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsNewModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="paypal" size="sm" onClick={handleCreateMilestone}>
              Save Milestone
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateMilestone} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Associated Project</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="block w-full rounded-fintech border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-fintech-paypal-subtle"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.githubRepo})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Milestone Deliverable Title *"
            placeholder="e.g. End-to-End Payment Gateway Integration"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Invoice Target (USD) *"
              type="number"
              placeholder="2500.00"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              leftIcon={<DollarSign className="w-4 h-4" />}
              required
            />
            <Input
              label="Target Due Date *"
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">Deliverable Scope</label>
            <textarea
              className="w-full rounded-fintech border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-fintech-paypal-subtle"
              rows={2}
              placeholder="High-level description of what will be implemented and delivered..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Technical Acceptance Criteria (One per line)
            </label>
            <textarea
              className="w-full rounded-fintech border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-fintech-paypal-subtle font-mono text-[11px]"
              rows={3}
              placeholder="e.g.&#10;Verify PayPal REST API token acquisition&#10;Verify webhook payload signature verification"
              value={newCriteria}
              onChange={(e) => setNewCriteria(e.target.value)}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
