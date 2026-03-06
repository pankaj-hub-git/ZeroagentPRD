import { useEffect, useState } from 'react';
import { sb } from '@/lib/supabase';
import { SQM_TO_SQFT } from '@/lib/constants';

/* ── Tab 1: Overview ───────────────────────────────────── */
export interface OverviewStats {
  txnCount: number;
  avgPsfSqft: number;
  avgPrice: number;
}

export interface CapitalContext {
  capitalQualityScore: number;
  rotationOrigin: string;
  hardCapitalRatio: number;
  qoqTrajectory: string;
}

export function useOverviewData(community: string | null) {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [capital, setCapital] = useState<CapitalContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!community) return;
    setLoading(true);
    const run = async () => {
      const [txnRes, capRes] = await Promise.all([
        sb.rpc('get_overview_stats', { community_filter: community }).single(),
        sb
          .from('gold.capital_flow_summary')
          .select('capital_quality_score, rotation_origin, hard_capital_ratio, qoq_trajectory')
          .ilike('area_name', `%${community}%`)
          .limit(1)
          .maybeSingle(),
      ]);

      if (txnRes.data) {
        const d = txnRes.data as Record<string, number>;
        setStats({
          txnCount: d.txn_count ?? 0,
          avgPsfSqft: (d.avg_psf ?? 0) / SQM_TO_SQFT,
          avgPrice: d.avg_price ?? 0,
        });
      }

      if (capRes.data) {
        const c = capRes.data as Record<string, unknown>;
        setCapital({
          capitalQualityScore: (c.capital_quality_score as number) ?? 0,
          rotationOrigin: (c.rotation_origin as string) ?? '',
          hardCapitalRatio: (c.hard_capital_ratio as number) ?? 0,
          qoqTrajectory: (c.qoq_trajectory as string) ?? '',
        });
      }
      setLoading(false);
    };
    run();
  }, [community]);

  return { stats, capital, loading };
}

/* ── Tab 2: Phase Intelligence ─────────────────────────── */
export interface PhaseRow {
  phaseName: string;
  status: string;
  completionPct: number;
  unitsTotal: number;
  unitsDelivered: number;
  scPsf: number;
  developer: string;
  launchDate: string;
  handoverDate: string;
}

export function usePhaseData(community: string | null) {
  const [phases, setPhases] = useState<PhaseRow[]>([]);
  const [satellite, setSatellite] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!community) return;
    setLoading(true);
    const run = async () => {
      const [phRes, satRes] = await Promise.all([
        sb
          .from('gold.phase_registry')
          .select('phase_name, status, completion_pct, units_total, units_delivered, sc_psf, developer, launch_date, handover_date')
          .ilike('community', `%${community}%`)
          .order('launch_date', { ascending: true }),
        sb
          .from('bronze.masterplan_gee_queue')
          .select('community_name, amenity_class, delivery_verdict, gee_composite_end')
          .ilike('community_name', `%${community}%`)
          .eq('gee_status', 'DONE'),
      ]);

      if (phRes.data) {
        setPhases(
          phRes.data.map((r: Record<string, unknown>) => ({
            phaseName: r.phase_name as string,
            status: r.status as string,
            completionPct: r.completion_pct as number,
            unitsTotal: r.units_total as number,
            unitsDelivered: r.units_delivered as number,
            scPsf: r.sc_psf as number,
            developer: r.developer as string,
            launchDate: r.launch_date as string,
            handoverDate: r.handover_date as string,
          }))
        );
      }
      if (satRes.data) setSatellite(satRes.data as Record<string, unknown>[]);
      setLoading(false);
    };
    run();
  }, [community]);

  return { phases, satellite, loading };
}

/* ── Tab 3: Blocking Engine ────────────────────────────── */
export interface BlockingRow {
  viewName: string;
  viewType: string;
  blockerName: string;
  blockerStatus: string;
  riskScore: number;
  safeAboveFloor: number;
  timeline: string;
  pctBlocked: number;
  blockSeverity: string;
}

export function useBlockingData(tower: string | null, community: string | null) {
  const [blocks, setBlocks] = useState<BlockingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tower && !community) return;
    setLoading(true);
    const run = async () => {
      let query = sb
        .from('gold.view_blocking_v3')
        .select('view_name, view_type, blocker_name, blocker_status, risk_score, safe_above_floor, timeline, pct_of_view_blocked, block_severity')
        .order('risk_score', { ascending: false });

      if (tower) {
        query = query.ilike('observer_name', `%${tower}%`);
      } else if (community) {
        query = query.ilike('observer_project', `%${community}%`);
      }

      const { data } = await query;
      if (data) {
        setBlocks(
          data.map((r: Record<string, unknown>) => ({
            viewName: r.view_name as string,
            viewType: r.view_type as string,
            blockerName: r.blocker_name as string,
            blockerStatus: r.blocker_status as string,
            riskScore: r.risk_score as number,
            safeAboveFloor: r.safe_above_floor as number,
            timeline: r.timeline as string,
            pctBlocked: r.pct_of_view_blocked as number,
            blockSeverity: r.block_severity as string,
          }))
        );
      }
      setLoading(false);
    };
    run();
  }, [tower, community]);

  return { blocks, loading };
}

/* ── Tab 4: Service Charges ────────────────────────────── */
export interface SCRow {
  phaseName: string;
  mollakSc: number;
  reportedSc: number;
  bestSc: number;
  scStatus: string;
  scNote: string;
  mollakYear: number;
}

export interface YieldRow {
  grossYieldPct: number;
  vacancyProxyPct: number;
  avgAnnualRent: number;
  avgPurchasePrice: number;
}

export function useSCData(project: string | null, community: string | null) {
  const [sc, setSc] = useState<SCRow[]>([]);
  const [yield_, setYield] = useState<YieldRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!project && !community) return;
    setLoading(true);
    const run = async () => {
      const pattern = project ? `%${project}%` : `%${community}%`;
      const [scRes, yieldRes] = await Promise.all([
        sb
          .from('gold.sc_truth_layer')
          .select('phase_name, mollak_sc, reported_sc, best_sc, sc_status, sc_note, mollak_year')
          .ilike('phase_name', pattern)
          .order('phase_name'),
        sb
          .from('gold.rental_yield')
          .select('gross_yield_pct, vacancy_proxy_pct, avg_annual_rent, avg_purchase_price')
          .ilike('area_name', `%${community ?? project}%`)
          .limit(1)
          .maybeSingle(),
      ]);

      if (scRes.data) {
        setSc(
          scRes.data.map((r: Record<string, unknown>) => ({
            phaseName: r.phase_name as string,
            mollakSc: r.mollak_sc as number,
            reportedSc: r.reported_sc as number,
            bestSc: r.best_sc as number,
            scStatus: r.sc_status as string,
            scNote: r.sc_note as string,
            mollakYear: r.mollak_year as number,
          }))
        );
      }
      if (yieldRes.data) {
        const y = yieldRes.data as Record<string, number>;
        setYield({
          grossYieldPct: y.gross_yield_pct ?? 0,
          vacancyProxyPct: y.vacancy_proxy_pct ?? 0,
          avgAnnualRent: y.avg_annual_rent ?? 0,
          avgPurchasePrice: y.avg_purchase_price ?? 0,
        });
      }
      setLoading(false);
    };
    run();
  }, [project, community]);

  return { sc, yield: yield_, loading };
}

/* ── Tab 5: Handover Predictor ─────────────────────────── */
export interface HandoverRow {
  phaseName: string;
  community: string;
  developer: string;
  unitsCount: number;
  handoverDate: string;
  completionPct: number;
  geeBuiltPct: number;
}

export function useHandoverData(community: string | null) {
  const [upcoming, setUpcoming] = useState<HandoverRow[]>([]);
  const [comparables, setComparables] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!community) return;
    setLoading(true);
    const run = async () => {
      const [upRes, compRes] = await Promise.all([
        sb
          .from('gold.phase_registry')
          .select('phase_name, community, developer, units_total, handover_date, completion_pct')
          .ilike('community', `%${community}%`)
          .gt('handover_date', new Date().toISOString())
          .order('handover_date', { ascending: true }),
        sb
          .from('gold.phase_signals')
          .select('*')
          .eq('target_community', community)
          .order('similarity_score', { ascending: false })
          .limit(3),
      ]);

      if (upRes.data) {
        setUpcoming(
          upRes.data.map((r: Record<string, unknown>) => ({
            phaseName: r.phase_name as string,
            community: r.community as string,
            developer: r.developer as string,
            unitsCount: r.units_total as number,
            handoverDate: r.handover_date as string,
            completionPct: r.completion_pct as number,
            geeBuiltPct: 0,
          }))
        );
      }
      if (compRes.data) setComparables(compRes.data as Record<string, unknown>[]);
      setLoading(false);
    };
    run();
  }, [community]);

  return { upcoming, comparables, loading };
}

/* ── Tab 6: Developer Truth ────────────────────────────── */
export interface DevScore {
  developerName: string;
  overallScore: number;
  deliveryRecordScore: number;
  amenityDeliveryRate: number;
  financialStressScore: number;
  constructionProgressScore: number;
  socialSignalScore: number;
  projectsVerified: number;
  lastUpdated: string;
}

export function useDeveloperTruthData(developer: string | null) {
  const [score, setScore] = useState<DevScore | null>(null);
  const [amenities, setAmenities] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!developer) return;
    setLoading(true);
    const run = async () => {
      const [scoreRes, amenityRes] = await Promise.all([
        sb
          .from('gold.developer_scores')
          .select('*')
          .ilike('developer_name', `%${developer}%`)
          .limit(1)
          .maybeSingle(),
        sb
          .from('bronze.masterplan_gee_queue')
          .select('amenity_class, delivery_verdict, delivery_score, gee_composite_end, verdict_logic')
          .ilike('master_developer', `%${developer}%`)
          .eq('gee_status', 'DONE'),
      ]);

      if (scoreRes.data) {
        const s = scoreRes.data as Record<string, unknown>;
        setScore({
          developerName: s.developer_name as string,
          overallScore: s.overall_score as number,
          deliveryRecordScore: s.delivery_record_score as number,
          amenityDeliveryRate: s.amenity_delivery_rate as number,
          financialStressScore: s.financial_stress_score as number,
          constructionProgressScore: s.construction_progress_score as number,
          socialSignalScore: s.social_signal_score as number,
          projectsVerified: s.projects_verified as number,
          lastUpdated: s.last_updated_at as string,
        });
      }
      if (amenityRes.data) setAmenities(amenityRes.data as Record<string, unknown>[]);
      setLoading(false);
    };
    run();
  }, [developer]);

  return { score, amenities, loading };
}
