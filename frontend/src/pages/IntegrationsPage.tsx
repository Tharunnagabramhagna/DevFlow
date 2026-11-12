import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import { devFlowApi } from '@/services/api';
import {
  GitHubConnectionStatus,
  GitHubRepositorySummary,
  DeveloperTelemetry,
  Project,
} from '@/types';
import { GuestGuardModal } from '@/components/common';
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
  Link2,
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
  const location = useLocation();

  // Navigation & Layout States
  const { openMobileSidebar } = useSidebar();
  const { user, isGuest, isClient, logout, updateGitHubConnectionState } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isGuestGuardOpen, setIsGuestGuardOpen] = useState(false);
  const [guardActionTitle, setGuardActionTitle] = useState('Modify Integration');

  // Modal States
  const [manageModal, setManageModal] = useState<'github' | 'paypal' | 'ai' | null>(null);
  const [viewLogsModalOpen, setViewLogsModalOpen] = useState(false);
  const [disconnectItem, setDisconnectItem] = useState<string | null>(null);

  // Real Integration Telemetry & Connections State
  const [loading, setLoading] = useState(true);
  const [githubStatus, setGithubStatus] = useState<GitHubConnectionStatus>({
    connected: false,
    oauthConfigured: false,
    webhookConfigured: false,
    reauthRequired: false,
    username: null,
    githubId: null,
    avatarUrl: null,
    connectedAt: null,
    scopes: [],
    hasRepoScope: false,
    githubApiReachable: false,
  });
  const [telemetry, setTelemetry] = useState<DeveloperTelemetry | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [repositories, setRepositories] = useState<GitHubRepositorySummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedRepoName, setSelectedRepoName] = useState('');
  const [busyAction, setBusyAction] = useState(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (title: string, desc: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const userInitials = useMemo(() => {
    if (isGuest) return 'DG';
    const parts = (user?.name || 'Dev User').trim().split(/\s+/);
    return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('') || 'DU';
  }, [isGuest, user?.name]);

  const loadIntegrationsData = async () => {
    setLoading(true);
    try {
      if (isGuest) {
        setGithubStatus({
          connected: true,
          oauthConfigured: false,
          webhookConfigured: false,
          reauthRequired: false,
          username: 'demo-developer',
          githubId: null,
          avatarUrl: null,
          connectedAt: null,
          scopes: ['read:user', 'repo'],
          hasRepoScope: true,
          githubApiReachable: false,
        });
        setLoading(false);
        return;
      }

      const [ghRes, telRes, projRes] = await Promise.all([
        devFlowApi.getGitHubStatus(),
        devFlowApi.getTelemetry('30d'),
        devFlowApi.getProjects(),
      ]);

      setGithubStatus(ghRes.data);
      updateGitHubConnectionState(ghRes.data.connected);
      setTelemetry(telRes.data);
      setProjects(projRes.data);
      if (projRes.data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projRes.data[0].id);
        setSelectedRepoName(projRes.data[0].githubRepo || '');
      }

      if (ghRes.data.connected && !ghRes.data.reauthRequired) {
        const repoRes = await devFlowApi.getGitHubRepositories({ perPage: 30 }).catch(() => ({
          data: [] as GitHubRepositorySummary[],
          hasMore: false,
        }));
        setRepositories(repoRes.data || []);
      } else {
        setRepositories([]);
      }
    } catch (err) {
      console.error('Failed to load integrations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrationsData();
  }, [isGuest]);

  useEffect(() => {
    const params = new URLSearchParams(location.search || window.location.search);
    const ghState = params.get('github');
    const ghError = params.get('github_error');
    if (ghState === 'connected') {
      showToast('GitHub Connected', 'Your GitHub account is linked. Select a repository below to bind a project.', 'success');
      updateGitHubConnectionState(true);
      loadIntegrationsData();
      navigate('/integrations', { replace: true });
    } else if (ghError) {
      showToast('GitHub Connection Failed', ghError, 'error');
      navigate('/integrations', { replace: true });
    }
  }, [location.search]);

  const handleConnectGitHub = async () => {
    if (isGuest) {
      setManageModal(null);
      setGuardActionTitle('Connect GitHub Account');
      setIsGuestGuardOpen(true);
      return;
    }
    setBusyAction(true);
    try {
      const { authorizeUrl } = await devFlowApi.initiateGitHubConnect('/integrations');
      window.location.href = authorizeUrl;
    } catch (err) {
      showToast('GitHub OAuth Unavailable', err instanceof Error ? err.message : 'Unable to start GitHub OAuth.', 'error');
      setBusyAction(false);
    }
  };

  const handleBindProjectRepo = async () => {
    if (isGuest || !selectedProjectId || !selectedRepoName.trim()) return;
    setBusyAction(true);
    try {
      const result = await devFlowApi.connectProjectRepo(selectedProjectId, selectedRepoName.trim());
      showToast('Repository Linked', `Linked ${result.repository?.fullName || selectedRepoName.trim()} (${result.commits.length} commits synced).`, 'success');
      await loadIntegrationsData();
    } catch (err) {
      showToast('Link Failed', err instanceof Error ? err.message : 'Failed to connect repository', 'error');
    } finally {
      setBusyAction(false);
    }
  };

  const handleSyncProject = async (projectId: string) => {
    if (isGuest) return;
    setBusyAction(true);
    try {
      const res = await devFlowApi.syncProjectRepo(projectId, true);
      showToast('Repository Synced', `Synced ${res.repository?.fullName || res.projectTitle} (${res.commits.length} commits).`, 'success');
      await loadIntegrationsData();
    } catch (err) {
      showToast('Sync Failed', err instanceof Error ? err.message : 'Unable to sync repository', 'error');
    } finally {
      setBusyAction(false);
    }
  };

  const demoWebhookEvents = useMemo(() => [
    { id: 'wh-1', event: 'GitHub push (northstar-studio/payment-gateway) - Sample [DEMO]', timestamp: '5 mins ago', status: 'Delivered', httpStatus: '200 OK' },
    { id: 'wh-2', event: 'PayPal sandbox invoice webhook (INV-2026-0842) - Sample [DEMO]', timestamp: '12 mins ago', status: 'Delivered', httpStatus: '200 OK' },
    { id: 'wh-3', event: 'GitHub pull_request closed (Milestone #2) - Sample [DEMO]', timestamp: '24 mins ago', status: 'Delivered', httpStatus: '200 OK' },
  ], []);

  const linkedProjects = useMemo(
    () => projects.filter((p) => Boolean(p.githubRepo && p.githubRepo.trim().length > 0)),
    [projects]
  );

  const paypalConfigured = isGuest ? true : Boolean(telemetry?.integrations?.paypal?.configured);
  const paypalMode = isGuest ? 'sandbox' : (telemetry?.integrations?.paypal?.mode || 'sandbox');
  const aiLiveMode = isGuest ? false : Boolean(telemetry?.integrations?.ai?.liveMode);
  const aiProviderName = isGuest ? 'Demo Preview Engine' : (telemetry?.integrations?.ai?.provider || 'simulation');

  const handleDisconnect = async () => {
    if (isGuest) {
      setDisconnectItem(null);
      setGuardActionTitle(`Disconnect ${disconnectItem || 'Integration'}`);
      setIsGuestGuardOpen(true);
      return;
    }
    if (!disconnectItem) return;
    if (disconnectItem === 'GitHub') {
      setBusyAction(true);
      try {
        await devFlowApi.disconnectGitHub();
        showToast('GitHub Disconnected', 'Encrypted GitHub OAuth credentials were removed from your profile.', 'info');
        await loadIntegrationsData();
      } catch (err) {
        showToast('Disconnect Failed', err instanceof Error ? err.message : 'Failed to disconnect GitHub.', 'error');
      } finally {
        setBusyAction(false);
      }
    } else {
      showToast('Server Managed', `${disconnectItem} environment configuration is managed on the backend.`, 'info');
    }
    setDisconnectItem(null);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* PAGE HEADER */}
        <header className="relative z-30 h-16 px-4 sm:px-6 lg:px-8 border-b border-[#26344B] bg-[#080D18]/90 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={openMobileSidebar}
              className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-[#1E2E4E] rounded-xl"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-heading text-lg sm:text-xl font-extrabold text-white tracking-tight leading-none">
                  {isClient ? 'Integrations & Merchant Services' : 'Integrations & Webhooks'}
                </h1>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider font-sans whitespace-nowrap">
                  {isGuest ? 'DEMO MODE' : 'LIVE WORKSPACE'}
                </span>
              </div>
              <p className="font-sans text-xs text-slate-400 mt-1 hidden sm:block">
                {isClient
                  ? 'Configure PayPal merchant credentials, invoicing webhooks, and team notification channels.'
                  : 'Connect and monitor the services powering code verification, GitHub repository telemetry, and PayPal settlement.'}
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Settings Gear */}
            <button
              onClick={() => navigate('/settings')}
              className="p-2 text-slate-400 hover:text-white hover:bg-[#1E2E4E] rounded-xl transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 text-slate-400 hover:text-white hover:bg-[#1E2E4E] rounded-xl relative transition-colors"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-[#080D18]" />
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
                  {isGuest ? (
                    <>
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 text-xs text-emerald-300 border border-emerald-500/20">
                        <span className="font-semibold">Demo GitHub Sync:</span> Sample repository preview active.
                      </div>
                      <div className="p-2.5 rounded-xl bg-blue-500/10 text-xs text-blue-300 border border-blue-500/20">
                        <span className="font-semibold">Demo PayPal:</span> Sandbox preview active.
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-2.5 rounded-xl bg-[#0D1526] text-xs text-slate-300 border border-[#26344B]">
                        <span className="font-semibold text-white">GitHub:</span>{' '}
                        {githubStatus.connected
                          ? `Connected as @${githubStatus.username || 'github-user'}`
                          : githubStatus.oauthConfigured
                            ? 'Not connected yet'
                            : 'OAuth credentials missing in backend .env'}
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#0D1526] text-xs text-slate-300 border border-[#26344B]">
                        <span className="font-semibold text-white">PayPal:</span>{' '}
                        {paypalConfigured ? `Configured (${paypalMode})` : 'Not configured in backend .env'}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* User Profile Avatar */}
            <div
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-1.5 cursor-pointer p-1 rounded-xl hover:bg-[#1E2E4E] transition-colors"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/40 text-xs font-bold text-blue-400 flex items-center justify-center">
                {userInitials}
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </header>

        {/* Scrollable Dashboard Body */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-7 py-5 space-y-6 max-w-[1600px] w-full mx-auto">
          {toastMessage && (
            <div
              className={`rounded-xl px-4 py-3 border text-xs flex items-center justify-between ${
                toastMessage.type === 'error'
                  ? 'bg-rose-950/60 border-rose-700/60 text-rose-200'
                  : toastMessage.type === 'info'
                    ? 'bg-blue-950/60 border-blue-700/60 text-blue-200'
                    : 'bg-emerald-950/60 border-emerald-700/60 text-emerald-200'
              }`}
            >
              <div>
                <span className="font-bold mr-2">{toastMessage.title}:</span>
                <span>{toastMessage.desc}</span>
              </div>
              <button onClick={() => setToastMessage(null)} className="text-slate-300 hover:text-white ml-4">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* CONNECTED INTEGRATIONS (3 CARDS IN A ROW) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                CONNECTED INTEGRATIONS
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isGuest || githubStatus.connected || paypalConfigured || aiLiveMode
                      ? 'bg-emerald-400'
                      : 'bg-amber-400'
                  }`}
                />
                {isGuest
                  ? 'Demo Sandbox Preview Active'
                  : loading
                    ? 'Checking backend integration status...'
                    : `${[githubStatus.connected, paypalConfigured, aiLiveMode].filter(Boolean).length} of 3 live services configured`}
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
                        {githubStatus.connected && !githubStatus.reauthRequired ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            {isGuest ? 'Connected (Demo)' : `Connected${githubStatus.username ? ` (@${githubStatus.username})` : ''}`}
                          </span>
                        ) : githubStatus.reauthRequired ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Re-auth Required
                          </span>
                        ) : !githubStatus.oauthConfigured && !isGuest ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                            OAuth Not Configured
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            Not Connected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs sm:text-sm text-slate-400 space-y-2 pt-1">
                    <div>
                      <span className="font-medium text-slate-300">Linked Repositories:</span>{' '}
                      <span className="font-mono text-xs text-blue-300">
                        {isGuest
                          ? 'northstar-studio/payment-gateway'
                          : linkedProjects.length > 0
                            ? `${linkedProjects.length} project repo${linkedProjects.length > 1 ? 's' : ''} linked`
                            : 'None linked'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-slate-300">Last Synchronisation:</span>{' '}
                      {isGuest
                        ? 'Demo fixture'
                        : linkedProjects.find((p) => p.githubSyncedAt)?.githubSyncedAt
                          ? new Date(linkedProjects.find((p) => p.githubSyncedAt)!.githubSyncedAt!).toLocaleString()
                          : 'Never synced'}
                    </div>
                    <div>
                      <span className="font-medium text-slate-300">OAuth Scopes:</span>{' '}
                      <span className="font-mono text-xs text-slate-300">
                        {githubStatus.scopes.length > 0 ? githubStatus.scopes.join(', ') : 'read:user, user:email, repo'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#26344B] mt-5 flex items-center gap-2">
                  {!isGuest && (!githubStatus.connected || githubStatus.reauthRequired) && (
                    <button
                      onClick={handleConnectGitHub}
                      disabled={busyAction || !githubStatus.oauthConfigured}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs sm:text-sm font-semibold text-white transition-colors cursor-pointer"
                    >
                      {githubStatus.oauthConfigured ? 'Connect GitHub' : 'Setup Needed'}
                    </button>
                  )}
                  <button
                    onClick={() => setManageModal('github')}
                    className="flex-1 py-2.5 rounded-xl border border-[#26344B] hover:border-blue-500/60 bg-[#17233B] hover:bg-[#1E2E4E] text-xs sm:text-sm font-semibold text-slate-200 transition-colors cursor-pointer"
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
                        <h3 className="font-heading font-bold text-base text-white">PAYPAL</h3>
                        {paypalConfigured ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {isGuest ? 'Demo Sandbox' : `Configured (${paypalMode})`}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            Not Configured
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs sm:text-sm text-slate-400 space-y-2 pt-1">
                    <div>
                      <span className="font-medium text-slate-300">Invoice Integration:</span>{' '}
                      {paypalConfigured ? 'Enabled (v2 REST API)' : 'Credentials missing in backend .env'}
                    </div>
                    <div>
                      <span className="font-medium text-slate-300">Environment:</span>{' '}
                      {isGuest ? 'Demo Mode Preview' : `${paypalMode.toUpperCase()} (${paypalConfigured ? 'Ready' : 'Inactive'})`}
                    </div>
                    <div>
                      <span className="font-medium text-slate-300">Settlement Listener:</span>{' '}
                      {paypalConfigured ? 'Webhook endpoint ready' : 'Awaiting PAYPAL_CLIENT_ID / SECRET'}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#26344B] mt-5">
                  <button
                    onClick={() => setManageModal('paypal')}
                    className="w-full py-2.5 rounded-xl border border-[#26344B] hover:border-blue-500/60 bg-[#17233B] hover:bg-[#1E2E4E] text-xs sm:text-sm font-semibold text-slate-200 transition-colors cursor-pointer"
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
                        {aiLiveMode ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            Live Engine Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                            {isGuest ? 'Demo Preview' : 'Simulation / Heuristic Fallback'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs sm:text-sm text-slate-400 space-y-2 pt-1">
                    <div>
                      <span className="font-medium text-slate-300">Provider:</span> {aiProviderName}
                    </div>
                    <div>
                      <span className="font-medium text-slate-300">Pipeline Mode:</span>{' '}
                      {aiLiveMode ? 'Live LLM Verification' : 'Fallback when API key unavailable'}
                    </div>
                    <div>
                      <span className="font-medium text-slate-300">AST Verification:</span> Requirement-Aware Pipeline
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#26344B] mt-5">
                  <button
                    onClick={() => setManageModal('ai')}
                    className="w-full py-2.5 rounded-xl border border-[#26344B] hover:border-blue-500/60 bg-[#17233B] hover:bg-[#1E2E4E] text-xs sm:text-sm font-semibold text-slate-200 transition-colors cursor-pointer"
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
                        <th className="py-3 px-4">Service / Project</th>
                        <th className="py-3 px-4">Target / Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#26344B]">
                      {!isGuest ? (
                        <>
                          {linkedProjects.length > 0 ? (
                            linkedProjects.map((proj) => (
                              <tr key={proj.id} className="hover:bg-[#152238]/60 transition-colors">
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-2.5 font-bold text-white">
                                    <GitHubLogo className="w-5 h-5 text-slate-300" />
                                    <span className="truncate max-w-[160px]">{proj.name}</span>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-slate-300 font-mono text-xs">
                                  {proj.githubRepo}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <button
                                    onClick={() => handleSyncProject(proj.id)}
                                    disabled={busyAction}
                                    className="px-3 py-1.5 rounded-lg bg-[#17233B] hover:bg-[#1E2E4E] text-slate-200 border border-[#26344B] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    <RotateCw className={`w-3.5 h-3.5 text-blue-400 ${busyAction ? 'animate-spin' : ''}`} />
                                    <span>Sync</span>
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr className="hover:bg-[#152238]/60 transition-colors">
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2.5 font-bold text-white">
                                  <GitHubLogo className="w-5 h-5 text-slate-300" />
                                  <span>GITHUB</span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-slate-400 text-xs">
                                No project repositories linked yet
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  onClick={() => setManageModal('github')}
                                  className="px-3 py-1.5 rounded-lg bg-[#17233B] hover:bg-[#1E2E4E] text-slate-200 border border-[#26344B] text-xs font-semibold cursor-pointer"
                                >
                                  Link Repo
                                </button>
                              </td>
                            </tr>
                          )}

                          <tr className="hover:bg-[#152238]/60 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5 font-bold text-white">
                                <PayPalLogo className="w-5 h-5 text-[#0079C1]" />
                                <span>PAYPAL</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-300 font-medium text-xs">
                              {paypalConfigured ? `Mode: ${paypalMode}` : 'Not configured in backend env'}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => setManageModal('paypal')}
                                className="px-3 py-1.5 rounded-lg bg-[#17233B] hover:bg-[#1E2E4E] text-slate-200 border border-[#26344B] text-xs font-semibold cursor-pointer"
                              >
                                Details
                              </button>
                            </td>
                          </tr>

                          <tr className="hover:bg-[#152238]/60 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5 font-bold text-white">
                                <Brain className="w-5 h-5 text-cyan-400" />
                                <span>AI PROVIDER</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-300 font-medium text-xs">
                              {aiProviderName} ({aiLiveMode ? 'Live' : 'Fallback'})
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => setViewLogsModalOpen(true)}
                                className="px-3 py-1.5 rounded-lg bg-[#17233B] hover:bg-[#1E2E4E] text-slate-200 border border-[#26344B] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                              >
                                <Terminal className="w-3.5 h-3.5 text-blue-400" />
                                <span>View Events</span>
                              </button>
                            </td>
                          </tr>
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
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
                  <span
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold border ${
                      isGuest || githubStatus.connected
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                    }`}
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>
                      {isGuest
                        ? 'Demo Webhook Preview Active'
                        : githubStatus.connected
                          ? 'Webhook Listeners Ready'
                          : 'GitHub Not Connected Yet'}
                    </span>
                  </span>
                  <button
                    onClick={loadIntegrationsData}
                    className="text-xs sm:text-sm text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
                  </button>
                </div>

                {/* Webhook Endpoint Reference */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-[#26344B] text-xs text-slate-400 font-semibold bg-[#0D1526]">
                        <th className="py-2.5 px-3.5">Listener Endpoint</th>
                        <th className="py-2.5 px-3.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#26344B]">
                      <tr className="hover:bg-[#152238]/60">
                        <td className="py-3 px-3.5 font-mono text-xs text-slate-200">
                          POST /api/github/webhooks
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono text-xs text-emerald-400">
                          HMAC SHA-256 Guarded
                        </td>
                      </tr>
                      <tr className="hover:bg-[#152238]/60">
                        <td className="py-3 px-3.5 font-mono text-xs text-slate-200">
                          POST /api/webhooks/paypal
                        </td>
                        <td
                          className={`py-3 px-3.5 text-right font-mono text-xs ${
                            paypalConfigured ? 'text-emerald-400' : 'text-slate-400'
                          }`}
                        >
                          {paypalConfigured ? `Ready (${paypalMode})` : 'Not Configured'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Subheader: Recent event delivery log */}
                <div className="pt-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
                    {isGuest ? 'Recent Event Telemetry Log (Demo Sample)' : 'Recent Activity & Sync Events'}
                  </span>
                  <div className="space-y-2 font-mono text-xs sm:text-sm">
                    {isGuest ? (
                      demoWebhookEvents.slice(0, 3).map((evt) => (
                        <div key={evt.id} className="p-3 rounded-xl bg-[#0D1526] border border-[#26344B] flex items-center justify-between gap-2">
                          <span className="text-slate-300 font-sans font-medium text-xs truncate">
                            {evt.event}
                          </span>
                          <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20 shrink-0">
                            {evt.httpStatus}
                          </span>
                        </div>
                      ))
                    ) : telemetry?.recentActivity && telemetry.recentActivity.length > 0 ? (
                      telemetry.recentActivity.slice(0, 4).map((evt) => (
                        <div key={evt.id} className="p-3 rounded-xl bg-[#0D1526] border border-[#26344B] flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-slate-200 font-sans font-medium text-xs block truncate">
                              {evt.projectTitle ? `${evt.projectTitle}: ` : ''}{evt.action.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(evt.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <span className="text-[11px] text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20 shrink-0">
                            {evt.action.replace(/_/g, ' ')}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-3.5 rounded-xl bg-[#0D1526] border border-[#26344B] text-xs font-sans text-slate-400">
                        No repository syncs or webhook deliveries recorded yet.
                      </div>
                    )}
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
                {!githubStatus.oauthConfigured && !isGuest && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200">
                    GitHub OAuth is not configured on the backend (`GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` missing in `.env`).
                  </div>
                )}

                <div className="p-3 rounded-lg bg-[#0D1526] border border-[#26344B] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">GitHub Account:</span>
                    <span className="font-mono text-white">
                      {githubStatus.connected ? `@${githubStatus.username || 'connected'}` : 'Not Connected'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Scopes:</span>
                    <span className="font-mono text-slate-300">
                      {githubStatus.scopes.join(', ') || 'read:user user:email repo'}
                    </span>
                  </div>
                </div>

                {!isGuest && projects.length > 0 && githubStatus.connected && (
                  <div className="space-y-2 pt-1">
                    <label className="text-[11px] font-semibold text-slate-300 block">
                      Link Repository to Project
                    </label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full bg-[#0D1526] text-xs text-white px-3 py-2 rounded-lg border border-[#26344B]"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>

                    {repositories.length > 0 ? (
                      <select
                        value={selectedRepoName}
                        onChange={(e) => setSelectedRepoName(e.target.value)}
                        className="w-full bg-[#0D1526] text-xs text-white px-3 py-2 rounded-lg border border-[#26344B] font-mono"
                      >
                        <option value="">Select repository...</option>
                        {repositories.map((repo) => (
                          <option key={repo.id} value={repo.fullName}>
                            {repo.fullName}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="owner/repository"
                        value={selectedRepoName}
                        onChange={(e) => setSelectedRepoName(e.target.value)}
                        className="w-full bg-[#0D1526] text-xs text-white px-3 py-2 rounded-lg border border-[#26344B] font-mono"
                      />
                    )}
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Webhook Destination
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`${window.location.origin}/api/github/webhooks`}
                    className="w-full bg-[#0D1526] text-xs text-slate-300 px-3 py-2 rounded-lg border border-[#26344B] font-mono"
                  />
                </div>
              </div>
            )}

            {manageModal === 'paypal' && (
              <div className="space-y-3 text-slate-300">
                <div className="p-3 rounded-lg bg-[#0D1526] border border-[#26344B] space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Configuration Status:</span>
                    <span className={paypalConfigured ? 'text-emerald-400 font-semibold' : 'text-amber-300 font-semibold'}>
                      {paypalConfigured ? 'Configured' : 'Missing Env Credentials'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Environment Mode:</span>
                    <span className="font-mono text-white uppercase">{paypalMode}</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-200">
                  {paypalConfigured
                    ? 'PayPal REST v2 invoicing and settlement webhooks are configured in the backend environment.'
                    : 'Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in backend .env to enable live PayPal Sandbox or Production invoicing.'}
                </div>
              </div>
            )}

            {manageModal === 'ai' && (
              <div className="space-y-3 text-slate-300">
                <div className="p-3 rounded-lg bg-[#0D1526] border border-[#26344B] space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Configured Provider:</span>
                    <span className="font-mono text-white">{aiProviderName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Execution Mode:</span>
                    <span className="font-mono text-cyan-300">{aiLiveMode ? 'Live API Key Present' : 'Fallback'}</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-200">
                  AI verification pipelines analyze submitted project evidence against milestone requirements before manual client approval.
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-[#26344B]">
              <button
                onClick={() => setManageModal(null)}
                className="px-4 py-2 rounded-lg bg-[#1E2E4E] hover:bg-[#26344B] text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
              {manageModal === 'github' && !isGuest && githubStatus.connected && (
                <>
                  <button
                    onClick={() => {
                      setManageModal(null);
                      setDisconnectItem('GitHub');
                    }}
                    className="px-4 py-2 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Disconnect GitHub
                  </button>
                  {selectedProjectId && selectedRepoName.trim() && (
                    <button
                      onClick={handleBindProjectRepo}
                      disabled={busyAction}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Link &amp; Sync Project</span>
                    </button>
                  )}
                </>
              )}
              {manageModal === 'github' && !isGuest && (!githubStatus.connected || githubStatus.reauthRequired) && (
                <button
                  onClick={handleConnectGitHub}
                  disabled={busyAction || !githubStatus.oauthConfigured}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Connect with GitHub
                </button>
              )}
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
                <h3 className="text-sm font-bold text-white">
                  {isGuest ? 'Demo Event Logs' : 'Workspace Activity & Event Logs'}
                </h3>
              </div>
              <button
                onClick={() => setViewLogsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1E2E4E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto font-mono text-[11px]">
              {isGuest ? (
                demoWebhookEvents.map((evt) => (
                  <div key={evt.id} className="p-2.5 rounded-lg bg-[#0D1526] border border-[#26344B] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">{evt.event}</span>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-semibold">
                        {evt.status}
                      </span>
                    </div>
                    <div className="text-slate-400 text-[10px]">Delivered: {evt.timestamp} &bull; {evt.httpStatus}</div>
                  </div>
                ))
              ) : telemetry?.recentActivity && telemetry.recentActivity.length > 0 ? (
                telemetry.recentActivity.map((evt) => (
                  <div key={evt.id} className="p-2.5 rounded-lg bg-[#0D1526] border border-[#26344B] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">{evt.action}</span>
                      <span className="text-[10px] text-slate-500">{new Date(evt.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="text-slate-300 font-sans text-xs">
                      {evt.projectTitle ? `${evt.projectTitle} — ` : ''}{evt.actorName} ({typeof evt.details === 'string' ? evt.details : JSON.stringify(evt.details)})
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-slate-400 font-sans">
                  No recorded integration events yet.
                </div>
              )}
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
        <div
          role="menu"
          data-popover="true"
          className="fixed top-16 right-6 z-50 w-56 rounded-xl bg-[#111C30] border border-[#26344B] shadow-2xl p-3 text-xs space-y-2 animate-in fade-in duration-150 text-slate-200"
        >
          <div className="font-bold text-white border-b border-[#26344B] pb-2">
            {isGuest ? 'Developer Guest' : user?.name || 'Developer Account'}
            <div className="text-[10px] text-slate-400 font-normal">
              {isGuest ? 'DEMO MODE \u2022 Integrations Preview' : user?.organization || 'Developer Workspace'}
            </div>
          </div>
          {!isGuest && (
            <button
              onClick={() => {
                setUserMenuOpen(false);
                navigate('/settings');
              }}
              className="w-full text-left py-1 text-slate-300 hover:text-white transition-colors"
            >
              Integration Preferences
            </button>
          )}
          <button
            onClick={async () => {
              setUserMenuOpen(false);
              await logout();
              navigate(isClient ? '/login/client' : '/login/developer', { replace: true });
            }}
            className="w-full text-left py-1 text-rose-400 hover:text-rose-300 transition-colors"
          >
            {isGuest ? 'Exit Demo Mode' : 'Sign Out'}
          </button>
        </div>
      )}

      <GuestGuardModal
        isOpen={isGuestGuardOpen}
        onClose={() => setIsGuestGuardOpen(false)}
        actionTitle={guardActionTitle}
        message="Modifying repository integrations, webhooks, or provider credentials is disabled in Guest Demo Mode."
      />
    </div>
  );
};
