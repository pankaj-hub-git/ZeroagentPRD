import { useEffect, useState } from 'react';
import { useNavStore } from '@/store/navigation';
import { sb } from '@/lib/supabase';
import { fmtPct, fmtNum } from '@/lib/constants';
import { Loader2 } from 'lucide-react';

export function HandoverImpact() {
  const { activeCommunity } = useNavStore();
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeCommunity) {
      setLoading(false);
      return;
    }
    const run = async () => {
      const { data: rows } = await sb
        .from('gold.phase_signals')
        .select('*')
        .eq('target_community', activeCommunity)
        .eq('signal_type', 'HANDOVER_FORECAST')
        .order('similarity_score', { ascending: false })
        .limit(3);

      if (rows) setData(rows as Record<string, unknown>[]);
      setLoading(false);
    };
    run();
  }, [activeCommunity]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-gold" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-micro text-text-dim">
        Forecasting handover impact for: {activeCommunity ?? 'Select a community'}
      </p>

      {data.length === 0 ? (
        <p className="text-body text-text-dim py-10 text-center">
          No handover forecast data available for this community.
        </p>
      ) : (
        data.map((row, i) => (
          <div key={i} className="bg-bg rounded-lg p-4 border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-body font-medium text-text-primary">
                {(row.matched_phase as string) ?? `Comparable ${i + 1}`}
              </span>
              <span className="text-micro text-gold font-mono">
                {fmtPct((row.similarity_score as number) ?? 0)} match
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-micro">
              <div>
                <span className="text-text-dim">Units</span>
                <div className="font-mono">{fmtNum((row.units_count as number) ?? 0)}</div>
              </div>
              <div>
                <span className="text-text-dim">6m Price Impact</span>
                <div className="font-mono">{fmtPct((row.price_impact_6m_pct as number) ?? 0)}</div>
              </div>
              <div>
                <span className="text-text-dim">18m Price Impact</span>
                <div className="font-mono">{fmtPct((row.price_impact_18m_pct as number) ?? 0)}</div>
              </div>
              <div>
                <span className="text-text-dim">Assignment Spike</span>
                <div className="font-mono text-warn">{fmtPct((row.assignment_spike_pct as number) ?? 0)}</div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
