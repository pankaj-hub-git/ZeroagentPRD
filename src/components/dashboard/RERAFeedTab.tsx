import { useState, useEffect } from 'react';
import { bronze } from '@/lib/supabase';
import { fmtDate } from '@/lib/constants';
import { useTheme } from '@/lib/theme';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';

interface RERAItem {
  id: string;
  event_name: string;
  policy_type: string;
  direction: string;
  description: string;
  estimated_impact_pct: number;
  affected_communities: string[];
  event_date: string;
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

function RERACard({ item }: { item: RERAItem }) {
  const { colors } = useTheme();
  const GREEN = colors.green;
  const RED = colors.red;
  const BLUE = colors.blue;
  const ORANGE = colors.orange;
  const borderColor = item.direction === 'bullish' ? GREEN : item.direction === 'bearish' ? RED : BLUE;
  const impactDots = Math.min(Math.round(item.estimated_impact_pct || 0), 5);
  return (
    <div className="bg-surface rounded-lg p-3 hover:bg-white/[0.03] transition-colors"
      style={{ borderLeft: `3px solid ${borderColor}` }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold tracking-wider" style={{ color: ORANGE }}>RERA</span>
        <div className="flex items-center gap-2">
          {item.direction && (
            <span className="flex items-center gap-0.5 text-micro" style={{ color: borderColor }}>
              {item.direction === 'bullish' ? <TrendingUp size={10} /> : item.direction === 'bearish' ? <TrendingDown size={10} /> : null}
              {item.direction.toUpperCase()}
            </span>
          )}
          {impactDots > 0 && (
            <span className="text-micro text-text-dim font-mono">
              {'●'.repeat(impactDots)}{'○'.repeat(5 - impactDots)}
            </span>
          )}
        </div>
      </div>
      <div className="text-body font-medium text-text-primary line-clamp-2 mb-1">{item.event_name}</div>
      <div className="text-micro text-text-secondary line-clamp-2 mb-2">{item.description}</div>
      {item.policy_type && (
        <span className="text-[9px] px-1.5 py-0.5 bg-white/5 text-text-dim rounded mr-2">{item.policy_type}</span>
      )}
      {item.affected_communities?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {item.affected_communities.slice(0, 4).map((c, i) => (
            <span key={i} className="text-[9px] px-1.5 py-0.5 bg-white/5 text-text-dim rounded">{c}</span>
          ))}
        </div>
      )}
      <div className="text-micro text-text-dim mt-1.5">{relativeTime(item.event_date)}</div>
    </div>
  );
}

export function RERAFeedTab() {
  const [items, setItems] = useState<RERAItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFiltered, setIsFiltered] = useState(true);

  useEffect(() => {
    const run = async () => {
      // Try RERA-filtered first
      const { data: reraData } = await bronze().from('policy_events')
        .select('event_name, policy_type, direction, description, estimated_impact_pct, affected_communities, event_date')
        .or('policy_type.ilike.%rera%,policy_type.ilike.%registration%,policy_type.ilike.%regulatory%,event_name.ilike.%rera%')
        .order('event_date', { ascending: false })
        .limit(30);

      if (reraData && reraData.length > 0) {
        setItems(reraData.map((r: Record<string, unknown>, i: number) => ({
          id: `rera-${i}`,
          event_name: (r.event_name as string) ?? '',
          policy_type: (r.policy_type as string) ?? '',
          direction: (r.direction as string) ?? '',
          description: (r.description as string) ?? '',
          estimated_impact_pct: (r.estimated_impact_pct as number) ?? 0,
          affected_communities: Array.isArray(r.affected_communities) ? r.affected_communities as string[] : [],
          event_date: (r.event_date as string) ?? '',
        })));
        setIsFiltered(true);
      } else {
        // Fallback: show all policy events
        const { data: allData } = await bronze().from('policy_events')
          .select('event_name, policy_type, direction, description, estimated_impact_pct, affected_communities, event_date')
          .order('event_date', { ascending: false })
          .limit(30);

        setItems((allData ?? []).map((r: Record<string, unknown>, i: number) => ({
          id: `pol-${i}`,
          event_name: (r.event_name as string) ?? '',
          policy_type: (r.policy_type as string) ?? '',
          direction: (r.direction as string) ?? '',
          description: (r.description as string) ?? '',
          estimated_impact_pct: (r.estimated_impact_pct as number) ?? 0,
          affected_communities: Array.isArray(r.affected_communities) ? r.affected_communities as string[] : [],
          event_date: (r.event_date as string) ?? '',
        })));
        setIsFiltered(false);
      }
      setLoading(false);
    };
    run();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gold" size={24} /></div>;

  if (items.length === 0) return <p className="text-body text-text-dim">No RERA announcements available</p>;

  return (
    <div>
      {!isFiltered && (
        <div className="text-micro text-text-dim mb-3 px-1 py-2 bg-white/[0.02] rounded border border-border">
          Showing all policy events — RERA-specific filtering will activate when RERA data is available
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map(item => <RERACard key={item.id} item={item} />)}
      </div>
    </div>
  );
}
