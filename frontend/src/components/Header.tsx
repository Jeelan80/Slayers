'use client';

import { useEffect, useState } from 'react';
import { Shield, RotateCcw, Zap, Wifi, WifiOff } from 'lucide-react';
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
    return () => { cancelled = true; clearInterval(iv); };
  }, []);

  const handleReset = async () => {
    if (resetting) return;
    if (typeof window !== 'undefined' && !window.confirm('Reset all demo data? This clears every registration.')) return;
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

  return (
    <header className="sticky top-0 z-40 border-b border-[#e2e8f0]/80"
      style={{ background: 'rgba(248,250,252,0.82)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">

        {/* Logo */}
        <div className="flex items-center gap-2.5 mr-4">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-primary"
              style={{ background: 'linear-gradient(135deg, #009E7E 0%, #007A60 100%)' }}>
              <Shield className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#FF6B2B] border-2 border-white flex items-center justify-center">
              <Zap className="w-2 h-2 text-white" strokeWidth={3} />
            </span>
          </div>
          <div className="leading-tight">
            <div className="font-black text-xl tracking-tight gradient-text-green">VeriForge</div>
            <div className="text-[9px] uppercase tracking-[0.18em] text-[#64748b] font-semibold">
              Hackingly · PS-003
            </div>
          </div>
        </div>

        {/* Center badge */}
        <div className="hidden lg:flex items-center gap-2 bg-gradient-to-r from-[#009E7E]/10 to-[#FF6B2B]/10
          border border-[#009E7E]/20 rounded-full px-3 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B2B] animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#009E7E]">
            AI Build Challenge — Bengaluru 2026
          </span>
        </div>

        <div className="flex-1" />

        {/* Health pill */}
        <div className={`hidden md:flex items-center gap-2 rounded-full px-3 py-1.5 border text-xs font-semibold transition-colors ${
          healthy === true
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : healthy === false
            ? 'bg-rose-50 border-rose-200 text-rose-600'
            : 'bg-gray-50 border-gray-200 text-gray-500'
        }`}>
          {healthy === true ? (
            <><Wifi className="w-3.5 h-3.5" /><span>Backend live{version ? ` · v${version}` : ''}</span></>
          ) : healthy === false ? (
            <><WifiOff className="w-3.5 h-3.5" /><span>Backend offline</span></>
          ) : (
            <><div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /><span>Checking…</span></>
          )}
        </div>

        {/* Reset button */}
        <button
          type="button"
          onClick={handleReset}
          disabled={resetting}
          className="inline-flex items-center gap-1.5 border border-rose-200 text-rose-500
            hover:bg-rose-50 hover:border-rose-300 disabled:opacity-50
            rounded-full px-4 py-1.5 text-sm font-semibold transition-all"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
          Reset
        </button>
      </div>
    </header>
  );
}
