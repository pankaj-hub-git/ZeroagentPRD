import { useEffect, useState, useMemo } from 'react';
import { useTheme } from '@/lib/theme';
import { gold } from '@/lib/supabase';
import {
  ComposedChart, BarChart, Bar, Line, Area, AreaChart, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, Cell, Legend,
} from 'recharts';
import {
  TrendingUp, AlertTriangle, Activity, Zap, DollarSign, ArrowUpRight,
  ArrowDownRight, ChevronDown, ChevronUp, RefreshCw, Loader2,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════ */

interface MomentumProject {
  project_name: string;
  momentum_score: number;
  phase: string;
  volume_score: number;
  price_momentum_score: number;
  capital_quality_score: number;
  flip_risk_score: number;
  txn_count: number;
  avg_psm: number;
  avg_psf: number;
  psf_change_yoy: number | null;
  ready_ratio_pct: number;
  mortgage_ratio_pct: number;
  flip_velocity: number;
  flip_count_3m: number;
  developer: string | null;
  project_status: string | null;
  project_category: string | null;
  total_units: number | null;
  building_type: string | null;
}

interface MonthlyTrend {
  metric_month: string;
  total_sales: number;
  total_value: number;
  avg_psm: number;
  avg_psf: number;
  ready_sales: number;
  offplan_sales: number;
  mortgage_count: number;
}

interface FlipTransaction {
  project_name: string;
  building_name: string | null;
  rooms: string | null;
  buy_date: string;
  sell_date: string;
  buy_price_m: number;
  sell_price_m: number;
  gain_pct: number;
  hold_days: number;
  flip_speed: string;
  capital_type: string;
}

interface FlipVelocity {
  project_name: string;
  metric_month: string;
  flip_count: number;
  avg_hold_days: number;
  avg_gain_pct: number;
  flash_flips: number;
  fast_flips: number;
  standard_flips: number;
  speculative_pct: number;
  flip_velocity: number;
  total_flip_volume_aed: number;
}

/* ═══════════════════════════════════════════════════════════════════
   CONSTANTS & HELPERS
   ═══════════════════════════════════════════════════════════════════ */

type R = Record<string, any>;

const PHASE_CONFIG: Record<string, { bg: string; text: string }> = {
  OVERHEATING:  { bg: 'rgba(239,68,68,0.15)',  text: '#ef4444' },
  ACCELERATION: { bg: 'rgba(34,197,94,0.15)',   text: '#22c55e' },
  PEAK:         { bg: 'rgba(234,179,8,0.15)',   text: '#eab308' },
  BUILDING:     { bg: 'rgba(59,130,246,0.15)',  text: '#3b82f6' },
  MATURE:       { bg: 'rgba(148,163,184,0.15)', text: '#94a3b8' },
  COOLING:      { bg: 'rgba(239,68,68,0.1)',    text: '#f87171' },
  DISTRESSED:   { bg: 'rgba(220,38,38,0.2)',    text: '#dc2626' },
};

const formatAED = (v: number) => {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v.toFixed(0);
};

const formatMonth = (d: string) => {
  const dt = new Date(d);
  return dt.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

const getMomentumColor = (s: number) => {
  if (s >= 70) return '#22c55e';
  if (s >= 55) return '#f59e0b';
  if (s >= 40) return '#3b82f6';
  return '#64748b';
};

const getFlipRisk = (v: number) => {
  if (v >= 50) return { label: 'OVERHEATED', color: '#ef4444' };
  if (v >= 25) return { label: 'HOT', color: '#f59e0b' };
  if (v >= 10) return { label: 'ACTIVE', color: '#22c55e' };
  return { label: 'STABLE', color: '#64748b' };
};

const N = (v: any) => (v == null ? 0 : Number(v));

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

export function FlipMomentumPage() {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';

  /* ── State ── */
  const [rankings, setRankings] = useState<MomentumProject[]>([]);
  const [trend, setTrend] = useState<MonthlyTrend[]>([]);
  const [flips, setFlips] = useState<FlipTransaction[]>([]);
  const [flipVel, setFlipVel] = useState<FlipVelocity[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'mom' | 'flip' | 'psf'>('mom');
  const [selectedProject, setSelectedProject] = useState<MomentumProject | null>(null);
  const [chartTab, setChartTab] = useState<'trend' | 'velocity' | 'flips'>('trend');
  const [detailOpen, setDetailOpen] = useState(false);

  /* ── Data fetching ── */
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [r1, r2, r3, r4] = await Promise.all([
        gold().from('v_dhe_momentum_rankings').select('*').order('momentum_score', { ascending: false }),
        gold().from('v_dhe_monthly_trend').select('*').order('metric_month', { ascending: true }),
        gold().from('v_dhe_recent_flips').select('*').order('sell_date', { ascending: false }).limit(50),
        gold().from('v_dhe_flip_velocity').select('*').order('metric_month', { ascending: false }),
      ]);

      if (r1.data) setRankings(r1.data.map((d: R): MomentumProject => ({
        project_name: d.project_name || '', phase: d.phase || 'MATURE',
        momentum_score: N(d.momentum_score), volume_score: N(d.volume_score),
        price_momentum_score: N(d.price_momentum_score), capital_quality_score: N(d.capital_quality_score),
        flip_risk_score: N(d.flip_risk_score), txn_count: N(d.txn_count),
        avg_psm: N(d.avg_psm), avg_psf: N(d.avg_psf), psf_change_yoy: d.psf_change_yoy != null ? N(d.psf_change_yoy) : null,
        ready_ratio_pct: N(d.ready_ratio_pct), mortgage_ratio_pct: N(d.mortgage_ratio_pct),
        flip_velocity: N(d.flip_velocity), flip_count_3m: N(d.flip_count_3m),
        developer: d.developer || null, project_status: d.project_status || null,
        project_category: d.project_category || null, total_units: d.total_units != null ? N(d.total_units) : null,
        building_type: d.building_type || null,
      })));
      if (r2.data) setTrend(r2.data.map((d: R): MonthlyTrend => ({
        metric_month: d.metric_month,
        total_sales: N(d.total_sales), total_value: N(d.total_value),
        avg_psm: N(d.avg_psm), avg_psf: N(d.avg_psf),
        ready_sales: N(d.ready_sales), offplan_sales: N(d.offplan_sales),
        mortgage_count: N(d.mortgage_count),
      })));
      if (r3.data) setFlips(r3.data.map((d: R): FlipTransaction => ({
        project_name: d.project_name || '', building_name: d.building_name || null,
        rooms: d.rooms || null, buy_date: d.buy_date || '', sell_date: d.sell_date || '',
        buy_price_m: N(d.buy_price_m), sell_price_m: N(d.sell_price_m),
        gain_pct: N(d.gain_pct), hold_days: N(d.hold_days),
        flip_speed: d.flip_speed || 'STANDARD', capital_type: d.capital_type || 'INVESTOR',
      })));
      if (r4.data) setFlipVel(r4.data.map((d: R): FlipVelocity => ({
        project_name: d.project_name || '', metric_month: d.metric_month || '',
        flip_count: N(d.flip_count), avg_hold_days: N(d.avg_hold_days),
        avg_gain_pct: N(d.avg_gain_pct), flash_flips: N(d.flash_flips),
        fast_flips: N(d.fast_flips), standard_flips: N(d.standard_flips),
        speculative_pct: N(d.speculative_pct), flip_velocity: N(d.flip_velocity),
        total_flip_volume_aed: N(d.total_flip_volume_aed),
      })));

      console.log('[FlipMomentum] Loaded:', r1.data?.length, 'rankings,', r2.data?.length, 'trend,', r3.data?.length, 'flips,', r4.data?.length, 'velocity');
      if (r1.error) console.error('[FlipMomentum] rankings err:', r1.error.message);
      if (r2.error) console.error('[FlipMomentum] trend err:', r2.error.message);
      if (r3.error) console.error('[FlipMomentum] flips err:', r3.error.message);
      if (r4.error) console.error('[FlipMomentum] velocity err:', r4.error.message);
    } catch (e) {
      console.error('[FlipMomentum] fetch error:', e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  /* ── Derived data ── */
  const sorted = useMemo(() => {
    const arr = [...rankings];
    if (sortBy === 'mom') arr.sort((a, b) => b.momentum_score - a.momentum_score);
    else if (sortBy === 'flip') arr.sort((a, b) => b.flip_velocity - a.flip_velocity);
    else arr.sort((a, b) => (b.psf_change_yoy ?? 0) - (a.psf_change_yoy ?? 0));
    return arr;
  }, [rankings, sortBy]);

  const communityMomentum = useMemo(() =>
    rankings.length ? (rankings.reduce((s, r) => s + r.momentum_score, 0) / rankings.length).toFixed(1) : '—',
    [rankings]);

  const flipCount90d = useMemo(() =>
    rankings.reduce((s, r) => s + r.flip_count_3m, 0), [rankings]);

  const avgFlipGain = useMemo(() =>
    flips.length ? (flips.reduce((s, f) => s + f.gain_pct, 0) / flips.length).toFixed(1) : '—',
    [flips]);

  const latestInflow = useMemo(() =>
    trend.length ? formatAED(trend[trend.length - 1].total_value) : '—',
    [trend]);

  const overheatAlerts = useMemo(() =>
    rankings.filter(r => r.phase === 'OVERHEATING' || r.flip_velocity > 50).length,
    [rankings]);

  // Intelligence signals
  const signals = useMemo(() => {
    const sigs: { level: string; color: string; text: string }[] = [];
    rankings.filter(r => r.flip_velocity > 50).forEach(r =>
      sigs.push({ level: 'CRITICAL', color: '#ef4444', text: `${r.project_name} flip velocity at ${r.flip_velocity.toFixed(0)} — speculative overheat` }));
    const highCQ = rankings.reduce<MomentumProject | null>((best, r) =>
      !best || r.capital_quality_score > best.capital_quality_score ? r : best, null);
    if (highCQ) sigs.push({ level: 'SIGNAL', color: '#22c55e', text: `${highCQ.project_name} capital quality ${highCQ.capital_quality_score.toFixed(0)}/100 — conviction buyers` });
    if (trend.length >= 2) {
      const latest = trend[trend.length - 1];
      const prev = trend.find(t => {
        const d = new Date(t.metric_month);
        const l = new Date(latest.metric_month);
        return d.getFullYear() === l.getFullYear() - 1 && d.getMonth() === l.getMonth();
      });
      if (prev && prev.avg_psf > 0) {
        const yoy = ((latest.avg_psf - prev.avg_psf) / prev.avg_psf * 100).toFixed(1);
        sigs.push({ level: 'INFO', color: '#3b82f6', text: `Community PSF ${Number(yoy) >= 0 ? '+' : ''}${yoy}% YoY` });
      }
    }
    rankings.filter(r => r.ready_ratio_pct < 20).forEach(r =>
      sigs.push({ level: 'WATCH', color: '#f59e0b', text: `${r.project_name} — pure developer sales, no secondary market` }));
    return sigs.slice(0, 6);
  }, [rankings, trend]);

  // Flip velocity chart data: aggregate by project for latest 3 months
  const flipVelChart = useMemo(() => {
    const months = [...new Set(flipVel.map(f => f.metric_month))].sort().slice(-3);
    const byProject: Record<string, { project_name: string; flip_velocity: number; flip_count: number }> = {};
    flipVel.filter(f => months.includes(f.metric_month)).forEach(f => {
      if (!byProject[f.project_name]) byProject[f.project_name] = { project_name: f.project_name, flip_velocity: 0, flip_count: 0 };
      byProject[f.project_name].flip_velocity += f.flip_velocity;
      byProject[f.project_name].flip_count += f.flip_count;
    });
    return Object.values(byProject).sort((a, b) => b.flip_velocity - a.flip_velocity).slice(0, 15);
  }, [flipVel]);

  // Trend chart data
  const trendChart = useMemo(() => trend.map(t => ({
    month: formatMonth(t.metric_month),
    sales: t.total_sales,
    inflow: t.total_value / 1e6,
    psf: t.avg_psf,
  })), [trend]);

  // Absorption chart
  const absorptionChart = useMemo(() => trend.map(t => ({
    month: formatMonth(t.metric_month),
    supply: t.ready_sales + t.offplan_sales,
    absorbed: t.total_sales,
  })), [trend]);

  /* ── Style helpers ── */
  const panelBg = colors.surface;
  const borderC = colors.border;
  const textP = colors.text;
  const textS = colors.textSecondary;
  const textD = colors.textDim;

  const cardStyle: React.CSSProperties = {
    background: colors.cardBg, border: `1px solid ${colors.cardBorder}`,
    borderRadius: 8, padding: '14px 16px',
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', color: textS, gap: 10 }}>
        <Loader2 size={20} className="animate-spin" />
        <span style={{ fontFamily: 'monospace', fontSize: 13 }}>Loading Momentum Data…</span>
      </div>
    );
  }

  return (
    <div style={{ height: 'calc(100vh - 56px)', overflow: 'auto', background: colors.bg, color: textP }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: `1px solid ${borderC}`, background: panelBg }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={16} style={{ color: colors.gold }} />
          <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 700, letterSpacing: 2, color: colors.gold }}>
            FLIP MOMENTUM
          </span>
        </div>
        <span style={{ fontSize: 10, color: textD, marginLeft: 16, letterSpacing: 1.5, fontFamily: 'monospace' }}>
          DUBAI HILLS ESTATE
        </span>
        <span style={{
          marginLeft: 12, fontSize: 8, padding: '2px 8px', borderRadius: 3,
          background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontWeight: 600, letterSpacing: 1,
        }}>● LIVE</span>
        <button onClick={fetchAll} style={{
          marginLeft: 'auto', background: 'none', border: `1px solid ${borderC}`,
          borderRadius: 4, padding: '4px 10px', cursor: 'pointer', color: textS, display: 'flex', alignItems: 'center', gap: 5, fontSize: 10,
        }}>
          <RefreshCw size={11} /> Refresh
        </button>
      </div>

      {/* ── KPI Strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, padding: '12px 20px' }}>
        {([
          { label: 'Community Momentum', value: communityMomentum, icon: TrendingUp, color: getMomentumColor(Number(communityMomentum) || 0) },
          { label: 'Flip Count (90d)', value: String(flipCount90d), icon: Zap, color: flipCount90d > 20 ? '#ef4444' : '#22c55e' },
          { label: 'Avg Flip Gain', value: avgFlipGain !== '—' ? `${avgFlipGain}%` : '—', icon: ArrowUpRight, color: Number(avgFlipGain) > 20 ? '#f59e0b' : '#22c55e' },
          { label: 'Capital Inflow', value: latestInflow !== '—' ? `AED ${latestInflow}` : '—', icon: DollarSign, color: '#3b82f6' },
          { label: 'Overheat Alerts', value: String(overheatAlerts), icon: AlertTriangle, color: overheatAlerts > 0 ? '#ef4444' : '#64748b' },
        ] as const).map(kpi => (
          <div key={kpi.label} style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <kpi.icon size={13} style={{ color: kpi.color }} />
              <span style={{ fontSize: 9, color: textD, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'monospace' }}>{kpi.label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: kpi.color, fontFamily: "'Space Grotesk',sans-serif" }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* ── Main Content: Left Rankings + Right Charts ── */}
      <div style={{ display: 'flex', padding: '0 20px 12px', gap: 12, minHeight: 0 }}>
        {/* Left Panel — Rankings */}
        <div style={{
          width: 380, flexShrink: 0, background: panelBg, border: `1px solid ${borderC}`,
          borderRadius: 8, display: 'flex', flexDirection: 'column', maxHeight: 520, overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${borderC}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: textD, letterSpacing: 1, fontFamily: 'monospace' }}>SORT:</span>
            {(['mom', 'flip', 'psf'] as const).map(s => (
              <button key={s} onClick={() => setSortBy(s)} style={{
                fontSize: 9, padding: '3px 10px', borderRadius: 3, cursor: 'pointer', fontWeight: 600, letterSpacing: 0.5,
                border: `1px solid ${sortBy === s ? colors.gold : borderC}`,
                background: sortBy === s ? `${colors.gold}15` : 'transparent',
                color: sortBy === s ? colors.gold : textS,
              }}>
                {s === 'mom' ? 'MOM' : s === 'flip' ? 'FLIP' : 'PSF'}
              </button>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 9, color: textD, fontFamily: 'monospace' }}>{rankings.length} projects</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {sorted.map(p => {
              const phase = PHASE_CONFIG[p.phase] || PHASE_CONFIG.MATURE;
              const isSelected = selectedProject?.project_name === p.project_name;
              const flipRisk = getFlipRisk(p.flip_velocity);
              return (
                <div key={p.project_name} onClick={() => { setSelectedProject(p); setDetailOpen(true); }}
                  style={{
                    padding: '10px 14px', borderBottom: `1px solid ${borderC}`, cursor: 'pointer',
                    background: isSelected ? `${colors.gold}08` : 'transparent',
                    borderLeft: isSelected ? `3px solid ${colors.gold}` : '3px solid transparent',
                    transition: 'background .15s',
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget.style.background = colors.cardHover); }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget.style.background = 'transparent'); }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: textP, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.project_name}
                    </span>
                    <span style={{
                      fontSize: 7.5, padding: '2px 6px', borderRadius: 2, fontWeight: 600, letterSpacing: 0.5,
                      background: phase.bg, color: phase.text,
                    }}>
                      {p.phase}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: getMomentumColor(p.momentum_score), fontFamily: "'Space Grotesk',sans-serif", minWidth: 36 }}>
                      {p.momentum_score.toFixed(0)}
                    </span>
                    <div style={{ flex: 1, height: 4, background: colors.cardBorder, borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(p.momentum_score, 100)}%`, height: '100%', background: getMomentumColor(p.momentum_score), borderRadius: 2 }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, fontSize: 9, color: textS, fontFamily: 'monospace' }}>
                    <span>TXN {p.txn_count}</span>
                    <span>PSF {Math.round(p.avg_psf).toLocaleString()}</span>
                    {p.psf_change_yoy != null && (
                      <span style={{ color: p.psf_change_yoy >= 0 ? '#22c55e' : '#ef4444', display: 'flex', alignItems: 'center', gap: 2 }}>
                        {p.psf_change_yoy >= 0 ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />}
                        {Math.abs(p.psf_change_yoy).toFixed(1)}%
                      </span>
                    )}
                    {p.flip_velocity > 0 && (
                      <span style={{ color: flipRisk.color }}>
                        FLIP {p.flip_velocity.toFixed(0)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {sorted.length === 0 && (
              <div style={{ padding: 30, textAlign: 'center', color: textD, fontSize: 11 }}>No projects with momentum data</div>
            )}
          </div>
        </div>

        {/* Right Panel — Charts */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Chart Tabs */}
          <div style={{ background: panelBg, border: `1px solid ${borderC}`, borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ display: 'flex', borderBottom: `1px solid ${borderC}` }}>
              {(['trend', 'velocity', 'flips'] as const).map(tab => (
                <button key={tab} onClick={() => setChartTab(tab)} style={{
                  flex: 1, padding: '10px 0', fontSize: 10, fontWeight: 600, letterSpacing: 1, cursor: 'pointer',
                  background: chartTab === tab ? `${colors.gold}10` : 'transparent',
                  color: chartTab === tab ? colors.gold : textS,
                  borderBottom: chartTab === tab ? `2px solid ${colors.gold}` : '2px solid transparent',
                  border: 'none', borderLeft: 'none', borderRight: 'none', fontFamily: 'monospace',
                }}>
                  {tab === 'trend' ? 'MOMENTUM TREND' : tab === 'velocity' ? 'FLIP VELOCITY' : 'RECENT FLIPS'}
                </button>
              ))}
            </div>

            <div style={{ padding: 16, height: 280 }}>
              {chartTab === 'trend' && (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.chartGrid} />
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: textD }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 9, fill: textD }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: textD }} />
                    <Tooltip contentStyle={{ background: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: 6, fontSize: 11 }} />
                    <Bar yAxisId="left" dataKey="sales" fill="#22c55e" opacity={0.7} radius={[3, 3, 0, 0]} name="Sales" />
                    <Line yAxisId="right" dataKey="inflow" stroke="#3b82f6" strokeWidth={2} dot={false} name="Inflow (M)" />
                    <Line yAxisId="right" dataKey="psf" stroke="#eab308" strokeWidth={2} strokeDasharray="4 4" dot={false} name="Avg PSF" />
                  </ComposedChart>
                </ResponsiveContainer>
              )}

              {chartTab === 'velocity' && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={flipVelChart} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.chartGrid} />
                    <XAxis type="number" tick={{ fontSize: 9, fill: textD }} />
                    <YAxis type="category" dataKey="project_name" tick={{ fontSize: 8, fill: textS }} width={80} />
                    <Tooltip contentStyle={{ background: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: 6, fontSize: 11 }} />
                    <Bar dataKey="flip_velocity" radius={[0, 4, 4, 0]} name="Flip Velocity">
                      {flipVelChart.map((d, i) => (
                        <Cell key={i} fill={d.flip_velocity >= 50 ? '#ef4444' : d.flip_velocity >= 25 ? '#f59e0b' : '#22c55e'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}

              {chartTab === 'flips' && (
                <div style={{ height: '100%', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, fontFamily: 'monospace' }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${borderC}`, color: textD, textAlign: 'left' }}>
                        <th style={{ padding: '6px 8px' }}>Project</th>
                        <th style={{ padding: '6px 8px' }}>Rooms</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right' }}>Buy (M)</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right' }}>Sell (M)</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right' }}>Gain%</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right' }}>Days</th>
                        <th style={{ padding: '6px 8px' }}>Speed</th>
                        <th style={{ padding: '6px 8px' }}>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flips.map((f, i) => {
                        const speedColor = f.flip_speed === 'FLASH' ? '#ef4444' : f.flip_speed === 'FAST' ? '#f59e0b' : '#64748b';
                        return (
                          <tr key={i} style={{ borderBottom: `1px solid ${colors.cardBorder}`, color: textS }}>
                            <td style={{ padding: '5px 8px', color: textP, maxWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.project_name}</td>
                            <td style={{ padding: '5px 8px' }}>{f.rooms || '—'}</td>
                            <td style={{ padding: '5px 8px', textAlign: 'right' }}>{f.buy_price_m.toFixed(2)}</td>
                            <td style={{ padding: '5px 8px', textAlign: 'right' }}>{f.sell_price_m.toFixed(2)}</td>
                            <td style={{ padding: '5px 8px', textAlign: 'right', color: f.gain_pct >= 0 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                              {f.gain_pct >= 0 ? '+' : ''}{f.gain_pct.toFixed(1)}%
                            </td>
                            <td style={{ padding: '5px 8px', textAlign: 'right', color: f.hold_days < 100 ? '#ef4444' : textS }}>{f.hold_days}</td>
                            <td style={{ padding: '5px 8px' }}>
                              <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 2, background: `${speedColor}20`, color: speedColor, fontWeight: 600 }}>
                                {f.flip_speed}
                              </span>
                            </td>
                            <td style={{ padding: '5px 8px' }}>
                              <span style={{ fontSize: 8, color: f.capital_type === 'SPECULATIVE' ? '#ef4444' : '#3b82f6' }}>
                                {f.capital_type}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {flips.length === 0 && (
                        <tr><td colSpan={8} style={{ padding: 20, textAlign: 'center', color: textD }}>No flip data available</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Row: Absorption + Intelligence Signals */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Absorption Rate */}
            <div style={{ background: panelBg, border: `1px solid ${borderC}`, borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 9, color: textD, letterSpacing: 1, marginBottom: 10, fontFamily: 'monospace' }}>ABSORPTION RATE</div>
              <div style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={absorptionChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.chartGrid} />
                    <XAxis dataKey="month" tick={{ fontSize: 8, fill: textD }} />
                    <YAxis tick={{ fontSize: 8, fill: textD }} />
                    <Tooltip contentStyle={{ background: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: 6, fontSize: 10 }} />
                    <Area dataKey="supply" fill="#3b82f620" stroke="#3b82f6" strokeWidth={1.5} name="Supply" />
                    <Area dataKey="absorbed" fill="#22c55e20" stroke="#22c55e" strokeWidth={1.5} name="Absorbed" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Intelligence Signals */}
            <div style={{ background: panelBg, border: `1px solid ${borderC}`, borderRadius: 8, padding: 14, overflowY: 'auto' }}>
              <div style={{ fontSize: 9, color: textD, letterSpacing: 1, marginBottom: 10, fontFamily: 'monospace' }}>INTELLIGENCE SIGNALS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {signals.map((s, i) => (
                  <div key={i} style={{ padding: '8px 10px', borderRadius: 6, border: `1px solid ${s.color}25`, background: `${s.color}08` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: 1, color: s.color, fontFamily: 'monospace' }}>{s.level}</span>
                    </div>
                    <div style={{ fontSize: 10, color: textS, lineHeight: 1.4 }}>{s.text}</div>
                  </div>
                ))}
                {signals.length === 0 && (
                  <div style={{ padding: 20, textAlign: 'center', color: textD, fontSize: 10 }}>No signals — market stable</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Selected Project Detail Bar ── */}
      {selectedProject && (
        <div style={{ margin: '0 20px 16px', background: panelBg, border: `1px solid ${borderC}`, borderRadius: 8, overflow: 'hidden' }}>
          <div
            onClick={() => setDetailOpen(!detailOpen)}
            style={{
              padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
              borderBottom: detailOpen ? `1px solid ${borderC}` : 'none',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: colors.gold }}>{selectedProject.project_name}</span>
            <span style={{
              fontSize: 7.5, padding: '2px 6px', borderRadius: 2, fontWeight: 600,
              background: (PHASE_CONFIG[selectedProject.phase] || PHASE_CONFIG.MATURE).bg,
              color: (PHASE_CONFIG[selectedProject.phase] || PHASE_CONFIG.MATURE).text,
            }}>
              {selectedProject.phase}
            </span>
            {selectedProject.developer && <span style={{ fontSize: 9, color: textD, fontFamily: 'monospace' }}>{selectedProject.developer}</span>}
            <span style={{ marginLeft: 'auto', color: textD }}>{detailOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
          </div>

          {detailOpen && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, padding: 16 }}>
              {([
                { label: 'Momentum', value: selectedProject.momentum_score.toFixed(1), color: getMomentumColor(selectedProject.momentum_score) },
                { label: 'Avg PSF', value: `AED ${Math.round(selectedProject.avg_psf).toLocaleString()}`, color: textP },
                { label: 'PSF YoY', value: selectedProject.psf_change_yoy != null ? `${selectedProject.psf_change_yoy >= 0 ? '+' : ''}${selectedProject.psf_change_yoy.toFixed(1)}%` : '—', color: (selectedProject.psf_change_yoy ?? 0) >= 0 ? '#22c55e' : '#ef4444' },
                { label: 'Flip Velocity', value: selectedProject.flip_velocity.toFixed(1), color: getFlipRisk(selectedProject.flip_velocity).color },
                { label: 'Capital Quality', value: `${selectedProject.capital_quality_score.toFixed(0)}/100`, color: selectedProject.capital_quality_score >= 70 ? '#22c55e' : '#f59e0b' },
                { label: 'Transactions', value: String(selectedProject.txn_count), color: '#3b82f6' },
              ] as const).map(m => (
                <div key={m.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 8, color: textD, letterSpacing: 0.5, marginBottom: 4, fontFamily: 'monospace', textTransform: 'uppercase' }}>{m.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: m.color, fontFamily: "'Space Grotesk',sans-serif" }}>{m.value}</div>
                </div>
              ))}
            </div>
          )}

          {detailOpen && (
            <div style={{ padding: '8px 16px 12px', display: 'flex', gap: 16, fontSize: 9, color: textS, fontFamily: 'monospace', borderTop: `1px solid ${borderC}` }}>
              {selectedProject.building_type && <span>TYPE: {selectedProject.building_type.replace(/_/g, ' ').toUpperCase()}</span>}
              {selectedProject.total_units && <span>UNITS: {selectedProject.total_units}</span>}
              {selectedProject.project_status && <span>STATUS: {selectedProject.project_status.replace(/_/g, ' ').toUpperCase()}</span>}
              <span>READY: {selectedProject.ready_ratio_pct.toFixed(0)}%</span>
              <span>MORTGAGE: {selectedProject.mortgage_ratio_pct.toFixed(0)}%</span>
              <span>FLIPS (90d): {selectedProject.flip_count_3m}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{ padding: '10px 20px', borderTop: `1px solid ${borderC}`, display: 'flex', gap: 20, fontSize: 8, color: textD, fontFamily: 'monospace' }}>
        <span>ZEROAGENT v0.1</span>
        <span>SOURCE: DLD Pulse + Google Earth Engine</span>
        <span>{rankings.length} PROJECTS TRACKED</span>
        <span style={{ marginLeft: 'auto' }}>Flip detection is proxy-based (unit fingerprint matching). Some false positives may exist.</span>
      </div>
    </div>
  );
}
