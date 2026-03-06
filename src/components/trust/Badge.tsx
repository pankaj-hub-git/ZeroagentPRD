import { BADGE_CONFIG, type BadgeLevel } from '@/lib/constants';

interface BadgeProps {
  level: BadgeLevel;
  compact?: boolean;
}

export function Badge({ level, compact }: BadgeProps) {
  const cfg = BADGE_CONFIG[level];
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-micro font-medium"
      style={{
        color: cfg.color,
        backgroundColor: `${cfg.color}18`,
        border: `1px solid ${cfg.color}30`,
      }}
    >
      <span>{cfg.icon}</span>
      {!compact && <span>{cfg.label}</span>}
    </span>
  );
}
