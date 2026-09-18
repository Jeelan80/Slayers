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
  { icon: React.ComponentType<{ className?: string }>; accent: string; emoji: string }
> = {
  genuine:   { icon: CheckCircle2, accent: 'bg-emerald-50 text-emerald-700 border-emerald-200', emoji: '✅' },
  duplicate: { icon: CopyIcon,     accent: 'bg-sky-50 text-sky-700 border-sky-200',             emoji: '🔁' },
  tampered:  { icon: Scissors,     accent: 'bg-orange-50 text-orange-700 border-orange-200',     emoji: '✂️' },
  underage:  { icon: Baby,         accent: 'bg-purple-50 text-purple-700 border-purple-200',     emoji: '🔞' },
};

const FALLBACK_SAMPLES: DemoSample[] = [
  { id: 'genuine',   name: 'Genuine College ID',     description: 'Clean, valid ID card. All checks pass.',            expected: 'APPROVE' },
  { id: 'duplicate', name: 'Duplicate Reuse',        description: 'Same ID submitted twice — duplicate detection.',    expected: 'REJECT' },
  { id: 'tampered',  name: 'Tampered DOB',           description: 'Photoshopped date of birth. Tamper flagged.',       expected: 'REJECT' },
  { id: 'underage',  name: 'Underage Participant',   description: 'Applicant is under 18. Eligibility fails.',         expected: 'REJECT' },
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
      .catch(() => {
        /* keep fallback */
      });
  }, []);

  const runScenario = async (sample: DemoSample) => {
    if (running) return;
    setRunning(sample.id);
    setStage('uploading');

    try {
      const payload = await generateScenarioCard(sample.id as ScenarioId);

      // Simulated stage transitions during the request
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
        `Scenario "${sample.name}" → ${res.decision.replace('_', ' ')}`,
      );
      onCompleted();
    } catch (e) {
      setStage('idle');
      onNotify('error', e instanceof Error ? e.message : 'Scenario run failed');
    } finally {
      setTimeout(() => {
        setRunning(null);
        setStage('idle');
      }, 700);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#1a1f2e]">
            Test Scenarios
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            One-click end-to-end testing of all detection modules
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <ShieldCheck className="w-4 h-4 text-[#009E7E]" />
          Cards generated client-side on HTML5 Canvas · sent to <code className="bg-gray-100 rounded px-1">/api/verify</code>
        </div>
      </div>

      {/* Pipeline shown when running */}
      {running && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#007A60] mb-3">
            Running · {samples.find((s) => s.id === running)?.name}
          </div>
          <PipelineProgress stage={stage} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {samples.map((s) => {
          const meta = SCENARIO_META[s.id as ScenarioId] ?? SCENARIO_META.genuine;
          const Icon = meta.icon;
          const isRunning = running === s.id;
          const result = results[s.id];

          return (
            <div
              key={s.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center text-2xl ${meta.accent}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-[#1a1f2e]">
                      <span className="mr-1.5">{meta.emoji}</span>
                      {s.name}
                    </h3>
                    <ExpectedBadge decision={s.expected} />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{s.description}</p>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => runScenario(s)}
                  disabled={!!running}
                  className="inline-flex items-center gap-2 bg-[#009E7E] hover:bg-[#007A60] disabled:opacity-50 text-white font-semibold rounded-full px-5 py-2 text-sm"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Running…
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" /> Run Scenario
                    </>
                  )}
                </button>
                {result && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500">Last run:</span>
                    <ResultPill decision={result.decision} />
                    <span className="text-gray-500 tabular-nums">
                      {Math.round(result.confidence * 100)}% · #{result.registration_id}
                    </span>
                  </div>
                )}
              </div>

              {result && (
                <div className="mt-4 text-xs text-gray-500 border-t border-gray-100 pt-3 leading-relaxed">
                  {result.summary}
                </div>
              )}
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
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${map[decision]}`}
    >
      Expected · {decision.replace('_', ' ')}
    </span>
  );
}

function ResultPill({ decision }: { decision: VerificationResult['decision'] }) {
  const map = {
    APPROVE: 'bg-emerald-100 text-emerald-700',
    MANUAL_REVIEW: 'bg-amber-100 text-amber-700',
    REJECT: 'bg-rose-100 text-rose-700',
  } as const;
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${map[decision]}`}>
      {decision.replace('_', ' ')}
    </span>
  );
}
