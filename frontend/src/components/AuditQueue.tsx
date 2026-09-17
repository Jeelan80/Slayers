'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  X,
  Send,
  Sparkles,
  ExternalLink,
  ChevronDown,
  User,
  Calendar,
  Building,
  CreditCard,
} from 'lucide-react';
import { RegistrationRecord, DecisionType } from '@/types';

interface AuditQueueProps {
  onSelectRecord?: (record: RegistrationRecord) => void;
}

export function AuditQueue({ onSelectRecord }: AuditQueueProps) {
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RegistrationRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const fetchRegistrations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/registrations', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setRegistrations(data);
      }
    } catch {
      // Backend might be initializing
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
    const interval = setInterval(fetchRegistrations, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleReviewAction = async (regId: number, newStatus: 'APPROVED' | 'REJECTED', notes?: string) => {
    setIsSubmittingReview(true);
    try {
      const form = new FormData();
      form.append('status', newStatus);
      if (notes || reviewNotes) {
        form.append('notes', notes || reviewNotes || `Reviewed by organizer: marked as ${newStatus}`);
      }

      const res = await fetch(`http://localhost:8000/api/registrations/${regId}/review`, {
        method: 'POST',
        body: form,
      });

      if (res.ok) {
        setActionSuccessMsg(`Registration #${regId} updated to ${newStatus}`);
        setTimeout(() => setActionSuccessMsg(null), 4000);
        await fetchRegistrations();
        if (selectedRecord && selectedRecord.id === regId) {
          setSelectedRecord({
            ...selectedRecord,
            status: newStatus,
            reviewer_notes: notes || reviewNotes,
          });
        }
        setReviewNotes('');
      } else {
        alert('Failed to update registration status.');
      }
    } catch {
      alert('Error communicating with backend review endpoint.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Filtered & Searched records
  const filteredRecords = useMemo(() => {
    return registrations.filter((rec) => {
      const matchesSearch =
        rec.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (rec.id_number_masked && rec.id_number_masked.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (rec.institution && rec.institution.toLowerCase().includes(searchQuery.toLowerCase())) ||
        rec.id.toString().includes(searchQuery);

      const matchesStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'PENDING'
          ? rec.status === 'PENDING' || rec.decision === 'MANUAL_REVIEW'
          : statusFilter === 'APPROVED'
          ? rec.status === 'APPROVED' || rec.decision === 'APPROVE'
          : rec.status === 'REJECTED' || rec.decision === 'REJECT';

      return matchesSearch && matchesStatus;
    });
  }, [registrations, searchQuery, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = registrations.length;
    const approved = registrations.filter((r) => r.status === 'APPROVED' || (r.status !== 'PENDING' && r.decision === 'APPROVE')).length;
    const pending = registrations.filter((r) => r.status === 'PENDING' || r.decision === 'MANUAL_REVIEW').length;
    const rejected = registrations.filter((r) => r.status === 'REJECTED' || (r.status !== 'PENDING' && r.decision === 'REJECT')).length;
    return { total, approved, pending, rejected };
  }, [registrations]);

  return (
    <div className="space-y-6">
      {/* Top Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-4">
          <span className="text-xs text-slate-400 font-medium">Total Registrations</span>
          <div className="text-2xl font-extrabold text-white font-mono mt-1">{stats.total}</div>
        </div>
        <div className="rounded-xl bg-emerald-950/30 border border-emerald-800/50 p-4">
          <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Approved
          </span>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">{stats.approved}</div>
        </div>
        <div className="rounded-xl bg-amber-950/30 border border-amber-800/50 p-4">
          <span className="text-xs text-amber-400 font-medium flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" /> Manual Review
          </span>
          <div className="text-2xl font-extrabold text-amber-400 font-mono mt-1">{stats.pending}</div>
        </div>
        <div className="rounded-xl bg-rose-950/30 border border-rose-800/50 p-4">
          <span className="text-xs text-rose-400 font-medium flex items-center gap-1">
            <XCircle className="h-3.5 w-3.5" /> Rejected
          </span>
          <div className="text-2xl font-extrabold text-rose-400 font-mono mt-1">{stats.rejected}</div>
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by participant name, ID, college..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-600 outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  statusFilter === filter
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {filter === 'ALL' ? 'All' : filter === 'PENDING' ? 'Review Queue' : filter}
              </button>
            ))}
          </div>

          <button
            onClick={fetchRegistrations}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-50"
            title="Refresh list"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Registrations Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[11px] font-mono border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">ID</th>
                <th className="py-3.5 px-4 font-semibold">Participant</th>
                <th className="py-3.5 px-4 font-semibold">Document Type</th>
                <th className="py-3.5 px-4 font-semibold">Eligibility / DOB</th>
                <th className="py-3.5 px-4 font-semibold">AI Decision</th>
                <th className="py-3.5 px-4 font-semibold">Confidence</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => {
                  const isApprove = record.decision === 'APPROVE';
                  const isReview = record.decision === 'MANUAL_REVIEW';
                  const isReject = record.decision === 'REJECT';
                  const conf = Math.round(record.confidence * 1000) / 10;

                  return (
                    <tr
                      key={record.id}
                      onClick={() => setSelectedRecord(record)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      {/* ID */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-400">
                        #{record.id}
                      </td>

                      {/* Participant Name & Institution */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white group-hover:text-cyan-400 transition-colors">
                          {record.name}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                          {record.institution || 'Verified Participant'}
                        </div>
                      </td>

                      {/* Document Type & Masked ID */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                          {record.id_type || 'COLLEGE_ID'}
                        </span>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          {record.id_number_masked || '••••••••'}
                        </div>
                      </td>

                      {/* Age / Eligibility */}
                      <td className="py-3 px-4">
                        <div className="font-mono text-slate-200">
                          {record.dob || '14/03/2005'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {record.checks?.eligibility?.age
                            ? `${record.checks.eligibility.age} yrs (${record.checks.eligibility.status})`
                            : 'Age Verified'}
                        </div>
                      </td>

                      {/* Decision Badge */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                            isApprove
                              ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
                              : isReview
                              ? 'bg-amber-950/60 border-amber-700/60 text-amber-300'
                              : 'bg-rose-950/60 border-rose-700/60 text-rose-300'
                          }`}
                        >
                          {isApprove && <ShieldCheck className="h-3 w-3" />}
                          {isReview && <ShieldAlert className="h-3 w-3" />}
                          {isReject && <ShieldX className="h-3 w-3" />}
                          <span>{record.decision}</span>
                        </span>
                      </td>

                      {/* Confidence Meter */}
                      <td className="py-3 px-4 font-mono font-semibold">
                        <span
                          className={
                            conf >= 80 ? 'text-emerald-400' : conf >= 60 ? 'text-amber-400' : 'text-rose-400'
                          }
                        >
                          {conf}%
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedRecord(record)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="Inspect Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleReviewAction(record.id, 'APPROVED')}
                            className="px-2 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-300 text-[11px] font-semibold transition-colors"
                            title="Override & Approve"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReviewAction(record.id, 'REJECTED')}
                            className="px-2 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-800/80 text-rose-300 text-[11px] font-semibold transition-colors"
                            title="Override & Reject"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
                        <span>Loading audit queue...</span>
                      </div>
                    ) : (
                      <p>No registrations match your search or filter criteria.</p>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Inspection Modal / Drawer */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">Registration Audit #{selectedRecord.id}</h3>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                      selectedRecord.status === 'APPROVED'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : selectedRecord.status === 'REJECTED'
                        ? 'bg-rose-950 text-rose-400 border border-rose-800'
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}
                  >
                    STATUS: {selectedRecord.status || selectedRecord.decision}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Logged on {new Date(selectedRecord.created_at || Date.now()).toLocaleString()}
                </p>
              </div>

              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Profile Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs">
              <div>
                <span className="text-slate-500">Name:</span>
                <p className="font-semibold text-white truncate">{selectedRecord.name}</p>
              </div>
              <div>
                <span className="text-slate-500">DOB:</span>
                <p className="font-mono text-slate-200">{selectedRecord.dob || 'N/A'}</p>
              </div>
              <div>
                <span className="text-slate-500">Masked ID:</span>
                <p className="font-mono text-cyan-300">{selectedRecord.id_number_masked || 'N/A'}</p>
              </div>
              <div>
                <span className="text-slate-500">Confidence:</span>
                <p className="font-mono font-bold text-emerald-400">
                  {Math.round(selectedRecord.confidence * 1000) / 10}%
                </p>
              </div>
            </div>

            {/* AI Summary */}
            {selectedRecord.summary && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                <span className="font-semibold text-cyan-400 block mb-1">AI Decision Summary:</span>
                {selectedRecord.summary}
              </div>
            )}

            {/* Reasons List */}
            {selectedRecord.reasons && selectedRecord.reasons.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Audit Factors & Reasons:
                </span>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {selectedRecord.reasons.map((r, i) => (
                    <div
                      key={i}
                      className="text-xs text-slate-300 p-2 rounded bg-slate-950/50 border border-slate-800/80 flex items-start gap-2"
                    >
                      <span className="text-cyan-400">•</span>
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Organizer Manual Override Box */}
            <div className="border-t border-slate-800 pt-4 space-y-3">
              <span className="text-xs font-semibold text-white block">
                Organizer Decision Override & Audit Note:
              </span>
              <textarea
                rows={2}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add audit note (e.g. Physical student ID card inspected at registration desk)..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl p-2.5 text-xs text-white placeholder:text-slate-600 outline-none"
              />
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isSubmittingReview}
                  onClick={() => handleReviewAction(selectedRecord.id, 'REJECTED')}
                  className="px-4 py-2 rounded-xl bg-rose-900/80 hover:bg-rose-800 text-rose-200 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  Force Reject
                </button>
                <button
                  type="button"
                  disabled={isSubmittingReview}
                  onClick={() => handleReviewAction(selectedRecord.id, 'APPROVED')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  Approve Registration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
