import { useState } from 'react';
import { useNavStore } from '@/store/navigation';
import { Badge } from '@/components/trust/Badge';
import { Verdict } from '@/components/trust/Verdict';
import { Search, Loader2 } from 'lucide-react';

export function DealAudit() {
  const { activeCommunity, activeTower } = useNavStore();
  const [step, setStep] = useState(1);
  const [property, setProperty] = useState(activeTower ?? activeCommunity ?? '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(false);

  const runAudit = () => {
    setLoading(true);
    // Simulate audit — in production, runs all Analyse queries simultaneously
    setTimeout(() => {
      setLoading(false);
      setResult(true);
    }, 1500);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="animate-spin text-gold" size={28} />
        <span className="text-body text-text-secondary">Running 5-layer intelligence audit...</span>
      </div>
    );
  }

  if (result) {
    return (
      <div className="space-y-4">
        <h3 className="text-subheading font-medium">Audit Complete: {property}</h3>

        {[
          { label: 'Price Truth', badge: 'VERIFIED' as const, detail: 'Transaction history verified against DLD records' },
          { label: 'Blocking Risk', badge: 'HIGH_CONFIDENCE' as const, detail: 'View corridor analysis from satellite + planning data' },
          { label: 'SC Reality', badge: 'VERIFIED' as const, detail: 'Mollak-verified service charges cross-referenced' },
          { label: 'Developer Score', badge: 'HIGH_CONFIDENCE' as const, detail: 'Multi-source credibility assessment complete' },
          { label: 'Capital Context', badge: 'INFERRED' as const, detail: 'Capital quality and rotation position modelled' },
        ].map((layer, i) => (
          <div key={i} className="bg-bg rounded-lg p-3 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-body font-medium text-text-primary">{layer.label}</span>
              <Badge level={layer.badge} />
            </div>
            <p className="text-micro text-text-secondary">{layer.detail}</p>
          </div>
        ))}

        <Verdict
          verdict="NEGOTIATE"
          reasoning="Deal audit identifies verified pricing with moderate blocking risk. Specific negotiation leverage available through service charge discrepancy and upcoming supply."
          conditions={[
            'Negotiate based on verified SC differential',
            'Account for blocking risk above floor 12',
          ]}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Step 1 */}
      <div>
        <label className="text-label text-text-dim uppercase tracking-wider block mb-2">
          Step {step}: {step === 1 ? 'Property Details' : step === 2 ? 'Audit Depth' : 'Agent Claims'}
        </label>

        {step === 1 && (
          <div className="space-y-3">
            <input
              type="text"
              value={property}
              onChange={(e) => setProperty(e.target.value)}
              placeholder="Tower or community name"
              className="w-full bg-bg border border-border rounded px-3 py-2 text-body text-text-primary placeholder-text-dim focus:border-gold focus:outline-none"
            />
            <button
              onClick={() => setStep(2)}
              disabled={!property}
              className="w-full bg-gold/15 text-gold py-2 rounded text-body font-medium hover:bg-gold/25 transition-colors disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            {['Quick Scan', 'Standard Audit', 'Deep Investigation'].map((depth) => (
              <button
                key={depth}
                onClick={() => setStep(3)}
                className="w-full bg-bg border border-border rounded px-3 py-2.5 text-body text-text-primary text-left hover:border-gold/30 transition-colors"
              >
                {depth}
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <textarea
              placeholder="Paste agent claims to verify (optional)"
              rows={4}
              className="w-full bg-bg border border-border rounded px-3 py-2 text-body text-text-primary placeholder-text-dim focus:border-gold focus:outline-none resize-none"
            />
            <button
              onClick={runAudit}
              className="w-full bg-gold text-bg py-2.5 rounded text-body font-semibold hover:bg-gold/90 transition-colors flex items-center justify-center gap-2"
            >
              <Search size={14} />
              Run Deal Audit
            </button>
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="flex gap-1">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`flex-1 h-1 rounded ${s <= step ? 'bg-gold' : 'bg-white/5'}`}
          />
        ))}
      </div>
    </div>
  );
}
