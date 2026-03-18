import { Shield } from 'lucide-react';
import type { GuideWarning } from '@/types/procedure';

const riskColor: Record<string, { badge: string; border: string }> = {
  critical: { badge: 'text-danger bg-danger/15', border: 'border-l-danger' },
  high: { badge: 'text-warn bg-warn/15', border: 'border-l-warn' },
  medium: { badge: 'text-text-secondary bg-text-dim/15', border: 'border-l-text-secondary' },
  low: { badge: 'text-text-dim bg-text-dim/10', border: 'border-l-text-dim' },
};

interface Props {
  warnings: GuideWarning[];
}

export function WarningList({ warnings }: Props) {
  // Sort: critical first
  const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...warnings].sort(
    (a, b) => (riskOrder[a.risk_level] ?? 4) - (riskOrder[b.risk_level] ?? 4)
  );

  return (
    <div className="space-y-4">
      {sorted.map((w) => (
        <WarningCard key={w.id} warning={w} />
      ))}
    </div>
  );
}

function WarningCard({ warning }: { warning: GuideWarning }) {
  const style = riskColor[warning.risk_level] ?? riskColor.medium;

  return (
    <div className={`bg-surface border border-border border-l-[3px] ${style.border} rounded-lg p-6`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-label font-bold uppercase px-2 py-0.5 rounded ${style.badge}`}>
          {warning.risk_level} RISK
        </span>
      </div>

      <h3 className="text-text-primary text-[18px] font-bold mb-2">
        {warning.warning_title}
      </h3>

      <p className="text-text-secondary text-body leading-relaxed mb-4">
        {warning.warning_description}
      </p>

      {warning.who_is_affected && (
        <div className="text-text-dim text-label mb-4">
          WHO IS AFFECTED: <span className="text-text-secondary">{warning.who_is_affected.charAt(0).toUpperCase() + warning.who_is_affected.slice(1)}</span>
        </div>
      )}

      {warning.how_to_protect && (
        <div className="bg-verified/8 border-l-[3px] border-l-verified rounded-r-lg p-4 mb-4">
          <div className="flex items-center gap-1.5 text-verified text-[13px] font-semibold mb-1.5">
            <Shield size={14} />
            HOW TO PROTECT YOURSELF
          </div>
          <p className="text-verified/90 text-[13px] leading-relaxed">
            {warning.how_to_protect}
          </p>
        </div>
      )}

      {warning.real_example && (
        <div className="bg-[#131326] border border-border rounded p-4">
          <div className="text-text-dim text-label font-semibold mb-1.5">
            REAL CASE
          </div>
          <p className="text-text-secondary text-[13px] italic leading-relaxed">
            {warning.real_example}
          </p>
        </div>
      )}
    </div>
  );
}
