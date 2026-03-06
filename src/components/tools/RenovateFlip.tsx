import { useEffect, useState } from 'react';
import { useNavStore } from '@/store/navigation';
import { sb } from '@/lib/supabase';
import { fmtAed, fmtPct } from '@/lib/constants';
import { Badge } from '@/components/trust/Badge';
import { Loader2 } from 'lucide-react';

interface RenovRow {
  type: string;
  avgRoi: number;
  avgValueAdd: number;
  sampleSize: number;
}

export function RenovateFlip() {
  const { activeCommunity } = useNavStore();
  const [data, setData] = useState<RenovRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeCommunity) {
      setLoading(false);
      return;
    }
    const run = async () => {
      const { data: rows } = await sb
        .from('gold.unit_condition_variance')
        .select('renovation_type, avg_roi_pct, avg_value_add_aed, community, sample_size')
        .ilike('community', `%${activeCommunity}%`)
        .order('avg_roi_pct', { ascending: false });

      if (rows) {
        setData(
          rows.map((r: Record<string, unknown>) => ({
            type: r.renovation_type as string,
            avgRoi: r.avg_roi_pct as number,
            avgValueAdd: r.avg_value_add_aed as number,
            sampleSize: r.sample_size as number,
          }))
        );
      }
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
      <div className="flex items-center gap-2">
        <span className="text-body text-text-secondary">
          Renovation ROI for {activeCommunity ?? 'Select a community'}
        </span>
        <Badge level="INFERRED" />
      </div>

      {data.length === 0 ? (
        <p className="text-body text-text-dim py-10 text-center">
          No renovation data available for this community.
        </p>
      ) : (
        <div className="space-y-2">
          {data.map((r, i) => (
            <div key={i} className="bg-bg rounded-lg p-3 border border-border flex items-center justify-between">
              <div>
                <span className="text-body font-medium text-text-primary">{r.type}</span>
                <div className="text-micro text-text-dim">Sample: {r.sampleSize} units</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-gold">{fmtPct(r.avgRoi)} ROI</div>
                <div className="text-micro font-mono text-text-secondary">+{fmtAed(r.avgValueAdd)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-micro text-text-dim">
        ROI coefficients are community-specific and based on verified transaction price differentials
        between renovated and non-renovated units.
      </p>
    </div>
  );
}
