import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';
import { CommandPalette } from '@/components/common';

const AppLayoutInner: React.FC = () => {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const { isMobileOpen, closeMobileSidebar } = useSidebar();
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

  // Close mobile sidebar whenever route changes
  useEffect(() => {
    closeMobileSidebar();
  }, [location.pathname, closeMobileSidebar]);

  return (
    <div className="fixed inset-0 z-30 flex bg-[#080D18] text-[#F8FAFC] font-sans antialiased overflow-hidden select-none">
      {/* 1. SINGLE SHARED COLLAPSIBLE DARK NAVY SIDEBAR */}
      <Sidebar />

      {/* 2. SHARED MOBILE BACKDROP OVERLAY */}
      {isMobileOpen && (
        <div
          onClick={closeMobileSidebar}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* 3. MAIN CONTENT VIEWPORT (RENDERED BY OUTLET) */}
      <Outlet />

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
