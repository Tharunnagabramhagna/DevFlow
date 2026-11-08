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
  FileText,
  Link2,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';
import { Badge, DevFlowLogo } from '@/components/common';

export interface SidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
  onOpenCommandPalette?: () => void;
}

interface NavItem {
  name: string;
  to: string;
  icon: React.ElementType;
  badge?: string;
  badgeVariant?: 'neutral' | 'ai' | 'paypal' | 'success' | 'lavender' | 'mint' | 'powderBlue';
}

const navItems: NavItem[] = [
  { name: 'Overview', to: '/dashboard', icon: LayoutDashboard },
  { name: 'Projects', to: '/projects', icon: FolderGit2, badge: '2', badgeVariant: 'neutral' },
  { name: 'Milestones', to: '/milestones', icon: CheckCircle2, badge: '4', badgeVariant: 'neutral' },
  { name: 'GitHub Evidence', to: '/evidence', icon: GitBranch },
  { name: 'AI Verification', to: '/verification', icon: Sparkles, badge: '94%', badgeVariant: 'lavender' },
  { name: 'Invoices', to: '/invoices', icon: FileText, badge: 'Active', badgeVariant: 'powderBlue' },
  { name: 'Payments', to: '/payments', icon: CreditCard },
  { name: 'Integrations', to: '/integrations', icon: Link2 },
  { name: 'Notifications', to: '/notifications', icon: Bell },
  { name: 'Settings', to: '/settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen,
  onMobileClose,
  onOpenCommandPalette,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const renderContent = () => (
    <div className="flex flex-col h-full bg-white text-[#25263A] border-r border-[#E9EAF2] select-none">
      {/* Brand & Logo Header */}
      <div
        className={cn(
          'h-16 flex items-center px-4 border-b border-[#E9EAF2] transition-all duration-200',
          isCollapsed ? 'justify-center' : 'justify-between'
        )}
      >
        <a
          href="#/"
          className="flex items-center gap-3 overflow-hidden group"
          title="Return to Landing Page"
        >
          {isCollapsed ? (
            <DevFlowLogo variant="icon" size="sm" />
          ) : (
            <DevFlowLogo variant="horizontal" theme="dark" size="sm" />
          )}
        </a>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex p-1.5 rounded-lg text-[#777B91] hover:text-[#25263A] hover:bg-[#F1F3FA] transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Mobile Close Button */}
        <button
          onClick={onMobileClose}
          className="lg:hidden p-2 rounded-lg text-[#777B91] hover:text-[#25263A] hover:bg-[#F1F3FA] transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        <div className={cn('px-2.5 mb-2', isCollapsed && 'sr-only')}>
          <span className="text-[11px] font-semibold text-[#9D9EAF] uppercase tracking-wider">
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
              onClick={() => onMobileClose()}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-[#EFF6FF] text-[#1D4ED8] shadow-xs'
                  : 'text-[#777B91] hover:bg-[#F7F8FC] hover:text-[#25263A]',
                isCollapsed && 'justify-center px-2'
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <Icon
                className={cn(
                  'w-4 h-4 shrink-0 transition-colors',
                  isActive ? 'text-[#1D4ED8]' : 'text-[#777B91] group-hover:text-[#25263A]'
                )}
              />
              {!isCollapsed && (
                <>
                  <span className="truncate flex-1">{item.name}</span>
                  {item.badge && (
                    <Badge variant={item.badgeVariant || 'neutral'} size="sm">
                      {item.badge}
                    </Badge>
                  )}
                </>
              )}
            </NavLink>
          );
        })}

        {/* Quick Command Trigger in Sidebar */}
        {onOpenCommandPalette && (
          <div className="pt-3 px-1">
            <button
              onClick={onOpenCommandPalette}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#777B91] bg-[#F1F3FA] hover:bg-[#E9EAF2] hover:text-[#25263A] transition-colors border border-[#E9EAF2]',
                isCollapsed && 'justify-center px-2'
              )}
              title="Quick Command Palette (Ctrl+K)"
            >
              <span className="text-xs font-mono">⌘K</span>
              {!isCollapsed && <span>Quick Search</span>}
            </button>
          </div>
        )}
      </div>

      {/* Footer / Status Area */}
      <div className="p-3 border-t border-[#E9EAF2] bg-[#F8F9FC]/60">
        {!isCollapsed ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="flex items-center gap-1.5 font-medium text-[#25263A]">
                <span className="w-2 h-2 rounded-full bg-[#86DDBB] animate-pulse" />
                <span>Sandbox Active</span>
              </span>
              <span className="text-[11px] text-[#777B91]">v0.1.0</span>
            </div>
            <a
              href="https://github.com/northstar-studio/payment-gateway"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-[#777B91] hover:bg-white hover:text-[#25263A] transition-colors border border-transparent hover:border-[#E9EAF2]"
            >
              <span>GitHub Repository</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        ) : (
          <div className="flex justify-center" title="PayPal Sandbox Active">
            <span className="w-2.5 h-2.5 rounded-full bg-[#86DDBB] animate-pulse" />
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
          'hidden lg:flex flex-col shrink-0 h-screen sticky top-0 transition-all duration-200 z-30',
          isCollapsed ? 'w-20' : 'w-64'
        )}
      >
        {renderContent()}
      </aside>

      {/* Mobile Drawer Navigation */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-[#25263A]/40 backdrop-blur-xs transition-opacity"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-drawer-elevated transform transition ease-in-out duration-300">
            {renderContent()}
          </div>
        </div>
      )}
    </>
  );
};

export const MobileMenuTrigger: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="lg:hidden p-2 rounded-lg text-[#777B91] hover:text-[#25263A] hover:bg-[#F1F3FA] transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
    aria-label="Open mobile navigation menu"
  >
    <Menu className="w-5 h-5" />
  </button>
);
