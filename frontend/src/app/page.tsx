'use client';

import { supabase } from '@/lib/supabase';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-[#090d16] text-white">
      <div className="max-w-md w-full p-6 bg-slate-900 border border-slate-800 rounded-xl text-center space-y-4">
        <h1 className="text-xl font-bold tracking-tight">VeriForge</h1>
        <p className="text-sm text-slate-400">
          Clean application. Supabase configuration active.
        </p>
        <div className="text-xs font-mono text-emerald-400 bg-emerald-950/40 py-1.5 px-3 rounded border border-emerald-900/50 inline-block">
          Supabase Ready
        </div>
      </div>
    </main>
  );
}
