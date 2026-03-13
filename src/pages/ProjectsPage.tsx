import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@/lib/theme';
import { sb } from '@/lib/supabase';
import { Loader2, Search, Sun, Moon } from 'lucide-react';
import { MONO, Tag, Divider, VIEW_QUALITY_COLOR } from '@/components/xray/Atoms';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>;

const fmt = (n: number | string | null | undefined): string => n ? Number(n).toLocaleString('en-AE') : '—';
const fmtM = (n: number | null | undefined): string => {
  if (!n) return '—';
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : fmt(n);
};

function PCard({ children, style: s, colors }: { children: React.ReactNode; style?: React.CSSProperties; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <div style={{ padding: 16, background: colors.surface, borderRadius: 6, border: `1px solid ${colors.border}`, ...s }}>
      {children}
    </div>
  );
}

function Section({ title, subtitle, children, accent, colors }: { title: string; subtitle?: string; children: React.ReactNode; accent?: boolean; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ marginBottom: 16 }}>
        {accent && <div style={{ width: 32, height: 2, background: colors.gold, marginBottom: 10 }} />}
        <h2 style={{ fontSize: 18, fontWeight: 700, color: colors.text, margin: 0 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 11, color: colors.textSecondary, marginTop: 3 }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function ConfBadge({ confidence, colors }: { confidence?: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  if (confidence === 'verified') return <span style={{ fontSize: 9, color: colors.green }}>● VERIFIED</span>;
  if (confidence === 'inferred') return <span style={{ fontSize: 9, color: colors.amber }}>● INFERRED</span>;
  return <span style={{ fontSize: 9, color: colors.coral }}>● ESTIMATED</span>;
}

/* ═══════════════════════════════════════════════════
   LEFT SIDEBAR — project list with search
   ═══════════════════════════════════════════════════ */
function ProjectSidebar({ projects, sel, onSelect, colors }: {
  projects: R[]; sel: R | null; onSelect: (p: R) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const [search, setSearch] = useState('');
  const catColor = (c: string) => c === 'apartment' ? colors.blue : c === 'villa' ? colors.green : c === 'off_plan' ? colors.amber : colors.muted;
  const catLabel: Record<string, string> = { apartment: 'APT', villa: 'VILLA', off_plan: 'OFF-PLAN' };

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
      borderRight: `1px solid ${colors.border}`, background: colors.bg,
    }}>
      <div style={{ padding: '12px 12px 8px', borderBottom: `1px solid ${colors.border}` }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
          background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: 4,
        }}>
          <Search size={13} style={{ color: colors.textDim, flexShrink: 0 }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search projects..."
            style={{ background: 'none', border: 'none', outline: 'none', width: '100%', color: colors.text, fontSize: 12 }}
          />
        </div>
        <div style={{ fontSize: 9, color: colors.textDim, marginTop: 6, fontFamily: MONO }}>
          {filtered.length} OF {projects.length} PROJECTS
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.map(p => {
          const active = sel?.id === p.id;
          const cc = catColor(p.project_category);
          return (
            <div key={p.id} onClick={() => onSelect(p)} style={{
              padding: '10px 12px', cursor: 'pointer',
              background: active ? colors.goldBg : 'transparent',
              borderLeft: `3px solid ${active ? colors.gold : 'transparent'}`,
            }}>
              <div style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? colors.gold : colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.project_name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                <Tag color={cc}>{catLabel[p.project_category] || ''}</Tag>
                {p.has_unit_registry && <Tag color={colors.gold}>V3</Tag>}
                <span style={{ fontSize: 9, color: colors.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.master_community}</span>
              </div>
              {p.avg_price_per_sqft && (
                <div style={{ fontSize: 9, color: colors.textSecondary, marginTop: 2, fontFamily: MONO }}>AED {fmt(p.avg_price_per_sqft)}/sqft</div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: colors.textDim }}>No projects match "{search}"</div>}
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
  const [floorUnitMatrix, setFloorUnitMatrix] = useState<R[]>([]);
  const [matrixBuildings, setMatrixBuildings] = useState<string[]>([]);
  const [floorPricing, setFloorPricing] = useState<R[]>([]);
  const [surroundings, setSurroundings] = useState<R[]>([]);
  const [zaInsights, setZaInsights] = useState<R[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [hoveredUnit, setHoveredUnit] = useState<R | null>(null);
  // New data sources
  const [buildingShape, setBuildingShape] = useState<R[]>([]);
  const [paymentPlan, setPaymentPlan] = useState<R[]>([]);
  const [serviceCharges, setServiceCharges] = useState<R[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load project list
  useEffect(() => {
    (async () => {
      try {
        const { data, error: err } = await sb.from('xray_projects')
          .select('*')
          .not('avg_price_per_sqft', 'is', null)
          .order('avg_price_per_sqft', { ascending: false })
          .limit(300);
        if (err) { console.error('[Projects] xray_projects error:', err.message); setError(err.message); }
        setProjects(data || []);
        if (data?.length) setSel(data[0]);
      } catch (e) { console.error('[Projects] Failed:', e); setError(String(e)); }
      setLoading(false);
    })();
  }, []);

  // Load detail data when project selected
  useEffect(() => {
    if (!sel) return;
    setDetailLoading(true);
    setTab('overview');
    (async () => {
      try {
        // Batch 1: unit types, amenities, infrastructure
        const [u, a, i] = await Promise.all([
          sb.from('xray_unit_types').select('*').eq('project_id', sel.id).order('starting_price_aed', { ascending: true }),
          sb.from('xray_project_amenities').select('*').eq('project_id', sel.id).order('amenity_category', { ascending: true }),
          sb.from('xray_infrastructure').select('*').eq('project_id', sel.id).order('distance_km', { ascending: true }),
        ]);
        setUnits(u.data || []); setAmenities(a.data || []); setInfra(i.data || []);

        // Batch 2: DLD + Ejari via rera_registration_no
        if (sel.rera_registration_no) {
          const [dr, ds, ej] = await Promise.all([
            sb.from('xray_dld_recent').select('*').eq('project_number', sel.rera_registration_no).order('instance_date', { ascending: false }).limit(20),
            sb.from('xray_dld_summary').select('*').eq('project_number', sel.rera_registration_no),
            sb.from('xray_ejari_summary').select('*').eq('project_number', sel.rera_registration_no).order('unit_type', { ascending: true }),
          ]);
          setDldRecent(dr.data || []); setDldSummary(ds.data || []); setEjari(ej.data || []);
        } else { setDldRecent([]); setDldSummary([]); setEjari([]); }

        // View blocking
        const vbMap: Record<string, string> = {
          'Downtown Dubai': 'BURJ KHALIFA DISTRICT', 'Business Bay': 'BUSINESS BAY PHASE 1 & 2',
          'Dubai Hills Estate': 'DUBAI HILLS', 'Arabian Ranches III': 'ARABIAN RANCHES III',
          'City Walk': 'City Walk', 'DIFC': 'DUBAI INTERNATIONAL FINANCIAL CENTER',
        };
        const vbKey = vbMap[sel.master_community];
        if (vbKey) {
          const { data: vb } = await sb.from('xray_view_blocking').select('*').eq('observer_project', vbKey).order('risk_score', { ascending: false }).limit(20);
          setViewBlocking(vb || []);
        } else { setViewBlocking([]); }

        // Batch 3: V3 + new tables
        const [fpRes, srRes, ziRes, bsRes, ppRes, scRes] = await Promise.all([
          sb.from('xray_floor_pricing').select('*').eq('project_id', sel.id).order('rooms_en').order('floor_band'),
          sb.from('xray_surroundings').select('*').eq('project_id', sel.id).order('direction'),
          sb.from('xray_za_insights').select('*').eq('project_id', sel.id).order('sort_order'),
          sb.from('xray_building_shape').select('*').eq('project_id', sel.id),
          sb.from('xray_payment_plan').select('*').eq('project_id', sel.id).order('milestone_number'),
          sb.from('xray_service_charges').select('*').eq('project_id', sel.id).order('year', { ascending: false }),
        ]);
        setFloorPricing(fpRes.data || []); setSurroundings(srRes.data || []);
        setZaInsights(ziRes.data || []); setBuildingShape(bsRes.data || []);
        setPaymentPlan(ppRes.data || []); setServiceCharges(scRes.data || []);

        // Floor unit matrix — get building list first, then load units for first building
        const { data: bldgs } = await sb.from('xray_floor_unit_matrix')
          .select('building_number').eq('project_id', sel.id);
        const uniqueBuildings = [...new Set((bldgs || []).map((b: R) => b.building_number).filter(Boolean))].sort() as string[];
        setMatrixBuildings(uniqueBuildings);
        if (uniqueBuildings.length > 0) {
          const firstBldg = uniqueBuildings[0];
          setSelectedBuilding(firstBldg);
          const { data: mx } = await sb.from('xray_floor_unit_matrix')
            .select('*').eq('project_id', sel.id).eq('building_number', firstBldg)
            .order('floor').order('position_key');
          const mxData = mx || [];
          setFloorUnitMatrix(mxData);
          const floors = [...new Set(mxData.map((u: R) => String(u.floor)))].filter(f => /^\d+$/.test(f)).sort((a, b) => +a - +b);
          setSelectedFloor(floors[Math.floor(floors.length / 2)] || floors[0] || null);
        } else {
          setSelectedBuilding(null); setFloorUnitMatrix([]); setSelectedFloor(null);
        }
      } catch (e) { console.error('[Projects] Detail load error:', e); }
      setDetailLoading(false);
    })();
  }, [sel?.id]);

  // Load matrix when building changes
  useEffect(() => {
    if (!sel || !selectedBuilding) return;
    (async () => {
      const { data: mx } = await sb.from('xray_floor_unit_matrix')
        .select('*').eq('project_id', sel.id).eq('building_number', selectedBuilding)
        .order('floor').order('position_key');
      const mxData = mx || [];
      setFloorUnitMatrix(mxData);
      const floors = [...new Set(mxData.map((u: R) => String(u.floor)))].filter(f => /^\d+$/.test(f)).sort((a, b) => +a - +b);
      setSelectedFloor(floors[Math.floor(floors.length / 2)] || floors[0] || null);
    })();
  }, [sel?.id, selectedBuilding]);

  // Derived data
  const v3Floors = useMemo(() => [...new Set(floorUnitMatrix.map(u => String(u.floor)))].filter(f => /^\d+$/.test(f)).sort((a, b) => +a - +b), [floorUnitMatrix]);
  const floorUnits = useMemo(() => {
    if (!selectedFloor) return [];
    return floorUnitMatrix.filter(u => String(u.floor) === selectedFloor);
  }, [floorUnitMatrix, selectedFloor]);

  const vqColors = VIEW_QUALITY_COLOR(colors);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 80, minHeight: '60vh' }}><Loader2 className="animate-spin" size={24} style={{ color: colors.gold }} /></div>;
  }

  if (error && projects.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80, minHeight: '60vh' }}>
        <div style={{ maxWidth: 400, textAlign: 'center', padding: 20, background: colors.goldBg, border: `1px solid ${colors.gold}30`, borderRadius: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: colors.text }}>Unable to load projects</div>
          <div style={{ fontSize: 11, color: colors.textSecondary }}>{error}</div>
        </div>
      </div>
    );
  }

  const cat = sel?.project_category;
  const isApt = cat === 'apartment';
  const isVilla = cat === 'villa';
  const isOffplan = cat === 'off_plan';
  const hasMatrix = floorUnitMatrix.length > 0;
  const hasFloorPricing = floorPricing.length > 0;
  const hasInsights = zaInsights.length > 0;
  const hasSurroundings = surroundings.length > 0;

  const surrTypeColor: Record<string, string> = {
    premium: colors.gold, positive: colors.green, mixed: colors.blue,
    neutral: colors.muted, caution: colors.amber, negative: colors.coral,
  };
  const typeColor: Record<string, string> = {
    '1 B/R': colors.blue, '2 B/R': colors.indigo, '3 B/R': colors.amber,
    '4 B/R': colors.green, '5 B/R': colors.coral, 'Studio': colors.textSecondary,
  };
  const insightTypeColor: Record<string, string> = {
    price_spread: colors.coral, yield_signal: colors.green, sc_impact: colors.amber,
    data_gap: colors.muted, orientation_premium: colors.gold, rental_demand: colors.blue,
  };
  const catColorFn = (c: string) => c === 'apartment' ? colors.blue : c === 'villa' ? colors.green : c === 'off_plan' ? colors.amber : colors.muted;

  function getUnitLayout(units: R[]) {
    const n = units.length;
    if (!n) return [];
    const cols = n <= 4 ? 2 : n <= 9 ? 3 : 4;
    const rows = Math.ceil(n / cols);
    const cellW = 90 / cols;
    const cellH = 85 / rows;
    return units.map((u, i) => ({ ...u, _x: 5 + (i % cols) * cellW, _y: 5 + Math.floor(i / cols) * cellH, _w: cellW - 2, _h: cellH - 2 }));
  }

  function getUnitPricing(unit: R) {
    const floorNum = parseInt(unit.floor);
    if (isNaN(floorNum)) return null;
    const band = floorNum <= 10 ? '1-10' : floorNum <= 20 ? '11-20' : floorNum <= 30 ? '21-30' : floorNum <= 40 ? '31-40' : floorNum <= 50 ? '41-50' : floorNum <= 60 ? '51-60' : '60+';
    const bedroomLabel = unit.bedrooms != null ? `${unit.bedrooms} B/R` : unit.unit_type_name;
    const pricing = floorPricing.find(fp => (fp.rooms_en === bedroomLabel || fp.rooms_en === unit.unit_type_name) && fp.floor_band === band);
    if (!pricing) return null;
    const area = unit.total_sqft || 0;
    return {
      avgPsf: pricing.avg_psf, minPsf: pricing.min_psf, maxPsf: pricing.max_psf,
      estPrice: Math.round(pricing.avg_psf * area / 1000) * 1000,
      txnCount: pricing.txn_count, confidence: pricing.confidence, floorBand: band,
    };
  }

  const tabs = [
    { key: 'overview', label: 'Overview' },
    ...(hasMatrix ? [{ key: 'floorplate', label: 'Floor Plate' }] : []),
    ...(hasFloorPricing ? [{ key: 'floorpricing', label: 'Floor Pricing' }] : []),
    ...(hasSurroundings ? [{ key: 'surroundings', label: 'Surroundings' }] : []),
    { key: 'units', label: 'Units & Pricing' },
    ...(buildingShape.length > 0 ? [{ key: 'buildingdna', label: 'Building DNA' }] : []),
    ...(isApt || isOffplan ? [{ key: 'orientation', label: 'Orientation' }] : []),
    ...(isApt || isOffplan ? [{ key: 'viewblock', label: 'View Blocking' }] : []),
    ...(isVilla ? [{ key: 'community', label: 'Community Intel' }] : []),
    ...(isOffplan ? [{ key: 'offplan', label: 'Construction' }] : []),
    { key: 'evidence', label: 'DLD Evidence' },
    { key: 'rentals', label: 'Ejari Rentals' },
    ...(serviceCharges.length > 0 ? [{ key: 'servicecharges', label: 'Service Charges' }] : []),
    ...(paymentPlan.length > 0 ? [{ key: 'paymentplan', label: 'Payment Plan' }] : []),
    { key: 'amenities', label: 'Amenities' },
    ...(hasInsights ? [{ key: 'insights', label: 'ZA Insights' }] : [{ key: 'insights', label: "What They Don't Tell You" }]),
  ];

  return (
    <div style={{ display: 'flex', height: '100%', color: colors.text }}>
      <ProjectSidebar projects={projects} sel={sel} onSelect={setSel} colors={colors} />
      <div style={{ flex: 1, overflowY: 'auto', height: '100%' }}>
        {sel ? (
          <>
            {/* HERO */}
            <div style={{ padding: '32px 28px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 0%, ${colors.gold}06 0%, transparent 60%)` }} />
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, right: 0 }}>
                  <button onClick={toggle} style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: 6, padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    {isDark ? <Sun size={14} style={{ color: colors.gold }} /> : <Moon size={14} style={{ color: colors.gold }} />}
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
                  <Tag color={catColorFn(cat)}>{cat === 'apartment' ? 'APT' : cat === 'villa' ? 'VILLA' : cat === 'off_plan' ? 'OFF-PLAN' : cat}</Tag>
                  {sel.sc_source === 'mollak_confirmed' && <Tag color={colors.green}>MOLLAK VERIFIED SC</Tag>}
                  {sel.sc_source === 'rera_estimate' && <Tag color={colors.amber}>RERA ESTIMATE SC</Tag>}
                </div>
                <div style={{ fontSize: 10, letterSpacing: 4, color: colors.textSecondary, textTransform: 'uppercase', fontFamily: MONO, marginBottom: 12 }}>
                  {sel.master_community?.toUpperCase()}
                </div>
                <h1 style={{ fontSize: 36, fontWeight: 300, margin: 0, letterSpacing: 1, lineHeight: 1.1, color: colors.text, fontFamily: "'Libre Franklin', sans-serif" }}>
                  {sel.project_name}
                </h1>
                <p style={{ fontSize: 13, color: colors.textSecondary, marginTop: 10, fontStyle: 'italic' }}>
                  {sel.brochure_tagline || 'Independent property intelligence'}
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 24, flexWrap: 'wrap' }}>
                  {[
                    { l: 'DEVELOPER', v: sel.developer },
                    ...(sel.total_floors ? [{ l: 'FLOORS', v: sel.total_floors }] : []),
                    ...(sel.total_units ? [{ l: 'UNITS', v: `~${fmt(sel.total_units)}` }] : []),
                    { l: 'STATUS', v: sel.project_status?.replace(/_/g, ' ') },
                  ].map((s, i) => (
                    <div key={i} style={{ textAlign: 'center', padding: '12px 0' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: colors.gold, fontFamily: MONO }}>{s.v}</div>
                      <div style={{ fontSize: 9, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: MONO, marginTop: 4 }}>{s.l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'inline-block', marginTop: 20, padding: '8px 16px', background: colors.goldFaint, border: `1px solid ${colors.gold}20`, borderRadius: 6 }}>
                  <span style={{ fontSize: 11, color: colors.textSecondary }}>Every number sourced from DLD transactions, Ejari contracts, Mollak service charges, or verified public data.</span>
                </div>
              </div>
            </div>

            {/* TABS */}
            <div style={{ borderBottom: `1px solid ${colors.border}`, padding: '0 20px', display: 'flex', gap: 0, overflowX: 'auto' }}>
              {tabs.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} style={{
                  padding: '10px 14px', fontSize: 11, fontWeight: tab === t.key ? 700 : 400, cursor: 'pointer',
                  background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.key ? colors.gold : 'transparent'}`,
                  color: tab === t.key ? colors.gold : colors.textSecondary, whiteSpace: 'nowrap', fontFamily: MONO,
                }}>{t.label}</button>
              ))}
            </div>

            {/* CONTENT */}
            <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px' }}>
              {detailLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Loader2 className="animate-spin" size={24} style={{ color: colors.gold }} /></div>
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
                              <div style={{ fontSize: 18, fontWeight: 700, color: colors.gold, fontFamily: MONO }}>{s.v}</div>
                              <div style={{ fontSize: 9, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: MONO, marginTop: 4 }}>{s.l}</div>
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
                              <div><div style={{ fontSize: 9, color: colors.muted, textTransform: 'uppercase', fontFamily: MONO }}>CONSTRUCTION</div><div style={{ fontSize: 28, fontWeight: 300, color: colors.amber }}>{sel.offplan_construction_pct}%</div></div>
                              <div><div style={{ fontSize: 9, color: colors.muted, textTransform: 'uppercase', fontFamily: MONO }}>HANDOVER</div><div style={{ fontSize: 16, color: colors.text }}>{sel.offplan_expected_handover?.slice(0, 7) || 'TBD'}</div></div>
                              <div><div style={{ fontSize: 9, color: colors.muted, textTransform: 'uppercase', fontFamily: MONO }}>DEV AVG DELAY</div><div style={{ fontSize: 16, color: sel.offplan_developer_delay_history_months > 6 ? colors.amber : colors.green }}>{sel.offplan_developer_delay_history_months || 0} months</div></div>
                              <div><div style={{ fontSize: 9, color: colors.muted, textTransform: 'uppercase', fontFamily: MONO }}>ESCROW</div><div style={{ fontSize: 16, color: colors.green }}>{sel.offplan_escrow_status?.toUpperCase() || '—'}</div></div>
                              {sel.offplan_resale_premium_pct && <div><div style={{ fontSize: 9, color: colors.muted, textTransform: 'uppercase', fontFamily: MONO }}>RESALE PREMIUM</div><div style={{ fontSize: 16, color: colors.green }}>+{sel.offplan_resale_premium_pct}%</div></div>}
                            </div>
                            <div style={{ marginTop: 12, height: 8, background: colors.elevated, borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ width: `${sel.offplan_construction_pct}%`, height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${colors.amber}, ${colors.green})` }} />
                            </div>
                          </PCard>
                        </Section>
                      )}

                      {isVilla && sel.villa_highway_distance_m && (
                        <Section title="Community Context" colors={colors}>
                          <PCard colors={colors}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                              <div><div style={{ fontSize: 9, color: colors.muted, fontFamily: MONO }}>HIGHWAY</div><div style={{ fontSize: 14, color: colors.text }}>{sel.villa_highway_name}</div><div style={{ fontSize: 12, color: sel.villa_highway_noise_risk === 'low' ? colors.green : colors.amber }}>{sel.villa_highway_distance_m}m — {sel.villa_highway_noise_risk} noise</div></div>
                              <div><div style={{ fontSize: 9, color: colors.muted, fontFamily: MONO }}>NEAREST SCHOOL</div><div style={{ fontSize: 14, color: colors.text }}>{sel.villa_nearest_school}</div><div style={{ fontSize: 12, color: colors.textSecondary }}>{sel.villa_school_proximity_km}km</div></div>
                              <div><div style={{ fontSize: 9, color: colors.muted, fontFamily: MONO }}>COMMUNITY</div><div style={{ fontSize: 14, color: colors.text }}>{sel.villa_community_maturity?.replace(/_/g, ' ')}</div><div style={{ fontSize: 12, color: colors.textSecondary }}>{sel.villa_gated ? 'Gated' : 'Open'} · {sel.villa_private_pool ? 'Private Pool' : 'Shared Pool'}</div></div>
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
                                  <div style={{ width: 4, height: 24, borderRadius: 2, background: u.bedroom_count <= 1 ? colors.blue : u.bedroom_count === 2 ? colors.indigo : u.bedroom_count === 3 ? colors.amber : colors.green }} />
                                  <span style={{ fontSize: 17, fontWeight: 400 }}>{u.unit_type}</span>
                                  <span style={{ fontSize: 11, color: colors.textDim }}>{u.unit_subtype}</span>
                                </div>
                                <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4, marginLeft: 12 }}>
                                  {u.bedroom_count} Bed · {u.bathroom_count} Bath · {fmt(u.total_area_sqft)} sqft
                                  {u.has_maid_room && ' · Maid'}{u.has_study && ' · Study'}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 18, fontWeight: 700, color: colors.gold, fontFamily: MONO }}>AED {fmtM(u.starting_price_aed)}</div>
                                <div style={{ fontSize: 11, color: colors.gold }}>AED {fmt(u.price_per_sqft)}/sqft</div>
                              </div>
                            </div>
                            {u.layout_description && (
                              <div style={{ padding: 10, background: colors.bg, borderRadius: 4, marginBottom: 6 }}>
                                <div style={{ fontSize: 9, color: colors.muted, fontFamily: MONO }}>LAYOUT</div>
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
                                return <div style={{ color: colors.green, fontFamily: MONO }}>DLD: {fmt(minPsf)}–{fmt(maxPsf)} PSF ({txns} txns)</div>;
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
                            <div style={{ fontSize: 9, color: colors.green, fontFamily: MONO }}>BEST DIRECTION</div>
                            <div style={{ fontSize: 16, fontWeight: 400, marginTop: 6, color: colors.text }}>{sel.apt_best_direction || sel.orientation_primary}</div>
                            {sel.apt_best_floor_range && <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>Best floors: {sel.apt_best_floor_range}</div>}
                          </PCard>
                          <PCard colors={colors}>
                            <div style={{ fontSize: 9, color: colors.coral, fontFamily: MONO }}>CAUTION DIRECTION</div>
                            <div style={{ fontSize: 16, fontWeight: 400, marginTop: 6, color: colors.text }}>{sel.apt_worst_direction || '—'}</div>
                            {sel.apt_noise_floor_threshold && <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>Noise attenuates above floor {sel.apt_noise_floor_threshold}</div>}
                          </PCard>
                        </div>
                        {(sel.apt_floor_premium_pct || sel.apt_view_premium_pct) && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                            {sel.apt_floor_premium_pct && <PCard colors={colors}>
                              <div style={{ fontSize: 9, color: colors.muted, fontFamily: MONO }}>FLOOR PREMIUM</div>
                              <div style={{ fontSize: 24, fontWeight: 300, color: colors.gold, marginTop: 4 }}>+{sel.apt_floor_premium_pct}%<span style={{ fontSize: 12, color: colors.textDim }}>/floor</span></div>
                            </PCard>}
                            {sel.apt_view_premium_pct && <PCard colors={colors}>
                              <div style={{ fontSize: 9, color: colors.muted, fontFamily: MONO }}>VIEW PREMIUM</div>
                              <div style={{ fontSize: 24, fontWeight: 300, color: colors.gold, marginTop: 4 }}>+{sel.apt_view_premium_pct}%</div>
                            </PCard>}
                          </div>
                        )}
                        {sel.orientation_views?.length > 0 && (
                          <PCard colors={colors} style={{ marginTop: 12 }}>
                            <div style={{ fontSize: 9, color: colors.muted, fontFamily: MONO, marginBottom: 8 }}>AVAILABLE VIEWS</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {sel.orientation_views.map((v: string, i: number) => <Tag key={i} color={colors.gold}>{v.replace(/_/g, ' ')}</Tag>)}
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
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                              <PCard colors={colors}>
                                <div style={{ fontSize: 9, color: colors.green, fontFamily: MONO }}>BEST DIRECTION</div>
                                <div style={{ fontSize: 16, fontWeight: 400, marginTop: 6, color: colors.text }}>{sel.apt_best_direction || sel.orientation_primary || '—'}</div>
                              </PCard>
                              <PCard colors={colors}>
                                <div style={{ fontSize: 9, color: colors.coral, fontFamily: MONO }}>CAUTION DIRECTION</div>
                                <div style={{ fontSize: 16, fontWeight: 400, marginTop: 6, color: colors.text }}>{sel.apt_worst_direction || '—'}</div>
                              </PCard>
                            </div>
                            <div style={{ textAlign: 'center', padding: 20, background: colors.goldFaint, border: `1px solid ${colors.gold}20`, borderRadius: 8 }}>
                              <div style={{ fontSize: 10, color: colors.gold, fontWeight: 600, marginBottom: 4 }}>GIS VIEW BLOCKING DATA</div>
                              <div style={{ fontSize: 11, color: colors.textSecondary }}>
                                Building-by-building view blocking analysis is not yet available for {sel.master_community}.
                                Currently covers: Downtown Dubai, Business Bay, Dubai Hills, Arabian Ranches III, City Walk, DIFC.
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                              <PCard colors={colors}>
                                <div style={{ fontSize: 9, color: colors.muted, fontFamily: MONO }}>THREATS DETECTED</div>
                                <div style={{ fontSize: 28, fontWeight: 300, color: colors.amber }}>{viewBlocking.length}</div>
                              </PCard>
                              <PCard colors={colors}>
                                <div style={{ fontSize: 9, color: colors.muted, fontFamily: MONO }}>HIGHEST RISK</div>
                                <div style={{ fontSize: 28, fontWeight: 300, color: viewBlocking[0]?.risk_score > 70 ? colors.coral : viewBlocking[0]?.risk_score > 40 ? colors.amber : colors.green }}>{viewBlocking[0]?.risk_score || 0}</div>
                                <div style={{ fontSize: 10, color: colors.textSecondary }}>{viewBlocking[0]?.risk_label || '—'}</div>
                              </PCard>
                              <PCard colors={colors}>
                                <div style={{ fontSize: 9, color: colors.muted, fontFamily: MONO }}>SAFE ABOVE FLOOR</div>
                                <div style={{ fontSize: 28, fontWeight: 300, color: colors.green }}>{viewBlocking[0]?.min_safe_floor || sel.apt_best_floor_range || '—'}</div>
                              </PCard>
                            </div>
                            {viewBlocking.slice(0, 10).map((vb: R, i: number) => (
                              <PCard key={i} colors={colors} style={{ marginBottom: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                  <div>
                                    <div style={{ fontSize: 14, fontWeight: 500, color: colors.text }}>{vb.blocker_name}</div>
                                    <div style={{ fontSize: 10, color: colors.textDim, marginTop: 2 }}>{vb.blocker_distance_m}m away · {vb.blocker_floors} floors · {vb.blocker_direction}</div>
                                  </div>
                                  <Tag color={vb.risk_score > 70 ? colors.coral : vb.risk_score > 40 ? colors.amber : colors.green}>{vb.risk_label || `RISK: ${vb.risk_score}`}</Tag>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                                  <div style={{ padding: 6, background: colors.bg, borderRadius: 3, textAlign: 'center' }}>
                                    <div style={{ fontSize: 8, color: colors.textDim }}>BLOCKED</div>
                                    <div style={{ fontSize: 14, color: vb.pct_blocked > 30 ? colors.coral : vb.pct_blocked > 15 ? colors.amber : colors.green }}>{vb.pct_blocked}%</div>
                                  </div>
                                  <div style={{ padding: 6, background: colors.bg, borderRadius: 3, textAlign: 'center' }}>
                                    <div style={{ fontSize: 8, color: colors.textDim }}>SEVERITY</div>
                                    <div style={{ fontSize: 11, color: vb.block_severity === 'critical' ? colors.coral : vb.block_severity === 'major' ? colors.amber : colors.green }}>{vb.block_severity?.toUpperCase()}</div>
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
                                  <div style={{ marginTop: 6, padding: 4, background: colors.coralFaint, borderRadius: 3, border: `1px solid ${colors.coral}22` }}>
                                    <span style={{ fontSize: 9, color: colors.coral }}>VIEW NOT SALVAGEABLE — permanently blocked regardless of floor</span>
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
                            <div style={{ fontSize: 9, color: colors.muted, fontFamily: MONO }}>HIGHWAY PROXIMITY</div>
                            <div style={{ fontSize: 20, fontWeight: 300, color: sel.villa_highway_noise_risk === 'low' ? colors.green : colors.amber, marginTop: 6 }}>{sel.villa_highway_distance_m}m</div>
                            <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{sel.villa_highway_name}</div>
                          </PCard>
                          <PCard colors={colors}>
                            <div style={{ fontSize: 9, color: colors.muted, fontFamily: MONO }}>NEAREST SCHOOL</div>
                            <div style={{ fontSize: 14, color: colors.text, marginTop: 6 }}>{sel.villa_nearest_school}</div>
                            <div style={{ fontSize: 12, color: colors.gold, marginTop: 2 }}>{sel.villa_school_proximity_km}km away</div>
                          </PCard>
                          <PCard colors={colors}>
                            <div style={{ fontSize: 9, color: colors.muted, fontFamily: MONO }}>COMMUNITY</div>
                            <div style={{ fontSize: 16, color: colors.text, marginTop: 6, textTransform: 'capitalize' }}>{sel.villa_community_maturity?.replace(/_/g, ' ')}</div>
                            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                              {sel.villa_gated && <Tag color={colors.green}>GATED</Tag>}
                              {sel.villa_private_pool && <Tag color={colors.blue}>PRIVATE POOL</Tag>}
                            </div>
                          </PCard>
                          <PCard colors={colors}>
                            <div style={{ fontSize: 9, color: colors.muted, fontFamily: MONO }}>PLOT & GARDEN</div>
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
                              <div style={{ fontSize: 9, color: colors.muted, fontFamily: MONO }}>CONSTRUCTION PROGRESS</div>
                              <div style={{ fontSize: 36, fontWeight: 300, color: colors.amber, marginTop: 4 }}>{sel.offplan_construction_pct || 0}%</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 9, color: colors.muted, fontFamily: MONO }}>EXPECTED HANDOVER</div>
                              <div style={{ fontSize: 18, fontWeight: 700, color: colors.gold, fontFamily: MONO, marginTop: 4 }}>{sel.offplan_expected_handover?.slice(0, 7) || 'TBD'}</div>
                            </div>
                          </div>
                          <div style={{ height: 12, background: colors.elevated, borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
                            <div style={{ width: `${sel.offplan_construction_pct || 0}%`, height: '100%', borderRadius: 6, background: `linear-gradient(90deg, ${colors.coral}, ${colors.amber}, ${colors.green})` }} />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                            <div style={{ padding: 12, background: colors.bg, borderRadius: 4, textAlign: 'center' }}>
                              <div style={{ fontSize: 9, color: colors.muted, fontFamily: MONO }}>DEV DELAY HISTORY</div>
                              <div style={{ fontSize: 20, color: sel.offplan_developer_delay_history_months > 6 ? colors.amber : colors.green, marginTop: 4 }}>{sel.offplan_developer_delay_history_months || 0} mo</div>
                            </div>
                            <div style={{ padding: 12, background: colors.bg, borderRadius: 4, textAlign: 'center' }}>
                              <div style={{ fontSize: 9, color: colors.muted, fontFamily: MONO }}>ESCROW STATUS</div>
                              <div style={{ fontSize: 14, color: sel.offplan_escrow_status === 'active' ? colors.green : colors.amber, marginTop: 4 }}>{sel.offplan_escrow_status?.toUpperCase() || '—'}</div>
                            </div>
                            <div style={{ padding: 12, background: colors.bg, borderRadius: 4, textAlign: 'center' }}>
                              <div style={{ fontSize: 9, color: colors.muted, fontFamily: MONO }}>RESALE PREMIUM</div>
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
                          <PCard colors={colors}><div style={{ color: colors.textDim, textAlign: 'center', padding: 20 }}>No recent DLD transactions linked</div></PCard>
                        ) : dldRecent.map((tx, i) => (
                          <PCard key={i} colors={colors} style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 13, fontWeight: 500 }}>{tx.rooms_en}</span>
                                <Tag color={colors.green}>DLD VERIFIED</Tag>
                              </div>
                              <div style={{ fontSize: 10, color: colors.textDim, marginTop: 3 }}>{tx.instance_date} · {fmt(tx.sqft)} sqft · {tx.reg_type_en}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 16, fontWeight: 700, color: colors.gold, fontFamily: MONO }}>AED {fmt(tx.price_aed)}</div>
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
                      <Section title="Ejari Rental Market" subtitle={`project_number: ${sel.rera_registration_no || 'not mapped'}`} accent colors={colors}>
                        {ejari.length === 0 ? (
                          <PCard colors={colors}><div style={{ color: colors.textDim, textAlign: 'center', padding: 20 }}>No Ejari rental data</div></PCard>
                        ) : ejari.map((r, i) => (
                          <PCard key={i} colors={colors} style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <div>
                                <span style={{ fontSize: 14, color: colors.text }}>{r.unit_type || r.bedrooms}</span>
                                <span style={{ fontSize: 11, color: colors.textDim, marginLeft: 8 }}>{r.contract_count} contracts</span>
                                {r.new_contracts && <span style={{ fontSize: 10, color: colors.green, marginLeft: 8 }}>{r.new_contracts} new</span>}
                              </div>
                              <Tag color={colors.green}>EJARI VERIFIED</Tag>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                              {[
                                { l: 'MIN RENT', v: `AED ${fmt(r.min_rent_aed || r.min_rent)}/yr`, c: colors.coral },
                                { l: 'MEDIAN RENT', v: `AED ${fmt(r.median_rent_aed || r.median_rent)}/yr`, c: colors.gold },
                                { l: 'AVG RENT', v: `AED ${fmt(r.avg_rent_aed || r.avg_rent)}/yr`, c: colors.textSecondary },
                                { l: 'MAX RENT', v: `AED ${fmt(r.max_rent_aed || r.max_rent)}/yr`, c: colors.green },
                              ].map((s, j) => (
                                <div key={j} style={{ padding: 8, background: colors.bg, borderRadius: 4, textAlign: 'center' }}>
                                  <div style={{ fontSize: 8, color: colors.textDim, fontFamily: MONO }}>{s.l}</div>
                                  <div style={{ fontSize: 14, color: s.c, marginTop: 2 }}>{s.v}</div>
                                </div>
                              ))}
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
                            <div style={{ fontSize: 9, color: colors.muted, fontFamily: MONO }}>DELIVERY SCORE</div>
                            <div style={{ fontSize: 28, fontWeight: 300, color: sel.amenity_delivery_score >= 90 ? colors.green : sel.amenity_delivery_score >= 70 ? colors.blue : sel.amenity_delivery_score >= 50 ? colors.amber : colors.coral }}>
                              {sel.amenity_delivery_score}/100
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 12, color: colors.green }}>{amenities.filter((a: R) => a.delivery_status === 'fully_delivered').length} fully delivered</div>
                            <div style={{ fontSize: 12, color: colors.blue }}>{amenities.filter((a: R) => a.delivery_status === 'planned').length} planned</div>
                            <div style={{ fontSize: 12, color: colors.amber }}>{amenities.filter((a: R) => a.delivery_status === 'pending_verification').length} pending</div>
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
                                <div style={{ fontSize: 16, fontWeight: 700, color: Number(a.community_sentiment_score) >= 4 ? colors.green : Number(a.community_sentiment_score) >= 3 ? colors.gold : colors.amber, fontFamily: MONO }}>
                                  {Number(a.community_sentiment_score).toFixed(1)}
                                </div>
                                <div style={{ fontSize: 7, color: colors.textDim }}>{a.sentiment_volume ? `${a.sentiment_volume} reviews` : '/5'}</div>
                              </div>
                            ) : <div />}
                            <Tag color={a.delivery_status === 'fully_delivered' || a.delivery_status === 'exceeded' ? colors.green : a.delivery_status === 'planned' ? colors.blue : a.delivery_status === 'pending_verification' || a.delivery_status === 'partially_delivered' ? colors.amber : colors.coral}>
                              {a.delivery_status?.replace(/_/g, ' ').toUpperCase()}
                            </Tag>
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
                              <Tag color={inf.status === 'operational' ? colors.green : inf.status === 'under_construction' ? colors.amber : colors.blue}>{inf.status?.replace(/_/g, ' ').toUpperCase()}</Tag>
                            </PCard>
                          ))}
                        </Section>
                      )}
                    </div>
                  )}

                  {/* FLOOR PLATE (V3 — xray_floor_unit_matrix) */}
                  {tab === 'floorplate' && hasMatrix && (() => {
                    const laid = getUnitLayout(floorUnits);
                    const floorNum = parseInt(selectedFloor || '0');
                    const band = floorNum <= 10 ? '1-10' : floorNum <= 20 ? '11-20' : floorNum <= 30 ? '21-30' : floorNum <= 40 ? '31-40' : floorNum <= 50 ? '41-50' : floorNum <= 60 ? '51-60' : '60+';
                    const bandPricing = floorPricing.filter(fp => fp.floor_band === band);
                    return (
                    <div>
                      <Section title="Interactive Floor Plate" subtitle={`xray_floor_unit_matrix · ${floorUnitMatrix.length} units · Floor ${selectedFloor || '—'}`} accent colors={colors}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                          <Tag color={colors.green}>GOVERNMENT DATA</Tag>
                          <span style={{ fontSize: 9, color: colors.textDim, fontFamily: MONO }}>
                            {floorUnitMatrix.length} units across {v3Floors.length} floors{matrixBuildings.length > 1 ? ` · ${matrixBuildings.length} buildings` : ''}
                          </span>
                        </div>
                        {matrixBuildings.length > 1 && (
                          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                            {matrixBuildings.map(b => (
                              <button key={b} onClick={() => setSelectedBuilding(b)} style={{
                                padding: '5px 12px', borderRadius: 4, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                                fontFamily: MONO, letterSpacing: 0.5,
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
                            <div style={{ fontSize: 8, color: colors.textDim, fontFamily: MONO, marginBottom: 4 }}>FLOOR</div>
                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 400 }}>
                              {[...v3Floors].reverse().map(f => (
                                <button key={f} onClick={() => setSelectedFloor(f)} style={{
                                  width: 32, padding: '3px 0', fontSize: 9, fontFamily: MONO,
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
                            <svg viewBox="0 0 106 94" style={{ width: '100%', background: colors.bg, borderRadius: 8, border: `1px solid ${colors.border}` }}>
                              {surroundings.filter(s => ['N','S','E','W'].includes(s.direction)).map(s => {
                                const pos: Record<string, {x: number; y: number}> = { N: {x:53,y:4}, S: {x:53,y:92}, E: {x:103,y:47}, W: {x:3,y:47} };
                                const p = pos[s.direction] || {x:53,y:47};
                                return <text key={s.direction} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize="4" fill={surrTypeColor[s.type] || colors.textDim} fontWeight="700">{s.direction}</text>;
                              })}
                              <rect x={46} y={40} width={14} height={14} rx={2} fill={colors.elevated} stroke={colors.border} strokeWidth={0.3} />
                              <text x={53} y={48} textAnchor="middle" fontSize="3" fill={colors.textDim}>CORE</text>
                              {laid.map((u: R) => {
                                const vq = u.view_quality as string;
                                const fillColor = vqColors[vq as keyof typeof vqColors] || typeColor[`${u.bedrooms} B/R`] || colors.muted;
                                const isHov = hoveredUnit?.unit_number === u.unit_number;
                                return (
                                  <g key={u.unit_number || u.position_key}
                                    onMouseEnter={() => setHoveredUnit({ ...u, _pricing: getUnitPricing(u) })}
                                    onMouseLeave={() => setHoveredUnit(null)}
                                    style={{ cursor: 'pointer' }}>
                                    <rect x={u._x} y={u._y} width={u._w} height={u._h} rx={1}
                                      fill={fillColor + (isHov ? 'FF' : '88')}
                                      stroke={isHov ? colors.gold : colors.border} strokeWidth={isHov ? 0.8 : 0.3} />
                                    <text x={u._x + u._w / 2} y={u._y + u._h / 2 - 2.5} textAnchor="middle" fontSize="2.5" fontWeight="700" fill={colors.text}>
                                      {u.bedrooms != null ? `${u.bedrooms}BR` : u.unit_type_name || '—'}
                                    </text>
                                    <text x={u._x + u._w / 2} y={u._y + u._h / 2 + 0.5} textAnchor="middle" fontSize="2" fill={colors.textSecondary}>{fmt(u.total_sqft)}sf</text>
                                    {u.orientation && <text x={u._x + u._w / 2} y={u._y + u._h / 2 + 3} textAnchor="middle" fontSize="1.8" fill={colors.gold}>{u.orientation}</text>}
                                    <text x={u._x + u._w / 2} y={u._y + u._h / 2 + 5.5} textAnchor="middle" fontSize="1.8" fill={colors.muted}>{u.unit_number}</text>
                                  </g>
                                );
                              })}
                              {laid.length === 0 && <text x={53} y={47} textAnchor="middle" fontSize="4" fill={colors.textDim}>No units on this floor</text>}
                            </svg>
                            {/* Hover tooltip */}
                            {hoveredUnit && (
                              <div style={{
                                position: 'absolute', top: 8, right: 8, background: colors.surface,
                                border: `1px solid ${colors.gold}`, borderRadius: 8, padding: 12,
                                minWidth: 240, boxShadow: `0 4px 20px ${colors.bg}88`, zIndex: 10,
                              }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>
                                  Unit {hoveredUnit.unit_number} · {hoveredUnit.bedrooms != null ? `${hoveredUnit.bedrooms} BR` : hoveredUnit.unit_type_name}
                                </div>
                                <div style={{ fontSize: 10, color: colors.textSecondary, marginBottom: 4 }}>
                                  Floor {hoveredUnit.floor} · {fmt(hoveredUnit.total_sqft)} sqft total
                                  {hoveredUnit.suite_sqft ? ` (${fmt(hoveredUnit.suite_sqft)} suite + ${fmt(hoveredUnit.balcony_sqft)} balcony)` : ''}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 6, fontSize: 10 }}>
                                  {hoveredUnit.orientation && <div><span style={{ color: colors.muted }}>Orient: </span><span style={{ color: colors.gold }}>{hoveredUnit.orientation}</span></div>}
                                  {hoveredUnit.view_type && <div><span style={{ color: colors.muted }}>View: </span><span style={{ color: colors.text }}>{hoveredUnit.view_type}</span></div>}
                                  {hoveredUnit.view_quality && <div><span style={{ color: colors.muted }}>Quality: </span><span style={{ color: vqColors[hoveredUnit.view_quality as keyof typeof vqColors] || colors.text }}>{hoveredUnit.view_quality}</span></div>}
                                  {hoveredUnit.faces && <div><span style={{ color: colors.muted }}>Faces: </span><span style={{ color: colors.text }}>{hoveredUnit.faces}</span></div>}
                                </div>
                                {hoveredUnit.master_bed_dims && <div style={{ fontSize: 9, color: colors.textDim }}>Master: {hoveredUnit.master_bed_dims} · Living: {hoveredUnit.living_dims || '—'} · Kitchen: {hoveredUnit.kitchen_dims || '—'}</div>}
                                {hoveredUnit._pricing && (
                                  <div style={{ marginTop: 6, padding: 6, background: colors.bg, borderRadius: 4 }}>
                                    <div style={{ fontSize: 12, color: colors.gold, fontWeight: 700, fontFamily: MONO }}>Est. AED {fmtM(hoveredUnit._pricing.estPrice)}</div>
                                    <div style={{ fontSize: 9, color: colors.textDim }}>{fmt(hoveredUnit._pricing.avgPsf)}/sqft · {hoveredUnit._pricing.txnCount} txns · Band {hoveredUnit._pricing.floorBand}</div>
                                  </div>
                                )}
                                {hoveredUnit.confidence && <div style={{ fontSize: 9, marginTop: 4 }}><ConfBadge confidence={hoveredUnit.confidence} colors={colors} /></div>}
                              </div>
                            )}
                          </div>
                        </div>
                        {bandPricing.length > 0 && (
                          <div style={{ marginTop: 16 }}>
                            <Divider label={`FLOOR BAND ${band} PRICING`} />
                            {bandPricing.map((fp, i) => (
                              <PCard key={i} colors={colors} style={{ marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ width: 4, height: 20, borderRadius: 2, background: typeColor[fp.rooms_en] || colors.textDim }} />
                                  <span style={{ fontSize: 13, color: colors.text }}>{fp.rooms_en}</span>
                                  <span style={{ fontSize: 10, color: colors.textDim }}>{fp.txn_count} txns</span>
                                  <ConfBadge confidence={fp.confidence} colors={colors} />
                                </div>
                                <div style={{ textAlign: 'right', fontFamily: MONO }}>
                                  <div style={{ fontSize: 13, color: colors.gold }}>AED {fmt(fp.avg_psf)}/sqft</div>
                                  <div style={{ fontSize: 9, color: colors.textDim }}>{fmt(fp.min_psf)} — {fmt(fp.max_psf)}</div>
                                </div>
                              </PCard>
                            ))}
                          </div>
                        )}
                        {/* Legend */}
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14, padding: '10px 0', borderTop: `1px solid ${colors.border}` }}>
                          {Object.entries(vqColors).map(([type, col]) => (
                            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: colors.textSecondary }}>
                              <div style={{ width: 10, height: 10, borderRadius: 2, background: col + '88' }} />{type}
                            </div>
                          ))}
                        </div>
                        <div style={{ fontSize: 9, color: colors.textDim, marginTop: 6 }}>
                          Source: xray_floor_unit_matrix. {floorUnitMatrix.length} units mapped. Colored by view quality.
                        </div>
                      </Section>
                    </div>
                    );
                  })()}

                  {/* FLOOR PRICING (V3) */}
                  {tab === 'floorpricing' && hasFloorPricing && (() => {
                    const roomTypes = [...new Set(floorPricing.map(fp => fp.rooms_en))].sort();
                    const bandOrder = ['1-10','11-20','21-30','31-40','41-50','51-60','60+','unknown'];
                    const lowBands = floorPricing.filter(fp => fp.floor_band === '1-10');
                    const highBands = floorPricing.filter(fp => fp.floor_band === '41-50' || fp.floor_band === '51-60' || fp.floor_band === '60+');
                    const lowAvg = lowBands.length ? lowBands.reduce((a, fp) => a + fp.avg_psf, 0) / lowBands.length : 0;
                    const highAvg = highBands.length ? highBands.reduce((a, fp) => a + fp.avg_psf, 0) / highBands.length : 0;
                    const floorPremium = lowAvg > 0 ? ((highAvg - lowAvg) / lowAvg * 100).toFixed(1) : null;
                    const totalTxns = floorPricing.reduce((a, fp) => a + (fp.txn_count || 0), 0);
                    const totalExact = floorPricing.reduce((a, fp) => a + (fp.exact_matches || 0), 0);
                    return (
                    <div>
                      <Section title="Floor-Band Pricing" subtitle={`PSF by floor band from ${totalTxns} matched DLD transactions`} accent colors={colors}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                          <PCard colors={colors}><div style={{ fontSize: 9, color: colors.muted, fontFamily: MONO }}>TOTAL TRANSACTIONS</div><div style={{ fontSize: 18, fontWeight: 700, color: colors.gold, fontFamily: MONO, marginTop: 4 }}>{fmt(totalTxns)}</div></PCard>
                          <PCard colors={colors}><div style={{ fontSize: 9, color: colors.muted, fontFamily: MONO }}>EXACT FLOOR MATCHES</div><div style={{ fontSize: 18, fontWeight: 700, color: colors.gold, fontFamily: MONO, marginTop: 4 }}>{fmt(totalExact)}</div></PCard>
                          {floorPremium && <PCard colors={colors}><div style={{ fontSize: 9, color: colors.muted, fontFamily: MONO }}>HIGH vs LOW FLOOR PREMIUM</div><div style={{ fontSize: 24, fontWeight: 300, color: colors.gold, marginTop: 4 }}>+{floorPremium}%</div></PCard>}
                        </div>
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
                                      <div style={{ fontSize: 8, color: colors.textDim, fontFamily: MONO }}>{fp.floor_band}</div>
                                      <div style={{ fontSize: 14, fontWeight: 700, color: colors.text, fontFamily: MONO, marginTop: 2 }}>{fmt(Math.round(fp.avg_psf))}</div>
                                      <div style={{ fontSize: 8, color: colors.textDim }}>PSF</div>
                                      <div style={{ fontSize: 8, color: colors.textDim, marginTop: 2 }}>{fp.txn_count} txns</div>
                                      <ConfBadge confidence={fp.confidence} colors={colors} />
                                    </PCard>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                        <Divider label="DETAILED BREAKDOWN" />
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                            <thead>
                              <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                                {['Type', 'Floor Band', 'Avg PSF', 'Min', 'Max', 'Avg Price', 'Txns', 'Exact', 'Confidence'].map(h => (
                                  <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 9, color: colors.textDim, fontFamily: MONO, fontWeight: 600 }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {floorPricing.sort((a, b) => bandOrder.indexOf(a.floor_band) - bandOrder.indexOf(b.floor_band)).map((fp, i) => (
                                <tr key={i} style={{ borderBottom: `1px solid ${colors.border}22` }}>
                                  <td style={{ padding: '5px 8px', color: typeColor[fp.rooms_en] || colors.text }}>{fp.rooms_en}</td>
                                  <td style={{ padding: '5px 8px', fontFamily: MONO }}>{fp.floor_band}</td>
                                  <td style={{ padding: '5px 8px', fontFamily: MONO, color: colors.gold }}>{fmt(Math.round(fp.avg_psf))}</td>
                                  <td style={{ padding: '5px 8px', fontFamily: MONO, color: colors.textDim }}>{fmt(Math.round(fp.min_psf))}</td>
                                  <td style={{ padding: '5px 8px', fontFamily: MONO, color: colors.textDim }}>{fmt(Math.round(fp.max_psf))}</td>
                                  <td style={{ padding: '5px 8px', fontFamily: MONO }}>{fmtM(Math.round(fp.avg_price))}</td>
                                  <td style={{ padding: '5px 8px', fontFamily: MONO }}>{fp.txn_count}</td>
                                  <td style={{ padding: '5px 8px', fontFamily: MONO }}>{fp.exact_matches || 0}</td>
                                  <td style={{ padding: '5px 8px' }}><ConfBadge confidence={fp.confidence} colors={colors} /></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div style={{ fontSize: 9, color: colors.textDim, marginTop: 12, lineHeight: 1.5 }}>
                          Computed from {totalTxns} DLD transactions matched via area fingerprinting. {totalExact} exact floor matches.
                        </div>
                      </Section>
                    </div>
                    );
                  })()}

                  {/* SURROUNDINGS (V3 — 3x3 compass grid) */}
                  {tab === 'surroundings' && hasSurroundings && (
                    <div>
                      <Section title="8-Direction Surroundings" subtitle={`${surroundings.length} directions mapped`} accent colors={colors}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, maxWidth: 600, margin: '0 auto' }}>
                          {['NW','N','NE','W','CENTER','E','SW','S','SE'].map(dir => {
                            if (dir === 'CENTER') {
                              return (
                                <PCard key="CENTER" colors={colors} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: colors.goldBg }}>
                                  <div style={{ fontSize: 14, fontWeight: 600, color: colors.gold }}>{sel.project_name}</div>
                                  <div style={{ fontSize: 10, color: colors.textDim, marginTop: 4 }}>
                                    {sel.total_floors ? `${sel.total_floors} floors` : ''}{sel.total_units ? ` · ~${fmt(sel.total_units)} units` : ''}
                                  </div>
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
                                  <span style={{ fontSize: 16 }}>{s.icon || ''}</span>
                                  <Tag color={tc}>{s.type?.toUpperCase()}</Tag>
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: colors.text, marginBottom: 2 }}>{dir}</div>
                                <div style={{ fontSize: 10, color: colors.textSecondary, lineHeight: 1.4 }}>{s.what}</div>
                                {s.note && <div style={{ fontSize: 9, color: colors.textDim, marginTop: 3, fontStyle: 'italic' }}>{s.note}</div>}
                              </PCard>
                            );
                          })}
                        </div>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14, padding: '10px 0', borderTop: `1px solid ${colors.border}` }}>
                          {Object.entries(surrTypeColor).map(([type, col]) => (
                            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: colors.textSecondary }}>
                              <div style={{ width: 10, height: 10, borderRadius: 2, background: col + '44', border: `1px solid ${col}` }} />{type}
                            </div>
                          ))}
                        </div>
                      </Section>
                    </div>
                  )}

                  {/* BUILDING DNA (new) */}
                  {tab === 'buildingdna' && buildingShape.length > 0 && (
                    <div>
                      <Section title="Building DNA" subtitle="Structural and shape data from xray_building_shape" accent colors={colors}>
                        {buildingShape.map((bs, i) => (
                          <PCard key={i} colors={colors} style={{ marginBottom: 12 }}>
                            {bs.building_number && <div style={{ fontSize: 11, color: colors.gold, fontFamily: MONO, marginBottom: 8 }}>BUILDING {bs.building_number}</div>}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                              {bs.shape && <div style={{ padding: 8, background: colors.bg, borderRadius: 4 }}><div style={{ fontSize: 8, color: colors.muted, fontFamily: MONO }}>SHAPE</div><div style={{ fontSize: 13, color: colors.text, marginTop: 2 }}>{bs.shape}</div></div>}
                              {bs.footprint_sqm && <div style={{ padding: 8, background: colors.bg, borderRadius: 4 }}><div style={{ fontSize: 8, color: colors.muted, fontFamily: MONO }}>FOOTPRINT</div><div style={{ fontSize: 13, color: colors.text, marginTop: 2 }}>{fmt(bs.footprint_sqm)} sqm</div></div>}
                              {bs.total_floors && <div style={{ padding: 8, background: colors.bg, borderRadius: 4 }}><div style={{ fontSize: 8, color: colors.muted, fontFamily: MONO }}>FLOORS</div><div style={{ fontSize: 13, color: colors.text, marginTop: 2 }}>{bs.total_floors}</div></div>}
                              {bs.tower_count && <div style={{ padding: 8, background: colors.bg, borderRadius: 4 }}><div style={{ fontSize: 8, color: colors.muted, fontFamily: MONO }}>TOWERS</div><div style={{ fontSize: 13, color: colors.text, marginTop: 2 }}>{bs.tower_count}</div></div>}
                              {bs.podium_floors && <div style={{ padding: 8, background: colors.bg, borderRadius: 4 }}><div style={{ fontSize: 8, color: colors.muted, fontFamily: MONO }}>PODIUM</div><div style={{ fontSize: 13, color: colors.text, marginTop: 2 }}>{bs.podium_floors} floors</div></div>}
                              {bs.parking_levels && <div style={{ padding: 8, background: colors.bg, borderRadius: 4 }}><div style={{ fontSize: 8, color: colors.muted, fontFamily: MONO }}>PARKING</div><div style={{ fontSize: 13, color: colors.text, marginTop: 2 }}>{bs.parking_levels} levels</div></div>}
                              {bs.units_per_floor && <div style={{ padding: 8, background: colors.bg, borderRadius: 4 }}><div style={{ fontSize: 8, color: colors.muted, fontFamily: MONO }}>UNITS/FLOOR</div><div style={{ fontSize: 13, color: colors.text, marginTop: 2 }}>{bs.units_per_floor}</div></div>}
                              {bs.core_count && <div style={{ padding: 8, background: colors.bg, borderRadius: 4 }}><div style={{ fontSize: 8, color: colors.muted, fontFamily: MONO }}>CORES</div><div style={{ fontSize: 13, color: colors.text, marginTop: 2 }}>{bs.core_count}</div></div>}
                              {bs.orientation && <div style={{ padding: 8, background: colors.bg, borderRadius: 4 }}><div style={{ fontSize: 8, color: colors.muted, fontFamily: MONO }}>ORIENTATION</div><div style={{ fontSize: 13, color: colors.text, marginTop: 2 }}>{bs.orientation}</div></div>}
                            </div>
                            {bs.notes && <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 8, lineHeight: 1.5 }}>{bs.notes}</div>}
                          </PCard>
                        ))}
                      </Section>
                    </div>
                  )}

                  {/* SERVICE CHARGES (new) */}
                  {tab === 'servicecharges' && serviceCharges.length > 0 && (
                    <div>
                      <Section title="Service Charge History" subtitle="Yearly service charge data from xray_service_charges" accent colors={colors}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                          <PCard colors={colors}>
                            <div style={{ fontSize: 9, color: colors.muted, fontFamily: MONO }}>LATEST SC/SQFT</div>
                            <div style={{ fontSize: 24, fontWeight: 300, color: colors.gold, marginTop: 4 }}>
                              AED {serviceCharges[0]?.rate_per_sqft ? Number(serviceCharges[0].rate_per_sqft).toFixed(2) : '—'}
                            </div>
                            <div style={{ fontSize: 10, color: colors.textSecondary }}>{serviceCharges[0]?.year} · {serviceCharges[0]?.source || 'Mollak'}</div>
                          </PCard>
                          {serviceCharges.length >= 2 && (() => {
                            const latest = serviceCharges[0]?.rate_per_sqft;
                            const prev = serviceCharges[1]?.rate_per_sqft;
                            const change = latest && prev ? ((latest - prev) / prev * 100).toFixed(1) : null;
                            return (
                              <PCard colors={colors}>
                                <div style={{ fontSize: 9, color: colors.muted, fontFamily: MONO }}>YOY CHANGE</div>
                                <div style={{ fontSize: 24, fontWeight: 300, color: change && Number(change) > 0 ? colors.coral : colors.green, marginTop: 4 }}>
                                  {change ? `${Number(change) > 0 ? '+' : ''}${change}%` : '—'}
                                </div>
                                <div style={{ fontSize: 10, color: colors.textSecondary }}>{serviceCharges[1]?.year} → {serviceCharges[0]?.year}</div>
                              </PCard>
                            );
                          })()}
                        </div>
                        {serviceCharges.map((sc, i) => (
                          <PCard key={i} colors={colors} style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{sc.year}</span>
                              <span style={{ fontSize: 10, color: colors.textDim, marginLeft: 8 }}>{sc.source || 'Mollak'}</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 14, color: colors.gold, fontFamily: MONO }}>AED {sc.rate_per_sqft ? Number(sc.rate_per_sqft).toFixed(2) : '—'}/sqft</div>
                              {sc.total_budget && <div style={{ fontSize: 10, color: colors.textDim }}>Budget: AED {fmtM(sc.total_budget)}</div>}
                            </div>
                          </PCard>
                        ))}
                      </Section>
                    </div>
                  )}

                  {/* PAYMENT PLAN (new) */}
                  {tab === 'paymentplan' && paymentPlan.length > 0 && (
                    <div>
                      <Section title="Payment Plan" subtitle="Milestone-based payment schedule from xray_payment_plan" accent colors={colors}>
                        {paymentPlan.map((pp, i) => {
                          const pct = pp.percentage || 0;
                          return (
                            <PCard key={i} colors={colors} style={{ marginBottom: 8 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: colors.goldBg, border: `1px solid ${colors.gold}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: colors.gold, fontFamily: MONO }}>{pp.milestone_number}</div>
                                  <div>
                                    <div style={{ fontSize: 13, fontWeight: 500, color: colors.text }}>{pp.milestone_name || pp.description || `Milestone ${pp.milestone_number}`}</div>
                                    {pp.trigger_event && <div style={{ fontSize: 10, color: colors.textDim }}>{pp.trigger_event}</div>}
                                  </div>
                                </div>
                                <div style={{ fontSize: 20, fontWeight: 700, color: colors.gold, fontFamily: MONO }}>{pct}%</div>
                              </div>
                              <div style={{ height: 4, background: colors.elevated, borderRadius: 2, overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: colors.gold, borderRadius: 2 }} />
                              </div>
                            </PCard>
                          );
                        })}
                        <PCard colors={colors} style={{ marginTop: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>Total</span>
                            <span style={{ fontSize: 20, fontWeight: 700, color: colors.gold, fontFamily: MONO }}>
                              {paymentPlan.reduce((a, pp) => a + (pp.percentage || 0), 0)}%
                            </span>
                          </div>
                        </PCard>
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
                                  <Tag color={tc}>{zi.insight_type?.replace(/_/g, ' ').toUpperCase()}</Tag>
                                  <ConfBadge confidence={zi.confidence} colors={colors} />
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 4 }}>{zi.title}</div>
                                <div style={{ fontSize: 11, color: colors.textSecondary, lineHeight: 1.7 }}>{zi.insight}</div>
                                {zi.data_source && (
                                  <div style={{ fontSize: 9, color: colors.textDim, marginTop: 6, fontFamily: MONO }}>
                                    Source: {zi.data_source}{zi.computed_from ? ` · ${zi.computed_from}` : ''}
                                  </div>
                                )}
                              </PCard>
                            );
                          })}
                          <div style={{ textAlign: 'center', padding: '8px 16px', background: colors.goldFaint, border: `1px solid ${colors.gold}20`, borderRadius: 6, marginTop: 16 }}>
                            <span style={{ fontSize: 11, color: colors.textSecondary }}>Every insight computed from DLD transactions, Ejari contracts, or Mollak service charges. No manual opinions.</span>
                          </div>
                        </Section>
                      ) : (
                      <>
                      <Section title="What They Don't Tell You" subtitle="The honest things no marketing brochure includes" accent colors={colors}>
                        <PCard colors={colors} style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8, color: colors.text }}>Service Charge Reality</div>
                          {sel.sc_source === 'mollak_confirmed' ? (
                            <div style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.7 }}>
                              Mollak confirmed SC: AED {Number(sel.service_charge_per_sqft).toFixed(1)}/sqft ({sel.service_charge_year}).
                              {sel.sc_year_1 && ` First year recorded: AED ${Number(sel.sc_year_1).toFixed(1)}/sqft (${sel.sc_year_1_yr}).`}
                              {' '}Service charges typically increase 3-5% annually. On a {sel.size_range_sqft_min || 1000} sqft unit, that is
                              AED {fmt(Math.round((sel.service_charge_per_sqft || 0) * (sel.size_range_sqft_min || 1000)))}/year today.
                            </div>
                          ) : sel.sc_source === 'rera_estimate' ? (
                            <div style={{ fontSize: 12, color: colors.amber, lineHeight: 1.7 }}>
                              No Mollak SC available yet. RERA placeholder estimate: ~AED {Number(sel.offplan_estimated_sc).toFixed(1)}/sqft. Expect ±30% variance.
                            </div>
                          ) : (
                            <div style={{ fontSize: 12, color: colors.textDim, lineHeight: 1.7 }}>Service charge data not yet available for this project.</div>
                          )}
                        </PCard>

                        {(isApt || isOffplan) && sel.apt_worst_direction && (
                          <PCard colors={colors} style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8, color: colors.text }}>Direction & Noise</div>
                            <div style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.7 }}>
                              Caution direction: {sel.apt_worst_direction}. {sel.apt_noise_floor_threshold ? `Noise attenuates above floor ${sel.apt_noise_floor_threshold}.` : ''}
                              {' '}Best direction: {sel.apt_best_direction}. {sel.apt_view_premium_pct ? `View premium: ~${sel.apt_view_premium_pct}%.` : ''}
                            </div>
                          </PCard>
                        )}

                        {isVilla && sel.villa_highway_distance_m && (
                          <PCard colors={colors} style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8, color: colors.text }}>Highway & Noise</div>
                            <div style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.7 }}>
                              {sel.villa_highway_name} is {sel.villa_highway_distance_m}m away. Noise risk: {sel.villa_highway_noise_risk}.
                              {sel.villa_highway_noise_risk === 'moderate' ? ' Perimeter villas closest to the highway will hear traffic. Interior plots are significantly quieter.' : ''}
                            </div>
                          </PCard>
                        )}

                        {isOffplan && (
                          <PCard colors={colors} style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8, color: colors.text }}>Delivery Risk</div>
                            <div style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.7 }}>
                              {sel.developer} average historical delay: {sel.offplan_developer_delay_history_months || 'unknown'} months.
                              Expected handover: {sel.offplan_expected_handover?.slice(0, 7) || 'TBD'}.
                              {sel.offplan_developer_delay_history_months > 6 ? ' Budget an extra 6-12 months beyond stated date.' : ' Reasonable delivery track record.'}
                            </div>
                          </PCard>
                        )}

                        {ejari.length > 0 && (
                          <PCard colors={colors} style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8, color: colors.text }}>Rental Spread</div>
                            <div style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.7 }}>
                              {ejari.map((e: R) => {
                                const minR = e.min_rent_aed || e.min_rent || 0;
                                const maxR = e.max_rent_aed || e.max_rent || 0;
                                const spread = minR > 0 ? Math.round(((maxR - minR) / minR) * 100) : 0;
                                return `${e.unit_type || e.bedrooms}: AED ${fmt(minR)} to ${fmt(maxR)}/yr (${spread}% spread across ${e.contract_count} contracts). `;
                              }).join('')}
                              The unit you pick matters more than the building you pick.
                            </div>
                          </PCard>
                        )}
                      </Section>

                      <div style={{ textAlign: 'center', padding: '12px 16px', background: colors.goldFaint, border: `1px solid ${colors.gold}20`, borderRadius: 6 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: colors.gold, fontFamily: MONO, marginBottom: 6 }}>DATA SOURCES</div>
                        <div style={{ fontSize: 11, color: colors.textSecondary, lineHeight: 1.6 }}>
                          Transactions: DLD ({fmt(dldRecent.length)} recent). Rentals: Ejari ({ejari.reduce((a: number, e: R) => a + e.contract_count, 0)} contracts). Service charges: Mollak ({sel.sc_source}).
                        </div>
                        <div style={{ marginTop: 8, fontSize: 11, color: colors.gold, fontStyle: 'italic' }}>
                          Every number in this document can be independently verified.
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
            <div style={{ textAlign: 'center', padding: '24px 20px', borderTop: `1px solid ${colors.border}` }}>
              <span style={{ fontSize: 9, color: colors.muted, letterSpacing: 1, fontFamily: MONO }}>ZEROAGENT PROPERTY INTELLIGENCE · LIVE FROM SUPABASE</span>
              <br />
              <span style={{ fontSize: 10, color: colors.textDim }}>Independent analysis. No commercial relationship with any developer.</span>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 80, color: colors.textDim }}>
            Select a project from the sidebar
          </div>
        )}
      </div>
    </div>
  );
}
