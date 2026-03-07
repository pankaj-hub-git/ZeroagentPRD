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

// Startup connectivity check — logs to console for debugging
(async () => {
  const schemas = ['public', 'bronze', 'gold'] as const;
  const tests: Record<string, string> = {
    public: 'bronze_government_catalysts',
    bronze: 'dld_transactions',
    gold: 'phase_registry',
  };
  for (const schema of schemas) {
    const table = tests[schema];
    const query = schema === 'public'
      ? sb.from(table).select('*', { count: 'exact', head: true })
      : sb.schema(schema).from(table).select('*', { count: 'exact', head: true });
    const { count, error } = await query;
    if (error) {
      console.error(`[Supabase] ${schema}.${table} FAILED:`, error.message);
    } else {
      console.log(`[Supabase] ${schema}.${table} OK — ${count} rows`);
    }
  }
})();
