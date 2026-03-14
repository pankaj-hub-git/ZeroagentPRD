import { useTheme } from '@/lib/theme';
import { MONO } from './Atoms';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>;

/** Renders building shape from svg_outline_path stored in xray_building_shape */
export function ShapeRenderer({ shape, size = 120, showLabel = true }: {
  shape: R; size?: number; showLabel?: boolean;
}) {
  const { colors } = useTheme();
  const path = shape.svg_outline_path;
  if (!path) return null;

  const h = Math.round(size * 0.67);
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg viewBox="0 0 100 100" width={size} height={h} style={{ overflow: 'visible' }}>
        <path d={path} fill={`${colors.gold}15`} stroke={colors.gold} strokeWidth={1.5}
          strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      {showLabel && shape.shape_type && (
        <span style={{ fontSize: 9, color: colors.goldMuted, fontFamily: MONO, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {shape.shape_type.replace(/_/g, ' ')}
        </span>
      )}
    </div>
  );
}

/** Mini shape badge for sidebar/headers */
export function ShapeBadge({ shape }: { shape: R }) {
  const { colors } = useTheme();
  const path = shape.svg_outline_path;
  if (!path) return null;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <svg viewBox="0 0 100 100" width={28} height={20}>
        <path d={path} fill="none" stroke={colors.gold} strokeWidth={2.5} />
      </svg>
    </div>
  );
}
