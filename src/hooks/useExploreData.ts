import { useEffect, useState } from 'react';
import { sb } from '@/lib/supabase';
import { SQM_TO_SQFT } from '@/lib/constants';

/* ── Dropdown Options ──────────────────────────────────────── */
export interface AreaOption { area: string; txnCount: number }
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
export interface AmenityItem {
  name: string;
  category: string;
  deliveryStatus: string;
  promisedInBrochure: boolean;
  googleRating: number | null;
  sentimentTags: string[];
  satelliteVerdict: string | null;
  satelliteScore: number | null;
  imageryDate: string | null;
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
  label: string;
  summary: string;
}

export interface ProgressData {
  ddaCompletion: number;
  salesCount: number;
  hiddenInventory: number;
  conflictFlag: boolean;
  conflictType: string | null;
  satelliteBreakdown: { class: string; delivered: number; partial: number; notDelivered: number; avgScore: number; imageryDate: string | null }[];
}

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
  satelliteConfirmed: boolean;
}

/* ── Hook ──────────────────────────────────────────────────── */
interface ExploreData {
  /* Dropdowns */
  areas: AreaOption[];
  projects: ProjectOption[];
  developers: DeveloperOption[];
  ddLoading: boolean;

  /* Selection */
  selectedArea: string | null;
  selectedProject: string | null;
  selectedDeveloper: string | null;
  setSelectedArea: (a: string | null) => void;
  setSelectedProject: (p: string | null) => void;
  setSelectedDeveloper: (d: string | null) => void;

  /* Tabs */
  amenities: AmenityItem[];
  catalysts: CatalystItem[];
  livability: LivabilityData | null;
  progress: ProgressData | null;
  phases: PhaseItem[];
  viewBlocking: ViewBlockItem[];
  tabLoading: boolean;
}

export function useExploreData(): ExploreData {
  /* Dropdown data */
  const [areas, setAreas] = useState<AreaOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [developers, setDevelopers] = useState<DeveloperOption[]>([]);
  const [ddLoading, setDdLoading] = useState(true);

  /* Selection state */
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedDeveloper, setSelectedDeveloper] = useState<string | null>(null);

  /* Tab data */
  const [amenities, setAmenities] = useState<AmenityItem[]>([]);
  const [catalysts, setCatalysts] = useState<CatalystItem[]>([]);
  const [livability, setLivability] = useState<LivabilityData | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [phases, setPhases] = useState<PhaseItem[]>([]);
  const [viewBlocking, setViewBlocking] = useState<ViewBlockItem[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  /* ── Load dropdowns ─────────────────────────────────────── */
  useEffect(() => {
    const run = async () => {
      const [areaRes, projRes, devRes] = await Promise.all([
        sb
          .schema('bronze').from('dld_transactions')
          .select('area_name_en')
          .eq('trans_group_en', 'Sales')
          .not('area_name_en', 'is', null)
          .limit(5000),
        sb
          .from('xray_projects')
          .select('id, project_name, developer, master_community, project_status, total_floors, total_units')
          .order('project_name'),
        sb
          .schema('gold').from('developer_scores')
          .select('developer, brand_tier, total_projects_dubai, delivery_rate_pct, build_quality_score')
          .order('brand_tier', { ascending: false }),
      ]);

      // Areas with counts
      if (areaRes.data) {
        const counts: Record<string, number> = {};
        (areaRes.data as Record<string, unknown>[]).forEach((r) => {
          const a = r.area_name_en as string;
          if (a) counts[a] = (counts[a] ?? 0) + 1;
        });
        setAreas(
          Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .map(([area, txnCount]) => ({ area, txnCount }))
        );
      }

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

      setDdLoading(false);
    };
    run();
  }, []);

  /* ── Load tab data when selection changes ───────────────── */
  useEffect(() => {
    const community = selectedArea ?? selectedProject ?? null;
    if (!community) {
      setAmenities([]);
      setCatalysts([]);
      setLivability(null);
      setProgress(null);
      setPhases([]);
      setViewBlocking([]);
      return;
    }

    const projectId = projects.find((p) => p.name === selectedProject || p.community === selectedArea)?.id;

    setTabLoading(true);
    const run = async () => {
      const [amenRes, catRes, livRes, truthRes, geeRes, phaseRes, vbRes] = await Promise.all([
        // Amenities
        projectId
          ? sb
              .from('xray_project_amenities')
              .select('amenity_name, amenity_category, delivery_status, promised_in_brochure, google_rating, operational_quality, sentiment_tags')
              .eq('project_id', projectId)
              .order('amenity_category')
          : Promise.resolve({ data: null }),
        // Catalysts
        sb
          .from('bronze_government_catalysts')
          .select('catalyst_name, catalyst_type, current_status, announced_date, expected_completion, base_impact_score, impact_magnitude, description, estimated_investment_aed')
          .contains('affected_communities', [community])
          .order('base_impact_score', { ascending: false }),
        // Livability
        sb
          .schema('gold').from('livability_index')
          .select('view_score, amenity_score, transit_score, construction_disruption, supply_pressure, livability_score, livability_grade, livability_label, summary')
          .limit(1),
        // Truth layer
        sb
          .schema('gold').from('truth_layer')
          .select('dda_completion_pct, dld_primary_sales_count, hidden_inventory, conflict_flag, conflict_type')
          .ilike('project_name_dld', `%${community}%`)
          .limit(1),
        // GEE satellite
        sb
          .schema('bronze').from('masterplan_gee_queue')
          .select('amenity_class, delivery_verdict, delivery_score, gee_composite_end')
          .ilike('community_name', `%${community}%`)
          .eq('gee_status', 'DONE'),
        // Phase registry
        sb
          .schema('gold').from('phase_registry')
          .select('phase_name, master_project_en, launch_psm, current_psm, total_return_pct, qoq_momentum, completion_pct, launch_date, latest_txn_date, developer_name, developer_tier')
          .or(`master_project_en.ilike.%${community}%,developer_name.ilike.%${selectedDeveloper ?? ''}%`)
          .order('launch_date'),
        // View blocking
        sb
          .schema('gold').from('view_blocking_v3')
          .select('view_name, view_type, blocker_name, blocker_status, risk_score, safe_above_floor, timeline, pct_of_view_blocked, block_severity')
          .or(`observer_name.ilike.%${community}%,observer_project.ilike.%${community}%`)
          .order('risk_score', { ascending: false }),
      ]);

      // Amenities
      if (amenRes.data) {
        setAmenities(
          (amenRes.data as Record<string, unknown>[]).map((r) => ({
            name: (r.amenity_name as string) ?? '',
            category: (r.amenity_category as string) ?? '',
            deliveryStatus: (r.delivery_status as string) ?? '',
            promisedInBrochure: Boolean(r.promised_in_brochure),
            googleRating: r.google_rating as number | null,
            sentimentTags: Array.isArray(r.sentiment_tags) ? (r.sentiment_tags as string[]) : [],
            satelliteVerdict: null,
            satelliteScore: null,
            imageryDate: null,
          }))
        );
      }

      // Catalysts
      if (catRes.data) {
        setCatalysts(
          (catRes.data as Record<string, unknown>[]).map((r) => ({
            name: (r.catalyst_name as string) ?? '',
            type: (r.catalyst_type as string) ?? '',
            status: (r.current_status as string) ?? '',
            announcedDate: (r.announced_date as string) ?? '',
            expectedCompletion: r.expected_completion as string | null,
            impactScore: (r.base_impact_score as number) ?? 0,
            impactMagnitude: r.impact_magnitude as string | null,
            description: (r.description as string) ?? '',
            investmentAed: r.estimated_investment_aed as number | null,
          }))
        );
      }

      // Livability
      if (livRes.data?.length) {
        const r = livRes.data[0] as Record<string, unknown>;
        setLivability({
          viewScore: (r.view_score as number) ?? 0,
          amenityScore: (r.amenity_score as number) ?? 0,
          transitScore: (r.transit_score as number) ?? 0,
          constructionDisruption: (r.construction_disruption as number) ?? 0,
          supplyPressure: (r.supply_pressure as number) ?? 0,
          livabilityScore: (r.livability_score as number) ?? 0,
          grade: (r.livability_grade as string) ?? '',
          label: (r.livability_label as string) ?? '',
          summary: (r.summary as string) ?? '',
        });
      }

      // Progress
      const truthRow = truthRes.data?.[0] as Record<string, unknown> | undefined;
      const geeRows = (geeRes.data ?? []) as Record<string, unknown>[];
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
      }

      // Phases
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

      // View Blocking
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
            satelliteConfirmed: false,
          }))
        );
      }

      setTabLoading(false);
    };
    run();
  }, [selectedArea, selectedProject, selectedDeveloper, projects]);

  return {
    areas, projects, developers, ddLoading,
    selectedArea, selectedProject, selectedDeveloper,
    setSelectedArea, setSelectedProject, setSelectedDeveloper,
    amenities, catalysts, livability, progress, phases, viewBlocking, tabLoading,
  };
}
