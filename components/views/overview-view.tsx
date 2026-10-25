'use client'

import React, { useEffect, useState, useMemo } from 'react'
import {
  WalletCards,
  ArrowDownLeft,
  ArrowUpRight,
  Target,
  Sparkles,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  FileUp,
  Plus,
  Loader2,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api-client'
import { Transaction, SpendingProfileResponse, Recommendation, Goal } from '@/lib/types'

interface OverviewViewProps {
  onOpenImport: () => void
  onNavigateTab: (tab: string) => void
}

export function OverviewView({ onOpenImport, onNavigateTab }: OverviewViewProps) {
  const [profile, setProfile] = useState<SpendingProfileResponse | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cashflowPeriod, setCashflowPeriod] = useState<'6m' | '12m'>('6m')
  const [cashflowData, setCashflowData] = useState<Array<{ month_key: string; month: string; income: number; expense: number; transaction_count: number }>>([])
  const [seeding, setSeeding] = useState(false)

  const fetchDashboard = async () => {
    setLoading(true)
    setError(null)
    try {
      const [profileRes, txRes, recRes, goalsRes, cashflowRes] = await Promise.allSettled([
        api.getProfile(),
        api.getTransactions({ limit: 10 }),
        api.getRecommendations(),
        api.getGoals(),
        api.getCashflow(cashflowPeriod),
      ])

      if (profileRes.status === 'fulfilled') setProfile(profileRes.value)
      if (txRes.status === 'fulfilled') setTransactions(txRes.value.items)
      if (recRes.status === 'fulfilled') setRecommendations(recRes.value)
      if (goalsRes.status === 'fulfilled') setGoals(goalsRes.value)
      if (cashflowRes.status === 'fulfilled' && cashflowRes.value?.months) {
        setCashflowData(cashflowRes.value.months)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch overview data')
    } finally {
      setLoading(false)
    }
  }

  const handleSeedDemo = async () => {
    setSeeding(true)
    try {
      await api.seedDemoData('default_user')
      await fetchDashboard()
    } catch (err: any) {
      console.error('Failed to seed demo data', err)
      setError(err.message || 'Failed to seed demo ledger')
    } finally {
      setSeeding(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  // Refetch cashflow when period changes
  useEffect(() => {
    let mounted = true
    async function updateCashflow() {
      try {
        const res = await api.getCashflow(cashflowPeriod)
        if (mounted && res?.months) {
          setCashflowData(res.months)
        }
      } catch (err) {
        console.warn('Failed to update cashflow for period:', err)
      }
    }
    updateCashflow()
    return () => {
      mounted = false
    }
  }, [cashflowPeriod])

  // System C recommendation
  const systemCRec = useMemo(() => {
    return (
      recommendations.find(r => r.configuration === 'C') ||
      recommendations[0] ||
      null
    )
  }, [recommendations])

  // Computed metrics
  const totalRecentSpend = useMemo(() => {
    return profile?.total_recent_spending ?? 0
  }, [profile])

  const normalizedBaselineSpend = useMemo(() => {
    return profile?.total_baseline_spending ?? 0
  }, [profile])

  const spendVariance = useMemo(() => {
    if (normalizedBaselineSpend === 0) return 0
    return ((totalRecentSpend - normalizedBaselineSpend) / normalizedBaselineSpend) * 100
  }, [totalRecentSpend, normalizedBaselineSpend])

  const maxVal = useMemo(() => {
    if (cashflowData.length === 0) return 1000
    const vals = cashflowData.flatMap(d => [d.income, d.expense])
    return Math.max(...vals, 1000)
  }, [cashflowData])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" /> Loading overview dashboard...
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Financial Summary Cards */}
      <section aria-label="Financial summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Metric 1: Recent Spending */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-muted-foreground">Recent Spending</p>
            <ArrowDownLeft className="size-4 text-muted-foreground" />
          </div>
          <p className="mt-4 text-2xl font-bold tracking-tight">
            ₹{totalRecentSpend.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {profile ? `${profile.recent_days} days activity` : 'Current period'}
          </p>
          <p
            className={`mt-4 text-xs font-medium ${
              spendVariance <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {spendVariance <= 0
              ? `${Math.abs(spendVariance).toFixed(1)}% below baseline`
              : `+${spendVariance.toFixed(1)}% above baseline`}
          </p>
        </div>

        {/* Metric 2: Baseline Normalized Target */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-muted-foreground">Baseline Spending</p>
            <WalletCards className="size-4 text-muted-foreground" />
          </div>
          <p className="mt-4 text-2xl font-bold tracking-tight">
            ₹{normalizedBaselineSpend.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Normalized (B / D_b) × D_r</p>
          <p className="mt-4 text-xs font-medium text-muted-foreground">Deterministic target</p>
        </div>

        {/* Metric 3: Active Goals */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-muted-foreground">Goals Feasibility</p>
            <Target className="size-4 text-muted-foreground" />
          </div>
          <p className="mt-4 text-2xl font-bold tracking-tight">
            {goals.filter(g => g.is_feasible).length} / {goals.length || 0}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Feasible without budget deficit</p>
          <p
            className={`mt-4 text-xs font-medium ${
              goals.length === 0 || goals.every(g => g.is_feasible)
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {goals.length === 0 ? 'No goals defined' : `${goals.filter(g => !g.is_feasible).length} need attention`}
          </p>
        </div>

        {/* Metric 4: AI Recommendations Grounding */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-muted-foreground">Evidence Grounding</p>
            <ShieldCheck className="size-4 text-emerald-500" />
          </div>
          <p className="mt-4 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {systemCRec?.is_verified ? '100% Verified' : 'Checking'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {systemCRec ? `System C (${systemCRec.category})` : 'Awaiting recommendation'}
          </p>
          <p className="mt-4 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Strict numeric check
          </p>
        </div>
      </section>

      {/* Center Layout: Cashflow + System C Insight */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.9fr)]">
        {/* Cash Flow Section */}
        <section className="rounded-xl border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-foreground">Cash Flow Trajectory</h2>
              <p className="mt-1 text-xs text-muted-foreground">Monthly income vs. normalized spending pace</p>
            </div>
            <button
              onClick={() => setCashflowPeriod(cashflowPeriod === '6m' ? '12m' : '6m')}
              className="flex items-center gap-1.5 self-start rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              {cashflowPeriod === '6m' ? 'Last 6 months' : 'Last 12 months'}
              <ChevronDown className="size-3.5" />
            </button>
          </div>

          <div className="p-5">
            {cashflowData.length === 0 ? (
              <div className="flex h-52 flex-col items-center justify-center text-center text-xs text-muted-foreground">
                <p className="font-medium text-foreground">No transaction history in this timeframe</p>
                <p className="mt-1 max-w-xs">Upload statement CSV or switch timeframe to visualize empirical cashflow.</p>
              </div>
            ) : (
              <div className="flex h-52 items-end gap-3 sm:gap-5">
                <div className="flex h-full flex-col justify-between pb-2 text-[10px] text-muted-foreground">
                  <span>₹{(maxVal / 1000).toFixed(0)}k</span>
                  <span>₹{((maxVal * 0.66) / 1000).toFixed(0)}k</span>
                  <span>₹{((maxVal * 0.33) / 1000).toFixed(0)}k</span>
                  <span>₹0</span>
                </div>
                <div className="relative flex h-full flex-1 items-end justify-between gap-2 border-b border-l border-border px-2 pb-0 sm:px-5">
                  {cashflowData.map((d, index) => {
                    const incomeH = maxVal > 0 ? (d.income / maxVal) * 100 : 0
                    const expenseH = maxVal > 0 ? (d.expense / maxVal) * 100 : 0
                    return (
                      <div key={index} className="flex h-full flex-1 items-end justify-center gap-1 sm:gap-2">
                        <div
                          className="w-full max-w-6 rounded-t bg-primary/25 transition-all duration-300"
                          style={{ height: `${Math.max(4, expenseH)}%` }}
                          title={`Spending: ₹${d.expense.toLocaleString('en-IN')}`}
                        />
                        <div
                          className="w-full max-w-6 rounded-t bg-primary transition-all duration-300"
                          style={{ height: `${Math.max(4, incomeH)}%` }}
                          title={`Income: ₹${d.income.toLocaleString('en-IN')}`}
                        />
                      </div>
                    )
                  })}
                  <div className="absolute -bottom-6 left-0 right-0 flex justify-between px-2 text-[10px] text-muted-foreground">
                    {cashflowData.map((d, i) => (
                      <span key={i}>{d.month}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-10 flex justify-center gap-6 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-primary" />
                Income
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-primary/25" />
                Spending
              </span>
            </div>
          </div>
        </section>

        {/* AI Insight Card (System C) */}
        <section className="flex flex-col justify-between rounded-xl border border-border bg-card">
          <div>
            <div className="flex items-start justify-between border-b border-border p-5">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-foreground">AI Recommendation</h2>
                  {systemCRec?.is_verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="size-3" />
                      Verified
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">System C · Evidence-grounded generation</p>
              </div>
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="size-4" />
              </div>
            </div>

            <div className="p-5">
              {systemCRec ? (
                <div>
                  <p className="text-sm leading-relaxed text-foreground">
                    <span className="font-semibold">{systemCRec.action}</span>: {systemCRec.reason}
                  </p>

                  <div className="mt-4 rounded-lg bg-muted/50 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Category</span>
                      <span className="font-semibold">{systemCRec.category}</span>
                    </div>
                    {systemCRec.evidence && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Evidence Support</span>
                        <span className="font-medium text-foreground">
                          {systemCRec.evidence.transaction_count ?? 0} tx · ₹
                          {systemCRec.evidence.recent_total?.toLocaleString('en-IN') ?? 0}
                        </span>
                      </div>
                    )}
                    {systemCRec.verifier_notes && (
                      <p className="text-[11px] text-muted-foreground border-t border-border/50 pt-2">
                        {systemCRec.verifier_notes}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  <Sparkles className="mx-auto size-8 text-muted-foreground/30 mb-2" />
                  No recommendations generated yet. Import your transactions to compute evidence-backed insights.
                </div>
              )}
            </div>
          </div>

          <div className="p-5 pt-0 flex gap-2">
            <Button
              onClick={() => onNavigateTab('Verified Insights')}
              variant="outline"
              className="flex-1 gap-1.5 text-xs"
            >
              <Sparkles className="size-3.5 text-primary" />
              View Verified Insights
            </Button>
            <Button
              onClick={() => onNavigateTab('Ask FinSight')}
              className="flex-1 gap-1.5 text-xs"
            >
              Ask FinSight AI
            </Button>
          </div>
        </section>
      </div>

      {/* Recent Transactions List */}
      <section className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h2 className="font-semibold text-foreground">Recent Activity</h2>
            <p className="mt-1 text-xs text-muted-foreground">Transactions imported into your local database</p>
          </div>
          <Button
            onClick={() => onNavigateTab('Transactions')}
            variant="ghost"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            View all <ArrowUpRight className="ml-1 size-3.5" />
          </Button>
        </div>

        {transactions.length === 0 ? (
          <div className="p-10 text-center">
            <WalletCards className="mx-auto size-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">No transactions available yet in your ledger.</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Button onClick={onOpenImport} variant="outline" className="text-xs gap-1.5">
                <Plus className="size-3.5" /> Import CSV
              </Button>
              <Button onClick={handleSeedDemo} disabled={seeding} className="text-xs gap-1.5">
                {seeding ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                Load Demo Ledger (Jordan Davis)
              </Button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {transactions.slice(0, 5).map(tx => {
              const isIncome = tx.direction === 'income'
              return (
                <div key={tx.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex size-9 items-center justify-center rounded-lg ${
                        isIncome
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <WalletCards className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{tx.description}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {tx.category} · {tx.transaction_date}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`text-sm font-semibold whitespace-nowrap pl-4 ${
                      isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                    }`}
                  >
                    {isIncome ? '+' : '-'}₹
                    {tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* CSV Import Banner */}
      <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-muted/20 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-background">
            <FileUp className="size-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Import more financial data</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Supports any standard bank CSV. Column headers are automatically inferred.
            </p>
          </div>
        </div>
        <Button onClick={onOpenImport} variant="outline" className="gap-2 sm:self-center">
          <Plus className="size-4" /> Import CSV
        </Button>
      </div>
    </div>
  )
}
