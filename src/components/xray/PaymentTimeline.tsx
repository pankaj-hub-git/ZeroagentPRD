import { useTheme } from '@/lib/theme';
import { MONO, Tag } from './Atoms';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>;

/** Visual payment plan timeline with milestone breakdown */
export function PaymentTimeline({ milestones, handoverDate, constructionPct }: {
  milestones: R[]; handoverDate?: string; constructionPct?: number;
}) {
  const { colors } = useTheme();
  const total = milestones.reduce((a, m) => a + (m.percentage || 0), 0);

  // Group milestones into phases
  const phases = {
    booking: milestones.filter(m => m.phase === 'booking' || m.milestone_number === 1),
    construction: milestones.filter(m => m.phase === 'construction' || (m.milestone_number > 1 && m.phase !== 'handover' && m.phase !== 'post_handover')),
    handover: milestones.filter(m => m.phase === 'handover'),
    post: milestones.filter(m => m.phase === 'post_handover'),
  };

  const phaseColors = {
    booking: colors.gold,
    construction: colors.amber,
    handover: colors.green,
    post: colors.sky,
  };

  return (
    <div>
      {/* Status badges */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {constructionPct != null && (
          <Tag color={constructionPct >= 100 ? colors.green : colors.amber}>
            {constructionPct >= 100 ? 'COMPLETED' : `${constructionPct}% BUILT`}
          </Tag>
        )}
        {handoverDate && <Tag color={colors.sky}>HANDOVER: {handoverDate.slice(0, 7)}</Tag>}
        <Tag color={total === 100 ? colors.green : colors.amber}>{total}% TOTAL</Tag>
      </div>

      {/* Visual bar */}
      <div style={{
        display: 'flex', height: 28, borderRadius: 6, overflow: 'hidden',
        background: colors.elevated, border: `1px solid ${colors.border}`, marginBottom: 16,
      }}>
        {milestones.map((m, i) => {
          const pct = m.percentage || 0;
          if (pct === 0) return null;
          const phase = m.phase || (m.milestone_number === 1 ? 'booking' : 'construction');
          const color = phaseColors[phase as keyof typeof phaseColors] || colors.gold;
          return (
            <div key={i} style={{
              width: `${pct}%`, height: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', background: `${color}44`, borderRight: `1px solid ${colors.bg}`,
              position: 'relative',
            }}>
              {pct >= 8 && (
                <span style={{ fontSize: 9, fontWeight: 700, color: colors.text, fontFamily: MONO }}>
                  {pct}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Phase summary */}
      {Object.entries(phases).map(([phase, items]) => {
        if (items.length === 0) return null;
        const color = phaseColors[phase as keyof typeof phaseColors] || colors.gold;
        const phaseTotal = items.reduce((a, m) => a + (m.percentage || 0), 0);
        return (
          <div key={phase} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 3, height: 14, borderRadius: 2, background: color }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: colors.text, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {phase === 'post' ? 'Post-Handover' : phase}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: MONO }}>{phaseTotal}%</span>
            </div>
            {items.map((m, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 12px', marginBottom: 2, background: colors.cardBg,
                borderRadius: 4, border: `1px solid ${colors.cardBorder}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', background: `${color}20`,
                    border: `1px solid ${color}40`, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 9, fontWeight: 700, color, fontFamily: MONO,
                  }}>{m.milestone_number}</div>
                  <div>
                    <div style={{ fontSize: 12, color: colors.text }}>
                      {m.milestone_name || m.description || `Milestone ${m.milestone_number}`}
                    </div>
                    {m.trigger_event && (
                      <div style={{ fontSize: 9, color: colors.textDim }}>{m.trigger_event}</div>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: 16, fontWeight: 700, color, fontFamily: MONO }}>
                  {m.percentage || 0}%
                </span>
              </div>
            ))}
          </div>
        );
      })}

      {/* DLD fee note */}
      <div style={{
        padding: '8px 12px', background: colors.goldFaint, borderRadius: 4,
        border: `1px solid ${colors.gold}20`, marginTop: 8,
      }}>
        <span style={{ fontSize: 10, color: colors.textSecondary }}>
          DLD registration fee (4%) + admin fee (~AED 5,000) payable at time of purchase, separate from above schedule.
        </span>
      </div>
    </div>
  );
}
