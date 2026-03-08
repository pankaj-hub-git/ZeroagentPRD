import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@/lib/theme';
import { sb } from '@/lib/supabase';
import { Loader2, Search, Sun, Moon } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>;

const FONT_DATA = "'IBM Plex Mono', monospace";

const catColor: Record<string, string> = { apartment: '#60A5FA', villa: '#34D399', off_plan: '#FBBF24' };
const catLabel: Record<string, string> = { apartment: 'APT', villa: 'VILLA', off_plan: 'OFF-PLAN' };
const fmt = (n: number | string | null | undefined): string => n ? Number(n).toLocaleString('en-AE') : '—';
const fmtM = (n: number | null | undefined): string => {
  if (!n) return '—';
  return n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : fmt(n);
};

function Badge({ color, label }: { color: string; label: string }) {
  return (
    <span className="za-badge" style={{ background: color + '18', color }}>
      {label}
    </span>
  );
}

function Stat({ label, value, sub, colors }: { label: string; value: string | number; sub?: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <div style={{ textAlign: 'center', padding: '12px 0' }}>
      <div className="za-data-value-lg">{value}</div>
      <div className="za-data-label" style={{ marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: colors.textDim, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Section({ title, subtitle, children, accent, colors }: { title: string; subtitle?: string; children: React.ReactNode; accent?: boolean; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ marginBottom: 16 }}>
        {accent && <div style={{ width: 32, height: 2, background: colors.gold, marginBottom: 10 }} />}
        <h2 className="za-section-title" style={{ margin: 0 }}>{title}</h2>
        {subtitle && <p className="za-section-subtitle" style={{ marginTop: 3 }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function PCard({ children, style: s, colors }: { children: React.ReactNode; style?: React.CSSProperties; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <div style={{ padding: 16, background: colors.surface, borderRadius: 6, border: `1px solid ${colors.border}`, ...s }}>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   LEFT SIDEBAR — project list with search
   ═══════════════════════════════════════════════════ */
function ProjectSidebar({ projects, sel, onSelect, colors, isDark }: {
  projects: R[]; sel: R | null; onSelect: (p: R) => void;
  colors: ReturnType<typeof useTheme>['colors']; isDark: boolean;
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return projects;
    const q = search.toLowerCase();
    return projects.filter(p =>
      p.project_name?.toLowerCase().includes(q) ||
      p.developer?.toLowerCase().includes(q) ||
      p.master_community?.toLowerCase().includes(q) ||
      p.project_category?.toLowerCase().includes(q)
    );
  }, [projects, search]);

  return (
    <div style={{
      width: 280, minWidth: 280, height: '100%', display: 'flex', flexDirection: 'column',
      borderRight: `1px solid ${colors.border}`, background: isDark ? '#0c0d14' : colors.surface,
    }}>
      {/* Search */}
      <div style={{ padding: '12px 12px 8px', borderBottom: `1px solid ${colors.border}` }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
          background: colors.cardBg, border: `1px solid ${colors.cardBorder}`, borderRadius: 4,
        }}>
          <Search size={13} style={{ color: colors.textDim, flexShrink: 0 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects..."
            style={{
              background: 'none', border: 'none', outline: 'none', width: '100%',
              color: colors.text, fontSize: 12, fontFamily: "'DM Sans', sans-serif",
            }}
          />
        </div>
        <div style={{ fontSize: 9, color: colors.textDim, marginTop: 6, fontFamily: FONT_DATA }}>
          {filtered.length} OF {projects.length} PROJECTS
        </div>
      </div>

      {/* Project list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.map(p => {
          const active = sel?.id === p.id;
          const cc = catColor[p.project_category] || colors.textDim;
          return (
            <div
              key={p.id}
              onClick={() => onSelect(p)}
              className="za-list-row"
              style={{
                padding: '10px 12px',
                background: active ? colors.goldBg : 'transparent',
                borderLeftColor: active ? colors.gold : 'transparent',
                cursor: 'pointer',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12, fontWeight: active ? 600 : 400,
                  color: active ? colors.gold : colors.text,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {p.project_name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                  <span style={{
                    fontSize: 8, fontWeight: 700, letterSpacing: '0.5px', padding: '1px 5px',
                    borderRadius: 2, background: cc + '20', color: cc,
                  }}>{catLabel[p.project_category] || ''}</span>
                  <span style={{ fontSize: 9, color: colors.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.master_community}
                  </span>
                </div>
                {p.avg_price_per_sqft && (
                  <div style={{ fontSize: 9, color: colors.textSecondary, marginTop: 2, fontFamily: FONT_DATA }}>
                    AED {fmt(p.avg_price_per_sqft)}/sqft
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: colors.textDim }}>
            No projects match "{search}"
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════ */
export function ProjectsPage() {
  const { colors, mode, toggle } = useTheme();
  const isDark = mode === 'dark';

  const [projects, setProjects] = useState<R[]>([]);
  const [sel, setSel] = useState<R | null>(null);
  const [tab, setTab] = useState('overview');
  const [units, setUnits] = useState<R[]>([]);
  const [amenities, setAmenities] = useState<R[]>([]);
  const [infra, setInfra] = useState<R[]>([]);
  const [dldRecent, setDldRecent] = useState<R[]>([]);
  const [dldSummary, setDldSummary] = useState<R[]>([]);
  const [ejari, setEjari] = useState<R[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error: err } = await sb.from('xray_projects')
          .select('*')
          .not('avg_price_per_sqft', 'is', null)
          .not('orientation_primary', 'is', null)
          .order('avg_price_per_sqft', { ascending: false })
          .limit(50);
        if (err) {
          console.error('[Projects] xray_projects error:', err.message);
          setError(err.message);
        }
        setProjects(data || []);
        if (data?.length) setSel(data[0]);
      } catch (e) {
        console.error('[Projects] Failed to load projects:', e);
        setError(String(e));
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!sel) return;
    setDetailLoading(true);
    setTab('overview');
    (async () => {
      try {
        const [u, a, i] = await Promise.all([
          sb.from('xray_unit_types').select('*').eq('project_id', sel.id).order('starting_price_aed', { ascending: true }),
          sb.from('xray_project_amenities').select('*').eq('project_id', sel.id).order('amenity_category', { ascending: true }),
          sb.from('xray_infrastructure').select('*').eq('project_id', sel.id).order('distance_km', { ascending: true }),
        ]);
        if (u.error) console.error('[Projects] xray_unit_types:', u.error.message);
        if (a.error) console.error('[Projects] xray_project_amenities:', a.error.message);
        if (i.error) console.error('[Projects] xray_infrastructure:', i.error.message);
        setUnits(u.data || []);
        setAmenities(a.data || []);
        setInfra(i.data || []);
        if (sel.rera_registration_no) {
          const [dr, ds, ej] = await Promise.all([
            sb.from('xray_dld_recent').select('*').eq('project_number', sel.rera_registration_no).order('instance_date', { ascending: false }).limit(15),
            sb.from('xray_dld_summary').select('*').eq('project_number', sel.rera_registration_no),
            sb.from('xray_ejari_summary').select('*').eq('project_number', sel.rera_registration_no),
          ]);
          if (dr.error) console.error('[Projects] xray_dld_recent:', dr.error.message);
          if (ds.error) console.error('[Projects] xray_dld_summary:', ds.error.message);
          if (ej.error) console.error('[Projects] xray_ejari_summary:', ej.error.message);
          setDldRecent(dr.data || []);
          setDldSummary(ds.data || []);
          setEjari(ej.data || []);
        } else {
          setDldRecent([]); setDldSummary([]); setEjari([]);
        }
      } catch (e) {
        console.error('[Projects] Detail load error:', e);
      }
      setDetailLoading(false);
    })();
  }, [sel?.id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-20" style={{ minHeight: '60vh' }}>
        <Loader2 className="animate-spin" size={24} style={{ color: colors.gold }} />
      </div>
    );
  }

  if (error && projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20" style={{ minHeight: '60vh' }}>
        <div className="za-signal-box za-signal-box--gold" style={{ maxWidth: 400, textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Unable to load projects</div>
          <div style={{ fontSize: 11, color: colors.textSecondary }}>{error}</div>
          <div style={{ fontSize: 10, color: colors.textDim, marginTop: 8 }}>Check browser console for details. The xray_projects table may require RLS permissions.</div>
        </div>
      </div>
    );
  }

  const cat = sel?.project_category;
  const isApt = cat === 'apartment';
  const isVilla = cat === 'villa';
  const isOffplan = cat === 'off_plan';

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'units', label: 'Units & Pricing' },
    ...(isApt || isOffplan ? [{ key: 'orientation', label: 'Orientation' }] : []),
    ...(isVilla ? [{ key: 'community', label: 'Community Intel' }] : []),
    ...(isOffplan ? [{ key: 'offplan', label: 'Construction Status' }] : []),
    { key: 'evidence', label: 'DLD Evidence' },
    { key: 'rentals', label: 'Ejari Rentals' },
    { key: 'amenities', label: 'Amenities' },
    { key: 'honest', label: "What They Don't Tell You" },
  ];

  return (
    <div style={{ display: 'flex', height: '100%', color: colors.text }}>
      {/* LEFT SIDEBAR */}
      <ProjectSidebar projects={projects} sel={sel} onSelect={setSel} colors={colors} isDark={isDark} />

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, overflowY: 'auto', height: '100%' }}>
        {sel ? (
          <>
            {/* HERO */}
            <div style={{ padding: '32px 28px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 0%, ${colors.gold}06 0%, transparent 60%)` }} />
              <div style={{ position: 'relative' }}>
                {/* Theme toggle */}
                <div style={{ position: 'absolute', top: 0, right: 0 }}>
                  <button onClick={toggle} style={{
                    background: colors.cardBg, border: `1px solid ${colors.cardBorder}`,
                    borderRadius: 6, padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                  }}>
                    {isDark ? <Sun size={14} style={{ color: colors.gold }} /> : <Moon size={14} style={{ color: colors.gold }} />}
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
                  <Badge color={catColor[cat] || colors.textDim} label={catLabel[cat] || cat} />
                  {sel.sc_source === 'mollak_confirmed' && <Badge color={colors.green} label="MOLLAK VERIFIED SC" />}
                  {sel.sc_source === 'rera_estimate' && <Badge color={isDark ? '#FBBF24' : '#D4850A'} label="RERA ESTIMATE SC" />}
                </div>
                <div className="za-section-tag" style={{ letterSpacing: 4, marginBottom: 12 }}>
                  {sel.master_community?.toUpperCase()}
                </div>
                <h1 className="font-display" style={{ fontSize: 36, fontWeight: 300, margin: 0, letterSpacing: 1, lineHeight: 1.1, color: colors.text }}>
                  {sel.project_name}
                </h1>
                <p style={{ fontSize: 13, color: colors.textSecondary, marginTop: 10, fontStyle: 'italic' }}>
                  {sel.brochure_tagline || 'Independent property intelligence'}
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 24, flexWrap: 'wrap' }}>
                  <Stat label="DEVELOPER" value={sel.developer} colors={colors} />
                  {sel.total_floors && <Stat label="FLOORS" value={sel.total_floors} colors={colors} />}
                  {sel.total_units && <Stat label="UNITS" value={`~${fmt(sel.total_units)}`} colors={colors} />}
                  <Stat label="STATUS" value={sel.project_status?.replace(/_/g, ' ')} colors={colors} />
                </div>
                <div className="za-signal-box za-signal-box--gold" style={{ display: 'inline-block', marginTop: 20 }}>
                  Every number sourced from DLD transactions, Ejari contracts, Mollak service charges, or verified public data.
                </div>
              </div>
            </div>

            {/* TABS */}
            <div style={{ borderBottom: `1px solid ${colors.border}`, padding: '0 20px', display: 'flex', gap: 0, overflowX: 'auto' }}>
              {tabs.map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`za-subtab${tab === t.key ? ' active' : ''}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* CONTENT */}
            <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px' }}>
              {detailLoading ? (
                <div className="flex justify-center p-12">
                  <Loader2 className="animate-spin" size={24} style={{ color: colors.gold }} />
                </div>
              ) : (
                <>
                  {/* OVERVIEW */}
                  {tab === 'overview' && (
                    <div>
                      <Section title="At a Glance" accent colors={colors}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
                          {[
                            { l: 'AVG PRICE/SQFT', v: `AED ${fmt(sel.avg_price_per_sqft)}`, s: 'DLD verified' },
                            { l: 'PRICE RANGE', v: `${fmtM(sel.price_range_aed_min)} – ${fmtM(sel.price_range_aed_max)}`, s: 'AED' },
                            { l: 'SIZE RANGE', v: `${fmt(sel.size_range_sqft_min)} – ${fmt(sel.size_range_sqft_max)}`, s: 'sqft' },
                            { l: 'SERVICE CHARGE', v: sel.service_charge_per_sqft ? `AED ${Number(sel.service_charge_per_sqft).toFixed(1)}/sqft` : sel.offplan_estimated_sc ? `~AED ${Number(sel.offplan_estimated_sc).toFixed(1)}/sqft` : 'TBD', s: sel.sc_source === 'mollak_confirmed' ? `Mollak ${sel.service_charge_year}` : sel.sc_source === 'rera_estimate' ? 'RERA estimate' : 'Not yet available' },
                            { l: 'DELIVERY SCORE', v: `${sel.amenity_delivery_score}/100`, s: sel.amenity_delivery_score >= 90 ? 'Exceptional' : sel.amenity_delivery_score >= 70 ? 'Good' : sel.amenity_delivery_score >= 50 ? 'Developing' : 'Pre-delivery' },
                            { l: 'PAYMENT', v: sel.payment_plan_summary || '—' },
                            ...(dldSummary.length ? [{ l: 'DLD TRANSACTIONS', v: String(dldSummary.reduce((a: number, d: R) => a + d.txn_count, 0)), s: 'Since Jan 2025' }] : []),
                            ...(ejari.length ? [{ l: 'EJARI CONTRACTS', v: String(ejari.reduce((a: number, e: R) => a + e.contract_count, 0)), s: 'Since 2024' }] : []),
                          ].map((s, i) => (
                            <PCard key={i} colors={colors}>
                              <div className="za-data-value-lg">{s.v}</div>
                              <div className="za-data-label" style={{ marginTop: 4 }}>{s.l}</div>
                              {s.s && <div style={{ fontSize: 10, color: colors.textDim, marginTop: 2 }}>{s.s}</div>}
                            </PCard>
                          ))}
                        </div>
                      </Section>

                      {sel.brochure_usps?.length > 0 && (
                        <Section title="Key Features" subtitle="Developer positioning and verified highlights" colors={colors}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {sel.brochure_usps.map((u: string, i: number) => (
                              <PCard key={i} colors={colors} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <div style={{ width: 4, height: 20, borderRadius: 2, background: colors.gold, flexShrink: 0 }} />
                                <span style={{ fontSize: 12, color: colors.text }}>{u}</span>
                              </PCard>
                            ))}
                          </div>
                        </Section>
                      )}

                      {isOffplan && sel.offplan_construction_pct != null && (
                        <Section title="Off-Plan Status" colors={colors}>
                          <PCard colors={colors}>
                            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                              <div><div className="za-data-label">CONSTRUCTION</div><div style={{ fontSize: 28, fontWeight: 300, color: isDark ? '#FBBF24' : '#D4850A' }}>{sel.offplan_construction_pct}%</div></div>
                              <div><div className="za-data-label">HANDOVER</div><div style={{ fontSize: 16, color: colors.text }}>{sel.offplan_expected_handover?.slice(0, 7) || 'TBD'}</div></div>
                              <div><div className="za-data-label">DEV AVG DELAY</div><div style={{ fontSize: 16, color: sel.offplan_developer_delay_history_months > 6 ? colors.orange : colors.green }}>{sel.offplan_developer_delay_history_months || 0} months</div></div>
                              <div><div className="za-data-label">ESCROW</div><div style={{ fontSize: 16, color: colors.green }}>{sel.offplan_escrow_status?.toUpperCase() || '—'}</div></div>
                              {sel.offplan_resale_premium_pct && <div><div className="za-data-label">RESALE PREMIUM</div><div style={{ fontSize: 16, color: colors.green }}>+{sel.offplan_resale_premium_pct}%</div></div>}
                            </div>
                            <div style={{ marginTop: 12, height: 8, background: isDark ? '#1a1b22' : colors.cardBg, borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ width: `${sel.offplan_construction_pct}%`, height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${isDark ? '#FBBF24' : '#D4850A'}, ${colors.green})` }} />
                            </div>
                          </PCard>
                        </Section>
                      )}

                      {isVilla && sel.villa_highway_distance_m && (
                        <Section title="Community Context" colors={colors}>
                          <PCard colors={colors}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                              <div><div className="za-data-label">HIGHWAY</div><div style={{ fontSize: 14, color: colors.text }}>{sel.villa_highway_name}</div><div style={{ fontSize: 12, color: sel.villa_highway_noise_risk === 'low' ? colors.green : colors.orange }}>{sel.villa_highway_distance_m}m — {sel.villa_highway_noise_risk} noise</div></div>
                              <div><div className="za-data-label">NEAREST SCHOOL</div><div style={{ fontSize: 14, color: colors.text }}>{sel.villa_nearest_school}</div><div style={{ fontSize: 12, color: colors.textSecondary }}>{sel.villa_school_proximity_km}km</div></div>
                              <div><div className="za-data-label">COMMUNITY</div><div style={{ fontSize: 14, color: colors.text }}>{sel.villa_community_maturity?.replace(/_/g, ' ')}</div><div style={{ fontSize: 12, color: colors.textSecondary }}>{sel.villa_gated ? 'Gated' : 'Open'} · {sel.villa_private_pool ? 'Private Pool' : 'Shared Pool'}</div></div>
                            </div>
                          </PCard>
                        </Section>
                      )}
                    </div>
                  )}

                  {/* UNITS & PRICING */}
                  {tab === 'units' && (
                    <div>
                      <Section title="Unit Types & Pricing" subtitle="From xray_unit_types — brochure layout data" accent colors={colors}>
                        {units.length === 0 ? (
                          <PCard colors={colors}><div style={{ color: colors.textDim, textAlign: 'center', padding: 20 }}>Unit type data pending for this project</div></PCard>
                        ) : units.map((u, i) => (
                          <PCard key={i} colors={colors} style={{ marginBottom: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ width: 4, height: 24, borderRadius: 2, background: u.bedroom_count <= 1 ? '#60A5FA' : u.bedroom_count === 2 ? '#A78BFA' : u.bedroom_count === 3 ? (isDark ? '#FBBF24' : '#D4850A') : colors.green }} />
                                  <span style={{ fontSize: 17, fontWeight: 400 }}>{u.unit_type}</span>
                                  <span style={{ fontSize: 11, color: colors.textDim }}>{u.unit_subtype}</span>
                                </div>
                                <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4, marginLeft: 12 }}>
                                  {u.bedroom_count} Bed · {u.bathroom_count} Bath · {fmt(u.total_area_sqft)} sqft
                                  {u.has_maid_room && ' · Maid'}{u.has_study && ' · Study'}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div className="za-data-value-lg">AED {fmtM(u.starting_price_aed)}</div>
                                <div style={{ fontSize: 11, color: colors.gold }}>AED {fmt(u.price_per_sqft)}/sqft</div>
                              </div>
                            </div>
                            {u.layout_description && (
                              <div style={{ padding: 10, background: colors.bg, borderRadius: 4, marginBottom: 6 }}>
                                <div className="za-data-label">LAYOUT</div>
                                <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2, lineHeight: 1.5 }}>{u.layout_description}</div>
                              </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                              <div style={{ color: colors.textSecondary }}>Orientation: {u.orientation || 'Various'}</div>
                              {u.view_type?.length > 0 && <div style={{ color: colors.gold }}>{u.view_type.join(' · ')}</div>}
                              {u.total_units_this_type && <div style={{ color: colors.textDim }}>{u.total_units_this_type} units</div>}
                            </div>
                          </PCard>
                        ))}
                      </Section>

                      {dldSummary.length > 0 && (
                        <Section title="DLD Price Summary (2025+)" subtitle="Aggregated from verified DLD transactions" colors={colors}>
                          {dldSummary.map((d, i) => (
                            <PCard key={i} colors={colors} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <span style={{ fontSize: 14, color: colors.text }}>{d.rooms_en}</span>
                                <span style={{ fontSize: 11, color: colors.textDim, marginLeft: 8 }}>{d.txn_count} transactions</span>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 13, color: colors.text }}>AED {fmt(d.min_price)} — {fmt(d.max_price)}</div>
                                <div style={{ fontSize: 10, color: colors.gold }}>Avg: AED {fmt(d.avg_price)} · {fmt(d.avg_psf)}/sqft</div>
                              </div>
                            </PCard>
                          ))}
                        </Section>
                      )}
                    </div>
                  )}

                  {/* ORIENTATION */}
                  {tab === 'orientation' && (
                    <div>
                      <Section title="Orientation Intelligence" subtitle="What faces where — and what it means for your investment" accent colors={colors}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <PCard colors={colors}>
                            <div className="za-data-label" style={{ color: colors.green }}>BEST DIRECTION</div>
                            <div style={{ fontSize: 16, fontWeight: 400, marginTop: 6, color: colors.text }}>{sel.apt_best_direction || sel.orientation_primary}</div>
                            {sel.apt_best_floor_range && <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>Best floors: {sel.apt_best_floor_range}</div>}
                          </PCard>
                          <PCard colors={colors}>
                            <div className="za-data-label" style={{ color: colors.red }}>CAUTION DIRECTION</div>
                            <div style={{ fontSize: 16, fontWeight: 400, marginTop: 6, color: colors.text }}>{sel.apt_worst_direction || '—'}</div>
                            {sel.apt_noise_floor_threshold && <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>Noise attenuates above floor {sel.apt_noise_floor_threshold}</div>}
                          </PCard>
                        </div>
                        {(sel.apt_floor_premium_pct || sel.apt_view_premium_pct) && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                            {sel.apt_floor_premium_pct && <PCard colors={colors}>
                              <div className="za-data-label">FLOOR PREMIUM</div>
                              <div style={{ fontSize: 24, fontWeight: 300, color: colors.gold, marginTop: 4 }}>+{sel.apt_floor_premium_pct}%<span style={{ fontSize: 12, color: colors.textDim }}>/floor</span></div>
                            </PCard>}
                            {sel.apt_view_premium_pct && <PCard colors={colors}>
                              <div className="za-data-label">VIEW PREMIUM</div>
                              <div style={{ fontSize: 24, fontWeight: 300, color: colors.gold, marginTop: 4 }}>+{sel.apt_view_premium_pct}%</div>
                            </PCard>}
                          </div>
                        )}
                        {sel.orientation_views?.length > 0 && (
                          <PCard colors={colors} style={{ marginTop: 12 }}>
                            <div className="za-data-label" style={{ marginBottom: 8 }}>AVAILABLE VIEWS</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {sel.orientation_views.map((v: string, i: number) => (
                                <span key={i} className="za-badge" style={{ padding: '4px 10px', background: colors.goldBg, border: `1px solid ${colors.gold}44`, color: colors.textSecondary }}>
                                  {v.replace(/_/g, ' ')}
                                </span>
                              ))}
                            </div>
                          </PCard>
                        )}
                      </Section>
                    </div>
                  )}

                  {/* COMMUNITY INTEL (Villas) */}
                  {tab === 'community' && isVilla && (
                    <div>
                      <Section title="Villa Community Intelligence" accent colors={colors}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <PCard colors={colors}>
                            <div className="za-data-label">HIGHWAY PROXIMITY</div>
                            <div style={{ fontSize: 20, fontWeight: 300, color: sel.villa_highway_noise_risk === 'low' ? colors.green : colors.orange, marginTop: 6 }}>{sel.villa_highway_distance_m}m</div>
                            <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{sel.villa_highway_name}</div>
                          </PCard>
                          <PCard colors={colors}>
                            <div className="za-data-label">NEAREST SCHOOL</div>
                            <div style={{ fontSize: 14, color: colors.text, marginTop: 6 }}>{sel.villa_nearest_school}</div>
                            <div style={{ fontSize: 12, color: colors.gold, marginTop: 2 }}>{sel.villa_school_proximity_km}km away</div>
                          </PCard>
                          <PCard colors={colors}>
                            <div className="za-data-label">COMMUNITY</div>
                            <div style={{ fontSize: 16, color: colors.text, marginTop: 6, textTransform: 'capitalize' }}>{sel.villa_community_maturity?.replace(/_/g, ' ')}</div>
                            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                              {sel.villa_gated && <Badge color={colors.green} label="GATED" />}
                              {sel.villa_private_pool && <Badge color={colors.blue} label="PRIVATE POOL" />}
                            </div>
                          </PCard>
                          <PCard colors={colors}>
                            <div className="za-data-label">PLOT & GARDEN</div>
                            {sel.villa_plot_size_sqft && <div style={{ fontSize: 14, color: colors.text, marginTop: 6 }}>Plot: {fmt(sel.villa_plot_size_sqft)} sqft</div>}
                            {sel.villa_garden_size_sqft && <div style={{ fontSize: 12, color: colors.green }}>Garden: {fmt(sel.villa_garden_size_sqft)} sqft</div>}
                          </PCard>
                        </div>
                      </Section>
                    </div>
                  )}

                  {/* OFF-PLAN STATUS */}
                  {tab === 'offplan' && isOffplan && (
                    <div>
                      <Section title="Construction & Delivery Status" accent colors={colors}>
                        <PCard colors={colors}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                            <div>
                              <div className="za-data-label">CONSTRUCTION PROGRESS</div>
                              <div style={{ fontSize: 36, fontWeight: 300, color: isDark ? '#FBBF24' : '#D4850A', marginTop: 4 }}>{sel.offplan_construction_pct || 0}%</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div className="za-data-label">EXPECTED HANDOVER</div>
                              <div className="za-data-value-lg" style={{ marginTop: 4 }}>{sel.offplan_expected_handover?.slice(0, 7) || 'TBD'}</div>
                            </div>
                          </div>
                          <div style={{ height: 12, background: isDark ? '#1a1b22' : colors.cardBg, borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
                            <div style={{ width: `${sel.offplan_construction_pct || 0}%`, height: '100%', borderRadius: 6, background: `linear-gradient(90deg, ${colors.red}, ${isDark ? '#FBBF24' : '#D4850A'}, ${colors.green})` }} />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                            <div style={{ padding: 12, background: colors.bg, borderRadius: 4, textAlign: 'center' }}>
                              <div className="za-data-label">DEV DELAY HISTORY</div>
                              <div style={{ fontSize: 20, color: sel.offplan_developer_delay_history_months > 6 ? colors.orange : colors.green, marginTop: 4 }}>{sel.offplan_developer_delay_history_months || 0} mo</div>
                            </div>
                            <div style={{ padding: 12, background: colors.bg, borderRadius: 4, textAlign: 'center' }}>
                              <div className="za-data-label">ESCROW STATUS</div>
                              <div style={{ fontSize: 14, color: sel.offplan_escrow_status === 'active' ? colors.green : colors.orange, marginTop: 4 }}>{sel.offplan_escrow_status?.toUpperCase() || '—'}</div>
                            </div>
                            <div style={{ padding: 12, background: colors.bg, borderRadius: 4, textAlign: 'center' }}>
                              <div className="za-data-label">RESALE PREMIUM</div>
                              <div style={{ fontSize: 20, color: colors.green, marginTop: 4 }}>+{sel.offplan_resale_premium_pct || 0}%</div>
                            </div>
                          </div>
                        </PCard>
                      </Section>
                    </div>
                  )}

                  {/* DLD EVIDENCE */}
                  {tab === 'evidence' && (
                    <div>
                      <Section title="DLD Transaction Evidence" subtitle="Real sales registered with Dubai Land Department." accent colors={colors}>
                        {dldRecent.length === 0 ? (
                          <PCard colors={colors}><div style={{ color: colors.textDim, textAlign: 'center', padding: 20 }}>No recent DLD transactions linked (project_number: {sel.rera_registration_no || 'not mapped'})</div></PCard>
                        ) : dldRecent.map((tx, i) => (
                          <PCard key={i} colors={colors} style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 13, fontWeight: 500 }}>{tx.rooms_en}</span>
                                <Badge color={colors.green} label="DLD VERIFIED" />
                              </div>
                              <div style={{ fontSize: 10, color: colors.textDim, marginTop: 3 }}>{tx.instance_date} · {fmt(tx.sqft)} sqm · {tx.reg_type_en}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div className="za-data-value-lg" style={{ fontSize: 16 }}>AED {fmt(tx.price_aed)}</div>
                              <div style={{ fontSize: 11, color: colors.gold }}>AED {fmt(tx.price_per_sqft)}/sqft</div>
                            </div>
                          </PCard>
                        ))}
                      </Section>
                    </div>
                  )}

                  {/* EJARI RENTALS */}
                  {tab === 'rentals' && (
                    <div>
                      <Section title="Ejari Rental Market" subtitle="From Ejari registered contracts (2024+)" accent colors={colors}>
                        {ejari.length === 0 ? (
                          <PCard colors={colors}><div style={{ color: colors.textDim, textAlign: 'center', padding: 20 }}>No Ejari rental data linked (project_number: {sel.rera_registration_no || 'not mapped'})</div></PCard>
                        ) : ejari.map((r, i) => (
                          <PCard key={i} colors={colors} style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <div>
                                <span style={{ fontSize: 14, color: colors.text }}>{r.unit_type}</span>
                                <span style={{ fontSize: 11, color: colors.textDim, marginLeft: 8 }}>{r.contract_count} contracts</span>
                              </div>
                              <Badge color={colors.green} label="EJARI VERIFIED" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                              <div style={{ padding: 8, background: colors.bg, borderRadius: 4, textAlign: 'center' }}>
                                <div className="za-data-label">MIN RENT</div>
                                <div style={{ fontSize: 14, color: colors.red, marginTop: 2 }}>AED {fmt(r.min_rent)}/yr</div>
                              </div>
                              <div style={{ padding: 8, background: colors.bg, borderRadius: 4, textAlign: 'center' }}>
                                <div className="za-data-label">AVG RENT</div>
                                <div style={{ fontSize: 14, color: colors.gold, marginTop: 2 }}>AED {fmt(r.avg_rent)}/yr</div>
                              </div>
                              <div style={{ padding: 8, background: colors.bg, borderRadius: 4, textAlign: 'center' }}>
                                <div className="za-data-label">MAX RENT</div>
                                <div style={{ fontSize: 14, color: colors.green, marginTop: 2 }}>AED {fmt(r.max_rent)}/yr</div>
                              </div>
                            </div>
                          </PCard>
                        ))}
                      </Section>
                    </div>
                  )}

                  {/* AMENITIES */}
                  {tab === 'amenities' && (
                    <div>
                      <Section title="Amenity Delivery Assessment" subtitle="What was promised vs. what exists" accent colors={colors}>
                        <PCard colors={colors} style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div className="za-data-label">DELIVERY SCORE</div>
                            <div style={{ fontSize: 28, fontWeight: 300, color: sel.amenity_delivery_score >= 90 ? colors.green : sel.amenity_delivery_score >= 70 ? colors.blue : sel.amenity_delivery_score >= 50 ? colors.orange : colors.red }}>
                              {sel.amenity_delivery_score}/100
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 12, color: colors.green }}>{amenities.filter((a: R) => a.delivery_status === 'fully_delivered').length} fully delivered</div>
                            <div style={{ fontSize: 12, color: colors.orange }}>{amenities.filter((a: R) => a.delivery_status === 'pending_verification').length} pending</div>
                          </div>
                        </PCard>
                        {amenities.length === 0 ? (
                          <PCard colors={colors}><div style={{ color: colors.textDim, textAlign: 'center', padding: 20 }}>Amenity data pending</div></PCard>
                        ) : amenities.map((a, i) => (
                          <PCard key={i} colors={colors} style={{ marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span style={{ fontSize: 12, color: colors.text }}>{a.amenity_name}</span>
                              <span style={{ fontSize: 10, color: colors.textDim, marginLeft: 8 }}>{a.amenity_category}</span>
                            </div>
                            <Badge
                              color={a.delivery_status === 'fully_delivered' || a.delivery_status === 'exceeded' ? colors.green : a.delivery_status === 'pending_verification' || a.delivery_status === 'partially_delivered' ? colors.orange : colors.red}
                              label={a.delivery_status?.replace(/_/g, ' ').toUpperCase()}
                            />
                          </PCard>
                        ))}
                      </Section>

                      {infra.length > 0 && (
                        <Section title="Nearby Infrastructure" colors={colors}>
                          {infra.map((inf, i) => (
                            <PCard key={i} colors={colors} style={{ marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <span style={{ fontSize: 12, color: colors.text }}>{inf.name}</span>
                                <span style={{ fontSize: 10, color: colors.textDim, marginLeft: 8 }}>{inf.infrastructure_type} · {inf.distance_km}km</span>
                              </div>
                              <Badge color={inf.status === 'operational' ? colors.green : inf.status === 'under_construction' ? colors.orange : colors.blue} label={inf.status?.replace(/_/g, ' ').toUpperCase()} />
                            </PCard>
                          ))}
                        </Section>
                      )}
                    </div>
                  )}

                  {/* HONEST ASSESSMENT */}
                  {tab === 'honest' && (
                    <div>
                      <Section title="What They Don't Tell You" subtitle="The honest things no marketing brochure includes" accent colors={colors}>
                        <PCard colors={colors} style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Service Charge Reality</div>
                          {sel.sc_source === 'mollak_confirmed' ? (
                            <div style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.7 }}>
                              Mollak confirmed SC: AED {Number(sel.service_charge_per_sqft).toFixed(1)}/sqft ({sel.service_charge_year}).
                              Service charges typically increase 3-5% annually. On a {sel.size_range_sqft_min || 1000} sqft unit, that's
                              AED {fmt(Math.round((sel.service_charge_per_sqft || 0) * (sel.size_range_sqft_min || 1000)))}/year today.
                            </div>
                          ) : sel.sc_source === 'rera_estimate' ? (
                            <div style={{ fontSize: 12, color: colors.orange, lineHeight: 1.7 }}>
                              No Mollak SC yet — off-plan project. RERA placeholder: ~AED {Number(sel.offplan_estimated_sc).toFixed(1)}/sqft. Expect ±30% variance.
                            </div>
                          ) : (
                            <div style={{ fontSize: 12, color: colors.textDim, lineHeight: 1.7 }}>Service charge data not yet available.</div>
                          )}
                        </PCard>

                        {(isApt || isOffplan) && sel.apt_worst_direction && (
                          <PCard colors={colors} style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Direction & Noise</div>
                            <div style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.7 }}>
                              Caution: {sel.apt_worst_direction}. Best: {sel.apt_best_direction}.
                              {sel.apt_view_premium_pct ? ` View premium ~${sel.apt_view_premium_pct}%.` : ''}
                            </div>
                          </PCard>
                        )}

                        {isOffplan && (
                          <PCard colors={colors} style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Delivery Risk</div>
                            <div style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.7 }}>
                              {sel.developer}'s avg delay: {sel.offplan_developer_delay_history_months || 'unknown'} months. Handover: {sel.offplan_expected_handover?.slice(0, 7) || 'TBD'}.
                            </div>
                          </PCard>
                        )}

                        {ejari.length > 0 && (
                          <PCard colors={colors} style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Rental Spread</div>
                            <div style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.7 }}>
                              {ejari.map((e: R) => {
                                const spread = e.max_rent && e.min_rent ? Math.round(((e.max_rent - e.min_rent) / e.min_rent) * 100) : 0;
                                return `${e.unit_type}: AED ${fmt(e.min_rent)}–${fmt(e.max_rent)}/yr (${spread}% spread, ${e.contract_count} contracts). `;
                              }).join('')}
                            </div>
                          </PCard>
                        )}
                      </Section>

                      <div className="za-signal-box za-signal-box--gold" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: colors.gold, fontFamily: FONT_DATA, marginBottom: 6 }}>DATA SOURCES</div>
                        <div style={{ fontSize: 11, color: colors.textSecondary, lineHeight: 1.6 }}>
                          DLD ({fmt(dldRecent.length)} recent) · Ejari ({ejari.reduce((a: number, e: R) => a + e.contract_count, 0)} contracts) · Mollak ({sel.sc_source})
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* FOOTER */}
            <div className="za-footer">
              <span className="za-data-label" style={{ letterSpacing: 1 }}>ZEROAGENT PROPERTY INTELLIGENCE · LIVE FROM SUPABASE</span>
              <span style={{ fontSize: 10, color: colors.textDim }}>Independent analysis. No commercial relationship with any developer.</span>
            </div>
          </>
        ) : (
          <div className="flex justify-center items-center p-20" style={{ color: colors.textDim }}>
            Select a project from the sidebar
          </div>
        )}
      </div>
    </div>
  );
}
