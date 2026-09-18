'use client';

import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Calendar,
  Eye,
  Shield,
  QrCode,
  Copy as CopyIcon,
  UserCheck,
  User,
  Sparkles,
  Clock,
  Info,
} from 'lucide-react';
import ConfidenceGauge from './ConfidenceGauge';
import type { VerificationResult } from '@/types';

interface Props {
  result: VerificationResult | null;
}

type Tone = 'ok' | 'warn' | 'bad' | 'muted';

const toneStyles: Record<Tone, { text: string; bg: string; border: string; dot: string }> = {
  ok:    { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  warn:  { text: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   dot: 'bg-amber-500' },
  bad:   { text: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-200',    dot: 'bg-rose-500' },
  muted: { text: 'text-gray-600',    bg: 'bg-gray-50',    border: 'border-gray-200',    dot: 'bg-gray-400' },
};

function statusTone(status: string): Tone {
  switch (status) {
    case 'PASS':
    case 'MATCH':
    case 'UNIQUE':
      return 'ok';
    case 'REVIEW':
    case 'POSSIBLE_REUSE':
      return 'warn';
    case 'FAIL':
    case 'MISMATCH':
    case 'DUPLICATE':
    case 'FLAG':
      return 'bad';
    default:
      return 'muted';
  }
}

function Badge({ children, tone }: { children: React.ReactNode; tone: Tone }) {
  const s = toneStyles[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${s.text} ${s.bg} border ${s.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {children}
    </span>
  );
}

export default function VerificationResultView({ result }: Props) {
  if (!result) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
        <div className="w-14 h-14 rounded-full bg-[#009E7E]/10 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-7 h-7 text-[#009E7E]" />
        </div>
        <h3 className="text-lg font-semibold text-[#1a1f2e]">Awaiting verification</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
          Submit a participant on the left. Results appear here with a confidence
          gauge, 8 evidence checks, and a full audit log.
        </p>
      </div>
    );
  }

  const decisionCfg = {
    APPROVE: {
      title: 'APPROVED — Participant Verified',
      Icon: CheckCircle2,
      classes: 'from-emerald-50 to-white border-emerald-300 text-emerald-800',
      iconClass: 'text-emerald-500',
    },
    MANUAL_REVIEW: {
      title: 'MANUAL REVIEW — Organizer Action Required',
      Icon: AlertTriangle,
      classes: 'from-amber-50 to-white border-amber-300 text-amber-800',
      iconClass: 'text-amber-500',
    },
    REJECT: {
      title: 'REJECTED — Ineligible or Suspicious',
      Icon: XCircle,
      classes: 'from-rose-50 to-white border-rose-300 text-rose-800',
      iconClass: 'text-rose-500',
    },
  }[result.decision];

  const c = result.checks;

  const evidence = [
    {
      key: 'ocr',
      title: 'OCR Quality',
      icon: FileText,
      status: c.ocr.status,
      tone: statusTone(c.ocr.status),
      detail: `Confidence · ${(c.ocr.confidence * 100).toFixed(0)}%`,
    },
    {
      key: 'eligibility',
      title: 'Age Eligibility',
      icon: Calendar,
      status: c.eligibility.status,
      tone: statusTone(c.eligibility.status),
      detail: `Age ${c.eligibility.age} · Min ${c.eligibility.minimum_age}`,
    },
    {
      key: 'quality',
      title: 'Image Quality',
      icon: Eye,
      status: c.quality.status,
      tone: statusTone(c.quality.status),
      detail: `${c.quality.label} · blur ${c.quality.blur_variance.toFixed(1)}`,
    },
    {
      key: 'ela',
      title: 'Tamper (ELA)',
      icon: Shield,
      status: c.ela.status,
      tone: statusTone(c.ela.status),
      detail: `${c.ela.label} · score ${c.ela.score.toFixed(2)}`,
    },
    {
      key: 'qr',
      title: 'QR Cross-Check',
      icon: QrCode,
      status: c.qr.status,
      tone: statusTone(c.qr.status),
      detail: c.qr.reason,
    },
    {
      key: 'duplicate',
      title: 'Duplicate Check',
      icon: CopyIcon,
      status: c.duplicate.status,
      tone: statusTone(c.duplicate.status),
      detail: c.duplicate.exact_match ? 'Exact ID match found' : 'No exact match',
    },
    {
      key: 'face',
      title: 'Face Match',
      icon: UserCheck,
      status: c.face.status,
      tone: statusTone(c.face.status),
      detail: c.face.available ? 'Selfie compared' : 'No selfie provided',
    },
    {
      key: 'name',
      title: 'Name Match',
      icon: User,
      status: c.name_match.status,
      tone: statusTone(c.name_match.status),
      detail: `Similarity · ${(c.name_match.score * 100).toFixed(0)}%`,
    },
  ] as const;

  const now = new Date();
  const auditEvents = evidence.map((e, i) => ({
    ...e,
    timeOffset: i * 180,
  }));

  return (
    <div className="space-y-5">
      {/* Decision banner */}
      <div
        className={`rounded-2xl border bg-gradient-to-br px-5 py-5 flex items-center gap-4 shadow-sm ${decisionCfg.classes}`}
      >
        <decisionCfg.Icon className={`w-10 h-10 shrink-0 ${decisionCfg.iconClass}`} />
        <div className="flex-1 min-w-0">
          <div className="text-lg font-bold tracking-tight">{decisionCfg.title}</div>
          <div className="text-sm mt-1 opacity-90">{result.summary}</div>
        </div>
        <div className="hidden sm:block text-right">
          <div className="text-[11px] uppercase tracking-widest opacity-70">Registration</div>
          <div className="text-xl font-bold">#{result.registration_id}</div>
        </div>
      </div>

      {/* Gauge + Extracted */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-center">
        <ConfidenceGauge value={result.confidence} />
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-[#1a1f2e]">Extracted from ID</h3>
              <p className="text-xs text-gray-500">What the AI pulled off the card</p>
            </div>
            <span
              className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded-full border ${
                result.extracted.ocr_mode === 'AWS_TEXTRACT'
                  ? 'bg-[#009E7E]/10 text-[#007A60] border-[#009E7E]/30'
                  : 'bg-gray-100 text-gray-600 border-gray-200'
              }`}
            >
              {result.extracted.ocr_mode}
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
            <ExtractedRow label="Name" value={result.extracted.name} />
            <ExtractedRow label="DOB" value={result.extracted.dob} />
            <ExtractedRow label="ID Number" value={result.extracted.id_number} />
            <ExtractedRow label="Institution" value={result.extracted.institution} />
            <ExtractedRow label="ID Type" value={result.extracted.id_type} />
            <ExtractedRow label="OCR Mode" value={result.extracted.ocr_mode} />
          </dl>
        </div>
      </div>

      {/* Evidence grid */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">
            Evidence Checks
          </h3>
          <span className="text-xs text-gray-400">{evidence.length} signals</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {evidence.map((e) => (
            <div
              key={e.key}
              className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#f7f9fc] flex items-center justify-center">
                  <e.icon className="w-4 h-4 text-[#1a1f2e]" />
                </div>
                <Badge tone={e.tone}>{e.status.replace('_', ' ')}</Badge>
              </div>
              <div className="mt-3 text-sm font-semibold text-[#1a1f2e]">{e.title}</div>
              <div className="text-xs text-gray-500 mt-1 line-clamp-2">{e.detail}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Strong flags */}
      {result.strong_flags.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <h4 className="text-sm font-bold text-rose-700 uppercase tracking-wide">
              Strong Flags
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {result.strong_flags.map((f) => (
              <span
                key={f}
                className="inline-flex items-center gap-1.5 bg-white border border-rose-300 text-rose-700 rounded-full px-3 py-1 text-xs font-semibold"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                {f.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Reasons */}
      {result.reasons.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-[#009E7E]" />
            <h4 className="text-sm font-bold uppercase tracking-wide text-gray-500">
              Reasoning
            </h4>
          </div>
          <ul className="space-y-2">
            {result.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[#374151]">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#009E7E] shrink-0" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Audit log */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-[#009E7E]" />
          <h4 className="text-sm font-bold uppercase tracking-wide text-gray-500">
            Audit Log
          </h4>
        </div>
        <ol className="relative border-l border-gray-200 ml-2 space-y-4">
          {auditEvents.map((e) => {
            const t = new Date(now.getTime() - (auditEvents.length - 1) * 180 + e.timeOffset);
            return (
              <li key={e.key} className="pl-5 relative">
                <span
                  className={`absolute -left-[6px] top-1 w-3 h-3 rounded-full border-2 border-white ${toneStyles[e.tone].dot}`}
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-[#1a1f2e]">{e.title}</span>
                  <Badge tone={e.tone}>{e.status.replace('_', ' ')}</Badge>
                  <span className="text-[11px] text-gray-400 ml-auto tabular-nums">
                    {t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{e.detail}</div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function ExtractedRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
        {label}
      </dt>
      <dd className="text-sm font-medium text-[#1a1f2e] mt-0.5 truncate">
        {value || <span className="text-gray-400">—</span>}
      </dd>
    </div>
  );
}
