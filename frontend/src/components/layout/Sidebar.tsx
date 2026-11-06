import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/utils/cn';
import {
  LayoutDashboard,
  FolderGit2,
  CheckCircle2,
  GitBranch,
  Sparkles,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '@/components/common';

export interface SidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

interface NavItem {
  name: string;
  to: string;
  icon: React.ElementType;
  badge?: string;
  badgeVariant?: 'neutral' | 'ai' | 'paypal' | 'success';
}

const navItems: NavItem[] = [
  { name: 'Overview', to: '/dashboard', icon: LayoutDashboard },
  { name: 'Projects', to: '/projects', icon: FolderGit2, badge: '2', badgeVariant: 'neutral' },
  { name: 'Milestones', to: '/milestones', icon: CheckCircle2, badge: '4', badgeVariant: 'neutral' },
  { name: 'GitHub Evidence', to: '/evidence', icon: GitBranch },
  { name: 'AI Verification', to: '/verification', icon: Sparkles, badge: '94%', badgeVariant: 'ai' },
  { name: 'PayPal Invoices', to: '/payments', icon: CreditCard, badge: 'Active', badgeVariant: 'paypal' },
  { name: 'Settings', to: '/settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onMobileClose }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const renderContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300 border-r border-slate-800">
      {/* Brand & Logo Header */}
      <div className={cn(
        'h-16 flex items-center px-4 border-b border-slate-800/80 transition-all duration-200',
        isCollapsed ? 'justify-center' : 'justify-between'
      )}>
        <a
          href="#/"
          className="flex items-center gap-3 overflow-hidden group"
          title="Return to Landing Page"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-fintech-paypal-dark to-fintech-paypal-blue flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0 group-hover:scale-105 transition-transform">
            DF
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-base tracking-tight truncate group-hover:text-sky-300 transition-colors">
                  DevFlow
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-fintech-paypal-blue/30 text-sky-300 border border-sky-400/30 px-1.5 py-0.2 rounded">
                  PayPal
                </span>
              </div>
              <span className="text-[11px] text-slate-400 truncate">Milestone Intelligence</span>
            </div>
          )}
        </a>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Mobile Close Button */}
        <button
          onClick={onMobileClose}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        <div className={cn('px-2 mb-2', isCollapsed && 'sr-only')}>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Workspace
          </span>
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onMobileClose}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-fintech-paypal-blue text-white shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70',
                isCollapsed && 'justify-center px-2'
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <Icon
                className={cn(
                  'w-4 h-4 shrink-0 transition-colors',
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                )}
              />
              {!isCollapsed && <span className="truncate flex-1">{item.name}</span>}
              {!isCollapsed && item.badge && (
                <Badge
                  variant={item.badgeVariant || 'neutral'}
                  size="sm"
                  className={cn(
                    'ml-auto text-[10px] py-0 px-1.5',
                    isActive && 'bg-white/20 text-white border-transparent'
                  )}
                >
                  {item.badge}
                </Badge>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Monitored Repository Footer Info */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
        {!isCollapsed ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Target Repo</span>
              <span className="flex items-center gap-1 text-[11px] text-sky-400">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                Target Connected
              </span>
            </div>
            <a
              href="https://github.com/Tharunnagabramhagna/DevFlow"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all text-xs group"
            >
              <span className="font-mono truncate text-[11px]">DevFlow (main)</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-white shrink-0 ml-1.5" />
            </a>
          </div>
        ) : (
          <div className="flex justify-center" title="Target Repo: DevFlow (main)">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col shrink-0 transition-all duration-200 z-20',
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {renderContent()}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer Shell */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 w-64 z-50 transform transition-transform duration-200 ease-in-out lg:hidden shadow-2xl',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {renderContent()}
      </div>
    </>
  );
};

export const MobileMenuTrigger: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center shrink-0"
    aria-label="Open mobile navigation"
  >
    <Menu className="w-5 h-5" />
  </button>
);
