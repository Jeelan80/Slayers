export type DecisionType = 'APPROVE' | 'MANUAL_REVIEW' | 'REJECT';
export type IdType = 'COLLEGE_ID' | 'AADHAAR' | 'PAN' | 'PASSPORT' | 'DRIVING_LICENSE';

export interface VerificationChecks {
  ocr?: {
    status: 'PASS' | 'REVIEW' | 'FAIL';
    confidence: number;
    mode?: string;
  };
  eligibility?: {
    status: 'PASS' | 'FAIL';
    age?: number | null;
    minimum_age?: number;
    event_date?: string;
  };
  quality?: {
    status: 'PASS' | 'REVIEW' | 'FAIL';
    score: number;
    blur_variance: number;
    label: string;
  };
  ela?: {
    status: 'FLAG' | 'PASS';
    score: number;
    label: string;
  };
  qr?: {
    status: 'MATCH' | 'MISMATCH' | 'N/A' | 'CROSS_VALIDATED' | 'DECODED' | 'DETECTED' | 'NOT_FOUND' | string;
    reason?: string;
    fields?: Record<string, string>;
  };
  name_match?: {
    status: 'MATCH' | 'REVIEW' | 'MISMATCH';
    score: number;
  };
  duplicate?: {
    status: 'UNIQUE' | 'POSSIBLE_REUSE' | 'DUPLICATE';
    exact_match?: boolean;
    phash_matches?: Array<{ id: number; name: string }>;
  };
  face?: {
    available: boolean;
    status: string;
    score?: number;
    match?: boolean;
  };
}

export interface ExtractedFields {
  name?: string;
  dob?: string;
  id_number?: string;
  institution?: string;
  id_type?: string;
  ocr_mode?: string;
}

export interface VerificationResponse {
  registration_id?: number;
  decision: DecisionType;
  confidence: number;
  summary: string;
  reasons: string[];
  strong_flags: string[];
  extracted: ExtractedFields;
  checks: VerificationChecks;
}

export interface RegistrationRecord {
  id: number;
  name: string;
  dob?: string;
  institution?: string;
  id_type?: string;
  id_number_masked?: string;
  id_fingerprint?: string;
  phash?: string;
  decision: DecisionType;
  confidence: number;
  summary?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewer_notes?: string;
  created_at: string;
  reasons?: string[];
  checks?: VerificationChecks;
  extracted?: ExtractedFields;
}

export interface BackendHealth {
  status: string;
  service: string;
  version: string;
  aws_textract_enabled: boolean;
  aws_rekognition_enabled: boolean;
}

export interface PresetScenario {
  id: string;
  title: string;
  badge: string;
  expectedDecision: DecisionType;
  description: string;
  attackVector: string;
  defenseMechanism: string;
  data: {
    name: string;
    dob: string;
    idNumber: string;
    institution: string;
    idType: IdType;
    minAge: number;
    eventDate: string;
  };
  cardOptions: {
    isBlurry?: boolean;
    isTampered?: boolean;
    customQrData?: string;
  };
}

export interface AadhaarGroundTruth {
  name?: string;
  dob?: string;
  dob_iso?: string;
  gender?: string;
  careof?: string;
  district?: string;
  state?: string;
  pincode?: string;
  aadhaar_last_4?: string;
  mobile_last_4?: string;
}

export interface AadhaarExtractionResponse {
  success: boolean;
  qr_detected: boolean;
  qr_type: string;
  has_embedded_photo: boolean;
  photo_base64?: string;
  signature_verification?: {
    verified: boolean;
    status: string;
    message?: string;
  };
  ground_truth: AadhaarGroundTruth;
  error?: string;
}

export interface StudentCardExtractionResponse {
  success: boolean;
  extracted_fields: {
    name?: string;
    dob?: string;
    id_number?: string;
    institution?: string;
    email?: string;
    course?: string;
    validity?: string;
    gender?: string;
  };
  ocr_confidence: number;
  barcodes_and_qrs: Array<{ type: string; data: string }>;
  usn_candidates: string[];
  potential_register_numbers?: string[];
  has_cropped_face: boolean;
  cropped_face_base64?: string;
  aadhaar_ground_truth_comparison?: {
    name_similarity_score: number;
    name_match: boolean;
    dob_match: boolean;
    gender_match: boolean;
    overall_identity_verified: boolean;
  };
  ocr_mode?: string;
}

export interface BiometricTriangulationResponse {
  biometric_pass: boolean;
  composite_score: number;
  blink_liveness_verified: boolean;
  pairwise_scores: {
    selfie_vs_card?: number | null;
    selfie_vs_aadhaar?: number | null;
    card_vs_aadhaar?: number | null;
  };
  pairwise_modes?: Record<string, string>;
  card_cropped_photo_base64?: string;
  has_aadhaar_biometric: boolean;
}

export interface FullPipelineResponse {
  registration_id?: number;
  decision: DecisionType | 'EMAIL_FALLBACK_REQUIRED';
  student_status: 'VERIFIED_STUDENT' | 'VERIFIED_STUDENT_EMAIL_BACKED' | 'VERIFIED_CITIZEN' | 'PENDING_EMAIL_VERIFICATION' | 'MANUAL_REVIEW';
  confidence: number;
  threshold: number;
  passed_threshold: boolean;
  summary: string;
  reasons: string[];
  components: Record<string, number>;
  aadhaar?: AadhaarExtractionResponse;
  student_card?: StudentCardExtractionResponse;
  biometrics?: BiometricTriangulationResponse;
}
