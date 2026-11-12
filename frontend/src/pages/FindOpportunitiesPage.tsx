import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { Header } from '@/components/layout/Header';
import { marketplaceApi, resumeApi } from '@/services/api';
import {
  MarketplaceOpportunityItem,
  PortfolioProjectItem,
} from '@/types';
import {
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  Briefcase,
  CheckCircle2,
  Clock,
  DollarSign,
  Loader2,
  Lock,
  Search,
  Send,
  X,
} from 'lucide-react';
import { cn } from '@/utils/cn';

export const FindOpportunitiesPage: React.FC = () => {
  const { isGuest } = useAuth();
  const { openMobileSidebar } = useSidebar();

  const [opportunities, setOpportunities] = useState<MarketplaceOpportunityItem[]>([]);
  const [myPortfolio, setMyPortfolio] = useState<PortfolioProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [skillsFilter, setSkillsFilter] = useState('');
  const [savedOnly, setSavedOnly] = useState(false);

  // Application Modal
  const [applyingOpp, setApplyingOpp] = useState<MarketplaceOpportunityItem | null>(null);
  const [proposal, setProposal] = useState('');
  const [proposedBudget, setProposedBudget] = useState('');
  const [estimatedTimeline, setEstimatedTimeline] = useState('');
  const [selectedPortfolioIds, setSelectedPortfolioIds] = useState<Set<string>>(new Set());
  const [allowResumeDownload, setAllowResumeDownload] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadOpportunities = useCallback(async () => {
    if (isGuest) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorBanner(null);
    try {
      const [oppRes, studioRes] = await Promise.all([
        marketplaceApi.searchOpportunities({
          q: searchQuery.trim() || undefined,
          skills: skillsFilter.trim() || undefined,
          savedOnly: savedOnly ? 'true' : undefined,
          limit: 20,
        }),
        resumeApi.getStudioState().catch(() => null),
      ]);
      setOpportunities(oppRes.opportunities);
      if (studioRes) {
        setMyPortfolio(studioRes.state.profile.portfolioProjects || []);
      }
    } catch (err: any) {
      setErrorBanner(err?.message || 'Unable to load opportunities.');
    } finally {
      setLoading(false);
    }
  }, [isGuest, searchQuery, skillsFilter, savedOnly]);

  useEffect(() => {
    void loadOpportunities();
  }, [loadOpportunities]);

  const handleToggleSave = async (opp: MarketplaceOpportunityItem) => {
    if (isGuest) return;
    try {
      await marketplaceApi.toggleSaveOpportunity(opp.id, !opp.isSaved);
      setOpportunities((prev) =>
        prev.map((item) =>
          item.id === opp.id ? { ...item, isSaved: !opp.isSaved } : item
        )
      );
    } catch (err: any) {
      setErrorBanner(err?.message || 'Failed to update bookmark.');
    }
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingOpp) return;
    setSubmitting(true);
    setErrorBanner(null);
    setSuccessBanner(null);
    try {
      await marketplaceApi.applyToOpportunity(applyingOpp.id, {
        proposal: proposal.trim(),
        proposedBudget: proposedBudget ? Number(proposedBudget) : null,
        estimatedTimeline: estimatedTimeline.trim() || null,
        selectedPortfolioIds: Array.from(selectedPortfolioIds),
        allowResumeDownload,
      });
      setApplyingOpp(null);
      setProposal('');
      setProposedBudget('');
      setEstimatedTimeline('');
      setSelectedPortfolioIds(new Set());
      await loadOpportunities();
      setSuccessBanner(`Application submitted for "${applyingOpp.title}". Track updates in My Applications.`);
    } catch (err: any) {
      setErrorBanner(err?.message || 'Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
      <Header onOpenMobileMenu={openMobileSidebar} />

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto space-y-6 pb-12">
          {isGuest && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 flex items-start gap-3">
              <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-amber-200">
                  Demo Mode — Live Opportunities Feed Restricted
                </h3>
                <p className="text-xs text-amber-100/80 mt-1">
                  Sign in with a Developer account to browse real published client opportunities and submit proposals.
                </p>
              </div>
            </div>
          )}

          {/* Header & Filter Bar */}
          <div className="rounded-2xl bg-gradient-to-br from-[#0F1B33] via-[#0B1426] to-[#0E1E38] border border-blue-500/20 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Briefcase className="w-6 h-6 text-blue-400" />
                  Find Marketplace Opportunities
                </h1>
                <p className="text-xs text-slate-300 mt-1">
                  Browse real client projects explicitly published for discovery. Private client workspaces remain hidden.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSavedOnly((v) => !v)}
                className={cn(
                  'px-3.5 py-2 rounded-xl text-xs font-semibold border inline-flex items-center gap-2 cursor-pointer',
                  savedOnly
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-white/5 border-white/10 text-slate-300'
                )}
              >
                <BookmarkCheck className="w-4 h-4" />
                Saved Only
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search project titles or requirements..."
                  className="w-full rounded-xl bg-[#070D1A] border border-white/10 pl-9 pr-3 py-2 text-xs text-white"
                />
              </div>
              <input
                value={skillsFilter}
                onChange={(e) => setSkillsFilter(e.target.value)}
                placeholder="Filter required skills (e.g., TypeScript, React, PostgreSQL)"
                className="rounded-xl bg-[#070D1A] border border-white/10 px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          {errorBanner && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                {errorBanner}
              </span>
              <button type="button" onClick={() => setErrorBanner(null)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {successBanner && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                {successBanner}
              </span>
              <button type="button" onClick={() => setSuccessBanner(null)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {loading ? (
            <div className="rounded-2xl bg-[#0D1424] border border-white/10 p-12 flex items-center justify-center gap-3 text-slate-300 text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
              Loading published opportunities...
            </div>
          ) : opportunities.length === 0 ? (
            <div className="rounded-2xl bg-[#0D1424] border border-white/10 p-12 text-center space-y-2">
              <Briefcase className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-semibold text-white">No Published Opportunities Right Now</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Clients must explicitly publish an opportunity to the marketplace before it appears here. Check back soon or update your filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {opportunities.map((opp) => (
                <div
                  key={opp.id}
                  className="rounded-2xl bg-[#0D1424] border border-white/10 hover:border-blue-500/40 p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-semibold text-blue-300">
                          {opp.clientDisplayName}
                        </span>
                        <h3 className="text-base font-bold text-white mt-0.5">{opp.title}</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleToggleSave(opp)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-amber-300 cursor-pointer shrink-0"
                        title={opp.isSaved ? 'Remove bookmark' : 'Save opportunity'}
                      >
                        {opp.isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-3 text-[11px] text-slate-400">
                      {(opp.budgetMin || opp.budgetMax) && (
                        <span className="inline-flex items-center gap-1 text-emerald-300 font-mono">
                          <DollarSign className="w-3.5 h-3.5" />
                          ${opp.budgetMin ?? '?'}-${opp.budgetMax ?? '?'} {opp.currency}
                        </span>
                      )}
                      {opp.expectedDuration && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {opp.expectedDuration}
                        </span>
                      )}
                      {opp.experienceLevel && <span>Level: {opp.experienceLevel}</span>}
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-4">
                      {opp.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      {opp.skills.map((sk, idx) => (
                        <span
                          key={sk.id || idx}
                          className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] border font-medium',
                            sk.requirementLevel === 'MANDATORY'
                              ? 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                              : 'bg-white/5 border-white/15 text-slate-300'
                          )}
                        >
                          {sk.name} {sk.requirementLevel === 'MANDATORY' ? '• Required' : ''}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/10">
                    {opp.myApplication ? (
                      <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-semibold text-emerald-300">
                        Applied · Status: {opp.myApplication.status.replace(/_/g, ' ')}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500">
                        Published {opp.publishedAt ? new Date(opp.publishedAt).toLocaleDateString() : ''}
                      </span>
                    )}

                    <button
                      type="button"
                      disabled={Boolean(opp.myApplication) || isGuest}
                      onClick={() => setApplyingOpp(opp)}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {opp.myApplication ? 'Already Applied' : 'Apply Now'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Apply Modal */}
      {applyingOpp && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitApplication}
            className="w-full max-w-xl rounded-2xl bg-[#0D1424] border border-white/15 p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div>
                <h2 className="text-base font-bold text-white">Apply: {applyingOpp.title}</h2>
                <p className="text-xs text-slate-400">
                  Submit your proposal and choose whether the client may download your primary resume.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setApplyingOpp(null)}
                className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                Proposal & Approach (min 20 chars) *
              </label>
              <textarea
                required
                minLength={20}
                rows={4}
                value={proposal}
                onChange={(e) => setProposal(e.target.value)}
                placeholder="Outline relevant architecture work, milestone cadence, and how your skills align..."
                className="w-full rounded-xl bg-[#070D1A] border border-white/10 px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                  Proposed Budget (USD)
                </label>
                <input
                  type="number"
                  min={1}
                  value={proposedBudget}
                  onChange={(e) => setProposedBudget(e.target.value)}
                  placeholder="Optional milestone estimate"
                  className="w-full rounded-xl bg-[#070D1A] border border-white/10 px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                  Estimated Timeline
                </label>
                <input
                  value={estimatedTimeline}
                  onChange={(e) => setEstimatedTimeline(e.target.value)}
                  placeholder="e.g., 4 weeks"
                  className="w-full rounded-xl bg-[#070D1A] border border-white/10 px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            {myPortfolio.length > 0 && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1.5">
                  Attach Portfolio Evidence (Optional)
                </label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {myPortfolio
                    .filter((p) => p.id)
                    .map((p) => {
                      const pid = p.id!;
                      const checked = selectedPortfolioIds.has(pid);
                      return (
                        <label
                          key={pid}
                          className="flex items-center gap-2 rounded-lg bg-[#080E1B] border border-white/10 px-3 py-2 text-xs text-slate-200 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = new Set(selectedPortfolioIds);
                              if (e.target.checked) next.add(pid);
                              else next.delete(pid);
                              setSelectedPortfolioIds(next);
                            }}
                            className="accent-blue-500"
                          />
                          <span className="font-semibold">{p.title}</span>
                        </label>
                      );
                    })}
                </div>
              </div>
            )}

            <label className="flex items-start gap-2.5 rounded-xl bg-[#080E1B] border border-white/10 p-3 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={allowResumeDownload}
                onChange={(e) => setAllowResumeDownload(e.target.checked)}
                className="mt-0.5 accent-blue-500"
              />
              <span>
                Allow <strong>{applyingOpp.clientDisplayName}</strong> to download my primary resume while reviewing this application.
              </span>
            </label>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setApplyingOpp(null)}
                className="px-4 py-2 rounded-xl bg-white/5 text-xs text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Submit Application
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default FindOpportunitiesPage;

