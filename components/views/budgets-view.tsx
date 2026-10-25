'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  PieChart,
  Plus,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Trash2,
  Calendar,
  Sparkles,
  Loader2,
  X,
  Edit2,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CategoryBadge } from '@/components/ui/category-badge'
import { api } from '@/lib/api-client'
import { Budget, BudgetSummary } from '@/lib/types'

const CATEGORIES = [
  'Dining',
  'Groceries',
  'Retail',
  'Shopping',
  'Entertainment',
  'Travel',
  'Transportation',
  'Utilities',
  'Rent/Mortgage',
  'Healthcare',
  'Education',
  'Personal Care',
  'Subscriptions',
  'Insurance',
  'Investment',
  'Miscellaneous'
]

export function BudgetsView() {
  const [summary, setSummary] = useState<BudgetSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return new Date().toISOString().slice(0, 7)
  })

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalCategory, setModalCategory] = useState('Dining')
  const [modalLimit, setModalLimit] = useState('8000')
  const [submitting, setSubmitting] = useState(false)

  const loadBudgets = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getBudgetSummary('default_user', selectedMonth)
      setSummary(data)
    } catch (err) {
      console.error('Failed to load budgets', err)
    } finally {
      setLoading(false)
    }
  }, [selectedMonth])

  useEffect(() => {
    loadBudgets()
  }, [loadBudgets])

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modalCategory || !modalLimit) return
    setSubmitting(true)
    try {
      await api.createOrUpdateBudget({
        user_id: 'default_user',
        category: modalCategory,
        monthly_limit: parseFloat(modalLimit),
        month: selectedMonth
      })
      setIsModalOpen(false)
      await loadBudgets()
    } catch (err: any) {
      alert(`Error saving budget: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteBudget = async (budgetId: string) => {
    if (!confirm('Are you sure you want to delete this category budget?')) return
    try {
      await api.deleteBudget(budgetId, 'default_user')
      await loadBudgets()
    } catch (err: any) {
      alert(`Error deleting budget: ${err.message}`)
    }
  }

  const handleOpenEdit = (budget: Budget) => {
    setModalCategory(budget.category)
    setModalLimit(String(budget.monthly_limit))
    setIsModalOpen(true)
  }

  const handleAutoPopulateDefaults = async () => {
    setSubmitting(true)
    try {
      // Default common budget allocations
      const defaults = [
        { category: 'Dining', monthly_limit: 8000 },
        { category: 'Groceries', monthly_limit: 12000 },
        { category: 'Shopping', monthly_limit: 6000 },
        { category: 'Transportation', monthly_limit: 4500 },
        { category: 'Utilities', monthly_limit: 5000 },
        { category: 'Subscriptions', monthly_limit: 2500 }
      ]
      for (const d of defaults) {
        await api.createOrUpdateBudget({
          user_id: 'default_user',
          category: d.category,
          monthly_limit: d.monthly_limit,
          month: selectedMonth
        })
      }
      await loadBudgets()
    } catch (err: any) {
      alert(`Failed to set default budgets: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const overallBurnStatus = useMemo(() => {
    if (!summary || summary.total_budgeted === 0) return 'neutral'
    const pct = (summary.total_spent / summary.total_budgeted) * 100
    if (pct > 100) return 'exceeded'
    if (summary.total_projected > summary.total_budgeted) return 'projected_overrun'
    if (pct > 80) return 'warning'
    return 'healthy'
  }, [summary])

  return (
    <div className="flex flex-col gap-8">
      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Budgeted */}
        <div className="glass-panel group relative overflow-hidden rounded-2xl border border-border p-5 shadow-xs transition hover:border-primary/40 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Budgeted
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-500">
              <PieChart className="size-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight font-mono text-foreground">
            ₹{summary?.total_budgeted.toLocaleString('en-IN', { minimumFractionDigits: 0 }) || '0'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Across {summary?.budget_count || 0} active category limits
          </p>
        </div>

        {/* Spent Month to Date */}
        <div className="glass-panel group relative overflow-hidden rounded-2xl border border-border p-5 shadow-xs transition hover:border-primary/40 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Month-to-Date Spent
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-500">
              <TrendingDown className="size-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight font-mono text-rose-600 dark:text-rose-400">
            ₹{summary?.total_spent.toLocaleString('en-IN', { minimumFractionDigits: 0 }) || '0'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary && summary.total_budgeted > 0
              ? `${Math.round((summary.total_spent / summary.total_budgeted) * 100)}% of limit utilized`
              : 'Actual spending recorded'}
          </p>
        </div>

        {/* Remaining Discretionary Buffer */}
        <div className="glass-panel group relative overflow-hidden rounded-2xl border border-border p-5 shadow-xs transition hover:border-primary/40 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Remaining Buffer
            </span>
            <div
              className={`flex size-9 items-center justify-center rounded-xl border ${
                (summary?.total_remaining ?? 0) >= 0
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                  : 'border-rose-500/20 bg-rose-500/10 text-rose-500'
              }`}
            >
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <p
            className={`mt-3 text-3xl font-extrabold tracking-tight font-mono ${
              (summary?.total_remaining ?? 0) >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            ₹{summary?.total_remaining.toLocaleString('en-IN', { minimumFractionDigits: 0 }) || '0'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {(summary?.total_remaining ?? 0) >= 0 ? 'Safe remaining allowance' : 'Budget deficit occurred'}
          </p>
        </div>

        {/* Month-End Projected Spend */}
        <div className="glass-panel group relative overflow-hidden rounded-2xl border border-border p-5 shadow-xs transition hover:border-primary/40 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Month-End Projected
            </span>
            <div
              className={`flex size-9 items-center justify-center rounded-xl border ${
                overallBurnStatus === 'healthy'
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                  : 'border-amber-500/20 bg-amber-500/10 text-amber-500'
              }`}
            >
              <TrendingUp className="size-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight font-mono text-foreground">
            ₹{summary?.total_projected.toLocaleString('en-IN', { minimumFractionDigits: 0 }) || '0'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {overallBurnStatus === 'healthy' ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ On track within budget</span>
            ) : overallBurnStatus === 'projected_overrun' ? (
              <span className="text-amber-600 dark:text-amber-400 font-semibold">⚠ Burn rate exceeds limit</span>
            ) : (
              'Estimated burn pace'
            )}
          </p>
        </div>
      </div>

      {/* Main Budget Card */}
      <section className="glass-panel rounded-2xl border border-border bg-card shadow-xs">
        <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <div className="flex items-center gap-2">
              <PieChart className="size-5 text-primary" />
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                Category Monthly Limits & Burn Pace
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Deterministic tracking of actual debits against defined category thresholds with automatic daily burn rate projections.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
            />
            <Button
              onClick={() => {
                setModalCategory('Dining')
                setModalLimit('8000')
                setIsModalOpen(true)
              }}
              className="gap-2 rounded-xl text-xs font-semibold shadow-xs"
            >
              <Plus className="size-4" />
              Add Budget
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-20 text-sm font-medium text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin text-primary" /> Loading monthly budgets...
          </div>
        ) : !summary || summary.items.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-border bg-muted/40 text-muted-foreground shadow-xs">
              <PieChart className="size-7" />
            </div>
            <h3 className="mt-4 text-lg font-bold tracking-tight">No budgets defined for {selectedMonth}</h3>
            <p className="mt-1.5 max-w-sm mx-auto text-xs leading-relaxed text-muted-foreground">
              Control where your money goes. Set category spending limits to proactively prevent end-of-month budget overruns.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoPopulateDefaults}
                disabled={submitting}
                className="gap-2 rounded-xl text-xs"
              >
                {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5 text-primary" />}
                Auto-generate Recommended Budgets
              </Button>
              <Button
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="gap-2 rounded-xl text-xs"
              >
                <Plus className="size-3.5" /> Define Custom Limit
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3 sm:p-6">
            {summary.items.map((budget) => {
              const pct = Math.min(100, Math.round(budget.percentage_used))
              const isOver = budget.status === 'exceeded'
              const isProjectedOver = budget.status === 'projected_overrun'
              const isWarn = budget.status === 'warning'

              return (
                <div
                  key={budget.id}
                  className="glass-panel group relative flex flex-col justify-between rounded-2xl border border-border bg-card/60 p-5 shadow-xs transition hover:border-primary/40 hover:shadow-md"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CategoryBadge category={budget.category} showIcon={true} />
                        <p className="mt-2 text-xs font-semibold text-muted-foreground">
                          Monthly Allowance: <strong>₹{budget.monthly_limit.toLocaleString('en-IN')}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(budget)}
                          className="rounded-lg p-1.5 text-muted-foreground opacity-60 transition hover:bg-muted hover:text-foreground hover:opacity-100"
                          aria-label="Edit budget"
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteBudget(budget.id)}
                          className="rounded-lg p-1.5 text-muted-foreground opacity-60 transition hover:bg-rose-500/10 hover:text-rose-600 hover:opacity-100 dark:hover:bg-rose-500/20"
                          aria-label="Delete budget"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Track */}
                    <div className="mt-5">
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="font-mono text-base font-extrabold text-foreground">
                          ₹{budget.spent_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground">
                          of ₹{budget.monthly_limit.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-muted/60">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            isOver
                              ? 'bg-rose-500'
                              : isProjectedOver
                              ? 'bg-amber-500'
                              : isWarn
                              ? 'bg-amber-400'
                              : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <span className="font-bold text-foreground">{budget.percentage_used}% used</span>
                        <span
                          className={`font-semibold font-mono ${
                            budget.remaining_amount >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {budget.remaining_amount >= 0 ? '₹' + budget.remaining_amount.toLocaleString('en-IN') + ' left' : '₹' + Math.abs(budget.remaining_amount).toLocaleString('en-IN') + ' over'}
                        </span>
                      </div>
                    </div>

                    {/* Pace Projections & Status Pill */}
                    <div className="mt-5 rounded-xl border border-border/70 bg-muted/30 p-3.5 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Projected month-end:</span>
                        <span className="font-mono font-bold text-foreground">
                          ₹{budget.projected_spend.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-border/50">
                        <span className="text-muted-foreground">Budget Pace:</span>
                        {isOver ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            <AlertCircle className="size-3" /> Exceeded Limit
                          </span>
                        ) : isProjectedOver ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <AlertTriangle className="size-3" /> Overrun Projected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="size-3" /> On Track
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Modal: Add or Edit Budget */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold tracking-tight">Configure Category Budget</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Set a monthly spending limit for {selectedMonth}.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="mb-1.5 block font-semibold text-foreground">Spending Category</label>
                <select
                  value={modalCategory}
                  onChange={(e) => setModalCategory(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block font-semibold text-foreground">Monthly Limit (₹)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground font-mono">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="500"
                    min="100"
                    required
                    value={modalLimit}
                    onChange={(e) => setModalLimit(e.target.value)}
                    placeholder="8000"
                    className="h-10 w-full rounded-xl border border-border bg-background pl-8 pr-3 text-sm font-mono font-bold focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="rounded-xl font-semibold gap-2">
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    'Save Budget Limit'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
