import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmptyState,
  Skeleton,
} from '@/components/common';
import { devFlowApi } from '@/services/api';
import {
  Project,
  Milestone,
  DeveloperTelemetry,
  GitHubCommitEvidence,
  PayPalInvoice,
} from '@/types';
import {
  DollarSign,
  FolderGit2,
  CheckCircle2,
  Clock,
  Sparkles,
  GitCommit,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Info,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isMockData, setIsMockData] = useState(false);
  const [telemetry, setTelemetry] = useState<DeveloperTelemetry | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [commits, setCommits] = useState<GitHubCommitEvidence[]>([]);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      try {
        const [telemetryRes, projectsRes, milestonesRes, commitsRes] = await Promise.all([
          devFlowApi.getTelemetry(),
          devFlowApi.getProjects(),
          devFlowApi.getMilestones(),
          devFlowApi.getGitHubCommits(),
        ]);

        setTelemetry(telemetryRes.data);
        setProjects(projectsRes.data);
        setMilestones(milestonesRes.data);
        setCommits(commitsRes.data);
        setIsMockData(
          telemetryRes.isMock || projectsRes.isMock || milestonesRes.isMock || commitsRes.isMock
        );
      } catch (err) {
        console.error('Failed to load dashboard telemetry:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const completedMilestones = milestones.filter((m) => m.status === 'paid');
  const pendingApprovals = milestones.filter(
    (m) => m.status === 'ai_verified' || m.status === 'client_review'
  );
  const recentInvoices: { milestone: Milestone; invoice: PayPalInvoice }[] = milestones
    .filter((m) => m.invoice)
    .map((m) => ({ milestone: m, invoice: m.invoice! }))
    .slice(0, 4);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Simulation / Data Transparency Notice */}
      {isMockData && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-sky-50/80 border border-sky-200/90 text-xs text-sky-950">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#0070BA] shrink-0" />
            <span className="leading-snug">
              <strong>Demonstration Mode:</strong> Live backend microservices are initializing.
              Displaying realistic simulated project telemetry and milestone contracts.
            </span>
          </div>
          <Badge variant="paypal" size="sm" className="self-start sm:self-auto shrink-0">
            PayPal Sandbox
          </Badge>
        </div>
      )}

      {/* 1. Welcome Section */}
      <section className="bg-gradient-to-r from-slate-900 via-slate-800 to-fintech-paypal-dark rounded-2xl p-6 sm:p-7 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-sky-300">
              Developer Command Center
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-400" />
            <span className="text-xs text-slate-300">DevFlow v0.1.0</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Welcome back, Sowjanya
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            2 projects active. Next milestone{' '}
            <strong className="text-white underline decoration-sky-400">
              AI Verification & Evidence Analysis
            </strong>{' '}
            is scored at <strong className="text-emerald-300">90% AI confidence</strong> and awaiting client review.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            variant="paypal"
            size="sm"
            onClick={() => navigate('/payments')}
            leftIcon={<CreditCard className="w-4 h-4" />}
          >
            PayPal Invoices
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-white/10 text-white border-white/20 hover:bg-white/20"
            onClick={() => navigate('/milestones')}
          >
            Review Milestones
          </Button>
        </div>
      </section>

      {/* 2-5: Top Metric Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Active Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Projects
            </CardTitle>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <FolderGit2 className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {projects.length}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
              <span className="font-mono text-emerald-600 font-semibold">100%</span>
              <span>repo webhooks active</span>
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: Completed Milestones */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Completed Milestones
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {completedMilestones.length} <span className="text-xs text-slate-400 font-normal">/ {milestones.length}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
              <Badge variant="success" size="sm" dot>
                {Math.round((completedMilestones.length / (milestones.length || 1)) * 100)}% Fulfilled
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Metric 3: Pending Approvals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pending Approvals
            </CardTitle>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {pendingApprovals.length}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-amber-700 font-medium mt-1">
              <Sparkles className="w-3.5 h-3.5 text-violet-600" />
              <span>AI Verified &bull; Awaiting Client</span>
            </div>
          </CardContent>
        </Card>

        {/* Metric 4: Total Invoiced & Settled */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Settled via PayPal
            </CardTitle>
            <div className="p-2 rounded-lg bg-sky-50 text-[#0070BA]">
              <DollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono tabular-nums">
              ${telemetry?.totalRevenuePaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
              <span className="font-mono text-slate-700 font-medium">
                ${telemetry?.pendingInvoicesAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span>pending settlement</span>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 6. Project Progress & Upcoming Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Overview Card (2 cols) */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Project Milestone Trajectory</CardTitle>
              <CardDescription>
                Progress tracking across active repository milestones and payment events
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/milestones')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              All Milestones
            </Button>
          </CardHeader>

          <CardContent className="space-y-5">
            {projects.map((project) => {
              const projMilestones = milestones.filter((m) => m.projectId === project.id);
              const completedCount = projMilestones.filter((m) => m.status === 'paid').length;
              const percent = Math.round((completedCount / (projMilestones.length || 1)) * 100);

              return (
                <div key={project.id} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-slate-900">{project.name}</h4>
                        <Badge variant="neutral" size="sm">
                          {project.githubRepo}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{project.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-semibold text-slate-900 font-mono tabular-nums">
                        ${project.totalBudget.toLocaleString()} USD
                      </span>
                      <div className="text-[11px] text-slate-400">
                        {completedCount} of {projMilestones.length} milestones paid
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-medium text-slate-600">
                      <span>Fulfillment Completion</span>
                      <span className="font-mono">{percent}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-fintech-paypal-blue to-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Upcoming Milestones Table */}
            <div className="space-y-2 pt-2"><div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Upcoming Milestones & Deliverables
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Milestone</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Verification Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {milestones.slice(0, 3).map((ms) => (
                    <TableRow key={ms.id}>
                      <TableCell>
                        <div className="font-medium text-slate-900">{ms.title}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {ms.requirements.length} technical requirements
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 font-mono">
                        {ms.dueDate}
                      </TableCell>
                      <TableCell className="font-mono tabular-nums font-semibold text-slate-900">
                        ${ms.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        {ms.status === 'paid' && (
                          <Badge variant="success" size="sm" dot>
                            Verified & Paid
                          </Badge>
                        )}
                        {ms.status === 'ai_verified' && (
                          <Badge variant="ai" size="sm" dot>
                            AI Verified ({ms.aiReport?.overallScore}%)
                          </Badge>
                        )}
                        {ms.status === 'in_progress' && (
                          <Badge variant="neutral" size="sm">
                            In Development
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate('/milestones')}
                        >
                          Inspect &rarr;
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table></div></div></CardContent>
        </Card>

        {/* 7. Recent GitHub Activity (1 col) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>GitHub Activity</CardTitle>
              <CardDescription>Recent commits in monitored repository</CardDescription>
            </div>
            <a
              href="https://github.com/Tharunnagabramhagna/DevFlow/commits/main"
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 hover:text-slate-700 transition-colors"
              title="Open GitHub commits"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </CardHeader>
          <CardContent className="space-y-3">
            {commits.map((commit) => (
              <div
                key={commit.sha}
                className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 hover:bg-slate-100/60 transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <GitCommit className="w-3.5 h-3.5 text-fintech-paypal-blue" />
                    <span className="font-mono text-[11px] font-semibold text-slate-800">
                      {commit.sha.substring(0, 7)}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    +{commit.additions} / -{commit.deletions}
                  </span>
                </div>
                <p className="text-xs text-slate-700 font-medium line-clamp-2 leading-snug">
                  {commit.message}
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>{commit.author}</span>
                  <span>{new Date(commit.date).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => navigate('/evidence')}
              leftIcon={<GitCommit className="w-3.5 h-3.5" />}
            >
              View Full Evidence Trail
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* 9-10. Recent Invoices & Payment Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>Recent PayPal Invoices & Settlements</CardTitle>
            <CardDescription>
              Invoices are issued upon client approval and updated via verified PayPal webhook events
            </CardDescription>
          </div>
          <Button
            variant="paypal"
            size="sm"
            onClick={() => navigate('/payments')}
            leftIcon={<DollarSign className="w-3.5 h-3.5" />}
          >
            Manage Invoices
          </Button>
        </CardHeader>

        <CardContent><div className="overflow-x-auto"><Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Associated Milestone</TableHead>
                <TableHead>Amount (USD)</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead>Webhook Verification Event</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentInvoices.length === 0 ? (
                <TableEmptyState
                  title="No Invoices Issued Yet"
                  description="Invoices are created after milestone acceptance."
                />
              ) : (
                recentInvoices.map(({ milestone, invoice }) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono text-xs font-semibold text-slate-900">
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900">{invoice.recipientName}</div>
                      <div className="text-[11px] text-slate-400">{invoice.recipientEmail}</div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      {milestone.title}
                    </TableCell>
                    <TableCell className="font-mono tabular-nums font-semibold text-slate-900">
                      ${invoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {invoice.status === 'PAID' ? (
                        <Badge variant="success" size="sm" dot>
                          PAID &bull; Settled
                        </Badge>
                      ) : invoice.status === 'SENT' ? (
                        <Badge variant="paypal" size="sm" dot>
                          SENT &bull; Awaiting Payment
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">
                          DRAFT &bull; Pending Send
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-slate-600">
                      {invoice.paypalWebhookEventId ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          {invoice.paypalWebhookEventId}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">No webhook event recorded</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table></div></CardContent></Card></div>);};
