import {
  Transaction,
  TransactionListResponse,
  CSVPreviewSummary,
  SpendingProfileResponse,
  Recommendation,
  AffordabilityResponse,
  Goal,
  CategoryPreference,
  FinancialChatResponse
} from './types'

const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
const rawBase = process.env.NEXT_PUBLIC_API_BASE_URL || (isProduction ? 'https://finsight-api-d84z.onrender.com' : 'http://localhost:8000')
const API_BASE = rawBase.replace(/\/+$/, '')

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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
  // Health
  getHealth: () => request<{ status: string; app: string; version: string }>('/health'),

  // Imports
  previewCSV: async (file: File, userId: string = 'default_user', columnMapping?: Record<string, string>): Promise<CSVPreviewSummary> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('user_id', userId)
    if (columnMapping) {
      formData.append('column_mapping', JSON.stringify(columnMapping))
    }
    const res = await fetch(`${API_BASE}/imports/preview`, {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Import preview failed: ${err}`)
    }
    return res.json()
  },

  confirmImport: (data: {
    user_id: string
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
      body: JSON.stringify(data),
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
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          query.set(k, String(v))
        }
      })
    }
    return request<TransactionListResponse>(`/transactions?${query.toString()}`)
  },

  createTransaction: (data: Partial<Transaction> & { user_id: string; description: string; amount: number; transaction_date: string }) =>
    request<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTransaction: (id: string, data: Partial<Transaction>, userId: string = 'default_user') =>
    request<Transaction>(`/transactions/${id}?user_id=${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteTransaction: (id: string, userId: string = 'default_user') =>
    request<{ message: string; id: string }>(`/transactions/${id}?user_id=${userId}`, {
      method: 'DELETE',
    }),

  getCashflow: (period: string = '6m', userId: string = 'default_user') =>
    request<{ period: string; user_id: string; months: Array<{ month_key: string; month: string; income: number; expense: number; transaction_count: number }> }>(
      `/transactions/cashflow?period=${period}&user_id=${userId}`
    ),

  clearAllTransactions: (userId: string = 'default_user') =>
    request<{ message: string }>(`/transactions?user_id=${userId}`, {
      method: 'DELETE',
    }),

  seedDemoData: (userId: string = 'default_user') =>
    request<{ message: string; seeded: boolean }>(`/transactions/seed?user_id=${userId}`, {
      method: 'POST',
    }),

  // Profile
  getProfile: (params?: {
    user_id?: string
    baseline_start?: string
    baseline_end?: string
    recent_start?: string
    recent_end?: string
  }): Promise<SpendingProfileResponse> => {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v) query.set(k, String(v))
      })
    }
    return request<SpendingProfileResponse>(`/profile?${query.toString()}`)
  },

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
      body: JSON.stringify(data),
    }),

  getRecommendations: (userId: string = 'default_user'): Promise<Recommendation[]> =>
    request<Recommendation[]>(`/recommendations?user_id=${userId}`),

  getPortfolioInsights: (userId: string = 'default_user'): Promise<Recommendation[]> =>
    request<Recommendation[]>(`/recommendations/portfolio?user_id=${userId}`),

  getRecommendationEvidence: (id: string, userId: string = 'default_user') =>
    request<{
      recommendation_id: string
      configuration: string
      category: string
      is_verified: boolean
      verifier_notes?: string
      evidence: Record<string, any>
      source_transactions: Transaction[]
    }>(`/recommendations/${id}/evidence?user_id=${userId}`),

  // Conversational Financial Intelligence (Ask FinSight)
  queryChat: (message: string, userId: string = 'default_user'): Promise<FinancialChatResponse> =>
    request<FinancialChatResponse>('/chat/query', {
      method: 'POST',
      body: JSON.stringify({ message, user_id: userId }),
    }),

  // Scenarios / Affordability
  simulateAffordability: (data: {
    user_id?: string
    purchase_amount: number
    purchase_date?: string
    available_balance?: number | null
    upcoming_obligations?: number
    emergency_buffer?: number
    notes?: string
  }): Promise<AffordabilityResponse> =>
    request<AffordabilityResponse>('/scenarios/affordability', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Goals
  getGoals: (userId: string = 'default_user'): Promise<Goal[]> =>
    request<Goal[]>(`/goals?user_id=${userId}`),

  createGoal: (data: {
    user_id?: string
    title: string
    target_amount: number
    current_amount?: number
    target_date: string
  }): Promise<Goal> =>
    request<Goal>('/goals', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteGoal: (id: string, userId: string = 'default_user') =>
    request<{ message: string; id: string }>(`/goals/${id}?user_id=${userId}`, {
      method: 'DELETE',
    }),

  // Category Preferences
  getCategoryPreferences: (userId: string = 'default_user'): Promise<CategoryPreference[]> =>
    request<CategoryPreference[]>(`/preferences/categories?user_id=${userId}`),

  updateCategoryPreference: (
    category: string,
    data: { is_protected: boolean; reason?: string },
    userId: string = 'default_user'
  ): Promise<CategoryPreference> =>
    request<CategoryPreference>(`/preferences/categories/${encodeURIComponent(category)}?user_id=${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Research Lab
  getResearchAudit: () => request<any>('/research/audit'),
  getTemporalSplit: () => request<any>('/research/split'),
  getBenchmark: () => request<any[]>('/research/benchmark'),
  runPerturbation: (data?: { user_id?: string; seed?: number; target_category?: string; delta_pct?: number }) =>
    request<any>('/research/perturbation', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),
}

