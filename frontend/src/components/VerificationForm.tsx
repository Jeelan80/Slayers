'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  Camera,
  Image as ImageIcon,
  X,
  FileCheck,
  User,
  Calendar,
  CreditCard,
  Building,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  GraduationCap,
  Eye,
  Mail,
  SlidersHorizontal,
  ChevronRight,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import {
  AadhaarGroundTruth,
  AadhaarExtractionResponse,
  StudentCardExtractionResponse,
  BiometricTriangulationResponse,
  FullPipelineResponse,
  IdType,
  VerificationResponse,
} from '@/types';
import { WebcamModal } from './WebcamModal';
import { CollegeEmailFallbackModal } from './CollegeEmailFallbackModal';

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
  initialValues?: FormValues;
  initialFile?: File | null;
  onVerificationComplete?: (record: any) => void;
  onNavigateToAudit?: () => void;
}

export function VerificationForm({
  initialValues,
  initialFile,
  onVerificationComplete,
  onNavigateToAudit,
}: VerificationFormProps) {
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');

  // Stepper State: 1: Aadhaar, 2: Student ID, 3: Live Selfie, 4: Decision
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Aadhaar Ground Truth
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [aadhaarPassword, setAadhaarPassword] = useState('');
  const [isExtractingAadhaar, setIsExtractingAadhaar] = useState(false);
  const [aadhaarResult, setAadhaarResult] = useState<AadhaarExtractionResponse | null>(null);
  const [aadhaarPreviewUrl, setAadhaarPreviewUrl] = useState<string | null>(null);

  // Step 2: Student Persona Inquiry & ID Card
  const [isStudent, setIsStudent] = useState<boolean>(true);
  const [studentCardFile, setStudentCardFile] = useState<File | null>(null);
  const [cardPreviewUrl, setCardPreviewUrl] = useState<string | null>(null);
  const [isExtractingCard, setIsExtractingCard] = useState(false);
  const [cardResult, setCardResult] = useState<StudentCardExtractionResponse | null>(null);

  // Step 3: MediaPipe Dynamic Blink & Live Selfie
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreviewUrl, setSelfiePreviewUrl] = useState<string | null>(null);
  const [blinkVerified, setBlinkVerified] = useState<boolean>(false);
  const [isWebcamOpen, setIsWebcamOpen] = useState(false);

  // Step 4: Verification & Email Fallback
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [pipelineResult, setPipelineResult] = useState<FullPipelineResponse | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const aadhaarInputRef = useRef<HTMLInputElement>(null);
  const cardInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  // Sync initialFile if loaded from demo scenarios
  useEffect(() => {
    if (initialFile) {
      setStudentCardFile(initialFile);
      const url = URL.createObjectURL(initialFile);
      setCardPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [initialFile]);

  // Handle Aadhaar File Change
  const handleAadhaarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAadhaarFile(file);
      if (aadhaarPreviewUrl) URL.revokeObjectURL(aadhaarPreviewUrl);
      if (file.type.startsWith('image/')) {
        setAadhaarPreviewUrl(URL.createObjectURL(file));
      } else {
        setAadhaarPreviewUrl(null);
      }
      setAadhaarResult(null);
      setGeneralError(null);
    }
  };

  // Process Aadhaar Card to Extract Ground Truth
  const handleProcessAadhaar = async () => {
    if (!aadhaarFile) {
      setGeneralError('Please select or upload an Aadhaar PDF or card photo.');
      return;
    }

    setIsExtractingAadhaar(true);
    setGeneralError(null);

    try {
      const formData = new FormData();
      formData.append('file', aadhaarFile);
      if (aadhaarPassword) {
        formData.append('password', aadhaarPassword);
      }

      const res = await fetch(`${apiUrl}/api/verify/aadhaar`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || 'Failed to extract Aadhaar Ground Truth.');
      }

      setAadhaarResult(data);
      setCurrentStep(2);
    } catch (err: any) {
      setGeneralError(err.message || 'Error processing Aadhaar file.');
    } finally {
      setIsExtractingAadhaar(false);
    }
  };

  // Handle Student Card Change
  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setStudentCardFile(file);
      if (cardPreviewUrl) URL.revokeObjectURL(cardPreviewUrl);
      setCardPreviewUrl(URL.createObjectURL(file));
      setCardResult(null);
      setGeneralError(null);
    }
  };

  // Process Student Card
  const handleProcessCard = async () => {
    if (!studentCardFile) {
      setGeneralError('Please upload your Student ID Card.');
      return;
    }

    setIsExtractingCard(true);
    setGeneralError(null);

    try {
      const formData = new FormData();
      formData.append('file', studentCardFile);
      if (aadhaarResult?.ground_truth) {
        formData.append('ground_truth_json', JSON.stringify(aadhaarResult.ground_truth));
      }

      const res = await fetch(`${apiUrl}/api/verify/student-card`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to process Student ID Card.');
      }

      setCardResult(data);
      setCurrentStep(3);
    } catch (err: any) {
      setGeneralError(err.message || 'Error extracting Student Card details.');
    } finally {
      setIsExtractingCard(false);
    }
  };

  // Handle Webcam Capture
  const handleWebcamCapture = (file: File, isBlinkVerified: boolean) => {
    setSelfieFile(file);
    if (selfiePreviewUrl) URL.revokeObjectURL(selfiePreviewUrl);
    setSelfiePreviewUrl(URL.createObjectURL(file));
    setBlinkVerified(isBlinkVerified);
  };

  // Run Full Pipeline Evaluation
  const handleRunFullEvaluation = async (overrideEmailVerified: boolean = false) => {
    if (!aadhaarFile) {
      setGeneralError('Aadhaar document is missing.');
      return;
    }
    if (isStudent && !studentCardFile) {
      setGeneralError('Student ID card is missing.');
      return;
    }
    if (!selfieFile) {
      setGeneralError('Live selfie verification is required.');
      return;
    }

    setIsEvaluating(true);
    setGeneralError(null);

    try {
      const formData = new FormData();
      formData.append('aadhaar_file', aadhaarFile);
      if (aadhaarPassword) formData.append('aadhaar_password', aadhaarPassword);
      formData.append('is_student', String(isStudent));
      if (studentCardFile) formData.append('student_card_file', studentCardFile);
      if (selfieFile) formData.append('selfie_file', selfieFile);
      formData.append('blink_verified', String(blinkVerified));
      if (verifiedEmail) formData.append('email', verifiedEmail);
      formData.append('email_otp_verified', String(overrideEmailVerified || !!verifiedEmail));

      const res = await fetch(`${apiUrl}/api/verify/full-student-pipeline`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to complete pipeline verification.');
      }

      setPipelineResult(data);
      setCurrentStep(4);

      if (onVerificationComplete) {
        onVerificationComplete(data);
      }

      // If confidence is < 70%, trigger the email fallback modal automatically
      if (data.decision === 'EMAIL_FALLBACK_REQUIRED' && !verifiedEmail) {
        setIsEmailModalOpen(true);
      }
    } catch (err: any) {
      setGeneralError(err.message || 'Pipeline evaluation error.');
    } finally {
      setIsEvaluating(false);
    }
  };

  // When Email is Verified through the Modal
  const handleEmailVerified = (email: string) => {
    setVerifiedEmail(email);
    setIsEmailModalOpen(false);
    handleRunFullEvaluation(true);
  };

  const resetForm = () => {
    setCurrentStep(1);
    setAadhaarFile(null);
    setAadhaarResult(null);
    setAadhaarPassword('');
    setStudentCardFile(null);
    setCardResult(null);
    setSelfieFile(null);
    setSelfiePreviewUrl(null);
    setBlinkVerified(false);
    setPipelineResult(null);
    setVerifiedEmail(null);
    setGeneralError(null);
  };

  return (
    <div className="space-y-6">
      {/* 4-Step Progress Indicator Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 md:p-5 shadow-xl">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Step 1 */}
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-2.5 p-2 rounded-xl text-left transition-all ${
              currentStep === 1
                ? 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-400'
                : aadhaarResult
                ? 'text-emerald-400 hover:bg-slate-800/60'
                : 'text-slate-500 hover:bg-slate-800/40'
            }`}
          >
            <div className={`h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
              currentStep === 1
                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/30'
                : aadhaarResult
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-slate-800 text-slate-400'
            }`}>
              {aadhaarResult ? <CheckCircle2 className="h-4 w-4" /> : '1'}
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] uppercase tracking-wider font-semibold opacity-70">Step 1</p>
              <p className="text-xs font-bold truncate">Aadhaar Ground Truth</p>
            </div>
          </button>

          {/* Step 2 */}
          <button
            type="button"
            onClick={() => aadhaarResult && setCurrentStep(2)}
            disabled={!aadhaarResult}
            className={`flex items-center gap-2.5 p-2 rounded-xl text-left transition-all ${
              currentStep === 2
                ? 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-400'
                : cardResult || (!isStudent && aadhaarResult)
                ? 'text-emerald-400 hover:bg-slate-800/60'
                : 'text-slate-500 opacity-60'
            }`}
          >
            <div className={`h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
              currentStep === 2
                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/30'
                : cardResult
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-slate-800 text-slate-400'
            }`}>
              {cardResult ? <CheckCircle2 className="h-4 w-4" /> : '2'}
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] uppercase tracking-wider font-semibold opacity-70">Step 2</p>
              <p className="text-xs font-bold truncate">{isStudent ? 'College ID Card' : 'Persona Check'}</p>
            </div>
          </button>

          {/* Step 3 */}
          <button
            type="button"
            onClick={() => (cardResult || !isStudent) && setCurrentStep(3)}
            disabled={!cardResult && isStudent}
            className={`flex items-center gap-2.5 p-2 rounded-xl text-left transition-all ${
              currentStep === 3
                ? 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-400'
                : selfieFile
                ? 'text-emerald-400 hover:bg-slate-800/60'
                : 'text-slate-500 opacity-60'
            }`}
          >
            <div className={`h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
              currentStep === 3
                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/30'
                : selfieFile
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-slate-800 text-slate-400'
            }`}>
              {selfieFile ? <CheckCircle2 className="h-4 w-4" /> : '3'}
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] uppercase tracking-wider font-semibold opacity-70">Step 3</p>
              <p className="text-xs font-bold truncate">Blink Liveness</p>
            </div>
          </button>

          {/* Step 4 */}
          <button
            type="button"
            onClick={() => pipelineResult && setCurrentStep(4)}
            disabled={!pipelineResult}
            className={`flex items-center gap-2.5 p-2 rounded-xl text-left transition-all ${
              currentStep === 4
                ? 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-400'
                : pipelineResult?.passed_threshold
                ? 'text-emerald-400 hover:bg-slate-800/60'
                : 'text-slate-500 opacity-60'
            }`}
          >
            <div className={`h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
              currentStep === 4
                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/30'
                : pipelineResult?.passed_threshold
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-slate-800 text-slate-400'
            }`}>
              {pipelineResult?.passed_threshold ? <CheckCircle2 className="h-4 w-4" /> : '4'}
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] uppercase tracking-wider font-semibold opacity-70">Step 4</p>
              <p className="text-xs font-bold truncate">Verification Result</p>
            </div>
          </button>
        </div>
      </div>

      {generalError && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{generalError}</span>
          </div>
          <button onClick={() => setGeneralError(null)} className="text-rose-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: AADHAAR CARD GROUND TRUTH ONBOARDING */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl animate-in fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 mb-1">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-xs font-mono uppercase tracking-widest">Phase 1 · Authoritative Baseline</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                Upload Aadhaar Card (Ground Truth)
              </h2>
              <p className="text-xs md:text-sm text-slate-400 mt-1">
                Extracts cryptographically signed QR code, portrait photo, and official demographic data to set the baseline.
              </p>
            </div>

            {aadhaarResult?.ground_truth && (
              <div className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 self-start md:self-auto">
                <CheckCircle2 className="h-4 w-4" />
                <span>Ground Truth Established</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Upload Box */}
            <div className="lg:col-span-6 space-y-4">
              <input
                ref={aadhaarInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleAadhaarChange}
                className="hidden"
              />

              <div
                onClick={() => aadhaarInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  aadhaarFile
                    ? 'border-cyan-500/60 bg-cyan-950/10'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-950/50 hover:bg-slate-950/80'
                }`}
              >
                <div className="h-12 w-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <p className="text-xs md:text-sm font-semibold text-white">
                  {aadhaarFile ? aadhaarFile.name : 'Click to select Aadhaar PDF or Card Photo'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Supports e-Aadhaar PDF, PNG, JPG scans (Up to 10MB)
                </p>
              </div>

              {/* PDF Password if encrypted */}
              {aadhaarFile?.name.endsWith('.pdf') && (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-cyan-400" />
                    <span>e-Aadhaar PDF Password (Optional)</span>
                  </label>
                  <input
                    type="password"
                    value={aadhaarPassword}
                    onChange={(e) => setAadhaarPassword(e.target.value)}
                    placeholder="Standard: FIRST 4 LETTERS OF NAME + BIRTH YEAR (e.g. RAHU2005)"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleProcessAadhaar}
                  disabled={!aadhaarFile || isExtractingAadhaar}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs md:text-sm font-semibold transition-all shadow-lg shadow-cyan-600/25 disabled:opacity-50 cursor-pointer"
                >
                  {isExtractingAadhaar ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Verifying QR & Cryptography...</span>
                    </>
                  ) : (
                    <>
                      <span>Extract & Verify Aadhaar</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Ground Truth Result Card */}
            <div className="lg:col-span-6">
              {aadhaarResult?.ground_truth ? (
                <div className="h-full rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 p-5 flex flex-col justify-between space-y-4 shadow-inner">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                      <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
                        Aadhaar Ground Truth Card
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                        {aadhaarResult.qr_type.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-start gap-4">
                      {aadhaarResult.photo_base64 ? (
                        <div className="relative shrink-0">
                          <img
                            src={aadhaarResult.photo_base64}
                            alt="Aadhaar QR Photo"
                            className="w-20 h-24 object-cover rounded-lg border border-cyan-500/40 shadow-md"
                          />
                          <span className="absolute -bottom-1 -right-1 bg-cyan-500 text-black text-[9px] font-bold px-1 rounded shadow">
                            QR PIC
                          </span>
                        </div>
                      ) : (
                        <div className="w-20 h-24 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 border border-slate-700">
                          <User className="h-8 w-8" />
                        </div>
                      )}

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <p className="text-xs text-slate-400 font-medium">Full Legal Name</p>
                        <p className="text-sm font-bold text-white truncate">
                          {aadhaarResult.ground_truth.name || 'N/A'}
                        </p>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div>
                            <p className="text-[10px] text-slate-500">Date of Birth</p>
                            <p className="text-xs font-semibold text-slate-200">
                              {aadhaarResult.ground_truth.dob || aadhaarResult.ground_truth.dob_iso || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500">Gender</p>
                            <p className="text-xs font-semibold text-slate-200">
                              {aadhaarResult.ground_truth.gender || 'N/A'}
                            </p>
                          </div>
                        </div>

                        {aadhaarResult.ground_truth.aadhaar_last_4 && (
                          <div className="pt-1">
                            <p className="text-[10px] text-slate-500">Masked Aadhaar</p>
                            <p className="text-xs font-mono text-cyan-300 font-semibold">
                              XXXX-XXXX-{aadhaarResult.ground_truth.aadhaar_last_4}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      Cryptographically Validated
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      <span>Proceed to Step 2</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-full rounded-2xl bg-slate-950/40 border border-slate-800/80 p-6 flex flex-col items-center justify-center text-center text-slate-500">
                  <CreditCard className="h-10 w-10 mb-2 opacity-30" />
                  <p className="text-xs font-medium">Ground Truth card will preview here</p>
                  <p className="text-[11px] text-slate-600 mt-1 max-w-xs">
                    Upload your Aadhaar card to establish your legal name, DOB, and official portrait.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: STUDENT PERSONA INQUIRY & ID CARD UPLOAD */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl animate-in fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 mb-1">
                <GraduationCap className="h-5 w-5" />
                <span className="text-xs font-mono uppercase tracking-widest">Phase 2 · Persona & Academic Document</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                Are you an active college student?
              </h2>
              <p className="text-xs md:text-sm text-slate-400 mt-1">
                Select your participant track. Students upload their college ID badge for Textract & barcode verification.
              </p>
            </div>

            {/* Student Inquiry Toggle */}
            <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => setIsStudent(true)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isStudent
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Yes, Student
              </button>
              <button
                type="button"
                onClick={() => setIsStudent(false)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  !isStudent
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                No, Citizen Track
              </button>
            </div>
          </div>

          {isStudent ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Student ID Upload */}
              <div className="lg:col-span-6 space-y-4">
                <input
                  ref={cardInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.pdf"
                  onChange={handleCardChange}
                  className="hidden"
                />

                <div
                  onClick={() => cardInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    studentCardFile
                      ? 'border-cyan-500/60 bg-cyan-950/10'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-950/50 hover:bg-slate-950/80'
                  }`}
                >
                  <div className="h-12 w-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <p className="text-xs md:text-sm font-semibold text-white">
                    {studentCardFile ? studentCardFile.name : 'Click to select Student / College ID Card'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Scans Textract fields, 1D/2D barcodes, and extracts badge photo
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    ← Back to Step 1
                  </button>
                  <button
                    type="button"
                    onClick={handleProcessCard}
                    disabled={!studentCardFile || isExtractingCard}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs md:text-sm font-semibold transition-all shadow-lg shadow-cyan-600/25 disabled:opacity-50 cursor-pointer"
                  >
                    {isExtractingCard ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Running Textract & Barcodes...</span>
                      </>
                    ) : (
                      <>
                        <span>Extract Student Card</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Student Card Result Preview */}
              <div className="lg:col-span-6">
                {cardResult ? (
                  <div className="h-full rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 p-5 flex flex-col justify-between space-y-4 shadow-inner">
                    <div>
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                        <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
                          Extracted Student Badge
                        </span>
                        {cardResult.aadhaar_ground_truth_comparison && (
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                            cardResult.aadhaar_ground_truth_comparison.name_match
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : 'bg-amber-950 text-amber-300 border-amber-800'
                          }`}>
                            Name Match: {cardResult.aadhaar_ground_truth_comparison.name_similarity_score}%
                          </span>
                        )}
                      </div>

                      <div className="flex items-start gap-4">
                        {cardResult.cropped_face_base64 ? (
                          <div className="relative shrink-0">
                            <img
                              src={cardResult.cropped_face_base64}
                              alt="Badge Cropped Face"
                              className="w-20 h-24 object-cover rounded-lg border border-cyan-500/40 shadow-md"
                            />
                            <span className="absolute -bottom-1 -right-1 bg-cyan-500 text-black text-[9px] font-bold px-1 rounded shadow">
                              BADGE PIC
                            </span>
                          </div>
                        ) : (
                          <div className="w-20 h-24 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 border border-slate-700">
                            <User className="h-8 w-8" />
                          </div>
                        )}

                        <div className="space-y-1.5 flex-1 min-w-0">
                          <p className="text-xs text-slate-400 font-medium">Student Name (Card)</p>
                          <p className="text-sm font-bold text-white truncate">
                            {cardResult.extracted_fields.name || 'Not detected'}
                          </p>

                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div>
                              <p className="text-[10px] text-slate-500">Roll No / USN</p>
                              <p className="text-xs font-mono font-semibold text-cyan-300">
                                {cardResult.extracted_fields.id_number || cardResult.usn_candidates[0] || 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-500">Institution</p>
                              <p className="text-xs font-semibold text-slate-200 truncate">
                                {cardResult.extracted_fields.institution || 'N/A'}
                              </p>
                            </div>
                          </div>

                          {/* Candidate Register Numbers / Email Prefixes */}
                          {((cardResult.potential_register_numbers && cardResult.potential_register_numbers.length > 0) || cardResult.usn_candidates.length > 0) && (
                            <div className="pt-2 border-t border-slate-800/80">
                              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Candidate Register Numbers (Valid Email Prefixes)</p>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {(cardResult.potential_register_numbers || cardResult.usn_candidates).map((cand, idx) => (
                                  <span key={idx} className="px-2 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] font-bold">
                                    {cand}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {cardResult.barcodes_and_qrs.length > 0 && (
                            <div className="pt-1">
                              <p className="text-[10px] text-slate-500">Badge Barcodes / QR</p>
                              <p className="text-[11px] font-mono text-slate-300">
                                {cardResult.barcodes_and_qrs.map((b) => b.data).join(', ')}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        OCR Confidence: {(cardResult.ocr_confidence * 100).toFixed(0)}%
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                        className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        <span>Proceed to Step 3</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-full rounded-2xl bg-slate-950/40 border border-slate-800/80 p-6 flex flex-col items-center justify-center text-center text-slate-500">
                    <GraduationCap className="h-10 w-10 mb-2 opacity-30" />
                    <p className="text-xs font-medium">Student Card fields will preview here</p>
                    <p className="text-[11px] text-slate-600 mt-1 max-w-xs">
                      AWS Textract will pull student name, roll number, and crop badge photo automatically.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
                <User className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-white">General Citizen Track Selected</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                You are verifying as an individual citizen. You can proceed directly to the live selfie
                verification step to match your biometric face with the Aadhaar Ground Truth photo.
              </p>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/20"
              >
                Proceed to Live Selfie & Liveness →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: MEDIAPIPE DYNAMIC BLINK & LIVE SELFIE */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl animate-in fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 mb-1">
                <Eye className="h-5 w-5" />
                <span className="text-xs font-mono uppercase tracking-widest">Phase 3 · Liveness & Facial Triangulation</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                Live Selfie & MediaPipe Blink Liveness
              </h2>
              <p className="text-xs md:text-sm text-slate-400 mt-1">
                Verifies anti-spoofing via dynamic eye blinks, captures the sharpest frame, and triangulates against your documents.
              </p>
            </div>

            {selfieFile && (
              <div className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 self-start md:self-auto">
                <CheckCircle2 className="h-4 w-4" />
                <span>Selfie Captured ({blinkVerified ? 'Blink Verified' : 'Standard'})</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Selfie Trigger & Upload */}
            <div className="lg:col-span-6 space-y-4">
              <input
                ref={selfieInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelfieFile(e.target.files[0]);
                    setSelfiePreviewUrl(URL.createObjectURL(e.target.files[0]));
                    setBlinkVerified(false);
                  }
                }}
                className="hidden"
              />

              <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4 text-center">
                <div className="h-14 w-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
                  <Camera className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">MediaPipe Blink Anti-Spoofing Camera</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Opens interactive webcam with on-screen Eye Aspect Ratio (EAR) guidance.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsWebcamOpen(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-all shadow-lg shadow-cyan-600/20"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Launch Liveness Camera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => selfieInputRef.current?.click()}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Upload Photo Instead
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  ← Back to Step 2
                </button>
                <button
                  type="button"
                  onClick={() => handleRunFullEvaluation()}
                  disabled={!selfieFile || isEvaluating}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs md:text-sm font-semibold transition-all shadow-lg shadow-emerald-600/25 disabled:opacity-50 cursor-pointer"
                >
                  {isEvaluating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Triangulating InsightFace Biometrics...</span>
                    </>
                  ) : (
                    <>
                      <span>Evaluate Eligibility (70% Gate)</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Live Selfie & Triangulation Preview */}
            <div className="lg:col-span-6">
              <div className="h-full rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 p-5 flex flex-col justify-between space-y-4 shadow-inner">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
                      3-Way Biometric Triangulation
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      InsightFace ArcFace 512-D
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    {/* Portrait 1: Aadhaar */}
                    <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400">Aadhaar QR</p>
                      {aadhaarResult?.photo_base64 ? (
                        <img
                          src={aadhaarResult.photo_base64}
                          alt="Aadhaar Face"
                          className="w-full aspect-square object-cover rounded-lg border border-slate-700"
                        />
                      ) : (
                        <div className="w-full aspect-square rounded-lg bg-slate-800 flex items-center justify-center text-slate-600">
                          <User className="h-6 w-6" />
                        </div>
                      )}
                      <span className="text-[9px] text-emerald-400 font-mono block">Baseline</span>
                    </div>

                    {/* Portrait 2: Student Card */}
                    <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400">ID Badge</p>
                      {cardResult?.cropped_face_base64 ? (
                        <img
                          src={cardResult.cropped_face_base64}
                          alt="Badge Face"
                          className="w-full aspect-square object-cover rounded-lg border border-slate-700"
                        />
                      ) : (
                        <div className="w-full aspect-square rounded-lg bg-slate-800 flex items-center justify-center text-slate-600">
                          <User className="h-6 w-6" />
                        </div>
                      )}
                      <span className="text-[9px] text-cyan-400 font-mono block">Badge Pic</span>
                    </div>

                    {/* Portrait 3: Live Selfie */}
                    <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400">Live Selfie</p>
                      {selfiePreviewUrl ? (
                        <img
                          src={selfiePreviewUrl}
                          alt="Live Selfie"
                          className="w-full aspect-square object-cover rounded-lg border border-cyan-500/50"
                        />
                      ) : (
                        <div className="w-full aspect-square rounded-lg bg-slate-800 flex items-center justify-center text-slate-600">
                          <Camera className="h-6 w-6" />
                        </div>
                      )}
                      <span className="text-[9px] text-cyan-300 font-mono block">
                        {blinkVerified ? 'Blink OK' : 'Awaiting'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-slate-300 flex items-center justify-between">
                  <span>Confidence Gate Policy:</span>
                  <span className="font-mono font-bold text-cyan-300">Threshold: 70%+</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: DECISION RESULT & EMAIL FALLBACK MODAL TRIGGER */}
      {/* ========================================================================= */}
      {currentStep === 4 && pipelineResult && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl animate-in fade-in">
          {/* Decision Banner */}
          <div className={`p-6 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl ${
            pipelineResult.decision === 'APPROVE'
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
              : pipelineResult.decision === 'EMAIL_FALLBACK_REQUIRED'
              ? 'bg-amber-950/40 border-amber-500/50 text-amber-300'
              : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
          }`}>
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border ${
                pipelineResult.decision === 'APPROVE'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                  : pipelineResult.decision === 'EMAIL_FALLBACK_REQUIRED'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                  : 'bg-rose-500/20 border-rose-500 text-rose-400'
              }`}>
                {pipelineResult.decision === 'APPROVE' ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <ShieldAlert className="h-6 w-6" />
                )}
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-black/40 border border-current">
                  {pipelineResult.student_status}
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  {pipelineResult.decision === 'APPROVE'
                    ? 'Verified Student Identity Confirmed'
                    : 'College Email Verification Required'}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5 max-w-xl">{pipelineResult.summary}</p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Composite Confidence</span>
              <span className="text-2xl md:text-3xl font-mono font-bold text-white">
                {(pipelineResult.confidence * 100).toFixed(0)}%
              </span>
              <span className="text-[11px] text-slate-400 block font-mono">
                Threshold: {(pipelineResult.threshold * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Email Fallback Challenge Notice */}
          {pipelineResult.decision === 'EMAIL_FALLBACK_REQUIRED' && (
            <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Mail className="h-6 w-6 text-amber-400 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-white">Unlock Instant Student Verification</p>
                  <p className="text-xs text-slate-300">
                    Confidence is below 70%. Enter your university email address (.edu / .ac.in) to verify instantly with a one-time code.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-all shadow-lg shadow-amber-600/25 shrink-0"
              >
                Verify College Email Now
              </button>
            </div>
          )}

          {/* Verification Evidence Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Signal 1: Name Match */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Ground Truth Name Match</span>
                <span className="font-mono text-cyan-400 font-bold">
                  {((pipelineResult.components.name_match || 0) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 rounded-full"
                  style={{ width: `${(pipelineResult.components.name_match || 0) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Aadhaar vs Student Badge fuzzy token comparison
              </p>
            </div>

            {/* Signal 2: Biometrics Triangulation */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>InsightFace Triangulation</span>
                <span className="font-mono text-cyan-400 font-bold">
                  {((pipelineResult.components.biometric_score || 0) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${(pipelineResult.components.biometric_score || 0) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                512-D ArcFace vectors across Live Selfie, Badge & Aadhaar
              </p>
            </div>

            {/* Signal 3: Academic / Registry */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Academic Trust Score</span>
                <span className="font-mono text-cyan-400 font-bold">
                  {((pipelineResult.components.academic_trust || 0) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${(pipelineResult.components.academic_trust || 0) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                DigiLocker / NAD / Institutional USN validation
              </p>
            </div>
          </div>

          {/* Audit Reasons */}
          <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-2">
            <p className="text-xs font-bold text-slate-300">Auditable Evidence Signals:</p>
            <ul className="space-y-1 text-xs text-slate-400">
              {pipelineResult.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-cyan-400 shrink-0">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Start New Verification
            </button>
            {onNavigateToAudit && (
              <button
                type="button"
                onClick={onNavigateToAudit}
                className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/20"
              >
                View in Organizer Queue →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Webcam Liveness Modal */}
      <WebcamModal
        isOpen={isWebcamOpen}
        onClose={() => setIsWebcamOpen(false)}
        onCapture={handleWebcamCapture}
      />

      {/* College Email Fallback Modal */}
      <CollegeEmailFallbackModal
        isOpen={isEmailModalOpen}
        currentConfidence={pipelineResult?.confidence || 0.55}
        candidateUsn={cardResult?.extracted_fields.id_number || cardResult?.usn_candidates?.[0]}
        candidateUsns={cardResult?.potential_register_numbers || cardResult?.usn_candidates || []}
        candidateName={aadhaarResult?.ground_truth.name || cardResult?.extracted_fields.name}
        onClose={() => setIsEmailModalOpen(false)}
        onVerified={handleEmailVerified}
      />
    </div>
  );
}
