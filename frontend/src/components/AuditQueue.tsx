'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Check,
  X,
  RefreshCw,
  Inbox,
  Clock,
  Filter as FilterIcon,
} from 'lucide-react';
import type { Registration } from '@/types';
import { fetchRegistrations, reviewRegistration } from '@/utils/api';

interface Props {
  onNotify: (kind: 'success' | 'error' | 'info', message: string) => void;
  refreshKey: number;
}

type Filter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

const FILTERS: Filter[] = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'];

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function decisionBadge(decision: Registration['decision']) {
  switch (decision) {
    case 'APPROVE':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 text-[11px] font-bold uppercase tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Approved
        </span>
      );
    case 'MANUAL_REVIEW':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 text-[11px] font-bold uppercase tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Needs Review
        </span>
      );
    case 'REJECT':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1 text-[11px] font-bold uppercase tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Rejected
        </span>
      );
  }
}

function reviewStatusPill(status: Registration['review_status']) {
  const map = {
    PENDING: 'bg-amber-100/80 text-amber-800 border-amber-200',
    APPROVED: 'bg-emerald-100/80 text-emerald-800 border-emerald-200',
    REJECTED: 'bg-rose-100/80 text-rose-800 border-rose-200',
  } as const;
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider rounded-md px-2 py-0.5 border ${map[status] || 'bg-slate-100 text-slate-700'}`}>
      {status}
    </span>
  );
}

export default function AuditQueue({ onNotify, refreshKey }: Props) {
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');
  const [pendingId, setPendingId] = useState<number | null>(null);

  const load = async () => {
    try {
      const data = await fetchRegistrations();
      setRegs(Array.isArray(data) ? data : []);
      setLastUpdated(new Date());
    } catch (e) {
      onNotify('error', e instanceof Error ? e.message : 'Failed to load queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  useEffect(() => {
    const iv = setInterval(load, 10000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    let approve = 0, review = 0, reject = 0;
    for (const r of regs) {
      if (r.decision === 'APPROVE') approve++;
      else if (r.decision === 'MANUAL_REVIEW') review++;
      else if (r.decision === 'REJECT') reject++;
    }
    return { total: regs.length, approve, review, reject };
  }, [regs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return regs.filter((r) => {
      if (filter === 'PENDING' && r.review_status !== 'PENDING') return false;
      if (filter === 'APPROVED' && r.review_status !== 'APPROVED') return false;
      if (filter === 'REJECTED' && r.review_status !== 'REJECTED') return false;
      if (q && !r.name?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [regs, filter, query]);

  const doReview = async (id: number, action: 'APPROVE' | 'REJECT') => {
    setPendingId(id);
    try {
      await reviewRegistration(id, action);
      onNotify('success', `Registration #${id} marked as ${action.toLowerCase()}d.`);
      await load();
    } catch (e) {
      onNotify('error', e instanceof Error ? e.message : 'Review action failed');
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="space-y-6 fade-up">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Submissions" value={stats.total} icon={Users} tone="neutral" />
        <StatCard label="AI Approved" value={stats.approve} icon={CheckCircle2} tone="ok" />
        <StatCard label="Pending Review" value={stats.review} icon={AlertTriangle} tone="warn" />
        <StatCard label="Rejected Entries" value={stats.reject} icon={XCircle} tone="bad" />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold uppercase text-[#94a3b8] px-2 flex items-center gap-1">
            <FilterIcon className="w-3 h-3" /> Filter:
          </span>
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider border transition-all ${
                filter === f
                  ? 'bg-[#009E7E] text-white border-[#009E7E] shadow-sm'
                  : 'bg-[#f8fafc] text-[#64748b] border-[#e2e8f0] hover:border-[#009E7E] hover:text-[#009E7E]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-[#94a3b8] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search participant by name…"
            className="w-full bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#009E7E] focus:ring-2 focus:ring-[#009E7E]/15 rounded-xl pl-9 pr-3 py-2 text-xs font-medium outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            load();
          }}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#64748b] hover:text-[#009E7E] bg-[#f8fafc] border border-[#e2e8f0] px-3 py-2 rounded-xl transition-colors"
          title="Refresh table"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#009E7E]' : ''}`} />
          {lastUpdated ? `${timeAgo(lastUpdated.toISOString())}` : 'Syncing…'}
        </button>
      </div>

      {/* Registrations Table */}
      <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-8 h-8 text-[#94a3b8]" />
            </div>
            <h3 className="text-base font-bold text-[#0f172a]">
              {regs.length === 0 ? 'No Verification Records Yet' : 'No Matching Records Found'}
            </h3>
            <p className="text-xs text-[#64748b] mt-1 max-w-sm mx-auto leading-relaxed">
              {regs.length === 0
                ? 'Run an identity scan from the "Verify Participant" tab or trigger a demo scenario.'
                : 'Try adjusting your search query or switching active filter status.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-[#64748b] bg-[#f8fafc] border-b border-[#e2e8f0]">
                  <th className="px-5 py-3.5 font-bold">ID</th>
                  <th className="px-5 py-3.5 font-bold">Participant</th>
                  <th className="px-5 py-3.5 font-bold">Timestamp</th>
                  <th className="px-5 py-3.5 font-bold">AI Decision</th>
                  <th className="px-5 py-3.5 font-bold">Confidence</th>
                  <th className="px-5 py-3.5 font-bold">Risk Flags</th>
                  <th className="px-5 py-3.5 font-bold text-right">Review Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {filtered.map((r) => {
                  const pct = Math.round(r.confidence * 100);
                  const barColor =
                    pct >= 75 ? 'bg-[#009E7E]' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500';
                  return (
                    <tr key={r.id} className="hover:bg-[#f8fafc]/80 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-[#64748b]">#{r.id}</td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-[#0f172a] text-sm">{r.name || 'Anonymous User'}</div>
                        <div className="mt-1">{reviewStatusPill(r.review_status)}</div>
                      </td>
                      <td className="px-5 py-4 text-[#64748b] font-medium flex items-center gap-1.5 mt-2">
                        <Clock className="w-3 h-3 text-[#94a3b8]" />
                        {timeAgo(r.created_at)}
                      </td>
                      <td className="px-5 py-4">{decisionBadge(r.decision)}</td>
                      <td className="px-5 py-4 min-w-[150px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full ${barColor} rounded-full transition-all duration-500`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono font-bold text-[#0f172a] w-10 text-right">
                            {pct}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {(r.strong_flags ?? []).length === 0 ? (
                          <span className="text-xs text-slate-300 font-medium">None</span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {(r.strong_flags ?? []).slice(0, 2).map((f) => (
                              <span
                                key={f}
                                className="inline-flex items-center rounded-full bg-rose-50 border border-rose-200 text-rose-700 px-2 py-0.5 text-[9px] font-bold"
                              >
                                {f.replace(/_/g, ' ')}
                              </span>
                            ))}
                            {(r.strong_flags ?? []).length > 2 && (
                              <span className="text-[10px] text-slate-400 font-bold">
                                +{(r.strong_flags ?? []).length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {r.decision === 'MANUAL_REVIEW' && r.review_status === 'PENDING' ? (
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              type="button"
                              disabled={pendingId === r.id}
                              onClick={() => doReview(r.id, 'APPROVE')}
                              className="inline-flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-3 py-1.5 text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              type="button"
                              disabled={pendingId === r.id}
                              onClick={() => doReview(r.id, 'REJECT')}
                              className="inline-flex items-center gap-1 bg-rose-500 hover:bg-rose-600 text-white rounded-xl px-3 py-1.5 text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                            >
                              <X className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Locked</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'neutral' | 'ok' | 'warn' | 'bad';
}) {
  const toneMap = {
    neutral: { text: 'text-[#0f172a]', bg: 'bg-[#f8fafc]', border: 'border-[#e2e8f0]', icon: 'text-[#009E7E]' },
    ok:      { text: 'text-emerald-700', bg: 'bg-emerald-50/70', border: 'border-emerald-200', icon: 'text-emerald-600' },
    warn:    { text: 'text-amber-700',   bg: 'bg-amber-50/70',   border: 'border-amber-200',   icon: 'text-amber-600' },
    bad:     { text: 'text-rose-700',    bg: 'bg-rose-50/70',    border: 'border-rose-200',    icon: 'text-rose-600' },
  }[tone];

  return (
    <div className={`rounded-3xl border p-5 shadow-sm bg-white hover:shadow-md transition-all ${toneMap.border}`}>
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-[#64748b] font-bold">
          {label}
        </div>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${toneMap.bg}`}>
          <Icon className={`w-4 h-4 ${toneMap.icon}`} />
        </div>
      </div>
      <div className={`text-3xl font-black tabular-nums mt-2 tracking-tight ${toneMap.text}`}>
        {value}
      </div>
    </div>
  );
}
