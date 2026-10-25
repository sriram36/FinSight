'use client'

import React, { useEffect, useState, useMemo } from 'react'
import {
  Target,
  Plus,
  Shield,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Trash2,
  TrendingUp,
  X,
  Loader2,
  Sparkles,
  ArrowRight,
  Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getCategoryMeta } from '@/components/ui/category-badge'
import { api } from '@/lib/api-client'
import { Goal, CategoryPreference } from '@/lib/types'

export function GoalsView() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [categories, setCategories] = useState<CategoryPreference[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form state for creating a goal
  const [title, setTitle] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [currentAmount, setCurrentAmount] = useState('0')
  const [targetDate, setTargetDate] = useState('')

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [goalsRes, catRes] = await Promise.all([
        api.getGoals(),
        api.getCategoryPreferences(),
      ])
      setGoals(goalsRes)
      setCategories(catRes)
    } catch (err: any) {
      setError(err.message || 'Failed to load goals data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !targetAmount || !targetDate) return
    setSubmitting(true)
    try {
      await api.createGoal({
        title,
        target_amount: parseFloat(targetAmount),
        current_amount: parseFloat(currentAmount || '0'),
        target_date: targetDate,
      })
      setTitle('')
      setTargetAmount('')
      setCurrentAmount('0')
      setTargetDate('')
      setIsModalOpen(false)
      await loadData()
    } catch (err: any) {
      alert(`Error creating goal: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteGoal = async (id: string) => {
    if (!confirm('Are you sure you want to remove this financial milestone?')) return
    try {
      await api.deleteGoal(id)
      setGoals((prev) => prev.filter((g) => g.id !== id))
    } catch (err: any) {
      alert(`Error deleting goal: ${err.message}`)
    }
  }

  const handleToggleProtection = async (cat: CategoryPreference) => {
    const newProtected = !cat.is_protected
    try {
      // Optimistic update
      setCategories((prev) =>
        prev.map((c) =>
          c.category === cat.category ? { ...c, is_protected: newProtected } : c
        )
      )
      await api.updateCategoryPreference(cat.category, {
        is_protected: newProtected,
        reason: newProtected ? 'User flagged as non-negotiable' : undefined,
      })
    } catch (err: any) {
      alert(`Failed to update category protection: ${err.message}`)
      loadData()
    }
  }

  const totalMonthlyCommitment = useMemo(() => {
    return goals.reduce((acc, g) => acc + (g.monthly_needed || 0), 0)
  }, [goals])

  const feasibleCount = useMemo(() => {
    return goals.filter((g) => g.is_feasible).length
  }, [goals])

  const protectedCount = useMemo(() => {
    return categories.filter((c) => c.is_protected).length
  }, [categories])

  return (
    <div className="flex flex-col gap-8">
      {/* Metrics Row with Glass Panels */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Goals */}
        <div className="glass-panel group relative overflow-hidden rounded-2xl border border-border p-5 shadow-xs transition hover:border-primary/40 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active Milestones
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-500">
              <Target className="size-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-foreground">{goals.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Target financial milestones</p>
        </div>

        {/* Monthly Needed */}
        <div className="glass-panel group relative overflow-hidden rounded-2xl border border-border p-5 shadow-xs transition hover:border-amber-500/40 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Monthly Needed
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-500">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-foreground">
            ₹{totalMonthlyCommitment.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Cumulative monthly reservation required</p>
        </div>

        {/* Feasibility Status */}
        <div className="glass-panel group relative overflow-hidden rounded-2xl border border-border p-5 shadow-xs transition hover:border-emerald-500/40 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Feasibility Rate
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
            {feasibleCount} / {goals.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {goals.length > 0 && feasibleCount === goals.length
              ? '100% covered by cash flow surplus'
              : 'Goals achievable without budget deficit'}
          </p>
        </div>

        {/* Protected Invariants */}
        <div className="glass-panel group relative overflow-hidden rounded-2xl border border-border p-5 shadow-xs transition hover:border-sky-500/40 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              Protected Invariants
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10 text-sky-500">
              <ShieldCheck className="size-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-sky-600 dark:text-sky-400">
            {protectedCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Immune to AI spending reductions</p>
        </div>
      </div>

      {/* Main Content: Goals Grid */}
      <section className="glass-panel rounded-2xl border border-border bg-card shadow-xs">
        <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <div className="flex items-center gap-2">
              <Target className="size-5 text-primary" />
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                Target Savings Milestones
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Deterministic feasibility calculation evaluated against net cash flow pace. Active goals are automatically reserved in the “Can I Afford This?” simulator.
            </p>
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="gap-2 self-start rounded-xl text-xs font-semibold sm:self-auto shadow-xs"
          >
            <Plus className="size-4" />
            New Goal
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-20 text-sm font-medium text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin text-primary" /> Loading financial milestones...
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-rose-500">{error}</div>
        ) : goals.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-border bg-muted/40 text-muted-foreground shadow-xs">
              <Target className="size-7" />
            </div>
            <h3 className="mt-4 text-lg font-bold tracking-tight">No active goals defined</h3>
            <p className="mt-1.5 max-w-sm mx-auto text-xs leading-relaxed text-muted-foreground">
              Define target goals like an Emergency Cushion, Vehicle, or Travel Fund to track required monthly savings pace.
            </p>
            <Button
              onClick={() => setIsModalOpen(true)}
              variant="outline"
              className="mt-5 gap-2 rounded-xl text-xs font-semibold"
            >
              <Plus className="size-4 text-primary" /> Create your first goal
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3 sm:p-6">
            {goals.map((goal) => {
              const progress =
                Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100)) || 0
              const isFeasible = goal.is_feasible

              return (
                <div
                  key={goal.id}
                  className="glass-panel group relative flex flex-col justify-between rounded-2xl border border-border bg-card/60 p-5 shadow-xs transition hover:border-primary/40 hover:shadow-md"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold tracking-tight text-foreground">
                          {goal.title}
                        </h3>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="size-3.5 text-muted-foreground" />
                          Target: {goal.target_date}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          <Clock className="size-3" />
                          {goal.months_remaining.toFixed(1)} mos
                        </span>
                        <button
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="rounded-lg p-1.5 text-muted-foreground opacity-60 transition hover:bg-rose-500/10 hover:text-rose-600 hover:opacity-100 dark:hover:bg-rose-500/20"
                          aria-label={`Delete goal ${goal.title}`}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar & Amounts */}
                    <div className="mt-5">
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="font-mono text-sm font-bold text-foreground">
                          ₹{goal.current_amount.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          of ₹{goal.target_amount.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-muted/60">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            isFeasible
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              : 'bg-gradient-to-r from-amber-500 to-rose-400'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{progress}% accumulated</span>
                        <span className="font-semibold text-foreground">
                          ₹{(goal.target_amount - goal.current_amount).toLocaleString('en-IN')} to go
                        </span>
                      </div>
                    </div>

                    {/* Feasibility Card Footer */}
                    <div className="mt-5 rounded-xl border border-border/70 bg-muted/30 p-3.5 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Monthly needed:</span>
                        <span className="font-mono font-bold text-foreground">
                          ₹
                          {goal.monthly_needed.toLocaleString('en-IN', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })}
                          /mo
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Feasibility:</span>
                        {isFeasible ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="size-3.5" /> Feasible Pace
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
                            <AlertTriangle className="size-3.5" /> Shortfall ₹
                            {Math.round(goal.shortfall || 0).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>

                      {goal.feasibility_notes && (
                        <p className="border-t border-border/50 pt-2 text-[11px] leading-relaxed text-muted-foreground">
                          {goal.feasibility_notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Protected Category Invariants Section */}
      <section className="glass-panel rounded-2xl border border-border bg-card shadow-xs">
        <div className="border-b border-border p-5 sm:p-6">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500 border border-sky-500/20">
              <Shield className="size-4" />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Protected Category Invariants
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Categories protected below are mathematically non-negotiable. The AI recommendation engine and purchase simulator are algorithmically prohibited from suggesting reductions in protected categories.
          </p>
        </div>

        <div className="grid gap-3.5 p-5 sm:grid-cols-2 lg:grid-cols-3 sm:p-6">
          {categories.map((cat) => {
            const meta = getCategoryMeta(cat.category)
            const Icon = meta.icon

            return (
              <div
                key={cat.category}
                className={`flex items-center justify-between rounded-xl border p-4 transition ${
                  cat.is_protected
                    ? 'border-sky-500/40 bg-sky-500/5 shadow-xs'
                    : 'border-border bg-card/60 hover:border-border/90 hover:bg-muted/30'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div
                    className={`flex size-9 shrink-0 items-center justify-center rounded-xl border ${
                      cat.is_protected
                        ? 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400'
                        : 'border-border bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold tracking-tight text-foreground truncate">
                        {cat.category}
                      </span>
                      {cat.is_protected && (
                        <span className="rounded-full bg-sky-500/15 px-2 py-0.2 text-[10px] font-bold text-sky-600 dark:text-sky-400">
                          Shielded
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                      {cat.is_protected
                        ? cat.reason || 'Protected from AI budget cuts'
                        : 'Discretionary eligible'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleProtection(cat)}
                  type="button"
                  role="switch"
                  aria-checked={cat.is_protected}
                  aria-label={`Toggle protection for ${cat.category}`}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500/40 ${
                    cat.is_protected ? 'bg-sky-600' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      cat.is_protected ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {/* Modal: New Goal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold tracking-tight">Create Savings Milestone</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Establish a target reserve for feasibility analysis.
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

            <form onSubmit={handleCreateGoal} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="mb-1.5 block font-semibold text-foreground">Milestone Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 6-Month Emergency Cushion, Laptop, Japan Trip"
                  className="h-10 w-full rounded-xl border border-border bg-background px-3.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block font-semibold text-foreground">Target Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="100000"
                    className="h-10 w-full rounded-xl border border-border bg-background px-3.5 text-sm font-mono font-bold focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block font-semibold text-foreground">Currently Saved (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    placeholder="0"
                    className="h-10 w-full rounded-xl border border-border bg-background px-3.5 text-sm font-mono font-bold focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block font-semibold text-foreground">Target Completion Date</label>
                <input
                  type="date"
                  required
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
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
                      <Loader2 className="size-4 animate-spin" /> Creating...
                    </>
                  ) : (
                    'Establish Milestone'
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
