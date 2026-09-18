'use client';

import { useRef, useState } from 'react';
import {
  Upload,
  Camera,
  X,
  Rocket,
  IdCard,
  User,
  Calendar,
  Hash,
  Building2,
  Mail,
  Loader2,
} from 'lucide-react';
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

interface FilePreview {
  file: File;
  url: string;
}

function usePreview(): [FilePreview | null, (f: File | null) => void] {
  const [state, setState] = useState<FilePreview | null>(null);
  const setter = (f: File | null) => {
    setState((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return f ? { file: f, url: URL.createObjectURL(f) } : null;
    });
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
    if (f && !f.type.startsWith('image/')) {
      setFormError('ID card must be an image (PNG/JPG).');
      return;
    }
    setFormError(null);
    setIdPreview(f);
  };

  const handleSelfieFile = (f: File | null) => {
    if (f && !f.type.startsWith('image/')) {
      setFormError('Selfie must be an image (PNG/JPG).');
      return;
    }
    setFormError(null);
    setSelfiePreview(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleIdFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!idPreview) {
      setFormError('Please upload an ID card image.');
      return;
    }
    if (!name.trim()) {
      setFormError('Full name is required.');
      return;
    }
    if (!dob) {
      setFormError('Date of birth is required.');
      return;
    }
    await onSubmit({
      id_image: idPreview.file,
      selfie: selfiePreview?.file ?? null,
      name: name.trim(),
      dob,
      id_number: idNumber.trim(),
      institution: institution.trim(),
      email: email.trim(),
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-7">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-[#1a1f2e] tracking-tight">
          Participant Verification
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Upload ID + selfie to run AI checks
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ID upload zone */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 block">
            ID Card Image <span className="text-rose-500 normal-case">*</span>
          </label>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            onClick={() => idInputRef.current?.click()}
            className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all p-6 text-center ${
              dragActive
                ? 'border-[#009E7E] bg-[#009E7E]/5'
                : idPreview
                ? 'border-[#009E7E]/40 bg-[#009E7E]/5'
                : 'border-gray-200 hover:border-[#009E7E]/60 hover:bg-[#009E7E]/[0.03]'
            }`}
          >
            <input
              ref={idInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleIdFile(e.target.files?.[0] ?? null)}
            />
            {idPreview ? (
              <div className="flex items-center gap-4 text-left">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={idPreview.url}
                  alt="ID preview"
                  className="w-24 h-16 object-cover rounded-lg border border-gray-200"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[#1a1f2e] truncate">
                    {idPreview.file.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {(idPreview.file.size / 1024).toFixed(1)} KB · Click to replace
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleIdFile(null);
                  }}
                  className="text-gray-400 hover:text-rose-500 p-2"
                  aria-label="Remove ID"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="w-14 h-14 rounded-full bg-[#009E7E]/10 flex items-center justify-center">
                  <IdCard className="w-7 h-7 text-[#009E7E]" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#1a1f2e]">
                    Drop your ID card here, or click to browse
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    PNG, JPG · Aadhaar, PAN, or college ID
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Selfie */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 block">
            Selfie (Optional) — for face match
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => selfieInputRef.current?.click()}
              className="inline-flex items-center gap-2 border border-gray-200 hover:border-[#009E7E] text-[#1a1f2e] rounded-full px-4 py-2 text-sm font-medium bg-white"
            >
              <Upload className="w-4 h-4 text-gray-500" /> Upload photo
            </button>
            <button
              type="button"
              onClick={() => setWebcamOpen(true)}
              className="inline-flex items-center gap-2 border border-[#009E7E] text-[#009E7E] hover:bg-[#009E7E]/5 rounded-full px-4 py-2 text-sm font-semibold"
            >
              <Camera className="w-4 h-4" /> Use webcam
            </button>
            <input
              ref={selfieInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleSelfieFile(e.target.files?.[0] ?? null)}
            />
            {selfiePreview && (
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full pl-2 pr-3 py-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selfiePreview.url}
                  alt="Selfie preview"
                  className="w-7 h-7 rounded-full object-cover"
                />
                <span className="text-xs text-gray-600 truncate max-w-[140px]">
                  {selfiePreview.file.name}
                </span>
                <button
                  type="button"
                  onClick={() => handleSelfieFile(null)}
                  className="text-gray-400 hover:text-rose-500"
                  aria-label="Remove selfie"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Form fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full Name" required icon={User}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ravi Kumar"
              className="w-full bg-[#f7f9fc] border border-[#e5e9f0] focus:border-[#009E7E] focus:ring-2 focus:ring-[#009E7E]/20 rounded-xl px-3 py-2.5 text-sm outline-none"
              required
            />
          </Field>
          <Field label="Date of Birth" required icon={Calendar}>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full bg-[#f7f9fc] border border-[#e5e9f0] focus:border-[#009E7E] focus:ring-2 focus:ring-[#009E7E]/20 rounded-xl px-3 py-2.5 text-sm outline-none"
              required
            />
          </Field>
          <Field label="ID Number" icon={Hash}>
            <input
              type="text"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              placeholder="e.g. CS21B1024"
              className="w-full bg-[#f7f9fc] border border-[#e5e9f0] focus:border-[#009E7E] focus:ring-2 focus:ring-[#009E7E]/20 rounded-xl px-3 py-2.5 text-sm outline-none"
            />
          </Field>
          <Field label="Institution" icon={Building2}>
            <input
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="e.g. IIT Bombay"
              className="w-full bg-[#f7f9fc] border border-[#e5e9f0] focus:border-[#009E7E] focus:ring-2 focus:ring-[#009E7E]/20 rounded-xl px-3 py-2.5 text-sm outline-none"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Email" icon={Mail}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. ravi.kumar@iitb.ac.in"
                className="w-full bg-[#f7f9fc] border border-[#e5e9f0] focus:border-[#009E7E] focus:ring-2 focus:ring-[#009E7E]/20 rounded-xl px-3 py-2.5 text-sm outline-none"
              />
            </Field>
          </div>
        </div>

        {formError && (
          <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
            {formError}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 bg-[#009E7E] hover:bg-[#007A60] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-full px-6 py-3 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Verifying…
            </>
          ) : (
            <>
              <Rocket className="w-5 h-5" />
              Run Verification
            </>
          )}
        </button>
      </form>

      <WebcamModal
        open={webcamOpen}
        onClose={() => setWebcamOpen(false)}
        onCapture={(f) => handleSelfieFile(f)}
      />
    </div>
  );
}

function Field({
  label,
  required,
  icon: Icon,
  children,
}: {
  label: string;
  required?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
        <Icon className="w-3.5 h-3.5" />
        {label}
        {required && <span className="text-rose-500 normal-case">*</span>}
      </span>
      {children}
    </label>
  );
}
