'use client';

import React, { useState } from 'react';
import {
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  FileCheck,
  QrCode,
  ScanEye,
  Camera,
  Play,
  Sparkles,
} from 'lucide-react';
import { PresetScenario, DecisionType } from '@/types';
import { generateSyntheticCard } from '@/utils/cardGenerator';

interface DemoScenariosProps {
  onLoadScenario: (scenario: PresetScenario, cardFile: File) => void;
  onInstantVerify: (scenario: PresetScenario, cardFile: File) => void;
}

export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: 'genuine-college-id',
    title: 'Scenario 1: Genuine College ID',
    badge: 'BENCHMARK PASS',
    expectedDecision: 'APPROVE',
    description: 'Clean student identity card with authentic printed text, matching QR code, and crisp sharpness.',
    attackVector: 'Legitimate participant registration with valid credentials.',
    defenseMechanism: 'High-confidence AWS Textract extraction + DQVC QR validation + zero duplicate collisions.',
    data: {
      name: 'Rahul Kumar',
      dob: '2005-03-14',
      idNumber: 'ABC20261023',
      institution: 'ABC Institute of Technology',
      idType: 'COLLEGE_ID',
      minAge: 18,
      eventDate: '2026-09-18',
    },
    cardOptions: {
      isBlurry: false,
      isTampered: false,
    },
  },
  {
    id: 'sybil-duplicate-reuse',
    title: 'Scenario 2: Sybil Duplicate Reuse',
    badge: 'SYBIL COLLISION',
    expectedDecision: 'REJECT',
    description: 'Attempted reuse of an already-registered ID card by a second participant with a mismatched name.',
    attackVector: 'Sybil attack: participant borrows or buys another student’s valid ID card to register multiple times.',
    defenseMechanism: 'HMAC-SHA256 ID fingerprint collision detected in database + Fuzzy Name Match mismatch (<50%).',
    data: {
      name: 'Impostor Sharma',
      dob: '2005-03-14',
      idNumber: 'ABC20261023',
      institution: 'ABC Institute of Technology',
      idType: 'COLLEGE_ID',
      minAge: 18,
      eventDate: '2026-09-18',
    },
    cardOptions: {
      isBlurry: false,
      isTampered: false,
    },
  },
  {
    id: 'tampered-dob-qr-mismatch',
    title: 'Scenario 3: Tampered DOB / QR Mismatch',
    badge: 'DIGITAL FORGERY',
    expectedDecision: 'REJECT',
    description: 'Photoshop alteration of printed Date of Birth to pass the event’s minimum age threshold (18+).',
    attackVector: 'Digital forgery: Participant spliced date of birth text on image, but machine QR code payload is unchanged.',
    defenseMechanism: 'DQVC (Dual-Quick-Verification-Crosscheck) catches QR vs printed DOB discrepancy + ELA anomaly flag.',
    data: {
      name: 'Rohan Sharma',
      dob: '2007-04-14',
      idNumber: 'ABC20261023',
      institution: 'ABC Institute of Technology',
      idType: 'COLLEGE_ID',
      minAge: 18,
      eventDate: '2026-09-18',
    },
    cardOptions: {
      isBlurry: false,
      isTampered: true,
      customQrData: 'ORIGINAL_DOB:2005-03-14',
    },
  },
  {
    id: 'blurry-document-gate',
    title: 'Scenario 4: Blurry Document (False-Positive Gate)',
    badge: 'QUALITY GATE',
    expectedDecision: 'MANUAL_REVIEW',
    description: 'Unreadable or motion-blurred photo upload from a low-end mobile camera.',
    attackVector: 'Edge case: Honest user uploads an unreadable photo; system must NOT falsely reject them as fraud.',
    defenseMechanism: 'Laplacian variance blur score (<40.0) triggers false-positive protection gate, routing safely to Manual Review queue.',
    data: {
      name: 'Rahul Kumar',
      dob: '2005-03-14',
      idNumber: 'BLUR2026007',
      institution: 'ABC Institute of Technology',
      idType: 'COLLEGE_ID',
      minAge: 18,
      eventDate: '2026-09-18',
    },
    cardOptions: {
      isBlurry: true,
      isTampered: false,
    },
  },
];

export function DemoScenarios({ onLoadScenario, onInstantVerify }: DemoScenariosProps) {
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const handleAction = async (scenario: PresetScenario, instant: boolean) => {
    setGeneratingId(scenario.id);
    try {
      // Generate synthetic ID card with the scenario's specific visual parameters
      const cardFile = await generateSyntheticCard({
        name: scenario.data.name,
        dob: scenario.data.dob,
        idNumber: scenario.data.idNumber,
        institution: scenario.data.institution,
        idType: scenario.data.idType,
        isBlurry: scenario.cardOptions.isBlurry,
        isTampered: scenario.cardOptions.isTampered,
        filename: `${scenario.id}.jpg`,
      });

      if (instant) {
        onInstantVerify(scenario, cardFile);
      } else {
        onLoadScenario(scenario, cardFile);
      }
    } catch {
      alert('Failed to generate demo card.');
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 md:p-8 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
                <Zap className="h-5 w-5" />
              </span>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                Benchmark Test Scenarios & Demo Suite
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              One-click preloaded test fixtures demonstrating VeriForge&apos;s multi-gate defense against Sybil attacks,
              digital forgery, ELA anomalies, and false-positive quality gates.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 self-start md:self-auto">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span>Browser-Rendered Synthetic Cards</span>
          </div>
        </div>
      </div>

      {/* 4 Scenario Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {PRESET_SCENARIOS.map((scenario) => {
          const isApprove = scenario.expectedDecision === 'APPROVE';
          const isReview = scenario.expectedDecision === 'MANUAL_REVIEW';
          const isReject = scenario.expectedDecision === 'REJECT';
          const isBusy = generatingId === scenario.id;

          return (
            <div
              key={scenario.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/50 hover:bg-slate-900/80 p-6 transition-all duration-300 flex flex-col justify-between shadow-xl group hover:border-slate-700"
            >
              <div>
                {/* Header Badge */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {scenario.badge}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                      isApprove
                        ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                        : isReview
                        ? 'bg-amber-950/80 border-amber-700 text-amber-300'
                        : 'bg-rose-950/80 border-rose-700 text-rose-300'
                    }`}
                  >
                    {isApprove && <ShieldCheck className="h-3.5 w-3.5" />}
                    {isReview && <ShieldAlert className="h-3.5 w-3.5" />}
                    {isReject && <ShieldX className="h-3.5 w-3.5" />}
                    <span>EXPECTED: {scenario.expectedDecision}</span>
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="text-base font-bold text-white group-hover:text-cyan-400 transition-colors">
                  {scenario.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {scenario.description}
                </p>

                {/* Profile Snapshot */}
                <div className="my-4 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-mono space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Participant:</span>
                    <span className="text-white font-sans font-semibold">{scenario.data.name}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>DOB / Age:</span>
                    <span className="text-slate-200">{scenario.data.dob} (Min: {scenario.data.minAge})</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>ID Number:</span>
                    <span className="text-cyan-400">{scenario.data.idNumber}</span>
                  </div>
                </div>

                {/* Attack Vector & Defense Insight */}
                <div className="space-y-2 text-xs mb-5">
                  <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/80">
                    <span className="text-slate-500 font-semibold block mb-0.5">Threat Vector:</span>
                    <p className="text-slate-300">{scenario.attackVector}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-cyan-950/20 border border-cyan-900/40">
                    <span className="text-cyan-400 font-semibold block mb-0.5">VeriForge Defense:</span>
                    <p className="text-cyan-200/90">{scenario.defenseMechanism}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleAction(scenario, false)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Preload to Form</span>
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleAction(scenario, true)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/20 disabled:opacity-50"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>{isBusy ? 'Generating Card...' : 'Verify Instantly'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
