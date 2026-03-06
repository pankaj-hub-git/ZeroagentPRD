import { useOverviewData } from '@/hooks/useAnalyseData';
import { useNavStore } from '@/store/navigation';
import { ScoreRing } from '@/components/trust/ScoreRing';
import { Verdict } from '@/components/trust/Verdict';
import { Badge } from '@/components/trust/Badge';
import { fmtAed, fmtNum, fmtPct } from '@/lib/constants';
import { Loader2 } from 'lucide-react';

export function OverviewTab() {
  const community = useNavStore((s) => s.activeCommunity);
  const { stats, capital, loading } = useOverviewData(community);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-gold" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {/* Foundation Layer */}
        <div className="bg-surface border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-subheading font-medium">Foundation Layer</h3>
            <Badge level="VERIFIED" />
          </div>
          {stats ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-body text-text-secondary">Transactions (12m)</span>
                <span className="text-body font-mono">{fmtNum(stats.txnCount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-body text-text-secondary">Average PSF</span>
                <span className="text-body font-mono">{fmtAed(stats.avgPsfSqft)}/sqft</span>
              </div>
              <div className="flex justify-between">
                <span className="text-body text-text-secondary">Average Price</span>
                <span className="text-body font-mono">{fmtAed(stats.avgPrice)}</span>
              </div>
            </div>
          ) : (
            <p className="text-body text-text-dim">No transaction data available</p>
          )}
        </div>

        {/* Intelligence Layer */}
        <div className="bg-surface border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-subheading font-medium">Intelligence Layer</h3>
            <Badge level="HIGH_CONFIDENCE" />
          </div>
          {capital ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-body text-text-secondary">Capital Quality Score</span>
                <span className="text-body font-mono text-gold">{capital.capitalQualityScore}/100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-body text-text-secondary">Capital Origin</span>
                <span className="text-body font-mono">{capital.rotationOrigin}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-body text-text-secondary">Hard Capital Ratio</span>
                <span className="text-body font-mono">{fmtPct(capital.hardCapitalRatio)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-body text-text-secondary">QoQ Trajectory</span>
                <span className="text-body font-mono">{capital.qoqTrajectory}</span>
              </div>
            </div>
          ) : (
            <p className="text-body text-text-dim">No capital data available</p>
          )}
        </div>
      </div>

      {/* Score Rings */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <h3 className="text-label text-text-dim uppercase tracking-wider mb-4">
          Intelligence Scores
        </h3>
        <div className="flex items-start justify-around">
          <div className="relative">
            <ScoreRing score={capital?.capitalQualityScore ?? 0} label="Capital Quality" />
          </div>
          <div className="relative">
            <ScoreRing score={0} label="Developer Score" color="#2E75B6" />
          </div>
          <div className="relative">
            <ScoreRing score={0} label="Livability" color="#8E44AD" />
          </div>
          <div className="relative">
            <ScoreRing score={0} label="Listing Integrity" color="#F39C12" />
          </div>
          <div className="relative">
            <ScoreRing score={0} label="Overall Intelligence" color="#27AE60" />
          </div>
        </div>
      </div>

      <Verdict
        verdict="NEGOTIATE"
        reasoning={`${community ?? 'This community'} shows solid fundamentals with verified transaction data. Capital quality indicates sustained institutional interest. Further investigation into specific tower-level risks recommended before entry.`}
        conditions={[
          'Confirm view blocking risk at unit level',
          'Verify service charge trajectory against Mollak records',
          'Check upcoming handover supply impact on pricing',
        ]}
      />
    </div>
  );
}
