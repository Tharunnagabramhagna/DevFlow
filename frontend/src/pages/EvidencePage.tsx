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
  TableEmptyState,
  Input,
  Modal,
  Skeleton,
} from '@/components/common';
import { devFlowApi } from '@/services/api';
import { GitHubCommitEvidence, GitHubPullRequestEvidence, Milestone, ChangedFile } from '@/types';
import {
  GitCommit,
  GitPullRequest,
  ExternalLink,
  Search,
  GitBranch,
  Filter,
  CheckCircle2,
  ChevronRight,
  Info,
  ShieldCheck,
  FileCode,
  FileText,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

// â”€â”€â”€ Diff Viewer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface DiffViewerProps {
  file: ChangedFile;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ file }) => (
  <div className="rounded-xl border border-slate-200 overflow-hidden">
    {/* File Header */}
    <div className="flex items-center justify-between px-3 py-2 bg-slate-100 border-b border-slate-200">
      <div className="flex items-center gap-2 font-mono text-xs font-semibold text-slate-700">
        <FileText className="w-3.5 h-3.5 text-slate-500" />
        <span>{file.filename}</span>
      </div>
      <div className="flex items-center gap-2 font-mono text-[11px]">
        <span className="text-emerald-600 font-bold">+{file.additions}</span>
        <span className="text-rose-500 font-bold">-{file.deletions}</span>
      </div>
    </div>
    {/* Diff Lines */}
    <div className="overflow-x-auto bg-slate-950">
      <table className="w-full text-xs font-mono border-collapse">
        <tbody>
          {file.diff.map((line, idx) => {
            let rowBg = '';
            let textColor = 'text-slate-400';
            let prefix = ' ';
            if (line.type === 'added') {
              rowBg = 'bg-emerald-950/60';
              textColor = 'text-emerald-300';
              prefix = '+';
            } else if (line.type === 'removed') {
              rowBg = 'bg-rose-950/60';
              textColor = 'text-rose-300';
              prefix = '-';
            } else if (line.type === 'header') {
              rowBg = 'bg-sky-950/50';
              textColor = 'text-sky-400';
              prefix = ' ';
            }
            return (
              <tr key={idx} className={rowBg}>
                <td className="select-none w-8 text-right pr-2 pl-3 py-0.5 text-slate-600 border-r border-slate-800">
                  {line.type !== 'header' && line.lineNumber ? line.lineNumber : ''}
                </td>
                <td className={`w-5 text-center py-0.5 text-slate-500 border-r border-slate-800`}>
                  {prefix}
                </td>
                <td className={`py-0.5 pl-3 pr-4 ${textColor} whitespace-pre`}>
                  {line.content}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

// â”€â”€â”€ Commit Stats Skeleton â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const EvidenceLoadingSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[0, 1, 2].map((i) => (
        <Card key={i}>
          <CardContent className="pt-5">
            <Skeleton variant="text" className="w-24 h-3 mb-3" />
            <Skeleton variant="text" className="w-32 h-7 mb-2" />
            <Skeleton variant="text" className="w-40 h-3" />
          </CardContent>
        </Card>
      ))}
    </div>
    <Card>
      <CardContent className="pt-5 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} variant="text" className="w-full h-10" />
        ))}
      </CardContent>
    </Card>
  </div>
);

// â”€â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const EvidencePage: React.FC = () => {
  const [commits, setCommits] = useState<GitHubCommitEvidence[]>([]);
  const [pulls, setPulls] = useState<GitHubPullRequestEvidence[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMockData, setIsMockData] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [authorFilter, setAuthorFilter] = useState('all');
  const [selectedCommit, setSelectedCommit] = useState<GitHubCommitEvidence | null>(null);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [activeFileTab, setActiveFileTab] = useState(0);

  useEffect(() => {
    loadEvidence();
  }, []);

  const loadEvidence = async () => {
    setLoading(true);
    try {
      const [commitsRes, pullsRes, milestonesRes] = await Promise.all([
        devFlowApi.getGitHubCommits(),
        devFlowApi.getGitHubPullRequests(),
        devFlowApi.getMilestones(),
      ]);
      setCommits(commitsRes.data);
      setPulls(pullsRes.data);
      setMilestones(milestonesRes.data);
      setIsMockData(commitsRes.isMock || pullsRes.isMock);
    } catch (err) {
      console.error('Failed to load evidence:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInspectDiff = (commit: GitHubCommitEvidence) => {
    setSelectedCommit(commit);
    setActiveFileTab(0);
    setIsDiffModalOpen(true);
  };

  const totalAdditions = commits.reduce((sum, c) => sum + c.additions, 0);
  const totalDeletions = commits.reduce((sum, c) => sum + c.deletions, 0);
  const authors = Array.from(new Set(commits.map((c) => c.author)));

  const filteredCommits = commits.filter((c) => {
    const matchesSearch =
      c.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.sha.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAuthor = authorFilter === 'all' || c.author === authorFilter;
    return matchesSearch && matchesAuthor;
  });

  if (loading) return <EvidenceLoadingSkeleton />;

  return (
    <div className="space-y-6">
      {/* Transparency Banner */}
      {isMockData && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-sky-50/80 border border-sky-200/90 text-xs text-sky-950">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#0070BA] shrink-0" />
            <span className="leading-snug">
              <strong>Demonstration Data:</strong> Evidence shown is sample telemetry for repository{' '}
              <code className="font-mono font-semibold">Tharunnagabramhagna/DevFlow</code> branch{' '}
              <code className="font-mono font-semibold">main</code>. Real GitHub sync requires active webhook registration.
            </span>
          </div>
          <Badge variant="neutral" size="sm" className="self-start sm:self-auto shrink-0">
            Sample Data Indexed
          </Badge>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">GitHub Evidence Audit</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Commit history, pull request artifacts, and code diff statistics. Commits are associated
            evidence — evaluated by the AI engine, not proof of requirement satisfaction.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadEvidence}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
          <a
            href="https://github.com/Tharunnagabramhagna/DevFlow"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs"
            data-testid="repo-link"
          >
            <GitBranch className="w-3.5 h-3.5 text-slate-500" />
            <span>Tharunnagabramhagna/DevFlow</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Monitored Commits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {commits.length}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Demonstration commit history</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pull Request Artifacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {pulls.length} PRs
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Merged into main â€” indexed as milestone evidence
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Cumulative Diff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tabular-nums">
              <span className="text-emerald-600">+{totalAdditions.toLocaleString()}</span>{' '}
              <span className="text-rose-500">-{totalDeletions.toLocaleString()}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Lines changed across all indexed commits</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search by message, SHA, or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            className="text-xs py-1.5"
          />
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Author:
          </span>
          <select
            value={authorFilter}
            onChange={(e) => setAuthorFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-200"
            data-testid="author-filter"
          >
            <option value="all">All Contributors ({commits.length})</option>
            {authors.map((auth) => (
              <option key={auth} value={auth}>
                {auth}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Commit Table + PR Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Commit Evidence Table (2 cols) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Commit Evidence Stream</CardTitle>
                <CardDescription>
                  Retrieved from branch <code className="font-mono">main</code>. Click any row to
                  inspect the code diff.
                </CardDescription>
              </div>
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                {filteredCommits.length} / {commits.length}
              </span>
            </div>
          </CardHeader>
          <CardContent><div className="overflow-x-auto"><Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SHA</TableHead>
                  <TableHead>Message &amp; Author</TableHead>
                  <TableHead>Diff Stat</TableHead>
                  <TableHead>Milestone</TableHead>
                  <TableHead className="text-right">Diff</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCommits.length === 0 ? (
                  <TableEmptyState
                    colSpan={5}
                    icon={<AlertCircle className="w-8 h-8 text-slate-300" />}
                    title="No commits match your filters"
                    description="Try clearing your search or changing the author filter."
                  />
                ) : (
                  filteredCommits.map((c) => {
                    const linkedMilestone = milestones.find((m) =>
                      m.requirements.some((r) => r.evidenceSource === c.sha)
                    );
                    return (
                      <TableRow
                        key={c.sha}
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => handleInspectDiff(c)}
                        data-testid={`commit-row-${c.sha.substring(0, 7)}`}
                      >
                        <TableCell className="font-mono text-xs font-bold text-[#0070BA]">
                          <div className="flex items-center gap-1.5">
                            <GitCommit className="w-3.5 h-3.5 shrink-0" />
                            <span>{c.sha.substring(0, 7)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-slate-900 text-xs sm:text-sm line-clamp-1">
                            {c.message}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span>{c.author}</span>
                            <span>&bull;</span>
                            <span>{new Date(c.date).toLocaleDateString()}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          <span className="text-emerald-600 font-bold">+{c.additions}</span>{' '}
                          <span className="text-rose-500 font-bold">-{c.deletions}</span>
                        </TableCell>
                        <TableCell>
                          {linkedMilestone ? (
                            <Badge variant="ai" size="sm">
                              {linkedMilestone.id.toUpperCase()}
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400">&mdash;</span>
                          )}
                        </TableCell>
                        <TableCell
                          className="text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleInspectDiff(c)}
                            rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                            data-testid={`inspect-diff-${c.sha.substring(0, 7)}`}
                          >
                            Inspect
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          </CardContent>
        </Card>

        {/* Pull Request Sidebar (1 col) */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Pull Request Evidence</CardTitle>
                <CardDescription>Code merges &amp; review checkpoints</CardDescription>
              </div>
              <Badge variant="neutral" size="sm">
                {pulls.length} PRs
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {pulls.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No pull requests indexed</p>
            ) : (
              pulls.map((pr) => (
                <div
                  key={pr.number}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2"
                  data-testid={`pr-card-${pr.number}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <GitPullRequest className="w-4 h-4 text-violet-600" />
                      <span className="font-bold text-xs text-slate-900">PR #{pr.number}</span>
                    </div>
                    <Badge variant={pr.state === 'merged' ? 'success' : 'paypal'} size="sm" dot>
                      {pr.state.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 line-clamp-2">{pr.title}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-slate-200/60 font-mono">
                    <span>by {pr.author}</span>
                    <a
                      href={pr.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#0070BA] hover:underline inline-flex items-center gap-1 font-sans"
                    >
                      <span>Open</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Milestone â†’ Commit Mapping */}
      <Card>
        <CardHeader>
          <CardTitle>Milestone Evidence Mapping</CardTitle>
          <CardDescription>
            For each milestone, the commit SHAs associated as evidence by the AI engine. This is
            pattern-matched association, not proof of requirement satisfaction.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {milestones
            .filter((m) => m.requirements.some((r) => r.evidenceSource))
            .map((m) => {
              const linkedShas = m.requirements
                .filter((r) => r.evidenceSource)
                .map((r) => r.evidenceSource as string);
              return (
                <div
                  key={m.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">{m.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {m.requirements.length} requirement
                      {m.requirements.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(new Set(linkedShas)).map((sha) => (
                      <button
                        key={sha}
                        onClick={() => {
                          const commit = commits.find((c) => c.sha === sha);
                          if (commit) handleInspectDiff(commit);
                        }}
                        className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-300 text-[#0070BA] hover:bg-sky-50 hover:border-sky-300 transition-colors"
                        data-testid={`sha-chip-${sha.substring(0, 7)}`}
                      >
                        {sha.substring(0, 7)}
                      </button>
                    ))}
                  </div>
                  <Badge variant="neutral" size="sm">
                    {m.status.replace('_', ' ')}
                  </Badge>
                </div>
              );
            })}
        </CardContent>
      </Card>

      {/* Code Diff Inspection Modal */}
      {selectedCommit && (
        <Modal
          isOpen={isDiffModalOpen}
          onClose={() => setIsDiffModalOpen(false)}
          title={`Commit: ${selectedCommit.sha.substring(0, 8)}`}
          description={`${selectedCommit.author} • ${new Date(selectedCommit.date).toLocaleString()}`}
          size="lg"
          footer={
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full">
              <a
                href={selectedCommit.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center sm:justify-start gap-1 text-xs text-[#0070BA] hover:underline font-semibold py-1"
              >
                <span>View on GitHub</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <div className="flex items-center justify-end gap-2">
                <div className="hidden xs:flex p-1.5 px-2 rounded-lg bg-emerald-50 border border-emerald-200 items-center gap-1.5 text-xs text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-semibold">AI Linked</span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsDiffModalOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Close
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Commit Message */}
            <div className="p-3.5 rounded-xl bg-slate-900 text-white font-mono text-xs space-y-1">
              <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider block">
                Commit Message
              </span>
              <p className="text-slate-100">{selectedCommit.message}</p>
            </div>

            {/* Diff Stats Banner */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-slate-500" />
                <span className="text-slate-700">
                  {selectedCommit.filesChanged} files altered
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-emerald-600 font-bold">+{selectedCommit.additions} additions</span>
                <span className="text-rose-500 font-bold">-{selectedCommit.deletions} deletions</span>
              </div>
            </div>

            {/* File Tabs + Diff Viewer */}
            {selectedCommit.changedFiles && selectedCommit.changedFiles.length > 0 ? (
              <div className="space-y-2">
                {/* File Tabs */}
                <div className="flex flex-wrap gap-1.5">
                  {selectedCommit.changedFiles.map((file, idx) => (
                    <button
                      key={file.filename}
                      onClick={() => setActiveFileTab(idx)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium border transition-colors ${
                        activeFileTab === idx
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                      }`}
                      data-testid={`file-tab-${idx}`}
                    >
                      {file.filename.split('/').pop()}
                    </button>
                  ))}
                </div>
                {/* Active File Diff */}
                <DiffViewer file={selectedCommit.changedFiles[activeFileTab]} />
              </div>
            ) : (
              /* Fallback static diff snippet */
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Extracted Syntax Evidence (DevFlow AI Engine)
                </span>
                <div className="p-3.5 rounded-xl bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto space-y-0.5 border border-slate-800">
                  <div className="text-sky-400">@@ -0,0 +1,6 @@</div>
                  <div className="text-emerald-400">
                    + export async function verifyPayPalWebhookSignature(payload, headers) &#123;
                  </div>
                  <div className="text-emerald-400">
                    +   const transmissionId = headers[&apos;paypal-transmission-id&apos;];
                  </div>
                  <div className="text-emerald-400">
                    +   const certUrl = headers[&apos;paypal-cert-url&apos;];
                  </div>
                  <div className="text-slate-400">
                    {'  '}// Validates signature and transmission against PayPal API
                  </div>
                  <div className="text-emerald-400">
                    +   return await paypalClient.verifyWebhookSignature(&#123; payload, headers
                    &#125;);
                  </div>
                  <div className="text-emerald-400">+ &#125;</div>
                </div>
              </div>
            )}

            {/* Evidence Disclaimer */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2 text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                This commit is <strong>associated evidence</strong> evaluated by the AI engine via
                pattern matching. AI confidence is not proof of requirement satisfaction. Human
                client review and approval is required before any payment action.
              </span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
