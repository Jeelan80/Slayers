'use client';

import { useEffect, useState } from 'react';
import {
  Play,
  CheckCircle2,
  Copy as CopyIcon,
  Scissors,
  Baby,
  Loader2,
  ShieldCheck,
  Zap,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { fetchSamples, submitVerification } from '@/utils/api';
import type { DemoSample, PipelineStage, VerificationResult } from '@/types';
import { generateScenarioCard, type ScenarioId } from '@/utils/cardGenerator';
import PipelineProgress from './PipelineProgress';

interface Props {
  onNotify: (kind: 'success' | 'error' | 'info', message: string) => void;
  onCompleted: () => void;
}

const SCENARIO_META: Record<
  ScenarioId,
  { icon: React.ComponentType<{ className?: string }>; accent: string; badge: string; emoji: string; tag: string }
> = {
  genuine:   { icon: CheckCircle2, accent: 'from-emerald-500/10 to-transparent border-emerald-200', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', emoji: '✅', tag: 'High Confidence' },
  duplicate: { icon: CopyIcon,     accent: 'from-sky-500/10 to-transparent border-sky-200',         badge: 'bg-sky-50 text-sky-700 border-sky-200',             emoji: '🔁', tag: 'Identity Fingerprinting' },
  tampered:  { icon: Scissors,     accent: 'from-orange-500/10 to-transparent border-orange-200', badge: 'bg-orange-50 text-orange-700 border-orange-200',     emoji: '✂️', tag: 'ELA Forensics Anomaly' },
  underage:  { icon: Baby,         accent: 'from-purple-500/10 to-transparent border-purple-200', badge: 'bg-purple-50 text-purple-700 border-purple-200',     emoji: '🔞', tag: 'Date/Age Constraint' },
};

const FALLBACK_SAMPLES: DemoSample[] = [
  { id: 'genuine',   name: 'Genuine College ID',     description: 'Valid, crisp student card with matching QR code and valid age. All evidence checks clear.', expected: 'APPROVE' },
  { id: 'duplicate', name: 'Duplicate ID Replay',    description: 'Re-submitting an already processed student identity to test HMAC-SHA256 duplicate fingerprinting.', expected: 'REJECT' },
  { id: 'tampered',  name: 'Tampered Date of Birth', description: 'Simulated photoshopped date region with ELA noise disparity and QR cross-validation mismatch.', expected: 'REJECT' },
  { id: 'underage',  name: 'Underage Candidate',     description: 'Applicant with birth year failing the minimum event eligibility requirement (18+).', expected: 'REJECT' },
];

interface RunResult {
  decision: VerificationResult['decision'];
  confidence: number;
  summary: string;
  registration_id: number;
}

export default function DemoScenarios({ onNotify, onCompleted }: Props) {
  const [samples, setSamples] = useState<DemoSample[]>(FALLBACK_SAMPLES);
  const [running, setRunning] = useState<string | null>(null);
  const [stage, setStage] = useState<PipelineStage>('idle');
  const [results, setResults] = useState<Record<string, RunResult>>({});

  useEffect(() => {
    fetchSamples()
      .then((s) => {
        if (Array.isArray(s) && s.length) setSamples(s);
      })
      .catch(() => {});
  }, []);

  const runScenario = async (sample: DemoSample) => {
    if (running) return;
    setRunning(sample.id);
    setStage('uploading');

    try {
      const payload = await generateScenarioCard(sample.id as ScenarioId);

      const stages: PipelineStage[] = ['ocr', 'tamper', 'validation', 'decision'];
      let idx = 0;
      const iv = setInterval(() => {
        if (idx < stages.length) {
          setStage(stages[idx]);
          idx++;
        }
      }, 350);

      const form = new FormData();
      form.append('id_image', payload.file);
      form.append('name', payload.name);
      form.append('dob', payload.dob);
      form.append('id_number', payload.id_number);
      form.append('institution', payload.institution);
      form.append('email', payload.email);

      const res = await submitVerification(form);
      clearInterval(iv);
      setStage('complete');
      setResults((prev) => ({
        ...prev,
        [sample.id]: {
          decision: res.decision,
          confidence: res.confidence,
          summary: res.summary,
          registration_id: res.registration_id,
        },
      }));
      onNotify(
        res.decision === sample.expected ? 'success' : 'info',
        `Scenario "${sample.name}" completed → ${res.decision.replace('_', ' ')}`,
      );
      onCompleted();
    } catch (e) {
      setStage('idle');
      onNotify('error', e instanceof Error ? e.message : 'Scenario evaluation failed');
    } finally {
      setTimeout(() => {
        setRunning(null);
        setStage('idle');
      }, 700);
    }
  };

  return (
    <div className="space-y-6 fade-up">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 bg-white p-6 rounded-3xl border border-[#e2e8f0] shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-[#009E7E]/10 text-[#009E7E] px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> One-Click Evaluation
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-[#0f172a]">
            Pre-Engineered Test Scenarios
          </h2>
          <p className="text-xs text-[#64748b] mt-1 max-w-xl leading-relaxed">
            Generate synthetic high-fidelity ID cards client-side using HTML5 Canvas and evaluate how the multi-layer pipeline resolves varying adversarial scenarios.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-[#009E7E] bg-[#009E7E]/5 px-3.5 py-2 rounded-2xl border border-[#009E7E]/15 shrink-0">
          <ShieldCheck className="w-4 h-4 text-[#009E7E]" />
          <span>Real-time End-to-End Pipeline</span>
        </div>
      </div>

      {/* Running Stepper Progress */}
      {running && (
        <div className="bg-white rounded-3xl border border-[#009E7E]/30 shadow-md p-6 animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#FF6B2B]" />
              <span className="text-xs font-black uppercase tracking-wider text-[#009E7E]">
                Executing Scenario: {samples.find((s) => s.id === running)?.name}
              </span>
            </div>
            <span className="text-[11px] font-mono text-[#64748b]">Running 5-stage synthesis…</span>
          </div>
          <PipelineProgress stage={stage} />
        </div>
      )}

      {/* Grid of 4 Scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {samples.map((s) => {
          const meta = SCENARIO_META[s.id as ScenarioId] ?? SCENARIO_META.genuine;
          const Icon = meta.icon;
          const isRunning = running === s.id;
          const result = results[s.id];

          return (
            <div
              key={s.id}
              className={`bg-white rounded-3xl border border-[#e2e8f0] p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden bg-gradient-to-b ${meta.accent}`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-[#e2e8f0] flex items-center justify-center text-2xl shrink-0">
                      <span>{meta.emoji}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
                        {meta.tag}
                      </span>
                      <h3 className="text-base font-black text-[#0f172a] leading-snug">
                        {s.name}
                      </h3>
                    </div>
                  </div>
                  <ExpectedBadge decision={s.expected} />
                </div>

                <p className="text-xs text-[#64748b] leading-relaxed">
                  {s.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#f1f5f9]">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => runScenario(s)}
                    disabled={!!running}
                    className="inline-flex items-center gap-2 bg-[#009E7E] hover:bg-[#007A60] disabled:opacity-50 text-white font-bold rounded-2xl px-5 py-2.5 text-xs shadow-primary transition-all"
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Evaluating…
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" /> Run Test Scenario
                      </>
                    )}
                  </button>

                  {result && (
                    <div className="flex items-center gap-2 text-xs">
                      <ResultPill decision={result.decision} />
                      <span className="font-mono font-bold text-[#0f172a] tabular-nums">
                        {Math.round(result.confidence * 100)}%
                      </span>
                    </div>
                  )}
                </div>

                {result && (
                  <div className="mt-3 bg-white/90 rounded-2xl p-3 border border-[#e2e8f0] text-[11px] text-[#475569] leading-relaxed">
                    <span className="font-bold text-[#0f172a]">Output Summary: </span>
                    {result.summary}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExpectedBadge({ decision }: { decision: DemoSample['expected'] }) {
  const map = {
    APPROVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    REJECT: 'bg-rose-50 text-rose-700 border-rose-200',
    MANUAL_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border shadow-2xs ${map[decision]}`}
    >
      Expected: {decision.replace('_', ' ')}
    </span>
  );
}

function ResultPill({ decision }: { decision: VerificationResult['decision'] }) {
  const map = {
    APPROVE: 'bg-emerald-500 text-white',
    MANUAL_REVIEW: 'bg-amber-500 text-white',
    REJECT: 'bg-rose-500 text-white',
  } as const;
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${map[decision]}`}>
      {decision.replace('_', ' ')}
    </span>
  );
}
