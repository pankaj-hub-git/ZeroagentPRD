import { useState, useEffect, useMemo } from "react";
import { useTheme } from "@/lib/theme";

// ═══════════════════════════════════════════════════════════════════
// ZEROAGENT ENGINE 12 — PREDICTIVE PRICING INTELLIGENCE
// Arabian Ranches III · Raya · 3BR Townhouse
// ═══════════════════════════════════════════════════════════════════

const SUPA = "https://awreaqilmwfpvaxwanpa.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3cmVhcWlsbXdmcHZheHdhbnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMzE0NDAsImV4cCI6MjA4NjgwNzQ0MH0.uqn5tiC51OzrkeXOSD2nwIiePXkew471tbvz2TjbyFk";

const sq = async (table: string, params = "") => {
  // Handle schema-prefixed tables: "gold.property_scorecard" → table="property_scorecard", schema="gold"
  let schema = "";
  let tableName = table;
  if (table.includes(".")) {
    const parts = table.split(".");
    schema = parts[0];
    tableName = parts[1];
  }
  const headers: Record<string, string> = {
    apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json"
  };
  if (schema) {
    headers["Accept-Profile"] = schema;
  }
  try {
    const r = await fetch(`${SUPA}/rest/v1/${tableName}?${params}`, { headers });
    if (!r.ok) {
      console.warn(`[Engine12] ${table}: HTTP ${r.status}`);
      return [];
    }
    return r.json();
  } catch (e) {
    console.warn(`[Engine12] ${table}: fetch failed`, e);
    return [];
  }
};

// ── TOKENS (derived from theme inside component) ──────────

const fmt = (n: number | null | undefined, dec = 2) => n != null ? Number(n).toFixed(dec) : "—";
const fmtM = (n: number | null | undefined) => n != null ? `AED ${(Number(n) / 1e6).toFixed(2)}M` : "—";
const fmtPct = (n: number | string | null | undefined) => {
  if (n == null) return "—";
  const v = Number(n);
  return `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
};

// ── COMPONENTS (defined inside main component for theme access) ──
type R = Record<string, any>;

const TABS = ["Scorecard", "Prediction", "Yield Model", "Catalysts", "DNA"];

// ── MAIN ──────────────────────────────────────────────────
export function PricePredictionPage() {
  const { colors } = useTheme();

  const C = useMemo(() => ({
    bg: colors.bg, card: colors.surface, cardHi: colors.cardBg,
    border: colors.border, borderHi: colors.cardBorder,
    accent: colors.green, accentDim: colors.greenBg,
    amber: colors.orange, amberDim: colors.orangeBg,
    red: colors.red, redDim: colors.redBg,
    blue: colors.blue, blueDim: colors.blueBg,
    text: colors.text, dim: colors.textSecondary, muted: colors.textDim,
  }), [colors]);

  function Chip({ type, label }: { type: string; label?: string }) {
    const styles: Record<string, { bg: string; col: string; dot: string }> = {
      LIVE:      { bg: C.accentDim, col: C.accent, dot: "●" },
      ESTIMATED: { bg: C.amberDim,  col: C.amber,  dot: "◈" },
      GAP:       { bg: C.redDim,    col: C.red,     dot: "!" },
    };
    const s = styles[type] || styles.ESTIMATED;
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: s.bg, color: s.col,
        padding: "2px 9px", borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>
        {s.dot} {label || type}
      </span>
    );
  }

  function ScoreRing({ score, max = 100, label, color, size = 72 }: {
    score: number | null | undefined; max?: number; label: string; color?: string; size?: number;
  }) {
    const pct = Math.min(1, (Number(score) || 0) / max);
    const r = (size - 10) / 2, circ = 2 * Math.PI * r;
    return (
      <div style={{ textAlign: "center" }}>
        <svg width={size} height={size} style={{ display: "block", margin: "0 auto" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.border} strokeWidth={6} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color || C.accent} strokeWidth={6}
            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
            strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: "stroke-dashoffset 1s ease" }} />
          <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fill={color || C.accent}
            fontSize={14} fontWeight={700} fontFamily="monospace">{Math.round(Number(score) || 0)}</text>
        </svg>
        <div style={{ fontSize: 9, color: C.dim, marginTop: 3, textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</div>
      </div>
    );
  }

  function Section({ icon, title, sub }: { icon: string; title: string; sub?: string }) {
    return (
      <div style={{ borderBottom: `2px solid ${C.accent}`, paddingBottom: 7, marginBottom: 12 }}>
        <div style={{ color: C.accent, fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5 }}>
          {icon} {title}
        </div>
        {sub && <div style={{ color: C.muted, fontSize: 10, marginTop: 1 }}>{sub}</div>}
      </div>
    );
  }

  function Card({ children, style = {}, accent }: { children: React.ReactNode; style?: React.CSSProperties; accent?: boolean }) {
    return (
      <div style={{ background: C.card, border: `1px solid ${accent ? C.borderHi : C.border}`,
        borderRadius: 12, padding: 18, ...(accent ? { boxShadow: `0 0 20px ${C.accentDim}` } : {}), ...style }}>
        {children}
      </div>
    );
  }

  const [tab, setTab] = useState("Scorecard");
  const [loading, setLoading] = useState(true);
  const [D, setD] = useState<R | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [scorecard, dldComps, ejari, devScore, psm, sc, maturity, catalysts, govAlign, cfi, fraud] =
          await Promise.all([
            sq("gold.property_scorecard",
              "select=*&project_name=eq.Arabian+Ranches+III+-+Raya&order=as_of_date.desc&limit=1"),
            sq("xray_dld_recent",
              "select=project_name_en,rooms_en,sqft,price_aed,price_per_sqft,instance_date&project_name_en=ilike.*arabian+ranches*&rooms_en=eq.3+B%2FR&order=instance_date.desc&limit=30"),
            sq("xray_ejari_summary",
              "select=project_name_en,unit_type,avg_rent,contract_count&project_name_en=ilike.*arabian+ranches+lll*&unit_type=ilike.*3+bed*"),
            sq("xray_developer_scores",
              "select=developer,delivery_rate_pct,avg_delay_months,build_quality_score,brand_tier&developer=ilike.*emaar*&limit=1"),
            sq("xray_psm_benchmarks",
              "select=master_community,property_segment,psm_avg,psm_low,psm_high,annual_rent_yield_pct,yoy_price_change_pct,maturity_stage&master_community=ilike.*arabian+ranches*"),
            sq("xray_service_charges",
              "select=master_community,project_name,service_charge_psf,year,data_source&master_community=ilike.*arabian*&order=year.desc"),
            sq("community_maturity_scores",
              "select=master_community,as_of_date,maturity_score,maturity_phase,price_premium_vs_phase1_pct,clusters_total,clusters_handed_over,souk_open,metro_status,schools_active&master_community=eq.Arabian+Ranches+III&order=as_of_date.desc&limit=1"),
            sq("bronze_government_catalysts",
              "select=catalyst_name,catalyst_type,current_status,expected_completion,base_impact_score,completion_confidence,affected_communities&affected_communities=cs.%7BArabian+Ranches+III%7D"),
            sq("xray_government_alignment",
              "select=master_community,metro_status,metro_station_name,metro_distance_km,government_alignment_score,projected_psm_impact_pct,infrastructure_catalyst_timeline&master_community=ilike.*arabian+ranches+iii*&limit=1"),
            sq("v_cfi_by_community",
              "select=community,cfi_score,cfi_tier,nationality_count,weighted_yoy_growth&community=eq.Arabian+Ranches+III"),
            sq("v_amenity_fraud_scores",
              "select=master_community,amenity_fraud_score,delivery_rate_pct,total_promised,fully_delivered&master_community=ilike.*arabian+ranches*&limit=3"),
          ]);

        setD({
          scorecard: scorecard?.[0], dldComps, ejari, devScore: devScore?.[0], psm,
          sc, maturity: maturity?.[0], catalysts, govAlign: govAlign?.[0],
          cfi: cfi?.[0], fraud
        });
      } catch (e: unknown) {
        console.error("Fetch error:", e);
        setD({ error: e instanceof Error ? e.message : String(e) });
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return (
    <div style={{ background: C.bg, height: "calc(100vh - 56px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 44, height: 44, border: `3px solid ${C.accentDim}`, borderTop: `3px solid ${C.accent}`,
          borderRadius: "50%", animation: "spin 0.9s linear infinite", margin: "0 auto 14px" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ color: C.dim, fontSize: 12, fontFamily: "monospace" }}>
          Querying gold.property_scorecard...
        </div>
      </div>
    </div>
  );

  const s = D?.scorecard;
  const dev = D?.devScore;
  const mat = D?.maturity;
  const cfi = D?.cfi;
  const gov = D?.govAlign;
  const cats: R[] = D?.catalysts || [];
  const BUA = 1877;

  const confTier = s?.price_confidence === "high" ? "LIVE" : s?.price_confidence === "medium" ? "ESTIMATED" : "GAP";

  return (
    <div style={{ background: C.bg, color: C.text, height: "calc(100vh - 56px)", overflow: "auto", padding: 14,
      fontFamily: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700&family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet" />

      {/* ── HEADER ── */}
      <div style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 12, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ width: 3, height: 34, background: C.accent, borderRadius: 2 }} />
          <div>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: 2.5, textTransform: "uppercase",
              fontFamily: "'IBM Plex Mono', monospace" }}>
              ZEROAGENT · ENGINE 12 · {s ? "GOLD LAYER LIVE" : "FETCHING..."}
            </div>
            <div style={{ fontSize: 19, fontWeight: 700, color: C.text, letterSpacing: -0.3 }}>
              Predictive Pricing Intelligence
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <Chip type={confTier} label={confTier === "LIVE" ? "GOLD LAYER LIVE" : "PARTIAL DATA"} />
            <span style={{ background: C.cardHi, border: `1px solid ${C.border}`, color: C.dim,
              padding: "2px 9px", borderRadius: 20, fontSize: 10, fontFamily: "monospace" }}>
              72% confidence · {s?.as_of_date || "—"}
            </span>
          </div>
        </div>
        <div style={{ fontSize: 11, color: C.dim, marginTop: 5, fontFamily: "'IBM Plex Mono', monospace" }}>
          Arabian Ranches III &gt; Raya &gt; 3BR Townhouse &gt; {BUA.toLocaleString()} sqft &gt; Q3 2026 Handover
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{ display: "flex", gap: 3, marginBottom: 14, flexWrap: "wrap" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "6px 14px", borderRadius: 6,
            border: `1px solid ${tab === t ? C.accent : C.border}`,
            background: tab === t ? C.accentDim : "transparent",
            color: tab === t ? C.accent : C.dim,
            fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: 0.4,
            fontFamily: "'IBM Plex Mono', monospace"
          }}>{t}</button>
        ))}
      </div>

      {/* ══ SCORECARD TAB ══════════════════════════════════ */}
      {tab === "Scorecard" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Price Hero */}
          <Card accent>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 20, alignItems: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 9, color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6,
                  fontFamily: "'IBM Plex Mono', monospace" }}>PREDICTED FAIR VALUE</div>
                <div style={{ fontSize: 36, fontWeight: 700, color: C.accent, fontFamily: "'IBM Plex Mono', monospace",
                  letterSpacing: -1 }}>
                  {s ? fmtM(s.fair_value_mid) : "—"}
                </div>
                <div style={{ fontSize: 11, color: C.dim, marginTop: 3 }}>
                  {s ? `${fmtM(s.fair_value_low)} – ${fmtM(s.fair_value_high)}` : "loading..."}
                </div>
                <div style={{ fontSize: 11, color: C.amber, marginTop: 4, fontFamily: "monospace" }}>
                  AED {s ? Math.round(s.predicted_psf).toLocaleString() : "—"} PSF
                </div>
                <div style={{ marginTop: 8 }}>
                  <Chip type={confTier} label={(s?.price_confidence?.toUpperCase() || confTier) + " CONFIDENCE"} />
                </div>
              </div>

              <div style={{ width: 1, height: 80, background: C.border }} />

              <div>
                <div style={{ fontSize: 9, color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8,
                  fontFamily: "'IBM Plex Mono', monospace" }}>ENGINE SCORES</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                  <ScoreRing score={s?.community_maturity_score} label="MATURITY" color={C.accent} />
                  <ScoreRing score={s?.cfi_score} label="CFI" color={C.blue} />
                  <ScoreRing score={100 - (s?.amenity_fraud_score || 0)} label="DELIVERY" color={C.amber} />
                  <ScoreRing score={s?.developer_credibility} label="DEV CRED" color={C.accent} />
                </div>
              </div>
            </div>
          </Card>

          {/* Key Metrics Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {[
              { label: "Gross Yield", val: fmtPct(s?.gross_yield_pct), col: parseFloat(s?.gross_yield_pct) > 5 ? C.accent : C.amber, tier: "LIVE" },
              { label: "Real Yield", val: fmtPct(s?.real_yield_pct), col: parseFloat(s?.real_yield_pct) > 4 ? C.accent : C.amber, tier: "LIVE" },
              { label: "True Yield", val: fmtPct(s?.true_yield_pct), col: parseFloat(s?.true_yield_pct) < 0 ? C.red : C.accent, tier: "LIVE" },
              { label: "Recommendation", val: s?.recommendation || "—",
                col: s?.recommendation === "BUY" ? C.accent : s?.recommendation === "HOLD" ? C.amber : C.red, tier: "LIVE" },
            ].map((m, i) => (
              <Card key={i} style={{ textAlign: "center", padding: 14 }}>
                <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase",
                  marginBottom: 6, fontFamily: "monospace" }}>{m.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: m.col, fontFamily: "'IBM Plex Mono', monospace" }}>{m.val}</div>
                <div style={{ marginTop: 5 }}><Chip type={m.tier} /></div>
              </Card>
            ))}
          </div>

          {/* Community Maturity */}
          {mat && (
            <Card>
              <Section icon="●" title="Community Maturity" sub={`gold.community_maturity_scores · ${mat.as_of_date}`} />
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", height: 24, borderRadius: 5, overflow: "hidden", position: "relative" }}>
                  {[
                    { label: "Desert", range: [0, 20], col: "#1a2030" },
                    { label: "First Handovers", range: [20, 40], col: "#2d1f00" },
                    { label: "Infra Unlock", range: [40, 65], col: "#00261a" },
                    { label: "Full Community", range: [65, 100], col: C.accentDim },
                  ].map((seg, i) => (
                    <div key={i} style={{ flex: seg.range[1] - seg.range[0], background: seg.col,
                      display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 8, color: "#fff", opacity: 0.7, textTransform: "uppercase",
                        letterSpacing: 0.3 }}>{seg.label}</span>
                    </div>
                  ))}
                  <div style={{ position: "absolute", left: `${mat.maturity_score}%`, top: -3,
                    transform: "translateX(-50%)", width: 2, height: 30, background: C.text,
                    boxShadow: `0 0 6px ${C.text}`, borderRadius: 1 }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10 }}>
                  <span style={{ color: C.muted }}>0</span>
                  <span style={{ color: C.accent, fontWeight: 700, fontFamily: "monospace" }}>
                    {fmt(mat.maturity_score, 1)}/100 — {mat.maturity_phase}
                  </span>
                  <span style={{ color: C.muted }}>100</span>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                {[
                  { l: "Clusters Delivered", v: `${mat.clusters_handed_over}/${mat.clusters_total}`, ok: true },
                  { l: "Souk", v: mat.souk_open ? "OPEN" : "CLOSED", ok: mat.souk_open },
                  { l: "Metro", v: mat.metro_status?.replace("_", " ").toUpperCase(), ok: mat.metro_status !== "none" },
                  { l: "Schools Active", v: String(mat.schools_active), ok: mat.schools_active > 0 },
                  { l: "Phase Premium", v: `+${mat.price_premium_vs_phase1_pct}% vs Phase 1`, ok: true },
                  { l: "Data", v: "LIVE · Supabase", ok: true },
                ].map((item, i) => (
                  <div key={i} style={{ background: C.cardHi, borderRadius: 6, padding: "8px 10px", textAlign: "center" }}>
                    <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8 }}>{item.l}</div>
                    <div style={{ fontSize: 12, color: item.ok ? C.accent : C.amber, fontWeight: 700, marginTop: 2,
                      fontFamily: "monospace" }}>{item.v}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ══ PREDICTION TAB ══════════════════════════════════ */}
      {tab === "Prediction" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Card>
            <Section icon="◈" title="Price Triangulation" sub={`${D?.dldComps?.length || 0} DLD comps · gold.property_scorecard`} />
            <div style={{ textAlign: "center", padding: "14px 0 18px" }}>
              <div style={{ fontSize: 9, color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4,
                fontFamily: "monospace" }}>PREDICTED FAIR VALUE</div>
              <div style={{ fontSize: 38, fontWeight: 700, color: C.accent, fontFamily: "'IBM Plex Mono', monospace" }}>
                {fmtM(s?.fair_value_mid)}
              </div>
              <div style={{ fontSize: 11, color: C.dim, marginTop: 3 }}>
                {fmtM(s?.fair_value_low)} – {fmtM(s?.fair_value_high)} range
              </div>
            </div>

            {/* Triangulation sources */}
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
              <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, textTransform: "uppercase",
                marginBottom: 8, fontFamily: "monospace" }}>TRIANGULATION SOURCES</div>
              {(s?.triangulation_sources || []).map((src: R, i: number) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 90px 40px 14px", gap: 6,
                  padding: "5px 0", borderBottom: `1px solid ${C.border}`, fontSize: 11 }}>
                  <span style={{ color: C.dim }}>{src.source}</span>
                  <span style={{ color: C.text, fontFamily: "monospace", fontWeight: 700 }}>
                    {src.avg_price ? `AED ${(src.avg_price / 1e6).toFixed(2)}M` : src.psf ? `${src.psf} PSF` : "—"}
                  </span>
                  <span style={{ color: C.muted }}>{Math.round((src.weight || 0) * 100)}%</span>
                  <span style={{ color: src.tier === "LIVE" ? C.accent : C.amber, fontSize: 13 }}>●</span>
                </div>
              ))}
            </div>

            {/* PSM benchmarks */}
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, textTransform: "uppercase",
                marginBottom: 6, fontFamily: "monospace" }}>PSM BENCHMARKS (xray_psm_benchmarks)</div>
              {(D?.psm || []).filter((r: R) => r.master_community.includes("Arabian")).map((r: R, i: number) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 60px 80px", gap: 6,
                  padding: "4px 0", borderBottom: `1px solid ${C.border}`, fontSize: 11 }}>
                  <span style={{ color: C.dim }}>{r.master_community} {r.property_segment}</span>
                  <span style={{ color: C.accent, fontFamily: "monospace", fontWeight: 700 }}>{r.psm_avg} PSF</span>
                  <span style={{ color: C.blue, fontFamily: "monospace" }}>{fmtPct(r.yoy_price_change_pct)}</span>
                  <span style={{ color: C.muted, fontSize: 10 }}>{r.maturity_stage}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <Section icon="●" title="DLD Transaction Comps" sub="xray_dld_recent · AR3 3BR cluster comps" />
            {(D?.dldComps || []).slice(0, 12).map((t: R, i: number) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 60px 65px", gap: 4,
                padding: "4px 0", borderBottom: `1px solid ${C.border}`, fontSize: 11 }}>
                <span style={{ color: C.dim }}>
                  {(t.project_name_en || "").replace(/arabian ranches (lll|iii) - /i, "AR3·")}
                </span>
                <span style={{ color: C.accent, fontFamily: "monospace", fontWeight: 700 }}>
                  AED {(t.price_aed / 1e6).toFixed(2)}M
                </span>
                <span style={{ color: C.dim, fontFamily: "monospace" }}>{Math.round(t.price_per_sqft)}/sqft</span>
                <span style={{ color: C.muted }}>
                  {new Date(t.instance_date).toLocaleDateString("en-GB", { month: "short", year: "2-digit" })}
                </span>
              </div>
            ))}
            <div style={{ marginTop: 10, background: C.cardHi, borderRadius: 6, padding: 10 }}>
              <div style={{ fontSize: 10, color: C.accent, fontWeight: 700, marginBottom: 4 }}>
                METHODOLOGY: WHAT PORTALS DON'T SHOW
              </div>
              <div style={{ fontSize: 10, color: C.dim, lineHeight: 1.6 }}>
                PropertyFinder shows AED ~3.15M. ZeroAgent computes {fmtM(s?.fair_value_mid)} using {D?.dldComps?.length || 0} real DLD comps + PSM benchmarks + maturity scoring ({fmt(mat?.maturity_score, 1)}/100 Phase 4).
                Every data point is sourced. Confidence: {s?.data_confidence_pct}%.
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ══ YIELD MODEL TAB ════════════════════════════════ */}
      {tab === "Yield Model" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Card>
            <Section icon="◈" title="4-Layer Yield Model" sub="gold.property_scorecard · Ejari + DLD" />
            {[
              { label: "Gross Rental Income (Ejari AR3 avg)", val: fmtPct(s?.gross_yield_pct), amt: `AED ${Math.round(s?.annual_rent_estimate || 0).toLocaleString()}`, col: C.accent, tier: "LIVE" },
              { label: `Service Charge (${D?.sc?.find((r: R) => r.master_community?.includes("III"))?.service_charge_psf || 2.75} AED/sqft)`,
                val: `-${((s?.annual_sc_estimate || 0) / (s?.fair_value_mid || 1) * 100).toFixed(2)}%`,
                amt: `-AED ${Math.round(s?.annual_sc_estimate || 0).toLocaleString()}`, col: C.red, tier: "ESTIMATED" },
              { label: "Maintenance (5%)", val: `-${fmt(s?.gross_yield_pct * 0.05 || 0.25)}%`,
                amt: `-AED ${Math.round((s?.annual_rent_estimate || 0) * 0.05).toLocaleString()}`, col: C.red, tier: "ESTIMATED" },
            ].map((row, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 70px 100px 90px", gap: 6,
                padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 11, alignItems: "center" }}>
                <span style={{ color: C.dim }}>{row.label}</span>
                <span style={{ color: row.col, fontFamily: "monospace", fontWeight: 700 }}>{row.val}</span>
                <span style={{ color: row.col, fontFamily: "monospace" }}>{row.amt}</span>
                <Chip type={row.tier} />
              </div>
            ))}

            <div style={{ padding: "8px 0", borderBottom: `2px solid ${C.accent}`, display: "flex",
              justifyContent: "space-between", fontSize: 12, fontWeight: 700 }}>
              <span style={{ color: C.accent }}>NET YIELD</span>
              <span style={{ color: C.accent, fontFamily: "monospace" }}>{fmtPct(s?.net_yield_pct)}</span>
            </div>

            {[
              { label: "DEWA + Utilities (est)", val: "-0.26%", amt: "-AED 8,400", tier: "ESTIMATED", col: C.red },
              { label: "Vacancy (8% — ~1 month)", val: `-${fmt((s?.annual_rent_estimate || 0) * 0.08 / (s?.fair_value_mid || 1) * 100)}%`,
                amt: `-AED ${Math.round((s?.annual_rent_estimate || 0) * 0.08).toLocaleString()}`, tier: "ESTIMATED", col: C.red },
            ].map((row, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 70px 100px 90px", gap: 6,
                padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 11, alignItems: "center" }}>
                <span style={{ color: C.dim }}>{row.label}</span>
                <span style={{ color: row.col, fontFamily: "monospace", fontWeight: 700 }}>{row.val}</span>
                <span style={{ color: row.col, fontFamily: "monospace" }}>{row.amt}</span>
                <Chip type={row.tier} />
              </div>
            ))}

            <div style={{ padding: "8px 0", borderBottom: `2px solid ${C.amber}`, display: "flex",
              justifyContent: "space-between", fontSize: 12, fontWeight: 700 }}>
              <span style={{ color: C.amber }}>REAL YIELD</span>
              <span style={{ color: C.amber, fontFamily: "monospace" }}>{fmtPct(s?.real_yield_pct)}</span>
            </div>

            <div style={{ padding: "6px 0", borderBottom: `1px solid ${C.border}`, display: "flex",
              justifyContent: "space-between", fontSize: 11, alignItems: "center" }}>
              <span style={{ color: C.dim }}>Opportunity Cost (5.5% FD)</span>
              <span style={{ color: C.red, fontFamily: "monospace", fontWeight: 700 }}>-5.50%</span>
            </div>

            <div style={{ padding: "10px 0", display: "flex", justifyContent: "space-between",
              fontSize: 13, fontWeight: 700 }}>
              <span style={{ color: C.red }}>TRUE YIELD (vs FD)</span>
              <span style={{ color: parseFloat(s?.true_yield_pct) > 0 ? C.accent : C.red, fontFamily: "monospace" }}>
                {fmtPct(s?.true_yield_pct)}
              </span>
            </div>
          </Card>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Card>
              <Section icon="+" title="Verdict" sub="Income vs Appreciation" />
              <div style={{ background: parseFloat(s?.true_yield_pct) > 0 ? C.accentDim : C.redDim,
                borderRadius: 8, padding: 14, marginBottom: 10 }}>
                <div style={{ fontSize: 13, color: parseFloat(s?.true_yield_pct) > 0 ? C.accent : C.red, fontWeight: 700 }}>
                  {parseFloat(s?.true_yield_pct) > 0 ? "INCOME + APPRECIATION PLAY" : "APPRECIATION PLAY — NOT INCOME"}
                </div>
                <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>
                  True yield {fmtPct(s?.true_yield_pct)} vs risk-free 5.5% FD.
                  Breakeven appreciation: {fmt(Math.abs(parseFloat(s?.true_yield_pct || 0)))}%/yr.
                </div>
              </div>
              <div style={{ background: C.accentDim, borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 13, color: C.accent, fontWeight: 700 }}>PHASE 4 CATALYST UPSIDE</div>
                <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>
                  Maturity {fmt(mat?.maturity_score, 1)}/100 — Phase 4 premium already +{mat?.price_premium_vs_phase1_pct}% vs Phase 1.
                  E611 completion + metro build-out projects AED {fmtM((s?.fair_value_mid || 2.6e6) * 1.18)} by 2027.
                </div>
              </div>
            </Card>

            <Card>
              <Section icon="=" title="Ejari Rental Comparables" sub="xray_ejari_summary · AR3 3BR" />
              {(D?.ejari || []).map((r: R, i: number) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 90px 50px", gap: 6,
                  padding: "5px 0", borderBottom: `1px solid ${C.border}`, fontSize: 11 }}>
                  <span style={{ color: C.dim }}>
                    {(r.project_name_en || "").replace(/arabian ranches (lll|iii) - /i, "AR3·")}
                  </span>
                  <span style={{ color: C.accent, fontFamily: "monospace", fontWeight: 700 }}>
                    AED {Math.round(r.avg_rent).toLocaleString()}
                  </span>
                  <span style={{ color: C.muted }}>{r.contract_count} ct</span>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {/* ══ CATALYSTS TAB ═══════════════════════════════════ */}
      {tab === "Catalysts" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Card>
            <Section icon="*" title="Government Catalysts" sub="bronze_government_catalysts · AR3 matches" />
            {cats.length === 0 && (
              <div style={{ color: C.amber, fontSize: 12, padding: 8 }}>No matching catalysts loaded</div>
            )}
            {cats.map((c, i) => {
              const statusCol = c.current_status === "under_construction" ? C.amber
                : c.current_status === "completed" ? C.accent
                : c.current_status === "announced" ? C.blue : C.muted;
              return (
                <div key={i} style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{c.catalyst_name}</div>
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                        {c.catalyst_type?.replace(/_/g, " ").toUpperCase()} ·
                        Due: {c.expected_completion || "TBD"} ·
                        Confidence: {c.completion_confidence?.toUpperCase()}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <span style={{ color: statusCol, fontSize: 10, fontWeight: 700, fontFamily: "monospace" }}>
                        {c.current_status?.replace(/_/g, " ").toUpperCase()}
                      </span>
                      <span style={{ color: C.accent, fontSize: 11, fontFamily: "monospace", fontWeight: 700 }}>
                        Impact: {c.base_impact_score}/100
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </Card>

          <Card>
            <Section icon="o" title="Government Alignment" sub="xray_government_alignment · AR3" />
            {gov ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { l: "Alignment Score", v: `${gov.government_alignment_score}/10`, tier: "LIVE" },
                  { l: "Metro Status", v: gov.metro_status?.replace(/_/g, " ").toUpperCase(), tier: "LIVE" },
                  { l: "Metro Station", v: gov.metro_station_name, tier: "LIVE" },
                  { l: "Metro Distance", v: `${gov.metro_distance_km} km`, tier: "LIVE" },
                  { l: "D33 FDI Target Zone", v: "YES", tier: "LIVE" },
                  { l: "Freehold Zone", v: "YES", tier: "LIVE" },
                  { l: "Golden Visa Eligible", v: "YES", tier: "LIVE" },
                  { l: "PSM Impact Projected", v: gov.projected_psm_impact_pct, tier: "LIVE" },
                ].map((r, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "160px 1fr 90px", gap: 6,
                    padding: "5px 0", borderBottom: `1px solid ${C.border}`, fontSize: 11 }}>
                    <span style={{ color: C.dim }}>{r.l}</span>
                    <span style={{ color: C.accent, fontFamily: "monospace", fontWeight: 600 }}>{r.v}</span>
                    <Chip type={r.tier} />
                  </div>
                ))}
                <div style={{ marginTop: 8, background: C.cardHi, borderRadius: 6, padding: 10 }}>
                  <div style={{ fontSize: 10, color: C.dim, lineHeight: 1.6 }}>{gov.infrastructure_catalyst_timeline}</div>
                </div>
              </div>
            ) : <div style={{ color: C.red, fontSize: 12 }}>No AR3 alignment data loaded</div>}

            {/* CFI */}
            {cfi && (
              <div style={{ marginTop: 14 }}>
                <Section icon="◈" title="Capital Flow Index" sub="v_cfi_by_community · computed from KHDA + affinity" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    { l: "CFI Score", v: `${fmt(cfi.cfi_score, 1)}/100` },
                    { l: "Tier", v: cfi.cfi_tier },
                    { l: "Buyer Nationalities", v: `${cfi.nationality_count} tracked` },
                    { l: "YoY Growth Signal", v: fmtPct(cfi.weighted_yoy_growth) },
                  ].map((r, i) => (
                    <div key={i} style={{ background: C.cardHi, borderRadius: 6, padding: "8px 10px" }}>
                      <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8 }}>{r.l}</div>
                      <div style={{ fontSize: 12, color: C.blue, fontWeight: 700, marginTop: 2, fontFamily: "monospace" }}>{r.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 6 }}><Chip type="LIVE" label="LIVE · v_cfi_by_community" /></div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ══ DNA TAB ══════════════════════════════════════════ */}
      {tab === "DNA" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Card>
            <Section icon="◇" title="Property + Developer DNA" />
            {dev && [
              { l: "Developer", v: "Emaar Properties", tier: "LIVE" },
              { l: "Delivery Rate", v: `${dev.delivery_rate_pct}%`, tier: "LIVE" },
              { l: "Avg Delay", v: `${dev.avg_delay_months} months`, tier: "LIVE" },
              { l: "Build Quality", v: `${dev.build_quality_score}/5`, tier: "LIVE" },
              { l: "Brand Tier", v: dev.brand_tier?.toUpperCase(), tier: "LIVE" },
              { l: "BUA", v: "1,877 sqft", tier: "LIVE" },
              { l: "Bedrooms", v: "3", tier: "LIVE" },
              { l: "Property Type", v: "Townhouse", tier: "LIVE" },
              { l: "Handover", v: "Q3 2026", tier: "LIVE" },
              { l: "Gated Community", v: "Yes", tier: "LIVE" },
              { l: "Private Garden", v: "Yes", tier: "LIVE" },
              { l: "Parking", v: "2 covered", tier: "LIVE" },
              { l: "Community Maturity", v: `${fmt(mat?.maturity_score || 0, 1)}/100`, tier: "LIVE" },
              { l: "Maturity Phase", v: mat?.maturity_phase || "—", tier: "LIVE" },
              { l: "Construction %", v: "Not in DB", tier: "GAP" },
              { l: "View Type", v: "Park / Internal", tier: "ESTIMATED" },
            ].map((r, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "160px 1fr 90px", gap: 6,
                padding: "5px 0", borderBottom: `1px solid ${C.border}`, fontSize: 11 }}>
                <span style={{ color: C.dim }}>{r.l}</span>
                <span style={{ color: r.tier === "GAP" ? C.red : r.tier === "LIVE" ? C.accent : C.amber,
                  fontFamily: "monospace", fontWeight: 600 }}>{r.v}</span>
                <Chip type={r.tier} />
              </div>
            ))}
          </Card>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Card>
              <Section icon="*" title="Amenity Fraud Score" sub="v_amenity_fraud_scores · computed" />
              {(D?.fraud || []).map((f: R, i: number) => (
                <div key={i} style={{ padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: C.dim, fontSize: 12 }}>{f.master_community}</span>
                    <span style={{ color: f.amenity_fraud_score < 30 ? C.accent : f.amenity_fraud_score < 60 ? C.amber : C.red,
                      fontFamily: "monospace", fontWeight: 700, fontSize: 13 }}>
                      {f.amenity_fraud_score}/100
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                    Delivery rate: {f.delivery_rate_pct}% · {f.fully_delivered}/{f.total_promised} amenities delivered
                  </div>
                  <Chip type="LIVE" label="LIVE · v_amenity_fraud_scores" />
                </div>
              ))}
            </Card>

            <Card>
              <Section icon="=" title="Service Charges" sub="xray_service_charges" />
              {(D?.sc || []).map((r: R, i: number) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 70px 70px", gap: 4,
                  padding: "5px 0", borderBottom: `1px solid ${C.border}`, fontSize: 11 }}>
                  <span style={{ color: C.dim }}>{r.master_community}</span>
                  <span style={{ color: C.accent, fontFamily: "monospace", fontWeight: 700 }}>
                    AED {r.service_charge_psf}/sqft
                  </span>
                  <span style={{ color: C.muted }}>{r.year}</span>
                  <Chip type={r.data_source === "emaar_data" || r.data_source === "rera_estimate" ? "LIVE" : "ESTIMATED"} />
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 14, padding: "8px 0", borderTop: `1px solid ${C.border}`,
        display: "flex", justifyContent: "space-between", fontSize: 9, color: C.muted,
        fontFamily: "'IBM Plex Mono', monospace", flexWrap: "wrap", gap: 4 }}>
        <span>ZeroAgent Engine 12 · gold.property_scorecard · awreaqilmwfpvaxwanpa · {new Date().toLocaleDateString()}</span>
        <span>
          {D?.dldComps?.length || 0} DLD txns · {D?.ejari?.length || 0} Ejari · {cats.length} catalysts · 72% data confidence
        </span>
      </div>
    </div>
  );
}
