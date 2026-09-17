'use client';

import React, { useState } from 'react';
import { Mail, ShieldAlert, CheckCircle2, ArrowRight, RefreshCw, KeyRound, Building, AlertCircle } from 'lucide-react';

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
      // For demo convenience, display the code
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
        throw new Error(data.detail || 'Invalid verification code.');
      }

      onVerified(email.trim());
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Please retry.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header Alert */}
        <div className="bg-gradient-to-r from-amber-950/60 to-slate-900 border-b border-amber-500/20 p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">College Email Challenge</h3>
              <p className="text-xs text-amber-300/80">
                Confidence score: {(currentConfidence * 100).toFixed(0)}% (below 70% threshold)
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            Because automated confidence is below 70%, please verify active enrollment using your
            <strong> official college or university email address</strong> (.edu / .ac.in).
          </p>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 'enter_email' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Official College Email</span>
                  {email && isInstitutional(email) && (
                    <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      INSTITUTIONAL DOMAIN
                    </span>
                  )}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@university.edu.in"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                {activeUsns.length > 0 ? (
                  <div className="mt-2 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-1">
                    <div className="text-[11px] text-slate-400 flex items-center justify-between">
                      <span className="font-semibold text-slate-300">ID Card Register Number(s):</span>
                      <span className="font-mono text-cyan-400 font-bold">{activeUsns.join(', ')}</span>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Prefix must correlate with registered ID (e.g. <span className="font-mono text-slate-400">{activeUsns[0].toLowerCase()}@college.edu</span>) or student name. Arbitrary personal or alumni emails are rejected.
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Accepts official .ac.in, .edu, .edu.in institutional email addresses matching your student identity.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !email}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/20 disabled:opacity-50"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <span>Send Code</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4 animate-in fade-in">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Enter 6-Digit Code</span>
                  <span className="text-[10px] text-cyan-400 font-mono">Sent to {email}</span>
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm font-mono tracking-widest text-center text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                {demoBypassCode && (
                  <p className="text-[11px] text-emerald-400/90 mt-1.5 font-mono">
                    Demo bypass code: <strong>{demoBypassCode}</strong> (or 123456)
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep('enter_email')}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  ← Change email
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || otp.length < 6}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
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
    </div>
  );
}
