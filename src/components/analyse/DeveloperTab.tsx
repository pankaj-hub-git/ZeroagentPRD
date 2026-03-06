import { useDeveloperTruthData } from '@/hooks/useAnalyseData';
import { Badge } from '@/components/trust/Badge';
import { Verdict } from '@/components/trust/Verdict';
import { ScoreRing } from '@/components/trust/ScoreRing';
import { VerificationChain } from '@/components/trust/VerificationChain';
import { fmtDate, fmtPct } from '@/lib/constants';
import { Loader2 } from 'lucide-react';

interface Props {
  developer: string | null;
}

export function DeveloperTab({ developer }: Props) {
  const { score, amenities, loading } = useDeveloperTruthData(developer);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-gold" size={24} />
      </div>
    );
  }

  if (!score) {
    return (
      <div className="text-center py-20 text-text-dim text-body">
        No developer data available. Select a community with a known developer.
      </div>
    );
  }

  // Aggregate amenity verdicts
  const verdictCounts = amenities.reduce<{ delivered: number; partial: number; notDelivered: number }>(
    (acc, a) => {
      const v = a.delivery_verdict as string;
      if (v === 'DELIVERED') acc.delivered++;
      else if (v === 'PARTIAL') acc.partial++;
      else if (v === 'NOT_DELIVERED') acc.notDelivered++;
      return acc;
    },
    { delivered: 0, partial: 0, notDelivered: 0 }
  );

  const latestImagery = amenities.length > 0
    ? (amenities[amenities.length - 1].gee_composite_end as string)
    : null;

  return (
    <div className="space-y-6">
      {/* Developer Score Card */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-subheading font-medium">{score.developerName}</h3>
          <Badge level="HIGH_CONFIDENCE" />
        </div>
        <div className="flex items-start gap-8">
          <div className="relative">
            <ScoreRing score={score.overallScore} label="Overall Score" size={100} />
          </div>
          <div className="flex-1 grid grid-cols-2 gap-3">
            <div className="flex justify-between text-body">
              <span className="text-text-secondary">Delivery Record</span>
              <span className="font-mono">{score.deliveryRecordScore}/100</span>
            </div>
            <div className="flex justify-between text-body">
              <span className="text-text-secondary">Amenity Delivery</span>
              <span className="font-mono">{fmtPct(score.amenityDeliveryRate)}</span>
            </div>
            <div className="flex justify-between text-body">
              <span className="text-text-secondary">Financial Stress</span>
              <span className="font-mono">{score.financialStressScore}/100</span>
            </div>
            <div className="flex justify-between text-body">
              <span className="text-text-secondary">Construction Progress</span>
              <span className="font-mono">{score.constructionProgressScore}/100</span>
            </div>
            <div className="flex justify-between text-body">
              <span className="text-text-secondary">Social Signal</span>
              <span className="font-mono">{score.socialSignalScore}/100</span>
            </div>
            <div className="flex justify-between text-body">
              <span className="text-text-secondary">Projects Verified</span>
              <span className="font-mono">{score.projectsVerified}</span>
            </div>
          </div>
        </div>
        <p className="text-micro text-text-dim mt-3">
          Last updated: {score.lastUpdated ? fmtDate(score.lastUpdated) : '—'}
        </p>
      </div>

      {/* Amenity Satellite Evidence */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-subheading font-medium">Amenity Delivery — Satellite Evidence</h3>
          <Badge level="VERIFIED" />
        </div>
        <div className="grid grid-cols-3 gap-4 mb-3">
          <div className="bg-bg rounded-lg p-3 text-center border border-verified/20">
            <div className="text-heading font-semibold text-verified">{verdictCounts.delivered}</div>
            <div className="text-micro text-text-dim">Delivered</div>
          </div>
          <div className="bg-bg rounded-lg p-3 text-center border border-warn/20">
            <div className="text-heading font-semibold text-warn">{verdictCounts.partial}</div>
            <div className="text-micro text-text-dim">Partial</div>
          </div>
          <div className="bg-bg rounded-lg p-3 text-center border border-danger/20">
            <div className="text-heading font-semibold text-danger">{verdictCounts.notDelivered}</div>
            <div className="text-micro text-text-dim">Not Delivered</div>
          </div>
        </div>
        {latestImagery && (
          <p className="text-micro text-text-dim">
            Imagery as of {fmtDate(latestImagery)} — Satellite Analysis Verified
          </p>
        )}
      </div>

      {/* Verification Chain */}
      <VerificationChain
        verified={{
          government: true,
          registry: true,
          satellite: amenities.length > 0,
          financial: score.financialStressScore > 0,
          ai: true,
          community: score.socialSignalScore > 0,
        }}
      />

      <Verdict
        verdict={score.overallScore >= 70 ? 'BUY' : score.overallScore >= 50 ? 'NEGOTIATE' : 'AVOID'}
        reasoning={
          score.overallScore >= 70
            ? `${score.developerName} demonstrates strong credibility across ${score.projectsVerified} verified projects. Delivery record and satellite confirmation support developer claims.`
            : score.overallScore >= 50
            ? `${score.developerName} shows mixed credibility signals. Amenity delivery rate requires closer inspection. Financial stress indicators warrant caution.`
            : `${score.developerName} shows concerning signals across multiple verification dimensions. High financial stress and low amenity delivery rate present material risk.`
        }
      />
    </div>
  );
}
