import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTheme } from '@/lib/theme';
import { sb } from '@/lib/supabase';
import { Loader2, Eye, EyeOff, ChevronRight } from 'lucide-react';
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

/* ── Color Schemes ── */
const BR_COLORS: Record<number, string> = {
  3: '#60a5fa', 4: '#f59e0b', 5: '#ef4444', 6: '#8b5cf6',
};
const BR_LABELS: Record<number, string> = {
  3: '3BR', 4: '4BR', 5: '5BR', 6: '6BR+',
};

const READINESS_COLOR: Record<string, string> = {
  production: '#34D399', enriched: '#FBBF24', basic: '#94a3b8',
};

/* ── Layer Keys ── */
type LayerKey = 'units' | 'clusters' | 'transactions' | 'amenities' | 'phaseLabels' | 'demographics' | 'gee';

const LAYER_DEFS: { key: LayerKey; label: string }[] = [
  { key: 'units', label: 'Villa Units' },
  { key: 'clusters', label: 'Plex Row Outlines' },
  { key: 'transactions', label: 'Transaction Data' },
  { key: 'amenities', label: 'Amenities' },
  { key: 'phaseLabels', label: 'Phase Labels' },
  { key: 'demographics', label: 'Demographics (DEWA)' },
  { key: 'gee', label: 'GEE Satellite Status' },
];

/* ── Color Modes ── */
type ColorMode = 'bedrooms' | 'price' | 'yield';

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

  // Per-community data
  const [villaUnits, setVillaUnits] = useState<GeoJSONFC | null>(null);
  const [clusterPolygons, setClusterPolygons] = useState<GeoJSONFC | null>(null);
  const [transactions, setTransactions] = useState<R[]>([]);
  const [phases, setPhases] = useState<R[]>([]);
  const [amenities, setAmenities] = useState<R[]>([]);
  const [demographics, setDemographics] = useState<R[]>([]);
  const [geeStatus, setGeeStatus] = useState<R[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // UI state
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    units: true, clusters: true, transactions: false,
    amenities: true, phaseLabels: true, demographics: false, gee: false,
  });
  const [colorMode, setColorMode] = useState<ColorMode>('bedrooms');
  const [selPhase, setSelPhase] = useState<string | null>(null);
  const [popup, setPopup] = useState<R | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
        if (data?.length) {
          setSelCommunity(data[0]);
        }
      } catch (e) {
        console.error('[Satellite] Failed to load communities:', e);
      }
      setLoadingList(false);
    })();
  }, []);

  /* ── Load community detail data ── */
  useEffect(() => {
    if (!selCommunity) return;
    const mp = selCommunity.masterplan;
    setDetailLoading(true);
    setSelPhase(null);
    setPopup(null);
    (async () => {
      try {
        const [unitsRes, clustersRes, txnRes, phasesRes, amenRes, demoRes, geeRes] = await Promise.all([
          sb.rpc('satellite_get_villa_units', { p_masterplan: mp }),
          sb.rpc('satellite_get_cluster_polygons', { p_masterplan: mp }),
          sb.rpc('satellite_get_transactions', { p_masterplan: mp }),
          sb.rpc('satellite_get_phase_summary', { p_masterplan: mp }),
          sb.rpc('satellite_get_amenities', { p_masterplan: mp }),
          sb.rpc('satellite_get_demographics', { p_masterplan: mp }),
          sb.rpc('satellite_get_gee_status', { p_masterplan: mp }),
        ]);
        if (unitsRes.error) console.error('[Satellite] villa_units:', unitsRes.error.message);
        if (clustersRes.error) console.error('[Satellite] cluster_polygons:', clustersRes.error.message);
        if (txnRes.error) console.error('[Satellite] transactions:', txnRes.error.message);
        if (phasesRes.error) console.error('[Satellite] phase_summary:', phasesRes.error.message);
        if (amenRes.error) console.error('[Satellite] amenities:', amenRes.error.message);
        if (demoRes.error) console.error('[Satellite] demographics:', demoRes.error.message);
        if (geeRes.error) console.error('[Satellite] gee_status:', geeRes.error.message);

        // Units and clusters come as GeoJSON
        const unitData = unitsRes.data;
        const clusterData = clustersRes.data;
        setVillaUnits(unitData && typeof unitData === 'object' && unitData.type === 'FeatureCollection'
          ? unitData : { type: 'FeatureCollection', features: Array.isArray(unitData) ? unitData : [] });
        setClusterPolygons(clusterData && typeof clusterData === 'object' && clusterData.type === 'FeatureCollection'
          ? clusterData : { type: 'FeatureCollection', features: Array.isArray(clusterData) ? clusterData : [] });
        setTransactions(txnRes.data || []);
        setPhases(phasesRes.data || []);
        setAmenities(amenRes.data || []);
        setDemographics(demoRes.data || []);
        setGeeStatus(geeRes.data || []);

        // Fly to community bbox
        if (selCommunity.bbox_west && mapRef.current) {
          mapRef.current.fitBounds(
            [[selCommunity.bbox_west, selCommunity.bbox_south], [selCommunity.bbox_east, selCommunity.bbox_north]],
            { padding: 60, duration: 1200 }
          );
        } else if (selCommunity.center_lat && mapRef.current) {
          mapRef.current.flyTo({ center: [selCommunity.center_lng, selCommunity.center_lat], zoom: 14, duration: 1200 });
        }

        console.log('[Satellite] Loaded:', {
          community: mp,
          units: (unitData?.features || []).length,
          clusters: (clusterData?.features || []).length,
          transactions: (txnRes.data || []).length,
          phases: (phasesRes.data || []).length,
        });
      } catch (e) {
        console.error('[Satellite] Detail load error:', e);
      }
      setDetailLoading(false);
    })();
  }, [selCommunity?.masterplan]);

  /* ── Toggle layer ── */
  const toggleLayer = useCallback((key: LayerKey) => {
    setLayers(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  /* ── Phase label GeoJSON ── */
  const phaseLabelGeoJSON = useMemo<GeoJSONFC>(() => ({
    type: 'FeatureCollection',
    features: phases.filter(p => p.center_lat && p.center_lng).map(p => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.center_lng, p.center_lat] },
      properties: { name: p.phase_name?.replace(/.*- ?/, '') || p.phase_name, units: p.total_units },
    })),
  }), [phases]);

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
        3, '#60a5fa', 4, '#f59e0b', 5, '#ef4444', 6, '#8b5cf6',
        '#94a3b8',
      ] as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    }
    // Default fallback for price/yield (would need txn join, keep simple)
    return '#C9A84C';
  }, [colorMode]);

  /* ── Map click handler ── */
  const onMapClick = useCallback((e: R) => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();
    const features = map.queryRenderedFeatures(e.point, { layers: ['villa-units-layer'] });
    if (features?.length) {
      const f = features[0];
      const props = f.properties || {};
      const coords = (f.geometry as any)?.coordinates; // eslint-disable-line @typescript-eslint/no-explicit-any
      // Look up transaction data
      const txnKey = `${props.phase_name}__${props.bedrooms}`;
      const txn = txnLookup.get(txnKey);
      setPopup({
        lng: coords?.[0] || e.lngLat.lng,
        lat: coords?.[1] || e.lngLat.lat,
        ...props,
        txn,
      });
    } else {
      setPopup(null);
    }
  }, [txnLookup]);

  /* ── Fly to phase ── */
  const flyToPhase = useCallback((phase: R) => {
    setSelPhase(phase.phase_name);
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
    id: 'cluster-outlines',
    type: 'line',
    source: 'cluster-polygons',
    paint: { 'line-color': '#475569', 'line-width': 1, 'line-opacity': 0.6 },
  };

  const clusterFillStyle: FillLayer = {
    id: 'cluster-fill',
    type: 'fill',
    source: 'cluster-polygons',
    paint: { 'fill-color': '#64748b', 'fill-opacity': 0.08 },
  };

  const phaseLabelStyle: SymbolLayer = {
    id: 'phase-labels',
    type: 'symbol',
    source: 'phase-labels',
    layout: {
      'text-field': ['get', 'name'],
      'text-size': 12,
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
      'text-anchor': 'center',
      'text-allow-overlap': false,
    },
    paint: { 'text-color': '#C9A84C', 'text-halo-color': '#000', 'text-halo-width': 1 },
  };

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
          width: 300, minWidth: 300, height: '100%', display: 'flex', flexDirection: 'column',
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
                    {fmt(c.total_units)} units · {c.phases} phases · {c.villa_types} types
                  </div>
                </div>
              );
            })}
          </div>

          {/* Layer Toggles */}
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
              {([['bedrooms', 'Bedrooms'], ['price', 'Price'], ['yield', 'Yield']] as const).map(([k, l]) => (
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
              {colorMode === 'price' && ['Premium (>1400)|#ef4444', 'Market|#f59e0b', 'Value (<1000)|#22c55e'].map(s => {
                const [l, c] = s.split('|');
                return <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: colors.textSecondary }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />{l}
                </div>;
              })}
              {colorMode === 'yield' && ['High >6%|#22c55e', 'Med 4-6%|#f59e0b', 'Low <4%|#ef4444'].map(s => {
                const [l, c] = s.split('|');
                return <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: colors.textSecondary }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />{l}
                </div>;
              })}
            </div>
          </div>

          {/* Demographics Panel */}
          {layers.demographics && demographics.length > 0 && (
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
          {layers.gee && geeStatus.length > 0 && (
            <div style={{ padding: 12 }}>
              <div style={{ fontSize: 9, color: colors.textDim, fontFamily: FONT_DATA, letterSpacing: 1, marginBottom: 8 }}>
                GEE SATELLITE VERIFICATION
              </div>
              {geeStatus.map((g, i) => (
                <div key={i} style={{ fontSize: 10, color: colors.textSecondary, marginBottom: 6, lineHeight: 1.5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600, color: colors.text }}>{g.project_name}</span>
                    <span style={{
                      fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 2,
                      background: g.delivery_verdict === 'delivered' ? '#34D39920' : g.delivery_verdict === 'partial' ? '#FBBF2420' : '#F8717120',
                      color: g.delivery_verdict === 'delivered' ? '#34D399' : g.delivery_verdict === 'partial' ? '#FBBF24' : '#F87171',
                    }}>{g.delivery_verdict?.toUpperCase()}</span>
                  </div>
                  <div>{g.plots} plots · Built: {g.avg_built_pct}% · Veg: {g.avg_veg_pct}%</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SIDEBAR TOGGLE */}
      <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
        position: 'absolute', left: sidebarOpen ? 300 : 0, top: '50%', zIndex: 20,
        background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '0 4px 4px 0',
        padding: '8px 2px', cursor: 'pointer', display: 'flex', alignItems: 'center',
      }}>
        <ChevronRight size={14} style={{ color: colors.textDim, transform: sidebarOpen ? 'rotate(180deg)' : 'none' }} />
      </button>

      {/* MAP + BOTTOM PANEL */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
        {/* MAP */}
        <div style={{ flex: 1, position: 'relative' }}>
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
              padding: '8px 12px', border: `1px solid ${colors.border}`,
            }}>
              <div style={{ fontSize: 9, color: colors.textDim, fontFamily: FONT_DATA, marginBottom: 4 }}>
                {selCommunity?.masterplan?.toUpperCase()}
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 10 }}>
                <div><span style={{ color: colors.gold, fontWeight: 700 }}>{fmt(filteredUnits.features.length)}</span> <span style={{ color: colors.textDim }}>units</span></div>
                <div><span style={{ color: colors.gold, fontWeight: 700 }}>{phases.length}</span> <span style={{ color: colors.textDim }}>phases</span></div>
                <div><span style={{ color: colors.gold, fontWeight: 700 }}>{transactions.length}</span> <span style={{ color: colors.textDim }}>txn rows</span></div>
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
            interactiveLayerIds={['villa-units-layer']}
            cursor="pointer"
          >
            {/* Villa unit dots */}
            {layers.units && filteredUnits.features.length > 0 && (
              <Source id="villa-units" type="geojson" data={filteredUnits}>
                <Layer {...unitLayerStyle} />
              </Source>
            )}

            {/* Cluster polygon outlines */}
            {layers.clusters && clusterPolygons && clusterPolygons.features.length > 0 && (
              <Source id="cluster-polygons" type="geojson" data={clusterPolygons}>
                <Layer {...clusterFillStyle} />
                <Layer {...clusterLineStyle} />
              </Source>
            )}

            {/* Phase labels */}
            {layers.phaseLabels && phaseLabelGeoJSON.features.length > 0 && (
              <Source id="phase-labels" type="geojson" data={phaseLabelGeoJSON}>
                <Layer {...phaseLabelStyle} />
              </Source>
            )}

            {/* Unit click popup */}
            {popup && (
              <Popup
                longitude={popup.lng}
                latitude={popup.lat}
                onClose={() => setPopup(null)}
                closeButton={true}
                closeOnClick={false}
                anchor="bottom"
                maxWidth="280px"
              >
                <div style={{ padding: 4, fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                    {popup.unit_number || '—'}
                  </div>
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
                        <div style={{ fontSize: 9, color: '#999', marginTop: 2 }}>
                          {popup.txn.txn_count} transactions
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 11, color: '#999' }}>No transaction data</div>
                    )}
                  </div>
                  <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 4, fontSize: 10, color: '#999' }}>
                    Phase: {popup.phase_name?.replace(/.*- ?/, '') || '—'}
                    {popup.dda_plot_number ? ` · Plot: ${popup.dda_plot_number}` : ''}
                  </div>
                </div>
              </Popup>
            )}
          </MapGL>
        </div>

        {/* BOTTOM PHASE CARDS */}
        {phases.length > 0 && (
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
              return (
                <div key={p.phase_name} onClick={() => flyToPhase(p)}
                  style={{
                    display: 'inline-block', padding: '8px 14px', borderRadius: 6, cursor: 'pointer',
                    background: active ? colors.goldBg : colors.cardBg,
                    border: `1px solid ${active ? colors.gold : colors.border}`,
                    minWidth: 120, flexShrink: 0,
                  }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: active ? colors.gold : colors.text, marginBottom: 4 }}>
                    {shortName}
                  </div>
                  <div style={{ fontSize: 9, color: colors.textDim, fontFamily: FONT_DATA }}>
                    {fmt(p.total_units)} units · {p.villa_types} types
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
