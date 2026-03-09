import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTheme } from '@/lib/theme';
import { sb } from '@/lib/supabase';
import { Loader2, Search, Sun, Moon, Star } from 'lucide-react';
import MapGL, { Marker, Popup, Source, Layer, type MapRef } from 'react-map-gl';
import type { FillLayer, LineLayer } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GeoJSONFC = { type: 'FeatureCollection'; features: any[] };

/* ── Interfaces ── */
interface Community {
  community_key: string;
  display_name: string;
  centroid_lnglat: [number, number];
  bbox: [number, number, number, number]; // [west, south, east, north]
  area_sqkm: number;
}

interface Amenity {
  id: number;
  name: string;
  amenity_type: string;
  amenity_category: string;
  is_operational: boolean;
  is_signature: boolean;
  tagline: string;
  lifecycle_stage: string;
  source: string;
  rating: number | null;
  lat: number;
  lng: number;
  render_as: 'polygon' | 'point';
  area_sqm: number | null;
}

interface AmenityPolygon {
  id: string;
  polygon_geojson: R;
  centroid_lnglat: [number, number];
  name: string;
  type: string;
  category: string;
  is_signature: boolean;
  tagline: string;
  area_sqm: number | null;
  land_use: string;
}

interface RpcLayerData {
  boundary: R | null;
  centroid_lnglat: [number, number];
  bbox: [number, number, number, number];
  amenities: R[];
  amenity_polygons: R[];
  signature_amenities: R[];
  boundary_source: string;
  area_sqkm: number;
  display_name: string;
}

/* ── Label maps ── */
const AMENITY_LABELS: Record<string, string> = {
  // HEALTHCARE (OSM + masterplan) — split from old catch-all 'hospital'
  pharmacy: 'Pharmacy', health_clinic: 'Medical Centre', clinic: 'Clinic',
  hospital: 'Hospital', healthcare: 'Healthcare', health_facility: 'Health Facility',

  // HOSPITALITY (masterplan only — completely separate from healthcare)
  hotel_cluster: 'Hotel Zone', business_hotel: 'Business Hotel',
  lifestyle_hotel: 'Lifestyle Hotel', boutique_hotel: 'Boutique Hotel',
  luxury_hotel: '5-Star Hotel', resort_hotel: 'Resort', eco_hotel: 'Eco Hotel',
  theme_hotel: 'Theme Hotel', medical_hotel: 'Medical Hotel',
  waterfront_hotel: 'Waterfront Hotel', golf_hotel: 'Golf Clubhouse',

  // WATER
  crystal_lagoon: 'Crystal Lagoon', ornamental_lake: 'Lagoon / Lake',
  waterpark_lagoon: 'Wave Pool', waterpark_attraction: 'Surf & Waterpark',
  waterfront_lagoon: 'Lagoon Waterfront', waterfront_marina: 'Marina', marina: 'Marina',
  canal_waterfront: 'Canal Waterfront', creek_waterfront: 'Creek Waterfront',
  waterfront: 'Water Feature', waterfront_park: 'Waterfront Park',
  thematic_lake: 'Themed Lake', ecology_water: 'Ecology Pond',
  golf_lake: 'Golf Lake', urban_water_feature: 'Water Feature',
  lagoon_beach_park: 'Lagoon Beach', beach_park: 'Beach Park', beach_club: 'Beach Club',
  island_park: 'Island Park',

  // PARKS & GREEN
  community_park: 'Community Park', mega_park: 'Major Park', urban_park: 'Urban Park',
  village_park: 'Village Park', zen_park: 'Zen Garden', botanical_park: 'Botanical Garden',
  canal_park: 'Canal Park', campus_green: 'Campus Green', forest_park: 'Forest Park',
  forest_reserve: 'Forest Reserve', wellness_park: 'Wellness Garden',
  sports_park: 'Sports Park', polo_park: 'Polo & Park', motorsport_park: 'Motorsport Park',
  theme_park_grounds: 'Theme Park', themed_park: 'Themed Park',
  park: 'Park / Garden',

  // GOLF
  golf_park: 'Golf Park', golf_course: 'Golf Course',

  // SPORTS & LEISURE
  sports_leisure: 'Sports & Wellness', sports_village: 'Sports Village',
  sports_club: 'Gym / Sports Club', leisure_facility: 'Leisure',
  signature_leisure: 'Signature Attraction', motorsport_attraction: 'Motorsport',
  eco_leisure: 'Eco Leisure', wellness_facility: 'Wellness Centre',
  eco_facility: 'Eco Facility', gym: 'Gym / Fitness',
  sports_court: 'Sports Court', cycling_track: 'Cycling Track',

  // ENTERTAINMENT
  entertainment_facility: 'Entertainment', entertainment: 'Entertainment',
  theme_park: 'Theme Park', cultural_facility: 'Arts & Culture',

  // COMMUNITY
  community_facility: 'Schools & Mosque', education: 'School',
  education_facility: 'Education Campus', business_facility: 'Business Centre',
  medical_facility: 'Healthcare Campus', school: 'School', mosque: 'Mosque',
  community_centre: 'Community Centre',

  // RETAIL
  mall: 'Mall / Supermarket', retail: 'Retail', retail_mall: 'Shopping Mall',
  retail_village: 'Retail Village', retail_strip: 'Retail Strip',
  retail_promenade: 'Retail Promenade', retail_beach: 'Beach Retail',
  lifestyle_retail: 'Lifestyle Retail', luxury_retail: 'Luxury Retail',
  community_retail: 'Community Retail', town_centre_retail: 'Town Centre',
  boulevard_retail: 'Boulevard Retail', podium_retail: 'Podium Retail',
  trade_retail: 'Trade & Wholesale', wellness_retail: 'Wellness Retail',
  themed_retail: 'Themed Retail', supermarket: 'Supermarket',

  // INFRASTRUCTURE
  infrastructure: 'Transport', transport: 'Transport',

  // OTHER
  recreation: 'Recreation', other: 'Other', business: 'Business',
  restaurant: 'Restaurant', promenade: 'Promenade / Walk',
  lagoon: 'Lagoon / Water', pool: 'Pool', playground: 'Playground',
  nursery: 'Nursery', dog_park: 'Dog Park', leisure: 'Leisure',
};

/** Display labels for amenity_category (the broader grouping) */
const CATEGORY_LABELS: Record<string, string> = {
  healthcare: 'Healthcare', hospitality: 'Hotels & Resorts',
  green_space: 'Parks & Green', water_body: 'Water Features',
  leisure_facility: 'Leisure & Sports', retail_commercial: 'Retail',
  community_facility: 'Community', retail: 'Shops',
  recreation: 'Recreation', services: 'Services',
  infrastructure: 'Transport',
};

/** Get human-readable label for amenity type, with underscore→space fallback */
function getAmenityLabel(type: string): string {
  return AMENITY_LABELS[type] ?? type.replace(/_/g, ' ');
}

/** Get human-readable label for amenity category */
function getCategoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat] ?? cat.replace(/_/g, ' ');
}

const SOURCE_LABELS: Record<string, string> = {
  openstreetmap: 'OpenStreetMap',
  masterplan_catalogue: 'Masterplan Catalogue',
  brochure_verified: 'Brochure Verified',
  dda: 'DDA Cadastral',
  khda: 'KHDA',
  osm: 'OpenStreetMap',
  google_places: 'Google Places',
  dld_masterplan: 'DLD Masterplan',
  gee_verified: 'GEE Satellite-verified',
  manual: 'Manual Survey',
  dda_plots_union: 'DDA Plots Union',
};

const SIG_EMOJI: Record<string, string> = {
  // Healthcare
  pharmacy: '💊', health_clinic: '🏥', clinic: '🩺',
  hospital: '🏥', healthcare: '🏥', health_facility: '🏥',
  // Hospitality
  hotel_cluster: '🏨', business_hotel: '🏨', lifestyle_hotel: '🏨',
  boutique_hotel: '🏨', luxury_hotel: '🏨', resort_hotel: '🏖',
  eco_hotel: '🌿', theme_hotel: '🎠', medical_hotel: '🏥',
  waterfront_hotel: '⚓', golf_hotel: '⛳',
  // Other
  park: '🌳', restaurant: '🍽️', retail: '🛍️', school: '🏫',
  mosque: '🕌', gym: '💪', supermarket: '🛒',
  transport: '🚇', leisure: '🎡', entertainment: '🎭',
  recreation: '⛳', promenade: '🚶', lagoon: '🌊', pool: '🏊',
  playground: '🛝', mall: '🛒', default: '📍',
};

const CAT_COLORS: Record<string, string> = {
  // Healthcare — reds (visually distinct from hospitality gold)
  pharmacy: '#F59E0B', health_clinic: '#EF4444', clinic: '#EF4444',
  hospital: '#DC2626', healthcare: '#EF4444', health_facility: '#EF4444',
  // Hospitality — gold/amber
  hotel_cluster: '#D97706', business_hotel: '#D97706', lifestyle_hotel: '#D97706',
  boutique_hotel: '#D97706', luxury_hotel: '#B45309', resort_hotel: '#D97706',
  eco_hotel: '#059669', theme_hotel: '#D97706', medical_hotel: '#D97706',
  waterfront_hotel: '#D97706', golf_hotel: '#4D7C0F',
  // General
  park: '#22c55e', restaurant: '#f97316', retail: '#a855f7', school: '#3b82f6',
  mosque: '#10b981', gym: '#ef4444', supermarket: '#eab308', mall: '#a855f7',
  transport: '#64748b', leisure: '#f59e0b', infrastructure: '#64748b',
  entertainment: '#a855f7', recreation: '#22c55e', promenade: '#ec4899',
  lagoon: '#06b6d4', pool: '#3b82f6', playground: '#f59e0b',
  sports_club: '#ef4444', other: '#94a3b8',
  default: '#94a3b8',
};

/** Convert community_key to RPC format: "ARABIAN RANCHES III" → "ARABIAN_RANCHES_3" */
function toRpcKey(key: string): string {
  const romanMap: Record<string, string> = { I: '1', II: '2', III: '3', IV: '4', V: '5' };
  return key.split(' ').map(w => romanMap[w] ?? w).join('_');
}

/** Fill color by amenity type — matches nature of each feature */
function getAmenityFillColor(type: string): string {
  const colors: Record<string, string> = {
    // Water — blues
    crystal_lagoon: '#0EA5E9', ornamental_lake: '#38BDF8', waterpark_lagoon: '#0284C7',
    waterfront_lagoon: '#7DD3FC', waterfront_marina: '#0369A1', marina: '#0369A1',
    canal_waterfront: '#60A5FA', creek_waterfront: '#93C5FD', waterfront: '#BAE6FD',
    waterfront_park: '#7DD3FC', thematic_lake: '#38BDF8', ecology_water: '#A7F3D0',
    golf_lake: '#6EE7B7', urban_water_feature: '#BAE6FD', lagoon_beach_park: '#2DD4BF',
    beach_park: '#FCD34D', beach_club: '#FBBF24', waterpark_attraction: '#0EA5E9',
    // Green — greens
    community_park: '#4ADE80', mega_park: '#22C55E', urban_park: '#86EFAC',
    village_park: '#BBF7D0', zen_park: '#6EE7B7', botanical_park: '#34D399',
    canal_park: '#A7F3D0', campus_green: '#BBF7D0', forest_park: '#16A34A',
    forest_reserve: '#15803D', wellness_park: '#86EFAC', sports_park: '#4ADE80',
    polo_park: '#22C55E', motorsport_park: '#D1FAE5', theme_park_grounds: '#FDE68A',
    themed_park: '#FEF3C7', island_park: '#6EE7B7',
    // Golf — fairway green
    golf_park: '#365314', golf_course: '#3F6212',
    // Sports / leisure — orange
    sports_leisure: '#FB923C', sports_village: '#F97316', leisure_facility: '#FDBA74',
    motorsport_attraction: '#FCA5A5', signature_leisure: '#F59E0B', wellness_facility: '#C4B5FD',
    // Entertainment — purple
    entertainment_facility: '#A78BFA', theme_park: '#8B5CF6', cultural_facility: '#7C3AED',
    // Healthcare — reds/pinks
    pharmacy: '#F59E0B', health_clinic: '#FCA5A5', clinic: '#FCA5A5',
    hospital: '#FEE2E2', healthcare: '#FCA5A5', health_facility: '#FCA5A5',
    // Facilities — warm grey
    community_facility: '#D1D5DB', business_facility: '#E5E7EB',
    medical_facility: '#FEE2E2', education_facility: '#D1D5DB',
    // Hospitality — gold
    hotel_cluster: '#FDE68A', boutique_hotel: '#FCD34D', resort_hotel: '#F59E0B',
    luxury_hotel: '#D97706', business_hotel: '#FDE68A', lifestyle_hotel: '#FCD34D',
    eco_hotel: '#A7F3D0', theme_hotel: '#FDE68A', medical_hotel: '#FEE2E2',
    waterfront_hotel: '#BAE6FD', golf_hotel: '#4D7C0F',
    // Retail — yellow
    retail_village: '#FEF9C3', retail_mall: '#FEF08A', lifestyle_retail: '#FDE047',
  };
  return colors[type] || '#D1D5DB';
}

/** Format area for display */
function formatArea(sqm: number | null): string | null {
  if (!sqm) return null;
  return sqm >= 10000
    ? (sqm / 1_000_000).toFixed(2) + ' km\u00B2'
    : Math.round(sqm).toLocaleString() + ' m\u00B2';
}

export function SatellitePage() {
  const { colors, mode, toggle } = useTheme();
  const isDark = mode === 'dark';

  const [communities, setCommunities] = useState<Community[]>([]);
  const [selected, setSelected] = useState<Community | null>(null);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [amenityPolygons, setAmenityPolygons] = useState<AmenityPolygon[]>([]);
  const [signatureAmenities, setSignatureAmenities] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Select a community');
  const [filterCat, setFilterCat] = useState('all');
  const [filterOp, setFilterOp] = useState('all');
  const [search, setSearch] = useState('');
  const [popupAmenity, setPopupAmenity] = useState<Amenity | null>(null);
  const [boundaryGeoJSON, setBoundaryGeoJSON] = useState<GeoJSONFC | null>(null);
  const [rpcMeta, setRpcMeta] = useState<{ boundary_source: string; area_sqkm: number } | null>(null);
  const [mapZoom, setMapZoom] = useState(14);
  const mapboxRef = useRef<MapRef>(null);

  /* ── CHANGE 5: Load overview community list from get_all_community_centroids RPC ── */
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await sb.rpc('get_all_community_centroids');
        if (error) {
          console.error('[Satellite] get_all_community_centroids error:', error.message);
          return;
        }
        if (!data?.length) {
          console.warn('[Satellite] get_all_community_centroids returned empty');
          return;
        }
        const comms: Community[] = (data as R[]).map((d) => ({
          community_key: d.community_key || '',
          display_name: d.display_name || d.community_key?.replace(/_/g, ' ') || '',
          centroid_lnglat: Array.isArray(d.centroid_lnglat) ? [d.centroid_lnglat[0], d.centroid_lnglat[1]] as [number, number] : [0, 0] as [number, number],
          bbox: Array.isArray(d.bbox) ? [d.bbox[0], d.bbox[1], d.bbox[2], d.bbox[3]] as [number, number, number, number] : [0, 0, 0, 0] as [number, number, number, number],
          area_sqkm: Number(d.area_sqkm) || 0,
        }));
        console.log(`[Satellite] Loaded ${comms.length} communities from RPC`);
        setCommunities(comms);
      } catch (e) {
        console.error('[Satellite] Failed to load communities:', e);
      }
    })();
  }, []);

  /* ── CHANGE 1+2+3: Load community detail via get_community_map_layer RPC ── */
  const loadCommunity = async (com: Community) => {
    setSelected(com);
    setAmenities([]);
    setAmenityPolygons([]);
    setSignatureAmenities([]);
    setBoundaryGeoJSON(null);
    setRpcMeta(null);
    setLoading(true);
    setFilterCat('all');
    setFilterOp('all');
    setPopupAmenity(null);
    setStatus('Loading...');

    const rpcKey = toRpcKey(com.community_key);

    try {
      const { data: rpcData, error: rpcErr } = await sb.rpc('get_community_map_layer', {
        p_community_key: rpcKey,
      });

      if (rpcErr) {
        console.error('[Satellite] RPC error:', rpcErr.message);
        setStatus(`Error loading ${com.display_name}`);
        setLoading(false);
        return;
      }

      if (!rpcData) {
        console.warn('[Satellite] RPC returned null for', rpcKey);
        setStatus(`No data for ${com.display_name}`);
        setLoading(false);
        return;
      }

      const d = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as RpcLayerData;
      console.log('[Satellite] RPC response keys:', Object.keys(d));

      // Store metadata
      setRpcMeta({
        boundary_source: d.boundary_source || 'unknown',
        area_sqkm: d.area_sqkm || 0,
      });

      // CHANGE 2: Boundary polygon from RPC (real GeoJSON, not bbox)
      if (d.boundary) {
        const geo = typeof d.boundary === 'string' ? JSON.parse(d.boundary) : d.boundary;
        if (geo.type === 'Polygon' || geo.type === 'MultiPolygon') {
          setBoundaryGeoJSON({
            type: 'FeatureCollection',
            features: [{ type: 'Feature', geometry: geo, properties: { name: com.display_name } }],
          });
        } else if (geo.type === 'FeatureCollection') {
          setBoundaryGeoJSON(geo);
        } else if (geo.type === 'Feature') {
          setBoundaryGeoJSON({ type: 'FeatureCollection', features: [geo] });
        }
      }

      // Fit map to RPC bbox
      if (d.bbox && Array.isArray(d.bbox) && d.bbox.length === 4) {
        const [w, s, e, n] = d.bbox;
        mapboxRef.current?.fitBounds([[w, s], [e, n]], { padding: 60, duration: 1500 });
      }

      // CHANGE 3: Parse amenities with new fields
      const mapAmenity = (a: R, i: number): Amenity => {
        let lat = 0, lng = 0;
        if (Array.isArray(a.lnglat)) {
          [lng, lat] = a.lnglat;
        } else if (a.lnglat && typeof a.lnglat === 'object') {
          lng = a.lnglat.lng ?? a.lnglat[0] ?? 0;
          lat = a.lnglat.lat ?? a.lnglat[1] ?? 0;
        } else if (a.lng != null && a.lat != null) {
          lng = Number(a.lng); lat = Number(a.lat);
        }
        return {
          id: a.id ?? i,
          name: a.name || a.amenity_name || 'Unknown',
          amenity_type: String(a.amenity_type || a.type || '').toLowerCase(),
          amenity_category: String(a.amenity_category || a.category || '').toLowerCase(),
          is_operational: a.is_operational != null ? Boolean(a.is_operational) : true,
          is_signature: Boolean(a.is_signature),
          tagline: a.tagline || '',
          lifecycle_stage: a.lifecycle_stage || 'operational',
          source: a.source || '',
          rating: a.rating != null ? Number(a.rating) : null,
          render_as: a.render_as === 'polygon' ? 'polygon' as const : 'point' as const,
          area_sqm: a.area_sqm != null ? Number(a.area_sqm) : null,
          lat, lng,
        };
      };

      const pins = (d.amenities || []).map(mapAmenity).filter((a: Amenity) => a.lat !== 0 && a.lng !== 0);
      setAmenities(pins);

      // Parse amenity polygons from RPC
      const polys: AmenityPolygon[] = (d.amenity_polygons || [])
        .filter((ap: R) => ap.polygon_geojson)
        .map((ap: R, i: number) => ({
          id: String(ap.id ?? `ap-${i}`),
          polygon_geojson: typeof ap.polygon_geojson === 'string' ? JSON.parse(ap.polygon_geojson) : ap.polygon_geojson,
          centroid_lnglat: Array.isArray(ap.centroid_lnglat)
            ? [ap.centroid_lnglat[0], ap.centroid_lnglat[1]] as [number, number]
            : [0, 0] as [number, number],
          name: ap.name || 'Unknown',
          type: String(ap.type || '').toLowerCase(),
          category: String(ap.category || '').toLowerCase(),
          is_signature: Boolean(ap.is_signature),
          tagline: ap.tagline || '',
          area_sqm: ap.area_sqm != null ? Number(ap.area_sqm) : null,
          land_use: ap.land_use || '',
        }));
      setAmenityPolygons(polys);
      console.log(`[Satellite] ${polys.length} amenity polygons`);

      // Signature amenities
      const sigs = (d.signature_amenities || []).map(mapAmenity).filter((a: Amenity) => a.lat !== 0 && a.lng !== 0);
      setSignatureAmenities(sigs);

      setStatus(`${pins.length} amenities · ${com.display_name}`);
      console.log(`[Satellite] ${pins.length} pins, ${sigs.length} signature amenities`);
    } catch (e) {
      console.error('[Satellite] loadCommunity failed:', e);
      setStatus(`Error loading ${com.display_name}`);
    }

    setLoading(false);
  };

  /* ── Derived data ── */
  const categories = useMemo(() =>
    [...new Set(amenities.map(a => a.amenity_type || a.amenity_category).filter(Boolean))].sort(),
    [amenities]
  );

  const visible = useMemo(() =>
    amenities.filter(a => {
      const cat = a.amenity_type || a.amenity_category || '';
      if (filterCat !== 'all' && cat !== filterCat) return false;
      if (filterOp === 'op' && !a.is_operational) return false;
      if (filterOp === 'not' && a.is_operational) return false;
      return true;
    }),
    [amenities, filterCat, filterOp]
  );

  const filteredComs = useMemo(() =>
    communities.filter(c =>
      c.display_name.toLowerCase().includes(search.toLowerCase()) ||
      c.community_key.toLowerCase().includes(search.toLowerCase())
    ),
    [communities, search]
  );

  const opCount = amenities.filter(a => a.is_operational).length;
  const catCounts = useMemo(() =>
    categories.reduce<Record<string, number>>((acc, cat) => ({
      ...acc, [cat]: amenities.filter(a => (a.amenity_type || a.amenity_category) === cat).length,
    }), {}),
    [amenities, categories]
  );

  // Merged polygon FeatureCollection for low-zoom rendering
  const mergedPolygonFC = useMemo<GeoJSONFC | null>(() => {
    if (!amenityPolygons.length) return null;
    return {
      type: 'FeatureCollection',
      features: amenityPolygons.map(ap => ({
        type: 'Feature',
        geometry: ap.polygon_geojson,
        properties: { type: ap.type, is_signature: ap.is_signature, name: ap.name },
      })),
    };
  }, [amenityPolygons]);

  const useIndividualPolygons = mapZoom >= 13;

  // Fly mapbox to community bounds when selected
  const flyToSelected = useCallback(() => {
    if (!selected || !mapboxRef.current) return;
    const [w, s, e, n] = selected.bbox;
    if (w === 0 && s === 0) return;
    mapboxRef.current.fitBounds([[w, s], [e, n]], { padding: 60, duration: 1500 });
  }, [selected]);

  useEffect(() => {
    flyToSelected();
  }, [selected, flyToSelected]);

  /* ── Theme-adaptive colors ── */
  const bg = isDark ? '#07080d' : '#f5f7fa';
  const panelBg = isDark ? '#060c15' : '#ffffff';
  const headerBg = isDark ? '#06101c' : '#f0f2f5';
  const borderC = isDark ? '#192a3e' : '#e0e4ea';
  const rowBorder = isDark ? '#0c1520' : '#eef0f4';
  const textPrimary = isDark ? '#e2e8f0' : '#1a202c';
  const textSecondary = isDark ? '#8a9bb5' : '#64748b';
  const textDim = isDark ? '#2a4a6a' : '#a0aec0';
  const accentBlue = isDark ? '#00d4ff' : '#0284c7';
  const dotBg = isDark ? '#091422' : '#f0f4f8';
  const overlayBg = isDark ? '#07080da8' : '#ffffffd0';
  const goldColor = '#C9A84C';

  const fillLayer: FillLayer = {
    id: 'boundary-fill', type: 'fill', source: 'community-boundary',
    paint: { 'fill-color': accentBlue, 'fill-opacity': 0.12 },
  };
  const lineLayer: LineLayer = {
    id: 'boundary-line', type: 'line', source: 'community-boundary',
    paint: { 'line-color': accentBlue, 'line-width': 2.5, 'line-opacity': 0.85 },
  };

  return (
    <div style={{ fontFamily: "'JetBrains Mono','Courier New',monospace", background: bg, color: textSecondary, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600;700&family=Barlow+Condensed:wght@600;700;800&display=swap');
        @keyframes slideIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .sat-crow{display:flex;align-items:center;gap:10px;padding:8px 12px;cursor:pointer;border-bottom:1px solid ${rowBorder};transition:background .12s}
        .sat-crow:hover,.sat-crow.sel{background:${isDark ? '#0b1728' : '#f0f6ff'}}
        .sat-chip{background:transparent;border:1px solid ${borderC};color:${textDim};font-family:inherit;font-size:8px;letter-spacing:1px;padding:3px 9px;border-radius:2px;cursor:pointer;transition:all .15s;white-space:nowrap}
        .sat-chip.on{background:${accentBlue}12;border-color:${accentBlue};color:${accentBlue}}
        .sat-chip:hover:not(.on){border-color:${isDark ? '#243a52' : '#c0c8d0'};color:${isDark ? '#5a7a9a' : '#475569'}}
        .mapboxgl-popup-content{background:${isDark ? '#0a1628' : '#fff'}!important;border:1px solid ${borderC}!important;border-radius:6px!important;box-shadow:0 8px 30px ${isDark ? '#000a' : '#0002'}!important;padding:10px 14px!important}
        .amenity-pin{width:12px;height:12px;border-radius:50%;border:2px solid #fff;cursor:pointer;transition:transform .15s}
        .amenity-pin:hover{transform:scale(1.4)}
        .amenity-pin--signature{width:18px;height:18px;border:2px solid ${goldColor};box-shadow:0 0 12px ${goldColor}80,0 0 4px ${goldColor}40}
        .amenity-pin--planned{width:9px;height:9px;border:2px dashed #888;opacity:0.6}
        .sig-strip{display:flex;gap:10px;overflow-x:auto;padding:8px 12px;scrollbar-width:none}
        .sig-strip::-webkit-scrollbar{display:none}
        .sig-card{flex-shrink:0;width:140px;background:${isDark ? '#0a1628' : '#f8f9fb'};border:1px solid ${isDark ? '#1a2a3e' : '#e0e4ea'};border-radius:6px;padding:8px 10px;cursor:pointer;transition:border-color .2s}
        .sig-card:hover{border-color:${goldColor}}
        .amenity-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 16px;text-align:center;gap:8px}
        .amenity-empty__icon{font-size:28px;opacity:0.4}
        .amenity-empty__text{font-size:13px;font-weight:600;color:${isDark ? '#8a9bb5' : '#4a5568'}}
        .amenity-empty__sub{font-size:11px;color:${isDark ? '#4a6a8a' : '#8899aa'};max-width:220px;line-height:1.5}
      `}</style>

      {/* Header */}
      <div style={{ background: headerBg, borderBottom: `1px solid ${borderC}`, height: 46, display: 'flex', alignItems: 'center', padding: '0 18px', gap: 14, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: selected ? accentBlue : borderC, boxShadow: selected ? `0 0 10px ${accentBlue}80` : 'none', transition: 'all .4s' }} />
          <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16, fontWeight: 800, color: textPrimary, letterSpacing: 3 }}>SATELLITE VERIFICATION</span>
          <span style={{ color: borderC }}>·</span>
          <span style={{ fontSize: 9, color: textDim, letterSpacing: 1.5 }}>GIS AMENITY OVERLAY</span>
        </div>
        <div style={{ flex: 1 }} />
        {selected && !loading && amenities.length > 0 && (
          <div style={{ display: 'flex', gap: 20 }}>
            {([
              [textPrimary, amenities.length, 'TOTAL'],
              ['#10b981', opCount, 'OPERATIONAL'],
              ['#ef4444', amenities.length - opCount, 'PENDING'],
            ] as [string, number, string][]).map(([color, val, label]) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: 7, color: textDim, letterSpacing: 1 }}>{label}</div>
              </div>
            ))}
          </div>
        )}
        <button onClick={toggle} style={{
          background: isDark ? '#091422' : '#e8ecf0', border: `1px solid ${borderC}`,
          borderRadius: 4, padding: '4px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center',
        }}>
          {isDark ? <Sun size={12} style={{ color: colors.gold }} /> : <Moon size={12} style={{ color: colors.gold }} />}
        </button>
        <div style={{ fontSize: 9, color: textDim, letterSpacing: 0.5 }}>{status}</div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{ width: 252, background: panelBg, borderRight: `1px solid ${rowBorder}`, display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ padding: '10px 10px 8px', borderBottom: `1px solid ${rowBorder}` }}>
            <div style={{ position: 'relative' }}>
              <Search size={11} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: textDim, pointerEvents: 'none' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search communities..."
                style={{ background: dotBg, border: `1px solid ${borderC}`, color: textPrimary, fontFamily: 'inherit', fontSize: 10, padding: '6px 8px 6px 28px', borderRadius: 3, outline: 'none', width: '100%' }} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 12px', borderBottom: `1px solid ${rowBorder}` }}>
            <span style={{ fontSize: 8, color: textDim, letterSpacing: 1 }}>COMMUNITIES</span>
            <span style={{ fontSize: 8, color: accentBlue }}>{communities.length}</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredComs.map(com => {
              const sel = selected?.community_key === com.community_key;
              return (
                <div key={com.community_key} className={`sat-crow${sel ? ' sel' : ''}`} onClick={() => loadCommunity(com)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: sel ? accentBlue : textPrimary, fontWeight: sel ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {com.display_name}
                    </div>
                    <div style={{ fontSize: 7.5, color: textDim, marginTop: 1 }}>
                      {com.area_sqkm > 0 ? `${com.area_sqkm.toFixed(1)} km²` : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* CHANGE 6: Footer with dynamic source label */}
          <div style={{ padding: '8px 12px', borderTop: `1px solid ${rowBorder}`, fontSize: 7.5, color: textDim, lineHeight: 1.7 }}>
            <div>SOURCE · {rpcMeta ? (SOURCE_LABELS[rpcMeta.boundary_source] || rpcMeta.boundary_source) : 'get_all_community_centroids'}</div>
            <div>MAP · Mapbox Satellite</div>
            {rpcMeta && rpcMeta.area_sqkm > 0 && <div>AREA · {rpcMeta.area_sqkm.toFixed(2)} km²</div>}
          </div>
        </div>

        {/* Main panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selected ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, opacity: 0.5 }}>
              <div style={{ fontSize: 56, lineHeight: 1 }}>{'⬡'}</div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 20, fontWeight: 800, color: textDim, letterSpacing: 4 }}>SELECT A COMMUNITY</div>
              <div style={{ fontSize: 10, color: textDim }}>{communities.length} communities available</div>
            </div>
          ) : (
            <>
              {/* Filter bar — only show when amenities exist */}
              {amenities.length > 0 && <div style={{ padding: '6px 12px', borderBottom: `1px solid ${rowBorder}`, display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap', background: panelBg, flexShrink: 0 }}>
                <span style={{ fontSize: 8, color: textDim, letterSpacing: 1, flexShrink: 0 }}>STATUS:</span>
                {([['all', 'ALL'], ['op', '● OPEN'], ['not', '○ PENDING']] as [string, string][]).map(([v, l]) => (
                  <button key={v} className={`sat-chip${filterOp === v ? ' on' : ''}`}
                    style={filterOp === v && v === 'op' ? { borderColor: '#10b981', color: '#10b981', background: '#10b98112' } : filterOp === v && v === 'not' ? { borderColor: '#ef4444', color: '#ef4444', background: '#ef444412' } : {}}
                    onClick={() => setFilterOp(v)}>{l}</button>
                ))}
                <div style={{ width: 1, height: 14, background: borderC, margin: '0 3px' }} />
                <span style={{ fontSize: 8, color: textDim, letterSpacing: 1, flexShrink: 0 }}>TYPE:</span>
                <button className={`sat-chip${filterCat === 'all' ? ' on' : ''}`} onClick={() => setFilterCat('all')}>ALL</button>
                {categories.slice(0, 12).map(cat => {
                  const c = CAT_COLORS[cat] || CAT_COLORS.default;
                  return (
                    <button key={cat} className={`sat-chip${filterCat === cat ? ' on' : ''}`}
                      style={filterCat === cat ? { borderColor: c, color: c, background: `${c}12` } : {}}
                      onClick={() => setFilterCat(filterCat === cat ? 'all' : cat)}>
                      {getAmenityLabel(cat)} {catCounts[cat] || ''}
                    </button>
                  );
                })}
                <span style={{ marginLeft: 'auto', fontSize: 9, color: textDim, flexShrink: 0 }}>{visible.length} pins</span>
              </div>}

              {/* Empty amenities placeholder */}
              {!loading && amenities.length === 0 && amenityPolygons.length === 0 && (
                <div className="amenity-empty">
                  <div className="amenity-empty__icon">🏗</div>
                  <div className="amenity-empty__text">No amenities mapped yet</div>
                  <div className="amenity-empty__sub">
                    {rpcMeta?.boundary_source === 'dda_plots_union'
                      ? 'Masterplan amenities will be added as the community develops'
                      : 'Amenity data not yet available for this community'}
                  </div>
                </div>
              )}

              {/* Signature amenities horizontal strip */}
              {signatureAmenities.length > 0 && (
                <div style={{ borderBottom: `1px solid ${rowBorder}`, background: panelBg, flexShrink: 0 }}>
                  <div style={{ padding: '4px 12px 0', fontSize: 8, color: goldColor, letterSpacing: 1 }}>★ SIGNATURE AMENITIES</div>
                  <div className="sig-strip">
                    {signatureAmenities.map(sig => {
                      const emoji = SIG_EMOJI[sig.amenity_type] || SIG_EMOJI.default;
                      return (
                        <div key={sig.id} className="sig-card" onClick={() => {
                          setPopupAmenity(sig);
                          mapboxRef.current?.flyTo({ center: [sig.lng, sig.lat], zoom: 17, duration: 800 });
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                            <span style={{ fontSize: 14 }}>{emoji}</span>
                            <span style={{ fontSize: 9, fontWeight: 600, color: textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sig.name}</span>
                          </div>
                          {sig.tagline && <div style={{ fontSize: 7.5, color: textSecondary, lineHeight: 1.3, marginBottom: 3 }}>{sig.tagline}</div>}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 7 }}>
                            <span style={{ color: CAT_COLORS[sig.amenity_type] || textDim, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                              {getAmenityLabel(sig.amenity_type)}
                            </span>
                            {sig.rating != null && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 2, color: goldColor }}>
                                <Star size={8} fill={goldColor} /> {sig.rating.toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Satellite map */}
              <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                {loading && (
                  <div style={{ position: 'absolute', inset: 0, background: isDark ? '#04080ecc' : '#ffffffcc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, zIndex: 60 }}>
                    <Loader2 className="animate-spin" size={30} style={{ color: accentBlue }} />
                    <div style={{ fontSize: 10, color: accentBlue, letterSpacing: 2 }}>FETCHING GIS DATA</div>
                  </div>
                )}

                <MapGL
                  ref={mapboxRef}
                  mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
                  mapStyle={isDark ? 'mapbox://styles/mapbox/satellite-streets-v12' : 'mapbox://styles/mapbox/satellite-v9'}
                  initialViewState={{
                    longitude: selected.centroid_lnglat[0] || 55.27,
                    latitude: selected.centroid_lnglat[1] || 25.07,
                    zoom: 14,
                  }}
                  style={{ width: '100%', height: '100%' }}
                  onLoad={flyToSelected}
                  onZoom={e => setMapZoom(e.viewState.zoom)}
                >
                  {/* Community boundary polygon */}
                  {boundaryGeoJSON && (
                    <Source id="community-boundary" type="geojson" data={boundaryGeoJSON}>
                      <Layer {...fillLayer} />
                      <Layer {...lineLayer} />
                    </Source>
                  )}

                  {/* Amenity polygons — merged at low zoom, individual at high zoom */}
                  {!useIndividualPolygons && mergedPolygonFC && (
                    <Source id="amenity-polygons-merged" type="geojson" data={mergedPolygonFC}>
                      <Layer id="amenity-polygons-merged-fill" type="fill" paint={{
                        'fill-color': ['case', ['==', ['get', 'is_signature'], true], '#C8A84B', '#4ADE80'],
                        'fill-opacity': 0.12,
                      }} />
                      <Layer id="amenity-polygons-merged-line" type="line" paint={{
                        'line-color': '#2d8aff', 'line-width': 0.8, 'line-opacity': 0.4,
                      }} />
                    </Source>
                  )}

                  {useIndividualPolygons && amenityPolygons.map(ap => {
                    const fillColor = getAmenityFillColor(ap.type);
                    const srcId = `amenity-poly-${ap.id}`;
                    return (
                      <Source key={srcId} id={srcId} type="geojson" data={{
                        type: 'Feature' as const, geometry: ap.polygon_geojson,
                        properties: { name: ap.name, type: ap.type, is_signature: ap.is_signature },
                      }}>
                        <Layer id={`${srcId}-fill`} type="fill" paint={{
                          'fill-color': fillColor,
                          'fill-opacity': ap.is_signature ? 0.25 : 0.15,
                        }} />
                        <Layer id={`${srcId}-outline`} type="line" paint={{
                          'line-color': fillColor,
                          'line-width': ap.is_signature ? 1.5 : 0.8,
                          'line-opacity': ap.is_signature ? 0.7 : 0.4,
                        }} />
                      </Source>
                    );
                  })}

                  {/* Clickable centroid markers for polygon amenities (only at high zoom) */}
                  {useIndividualPolygons && amenityPolygons.map(ap => (
                    <Marker key={`centroid-${ap.id}`} longitude={ap.centroid_lnglat[0]} latitude={ap.centroid_lnglat[1]} anchor="center"
                      onClick={e => {
                        e.originalEvent.stopPropagation();
                        setPopupAmenity({
                          id: Number(ap.id) || 0, name: ap.name,
                          amenity_type: ap.type, amenity_category: ap.category,
                          is_operational: true, is_signature: ap.is_signature,
                          tagline: ap.tagline, lifecycle_stage: 'operational',
                          source: '', rating: null, render_as: 'polygon',
                          area_sqm: ap.area_sqm,
                          lat: ap.centroid_lnglat[1], lng: ap.centroid_lnglat[0],
                        });
                      }}>
                      <div style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: getAmenityFillColor(ap.type),
                        border: '1px solid rgba(0,0,0,0.2)', opacity: 0.6, cursor: 'pointer',
                      }} />
                    </Marker>
                  ))}

                  {/* Point-only amenity markers (skip polygon-rendered ones) */}
                  {visible.filter(a => a.render_as !== 'polygon').map(a => {
                    const cat = a.amenity_type || a.amenity_category || 'default';
                    const color = CAT_COLORS[cat] || CAT_COLORS.default;
                    const isPlanned = a.lifecycle_stage === 'planned';
                    const isSig = a.is_signature;

                    const pinStyle: React.CSSProperties = isSig
                      ? { width: 18, height: 18, borderRadius: '50%', background: color, border: `2px solid ${goldColor}`, boxShadow: `0 0 12px ${goldColor}80, 0 0 4px ${goldColor}40`, cursor: 'pointer', transition: 'transform .15s' }
                      : isPlanned
                        ? { width: 9, height: 9, borderRadius: '50%', background: 'transparent', border: `2px dashed ${color}80`, opacity: 0.6, cursor: 'pointer', transition: 'transform .15s' }
                        : { width: 12, height: 12, borderRadius: '50%', background: a.is_operational ? color : '#4a6a8a', border: '2px solid #fff', boxShadow: `0 0 8px ${color}cc, 0 1px 4px #0008`, cursor: 'pointer', transition: 'transform .15s' };

                    return (
                      <Marker key={a.id} longitude={a.lng} latitude={a.lat} anchor="center"
                        onClick={e => { e.originalEvent.stopPropagation(); setPopupAmenity(a); }}>
                        <div style={pinStyle}
                          onMouseEnter={e => { (e.target as HTMLElement).style.transform = 'scale(1.4)'; }}
                          onMouseLeave={e => { (e.target as HTMLElement).style.transform = 'scale(1)'; }}
                        />
                      </Marker>
                    );
                  })}

                  {/* Popup with extended fields */}
                  {popupAmenity && (
                    <Popup longitude={popupAmenity.lng} latitude={popupAmenity.lat} anchor="bottom" offset={14}
                      onClose={() => setPopupAmenity(null)} closeButton={false}>
                      <div style={{ minWidth: 180 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: textPrimary }}>{popupAmenity.name}</div>
                          {popupAmenity.is_signature && <span style={{ fontSize: 7, background: `${goldColor}20`, color: goldColor, padding: '1px 5px', borderRadius: 2, letterSpacing: 0.5 }}>★ SIGNATURE</span>}
                        </div>
                        {popupAmenity.tagline && <div style={{ fontSize: 8.5, color: textSecondary, marginBottom: 5, lineHeight: 1.4 }}>{popupAmenity.tagline}</div>}
                        <div style={{ display: 'flex', gap: 8, fontSize: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span style={{ color: CAT_COLORS[popupAmenity.amenity_type || popupAmenity.amenity_category] || textDim, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {getAmenityLabel(popupAmenity.amenity_type || popupAmenity.amenity_category)}
                          </span>
                          <span style={{ color: popupAmenity.is_operational ? '#10b981' : '#ef4444' }}>
                            {popupAmenity.is_operational ? '● Operational' : '○ Pending'}
                          </span>
                          {popupAmenity.lifecycle_stage && popupAmenity.lifecycle_stage !== 'operational' && (
                            <span style={{ color: textDim, fontStyle: 'italic' }}>{popupAmenity.lifecycle_stage}</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 8, fontSize: 7, alignItems: 'center' }}>
                          {popupAmenity.rating != null && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 2, color: goldColor }}>
                              <Star size={8} fill={goldColor} /> {popupAmenity.rating.toFixed(1)}
                            </span>
                          )}
                          {popupAmenity.source && (
                            <span style={{ background: isDark ? '#1a2a3e' : '#e8ecf0', padding: '1px 5px', borderRadius: 2, color: textDim }}>
                              {SOURCE_LABELS[popupAmenity.source] || popupAmenity.source}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 7, color: textDim, marginTop: 4 }}>
                          {popupAmenity.lat.toFixed(5)}°N, {popupAmenity.lng.toFixed(5)}°E
                          {popupAmenity.area_sqm ? ` · ${formatArea(popupAmenity.area_sqm)}` : ''}
                        </div>
                      </div>
                    </Popup>
                  )}
                </MapGL>

                {/* Community title overlay */}
                <div style={{ position: 'absolute', top: 12, left: 12, pointerEvents: 'none', animation: 'slideIn .4s ease', zIndex: 10 }}>
                  <div style={{
                    fontFamily: "'Barlow Condensed',sans-serif", fontSize: 24, fontWeight: 800, color: '#fff',
                    letterSpacing: 2, textShadow: '0 2px 12px #000, 0 0 40px #00000090',
                  }}>
                    {selected.display_name.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,.55)', letterSpacing: 1, marginTop: 2, textShadow: '0 1px 6px #000' }}>
                    {rpcMeta ? `${SOURCE_LABELS[rpcMeta.boundary_source] || rpcMeta.boundary_source} · ${rpcMeta.area_sqkm.toFixed(1)} km²` : ''}
                  </div>
                </div>

                {/* Geo bounds */}
                {selected.bbox[0] !== 0 && (
                  <div style={{
                    position: 'absolute', bottom: 10, left: 12, background: overlayBg,
                    border: `1px solid ${borderC}30`, borderRadius: 3, padding: '4px 8px', backdropFilter: 'blur(8px)', pointerEvents: 'none', zIndex: 10,
                  }}>
                    <div style={{ fontSize: 7, color: isDark ? '#8ab' : textDim }}>
                      {selected.bbox[3].toFixed(4)}°N–{selected.bbox[1].toFixed(4)}°N · {selected.bbox[0].toFixed(4)}°E–{selected.bbox[2].toFixed(4)}°E
                    </div>
                  </div>
                )}

                {/* Legend */}
                {categories.length > 0 && (
                  <div style={{
                    position: 'absolute', bottom: 10, right: 12, background: overlayBg,
                    border: `1px solid ${borderC}50`, borderRadius: 4, padding: '8px 10px', backdropFilter: 'blur(8px)', maxWidth: 180, zIndex: 10,
                  }}>
                    <div style={{ fontSize: 7.5, color: isDark ? '#8ab' : textDim, letterSpacing: 1, marginBottom: 5 }}>CATEGORIES</div>
                    {categories.slice(0, 10).map(cat => {
                      const c = CAT_COLORS[cat] || CAT_COLORS.default;
                      return (
                        <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3, cursor: 'pointer' }}
                          onClick={() => setFilterCat(filterCat === cat ? 'all' : cat)}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: c, boxShadow: `0 0 4px ${c}80`, flexShrink: 0 }} />
                          <span style={{ fontSize: 7.5, color: filterCat === cat ? c : textSecondary, transition: 'color .15s' }}>{getAmenityLabel(cat)}</span>
                          <span style={{ fontSize: 7.5, color: textDim, marginLeft: 'auto' }}>{catCounts[cat] || 0}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
