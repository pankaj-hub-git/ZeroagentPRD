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

// Schema helpers — use these for non-public schemas
export const gold = () => sb.schema('gold');
export const silver = () => sb.schema('silver');
export const bronze = () => sb.schema('bronze');
export const layers = () => sb.schema('layers');
// public schema: use sb.from() directly

// Startup connectivity check — logs to console for debugging
(async () => {
  const checks = [
    { schema: 'public', table: 'bronze_government_catalysts', query: sb.from('bronze_government_catalysts').select('*', { count: 'exact', head: true }) },
    { schema: 'public', table: 'navigation_hierarchy', query: sb.from('navigation_hierarchy').select('*', { count: 'exact', head: true }) },
    { schema: 'bronze', table: 'dld_transactions', query: bronze().from('dld_transactions').select('*', { count: 'exact', head: true }) },
    { schema: 'bronze', table: 'policy_events', query: bronze().from('policy_events').select('*', { count: 'exact', head: true }) },
    { schema: 'silver', table: 'price_timeseries', query: silver().from('price_timeseries').select('*', { count: 'exact', head: true }) },
    { schema: 'gold', table: 'phase_registry', query: gold().from('phase_registry').select('*', { count: 'exact', head: true }) },
    { schema: 'gold', table: 'developer_scores', query: gold().from('developer_scores').select('*', { count: 'exact', head: true }) },
    { schema: 'layers', table: 'communities', query: layers().from('communities').select('*', { count: 'exact', head: true }) },
  ];
  for (const { schema, table, query } of checks) {
    const { count, error } = await query;
    if (error) {
      console.error(`[Supabase] ${schema}.${table} FAILED:`, error.message);
    } else {
      console.log(`[Supabase] ${schema}.${table} OK — ${count} rows`);
    }
  }
})();
