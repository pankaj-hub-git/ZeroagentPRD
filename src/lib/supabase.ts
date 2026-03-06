import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    '[Supabase] Missing environment variables. VITE_SUPABASE_URL:',
    supabaseUrl ? 'SET' : 'MISSING',
    'VITE_SUPABASE_ANON_KEY:',
    supabaseKey ? 'SET' : 'MISSING'
  );
}

export const sb = createClient(supabaseUrl ?? '', supabaseKey ?? '');
