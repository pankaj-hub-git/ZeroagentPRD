import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/lib/theme';

interface MacroItem {
  label: string;
  value: string;
  unit: string;
  change: number | null;
  date: string;
  isYoY?: boolean;
}

interface MacroGroup {
  category: string;
  items: MacroItem[];
}

const MACRO_DATA: MacroGroup[] = [
  {
    category: 'RATES',
    items: [
      { label: 'Fed Funds', value: '4.33', unit: '%', change: 0, date: 'Mar 2026' },
      { label: 'EIBOR 1M', value: '4.22', unit: '%', change: null, date: '3 Mar' },
      { label: 'EIBOR 3M', value: '4.33', unit: '%', change: -0.53, date: '3 Mar' },
      { label: 'EIBOR 6M', value: '4.30', unit: '%', change: -0.61, date: '3 Mar' },
      { label: 'EIBOR 1Y', value: '4.22', unit: '%', change: null, date: '3 Mar' },
    ],
  },
  {
    category: 'FX',
    items: [
      { label: 'USD/AED', value: '3.6725', unit: '', change: 0, date: 'Mar 2026' },
      { label: 'EUR/AED', value: '3.9700', unit: '', change: null, date: 'Mar 2026' },
      { label: 'GBP/AED', value: '4.5900', unit: '', change: null, date: 'Mar 2026' },
      { label: 'INR/AED', value: '0.0424', unit: '', change: null, date: 'Mar 2026' },
    ],
  },
  {
    category: 'COMMODITIES',
    items: [
      { label: 'Brent Crude', value: '74.50', unit: 'USD', change: -1.71, date: 'Mar 2026' },
    ],
  },
  {
    category: 'UAE MACRO',
    items: [
      { label: 'UAE GDP Growth', value: '4.70', unit: '%', change: null, date: 'Mar 2026' },
      { label: 'UAE Inflation', value: '2.40', unit: '%', change: null, date: 'Mar 2026' },
      { label: 'Dubai GDP', value: '122.1B', unit: 'AED', change: null, date: 'Q4 2025' },
      { label: 'Dubai GDP Growth', value: '4.70', unit: '%', change: 1.2, date: 'Q4 2025' },
    ],
  },
  {
    category: 'PROPERTY',
    items: [
      { label: 'PPI Apartment', value: '302.8', unit: '', change: 9.7, date: 'Mar 2026', isYoY: true },
      { label: 'PPI Villa', value: '336.5', unit: '', change: 14.6, date: 'Mar 2026', isYoY: true },
    ],
  },
  {
    category: 'OUTLOOK 2026',
    items: [
      { label: 'Prime Forecast', value: '+3.0', unit: '%', change: null, date: '2026' },
      { label: 'Mainstream Forecast', value: '+1.0', unit: '%', change: null, date: '2026' },
      { label: 'Appreciation Mid', value: '+6.5', unit: '%', change: null, date: '2026' },
    ],
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  RATES: '#00D4AA',
  FX: '#6C8EFF',
  COMMODITIES: '#FFB547',
  'UAE MACRO': '#FF6B8A',
  PROPERTY: '#B57FFF',
  'OUTLOOK 2026': '#4ECDC4',
};

const CATEGORY_ICONS: Record<string, string> = {
  RATES: '◆',
  FX: '◈',
  COMMODITIES: '●',
  'UAE MACRO': '▲',
  PROPERTY: '■',
  'OUTLOOK 2026': '★',
};

function ChangeIndicator({ change, isYoY }: { change: number | null; isYoY?: boolean }) {
  if (change === null || change === undefined) return null;
  const isPositive = change > 0;
  const isZero = change === 0;
  const color = isZero ? '#7A8599' : isPositive ? '#00D4AA' : '#FF4757';
  const arrow = isZero ? '―' : isPositive ? '▲' : '▼';
  const suffix = isYoY ? ' YoY' : '';

  return (
    <span style={{ color, fontSize: 11, fontWeight: 600, marginLeft: 6, letterSpacing: 0.3 }}>
      {arrow} {Math.abs(change).toFixed(change % 1 === 0 ? 0 : 1)}%{suffix}
    </span>
  );
}

type TickerEntry =
  | { type: 'divider'; category: string }
  | { type: 'item'; item: MacroItem; catColor: string };

export function MacroTicker() {
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const posRef = useRef(0);
  const { colors, mode } = useTheme();

  const allItems: TickerEntry[] = [];
  MACRO_DATA.forEach((group) => {
    allItems.push({ type: 'divider', category: group.category });
    group.items.forEach((item) => {
      allItems.push({ type: 'item', item, catColor: CATEGORY_COLORS[group.category] || '#7A8599' });
    });
  });

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const speed = 1.0;

    function animate() {
      if (!isPaused && container) {
        posRef.current += speed;
        const half = container.scrollWidth / 2;
        if (half > 0 && posRef.current >= half) posRef.current -= half;
        container.style.transform = `translateX(-${posRef.current}px)`;
      }
      animRef.current = requestAnimationFrame(animate);
    }
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [isPaused]);

  const isDark = mode === 'dark';
  const bgGrad = isDark
    ? 'linear-gradient(135deg, #111827 0%, #0D1117 100%)'
    : 'linear-gradient(135deg, #F0EDE6 0%, #F5F5F0 100%)';
  const borderCol = isDark ? '#1E2536' : colors.border;
  const labelColor = isDark ? '#5A6577' : '#777777';
  const valueColor = colors.text;
  const unitColor = isDark ? '#5A6577' : '#999999';
  const fadeLColor = isDark ? '#111827' : '#F0EDE6';
  const fadeRColor = isDark ? '#0D1117' : '#F5F5F0';

  const renderContent = () =>
    allItems.map((entry, i) =>
      entry.type === 'divider' ? (
        <div key={`d-${i}`} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '0 20px 0 12px', whiteSpace: 'nowrap', height: '100%',
          borderLeft: `2px solid ${CATEGORY_COLORS[entry.category] || '#5A6577'}22`,
        }}>
          <span style={{ color: CATEGORY_COLORS[entry.category], fontSize: 9, opacity: 0.7 }}>
            {CATEGORY_ICONS[entry.category] || '●'}
          </span>
          <span style={{
            color: CATEGORY_COLORS[entry.category], fontSize: 9, fontWeight: 700,
            letterSpacing: 2, textTransform: 'uppercase' as const,
          }}>
            {entry.category}
          </span>
        </div>
      ) : (
        <div key={`i-${i}`} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '0 28px', whiteSpace: 'nowrap', height: '100%',
        }}>
          <span style={{
            color: labelColor, fontSize: 11, fontWeight: 500,
            textTransform: 'uppercase' as const, letterSpacing: 1.2,
          }}>
            {entry.item.label}
          </span>
          <span style={{
            color: valueColor, fontSize: 15, fontWeight: 700,
            fontFamily: "'IBM Plex Mono', monospace",
            letterSpacing: -0.2,
          }}>
            {entry.item.value}
            {entry.item.unit && (
              <span style={{ fontSize: 10, color: unitColor, marginLeft: 2, fontWeight: 500 }}>
                {entry.item.unit}
              </span>
            )}
          </span>
          <ChangeIndicator change={entry.item.change} isYoY={entry.item.isYoY} />
        </div>
      )
    );

  return (
    <div style={{
      width: '100%',
      background: bgGrad,
      borderBottom: `1px solid ${borderCol}`,
      overflow: 'hidden',
      position: 'relative',
    }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}>
      {/* Edge fades */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 40,
        background: `linear-gradient(90deg, ${fadeLColor} 0%, transparent 100%)`,
        zIndex: 2, pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 40,
        background: `linear-gradient(270deg, ${fadeRColor} 0%, transparent 100%)`,
        zIndex: 2, pointerEvents: 'none',
      }} />

      {/* Scrolling content */}
      <div style={{ height: 40, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <div ref={scrollRef} style={{
          display: 'inline-flex', alignItems: 'center',
          willChange: 'transform', height: '100%',
        }}>
          {renderContent()}
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
