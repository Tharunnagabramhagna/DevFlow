import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import { DevFlowLogo, ThemeToggle } from '@/components/common';
import {
  LayoutDashboard,
  FolderGit2,
  CheckCircle2,
  Sparkles,
  FileCode,
  ShieldCheck,
  FileText,
  CreditCard,
  Bell,
  Zap,
  Settings,
  X,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  BriefcaseBusiness,
  Code2,
  UserSearch,
  UserCheck,
  Briefcase,
  ClipboardList,
  FileBadge2,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    isSidebarCollapsed,
    toggleSidebar,
    isMobileOpen,
    closeMobileSidebar,
  } = useSidebar();
  const { user, effectiveRole, isGuest, isClient, logout } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    closeMobileSidebar();
    navigate(path);
  };

  const handleLogout = async () => {
    closeMobileSidebar();
    const targetLogin =
      effectiveRole === 'DEVELOPER'
        ? '/login/developer'
        : effectiveRole === 'CLIENT'
          ? '/login/client'
          : '/login';
    await logout();
    navigate(targetLogin, { replace: true });
  };

  const userName =
    user?.name ||
    user?.email ||
    (isGuest ? (isClient ? 'Client Demo' : 'Developer Demo') : 'Workspace Member');
  const initials =
    userName
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || (isClient ? 'CL' : 'DV');

  const avatarGradient = isGuest
    ? isClient
      ? 'bg-gradient-to-tr from-blue-500 to-teal-400'
      : 'bg-gradient-to-tr from-purple-500 to-indigo-400'
    : isClient
    ? 'bg-gradient-to-tr from-[#2563EB] to-[#60A5FA]'
    : 'bg-gradient-to-tr from-purple-600 to-indigo-400';

  const isActive = (path: string): boolean => {
    const current = location.pathname;
    if (path === '/dashboard') return current === '/dashboard' || current === '/';
    if (path === '/projects') return current.startsWith('/projects');
    if (path === '/milestones') return current.startsWith('/milestones');
    if (path === '/agents') return current === '/agents';
    if (path === '/evidence') return current.startsWith('/evidence');
    if (path === '/verification') return current === '/verification' || current === '/milestone-verification';
    if (path === '/invoices') return current.startsWith('/invoices');
    if (path === '/payments') return current.startsWith('/payments');
    if (path.startsWith('/analytics')) return current.startsWith('/analytics');
    if (path === '/notifications') return current === '/notifications';
    if (path === '/integrations') return current === '/integrations';
    if (path === '/settings') return current === '/settings';
    return current === path;
  };

  // Role-Specific Navigation Groups
  const clientNavGroups = [
    {
      title: 'WORKSPACE',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, iconColor: 'text-[#2563EB]' },
        { name: 'My Projects', path: '/projects', icon: FolderGit2, iconColor: 'text-[#2563EB]' },
        { name: 'Milestones', path: '/milestones', icon: CheckCircle2, iconColor: 'text-[#2563EB]' },
      ],
    },
    {
      title: 'TALENT MARKETPLACE',
      items: [
        { name: 'Find Developers', path: '/find-developers', icon: UserSearch, iconColor: 'text-blue-400' },
        { name: 'Applications / Talent Pipeline', path: '/talent-pipeline', icon: UserCheck, iconColor: 'text-emerald-400' },
      ],
    },
    {
      title: 'PROJECT MANAGEMENT',
      items: [
        { name: 'AI Verification Agents', path: '/agents', icon: Sparkles, iconColor: 'text-purple-400' },
        { name: 'Evidence Review', path: '/evidence', icon: FileCode, iconColor: 'text-slate-400' },
        { name: 'Verification Results', path: '/verification', icon: ShieldCheck, iconColor: 'text-emerald-400' },
      ],
    },
    {
      title: 'FINANCE',
      items: [
        { name: 'Invoices', path: '/invoices', icon: FileText, iconColor: 'text-slate-400' },
        { name: 'Payments', path: '/payments', icon: CreditCard, iconColor: 'text-blue-400' },
        { name: 'Financial Analytics', path: '/analytics/financial', icon: Zap, iconColor: 'text-emerald-400' },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { name: 'Notifications', path: '/notifications', icon: Bell, iconColor: 'text-slate-400' },
        { name: 'Integrations', path: '/integrations', icon: Zap, iconColor: 'text-slate-400' },
        { name: 'Settings', path: '/settings', icon: Settings, iconColor: 'text-slate-400' },
      ],
    },
  ];

  const developerNavGroups = [
    {
      title: 'WORKSPACE',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, iconColor: 'text-[#2563EB]' },
        { name: 'My Projects', path: '/projects', icon: FolderGit2, iconColor: 'text-[#2563EB]' },
        { name: 'Milestones', path: '/milestones', icon: CheckCircle2, iconColor: 'text-[#2563EB]' },
      ],
    },
    {
      title: 'CAREER & MARKETPLACE',
      items: [
        { name: 'Career Profile / Resume Studio', path: '/career-profile', icon: FileBadge2, iconColor: 'text-emerald-400' },
        { name: 'Find Opportunities', path: '/opportunities', icon: Briefcase, iconColor: 'text-blue-400' },
        { name: 'My Applications', path: '/my-applications', icon: ClipboardList, iconColor: 'text-purple-400' },
      ],
    },
    {
      title: 'DEVELOPMENT',
      items: [
        { name: 'AI Verification Agents', path: '/agents', icon: Sparkles, iconColor: 'text-purple-400' },
        { name: 'Evidence Submission', path: '/evidence', icon: FileCode, iconColor: 'text-slate-400' },
        { name: 'Verification Results', path: '/verification', icon: ShieldCheck, iconColor: 'text-emerald-400' },
      ],
    },
    {
      title: 'FINANCE',
      items: [
        { name: 'Invoices / Earnings', path: '/invoices', icon: FileText, iconColor: 'text-slate-400' },
        { name: 'Payments / Payouts', path: '/payments', icon: CreditCard, iconColor: 'text-blue-400' },
        { name: 'Development Analytics', path: '/analytics/development', icon: Zap, iconColor: 'text-purple-400' },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { name: 'Notifications', path: '/notifications', icon: Bell, iconColor: 'text-slate-400' },
        { name: 'Integrations', path: '/integrations', icon: Zap, iconColor: 'text-slate-400' },
        { name: 'Settings', path: '/settings', icon: Settings, iconColor: 'text-slate-400' },
      ],
    },
  ];

  const navGroups = isClient ? clientNavGroups : developerNavGroups;

  return (
    <aside
      className={`fixed lg:static inset-y-0 left-0 z-50 bg-white/80 dark:bg-[#0A101F]/80 backdrop-blur-2xl border-r border-slate-200/70 dark:border-white/10 shadow-[4px_0_24px_rgba(0,0,0,0.03)] dark:shadow-[4px_0_32px_rgba(0,0,0,0.4)] flex flex-col justify-between shrink-0 transition-all duration-300 ease-in-out ${
        isMobileOpen
          ? 'translate-x-0 w-64'
          : '-translate-x-full lg:translate-x-0'
      } ${
        isSidebarCollapsed
          ? 'lg:w-16'
          : 'lg:w-60'
      }`}
    >
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {/* Top Branding Section & Global Collapse/Expand Toggle */}
        <div className="flex items-center justify-between px-1 mb-1">
          {/* Desktop Collapsed View: Centered Expand Button inside remaining rail */}
          <div className={`w-full ${isSidebarCollapsed ? 'hidden lg:flex' : 'hidden'} flex-col items-center justify-center gap-2`}>
            <button
              onClick={toggleSidebar}
              className="flex items-center justify-center w-9 h-9 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/10 hover:border-blue-500/50 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-[#2563EB] shadow-xs backdrop-blur-md cursor-pointer"
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="w-4 h-4 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors" />
            </button>
            <ThemeToggle className="w-9 h-9 rounded-xl" />
          </div>

          {/* Expanded View (and always full on Mobile) */}
          <div className={`w-full ${isSidebarCollapsed ? 'flex lg:hidden' : 'flex'} items-center justify-between`}>
            <div
              onClick={() => handleNavigate('/')}
              className="flex items-center gap-2 cursor-pointer group"
              title="Return to Landing Page"
            >
              <DevFlowLogo variant="horizontal" theme="auto" size="sm" />
            </div>

            <div className="flex items-center gap-1">
              {/* Global Theme Toggle */}
              <ThemeToggle className="p-1.5" />

              {/* Desktop Global Sidebar Collapse Toggle */}
              <button
                onClick={toggleSidebar}
                className="hidden lg:flex items-center justify-center p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100/70 dark:hover:bg-white/10 border border-transparent hover:border-slate-200/60 dark:hover:border-white/10 transition-colors focus:outline-none focus:ring-1 focus:ring-[#2563EB] cursor-pointer"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" />
              </button>

              {/* Mobile Close Button */}
              <button
                onClick={closeMobileSidebar}
                className="lg:hidden p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close navigation"
                title="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Groups */}
        <div className="space-y-4 text-xs sm:text-[13px] font-sans">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <div
                className={`px-3 text-[10px] font-sans font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500 ${
                  isSidebarCollapsed ? 'block lg:hidden' : 'block'
                }`}
              >
                {group.title}
              </div>

              {group.items.map((item) => {
                const active = isActive(item.path);
                const Icon = item.icon;

                return (
                  <button
                    key={item.name}
                    onClick={() => handleNavigate(item.path)}
                    className={`w-full flex items-center ${
                      isSidebarCollapsed
                        ? 'gap-2.5 px-3 py-2 lg:justify-center lg:px-0 lg:py-2.5'
                        : 'gap-2.5 px-3 py-2'
                    } rounded-lg font-sans text-[13px] transition-all duration-200 cursor-pointer ${
                      active
                        ? 'bg-gradient-to-r from-blue-500/15 via-blue-500/10 to-indigo-500/10 dark:from-blue-600/25 dark:via-blue-600/20 dark:to-indigo-600/15 text-blue-700 dark:text-blue-300 font-semibold border border-blue-500/30 dark:border-blue-400/30 shadow-xs backdrop-blur-md'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-white/5 border border-transparent hover:border-slate-200/50 dark:hover:border-white/5 font-medium'
                    }`}
                    title={item.name}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                        active
                          ? `${item.iconColor} scale-105 drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]`
                          : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                      }`}
                    />
                    <span className={isSidebarCollapsed ? 'inline lg:hidden' : 'inline'}>
                      {item.name}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* User Session Profile & Logout */}
      <div className="border-t border-slate-200/60 dark:border-white/10 p-2.5 shrink-0 bg-slate-50/60 dark:bg-[#0C1424]/40 backdrop-blur-md">
        {isSidebarCollapsed ? (
          <div className="hidden lg:flex flex-col items-center gap-2">
            <div
              className={`w-8 h-8 rounded-lg ${avatarGradient} text-white flex items-center justify-center font-bold text-xs ring-1 ring-slate-300 dark:ring-[#26344B] shadow-xs`}
              title={`${userName} (${isGuest ? (isClient ? 'Client Guest' : 'Developer Guest') : isClient ? 'Client' : 'Developer'})`}
            >
              {initials}
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200/70 dark:hover:bg-[#1B2A47] rounded-lg transition-colors focus:outline-none cursor-pointer"
              title={isGuest ? 'Exit Guest Mode' : 'Sign Out'}
              aria-label={isGuest ? 'Exit Guest Mode' : 'Sign Out'}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : null}

        <div className={isSidebarCollapsed ? 'lg:hidden flex items-center justify-between gap-2' : 'flex items-center justify-between gap-2'}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-lg ${avatarGradient} text-white flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-slate-300 dark:ring-[#26344B] shadow-xs`}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">
                {userName}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isGuest ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-full border bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/60 font-mono">
                    {isClient ? <BriefcaseBusiness className="w-2.5 h-2.5" /> : <Code2 className="w-2.5 h-2.5" />}
                    <span>{isClient ? 'Client Guest' : 'Developer Guest'}</span>
                  </span>
                ) : (
                  <span
                    className={`inline-flex items-center gap-1 text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-full border ${
                      isClient
                        ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60'
                        : 'bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60'
                    }`}
                  >
                    {isClient ? (
                      <BriefcaseBusiness className="w-2.5 h-2.5" />
                    ) : (
                      <Code2 className="w-2.5 h-2.5" />
                    )}
                    <span>{isClient ? 'Client' : 'Developer'}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200/70 dark:hover:bg-[#1B2A47] rounded-lg transition-colors shrink-0 focus:outline-none cursor-pointer"
            title={isGuest ? 'Exit Guest Mode' : 'Sign Out'}
            aria-label={isGuest ? 'Exit Guest Mode' : 'Sign Out'}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sidebar Footer Info */}
      <div
        className={`px-3 py-2 border-t border-slate-200/60 dark:border-white/10 text-[10px] text-slate-500 items-center justify-between shrink-0 ${
          isSidebarCollapsed ? 'flex lg:hidden' : 'flex'
        }`}
      >
        <span>{isGuest ? 'DevFlow Demo Workspace (Guest)' : 'DevFlow Live Workspace'}</span>
        <span
          className={`w-2 h-2 rounded-full ${
            isGuest
              ? 'bg-amber-400'
              : 'bg-emerald-500 dark:bg-emerald-400'
          }`}
        />
      </div>

      <div
        className={`p-3 border-t border-slate-200/60 dark:border-white/10 text-[10px] text-slate-500 items-center justify-center shrink-0 ${
          isSidebarCollapsed ? 'hidden lg:flex' : 'hidden'
        }`}
        title={isGuest ? 'DevFlow Demo Workspace (Guest)' : 'DevFlow Live Workspace'}
      >
        <span
          className={`w-2.5 h-2.5 rounded-full animate-pulse ${
            isGuest ? 'bg-amber-400' : 'bg-emerald-500 dark:bg-emerald-400'
          }`}
        />
      </div>
    </aside>
  );
};

export const MobileMenuTrigger: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#101A2D]"
  >
    <Menu className="w-5 h-5" />
  </button>
);

export default Sidebar;
