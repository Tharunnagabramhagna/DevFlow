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
  Eye,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    isSidebarCollapsed,
    toggleSidebar,
    isMobileOpen,
    closeMobileSidebar,
  } = useSidebar();
  const { user, role, isGuest, logout } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    closeMobileSidebar();
    navigate(path);
  };

  const handleLogout = async () => {
    closeMobileSidebar();
    await logout();
    navigate('/login');
  };

  const userName = isGuest ? 'Guest Explorer' : user?.name || 'Alex Morgan';
  const initials = isGuest
    ? 'GE'
    : userName
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'AM';

  const avatarGradient = isGuest
    ? 'bg-gradient-to-tr from-teal-500 to-cyan-500'
    : role === 'CLIENT'
    ? 'bg-gradient-to-tr from-[#2563EB] to-[#60A5FA]'
    : 'bg-gradient-to-tr from-purple-600 to-indigo-400';

  const isActive = (path: string): boolean => {
    const current = location.pathname;
    if (path === '/dashboard') return current === '/dashboard' || current === '/';
    if (path === '/projects') return current.startsWith('/projects');
    if (path === '/milestones') return current.startsWith('/milestones') || current === '/milestone-verification';
    if (path === '/agents') return current === '/agents';
    if (path === '/evidence') return current.startsWith('/evidence');
    if (path === '/verification') return current === '/verification';
    if (path === '/invoices') return current === '/invoices';
    if (path === '/payments') return current === '/payments';
    if (path === '/notifications') return current === '/notifications';
    if (path === '/integrations') return current === '/integrations';
    if (path === '/settings') return current === '/settings';
    return current === path;
  };

  const navGroups = [
    {
      title: 'WORKSPACE',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, iconColor: 'text-[#2563EB]' },
        { name: 'Projects', path: '/projects', icon: FolderGit2, iconColor: 'text-[#2563EB]' },
        { name: 'Milestones', path: '/milestones', icon: CheckCircle2, iconColor: 'text-[#2563EB]' },
      ],
    },
    {
      title: 'INTELLIGENCE',
      items: [
        { name: 'AI Agents', path: '/agents', icon: Sparkles, iconColor: 'text-purple-400' },
        { name: 'Evidence', path: '/evidence', icon: FileCode, iconColor: 'text-slate-400' },
        { name: 'Verification', path: '/verification', icon: ShieldCheck, iconColor: 'text-emerald-400' },
      ],
    },
    {
      title: 'FINANCE',
      items: [
        { name: 'Invoices', path: '/invoices', icon: FileText, iconColor: 'text-slate-400' },
        { name: 'Payments', path: '/payments', icon: CreditCard, iconColor: 'text-blue-400' },
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

  return (
    <aside
      className={`fixed lg:static inset-y-0 left-0 z-50 bg-white dark:bg-[#101A2D] border-r border-slate-200 dark:border-[#26344B] flex flex-col justify-between shrink-0 transition-all duration-300 ease-in-out ${
        isMobileOpen
          ? 'translate-x-0 w-60'
          : '-translate-x-full lg:translate-x-0'
      } ${
        isSidebarCollapsed
          ? 'lg:w-16'
          : 'lg:w-60'
      }`}
    >
      <div className="flex-1 overflow-y-auto py-5 px-3 space-y-6">
        {/* Top Branding Section & Global Collapse/Expand Toggle */}
        <div className="flex items-center justify-between px-1 mb-2">
          {/* Desktop Collapsed View: Centered Expand Button inside remaining rail */}
          <div className={`w-full ${isSidebarCollapsed ? 'hidden lg:flex' : 'hidden'} flex-col items-center justify-center gap-2`}>
            <button
              onClick={toggleSidebar}
              className="items-center justify-center w-10 h-10 text-slate-300 hover:text-white rounded-lg hover:bg-[#1B2A47] border border-[#26344B]/70 hover:border-[#2563EB] transition-colors focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="w-5 h-5 text-slate-300 hover:text-white transition-colors" />
            </button>
            <ThemeToggle className="w-10 h-10" />
          </div>

          {/* Expanded View (and always full on Mobile) */}
          <div className={`w-full ${isSidebarCollapsed ? 'flex lg:hidden' : 'flex'} items-center justify-between`}>
            <div
              onClick={() => handleNavigate('/')}
              className="flex items-center gap-2.5 cursor-pointer group"
              title="Return to Landing Page"
            >
              <DevFlowLogo variant="horizontal" theme="auto" size="sm" />
            </div>

            <div className="flex items-center gap-1.5">
              {/* Global Theme Toggle */}
              <ThemeToggle className="p-1.5" />

              {/* Desktop Global Sidebar Collapse Toggle */}
              <button
                onClick={toggleSidebar}
                className="hidden lg:flex items-center justify-center p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1B2A47] border border-transparent hover:border-[#26344B] transition-colors focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="w-5 h-5 text-slate-400 hover:text-white transition-colors" />
              </button>

              {/* Mobile Close Button */}
              <button
                onClick={closeMobileSidebar}
                className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1E2E4E] transition-colors"
                aria-label="Close navigation"
                title="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Groups */}
        <div className="space-y-6 text-xs">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <div
                className={`px-3 text-[10px] font-bold tracking-wider uppercase text-slate-500 ${
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
                    } rounded-lg transition-colors ${
                      active
                        ? 'bg-[#1B2A47] text-white font-semibold shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-[#152238]'
                    }`}
                    title={item.name}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        active ? item.iconColor : 'text-slate-400'
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
      <div className="border-t border-slate-200 dark:border-[#26344B] p-2.5 shrink-0 bg-slate-50 dark:bg-[#0C1424]/60">
        {isSidebarCollapsed ? (
          <div className="hidden lg:flex flex-col items-center gap-2">
            <div
              className={`w-9 h-9 rounded-lg ${avatarGradient} text-white flex items-center justify-center font-bold text-xs ring-1 ring-slate-300 dark:ring-[#26344B] shadow-xs`}
              title={`${userName} (${isGuest ? 'Guest Mode' : role === 'CLIENT' ? 'Client' : 'Developer'})`}
            >
              {initials}
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200/70 dark:hover:bg-[#1B2A47] rounded-lg transition-colors focus:outline-none"
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
              <div className="text-xs font-semibold text-slate-900 dark:text-white truncate leading-tight">
                {userName}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isGuest ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-full border bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/60 font-mono">
                    <Eye className="w-2.5 h-2.5" />
                    <span>GUEST MODE</span>
                  </span>
                ) : (
                  <span
                    className={`inline-flex items-center gap-1 text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-full border ${
                      role === 'CLIENT'
                        ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60'
                        : 'bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60'
                    }`}
                  >
                    {role === 'CLIENT' ? (
                      <BriefcaseBusiness className="w-2.5 h-2.5" />
                    ) : (
                      <Code2 className="w-2.5 h-2.5" />
                    )}
                    <span>{role === 'CLIENT' ? 'Client' : 'Developer'}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200/70 dark:hover:bg-[#1B2A47] rounded-lg transition-colors shrink-0 focus:outline-none"
            title={isGuest ? 'Exit Guest Mode' : 'Sign Out'}
            aria-label={isGuest ? 'Exit Guest Mode' : 'Sign Out'}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sidebar Footer Info */}
      <div
        className={`p-3 border-t border-slate-200 dark:border-[#26344B] text-[10px] text-slate-500 items-center justify-between shrink-0 ${
          isSidebarCollapsed ? 'flex lg:hidden' : 'flex'
        }`}
      >
        <span>DevFlow Sandbox v2.4 (Demo)</span>
        <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
      </div>

      <div
        className={`p-3 border-t border-slate-200 dark:border-[#26344B] text-[10px] text-slate-500 items-center justify-center shrink-0 ${
          isSidebarCollapsed ? 'hidden lg:flex' : 'hidden'
        }`}
        title="DevFlow Sandbox v2.4 (Demo)"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
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
