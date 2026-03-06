import { useBlockingData } from '@/hooks/useAnalyseData';
import { useNavStore } from '@/store/navigation';
import { Badge } from '@/components/trust/Badge';
import { Verdict } from '@/components/trust/Verdict';
import { fmtPct } from '@/lib/constants';
import { Loader2, AlertTriangle } from 'lucide-react';

export function BlockingTab() {
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
  const mediumRisk = blocks.filter((b) => b.riskScore >= 60 && b.riskScore < 80);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-lg p-4 text-center">
          <div className="text-heading font-semibold text-text-primary">{blocks.length}</div>
          <div className="text-micro text-text-dim">View Corridors Analysed</div>
        </div>
        <div className="bg-surface border border-danger/30 rounded-lg p-4 text-center">
          <div className="text-heading font-semibold text-danger">{highRisk.length}</div>
          <div className="text-micro text-text-dim">High Risk ({'>'}80%)</div>
        </div>
        <div className="bg-surface border border-warn/30 rounded-lg p-4 text-center">
          <div className="text-heading font-semibold text-warn">{mediumRisk.length}</div>
          <div className="text-micro text-text-dim">Medium Risk (60-80%)</div>
        </div>
      </div>

      {/* Blocking Table */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-subheading font-medium">View Block Probability</h3>
          <Badge level="HIGH_CONFIDENCE" />
        </div>
        {blocks.length === 0 ? (
          <p className="text-body text-text-dim">No blocking data available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-body">
              <thead>
                <tr className="text-left text-label text-text-dim uppercase tracking-wider">
                  <th className="pb-3 pr-4">View</th>
                  <th className="pb-3 pr-4">Blocker</th>
                  <th className="pb-3 pr-4">Risk</th>
                  <th className="pb-3 pr-4">Safe Above</th>
                  <th className="pb-3 pr-4">Timeline</th>
                  <th className="pb-3">Blocked</th>
                </tr>
              </thead>
              <tbody>
                {blocks.map((b, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="py-2.5 pr-4 text-text-primary">{b.viewName}</td>
                    <td className="py-2.5 pr-4 text-text-secondary">{b.blockerName}</td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-1.5">
                        {b.riskScore >= 80 && (
                          <AlertTriangle size={12} className="text-danger" />
                        )}
                        <span
                          className={`font-mono ${
                            b.riskScore >= 80
                              ? 'text-danger'
                              : b.riskScore >= 60
                              ? 'text-warn'
                              : 'text-text-secondary'
                          }`}
                        >
                          {b.riskScore}%
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-gold">
                      Floor {b.safeAboveFloor}+
                    </td>
                    <td className="py-2.5 pr-4 text-micro text-text-dim">{b.timeline}</td>
                    <td className="py-2.5 font-mono text-text-secondary">
                      {fmtPct(b.pctBlocked)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {highRisk.length > 0 ? (
        <Verdict
          verdict="NEGOTIATE"
          reasoning={`${highRisk.length} high-risk view corridors identified. Negotiate pricing to reflect confirmed blocking risk. Safe floor thresholds provide specific negotiation leverage.`}
          conditions={highRisk.map(
            (b) =>
              `${b.viewName}: safe above floor ${b.safeAboveFloor} — blocker: ${b.blockerName} (${b.timeline})`
          )}
        />
      ) : (
        <Verdict
          verdict="BUY"
          reasoning="No significant view blocking risks identified for this location. View corridors are clear with low probability of future obstruction."
        />
      )}
    </div>
  );
}
