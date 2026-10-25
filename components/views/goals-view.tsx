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
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
    if (!confirm('Are you sure you want to delete this goal?')) return
    try {
      await api.deleteGoal(id)
      setGoals(prev => prev.filter(g => g.id !== id))
    } catch (err: any) {
      alert(`Error deleting goal: ${err.message}`)
    }
  }

  const handleToggleProtection = async (cat: CategoryPreference) => {
    const newProtected = !cat.is_protected
    try {
      // Optimistic update
      setCategories(prev =>
        prev.map(c => (c.category === cat.category ? { ...c, is_protected: newProtected } : c))
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
    return goals.filter(g => g.is_feasible).length
  }, [goals])

  const protectedCount = useMemo(() => {
    return categories.filter(c => c.is_protected).length
  }, [categories])

  return (
    <div className="flex flex-col gap-8">
      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Active Goals</span>
            <Target className="size-4" />
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight">{goals.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Target financial milestones</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Monthly Needed</span>
            <TrendingUp className="size-4" />
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight">
            ₹{totalMonthlyCommitment.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Total required across all active goals</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Feasibility Status</span>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {feasibleCount} / {goals.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Goals within realistic cashflow range</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Protected Categories</span>
            <ShieldCheck className="size-4 text-sky-500" />
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-sky-600 dark:text-sky-400">
            {protectedCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Excluded from AI spending cuts</p>
        </div>
      </div>

      {/* Main Content: Goals List */}
      <section className="rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-foreground">Your Goals & Milestones</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Deterministic feasibility calculation evaluated against net cash flow surplus.
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="gap-2 self-start sm:self-auto">
            <Plus className="size-4" />
            New Goal
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin" /> Loading goals...
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-rose-500">{error}</div>
        ) : goals.length === 0 ? (
          <div className="p-12 text-center">
            <Target className="mx-auto size-10 text-muted-foreground/40" />
            <h3 className="mt-3 text-sm font-semibold">No goals created yet</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Define target goals like an Emergency Fund or Vacation to track required monthly savings.
            </p>
            <Button onClick={() => setIsModalOpen(true)} variant="outline" className="mt-4 gap-2">
              <Plus className="size-4" /> Create your first goal
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {goals.map(goal => {
              const progress = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100)) || 0
              return (
                <div
                  key={goal.id}
                  className="relative flex flex-col justify-between rounded-xl border border-border bg-card/60 p-5 shadow-xs hover:border-primary/40 transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-foreground">{goal.title}</h3>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="size-3.5" />
                          Target: {goal.target_date} ({goal.months_remaining.toFixed(1)} mos left)
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="text-muted-foreground hover:text-rose-500 transition-colors p-1"
                        aria-label="Delete goal"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="font-medium text-foreground">
                          ₹{goal.current_amount.toLocaleString('en-IN')}
                        </span>
                        <span className="text-muted-foreground">
                          of ₹{goal.target_amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="mt-1 text-right text-[11px] text-muted-foreground">
                        {progress}% achieved
                      </div>
                    </div>

                    <div className="mt-4 rounded-lg bg-muted/40 p-3 text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Monthly needed:</span>
                        <span className="font-semibold text-foreground">
                          ₹{goal.monthly_needed.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/mo
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Feasibility:</span>
                        {goal.is_feasible ? (
                          <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="size-3" /> Feasible
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-medium text-rose-600 dark:text-rose-400">
                            <AlertTriangle className="size-3" /> Shortfall ₹{Math.round(goal.shortfall || 0).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                      {goal.feasibility_notes && (
                        <p className="text-[11px] text-muted-foreground border-t border-border/50 pt-1.5 mt-1.5">
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

      {/* Protected Categories Section */}
      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-5">
          <div className="flex items-center gap-2">
            <Shield className="size-5 text-primary" />
            <h2 className="font-semibold text-foreground">Protected Category Invariants</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Any category protected below will be strictly shielded. The AI recommendation engine and simulator are algorithmically prohibited from suggesting reductions in protected categories.
          </p>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map(cat => (
            <div
              key={cat.category}
              className={`flex items-center justify-between rounded-lg border p-3.5 transition-colors ${
                cat.is_protected
                  ? 'border-sky-500/40 bg-sky-500/5'
                  : 'border-border bg-card hover:bg-muted/30'
              }`}
            >
              <div className="min-w-0 pr-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{cat.category}</span>
                  {cat.is_protected && (
                    <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-600 dark:text-sky-400">
                      Protected
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                  {cat.is_protected ? cat.reason || 'Protected from AI budget cuts' : 'Normal category'}
                </p>
              </div>

              <button
                onClick={() => handleToggleProtection(cat)}
                type="button"
                role="switch"
                aria-checked={cat.is_protected}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  cat.is_protected ? 'bg-sky-600' : 'bg-muted'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    cat.is_protected ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Modal: New Goal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h3 className="text-base font-semibold">Create Savings Goal</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Goal Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Emergency Fund, Laptop, Vacation"
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Target Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    value={targetAmount}
                    onChange={e => setTargetAmount(e.target.value)}
                    placeholder="100000"
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Current Saved (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={currentAmount}
                    onChange={e => setCurrentAmount(e.target.value)}
                    placeholder="0"
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Target Date</label>
                <input
                  type="date"
                  required
                  value={targetDate}
                  onChange={e => setTargetDate(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Goal'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
