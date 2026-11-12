import React from 'react';
import { Sparkles, Cpu, Check, ShieldCheck, Lock, AlertTriangle, Shield, CheckCircle2 } from 'lucide-react';
import { AiPreferences } from './types';

interface AiPreferencesTabProps {
  ai: AiPreferences;
  onChangeAi: (updated: AiPreferences) => void;
  isGuest: boolean;
  isClient: boolean;
}

export const AI_MODEL_OPTIONS = [
  {
    value: 'GPT-4o',
    name: 'GPT-4o (Autonomous AST Engine)',
    provider: 'OpenAI',
    description: 'High-precision AST syntax parser and agreement acceptance evaluator.',
  },
  {
    value: 'Gemini 2.5 Flash',
    name: 'Gemini 2.5 Flash (Ultra-Fast Code Intelligence)',
    provider: 'Google',
    description: 'Sub-second AST analysis, repository diff parsing, and milestone intelligence.',
  },
  {
    value: 'Claude-3.5-Sonnet',
    name: 'Claude 3.5 Sonnet (Extended Reasoning)',
    provider: 'Anthropic',
    description: 'Deep architectural logic checks and edge-case security evaluation.',
  },
  {
    value: 'DevFlow-AI-Core-v1.2',
    name: 'DevFlow AI Core v1.2 (Fintech Fine-Tuned)',
    provider: 'DevFlow Native',
    description: 'Specialized for PayPal invoicing, milestone escrow criteria, and AST matching.',
  },
];

export const AiPreferencesTab: React.FC<AiPreferencesTabProps> = ({
  ai,
  onChangeAi,
  isGuest: _isGuest,
  isClient,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. AI PROVIDER & REASONING MODEL SELECTION */}
      <div className="rounded-2xl bg-white/80 dark:bg-[#111C30]/90 border border-slate-200/80 dark:border-[#26344B] p-6 sm:p-7 shadow-xs backdrop-blur-xl space-y-6">
        <div className="pb-4 border-b border-slate-200/70 dark:border-[#26344B]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Cpu className="w-5 h-5 text-[#2563EB]" />
              <span>AI Provider &amp; Model Engine</span>
              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400 hidden sm:inline">
                ({isClient ? 'Client Oversight' : 'Developer Pipeline'})
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Select the LLM reasoning agent responsible for evaluating pull requests and milestone criteria.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 px-3 py-1 rounded-full self-start sm:self-auto font-mono">
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            <span>Multi-Agent Architecture</span>
          </span>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Selected Model Engine
          </label>
          <select
            value={ai.model}
            onChange={(e) => onChangeAi({ ...ai, model: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/80 dark:bg-[#0C1524] border border-slate-200 dark:border-[#26344B] text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#2563EB] transition-colors"
          >
            {AI_MODEL_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.name} &bull; {m.provider}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            The chosen engine powers the Agreement Analyzer, GitHub Evidence Agent, Milestone Intelligence, and Payment Assistant.
          </p>
        </div>

        {/* Model Presets Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {AI_MODEL_OPTIONS.map((m) => {
            const isSelected = ai.model === m.value;
            return (
              <div
                key={m.value}
                onClick={() => onChangeAi({ ...ai, model: m.value })}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${isSelected
                    ? 'bg-blue-50/60 dark:bg-[#152B4D]/60 border-[#2563EB] shadow-xs'
                    : 'bg-slate-50/50 dark:bg-[#0C1524]/60 border-slate-200/70 dark:border-[#26344B]/60 hover:border-slate-300 dark:hover:border-[#3B4F6E]'
                  }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {m.name.split(' (')[0]}
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${isSelected ? 'bg-[#2563EB] text-white' : 'bg-slate-200 dark:bg-[#1E2E4A] text-slate-600 dark:text-slate-300'
                    }`}>
                    {m.provider}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                  {m.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. AUTONOMOUS VERIFICATION & AST ANALYSIS PREFERENCES */}
      <div className="rounded-2xl bg-white/80 dark:bg-[#111C30]/90 border border-slate-200/80 dark:border-[#26344B] p-6 sm:p-7 shadow-xs backdrop-blur-xl space-y-6">
        <div className="pb-4 border-b border-slate-200/70 dark:border-[#26344B]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <span>AST Code Verification Preferences</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Control the stringency of automated syntax checks and deliverable proof requirements.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-3 py-1 rounded-full self-start sm:self-auto font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Automated Proofs</span>
          </span>
        </div>

        <div className="space-y-4 divide-y divide-slate-100 dark:divide-[#26344B]/50">
          {/* Strict AST Verification */}
          <div className="pt-3 first:pt-0 flex items-center justify-between gap-4">
            <div>
              <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white block">
                Strict AST Requirement Conformance
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Require 100% syntax tree matching against milestone acceptance criteria before marking AI verified.
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={ai.strictAstVerification}
              onClick={() => onChangeAi({ ...ai, strictAstVerification: !ai.strictAstVerification })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#2563EB] ${ai.strictAstVerification ? 'bg-[#2563EB]' : 'bg-slate-200 dark:bg-[#1E2E4A]'
                }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${ai.strictAstVerification ? 'translate-x-5' : 'translate-x-0'
                  }`}
              />
            </button>
          </div>

          {/* Automated PR Diff Parsing */}
          <div className="pt-3 flex items-center justify-between gap-4">
            <div>
              <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white block">
                Automated Pull Request Evidence Parsing
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Automatically trigger agent analysis whenever a webhook push event occurs on deliverable branches.
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={ai.autoDiffParsing ?? true}
              onClick={() => onChangeAi({ ...ai, autoDiffParsing: !(ai.autoDiffParsing ?? true) })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#2563EB] ${(ai.autoDiffParsing ?? true) ? 'bg-[#2563EB]' : 'bg-slate-200 dark:bg-[#1E2E4A]'
                }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${(ai.autoDiffParsing ?? true) ? 'translate-x-5' : 'translate-x-0'
                  }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 3. HUMAN APPROVAL REQUIREMENTS (CRITICAL IMMUTABLE SAFETY GATE) */}
      <div className="rounded-2xl bg-white/80 dark:bg-[#111C30]/90 border border-slate-200/80 dark:border-[#26344B] p-6 sm:p-7 shadow-xs backdrop-blur-xl space-y-5">
        <div className="pb-4 border-b border-slate-200/70 dark:border-[#26344B]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-500" />
              <span>Human-in-the-Loop Governance Gates</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Configure mandatory human approval checkpoints before deliverables can advance or funds disburse.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 px-3 py-1 rounded-full self-start sm:self-auto font-mono">
            <Lock className="w-3.5 h-3.5 text-amber-500" />
            <span>Regulatory Safeguards</span>
          </span>
        </div>

        {/* Requirements Selection Chips */}
        <div className="space-y-3">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
            Mandatory Verification Gates:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Gate 1: GitHub Evidence Review */}
            <div
              onClick={() => onChangeAi({ ...ai, approvalGitHub: !ai.approvalGitHub })}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${ai.approvalGitHub
                  ? 'bg-blue-50/70 dark:bg-[#152B4D]/60 border-[#2563EB] text-blue-900 dark:text-white'
                  : 'bg-slate-50/50 dark:bg-[#0C1524]/60 border-slate-200 dark:border-[#26344B] text-slate-600 dark:text-slate-300'
                }`}
            >
              <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${ai.approvalGitHub ? 'bg-[#2563EB] text-white' : 'border border-slate-300 dark:border-slate-600'
                }`}>
                {ai.approvalGitHub && <Check className="w-3.5 h-3.5" />}
              </div>
              <div className="space-y-0.5">
                <div className="text-xs sm:text-sm font-bold">
                  GitHub Deliverable Evidence Sign-off
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Requires developer and client confirmation before milestone progress advances.
                </div>
              </div>
            </div>

            {/* Gate 2: Payment Approval Gate (MANDATORY & LOCKED) */}
            <div className="p-4 rounded-xl border bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500/40 text-emerald-950 dark:text-white flex items-start gap-3 relative">
              <div className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <div className="space-y-0.5 flex-1">
                <div className="text-xs sm:text-sm font-bold flex items-center gap-2">
                  <span>PayPal Escrow &amp; Payment Approval</span>
                  <span className="text-[9px] font-mono uppercase bg-emerald-600 text-white px-2 py-0.2 rounded-full">
                    IMMUTABLE
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300">
                  Autonomous agents can prepare payouts but CANNOT disburse funds without client approval.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* IMMUTABLE COMPLIANCE ALERT BOX */}
        <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3 leading-relaxed">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold block text-amber-950 dark:text-amber-300 mb-0.5">
              Financial Compliance Policy:
            </strong>
            Under PayPal Hackathon financial governance rules, AI autonomous agents are strictly forbidden from bypassing human approval for payments. All invoice releases and instant payout transfers require explicit human sign-off on the Verification or Payments dashboard.
          </div>
        </div>
      </div>
    </div>
  );
};
