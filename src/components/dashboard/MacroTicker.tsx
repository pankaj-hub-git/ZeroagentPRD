import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/lib/theme';

/*
ZeroAgent Macro Policy + REIT Feed
Data: Supabase bronze layer — pulled Mar 17 2026
Tables: fed_funds_rate, eibor_rates, fx_rates, oil_brent, uae_macro,
        property_price_index, dubai_market_annual_kpis, reit_re_equities
*/

interface MacroItem {
  label: string;
  value: string;
  unit?: string;
  change?: number | null;
  isYoY?: boolean;
  tag?: string;
  tagColor?: string;
  note?: string;
}

interface MacroGroup {
  category: string;
  color: string;
  icon: string;
  items: MacroItem[];
}

const MACRO_DATA: MacroGroup[] = [
  {
    category: 'RATES',
    color: '#00E5A0',
    icon: '⬡',
    items: [
      { label: 'Fed Funds', value: '3.64', unit: '%', change: 0, tag: 'HOLD', tagColor: '#FFB547', note: 'FOMC Mar 17-18' },
      { label: 'CBUAE Base', value: '3.65', unit: '%', change: 0 },
      { label: 'EIBOR 1M', value: '3.56', unit: '%' },
      { label: 'EIBOR 3M', value: '3.65', unit: '%' },
      { label: 'EIBOR 6M', value: '3.63', unit: '%' },
      { label: 'EIBOR 1Y', value: '3.56', unit: '%' },
    ],
  },
  {
    category: 'ENERGY',
    color: '#FF6B35',
    icon: '◉',
    items: [
      { label: 'Brent Crude', value: '103.14', unit: 'USD', change: 38.5, tag: 'SPIKE', tagColor: '#FF4757', note: 'Hormuz disruption' },
    ],
  },
  {
    category: 'FX',
    color: '#6C8EFF',
    icon: '◇',
    items: [
      { label: 'USD/AED', value: '3.6725', change: 0, note: 'Peg' },
      { label: 'EUR/AED', value: '4.2680', change: 7.5 },
      { label: 'GBP/AED', value: '4.9340', change: 7.5 },
      { label: 'INR/AED', value: '0.0399', change: -5.9 },
      { label: 'CNY/AED', value: '0.5319' },
    ],
  },
  {
    category: 'UAE MACRO',
    color: '#FF6B8A',
    icon: '△',
    items: [
      { label: 'GDP Growth', value: '5.0', unit: '%', note: '2025 est' },
      { label: 'Inflation', value: '2.04', unit: '% YoY', note: 'Dec 2025' },
      { label: 'PMI', value: '55.0', tag: 'EXPAND', tagColor: '#00E5A0', note: '12mo high' },
      { label: 'Infl Forecast', value: '1.8', unit: '% 2026', note: 'CBUAE' },
    ],
  },
  {
    category: 'PROPERTY',
    color: '#B57FFF',
    icon: '◻',
    items: [
      { label: 'PPI Apt', value: '310.5', change: 10.79, isYoY: true, note: '1,976 PSF' },
      { label: 'PPI Villa', value: '345.2', change: 14.6, isYoY: true, note: '2,450 PSF' },
      { label: 'Rent Idx', value: '205.3', change: 5.21, isYoY: true },
      { label: 'DFM RE Idx', value: '11,700', change: -30.0, tag: 'CRASH', tagColor: '#FF4757', note: 'from 16,910 peak' },
    ],
  },
  {
    category: 'REITs',
    color: '#4ECDC4',
    icon: '⬢',
    items: [
      { label: 'DUBAIRESI', value: '1.22', unit: 'AED', change: -15.9, note: 'Yld 6.94% · Occ 98%' },
      { label: 'ENBD REIT', value: '0.52', unit: 'USD', change: -1.5, note: 'Yld 7.77%' },
      { label: 'Emirates REIT', value: '~0.49', unit: 'USD', note: 'Yld 6.57% · P/E 0.67' },
    ],
  },
  {
    category: 'DEVELOPERS',
    color: '#FFD93D',
    icon: '▣',
    items: [
      { label: 'EMAAR', value: '11.20', unit: 'AED', change: -29.6, tag: 'SELLOFF', tagColor: '#FF4757', note: 'Yld 8.93%' },
      { label: 'EMAARDEV', value: '13.50', unit: 'AED', change: -34.8, note: 'ATH was 20.70' },
    ],
  },
  {
    category: 'SIGNALS',
    color: '#00D4FF',
    icon: '⚡',
    items: [
      { label: 'REIT-EIBOR Spread', value: '+338', unit: 'bps', note: 'DUBAIRESI vs 1Y', tag: 'WIDE', tagColor: '#FFB547' },
      { label: 'Equity ÷ Physical', value: '-30% / +11%', tag: 'GAP', tagColor: '#FF6B8A' },
      { label: 'Buyer Inquiries', value: '-45', unit: '%', tag: 'PAUSE', tagColor: '#FFB547' },
      { label: '2026 Handovers', value: '120K', unit: 'units', note: '2× normal' },
    ],
  },
];

// Split data into two rows for sub-ticker
const PRIMARY_CATS = ['RATES', 'ENERGY', 'FX', 'UAE MACRO'];
const SECONDARY_CATS = ['PROPERTY', 'REITs', 'DEVELOPERS', 'SIGNALS'];

const PRIMARY_DATA = MACRO_DATA.filter(g => PRIMARY_CATS.includes(g.category));
const SECONDARY_DATA = MACRO_DATA.filter(g => SECONDARY_CATS.includes(g.category));

type TickerEntry =
  | { type: 'divider'; category: string; color: string; icon: string }
  | { type: 'item'; item: MacroItem; catColor: string };

function buildEntries(groups: MacroGroup[]): TickerEntry[] {
  const entries: TickerEntry[] = [];
  groups.forEach((group) => {
    entries.push({ type: 'divider', category: group.category, color: group.color, icon: group.icon });
    group.items.forEach((item) => {
      entries.push({ type: 'item', item, catColor: group.color });
    });
  });
  return entries;
}

function TagBadge({ text, color, isDark }: { text: string; color: string; isDark: boolean }) {
  return (
    <span style={{
      background: `${color}18`,
      color,
      fontSize: 8,
      fontWeight: 800,
      letterSpacing: 1.5,
      padding: '2px 5px',
      borderRadius: 3,
      border: `1px solid ${color}33`,
      marginLeft: 4,
      whiteSpace: 'nowrap' as const,
    }}>
      {text}
    </span>
  );
}

function ChangeIndicator({ change, isYoY }: { change?: number | null; isYoY?: boolean }) {
  if (change === null || change === undefined) return null;
  const isPositive = change > 0;
  const isZero = change === 0;
  const color = isZero ? '#7A8599' : isPositive ? '#00E5A0' : '#FF4757';
  const arrow = isZero ? '―' : isPositive ? '▲' : '▼';
  const suffix = isYoY ? 'y' : '';

  return (
    <span style={{ color, fontSize: 10, fontWeight: 700, marginLeft: 4, letterSpacing: 0.2 }}>
      {arrow}{Math.abs(change).toFixed(1)}%{suffix}
    </span>
  );
}

function TickerStrip({
  entries,
  scrollRef,
  isPaused,
  speed,
  height,
  isDark,
  labelColor,
  valueColor,
  unitColor,
  fadeLColor,
  fadeRColor,
  borderCol,
  bgGrad,
  onMouseEnter,
  onMouseLeave,
}: {
  entries: TickerEntry[];
  scrollRef: React.RefObject<HTMLDivElement>;
  isPaused: boolean;
  speed: number;
  height: number;
  isDark: boolean;
  labelColor: string;
  valueColor: string;
  unitColor: string;
  fadeLColor: string;
  fadeRColor: string;
  borderCol: string;
  bgGrad: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const renderContent = () =>
    entries.map((entry, i) =>
      entry.type === 'divider' ? (
        <div key={`d-${i}`} style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '0 14px 0 8px', whiteSpace: 'nowrap' as const, height: '100%',
          borderLeft: `2px solid ${entry.color}30`,
        }}>
          <span style={{ color: entry.color, fontSize: 8, opacity: 0.7 }}>
            {entry.icon}
          </span>
          <span style={{
            color: entry.color, fontSize: 8, fontWeight: 800,
            letterSpacing: 2.5, textTransform: 'uppercase' as const,
          }}>
            {entry.category}
          </span>
        </div>
      ) : (
        <div key={`i-${i}`} style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '0 22px', whiteSpace: 'nowrap' as const, height: '100%',
        }}>
          <span style={{
            color: labelColor, fontSize: 10, fontWeight: 600,
            letterSpacing: 0.8, textTransform: 'uppercase' as const,
          }}>
            {entry.item.label}
          </span>
          <span style={{
            color: valueColor, fontSize: 14, fontWeight: 800,
            fontFamily: "'IBM Plex Mono', 'Fira Code', monospace",
            letterSpacing: -0.3,
          }}>
            {entry.item.value}
            {entry.item.unit && (
              <span style={{ fontSize: 9, color: unitColor, marginLeft: 2, fontWeight: 500 }}>
                {entry.item.unit}
              </span>
            )}
          </span>
          <ChangeIndicator change={entry.item.change} isYoY={entry.item.isYoY} />
          {entry.item.tag && <TagBadge text={entry.item.tag} color={entry.item.tagColor || '#7A8599'} isDark={isDark} />}
          {entry.item.note && (
            <span style={{ color: isDark ? '#2D3748' : '#999', fontSize: 9, fontStyle: 'italic', marginLeft: 3 }}>
              {entry.item.note}
            </span>
          )}
        </div>
      )
    );

  return (
    <div
      style={{
        width: '100%',
        background: bgGrad,
        borderBottom: `1px solid ${borderCol}`,
        overflow: 'hidden',
        position: 'relative',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 40,
        background: `linear-gradient(90deg, ${fadeLColor} 0%, transparent 100%)`,
        zIndex: 2, pointerEvents: 'none' as const,
      }} />
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: 40,
        background: `linear-gradient(270deg, ${fadeRColor} 0%, transparent 100%)`,
        zIndex: 2, pointerEvents: 'none' as const,
      }} />

      <div style={{ height, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
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

export function MacroTicker() {
  const [isPaused, setIsPaused] = useState(false);
  const primaryRef = useRef<HTMLDivElement>(null);
  const secondaryRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const primaryPos = useRef(0);
  const secondaryPos = useRef(0);
  const { colors, mode } = useTheme();

  const primaryEntries = buildEntries(PRIMARY_DATA);
  const secondaryEntries = buildEntries(SECONDARY_DATA);

  useEffect(() => {
    const primary = primaryRef.current;
    const secondary = secondaryRef.current;
    if (!primary || !secondary) return;

    function animate() {
      if (!isPaused) {
        // Primary row scrolls left
        primaryPos.current += 0.8;
        const primaryHalf = primary!.scrollWidth / 2;
        if (primaryHalf > 0 && primaryPos.current >= primaryHalf) primaryPos.current -= primaryHalf;
        primary!.style.transform = `translateX(-${primaryPos.current}px)`;

        // Secondary row scrolls left slightly slower
        secondaryPos.current += 0.6;
        const secondaryHalf = secondary!.scrollWidth / 2;
        if (secondaryHalf > 0 && secondaryPos.current >= secondaryHalf) secondaryPos.current -= secondaryHalf;
        secondary!.style.transform = `translateX(-${secondaryPos.current}px)`;
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
  const labelColor = isDark ? '#4A5568' : '#777777';
  const valueColor = colors.text;
  const unitColor = isDark ? '#4A5568' : '#999999';
  const fadeLColor = isDark ? '#111827' : '#F0EDE6';
  const fadeRColor = isDark ? '#0D1117' : '#F5F5F0';

  const sharedProps = {
    isPaused,
    isDark,
    labelColor,
    valueColor,
    unitColor,
    fadeLColor,
    fadeRColor,
    borderCol,
    bgGrad,
    onMouseEnter: () => setIsPaused(true),
    onMouseLeave: () => setIsPaused(false),
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Primary ticker: RATES, ENERGY, FX, UAE MACRO */}
      <TickerStrip
        entries={primaryEntries}
        scrollRef={primaryRef as React.RefObject<HTMLDivElement>}
        speed={0.8}
        height={40}
        {...sharedProps}
      />
      {/* Secondary ticker: PROPERTY, REITs, DEVELOPERS, SIGNALS */}
      <TickerStrip
        entries={secondaryEntries}
        scrollRef={secondaryRef as React.RefObject<HTMLDivElement>}
        speed={0.6}
        height={36}
        {...sharedProps}
        bgGrad={isDark
          ? 'linear-gradient(135deg, #0D1117 0%, #0A0E16 100%)'
          : 'linear-gradient(135deg, #EDEAE3 0%, #F0F0EB 100%)'
        }
        fadeLColor={isDark ? '#0D1117' : '#EDEAE3'}
        fadeRColor={isDark ? '#0A0E16' : '#F0F0EB'}
      />
    </div>
  );
}
