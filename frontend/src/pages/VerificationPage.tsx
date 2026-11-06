import React, { useEffect, useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Button,
  Skeleton,
  useToast,
} from '@/components/common';
import { devFlowApi } from '@/services/api';
import { Milestone, AIVerificationReport, TestSuiteResult } from '@/types';
import {
  Check,
  X,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  Info,
  GitCommit,
  ListChecks,
  FlaskConical,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Clock,
  Minus,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'passed' | 'review_required' | 'failed';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 85) return 'text-emerald-700';
  if (score >= 60) return 'text-amber-700';
  return 'text-rose-700';
}

function scoreBg(score: number): string {
  if (score >= 85) return 'bg-emerald-50 border-emerald-200';
  if (score >= 60) return 'bg-amber-50 border-amber-200';
  return 'bg-rose-50 border-rose-200';
}

function statusBadgeVariant(status: AIVerificationReport['status']): 'success' | 'warning' | 'danger' {
  if (status === 'passed') return 'success';
  if (status === 'review_required') return 'warning';
  return 'danger';
}

function statusLabel(status: AIVerificationReport['status']): string {
  if (status === 'passed') return 'Passed';
  if (status === 'review_required') return 'Review Required';
  return 'Failed';
}

function reqIcon(status: 'satisfied' | 'partial' | 'unsatisfied') {
  if (status === 'satisfied')
    return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
  if (status === 'partial')
    return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
  return <XCircle className="w-4 h-4 text-rose-500 shrink-0" />;
}

function reqScoreColor(status: 'satisfied' | 'partial' | 'unsatisfied'): string {
  if (status === 'satisfied') return 'text-emerald-700';
  if (status === 'partial') return 'text-amber-700';
  return 'text-rose-700';
}

// ─── Test Suite Panel ─────────────────────────────────────────────────────────

const TestSuitePanel: React.FC<{ suite: TestSuiteResult }> = ({ suite }) => {
  const total = suite.passed + suite.failed + suite.skipped;
  const passRate = total > 0 ? Math.round((suite.passed / total) * 100) : 0;

  return (
    <div className="space-y-3">
      {/* Summary Bar */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="font-semibold text-slate-700">{suite.name}</span>
        <div className="flex items-center gap-2 font-mono">
          <span className="text-emerald-700 font-bold">{suite.passed} passed</span>
          {suite.failed > 0 && (
            <span className="text-rose-700 font-bold">{suite.failed} failed</span>
          )}
          {suite.skipped > 0 && (
            <span className="text-slate-500">{suite.skipped} skipped</span>
          )}
          <span className="text-slate-400">·</span>
          <span className="text-slate-500">{(suite.durationMs / 1000).toFixed(2)}s</span>
        </div>
        <span
          className={`ml-auto font-bold font-mono tabular-nums ${
            passRate === 100 ? 'text-emerald-700' : passRate >= 80 ? 'text-amber-700' : 'text-rose-700'
          }`}
        >
          {passRate}% pass rate
        </span>
      </div>

      {/* Progress Bar */}
      <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-slate-100">
        <div
          className="bg-emerald-500 transition-all"
          style={{ width: `${(suite.passed / total) * 100}%` }}
        />
        {suite.failed > 0 && (
          <div
            className="bg-rose-500 transition-all"
            style={{ width: `${(suite.failed / total) * 100}%` }}
          />
        )}
        {suite.skipped > 0 && (
          <div
            className="bg-slate-300 transition-all"
            style={{ width: `${(suite.skipped / total) * 100}%` }}
          />
        )}
      </div>

      {/* Individual Tests */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {suite.tests.map((test, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80"
          >
            {test.status === 'passed' ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : test.status === 'failed' ? (
              <X className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            ) : (
              <Minus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
            <span className="text-[11px] text-slate-700 truncate flex-1">{test.name}</span>
            {test.durationMs > 0 && (
              <span className="text-[10px] font-mono text-slate-400 shrink-0">
                {test.durationMs}ms
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Report Card ──────────────────────────────────────────────────────────────

interface ReportCardProps {
  milestone: Milestone;
  report: AIVerificationReport;
  onRerun: (milestoneId: string) => void;
  rerunningId: string | null;
  navigateToEvidence: () => void;
}

const ReportCard: React.FC<ReportCardProps> = ({
  milestone,
  report,
  onRerun,
  rerunningId,
  navigateToEvidence,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showTests, setShowTests] = useState(false);

  return (
    <Card
      className="overflow-hidden"
      data-testid={`verification-card-${milestone.id}`}
    >
      <CardHeader className="border-b border-slate-100 bg-slate-50/50">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          {/* Left: ID + Title + Summary */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
                {report.id}
              </span>
              <Badge
                variant={statusBadgeVariant(report.status)}
                size="sm"
                dot
                pulseDot={report.status === 'review_required'}
              >
                {statusLabel(report.status)}
              </Badge>
              {report.engineVersion && (
                <span className="text-[10px] text-violet-600 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-md font-mono">
                  {report.engineVersion}
                </span>
              )}
            </div>
            <CardTitle className="text-base">{milestone.title}</CardTitle>
            <CardDescription className="text-xs">{report.summary}</CardDescription>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-mono pt-0.5">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(report.analyzedAt).toLocaleString()}
              </span>
              {report.commitsSampled && (
                <span className="flex items-center gap-1">
                  <GitCommit className="w-3 h-3" />
                  {report.commitsSampled} commits sampled
                </span>
              )}
            </div>
          </div>

          {/* Right: Score */}
          <div
            className={`flex flex-col items-center justify-center w-20 h-20 rounded-2xl border-2 shrink-0 ${scoreBg(
              report.overallScore
            )}`}
          >
            <span
              className={`text-3xl font-black font-mono tabular-nums leading-none ${scoreColor(
                report.overallScore
              )}`}
            >
              {report.overallScore}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">
              Score
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Requirements Breakdown (expandable) */}
        <button
          onClick={() => setExpanded((p) => !p)}
          className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 uppercase tracking-wider hover:text-slate-900 transition-colors group"
          data-testid={`expand-requirements-${milestone.id}`}
        >
          <span className="flex items-center gap-1.5">
            <ListChecks className="w-3.5 h-3.5" />
            Requirement Breakdown ({report.requirementsAnalysis.length})
          </span>
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
          )}
        </button>

        {expanded && (
          <div className="space-y-3 pl-1">
            {report.requirementsAnalysis.map((req) => (
              <div
                key={req.requirementId}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5"
                data-testid={`req-row-${req.requirementId}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    {reqIcon(req.status)}
                    <span className="text-xs font-semibold text-slate-900 leading-tight">
                      {req.requirementTitle}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-mono font-black shrink-0 tabular-nums ${reqScoreColor(
                      req.status
                    )}`}
                  >
                    {req.score}%
                  </span>
                </div>

                <p className="text-xs text-slate-600 pl-6 leading-relaxed">{req.explanation}</p>

                {/* Matched commit SHAs */}
                <div className="pl-6 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Evidence:
                  </span>
                  {req.matchedCommits.map((sha) => (
                    <button
                      key={sha}
                      onClick={navigateToEvidence}
                      className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-300 text-[#0070BA] hover:bg-sky-50 hover:border-sky-300 transition-colors"
                      title="View in Evidence Audit"
                      data-testid={`commit-chip-${sha.substring(0, 7)}`}
                    >
                      {sha.substring(0, 7)}
                    </button>
                  ))}
                </div>

                {/* Missing Evidence warning */}
                {req.missingEvidence && (
                  <div className="pl-6 flex items-start gap-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      <strong>Missing evidence:</strong> {req.missingEvidence}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Test Suite Results */}
        {report.testSuiteResult && (
          <>
            <button
              onClick={() => setShowTests((p) => !p)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 uppercase tracking-wider hover:text-slate-900 transition-colors group"
              data-testid={`expand-tests-${milestone.id}`}
            >
              <span className="flex items-center gap-1.5">
                <FlaskConical className="w-3.5 h-3.5" />
                Test Suite Results
                <span className="font-mono font-normal lowercase normal-case text-slate-500">
                  ({report.testSuiteResult.passed + report.testSuiteResult.failed + report.testSuiteResult.skipped} tests)
                </span>
              </span>
              {showTests ? (
                <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
              )}
            </button>
            {showTests && <TestSuitePanel suite={report.testSuiteResult} />}
          </>
        )}

        {/* Recommendations */}
        {report.recommendations.length > 0 && (
          <div className="p-3.5 rounded-xl bg-violet-50 border border-violet-200 space-y-1.5">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-violet-800 uppercase tracking-wider">
              <Lightbulb className="w-3.5 h-3.5" />
              AI Recommendations
            </span>
            <ol className="space-y-1 pl-5">
              {report.recommendations.map((rec, idx) => (
                <li key={idx} className="text-xs text-violet-700 list-decimal leading-relaxed">
                  {rec}
                </li>
              ))}
            </ol>
          </div>
        )}
      </CardContent>

      <CardFooter className="bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Disclaimer */}
        <p className="text-[11px] text-slate-500 flex-1 leading-relaxed">
          <strong>Disclaimer:</strong>{' '}
          {report.disclaimer ||
            'AI analysis provides automated pattern matching. AI confidence is NOT proof of correctness. Human review required before any payment action.'}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRerun(milestone.id)}
          isLoading={rerunningId === milestone.id}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          data-testid={`rerun-btn-${milestone.id}`}
          className="w-full sm:w-auto shrink-0"
        >
          Re-run Analysis
        </Button>
      </CardFooter>
    </Card>
  );
};

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

const VerificationSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
      {[0, 1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="pt-5">
            <Skeleton variant="text" className="w-24 h-3 mb-3" />
            <Skeleton variant="text" className="w-16 h-7 mb-2" />
            <Skeleton variant="text" className="w-32 h-3" />
          </CardContent>
        </Card>
      ))}
    </div>
    {[0, 1].map((i) => (
      <Card key={i}>
        <CardContent className="pt-5 space-y-3">
          <Skeleton variant="text" className="w-48 h-4" />
          <Skeleton variant="text" className="w-full h-3" />
          <Skeleton variant="text" className="w-3/4 h-3" />
          <Skeleton variant="text" className="w-full h-16" />
        </CardContent>
      </Card>
    ))}
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

export const VerificationPage: React.FC = () => {
  const { toast } = useToast();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [rerunningId, setRerunningId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  useEffect(() => {
    loadMilestones();
  }, []);

  const loadMilestones = async () => {
    setLoading(true);
    try {
      const res = await devFlowApi.getMilestones();
      setMilestones(res.data);
    } catch (err) {
      console.error('Failed to load milestones:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRerun = async (milestoneId: string) => {
    setRerunningId(milestoneId);
    try {
      const res = await devFlowApi.runAIVerification(milestoneId);
      setMilestones((prev) =>
        prev.map((m) =>
          m.id === milestoneId ? { ...m, aiReport: res.data, status: 'ai_verified' } : m
        )
      );
      toast.success('AI Analysis Complete', `Verification report refreshed for milestone ${milestoneId}.`);
    } catch {
      toast.error('Analysis Failed', 'Could not connect to AI verification service. Try again.');
    } finally {
      setRerunningId(null);
    }
  };

  const navigateToEvidence = () => {
    window.location.hash = '#/evidence';
  };

  const verifiedMilestones = milestones.filter((m) => m.aiReport);
  const pendingMilestones = milestones.filter((m) => !m.aiReport);

  // Filter tab logic
  const filteredReports = verifiedMilestones.filter((m) => {
    if (filterTab === 'all') return true;
    return m.aiReport!.status === filterTab;
  });

  // Overview metrics
  const avgScore =
    verifiedMilestones.length > 0
      ? Math.round(
          verifiedMilestones.reduce((sum, m) => sum + m.aiReport!.overallScore, 0) /
            verifiedMilestones.length
        )
      : 0;

  const passCount = verifiedMilestones.filter((m) => m.aiReport!.status === 'passed').length;
  const reviewCount = verifiedMilestones.filter(
    (m) => m.aiReport!.status === 'review_required'
  ).length;

  const filterTabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All Reports', count: verifiedMilestones.length },
    { key: 'passed', label: 'Passed', count: passCount },
    { key: 'review_required', label: 'Review Required', count: reviewCount },
    {
      key: 'failed',
      label: 'Failed',
      count: verifiedMilestones.filter((m) => m.aiReport!.status === 'failed').length,
    },
  ];

  if (loading) return <VerificationSkeleton />;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            AI Verification Intelligence
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Explainable audit reports generated by DevFlow AI — pattern-matched evidence against
            milestone requirements. Not a substitute for human review.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="ai" size="md" dot pulseDot>
            DevFlow AI Architecture (Demo Mode)
          </Badge>
        </div>
      </div>

      {/* Critical Disclaimer Banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">
            Important — AI Verification Limitations
          </p>
          <p className="text-xs text-amber-800 leading-relaxed">
            AI analysis provides automated <strong>pattern matching only</strong>. AI confidence
            scores are <strong>not proof of correctness</strong>. AI verification is{' '}
            <strong>not client approval</strong>. No payment action should be taken based solely on
            AI output. Human review by the client is required before any invoice is actioned.
          </p>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Reports Run
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black font-mono tabular-nums text-slate-900">
              {verifiedMilestones.length}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {pendingMilestones.length} milestones pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Average Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-black font-mono tabular-nums ${scoreColor(avgScore)}`}>
              {avgScore}%
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Across all analyzed milestones</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Passed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black font-mono tabular-nums text-emerald-700">
              {passCount}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">≥ 85% confidence threshold</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Need Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black font-mono tabular-nums text-amber-700">
              {reviewCount}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">60–84% — human review advised</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterTab === tab.key
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            data-testid={`filter-tab-${tab.key}`}
          >
            {tab.label}
            <span
              className={`font-mono tabular-nums text-[10px] px-1.5 py-0.5 rounded-full ${
                filterTab === tab.key
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Report Cards */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <Card>
            <CardContent className="pt-10 pb-10 flex flex-col items-center gap-3 text-center">
              <Sparkles className="w-10 h-10 text-slate-200" />
              <p className="text-sm font-semibold text-slate-700">No reports match this filter</p>
              <p className="text-xs text-slate-500">
                Try switching to "All Reports" or run an AI analysis on a milestone.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterTab('all')}
              >
                Show All Reports
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredReports.map((ms) => (
            <ReportCard
              key={ms.id}
              milestone={ms}
              report={ms.aiReport!}
              onRerun={handleRerun}
              rerunningId={rerunningId}
              navigateToEvidence={navigateToEvidence}
            />
          ))
        )}
      </div>

      {/* Milestones Without AI Reports */}
      {pendingMilestones.length > 0 && (filterTab === 'all') && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400" />
              <CardTitle>Milestones Awaiting AI Analysis</CardTitle>
            </div>
            <CardDescription>
              These milestones have no AI verification report yet. Run an analysis to generate
              an explainable evidence-matched report.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingMilestones.map((ms) => (
              <div
                key={ms.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/60"
                data-testid={`pending-milestone-${ms.id}`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{ms.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {ms.requirements.length} requirement
                    {ms.requirements.length !== 1 ? 's' : ''} · Due{' '}
                    {new Date(ms.dueDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="neutral" size="sm">
                    {ms.status.replace('_', ' ')}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRerun(ms.id)}
                    isLoading={rerunningId === ms.id}
                    leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                    data-testid={`run-analysis-${ms.id}`}
                  >
                    Run AI Verification
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
