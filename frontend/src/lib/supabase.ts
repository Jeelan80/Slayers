import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rodczqujbkduouvsynze.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_hnd2oxY1TeqdnGUAEZ-qzQ_PuBpmqQ5';

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface VeriForgeRegistration {
  id?: string;
  registration_id?: number;
  name: string;
  dob?: string;
  id_number?: string;
  institution?: string;
  id_type?: string;
  decision: 'APPROVE' | 'MANUAL_REVIEW' | 'REJECT';
  confidence: number;
  summary: string;
  reasons: string[];
  checks: Record<string, any>;
  extracted: Record<string, any>;
  status?: string;
  reviewer_notes?: string;
  created_at?: string;
}
