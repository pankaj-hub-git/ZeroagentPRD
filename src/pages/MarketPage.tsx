import { useMarketData, PhaseMismatch } from '@/hooks/useMarketData';
import { fmtNum } from '@/lib/constants';
import { Loader2 } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

const GOLD = '#C9A84C';
const BEDROOM_COLORS: Record<string, string> = {
  Studio: '#C9A84C',
  '1 B/R': '#2E75B6',
  '2 B/R': '#27AE60',
  '3 B/R': '#E74C3C',
};

const MISMATCH_COLORS: Record<string, { bg: string; text: string }> = {
  OVERPRICED_OFFPLAN: { bg: 'rgba(231,76,60,0.12)', text: '#E74C3C' },
  DEEP_DISCOUNT_OFFPLAN: { bg: 'rgba(243,156,18,0.12)', text: '#F39C12' },
  READY_PREMIUM: { bg: 'rgba(39,174,96,0.12)', text: '#27AE60' },
};

function MismatchRow({ row }: { row: PhaseMismatch }) {
  const style = MISMATCH_COLORS[row.mismatchLabel] ?? MISMATCH_COLORS.OVERPRICED_OFFPLAN;
  return (
    <tr className="border-t border-border" style={{ backgroundColor: style.bg }}>
      <td className="py-2 pr-3 text-body">{row.phaseName}</td>
      <td className="py-2 pr-3 text-micro text-text-secondary">{row.masterProject}</td>
      <td className="py-2 pr-3">
        <span className="text-micro font-semibold px-1.5 py-0.5 rounded" style={{ color: style.text }}>
          {row.mismatchLabel.replace(/_/g, ' ')}
        </span>
      </td>
      <td className="py-2 pr-3 font-mono text-micro">AED {fmtNum(row.readyPsf)}</td>
      <td className="py-2 pr-3 font-mono text-micro">AED {fmtNum(row.offplanPsf)}</td>
      <td className="py-2 font-mono text-micro" style={{ color: style.text }}>
        {row.premiumPct > 0 ? '+' : ''}{row.premiumPct}%
      </td>
    </tr>
  );
}

export function MarketPage() {
  const { kpis, monthlyVolume, bedroomTrend, top12Areas, rentalYields, eibor, phaseMismatch, loading } = useMarketData();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-gold" size={28} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto max-w-[1400px] mx-auto">
      {/* ROW 1: KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="bg-surface border border-border rounded-lg p-4">
            <div className="text-micro text-text-dim uppercase tracking-wider">{k.label}</div>
            <div className="text-heading font-mono text-gold mt-1">{k.value}</div>
            {k.sub && <div className="text-micro text-text-secondary mt-0.5">{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* ROW 2: Monthly Transaction Volume */}
      {monthlyVolume.length > 0 && (
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-label text-text-dim uppercase tracking-wider mb-3">
            Monthly Transaction Volume (14 months)
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyVolume}>
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#8892A4' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#3A3F52' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                contentStyle={{ background: '#0D0D20', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, fontSize: 11 }}
                labelStyle={{ color: '#8892A4' }}
                formatter={(v: unknown) => [fmtNum(Number(v)), 'Transactions']}
              />
              <Bar dataKey="count" fill={GOLD} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ROW 3: PSF by Bedroom + Top 12 Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {bedroomTrend.length > 0 && (
          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="text-label text-text-dim uppercase tracking-wider mb-3">
              PSF by Bedroom Type (14m)
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={bedroomTrend}>
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#8892A4' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#3A3F52' }} axisLine={false} tickLine={false} width={50} />
                <Tooltip
                  contentStyle={{ background: '#0D0D20', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, fontSize: 11 }}
                  labelStyle={{ color: '#8892A4' }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {Object.entries(BEDROOM_COLORS).map(([room, color]) => (
                  <Line key={room} type="monotone" dataKey={room} stroke={color} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {top12Areas.length > 0 && (
          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="text-label text-text-dim uppercase tracking-wider mb-3">
              Top 12 Areas by PSF
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={top12Areas} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 9, fill: '#3A3F52' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="area" tick={{ fontSize: 8, fill: '#8892A4' }} axisLine={false} tickLine={false} width={110} />
                <Tooltip
                  contentStyle={{ background: '#0D0D20', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, fontSize: 11 }}
                  formatter={(v: unknown) => [`AED ${fmtNum(Number(v))}/sqft`, 'Avg PSF']}
                />
                <Bar dataKey="psf" fill={GOLD} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ROW 4: Rental Yield + EIBOR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {rentalYields.length > 0 && (
          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="text-label text-text-dim uppercase tracking-wider mb-3">
              Rental Yield by Area
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={rentalYields.slice(0, 10)} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 9, fill: '#3A3F52' }} axisLine={false} tickLine={false} domain={[0, 'auto']} />
                <YAxis type="category" dataKey="area" tick={{ fontSize: 8, fill: '#8892A4' }} axisLine={false} tickLine={false} width={110} />
                <Tooltip
                  contentStyle={{ background: '#0D0D20', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, fontSize: 11 }}
                  formatter={(v: unknown) => [`${Number(v).toFixed(1)}%`, 'Gross Yield']}
                />
                <Bar dataKey="grossYield" fill="#27AE60" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {eibor.length > 1 && (
          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="text-label text-text-dim uppercase tracking-wider mb-3">
              EIBOR Trend
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={[...eibor].reverse()}>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#8892A4' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#3A3F52' }} axisLine={false} tickLine={false} width={40} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ background: '#0D0D20', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, fontSize: 11 }}
                />
                <Line type="monotone" dataKey="rate_3m" stroke={GOLD} strokeWidth={2} dot name="3M EIBOR" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ROW 5: Phase Mismatch Table */}
      {phaseMismatch.length > 0 && (
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-label text-text-dim uppercase tracking-wider mb-3">
            Phase Mismatch — Off-Plan vs Ready Comparables
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-body">
              <thead>
                <tr className="text-left text-label text-text-dim uppercase tracking-wider">
                  <th className="pb-3 pr-3">Phase</th>
                  <th className="pb-3 pr-3">Community</th>
                  <th className="pb-3 pr-3">Signal</th>
                  <th className="pb-3 pr-3">Ready PSF</th>
                  <th className="pb-3 pr-3">Off-Plan PSF</th>
                  <th className="pb-3">Premium</th>
                </tr>
              </thead>
              <tbody>
                {phaseMismatch.map((row, i) => (
                  <MismatchRow key={i} row={row} />
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-micro text-text-dim mt-3">
            Source: Government Records. Red = overpriced off-plan. Green = ready premium (buy ready). Amber = discounted off-plan.
          </p>
        </div>
      )}
    </div>
  );
}
