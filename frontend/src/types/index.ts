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
    status: 'MATCH' | 'MISMATCH' | 'N/A';
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
