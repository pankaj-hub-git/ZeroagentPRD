import { useState, useEffect, useMemo, useRef } from 'react';
import { useTheme } from '@/lib/theme';
import { bronze, layers } from '@/lib/supabase';
import { Loader2, Search, Sun, Moon } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>;

interface Community {
  community_key: string;
  community_name: string;
  developer: string;
  image_url: string;
  bbox_west: number;
  bbox_south: number;
  bbox_east: number;
  bbox_north: number;
  amenity_count: number;
  source_confidence: string;
}

interface Amenity {
  id: number;
  name: string;
  amenity_type: string;
  amenity_category: string;
  is_operational: boolean;
  lat: number;
  lng: number;
}

// Pre-seeded from bronze.masterplan_images
const SEED_COMMUNITIES: Community[] = [
  { community_key:"DUBAI HILLS", community_name:"Dubai Hills Estate", developer:"DUBAI HILLS ESTATE L.L.C", image_url:"https://static.propsearch.ae/dubai-locations/dubai-hills-estate_xl.jpg", bbox_west:55.236189, bbox_south:25.087349, bbox_east:55.277942, bbox_north:25.136933, amenity_count:92, source_confidence:"HIGH" },
  { community_key:"ARABIAN RANCHES I", community_name:"Arabian Ranches I", developer:"EMAAR PROPERTIES (P.J.S.C)", image_url:"https://static.propsearch.ae/dubai-locations/arabian-ranches-28500.jpg", bbox_west:55.250398, bbox_south:25.037445, bbox_east:55.29957, bbox_north:25.062819, amenity_count:39, source_confidence:"HIGH" },
  { community_key:"ARABIAN RANCHES III", community_name:"Arabian Ranches III", developer:"EMAAR DEVELOPMENT P.J.S.C.", image_url:"https://static.propsearch.ae/dubai-locations/arabian-ranches-3_xl.jpg", bbox_west:55.31533, bbox_south:25.059215, bbox_east:55.337403, bbox_north:25.077462, amenity_count:30, source_confidence:"HIGH" },
  { community_key:"DAMAC HILLS", community_name:"DAMAC Hills", developer:"DAMAC CRESCENT PROPERTIES", image_url:"https://static.propsearch.ae/dubai-locations/damac-hills_xl.jpg", bbox_west:55.242079, bbox_south:25.008587, bbox_east:55.265974, bbox_north:25.033761, amenity_count:15, source_confidence:"HIGH" },
  { community_key:"TOWN SQUARE", community_name:"Town Square", developer:"NSHAMA PROPERTIES", image_url:"https://static.propsearch.ae/dubai-locations/town-square-24502_xl.jpg", bbox_west:55.275324, bbox_south:24.991579, bbox_east:55.304492, bbox_north:25.017763, amenity_count:13, source_confidence:"HIGH" },
  { community_key:"MUDON", community_name:"Mudon", developer:"DUBAI LAND RESIDENCES (L.L.C)", image_url:"https://static.propsearch.ae/dubai-locations/mudon_xl.jpg", bbox_west:55.251654, bbox_south:25.004784, bbox_east:55.278357, bbox_north:25.02942, amenity_count:10, source_confidence:"MEDIUM" },
  { community_key:"DUBAI SPORTS CITY", community_name:"Dubai Sports City", developer:"DUBAI SPORTS CITY (L.L.C)", image_url:"https://static.propsearch.ae/photos/dubai/areas/sports-city-75.jpg", bbox_west:55.202921, bbox_south:25.024351, bbox_east:55.229903, bbox_north:25.049187, amenity_count:10, source_confidence:"HIGH" },
  { community_key:"VILLANOVA", community_name:"Villanova", developer:"NORTH DUBAILAND PROJECTS L.L.C", image_url:"https://static.propsearch.ae/dubai-locations/villanova_xl.jpg", bbox_west:55.338503, bbox_south:25.066744, bbox_east:55.368231, bbox_north:25.083394, amenity_count:8, source_confidence:"MEDIUM" },
  { community_key:"DAMAC LAGOONS", community_name:"DAMAC Lagoons", developer:"ISLAND OASIS PROPERTIES", image_url:"https://static.propsearch.ae/dubai-locations/damac-lagoons_xl.jpg", bbox_west:55.218984, bbox_south:24.999364, bbox_east:55.248812, bbox_north:25.022276, amenity_count:6, source_confidence:"HIGH" },
  { community_key:"FALCON CITY OF WONDERS", community_name:"Falconcity of Wonders", developer:"FALCONCITY OF WONDERS L.L.C", image_url:"https://static.propsearch.ae/dubai-locations/falcon-city-of-wonders_xl.jpg", bbox_west:55.333535, bbox_south:25.084923, bbox_east:55.358223, bbox_north:25.107722, amenity_count:3, source_confidence:"MEDIUM" },
  { community_key:"DUBAI CREEK HARBOUR", community_name:"Dubai Creek Harbour", developer:"DUBAI CREEK HARBOUR L.L.C", image_url:"https://static.propsearch.ae/dubai-locations/dubai-creek-harbour_xl.jpg", bbox_west:55.33931, bbox_south:25.186818, bbox_east:55.369109, bbox_north:25.211093, amenity_count:2, source_confidence:"HIGH" },
  { community_key:"NAD AL SHEBA GARDENS", community_name:"Nad Al Sheba Gardens", developer:"SHAMAL ESTATES L.L.C", image_url:"https://static.propsearch.ae/dubai-locations/nad-al-sheba-gardens_xl.jpg", bbox_west:55.289687, bbox_south:25.130445, bbox_east:55.323611, bbox_north:25.141787, amenity_count:2, source_confidence:"MEDIUM" },
  { community_key:"DAMAC HILLS 2", community_name:"DAMAC Hills 2 (Akoya)", developer:"FRONT LINE INVESTMENT MANAGEMENT L.L.C", image_url:"https://static.propsearch.ae/dubai-locations/damac-hills-2_xl.jpg", bbox_west:55.369304, bbox_south:24.975749, bbox_east:55.39947, bbox_north:24.999317, amenity_count:1, source_confidence:"HIGH" },
  { community_key:"TILAL AL GHAF", community_name:"Tilal Al Ghaf", developer:"MAJID AL FUTTAIM TILAL AL GHAF DEV", image_url:"https://static.propsearch.ae/dubai-locations/tilal-al-ghaf_5FEW5_xl.jpg", bbox_west:55.211793, bbox_south:25.014085, bbox_east:55.23727, bbox_north:25.033641, amenity_count:0, source_confidence:"HIGH" },
  { community_key:"DAMAC ISLANDS", community_name:"DAMAC Islands", developer:"DAMAC ELITE INVESTMENT CO. L.L.C", image_url:"https://static.propsearch.ae/dubai-locations/damac-islands_SnAAq_xl.jpg", bbox_west:55.287678, bbox_south:25.021624, bbox_east:55.316288, bbox_north:25.041841, amenity_count:0, source_confidence:"HIGH" },
  { community_key:"THE VALLEY", community_name:"The Valley", developer:"EMAAR DEVELOPMENT P.J.S.C.", image_url:"https://static.propsearch.ae/dubai-locations/the-valley_ivMDh_xl.jpg", bbox_west:55.421864, bbox_south:24.995564, bbox_east:55.460501, bbox_north:25.024325, amenity_count:0, source_confidence:"HIGH" },
];

const CAT_COLORS: Record<string, string> = {
  park: '#22c55e', restaurant: '#f97316', retail: '#a855f7', school: '#3b82f6',
  mosque: '#10b981', gym: '#ef4444', clinic: '#06b6d4', supermarket: '#eab308',
  hospital: '#ec4899', transport: '#64748b', leisure: '#f59e0b',
  entertainment: '#a855f7', recreation: '#22c55e', promenade: '#ec4899',
  lagoon: '#06b6d4', default: '#94a3b8',
};

function toPercent(lat: number, lng: number, c: Community) {
  return {
    x: ((lng - c.bbox_west) / (c.bbox_east - c.bbox_west)) * 100,
    y: ((c.bbox_north - lat) / (c.bbox_north - c.bbox_south)) * 100,
  };
}

export function SatellitePage() {
  const { colors, mode, toggle } = useTheme();
  const isDark = mode === 'dark';

  const [communities, setCommunities] = useState<Community[]>(SEED_COMMUNITIES);
  const [selected, setSelected] = useState<Community | null>(null);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [loading, setLoading] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [status, setStatus] = useState('Select a community');
  const [hovered, setHovered] = useState<Amenity | null>(null);
  const [filterCat, setFilterCat] = useState('all');
  const [filterOp, setFilterOp] = useState('all');
  const [search, setSearch] = useState('');
  const mapRef = useRef<HTMLDivElement>(null);

  // Refresh community list from live DB
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await bronze().from('masterplan_images')
          .select('community_key, community_name, developer, image_url, bbox_west, bbox_south, bbox_east, bbox_north, source_confidence')
          .order('community_name', { ascending: true });
        if (error) {
          console.error('[Satellite] masterplan_images:', error.message);
          return;
        }
        if (data?.length) {
          setCommunities(data.map((d: R) => ({
            community_key: d.community_key || '',
            community_name: d.community_name || '',
            developer: d.developer || '',
            image_url: d.image_url || '',
            source_confidence: d.source_confidence || 'MEDIUM',
            bbox_west: Number(d.bbox_west), bbox_south: Number(d.bbox_south),
            bbox_east: Number(d.bbox_east), bbox_north: Number(d.bbox_north),
            amenity_count: 0,
          })));
        }
      } catch (e) {
        console.error('[Satellite] Failed to load communities:', e);
      }
    })();
  }, []);

  const loadCommunity = async (com: Community) => {
    setSelected(com);
    setAmenities([]);
    setImgLoaded(false);
    setLoading(true);
    setFilterCat('all');
    setFilterOp('all');
    setStatus('Fetching amenities...');

    try {
      // Try loading amenities from layers.amenities using bbox filter
      // The table has lat/lng columns extracted from geometry
      const { data, error } = await layers().from('amenities')
        .select('id, name, amenity_type, amenity_category, is_operational, lat, lng')
        .gte('lat', com.bbox_south)
        .lte('lat', com.bbox_north)
        .gte('lng', com.bbox_west)
        .lte('lng', com.bbox_east)
        .order('amenity_type', { ascending: true })
        .limit(300);

      if (error) {
        console.error('[Satellite] amenities query error:', error.message);
        setStatus(`${com.amenity_count} amenities (seed) · ${com.community_name}`);
      } else {
        const amenityData = (data || []).map((a: R) => ({
          id: a.id,
          name: a.name || 'Unknown',
          amenity_type: a.amenity_type || '',
          amenity_category: a.amenity_category || '',
          is_operational: a.is_operational ?? true,
          lat: Number(a.lat),
          lng: Number(a.lng),
        }));
        setAmenities(amenityData);
        setStatus(`${amenityData.length} amenities · ${com.community_name}`);
      }
    } catch (e) {
      console.error('[Satellite] Failed to load amenities:', e);
      setStatus(`${com.amenity_count} amenities (seed) · ${com.community_name}`);
    }
    setLoading(false);
  };

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
      c.community_name.toLowerCase().includes(search.toLowerCase()) ||
      c.developer?.toLowerCase().includes(search.toLowerCase())
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

  // Theme-adaptive colors
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
  const tooltipBg = isDark ? '#07080d' : '#ffffff';

  return (
    <div style={{ fontFamily: "'JetBrains Mono','Courier New',monospace", background: bg, color: textSecondary, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600;700&family=Barlow+Condensed:wght@600;700;800&display=swap'); @keyframes pinDrop{from{transform:translate(-50%,-50%) scale(0) rotate(20deg);opacity:0}to{transform:translate(-50%,-50%) scale(1) rotate(0);opacity:1}} @keyframes ringPulse{0%{transform:translate(-50%,-50%) scale(1);opacity:.7}100%{transform:translate(-50%,-50%) scale(3);opacity:0}} @keyframes spin{to{transform:rotate(360deg)}} @keyframes slideIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}} .sat-crow{display:flex;align-items:center;gap:10px;padding:8px 12px;cursor:pointer;border-bottom:1px solid ${rowBorder};transition:background .12s} .sat-crow:hover,.sat-crow.sel{background:${isDark ? '#0b1728' : '#f0f6ff'}} .sat-chip{background:transparent;border:1px solid ${borderC};color:${textDim};font-family:inherit;font-size:8px;letter-spacing:1px;padding:3px 9px;border-radius:2px;cursor:pointer;transition:all .15s;white-space:nowrap} .sat-chip.on{background:${accentBlue}12;border-color:${accentBlue};color:${accentBlue}} .sat-chip:hover:not(.on){border-color:${isDark ? '#243a52' : '#c0c8d0'};color:${isDark ? '#5a7a9a' : '#475569'}}`}</style>

      {/* Header */}
      <div style={{ background: headerBg, borderBottom: `1px solid ${borderC}`, height: 46, display: 'flex', alignItems: 'center', padding: '0 18px', gap: 14, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: selected ? accentBlue : borderC, boxShadow: selected ? `0 0 10px ${accentBlue}80` : 'none', transition: 'all .4s' }} />
          <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 16, fontWeight: 800, color: textPrimary, letterSpacing: 3 }}>MASTERPLAN OVERLAY</span>
          <span style={{ color: borderC }}>·</span>
          <span style={{ fontSize: 9, color: textDim, letterSpacing: 1.5 }}>GIS VERIFICATION</span>
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
        {/* Theme toggle */}
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
          {/* Search */}
          <div style={{ padding: '10px 10px 8px', borderBottom: `1px solid ${rowBorder}` }}>
            <div style={{ position: 'relative' }}>
              <Search size={11} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: textDim, pointerEvents: 'none' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search communities..."
                style={{ background: dotBg, border: `1px solid ${borderC}`, color: textPrimary, fontFamily: 'inherit', fontSize: 10, padding: '6px 8px 6px 28px', borderRadius: 3, outline: 'none', width: '100%' }}
              />
            </div>
          </div>

          {/* Count */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 12px', borderBottom: `1px solid ${rowBorder}` }}>
            <span style={{ fontSize: 8, color: textDim, letterSpacing: 1 }}>WITH GIS DATA</span>
            <span style={{ fontSize: 8, color: accentBlue }}>{communities.filter(c => c.amenity_count > 0).length}</span>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredComs.map(com => {
              const has = com.amenity_count > 0;
              const sel = selected?.community_key === com.community_key;
              return (
                <div key={com.community_key} className={`sat-crow${sel ? ' sel' : ''}`} onClick={() => loadCommunity(com)} style={{ opacity: has ? 1 : 0.4 }}>
                  <div style={{ width: 42, height: 30, borderRadius: 2, overflow: 'hidden', flexShrink: 0, border: `1px solid ${sel ? accentBlue + '40' : rowBorder}`, background: dotBg, position: 'relative' }}>
                    <img src={com.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.opacity = '0'; }} />
                    {sel && <div style={{ position: 'absolute', inset: 0, border: `2px solid ${accentBlue}60`, borderRadius: 2 }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: sel ? accentBlue : has ? textPrimary : textDim, fontWeight: sel ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {com.community_name}
                    </div>
                    <div style={{ fontSize: 7.5, color: textDim, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {com.developer?.split(' ').slice(0, 3).join(' ')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 14, fontWeight: 700, color: has ? '#10b981' : borderC }}>{com.amenity_count}</div>
                    <div style={{ fontSize: 6.5, color: borderC, letterSpacing: 0.5 }}>AMENS</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* DB source */}
          <div style={{ padding: '8px 12px', borderTop: `1px solid ${rowBorder}`, fontSize: 7.5, color: textDim, lineHeight: 1.7 }}>
            <div style={{ color: textDim }}>SOURCE · bronze.masterplan_images</div>
            <div>CDN · static.propsearch.ae</div>
            <div>BOUNDS · georectified bbox per community</div>
          </div>
        </div>

        {/* Main panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selected ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, opacity: 0.5 }}>
              <div style={{ fontSize: 56, lineHeight: 1 }}>{'⬡'}</div>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 20, fontWeight: 800, color: textDim, letterSpacing: 4 }}>SELECT A COMMUNITY</div>
              <div style={{ fontSize: 10, color: textDim }}>{communities.filter(c => c.amenity_count > 0).length} communities with live GIS data ready</div>
            </div>
          ) : (
            <>
              {/* Filter bar */}
              <div style={{ padding: '6px 12px', borderBottom: `1px solid ${rowBorder}`, display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap', background: panelBg, flexShrink: 0 }}>
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
                      {cat} {catCounts[cat] || ''}
                    </button>
                  );
                })}
                <div style={{ marginLeft: 'auto', fontSize: 9, color: textDim, flexShrink: 0 }}>
                  {visible.length} pins shown
                </div>
              </div>

              {/* Map */}
              <div ref={mapRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', background: isDark ? '#04080e' : '#e8ecf0', cursor: 'default' }}
                onClick={() => setHovered(null)}>
                {/* Spinner */}
                {loading && (
                  <div style={{ position: 'absolute', inset: 0, background: isDark ? '#04080ecc' : '#ffffffcc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, zIndex: 60 }}>
                    <Loader2 className="animate-spin" size={30} style={{ color: accentBlue }} />
                    <div style={{ fontSize: 10, color: accentBlue, letterSpacing: 2 }}>FETCHING GIS DATA</div>
                  </div>
                )}

                {/* Masterplan image */}
                <img
                  src={selected.image_url}
                  alt={selected.community_name}
                  onLoad={() => setImgLoaded(true)}
                  onError={() => setImgLoaded(true)}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', opacity: imgLoaded ? 1 : 0, transition: 'opacity .5s' }}
                />

                {/* Pins */}
                {imgLoaded && visible.map((a, idx) => {
                  const { x, y } = toPercent(a.lat, a.lng, selected);
                  if (x < -1 || x > 101 || y < -1 || y > 101) return null;
                  const cat = a.amenity_type || a.amenity_category || 'default';
                  const color = CAT_COLORS[cat] || CAT_COLORS.default;
                  const dotColor = a.is_operational ? color : '#4a6a8a';
                  const isHov = hovered?.id === a.id;

                  return (
                    <div key={a.id}
                      style={{
                        position: 'absolute', left: `${x}%`, top: `${y}%`, zIndex: isHov ? 50 : 10, cursor: 'pointer',
                        animation: `pinDrop .3s cubic-bezier(.34,1.56,.64,1) ${Math.min(idx, 30) * 15}ms both`,
                      }}
                      onMouseEnter={e => { e.stopPropagation(); setHovered(a); }}
                      onMouseLeave={() => setHovered(null)}
                      onClick={e => e.stopPropagation()}>
                      {/* Pulse ring */}
                      {a.is_operational && (
                        <div style={{
                          position: 'absolute', width: 10, height: 10, left: '50%', top: '50%', borderRadius: '50%',
                          border: `1.5px solid ${color}`, animation: 'ringPulse 2.2s ease-out infinite',
                        }} />
                      )}
                      {/* Dot */}
                      <div style={{
                        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
                        width: isHov ? 13 : a.is_operational ? 9 : 7,
                        height: isHov ? 13 : a.is_operational ? 9 : 7,
                        borderRadius: '50%', background: dotColor,
                        border: `${isHov ? 2 : 1.5}px solid ${a.is_operational ? '#fff' : '#2a3a4a'}`,
                        boxShadow: isHov ? `0 0 14px ${dotColor},0 0 6px #000` : a.is_operational ? `0 0 5px ${dotColor}70` : 'none',
                        transition: 'all .15s',
                      }} />

                      {/* Tooltip */}
                      {isHov && (
                        <div style={{
                          position: 'absolute', bottom: 'calc(100% + 10px)', left: '50%', transform: 'translateX(-50%)',
                          background: tooltipBg, border: `1px solid ${color}60`,
                          borderRadius: 4, padding: '8px 12px', whiteSpace: 'nowrap',
                          pointerEvents: 'none', animation: 'slideIn .1s ease',
                          boxShadow: `0 6px 24px ${isDark ? '#000c' : '#0003'}, 0 0 0 1px ${color}20`,
                          minWidth: 160,
                        }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: textPrimary, marginBottom: 5 }}>{a.name}</div>
                          <div style={{ display: 'flex', gap: 10 }}>
                            <span style={{ fontSize: 8, color, letterSpacing: 0.5, textTransform: 'uppercase' }}>{cat}</span>
                            <span style={{ fontSize: 8, color: a.is_operational ? '#10b981' : '#ef4444' }}>
                              {a.is_operational ? '● Operational' : '○ Not yet'}
                            </span>
                          </div>
                          <div style={{ fontSize: 7.5, color: textDim, marginTop: 4 }}>
                            {a.lat?.toFixed(5)}°N, {a.lng?.toFixed(5)}°E
                          </div>
                          <div style={{
                            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                            width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
                            borderTop: `6px solid ${color}60`,
                          }} />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Community title overlay */}
                {imgLoaded && (
                  <div style={{ position: 'absolute', top: 12, left: 12, pointerEvents: 'none', animation: 'slideIn .4s ease' }}>
                    <div style={{
                      fontFamily: "'Barlow Condensed',sans-serif", fontSize: 24, fontWeight: 800, color: '#fff',
                      letterSpacing: 2, textShadow: '0 2px 12px #000, 0 0 40px #00000090',
                    }}>
                      {selected.community_name.toUpperCase()}
                    </div>
                    <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,.55)', letterSpacing: 1, marginTop: 2, textShadow: '0 1px 6px #000' }}>
                      {selected.developer} · {selected.source_confidence} CONFIDENCE
                    </div>
                  </div>
                )}

                {/* Geo bounds */}
                {imgLoaded && (
                  <div style={{
                    position: 'absolute', bottom: 10, left: 12, background: overlayBg,
                    border: `1px solid ${borderC}30`, borderRadius: 3, padding: '4px 8px', backdropFilter: 'blur(8px)', pointerEvents: 'none',
                  }}>
                    <div style={{ fontSize: 7, color: textDim }}>
                      {selected.bbox_north.toFixed(4)}°N–{selected.bbox_south.toFixed(4)}°N · {selected.bbox_west.toFixed(4)}°E–{selected.bbox_east.toFixed(4)}°E
                    </div>
                  </div>
                )}

                {/* Legend */}
                {imgLoaded && categories.length > 0 && (
                  <div style={{
                    position: 'absolute', bottom: 10, right: 12, background: overlayBg,
                    border: `1px solid ${borderC}50`, borderRadius: 4, padding: '8px 10px', backdropFilter: 'blur(8px)', maxWidth: 170,
                  }}>
                    <div style={{ fontSize: 7.5, color: textDim, letterSpacing: 1, marginBottom: 5 }}>CATEGORIES</div>
                    {categories.slice(0, 10).map(cat => {
                      const c = CAT_COLORS[cat] || CAT_COLORS.default;
                      return (
                        <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3, cursor: 'pointer' }}
                          onClick={() => setFilterCat(filterCat === cat ? 'all' : cat)}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: c, boxShadow: `0 0 4px ${c}80`, flexShrink: 0 }} />
                          <span style={{ fontSize: 7.5, color: filterCat === cat ? c : textSecondary, transition: 'color .15s' }}>{cat}</span>
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
