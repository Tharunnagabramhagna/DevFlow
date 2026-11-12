import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { Header } from '@/components/layout/Header';
import { marketplaceApi } from '@/services/api';
import { MarketplaceDeveloperCard } from '@/types';
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  ExternalLink,
  Filter,
  GitBranch,
  Globe,
  Loader2,
  Lock,
  MapPin,
  Search,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import { cn } from '@/utils/cn';

export const FindDevelopersPage: React.FC = () => {
  const { isGuest } = useAuth();
  const { openMobileSidebar } = useSidebar();

  const [developers, setDevelopers] = useState<MarketplaceDeveloperCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiMatching, setAiMatching] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [skillsFilter, setSkillsFilter] = useState('');
  const [availability, setAvailability] = useState('');
  const [minYears, setMinYears] = useState('');
  const [maxRate, setMaxRate] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [sort, setSort] = useState<'completeness' | 'experience' | 'recent'>('completeness');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // AI NL Matching state
  const [nlPrompt, setNlPrompt] = useState('');
  const [aiResultMeta, setAiResultMeta] = useState<{
    disclaimer: string;
    modelName: string;
    mandatorySkills: string[];
    preferredSkills: string[];
    scopeSummary: string;
  } | null>(null);

  const [selectedDev, setSelectedDev] = useState<MarketplaceDeveloperCard | null>(null);

  const fetchDevelopers = useCallback(async () => {
    if (isGuest) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorBanner(null);
    setAiResultMeta(null);
    try {
      const res = await marketplaceApi.searchDevelopers({
        q: searchQuery.trim() || undefined,
        skills: skillsFilter.trim() || undefined,
        availability: availability || undefined,
        minYears: minYears || undefined,
        maxHourlyRate: maxRate || undefined,
        location: locationFilter.trim() || undefined,
        sort,
        page,
        limit: 12,
      });
      setDevelopers(res.developers);
      setTotalPages(res.pagination.totalPages);
    } catch (err: any) {
      setErrorBanner(err?.message || 'Unable to load marketplace developers.');
    } finally {
      setLoading(false);
    }
  }, [isGuest, searchQuery, skillsFilter, availability, minYears, maxRate, locationFilter, sort, page]);

  useEffect(() => {
    void fetchDevelopers();
  }, [fetchDevelopers]);

  const handleRunAiMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nlPrompt.trim().length < 6) {
      setErrorBanner('Enter at least a short project requirement (6+ characters) for AI matching.');
      return;
    }
    setAiMatching(true);
    setErrorBanner(null);
    try {
      const res = await marketplaceApi.aiMatchDevelopers({
        query: nlPrompt.trim(),
        availability: availability || undefined,
        minYears: minYears ? Number(minYears) : undefined,
        maxHourlyRate: maxRate ? Number(maxRate) : undefined,
        limit: 15,
      });
      setDevelopers(res.developers);
      setTotalPages(1);
      setAiResultMeta({
        disclaimer: res.disclaimer,
        modelName: res.aiModelName,
        mandatorySkills: res.extractedRequirements.mandatorySkills,
        preferredSkills: res.extractedRequirements.preferredSkills,
        scopeSummary: res.extractedRequirements.scopeSummary,
      });
    } catch (err: any) {
      setErrorBanner(err?.message || 'AI talent matching failed.');
    } finally {
      setAiMatching(false);
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
                  Demo Mode — Live Marketplace Talent Directory Restricted
                </h3>
                <p className="text-xs text-amber-100/80 mt-1">
                  DevFlow protects developer privacy and never displays fabricated demo profiles here. Sign in with a verified Client account to search real opted-in developers and run AI Talent Matching.
                </p>
              </div>
            </div>
          )}

          {/* Hero + AI Natural Language Matching */}
          <div className="rounded-2xl bg-gradient-to-br from-[#0F1B33] via-[#0B1426] to-[#0E1E38] border border-blue-500/20 p-6 shadow-xl space-y-5">
            <div className="space-y-2 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[11px] font-semibold uppercase tracking-wider">
                <Brain className="w-3.5 h-3.5" />
                AI-Powered Talent Marketplace
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Find the right developer for your next project
              </h1>
              <p className="text-sm text-slate-300">
                Describe your technical needs in plain language or filter by verified skills, GitHub signals, availability, and hourly budget. Match explanations distinguish GitHub-observed languages from self-declared or resume-stated skills.
              </p>
            </div>

            <form onSubmit={handleRunAiMatch} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Sparkles className="w-4 h-4 text-blue-400 absolute left-3.5 top-3.5" />
                <input
                  value={nlPrompt}
                  onChange={(e) => setNlPrompt(e.target.value)}
                  disabled={isGuest}
                  placeholder='e.g., "Need a senior TypeScript & PostgreSQL engineer with React experience to build milestone APIs"'
                  className="w-full rounded-xl bg-[#070D1A] border border-white/15 pl-10 pr-4 py-3 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={aiMatching || isGuest}
                className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0 shadow-lg shadow-blue-600/25"
              >
                {aiMatching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Match with AI
              </button>
              {aiResultMeta && (
                <button
                  type="button"
                  onClick={() => {
                    setNlPrompt('');
                    void fetchDevelopers();
                  }}
                  className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-slate-200 cursor-pointer shrink-0"
                >
                  Clear AI Match
                </button>
              )}
            </form>

            {/* Structured Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 pt-2 border-t border-white/10">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Keywords..."
                  className="w-full rounded-lg bg-[#070D1A] border border-white/10 pl-8 pr-2.5 py-2 text-xs text-white"
                />
              </div>
              <input
                value={skillsFilter}
                onChange={(e) => {
                  setSkillsFilter(e.target.value);
                  setPage(1);
                }}
                placeholder="Skills (TypeScript, React)"
                className="rounded-lg bg-[#070D1A] border border-white/10 px-2.5 py-2 text-xs text-white"
              />
              <input
                value={locationFilter}
                onChange={(e) => {
                  setLocationFilter(e.target.value);
                  setPage(1);
                }}
                placeholder="Location (Optional)"
                className="rounded-lg bg-[#070D1A] border border-white/10 px-2.5 py-2 text-xs text-white"
              />
              <select
                value={availability}
                onChange={(e) => {
                  setAvailability(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg bg-[#070D1A] border border-white/10 px-2.5 py-2 text-xs text-white"
              >
                <option value="">Any Availability</option>
                <option value="AVAILABLE">Available</option>
                <option value="PARTIALLY_AVAILABLE">Partially Available</option>
              </select>
              <input
                type="number"
                min={0}
                value={minYears}
                onChange={(e) => {
                  setMinYears(e.target.value);
                  setPage(1);
                }}
                placeholder="Min Years Exp"
                className="rounded-lg bg-[#070D1A] border border-white/10 px-2.5 py-2 text-xs text-white"
              />
              <input
                type="number"
                min={0}
                value={maxRate}
                onChange={(e) => {
                  setMaxRate(e.target.value);
                  setPage(1);
                }}
                placeholder="Max Hourly Rate ($)"
                className="rounded-lg bg-[#070D1A] border border-white/10 px-2.5 py-2 text-xs text-white"
              />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as 'completeness' | 'experience' | 'recent')}
                className="rounded-lg bg-[#070D1A] border border-white/10 px-2.5 py-2 text-xs text-white"
              >
                <option value="completeness">Sort: Profile Completeness</option>
                <option value="experience">Sort: Years Experience</option>
                <option value="recent">Sort: Recently Updated</option>
              </select>
            </div>
          </div>

          {errorBanner && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorBanner}</span>
            </div>
          )}

          {aiResultMeta && (
            <div className="rounded-2xl bg-[#0D1424] border border-blue-500/30 p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-blue-300 flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5" />
                  Extracted Technical Signals ({aiResultMeta.modelName})
                </span>
                <span className="text-[11px] text-amber-300 font-medium">
                  Advisory Ranking Only — Final Hiring Decision Belongs to Client
                </span>
              </div>
              <p className="text-xs text-slate-300">{aiResultMeta.scopeSummary}</p>
              <div className="flex flex-wrap gap-2 text-[11px]">
                {aiResultMeta.mandatorySkills.map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-200 border border-blue-500/30">
                    Required: {s}
                  </span>
                ))}
                {aiResultMeta.preferredSkills.map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded bg-white/10 text-slate-300 border border-white/10">
                    Preferred: {s}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">{aiResultMeta.disclaimer}</p>
            </div>
          )}

          {/* Results Grid */}
          {loading ? (
            <div className="rounded-2xl bg-[#0D1424] border border-white/10 p-12 flex items-center justify-center gap-3 text-slate-300 text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
              Discovering marketplace developers...
            </div>
          ) : developers.length === 0 ? (
            <div className="rounded-2xl bg-[#0D1424] border border-white/10 p-12 text-center space-y-3">
              <UserCheck className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-semibold text-white">No Matching Public Developers Found</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Only opted-in developers whose profiles are set to Marketplace or Public visibility appear here. Try broadening your skills or budget filters.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {developers.map((dev) => (
                  <div
                    key={dev.id}
                    className="rounded-2xl bg-[#0D1424] border border-white/10 hover:border-blue-500/40 p-5 flex flex-col justify-between gap-4 transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-white truncate">{dev.displayName}</h3>
                          <p className="text-xs text-blue-300 truncate mt-0.5">
                            {dev.headline || 'Developer Profile'}
                          </p>
                        </div>
                        {dev.match && (
                          <div
                            className={cn(
                              'px-2.5 py-1 rounded-xl border text-xs font-bold font-mono shrink-0',
                              dev.match.insufficientData
                                ? 'bg-slate-800 border-white/10 text-slate-400'
                                : (dev.match.matchScore ?? 0) >= 75
                                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                  : 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                            )}
                          >
                            {dev.match.insufficientData
                              ? 'Insufficient Data'
                              : `${dev.match.matchScore}% Match`}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-200">
                          {dev.availability.replace(/_/g, ' ')}
                        </span>
                        {dev.yearsOfExperience !== null && (
                          <span>{dev.yearsOfExperience} yrs exp</span>
                        )}
                        {(dev.hourlyRateMin || dev.hourlyRateMax) && (
                          <span className="text-emerald-300 font-mono">
                            ${dev.hourlyRateMin ?? '?'}-{dev.hourlyRateMax ?? '?'}/hr
                          </span>
                        )}
                        {dev.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {dev.location}
                          </span>
                        )}
                      </div>

                      {dev.summary && (
                        <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                          {dev.summary}
                        </p>
                      )}

                      {/* Skill Provenance Badges */}
                      <div className="flex flex-wrap gap-1.5">
                        {dev.skills.slice(0, 7).map((sk) => (
                          <span
                            key={sk.id}
                            title={`Source: ${sk.source.replace(/_/g, ' ')}`}
                            className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] border font-medium',
                              sk.source === 'GITHUB_OBSERVED'
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                : sk.source === 'RESUME_EXTRACTED'
                                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                                  : 'bg-white/5 border-white/15 text-slate-300'
                            )}
                          >
                            {sk.name}
                          </span>
                        ))}
                      </div>

                      {/* Explainable AI Assessment Summary */}
                      {dev.match && (
                        <div className="rounded-xl bg-[#080E1B] border border-white/10 p-3 space-y-1.5 text-[11px]">
                          <p className="text-slate-300">{dev.match.explanation}</p>
                          {dev.match.missingSkills.length > 0 && (
                            <p className="text-amber-300/90">
                              Missing / unstated: {dev.match.missingSkills.join(', ')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        {dev.githubUsername && (
                          <span className="inline-flex items-center gap-1 text-emerald-300">
                            <GitBranch className="w-3.5 h-3.5" /> @{dev.githubUsername}
                          </span>
                        )}
                        <span>Completeness {dev.completenessScore}%</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedDev(dev)}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
                      >
                        Inspect Profile
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-4">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg bg-white/5 text-xs text-white disabled:opacity-40 cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-slate-400 font-mono">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 rounded-lg bg-white/5 text-xs text-white disabled:opacity-40 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Candidate Detail Drawer */}
      {selectedDev && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xl bg-[#0B1221] border-l border-white/10 h-full overflow-y-auto p-6 space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedDev.displayName}</h2>
                <p className="text-xs text-blue-300 mt-0.5">{selectedDev.headline || 'Developer'}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDev(null)}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedDev.summary && (
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Summary</h4>
                <p className="text-xs text-slate-200 leading-relaxed">{selectedDev.summary}</p>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Skills by Provenance
              </h4>
              <div className="space-y-2 text-xs">
                {selectedDev.skills.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg bg-[#080E1B] border border-white/10 px-3 py-2"
                  >
                    <span className="font-medium text-white">{s.name}</span>
                    <span
                      className={cn(
                        'text-[10px] font-mono px-2 py-0.5 rounded-full border',
                        s.source === 'GITHUB_OBSERVED'
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                          : s.source === 'RESUME_EXTRACTED'
                            ? 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                            : 'bg-white/10 border-white/15 text-slate-300'
                      )}
                    >
                      {s.source === 'GITHUB_OBSERVED'
                        ? 'GitHub Observed'
                        : s.source === 'RESUME_EXTRACTED'
                          ? 'Resume Stated (User Confirmed)'
                          : 'Self Declared'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {selectedDev.portfolioProjects.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Portfolio Projects
                </h4>
                <div className="space-y-2">
                  {selectedDev.portfolioProjects.map((p, i) => (
                    <div key={p.id || i} className="rounded-xl bg-[#080E1B] border border-white/10 p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{p.title}</span>
                        {p.projectUrl && (
                          <a
                            href={p.projectUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-blue-400 inline-flex items-center gap-1"
                          >
                            Link <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-slate-300">{p.summary}</p>
                      {p.technologies.length > 0 && (
                        <p className="text-[10px] font-mono text-blue-300">
                          {p.technologies.join(' · ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              {selectedDev.githubProfileUrl && (
                <a
                  href={selectedDev.githubProfileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-200 inline-flex items-center gap-1.5"
                >
                  <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
                  GitHub Profile
                </a>
              )}
              {selectedDev.portfolioUrl && (
                <a
                  href={selectedDev.portfolioUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-200 inline-flex items-center gap-1.5"
                >
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  Portfolio
                </a>
              )}
              {selectedDev.match && !selectedDev.match.insufficientData && (
                <div className="w-full rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Publish an opportunity in Talent Pipeline to receive formal applications and consented resume downloads.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FindDevelopersPage;
