import { useTickerData } from '@/hooks/useTickerData';

const TYPE_COLORS: Record<string, string> = {
  POLICY: '#E74C3C',
  CAPITAL: '#F39C12',
  GOVT: '#2E75B6',
};

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
          <span key={`${item.id}-${i}`} className="inline-flex items-center gap-2 text-micro cursor-pointer hover:opacity-80">
            <span
              className="px-1.5 py-0.5 rounded text-[8px] font-semibold tracking-wider"
              style={{
                backgroundColor: `${TYPE_COLORS[item.type] ?? '#8892A4'}20`,
                color: TYPE_COLORS[item.type] ?? '#8892A4',
              }}
            >
              {item.label}
            </span>
            <span className="text-text-secondary">{item.description}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
