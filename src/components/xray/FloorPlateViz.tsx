import { useState, useMemo } from 'react';
import { useTheme } from '@/lib/theme';
import { MONO, Tag, Divider, VIEW_QUALITY_COLOR } from './Atoms';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>;

const fmt = (n: number | string | null | undefined): string => n ? Number(n).toLocaleString('en-AE') : '—';
const fmtM = (n: number | null | undefined): string => {
  if (!n) return '—';
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : fmt(n);
};

/** Layout units into grid positions based on building shape type */
function getUnitLayout(units: R[], shapeType?: string) {
  const n = units.length;
  if (!n) return [];

  // Adjust grid based on shape type
  let cols: number;
  switch (shapeType) {
    case 'curved': cols = n <= 3 ? n : n <= 6 ? 3 : 4; break;
    case 'l_shaped': cols = n <= 3 ? n : 3; break;
    case 'tri_wing':
    case 'y_shaped': cols = n <= 3 ? n : 3; break;
    case 'diamond': cols = n <= 2 ? 2 : n <= 6 ? 3 : 4; break;
    default: cols = n <= 4 ? 2 : n <= 9 ? 3 : 4;
  }

  const rows = Math.ceil(n / cols);
  const cellW = 88 / cols;
  const cellH = 82 / rows;
  return units.map((u, i) => ({
    ...u,
    _x: 6 + (i % cols) * cellW,
    _y: 6 + Math.floor(i / cols) * cellH,
    _w: cellW - 2,
    _h: cellH - 2,
  }));
}

/** Confidence badge */
function ConfBadge({ confidence }: { confidence?: string }) {
  const { colors } = useTheme();
  if (confidence === 'verified') return <span style={{ fontSize: 8, color: colors.green }}>● VERIFIED</span>;
  if (confidence === 'inferred') return <span style={{ fontSize: 8, color: colors.amber }}>● INFERRED</span>;
  return <span style={{ fontSize: 8, color: colors.coral }}>● ESTIMATED</span>;
}

export function FloorPlateViz({
  floorUnits, allUnits, floors, buildings, selectedFloor, selectedBuilding,
  onFloorChange, onBuildingChange, buildingShape, surroundings, floorPricing,
}: {
  floorUnits: R[]; allUnits: R[]; floors: string[]; buildings: string[];
  selectedFloor: string | null; selectedBuilding: string | null;
  onFloorChange: (f: string) => void; onBuildingChange: (b: string) => void;
  buildingShape?: R; surroundings?: R[]; floorPricing?: R[];
}) {
  const { colors } = useTheme();
  const vqColors = VIEW_QUALITY_COLOR(colors);
  const [hovered, setHovered] = useState<R | null>(null);

  const typeColor: Record<string, string> = {
    '1 B/R': colors.blue, '2 B/R': colors.indigo, '3 B/R': colors.amber,
    '4 B/R': colors.green, '5 B/R': colors.coral, 'Studio': colors.textSecondary,
  };

  const surrTypeColor: Record<string, string> = {
    premium: colors.gold, positive: colors.green, mixed: colors.blue,
    neutral: colors.muted, caution: colors.amber, negative: colors.coral,
  };

  const shapeType = buildingShape?.shape_type;
  const shapeOutline = buildingShape?.svg_outline_path;
  const laid = useMemo(() => getUnitLayout(floorUnits, shapeType), [floorUnits, shapeType]);

  // Floor band for pricing cross-reference
  const floorNum = parseInt(selectedFloor || '0');
  const band = floorNum <= 10 ? '1-10' : floorNum <= 20 ? '11-20' : floorNum <= 30 ? '21-30' : floorNum <= 40 ? '31-40' : floorNum <= 50 ? '41-50' : floorNum <= 60 ? '51-60' : '60+';
  const bandPricing = (floorPricing || []).filter(fp => fp.floor_band === band);

  function getUnitPricing(unit: R) {
    if (!floorPricing?.length) return null;
    const fn = parseInt(unit.floor);
    if (isNaN(fn)) return null;
    const b = fn <= 10 ? '1-10' : fn <= 20 ? '11-20' : fn <= 30 ? '21-30' : fn <= 40 ? '31-40' : fn <= 50 ? '41-50' : fn <= 60 ? '51-60' : '60+';
    const label = unit.bedrooms != null ? `${unit.bedrooms} B/R` : unit.unit_type_name;
    const pricing = floorPricing.find(fp => (fp.rooms_en === label || fp.rooms_en === unit.unit_type_name) && fp.floor_band === b);
    if (!pricing) return null;
    const area = unit.total_sqft || 0;
    return {
      avgPsf: pricing.avg_psf, minPsf: pricing.min_psf, maxPsf: pricing.max_psf,
      estPrice: Math.round(pricing.avg_psf * area / 1000) * 1000,
      txnCount: pricing.txn_count, confidence: pricing.confidence, floorBand: b,
    };
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Tag color={colors.green}>GOVERNMENT DATA</Tag>
        {shapeType && <Tag color={colors.gold}>{shapeType.replace(/_/g, ' ').toUpperCase()}</Tag>}
        <span style={{ fontSize: 9, color: colors.textDim, fontFamily: MONO }}>
          {allUnits.length} units · {floors.length} floors
          {buildings.length > 1 ? ` · ${buildings.length} buildings` : ''}
        </span>
      </div>

      {/* Building selector */}
      {buildings.length > 1 && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
          {buildings.map(b => (
            <button key={b} onClick={() => onBuildingChange(b)} style={{
              padding: '5px 12px', borderRadius: 4, fontSize: 10, fontWeight: 700, cursor: 'pointer',
              fontFamily: MONO, letterSpacing: 0.5,
              background: selectedBuilding === b ? colors.goldBg : colors.cardBg,
              border: `1px solid ${selectedBuilding === b ? colors.gold : colors.border}`,
              color: selectedBuilding === b ? colors.gold : colors.textSecondary,
            }}>
              {/* Shape badge next to building name */}
              BLDG {b}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        {/* Floor selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', minWidth: 36 }}>
          <div style={{ fontSize: 8, color: colors.textDim, fontFamily: MONO, marginBottom: 4 }}>FLOOR</div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 420 }}>
            {[...floors].reverse().map(f => (
              <button key={f} onClick={() => onFloorChange(f)} style={{
                width: 34, padding: '3px 0', fontSize: 9, fontFamily: MONO,
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
            {/* Building outline as faint background */}
            {shapeOutline && (
              <g opacity={0.12}>
                <path d={shapeOutline} fill={colors.gold} stroke={colors.gold} strokeWidth={0.3}
                  transform="translate(3, 2) scale(1, 0.9)" />
              </g>
            )}

            {/* Compass directions from surroundings */}
            {(surroundings || []).filter(s => ['N', 'S', 'E', 'W'].includes(s.direction)).map(s => {
              const pos: Record<string, { x: number; y: number }> = {
                N: { x: 53, y: 4 }, S: { x: 53, y: 92 }, E: { x: 103, y: 47 }, W: { x: 3, y: 47 },
              };
              const p = pos[s.direction] || { x: 53, y: 47 };
              return (
                <text key={s.direction} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
                  fontSize="4" fill={surrTypeColor[s.type] || colors.textDim} fontWeight="700">
                  {s.direction}
                </text>
              );
            })}

            {/* Core */}
            <rect x={46} y={40} width={14} height={14} rx={2}
              fill={colors.elevated} stroke={colors.border} strokeWidth={0.3} />
            <text x={53} y={48} textAnchor="middle" fontSize="3" fill={colors.textDim}>CORE</text>

            {/* Unit cells */}
            {laid.map((u: R) => {
              const vq = u.view_quality as string;
              const fillColor = vqColors[vq as keyof typeof vqColors] || typeColor[`${u.bedrooms} B/R`] || colors.muted;
              const isHov = hovered?.unit_number === u.unit_number;
              return (
                <g key={u.unit_number || u.position_key}
                  onMouseEnter={() => setHovered({ ...u, _pricing: getUnitPricing(u) })}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: 'pointer' }}>
                  <rect x={u._x} y={u._y} width={u._w} height={u._h} rx={1}
                    fill={fillColor + (isHov ? 'FF' : '88')}
                    stroke={isHov ? colors.gold : colors.border} strokeWidth={isHov ? 0.8 : 0.3} />
                  <text x={u._x + u._w / 2} y={u._y + u._h / 2 - 2.5} textAnchor="middle"
                    fontSize="2.5" fontWeight="700" fill={colors.text}>
                    {u.bedrooms != null ? `${u.bedrooms}BR` : u.unit_type_name || '—'}
                  </text>
                  <text x={u._x + u._w / 2} y={u._y + u._h / 2 + 0.5} textAnchor="middle"
                    fontSize="2" fill={colors.textSecondary}>{fmt(u.total_sqft)}sf</text>
                  {u.orientation && (
                    <text x={u._x + u._w / 2} y={u._y + u._h / 2 + 3} textAnchor="middle"
                      fontSize="1.8" fill={colors.gold}>{u.orientation}</text>
                  )}
                  <text x={u._x + u._w / 2} y={u._y + u._h / 2 + 5.5} textAnchor="middle"
                    fontSize="1.8" fill={colors.muted}>{u.unit_number}</text>
                </g>
              );
            })}
            {laid.length === 0 && (
              <text x={53} y={47} textAnchor="middle" fontSize="4" fill={colors.textDim}>
                No units on this floor
              </text>
            )}
          </svg>

          {/* Hover tooltip */}
          {hovered && (
            <div style={{
              position: 'absolute', top: 8, right: 8, background: colors.surface,
              border: `1px solid ${colors.gold}`, borderRadius: 8, padding: 12,
              minWidth: 240, boxShadow: `0 4px 20px ${colors.bg}88`, zIndex: 10,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6 }}>
                Unit {hovered.unit_number} · {hovered.bedrooms != null ? `${hovered.bedrooms} BR` : hovered.unit_type_name}
              </div>
              <div style={{ fontSize: 10, color: colors.textSecondary, marginBottom: 4 }}>
                Floor {hovered.floor} · {fmt(hovered.total_sqft)} sqft
                {hovered.suite_sqft ? ` (${fmt(hovered.suite_sqft)} suite + ${fmt(hovered.balcony_sqft)} balcony)` : ''}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 6, fontSize: 10 }}>
                {hovered.orientation && <div><span style={{ color: colors.muted }}>Orient: </span><span style={{ color: colors.gold }}>{hovered.orientation}</span></div>}
                {hovered.view_type && <div><span style={{ color: colors.muted }}>View: </span><span style={{ color: colors.text }}>{hovered.view_type}</span></div>}
                {hovered.view_quality && <div><span style={{ color: colors.muted }}>Quality: </span><span style={{ color: vqColors[hovered.view_quality as keyof typeof vqColors] || colors.text }}>{hovered.view_quality}</span></div>}
                {hovered.faces && <div><span style={{ color: colors.muted }}>Faces: </span><span style={{ color: colors.text }}>{hovered.faces}</span></div>}
              </div>
              {hovered.master_bed_dims && (
                <div style={{ fontSize: 9, color: colors.textDim }}>
                  Master: {hovered.master_bed_dims} · Living: {hovered.living_dims || '—'} · Kitchen: {hovered.kitchen_dims || '—'}
                </div>
              )}
              {hovered._pricing && (
                <div style={{ marginTop: 6, padding: 6, background: colors.bg, borderRadius: 4 }}>
                  <div style={{ fontSize: 12, color: colors.gold, fontWeight: 700, fontFamily: MONO }}>
                    Est. AED {fmtM(hovered._pricing.estPrice)}
                  </div>
                  <div style={{ fontSize: 9, color: colors.textDim }}>
                    {fmt(hovered._pricing.avgPsf)}/sqft · {hovered._pricing.txnCount} txns · Band {hovered._pricing.floorBand}
                  </div>
                </div>
              )}
              {hovered.confidence && <div style={{ fontSize: 9, marginTop: 4 }}><ConfBadge confidence={hovered.confidence} /></div>}
            </div>
          )}
        </div>
      </div>

      {/* Band pricing */}
      {bandPricing.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Divider label={`FLOOR BAND ${band} PRICING`} />
          {bandPricing.map((fp, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 12px', marginBottom: 4, background: colors.cardBg,
              border: `1px solid ${colors.cardBorder}`, borderRadius: 4,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 4, height: 20, borderRadius: 2, background: typeColor[fp.rooms_en] || colors.textDim }} />
                <span style={{ fontSize: 13, color: colors.text }}>{fp.rooms_en}</span>
                <span style={{ fontSize: 10, color: colors.textDim }}>{fp.txn_count} txns</span>
                <ConfBadge confidence={fp.confidence} />
              </div>
              <div style={{ textAlign: 'right', fontFamily: MONO }}>
                <div style={{ fontSize: 13, color: colors.gold }}>AED {fmt(fp.avg_psf)}/sqft</div>
                <div style={{ fontSize: 9, color: colors.textDim }}>{fmt(fp.min_psf)} — {fmt(fp.max_psf)}</div>
              </div>
            </div>
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
        Source: xray_floor_unit_matrix. {allUnits.length} units mapped.
        {shapeType ? ` Building shape: ${shapeType.replace(/_/g, ' ')}.` : ''} Colored by view quality.
      </div>
    </div>
  );
}
