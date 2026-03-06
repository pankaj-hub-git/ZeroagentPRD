/** Conversion factor: 1 sqm = 10.7639 sqft */
export const SQM_TO_SQFT = 10.7639;

/** Convert AED/sqm to AED/sqft */
export function toSqft(aedPerSqm: number): number {
  return aedPerSqm / SQM_TO_SQFT;
}

/** Format number with commas */
export function fmtNum(n: number): string {
  return n.toLocaleString('en-US');
}

/** Format AED currency */
export function fmtAed(n: number): string {
  return `AED ${fmtNum(Math.round(n))}`;
}

/** Format percentage */
export function fmtPct(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`;
}

/** Format date to readable string */
export function fmtDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Verdict thresholds */
export type VerdictType = 'BUY' | 'NEGOTIATE' | 'WAIT' | 'AVOID';

export const VERDICT_CONFIG: Record<
  VerdictType,
  { label: string; color: string; bg: string }
> = {
  BUY: {
    label: 'Intelligence Supports Entry',
    color: '#27AE60',
    bg: 'rgba(39,174,96,0.12)',
  },
  NEGOTIATE: {
    label: 'Value Available with Conditions',
    color: '#2E75B6',
    bg: 'rgba(46,117,182,0.12)',
  },
  WAIT: {
    label: 'Improving Entry Point Ahead',
    color: '#F39C12',
    bg: 'rgba(243,156,18,0.12)',
  },
  AVOID: {
    label: 'Material Risk Identified',
    color: '#E74C3C',
    bg: 'rgba(231,76,60,0.12)',
  },
};

export type BadgeLevel =
  | 'VERIFIED'
  | 'HIGH_CONFIDENCE'
  | 'INFERRED'
  | 'ESTIMATED'
  | 'CONFLICT'
  | 'DEVELOPER_NARRATIVE';

export const BADGE_CONFIG: Record<
  BadgeLevel,
  { icon: string; color: string; label: string }
> = {
  VERIFIED: { icon: '🟢', color: '#27AE60', label: 'Verified' },
  HIGH_CONFIDENCE: { icon: '🔵', color: '#2E75B6', label: 'High Confidence' },
  INFERRED: { icon: '🟡', color: '#F39C12', label: 'Inferred' },
  ESTIMATED: { icon: '🔴', color: '#E74C3C', label: 'Estimated' },
  CONFLICT: { icon: '⚡', color: '#8E44AD', label: 'Conflict' },
  DEVELOPER_NARRATIVE: {
    icon: '📋',
    color: '#95A5A6',
    label: 'Developer Narrative',
  },
};

/** Impact levels for feed items */
export const IMPACT_COLORS: Record<string, string> = {
  HIGH: '#E74C3C',
  MEDIUM: '#F39C12',
  LOW: '#8892A4',
};
