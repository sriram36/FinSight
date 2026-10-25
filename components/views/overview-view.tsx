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
  TrendingDown,
  Utensils,
  ShoppingBag,
  Home,
  Zap,
  Car,
  Repeat,
  Film,
  HeartPulse,
  CreditCard,
  MessageSquareText,
  Activity
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api-client'
import { Transaction, SpendingProfileResponse, Recommendation, Goal } from '@/lib/types'

interface OverviewViewProps {
  onOpenImport: () => void
  onNavigateTab: (tab: string) => void
}

function getCategoryVisual(category: string, direction: string) {
  if (direction === 'income') {
    return {
      icon: TrendingUp,
      bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    }
  }

  const cat = category.toLowerCase()
  if (cat.includes('dining') || cat.includes('food') || cat.includes('restaurant')) {
    return { icon: Utensils, bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' }
  }
  if (cat.includes('grocer')) {
    return { icon: ShoppingBag, bg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20' }
  }
  if (cat.includes('housing') || cat.includes('rent')) {
    return { icon: Home, bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' }
  }
  if (cat.includes('util') || cat.includes('electric') || cat.includes('water')) {
    return { icon: Zap, bg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20' }
  }
  if (cat.includes('transport') || cat.includes('transit') || cat.includes('uber')) {
    return { icon: Car, bg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20' }
  }
  if (cat.includes('subscri') || cat.includes('member')) {
    return { icon: Repeat, bg: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20' }
  }
  if (cat.includes('entertain') || cat.includes('movie')) {
    return { icon: Film, bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' }
  }
  if (cat.includes('health') || cat.includes('medical')) {
    return { icon: HeartPulse, bg: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' }
  }

  return { icon: CreditCard, bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' }
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
      <div className="flex h-72 flex-col items-center justify-center text-sm text-muted-foreground gap-3">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="font-medium">Synthesizing ledger activity and deterministic pace metrics...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Financial Summary Cards */}
      <section aria-label="Financial summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Metric 1: Recent Spending */}
        <div className="group rounded-2xl border border-border/80 bg-card p-5 shadow-xs hover:border-indigo-500/40 hover:shadow-md transition-all duration-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent Spending</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                ₹{totalRecentSpend.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 group-hover:scale-105 transition">
              <ArrowDownLeft className="size-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {profile ? `${profile.recent_days} days activity` : 'Active window'}
            </span>
            <span
              className={`inline-flex items-center gap-1 font-semibold ${
                spendVariance <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {spendVariance <= 0 ? <TrendingDown className="size-3.5" /> : <TrendingUp className="size-3.5" />}
              {spendVariance <= 0
                ? `${Math.abs(spendVariance).toFixed(1)}% below baseline`
                : `+${spendVariance.toFixed(1)}% above pace`}
            </span>
          </div>
        </div>

        {/* Metric 2: Baseline Normalized Target */}
        <div className="group rounded-2xl border border-border/80 bg-card p-5 shadow-xs hover:border-sky-500/40 hover:shadow-md transition-all duration-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Normalized Baseline</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                ₹{normalizedBaselineSpend.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500 border border-sky-500/20 group-hover:scale-105 transition">
              <WalletCards className="size-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Target: (B / D_b) × D_r</span>
            <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
              Deterministic Math
            </span>
          </div>
        </div>

        {/* Metric 3: Active Goals */}
        <div className="group rounded-2xl border border-border/80 bg-card p-5 shadow-xs hover:border-emerald-500/40 hover:shadow-md transition-all duration-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Goals Feasibility</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                {goals.filter(g => g.is_feasible).length} / {goals.length || 0}
              </p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 group-hover:scale-105 transition">
              <Target className="size-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {goals.length === 0 ? 'No active milestones' : 'Feasible without deficit'}
            </span>
            <span
              className={`font-semibold ${
                goals.length === 0 || goals.every(g => g.is_feasible)
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {goals.length === 0 ? '0 milestones' : `${goals.filter(g => !g.is_feasible).length} need attention`}
            </span>
          </div>
        </div>

        {/* Metric 4: AI Recommendations Grounding */}
        <div className="group rounded-2xl border border-border/80 bg-card p-5 shadow-xs hover:border-emerald-500/40 hover:shadow-md transition-all duration-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Evidence Grounding</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {systemCRec?.is_verified ? '100% Verified' : 'Rule-Based'}
                </span>
                <span className="relative flex size-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
                </span>
              </div>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 group-hover:scale-105 transition">
              <ShieldCheck className="size-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {systemCRec?.category ? `Focus: ${systemCRec.category}` : 'Claim Verifier Active'}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              ±1.0% Margin Audit
            </span>
          </div>
        </div>
      </section>

      {/* Center Layout: Cashflow + System C Insight */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.9fr)]">
        {/* Cash Flow Section */}
        <section className="rounded-2xl border border-border/80 bg-card shadow-xs flex flex-col justify-between">
          <div className="flex flex-col gap-3 border-b border-border/80 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-foreground tracking-tight">Cash Flow Trajectory</h2>
                <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Empirical Aggregation
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">Monthly income credits vs. normalized spending pace</p>
            </div>
            <button
              onClick={() => setCashflowPeriod(cashflowPeriod === '6m' ? '12m' : '6m')}
              className="flex items-center gap-1.5 self-start rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition"
            >
              {cashflowPeriod === '6m' ? 'Last 6 months' : 'Last 12 months'}
              <ChevronDown className="size-3.5" />
            </button>
          </div>

          <div className="p-6">
            {cashflowData.length === 0 ? (
              <div className="flex h-56 flex-col items-center justify-center text-center text-xs text-muted-foreground">
                <Activity className="size-8 text-muted-foreground/30 mb-2" />
                <p className="font-semibold text-foreground">No transaction history in this timeframe</p>
                <p className="mt-1 max-w-xs text-muted-foreground">Upload statement CSV or seed demo ledger to visualize empirical cashflow.</p>
              </div>
            ) : (
              <div className="flex h-56 items-end gap-3 sm:gap-6 pt-4">
                <div className="flex h-full flex-col justify-between pb-6 text-[10px] font-mono text-muted-foreground/80">
                  <span>₹{(maxVal / 1000).toFixed(0)}k</span>
                  <span>₹{((maxVal * 0.66) / 1000).toFixed(0)}k</span>
                  <span>₹{((maxVal * 0.33) / 1000).toFixed(0)}k</span>
                  <span>₹0</span>
                </div>
                <div className="relative flex h-full flex-1 items-end justify-between gap-3 border-b border-l border-border px-3 pb-0 sm:px-6">
                  {cashflowData.map((d, index) => {
                    const incomeH = maxVal > 0 ? (d.income / maxVal) * 100 : 0
                    const expenseH = maxVal > 0 ? (d.expense / maxVal) * 100 : 0
                    return (
                      <div key={index} className="group relative flex h-full flex-1 items-end justify-center gap-1.5 sm:gap-2">
                        {/* Expense Bar */}
                        <div
                          className="w-full max-w-7 rounded-t-md bg-gradient-to-t from-indigo-600 to-violet-400 group-hover:brightness-110 transition-all duration-300 shadow-xs"
                          style={{ height: `${Math.max(6, expenseH)}%` }}
                          title={`Spending: ₹${d.expense.toLocaleString('en-IN')}`}
                        />
                        {/* Income Bar */}
                        <div
                          className="w-full max-w-7 rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-400 group-hover:brightness-110 transition-all duration-300 shadow-xs"
                          style={{ height: `${Math.max(6, incomeH)}%` }}
                          title={`Income: ₹${d.income.toLocaleString('en-IN')}`}
                        />
                      </div>
                    )
                  })}
                  <div className="absolute -bottom-6 left-0 right-0 flex justify-between px-3 text-[10px] font-medium text-muted-foreground">
                    {cashflowData.map((d, i) => (
                      <span key={i}>{d.month}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-10 flex justify-center items-center gap-6 text-xs text-muted-foreground border-t border-border/60 pt-4">
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-emerald-500 shadow-xs" />
                <span className="font-medium text-foreground">Income Credits</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-violet-500 shadow-xs" />
                <span className="font-medium text-foreground">Spending Debits</span>
              </span>
            </div>
          </div>
        </section>

        {/* AI Insight Card (System C) */}
        <section className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card shadow-xs">
          <div>
            <div className="flex items-start justify-between border-b border-border/80 p-5">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-foreground tracking-tight">Verified Insight</h2>
                  {systemCRec?.is_verified && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-3" />
                      Grounded
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">System C · Mathematical claim validation</p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="size-4" />
              </div>
            </div>

            <div className="p-5">
              {systemCRec ? (
                <div>
                  <h3 className="text-base font-bold text-foreground leading-snug">
                    {systemCRec.action}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {systemCRec.reason}
                  </p>

                  <div className="mt-4 rounded-xl bg-muted/40 border border-border/60 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Target Category</span>
                      <span className="font-semibold text-foreground">{systemCRec.category}</span>
                    </div>
                    {systemCRec.expected_impact && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Recoverable Surplus</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          ₹{systemCRec.expected_impact.toLocaleString('en-IN', { minimumFractionDigits: 2 })}/mo
                        </span>
                      </div>
                    )}
                    {systemCRec.verifier_notes && (
                      <p className="text-[11px] text-muted-foreground border-t border-border/50 pt-2 leading-relaxed">
                        ✓ {systemCRec.verifier_notes}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  <Sparkles className="mx-auto size-8 text-muted-foreground/30 mb-2" />
                  No recommendations generated yet. Import your transactions or load the demo ledger.
                </div>
              )}
            </div>
          </div>

          <div className="p-5 pt-0 flex flex-col sm:flex-row gap-2 border-t border-border/60 pt-4">
            <Button
              onClick={() => onNavigateTab('Verified Insights')}
              variant="outline"
              className="flex-1 gap-1.5 text-xs rounded-xl"
            >
              <Sparkles className="size-3.5 text-primary" />
              Portfolio Insights
            </Button>
            <Button
              onClick={() => onNavigateTab('Ask FinSight')}
              className="flex-1 gap-1.5 text-xs rounded-xl"
            >
              <MessageSquareText className="size-3.5" />
              Ask Copilot
            </Button>
          </div>
        </section>
      </div>

      {/* Recent Transactions List */}
      <section className="rounded-2xl border border-border/80 bg-card shadow-xs">
        <div className="flex items-center justify-between border-b border-border/80 p-5">
          <div>
            <h2 className="font-bold text-foreground tracking-tight">Recent Ledger Activity</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Verified transactions stored in your local ledger</p>
          </div>
          <Button
            onClick={() => onNavigateTab('Transactions')}
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            View full ledger <ArrowUpRight className="size-3.5" />
          </Button>
        </div>

        {transactions.length === 0 ? (
          <div className="p-12 text-center">
            <WalletCards className="mx-auto size-10 text-muted-foreground/30 mb-3" />
            <p className="font-semibold text-sm text-foreground">No transactions available yet in your ledger</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Import a statement CSV or populate Jordan Davis's sample demonstration ledger with 90 days of categorized activity.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <Button onClick={onOpenImport} variant="outline" className="text-xs gap-1.5 rounded-xl">
                <Plus className="size-3.5" /> Import CSV Statement
              </Button>
              <Button onClick={handleSeedDemo} disabled={seeding} className="text-xs gap-1.5 rounded-xl">
                {seeding ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                Load Demo Ledger (Jordan Davis)
              </Button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {transactions.slice(0, 6).map(tx => {
              const isIncome = tx.direction === 'income'
              const visual = getCategoryVisual(tx.category, tx.direction)
              const IconComp = visual.icon

              return (
                <div key={tx.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/20 transition">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${visual.bg}`}>
                      <IconComp className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{tx.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className="font-medium text-foreground/80">{tx.category}</span>
                        <span>•</span>
                        <span>{tx.transaction_date}</span>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`text-sm font-bold whitespace-nowrap pl-4 ${
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
    </div>
  )
}
