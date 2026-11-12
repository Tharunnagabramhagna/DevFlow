import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { Header } from '@/components/layout/Header';
import { resumeApi } from '@/services/api';
import {
  DeveloperAvailabilityType,
  DeveloperResumeRecord,
  DeveloperSkillItem,
  DeveloperStudioState,
  PortfolioProjectItem,
  ProfileVisibilityType,
  StructuredResumePreviewDocument,
} from '@/types';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Code2,
  Download,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  FileUp,
  FolderGit2,
  GitBranch,
  Layers,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  UploadCloud,
  UserCheck,
  X,
} from 'lucide-react';
import { cn } from '@/utils/cn';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt'];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const CareerProfilePage: React.FC = () => {
  const { isGuest } = useAuth();
  const { openMobileSidebar } = useSidebar();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortUploadRef = useRef<(() => void) | null>(null);

  const [activeTab, setActiveTab] = useState<'studio' | 'profile' | 'templates'>('studio');
  const [studio, setStudio] = useState<DeveloperStudioState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Drag & Drop Upload State
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lastFailedFile, setLastFailedFile] = useState<File | null>(null);
  const [replaceTargetId, setReplaceTargetId] = useState<string>('');
  const [selectedResume, setSelectedResume] = useState<DeveloperResumeRecord | null>(null);

  // Review Extracted Data State
  const [reviewHeadline, setReviewHeadline] = useState('');
  const [reviewSummary, setReviewSummary] = useState('');
  const [reviewYears, setReviewYears] = useState<string>('');
  const [reviewApprovedSkills, setReviewApprovedSkills] = useState<Set<string>>(new Set());

  // Career Profile Form State
  const [displayName, setDisplayName] = useState('');
  const [headline, setHeadline] = useState('');
  const [summary, setSummary] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState<string>('');
  const [availability, setAvailability] = useState<DeveloperAvailabilityType>('AVAILABLE');
  const [visibility, setVisibility] = useState<ProfileVisibilityType>('MARKETPLACE');
  const [hourlyRateMin, setHourlyRateMin] = useState('');
  const [hourlyRateMax, setHourlyRateMax] = useState('');
  const [location, setLocation] = useState('');
  const [timezone, setTimezone] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [allowClientResumeDownload, setAllowClientResumeDownload] = useState(false);
  const [showPortfolioToClients, setShowPortfolioToClients] = useState(true);
  const [shareGitHubRepos, setShareGitHubRepos] = useState(true);

  const [skills, setSkills] = useState<DeveloperSkillItem[]>([]);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState('language');

  const [portfolioProjects, setPortfolioProjects] = useState<PortfolioProjectItem[]>([]);
  const [newProjTitle, setNewProjTitle] = useState('');
  const [newProjSummary, setNewProjSummary] = useState('');
  const [newProjTech, setNewProjTech] = useState('');
  const [newProjUrl, setNewProjUrl] = useState('');

  // ATS Templates Studio State
  const [selectedTemplateId, setSelectedTemplateId] = useState('software-engineer');
  const [customHeadline, setCustomHeadline] = useState('');
  const [customSummary, setCustomSummary] = useState('');
  const [templatePreview, setTemplatePreview] = useState<StructuredResumePreviewDocument | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<'pdf' | 'docx' | null>(null);

  const hydrateFromStudio = useCallback((state: DeveloperStudioState) => {
    setStudio(state);
    const p = state.profile;
    setDisplayName(p.displayName || '');
    setHeadline(p.headline || '');
    setSummary(p.summary || '');
    setYearsOfExperience(
      p.yearsOfExperience !== null && p.yearsOfExperience !== undefined
        ? String(p.yearsOfExperience)
        : ''
    );
    setAvailability(p.availability || 'AVAILABLE');
    setVisibility(p.visibility || 'MARKETPLACE');
    setHourlyRateMin(p.hourlyRateMin !== null ? String(p.hourlyRateMin) : '');
    setHourlyRateMax(p.hourlyRateMax !== null ? String(p.hourlyRateMax) : '');
    setLocation(p.location || '');
    setTimezone(p.timezone || '');
    setPortfolioUrl(p.portfolioUrl || '');
    setLinkedinUrl(p.linkedinUrl || '');
    setAllowClientResumeDownload(Boolean(p.allowClientResumeDownload));
    setShowPortfolioToClients(Boolean(p.showPortfolioToClients));
    setShareGitHubRepos(Boolean(p.shareGitHubRepos));
    setSkills(p.skills || []);
    setPortfolioProjects(p.portfolioProjects || []);

    if (state.resumes.length > 0) {
      const preferred = state.resumes.find((r) => r.isPrimary) || state.resumes[0];
      setSelectedResume((prev) => {
        const match = prev ? state.resumes.find((r) => r.id === prev.id) : null;
        return match || preferred;
      });
    } else {
      setSelectedResume(null);
    }
  }, []);

  const loadStudio = useCallback(async () => {
    if (isGuest) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorBanner(null);
    try {
      const { state } = await resumeApi.getStudioState();
      hydrateFromStudio(state);
    } catch (err: any) {
      setErrorBanner(err?.message || 'Unable to load Developer Resume Studio.');
    } finally {
      setLoading(false);
    }
  }, [isGuest, hydrateFromStudio]);

  useEffect(() => {
    loadStudio();
  }, [loadStudio]);

  useEffect(() => {
    if (!selectedResume?.parsedJson) return;
    const pj = selectedResume.parsedJson;
    setReviewHeadline(pj.headline || '');
    setReviewSummary(pj.summary || '');
    setReviewYears(
      pj.yearsOfExperience !== null && pj.yearsOfExperience !== undefined
        ? String(pj.yearsOfExperience)
        : ''
    );
    setReviewApprovedSkills(
      new Set((pj.skills || []).map((s) => s.name))
    );
  }, [selectedResume]);

  const validateClientFile = (file: File): string | null => {
    const ext = file.name.includes('.') ? `.${file.name.split('.').pop()!.toLowerCase()}` : '';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Unsupported file extension "${ext || 'none'}". Only PDF (.pdf), Word (.docx), and Plain Text (.txt) are supported.`;
    }
    if (file.size === 0) {
      return 'Selected file is empty (0 bytes).';
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return `File size (${formatBytes(file.size)}) exceeds the 5 MB limit.`;
    }
    return null;
  };

  const executeUpload = async (file: File, allowDuplicate = false) => {
    const validationErr = validateClientFile(file);
    if (validationErr) {
      setUploadError(validationErr);
      return;
    }

    setUploading(true);
    setUploadError(null);
    setErrorBanner(null);
    setSuccessBanner(null);
    setUploadProgress(5);
    setLastFailedFile(null);

    try {
      const res = await resumeApi.uploadResumeWithProgress({
        file,
        replaceResumeId: replaceTargetId || undefined,
        allowDuplicate,
        onProgress: setUploadProgress,
        onAbortReady: (abortFn) => {
          abortUploadRef.current = abortFn;
        },
      });
      setReplaceTargetId('');
      setSelectedResume(res.resume);
      await loadStudio();
      setSuccessBanner(
        `Uploaded "${res.resume.fileName}" (${res.resume.parseStatus}). Review extracted details below before saving to your public profile.`
      );
    } catch (err: any) {
      if (err?.code === 'ABORTED') {
        setUploadError('Upload cancelled before completion.');
      } else {
        setLastFailedFile(file);
        setUploadError(err?.message || 'Resume upload failed.');
      }
    } finally {
      setUploading(false);
      abortUploadRef.current = null;
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (uploading || isGuest) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void executeUpload(file);
  };

  const handleConfirmExtractionReview = async () => {
    if (!selectedResume) return;
    setSaving(true);
    setErrorBanner(null);
    setSuccessBanner(null);
    try {
      const pj = selectedResume.parsedJson;
      const updated = await resumeApi.reviewAndApplyResumeExtraction(selectedResume.id, {
        applyToProfile: true,
        headline: reviewHeadline.trim() || undefined,
        summary: reviewSummary.trim() || undefined,
        yearsOfExperience: reviewYears ? Number(reviewYears) : undefined,
        approvedSkills: (pj?.skills || [])
          .filter((s) => reviewApprovedSkills.has(s.name))
          .map((s) => ({
            name: s.name,
            category: s.category,
            yearsUsed: s.yearsUsed ?? null,
            sourceExcerpt: s.sourceExcerpt ?? null,
          })),
        approvedProjects: (pj?.projects || []).map((p) => ({
          title: p.title,
          summary: p.summary,
          role: p.role ?? null,
          technologies: p.technologies || [],
          url: p.url ?? null,
        })),
      });
      hydrateFromStudio(updated);
      setSuccessBanner('Resume extraction reviewed, confirmed, and merged into your Developer Profile.');
    } catch (err: any) {
      setErrorBanner(err?.message || 'Failed to apply reviewed extraction.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async (
    skillsOverride?: DeveloperSkillItem[],
    projectsOverride?: PortfolioProjectItem[]
  ) => {
    setSaving(true);
    setErrorBanner(null);
    setSuccessBanner(null);
    try {
      const currentSkills = skillsOverride ?? skills;
      const currentProjects = projectsOverride ?? portfolioProjects;
      const updated = await resumeApi.updateCareerProfile({
        displayName: displayName.trim() || undefined,
        headline: headline.trim() || null,
        summary: summary.trim() || null,
        yearsOfExperience: yearsOfExperience !== '' ? Number(yearsOfExperience) : null,
        availability,
        visibility,
        hourlyRateMin: hourlyRateMin !== '' ? Number(hourlyRateMin) : null,
        hourlyRateMax: hourlyRateMax !== '' ? Number(hourlyRateMax) : null,
        location: location.trim() || null,
        timezone: timezone.trim() || null,
        portfolioUrl: portfolioUrl.trim() || null,
        linkedinUrl: linkedinUrl.trim() || null,
        allowClientResumeDownload,
        showPortfolioToClients,
        shareGitHubRepos,
        selfDeclaredSkills: currentSkills
          .filter((s) => s.source === 'SELF_DECLARED')
          .map((s) => ({
            name: s.name,
            category: s.category,
            yearsUsed: s.yearsUsed,
          })),
        portfolioProjects: currentProjects.map((p) => ({
          id: p.id,
          title: p.title,
          summary: p.summary,
          role: p.role,
          technologies: p.technologies,
          projectUrl: p.projectUrl,
          repoFullName: p.repoFullName,
          isPublic: p.isPublic,
        })),
      });
      hydrateFromStudio(updated);
      setSuccessBanner('Career profile and visibility settings saved.');
    } catch (err: any) {
      setErrorBanner(err?.message || 'Failed to save career profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSelfSkill = () => {
    const clean = newSkillName.trim();
    if (!clean) return;
    if (skills.some((s) => s.normalizedName === clean.toLowerCase())) {
      setErrorBanner(`"${clean}" is already listed in your skills.`);
      return;
    }
    const added: DeveloperSkillItem = {
      id: `temp-${Date.now()}`,
      name: clean,
      normalizedName: clean.toLowerCase(),
      category: newSkillCategory,
      source: 'SELF_DECLARED',
      yearsUsed: null,
      confidence: 100,
      sourceExcerpt: null,
      isApproved: true,
    };
    const nextSkills = [...skills, added];
    setSkills(nextSkills);
    setNewSkillName('');
    void handleSaveProfile(nextSkills, portfolioProjects);
  };

  const handleRemoveSelfSkill = (normalizedName: string) => {
    const nextSkills = skills.filter(
      (s) => !(s.source === 'SELF_DECLARED' && s.normalizedName === normalizedName)
    );
    setSkills(nextSkills);
    void handleSaveProfile(nextSkills, portfolioProjects);
  };

  const handleAddPortfolioProject = () => {
    if (!newProjTitle.trim() || newProjSummary.trim().length < 10) {
      setErrorBanner('Project title and a concise summary (at least 10 characters) are required.');
      return;
    }
    const created: PortfolioProjectItem = {
      title: newProjTitle.trim(),
      summary: newProjSummary.trim(),
      role: 'Developer',
      technologies: newProjTech
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      projectUrl: newProjUrl.trim() || null,
      repoFullName: null,
      isPublic: true,
    };
    const nextProjects = [...portfolioProjects, created];
    setPortfolioProjects(nextProjects);
    setNewProjTitle('');
    setNewProjSummary('');
    setNewProjTech('');
    setNewProjUrl('');
    void handleSaveProfile(skills, nextProjects);
  };

  const handleGeneratePreview = useCallback(async () => {
    if (isGuest) return;
    setPreviewLoading(true);
    setErrorBanner(null);
    try {
      const doc = await resumeApi.previewTemplateResume(selectedTemplateId, {
        headline: customHeadline.trim() || undefined,
        summary: customSummary.trim() || undefined,
      });
      setTemplatePreview(doc);
    } catch (err: any) {
      setErrorBanner(err?.message || 'Unable to generate ATS template preview.');
    } finally {
      setPreviewLoading(false);
    }
  }, [isGuest, selectedTemplateId, customHeadline, customSummary]);

  useEffect(() => {
    if (activeTab === 'templates' && !isGuest && studio) {
      void handleGeneratePreview();
    }
  }, [activeTab, isGuest, studio, selectedTemplateId, handleGeneratePreview]);

  const handleExport = async (format: 'pdf' | 'docx') => {
    setExportingFormat(format);
    setErrorBanner(null);
    try {
      await resumeApi.exportFormattedResume(selectedTemplateId, format, {
        headline: customHeadline.trim() || undefined,
        summary: customSummary.trim() || undefined,
      });
      setSuccessBanner(`Generated and downloaded ATS-friendly ${format.toUpperCase()} resume.`);
    } catch (err: any) {
      setErrorBanner(err?.message || `Failed to export ${format.toUpperCase()}.`);
    } finally {
      setExportingFormat(null);
    }
  };

  const selfDeclaredSkills = skills.filter((s) => s.source === 'SELF_DECLARED');
  const resumeExtractedSkills = skills.filter((s) => s.source === 'RESUME_EXTRACTED');
  const githubObservedSkills = skills.filter((s) => s.source === 'GITHUB_OBSERVED');

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
      <Header onOpenMobileMenu={openMobileSidebar} />

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto space-y-6 pb-12">
          {/* Guest Read-Only Notice */}
          {isGuest && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 flex items-start gap-3">
              <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-amber-200">
                  Demo Session — Developer Resume Studio Locked
                </h3>
                <p className="text-xs text-amber-100/80 mt-1">
                  Resume uploads, private file encryption/storage, AI extraction, and database-backed career profiles are restricted to signed-in Developer accounts. Create or sign in as a Developer to build your real profile.
                </p>
              </div>
            </div>
          )}

          {/* Hero Banner + Completeness Meter */}
          <div className="rounded-2xl bg-gradient-to-br from-[#0F1B33] via-[#0B1426] to-[#0E1E38] border border-blue-500/20 p-6 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[11px] font-semibold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  Developer Career Profile & Resume Studio
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Build your professional developer profile
                </h1>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Upload your resume and let DevFlow&apos;s AI understand your skills, experience and expertise to help you discover better project opportunities. All AI-parsed details require your explicit review before appearing in the marketplace.
                </p>
              </div>

              <div className="w-full lg:w-80 rounded-xl bg-[#070D1A]/80 border border-white/10 p-4 space-y-3 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Profile Completeness
                  </span>
                  <span className="text-lg font-bold font-mono text-emerald-400">
                    {studio?.profile.completenessScore ?? 0}%
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-500"
                    style={{ width: `${studio?.profile.completenessScore ?? 0}%` }}
                  />
                </div>
                <div className="space-y-1.5 pt-1">
                  {(studio?.profile.completenessBreakdown || []).slice(0, 4).map((item) => (
                    <div key={item.label} className="flex items-center justify-between text-[11px]">
                      <span className={cn('truncate pr-2', item.completed ? 'text-slate-200' : 'text-slate-500')}>
                        {item.completed ? '✓' : '○'} {item.label}
                      </span>
                      <span className="font-mono text-slate-400 shrink-0">+{item.weight}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sub-navigation Tabs */}
            <div className="flex flex-wrap items-center gap-2 mt-6 pt-5 border-t border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab('studio')}
                className={cn(
                  'px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer',
                  activeTab === 'studio'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                )}
              >
                <FileUp className="w-4 h-4" />
                Resume Upload & AI Review
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={cn(
                  'px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer',
                  activeTab === 'profile'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                )}
              >
                <UserCheck className="w-4 h-4" />
                Skills, GitHub & Privacy
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('templates')}
                className={cn(
                  'px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer',
                  activeTab === 'templates'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                )}
              >
                <FileSpreadsheet className="w-4 h-4" />
                ATS Resume Templates (8)
              </button>
            </div>
          </div>

          {errorBanner && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200 flex items-center justify-between gap-3">
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
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200 flex items-center justify-between gap-3">
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
              Loading your Resume Studio...
            </div>
          ) : (
            <>
              {/* TAB 1: UPLOAD, HISTORY & EXTRACTION REVIEW */}
              {activeTab === 'studio' && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                  {/* Left: Dropzone + History */}
                  <div className="xl:col-span-5 space-y-6">
                    <div className="rounded-2xl bg-[#0D1424] border border-white/10 p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-white">Upload Resume</h2>
                        <span className="text-[11px] font-mono text-slate-400">
                          PDF · DOCX · TXT (Max 5 MB)
                        </span>
                      </div>

                      {replaceTargetId && (
                        <div className="rounded-xl bg-blue-500/10 border border-blue-500/30 px-3 py-2 text-xs text-blue-200 flex items-center justify-between">
                          <span>Replacing selected resume version</span>
                          <button
                            type="button"
                            onClick={() => setReplaceTargetId('')}
                            className="text-blue-300 hover:text-white underline cursor-pointer"
                          >
                            Cancel replace
                          </button>
                        </div>
                      )}

                      <div
                        role="button"
                        tabIndex={0}
                        aria-label="Drag and drop resume file or press Enter to browse"
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (!isGuest && !uploading) setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        onKeyDown={(e) => {
                          if ((e.key === 'Enter' || e.key === ' ') && !isGuest && !uploading) {
                            e.preventDefault();
                            fileInputRef.current?.click();
                          }
                        }}
                        className={cn(
                          'rounded-2xl border-2 border-dashed p-6 text-center transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500',
                          isDragging
                            ? 'border-blue-400 bg-blue-500/10 scale-[1.01]'
                            : 'border-white/15 bg-[#080E1B] hover:border-blue-500/50',
                          isGuest && 'opacity-50 pointer-events-none'
                        )}
                        onClick={() => !uploading && !isGuest && fileInputRef.current?.click()}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.docx,.txt"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void executeUpload(f);
                            e.currentTarget.value = '';
                          }}
                        />
                        <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400 mb-3">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-semibold text-white">
                          Drag & drop your resume here
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          or click to browse files from your device
                        </p>
                        <div className="flex items-center justify-center gap-2 mt-4">
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-slate-300">
                            .PDF
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-slate-300">
                            .DOCX
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-slate-300">
                            .TXT
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-3">
                          Legacy <code className="text-slate-400">.doc</code> and executable/script files are blocked. Files are stored privately and never exposed via public URLs.
                        </p>
                      </div>

                      {/* Progress Bar & Cancel/Retry */}
                      {uploading && (
                        <div className="rounded-xl bg-[#080E1B] border border-blue-500/30 p-3 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-blue-300 flex items-center gap-2">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Validating signature & running AI parser...
                            </span>
                            <span className="font-mono text-slate-300">{uploadProgress}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-blue-500 transition-all"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => abortUploadRef.current?.()}
                            className="text-[11px] text-rose-400 hover:text-rose-300 underline cursor-pointer"
                          >
                            Cancel Upload
                          </button>
                        </div>
                      )}

                      {uploadError && (
                        <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-200 space-y-2">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                            <span>{uploadError}</span>
                          </div>
                          {lastFailedFile && (
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => void executeUpload(lastFailedFile, false)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" />
                                Retry Upload
                              </button>
                              {uploadError.includes('already uploaded') && (
                                <button
                                  type="button"
                                  onClick={() => void executeUpload(lastFailedFile, true)}
                                  className="text-[11px] text-amber-300 underline cursor-pointer"
                                >
                                  Upload Copy Anyway
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Upload History */}
                    <div className="rounded-2xl bg-[#0D1424] border border-white/10 p-5 space-y-3">
                      <h2 className="text-sm font-semibold text-white">
                        Upload History ({studio?.resumes.length ?? 0})
                      </h2>
                      {!studio || studio.resumes.length === 0 ? (
                        <p className="text-xs text-slate-400 py-4 text-center">
                          No resumes uploaded yet. Upload your PDF, DOCX, or TXT file above.
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          {studio.resumes.map((res) => (
                            <div
                              key={res.id}
                              onClick={() => setSelectedResume(res)}
                              className={cn(
                                'rounded-xl border p-3.5 transition-all cursor-pointer',
                                selectedResume?.id === res.id
                                  ? 'border-blue-500/60 bg-blue-500/10'
                                  : 'border-white/10 bg-[#080E1B] hover:border-white/25'
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                                    <span className="text-xs font-semibold text-white truncate">
                                      {res.fileName}
                                    </span>
                                    {res.isPrimary && (
                                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-semibold text-emerald-300 shrink-0">
                                        PRIMARY
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-400 mt-1">
                                    {formatBytes(res.fileSizeBytes)} · Status:{' '}
                                    <span className="text-slate-200 font-medium">{res.parseStatus}</span>
                                    {res.confidenceScore !== null && ` · Confidence ${Math.round(res.confidenceScore)}%`}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    title="Download private resume"
                                    onClick={() => void resumeApi.downloadResumeFile(res.id, res.fileName)}
                                    className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 cursor-pointer"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    title="Replace this resume version"
                                    onClick={() => {
                                      setReplaceTargetId(res.id);
                                      fileInputRef.current?.click();
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 cursor-pointer"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                  </button>
                                  {!res.isPrimary && (
                                    <button
                                      type="button"
                                      title="Set as primary resume"
                                      onClick={async () => {
                                        const st = await resumeApi.setPrimaryResume(res.id);
                                        hydrateFromStudio(st);
                                      }}
                                      className="p-1.5 rounded-lg hover:bg-white/10 text-amber-300 cursor-pointer"
                                    >
                                      <Star className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    title="Delete resume"
                                    onClick={async () => {
                                      await resumeApi.deleteResume(res.id);
                                      await loadStudio();
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: AI Extraction Review & Source Preview */}
                  <div className="xl:col-span-7 space-y-6">
                    {selectedResume ? (
                      <div className="rounded-2xl bg-[#0D1424] border border-white/10 p-6 space-y-5">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                          <div>
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                              <FileCheck2 className="w-5 h-5 text-blue-400" />
                              AI Extraction Review: {selectedResume.fileName}
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                              Verify extracted items against your source document. Nothing becomes visible to clients until confirmed.
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={async () => {
                              setSaving(true);
                              try {
                                const reparsed = await resumeApi.reparseResume(selectedResume.id);
                                setSelectedResume(reparsed);
                                await loadStudio();
                              } catch (err: any) {
                                setErrorBanner(err?.message || 'Re-parse failed.');
                              } finally {
                                setSaving(false);
                              }
                            }}
                            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Re-run AI Extraction
                          </button>
                        </div>

                        {selectedResume.lowConfidenceFields.length > 0 && (
                          <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs text-amber-200 flex items-start gap-2.5">
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold">Low-Confidence Fields Detected:</span>{' '}
                              {selectedResume.lowConfidenceFields.join(', ')}. Please review and correct these manually below before confirming.
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                              Extracted Headline
                            </label>
                            <input
                              value={reviewHeadline}
                              onChange={(e) => setReviewHeadline(e.target.value)}
                              placeholder="e.g., Senior Full-Stack TypeScript Engineer"
                              className="w-full rounded-xl bg-[#070D1A] border border-white/10 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                              Years of Experience
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={60}
                              value={reviewYears}
                              onChange={(e) => setReviewYears(e.target.value)}
                              className="w-full rounded-xl bg-[#070D1A] border border-white/10 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                            Extracted Summary
                          </label>
                          <textarea
                            rows={3}
                            value={reviewSummary}
                            onChange={(e) => setReviewSummary(e.target.value)}
                            className="w-full rounded-xl bg-[#070D1A] border border-white/10 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                          />
                        </div>

                        {/* Extracted Skills with Evidence Quotes */}
                        <div>
                          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                            Extracted Skills ({selectedResume.parsedJson?.skills?.length ?? 0}) — Select to Approve
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(selectedResume.parsedJson?.skills || []).map((sk) => {
                              const checked = reviewApprovedSkills.has(sk.name);
                              return (
                                <label
                                  key={sk.name}
                                  className={cn(
                                    'rounded-xl border p-2.5 flex items-start gap-2.5 cursor-pointer text-xs',
                                    checked
                                      ? 'border-blue-500/40 bg-blue-500/10'
                                      : 'border-white/10 bg-[#080E1B] opacity-70'
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const next = new Set(reviewApprovedSkills);
                                      if (e.target.checked) next.add(sk.name);
                                      else next.delete(sk.name);
                                      setReviewApprovedSkills(next);
                                    }}
                                    className="mt-0.5 rounded accent-blue-500"
                                  />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-white">{sk.name}</span>
                                      <span className="text-[10px] font-mono text-slate-400">
                                        {Math.round(sk.confidence)}%
                                      </span>
                                    </div>
                                    {sk.sourceExcerpt && (
                                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                        &ldquo;{sk.sourceExcerpt}&rdquo;
                                      </p>
                                    )}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
                          <span className="text-[11px] text-slate-400">
                            {selectedResume.reviewedByUser
                              ? '✓ Reviewed & Confirmed by Developer'
                              : 'Pending Developer Review Confirmation'}
                          </span>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={handleConfirmExtractionReview}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            {saving ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                            Confirm & Apply Reviewed Extraction
                          </button>
                        </div>

                        {selectedResume.extractedTextPreview && (
                          <details className="rounded-xl bg-[#070D1A] border border-white/10 p-3">
                            <summary className="text-xs font-semibold text-slate-300 cursor-pointer flex items-center gap-2">
                              <Eye className="w-3.5 h-3.5 text-blue-400" />
                              Inspect Extracted Raw Document Text
                            </summary>
                            <pre className="mt-3 text-[11px] text-slate-400 whitespace-pre-wrap font-mono max-h-56 overflow-y-auto">
                              {selectedResume.extractedTextPreview}
                            </pre>
                          </details>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-[#0D1424] border border-white/10 p-10 text-center space-y-3">
                        <FileText className="w-10 h-10 text-slate-600 mx-auto" />
                        <h3 className="text-sm font-semibold text-white">No Resume Selected</h3>
                        <p className="text-xs text-slate-400 max-w-md mx-auto">
                          Upload a PDF, DOCX, or TXT resume on the left to inspect parsed skills, career timeline excerpts, and profile review controls.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: SKILLS PROVENANCE, GITHUB SYNC, PORTFOLIO & PRIVACY */}
              {activeTab === 'profile' && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                  {/* Profile Details & Privacy Controls */}
                  <div className="xl:col-span-7 rounded-2xl bg-[#0D1424] border border-white/10 p-6 space-y-5">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <h2 className="text-base font-bold text-white">
                        Career Profile & Marketplace Visibility
                      </h2>
                      <button
                        type="button"
                        disabled={saving || isGuest}
                        onClick={() => void handleSaveProfile()}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Save Changes
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                          Display Name
                        </label>
                        <input
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="w-full rounded-xl bg-[#070D1A] border border-white/10 px-3 py-2 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                          Years of Experience
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={60}
                          value={yearsOfExperience}
                          onChange={(e) => setYearsOfExperience(e.target.value)}
                          className="w-full rounded-xl bg-[#070D1A] border border-white/10 px-3 py-2 text-xs text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                        Professional Headline
                      </label>
                      <input
                        value={headline}
                        onChange={(e) => setHeadline(e.target.value)}
                        placeholder="e.g., Full-Stack TypeScript & PostgreSQL Engineer"
                        className="w-full rounded-xl bg-[#070D1A] border border-white/10 px-3 py-2 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                        Career Summary
                      </label>
                      <textarea
                        rows={4}
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        placeholder="Summarize your technical specialties, architectural work, and delivery track record..."
                        className="w-full rounded-xl bg-[#070D1A] border border-white/10 px-3 py-2 text-xs text-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                          Availability
                        </label>
                        <select
                          value={availability}
                          onChange={(e) => setAvailability(e.target.value as DeveloperAvailabilityType)}
                          className="w-full rounded-xl bg-[#070D1A] border border-white/10 px-3 py-2 text-xs text-white"
                        >
                          <option value="AVAILABLE">Available Immediately</option>
                          <option value="PARTIALLY_AVAILABLE">Partially Available</option>
                          <option value="UNAVAILABLE">Unavailable</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                          Min Hourly Rate (USD)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={hourlyRateMin}
                          onChange={(e) => setHourlyRateMin(e.target.value)}
                          className="w-full rounded-xl bg-[#070D1A] border border-white/10 px-3 py-2 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                          Max Hourly Rate (USD)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={hourlyRateMax}
                          onChange={(e) => setHourlyRateMax(e.target.value)}
                          className="w-full rounded-xl bg-[#070D1A] border border-white/10 px-3 py-2 text-xs text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                          Location (Optional)
                        </label>
                        <input
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="e.g., Remote / Bengaluru"
                          className="w-full rounded-xl bg-[#070D1A] border border-white/10 px-3 py-2 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                          Timezone (Optional)
                        </label>
                        <input
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          placeholder="e.g., UTC+5:30 / EST"
                          className="w-full rounded-xl bg-[#070D1A] border border-white/10 px-3 py-2 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                          Portfolio URL
                        </label>
                        <input
                          value={portfolioUrl}
                          onChange={(e) => setPortfolioUrl(e.target.value)}
                          placeholder="https://..."
                          className="w-full rounded-xl bg-[#070D1A] border border-white/10 px-3 py-2 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                          LinkedIn URL
                        </label>
                        <input
                          value={linkedinUrl}
                          onChange={(e) => setLinkedinUrl(e.target.value)}
                          placeholder="https://linkedin.com/in/..."
                          className="w-full rounded-xl bg-[#070D1A] border border-white/10 px-3 py-2 text-xs text-white"
                        />
                      </div>
                    </div>

                    {/* Explicit Privacy Controls */}
                    <div className="rounded-xl bg-[#080E1B] border border-white/10 p-4 space-y-3">
                      <h3 className="text-xs font-semibold text-white flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        Privacy & Client Consent Controls
                      </h3>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                          Profile Visibility
                        </label>
                        <select
                          value={visibility}
                          onChange={(e) => setVisibility(e.target.value as ProfileVisibilityType)}
                          className="w-full rounded-xl bg-[#070D1A] border border-white/10 px-3 py-2 text-xs text-white"
                        >
                          <option value="PRIVATE">Private — Hidden from Marketplace Search</option>
                          <option value="MARKETPLACE">Marketplace Only — Visible to Clients</option>
                          <option value="PUBLIC">Public — Discoverable Across DevFlow</option>
                        </select>
                      </div>
                      <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allowClientResumeDownload}
                          onChange={(e) => setAllowClientResumeDownload(e.target.checked)}
                          className="accent-blue-500"
                        />
                        Allow marketplace clients to download my primary resume globally (otherwise only shared per application when consented)
                      </label>
                      <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showPortfolioToClients}
                          onChange={(e) => setShowPortfolioToClients(e.target.checked)}
                          className="accent-blue-500"
                        />
                        Show public portfolio projects on my client profile
                      </label>
                      <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={shareGitHubRepos}
                          onChange={(e) => setShareGitHubRepos(e.target.checked)}
                          className="accent-blue-500"
                        />
                        Display connected GitHub handle and observed repository languages
                      </label>
                    </div>
                  </div>

                  {/* Right: Categorized Skills + GitHub Sync + Portfolio */}
                  <div className="xl:col-span-5 space-y-6">
                    {/* GitHub Observed Sync Card */}
                    <div className="rounded-2xl bg-[#0D1424] border border-white/10 p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                          <GitBranch className="w-4 h-4 text-emerald-400" />
                          GitHub Observed Signals
                        </h3>
                        <button
                          type="button"
                          disabled={saving || isGuest || !studio?.profile.githubConnected}
                          onClick={async () => {
                            setSaving(true);
                            try {
                              const st = await resumeApi.syncGitHubSkills();
                              hydrateFromStudio(st);
                              setSuccessBanner('Synced public GitHub repository languages into your career profile.');
                            } catch (err: any) {
                              setErrorBanner(err?.message || 'GitHub sync failed.');
                            } finally {
                              setSaving(false);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-xs font-semibold text-emerald-300 disabled:opacity-40 cursor-pointer"
                        >
                          Sync GitHub Languages
                        </button>
                      </div>
                      <p className="text-xs text-slate-400">
                        {studio?.profile.githubConnected
                          ? `Connected as @${studio.profile.githubUsername} (${studio.githubRepositories.length} repositories inspected).`
                          : 'Connect GitHub under Integrations to observe real repository languages.'}
                      </p>

                      {/* Strictly Categorized Skill Groups */}
                      <div className="space-y-3 pt-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                            GitHub-Observed Languages ({githubObservedSkills.length})
                          </span>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {githubObservedSkills.length === 0 ? (
                              <span className="text-[11px] text-slate-500">None synced yet</span>
                            ) : (
                              githubObservedSkills.map((s) => (
                                <span
                                  key={s.id}
                                  className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] text-emerald-300"
                                >
                                  {s.name}
                                </span>
                              ))
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                            Resume-Extracted (User-Confirmed) ({resumeExtractedSkills.length})
                          </span>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {resumeExtractedSkills.length === 0 ? (
                              <span className="text-[11px] text-slate-500">Confirm a parsed resume to populate</span>
                            ) : (
                              resumeExtractedSkills.map((s) => (
                                <span
                                  key={s.id}
                                  className="px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-[11px] text-blue-300"
                                >
                                  {s.name}
                                </span>
                              ))
                            )}
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                            Self-Declared Skills ({selfDeclaredSkills.length})
                          </span>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {selfDeclaredSkills.map((s) => (
                              <span
                                key={s.normalizedName}
                                className="px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-[11px] text-slate-200 inline-flex items-center gap-1"
                              >
                                {s.name}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSelfSkill(s.normalizedName)}
                                  className="hover:text-rose-400 cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                          <div className="flex gap-2 mt-2">
                            <input
                              value={newSkillName}
                              onChange={(e) => setNewSkillName(e.target.value)}
                              placeholder="Add skill (e.g., GraphQL)"
                              className="flex-1 rounded-lg bg-[#070D1A] border border-white/10 px-2.5 py-1.5 text-xs text-white"
                            />
                            <select
                              value={newSkillCategory}
                              onChange={(e) => setNewSkillCategory(e.target.value)}
                              className="rounded-lg bg-[#070D1A] border border-white/10 px-2 py-1.5 text-xs text-white"
                            >
                              <option value="language">Language</option>
                              <option value="framework">Framework</option>
                              <option value="database">Database</option>
                              <option value="tool">Tool</option>
                              <option value="domain">Domain</option>
                            </select>
                            <button
                              type="button"
                              disabled={isGuest}
                              onClick={handleAddSelfSkill}
                              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Portfolio Evidence Editor */}
                    <div className="rounded-2xl bg-[#0D1424] border border-white/10 p-5 space-y-3">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <FolderGit2 className="w-4 h-4 text-blue-400" />
                        Portfolio Projects ({portfolioProjects.length})
                      </h3>
                      <div className="space-y-2 max-h-56 overflow-y-auto">
                        {portfolioProjects.map((proj, idx) => (
                          <div
                            key={proj.id || `${proj.title}-${idx}`}
                            className="rounded-xl bg-[#080E1B] border border-white/10 p-3 flex items-start justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-white">{proj.title}</p>
                              <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                                {proj.summary}
                              </p>
                              {proj.technologies.length > 0 && (
                                <p className="text-[10px] font-mono text-blue-300 mt-1">
                                  {proj.technologies.join(' · ')}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const next = portfolioProjects.filter((_, i) => i !== idx);
                                setPortfolioProjects(next);
                                void handleSaveProfile(skills, next);
                              }}
                              className="p-1 text-rose-400 hover:bg-rose-500/20 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2 pt-2 border-t border-white/10">
                        <input
                          value={newProjTitle}
                          onChange={(e) => setNewProjTitle(e.target.value)}
                          placeholder="Project Title"
                          className="w-full rounded-lg bg-[#070D1A] border border-white/10 px-2.5 py-1.5 text-xs text-white"
                        />
                        <textarea
                          rows={2}
                          value={newProjSummary}
                          onChange={(e) => setNewProjSummary(e.target.value)}
                          placeholder="Concise summary of architecture & outcome..."
                          className="w-full rounded-lg bg-[#070D1A] border border-white/10 px-2.5 py-1.5 text-xs text-white"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            value={newProjTech}
                            onChange={(e) => setNewProjTech(e.target.value)}
                            placeholder="Stack (comma-separated)"
                            className="rounded-lg bg-[#070D1A] border border-white/10 px-2.5 py-1.5 text-xs text-white"
                          />
                          <input
                            value={newProjUrl}
                            onChange={(e) => setNewProjUrl(e.target.value)}
                            placeholder="URL (optional)"
                            className="rounded-lg bg-[#070D1A] border border-white/10 px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={isGuest}
                          onClick={handleAddPortfolioProject}
                          className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white cursor-pointer"
                        >
                          + Add Portfolio Project
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: 8 ATS-FRIENDLY TEMPLATES & PDF/DOCX EXPORT */}
              {activeTab === 'templates' && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                  <div className="xl:col-span-5 space-y-4">
                    <div className="rounded-2xl bg-[#0D1424] border border-white/10 p-5 space-y-3">
                      <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <Layers className="w-4 h-4 text-blue-400" />
                        Choose an ATS-Friendly Resume Template
                      </h2>
                      <p className="text-xs text-slate-400">
                        Single-column hierarchy with crisp headings designed for clean automated parsing and recruiter legibility.
                      </p>
                      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                        {(studio?.templates || []).map((tpl) => (
                          <button
                            key={tpl.id}
                            type="button"
                            onClick={() => setSelectedTemplateId(tpl.id)}
                            className={cn(
                              'w-full text-left rounded-xl border p-3.5 transition-all cursor-pointer',
                              selectedTemplateId === tpl.id
                                ? 'border-blue-500 bg-blue-500/15'
                                : 'border-white/10 bg-[#080E1B] hover:border-white/25'
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white">{tpl.name}</span>
                              {selectedTemplateId === tpl.id && (
                                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1">{tpl.focus}</p>
                            <p className="text-[10px] font-mono text-emerald-400/80 mt-1.5">
                              Order: {tpl.sectionOrder.join(' → ')}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-[#0D1424] border border-white/10 p-5 space-y-3">
                      <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                        Customize Header & Summary for Export
                      </h3>
                      <input
                        value={customHeadline}
                        onChange={(e) => setCustomHeadline(e.target.value)}
                        placeholder={headline || 'Optional custom headline override'}
                        className="w-full rounded-xl bg-[#070D1A] border border-white/10 px-3 py-2 text-xs text-white"
                      />
                      <textarea
                        rows={3}
                        value={customSummary}
                        onChange={(e) => setCustomSummary(e.target.value)}
                        placeholder={summary || 'Optional custom summary override'}
                        className="w-full rounded-xl bg-[#070D1A] border border-white/10 px-3 py-2 text-xs text-white"
                      />
                      <button
                        type="button"
                        disabled={previewLoading || isGuest}
                        onClick={() => void handleGeneratePreview()}
                        className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white cursor-pointer"
                      >
                        Refresh Live ATS Preview
                      </button>
                    </div>
                  </div>

                  {/* Right: Live Printable Single-Column Preview & Export Buttons */}
                  <div className="xl:col-span-7 space-y-4">
                    <div className="rounded-2xl bg-[#0D1424] border border-white/10 p-5 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-white">ATS Single-Column Preview</h3>
                        <p className="text-[11px] text-slate-400">
                          Generated strictly from your verified profile & approved resume history — zero fabricated items.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={exportingFormat !== null || isGuest}
                          onClick={() => void handleExport('pdf')}
                          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {exportingFormat === 'pdf' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          Download PDF
                        </button>
                        <button
                          type="button"
                          disabled={exportingFormat !== null || isGuest}
                          onClick={() => void handleExport('docx')}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {exportingFormat === 'docx' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          Download DOCX
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white text-slate-900 p-8 shadow-2xl border border-slate-200 min-h-[520px] space-y-5">
                      {previewLoading ? (
                        <div className="flex items-center justify-center py-24 text-slate-500 text-sm gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Formatting ATS preview...
                        </div>
                      ) : templatePreview ? (
                        <>
                          <header className="border-b border-slate-300 pb-4">
                            <h2 className="text-2xl font-bold text-slate-900">
                              {templatePreview.fullName}
                            </h2>
                            {templatePreview.headline && (
                              <p className="text-sm font-semibold text-blue-700 mt-0.5">
                                {templatePreview.headline}
                              </p>
                            )}
                            <p className="text-xs text-slate-600 mt-1">
                              {[templatePreview.location, ...templatePreview.links]
                                .filter(Boolean)
                                .join('  |  ')}
                            </p>
                          </header>

                          {templatePreview.template.sectionOrder.map((sec) => {
                            if (sec === 'summary' && templatePreview.summary) {
                              return (
                                <section key={sec}>
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2">
                                    Professional Summary
                                  </h4>
                                  <p className="text-xs leading-relaxed text-slate-700">
                                    {templatePreview.summary}
                                  </p>
                                </section>
                              );
                            }
                            if (sec === 'skills' && templatePreview.skills.length > 0) {
                              return (
                                <section key={sec}>
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2">
                                    Technical Skills
                                  </h4>
                                  <p className="text-xs text-slate-700">
                                    {templatePreview.skills.join('  |  ')}
                                  </p>
                                </section>
                              );
                            }
                            if (sec === 'experience' && templatePreview.experience.length > 0) {
                              return (
                                <section key={sec}>
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2">
                                    Experience
                                  </h4>
                                  <div className="space-y-2.5">
                                    {templatePreview.experience.map((exp, i) => (
                                      <div key={i}>
                                        <div className="flex justify-between text-xs font-bold text-slate-900">
                                          <span>{[exp.title, exp.company].filter(Boolean).join(' - ')}</span>
                                          {exp.period && <span className="font-normal text-slate-500">{exp.period}</span>}
                                        </div>
                                        {exp.summary && (
                                          <p className="text-xs text-slate-700 mt-0.5">{exp.summary}</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </section>
                              );
                            }
                            if (sec === 'projects' && templatePreview.projects.length > 0) {
                              return (
                                <section key={sec}>
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2">
                                    Selected Projects
                                  </h4>
                                  <div className="space-y-2.5">
                                    {templatePreview.projects.map((p, i) => (
                                      <div key={i}>
                                        <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                                          <Code2 className="w-3.5 h-3.5 text-blue-700" />
                                          <span>{p.title}</span>
                                        </div>
                                        {p.technologies && p.technologies.length > 0 && (
                                          <p className="text-[11px] font-medium text-blue-700">
                                            {p.technologies.join(', ')}
                                          </p>
                                        )}
                                        <p className="text-xs text-slate-700">{p.summary}</p>
                                      </div>
                                    ))}
                                  </div>
                                </section>
                              );
                            }
                            if (sec === 'education' && templatePreview.education.length > 0) {
                              return (
                                <section key={sec}>
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2">
                                    Education
                                  </h4>
                                  {templatePreview.education.map((edu, i) => (
                                    <p key={i} className="text-xs text-slate-700">
                                      {[edu.degree, edu.institution, edu.year].filter(Boolean).join(' - ')}
                                    </p>
                                  ))}
                                </section>
                              );
                            }
                            if (sec === 'certifications' && templatePreview.certifications.length > 0) {
                              return (
                                <section key={sec}>
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2">
                                    Certifications
                                  </h4>
                                  {templatePreview.certifications.map((cert, i) => (
                                    <p key={i} className="text-xs text-slate-700 flex items-center gap-1.5">
                                      <Award className="w-3.5 h-3.5 text-amber-600" />
                                      {[cert.name, cert.issuer, cert.year].filter(Boolean).join(' - ')}
                                    </p>
                                  ))}
                                </section>
                              );
                            }
                            return null;
                          })}
                        </>
                      ) : (
                        <p className="text-xs text-slate-500 text-center py-20">
                          Click &ldquo;Refresh Live ATS Preview&rdquo; to preview your formatted resume.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CareerProfilePage;

