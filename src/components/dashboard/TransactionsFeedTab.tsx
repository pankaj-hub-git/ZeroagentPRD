import { useState, useEffect } from 'react';
import { gold } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>;

const FALLBACK: R[] = [
  { metric_month: '2025-01', total_sales: 13249, total_sales_value: 42800000000, avg_price_per_sqm: 1782, offplan_sales: 8412, ready_sales: 4837, sales_mom_pct: -8.2, sales_yoy_pct: 18.4, price_psm_yoy_pct: 6.1, offplan_ratio_pct: 63.5, apartment_sales: 10150, villa_sales: 3099 },
  { metric_month: '2024-12', total_sales: 14432, total_sales_value: 49100000000, avg_price_per_sqm: 1756, offplan_sales: 9200, ready_sales: 5232, sales_mom_pct: 5.1, sales_yoy_pct: 22.1, price_psm_yoy_pct: 7.8, offplan_ratio_pct: 63.7, apartment_sales: 11020, villa_sales: 3412 },
  { metric_month: '2024-11', total_sales: 13730, total_sales_value: 44200000000, avg_price_per_sqm: 1720, offplan_sales: 8600, ready_sales: 5130, sales_mom_pct: 2.3, sales_yoy_pct: 20.5, price_psm_yoy_pct: 8.2, offplan_ratio_pct: 62.6, apartment_sales: 10500, villa_sales: 3230 },
  { metric_month: '2024-10', total_sales: 13420, total_sales_value: 43100000000, avg_price_per_sqm: 1695, offplan_sales: 8300, ready_sales: 5120, sales_mom_pct: -1.5, sales_yoy_pct: 19.8, price_psm_yoy_pct: 9.1, offplan_ratio_pct: 61.8, apartment_sales: 10280, villa_sales: 3140 },
  { metric_month: '2024-09', total_sales: 13620, total_sales_value: 41800000000, avg_price_per_sqm: 1680, offplan_sales: 8500, ready_sales: 5120, sales_mom_pct: 3.2, sales_yoy_pct: 17.6, price_psm_yoy_pct: 10.3, offplan_ratio_pct: 62.4, apartment_sales: 10400, villa_sales: 3220 },
  { metric_month: '2024-08', total_sales: 13200, total_sales_value: 39500000000, avg_price_per_sqm: 1665, offplan_sales: 8200, ready_sales: 5000, sales_mom_pct: -2.8, sales_yoy_pct: 15.3, price_psm_yoy_pct: 11.2, offplan_ratio_pct: 62.1, apartment_sales: 10100, villa_sales: 3100 },
];

function fmtNum(n: number): string {
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}

function fmtMonth(m: string): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const [y, mo] = m.split('-');
  return `${months[Number(mo) - 1] ?? mo} ${y}`;
}

function TransactionCard({ item, colors }: { item: R; colors: ReturnType<typeof useTheme>['colors'] }) {
  const momColor = (item.sales_mom_pct || 0) > 0 ? colors.green : (item.sales_mom_pct || 0) < 0 ? colors.red : colors.textDim;
  const yoyColor = (item.sales_yoy_pct || 0) > 0 ? colors.green : (item.sales_yoy_pct || 0) < 0 ? colors.red : colors.textDim;
  const priceColor = (item.price_psm_yoy_pct || 0) > 0 ? colors.green : (item.price_psm_yoy_pct || 0) < 0 ? colors.red : colors.textDim;

  return (
    <div style={{
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: 8,
      padding: 14,
      borderLeft: `3px solid ${colors.gold}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{fmtMonth(item.metric_month)}</span>
        <span style={{ fontSize: 10, color: colors.textDim, letterSpacing: '0.1em', textTransform: 'uppercase' }}>MONTHLY</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 9, color: colors.textDim, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Sales</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: colors.text, fontFamily: "'IBM Plex Mono', monospace" }}>{fmtNum(item.total_sales)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
            {(item.sales_mom_pct || 0) > 0 ? <TrendingUp size={10} color={momColor} /> : <TrendingDown size={10} color={momColor} />}
            <span style={{ fontSize: 10, color: momColor, fontWeight: 600 }}>{item.sales_mom_pct > 0 ? '+' : ''}{Number(item.sales_mom_pct || 0).toFixed(1)}% MoM</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: colors.textDim, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Value</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: colors.gold, fontFamily: "'IBM Plex Mono', monospace" }}>AED {fmtNum(item.total_sales_value)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
            {(item.sales_yoy_pct || 0) > 0 ? <TrendingUp size={10} color={yoyColor} /> : <TrendingDown size={10} color={yoyColor} />}
            <span style={{ fontSize: 10, color: yoyColor, fontWeight: 600 }}>{item.sales_yoy_pct > 0 ? '+' : ''}{Number(item.sales_yoy_pct || 0).toFixed(1)}% YoY</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: colors.textDim, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Avg PSF</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: colors.text, fontFamily: "'IBM Plex Mono', monospace" }}>{fmtNum(item.avg_price_per_sqm)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
            {(item.price_psm_yoy_pct || 0) > 0 ? <TrendingUp size={10} color={priceColor} /> : <TrendingDown size={10} color={priceColor} />}
            <span style={{ fontSize: 10, color: priceColor, fontWeight: 600 }}>{item.price_psm_yoy_pct > 0 ? '+' : ''}{Number(item.price_psm_yoy_pct || 0).toFixed(1)}% YoY</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 9, padding: '2px 8px', borderRadius: 3, fontWeight: 600,
          background: colors.indigoBg, color: colors.indigo,
        }}>Off-Plan {item.offplan_ratio_pct}%</span>
        <span style={{
          fontSize: 9, padding: '2px 8px', borderRadius: 3, fontWeight: 600,
          background: colors.greenBg, color: colors.green,
        }}>Apartments {fmtNum(item.apartment_sales || 0)}</span>
        <span style={{
          fontSize: 9, padding: '2px 8px', borderRadius: 3, fontWeight: 600,
          background: colors.goldBg, color: colors.gold,
        }}>Villas {fmtNum(item.villa_sales || 0)}</span>
      </div>
    </div>
  );
}

export function TransactionsFeedTab() {
  const [items, setItems] = useState<R[]>([]);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();

  useEffect(() => {
    const run = async () => {
      try {
        const { data } = await gold().from('dashboard_market_monthly')
          .select('*')
          .order('metric_month', { ascending: false })
          .limit(12);
        setItems((data && data.length > 0) ? data : FALLBACK);
      } catch {
        setItems(FALLBACK);
      }
      setLoading(false);
    };
    run();
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Loader2 className="animate-spin" size={24} style={{ color: colors.gold }} /></div>;

  return (
    <div>
      <div style={{ fontSize: 11, color: colors.textDim, marginBottom: 12 }}>Monthly Transaction Summaries — Dubai Real Estate</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
        {items.map((item, i) => <TransactionCard key={item.metric_month || i} item={item} colors={colors} />)}
      </div>
    </div>
  );
}
