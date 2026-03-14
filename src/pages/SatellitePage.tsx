import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTheme } from '@/lib/theme';
import { sb, gold } from '@/lib/supabase';
import { Loader2, Eye, EyeOff, ChevronRight, MapPin, Satellite } from 'lucide-react';
import MapGL, { Source, Layer, Popup, type MapRef } from 'react-map-gl';
import type { CircleLayer, LineLayer, FillLayer, SymbolLayer } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GeoJSONFC = { type: 'FeatureCollection'; features: any[] };

const FONT_DATA = "'IBM Plex Mono', monospace";
const fmt = (n: number | string | null | undefined): string => n ? Number(n).toLocaleString('en-AE') : '—';
const fmtM = (n: number | null | undefined): string => {
  if (!n) return '—';
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : fmt(n);
};
const pct = (n: number | null | undefined): string => n != null ? `${Math.round(n)}%` : '—';

/* ── Color Schemes ── */
const BR_COLORS: Record<number, string> = {
  3: '#60a5fa', 4: '#f59e0b', 5: '#ef4444', 6: '#8b5cf6', 7: '#ec4899',
};
const BR_LABELS: Record<number, string> = {
  3: '3BR', 4: '4BR', 5: '5BR', 6: '6BR', 7: '7BR',
};

const READINESS_COLOR: Record<string, string> = {
  production: '#34D399', enriched: '#FBBF24', basic: '#94a3b8',
};

/* ── Delivery Colors ── */
const VERDICT_COLOR: Record<string, string> = {
  delivered: '#22C55E', DELIVERED: '#22C55E',
  partial: '#F59E0B', PARTIAL: '#F59E0B',
  not_delivered: '#EF4444', NOT_DELIVERED: '#EF4444',
};
const VERDICT_BG: Record<string, string> = {
  delivered: '#22C55E20', DELIVERED: '#22C55E20',
  partial: '#F59E0B20', PARTIAL: '#F59E0B20',
  not_delivered: '#EF444420', NOT_DELIVERED: '#EF444420',
};

/* ── Amenity Class Colors ── */
const CLASS_COLOR: Record<string, string> = {
  GREEN_SPACE: '#4ADE80',
  WATER_BODY: '#38BDF8',
  RETAIL_COMMERCIAL: '#FB923C',
  COMMUNITY_FACILITY: '#A78BFA',
  LEISURE_FACILITY: '#F472B6',
  HOSPITALITY: '#FBBF24',
};

/* ── Community name → map layer key ── */
const COMMUNITY_KEY: Record<string, string> = {
  'Tilal Al Ghaf': 'TILAL_AL_GHAF',
  'Arabian Ranches 3': 'ARABIAN_RANCHES_3',
  'Dubai Hills Estate': 'DUBAI_HILLS_ESTATE',
  'The Valley': 'THE_VALLEY',
};

/* ── Layer Keys ── */
type LayerKey = 'units' | 'clusters' | 'ddaPlots' | 'amenityPoints' | 'amenityPolygons' | 'signature' | 'boundary' | 'phaseLabels' | 'transactions' | 'demographics' | 'gee';

const LAYER_DEFS: { key: LayerKey; label: string }[] = [
  { key: 'units', label: 'Villa Units' },
  { key: 'clusters', label: 'Plex Row Outlines' },
  { key: 'ddaPlots', label: 'DDA Plot Polygons' },
  { key: 'amenityPoints', label: 'Amenity Delivery Points' },
  { key: 'amenityPolygons', label: 'Amenity Polygons' },
  { key: 'signature', label: 'Signature Amenities' },
  { key: 'boundary', label: 'Community Boundary' },
  { key: 'phaseLabels', label: 'Phase Labels' },
  { key: 'transactions', label: 'Transaction Data' },
  { key: 'demographics', label: 'Demographics (DEWA)' },
  { key: 'gee', label: 'GEE Satellite Status' },
];

/* ── Color Modes ── */
type ColorMode = 'bedrooms' | 'delivery' | 'price';

/* ── Delivery Badge Component ── */
function DeliveryBadge({ verdict, size = 'sm' }: { verdict: string; size?: 'sm' | 'md' }) {
  const v = verdict?.toUpperCase() || 'UNKNOWN';
  const color = VERDICT_COLOR[verdict] || '#6B7280';
  const bg = VERDICT_BG[verdict] || '#6B728020';
  const fs = size === 'md' ? 10 : 8;
  return (
    <span style={{
      fontSize: fs, fontWeight: 700, padding: size === 'md' ? '2px 8px' : '1px 5px',
      borderRadius: 3, background: bg, color, letterSpacing: 0.5,
    }}>{v.replace('_', ' ')}</span>
  );
}

/* ── Score Ring Component ── */
function ScoreRing({ score, size = 36 }: { score: number; size?: number }) {
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(score, 1));
  const color = score >= 0.7 ? '#22C55E' : score >= 0.4 ? '#F59E0B' : '#EF4444';
  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1E293B" strokeWidth={3} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={`${circ}`} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2 + 3} textAnchor="middle" fill={color}
        fontSize={size * 0.28} fontWeight={700} fontFamily={FONT_DATA}>
        {Math.round(score * 100)}
      </text>
    </svg>
  );
}

/* ── Satellite Bar (built|veg|water|bare) ── */
function SatelliteBar({ built, veg, water, bare }: { built: number; veg: number; water: number; bare: number }) {
  const total = built + veg + water + bare || 1;
  const segs = [
    { pct: built / total * 100, color: '#64748b', label: 'Built' },
    { pct: veg / total * 100, color: '#4ADE80', label: 'Veg' },
    { pct: water / total * 100, color: '#38BDF8', label: 'Water' },
    { pct: bare / total * 100, color: '#D4A574', label: 'Bare' },
  ].filter(s => s.pct > 0.5);
  return (
    <div>
      <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 3 }}>
        {segs.map(s => (
          <div key={s.label} style={{ width: `${s.pct}%`, background: s.color }} title={`${s.label}: ${s.pct.toFixed(1)}%`} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {segs.map(s => (
          <span key={s.label} style={{ fontSize: 7, color: s.color }}>{s.label} {s.pct.toFixed(0)}%</span>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════ */
export function SatellitePage() {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';
  const mapRef = useRef<MapRef>(null);

  // Community list
  const [communities, setCommunities] = useState<R[]>([]);
  const [selCommunity, setSelCommunity] = useState<R | null>(null);
  const [loadingList, setLoadingList] = useState(true);

  // Per-community data — existing
  const [villaUnits, setVillaUnits] = useState<GeoJSONFC | null>(null);
  const [clusterPolygons, setClusterPolygons] = useState<GeoJSONFC | null>(null);
  const [transactions, setTransactions] = useState<R[]>([]);
  const [phases, setPhases] = useState<R[]>([]);
  const [amenities, setAmenities] = useState<R[]>([]);
  const [demographics, setDemographics] = useState<R[]>([]);
  const [geeStatus, setGeeStatus] = useState<R[]>([]);

  // NEW — Amenity delivery (the killer feature)
  const [amenityDelivery, setAmenityDelivery] = useState<R | null>(null);
  // NEW — DDA plot polygons
  const [ddaPolygons, setDdaPolygons] = useState<GeoJSONFC | null>(null);
  // NEW — Community boundary + phase centroids
  const [communityBoundary, setCommunityBoundary] = useState<R | null>(null);
  // NEW — Map layer bundle (amenity points/polygons/signatures)
  const [mapLayerBundle, setMapLayerBundle] = useState<R | null>(null);

  const [detailLoading, setDetailLoading] = useState(false);

  // UI state
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    units: true, clusters: true, ddaPlots: false,
    amenityPoints: true, amenityPolygons: true, signature: true,
    boundary: true, phaseLabels: true,
    transactions: false, demographics: false, gee: false,
  });
  const [colorMode, setColorMode] = useState<ColorMode>('bedrooms');
  const [selPhase, setSelPhase] = useState<string | null>(null);
  const [popup, setPopup] = useState<R | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'layers' | 'delivery' | 'data'>('delivery');

  // Map viewport
  const [viewState, setViewState] = useState({
    longitude: 55.27, latitude: 25.05, zoom: 11,
  });

  /* ── Load community list ── */
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await sb.rpc('satellite_list_communities');
        if (error) console.error('[Satellite] list_communities:', error.message);
        setCommunities(data || []);
      } catch (e) {
        console.error('[Satellite] Failed to load communities:', e);
      }
      setLoadingList(false);
    })();
  }, []);

  /* ── Step 1: Community selected → load ONLY boundary + phase list (lightweight) ── */
  const loadedCommunityRef = useRef<string | null>(null);
  const [phaseLoading, setPhaseLoading] = useState(false);

  useEffect(() => {
    if (!selCommunity) return;
    const mp = selCommunity.masterplan;
    let cancelled = false;

    // Reset everything
    loadedCommunityRef.current = mp;
    setPhaseLoading(true);
    setSelPhase(null);
    setPopup(null);
    setVillaUnits(null);
    setClusterPolygons(null);
    setTransactions([]);
    setPhases([]);
    setAmenities([]);
    setDemographics([]);
    setGeeStatus([]);
    setAmenityDelivery(null);
    setDdaPolygons(null);
    setCommunityBoundary(null);
    setMapLayerBundle(null);
    setDetailLoading(false);

    (async () => {
      try {
        console.log('[Satellite] Loading boundary + phases for', mp);
        const [boundaryRes, phasesRes] = await Promise.all([
          sb.rpc('satellite_get_community_boundary', { p_community: mp }),
          sb.rpc('satellite_get_phase_summary', { p_masterplan: mp }),
        ]);
        if (cancelled) return;
        if (boundaryRes.error) console.error('[Satellite] community_boundary:', boundaryRes.error.message);
        if (phasesRes.error) console.error('[Satellite] phase_summary:', phasesRes.error.message);

        setCommunityBoundary(boundaryRes.data || null);
        setPhases(Array.isArray(phasesRes.data) ? phasesRes.data : []);

        // Fly to community
        if (boundaryRes.data?.center) {
          const c = boundaryRes.data.center;
          mapRef.current?.flyTo({ center: [c.lng, c.lat], zoom: 13.5, duration: 1200 });
        } else if (selCommunity.bbox_west && mapRef.current) {
          mapRef.current.fitBounds(
            [[selCommunity.bbox_west, selCommunity.bbox_south], [selCommunity.bbox_east, selCommunity.bbox_north]],
            { padding: 60, duration: 1200 }
          );
        } else if (selCommunity.center_lat && mapRef.current) {
          mapRef.current.flyTo({ center: [selCommunity.center_lng, selCommunity.center_lat], zoom: 14, duration: 1200 });
        }

        console.log('[Satellite] Phases loaded:', (phasesRes.data || []).length, '— waiting for user to select a phase');
      } catch (e) {
        console.error('[Satellite] Phase list load error:', e);
      }
      setPhaseLoading(false);
    })();

    return () => { cancelled = true; };
  }, [selCommunity?.masterplan]);

  /* ── Step 2: Phase selected → load heavy data for that community ── */
  const loadedPhaseRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selCommunity || !selPhase) {
      // Reset so re-selecting same phase will reload
      if (!selPhase) loadedPhaseRef.current = null;
      return;
    }
    const mp = selCommunity.masterplan;
    const communityKey = COMMUNITY_KEY[mp];
    const phaseKey = `${mp}__${selPhase}`;

    // Don't re-load if same phase already loaded
    if (loadedPhaseRef.current === phaseKey) return;
    loadedPhaseRef.current = phaseKey;

    let cancelled = false;
    setDetailLoading(true);
    setPopup(null);

    (async () => {
      try {
        // Load units + clusters (core map data)
        console.log('[Satellite] Loading data for phase:', selPhase);
        const [unitsRes, clustersRes] = await Promise.all([
          sb.rpc('satellite_get_villa_units', { p_masterplan: mp }),
          sb.rpc('satellite_get_cluster_polygons', { p_masterplan: mp }),
        ]);
        if (cancelled) return;
        if (unitsRes.error) console.error('[Satellite] villa_units:', unitsRes.error.message);
        if (clustersRes.error) console.error('[Satellite] cluster_polygons:', clustersRes.error.message);

        const unitData = unitsRes.data;
        const clusterData = clustersRes.data;
        setVillaUnits(unitData && typeof unitData === 'object' && unitData.type === 'FeatureCollection'
          ? unitData : { type: 'FeatureCollection', features: Array.isArray(unitData) ? unitData : [] });
        setClusterPolygons(clusterData && typeof clusterData === 'object' && clusterData.type === 'FeatureCollection'
          ? clusterData : { type: 'FeatureCollection', features: Array.isArray(clusterData) ? clusterData : [] });

        setDetailLoading(false);

        const unitFeatures = unitData?.features || [];
        console.log('[Satellite] Core loaded:', {
          units: unitFeatures.length,
          positioned: unitFeatures.filter((f: R) => f.properties?.positioned).length,
          clusters: (clusterData?.features || []).length,
        });

        // Then load overlays (non-blocking)
        const [amenRes, deliveryRes, ddaRes, mapLayerRes] = await Promise.all([
          sb.rpc('satellite_get_amenities', { p_masterplan: mp }),
          sb.rpc('satellite_get_amenity_delivery', { p_community: mp }),
          sb.rpc('satellite_get_dda_polygons', { p_community: mp }),
          communityKey
            ? sb.rpc('get_community_map_layer', { p_community_key: communityKey })
            : Promise.resolve({ data: null, error: null }),
        ]);
        if (cancelled) return;

        setAmenities(Array.isArray(amenRes.data) ? amenRes.data : []);
        setAmenityDelivery(deliveryRes.data || null);

        const ddaData = ddaRes.data;
        setDdaPolygons(ddaData && typeof ddaData === 'object' && ddaData.type === 'FeatureCollection'
          ? ddaData : ddaData ? { type: 'FeatureCollection', features: Array.isArray(ddaData) ? ddaData : [] } : null);
        setMapLayerBundle(mapLayerRes.data || null);

        console.log('[Satellite] Overlays loaded');
      } catch (e) {
        console.error('[Satellite] Detail load error:', e);
        setDetailLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [selPhase, selCommunity?.masterplan]);

  /* ── On-demand: transactions, demographics, gee (only when layer toggled ON) ── */
  useEffect(() => {
    if (!selCommunity || !selPhase || !layers.transactions || transactions.length > 0) return;
    const mp = selCommunity.masterplan;
    console.log('[Satellite] On-demand: loading transactions for', mp);
    (async () => {
      const res = await sb.rpc('satellite_get_transactions', { p_masterplan: mp });
      if (res.error) console.error('[Satellite] transactions:', res.error.message);
      if (loadedCommunityRef.current === mp) setTransactions(res.data || []);
    })();
  }, [layers.transactions, selPhase, selCommunity?.masterplan]);

  useEffect(() => {
    if (!selCommunity || !selPhase || !layers.demographics || demographics.length > 0) return;
    const mp = selCommunity.masterplan;
    console.log('[Satellite] On-demand: loading demographics for', mp);
    (async () => {
      const res = await sb.rpc('satellite_get_demographics', { p_masterplan: mp });
      if (res.error) console.error('[Satellite] demographics:', res.error.message);
      if (loadedCommunityRef.current === mp) setDemographics(res.data || []);
    })();
  }, [layers.demographics, selPhase, selCommunity?.masterplan]);

  useEffect(() => {
    if (!selCommunity || !selPhase || !layers.gee || geeStatus.length > 0) return;
    const mp = selCommunity.masterplan;
    console.log('[Satellite] On-demand: loading GEE status for', mp);
    (async () => {
      const res = await sb.rpc('satellite_get_gee_status', { p_masterplan: mp });
      if (res.error) console.error('[Satellite] gee_status:', res.error.message);
      if (loadedCommunityRef.current === mp) setGeeStatus(res.data || []);
    })();
  }, [layers.gee, selPhase, selCommunity?.masterplan]);

  /* ── Toggle layer ── */
  const toggleLayer = useCallback((key: LayerKey) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  /* ── Phase label GeoJSON ── */
  const phaseLabelGeoJSON = useMemo<GeoJSONFC>(() => {
    // Prefer boundary RPC phases (with center_lat/lng), fallback to phase summary
    const bndPhases = Array.isArray(communityBoundary?.phases) ? communityBoundary.phases : [];
    const phasePoints = (bndPhases.length > 0 ? bndPhases : phases)
      .filter((p: R) => p.center_lat && p.center_lng);
    return {
      type: 'FeatureCollection',
      features: phasePoints.map((p: R) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.center_lng, p.center_lat] },
        properties: { name: (p.name || p.phase_name)?.replace(/.*- ?/, ''), units: p.units || p.total_units },
      })),
    };
  }, [phases, communityBoundary]);

  /* ── Transaction lookup for unit pricing ── */
  const txnLookup = useMemo(() => {
    const map = new Map<string, R>();
    for (const t of transactions) {
      const key = `${t.phase_name}__${t.rooms}`;
      if (!map.has(key) || t.txn_type === 'sale') map.set(key, t);
    }
    return map;
  }, [transactions]);

  /* ── Filtered units by phase ── */
  const filteredUnits = useMemo<GeoJSONFC>(() => {
    if (!villaUnits) return { type: 'FeatureCollection', features: [] };
    if (!selPhase) return villaUnits;
    return {
      type: 'FeatureCollection',
      features: villaUnits.features.filter(f => f.properties?.phase_name === selPhase),
    };
  }, [villaUnits, selPhase]);

  /* ── Unit circle color expression ── */
  const unitCircleColor = useMemo(() => {
    if (colorMode === 'bedrooms') {
      return [
        'match', ['get', 'bedrooms'],
        3, '#60a5fa', 4, '#f59e0b', 5, '#ef4444', 6, '#8b5cf6', 7, '#ec4899',
        '#94a3b8',
      ] as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    }
    if (colorMode === 'delivery') {
      // Color by openness_grade or position_score as proxy
      return '#C9A84C';
    }
    return '#C9A84C';
  }, [colorMode]);

  /* ── Amenity delivery GeoJSON (from villa_amenity_gee via mapLayerBundle) ── */
  const amenityPointsGeoJSON = useMemo<GeoJSONFC>(() => {
    // Build from map layer bundle amenities
    const raw = mapLayerBundle?.amenities;
    const amenList = Array.isArray(raw) ? raw : [];
    return {
      type: 'FeatureCollection',
      features: amenList
        .filter((a: R) => a.lnglat || a.point_geojson)
        .map((a: R, i: number) => ({
          type: 'Feature',
          geometry: a.point_geojson || { type: 'Point', coordinates: a.lnglat },
          properties: {
            id: a.id || i,
            name: a.display_name || a.name || a.brochure_name || 'Amenity',
            category: a.category || a.amenity_class || 'unknown',
            delivery_verdict: a.delivery_verdict || null,
            delivery_score: a.delivery_score || null,
            gee_built_pct: a.gee_built_pct || null,
            gee_vegetation_pct: a.gee_vegetation_pct || null,
            gee_water_pct: a.gee_water_pct || null,
            gee_bare_pct: a.gee_bare_pct || null,
            is_signature: a.is_signature || false,
          },
        })),
    };
  }, [mapLayerBundle]);

  /* ── Amenity polygons GeoJSON ── */
  const amenityPolygonsGeoJSON = useMemo<GeoJSONFC>(() => {
    const rawPolys = mapLayerBundle?.amenity_polygons;
    const polyList = Array.isArray(rawPolys) ? rawPolys : [];
    return {
      type: 'FeatureCollection',
      features: polyList
        .filter((p: R) => p.polygon_geojson || p.geometry)
        .map((p: R, i: number) => ({
          type: 'Feature',
          geometry: p.polygon_geojson || p.geometry,
          properties: { id: p.id || i, name: p.name || '', category: p.category || '' },
        })),
    };
  }, [mapLayerBundle]);

  /* ── Signature amenities GeoJSON ── */
  const signatureGeoJSON = useMemo<GeoJSONFC>(() => {
    const rawSigs = mapLayerBundle?.signature_amenities;
    const sigs = Array.isArray(rawSigs) ? rawSigs : [];
    return {
      type: 'FeatureCollection',
      features: sigs
        .filter((s: R) => s.lnglat || s.point_geojson)
        .map((s: R, i: number) => ({
          type: 'Feature',
          geometry: s.point_geojson || { type: 'Point', coordinates: s.lnglat },
          properties: { name: s.display_name || s.name || 'Signature', id: i },
        })),
    };
  }, [mapLayerBundle]);

  /* ── Community boundary GeoJSON ── */
  const boundaryGeoJSON = useMemo<GeoJSONFC>(() => {
    const bnd = communityBoundary?.boundary || mapLayerBundle?.boundary;
    if (!bnd) return { type: 'FeatureCollection', features: [] };
    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: bnd,
        properties: { name: selCommunity?.masterplan || '' },
      }],
    };
  }, [communityBoundary, mapLayerBundle, selCommunity]);

  /* ── Delivery phase data (from amenity delivery RPC) ── */
  const deliveryPhases = useMemo(() => {
    const bp = amenityDelivery?.by_phase;
    return (Array.isArray(bp) ? bp : []).sort((a: R, b: R) => (b.delivery_pct || 0) - (a.delivery_pct || 0));
  }, [amenityDelivery]);

  /* ── Delivery by class ── */
  const deliveryByClass = useMemo(() => {
    const bc = amenityDelivery?.by_class;
    return Array.isArray(bc) ? bc : [];
  }, [amenityDelivery]);

  /* ── Map click handler ── */
  const onMapClick = useCallback((e: R) => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();

    // Safely query only layers that exist on the map
    const safeQuery = (layerId: string) => {
      try {
        if (!map.getLayer(layerId)) return [];
        return map.queryRenderedFeatures(e.point, { layers: [layerId] }) || [];
      } catch { return []; }
    };

    // Check amenity points first
    const amenFeatures = safeQuery('amenity-points-layer');
    if (amenFeatures.length) {
      const f = amenFeatures[0];
      const props = f.properties || {};
      const coords = (f.geometry as any)?.coordinates; // eslint-disable-line @typescript-eslint/no-explicit-any
      setPopup({
        type: 'amenity',
        lng: coords?.[0] || e.lngLat.lng,
        lat: coords?.[1] || e.lngLat.lat,
        ...props,
      });
      return;
    }

    // Check DDA plots
    const ddaFeatures = safeQuery('dda-plot-fill');
    if (ddaFeatures.length) {
      const f = ddaFeatures[0];
      const props = f.properties || {};
      setPopup({
        type: 'dda_plot',
        lng: e.lngLat.lng,
        lat: e.lngLat.lat,
        ...props,
      });
      return;
    }

    // Check villa units
    const features = safeQuery('villa-units-layer');
    if (features?.length) {
      const f = features[0];
      const props = f.properties || {};
      const coords = (f.geometry as any)?.coordinates; // eslint-disable-line @typescript-eslint/no-explicit-any
      const txnKey = `${props.phase_name}__${props.bedrooms}`;
      const txn = txnLookup.get(txnKey);
      setPopup({
        type: 'unit',
        lng: coords?.[0] || e.lngLat.lng,
        lat: coords?.[1] || e.lngLat.lat,
        ...props,
        txn,
      });
      return;
    }

    setPopup(null);
  }, [txnLookup]);

  /* ── Fly to phase ── */
  const flyToPhase = useCallback((phase: R) => {
    const phaseName = phase.phase_name || phase.nearest_phase;
    setSelPhase(phaseName);
    if (phase.center_lat && phase.center_lng && mapRef.current) {
      mapRef.current.flyTo({ center: [phase.center_lng, phase.center_lat], zoom: 16, duration: 800 });
    }
  }, []);

  /* ── Mapbox layer styles ── */
  const unitLayerStyle: CircleLayer = {
    id: 'villa-units-layer',
    type: 'circle',
    source: 'villa-units',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 14, 2, 17, 6, 19, 10] as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      'circle-color': unitCircleColor,
      'circle-stroke-width': 1,
      'circle-stroke-color': '#1e293b',
      'circle-opacity': 0.85,
    },
  };

  const clusterLineStyle: LineLayer = {
    id: 'cluster-outlines', type: 'line', source: 'cluster-polygons',
    paint: { 'line-color': '#475569', 'line-width': 1, 'line-opacity': 0.6 },
  };

  const clusterFillStyle: FillLayer = {
    id: 'cluster-fill', type: 'fill', source: 'cluster-polygons',
    paint: { 'fill-color': '#64748b', 'fill-opacity': 0.08 },
  };

  const ddaPlotFillStyle: FillLayer = {
    id: 'dda-plot-fill', type: 'fill', source: 'dda-polygons',
    paint: {
      'fill-color': ['match', ['get', 'bedrooms'],
        '3BR', '#60a5fa', '4BR', '#f59e0b', '5BR', '#ef4444', '6BR', '#8b5cf6',
        '#94a3b8',
      ] as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      'fill-opacity': 0.15,
    },
  };

  const ddaPlotLineStyle: LineLayer = {
    id: 'dda-plot-outline', type: 'line', source: 'dda-polygons',
    paint: { 'line-color': '#94a3b8', 'line-width': 0.5, 'line-opacity': 0.5 },
  };

  const amenityPointsStyle: CircleLayer = {
    id: 'amenity-points-layer', type: 'circle', source: 'amenity-points',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 3, 16, 8, 19, 12] as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      'circle-color': ['match', ['get', 'delivery_verdict'],
        'DELIVERED', '#22C55E', 'delivered', '#22C55E',
        'PARTIAL', '#F59E0B', 'partial', '#F59E0B',
        'NOT_DELIVERED', '#EF4444', 'not_delivered', '#EF4444',
        '#6B7280',
      ] as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      'circle-stroke-width': 1.5,
      'circle-stroke-color': '#0F172A',
      'circle-opacity': 0.9,
    },
  };

  const amenityPolygonsFillStyle: FillLayer = {
    id: 'amenity-polys-fill', type: 'fill', source: 'amenity-polys',
    paint: { 'fill-color': '#4ADE80', 'fill-opacity': 0.12 },
  };

  const amenityPolygonsLineStyle: LineLayer = {
    id: 'amenity-polys-outline', type: 'line', source: 'amenity-polys',
    paint: { 'line-color': '#4ADE80', 'line-width': 1, 'line-opacity': 0.4 },
  };

  const signaturePointStyle: CircleLayer = {
    id: 'signature-layer', type: 'circle', source: 'signature-amenities',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 5, 16, 10, 19, 14] as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      'circle-color': '#C9A84C',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#0F172A',
      'circle-opacity': 1,
    },
  };

  const signatureLabelStyle: SymbolLayer = {
    id: 'signature-labels', type: 'symbol', source: 'signature-amenities',
    layout: {
      'text-field': ['get', 'name'],
      'text-size': 10,
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
      'text-anchor': 'top',
      'text-offset': [0, 1],
      'text-allow-overlap': false,
    },
    paint: { 'text-color': '#C9A84C', 'text-halo-color': '#0F172A', 'text-halo-width': 1.5 },
  };

  const boundaryLineStyle: LineLayer = {
    id: 'boundary-outline', type: 'line', source: 'community-boundary',
    paint: { 'line-color': '#C9A84C', 'line-width': 2, 'line-opacity': 0.7, 'line-dasharray': [3, 2] as any }, // eslint-disable-line @typescript-eslint/no-explicit-any
  };

  const phaseLabelStyle: SymbolLayer = {
    id: 'phase-labels', type: 'symbol', source: 'phase-labels',
    layout: {
      'text-field': ['get', 'name'],
      'text-size': 12,
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
      'text-anchor': 'center',
      'text-allow-overlap': false,
    },
    paint: { 'text-color': '#C9A84C', 'text-halo-color': '#000', 'text-halo-width': 1 },
  };

  // Interactive layers for click — only include IDs when data is actually rendered
  const interactiveLayers = useMemo(() => {
    const ids: string[] = [];
    if (layers.units && villaUnits && villaUnits.features.length > 0) ids.push('villa-units-layer');
    if (layers.amenityPoints && amenityPointsGeoJSON.features.length > 0) ids.push('amenity-points-layer');
    if (layers.ddaPlots && ddaPolygons && ddaPolygons.features.length > 0) ids.push('dda-plot-fill');
    return ids;
  }, [layers.units, layers.amenityPoints, layers.ddaPlots, villaUnits, amenityPointsGeoJSON, ddaPolygons]);

  /* ── Delivery summary ── */
  const deliverySummary = amenityDelivery?.summary;

  /* ── Render ── */
  if (loadingList) {
    return (
      <div className="flex justify-center items-center" style={{ height: '100%' }}>
        <Loader2 className="animate-spin" size={24} style={{ color: colors.gold }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', color: colors.text, overflow: 'hidden' }}>
      {/* LEFT SIDEBAR */}
      {sidebarOpen && (
        <div style={{
          width: 320, minWidth: 320, height: '100%', display: 'flex', flexDirection: 'column',
          borderRight: `1px solid ${colors.border}`, background: isDark ? '#0c0d14' : colors.surface,
          overflowY: 'auto',
        }}>
          {/* Community Selector */}
          <div style={{ padding: 12, borderBottom: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: 9, color: colors.textDim, fontFamily: FONT_DATA, letterSpacing: 1, marginBottom: 8 }}>
              VILLA COMMUNITIES · {communities.length}
            </div>
            {communities.map(c => {
              const active = selCommunity?.masterplan === c.masterplan;
              const rc = READINESS_COLOR[c.readiness] || '#94a3b8';
              return (
                <div key={c.masterplan} onClick={() => setSelCommunity(c)}
                  style={{
                    padding: '8px 10px', cursor: 'pointer', borderRadius: 4, marginBottom: 2,
                    background: active ? colors.goldBg : 'transparent',
                    borderLeft: active ? `3px solid ${colors.gold}` : '3px solid transparent',
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? colors.gold : colors.text }}>
                      {c.masterplan}
                    </span>
                    <span style={{
                      fontSize: 7, fontWeight: 700, padding: '1px 5px', borderRadius: 2,
                      background: rc + '20', color: rc, textTransform: 'uppercase',
                    }}>{c.readiness}</span>
                  </div>
                  <div style={{ fontSize: 9, color: colors.textDim, marginTop: 2, fontFamily: FONT_DATA }}>
                    {fmt(c.total_units)} units · {fmt(c.phases)} phases · {fmt(c.villa_types)} types
                  </div>
                </div>
              );
            })}
          </div>

          {/* Prompt to select community/phase */}
          {!selCommunity && (
            <div style={{ padding: 24, textAlign: 'center', color: colors.textDim, fontSize: 11 }}>
              Select a community above to get started
            </div>
          )}
          {selCommunity && !selPhase && !phaseLoading && phases.length > 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: colors.textDim, fontSize: 11 }}>
              Select a phase from the bottom bar to load data
            </div>
          )}
          {phaseLoading && (
            <div style={{ padding: 24, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Loader2 className="animate-spin" size={14} style={{ color: colors.gold }} />
              <span style={{ fontSize: 11, color: colors.gold }}>Loading phases...</span>
            </div>
          )}

          {/* Sidebar Tab Switcher + content — only after phase selected */}
          {selPhase && (<>
          <div style={{ display: 'flex', borderBottom: `1px solid ${colors.border}` }}>
            {([['delivery', 'Delivery'], ['layers', 'Layers'], ['data', 'Data']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setSidebarTab(k)}
                style={{
                  flex: 1, padding: '8px 0', fontSize: 10, fontWeight: 700, cursor: 'pointer',
                  fontFamily: FONT_DATA, background: 'none',
                  borderBottom: sidebarTab === k ? `2px solid ${colors.gold}` : '2px solid transparent',
                  border: 'none', color: sidebarTab === k ? colors.gold : colors.textDim,
                }}>{l}</button>
            ))}
          </div>

          {/* ═══ DELIVERY TAB ═══ */}
          {sidebarTab === 'delivery' && (
            <>
              {/* KPI Strip */}
              {deliverySummary && (
                <div style={{ padding: 12, borderBottom: `1px solid ${colors.border}` }}>
                  <div style={{ fontSize: 9, color: colors.textDim, fontFamily: FONT_DATA, letterSpacing: 1, marginBottom: 8 }}>
                    AMENITY DELIVERY · {amenityDelivery?.total_amenity_plots || 0} PLOTS
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <ScoreRing score={deliverySummary.avg_score || 0} size={48} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, color: '#22C55E', fontWeight: 600 }}>{deliverySummary.delivered} delivered</span>
                        <span style={{ fontSize: 10, color: '#F59E0B', fontWeight: 600 }}>{deliverySummary.partial} partial</span>
                        <span style={{ fontSize: 10, color: '#EF4444', fontWeight: 600 }}>{deliverySummary.not_delivered} undelivered</span>
                      </div>
                      {amenityDelivery?.imagery_date && (
                        <div style={{ fontSize: 8, color: colors.textDim, marginTop: 4, fontFamily: FONT_DATA }}>
                          <Satellite size={9} style={{ display: 'inline', marginRight: 3 }} />
                          Imagery: {amenityDelivery.imagery_date}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Delivery bar */}
                  <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                    {deliverySummary.delivered > 0 && <div style={{ flex: deliverySummary.delivered, background: '#22C55E' }} />}
                    {deliverySummary.partial > 0 && <div style={{ flex: deliverySummary.partial, background: '#F59E0B' }} />}
                    {deliverySummary.not_delivered > 0 && <div style={{ flex: deliverySummary.not_delivered, background: '#EF4444' }} />}
                  </div>
                </div>
              )}

              {/* Amenity Class Breakdown */}
              {deliveryByClass.length > 0 && (
                <div style={{ padding: 12, borderBottom: `1px solid ${colors.border}` }}>
                  <div style={{ fontSize: 9, color: colors.textDim, fontFamily: FONT_DATA, letterSpacing: 1, marginBottom: 8 }}>
                    BY AMENITY CLASS
                  </div>
                  {deliveryByClass.map((c: R, i: number) => {
                    const cc = CLASS_COLOR[c.amenity_class] || '#6B7280';
                    const total = c.total_plots || 1;
                    return (
                      <div key={i} style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: cc }} />
                            <span style={{ fontSize: 10, color: colors.text, fontWeight: 500 }}>
                              {c.amenity_class?.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <span style={{ fontSize: 9, color: colors.textDim, fontFamily: FONT_DATA }}>
                            {c.delivered}/{total}
                          </span>
                        </div>
                        <div style={{ display: 'flex', height: 4, borderRadius: 2, overflow: 'hidden', background: isDark ? '#1E293B' : '#e2e8f0' }}>
                          {c.delivered > 0 && <div style={{ flex: c.delivered, background: '#22C55E' }} />}
                          {c.partial > 0 && <div style={{ flex: c.partial, background: '#F59E0B' }} />}
                          {c.not_delivered > 0 && <div style={{ flex: c.not_delivered, background: '#EF4444' }} />}
                        </div>
                        <div style={{ fontSize: 8, color: colors.textDim, marginTop: 2 }}>
                          Avg score: {(c.avg_score || 0).toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Phase Delivery Ranking */}
              {deliveryPhases.length > 0 && (
                <div style={{ padding: 12 }}>
                  <div style={{ fontSize: 9, color: colors.textDim, fontFamily: FONT_DATA, letterSpacing: 1, marginBottom: 8 }}>
                    PHASE DELIVERY RANKING
                  </div>
                  {deliveryPhases.map((p: R, i: number) => {
                    const delPct = p.delivery_pct || 0;
                    const barColor = delPct >= 80 ? '#22C55E' : delPct >= 50 ? '#F59E0B' : '#EF4444';
                    return (
                      <div key={i} onClick={() => {
                        setSelPhase(p.nearest_phase);
                        // Find matching phase for fly-to
                        const match = phases.find(ph => ph.phase_name === p.nearest_phase);
                        if (match?.center_lat && match?.center_lng) {
                          mapRef.current?.flyTo({ center: [match.center_lng, match.center_lat], zoom: 16, duration: 800 });
                        }
                      }}
                        style={{
                          padding: '8px 10px', marginBottom: 4, borderRadius: 4, cursor: 'pointer',
                          background: selPhase === p.nearest_phase ? colors.goldBg : 'transparent',
                          border: `1px solid ${selPhase === p.nearest_phase ? colors.gold : 'transparent'}`,
                        }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: colors.text }}>
                            {p.nearest_phase?.replace(/.*- ?/, '')}
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: barColor, fontFamily: FONT_DATA }}>
                            {delPct.toFixed(1)}%
                          </span>
                        </div>
                        <div style={{ display: 'flex', height: 4, borderRadius: 2, overflow: 'hidden', background: isDark ? '#1E293B' : '#e2e8f0', marginBottom: 3 }}>
                          <div style={{ width: `${Math.min(delPct, 100)}%`, background: barColor }} />
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 8, color: '#22C55E' }}>{p.delivered} del</span>
                          <span style={{ fontSize: 8, color: '#F59E0B' }}>{p.partial} part</span>
                          <span style={{ fontSize: 8, color: '#EF4444' }}>{p.not_delivered} undev</span>
                          <span style={{ fontSize: 8, color: colors.textDim }}>{p.amenity_plots} plots</span>
                        </div>
                        {p.classes && (
                          <div style={{ fontSize: 7, color: colors.textDim, marginTop: 2, fontFamily: FONT_DATA }}>
                            {p.classes}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {!deliverySummary && !detailLoading && (
                <div style={{ padding: 16, textAlign: 'center', fontSize: 11, color: colors.textDim }}>
                  No amenity delivery data available for this community
                </div>
              )}
            </>
          )}

          {/* ═══ LAYERS TAB ═══ */}
          {sidebarTab === 'layers' && (
            <>
              <div style={{ padding: 12, borderBottom: `1px solid ${colors.border}` }}>
                <div style={{ fontSize: 9, color: colors.textDim, fontFamily: FONT_DATA, letterSpacing: 1, marginBottom: 8 }}>
                  MAP LAYERS
                </div>
                {LAYER_DEFS.map(l => (
                  <div key={l.key} onClick={() => toggleLayer(l.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0',
                      cursor: 'pointer', fontSize: 11, color: layers[l.key] ? colors.text : colors.textDim,
                    }}>
                    {layers[l.key] ? <Eye size={13} style={{ color: colors.gold }} /> : <EyeOff size={13} />}
                    <span>{l.label}</span>
                  </div>
                ))}
              </div>

              {/* Color Mode */}
              <div style={{ padding: 12, borderBottom: `1px solid ${colors.border}` }}>
                <div style={{ fontSize: 9, color: colors.textDim, fontFamily: FONT_DATA, letterSpacing: 1, marginBottom: 8 }}>
                  COLOR UNITS BY
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {([['bedrooms', 'Bedrooms'], ['delivery', 'Delivery'], ['price', 'Price']] as const).map(([k, l]) => (
                    <button key={k} onClick={() => setColorMode(k)} style={{
                      flex: 1, padding: '4px 0', borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: 'pointer',
                      fontFamily: FONT_DATA, border: `1px solid ${colorMode === k ? colors.gold : colors.border}`,
                      background: colorMode === k ? colors.goldBg : 'transparent',
                      color: colorMode === k ? colors.gold : colors.textSecondary,
                    }}>{l}</button>
                  ))}
                </div>
                {/* Legend */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {colorMode === 'bedrooms' && Object.entries(BR_COLORS).map(([br, col]) => (
                    <div key={br} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: colors.textSecondary }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: col }} />
                      {BR_LABELS[+br]}
                    </div>
                  ))}
                  {colorMode === 'delivery' && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: '#22C55E' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E' }} />Delivered
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: '#F59E0B' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B' }} />Partial
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: '#EF4444' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} />Not Delivered
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ═══ DATA TAB ═══ */}
          {sidebarTab === 'data' && (
            <>
              {/* Community Profile */}
              {communityBoundary && (
                <div style={{ padding: 12, borderBottom: `1px solid ${colors.border}` }}>
                  <div style={{ fontSize: 9, color: colors.textDim, fontFamily: FONT_DATA, letterSpacing: 1, marginBottom: 8 }}>
                    COMMUNITY PROFILE
                  </div>
                  <div style={{ fontSize: 11, color: colors.text, fontWeight: 600, marginBottom: 4 }}>
                    {communityBoundary.community}
                  </div>
                  <div style={{ fontSize: 10, color: colors.textSecondary, lineHeight: 1.6 }}>
                    {communityBoundary.developer && <div>Developer: {communityBoundary.developer}</div>}
                    <div>{fmt(communityBoundary.total_units)} units · {fmt(communityBoundary.total_plots)} plots</div>
                    {communityBoundary.area_sqkm && <div>{communityBoundary.area_sqkm} km²</div>}
                    {communityBoundary.phases?.length && <div>{communityBoundary.phases.length} phases</div>}
                  </div>
                </div>
              )}

              {/* Demographics Panel */}
              {demographics.length > 0 && (
                <div style={{ padding: 12, borderBottom: `1px solid ${colors.border}` }}>
                  <div style={{ fontSize: 9, color: colors.textDim, fontFamily: FONT_DATA, letterSpacing: 1, marginBottom: 8 }}>
                    DEWA DEMOGRAPHICS
                  </div>
                  {demographics.map((d, i) => (
                    <div key={i} style={{ fontSize: 10, color: colors.textSecondary, marginBottom: 6, lineHeight: 1.5 }}>
                      <div style={{ fontWeight: 600, color: colors.text }}>{d.dewa_community || d.masterplan}</div>
                      <div>{fmt(d.total_villa_makanis)} villas · {d.occupancy_pct ? `${d.occupancy_pct}% occupied` : '—'}</div>
                      {d.top_nationality_1 && <div style={{ color: colors.textDim }}>Top: {d.top_nationality_1}{d.top_nationality_2 ? `, ${d.top_nationality_2}` : ''}{d.top_nationality_3 ? `, ${d.top_nationality_3}` : ''}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* GEE Status */}
              {geeStatus.length > 0 && (
                <div style={{ padding: 12, borderBottom: `1px solid ${colors.border}` }}>
                  <div style={{ fontSize: 9, color: colors.textDim, fontFamily: FONT_DATA, letterSpacing: 1, marginBottom: 8 }}>
                    GEE SATELLITE VERIFICATION
                  </div>
                  {geeStatus.map((g, i) => (
                    <div key={i} style={{ fontSize: 10, color: colors.textSecondary, marginBottom: 6, lineHeight: 1.5 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, color: colors.text }}>{g.project_name}</span>
                        <DeliveryBadge verdict={g.delivery_verdict || 'unknown'} />
                      </div>
                      <div>{g.plots} plots · Built: {g.avg_built_pct}% · Veg: {g.avg_veg_pct}%</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Transaction summary */}
              {transactions.length > 0 && (
                <div style={{ padding: 12 }}>
                  <div style={{ fontSize: 9, color: colors.textDim, fontFamily: FONT_DATA, letterSpacing: 1, marginBottom: 8 }}>
                    DLD TRANSACTIONS · {transactions.length}
                  </div>
                  {transactions.filter(t => t.txn_type === 'sale').slice(0, 10).map((t, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: colors.textSecondary, marginBottom: 4 }}>
                      <span style={{ color: BR_COLORS[t.rooms] || colors.text, fontWeight: 600 }}>{t.rooms}BR</span>
                      <span>AED {fmtM(t.avg_price_aed)}</span>
                      <span style={{ color: colors.textDim }}>({t.txn_count} txn)</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          </>)}
        </div>
      )}

      {/* SIDEBAR TOGGLE */}
      <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
        position: 'absolute', left: sidebarOpen ? 320 : 0, top: '50%', zIndex: 20,
        background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '0 4px 4px 0',
        padding: '8px 2px', cursor: 'pointer', display: 'flex', alignItems: 'center',
      }}>
        <ChevronRight size={14} style={{ color: colors.textDim, transform: sidebarOpen ? 'rotate(180deg)' : 'none' }} />
      </button>

      {/* MAP + BOTTOM PANEL */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
        {/* MAP */}
        <div style={{ flex: 1, position: 'relative' }}>
          {!selCommunity && !loadingList && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10,
              background: isDark ? '#0c0d14ee' : '#f5f5f0ee', borderRadius: 8,
              padding: '24px 32px', border: `1px solid ${colors.border}`, textAlign: 'center',
            }}>
              <MapPin size={24} style={{ color: colors.gold, marginBottom: 8 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: colors.text, marginBottom: 4 }}>Select a Community</div>
              <div style={{ fontSize: 11, color: colors.textDim }}>Choose a villa community from the sidebar</div>
            </div>
          )}

          {selCommunity && !selPhase && !phaseLoading && phases.length > 0 && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10,
              background: isDark ? '#0c0d14ee' : '#f5f5f0ee', borderRadius: 8,
              padding: '24px 32px', border: `1px solid ${colors.border}`, textAlign: 'center',
            }}>
              <Satellite size={24} style={{ color: colors.gold, marginBottom: 8 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: colors.text, marginBottom: 4 }}>Select a Phase</div>
              <div style={{ fontSize: 11, color: colors.textDim }}>Pick a phase from the bottom bar to load map data</div>
            </div>
          )}

          {phaseLoading && (
            <div style={{
              position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 10,
              background: colors.surface, border: `1px solid ${colors.gold}`, borderRadius: 6,
              padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Loader2 className="animate-spin" size={14} style={{ color: colors.gold }} />
              <span style={{ fontSize: 11, color: colors.gold }}>Loading phases for {selCommunity?.masterplan}...</span>
            </div>
          )}

          {detailLoading && (
            <div style={{
              position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 10,
              background: colors.surface, border: `1px solid ${colors.gold}`, borderRadius: 6,
              padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Loader2 className="animate-spin" size={14} style={{ color: colors.gold }} />
              <span style={{ fontSize: 11, color: colors.gold }}>Loading {selCommunity?.masterplan}...</span>
            </div>
          )}

          {/* Stats overlay */}
          {villaUnits && !detailLoading && (
            <div style={{
              position: 'absolute', top: 12, right: 12, zIndex: 10,
              background: isDark ? '#0c0d14ee' : '#f5f5f0ee', borderRadius: 6,
              padding: '8px 12px', border: `1px solid ${colors.border}`, maxWidth: 320,
            }}>
              <div style={{ fontSize: 9, color: colors.textDim, fontFamily: FONT_DATA, marginBottom: 4 }}>
                {selCommunity?.masterplan?.toUpperCase()}
                {communityBoundary?.developer && <span style={{ color: colors.textSecondary }}> · {communityBoundary.developer}</span>}
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 10, flexWrap: 'wrap' }}>
                <div><span style={{ color: colors.gold, fontWeight: 700 }}>{fmt(filteredUnits.features.length)}</span> <span style={{ color: colors.textDim }}>units</span></div>
                <div><span style={{ color: colors.gold, fontWeight: 700 }}>{phases.length}</span> <span style={{ color: colors.textDim }}>phases</span></div>
                {ddaPolygons && ddaPolygons.features.length > 0 && (
                  <div><span style={{ color: '#94a3b8', fontWeight: 700 }}>{fmt(ddaPolygons.features.length)}</span> <span style={{ color: colors.textDim }}>plots</span></div>
                )}
                {deliverySummary && (
                  <div><span style={{ color: '#22C55E', fontWeight: 700 }}>{Math.round((deliverySummary.avg_score || 0) * 100)}%</span> <span style={{ color: colors.textDim }}>delivery</span></div>
                )}
              </div>
              {selPhase && (
                <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 9, color: colors.gold }}>{selPhase.replace(/.*- ?/, '')}</span>
                  <button onClick={() => setSelPhase(null)} style={{
                    fontSize: 8, color: colors.textDim, cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline',
                  }}>clear filter</button>
                </div>
              )}
            </div>
          )}

          <MapGL
            ref={mapRef}
            {...viewState}
            onMove={e => setViewState(e.viewState)}
            onClick={onMapClick}
            mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
            mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
            style={{ width: '100%', height: '100%' }}
            interactiveLayerIds={interactiveLayers}
            cursor="pointer"
          >
            {/* Community boundary */}
            {layers.boundary && boundaryGeoJSON.features.length > 0 && (
              <Source id="community-boundary" type="geojson" data={boundaryGeoJSON}>
                <Layer {...boundaryLineStyle} />
              </Source>
            )}

            {/* DDA plot polygons */}
            {layers.ddaPlots && ddaPolygons && ddaPolygons.features.length > 0 && (
              <Source id="dda-polygons" type="geojson" data={ddaPolygons}>
                <Layer {...ddaPlotFillStyle} />
                <Layer {...ddaPlotLineStyle} />
              </Source>
            )}

            {/* Amenity polygons */}
            {layers.amenityPolygons && amenityPolygonsGeoJSON.features.length > 0 && (
              <Source id="amenity-polys" type="geojson" data={amenityPolygonsGeoJSON}>
                <Layer {...amenityPolygonsFillStyle} />
                <Layer {...amenityPolygonsLineStyle} />
              </Source>
            )}

            {/* Cluster polygon outlines */}
            {layers.clusters && clusterPolygons && clusterPolygons.features.length > 0 && (
              <Source id="cluster-polygons" type="geojson" data={clusterPolygons}>
                <Layer {...clusterFillStyle} />
                <Layer {...clusterLineStyle} />
              </Source>
            )}

            {/* Villa unit dots */}
            {layers.units && filteredUnits.features.length > 0 && (
              <Source id="villa-units" type="geojson" data={filteredUnits}>
                <Layer {...unitLayerStyle} />
              </Source>
            )}

            {/* Amenity delivery points */}
            {layers.amenityPoints && amenityPointsGeoJSON.features.length > 0 && (
              <Source id="amenity-points" type="geojson" data={amenityPointsGeoJSON}>
                <Layer {...amenityPointsStyle} />
              </Source>
            )}

            {/* Signature amenities (gold pins) */}
            {layers.signature && signatureGeoJSON.features.length > 0 && (
              <Source id="signature-amenities" type="geojson" data={signatureGeoJSON}>
                <Layer {...signaturePointStyle} />
                <Layer {...signatureLabelStyle} />
              </Source>
            )}

            {/* Phase labels */}
            {layers.phaseLabels && phaseLabelGeoJSON.features.length > 0 && (
              <Source id="phase-labels" type="geojson" data={phaseLabelGeoJSON}>
                <Layer {...phaseLabelStyle} />
              </Source>
            )}

            {/* ── Popups ── */}
            {popup && popup.type === 'unit' && (
              <Popup longitude={popup.lng} latitude={popup.lat} onClose={() => setPopup(null)}
                closeButton closeOnClick={false} anchor="bottom" maxWidth="280px">
                <div style={{ padding: 4, fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{popup.unit_number || '—'}</div>
                  <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>
                    {popup.villa_type || popup.rooms_en || `${popup.bedrooms}BR`} · {fmt(popup.bua_sqft || popup.area_sqft)} sqft
                    {popup.row_position ? ` · ${popup.row_position}` : ''}
                  </div>
                  <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 6, marginBottom: 4 }}>
                    {popup.txn ? (
                      <>
                        <div style={{ fontSize: 11 }}>
                          <span style={{ color: '#666' }}>Avg Sale:</span>{' '}
                          <span style={{ fontWeight: 600 }}>AED {fmtM(popup.txn.avg_price_aed)}</span>
                        </div>
                        <div style={{ fontSize: 11 }}>
                          <span style={{ color: '#666' }}>PSF:</span>{' '}
                          <span style={{ fontWeight: 600 }}>AED {fmt(Math.round(popup.txn.avg_psm || 0))}</span>
                        </div>
                        {popup.txn.avg_rent_aed && (
                          <div style={{ fontSize: 11 }}>
                            <span style={{ color: '#666' }}>Avg Rent:</span>{' '}
                            <span style={{ fontWeight: 600 }}>AED {fmt(popup.txn.avg_rent_aed)}/yr</span>
                          </div>
                        )}
                        <div style={{ fontSize: 9, color: '#999', marginTop: 2 }}>{popup.txn.txn_count} transactions</div>
                      </>
                    ) : (
                      <div style={{ fontSize: 11, color: '#999' }}>No transaction data</div>
                    )}
                  </div>
                  <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 4, fontSize: 10, color: '#999' }}>
                    Phase: {popup.phase_name?.replace(/.*- ?/, '') || '—'}
                    {popup.dda_plot_number ? ` · Plot: ${popup.dda_plot_number}` : ''}
                    {popup.positioned && <span style={{ color: '#34D399', marginLeft: 6 }}>● positioned</span>}
                  </div>
                </div>
              </Popup>
            )}

            {popup && popup.type === 'amenity' && (
              <Popup longitude={popup.lng} latitude={popup.lat} onClose={() => setPopup(null)}
                closeButton closeOnClick={false} anchor="bottom" maxWidth="300px">
                <div style={{ padding: 6, fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{popup.name}</div>
                    {popup.delivery_verdict && <DeliveryBadge verdict={popup.delivery_verdict} size="md" />}
                  </div>
                  <div style={{ fontSize: 10, color: '#666', marginBottom: 6 }}>
                    {popup.category?.replace(/_/g, ' ')}
                    {popup.is_signature === 'true' || popup.is_signature === true
                      ? <span style={{ color: '#C9A84C', marginLeft: 6, fontWeight: 600 }}>★ SIGNATURE</span>
                      : ''}
                  </div>
                  {(popup.gee_built_pct || popup.gee_vegetation_pct || popup.gee_water_pct || popup.gee_bare_pct) && (
                    <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 6 }}>
                      <SatelliteBar
                        built={parseFloat(popup.gee_built_pct) || 0}
                        veg={parseFloat(popup.gee_vegetation_pct) || 0}
                        water={parseFloat(popup.gee_water_pct) || 0}
                        bare={parseFloat(popup.gee_bare_pct) || 0}
                      />
                    </div>
                  )}
                  {popup.delivery_score && (
                    <div style={{ fontSize: 9, color: '#666', marginTop: 4 }}>
                      Confidence: {(parseFloat(popup.delivery_score) * 100).toFixed(0)}%
                    </div>
                  )}
                </div>
              </Popup>
            )}

            {popup && popup.type === 'dda_plot' && (
              <Popup longitude={popup.lng} latitude={popup.lat} onClose={() => setPopup(null)}
                closeButton closeOnClick={false} anchor="bottom" maxWidth="260px">
                <div style={{ padding: 4, fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    Plot {popup.plot_number || '—'}
                  </div>
                  <div style={{ fontSize: 11, color: '#666', lineHeight: 1.6 }}>
                    {popup.phase && <div>Phase: {popup.phase}</div>}
                    {popup.units_on_plot && <div>Units: {popup.units_on_plot}</div>}
                    {popup.bedrooms && <div>Bedrooms: {popup.bedrooms}</div>}
                    {popup.avg_bua_sqft && <div>Avg BUA: {fmt(popup.avg_bua_sqft)} sqft</div>}
                    {popup.plot_area_sqft && <div>Plot: {fmt(popup.plot_area_sqft)} sqft</div>}
                  </div>
                </div>
              </Popup>
            )}
          </MapGL>
        </div>

        {/* BOTTOM PHASE CARDS — now with delivery data */}
        {(phases.length > 0 || deliveryPhases.length > 0) && (
          <div style={{
            borderTop: `1px solid ${colors.border}`, padding: '8px 12px',
            background: isDark ? '#0c0d14' : colors.surface,
            overflowX: 'auto', whiteSpace: 'nowrap', display: 'flex', gap: 8,
            flexShrink: 0,
          }}>
            {/* Clear filter button */}
            {selPhase && (
              <button onClick={() => setSelPhase(null)} style={{
                padding: '6px 12px', borderRadius: 4, fontSize: 9, fontWeight: 700,
                cursor: 'pointer', fontFamily: FONT_DATA, whiteSpace: 'nowrap',
                background: colors.goldBg, border: `1px solid ${colors.gold}`, color: colors.gold,
              }}>ALL PHASES</button>
            )}
            {phases.map(p => {
              const active = selPhase === p.phase_name;
              const shortName = p.phase_name?.replace(/.*- ?/, '') || p.phase_name;
              // Find matching delivery data
              const delData = deliveryPhases.find((d: R) => d.nearest_phase === p.phase_name);
              const delPct = delData?.delivery_pct;
              const delColor = delPct != null ? (delPct >= 80 ? '#22C55E' : delPct >= 50 ? '#F59E0B' : '#EF4444') : undefined;
              return (
                <div key={p.phase_name} onClick={() => flyToPhase(p)}
                  style={{
                    display: 'inline-block', padding: '8px 14px', borderRadius: 6, cursor: 'pointer',
                    background: active ? colors.goldBg : colors.cardBg,
                    border: `1px solid ${active ? colors.gold : colors.border}`,
                    minWidth: 140, flexShrink: 0,
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: active ? colors.gold : colors.text }}>
                      {shortName}
                    </div>
                    {delPct != null && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: delColor, fontFamily: FONT_DATA }}>
                        {delPct.toFixed(0)}%
                      </span>
                    )}
                  </div>
                  {delPct != null && (
                    <div style={{ display: 'flex', height: 3, borderRadius: 2, overflow: 'hidden', background: isDark ? '#1E293B' : '#e2e8f0', marginBottom: 4 }}>
                      <div style={{ width: `${Math.min(delPct, 100)}%`, background: delColor || '#94a3b8' }} />
                    </div>
                  )}
                  <div style={{ fontSize: 9, color: colors.textDim, fontFamily: FONT_DATA }}>
                    {fmt(p.total_units)} units · {fmt(p.villa_types)} types
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    {p.br3 > 0 && <span style={{ fontSize: 8, color: BR_COLORS[3] }}>{p.br3}×3BR</span>}
                    {p.br4 > 0 && <span style={{ fontSize: 8, color: BR_COLORS[4] }}>{p.br4}×4BR</span>}
                    {p.br5plus > 0 && <span style={{ fontSize: 8, color: BR_COLORS[5] }}>{p.br5plus}×5BR+</span>}
                  </div>
                  {p.avg_bua > 0 && (
                    <div style={{ fontSize: 8, color: colors.textDim, marginTop: 2 }}>
                      avg {fmt(Math.round(p.avg_bua))} sqft
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Transaction summary strip */}
        {layers.transactions && transactions.length > 0 && (
          <div style={{
            borderTop: `1px solid ${colors.border}`, padding: '6px 12px',
            background: isDark ? '#0c0d14' : colors.surface,
            overflowX: 'auto', whiteSpace: 'nowrap', display: 'flex', gap: 12, alignItems: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 9, color: colors.textDim, fontFamily: FONT_DATA }}>DLD TRANSACTIONS</span>
            {transactions.filter(t => t.txn_type === 'sale').slice(0, 8).map((t, i) => (
              <div key={i} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 10, color: colors.textSecondary }}>
                <span style={{ color: BR_COLORS[t.rooms] || colors.text, fontWeight: 600 }}>{t.rooms}BR</span>
                <span>AED {fmtM(t.avg_price_aed)}</span>
                <span style={{ color: colors.textDim }}>({t.txn_count})</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
