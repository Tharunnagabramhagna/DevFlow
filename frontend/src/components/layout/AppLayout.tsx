import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import { CommandPalette, AmbientBackground } from '@/components/common';

const AppLayoutInner: React.FC = () => {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [restrictedNotice, setRestrictedNotice] = useState<string | null>(null);
  const { isMobileOpen, closeMobileSidebar } = useSidebar();
  const { isGuest, effectiveRole, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Global Ctrl+K / Cmd+K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close mobile sidebar whenever route changes and surface any role-guard notice
  useEffect(() => {
    closeMobileSidebar();
    const state = location.state as { restrictedFrom?: string } | null;
    if (state?.restrictedFrom) {
      setRestrictedNotice(state.restrictedFrom);
    }
  }, [location.pathname, location.state, closeMobileSidebar]);

  const roleSignupPath =
    effectiveRole === 'DEVELOPER' ? '/signup/developer' : '/signup/client';
  const roleLoginPath =
    effectiveRole === 'DEVELOPER'
      ? '/login/developer'
      : effectiveRole === 'CLIENT'
        ? '/login/client'
        : '/login';

  return (
    <div className="fixed inset-0 z-30 flex bg-transparent text-[#0F172A] dark:text-[#F8FAFC] font-sans antialiased overflow-hidden select-none">
      {/* Dynamic Ambient Gradient Glass Lighting Layer */}
      <AmbientBackground />

      {/* 1. SINGLE SHARED COLLAPSIBLE DARK NAVY SIDEBAR */}
      <Sidebar />

      {/* 2. SHARED MOBILE BACKDROP OVERLAY */}
      {isMobileOpen && (
        <div
          onClick={closeMobileSidebar}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* 3. MAIN CONTENT VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Guest Mode Notice Banner */}
        {isGuest && (
          <div className="bg-teal-50 dark:bg-gradient-to-r dark:from-teal-950/95 dark:via-[#0A1D2D]/95 dark:to-blue-950/95 border-b border-teal-200 dark:border-teal-500/30 px-3 sm:px-5 py-2 flex items-center justify-between text-xs shrink-0 z-20 backdrop-blur-md shadow-xs">
            <div className="flex items-center gap-2 truncate pr-2">
              <span className="w-2 h-2 rounded-full bg-teal-500 dark:bg-teal-400 animate-pulse shrink-0" />
              <span className="font-semibold text-teal-700 dark:text-teal-300 uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-500/20 border border-teal-300 dark:border-teal-500/40 shrink-0 font-mono">
                DEMO MODE
              </span>
              <span className="text-teal-900 dark:text-slate-300 truncate text-xs">
                Exploring as{' '}
                <strong className="font-semibold">
                  {effectiveRole === 'CLIENT' ? 'Client Guest' : 'Developer Guest'}
                </strong>
                . Read-only workspace — sign in to save changes or approve payments.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => navigate(roleSignupPath)}
                className="px-3 py-1 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-500 text-white transition-colors shadow-xs cursor-pointer whitespace-nowrap"
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  navigate(roleLoginPath, { replace: true });
                }}
                className="px-2 py-1 text-xs font-medium text-teal-800 dark:text-slate-300 hover:text-teal-950 dark:hover:text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                Exit
              </button>
            </div>
          </div>
        )}
        {restrictedNotice && (
          <div className="bg-amber-50 dark:bg-amber-950/70 border-b border-amber-200 dark:border-amber-500/30 px-3 sm:px-5 py-1.5 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 shrink-0 z-20">
            <span className="truncate pr-3">
              The route <code className="font-mono font-semibold">{restrictedNotice}</code> is only available in{' '}
              {effectiveRole === 'CLIENT' ? 'Developer' : 'Client'} workspaces.
            </span>
            <button
              type="button"
              onClick={() => setRestrictedNotice(null)}
              className="text-[11px] font-semibold underline underline-offset-2 shrink-0 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}
        <div className="flex-1 min-w-0 h-full overflow-hidden relative flex flex-col">
          <Outlet />
        </div>
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </div>
  );
};

export const AppLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <AppLayoutInner />
    </SidebarProvider>
  );
};

export default AppLayout;
