'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, Activity, RefreshCw, Database, Server, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { BackendHealth } from '@/types';

interface HeaderProps {
  onDbReset?: () => void;
}

export function Header({ onDbReset }: HeaderProps) {
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [lastChecked, setLastChecked] = useState<string>('');

  const checkHealth = async () => {
    setIsChecking(true);
    try {
      const res = await fetch('http://localhost:8000/api/health', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      } else {
        setHealth(null);
      }
    } catch {
      setHealth(null);
    } finally {
      setIsChecking(false);
      setLastChecked(new Date().toLocaleTimeString());
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset the verification database and audit trail?')) return;
    setIsResetting(true);
    try {
      const res = await fetch('http://localhost:8000/api/reset', { method: 'POST' });
      if (res.ok) {
        alert('Verification database reset successfully!');
        if (onDbReset) onDbReset();
      }
    } catch {
      alert('Failed to reset database. Backend might be unreachable.');
    } finally {
      setIsResetting(false);
    }
  };

  const isOnline = health?.status === 'ok';

  return (
    <header className="border-b border-slate-800 bg-[#090d16]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Track Info */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/30">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-white tracking-tight">
                  VeriForge
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-950/80 text-blue-400 border border-blue-800/60">
                  Team Slayers
                </span>
              </div>
              <p className="text-xs text-slate-400">
                AI Identity & Eligibility Verification · <span className="text-cyan-400 font-medium">PS-003 Hackingly Track</span>
              </p>
            </div>
          </div>
        </div>

        {/* Status Indicators & Fast Actions */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end text-xs">
          {/* Backend Status Indicator */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
              isOnline
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                }`}
              />
              {isOnline && (
                <span className="absolute h-4 w-4 rounded-full bg-emerald-400/30 animate-ping" />
              )}
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-medium flex items-center gap-1">
                {isOnline ? 'Backend Online (Port 8000)' : 'Backend Offline'}
                {isOnline ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 inline" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-rose-400 inline" />
                )}
              </span>
              <span className="text-[10px] text-slate-400">
                {isOnline ? `FastAPI v${health?.version || '0.1.0'} · OCR Ready` : 'Checking http://localhost:8000/api/health'}
              </span>
            </div>

            <button
              onClick={checkHealth}
              disabled={isChecking}
              title="Refresh health check"
              className="ml-1 p-1 hover:bg-slate-800/60 rounded text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>

          {/* Cloud Sync Tag */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300">
            <Database className="h-3.5 w-3.5 text-blue-400" />
            <span>SQLite & RLS Audit</span>
          </div>

          {/* Reset DB Button */}
          <button
            onClick={handleReset}
            disabled={isResetting || !isOnline}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/50 border border-slate-800 hover:border-rose-700/60 text-slate-300 hover:text-rose-300 transition-all text-xs font-medium disabled:opacity-40"
            title="Wipe demo database and start fresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span>Reset DB</span>
          </button>
        </div>
      </div>
    </header>
  );
}
