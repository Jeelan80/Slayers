'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  Camera,
  FileCheck,
  User,
  Calendar,
  CreditCard,
  Building,
  CheckCircle2,
  AlertCircle,
  X,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { VerificationResponse, IdType } from '@/types';
import { VerificationResult } from './VerificationResult';
import { UserProfile } from './HackinglyAuthModal';

export interface FormValues {
  name: string;
  dob: string;
  idNumber: string;
  institution: string;
  idType: IdType;
  minAge: number;
  eventDate: string;
}

interface VerificationFormProps {
  user?: UserProfile | null;
  onNavigateToAudit?: () => void;
  onOpenAuth?: () => void;
}

export function VerificationForm({
  user,
  onNavigateToAudit,
  onOpenAuth,
}: VerificationFormProps) {
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');

  // Form State
  const [name, setName] = useState(user?.name || 'Rahul Kumar');
  const [dob, setDob] = useState('2005-03-14');
  const [idNumber, setIdNumber] = useState('ABC20261023');
  const [institution, setInstitution] = useState(user?.institution || 'PES University');
  const [idType, setIdType] = useState<IdType>('COLLEGE_ID');
  const [minAge, setMinAge] = useState(18);

  // File & Selfie state
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreviewUrl, setSelfiePreviewUrl] = useState<string | null>(null);
  const [isCapturingSelfie, setIsCapturingSelfie] = useState(false);

  // Processing & Result State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Update name/institution if user logs in
  useEffect(() => {
    if (user) {
      setName(user.name);
      if (user.institution && user.institution !== 'Participant') {
        setInstitution(user.institution);
      }
    }
  }, [user]);

  // Handle Document Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCardFile(file);
      setActivePreset(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
      setErrorMessage(null);
    }
  };

  // Webcam Selfie Capture
  const startCamera = async () => {
    setIsCapturingSelfie(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 480, facingMode: 'user' },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setIsCapturingSelfie(false);
      setErrorMessage('Could not access camera. You can still verify without a selfie.');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 480;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
            setSelfieFile(file);
            setSelfiePreviewUrl(URL.createObjectURL(file));
            stopCamera();
          }
        }, 'image/jpeg', 0.92);
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCapturingSelfie(false);
  };

  // Quick Preset Scenarios (For instant test evaluation by judges)
  const applyPreset = async (presetId: string) => {
    setActivePreset(presetId);
    setErrorMessage(null);
    setVerificationResult(null);

    // Fetch pre-generated demo assets from backend
    try {
      let filename = 'genuine_college_id.png';
      if (presetId === 'tampered') filename = 'tampered_dob_id.png';
      if (presetId === 'blurry') filename = 'blurry_id.png';
      if (presetId === 'duplicate') filename = 'duplicate_id.png';

      const res = await fetch(`${apiUrl}/static/samples/${filename}`);
      if (res.ok) {
        const blob = await res.blob();
        const file = new File([blob], filename, { type: 'image/png' });
        setCardFile(file);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(file));
      }
    } catch (e) {
      console.warn('Could not load static sample file, continuing with metadata:', e);
    }

    if (presetId === 'genuine') {
      setName('Rahul Kumar');
      setDob('2005-03-14');
      setIdNumber('ABC20261023');
      setInstitution('ABC Institute of Technology');
      setMinAge(18);
    } else if (presetId === 'tampered') {
      setName('Rahul Kumar');
      setDob('2007-04-14'); // Tampered to pass
      setIdNumber('ABC20261023');
      setInstitution('ABC Institute of Technology');
      setMinAge(18);
    } else if (presetId === 'blurry') {
      setName('Rahul Kumar');
      setDob('2005-03-14');
      setIdNumber('BLUR2026007');
      setInstitution('ABC Institute of Technology');
      setMinAge(18);
    } else if (presetId === 'duplicate') {
      setName('Impostor Sharma'); // Reusing Rahul's ID
      setDob('2005-03-14');
      setIdNumber('ABC20261023');
      setInstitution('ABC Institute of Technology');
      setMinAge(18);
    } else if (presetId === 'underage') {
      setName('Aarav Gupta');
      setDob('2011-08-20'); // Age 15
      setIdNumber('SCH20269941');
      setInstitution('Delhi Public School');
      setMinAge(18);
    }
  };

  // Submit Verification Request to POST /api/verify
  const handleSubmitVerification = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cardFile) {
      setErrorMessage('Please upload or select an ID document image (College ID, Aadhaar, or PAN).');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('dob', dob);
      formData.append('id_number', idNumber);
      formData.append('institution', institution);
      formData.append('id_type', idType);
      formData.append('min_age', minAge.toString());
      formData.append('file', cardFile);

      if (selfieFile) {
        formData.append('selfie', selfieFile);
      }
      if (activePreset) {
        formData.append('demo_scenario', activePreset);
      }

      const res = await fetch(`${apiUrl}/api/verify`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || 'Verification request failed.');
      }

      setVerificationResult(data);
    } catch (err: any) {
      console.error('Verification error:', err);
      setErrorMessage(err.message || 'Verification service unreachable. Ensure backend is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setVerificationResult(null);
    setCardFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelfieFile(null);
    if (selfiePreviewUrl) URL.revokeObjectURL(selfiePreviewUrl);
    setSelfiePreviewUrl(null);
    setActivePreset(null);
    setErrorMessage(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* If Result exists, display the clean VerificationResult Card */}
      {verificationResult ? (
        <VerificationResult
          result={verificationResult}
          onNavigateToAudit={onNavigateToAudit}
          onReset={handleResetForm}
        />
      ) : (
        <div className="bg-white rounded-3xl border border-[#ECECEC] p-6 sm:p-10 shadow-xs">
          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#DFF3E1] text-[#12805F]">
                CodeX 3.0 · Bengaluru Hackathon Registration
              </span>
              <span className="text-xs text-[#9AA1AC]">
                Requirement: Age 18+ · Valid Student / Citizen ID
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#14161A]">
              Participant Identity & Eligibility Verification
            </h1>
            <p className="text-sm text-[#5B6270] mt-1">
              Upload a clear photo of your student ID, Aadhaar card, or government ID. Our multi-gate AI pipeline automatically verifies age, enrolment, and authenticity in seconds.
            </p>
          </div>

          {/* Quick Preset Benchmark Chips for Judges */}
          <div className="mb-8 p-4 rounded-2xl bg-[#FAFAFA] border border-[#ECECEC]">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-[#14161A] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#12805F]" />
                1-Click Benchmark Scenarios (For Evaluators)
              </span>
              <span className="text-[11px] text-[#9AA1AC]">Instant Sample Test</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset('genuine')}
                className={`py-1.5 px-3.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activePreset === 'genuine'
                    ? 'bg-[#12805F] text-white shadow-xs'
                    : 'bg-white border border-[#ECECEC] text-[#14161A] hover:border-[#12805F]'
                }`}
              >
                1. Genuine College ID (Pass)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('tampered')}
                className={`py-1.5 px-3.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activePreset === 'tampered'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white border border-[#ECECEC] text-[#14161A] hover:border-rose-400'
                }`}
              >
                2. Tampered DOB (QR Mismatch)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('blurry')}
                className={`py-1.5 px-3.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activePreset === 'blurry'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white border border-[#ECECEC] text-[#14161A] hover:border-amber-400'
                }`}
              >
                3. Blurry ID (Quality Gate Review)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('duplicate')}
                className={`py-1.5 px-3.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activePreset === 'duplicate'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white border border-[#ECECEC] text-[#14161A] hover:border-rose-400'
                }`}
              >
                4. Duplicate Sybil ID (Reuse Block)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('underage')}
                className={`py-1.5 px-3.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  activePreset === 'underage'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white border border-[#ECECEC] text-[#14161A] hover:border-rose-400'
                }`}
              >
                5. Underage Participant (&lt;18 Reject)
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmitVerification} className="space-y-6">
            {/* Step 1: Document Upload Dropzone */}
            <div>
              <label className="block text-xs font-bold text-[#14161A] uppercase tracking-wider mb-2">
                Step 1: Upload ID Document Photo (College ID, Aadhaar, or PAN)
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              {!cardFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-[#D5D8DF] hover:border-[#12805F] rounded-2xl p-8 text-center cursor-pointer transition-colors bg-[#FAFAFA]"
                >
                  <div className="w-12 h-12 rounded-full bg-white border border-[#ECECEC] mx-auto flex items-center justify-center text-[#12805F] mb-3 shadow-xs">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-[#14161A]">
                    Click to upload document photo or drag & drop
                  </p>
                  <p className="text-xs text-[#9AA1AC] mt-1">
                    Supports PNG, JPG, or PDF (Student ID card, Aadhaar card, or PAN)
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 rounded-2xl border border-[#B7E4C7] bg-[#F4FAF6]">
                  <div className="flex items-center gap-3">
                    {previewUrl && (
                      <img
                        src={previewUrl}
                        alt="ID preview"
                        className="w-14 h-10 object-cover rounded-lg border border-[#ECECEC]"
                      />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-[#14161A]">
                        {cardFile.name}
                      </p>
                      <p className="text-xs text-[#12805F] font-medium flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Document ready for multi-gate verification
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCardFile(null);
                      setPreviewUrl(null);
                      setActivePreset(null);
                    }}
                    className="p-1.5 text-[#9AA1AC] hover:text-[#14161A] hover:bg-white rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Step 2: Form Details */}
            <div>
              <label className="block text-xs font-bold text-[#14161A] uppercase tracking-wider mb-2">
                Step 2: Participant Registration Details
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-medium text-[#5B6270] mb-1">
                    Full Name (As on ID)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g. Rahul Kumar"
                    className="w-full px-4 py-2.5 text-sm bg-white border border-[#ECECEC] rounded-xl text-[#14161A] focus:outline-none focus:border-[#12805F] transition-colors"
                  />
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-xs font-medium text-[#5B6270] mb-1">
                    Date of Birth (YYYY-MM-DD)
                  </label>
                  <input
                    type="text"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    required
                    placeholder="YYYY-MM-DD"
                    className="w-full px-4 py-2.5 text-sm bg-white border border-[#ECECEC] rounded-xl text-[#14161A] focus:outline-none focus:border-[#12805F] transition-colors"
                  />
                </div>

                {/* ID / Roll Number */}
                <div>
                  <label className="block text-xs font-medium text-[#5B6270] mb-1">
                    ID / Roll Number / USN
                  </label>
                  <input
                    type="text"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    required
                    placeholder="e.g. ABC20261023"
                    className="w-full px-4 py-2.5 text-sm font-mono bg-white border border-[#ECECEC] rounded-xl text-[#14161A] focus:outline-none focus:border-[#12805F] transition-colors"
                  />
                </div>

                {/* Institution / College */}
                <div>
                  <label className="block text-xs font-medium text-[#5B6270] mb-1">
                    College / University / Organization
                  </label>
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    required
                    placeholder="e.g. PES University"
                    className="w-full px-4 py-2.5 text-sm bg-white border border-[#ECECEC] rounded-xl text-[#14161A] focus:outline-none focus:border-[#12805F] transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Biometric Face Match (Optional 1-Click Webcam Selfie) */}
            <div className="p-4 rounded-2xl border border-[#ECECEC] bg-[#FAFAFA]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#12805F]" />
                  <span className="text-xs font-bold text-[#14161A] uppercase tracking-wider">
                    Step 3: Biometric Face Match (Optional)
                  </span>
                </div>
                <span className="text-[11px] text-[#9AA1AC]">AWS Rekognition / InsightFace</span>
              </div>

              {isCapturingSelfie ? (
                <div className="flex flex-col items-center space-y-3 pt-2">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-48 h-48 object-cover rounded-2xl border border-[#ECECEC] bg-black"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="py-1.5 px-4 rounded-full bg-[#12805F] hover:bg-[#0E6A4E] text-white text-xs font-semibold cursor-pointer"
                    >
                      Capture Selfie
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="py-1.5 px-4 rounded-full border border-[#D5D8DF] bg-white text-xs font-semibold text-[#5B6270] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : selfiePreviewUrl ? (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#B7E4C7]">
                  <div className="flex items-center gap-3">
                    <img
                      src={selfiePreviewUrl}
                      alt="Selfie"
                      className="w-10 h-10 object-cover rounded-full border border-[#ECECEC]"
                    />
                    <div>
                      <p className="text-xs font-semibold text-[#14161A]">Live selfie attached</p>
                      <p className="text-[11px] text-[#12805F]">Biometric face match enabled</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelfieFile(null);
                      setSelfiePreviewUrl(null);
                    }}
                    className="p-1 text-[#9AA1AC] hover:text-[#14161A]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                  <p className="text-xs text-[#5B6270]">
                    Take a quick live photo to cross-match against the portrait on your ID card.
                  </p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="py-2 px-4 rounded-full border border-[#D5D8DF] hover:border-[#12805F] bg-white text-xs font-semibold text-[#14161A] transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#12805F]" />
                    <span>Open Camera</span>
                  </button>
                </div>
              )}
            </div>

            {/* Primary Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !cardFile}
                className="w-full py-4 px-8 rounded-full bg-[#12805F] hover:bg-[#0E6A4E] text-white text-base font-semibold tracking-wide transition-all shadow-sm cursor-pointer active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Running Multi-Gate AI Verification...</span>
                  </>
                ) : (
                  <>
                    <span>Verify Identity & Eligibility</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
