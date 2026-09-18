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
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Approve
        </span>
      );
    case 'MANUAL_REVIEW':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Review
        </span>
      );
    case 'REJECT':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Reject
        </span>
      );
  }
}

function reviewStatusPill(status: Registration['review_status']) {
  const map = {
    PENDING: 'bg-gray-100 text-gray-600',
    APPROVED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-rose-100 text-rose-700',
  } as const;
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5 ${map[status]}`}>
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
      setRegs(data);
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
      if (q && !r.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [regs, filter, query]);

  const doReview = async (id: number, action: 'APPROVE' | 'REJECT') => {
    setPendingId(id);
    try {
      await reviewRegistration(id, action);
      onNotify('success', `Registration #${id} ${action.toLowerCase()}d.`);
      await load();
    } catch (e) {
      onNotify('error', e instanceof Error ? e.message : 'Review failed');
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} icon={Users} tone="neutral" />
        <StatCard label="Approved" value={stats.approve} icon={CheckCircle2} tone="ok" />
        <StatCard label="Manual Review" value={stats.review} icon={AlertTriangle} tone="warn" />
        <StatCard label="Rejected" value={stats.reject} icon={XCircle} tone="bad" />
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide border transition-colors ${
                filter === f
                  ? 'bg-[#009E7E] text-white border-[#009E7E]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#009E7E] hover:text-[#009E7E]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name…"
            className="w-full bg-[#f7f9fc] border border-[#e5e9f0] focus:border-[#009E7E] focus:ring-2 focus:ring-[#009E7E]/20 rounded-full pl-9 pr-3 py-2 text-sm outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            load();
          }}
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#009E7E]"
          title="Refresh now"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {lastUpdated ? `Updated ${timeAgo(lastUpdated.toISOString())}` : 'Loading…'}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-[#1a1f2e]">
              {regs.length === 0 ? 'No registrations yet' : 'Nothing matches that filter'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {regs.length === 0
                ? 'Run a verification to see results here.'
                : 'Try a different filter or clear the search.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 bg-[#f7f9fc] border-b border-gray-100">
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Submitted</th>
                  <th className="px-4 py-3 font-semibold">Decision</th>
                  <th className="px-4 py-3 font-semibold">Confidence</th>
                  <th className="px-4 py-3 font-semibold">Flags</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const pct = Math.round(r.confidence * 100);
                  const barColor =
                    pct >= 75 ? 'bg-[#009E7E]' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500';
                  return (
                    <tr key={r.id} className="border-b border-gray-50 last:border-b-0 hover:bg-[#f7f9fc]/70">
                      <td className="px-4 py-3 text-gray-400 tabular-nums">#{r.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#1a1f2e]">{r.name || '—'}</div>
                        <div className="mt-0.5">{reviewStatusPill(r.review_status)}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 tabular-nums text-xs">
                        {timeAgo(r.created_at)}
                      </td>
                      <td className="px-4 py-3">{decisionBadge(r.decision)}</td>
                      <td className="px-4 py-3 min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className={`h-full ${barColor} rounded-full`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs tabular-nums text-gray-600 font-semibold w-9 text-right">
                            {pct}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {r.strong_flags.length === 0 ? (
                          <span className="text-xs text-gray-300">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {r.strong_flags.slice(0, 2).map((f) => (
                              <span
                                key={f}
                                className="inline-flex items-center rounded-full bg-rose-50 border border-rose-200 text-rose-700 px-2 py-0.5 text-[10px] font-semibold"
                              >
                                {f.replace(/_/g, ' ')}
                              </span>
                            ))}
                            {r.strong_flags.length > 2 && (
                              <span className="text-[10px] text-gray-400 font-semibold">
                                +{r.strong_flags.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.decision === 'MANUAL_REVIEW' && r.review_status === 'PENDING' ? (
                          <div className="flex items-center gap-1.5 justify-end">
                            <button
                              type="button"
                              disabled={pendingId === r.id}
                              onClick={() => doReview(r.id, 'APPROVE')}
                              className="inline-flex items-center gap-1 border border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-50"
                            >
                              <Check className="w-3 h-3" /> Approve
                            </button>
                            <button
                              type="button"
                              disabled={pendingId === r.id}
                              onClick={() => doReview(r.id, 'REJECT')}
                              className="inline-flex items-center gap-1 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-50"
                            >
                              <X className="w-3 h-3" /> Reject
                            </button>
                          </div>
                        ) : (
                          <div className="text-right text-xs text-gray-400">—</div>
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
    neutral: { text: 'text-[#1a1f2e]', bg: 'bg-[#f7f9fc]', ring: 'text-gray-500' },
    ok:      { text: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'text-emerald-500' },
    warn:    { text: 'text-amber-700',   bg: 'bg-amber-50',   ring: 'text-amber-500' },
    bad:     { text: 'text-rose-700',    bg: 'bg-rose-50',    ring: 'text-rose-500' },
  }[tone];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${toneMap.bg}`}>
          <Icon className={`w-5 h-5 ${toneMap.ring}`} />
        </div>
        <div>
          <div className={`text-2xl font-bold tabular-nums ${toneMap.text}`}>{value}</div>
          <div className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}
