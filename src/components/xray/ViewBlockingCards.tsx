import { useTheme } from '@/lib/theme';
import { MONO, Tag } from './Atoms';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>;

const STATUS_CONFIG: Record<string, { label: string; colorKey: 'green' | 'amber' | 'coral' | 'sky' }> = {
  protected: { label: 'PROTECTED', colorKey: 'green' },
  watch: { label: 'WATCH', colorKey: 'sky' },
  partial: { label: 'PARTIALLY BLOCKED', colorKey: 'amber' },
  blocked: { label: 'BLOCKED', colorKey: 'coral' },
};

function getDirectionStatus(blockers: R[]): { status: string; maxRisk: number; topBlocker?: R } {
  if (!blockers.length) return { status: 'protected', maxRisk: 0 };
  const maxRisk = Math.max(...blockers.map(b => b.risk_score || 0));
  const topBlocker = blockers.sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))[0];
  if (maxRisk > 70) return { status: 'blocked', maxRisk, topBlocker };
  if (maxRisk > 40) return { status: 'partial', maxRisk, topBlocker };
  if (maxRisk > 20) return { status: 'watch', maxRisk, topBlocker };
  return { status: 'protected', maxRisk, topBlocker };
}

/** 4-direction summary bar for overview */
export function ViewBlockingSummary({ blockers }: { blockers: R[] }) {
  const { colors } = useTheme();
  const dirs = ['N', 'S', 'E', 'W'] as const;

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {dirs.map(dir => {
        const dirBlockers = blockers.filter(b => b.blocker_direction === dir);
        const { status, maxRisk } = getDirectionStatus(dirBlockers);
        const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.protected;
        const color = colors[cfg.colorKey];
        return (
          <div key={dir} style={{
            flex: 1, padding: '8px 6px', textAlign: 'center',
            background: `${color}10`, borderRadius: 4, border: `1px solid ${color}30`,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color, fontFamily: MONO }}>{dir}</div>
            <div style={{ fontSize: 8, color, letterSpacing: '0.05em', marginTop: 2 }}>
              {cfg.label}
            </div>
            {maxRisk > 0 && (
              <div style={{ fontSize: 9, color: colors.textDim, marginTop: 2 }}>
                Risk: {maxRisk}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Direction-based view blocking cards — full detail */
export function ViewBlockingDetail({ blockers, bestDirection, worstDirection }: {
  blockers: R[]; bestDirection?: string; worstDirection?: string;
}) {
  const { colors } = useTheme();
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

  // Group by direction
  const byDir = new Map<string, R[]>();
  for (const dir of dirs) byDir.set(dir, []);
  for (const b of blockers) {
    const dir = b.blocker_direction;
    if (dir && byDir.has(dir)) byDir.get(dir)!.push(b);
  }

  return (
    <div>
      {/* Direction summary bar */}
      <ViewBlockingSummary blockers={blockers} />

      {/* Best/worst callout */}
      {(bestDirection || worstDirection) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
          {bestDirection && (
            <div style={{ padding: '10px 12px', background: `${colors.green}10`, borderRadius: 4, border: `1px solid ${colors.green}30` }}>
              <div style={{ fontSize: 9, color: colors.green, fontFamily: MONO }}>BEST DIRECTION</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: colors.text, marginTop: 4 }}>{bestDirection}</div>
            </div>
          )}
          {worstDirection && (
            <div style={{ padding: '10px 12px', background: `${colors.coral}10`, borderRadius: 4, border: `1px solid ${colors.coral}30` }}>
              <div style={{ fontSize: 9, color: colors.coral, fontFamily: MONO }}>CAUTION DIRECTION</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: colors.text, marginTop: 4 }}>{worstDirection}</div>
            </div>
          )}
        </div>
      )}

      {/* Per-blocker cards */}
      <div style={{ marginTop: 16 }}>
        {blockers.sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0)).slice(0, 15).map((vb, i) => {
          const riskColor = vb.risk_score > 70 ? colors.coral : vb.risk_score > 40 ? colors.amber : colors.green;
          return (
            <div key={i} style={{
              padding: 12, marginBottom: 6, background: colors.cardBg,
              border: `1px solid ${colors.cardBorder}`, borderRadius: 6,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>{vb.blocker_name}</div>
                  <div style={{ fontSize: 10, color: colors.textDim, marginTop: 2 }}>
                    {vb.blocker_distance_m}m · {vb.blocker_floors} floors · {vb.blocker_direction}
                  </div>
                </div>
                <Tag color={riskColor}>{vb.risk_label || `RISK: ${vb.risk_score}`}</Tag>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6 }}>
                {[
                  { l: 'BLOCKED', v: `${vb.pct_blocked}%`, c: vb.pct_blocked > 30 ? colors.coral : vb.pct_blocked > 15 ? colors.amber : colors.green },
                  { l: 'SEVERITY', v: vb.block_severity?.toUpperCase() || '—', c: vb.block_severity === 'critical' ? colors.coral : vb.block_severity === 'major' ? colors.amber : colors.green },
                  { l: 'VIEW', v: vb.view_name || '—', c: colors.gold },
                  { l: 'SAFE FLOOR', v: String(vb.safe_above_floor || vb.min_safe_floor || '—'), c: colors.green },
                ].map((s, j) => (
                  <div key={j} style={{ padding: 5, background: colors.bg, borderRadius: 3, textAlign: 'center' }}>
                    <div style={{ fontSize: 7, color: colors.textDim, fontFamily: MONO }}>{s.l}</div>
                    <div style={{ fontSize: 12, color: s.c, marginTop: 1 }}>{s.v}</div>
                  </div>
                ))}
              </div>
              {vb.view_salvageable === false && (
                <div style={{ marginTop: 5, padding: 3, background: colors.coralFaint, borderRadius: 3 }}>
                  <span style={{ fontSize: 8, color: colors.coral }}>NOT SALVAGEABLE — permanently blocked</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
