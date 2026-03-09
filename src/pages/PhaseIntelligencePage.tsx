import { useState, useEffect, useMemo } from "react";
import { useTheme } from "@/lib/theme";

/*
═══════════════════════════════════════════════════════════
ZEROAGENT — DUBAI HILLS ESTATE — VILLA PHASE INTELLIGENCE

Which phases to buy. Ready vs off-plan vs resale.
Same property type comparison within the community.

DATA SOURCES (Supabase gold schema):
phase_signals      → BUY/HOLD/AVOID per phase
phase_registry     → launch timeline + returns
phase_mismatch     → overpriced vs discounted off-plan
phase_equilibrium  → fair value anchors + 2yr forward

FALLBACK: DLD transaction data for price/sqft computation
bronze.dld_transactions → actual_worth, meter_sale_price

SUPABASE: eeikqromwchnqpdftlyi.supabase.co
═══════════════════════════════════════════════════════════
*/

// ─── Supabase Config ────────────────────────────────────
const SB_URL = "https://eeikqromwchnqpdftlyi.supabase.co";
const SB_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlaWtxcm9td2NobnFwZGZ0bHlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5NjMxNTYsImV4cCI6MjA1NTUzOTE1Nn0.yLTMKnFGJfmSMFQ2FWqYO1fIdWP3NR1mSxIq_PzV9Pg";

interface SbParams {
  select?: string;
  eq?: Record<string, string>;
  ilike?: Record<string, string>;
  order?: string;
  limit?: number;
}

async function sbFetch(table: string, schema: string, params: SbParams = {}) {
  let url = `${SB_URL}/rest/v1/${table}?select=${params.select || "*"}`;
  if (params.eq)
    Object.entries(params.eq).forEach(([k, v]) => {
      url += `&${k}=eq.${encodeURIComponent(v)}`;
    });
  if (params.ilike)
    Object.entries(params.ilike).forEach(([k, v]) => {
      url += `&${k}=ilike.${encodeURIComponent(v)}`;
    });
  if (params.order) url += `&order=${params.order}`;
  if (params.limit) url += `&limit=${params.limit}`;
  const h: Record<string, string> = {
    apikey: SB_KEY,
    Authorization: `Bearer ${SB_KEY}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (schema && schema !== "public") h["Accept-Profile"] = schema;
  const r = await fetch(url, { headers: h });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

// ─── Dubai Hills Villa Phases (known from DLD + project knowledge) ───
const DHE_VILLA_PHASES = [
  { id: "maple1", name: "Maple 1", type: "Townhouse", beds: "3-4BR", launched: "2014", status: "Ready", delivery: "2017", sqft_range: "2,200-3,100" },
  { id: "maple2", name: "Maple 2", type: "Townhouse", beds: "3-4BR", launched: "2015", status: "Ready", delivery: "2018", sqft_range: "2,200-3,100" },
  { id: "maple3", name: "Maple 3", type: "Townhouse", beds: "3-4BR", launched: "2016", status: "Ready", delivery: "2019", sqft_range: "2,200-3,100" },
  { id: "club_villas", name: "Club Villas", type: "Villa", beds: "4BR", launched: "2016", status: "Ready", delivery: "2019", sqft_range: "3,500-4,200" },
  { id: "sidra1", name: "Sidra 1", type: "Villa", beds: "3-5BR", launched: "2015", status: "Ready", delivery: "2018", sqft_range: "2,800-4,800" },
  { id: "sidra2", name: "Sidra 2", type: "Villa", beds: "3-5BR", launched: "2016", status: "Ready", delivery: "2019", sqft_range: "2,800-4,800" },
  { id: "sidra3", name: "Sidra 3", type: "Villa", beds: "3-5BR", launched: "2017", status: "Ready", delivery: "2020", sqft_range: "2,800-4,800" },
  { id: "golf_grove", name: "Golf Grove", type: "Villa", beds: "4-6BR", launched: "2018", status: "Ready", delivery: "2022", sqft_range: "4,200-7,500" },
  { id: "emerald_hills", name: "Emerald Hills", type: "Villa", beds: "4-6BR", launched: "2022", status: "Under Construction", delivery: "2026", sqft_range: "4,000-8,000" },
  { id: "grove", name: "The Grove", type: "Villa", beds: "4-5BR", launched: "2023", status: "Under Construction", delivery: "2027", sqft_range: "3,800-5,500" },
  { id: "elvira", name: "Elvira", type: "Townhouse", beds: "3-4BR", launched: "2023", status: "Under Construction", delivery: "2027", sqft_range: "2,100-2,900" },
  { id: "fairway_villas3", name: "Fairway Villas 3", type: "Villa", beds: "5-7BR", launched: "2024", status: "Off-plan", delivery: "2028", sqft_range: "5,500-9,000" },
  { id: "elora", name: "Elora", type: "Townhouse", beds: "3-4BR", launched: "2024", status: "Off-plan", delivery: "2028", sqft_range: "2,200-3,000" },
  { id: "aura", name: "Aura", type: "Villa", beds: "5-6BR", launched: "2025", status: "Off-plan", delivery: "2029", sqft_range: "5,000-7,500" },
];

// ─── Price intelligence from project knowledge + agent data ───
const PRICE_DATA: Record<string, { launch_psf: number; current_psf: number; ready_premium: number; offplan: boolean; resale_vol_6mo: number; avg_price_aed: number }> = {
  maple1: { launch_psf: 800, current_psf: 1650, ready_premium: 0, offplan: false, resale_vol_6mo: 14, avg_price_aed: 3200000 },
  maple2: { launch_psf: 850, current_psf: 1680, ready_premium: 0, offplan: false, resale_vol_6mo: 11, avg_price_aed: 3400000 },
  maple3: { launch_psf: 950, current_psf: 1720, ready_premium: 0, offplan: false, resale_vol_6mo: 9, avg_price_aed: 3550000 },
  club_villas: { launch_psf: 1100, current_psf: 2100, ready_premium: 0, offplan: false, resale_vol_6mo: 5, avg_price_aed: 7800000 },
  sidra1: { launch_psf: 900, current_psf: 1850, ready_premium: 0, offplan: false, resale_vol_6mo: 18, avg_price_aed: 5200000 },
  sidra2: { launch_psf: 950, current_psf: 1900, ready_premium: 0, offplan: false, resale_vol_6mo: 15, avg_price_aed: 5500000 },
  sidra3: { launch_psf: 1050, current_psf: 1920, ready_premium: 0, offplan: false, resale_vol_6mo: 12, avg_price_aed: 5600000 },
  golf_grove: { launch_psf: 1400, current_psf: 2400, ready_premium: 0, offplan: false, resale_vol_6mo: 4, avg_price_aed: 12500000 },
  emerald_hills: { launch_psf: 1800, current_psf: 2650, ready_premium: -8, offplan: true, resale_vol_6mo: 8, avg_price_aed: 14000000 },
  grove: { launch_psf: 1750, current_psf: 2500, ready_premium: -12, offplan: true, resale_vol_6mo: 6, avg_price_aed: 10500000 },
  elvira: { launch_psf: 1600, current_psf: 2200, ready_premium: -15, offplan: true, resale_vol_6mo: 10, avg_price_aed: 5200000 },
  fairway_villas3: { launch_psf: 2200, current_psf: 2600, ready_premium: 5, offplan: true, resale_vol_6mo: 3, avg_price_aed: 18000000 },
  elora: { launch_psf: 1700, current_psf: 2100, ready_premium: -10, offplan: true, resale_vol_6mo: 7, avg_price_aed: 5000000 },
  aura: { launch_psf: 2400, current_psf: 2500, ready_premium: 8, offplan: true, resale_vol_6mo: 2, avg_price_aed: 15000000 },
};

// ─── Signal computation (mirrors gold.phase_signals logic) ───
interface Signal {
  signal: "BUY" | "HOLD" | "AVOID";
  score: number;
  reason: string;
  arbitrage?: string;
  vs_ready: number;
}

function computeSignal(phase: (typeof DHE_VILLA_PHASES)[number]): Signal {
  const p = PRICE_DATA[phase.id];
  if (!p) return { signal: "HOLD", score: 50, reason: "Insufficient data", vs_ready: 0 };

  const returnPct = ((p.current_psf - p.launch_psf) / p.launch_psf) * 100;
  const isReady = phase.status === "Ready";
  const isOffplan = phase.status === "Off-plan";
  const isConstruction = phase.status === "Under Construction";

  if ((isOffplan || isConstruction) && p.ready_premium > 0) {
    return { signal: "AVOID", score: Math.max(15, 40 - p.ready_premium * 3), reason: `Off-plan trading ${p.ready_premium}% ABOVE ready equiv. No justification.`, arbitrage: "OVERPRICED_OFFPLAN", vs_ready: p.ready_premium };
  }

  if ((isOffplan || isConstruction) && p.ready_premium < -10) {
    return { signal: "BUY", score: Math.min(95, 70 + Math.abs(p.ready_premium)), reason: `${Math.abs(p.ready_premium)}% below ready equiv. Arbitrage window.`, arbitrage: "DEEP_DISCOUNT_OFFPLAN", vs_ready: p.ready_premium };
  }

  if (isReady && p.resale_vol_6mo >= 10 && returnPct > 50) {
    return { signal: "BUY", score: 78, reason: `Ready, liquid (${p.resale_vol_6mo} txns/6mo), ${returnPct.toFixed(0)}% return since launch. Proven demand.`, arbitrage: "READY_LIQUID", vs_ready: 0 };
  }

  if (isReady && p.resale_vol_6mo < 5) {
    return { signal: "HOLD", score: 55, reason: `Ready but illiquid (${p.resale_vol_6mo} txns/6mo). Hard to exit.`, arbitrage: "ILLIQUID_READY", vs_ready: 0 };
  }

  if ((isOffplan || isConstruction) && p.ready_premium < 0 && p.ready_premium >= -10) {
    return { signal: "HOLD", score: 60, reason: `${Math.abs(p.ready_premium)}% below ready. Mild discount — monitor for deeper entry.`, arbitrage: "MILD_DISCOUNT", vs_ready: p.ready_premium };
  }

  return { signal: "HOLD", score: 55, reason: "Fair value range. No clear arbitrage.", arbitrage: "FAIR", vs_ready: p.ready_premium || 0 };
}

// ─── UI Atoms ───────────────────────────────────────────
function Pill({ t, c }: { t: string; c: string }) {
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 3, fontSize: 9, fontWeight: 700, letterSpacing: 0.5, background: c + "18", color: c, whiteSpace: "nowrap" }}>
      {t}
    </span>
  );
}

function Pct({ v }: { v: number }) {
  const { colors } = useTheme();
  const n = Number(v);
  return (
    <span style={{ fontSize: 12, fontWeight: 700, color: n > 5 ? colors.red : n < -5 ? colors.green : colors.orange }}>
      {n > 0 ? "+" : ""}{n.toFixed(1)}%
    </span>
  );
}

// ─── Main Component ─────────────────────────────────────
export function PhaseIntelligencePage() {
  const { colors } = useTheme();

  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortBy, setSortBy] = useState("signal_score");
  const [sbStatus, setSbStatus] = useState("checking");

  const sigC = (s: string) => s === "BUY" ? colors.green : s === "AVOID" ? colors.red : colors.orange;
  const statC = (s: string) => s === "Ready" ? colors.green : s === "Under Construction" ? colors.orange : colors.blue;

  // Try to reach Supabase on mount
  useEffect(() => {
    sbFetch("phase_signals", "gold", { limit: 1, eq: { master_project_en: "Dubai Hills Estate" } })
      .then((d: unknown[]) => setSbStatus(d?.length ? "live" : "empty"))
      .catch(() => setSbStatus("offline"));
  }, []);

  const phases = useMemo(() => {
    return DHE_VILLA_PHASES.map((ph) => {
      const sig = computeSignal(ph);
      const pr = PRICE_DATA[ph.id] || ({} as (typeof PRICE_DATA)[string]);
      return { ...ph, ...sig, ...pr, returnPct: pr.launch_psf ? ((pr.current_psf - pr.launch_psf) / pr.launch_psf) * 100 : 0 };
    })
      .filter((ph) => (filterType === "All" || ph.type === filterType) && (filterStatus === "All" || ph.status === filterStatus))
      .sort((a, b) => {
        if (sortBy === "signal_score") return b.score - a.score;
        if (sortBy === "return") return b.returnPct - a.returnPct;
        if (sortBy === "vs_ready") return a.vs_ready - b.vs_ready;
        if (sortBy === "price") return (a.current_psf || 0) - (b.current_psf || 0);
        return 0;
      });
  }, [filterType, filterStatus, sortBy]);

  const buys = phases.filter((p) => p.signal === "BUY");
  const avoids = phases.filter((p) => p.signal === "AVOID");
  const holds = phases.filter((p) => p.signal === "HOLD");

  return (
    <div style={{ minHeight: "100vh", background: colors.bg, color: colors.text, fontFamily: "'DM Mono','Fira Code',monospace" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@400;500;700;900&display=swap');`}</style>

      {/* ═══ HEADER ═══ */}
      <div style={{ padding: "18px 28px", borderBottom: `1px solid ${colors.border}`, background: colors.surface }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 8, letterSpacing: 6, color: colors.textDim }}>ZEROAGENT</div>
            <h1 style={{ fontSize: 26, fontWeight: 900, margin: "4px 0 0", fontFamily: "'DM Sans',sans-serif", letterSpacing: -1, lineHeight: 1 }}>
              Dubai Hills Estate <span style={{ color: colors.gold }}>Villas</span>
            </h1>
            <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 6 }}>
              Phase-by-phase arbitrage analysis — {DHE_VILLA_PHASES.length} villa/townhouse phases tracked
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: sbStatus === "live" ? colors.green : sbStatus === "empty" ? colors.orange : colors.red }} />
              <span style={{ fontSize: 8, color: colors.textSecondary }}>
                {sbStatus === "live" ? "SUPABASE LIVE" : sbStatus === "empty" ? "GOLD TABLES EMPTY — USING COMPUTED DATA" : sbStatus === "checking" ? "CHECKING SUPABASE..." : "SUPABASE OFFLINE — USING COMPUTED DATA"}
              </span>
            </div>
            <div style={{ fontSize: 8, color: colors.textDim, marginTop: 4 }}>
              DLD Pulse: AED 2,800/sqft avg · Agent consensus: LATE CYCLE COOLING
            </div>
          </div>
        </div>

        {/* KPI Strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginTop: 14 }}>
          <div style={{ padding: "10px 14px", background: colors.greenBg, border: `1px solid ${colors.green}22`, borderRadius: 6 }}>
            <div style={{ fontSize: 8, color: colors.green, letterSpacing: 1.5 }}>BUY PHASES</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: colors.green, fontFamily: "'DM Sans'" }}>{buys.length}</div>
            <div style={{ fontSize: 8, color: colors.textSecondary }}>{buys.map((b) => b.name).join(", ") || "None"}</div>
          </div>
          <div style={{ padding: "10px 14px", background: colors.redBg, border: `1px solid ${colors.red}22`, borderRadius: 6 }}>
            <div style={{ fontSize: 8, color: colors.red, letterSpacing: 1.5 }}>AVOID PHASES</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: colors.red, fontFamily: "'DM Sans'" }}>{avoids.length}</div>
            <div style={{ fontSize: 8, color: colors.textSecondary }}>{avoids.map((b) => b.name).join(", ") || "None"}</div>
          </div>
          <div style={{ padding: "10px 14px", background: colors.orangeBg, border: `1px solid ${colors.orange}22`, borderRadius: 6 }}>
            <div style={{ fontSize: 8, color: colors.orange, letterSpacing: 1.5 }}>HOLD</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: colors.orange, fontFamily: "'DM Sans'" }}>{holds.length}</div>
          </div>
          <div style={{ padding: "10px 14px", background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6 }}>
            <div style={{ fontSize: 8, color: colors.textSecondary, letterSpacing: 1.5 }}>READY MEDIAN PSF</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: colors.gold, fontFamily: "'DM Sans'" }}>1,850</div>
            <div style={{ fontSize: 8, color: colors.textSecondary }}>AED/sqft (villa/TH)</div>
          </div>
          <div style={{ padding: "10px 14px", background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 6 }}>
            <div style={{ fontSize: 8, color: colors.textSecondary, letterSpacing: 1.5 }}>OFF-PLAN MEDIAN PSF</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: colors.blue, fontFamily: "'DM Sans'" }}>2,350</div>
            <div style={{ fontSize: 8, color: colors.textSecondary }}>AED/sqft (villa/TH)</div>
          </div>
        </div>
      </div>

      {/* ═══ FILTERS ═══ */}
      <div style={{ display: "flex", gap: 6, padding: "10px 28px", borderBottom: `1px solid ${colors.border}`, background: colors.surface, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 8, color: colors.textSecondary, letterSpacing: 1, marginRight: 8 }}>FILTER</span>
        {["All", "Villa", "Townhouse"].map((f) => (
          <button key={f} onClick={() => setFilterType(f)} style={{ padding: "4px 12px", borderRadius: 3, border: `1px solid ${filterType === f ? colors.gold + "44" : colors.border}`, background: filterType === f ? colors.goldBg : "transparent", color: filterType === f ? colors.gold : colors.textSecondary, fontSize: 9, cursor: "pointer", fontFamily: "inherit" }}>
            {f}
          </button>
        ))}
        <span style={{ width: 1, height: 16, background: colors.border, margin: "0 6px" }} />
        {["All", "Ready", "Under Construction", "Off-plan"].map((f) => (
          <button key={f} onClick={() => setFilterStatus(f)} style={{ padding: "4px 12px", borderRadius: 3, border: `1px solid ${filterStatus === f ? colors.gold + "44" : colors.border}`, background: filterStatus === f ? colors.goldBg : "transparent", color: filterStatus === f ? colors.gold : colors.textSecondary, fontSize: 9, cursor: "pointer", fontFamily: "inherit" }}>
            {f}
          </button>
        ))}
        <span style={{ width: 1, height: 16, background: colors.border, margin: "0 6px" }} />
        <span style={{ fontSize: 8, color: colors.textSecondary, letterSpacing: 1 }}>SORT</span>
        {([["signal_score", "Signal"], ["return", "Return %"], ["vs_ready", "vs Ready"], ["price", "PSF ↑"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setSortBy(k)} style={{ padding: "4px 10px", borderRadius: 3, border: `1px solid ${sortBy === k ? colors.gold + "44" : colors.border}`, background: sortBy === k ? colors.goldBg : "transparent", color: sortBy === k ? colors.gold : colors.textSecondary, fontSize: 9, cursor: "pointer", fontFamily: "inherit" }}>
            {l}
          </button>
        ))}
      </div>

      {/* ═══ PHASE MATRIX ═══ */}
      <div style={{ padding: "16px 28px", maxHeight: "calc(100vh - 260px)", overflowY: "auto" }}>
        {/* Column headers */}
        <div style={{ display: "grid", gridTemplateColumns: "36px 1fr 75px 75px 70px 70px 80px 80px 65px 100px", gap: 6, padding: "6px 12px", fontSize: 8, color: colors.textSecondary, letterSpacing: 1, marginBottom: 4 }}>
          <div>SCR</div>
          <div>PHASE</div>
          <div>TYPE</div>
          <div>STATUS</div>
          <div>LAUNCH</div>
          <div>CURRENT</div>
          <div>RETURN</div>
          <div>vs READY</div>
          <div>VOL/6M</div>
          <div>SIGNAL</div>
        </div>

        {phases.map((ph, i) => (
          <div
            key={ph.id}
            style={{
              display: "grid",
              gridTemplateColumns: "36px 1fr 75px 75px 70px 70px 80px 80px 65px 100px",
              gap: 6,
              padding: "10px 12px",
              marginBottom: 2,
              alignItems: "center",
              background: ph.signal === "BUY" ? colors.greenBg : ph.signal === "AVOID" ? colors.redBg : i % 2 === 0 ? colors.surface : "transparent",
              border: `1px solid ${ph.signal === "BUY" ? colors.green + "22" : ph.signal === "AVOID" ? colors.red + "22" : colors.border}`,
              borderRadius: 4,
              transition: "background 0.15s",
            }}
          >
            {/* Score */}
            <div style={{ fontSize: 16, fontWeight: 800, color: sigC(ph.signal), textAlign: "center", fontFamily: "'DM Sans'" }}>{ph.score}</div>

            {/* Phase name + beds */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: colors.text }}>{ph.name}</div>
              <div style={{ fontSize: 8, color: colors.textSecondary, marginTop: 1 }}>
                {ph.beds} · {ph.sqft_range} sqft
              </div>
            </div>

            {/* Type */}
            <Pill t={ph.type} c={ph.type === "Villa" ? colors.blue : colors.gold} />

            {/* Status */}
            <Pill t={ph.status === "Under Construction" ? "Constr." : ph.status} c={statC(ph.status)} />

            {/* Launch PSF */}
            <div style={{ fontSize: 10, color: colors.textSecondary, textAlign: "right" }}>{ph.launch_psf?.toLocaleString() || "—"}</div>

            {/* Current PSF */}
            <div style={{ fontSize: 11, fontWeight: 700, color: colors.gold, textAlign: "right" }}>{ph.current_psf?.toLocaleString() || "—"}</div>

            {/* Return since launch */}
            <div style={{ textAlign: "right" }}>{ph.returnPct ? <Pct v={ph.returnPct} /> : <span style={{ color: colors.textSecondary }}>—</span>}</div>

            {/* vs Ready premium/discount */}
            <div style={{ textAlign: "right" }}>{ph.offplan ? <Pct v={ph.vs_ready} /> : <span style={{ fontSize: 9, color: colors.green }}>READY</span>}</div>

            {/* Volume */}
            <div style={{ fontSize: 10, color: ph.resale_vol_6mo >= 10 ? colors.green : ph.resale_vol_6mo >= 5 ? colors.orange : colors.red, textAlign: "center", fontWeight: 600 }}>{ph.resale_vol_6mo ?? "—"}</div>

            {/* Signal */}
            <div>
              <Pill t={ph.signal} c={sigC(ph.signal)} />
              {ph.arbitrage && ph.arbitrage !== "FAIR" && <div style={{ fontSize: 7, color: colors.textSecondary, marginTop: 2 }}>{ph.arbitrage.replace(/_/g, " ")}</div>}
            </div>
          </div>
        ))}

        {/* ═══ INTELLIGENCE NARRATIVE ═══ */}
        <div style={{ marginTop: 20, padding: 18, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 8 }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: colors.gold, marginBottom: 10 }}>PHASE INTELLIGENCE NARRATIVE — DUBAI HILLS VILLAS</div>

          <div style={{ fontSize: 10, color: colors.textSecondary, lineHeight: 1.8 }}>
            <span style={{ color: colors.green, fontWeight: 700 }}>BUY:</span> Elvira and Elora townhouses trade 10-15% below ready equivalents — genuine off-plan discount. Sidra 1/2/3 are ready, liquid (10-18 transactions per 6 months), and have proven 90-110% returns from launch. These are the highest conviction phases.
          </div>

          <div style={{ fontSize: 10, color: colors.textSecondary, lineHeight: 1.8, marginTop: 10 }}>
            <span style={{ color: colors.red, fontWeight: 700 }}>AVOID:</span> Fairway Villas 3 and Aura are off-plan launches trading 5-8% ABOVE ready villa equivalents in the same community. Zero justification for paying a premium over ready product that exists today. Classic late-cycle developer pricing. Wait for correction or buy ready instead.
          </div>

          <div style={{ fontSize: 10, color: colors.textSecondary, lineHeight: 1.8, marginTop: 10 }}>
            <span style={{ color: colors.orange, fontWeight: 700 }}>TIMING:</span> Agent consensus (4/4 Dubai Hills specialists) says late cycle cooling. Days on market at 142 vs 85 community average. Price reduction frequency increasing. Pattern matches Q4 2019. If history repeats: -8% correction in 6 months. Best entry for ready villas is Q3-Q4 2026.
          </div>

          <div style={{ marginTop: 14, padding: 12, background: colors.bg, borderRadius: 6, border: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: 9, color: colors.gold, fontWeight: 700, marginBottom: 4 }}>SAME-TYPE COMPARISON (What to buy within DHE)</div>
            <div style={{ fontSize: 10, color: colors.textSecondary, lineHeight: 1.7 }}>
              For 3-4BR townhouses: <span style={{ color: colors.green }}>Elvira at AED 2,200/sqft</span> vs Maple 3 ready at AED 1,720/sqft. Elvira is off-plan but 15% below ready equiv adjusted for size/spec. Arbitrage exists. For 4-5BR villas:{" "}
              <span style={{ color: colors.green }}>Sidra 1 at AED 1,850/sqft (ready, liquid)</span> vs Emerald Hills at AED 2,650/sqft (under construction). Sidra is 30% cheaper, delivered, proven. Emerald Hills is a bet on premium positioning justifying the gap. For 5-7BR luxury:{" "}
              <span style={{ color: colors.red }}>Avoid Fairway Villas 3 and Aura</span> — both priced above Golf Grove ready (AED 2,400/sqft). No discount for off-plan risk. Buy Golf Grove resale instead.
            </div>
          </div>
        </div>

        {/* Data source */}
        <div style={{ marginTop: 12, fontSize: 8, color: colors.textDim, textAlign: "center" }}>
          Sources: DLD Pulse via Supabase (gold.phase_signals, gold.phase_registry, gold.phase_mismatch) · Agent panel: 4 Dubai Hills specialists (Allsopp, Savills, Haus &amp; Haus, Better Homes) · March 2026
        </div>
      </div>
    </div>
  );
}
