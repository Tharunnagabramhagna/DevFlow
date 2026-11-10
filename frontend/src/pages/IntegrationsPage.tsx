import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from '@/contexts/SidebarContext';
import {
            Settings,
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
  ShieldCheck,
  Terminal,
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
      opacity="0.5"
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
  const { openMobileSidebar } = useSidebar();
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
  const [, setToastMessage] = useState<{ title: string; desc: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (title: string, desc: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Webhook Event Stream (Transparent Sandbox Telemetry)
  const webhookEvents = useMemo(() => [
    { id: 'wh-1', event: 'GitHub push (northstar-studio/payment-gateway) - Verified [DEMO]', timestamp: '5 mins ago', status: 'Delivered', httpStatus: '200 OK' },
    { id: 'wh-2', event: 'PayPal sandbox invoice webhook (INV-2026-0842) - Sample [DEMO]', timestamp: '12 mins ago', status: 'Delivered', httpStatus: '200 OK' },
    { id: 'wh-3', event: 'GitHub pull_request closed (Milestone #2) - Verified [DEMO]', timestamp: '24 mins ago', status: 'Delivered', httpStatus: '200 OK' },
    { id: 'wh-4', event: 'PayPal payout notification - Sandbox [DEMO]', timestamp: '1 hour ago', status: 'Sent', httpStatus: '200 OK' },
    { id: 'wh-5', event: 'AI code verification payload - Complete [DEMO]', timestamp: '3 hours ago', status: 'Delivered', httpStatus: '200 OK' },
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
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* PAGE HEADER */}
        <header className="h-18 sm:h-20 px-4 sm:px-8 border-b border-[#26344B] bg-[#080D18]/90 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={openMobileSidebar}
              className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-[#1E2E4E] rounded-xl"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-none">
                  Integrations &amp; Webhooks
                </h1>
                <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider font-sans">
                  SANDBOX
                </span>
              </div>
              <p className="font-sans text-sm text-slate-400 mt-1 hidden sm:block">
                Connect and monitor the services powering code verification, telemetry, and PayPal settlement.
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3.5">
            {/* Settings Gear */}
            <button
              onClick={() => navigate('/settings')}
              className="p-2.5 text-slate-400 hover:text-white hover:bg-[#1E2E4E] rounded-xl transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2.5 text-slate-400 hover:text-white hover:bg-[#1E2E4E] rounded-xl relative transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-[#080D18]" />
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-[#111C30] border border-[#26344B] rounded-2xl shadow-2xl p-4 z-50 space-y-2.5 text-xs sm:text-sm">
                  <div className="flex items-center justify-between border-b border-[#26344B] pb-2 font-bold text-white">
                    <span>Integration Telemetry</span>
                    <button
                      onClick={() => setNotificationsOpen(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-xs text-emerald-300 border border-emerald-500/20">
                    <span className="font-semibold">GitHub Synced:</span> 15 commits verified on northstar-studio/payment-gateway.
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-xs text-blue-300 border border-blue-500/20">
                    <span className="font-semibold">PayPal Webhook:</span> Sandbox listener active and authenticated.
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Avatar */}
            <div
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 cursor-pointer p-1 rounded-xl hover:bg-[#1E2E4E] transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 text-xs sm:text-sm font-bold text-blue-400 flex items-center justify-center">
                AM
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </header>

        {/* Scrollable Dashboard Body */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-7 space-y-7 max-w-[1780px] w-full mx-auto">
          {/* CONNECTED INTEGRATIONS (3 CARDS IN A ROW) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                CONNECTED INTEGRATIONS
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                All 3 demo services operational
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* CARD 1: GITHUB */}
              <div className="rounded-2xl bg-[#111C30] border border-[#26344B] p-6 shadow-xs flex flex-col justify-between hover:border-blue-500/50 transition-all">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-[#0D1526] border border-[#26344B] text-white flex items-center justify-center shrink-0">
                        <GitHubLogo className="w-7 h-7 text-slate-200" />
                      </div>
                      <div>
                        <h3 className="font-heading font-bold text-base text-white">GITHUB</h3>
                        {githubConnected ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Connected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            Disconnected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs sm:text-sm text-slate-400 space-y-2 pt-1">
                    <div>
                      <span className="font-medium text-slate-300">Repository Access:</span>{' '}
                      <span className="font-mono text-xs text-blue-300">northstar-studio/payment-gateway</span>
                    </div>
                    <div>
                      <span className="font-medium text-slate-300">Last Synchronisation:</span> 5 mins ago
                    </div>
                    <div>
                      <span className="font-medium text-slate-300">Monitored Branches:</span>{' '}
                      <span className="font-mono text-xs text-slate-300">main, develop</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#26344B] mt-5">
                  <button
                    onClick={() => setManageModal('github')}
                    className="w-full py-2.5 rounded-xl border border-[#26344B] hover:border-blue-500/60 bg-[#17233B] hover:bg-[#1E2E4E] text-xs sm:text-sm font-semibold text-slate-200 transition-colors"
                  >
                    Manage connection
                  </button>
                </div>
              </div>

              {/* CARD 2: PAYPAL */}
              <div className="rounded-2xl bg-[#111C30] border border-[#26344B] p-6 shadow-xs flex flex-col justify-between hover:border-blue-500/50 transition-all">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                        <PayPalLogo className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="font-heading font-bold text-base text-white">PAYPAL SANDBOX</h3>
                        {paypalConnected ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            Active Sandbox
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            Disconnected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs sm:text-sm text-slate-400 space-y-2 pt-1">
                    <div>
                      <span className="font-medium text-slate-300">Invoice Integration:</span> Enabled (v2 REST API)
                    </div>
                    <div>
                      <span className="font-medium text-slate-300">Environment:</span> Developer Sandbox Mode
                    </div>
                    <div>
                      <span className="font-medium text-slate-300">Settlement Listener:</span> Verified Webhook
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#26344B] mt-5">
                  <button
                    onClick={() => setManageModal('paypal')}
                    className="w-full py-2.5 rounded-xl border border-[#26344B] hover:border-blue-500/60 bg-[#17233B] hover:bg-[#1E2E4E] text-xs sm:text-sm font-semibold text-slate-200 transition-colors"
                  >
                    Manage connection
                  </button>
                </div>
              </div>

              {/* CARD 3: AI PROVIDER */}
              <div className="rounded-2xl bg-[#111C30] border border-[#26344B] p-6 shadow-xs flex flex-col justify-between hover:border-blue-500/50 transition-all">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                        <Brain className="w-7 h-7 text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="font-heading font-bold text-base text-white">AI PROVIDER</h3>
                        {aiConnected ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            Active Engine
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            Disconnected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs sm:text-sm text-slate-400 space-y-2 pt-1">
                    <div>
                      <span className="font-medium text-slate-300">LLM Service:</span> DevFlow AI Engine v1.2
                    </div>
                    <div>
                      <span className="font-medium text-slate-300">Model Policy:</span> Gemini 2.5 Flash + GPT-4o
                    </div>
                    <div>
                      <span className="font-medium text-slate-300">AST Verification:</span> Strict Syntactic Mode
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#26344B] mt-5">
                  <button
                    onClick={() => setManageModal('ai')}
                    className="w-full py-2.5 rounded-xl border border-[#26344B] hover:border-blue-500/60 bg-[#17233B] hover:bg-[#1E2E4E] text-xs sm:text-sm font-semibold text-slate-200 transition-colors"
                  >
                    Manage settings
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* LOWER GRID: INTEGRATION DETAILS & SECURITY + WEBHOOK CONFIGURATION */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT 6 COLS: INTEGRATION DETAILS & SECURITY */}
            <div className="lg:col-span-6 space-y-6">
              {/* INTEGRATION DETAILS TABLE */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  INTEGRATION DETAILS
                </span>

                <div className="rounded-2xl bg-[#111C30] border border-[#26344B] shadow-xs overflow-hidden">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-[#26344B] text-xs text-slate-400 font-semibold bg-[#0D1526]">
                        <th className="py-3 px-4">Service</th>
                        <th className="py-3 px-4">Workspace / Project</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#26344B]">
                      {/* Row 1: GITHUB */}
                      <tr className="hover:bg-[#152238]/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5 font-bold text-white">
                            <GitHubLogo className="w-5 h-5 text-slate-300" />
                            <span>GITHUB</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 font-mono text-xs">northstar-studio/payment-gateway</td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setViewLogsModalOpen(true)}
                            className="px-3 py-1.5 rounded-lg bg-[#17233B] hover:bg-[#1E2E4E] text-slate-200 border border-[#26344B] text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors"
                          >
                            <Terminal className="w-3.5 h-3.5 text-blue-400" />
                            <span>View Logs</span>
                          </button>
                        </td>
                      </tr>

                      {/* Row 2: PAYPAL */}
                      <tr className="hover:bg-[#152238]/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5 font-bold text-white">
                            <PayPalLogo className="w-5 h-5 text-[#0079C1]" />
                            <span>PAYPAL</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 font-medium">Meridian Labs (Demo Sandbox)</td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setDisconnectItem('PayPal')}
                            className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs sm:text-sm font-semibold inline-flex items-center gap-1 transition-colors"
                          >
                            <span>Disconnect</span>
                          </button>
                        </td>
                      </tr>

                      {/* Row 3: AI PROVIDER */}
                      <tr className="hover:bg-[#152238]/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5 font-bold text-white">
                            <Brain className="w-5 h-5 text-cyan-400" />
                            <span>AI PROVIDER</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 font-medium">DevFlow Autonomous Engine</td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setDisconnectItem('AI Provider')}
                            className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs sm:text-sm font-semibold inline-flex items-center gap-1 transition-colors"
                          >
                            <span>Disconnect</span>
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECURITY SECTION (TWO CARDS) */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  SECURITY &amp; AUDIT INTEGRITY
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Security Card 1 */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#111C30] border border-[#26344B] shadow-xs flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 shrink-0 mt-0.5 border border-blue-500/20">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div className="text-xs sm:text-sm">
                      <span className="font-bold text-white block leading-tight">
                        HMAC Signature Verification
                      </span>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Every incoming GitHub and PayPal webhook payload is cryptographically authenticated with SHA-256 tokens.
                      </p>
                    </div>
                  </div>

                  {/* Security Card 2 */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#111C30] border border-[#26344B] shadow-xs flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5 border border-emerald-500/20">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="text-xs sm:text-sm">
                      <span className="font-bold text-white block leading-tight">
                        Human-in-the-Loop Sign-off
                      </span>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        AI evaluates AST proof, but invoice creation and PayPal settlement strictly require manual administrator approval.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT 6 COLS: WEBHOOK CONFIGURATION */}
            <div className="lg:col-span-6 space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                WEBHOOK CONFIGURATION &amp; EVENT LOGS
              </span>

              <div className="rounded-2xl bg-[#111C30] border border-[#26344B] shadow-xs p-5 sm:p-6 space-y-5">
                {/* System Operational Badge */}
                <div className="flex items-center justify-between pb-3.5 border-b border-[#26344B]">
                  <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>All Webhook Listeners Operational</span>
                  </span>
                  <button
                    onClick={() => showToast('Refreshed', 'Webhook listeners verified against HMAC digest.', 'success')}
                    className="text-xs sm:text-sm text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCw className="w-3.5 h-3.5" /> Refresh
                  </button>
                </div>

                {/* Webhook Events Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-[#26344B] text-xs text-slate-400 font-semibold bg-[#0D1526]">
                        <th className="py-2.5 px-3.5">Webhook Event</th>
                        <th className="py-2.5 px-3.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#26344B]">
                      <tr className="hover:bg-[#152238]/60">
                        <td className="py-3 px-3.5 font-medium text-slate-200">
                          GitHub push: northstar-studio/payment-gateway
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono text-emerald-400 text-xs">HTTP 200 OK</td>
                      </tr>
                      <tr className="hover:bg-[#152238]/60">
                        <td className="py-3 px-3.5 font-medium text-slate-200">
                          PayPal invoicing: PAYMENT.CAPTURE.COMPLETED (Sandbox)
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono text-emerald-400 text-xs">HTTP 200 OK</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Subheader: Recent event delivery log */}
                <div className="pt-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
                    Recent Event Telemetry Log (Sample Data)
                  </span>
                  <div className="space-y-2 font-mono text-xs sm:text-sm">
                    <div className="p-3 rounded-xl bg-[#0D1526] border border-[#26344B] flex items-center justify-between">
                      <span className="text-slate-300 font-sans font-medium text-xs sm:text-sm">
                        GitHub push &bull; commit <span className="font-mono text-blue-300">a1e9482f</span>
                      </span>
                      <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                        HTTP 200 OK
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#0D1526] border border-[#26344B] flex items-center justify-between">
                      <span className="text-slate-300 font-sans font-medium text-xs sm:text-sm">
                        PayPal invoice &bull; <span className="font-mono text-blue-300">INV-2026-0842</span>
                      </span>
                      <span className="text-xs text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
                        Dispatched
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#0D1526] border border-[#26344B] flex items-center justify-between">
                      <span className="text-slate-300 font-sans font-medium text-xs sm:text-sm">
                        PayPal payment &bull; <span className="font-mono text-blue-300">PP-DEMO-12345678</span>
                      </span>
                      <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                        Verified Webhook
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

      {/* MODAL: MANAGE CONNECTION */}
      {manageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-[#111C30] border border-[#26344B] shadow-2xl p-6 space-y-4 animate-in fade-in duration-200 text-xs">
            <div className="flex items-center justify-between border-b border-[#26344B] pb-3">
              <h3 className="text-sm font-bold text-white capitalize">
                Manage {manageModal === 'ai' ? 'AI Provider' : manageModal} Connection
              </h3>
              <button
                onClick={() => setManageModal(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1E2E4E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {manageModal === 'github' && (
              <div className="space-y-3 text-slate-300">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Connected GitHub Repository
                  </label>
                  <input
                    type="text"
                    disabled
                    value="northstar-studio/payment-gateway"
                    className="w-full bg-[#0D1526] text-xs text-white px-3 py-2 rounded-lg border border-[#26344B] font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Webhook Destination
                  </label>
                  <input
                    type="text"
                    disabled
                    value="https://devflow.team/api/github/webhooks"
                    className="w-full bg-[#0D1526] text-xs text-slate-300 px-3 py-2 rounded-lg border border-[#26344B] font-mono"
                  />
                </div>
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                  <span className="font-semibold block">Full Access (Demo Account):</span>
                  Synchronizing commit SHAs, PR diffs, and test suite telemetry with HMAC validation.
                </div>
              </div>
            )}

            {manageModal === 'paypal' && (
              <div className="space-y-3 text-slate-300">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    PayPal Sandbox Client ID
                  </label>
                  <input
                    type="password"
                    disabled
                    value="AUJ892X-SANDBOX-PAYPAL-CLIENT-ID-DEVFLOW"
                    className="w-full bg-[#0D1526] text-xs text-white px-3 py-2 rounded-lg border border-[#26344B] font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Invoicing REST API Environment
                  </label>
                  <input
                    type="text"
                    disabled
                    value="PayPal Sandbox v2 (Demonstration Mode)"
                    className="w-full bg-[#0D1526] text-xs text-slate-300 px-3 py-2 rounded-lg border border-[#26344B]"
                  />
                </div>
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300">
                  <span className="font-semibold block">Invoice Integration Active:</span>
                  Webhooks listener captures payment settlement events and HMAC signatures.
                </div>
              </div>
            )}

            {manageModal === 'ai' && (
              <div className="space-y-3 text-slate-300">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Selected LLM Service Engine
                  </label>
                  <input
                    type="text"
                    disabled
                    value="DevFlow AI Engine v1.2 (Gemini 2.5 Flash + GPT-4o fallback)"
                    className="w-full bg-[#0D1526] text-xs text-slate-300 px-3 py-2 rounded-lg border border-[#26344B]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    AST Pattern Matching Policy
                  </label>
                  <input
                    type="text"
                    disabled
                    value="Strict Syntactic Parsing (Zero Hallucination Proof)"
                    className="w-full bg-[#0D1526] text-xs text-slate-300 px-3 py-2 rounded-lg border border-[#26344B]"
                  />
                </div>
                <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
                  <span className="font-semibold block">AI Autonomous Mode:</span>
                  Parses git commit diffs to evaluate deliverable requirements before milestone approval.
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-[#26344B]">
              <button
                onClick={() => setManageModal(null)}
                className="px-4 py-2 rounded-lg bg-[#1E2E4E] hover:bg-[#26344B] text-slate-300 text-xs font-semibold transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setManageModal(null);
                  showToast('Configuration Updated', 'Connection settings validated.', 'success');
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW LOGS */}
      {viewLogsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-[#111C30] border border-[#26344B] shadow-2xl p-6 space-y-4 animate-in fade-in duration-200 text-xs">
            <div className="flex items-center justify-between border-b border-[#26344B] pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">northstar-studio/payment-gateway &bull; Event Logs</h3>
              </div>
              <button
                onClick={() => setViewLogsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1E2E4E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto font-mono text-[11px]">
              {webhookEvents.map((evt) => (
                <div key={evt.id} className="p-2.5 rounded-lg bg-[#0D1526] border border-[#26344B] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">{evt.event}</span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-semibold">
                      {evt.status}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[10px]">Delivered: {evt.timestamp} &bull; Headers: HMAC SHA-256 validated &bull; {evt.httpStatus}</div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#26344B]">
              <button
                onClick={() => setViewLogsModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"
              >
                Close Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM DISCONNECT */}
      {disconnectItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-[#111C30] border border-[#26344B] shadow-2xl p-6 space-y-4 animate-in fade-in duration-200 text-xs">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <span>Disconnect {disconnectItem}?</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Disconnecting will pause webhook event ingestion and automated verification sync for this service.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#26344B]">
              <button
                onClick={() => setDisconnectItem(null)}
                className="px-3.5 py-2 rounded-lg bg-[#1E2E4E] hover:bg-[#26344B] text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors"
              >
                Confirm Disconnect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* USER PROFILE MODAL */}
      {userMenuOpen && (
        <div className="fixed top-16 right-6 z-50 w-56 rounded-xl bg-[#111C30] border border-[#26344B] shadow-2xl p-3 text-xs space-y-2 animate-in fade-in duration-150 text-slate-200">
          <div className="font-bold text-white border-b border-[#26344B] pb-2">
            Alex Morgan
            <div className="text-[10px] text-slate-400 font-normal">Project Administrator &bull; Northstar Studio</div>
          </div>
          <button
            onClick={() => {
              setUserMenuOpen(false);
              navigate('/settings');
            }}
            className="w-full text-left py-1 text-slate-300 hover:text-white transition-colors"
          >
            Billing Preferences
          </button>
          <button
            onClick={() => {
              setUserMenuOpen(false);
              navigate('/');
            }}
            className="w-full text-left py-1 text-rose-400 hover:text-rose-300 transition-colors"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};
