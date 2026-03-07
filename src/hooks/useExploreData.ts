import { useEffect, useState, useMemo } from 'react';
import { sb, gold, silver, bronze } from '@/lib/supabase';
import { SQM_TO_SQFT } from '@/lib/constants';
import { useNavigation } from './useNavigation';
import type { NavCommunity } from '@/types/database';

/* ── Dropdown Options ──────────────────────────────────────── */
export interface AreaOption { area: string; communityCount: number }
export interface ProjectOption {
  id: string;
  name: string;
  developer: string;
  community: string;
  status: string;
  totalFloors: number;
  totalUnits: number;
}
export interface DeveloperOption {
  developer: string;
  brandTier: string;
  totalProjects: number;
  deliveryRate: number;
  buildQuality: number;
}

/* ── Tab Data Types ────────────────────────────────────────── */
export interface PhaseItem {
  phaseName: string;
  masterProject: string;
  launchPsf: number;
  currentPsf: number;
  returnPct: number;
  momentum: string;
  completionPct: number;
  launchDate: string;
  latestTxnDate: string;
  developer: string;
  developerTier: string;
}

export interface ViewBlockItem {
  viewName: string;
  viewType: string;
  blockerName: string;
  blockerStatus: string;
  riskScore: number;
  safeAboveFloor: number;
  timeline: string;
  pctBlocked: number;
  severity: string;
}

export interface SCTruthItem {
  phaseName: string;
  mollakSc: number;
  reportedSc: number;
  bestSc: number;
  scStatus: string;
  scNote: string;
  mollakYear: number;
}

export interface SCTrajectoryItem {
  projectName: string;
  budgetYear: number;
  serviceChargeSqft: number;
  yoyChangePct: number;
}

export interface DeveloperScoreItem {
  developer: string;
  deliveryRate: number;
  avgDelayMonths: number;
  buildQuality: number;
  afterSales: number;
  brandTier: string;
  totalProjects: number;
  notableProjects: string;
  redFlags: string;
}

export interface ProgressData {
  ddaCompletion: number;
  salesCount: number;
  hiddenInventory: number;
  conflictFlag: boolean;
  conflictType: string | null;
  satelliteBreakdown: SatelliteBreakdownItem[];
}

export interface SatelliteBreakdownItem {
  class: string;
  delivered: number;
  partial: number;
  notDelivered: number;
  avgScore: number;
  imageryDate: string | null;
}

export interface AmenityItem {
  amenityClass: string;
  deliveryVerdict: string;
  deliveryScore: number;
  imageryDate: string | null;
  verdictLogic: string;
}

export interface CatalystItem {
  name: string;
  type: string;
  status: string;
  announcedDate: string;
  expectedCompletion: string | null;
  impactScore: number;
  impactMagnitude: string | null;
  description: string;
  investmentAed: number | null;
}

export interface LivabilityData {
  viewScore: number;
  amenityScore: number;
  transitScore: number;
  constructionDisruption: number;
  supplyPressure: number;
  livabilityScore: number;
  grade: string;
}

export interface NationalityRow {
  nationality: string;
  pct: number;
  quarterStart: string;
}

export interface GovAlignmentData {
  governmentAlignmentScore: number;
  metroStatus: string;
  d33FdiTargetZone: boolean;
  goldenVisaEligible: boolean;
}

/* ── Hook Return ──────────────────────────────────────────── */
interface ExploreData {
  areas: AreaOption[];
  projects: ProjectOption[];
  developers: DeveloperOption[];
  ddLoading: boolean;

  selectedArea: string | null;
  selectedProject: string | null;
  selectedDeveloper: string | null;
  setSelectedArea: (a: string | null) => void;
  setSelectedProject: (p: string | null) => void;
  setSelectedDeveloper: (d: string | null) => void;

  /* All tab data */
  phases: PhaseItem[];
  viewBlocking: ViewBlockItem[];
  scTruth: SCTruthItem[];
  scTrajectory: SCTrajectoryItem[];
  progress: ProgressData | null;
  developerScores: DeveloperScoreItem[];
  amenities: AmenityItem[];
  catalysts: CatalystItem[];
  livability: LivabilityData | null;
  nationalityMix: NationalityRow[];
  govAlignment: GovAlignmentData | null;
  tabLoading: boolean;
}

export function useExploreData(): ExploreData {
  const { data: navData, loading: navLoading } = useNavigation();

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [developers, setDevelopers] = useState<DeveloperOption[]>([]);
  const [ddExtraLoading, setDdExtraLoading] = useState(true);

  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedDeveloper, setSelectedDeveloper] = useState<string | null>(null);

  /* Tab data state */
  const [phases, setPhases] = useState<PhaseItem[]>([]);
  const [viewBlocking, setViewBlocking] = useState<ViewBlockItem[]>([]);
  const [scTruth, setScTruth] = useState<SCTruthItem[]>([]);
  const [scTrajectory, setScTrajectory] = useState<SCTrajectoryItem[]>([]);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [developerScores, setDeveloperScores] = useState<DeveloperScoreItem[]>([]);
  const [amenities, setAmenities] = useState<AmenityItem[]>([]);
  const [catalysts, setCatalysts] = useState<CatalystItem[]>([]);
  const [livability, setLivability] = useState<LivabilityData | null>(null);
  const [nationalityMix, setNationalityMix] = useState<NationalityRow[]>([]);
  const [govAlignment, setGovAlignment] = useState<GovAlignmentData | null>(null);
  const [tabLoading, setTabLoading] = useState(false);

  /* ── Areas from navigation_hierarchy ────────────────────── */
  const areas = useMemo<AreaOption[]>(() => {
    const byArea: Record<string, Set<string>> = {};
    navData.forEach((row: NavCommunity) => {
      if (!byArea[row.area_name]) byArea[row.area_name] = new Set();
      byArea[row.area_name].add(row.community_name);
    });
    return Object.entries(byArea)
      .map(([area, communities]) => ({ area, communityCount: communities.size }))
      .sort((a, b) => b.communityCount - a.communityCount);
  }, [navData]);

  const ddLoading = navLoading || ddExtraLoading;

  /* ── Load projects + developers ─────────────────────────── */
  useEffect(() => {
    const run = async () => {
      const [projRes, devRes] = await Promise.all([
        sb.from('xray_projects')
          .select('id, project_name, developer, master_community, project_status, total_floors, total_units')
          .order('project_name'),
        gold().from('developer_scores')
          .select('developer, brand_tier, total_projects_dubai, delivery_rate_pct, build_quality_score')
          .order('brand_tier', { ascending: false }),
      ]);

      if (projRes.data) {
        setProjects(
          (projRes.data as Record<string, unknown>[]).map((r) => ({
            id: (r.id as string) ?? '',
            name: (r.project_name as string) ?? '',
            developer: (r.developer as string) ?? '',
            community: (r.master_community as string) ?? '',
            status: (r.project_status as string) ?? '',
            totalFloors: (r.total_floors as number) ?? 0,
            totalUnits: (r.total_units as number) ?? 0,
          }))
        );
      }
      if (devRes.data) {
        setDevelopers(
          (devRes.data as Record<string, unknown>[]).map((r) => ({
            developer: (r.developer as string) ?? '',
            brandTier: (r.brand_tier as string) ?? '',
            totalProjects: (r.total_projects_dubai as number) ?? 0,
            deliveryRate: (r.delivery_rate_pct as number) ?? 0,
            buildQuality: (r.build_quality_score as number) ?? 0,
          }))
        );
      }
      setDdExtraLoading(false);
    };
    run();
  }, []);

  /* ── Load ALL tab data when selection changes ───────────── */
  useEffect(() => {
    const community = selectedArea ?? selectedProject ?? null;
    if (!community) {
      setPhases([]); setViewBlocking([]); setScTruth([]); setScTrajectory([]);
      setProgress(null); setDeveloperScores([]); setAmenities([]);
      setCatalysts([]); setLivability(null); setNationalityMix([]);
      setGovAlignment(null);
      return;
    }

    setTabLoading(true);
    const run = async () => {
      // Build phase query
      let phaseQuery = gold().from('phase_registry')
        .select('phase_name, master_project_en, launch_psm, current_psm, total_return_pct, qoq_momentum, completion_pct, launch_date, latest_txn_date, developer_name, developer_tier')
        .order('launch_date');
      if (selectedDeveloper) {
        phaseQuery = phaseQuery.or(`master_project_en.ilike.%${community}%,developer_name.ilike.%${selectedDeveloper}%`);
      } else {
        phaseQuery = phaseQuery.ilike('master_project_en', `%${community}%`);
      }

      const [
        phaseRes, vbRes, scTruthRes, scTrajRes, truthRes, geeRes, devScoreRes,
        catRes, livRes, natRes, govRes,
      ] = await Promise.all([
        phaseQuery,
        // View blocking
        gold().from('view_blocking_v3')
          .select('view_name, view_type, blocker_name, blocker_status, risk_score, safe_above_floor, timeline, pct_of_view_blocked, block_severity')
          .or(`observer_name.ilike.%${community}%,observer_project.ilike.%${community}%`)
          .order('risk_score', { ascending: false }),
        // SC Truth
        gold().from('sc_truth_layer')
          .select('phase_name, mollak_sc, reported_sc, best_sc, sc_status, sc_note, mollak_year')
          .ilike('phase_name', `%${community}%`)
          .order('mollak_year', { ascending: false }),
        // SC Trajectory
        gold().from('sc_trajectory')
          .select('project_name_en, budget_year, service_charge_sqft, yoy_change_pct')
          .ilike('project_name_en', `%${community}%`)
          .order('budget_year', { ascending: true }),
        // Truth layer (handover)
        gold().from('truth_layer')
          .select('dda_completion_pct, dld_primary_sales_count, hidden_inventory, conflict_flag, conflict_type')
          .ilike('project_name_dld', `%${community}%`)
          .limit(1),
        // GEE satellite (amenities + handover)
        bronze().from('masterplan_gee_queue')
          .select('amenity_class, delivery_verdict, delivery_score, gee_composite_end, verdict_logic')
          .ilike('community_name', `%${community}%`)
          .eq('gee_status', 'DONE'),
        // Developer scores
        gold().from('developer_scores')
          .select('developer, delivery_rate_pct, avg_delay_months, build_quality_score, after_sales_score, brand_tier, total_projects_dubai, notable_projects, red_flags')
          .ilike('developer', `%${selectedDeveloper ?? community}%`)
          .limit(10),
        // Government catalysts affecting this community
        sb.from('bronze_government_catalysts')
          .select('catalyst_name, catalyst_type, current_status, announced_date, expected_completion, base_impact_score, impact_magnitude, description, estimated_investment_aed')
          .or(`affected_communities.cs.{${community}},catalyst_name.ilike.%${community}%`)
          .order('base_impact_score', { ascending: false })
          .limit(20),
        // Livability index
        gold().from('livability_index')
          .select('livability_score, livability_grade, view_score, amenity_score, transit_score, construction_disruption, supply_pressure')
          .limit(20),
        // Nationality mix — Community Demographics (NOT "DEWA")
        silver().from('dewa_nationality_mix')
          .select('nationality, pct, quarter_start')
          .eq('canonical_area', community)
          .order('quarter_start', { ascending: false })
          .limit(20),
        // Government alignment
        gold().from('government_alignment')
          .select('government_alignment_score, metro_status, d33_fdi_target_zone, golden_visa_eligible')
          .ilike('master_community', `%${community}%`)
          .limit(1)
          .maybeSingle(),
      ]);

      // ── Phases
      if (phaseRes.data) {
        setPhases(
          (phaseRes.data as Record<string, unknown>[]).map((r) => ({
            phaseName: (r.phase_name as string) ?? '',
            masterProject: (r.master_project_en as string) ?? '',
            launchPsf: Math.round(((r.launch_psm as number) ?? 0) / SQM_TO_SQFT),
            currentPsf: Math.round(((r.current_psm as number) ?? 0) / SQM_TO_SQFT),
            returnPct: Number(((r.total_return_pct as number) ?? 0).toFixed(1)),
            momentum: (r.qoq_momentum as string) ?? 'STABLE',
            completionPct: (r.completion_pct as number) ?? 0,
            launchDate: (r.launch_date as string) ?? '',
            latestTxnDate: (r.latest_txn_date as string) ?? '',
            developer: (r.developer_name as string) ?? '',
            developerTier: (r.developer_tier as string) ?? '',
          }))
        );
      }

      // ── View Blocking
      if (vbRes.data) {
        setViewBlocking(
          (vbRes.data as Record<string, unknown>[]).map((r) => ({
            viewName: (r.view_name as string) ?? '',
            viewType: (r.view_type as string) ?? '',
            blockerName: (r.blocker_name as string) ?? '',
            blockerStatus: (r.blocker_status as string) ?? '',
            riskScore: (r.risk_score as number) ?? 0,
            safeAboveFloor: (r.safe_above_floor as number) ?? 0,
            timeline: (r.timeline as string) ?? '',
            pctBlocked: (r.pct_of_view_blocked as number) ?? 0,
            severity: (r.block_severity as string) ?? '',
          }))
        );
      }

      // ── SC Truth
      if (scTruthRes.data) {
        setScTruth(
          (scTruthRes.data as Record<string, unknown>[]).map((r) => ({
            phaseName: (r.phase_name as string) ?? '',
            mollakSc: (r.mollak_sc as number) ?? 0,
            reportedSc: (r.reported_sc as number) ?? 0,
            bestSc: (r.best_sc as number) ?? 0,
            scStatus: (r.sc_status as string) ?? '',
            scNote: (r.sc_note as string) ?? '',
            mollakYear: (r.mollak_year as number) ?? 0,
          }))
        );
      }

      // ── SC Trajectory
      if (scTrajRes.data) {
        setScTrajectory(
          (scTrajRes.data as Record<string, unknown>[]).map((r) => ({
            projectName: (r.project_name_en as string) ?? '',
            budgetYear: (r.budget_year as number) ?? 0,
            serviceChargeSqft: (r.service_charge_sqft as number) ?? 0,
            yoyChangePct: (r.yoy_change_pct as number) ?? 0,
          }))
        );
      }

      // ── Amenities (from GEE satellite verdicts)
      const geeRows = (geeRes.data ?? []) as Record<string, unknown>[];
      setAmenities(
        geeRows.map((r) => ({
          amenityClass: (r.amenity_class as string) ?? '',
          deliveryVerdict: (r.delivery_verdict as string) ?? '',
          deliveryScore: (r.delivery_score as number) ?? 0,
          imageryDate: (r.gee_composite_end as string) ?? null,
          verdictLogic: (r.verdict_logic as string) ?? '',
        }))
      );

      // ── Progress / Handover (uses truth + GEE)
      const truthRow = truthRes.data?.[0] as Record<string, unknown> | undefined;
      if (truthRow || geeRows.length) {
        const byClass: Record<string, { delivered: number; partial: number; notDelivered: number; scores: number[]; date: string | null }> = {};
        geeRows.forEach((r) => {
          const cls = (r.amenity_class as string) ?? 'Unknown';
          if (!byClass[cls]) byClass[cls] = { delivered: 0, partial: 0, notDelivered: 0, scores: [], date: null };
          const verdict = (r.delivery_verdict as string) ?? '';
          if (verdict === 'DELIVERED') byClass[cls].delivered++;
          else if (verdict === 'PARTIAL') byClass[cls].partial++;
          else byClass[cls].notDelivered++;
          if (r.delivery_score) byClass[cls].scores.push(r.delivery_score as number);
          if (r.gee_composite_end) byClass[cls].date = r.gee_composite_end as string;
        });
        setProgress({
          ddaCompletion: (truthRow?.dda_completion_pct as number) ?? 0,
          salesCount: (truthRow?.dld_primary_sales_count as number) ?? 0,
          hiddenInventory: (truthRow?.hidden_inventory as number) ?? 0,
          conflictFlag: Boolean(truthRow?.conflict_flag),
          conflictType: (truthRow?.conflict_type as string) ?? null,
          satelliteBreakdown: Object.entries(byClass).map(([cls, v]) => ({
            class: cls,
            delivered: v.delivered,
            partial: v.partial,
            notDelivered: v.notDelivered,
            avgScore: v.scores.length ? Number((v.scores.reduce((a, b) => a + b, 0) / v.scores.length).toFixed(2)) : 0,
            imageryDate: v.date,
          })),
        });
      } else {
        setProgress(null);
      }

      // ── Developer Scores
      if (devScoreRes.data) {
        setDeveloperScores(
          (devScoreRes.data as Record<string, unknown>[]).map((r) => ({
            developer: (r.developer as string) ?? '',
            deliveryRate: (r.delivery_rate_pct as number) ?? 0,
            avgDelayMonths: (r.avg_delay_months as number) ?? 0,
            buildQuality: (r.build_quality_score as number) ?? 0,
            afterSales: (r.after_sales_score as number) ?? 0,
            brandTier: (r.brand_tier as string) ?? '',
            totalProjects: (r.total_projects_dubai as number) ?? 0,
            notableProjects: (r.notable_projects as string) ?? '',
            redFlags: (r.red_flags as string) ?? '',
          }))
        );
      }

      // ── Catalysts
      if (catRes.data) {
        setCatalysts(
          (catRes.data as Record<string, unknown>[]).map((r) => ({
            name: (r.catalyst_name as string) ?? '',
            type: (r.catalyst_type as string) ?? '',
            status: (r.current_status as string) ?? '',
            announcedDate: (r.announced_date as string) ?? '',
            expectedCompletion: (r.expected_completion as string) ?? null,
            impactScore: (r.base_impact_score as number) ?? 0,
            impactMagnitude: (r.impact_magnitude as string) ?? null,
            description: (r.description as string) ?? '',
            investmentAed: (r.estimated_investment_aed as number) ?? null,
          }))
        );
      }

      // ── Livability
      if (livRes.data?.length) {
        const rows = livRes.data as Record<string, unknown>[];
        const avg = (key: string) => {
          const vals = rows.map((r) => (r[key] as number) ?? 0);
          return vals.reduce((a, b) => a + b, 0) / vals.length;
        };
        setLivability({
          viewScore: avg('view_score'),
          amenityScore: avg('amenity_score'),
          transitScore: avg('transit_score'),
          constructionDisruption: avg('construction_disruption'),
          supplyPressure: avg('supply_pressure'),
          livabilityScore: avg('livability_score'),
          grade: (rows[0].livability_grade as string) ?? '',
        });
      } else {
        setLivability(null);
      }

      // ── Nationality Mix — "Community Demographics"
      if (natRes.data) {
        setNationalityMix(
          (natRes.data as Record<string, unknown>[]).map((r) => ({
            nationality: (r.nationality as string) ?? '',
            pct: (r.pct as number) ?? 0,
            quarterStart: (r.quarter_start as string) ?? '',
          }))
        );
      }

      // ── Government Alignment
      if (govRes.data) {
        const g = govRes.data as Record<string, unknown>;
        setGovAlignment({
          governmentAlignmentScore: (g.government_alignment_score as number) ?? 0,
          metroStatus: (g.metro_status as string) ?? '',
          d33FdiTargetZone: Boolean(g.d33_fdi_target_zone),
          goldenVisaEligible: Boolean(g.golden_visa_eligible),
        });
      } else {
        setGovAlignment(null);
      }

      setTabLoading(false);
    };
    run();
  }, [selectedArea, selectedProject, selectedDeveloper, projects]);

  return {
    areas, projects, developers, ddLoading,
    selectedArea, selectedProject, selectedDeveloper,
    setSelectedArea, setSelectedProject, setSelectedDeveloper,
    phases, viewBlocking, scTruth, scTrajectory, progress, developerScores,
    amenities, catalysts, livability, nationalityMix, govAlignment,
    tabLoading,
  };
}
