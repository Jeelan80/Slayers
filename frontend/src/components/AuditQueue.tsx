'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Clock,
  X,
  Send,
  User,
  Calendar,
  Building,
  CreditCard,
  QrCode,
  Fingerprint,
} from 'lucide-react';
import { RegistrationRecord } from '@/types';

interface AuditQueueProps {
  onSelectRecord?: (record: RegistrationRecord) => void;
}

export function AuditQueue({ onSelectRecord }: AuditQueueProps) {
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');
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
      const res = await fetch(`${apiUrl}/api/registrations`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setRegistrations(data);
      }
    } catch {
      // Backend may be offline or starting
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
    const interval = setInterval(fetchRegistrations, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleReviewAction = async (regId: number, newStatus: 'APPROVED' | 'REJECTED') => {
    setIsSubmittingReview(true);
    try {
      const form = new FormData();
      form.append('status', newStatus);
      if (reviewNotes) {
        form.append('notes', reviewNotes);
      }

      const res = await fetch(`${apiUrl}/api/registrations/${regId}/review`, {
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
            reviewer_notes: reviewNotes,
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

  const filteredRegistrations = useMemo(() => {
    return registrations.filter((r) => {
      const matchesFilter =
        statusFilter === 'ALL' ||
        (statusFilter === 'PENDING' && (r.status === 'PENDING' || r.decision === 'MANUAL_REVIEW')) ||
        r.status === statusFilter;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.name?.toLowerCase().includes(q) ||
        r.institution?.toLowerCase().includes(q) ||
        r.id_number_masked?.toLowerCase().includes(q) ||
        r.id?.toString().includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [registrations, statusFilter, searchQuery]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-3xl border border-[#ECECEC] p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#DFF3E1] text-[#12805F]">
                Organizer Portal
              </span>
              <span className="text-xs text-[#9AA1AC]">
                Real-time Audit & Eligibility Queue
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#14161A]">
              Participant Registration Queue
            </h1>
            <p className="text-xs text-[#5B6270] mt-0.5">
              Review automated AI eligibility decisions, inspect forensic signals, and resolve manual review cases.
            </p>
          </div>

          <button
            onClick={fetchRegistrations}
            disabled={isLoading}
            className="flex items-center gap-2 py-2 px-4 rounded-full border border-[#D5D8DF] hover:bg-slate-50 text-xs font-semibold text-[#14161A] transition-colors cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#5B6270] ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Queue</span>
          </button>
        </div>

        {actionSuccessMsg && (
          <div className="mb-4 p-3 rounded-xl bg-[#DFF3E1] text-[#12805F] text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* Filter Bar & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#9AA1AC] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by participant name, college, ID..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-[#FAFAFA] border border-[#ECECEC] rounded-full text-[#14161A] placeholder-[#9AA1AC] focus:outline-none focus:border-[#12805F] transition-colors"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`py-1.5 px-4 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                  statusFilter === filter
                    ? 'bg-[#12805F] text-white'
                    : 'bg-slate-100 text-[#5B6270] hover:bg-slate-200/70'
                }`}
              >
                {filter === 'ALL'
                  ? `All (${registrations.length})`
                  : filter === 'PENDING'
                  ? 'Needs Review'
                  : filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table / Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={`space-y-3 ${selectedRecord ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
          {filteredRegistrations.length === 0 ? (
            <div className="bg-white rounded-3xl border border-[#ECECEC] p-12 text-center">
              <Clock className="w-10 h-10 text-[#9AA1AC] mx-auto mb-3" />
              <p className="text-sm font-semibold text-[#14161A]">No registrations found in queue</p>
              <p className="text-xs text-[#9AA1AC] mt-1">
                Submit a new verification test or adjust your filter settings.
              </p>
            </div>
          ) : (
            filteredRegistrations.map((reg) => {
              const isSelected = selectedRecord?.id === reg.id;
              const isApprove = reg.decision === 'APPROVE';
              const isReview = reg.decision === 'MANUAL_REVIEW';

              return (
                <div
                  key={reg.id}
                  onClick={() => setSelectedRecord(reg)}
                  className={`bg-white rounded-2xl border p-4 sm:p-5 transition-all cursor-pointer shadow-2xs hover:border-[#12805F] ${
                    isSelected ? 'border-[#12805F] ring-1 ring-[#12805F]' : 'border-[#ECECEC]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {/* Avatar Circle */}
                      <div className="w-10 h-10 rounded-full border border-[#ECECEC] bg-[#FAFAFA] flex items-center justify-center text-xs font-bold text-[#14161A] flex-shrink-0">
                        {reg.name?.slice(0, 2).toUpperCase() || 'ID'}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-[#14161A]">
                            {reg.name}
                          </h3>
                          <span className="text-[11px] font-mono text-[#9AA1AC]">
                            #{reg.id}
                          </span>
                        </div>
                        <p className="text-xs text-[#5B6270] mt-0.5">
                          {reg.institution || 'PES University'} · DOB: {reg.dob || 'Verified'}
                        </p>
                        <p className="text-[11px] text-[#9AA1AC] font-mono mt-0.5">
                          ID: {reg.id_number_masked || 'XXXX-1023'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          isApprove
                            ? 'bg-[#DFF3E1] text-[#12805F]'
                            : isReview
                            ? 'bg-[#FBE6D3] text-[#B45309]'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {reg.decision}
                      </span>
                      <span className="text-[11px] font-mono text-[#9AA1AC]">
                        {Math.round((reg.confidence || 0.9) * 100)}% Conf
                      </span>
                    </div>
                  </div>

                  {reg.summary && (
                    <p className="text-xs text-[#5B6270] mt-3 pt-3 border-t border-[#ECECEC]">
                      {reg.summary}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Selected Record Detail Drawer / Inspector */}
        {selectedRecord && (
          <div className="lg:col-span-5 bg-white rounded-3xl border border-[#ECECEC] p-6 shadow-xs h-fit space-y-5 sticky top-6">
            <div className="flex items-center justify-between border-b border-[#ECECEC] pb-4">
              <div>
                <span className="text-[11px] font-mono text-[#9AA1AC] uppercase">
                  Registration Inspector #{selectedRecord.id}
                </span>
                <h2 className="text-lg font-bold text-[#14161A] mt-0.5">
                  {selectedRecord.name}
                </h2>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 text-[#9AA1AC] hover:text-[#14161A] hover:bg-slate-100 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Verdict Overview */}
            <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-[#ECECEC] flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#9AA1AC] font-semibold">
                  AI Decision
                </span>
                <p className="text-sm font-bold text-[#14161A] mt-0.5">
                  {selectedRecord.decision}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-[#9AA1AC] font-semibold">
                  Confidence
                </span>
                <p className="text-sm font-mono font-bold text-[#12805F] mt-0.5">
                  {Math.round((selectedRecord.confidence || 0.9) * 100)}%
                </p>
              </div>
            </div>

            {/* Signal Highlights */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-[#ECECEC]">
                <span className="text-[#5B6270]">Institution</span>
                <span className="font-semibold text-[#14161A]">{selectedRecord.institution}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#ECECEC]">
                <span className="text-[#5B6270]">Date of Birth</span>
                <span className="font-semibold text-[#14161A]">{selectedRecord.dob}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#ECECEC]">
                <span className="text-[#5B6270]">Document Type</span>
                <span className="font-semibold text-[#14161A]">{selectedRecord.id_type || 'COLLEGE_ID'}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#ECECEC]">
                <span className="text-[#5B6270]">Current Review Status</span>
                <span className="font-bold text-[#12805F]">{selectedRecord.status}</span>
              </div>
            </div>

            {/* Organizer Action Buttons */}
            <div className="pt-2 border-t border-[#ECECEC] space-y-3">
              <label className="block text-xs font-bold text-[#14161A] uppercase tracking-wider">
                Organizer Override Decision
              </label>

              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add audit notes (e.g. Cleared via verified student registry)..."
                rows={2}
                className="w-full p-2.5 text-xs bg-[#FAFAFA] border border-[#ECECEC] rounded-xl text-[#14161A] focus:outline-none focus:border-[#12805F]"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isSubmittingReview}
                  onClick={() => handleReviewAction(selectedRecord.id, 'APPROVED')}
                  className="flex-1 py-2.5 px-4 rounded-full bg-[#12805F] hover:bg-[#0E6A4E] text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Approve Registration
                </button>
                <button
                  type="button"
                  disabled={isSubmittingReview}
                  onClick={() => handleReviewAction(selectedRecord.id, 'REJECTED')}
                  className="py-2.5 px-4 rounded-full border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
