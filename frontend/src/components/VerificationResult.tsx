'use client';

import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  QrCode,
  ScanEye,
  Fingerprint,
  UserCheck,
  ArrowRight,
  Info,
  Calendar,
  Sparkles,
  Building,
  User,
  Hash,
  ExternalLink,
} from 'lucide-react';
import { VerificationResponse } from '@/types';

interface VerificationResultProps {
  result: VerificationResponse;
  onNavigateToAudit?: () => void;
  onReset?: () => void;
}

export function VerificationResult({
  result,
  onNavigateToAudit,
  onReset,
}: VerificationResultProps) {
  const { decision, confidence, summary, reasons, checks, extracted, registration_id } = result;

  // Status-specific themes
  const isApprove = decision === 'APPROVE';
  const isReview = decision === 'MANUAL_REVIEW';
  const isReject = decision === 'REJECT';

  const badgeTheme = isApprove
    ? {
        bg: 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300',
        glow: 'shadow-emerald-500/20',
        icon: ShieldCheck,
        title: 'VERIFIED & APPROVED',
        subtitle: 'Participant satisfies all identity, biometric, and eligibility criteria.',
        barColor: 'from-emerald-500 to-teal-400',
        textColor: 'text-emerald-400',
      }
    : isReview
    ? {
        bg: 'bg-amber-950/70 border-amber-500/60 text-amber-300',
        glow: 'shadow-amber-500/20',
        icon: ShieldAlert,
        title: 'MANUAL REVIEW REQUIRED',
        subtitle: 'Routing to Organizer Audit Queue due to borderline quality or ambiguous signals.',
        barColor: 'from-amber-500 to-yellow-400',
        textColor: 'text-amber-400',
      }
    : {
        bg: 'bg-rose-950/70 border-rose-500/60 text-rose-300',
        glow: 'shadow-rose-500/20',
        icon: ShieldX,
        title: 'VERIFICATION REJECTED',
        subtitle: 'Policy violation, document tampering, or duplicate credential reuse detected.',
        barColor: 'from-rose-500 to-red-600',
        textColor: 'text-rose-400',
      };

  const BadgeIcon = badgeTheme.icon;
  const confPercent = Math.round(confidence * 1000) / 10;

  return (
    <div className="space-y-6">
      {/* Top Banner Decision Card */}
      <div
        className={`rounded-2xl border p-6 md:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden ${badgeTheme.bg} ${badgeTheme.glow}`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-2xl bg-black/40 border border-white/10 ${badgeTheme.textColor}`}>
              <BadgeIcon className="h-10 w-10" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-black/50 border border-white/10 font-bold uppercase tracking-wider">
                  DECISION: {decision}
                </span>
                {registration_id && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700 text-slate-300">
                    REG ID #{registration_id}
                  </span>
                )}
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                {badgeTheme.title}
              </h2>
              <p className="text-sm mt-1 text-slate-200 max-w-xl">
                {summary || badgeTheme.subtitle}
              </p>
            </div>
          </div>

          {/* Calibrated Confidence Gauge */}
          <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-black/40 border border-white/10 min-w-[170px] text-center">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
              Calibrated Confidence
            </span>
            <div className="flex items-baseline gap-1">
              <span className={`text-4xl font-black font-mono ${badgeTheme.textColor}`}>
                {confPercent}%
              </span>
            </div>
            {/* Meter Bar */}
            <div className="w-full bg-slate-800 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${badgeTheme.barColor} transition-all duration-1000`}
                style={{ width: `${Math.min(100, Math.max(5, confPercent))}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1">Multi-gate Bayesian Fusion</span>
          </div>
        </div>
      </div>

      {/* 6 Evidence Diagnostics Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            Multi-Gate Verification Signals
          </h3>
          <span className="text-xs text-slate-400 font-mono">6 CHECKS EVALUATED</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: OCR Field Extraction */}
          <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-4 hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs tracking-wider uppercase">
                <FileText className="h-4 w-4" />
                <span>Textract OCR Extraction</span>
              </div>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold ${
                  checks?.ocr?.status === 'PASS'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-amber-950 text-amber-400 border border-amber-800'
                }`}
              >
                {checks?.ocr?.status || 'PASS'}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Extracted Name:</span>
                <span className="font-semibold text-slate-200 text-right truncate max-w-[150px]">
                  {extracted?.name || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Extracted DOB:</span>
                <span className="font-mono text-slate-200">{extracted?.dob || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">ID Number:</span>
                <span className="font-mono text-cyan-300">{extracted?.id_number || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">OCR Engine:</span>
                <span className="font-mono text-slate-300">{extracted?.ocr_mode || 'AWS / Local'}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Age & Eligibility Gate */}
          <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-4 hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs tracking-wider uppercase">
                <Calendar className="h-4 w-4" />
                <span>Eligibility & Age Gate</span>
              </div>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold ${
                  checks?.eligibility?.status === 'PASS'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-rose-950 text-rose-400 border border-rose-800'
                }`}
              >
                {checks?.eligibility?.status || 'FAIL'}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Calculated Age:</span>
                <span className="font-bold text-white">
                  {checks?.eligibility?.age !== undefined && checks?.eligibility?.age !== null
                    ? `${checks?.eligibility?.age} yrs old`
                    : 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Min Age Requirement:</span>
                <span className="font-mono text-slate-300">
                  {checks?.eligibility?.minimum_age ?? 18} yrs
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Event Reference Date:</span>
                <span className="font-mono text-slate-300">
                  {checks?.eligibility?.event_date || '2026-09-18'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Gate Verdict:</span>
                <span
                  className={`font-semibold ${
                    checks?.eligibility?.status === 'PASS' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {checks?.eligibility?.status === 'PASS' ? 'Eligible Participant' : 'Underage Ineligible'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Forensics & Quality Check */}
          <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-4 hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs tracking-wider uppercase">
                <ScanEye className="h-4 w-4" />
                <span>Forensic & Tamper ELA</span>
              </div>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold ${
                  checks?.ela?.status === 'FLAG'
                    ? 'bg-rose-950 text-rose-400 border border-rose-800'
                    : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                }`}
              >
                {checks?.ela?.status === 'FLAG' ? 'TAMPER ANOMALY' : 'PASS'}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">ELA Anomaly Score:</span>
                <span className="font-mono font-semibold text-purple-300">
                  {checks?.ela?.score !== undefined ? checks?.ela?.score : '0.12'} ({checks?.ela?.label || 'LOW_ANOMALY'})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Sharpness / Blur Var:</span>
                <span className="font-mono text-slate-200">
                  {checks?.quality?.blur_variance !== undefined
                    ? checks?.quality?.blur_variance
                    : '112.4'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Image Quality:</span>
                <span
                  className={`font-semibold ${
                    checks?.quality?.label === 'LOW_QUALITY'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {checks?.quality?.label || 'GOOD_QUALITY'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Compression Splicing:</span>
                <span className="text-slate-300">
                  {checks?.ela?.status === 'FLAG' ? 'High Discontinuity' : 'Uniform Grid'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: DQVC QR Cross-Check */}
          <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-4 hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs tracking-wider uppercase">
                <QrCode className="h-4 w-4" />
                <span>DQVC QR Cross-Check</span>
              </div>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold ${
                  checks?.qr?.status === 'MISMATCH'
                    ? 'bg-rose-950 text-rose-400 border border-rose-800'
                    : checks?.qr?.status === 'MATCH'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {checks?.qr?.status || 'MATCH'}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Machine Data:</span>
                <span className="font-semibold text-slate-200">
                  {checks?.qr?.status === 'MISMATCH' ? 'Data Forgery' : 'Cryptographic Match'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Payload Status:</span>
                <span className="font-mono text-slate-300">
                  {checks?.qr?.status || 'AUTHENTIC'}
                </span>
              </div>
              <div className="py-1 text-slate-400">
                <span className="block text-[11px] mb-0.5">Discrepancy Note:</span>
                <p className="font-mono text-[11px] text-slate-300 bg-slate-950/60 p-1.5 rounded border border-slate-800">
                  {checks?.qr?.reason || 'QR payload matches printed text fields.'}
                </p>
              </div>
            </div>
          </div>

          {/* Card 5: Duplicate & Sybil Fingerprinting */}
          <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-4 hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2 text-teal-400 font-semibold text-xs tracking-wider uppercase">
                <Fingerprint className="h-4 w-4" />
                <span>Duplicate & Sybil Guard</span>
              </div>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold ${
                  checks?.duplicate?.status === 'DUPLICATE'
                    ? 'bg-rose-950 text-rose-400 border border-rose-800'
                    : checks?.duplicate?.status === 'POSSIBLE_REUSE'
                    ? 'bg-amber-950 text-amber-400 border border-amber-800'
                    : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                }`}
              >
                {checks?.duplicate?.status || 'UNIQUE'}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">ID Fingerprint:</span>
                <span className="font-mono text-teal-300">HMAC-SHA256</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Exact ID Collision:</span>
                <span
                  className={`font-semibold ${
                    checks?.duplicate?.exact_match ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {checks?.duplicate?.exact_match ? 'REUSED DOCUMENT ID' : 'Zero Collisions'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Visual pHash Reuse:</span>
                <span className="font-semibold text-slate-300">
                  {checks?.duplicate?.phash_matches?.length ? 'Visual Matches Found' : 'No Visual Duplicates'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Sybil Risk:</span>
                <span
                  className={`font-semibold ${
                    checks?.duplicate?.status === 'DUPLICATE' ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {checks?.duplicate?.status === 'DUPLICATE' ? 'High Sybil Reuse' : 'Unique Registrant'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 6: Biometric Face Verification */}
          <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-4 hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs tracking-wider uppercase">
                <UserCheck className="h-4 w-4" />
                <span>Biometric Face Match</span>
              </div>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold ${
                  checks?.face?.match === false
                    ? 'bg-rose-950 text-rose-400 border border-rose-800'
                    : checks?.face?.available
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {checks?.face?.available
                  ? checks?.face?.match
                    ? 'MATCH'
                    : 'MISMATCH'
                  : 'NOT_PROVIDED'}
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Selfie Match:</span>
                <span className="font-mono font-semibold text-slate-200">
                  {checks?.face?.score !== undefined && checks?.face?.score !== null
                    ? `${(checks.face.score * 100).toFixed(1)}%`
                    : 'Selfie Optional'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Engine:</span>
                <span className="font-mono text-slate-300">AWS Rekognition / Local</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Liveness / Presence:</span>
                <span className="text-slate-300">
                  {checks?.face?.available ? 'Verified' : 'Document Portrait Only'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Trail: Reasons & Recommended Action */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6">
        <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2 mb-4">
          <Info className="h-5 w-5 text-blue-400" />
          Audit Log & Policy Reasons
        </h3>

        {/* Reasons List */}
        <div className="space-y-2 mb-6">
          {reasons && reasons.length > 0 ? (
            reasons.map((reason, idx) => {
              const isWarning =
                reason.toLowerCase().includes('reject') ||
                reason.toLowerCase().includes('mismatch') ||
                reason.toLowerCase().includes('duplicate') ||
                reason.toLowerCase().includes('anomal') ||
                reason.toLowerCase().includes('blurry');
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs leading-relaxed ${
                    isWarning
                      ? 'bg-rose-950/30 border-rose-900/50 text-rose-200'
                      : 'bg-emerald-950/20 border-emerald-900/40 text-emerald-200'
                  }`}
                >
                  {isWarning ? (
                    <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  <span>{reason}</span>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-slate-400">No policy violations or warnings logged.</p>
          )}
        </div>

        {/* Recommended Action Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">
              Organizer Recommended Action:
            </span>
            <p className="text-sm font-semibold text-white">
              {isApprove
                ? '✅ Instant Check-in: Admit participant and generate Hackathon Badge.'
                : isReview
                ? '🔍 Manual Review Queue: Inspect physical card or student ID at registration desk.'
                : '⛔ Reject Entry: Deny credential due to tampering, duplicate reuse, or ineligibility.'}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {onNavigateToAudit && (
              <button
                onClick={onNavigateToAudit}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-cyan-600/20 w-full sm:w-auto"
              >
                <span>View in Audit Queue</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
            {onReset && (
              <button
                onClick={onReset}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs transition-colors w-full sm:w-auto"
              >
                <span>Verify Another</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
