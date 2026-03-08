import { useState, useEffect } from 'react';
import { gold } from '@/lib/supabase';
import { fmtDate } from '@/lib/constants';
import { useTheme } from '@/lib/theme';
import { Loader2 } from 'lucide-react';

interface PhaseItem {
  id: string;
  phase_name: string;
  master_project_en: string;
  developer_name: string;
  developer_tier: string;
  launch_date: string;
  completion_pct: number;
  current_psm: number;
  total_return_pct: number;
  qoq_momentum: string;
}

function useTierColors() {
  const { colors } = useTheme();
  return {
    premium: { bg: `${colors.gold}18`, color: colors.gold },
    mid_tier: { bg: `${colors.blue}18`, color: colors.blue },
    budget: { bg: `${colors.textSecondary}18`, color: colors.textSecondary },
    new_entrant: { bg: `${colors.orange}18`, color: colors.orange },
  } as Record<string, { bg: string; color: string }>;
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
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return fmtDate(iso);
}

function PhaseCard({ item }: { item: PhaseItem }) {
  const { colors } = useTheme();
  const TIER_COLORS = useTierColors();
  const GREEN = colors.green;
  const ORANGE = colors.orange;
  const BLUE = colors.blue;
  const tier = TIER_COLORS[item.developer_tier] || TIER_COLORS.budget;
  const completionColor = item.completion_pct >= 80 ? GREEN : item.completion_pct >= 40 ? ORANGE : BLUE;

  return (
    <div className="bg-surface border border-border rounded-lg p-3 hover:border-gold/20 transition-colors">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded tracking-wide"
            style={{ color: tier.color, backgroundColor: tier.bg }}>
            {item.developer_name?.slice(0, 20)}
          </span>
          {item.developer_tier && (
            <span className="text-[8px] text-text-dim uppercase tracking-wider">{item.developer_tier.replace('_', ' ')}</span>
          )}
        </div>
        <span className="text-micro text-text-dim">{relativeTime(item.launch_date)}</span>
      </div>

      <div className="text-body font-medium text-text-primary truncate mb-0.5">{item.phase_name}</div>
      <div className="text-micro text-text-secondary mb-2">at {item.master_project_en}</div>

      {/* Completion bar */}
      <div className="flex items-center gap-2 mb-1.5">
        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{
            width: `${Math.min(item.completion_pct, 100)}%`,
            backgroundColor: completionColor,
          }} />
        </div>
        <span className="text-micro font-mono" style={{ color: completionColor }}>{item.completion_pct}%</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-micro font-mono text-gold">
          AED {item.current_psm ? Number(item.current_psm).toLocaleString() : '—'}/sqm
        </span>
        <div className="flex items-center gap-2">
          {item.total_return_pct != null && (
            <span className="text-micro font-mono" style={{ color: item.total_return_pct > 0 ? GREEN : item.total_return_pct < 0 ? colors.red : colors.textSecondary }}>
              {item.total_return_pct > 0 ? '+' : ''}{Number(item.total_return_pct).toFixed(1)}%
            </span>
          )}
          {item.qoq_momentum && (
            <span className="text-[9px] px-1.5 py-0.5 bg-white/5 text-text-dim rounded">{item.qoq_momentum}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function DeveloperNewsTab() {
  const [items, setItems] = useState<PhaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const { data } = await gold().from('phase_registry')
        .select('phase_name, master_project_en, developer_name, developer_tier, launch_date, completion_pct, current_psm, total_return_pct, qoq_momentum')
        .order('launch_date', { ascending: false })
        .limit(50);

      setItems((data ?? []).map((r: Record<string, unknown>, i: number) => ({
        id: `dev-${i}`,
        phase_name: (r.phase_name as string) ?? '',
        master_project_en: (r.master_project_en as string) ?? '',
        developer_name: (r.developer_name as string) ?? '',
        developer_tier: (r.developer_tier as string) ?? '',
        launch_date: (r.launch_date as string) ?? '',
        completion_pct: (r.completion_pct as number) ?? 0,
        current_psm: (r.current_psm as number) ?? 0,
        total_return_pct: (r.total_return_pct as number) ?? 0,
        qoq_momentum: (r.qoq_momentum as string) ?? '',
      })));
      setLoading(false);
    };
    run();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gold" size={24} /></div>;

  if (items.length === 0) return <p className="text-body text-text-dim">No developer announcements available</p>;

  return (
    <div>
      <div className="text-label text-text-dim mb-3">Recent Phase Launches & Developer Activity</div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map(item => <PhaseCard key={item.id} item={item} />)}
      </div>
    </div>
  );
}
