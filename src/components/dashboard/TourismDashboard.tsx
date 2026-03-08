import { useState, useEffect, useRef } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';

// ============================================================================
// DATA FROM BRONZE LAYER
// ============================================================================
const visitorArrivals = [
  { year: '2019', visitors: 16.73, yoy: null as number | null, label: 'Pre-COVID' },
  { year: '2020', visitors: 5.51, yoy: -67.1, label: 'COVID' },
  { year: '2021', visitors: 7.28, yoy: 32.1, label: 'Recovery' },
  { year: '2022', visitors: 14.36, yoy: 97.3, label: 'Expo Effect' },
  { year: '2023', visitors: 17.15, yoy: 19.4, label: 'Record' },
  { year: '2024', visitors: 18.72, yoy: 9.2, label: 'New ATH' },
  { year: '2025', visitors: 19.59, yoy: 4.6, label: 'ATH' },
];

const hotelPerformance = [
  { year: '2023', occ: 77.4, adr: null as number | null, rooms: 150291 },
  { year: '2024', occ: 78.2, adr: 538, rooms: 154016 },
  { year: '2025', occ: 80.7, adr: 745, rooms: 154264 },
];

const seasonality = [
  { month: 'Jan', occ: 82, peak: true },
  { month: 'Feb', occ: 82, peak: true },
  { month: 'Mar', occ: 80, peak: true },
  { month: 'Apr', occ: 75, peak: false },
  { month: 'May', occ: 70, peak: false },
  { month: 'Jun', occ: 68, peak: false },
  { month: 'Jul', occ: 65, peak: false },
  { month: 'Aug', occ: 65, peak: false },
  { month: 'Sep', occ: 68, peak: false },
  { month: 'Oct', occ: 78, peak: true },
  { month: 'Nov', occ: 80, peak: true },
  { month: 'Dec', occ: 84, peak: true },
];

const sourceMarkets = [
  { name: 'Western Europe', share: 20, visitors: 3.74, signal: 'UK tax exodus driving Palm/Emirates Hills demand' },
  { name: 'South Asia', share: 17, visitors: 3.13, signal: 'Indian HNW inflows → JVC, Dubai Hills, Business Bay' },
  { name: 'GCC', share: 15, visitors: 2.73, signal: 'Saudi/Kuwaiti capital rotating into ready villas' },
  { name: 'CIS/E. Europe', share: 14, visitors: 2.63, signal: 'Russian sanctions → Dubai safe-haven capital' },
  { name: 'East Asia Pacific', share: 10, visitors: 1.87, signal: 'Chinese recovery signal — watch for 2026 surge' },
  { name: 'Americas', share: 8, visitors: 1.50, signal: 'US dollar strength dampening but steady' },
];

const strCommunities = [
  { name: 'Downtown', occ: 82, adr: 975, yield: 6.2, guest: 'Tourist', color: '#C9A84C' },
  { name: 'Marina', occ: 78, adr: 775, yield: 6.1, guest: 'Mixed', color: '#8B7536' },
  { name: 'Business Bay', occ: 74, adr: 650, yield: 6.0, guest: 'Corporate', color: '#6B5A2E' },
  { name: 'JVC', occ: 68, adr: 450, yield: 8.0, guest: 'Family', color: '#E8D48B' },
];

const ytdProgression = [
  { label: 'Jan-Feb', visitors: 3.82, yoy: 4.0 },
  { label: 'Q1', visitors: 5.31, yoy: 3.0 },
  { label: 'Jan-Apr', visitors: 7.15, yoy: 7.0 },
  { label: 'Jan-May', visitors: 8.68, yoy: 7.0 },
  { label: 'H1', visitors: 9.88, yoy: 6.0 },
  { label: 'Jan-Jul', visitors: 11.17, yoy: 5.0 },
  { label: '9M', visitors: 13.95, yoy: 5.0 },
  { label: '10M', visitors: 15.70, yoy: 5.0 },
];

// ============================================================================
// CUSTOM TOOLTIP
// ============================================================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DarkTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(10,10,14,0.95)', border: '1px solid rgba(201,168,76,0.3)',
      padding: '10px 14px', borderRadius: '2px', fontSize: '12px',
      fontFamily: "'DM Sans', sans-serif", backdropFilter: 'blur(10px)',
    }}>
      <div style={{ color: '#C9A84C', fontWeight: 600, marginBottom: 4, letterSpacing: '0.05em' }}>{label}</div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: '#A0A0A8', marginTop: 2 }}>
          <span style={{ color: p.color || '#C9A84C' }}>{p.name || p.dataKey}: </span>
          <span style={{ color: '#E8E8EC', fontWeight: 500 }}>
            {formatter ? formatter(p.value, p.dataKey) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// ANIMATED NUMBER
// ============================================================================
function AnimNum({ value, suffix = '', prefix = '', decimals = 1, duration = 1200 }: {
  value: number; suffix?: string; prefix?: string; decimals?: number; duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const animate = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplay(eased * value);
          if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, duration]);

  return <span ref={ref}>{prefix}{display.toFixed(decimals)}{suffix}</span>;
}

// ============================================================================
// SECTION HEADER
// ============================================================================
function SectionHead({ tag, title, subtitle }: { tag: string; title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
        color: '#C9A84C', fontWeight: 600, marginBottom: 6, fontFamily: "'DM Sans', sans-serif",
      }}>{tag}</div>
      <div style={{
        fontSize: 18, fontWeight: 300, color: '#E8E8EC', letterSpacing: '-0.01em',
        fontFamily: "'Cormorant Garamond', serif", lineHeight: 1.2,
      }}>{title}</div>
      {subtitle && <div style={{
        fontSize: 12, color: '#6B6B74', marginTop: 4, fontFamily: "'DM Sans', sans-serif",
        fontWeight: 400, lineHeight: 1.5,
      }}>{subtitle}</div>}
    </div>
  );
}

// ============================================================================
// KPI CARD
// ============================================================================
function KPI({ label, value, sub, accent = false }: {
  label: string; value: React.ReactNode; sub?: string; accent?: boolean;
}) {
  return (
    <div style={{
      padding: '16px 18px', background: accent ? 'rgba(201,168,76,0.06)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${accent ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.05)'}`,
      borderRadius: 2, flex: 1, minWidth: 120,
    }}>
      <div style={{
        fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase',
        color: '#6B6B74', marginBottom: 8, fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
      }}>{label}</div>
      <div style={{
        fontSize: 26, fontWeight: 300, color: accent ? '#C9A84C' : '#E8E8EC',
        fontFamily: "'Cormorant Garamond', serif", lineHeight: 1, letterSpacing: '-0.02em',
      }}>{value}</div>
      {sub && <div style={{
        fontSize: 11, color: '#4CAF50', marginTop: 6, fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
      }}>{sub}</div>}
    </div>
  );
}

// ============================================================================
// MAIN DASHBOARD
// ============================================================================
export function TourismDashboard() {
  const [activeMarket, setActiveMarket] = useState(0);
  const [hoveredComm, setHoveredComm] = useState<number | null>(null);

  return (
    <div style={{
      color: '#E8E8EC',
      fontFamily: "'DM Sans', sans-serif",
      position: 'relative',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=DM+Sans:wght@300;400;500;600&display=swap');
        .tourism-grid-card {
          background: rgba(255,255,255,0.015);
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: 2px;
          padding: 24px;
          position: relative;
          overflow: hidden;
        }
        .tourism-grid-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent);
        }
        .tourism-signal-tag {
          display: inline-block;
          padding: 3px 8px;
          font-size: 9px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          border-radius: 1px;
          font-weight: 600;
        }
        .tourism-market-row {
          display: flex;
          align-items: center;
          padding: 10px 14px;
          cursor: pointer;
          transition: all 0.2s;
          border-left: 2px solid transparent;
          margin-bottom: 2px;
        }
        .tourism-market-row:hover, .tourism-market-row.active {
          background: rgba(201,168,76,0.06);
          border-left-color: #C9A84C;
        }
        .tourism-comm-card {
          padding: 14px 16px;
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: 2px;
          cursor: pointer;
          transition: all 0.25s;
          position: relative;
          overflow: hidden;
        }
        .tourism-comm-card:hover {
          border-color: rgba(201,168,76,0.3);
          background: rgba(201,168,76,0.04);
          transform: translateY(-1px);
        }
      `}</style>

      {/* HEADER */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', background: '#4CAF50',
            boxShadow: '0 0 8px rgba(76,175,80,0.5)',
          }} />
          <span style={{ fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#6B6B74', fontWeight: 600 }}>
            LIVE INTELLIGENCE · UPDATED MAR 2026
          </span>
        </div>
        <h2 style={{
          fontSize: 28, fontWeight: 300, fontFamily: "'Cormorant Garamond', serif",
          color: '#E8E8EC', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 8,
        }}>
          Tourism <span style={{ color: '#C9A84C' }}>→</span> Capital Signal
        </h2>
        <p style={{ fontSize: 13, color: '#6B6B74', maxWidth: 600, lineHeight: 1.6, fontWeight: 400 }}>
          Dubai's tourism engine drives rental demand. Every visitor arrival is a forward signal
          for occupancy, yield, and capital flow.
        </p>
      </div>

      {/* KPI ROW */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <KPI label="2025 Visitors" value={<AnimNum value={19.59} suffix="M" />} sub="+4.6% YoY — All-time high" accent />
        <KPI label="Hotel Occupancy" value={<AnimNum value={80.7} suffix="%" />} sub="+2.5pp vs 2024" />
        <KPI label="STR Listings" value={<AnimNum value={22.48} suffix="K" decimals={2} />} sub="+36% YoY growth" />
        <KPI label="STR Yield" value={<AnimNum value={72} suffix="%" decimals={0} />} sub="Median occupancy" />
        <KPI label="ADR" value={<AnimNum value={609} suffix="" decimals={0} prefix="AED " />} sub="Avg nightly rate" />
      </div>

      {/* ROW 1: Visitor Trajectory + 2025 YTD */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="tourism-grid-card">
          <SectionHead tag="Demand Signal" title="Visitor Arrival Trajectory" subtitle="International overnight visitors (millions). 7 consecutive years of recovery." />
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={visitorArrivals} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="goldGradT" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C9A84C" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#C9A84C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="year" tick={{ fill: '#6B6B74', fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} />
              <YAxis tick={{ fill: '#6B6B74', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}M`} />
              <Tooltip content={<DarkTooltip formatter={(v: number, k: string) => k === 'visitors' ? `${v}M visitors` : `${v}%`} />} />
              <Area type="monotone" dataKey="visitors" stroke="#C9A84C" strokeWidth={2} fill="url(#goldGradT)" dot={{ r: 3, fill: '#0A0A0E', stroke: '#C9A84C', strokeWidth: 2 }} activeDot={{ r: 5, fill: '#C9A84C' }} />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            <span className="tourism-signal-tag" style={{ background: 'rgba(76,175,80,0.1)', color: '#4CAF50' }}>BULLISH</span>
            <span style={{ fontSize: 11, color: '#6B6B74' }}>19.59M in 2025 — Highest ever recorded. 17% above pre-COVID.</span>
          </div>
        </div>

        <div className="tourism-grid-card">
          <SectionHead tag="2025 Momentum" title="Year-to-Date Accumulation" subtitle="Cumulative visitor count tracking ahead of 2024 at every checkpoint." />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ytdProgression} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="label" tick={{ fill: '#6B6B74', fontSize: 10 }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} />
              <YAxis tick={{ fill: '#6B6B74', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}M`} />
              <Tooltip content={<DarkTooltip formatter={(v: number, k: string) => k === 'visitors' ? `${v}M cumulative` : `+${v}% YoY`} />} />
              <Bar dataKey="visitors" radius={[2, 2, 0, 0]}>
                {ytdProgression.map((_, i) => (
                  <Cell key={i} fill={i === ytdProgression.length - 1 ? '#C9A84C' : 'rgba(201,168,76,0.25)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            <span className="tourism-signal-tag" style={{ background: 'rgba(201,168,76,0.1)', color: '#C9A84C' }}>CONSISTENT</span>
            <span style={{ fontSize: 11, color: '#6B6B74' }}>+5% YoY through Oct — demand is structural, not cyclical.</span>
          </div>
        </div>
      </div>

      {/* ROW 2: Seasonality + Source Markets */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="tourism-grid-card">
          <SectionHead tag="Timing Intelligence" title="Occupancy Seasonality" subtitle="When to price, when to hold. Peak window: Oct-Mar." />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={seasonality} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="month" tick={{ fill: '#6B6B74', fontSize: 10 }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} />
              <YAxis domain={[55, 90]} tick={{ fill: '#6B6B74', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip content={<DarkTooltip formatter={(v: number) => `${v}% occupancy`} />} />
              <Bar dataKey="occ" radius={[2, 2, 0, 0]}>
                {seasonality.map((d, i) => (
                  <Cell key={i} fill={d.peak ? '#C9A84C' : 'rgba(107,107,116,0.3)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 24, marginTop: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, background: '#C9A84C', borderRadius: 1 }} />
              <span style={{ fontSize: 11, color: '#A0A0A8' }}>Peak (Oct-Mar): 78-84%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, background: 'rgba(107,107,116,0.3)', borderRadius: 1 }} />
              <span style={{ fontSize: 11, color: '#A0A0A8' }}>Off-peak (Apr-Sep): 65-75%</span>
            </div>
          </div>
          <div style={{
            marginTop: 12, padding: '10px 14px',
            background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.1)',
            borderRadius: 2, fontSize: 11, color: '#A0A0A8', lineHeight: 1.5,
          }}>
            <span style={{ color: '#C9A84C', fontWeight: 600 }}>Investor Signal:</span> Seasonal gap below 20% —
            Dubai's year-round appeal means STR properties don't suffer the dead seasons other markets do.
          </div>
        </div>

        <div className="tourism-grid-card">
          <SectionHead tag="Capital Origin" title="Source Markets → Real Estate Demand" subtitle="Where visitors come from predicts where capital flows next." />
          <div style={{ marginTop: 4 }}>
            {sourceMarkets.map((m, i) => (
              <div key={i}
                className={`tourism-market-row ${activeMarket === i ? 'active' : ''}`}
                onClick={() => setActiveMarket(i)}>
                <div style={{ width: 32, fontSize: 12, fontWeight: 600, color: '#C9A84C', fontFamily: "'Cormorant Garamond', serif" }}>
                  {m.share}%
                </div>
                <div style={{ flex: 1, marginLeft: 8 }}>
                  <div style={{ fontSize: 13, color: '#E8E8EC', fontWeight: 500 }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: '#6B6B74', marginTop: 2 }}>{m.visitors}M visitors</div>
                </div>
                <div style={{
                  width: Math.max(m.share * 3, 20), height: 4, borderRadius: 2,
                  background: `rgba(201,168,76,${0.2 + (m.share / 25) * 0.8})`,
                }} />
              </div>
            ))}
          </div>
          <div style={{
            marginTop: 12, padding: '12px 14px',
            background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.1)',
            borderRadius: 2, fontSize: 11, lineHeight: 1.6,
          }}>
            <span style={{ color: '#C9A84C', fontWeight: 600 }}>RE Signal: </span>
            <span style={{ color: '#A0A0A8' }}>{sourceMarkets[activeMarket].signal}</span>
          </div>
        </div>
      </div>

      {/* ROW 3: STR Community Yield Matrix */}
      <div className="tourism-grid-card" style={{ marginBottom: 16 }}>
        <SectionHead tag="Short-Term Rental Intelligence" title="Community Yield Matrix"
          subtitle="STR performance by community — occupancy, ADR, and gross yield. 22,480 active listings. 85% DTCM licensed." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {strCommunities.map((c, i) => (
            <div key={i} className="tourism-comm-card"
              style={{ background: hoveredComm === i ? 'rgba(201,168,76,0.04)' : 'rgba(255,255,255,0.02)' }}
              onMouseEnter={() => setHoveredComm(i)}
              onMouseLeave={() => setHoveredComm(null)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#E8E8EC' }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: '#6B6B74', marginTop: 2, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{c.guest}</div>
                </div>
                <div style={{
                  fontSize: 20, fontWeight: 300, color: c.yield >= 7 ? '#4CAF50' : '#C9A84C',
                  fontFamily: "'Cormorant Garamond', serif",
                }}>{c.yield}%</div>
              </div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 9, color: '#6B6B74', letterSpacing: '0.1em', marginBottom: 3 }}>OCC</div>
                  <div style={{ fontSize: 16, color: '#E8E8EC', fontFamily: "'Cormorant Garamond', serif" }}>{c.occ}%</div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: '#6B6B74', letterSpacing: '0.1em', marginBottom: 3 }}>ADR</div>
                  <div style={{ fontSize: 16, color: '#E8E8EC', fontFamily: "'Cormorant Garamond', serif" }}>{c.adr}</div>
                </div>
              </div>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${c.occ}%`, borderRadius: 2,
                  background: `linear-gradient(90deg, ${c.color}88, ${c.color})`,
                  transition: 'width 1s ease-out',
                }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div style={{
            padding: '10px 14px', background: 'rgba(76,175,80,0.04)',
            border: '1px solid rgba(76,175,80,0.1)', borderRadius: 2,
            fontSize: 11, color: '#A0A0A8', lineHeight: 1.5,
          }}>
            <span style={{ color: '#4CAF50', fontWeight: 600 }}>Highest Yield:</span> JVC at 8.0% — lowest entry price, strongest tenant turnover.
          </div>
          <div style={{
            padding: '10px 14px', background: 'rgba(201,168,76,0.04)',
            border: '1px solid rgba(201,168,76,0.1)', borderRadius: 2,
            fontSize: 11, color: '#A0A0A8', lineHeight: 1.5,
          }}>
            <span style={{ color: '#C9A84C', fontWeight: 600 }}>Highest ADR:</span> Downtown at AED 975/night — Burj Khalifa proximity commands 60% premium.
          </div>
          <div style={{
            padding: '10px 14px', background: 'rgba(107,107,116,0.06)',
            border: '1px solid rgba(107,107,116,0.1)', borderRadius: 2,
            fontSize: 11, color: '#A0A0A8', lineHeight: 1.5,
          }}>
            <span style={{ color: '#E8E8EC', fontWeight: 600 }}>36% YoY Growth:</span> STR sector expanding rapidly. 88.5% of guests are international.
          </div>
        </div>
      </div>

      {/* ROW 4: Hotel Trend + Market Size */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="tourism-grid-card">
          <SectionHead tag="Hotel Benchmark" title="Hotel Performance Trajectory" subtitle="Hotel metrics set the ceiling for STR pricing." />
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={hotelPerformance.filter(d => d.occ)} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="year" tick={{ fill: '#6B6B74', fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} />
              <YAxis yAxisId="occ" domain={[74, 84]} tick={{ fill: '#6B6B74', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
              <YAxis yAxisId="adr" orientation="right" tick={{ fill: '#6B6B74', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<DarkTooltip formatter={(v: number, k: string) => k === 'occ' ? `${v}%` : `AED ${v}`} />} />
              <Line yAxisId="occ" type="monotone" dataKey="occ" name="Occupancy" stroke="#C9A84C" strokeWidth={2} dot={{ r: 4, fill: '#0A0A0E', stroke: '#C9A84C', strokeWidth: 2 }} />
              <Line yAxisId="adr" type="monotone" dataKey="adr" name="ADR (AED)" stroke="#4CAF50" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 4, fill: '#0A0A0E', stroke: '#4CAF50', strokeWidth: 2 }} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 16, height: 2, background: '#C9A84C' }} />
              <span style={{ fontSize: 11, color: '#A0A0A8' }}>Occupancy (%)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 16, height: 2, background: '#4CAF50' }} />
              <span style={{ fontSize: 11, color: '#A0A0A8' }}>ADR (AED)</span>
            </div>
          </div>
        </div>

        <div className="tourism-grid-card">
          <SectionHead tag="Market Position" title="Dubai Hospitality at Scale" subtitle="What the numbers mean for real estate capital deployment." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
            {[
              { label: 'Hotels', val: '827', sub: 'Establishments' },
              { label: 'Rooms', val: '154K', sub: 'Total inventory' },
              { label: 'DXB Pax', val: '92.3M', sub: '2024 passengers' },
              { label: 'RevPAR', val: '421', sub: 'AED per room' },
              { label: 'Avg Stay', val: '3.7', sub: 'Nights' },
              { label: 'Dec Peak', val: '84%', sub: 'Occupancy' },
            ].map((item, i) => (
              <div key={i} style={{
                padding: '12px 14px', background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)', borderRadius: 2,
              }}>
                <div style={{ fontSize: 9, color: '#6B6B74', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6, fontWeight: 500 }}>{item.label}</div>
                <div style={{ fontSize: 22, fontWeight: 300, color: '#E8E8EC', fontFamily: "'Cormorant Garamond', serif", lineHeight: 1 }}>{item.val}</div>
                <div style={{ fontSize: 10, color: '#6B6B74', marginTop: 4 }}>{item.sub}</div>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: 14, padding: '10px 14px',
            background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.1)',
            borderRadius: 2, fontSize: 11, color: '#A0A0A8', lineHeight: 1.6,
          }}>
            <span style={{ color: '#C9A84C', fontWeight: 600 }}>Bottom Line: </span>
            Dubai is adding visitors faster than rooms. Occupancy climbing despite supply growth.
            Structural tailwind for rental yields.
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{
        marginTop: 24, padding: '16px 20px',
        background: 'rgba(255,255,255,0.015)',
        border: '1px solid rgba(255,255,255,0.04)',
        borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: '#6B6B74', textTransform: 'uppercase', fontWeight: 600 }}>Data Provenance</div>
          <div style={{ fontSize: 11, color: '#A0A0A8', marginTop: 4, lineHeight: 1.6 }}>
            DET Official Reports · TourismAnalytics.com · Emirates NBD Research · STR/CoStar · Deloitte · Airbtics
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: '#6B6B74', textTransform: 'uppercase', fontWeight: 600 }}>ZeroAgent Bronze Layer</div>
          <div style={{ fontSize: 11, color: '#A0A0A8', marginTop: 4 }}>18 sources · 91 records · 10 tables</div>
        </div>
      </div>
    </div>
  );
}
