'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  ArrowRight,
  Sparkles,
  FileCheck,
  Play,
} from 'lucide-react';
import { PresetScenario } from '@/types';
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
    attackVector: 'Legitimate participant registration with valid collegiate credentials.',
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
    description: 'Attempted reuse of an already-registered ID card by a second participant under a different name.',
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
    description: 'Digital alteration of printed Date of Birth to pass the event’s minimum age threshold (18+).',
    attackVector: 'Digital forgery: Participant spliced date of birth text on image, but machine QR code payload is unchanged.',
    defenseMechanism: 'DQVC (Document QR Verification & Cross-Validation) catches QR vs printed DOB contradiction.',
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
    title: 'Scenario 4: Blurry Document (Quality Gate)',
    badge: 'QUALITY GATE',
    expectedDecision: 'MANUAL_REVIEW',
    description: 'Low-light, out-of-focus camera capture that fails standard automated OCR confidence thresholds.',
    attackVector: 'Low image resolution or camera motion blur causing unreadable text.',
    defenseMechanism: 'Laplacian blur variance detects poor sharpness and routes to manual review to prevent false rejection.',
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
  {
    id: 'underage-school-student',
    title: 'Scenario 5: Underage Participant',
    badge: 'AGE INELIGIBLE',
    expectedDecision: 'REJECT',
    description: '15-year-old high school student attempting to register for an 18+ collegiate hackathon.',
    attackVector: 'Age policy violation: participant is a minor applying for an adult competition.',
    defenseMechanism: 'DOB extraction and calendar age calculation confirms participant is below 18 years old.',
    data: {
      name: 'Aarav Gupta',
      dob: '2011-08-20',
      idNumber: 'SCH20269941',
      institution: 'Delhi Public School',
      idType: 'COLLEGE_ID',
      minAge: 18,
      eventDate: '2026-09-18',
    },
    cardOptions: {
      isBlurry: false,
      isTampered: false,
    },
  },
];

export function DemoScenarios({ onLoadScenario, onInstantVerify }: DemoScenariosProps) {
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const handleAction = async (scenario: PresetScenario, instant: boolean) => {
    setGeneratingId(scenario.id);
    try {
      const cardFile = await generateSyntheticCard({
        name: scenario.data.name,
        dob: scenario.data.dob,
        idNumber: scenario.data.idNumber,
        institution: scenario.data.institution,
        idType: scenario.data.idType,
        isBlurry: scenario.cardOptions?.isBlurry,
        isTampered: scenario.cardOptions?.isTampered,
        filename: `${scenario.id}.jpg`,
      });
      if (instant) {
        onInstantVerify(scenario, cardFile);
      } else {
        onLoadScenario(scenario, cardFile);
      }
    } catch (err) {
      console.error('Error generating card for scenario:', err);
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-[#ECECEC] p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#DFF3E1] text-[#12805F]">
            Evaluator Benchmark Suite
          </span>
          <span className="text-xs text-[#9AA1AC]">
            5 Pre-Built PS-003 Test Cases
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#14161A]">
          Automated Test Scenarios & Attack Vectors
        </h1>
        <p className="text-xs sm:text-sm text-[#5B6270] mt-1 max-w-3xl">
          Instantly test and demonstrate VeriForge's multi-gate defense mechanisms against real-world hackathon registration risks. Click any scenario to run live verification.
        </p>
      </div>

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {PRESET_SCENARIOS.map((s) => {
          const isApprove = s.expectedDecision === 'APPROVE';
          const isReview = s.expectedDecision === 'MANUAL_REVIEW';
          const isBusy = generatingId === s.id;

          return (
            <div
              key={s.id}
              className="bg-white rounded-2xl border border-[#ECECEC] p-5 shadow-xs hover:border-[#12805F] transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      isApprove
                        ? 'bg-[#DFF3E1] text-[#12805F]'
                        : isReview
                        ? 'bg-[#FBE6D3] text-[#B45309]'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    Target: {s.expectedDecision}
                  </span>
                  <span className="text-[10px] font-mono text-[#9AA1AC] uppercase">
                    {s.badge}
                  </span>
                </div>

                <h3 className="text-base font-bold text-[#14161A] tracking-tight mb-1.5">
                  {s.title}
                </h3>
                <p className="text-xs text-[#5B6270] leading-relaxed mb-4">
                  {s.description}
                </p>

                <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#ECECEC] space-y-1.5 text-xs mb-4">
                  <div>
                    <span className="font-semibold text-[#14161A]">Participant:</span>{' '}
                    <span className="text-[#5B6270]">{s.data.name}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-[#14161A]">Attack Vector:</span>{' '}
                    <span className="text-[#5B6270]">{s.attackVector}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-[#12805F]">Defense:</span>{' '}
                    <span className="text-[#5B6270]">{s.defenseMechanism}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                disabled={isBusy}
                onClick={() => handleAction(s, true)}
                className="w-full py-2.5 px-4 rounded-full bg-[#12805F] hover:bg-[#0E6A4E] text-white text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                {isBusy ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Loading Scenario...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Verification Now</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
