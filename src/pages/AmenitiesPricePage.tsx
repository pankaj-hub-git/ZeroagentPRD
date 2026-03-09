import { useState, useEffect, useRef, useCallback } from "react";
import { useTheme, type ThemeColors } from "@/lib/theme";
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  BarController,
  LineController,
  Filler,
  Tooltip,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";

Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  BarController,
  LineController,
  Filler,
  Tooltip,
  annotationPlugin
);

/*
═══════════════════════════════════════════════════════════
ZEROAGENT — DUBAI PRICE INTELLIGENCE

Live PSF benchmarks · Micro-catalyst events · Unit pricing
59 communities · Amenities & catalyst price analysis

DATA SOURCES (Supabase):
community_price_index      → quarterly price index per community
community_catalyst_events  → dated catalyst annotations per community
xray_psm_benchmarks        → PSF by segment
xray_projects              → project-level pricing
xray_community_amenities   → amenities & catalyst events
dhe_buildings / dhe_units   → DHE delivered unit prices

SUPABASE: awreaqilmwfpvaxwanpa.supabase.co
═══════════════════════════════════════════════════════════
*/

// ─── Supabase Config ────────────────────────────────────
const SB_URL = "https://awreaqilmwfpvaxwanpa.supabase.co/rest/v1";
const SB_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3cmVhcWlsbXdmcHZheHdhbnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMzE0NDAsImV4cCI6MjA4NjgwNzQ0MH0.uqn5tiC51OzrkeXOSD2nwIiePXkew471tbvz2TjbyFk";
const HDR: Record<string, string> = {
  apikey: SB_KEY,
  Authorization: "Bearer " + SB_KEY,
  Accept: "application/json",
};

async function sbGet(table: string, params: Record<string, string> = {}) {
  const url = `${SB_URL}/${table}?${new URLSearchParams(params)}`;
  const r = await fetch(url, { headers: HDR });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

// ─── Community list ─────────────────────────────────────
const COMMUNITY_GROUPS = [
  {
    label: "Premium / Landmark",
    items: [
      "Dubai Hills Estate", "Downtown Dubai", "Palm Jumeirah", "Jumeirah Bay Island",
      "DIFC", "City Walk", "Za'abeel", "Al Barari", "Madinat Jumeirah Living",
      "Emirates Living", "Al Safa",
    ],
  },
  {
    label: "Waterfront / Marina",
    items: [
      "Dubai Marina", "JBR", "Emaar Beachfront", "Dubai Creek Harbour",
      "Mina Rashid", "Dubai Islands", "Palm Jebel Ali", "Culture Village",
    ],
  },
  {
    label: "Business / Mixed Use",
    items: [
      "Business Bay", "Mohammed Bin Rashid City", "Al Habtoor City",
      "Meydan", "Sobha Hartland", "Sobha Hartland II",
    ],
  },
  {
    label: "Established Communities",
    items: [
      "Jumeirah Village Circle", "Jumeirah Lake Towers", "Jumeirah Village Triangle",
      "Jumeirah Golf Estates", "Arabian Ranches", "The Greens", "Barsha Heights",
      "Al Barsha", "Al Furjan", "Motor City", "Discovery Gardens",
      "International City", "Dubai Silicon Oasis", "Dubai Production City",
      "Dubai Sports City", "Remraam", "Dubai Residence Complex", "Al Quoz",
      "Dubai Investment Park", "Liwan", "Majan", "Dubailand", "Wadi Al Safa",
    ],
  },
  {
    label: "Emerging / Growth",
    items: [
      "DAMAC Hills", "DAMAC Hills 2", "DAMAC Lagoons", "Arabian Ranches III",
      "Tilal Al Ghaf", "The Valley", "Nad Al Sheba", "Mudon", "Dubai South",
      "Town Square",
    ],
  },
];

const TOTAL_COMMUNITIES = COMMUNITY_GROUPS.reduce((a, g) => a + g.items.length, 0);

// ─── Lookup tables ──────────────────────────────────────
const SEG_LBL: Record<string, string> = {
  villa: "Villa", townhouse: "Townhouse", "1br_apartment": "1BR Apt",
  "2br_apartment": "2BR Apt", "3br_apartment": "3BR Apt",
  studio: "Studio", branded_residence: "Branded Res", penthouse: "Penthouse",
};
const SEG_COLOR = [
  "#00d68f", "#4f91ff", "#f5b942", "#c084fc",
  "#fb923c", "#38bdf8", "#f472b6", "#a3e635",
];
const CAT_ICON: Record<string, string> = {
  education: "🏫", recreation: "🌳", healthcare: "🏥",
  retail: "🛍️", business: "🏢", transport: "🚌",
  infrastructure: "🔧", hospitality: "🏨", sports: "⚽",
};
const PROJ_STATUS: Record<string, string> = {
  off_plan: "🔨", ready: "✅", under_construction: "🏗️",
  completed: "✅", on_hold: "⏸",
};

// ─── DHE hardcoded override (real transaction data) ─────
const DHE_OVERRIDE: Record<number, { community: number; dubai: number }> = {};
const DHE_REAL = [100,106,113,109,103,97,102,103,119,123,139,150,162,166,178,213,204,209,227,242,262,261,268,274,276,283,292,298,298];
const DUBAI_REAL = [100,94,91,94,92,90,86,88,97,104,110,111,130,129,128,131,140,141,143,143,156,156,157,168,176,186,183,185,193];
DHE_REAL.forEach((v, i) => { DHE_OVERRIDE[i] = { community: v, dubai: DUBAI_REAL[i] }; });

// ─── Helpers ────────────────────────────────────────────
function fmtAED(n: number | string) {
  const v = Number(n);
  if (!v) return "—";
  if (v >= 1e6) return "AED " + (v / 1e6).toFixed(1) + "M";
  if (v >= 1e3) return "AED " + (v / 1e3).toFixed(0) + "K";
  return "AED " + v;
}

// ─── Types ──────────────────────────────────────────────
interface PsmRow {
  property_segment: string;
  psm_avg: string;
  psm_low: string;
  psm_high: string;
  yoy_price_change_pct: string;
  maturity_stage: string;
  data_period: string;
}

interface ProjectRow {
  id: string;
  project_name: string;
  building_type: string;
  project_category: string;
  avg_price_per_sqft: string;
  price_range_aed_min: string;
  price_range_aed_max: string;
  project_status: string;
}

interface BuildingRow {
  id: string;
  name: string;
  handover: string;
}

interface UnitRow {
  building_id: string;
  bed: string;
  avg_sale_price: string;
}

interface AmenityRow {
  amenity_name: string;
  amenity_category: string;
  lifecycle_stage: string;
  actual_completion_date: string;
  expected_completion_date: string;
}

interface IndexRow {
  quarter_num: number;
  quarter_label: string;
  community_idx: string;
  dubai_idx: string;
}

interface CatalystRow {
  amenity_name: string;
  amenity_category: string;
  quarter_num: number;
  label_short: string;
  icon: string;
}

// ─── Spinner ────────────────────────────────────────────
function Spinner({ colors }: { colors: ThemeColors }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: colors.textSecondary, fontFamily: "'DM Mono',monospace", padding: "10px 0" }}>
      <div
        style={{
          width: 12, height: 12, border: `2px solid ${colors.border}`,
          borderTopColor: colors.green, borderRadius: "50%",
          animation: "amenity-spin .8s linear infinite", flexShrink: 0,
        }}
      />
      Loading…
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────
export function AmenitiesPricePage() {
  const { colors } = useTheme();
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInst = useRef<Chart | null>(null);

  const [community, setCommunity] = useState("Dubai Hills Estate");

  // Data states
  const [psm, setPsm] = useState<PsmRow[] | null>(null);
  const [psmLoading, setPsmLoading] = useState(true);
  const [psmErr, setPsmErr] = useState<string | null>(null);

  const [projects, setProjects] = useState<Array<{ name: string; chips: Array<{ label: string; hi?: boolean }> }> | null>(null);
  const [projLoading, setProjLoading] = useState(true);
  const [projErr, setProjErr] = useState<string | null>(null);
  const [projTitle, setProjTitle] = useState("Projects & Pricing");
  const [projBadge, setProjBadge] = useState("xray_projects");

  const [amenities, setAmenities] = useState<AmenityRow[] | null>(null);
  const [amenLoading, setAmenLoading] = useState(true);
  const [amenErr, setAmenErr] = useState<string | null>(null);

  // Chart data state (for legend visibility)
  const [hasIndexChart, setHasIndexChart] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    topPsf: "—", topLbl: "Top segment PSF", topYoy: "—",
    segCount: "—", maturity: "—",
    projCount: "—", projLbl: "Projects tracked", amenCount: "—",
    avgYoy: "—", period: "Q4 2025",
  });
  const [anchorBadge, setAnchorBadge] = useState("Fetching live data…");
  const [chartTitle, setChartTitle] = useState("Micro-Catalyst Event Study");
  const [chartSub, setChartSub] = useState("Loading…");

  // ─── Chart rendering ───────────────────────────────
  const destroyChart = useCallback(() => {
    if (chartInst.current) {
      chartInst.current.destroy();
      chartInst.current = null;
    }
  }, []);

  const renderIndexChart = useCallback(
    (indexData: IndexRow[], catalysts: CatalystRow[], communityName: string, c: ThemeColors) => {
      destroyChart();
      const ctx = chartRef.current?.getContext("2d");
      if (!ctx || !indexData.length) return;

      // Sort by quarter_num
      const sorted = [...indexData].sort((a, b) => a.quarter_num - b.quarter_num);
      const isDHE = communityName === "Dubai Hills Estate";

      const labels = sorted.map((d) => d.quarter_label);
      const commValues = sorted.map((d) => {
        const n = d.quarter_num;
        if (isDHE && DHE_OVERRIDE[n]) return DHE_OVERRIDE[n].community;
        return Number(d.community_idx);
      });
      const dubaiValues = sorted.map((d) => {
        const n = d.quarter_num;
        if (isDHE && DHE_OVERRIDE[n]) return DHE_OVERRIDE[n].dubai;
        return Number(d.dubai_idx);
      });
      const alphaValues = commValues.map((v, i) => v - dubaiValues[i]);

      // Dynamic Y-axis
      const yMax = Math.max(...commValues, ...dubaiValues);
      const yMaxRounded = Math.ceil(yMax / 50) * 50 + 30;

      // Build annotations from catalyst events
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ann: Record<string, any> = {};
      // De-duplicate by quarter_num
      const seen = new Set<number>();
      const dedupCatalysts = catalysts.filter((ev) => {
        if (seen.has(ev.quarter_num)) return false;
        seen.add(ev.quarter_num);
        return true;
      });

      // Two label Y rows to avoid overlap
      const annY1 = Math.round(yMaxRounded * 0.93);
      const annY2 = Math.round(yMaxRounded * 0.80);
      const annYRows = [annY1, annY2];

      dedupCatalysts.forEach((ev, i) => {
        const qIdx = sorted.findIndex((d) => d.quarter_num === ev.quarter_num);
        if (qIdx < 0) return;

        const commVal = commValues[qIdx];
        const lbl = ev.label_short || ev.amenity_name.slice(0, 14);
        const icon = ev.icon || CAT_ICON[ev.amenity_category] || "📍";

        const xLabel = labels[qIdx];
        ann["vl" + i] = { type: "line", xMin: xLabel, xMax: xLabel, borderColor: c.border, borderWidth: 1, borderDash: [5, 5] };
        ann["pt" + i] = { type: "point", xValue: xLabel, yValue: commVal, radius: 5, backgroundColor: c.gold, borderColor: c.text, borderWidth: 1.5 };
        ann["lb" + i] = {
          type: "label", xValue: xLabel, yValue: annYRows[i % 2],
          content: [icon + " " + lbl], color: c.text,
          font: { size: 10, weight: "600" as const },
          backgroundColor: c.bg + "EE", padding: { top: 4, bottom: 4, left: 6, right: 6 },
          borderRadius: 5, borderColor: c.gold + "55", borderWidth: 1,
        };
      });

      chartInst.current = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            { label: communityName, data: commValues, borderColor: c.green, borderWidth: 3, pointRadius: 0, pointHoverRadius: 6, tension: 0.35, fill: false },
            { label: "Dubai", data: dubaiValues, borderColor: c.red, borderWidth: 2, pointRadius: 0, tension: 0.35, borderDash: [8, 4], fill: false },
            { label: "Alpha", data: alphaValues, borderColor: c.gold + "99", borderWidth: 1.5, pointRadius: 0, tension: 0.35, fill: { target: "origin", above: c.green + "16", below: c.red + "16" } },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          layout: { padding: { top: 8, right: 8, bottom: 4, left: 4 } },
          interaction: { intersect: false, mode: "index" },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: c.surface, titleColor: c.text, bodyColor: c.textSecondary,
              borderColor: c.border, borderWidth: 1, padding: 12,
              callbacks: {
                label: (ctx2) => {
                  const v = ctx2.parsed?.y ?? 0;
                  if (ctx2.dataset.label === "Alpha") return `  Alpha: ${v > 0 ? "+" : ""}${v.toFixed(0)} pts`;
                  if (ctx2.dataset.label === "Dubai") return `  Dubai: ${v.toFixed(0)}`;
                  return `  ${communityName}: ${v.toFixed(0)}`;
                },
              },
            },
            annotation: { annotations: ann },
          },
          scales: {
            x: { grid: { color: c.border + "44" }, border: { color: c.border }, ticks: { color: c.textSecondary, font: { size: 11 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 15, padding: 8 } },
            y: { min: -30, max: yMaxRounded, grid: { color: c.border + "66" }, border: { color: c.border }, ticks: { color: c.textSecondary, font: { size: 11 }, padding: 10, stepSize: 50 }, title: { display: true, text: "Price Index (Q1 2019 = 100)", color: c.textSecondary, font: { size: 11 }, padding: { bottom: 8 } } },
          },
        },
      });
    },
    [destroyChart]
  );

  const renderPSFChart = useCallback(
    (data: PsmRow[], c: ThemeColors) => {
      destroyChart();
      const ctx = chartRef.current?.getContext("2d");
      if (!ctx || !data.length) return;

      const labels = data.map((d) => SEG_LBL[d.property_segment] || d.property_segment);
      const avgs = data.map((d) => Number(d.psm_avg));
      const lows = data.map((d) => Number(d.psm_low));
      const highs = data.map((d) => Number(d.psm_high));
      const barColors = data.map((_, i) => SEG_COLOR[i % SEG_COLOR.length]);

      chartInst.current = new Chart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [
            { label: "Avg PSF", data: avgs, backgroundColor: barColors.map((col) => col + "28"), borderColor: barColors, borderWidth: 2, borderRadius: 6, order: 1 },
            { label: "High", data: highs, type: "line", borderColor: c.text + "2E", borderWidth: 1, pointRadius: 5, pointBackgroundColor: c.text + "4D", fill: false, order: 0 },
            { label: "Low", data: lows, type: "line", borderColor: c.text + "14", borderWidth: 1, pointRadius: 5, pointBackgroundColor: c.text + "1F", fill: false, order: 0 },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          layout: { padding: { top: 8, right: 8, bottom: 4, left: 4 } },
          interaction: { intersect: false, mode: "index" },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: c.surface, titleColor: c.text, bodyColor: c.textSecondary,
              borderColor: c.border, borderWidth: 1, padding: 12,
              callbacks: {
                title: (items) => labels[items[0].dataIndex],
                label: (ctx2) => {
                  const v = Number(ctx2.parsed.y).toLocaleString();
                  if (ctx2.dataset.label === "Avg PSF") return `  Avg: AED ${v} PSF`;
                  if (ctx2.dataset.label === "High") return `  High: AED ${v} PSF`;
                  return `  Low: AED ${v} PSF`;
                },
              },
            },
          },
          scales: {
            x: { grid: { color: c.border + "44" }, border: { color: c.border }, ticks: { color: c.textSecondary, font: { size: 12 }, padding: 8 } },
            y: { grid: { color: c.border + "66" }, border: { color: c.border }, ticks: { color: c.textSecondary, font: { size: 11 }, padding: 10, callback: (v) => "AED " + Number(v).toLocaleString() }, title: { display: true, text: "Price per Sq Ft (AED)", color: c.textSecondary, font: { size: 11 }, padding: { bottom: 8 } } },
          },
        },
      });
    },
    [destroyChart]
  );

  // ─── Data loader ────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const isDHE = community === "Dubai Hills Estate";

    setChartTitle(`Micro-Catalyst Event Study — ${community}`);
    setChartSub("Price index vs. Dubai baseline · Q1 2019–Q1 2026 · Off-plan excluded");
    setAnchorBadge("Fetching live data…");
    setHasIndexChart(false);

    setPsmLoading(true); setPsmErr(null); setPsm(null);
    setProjLoading(true); setProjErr(null); setProjects(null);
    setAmenLoading(true); setAmenErr(null); setAmenities(null);
    setStats((s) => ({ ...s, topPsf: "—", segCount: "—", projCount: "—", avgYoy: "—" }));

    // 1. Index chart data (community_price_index + community_catalyst_events) + PSM in parallel
    const indexP = sbGet("community_price_index", {
      select: "quarter_num,quarter_label,community_idx,dubai_idx",
      master_community: `eq.${community}`,
      order: "quarter_num",
    }).catch(() => [] as IndexRow[]);

    const catalystP = sbGet("community_catalyst_events", {
      select: "amenity_name,amenity_category,quarter_num,label_short,icon",
      master_community: `eq.${community}`,
      order: "quarter_num",
    }).catch(() => [] as CatalystRow[]);

    const psmP = sbGet("xray_psm_benchmarks", {
      select: "property_segment,psm_avg,psm_low,psm_high,yoy_price_change_pct,maturity_stage,data_period",
      master_community: `eq.${community}`,
      order: "psm_avg.desc",
    });

    Promise.all([indexP, catalystP, psmP])
      .then(([indexData, catalysts, psmData]: [IndexRow[], CatalystRow[], PsmRow[]]) => {
        if (cancelled) return;

        // PSM panel
        setPsm(psmData);
        setPsmLoading(false);

        if (psmData.length) {
          const top = psmData[0];
          const avgYoy = (psmData.reduce((a, d) => a + Number(d.yoy_price_change_pct), 0) / psmData.length).toFixed(1);
          setStats((s) => ({
            ...s,
            topPsf: Number(top.psm_avg).toLocaleString(),
            topLbl: (SEG_LBL[top.property_segment] || top.property_segment) + " PSF",
            topYoy: `+${top.yoy_price_change_pct}% YoY`,
            segCount: String(psmData.length),
            maturity: top.maturity_stage || "—",
            avgYoy: `+${avgYoy}%`,
            period: top.data_period || "Q4 2025",
          }));
          setAnchorBadge(`Top: ${Number(top.psm_avg).toLocaleString()} PSF · ${psmData.length} segments · ${top.data_period || "Q4 2025"}`);
        }

        // Chart: prefer index chart, fall back to PSF bar chart
        if (indexData.length > 0) {
          renderIndexChart(indexData, catalysts, community, colors);
          setHasIndexChart(true);
          setChartTitle(`Micro-Catalyst Event Study — ${community}`);
          setChartSub(`Price index vs. Dubai baseline · Q1 2019–Q1 2026 · ${catalysts.length} catalyst${catalysts.length !== 1 ? "s" : ""} tracked`);
        } else {
          renderPSFChart(psmData, colors);
          setHasIndexChart(false);
          setChartTitle(`PSF Benchmark — ${community}`);
          setChartSub("Price per sq ft by segment · Source: xray_psm_benchmarks");
        }
      })
      .catch((e: Error) => {
        if (!cancelled) { setPsmErr(e.message); setPsmLoading(false); }
      });

    // 2. Projects / Unit Prices
    if (isDHE) {
      setProjTitle("Delivered Unit Prices");
      setProjBadge("dhe_buildings");
      Promise.all([
        sbGet("dhe_buildings", { select: "id,name,handover", status: "eq.truth", order: "handover" }),
        sbGet("dhe_units", { select: "building_id,bed,avg_sale_price" }),
      ])
        .then(([blds, units]: [BuildingRow[], UnitRow[]]) => {
          if (cancelled) return;
          const byBld: Record<string, UnitRow[]> = {};
          units.forEach((u) => { (byBld[u.building_id] = byBld[u.building_id] || []).push(u); });

          setStats((s) => ({ ...s, projCount: String(blds.length), projLbl: "Buildings (delivered)", amenCount: units.length + " unit types tracked" }));
          setProjects(
            blds.map((b) => {
              const bu = (byBld[b.id] || []).sort((a, z) => a.bed.localeCompare(z.bed));
              return {
                name: `${b.name} ${b.handover ? b.handover.slice(0, 4) : ""}`,
                chips: bu.map((u) => ({ label: `${u.bed} ${fmtAED(u.avg_sale_price)}`, hi: false })),
              };
            })
          );
          setProjLoading(false);
        })
        .catch((e: Error) => { if (!cancelled) { setProjErr(e.message); setProjLoading(false); } });
    } else {
      setProjTitle("Projects & Pricing");
      setProjBadge("xray_projects");
      sbGet("xray_projects", {
        select: "id,project_name,building_type,project_category,avg_price_per_sqft,price_range_aed_min,price_range_aed_max,project_status",
        master_community: `eq.${community}`,
        order: "avg_price_per_sqft.desc.nullslast",
        limit: "10",
      })
        .then((projs: ProjectRow[]) => {
          if (cancelled) return;
          setStats((s) => ({
            ...s,
            projCount: String(projs.length),
            projLbl: "Projects tracked",
            amenCount: projs.filter((p) => p.project_status === "ready").length + " ready-to-move",
          }));
          setProjects(
            projs.map((p) => {
              const chips: Array<{ label: string; hi?: boolean }> = [];
              if (p.avg_price_per_sqft) chips.push({ label: Number(p.avg_price_per_sqft).toLocaleString() + " PSF", hi: true });
              if (p.price_range_aed_min) chips.push({ label: "from " + fmtAED(p.price_range_aed_min) });
              if (p.building_type) chips.push({ label: p.building_type.replace("_", " ") });
              return { name: `${PROJ_STATUS[p.project_status] || "🏢"} ${p.project_name}`, chips };
            })
          );
          setProjLoading(false);
        })
        .catch((e: Error) => { if (!cancelled) { setProjErr(e.message); setProjLoading(false); } });
    }

    // 3. Amenities
    sbGet("xray_community_amenities", {
      select: "amenity_name,amenity_category,lifecycle_stage,actual_completion_date,expected_completion_date",
      master_community: `eq.${community}`,
      lifecycle_stage: "eq.operational",
      order: "actual_completion_date.desc.nullslast",
      limit: "10",
    })
      .then((data: AmenityRow[]) => {
        if (cancelled) return;
        if (data.length) { setAmenities(data); setAmenLoading(false); return; }
        // Fallback: all lifecycle stages
        return sbGet("xray_community_amenities", {
          select: "amenity_name,amenity_category,lifecycle_stage,actual_completion_date,expected_completion_date",
          master_community: `eq.${community}`,
          order: "expected_completion_date.asc.nullslast",
          limit: "10",
        }).then((data2: AmenityRow[]) => { if (!cancelled) { setAmenities(data2); setAmenLoading(false); } });
      })
      .catch((e: Error) => { if (!cancelled) { setAmenErr(e.message); setAmenLoading(false); } });

    return () => { cancelled = true; };
  }, [community, colors, renderIndexChart, renderPSFChart]);

  // ─── Styles (theme-based) ─────────────────────────
  const mono = "'DM Mono','Fira Code',monospace";
  const sans = "'DM Sans',sans-serif";
  const syne = "'Syne','DM Sans',sans-serif";

  const statCard: React.CSSProperties = {
    background: colors.surface, border: `1px solid ${colors.border}`,
    borderRadius: 10, padding: "12px 14px",
  };
  const panel: React.CSSProperties = {
    background: colors.surface, border: `1px solid ${colors.border}`,
    borderRadius: 12, padding: 14,
  };
  const chip: React.CSSProperties = {
    fontFamily: mono, fontSize: 9, padding: "3px 6px",
    borderRadius: 4, background: colors.cardBg, border: `1px solid ${colors.border}`,
    color: colors.textSecondary, whiteSpace: "nowrap",
  };
  const chipHi: React.CSSProperties = {
    ...chip, borderColor: colors.green + "4D", color: colors.green,
  };

  return (
    <div style={{ height: "100%", overflowY: "auto", background: colors.bg, color: colors.text, fontFamily: sans, padding: "20px 16px 48px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');
        @keyframes amenity-spin{to{transform:rotate(360deg)}}
        @keyframes amenity-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.75)}}
      `}</style>

      <div style={{ maxWidth: 1160, margin: "0 auto" }}>
        {/* ═══ HEADER ═══ */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontFamily: syne, fontSize: 17, fontWeight: 800, color: colors.text, letterSpacing: -0.3 }}>Dubai Price Intelligence</h1>
            <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 3, fontFamily: mono }}>
              Live PSF benchmarks · Micro-catalyst events · Unit pricing · {TOTAL_COMMUNITIES} communities
            </div>
          </div>
          <div
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: colors.greenBg, border: `1px solid ${colors.green}40`,
              borderRadius: 6, padding: "5px 10px", fontSize: 10,
              fontFamily: mono, color: colors.green, whiteSpace: "nowrap",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: colors.green, animation: "amenity-pulse 2s infinite", display: "inline-block" }} />
            LIVE · SUPABASE REST
          </div>
        </div>

        {/* ═══ COMMUNITY SELECTOR ═══ */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
          <div style={{ fontFamily: mono, fontSize: 11, color: colors.textSecondary, whiteSpace: "nowrap" }}>COMMUNITY</div>
          <div style={{ position: "relative", flex: 1, minWidth: 240, maxWidth: 440 }}>
            <select
              value={community}
              onChange={(e) => setCommunity(e.target.value)}
              style={{
                width: "100%", appearance: "none", WebkitAppearance: "none",
                background: colors.surface, border: `1px solid ${colors.gold}`,
                borderRadius: 8, color: colors.text, fontFamily: syne,
                fontSize: 13, fontWeight: 700, padding: "10px 36px 10px 14px",
                cursor: "pointer", outline: "none",
              }}
            >
              {COMMUNITY_GROUPS.map((g) => (
                <optgroup key={g.label} label={`── ${g.label} ──`}>
                  {g.items.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <span style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", color: colors.gold, fontSize: 12, pointerEvents: "none" }}>▾</span>
          </div>
          <div style={{ fontFamily: mono, fontSize: 10, color: colors.textSecondary, whiteSpace: "nowrap" }}>
            <span style={{ color: colors.gold, fontWeight: 700 }}>{TOTAL_COMMUNITIES}</span> communities available
          </div>
        </div>

        {/* ═══ STATS ROW ═══ */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
          <div style={statCard}>
            <div style={{ fontFamily: mono, fontSize: 22, fontWeight: 500, color: colors.text, lineHeight: 1 }}>{stats.topPsf}</div>
            <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 5 }}>{stats.topLbl}</div>
            <div style={{ fontFamily: mono, fontSize: 10, color: colors.green, marginTop: 2 }}>{stats.topYoy}</div>
          </div>
          <div style={statCard}>
            <div style={{ fontFamily: mono, fontSize: 22, fontWeight: 500, color: colors.text, lineHeight: 1 }}>{stats.segCount}</div>
            <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 5 }}>Segments tracked</div>
            <div style={{ fontFamily: mono, fontSize: 10, color: colors.green, marginTop: 2 }}>{stats.maturity}</div>
          </div>
          <div style={statCard}>
            <div style={{ fontFamily: mono, fontSize: 22, fontWeight: 500, color: colors.text, lineHeight: 1 }}>{stats.projCount}</div>
            <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 5 }}>{stats.projLbl}</div>
            <div style={{ fontFamily: mono, fontSize: 10, color: colors.green, marginTop: 2 }}>{stats.amenCount}</div>
          </div>
          <div style={statCard}>
            <div style={{ fontFamily: mono, fontSize: 22, fontWeight: 500, color: colors.text, lineHeight: 1 }}>{stats.avgYoy}</div>
            <div style={{ fontSize: 10, color: colors.textSecondary, marginTop: 5 }}>Avg YoY change</div>
            <div style={{ fontFamily: mono, fontSize: 10, color: colors.green, marginTop: 2 }}>{stats.period}</div>
          </div>
        </div>

        {/* ═══ CHART ═══ */}
        <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16, alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: syne, fontSize: 14, fontWeight: 700, color: colors.text }}>{chartTitle}</div>
              <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 3, fontFamily: mono }}>{chartSub}</div>
            </div>
            <div style={{ fontFamily: mono, fontSize: 10, color: colors.gold, background: colors.goldBg, padding: "4px 9px", borderRadius: 5, border: `1px solid ${colors.gold}33`, whiteSpace: "nowrap", flexShrink: 0 }}>
              {anchorBadge}
            </div>
          </div>
          <div style={{ height: 460 }}>
            <canvas ref={chartRef} style={{ display: "block", width: "100%", height: "100%" }} />
          </div>
          {/* Legend — shown for index charts */}
          {hasIndexChart && (
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 14, justifyContent: "center", paddingTop: 12, borderTop: `1px solid ${colors.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: colors.textSecondary, fontFamily: mono }}>
                <div style={{ width: 22, height: 3, borderRadius: 2, background: colors.green, flexShrink: 0 }} />{community} Resale
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: colors.textSecondary, fontFamily: mono }}>
                <div style={{ width: 22, height: 3, borderRadius: 2, background: colors.red, flexShrink: 0 }} />Dubai Baseline
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: colors.textSecondary, fontFamily: mono }}>
                <div style={{ width: 22, height: 3, borderRadius: 2, background: colors.gold, opacity: 0.7, flexShrink: 0 }} />Alpha
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: colors.textSecondary, fontFamily: mono }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", border: `1.5px solid ${colors.text}`, background: colors.gold, flexShrink: 0 }} />Catalyst
              </div>
            </div>
          )}
        </div>

        {/* ═══ 3-PANEL GRID ═══ */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {/* PSF Benchmarks */}
          <div style={panel}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
              <div style={{ fontFamily: syne, fontSize: 11, fontWeight: 700, color: colors.text, textTransform: "uppercase", letterSpacing: 0.8 }}>PSF Benchmarks</div>
              <div style={{ fontFamily: mono, fontSize: 9, color: colors.green, background: colors.greenBg, padding: "2px 7px", borderRadius: 4, border: `1px solid ${colors.green}33`, whiteSpace: "nowrap" }}>xray_psm_benchmarks</div>
            </div>
            {psmLoading ? <Spinner colors={colors} /> : psmErr ? (
              <div style={{ fontSize: 11, color: colors.red, fontFamily: mono, padding: "8px 0", lineHeight: 1.6 }}>PSF load failed: {psmErr}</div>
            ) : !psm?.length ? (
              <div style={{ fontSize: 11, color: colors.textSecondary, fontFamily: mono, padding: "10px 0", fontStyle: "italic" }}>No PSF data for this community</div>
            ) : (
              psm.map((d, i) => (
                <div key={d.property_segment} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < psm.length - 1 ? `1px solid ${colors.border}` : "none" }}>
                  <div>
                    <div style={{ fontSize: 11, color: colors.textSecondary }}>{SEG_LBL[d.property_segment] || d.property_segment}</div>
                    <div style={{ fontFamily: mono, fontSize: 9, color: colors.textSecondary, marginTop: 2 }}>{Number(d.psm_low).toLocaleString()} – {Number(d.psm_high).toLocaleString()} PSF</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: mono, fontSize: 14, fontWeight: 500, color: SEG_COLOR[i % SEG_COLOR.length] }}>{Number(d.psm_avg).toLocaleString()}</div>
                    <div style={{ fontFamily: mono, fontSize: 10, color: colors.green }}>+{d.yoy_price_change_pct}%</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Projects & Pricing */}
          <div style={panel}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
              <div style={{ fontFamily: syne, fontSize: 11, fontWeight: 700, color: colors.text, textTransform: "uppercase", letterSpacing: 0.8 }}>{projTitle}</div>
              <div style={{ fontFamily: mono, fontSize: 9, color: colors.green, background: colors.greenBg, padding: "2px 7px", borderRadius: 4, border: `1px solid ${colors.green}33`, whiteSpace: "nowrap" }}>{projBadge}</div>
            </div>
            {projLoading ? <Spinner colors={colors} /> : projErr ? (
              <div style={{ fontSize: 11, color: colors.red, fontFamily: mono, padding: "8px 0", lineHeight: 1.6 }}>Projects load failed: {projErr}</div>
            ) : !projects?.length ? (
              <div style={{ fontSize: 11, color: colors.textSecondary, fontFamily: mono, padding: "10px 0", fontStyle: "italic" }}>No project data for this community</div>
            ) : (
              projects.map((p, i) => (
                <div key={i} style={{ padding: "8px 0", borderBottom: i < projects.length - 1 ? `1px solid ${colors.border}` : "none" }}>
                  <div style={{ fontSize: 11, color: colors.text, fontWeight: 500, marginBottom: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={p.name}>{p.name}</div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {p.chips.map((c, j) => (
                      <span key={j} style={c.hi ? chipHi : chip}>{c.hi ? <b style={{ fontWeight: 500 }}>{c.label}</b> : c.label}</span>
                    ))}
                    {!p.chips.length && <span style={{ color: colors.textSecondary, fontSize: 9 }}>—</span>}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Amenities & Catalysts */}
          <div style={panel}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
              <div style={{ fontFamily: syne, fontSize: 11, fontWeight: 700, color: colors.text, textTransform: "uppercase", letterSpacing: 0.8 }}>Amenities & Catalysts</div>
              <div style={{ fontFamily: mono, fontSize: 9, color: colors.green, background: colors.greenBg, padding: "2px 7px", borderRadius: 4, border: `1px solid ${colors.green}33`, whiteSpace: "nowrap" }}>xray_community_amenities</div>
            </div>
            {amenLoading ? <Spinner colors={colors} /> : amenErr ? (
              <div style={{ fontSize: 11, color: colors.red, fontFamily: mono, padding: "8px 0", lineHeight: 1.6 }}>Amenities load failed: {amenErr}</div>
            ) : !amenities?.length ? (
              <div style={{ fontSize: 11, color: colors.textSecondary, fontFamily: mono, padding: "10px 0", fontStyle: "italic" }}>No amenity data for this community</div>
            ) : (
              amenities.map((d, i) => {
                const dt = d.actual_completion_date || d.expected_completion_date;
                const dtStr = dt ? new Date(dt).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "—";
                return (
                  <div key={i} style={{ display: "flex", gap: 9, padding: "8px 0", borderBottom: i < amenities.length - 1 ? `1px solid ${colors.border}` : "none" }}>
                    <div style={{ fontSize: 15, flexShrink: 0, lineHeight: 1.3 }}>{CAT_ICON[d.amenity_category] || "📍"}</div>
                    <div>
                      <div style={{ fontSize: 11, color: colors.text, fontWeight: 500, lineHeight: 1.4, marginBottom: 2 }}>
                        {d.amenity_name}
                        {d.lifecycle_stage === "operational" && <span style={{ fontFamily: mono, fontSize: 9, color: colors.green, marginLeft: 4 }}>✓ live</span>}
                        {d.lifecycle_stage === "under_construction" && <span style={{ fontFamily: mono, fontSize: 9, color: colors.gold, marginLeft: 4 }}>🏗 u/c</span>}
                        {d.lifecycle_stage === "planned" && <span style={{ fontFamily: mono, fontSize: 9, color: colors.textSecondary, marginLeft: 4 }}>📋 planned</span>}
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontFamily: mono, fontSize: 9, color: colors.gold }}>{dtStr}</span>
                        <span style={{ fontFamily: mono, fontSize: 9, color: colors.textSecondary, textTransform: "uppercase" }}>{d.amenity_category || ""}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
