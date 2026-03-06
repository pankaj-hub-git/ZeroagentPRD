import { useBlockingData } from '@/hooks/useAnalyseData';
import { useNavStore } from '@/store/navigation';
import { Badge } from '@/components/trust/Badge';
import { fmtAed } from '@/lib/constants';
import { Loader2 } from 'lucide-react';

export function BlockingReport() {
  const { activeTower, activeCommunity } = useNavStore();
  const { blocks, loading } = useBlockingData(activeTower, activeCommunity);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-gold" size={24} />
      </div>
    );
  }

  const highRisk = blocks.filter((b) => b.riskScore >= 80);
  const avgRisk = blocks.length > 0
    ? Math.round(blocks.reduce((s, b) => s + b.riskScore, 0) / blocks.length)
    : 0;

  // AED negotiation discount (not percentage)
  const suggestedDiscount = highRisk.length * 25000 + (avgRisk > 60 ? 50000 : 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <span className="text-body text-text-secondary">
          {activeTower ?? activeCommunity ?? 'Select a tower'}
        </span>
        <Badge level="HIGH_CONFIDENCE" />
      </div>

      {blocks.length === 0 ? (
        <p className="text-body text-text-dim py-10 text-center">
          No blocking data found for this location.
        </p>
      ) : (
        <>
          <div className="bg-bg rounded-lg p-4 border border-border">
            <h4 className="text-label text-text-dim uppercase tracking-wider mb-2">Summary</h4>
            <div className="space-y-1.5 text-body">
              <div className="flex justify-between">
                <span className="text-text-secondary">View corridors analysed</span>
                <span className="font-mono">{blocks.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">High risk corridors</span>
                <span className="font-mono text-danger">{highRisk.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Average risk score</span>
                <span className="font-mono">{avgRisk}%</span>
              </div>
            </div>
          </div>

          {blocks.slice(0, 5).map((b, i) => (
            <div key={i} className="bg-bg rounded-lg p-3 border border-border">
              <div className="flex items-center justify-between mb-1">
                <span className="text-body font-medium">{b.viewName}</span>
                <span
                  className="font-mono text-micro"
                  style={{ color: b.riskScore >= 80 ? '#E74C3C' : '#F39C12' }}
                >
                  {b.riskScore}% risk
                </span>
              </div>
              <p className="text-micro text-text-secondary">
                Blocker: {b.blockerName} ({b.blockerStatus}) · Safe above floor {b.safeAboveFloor} · {b.timeline}
              </p>
            </div>
          ))}

          <div className="bg-gold/10 border border-gold/30 rounded-lg p-4">
            <h4 className="text-body font-semibold text-gold mb-1">Recommended Negotiation Discount</h4>
            <div className="text-heading font-bold text-gold">{fmtAed(suggestedDiscount)}</div>
            <p className="text-micro text-text-secondary mt-1">
              Based on {highRisk.length} high-risk view corridors and average risk score of {avgRisk}%.
              Express as AED reduction on asking price, not percentage.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
