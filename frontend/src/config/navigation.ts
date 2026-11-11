import {
  LayoutDashboard,
  FolderGit2,
  CheckCircle2,
  ListChecks,
  Sparkles,
  FileCode,
  ShieldCheck,
  FileText,
  CreditCard,
  Bell,
  Zap,
  Settings,
  LucideIcon,
} from 'lucide-react';
import { EffectiveRole } from '@/types';

export interface NavItemConfig {
  id: string;
  name: string;
  path: string;
  matchPath: string;
  matchQuery?: string;
  icon: LucideIcon;
  iconColor: string;
  description?: string;
  allowedRoles: EffectiveRole[];
}

export interface NavGroupConfig {
  title: string;
  items: NavItemConfig[];
}

const ALL_CLIENT_GROUPS: NavGroupConfig[] = [
  {
    title: 'WORKSPACE',
    items: [
      {
        id: 'dashboard',
        name: 'Dashboard',
        path: '/dashboard',
        matchPath: '/dashboard',
        icon: LayoutDashboard,
        iconColor: 'text-[#2563EB]',
        description: 'Client overview, milestone progress and escrow telemetry',
        allowedRoles: ['CLIENT', 'DEVELOPER'],
      },
      {
        id: 'projects',
        name: 'Projects',
        path: '/projects',
        matchPath: '/projects',
        icon: FolderGit2,
        iconColor: 'text-[#2563EB]',
        description: 'Active contracts, assigned teams and budget scopes',
        allowedRoles: ['CLIENT', 'DEVELOPER'],
      },
      {
        id: 'milestones',
        name: 'Milestones',
        path: '/milestones',
        matchPath: '/milestones',
        icon: CheckCircle2,
        iconColor: 'text-[#2563EB]',
        description: 'Define acceptance criteria and review deliverables',
        allowedRoles: ['CLIENT', 'DEVELOPER'],
      },
    ],
  },
  {
    title: 'VERIFICATION',
    items: [
      {
        id: 'evidence-review',
        name: 'Evidence Review',
        path: '/evidence',
        matchPath: '/evidence',
        icon: FileCode,
        iconColor: 'text-sky-400',
        description: 'Inspect submitted commits, pull requests and diffs',
        allowedRoles: ['CLIENT', 'DEVELOPER'],
      },
      {
        id: 'approvals',
        name: 'Approvals',
        path: '/milestone-verification',
        matchPath: '/milestone-verification',
        icon: ShieldCheck,
        iconColor: 'text-emerald-400',
        description: 'Human-in-the-loop milestone review and client sign-off',
        allowedRoles: ['CLIENT'],
      },
    ],
  },
  {
    title: 'FINANCE',
    items: [
      {
        id: 'invoices',
        name: 'Invoices',
        path: '/invoices',
        matchPath: '/invoices',
        icon: FileText,
        iconColor: 'text-blue-400',
        description: 'Review PayPal invoices and authorize sandbox settlement',
        allowedRoles: ['CLIENT'],
      },
      {
        id: 'payments',
        name: 'Payments',
        path: '/payments',
        matchPath: '/payments',
        icon: CreditCard,
        iconColor: 'text-blue-400',
        description: 'Transaction ledger, settlement history and receipts',
        allowedRoles: ['CLIENT', 'DEVELOPER'],
      },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      {
        id: 'notifications',
        name: 'Notifications',
        path: '/notifications',
        matchPath: '/notifications',
        icon: Bell,
        iconColor: 'text-slate-400',
        description: 'Deliverable alerts, approvals and webhook updates',
        allowedRoles: ['CLIENT', 'DEVELOPER'],
      },
      {
        id: 'settings',
        name: 'Settings',
        path: '/settings',
        matchPath: '/settings',
        icon: Settings,
        iconColor: 'text-slate-400',
        description: 'Workspace preferences and security controls',
        allowedRoles: ['CLIENT', 'DEVELOPER'],
      },
    ],
  },
];

const ALL_DEVELOPER_GROUPS: NavGroupConfig[] = [
  {
    title: 'WORKSPACE',
    items: [
      {
        id: 'dashboard',
        name: 'Dashboard',
        path: '/dashboard',
        matchPath: '/dashboard',
        icon: LayoutDashboard,
        iconColor: 'text-violet-400',
        description: 'Developer telemetry, verification confidence and payouts',
        allowedRoles: ['CLIENT', 'DEVELOPER'],
      },
      {
        id: 'projects',
        name: 'Projects',
        path: '/projects',
        matchPath: '/projects',
        icon: FolderGit2,
        iconColor: 'text-violet-400',
        description: 'Connected repositories and active milestone scopes',
        allowedRoles: ['CLIENT', 'DEVELOPER'],
      },
      {
        id: 'milestones',
        name: 'Milestones',
        path: '/milestones',
        matchPath: '/milestones',
        icon: CheckCircle2,
        iconColor: 'text-violet-400',
        description: 'Milestone criteria, deadlines and progress tracking',
        allowedRoles: ['CLIENT', 'DEVELOPER'],
      },
      {
        id: 'deliverables',
        name: 'Deliverables',
        path: '/milestones?view=deliverables',
        matchPath: '/milestones',
        matchQuery: 'view=deliverables',
        icon: ListChecks,
        iconColor: 'text-indigo-400',
        description: 'Submit code deliverables and track client review status',
        allowedRoles: ['DEVELOPER'],
      },
    ],
  },
  {
    title: 'INTELLIGENCE',
    items: [
      {
        id: 'github-evidence',
        name: 'GitHub Evidence',
        path: '/evidence',
        matchPath: '/evidence',
        icon: FileCode,
        iconColor: 'text-slate-300',
        description: 'Commit SHAs, pull request proofs and AST diffs',
        allowedRoles: ['CLIENT', 'DEVELOPER'],
      },
      {
        id: 'ai-verification',
        name: 'AI Verification',
        path: '/verification',
        matchPath: '/verification',
        icon: Sparkles,
        iconColor: 'text-violet-400',
        description: 'Automated requirement verification and AI agent telemetry',
        allowedRoles: ['DEVELOPER'],
      },
    ],
  },
  {
    title: 'FINANCE',
    items: [
      {
        id: 'payment-tracking',
        name: 'Payment Tracking',
        path: '/payments',
        matchPath: '/payments',
        icon: CreditCard,
        iconColor: 'text-emerald-400',
        description: 'Track verified settlements and payout status',
        allowedRoles: ['CLIENT', 'DEVELOPER'],
      },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      {
        id: 'notifications',
        name: 'Notifications',
        path: '/notifications',
        matchPath: '/notifications',
        icon: Bell,
        iconColor: 'text-slate-400',
        description: 'Verification results, review feedback and alerts',
        allowedRoles: ['CLIENT', 'DEVELOPER'],
      },
      {
        id: 'integrations',
        name: 'Integrations',
        path: '/integrations',
        matchPath: '/integrations',
        icon: Zap,
        iconColor: 'text-slate-400',
        description: 'GitHub repositories, webhooks and AI providers',
        allowedRoles: ['DEVELOPER'],
      },
      {
        id: 'settings',
        name: 'Settings',
        path: '/settings',
        matchPath: '/settings',
        icon: Settings,
        iconColor: 'text-slate-400',
        description: 'Developer preferences and account security',
        allowedRoles: ['CLIENT', 'DEVELOPER'],
      },
    ],
  },
];

export function getNavigationForRole(effectiveRole: EffectiveRole | null): NavGroupConfig[] {
  if (effectiveRole === 'CLIENT') {
    return ALL_CLIENT_GROUPS;
  }
  return ALL_DEVELOPER_GROUPS;
}

export const ROUTE_ALLOWED_ROLES: Record<string, EffectiveRole[]> = {
  '/milestone-verification': ['CLIENT'],
  '/invoices': ['CLIENT'],
  '/verification': ['DEVELOPER'],
  '/agents': ['DEVELOPER'],
  '/integrations': ['DEVELOPER'],
};

