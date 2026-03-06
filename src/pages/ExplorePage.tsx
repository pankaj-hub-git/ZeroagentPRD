import { useState } from 'react';
import { useExploreData, AmenityItem, CatalystItem, PhaseItem, ViewBlockItem } from '@/hooks/useExploreData';
import { fmtNum, fmtDate } from '@/lib/constants';
import { ScoreRing } from '@/components/trust/ScoreRing';
import { Loader2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from 'recharts';

const GOLD = '#C9A84C';

const TABS = [
  { key: 'amenities', label: 'Amenities' },
  { key: 'catalyst', label: 'Micro Catalyst' },
  { key: 'livability', label: 'Livability' },
  { key: 'progress', label: 'Progress' },
  { key: 'phase', label: 'Phase Intel' },
  { key: 'blocking', label: 'View Blocking' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const STATUS_ICON: Record<string, string> = {
  Completed: '✓',
  'Under Construction': '🏗',
  Planned: '📋',
};

const CATALYST_ICON: Record<string, string> = {
  road_upgrade: '🏗',
  hospital: '🏥',
  beach: '🏖',
  smart_city: '🌆',
  transport: '🚌',
};

const VERDICT_COLOR: Record<string, string> = {
  DELIVERED: '#27AE60',
  PARTIAL: '#F39C12',
  NOT_DELIVERED: '#E74C3C',
};

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  Completed: { bg: 'rgba(39,174,96,0.15)', text: '#27AE60' },
  'Under Construction': { bg: 'rgba(243,156,18,0.15)', text: '#F39C12' },
  Approved: { bg: 'rgba(46,117,182,0.15)', text: '#2E75B6' },
  Planned: { bg: 'rgba(138,143,152,0.15)', text: '#8892A4' },
};

function impactDots(score: number, max = 5): string {
  const filled = Math.min(Math.round(score), max);
  return '●'.repeat(filled) + '○'.repeat(max - filled);
}

function riskColor(score: number): string {
  if (score <= 30) return '#27AE60';
  if (score <= 60) return '#F39C12';
  return '#E74C3C';
}

/* ── Amenities Tab ─────────────────────────────────────────── */
function AmenitiesTab({ items }: { items: AmenityItem[] }) {
  if (!items.length) return <EmptyTab message="Select a project to view amenity intelligence" />;
  const grouped: Record<string, AmenityItem[]> = {};
  items.forEach((a) => {
    if (!grouped[a.category]) grouped[a.category] = [];
    grouped[a.category].push(a);
  });
  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([cat, list]) => (
        <div key={cat}>
          <h4 className="text-label text-text-dim uppercase tracking-wider mb-2">{cat.replace(/_/g, ' ')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {list.map((a, i) => {
              const verdictColor = VERDICT_COLOR[a.satelliteVerdict ?? a.deliveryStatus] ?? '#8892A4';
              return (
                <div key={i} className="bg-surface border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-body font-medium">{a.name}</span>
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ color: verdictColor, backgroundColor: `${verdictColor}20` }}
                    >
                      {a.satelliteVerdict ?? a.deliveryStatus}
                    </span>
                  </div>
                  {a.googleRating != null && (
                    <div className="text-micro text-text-secondary">Google: {a.googleRating}/5 · Verified active</div>
                  )}
                  {a.imageryDate && (
                    <div className="text-micro text-text-dim mt-1">Satellite Analysis ✓ · {fmtDate(a.imageryDate)}</div>
                  )}
                  {!a.imageryDate && (
                    <div className="text-micro text-text-dim mt-1 italic">Awaiting Verification</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Micro Catalyst Tab ────────────────────────────────────── */
function CatalystTab({ items }: { items: CatalystItem[] }) {
  if (!items.length) return <EmptyTab message="No catalysts found for this community" />;
  return (
    <div className="space-y-3">
      {items.map((c, i) => {
        const sc = STATUS_COLOR[c.status] ?? STATUS_COLOR.Planned;
        return (
          <div key={i} className="bg-surface border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-subheading">{CATALYST_ICON[c.type] ?? '🏗'}</span>
                <span className="text-body font-medium">{c.name}</span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ color: sc.text, backgroundColor: sc.bg }}>
                {c.status}
              </span>
            </div>
            <div className="text-micro text-text-secondary line-clamp-2 mb-2">{c.description}</div>
            <div className="flex items-center gap-4 text-micro text-text-dim">
              <span>Impact: <span className="font-mono">{impactDots(c.impactScore)}</span></span>
              {c.investmentAed && <span>AED {(c.investmentAed / 1e9).toFixed(1)}bn</span>}
              {c.expectedCompletion && <span>Due: {fmtDate(c.expectedCompletion)}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Livability Tab ────────────────────────────────────────── */
function LivabilityTab({ data }: { data: ReturnType<typeof useExploreData>['livability'] }) {
  if (!data) return <EmptyTab message="Select a community to view livability scores" />;
  const radarData = [
    { axis: 'View Quality', value: data.viewScore },
    { axis: 'Amenity Access', value: data.amenityScore },
    { axis: 'Transit', value: data.transitScore },
    { axis: 'Construction-Free', value: 100 - data.constructionDisruption },
    { axis: 'Supply Balance', value: 100 - data.supplyPressure },
  ];
  const gradeColor = data.grade.startsWith('A') ? '#27AE60' : data.grade.startsWith('B') ? '#F39C12' : '#E74C3C';
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-6">
        <div className="bg-surface border border-border rounded-lg p-4 flex-1">
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.06)" />
              <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: '#8892A4' }} />
              <Radar dataKey="value" stroke={GOLD} fill={GOLD} fillOpacity={0.2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col items-center gap-3 min-w-[120px]">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-heading font-bold border-2"
            style={{ borderColor: gradeColor, color: gradeColor }}
          >
            {data.grade}
          </div>
          <div className="text-body font-medium text-text-primary">{data.label}</div>
          <div className="text-subheading font-mono text-gold">{data.livabilityScore}/100</div>
        </div>
      </div>
      <div className="bg-surface border border-border rounded-lg p-4">
        <div className="text-body text-text-secondary">{data.summary}</div>
      </div>
    </div>
  );
}

/* ── Progress Tab ──────────────────────────────────────────── */
function ProgressTab({ data }: { data: ReturnType<typeof useExploreData>['progress'] }) {
  if (!data) return <EmptyTab message="No progress data available" />;
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

/* ── Phase Intel Tab ───────────────────────────────────────── */
function PhaseTab({ items }: { items: PhaseItem[] }) {
  if (!items.length) return <EmptyTab message="No phase data available" />;
  const momentumIcon: Record<string, string> = { RISING: '▲', FALLING: '▼', STABLE: '—' };
  const momentumColor: Record<string, string> = { RISING: '#27AE60', FALLING: '#E74C3C', STABLE: '#8892A4' };
  return (
    <div className="space-y-3">
      {/* Timeline */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {items.map((p, i) => {
          const color = p.completionPct >= 100 ? '#27AE60' : p.completionPct > 0 ? '#F39C12' : '#3A3F52';
          return (
            <div key={i} className="flex items-center gap-2 shrink-0">
              <div
                className="w-4 h-4 rounded-full border-2"
                style={{
                  borderColor: color,
                  backgroundColor: p.completionPct >= 100 ? color : 'transparent',
                }}
              />
              <span className="text-micro text-text-dim">{p.phaseName}</span>
              {i < items.length - 1 && <div className="w-6 h-px bg-border" />}
            </div>
          );
        })}
      </div>

      {/* Phase cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((p, i) => (
          <div key={i} className="bg-surface border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-body font-medium">{p.phaseName}</span>
              <span
                className="text-micro font-semibold"
                style={{ color: momentumColor[p.momentum] ?? '#8892A4' }}
              >
                {momentumIcon[p.momentum] ?? '—'} {p.momentum}
              </span>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="text-micro text-text-dim">
                AED {fmtNum(p.launchPsf)}/sqft → <span className="text-gold font-mono">AED {fmtNum(p.currentPsf)}/sqft</span>
              </div>
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

  // Build compass data from items
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const dirData: Record<string, { risk: number; safe: number; blocker: string; timeline: string }> = {};
  directions.forEach((d) => { dirData[d] = { risk: 0, safe: 0, blocker: '', timeline: '' }; });
  items.forEach((v) => {
    const dir = directions.find((d) => v.viewName?.toUpperCase().includes(d));
    if (dir && v.riskScore > (dirData[dir].risk)) {
      dirData[dir] = { risk: v.riskScore, safe: v.safeAboveFloor, blocker: v.blockerName, timeline: v.timeline };
    }
  });

  return (
    <div className="space-y-4">
      {/* Compass Rose */}
      <div className="bg-surface border border-border rounded-lg p-4">
        <div className="text-label text-text-dim uppercase tracking-wider mb-3">Directional View Risk</div>
        <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
          {directions.map((dir) => {
            const d = dirData[dir];
            return (
              <div
                key={dir}
                className="rounded-lg p-3 text-center border"
                style={{
                  borderColor: `${riskColor(d.risk)}40`,
                  backgroundColor: `${riskColor(d.risk)}10`,
                }}
              >
                <div className="text-subheading font-semibold" style={{ color: riskColor(d.risk) }}>{dir}</div>
                <div className="text-micro font-mono" style={{ color: riskColor(d.risk) }}>{d.risk}/100</div>
                {d.safe > 0 && <div className="text-[9px] text-text-dim mt-1">Safe &gt; F{d.safe}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Blocker list */}
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
            {v.satelliteConfirmed && (
              <span className="text-micro text-verified">Satellite Confirmed</span>
            )}
          </div>
        ))}
      </div>
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
    amenities, catalysts, livability, progress, phases, viewBlocking, tabLoading,
  } = useExploreData();
  const [activeTab, setActiveTab] = useState<TabKey>('amenities');
  const navigate = useNavigate();

  // Filter projects by area/developer
  const filteredProjects = projects.filter((p) => {
    if (selectedArea && !p.community.toLowerCase().includes(selectedArea.toLowerCase())) return false;
    if (selectedDeveloper && p.developer !== selectedDeveloper) return false;
    return true;
  });

  const hasSelection = selectedArea || selectedProject;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar with dropdowns */}
      <aside className="w-[300px] bg-surface border-r border-border flex flex-col shrink-0 overflow-y-auto p-4">
        <h2 className="text-label text-text-dim uppercase tracking-wider mb-4">Explore</h2>

        {/* Area Dropdown */}
        <label className="text-micro text-text-dim mb-1">Area</label>
        <select
          value={selectedArea ?? ''}
          onChange={(e) => { setSelectedArea(e.target.value || null); setSelectedProject(null); }}
          className="w-full bg-white/5 border border-border rounded px-2 py-2 text-body text-text-secondary focus:border-gold focus:outline-none mb-3"
        >
          <option value="">All Areas</option>
          {areas.map((a) => (
            <option key={a.area} value={a.area}>
              {a.area} ({fmtNum(a.txnCount)} deals)
            </option>
          ))}
        </select>

        {/* Project Dropdown */}
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

        {/* Developer Dropdown */}
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

        {/* Open X-Ray button */}
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

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Tab bar */}
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
            {activeTab === 'amenities' && <AmenitiesTab items={amenities} />}
            {activeTab === 'catalyst' && <CatalystTab items={catalysts} />}
            {activeTab === 'livability' && <LivabilityTab data={livability} />}
            {activeTab === 'progress' && <ProgressTab data={progress} />}
            {activeTab === 'phase' && <PhaseTab items={phases} />}
            {activeTab === 'blocking' && <BlockingTab items={viewBlocking} />}
          </>
        )}
      </div>
    </div>
  );
}
