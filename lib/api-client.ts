import {
  Transaction,
  TransactionListResponse,
  CSVPreviewSummary,
  SpendingProfileResponse,
  Recommendation,
  AffordabilityResponse,
  Goal,
  CategoryPreference,
  FinancialChatResponse,
  SafeToSpendResponse,
  UserConstraint,
  UserConstraintCreate,
  ContextPromptsResponse,
  ResolveClusterRequest,
  DefenseEngineMetrics
} from './types'

const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
const rawBase = process.env.NEXT_PUBLIC_API_BASE_URL || (isProduction ? 'https://finsight-api-d84z.onrender.com' : 'http://localhost:8000')
const API_BASE = rawBase.replace(/\/+$/, '')

export function getActiveUserId(): string {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('finsight_user')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed && parsed.id) {
          return parsed.id
        }
      }
    } catch {
      // ignore parse errors
    }
  }
  return 'default_user'
}

function getAuthHeader(): Record<string, string> {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('finsight_token')
    const activeId = getActiveUserId()
    const headers: Record<string, string> = {
      'X-User-Id': activeId,
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }
  return {}
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`
  const authHeaders = getAuthHeader()
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options?.headers,
    },
  })

  if (!res.ok) {
    let errorDetail = res.statusText
    try {
      const errJson = await res.json()
      errorDetail = errJson.detail || errJson.message || JSON.stringify(errJson)
    } catch {
      // ignore
    }
    throw new Error(`API Error [${res.status}]: ${errorDetail}`)
  }

  return res.json() as Promise<T>
}

export const api = {
  // Utility
  getActiveUserId,

  // Health
  getHealth: () => request<{ status: string; app: string; version: string }>('/health'),

  // Imports
  previewCSV: async (file: File, userId?: string, columnMapping?: Record<string, string>): Promise<CSVPreviewSummary> => {
    const activeUserId = userId || getActiveUserId()
    const formData = new FormData()
    formData.append('file', file)
    formData.append('user_id', activeUserId)
    if (columnMapping) {
      formData.append('column_mapping', JSON.stringify(columnMapping))
    }
    const res = await fetch(`${API_BASE}/imports/preview`, {
      method: 'POST',
      body: formData,
      headers: {
        ...getAuthHeader(),
      },
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Import preview failed: ${err}`)
    }
    return res.json()
  },

  confirmImport: (data: {
    user_id?: string
    file_name: string
    transactions: any[]
    total_rows?: number
    rejected_rows?: number
    duplicate_rows?: number
  }) =>
    request<{
      import_id: string
      total_rows: number
      accepted_count: number
      rejected_count: number
      duplicate_count: number
      file_name: string
    }>('/imports/confirm', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        user_id: data.user_id || getActiveUserId(),
      }),
    }),

  // Transactions
  getTransactions: (params?: {
    user_id?: string
    start_date?: string
    end_date?: string
    category?: string
    direction?: string
    search?: string
    limit?: number
    offset?: number
  }): Promise<TransactionListResponse> => {
    const query = new URLSearchParams()
    const effectiveParams = {
      user_id: getActiveUserId(),
      ...params,
    }
    Object.entries(effectiveParams).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.set(k, String(v))
      }
    })
    return request<TransactionListResponse>(`/transactions?${query.toString()}`)
  },

  createTransaction: (data: Partial<Transaction> & { user_id?: string; description: string; amount: number; transaction_date: string }) =>
    request<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        user_id: data.user_id || getActiveUserId(),
      }),
    }),

  updateTransaction: (id: string, data: Partial<Transaction>, userId?: string) => {
    const activeId = userId || getActiveUserId()
    return request<Transaction>(`/transactions/${id}?user_id=${activeId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  deleteTransaction: (id: string, userId?: string) => {
    const activeId = userId || getActiveUserId()
    return request<{ message: string; id: string }>(`/transactions/${id}?user_id=${activeId}`, {
      method: 'DELETE',
    })
  },

  getCashflow: (period: string = '6m', userId?: string) => {
    const activeId = userId || getActiveUserId()
    return request<{ period: string; user_id: string; months: Array<{ month_key: string; month: string; income: number; expense: number; transaction_count: number }> }>(
      `/transactions/cashflow?period=${period}&user_id=${activeId}`
    )
  },

  clearAllTransactions: (userId?: string) => {
    const activeId = userId || getActiveUserId()
    return request<{ message: string }>(`/transactions?user_id=${activeId}`, {
      method: 'DELETE',
    })
  },

  seedDemoData: (userId?: string) => {
    const activeId = userId || getActiveUserId()
    return request<{ message: string; seeded: boolean }>(`/transactions/seed?user_id=${activeId}`, {
      method: 'POST',
    })
  },

  // Profile
  getProfile: (params?: {
    user_id?: string
    baseline_start?: string
    baseline_end?: string
    recent_start?: string
    recent_end?: string
  }): Promise<SpendingProfileResponse> => {
    const query = new URLSearchParams()
    const effectiveParams = {
      user_id: getActiveUserId(),
      ...params,
    }
    Object.entries(effectiveParams).forEach(([k, v]) => {
      if (v) query.set(k, String(v))
    })
    return request<SpendingProfileResponse>(`/profile?${query.toString()}`)
  },

  // Persistent Constraint Memory & True Safe-to-Spend
  getSafeToSpend: (rawBalance?: number, userId?: string): Promise<SafeToSpendResponse> => {
    const activeId = userId || getActiveUserId()
    let q = `?user_id=${activeId}`
    if (rawBalance !== undefined && rawBalance !== null) {
      q += `&raw_balance=${rawBalance}`
    }
    return request<SafeToSpendResponse>(`/profile/safe-to-spend${q}`)
  },

  getConstraints: (userId?: string): Promise<UserConstraint[]> => {
    const activeId = userId || getActiveUserId()
    return request<UserConstraint[]>(`/profile/constraints?user_id=${activeId}`)
  },

  createConstraint: (data: UserConstraintCreate): Promise<UserConstraint> =>
    request<UserConstraint>('/profile/constraints', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        user_id: data.user_id || getActiveUserId(),
      }),
    }),

  updateConstraint: (constraintId: string, updates: Partial<UserConstraint>, userId?: string): Promise<UserConstraint> => {
    const activeId = userId || getActiveUserId()
    return request<UserConstraint>(`/profile/constraints/${constraintId}?user_id=${activeId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  },

  deleteConstraint: (constraintId: string, userId?: string): Promise<{ deleted: boolean; id: string }> => {
    const activeId = userId || getActiveUserId()
    return request<{ deleted: boolean; id: string }>(`/profile/constraints/${constraintId}?user_id=${activeId}`, {
      method: 'DELETE',
    })
  },

  // Smart UPI Context Stitcher & IOU Detector
  getContextPrompts: (userId?: string): Promise<ContextPromptsResponse> => {
    const activeId = userId || getActiveUserId()
    return request<ContextPromptsResponse>(`/transactions/context-prompts?user_id=${activeId}`)
  },

  resolveCluster: (data: ResolveClusterRequest): Promise<any> =>
    request<any>('/transactions/resolve-cluster', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        user_id: data.user_id || getActiveUserId(),
      }),
    }),

  // Recommendations
  generateRecommendation: (data: {
    user_id?: string
    configuration?: string
    baseline_start?: string
    baseline_end?: string
    recent_start?: string
    recent_end?: string
  }): Promise<Recommendation> =>
    request<Recommendation>('/recommendations/generate', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        user_id: data.user_id || getActiveUserId(),
      }),
    }),

  getRecommendations: (userId?: string): Promise<Recommendation[]> => {
    const activeId = userId || getActiveUserId()
    return request<Recommendation[]>(`/recommendations?user_id=${activeId}`)
  },

  getPortfolioInsights: (userId?: string): Promise<Recommendation[]> => {
    const activeId = userId || getActiveUserId()
    return request<Recommendation[]>(`/recommendations/portfolio?user_id=${activeId}`)
  },

  getRecommendationEvidence: (id: string, userId?: string) => {
    const activeId = userId || getActiveUserId()
    return request<{
      recommendation_id: string
      configuration: string
      category: string
      is_verified: boolean
      verifier_notes?: string
      evidence: Record<string, any>
      source_transactions: Transaction[]
    }>(`/recommendations/${id}/evidence?user_id=${activeId}`)
  },

  // Conversational Financial Intelligence (Ask FinSight)
  queryChat: (message: string, userId?: string): Promise<FinancialChatResponse> => {
    const activeId = userId || getActiveUserId()
    return request<FinancialChatResponse>('/chat/query', {
      method: 'POST',
      body: JSON.stringify({ message, user_id: activeId }),
    })
  },

  // Scenarios / Affordability
  simulateAffordability: (data: {
    user_id?: string
    purchase_amount: number
    purchase_date?: string
    available_balance?: number | null
    upcoming_obligations?: number
    emergency_buffer?: number
    notes?: string
    horizon_days?: number
    is_emi?: boolean
    tenure_months?: number
  }): Promise<AffordabilityResponse> =>
    request<AffordabilityResponse>('/scenarios/affordability', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        user_id: data.user_id || getActiveUserId(),
      }),
    }),

  // Goals
  getGoals: (userId?: string): Promise<Goal[]> => {
    const activeId = userId || getActiveUserId()
    return request<Goal[]>(`/goals?user_id=${activeId}`)
  },

  createGoal: (data: {
    user_id?: string
    title: string
    target_amount: number
    current_amount?: number
    target_date: string
  }): Promise<Goal> =>
    request<Goal>('/goals', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        user_id: data.user_id || getActiveUserId(),
      }),
    }),

  deleteGoal: (id: string, userId?: string) => {
    const activeId = userId || getActiveUserId()
    return request<{ message: string; id: string }>(`/goals/${id}?user_id=${activeId}`, {
      method: 'DELETE',
    })
  },

  // Category Preferences
  getCategoryPreferences: (userId?: string): Promise<CategoryPreference[]> => {
    const activeId = userId || getActiveUserId()
    return request<CategoryPreference[]>(`/preferences/categories?user_id=${activeId}`)
  },

  updateCategoryPreference: (
    category: string,
    data: { is_protected: boolean; reason?: string },
    userId?: string
  ): Promise<CategoryPreference> => {
    const activeId = userId || getActiveUserId()
    return request<CategoryPreference>(`/preferences/categories/${encodeURIComponent(category)}?user_id=${activeId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  // Research Lab
  getResearchAudit: () => request<any>('/research/audit'),
  getTemporalSplit: () => request<any>('/research/split'),
  getBenchmark: () => request<any[]>('/research/benchmark'),
  runPerturbation: (data?: { user_id?: string; seed?: number; target_category?: string; delta_pct?: number }) =>
    request<any>('/research/perturbation', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),
  getDefenseMetrics: (): Promise<DefenseEngineMetrics> => request<DefenseEngineMetrics>('/research/defense-metrics'),

  // Smart Budgeting
  getBudgets: (userId?: string, month?: string): Promise<any[]> => {
    const activeId = userId || getActiveUserId()
    const q = month ? `?user_id=${activeId}&month=${encodeURIComponent(month)}` : `?user_id=${activeId}`
    return request<any[]>(`/budgets${q}`)
  },

  getBudgetSummary: (userId?: string, month?: string): Promise<any> => {
    const activeId = userId || getActiveUserId()
    const q = month ? `?user_id=${activeId}&month=${encodeURIComponent(month)}` : `?user_id=${activeId}`
    return request<any>(`/budgets/summary${q}`)
  },

  createOrUpdateBudget: (data: { user_id?: string; category: string; monthly_limit: number; month?: string }) =>
    request<any>('/budgets', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        user_id: data.user_id || getActiveUserId(),
      }),
    }),

  deleteBudget: (budgetId: string, userId?: string) => {
    const activeId = userId || getActiveUserId()
    return request<any>(`/budgets/${budgetId}?user_id=${activeId}`, {
      method: 'DELETE',
    })
  },

  // Recurring Payments & Subscriptions
  getRecurringItems: (userId?: string): Promise<any[]> => {
    const activeId = userId || getActiveUserId()
    return request<any[]>(`/recurring?user_id=${activeId}`)
  },

  detectRecurring: (userId?: string): Promise<any[]> => {
    const activeId = userId || getActiveUserId()
    return request<any[]>(`/recurring/detect?user_id=${activeId}`, {
      method: 'POST',
    })
  },

  confirmRecurring: (itemId: string, isConfirmed: boolean, userId?: string) => {
    const activeId = userId || getActiveUserId()
    return request<any>(`/recurring/${itemId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ user_id: activeId, is_confirmed: isConfirmed }),
    })
  },

  getUpcomingSchedule: (userId?: string, horizonDays: number = 30): Promise<any> => {
    const activeId = userId || getActiveUserId()
    return request<any>(`/recurring/upcoming?user_id=${activeId}&horizon_days=${horizonDays}`)
  },

  // Unusual Spending & Anomalies
  getAnomalies: (userId?: string, status?: string): Promise<any[]> => {
    const activeId = userId || getActiveUserId()
    const q = status ? `?user_id=${activeId}&status=${status}` : `?user_id=${activeId}`
    return request<any[]>(`/anomalies${q}`)
  },

  detectAnomalies: (userId?: string): Promise<any[]> => {
    const activeId = userId || getActiveUserId()
    return request<any[]>(`/anomalies/detect?user_id=${activeId}`, {
      method: 'POST',
    })
  },

  getAnomaliesSummary: (userId?: string): Promise<any> => {
    const activeId = userId || getActiveUserId()
    return request<any>(`/anomalies/summary?user_id=${activeId}`)
  },

  reviewAnomaly: (anomalyId: string, status: 'new' | 'reviewed' | 'confirmed_unusual' | 'dismissed', notes?: string, userId?: string) => {
    const activeId = userId || getActiveUserId()
    return request<any>(`/anomalies/${anomalyId}/review?user_id=${activeId}`, {
      method: 'POST',
      body: JSON.stringify({ status, notes }),
    })
  },

  // Cash Flow Forecast
  getForecast: (horizonDays: number = 30, startingBalance?: number, userId?: string): Promise<any> => {
    const activeId = userId || getActiveUserId()
    let q = `?horizon_days=${horizonDays}&user_id=${activeId}`
    if (startingBalance !== undefined && startingBalance !== null) {
      q += `&starting_balance=${startingBalance}`
    }
    return request<any>(`/forecast${q}`)
  },

  // Monthly Financial Review
  getMonthlyReview: (month?: string, userId?: string): Promise<any> => {
    const activeId = userId || getActiveUserId()
    const q = month ? `?month=${encodeURIComponent(month)}&user_id=${activeId}` : `?user_id=${activeId}`
    return request<any>(`/review/monthly${q}`)
  },

  // Authentication
  registerUser: (data: { name: string; email: string; password: string }): Promise<any> =>
    request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  loginUser: (data: { email: string; password: string }): Promise<any> =>
    request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getCurrentUser: (): Promise<any> =>
    request<any>('/auth/me'),

  logoutUser: (): Promise<any> =>
    request<any>('/auth/logout', {
      method: 'POST',
    }),
}
