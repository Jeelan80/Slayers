'use client';

import { useEffect, useState } from 'react';
import { Shield, RotateCcw, Zap, Wifi, WifiOff, LogIn, LogOut, User } from 'lucide-react';
import { fetchHealth, resetDemo } from '@/utils/api';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface Props {
  onReset: () => void;
  onNotify: (kind: 'success' | 'error' | 'info', message: string) => void;
}

export default function Header({ onReset, onNotify }: Props) {
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [version, setVersion] = useState<string>('');
  const [resetting, setResetting] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

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

    // Supabase auth state listener
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!cancelled) setUser(session?.user ?? null);
    };
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      clearInterval(iv);
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSignInWithGoogle = async () => {
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
        },
      });
      if (error) throw error;
    } catch (e) {
      onNotify('error', e instanceof Error ? e.message : 'Google sign-in failed');
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      onNotify('info', 'Signed out successfully');
    } catch (e) {
      onNotify('error', e instanceof Error ? e.message : 'Sign-out failed');
    } finally {
      setAuthLoading(false);
    }
  };

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

        {/* Google Auth Button / Profile */}
        {user ? (
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full pl-2 pr-3 py-1 shadow-sm">
            {user.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt={user.user_metadata?.full_name || 'User'}
                className="w-6 h-6 rounded-full border border-slate-200"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-[#009E7E]/15 text-[#009E7E] flex items-center justify-center">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
            <span className="text-xs font-semibold text-slate-700 max-w-[120px] truncate">
              {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={authLoading}
              title="Sign Out"
              className="text-slate-400 hover:text-rose-500 ml-1 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSignInWithGoogle}
            disabled={authLoading}
            className="inline-flex items-center gap-2 bg-white border border-slate-300 hover:border-slate-400
              hover:bg-slate-50 text-slate-700 font-semibold text-xs px-3.5 py-1.5 rounded-full shadow-xs
              transition-all disabled:opacity-60"
          >
            {authLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Sign in with Google</span>
          </button>
        )}

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
