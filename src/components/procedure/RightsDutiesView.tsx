import { Check, AlertTriangle, Shield } from 'lucide-react';
import type { GuideRightDuty } from '@/types/procedure';

const severityColor: Record<string, string> = {
  critical: 'border-l-danger text-danger',
  standard: 'border-l-warn text-warn',
  advisory: 'border-l-info text-info',
};

const typeConfig: Record<string, { icon: typeof Check; label: string; color: string }> = {
  right: { icon: Check, label: 'RIGHT', color: 'text-verified' },
  duty: { icon: AlertTriangle, label: 'DUTY', color: 'text-warn' },
  protection: { icon: Shield, label: 'PROTECTION', color: 'text-info' },
};

interface Props {
  rights: GuideRightDuty[];
}

export function RightsDutiesView({ rights: items }: Props) {
  // Group by party
  const parties = [...new Set(items.map((r) => r.party))];

  const rightItems = items.filter((r) => r.type === 'right' || r.type === 'protection');
  const dutyItems = items.filter((r) => r.type === 'duty');

  return (
    <div className="space-y-8">
      {parties.map((party) => {
        const partyRights = rightItems.filter((r) => r.party === party);
        const partyDuties = dutyItems.filter((r) => r.party === party);
        if (partyRights.length === 0 && partyDuties.length === 0) return null;

        return (
          <div key={party}>
            <h3 className="text-text-dim text-label tracking-[2px] uppercase font-semibold mb-4">
              {party.toUpperCase()}
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Rights column */}
              <div className="space-y-3">
                {partyRights.map((item) => (
                  <RightDutyCard key={item.id} item={item} />
                ))}
              </div>
              {/* Duties column */}
              <div className="space-y-3">
                {partyDuties.map((item) => (
                  <RightDutyCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RightDutyCard({ item }: { item: GuideRightDuty }) {
  const cfg = typeConfig[item.type] ?? typeConfig.right;
  const severity = severityColor[item.severity] ?? severityColor.standard;
  const Icon = cfg.icon;

  return (
    <div className={`bg-surface border border-border border-l-[3px] ${severity.split(' ')[0]} rounded-lg p-5`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={cfg.color} />
        <span className={`text-label font-semibold ${cfg.color}`}>
          {cfg.label}
        </span>
        <span className="text-label text-text-dim">·</span>
        <span className={`text-label font-semibold uppercase ${severity.split(' ')[1]}`}>
          {item.severity}
        </span>
      </div>

      <h4 className="text-text-primary text-subheading font-bold mb-2">
        {item.title}
      </h4>

      <p className="text-text-secondary text-body leading-relaxed mb-3">
        {item.description}
      </p>

      {(item.legal_basis || item.enforcement_body) && (
        <div className="bg-[#131326] border border-border rounded p-3 space-y-1">
          {item.legal_basis && (
            <div className="flex items-center gap-1.5 text-info text-label font-mono">
              <span>&#128220;</span> {item.legal_basis}
            </div>
          )}
          {item.enforcement_body && (
            <div className="flex items-center gap-1.5 text-text-dim text-label">
              <span>&#127963;</span> Enforced by: {item.enforcement_body}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
