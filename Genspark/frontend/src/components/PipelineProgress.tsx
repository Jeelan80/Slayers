'use client';

import {
  Upload,
  ScanText,
  ShieldCheck,
  CircleCheckBig,
  Scale,
  Check,
} from 'lucide-react';
import type { PipelineStage } from '@/types';

interface Props {
  stage: PipelineStage;
}

const STAGES: {
  key: Exclude<PipelineStage, 'idle' | 'complete'>;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: 'uploading', label: 'Uploading', Icon: Upload },
  { key: 'ocr', label: 'OCR Extraction', Icon: ScanText },
  { key: 'tamper', label: 'Tamper Detection', Icon: ShieldCheck },
  { key: 'validation', label: 'Cross-Validation', Icon: CircleCheckBig },
  { key: 'decision', label: 'Decision Engine', Icon: Scale },
];

const order: PipelineStage[] = [
  'idle',
  'uploading',
  'ocr',
  'tamper',
  'validation',
  'decision',
  'complete',
];

export default function PipelineProgress({ stage }: Props) {
  const currentIdx = order.indexOf(stage);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-2">
        {STAGES.map((s, i) => {
          const stageIdx = order.indexOf(s.key);
          const done = currentIdx > stageIdx;
          const active = currentIdx === stageIdx;
          const pending = currentIdx < stageIdx;

          return (
            <div key={s.key} className="flex-1 flex flex-col items-center min-w-0">
              <div className="flex items-center w-full">
                {/* Left connector */}
                {i > 0 && (
                  <div
                    className={`flex-1 h-[3px] rounded-full transition-colors ${
                      currentIdx > stageIdx - 1 ? 'bg-[#009E7E]' : 'bg-gray-200'
                    }`}
                  />
                )}
                <div
                  className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center border-2 transition-all ${
                    done
                      ? 'bg-[#009E7E] border-[#009E7E] text-white'
                      : active
                      ? 'bg-white border-[#009E7E] text-[#009E7E] ring-pulse'
                      : 'bg-white border-gray-200 text-gray-400'
                  }`}
                >
                  {done ? (
                    <Check className="w-5 h-5" strokeWidth={3} />
                  ) : (
                    <s.Icon className="w-5 h-5" />
                  )}
                </div>
                {/* Right connector */}
                {i < STAGES.length - 1 && (
                  <div
                    className={`flex-1 h-[3px] rounded-full transition-colors ${
                      currentIdx > stageIdx ? 'bg-[#009E7E]' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
              <div
                className={`mt-2 text-[11px] sm:text-xs font-medium text-center truncate w-full ${
                  active
                    ? 'text-[#007A60]'
                    : done
                    ? 'text-[#1a1f2e]'
                    : 'text-gray-400'
                }`}
              >
                {s.label}
              </div>
              {pending && (
                <div className="text-[10px] uppercase tracking-wider text-gray-300 mt-0.5">
                  Pending
                </div>
              )}
              {active && (
                <div className="text-[10px] uppercase tracking-wider text-[#009E7E] mt-0.5 font-semibold">
                  Running
                </div>
              )}
              {done && (
                <div className="text-[10px] uppercase tracking-wider text-emerald-600 mt-0.5">
                  Done
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
