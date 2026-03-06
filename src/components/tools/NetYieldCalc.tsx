import { useState, useEffect } from 'react';
import { useNavStore } from '@/store/navigation';
import { sb } from '@/lib/supabase';
import { fmtPct } from '@/lib/constants';

export function NetYieldCalc() {
  const { activeCommunity } = useNavStore();
  const [grossYield, setGrossYield] = useState('');
  const [unitSqft, setUnitSqft] = useState('');
  const [bestSc, setBestSc] = useState<number | null>(null);
  const [vacancyPct, setVacancyPct] = useState(3);
  const [purchasePrice, setPurchasePrice] = useState('');

  useEffect(() => {
    if (!activeCommunity) return;
    const load = async () => {
      const [scRes, yieldRes] = await Promise.all([
        sb
          .from('gold.sc_truth_layer')
          .select('best_sc')
          .ilike('phase_name', `%${activeCommunity}%`)
          .limit(1)
          .maybeSingle(),
        sb
          .from('gold.rental_yield')
          .select('gross_yield_pct, vacancy_proxy_pct')
          .ilike('area_name', `%${activeCommunity}%`)
          .limit(1)
          .maybeSingle(),
      ]);

      if (scRes.data) setBestSc((scRes.data as Record<string, number>).best_sc);
      if (yieldRes.data) {
        const y = yieldRes.data as Record<string, number>;
        if (y.gross_yield_pct) setGrossYield(String(y.gross_yield_pct));
        if (y.vacancy_proxy_pct) setVacancyPct(y.vacancy_proxy_pct);
      }
    };
    load();
  }, [activeCommunity]);

  const gross = parseFloat(grossYield) || 0;
  const sqft = parseFloat(unitSqft) || 800;
  const price = parseFloat(purchasePrice) || 1;
  const scDeduction = bestSc ? (bestSc * sqft) / price * 100 : 0;
  const mgmtFee = gross * 0.05;
  const netYield = gross - scDeduction - vacancyPct - mgmtFee;
  const yieldColor = netYield >= 5 ? '#27AE60' : netYield >= 3 ? '#F39C12' : '#E74C3C';

  return (
    <div className="space-y-5">
      <p className="text-micro text-text-dim">
        Community: {activeCommunity ?? 'Not selected'}
        {bestSc && ` · SC: ${bestSc} AED/sqft (Government Verified)`}
      </p>

      <div className="space-y-3">
        <div>
          <label className="text-label text-text-dim block mb-1">Gross Yield (%)</label>
          <input
            type="number"
            step="0.1"
            value={grossYield}
            onChange={(e) => setGrossYield(e.target.value)}
            placeholder="6.5"
            className="w-full bg-bg border border-border rounded px-3 py-2 text-body text-text-primary placeholder-text-dim focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="text-label text-text-dim block mb-1">Unit Size (sqft)</label>
          <input
            type="number"
            value={unitSqft}
            onChange={(e) => setUnitSqft(e.target.value)}
            placeholder="800"
            className="w-full bg-bg border border-border rounded px-3 py-2 text-body text-text-primary placeholder-text-dim focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="text-label text-text-dim block mb-1">Purchase Price (AED)</label>
          <input
            type="number"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
            placeholder="1,200,000"
            className="w-full bg-bg border border-border rounded px-3 py-2 text-body text-text-primary placeholder-text-dim focus:border-gold focus:outline-none"
          />
        </div>
      </div>

      {/* Waterfall */}
      <div className="bg-bg rounded-lg p-4 border border-border space-y-2.5">
        <div className="flex justify-between text-body">
          <span className="text-text-secondary">Gross Yield</span>
          <span className="font-mono">{fmtPct(gross)}</span>
        </div>
        <div className="flex justify-between text-body">
          <span className="text-text-secondary">Minus Service Charges</span>
          <span className="font-mono text-danger">-{fmtPct(scDeduction)}</span>
        </div>
        <div className="flex justify-between text-body">
          <span className="text-text-secondary">Minus Void Allowance</span>
          <span className="font-mono text-danger">-{fmtPct(vacancyPct)}</span>
        </div>
        <div className="flex justify-between text-body">
          <span className="text-text-secondary">Minus Management (5%)</span>
          <span className="font-mono text-danger">-{fmtPct(mgmtFee)}</span>
        </div>
        <div className="border-t border-border pt-2.5 flex justify-between">
          <span className="text-subheading font-semibold">Net Yield After All Deductions</span>
          <span className="text-subheading font-semibold font-mono" style={{ color: yieldColor }}>
            {fmtPct(netYield)}
          </span>
        </div>
      </div>
    </div>
  );
}
