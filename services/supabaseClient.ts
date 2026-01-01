
import { createClient } from '@supabase/supabase-js';

// Use standard process.env which is injected by Vite as per config
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

if (!supabaseUrl) {
  console.error("Supabase URL is missing");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
