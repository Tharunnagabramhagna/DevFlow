import { DevFlowLogo } from '@/components/common';
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderGit2,
  FileText,
  Settings,
  Sliders,
  Bell,
  Search,
  HelpCircle,
  GitCommit,
  GitPullRequest,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Copy,
  Check,
  X,
  Menu,
  RotateCw,
  FileCode,
  ShieldCheck,
  Sparkles,
  Download,
  ListChecks,
} from 'lucide-react';
import { devFlowApi } from '@/services/api';
import { GitHubCommitEvidence, GitHubPullRequestEvidence, ChangedFile } from '@/types';

// Octocat GitHub SVG Icon
const GitHubIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

// High-Density Dark Theme Diff Viewer
interface DarkDiffViewerProps {
  file: ChangedFile;
}

const DarkDiffViewer: React.FC<DarkDiffViewerProps> = ({ file }) => (
  <div className="rounded-xl border border-[#26344B] overflow-hidden bg-[#0A101D] text-xs font-mono">
    {/* File Header */}
    <div className="flex items-center justify-between px-3.5 py-2 bg-[#111C30] border-b border-[#26344B]">
      <div className="flex items-center gap-2 text-slate-200 font-semibold truncate">
        <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span className="truncate">{file.filename}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0 text-[11px]">
        <span className="text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
          +{file.additions}
        </span>
        <span className="text-rose-400 font-bold bg-rose-950/60 px-2 py-0.5 rounded border border-rose-500/30">
          -{file.deletions}
        </span>
      </div>
    </div>

    {/* Diff Lines Table */}
    <div className="overflow-x-auto max-h-96">
      <table className="w-full text-[11px] leading-tight border-collapse">
        <tbody>
          {file.diff.map((line, idx) => {
            let rowBg = 'bg-[#0A101D]';
            let textColor = 'text-slate-300';
            let prefix = ' ';

            if (line.type === 'added') {
              rowBg = 'bg-emerald-950/30';
              textColor = 'text-emerald-300';
              prefix = '+';
            } else if (line.type === 'removed') {
              rowBg = 'bg-rose-950/30';
              textColor = 'text-rose-300';
              prefix = '-';
            } else if (line.type === 'header') {
              rowBg = 'bg-[#152238]';
              textColor = 'text-blue-400 font-semibold';
              prefix = ' ';
            }

            return (
              <tr key={idx} className={`${rowBg} hover:bg-[#152238]/60 transition-colors`}>
                <td className="select-none w-10 text-right pr-2 pl-3 py-0.5 text-slate-500 border-r border-[#26344B] bg-[#0E1726]">
                  {line.type !== 'header' && line.lineNumber ? line.lineNumber : ''}
                </td>
                <td className="w-6 text-center py-0.5 text-slate-500 border-r border-[#26344B] select-none font-bold">
                  {prefix}
                </td>
                <td className={`py-0.5 pl-3 pr-4 ${textColor} whitespace-pre overflow-x-visible font-mono`}>
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

// Evidence Item Model for unified table rendering
export interface UnifiedEvidenceItem {
  id: string;
  type: 'Commit' | 'PR' | 'Issue';
  title: string;
  contributor: string;
  contributorAvatar?: string;
  relatedMilestone: string;
  timestamp: string;
  status: 'Verified' | 'Pending Review' | 'AI-Matched';
  sourceUrl: string;
  sha?: string;
  description?: string;
  changedFilesCount?: number;
  aiRelevanceScore?: number;
  aiConfidence?: 'High' | 'Medium' | 'Low';
  aiExplanation?: string;
  relatedRequirements?: string[];
  rawCommit?: GitHubCommitEvidence;
}

export const EvidencePage: React.FC = () => {
  const navigate = useNavigate();

  // Navigation & UI States
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [createReportModalOpen, setCreateReportModalOpen] = useState(false);
  const [diffModalOpen, setDiffModalOpen] = useState(false);
  const [requirementsListModalOpen, setRequirementsListModalOpen] = useState(false);

  // Data Loading & Live State
  const [, setCommits] = useState<GitHubCommitEvidence[]>([]);
  const [, setPulls] = useState<GitHubPullRequestEvidence[]>([]);
  const [loading, setLoading] = useState(true);

  // SHA copy states
  const [copiedSha, setCopiedSha] = useState<string | null>(null);
  const [, setCopyFailedSha] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Commits' | 'Pull Requests' | 'Issues'>('All');
  const [milestoneFilter, setMilestoneFilter] = useState<string>('Alpha Launch v1.0');
  const [contributorFilter, setContributorFilter] = useState<string>('All');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('This Month');
  const [activeFileTab, setActiveFileTab] = useState(0);

  // Applied Filter Tags (default initialized matching reference image)
  const [appliedFilters, setAppliedFilters] = useState<string[]>(['PRs', 'main', 'Alex']);

  // Selected Evidence Item (default to PR #102 as depicted in reference)
  const [selectedId, setSelectedId] = useState<string>('pr-102');

  // Load telemetry
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cRes, pRes] = await Promise.all([
        devFlowApi.getGitHubCommits(),
        devFlowApi.getGitHubPullRequests(),
      ]);
      setCommits(cRes.data);
      setPulls(pRes.data);
    } catch (err) {
      console.error('Failed to load evidence telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  // Unified Evidence Items (combining reference data and live state)
  const allEvidence: UnifiedEvidenceItem[] = useMemo(() => [
    {
      id: 'commit-1',
      type: 'Commit',
      title: 'Commit message: security: refresh login tokens.',
      contributor: 'Contributor',
      contributorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=faces',
      relatedMilestone: 'Alpha Launch v1.0',
      timestamp: '12 days ago',
      status: 'Verified',
      sourceUrl: 'https://github.com/northstar-studio/payment-gateway/commit/8c92a10',
      sha: '8c92a10d4812f',
      description: 'Rotate cryptographic refresh tokens and invalidate stale session cookies on logout.',
      changedFilesCount: 4,
      aiRelevanceScore: 96,
      aiConfidence: 'High',
      aiExplanation: 'AST proofs confirm cryptographic signature enforcement across token renewal endpoints.',
      relatedRequirements: ['Req 1.1: Secure Login', 'Req 1.4: Session Revocation'],
    },
    {
      id: 'pr-101',
      type: 'PR',
      title: 'PR #102: Implemented Update',
      contributor: 'Alex Morgan',
      contributorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&crop=faces',
      relatedMilestone: 'Alpha Launch v1.0',
      timestamp: '12 days ago',
      status: 'Pending Review',
      sourceUrl: 'https://github.com/northstar-studio/payment-gateway/pull/101',
      sha: '3e41b99a81cc',
      description: 'Incremental bugfixes and UI adjustments for authentication modal transitions.',
      changedFilesCount: 6,
      aiRelevanceScore: 84,
      aiConfidence: 'Medium',
      aiExplanation: 'Modifies client-side form controls and validation states.',
      relatedRequirements: ['Req 2.1: Input Validation'],
    },
    {
      id: 'pr-102',
      type: 'PR',
      title: 'PR #102: Implemented OAuth2 flow',
      contributor: 'Alex Morgan',
      contributorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&crop=faces',
      relatedMilestone: 'Alpha Launch v1.0',
      timestamp: '13 days ago',
      status: 'AI-Matched',
      sourceUrl: 'https://github.com/northstar-studio/payment-gateway/pull/102',
      sha: '7b91d4e231fa',
      description: 'Implement secure OAuth2 login flow with refresh tokens.',
      changedFilesCount: 12,
      aiRelevanceScore: 98,
      aiConfidence: 'High',
      aiExplanation: 'Code changes directly address secure login requirement.',
      relatedRequirements: ['Req 1.1: Secure Login', 'Req 1.2: OAuth Providers', 'Req 1.3: Token Rotation'],
    },
    {
      id: 'pr-102-dup1',
      type: 'PR',
      title: 'PR #102: Implemented OAuth2 flow',
      contributor: 'Alex Morgan',
      contributorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&crop=faces',
      relatedMilestone: 'Alpha Launch v1.0',
      timestamp: '12 days ago',
      status: 'AI-Matched',
      sourceUrl: 'https://github.com/northstar-studio/payment-gateway/pull/102',
      sha: '9f24c01e6a88',
      description: 'Implement secure OAuth2 login flow with refresh tokens (Branch patch).',
      changedFilesCount: 12,
      aiRelevanceScore: 98,
      aiConfidence: 'High',
      aiExplanation: 'Code changes directly address secure login requirement.',
      relatedRequirements: ['Req 1.1: Secure Login'],
    },
    {
      id: 'pr-102-v',
      type: 'PR',
      title: 'PR #102: Implemented OAuth2 flow v...',
      contributor: 'Alex Morgan',
      contributorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&crop=faces',
      relatedMilestone: 'Alpha Launch v1.0',
      timestamp: '13 days ago',
      status: 'AI-Matched',
      sourceUrl: 'https://github.com/northstar-studio/payment-gateway/pull/102',
      sha: '1a54b321c7d0',
      description: 'Integration test suite for OAuth2 authorization code grant.',
      changedFilesCount: 8,
      aiRelevanceScore: 94,
      aiConfidence: 'High',
      aiExplanation: 'Adds unit tests validating token expiry and signature verification.',
      relatedRequirements: ['Req 1.1: Secure Login'],
    },
    {
      id: 'pr-102-dup2',
      type: 'PR',
      title: 'PR #102: Implemented OAuth2 flow',
      contributor: 'Alex Morgan',
      contributorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&crop=faces',
      relatedMilestone: 'Alpha Launch v1.0',
      timestamp: '13 days ago',
      status: 'AI-Matched',
      sourceUrl: 'https://github.com/northstar-studio/payment-gateway/pull/102',
      sha: '5c20d189ef94',
      description: 'Configuration parameters for GitHub and Google client IDs.',
      changedFilesCount: 3,
      aiRelevanceScore: 91,
      aiConfidence: 'High',
      aiExplanation: 'Verified environment variables and callback routes.',
      relatedRequirements: ['Req 1.1: Secure Login'],
    },
    {
      id: 'pr-102-dup3',
      type: 'PR',
      title: 'PR #102: Implemented OAuth2 flow',
      contributor: 'Alex Morgan',
      contributorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&crop=faces',
      relatedMilestone: 'Alpha Launch v1.0',
      timestamp: '12 days ago',
      status: 'AI-Matched',
      sourceUrl: 'https://github.com/northstar-studio/payment-gateway/pull/102',
      sha: '4d87e120bc91',
      description: 'Implements rate limiter on auth token exchange routes.',
      changedFilesCount: 5,
      aiRelevanceScore: 89,
      aiConfidence: 'Medium',
      aiExplanation: 'Security hardening for OAuth token grant endpoints.',
      relatedRequirements: ['Req 1.1: Secure Login'],
    },
    {
      id: 'pr-102-u',
      type: 'PR',
      title: 'PR #102: Implemented OAuth2 flow u...',
      contributor: 'Alex Morgan',
      contributorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&crop=faces',
      relatedMilestone: 'Alpha Launch v1.0',
      timestamp: '13 days ago',
      status: 'AI-Matched',
      sourceUrl: 'https://github.com/northstar-studio/payment-gateway/pull/102',
      sha: '6e19f443ad20',
      description: 'User profile mapping for third-party OAuth provider payloads.',
      changedFilesCount: 7,
      aiRelevanceScore: 93,
      aiConfidence: 'High',
      aiExplanation: 'Maps external avatar and email claims to internal user profiles.',
      relatedRequirements: ['Req 2.3: User Profile'],
    },
    {
      id: 'pr-102-dup4',
      type: 'PR',
      title: 'PR #102: Implemented OAuth2 flow',
      contributor: 'Alex Morgan',
      contributorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&crop=faces',
      relatedMilestone: 'Alpha Launch v1.0',
      timestamp: '13 days ago',
      status: 'AI-Matched',
      sourceUrl: 'https://github.com/northstar-studio/payment-gateway/pull/102',
      sha: '2b77a904fe11',
      description: 'Added documentation and OpenAPI spec for OAuth routes.',
      changedFilesCount: 2,
      aiRelevanceScore: 88,
      aiConfidence: 'Medium',
      aiExplanation: 'Swagger documentation and API contract schemas.',
      relatedRequirements: ['Req 1.1: Secure Login'],
    },
    {
      id: 'pr-102-dup5',
      type: 'PR',
      title: 'PR #102: Implemented OAuth2 flow',
      contributor: 'Alex Morgan',
      contributorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&crop=faces',
      relatedMilestone: 'Alpha Launch v1.0',
      timestamp: '13 days ago',
      status: 'AI-Matched',
      sourceUrl: 'https://github.com/northstar-studio/payment-gateway/pull/102',
      sha: '8a12c984de33',
      description: 'End-to-end Cypress test flow verifying login redirect.',
      changedFilesCount: 4,
      aiRelevanceScore: 95,
      aiConfidence: 'High',
      aiExplanation: 'Automated browser test confirms login redirect and JWT cookie receipt.',
      relatedRequirements: ['Req 1.1: Secure Login'],
    },
  ], []);

  // Filter evidence based on active filters
  const filteredEvidence = useMemo(() => {
    return allEvidence.filter((item) => {
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          item.title.toLowerCase().includes(q) ||
          item.contributor.toLowerCase().includes(q) ||
          item.status.toLowerCase().includes(q) ||
          (item.sha && item.sha.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // Type filter
      if (typeFilter === 'Commits' && item.type !== 'Commit') return false;
      if (typeFilter === 'Pull Requests' && item.type !== 'PR') return false;
      if (typeFilter === 'Issues' && item.type !== 'Issue') return false;

      // Milestone filter
      if (milestoneFilter !== 'All' && item.relatedMilestone !== milestoneFilter) return false;

      // Contributor filter
      if (contributorFilter !== 'All' && item.contributor !== contributorFilter) return false;

      return true;
    });
  }, [allEvidence, searchQuery, typeFilter, milestoneFilter, contributorFilter]);

  // Selected item reference
  const selectedItem = useMemo(() => {
    return (
      allEvidence.find((item) => item.id === selectedId) ||
      allEvidence[2] || // fallback to PR #102
      allEvidence[0]
    );
  }, [allEvidence, selectedId]);

  // Dummy changed file diff payload for detail / view diff modal
  const sampleDiffFile: ChangedFile = useMemo(() => ({
    filename: 'src/modules/auth/oauth2.provider.ts',
    additions: 44,
    deletions: 12,
    diff: [
      { type: 'header', content: '@@ -14,18 +14,50 @@ export class OAuth2Service {' },
      { type: 'context', content: '  private clientId: string;', lineNumber: 14 },
      { type: 'context', content: '  private clientSecret: string;', lineNumber: 15 },
      { type: 'removed', content: '-   // Legacy basic authentication header', lineNumber: 16 },
      { type: 'removed', content: '-   return basicAuthToken(user, pass);', lineNumber: 17 },
      { type: 'added', content: '+   // Secure OAuth2 PKCE authorization flow with rotating refresh token', lineNumber: 16 },
      { type: 'added', content: '+   const codeVerifier = generateCodeVerifier();', lineNumber: 17 },
      { type: 'added', content: '+   const codeChallenge = await sha256(codeVerifier);', lineNumber: 18 },
      { type: 'added', content: '+   const tokens = await exchangeAuthCode(authCode, codeVerifier);', lineNumber: 19 },
      { type: 'added', content: '+   await this.sessionService.bindRefreshToken(tokens.refreshToken);', lineNumber: 20 },
      { type: 'added', content: '+   return tokens.accessToken;', lineNumber: 21 },
      { type: 'context', content: '  }', lineNumber: 22 },
    ],
  }), []);

  // Copy SHA handler with fallback
  const handleCopySha = async (sha: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(sha);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = sha;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedSha(sha);
      setCopyFailedSha(null);
      setTimeout(() => setCopiedSha(null), 2000);
    } catch {
      setCopyFailedSha(sha);
      setTimeout(() => setCopyFailedSha(null), 2500);
    }
  };

  const removeAppliedFilter = (filter: string) => {
    setAppliedFilters(appliedFilters.filter((f) => f !== filter));
  };

  return (
    <div className="fixed inset-0 z-30 flex bg-[#080D18] text-[#F8FAFC] font-sans antialiased overflow-hidden select-none">
      {/* 1. FIXED DARK ENTERPRISE SIDEBAR */}
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

          {/* Navigation Items */}
          <div className="space-y-1.5 text-xs">
            <button
              onClick={() => {
                setMobileSidebarOpen(false);
                navigate('/dashboard');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#152238] transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-slate-400" />
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

            {/* Evidence Active Pill */}
            <button
              onClick={() => {
                setMobileSidebarOpen(false);
                navigate('/evidence');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#2563EB] text-white font-semibold shadow-md shadow-blue-600/30"
            >
              <FileText className="w-4 h-4 text-white" />
              <span>Evidence</span>
            </button>

            <button
              onClick={() => {
                setMobileSidebarOpen(false);
                setCreateReportModalOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#152238] transition-colors"
            >
              <ListChecks className="w-4 h-4 text-slate-400" />
              <span>Reports</span>
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

            <button
              onClick={() => {
                setMobileSidebarOpen(false);
                navigate('/settings');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#152238] transition-colors"
            >
              <Sliders className="w-4 h-4 text-slate-400" />
              <span>Integrations</span>
            </button>
          </div>

          {/* Linked Repositories */}
          <div className="pt-4 border-t border-[#26344B]/60 space-y-2">
            <span className="px-3 text-[10px] font-bold tracking-wider uppercase text-slate-400 block">
              Linked Repositories
            </span>
            <div className="px-3">
              <a
                href="https://github.com/northstar-studio/payment-gateway"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#152238] hover:bg-[#1B2D4F] border border-[#26344B] text-xs text-slate-200 font-medium transition-colors group"
              >
                <GitHubIcon className="w-4 h-4 text-slate-300 group-hover:text-white" />
                <span className="truncate">Payment Gateway Integration</span>
              </a>
            </div>
          </div>
        </div>

        {/* Sidebar Bottom Nav User Profile */}
        <div className="p-3 border-t border-[#26344B] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <img
              src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&crop=faces"
              alt="Alex Morgan"
              className="w-7 h-7 rounded-full object-cover ring-1 ring-blue-500/40"
            />
            <span className="font-semibold text-slate-200">Alex Morgan</span>
          </div>
          <button
            onClick={() => navigate('/')}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#152238] transition-colors"
            title="Logout / Exit to Landing"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* 2. MAIN CONTENT VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* PHASE 1: PAGE HEADER */}
        <header className="h-16 px-4 sm:px-8 border-b border-[#26344B] bg-[#0A101D] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-[#152238] rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-none">
                Evidence Explorer
              </h1>
              <p className="text-xs text-slate-400 mt-1 hidden sm:block">
                Explore development activity and connect proof of work to project milestones.
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            {/* Header Search Input */}
            <div className="relative hidden md:block w-48 lg:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#111C30] text-xs text-white placeholder-slate-400 pl-8 pr-3 py-1.5 rounded-lg border border-[#26344B] focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Help Button */}
            <button
              onClick={() => setHelpModalOpen(true)}
              className="p-2 text-slate-300 hover:text-white hover:bg-[#152238] rounded-lg transition-colors"
              title="Evidence Guide"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 text-slate-300 hover:text-white hover:bg-[#152238] rounded-lg relative transition-colors"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#0A101D]" />
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-[#111C30] border border-[#26344B] rounded-xl shadow-2xl p-3 z-50 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-[#26344B] pb-2 font-bold text-white">
                    <span>Evidence Telemetry Alerts</span>
                    <button
                      onClick={() => setNotificationsOpen(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="p-2 rounded-lg bg-[#152238] text-[11px] text-slate-300">
                    <span className="font-semibold text-blue-400">PR #102</span> matched to Requirement 1.1 with 98% confidence.
                  </div>
                  <div className="p-2 rounded-lg bg-[#152238] text-[11px] text-slate-300">
                    <span className="font-semibold text-emerald-400">Commit 8c92a10</span> verified against OAuth rotation spec.
                  </div>
                </div>
              )}
            </div>

            {/* Create Report Button */}
            <button
              onClick={() => setCreateReportModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-semibold shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Create Report</span>
            </button>
          </div>
        </header>

        {/* Scrollable Dashboard Body */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-5 space-y-5">
          {/* TOP SPLIT: REPOSITORY OVERVIEW (LEFT) + EVIDENCE SUMMARY (RIGHT) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* PHASE 2: REPOSITORY OVERVIEW CARD (5 COLS) */}
            <div className="lg:col-span-5 rounded-xl bg-[#111C30] border border-[#26344B] p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between pb-3 border-b border-[#26344B]/60">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  REPOSITORY OVERVIEW
                </span>
                <GitHubIcon className="w-4 h-4 text-slate-400" />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 block">Connected Repository</span>
                  <a
                    href="https://github.com/northstar-studio/payment-gateway"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-white hover:text-blue-400 transition-colors truncate block"
                  >
                    northstar-studio/payment-gateway
                  </a>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Last Synchronization</span>
                  <span className="font-semibold text-white">2 mins ago</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Branch</span>
                  <span className="font-mono text-xs font-semibold text-blue-400 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-500/30 inline-block mt-0.5">
                    main
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Connection Status</span>
                  <span className="flex items-center gap-1.5 font-semibold text-emerald-400 mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Connected
                  </span>
                </div>
              </div>
            </div>

            {/* PHASE 3: EVIDENCE SUMMARY CARD (7 COLS) */}
            <div className="lg:col-span-7 rounded-xl bg-[#111C30] border border-[#26344B] p-4 flex flex-col justify-between">
              <div className="pb-3 border-b border-[#26344B]/60 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  EVIDENCE SUMMARY
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Sample Telemetry</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                {/* 1. Total Commits */}
                <div className="p-3 rounded-lg bg-[#0C1524] border border-[#26344B] space-y-1">
                  <div className="flex items-center gap-1.5 text-blue-400">
                    <GitCommit className="w-3.5 h-3.5" />
                    <span className="text-[10px] text-slate-400 font-medium">Total Commits</span>
                  </div>
                  <div className="text-xl font-bold text-white font-mono">142</div>
                </div>

                {/* 2. Pull Requests */}
                <div className="p-3 rounded-lg bg-[#0C1524] border border-[#26344B] space-y-1">
                  <div className="flex items-center gap-1.5 text-indigo-400">
                    <GitPullRequest className="w-3.5 h-3.5" />
                    <span className="text-[10px] text-slate-400 font-medium">Pull Requests</span>
                  </div>
                  <div className="text-xl font-bold text-white font-mono">28</div>
                </div>

                {/* 3. Issues */}
                <div className="p-3 rounded-lg bg-[#0C1524] border border-[#26344B] space-y-1">
                  <div className="flex items-center gap-1.5 text-cyan-400">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span className="text-[10px] text-slate-400 font-medium">Issues</span>
                  </div>
                  <div className="text-xl font-bold text-white font-mono">17</div>
                </div>

                {/* 4. Linked Milestone Requirements */}
                <div className="p-3 rounded-lg bg-[#0C1524] border border-[#26344B] space-y-1.5">
                  <div className="flex items-center gap-1 text-emerald-400">
                    <ListChecks className="w-3.5 h-3.5" />
                    <span className="text-[10px] text-slate-400 font-medium truncate">Linked Req.</span>
                  </div>
                  <div className="text-xl font-bold text-white font-mono">7/11</div>
                  <div className="w-full bg-[#152238] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#2563EB] h-full rounded-full" style={{ width: '64%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PHASE 4: EVIDENCE FILTERS TOOLBAR */}
          <div className="rounded-xl bg-[#111C30] border border-[#26344B] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                EVIDENCE FILTERS
              </span>
              {(searchQuery || typeFilter !== 'All' || appliedFilters.length > 0) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setTypeFilter('All');
                    setContributorFilter('All');
                    setAppliedFilters([]);
                  }}
                  className="text-[11px] text-blue-400 hover:text-white transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search Evidence input */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search Evidence..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0C1524] text-xs text-white placeholder-slate-400 pl-8 pr-3 py-2 rounded-lg border border-[#26344B] focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Type Dropdown */}
              <div className="min-w-[130px]">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="w-full bg-[#0C1524] text-xs text-slate-200 px-3 py-2 rounded-lg border border-[#26344B] focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="All">Type: All</option>
                  <option value="Commits">Commits</option>
                  <option value="Pull Requests">Pull Requests</option>
                  <option value="Issues">Issues</option>
                </select>
              </div>

              {/* Milestone Dropdown */}
              <div className="min-w-[160px]">
                <select
                  value={milestoneFilter}
                  onChange={(e) => setMilestoneFilter(e.target.value)}
                  className="w-full bg-[#0C1524] text-xs text-slate-200 px-3 py-2 rounded-lg border border-[#26344B] focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="Alpha Launch v1.0">Alpha Launch v1.0</option>
                  <option value="V1.1 Release">V1.1 Release</option>
                  <option value="V1.2 Scaling">V1.2 Scaling</option>
                  <option value="All">All Milestones</option>
                </select>
              </div>

              {/* Contributor Dropdown */}
              <div className="min-w-[120px]">
                <select
                  value={contributorFilter}
                  onChange={(e) => setContributorFilter(e.target.value)}
                  className="w-full bg-[#0C1524] text-xs text-slate-200 px-3 py-2 rounded-lg border border-[#26344B] focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="All">Contributor: All</option>
                  <option value="Alex Morgan">Alex Morgan</option>
                  <option value="Contributor">Contributor</option>
                </select>
              </div>

              {/* Date Range Dropdown */}
              <div className="min-w-[130px]">
                <select
                  value={dateRangeFilter}
                  onChange={(e) => setDateRangeFilter(e.target.value)}
                  className="w-full bg-[#0C1524] text-xs text-slate-200 px-3 py-2 rounded-lg border border-[#26344B] focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="This Month">This Month</option>
                  <option value="Last 14 Days">Last 14 Days</option>
                  <option value="All Time">All Time</option>
                </select>
              </div>

              {/* Applied Filters Section */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-400 font-semibold uppercase mr-1">
                  Applied Filters
                </span>
                {appliedFilters.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#1B2A47] border border-blue-500/40 text-[11px] text-blue-200 font-medium"
                  >
                    <span>{tag}</span>
                    <button
                      onClick={() => removeAppliedFilter(tag)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* LOWER SPLIT: EVIDENCE TABLE (LEFT) + EVIDENCE DETAIL & MILESTONE MAPPING (RIGHT) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* PHASE 5: EVIDENCE TABLE (LEFT 8 COLS) */}
            <div className="lg:col-span-8 rounded-xl bg-[#111C30] border border-[#26344B] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#26344B] flex items-center justify-between bg-[#0C1524]">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  EVIDENCE TABLE
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Showing {filteredEvidence.length} items
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#26344B] text-[10px] text-slate-400 uppercase tracking-wider bg-[#0C1524]/60">
                      <th className="py-2.5 px-3 font-semibold">Type</th>
                      <th className="py-2.5 px-3 font-semibold">Title/Commit Message</th>
                      <th className="py-2.5 px-3 font-semibold">Contributor</th>
                      <th className="py-2.5 px-3 font-semibold">Related Milestone</th>
                      <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                      <th className="py-2.5 px-3 font-semibold">Evidence Status</th>
                      <th className="py-2.5 px-3 font-semibold text-center">GitHub Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#26344B]/40">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                          <RotateCw className="w-4 h-4 animate-spin mx-auto mb-2 text-blue-400" />
                          Loading Evidence Telemetry...
                        </td>
                      </tr>
                    ) : filteredEvidence.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                          No evidence items match the filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredEvidence.map((row) => {
                        const isSelected = row.id === selectedId;
                        return (
                          <tr
                            key={row.id}
                            onClick={() => setSelectedId(row.id)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-[#182C4E] border-l-4 border-l-[#2563EB] text-white'
                                : 'hover:bg-[#152238]/60 text-slate-300'
                            }`}
                          >
                            {/* Type */}
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="flex items-center gap-1.5 font-medium text-xs">
                                {row.type === 'Commit' ? (
                                  <GitCommit className="w-3.5 h-3.5 text-blue-400" />
                                ) : (
                                  <GitPullRequest className="w-3.5 h-3.5 text-indigo-400" />
                                )}
                                <span>{row.type}</span>
                              </span>
                            </td>

                            {/* Title/Commit Message */}
                            <td className="py-2.5 px-3 max-w-[240px] truncate font-medium">
                              <span className={isSelected ? 'text-white' : 'text-slate-200'}>
                                {row.title}
                              </span>
                            </td>

                            {/* Contributor */}
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <img
                                  src={
                                    row.contributorAvatar ||
                                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&crop=faces'
                                  }
                                  alt={row.contributor}
                                  className="w-5 h-5 rounded-full object-cover"
                                />
                                <span className="text-xs text-slate-300">{row.contributor}</span>
                              </div>
                            </td>

                            {/* Related Milestone */}
                            <td className="py-2.5 px-3 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                              {row.relatedMilestone}
                            </td>

                            {/* Timestamp */}
                            <td className="py-2.5 px-3 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                              {row.timestamp}
                            </td>

                            {/* Evidence Status */}
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                  row.status === 'Verified'
                                    ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-500/30'
                                    : row.status === 'Pending Review'
                                    ? 'bg-amber-950/70 text-amber-400 border border-amber-500/30'
                                    : 'bg-blue-950/70 text-blue-400 border border-blue-500/30'
                                }`}
                              >
                                {row.status}
                              </span>
                            </td>

                            {/* GitHub Source Link */}
                            <td className="py-2.5 px-3 whitespace-nowrap text-center">
                              <a
                                href={row.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex p-1 rounded-md text-slate-400 hover:text-white hover:bg-[#1E2E4E] transition-colors"
                                title="Open Source Link on GitHub"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="p-3 bg-[#0C1524] border-t border-[#26344B] flex items-center justify-between text-[11px] text-slate-400">
                <span>Selected: {selectedItem.title}</span>
                {selectedItem.sha && (
                  <button
                    onClick={() => handleCopySha(selectedItem.sha!)}
                    className="flex items-center gap-1.5 text-blue-400 hover:text-white font-mono"
                  >
                    {copiedSha === selectedItem.sha ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">SHA Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy SHA: {selectedItem.sha.substring(0, 7)}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* RIGHT 4 COLS: EVIDENCE DETAIL & MILESTONE MAPPING */}
            <div className="lg:col-span-4 space-y-5">
              {/* PHASE 6: EVIDENCE DETAIL CARD */}
              <div className="rounded-xl bg-[#111C30] border border-[#26344B] p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#26344B]/60">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    EVIDENCE DETAIL
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {selectedItem.type}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  {/* PR / Evidence Title */}
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">PR Title</span>
                    <span className="font-bold text-white text-sm leading-snug block mt-0.5">
                      {selectedItem.title}
                    </span>
                  </div>

                  {/* Description */}
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Description</span>
                    <p className="text-slate-300 text-xs leading-relaxed mt-0.5">
                      {selectedItem.description || 'Implement secure OAuth2 login flow with refresh tokens.'}
                    </p>
                  </div>

                  {/* Changed Files & View Diff Link */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#26344B]/40">
                    <span className="text-slate-400 text-xs">
                      Changed Files:{' '}
                      <strong className="text-white font-mono">
                        {selectedItem.changedFilesCount || 12}
                      </strong>
                    </span>
                    <button
                      onClick={() => setDiffModalOpen(true)}
                      className="text-xs font-semibold text-blue-400 hover:text-white transition-colors"
                    >
                      (View Diff)
                    </button>
                  </div>

                  {/* Related Requirements */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#26344B]/40">
                    <span className="text-slate-400 text-xs">
                      Related Requirements:{' '}
                      <strong className="text-white font-mono">
                        {selectedItem.relatedRequirements?.length || 3}
                      </strong>
                    </span>
                    <button
                      onClick={() => setRequirementsListModalOpen(true)}
                      className="text-xs font-semibold text-blue-400 hover:text-white transition-colors"
                    >
                      (List)
                    </button>
                  </div>

                  {/* AI Relevance Assessment */}
                  <div className="pt-1 border-t border-[#26344B]/40 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-xs">AI Relevance Assessment:</span>
                      <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                        <span>{selectedItem.aiRelevanceScore || 98}%</span>
                        <span className="text-[10px] bg-emerald-950/70 border border-emerald-500/40 px-1.5 py-0.2 rounded">
                          {selectedItem.aiConfidence || 'High'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Explanation */}
                  <div className="p-2.5 rounded-lg bg-[#0C1524] border border-[#26344B] text-[11px] text-slate-300 leading-relaxed">
                    <span className="font-semibold text-slate-400 block mb-0.5">Explanation:</span>
                    <span>
                      {selectedItem.aiExplanation ||
                        'Code changes directly address secure login requirement.'}
                    </span>
                  </div>

                  {/* Source Link */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-400 text-xs">Source Link</span>
                    <a
                      href={selectedItem.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-white transition-colors font-semibold"
                    >
                      <span>view on GitHub</span>
                      <GitHubIcon className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* PHASE 7: MILESTONE MAPPING CARD */}
              <div className="rounded-xl bg-[#111C30] border border-[#26344B] p-4 space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between pb-2 border-b border-[#26344B]/60">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    MILESTONE MAPPING
                  </span>
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                </div>

                <div className="space-y-3 text-xs">
                  {/* Item 1 */}
                  <div className="p-2.5 rounded-lg bg-[#0C1524] border border-[#26344B] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">Requirement 1.1</span>
                      <span className="text-[10px] font-bold bg-emerald-950/70 text-emerald-400 border border-emerald-500/30 px-2 py-0.2 rounded">
                        Verified
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-xs">Secure Login - Implemented</span>
                      <button
                        onClick={() => setSelectedId('pr-102')}
                        className="text-[11px] text-blue-400 hover:text-white font-semibold transition-colors"
                      >
                        Link PR #102
                      </button>
                    </div>
                  </div>

                  {/* Item 2 */}
                  <div className="p-2.5 rounded-lg bg-[#0C1524] border border-[#26344B] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">Requirement 2.3</span>
                      <span className="text-[10px] font-bold bg-amber-950/70 text-amber-400 border border-amber-500/30 px-2 py-0.2 rounded">
                        Partially Met
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-xs">User Profile - Partially Met</span>
                      <button
                        onClick={() => setSelectedId('commit-1')}
                        className="text-[11px] text-blue-400 hover:text-white font-semibold transition-colors"
                      >
                        Link Issue #45, Commits
                      </button>
                    </div>
                  </div>
                </div>

                {/* Decorative Sparkle Graphic from visual reference */}
                <div className="absolute top-1 right-2 opacity-25 pointer-events-none">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="text-blue-300">
                    <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* MODAL 1: VIEW DIFF MODAL */}
      {diffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-3xl rounded-2xl bg-[#111C30] border border-[#26344B] shadow-2xl p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-[#26344B] pb-3">
              <div className="flex items-center gap-2.5">
                <FileCode className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-sm font-bold text-white truncate max-w-md">
                    Code Diff: {selectedItem.title}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    SHA: {selectedItem.sha || '8c92a10d4812f'} &bull; Branch: main
                  </span>
                </div>
              </div>
              <button
                onClick={() => setDiffModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1E2E4E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Changed Files Tabs */}
            <div className="flex items-center gap-2 border-b border-[#26344B] pb-2 text-xs overflow-x-auto">
              <button
                onClick={() => setActiveFileTab(0)}
                className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-colors ${
                  activeFileTab === 0
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-[#152238] text-slate-300 hover:bg-[#1E2E4E]'
                }`}
              >
                oauth2.provider.ts (+44, -12)
              </button>
              <button
                onClick={() => setActiveFileTab(1)}
                className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-colors ${
                  activeFileTab === 1
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-[#152238] text-slate-300 hover:bg-[#1E2E4E]'
                }`}
              >
                session.service.ts (+28, -4)
              </button>
            </div>

            {/* Diff Lines Table */}
            <DarkDiffViewer file={sampleDiffFile} />

            <div className="pt-2 flex justify-between items-center border-t border-[#26344B]">
              <a
                href={selectedItem.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-400 hover:text-white flex items-center gap-1 font-semibold"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Full Diff on GitHub
              </a>
              <button
                onClick={() => setDiffModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-semibold"
              >
                Close Diff Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: RELATED REQUIREMENTS LIST */}
      {requirementsListModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-[#111C30] border border-[#26344B] shadow-2xl p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-[#26344B] pb-3">
              <h3 className="text-sm font-bold text-white">Related Milestone Requirements</h3>
              <button
                onClick={() => setRequirementsListModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1E2E4E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              {(selectedItem.relatedRequirements || [
                'Req 1.1: Secure Login',
                'Req 1.2: OAuth Providers',
                'Req 1.3: Token Rotation',
              ]).map((req, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-[#0C1524] border border-[#26344B] flex items-center justify-between"
                >
                  <span className="font-medium text-slate-200">{req}</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setRequirementsListModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CREATE REPORT WORKFLOW */}
      {createReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-[#111C30] border border-[#26344B] shadow-2xl p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-[#26344B] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Generate Evidence Audit Report</h3>
              </div>
              <button
                onClick={() => setCreateReportModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1E2E4E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                Compiles cryptographic commit proofs, AST diff validations, and pull request approvals into a signed deliverable audit summary for client review.
              </p>
              <div className="p-3 rounded-xl bg-[#0C1524] border border-[#26344B] space-y-2">
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Scope:</span>
                  <strong className="text-white">Alpha Launch v1.0 (7 of 11 Requirements Met)</strong>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Repository:</span>
                  <strong className="text-white font-mono">northstar-studio/payment-gateway</strong>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Auditor Engine:</span>
                  <strong className="text-blue-400">Gemini 2.5 Flash + AST Parser</strong>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#26344B]">
              <button
                onClick={() => setCreateReportModalOpen(false)}
                className="px-3.5 py-2 rounded-lg bg-[#152238] hover:bg-[#1E2E4E] text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setCreateReportModalOpen(false);
                  window.print();
                }}
                className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Audit Summary</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: HELP GUIDE */}
      {helpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-[#111C30] border border-[#26344B] shadow-2xl p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-[#26344B] pb-3">
              <h3 className="text-sm font-bold text-white">Evidence Explorer Guide</h3>
              <button
                onClick={() => setHelpModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1E2E4E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                The DevFlow Evidence Explorer provides transparent cryptographic verification linking git pull requests, commits, and diffs to agreement milestone requirements.
              </p>
              <div className="p-3 rounded-xl bg-[#0C1524] border border-[#26344B] space-y-1">
                <span className="font-bold text-white block">Status Badges:</span>
                <ul className="space-y-1 text-slate-400 text-[11px]">
                  <li><strong className="text-emerald-400">Verified:</strong> AST syntax diff explicitly satisfies acceptance criteria.</li>
                  <li><strong className="text-blue-400">AI-Matched:</strong> AI semantic intelligence mapped the PR to milestone scope.</li>
                  <li><strong className="text-amber-400">Pending Review:</strong> Code changes committed but awaiting human approval.</li>
                </ul>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setHelpModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-semibold"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
