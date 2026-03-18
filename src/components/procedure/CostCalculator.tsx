import { useState, useEffect } from 'react';
import { Calculator } from 'lucide-react';
import type { GuideCost } from '@/types/procedure';
import { useProcedureStore } from '@/store/procedure';

function formatAED(n: number): string {
  return 'AED ' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function computeCost(cost: GuideCost, propertyValue: number): number {
  if (cost.cost_type === 'percentage' && cost.percentage_value != null) {
    return propertyValue * (cost.percentage_value / 100);
  }
  if (cost.cost_type === 'fixed' && cost.fixed_amount_aed != null) {
    return cost.fixed_amount_aed;
  }
  if (cost.cost_type === 'variable') {
    if (cost.min_amount_aed != null && cost.max_amount_aed != null) {
      return (cost.min_amount_aed + cost.max_amount_aed) / 2;
    }
    if (cost.fixed_amount_aed != null) return cost.fixed_amount_aed;
  }
  if (cost.cost_type === 'negotiable') {
    if (cost.percentage_value != null) return propertyValue * (cost.percentage_value / 100);
    if (cost.fixed_amount_aed != null) return cost.fixed_amount_aed;
  }
  return 0;
}

function costDisplay(cost: GuideCost, propertyValue: number): string {
  if (cost.cost_type === 'percentage' && cost.percentage_value != null) {
    return formatAED(propertyValue * (cost.percentage_value / 100));
  }
  if (cost.cost_type === 'fixed' && cost.fixed_amount_aed != null) {
    return formatAED(cost.fixed_amount_aed);
  }
  if (cost.cost_type === 'variable') {
    if (cost.min_amount_aed != null && cost.max_amount_aed != null) {
      return `${formatAED(cost.min_amount_aed)} - ${formatAED(cost.max_amount_aed)}`;
    }
    if (cost.fixed_amount_aed != null) return formatAED(cost.fixed_amount_aed);
  }
  if (cost.cost_type === 'negotiable') {
    if (cost.percentage_value != null) return formatAED(propertyValue * (cost.percentage_value / 100));
    if (cost.fixed_amount_aed != null) return formatAED(cost.fixed_amount_aed);
  }
  return 'Variable';
}

function typeLabel(cost: GuideCost): string {
  if (cost.cost_type === 'percentage' && cost.percentage_value != null) {
    return `${cost.percentage_value}% of value`;
  }
  if (cost.cost_type === 'fixed') return 'Fixed';
  if (cost.cost_type === 'variable') return 'Variable';
  if (cost.cost_type === 'negotiable') return 'Negotiable';
  return cost.cost_type;
}

const paidByColor: Record<string, string> = {
  buyer: 'text-verified',
  seller: 'text-warn',
  shared: 'text-info',
  tenant: 'text-info',
  landlord: 'text-warn',
};

interface Props {
  costs: GuideCost[];
}

export function CostCalculator({ costs }: Props) {
  const { calculatorPropertyValue, setCalculatorPropertyValue } = useProcedureStore();
  const [inputValue, setInputValue] = useState(calculatorPropertyValue.toLocaleString('en-US'));

  useEffect(() => {
    const timer = setTimeout(() => {
      const parsed = Number(inputValue.replace(/[^0-9]/g, ''));
      if (parsed > 0) setCalculatorPropertyValue(parsed);
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue, setCalculatorPropertyValue]);

  const pv = calculatorPropertyValue;
  const total = costs.reduce((sum, c) => sum + computeCost(c, pv), 0);
  const buyerTotal = costs.filter((c) => c.paid_by === 'buyer').reduce((sum, c) => sum + computeCost(c, pv), 0);
  const sellerTotal = costs.filter((c) => c.paid_by === 'seller').reduce((sum, c) => sum + computeCost(c, pv), 0);

  return (
    <div>
      {/* Calculator Box */}
      <div className="bg-surface border border-border rounded-lg p-6 mb-6">
        <div className="flex items-center gap-2 text-text-dim text-label tracking-[2px] uppercase font-semibold mb-4">
          <Calculator size={14} />
          COST CALCULATOR
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-4">
          <label className="text-text-secondary text-body whitespace-nowrap">
            Property Value (AED):
          </label>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9]/g, '');
              setInputValue(raw ? Number(raw).toLocaleString('en-US') : '');
            }}
            className="bg-[#131326] border border-border rounded px-4 py-2 text-text-primary text-body w-full sm:w-64 focus:border-gold focus:outline-none"
          />
        </div>

        <div className="text-gold text-[20px] font-bold mb-2">
          ESTIMATED TOTAL: {formatAED(total)}
          <span className="text-text-secondary text-body font-normal ml-2">
            ({pv > 0 ? ((total / pv) * 100).toFixed(1) : '0'}% of property value)
          </span>
        </div>

        <div className="flex flex-wrap gap-6 text-body">
          {buyerTotal > 0 && (
            <span className="text-text-secondary">
              Buyer Pays: <span className="text-verified font-semibold">{formatAED(buyerTotal)}</span>
            </span>
          )}
          {sellerTotal > 0 && (
            <span className="text-text-secondary">
              Seller Pays: <span className="text-warn font-semibold">{formatAED(sellerTotal)}</span>
            </span>
          )}
        </div>
      </div>

      {/* Cost Table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-body">
            <thead>
              <tr className="bg-[#131326] text-text-dim text-label uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-semibold">Cost</th>
                <th className="text-left px-4 py-3 font-semibold">Paid By</th>
                <th className="text-left px-4 py-3 font-semibold">Type</th>
                <th className="text-right px-4 py-3 font-semibold">Amount (AED)</th>
                <th className="text-center px-4 py-3 font-semibold">Required</th>
              </tr>
            </thead>
            <tbody>
              {costs.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-text-primary">
                    {c.cost_name}
                    {c.notes && (
                      <div className="text-text-dim text-label mt-0.5">{c.notes}</div>
                    )}
                  </td>
                  <td className={`px-4 py-3 font-semibold text-label uppercase ${paidByColor[c.paid_by] ?? 'text-text-secondary'}`}>
                    {c.paid_by.toUpperCase()}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{typeLabel(c)}</td>
                  <td className="px-4 py-3 text-right text-text-primary font-mono">
                    {costDisplay(c, pv)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.is_mandatory ? (
                      <span className="text-verified">&#9679;</span>
                    ) : (
                      <span className="text-text-dim">&#9675;</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
