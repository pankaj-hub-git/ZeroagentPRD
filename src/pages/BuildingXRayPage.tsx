import { useParams } from 'react-router-dom';
import { useXrayData } from '@/hooks/useXrayData';
import { Badge } from '@/components/trust/Badge';
import { Verdict } from '@/components/trust/Verdict';
import { fmtAed, fmtNum, fmtPct, fmtDate, toSqft } from '@/lib/constants';
import { useNavStore } from '@/store/navigation';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

const DEFAULT_PROJECT = '601af8ad-42ef-4f02-b7ef-9d5c4a5dca9a';

export function BuildingXRayPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const id = projectId ?? DEFAULT_PROJECT;
  const { project, unitTypes, transactions, loading } = useXrayData(id);
  const { activeFloor, setActiveFloor } = useNavStore();
  const [activeXrayTab, setActiveXrayTab] = useState<'floor' | 'dld' | 'view'>('floor');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-gold" size={28} />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full text-text-dim text-body">
        Project not found. Verify the project ID exists in xray_projects.
      </div>
    );
  }

  const totalFloors = project.totalFloors || 19;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-heading font-semibold">{project.projectName}</h1>
          <p className="text-body text-text-secondary">
            {project.developer} · {project.community} · {totalFloors} floors
            {project.completionDate && ` · Completed ${fmtDate(project.completionDate)}`}
          </p>
        </div>
        <Badge level="VERIFIED" />
      </div>

      {/* X-Ray Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border pb-px">
        {[
          { key: 'floor' as const, label: 'Floor Plate' },
          { key: 'dld' as const, label: 'DLD Evidence' },
          { key: 'view' as const, label: 'View + Risk' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveXrayTab(t.key)}
            className={`px-4 py-2 text-body font-medium border-b-2 -mb-px transition-colors ${
              activeXrayTab === t.key
                ? 'border-gold text-gold'
                : 'border-transparent text-text-dim hover:text-text-secondary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Floor Plate Tab */}
      {activeXrayTab === 'floor' && (
        <div className="space-y-4">
          {/* Floor Selector */}
          <div className="flex items-center gap-2">
            <span className="text-label text-text-dim">Floor:</span>
            <div className="flex gap-1 flex-wrap">
              {Array.from({ length: totalFloors }, (_, i) => i + 1).map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFloor(f)}
                  className={`w-8 h-8 rounded text-micro font-mono transition-colors ${
                    activeFloor === f
                      ? 'bg-gold text-bg'
                      : 'bg-white/5 text-text-dim hover:text-text-secondary'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Unit Type Cards */}
          <div className="grid grid-cols-2 gap-3">
            {unitTypes.map((u, i) => (
              <div key={i} className="bg-surface border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-body font-medium text-text-primary">{u.unitType}</span>
                  <span className="text-micro text-text-dim">{u.orientation}</span>
                </div>
                <div className="space-y-1 text-micro">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Area</span>
                    <span className="font-mono">{fmtNum(Math.round(u.totalAreaSqft))} sqft</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Units/Floor</span>
                    <span className="font-mono">{u.unitsPerFloor}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DLD Evidence Tab */}
      {activeXrayTab === 'dld' && (
        <div className="bg-surface border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-subheading font-medium">DLD Transaction Evidence</h3>
            <Badge level="VERIFIED" />
          </div>
          {transactions.length === 0 ? (
            <p className="text-body text-text-dim">No transaction data available</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-body">
                <thead>
                  <tr className="text-left text-label text-text-dim uppercase tracking-wider">
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3 pr-4">Type</th>
                    <th className="pb-3 pr-4">Area (sqft)</th>
                    <th className="pb-3 pr-4">PSF (AED/sqft)</th>
                    <th className="pb-3">Worth</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 50).map((t, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="py-2 pr-4 text-micro text-text-dim">
                        {fmtDate(t.date)}
                      </td>
                      <td className="py-2 pr-4 text-text-secondary">{t.unitType}</td>
                      <td className="py-2 pr-4 font-mono">{fmtNum(Math.round(t.areaSqft))}</td>
                      <td className="py-2 pr-4 font-mono text-gold">
                        {fmtAed(t.psfSqft)}
                      </td>
                      <td className="py-2 font-mono">{fmtAed(t.worth)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-micro text-text-dim mt-3">
            Source: Government Records (DLD). Area converted from sqm. PSF converted from AED/sqm (÷ 10.7639).
          </p>
        </div>
      )}

      {/* View + Risk Tab */}
      {activeXrayTab === 'view' && (
        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-lg p-5">
            <h3 className="text-subheading font-medium mb-4">Directional View Context</h3>
            <div className="grid grid-cols-4 gap-3">
              {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map((dir) => (
                <div
                  key={dir}
                  className="bg-bg rounded-lg p-3 text-center border border-border"
                >
                  <div className="text-subheading font-semibold text-text-primary">{dir}</div>
                  <div className="text-micro text-text-dim">View data pending</div>
                </div>
              ))}
            </div>
          </div>

          <Verdict
            verdict="NEGOTIATE"
            reasoning="View risk assessment requires unit-level blocking analysis. Use the Blocking Engine tab for specific corridor analysis. Safe floor thresholds provide concrete negotiation leverage."
          />
        </div>
      )}
    </div>
  );
}
