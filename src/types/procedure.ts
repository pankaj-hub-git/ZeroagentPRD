/* ── Transaction Guides ───────────────────────────────────── */
export interface TransactionGuide {
  id: string;
  guide_type: string;
  title: string;
  subtitle: string;
  description: string;
  target_audience: 'buyer' | 'seller' | 'tenant' | 'landlord' | 'investor' | 'all';
  property_context: 'off_plan' | 'ready' | 'rental' | 'any';
  estimated_timeline: string;
  total_estimated_cost_pct: number | null;
  governing_authority: string;
  relevant_law: string;
  display_order: number;
  is_active: boolean;
}

/* ── Guide Steps ─────────────────────────────────────────── */
export interface GuideStep {
  id: string;
  guide_id: string;
  step_number: number;
  step_title: string;
  step_description: string;
  responsible_party: string;
  location_or_platform: string;
  typical_duration: string;
  is_optional: boolean;
  pro_tip: string | null;
}

/* ── Guide Costs ─────────────────────────────────────────── */
export interface GuideCost {
  id: string;
  guide_id: string;
  cost_name: string;
  paid_by: 'buyer' | 'seller' | 'shared' | 'tenant' | 'landlord';
  cost_type: 'percentage' | 'fixed' | 'variable' | 'negotiable';
  percentage_value: number | null;
  fixed_amount_aed: number | null;
  min_amount_aed: number | null;
  max_amount_aed: number | null;
  notes: string | null;
  is_mandatory: boolean;
  display_order: number;
}

/* ── Guide Documents ─────────────────────────────────────── */
export interface GuideDocument {
  id: string;
  guide_id: string;
  step_id: string | null;
  document_name: string;
  document_description: string;
  required_from: string;
  is_mandatory: boolean;
  where_to_get: string;
  validity_period: string | null;
  display_order: number;
}

/* ── Guide Rights & Duties ───────────────────────────────── */
export interface GuideRightDuty {
  id: string;
  guide_id: string;
  party: string;
  type: 'right' | 'duty' | 'protection';
  title: string;
  description: string;
  legal_basis: string | null;
  enforcement_body: string | null;
  severity: 'critical' | 'standard' | 'advisory';
  display_order: number;
}

/* ── Guide Warnings ──────────────────────────────────────── */
export interface GuideWarning {
  id: string;
  guide_id: string;
  warning_title: string;
  warning_description: string;
  risk_level: 'critical' | 'high' | 'medium' | 'low';
  who_is_affected: string;
  how_to_protect: string;
  real_example: string | null;
  display_order: number;
}

/* ── Sub-tab types ───────────────────────────────────────── */
export type ProcedureSubTab = 'steps' | 'costs' | 'documents' | 'rights' | 'warnings';
export type AudienceFilter = 'all' | 'buyer' | 'seller' | 'tenant' | 'landlord';
