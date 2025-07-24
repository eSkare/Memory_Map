// js/supabaseClient.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://szcotkwupwrbawgprkbk.supabase.co'; // Replace with your Project URL
const SUPABASE_ANON_KEY = 'sb_publishable_ZQcsxoa1HmByAK0nBLT-iA_Bzs0xgwd'; // Replace with your anon key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);