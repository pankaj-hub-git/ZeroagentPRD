import { useState } from 'react';
import {
  useExploreData,
  PhaseItem, ViewBlockItem, SCTruthItem, SCTrajectoryItem,
  DeveloperScoreItem, ProgressData, AmenityItem, CatalystItem,
  LivabilityData, NationalityRow, GovAlignmentData,
} from '@/hooks/useExploreData';
import { fmtNum, fmtDate, fmtAed } from '@/lib/constants';
import { Loader2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip,
} from 'recharts';

const GOLD = '#C9A84C';
const PIE_COLORS = ['#C9A84C', '#2E75B6', '#27AE60', '#E74C3C', '#F39C12', '#8E44AD', '#1ABC9C', '#E67E22'];

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'amenities', label: 'Amenities' },
  { key: 'catalysts', label: 'Micro Catalyst' },
  { key: 'livability', label: 'Livability' },
  { key: 'demographics', label: 'Demographics' },
  { key: 'phases', label: 'Phases' },
  { key: 'blocking', label: 'Blocking' },
  { key: 'service_charges', label: 'Service Charges' },
  { key: 'handover', label: 'Handover' },
  { key: 'developer', label: 'Developer' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function riskColor(score: number): string {
  if (score <= 30) return '#27AE60';
  if (score <= 60) return '#F39C12';
  return '#E74C3C';
}

function verdictColor(v: string): string {
  if (v === 'DELIVERED') return '#27AE60';
  if (v === 'PARTIAL') return '#F39C12';
  return '#E74C3C';
}

function EmptyTab({ message }: { message: string }) {
  return <div className="flex items-center justify-center py-12 text-body text-text-dim">{message}</div>;
}

/* ── Overview ─────────────────────────────────────────────── */
function OverviewTab({ phases, viewBlocking, scTruth, progress, livability, govAlignment, amenities }: {
  phases: PhaseItem[]; viewBlocking: ViewBlockItem[]; scTruth: SCTruthItem[];
  progress: ProgressData | null; livability: LivabilityData | null;
  govAlignment: GovAlignmentData | null; amenities: AmenityItem[];
}) {
  const totalPhases = phases.length;
  const avgReturn = totalPhases > 0 ? phases.reduce((s, p) => s + p.returnPct, 0) / totalPhases : 0;
  const maxRisk = viewBlocking.length > 0 ? Math.max(...viewBlocking.map((v) => v.riskScore)) : 0;
  const latestSc = scTruth.length > 0 ? scTruth[0] : null;
  const delivered = amenities.filter((a) => a.deliveryVerdict === 'DELIVERED').length;
  const totalAmenities = amenities.length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Phases" value={String(totalPhases)} color={GOLD} />
        <StatCard label="Avg Return" value={`${avgReturn > 0 ? '+' : ''}${avgReturn.toFixed(1)}%`} color={avgReturn >= 0 ? '#27AE60' : '#E74C3C'} />
        <StatCard label="Max View Risk" value={`${maxRisk}/100`} color={riskColor(maxRisk)} />
        <StatCard label="SC (AED/sqft)" value={latestSc ? latestSc.bestSc.toFixed(0) : '—'} color="#8892A4" sub={latestSc?.scStatus} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Livability" value={livability ? `${livability.livabilityScore.toFixed(0)}/100` : '—'} color={livability ? GOLD : '#8892A4'} sub={livability?.grade} />
        <StatCard label="Amenity Delivery" value={totalAmenities > 0 ? `${delivered}/${totalAmenities}` : '—'} color={totalAmenities > 0 ? (delivered / totalAmenities > 0.7 ? '#27AE60' : '#F39C12') : '#8892A4'} />
        <StatCard label="Gov Alignment" value={govAlignment ? `${govAlignment.governmentAlignmentScore.toFixed(0)}/100` : '—'} color={govAlignment ? '#2E75B6' : '#8892A4'} sub={govAlignment?.metroStatus} />
        <StatCard label="DDA Completion" value={progress ? `${progress.ddaCompletion}%` : '—'} color={progress ? (progress.ddaCompletion >= 80 ? '#27AE60' : '#F39C12') : '#8892A4'} />
      </div>
      {govAlignment && (
        <div className="bg-surface border border-border rounded-lg p-4 flex gap-4">
          {govAlignment.d33FdiTargetZone && <span className="text-micro px-2 py-1 bg-blue-900/30 text-blue-400 rounded">D33 FDI Target Zone</span>}
          {govAlignment.goldenVisaEligible && <span className="text-micro px-2 py-1 bg-gold/20 text-gold rounded">Golden Visa Eligible</span>}
          <span className="text-micro text-text-dim">Metro: {govAlignment.metroStatus}</span>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-3">
      <div className="text-micro text-text-dim">{label}</div>
      <div className="text-heading font-mono" style={{ color }}>{value}</div>
      {sub && <div className="text-micro text-text-dim">{sub}</div>}
    </div>
  );
}

/* ── Amenities (Satellite Verification) ──────────────────── */
function AmenitiesTab({ items }: { items: AmenityItem[] }) {
  if (!items.length) return <EmptyTab message="No satellite amenity verification data available" />;
  const byClass: Record<string, AmenityItem[]> = {};
  items.forEach((a) => { if (!byClass[a.amenityClass]) byClass[a.amenityClass] = []; byClass[a.amenityClass].push(a); });

  const summary = Object.entries(byClass).map(([cls, arr]) => ({
    class: cls,
    delivered: arr.filter((a) => a.deliveryVerdict === 'DELIVERED').length,
    partial: arr.filter((a) => a.deliveryVerdict === 'PARTIAL').length,
    notDelivered: arr.filter((a) => a.deliveryVerdict !== 'DELIVERED' && a.deliveryVerdict !== 'PARTIAL').length,
    avgScore: arr.reduce((s, a) => s + a.deliveryScore, 0) / arr.length,
  }));

  return (
    <div className="space-y-4">
      <div className="text-label text-text-dim uppercase tracking-wider">Satellite Amenity Verification</div>
      <div className="bg-surface border border-border rounded-lg p-4">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={summary}>
            <XAxis dataKey="class" tick={{ fontSize: 9, fill: '#8892A4' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#3A3F52' }} axisLine={false} tickLine={false} width={30} />
            <Tooltip contentStyle={{ background: '#0D0D20', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, fontSize: 11 }} />
            <Bar dataKey="delivered" stackId="a" fill="#27AE60" name="Delivered" />
            <Bar dataKey="partial" stackId="a" fill="#F39C12" name="Partial" />
            <Bar dataKey="notDelivered" stackId="a" fill="#E74C3C" name="Not Delivered" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2">
        {items.map((a, i) => (
          <div key={i} className="bg-surface border border-border rounded-lg p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: `${verdictColor(a.deliveryVerdict)}20` }}>
              <span className="text-body font-bold font-mono" style={{ color: verdictColor(a.deliveryVerdict) }}>{a.deliveryScore}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-body font-medium">{a.amenityClass}</span>
                <span className="text-micro font-semibold" style={{ color: verdictColor(a.deliveryVerdict) }}>{a.deliveryVerdict}</span>
              </div>
              {a.verdictLogic && <div className="text-micro text-text-dim line-clamp-2">{a.verdictLogic}</div>}
              {a.imageryDate && <div className="text-[9px] text-text-dim">Imagery: {fmtDate(a.imageryDate)}</div>}
            </div>
          </div>
        ))}
      </div>
      <p className="text-micro text-text-dim">Source: Google Earth Engine satellite verification. Score 0-100.</p>
    </div>
  );
}

/* ── Micro Catalyst ──────────────────────────────────────── */
function CatalystsTab({ items }: { items: CatalystItem[] }) {
  if (!items.length) return <EmptyTab message="No government catalysts affecting this area" />;
  return (
    <div className="space-y-3">
      <div className="text-label text-text-dim uppercase tracking-wider">Government & Infrastructure Catalysts</div>
      {items.map((c, i) => (
        <div key={i} className="bg-surface border border-border rounded-lg p-4" style={{ borderLeft: `3px solid ${c.impactScore >= 7 ? '#27AE60' : c.impactScore >= 4 ? '#F39C12' : '#8892A4'}` }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-body font-medium text-text-primary">{c.name}</span>
            <span className="text-micro font-mono text-text-dim">Impact: {'●'.repeat(Math.min(Math.round(c.impactScore), 10))}</span>
          </div>
          <div className="flex items-center gap-3 text-micro text-text-secondary mb-1">
            <span className="px-1.5 py-0.5 bg-white/5 rounded">{c.type}</span>
            <span>{c.status}</span>
            {c.impactMagnitude && <span className="text-gold">{c.impactMagnitude}</span>}
          </div>
          <div className="text-micro text-text-dim line-clamp-2">{c.description}</div>
          <div className="flex gap-4 text-[9px] text-text-dim mt-2">
            <span>Announced: {fmtDate(c.announcedDate)}</span>
            {c.expectedCompletion && <span>Expected: {fmtDate(c.expectedCompletion)}</span>}
            {c.investmentAed && <span>Investment: {fmtAed(c.investmentAed)}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Livability ──────────────────────────────────────────── */
function LivabilityTab({ data }: { data: LivabilityData | null }) {
  if (!data) return <EmptyTab message="No livability data available" />;
  const radarData = [
    { subject: 'View', value: data.viewScore },
    { subject: 'Amenity', value: data.amenityScore },
    { subject: 'Transit', value: data.transitScore },
    { subject: 'Low Disruption', value: 100 - data.constructionDisruption },
    { subject: 'Low Pressure', value: 100 - data.supplyPressure },
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="text-heading font-mono" style={{ color: GOLD }}>{data.livabilityScore.toFixed(0)}/100</div>
        <span className="text-body font-semibold px-2 py-1 rounded" style={{ color: GOLD, backgroundColor: `${GOLD}20` }}>{data.grade}</span>
      </div>
      <div className="bg-surface border border-border rounded-lg p-4">
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="rgba(255,255,255,0.06)" />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#8892A4' }} />
            <PolarRadiusAxis tick={{ fontSize: 8, fill: '#3A3F52' }} domain={[0, 100]} />
            <Radar dataKey="value" stroke={GOLD} fill={GOLD} fillOpacity={0.2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'View', value: data.viewScore },
          { label: 'Amenity', value: data.amenityScore },
          { label: 'Transit', value: data.transitScore },
          { label: 'Construction', value: data.constructionDisruption, invert: true },
          { label: 'Supply Pressure', value: data.supplyPressure, invert: true },
        ].map((m) => (
          <div key={m.label} className="bg-surface border border-border rounded-lg p-3 text-center">
            <div className="text-micro text-text-dim">{m.label}</div>
            <div className="text-body font-mono" style={{ color: m.invert ? riskColor(m.value) : (m.value >= 70 ? '#27AE60' : m.value >= 40 ? '#F39C12' : '#E74C3C') }}>
              {m.value.toFixed(0)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Community Demographics (Nationality) ────────────────── */
function DemographicsTab({ items }: { items: NationalityRow[] }) {
  if (!items.length) return <EmptyTab message="No community demographics data available" />;
  // Latest quarter
  const latestQ = items[0]?.quarterStart;
  const latestRows = items.filter((r) => r.quarterStart === latestQ).sort((a, b) => b.pct - a.pct);
  const pieData = latestRows.slice(0, 8).map((r) => ({ name: r.nationality, value: Number(r.pct.toFixed(1)) }));
  const othersSum = latestRows.slice(8).reduce((s, r) => s + r.pct, 0);
  if (othersSum > 0) pieData.push({ name: 'Others', value: Number(othersSum.toFixed(1)) });

  return (
    <div className="space-y-4">
      <div className="text-label text-text-dim uppercase tracking-wider">Community Demographics</div>
      <p className="text-micro text-text-dim">Source: DEWA utility connections. Quarter: {latestQ}</p>
      <div className="bg-surface border border-border rounded-lg p-4 flex items-center gap-6">
        <ResponsiveContainer width="40%" height={250}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} label={({ name, value }) => `${name} ${value}%`} labelLine={false}>
              {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: '#0D0D20', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-1.5">
          {pieData.map((d, i) => (
            <div key={d.name} className="flex items-center gap-2 text-micro">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
              <span className="text-text-secondary flex-1">{d.name}</span>
              <span className="font-mono text-text-primary">{d.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Phase Intel ──────────────────────────────────────────── */
function PhaseTab({ items }: { items: PhaseItem[] }) {
  if (!items.length) return <EmptyTab message="No phase data available for this area/project" />;
  const momentumIcon: Record<string, string> = { RISING: '▲', FALLING: '▼', STABLE: '—' };
  const momentumColor: Record<string, string> = { RISING: '#27AE60', FALLING: '#E74C3C', STABLE: '#8892A4' };
  return (
    <div className="space-y-3">
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
            <div className="flex items-center gap-4 text-micro mb-2">
              <span style={{ color: p.returnPct >= 0 ? '#27AE60' : '#E74C3C' }} className="font-semibold">
                {p.returnPct > 0 ? '+' : ''}{p.returnPct}%
              </span>
              <span className="text-text-dim">{p.completionPct}% complete</span>
              <span className="text-text-dim">{p.developerTier}</span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-1.5">
              <div className="h-1.5 rounded-full" style={{ width: `${Math.min(p.completionPct, 100)}%`, backgroundColor: p.completionPct >= 100 ? '#27AE60' : GOLD }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Blocking ─────────────────────────────────────────────── */
function BlockingTab({ items }: { items: ViewBlockItem[] }) {
  if (!items.length) return <EmptyTab message="No view blocking data available" />;
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const dirData: Record<string, { risk: number; safe: number }> = {};
  directions.forEach((d) => { dirData[d] = { risk: 0, safe: 0 }; });
  items.forEach((v) => {
    const dir = directions.find((d) => v.viewName?.toUpperCase().includes(d));
    if (dir && v.riskScore > dirData[dir].risk) dirData[dir] = { risk: v.riskScore, safe: v.safeAboveFloor };
  });
  return (
    <div className="space-y-4">
      <div className="bg-surface border border-border rounded-lg p-4">
        <div className="text-label text-text-dim uppercase tracking-wider mb-3">Directional View Risk</div>
        <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
          {directions.map((dir) => {
            const d = dirData[dir];
            return (
              <div key={dir} className="rounded-lg p-3 text-center border" style={{ borderColor: `${riskColor(d.risk)}40`, backgroundColor: `${riskColor(d.risk)}10` }}>
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
                {v.pctBlocked > 0 && `${v.pctBlocked}% blocked · `}Safe above F{v.safeAboveFloor}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Service Charges ──────────────────────────────────────── */
function ServiceChargesTab({ scTruth, scTrajectory }: { scTruth: SCTruthItem[]; scTrajectory: SCTrajectoryItem[] }) {
  if (!scTruth.length && !scTrajectory.length) return <EmptyTab message="No service charge data available" />;
  const SC_STATUS_COLOR: Record<string, string> = { VERIFIED: '#27AE60', YIELD_EROSION: '#E74C3C', STABLE: '#8892A4', INCREASING: '#F39C12' };
  return (
    <div className="space-y-4">
      {scTruth.length > 0 && (
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-label text-text-dim uppercase tracking-wider mb-3">Service Charge Evolution</div>
          <div className="overflow-x-auto">
            <table className="w-full text-body">
              <thead>
                <tr className="text-left text-label text-text-dim uppercase tracking-wider">
                  <th className="pb-2 pr-3">Phase</th><th className="pb-2 pr-3">Year</th>
                  <th className="pb-2 pr-3">Mollak</th><th className="pb-2 pr-3">Reported</th>
                  <th className="pb-2 pr-3">Best</th><th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {scTruth.map((sc, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="py-2 pr-3">{sc.phaseName}</td>
                    <td className="py-2 pr-3 font-mono">{sc.mollakYear}</td>
                    <td className="py-2 pr-3 font-mono">AED {sc.mollakSc.toFixed(1)}</td>
                    <td className="py-2 pr-3 font-mono">{sc.reportedSc > 0 ? `AED ${sc.reportedSc.toFixed(1)}` : '—'}</td>
                    <td className="py-2 pr-3 font-mono text-gold">AED {sc.bestSc.toFixed(1)}</td>
                    <td className="py-2"><span style={{ color: SC_STATUS_COLOR[sc.scStatus] ?? '#8892A4' }} className="text-micro font-semibold">{sc.scStatus === 'YIELD_EROSION' ? 'Yield Erosion' : sc.scStatus}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {scTrajectory.length > 1 && (
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-label text-text-dim uppercase tracking-wider mb-3">SC Trajectory (AED/sqft)</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={scTrajectory}>
              <XAxis dataKey="budgetYear" tick={{ fontSize: 9, fill: '#8892A4' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#3A3F52' }} axisLine={false} tickLine={false} width={50} />
              <Tooltip contentStyle={{ background: '#0D0D20', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, fontSize: 11 }} formatter={(v: unknown) => [`AED ${Number(v).toFixed(1)}/sqft`, 'SC']} />
              <Line type="monotone" dataKey="serviceChargeSqft" stroke={GOLD} strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ── Handover ─────────────────────────────────────────────── */
function HandoverTab({ data }: { data: ProgressData | null }) {
  if (!data) return <EmptyTab message="No handover data available" />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="DDA Completion" value={`${data.ddaCompletion}%`} color={data.ddaCompletion >= 80 ? '#27AE60' : '#F39C12'} />
        <StatCard label="Primary Sales" value={fmtNum(data.salesCount)} color="#8892A4" />
        <StatCard label="Hidden Inventory" value={fmtNum(data.hiddenInventory)} color={data.hiddenInventory > 50 ? '#E74C3C' : '#8892A4'} />
      </div>
      {data.conflictFlag && (
        <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-3 text-micro text-danger font-medium">
          ⚡ CONFLICT DETECTED: {data.conflictType}
        </div>
      )}
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

/* ── Developer ────────────────────────────────────────────── */
function DeveloperTab({ items }: { items: DeveloperScoreItem[] }) {
  if (!items.length) return <EmptyTab message="Select a project or developer to view scores" />;
  const TIER_COLOR: Record<string, string> = { premium: '#C9A84C', mid_tier: '#2E75B6', budget: '#F39C12', new_entrant: '#8892A4' };
  return (
    <div className="space-y-3">
      {items.map((d, i) => (
        <div key={i} className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-body font-medium text-text-primary">{d.developer}</span>
            <span className="text-micro font-semibold px-2 py-0.5 rounded" style={{ color: TIER_COLOR[d.brandTier] ?? '#8892A4', backgroundColor: `${TIER_COLOR[d.brandTier] ?? '#8892A4'}20` }}>
              {d.brandTier.replace(/_/g, ' ').toUpperCase()}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div><div className="text-micro text-text-dim">Delivery Rate</div><div className="text-body font-mono" style={{ color: d.deliveryRate >= 80 ? '#27AE60' : '#F39C12' }}>{d.deliveryRate.toFixed(0)}%</div></div>
            <div><div className="text-micro text-text-dim">Avg Delay</div><div className="text-body font-mono">{d.avgDelayMonths.toFixed(0)} mo</div></div>
            <div><div className="text-micro text-text-dim">Build Quality</div><div className="text-body font-mono">{d.buildQuality.toFixed(1)}/10</div></div>
            <div><div className="text-micro text-text-dim">After Sales</div><div className="text-body font-mono">{d.afterSales.toFixed(1)}/10</div></div>
          </div>
          {d.notableProjects && <div className="text-micro text-text-dim">Notable: {d.notableProjects}</div>}
          {d.redFlags && <div className="text-micro text-danger mt-1">⚠ {d.redFlags}</div>}
        </div>
      ))}
    </div>
  );
}

/* ── Main Explore Page ─────────────────────────────────────── */
export function ExplorePage() {
  const {
    areas, projects, developers, ddLoading,
    selectedArea, selectedProject, selectedDeveloper,
    setSelectedArea, setSelectedProject, setSelectedDeveloper,
    phases, viewBlocking, scTruth, scTrajectory, progress, developerScores,
    amenities, catalysts, livability, nationalityMix, govAlignment,
    tabLoading,
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
      {/* Sidebar */}
      <aside className="w-[280px] bg-surface border-r border-border flex flex-col shrink-0 overflow-y-auto p-4">
        <h2 className="text-label text-text-dim uppercase tracking-wider mb-4">Explore</h2>

        <label className="text-micro text-text-dim mb-1">Area</label>
        <select value={selectedArea ?? ''} onChange={(e) => { setSelectedArea(e.target.value || null); setSelectedProject(null); }}
          className="w-full bg-white/5 border border-border rounded px-2 py-2 text-body text-text-secondary focus:border-gold focus:outline-none mb-3">
          <option value="">All Areas</option>
          {areas.map((a) => <option key={a.area} value={a.area}>{a.area} ({a.communityCount})</option>)}
        </select>

        <label className="text-micro text-text-dim mb-1">Project</label>
        <select value={selectedProject ?? ''} onChange={(e) => setSelectedProject(e.target.value || null)}
          className="w-full bg-white/5 border border-border rounded px-2 py-2 text-body text-text-secondary focus:border-gold focus:outline-none mb-3">
          <option value="">All Projects</option>
          {filteredProjects.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
        </select>

        <label className="text-micro text-text-dim mb-1">Developer</label>
        <select value={selectedDeveloper ?? ''} onChange={(e) => { setSelectedDeveloper(e.target.value || null); setSelectedProject(null); }}
          className="w-full bg-white/5 border border-border rounded px-2 py-2 text-body text-text-secondary focus:border-gold focus:outline-none mb-3">
          <option value="">All Developers</option>
          {developers.map((d) => <option key={d.developer} value={d.developer}>{d.developer}</option>)}
        </select>

        {ddLoading && <div className="flex justify-center py-4"><Loader2 className="animate-spin text-gold" size={18} /></div>}

        {selectedProject && (() => {
          const proj = projects.find((p) => p.name === selectedProject);
          return proj ? (
            <button onClick={() => navigate(`/xray/${proj.id}`)}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gold/10 text-gold rounded-lg text-body font-medium hover:bg-gold/20 transition-colors">
              Open X-Ray <ChevronRight size={16} />
            </button>
          ) : null;
        })()}
      </aside>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {hasSelection && (
          <div className="flex gap-1 mb-6 border-b border-border pb-px overflow-x-auto">
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`px-3 py-2 text-body font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                  activeTab === t.key ? 'border-gold text-gold' : 'border-transparent text-text-dim hover:text-text-secondary'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {tabLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gold" size={24} /></div>
        ) : !hasSelection ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-dim">
            <div className="text-heading mb-2">Select an Area or Project</div>
            <div className="text-body">Choose from the dropdowns to load intelligence across all layers</div>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && <OverviewTab phases={phases} viewBlocking={viewBlocking} scTruth={scTruth} progress={progress} livability={livability} govAlignment={govAlignment} amenities={amenities} />}
            {activeTab === 'amenities' && <AmenitiesTab items={amenities} />}
            {activeTab === 'catalysts' && <CatalystsTab items={catalysts} />}
            {activeTab === 'livability' && <LivabilityTab data={livability} />}
            {activeTab === 'demographics' && <DemographicsTab items={nationalityMix} />}
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
