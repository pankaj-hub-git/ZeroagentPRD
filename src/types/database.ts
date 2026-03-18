/* ── Navigation ─────────────────────────────────────────────── */
export interface NavCommunity {
  area_id: string;
  area_name: string;
  area_display_name: string;
  community_id: string;
  community_name: string;
  community_display_name: string;
  master_developer: string;
  total_units: number;
}

/* ── Price & Rent Timeseries (silver) ──────────────────────── */
export interface PriceTimeseries {
  area_name: string;
  period_type: string;
  period_start: string;
  total_transactions: number;
  total_volume: number;
  avg_price_per_sqft: number;
  median_price_per_sqft: number;
  offplan_pct: number;
  mortgage_pct: number;
}

export interface RentTimeseries {
  area_name: string;
  period_type: string;
  period_start: string;
  avg_annual_rent: number;
  total_contracts: number;
  renewal_pct: number;
}

/* ── Capital Rotation (gold) ───────────────────────────────── */
export interface CapitalRotation {
  quarter: string;
  area_name_en: string;
  segment: string;
  capital_type: string;
  txn_count: number;
  total_value_aed: number;
  avg_price: number;
  qoq_price_pct: number;
  yoy_price_pct: number;
  rotation_signal: string;
}

/* ── Developer Scores (gold) ───────────────────────────────── */
export interface DeveloperScore {
  developer: string;
  delivery_rate_pct: number;
  avg_delay_months: number;
  build_quality_score: number;
  after_sales_score: number;
  brand_tier: 'premium' | 'mid_tier' | 'budget' | 'new_entrant';
  total_projects_dubai: number;
  notable_projects: string;
  red_flags: string;
}

/* ── Government Alignment (gold) ───────────────────────────── */
export interface GovernmentAlignment {
  master_community: string;
  government_alignment_score: number;
  metro_status: string;
  d33_fdi_target_zone: boolean;
  golden_visa_eligible: boolean;
}

/* ── Livability Index (gold) ───────────────────────────────── */
export interface LivabilityIndex {
  plot_number: string;
  livability_score: number;
  livability_grade: string;
  view_score: number;
  amenity_score: number;
  transit_score: number;
  construction_disruption: number;
  supply_pressure: number;
  livability_label?: string;
  summary?: string;
}

/* ── Rental Yield (gold) ───────────────────────────────────── */
export interface RentalYield {
  area_name: string;
  property_type: string;
  rooms: string;
  avg_annual_rent: number;
  avg_purchase_price: number;
  gross_yield_pct: number;
  yield_tier: string;
  vacancy_proxy_pct: number;
  period_start?: string;
}

/* ── Phase Signals (gold) ──────────────────────────────────── */
export interface PhaseSignal {
  id: number;
  master_project_en: string;
  phase_name: string;
  signal: Signal;
  signal_score: number;
  signal_rationale: string;
  phase_psm: number;
  ready_equilibrium_psm: number;
  vs_ready_pct: number;
  phase_alpha: number;
  arbitrage_signal: string;
  completion_pct: number | null;
  amenity_lift_estimate_pct: number | null;
  is_offplan: boolean;
  txn_count_120d: number;
  latest_txn_date: string;
}

/* ── Phase Registry (gold) ─────────────────────────────────── */
export interface PhaseRegistry {
  phase_name: string;
  master_project_en: string;
  launch_psm: number;
  current_psm: number;
  total_return_pct: number;
  qoq_momentum: string;
  completion_pct: number;
  launch_date: string;
  latest_txn_date: string;
  developer_name: string;
  developer_tier: string;
}

/* ── Phase Mismatch (gold) ─────────────────────────────────── */
export interface PhaseMismatch {
  phase_name: string;
  master_community: string;
  master_project_en: string;
  mismatch_type: string;
  mismatch_label: string;
  ready_sale_psm: number;
  current_psm: number;
  premium_to_ready_pct: number;
}

/* ── Phase Equilibrium (gold) ──────────────────────────────── */
export interface PhaseEquilibrium {
  master_project_en: string;
  ready_equilibrium_psm: number;
  future_equilibrium_2yr: number;
  amenity_lift_2yr_pct: number;
}

/* ── View Blocking (gold) ──────────────────────────────────── */
export interface ViewBlocking {
  observer_plot: string;
  observer_name: string;
  observer_project: string;
  observer_floors: number;
  view_name: string;
  view_type: 'sea' | 'waterfront' | 'landmark' | 'park';
  blocker_name: string;
  blocker_floors: number;
  blocker_status: string;
  blocker_distance_m: number;
  safe_above_floor: number;
  risk_score: number;
  risk_label: string;
  block_severity: string;
  pct_of_view_blocked: number;
  timeline: string;
  primary_affected_direction: string;
}

/* ── View Assets (public) ──────────────────────────────────── */
export interface ViewAsset {
  view_type: string;
  view_premium_pct: number;
}

/* ── Villa Plot Scores (gold) ──────────────────────────────── */
export interface VillaPlotScore {
  community_id: string;
  plot_number: string;
  position_score: number;
  is_perimeter: boolean;
  faces_open_space: boolean;
  dist_to_park_m: number;
  tight_neighbors: number;
}

/* ── SC Truth (gold) ───────────────────────────────────────── */
export interface SCTruth {
  phase_name: string;
  mollak_sc: number;
  reported_sc: number;
  best_sc: number;
  sc_status: string;
  sc_note: string;
  mollak_year: number;
}

/* ── SC Trajectory (gold view) ─────────────────────────────── */
export interface SCTrajectory {
  project_name_en: string;
  budget_year: number;
  service_charge_sqft: number;
  yoy_change_pct: number;
}

/* ── Satellite Verdicts (gold view) ────────────────────────── */
export interface SatelliteVerdict {
  plot_number: string;
  community_name: string;
  master_developer: string;
  amenity_class: string;
  delivery_verdict: 'DELIVERED' | 'PARTIAL' | 'NOT_DELIVERED';
  delivery_score: number;
  verdict_logic: string;
  imagery_date: string;
}

/* ── Nationality (silver + gold) ───────────────────────────── */
export interface NationalityMix {
  canonical_area: string;
  quarter_start: string;
  nationality: string;
  pct: number;
}

export interface NationalityMomentum {
  nationality: string;
  quarter: string;
  is_reliable: boolean;
  qoq_shift: number;
  crisis_driver: boolean;
}

export interface MacroExposure {
  canonical_area: string;
  nationality_hhi: number;
  concentration_risk: string;
  macro_risk_score: number;
  dominant_nationality: string;
}

/* ── XRay (public) ─────────────────────────────────────────── */
export interface XrayProject {
  id: string;
  project_name: string;
  developer: string;
  master_community: string;
  project_status: string;
  total_floors: number;
  total_units: number;
  latitude: number | null;
  longitude: number | null;
  avg_price_per_sqft: number | null;
}

export interface XrayUnitType {
  project_id: string;
  unit_type: string;
  total_area_sqft: number;
  units_per_floor: number;
  orientation: string;
  floor_plan_layout: unknown;
}

/* ── Policy & Crisis (bronze/public) ───────────────────────── */
export interface PolicyEvent {
  event_name: string;
  policy_type: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  description: string;
  estimated_impact_pct: number;
  affected_communities: string[];
  event_date: string;
}

export interface GovernmentCatalyst {
  catalyst_name: string;
  catalyst_type: string;
  current_status: string;
  announced_date: string;
  expected_completion: string | null;
  base_impact_score: number;
  impact_magnitude: string | null;
  description: string;
  estimated_investment_aed: number | null;
  affected_communities: string[];
}

export interface CrisisEvent {
  id: string;
  description: string;
  severity: string;
  detected_at: string;
}

/* ── DLD Transaction (bronze) ──────────────────────────────── */
export interface DLDTransaction {
  instance_date: string;
  rooms_en: string;
  actual_worth: number;
  meter_sale_price: number;
  procedure_area: number;
  project_name_en: string;
  master_project_en: string;
  building_name_en: string;
  area_name_en: string;
  reg_type_en: string;
  trans_group_en: string;
  transaction_id: string;
}

/* ── Mollak Service Charges (bronze) ───────────────────────── */
export interface MollakServiceCharge {
  project_name_en: string;
  budget_year: number;
  service_charge_sqft: number;
  general_fund_sqft: number;
  reserve_fund_sqft: number;
  total_sqft: number;
}

/* ── Truth Layer (gold) ────────────────────────────────────── */
export interface TruthLayer {
  plot_number: string;
  project_name_dld: string;
  dld_master_project: string;
  property_type: string;
  dda_completion_pct: number;
  dld_primary_sales_count: number;
  hidden_inventory: number;
  conflict_flag: boolean;
  conflict_type: string | null;
  status_conflict: string | null;
}

/* ── EIBOR (bronze) ────────────────────────────────────────── */
export interface EiborRate {
  date: string;
  rate_1m: number;
  rate_3m: number;
  rate_6m: number;
}

/* ── PSM Benchmarks (public) ───────────────────────────────── */
export interface PSMBenchmark {
  community: string;
  min_psf: number;
  max_psf: number;
  avg_psf: number;
  yield_pct: number;
  maturity_stage: string;
}

/* ── Safe Haven (bronze) ───────────────────────────────────── */
export interface SafeHavenCatalyst {
  event_name: string;
  event_type: string;
  origin_country: string;
  severity: number;
  capital_flow_direction: string;
  description: string;
  event_date: string;
}

/* ── Enums ─────────────────────────────────────────────────── */
export type TrustLevel =
  | 'VERIFIED'
  | 'HIGH_CONFIDENCE'
  | 'INFERRED'
  | 'ESTIMATED'
  | 'CONFLICT'
  | 'DEVELOPER_NARRATIVE';

export type Verdict = 'BUY' | 'NEGOTIATE' | 'WAIT' | 'AVOID';

export type Signal = 'BUY' | 'BUY_NOW' | 'ACCUMULATE' | 'HOLD' | 'REDUCE' | 'AVOID';

/* ── Amenity Polygons (gold) ─────────────────────────────── */
export type AmenityCategory =
  | 'GREEN_SPACE'
  | 'LEISURE_FACILITY'
  | 'RETAIL_COMMERCIAL'
  | 'COMMUNITY_FACILITY';

export interface AmenityPolygon {
  id: number;
  community: string;
  brochure_name: string;
  amenity_category: AmenityCategory;
  land_use: string;
  render_color: string;
  is_signature: boolean;
  area_sqm: number;
  centroid_lat: number;
  centroid_lng: number;
  polygon_geojson: GeoJSON.Geometry;
}

export interface AmenitySummary {
  amenity_category: AmenityCategory;
  render_color: string;
  plot_count: number;
  total_area_sqm: number;
}
