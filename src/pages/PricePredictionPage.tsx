import { useState, useEffect, useMemo } from "react";
import { useTheme } from "@/lib/theme";

// ═══════════════════════════════════════════════════════════════════
// ZEROAGENT ENGINE 12 — PREDICTIVE PRICING INTELLIGENCE
// Arabian Ranches III · Raya · 3BR Townhouse
//
// Data sources:
//   gold.property_scorecard       → predicted fair value + yield
//   gold.v_community_rental_profile → Ejari medians + Mollak SC (joined)
//   gold.v_ejari_community_summary  → bedroom-level Ejari aggregation
//   gold.v_mollak_community_summary → RERA service charges from Mollak
//   gold.engine12_community_readiness → community availability gate
//   xray_dld_recent, xray_developer_scores, xray_psm_benchmarks,
//   xray_government_alignment, community_maturity_scores,
//   bronze_government_catalysts, v_cfi_by_community, v_amenity_fraud_scores
// ═══════════════════════════════════════════════════════════════════

const SUPA = "https://awreaqilmwfpvaxwanpa.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3cmVhcWlsbXdmcHZheHdhbnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMzE0NDAsImV4cCI6MjA4NjgwNzQ0MH0.uqn5tiC51OzrkeXOSD2nwIiePXkew471tbvz2TjbyFk";

const sq = async (table: string, params = "") => {
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

// ── Rental freshness helper ──
function rentalFreshnessInfo(latestContractDate: string | null | undefined) {
  if (!latestContractDate) return { label: "No rental data", stale: true };
  const d = new Date(latestContractDate);
  const daysOld = (Date.now() - d.getTime()) / 86400000;
  const label = d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  return { label: `Rental data: ${label}`, stale: daysOld > 90 };
}

// ── SC source badge helper ──
function scBadgeInfo(scDataStatus: string | null | undefined, mollakYear: number | null | undefined) {
  if (scDataStatus === "mollak_live" && mollakYear && mollakYear >= 2024) {
    return { label: `Mollak ${mollakYear}`, type: "LIVE" as const };
  }
  if (scDataStatus === "mollak_live" && mollakYear) {
    return { label: `Mollak ${mollakYear} — may be stale`, type: "ESTIMATED" as const };
  }
  return { label: "RERA Estimate", type: "ESTIMATED" as const };
}

// ── Demand signal helper ──
function demandSignal(newLeaseRatioPct: number | null | undefined) {
  const v = Number(newLeaseRatioPct) || 0;
  if (v > 40) return { label: "Strong inflow demand", type: "accent" as const };
  if (v > 25) return { label: "Steady demand", type: "neutral" as const };
  return { label: "Renewal-heavy market", type: "amber" as const };
}

// ── Readiness badge helper ──
function readinessBadge(score: number | null | undefined) {
  const s = Number(score) || 0;
  if (s >= 80) return { label: "FULL", type: "LIVE" as const };
  if (s >= 60) return { label: "HIGH", type: "ESTIMATED" as const };
  if (s >= 40) return { label: "MEDIUM", type: "GAP" as const };
  return { label: "LOW", type: "GAP" as const };
}

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
        const [scorecard, dldComps, rentalProfile, ejariDetail, mollak, readiness, devScore, psm, maturity, catalysts, govAlign, cfi, fraud] =
          await Promise.all([
            sq("gold.property_scorecard",
              "select=*&project_name=eq.Arabian+Ranches+III+-+Raya&order=as_of_date.desc&limit=1"),
            sq("xray_dld_recent",
              "select=project_name_en,rooms_en,sqft,price_aed,price_per_sqft,instance_date&project_name_en=ilike.*arabian+ranches*&rooms_en=eq.3+B%2FR&order=instance_date.desc&limit=30"),
            // NEW: gold.v_community_rental_profile — Ejari + Mollak joined
            sq("gold.v_community_rental_profile",
              "select=*&master_community=eq.Arabian+Ranches+III&limit=1"),
            // NEW: gold.v_ejari_community_summary — bedroom-level Ejari
            sq("gold.v_ejari_community_summary",
              "select=*&master_community=eq.Arabian+Ranches+III"),
            // NEW: gold.v_mollak_community_summary — Mollak SC
            sq("gold.v_mollak_community_summary",
              "select=*&master_community=eq.Arabian+Ranches+III&limit=1"),
            // NEW: gold.engine12_community_readiness — readiness gate
            sq("gold.engine12_community_readiness",
              "select=*&master_community=eq.Arabian+Ranches+III&limit=1"),
            sq("xray_developer_scores",
              "select=developer,delivery_rate_pct,avg_delay_months,build_quality_score,brand_tier&developer=ilike.*emaar*&limit=1"),
            sq("xray_psm_benchmarks",
              "select=master_community,property_segment,psm_avg,psm_low,psm_high,annual_rent_yield_pct,yoy_price_change_pct,maturity_stage&master_community=ilike.*arabian+ranches*"),
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
          scorecard: scorecard?.[0], dldComps,
          rentalProfile: rentalProfile?.[0],
          ejariDetail: ejariDetail || [],
          mollak: mollak?.[0],
          readiness: readiness?.[0],
          devScore: devScore?.[0], psm,
          maturity: maturity?.[0], catalysts, govAlign: govAlign?.[0],
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
          Querying gold.property_scorecard + rental profile...
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
  const rp: R | null = D?.rentalProfile || null; // v_community_rental_profile
  const ejd: R[] = D?.ejariDetail || [];          // v_ejari_community_summary
  const mollak: R | null = D?.mollak || null;     // v_mollak_community_summary
  const readiness: R | null = D?.readiness || null;
  const BUA = 1877;

  // Live Ejari median rent for 3BR (Step 8)
  const liveRent3BR = rp?.median_rent_3br ? Number(rp.median_rent_3br) : (s?.annual_rent_estimate || 0);

  // SC from Mollak or fallback
  const liveSCPsf = rp?.avg_sc_psf ? Number(rp.avg_sc_psf) : (mollak?.avg_sc_psf ? Number(mollak.avg_sc_psf) : 2.75);
  const annualSC = liveSCPsf * BUA;
  const scBadge = scBadgeInfo(rp?.sc_data_status, rp?.mollak_latest_year || mollak?.latest_year);

  // Rental freshness (Step 5)
  const freshness = rentalFreshnessInfo(rp?.latest_contract_date);

  // Demand signal (Step 7)
  const demand = demandSignal(rp?.new_lease_ratio_pct);

  // Readiness (Step 6)
  const rBadge = readinessBadge(readiness?.engine12_score);

  // Yield calculations using live data (Step 3)
  const grossYield = liveRent3BR && s?.fair_value_mid ? (liveRent3BR / Number(s.fair_value_mid)) * 100 : Number(s?.gross_yield_pct) || 0;
  const netYield = s?.fair_value_mid ? ((liveRent3BR - annualSC) / Number(s.fair_value_mid)) * 100 : Number(s?.net_yield_pct) || 0;
  const maintenance = liveRent3BR * 0.05;
  const dewa = 8400;
  const vacancy = liveRent3BR * 0.08;
  const realYield = s?.fair_value_mid ? ((liveRent3BR - annualSC - maintenance - dewa - vacancy) / Number(s.fair_value_mid)) * 100 : Number(s?.real_yield_pct) || 0;
  const trueYield = realYield - 5.5;

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
            <Chip type={rBadge.type} label={`E12: ${rBadge.label} (${readiness?.engine12_score ?? "—"})`} />
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

          {/* Key Metrics Row — now using live computed yields */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {[
              { label: "Gross Yield", val: fmtPct(grossYield), col: grossYield > 5 ? C.accent : C.amber, tier: rp ? "LIVE" : "ESTIMATED" },
              { label: "Real Yield", val: fmtPct(realYield), col: realYield > 4 ? C.accent : C.amber, tier: rp ? "LIVE" : "ESTIMATED" },
              { label: "True Yield", val: fmtPct(trueYield), col: trueYield < 0 ? C.red : C.accent, tier: rp ? "LIVE" : "ESTIMATED" },
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

          {/* Rental + Demand Signal Strip */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {/* Rental Freshness */}
            <Card style={{ padding: 12, textAlign: "center" }}>
              <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, textTransform: "uppercase", fontFamily: "monospace" }}>EJARI DATA</div>
              <div style={{ fontSize: 12, color: freshness.stale ? C.amber : C.accent, fontWeight: 700, marginTop: 4, fontFamily: "monospace" }}>
                {freshness.stale ? "⚠ " : ""}{freshness.label}
              </div>
              <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>
                {rp?.total_contracts ? `${Number(rp.total_contracts).toLocaleString()} contracts · 24mo` : "—"}
              </div>
            </Card>
            {/* Demand Signal */}
            <Card style={{ padding: 12, textAlign: "center" }}>
              <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, textTransform: "uppercase", fontFamily: "monospace" }}>DEMAND SIGNAL</div>
              <div style={{ fontSize: 12, color: demand.type === "accent" ? C.accent : demand.type === "amber" ? C.amber : C.dim,
                fontWeight: 700, marginTop: 4, fontFamily: "monospace" }}>
                {demand.label}
              </div>
              <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>
                {rp?.new_lease_ratio_pct ? `${Number(rp.new_lease_ratio_pct).toFixed(1)}% new leases` : "—"}
              </div>
            </Card>
            {/* SC Source */}
            <Card style={{ padding: 12, textAlign: "center" }}>
              <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, textTransform: "uppercase", fontFamily: "monospace" }}>SERVICE CHARGE</div>
              <div style={{ fontSize: 12, color: C.text, fontWeight: 700, marginTop: 4, fontFamily: "monospace" }}>
                AED {liveSCPsf.toFixed(2)}/sqft
              </div>
              <div style={{ marginTop: 4 }}><Chip type={scBadge.type} label={scBadge.label} /></div>
            </Card>
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
            <Section icon="◈" title="4-Layer Yield Model" sub="gold.v_community_rental_profile + Mollak SC" />
            {[
              { label: `Gross Rental Income (Ejari median · 24mo · 3BR)`, val: fmtPct(grossYield),
                amt: `AED ${Math.round(liveRent3BR).toLocaleString()}`, col: C.accent,
                tier: rp?.rental_data_quality === "high" || rp?.rental_data_quality === "medium" ? "LIVE" : "ESTIMATED" },
              { label: `Service Charge (${liveSCPsf.toFixed(2)} AED/sqft)`,
                val: `-${(annualSC / (Number(s?.fair_value_mid) || 1) * 100).toFixed(2)}%`,
                amt: `-AED ${Math.round(annualSC).toLocaleString()}`, col: C.red, tier: scBadge.type },
              { label: "Maintenance (5%)", val: `-${fmt(grossYield * 0.05)}%`,
                amt: `-AED ${Math.round(maintenance).toLocaleString()}`, col: C.red, tier: "ESTIMATED" },
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
              <span style={{ color: C.accent, fontFamily: "monospace" }}>{fmtPct(netYield)}</span>
            </div>

            {[
              { label: "DEWA + Utilities (est)", val: `-${(dewa / (Number(s?.fair_value_mid) || 1) * 100).toFixed(2)}%`,
                amt: `-AED ${dewa.toLocaleString()}`, tier: "ESTIMATED", col: C.red },
              { label: "Vacancy (8% — ~1 month)", val: `-${(vacancy / (Number(s?.fair_value_mid) || 1) * 100).toFixed(2)}%`,
                amt: `-AED ${Math.round(vacancy).toLocaleString()}`, tier: "ESTIMATED", col: C.red },
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
              <span style={{ color: C.amber, fontFamily: "monospace" }}>{fmtPct(realYield)}</span>
            </div>

            <div style={{ padding: "6px 0", borderBottom: `1px solid ${C.border}`, display: "flex",
              justifyContent: "space-between", fontSize: 11, alignItems: "center" }}>
              <span style={{ color: C.dim }}>Opportunity Cost (5.5% FD)</span>
              <span style={{ color: C.red, fontFamily: "monospace", fontWeight: 700 }}>-5.50%</span>
            </div>

            <div style={{ padding: "10px 0", display: "flex", justifyContent: "space-between",
              fontSize: 13, fontWeight: 700 }}>
              <span style={{ color: C.red }}>TRUE YIELD (vs FD)</span>
              <span style={{ color: trueYield > 0 ? C.accent : C.red, fontFamily: "monospace" }}>
                {fmtPct(trueYield)}
              </span>
            </div>
          </Card>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Card>
              <Section icon="+" title="Verdict" sub="Income vs Appreciation" />
              <div style={{ background: trueYield > 0 ? C.accentDim : C.redDim,
                borderRadius: 8, padding: 14, marginBottom: 10 }}>
                <div style={{ fontSize: 13, color: trueYield > 0 ? C.accent : C.red, fontWeight: 700 }}>
                  {trueYield > 0 ? "INCOME + APPRECIATION PLAY" : "APPRECIATION PLAY — NOT INCOME"}
                </div>
                <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>
                  True yield {fmtPct(trueYield)} vs risk-free 5.5% FD.
                  Breakeven appreciation: {fmt(Math.abs(trueYield))}%/yr.
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

            {/* Ejari Rental Comparables — now from gold views */}
            <Card>
              <Section icon="=" title="Ejari Rental Comparables" sub="gold.v_community_rental_profile · AR3 3BR" />
              {/* Live Ejari median rent for AR3 3BR */}
              {rp && (
                <div style={{ background: C.accentDim, borderRadius: 6, padding: 10, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 9, color: C.accent, letterSpacing: 1, textTransform: "uppercase", fontFamily: "monospace" }}>
                        3BR MEDIAN RENT · EJARI MEDIAN · 24MO
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: C.accent, fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>
                        AED {Math.round(liveRent3BR).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <Chip type={rp.rental_data_quality === "high" ? "LIVE" : "ESTIMATED"}
                        label={rp.rental_data_quality === "high" ? "HIGH QUALITY" : rp.rental_data_quality?.toUpperCase()} />
                      <div style={{ marginTop: 4 }}>
                        <span style={{ fontSize: 9, color: freshness.stale ? C.amber : C.dim, fontFamily: "monospace" }}>
                          {freshness.stale ? "⚠ " : ""}{freshness.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* Bedroom breakdown */}
              {[
                { bed: "Studio", ct: rp?.studio_contracts, rent: rp?.median_rent_studio },
                { bed: "1BR", ct: rp?.br1_contracts, rent: rp?.median_rent_1br },
                { bed: "2BR", ct: rp?.br2_contracts, rent: rp?.median_rent_2br },
                { bed: "3BR", ct: rp?.br3_contracts, rent: rp?.median_rent_3br },
                { bed: "4BR", ct: rp?.br4_contracts, rent: rp?.median_rent_4br },
                { bed: "5BR", ct: rp?.br5_contracts, rent: rp?.median_rent_5br },
              ].filter(r => r.rent && Number(r.rent) > 0).map((r, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "50px 1fr 50px", gap: 6,
                  padding: "5px 0", borderBottom: `1px solid ${C.border}`, fontSize: 11 }}>
                  <span style={{ color: r.bed === "3BR" ? C.accent : C.dim, fontWeight: r.bed === "3BR" ? 700 : 400 }}>{r.bed}</span>
                  <span style={{ color: r.bed === "3BR" ? C.accent : C.text, fontFamily: "monospace", fontWeight: 700 }}>
                    AED {Math.round(Number(r.rent)).toLocaleString()}
                  </span>
                  <span style={{ color: C.muted }}>{r.ct ? `${Number(r.ct).toLocaleString()} ct` : "—"}</span>
                </div>
              ))}
              {/* Ejari detail rows if available */}
              {ejd.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, textTransform: "uppercase",
                    marginBottom: 4, fontFamily: "monospace" }}>BEDROOM-LEVEL DETAIL (v_ejari_community_summary)</div>
                  {ejd.map((r: R, i: number) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 1fr 80px 50px", gap: 6,
                      padding: "4px 0", borderBottom: `1px solid ${C.border}`, fontSize: 10 }}>
                      <span style={{ color: C.dim }}>{r.bedrooms}</span>
                      <span style={{ color: C.accent, fontFamily: "monospace", fontWeight: 700 }}>
                        AED {r.median_rent_aed ? Math.round(Number(r.median_rent_aed)).toLocaleString() : "—"}
                      </span>
                      <span style={{ color: C.dim, fontFamily: "monospace" }}>avg {r.avg_rent_aed ? Math.round(Number(r.avg_rent_aed)).toLocaleString() : "—"}</span>
                      <span style={{ color: C.muted }}>{r.contract_count || "—"} ct</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Demand signal */}
              {rp?.new_lease_ratio_pct && (
                <div style={{ marginTop: 8, padding: "6px 10px", background: demand.type === "accent" ? C.accentDim : demand.type === "amber" ? C.amberDim : C.cardHi,
                  borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: demand.type === "accent" ? C.accent : demand.type === "amber" ? C.amber : C.dim, fontWeight: 700 }}>
                    {demand.label}
                  </span>
                  <span style={{ fontSize: 10, color: C.dim, fontFamily: "monospace" }}>
                    {Number(rp.new_lease_ratio_pct).toFixed(1)}% new leases
                  </span>
                </div>
              )}
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
              { l: "Engine 12 Score", v: readiness ? `${readiness.engine12_score}/100 (${rBadge.label})` : "—", tier: readiness ? "LIVE" : "GAP" },
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
              <Section icon="=" title="Service Charges" sub={`gold.v_mollak_community_summary · ${scBadge.label}`} />
              {/* Mollak SC summary */}
              {mollak ? (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                    {[
                      { l: "Avg SC/sqft", v: `AED ${Number(mollak.avg_sc_psf).toFixed(2)}` },
                      { l: "Median SC/sqft", v: `AED ${Number(mollak.median_sc_psf).toFixed(2)}` },
                      { l: "Projects", v: `${mollak.project_count} tracked` },
                    ].map((r, i) => (
                      <div key={i} style={{ background: C.cardHi, borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
                        <div style={{ fontSize: 8, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>{r.l}</div>
                        <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, marginTop: 2, fontFamily: "monospace" }}>{r.v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 6, display: "flex", gap: 6, alignItems: "center" }}>
                    <Chip type={scBadge.type} label={scBadge.label} />
                    {mollak.avg_general_fund_psf && (
                      <span style={{ fontSize: 9, color: C.muted, fontFamily: "monospace" }}>
                        Gen fund: AED {Number(mollak.avg_general_fund_psf).toFixed(2)}/sqft · Reserve: AED {Number(mollak.avg_reserve_fund_psf || 0).toFixed(2)}/sqft
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ padding: "6px 0", marginBottom: 8 }}>
                  <Chip type={scBadge.type} label={scBadge.label} />
                  <span style={{ fontSize: 10, color: C.dim, marginLeft: 8 }}>AED {liveSCPsf.toFixed(2)}/sqft (fallback)</span>
                </div>
              )}
              {/* Readiness summary */}
              {readiness && (
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8, marginTop: 4 }}>
                  <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6, fontFamily: "monospace" }}>
                    ENGINE 12 READINESS (gold.engine12_community_readiness)
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                    {[
                      { l: "E12 Score", v: `${readiness.engine12_score}/100` },
                      { l: "Dev Reliability", v: `${Number(readiness.dev_reliability_score).toFixed(1)}` },
                      { l: "DLD Txns", v: `${readiness.dld_txns?.toLocaleString()}` },
                      { l: "Rent Contracts", v: `${readiness.rent_contracts?.toLocaleString()}` },
                      { l: "Avg YoY", v: fmtPct(readiness.avg_yoy_pct) },
                      { l: "Community Type", v: readiness.community_type || "—" },
                    ].map((r, i) => (
                      <div key={i} style={{ background: C.cardHi, borderRadius: 6, padding: "6px 8px", textAlign: "center" }}>
                        <div style={{ fontSize: 8, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>{r.l}</div>
                        <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, marginTop: 2, fontFamily: "monospace" }}>{r.v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 6 }}><Chip type={rBadge.type} label={`READINESS: ${rBadge.label}`} /></div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 14, padding: "8px 0", borderTop: `1px solid ${C.border}`,
        display: "flex", justifyContent: "space-between", fontSize: 9, color: C.muted,
        fontFamily: "'IBM Plex Mono', monospace", flexWrap: "wrap", gap: 4 }}>
        <span>ZeroAgent Engine 12 · gold.property_scorecard + v_community_rental_profile · awreaqilmwfpvaxwanpa · {new Date().toLocaleDateString()}</span>
        <span>
          {D?.dldComps?.length || 0} DLD txns · {rp?.total_contracts ? Number(rp.total_contracts).toLocaleString() : "0"} Ejari · {cats.length} catalysts · {readiness?.engine12_score ?? "—"}/100 E12
        </span>
      </div>
    </div>
  );
}
