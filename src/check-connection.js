/**
 * ZeroAgent — Supabase Connection Check
 *
 * Verifies connectivity and read-access to all primary frontend tables
 * listed in PRD Section 2.1.
 *
 * Usage:
 *   VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... node src/check-connection.js
 *   — or —
 *   Copy .env.example → .env.local, fill in credentials, then:
 *   npm run check-connection
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Load env vars from .env.local (lightweight — no dotenv dependency needed)
// ---------------------------------------------------------------------------
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env.local');
try {
  const envFile = readFileSync(envPath, 'utf-8');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // .env.local not found — rely on env vars being set externally
}

// ---------------------------------------------------------------------------
// Initialise Supabase client
// ---------------------------------------------------------------------------
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error(
    '\n✗ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.\n' +
    '  Copy .env.example → .env.local and add your Supabase credentials.\n'
  );
  process.exit(1);
}

const sb = createClient(url, key);

// ---------------------------------------------------------------------------
// Tables to check (PRD Section 2.1)
// ---------------------------------------------------------------------------
const TABLES = [
  // schema.table,                expected_min_rows,  RLS status
  { table: 'xray_projects',                   schema: 'public',  minRows: 200,       rls: 'ON'  },
  { table: 'xray_unit_types',                  schema: 'public',  minRows: 200,       rls: 'ON'  },
  { table: 'xray_developer_scores',            schema: 'public',  minRows: 20,        rls: 'ON'  },
  { table: 'xray_service_charges',             schema: 'public',  minRows: 30,        rls: 'ON'  },
  { table: 'dld_transactions',                 schema: 'bronze',  minRows: 1_000_000, rls: 'ON'  },
  { table: 'masterplan_gee_queue',             schema: 'bronze',  minRows: 8_000,     rls: 'OFF' },
  { table: 'view_blocking_v3',                 schema: 'gold',    minRows: 5_000,     rls: 'OFF' },
  { table: 'sc_truth_layer',                   schema: 'gold',    minRows: 6_000,     rls: 'OFF' },
  { table: 'capital_rotation',                 schema: 'gold',    minRows: 500,       rls: 'OFF' },
  { table: 'capital_flow_summary',             schema: 'gold',    minRows: 100,       rls: 'OFF' },
  { table: 'rental_yield',                     schema: 'gold',    minRows: 150,       rls: 'OFF' },
  { table: 'livability_index',                 schema: 'gold',    minRows: 4_000,     rls: 'OFF' },
  { table: 'amenity_scores',                   schema: 'gold',    minRows: 4_000,     rls: 'OFF' },
  { table: 'phase_registry',                   schema: 'gold',    minRows: 2_000,     rls: 'OFF' },
  { table: 'phase_mismatch',                   schema: 'gold',    minRows: 2_500,     rls: 'OFF' },
  { table: 'truth_layer',                      schema: 'gold',    minRows: 90_000,    rls: 'OFF' },
  { table: 'developer_scores',                 schema: 'gold',    minRows: 20,        rls: 'OFF' },
  { table: 'rent_contracts_clean',             schema: 'bronze',  minRows: 3_000_000, rls: 'OFF' },
  { table: 'nationality_momentum',             schema: 'gold',    minRows: 1_500,     rls: 'OFF' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtNum(n) {
  return n.toLocaleString('en-US');
}

function pad(str, len) {
  return str.padEnd(len);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         ZEROAGENT — Supabase Connection Check              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`\n  URL : ${url}`);
  console.log(`  Key : ${key.slice(0, 12)}...${key.slice(-6)}\n`);

  // Step 1: Auth endpoint (basic connectivity)
  console.log('── Step 1: Auth Endpoint ──────────────────────────────────────');
  try {
    const { error } = await sb.auth.getSession();
    if (error) throw error;
    console.log('  ✓ Auth endpoint reachable\n');
  } catch (err) {
    console.error(`  ✗ Auth endpoint FAILED: ${err.message}\n`);
    console.error('  Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.\n');
    process.exit(1);
  }

  // Step 2: Table-by-table read access
  console.log('── Step 2: Table Access ───────────────────────────────────────');
  console.log(
    `  ${pad('Table', 40)} ${pad('Rows', 14)} ${pad('Expected', 14)} Status`
  );
  console.log('  ' + '─'.repeat(90));

  let passed = 0;
  let warned = 0;
  let failed = 0;
  const issues = [];

  for (const t of TABLES) {
    const qualifiedName = t.schema === 'public' ? t.table : `${t.schema}.${t.table}`;
    const display = pad(qualifiedName, 40);

    try {
      const { count, error } = await sb
        .from(qualifiedName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`  ${display} ${pad('—', 14)} ${pad(fmtNum(t.minRows) + '+', 14)} ✗ ${error.message}`);
        failed++;
        issues.push({
          table: qualifiedName,
          type: 'error',
          detail: error.message,
          rls: t.rls,
        });
        continue;
      }

      const rowStr = pad(fmtNum(count ?? 0), 14);
      const expectStr = pad(fmtNum(t.minRows) + '+', 14);

      if ((count ?? 0) >= t.minRows) {
        console.log(`  ${display} ${rowStr} ${expectStr} ✓`);
        passed++;
      } else if ((count ?? 0) > 0) {
        console.log(`  ${display} ${rowStr} ${expectStr} ⚠ below expected`);
        warned++;
        issues.push({ table: qualifiedName, type: 'warn', detail: `${count} rows (expected ${t.minRows}+)` });
      } else {
        console.log(`  ${display} ${rowStr} ${expectStr} ✗ empty`);
        failed++;
        issues.push({
          table: qualifiedName,
          type: 'error',
          detail: 'Table returned 0 rows',
          rls: t.rls,
        });
      }
    } catch (err) {
      console.log(`  ${display} ${pad('—', 14)} ${pad(fmtNum(t.minRows) + '+', 14)} ✗ ${err.message}`);
      failed++;
      issues.push({ table: qualifiedName, type: 'error', detail: err.message, rls: t.rls });
    }
  }

  // Step 3: Summary
  console.log('\n── Summary ───────────────────────────────────────────────────');
  console.log(`  ✓ Passed : ${passed}/${TABLES.length}`);
  if (warned) console.log(`  ⚠ Warned : ${warned}/${TABLES.length}`);
  if (failed) console.log(`  ✗ Failed : ${failed}/${TABLES.length}`);

  // Step 4: RLS guidance for failures
  const rlsIssues = issues.filter(i => i.type === 'error' && i.rls === 'OFF');
  if (rlsIssues.length > 0) {
    console.log('\n── RLS Policy Required ───────────────────────────────────────');
    console.log('  The following tables have RLS OFF and need anon-read policies');
    console.log('  (PRD Section 11 / 13.1). Run in Supabase SQL Editor:\n');
    for (const i of rlsIssues) {
      console.log(`    ALTER TABLE ${i.table} ENABLE ROW LEVEL SECURITY;`);
      console.log(`    CREATE POLICY anon_read ON ${i.table} FOR SELECT TO anon USING (true);\n`);
    }
  }

  console.log('\n══════════════════════════════════════════════════════════════');
  if (failed === 0) {
    console.log('  ✓ All tables accessible. Ready to build.');
  } else {
    console.log(`  ⚠ ${failed} table(s) need attention before frontend queries work.`);
  }
  console.log('══════════════════════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

main();
