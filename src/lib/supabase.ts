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

// Startup connectivity check — deferred to avoid competing with page RPCs
setTimeout(() => {
  (async () => {
    const checks = [
      { schema: 'public', table: 'bronze_government_catalysts', fn: () => sb.from('bronze_government_catalysts').select('*', { count: 'exact', head: true }) },
      { schema: 'public', table: 'navigation_hierarchy', fn: () => sb.from('navigation_hierarchy').select('*', { count: 'exact', head: true }) },
      { schema: 'bronze', table: 'dld_transactions', fn: () => bronze().from('dld_transactions').select('*', { count: 'exact', head: true }) },
      { schema: 'bronze', table: 'policy_events', fn: () => bronze().from('policy_events').select('*', { count: 'exact', head: true }) },
      { schema: 'silver', table: 'price_timeseries', fn: () => silver().from('price_timeseries').select('*', { count: 'exact', head: true }) },
      { schema: 'gold', table: 'phase_registry', fn: () => gold().from('phase_registry').select('*', { count: 'exact', head: true }) },
      { schema: 'gold', table: 'developer_scores', fn: () => gold().from('developer_scores').select('*', { count: 'exact', head: true }) },
      { schema: 'gold', table: 'community_amenity_polygons', fn: () => gold().from('community_amenity_polygons').select('*', { count: 'exact', head: true }) },
      { schema: 'layers', table: 'communities', fn: () => layers().from('communities').select('*', { count: 'exact', head: true }) },
      // V3 tables
      { schema: 'public', table: 'xray_unit_registry', fn: () => sb.from('xray_unit_registry').select('*', { count: 'exact', head: true }) },
      { schema: 'public', table: 'xray_surroundings', fn: () => sb.from('xray_surroundings').select('*', { count: 'exact', head: true }) },
      { schema: 'public', table: 'xray_floor_pricing', fn: () => sb.from('xray_floor_pricing').select('*', { count: 'exact', head: true }) },
      { schema: 'public', table: 'xray_za_insights', fn: () => sb.from('xray_za_insights').select('*', { count: 'exact', head: true }) },
      { schema: 'public', table: 'xray_ejari_summary', fn: () => sb.from('xray_ejari_summary').select('*', { count: 'exact', head: true }) },
    ];
    for (const { schema, table, fn } of checks) {
      const { count, error } = await fn();
      if (error) {
        console.error(`[Supabase] ${schema}.${table} FAILED:`, error.message);
      } else {
        console.log(`[Supabase] ${schema}.${table} OK — ${count} rows`);
      }
    }
  })();
}, 5000); // Defer 5s so page RPCs load first
