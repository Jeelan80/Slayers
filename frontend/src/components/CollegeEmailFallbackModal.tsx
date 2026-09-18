'use client';

import React, { useState } from 'react';
import { Mail, CheckCircle2, ArrowRight, RefreshCw, KeyRound, AlertCircle, X, ShieldCheck } from 'lucide-react';

interface CollegeEmailFallbackModalProps {
  isOpen: boolean;
  currentConfidence: number;
  candidateUsn?: string;
  candidateUsns?: string[];
  candidateName?: string;
  onClose: () => void;
  onVerified: (email: string) => void;
}

export function CollegeEmailFallbackModal({
  isOpen,
  currentConfidence,
  candidateUsn,
  candidateUsns,
  candidateName,
  onClose,
  onVerified,
}: CollegeEmailFallbackModalProps) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'enter_email' | 'enter_otp'>('enter_email');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [demoBypassCode, setDemoBypassCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');
  const activeUsns = candidateUsns && candidateUsns.length > 0 ? candidateUsns : (candidateUsn ? [candidateUsn] : []);

  const isInstitutional = (val: string) => {
    const v = val.toLowerCase().trim();
    return ['.edu', '.ac.in', '.edu.in', '.res.in', '.ernet.in', '.org.in'].some((tld) => v.endsWith(tld) || v.includes(`${tld}/`));
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

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
        throw new Error(data.detail || 'Failed to dispatch verification code.');
      }

      setStep('enter_otp');
      const match = data.message?.match(/\b\d{6}\b/);
      if (match) setDemoBypassCode(match[0]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to send verification email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.trim().length < 6) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

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
        throw new Error(data.detail || 'Incorrect verification code.');
      }

      onVerified(email.trim());
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-[#ECECEC] shadow-2xl text-[#14161A]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-[#9AA1AC] hover:text-[#14161A] hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#FBE6D3] text-[#B45309]">
              Confidence {Math.round(currentConfidence * 100)}% &lt; 70% Threshold
            </span>
          </div>
          <h3 className="text-xl font-bold tracking-tight text-[#14161A]">
            College Email Fallback Challenge
          </h3>
          <p className="text-xs text-[#5B6270] mt-1">
            To conclude your student eligibility, please verify via your official university email (.edu or .ac.in).
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
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
                    Email prefix must match student ID or name to prevent impostor abuse.
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
                disabled={isLoading || !email}
                className="py-2.5 px-6 rounded-full bg-[#12805F] hover:bg-[#0E6A4E] text-white text-xs font-semibold tracking-wide transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isLoading ? (
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
                  disabled={isLoading || otp.length < 6}
                  className="py-2.5 px-6 rounded-full bg-[#12805F] hover:bg-[#0E6A4E] text-white text-xs font-semibold tracking-wide transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isLoading ? (
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
      </div>
    </div>
  );
}
