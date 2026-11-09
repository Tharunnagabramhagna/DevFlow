import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutDashboard,
  FolderGit2,
  CheckCircle2,
  GitBranch,
  Sparkles,
  CreditCard,
  Settings,
  PlusCircle,
  FileText,
  ExternalLink,
  CornerDownLeft,
} from 'lucide-react';
import { devFlowApi } from '@/services/api';
import { Project, Milestone, PayPalInvoice } from '@/types';
import { cn } from '@/utils/cn';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreateProject?: () => void;
  onOpenCreateMilestone?: () => void;
}

interface CommandItem {
  id: string;
  category: 'Pages' | 'Actions' | 'Projects' | 'Milestones' | 'Invoices';
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: 'lavender' | 'blue' | 'mint' | 'peach' | 'yellow' | 'neutral';
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onOpenCreateProject,
  onOpenCreateMilestone,
}) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [projects, setProjects] = useState<Project[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [invoices, setInvoices] = useState<PayPalInvoice[]>([]);

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        devFlowApi.getProjects(),
        devFlowApi.getMilestones(),
        devFlowApi.getInvoices(),
      ]).then(([pRes, mRes, iRes]) => {
        setProjects(pRes.data);
        setMilestones(mRes.data);
        setInvoices(iRes.data.map((item) => item.invoice));
      });
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Static commands: Pages & Actions
  const staticItems: CommandItem[] = useMemo(
    () => [
      {
        id: 'nav-dashboard',
        category: 'Pages',
        title: 'Dashboard Overview',
        subtitle: 'Telemetry, active pipelines, revenue metrics',
        icon: LayoutDashboard,
        action: () => {
          navigate('/dashboard');
          onClose();
        },
      },
      {
        id: 'nav-projects',
        category: 'Pages',
        title: 'Projects Directory',
        subtitle: 'Inspect repositories, allocations & milestones',
        icon: FolderGit2,
        action: () => {
          navigate('/projects');
          onClose();
        },
      },
      {
        id: 'nav-milestones',
        category: 'Pages',
        title: 'Milestone Deliverables',
        subtitle: 'Review requirements and approval statuses',
        icon: CheckCircle2,
        action: () => {
          navigate('/milestones');
          onClose();
        },
      },
      {
        id: 'nav-evidence',
        category: 'Pages',
        title: 'GitHub Evidence Audit',
        subtitle: 'Verify commit SHAs, PR diffs & author signoffs',
        icon: GitBranch,
        action: () => {
          navigate('/evidence');
          onClose();
        },
      },
      {
        id: 'nav-verification',
        category: 'Pages',
        title: 'AI Verification Intelligence',
        subtitle: 'Explainable requirements validation & code scoring',
        icon: Sparkles,
        badge: 'AI Engine',
        badgeColor: 'lavender',
        action: () => {
          navigate('/verification');
          onClose();
        },
      },
      {
        id: 'nav-payments',
        category: 'Pages',
        title: 'PayPal Invoices & Settlements',
        subtitle: 'Sandbox invoices, checkout simulation & receipts',
        icon: CreditCard,
        badge: 'PayPal',
        badgeColor: 'blue',
        action: () => {
          navigate('/payments');
          onClose();
        },
      },
      {
        id: 'nav-settings',
        category: 'Pages',
        title: 'Platform Settings',
        subtitle: 'API keys, webhook tokens, developer preferences',
        icon: Settings,
        action: () => {
          navigate('/settings');
          onClose();
        },
      },
      {
        id: 'act-new-project',
        category: 'Actions',
        title: 'Create New Project',
        subtitle: 'Register GitHub repo and set milestone budget',
        icon: PlusCircle,
        badge: 'Action',
        badgeColor: 'mint',
        action: () => {
          onClose();
          if (onOpenCreateProject) {
            onOpenCreateProject();
          } else {
            navigate('/projects');
          }
        },
      },
      {
        id: 'act-new-milestone',
        category: 'Actions',
        title: 'Add Deliverable Milestone',
        subtitle: 'Define criteria and set settlement payout',
        icon: PlusCircle,
        badge: 'Action',
        badgeColor: 'yellow',
        action: () => {
          onClose();
          if (onOpenCreateMilestone) {
            onOpenCreateMilestone();
          } else {
            navigate('/milestones');
          }
        },
      },
      {
        id: 'act-sandbox-dash',
        category: 'Actions',
        title: 'Open PayPal Developer Dashboard',
        subtitle: 'External link to PayPal developer portal',
        icon: ExternalLink,
        action: () => {
          window.open('https://developer.paypal.com/dashboard/', '_blank');
          onClose();
        },
      },
    ],
    [navigate, onClose, onOpenCreateProject, onOpenCreateMilestone]
  );

  // Dynamic commands from active data
  const dynamicItems: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [];

    // Projects
    projects.forEach((p) => {
      list.push({
        id: `proj-${p.id}`,
        category: 'Projects',
        title: p.name,
        subtitle: `${p.githubRepo} • $${p.totalBudget.toLocaleString()} ${p.currency}`,
        icon: FolderGit2,
        badge: `${p.completedMilestonesCount}/${p.milestonesCount} done`,
        badgeColor: 'mint',
        action: () => {
          navigate('/projects');
          onClose();
        },
      });
    });

    // Milestones
    milestones.forEach((m) => {
      list.push({
        id: `ms-${m.id}`,
        category: 'Milestones',
        title: m.title,
        subtitle: `Due ${m.dueDate} • $${m.amount.toLocaleString()} ${m.currency}`,
        icon: CheckCircle2,
        badge: m.status.replace('_', ' '),
        badgeColor: m.status === 'paid' ? 'mint' : m.status.includes('ai') ? 'lavender' : 'yellow',
        action: () => {
          navigate('/milestones');
          onClose();
        },
      });
    });

    // Invoices
    invoices.forEach((inv) => {
      list.push({
        id: `inv-${inv.id}`,
        category: 'Invoices',
        title: `Invoice ${inv.invoiceNumber}`,
        subtitle: `Recipient: ${inv.recipientName} • $${inv.amount.toLocaleString()} ${inv.currency}`,
        icon: FileText,
        badge: inv.status,
        badgeColor: inv.status === 'PAID' ? 'mint' : inv.status === 'SENT' ? 'blue' : 'yellow',
        action: () => {
          navigate('/payments');
          onClose();
        },
      });
    });

    return list;
  }, [projects, milestones, invoices, navigate, onClose]);

  const allItems = useMemo(() => [...staticItems, ...dynamicItems], [staticItems, dynamicItems]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return allItems.slice(0, 10);
    const q = query.toLowerCase();
    return allItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q)
    );
  }, [allItems, query]);

  // Keyboard navigation inside list
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#25263A]/40 dark:bg-black/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Palette Container */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-2xl bg-white dark:bg-[#111C30] rounded-2xl shadow-modal-elevated border border-[#E9EAF2] dark:border-[#26344B] z-10 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#E9EAF2] dark:border-[#26344B] bg-white dark:bg-[#111C30]">
          <Search className="w-5 h-5 text-[#777B91] dark:text-slate-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages, projects, milestones, invoices, or actions... (Esc to close)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm sm:text-base text-[#25263A] dark:text-white placeholder-[#9D9EAF] dark:placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-[#777B91] hover:text-[#25263A] dark:hover:text-white px-2 py-1 rounded bg-[#F1F3FA] dark:bg-[#1A253A]"
            >
              Clear
            </button>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2 divide-y divide-transparent">
          {filteredItems.length === 0 ? (
            <div className="text-center py-10 px-4">
              <p className="text-sm font-semibold text-[#25263A] dark:text-white">No matching results found</p>
              <p className="text-xs text-[#777B91] dark:text-slate-400 mt-1">
                Try searching for a different keyword like "payments", "milestone", or a commit SHA.
              </p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    'flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-colors',
                    isSelected
                      ? 'bg-[#EFF6FF] dark:bg-[#1E2E4E] text-[#1D4ED8] dark:text-[#60A5FA]'
                      : 'hover:bg-[#F7F8FC] dark:hover:bg-[#152238] text-[#25263A] dark:text-slate-200'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                        isSelected
                          ? 'bg-[#BFDBFE] dark:bg-blue-900/60 text-[#1D4ED8] dark:text-[#60A5FA]'
                          : 'bg-[#F1F3FA] dark:bg-[#1B2A47] text-[#777B91] dark:text-slate-400'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate leading-tight">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span
                            className={cn(
                              'text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider',
                              item.badgeColor === 'lavender' && 'bg-[#F5F3FF] dark:bg-purple-950/70 text-[#6D28D9] dark:text-purple-300 border border-[#DDD6FE] dark:border-purple-800/60',
                              item.badgeColor === 'blue' && 'bg-[#EFF6FF] dark:bg-blue-950/70 text-[#1D4ED8] dark:text-blue-400 border border-[#BFDBFE] dark:border-blue-800/60',
                              item.badgeColor === 'mint' && 'bg-[#F0FDF4] dark:bg-emerald-950/70 text-[#15803D] dark:text-emerald-400 border border-[#BBF7D0] dark:border-emerald-800/60',
                              item.badgeColor === 'peach' && 'bg-[#FFF7ED] dark:bg-orange-950/70 text-[#C2410C] dark:text-orange-400 border border-[#FED7AA] dark:border-orange-800/60',
                              item.badgeColor === 'yellow' && 'bg-[#FEFCE8] dark:bg-amber-950/70 text-[#A16207] dark:text-amber-400 border border-[#FEF08A] dark:border-amber-800/60',
                              (!item.badgeColor || item.badgeColor === 'neutral') &&
                                'bg-[#F1F3FA] dark:bg-[#16233B] text-[#777B91] dark:text-slate-400 border border-[#E9EAF2] dark:border-[#26344B]'
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <p className="text-xs text-[#777B91] dark:text-slate-400 truncate mt-0.5">{item.subtitle}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-[11px] font-medium text-[#777B91] dark:text-slate-400 hidden sm:inline">
                      {item.category}
                    </span>
                    {isSelected && <CornerDownLeft className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#60A5FA]" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2.5 bg-[#F1F3FA] dark:bg-[#0A101D] border-t border-[#E9EAF2] dark:border-[#26344B] flex items-center justify-between text-[11px] text-[#777B91] dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-[#111C30] border border-[#E9EAF2] dark:border-[#26344B] text-[10px] font-mono shadow-xs text-slate-700 dark:text-slate-300">
                ↑
              </kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-[#111C30] border border-[#E9EAF2] dark:border-[#26344B] text-[10px] font-mono shadow-xs text-slate-700 dark:text-slate-300">
                ↓
              </kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-[#111C30] border border-[#E9EAF2] dark:border-[#26344B] text-[10px] font-mono shadow-xs text-slate-700 dark:text-slate-300">
                ↵
              </kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-[#111C30] border border-[#E9EAF2] dark:border-[#26344B] text-[10px] font-mono shadow-xs text-slate-700 dark:text-slate-300">
                esc
              </kbd>
              Close
            </span>
          </div>
          <span className="font-medium text-[#25263A] dark:text-slate-300 hidden sm:inline">DevFlow Quick Navigator</span>
        </div>
      </div>
    </div>
  );
};
