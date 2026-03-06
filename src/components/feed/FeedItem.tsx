import type { FeedItem as FeedItemType } from '@/hooks/useFeedData';
import { IMPACT_COLORS } from '@/lib/constants';
import { fmtDate } from '@/lib/constants';
import { ArrowRight } from 'lucide-react';

const CATEGORY_COLORS: Record<string, string> = {
  policy: '#2E75B6',
  macro: '#C9A84C',
  safe_haven: '#8E44AD',
  government: '#27AE60',
  crisis: '#E74C3C',
};

const CATEGORY_LABELS: Record<string, string> = {
  policy: 'Policy & Regulatory',
  macro: 'Macro Signal',
  safe_haven: 'Safe Haven Event',
  government: 'Government Catalyst',
  crisis: 'Crisis Alert',
};

interface Props {
  item: FeedItemType;
}

export function FeedItemCard({ item }: Props) {
  const catColor = CATEGORY_COLORS[item.category] ?? '#8892A4';
  const impactColor = IMPACT_COLORS[item.impact] ?? '#8892A4';

  return (
    <div className="bg-surface border border-border rounded-lg p-4 hover:border-gold/20 transition-colors">
      <div className="flex items-center gap-2 mb-2.5">
        {/* Category badge */}
        <span
          className="text-micro px-2 py-0.5 rounded font-medium"
          style={{ backgroundColor: `${catColor}20`, color: catColor }}
        >
          {CATEGORY_LABELS[item.category] ?? item.category}
        </span>

        {/* Impact badge */}
        <span
          className="text-micro px-2 py-0.5 rounded font-medium"
          style={{ backgroundColor: `${impactColor}20`, color: impactColor }}
        >
          {item.impact}
        </span>

        <span className="text-micro text-text-dim ml-auto">
          {item.date ? fmtDate(item.date) : '—'}
        </span>
      </div>

      <h3 className="text-body font-medium text-text-primary mb-1">
        {item.title}
      </h3>

      <p className="text-body text-text-secondary leading-relaxed mb-3">
        {item.summary}
      </p>

      <div className="flex items-center justify-between">
        <span className="text-micro text-text-dim">
          Source: {item.source}
        </span>
        <button className="flex items-center gap-1 text-micro text-gold hover:text-gold/80 transition-colors">
          Analyse Impact <ArrowRight size={11} />
        </button>
      </div>
    </div>
  );
}
