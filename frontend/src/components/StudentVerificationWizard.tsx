'use client';

import React, { useState } from 'react';
import {
  X,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  FileCheck,
  CreditCard,
  Camera,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Lock,
  GraduationCap,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  UserCheck,
  RotateCcw,
  ScanEye,
} from 'lucide-react';
import { WebcamModal } from './WebcamModal';
import { CollegeEmailFallbackModal } from './CollegeEmailFallbackModal';
import { TamperingAnalysisWidget } from './TamperingAnalysisWidget';

interface StudentVerificationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onVerificationComplete: (result: {
    name: string;
    institution: string;
    idNumber: string;
    confidence: number;
    status: string;
  }) => void;
}

export function StudentVerificationWizard({
  isOpen,
  onClose,
  onVerificationComplete,
}: StudentVerificationWizardProps) {
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');

  // Step state: 1 = Govt ID, 2 = Student ID, 3 = Live Selfie / Biometrics, 4 = Concluded
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Government ID Ground Truth (Aadhaar or PAN)
  const [govtIdType, setGovtIdType] = useState<'AADHAAR' | 'PAN'>('AADHAAR');
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [aadhaarPassword, setAadhaarPassword] = useState('');
  const [panFile, setPanFile] = useState<File | null>(null);
  const [isExtractingGovtId, setIsExtractingGovtId] = useState(false);
  const [groundTruth, setGroundTruth] = useState<any | null>(null);
  const [aadhaarPhotoRaw, setAadhaarPhotoRaw] = useState<string | null>(null);

  // Step 2: Student Card & Tampering Analysis
  const [studentCardFile, setStudentCardFile] = useState<File | null>(null);
  const [cardPreviewUrl, setCardPreviewUrl] = useState<string | null>(null);
  const [isExtractingCard, setIsExtractingCard] = useState(false);
  const [cardResult, setCardResult] = useState<any | null>(null);
  const [demoScenario, setDemoScenario] = useState<string | null>(null);
  const [isLoadingPreset, setIsLoadingPreset] = useState(false);

  // Step 3: Biometrics & Liveness
  const [isWebcamOpen, setIsWebcamOpen] = useState(false);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreviewUrl, setSelfiePreviewUrl] = useState<string | null>(null);
  const [blinkPassed, setBlinkPassed] = useState(true);
  const [isEvaluatingBiometrics, setIsEvaluatingBiometrics] = useState(false);

  // Step 4: Fallback & Final Decision
  const [decisionResult, setDecisionResult] = useState<any | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Step 1: Extract Government ID Ground Truth (Aadhaar or PAN)
  const handleGovtIdUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (govtIdType === 'AADHAAR') {
      if (!aadhaarFile) {
        setErrorMessage('Please select your Aadhaar card file (PDF or image).');
        return;
      }

      setIsExtractingGovtId(true);
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

        setGroundTruth(data.ground_truth);
        if (data.photo_base64) {
          setAadhaarPhotoRaw(data.photo_base64);
        }

        setCurrentStep(2);
      } catch (err: any) {
        setErrorMessage(err.message || 'Error processing Aadhaar document. Check password if PDF is protected.');
      } finally {
        setIsExtractingGovtId(false);
      }
    } else {
      if (!panFile) {
        setErrorMessage('Please select your PAN card file (image or PDF).');
        return;
      }

      setIsExtractingGovtId(true);
      try {
        const formData = new FormData();
        formData.append('file', panFile);

        const res = await fetch(`${apiUrl}/api/verify/pan`, {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || data.error || 'Failed to extract PAN Ground Truth.');
        }

        setGroundTruth(data.ground_truth);
        if (data.photo_base64) {
          setAadhaarPhotoRaw(data.photo_base64);
        }

        setCurrentStep(2);
      } catch (err: any) {
        setErrorMessage(err.message || 'Error processing PAN card document.');
      } finally {
        setIsExtractingGovtId(false);
      }
    }
  };

  // Step 2: Extract Student ID Card & Execute Background Tampering Check
  const loadCardPreset = async (presetId: 'genuine' | 'tampered') => {
    setIsLoadingPreset(true);
    setErrorMessage(null);
    setCardResult(null);
    try {
      const filename = presetId === 'tampered' ? 'tampered_dob_id.png' : 'genuine_college_id.png';
      setDemoScenario(presetId === 'tampered' ? 'tampered' : null);
      const res = await fetch(`${apiUrl}/static/samples/${filename}`);
      if (res.ok) {
        const blob = await res.blob();
        const file = new File([blob], filename, { type: 'image/png' });
        setStudentCardFile(file);
        if (cardPreviewUrl) URL.revokeObjectURL(cardPreviewUrl);
        setCardPreviewUrl(URL.createObjectURL(file));
      }
    } catch (e) {
      console.warn('Could not load sample card:', e);
    } finally {
      setIsLoadingPreset(false);
    }
  };

  const handleCardUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentCardFile) {
      setErrorMessage('Please upload your Student ID Card.');
      return;
    }

    setIsExtractingCard(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', studentCardFile);
      if (groundTruth) {
        formData.append('ground_truth_json', JSON.stringify(groundTruth));
      }
      if (demoScenario) {
        formData.append('demo_scenario', demoScenario);
      }

      const res = await fetch(`${apiUrl}/api/verify/student-card`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || 'Failed to analyze student card.');
      }

      setCardResult(data);

      // If document is clean (LOW risk), proceed to Step 3
      if (data.tampering_analysis?.risk_level === 'LOW') {
        setCurrentStep(3);
      }
      // If HIGH or MEDIUM risk, stay on Step 2 to call out the user and show the diagnostic breakdown
    } catch (err: any) {
      setErrorMessage(err.message || 'Error extracting fields from student ID.');
    } finally {
      setIsExtractingCard(false);
    }
  };

  // Step 3: Handle Selfie & Run Full Multi-Tier Pipeline
  const handleSelfieCaptured = async (file: File, blinkVerified: boolean) => {
    setSelfieFile(file);
    setBlinkPassed(blinkVerified);
    setSelfiePreviewUrl(URL.createObjectURL(file));
    setIsWebcamOpen(false);

    // Immediately trigger multi-tier decision evaluation
    runFullEvaluation(file, blinkVerified);
  };

  const runFullEvaluation = async (selfie: File, blink: boolean, emailVerifiedParam: boolean = false) => {
    if (govtIdType === 'AADHAAR' && !aadhaarFile) return;
    if (govtIdType === 'PAN' && !panFile) return;

    setIsEvaluatingBiometrics(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('govt_id_type', govtIdType);
      if (govtIdType === 'AADHAAR' && aadhaarFile) {
        formData.append('aadhaar_file', aadhaarFile);
        if (aadhaarPassword) formData.append('aadhaar_password', aadhaarPassword);
      } else if (govtIdType === 'PAN' && panFile) {
        formData.append('pan_file', panFile);
      }
      formData.append('is_student', 'true');
      if (studentCardFile) formData.append('student_card_file', studentCardFile);
      formData.append('selfie_file', selfie);
      formData.append('blink_verified', blink.toString());
      formData.append('email_otp_verified', emailVerifiedParam.toString());
      if (demoScenario) formData.append('demo_scenario', demoScenario);

      const res = await fetch(`${apiUrl}/api/verify/full-student-pipeline`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || 'Evaluation failed.');
      }

      setDecisionResult(data);

      // Check if 70% threshold is satisfied
      if (data.decision === 'APPROVE') {
        setCurrentStep(4);
        onVerificationComplete({
          name: groundTruth?.name || cardResult?.extracted_fields?.name || 'Verified Student',
          institution: cardResult?.extracted_fields?.institution || 'PES University',
          idNumber: cardResult?.extracted_fields?.id_number || 'STU2026',
          confidence: data.confidence,
          status: data.student_status,
        });
      } else {
        // Less than 70% confidence triggers official college email fallback
        setIsEmailModalOpen(true);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error evaluating student eligibility.');
    } finally {
      setIsEvaluatingBiometrics(false);
    }
  };

  const handleEmailFallbackSuccess = (verifiedEmail: string) => {
    setIsEmailModalOpen(false);
    if (selfieFile) {
      runFullEvaluation(selfieFile, blinkPassed, true);
    }
  };

  const handleDocumentFallbackSuccess = (docData: any) => {
    setIsEmailModalOpen(false);
    setCurrentStep(4);
    setDecisionResult({
      confidence: 0.94,
      student_status: 'VERIFIED_STUDENT_DOCUMENT_BACKED',
      summary: `Verified via authentic ${docData.doc_label || 'institutional document'}.`,
    });
    onVerificationComplete({
      name: docData.extracted_fields?.name || groundTruth?.name || 'Verified Student',
      institution: docData.extracted_fields?.institution || cardResult?.extracted_fields?.institution || 'PES University',
      idNumber: docData.extracted_fields?.roll_number || cardResult?.extracted_fields?.id_number || 'STU2026',
      confidence: 0.94,
      status: 'VERIFIED_STUDENT_DOCUMENT_BACKED',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-9 border border-[#ECECEC] shadow-2xl text-[#14161A]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-1.5 text-[#9AA1AC] hover:text-[#14161A] hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#DFF3E1] text-[#12805F]">
              Student Eligibility Verification
            </span>
            <span className="text-xs text-[#9AA1AC]">
              Step {currentStep} of 4
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[#14161A]">
            Verify Student Status
          </h2>
          <p className="text-xs sm:text-sm text-[#5B6270] mt-0.5">
            Complete this one-time verification to unlock access to all collegiate hackathons, competitions, and student tracks on Hackingly.
          </p>
        </div>

        {/* Stepper Indicator */}
        <div className="grid grid-cols-4 gap-2 mb-6 text-center">
          {[
            { step: 1, label: 'Government ID' },
            { step: 2, label: 'Student ID' },
            { step: 3, label: 'Live Selfie & Blink' },
            { step: 4, label: 'Status Approved' },
          ].map((item) => (
            <div
              key={item.step}
              className={`p-2 rounded-xl text-[11px] font-semibold transition-all ${
                currentStep === item.step
                  ? 'bg-[#12805F] text-white shadow-xs'
                  : currentStep > item.step
                  ? 'bg-[#DFF3E1] text-[#12805F]'
                  : 'bg-slate-100 text-[#9AA1AC]'
              }`}
            >
              {item.label}
            </div>
          ))}
        </div>

        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ----------------- STEP 1: Government ID Ground Truth (Aadhaar or PAN) ----------------- */}
        {currentStep === 1 && (
          <form onSubmit={handleGovtIdUpload} className="space-y-4">
            {/* Government ID Type Selector Radio Group */}
            <div className="p-3.5 rounded-2xl bg-[#FAFAFA] border border-[#ECECEC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs font-bold text-[#14161A] flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-[#12805F]" />
                Government ID
              </span>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-xs font-semibold text-[#14161A] cursor-pointer">
                  <input
                    type="radio"
                    name="govtIdType"
                    value="AADHAAR"
                    checked={govtIdType === 'AADHAAR'}
                    onChange={() => {
                      setGovtIdType('AADHAAR');
                      setErrorMessage(null);
                    }}
                    className="w-4 h-4 text-[#12805F] focus:ring-[#12805F] accent-[#12805F] cursor-pointer"
                  />
                  <span>Aadhaar Card</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-[#14161A] cursor-pointer">
                  <input
                    type="radio"
                    name="govtIdType"
                    value="PAN"
                    checked={govtIdType === 'PAN'}
                    onChange={() => {
                      setGovtIdType('PAN');
                      setErrorMessage(null);
                    }}
                    className="w-4 h-4 text-[#12805F] focus:ring-[#12805F] accent-[#12805F] cursor-pointer"
                  />
                  <span>PAN Card</span>
                </label>
              </div>
            </div>

            {govtIdType === 'AADHAAR' ? (
              <>
                <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#ECECEC]">
                  <div className="flex items-center gap-2 mb-1">
                    <Lock className="w-4 h-4 text-[#12805F]" />
                    <span className="text-xs font-bold text-[#14161A] uppercase tracking-wider">
                      UIDAI Cryptographic Ground Truth
                    </span>
                  </div>
                  <p className="text-xs text-[#5B6270]">
                    Upload your official e-Aadhaar PDF or card photo. We securely verify the RSA 2048-bit digital signature to anchor your real name and age. Sensitive details are never displayed or shared.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#5B6270] mb-1.5">
                    Aadhaar Document (PDF or Photo)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    required
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setAadhaarFile(e.target.files[0]);
                      }
                    }}
                    className="w-full text-xs text-[#5B6270] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#12805F] file:text-white hover:file:bg-[#0E6A4E] file:cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#5B6270] mb-1.5">
                    PDF Password (If protected, e.g. First 4 letters in CAPS + Birth Year)
                  </label>
                  <input
                    type="password"
                    value={aadhaarPassword}
                    onChange={(e) => setAadhaarPassword(e.target.value)}
                    placeholder="e.g. MOHA2005"
                    className="w-full px-4 py-2.5 text-xs bg-white border border-[#ECECEC] rounded-xl text-[#14161A] focus:outline-none focus:border-[#12805F]"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#ECECEC]">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-4 h-4 text-[#12805F]" />
                    <span className="text-xs font-bold text-[#14161A] uppercase tracking-wider">
                      Income Tax PAN Ground Truth
                    </span>
                  </div>
                  <p className="text-xs text-[#5B6270]">
                    Upload your official PAN Card photo or PDF. We extract the 10-digit PAN number, cardholder name, and date of birth to anchor your verified identity.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#5B6270] mb-1.5">
                    PAN Card Document (Photo or PDF)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    required
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setPanFile(e.target.files[0]);
                      }
                    }}
                    className="w-full text-xs text-[#5B6270] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#12805F] file:text-white hover:file:bg-[#0E6A4E] file:cursor-pointer"
                  />
                </div>
              </>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isExtractingGovtId || (govtIdType === 'AADHAAR' ? !aadhaarFile : !panFile)}
                className="py-3 px-7 rounded-full bg-[#12805F] hover:bg-[#0E6A4E] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isExtractingGovtId ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>
                      {govtIdType === 'AADHAAR'
                        ? 'Cryptographically Anchoring Aadhaar...'
                        : 'Extracting PAN Ground Truth...'}
                    </span>
                  </>
                ) : (
                  <>
                    <span>Anchor {govtIdType === 'AADHAAR' ? 'Aadhaar' : 'PAN'} Ground Truth</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ----------------- STEP 2: Student ID Card & Tampering Analysis ----------------- */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-[#DFF3E1] border border-[#B7E4C7] text-xs text-[#12805F] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Identity Ground Truth securely anchored. Now provide your student credential.</span>
            </div>

            <form onSubmit={handleCardUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#5B6270] mb-1.5">
                  Upload College / University Student ID Card
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  required={!studentCardFile}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const f = e.target.files[0];
                      setStudentCardFile(f);
                      setDemoScenario(null);
                      setCardResult(null);
                      if (f.type.startsWith('image/')) {
                        setCardPreviewUrl(URL.createObjectURL(f));
                      }
                    }
                  }}
                  className="w-full text-xs text-[#5B6270] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#12805F] file:text-white hover:file:bg-[#0E6A4E] file:cursor-pointer"
                />
              </div>

              {cardPreviewUrl && (
                <div className="flex justify-center p-2">
                  <img
                    src={cardPreviewUrl}
                    alt="Card Preview"
                    className="max-h-36 rounded-xl border border-[#ECECEC] object-contain shadow-xs"
                  />
                </div>
              )}

              {/* 🚨 USER CALLOUT: Document Tampering Detected Alert (HIGH RISK) */}
              {cardResult?.tampering_analysis?.risk_level === 'HIGH' && (
                <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 animate-in fade-in slide-in-from-top-2 duration-300 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-rose-100 rounded-xl text-rose-700 flex-shrink-0">
                      <AlertOctagon className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-rose-950">
                          🚨 Document Tampering Detected!
                        </h4>
                        <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-rose-200 text-rose-800">
                          High Risk Fraud
                        </span>
                      </div>
                      <p className="text-xs text-rose-800 leading-relaxed">
                        Potential digital alteration identified on this credential. Our automated forensic scanner detected localized anomalies (e.g. Splicing Discontinuity, Compression Anomaly in DOB, or Font Inconsistency).
                      </p>
                      <p className="text-xs font-semibold text-rose-900">
                        Hackingly requires an authentic, unaltered physical ID card. Progression has been blocked for integrity.
                      </p>
                    </div>
                  </div>

                  {/* Render 8-check diagnostic widget */}
                  <TamperingAnalysisWidget analysis={cardResult.tampering_analysis} />
                </div>
              )}

              {/* ⚠️ USER CALLOUT: Borderline Document Integrity Alert (MEDIUM RISK) */}
              {cardResult?.tampering_analysis?.risk_level === 'MEDIUM' && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 animate-in fade-in slide-in-from-top-2 duration-300 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-100 rounded-xl text-amber-700 flex-shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-amber-950">
                          ⚠️ Borderline Document Integrity (Risk: MEDIUM)
                        </h4>
                      </div>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        Subtle forensic anomalies were detected on the card image (e.g., compression artifacts or font variation). You may proceed to live selfie capture, but mandatory official college email OTP verification will be required before final approval.
                      </p>
                    </div>
                  </div>

                  {/* Render 8-check diagnostic widget */}
                  <TamperingAnalysisWidget analysis={cardResult.tampering_analysis} compact />
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep(1);
                    setCardResult(null);
                  }}
                  className="text-xs text-[#5B6270] hover:text-[#14161A] cursor-pointer"
                >
                  ← Back
                </button>

                <div className="flex items-center gap-2">
                  {/* If tampered, show Re-upload reset button */}
                  {cardResult?.tampering_analysis?.risk_level === 'HIGH' && (
                    <button
                      type="button"
                      onClick={() => {
                        setStudentCardFile(null);
                        setCardPreviewUrl(null);
                        setCardResult(null);
                        setDemoScenario(null);
                      }}
                      className="py-2.5 px-5 rounded-full bg-slate-100 hover:bg-slate-200 text-[#334155] text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Re-upload Original ID Card</span>
                    </button>
                  )}

                  {/* If Medium risk, let user acknowledge and proceed */}
                  {cardResult?.tampering_analysis?.risk_level === 'MEDIUM' && (
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="py-3 px-7 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer flex items-center gap-2"
                    >
                      <span>Acknowledge & Proceed to Selfie</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}

                  {/* Primary Extract & Forensic Background Check Submit */}
                  {(!cardResult || cardResult?.tampering_analysis?.risk_level === 'LOW') && (
                    <button
                      type="submit"
                      disabled={isExtractingCard || !studentCardFile}
                      className="py-3 px-7 rounded-full bg-[#12805F] hover:bg-[#0E6A4E] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
                    >
                      {isExtractingCard ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Running 8-Check Forensic Tampering Analysis...</span>
                        </>
                      ) : (
                        <>
                          <span>Extract Credentials & Tampering Check</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ----------------- STEP 3: Live Selfie & Dynamic Blink ----------------- */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#ECECEC]">
              <div className="flex items-center gap-2 mb-1">
                <Camera className="w-4 h-4 text-[#12805F]" />
                <span className="text-xs font-bold text-[#14161A] uppercase tracking-wider">
                  Live MediaPipe Dynamic Blink Verification
                </span>
              </div>
              <p className="text-xs text-[#5B6270]">
                Capture a quick live photo to execute 3-way facial triangulation across your Live Selfie, Student Card Badge, and official Aadhaar photo.
              </p>
            </div>

            {/* Extracted Student Card Metadata preview */}
            {cardResult && (
              <div className="p-3.5 rounded-xl border border-[#ECECEC] bg-white text-xs flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-[#14161A]">
                      {cardResult.extracted_fields?.name || 'Student Candidate'}
                    </p>
                    {cardResult.tampering_analysis && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        cardResult.tampering_analysis.risk_level === 'LOW'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        Forensics: {cardResult.tampering_analysis.risk_level} Risk
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#5B6270]">
                    {cardResult.extracted_fields?.institution || 'PES University'} · Roll No: {cardResult.extracted_fields?.id_number || 'N/A'}
                  </p>
                </div>
                {cardResult.cropped_face_base64 && (
                  <img
                    src={cardResult.cropped_face_base64}
                    alt="Cropped Badge"
                    className="w-11 h-11 object-cover rounded-full border border-[#ECECEC]"
                  />
                )}
              </div>
            )}

            {selfiePreviewUrl ? (
              <div className="flex items-center justify-between p-3 rounded-2xl border border-[#B7E4C7] bg-[#F4FAF6]">
                <div className="flex items-center gap-3">
                  <img
                    src={selfiePreviewUrl}
                    alt="Selfie"
                    className="w-12 h-12 rounded-full object-cover border border-[#ECECEC]"
                  />
                  <div>
                    <p className="text-xs font-semibold text-[#14161A]">Live selfie captured</p>
                    <p className="text-[11px] text-[#12805F]">Dynamic blink confirmed</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsWebcamOpen(true)}
                  className="text-xs text-[#5B6270] hover:text-[#14161A] underline"
                >
                  Retake
                </button>
              </div>
            ) : (
              <div className="text-center py-6 border-2 border-dashed border-[#D5D8DF] rounded-2xl">
                <button
                  type="button"
                  onClick={() => setIsWebcamOpen(true)}
                  className="py-3 px-6 rounded-full bg-[#12805F] hover:bg-[#0E6A4E] text-white text-xs font-semibold shadow-xs cursor-pointer inline-flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Start Webcam Blink Liveness</span>
                </button>
              </div>
            )}

            <div className="pt-2 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="text-xs text-[#5B6270] hover:text-[#14161A] cursor-pointer"
              >
                ← Back
              </button>

              {selfieFile && (
                <button
                  type="button"
                  disabled={isEvaluatingBiometrics}
                  onClick={() => runFullEvaluation(selfieFile, blinkPassed)}
                  className="py-3 px-7 rounded-full bg-[#12805F] hover:bg-[#0E6A4E] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isEvaluatingBiometrics ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Comparing 512-D ArcFace Embeddings...</span>
                    </>
                  ) : (
                    <>
                      <span>Conclude Verification</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ----------------- STEP 4: Verification Concluded ----------------- */}
        {currentStep === 4 && (
          <div className="space-y-5 text-center py-4 animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-[#DFF3E1] border border-[#B7E4C7] mx-auto flex items-center justify-center text-[#12805F] shadow-xs">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#DFF3E1] text-[#12805F]">
                CONFIDENCE {Math.round((decisionResult?.confidence || 0.92) * 100)}% · VERIFIED
              </span>
              <h3 className="text-2xl font-bold tracking-tight text-[#14161A] mt-2">
                Student Eligibility Verified!
              </h3>
              <p className="text-xs sm:text-sm text-[#5B6270] mt-1 max-w-md mx-auto">
                Your student identity has been authenticated against official Government ID ground truth and 3-way facial triangulation. You are now authorized to register for CodeX 3.0 and all collegiate events.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="py-3 px-8 rounded-full bg-[#12805F] hover:bg-[#0E6A4E] text-white text-sm font-semibold transition-all shadow-xs cursor-pointer"
              >
                Go to Events
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Webcam Modal */}
      <WebcamModal
        isOpen={isWebcamOpen}
        onClose={() => setIsWebcamOpen(false)}
        onCapture={handleSelfieCaptured}
      />

      {/* College Email & Institutional Documents Fallback Modal */}
      <CollegeEmailFallbackModal
        isOpen={isEmailModalOpen}
        currentConfidence={decisionResult?.confidence || 0.65}
        candidateUsns={cardResult?.usn_candidates}
        candidateName={groundTruth?.name}
        groundTruth={groundTruth}
        institution={cardResult?.extracted_fields?.institution}
        onClose={() => setIsEmailModalOpen(false)}
        onVerified={handleEmailFallbackSuccess}
        onDocumentVerified={handleDocumentFallbackSuccess}
      />
    </div>
  );
}
