'use client';

import React, { useEffect, useState } from 'react';
import { FileSearch, QrCode, ScanEye, Fingerprint, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react';

interface PipelineProgressProps {
  isLoading: boolean;
}

const STEPS = [
  { id: 1, label: 'Scanning Document with Textract OCR', icon: FileSearch, desc: 'Extracting name, DOB, and document credentials' },
  { id: 2, label: 'Analyzing QR & Machine Data', icon: QrCode, desc: 'Cross-verifying cryptographic barcode payload' },
  { id: 3, label: 'Running ELA & Noise Forensics', icon: ScanEye, desc: 'Detecting digital splicing, tampering & blur variance' },
  { id: 4, label: 'Checking Duplicate Fingerprints', icon: Fingerprint, desc: 'Matching HMAC-SHA256 fingerprint & visual pHash' },
  { id: 5, label: 'Fusing Multi-Gate Evidence', icon: ShieldCheck, desc: 'Evaluating Bayesian confidence & policy eligibility' },
];

export function PipelineProgress({ isLoading }: PipelineProgressProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setCurrentStep(0);
      return;
    }

    // Advance steps sequentially for visual feedback
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < STEPS.length - 1) return prev + 1;
        return prev;
      });
    }, 450);

    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div className="w-full bg-slate-900/90 border border-cyan-900/50 rounded-2xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
      {/* Laser Scan Animation Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none" />

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-cyan-950/80 border border-cyan-800/80 flex items-center justify-center text-cyan-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              VeriForge Multi-Gate Pipeline
              <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                ACTIVE SCAN
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Synchronizing multi-stage neural OCR, forensics, and duplicate screening
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono text-cyan-400 font-semibold">
            STEP {currentStep + 1} OF {STEPS.length}
          </span>
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-3">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isDone = idx < currentStep;
          const isCurrent = idx === currentStep;

          return (
            <div
              key={step.id}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${
                isCurrent
                  ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-100 shadow-md shadow-cyan-950'
                  : isDone
                  ? 'bg-slate-900/40 border-slate-800/80 text-slate-400'
                  : 'bg-slate-950/20 border-slate-900 text-slate-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm font-semibold transition-colors ${
                    isDone
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : isCurrent
                      ? 'bg-cyan-900/80 text-cyan-300 border border-cyan-600 animate-pulse'
                      : 'bg-slate-800/40 text-slate-600 border border-slate-800'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : isCurrent ? (
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <p className={`text-sm font-medium ${isCurrent ? 'text-white' : isDone ? 'text-slate-300' : 'text-slate-500'}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-slate-400 hidden sm:block">
                    {step.desc}
                  </p>
                </div>
              </div>

              <div className="text-xs font-mono font-medium">
                {isDone ? (
                  <span className="text-emerald-400">PASSED</span>
                ) : isCurrent ? (
                  <span className="text-cyan-400 animate-pulse">PROCESSING</span>
                ) : (
                  <span className="text-slate-600">QUEUED</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
