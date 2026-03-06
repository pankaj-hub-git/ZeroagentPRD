import { useHomeData, DealCard, GovFeedItem } from '@/hooks/useHomeData';
import { fmtNum, fmtDate } from '@/lib/constants';
import { Loader2 } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { useRef, useCallback } from 'react';

const GOLD = '#C9A84C';
const CHART_BG = '#0D0D20';

/* ── Helpers ───────────────────────────────────────────────── */
function relativeTime(iso: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return fmtDate(iso);
}

function typeBadge(deal: DealCard) {
  if (deal.type === 'sale') return { label: deal.offPlan ? 'SALE 🏗' : 'SALE', color: '#E74C3C', bg: 'rgba(231,76,60,0.15)' };
  if (deal.type === 'rent_new') return { label: 'RENT NEW', color: '#F39C12', bg: 'rgba(243,156,18,0.15)' };
  return { label: 'RENT RENEW', color: '#2E75B6', bg: 'rgba(46,117,182,0.15)' };
}

function formatPrice(price: number, type: string): string {
  if (price >= 1_000_000) return `AED ${(price / 1_000_000).toFixed(2)}M`;
  if (price >= 1_000) return `AED ${fmtNum(Math.round(price))}`;
  return `AED ${price}`;
}

function impactDots(score: number, max = 5): string {
  const filled = Math.min(Math.round(score), max);
  return '●'.repeat(filled) + '○'.repeat(max - filled);
}

/* ── Deal Card Component ───────────────────────────────────── */
function DealCardItem({ deal }: { deal: DealCard }) {
  const badge = typeBadge(deal);
  return (
    <div className="bg-surface border border-border rounded-lg p-3 hover:border-gold/20 transition-colors">
      <div className="flex items-center justify-between mb-1.5">
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded tracking-wide"
          style={{ color: badge.color, backgroundColor: badge.bg }}
        >
          {badge.label}
        </span>
        <span className="text-micro text-text-dim">{relativeTime(deal.time)}</span>
      </div>
      <div className="text-body font-medium text-text-primary truncate mb-1">{deal.title}</div>
      <div className="flex items-center justify-between">
        <span className="text-body font-mono text-gold">
          {formatPrice(deal.price, deal.type)}
          {deal.type !== 'sale' && <span className="text-text-dim text-micro">/yr</span>}
        </span>
        {deal.psfSqft && (
          <span className="text-micro font-mono text-text-secondary">
            AED {fmtNum(deal.psfSqft)}/sqft
          </span>
        )}
      </div>
      <div className="text-micro text-text-dim mt-1">{deal.subLabel}</div>
    </div>
  );
}

/* ── Gov Feed Card ─────────────────────────────────────────── */
const SOURCE_STYLE: Record<string, { label: string; border: string }> = {
  government: { label: 'GOV CATALYST', border: '#2E75B6' },
  safe_haven: { label: 'SAFE HAVEN', border: '#F39C12' },
  policy: { label: 'POLICY', border: '#E74C3C' },
};

function GovCard({ item }: { item: GovFeedItem }) {
  const style = SOURCE_STYLE[item.source] ?? SOURCE_STYLE.policy;
  const direction = item.meta.direction as string | undefined;
  const borderColor = item.source === 'policy'
    ? (direction === 'bullish' ? '#27AE60' : direction === 'bearish' ? '#E74C3C' : '#E74C3C')
    : style.border;

  return (
    <div
      className="bg-surface rounded-lg p-3 hover:bg-surface-2 transition-colors"
      style={{ borderLeft: `3px solid ${borderColor}` }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold tracking-wider" style={{ color: borderColor }}>
          {style.label}
        </span>
        {item.impactScore > 0 && (
          <span className="text-micro text-text-dim font-mono">{impactDots(item.impactScore)}</span>
        )}
      </div>
      <div className="text-body font-medium text-text-primary line-clamp-2 mb-1">{item.title}</div>
      <div className="text-micro text-text-secondary line-clamp-2 mb-2">{item.description}</div>
      {item.communities.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.communities.slice(0, 4).map((c, i) => (
            <span key={i} className="text-[9px] px-1.5 py-0.5 bg-white/5 text-text-dim rounded">
              {c}
            </span>
          ))}
        </div>
      )}
      <div className="text-micro text-text-dim mt-1.5">{relativeTime(item.date)}</div>
    </div>
  );
}

/* ── Recharts custom tooltip ───────────────────────────────── */
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border rounded px-2 py-1 text-micro">
      <div className="text-text-dim">{label}</div>
      <div className="text-gold font-mono">AED {fmtNum(payload[0].value)}/sqft</div>
    </div>
  );
}

const PIE_COLORS = ['#C9A84C', '#2E75B6', '#27AE60', '#E74C3C', '#F39C12'];

/* ── Main Page ─────────────────────────────────────────────── */
export function HomePage() {
  const {
    deals, dealsLoading, loadMoreDeals,
    mtd, psfTrend, bedroomPsf, offplanSplit, topAreas, eibor,
    pulseLoading,
    govFeed, govLoading,
  } = useHomeData();

  /* Infinite scroll observer */
  const observer = useRef<IntersectionObserver | null>(null);
  const lastDealRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (dealsLoading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) loadMoreDeals();
      });
      if (node) observer.current.observe(node);
    },
    [dealsLoading, loadMoreDeals]
  );

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden">
      {/* ── COL 1: Live Deals ─────────────────────────────── */}
      <div className="lg:w-1/3 border-r border-border overflow-y-auto p-4 space-y-2 order-2 lg:order-1">
        <h2 className="text-label text-text-dim uppercase tracking-wider mb-2 sticky top-0 bg-bg py-1 z-10">
          Live Deals
        </h2>
        {deals.map((d, i) => (
          <div key={d.id} ref={i === deals.length - 1 ? lastDealRef : undefined}>
            <DealCardItem deal={d} />
          </div>
        ))}
        {dealsLoading && (
          <div className="flex justify-center py-4">
            <Loader2 className="animate-spin text-gold" size={20} />
          </div>
        )}
      </div>

      {/* ── COL 2: Market Pulse ───────────────────────────── */}
      <div className="lg:w-1/3 border-r border-border overflow-y-auto p-4 order-1 lg:order-2">
        <h2 className="text-label text-text-dim uppercase tracking-wider mb-3">Market Pulse</h2>

        {pulseLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-gold" size={20} />
          </div>
        ) : (
          <div className="space-y-4">
            {/* MTD Stats */}
            {mtd && (
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-surface border border-border rounded-lg p-3">
                  <div className="text-micro text-text-dim">MTD Transactions</div>
                  <div className="text-heading font-mono text-gold">{fmtNum(mtd.count)}</div>
                </div>
                <div className="bg-surface border border-border rounded-lg p-3">
                  <div className="text-micro text-text-dim">MTD Value</div>
                  <div className="text-heading font-mono text-gold">
                    AED {(mtd.totalValue / 1e9).toFixed(1)}bn
                  </div>
                </div>
              </div>
            )}

            {/* PSF Trend Chart */}
            {psfTrend.length > 0 && (
              <div className="bg-surface border border-border rounded-lg p-3">
                <div className="text-micro text-text-dim mb-2">Avg PSF Trend (AED/sqft)</div>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={psfTrend}>
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#3A3F52' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#3A3F52' }} axisLine={false} tickLine={false} width={50} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="psf" stroke={GOLD} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Bedroom PSF */}
            {bedroomPsf.length > 0 && (
              <div className="bg-surface border border-border rounded-lg p-3">
                <div className="text-micro text-text-dim mb-2">PSF by Bedroom Type</div>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={bedroomPsf} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 9, fill: '#3A3F52' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="rooms" tick={{ fontSize: 9, fill: '#8892A4' }} axisLine={false} tickLine={false} width={50} />
                    <Bar dataKey="psf" fill={GOLD} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Offplan Split Donut */}
            {offplanSplit.length > 0 && (
              <div className="bg-surface border border-border rounded-lg p-3">
                <div className="text-micro text-text-dim mb-2">Off-Plan vs Ready Split</div>
                <div className="flex items-center">
                  <ResponsiveContainer width="50%" height={120}>
                    <PieChart>
                      <Pie
                        data={offplanSplit}
                        dataKey="count"
                        nameKey="regType"
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                      >
                        {offplanSplit.map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-1">
                    {offplanSplit.map((o, idx) => (
                      <div key={o.regType} className="flex items-center gap-2 text-micro">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                        <span className="text-text-secondary truncate">{o.regType}</span>
                        <span className="ml-auto font-mono text-text-dim">{fmtNum(o.count)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Top Areas */}
            {topAreas.length > 0 && (
              <div className="bg-surface border border-border rounded-lg p-3">
                <div className="text-micro text-text-dim mb-2">Top 5 Areas by Volume</div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={topAreas}>
                    <XAxis dataKey="area" tick={{ fontSize: 8, fill: '#8892A4' }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={40} />
                    <YAxis tick={{ fontSize: 9, fill: '#3A3F52' }} axisLine={false} tickLine={false} width={50} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="psf" fill={GOLD} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* EIBOR */}
            {eibor.length > 0 && (
              <div className="bg-surface border border-border rounded-lg p-3">
                <div className="text-micro text-text-dim mb-1">EIBOR Rate</div>
                <div className="grid grid-cols-3 gap-2">
                  {['rate_1m', 'rate_3m', 'rate_6m'].map((key) => {
                    const val = (eibor[0] as unknown as Record<string, unknown>)[key];
                    const prev = eibor[1] ? (eibor[1] as unknown as Record<string, unknown>)[key] : undefined;
                    return (
                      <div key={key} className="text-center">
                        <div className="text-micro text-text-dim">{key.replace('rate_', '').toUpperCase()}</div>
                        <div className="text-body font-mono text-text-primary">
                          {val != null ? `${Number(val).toFixed(2)}%` : '—'}
                        </div>
                        {prev != null && val != null && (
                          <div className={`text-micro font-mono ${Number(val) > Number(prev) ? 'text-danger' : 'text-verified'}`}>
                            {Number(val) > Number(prev) ? '▲' : '▼'} {Math.abs(Number(val) - Number(prev)).toFixed(2)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="text-micro text-text-dim mt-1">As of {fmtDate(eibor[0].date)}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── COL 3: Gov + Developer Feed ───────────────────── */}
      <div className="lg:w-1/3 overflow-y-auto p-4 space-y-2 order-3">
        <h2 className="text-label text-text-dim uppercase tracking-wider mb-2 sticky top-0 bg-bg py-1 z-10">
          Government + Developer Feed
        </h2>
        {govLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-gold" size={20} />
          </div>
        ) : govFeed.length === 0 ? (
          <div className="text-body text-text-dim">No feed items available</div>
        ) : (
          govFeed.map((item) => <GovCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}
