'use client';

import { useCallback, useRef, useState } from 'react';
import { Search, ClipboardList, FlaskConical, ShieldCheck, TrendingUp, Users } from 'lucide-react';
import Header from '@/components/Header';
import VerificationForm, { type VerificationFormValues } from '@/components/VerificationForm';
import VerificationResultView from '@/components/VerificationResult';
import PipelineProgress from '@/components/PipelineProgress';
import AuditQueue from '@/components/AuditQueue';
import DemoScenarios from '@/components/DemoScenarios';
import ToastStack from '@/components/Toast';
import type { PipelineStage, Toast, VerificationResult } from '@/types';
import { submitVerification } from '@/utils/api';

type Tab = 'verify' | 'audit' | 'demo';

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'verify', label: 'Verify Participant', icon: Search },
  { key: 'audit',  label: 'Audit Queue',        icon: ClipboardList },
  { key: 'demo',   label: 'Demo Scenarios',     icon: FlaskConical },
];

const STATS = [
  { icon: ShieldCheck,  label: 'Checks per Scan', value: '8',    color: 'text-[#009E7E]', bg: 'bg-[#009E7E]/10' },
  { icon: TrendingUp,   label: 'Avg Confidence',  value: '94%',  color: 'text-[#FF6B2B]', bg: 'bg-[#FF6B2B]/10' },
  { icon: Users,        label: 'Detection Modes', value: '6',    color: 'text-violet-600', bg: 'bg-violet-50' },
];

export default function HomePage() {
  const [tab, setTab] = useState<Tab>('verify');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextToastId = useRef(1);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState<PipelineStage>('idle');
  const [refreshKey, setRefreshKey] = useState(0);

  const notify = useCallback((kind: Toast['kind'], message: string) => {
    const id = nextToastId.current++;
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  const dismissToast = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const runVerification = async (values: VerificationFormValues) => {
    setSubmitting(true);
    setStage('uploading');
    setResult(null);
    const stages: PipelineStage[] = ['ocr', 'tamper', 'validation', 'decision'];
    let idx = 0;
    const iv = setInterval(() => { if (idx < stages.length) { setStage(stages[idx]); idx++; } }, 380);
    try {
      const form = new FormData();
      form.append('id_image', values.id_image);
      if (values.selfie) form.append('selfie', values.selfie);
      form.append('name', values.name);
      form.append('dob', values.dob);
      form.append('id_number', values.id_number);
      form.append('institution', values.institution);
      form.append('email', values.email);
      const res = await submitVerification(form);
      setResult(res);
      setStage('complete');
      setRefreshKey((k) => k + 1);
      notify(
        res.decision === 'APPROVE' ? 'success' : res.decision === 'REJECT' ? 'error' : 'info',
        `Registration #${res.registration_id} → ${res.decision.replace('_', ' ')}`,
      );
    } catch (e) {
      setStage('idle');
      notify('error', e instanceof Error ? e.message : 'Verification failed');
    } finally {
      clearInterval(iv);
      setSubmitting(false);
      setTimeout(() => setStage((s) => (s === 'complete' ? 'idle' : s)), 1200);
    }
  };

  return (
    <div className="min-h-screen">
      <Header onReset={() => { setRefreshKey((k) => k + 1); setResult(null); }} onNotify={notify} />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 w-[440px] h-[440px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #009E7E 0%, transparent 70%)' }} />
          <div className="absolute -top-10 right-0 w-[300px] h-[300px] rounded-full opacity-[0.06]"
            style={{ background: 'radial-gradient(circle, #FF6B2B 0%, transparent 70%)' }} />
          {/* Hackingly-style hex accents */}
          <svg className="absolute top-4 right-[15%] opacity-[0.06]" width="120" height="140" viewBox="0 0 120 140">
            <polygon points="60,5 115,32.5 115,107.5 60,135 5,107.5 5,32.5" fill="#009E7E" />
          </svg>
          <svg className="absolute bottom-2 left-[10%] opacity-[0.05]" width="80" height="92" viewBox="0 0 80 92">
            <polygon points="40,3 77,22 77,70 40,89 3,70 3,22" fill="#FF6B2B" />
          </svg>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 bg-[#FF6B2B]/10 border border-[#FF6B2B]/25 text-[#FF6B2B] rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B2B] animate-pulse" />
              Live Console
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 bg-[#009E7E]/10 border border-[#009E7E]/20 text-[#009E7E] rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest">
              AI Build Challenge · Bengaluru
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
            <span className="text-[#0f172a]">AI Identity &amp;</span>{' '}
            <span className="gradient-text-green">Eligibility</span>
            <br className="hidden sm:block" />
            {' '}<span className="text-[#0f172a]">Verification</span>
          </h1>
          <p className="mt-3 text-base sm:text-lg text-[#64748b] max-w-2xl leading-relaxed">
            Verify participants in seconds. Detect tampered IDs, duplicate registrations,
            and underage entries before they reach the venue —{' '}
            <span className="text-[#009E7E] font-semibold">powered by AWS Textract + AI forensics.</span>
          </p>

          {/* Stat chips */}
          <div className="flex flex-wrap gap-3 mt-5">
            {STATS.map((s) => (
              <div key={s.label} className="flex items-center gap-2 bg-white border border-[#e2e8f0] rounded-2xl px-4 py-2.5 shadow-sm">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${s.bg}`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div>
                  <div className={`text-lg font-black leading-none ${s.color}`}>{s.value}</div>
                  <div className="text-[10px] uppercase tracking-wide text-[#94a3b8] font-semibold">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TABS ──────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-2">
        <div className="flex gap-1 bg-white border border-[#e2e8f0] rounded-2xl p-1 shadow-sm w-fit">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl whitespace-nowrap transition-all ${
                  active
                    ? 'bg-[#009E7E] text-white shadow-primary'
                    : 'text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9]'
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CONTENT ───────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {tab === 'verify' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-5 fade-up">
              <VerificationForm onSubmit={runVerification} loading={submitting} />
              {(submitting || stage === 'complete') && (
                <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-[#009E7E] animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#009E7E]">
                      Verification Pipeline
                    </span>
                  </div>
                  <PipelineProgress stage={stage} />
                </div>
              )}
            </div>
            <div className="fade-up fade-up-1">
              <VerificationResultView result={result} />
            </div>
          </div>
        )}
        {tab === 'audit' && <AuditQueue onNotify={notify} refreshKey={refreshKey} />}
        {tab === 'demo' && <DemoScenarios onNotify={notify} onCompleted={() => setRefreshKey((k) => k + 1)} />}
      </main>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 py-8 mt-4 border-t border-[#e2e8f0]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#009E7E,#007A60)' }}>
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-[#334155]">VeriForge</span>
          </div>
          <p className="text-xs text-[#94a3b8] text-center">
            Built for Hackingly AI Build Challenge · Bengaluru 2026 · PS-003 · Team Slayers
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#94a3b8]">Powered by</span>
            <span className="text-xs font-bold text-[#009E7E]">AWS Textract + Gemini AI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
