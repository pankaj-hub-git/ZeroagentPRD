import { VERDICT_CONFIG, type VerdictType } from '@/lib/constants';
import { ShieldCheck, ArrowDownRight, Clock, XOctagon } from 'lucide-react';

const ICONS: Record<VerdictType, typeof ShieldCheck> = {
  BUY: ShieldCheck,
  NEGOTIATE: ArrowDownRight,
  WAIT: Clock,
  AVOID: XOctagon,
};

interface VerdictProps {
  verdict: VerdictType;
  reasoning: string;
  conditions?: string[];
}

export function Verdict({ verdict, reasoning, conditions }: VerdictProps) {
  const cfg = VERDICT_CONFIG[verdict];
  const Icon = ICONS[verdict];

  return (
    <div
      className="rounded-lg p-5 mt-6"
      style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.color}30` }}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <Icon size={20} style={{ color: cfg.color }} />
        <span
          className="text-subheading font-semibold"
          style={{ color: cfg.color }}
        >
          {verdict} — {cfg.label}
        </span>
      </div>
      <p className="text-body text-text-primary leading-relaxed">{reasoning}</p>
      {conditions && conditions.length > 0 && (
        <ul className="mt-3 space-y-1">
          {conditions.map((c, i) => (
            <li key={i} className="text-body text-text-secondary flex items-start gap-2">
              <span style={{ color: cfg.color }}>•</span>
              {c}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
