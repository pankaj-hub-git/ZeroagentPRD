import { useTheme } from '@/lib/theme';
import { MONO, Tag, VIEW_QUALITY_COLOR } from './Atoms';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>;

interface OrientationData {
  direction: string;
  dominant_quality: string;
  unit_count: number;
  view_types: string[];
  sample_faces?: string;
}

/** Aggregate matrix data into 8-direction orientation summary */
export function aggregateOrientation(matrixUnits: R[]): OrientationData[] {
  const map = new Map<string, { qualities: string[]; viewTypes: Set<string>; count: number; faces: string[] }>();
  for (const u of matrixUnits) {
    if (!u.orientation) continue;
    const dir = u.orientation;
    if (!map.has(dir)) map.set(dir, { qualities: [], viewTypes: new Set(), count: 0, faces: [] });
    const entry = map.get(dir)!;
    entry.count++;
    if (u.view_quality) entry.qualities.push(u.view_quality);
    if (u.view_type) entry.viewTypes.add(u.view_type);
    if (u.faces && entry.faces.length < 3) entry.faces.push(u.faces);
  }
  return Array.from(map.entries()).map(([dir, d]) => {
    const qCounts: Record<string, number> = {};
    for (const q of d.qualities) qCounts[q] = (qCounts[q] || 0) + 1;
    const dominant = Object.entries(qCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'average';
    return {
      direction: dir, dominant_quality: dominant, unit_count: d.count,
      view_types: [...d.viewTypes], sample_faces: d.faces[0],
    };
  });
}

const DIR_POSITIONS: Record<string, { cx: number; cy: number; angle: number }> = {
  N:  { cx: 50, cy: 8,  angle: 0 },
  NE: { cx: 80, cy: 15, angle: 45 },
  E:  { cx: 92, cy: 50, angle: 90 },
  SE: { cx: 80, cy: 85, angle: 135 },
  S:  { cx: 50, cy: 92, angle: 180 },
  SW: { cx: 20, cy: 85, angle: 225 },
  W:  { cx: 8,  cy: 50, angle: 270 },
  NW: { cx: 20, cy: 15, angle: 315 },
};

/** 8-direction compass visualization colored by view quality */
export function OrientationCompass({ data, premiumFace, size = 320 }: {
  data: OrientationData[]; premiumFace?: string; size?: number;
}) {
  const { colors } = useTheme();
  const vqColors = VIEW_QUALITY_COLOR(colors);
  const dirMap = new Map(data.map(d => [d.direction, d]));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ overflow: 'visible' }}>
        {/* Concentric rings */}
        <circle cx={50} cy={50} r={42} fill="none" stroke={colors.border} strokeWidth={0.3} />
        <circle cx={50} cy={50} r={28} fill="none" stroke={colors.border} strokeWidth={0.2} />
        <circle cx={50} cy={50} r={14} fill="none" stroke={colors.border} strokeWidth={0.2} />

        {/* Cross-hairs */}
        <line x1={50} y1={4} x2={50} y2={96} stroke={colors.border} strokeWidth={0.15} />
        <line x1={4} y1={50} x2={96} y2={50} stroke={colors.border} strokeWidth={0.15} />

        {/* Direction segments */}
        {Object.entries(DIR_POSITIONS).map(([dir, pos]) => {
          const d = dirMap.get(dir);
          const quality = d?.dominant_quality || 'average';
          const color = vqColors[quality as keyof typeof vqColors] || colors.textSecondary;
          const isPremium = premiumFace && dir === premiumFace;
          const r = d ? Math.min(6 + Math.sqrt(d.unit_count) * 1.5, 14) : 4;

          return (
            <g key={dir}>
              {/* Segment circle */}
              <circle cx={pos.cx} cy={pos.cy} r={r} fill={`${color}${d ? '55' : '15'}`}
                stroke={isPremium ? colors.gold : color} strokeWidth={isPremium ? 1.2 : 0.5} />
              {/* Direction label */}
              <text x={pos.cx} y={pos.cy - (r + 2.5)} textAnchor="middle" fontSize="3.5"
                fontWeight="700" fill={d ? color : colors.textDim}
                style={{ fontFamily: MONO }}>{dir}</text>
              {/* Unit count */}
              {d && (
                <text x={pos.cx} y={pos.cy + 1} textAnchor="middle" fontSize="3"
                  fontWeight="700" fill={colors.text}>{d.unit_count}</text>
              )}
              {/* Premium star */}
              {isPremium && (
                <text x={pos.cx} y={pos.cy + r + 4} textAnchor="middle" fontSize="3.5"
                  fill={colors.gold}>★</text>
              )}
            </g>
          );
        })}

        {/* Center */}
        <circle cx={50} cy={50} r={6} fill={colors.elevated} stroke={colors.border} strokeWidth={0.5} />
        <text x={50} y={51} textAnchor="middle" fontSize="2.8" fill={colors.textDim}
          fontWeight="600" style={{ fontFamily: MONO }}>BLDG</text>
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        {Object.entries(vqColors).map(([quality, color]) => (
          <div key={quality} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: `${color}88` }} />
            <span style={{ fontSize: 9, color: colors.textSecondary }}>{quality}</span>
          </div>
        ))}
      </div>

      {/* Direction detail cards */}
      {data.length > 0 && (
        <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 6, marginTop: 8 }}>
          {data.sort((a, b) => b.unit_count - a.unit_count).map(d => {
            const color = vqColors[d.dominant_quality as keyof typeof vqColors] || colors.textSecondary;
            return (
              <div key={d.direction} style={{
                padding: '8px 10px', background: colors.cardBg, border: `1px solid ${colors.cardBorder}`,
                borderLeft: `3px solid ${color}`, borderRadius: 4,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>{d.direction}</span>
                  <Tag color={color}>{d.dominant_quality?.toUpperCase()}</Tag>
                </div>
                <div style={{ fontSize: 10, color: colors.textSecondary }}>{d.unit_count} units</div>
                {d.view_types.length > 0 && (
                  <div style={{ fontSize: 9, color: colors.gold, marginTop: 2 }}>
                    {d.view_types.join(' · ')}
                  </div>
                )}
                {d.sample_faces && (
                  <div style={{ fontSize: 9, color: colors.textDim, marginTop: 2, fontStyle: 'italic' }}>
                    {d.sample_faces}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Mini compass for overview section */
export function MiniCompass({ data, size = 80 }: { data: OrientationData[]; size?: number }) {
  const { colors } = useTheme();
  const vqColors = VIEW_QUALITY_COLOR(colors);
  const dirMap = new Map(data.map(d => [d.direction, d]));

  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <circle cx={50} cy={50} r={40} fill="none" stroke={colors.border} strokeWidth={0.5} />
      {Object.entries(DIR_POSITIONS).map(([dir, pos]) => {
        const d = dirMap.get(dir);
        const quality = d?.dominant_quality || 'average';
        const color = vqColors[quality as keyof typeof vqColors] || colors.textDim;
        return (
          <g key={dir}>
            <circle cx={pos.cx} cy={pos.cy} r={d ? 5 : 3}
              fill={`${color}${d ? '66' : '20'}`} stroke={color} strokeWidth={0.4} />
            <text x={pos.cx} y={pos.cy + 1} textAnchor="middle" fontSize="3.5"
              fontWeight="700" fill={d ? colors.text : colors.textDim}>{dir}</text>
          </g>
        );
      })}
      <circle cx={50} cy={50} r={5} fill={colors.elevated} stroke={colors.border} strokeWidth={0.3} />
    </svg>
  );
}
