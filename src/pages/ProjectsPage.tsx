import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@/lib/theme';
import { sb } from '@/lib/supabase';
import { Loader2, Search, Sun, Moon } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>;

const FONT_DATA = "'IBM Plex Mono', monospace";

const catColor: Record<string, string> = { apartment: '#60A5FA', villa: '#34D399', off_plan: '#FBBF24' };
const catLabel: Record<string, string> = { apartment: 'APT', villa: 'VILLA', off_plan: 'OFF-PLAN' };
const fmt = (n: number | string | null | undefined): string => n ? Number(n).toLocaleString('en-AE') : '—';
const fmtM = (n: number | null | undefined): string => {
  if (!n) return '—';
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : fmt(n);
};

function Badge({ color, label }: { color: string; label: string }) {
  return (
    <span className="za-badge" style={{ background: color + '18', color }}>
      {label}
    </span>
  );
}

function Stat({ label, value, sub, colors }: { label: string; value: string | number; sub?: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <div style={{ textAlign: 'center', padding: '12px 0' }}>
      <div className="za-data-value-lg">{value}</div>
      <div className="za-data-label" style={{ marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: colors.textDim, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Section({ title, subtitle, children, accent, colors }: { title: string; subtitle?: string; children: React.ReactNode; accent?: boolean; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ marginBottom: 16 }}>
        {accent && <div style={{ width: 32, height: 2, background: colors.gold, marginBottom: 10 }} />}
        <h2 className="za-section-title" style={{ margin: 0 }}>{title}</h2>
        {subtitle && <p className="za-section-subtitle" style={{ marginTop: 3 }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function PCard({ children, style: s, colors }: { children: React.ReactNode; style?: React.CSSProperties; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <div style={{ padding: 16, background: colors.surface, borderRadius: 6, border: `1px solid ${colors.border}`, ...s }}>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   LEFT SIDEBAR — project list with search
   ═══════════════════════════════════════════════════ */
function ProjectSidebar({ projects, sel, onSelect, colors, isDark }: {
  projects: R[]; sel: R | null; onSelect: (p: R) => void;
  colors: ReturnType<typeof useTheme>['colors']; isDark: boolean;
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return projects;
    const q = search.toLowerCase();
    return projects.filter(p =>
      p.project_name?.toLowerCase().includes(q) ||
      p.developer?.toLowerCase().includes(q) ||
      p.master_community?.toLowerCase().includes(q) ||
      p.project_category?.toLowerCase().includes(q)
    );
  }, [projects, search]);

  return (
    <div style={{
      width: 280, minWidth: 280, height: '100%', display: 'flex', flexDirection: 'column',
      borderRight: `1px solid ${colors.border}`, background: isDark ? '#0c0d14' : colors.surface,
    }}>
      {/* Search */}
      <div style={{ padding: '12px 12px 8px', borderBottom: `1px solid ${colors.border}` }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
          background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: 4,
        }}>
          <Search size={13} style={{ color: colors.textDim, flexShrink: 0 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects..."
            style={{
              background: 'none', border: 'none', outline: 'none', width: '100%',
              color: colors.text, fontSize: 12, fontFamily: "'DM Sans', sans-serif",
            }}
          />
        </div>
        <div style={{ fontSize: 9, color: colors.textDim, marginTop: 6, fontFamily: FONT_DATA }}>
          {filtered.length} OF {projects.length} PROJECTS
        </div>
      </div>

      {/* Project list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.map(p => {
          const active = sel?.id === p.id;
          const cc = catColor[p.project_category] || colors.textDim;
          return (
            <div
              key={p.id}
              onClick={() => onSelect(p)}
              className="za-list-row"
              style={{
                padding: '10px 12px',
                background: active ? colors.goldBg : 'transparent',
                borderLeftColor: active ? colors.gold : 'transparent',
                cursor: 'pointer',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12, fontWeight: active ? 600 : 400,
                  color: active ? colors.gold : colors.text,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {p.project_name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  <span style={{
                    fontSize: 8, fontWeight: 700, letterSpacing: '0.5px', padding: '1px 5px',
                    borderRadius: 2, background: cc + '20', color: cc,
                  }}>{catLabel[p.project_category] || ''}</span>
                  {p.has_unit_registry && <span style={{
                    fontSize: 7, fontWeight: 700, letterSpacing: '0.5px', padding: '1px 4px',
                    borderRadius: 2, background: '#C9A84C20', color: '#C9A84C',
                  }}>V3</span>}
                  <span style={{ fontSize: 9, color: colors.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.master_community}
                  </span>
                </div>
                {p.avg_price_per_sqft && (
                  <div style={{ fontSize: 9, color: colors.textSecondary, marginTop: 2, fontFamily: FONT_DATA }}>
                    AED {fmt(p.avg_price_per_sqft)}/sqft
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: colors.textDim }}>
            No projects match "{search}"
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════ */
export function ProjectsPage() {
  const { colors, mode, toggle } = useTheme();
  const isDark = mode === 'dark';

  const [projects, setProjects] = useState<R[]>([]);
  const [sel, setSel] = useState<R | null>(null);
  const [tab, setTab] = useState('overview');
  const [units, setUnits] = useState<R[]>([]);
  const [amenities, setAmenities] = useState<R[]>([]);
  const [infra, setInfra] = useState<R[]>([]);
  const [dldRecent, setDldRecent] = useState<R[]>([]);
  const [dldSummary, setDldSummary] = useState<R[]>([]);
  const [ejari, setEjari] = useState<R[]>([]);
  const [viewBlocking, setViewBlocking] = useState<R[]>([]);
  // V3 tables
  const [unitRegistry, setUnitRegistry] = useState<R[]>([]);
  const [floorPricing, setFloorPricing] = useState<R[]>([]);
  const [surroundings, setSurroundings] = useState<R[]>([]);
  const [zaInsights, setZaInsights] = useState<R[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [hoveredUnit, setHoveredUnit] = useState<R | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error: err } = await sb.from('xray_projects')
          .select('*')
          .not('avg_price_per_sqft', 'is', null)
          .order('avg_price_per_sqft', { ascending: false })
          .limit(200);
        if (err) {
          console.error('[Projects] xray_projects error:', err.message);
          setError(err.message);
        }
        setProjects(data || []);
        if (data?.length) setSel(data[0]);
      } catch (e) {
        console.error('[Projects] Failed to load projects:', e);
        setError(String(e));
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!sel) return;
    setDetailLoading(true);
    setTab('overview');
    (async () => {
      try {
        const [u, a, i] = await Promise.all([
          sb.from('xray_unit_types').select('*').eq('project_id', sel.id).order('starting_price_aed', { ascending: true }),
          sb.from('xray_project_amenities').select('*').eq('project_id', sel.id).order('amenity_category', { ascending: true }),
          sb.from('xray_infrastructure').select('*').eq('project_id', sel.id).order('distance_km', { ascending: true }),
        ]);
        if (u.error) console.error('[Projects] xray_unit_types:', u.error.message);
        if (a.error) console.error('[Projects] xray_project_amenities:', a.error.message);
        if (i.error) console.error('[Projects] xray_infrastructure:', i.error.message);
        setUnits(u.data || []);
        setAmenities(a.data || []);
        setInfra(i.data || []);
        // DLD + Ejari via rera_registration_no
        if (sel.rera_registration_no) {
          const [dr, ds, ej] = await Promise.all([
            sb.from('xray_dld_recent').select('*').eq('project_number', sel.rera_registration_no).order('instance_date', { ascending: false }).limit(20),
            sb.from('xray_dld_summary').select('*').eq('project_number', sel.rera_registration_no),
            sb.from('xray_ejari_summary').select('*').eq('project_number', sel.rera_registration_no).order('unit_type', { ascending: true }),
          ]);
          if (dr.error) console.error('[Projects] xray_dld_recent:', dr.error.message);
          if (ds.error) console.error('[Projects] xray_dld_summary:', ds.error.message);
          if (ej.error) console.error('[Projects] xray_ejari_summary:', ej.error.message);
          setDldRecent(dr.data || []);
          setDldSummary(ds.data || []);
          setEjari(ej.data || []);
          console.log('[Projects] DLD+Ejari mapped:', { rera: sel.rera_registration_no, recent: (dr.data || []).length, summary: (ds.data || []).length, ejari: (ej.data || []).length });
        } else {
          setDldRecent([]); setDldSummary([]); setEjari([]);
        }
        // View blocking via community mapping
        const vbMap: Record<string, string> = {
          'Downtown Dubai': 'BURJ KHALIFA DISTRICT', 'Business Bay': 'BUSINESS BAY PHASE 1 & 2',
          'Dubai Hills Estate': 'DUBAI HILLS', 'Arabian Ranches III': 'ARABIAN RANCHES III',
          'City Walk': 'City Walk', 'DIFC': 'DUBAI INTERNATIONAL FINANCIAL CENTER',
        };
        const vbKey = vbMap[sel.master_community];
        if (vbKey) {
          const { data: vb, error: vbErr } = await sb.from('xray_view_blocking')
            .select('*').eq('observer_project', vbKey)
            .order('risk_score', { ascending: false }).limit(20);
          if (vbErr) console.error('[Projects] xray_view_blocking:', vbErr.message);
          setViewBlocking(vb || []);
        } else {
          setViewBlocking([]);
        }
        // V3 tables — unit registry, floor pricing, surroundings, ZA insights
        const [urRes, fpRes, srRes, ziRes] = await Promise.all([
          sb.from('xray_unit_registry').select('*').eq('project_id', sel.id).order('floor', { ascending: true }).order('unit_number', { ascending: true }),
          sb.from('xray_floor_pricing').select('*').eq('project_id', sel.id).order('rooms_en', { ascending: true }).order('floor_band', { ascending: true }),
          sb.from('xray_surroundings').select('*').eq('project_id', sel.id).order('direction', { ascending: true }),
          sb.from('xray_za_insights').select('*').eq('project_id', sel.id).order('sort_order', { ascending: true }),
        ]);
        if (urRes.error) console.error('[Projects] xray_unit_registry:', urRes.error.message);
        if (fpRes.error) console.error('[Projects] xray_floor_pricing:', fpRes.error.message);
        if (srRes.error) console.error('[Projects] xray_surroundings:', srRes.error.message);
        if (ziRes.error) console.error('[Projects] xray_za_insights:', ziRes.error.message);
        const urData = urRes.data || [];
        setUnitRegistry(urData);
        setFloorPricing(fpRes.data || []);
        setSurroundings(srRes.data || []);
        setZaInsights(ziRes.data || []);
        // Set default floor and building from actual data
        if (urData.length) {
          const floors = [...new Set(urData.map((u: R) => u.floor))].filter((f: string) => /^\d+$/.test(f)).sort((a: string, b: string) => +a - +b);
          setSelectedFloor(floors[Math.floor(floors.length / 2)] || floors[0] || null);
          setSelectedBuilding(urData[0]?.building_number || null);
        } else {
          setSelectedFloor(null); setSelectedBuilding(null);
        }
        console.log('[Projects] V3 data:', {
          project_id: sel.id, project_name: sel.project_name,
          unitRegistry: urData.length, floorPricing: (fpRes.data || []).length,
          surroundings: (srRes.data || []).length, zaInsights: (ziRes.data || []).length,
        });
      } catch (e) {
        console.error('[Projects] Detail load error:', e);
      }
      setDetailLoading(false);
    })();
  }, [sel?.id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-20" style={{ minHeight: '60vh' }}>
        <Loader2 className="animate-spin" size={24} style={{ color: colors.gold }} />
      </div>
    );
  }

  if (error && projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20" style={{ minHeight: '60vh' }}>
        <div className="za-signal-box za-signal-box--gold" style={{ maxWidth: 400, textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Unable to load projects</div>
          <div style={{ fontSize: 11, color: colors.textSecondary }}>{error}</div>
          <div style={{ fontSize: 10, color: colors.textDim, marginTop: 8 }}>Check browser console for details. The xray_projects table may require RLS permissions.</div>
        </div>
      </div>
    );
  }

  const cat = sel?.project_category;
  const isApt = cat === 'apartment';
  const isVilla = cat === 'villa';
  const isOffplan = cat === 'off_plan';
  const hasRegistry = unitRegistry.length > 0;
  const hasFloorPricing = floorPricing.length > 0;
  const hasInsights = zaInsights.length > 0;
  const hasSurroundings = surroundings.length > 0;

  // V3 surroundings type colors
  const surrTypeColor: Record<string, string> = {
    premium: '#C9A84C', positive: '#34D399', mixed: '#60A5FA',
    neutral: '#4a5168', caution: '#FBBF24', negative: '#F87171',
  };

  // V3 unit type colors for floor plate
  const typeColor: Record<string, string> = {
    '1 B/R': '#60A5FA', '2 B/R': '#A78BFA', '3 B/R': '#FBBF24',
    '4 B/R': '#34D399', '5 B/R': '#F87171', 'Studio': '#8892a4',
  };

  // V3 confidence badge
  function ConfBadge({ confidence }: { confidence?: string }) {
    if (confidence === 'verified') return <span style={{ fontSize: 9, color: '#34D399' }}>🟢 VERIFIED</span>;
    if (confidence === 'inferred') return <span style={{ fontSize: 9, color: '#FBBF24' }}>🟡 INFERRED</span>;
    return <span style={{ fontSize: 9, color: '#F87171' }}>🔴 ESTIMATED</span>;
  }

  // V3 insight type colors
  const insightTypeColor: Record<string, string> = {
    price_spread: '#F87171', yield_signal: '#34D399', sc_impact: '#FBBF24',
    data_gap: '#4a5168', orientation_premium: '#C9A84C', rental_demand: '#60A5FA',
  };

  // V3 floor plate: compute SVG positions for units on a floor
  function getUnitLayout(floorUnits: R[]) {
    const n = floorUnits.length;
    if (!n) return [];
    const cols = n <= 4 ? 2 : n <= 9 ? 3 : 4;
    const rows = Math.ceil(n / cols);
    const cellW = 90 / cols;
    const cellH = 85 / rows;
    return floorUnits.map((u, i) => ({
      ...u,
      _x: 5 + (i % cols) * cellW,
      _y: 5 + Math.floor(i / cols) * cellH,
      _w: cellW - 2,
      _h: cellH - 2,
    }));
  }

  // V3 floor pricing lookup for a unit
  function getUnitPricing(unit: R) {
    const floorNum = parseInt(unit.floor);
    if (isNaN(floorNum)) return null;
    const band = floorNum <= 10 ? '1-10' : floorNum <= 20 ? '11-20' : floorNum <= 30 ? '21-30' :
      floorNum <= 40 ? '31-40' : floorNum <= 50 ? '41-50' : floorNum <= 60 ? '51-60' : '60+';
    const pricing = floorPricing.find(fp => fp.rooms_en === unit.rooms_en && fp.floor_band === band);
    if (!pricing) return null;
    const estPrice = Math.round(pricing.avg_psf * (unit.area_sqft || 0) / 1000) * 1000;
    const estPriceHigh = Math.round(pricing.max_psf * (unit.area_sqft || 0) / 1000) * 1000;
    const estPriceLow = Math.round(pricing.min_psf * (unit.area_sqft || 0) / 1000) * 1000;
    return {
      avgPsf: pricing.avg_psf, minPsf: pricing.min_psf, maxPsf: pricing.max_psf,
      estPrice, estPriceLow, estPriceHigh,
      txnCount: pricing.txn_count, exactMatches: pricing.exact_matches,
      confidence: pricing.confidence, floorBand: band,
    };
  }

  // V3 derived data
  const v3Floors = useMemo(() => [...new Set(unitRegistry.map(u => u.floor))].filter((f: string) => /^\d+$/.test(f)).sort((a: string, b: string) => +a - +b), [unitRegistry]);
  const v3Buildings = useMemo(() => [...new Set(unitRegistry.map(u => u.building_number))].filter(Boolean).sort(), [unitRegistry]);
  const floorUnits = useMemo(() => {
    if (!selectedFloor) return [];
    return unitRegistry.filter(u => u.floor === selectedFloor && (!selectedBuilding || u.building_number === selectedBuilding));
  }, [unitRegistry, selectedFloor, selectedBuilding]);

  const tabs = [
    { key: 'overview', label: 'Overview' },
    ...(hasRegistry ? [{ key: 'floorplate', label: 'Floor Plate' }] : []),
    ...(hasFloorPricing ? [{ key: 'floorpricing', label: 'Floor Pricing' }] : []),
    ...(hasSurroundings ? [{ key: 'surroundings', label: 'Surroundings' }] : []),
    { key: 'units', label: 'Units & Pricing' },
    ...(isApt || isOffplan ? [{ key: 'orientation', label: 'Orientation' }] : []),
    ...(isApt || isOffplan ? [{ key: 'viewblock', label: 'View Blocking' }] : []),
    ...(isVilla ? [{ key: 'community', label: 'Community Intel' }] : []),
    ...(isOffplan ? [{ key: 'offplan', label: 'Construction' }] : []),
    { key: 'evidence', label: 'DLD Evidence' },
    { key: 'rentals', label: 'Ejari Rentals' },
    { key: 'amenities', label: 'Amenities' },
    ...(hasInsights ? [{ key: 'insights', label: 'ZA Insights' }] : [{ key: 'insights', label: "What They Don't Tell You" }]),
  ];

  return (
    <div style={{ display: 'flex', height: '100%', color: colors.text }}>
      {/* LEFT SIDEBAR */}
      <ProjectSidebar projects={projects} sel={sel} onSelect={setSel} colors={colors} isDark={isDark} />

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, overflowY: 'auto', height: '100%' }}>
        {sel ? (
          <>
            {/* HERO */}
            <div style={{ padding: '32px 28px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 0%, ${colors.gold}06 0%, transparent 60%)` }} />
              <div style={{ position: 'relative' }}>
                {/* Theme toggle */}
                <div style={{ position: 'absolute', top: 0, right: 0 }}>
                  <button onClick={toggle} style={{
                    background: colors.cardBg, border: `1px solid ${colors.cardBorder}`,
                    borderRadius: 6, padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                  }}>
                    {isDark ? <Sun size={14} style={{ color: colors.gold }} /> : <Moon size={14} style={{ color: colors.gold }} />}
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
                  <Badge color={catColor[cat] || colors.textDim} label={catLabel[cat] || cat} />
                  {sel.sc_source === 'mollak_confirmed' && <Badge color={colors.green} label="MOLLAK VERIFIED SC" />}
                  {sel.sc_source === 'rera_estimate' && <Badge color={isDark ? '#FBBF24' : '#D4850A'} label="RERA ESTIMATE SC" />}
                </div>
                <div className="za-section-tag" style={{ letterSpacing: 4, marginBottom: 12 }}>
                  {sel.master_community?.toUpperCase()}
                </div>
                <h1 className="font-display" style={{ fontSize: 36, fontWeight: 300, margin: 0, letterSpacing: 1, lineHeight: 1.1, color: colors.text }}>
                  {sel.project_name}
                </h1>
                <p style={{ fontSize: 13, color: colors.textSecondary, marginTop: 10, fontStyle: 'italic' }}>
                  {sel.brochure_tagline || 'Independent property intelligence'}
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 24, flexWrap: 'wrap' }}>
                  <Stat label="DEVELOPER" value={sel.developer} colors={colors} />
                  {sel.total_floors && <Stat label="FLOORS" value={sel.total_floors} colors={colors} />}
                  {sel.total_units && <Stat label="UNITS" value={`~${fmt(sel.total_units)}`} colors={colors} />}
                  <Stat label="STATUS" value={sel.project_status?.replace(/_/g, ' ')} colors={colors} />
                </div>
                <div className="za-signal-box za-signal-box--gold" style={{ display: 'inline-block', marginTop: 20 }}>
                  Every number sourced from DLD transactions, Ejari contracts, Mollak service charges, or verified public data.
                </div>
              </div>
            </div>

            {/* TABS */}
            <div style={{ borderBottom: `1px solid ${colors.border}`, padding: '0 20px', display: 'flex', gap: 0, overflowX: 'auto' }}>
              {tabs.map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`za-subtab${tab === t.key ? ' active' : ''}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* CONTENT */}
            <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px' }}>
              {detailLoading ? (
                <div className="flex justify-center p-12">
                  <Loader2 className="animate-spin" size={24} style={{ color: colors.gold }} />
                </div>
              ) : (
                <>
                  {/* OVERVIEW */}
                  {tab === 'overview' && (
                    <div>
                      <Section title="At a Glance" accent colors={colors}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
                          {[
                            { l: 'AVG PRICE/SQFT', v: `AED ${fmt(sel.avg_price_per_sqft)}`, s: 'DLD verified' },
                            { l: 'PRICE RANGE', v: `${fmtM(sel.price_range_aed_min)} – ${fmtM(sel.price_range_aed_max)}`, s: 'AED' },
                            { l: 'SIZE RANGE', v: `${fmt(sel.size_range_sqft_min)} – ${fmt(sel.size_range_sqft_max)}`, s: 'sqft' },
                            { l: 'SERVICE CHARGE', v: sel.service_charge_per_sqft ? `AED ${Number(sel.service_charge_per_sqft).toFixed(1)}/sqft` : sel.offplan_estimated_sc ? `~AED ${Number(sel.offplan_estimated_sc).toFixed(1)}/sqft` : 'TBD', s: sel.sc_source === 'mollak_confirmed' ? `Mollak ${sel.service_charge_year}` : sel.sc_source === 'rera_estimate' ? 'RERA estimate' : 'Not yet available' },
                            { l: 'DELIVERY SCORE', v: `${sel.amenity_delivery_score}/100`, s: sel.amenity_delivery_score >= 90 ? 'Exceptional' : sel.amenity_delivery_score >= 70 ? 'Good' : sel.amenity_delivery_score >= 50 ? 'Developing' : 'Pre-delivery' },
                            { l: 'PAYMENT', v: sel.payment_plan_summary || '—' },
                            ...(dldSummary.length ? [{ l: 'DLD TRANSACTIONS', v: String(dldSummary.reduce((a: number, d: R) => a + d.txn_count, 0)), s: 'Since Jan 2025' }] : []),
                            ...(ejari.length ? [{ l: 'EJARI CONTRACTS', v: String(ejari.reduce((a: number, e: R) => a + e.contract_count, 0)), s: 'Since 2024' }] : []),
                          ].map((s, i) => (
                            <PCard key={i} colors={colors}>
                              <div className="za-data-value-lg">{s.v}</div>
                              <div className="za-data-label" style={{ marginTop: 4 }}>{s.l}</div>
                              {s.s && <div style={{ fontSize: 10, color: colors.textDim, marginTop: 2 }}>{s.s}</div>}
                            </PCard>
                          ))}
                        </div>
                      </Section>

                      {sel.brochure_usps?.length > 0 && (
                        <Section title="Key Features" subtitle="Developer positioning and verified highlights" colors={colors}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {sel.brochure_usps.map((u: string, i: number) => (
                              <PCard key={i} colors={colors} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <div style={{ width: 4, height: 20, borderRadius: 2, background: colors.gold, flexShrink: 0 }} />
                                <span style={{ fontSize: 12, color: colors.text }}>{u}</span>
                              </PCard>
                            ))}
                          </div>
                        </Section>
                      )}

                      {isOffplan && sel.offplan_construction_pct != null && (
                        <Section title="Off-Plan Status" colors={colors}>
                          <PCard colors={colors}>
                            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                              <div><div className="za-data-label">CONSTRUCTION</div><div style={{ fontSize: 28, fontWeight: 300, color: isDark ? '#FBBF24' : '#D4850A' }}>{sel.offplan_construction_pct}%</div></div>
                              <div><div className="za-data-label">HANDOVER</div><div style={{ fontSize: 16, color: colors.text }}>{sel.offplan_expected_handover?.slice(0, 7) || 'TBD'}</div></div>
                              <div><div className="za-data-label">DEV AVG DELAY</div><div style={{ fontSize: 16, color: sel.offplan_developer_delay_history_months > 6 ? colors.orange : colors.green }}>{sel.offplan_developer_delay_history_months || 0} months</div></div>
                              <div><div className="za-data-label">ESCROW</div><div style={{ fontSize: 16, color: colors.green }}>{sel.offplan_escrow_status?.toUpperCase() || '—'}</div></div>
                              {sel.offplan_resale_premium_pct && <div><div className="za-data-label">RESALE PREMIUM</div><div style={{ fontSize: 16, color: colors.green }}>+{sel.offplan_resale_premium_pct}%</div></div>}
                            </div>
                            <div style={{ marginTop: 12, height: 8, background: isDark ? '#1a1b22' : colors.cardBg, borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ width: `${sel.offplan_construction_pct}%`, height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${isDark ? '#FBBF24' : '#D4850A'}, ${colors.green})` }} />
                            </div>
                          </PCard>
                        </Section>
                      )}

                      {isVilla && sel.villa_highway_distance_m && (
                        <Section title="Community Context" colors={colors}>
                          <PCard colors={colors}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                              <div><div className="za-data-label">HIGHWAY</div><div style={{ fontSize: 14, color: colors.text }}>{sel.villa_highway_name}</div><div style={{ fontSize: 12, color: sel.villa_highway_noise_risk === 'low' ? colors.green : colors.orange }}>{sel.villa_highway_distance_m}m — {sel.villa_highway_noise_risk} noise</div></div>
                              <div><div className="za-data-label">NEAREST SCHOOL</div><div style={{ fontSize: 14, color: colors.text }}>{sel.villa_nearest_school}</div><div style={{ fontSize: 12, color: colors.textSecondary }}>{sel.villa_school_proximity_km}km</div></div>
                              <div><div className="za-data-label">COMMUNITY</div><div style={{ fontSize: 14, color: colors.text }}>{sel.villa_community_maturity?.replace(/_/g, ' ')}</div><div style={{ fontSize: 12, color: colors.textSecondary }}>{sel.villa_gated ? 'Gated' : 'Open'} · {sel.villa_private_pool ? 'Private Pool' : 'Shared Pool'}</div></div>
                            </div>
                          </PCard>
                        </Section>
                      )}
                    </div>
                  )}

                  {/* UNITS & PRICING */}
                  {tab === 'units' && (
                    <div>
                      <Section title="Unit Types & Pricing" subtitle="From xray_unit_types — brochure layout data" accent colors={colors}>
                        {units.length === 0 ? (
                          <PCard colors={colors}><div style={{ color: colors.textDim, textAlign: 'center', padding: 20 }}>Unit type data pending for this project</div></PCard>
                        ) : units.map((u, i) => (
                          <PCard key={i} colors={colors} style={{ marginBottom: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ width: 4, height: 24, borderRadius: 2, background: u.bedroom_count <= 1 ? '#60A5FA' : u.bedroom_count === 2 ? '#A78BFA' : u.bedroom_count === 3 ? (isDark ? '#FBBF24' : '#D4850A') : colors.green }} />
                                  <span style={{ fontSize: 17, fontWeight: 400 }}>{u.unit_type}</span>
                                  <span style={{ fontSize: 11, color: colors.textDim }}>{u.unit_subtype}</span>
                                </div>
                                <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4, marginLeft: 12 }}>
                                  {u.bedroom_count} Bed · {u.bathroom_count} Bath · {fmt(u.total_area_sqft)} sqft
                                  {u.has_maid_room && ' · Maid'}{u.has_study && ' · Study'}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div className="za-data-value-lg">AED {fmtM(u.starting_price_aed)}</div>
                                <div style={{ fontSize: 11, color: colors.gold }}>AED {fmt(u.price_per_sqft)}/sqft</div>
                              </div>
                            </div>
                            {u.layout_description && (
                              <div style={{ padding: 10, background: colors.bg, borderRadius: 4, marginBottom: 6 }}>
                                <div className="za-data-label">LAYOUT</div>
                                <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2, lineHeight: 1.5 }}>{u.layout_description}</div>
                              </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, flexWrap: 'wrap', gap: 6 }}>
                              <div style={{ color: colors.textSecondary }}>Orientation: {u.orientation || 'Various'}</div>
                              {u.view_type?.length > 0 && <div style={{ color: colors.gold }}>{u.view_type.join(' · ')}</div>}
                              {u.total_units_this_type && <div style={{ color: colors.textDim }}>{u.total_units_this_type} units</div>}
                              {(() => {
                                const fp = floorPricing.filter(p => p.rooms_en === u.unit_type || p.rooms_en === u.unit_type?.replace(/(\d)BR/, '$1 B/R'));
                                if (!fp.length) return null;
                                const minPsf = Math.min(...fp.map((p: R) => p.min_psf || Infinity));
                                const maxPsf = Math.max(...fp.map((p: R) => p.max_psf || 0));
                                const txns = fp.reduce((a: number, p: R) => a + (p.txn_count || 0), 0);
                                return <div style={{ color: colors.green, fontFamily: FONT_DATA }}>DLD: {fmt(minPsf)}–{fmt(maxPsf)} PSF ({txns} txns)</div>;
                              })()}
                            </div>
                          </PCard>
                        ))}
                      </Section>

                      {dldSummary.length > 0 && (
                        <Section title="DLD Price Summary (2025+)" subtitle="Aggregated from verified DLD transactions" colors={colors}>
                          {dldSummary.map((d, i) => (
                            <PCard key={i} colors={colors} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <span style={{ fontSize: 14, color: colors.text }}>{d.rooms_en}</span>
                                <span style={{ fontSize: 11, color: colors.textDim, marginLeft: 8 }}>{d.txn_count} transactions</span>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 13, color: colors.text }}>AED {fmt(d.min_price)} — {fmt(d.max_price)}</div>
                                <div style={{ fontSize: 10, color: colors.gold }}>Avg: AED {fmt(d.avg_price)} · {fmt(d.avg_psf)}/sqft</div>
                              </div>
                            </PCard>
                          ))}
                        </Section>
                      )}
                    </div>
                  )}

                  {/* ORIENTATION */}
                  {tab === 'orientation' && (
                    <div>
                      <Section title="Orientation Intelligence" subtitle="What faces where — and what it means for your investment" accent colors={colors}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <PCard colors={colors}>
                            <div className="za-data-label" style={{ color: colors.green }}>BEST DIRECTION</div>
                            <div style={{ fontSize: 16, fontWeight: 400, marginTop: 6, color: colors.text }}>{sel.apt_best_direction || sel.orientation_primary}</div>
                            {sel.apt_best_floor_range && <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>Best floors: {sel.apt_best_floor_range}</div>}
                          </PCard>
                          <PCard colors={colors}>
                            <div className="za-data-label" style={{ color: colors.red }}>CAUTION DIRECTION</div>
                            <div style={{ fontSize: 16, fontWeight: 400, marginTop: 6, color: colors.text }}>{sel.apt_worst_direction || '—'}</div>
                            {sel.apt_noise_floor_threshold && <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>Noise attenuates above floor {sel.apt_noise_floor_threshold}</div>}
                          </PCard>
                        </div>
                        {(sel.apt_floor_premium_pct || sel.apt_view_premium_pct) && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                            {sel.apt_floor_premium_pct && <PCard colors={colors}>
                              <div className="za-data-label">FLOOR PREMIUM</div>
                              <div style={{ fontSize: 24, fontWeight: 300, color: colors.gold, marginTop: 4 }}>+{sel.apt_floor_premium_pct}%<span style={{ fontSize: 12, color: colors.textDim }}>/floor</span></div>
                            </PCard>}
                            {sel.apt_view_premium_pct && <PCard colors={colors}>
                              <div className="za-data-label">VIEW PREMIUM</div>
                              <div style={{ fontSize: 24, fontWeight: 300, color: colors.gold, marginTop: 4 }}>+{sel.apt_view_premium_pct}%</div>
                            </PCard>}
                          </div>
                        )}
                        {sel.orientation_views?.length > 0 && (
                          <PCard colors={colors} style={{ marginTop: 12 }}>
                            <div className="za-data-label" style={{ marginBottom: 8 }}>AVAILABLE VIEWS</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {sel.orientation_views.map((v: string, i: number) => (
                                <span key={i} className="za-badge" style={{ padding: '4px 10px', background: colors.goldBg, border: `1px solid ${colors.gold}44`, color: colors.textSecondary }}>
                                  {v.replace(/_/g, ' ')}
                                </span>
                              ))}
                            </div>
                          </PCard>
                        )}
                      </Section>
                    </div>
                  )}

                  {/* VIEW BLOCKING */}
                  {tab === 'viewblock' && (
                    <div>
                      <Section title="View Blocking Analysis" subtitle="Nearby buildings that may obstruct views — from GIS + satellite analysis" accent colors={colors}>
                        {viewBlocking.length === 0 ? (
                          <>
                            {/* Orientation intelligence fallback when no GIS data */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                              <PCard colors={colors}>
                                <div className="za-data-label" style={{ color: colors.green }}>BEST DIRECTION</div>
                                <div style={{ fontSize: 16, fontWeight: 400, marginTop: 6, color: colors.text }}>{sel.apt_best_direction || sel.orientation_primary || '—'}</div>
                                {sel.apt_best_floor_range && <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>Best floors: {sel.apt_best_floor_range}</div>}
                              </PCard>
                              <PCard colors={colors}>
                                <div className="za-data-label" style={{ color: colors.red }}>CAUTION DIRECTION</div>
                                <div style={{ fontSize: 16, fontWeight: 400, marginTop: 6, color: colors.text }}>{sel.apt_worst_direction || '—'}</div>
                                {sel.apt_noise_floor_threshold && <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>Noise above floor {sel.apt_noise_floor_threshold}</div>}
                              </PCard>
                            </div>
                            {(sel.apt_floor_premium_pct || sel.apt_view_premium_pct) && (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                                {sel.apt_floor_premium_pct && <PCard colors={colors}>
                                  <div className="za-data-label">FLOOR PREMIUM</div>
                                  <div style={{ fontSize: 24, fontWeight: 300, color: colors.gold, marginTop: 4 }}>+{sel.apt_floor_premium_pct}%<span style={{ fontSize: 12, color: colors.textDim }}>/floor</span></div>
                                  <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 4 }}>Average price increase per floor level</div>
                                </PCard>}
                                {sel.apt_view_premium_pct && <PCard colors={colors}>
                                  <div className="za-data-label">VIEW PREMIUM</div>
                                  <div style={{ fontSize: 24, fontWeight: 300, color: colors.gold, marginTop: 4 }}>+{sel.apt_view_premium_pct}%</div>
                                  <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 4 }}>Best vs worst direction price gap</div>
                                </PCard>}
                              </div>
                            )}
                            {sel.orientation_views?.length > 0 && (
                              <PCard colors={colors} style={{ marginBottom: 16 }}>
                                <div className="za-data-label" style={{ marginBottom: 8 }}>AVAILABLE VIEWS</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                  {sel.orientation_views.map((v: string, i: number) => (
                                    <span key={i} className="za-badge" style={{ padding: '4px 10px', background: colors.goldBg, border: `1px solid ${colors.gold}44`, color: colors.textSecondary }}>
                                      {v.replace(/_/g, ' ')}
                                    </span>
                                  ))}
                                </div>
                              </PCard>
                            )}
                            {sel.orientation_primary && (
                              <PCard colors={colors} style={{ marginBottom: 16 }}>
                                <div className="za-data-label" style={{ marginBottom: 8 }}>BUILDING ORIENTATION SUMMARY</div>
                                <div style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.7 }}>
                                  {sel.project_name} has a primary orientation of {sel.orientation_primary}.
                                  {sel.apt_best_direction && ` The best direction is ${sel.apt_best_direction}`}
                                  {sel.apt_worst_direction && `, while ${sel.apt_worst_direction} should be approached with caution`}
                                  {sel.apt_noise_floor_threshold && ` (noise attenuates above floor ${sel.apt_noise_floor_threshold})`}.
                                  {sel.apt_view_premium_pct && ` The view premium between best and worst direction is approximately ${sel.apt_view_premium_pct}%.`}
                                  {sel.apt_floor_premium_pct && ` Each floor adds roughly ${sel.apt_floor_premium_pct}% to the price.`}
                                </div>
                              </PCard>
                            )}
                            <div className="za-signal-box za-signal-box--gold" style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 10, color: colors.gold, fontWeight: 600, marginBottom: 4 }}>GIS VIEW BLOCKING DATA</div>
                              <div style={{ fontSize: 11, color: colors.textSecondary }}>
                                Building-by-building view blocking analysis is not yet available for {sel.master_community}.
                                Currently covers: Downtown Dubai, Business Bay, Dubai Hills, Arabian Ranches III, City Walk, DIFC.
                                The orientation data above is derived from brochure and transaction analysis, not satellite imagery.
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                              <PCard colors={colors}>
                                <div className="za-data-label">THREATS DETECTED</div>
                                <div style={{ fontSize: 28, fontWeight: 300, color: isDark ? '#FBBF24' : '#D4850A' }}>{viewBlocking.length}</div>
                                <div style={{ fontSize: 10, color: colors.textSecondary }}>blocking risks in area</div>
                              </PCard>
                              <PCard colors={colors}>
                                <div className="za-data-label">HIGHEST RISK</div>
                                <div style={{ fontSize: 28, fontWeight: 300, color: viewBlocking[0]?.risk_score > 70 ? colors.red : viewBlocking[0]?.risk_score > 40 ? colors.orange : colors.green }}>{viewBlocking[0]?.risk_score || 0}</div>
                                <div style={{ fontSize: 10, color: colors.textSecondary }}>{viewBlocking[0]?.risk_label || '—'}</div>
                              </PCard>
                              <PCard colors={colors}>
                                <div className="za-data-label">SAFE ABOVE FLOOR</div>
                                <div style={{ fontSize: 28, fontWeight: 300, color: colors.green }}>{viewBlocking[0]?.min_safe_floor || sel.apt_best_floor_range || '—'}</div>
                                <div style={{ fontSize: 10, color: colors.textSecondary }}>for unobstructed views</div>
                              </PCard>
                            </div>
                            {viewBlocking.slice(0, 10).map((vb: R, i: number) => (
                              <PCard key={i} colors={colors} style={{ marginBottom: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                  <div>
                                    <div style={{ fontSize: 14, fontWeight: 500, color: colors.text }}>{vb.blocker_name}</div>
                                    <div style={{ fontSize: 10, color: colors.textDim, marginTop: 2 }}>
                                      {vb.blocker_distance_m}m away · {vb.blocker_floors} floors · {vb.blocker_direction}
                                    </div>
                                  </div>
                                  <div style={{ textAlign: 'right' }}>
                                    <Badge color={vb.risk_score > 70 ? colors.red : vb.risk_score > 40 ? colors.orange : colors.green} label={vb.risk_label || `RISK: ${vb.risk_score}`} />
                                    <div style={{ fontSize: 10, color: colors.textDim, marginTop: 2 }}>{vb.blocker_status}</div>
                                  </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                                  <div style={{ padding: 6, background: colors.bg, borderRadius: 3, textAlign: 'center' }}>
                                    <div style={{ fontSize: 8, color: colors.textDim }}>BLOCKED</div>
                                    <div style={{ fontSize: 14, color: vb.pct_blocked > 30 ? colors.red : vb.pct_blocked > 15 ? colors.orange : colors.green }}>{vb.pct_blocked}%</div>
                                  </div>
                                  <div style={{ padding: 6, background: colors.bg, borderRadius: 3, textAlign: 'center' }}>
                                    <div style={{ fontSize: 8, color: colors.textDim }}>SEVERITY</div>
                                    <div style={{ fontSize: 11, color: vb.block_severity === 'critical' ? colors.red : vb.block_severity === 'major' ? colors.orange : colors.green }}>{vb.block_severity?.toUpperCase()}</div>
                                  </div>
                                  <div style={{ padding: 6, background: colors.bg, borderRadius: 3, textAlign: 'center' }}>
                                    <div style={{ fontSize: 8, color: colors.textDim }}>VIEW AT RISK</div>
                                    <div style={{ fontSize: 11, color: colors.gold }}>{vb.view_name}</div>
                                  </div>
                                  <div style={{ padding: 6, background: colors.bg, borderRadius: 3, textAlign: 'center' }}>
                                    <div style={{ fontSize: 8, color: colors.textDim }}>SAFE FLOOR</div>
                                    <div style={{ fontSize: 14, color: colors.green }}>{vb.safe_above_floor || vb.min_safe_floor || '—'}</div>
                                  </div>
                                </div>
                                {vb.view_salvageable === false && (
                                  <div style={{ marginTop: 6, padding: 4, background: colors.red + '0a', borderRadius: 3, border: `1px solid ${colors.red}22` }}>
                                    <span style={{ fontSize: 9, color: colors.red }}>VIEW NOT SALVAGEABLE — permanently blocked regardless of floor</span>
                                  </div>
                                )}
                              </PCard>
                            ))}
                          </>
                        )}
                      </Section>
                    </div>
                  )}

                  {/* COMMUNITY INTEL (Villas) */}
                  {tab === 'community' && isVilla && (
                    <div>
                      <Section title="Villa Community Intelligence" accent colors={colors}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <PCard colors={colors}>
                            <div className="za-data-label">HIGHWAY PROXIMITY</div>
                            <div style={{ fontSize: 20, fontWeight: 300, color: sel.villa_highway_noise_risk === 'low' ? colors.green : colors.orange, marginTop: 6 }}>{sel.villa_highway_distance_m}m</div>
                            <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{sel.villa_highway_name}</div>
                          </PCard>
                          <PCard colors={colors}>
                            <div className="za-data-label">NEAREST SCHOOL</div>
                            <div style={{ fontSize: 14, color: colors.text, marginTop: 6 }}>{sel.villa_nearest_school}</div>
                            <div style={{ fontSize: 12, color: colors.gold, marginTop: 2 }}>{sel.villa_school_proximity_km}km away</div>
                          </PCard>
                          <PCard colors={colors}>
                            <div className="za-data-label">COMMUNITY</div>
                            <div style={{ fontSize: 16, color: colors.text, marginTop: 6, textTransform: 'capitalize' }}>{sel.villa_community_maturity?.replace(/_/g, ' ')}</div>
                            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                              {sel.villa_gated && <Badge color={colors.green} label="GATED" />}
                              {sel.villa_private_pool && <Badge color={colors.blue} label="PRIVATE POOL" />}
                            </div>
                          </PCard>
                          <PCard colors={colors}>
                            <div className="za-data-label">PLOT & GARDEN</div>
                            {sel.villa_plot_size_sqft && <div style={{ fontSize: 14, color: colors.text, marginTop: 6 }}>Plot: {fmt(sel.villa_plot_size_sqft)} sqft</div>}
                            {sel.villa_garden_size_sqft && <div style={{ fontSize: 12, color: colors.green }}>Garden: {fmt(sel.villa_garden_size_sqft)} sqft</div>}
                          </PCard>
                        </div>
                      </Section>
                    </div>
                  )}

                  {/* OFF-PLAN STATUS */}
                  {tab === 'offplan' && isOffplan && (
                    <div>
                      <Section title="Construction & Delivery Status" accent colors={colors}>
                        <PCard colors={colors}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                            <div>
                              <div className="za-data-label">CONSTRUCTION PROGRESS</div>
                              <div style={{ fontSize: 36, fontWeight: 300, color: isDark ? '#FBBF24' : '#D4850A', marginTop: 4 }}>{sel.offplan_construction_pct || 0}%</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div className="za-data-label">EXPECTED HANDOVER</div>
                              <div className="za-data-value-lg" style={{ marginTop: 4 }}>{sel.offplan_expected_handover?.slice(0, 7) || 'TBD'}</div>
                            </div>
                          </div>
                          <div style={{ height: 12, background: isDark ? '#1a1b22' : colors.cardBg, borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
                            <div style={{ width: `${sel.offplan_construction_pct || 0}%`, height: '100%', borderRadius: 6, background: `linear-gradient(90deg, ${colors.red}, ${isDark ? '#FBBF24' : '#D4850A'}, ${colors.green})` }} />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                            <div style={{ padding: 12, background: colors.bg, borderRadius: 4, textAlign: 'center' }}>
                              <div className="za-data-label">DEV DELAY HISTORY</div>
                              <div style={{ fontSize: 20, color: sel.offplan_developer_delay_history_months > 6 ? colors.orange : colors.green, marginTop: 4 }}>{sel.offplan_developer_delay_history_months || 0} mo</div>
                            </div>
                            <div style={{ padding: 12, background: colors.bg, borderRadius: 4, textAlign: 'center' }}>
                              <div className="za-data-label">ESCROW STATUS</div>
                              <div style={{ fontSize: 14, color: sel.offplan_escrow_status === 'active' ? colors.green : colors.orange, marginTop: 4 }}>{sel.offplan_escrow_status?.toUpperCase() || '—'}</div>
                            </div>
                            <div style={{ padding: 12, background: colors.bg, borderRadius: 4, textAlign: 'center' }}>
                              <div className="za-data-label">RESALE PREMIUM</div>
                              <div style={{ fontSize: 20, color: colors.green, marginTop: 4 }}>+{sel.offplan_resale_premium_pct || 0}%</div>
                            </div>
                          </div>
                        </PCard>
                      </Section>
                    </div>
                  )}

                  {/* DLD EVIDENCE */}
                  {tab === 'evidence' && (
                    <div>
                      <Section title="DLD Transaction Evidence" subtitle="Real sales registered with Dubai Land Department." accent colors={colors}>
                        {dldRecent.length === 0 ? (
                          <PCard colors={colors}><div style={{ color: colors.textDim, textAlign: 'center', padding: 20 }}>No recent DLD transactions linked (project_name: {sel.project_name || 'not mapped'})</div></PCard>
                        ) : dldRecent.map((tx, i) => (
                          <PCard key={i} colors={colors} style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 13, fontWeight: 500 }}>{tx.rooms_en}</span>
                                <Badge color={colors.green} label="DLD VERIFIED" />
                              </div>
                              <div style={{ fontSize: 10, color: colors.textDim, marginTop: 3 }}>{tx.instance_date} · {fmt(tx.sqft)} sqft · {tx.reg_type_en}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div className="za-data-value-lg" style={{ fontSize: 16 }}>AED {fmt(tx.price_aed)}</div>
                              <div style={{ fontSize: 11, color: colors.gold }}>AED {fmt(tx.price_per_sqft)}/sqft</div>
                            </div>
                          </PCard>
                        ))}
                      </Section>
                    </div>
                  )}

                  {/* EJARI RENTALS */}
                  {tab === 'rentals' && (
                    <div>
                      <Section title="Ejari Rental Market" subtitle={`xray_ejari_summary · project_number: ${sel.rera_registration_no || 'not mapped'}`} accent colors={colors}>
                        {ejari.length === 0 ? (
                          <PCard colors={colors}><div style={{ color: colors.textDim, textAlign: 'center', padding: 20 }}>No Ejari rental data for {sel.project_name || 'this project'} (rera: {sel.rera_registration_no || 'not mapped'})</div></PCard>
                        ) : ejari.map((r, i) => (
                          <PCard key={i} colors={colors} style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <div>
                                <span style={{ fontSize: 14, color: colors.text }}>{r.unit_type || r.bedrooms}</span>
                                <span style={{ fontSize: 11, color: colors.textDim, marginLeft: 8 }}>{r.contract_count} contracts</span>
                                {r.new_contracts && <span style={{ fontSize: 10, color: colors.green, marginLeft: 8 }}>{r.new_contracts} new</span>}
                              </div>
                              <Badge color={colors.green} label="EJARI VERIFIED" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                              <div style={{ padding: 8, background: colors.bg, borderRadius: 4, textAlign: 'center' }}>
                                <div className="za-data-label">MIN RENT</div>
                                <div style={{ fontSize: 14, color: colors.red, marginTop: 2 }}>AED {fmt(r.min_rent_aed || r.min_rent)}/yr</div>
                              </div>
                              <div style={{ padding: 8, background: colors.bg, borderRadius: 4, textAlign: 'center' }}>
                                <div className="za-data-label">MEDIAN RENT</div>
                                <div style={{ fontSize: 14, color: colors.gold, marginTop: 2 }}>AED {fmt(r.median_rent_aed || r.median_rent)}/yr</div>
                              </div>
                              <div style={{ padding: 8, background: colors.bg, borderRadius: 4, textAlign: 'center' }}>
                                <div className="za-data-label">AVG RENT</div>
                                <div style={{ fontSize: 14, color: colors.textSecondary, marginTop: 2 }}>AED {fmt(r.avg_rent_aed || r.avg_rent)}/yr</div>
                              </div>
                              <div style={{ padding: 8, background: colors.bg, borderRadius: 4, textAlign: 'center' }}>
                                <div className="za-data-label">MAX RENT</div>
                                <div style={{ fontSize: 14, color: colors.green, marginTop: 2 }}>AED {fmt(r.max_rent_aed || r.max_rent)}/yr</div>
                              </div>
                            </div>
                          </PCard>
                        ))}
                      </Section>
                    </div>
                  )}

                  {/* AMENITIES */}
                  {tab === 'amenities' && (
                    <div>
                      <Section title="Amenity Delivery Assessment" subtitle="What was promised vs. what exists" accent colors={colors}>
                        <PCard colors={colors} style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div className="za-data-label">DELIVERY SCORE</div>
                            <div style={{ fontSize: 28, fontWeight: 300, color: sel.amenity_delivery_score >= 90 ? colors.green : sel.amenity_delivery_score >= 70 ? colors.blue : sel.amenity_delivery_score >= 50 ? colors.orange : colors.red }}>
                              {sel.amenity_delivery_score}/100
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 12, color: colors.green }}>{amenities.filter((a: R) => a.delivery_status === 'fully_delivered').length} fully delivered</div>
                            <div style={{ fontSize: 12, color: colors.blue }}>{amenities.filter((a: R) => a.delivery_status === 'planned').length} planned</div>
                            <div style={{ fontSize: 12, color: colors.orange }}>{amenities.filter((a: R) => a.delivery_status === 'pending_verification').length} pending</div>
                          </div>
                        </PCard>
                        {amenities.length === 0 ? (
                          <PCard colors={colors}><div style={{ color: colors.textDim, textAlign: 'center', padding: 20 }}>Amenity data pending</div></PCard>
                        ) : amenities.map((a, i) => (
                          <PCard key={i} colors={colors} style={{ marginBottom: 4, display: 'grid', gridTemplateColumns: '1fr 60px auto', gap: 8, alignItems: 'center' }}>
                            <div>
                              <span style={{ fontSize: 12, color: colors.text }}>{a.amenity_name}</span>
                              <span style={{ fontSize: 10, color: colors.textDim, marginLeft: 8 }}>{a.amenity_category}</span>
                            </div>
                            {a.community_sentiment_score ? (
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 16, fontWeight: 700, color: Number(a.community_sentiment_score) >= 4 ? colors.green : Number(a.community_sentiment_score) >= 3 ? colors.gold : colors.orange, fontFamily: FONT_DATA }}>
                                  {Number(a.community_sentiment_score).toFixed(1)}
                                </div>
                                <div style={{ fontSize: 7, color: colors.textDim, textTransform: 'uppercase' }}>{a.sentiment_volume ? `${a.sentiment_volume} reviews` : '/5'}</div>
                              </div>
                            ) : <div />}
                            <Badge
                              color={a.delivery_status === 'fully_delivered' || a.delivery_status === 'exceeded' ? colors.green : a.delivery_status === 'planned' ? colors.blue : a.delivery_status === 'pending_verification' || a.delivery_status === 'partially_delivered' ? colors.orange : colors.red}
                              label={a.delivery_status?.replace(/_/g, ' ').toUpperCase()}
                            />
                          </PCard>
                        ))}
                      </Section>

                      {infra.length > 0 && (
                        <Section title="Nearby Infrastructure" colors={colors}>
                          {infra.map((inf, i) => (
                            <PCard key={i} colors={colors} style={{ marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <span style={{ fontSize: 12, color: colors.text }}>{inf.name}</span>
                                <span style={{ fontSize: 10, color: colors.textDim, marginLeft: 8 }}>{inf.infrastructure_type} · {inf.distance_km}km</span>
                              </div>
                              <Badge color={inf.status === 'operational' ? colors.green : inf.status === 'under_construction' ? colors.orange : colors.blue} label={inf.status?.replace(/_/g, ' ').toUpperCase()} />
                            </PCard>
                          ))}
                        </Section>
                      )}
                    </div>
                  )}

                  {/* FLOOR PLATE (V3 — real DLD unit registry) */}
                  {tab === 'floorplate' && hasRegistry && (() => {
                    const laid = getUnitLayout(floorUnits);
                    // Floor pricing for this floor
                    const floorNum = parseInt(selectedFloor || '0');
                    const band = floorNum <= 10 ? '1-10' : floorNum <= 20 ? '11-20' : floorNum <= 30 ? '21-30' :
                      floorNum <= 40 ? '31-40' : floorNum <= 50 ? '41-50' : floorNum <= 60 ? '51-60' : '60+';
                    const bandPricing = floorPricing.filter(fp => fp.floor_band === band);
                    return (
                    <div>
                      <Section title="Interactive Floor Plate" subtitle={`xray_unit_registry · ${unitRegistry.length} real DLD units · Floor ${selectedFloor || '—'}`} accent colors={colors}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                          <Badge color={colors.green} label="DLD GOVERNMENT DATA" />
                          <span style={{ fontSize: 9, color: colors.textDim, fontFamily: FONT_DATA }}>
                            {unitRegistry.length} units across {v3Floors.length} floors{v3Buildings.length > 1 ? ` · ${v3Buildings.length} buildings` : ''}
                          </span>
                        </div>
                        {/* Building tabs */}
                        {v3Buildings.length > 1 && (
                          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                            {v3Buildings.map(b => (
                              <button key={b} onClick={() => setSelectedBuilding(b)} style={{
                                padding: '5px 12px', borderRadius: 4, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                                fontFamily: FONT_DATA, letterSpacing: 0.5,
                                background: selectedBuilding === b ? colors.goldBg : colors.cardBg,
                                border: `1px solid ${selectedBuilding === b ? colors.gold : colors.border}`,
                                color: selectedBuilding === b ? colors.gold : colors.textSecondary,
                              }}>BLDG {b}</button>
                            ))}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 12 }}>
                          {/* Floor selector */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', minWidth: 36 }}>
                            <div style={{ fontSize: 8, color: colors.textDim, fontFamily: FONT_DATA, marginBottom: 4 }}>FLOOR</div>
                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 400 }}>
                              {[...v3Floors].reverse().map(f => (
                                <button key={f} onClick={() => setSelectedFloor(f)} style={{
                                  width: 32, padding: '3px 0', fontSize: 9, fontFamily: FONT_DATA,
                                  textAlign: 'center', borderRadius: 3, cursor: 'pointer', border: 'none',
                                  background: f === selectedFloor ? colors.gold : colors.cardBg,
                                  color: f === selectedFloor ? colors.bg : colors.textSecondary,
                                  fontWeight: f === selectedFloor ? 700 : 400,
                                }}>{f}</button>
                              ))}
                            </div>
                          </div>
                          {/* SVG floor plate */}
                          <div style={{ flex: 1, position: 'relative' }}>
                            <svg viewBox="0 0 106 94" style={{ width: '100%', background: isDark ? '#0a0b0f' : '#f5f5f0', borderRadius: 8, border: `1px solid ${colors.border}` }}>
                              {/* Direction labels */}
                              {surroundings.filter(s => ['N','S','E','W'].includes(s.direction)).map(s => {
                                const pos: Record<string, {x: number; y: number}> = { N: {x:53,y:4}, S: {x:53,y:92}, E: {x:103,y:47}, W: {x:3,y:47} };
                                const p = pos[s.direction] || {x:53,y:47};
                                return <text key={s.direction} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize="4" fill={surrTypeColor[s.type] || colors.textDim} fontWeight="700">{s.direction}</text>;
                              })}
                              {/* Core/lift shaft */}
                              <rect x={46} y={40} width={14} height={14} rx={2} fill={isDark ? '#1a1b22' : '#e0e0e0'} stroke={colors.border} strokeWidth={0.3} />
                              <text x={53} y={48} textAnchor="middle" fontSize="3" fill={colors.textDim}>CORE</text>
                              {/* Units */}
                              {laid.map((u: R) => {
                                const fillColor = typeColor[u.rooms_en] || '#555';
                                const isHov = hoveredUnit?.unit_number === u.unit_number;
                                return (
                                  <g key={u.unit_number}
                                    onMouseEnter={() => setHoveredUnit({ ...u, _pricing: getUnitPricing(u) })}
                                    onMouseLeave={() => setHoveredUnit(null)}
                                    style={{ cursor: 'pointer' }}>
                                    <rect x={u._x} y={u._y} width={u._w} height={u._h} rx={1}
                                      fill={fillColor + (isHov ? 'FF' : '88')}
                                      stroke={isHov ? colors.gold : colors.border} strokeWidth={isHov ? 0.8 : 0.3} />
                                    <text x={u._x + u._w / 2} y={u._y + u._h / 2 - 1.5} textAnchor="middle" fontSize="3" fontWeight="700" fill={isDark ? '#fff' : '#000'}>{u.rooms_en || '—'}</text>
                                    <text x={u._x + u._w / 2} y={u._y + u._h / 2 + 2} textAnchor="middle" fontSize="2.2" fill={isDark ? '#aaa' : '#666'}>{fmt(u.area_sqft)}sf</text>
                                    <text x={u._x + u._w / 2} y={u._y + u._h / 2 + 4.5} textAnchor="middle" fontSize="2" fill={isDark ? '#888' : '#999'}>{u.unit_number}</text>
                                  </g>
                                );
                              })}
                              {laid.length === 0 && (
                                <text x={53} y={47} textAnchor="middle" fontSize="4" fill={colors.textDim}>No units on this floor</text>
                              )}
                            </svg>
                            {/* Hover tooltip */}
                            {hoveredUnit && (
                              <div style={{
                                position: 'absolute', top: 8, right: 8, background: colors.surface,
                                border: `1px solid ${colors.gold}`, borderRadius: 8, padding: 12,
                                minWidth: 220, boxShadow: `0 4px 20px ${colors.bg}88`, zIndex: 10,
                              }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>
                                  Unit {hoveredUnit.unit_number} · {hoveredUnit.rooms_en}
                                </div>
                                <div style={{ fontSize: 10, color: colors.textSecondary, marginBottom: 4 }}>
                                  Floor {hoveredUnit.floor}{hoveredUnit.building_number ? ` · Building ${hoveredUnit.building_number}` : ''} · {fmt(hoveredUnit.area_sqft)} sqft
                                </div>
                                {hoveredUnit._pricing ? (
                                  <div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
                                      <div style={{ padding: 6, background: colors.bg, borderRadius: 4, textAlign: 'center' }}>
                                        <div style={{ fontSize: 8, color: colors.textDim }}>EST. PRICE</div>
                                        <div style={{ fontSize: 12, color: colors.gold, fontWeight: 700, fontFamily: FONT_DATA }}>AED {fmtM(hoveredUnit._pricing.estPrice)}</div>
                                        <div style={{ fontSize: 8, color: colors.textDim }}>{fmt(hoveredUnit._pricing.avgPsf)}/sqft</div>
                                      </div>
                                      <div style={{ padding: 6, background: colors.bg, borderRadius: 4, textAlign: 'center' }}>
                                        <div style={{ fontSize: 8, color: colors.textDim }}>PSF RANGE</div>
                                        <div style={{ fontSize: 11, color: colors.textSecondary, fontFamily: FONT_DATA }}>{fmt(hoveredUnit._pricing.minPsf)} — {fmt(hoveredUnit._pricing.maxPsf)}</div>
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: colors.textDim }}>
                                      <span>Floor band: {hoveredUnit._pricing.floorBand} · {hoveredUnit._pricing.txnCount} txns</span>
                                      <ConfBadge confidence={hoveredUnit._pricing.confidence} />
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ fontSize: 10, color: colors.textDim }}>No floor pricing data for {hoveredUnit.rooms_en}</div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Floor pricing for this band */}
                        {bandPricing.length > 0 && (
                          <div style={{ marginTop: 16 }}>
                            <div style={{ fontSize: 10, color: colors.textDim, fontFamily: FONT_DATA, marginBottom: 8 }}>FLOOR BAND {band} PRICING</div>
                            {bandPricing.map((fp, i) => (
                              <PCard key={i} colors={colors} style={{ marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ width: 4, height: 20, borderRadius: 2, background: typeColor[fp.rooms_en] || colors.textDim }} />
                                  <span style={{ fontSize: 13, color: colors.text }}>{fp.rooms_en}</span>
                                  <span style={{ fontSize: 10, color: colors.textDim }}>{fp.txn_count} txns</span>
                                  <ConfBadge confidence={fp.confidence} />
                                </div>
                                <div style={{ textAlign: 'right', fontFamily: FONT_DATA }}>
                                  <div style={{ fontSize: 13, color: colors.gold }}>AED {fmt(fp.avg_psf)}/sqft</div>
                                  <div style={{ fontSize: 9, color: colors.textDim }}>{fmt(fp.min_psf)} — {fmt(fp.max_psf)}</div>
                                </div>
                              </PCard>
                            ))}
                          </div>
                        )}
                        {/* Legend */}
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14, padding: '10px 0', borderTop: `1px solid ${colors.border}` }}>
                          {Object.entries(typeColor).map(([type, col]) => (
                            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: colors.textSecondary }}>
                              <div style={{ width: 10, height: 10, borderRadius: 2, background: col + '88' }} />{type}
                            </div>
                          ))}
                        </div>
                        <div style={{ fontSize: 9, color: colors.textDim, marginTop: 6 }}>
                          Source: DLD government unit registry. {unitRegistry.length} units mapped from official records.
                        </div>
                      </Section>
                    </div>
                    );
                  })()}

                  {/* FLOOR PRICING (V3) */}
                  {tab === 'floorpricing' && hasFloorPricing && (() => {
                    // Group by rooms_en
                    const roomTypes = [...new Set(floorPricing.map(fp => fp.rooms_en))].sort();
                    const bandOrder = ['1-10','11-20','21-30','31-40','41-50','51-60','60+','unknown'];
                    // Floor premium calc
                    const lowBands = floorPricing.filter(fp => fp.floor_band === '1-10');
                    const highBands = floorPricing.filter(fp => fp.floor_band === '41-50' || fp.floor_band === '51-60' || fp.floor_band === '60+');
                    const lowAvg = lowBands.length ? lowBands.reduce((a, fp) => a + fp.avg_psf, 0) / lowBands.length : 0;
                    const highAvg = highBands.length ? highBands.reduce((a, fp) => a + fp.avg_psf, 0) / highBands.length : 0;
                    const floorPremium = lowAvg > 0 ? ((highAvg - lowAvg) / lowAvg * 100).toFixed(1) : null;
                    const totalTxns = floorPricing.reduce((a, fp) => a + (fp.txn_count || 0), 0);
                    const totalExact = floorPricing.reduce((a, fp) => a + (fp.exact_matches || 0), 0);
                    return (
                    <div>
                      <Section title="Floor-Band Pricing" subtitle={`xray_floor_pricing · PSF by floor band from ${totalTxns} matched DLD transactions`} accent colors={colors}>
                        {/* Headline stats */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                          <PCard colors={colors}>
                            <div className="za-data-label">TOTAL TRANSACTIONS</div>
                            <div className="za-data-value-lg" style={{ marginTop: 4 }}>{fmt(totalTxns)}</div>
                          </PCard>
                          <PCard colors={colors}>
                            <div className="za-data-label">EXACT FLOOR MATCHES</div>
                            <div className="za-data-value-lg" style={{ marginTop: 4 }}>{fmt(totalExact)}</div>
                          </PCard>
                          {floorPremium && (
                            <PCard colors={colors}>
                              <div className="za-data-label">HIGH vs LOW FLOOR PREMIUM</div>
                              <div style={{ fontSize: 24, fontWeight: 300, color: colors.gold, marginTop: 4 }}>+{floorPremium}%</div>
                            </PCard>
                          )}
                        </div>
                        {/* PSF heatmap by room type and floor band */}
                        {roomTypes.map(room => {
                          const rows = floorPricing.filter(fp => fp.rooms_en === room).sort((a, b) => bandOrder.indexOf(a.floor_band) - bandOrder.indexOf(b.floor_band));
                          const rc = typeColor[room] || colors.textDim;
                          return (
                            <div key={room} style={{ marginBottom: 16 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <div style={{ width: 4, height: 16, borderRadius: 2, background: rc }} />
                                <span style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>{room}</span>
                                <span style={{ fontSize: 10, color: colors.textDim }}>{rows.reduce((a, r) => a + (r.txn_count || 0), 0)} txns</span>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(rows.length, 7)}, 1fr)`, gap: 4 }}>
                                {rows.map((fp, i) => {
                                  const maxPsfAll = Math.max(...floorPricing.filter(p => p.rooms_en === room).map(p => p.avg_psf || 0));
                                  const minPsfAll = Math.min(...floorPricing.filter(p => p.rooms_en === room).map(p => p.avg_psf || Infinity));
                                  const range = maxPsfAll - minPsfAll || 1;
                                  const intensity = (fp.avg_psf - minPsfAll) / range;
                                  return (
                                    <PCard key={i} colors={colors} style={{
                                      textAlign: 'center', padding: 8,
                                      background: `${rc}${Math.round(10 + intensity * 30).toString(16).padStart(2, '0')}`,
                                      border: `1px solid ${rc}44`,
                                    }}>
                                      <div style={{ fontSize: 8, color: colors.textDim, fontFamily: FONT_DATA }}>{fp.floor_band}</div>
                                      <div style={{ fontSize: 14, fontWeight: 700, color: colors.text, fontFamily: FONT_DATA, marginTop: 2 }}>{fmt(Math.round(fp.avg_psf))}</div>
                                      <div style={{ fontSize: 8, color: colors.textDim }}>PSF</div>
                                      <div style={{ fontSize: 8, color: colors.textDim, marginTop: 2 }}>{fp.txn_count} txns</div>
                                      <ConfBadge confidence={fp.confidence} />
                                    </PCard>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                        {/* Detailed table */}
                        <div style={{ marginTop: 20 }}>
                          <div style={{ fontSize: 10, color: colors.textDim, fontFamily: FONT_DATA, marginBottom: 8 }}>DETAILED BREAKDOWN</div>
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                              <thead>
                                <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                                  {['Type', 'Floor Band', 'Avg PSF', 'Min', 'Max', 'Avg Price', 'Txns', 'Exact', 'Confidence'].map(h => (
                                    <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 9, color: colors.textDim, fontFamily: FONT_DATA, fontWeight: 600 }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {floorPricing.sort((a, b) => bandOrder.indexOf(a.floor_band) - bandOrder.indexOf(b.floor_band)).map((fp, i) => (
                                  <tr key={i} style={{ borderBottom: `1px solid ${colors.border}22` }}>
                                    <td style={{ padding: '5px 8px', color: typeColor[fp.rooms_en] || colors.text }}>{fp.rooms_en}</td>
                                    <td style={{ padding: '5px 8px', fontFamily: FONT_DATA }}>{fp.floor_band}</td>
                                    <td style={{ padding: '5px 8px', fontFamily: FONT_DATA, color: colors.gold }}>{fmt(Math.round(fp.avg_psf))}</td>
                                    <td style={{ padding: '5px 8px', fontFamily: FONT_DATA, color: colors.textDim }}>{fmt(Math.round(fp.min_psf))}</td>
                                    <td style={{ padding: '5px 8px', fontFamily: FONT_DATA, color: colors.textDim }}>{fmt(Math.round(fp.max_psf))}</td>
                                    <td style={{ padding: '5px 8px', fontFamily: FONT_DATA }}>{fmtM(Math.round(fp.avg_price))}</td>
                                    <td style={{ padding: '5px 8px', fontFamily: FONT_DATA }}>{fp.txn_count}</td>
                                    <td style={{ padding: '5px 8px', fontFamily: FONT_DATA }}>{fp.exact_matches || 0}</td>
                                    <td style={{ padding: '5px 8px' }}><ConfBadge confidence={fp.confidence} /></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        <div style={{ fontSize: 9, color: colors.textDim, marginTop: 12, lineHeight: 1.5 }}>
                          Computed from {totalTxns} DLD transactions matched to unit registry via area fingerprinting. {totalExact} exact floor matches.
                        </div>
                      </Section>
                    </div>
                    );
                  })()}

                  {/* SURROUNDINGS (V3 — 3x3 compass grid) */}
                  {tab === 'surroundings' && hasSurroundings && (
                    <div>
                      <Section title="8-Direction Surroundings" subtitle={`xray_surroundings · ${surroundings.length} directions mapped`} accent colors={colors}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, maxWidth: 600, margin: '0 auto' }}>
                          {['NW','N','NE','W','CENTER','E','SW','S','SE'].map(dir => {
                            if (dir === 'CENTER') {
                              return (
                                <PCard key="CENTER" colors={colors} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: colors.goldBg }}>
                                  <div style={{ fontSize: 14, fontWeight: 600, color: colors.gold }}>{sel.project_name}</div>
                                  <div style={{ fontSize: 10, color: colors.textDim, marginTop: 4 }}>
                                    {sel.total_floors ? `${sel.total_floors} floors` : ''}{sel.total_units ? ` · ~${fmt(sel.total_units)} units` : ''}
                                  </div>
                                  {selectedFloor && <div style={{ fontSize: 9, color: colors.textDim, marginTop: 2 }}>{floorUnits.length} units on F{selectedFloor}</div>}
                                </PCard>
                              );
                            }
                            const s = surroundings.find(sr => sr.direction === dir);
                            if (!s) return (
                              <PCard key={dir} colors={colors} style={{ opacity: 0.3, textAlign: 'center', minHeight: 80, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: colors.textDim }}>{dir}</div>
                                <div style={{ fontSize: 9, color: colors.textDim }}>No data</div>
                              </PCard>
                            );
                            const tc = surrTypeColor[s.type] || colors.textDim;
                            return (
                              <PCard key={dir} colors={colors} style={{ borderTop: `3px solid ${tc}`, minHeight: 80 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                  <span style={{ fontSize: 16 }}>{s.icon || '📍'}</span>
                                  <span style={{
                                    fontSize: 7, fontWeight: 700, padding: '2px 5px', borderRadius: 3,
                                    background: tc + '20', color: tc, textTransform: 'uppercase',
                                  }}>{s.type}</span>
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: colors.text, marginBottom: 2 }}>{dir}</div>
                                <div style={{ fontSize: 10, color: colors.textSecondary, lineHeight: 1.4 }}>{s.what}</div>
                                {s.note && <div style={{ fontSize: 9, color: colors.textDim, marginTop: 3, fontStyle: 'italic' }}>{s.note}</div>}
                              </PCard>
                            );
                          })}
                        </div>
                        {/* Legend */}
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14, padding: '10px 0', borderTop: `1px solid ${colors.border}` }}>
                          {Object.entries(surrTypeColor).map(([type, col]) => (
                            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: colors.textSecondary }}>
                              <div style={{ width: 10, height: 10, borderRadius: 2, background: col + '44', border: `1px solid ${col}` }} />
                              {type}
                            </div>
                          ))}
                        </div>
                      </Section>
                    </div>
                  )}

                  {/* ZA INSIGHTS / HONEST ASSESSMENT */}
                  {tab === 'insights' && (
                    <div>
                      {hasInsights ? (
                        <Section title="ZA Insights" subtitle="Every insight computed from DLD, Ejari, or Mollak — no manual opinions" accent colors={colors}>
                          {zaInsights.map((zi, i) => {
                            const tc = insightTypeColor[zi.insight_type] || colors.textDim;
                            return (
                              <PCard key={i} colors={colors} style={{ marginBottom: 10, borderLeft: `3px solid ${tc}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                  <span style={{
                                    fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 3,
                                    background: tc + '20', color: tc, textTransform: 'uppercase', letterSpacing: 0.5,
                                  }}>{zi.insight_type?.replace(/_/g, ' ')}</span>
                                  <ConfBadge confidence={zi.confidence} />
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 4 }}>{zi.title}</div>
                                <div style={{ fontSize: 11, color: colors.textSecondary, lineHeight: 1.7 }}>{zi.insight}</div>
                                {zi.data_source && (
                                  <div style={{ fontSize: 9, color: colors.textDim, marginTop: 6, fontFamily: FONT_DATA }}>
                                    Source: {zi.data_source}{zi.computed_from ? ` · ${zi.computed_from}` : ''}
                                  </div>
                                )}
                              </PCard>
                            );
                          })}
                          <div className="za-signal-box za-signal-box--gold" style={{ textAlign: 'center', marginTop: 16 }}>
                            <div style={{ fontSize: 11, color: colors.textSecondary }}>
                              Every insight computed from DLD transactions, Ejari contracts, or Mollak service charges. No manual opinions.
                            </div>
                          </div>
                        </Section>
                      ) : (
                      <>
                      <Section title="What They Don't Tell You" subtitle="The honest things no marketing brochure includes" accent colors={colors}>
                        <PCard colors={colors} style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: 20 }}>{'💰'}</span>
                            <span style={{ fontSize: 15, fontWeight: 500 }}>Service Charge Reality</span>
                          </div>
                          {sel.sc_source === 'mollak_confirmed' ? (
                            <div style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.7 }}>
                              Mollak confirmed SC: AED {Number(sel.service_charge_per_sqft).toFixed(1)}/sqft ({sel.service_charge_year}).
                              {sel.sc_year_1 && ` First year recorded: AED ${Number(sel.sc_year_1).toFixed(1)}/sqft (${sel.sc_year_1_yr}).`}
                              {' '}Service charges typically increase 3-5% annually. On a {sel.size_range_sqft_min || 1000} sqft unit, that's
                              AED {fmt(Math.round((sel.service_charge_per_sqft || 0) * (sel.size_range_sqft_min || 1000)))}/year today. Factor this into yield calculations.
                            </div>
                          ) : sel.sc_source === 'rera_estimate' ? (
                            <div style={{ fontSize: 12, color: colors.orange, lineHeight: 1.7 }}>
                              No Mollak SC available yet — this is an off-plan project. RERA placeholder estimate: ~AED {Number(sel.offplan_estimated_sc).toFixed(1)}/sqft.
                              Actual SC will only be known after handover. Expect ±30% variance from estimate.
                            </div>
                          ) : (
                            <div style={{ fontSize: 12, color: colors.textDim, lineHeight: 1.7 }}>Service charge data not yet available for this project.</div>
                          )}
                        </PCard>

                        {(isApt || isOffplan) && sel.apt_worst_direction && (
                          <PCard colors={colors} style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <span style={{ fontSize: 20 }}>{'🔊'}</span>
                              <span style={{ fontSize: 15, fontWeight: 500 }}>Direction & Noise</span>
                            </div>
                            <div style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.7 }}>
                              Caution direction: {sel.apt_worst_direction}. {sel.apt_noise_floor_threshold ? `Noise attenuates significantly above floor ${sel.apt_noise_floor_threshold}.` : ''}
                              {' '}Best direction: {sel.apt_best_direction}. {sel.apt_view_premium_pct ? `The view premium between best and worst direction is approximately ${sel.apt_view_premium_pct}%.` : ''}
                              {' '}If you're noise-sensitive, avoid lower floors on the highway side — but you'll get a measurable discount.
                            </div>
                          </PCard>
                        )}

                        {isVilla && sel.villa_highway_distance_m && (
                          <PCard colors={colors} style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <span style={{ fontSize: 20 }}>{'🛣️'}</span>
                              <span style={{ fontSize: 15, fontWeight: 500 }}>Highway & Noise</span>
                            </div>
                            <div style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.7 }}>
                              {sel.villa_highway_name} is {sel.villa_highway_distance_m}m away. Noise risk: {sel.villa_highway_noise_risk}.
                              {sel.villa_highway_noise_risk === 'moderate' ? ' Perimeter villas closest to the highway will hear traffic, especially at night. Interior plots are significantly quieter.' : ' Distance is sufficient for minimal noise impact on most plots.'}
                            </div>
                          </PCard>
                        )}

                        {isOffplan && (
                          <PCard colors={colors} style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <span style={{ fontSize: 20 }}>{'⏳'}</span>
                              <span style={{ fontSize: 15, fontWeight: 500 }}>Delivery Risk</span>
                            </div>
                            <div style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.7 }}>
                              {sel.developer}'s average historical delay is {sel.offplan_developer_delay_history_months || 'unknown'} months.
                              Expected handover: {sel.offplan_expected_handover?.slice(0, 7) || 'TBD'}.
                              {sel.offplan_developer_delay_history_months > 6 ? ' This developer has a history of delays. Budget an extra 6-12 months beyond the stated date.' : ' This developer has a reasonable delivery track record.'}
                              {' '}Your capital is locked during construction with no rental income. Factor the opportunity cost.
                            </div>
                          </PCard>
                        )}

                        {ejari.length > 0 && (
                          <PCard colors={colors} style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <span style={{ fontSize: 20 }}>{'📊'}</span>
                              <span style={{ fontSize: 15, fontWeight: 500 }}>Rental Spread</span>
                            </div>
                            <div style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.7 }}>
                              {ejari.map((e: R) => {
                                const minR = e.min_rent_aed || e.min_rent || 0;
                                const maxR = e.max_rent_aed || e.max_rent || 0;
                                const spread = minR > 0 ? Math.round(((maxR - minR) / minR) * 100) : 0;
                                return `${e.unit_type || e.bedrooms}: AED ${fmt(minR)} to ${fmt(maxR)}/yr (${spread}% spread across ${e.contract_count} contracts). `;
                              }).join('')}
                              The ONLY variables are floor and orientation. The unit you pick matters more than the building you pick.
                            </div>
                          </PCard>
                        )}
                      </Section>

                      <div className="za-signal-box za-signal-box--gold" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: colors.gold, fontFamily: FONT_DATA, marginBottom: 6 }}>DATA SOURCES</div>
                        <div style={{ fontSize: 11, color: colors.textSecondary, lineHeight: 1.6 }}>
                          Transactions: DLD ({fmt(dldRecent.length)} recent).
                          Rentals: Ejari ({ejari.reduce((a: number, e: R) => a + e.contract_count, 0)} contracts).
                          Service charges: Mollak ({sel.sc_source}).
                          Amenities: community sentiment verified.
                        </div>
                        <div style={{ marginTop: 8, fontSize: 11, color: colors.gold, fontStyle: 'italic' }}>
                          Every number in this document can be independently verified. That's the point.
                        </div>
                      </div>
                      </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* FOOTER */}
            <div className="za-footer">
              <span className="za-data-label" style={{ letterSpacing: 1 }}>ZEROAGENT PROPERTY INTELLIGENCE · LIVE FROM SUPABASE</span>
              <span style={{ fontSize: 10, color: colors.textDim }}>Independent analysis. No commercial relationship with any developer.</span>
            </div>
          </>
        ) : (
          <div className="flex justify-center items-center p-20" style={{ color: colors.textDim }}>
            Select a project from the sidebar
          </div>
        )}
      </div>
    </div>
  );
}
