import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Bell,
  HelpCircle,
  Search,
  ChevronDown,
  User,
  Shield,
  LogOut,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Badge, Input } from '@/components/common';
import { MobileMenuTrigger } from './Sidebar';

export interface HeaderProps {
  onOpenMobileMenu: () => void;
}

const breadcrumbMap: Record<string, { title: string; subtitle: string; section: string }> = {
  '/dashboard': {
    title: 'Developer Overview',
    subtitle: 'Milestone telemetry, AI analysis confidence, and PayPal invoice tracking',
    section: 'Analytics',
  },
  '/projects': {
    title: 'Active Projects',
    subtitle: 'Track repository branches, team allocations, and milestone scopes',
    section: 'Workspace',
  },
  '/milestones': {
    title: 'Milestone Deliverables',
    subtitle: 'Acceptance criteria verification, evidence submissions, and approval status',
    section: 'Management',
  },
  '/evidence': {
    title: 'GitHub Evidence Audit',
    subtitle: 'Inspect PR diffs, commit hashes, and author verifications',
    section: 'Intelligence',
  },
  '/verification': {
    title: 'AI Verification Reports',
    subtitle: 'Explainable AI requirements validation and automated code scoring',
    section: 'Intelligence',
  },
  '/payments': {
    title: 'PayPal Invoices & Settlements',
    subtitle: 'Generate sandbox invoices and verify cryptographically signed webhook receipts',
    section: 'Financials',
  },
  '/settings': {
    title: 'Platform Settings',
    subtitle: 'Configure GitHub webhooks, PayPal sandbox credentials, and team roles',
    section: 'Configuration',
  },
};

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const location = useLocation();
  const currentMeta = breadcrumbMap[location.pathname] || {
    title: 'DevFlow Dashboard',
    subtitle: 'Milestone intelligence and payments',
    section: 'Platform',
  };

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  const notifications = [
    {
      id: '1',
      title: 'Milestone 2 Verified & Paid',
      desc: 'PayPal webhook verified PAYMENT.INVOICING.INVOICE.PAID ($4,400.00)',
      time: '12m ago',
      type: 'success',
    },
    {
      id: '2',
      title: 'AI Analysis Completed',
      desc: 'Milestone 3 scored 90% confidence across 5 commit hashes',
      time: '1h ago',
      type: 'ai',
    },
    {
      id: '3',
      title: 'Client Review Pending',
      desc: 'Alex Mercer opened Milestone 3 evidence submission',
      time: '2h ago',
      type: 'warning',
    },
  ];

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Left: Mobile Trigger + Breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <MobileMenuTrigger onClick={onOpenMobileMenu} />

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="hidden xs:inline text-[11px] font-medium text-slate-400 uppercase tracking-wider shrink-0">
                {currentMeta.section}
              </span>
              <span className="hidden xs:inline text-slate-300">/</span>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                {currentMeta.title}
              </h1>
            </div>
            <p className="hidden md:block text-xs text-slate-500 truncate max-w-md">
              {currentMeta.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Search + Notifications + Help + Profile */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Quick Search Input */}
          <div className="hidden md:block w-56 lg:w-64">
            <Input
              placeholder="Search milestones, commits..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              leftIcon={<Search className="w-3.5 h-3.5" />}
              className="py-1.5 text-xs bg-slate-50 border-slate-200 focus:bg-white"
            />
          </div>

          {/* Sandbox Status Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200/80 text-[11px] font-semibold text-[#004B87]">
            <span className="w-2 h-2 rounded-full bg-[#0070BA] animate-pulse" />
            <span>PayPal Sandbox Active</span>
          </div>

          {/* Notifications Button & Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsNotificationsOpen(!isNotificationsOpen);
                setIsProfileOpen(false);
              }}
              className="relative p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-fintech-paypal-blue ring-2 ring-white" />
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-sm bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900">Activity & Webhook Events</span>
                  <Badge variant="neutral" size="sm">3 New</Badge>
                </div>
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {notifications.map((n) => (
                    <div key={n.id} className="p-3 hover:bg-slate-50 transition-colors flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {n.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                        {n.type === 'ai' && <Sparkles className="w-4 h-4 text-violet-600" />}
                        {n.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">{n.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{n.desc}</p>
                        <span className="text-[10px] text-slate-400 mt-1 block">{n.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2 border-t border-slate-100 text-center">
                  <span className="text-xs text-fintech-paypal-blue font-semibold hover:underline cursor-pointer">
                    View all webhook logs
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Help Button */}
          <button
            onClick={() => window.open('https://github.com/Tharunnagabramhagna/DevFlow#readme', '_blank')}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="DevFlow Architecture Docs"
            aria-label="DevFlow Docs"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Developer Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsProfileOpen(!isProfileOpen);
                setIsNotificationsOpen(false);
              }}
              className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="User profile menu"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-slate-900 to-slate-700 text-white flex items-center justify-center font-semibold text-xs shadow-xs">
                S
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-900 leading-tight">Sowjanya S.</span>
                <span className="text-[10px] text-slate-500">Frontend Lead</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3.5 py-2 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-900">Sowjanya Sappala</p>
                  <p className="text-[11px] text-slate-500 truncate">sowjanya@devflow.team</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] text-emerald-700 font-medium">Team Member #2 (Frontend)</span>
                  </div>
                </div>

                <div className="py-1">
                  <a
                    href="#/settings"
                    className="flex items-center gap-2 px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Profile & API Keys</span>
                  </a>
                  <a
                    href="https://developer.paypal.com/dashboard/"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-slate-400" />
                      <span>PayPal Sandbox Dashboard</span>
                    </div>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={() => setIsProfileOpen(false)}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Disconnect Session</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
