'use client';

import { useCallback, useRef, useState } from 'react';
import { Search, ClipboardList, FlaskConical } from 'lucide-react';
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
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  const runVerification = async (values: VerificationFormValues) => {
    setSubmitting(true);
    setStage('uploading');
    setResult(null);

    // Simulated stage progression during API call
    const stages: PipelineStage[] = ['ocr', 'tamper', 'validation', 'decision'];
    let idx = 0;
    const iv = setInterval(() => {
      if (idx < stages.length) {
        setStage(stages[idx]);
        idx++;
      }
    }, 380);

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
      <Header
        onReset={() => {
          setRefreshKey((k) => k + 1);
          setResult(null);
        }}
        onNotify={notify}
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* Hero-ish intro */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-2">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-[#009E7E]">
          <span className="inline-block w-2 h-2 rounded-full bg-[#FF6B2B] animate-pulse" />
          Live Console
        </div>
        <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-[#1a1f2e]">
          AI Identity & Eligibility Verification
        </h1>
        <p className="mt-2 text-sm sm:text-base text-gray-500 max-w-2xl">
          Verify participants in seconds. Detect tampered IDs, duplicate registrations,
          and underage entries before they reach the venue.
        </p>
      </section>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 border-b border-gray-100">
        <div className="flex overflow-x-auto gap-1 -mb-px">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-2 px-4 sm:px-5 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                  active
                    ? 'border-[#009E7E] text-[#009E7E]'
                    : 'border-transparent text-gray-500 hover:text-[#1a1f2e]'
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {tab === 'verify' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-5">
              <VerificationForm onSubmit={runVerification} loading={submitting} />

              {(submitting || stage === 'complete') && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#007A60] mb-3">
                    Verification Pipeline
                  </div>
                  <PipelineProgress stage={stage} />
                </div>
              )}
            </div>

            <div>
              <VerificationResultView result={result} />
            </div>
          </div>
        )}

        {tab === 'audit' && <AuditQueue onNotify={notify} refreshKey={refreshKey} />}

        {tab === 'demo' && (
          <DemoScenarios
            onNotify={notify}
            onCompleted={() => setRefreshKey((k) => k + 1)}
          />
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-xs text-gray-400 text-center">
        VeriForge · Built for Hackingly AI Build Challenge · PS-003
      </footer>
    </div>
  );
}
