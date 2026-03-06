import { useToolStore } from '@/store/tools';
import {
  Search,
  ArrowRightLeft,
  Calculator,
  CalendarClock,
  AlertTriangle,
  TrendingUp,
  PaintBucket,
} from 'lucide-react';

const TOOLS = [
  {
    key: 'deal-audit',
    label: 'Deal Audit',
    desc: '5-layer intelligence audit on any property',
    icon: Search,
  },
  {
    key: 'flip-calc',
    label: 'Flip Calculator',
    desc: 'Full P&L with DLD fees and cost model',
    icon: ArrowRightLeft,
  },
  {
    key: 'net-yield',
    label: 'Net Yield Calculator',
    desc: 'Gross to net waterfall with verified SC',
    icon: Calculator,
  },
  {
    key: 'handover-impact',
    label: 'Handover Impact',
    desc: 'Pattern-matched pricing impact forecast',
    icon: CalendarClock,
  },
  {
    key: 'blocking-report',
    label: 'Blocking Risk Report',
    desc: 'View block probability and noise profile',
    icon: AlertTriangle,
  },
  {
    key: 'capital-rotation',
    label: 'Capital Rotation Tracker',
    desc: 'Cascade position and rotation timing',
    icon: TrendingUp,
  },
  {
    key: 'renovate-flip',
    label: 'Renovate + Flip ROI',
    desc: 'Community-specific renovation priorities',
    icon: PaintBucket,
  },
];

export function ToolsPage() {
  const open = useToolStore((s) => s.open);

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-heading font-semibold mb-1">Intelligence Tools</h1>
        <p className="text-body text-text-secondary">
          Context-aware tools pre-populated from your active community and tower selection
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {TOOLS.map((t) => (
          <button
            key={t.key}
            onClick={() => open(t.key)}
            className="bg-surface border border-border rounded-lg p-4 text-left hover:border-gold/30 transition-colors group"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded bg-gold/10 flex items-center justify-center shrink-0">
                <t.icon size={16} className="text-gold" />
              </div>
              <span className="text-body font-medium text-text-primary group-hover:text-gold transition-colors">
                {t.label}
              </span>
            </div>
            <p className="text-micro text-text-secondary">{t.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
