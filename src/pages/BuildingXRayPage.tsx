import { useParams, useNavigate } from 'react-router-dom';
import { useXrayData } from '@/hooks/useXrayData';
import { useViewBlocking } from '@/hooks/useViewBlocking';
import { Badge } from '@/components/trust/Badge';
import { Verdict } from '@/components/trust/Verdict';
import { fmtAed, fmtNum, fmtDate } from '@/lib/constants';
import { useNavStore } from '@/store/navigation';
import { Loader2, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { sb } from '@/lib/supabase';

function riskColor(score: number): string {
  if (score <= 30) return '#27AE60';
  if (score <= 60) return '#F39C12';
  return '#E74C3C';
}

/* ── Project Browser (when no projectId) ──────────────────── */
interface ProjectListItem {
  id: string;
  projectName: string;
  developer: string;
  community: string;
  status: string;
  totalFloors: number;
  totalUnits: number;
}

function ProjectBrowser() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    sb.from('xray_projects')
      .select('id, project_name, developer, master_community, project_status, total_floors, total_units')
      .order('project_name')
      .then(({ data }) => {
        if (data) {
          setProjects(
            (data as Record<string, unknown>[]).map((r) => ({
              id: (r.id as string) ?? '',
              projectName: (r.project_name as string) ?? '',
              developer: (r.developer as string) ?? '',
              community: (r.master_community as string) ?? '',
              status: (r.project_status as string) ?? '',
              totalFloors: (r.total_floors as number) ?? 0,
              totalUnits: (r.total_units as number) ?? 0,
            }))
          );
        }
        setLoading(false);
      });
  }, []);

  const filtered = search
    ? projects.filter((p) =>
        p.projectName.toLowerCase().includes(search.toLowerCase()) ||
        p.developer.toLowerCase().includes(search.toLowerCase()) ||
        p.community.toLowerCase().includes(search.toLowerCase())
      )
    : projects;

  const STATUS_COLOR: Record<string, string> = {
    Completed: '#27AE60',
    'Under Construction': '#F39C12',
    Planned: '#2E75B6',
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gold" size={28} /></div>;
  }

  return (
    <div className="p-6 overflow-y-auto h-full">
      <h1 className="text-heading font-semibold mb-1">Building X-Ray</h1>
      <p className="text-body text-text-secondary mb-6">Select a project for floor-level intelligence</p>

      {/* Search */}
      <div className="relative mb-6 max-w-lg">
        <Search className="absolute left-3 top-2.5 text-text-dim" size={16} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects, developers, communities..."
          className="w-full bg-white/5 border border-border rounded-lg pl-10 pr-4 py-2.5 text-body text-text-primary focus:border-gold focus:outline-none"
        />
      </div>

      <div className="text-micro text-text-dim mb-3">{filtered.length} projects available</div>

      {/* Project grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((p) => (
          <button
            key={p.id}
            onClick={() => navigate(`/xray/${p.id}`)}
            className="bg-surface border border-border rounded-lg p-4 text-left hover:border-gold/30 transition-colors group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-body font-medium text-text-primary group-hover:text-gold transition-colors truncate">{p.projectName}</span>
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0 ml-2"
                style={{ color: STATUS_COLOR[p.status] ?? '#8892A4', backgroundColor: `${STATUS_COLOR[p.status] ?? '#8892A4'}20` }}>
                {p.status}
              </span>
            </div>
            <div className="text-micro text-text-secondary">{p.developer}</div>
            <div className="text-micro text-text-dim">{p.community}</div>
            <div className="flex gap-4 mt-2 text-[9px] text-text-dim">
              {p.totalFloors > 0 && <span>{p.totalFloors} floors</span>}
              {p.totalUnits > 0 && <span>{p.totalUnits} units</span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── X-Ray Detail Page ────────────────────────────────────── */
export function BuildingXRayPage() {
  const { projectId } = useParams<{ projectId: string }>();

  // If no projectId, show the browser
  if (!projectId) {
    return <ProjectBrowser />;
  }

  return <XRayDetail projectId={projectId} />;
}

function XRayDetail({ projectId }: { projectId: string }) {
  const { project, unitTypes, transactions, loading } = useXrayData(projectId);
  const { data: viewBlocking, loading: vbLoading } = useViewBlocking(project?.projectName ?? null);
  const { activeFloor, setActiveFloor } = useNavStore();
  const [activeXrayTab, setActiveXrayTab] = useState<'floor' | 'dld' | 'view'>('floor');
  const navigate = useNavigate();

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-gold" size={28} /></div>;
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-dim">
        <div className="text-body mb-4">Project not found. Verify the project ID exists in xray_projects.</div>
        <button onClick={() => navigate('/xray')} className="text-gold hover:underline">Browse all projects</button>
      </div>
    );
  }

  const totalFloors = project.totalFloors || 19;

  // Directional view risk
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const dirData: Record<string, { risk: number; safe: number; blocker: string }> = {};
  directions.forEach((d) => { dirData[d] = { risk: 0, safe: 0, blocker: '' }; });
  viewBlocking.forEach((v) => {
    const dir = v.primary_affected_direction?.toUpperCase() ??
      directions.find((d) => v.view_name?.toUpperCase().includes(d)) ?? null;
    if (dir && dirData[dir] && v.risk_score > dirData[dir].risk) {
      dirData[dir] = { risk: v.risk_score, safe: v.safe_above_floor, blocker: v.blocker_name };
    }
  });

  const maxRisk = viewBlocking.length > 0 ? Math.max(...viewBlocking.map((v) => v.risk_score)) : 0;
  const verdictType = maxRisk > 70 ? 'AVOID' as const : maxRisk > 40 ? 'NEGOTIATE' as const : maxRisk > 0 ? 'WAIT' as const : 'BUY' as const;

  return (
    <div className="p-6 overflow-y-auto h-full">
      {/* Back link */}
      <button onClick={() => navigate('/xray')} className="text-micro text-text-dim hover:text-gold mb-3 block">← All Projects</button>

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
          <button key={t.key} onClick={() => setActiveXrayTab(t.key)}
            className={`px-4 py-2 text-body font-medium border-b-2 -mb-px transition-colors ${
              activeXrayTab === t.key ? 'border-gold text-gold' : 'border-transparent text-text-dim hover:text-text-secondary'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Floor Plate Tab */}
      {activeXrayTab === 'floor' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-label text-text-dim">Floor:</span>
            <div className="flex gap-1 flex-wrap">
              {Array.from({ length: totalFloors }, (_, i) => i + 1).map((f) => (
                <button key={f} onClick={() => setActiveFloor(f)}
                  className={`w-8 h-8 rounded text-micro font-mono transition-colors ${
                    activeFloor === f ? 'bg-gold text-bg' : 'bg-white/5 text-text-dim hover:text-text-secondary'
                  }`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          {unitTypes.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {unitTypes.map((u, i) => (
                <div key={i} className="bg-surface border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-body font-medium text-text-primary">{u.unitType}</span>
                    <span className="text-micro text-text-dim">{u.orientation}</span>
                  </div>
                  <div className="space-y-1 text-micro">
                    <div className="flex justify-between"><span className="text-text-secondary">Area</span><span className="font-mono">{fmtNum(Math.round(u.totalAreaSqft))} sqft</span></div>
                    <div className="flex justify-between"><span className="text-text-secondary">Units/Floor</span><span className="font-mono">{u.unitsPerFloor}</span></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-body text-text-dim">No unit type data available</p>
          )}
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
            <p className="text-body text-text-dim">No transaction data for "{project.projectName}"</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-body">
                <thead>
                  <tr className="text-left text-label text-text-dim uppercase tracking-wider">
                    <th className="pb-3 pr-4">Date</th><th className="pb-3 pr-4">Type</th>
                    <th className="pb-3 pr-4">Area (sqft)</th><th className="pb-3 pr-4">PSF</th><th className="pb-3">Worth</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 50).map((t, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="py-2 pr-4 text-micro text-text-dim">{fmtDate(t.date)}</td>
                      <td className="py-2 pr-4 text-text-secondary">{t.unitType}</td>
                      <td className="py-2 pr-4 font-mono">{fmtNum(Math.round(t.areaSqft))}</td>
                      <td className="py-2 pr-4 font-mono text-gold">{fmtAed(t.psfSqft)}</td>
                      <td className="py-2 font-mono">{fmtAed(t.worth)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-micro text-text-dim mt-3">Source: Government Records (DLD). PSF = AED/sqm ÷ 10.7639.</p>
        </div>
      )}

      {/* View + Risk Tab */}
      {activeXrayTab === 'view' && (
        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-lg p-5">
            <h3 className="text-subheading font-medium mb-4">Directional View Risk</h3>
            {vbLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gold" size={20} /></div>
            ) : viewBlocking.length === 0 ? (
              <p className="text-body text-text-dim">No view blocking data for this project</p>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-3 max-w-lg mx-auto mb-6">
                  {directions.map((dir) => {
                    const d = dirData[dir];
                    return (
                      <div key={dir} className="rounded-lg p-3 text-center border"
                        style={{ borderColor: `${riskColor(d.risk)}40`, backgroundColor: `${riskColor(d.risk)}10` }}>
                        <div className="text-subheading font-semibold" style={{ color: riskColor(d.risk) }}>{dir}</div>
                        <div className="text-micro font-mono" style={{ color: riskColor(d.risk) }}>{d.risk}/100</div>
                        {d.safe > 0 && <div className="text-[9px] text-text-dim mt-1">Safe &gt; F{d.safe}</div>}
                        {d.blocker && <div className="text-[9px] text-text-dim truncate mt-0.5">{d.blocker}</div>}
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-2">
                  {viewBlocking.slice(0, 5).map((v, i) => (
                    <div key={i} className="flex items-center gap-3 bg-bg rounded-lg p-3 border border-border">
                      <div className="w-10 h-10 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: `${riskColor(v.risk_score)}20` }}>
                        <span className="text-body font-bold font-mono" style={{ color: riskColor(v.risk_score) }}>{v.risk_score}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-body font-medium truncate">{v.view_name} → {v.blocker_name}</div>
                        <div className="text-micro text-text-dim">
                          {v.blocker_status} · Safe &gt; F{v.safe_above_floor}
                          {v.pct_of_view_blocked > 0 && ` · ${v.pct_of_view_blocked}% blocked`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <Verdict
            verdict={verdictType}
            reasoning={viewBlocking.length === 0
              ? 'No view blocking data available for this project.'
              : maxRisk > 70
                ? `High view risk (${maxRisk}/100). Negotiate based on safe floor thresholds.`
                : maxRisk > 40
                  ? `Moderate view risk (${maxRisk}/100). Safe floors exist — use as leverage.`
                  : `Low view risk (${maxRisk}/100). Views generally protected.`}
          />
        </div>
      )}
    </div>
  );
}
