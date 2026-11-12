import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { Header } from '@/components/layout/Header';
import { marketplaceApi } from '@/services/api';
import { OpportunityApplicationRecord } from '@/types';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Lock,
  Undo2,
} from 'lucide-react';
import { cn } from '@/utils/cn';

const STATUS_BADGES: Record<string, string> = {
  SUBMITTED: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
  UNDER_REVIEW: 'bg-purple-500/15 border-purple-500/30 text-purple-300',
  SHORTLISTED: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
  INTERVIEWING: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300',
  ACCEPTED: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
  REJECTED: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
  WITHDRAWN: 'bg-slate-500/15 border-slate-500/30 text-slate-400',
};

export const MyApplicationsPage: React.FC = () => {
  const { isGuest } = useAuth();
  const { openMobileSidebar } = useSidebar();

  const [applications, setApplications] = useState<OpportunityApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const loadApplications = useCallback(async () => {
    if (isGuest) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorBanner(null);
    try {
      const list = await marketplaceApi.getMyApplications();
      setApplications(list);
    } catch (err: any) {
      setErrorBanner(err?.message || 'Failed to load applications.');
    } finally {
      setLoading(false);
    }
  }, [isGuest]);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  const handleWithdraw = async (appId: string) => {
    setErrorBanner(null);
    setSuccessBanner(null);
    try {
      await marketplaceApi.withdrawApplication(appId);
      await loadApplications();
      setSuccessBanner('Application withdrawn cleanly.');
    } catch (err: any) {
      setErrorBanner(err?.message || 'Unable to withdraw application.');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
      <Header onOpenMobileMenu={openMobileSidebar} />

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-5xl mx-auto space-y-6 pb-12">
          {isGuest && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 flex items-start gap-3">
              <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-amber-200">
                  Demo Mode — Applications Tracking Locked
                </h3>
                <p className="text-xs text-amber-100/80 mt-1">
                  Sign in with a Developer account to track real opportunity applications and client review updates.
                </p>
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-[#0D1424] border border-white/10 p-5">
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-400" />
              My Applications
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Track your submitted proposals, resume download consent status, AI match readiness snapshot, and client updates.
            </p>
          </div>

          {errorBanner && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorBanner}</span>
            </div>
          )}

          {successBanner && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successBanner}</span>
            </div>
          )}

          {loading ? (
            <div className="rounded-2xl bg-[#0D1424] border border-white/10 p-12 flex items-center justify-center gap-3 text-slate-300 text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
              Loading your applications...
            </div>
          ) : applications.length === 0 ? (
            <div className="rounded-2xl bg-[#0D1424] border border-white/10 p-12 text-center space-y-2">
              <ClipboardList className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-semibold text-white">No Applications Submitted Yet</h3>
              <p className="text-xs text-slate-400">
                Browse Find Opportunities to apply for published marketplace engagements.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => {
                const canWithdraw =
                  app.status !== 'WITHDRAWN' &&
                  app.status !== 'ACCEPTED' &&
                  app.status !== 'REJECTED';
                return (
                  <div
                    key={app.id}
                    className="rounded-2xl bg-[#0D1424] border border-white/10 p-5 space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-semibold text-blue-300">
                          {app.opportunity?.organizationName ||
                            app.opportunity?.client?.name ||
                            'Client Opportunity'}
                        </span>
                        <h3 className="text-base font-bold text-white mt-0.5">
                          {app.opportunity?.title || 'Opportunity'}
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Submitted {new Date(app.submittedAt).toLocaleString()} ·{' '}
                          {app.allowResumeDownload
                            ? 'Resume download consented'
                            : 'Resume hidden'}
                          {app.matchScoreSnapshot !== null &&
                            ` · Fit snapshot: ${app.matchScoreSnapshot}%`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'px-3 py-1 rounded-full text-xs font-semibold border',
                            STATUS_BADGES[app.status] || STATUS_BADGES.SUBMITTED
                          )}
                        >
                          {app.status.replace(/_/g, ' ')}
                        </span>
                        {canWithdraw && (
                          <button
                            type="button"
                            onClick={() => void handleWithdraw(app.id)}
                            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 border border-white/10 text-xs text-rose-300 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Undo2 className="w-3.5 h-3.5" />
                            Withdraw
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 bg-[#080E1B] border border-white/5 rounded-xl p-3">
                      {app.proposal}
                    </p>

                    {app.clientNotes && (
                      <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-xs text-blue-200">
                        <span className="font-semibold">Client Feedback:</span> {app.clientNotes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyApplicationsPage;

