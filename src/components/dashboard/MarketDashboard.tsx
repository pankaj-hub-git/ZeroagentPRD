import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, PieChart, Pie,
} from 'recharts';
import { useTheme, ThemeColors } from '@/lib/theme';

// ═══ Theme helper — maps ThemeColors to internal short names ═══
function mkC(colors: ThemeColors) {
  return {
    bg: colors.bg, sf: colors.surface, bd: colors.border, tx: colors.text,
    mt: colors.textSecondary, dm: colors.textDim, gd: colors.gold, gdD: colors.gold,
    gdB: colors.goldBg, up: colors.green, upB: colors.greenBg,
    dn: colors.red, dnB: colors.redBg, id: colors.indigo,
    idB: colors.indigoBg, am: colors.orange,
  };
}

// ═══ Hardcoded Fallback Data ═══
const FB_MKT: R[] = [
  { metric_month: '2023-01', total_sales: 9456, total_sales_value: 25400000000, avg_price_per_sqm: 1285, offplan_sales: 5400, ready_sales: 4056, apartment_sales: 7200, villa_sales: 2256, studio_sales: 980, one_br_sales: 2400, two_br_sales: 2800, three_br_sales: 1200, four_plus_br_sales: 620, offplan_ratio_pct: 57.1, mortgage_ratio_pct: 42.3, implied_gross_yield_pct: 6.8, sales_mom_pct: -5.2, sales_yoy_pct: 12.4, price_psm_yoy_pct: 8.1, value_yoy_pct: 15.2, total_rental_contracts: 28500, new_rental_contracts: 15200, renewed_contracts: 13300, avg_annual_rent: 72000, renewal_rate_pct: 46.7 },
  { metric_month: '2023-06', total_sales: 11200, total_sales_value: 32100000000, avg_price_per_sqm: 1395, offplan_sales: 6800, ready_sales: 4400, apartment_sales: 8500, villa_sales: 2700, studio_sales: 1100, one_br_sales: 2800, two_br_sales: 3100, three_br_sales: 1350, four_plus_br_sales: 700, offplan_ratio_pct: 60.7, mortgage_ratio_pct: 44.1, implied_gross_yield_pct: 6.5, sales_mom_pct: 3.4, sales_yoy_pct: 20.1, price_psm_yoy_pct: 12.3, value_yoy_pct: 22.5, total_rental_contracts: 31200, new_rental_contracts: 16800, renewed_contracts: 14400, avg_annual_rent: 78000, renewal_rate_pct: 46.2 },
  { metric_month: '2023-12', total_sales: 12850, total_sales_value: 38500000000, avg_price_per_sqm: 1520, offplan_sales: 7900, ready_sales: 4950, apartment_sales: 9800, villa_sales: 3050, studio_sales: 1200, one_br_sales: 3100, two_br_sales: 3400, three_br_sales: 1500, four_plus_br_sales: 780, offplan_ratio_pct: 61.5, mortgage_ratio_pct: 45.2, implied_gross_yield_pct: 6.2, sales_mom_pct: 4.8, sales_yoy_pct: 25.3, price_psm_yoy_pct: 15.6, value_yoy_pct: 28.1, total_rental_contracts: 34500, new_rental_contracts: 18200, renewed_contracts: 16300, avg_annual_rent: 85000, renewal_rate_pct: 47.2 },
  { metric_month: '2024-06', total_sales: 13500, total_sales_value: 42000000000, avg_price_per_sqm: 1650, offplan_sales: 8400, ready_sales: 5100, apartment_sales: 10300, villa_sales: 3200, studio_sales: 1300, one_br_sales: 3300, two_br_sales: 3600, three_br_sales: 1600, four_plus_br_sales: 850, offplan_ratio_pct: 62.2, mortgage_ratio_pct: 46.8, implied_gross_yield_pct: 5.9, sales_mom_pct: 1.2, sales_yoy_pct: 20.5, price_psm_yoy_pct: 18.3, value_yoy_pct: 30.8, total_rental_contracts: 36800, new_rental_contracts: 19500, renewed_contracts: 17300, avg_annual_rent: 92000, renewal_rate_pct: 47.0 },
  { metric_month: '2024-12', total_sales: 14432, total_sales_value: 49100000000, avg_price_per_sqm: 1756, offplan_sales: 9200, ready_sales: 5232, apartment_sales: 11020, villa_sales: 3412, studio_sales: 1400, one_br_sales: 3500, two_br_sales: 3800, three_br_sales: 1700, four_plus_br_sales: 920, offplan_ratio_pct: 63.7, mortgage_ratio_pct: 47.5, implied_gross_yield_pct: 5.7, sales_mom_pct: 5.1, sales_yoy_pct: 22.1, price_psm_yoy_pct: 7.8, value_yoy_pct: 27.5, total_rental_contracts: 39200, new_rental_contracts: 20800, renewed_contracts: 18400, avg_annual_rent: 98000, renewal_rate_pct: 46.9 },
  { metric_month: '2025-01', total_sales: 13249, total_sales_value: 42800000000, avg_price_per_sqm: 1782, offplan_sales: 8412, ready_sales: 4837, apartment_sales: 10150, villa_sales: 3099, studio_sales: 1350, one_br_sales: 3400, two_br_sales: 3700, three_br_sales: 1650, four_plus_br_sales: 880, offplan_ratio_pct: 63.5, mortgage_ratio_pct: 48.1, implied_gross_yield_pct: 5.6, sales_mom_pct: -8.2, sales_yoy_pct: 18.4, price_psm_yoy_pct: 6.1, value_yoy_pct: 18.9, total_rental_contracts: 37500, new_rental_contracts: 19800, renewed_contracts: 17700, avg_annual_rent: 99500, renewal_rate_pct: 47.2 },
];
const FB_QOQ: R[] = [
  { quarter: '2024-Q1', sales_qoq_pct: 5.2, price_qoq_pct: 3.1, months_in_quarter: 3 },
  { quarter: '2024-Q2', sales_qoq_pct: -2.1, price_qoq_pct: 2.8, months_in_quarter: 3 },
  { quarter: '2024-Q3', sales_qoq_pct: 4.5, price_qoq_pct: 1.9, months_in_quarter: 3 },
  { quarter: '2024-Q4', sales_qoq_pct: 7.8, price_qoq_pct: 2.2, months_in_quarter: 3 },
];
const FB_COMM: R[] = [
  { metric_month: '2025-01', area_name: 'Business Bay', common_name: 'Business Bay', total_sales: 1250, avg_price_per_sqm: 2150, price_psm_mom_pct: 1.2, price_psm_yoy_pct: 12.5, implied_gross_yield_pct: 5.8 },
  { metric_month: '2025-01', area_name: 'Dubai Marina', common_name: 'Dubai Marina', total_sales: 980, avg_price_per_sqm: 2350, price_psm_mom_pct: 0.8, price_psm_yoy_pct: 8.3, implied_gross_yield_pct: 5.5 },
  { metric_month: '2025-01', area_name: 'JVC', common_name: 'Jumeirah Village Circle', total_sales: 1800, avg_price_per_sqm: 1050, price_psm_mom_pct: 2.1, price_psm_yoy_pct: 18.2, implied_gross_yield_pct: 7.8 },
  { metric_month: '2025-01', area_name: 'Dubai Hills', common_name: 'Dubai Hills Estate', total_sales: 720, avg_price_per_sqm: 1890, price_psm_mom_pct: 1.5, price_psm_yoy_pct: 14.7, implied_gross_yield_pct: 5.2 },
  { metric_month: '2025-01', area_name: 'Downtown', common_name: 'Downtown Dubai', total_sales: 650, avg_price_per_sqm: 3200, price_psm_mom_pct: 0.5, price_psm_yoy_pct: 5.1, implied_gross_yield_pct: 4.8 },
];
const FB_DEV: R[] = [
  { metric_month: '2025-01', developer_name: 'EMAAR', market_share_volume_pct: 18.5, market_share_value_pct: 24.2, total_sales: 2450, avg_price_per_sqm: 2850, offplan_sales: 1800 },
  { metric_month: '2025-01', developer_name: 'DAMAC', market_share_volume_pct: 12.3, market_share_value_pct: 10.8, total_sales: 1630, avg_price_per_sqm: 1650, offplan_sales: 1200 },
  { metric_month: '2025-01', developer_name: 'NAKHEEL', market_share_volume_pct: 8.1, market_share_value_pct: 11.5, total_sales: 1070, avg_price_per_sqm: 2200, offplan_sales: 450 },
  { metric_month: '2025-01', developer_name: 'MERAAS', market_share_volume_pct: 5.2, market_share_value_pct: 8.1, total_sales: 690, avg_price_per_sqm: 3100, offplan_sales: 520 },
  { metric_month: '2025-01', developer_name: 'SOBHA', market_share_volume_pct: 4.8, market_share_value_pct: 6.5, total_sales: 635, avg_price_per_sqm: 2450, offplan_sales: 580 },
];
const FB_RBR: R[] = [
  { metric_month: '2025-01', bedroom_category: 'Studio', implied_yield_pct: 7.8 },
  { metric_month: '2025-01', bedroom_category: '1 B/R', implied_yield_pct: 6.5 },
  { metric_month: '2025-01', bedroom_category: '2 B/R', implied_yield_pct: 5.9 },
  { metric_month: '2025-01', bedroom_category: '3 B/R', implied_yield_pct: 5.2 },
  { metric_month: '2025-01', bedroom_category: '4 B/R', implied_yield_pct: 4.6 },
];
const FB_RCA: R[] = [
  { quarter: '2024-Q4', area_name: 'Business Bay', total_contracts: 3200, renewal_pct: 48.5, multi_year_pct: 12.3, project_count: 85, commitment_profile: 'ABSORBING' },
  { quarter: '2024-Q4', area_name: 'Dubai Marina', total_contracts: 2800, renewal_pct: 62.1, multi_year_pct: 18.5, project_count: 62, commitment_profile: 'STICKY' },
  { quarter: '2024-Q4', area_name: 'JVC', total_contracts: 4500, renewal_pct: 35.2, multi_year_pct: 8.1, project_count: 120, commitment_profile: 'TRANSIENT' },
  { quarter: '2024-Q4', area_name: 'Downtown', total_contracts: 1800, renewal_pct: 55.8, multi_year_pct: 22.1, project_count: 45, commitment_profile: 'STICKY' },
];
const FB_RCP: R[] = [
  { quarter: '2024-Q4', project_name: 'Damac Hills Phase 3', area_name: 'Dubailand', total_contracts: 180, renewal_pct: 18.5, commitment_profile: 'TRANSIENT' },
  { quarter: '2024-Q4', project_name: 'JVC District 11', area_name: 'JVC', total_contracts: 250, renewal_pct: 22.1, commitment_profile: 'TRANSIENT' },
  { quarter: '2024-Q4', project_name: 'Marina Gate', area_name: 'Dubai Marina', total_contracts: 310, renewal_pct: 72.3, commitment_profile: 'STICKY' },
  { quarter: '2024-Q4', project_name: 'Downtown Views', area_name: 'Downtown', total_contracts: 280, renewal_pct: 68.5, commitment_profile: 'STICKY' },
];
const FB_SUP: R[] = [
  { metric_month: '2025-01', total_units_pipeline: 125000 },
];
const fmt = (n: number | null | undefined) => {
  if (n == null) return '—';
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return Number(n).toFixed(0);
};
const ml = (d: string) => typeof d === 'string' ? d.slice(2, 7) : '';

function mkTp(C: ReturnType<typeof mkC>) {
  return {
    contentStyle: { background: C.sf, border: `1px solid ${C.bd}`, borderRadius: 6, fontSize: 10, color: C.tx },
    itemStyle: { color: C.tx, fontSize: 10 },
    labelStyle: { color: C.mt, fontSize: 9 },
  };
}
function mkPC(C: ReturnType<typeof mkC>) {
  return [C.gd, C.id, C.up, '#EC4899', C.am, C.dn, '#8B5CF6', '#06B6D4', '#F97316', '#555'];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>;

function Dl({ v, C }: { v: number | null | undefined; C: ReturnType<typeof mkC> }) {
  if (v == null) return <span style={{ color: C.mt }}>—</span>;
  const c = v > 0 ? C.up : v < 0 ? C.dn : C.mt;
  return (
    <span style={{ color: c, fontWeight: 600, fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>
      {v > 0 ? '+' : ''}{Number(v).toFixed(1)}%
    </span>
  );
}

function KPI({ l, v, d, s, ac, C }: { l: string; v: string; d?: number | null; s?: string; ac?: string; C: ReturnType<typeof mkC> }) {
  return (
    <div style={{ background: C.sf, border: `1px solid ${C.bd}`, borderRadius: 8, padding: '12px 14px', flex: 1, minWidth: 130, position: 'relative' }}>
      {ac && <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: ac, borderRadius: '8px 0 0 8px' }} />}
      <div style={{ color: C.mt, fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.4, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 4 }}>{l}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: ac || C.tx, fontFamily: "'Instrument Serif', serif", lineHeight: 1 }}>{v}</div>
      {d != null && <div style={{ marginTop: 4 }}><Dl C={C} v={d} />{s && <span style={{ color: C.dm, fontSize: 10 }}> {s}</span>}</div>}
    </div>
  );
}

function Cd({ t, sub, right, children, C }: { t: string; sub?: string; right?: React.ReactNode; children: React.ReactNode; C: ReturnType<typeof mkC> }) {
  return (
    <div style={{ background: C.sf, border: `1px solid ${C.bd}`, borderRadius: 8, padding: '14px 16px', marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.tx, fontFamily: "'Instrument Serif', serif" }}>{t}</div>
          {sub && <div style={{ fontSize: 9, color: C.dm, marginTop: 1, fontFamily: "'IBM Plex Mono', monospace" }}>{sub}</div>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Sel({ opts, val, set, C }: { opts: string[]; val: string; set: (v: string) => void; C: ReturnType<typeof mkC> }) {
  return (
    <select value={val} onChange={e => set(e.target.value)}
      style={{ background: C.sf, color: C.tx, border: `1px solid ${C.bd}`, borderRadius: 4, padding: '3px 8px', fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", cursor: 'pointer' }}>
      {opts.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pieLabel = ({ name, percent }: any) => (percent || 0) > 0.035 ? `${name || ''} ${((percent || 0) * 100).toFixed(0)}%` : '';
const TABS = ['Overview', 'Sales & Supply', 'Rental & Yield', 'Communities', 'Structure', 'Developers'];

// Fetch with ordering via raw REST (gold schema)
async function fetchGold(table: string, orderParams: string): Promise<R[]> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  const r = await fetch(`${url}/rest/v1/${table}?${orderParams}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Accept-Profile': 'gold' },
  });
  if (!r.ok) {
    console.warn(`[Dashboard] ${table}: ${r.status}`);
    return [];
  }
  return r.json();
}

export function MarketDashboard() {
  const { colors } = useTheme();
  const C = mkC(colors);
  const tp = mkTp(C);
  const PC = mkPC(C);
  const [tab, setTab] = useState(0);
  const [ld, setLd] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  const [mkt, setMkt] = useState<R[]>([]);
  const [qoq, setQoq] = useState<R[]>([]);
  const [comm, setComm] = useState<R[]>([]);
  const [dev, setDev] = useState<R[]>([]);
  const [rBR, setRBR] = useState<R[]>([]);
  const [rCA, setRCA] = useState<R[]>([]);
  const [rCP, setRCP] = useState<R[]>([]);
  const [sup, setSup] = useState<R[]>([]);

  const [selM, setSelM] = useState('');
  const [selQ, setSelQ] = useState('');

  const load = useCallback(async () => {
    setLd(true);
    setErr(null);
    try {
      const [m, q, c, d, rb, ca, cp, s] = await Promise.all([
        fetchGold('dashboard_market_monthly', 'order=metric_month.asc'),
        fetchGold('dashboard_qoq', 'order=quarter.asc'),
        fetchGold('dashboard_community_monthly', 'order=metric_month.desc,price_psm_yoy_pct.desc.nullslast&limit=600'),
        fetchGold('dashboard_developer_monthly', 'order=metric_month.desc,market_share_volume_pct.desc.nullslast&limit=400'),
        fetchGold('dashboard_rental_bedroom_monthly', 'order=metric_month.desc&limit=300'),
        fetchGold('dashboard_rental_commitment_area', 'order=quarter.desc,total_contracts.desc.nullslast&limit=500'),
        fetchGold('dashboard_rental_commitment', 'order=quarter.desc,total_contracts.desc.nullslast&limit=800'),
        fetchGold('dashboard_supply_monthly', 'order=metric_month.desc&limit=60'),
      ]);
      // Use fallback data when API returns empty
      const fm = m.length ? m : FB_MKT;
      const fq = q.length ? q : FB_QOQ;
      const fc = c.length ? c : FB_COMM;
      const fd = d.length ? d : FB_DEV;
      const frb = rb.length ? rb : FB_RBR;
      const fca = ca.length ? ca : FB_RCA;
      const fcp = cp.length ? cp : FB_RCP;
      const fs = s.length ? s : FB_SUP;
      const isFallback = !m.length && !q.length;
      setUsingFallback(isFallback);
      setMkt(fm); setQoq(fq); setComm(fc); setDev(fd); setRBR(frb); setRCA(fca); setRCP(fcp); setSup(fs);
      if (fm.length) setSelM(fm[fm.length - 1].metric_month);
      const qs = [...new Set(fca.map((r: R) => r.quarter))].sort() as string[];
      if (qs.length) setSelQ(qs[qs.length - 1]);
    } catch (e) {
      // On total failure, use fallback data
      setUsingFallback(true);
      setMkt(FB_MKT); setQoq(FB_QOQ); setComm(FB_COMM); setDev(FB_DEV);
      setRBR(FB_RBR); setRCA(FB_RCA); setRCP(FB_RCP); setSup(FB_SUP);
      if (FB_MKT.length) setSelM(FB_MKT[FB_MKT.length - 1].metric_month);
      const qs = [...new Set(FB_RCA.map((r: R) => r.quarter))].sort() as string[];
      if (qs.length) setSelQ(qs[qs.length - 1]);
      console.warn('[Dashboard] Using fallback data:', (e as Error).message);
    }
    setLd(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Derived
  const months = mkt.map(d => d.metric_month);
  const sel: R = mkt.find(d => d.metric_month === selM) || mkt[mkt.length - 1] || {};
  const completeQoQ = qoq.filter(d => d.months_in_quarter === 3 && d.sales_qoq_pct != null);

  // Bedroom distribution
  const brT = (sel.studio_sales || 0) + (sel.one_br_sales || 0) + (sel.two_br_sales || 0) + (sel.three_br_sales || 0) + (sel.four_plus_br_sales || 0);
  const brD = brT > 0 ? [
    { name: 'Studio', value: +(sel.studio_sales / brT * 100).toFixed(1), fill: C.id },
    { name: '1BR', value: +(sel.one_br_sales / brT * 100).toFixed(1), fill: C.gd },
    { name: '2BR', value: +(sel.two_br_sales / brT * 100).toFixed(1), fill: C.up },
    { name: '3BR', value: +(sel.three_br_sales / brT * 100).toFixed(1), fill: '#EC4899' },
    { name: '4BR+', value: +(sel.four_plus_br_sales / brT * 100).toFixed(1), fill: C.dn },
  ] : [];

  // Developer for selected month
  const devMonth = dev.filter(d => d.metric_month === selM).slice(0, 10);
  const devByVol = [...devMonth].sort((a, b) => (b.market_share_volume_pct || 0) - (a.market_share_volume_pct || 0));
  const devByVal = [...devMonth].sort((a, b) => (b.market_share_value_pct || 0) - (a.market_share_value_pct || 0));

  // Community rankings
  const commLatestMonth = comm.length > 0 ? comm[0].metric_month : null;
  const commRanked = comm.filter(d => d.metric_month === commLatestMonth && d.total_sales >= 10).slice(0, 15);

  // Rental yield by bedroom
  const yieldMonths = [...new Set(rBR.map(d => d.metric_month))].sort().slice(-3);
  const yieldBR = (() => {
    const byBR: Record<string, number[]> = {};
    rBR.filter(d => yieldMonths.includes(d.metric_month) && d.implied_yield_pct > 0).forEach(d => {
      if (!byBR[d.bedroom_category]) byBR[d.bedroom_category] = [];
      byBR[d.bedroom_category].push(Number(d.implied_yield_pct));
    });
    const order = ['Studio', '1 B/R', '2 B/R', '3 B/R', '4 B/R', '5+ B/R'];
    return Object.entries(byBR).map(([b, ys]) => ({ b, y: +(ys.reduce((a, c) => a + c, 0) / ys.length).toFixed(1) }))
      .sort((a, b) => order.indexOf(a.b) - order.indexOf(b.b));
  })();

  // Rental commitment by quarter
  const rcaQuarters = [...new Set(rCA.map(d => d.quarter))].sort() as string[];
  const rcaFiltered = rCA.filter(d => d.quarter === selQ && d.total_contracts >= 100).slice(0, 15);
  const rcpTransient = rCP.filter(d => d.quarter === selQ && d.commitment_profile === 'TRANSIENT').slice(0, 10);
  const rcpSticky = rCP.filter(d => d.quarter === selQ && d.commitment_profile === 'STICKY').slice(0, 10);

  // Supply
  const supLatest: R = sup.length > 0 ? sup[0] : {};

  const intv = Math.max(1, Math.floor(mkt.length / 15));
  const intv12 = Math.max(1, Math.floor(mkt.length / 12));
  const intv10 = Math.max(1, Math.floor(mkt.length / 10));

  if (ld) return <div style={{ padding: 40, textAlign: 'center', color: C.mt, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>Loading from gold tables...</div>;
  if (err && !mkt.length) return <div style={{ padding: 40, textAlign: 'center', color: C.dn, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>Error: {err}</div>;
  if (!mkt.length) return <div style={{ padding: 40, textAlign: 'center', color: C.mt, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>No data available.</div>;

  return (
    <div>
      {usingFallback && (
        <div style={{ padding: '6px 12px', marginBottom: 10, background: C.gdB, border: `1px solid ${C.gd}33`, borderRadius: 4, fontSize: 10, color: C.mt, fontFamily: "'IBM Plex Mono', monospace" }}>
          Showing sample data — gold tables will load when available
        </div>
      )}
      {/* Sub-tab bar */}
      <div style={{ display: 'flex', gap: 0, overflowX: 'auto', marginBottom: 14, borderBottom: `1px solid ${C.bd}` }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{
            padding: '5px 11px', background: 'none', border: 'none',
            borderBottom: `2px solid ${tab === i ? C.gd : 'transparent'}`,
            color: tab === i ? C.tx : C.mt, cursor: 'pointer', fontSize: 10, fontWeight: 500,
            fontFamily: "'IBM Plex Sans', sans-serif", whiteSpace: 'nowrap',
          }}>{t}</button>
        ))}
      </div>

      {/* ═══ TAB 0: OVERVIEW ═══ */}
      {tab === 0 && (<>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: C.mt, fontFamily: "'IBM Plex Mono', monospace" }}>Monthly snapshot</span>
          <Sel C={C} opts={months} val={selM} set={setSelM} />
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 12 }}>
          <KPI C={C} l="Avg Price/Sqft" v={`AED ${fmt(sel.avg_price_per_sqm)}`} d={sel.price_psm_yoy_pct} s="YoY" ac={C.gd} />
          <KPI C={C} l="Sales" v={fmt(sel.total_sales)} d={sel.sales_mom_pct} s="MoM" />
          <KPI C={C} l="Value" v={`AED ${fmt(sel.total_sales_value)}`} d={sel.value_yoy_pct} s="YoY" />
          <KPI C={C} l="Yield" v={`${sel.implied_gross_yield_pct || '—'}%`} />
          <KPI C={C} l="Off-Plan" v={`${sel.offplan_ratio_pct || '—'}%`} ac={C.id} />
          <KPI C={C} l="Mortgage" v={`${sel.mortgage_ratio_pct || '—'}%`} />
        </div>
        <Cd C={C} t="Monthly Sales Volume & Value">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={mkt}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.bd} />
              <XAxis dataKey="metric_month" tick={{ fill: C.dm, fontSize: 7 }} tickFormatter={ml} interval={intv} />
              <YAxis yAxisId="l" tick={{ fill: C.dm, fontSize: 9 }} tickFormatter={fmt} />
              <YAxis yAxisId="r" orientation="right" tick={{ fill: C.dm, fontSize: 9 }} tickFormatter={v => fmt(v)} />
              <Tooltip {...tp} />
              <Bar yAxisId="l" dataKey="total_sales" fill={C.gd} opacity={0.5} radius={[1, 1, 0, 0]} name="Sales" />
              <Line yAxisId="r" dataKey="total_sales_value" stroke={C.id} strokeWidth={2} dot={false} name="Value (AED)" />
              <Legend wrapperStyle={{ fontSize: 9, color: C.mt }} />
            </ComposedChart>
          </ResponsiveContainer>
        </Cd>
        <Cd C={C} t="Price Per Sqft Trend">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={mkt}>
              <defs><linearGradient id="gP" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.gd} stopOpacity={0.2} /><stop offset="100%" stopColor={C.gd} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.bd} />
              <XAxis dataKey="metric_month" tick={{ fill: C.dm, fontSize: 7 }} tickFormatter={ml} interval={intv} />
              <YAxis tick={{ fill: C.dm, fontSize: 9 }} tickFormatter={fmt} />
              <Tooltip {...tp} />
              <Area dataKey="avg_price_per_sqm" stroke={C.gd} fill="url(#gP)" strokeWidth={2} name="Avg PSF" />
            </AreaChart>
          </ResponsiveContainer>
        </Cd>
        <Cd C={C} t="Quarterly Performance — Precomputed" sub="Complete quarters only, incomplete excluded">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={completeQoQ}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.bd} />
              <XAxis dataKey="quarter" tick={{ fill: C.dm, fontSize: 8 }} />
              <YAxis tick={{ fill: C.dm, fontSize: 9 }} tickFormatter={v => `${v}%`} />
              <Tooltip {...tp} />
              <Bar dataKey="sales_qoq_pct" name="Sales QoQ%">
                {completeQoQ.map((d, i) => <Cell key={i} fill={Number(d.sales_qoq_pct) >= 0 ? C.up : C.dn} opacity={0.7} />)}
              </Bar>
              <Bar dataKey="price_qoq_pct" fill={C.id} opacity={0.6} name="Price QoQ%" radius={[2, 2, 0, 0]} />
              <Legend wrapperStyle={{ fontSize: 9, color: C.mt }} />
            </BarChart>
          </ResponsiveContainer>
        </Cd>
      </>)}

      {/* ═══ TAB 1: SALES & SUPPLY ═══ */}
      {tab === 1 && (<>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: C.mt, fontFamily: "'IBM Plex Mono', monospace" }}>Sales activity</span>
          <Sel C={C} opts={months} val={selM} set={setSelM} />
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 12 }}>
          <KPI C={C} l="Sales" v={fmt(sel.total_sales)} d={sel.sales_mom_pct} s="MoM" />
          <KPI C={C} l="Off-Plan" v={`${sel.offplan_ratio_pct || '—'}%`} ac={C.id} />
          <KPI C={C} l="Pipeline Units" v={fmt(supLatest.total_units_pipeline)} ac={C.am} />
        </div>
        <Cd C={C} t="Ready vs Off-Plan">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={mkt}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.bd} />
              <XAxis dataKey="metric_month" tick={{ fill: C.dm, fontSize: 7 }} tickFormatter={ml} interval={intv} />
              <YAxis tick={{ fill: C.dm, fontSize: 9 }} tickFormatter={fmt} />
              <Tooltip {...tp} />
              <Bar dataKey="ready_sales" stackId="a" fill={C.up} name="Ready" />
              <Bar dataKey="offplan_sales" stackId="a" fill={C.id} name="Off-Plan" radius={[1, 1, 0, 0]} />
              <Legend wrapperStyle={{ fontSize: 9, color: C.mt }} />
            </BarChart>
          </ResponsiveContainer>
        </Cd>
        <Cd C={C} t="Apartments vs Villas">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={mkt}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.bd} />
              <XAxis dataKey="metric_month" tick={{ fill: C.dm, fontSize: 7 }} tickFormatter={ml} interval={intv} />
              <YAxis tick={{ fill: C.dm, fontSize: 9 }} tickFormatter={fmt} />
              <Tooltip {...tp} />
              <Bar dataKey="apartment_sales" fill={C.up} name="Apartments" radius={[1, 1, 0, 0]} />
              <Bar dataKey="villa_sales" fill={C.gd} name="Villas" radius={[1, 1, 0, 0]} />
              <Legend wrapperStyle={{ fontSize: 9, color: C.mt }} />
            </BarChart>
          </ResponsiveContainer>
        </Cd>
        <Cd C={C} t="Year-over-Year Sales Growth">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={mkt}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.bd} />
              <XAxis dataKey="metric_month" tick={{ fill: C.dm, fontSize: 7 }} tickFormatter={ml} interval={intv} />
              <YAxis tick={{ fill: C.dm, fontSize: 9 }} tickFormatter={v => `${v}%`} />
              <Tooltip {...tp} />
              <Bar dataKey="sales_yoy_pct" name="YoY%" radius={[1, 1, 0, 0]}>
                {mkt.map((d, i) => <Cell key={i} fill={(d.sales_yoy_pct || 0) >= 0 ? C.up : C.dn} opacity={0.7} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Cd>
      </>)}

      {/* ═══ TAB 2: RENTAL & YIELD ═══ */}
      {tab === 2 && (<>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: C.mt, fontFamily: "'IBM Plex Mono', monospace" }}>Rental market</span>
          <Sel C={C} opts={months} val={selM} set={setSelM} />
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 12 }}>
          <KPI C={C} l="Avg Rent" v={`AED ${fmt(sel.avg_annual_rent)}`} />
          <KPI C={C} l="Contracts" v={fmt(sel.total_rental_contracts)} />
          <KPI C={C} l="Renewal %" v={`${sel.renewal_rate_pct || '—'}%`} />
          <KPI C={C} l="Yield" v={`${sel.implied_gross_yield_pct || '—'}%`} ac={C.gd} />
        </div>
        <Cd C={C} t="Monthly Rental Contracts">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={mkt}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.bd} />
              <XAxis dataKey="metric_month" tick={{ fill: C.dm, fontSize: 7 }} tickFormatter={ml} interval={intv} />
              <YAxis tick={{ fill: C.dm, fontSize: 9 }} tickFormatter={fmt} />
              <Tooltip {...tp} />
              <Bar dataKey="new_rental_contracts" stackId="r" fill={C.up} name="New" />
              <Bar dataKey="renewed_contracts" stackId="r" fill={C.id} name="Renewed" radius={[1, 1, 0, 0]} />
              <Legend wrapperStyle={{ fontSize: 9, color: C.mt }} />
            </BarChart>
          </ResponsiveContainer>
        </Cd>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Cd C={C} t="Yield by Bedrooms" sub="3-month rolling average">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={yieldBR}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.bd} />
                <XAxis dataKey="b" tick={{ fill: C.dm, fontSize: 9, fontFamily: "'IBM Plex Sans', sans-serif" }} />
                <YAxis tick={{ fill: C.dm, fontSize: 9 }} domain={[0, 10]} tickFormatter={v => `${v}%`} />
                <Tooltip {...tp} />
                <Bar dataKey="y" radius={[3, 3, 0, 0]} name="Yield%">
                  {yieldBR.map((_, i) => <Cell key={i} fill={i === 0 ? C.gd : C.id} opacity={0.8} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Cd>
          <Cd C={C} t="Renewal Rate Trend">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={mkt}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.bd} />
                <XAxis dataKey="metric_month" tick={{ fill: C.dm, fontSize: 7 }} tickFormatter={ml} interval={intv12} />
                <YAxis tick={{ fill: C.dm, fontSize: 9 }} tickFormatter={v => `${v}%`} />
                <Tooltip {...tp} />
                <Line dataKey="renewal_rate_pct" stroke={C.id} strokeWidth={2} dot={false} name="Renewal%" connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </Cd>
        </div>
        <Cd C={C} t="Tenant Commitment by Area" sub="Renewal rate + multi-year commitment — quarterly"
          right={<Sel C={C} opts={rcaQuarters} val={selQ} set={setSelQ} />}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
              <thead><tr>
                {['Area', 'Contracts', 'Renewal %', 'Multi-Yr %', 'Projects', 'Profile'].map(h => (
                  <th key={h} style={{ textAlign: h === 'Area' || h === 'Profile' ? 'left' : 'right', padding: '6px 8px', borderBottom: `1px solid ${C.bd}`, color: C.dm, fontSize: 8, textTransform: 'uppercase', fontFamily: "'IBM Plex Sans', sans-serif" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{rcaFiltered.map((r, i) => (
                <tr key={i}>
                  <td style={{ padding: '6px 8px', fontFamily: "'IBM Plex Sans', sans-serif" }}>{r.area_name}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>{fmt(r.total_contracts)}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: Number(r.renewal_pct) >= 55 ? C.up : Number(r.renewal_pct) < 30 ? C.dn : C.am, fontWeight: 600 }}>{r.renewal_pct}%</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>{r.multi_year_pct}%</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>{r.project_count}</td>
                  <td style={{ padding: '6px 8px' }}>
                    <span style={{
                      padding: '1px 6px', borderRadius: 3, fontSize: 8, fontWeight: 600,
                      background: r.commitment_profile === 'STICKY' ? C.upB : r.commitment_profile === 'TRANSIENT' ? C.dnB : r.commitment_profile === 'ABSORBING' ? C.idB : C.gdB,
                      color: r.commitment_profile === 'STICKY' ? C.up : r.commitment_profile === 'TRANSIENT' ? C.dn : r.commitment_profile === 'ABSORBING' ? C.id : C.gd,
                    }}>{r.commitment_profile}</span>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Cd>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Cd C={C} t="Transient Projects" sub={`Renewal < 25% — ${selQ}`}>
            <div style={{ overflowX: 'auto', maxHeight: 200, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9, fontFamily: "'IBM Plex Mono', monospace" }}>
                <thead><tr>
                  {['Project', 'Area', 'Contracts', 'Renewal%'].map(h => (
                    <th key={h} style={{ textAlign: h === 'Project' || h === 'Area' ? 'left' : 'right', padding: '4px 6px', borderBottom: `1px solid ${C.bd}`, color: C.dm, fontSize: 8, fontFamily: "'IBM Plex Sans', sans-serif", position: 'sticky' as const, top: 0, background: C.sf }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>{rcpTransient.map((r, i) => (
                  <tr key={i}>
                    <td style={{ padding: '4px 6px', fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 9 }}>{r.project_name?.slice(0, 25)}</td>
                    <td style={{ padding: '4px 6px', fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 9, color: C.dm }}>{r.area_name?.slice(0, 20)}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right' }}>{r.total_contracts}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', color: C.dn, fontWeight: 600 }}>{r.renewal_pct}%</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </Cd>
          <Cd C={C} t="Sticky Projects" sub={`Renewal > 65% — ${selQ}`}>
            <div style={{ overflowX: 'auto', maxHeight: 200, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9, fontFamily: "'IBM Plex Mono', monospace" }}>
                <thead><tr>
                  {['Project', 'Area', 'Contracts', 'Renewal%'].map(h => (
                    <th key={h} style={{ textAlign: h === 'Project' || h === 'Area' ? 'left' : 'right', padding: '4px 6px', borderBottom: `1px solid ${C.bd}`, color: C.dm, fontSize: 8, fontFamily: "'IBM Plex Sans', sans-serif", position: 'sticky' as const, top: 0, background: C.sf }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>{rcpSticky.map((r, i) => (
                  <tr key={i}>
                    <td style={{ padding: '4px 6px', fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 9 }}>{r.project_name?.slice(0, 25)}</td>
                    <td style={{ padding: '4px 6px', fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 9, color: C.dm }}>{r.area_name?.slice(0, 20)}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right' }}>{r.total_contracts}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'right', color: C.up, fontWeight: 600 }}>{r.renewal_pct}%</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </Cd>
        </div>
      </>)}

      {/* ═══ TAB 3: COMMUNITIES ═══ */}
      {tab === 3 && (<>
        <Cd C={C} t={`Top Communities — Price Change${commLatestMonth ? ` (${ml(commLatestMonth)})` : ''}`} sub="Minimum 10 transactions, ranked by YoY price change">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
              <thead><tr>
                {['Community', 'Sales', 'Avg PSF', 'MoM', 'YoY', 'Yield'].map(h => (
                  <th key={h} style={{ textAlign: h === 'Community' ? 'left' : 'right', padding: '6px 8px', borderBottom: `1px solid ${C.bd}`, color: C.dm, fontSize: 8, textTransform: 'uppercase', fontFamily: "'IBM Plex Sans', sans-serif" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{commRanked.map((r, i) => (
                <tr key={i}>
                  <td style={{ padding: '6px 8px', fontFamily: "'IBM Plex Sans', sans-serif" }}>{r.common_name || r.area_name}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>{r.total_sales}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{fmt(r.avg_price_per_sqm)}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}><Dl C={C} v={r.price_psm_mom_pct} /></td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}><Dl C={C} v={r.price_psm_yoy_pct} /></td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>{r.implied_gross_yield_pct ? `${Number(r.implied_gross_yield_pct).toFixed(1)}%` : '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Cd>
        <Cd C={C} t="Price YoY vs Volume YoY" sub="Last 15 months">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={mkt.slice(-15)}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.bd} />
              <XAxis dataKey="metric_month" tick={{ fill: C.dm, fontSize: 7 }} tickFormatter={ml} />
              <YAxis tick={{ fill: C.dm, fontSize: 9 }} tickFormatter={v => `${v}%`} />
              <Tooltip {...tp} />
              <Line dataKey="price_psm_yoy_pct" stroke={C.gd} strokeWidth={2} dot={false} name="Price YoY" />
              <Line dataKey="sales_yoy_pct" stroke={C.id} strokeWidth={2} dot={false} name="Volume YoY" />
              <Legend wrapperStyle={{ fontSize: 9, color: C.mt }} />
            </LineChart>
          </ResponsiveContainer>
        </Cd>
      </>)}

      {/* ═══ TAB 4: STRUCTURE ═══ */}
      {tab === 4 && (<>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: C.mt, fontFamily: "'IBM Plex Mono', monospace" }}>Market structure</span>
          <Sel C={C} opts={months} val={selM} set={setSelM} />
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 12 }}>
          <KPI C={C} l="Mortgage" v={`${sel.mortgage_ratio_pct || '—'}%`} />
          <KPI C={C} l="Cash" v={sel.mortgage_ratio_pct ? `${(100 - Number(sel.mortgage_ratio_pct)).toFixed(1)}%` : '—'} />
          <KPI C={C} l="Off-Plan" v={`${sel.offplan_ratio_pct || '—'}%`} ac={C.id} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Cd C={C} t={`Bedroom Distribution — ${ml(selM)}`}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={brD} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={72} paddingAngle={2} strokeWidth={0} label={pieLabel} labelLine={false}>
                  {brD.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ background: C.sf, border: `1px solid ${C.bd}`, borderRadius: 6, fontSize: 10, color: C.tx }} formatter={(v: unknown) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
          </Cd>
          <Cd C={C} t="Bedroom Trend">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={mkt}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.bd} />
                <XAxis dataKey="metric_month" tick={{ fill: C.dm, fontSize: 7 }} tickFormatter={ml} interval={intv12} />
                <YAxis tick={{ fill: C.dm, fontSize: 9 }} tickFormatter={fmt} />
                <Tooltip {...tp} />
                <Bar dataKey="studio_sales" stackId="b" fill={C.id} name="Studio" />
                <Bar dataKey="one_br_sales" stackId="b" fill={C.gd} name="1BR" />
                <Bar dataKey="two_br_sales" stackId="b" fill={C.up} name="2BR" />
                <Bar dataKey="three_br_sales" stackId="b" fill="#EC4899" name="3BR" />
                <Bar dataKey="four_plus_br_sales" stackId="b" fill={C.dn} name="4BR+" />
                <Legend wrapperStyle={{ fontSize: 9, color: C.mt }} />
              </BarChart>
            </ResponsiveContainer>
          </Cd>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Cd C={C} t="Mortgage Ratio">
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={mkt}>
                <defs><linearGradient id="gM" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.am} stopOpacity={0.15} /><stop offset="100%" stopColor={C.am} stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.bd} />
                <XAxis dataKey="metric_month" tick={{ fill: C.dm, fontSize: 7 }} tickFormatter={ml} interval={intv10} />
                <YAxis tick={{ fill: C.dm, fontSize: 9 }} tickFormatter={v => `${v}%`} />
                <Tooltip {...tp} />
                <Area dataKey="mortgage_ratio_pct" stroke={C.am} fill="url(#gM)" strokeWidth={2} name="Mortgage%" />
              </AreaChart>
            </ResponsiveContainer>
          </Cd>
          <Cd C={C} t="Off-Plan Share">
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={mkt}>
                <defs><linearGradient id="gO" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.id} stopOpacity={0.2} /><stop offset="100%" stopColor={C.id} stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.bd} />
                <XAxis dataKey="metric_month" tick={{ fill: C.dm, fontSize: 7 }} tickFormatter={ml} interval={intv10} />
                <YAxis tick={{ fill: C.dm, fontSize: 9 }} tickFormatter={v => `${v}%`} />
                <Tooltip {...tp} />
                <Area dataKey="offplan_ratio_pct" stroke={C.id} fill="url(#gO)" strokeWidth={2} name="Off-Plan%" />
              </AreaChart>
            </ResponsiveContainer>
          </Cd>
        </div>
      </>)}

      {/* ═══ TAB 5: DEVELOPERS ═══ */}
      {tab === 5 && (<>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: C.mt, fontFamily: "'IBM Plex Mono', monospace" }}>Developer market share</span>
          <Sel C={C} opts={months} val={selM} set={setSelM} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <Cd C={C} t="Share by Volume (Transactions)">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={devByVol.map(d => ({ name: d.developer_name?.slice(0, 18), value: Number(d.market_share_volume_pct) || 0 }))} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={1} strokeWidth={0} label={pieLabel} labelLine={false}>
                  {devByVol.map((_, i) => <Cell key={i} fill={PC[i]} opacity={0.85} />)}
                </Pie>
                <Tooltip contentStyle={{ background: C.sf, border: `1px solid ${C.bd}`, borderRadius: 6, fontSize: 10, color: C.tx }} formatter={(v: unknown) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
          </Cd>
          <Cd C={C} t="Share by Value (AED)">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={devByVal.map(d => ({ name: d.developer_name?.slice(0, 18), value: Number(d.market_share_value_pct) || 0 }))} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={1} strokeWidth={0} label={pieLabel} labelLine={false}>
                  {devByVal.map((_, i) => <Cell key={i} fill={PC[i]} opacity={0.85} />)}
                </Pie>
                <Tooltip contentStyle={{ background: C.sf, border: `1px solid ${C.bd}`, borderRadius: 6, fontSize: 10, color: C.tx }} formatter={(v: unknown) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
          </Cd>
        </div>
        <Cd C={C} t="Developer Comparison" sub="Volume share vs value share — premium developers rank higher by value">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
              <thead><tr>
                {['Developer', 'Vol%', 'Val%', 'Sales', 'Avg PSF', 'Off-Plan'].map(h => (
                  <th key={h} style={{ textAlign: h === 'Developer' ? 'left' : 'right', padding: '6px 8px', borderBottom: `1px solid ${C.bd}`, color: C.dm, fontSize: 8, textTransform: 'uppercase', fontFamily: "'IBM Plex Sans', sans-serif" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{devByVol.map((r, i) => (
                <tr key={i}>
                  <td style={{ padding: '6px 8px', fontWeight: i < 3 ? 600 : 400, fontFamily: "'IBM Plex Sans', sans-serif", maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.developer_name}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Number(r.market_share_volume_pct || 0).toFixed(1)}%</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', color: C.gd, fontWeight: 600 }}>{Number(r.market_share_value_pct || 0).toFixed(1)}%</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>{r.total_sales?.toLocaleString()}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>{fmt(r.avg_price_per_sqm)}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>{r.offplan_sales || 0}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Cd>
      </>)}

      <div style={{ textAlign: 'center', padding: '18px 0 12px', color: C.dm, fontSize: 8, fontFamily: "'IBM Plex Mono', monospace" }}>
        Source: Dubai Land Department · Dubai REST (Ejari) · {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}
