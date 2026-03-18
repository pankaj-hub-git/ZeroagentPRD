import { useEffect, useState } from 'react';
import { sb } from '@/lib/supabase';
import type {
  TransactionGuide,
  GuideStep,
  GuideCost,
  GuideDocument,
  GuideRightDuty,
  GuideWarning,
  AudienceFilter,
} from '@/types/procedure';

/* ── All guides (landing page) ───────────────────────────── */
export function useGuides(audience: AudienceFilter) {
  const [guides, setGuides] = useState<TransactionGuide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const run = async () => {
      let query = sb
        .from('transaction_guides')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (audience !== 'all') {
        query = query.or(`target_audience.eq.${audience},target_audience.eq.all`);
      }

      const { data } = await query;
      if (!cancelled && data) {
        setGuides(data as TransactionGuide[]);
      }
      if (!cancelled) setLoading(false);
    };

    run();
    return () => { cancelled = true; };
  }, [audience]);

  return { guides, loading };
}

/* ── Full guide detail (detail page) ─────────────────────── */
export function useGuideDetail(guideType: string | undefined) {
  const [guide, setGuide] = useState<TransactionGuide | null>(null);
  const [steps, setSteps] = useState<GuideStep[]>([]);
  const [costs, setCosts] = useState<GuideCost[]>([]);
  const [documents, setDocuments] = useState<GuideDocument[]>([]);
  const [rights, setRights] = useState<GuideRightDuty[]>([]);
  const [warnings, setWarnings] = useState<GuideWarning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!guideType) return;

    let cancelled = false;
    setLoading(true);

    const run = async () => {
      // First: get the guide record
      const { data: guideData } = await sb
        .from('transaction_guides')
        .select('*')
        .eq('guide_type', guideType)
        .single();

      if (cancelled || !guideData) {
        if (!cancelled) setLoading(false);
        return;
      }

      const g = guideData as TransactionGuide;
      setGuide(g);

      // Parallel fetch all child tables
      const [stepsRes, costsRes, docsRes, rightsRes, warningsRes] = await Promise.all([
        sb.from('guide_steps').select('*').eq('guide_id', g.id).order('step_number'),
        sb.from('guide_costs').select('*').eq('guide_id', g.id).order('display_order'),
        sb.from('guide_documents').select('*').eq('guide_id', g.id).order('display_order'),
        sb.from('guide_rights_duties').select('*').eq('guide_id', g.id).order('display_order'),
        sb.from('guide_warnings').select('*').eq('guide_id', g.id).order('display_order'),
      ]);

      if (cancelled) return;

      setSteps((stepsRes.data as GuideStep[]) ?? []);
      setCosts((costsRes.data as GuideCost[]) ?? []);
      setDocuments((docsRes.data as GuideDocument[]) ?? []);
      setRights((rightsRes.data as GuideRightDuty[]) ?? []);
      setWarnings((warningsRes.data as GuideWarning[]) ?? []);
      setLoading(false);
    };

    run();
    return () => { cancelled = true; };
  }, [guideType]);

  return { guide, steps, costs, documents, rights, warnings, loading };
}
