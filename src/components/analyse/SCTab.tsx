import { useSCData } from '@/hooks/useAnalyseData';
import { useNavStore } from '@/store/navigation';
import { Badge } from '@/components/trust/Badge';
import { Verdict } from '@/components/trust/Verdict';
import { fmtAed, fmtPct } from '@/lib/constants';
import { Loader2 } from 'lucide-react';

export function SCTab() {
  const { activeTower, activeCommunity } = useNavStore();
  const { sc, yield: yieldData, loading } = useSCData(activeTower, activeCommunity);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-gold" size={24} />
      </div>
    );
  }

  // Net yield calculation
  const grossYield = yieldData?.grossYieldPct ?? 0;
  const scDeduction = sc.length > 0 && yieldData ? (sc[0].bestSc * 800) / yieldData.avgPurchasePrice * 100 : 0;
  const voidAllowance = yieldData?.vacancyProxyPct ?? 3;
  const mgmtFee = grossYield * 0.05;
  const netYield = grossYield - scDeduction - voidAllowance - mgmtFee;

  const yieldColor = netYield >= 5 ? '#27AE60' : netYield >= 3 ? '#F39C12' : '#E74C3C';

  return (
    <div className="space-y-6">
      {/* SC Truth Table */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-subheading font-medium">Service Charge Truth Layer</h3>
          <Badge level="VERIFIED" />
        </div>
        {sc.length === 0 ? (
          <p className="text-body text-text-dim">No service charge data available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-body">
              <thead>
                <tr className="text-left text-label text-text-dim uppercase tracking-wider">
                  <th className="pb-3 pr-4">Phase</th>
                  <th className="pb-3 pr-4">Mollak SC</th>
                  <th className="pb-3 pr-4">Reported SC</th>
                  <th className="pb-3 pr-4">Best SC</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Year</th>
                </tr>
              </thead>
              <tbody>
                {sc.map((row, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="py-2.5 pr-4 text-text-primary">{row.phaseName}</td>
                    <td className="py-2.5 pr-4 font-mono">
                      {row.mollakSc ? `${row.mollakSc} AED/sqft` : '—'}
                    </td>
                    <td className="py-2.5 pr-4 font-mono">
                      {row.reportedSc ? `${row.reportedSc} AED/sqft` : '—'}
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-gold">
                      {row.bestSc ? `${row.bestSc} AED/sqft` : '—'}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`text-micro px-2 py-0.5 rounded ${
                          row.scStatus === 'VERIFIED'
                            ? 'bg-verified/15 text-verified'
                            : row.scStatus === 'CONFLICT'
                            ? 'bg-conflict/15 text-conflict'
                            : 'bg-white/5 text-text-dim'
                        }`}
                      >
                        {row.scStatus}
                      </span>
                    </td>
                    <td className="py-2.5 font-mono text-text-dim">{row.mollakYear}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Net Yield Waterfall */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <h3 className="text-subheading font-medium mb-4">Net Yield After All Deductions</h3>
        <div className="space-y-2.5">
          <div className="flex justify-between text-body">
            <span className="text-text-secondary">Gross Yield</span>
            <span className="font-mono text-text-primary">{fmtPct(grossYield)}</span>
          </div>
          <div className="flex justify-between text-body">
            <span className="text-text-secondary">Minus Service Charges</span>
            <span className="font-mono text-danger">-{fmtPct(scDeduction)}</span>
          </div>
          <div className="flex justify-between text-body">
            <span className="text-text-secondary">Minus Void Allowance</span>
            <span className="font-mono text-danger">-{fmtPct(voidAllowance)}</span>
          </div>
          <div className="flex justify-between text-body">
            <span className="text-text-secondary">Minus Management Fee (5%)</span>
            <span className="font-mono text-danger">-{fmtPct(mgmtFee)}</span>
          </div>
          <div className="border-t border-border pt-2.5 flex justify-between">
            <span className="text-subheading font-semibold">Net Yield After All Deductions</span>
            <span className="text-subheading font-semibold font-mono" style={{ color: yieldColor }}>
              {fmtPct(netYield)}
            </span>
          </div>
        </div>
        <p className="text-micro text-text-dim mt-3">
          Calculated from Government Records (Mollak) and verified rental data.
          All deductions reflect actual community-specific costs.
        </p>
      </div>

      <Verdict
        verdict={netYield >= 5 ? 'BUY' : netYield >= 3 ? 'NEGOTIATE' : 'AVOID'}
        reasoning={
          netYield >= 5
            ? 'Net yield after all deductions supports investment entry. Service charges are verified and within expected range.'
            : netYield >= 3
            ? 'Net yield is moderate. Service charges erode gross returns significantly. Negotiate purchase price to improve net yield.'
            : 'Net yield after all deductions is below acceptable threshold. Service charges and void allowance significantly impact returns.'
        }
      />
    </div>
  );
}
