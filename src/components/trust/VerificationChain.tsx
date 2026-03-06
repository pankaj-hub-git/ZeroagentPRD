import { CheckCircle, Circle } from 'lucide-react';

const CHAIN_ITEMS = [
  { label: 'Government Records', key: 'government' },
  { label: 'Development Registry', key: 'registry' },
  { label: 'Satellite Analysis', key: 'satellite' },
  { label: 'Financial Filings', key: 'financial' },
  { label: 'AI Analysis', key: 'ai' },
  { label: 'Community Intelligence', key: 'community' },
] as const;

interface VerificationChainProps {
  verified: Record<string, boolean>;
}

export function VerificationChain({ verified }: VerificationChainProps) {
  const confirmedCount = Object.values(verified).filter(Boolean).length;

  return (
    <div className="rounded-lg bg-surface border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-label text-text-dim uppercase tracking-wider">
          Verification Chain
        </span>
        <span className="text-micro text-gold">
          {confirmedCount}/{CHAIN_ITEMS.length} sources confirmed
        </span>
      </div>
      <div className="space-y-2">
        {CHAIN_ITEMS.map((item) => {
          const ok = verified[item.key];
          return (
            <div key={item.key} className="flex items-center gap-2.5 text-body">
              {ok ? (
                <CheckCircle size={14} className="text-verified shrink-0" />
              ) : (
                <Circle size={14} className="text-text-dim shrink-0" />
              )}
              <span className={ok ? 'text-text-primary' : 'text-text-dim'}>
                {item.label}
              </span>
              {ok && <span className="text-verified text-micro ml-auto">Confirmed</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
