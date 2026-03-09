import { useState, useMemo, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════
// DUBAI HILLS ESTATE — YIELD INTELLIGENCE v3.0
// Supabase live data layer + SC community toggles by masterplan type
// ═══════════════════════════════════════════════════════════════════

// ─── SUPABASE CONFIG ───
const DEFAULT_SUPABASE_URL = "";
const DEFAULT_SUPABASE_KEY = "";

// ─── TYPES ───
interface UnitData {
  bed: string;
  sqft: number;
  avgSalePrice: number;
  avgRent: number;
  serviceChargePSF: number;
}

interface BuildingData {
  id: number;
  name: string;
  type: string;
  status: string;
  handover: string;
  developer: string;
  constructionPct: number;
  source: string;
  comp: string | null;
  units: UnitData[];
}

// ─── FALLBACK STATIC DATA ───
const STATIC_BUILDINGS: BuildingData[] = [
  { id: 1, name: "Park Heights 1", type: "Apartment", status: "truth", handover: "2019", developer: "Emaar", constructionPct: 100, source: "PF/Bayut listings Feb 2026 + RERA SC Index", comp: null,
    units: [{ bed: "1BR", sqft: 750, avgSalePrice: 1650000, avgRent: 90000, serviceChargePSF: 18.5 }, { bed: "2BR", sqft: 1100, avgSalePrice: 2480000, avgRent: 115000, serviceChargePSF: 18.5 }, { bed: "3BR", sqft: 1500, avgSalePrice: 3700000, avgRent: 170000, serviceChargePSF: 18.5 }] },
  { id: 2, name: "Park Heights 2", type: "Apartment", status: "truth", handover: "2020", developer: "Emaar", constructionPct: 100, source: "PF/Bayut listings + Driven Properties report", comp: null,
    units: [{ bed: "1BR", sqft: 730, avgSalePrice: 1550000, avgRent: 85000, serviceChargePSF: 17.8 }, { bed: "2BR", sqft: 1050, avgSalePrice: 2350000, avgRent: 120000, serviceChargePSF: 17.8 }, { bed: "3BR", sqft: 1500, avgSalePrice: 3500000, avgRent: 165000, serviceChargePSF: 17.8 }] },
  { id: 3, name: "Mulberry 1 & 2", type: "Apartment", status: "truth", handover: "2019", developer: "Emaar", constructionPct: 100, source: "PF: 2BR 1307sqft AED 3.55M", comp: null,
    units: [{ bed: "1BR", sqft: 800, avgSalePrice: 1800000, avgRent: 95000, serviceChargePSF: 16.2 }, { bed: "2BR", sqft: 1300, avgSalePrice: 2900000, avgRent: 140000, serviceChargePSF: 16.2 }, { bed: "3BR", sqft: 1950, avgSalePrice: 5200000, avgRent: 220000, serviceChargePSF: 16.2 }] },
  { id: 4, name: "Golfville", type: "Apartment", status: "truth", handover: "2022", developer: "Emaar", constructionPct: 100, source: "PF: 2BR 768sqft AED 155K/yr rent; golf-facing premium", comp: null,
    units: [{ bed: "1BR", sqft: 750, avgSalePrice: 1750000, avgRent: 100000, serviceChargePSF: 20.5 }, { bed: "2BR", sqft: 770, avgSalePrice: 2200000, avgRent: 155000, serviceChargePSF: 20.5 }, { bed: "3BR", sqft: 1600, avgSalePrice: 3850000, avgRent: 200000, serviceChargePSF: 20.5 }] },
  { id: 5, name: "Collective / 2.0", type: "Apartment", status: "truth", handover: "2021/2023", developer: "Emaar", constructionPct: 100, source: "Bayut avg AED 105K/yr", comp: null,
    units: [{ bed: "Studio", sqft: 420, avgSalePrice: 780000, avgRent: 55000, serviceChargePSF: 19.0 }, { bed: "1BR", sqft: 650, avgSalePrice: 1300000, avgRent: 80000, serviceChargePSF: 19.0 }, { bed: "2BR", sqft: 730, avgSalePrice: 1850000, avgRent: 115000, serviceChargePSF: 19.0 }] },
  { id: 6, name: "Acacia (Park Heights)", type: "Apartment", status: "truth", handover: "2020", developer: "Emaar", constructionPct: 100, source: "PF: Acacia A 2BR 1046sqft AED 1.8M", comp: null,
    units: [{ bed: "1BR", sqft: 720, avgSalePrice: 1400000, avgRent: 82000, serviceChargePSF: 17.0 }, { bed: "2BR", sqft: 1050, avgSalePrice: 1800000, avgRent: 110000, serviceChargePSF: 17.0 }, { bed: "3BR", sqft: 1500, avgSalePrice: 3200000, avgRent: 155000, serviceChargePSF: 17.0 }] },
  { id: 7, name: "Executive Residences", type: "Apartment", status: "truth", handover: "2020", developer: "Emaar", constructionPct: 100, source: "PF: 2BR 995sqft AED 140K/yr; premium mall-adjacent", comp: null,
    units: [{ bed: "1BR", sqft: 750, avgSalePrice: 1600000, avgRent: 88000, serviceChargePSF: 18.0 }, { bed: "2BR", sqft: 1000, avgSalePrice: 2500000, avgRent: 140000, serviceChargePSF: 18.0 }, { bed: "3BR", sqft: 1500, avgSalePrice: 4100000, avgRent: 195000, serviceChargePSF: 18.0 }] },
  { id: 8, name: "Sidra / Maple Villas", type: "Villa", status: "truth", handover: "2018-2020", developer: "Emaar", constructionPct: 100, source: "Driven: Sidra 4BR AED 7.9M→11M; villa yield 5.1%", comp: null,
    units: [{ bed: "3BR", sqft: 2800, avgSalePrice: 5200000, avgRent: 230000, serviceChargePSF: 3.5 }, { bed: "4BR", sqft: 3500, avgSalePrice: 7900000, avgRent: 300000, serviceChargePSF: 3.5 }, { bed: "5BR", sqft: 4500, avgSalePrice: 10500000, avgRent: 400000, serviceChargePSF: 3.5 }] },
  { id: 9, name: "Elvira", type: "Apartment", status: "predicted", handover: "Q4 2026", developer: "Emaar", constructionPct: 68, source: "PF: 68% complete; launch from AED 1.29M; 892 units", comp: "Park Heights 2 (same developer, similar unit mix, mid-rise towers)",
    units: [{ bed: "1BR", sqft: 693, avgSalePrice: 1450000, avgRent: 80000, serviceChargePSF: 18.0 }, { bed: "2BR", sqft: 950, avgSalePrice: 2200000, avgRent: 110000, serviceChargePSF: 18.0 }, { bed: "3BR", sqft: 1500, avgSalePrice: 3800000, avgRent: 165000, serviceChargePSF: 18.0 }] },
  { id: 10, name: "Lime Gardens", type: "Apartment", status: "predicted", handover: "Q1 2026", developer: "Emaar", constructionPct: 90, source: "Bayut: from AED 1.12M; park-adjacent; 80/20 plan", comp: "Acacia (same park-facing position)",
    units: [{ bed: "1BR", sqft: 720, avgSalePrice: 1350000, avgRent: 78000, serviceChargePSF: 17.5 }, { bed: "2BR", sqft: 1050, avgSalePrice: 1900000, avgRent: 108000, serviceChargePSF: 17.5 }, { bed: "3BR", sqft: 1450, avgSalePrice: 3100000, avgRent: 150000, serviceChargePSF: 17.5 }] },
  { id: 11, name: "Hills Park (399)", type: "Apartment", status: "predicted", handover: "Q2 2026", developer: "National Properties", constructionPct: 85, source: "Bayut: from AED 1.21M; near Dubai Hills Mall", comp: "Collective 2.0 (similar unit sizes, DHE location)",
    units: [{ bed: "Studio", sqft: 430, avgSalePrice: 820000, avgRent: 52000, serviceChargePSF: 19.5 }, { bed: "1BR", sqft: 680, avgSalePrice: 1250000, avgRent: 75000, serviceChargePSF: 19.5 }, { bed: "2BR", sqft: 950, avgSalePrice: 1900000, avgRent: 105000, serviceChargePSF: 19.5 }] },
  { id: 12, name: "Greenside Residence", type: "Apartment", status: "predicted", handover: "Q3 2027", developer: "Emaar", constructionPct: 61, source: "PF: 61% complete; from AED 1.48M; golf-course facing", comp: "Golfville (both golf-facing Emaar)",
    units: [{ bed: "1BR", sqft: 750, avgSalePrice: 1650000, avgRent: 95000, serviceChargePSF: 20.0 }, { bed: "2BR", sqft: 1050, avgSalePrice: 2400000, avgRent: 135000, serviceChargePSF: 20.0 }, { bed: "3BR", sqft: 1500, avgSalePrice: 3700000, avgRent: 185000, serviceChargePSF: 20.0 }] },
  { id: 13, name: "Soho The Berkeley", type: "Apartment", status: "predicted", handover: "Q4 2026", developer: "Soho Development", constructionPct: 70, source: "Bayut: from AED 1M; 116 units; near Dubai Hills Park", comp: "Collective (similar price point, compact units)",
    units: [{ bed: "Studio", sqft: 400, avgSalePrice: 750000, avgRent: 48000, serviceChargePSF: 20.0 }, { bed: "1BR", sqft: 650, avgSalePrice: 1200000, avgRent: 72000, serviceChargePSF: 20.0 }, { bed: "2BR", sqft: 900, avgSalePrice: 1750000, avgRent: 100000, serviceChargePSF: 20.0 }] },
  { id: 14, name: "Park Gate Villas", type: "Villa", status: "predicted", handover: "2027", developer: "Emaar", constructionPct: 45, source: "Provident: final Emaar villa phase; golf course backdrop", comp: "Sidra/Maple (same developer, same community)",
    units: [{ bed: "4BR", sqft: 3500, avgSalePrice: 8500000, avgRent: 310000, serviceChargePSF: 3.8 }, { bed: "5BR", sqft: 5000, avgSalePrice: 12000000, avgRent: 420000, serviceChargePSF: 3.8 }] },
];

// ─── COST CONSTANTS ───
const DLD_FEE = 0.04;
const AGENCY_FEE = 0.02;
const TRUSTEE = 4200;
const INSURANCE = 2400;
const MAINT_PCT = 0.01;
const VACANCY_WK = 3;

// ─── YIELD CALC ───
function calc(u: UnitData, bldg: BuildingData, scEnabled = true) {
  const sc = scEnabled ? u.serviceChargePSF * u.sqft : 0;
  const gross = (u.avgRent / u.avgSalePrice) * 100;
  const netSC = ((u.avgRent - sc) / u.avgSalePrice) * 100;
  const maint = u.avgSalePrice * MAINT_PCT;
  const vac = (u.avgRent / 52) * VACANCY_WK;
  const totalCost = sc + INSURANCE + maint + vac;
  const netIncome = u.avgRent - totalCost;
  const real = (netIncome / u.avgSalePrice) * 100;
  const acq = u.avgSalePrice * (1 + DLD_FEE + AGENCY_FEE) + TRUSTEE;
  const trueY = (netIncome / acq) * 100;
  const rawSC = u.serviceChargePSF * u.sqft;
  const scPct = (rawSC / u.avgRent) * 100;
  return {
    building: bldg.name, bed: u.bed, type: bldg.type, status: bldg.status,
    sqft: u.sqft, price: u.avgSalePrice, rent: u.avgRent,
    sc, rawSC, scPct, scEnabled,
    gross, netSC, real, trueY,
    totalCost, netIncome, acq, maint, vac,
    comp: bldg.comp, handover: bldg.handover, constructionPct: bldg.constructionPct,
    source: bldg.source, buildingId: bldg.id,
  };
}

const fmt = (n: number) => Math.round(n).toLocaleString("en-AE");
const fmtM = (n: number) => (n / 1e6).toFixed(2) + "M";
const fmtK = (n: number) => Math.round(n / 1000) + "K";

// ─── TOGGLE SWITCH ───
function Toggle({ on, onChange, color = "#22c55e" }: { on: boolean; onChange: () => void; color?: string }) {
  return (
    <div onClick={onChange} style={{ cursor: "pointer", width: 36, height: 20, borderRadius: 10, background: on ? color + "44" : "#1a1a1e", border: `1px solid ${on ? color + "66" : "#2a2a2e"}`, position: "relative", flexShrink: 0, transition: "all 0.2s" }}>
      <div style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 14, height: 14, borderRadius: 7, background: on ? color : "#444", transition: "all 0.2s" }} />
    </div>
  );
}

// ─── MAIN COMPONENT ───
export function YieldIntelligencePage() {
  const [buildings, setBuildings] = useState<BuildingData[]>(STATIC_BUILDINGS);
  const [dataSource, setDataSource] = useState<"static" | "supabase" | "loading" | "error">("static");
  const [sbUrl, setSbUrl] = useState(DEFAULT_SUPABASE_URL);
  const [sbKey, setSbKey] = useState(DEFAULT_SUPABASE_KEY);
  const [showSettings, setShowSettings] = useState(false);
  const [showSCPanel, setShowSCPanel] = useState(false);
  const [sbError, setSbError] = useState("");

  // SC toggles: buildingId → boolean (true = SC included)
  const [scToggles, setScToggles] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(STATIC_BUILDINGS.map(b => [b.id, true]))
  );

  const [selBldg, setSelBldg] = useState(0);
  const [selUnit, setSelUnit] = useState(0);
  const [tab, setTab] = useState("yields");
  const [filter, setFilter] = useState("all");

  // ─── SUPABASE FETCH ───
  const fetchFromSupabase = useCallback(async (url: string, key: string) => {
    if (!url || !key) return;
    setDataSource("loading");
    setSbError("");
    try {
      const bRes = await fetch(`${url}/rest/v1/dhe_buildings?select=*`, {
        headers: { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type": "application/json" }
      });
      if (!bRes.ok) throw new Error(`Buildings fetch failed: ${bRes.status} ${bRes.statusText}`);
      const bData = await bRes.json();

      const uRes = await fetch(`${url}/rest/v1/dhe_units?select=*`, {
        headers: { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type": "application/json" }
      });
      if (!uRes.ok) throw new Error(`Units fetch failed: ${uRes.status} ${uRes.statusText}`);
      const uData = await uRes.json();

      // Join units into buildings
      const merged: BuildingData[] = bData.map((b: Record<string, unknown>) => ({
        ...b,
        constructionPct: b.construction_pct as number,
        units: uData
          .filter((u: Record<string, unknown>) => u.building_id === b.id)
          .map((u: Record<string, unknown>) => ({
            bed: u.bed as string,
            sqft: u.sqft as number,
            avgSalePrice: u.avg_sale_price as number,
            avgRent: u.avg_rent as number,
            serviceChargePSF: u.service_charge_psf as number,
          }))
      }));

      if (merged.length === 0) throw new Error("No buildings found in Supabase. Check table name: dhe_buildings");
      setBuildings(merged);
      setScToggles(Object.fromEntries(merged.map(b => [b.id, true])));
      setSelBldg(0);
      setSelUnit(0);
      setDataSource("supabase");
    } catch (err: unknown) {
      setSbError(err instanceof Error ? err.message : String(err));
      setDataSource("error");
      setBuildings(STATIC_BUILDINGS);
    }
  }, []);

  // ─── DERIVED DATA ───
  const bldg = buildings[selBldg] || buildings[0];
  const unit = bldg?.units?.[selUnit] || bldg?.units?.[0];
  const scOn = scToggles[bldg?.id] !== false;
  const y = unit && bldg ? calc(unit, bldg, scOn) : null;

  const allRows = useMemo(() => {
    const rows: ReturnType<typeof calc>[] = [];
    buildings.forEach(b => b.units?.forEach(u => rows.push(calc(u, b, scToggles[b.id] !== false))));
    rows.sort((a, b) => b.trueY - a.trueY);
    return rows;
  }, [buildings, scToggles]);

  const filteredRows = filter === "all" ? allRows : allRows.filter(r => r.status === filter);

  // ─── SC PANEL STATS ───
  const aptBuildings = buildings.filter(b => b.type === "Apartment");
  const villaBuildings = buildings.filter(b => b.type === "Villa");
  const aptOnCount = aptBuildings.filter(b => scToggles[b.id] !== false).length;
  const villaOnCount = villaBuildings.filter(b => scToggles[b.id] !== false).length;

  const toggleAll = (type: string, val: boolean) => {
    setScToggles(prev => {
      const next = { ...prev };
      buildings.filter(b => b.type === type).forEach(b => { next[b.id] = val; });
      return next;
    });
  };

  const truthCount = buildings.filter(b => b.status === "truth").length;
  const predCount = buildings.filter(b => b.status === "predicted").length;

  if (!bldg || !unit || !y) return <div style={{ color: "#555", padding: 40, textAlign: "center" }}>Loading data...</div>;

  return (
    <div style={{ height: "calc(100vh - 56px)", overflow: "auto", background: "#060608", color: "#e0e0e0", fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", position: "relative" }}>

      {/* ─── HEADER ─── */}
      <div style={{ padding: "12px 20px", borderBottom: "1px solid #141418", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#c9a84c" }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "2.5px", color: "#c9a84c" }}>ZEROAGENT</span>
          <span style={{ fontSize: 10, color: "#444", letterSpacing: "1px" }}>YIELD INTELLIGENCE v3</span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{ fontSize: 9, padding: "3px 8px", borderRadius: 3, fontWeight: 700, letterSpacing: "0.8px",
            background: dataSource === "supabase" ? "#3b82f615" : dataSource === "loading" ? "#c9a84c15" : dataSource === "error" ? "#ef444415" : "#55555515",
            color: dataSource === "supabase" ? "#3b82f6" : dataSource === "loading" ? "#c9a84c" : dataSource === "error" ? "#ef4444" : "#555"
          }}>
            {dataSource === "supabase" ? "SUPABASE LIVE" : dataSource === "loading" ? "CONNECTING..." : dataSource === "error" ? "SB ERROR" : "STATIC DATA"}
          </div>
          <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 3, background: "#22c55e15", color: "#22c55e", fontWeight: 700, letterSpacing: "0.8px" }}>{truthCount} VERIFIED</span>
          <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 3, background: "#f59e0b15", color: "#f59e0b", fontWeight: 700, letterSpacing: "0.8px" }}>{predCount} PREDICTED</span>
          <div onClick={() => setShowSCPanel(true)} style={{ cursor: "pointer", fontSize: 9, padding: "3px 10px", borderRadius: 3, background: "#c9a84c12", color: "#c9a84c", fontWeight: 700, letterSpacing: "0.8px", border: "1px solid #c9a84c22", display: "flex", alignItems: "center", gap: 5 }}>
            SC CHARGES
            <span style={{ background: "#c9a84c22", borderRadius: 2, padding: "1px 5px" }}>{aptOnCount}/{aptBuildings.length} APT · {villaOnCount}/{villaBuildings.length} VIL</span>
          </div>
          <div onClick={() => setShowSettings(!showSettings)} style={{ cursor: "pointer", fontSize: 9, padding: "3px 8px", borderRadius: 3, background: "#1a1a1e", color: "#555", fontWeight: 700, border: "1px solid #222" }}>
            DB
          </div>
        </div>
      </div>

      {/* ─── SUPABASE SETTINGS PANEL ─── */}
      {showSettings && (
        <div style={{ background: "#0a0a0d", borderBottom: "1px solid #141418", padding: "16px 20px" }}>
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", color: "#c9a84c", marginBottom: 10 }}>SUPABASE CONNECTION</div>
            {sbError && <div style={{ fontSize: 10, color: "#ef4444", marginBottom: 8, padding: "6px 10px", background: "#ef444410", borderRadius: 4, border: "1px solid #ef444422" }}>{sbError}</div>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input value={sbUrl} onChange={e => setSbUrl(e.target.value)} placeholder="https://xxxx.supabase.co"
                style={{ flex: "1 1 260px", padding: "7px 10px", background: "#0c0c10", border: "1px solid #1a1a1e", borderRadius: 4, color: "#e0e0e0", fontSize: 11, outline: "none", fontFamily: "'JetBrains Mono', monospace" }} />
              <input value={sbKey} onChange={e => setSbKey(e.target.value)} type="password" placeholder="anon public key"
                style={{ flex: "1 1 260px", padding: "7px 10px", background: "#0c0c10", border: "1px solid #1a1a1e", borderRadius: 4, color: "#e0e0e0", fontSize: 11, outline: "none", fontFamily: "'JetBrains Mono', monospace" }} />
              <button onClick={() => fetchFromSupabase(sbUrl, sbKey)}
                style={{ padding: "7px 18px", background: "#c9a84c18", border: "1px solid #c9a84c33", borderRadius: 4, color: "#c9a84c", fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: "0.5px" }}>
                CONNECT
              </button>
              <button onClick={() => { setBuildings(STATIC_BUILDINGS); setScToggles(Object.fromEntries(STATIC_BUILDINGS.map(b => [b.id, true]))); setDataSource("static"); setSbError(""); }}
                style={{ padding: "7px 14px", background: "#1a1a1e", border: "1px solid #222", borderRadius: 4, color: "#555", fontSize: 11, cursor: "pointer" }}>
                USE STATIC
              </button>
            </div>
            <div style={{ fontSize: 9, color: "#333", marginTop: 8, lineHeight: 1.6 }}>
              Expects tables: <span style={{ color: "#555", fontFamily: "monospace" }}>dhe_buildings</span> (id, name, type, status, handover, developer, construction_pct, source, comp) + <span style={{ color: "#555", fontFamily: "monospace" }}>dhe_units</span> (id, building_id, bed, sqft, avg_sale_price, avg_rent, service_charge_psf)
            </div>
          </div>
        </div>
      )}

      {/* ─── SC COMMUNITY TOGGLE PANEL (DRAWER) ─── */}
      {showSCPanel && (
        <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 320, background: "#08080b", borderLeft: "1px solid #141418", zIndex: 100, overflow: "auto", boxShadow: "-20px 0 60px #00000088" }}>
          <div style={{ padding: "16px 16px 0", position: "sticky", top: 0, background: "#08080b", borderBottom: "1px solid #141418", paddingBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", color: "#c9a84c" }}>SERVICE CHARGE TOGGLES</div>
                <div style={{ fontSize: 9, color: "#444", marginTop: 2 }}>Toggle SC inclusion per community by masterplan type</div>
              </div>
              <div onClick={() => setShowSCPanel(false)} style={{ cursor: "pointer", color: "#555", fontSize: 18, lineHeight: 1 }}>x</div>
            </div>
          </div>

          <div style={{ padding: 16 }}>
            {/* APARTMENTS GROUP */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1px", color: "#3b82f6" }}>APARTMENTS</span>
                  <span style={{ fontSize: 9, color: "#444", marginLeft: 8 }}>{aptOnCount} of {aptBuildings.length} communities with SC</span>
                </div>
                <div style={{ display: "flex", gap: 5 }}>
                  <div onClick={() => toggleAll("Apartment", true)} style={{ cursor: "pointer", fontSize: 8, padding: "2px 7px", borderRadius: 2, background: "#3b82f615", color: "#3b82f6", fontWeight: 700, border: "1px solid #3b82f622" }}>ALL ON</div>
                  <div onClick={() => toggleAll("Apartment", false)} style={{ cursor: "pointer", fontSize: 8, padding: "2px 7px", borderRadius: 2, background: "#1a1a1e", color: "#555", fontWeight: 700, border: "1px solid #222" }}>ALL OFF</div>
                </div>
              </div>

              <div style={{ height: 3, background: "#111", borderRadius: 2, marginBottom: 12, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(aptOnCount / aptBuildings.length) * 100}%`, background: "#3b82f666", borderRadius: 2, transition: "width 0.3s" }} />
              </div>

              {aptBuildings.map(b => {
                const on = scToggles[b.id] !== false;
                const avgSC = b.units?.length > 0 ? b.units.reduce((s, u) => s + u.serviceChargePSF, 0) / b.units.length : 0;
                return (
                  <div key={b.id} style={{ marginBottom: 8, padding: "9px 10px", background: on ? "#0c0c12" : "#090909", borderRadius: 5, border: `1px solid ${on ? "#1a1a22" : "#111"}`, transition: "all 0.2s" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 11, color: on ? "#ccc" : "#444", fontWeight: 500, transition: "color 0.2s" }}>{b.name}</span>
                          <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 2, background: b.status === "truth" ? "#22c55e12" : "#f59e0b12", color: b.status === "truth" ? "#22c55e" : "#f59e0b" }}>
                            {b.status === "truth" ? "V" : "+"}
                          </span>
                        </div>
                        <div style={{ fontSize: 9, color: on ? "#444" : "#2a2a2a", marginTop: 2, transition: "color 0.2s" }}>
                          avg {avgSC.toFixed(1)} AED/sqft SC · {b.units?.length} unit types
                          {!on && <span style={{ color: "#ef444466", marginLeft: 6 }}>SC EXCLUDED</span>}
                        </div>
                      </div>
                      <Toggle on={on} onChange={() => setScToggles(prev => ({ ...prev, [b.id]: !on }))} color="#3b82f6" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* VILLAS GROUP */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1px", color: "#22c55e" }}>VILLAS</span>
                  <span style={{ fontSize: 9, color: "#444", marginLeft: 8 }}>{villaOnCount} of {villaBuildings.length} communities with SC</span>
                </div>
                <div style={{ display: "flex", gap: 5 }}>
                  <div onClick={() => toggleAll("Villa", true)} style={{ cursor: "pointer", fontSize: 8, padding: "2px 7px", borderRadius: 2, background: "#22c55e15", color: "#22c55e", fontWeight: 700, border: "1px solid #22c55e22" }}>ALL ON</div>
                  <div onClick={() => toggleAll("Villa", false)} style={{ cursor: "pointer", fontSize: 8, padding: "2px 7px", borderRadius: 2, background: "#1a1a1e", color: "#555", fontWeight: 700, border: "1px solid #222" }}>ALL OFF</div>
                </div>
              </div>

              <div style={{ height: 3, background: "#111", borderRadius: 2, marginBottom: 12, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(villaOnCount / villaBuildings.length) * 100}%`, background: "#22c55e66", borderRadius: 2, transition: "width 0.3s" }} />
              </div>

              {villaBuildings.map(b => {
                const on = scToggles[b.id] !== false;
                const avgSC = b.units?.length > 0 ? b.units.reduce((s, u) => s + u.serviceChargePSF, 0) / b.units.length : 0;
                return (
                  <div key={b.id} style={{ marginBottom: 8, padding: "9px 10px", background: on ? "#0c0c12" : "#090909", borderRadius: 5, border: `1px solid ${on ? "#1a1a22" : "#111"}`, transition: "all 0.2s" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 11, color: on ? "#ccc" : "#444", fontWeight: 500, transition: "color 0.2s" }}>{b.name}</span>
                          <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 2, background: b.status === "truth" ? "#22c55e12" : "#f59e0b12", color: b.status === "truth" ? "#22c55e" : "#f59e0b" }}>
                            {b.status === "truth" ? "V" : "+"}
                          </span>
                        </div>
                        <div style={{ fontSize: 9, color: on ? "#444" : "#2a2a2a", marginTop: 2, transition: "color 0.2s" }}>
                          avg {avgSC.toFixed(1)} AED/sqft SC · {b.units?.length} unit types
                          {!on && <span style={{ color: "#ef444466", marginLeft: 6 }}>SC EXCLUDED</span>}
                        </div>
                      </div>
                      <Toggle on={on} onChange={() => setScToggles(prev => ({ ...prev, [b.id]: !on }))} color="#22c55e" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* IMPACT SUMMARY */}
            <div style={{ padding: 12, background: "#0c0c10", borderRadius: 6, border: "1px solid #1a1a1e" }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "1px", color: "#c9a84c", marginBottom: 8 }}>SC COVERAGE IMPACT</div>
              <div style={{ fontSize: 10, color: "#555", lineHeight: 1.7 }}>
                <div>Apartments: <span style={{ color: "#3b82f6" }}>{aptOnCount}/{aptBuildings.length}</span> communities include SC in yield calc</div>
                <div>Villas: <span style={{ color: "#22c55e" }}>{villaOnCount}/{villaBuildings.length}</span> communities include SC in yield calc</div>
                <div style={{ marginTop: 6, color: "#444" }}>
                  Toggling off SC will <span style={{ color: "#f59e0b" }}>inflate yields</span> — use to model gross-of-SC scenarios or if management covers charges
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* overlay for SC panel */}
      {showSCPanel && <div onClick={() => setShowSCPanel(false)} style={{ position: "fixed", inset: 0, background: "#00000044", zIndex: 99 }} />}

      {/* ─── TITLE ─── */}
      <div style={{ padding: "28px 20px 12px", textAlign: "center" }}>
        <div style={{ fontSize: 10, letterSpacing: "3px", color: "#555", fontWeight: 600 }}>DUBAI HILLS ESTATE · MASTERPLAN</div>
        <h1 style={{ fontSize: 28, fontWeight: 300, margin: "8px 0 4px", letterSpacing: "0.5px" }}>Real Yield Intelligence</h1>
        <p style={{ fontSize: 12, color: "#555", maxWidth: 600, margin: "0 auto" }}>
          Truth + prediction layers · Toggle service charges per community via <span onClick={() => setShowSCPanel(true)} style={{ color: "#c9a84c", cursor: "pointer", textDecoration: "underline dotted" }}>SC Charges panel</span>
        </p>
      </div>

      {/* ─── BUILDING SELECTOR ─── */}
      <div style={{ padding: "0 20px", marginBottom: 12 }}>
        {["Apartment", "Villa"].map(type => {
          const group = buildings.filter(b => b.type === type);
          if (!group.length) return null;
          return (
            <div key={type} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 8, letterSpacing: "1.5px", color: "#333", fontWeight: 700, marginBottom: 5, textAlign: "center" }}>{type.toUpperCase()}S</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "center" }}>
                {group.map(b => {
                  const idx = buildings.indexOf(b);
                  const scOff = scToggles[b.id] === false;
                  return (
                    <div key={b.id} onClick={() => { setSelBldg(idx); setSelUnit(0); }}
                      style={{
                        padding: "5px 11px", borderRadius: 4, cursor: "pointer", fontSize: 10, fontWeight: 600, position: "relative",
                        background: selBldg === idx ? (b.status === "truth" ? "#22c55e18" : "#f59e0b18") : "#0c0c10",
                        color: selBldg === idx ? (b.status === "truth" ? "#22c55e" : "#f59e0b") : scOff ? "#333" : "#555",
                        border: `1px solid ${selBldg === idx ? (b.status === "truth" ? "#22c55e33" : "#f59e0b33") : "#1a1a1e"}`,
                        transition: "all 0.15s", opacity: scOff && selBldg !== idx ? 0.5 : 1
                      }}>
                      {b.status === "predicted" && "+ "}{b.name}
                      {scOff && <span style={{ marginLeft: 4, fontSize: 8, color: "#ef444466" }}>no SC</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── UNIT SELECTOR ─── */}
      <div style={{ padding: "0 20px", marginBottom: 16, display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
        {bldg.units?.map((u, i) => (
          <div key={i} onClick={() => setSelUnit(i)}
            style={{ padding: "5px 16px", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600,
              background: selUnit === i ? "#c9a84c18" : "#0c0c10",
              color: selUnit === i ? "#c9a84c" : "#555",
              border: `1px solid ${selUnit === i ? "#c9a84c33" : "#1a1a1e"}` }}>
            {u.bed}
          </div>
        ))}
      </div>

      {/* ─── STATUS + SC BANNER ─── */}
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ display: "inline-flex", gap: 8, alignItems: "center", padding: "6px 16px", borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: "1px",
          background: bldg.status === "truth" ? "#22c55e10" : "#f59e0b10",
          color: bldg.status === "truth" ? "#22c55e" : "#f59e0b",
          border: `1px solid ${bldg.status === "truth" ? "#22c55e22" : "#f59e0b22"}` }}>
          <span>{bldg.status === "truth" ? "VERIFIED" : `PREDICTED · ${bldg.constructionPct}% · ${bldg.handover}`}</span>
          <span style={{ width: 1, height: 12, background: "currentColor", opacity: 0.2 }} />
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            SC CHARGES:
            <Toggle on={scOn} onChange={() => setScToggles(prev => ({ ...prev, [bldg.id]: !scOn }))} color={bldg.type === "Villa" ? "#22c55e" : "#3b82f6"} />
            <span style={{ color: scOn ? "#aaa" : "#ef4444" }}>{scOn ? "INCLUDED" : "EXCLUDED"}</span>
          </span>
        </div>
        <div style={{ fontSize: 10, color: "#444", marginTop: 5 }}>Source: {bldg.source}</div>
        {bldg.comp && <div style={{ fontSize: 9, color: "#333", marginTop: 2 }}>Comp: {bldg.comp}</div>}
      </div>

      {/* ─── QUICK STATS ─── */}
      <div style={{ padding: "0 20px", marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, maxWidth: 860, margin: "0 auto" }}>
          {[
            { l: "SALE PRICE", v: `AED ${fmtM(y.price)}`, c: "#e0e0e0" },
            { l: "ANNUAL RENT", v: `AED ${fmtK(y.rent)}`, c: "#e0e0e0" },
            { l: "SERVICE CHARGE", v: scOn ? `AED ${fmt(y.sc)}/yr` : "EXCLUDED", c: scOn ? (y.scPct > 20 ? "#ef4444" : y.scPct > 15 ? "#f59e0b" : "#22c55e") : "#ef4444" },
            { l: "SC % OF RENT", v: scOn ? `${y.scPct.toFixed(1)}%` : "--", c: scOn ? (y.scPct > 20 ? "#ef4444" : y.scPct > 15 ? "#f59e0b" : "#22c55e") : "#555" },
            { l: "GROSS -> TRUE YIELD", v: `${y.gross.toFixed(1)}% -> ${y.trueY.toFixed(1)}%`, c: y.trueY >= 4 ? "#22c55e" : y.trueY >= 3 ? "#f59e0b" : "#ef4444" },
            { l: "EROSION", v: `-${(y.gross - y.trueY).toFixed(1)} pts`, c: "#ef4444" },
          ].map((s, i) => (
            <div key={i} style={{ padding: "12px 10px", background: "#0c0c10", borderRadius: 6, border: "1px solid #1a1a1e", textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 400, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.6px", marginTop: 3 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── TABS ─── */}
      <div style={{ borderBottom: "1px solid #141418", padding: "0 20px", display: "flex", gap: 0, justifyContent: "center" }}>
        {[{ key: "yields", label: "Yield Layers" }, { key: "waterfall", label: "Cost Waterfall" }, { key: "compare", label: "Cross-Building" }].map(t => (
          <div key={t.key} onClick={() => setTab(t.key)} style={{ padding: "10px 20px", fontSize: 11, fontWeight: 600, letterSpacing: "0.8px", cursor: "pointer",
            color: tab === t.key ? "#c9a84c" : "#444",
            borderBottom: tab === t.key ? "2px solid #c9a84c" : "2px solid transparent" }}>
            {t.label}
          </div>
        ))}
      </div>

      {/* ─── CONTENT ─── */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px" }}>

        {/* YIELD LAYERS */}
        {tab === "yields" && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 300, marginBottom: 4 }}>{bldg.name} — {unit.bed}</div>
              <div style={{ fontSize: 11, color: "#555" }}>{unit.sqft} sqft · {bldg.type} · {bldg.developer}
                {!scOn && <span style={{ marginLeft: 8, color: "#ef4444", fontSize: 10 }}>· SERVICE CHARGES EXCLUDED FROM CALC</span>}
              </div>
            </div>
            {[
              { label: "Gross Yield (Agent Markets)", val: y.gross, color: "#22c55e", desc: "Rent / Price -- what agents advertise" },
              { label: "Net of Service Charge", val: y.netSC, color: "#3b82f6", desc: scOn ? `After AED ${fmt(y.sc)}/yr SC (${y.scPct.toFixed(1)}% of rent)` : `SC EXCLUDED -- raw SC would be AED ${fmt(y.rawSC)}/yr (${y.scPct.toFixed(1)}% of rent)` },
              { label: "Real Yield (All Costs)", val: y.real, color: "#f59e0b", desc: `After ${scOn ? "SC +" : "(no SC) +"} Insurance + Maintenance 1% + Vacancy ${VACANCY_WK}wk` },
              { label: "True Yield (Capital Deployed)", val: y.trueY, color: "#ef4444", desc: `After DLD 4% + Agency 2% + Trustee on AED ${fmtM(y.acq)} total` },
            ].map((layer, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "#888" }}>{layer.label}</span>
                  <span style={{ fontSize: 18, fontWeight: 600, color: layer.color, fontFamily: "'JetBrains Mono', monospace" }}>{layer.val.toFixed(2)}%</span>
                </div>
                <div style={{ height: 8, background: "#111", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.max(0, layer.val) / 8 * 100}%`, background: layer.color + "66", borderRadius: 4, transition: "width 0.5s" }} />
                </div>
                <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>{layer.desc}</div>
              </div>
            ))}
            <div style={{ marginTop: 20, padding: 14, background: "#0c0c10", borderRadius: 6, border: "1px solid #1a1a1e" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#888", marginBottom: 8 }}>Cost Breakdown (Annual)</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {[
                  { l: scOn ? "Service Charge" : "Service Charge (EXCLUDED)", v: scOn ? y.sc : 0, dim: !scOn },
                  { l: "Insurance", v: INSURANCE, dim: false },
                  { l: "Maintenance (1%)", v: y.maint, dim: false },
                  { l: `Vacancy (${VACANCY_WK}wk)`, v: y.vac, dim: false },
                ].map((c, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: c.dim ? "#333" : "#666" }}>
                    <span>{c.l}</span>
                    <span style={{ color: c.dim ? "#2a2a2a" : "#999", fontFamily: "'JetBrains Mono', monospace" }}>
                      {c.dim ? "--" : `AED ${fmt(c.v)}`}
                    </span>
                  </div>
                ))}
                <div style={{ gridColumn: "1 / -1", borderTop: "1px solid #1a1a1e", paddingTop: 6, display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600 }}>
                  <span style={{ color: "#888" }}>Total Annual Costs</span>
                  <span style={{ color: "#ef4444", fontFamily: "'JetBrains Mono', monospace" }}>AED {fmt(y.totalCost)}</span>
                </div>
                <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600 }}>
                  <span style={{ color: "#888" }}>Net Income</span>
                  <span style={{ color: "#22c55e", fontFamily: "'JetBrains Mono', monospace" }}>AED {fmt(y.netIncome)}</span>
                </div>
              </div>
              {!scOn && (
                <div style={{ marginTop: 8, padding: "6px 10px", background: "#ef444410", borderRadius: 4, border: "1px solid #ef444420", fontSize: 10, color: "#ef4444" }}>
                  SC excluded from this calc. Raw SC would be AED {fmt(y.rawSC)}/yr ({y.scPct.toFixed(1)}% of rent) -- toggle ON for full picture
                </div>
              )}
            </div>
          </div>
        )}

        {/* WATERFALL */}
        {tab === "waterfall" && (
          <div>
            <div style={{ fontSize: 16, fontWeight: 300, marginBottom: 16 }}>Cost Waterfall — {bldg.name} {unit.bed}
              {!scOn && <span style={{ fontSize: 11, color: "#ef4444", marginLeft: 8 }}>(SC excluded)</span>}
            </div>
            {(() => {
              const steps = [
                { label: "Gross Rent", value: y.rent, cumulative: y.rent, color: "#22c55e" },
                { label: scOn ? `- Service Charge (${y.scPct.toFixed(0)}%)` : "- Service Charge (EXCLUDED)", value: scOn ? -y.sc : 0, cumulative: y.rent - y.sc, color: scOn ? "#ef4444" : "#333" },
                { label: "- Insurance", value: -INSURANCE, cumulative: y.rent - y.sc - INSURANCE, color: "#ef4444" },
                { label: "- Maintenance 1%", value: -y.maint, cumulative: y.rent - y.sc - INSURANCE - y.maint, color: "#ef4444" },
                { label: `- Vacancy ${VACANCY_WK}wk`, value: -y.vac, cumulative: y.netIncome, color: "#ef4444" },
                { label: "= Net Income", value: y.netIncome, cumulative: y.netIncome, color: "#3b82f6" },
              ];
              const maxVal = y.rent * 1.05;
              return steps.map((s, i) => (
                <div key={i} style={{ marginBottom: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
                    <span style={{ color: s.value === 0 && i > 0 ? "#333" : "#888" }}>{s.label}</span>
                    <span style={{ color: s.color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                      {s.value === 0 && i > 0 ? "--" : `AED ${fmt(Math.abs(s.value))}`}
                    </span>
                  </div>
                  <div style={{ height: 10, background: "#111", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.max(0, s.cumulative) / maxVal * 100}%`, background: i === steps.length - 1 ? "#3b82f6" : (i === 0 ? "#22c55e44" : "#22c55e22"), borderRadius: 4, transition: "width 0.5s" }} />
                  </div>
                </div>
              ));
            })()}
            <div style={{ marginTop: 16, padding: 12, background: "#0c0c10", borderRadius: 6, border: "1px solid #1a1a1e", textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#555" }}>AED {fmt(y.rent)} gross -&gt; AED {fmt(y.netIncome)} net = {((y.netIncome / y.rent) * 100).toFixed(0)}% retained</div>
              <div style={{ fontSize: 10, color: "#ef4444", marginTop: 4 }}>{(100 - (y.netIncome / y.rent) * 100).toFixed(0)}% of rent goes to costs</div>
            </div>
          </div>
        )}

        {/* CROSS-BUILDING COMPARE */}
        {tab === "compare" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 300 }}>All Buildings x Unit Types</div>
                <div style={{ fontSize: 9, color: "#444", marginTop: 2 }}>
                  Yields reflect your SC toggles — <span style={{ color: "#c9a84c", cursor: "pointer" }} onClick={() => setShowSCPanel(true)}>manage SC panel</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {["all", "truth", "predicted"].map(f => (
                  <div key={f} onClick={() => setFilter(f)} style={{
                    padding: "4px 10px", borderRadius: 3, cursor: "pointer", fontSize: 10, fontWeight: 600,
                    background: filter === f ? "#c9a84c18" : "#0c0c10",
                    color: filter === f ? "#c9a84c" : "#555",
                    border: `1px solid ${filter === f ? "#c9a84c33" : "#1a1a1e"}`,
                    textTransform: "uppercase", letterSpacing: "0.5px"
                  }}>{f}</div>
                ))}
              </div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1a1a1e" }}>
                    {["Building", "Unit", "Status", "SC", "Price", "Rent", "SC%", "Gross", "NetSC", "Real", "True", "Erode"].map((h, i) => (
                      <th key={i} style={{ padding: "8px 6px", textAlign: "left", color: "#555", fontWeight: 600, fontSize: 9, letterSpacing: "0.5px" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #0f0f13" }}>
                      <td style={{ padding: "6px", color: "#999", fontSize: 10, maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.building}</td>
                      <td style={{ padding: "6px", color: "#888" }}>{r.bed}</td>
                      <td style={{ padding: "6px" }}>
                        <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 5px", borderRadius: 2, background: r.status === "truth" ? "#22c55e12" : "#f59e0b12", color: r.status === "truth" ? "#22c55e" : "#f59e0b" }}>
                          {r.status === "truth" ? "V" : "+"}
                        </span>
                      </td>
                      <td style={{ padding: "6px" }}>
                        <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 5px", borderRadius: 2, background: r.scEnabled ? "#3b82f612" : "#ef444412", color: r.scEnabled ? "#3b82f6" : "#ef4444" }}>
                          {r.scEnabled ? "on" : "off"}
                        </span>
                      </td>
                      <td style={{ padding: "6px", color: "#888", fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>{fmtM(r.price)}</td>
                      <td style={{ padding: "6px", color: "#888", fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>{fmtK(r.rent)}</td>
                      <td style={{ padding: "6px", color: r.scEnabled ? (r.scPct > 20 ? "#ef4444" : r.scPct > 15 ? "#f59e0b" : "#22c55e") : "#333", fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                        {r.scEnabled ? `${r.scPct.toFixed(0)}%` : "--"}
                      </td>
                      <td style={{ padding: "6px", color: "#22c55e", fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>{r.gross.toFixed(1)}</td>
                      <td style={{ padding: "6px", color: "#3b82f6", fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>{r.netSC.toFixed(1)}</td>
                      <td style={{ padding: "6px", color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>{r.real.toFixed(1)}</td>
                      <td style={{ padding: "6px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: r.trueY >= 4 ? "#22c55e" : r.trueY >= 3 ? "#f59e0b" : "#ef4444" }}>{r.trueY.toFixed(1)}</td>
                      <td style={{ padding: "6px", color: "#ef4444", fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>-{(r.gross - r.trueY).toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 12, padding: 10, background: "#0c0c10", borderRadius: 6, border: "1px solid #1a1a1e" }}>
              <div style={{ fontSize: 10, color: "#555" }}>
                SC column: <span style={{ color: "#3b82f6" }}>on</span> = SC included in yield calc · <span style={{ color: "#ef4444" }}>off</span> = SC excluded ·
                Sorted by True Yield · <span style={{ color: "#22c55e" }}>GREEN</span> &gt;=4% · <span style={{ color: "#f59e0b" }}>AMBER</span> 3-4% · <span style={{ color: "#ef4444" }}>RED</span> &lt;3%
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── FOOTER ─── */}
      <div style={{ padding: "12px 20px", borderTop: "1px solid #141418" }}>
        <div style={{ fontSize: 9, color: "#333", lineHeight: 1.6 }}>
          TRUTH: PropertyFinder (Feb 2026) · Bayut Ejari · RERA SC Index/Mollak · Driven Properties DHE Report (Jun 2025) · Emaar layouts<br />
          VERIFIED: DHE apt yields 6-8% gross / 5.1% villa · 45% apt / 68% villa appreciation 2022-&gt;Q1 2025 · Rents +52% · SC AED 15-22/sqft apt, 3-4/sqft villa<br />
          Sale prices = asking (DLD closed ~4% lower). SC % of rent is actual annual erosion. Individual yields +-1-2%. SC toggle = modelling tool only.
        </div>
      </div>

    </div>
  );
}
