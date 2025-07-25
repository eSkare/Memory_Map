// js/supabaseClient.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://szcotkwupwrbawgprkbk.supabase.co'; // Replace with your Project URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6Y290a3d1cHdyYmF3Z3Bya2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNTEyNDcsImV4cCI6MjA2ODkyNzI0N30.e-cQbi9lt803sGD-SUItopcE6WgmYcxLFgPsGFp32zI'; // Your correct anon key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ADD THIS NEW LOG LINE
console.log("[SUPABASE-CLIENT-DEBUG] Supabase client created:", supabase ? 'SUCCESS' : 'FAILURE', supabase);