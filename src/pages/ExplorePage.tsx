import { useState } from 'react';
import {
  useExploreData,
  PhaseItem, ViewBlockItem, SCTruthItem, SCTrajectoryItem,
  DeveloperScoreItem, ProgressData,
} from '@/hooks/useExploreData';
import { fmtNum, fmtDate } from '@/lib/constants';
import { ScoreRing } from '@/components/trust/ScoreRing';
import { Loader2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip,
} from 'recharts';

const GOLD = '#C9A84C';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'phases', label: 'Phases' },
  { key: 'blocking', label: 'Blocking / Position' },
  { key: 'service_charges', label: 'Service Charges' },
  { key: 'handover', label: 'Handover' },
  { key: 'developer', label: 'Developer' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const STATUS_ICON: Record<string, string> = {
  Completed: '✓',
  'Under Construction': '🏗',
  Planned: '📋',
};

function riskColor(score: number): string {
  if (score <= 30) return '#27AE60';
  if (score <= 60) return '#F39C12';
  return '#E74C3C';
}

/* ── Overview Tab ──────────────────────────────────────────── */
function OverviewTab({ phases, viewBlocking, scTruth, progress }: {
  phases: PhaseItem[];
  viewBlocking: ViewBlockItem[];
  scTruth: SCTruthItem[];
  progress: ProgressData | null;
}) {
  const totalPhases = phases.length;
  const avgReturn = totalPhases > 0 ? phases.reduce((s, p) => s + p.returnPct, 0) / totalPhases : 0;
  const maxRisk = viewBlocking.length > 0 ? Math.max(...viewBlocking.map((v) => v.riskScore)) : 0;
  const latestSc = scTruth.length > 0 ? scTruth[0] : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-surface border border-border rounded-lg p-3">
          <div className="text-micro text-text-dim">Total Phases</div>
          <div className="text-heading font-mono text-gold">{totalPhases}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-3">
          <div className="text-micro text-text-dim">Avg Return</div>
          <div className="text-heading font-mono" style={{ color: avgReturn >= 0 ? '#27AE60' : '#E74C3C' }}>
            {avgReturn > 0 ? '+' : ''}{avgReturn.toFixed(1)}%
          </div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-3">
          <div className="text-micro text-text-dim">Max View Risk</div>
          <div className="text-heading font-mono" style={{ color: riskColor(maxRisk) }}>{maxRisk}/100</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-3">
          <div className="text-micro text-text-dim">Service Charge</div>
          <div className="text-heading font-mono text-text-primary">
            {latestSc ? `AED ${latestSc.bestSc.toFixed(0)}/sqft` : '—'}
          </div>
          {latestSc && <div className="text-micro text-text-dim">{latestSc.scStatus}</div>}
        </div>
      </div>

      {progress && (
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-label text-text-dim uppercase tracking-wider mb-2">Handover Status</div>
          <div className="flex items-center gap-6">
            <ScoreRing score={progress.ddaCompletion} label="DDA Completion" size={80} />
            <div className="space-y-1">
              <div className="text-micro text-text-dim">Primary Sales: <span className="font-mono text-text-primary">{fmtNum(progress.salesCount)}</span></div>
              <div className="text-micro text-text-dim">Hidden Inventory: <span className="font-mono text-text-primary">{fmtNum(progress.hiddenInventory)}</span></div>
              {progress.conflictFlag && (
                <div className="text-micro text-conflict font-medium">⚡ CONFLICT: {progress.conflictType}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Phase Intel Tab ───────────────────────────────────────── */
function PhaseTab({ items }: { items: PhaseItem[] }) {
  if (!items.length) return <EmptyTab message="No phase data available" />;
  const momentumIcon: Record<string, string> = { RISING: '▲', FALLING: '▼', STABLE: '—' };
  const momentumColor: Record<string, string> = { RISING: '#27AE60', FALLING: '#E74C3C', STABLE: '#8892A4' };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {items.map((p, i) => {
          const color = p.completionPct >= 100 ? '#27AE60' : p.completionPct > 0 ? '#F39C12' : '#3A3F52';
          return (
            <div key={i} className="flex items-center gap-2 shrink-0">
              <div
                className="w-4 h-4 rounded-full border-2"
                style={{ borderColor: color, backgroundColor: p.completionPct >= 100 ? color : 'transparent' }}
              />
              <span className="text-micro text-text-dim">{p.phaseName}</span>
              {i < items.length - 1 && <div className="w-6 h-px bg-border" />}
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((p, i) => (
          <div key={i} className="bg-surface border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-body font-medium">{p.phaseName}</span>
              <span className="text-micro font-semibold" style={{ color: momentumColor[p.momentum] ?? '#8892A4' }}>
                {momentumIcon[p.momentum] ?? '—'} {p.momentum}
              </span>
            </div>
            <div className="text-micro text-text-dim mb-2">
              AED {fmtNum(p.launchPsf)}/sqft → <span className="text-gold font-mono">AED {fmtNum(p.currentPsf)}/sqft</span>
            </div>
            <div className="flex items-center gap-4 text-micro">
              <span style={{ color: p.returnPct >= 0 ? '#27AE60' : '#E74C3C' }} className="font-semibold">
                {p.returnPct > 0 ? '+' : ''}{p.returnPct}% since launch
              </span>
              <span className="text-text-dim">{p.completionPct}% complete</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── View Blocking Tab ─────────────────────────────────────── */
function BlockingTab({ items }: { items: ViewBlockItem[] }) {
  if (!items.length) return <EmptyTab message="No view blocking data available" />;

  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const dirData: Record<string, { risk: number; safe: number }> = {};
  directions.forEach((d) => { dirData[d] = { risk: 0, safe: 0 }; });
  items.forEach((v) => {
    const dir = directions.find((d) => v.viewName?.toUpperCase().includes(d));
    if (dir && v.riskScore > dirData[dir].risk) {
      dirData[dir] = { risk: v.riskScore, safe: v.safeAboveFloor };
    }
  });

  return (
    <div className="space-y-4">
      <div className="bg-surface border border-border rounded-lg p-4">
        <div className="text-label text-text-dim uppercase tracking-wider mb-3">Directional View Risk</div>
        <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
          {directions.map((dir) => {
            const d = dirData[dir];
            return (
              <div key={dir} className="rounded-lg p-3 text-center border"
                style={{ borderColor: `${riskColor(d.risk)}40`, backgroundColor: `${riskColor(d.risk)}10` }}>
                <div className="text-subheading font-semibold" style={{ color: riskColor(d.risk) }}>{dir}</div>
                <div className="text-micro font-mono" style={{ color: riskColor(d.risk) }}>{d.risk}/100</div>
                {d.safe > 0 && <div className="text-[9px] text-text-dim mt-1">Safe &gt; F{d.safe}</div>}
              </div>
            );
          })}
        </div>
      </div>
      <div className="space-y-2">
        {items.slice(0, 10).map((v, i) => (
          <div key={i} className="bg-surface border border-border rounded-lg p-3 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${riskColor(v.riskScore)}20` }}>
              <span className="text-subheading font-bold font-mono" style={{ color: riskColor(v.riskScore) }}>{v.riskScore}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-body font-medium truncate">{v.viewName}</div>
              <div className="text-micro text-text-secondary">Blocker: {v.blockerName} · {v.blockerStatus}</div>
              <div className="text-micro text-text-dim">
                {v.pctBlocked > 0 && `${v.pctBlocked}% blocked · `}
                {v.timeline && `Timeline: ${v.timeline} · `}
                Safe above Floor {v.safeAboveFloor}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Service Charges Tab ──────────────────────────────────── */
function ServiceChargesTab({ scTruth, scTrajectory }: { scTruth: SCTruthItem[]; scTrajectory: SCTrajectoryItem[] }) {
  if (!scTruth.length && !scTrajectory.length) return <EmptyTab message="No service charge data available" />;

  const SC_STATUS_COLOR: Record<string, string> = {
    VERIFIED: '#27AE60',
    YIELD_EROSION: '#E74C3C',
    STABLE: '#8892A4',
    INCREASING: '#F39C12',
  };

  return (
    <div className="space-y-4">
      {scTruth.length > 0 && (
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-label text-text-dim uppercase tracking-wider mb-3">Service Charge Evolution</div>
          <div className="overflow-x-auto">
            <table className="w-full text-body">
              <thead>
                <tr className="text-left text-label text-text-dim uppercase tracking-wider">
                  <th className="pb-2 pr-3">Phase</th>
                  <th className="pb-2 pr-3">Year</th>
                  <th className="pb-2 pr-3">Mollak SC</th>
                  <th className="pb-2 pr-3">Reported SC</th>
                  <th className="pb-2 pr-3">Best SC</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {scTruth.map((sc, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="py-2 pr-3 text-text-primary">{sc.phaseName}</td>
                    <td className="py-2 pr-3 font-mono text-text-secondary">{sc.mollakYear}</td>
                    <td className="py-2 pr-3 font-mono">AED {sc.mollakSc.toFixed(1)}</td>
                    <td className="py-2 pr-3 font-mono">{sc.reportedSc > 0 ? `AED ${sc.reportedSc.toFixed(1)}` : '—'}</td>
                    <td className="py-2 pr-3 font-mono text-gold">AED {sc.bestSc.toFixed(1)}</td>
                    <td className="py-2">
                      <span className="text-micro font-semibold" style={{ color: SC_STATUS_COLOR[sc.scStatus] ?? '#8892A4' }}>
                        {sc.scStatus === 'YIELD_EROSION' ? 'Yield Erosion' : sc.scStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {scTruth[0]?.scNote && (
            <div className="text-micro text-text-dim mt-2 italic">{scTruth[0].scNote}</div>
          )}
        </div>
      )}
      {scTrajectory.length > 1 && (
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-label text-text-dim uppercase tracking-wider mb-3">SC Trajectory (AED/sqft)</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={scTrajectory}>
              <XAxis dataKey="budgetYear" tick={{ fontSize: 9, fill: '#8892A4' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#3A3F52' }} axisLine={false} tickLine={false} width={50} />
              <Tooltip
                contentStyle={{ background: '#0D0D20', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, fontSize: 11 }}
                formatter={(v: unknown) => [`AED ${Number(v).toFixed(1)}/sqft`, 'SC']}
              />
              <Line type="monotone" dataKey="serviceChargeSqft" stroke={GOLD} strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="text-micro text-text-dim">
        Source: Mollak RERA records. SC = "yield erosion" when service charges significantly reduce net rental returns.
      </p>
    </div>
  );
}

/* ── Handover Tab ─────────────────────────────────────────── */
function HandoverTab({ data }: { data: ProgressData | null }) {
  if (!data) return <EmptyTab message="No handover data available" />;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-6">
        <ScoreRing score={data.ddaCompletion} label="DDA Completion" size={120} />
        <div className="space-y-2">
          <div className="text-micro text-text-dim">Primary Sales: <span className="font-mono text-text-primary">{fmtNum(data.salesCount)}</span></div>
          <div className="text-micro text-text-dim">Hidden Inventory: <span className="font-mono text-text-primary">{fmtNum(data.hiddenInventory)}</span></div>
          {data.conflictFlag && (
            <div className="text-micro text-conflict font-medium">⚡ CONFLICT: {data.conflictType}</div>
          )}
        </div>
      </div>
      {data.satelliteBreakdown.length > 0 && (
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-label text-text-dim uppercase tracking-wider mb-3">Satellite Delivery by Category</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.satelliteBreakdown}>
              <XAxis dataKey="class" tick={{ fontSize: 9, fill: '#8892A4' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#3A3F52' }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={{ background: '#0D0D20', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, fontSize: 11 }} />
              <Bar dataKey="delivered" stackId="a" fill="#27AE60" name="Delivered" />
              <Bar dataKey="partial" stackId="a" fill="#F39C12" name="Partial" />
              <Bar dataKey="notDelivered" stackId="a" fill="#E74C3C" name="Not Delivered" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ── Developer Tab ────────────────────────────────────────── */
function DeveloperTab({ items }: { items: DeveloperScoreItem[] }) {
  if (!items.length) return <EmptyTab message="Select a project or developer to view scores" />;

  const TIER_COLOR: Record<string, string> = {
    premium: '#C9A84C',
    mid_tier: '#2E75B6',
    budget: '#F39C12',
    new_entrant: '#8892A4',
  };

  return (
    <div className="space-y-3">
      {items.map((d, i) => (
        <div key={i} className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-body font-medium text-text-primary">{d.developer}</span>
            <span
              className="text-micro font-semibold px-2 py-0.5 rounded"
              style={{ color: TIER_COLOR[d.brandTier] ?? '#8892A4', backgroundColor: `${TIER_COLOR[d.brandTier] ?? '#8892A4'}20` }}
            >
              {d.brandTier.replace(/_/g, ' ').toUpperCase()}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div>
              <div className="text-micro text-text-dim">Delivery Rate</div>
              <div className="text-body font-mono" style={{ color: d.deliveryRate >= 80 ? '#27AE60' : d.deliveryRate >= 60 ? '#F39C12' : '#E74C3C' }}>
                {d.deliveryRate.toFixed(0)}%
              </div>
            </div>
            <div>
              <div className="text-micro text-text-dim">Avg Delay</div>
              <div className="text-body font-mono text-text-primary">{d.avgDelayMonths.toFixed(0)} months</div>
            </div>
            <div>
              <div className="text-micro text-text-dim">Build Quality</div>
              <div className="text-body font-mono text-text-primary">{d.buildQuality.toFixed(1)}/10</div>
            </div>
            <div>
              <div className="text-micro text-text-dim">After Sales</div>
              <div className="text-body font-mono text-text-primary">{d.afterSales.toFixed(1)}/10</div>
            </div>
          </div>
          <div className="text-micro text-text-secondary">{d.totalProjects} projects in Dubai</div>
          {d.notableProjects && <div className="text-micro text-text-dim mt-1">Notable: {d.notableProjects}</div>}
          {d.redFlags && <div className="text-micro text-danger mt-1">⚠ {d.redFlags}</div>}
        </div>
      ))}
    </div>
  );
}

/* ── Empty state ───────────────────────────────────────────── */
function EmptyTab({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-body text-text-dim">
      {message}
    </div>
  );
}

/* ── Main Explore Page ─────────────────────────────────────── */
export function ExplorePage() {
  const {
    areas, projects, developers, ddLoading,
    selectedArea, selectedProject, selectedDeveloper,
    setSelectedArea, setSelectedProject, setSelectedDeveloper,
    phases, viewBlocking, scTruth, scTrajectory, progress, developerScores, tabLoading,
  } = useExploreData();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const navigate = useNavigate();

  const filteredProjects = projects.filter((p) => {
    if (selectedArea && !p.community.toLowerCase().includes(selectedArea.toLowerCase())) return false;
    if (selectedDeveloper && p.developer !== selectedDeveloper) return false;
    return true;
  });

  const hasSelection = selectedArea || selectedProject;

  return (
    <div className="flex h-full overflow-hidden">
      <aside className="w-[300px] bg-surface border-r border-border flex flex-col shrink-0 overflow-y-auto p-4">
        <h2 className="text-label text-text-dim uppercase tracking-wider mb-4">Explore</h2>

        <label className="text-micro text-text-dim mb-1">Area</label>
        <select
          value={selectedArea ?? ''}
          onChange={(e) => { setSelectedArea(e.target.value || null); setSelectedProject(null); }}
          className="w-full bg-white/5 border border-border rounded px-2 py-2 text-body text-text-secondary focus:border-gold focus:outline-none mb-3"
        >
          <option value="">All Areas</option>
          {areas.map((a) => (
            <option key={a.area} value={a.area}>
              {a.area} ({a.communityCount} communities)
            </option>
          ))}
        </select>

        <label className="text-micro text-text-dim mb-1">Project / Community</label>
        <select
          value={selectedProject ?? ''}
          onChange={(e) => setSelectedProject(e.target.value || null)}
          className="w-full bg-white/5 border border-border rounded px-2 py-2 text-body text-text-secondary focus:border-gold focus:outline-none mb-3"
        >
          <option value="">All Projects</option>
          {filteredProjects.map((p) => (
            <option key={p.id} value={p.name}>
              {STATUS_ICON[p.status] ?? ''} {p.name}
            </option>
          ))}
        </select>

        <label className="text-micro text-text-dim mb-1">Developer</label>
        <select
          value={selectedDeveloper ?? ''}
          onChange={(e) => { setSelectedDeveloper(e.target.value || null); setSelectedProject(null); }}
          className="w-full bg-white/5 border border-border rounded px-2 py-2 text-body text-text-secondary focus:border-gold focus:outline-none mb-3"
        >
          <option value="">All Developers</option>
          {developers.map((d) => (
            <option key={d.developer} value={d.developer}>
              {d.developer} — {d.deliveryRate}% delivery rate
            </option>
          ))}
        </select>

        {ddLoading && (
          <div className="flex justify-center py-4">
            <Loader2 className="animate-spin text-gold" size={18} />
          </div>
        )}

        {selectedProject && (() => {
          const proj = projects.find((p) => p.name === selectedProject);
          return proj ? (
            <button
              onClick={() => navigate(`/xray/${proj.id}`)}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gold/10 text-gold rounded-lg text-body font-medium hover:bg-gold/20 transition-colors"
            >
              Open X-Ray <ChevronRight size={16} />
            </button>
          ) : null;
        })()}
      </aside>

      <div className="flex-1 overflow-y-auto p-6">
        {hasSelection && (
          <div className="flex gap-1 mb-6 border-b border-border pb-px">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-4 py-2 text-body font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === t.key
                    ? 'border-gold text-gold'
                    : 'border-transparent text-text-dim hover:text-text-secondary'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {tabLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-gold" size={24} />
          </div>
        ) : !hasSelection ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-dim">
            <div className="text-heading mb-2">Select an Area or Project</div>
            <div className="text-body">Choose from the dropdowns to load intelligence</div>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && <OverviewTab phases={phases} viewBlocking={viewBlocking} scTruth={scTruth} progress={progress} />}
            {activeTab === 'phases' && <PhaseTab items={phases} />}
            {activeTab === 'blocking' && <BlockingTab items={viewBlocking} />}
            {activeTab === 'service_charges' && <ServiceChargesTab scTruth={scTruth} scTrajectory={scTrajectory} />}
            {activeTab === 'handover' && <HandoverTab data={progress} />}
            {activeTab === 'developer' && <DeveloperTab items={developerScores} />}
          </>
        )}
      </div>
    </div>
  );
}
