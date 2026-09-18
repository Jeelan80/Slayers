import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rodczqujbkduouvsynze.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvZGN6cXVqYmtkdW91dnN5bnplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NjExMTksImV4cCI6MjEwNTIzNzExOX0.tgORfnJQ0ms5CqVv5tuvJrMrfSlBvCD0DpzD3Zckzps';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
