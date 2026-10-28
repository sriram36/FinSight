export type TransactionDirection = 'spending' | 'income' | 'transfer' | 'refund' | 'payment'

export interface Transaction {
  id: string
  user_id: string
  transaction_date: string
  description: string
  amount: number
  direction: TransactionDirection
  category: string
  category_source: string
  raw_data?: string | null
  import_id?: string | null
  created_at: string
}

export interface TransactionListResponse {
  items: Transaction[]
  total: number
  total_spending: number
  total_income: number
  limit: number
  offset: number
}

export interface CSVPreviewRow {
  row_number: number

  raw: Record<string, any>
  mapped_date?: string | null
  mapped_description?: string | null
  mapped_amount?: number | null
  mapped_direction?: TransactionDirection | null
  mapped_category?: string | null
  status: 'valid' | 'error' | 'duplicate'
  error_message?: string | null
}

export interface CSVPreviewSummary {
  file_name: string
  total_rows: number
  accepted_rows: number
  rejected_rows: number
  duplicate_rows: number
  detected_headers: string[]
  sample_preview: CSVPreviewRow[]
  column_mapping: Record<string, string>
}

export interface CategoryProfileMetric {
  category: string
  baseline_total: number
  recent_total: number
  baseline_daily_pace: number
  recent_daily_pace: number
  normalized_baseline: number
  percentage_deviation?: number | null
  is_low_baseline: boolean
  is_protected: boolean
  transaction_count_recent: number
  transaction_count_baseline: number
  recent_transaction_ids: string[]
}

export interface SpendingProfileResponse {
  user_id: string
  baseline_start: string
  baseline_end: string
  baseline_days: number
  recent_start: string
  recent_end: string
  recent_days: number
  categories: Record<string, CategoryProfileMetric>
  total_recent_spending: number
  total_baseline_spending: number
  highest_deviation_category?: string | null
  calculated_at: string
}

export type RecommendationConfig = 'A' | 'B' | 'B-ablation' | 'C'

export interface Recommendation {
  id: string
  user_id: string
  configuration: RecommendationConfig | string
  category?: string | null
  action: string
  reason: string
  evidence: Record<string, any>
  expected_impact?: number | null
  assumptions: string[]
  is_verified: boolean
  verifier_notes?: string | null
  generation_mode?: 'azure_openai' | 'deterministic_fallback' | string | null
  llm_model?: string | null
  created_at: string
}

export interface FinancialChatResponse {
  user_id: string
  query: string
  intent: string
  category?: string | null
  target_amount?: number | null
  reply: string
  is_verified: boolean
  verifier_status: 'passed' | 'failed' | 'fallback_used' | string
  verifier_notes?: string | null
  generation_mode: 'azure_openai' | 'deterministic_fallback' | string
  model_used: string
  facts: Record<string, any>
  cited_transactions: Transaction[]
  suggested_followups: string[]
  timestamp: string
}

export interface AffordabilityGoalImpact {
  goal_id: string
  goal_title: string
  monthly_reservation: number
  is_delayed: boolean
}

export interface EvidenceBundle {
  transaction_ids: string[]
  exact_sum: number
  baseline_sum: number
  delta_pct: number
  verification_status: 'VERIFIED' | 'UNVERIFIED' | string
  verifier_notes?: string
  [key: string]: any
}

export interface AffordabilityResponse {
  purchase_amount: number
  available_balance?: number | null
  upcoming_obligations: number
  emergency_buffer: number
  goals_reserved: number
  uncommitted_before?: number | null
  post_purchase_remainder?: number | null
  verdict: 'comfortable' | 'caution' | 'unaffordable' | 'incomplete_data'
  summary: string
  missing_inputs: string[]
  assumptions: string[]
  goal_impacts: AffordabilityGoalImpact[]
  survival_probability?: number | null
  survival_p10?: number | null
  survival_p90?: number | null
  constraint_violations?: Array<{
    constraint_type: string
    label: string
    amount: number
    breach_day: number
    breach_date: string
    projected_balance: number
    message: string
  }>
  counterfactual_alternatives?: Array<{
    action: string
    label: string
    detail: string
  }>
  runway_timeline?: Array<{
    day: number
    date: string
    projected_balance: number
    below_floor: boolean
  }>
  evidence_bundle?: EvidenceBundle | null
}

export interface Goal {
  id: string
  user_id: string
  title: string
  target_amount: number
  current_amount: number
  target_date: string
  status: string
  months_remaining: number
  monthly_needed: number
  is_feasible: boolean
  shortfall: number
  feasibility_notes: string
  created_at: string
}

export interface CategoryPreference {
  category: string
  is_protected: boolean
  reason?: string | null
  updated_at: string
}

export interface Budget {
  id: string
  user_id: string
  category: string
  monthly_limit: number
  month: string
  spent_amount: number
  remaining_amount: number
  percentage_used: number
  projected_spend: number
  transaction_count: number
  status: 'healthy' | 'warning' | 'exceeded' | 'projected_overrun'
  days_elapsed: number
  total_days_in_month: number
}

export interface BudgetSummary {
  user_id: string
  month: string
  total_budgeted: number
  total_spent: number
  total_remaining: number
  total_projected: number
  budget_count: number
  healthy_count: number
  warning_count: number
  exceeded_count: number
  items: Budget[]
}

export interface RecurringItem {
  id: string
  user_id: string
  merchant: string
  category: string
  amount: number
  frequency: string
  next_due_date: string
  last_seen_date: string
  status: string
  is_confirmed: boolean
  confidence: number
  notes?: string | null
  occurrence_count?: number
  days_remaining?: number
  is_phantom_drain?: boolean
  price_change_note?: string | null
  cancellation_draft?: string | null
  created_at: string
}

export interface UpcomingSchedule {
  horizon_days: number
  total_upcoming: number
  count: number
  items: RecurringItem[]
}

export interface AnomalyItem {
  id: string
  user_id: string
  transaction_id: string
  title: string
  category: string
  amount: number
  baseline_amount: number
  deviation_pct: number
  alert_type: 'unusually_large' | 'duplicate_charge' | 'unfamiliar_merchant' | string
  severity: 'high' | 'medium' | 'low'
  explanation: string
  status: 'new' | 'reviewed' | 'confirmed_unusual' | 'dismissed'
  user_decision?: string | null
  created_at: string
  updated_at: string
}

export interface AnomaliesSummary {
  total_alerts: number
  new_count: number
  reviewed_count: number
  total_amount_flagged: number
  high_severity_count: number
}

export interface ForecastEvent {
  date: string
  type: string
  name: string
  category: string
  amount: number
  is_confirmed: boolean
}

export interface ForecastResponse {
  horizon_days: number
  start_date: string
  end_date: string
  starting_balance?: number | null
  daily_burn_rate: number
  projected_income: number
  upcoming_obligations_total: number
  projected_variable_spend: number
  projected_total_outflow: number
  projected_net_cash_flow: number
  projected_closing_balance?: number | null
  events: ForecastEvent[]
  assumptions: string[]
  confidence: number
  status: string
}

export interface CategoryComparison {
  category: string
  current_spend: number
  previous_spend: number
  diff_amount: number
  pct_change: number
}

export interface SpendingAttributionCard {
  category: string
  driver: 'frequency_drift' | 'ticket_size_inflation' | string
  frequency_current: number
  frequency_baseline: number
  avg_ticket_current: number
  avg_ticket_baseline: number
  frequency_effect: number
  ticket_size_effect: number
  current_spend: number
  previous_spend: number
  evidence_bundle: EvidenceBundle
}

export interface SpendingAttributionResponse {
  cards: SpendingAttributionCard[]
  card_count: number
}

export interface LateNightVelocityResponse {
  current_count: number
  baseline_count: number
  current_spend: number
  baseline_spend: number
  evidence_bundle: EvidenceBundle
  headline: string
}

export interface MonthlyReviewResponse {
  month: string
  previous_month: string
  total_income: number
  total_spending: number
  net_cash_flow: number
  savings_rate_pct: number
  previous_income: number
  previous_spending: number
  spending_diff: number
  category_comparisons: CategoryComparison[]
  budget_summary: any
  monthly_recurring_total: number
  anomalies_count: number
  anomalies: AnomalyItem[]
  narrative: string
  transaction_count: number
  spending_attribution?: SpendingAttributionResponse
  late_night_velocity?: LateNightVelocityResponse
}

export type ConstraintType = 'HARD_FLOOR' | 'FIXED_OBLIGATION' | 'BEHAVIORAL_CAP' | 'PENDING_IOU'

export interface UserConstraint {
  id: string
  user_id: string
  constraint_type: ConstraintType
  label: string
  amount: number
  due_day?: number | null
  is_active: boolean
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface UserConstraintCreate {
  user_id?: string
  constraint_type: ConstraintType
  label: string
  amount: number
  due_day?: number | null
  is_active?: boolean
  metadata?: Record<string, any>
}

export interface SafeToSpendResponse {
  user_id: string
  raw_balance: number
  safe_to_spend_today: number
  locked_by_constraints: number
  unpaid_fixed_obligations: number
  hard_floor: number
  predicted_essential_burn: number
  remaining_days_in_cycle: number
  runway_days_remaining: number
  next_inflow_date?: string | null
  active_constraints: UserConstraint[]
  behavioral_cap_violations?: Array<{
    constraint_id: string
    label: string
    weekly_cap: number
    daily_cap: number
    current_daily_velocity: number
    overage_per_day: number
    message: string
  }>
  assumptions: string[]
  calculated_at: string
}

export interface UPIContextCluster {
  cluster_id: string
  cluster_key: string
  counterparty: string
  time_of_day_bucket: string
  ticket_size_band: string
  transaction_count: number
  transaction_ids: string[]
  exact_sum: number
  average_amount: number
  suggested_category: string
  prompt: string
  likely_split_bill: boolean
  sample_descriptions: string[]
}

export interface ContextPromptsResponse {
  user_id: string
  cluster_count: number
  clusters: UPIContextCluster[]
}

export interface ResolveClusterRequest {
  user_id?: string
  cluster_key: string
  category: string
  register_iou?: boolean
  iou_label?: string
}

export interface DefenseEngineMetrics {
  experiment_name: string
  claim_verification_faithfulness_rate: number
  claim_verification_faithfulness_rate_display: string
  constraint_satisfaction_accuracy: number
  upi_context_clustering_coverage: number
  upi_ambiguous_transfers: number
  upi_clustered_transfers: number
  notes: string[]
  benchmark_systems: any[]
}

export interface AuthUser {
  id: string
  name: string
  email: string
  token: string
  created_at?: string
  is_demo?: boolean
}

export interface KFSFlag {
  category: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | string
  headline: string
  finding: string
  plain_language_advice: string
}

export interface KFSAuditResponse {
  filename: string
  trap_score: number
  risk_level: 'TRANSPARENT' | 'MODERATE_RISK' | 'HIGH_RISK' | 'PREDATORY' | string
  summary: string
  effective_apr_note?: string | null
  flags: KFSFlag[]
  key_terms_extracted: Record<string, any>
  plain_language_comparison: string[]
}
