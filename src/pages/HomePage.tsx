import { useState, useRef, useCallback } from 'react';
import { useHomeData, DealCard, FeedItem, MonthlyPoint, AreaHeat, YoYComparison, CapitalFlow, RentalTrend, SupplyItem } from '@/hooks/useHomeData';
import { fmtNum, fmtDate, fmtAed } from '@/lib/constants';
import { Loader2, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';

const GOLD = '#C9A84C';
const BLUE = '#2E75B6';
const GREEN = '#27AE60';
const RED = '#E74C3C';
const ORANGE = '#F39C12';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtMonth(m: string): string {
  const [y, mo] = m.split('-');
  return `${MONTHS_SHORT[Number(mo) - 1] ?? mo} ${y?.slice(2) ?? ''}`;
}

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

function formatPrice(price: number): string {
  if (price >= 1_000_000) return `AED ${(price / 1_000_000).toFixed(2)}M`;
  if (price >= 1_000) return `AED ${fmtNum(Math.round(price))}`;
  return `AED ${price}`;
}

function pctColor(v: number): string {
  return v > 0 ? GREEN : v < 0 ? RED : '#8892A4';
}

function PctBadge({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-micro font-mono" style={{ color: pctColor(value) }}>
      {value > 0 ? <TrendingUp size={10} /> : value < 0 ? <TrendingDown size={10} /> : null}
      {value > 0 ? '+' : ''}{value.toFixed(1)}%
    </span>
  );
}

const TYPE_BADGE: Record<string, { label: string; color: string }> = {
  offplan: { label: 'OFF-PLAN', color: ORANGE },
  ready: { label: 'READY', color: GREEN },
  rent_new: { label: 'NEW LEASE', color: BLUE },
  rent_renew: { label: 'RENEWAL', color: '#8E44AD' },
};

const SOURCE_STYLE: Record<string, { label: string; color: string }> = {
  government: { label: 'GOV CATALYST', color: BLUE },
  safe_haven: { label: 'SAFE HAVEN', color: ORANGE },
  policy: { label: 'POLICY', color: RED },
};

const PIE_COLORS = [GOLD, BLUE];

type Tab = 'feed' | 'sales' | 'rentals' | 'capital' | 'supply';

/* ── Sub-components ─────────────────────────────────────────── */

function DealCardItem({ deal }: { deal: DealCard }) {
  const badge = TYPE_BADGE[deal.type] ?? TYPE_BADGE.ready;
  return (
    <div className="bg-surface border border-border rounded-lg p-3 hover:border-gold/20 transition-colors">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded tracking-wide"
          style={{ color: badge.color, backgroundColor: `${badge.color}18` }}>
          {badge.label}
        </span>
        <span className="text-micro text-text-dim">{relativeTime(deal.time)}</span>
      </div>
      <div className="text-body font-medium text-text-primary truncate mb-1">{deal.title}</div>
      <div className="flex items-center justify-between">
        <span className="text-body font-mono text-gold">
          {formatPrice(deal.price)}
          {(deal.type === 'rent_new' || deal.type === 'rent_renew') && <span className="text-text-dim text-micro">/yr</span>}
        </span>
        {deal.psfSqft && (
          <span className="text-micro font-mono text-text-secondary">AED {fmtNum(deal.psfSqft)}/sqft</span>
        )}
      </div>
      <div className="text-micro text-text-dim mt-1">{deal.subLabel}</div>
    </div>
  );
}

function FeedCard({ item }: { item: FeedItem }) {
  const style = SOURCE_STYLE[item.source] ?? SOURCE_STYLE.policy;
  const borderColor = item.source === 'policy'
    ? (item.direction === 'bullish' ? GREEN : item.direction === 'bearish' ? RED : style.color)
    : style.color;
  return (
    <div className="bg-surface rounded-lg p-3 hover:bg-white/[0.03] transition-colors"
      style={{ borderLeft: `3px solid ${borderColor}` }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold tracking-wider" style={{ color: borderColor }}>{style.label}</span>
        {item.impactScore > 0 && (
          <span className="text-micro text-text-dim font-mono">
            {'●'.repeat(Math.min(Math.round(item.impactScore), 5))}{'○'.repeat(5 - Math.min(Math.round(item.impactScore), 5))}
          </span>
        )}
      </div>
      <div className="text-body font-medium text-text-primary line-clamp-2 mb-1">{item.title}</div>
      <div className="text-micro text-text-secondary line-clamp-2 mb-2">{item.description}</div>
      {item.communities.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.communities.slice(0, 4).map((c, i) => (
            <span key={i} className="text-[9px] px-1.5 py-0.5 bg-white/5 text-text-dim rounded">{c}</span>
          ))}
        </div>
      )}
      {item.type && <span className="text-[9px] text-text-dim mt-1 block">{item.type}</span>}
      <div className="text-micro text-text-dim mt-1">{relativeTime(item.date)}</div>
    </div>
  );
}

function Spinner() {
  return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gold" size={24} /></div>;
}

/* ── Tab: Feed ──────────────────────────────────────────────── */
function FeedTab({ feed, loading }: { feed: FeedItem[]; loading: boolean }) {
  if (loading) return <Spinner />;
  if (feed.length === 0) return <p className="text-body text-text-dim">No intelligence feed available</p>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {feed.map((item) => <FeedCard key={item.id} item={item} />)}
    </div>
  );
}

/* ── Tab: Sales ─────────────────────────────────────────────── */
function SalesTab({
  offplanDeals, readyDeals, dealsLoading, loadMoreDeals,
  monthlyVolume, offplanSplit, areaHeat, yoy, eibor, dashLoading,
}: {
  offplanDeals: DealCard[]; readyDeals: DealCard[]; dealsLoading: boolean; loadMoreDeals: () => void;
  monthlyVolume: MonthlyPoint[]; offplanSplit: { label: string; count: number; valueBn: number }[];
  areaHeat: AreaHeat[]; yoy: YoYComparison[]; eibor: { date: string; rate_1m?: number; rate_3m?: number; rate_6m?: number }[];
  dashLoading: boolean;
}) {
  const [salesSub, setSalesSub] = useState<'offplan' | 'ready'>('offplan');
  const deals = salesSub === 'offplan' ? offplanDeals : readyDeals;

  const observer = useRef<IntersectionObserver | null>(null);
  const lastRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (dealsLoading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) loadMoreDeals();
      });
      if (node) observer.current.observe(node);
    },
    [dealsLoading, loadMoreDeals],
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left: Transactions */}
      <div className="lg:w-2/5 space-y-3">
        <div className="flex gap-1 mb-2">
          {(['offplan', 'ready'] as const).map((k) => (
            <button key={k} onClick={() => setSalesSub(k)}
              className={`px-3 py-1.5 text-micro font-medium rounded-md transition-colors ${salesSub === k ? 'bg-gold/15 text-gold' : 'text-text-dim hover:text-text-secondary'}`}>
              {k === 'offplan' ? 'Off-Plan' : 'Completed / Ready'}
            </button>
          ))}
        </div>
        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
          {deals.map((d, i) => (
            <div key={d.id} ref={i === deals.length - 1 ? lastRef : undefined}>
              <DealCardItem deal={d} />
            </div>
          ))}
          {dealsLoading && <div className="flex justify-center py-4"><Loader2 className="animate-spin text-gold" size={18} /></div>}
          {!dealsLoading && deals.length === 0 && <p className="text-body text-text-dim">No transactions loaded</p>}
        </div>
      </div>

      {/* Right: Dashboard charts */}
      <div className="lg:w-3/5 space-y-4">
        {dashLoading ? <Spinner /> : (
          <>
            {/* Monthly Volume Chart */}
            {monthlyVolume.length > 0 && (
              <div className="bg-surface border border-border rounded-lg p-4">
                <div className="text-label text-text-dim mb-3">Monthly Transaction Volume</div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={monthlyVolume}>
                    <XAxis dataKey="month" tickFormatter={fmtMonth} tick={{ fontSize: 9, fill: '#8892A4' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#3A3F52' }} axisLine={false} tickLine={false} width={45} />
                    <Tooltip contentStyle={{ backgroundColor: '#1A1A2E', border: '1px solid #2A2A40', fontSize: 11 }} />
                    <Bar dataKey="offplan" stackId="a" fill={ORANGE} name="Off-Plan" />
                    <Bar dataKey="ready" stackId="a" fill={GREEN} name="Ready" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-2 text-[9px] text-text-dim">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ backgroundColor: ORANGE }} /> Off-Plan</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ backgroundColor: GREEN }} /> Ready</span>
                </div>
              </div>
            )}

            {/* Offplan vs Ready Split + EIBOR */}
            <div className="grid grid-cols-2 gap-3">
              {offplanSplit.length > 0 && (
                <div className="bg-surface border border-border rounded-lg p-4">
                  <div className="text-label text-text-dim mb-2">Off-Plan vs Ready (24mo)</div>
                  <div className="flex items-center">
                    <ResponsiveContainer width="45%" height={100}>
                      <PieChart>
                        <Pie data={offplanSplit} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={25} outerRadius={42}>
                          {offplanSplit.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-1.5">
                      {offplanSplit.map((o, idx) => (
                        <div key={o.label} className="text-micro">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                            <span className="text-text-secondary">{o.label}</span>
                          </div>
                          <div className="ml-3.5 font-mono text-text-dim">{fmtNum(o.count)} txns · AED {o.valueBn}B</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {eibor.length > 0 && (
                <div className="bg-surface border border-border rounded-lg p-4">
                  <div className="text-label text-text-dim mb-2">EIBOR Rates</div>
                  <div className="grid grid-cols-3 gap-2">
                    {(['rate_1m', 'rate_3m', 'rate_6m'] as const).map((key) => {
                      const val = eibor[0]?.[key];
                      const prev = eibor[1]?.[key];
                      return (
                        <div key={key} className="text-center">
                          <div className="text-micro text-text-dim">{key.replace('rate_', '').toUpperCase()}</div>
                          <div className="text-body font-mono text-text-primary">{val != null ? `${Number(val).toFixed(2)}%` : '—'}</div>
                          {prev != null && val != null && (
                            <div className={`text-micro font-mono ${Number(val) > Number(prev) ? 'text-[#E74C3C]' : 'text-[#27AE60]'}`}>
                              {Number(val) > Number(prev) ? '▲' : '▼'} {Math.abs(Number(val) - Number(prev)).toFixed(2)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-[9px] text-text-dim mt-2">As of {fmtDate(eibor[0].date)}</div>
                </div>
              )}
            </div>

            {/* Area Heatmap Table */}
            {areaHeat.length > 0 && (
              <div className="bg-surface border border-border rounded-lg p-4">
                <div className="text-label text-text-dim mb-3">Area Heatmap — Top 20 by Volume</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-micro">
                    <thead>
                      <tr className="text-left text-[9px] text-text-dim uppercase tracking-wider">
                        <th className="pb-2 pr-3">Area</th>
                        <th className="pb-2 pr-3 text-right">Txns</th>
                        <th className="pb-2 pr-3 text-right">Avg PSF</th>
                        <th className="pb-2 pr-3 text-right">Value</th>
                        <th className="pb-2 text-right">YoY PSF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {areaHeat.map((a) => (
                        <tr key={a.area} className="border-t border-border/50">
                          <td className="py-1.5 pr-3 text-text-primary truncate max-w-[140px]">{a.area}</td>
                          <td className="py-1.5 pr-3 text-right font-mono">{fmtNum(a.count)}</td>
                          <td className="py-1.5 pr-3 text-right font-mono text-gold">{fmtNum(a.avgPsf)}</td>
                          <td className="py-1.5 pr-3 text-right font-mono">{(a.totalValue / 1e9).toFixed(1)}B</td>
                          <td className="py-1.5 text-right"><PctBadge value={a.yoyPsfPct} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* YoY Analysis */}
            {yoy.length > 0 && (
              <div className="bg-surface border border-border rounded-lg p-4">
                <div className="text-label text-text-dim mb-3">Year-on-Year Analysis</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-micro">
                    <thead>
                      <tr className="text-left text-[9px] text-text-dim uppercase tracking-wider">
                        <th className="pb-2 pr-3">Area</th>
                        <th className="pb-2 pr-3 text-right">Cur Yr Txns</th>
                        <th className="pb-2 pr-3 text-right">Prev Yr Txns</th>
                        <th className="pb-2 pr-3 text-right">Vol Chg</th>
                        <th className="pb-2 pr-3 text-right">Cur PSF</th>
                        <th className="pb-2 pr-3 text-right">Prev PSF</th>
                        <th className="pb-2 text-right">PSF Chg</th>
                      </tr>
                    </thead>
                    <tbody>
                      {yoy.map((y) => (
                        <tr key={y.area} className="border-t border-border/50">
                          <td className="py-1.5 pr-3 text-text-primary truncate max-w-[120px]">{y.area}</td>
                          <td className="py-1.5 pr-3 text-right font-mono">{fmtNum(y.curYearCount)}</td>
                          <td className="py-1.5 pr-3 text-right font-mono text-text-dim">{fmtNum(y.prevYearCount)}</td>
                          <td className="py-1.5 pr-3 text-right"><PctBadge value={y.volumeChangePct} /></td>
                          <td className="py-1.5 pr-3 text-right font-mono text-gold">{fmtNum(y.curYearPsf)}</td>
                          <td className="py-1.5 pr-3 text-right font-mono text-text-dim">{fmtNum(y.prevYearPsf)}</td>
                          <td className="py-1.5 text-right"><PctBadge value={y.psfChangePct} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Tab: Rentals ───────────────────────────────────────────── */
function RentalsTab({
  rentalDeals, dealsLoading, loadMoreDeals, rentalTrends, dashLoading,
}: {
  rentalDeals: DealCard[]; dealsLoading: boolean; loadMoreDeals: () => void;
  rentalTrends: RentalTrend[]; dashLoading: boolean;
}) {
  // Group rental trends by area to show latest renewal_pct per area
  const latestByArea: Record<string, RentalTrend> = {};
  rentalTrends.forEach((t) => {
    if (!latestByArea[t.area] || t.periodStart > latestByArea[t.area].periodStart) {
      latestByArea[t.area] = t;
    }
  });
  const areaList = Object.values(latestByArea).sort((a, b) => b.totalContracts - a.totalContracts);
  const declining = areaList.filter((a) => a.renewalPct < 50).sort((a, b) => a.renewalPct - b.renewalPct);
  const increasing = areaList.filter((a) => a.renewalPct >= 50).sort((a, b) => b.renewalPct - a.renewalPct);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (dealsLoading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) loadMoreDeals();
      });
      if (node) observer.current.observe(node);
    },
    [dealsLoading, loadMoreDeals],
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left: Recent rental deals */}
      <div className="lg:w-2/5 space-y-2 max-h-[600px] overflow-y-auto pr-1">
        <div className="text-label text-text-dim mb-2">Recent Rental Contracts</div>
        {rentalDeals.map((d, i) => (
          <div key={d.id} ref={i === rentalDeals.length - 1 ? lastRef : undefined}>
            <DealCardItem deal={d} />
          </div>
        ))}
        {dealsLoading && <div className="flex justify-center py-4"><Loader2 className="animate-spin text-gold" size={18} /></div>}
      </div>

      {/* Right: Renewal analysis */}
      <div className="lg:w-3/5 space-y-4">
        {dashLoading ? <Spinner /> : (
          <>
            {/* Declining renewals */}
            {declining.length > 0 && (
              <div className="bg-surface border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingDown size={14} className="text-[#E74C3C]" />
                  <span className="text-label text-text-dim">Renewals Declining (Tenant Churn Risk)</span>
                </div>
                <div className="space-y-1.5">
                  {declining.slice(0, 10).map((a) => (
                    <div key={a.area} className="flex items-center gap-3 text-micro">
                      <span className="text-text-primary truncate flex-1">{a.area}</span>
                      <span className="font-mono text-text-dim">{fmtNum(a.totalContracts)} contracts</span>
                      <span className="font-mono" style={{ color: RED }}>{a.renewalPct.toFixed(0)}% renewal</span>
                      <span className="font-mono text-gold">{fmtAed(a.avgRent)}/yr</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Increasing renewals */}
            {increasing.length > 0 && (
              <div className="bg-surface border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={14} className="text-[#27AE60]" />
                  <span className="text-label text-text-dim">Renewals Increasing (Tenant Retention)</span>
                </div>
                <div className="space-y-1.5">
                  {increasing.slice(0, 10).map((a) => (
                    <div key={a.area} className="flex items-center gap-3 text-micro">
                      <span className="text-text-primary truncate flex-1">{a.area}</span>
                      <span className="font-mono text-text-dim">{fmtNum(a.totalContracts)} contracts</span>
                      <span className="font-mono" style={{ color: GREEN }}>{a.renewalPct.toFixed(0)}% renewal</span>
                      <span className="font-mono text-gold">{fmtAed(a.avgRent)}/yr</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Avg rent by area chart */}
            {areaList.length > 0 && (
              <div className="bg-surface border border-border rounded-lg p-4">
                <div className="text-label text-text-dim mb-3">Avg Annual Rent by Area</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={areaList.slice(0, 12)} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 9, fill: '#3A3F52' }} axisLine={false} tickLine={false}
                      tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
                    <YAxis type="category" dataKey="area" tick={{ fontSize: 9, fill: '#8892A4' }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip contentStyle={{ backgroundColor: '#1A1A2E', border: '1px solid #2A2A40', fontSize: 11 }}
                      formatter={(v: number | undefined) => [fmtAed(v ?? 0), 'Avg Rent']} />
                    <Bar dataKey="avgRent" fill={GOLD} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Tab: Capital Flow ──────────────────────────────────────── */
function CapitalTab({ capitalFlow, loading }: { capitalFlow: CapitalFlow[]; loading: boolean }) {
  if (loading) return <Spinner />;
  if (capitalFlow.length === 0) return <p className="text-body text-text-dim">No capital rotation data available</p>;

  // Group by quarter
  const quarters = [...new Set(capitalFlow.map((c) => c.quarter))].sort().reverse();
  const latestQ = quarters[0];
  const latestData = capitalFlow.filter((c) => c.quarter === latestQ).sort((a, b) => b.totalValueAed - a.totalValueAed);

  const SIGNAL_COLOR: Record<string, string> = {
    inflow: GREEN,
    outflow: RED,
    stable: '#8892A4',
    accelerating: GOLD,
  };

  return (
    <div className="space-y-4">
      <div className="text-label text-text-dim">Capital Rotation — {latestQ || 'Latest Quarter'}</div>

      {/* Top chart: value bars */}
      {latestData.length > 0 && (
        <div className="bg-surface border border-border rounded-lg p-4">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={latestData.slice(0, 15)}>
              <XAxis dataKey="area" tick={{ fontSize: 8, fill: '#8892A4' }} axisLine={false} tickLine={false} interval={0} angle={-25} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 9, fill: '#3A3F52' }} axisLine={false} tickLine={false} width={55}
                tickFormatter={(v: number) => `${(v / 1e9).toFixed(1)}B`} />
              <Tooltip contentStyle={{ backgroundColor: '#1A1A2E', border: '1px solid #2A2A40', fontSize: 11 }}
                formatter={(v: number | undefined) => [`AED ${((v ?? 0) / 1e9).toFixed(2)}B`, 'Total Value']} />
              <Bar dataKey="totalValueAed" fill={GOLD} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="bg-surface border border-border rounded-lg p-4 overflow-x-auto">
        <table className="w-full text-micro">
          <thead>
            <tr className="text-left text-[9px] text-text-dim uppercase tracking-wider">
              <th className="pb-2 pr-3">Area</th>
              <th className="pb-2 pr-3 text-right">Txns</th>
              <th className="pb-2 pr-3 text-right">Total Value</th>
              <th className="pb-2 pr-3 text-right">Avg Price</th>
              <th className="pb-2 pr-3 text-right">QoQ</th>
              <th className="pb-2 pr-3 text-right">YoY</th>
              <th className="pb-2">Signal</th>
            </tr>
          </thead>
          <tbody>
            {latestData.map((c) => (
              <tr key={c.area} className="border-t border-border/50">
                <td className="py-1.5 pr-3 text-text-primary truncate max-w-[120px]">{c.area}</td>
                <td className="py-1.5 pr-3 text-right font-mono">{fmtNum(c.txnCount)}</td>
                <td className="py-1.5 pr-3 text-right font-mono">{(c.totalValueAed / 1e9).toFixed(2)}B</td>
                <td className="py-1.5 pr-3 text-right font-mono text-gold">{fmtAed(c.avgPrice)}</td>
                <td className="py-1.5 pr-3 text-right"><PctBadge value={c.qoqPricePct} /></td>
                <td className="py-1.5 pr-3 text-right"><PctBadge value={c.yoyPricePct} /></td>
                <td className="py-1.5">
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                    style={{ color: SIGNAL_COLOR[c.rotationSignal?.toLowerCase()] ?? '#8892A4',
                      backgroundColor: `${SIGNAL_COLOR[c.rotationSignal?.toLowerCase()] ?? '#8892A4'}18` }}>
                    {c.rotationSignal || '—'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Tab: Supply Pipeline ───────────────────────────────────── */
function SupplyTab({ supplyPipeline, loading }: { supplyPipeline: SupplyItem[]; loading: boolean }) {
  if (loading) return <Spinner />;
  if (supplyPipeline.length === 0) return <p className="text-body text-text-dim">No supply pipeline data available</p>;

  return (
    <div className="space-y-4">
      <div className="text-label text-text-dim">Off-Plan Supply Pipeline — Active Phases</div>

      {/* Completion chart */}
      <div className="bg-surface border border-border rounded-lg p-4">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={supplyPipeline.slice(0, 15)} layout="vertical">
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9, fill: '#3A3F52' }} axisLine={false} tickLine={false}
              tickFormatter={(v: number) => `${v}%`} />
            <YAxis type="category" dataKey="phaseName" tick={{ fontSize: 8, fill: '#8892A4' }} axisLine={false} tickLine={false} width={120} />
            <Tooltip contentStyle={{ backgroundColor: '#1A1A2E', border: '1px solid #2A2A40', fontSize: 11 }}
              formatter={(v: number | undefined) => [`${v ?? 0}%`, 'Completion']} />
            <Bar dataKey="completionPct" fill={BLUE} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-lg p-4 overflow-x-auto">
        <table className="w-full text-micro">
          <thead>
            <tr className="text-left text-[9px] text-text-dim uppercase tracking-wider">
              <th className="pb-2 pr-3">Phase</th>
              <th className="pb-2 pr-3">Project</th>
              <th className="pb-2 pr-3">Developer</th>
              <th className="pb-2 pr-3 text-right">Launch</th>
              <th className="pb-2 pr-3 text-right">Completion</th>
              <th className="pb-2 text-right">PSF</th>
            </tr>
          </thead>
          <tbody>
            {supplyPipeline.map((s, i) => (
              <tr key={i} className="border-t border-border/50">
                <td className="py-1.5 pr-3 text-text-primary truncate max-w-[120px]">{s.phaseName}</td>
                <td className="py-1.5 pr-3 text-text-secondary truncate max-w-[100px]">{s.masterProject}</td>
                <td className="py-1.5 pr-3 text-text-dim truncate max-w-[100px]">{s.developer}</td>
                <td className="py-1.5 pr-3 text-right text-text-dim">{s.launchDate ? fmtDate(s.launchDate) : '—'}</td>
                <td className="py-1.5 pr-3 text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${s.completionPct}%`, backgroundColor: s.completionPct > 70 ? GREEN : s.completionPct > 30 ? ORANGE : BLUE }} />
                    </div>
                    <span className="font-mono text-text-dim">{s.completionPct}%</span>
                  </div>
                </td>
                <td className="py-1.5 text-right font-mono text-gold">{s.currentPsf > 0 ? fmtNum(s.currentPsf) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────── */
export function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>('sales');
  const data = useHomeData();

  const tabs: { key: Tab; label: string }[] = [
    { key: 'feed', label: 'Intelligence Feed' },
    { key: 'sales', label: 'Sales Dashboard' },
    { key: 'rentals', label: 'Rentals' },
    { key: 'capital', label: 'Capital Rotation' },
    { key: 'supply', label: 'Supply Pipeline' },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-0 shrink-0">
        <h1 className="text-heading font-semibold">ZeroAgent</h1>
        <p className="text-body text-text-secondary mb-4">Dubai Real Estate Intelligence Terminal</p>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-border pb-px">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 text-body font-medium border-b-2 -mb-px transition-colors ${
                activeTab === t.key ? 'border-gold text-gold' : 'border-transparent text-text-dim hover:text-text-secondary'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'feed' && (
          <FeedTab feed={data.feed} loading={data.feedLoading} />
        )}

        {activeTab === 'sales' && (
          <SalesTab
            offplanDeals={data.offplanDeals}
            readyDeals={data.readyDeals}
            dealsLoading={data.dealsLoading}
            loadMoreDeals={data.loadMoreDeals}
            monthlyVolume={data.monthlyVolume}
            offplanSplit={data.offplanSplit}
            areaHeat={data.areaHeat}
            yoy={data.yoy}
            eibor={data.eibor}
            dashLoading={data.dashLoading}
          />
        )}

        {activeTab === 'rentals' && (
          <RentalsTab
            rentalDeals={data.rentalDeals}
            dealsLoading={data.dealsLoading}
            loadMoreDeals={data.loadMoreDeals}
            rentalTrends={data.rentalTrends}
            dashLoading={data.dashLoading}
          />
        )}

        {activeTab === 'capital' && (
          <CapitalTab capitalFlow={data.capitalFlow} loading={data.dashLoading} />
        )}

        {activeTab === 'supply' && (
          <SupplyTab supplyPipeline={data.supplyPipeline} loading={data.dashLoading} />
        )}
      </div>
    </div>
  );
}
