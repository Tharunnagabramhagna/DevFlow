import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DevFlowLogo } from '@/components/common';
import {
  LayoutDashboard,
  FolderGit2,
  CheckCircle2,
  CreditCard,
  Users,
  Settings,
  Link2,
  HelpCircle,
  Plus,
  Bell,
  X,
  Menu,
  Check,
  RotateCw,
  Lock,
  ChevronDown,
  Brain,
  FileText,
  AlertTriangle,
} from 'lucide-react';

// GitHub SVG Logo Icon
const GitHubLogo = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

// PayPal SVG Logo Icon
const PayPalLogo = ({ className = 'w-6 h-6' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path
      d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.789.789 0 0 1 .777-.66h7.026c2.81 0 4.887.675 5.86 1.905.922 1.168.995 2.802.215 4.86-.022.057-.046.113-.07.168-.783 2.113-2.22 3.613-4.27 4.457-.866.357-1.892.538-3.05.538H9.362a.788.788 0 0 0-.777.66l-.992 5.093a.64.64 0 0 1-.517.596z"
      fill="#0079C1"
    />
    <path
      d="M19.068 7.378c-.783 2.113-2.22 3.613-4.27 4.457-.866.357-1.892.538-3.05.538H9.362a.788.788 0 0 0-.777.66l-.992 5.093a.64.64 0 0 1-.517.596H2.47a.641.641 0 0 1-.633-.74L4.944 3.72"
      fill="#00457C"
      opacity="0.3"
    />
    <path
      d="M9.135 12.373l.865-4.444.027-.142A.789.789 0 0 1 10.804 7.1h5.05c2.02 0 3.513.486 4.212 1.37.562.712.67 1.706.324 2.953-.61 2.19-2.074 3.42-4.137 3.42h-2.126a.788.788 0 0 0-.777.66l-.68 3.49-.135.68h-3.4zm7.68-4.273h-3.93a.473.473 0 0 0-.466.395l-.624 3.204h1.53c1.47 0 2.515-.878 2.952-2.443.207-.743.085-1.156-.462-1.156z"
      fill="#0079C1"
    />
  </svg>
);

export const IntegrationsPage: React.FC = () => {
  const navigate = useNavigate();

  // Navigation & Layout States
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Modal States
  const [manageModal, setManageModal] = useState<'github' | 'paypal' | 'ai' | null>(null);
  const [viewLogsModalOpen, setViewLogsModalOpen] = useState(false);
  const [disconnectItem, setDisconnectItem] = useState<string | null>(null);

  // Live Connections State
  const [githubConnected, setGithubConnected] = useState(true);
  const [paypalConnected, setPaypalConnected] = useState(true);
  const [aiConnected, setAiConnected] = useState(true);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (title: string, desc: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Webhook Event Stream
  const webhookEvents = useMemo(() => [
    { id: 'wh-1', event: 'GitHub push - Delivered (demo)', timestamp: '5 mins ago', status: 'Delivered' },
    { id: 'wh-2', event: 'PayPal payment - (DEMO STATE)', timestamp: '12 mins ago', status: 'Delivered' },
    { id: 'wh-3', event: 'GitHub push - Delivered (demo)', timestamp: '24 mins ago', status: 'Delivered' },
    { id: 'wh-4', event: 'PayPal payment - Sent (demo)', timestamp: '1 hour ago', status: 'Sent' },
    { id: 'wh-5', event: 'PayPal payment - (DEMO STATE)', timestamp: '3 hours ago', status: 'Delivered' },
  ], []);

  const handleDisconnect = () => {
    if (!disconnectItem) return;
    if (disconnectItem === 'PayPal') {
      setPaypalConnected(false);
      showToast('PayPal Disconnected', 'Sandbox invoice settlement listener deactivated.', 'info');
    } else if (disconnectItem === 'AI Provider') {
      setAiConnected(false);
      showToast('AI Provider Disconnected', 'Autonomous AST evaluation worker stopped.', 'info');
    } else if (disconnectItem === 'GitHub') {
      setGithubConnected(false);
      showToast('GitHub Disconnected', 'Repository commit listener paused.', 'info');
    }
    setDisconnectItem(null);
  };

  return (
    <div className="fixed inset-0 z-30 flex bg-[#F4F6FA] text-[#111827] font-sans antialiased overflow-hidden select-none">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[70] flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-slate-200 shadow-xl text-xs animate-in fade-in slide-in-from-top duration-200">
          <span
            className={`w-2 h-2 rounded-full ${
              toastMessage.type === 'success'
                ? 'bg-emerald-500'
                : toastMessage.type === 'error'
                ? 'bg-rose-500'
                : 'bg-blue-500'
            }`}
          />
          <div>
            <div className="font-bold text-slate-900">{toastMessage.title}</div>
            <div className="text-slate-500 text-[11px]">{toastMessage.desc}</div>
          </div>
        </div>
      )}

      {/* 1. FIXED DARK SIDEBAR (Matching reference: Dashboard, Projects, Milestones, Payments, Users, Configurations, Integrations) */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-60 bg-[#101D32] border-r border-[#1B2D4A] flex flex-col justify-between transition-transform duration-200 ease-in-out ${
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
          <div className="space-y-1 text-xs">
            <button
              onClick={() => {
                setMobileSidebarOpen(false);
                navigate('/dashboard');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#152744] transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-slate-400" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => {
                setMobileSidebarOpen(false);
                navigate('/projects');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#152744] transition-colors"
            >
              <FolderGit2 className="w-4 h-4 text-slate-400" />
              <span>Projects</span>
            </button>

            <button
              onClick={() => {
                setMobileSidebarOpen(false);
                navigate('/milestones');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#152744] transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-400" />
              <span>Milestones</span>
            </button>

            <button
              onClick={() => {
                setMobileSidebarOpen(false);
                navigate('/payments');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#152744] transition-colors"
            >
              <CreditCard className="w-4 h-4 text-slate-400" />
              <span>Payments</span>
            </button>

            <button
              onClick={() => {
                setMobileSidebarOpen(false);
                showToast('User Management', 'Viewing workspace administrators.', 'info');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#152744] transition-colors"
            >
              <Users className="w-4 h-4 text-slate-400" />
              <span>Users</span>
            </button>

            <button
              onClick={() => {
                setMobileSidebarOpen(false);
                navigate('/settings');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#152744] transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Configurations</span>
            </button>

            {/* Integrations Active Pill (Solid Bright Blue with Link Icon) */}
            <button
              onClick={() => {
                setMobileSidebarOpen(false);
                navigate('/integrations');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#1683ED] text-white font-semibold shadow-md shadow-blue-600/30"
            >
              <Link2 className="w-4 h-4 text-white" />
              <span>Integrations</span>
            </button>
          </div>
        </div>

        {/* Sidebar Bottom Nav (+ Quick-add, Help center) */}
        <div className="p-3 border-t border-[#1B2D4A] space-y-1 text-xs">
          <button
            onClick={() => setManageModal('github')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-[#152744] transition-colors font-medium"
          >
            <Plus className="w-4 h-4 text-[#1683ED]" />
            <span>+ Quick-add</span>
          </button>
          <button
            onClick={() => showToast('Help Center', 'Developer API & Webhook documentation.', 'info')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#152744] transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <span>Help center</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* 2. MAIN CONTENT VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* PHASE 4: PAGE HEADER */}
        <header className="h-16 px-4 sm:px-8 border-b border-[#DCE2EA] bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight leading-none">
                Integrations
              </h1>
              <p className="text-xs text-[#64748B] mt-1 hidden sm:block">
                Connect the tools that power your development and payment workflows.
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            {/* Settings Gear */}
            <button
              onClick={() => navigate('/settings')}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg relative transition-colors"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl p-3 z-50 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 font-bold text-slate-900">
                    <span>Integration Telemetry</span>
                    <button
                      onClick={() => setNotificationsOpen(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50 text-[11px] text-emerald-800 border border-emerald-100">
                    <span className="font-semibold">GitHub Synced:</span> 15 commits verified 5 mins ago.
                  </div>
                  <div className="p-2 rounded-lg bg-blue-50 text-[11px] text-blue-800 border border-blue-100">
                    <span className="font-semibold">PayPal Webhook:</span> Listener healthy and active.
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Avatar */}
            <div
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-1.5 cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <img
                src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&crop=faces"
                alt="Tharun"
                className="w-7 h-7 rounded-full object-cover ring-1 ring-blue-500/30"
              />
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>
        </header>

        {/* Scrollable Dashboard Body */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-5 space-y-6">
          {/* PHASE 5: CONNECTED INTEGRATIONS (3 CARDS IN A ROW) */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              CONNECTED INTEGRATIONS
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* CARD 1: GITHUB */}
              <div className="rounded-xl bg-white border border-[#DCE2EA] p-5 shadow-xs flex flex-col justify-between hover:border-[#1683ED]/50 transition-all">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0">
                      <GitHubLogo className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#111827]">GITHUB</h3>
                      {githubConnected ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E7F7EF] text-[#159B62] border border-[#A8E4C7]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#159B62]" />
                          Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                          Disconnected
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-[#64748B] space-y-1 pt-1">
                    <div>
                      <span className="font-medium text-slate-700">Repository Access:</span> Full access (demo account)
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Last Synchronisation:</span> 5 mins ago
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 mt-4">
                  <button
                    onClick={() => setManageModal('github')}
                    className="w-full py-2 rounded-lg border border-[#DCE2EA] hover:border-slate-400 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 transition-colors"
                  >
                    Manage connection
                  </button>
                </div>
              </div>

              {/* CARD 2: PAYPAL */}
              <div className="rounded-xl bg-white border border-[#DCE2EA] p-5 shadow-xs flex flex-col justify-between hover:border-[#1683ED]/50 transition-all">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                      <PayPalLogo className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#111827]">PAYPAL</h3>
                      {paypalConnected ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#1683ED] border border-blue-200">
                          Active Sandbox
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                          Disconnected
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-[#64748B] space-y-1 pt-1">
                    <div>
                      <span className="font-medium text-slate-700">Invoice Integration:</span> Enabled
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Environment:</span> Production (demo state)
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Connection Status:</span> Connected
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 mt-4">
                  <button
                    onClick={() => setManageModal('paypal')}
                    className="w-full py-2 rounded-lg border border-[#DCE2EA] hover:border-slate-400 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 transition-colors"
                  >
                    Manage connection
                  </button>
                </div>
              </div>

              {/* CARD 3: AI PROVIDER */}
              <div className="rounded-xl bg-white border border-[#DCE2EA] p-5 shadow-xs flex flex-col justify-between hover:border-[#1683ED]/50 transition-all">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-[#1683ED] shrink-0">
                      <Brain className="w-6 h-6 text-[#1683ED]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#111827]">AI PROVIDER</h3>
                      {aiConnected ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
                          Active Engine
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                          Disconnected
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-[#64748B] space-y-1 pt-1">
                    <div>
                      <span className="font-medium text-slate-700">LLM Service:</span> DevFlow AI Engine v1.2
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Model:</span> GPT-4o (demo)
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Connection Status:</span> Active
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 mt-4">
                  <button
                    onClick={() => setManageModal('ai')}
                    className="w-full py-2 rounded-lg border border-[#DCE2EA] hover:border-slate-400 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 transition-colors"
                  >
                    Manage settings
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* LOWER GRID: INTEGRATION DETAILS & SECURITY (LEFT 6 COLS) + WEBHOOK CONFIGURATION (RIGHT 6 COLS) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT 6 COLS: INTEGRATION DETAILS & SECURITY */}
            <div className="lg:col-span-6 space-y-6">
              {/* INTEGRATION DETAILS TABLE */}
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  INTEGRATION DETAILS
                </span>

                <div className="rounded-xl bg-white border border-[#DCE2EA] shadow-xs overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#DCE2EA] text-[11px] text-slate-500 font-semibold bg-slate-50">
                        <th className="py-2.5 px-4">Permission</th>
                        <th className="py-2.5 px-4">Account</th>
                        <th className="py-2.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {/* Row 1: GITHUB */}
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 font-bold text-slate-900">
                            <GitHubLogo className="w-4 h-4 text-slate-800" />
                            <span>GITHUB</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">Apollo Mobile</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setViewLogsModalOpen(true)}
                            className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                          >
                            <span>= View Logs</span>
                          </button>
                        </td>
                      </tr>

                      {/* Row 2: PAYPAL */}
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 font-bold text-slate-900">
                            <PayPalLogo className="w-4 h-4 text-[#0079C1]" />
                            <span>PAYPAL</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">Alpha Portal</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setDisconnectItem('PayPal')}
                            className="px-2.5 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                          >
                            <span>✕ Disconnect</span>
                          </button>
                        </td>
                      </tr>

                      {/* Row 3: AI PROVIDER */}
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 font-bold text-slate-900">
                            <Brain className="w-4 h-4 text-[#1683ED]" />
                            <span>AI PROVIDER</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">DevFlow AI Engine</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setDisconnectItem('AI Provider')}
                            className="px-2.5 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                          >
                            <span>✕ Disconnect</span>
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECURITY SECTION (TWO CARDS) */}
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  SECURITY
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Security Card 1 */}
                  <div className="p-3.5 rounded-xl bg-white border border-[#DCE2EA] shadow-xs flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-slate-100 text-slate-600 shrink-0 mt-0.5">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 block leading-tight">
                        Secure and credentials
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Secure handled credentials and permissions across projects.
                      </p>
                    </div>
                  </div>

                  {/* Security Card 2 */}
                  <div className="p-3.5 rounded-xl bg-white border border-[#DCE2EA] shadow-xs flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-slate-100 text-slate-600 shrink-0 mt-0.5">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div className="text-xs">
                      <span className="font-bold text-slate-900 block leading-tight">
                        Handling & permissions
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Inverted to secure credentials and allows and permissions.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT 6 COLS: WEBHOOK CONFIGURATION */}
            <div className="lg:col-span-6 space-y-2.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                WEBHOOK CONFIGURATION
              </span>

              <div className="rounded-xl bg-white border border-[#DCE2EA] shadow-xs p-4 sm:p-5 space-y-4">
                {/* System Operational Badge */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E7F7EF] text-[#159B62] border border-[#A8E4C7]">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>All Systems Operational</span>
                  </span>
                  <button
                    onClick={() => showToast('Refreshed', 'Webhook listeners verified against HMAC digest.', 'success')}
                    className="text-xs text-[#1683ED] hover:underline font-semibold flex items-center gap-1"
                  >
                    <RotateCw className="w-3 h-3" /> Refresh
                  </button>
                </div>

                {/* Webhook Events Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#DCE2EA] text-[11px] text-slate-500 font-semibold bg-slate-50">
                        <th className="py-2 px-3">Webhook</th>
                        <th className="py-2 px-3 text-right">Recent event delivery log</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          GitHub push - Delivered (demo)
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">–</td>
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          PayPal payment - (DEMO STATE)
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">–</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Subheader: Recent event delivery log */}
                <div className="pt-2">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2">
                    Recent event delivery log
                  </span>
                  <div className="space-y-1.5 font-mono text-xs">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <span className="text-slate-800 font-sans font-medium">GitHub push - Delivered (demo)</span>
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        HTTP 200 OK
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <span className="text-slate-800 font-sans font-medium">PayPal payment - Sent (demo)</span>
                      <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        HTTP 200 OK
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <span className="text-slate-800 font-sans font-medium">PayPal payment - (DEMO STATE)</span>
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Verified Webhook
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* MODAL: MANAGE CONNECTION */}
      {manageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4 animate-in fade-in duration-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 capitalize">
                Manage {manageModal === 'ai' ? 'AI Provider' : manageModal} Connection
              </h3>
              <button
                onClick={() => setManageModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {manageModal === 'github' && (
              <div className="space-y-3 text-slate-700">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Connected GitHub Repository
                  </label>
                  <input
                    type="text"
                    disabled
                    value="Tharunnagabramhagna/DevFlow"
                    className="w-full bg-slate-50 text-xs text-slate-900 px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Webhook Destination
                  </label>
                  <input
                    type="text"
                    disabled
                    value="https://devflow.team/api/github/webhooks"
                    className="w-full bg-slate-50 text-xs text-slate-900 px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
                  <span className="font-semibold block">Full Access (Demo Account):</span>
                  Synchronizing commit SHAs, PR diffs, and requirements telemetry.
                </div>
              </div>
            )}

            {manageModal === 'paypal' && (
              <div className="space-y-3 text-slate-700">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    PayPal Sandbox Client ID
                  </label>
                  <input
                    type="password"
                    disabled
                    value="AUJ892X-SANDBOX-PAYPAL-CLIENT-ID-DEVFLOW"
                    className="w-full bg-slate-50 text-xs text-slate-900 px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Invoicing REST API Environment
                  </label>
                  <input
                    type="text"
                    disabled
                    value="PayPal Sandbox v2 (Demonstration Mode)"
                    className="w-full bg-slate-50 text-xs text-slate-900 px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800">
                  <span className="font-semibold block">Invoice Integration Active:</span>
                  Webhooks listener captures payment settlement events and HMAC signatures.
                </div>
              </div>
            )}

            {manageModal === 'ai' && (
              <div className="space-y-3 text-slate-700">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Selected LLM Service Engine
                  </label>
                  <input
                    type="text"
                    disabled
                    value="DevFlow AI Engine v1.2 (Gemini 2.5 Flash + GPT-4o fallback)"
                    className="w-full bg-slate-50 text-xs text-slate-900 px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    AST Pattern Matching Policy
                  </label>
                  <input
                    type="text"
                    disabled
                    value="Strict Syntactic Parsing (Zero Hallucination Proof)"
                    className="w-full bg-slate-50 text-xs text-slate-900 px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div className="p-3 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-800">
                  <span className="font-semibold block">AI Autonomous Mode:</span>
                  Parses git commit diffs to evaluate deliverable requirements before milestone approval.
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setManageModal(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setManageModal(null);
                  showToast('Configuration Updated', 'Connection settings validated.', 'success');
                }}
                className="px-4 py-2 rounded-lg bg-[#1683ED] hover:bg-blue-600 text-white text-xs font-bold"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW LOGS */}
      {viewLogsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4 animate-in fade-in duration-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#1683ED]" />
                <h3 className="text-sm font-bold text-slate-900">Apollo Mobile &bull; GitHub Event Logs</h3>
              </div>
              <button
                onClick={() => setViewLogsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto font-mono text-[11px]">
              {webhookEvents.map((evt) => (
                <div key={evt.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{evt.event}</span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded font-semibold">
                      {evt.status}
                    </span>
                  </div>
                  <div className="text-slate-500 text-[10px]">Delivered: {evt.timestamp} &bull; Headers: HMAC SHA-256 validated</div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setViewLogsModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#1683ED] hover:bg-blue-600 text-white text-xs font-bold"
              >
                Close Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM DISCONNECT */}
      {disconnectItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4 animate-in fade-in duration-200 text-xs">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <AlertTriangle className="w-5 h-5" />
              <span>Disconnect {disconnectItem}?</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Disconnecting will pause webhook event ingestion and automated verification sync for this service.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setDisconnectItem(null)}
                className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                Confirm Disconnect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* USER PROFILE MODAL */}
      {userMenuOpen && (
        <div className="fixed top-16 right-6 z-50 w-56 rounded-xl bg-white border border-slate-200 shadow-2xl p-3 text-xs space-y-2 animate-in fade-in duration-150">
          <div className="font-bold text-slate-900 border-b border-slate-100 pb-2">
            Tharun
            <div className="text-[10px] text-slate-500 font-normal">Fintech Invoicing Lead</div>
          </div>
          <button
            onClick={() => {
              setUserMenuOpen(false);
              navigate('/settings');
            }}
            className="w-full text-left py-1 text-slate-700 hover:text-slate-900"
          >
            Billing Preferences
          </button>
          <button
            onClick={() => {
              setUserMenuOpen(false);
              navigate('/');
            }}
            className="w-full text-left py-1 text-rose-600 hover:text-rose-700"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};

