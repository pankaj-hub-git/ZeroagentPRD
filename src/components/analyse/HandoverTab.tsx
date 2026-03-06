import { useHandoverData } from '@/hooks/useAnalyseData';
import { useNavStore } from '@/store/navigation';
import { Badge } from '@/components/trust/Badge';
import { Verdict } from '@/components/trust/Verdict';
import { fmtDate, fmtNum, fmtPct } from '@/lib/constants';
import { Loader2, CalendarClock } from 'lucide-react';

export function HandoverTab() {
  const community = useNavStore((s) => s.activeCommunity);
  const { upcoming, comparables, loading } = useHandoverData(community);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-gold" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upcoming Handovers */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <CalendarClock size={16} className="text-gold" />
          <h3 className="text-subheading font-medium">Upcoming Handovers (18 months)</h3>
          <Badge level="HIGH_CONFIDENCE" />
        </div>
        {upcoming.length === 0 ? (
          <p className="text-body text-text-dim">No upcoming handovers in the next 18 months</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-body">
              <thead>
                <tr className="text-left text-label text-text-dim uppercase tracking-wider">
                  <th className="pb-3 pr-4">Phase</th>
                  <th className="pb-3 pr-4">Developer</th>
                  <th className="pb-3 pr-4">Units</th>
                  <th className="pb-3 pr-4">Handover Date</th>
                  <th className="pb-3">Completion</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((h, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="py-2.5 pr-4 text-text-primary">{h.phaseName}</td>
                    <td className="py-2.5 pr-4 text-text-secondary">{h.developer}</td>
                    <td className="py-2.5 pr-4 font-mono">{fmtNum(h.unitsCount)}</td>
                    <td className="py-2.5 pr-4 text-gold">{fmtDate(h.handoverDate)}</td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded bg-white/5">
                          <div
                            className="h-1.5 rounded bg-gold"
                            style={{ width: `${h.completionPct}%` }}
                          />
                        </div>
                        <span className="text-micro text-text-dim">{fmtPct(h.completionPct, 0)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pattern-Matched Comparables */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-subheading font-medium">Pattern-Matched Comparables</h3>
          <Badge level="INFERRED" />
        </div>
        {comparables.length === 0 ? (
          <p className="text-body text-text-dim">No comparable handover patterns found</p>
        ) : (
          <div className="space-y-3">
            {comparables.map((c, i) => (
              <div key={i} className="bg-bg rounded-lg p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-body font-medium text-text-primary">
                    {(c.phase_name as string) ?? 'Comparable Phase'}
                  </span>
                  <span className="text-micro text-gold font-mono">
                    {fmtPct((c.similarity_score as number) ?? 0)} match
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-micro">
                  <div>
                    <span className="text-text-dim">6m Price Impact</span>
                    <div className="font-mono text-text-primary">
                      {fmtPct((c.price_impact_6m_pct as number) ?? 0)}
                    </div>
                  </div>
                  <div>
                    <span className="text-text-dim">18m Price Impact</span>
                    <div className="font-mono text-text-primary">
                      {fmtPct((c.price_impact_18m_pct as number) ?? 0)}
                    </div>
                  </div>
                  <div>
                    <span className="text-text-dim">Assignment Spike</span>
                    <div className="font-mono text-warn">
                      {fmtPct((c.assignment_spike_pct as number) ?? 0)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-micro text-text-dim mt-3">
          Similarity based on unit count, developer tier, community type, and market cycle position.
        </p>
      </div>

      <Verdict
        verdict={upcoming.length > 0 ? 'WAIT' : 'BUY'}
        reasoning={
          upcoming.length > 0
            ? `${fmtNum(upcoming.reduce((s, h) => s + h.unitsCount, 0))} units scheduled for handover. Historical patterns show pricing pressure around handover dates. Wait for supply absorption.`
            : 'No imminent handover supply pressure. Entry timing is favourable from a supply perspective.'
        }
      />
    </div>
  );
}
