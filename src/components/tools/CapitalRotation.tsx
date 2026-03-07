import { useEffect, useState } from 'react';
import { sb } from '@/lib/supabase';
import { Badge } from '@/components/trust/Badge';
import { Loader2 } from 'lucide-react';

interface RotationRow {
  community: string;
  rotationTier: number;
  cascadePosition: number;
  currentScore: number;
  qoqDelta: number;
  typicalLagQuarters: number;
}

const TIER_LABELS: Record<number, string> = {
  1: 'Tier 1 — Palm / DIFC (Early Movers)',
  2: 'Tier 2 — Marina / Downtown',
  3: 'Tier 3 — Creek Harbour / Dubai Hills',
  4: 'Tier 4 — JVC / JVT',
};

export function CapitalRotation() {
  const [data, setData] = useState<RotationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const { data: rows } = await sb
        .schema('gold').from('capital_rotation')
        .select('community, rotation_tier, cascade_position, current_score, qoq_delta, typical_lag_quarters')
        .order('cascade_position', { ascending: true });

      if (rows) {
        setData(
          rows.map((r: Record<string, unknown>) => ({
            community: r.community as string,
            rotationTier: r.rotation_tier as number,
            cascadePosition: r.cascade_position as number,
            currentScore: r.current_score as number,
            qoqDelta: r.qoq_delta as number,
            typicalLagQuarters: r.typical_lag_quarters as number,
          }))
        );
      }
      setLoading(false);
    };
    run();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-gold" size={24} />
      </div>
    );
  }

  const grouped = data.reduce(
    (acc, r) => {
      const tier = r.rotationTier;
      if (!acc[tier]) acc[tier] = [];
      acc[tier].push(r);
      return acc;
    },
    {} as Record<number, RotationRow[]>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <span className="text-body text-text-secondary">Capital Cascade Position</span>
        <Badge level="HIGH_CONFIDENCE" />
      </div>

      {Object.entries(grouped).map(([tier, communities]) => (
        <div key={tier} className="bg-bg rounded-lg border border-border">
          <div className="px-4 py-2.5 border-b border-border">
            <span className="text-label text-gold font-medium">
              {TIER_LABELS[parseInt(tier)] ?? `Tier ${tier}`}
            </span>
          </div>
          <div className="p-3 space-y-1.5">
            {communities.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-micro">
                <span className="text-text-primary">{c.community}</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono">{c.currentScore}/100</span>
                  <span
                    className="font-mono"
                    style={{ color: c.qoqDelta > 0 ? '#27AE60' : c.qoqDelta < 0 ? '#E74C3C' : '#8892A4' }}
                  >
                    {c.qoqDelta > 0 ? '+' : ''}{c.qoqDelta}
                  </span>
                  <span className="text-text-dim">{c.typicalLagQuarters}Q lag</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <p className="text-micro text-text-dim">
        Capital typically cascades from Tier 1 to Tier 4 with increasing lag. Track rotation to identify
        emerging value in lower tiers before capital arrives.
      </p>
    </div>
  );
}
