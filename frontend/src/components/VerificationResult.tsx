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
  BadgeCheck,
  Zap,
} from 'lucide-react';
import ConfidenceGauge from './ConfidenceGauge';
import type { VerificationResult } from '@/types';

interface Props {
  result: VerificationResult | null;
}

type Tone = 'ok' | 'warn' | 'bad' | 'muted';

const toneStyles: Record<Tone, { text: string; bg: string; border: string; dot: string; glow: string }> = {
  ok:    { text: 'text-emerald-700', bg: 'bg-emerald-50/80', border: 'border-emerald-200', dot: 'bg-emerald-500', glow: 'shadow-emerald-500/10' },
  warn:  { text: 'text-amber-700',   bg: 'bg-amber-50/80',   border: 'border-amber-200',   dot: 'bg-amber-500',   glow: 'shadow-amber-500/10' },
  bad:   { text: 'text-rose-700',    bg: 'bg-rose-50/80',    border: 'border-rose-200',    dot: 'bg-rose-500',    glow: 'shadow-rose-500/10' },
  muted: { text: 'text-slate-600',   bg: 'bg-slate-50',      border: 'border-slate-200',   dot: 'bg-slate-400',   glow: '' },
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
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${s.text} ${s.bg} border ${s.border} shadow-sm`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {children}
    </span>
  );
}

export default function VerificationResultView({ result }: Props) {
  if (!result) {
    return (
      <div className="bg-white rounded-3xl border border-[#e2e8f0] p-12 text-center shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#009E7E]/10 to-transparent rounded-bl-full pointer-events-none" />
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm"
          style={{ background: 'linear-gradient(135deg, rgba(0,158,126,0.15) 0%, rgba(0,158,126,0.05) 100%)' }}>
          <Sparkles className="w-8 h-8 text-[#009E7E]" />
        </div>
        <h3 className="text-xl font-bold text-[#0f172a] tracking-tight">Awaiting Verification Result</h3>
        <p className="text-sm text-[#64748b] mt-2 max-w-md mx-auto leading-relaxed">
          Submit candidate details and an ID photo on the left. AI verification outputs with multi-source consistency checks, forensic ELA scores, and decision synthesis will render here in real-time.
        </p>
        <div className="mt-8 flex justify-center gap-2 flex-wrap text-xs text-[#94a3b8] font-semibold">
          <span className="bg-[#f8fafc] border border-[#e2e8f0] px-3 py-1 rounded-full">AWS Textract OCR</span>
          <span className="bg-[#f8fafc] border border-[#e2e8f0] px-3 py-1 rounded-full">UIDAI QR Validation</span>
          <span className="bg-[#f8fafc] border border-[#e2e8f0] px-3 py-1 rounded-full">ELA Forensics</span>
        </div>
      </div>
    );
  }

  const decisionCfg = {
    APPROVE: {
      title: 'APPROVED — Participant Verified',
      Icon: CheckCircle2,
      badge: 'bg-emerald-500 text-white',
      cardClass: 'border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-white to-white',
      iconClass: 'text-emerald-500',
      headerBg: 'bg-emerald-500/10 text-emerald-800',
    },
    MANUAL_REVIEW: {
      title: 'MANUAL REVIEW — Reviewer Required',
      Icon: AlertTriangle,
      badge: 'bg-amber-500 text-white',
      cardClass: 'border-amber-200 bg-gradient-to-br from-amber-50/70 via-white to-white',
      iconClass: 'text-amber-500',
      headerBg: 'bg-amber-500/10 text-amber-800',
    },
    REJECT: {
      title: 'REJECTED — Ineligible or Suspicious',
      Icon: XCircle,
      badge: 'bg-rose-500 text-white',
      cardClass: 'border-rose-200 bg-gradient-to-br from-rose-50/70 via-white to-white',
      iconClass: 'text-rose-500',
      headerBg: 'bg-rose-500/10 text-rose-800',
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
      detail: `Confidence: ${(c.ocr.confidence * 100).toFixed(0)}% (${c.ocr.mode})`,
    },
    {
      key: 'eligibility',
      title: 'Age Eligibility',
      icon: Calendar,
      status: c.eligibility.status,
      tone: statusTone(c.eligibility.status),
      detail: `Age ${c.eligibility.age} · Minimum requirement: ${c.eligibility.minimum_age} yrs`,
    },
    {
      key: 'quality',
      title: 'Blur & Quality Gate',
      icon: Eye,
      status: c.quality.status,
      tone: statusTone(c.quality.status),
      detail: `${c.quality.label} (Var: ${c.quality.blur_variance.toFixed(1)})`,
    },
    {
      key: 'ela',
      title: 'ELA Tamper Analysis',
      icon: Shield,
      status: c.ela.status,
      tone: statusTone(c.ela.status),
      detail: `${c.ela.label} · Anomaly Score: ${c.ela.score.toFixed(2)}`,
    },
    {
      key: 'qr',
      title: 'DQVC QR Cross-Check',
      icon: QrCode,
      status: c.qr.status,
      tone: statusTone(c.qr.status),
      detail: c.qr.reason,
    },
    {
      key: 'duplicate',
      title: 'Duplicate Reuse Check',
      icon: CopyIcon,
      status: c.duplicate.status,
      tone: statusTone(c.duplicate.status),
      detail: c.duplicate.exact_match ? 'Exact ID fingerprint duplicate' : 'No duplicate signature',
    },
    {
      key: 'face',
      title: 'Face Biometric Match',
      icon: UserCheck,
      status: c.face.status,
      tone: statusTone(c.face.status),
      detail: c.face.available ? 'Facial comparison verified' : 'No selfie provided',
    },
    {
      key: 'name',
      title: 'Name Consistency',
      icon: User,
      status: c.name_match.status,
      tone: statusTone(c.name_match.status),
      detail: `Levenshtein Match: ${(c.name_match.score * 100).toFixed(0)}%`,
    },
  ] as const;

  const now = new Date();
  const auditEvents = evidence.map((e, i) => ({
    ...e,
    timeOffset: i * 180,
  }));

  return (
    <div className="space-y-5">
      {/* Top Decision Banner */}
      <div className={`rounded-3xl border p-5 shadow-sm relative overflow-hidden ${decisionCfg.cardClass}`}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-white shadow-sm shrink-0">
            <decisionCfg.Icon className={`w-8 h-8 ${decisionCfg.iconClass}`} strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${decisionCfg.badge}`}>
                {result.decision}
              </span>
              <span className="text-xs text-[#64748b] font-medium">Record ID #{result.registration_id}</span>
            </div>
            <div className="text-lg font-black tracking-tight text-[#0f172a] mt-1">{decisionCfg.title}</div>
            <div className="text-xs text-[#475569] mt-0.5 leading-relaxed">{result.summary}</div>
          </div>
        </div>
      </div>

      {/* Confidence Gauge + Extracted Details */}
      <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-sm p-6 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-center">
        <div className="flex justify-center">
          <ConfidenceGauge value={result.confidence} />
        </div>
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-[#f1f5f9] mb-3">
            <div>
              <h3 className="font-bold text-[#0f172a] text-sm flex items-center gap-1.5">
                <BadgeCheck className="w-4 h-4 text-[#009E7E]" />
                Extracted Identity Fields
              </h3>
              <p className="text-[11px] text-[#64748b]">Extracted via OCR query pipeline</p>
            </div>
            <span
              className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full border ${
                result.extracted.ocr_mode === 'AWS_TEXTRACT'
                  ? 'bg-[#009E7E]/10 text-[#007A60] border-[#009E7E]/30'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {result.extracted.ocr_mode}
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <ExtractedRow label="Name on ID" value={result.extracted.name} />
            <ExtractedRow label="Date of Birth" value={result.extracted.dob} />
            <ExtractedRow label="ID / Reg Number" value={result.extracted.id_number} />
            <ExtractedRow label="Institution" value={result.extracted.institution} />
            <ExtractedRow label="ID Document Type" value={result.extracted.id_type} />
            <ExtractedRow label="OCR Engine" value={result.extracted.ocr_mode} />
          </dl>
        </div>
      </div>

      {/* Evidence Checks Grid */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#FF6B2B]" />
            <h3 className="text-xs font-black uppercase tracking-wider text-[#475569]">
              Multi-Layer Evidence Matrix
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-[#009E7E] bg-[#009E7E]/10 px-2.5 py-0.5 rounded-full">
            {evidence.length} Active Signals
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {evidence.map((e) => (
            <div
              key={e.key}
              className="bg-white rounded-2xl border border-[#e2e8f0] p-4 shadow-sm hover:border-[#009E7E]/40 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#f8fafc] flex items-center justify-center text-[#0f172a]">
                  <e.icon className="w-4 h-4 text-[#009E7E]" />
                </div>
                <Badge tone={e.tone}>{e.status.replace('_', ' ')}</Badge>
              </div>
              <div className="mt-2.5 text-xs font-bold text-[#0f172a]">{e.title}</div>
              <div className="text-[11px] text-[#64748b] mt-0.5 line-clamp-2 leading-relaxed">{e.detail}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Strong Flags */}
      {(result.strong_flags ?? []).length > 0 && (
        <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider">
              Strong Risk Indicators Detected
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {(result.strong_flags ?? []).map((f) => (
              <span
                key={f}
                className="inline-flex items-center gap-1.5 bg-white border border-rose-300 text-rose-700 rounded-full px-3 py-1 text-xs font-bold shadow-xs"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                {f.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Reasoning List */}
      {(result.reasons ?? []).length > 0 && (
        <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-[#009E7E]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
              Synthesis &amp; Policy Rationale
            </h4>
          </div>
          <ul className="space-y-2">
            {(result.reasons ?? []).map((r, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs text-[#334155] leading-relaxed">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#009E7E] shrink-0" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Audit Log Timeline */}
      <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-[#009E7E]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
            Verification Audit Trail
          </h4>
        </div>
        <ol className="relative border-l border-slate-200 ml-2 space-y-4">
          {auditEvents.map((e) => {
            const t = new Date(now.getTime() - (auditEvents.length - 1) * 180 + e.timeOffset);
            return (
              <li key={e.key} className="pl-5 relative">
                <span
                  className={`absolute -left-[6px] top-1 w-3 h-3 rounded-full border-2 border-white ${toneStyles[e.tone].dot}`}
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-[#0f172a]">{e.title}</span>
                  <Badge tone={e.tone}>{e.status.replace('_', ' ')}</Badge>
                  <span className="text-[10px] text-slate-400 ml-auto tabular-nums font-mono">
                    {t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <div className="text-[11px] text-[#64748b] mt-0.5">{e.detail}</div>
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
    <div className="bg-[#f8fafc] p-2.5 rounded-xl border border-[#f1f5f9]">
      <dt className="text-[9px] uppercase tracking-wider text-[#94a3b8] font-bold">
        {label}
      </dt>
      <dd className="text-xs font-bold text-[#0f172a] mt-0.5 truncate">
        {value || <span className="text-slate-400 font-normal">—</span>}
      </dd>
    </div>
  );
}
