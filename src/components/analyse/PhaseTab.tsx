import { usePhaseData } from '@/hooks/useAnalyseData';
import { useNavStore } from '@/store/navigation';
import { Badge } from '@/components/trust/Badge';
import { Verdict } from '@/components/trust/Verdict';
import { fmtDate, fmtNum, fmtPct } from '@/lib/constants';
import { Loader2 } from 'lucide-react';

export function PhaseTab() {
  const community = useNavStore((s) => s.activeCommunity);
  const { phases, satellite, loading } = usePhaseData(community);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-gold" size={24} />
      </div>
    );
  }

  // Aggregate satellite verdicts
  const satSummary = satellite.reduce<{ delivered: number; partial: number; notDelivered: number }>(
    (acc, r) => {
      const v = r.delivery_verdict as string;
      if (v === 'DELIVERED') acc.delivered++;
      else if (v === 'PARTIAL') acc.partial++;
      else if (v === 'NOT_DELIVERED') acc.notDelivered++;
      return acc;
    },
    { delivered: 0, partial: 0, notDelivered: 0 }
  );

  const latestImagery = satellite.length > 0
    ? (satellite[satellite.length - 1].gee_composite_end as string)
    : null;

  return (
    <div className="space-y-6">
      {/* Phase Timeline */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <h3 className="text-subheading font-medium mb-4">Phase Timeline</h3>
        {phases.length === 0 ? (
          <p className="text-body text-text-dim">No phase data available for this community</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-body">
              <thead>
                <tr className="text-left text-label text-text-dim uppercase tracking-wider">
                  <th className="pb-3 pr-4">Phase</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Progress</th>
                  <th className="pb-3 pr-4">Units</th>
                  <th className="pb-3 pr-4">Developer</th>
                  <th className="pb-3 pr-4">Launch</th>
                  <th className="pb-3">Handover</th>
                </tr>
              </thead>
              <tbody>
                {phases.map((p, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="py-2.5 pr-4 text-text-primary">{p.phaseName}</td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`text-micro px-2 py-0.5 rounded ${
                          p.status === 'Delivered'
                            ? 'bg-verified/15 text-verified'
                            : p.status === 'Under Construction'
                            ? 'bg-warn/15 text-warn'
                            : 'bg-white/5 text-text-dim'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded bg-white/5">
                          <div
                            className="h-1.5 rounded bg-gold"
                            style={{ width: `${p.completionPct}%` }}
                          />
                        </div>
                        <span className="text-micro text-text-dim">{fmtPct(p.completionPct, 0)}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-micro">
                      {fmtNum(p.unitsDelivered)}/{fmtNum(p.unitsTotal)}
                    </td>
                    <td className="py-2.5 pr-4 text-text-secondary">{p.developer}</td>
                    <td className="py-2.5 pr-4 text-micro text-text-dim">
                      {p.launchDate ? fmtDate(p.launchDate) : '—'}
                    </td>
                    <td className="py-2.5 text-micro text-text-dim">
                      {p.handoverDate ? fmtDate(p.handoverDate) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Satellite Construction Progress */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-subheading font-medium">Satellite Construction Progress</h3>
          <Badge level="VERIFIED" />
        </div>
        <div className="grid grid-cols-3 gap-4 mb-3">
          <div className="text-center">
            <div className="text-heading font-semibold text-verified">{satSummary.delivered}</div>
            <div className="text-micro text-text-dim">Delivered</div>
          </div>
          <div className="text-center">
            <div className="text-heading font-semibold text-warn">{satSummary.partial}</div>
            <div className="text-micro text-text-dim">Partial</div>
          </div>
          <div className="text-center">
            <div className="text-heading font-semibold text-danger">{satSummary.notDelivered}</div>
            <div className="text-micro text-text-dim">Not Delivered</div>
          </div>
        </div>
        {latestImagery && (
          <p className="text-micro text-text-dim">
            Imagery as of {fmtDate(latestImagery)} — Satellite Analysis Verified
          </p>
        )}
      </div>

      <Verdict
        verdict="WAIT"
        reasoning="Active construction phases with upcoming handovers may create pricing pressure. Monitor satellite progress for completion confirmation before entry."
        conditions={[
          'Wait for next satellite verification pass',
          'Track handover completion rates vs schedule',
        ]}
      />
    </div>
  );
}
