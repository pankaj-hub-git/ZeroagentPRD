import { useState } from 'react';
import { useNavStore } from '@/store/navigation';
import { fmtAed, fmtPct } from '@/lib/constants';

export function FlipCalc() {
  const { activeCommunity } = useNavStore();
  const [buyPrice, setBuyPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [holdMonths, setHoldMonths] = useState('12');
  const [result, setResult] = useState<{
    grossProfit: number;
    dldBuyFee: number;
    dldSellFee: number;
    agentFee: number;
    netProfit: number;
    roi: number;
  } | null>(null);

  const calculate = () => {
    const buy = parseFloat(buyPrice);
    const sell = parseFloat(sellPrice);
    if (!buy || !sell) return;

    const dldBuyFee = buy * 0.04;
    const dldSellFee = sell * 0.04;
    const agentFee = sell * 0.02;
    const grossProfit = sell - buy;
    const netProfit = grossProfit - dldBuyFee - dldSellFee - agentFee;
    const roi = (netProfit / buy) * 100;

    setResult({ grossProfit, dldBuyFee, dldSellFee, agentFee, netProfit, roi });
  };

  return (
    <div className="space-y-5">
      <p className="text-micro text-text-dim">
        Community: {activeCommunity ?? 'Not selected'}
      </p>

      <div className="space-y-3">
        <div>
          <label className="text-label text-text-dim block mb-1">Buy Price (AED)</label>
          <input
            type="number"
            value={buyPrice}
            onChange={(e) => setBuyPrice(e.target.value)}
            placeholder="1,500,000"
            className="w-full bg-bg border border-border rounded px-3 py-2 text-body text-text-primary placeholder-text-dim focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="text-label text-text-dim block mb-1">Target Sell Price (AED)</label>
          <input
            type="number"
            value={sellPrice}
            onChange={(e) => setSellPrice(e.target.value)}
            placeholder="1,800,000"
            className="w-full bg-bg border border-border rounded px-3 py-2 text-body text-text-primary placeholder-text-dim focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="text-label text-text-dim block mb-1">Hold Period (months)</label>
          <input
            type="number"
            value={holdMonths}
            onChange={(e) => setHoldMonths(e.target.value)}
            className="w-full bg-bg border border-border rounded px-3 py-2 text-body text-text-primary focus:border-gold focus:outline-none"
          />
        </div>

        <button
          onClick={calculate}
          disabled={!buyPrice || !sellPrice}
          className="w-full bg-gold text-bg py-2.5 rounded text-body font-semibold hover:bg-gold/90 transition-colors disabled:opacity-40"
        >
          Calculate P&L
        </button>
      </div>

      {result && (
        <div className="bg-bg rounded-lg p-4 border border-border space-y-2.5">
          <div className="flex justify-between text-body">
            <span className="text-text-secondary">Gross Profit</span>
            <span className="font-mono">{fmtAed(result.grossProfit)}</span>
          </div>
          <div className="flex justify-between text-body">
            <span className="text-text-secondary">DLD Fee (Buy 4%)</span>
            <span className="font-mono text-danger">-{fmtAed(result.dldBuyFee)}</span>
          </div>
          <div className="flex justify-between text-body">
            <span className="text-text-secondary">DLD Fee (Sell 4%)</span>
            <span className="font-mono text-danger">-{fmtAed(result.dldSellFee)}</span>
          </div>
          <div className="flex justify-between text-body">
            <span className="text-text-secondary">Agent Fee (2%)</span>
            <span className="font-mono text-danger">-{fmtAed(result.agentFee)}</span>
          </div>
          <div className="border-t border-border pt-2.5 flex justify-between">
            <span className="text-subheading font-semibold">Net Profit</span>
            <span
              className="text-subheading font-semibold font-mono"
              style={{ color: result.netProfit > 0 ? '#27AE60' : '#E74C3C' }}
            >
              {fmtAed(result.netProfit)}
            </span>
          </div>
          <div className="flex justify-between text-body">
            <span className="text-text-secondary">ROI</span>
            <span
              className="font-mono font-medium"
              style={{ color: result.roi > 0 ? '#27AE60' : '#E74C3C' }}
            >
              {fmtPct(result.roi)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
