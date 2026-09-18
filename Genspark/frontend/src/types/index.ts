export interface VerificationResult {
  registration_id: number;
  decision: 'APPROVE' | 'MANUAL_REVIEW' | 'REJECT';
  confidence: number;
  summary: string;
  reasons: string[];
  strong_flags: string[];
  extracted: {
    name: string;
    dob: string;
    id_number: string;
    institution: string;
    id_type: string;
    ocr_mode: 'LOCAL_DEMO' | 'AWS_TEXTRACT';
  };
  checks: {
    ocr: { status: 'PASS' | 'REVIEW'; confidence: number; mode: string };
    eligibility: { status: 'PASS' | 'FAIL'; age: number; minimum_age: number; event_date: string };
    quality: { status: 'PASS' | 'REVIEW'; score: number; blur_variance: number; label: string };
    ela: { status: 'PASS' | 'FLAG'; score: number; label: string };
    qr: { status: 'MATCH' | 'MISMATCH' | 'N/A'; reason: string; fields: Record<string, string> };
    name_match: { status: 'MATCH' | 'REVIEW' | 'MISMATCH'; score: number };
    duplicate: { status: 'UNIQUE' | 'POSSIBLE_REUSE' | 'DUPLICATE'; exact_match: boolean };
    face: { available: boolean; status: 'NOT_PROVIDED' | 'MATCH' | 'MISMATCH' };
  };
}

export interface Registration {
  id: number;
  name: string;
  created_at: string;
  decision: 'APPROVE' | 'MANUAL_REVIEW' | 'REJECT';
  confidence: number;
  review_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  strong_flags: string[];
}

export interface HealthStatus {
  status: 'ok' | 'error';
  service: string;
  version: string;
  aws_textract_enabled: boolean;
}

export interface DemoSample {
  id: string;
  name: string;
  description: string;
  expected: 'APPROVE' | 'REJECT' | 'MANUAL_REVIEW';
}

export type PipelineStage =
  | 'idle'
  | 'uploading'
  | 'ocr'
  | 'tamper'
  | 'validation'
  | 'decision'
  | 'complete';

export type Toast = {
  id: number;
  kind: 'success' | 'error' | 'info';
  message: string;
};
