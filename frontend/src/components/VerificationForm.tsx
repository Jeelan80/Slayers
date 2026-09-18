'use client';

import { useRef, useState } from 'react';
import { Upload, Camera, X, Rocket, IdCard, User, Calendar, Hash, Building2, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import WebcamModal from './WebcamModal';

export interface VerificationFormValues {
  id_image: File;
  selfie: File | null;
  name: string;
  dob: string;
  id_number: string;
  institution: string;
  email: string;
}

interface Props {
  onSubmit: (v: VerificationFormValues) => Promise<void>;
  loading: boolean;
}

interface FilePreview { file: File; url: string; }

function usePreview(): [FilePreview | null, (f: File | null) => void] {
  const [state, setState] = useState<FilePreview | null>(null);
  const setter = (f: File | null) => {
    setState((prev) => { if (prev) URL.revokeObjectURL(prev.url); return f ? { file: f, url: URL.createObjectURL(f) } : null; });
  };
  return [state, setter];
}

export default function VerificationForm({ onSubmit, loading }: Props) {
  const [idPreview, setIdPreview] = usePreview();
  const [selfiePreview, setSelfiePreview] = usePreview();
  const [dragActive, setDragActive] = useState(false);
  const [webcamOpen, setWebcamOpen] = useState(false);
  const idInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [institution, setInstitution] = useState('');
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleIdFile = (f: File | null) => {
    if (f && !f.type.startsWith('image/')) { setFormError('ID card must be an image (PNG/JPG).'); return; }
    setFormError(null); setIdPreview(f);
  };
  const handleSelfieFile = (f: File | null) => {
    if (f && !f.type.startsWith('image/')) { setFormError('Selfie must be an image.'); return; }
    setFormError(null); setSelfiePreview(f);
  };
  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDragActive(false); const f = e.dataTransfer.files?.[0]; if (f) handleIdFile(f); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError(null);
    if (!idPreview) { setFormError('Please upload an ID card image.'); return; }
    if (!name.trim()) { setFormError('Full name is required.'); return; }
    if (!dob) { setFormError('Date of birth is required.'); return; }
    await onSubmit({ id_image: idPreview.file, selfie: selfiePreview?.file ?? null, name: name.trim(), dob, id_number: idNumber.trim(), institution: institution.trim(), email: email.trim() });
  };

  return (
    <div className="bg-white rounded-3xl border border-[#e2e8f0] shadow-sm overflow-hidden">
      {/* Card header strip */}
      <div className="px-6 py-4 border-b border-[#f1f5f9]"
        style={{ background: 'linear-gradient(135deg, rgba(0,158,126,0.05) 0%, rgba(255,107,43,0.03) 100%)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm"
            style={{ background: 'linear-gradient(135deg,#009E7E,#007A60)' }}>
            <IdCard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#0f172a] tracking-tight">Participant Verification</h2>
            <p className="text-xs text-[#64748b] mt-0.5">Upload government / college ID + optional selfie</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* ID upload zone */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[#64748b] mb-2 block">
            ID Card Image <span className="text-rose-500 normal-case font-normal">* required</span>
          </label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            onClick={() => idInputRef.current?.click()}
            className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200 ${
              dragActive
                ? 'border-[#009E7E] bg-[#009E7E]/8 scale-[1.01]'
                : idPreview
                ? 'border-[#009E7E]/50 bg-[#009E7E]/5'
                : 'border-[#e2e8f0] hover:border-[#009E7E]/60 hover:bg-[#009E7E]/[0.03]'
            }`}
          >
            <input ref={idInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleIdFile(e.target.files?.[0] ?? null)} />
            {idPreview ? (
              <div className="flex items-center gap-4 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={idPreview.url} alt="ID preview" className="w-28 h-18 object-cover rounded-xl border border-[#e2e8f0] shadow-sm" style={{ height: '72px' }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-[#009E7E] shrink-0" />
                    <span className="text-sm font-bold text-[#0f172a] truncate">{idPreview.file.name}</span>
                  </div>
                  <div className="text-xs text-[#64748b]">{(idPreview.file.size / 1024).toFixed(1)} KB · Click to replace</div>
                </div>
                <button type="button" onClick={(e) => { e.stopPropagation(); handleIdFile(null); }}
                  className="p-2 rounded-xl text-[#94a3b8] hover:text-rose-500 hover:bg-rose-50 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, rgba(0,158,126,0.12) 0%, rgba(0,158,126,0.06) 100%)' }}>
                  <Upload className="w-7 h-7 text-[#009E7E]" />
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-[#0f172a]">Drop your ID card here</div>
                  <div className="text-xs text-[#94a3b8] mt-1">or <span className="text-[#009E7E] font-semibold underline underline-offset-2">click to browse</span></div>
                  <div className="text-[11px] text-[#94a3b8] mt-1.5">PNG, JPG · Aadhaar, PAN, or College ID</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Selfie */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[#64748b] mb-2 block">
            Selfie <span className="text-[#94a3b8] normal-case font-normal">(optional — for face match)</span>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => selfieInputRef.current?.click()}
              className="inline-flex items-center gap-2 bg-[#f8fafc] border border-[#e2e8f0] hover:border-[#009E7E]/50 hover:bg-[#009E7E]/5 text-[#334155] rounded-full px-4 py-2 text-sm font-semibold transition-all">
              <Upload className="w-3.5 h-3.5 text-[#64748b]" /> Upload photo
            </button>
            <button type="button" onClick={() => setWebcamOpen(true)}
              className="inline-flex items-center gap-2 border-2 border-[#009E7E] text-[#009E7E] hover:bg-[#009E7E] hover:text-white rounded-full px-4 py-2 text-sm font-bold transition-all">
              <Camera className="w-3.5 h-3.5" /> Use webcam
            </button>
            <input ref={selfieInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleSelfieFile(e.target.files?.[0] ?? null)} />
            {selfiePreview && (
              <div className="flex items-center gap-2 bg-[#009E7E]/10 border border-[#009E7E]/30 rounded-full pl-1 pr-3 py-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selfiePreview.url} alt="Selfie" className="w-7 h-7 rounded-full object-cover border-2 border-[#009E7E]/30" />
                <span className="text-xs text-[#009E7E] font-semibold truncate max-w-[120px]">{selfiePreview.file.name}</span>
                <button type="button" onClick={() => handleSelfieFile(null)} className="text-[#009E7E]/60 hover:text-rose-500"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}
          </div>
        </div>

        {/* Form fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Full Name" required icon={User}>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ravi Kumar"
              className="w-full bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#009E7E] focus:ring-3 focus:ring-[#009E7E]/15 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all" required />
          </Field>
          <Field label="Date of Birth" required icon={Calendar}>
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)}
              className="w-full bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#009E7E] focus:ring-3 focus:ring-[#009E7E]/15 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all" required />
          </Field>
          <Field label="ID Number" icon={Hash}>
            <input type="text" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="e.g. CS21B1024"
              className="w-full bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#009E7E] focus:ring-3 focus:ring-[#009E7E]/15 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all" />
          </Field>
          <Field label="Institution" icon={Building2}>
            <input type="text" value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="e.g. IIT Bombay"
              className="w-full bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#009E7E] focus:ring-3 focus:ring-[#009E7E]/15 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Email" icon={Mail}>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. ravi.kumar@iitb.ac.in"
                className="w-full bg-[#f8fafc] border border-[#e2e8f0] focus:border-[#009E7E] focus:ring-3 focus:ring-[#009E7E]/15 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all" />
            </Field>
          </div>
        </div>

        {formError && (
          <div className="flex items-start gap-2.5 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3">
            <X className="w-4 h-4 shrink-0 mt-0.5" />
            {formError}
          </div>
        )}

        <button type="submit" disabled={loading}
          className="btn-primary w-full inline-flex items-center justify-center gap-2.5 text-white font-bold rounded-2xl px-6 py-3.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none">
          {loading ? (
            <><Loader2 className="w-5 h-5 animate-spin" />Verifying…</>
          ) : (
            <><Rocket className="w-5 h-5" />Run AI Verification</>
          )}
        </button>
      </form>

      <WebcamModal open={webcamOpen} onClose={() => setWebcamOpen(false)} onCapture={(f) => handleSelfieFile(f)} />
    </div>
  );
}

function Field({ label, required, icon: Icon, children }: { label: string; required?: boolean; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#64748b] mb-1.5">
        <Icon className="w-3.5 h-3.5" />
        {label}
        {required && <span className="text-rose-500 normal-case font-normal">*</span>}
      </span>
      {children}
    </label>
  );
}
