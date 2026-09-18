'use client';

import React, { useState } from 'react';
import {
  Mail,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  KeyRound,
  AlertCircle,
  X,
  ShieldCheck,
  FileText,
  UploadCloud,
  GraduationCap,
  Building,
  Calendar,
  Check,
} from 'lucide-react';
import { AcademicDocumentResponse } from '@/types';

interface CollegeEmailFallbackModalProps {
  isOpen: boolean;
  currentConfidence: number;
  candidateUsn?: string;
  candidateUsns?: string[];
  candidateName?: string;
  groundTruth?: any;
  institution?: string;
  onClose: () => void;
  onVerified: (email: string) => void;
  onDocumentVerified?: (docData: AcademicDocumentResponse) => void;
}

export function CollegeEmailFallbackModal({
  isOpen,
  currentConfidence,
  candidateUsn,
  candidateUsns,
  candidateName,
  groundTruth,
  institution,
  onClose,
  onVerified,
  onDocumentVerified,
}: CollegeEmailFallbackModalProps) {
  const [activeTab, setActiveTab] = useState<'email' | 'document'>('email');

  // Email State
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'enter_email' | 'enter_otp'>('enter_email');
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [emailErrorMsg, setEmailErrorMsg] = useState<string | null>(null);
  const [demoBypassCode, setDemoBypassCode] = useState<string | null>(null);

  // Document State
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docTypeHint, setDocTypeHint] = useState<string>('AUTO');
  const [isDocLoading, setIsDocLoading] = useState(false);
  const [docErrorMsg, setDocErrorMsg] = useState<string | null>(null);
  const [docResult, setDocResult] = useState<AcademicDocumentResponse | null>(null);

  if (!isOpen) return null;

  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');
  const activeUsns = candidateUsns && candidateUsns.length > 0 ? candidateUsns : (candidateUsn ? [candidateUsn] : []);

  const isInstitutional = (val: string) => {
    const v = val.toLowerCase().trim();
    return ['.edu', '.ac.in', '.edu.in', '.res.in', '.ernet.in', '.org.in'].some(
      (tld) => v.endsWith(tld) || v.includes(`${tld}/`)
    );
  };

  // Email Handlers
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setEmailErrorMsg('Please enter a valid email address.');
      return;
    }

    setIsEmailLoading(true);
    setEmailErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('email', email.trim());
      if (activeUsns.length > 0) {
        formData.append('candidate_usns', JSON.stringify(activeUsns));
        formData.append('usn', activeUsns[0]);
      }
      if (candidateName) formData.append('name', candidateName);

      const res = await fetch(`${apiUrl}/api/verify/college-email/send-otp`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || 'Failed to dispatch verification code.');
      }

      setStep('enter_otp');
      const match = data.message?.match(/\b\d{6}\b/);
      if (match) setDemoBypassCode(match[0]);
    } catch (err: any) {
      setEmailErrorMsg(err.message || 'Unable to send verification email.');
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.trim().length < 6) {
      setEmailErrorMsg('Please enter the 6-digit verification code.');
      return;
    }

    setIsEmailLoading(true);
    setEmailErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('email', email.trim());
      formData.append('otp', otp.trim());

      const res = await fetch(`${apiUrl}/api/verify/college-email/verify-otp`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || 'Incorrect verification code.');
      }

      onVerified(email.trim());
    } catch (err: any) {
      setEmailErrorMsg(err.message || 'Invalid verification code.');
    } finally {
      setIsEmailLoading(false);
    }
  };

  // Document Handlers
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile) {
      setDocErrorMsg('Please select your college fee receipt or bonafide certificate.');
      return;
    }

    setIsDocLoading(true);
    setDocErrorMsg(null);
    setDocResult(null);

    try {
      const formData = new FormData();
      formData.append('file', docFile);
      formData.append('doc_type', docTypeHint);
      if (groundTruth) {
        formData.append('ground_truth_json', JSON.stringify(groundTruth));
      }
      if (activeUsns.length > 0) {
        formData.append('candidate_usns_json', JSON.stringify(activeUsns));
      }
      if (institution) {
        formData.append('institution', institution);
      }

      const res = await fetch(`${apiUrl}/api/verify/academic-document`, {
        method: 'POST',
        body: formData,
      });

      const data: AcademicDocumentResponse = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to extract academic document fields.');
      }

      setDocResult(data);

      if (data.verified && onDocumentVerified) {
        onDocumentVerified(data);
      }
    } catch (err: any) {
      setDocErrorMsg(err.message || 'Error processing institutional document.');
    } finally {
      setIsDocLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 border border-[#ECECEC] shadow-2xl text-[#14161A]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-[#9AA1AC] hover:text-[#14161A] hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Badge */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#FBE6D3] text-[#B45309]">
              Confidence {Math.round(currentConfidence * 100)}% &lt; 70% Threshold
            </span>
          </div>
          <h3 className="text-xl font-bold tracking-tight text-[#14161A]">
            Student Proof Fallback Verification
          </h3>
          <p className="text-xs text-[#5B6270] mt-1">
            Choose either your official university email or an institutional document (Fee Receipt / Bonafide) to conclude verification.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-[#FAFAFA] border border-[#ECECEC] mb-5">
          <button
            type="button"
            onClick={() => setActiveTab('email')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'email'
                ? 'bg-white text-[#12805F] shadow-xs border border-[#ECECEC]'
                : 'text-[#5B6270] hover:text-[#14161A]'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>College Email (OTP)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('document')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'document'
                ? 'bg-white text-[#12805F] shadow-xs border border-[#ECECEC]'
                : 'text-[#5B6270] hover:text-[#14161A]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Fee Receipt / Bonafide</span>
          </button>
        </div>

        {/* ----------------- TAB 1: COLLEGE EMAIL ----------------- */}
        {activeTab === 'email' && (
          <>
            {emailErrorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{emailErrorMsg}</span>
              </div>
            )}

            {step === 'enter_email' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#5B6270] mb-1.5 flex items-center justify-between">
                    <span>Official University Email</span>
                    {email && isInstitutional(email) && (
                      <span className="text-[10px] text-[#12805F] font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        INSTITUTIONAL DOMAIN
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9AA1AC]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. pes2ug23cs915@pes.edu"
                      required
                      className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-[#ECECEC] rounded-xl text-[#14161A] focus:outline-none focus:border-[#12805F] transition-colors"
                    />
                  </div>

                  {activeUsns.length > 0 && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-[#FAFAFA] border border-[#ECECEC] text-[11px] text-[#5B6270]">
                      <p className="font-semibold text-[#14161A]">
                        Registered ID Number: <span className="text-[#12805F] font-mono">{activeUsns.join(', ')}</span>
                      </p>
                      <p className="text-[10px] text-[#9AA1AC] mt-0.5">
                        Email prefix must match student ID or name to prevent abuse.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="py-2.5 px-4 rounded-full border border-[#D5D8DF] text-xs font-semibold text-[#5B6270] hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isEmailLoading || !email}
                    className="py-2.5 px-6 rounded-full bg-[#12805F] hover:bg-[#0E6A4E] text-white text-xs font-semibold tracking-wide transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isEmailLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Code</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#5B6270] mb-1.5 flex items-center justify-between">
                    <span>Enter 6-Digit Verification Code</span>
                    <span className="text-[11px] text-[#12805F] font-mono">Sent to {email}</span>
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9AA1AC]" />
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      required
                      className="w-full pl-10 pr-4 py-2.5 text-sm font-mono tracking-widest text-center bg-white border border-[#ECECEC] rounded-xl text-[#14161A] focus:outline-none focus:border-[#12805F] transition-colors"
                    />
                  </div>

                  {demoBypassCode && (
                    <p className="text-[11px] text-[#12805F] mt-1.5 font-mono">
                      Demo code: <strong>{demoBypassCode}</strong> (or 123456)
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('enter_email')}
                    className="text-xs text-[#5B6270] hover:text-[#14161A] cursor-pointer"
                  >
                    ← Change email
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="py-2.5 px-4 rounded-full border border-[#D5D8DF] text-xs font-semibold text-[#5B6270] hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isEmailLoading || otp.length < 6}
                      className="py-2.5 px-6 rounded-full bg-[#12805F] hover:bg-[#0E6A4E] text-white text-xs font-semibold tracking-wide transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isEmailLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Verify & Approve</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </>
        )}

        {/* ----------------- TAB 2: COLLEGE DOCUMENT ----------------- */}
        {activeTab === 'document' && (
          <form onSubmit={handleUploadDocument} className="space-y-4">
            {docErrorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{docErrorMsg}</span>
              </div>
            )}

            {/* Document Type Hint Radio Group */}
            <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#ECECEC]">
              <label className="block text-xs font-bold text-[#14161A] mb-2">
                Document Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'AUTO', label: 'Auto Detect' },
                  { id: 'FEE_RECEIPT', label: 'Fee Receipt' },
                  { id: 'BONAFIDE', label: 'Bonafide' },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className={`py-1.5 px-2 rounded-lg text-center text-xs font-semibold border cursor-pointer transition-all ${
                      docTypeHint === opt.id
                        ? 'bg-[#12805F] text-white border-[#12805F]'
                        : 'bg-white text-[#5B6270] border-[#ECECEC] hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="docTypeHint"
                      value={opt.id}
                      checked={docTypeHint === opt.id}
                      onChange={() => setDocTypeHint(opt.id)}
                      className="sr-only"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Document File Input */}
            <div>
              <label className="block text-xs font-medium text-[#5B6270] mb-1.5">
                Upload Document (PDF or Photo)
              </label>
              <input
                type="file"
                accept=".pdf,image/*"
                required
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setDocFile(e.target.files[0]);
                    setDocResult(null);
                  }
                }}
                className="w-full text-xs text-[#5B6270] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#12805F] file:text-white hover:file:bg-[#0E6A4E] file:cursor-pointer"
              />
              <p className="text-[11px] text-[#9AA1AC] mt-1">
                Upload a current academic semester Fee Payment Receipt, Bonafide Letter, or Study Certificate.
              </p>
            </div>

            {/* Extracted Comparison Result Preview */}
            {docResult && (
              <div className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
                docResult.verified ? 'bg-[#F4FAF6] border-[#B7E4C7]' : 'bg-rose-50 border-rose-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#14161A] flex items-center gap-1.5">
                    {docResult.verified ? (
                      <CheckCircle2 className="w-4 h-4 text-[#12805F]" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                    )}
                    {docResult.doc_label} Recognized
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    docResult.verified ? 'bg-[#DFF3E1] text-[#12805F]' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {docResult.verified ? 'VERIFIED MATCH' : 'MISMATCH'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-[#5B6270]">Student Name: </span>
                    <strong className="text-[#14161A]">{docResult.extracted_fields.name}</strong>
                  </div>
                  <div>
                    <span className="text-[#5B6270]">Roll / USN: </span>
                    <strong className="text-[#14161A] font-mono">{docResult.extracted_fields.roll_number}</strong>
                  </div>
                  <div>
                    <span className="text-[#5B6270]">Institution: </span>
                    <strong className="text-[#14161A]">{docResult.extracted_fields.institution}</strong>
                  </div>
                  <div>
                    <span className="text-[#5B6270]">Academic Year: </span>
                    <strong className="text-[#14161A]">{docResult.extracted_fields.academic_year}</strong>
                  </div>
                </div>

                <div className="pt-1 flex flex-wrap gap-1.5 text-[10px]">
                  {docResult.comparison.name_match && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                      ✓ Name Match ({docResult.comparison.name_similarity_score}%)
                    </span>
                  )}
                  {docResult.comparison.usn_match && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                      ✓ Roll Number Match
                    </span>
                  )}
                  {docResult.comparison.institution_match && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                      ✓ College Match
                    </span>
                  )}
                  {docResult.comparison.is_recent_session && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                      ✓ Active Session
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-full border border-[#D5D8DF] text-xs font-semibold text-[#5B6270] hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isDocLoading || !docFile}
                className="py-2.5 px-6 rounded-full bg-[#12805F] hover:bg-[#0E6A4E] text-white text-xs font-semibold tracking-wide transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDocLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing Document...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Extract & Verify Document</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
