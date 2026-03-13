import { useState, type ReactNode } from 'react';
import { useTheme } from '@/lib/theme';

export const FONT = "'Libre Franklin', 'Archivo', sans-serif";
export const MONO = "'JetBrains Mono', 'Fira Code', monospace";

/** Small colored dot */
export function Pip({ color, size = 6 }: { color?: string; size?: number }) {
  const { colors } = useTheme();
  const c = color || colors.gold;
  return (
    <span style={{
      display: 'inline-block', width: size, height: size, borderRadius: '50%',
      background: c, boxShadow: `0 0 6px ${c}40`,
    }} />
  );
}

/** Label badge */
export function Tag({ children, color, outline }: { children: ReactNode; color?: string; outline?: boolean }) {
  const { colors } = useTheme();
  const c = color || colors.gold;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 9px', borderRadius: 3, fontSize: 10, fontWeight: 700,
      letterSpacing: '0.06em', whiteSpace: 'nowrap', lineHeight: '18px',
      color: c, background: `${c}12`,
      border: outline ? `1px solid ${c}25` : 'none',
    }}>{children}</span>
  );
}

/** Metric card */
export function Stat({ label, value, unit, sub, accent, small }: {
  label: string; value: string | number; unit?: string; sub?: string;
  accent?: string; small?: boolean;
}) {
  const { colors } = useTheme();
  const ac = accent || colors.gold;
  return (
    <div style={{
      padding: small ? '10px 12px' : '14px 16px',
      background: colors.cardBg, border: `1px solid ${colors.cardBorder}`,
      borderRadius: 8, flex: 1, minWidth: small ? 120 : 140,
    }}>
      <div style={{ fontSize: 10, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: MONO }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: small ? 20 : 26, fontWeight: 800, color: ac, fontFamily: MONO }}>{value}</span>
        {unit && <span style={{ fontSize: 11, color: colors.textSecondary }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

/** 5-segment score indicator */
export function Bar5({ score, label, color }: { score: number; label: string; color?: string }) {
  const { colors } = useTheme();
  const c = color || colors.gold;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
      <span style={{ width: 80, fontSize: 11, color: colors.textSecondary, flexShrink: 0 }}>{label}</span>
      <div style={{ display: 'flex', gap: 3, flex: 1 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{
            height: 5, flex: 1, borderRadius: 3,
            background: i <= score ? c : `${colors.muted}30`,
            boxShadow: i <= score ? `0 0 6px ${c}30` : 'none',
          }} />
        ))}
      </div>
      <span style={{ fontSize: 11, fontFamily: MONO, color: score >= 4 ? c : colors.textSecondary, fontWeight: 700 }}>
        {score}/5
      </span>
    </div>
  );
}

/** Section separator */
export function Divider({ label }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 14px' }}>
      <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg, ${colors.border}, transparent)` }} />
      {label && <span style={{ fontSize: 10, color: colors.muted, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: MONO }}>{label}</span>}
      <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg, transparent, ${colors.border})` }} />
    </div>
  );
}

/** Collapsible section */
export function Accordion({ title, tag, tagColor, children, defaultOpen = false }: {
  title: string; tag?: string; tagColor?: string; children: ReactNode; defaultOpen?: boolean;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      background: colors.surface, border: `1px solid ${open ? colors.borderLit : colors.border}`,
      borderRadius: 10, marginBottom: 10, overflow: 'hidden',
    }}>
      <div onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '13px 18px', cursor: 'pointer',
      }}>
        <span style={{
          color: open ? colors.gold : colors.textSecondary, fontSize: 15,
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: '0.3s', display: 'inline-block',
        }}>▸</span>
        <span style={{ color: colors.text, fontSize: 13, fontWeight: 700, flex: 1 }}>{title}</span>
        {tag && <Tag color={tagColor}>{tag}</Tag>}
        <span style={{ color: colors.muted, fontSize: 11 }}>{open ? 'HIDE' : 'SHOW'}</span>
      </div>
      <div style={{
        maxHeight: open ? 5000 : 0, overflow: 'hidden',
        transition: 'max-height 0.5s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <div style={{ padding: '0 18px 18px', borderTop: `1px solid ${colors.border}` }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/** View quality color mapping */
export const VIEW_QUALITY_COLOR = (colors: ReturnType<typeof useTheme>['colors']) => ({
  premium: colors.gold,
  good: colors.mint,
  average: colors.textSecondary,
  compromised: colors.coral,
});

/** Service charge source badge color */
export const SC_SOURCE_COLOR = (colors: ReturnType<typeof useTheme>['colors']) => ({
  mollak_confirmed: colors.mint,
  community_proxy: colors.amber,
  rera_estimate: colors.sky,
  not_available: colors.muted,
});
