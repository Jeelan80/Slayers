'use client';

import { useEffect, useState } from 'react';
import { Shield, RotateCcw, Activity } from 'lucide-react';
import { fetchHealth, resetDemo } from '@/utils/api';

interface Props {
  onReset: () => void;
  onNotify: (kind: 'success' | 'error' | 'info', message: string) => void;
}

export default function Header({ onReset, onNotify }: Props) {
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [version, setVersion] = useState<string>('');
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const h = await fetchHealth();
        if (cancelled) return;
        setHealthy(h.status === 'ok');
        setVersion(h.version || '');
      } catch {
        if (!cancelled) setHealthy(false);
      }
    };
    tick();
    const iv = setInterval(tick, 8000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, []);

  const handleReset = async () => {
    if (resetting) return;
    if (typeof window !== 'undefined' && !window.confirm('Reset all demo data? This clears every registration.')) {
      return;
    }
    setResetting(true);
    try {
      await resetDemo();
      onReset();
      onNotify('success', 'Demo data reset. Fresh slate ready.');
    } catch (e) {
      onNotify('error', e instanceof Error ? e.message : 'Reset failed');
    } finally {
      setResetting(false);
    }
  };

  const dotColor =
    healthy === null ? 'bg-gray-300' : healthy ? 'bg-emerald-500' : 'bg-rose-500';
  const dotPulse = healthy ? 'animate-pulse' : '';

  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2 pl-1 pr-4">
          <div className="w-9 h-9 rounded-full bg-[#009E7E]/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#009E7E]" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="text-[#1a1f2e] font-bold text-lg tracking-tight">
              VeriForge
            </div>
            <div className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
              Hackingly · PS-003
            </div>
          </div>
        </div>

        <div className="flex-1" />

        <div className="hidden md:flex items-center gap-2 border border-gray-200 rounded-full px-3 py-1.5 shadow-sm">
          <span className={`inline-block w-2 h-2 rounded-full ${dotColor} ${dotPulse}`} />
          <span className="text-xs font-medium text-gray-700">
            {healthy === null
              ? 'Checking backend…'
              : healthy
              ? `Backend live${version ? ` · v${version}` : ''}`
              : 'Backend offline'}
          </span>
          <Activity className="w-3.5 h-3.5 text-gray-400" />
        </div>

        <button
          type="button"
          onClick={handleReset}
          disabled={resetting}
          className="inline-flex items-center gap-1.5 border border-rose-300 text-rose-600 hover:bg-rose-50 disabled:opacity-60 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors"
        >
          <RotateCcw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
          Reset Demo
        </button>
      </div>
    </header>
  );
}
