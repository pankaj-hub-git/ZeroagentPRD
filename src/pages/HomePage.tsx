import { useState } from 'react';
import { useHomeData, FeedItem, CapitalFlow } from '@/hooks/useHomeData';
import { fmtNum, fmtDate, fmtAed } from '@/lib/constants';
import { useTheme } from '@/lib/theme';
import { Loader2, TrendingUp, TrendingDown, Sun, Moon } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { MarketDashboard } from '@/components/dashboard/MarketDashboard';
import { TransactionsFeedTab } from '@/components/dashboard/TransactionsFeedTab';
import { TourismDashboard } from '@/components/dashboard/TourismDashboard';
import { MacroTicker } from '@/components/dashboard/MacroTicker';

// Use theme-aware CSS variables for colors
const GOLD = 'var(--color-gold)';
const BLUE = 'var(--color-info)';
const GREEN = 'var(--color-verified)';
const RED = 'var(--color-danger)';
const ORANGE = 'var(--color-warn)';

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
  return v > 0 ? GREEN : v < 0 ? RED : 'var(--color-text-secondary)';
}

function PctBadge({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-micro font-mono" style={{ color: pctColor(value) }}>
      {value > 0 ? <TrendingUp size={10} /> : value < 0 ? <TrendingDown size={10} /> : null}
      {value > 0 ? '+' : ''}{value.toFixed(1)}%
    </span>
  );
}

const SOURCE_STYLE: Record<string, { label: string; color: string }> = {
  government: { label: 'GOV CATALYST', color: BLUE },
  safe_haven: { label: 'SAFE HAVEN', color: ORANGE },
  policy: { label: 'POLICY', color: RED },
};

type Tab = 'feed' | 'dashboard' | 'transactions' | 'tourism' | 'capital';

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

/* ── Tab: Capital Flow ──────────────────────────────────────── */
function CapitalTab({ capitalFlow, loading }: { capitalFlow: CapitalFlow[]; loading: boolean }) {
  const [selectedQ, setSelectedQ] = useState<string>('');
  const { mode } = useTheme();

  if (loading) return <Spinner />;
  if (capitalFlow.length === 0) return <p className="text-body text-text-dim">No capital rotation data available</p>;

  // Available quarters sorted descending
  const quarters = [...new Set(capitalFlow.map((c) => c.quarter))].sort().reverse();
  const activeQ = selectedQ || quarters[0] || '';

  // Filter to selected quarter, only high-volume areas (>=10 txns), sorted by total value
  const qData = capitalFlow
    .filter((c) => c.quarter === activeQ && c.txnCount >= 10)
    .sort((a, b) => b.totalValueAed - a.totalValueAed);

  // Cross-quarter trend: aggregate total txns & value per area across all quarters
  const areaAgg: Record<string, { txns: number; value: number; latestSignal: string; latestCfi: number; latestQ: string }> = {};
  capitalFlow.filter((c) => c.txnCount >= 10).forEach((c) => {
    if (!areaAgg[c.area]) areaAgg[c.area] = { txns: 0, value: 0, latestSignal: '', latestCfi: 0, latestQ: '' };
    areaAgg[c.area].txns += c.txnCount;
    areaAgg[c.area].value += c.totalValueAed;
    if (!areaAgg[c.area].latestQ || c.quarter > areaAgg[c.area].latestQ) {
      areaAgg[c.area].latestSignal = c.rotationSignal;
      areaAgg[c.area].latestCfi = c.cfiScore;
      areaAgg[c.area].latestQ = c.quarter;
    }
  });
  const topAreas = Object.entries(areaAgg).sort(([, a], [, b]) => b.value - a.value).slice(0, 20);

  // Hardcoded hex colors needed for opacity suffix trick (${color}18)
  const isDark = mode === 'dark';
  const SIGNAL_COLOR: Record<string, string> = {
    inflow: isDark ? '#2DD4A0' : '#1B8A6B',
    outflow: isDark ? '#F06D5B' : '#C0392B',
    stable: isDark ? '#8892A4' : '#444444',
    accelerating: isDark ? '#D4A843' : '#6B5518',
  };

  return (
    <div className="space-y-4">
      {/* Quarter selector */}
      <div className="flex items-center gap-3">
        <span className="text-label text-text-dim">Capital Rotation</span>
        <div className="flex gap-1 flex-wrap">
          {quarters.map((q) => (
            <button key={q} onClick={() => setSelectedQ(q)}
              className={`px-2.5 py-1 text-micro rounded-md transition-colors ${
                activeQ === q ? 'bg-gold/15 text-gold font-medium' : 'text-text-dim hover:text-text-secondary'
              }`}>
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Summary: total areas with high volume */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface border border-border rounded-lg p-3">
          <div className="text-[9px] text-text-dim uppercase tracking-wider mb-1">Areas (≥10 txns)</div>
          <div className="text-heading font-mono text-text-primary">{qData.length}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-3">
          <div className="text-[9px] text-text-dim uppercase tracking-wider mb-1">Total Txns</div>
          <div className="text-heading font-mono text-text-primary">{fmtNum(qData.reduce((s, c) => s + c.txnCount, 0))}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-3">
          <div className="text-[9px] text-text-dim uppercase tracking-wider mb-1">Total Value</div>
          <div className="text-heading font-mono text-gold">AED {(qData.reduce((s, c) => s + c.totalValueAed, 0) / 1e9).toFixed(1)}B</div>
        </div>
      </div>

      {/* Top chart: value bars for selected quarter */}
      {qData.length > 0 && (
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-label text-text-dim mb-2">{activeQ} — Value by Area</div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={qData.slice(0, 15)}>
              <XAxis dataKey="area" tick={{ fontSize: 8, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} interval={0} angle={-25} textAnchor="end" height={55} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--color-text-dim)' }} axisLine={false} tickLine={false} width={55}
                tickFormatter={(v: number) => `${(v / 1e9).toFixed(1)}B`} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--color-tooltip-bg)', border: '1px solid var(--color-tooltip-border)', fontSize: 11 }}
                formatter={(v: number | undefined) => [`AED ${((v ?? 0) / 1e9).toFixed(2)}B`, 'Total Value']} />
              <Bar dataKey="totalValueAed" fill={GOLD} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Quarterly detail table */}
      <div className="bg-surface border border-border rounded-lg p-4 overflow-x-auto">
        <div className="text-label text-text-dim mb-3">{activeQ} — High-Volume Capital Flows</div>
        <table className="w-full text-micro">
          <thead>
            <tr className="text-left text-[9px] text-text-dim uppercase tracking-wider">
              <th className="pb-2 pr-3">Area</th>
              <th className="pb-2 pr-3 text-right">Txns</th>
              <th className="pb-2 pr-3 text-right">Total Value</th>
              <th className="pb-2 pr-3 text-right">Avg Price</th>
              <th className="pb-2 pr-3 text-right">QoQ</th>
              <th className="pb-2 pr-3 text-right">YoY</th>
              <th className="pb-2 pr-3 text-right">CFI</th>
              <th className="pb-2">Signal</th>
            </tr>
          </thead>
          <tbody>
            {qData.map((c) => (
              <tr key={c.area} className="border-t border-border/50">
                <td className="py-1.5 pr-3 text-text-primary truncate max-w-[120px]">{c.area}</td>
                <td className="py-1.5 pr-3 text-right font-mono">{fmtNum(c.txnCount)}</td>
                <td className="py-1.5 pr-3 text-right font-mono">{(c.totalValueAed / 1e9).toFixed(2)}B</td>
                <td className="py-1.5 pr-3 text-right font-mono text-gold">{fmtAed(c.avgPrice)}</td>
                <td className="py-1.5 pr-3 text-right"><PctBadge value={c.qoqPricePct} /></td>
                <td className="py-1.5 pr-3 text-right"><PctBadge value={c.yoyPricePct} /></td>
                <td className="py-1.5 pr-3 text-right">
                  <span className="font-mono text-[10px]"
                    style={{ color: c.cfiScore >= 70 ? (isDark ? '#2DD4A0' : '#1B8A6B') : c.cfiScore >= 40 ? (isDark ? '#D4A843' : '#6B5518') : (isDark ? '#8892A4' : '#444444') }}>
                    {c.cfiScore > 0 ? c.cfiScore : '—'}
                  </span>
                </td>
                <td className="py-1.5">
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                    style={{ color: SIGNAL_COLOR[c.rotationSignal?.toLowerCase()] ?? SIGNAL_COLOR.stable,
                      backgroundColor: `${SIGNAL_COLOR[c.rotationSignal?.toLowerCase()] ?? SIGNAL_COLOR.stable}18` }}>
                    {c.rotationSignal || '—'}
                  </span>
                </td>
              </tr>
            ))}
            {qData.length === 0 && (
              <tr><td colSpan={8} className="py-4 text-center text-text-dim">No high-volume areas in this quarter</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Cross-quarter cumulative leaders */}
      {topAreas.length > 0 && (
        <div className="bg-surface border border-border rounded-lg p-4 overflow-x-auto">
          <div className="text-label text-text-dim mb-3">All-Time Capital Leaders (cumulative across quarters)</div>
          <table className="w-full text-micro">
            <thead>
              <tr className="text-left text-[9px] text-text-dim uppercase tracking-wider">
                <th className="pb-2 pr-3">#</th>
                <th className="pb-2 pr-3">Area</th>
                <th className="pb-2 pr-3 text-right">Total Txns</th>
                <th className="pb-2 pr-3 text-right">Total Value</th>
                <th className="pb-2 pr-3 text-right">CFI</th>
                <th className="pb-2">Latest Signal</th>
              </tr>
            </thead>
            <tbody>
              {topAreas.map(([area, agg], i) => (
                <tr key={area} className="border-t border-border/50">
                  <td className="py-1.5 pr-3 text-text-dim font-mono">{i + 1}</td>
                  <td className="py-1.5 pr-3 text-text-primary truncate max-w-[140px]">{area}</td>
                  <td className="py-1.5 pr-3 text-right font-mono">{fmtNum(agg.txns)}</td>
                  <td className="py-1.5 pr-3 text-right font-mono text-gold">AED {(agg.value / 1e9).toFixed(2)}B</td>
                  <td className="py-1.5 pr-3 text-right">
                    <span className="font-mono text-[10px]"
                      style={{ color: agg.latestCfi >= 70 ? (isDark ? '#2DD4A0' : '#1B8A6B') : agg.latestCfi >= 40 ? (isDark ? '#D4A843' : '#6B5518') : (isDark ? '#8892A4' : '#444444') }}>
                      {agg.latestCfi > 0 ? agg.latestCfi : '—'}
                    </span>
                  </td>
                  <td className="py-1.5">
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ color: SIGNAL_COLOR[agg.latestSignal?.toLowerCase()] ?? SIGNAL_COLOR.stable,
                        backgroundColor: `${SIGNAL_COLOR[agg.latestSignal?.toLowerCase()] ?? SIGNAL_COLOR.stable}18` }}>
                      {agg.latestSignal || '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────── */
export function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const data = useHomeData();
  const { mode, toggle } = useTheme();

  const tabs: { key: Tab; label: string }[] = [
    { key: 'feed', label: 'Intelligence Feed' },
    { key: 'dashboard', label: 'Market Dashboard' },
    { key: 'transactions', label: 'Transactions' },
    { key: 'tourism', label: 'Tourism' },
    { key: 'capital', label: 'Capital Rotation' },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-0 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-heading font-semibold">ZeroAgent</h1>
            <p className="text-body text-text-secondary mb-4">Dubai Real Estate Intelligence Terminal</p>
          </div>
          <button onClick={toggle}
            className="p-2 rounded-lg border border-border hover:bg-surface transition-colors"
            title={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}>
            {mode === 'dark' ? <Sun size={16} className="text-gold" /> : <Moon size={16} className="text-gold" />}
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-border pb-px overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 text-body font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                activeTab === t.key ? 'border-gold text-gold' : 'border-transparent text-text-dim hover:text-text-secondary'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Macro Ticker */}
      <div className="shrink-0">
        <MacroTicker />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'feed' && (
          <FeedTab feed={data.feed} loading={data.feedLoading} />
        )}

        {activeTab === 'dashboard' && <MarketDashboard />}

        {activeTab === 'transactions' && <TransactionsFeedTab />}

        {activeTab === 'tourism' && <TourismDashboard />}

        {activeTab === 'capital' && (
          <CapitalTab capitalFlow={data.capitalFlow} loading={data.dashLoading} />
        )}
      </div>
    </div>
  );
}
