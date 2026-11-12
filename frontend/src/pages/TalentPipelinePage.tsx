import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { Header } from '@/components/layout/Header';
import { marketplaceApi, resumeApi } from '@/services/api';
import {
  MarketplaceOpportunityItem,
  OpportunityApplicationRecord,
} from '@/types';
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  Download,
  Eye,
  GitCompareArrows,
  Globe,
  Loader2,
  Lock,
  Plus,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { cn } from '@/utils/cn';

export const TalentPipelinePage: React.FC = () => {
  const { isGuest } = useAuth();
  const { openMobileSidebar } = useSidebar();

  const [opportunities, setOpportunities] = useState<MarketplaceOpportunityItem[]>([]);
  const [selectedOpp, setSelectedOpp] = useState<MarketplaceOpportunityItem | null>(null);
  const [applications, setApplications] = useState<OpportunityApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Create Opportunity Modal / Drawer
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [description, setDescription] = useState('');
  const [deliverablesSummary, setDeliverablesSummary] = useState('');
  const [mandatorySkillsText, setMandatorySkillsText] = useState('');
  const [preferredSkillsText, setPreferredSkillsText] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Mid-Senior');
  const [minYearsExperience, setMinYearsExperience] = useState('3');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [expectedDuration, setExpectedDuration] = useState('4-8 weeks');
  const [visibilityChoice, setVisibilityChoice] = useState<'PRIVATE' | 'DISCOVERABLE' | 'INVITE_ONLY'>('DISCOVERABLE');

  // AI Refinement review state (requires explicit approval)
  const [aiRefining, setAiRefining] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{
    improvedDescription: string;
    deliverables: string[];
    mandatorySkills: Array<{ name: string; category: string }>;
    preferredSkills: Array<{ name: string; category: string }>;
    recommendedExperienceLevel: string;
    estimatedMinYears?: number | null;
    modelName: string;
  } | null>(null);
  const [aiApproved, setAiApproved] = useState(false);

  // Comparison state
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());
  const [comparisonResult, setComparisonResult] = useState<{
    disclaimer: string;
    isAdvisoryOnly: boolean;
    candidates: Array<{
      applicationId: string | null;
      applicationStatus: string | null;
      proposedBudget: number | null;
      currency: string;
      candidate: any;
      assessment: any;
    }>;
  } | null>(null);

  const loadMyOpportunities = useCallback(async () => {
    if (isGuest) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorBanner(null);
    try {
      const res = await marketplaceApi.searchOpportunities({ mine: 'true', limit: 30 });
      setOpportunities(res.opportunities);
      if (res.opportunities.length > 0 && !selectedOpp) {
        setSelectedOpp(res.opportunities[0]);
      }
    } catch (err: any) {
      setErrorBanner(err?.message || 'Unable to load your opportunities.');
    } finally {
      setLoading(false);
    }
  }, [isGuest, selectedOpp]);

  useEffect(() => {
    void loadMyOpportunities();
  }, [loadMyOpportunities]);

  const loadApplicationsForOpp = useCallback(async (oppId: string) => {
    if (isGuest) return;
    try {
      const res = await marketplaceApi.getOpportunityApplications(oppId);
      setApplications(res.applications);
      setSelectedForCompare(new Set());
      setComparisonResult(null);
    } catch (err: any) {
      setErrorBanner(err?.message || 'Failed to load applicants for this opportunity.');
    }
  }, [isGuest]);

  useEffect(() => {
    if (selectedOpp) {
      void loadApplicationsForOpp(selectedOpp.id);
    }
  }, [selectedOpp, loadApplicationsForOpp]);

  const handleAiRefine = async () => {
    if (title.trim().length < 3 || description.trim().length < 15) {
      setErrorBanner('Enter a title and at least 15 characters of project description before running AI refinement.');
      return;
    }
    setAiRefining(true);
    setErrorBanner(null);
    try {
      const res = await marketplaceApi.aiRefineOpportunity({
        title: title.trim(),
        description: description.trim(),
        expectedDuration: expectedDuration.trim() || undefined,
        budgetMin: budgetMin ? Number(budgetMin) : undefined,
        budgetMax: budgetMax ? Number(budgetMax) : undefined,
      });
      setAiSuggestion({ ...res.suggestion, modelName: res.modelName });
      setAiApproved(false);
    } catch (err: any) {
      setErrorBanner(err?.message || 'AI refinement failed.');
    } finally {
      setAiRefining(false);
    }
  };

  const applyAiSuggestion = () => {
    if (!aiSuggestion) return;
    setDescription(aiSuggestion.improvedDescription);
    setDeliverablesSummary(aiSuggestion.deliverables.map((d) => `• ${d}`).join('\n'));
    setMandatorySkillsText(aiSuggestion.mandatorySkills.map((s) => s.name).join(', '));
    setPreferredSkillsText(aiSuggestion.preferredSkills.map((s) => s.name).join(', '));
    setExperienceLevel(aiSuggestion.recommendedExperienceLevel);
    if (aiSuggestion.estimatedMinYears !== null && aiSuggestion.estimatedMinYears !== undefined) {
      setMinYearsExperience(String(aiSuggestion.estimatedMinYears));
    }
    setAiApproved(true);
    setSuccessBanner('AI suggestion applied to draft. Review fields below before creating or publishing.');
  };

  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorBanner(null);
    setSuccessBanner(null);
    try {
      const mandatorySkills = mandatorySkillsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name) => ({ name, requirementLevel: 'MANDATORY' }));
      const preferredSkills = preferredSkillsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name) => ({ name, requirementLevel: 'PREFERRED' }));

      const created = await marketplaceApi.createOpportunity({
        title: title.trim(),
        organizationName: organizationName.trim() || null,
        description: description.trim(),
        deliverablesSummary: deliverablesSummary.trim() || null,
        aiEnhancedDescription: aiSuggestion?.improvedDescription || null,
        aiApprovedByClient: aiApproved,
        visibility: visibilityChoice,
        experienceLevel: experienceLevel.trim() || null,
        minYearsExperience: minYearsExperience ? Number(minYearsExperience) : null,
        budgetMin: budgetMin ? Number(budgetMin) : null,
        budgetMax: budgetMax ? Number(budgetMax) : null,
        expectedDuration: expectedDuration.trim() || null,
        skills: [...mandatorySkills, ...preferredSkills],
      });

      setShowCreateForm(false);
      setTitle('');
      setDescription('');
      setDeliverablesSummary('');
      setMandatorySkillsText('');
      setPreferredSkillsText('');
      setAiSuggestion(null);
      setAiApproved(false);
      setSelectedOpp(created);
      await loadMyOpportunities();
      setSuccessBanner(
        `Opportunity "${created.title}" created as DRAFT (${created.visibility}). Click "Publish to Marketplace" when ready for developers to view.`
      );
    } catch (err: any) {
      setErrorBanner(err?.message || 'Failed to create opportunity.');
    } finally {
      setSaving(false);
    }
  };

  const handleCompareSelected = async () => {
    if (!selectedOpp || selectedForCompare.size < 2) {
      setErrorBanner('Select at least 2 applicants to run side-by-side comparison.');
      return;
    }
    setSaving(true);
    setErrorBanner(null);
    try {
      const res = await marketplaceApi.compareCandidates(selectedOpp.id, {
        applicationIds: Array.from(selectedForCompare),
      });
      setComparisonResult(res);
    } catch (err: any) {
      setErrorBanner(err?.message || 'Comparison failed.');
    } finally {
      setSaving(false);
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
                  Demo Mode — Client Talent Pipeline Restricted
                </h3>
                <p className="text-xs text-amber-100/80 mt-1">
                  Publishing marketplace opportunities and reviewing applicant resumes requires an authenticated Client account.
                </p>
              </div>
            </div>
          )}

          {/* Header Bar */}
          <div className="rounded-2xl bg-[#0D1424] border border-white/10 p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-400" />
                Applications & Talent Pipeline
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Publish opted-in marketplace opportunities, refine scopes with AI approval controls, review applicants, and compare candidates side-by-side. Private DevFlow projects are never auto-published.
              </p>
            </div>
            <button
              type="button"
              disabled={isGuest}
              onClick={() => setShowCreateForm((v) => !v)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {showCreateForm ? 'Close Opportunity Composer' : 'New Marketplace Opportunity'}
            </button>
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

          {/* Create Opportunity Drawer */}
          {showCreateForm && (
            <form
              onSubmit={handleCreateOpportunity}
              className="rounded-2xl bg-[#0D1424] border border-blue-500/30 p-6 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                <h2 className="text-base font-bold text-white">Create Opportunity Draft</h2>
                <button
                  type="button"
                  disabled={aiRefining}
                  onClick={() => void handleAiRefine()}
                  className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-200 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {aiRefining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  AI Refine Scope & Requirements
                </button>
              </div>

              {aiSuggestion && (
                <div className="rounded-xl bg-purple-500/10 border border-purple-500/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-200">
                      AI Draft Refinement ({aiSuggestion.modelName}) — Requires Client Approval
                    </span>
                    <button
                      type="button"
                      onClick={applyAiSuggestion}
                      className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer"
                    >
                      {aiApproved ? '✓ Approved & Applied' : 'Accept & Apply AI Scope'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-200">{aiSuggestion.improvedDescription}</p>
                  <div className="text-[11px] text-slate-300">
                    <span className="font-semibold">Suggested Mandatory Skills:</span>{' '}
                    {aiSuggestion.mandatorySkills.map((s) => s.name).join(', ')}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                    Opportunity Title *
                  </label>
                  <input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Milestone Escrow API & PostgreSQL Optimization"
                    className="w-full rounded-xl bg-[#070D1A] border border-white/10 px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                    Company / Organization Display Name
                  </label>
                  <input
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="Optional organization label"
                    className="w-full rounded-xl bg-[#070D1A] border border-white/10 px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                  Detailed Scope Description *
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe engineering objectives, integration expectations, and milestone acceptance goals..."
                  className="w-full rounded-xl bg-[#070D1A] border border-white/10 px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                  Deliverables Summary
                </label>
                <textarea
                  rows={2}
                  value={deliverablesSummary}
                  onChange={(e) => setDeliverablesSummary(e.target.value)}
                  placeholder="Key milestones and verifiable deliverables..."
                  className="w-full rounded-xl bg-[#070D1A] border border-white/10 px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                    Mandatory Skills (comma-separated)
                  </label>
                  <input
                    value={mandatorySkillsText}
                    onChange={(e) => setMandatorySkillsText(e.target.value)}
                    placeholder="TypeScript, PostgreSQL, React"
                    className="w-full rounded-xl bg-[#070D1A] border border-white/10 px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                    Preferred Skills (comma-separated)
                  </label>
                  <input
                    value={preferredSkillsText}
                    onChange={(e) => setPreferredSkillsText(e.target.value)}
                    placeholder="Docker, Redis, Vitest"
                    className="w-full rounded-xl bg-[#070D1A] border border-white/10 px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                <input
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  placeholder="Level (e.g. Senior)"
                  className="rounded-xl bg-[#070D1A] border border-white/10 px-3 py-2 text-xs text-white"
                />
                <input
                  value={expectedDuration}
                  onChange={(e) => setExpectedDuration(e.target.value)}
                  placeholder="Duration (e.g. 6 weeks)"
                  className="rounded-xl bg-[#070D1A] border border-white/10 px-3 py-2 text-xs text-white"
                />
                <input
                  type="number"
                  min={0}
                  value={minYearsExperience}
                  onChange={(e) => setMinYearsExperience(e.target.value)}
                  placeholder="Min Years"
                  className="rounded-xl bg-[#070D1A] border border-white/10 px-3 py-2 text-xs text-white"
                />
                <input
                  type="number"
                  min={0}
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value)}
                  placeholder="Min Budget ($)"
                  className="rounded-xl bg-[#070D1A] border border-white/10 px-3 py-2 text-xs text-white"
                />
                <input
                  type="number"
                  min={0}
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                  placeholder="Max Budget ($)"
                  className="rounded-xl bg-[#070D1A] border border-white/10 px-3 py-2 text-xs text-white"
                />
                <select
                  value={visibilityChoice}
                  onChange={(e) => setVisibilityChoice(e.target.value as any)}
                  className="rounded-xl bg-[#070D1A] border border-white/10 px-3 py-2 text-xs text-white"
                >
                  <option value="DISCOVERABLE">Public Marketplace</option>
                  <option value="INVITE_ONLY">Invite Only</option>
                  <option value="PRIVATE">Private Draft</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-xs text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Opportunity Draft'}
                </button>
              </div>
            </form>
          )}

          {/* Split View: My Opportunities List + Applicant Review Workspace */}
          {loading ? (
            <div className="rounded-2xl bg-[#0D1424] border border-white/10 p-12 flex items-center justify-center gap-3 text-slate-300 text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
              Loading talent pipeline...
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <div className="xl:col-span-4 space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Your Opportunities ({opportunities.length})
                </h2>
                {opportunities.length === 0 ? (
                  <div className="rounded-2xl bg-[#0D1424] border border-white/10 p-6 text-center text-xs text-slate-400">
                    No marketplace opportunities yet. Click &ldquo;New Marketplace Opportunity&rdquo; above to create one.
                  </div>
                ) : (
                  opportunities.map((opp) => (
                    <div
                      key={opp.id}
                      onClick={() => setSelectedOpp(opp)}
                      className={cn(
                        'rounded-2xl border p-4 cursor-pointer transition-all space-y-2',
                        selectedOpp?.id === opp.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-white/10 bg-[#0D1424] hover:border-white/25'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-bold text-white">{opp.title}</h3>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0',
                            opp.status === 'PUBLISHED'
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                              : 'bg-white/10 border-white/15 text-slate-300'
                          )}
                        >
                          {opp.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Visibility: {opp.visibility}</span>
                        <span>{opp.applicantCount ?? 0} applicants</span>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                        {opp.status !== 'PUBLISHED' ? (
                          <button
                            type="button"
                            onClick={async () => {
                              const updated = await marketplaceApi.publishOpportunity(
                                opp.id,
                                opp.visibility === 'INVITE_ONLY' ? 'INVITE_ONLY' : 'DISCOVERABLE'
                              );
                              setSelectedOpp(updated);
                              await loadMyOpportunities();
                              setSuccessBanner(`Published "${updated.title}" to DevFlow Marketplace.`);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Globe className="w-3 h-3" />
                            Publish
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={async () => {
                              const updated = await marketplaceApi.unpublishOpportunity(opp.id);
                              setSelectedOpp(updated);
                              await loadMyOpportunities();
                              setSuccessBanner(`Paused "${updated.title}".`);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 text-[11px] font-semibold cursor-pointer"
                          >
                            Unpublish / Pause
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Right: Applicants Review + Candidate Comparison */}
              <div className="xl:col-span-8 space-y-5">
                {selectedOpp ? (
                  <>
                    <div className="rounded-2xl bg-[#0D1424] border border-white/10 p-5 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                        <div>
                          <h2 className="text-base font-bold text-white flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-400" />
                            Applicants for {selectedOpp.title}
                          </h2>
                          <p className="text-[11px] text-slate-400">
                            Select 2 or more candidates below to compare skills, GitHub signals, budget expectations, and match rationale side-by-side.
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={selectedForCompare.size < 2 || saving}
                          onClick={() => void handleCompareSelected()}
                          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                        >
                          <GitCompareArrows className="w-4 h-4" />
                          Compare Selected ({selectedForCompare.size})
                        </button>
                      </div>

                      {applications.length === 0 ? (
                        <p className="text-xs text-slate-400 py-8 text-center">
                          No developers have applied to this opportunity yet. Ensure its status is PUBLISHED and visibility is DISCOVERABLE.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {applications.map((app) => {
                            const checked = selectedForCompare.has(app.id);
                            const primaryRes = app.profile?.resumes?.[0];
                            const canDownloadResume =
                              Boolean(primaryRes) &&
                              (app.allowResumeDownload || app.profile?.allowClientResumeDownload);
                            return (
                              <div
                                key={app.id}
                                className="rounded-xl bg-[#080E1B] border border-white/10 p-4 space-y-3"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="flex items-start gap-3">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) => {
                                        const next = new Set(selectedForCompare);
                                        if (e.target.checked) next.add(app.id);
                                        else next.delete(app.id);
                                        setSelectedForCompare(next);
                                      }}
                                      className="mt-1 accent-blue-500"
                                    />
                                    <div>
                                      <h4 className="text-sm font-bold text-white">
                                        {app.profile?.displayName || 'Developer Applicant'}
                                      </h4>
                                      <p className="text-xs text-blue-300">
                                        {app.profile?.headline || 'Software Developer'}
                                      </p>
                                      <div className="flex flex-wrap gap-3 text-[11px] text-slate-400 mt-1">
                                        {app.proposedBudget && (
                                          <span className="text-emerald-300 font-mono">
                                            Proposed: ${app.proposedBudget} {app.currency}
                                          </span>
                                        )}
                                        {app.estimatedTimeline && <span>Timeline: {app.estimatedTimeline}</span>}
                                        {app.matchScoreSnapshot !== null && (
                                          <span className="font-mono text-blue-300">
                                            AI Fit: {app.matchScoreSnapshot}%
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2">
                                    <select
                                      value={app.status}
                                      onChange={async (e) => {
                                        const nextStatus = e.target.value as any;
                                        await marketplaceApi.updateApplicationStatus(app.id, nextStatus);
                                        await loadApplicationsForOpp(selectedOpp.id);
                                      }}
                                      disabled={app.status === 'WITHDRAWN'}
                                      className="rounded-lg bg-[#0D1424] border border-white/15 px-2.5 py-1.5 text-xs text-white"
                                    >
                                      <option value="SUBMITTED" disabled>Submitted</option>
                                      <option value="UNDER_REVIEW">Under Review</option>
                                      <option value="SHORTLISTED">Shortlisted</option>
                                      <option value="INTERVIEWING">Interviewing</option>
                                      <option value="ACCEPTED">Accept Candidate</option>
                                      <option value="REJECTED">Reject</option>
                                      <option value="WITHDRAWN" disabled>Withdrawn</option>
                                    </select>

                                    {primaryRes && (
                                      <button
                                        type="button"
                                        disabled={!canDownloadResume}
                                        title={
                                          canDownloadResume
                                            ? 'Download developer consented resume'
                                            : 'Developer did not grant resume download consent for this application'
                                        }
                                        onClick={() =>
                                          void resumeApi.downloadResumeFile(primaryRes.id, primaryRes.fileName)
                                        }
                                        className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-200 inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                        Resume
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <p className="text-xs text-slate-300 leading-relaxed bg-[#050914] rounded-lg p-3 border border-white/5">
                                  {app.proposal}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Side-by-Side Candidate Comparison Panel */}
                    {comparisonResult && (
                      <div className="rounded-2xl bg-[#0D1424] border border-blue-500/30 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Eye className="w-4 h-4 text-blue-400" />
                            Side-by-Side Candidate Comparison (Advisory)
                          </h3>
                          <button
                            type="button"
                            onClick={() => setComparisonResult(null)}
                            className="text-xs text-slate-400 hover:text-white cursor-pointer"
                          >
                            Close
                          </button>
                        </div>
                        <p className="text-[11px] text-amber-300">{comparisonResult.disclaimer}</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-white/10 text-slate-400">
                                <th className="py-2 pr-4">Candidate</th>
                                <th className="py-2 pr-4">Match Score</th>
                                <th className="py-2 pr-4">Proposed Budget</th>
                                <th className="py-2 pr-4">Status</th>
                                <th className="py-2">Assessment</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {comparisonResult.candidates.map((row, idx) => (
                                <tr key={row.applicationId || idx}>
                                  <td className="py-3 pr-4 font-semibold text-white">
                                    {row.candidate.displayName}
                                  </td>
                                  <td className="py-3 pr-4 font-mono text-emerald-300">
                                    {row.assessment.insufficientData
                                      ? 'Insufficient Data'
                                      : `${row.assessment.matchScore}%`}
                                  </td>
                                  <td className="py-3 pr-4 font-mono text-slate-300">
                                    {row.proposedBudget ? `$${row.proposedBudget} ${row.currency}` : '—'}
                                  </td>
                                  <td className="py-3 pr-4 text-slate-300">
                                    {row.applicationStatus || 'Profile'}
                                  </td>
                                  <td className="py-3 text-slate-300 max-w-sm">
                                    {row.assessment.explanation}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="rounded-2xl bg-[#0D1424] border border-white/10 p-10 text-center text-xs text-slate-400">
                    Select or create a marketplace opportunity to inspect incoming developer applications.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TalentPipelinePage;
