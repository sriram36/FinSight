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
  created_at: string
}

export interface UpcomingSchedule {
  horizon_days: number
  total_upcoming: number
  count: number
  items: RecurringItem[]
}
