import { useTickerData } from '@/hooks/useTickerData';
import { IMPACT_COLORS } from '@/lib/constants';

export function Ticker() {
  const items = useTickerData();

  if (items.length === 0) {
    return (
      <div className="h-8 bg-bg border-b border-border flex items-center px-6">
        <span className="text-micro text-text-dim">Loading intelligence signals...</span>
      </div>
    );
  }

  return (
    <div className="h-8 bg-bg border-b border-border overflow-hidden relative shrink-0">
      <div className="ticker-animate flex items-center h-full whitespace-nowrap gap-10 px-4">
        {[...items, ...items].map((item, i) => (
          <span key={`${item.id}-${i}`} className="inline-flex items-center gap-2 text-micro">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: IMPACT_COLORS[item.impact] ?? '#8892A4' }}
            />
            <span className="text-text-secondary">{item.description}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
