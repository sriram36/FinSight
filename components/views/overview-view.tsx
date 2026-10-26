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
  Activity,
  ShieldAlert,
  Flame,
  Clock,
  Check,
  X,
  PieChart,
  UserRound,
  Layers
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api-client'
import {
  Transaction,
  SpendingProfileResponse,
  Recommendation,
  Goal,
  SafeToSpendResponse,
  UserConstraint,
  UPIContextCluster,
  ConstraintType
} from '@/lib/types'
import { TransactionsView } from '@/components/views/transactions-view'
import { BudgetsView } from '@/components/views/budgets-view'
import { ProfileView } from '@/components/views/profile-view'

interface OverviewViewProps {
  onOpenImport: () => void
  onNavigateTab: (tab: string) => void
  initialSubTab?: 'overview' | 'transactions' | 'budgets' | 'profile'
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

export function OverviewView({ onOpenImport, onNavigateTab, initialSubTab = 'overview' }: OverviewViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'transactions' | 'budgets' | 'profile'>(initialSubTab)
  const [profile, setProfile] = useState<SpendingProfileResponse | null>(null)
  const [safeToSpend, setSafeToSpend] = useState<SafeToSpendResponse | null>(null)
  const [constraints, setConstraints] = useState<UserConstraint[]>([])
  const [contextPrompts, setContextPrompts] = useState<UPIContextCluster[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cashflowPeriod, setCashflowPeriod] = useState<'6m' | '12m'>('6m')
  const [cashflowData, setCashflowData] = useState<Array<{ month_key: string; month: string; income: number; expense: number; transaction_count: number }>>([])
  const [seeding, setSeeding] = useState(false)
  const [resolvingKey, setResolvingKey] = useState<string | null>(null)
  const [actionNotice, setActionNotice] = useState<string | null>(null)

  // Add constraint modal state
  const [showAddConstraint, setShowAddConstraint] = useState(false)
  const [cType, setCType] = useState<ConstraintType>('HARD_FLOOR')
  const [cLabel, setCLabel] = useState('')
  const [cAmount, setCAmount] = useState('')
  const [cDueDay, setCDueDay] = useState('')
  const [savingConstraint, setSavingConstraint] = useState(false)

  const fetchDashboard = async () => {
    setLoading(true)
    setError(null)
    try {
      const [profileRes, safeRes, cstRes, promptsRes, txRes, recRes, goalsRes, cashflowRes] = await Promise.allSettled([
        api.getProfile(),
        api.getSafeToSpend(),
        api.getConstraints(),
        api.getContextPrompts(),
        api.getTransactions({ limit: 8 }),
        api.getRecommendations(),
        api.getGoals(),
        api.getCashflow(cashflowPeriod),
      ])

      if (profileRes.status === 'fulfilled') setProfile(profileRes.value)
      if (safeRes.status === 'fulfilled') setSafeToSpend(safeRes.value)
      if (cstRes.status === 'fulfilled') setConstraints(cstRes.value)
      if (promptsRes.status === 'fulfilled' && promptsRes.value?.clusters) {
        setContextPrompts(promptsRes.value.clusters)
      }
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
      setActionNotice('Demo ledger successfully loaded with active constraints & UPI clusters.')
      setTimeout(() => setActionNotice(null), 5000)
    } catch (err: any) {
      console.error('Failed to seed demo data', err)
      setError(err.message || 'Failed to seed demo ledger')
    } finally {
      setSeeding(false)
    }
  }

  const handleResolveCluster = async (cluster: UPIContextCluster, category: string, registerIou: boolean = false) => {
    setResolvingKey(cluster.cluster_key)
    try {
      await api.resolveCluster({
        cluster_key: cluster.cluster_key,
        category,
        register_iou: registerIou,
        iou_label: registerIou ? `Split bill owed by ${cluster.counterparty}` : undefined,
      })
      setActionNotice(
        registerIou
          ? `Categorized ${cluster.transaction_count} transactions as ${category} and registered ₹${cluster.exact_sum.toLocaleString('en-IN')} IOU constraint!`
          : `Categorized ${cluster.transaction_count} transactions as ${category}!`
      )
      setTimeout(() => setActionNotice(null), 5000)
      // Refresh prompts, constraints, and transactions
      const [pRes, cRes, sRes] = await Promise.all([
        api.getContextPrompts(),
        api.getConstraints(),
        api.getSafeToSpend(),
      ])
      if (pRes?.clusters) setContextPrompts(pRes.clusters)
      if (cRes) setConstraints(cRes)
      if (sRes) setSafeToSpend(sRes)
    } catch (err: any) {
      console.error('Failed to resolve cluster', err)
    } finally {
      setResolvingKey(null)
    }
  }

  const handleToggleConstraint = async (c: UserConstraint) => {
    try {
      await api.updateConstraint(c.id, { is_active: !c.is_active })
      const [cRes, sRes] = await Promise.all([api.getConstraints(), api.getSafeToSpend()])
      if (cRes) setConstraints(cRes)
      if (sRes) setSafeToSpend(sRes)
    } catch (err) {
      console.error('Failed to toggle constraint', err)
    }
  }

  const handleCreateConstraint = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cLabel || !cAmount) return
    setSavingConstraint(true)
    try {
      await api.createConstraint({
        constraint_type: cType,
        label: cLabel,
        amount: parseFloat(cAmount),
        due_day: cDueDay ? parseInt(cDueDay) : null,
        is_active: true,
      })
      setShowAddConstraint(false)
      setCLabel('')
      setCAmount('')
      setCDueDay('')
      const [cRes, sRes] = await Promise.all([api.getConstraints(), api.getSafeToSpend()])
      if (cRes) setConstraints(cRes)
      if (sRes) setSafeToSpend(sRes)
      setActionNotice('Persistent constraint created and factored into Safe-to-Spend.')
      setTimeout(() => setActionNotice(null), 4000)
    } catch (err: any) {
      console.error('Failed to add constraint', err)
    } finally {
      setSavingConstraint(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

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

  const systemCRec = useMemo(() => {
    return (
      recommendations.find(r => r.configuration === 'C') ||
      recommendations[0] ||
      null
    )
  }, [recommendations])

  const totalRecentSpend = useMemo(() => profile?.total_recent_spending ?? 0, [profile])
  const normalizedBaselineSpend = useMemo(() => profile?.total_baseline_spending ?? 0, [profile])
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
        <p className="font-medium">Synthesizing constraint memory, Safe-to-Spend runway, and ledger metrics...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Pillar 1 Sub-Tab Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/50 border border-border/60">
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              activeSubTab === 'overview'
                ? 'bg-background text-foreground shadow-xs border border-border/70'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="size-3.5 text-primary" />
            Command Center
          </button>
          <button
            onClick={() => setActiveSubTab('transactions')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              activeSubTab === 'transactions'
                ? 'bg-background text-foreground shadow-xs border border-border/70'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <WalletCards className="size-3.5 text-indigo-500" />
            Ledger Transactions
          </button>
          <button
            onClick={() => setActiveSubTab('budgets')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              activeSubTab === 'budgets'
                ? 'bg-background text-foreground shadow-xs border border-border/70'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <PieChart className="size-3.5 text-teal-500" />
            Budget Envelopes
          </button>
          <button
            onClick={() => setActiveSubTab('profile')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              activeSubTab === 'profile'
                ? 'bg-background text-foreground shadow-xs border border-border/70'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShieldCheck className="size-3.5 text-emerald-500" />
            Profile & Protection
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={onOpenImport} variant="outline" size="sm" className="text-xs gap-1.5 rounded-xl">
            <Plus className="size-3.5" /> Import CSV
          </Button>
          <Button onClick={handleSeedDemo} disabled={seeding} variant="secondary" size="sm" className="text-xs gap-1.5 rounded-xl">
            {seeding ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5 text-primary" />}
            Reset Demo Ledger
          </Button>
        </div>
      </div>

      {actionNotice && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-700 dark:text-emerald-300 flex items-center justify-between animate-in fade-in">
          <span>✓ {actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="text-emerald-700 dark:text-emerald-300">
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Render Sub-View if chosen */}
      {activeSubTab === 'transactions' && (
        <TransactionsView onOpenImport={onOpenImport} />
      )}
      {activeSubTab === 'budgets' && (
        <BudgetsView />
      )}
      {activeSubTab === 'profile' && (
        <ProfileView onOpenImport={onOpenImport} />
      )}

      {/* Primary Command Center View */}
      {activeSubTab === 'overview' && (
        <>
          {/* ── HERO BANNER: True Safe-to-Spend Today ───────────────── */}
          <section className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-background p-6 sm:p-7 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="badge-teal rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider">
                    Pillar 1: Command Center
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="size-3.5" /> Persistent Constraint Memory
                  </span>
                </div>

                <div className="mt-3 flex items-baseline gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    True Safe-to-Spend Today
                  </p>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl sm:text-5xl font-black tracking-tight text-foreground">
                    ₹{safeToSpend ? safeToSpend.safe_to_spend_today.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                  </span>
                  <span className="text-base font-bold text-muted-foreground">/ day</span>
                </div>
                <p className="mt-2 max-w-xl text-xs text-muted-foreground leading-relaxed">
                  Formula: <code className="font-mono text-[11px] bg-muted/60 px-1.5 py-0.5 rounded text-foreground">(Raw Balance - Unpaid Fixed Obligations - Hard Floor - Essential Burn) / Cycle Days</code>. Unlike commercial apps that encourage impulse buys with raw bank balance, FinSight protects your non-negotiables.
                </p>
              </div>

              {/* Headline Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-border/80 bg-card/80 p-3.5 backdrop-blur-xs">
                  <span className="text-[11px] font-medium text-muted-foreground">Raw Bank Balance</span>
                  <p className="text-base font-bold text-foreground font-mono mt-0.5">
                    ₹{safeToSpend?.raw_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                  </p>
                  <span className="text-[10px] text-muted-foreground">Unfiltered liquid ledger</span>
                </div>

                <div className="rounded-2xl border border-border/80 bg-card/80 p-3.5 backdrop-blur-xs">
                  <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400">Locked by Constraints</span>
                  <p className="text-base font-bold text-rose-600 dark:text-rose-400 font-mono mt-0.5">
                    ₹{safeToSpend?.locked_by_constraints.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                  </p>
                  <span className="text-[10px] text-muted-foreground">Floor + Unpaid Rent</span>
                </div>

                <div className="rounded-2xl border border-border/80 bg-card/80 p-3.5 backdrop-blur-xs col-span-2 sm:col-span-1">
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Liquidity Runway</span>
                  <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                    {safeToSpend?.runway_days_remaining ?? 30} days
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    Next Inflow: {safeToSpend?.next_inflow_date || 'In 14 days'}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Active Constraint Memory Interactive Pills ─────────── */}
            <div className="mt-6 pt-5 border-t border-border/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-foreground tracking-tight">Active Constraint Memory</p>
                  <span className="text-[11px] text-muted-foreground">({constraints.filter(c => c.is_active).length} active rules protecting balance)</span>
                </div>
                <Button
                  onClick={() => setShowAddConstraint(true)}
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1 h-7 rounded-lg"
                >
                  <Plus className="size-3" /> Add Rule
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {constraints.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleToggleConstraint(c)}
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                      c.is_active
                        ? c.constraint_type === 'HARD_FLOOR'
                          ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                          : c.constraint_type === 'FIXED_OBLIGATION'
                          ? 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                          : c.constraint_type === 'PENDING_IOU'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                        : 'border-border/60 bg-muted/40 text-muted-foreground line-through opacity-60'
                    }`}
                    title={c.is_active ? 'Click to deactivate rule' : 'Click to activate rule'}
                  >
                    <span>
                      {c.constraint_type === 'HARD_FLOOR' && '🛡️'}
                      {c.constraint_type === 'FIXED_OBLIGATION' && '📅'}
                      {c.constraint_type === 'BEHAVIORAL_CAP' && '⚠️'}
                      {c.constraint_type === 'PENDING_IOU' && '🤝'}
                    </span>
                    <span>{c.label}:</span>
                    <span className="font-mono">₹{c.amount.toLocaleString('en-IN')}</span>
                    {c.due_day && <span className="text-[10px] opacity-80">(Due {c.due_day}th)</span>}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ── 1-TAP SMART UPI CONTEXT STITCHER CARDS ──────────────── */}
          {contextPrompts.length > 0 && (
            <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    <Zap className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Smart UPI Context Stitcher</h3>
                    <p className="text-[11px] text-muted-foreground">1-Tap disambiguation for blind UPI transfers and group split bills</p>
                  </div>
                </div>
                <span className="badge-amber rounded-md px-2 py-0.5 text-[10px] font-bold">
                  {contextPrompts.length} Prompt{contextPrompts.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {contextPrompts.slice(0, 4).map((clu) => (
                  <div key={clu.cluster_id} className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-foreground leading-snug">{clu.prompt}</span>
                        <span className="text-xs font-mono font-bold text-foreground shrink-0">
                          ₹{clu.exact_sum.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[11px] text-muted-foreground">
                        {clu.transaction_count} transfers · {clu.time_of_day_bucket} · avg ₹{Math.round(clu.average_amount).toLocaleString('en-IN')}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-end gap-2">
                      {clu.likely_split_bill ? (
                        <Button
                          onClick={() => handleResolveCluster(clu, 'Transfer', true)}
                          disabled={resolvingKey === clu.cluster_key}
                          size="sm"
                          className="text-xs h-7 rounded-lg gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                        >
                          {resolvingKey === clu.cluster_key ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                          Yes, Register IOU (Rahul)
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleResolveCluster(clu, clu.suggested_category)}
                          disabled={resolvingKey === clu.cluster_key}
                          size="sm"
                          className="text-xs h-7 rounded-lg gap-1 font-semibold"
                        >
                          {resolvingKey === clu.cluster_key ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                          Categorize all as {clu.suggested_category}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── 4 KPI CARDS ─────────────────────────────────────────── */}
          <section aria-label="Financial summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="card-lift group rounded-2xl border border-border/70 bg-card p-5 shadow-xs hover:border-indigo-500/30 hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="section-label mb-2">Recent Spending</p>
                  <p className="text-[22px] font-extrabold tracking-tight text-foreground leading-none">
                    ₹{totalRecentSpend.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="ml-3 flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/10 text-indigo-500 border border-indigo-500/20">
                  <ArrowDownLeft className="size-4.5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{profile ? `${profile.recent_days}d window` : 'Active'}</span>
                <span className={`inline-flex items-center gap-1 font-semibold ${spendVariance <= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {spendVariance <= 0 ? <TrendingDown className="size-3.5" /> : <TrendingUp className="size-3.5" />}
                  {spendVariance <= 0 ? `${Math.abs(spendVariance).toFixed(1)}% under` : `+${spendVariance.toFixed(1)}% over`}
                </span>
              </div>
            </div>

            <div className="card-lift group rounded-2xl border border-border/70 bg-card p-5 shadow-xs hover:border-sky-500/30 hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="section-label mb-2">Normalized Baseline</p>
                  <p className="text-[22px] font-extrabold tracking-tight text-foreground leading-none">
                    ₹{normalizedBaselineSpend.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="ml-3 flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/20 to-cyan-500/10 text-sky-500 border border-sky-500/20">
                  <WalletCards className="size-4.5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Formula: (B / D_b) × D_r</span>
                <span className="badge-teal rounded-md px-2 py-px text-[10px] font-semibold">Deterministic</span>
              </div>
            </div>

            <div className="card-lift group rounded-2xl border border-border/70 bg-card p-5 shadow-xs hover:border-emerald-500/30 hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="section-label mb-2">Active Goals Feasibility</p>
                  <p className="text-[22px] font-extrabold tracking-tight text-foreground leading-none">
                    {goals.filter(g => g.is_feasible).length}
                    <span className="text-base font-semibold text-muted-foreground"> / {goals.length || 0}</span>
                  </p>
                </div>
                <div className="ml-3 flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-500 border border-emerald-500/20">
                  <Target className="size-4.5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Discretionary reserve</span>
                <button onClick={() => onNavigateTab('Decision Simulator')} className="text-primary font-semibold hover:underline">
                  Simulate Impact →
                </button>
              </div>
            </div>

            <div className="card-lift group rounded-2xl border border-border/70 bg-card p-5 shadow-xs hover:border-emerald-500/30 hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="section-label mb-2">Evidence Grounding</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[22px] font-extrabold tracking-tight leading-none text-emerald-600 dark:text-emerald-400">
                      {systemCRec?.is_verified ? '100%' : 'Rule'}
                    </span>
                    <span className="relative flex size-2 mt-0.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
                    </span>
                  </div>
                </div>
                <div className="ml-3 flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-500 border border-emerald-500/20">
                  <ShieldCheck className="size-4.5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{systemCRec?.category || 'Verifier active'}</span>
                <span className="badge-emerald rounded-md px-2 py-px text-[10px] font-semibold">±1.0% Audit</span>
              </div>
            </div>
          </section>

          {/* ── Cashflow + System C Insight ─────────────────────────── */}
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.9fr)]">
            <section className="rounded-2xl border border-border/70 bg-card shadow-xs flex flex-col justify-between">
              <div className="flex flex-col gap-3 border-b border-border/60 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="font-bold text-[15px] text-foreground tracking-tight">Cash Flow Trajectory</h2>
                    <span className="badge-teal rounded-full px-2 py-px text-[10px] font-bold">Empirical</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">Monthly income credits vs. normalized spending pace</p>
                </div>
                <button
                  onClick={() => setCashflowPeriod(cashflowPeriod === '6m' ? '12m' : '6m')}
                  className="flex items-center gap-1.5 self-start rounded-xl border border-border/70 bg-muted/40 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition"
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
                            <div
                              className="w-full max-w-7 rounded-t-md bg-gradient-to-t from-indigo-600 to-violet-400 group-hover:brightness-110 transition-all duration-300 shadow-xs"
                              style={{ height: `${Math.max(6, expenseH)}%` }}
                              title={`Spending: ₹${d.expense.toLocaleString('en-IN')}`}
                            />
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
            <section className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card shadow-xs">
              <div>
                <div className="flex items-start justify-between border-b border-border/60 p-5">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="font-bold text-[15px] text-foreground tracking-tight">Verified Insight</h2>
                      {systemCRec?.is_verified && (
                        <span className="badge-emerald inline-flex items-center gap-1 rounded-full px-2.5 py-px text-[10px] font-bold">
                          <CheckCircle2 className="size-3" /> Grounded
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">System C · Mathematical claim validation</p>
                  </div>
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary border border-primary/20">
                    <Sparkles className="size-4.5" />
                  </div>
                </div>

                <div className="p-5">
                  {systemCRec ? (
                    <div>
                      <h3 className="text-base font-bold text-foreground leading-snug">{systemCRec.action}</h3>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{systemCRec.reason}</p>

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
                  onClick={() => onNavigateTab('Behavioral Autopsy')}
                  variant="outline"
                  className="flex-1 gap-1.5 text-xs rounded-xl"
                >
                  <Activity className="size-3.5 text-primary" />
                  Behavioral Autopsy
                </Button>
                <Button
                  onClick={() => onNavigateTab('AI CFO Co-Pilot')}
                  className="flex-1 gap-1.5 text-xs rounded-xl"
                >
                  <MessageSquareText className="size-3.5" />
                  Ask AI Co-Pilot
                </Button>
              </div>
            </section>
          </div>

          {/* ── Recent Transactions Snapshot ─────────────────────────── */}
          <section className="rounded-2xl border border-border/70 bg-card shadow-xs">
            <div className="flex items-center justify-between border-b border-border/60 p-5">
              <div>
                <h2 className="font-bold text-foreground tracking-tight">Recent Ledger Activity</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Verified transactions stored in your local database</p>
              </div>
              <Button
                onClick={() => setActiveSubTab('transactions')}
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground gap-1"
              >
                Open Full Ledger <ArrowUpRight className="size-3.5" />
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
        </>
      )}

      {/* ── Modal: Add Persistent Constraint ────────────────────────── */}
      {showAddConstraint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-primary" />
                <h3 className="font-bold text-base text-foreground">Add Persistent Constraint</h3>
              </div>
              <button onClick={() => setShowAddConstraint(false)} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateConstraint} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-foreground">Constraint Type</label>
                <select
                  value={cType}
                  onChange={(e) => setCType(e.target.value as ConstraintType)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 font-medium"
                >
                  <option value="HARD_FLOOR">HARD_FLOOR — Emergency minimum liquidity buffer</option>
                  <option value="FIXED_OBLIGATION">FIXED_OBLIGATION — Rent / EMI / Remittance with due day</option>
                  <option value="BEHAVIORAL_CAP">BEHAVIORAL_CAP — Max late-night / discretionary spend</option>
                  <option value="PENDING_IOU">PENDING_IOU — Split bill owed to you</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-foreground">Label</label>
                <input
                  type="text"
                  placeholder="e.g. Greenfield Realty Rent, Emergency Floor"
                  value={cLabel}
                  onChange={(e) => setCLabel(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-foreground">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="5000"
                    value={cAmount}
                    onChange={(e) => setCAmount(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono font-medium"
                    required
                  />
                </div>

                {cType === 'FIXED_OBLIGATION' && (
                  <div>
                    <label className="block font-semibold mb-1 text-foreground">Due Day of Month (1-31)</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      placeholder="5"
                      value={cDueDay}
                      onChange={(e) => setCDueDay(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono font-medium"
                    />
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-border">
                <Button type="button" variant="ghost" onClick={() => setShowAddConstraint(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingConstraint || !cLabel || !cAmount}>
                  {savingConstraint ? <Loader2 className="size-4 animate-spin" /> : 'Save Constraint'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
