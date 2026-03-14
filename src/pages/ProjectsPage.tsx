import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@/lib/theme';
import { sb } from '@/lib/supabase';
import { Loader2, Search, Sun, Moon } from 'lucide-react';
import { MONO, Tag, Stat, Divider, Accordion, VIEW_QUALITY_COLOR, SC_SOURCE_COLOR, Pip } from '@/components/xray/Atoms';
import { ShapeRenderer, ShapeBadge } from '@/components/xray/ShapeRenderer';
import { OrientationCompass, MiniCompass, aggregateOrientation } from '@/components/xray/OrientationCompass';
import { PaymentTimeline } from '@/components/xray/PaymentTimeline';
import { ViewBlockingSummary, ViewBlockingDetail } from '@/components/xray/ViewBlockingCards';
import { FloorPlateViz } from '@/components/xray/FloorPlateViz';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>;

const fmt = (n: number | string | null | undefined): string => n ? Number(n).toLocaleString('en-AE') : '—';
const fmtM = (n: number | null | undefined): string => {
  if (!n) return '—';
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : fmt(n);
};

function PCard({ children, style: s }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const { colors } = useTheme();
  return (
    <div style={{ padding: 16, background: colors.surface, borderRadius: 6, border: `1px solid ${colors.border}`, ...s }}>
      {children}
    </div>
  );
}

function Section({ title, subtitle, children, accent }: { title: string; subtitle?: string; children: React.ReactNode; accent?: boolean }) {
  const { colors } = useTheme();
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

function ConfBadge({ confidence }: { confidence?: string }) {
  const { colors } = useTheme();
  if (confidence === 'verified') return <span style={{ fontSize: 9, color: colors.green }}>● VERIFIED</span>;
  if (confidence === 'inferred') return <span style={{ fontSize: 9, color: colors.amber }}>● INFERRED</span>;
  return <span style={{ fontSize: 9, color: colors.coral }}>● ESTIMATED</span>;
}

/* ═══════════════════════════════════════════════════
   LEFT SIDEBAR
   ═══════════════════════════════════════════════════ */
function ProjectSidebar({ projects, sel, onSelect, enrichmentMap }: {
  projects: R[]; sel: R | null; onSelect: (p: R) => void;
  enrichmentMap: Map<string, R>;
}) {
  const { colors } = useTheme();
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

  // Enrichment dots: shape, unit_types, orientation, DLD, ejari
  const enrichDots = (p: R) => {
    const e = enrichmentMap.get(p.id);
    const dots = [
      { label: 'shape', on: !!e?.has_shape },
      { label: 'units', on: !!e?.has_units },
      { label: 'orient', on: !!e?.has_orientation },
      { label: 'DLD', on: !!e?.has_dld },
      { label: 'ejari', on: !!e?.has_ejari },
    ];
    const filled = dots.filter(d => d.on).length;
    return { dots, filled };
  };

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
          const { dots, filled } = enrichDots(p);
          return (
            <div key={p.id} onClick={() => onSelect(p)} style={{
              padding: '10px 12px', cursor: 'pointer',
              background: active ? colors.goldBg : 'transparent',
              borderLeft: `3px solid ${active ? colors.gold : 'transparent'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? colors.gold : colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {p.project_name}
                </div>
                {p.total_floors && <span style={{ fontSize: 9, color: colors.textDim, fontFamily: MONO, marginLeft: 6 }}>{p.total_floors}F</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                <Tag color={cc}>{catLabel[p.project_category] || ''}</Tag>
                {p.has_unit_registry && <Tag color={colors.gold}>V3</Tag>}
                <span style={{ fontSize: 9, color: colors.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.master_community}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                {p.avg_price_per_sqft && (
                  <span style={{ fontSize: 9, color: colors.textSecondary, fontFamily: MONO }}>AED {fmt(p.avg_price_per_sqft)}/sqft</span>
                )}
                <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                  {dots.map((d, i) => (
                    <Pip key={i} size={4} color={d.on ? colors.gold : colors.dim} />
                  ))}
                  <span style={{ fontSize: 8, color: colors.textDim, marginLeft: 2 }}>{filled}/5</span>
                </div>
              </div>
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
  const scSourceColors = SC_SOURCE_COLOR(colors);

  const [projects, setProjects] = useState<R[]>([]);
  const [sel, setSel] = useState<R | null>(null);
  const [tab, setTab] = useState('overview');
  // Core data
  const [units, setUnits] = useState<R[]>([]);
  const [brochureUnits, setBrochureUnits] = useState<R[]>([]);
  const [amenities, setAmenities] = useState<R[]>([]);
  const [infra, setInfra] = useState<R[]>([]);
  const [dldRecent, setDldRecent] = useState<R[]>([]);
  const [dldSummary, setDldSummary] = useState<R[]>([]);
  const [ejari, setEjari] = useState<R[]>([]);
  const [viewBlocking, setViewBlocking] = useState<R[]>([]);
  // V3 / enriched tables
  const [floorUnitMatrix, setFloorUnitMatrix] = useState<R[]>([]);
  const [matrixBuildings, setMatrixBuildings] = useState<string[]>([]);
  const [floorPricing, setFloorPricing] = useState<R[]>([]);
  const [surroundings, setSurroundings] = useState<R[]>([]);
  const [zaInsights, setZaInsights] = useState<R[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  // New data sources
  const [buildingShape, setBuildingShape] = useState<R[]>([]);
  const [paymentPlan, setPaymentPlan] = useState<R[]>([]);
  const [serviceCharges, setServiceCharges] = useState<R[]>([]);
  const [floorplates, setFloorplates] = useState<R[]>([]);
  const [priceModel, setPriceModel] = useState<R[]>([]);
  const [enrichmentMap, setEnrichmentMap] = useState<Map<string, R>>(new Map());
  const [govAlignment, setGovAlignment] = useState<R[]>([]);
  const [psmBenchmarks, setPsmBenchmarks] = useState<R[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load project list + enrichment tracker
  useEffect(() => {
    (async () => {
      try {
        const [projRes, enrichRes] = await Promise.all([
          sb.from('xray_projects').select('*')
            .not('avg_price_per_sqft', 'is', null)
            .order('avg_price_per_sqft', { ascending: false })
            .limit(300),
          sb.from('xray_enrichment_tracker').select('*'),
        ]);
        if (projRes.error) { console.error('[Projects] xray_projects error:', projRes.error.message); setError(projRes.error.message); }
        const data = projRes.data || [];
        setProjects(data);
        if (data.length) setSel(data[0]);

        // Build enrichment map
        const eMap = new Map<string, R>();
        for (const e of (enrichRes.data || [])) eMap.set(e.project_id, e);
        setEnrichmentMap(eMap);
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
        // Batch 1: core tables by project_id
        const [u, bu, a, i, bs, pp, sc, fp, pm] = await Promise.all([
          sb.from('xray_unit_types').select('*').eq('project_id', sel.id).order('starting_price_aed', { ascending: true }),
          sb.from('xray_brochure_unit_types').select('*').eq('project_id', sel.id).order('starting_price_aed', { ascending: true }),
          sb.from('xray_project_amenities').select('*').eq('project_id', sel.id).order('amenity_category', { ascending: true }),
          sb.from('xray_infrastructure').select('*').eq('project_id', sel.id).order('distance_km', { ascending: true }),
          sb.from('xray_building_shape').select('*').eq('project_id', sel.id),
          sb.from('xray_payment_plan').select('*').eq('project_id', sel.id).order('milestone_number'),
          sb.from('xray_service_charges').select('*').eq('project_id', sel.id).order('year', { ascending: false }),
          sb.from('xray_floorplate').select('*').eq('project_id', sel.id).order('floor_range_start'),
          sb.from('xray_price_model').select('*').eq('project_id', sel.id).order('unit_type'),
        ]);
        setUnits(u.data || []); setBrochureUnits(bu.data || []);
        setAmenities(a.data || []); setInfra(i.data || []);
        setBuildingShape(bs.data || []); setPaymentPlan(pp.data || []);
        setServiceCharges(sc.data || []); setFloorplates(fp.data || []);
        setPriceModel(pm.data || []);

        // Batch 2: DLD + Ejari — try RERA first, fallback to name match
        if (sel.rera_registration_no) {
          const [dr, ds, ej] = await Promise.all([
            sb.from('xray_dld_recent').select('*').eq('project_number', sel.rera_registration_no).order('instance_date', { ascending: false }).limit(20),
            sb.from('xray_dld_summary').select('*').eq('project_number', sel.rera_registration_no),
            sb.from('xray_ejari_summary').select('*').eq('project_number', sel.rera_registration_no).order('unit_type', { ascending: true }),
          ]);
          setDldRecent(dr.data || []); setDldSummary(ds.data || []); setEjari(ej.data || []);
        } else {
          // Fallback: join by project_name
          const [dr, ds, ej] = await Promise.all([
            sb.from('xray_dld_recent').select('*').ilike('project_name_en', sel.project_name).order('instance_date', { ascending: false }).limit(20),
            sb.from('xray_dld_summary').select('*').ilike('project_name_en', sel.project_name),
            sb.from('xray_ejari_summary').select('*').ilike('project_name_en', sel.project_name).order('unit_type', { ascending: true }),
          ]);
          setDldRecent(dr.data || []); setDldSummary(ds.data || []); setEjari(ej.data || []);
        }

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

        // Batch 3: V3 tables
        const [fpRes, srRes, ziRes] = await Promise.all([
          sb.from('xray_floor_pricing').select('*').eq('project_id', sel.id).order('rooms_en').order('floor_band'),
          sb.from('xray_surroundings').select('*').eq('project_id', sel.id).order('direction'),
          sb.from('xray_za_insights').select('*').eq('project_id', sel.id).order('sort_order'),
        ]);
        setFloorPricing(fpRes.data || []); setSurroundings(srRes.data || []);
        setZaInsights(ziRes.data || []);

        // Batch 4: Community-level
        if (sel.master_community) {
          const [gaRes, psmRes] = await Promise.all([
            sb.from('xray_government_alignment').select('*').eq('master_community', sel.master_community),
            sb.from('xray_psm_benchmarks').select('*').eq('master_community', sel.master_community),
          ]);
          setGovAlignment(gaRes.data || []); setPsmBenchmarks(psmRes.data || []);
        } else { setGovAlignment([]); setPsmBenchmarks([]); }

        // Floor unit matrix — get building list, load first building
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
  const floorUnits = useMemo(() => selectedFloor ? floorUnitMatrix.filter(u => String(u.floor) === selectedFloor) : [], [floorUnitMatrix, selectedFloor]);
  const orientationData = useMemo(() => aggregateOrientation(floorUnitMatrix), [floorUnitMatrix]);
  const displayUnits = brochureUnits.length > 0 ? brochureUnits : units;
  const selectedShape = buildingShape.find(s => s.building_number === selectedBuilding) || buildingShape[0];

  // Yield computation
  const avgDldPrice = dldSummary.length ? dldSummary.reduce((a: number, d: R) => a + (d.avg_price || 0), 0) / dldSummary.length : 0;
  const avgEjariRent = ejari.length ? ejari.reduce((a: number, e: R) => a + (e.avg_rent_aed || e.avg_rent || 0), 0) / ejari.length : 0;
  const grossYield = avgDldPrice > 0 && avgEjariRent > 0 ? ((avgEjariRent / avgDldPrice) * 100).toFixed(1) : null;

  const cat = sel?.project_category;
  const isApt = cat === 'apartment';
  const isVilla = cat === 'villa';
  const isOffplan = cat === 'off_plan';
  const hasMatrix = floorUnitMatrix.length > 0;
  const hasFloorPricing = floorPricing.length > 0;
  const hasInsights = zaInsights.length > 0;
  const hasSurroundings = surroundings.length > 0;
  const hasOrientation = orientationData.length > 0;

  const catColorFn = (c: string) => c === 'apartment' ? colors.blue : c === 'villa' ? colors.green : c === 'off_plan' ? colors.amber : colors.muted;

  const typeColor: Record<string, string> = {
    '1 B/R': colors.blue, '2 B/R': colors.indigo, '3 B/R': colors.amber,
    '4 B/R': colors.green, '5 B/R': colors.coral, 'Studio': colors.textSecondary,
  };
  const surrTypeColor: Record<string, string> = {
    premium: colors.gold, positive: colors.green, mixed: colors.blue,
    neutral: colors.muted, caution: colors.amber, negative: colors.coral,
  };
  const insightTypeColor: Record<string, string> = {
    price_spread: colors.coral, yield_signal: colors.green, sc_impact: colors.amber,
    data_gap: colors.muted, orientation_premium: colors.gold, rental_demand: colors.blue,
  };

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

  const tabs = [
    { key: 'overview', label: 'Overview' },
    ...(buildingShape.length > 0 ? [{ key: 'buildingdna', label: 'Building DNA' }] : []),
    ...(hasMatrix ? [{ key: 'floorplate', label: 'Floor Plate' }] : []),
    { key: 'units', label: 'Unit Types' },
    ...(hasFloorPricing || priceModel.length > 0 ? [{ key: 'floorpricing', label: 'Floor Pricing' }] : []),
    ...(hasOrientation ? [{ key: 'orientation', label: 'Orientation' }] : []),
    ...(serviceCharges.length > 0 ? [{ key: 'servicecharges', label: 'Service Charges' }] : []),
    ...(paymentPlan.length > 0 ? [{ key: 'paymentplan', label: 'Payment Plan' }] : []),
    ...(viewBlocking.length > 0 || isApt || isOffplan ? [{ key: 'viewblock', label: 'View Risk' }] : []),
    ...(dldSummary.length > 0 || dldRecent.length > 0 ? [{ key: 'evidence', label: 'DLD' }] : []),
    ...(ejari.length > 0 ? [{ key: 'rentals', label: 'Ejari' }] : []),
    ...(amenities.length > 0 ? [{ key: 'amenities', label: 'Amenities' }] : []),
    ...(infra.length > 0 ? [{ key: 'infra', label: 'Infrastructure' }] : []),
    ...(hasSurroundings ? [{ key: 'surroundings', label: 'Surroundings' }] : []),
    ...(isVilla ? [{ key: 'community', label: 'Community' }] : []),
    ...(isOffplan ? [{ key: 'offplan', label: 'Construction' }] : []),
    { key: 'insights', label: hasInsights ? 'ZA Insights' : "What They Don't Tell You" },
  ];

  return (
    <div style={{ display: 'flex', height: '100%', color: colors.text }}>
      <ProjectSidebar projects={projects} sel={sel} onSelect={setSel} enrichmentMap={enrichmentMap} />
      <div style={{ flex: 1, overflowY: 'auto', height: '100%' }}>
        {sel ? (
          <>
            {/* ═══ MASTHEAD ═══ */}
            <div style={{ padding: '32px 28px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 0%, ${colors.gold}06 0%, transparent 60%)` }} />
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <Pip color={colors.green} size={6} />
                  <span style={{ fontSize: 9, color: colors.green, fontFamily: MONO, letterSpacing: '0.1em' }}>ZEROAGENT X-RAY</span>
                  <span style={{ fontSize: 9, color: colors.textDim, fontFamily: MONO }}>LIVE</span>
                </div>
                <div style={{ position: 'absolute', top: 0, right: 0 }}>
                  <button onClick={toggle} style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: 6, padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    {isDark ? <Sun size={14} style={{ color: colors.gold }} /> : <Moon size={14} style={{ color: colors.gold }} />}
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12, marginTop: 24 }}>
                  <Tag color={catColorFn(cat)}>{cat === 'apartment' ? 'APT' : cat === 'villa' ? 'VILLA' : cat === 'off_plan' ? 'OFF-PLAN' : cat}</Tag>
                  {sel.sc_source && <Tag color={scSourceColors[sel.sc_source as keyof typeof scSourceColors] || colors.muted}>{sel.sc_source === 'mollak_confirmed' ? 'MOLLAK SC' : sel.sc_source === 'rera_estimate' ? 'RERA SC' : sel.sc_source?.replace(/_/g, ' ').toUpperCase()}</Tag>}
                  {sel.enrichment_status === 'complete' && <Tag color={colors.green}>ENRICHED</Tag>}
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
                    { l: 'AVG PSF', v: `${fmt(sel.avg_price_per_sqft)}` },
                    { l: 'STATUS', v: sel.project_status?.replace(/_/g, ' ') },
                  ].map((s, i) => (
                    <div key={i} style={{ textAlign: 'center', padding: '12px 0' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: colors.gold, fontFamily: MONO }}>{s.v}</div>
                      <div style={{ fontSize: 9, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: MONO, marginTop: 4 }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ═══ TABS ═══ */}
            <div style={{ borderBottom: `1px solid ${colors.border}`, padding: '0 20px', display: 'flex', gap: 0, overflowX: 'auto' }}>
              {tabs.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} style={{
                  padding: '10px 14px', fontSize: 11, fontWeight: tab === t.key ? 700 : 400, cursor: 'pointer',
                  background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.key ? colors.gold : 'transparent'}`,
                  color: tab === t.key ? colors.gold : colors.textSecondary, whiteSpace: 'nowrap', fontFamily: MONO,
                }}>{t.label}</button>
              ))}
            </div>

            {/* ═══ CONTENT ═══ */}
            <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px' }}>
              {detailLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Loader2 className="animate-spin" size={24} style={{ color: colors.gold }} /></div>
              ) : (
                <>
                  {/* ═══ OVERVIEW TAB ═══ */}
                  {tab === 'overview' && (
                    <div>
                      {/* Key Stats */}
                      <Section title="At a Glance" accent>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          <Stat label="AVG PSF" value={`${fmt(sel.avg_price_per_sqft)}`} unit="AED/sqft" sub="DLD verified" />
                          <Stat label="SC PSF" value={sel.service_charge_per_sqft ? Number(sel.service_charge_per_sqft).toFixed(1) : sel.offplan_estimated_sc ? `~${Number(sel.offplan_estimated_sc).toFixed(1)}` : '—'} unit="AED/sqft"
                            sub={sel.sc_source === 'mollak_confirmed' ? `Mollak ${sel.service_charge_year}` : sel.sc_source === 'rera_estimate' ? 'RERA estimate' : 'Pending'}
                            accent={scSourceColors[sel.sc_source as keyof typeof scSourceColors] || colors.muted} />
                          <Stat label="TOTAL UNITS" value={sel.total_units ? `~${fmt(sel.total_units)}` : hasMatrix ? String(floorUnitMatrix.length) : '—'} sub={hasMatrix ? `${floorUnitMatrix.length} mapped in matrix` : undefined} />
                          {grossYield && <Stat label="GROSS YIELD" value={grossYield} unit="%" sub={`Ejari avg / DLD avg`} accent={Number(grossYield) >= 6 ? colors.green : colors.amber} />}
                        </div>
                      </Section>

                      {/* Building DNA Summary */}
                      {buildingShape.length > 0 && (
                        <Section title="Building DNA">
                          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                            {buildingShape.slice(0, 3).map((bs, i) => (
                              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 12, background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: 6 }}>
                                <ShapeRenderer shape={bs} size={80} />
                                <div>
                                  {bs.building_number && <div style={{ fontSize: 10, color: colors.gold, fontFamily: MONO }}>BLDG {bs.building_number}</div>}
                                  <div style={{ fontSize: 13, color: colors.text }}>{bs.shape_type?.replace(/_/g, ' ')}</div>
                                  {bs.total_floors && <div style={{ fontSize: 10, color: colors.textSecondary }}>{bs.total_floors} floors</div>}
                                  {bs.units_per_floor && <div style={{ fontSize: 10, color: colors.textDim }}>{bs.units_per_floor} units/floor</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </Section>
                      )}

                      {/* Quick Orientation Map */}
                      {hasOrientation && (
                        <Section title="Orientation Overview" subtitle="Aggregated from floor unit matrix">
                          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                            <MiniCompass data={orientationData} size={100} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 4 }}>
                                {orientationData.sort((a, b) => b.unit_count - a.unit_count).slice(0, 6).map(d => {
                                  const vqColors = VIEW_QUALITY_COLOR(colors);
                                  const c = vqColors[d.dominant_quality as keyof typeof vqColors] || colors.textSecondary;
                                  return (
                                    <div key={d.direction} style={{ padding: '6px 8px', background: `${c}10`, borderRadius: 4, border: `1px solid ${c}25` }}>
                                      <div style={{ fontSize: 11, fontWeight: 700, color: c }}>{d.direction} <span style={{ fontWeight: 400, color: colors.textDim }}>({d.unit_count})</span></div>
                                      <div style={{ fontSize: 8, color: colors.textDim }}>{d.view_types.slice(0, 2).join(', ')}</div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </Section>
                      )}

                      {/* View Blocking Summary */}
                      {viewBlocking.length > 0 && (
                        <Section title="View Risk Summary">
                          <ViewBlockingSummary blockers={viewBlocking} />
                        </Section>
                      )}

                      {/* Key Features */}
                      {sel.brochure_usps?.length > 0 && (
                        <Section title="Key Features" subtitle="Developer positioning and verified highlights">
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {sel.brochure_usps.map((u: string, i: number) => (
                              <PCard key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <div style={{ width: 4, height: 20, borderRadius: 2, background: colors.gold, flexShrink: 0 }} />
                                <span style={{ fontSize: 12, color: colors.text }}>{u}</span>
                              </PCard>
                            ))}
                          </div>
                        </Section>
                      )}

                      {/* Off-Plan Quick Status */}
                      {isOffplan && sel.offplan_construction_pct != null && (
                        <Section title="Off-Plan Status">
                          <PCard>
                            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                              <div><div style={{ fontSize: 9, color: colors.muted, fontFamily: MONO }}>CONSTRUCTION</div><div style={{ fontSize: 28, fontWeight: 300, color: colors.amber }}>{sel.offplan_construction_pct}%</div></div>
                              <div><div style={{ fontSize: 9, color: colors.muted, fontFamily: MONO }}>HANDOVER</div><div style={{ fontSize: 16, color: colors.text }}>{sel.offplan_expected_handover?.slice(0, 7) || 'TBD'}</div></div>
                              <div><div style={{ fontSize: 9, color: colors.muted, fontFamily: MONO }}>DELAY HISTORY</div><div style={{ fontSize: 16, color: sel.offplan_developer_delay_history_months > 6 ? colors.amber : colors.green }}>{sel.offplan_developer_delay_history_months || 0} months</div></div>
                            </div>
                            <div style={{ marginTop: 12, height: 8, background: colors.elevated, borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ width: `${sel.offplan_construction_pct}%`, height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${colors.amber}, ${colors.green})` }} />
                            </div>
                          </PCard>
                        </Section>
                      )}

                      {/* ZA Insights Preview */}
                      {zaInsights.length > 0 && (
                        <Section title="Key Insights" subtitle="From ZA Intelligence">
                          {zaInsights.slice(0, 3).map((zi, i) => {
                            const tc = insightTypeColor[zi.insight_type] || colors.textDim;
                            return (
                              <PCard key={i} style={{ marginBottom: 8, borderLeft: `3px solid ${tc}` }}>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                                  <Tag color={tc}>{zi.insight_type?.replace(/_/g, ' ').toUpperCase()}</Tag>
                                </div>
                                <div style={{ fontSize: 12, color: colors.text, fontWeight: 600 }}>{zi.title}</div>
                                <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4, lineHeight: 1.6 }}>{zi.insight}</div>
                              </PCard>
                            );
                          })}
                          {zaInsights.length > 3 && (
                            <div style={{ fontSize: 10, color: colors.gold, cursor: 'pointer', textAlign: 'center', marginTop: 8 }} onClick={() => setTab('insights')}>
                              View all {zaInsights.length} insights →
                            </div>
                          )}
                        </Section>
                      )}

                      {/* Government Alignment */}
                      {govAlignment.length > 0 && (
                        <Accordion title="Government Alignment" tag="DUBAI 2040" tagColor={colors.sky}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, marginTop: 8 }}>
                            {govAlignment.map((ga, i) => (
                              <div key={i} style={{ padding: 10, background: colors.bg, borderRadius: 4 }}>
                                <div style={{ fontSize: 9, color: colors.muted, fontFamily: MONO }}>{ga.initiative_name || ga.metric}</div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: colors.sky, fontFamily: MONO, marginTop: 2 }}>{ga.score || ga.alignment_pct}%</div>
                                {ga.description && <div style={{ fontSize: 9, color: colors.textDim, marginTop: 2 }}>{ga.description}</div>}
                              </div>
                            ))}
                          </div>
                        </Accordion>
                      )}

                      {/* Data sources footer */}
                      <div style={{ display: 'inline-block', marginTop: 16, padding: '8px 16px', background: colors.goldFaint, border: `1px solid ${colors.gold}20`, borderRadius: 6 }}>
                        <span style={{ fontSize: 11, color: colors.textSecondary }}>Every number sourced from DLD transactions, Ejari contracts, Mollak service charges, or verified public data.</span>
                      </div>
                    </div>
                  )}

                  {/* ═══ BUILDING DNA TAB ═══ */}
                  {tab === 'buildingdna' && buildingShape.length > 0 && (
                    <div>
                      <Section title="Building DNA" subtitle="Structural and shape data from xray_building_shape" accent>
                        {buildingShape.map((bs, i) => (
                          <PCard key={i} style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                              {/* SVG shape */}
                              <ShapeRenderer shape={bs} size={140} />
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                  {bs.building_number && <span style={{ fontSize: 13, color: colors.gold, fontFamily: MONO, fontWeight: 700 }}>BUILDING {bs.building_number}</span>}
                                  {bs.shape_type && <Tag color={colors.gold}>{bs.shape_type.replace(/_/g, ' ').toUpperCase()}</Tag>}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
                                  {bs.total_floors && <div style={{ padding: 6, background: colors.bg, borderRadius: 4 }}><div style={{ fontSize: 8, color: colors.muted, fontFamily: MONO }}>FLOORS</div><div style={{ fontSize: 14, color: colors.text, marginTop: 2 }}>{bs.total_floors}</div></div>}
                                  {bs.units_per_floor && <div style={{ padding: 6, background: colors.bg, borderRadius: 4 }}><div style={{ fontSize: 8, color: colors.muted, fontFamily: MONO }}>UNITS/FLOOR</div><div style={{ fontSize: 14, color: colors.text, marginTop: 2 }}>{bs.units_per_floor}</div></div>}
                                  {bs.podium_floors && <div style={{ padding: 6, background: colors.bg, borderRadius: 4 }}><div style={{ fontSize: 8, color: colors.muted, fontFamily: MONO }}>PODIUM</div><div style={{ fontSize: 14, color: colors.text, marginTop: 2 }}>{bs.podium_floors} floors</div></div>}
                                  {bs.parking_levels && <div style={{ padding: 6, background: colors.bg, borderRadius: 4 }}><div style={{ fontSize: 8, color: colors.muted, fontFamily: MONO }}>PARKING</div><div style={{ fontSize: 14, color: colors.text, marginTop: 2 }}>{bs.parking_levels} levels</div></div>}
                                  {bs.core_count && <div style={{ padding: 6, background: colors.bg, borderRadius: 4 }}><div style={{ fontSize: 8, color: colors.muted, fontFamily: MONO }}>CORES</div><div style={{ fontSize: 14, color: colors.text, marginTop: 2 }}>{bs.core_count}</div></div>}
                                  {bs.footprint_sqm && <div style={{ padding: 6, background: colors.bg, borderRadius: 4 }}><div style={{ fontSize: 8, color: colors.muted, fontFamily: MONO }}>FOOTPRINT</div><div style={{ fontSize: 14, color: colors.text, marginTop: 2 }}>{fmt(bs.footprint_sqm)} sqm</div></div>}
                                  {bs.building_axis && <div style={{ padding: 6, background: colors.bg, borderRadius: 4 }}><div style={{ fontSize: 8, color: colors.muted, fontFamily: MONO }}>AXIS</div><div style={{ fontSize: 14, color: colors.text, marginTop: 2 }}>{bs.building_axis}</div></div>}
                                  {bs.orientation && <div style={{ padding: 6, background: colors.bg, borderRadius: 4 }}><div style={{ fontSize: 8, color: colors.muted, fontFamily: MONO }}>ORIENT</div><div style={{ fontSize: 14, color: colors.text, marginTop: 2 }}>{bs.orientation}</div></div>}
                                  {bs.crown_type && <div style={{ padding: 6, background: colors.bg, borderRadius: 4 }}><div style={{ fontSize: 8, color: colors.muted, fontFamily: MONO }}>CROWN</div><div style={{ fontSize: 14, color: colors.text, marginTop: 2 }}>{bs.crown_type}</div></div>}
                                </div>
                                {bs.notes && <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 10, lineHeight: 1.5 }}>{bs.notes}</div>}
                              </div>
                            </div>
                          </PCard>
                        ))}
                      </Section>
                    </div>
                  )}

                  {/* ═══ FLOOR PLATE TAB ═══ */}
                  {tab === 'floorplate' && hasMatrix && (
                    <div>
                      <Section title="Interactive Floor Plate" subtitle={`Floor ${selectedFloor || '—'} · ${floorUnitMatrix.length} units mapped`} accent>
                        <FloorPlateViz
                          floorUnits={floorUnits} allUnits={floorUnitMatrix}
                          floors={v3Floors} buildings={matrixBuildings}
                          selectedFloor={selectedFloor} selectedBuilding={selectedBuilding}
                          onFloorChange={setSelectedFloor} onBuildingChange={setSelectedBuilding}
                          buildingShape={selectedShape} surroundings={surroundings}
                          floorPricing={floorPricing}
                        />
                      </Section>
                    </div>
                  )}

                  {/* ═══ UNIT TYPES TAB ═══ */}
                  {tab === 'units' && (
                    <div>
                      <Section title="Unit Types & Pricing" subtitle={brochureUnits.length > 0 ? 'From xray_brochure_unit_types (verified)' : 'From xray_unit_types'} accent>
                        {displayUnits.length === 0 ? (
                          <PCard><div style={{ color: colors.textDim, textAlign: 'center', padding: 20 }}>Unit type data pending</div></PCard>
                        ) : displayUnits.map((u, i) => {
                          const sourceTier = u.source_tier;
                          const tierColor = sourceTier === 'T1' ? colors.green : sourceTier === 'T2' ? colors.blue : sourceTier === 'T3' ? colors.amber : colors.textDim;
                          return (
                          <PCard key={i} style={{ marginBottom: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ width: 4, height: 24, borderRadius: 2, background: (u.bedroom_count || 0) <= 1 ? colors.blue : u.bedroom_count === 2 ? colors.indigo : u.bedroom_count === 3 ? colors.amber : colors.green }} />
                                  <span style={{ fontSize: 17, fontWeight: 400 }}>{u.unit_type}</span>
                                  {u.unit_subtype && <span style={{ fontSize: 11, color: colors.textDim }}>{u.unit_subtype}</span>}
                                  {sourceTier && <Tag color={tierColor}>{sourceTier}</Tag>}
                                </div>
                                <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4, marginLeft: 12 }}>
                                  {u.bedroom_count} Bed · {u.bathroom_count} Bath · {fmt(u.total_area_sqft || u.total_sqft)} sqft
                                  {u.has_maid_room && ' · Maid'}{u.has_study && ' · Study'}
                                  {u.suite_sqft && ` (${fmt(u.suite_sqft)} suite + ${fmt(u.balcony_sqft)} balcony)`}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 18, fontWeight: 700, color: colors.gold, fontFamily: MONO }}>AED {fmtM(u.starting_price_aed)}</div>
                                <div style={{ fontSize: 11, color: colors.gold }}>AED {fmt(u.price_per_sqft)}/sqft</div>
                              </div>
                            </div>
                            {/* Balcony ratio bar */}
                            {u.suite_sqft && u.balcony_sqft && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                <span style={{ fontSize: 9, color: colors.textDim, width: 60 }}>Suite/Balc</span>
                                <div style={{ flex: 1, height: 4, background: colors.elevated, borderRadius: 2, overflow: 'hidden', display: 'flex' }}>
                                  <div style={{ width: `${((u.suite_sqft) / (u.total_area_sqft || u.total_sqft || 1)) * 100}%`, height: '100%', background: colors.blue }} />
                                  <div style={{ width: `${((u.balcony_sqft) / (u.total_area_sqft || u.total_sqft || 1)) * 100}%`, height: '100%', background: colors.green }} />
                                </div>
                                <span style={{ fontSize: 9, color: colors.textDim, fontFamily: MONO }}>{Math.round(u.balcony_sqft / (u.total_area_sqft || u.total_sqft || 1) * 100)}%</span>
                              </div>
                            )}
                            {u.layout_description && (
                              <div style={{ padding: 10, background: colors.bg, borderRadius: 4, marginBottom: 6 }}>
                                <div style={{ fontSize: 9, color: colors.muted, fontFamily: MONO }}>LAYOUT</div>
                                <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2, lineHeight: 1.5 }}>{u.layout_description}</div>
                              </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, flexWrap: 'wrap', gap: 6 }}>
                              {u.orientation && <div style={{ color: colors.textSecondary }}>Orientation: {u.orientation}</div>}
                              {u.view_type?.length > 0 && <div style={{ color: colors.gold }}>{Array.isArray(u.view_type) ? u.view_type.join(' · ') : u.view_type}</div>}
                              {u.total_units_this_type && <div style={{ color: colors.textDim }}>{u.total_units_this_type} units</div>}
                            </div>
                          </PCard>
                          );
                        })}
                      </Section>
                      {dldSummary.length > 0 && (
                        <Section title="DLD Price Summary" subtitle="Aggregated from verified DLD transactions">
                          {dldSummary.map((d, i) => (
                            <PCard key={i} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

                  {/* ═══ FLOOR PRICING TAB ═══ */}
                  {tab === 'floorpricing' && (hasFloorPricing || priceModel.length > 0) && (() => {
                    const pricingSource = floorPricing.length > 0 ? floorPricing : [];
                    const roomTypes = [...new Set(pricingSource.map(fp => fp.rooms_en))].sort();
                    const bandOrder = ['1-10','11-20','21-30','31-40','41-50','51-60','60+','unknown'];
                    const totalTxns = pricingSource.reduce((a, fp) => a + (fp.txn_count || 0), 0);
                    const totalExact = pricingSource.reduce((a, fp) => a + (fp.exact_matches || 0), 0);
                    // Floor premium calc
                    const lowBands = pricingSource.filter(fp => fp.floor_band === '1-10');
                    const highBands = pricingSource.filter(fp => ['41-50','51-60','60+'].includes(fp.floor_band));
                    const lowAvg = lowBands.length ? lowBands.reduce((a, fp) => a + fp.avg_psf, 0) / lowBands.length : 0;
                    const highAvg = highBands.length ? highBands.reduce((a, fp) => a + fp.avg_psf, 0) / highBands.length : 0;
                    const floorPremium = lowAvg > 0 ? ((highAvg - lowAvg) / lowAvg * 100).toFixed(1) : null;
                    return (
                    <div>
                      <Section title="Floor-Band Pricing" subtitle={`PSF by floor band from ${totalTxns} matched DLD transactions`} accent>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
                          <Stat label="TOTAL TXNS" value={fmt(totalTxns)} small />
                          <Stat label="EXACT MATCHES" value={fmt(totalExact)} small />
                          {floorPremium && <Stat label="HIGH vs LOW PREMIUM" value={`+${floorPremium}`} unit="%" small />}
                        </div>
                        {roomTypes.map(room => {
                          const rows = pricingSource.filter(fp => fp.rooms_en === room).sort((a, b) => bandOrder.indexOf(a.floor_band) - bandOrder.indexOf(b.floor_band));
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
                                  const maxPsf = Math.max(...pricingSource.filter(p => p.rooms_en === room).map(p => p.avg_psf || 0));
                                  const minPsf = Math.min(...pricingSource.filter(p => p.rooms_en === room).map(p => p.avg_psf || Infinity));
                                  const range = maxPsf - minPsf || 1;
                                  const intensity = (fp.avg_psf - minPsf) / range;
                                  return (
                                    <div key={i} style={{
                                      textAlign: 'center', padding: 8, borderRadius: 6,
                                      background: `${rc}${Math.round(10 + intensity * 30).toString(16).padStart(2, '0')}`,
                                      border: `1px solid ${rc}44`,
                                    }}>
                                      <div style={{ fontSize: 8, color: colors.textDim, fontFamily: MONO }}>{fp.floor_band}</div>
                                      <div style={{ fontSize: 14, fontWeight: 700, color: colors.text, fontFamily: MONO, marginTop: 2 }}>{fmt(Math.round(fp.avg_psf))}</div>
                                      <div style={{ fontSize: 8, color: colors.textDim }}>PSF · {fp.txn_count} txns</div>
                                      <ConfBadge confidence={fp.confidence} />
                                    </div>
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
                                {['Type', 'Band', 'Avg PSF', 'Min', 'Max', 'Avg Price', 'Txns', 'Confidence'].map(h => (
                                  <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 9, color: colors.textDim, fontFamily: MONO, fontWeight: 600 }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {pricingSource.sort((a, b) => bandOrder.indexOf(a.floor_band) - bandOrder.indexOf(b.floor_band)).map((fp, i) => (
                                <tr key={i} style={{ borderBottom: `1px solid ${colors.border}22` }}>
                                  <td style={{ padding: '5px 8px', color: typeColor[fp.rooms_en] || colors.text }}>{fp.rooms_en}</td>
                                  <td style={{ padding: '5px 8px', fontFamily: MONO }}>{fp.floor_band}</td>
                                  <td style={{ padding: '5px 8px', fontFamily: MONO, color: colors.gold }}>{fmt(Math.round(fp.avg_psf))}</td>
                                  <td style={{ padding: '5px 8px', fontFamily: MONO, color: colors.textDim }}>{fmt(Math.round(fp.min_psf))}</td>
                                  <td style={{ padding: '5px 8px', fontFamily: MONO, color: colors.textDim }}>{fmt(Math.round(fp.max_psf))}</td>
                                  <td style={{ padding: '5px 8px', fontFamily: MONO }}>{fmtM(Math.round(fp.avg_price))}</td>
                                  <td style={{ padding: '5px 8px', fontFamily: MONO }}>{fp.txn_count}</td>
                                  <td style={{ padding: '5px 8px' }}><ConfBadge confidence={fp.confidence} /></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </Section>
                      {/* Price model fallback */}
                      {priceModel.length > 0 && pricingSource.length === 0 && (
                        <Section title="Price Model" subtitle="Modeled PSF by unit type from xray_price_model">
                          {priceModel.map((pm, i) => (
                            <PCard key={i} style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <span style={{ fontSize: 13, color: colors.text }}>{pm.unit_type}</span>
                                {pm.floor_range && <span style={{ fontSize: 10, color: colors.textDim, marginLeft: 8 }}>Floors {pm.floor_range}</span>}
                              </div>
                              <div style={{ textAlign: 'right', fontFamily: MONO }}>
                                <div style={{ fontSize: 14, color: colors.gold }}>AED {fmt(pm.psf_estimate)}/sqft</div>
                                <div style={{ fontSize: 9, color: colors.textDim }}>{pm.psf_low ? `${fmt(pm.psf_low)} — ${fmt(pm.psf_high)}` : ''}</div>
                              </div>
                            </PCard>
                          ))}
                        </Section>
                      )}
                    </div>
                    );
                  })()}

                  {/* ═══ ORIENTATION TAB ═══ */}
                  {tab === 'orientation' && hasOrientation && (
                    <div>
                      <Section title="Orientation Intelligence" subtitle="What faces where — aggregated from floor unit matrix" accent>
                        <OrientationCompass data={orientationData} premiumFace={sel.premium_face || sel.apt_best_direction} />
                        {(sel.apt_floor_premium_pct || sel.apt_view_premium_pct) && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
                            {sel.apt_floor_premium_pct && <Stat label="FLOOR PREMIUM" value={`+${sel.apt_floor_premium_pct}`} unit="%/floor" small />}
                            {sel.apt_view_premium_pct && <Stat label="VIEW PREMIUM" value={`+${sel.apt_view_premium_pct}`} unit="%" small />}
                          </div>
                        )}
                      </Section>
                    </div>
                  )}

                  {/* ═══ SERVICE CHARGES TAB ═══ */}
                  {tab === 'servicecharges' && serviceCharges.length > 0 && (() => {
                    const latest = serviceCharges[0];
                    const prev = serviceCharges.length >= 2 ? serviceCharges[1] : null;
                    const yoyChange = latest?.rate_per_sqft && prev?.rate_per_sqft
                      ? ((latest.rate_per_sqft - prev.rate_per_sqft) / prev.rate_per_sqft * 100).toFixed(1)
                      : null;
                    const latestRate = latest?.rate_per_sqft || 0;
                    const avgSize = sel.size_range_sqft_min || 1000;
                    // 10-year projection at 4% annual increase
                    const projections = Array.from({ length: 10 }, (_, i) => ({
                      year: (latest?.year || 2025) + i,
                      rate: latestRate * Math.pow(1.04, i),
                      annual: latestRate * Math.pow(1.04, i) * avgSize,
                    }));
                    const communityBenchmark = psmBenchmarks.find(p => p.metric === 'avg_sc_psf');
                    return (
                    <div>
                      <Section title="Service Charge Intelligence" subtitle="From xray_service_charges" accent>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                          <Stat label="LATEST SC/SQFT" value={latestRate ? Number(latestRate).toFixed(2) : '—'} unit="AED/sqft"
                            sub={`${latest?.year} · ${latest?.source || 'Mollak'}`}
                            accent={scSourceColors[latest?.source as keyof typeof scSourceColors] || colors.gold} />
                          {yoyChange && <Stat label="YOY CHANGE" value={`${Number(yoyChange) > 0 ? '+' : ''}${yoyChange}`} unit="%"
                            sub={`${prev?.year} → ${latest?.year}`}
                            accent={Number(yoyChange) > 0 ? colors.coral : colors.green} small />}
                          {latest?.includes_cooling != null && <Stat label="COOLING" value={latest.includes_cooling ? 'INCLUDED' : 'EXCLUDED'} unit=""
                            accent={latest.includes_cooling ? colors.green : colors.amber} small />}
                          {communityBenchmark && <Stat label="COMMUNITY AVG" value={Number(communityBenchmark.value).toFixed(1)} unit="AED/sqft"
                            sub={sel.master_community} accent={latestRate > communityBenchmark.value ? colors.coral : colors.green} small />}
                        </div>

                        {/* Historical rates */}
                        <Divider label="HISTORICAL RATES" />
                        {serviceCharges.map((sc, i) => (
                          <PCard key={i} style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{sc.year}</span>
                              <span style={{ fontSize: 10, color: colors.textDim, marginLeft: 8 }}>{sc.source || 'Mollak'}</span>
                              {sc.includes_cooling != null && (
                                <Tag color={sc.includes_cooling ? colors.green : colors.amber}>
                                  {sc.includes_cooling ? 'COOLING INC' : 'NO COOLING'}
                                </Tag>
                              )}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 14, color: colors.gold, fontFamily: MONO }}>AED {sc.rate_per_sqft ? Number(sc.rate_per_sqft).toFixed(2) : '—'}/sqft</div>
                              {sc.total_budget && <div style={{ fontSize: 10, color: colors.textDim }}>Budget: AED {fmtM(sc.total_budget)}</div>}
                            </div>
                          </PCard>
                        ))}

                        {/* 10-year projection */}
                        {latestRate > 0 && (
                          <>
                            <Divider label="10-YEAR PROJECTION (4% ANNUAL INCREASE)" />
                            <div style={{ overflowX: 'auto' }}>
                              <div style={{ display: 'flex', gap: 4, minWidth: 600 }}>
                                {projections.map((p, i) => (
                                  <div key={i} style={{ flex: 1, textAlign: 'center', padding: 6, background: `${colors.gold}${Math.round(8 + i * 3).toString(16).padStart(2, '0')}`, borderRadius: 4 }}>
                                    <div style={{ fontSize: 8, color: colors.textDim, fontFamily: MONO }}>{p.year}</div>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: colors.text, fontFamily: MONO }}>{p.rate.toFixed(1)}</div>
                                    <div style={{ fontSize: 7, color: colors.textDim }}>AED {fmtM(Math.round(p.annual))}/yr</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div style={{ fontSize: 9, color: colors.textDim, marginTop: 6 }}>
                              Based on {avgSize} sqft unit. SC typically increases 3-5% annually. Current annual: AED {fmt(Math.round(latestRate * avgSize))}.
                            </div>
                          </>
                        )}
                      </Section>
                    </div>
                    );
                  })()}

                  {/* ═══ PAYMENT PLAN TAB ═══ */}
                  {tab === 'paymentplan' && paymentPlan.length > 0 && (
                    <div>
                      <Section title="Payment Plan" subtitle="Milestone-based payment schedule from xray_payment_plan" accent>
                        <PaymentTimeline milestones={paymentPlan} handoverDate={sel.offplan_expected_handover} constructionPct={sel.offplan_construction_pct} />
                      </Section>
                    </div>
                  )}

                  {/* ═══ VIEW BLOCKING TAB ═══ */}
                  {tab === 'viewblock' && (
                    <div>
                      <Section title="View Blocking Analysis" subtitle="GIS + satellite analysis" accent>
                        {viewBlocking.length === 0 ? (
                          <div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                              <PCard>
                                <div style={{ fontSize: 9, color: colors.green, fontFamily: MONO }}>BEST DIRECTION</div>
                                <div style={{ fontSize: 16, fontWeight: 400, marginTop: 6, color: colors.text }}>{sel.apt_best_direction || sel.orientation_primary || '—'}</div>
                              </PCard>
                              <PCard>
                                <div style={{ fontSize: 9, color: colors.coral, fontFamily: MONO }}>CAUTION DIRECTION</div>
                                <div style={{ fontSize: 16, fontWeight: 400, marginTop: 6, color: colors.text }}>{sel.apt_worst_direction || '—'}</div>
                              </PCard>
                            </div>
                            <div style={{ textAlign: 'center', padding: 20, background: colors.goldFaint, border: `1px solid ${colors.gold}20`, borderRadius: 8 }}>
                              <div style={{ fontSize: 10, color: colors.gold, fontWeight: 600, marginBottom: 4 }}>GIS VIEW BLOCKING DATA</div>
                              <div style={{ fontSize: 11, color: colors.textSecondary }}>
                                View blocking analysis not yet available for {sel.master_community}.
                                Currently: Downtown Dubai, Business Bay, Dubai Hills, Arabian Ranches III, City Walk, DIFC.
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                              <Stat label="THREATS" value={String(viewBlocking.length)} accent={colors.amber} small />
                              <Stat label="HIGHEST RISK" value={String(viewBlocking[0]?.risk_score || 0)}
                                accent={viewBlocking[0]?.risk_score > 70 ? colors.coral : viewBlocking[0]?.risk_score > 40 ? colors.amber : colors.green} small />
                              <Stat label="SAFE ABOVE" value={String(viewBlocking[0]?.min_safe_floor || '—')} accent={colors.green} small />
                            </div>
                            <ViewBlockingDetail blockers={viewBlocking} bestDirection={sel.apt_best_direction} worstDirection={sel.apt_worst_direction} />
                          </>
                        )}
                      </Section>
                    </div>
                  )}

                  {/* ═══ DLD EVIDENCE TAB ═══ */}
                  {tab === 'evidence' && (
                    <div>
                      {dldSummary.length > 0 && (
                        <Section title="DLD Transaction Summary" subtitle="Aggregated from verified DLD transactions" accent>
                          {dldSummary.map((d, i) => (
                            <PCard key={i} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <span style={{ fontSize: 14, color: colors.text }}>{d.rooms_en}</span>
                                <span style={{ fontSize: 11, color: colors.textDim, marginLeft: 8 }}>{d.txn_count} txns</span>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 13, color: colors.text }}>AED {fmt(d.min_price)} — {fmt(d.max_price)}</div>
                                <div style={{ fontSize: 10, color: colors.gold }}>Avg: AED {fmt(d.avg_price)} · {fmt(d.avg_psf)}/sqft</div>
                              </div>
                            </PCard>
                          ))}
                        </Section>
                      )}
                      <Section title="Recent DLD Transactions" subtitle="Real sales registered with Dubai Land Department">
                        {dldRecent.length === 0 ? (
                          <PCard><div style={{ color: colors.textDim, textAlign: 'center', padding: 20 }}>No recent DLD transactions linked</div></PCard>
                        ) : dldRecent.map((tx, i) => (
                          <PCard key={i} style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 13, fontWeight: 500 }}>{tx.rooms_en}</span>
                                <Tag color={colors.green}>DLD</Tag>
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

                  {/* ═══ EJARI RENTALS TAB ═══ */}
                  {tab === 'rentals' && (
                    <div>
                      <Section title="Ejari Rental Market" subtitle={`project_number: ${sel.rera_registration_no || 'name-matched'}`} accent>
                        {ejari.length === 0 ? (
                          <PCard><div style={{ color: colors.textDim, textAlign: 'center', padding: 20 }}>No Ejari rental data</div></PCard>
                        ) : ejari.map((r, i) => (
                          <PCard key={i} style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <div>
                                <span style={{ fontSize: 14, color: colors.text }}>{r.unit_type || r.bedrooms}</span>
                                <span style={{ fontSize: 11, color: colors.textDim, marginLeft: 8 }}>{r.contract_count} contracts</span>
                                {r.new_contracts && <span style={{ fontSize: 10, color: colors.green, marginLeft: 8 }}>{r.new_contracts} new</span>}
                              </div>
                              <Tag color={colors.green}>EJARI</Tag>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                              {[
                                { l: 'MIN', v: `AED ${fmt(r.min_rent_aed || r.min_rent)}/yr`, c: colors.coral },
                                { l: 'MEDIAN', v: `AED ${fmt(r.median_rent_aed || r.median_rent)}/yr`, c: colors.gold },
                                { l: 'AVG', v: `AED ${fmt(r.avg_rent_aed || r.avg_rent)}/yr`, c: colors.textSecondary },
                                { l: 'MAX', v: `AED ${fmt(r.max_rent_aed || r.max_rent)}/yr`, c: colors.green },
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

                  {/* ═══ AMENITIES TAB ═══ */}
                  {tab === 'amenities' && (
                    <div>
                      <Section title="Amenity Delivery Assessment" subtitle="What was promised vs. what exists" accent>
                        <PCard style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: 9, color: colors.muted, fontFamily: MONO }}>DELIVERY SCORE</div>
                            <div style={{ fontSize: 28, fontWeight: 300, color: sel.amenity_delivery_score >= 90 ? colors.green : sel.amenity_delivery_score >= 70 ? colors.blue : sel.amenity_delivery_score >= 50 ? colors.amber : colors.coral }}>
                              {sel.amenity_delivery_score}/100
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 12, color: colors.green }}>{amenities.filter((a: R) => a.delivery_status === 'fully_delivered').length} delivered</div>
                            <div style={{ fontSize: 12, color: colors.amber }}>{amenities.filter((a: R) => a.delivery_status === 'pending_verification' || a.delivery_status === 'partially_delivered').length} pending</div>
                          </div>
                        </PCard>
                        {amenities.map((a, i) => (
                          <PCard key={i} style={{ marginBottom: 4, display: 'grid', gridTemplateColumns: '1fr 60px auto', gap: 8, alignItems: 'center' }}>
                            <div>
                              <span style={{ fontSize: 12, color: colors.text }}>{a.amenity_name}</span>
                              <span style={{ fontSize: 10, color: colors.textDim, marginLeft: 8 }}>{a.amenity_category}</span>
                            </div>
                            {a.community_sentiment_score ? (
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 16, fontWeight: 700, color: Number(a.community_sentiment_score) >= 4 ? colors.green : Number(a.community_sentiment_score) >= 3 ? colors.gold : colors.amber, fontFamily: MONO }}>
                                  {Number(a.community_sentiment_score).toFixed(1)}
                                </div>
                              </div>
                            ) : <div />}
                            <Tag color={a.delivery_status === 'fully_delivered' || a.delivery_status === 'exceeded' ? colors.green : a.delivery_status === 'planned' ? colors.blue : a.delivery_status === 'pending_verification' || a.delivery_status === 'partially_delivered' ? colors.amber : colors.coral}>
                              {a.delivery_status?.replace(/_/g, ' ').toUpperCase()}
                            </Tag>
                          </PCard>
                        ))}
                      </Section>
                    </div>
                  )}

                  {/* ═══ INFRASTRUCTURE TAB ═══ */}
                  {tab === 'infra' && infra.length > 0 && (
                    <div>
                      <Section title="Nearby Infrastructure" subtitle="Transport, education, healthcare within reach" accent>
                        {infra.map((inf, i) => (
                          <PCard key={i} style={{ marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span style={{ fontSize: 12, color: colors.text }}>{inf.name}</span>
                              <span style={{ fontSize: 10, color: colors.textDim, marginLeft: 8 }}>{inf.infrastructure_type} · {inf.distance_km}km</span>
                            </div>
                            <Tag color={inf.status === 'operational' ? colors.green : inf.status === 'under_construction' ? colors.amber : colors.blue}>
                              {inf.status?.replace(/_/g, ' ').toUpperCase()}
                            </Tag>
                          </PCard>
                        ))}
                      </Section>
                    </div>
                  )}

                  {/* ═══ SURROUNDINGS TAB ═══ */}
                  {tab === 'surroundings' && hasSurroundings && (
                    <div>
                      <Section title="8-Direction Surroundings" subtitle={`${surroundings.length} directions mapped`} accent>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, maxWidth: 600, margin: '0 auto' }}>
                          {['NW','N','NE','W','CENTER','E','SW','S','SE'].map(dir => {
                            if (dir === 'CENTER') {
                              return (
                                <PCard key="CENTER" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: colors.goldBg }}>
                                  <div style={{ fontSize: 14, fontWeight: 600, color: colors.gold }}>{sel.project_name}</div>
                                  <div style={{ fontSize: 10, color: colors.textDim, marginTop: 4 }}>
                                    {sel.total_floors ? `${sel.total_floors} floors` : ''}{sel.total_units ? ` · ~${fmt(sel.total_units)} units` : ''}
                                  </div>
                                </PCard>
                              );
                            }
                            const s = surroundings.find(sr => sr.direction === dir);
                            if (!s) return (
                              <PCard key={dir} style={{ opacity: 0.3, textAlign: 'center', minHeight: 80, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: colors.textDim }}>{dir}</div>
                                <div style={{ fontSize: 9, color: colors.textDim }}>No data</div>
                              </PCard>
                            );
                            const tc = surrTypeColor[s.type] || colors.textDim;
                            return (
                              <PCard key={dir} style={{ borderTop: `3px solid ${tc}`, minHeight: 80 }}>
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

                  {/* ═══ COMMUNITY INTEL (Villas) ═══ */}
                  {tab === 'community' && isVilla && (
                    <div>
                      <Section title="Villa Community Intelligence" accent>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <Stat label="HIGHWAY PROXIMITY" value={`${sel.villa_highway_distance_m}m`} sub={sel.villa_highway_name}
                            accent={sel.villa_highway_noise_risk === 'low' ? colors.green : colors.amber} />
                          <Stat label="NEAREST SCHOOL" value={`${sel.villa_school_proximity_km}km`} sub={sel.villa_nearest_school} />
                          <PCard>
                            <div style={{ fontSize: 9, color: colors.muted, fontFamily: MONO }}>COMMUNITY</div>
                            <div style={{ fontSize: 16, color: colors.text, marginTop: 6, textTransform: 'capitalize' }}>{sel.villa_community_maturity?.replace(/_/g, ' ')}</div>
                            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                              {sel.villa_gated && <Tag color={colors.green}>GATED</Tag>}
                              {sel.villa_private_pool && <Tag color={colors.blue}>PRIVATE POOL</Tag>}
                            </div>
                          </PCard>
                          <PCard>
                            <div style={{ fontSize: 9, color: colors.muted, fontFamily: MONO }}>PLOT & GARDEN</div>
                            {sel.villa_plot_size_sqft && <div style={{ fontSize: 14, color: colors.text, marginTop: 6 }}>Plot: {fmt(sel.villa_plot_size_sqft)} sqft</div>}
                            {sel.villa_garden_size_sqft && <div style={{ fontSize: 12, color: colors.green }}>Garden: {fmt(sel.villa_garden_size_sqft)} sqft</div>}
                          </PCard>
                        </div>
                      </Section>
                    </div>
                  )}

                  {/* ═══ OFF-PLAN CONSTRUCTION TAB ═══ */}
                  {tab === 'offplan' && isOffplan && (
                    <div>
                      <Section title="Construction & Delivery Status" accent>
                        <PCard>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                            <div>
                              <div style={{ fontSize: 9, color: colors.muted, fontFamily: MONO }}>CONSTRUCTION</div>
                              <div style={{ fontSize: 36, fontWeight: 300, color: colors.amber, marginTop: 4 }}>{sel.offplan_construction_pct || 0}%</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 9, color: colors.muted, fontFamily: MONO }}>HANDOVER</div>
                              <div style={{ fontSize: 18, fontWeight: 700, color: colors.gold, fontFamily: MONO, marginTop: 4 }}>{sel.offplan_expected_handover?.slice(0, 7) || 'TBD'}</div>
                            </div>
                          </div>
                          <div style={{ height: 12, background: colors.elevated, borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
                            <div style={{ width: `${sel.offplan_construction_pct || 0}%`, height: '100%', borderRadius: 6, background: `linear-gradient(90deg, ${colors.coral}, ${colors.amber}, ${colors.green})` }} />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                            <Stat label="DELAY HISTORY" value={`${sel.offplan_developer_delay_history_months || 0}`} unit="months"
                              accent={sel.offplan_developer_delay_history_months > 6 ? colors.amber : colors.green} small />
                            <Stat label="ESCROW" value={sel.offplan_escrow_status?.toUpperCase() || '—'}
                              accent={sel.offplan_escrow_status === 'active' ? colors.green : colors.amber} small />
                            <Stat label="RESALE PREMIUM" value={`+${sel.offplan_resale_premium_pct || 0}`} unit="%"
                              accent={colors.green} small />
                          </div>
                        </PCard>
                      </Section>
                    </div>
                  )}

                  {/* ═══ ZA INSIGHTS / HONEST ASSESSMENT ═══ */}
                  {tab === 'insights' && (
                    <div>
                      {hasInsights ? (
                        <Section title="ZA Insights" subtitle="Every insight computed from DLD, Ejari, or Mollak — no manual opinions" accent>
                          {zaInsights.map((zi, i) => {
                            const tc = insightTypeColor[zi.insight_type] || colors.textDim;
                            return (
                              <PCard key={i} style={{ marginBottom: 10, borderLeft: `3px solid ${tc}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                  <Tag color={tc}>{zi.insight_type?.replace(/_/g, ' ').toUpperCase()}</Tag>
                                  <ConfBadge confidence={zi.confidence} />
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
                        </Section>
                      ) : (
                      <>
                      <Section title="What They Don't Tell You" subtitle="The honest things no marketing brochure includes" accent>
                        <PCard style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8, color: colors.text }}>Service Charge Reality</div>
                          {sel.sc_source === 'mollak_confirmed' ? (
                            <div style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.7 }}>
                              Mollak confirmed SC: AED {Number(sel.service_charge_per_sqft).toFixed(1)}/sqft ({sel.service_charge_year}).
                              {sel.sc_year_1 && ` First year: AED ${Number(sel.sc_year_1).toFixed(1)}/sqft (${sel.sc_year_1_yr}).`}
                              {' '}SC typically increases 3-5% annually. On a {sel.size_range_sqft_min || 1000} sqft unit:
                              AED {fmt(Math.round((sel.service_charge_per_sqft || 0) * (sel.size_range_sqft_min || 1000)))}/year.
                            </div>
                          ) : sel.sc_source === 'rera_estimate' ? (
                            <div style={{ fontSize: 12, color: colors.amber, lineHeight: 1.7 }}>
                              No Mollak SC yet. RERA estimate: ~AED {Number(sel.offplan_estimated_sc).toFixed(1)}/sqft. Expect ±30% variance.
                            </div>
                          ) : (
                            <div style={{ fontSize: 12, color: colors.textDim, lineHeight: 1.7 }}>Service charge data not yet available.</div>
                          )}
                        </PCard>

                        {(isApt || isOffplan) && sel.apt_worst_direction && (
                          <PCard style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8, color: colors.text }}>Direction & Noise</div>
                            <div style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.7 }}>
                              Caution: {sel.apt_worst_direction}. {sel.apt_noise_floor_threshold ? `Noise attenuates above floor ${sel.apt_noise_floor_threshold}.` : ''}
                              {' '}Best: {sel.apt_best_direction}. {sel.apt_view_premium_pct ? `View premium: ~${sel.apt_view_premium_pct}%.` : ''}
                            </div>
                          </PCard>
                        )}

                        {isVilla && sel.villa_highway_distance_m && (
                          <PCard style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8, color: colors.text }}>Highway & Noise</div>
                            <div style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.7 }}>
                              {sel.villa_highway_name} is {sel.villa_highway_distance_m}m away. Noise risk: {sel.villa_highway_noise_risk}.
                              {sel.villa_highway_noise_risk === 'moderate' ? ' Perimeter villas hear traffic. Interior plots are quieter.' : ''}
                            </div>
                          </PCard>
                        )}

                        {isOffplan && (
                          <PCard style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8, color: colors.text }}>Delivery Risk</div>
                            <div style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.7 }}>
                              {sel.developer} avg delay: {sel.offplan_developer_delay_history_months || 'unknown'} months.
                              Handover: {sel.offplan_expected_handover?.slice(0, 7) || 'TBD'}.
                              {sel.offplan_developer_delay_history_months > 6 ? ' Budget +6-12 months.' : ' Reasonable track record.'}
                            </div>
                          </PCard>
                        )}

                        {ejari.length > 0 && (
                          <PCard style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8, color: colors.text }}>Rental Spread</div>
                            <div style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.7 }}>
                              {ejari.map((e: R) => {
                                const minR = e.min_rent_aed || e.min_rent || 0;
                                const maxR = e.max_rent_aed || e.max_rent || 0;
                                const spread = minR > 0 ? Math.round(((maxR - minR) / minR) * 100) : 0;
                                return `${e.unit_type || e.bedrooms}: AED ${fmt(minR)}–${fmt(maxR)}/yr (${spread}% spread, ${e.contract_count} contracts). `;
                              }).join('')}
                              The unit you pick matters more than the building.
                            </div>
                          </PCard>
                        )}
                      </Section>

                      <div style={{ textAlign: 'center', padding: '12px 16px', background: colors.goldFaint, border: `1px solid ${colors.gold}20`, borderRadius: 6 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: colors.gold, fontFamily: MONO, marginBottom: 6 }}>DATA SOURCES</div>
                        <div style={{ fontSize: 11, color: colors.textSecondary, lineHeight: 1.6 }}>
                          DLD ({fmt(dldRecent.length)} recent) · Ejari ({ejari.reduce((a: number, e: R) => a + e.contract_count, 0)} contracts) · SC ({sel.sc_source})
                        </div>
                        <div style={{ marginTop: 8, fontSize: 11, color: colors.gold, fontStyle: 'italic' }}>
                          Every number independently verifiable.
                        </div>
                      </div>
                      </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ═══ FOOTER ═══ */}
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
