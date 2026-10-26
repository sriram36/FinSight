'use client'

import { useState } from 'react'
import {
  BarChart3,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  Loader2,
  Calendar,
  WalletCards,
  Sparkles,
  Calculator,
  ShieldAlert,
  Coins,
  TrendingUp,
  Target,
  Clock,
  Check,
  ArrowDownRight,
  TrendingDown,
  Layers
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api-client'
import { AffordabilityResponse } from '@/lib/types'
import { ForecastView } from '@/components/views/forecast-view'
import { GoalsView } from '@/components/views/goals-view'

interface SimulateViewProps {
  initialSubTab?: 'simulator' | 'forecast' | 'goals'
}

const QUICK_SCENARIOS = [
  { label: 'Weekend Getaway', amount: '12000' },
  { label: 'MacBook / Tech', amount: '85000' },
  { label: 'Dining Celebration', amount: '4500' },
  { label: 'Annual Gym Pass', amount: '18000' },
  { label: 'Smart Watch', amount: '24000' },
]

export function SimulateView({ initialSubTab = 'simulator' }: SimulateViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'simulator' | 'forecast' | 'goals'>(initialSubTab)
  const [purchaseAmount, setPurchaseAmount] = useState<string>('15000')
  const [availableBalance, setAvailableBalance] = useState<string>('85000')
  const [obligations, setObligations] = useState<string>('20000')
  const [buffer, setBuffer] = useState<string>('15000')
  const [horizonDays, setHorizonDays] = useState<number>(30)
  const [isEmi, setIsEmi] = useState<boolean>(false)
  const [tenureMonths, setTenureMonths] = useState<number>(3)
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AffordabilityResponse | null>(null)

  const handleSimulate = async (e?: React.FormEvent, customAmount?: string) => {
    if (e) e.preventDefault()
    const amt = customAmount || purchaseAmount
    if (!amt) return
    setLoading(true)
    try {
      const res = await api.simulateAffordability({
        user_id: 'default_user',
        purchase_amount: parseFloat(amt),
        available_balance: availableBalance ? parseFloat(availableBalance) : null,
        upcoming_obligations: obligations ? parseFloat(obligations) : 0,
        emergency_buffer: buffer ? parseFloat(buffer) : 10000,
        purchase_date: purchaseDate,
        horizon_days: horizonDays,
        is_emi: isEmi,
        tenure_months: isEmi ? tenureMonths : undefined,
      })
      setResult(res)
    } catch (err) {
      console.error('Failed to run affordability simulation', err)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickScenario = (amt: string) => {
    setPurchaseAmount(amt)
    handleSimulate(undefined, amt)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Pillar 2 Sub-Tab Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/50 border border-border/60">
          <button
            onClick={() => setActiveSubTab('simulator')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              activeSubTab === 'simulator'
                ? 'bg-background text-foreground shadow-xs border border-border/70'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calculator className="size-3.5 text-primary" />
            Decision Simulator & Stress-Tester
          </button>
          <button
            onClick={() => setActiveSubTab('forecast')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              activeSubTab === 'forecast'
                ? 'bg-background text-foreground shadow-xs border border-border/70'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <TrendingUp className="size-3.5 text-sky-500" />
            30-Day Cash Flow Forecast
          </button>
          <button
            onClick={() => setActiveSubTab('goals')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              activeSubTab === 'goals'
                ? 'bg-background text-foreground shadow-xs border border-border/70'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Target className="size-3.5 text-emerald-500" />
            Savings Goals & Milestones
          </button>
        </div>

        <span className="badge-teal rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider">
          Pillar 2: Pre-Decision Intelligence
        </span>
      </div>

      {/* Render sub-views */}
      {activeSubTab === 'forecast' && <ForecastView />}
      {activeSubTab === 'goals' && <GoalsView />}

      {/* Primary Simulator View */}
      {activeSubTab === 'simulator' && (
        <div className="flex flex-col gap-6">
          {/* Header Banner */}
          <div className="glass-panel rounded-2xl border border-border bg-card p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex size-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <Calculator className="size-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold tracking-tight">“Can I Afford This?” Pre-Purchase Stress-Tester</h2>
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="size-3" /> Counterfactual Cash-Flow Engine
                    </span>
                  </div>
                  <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
                    Deterministic 30–90 day cash-flow stress test integrating your personal constraint floor, upcoming rent obligations, historical daily spend velocity, and active savings goals. Discovers exactly when and if a purchase breaches your personal safety net.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Scenario Chips */}
            <div className="mt-5 pt-4 border-t border-border/60">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Instant Test Scenarios
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_SCENARIOS.map((sc, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleQuickScenario(sc.amount)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                      purchaseAmount === sc.amount
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'border-border bg-card hover:bg-muted/60 text-foreground'
                    }`}
                  >
                    <span>{sc.label}</span>
                    <span className="font-mono text-muted-foreground">(₹{parseInt(sc.amount).toLocaleString('en-IN')})</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(350px,1fr)_minmax(0,1.35fr)]">
            {/* Simulation Form */}
            <form onSubmit={(e) => handleSimulate(e)} className="glass-panel rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between">
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-border pb-3.5">
                  <h3 className="font-bold text-sm text-foreground">Purchase & Balance Inputs</h3>
                  <span className="text-[11px] text-muted-foreground">Deterministic INR (₹)</span>
                </div>

                <div>
                  <label className="mb-1.5 block font-semibold text-foreground">Planned Purchase Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={purchaseAmount}
                    onChange={(e) => setPurchaseAmount(e.target.value)}
                    placeholder="15000"
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 font-mono text-sm font-semibold focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary/40"
                    required
                  />
                </div>

                {/* One-time vs EMI toggle */}
                <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-foreground">Payment Structure</label>
                    <div className="flex rounded-lg bg-background border border-border p-0.5 gap-0.5">
                      <button
                        type="button"
                        onClick={() => setIsEmi(false)}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${!isEmi ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                      >
                        Lump Sum
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEmi(true)}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${isEmi ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                      >
                        EMI Split
                      </button>
                    </div>
                  </div>

                  {isEmi && (
                    <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between">
                      <span className="text-muted-foreground text-[11px]">Tenure (Months):</span>
                      <div className="flex gap-1.5">
                        {[3, 6, 9, 12].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setTenureMonths(m)}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-mono font-bold border transition ${
                              tenureMonths === m ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-foreground'
                            }`}
                          >
                            {m}m (₹{Math.round(parseFloat(purchaseAmount || '0') / m).toLocaleString('en-IN')})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block font-semibold text-foreground">Available Bank Balance (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={availableBalance}
                      onChange={(e) => setAvailableBalance(e.target.value)}
                      placeholder="85000"
                      className="h-10 w-full rounded-xl border border-border bg-background px-3 font-mono text-sm focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary/40"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block font-semibold text-foreground">Upcoming Obligations (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={obligations}
                      onChange={(e) => setObligations(e.target.value)}
                      placeholder="20000"
                      className="h-10 w-full rounded-xl border border-border bg-background px-3 font-mono text-sm focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary/40"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block font-semibold text-foreground">Protected Emergency Buffer (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={buffer}
                      onChange={(e) => setBuffer(e.target.value)}
                      placeholder="15000"
                      className="h-10 w-full rounded-xl border border-border bg-background px-3 font-mono text-sm focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary/40"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block font-semibold text-foreground">Stress Horizon (Days)</label>
                    <select
                      value={horizonDays}
                      onChange={(e) => setHorizonDays(parseInt(e.target.value))}
                      className="h-10 w-full rounded-xl border border-border bg-background px-3 font-mono text-sm font-semibold"
                    >
                      <option value={30}>30 Days (1 Cycle)</option>
                      <option value={60}>60 Days (2 Cycles)</option>
                      <option value={90}>90 Days (Quarterly)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block font-semibold text-foreground">Planned Execution Date</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary/40"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !purchaseAmount}
                className="mt-6 w-full gap-2 rounded-xl font-semibold shadow-xs"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <BarChart3 className="size-4" />}
                Run Counterfactual Stress-Test
              </Button>
            </form>

            {/* Results Display */}
            <div className="flex flex-col gap-4">
              {!result ? (
                <div className="glass-panel flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 p-12 text-center text-muted-foreground">
                  <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-muted/40 text-muted-foreground shadow-xs">
                    <WalletCards className="size-7" />
                  </div>
                  <h4 className="mt-4 text-base font-bold text-foreground">Stress-Test Evaluation Ready</h4>
                  <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">
                    Set parameters or click an instant test scenario above to stress-test your cash-flow trajectory against active constraints.
                  </p>
                </div>
              ) : (
                <div className="glass-panel flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-xs animate-in fade-in">
                  {/* Verdict & Survival Header */}
                  <div
                    className={`rounded-2xl border p-5 text-xs ${
                      result.verdict === 'comfortable'
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                        : result.verdict === 'caution'
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                        : result.verdict === 'unaffordable'
                        ? 'border-rose-500/40 bg-rose-500/10 text-rose-900 dark:text-rose-200'
                        : 'border-sky-500/40 bg-sky-500/10 text-sky-900 dark:text-sky-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-extrabold uppercase tracking-wider text-xs">
                        {result.verdict === 'comfortable' && <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />}
                        {result.verdict === 'caution' && <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />}
                        {result.verdict === 'unaffordable' && <AlertTriangle className="size-4 text-rose-600 dark:text-rose-400" />}
                        {result.verdict === 'incomplete_data' && <HelpCircle className="size-4 text-sky-600 dark:text-sky-400" />}
                        <span>Verdict: {result.verdict.replace('_', ' ')}</span>
                      </div>
                      {result.survival_probability !== undefined && result.survival_probability !== null && (
                        <span className="font-mono font-extrabold text-sm px-2.5 py-0.5 rounded-full bg-background/60 border border-current">
                          {result.survival_probability}% Survival
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-relaxed">{result.summary}</p>
                  </div>

                  {/* Constraint Violations Alert */}
                  {result.constraint_violations && result.constraint_violations.length > 0 && (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">
                        <AlertTriangle className="size-4 shrink-0" />
                        Constraint Violations Detected
                      </div>
                      <div className="mt-2 space-y-1.5">
                        {result.constraint_violations.map((v, i) => (
                          <div key={i} className="text-xs text-rose-900 dark:text-rose-200 font-medium flex items-center justify-between">
                            <span>• {v.message}</span>
                            <span className="font-mono text-[11px] opacity-80">(Proj. Bal: ₹{v.projected_balance.toLocaleString('en-IN')})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cash-Flow Runway Timeline */}
                  {result.runway_timeline && result.runway_timeline.length > 0 && (
                    <div className="rounded-xl border border-border p-4 bg-muted/10">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                          Projected Balance Runway Timeline
                        </h4>
                        <span className="text-[11px] text-muted-foreground">Floor: ₹{buffer}</span>
                      </div>
                      <div className="flex items-end gap-1.5 h-24 pt-2 border-b border-border">
                        {result.runway_timeline.map((point, idx) => {
                          const bal = point.projected_balance
                          const isBreach = point.below_floor
                          const maxB = Math.max(...result.runway_timeline!.map(p => p.projected_balance), 1000)
                          const hPct = Math.max(8, Math.min(100, (bal / maxB) * 100))
                          return (
                            <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                              <div
                                className={`w-full rounded-t transition-all ${
                                  isBreach
                                    ? 'bg-rose-500 animate-pulse'
                                    : 'bg-emerald-500/80 group-hover:bg-emerald-500'
                                }`}
                                style={{ height: `${hPct}%` }}
                                title={`Day ${point.day} (${point.date}): ₹${bal.toLocaleString('en-IN')}`}
                              />
                              <span className="text-[9px] font-mono text-muted-foreground mt-1 truncate">
                                d{point.day}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Counterfactual Mathematical Alternatives */}
                  {result.counterfactual_alternatives && result.counterfactual_alternatives.length > 0 && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                        <Sparkles className="size-3.5" /> Counterfactual Optimization Alternatives
                      </h4>
                      <div className="space-y-2">
                        {result.counterfactual_alternatives.map((alt, i) => (
                          <div key={i} className="rounded-xl border border-border/70 bg-card p-3 text-xs shadow-2xs">
                            <p className="font-bold text-foreground">{alt.label}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{alt.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Remainder Figures */}
                  {result.post_purchase_remainder !== null && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-border bg-muted/20 p-3.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Uncommitted Before</p>
                        <p className="mt-1 text-lg font-bold font-mono">
                          ₹{result.uncommitted_before?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border bg-muted/20 p-3.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">Debit Outflow</p>
                        <p className="mt-1 text-lg font-bold font-mono text-rose-600 dark:text-rose-400">
                          -₹{result.purchase_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border bg-muted/20 p-3.5 sm:col-span-1 col-span-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Safe Remainder</p>
                        <p
                          className={`mt-1 text-lg font-bold font-mono ${
                            (result.post_purchase_remainder ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          ₹{result.post_purchase_remainder?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Goal Impact Breakdown */}
                  {result.goal_impacts.length > 0 && (
                    <div className="rounded-xl border border-border p-4 bg-muted/10">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
                        Impact on Active Savings Goals
                      </h4>
                      <div className="space-y-2">
                        {result.goal_impacts.map((gi) => (
                          <div
                            key={gi.goal_id}
                            className="flex items-center justify-between text-xs rounded-xl border border-border/60 bg-card p-3 shadow-2xs"
                          >
                            <span className="font-semibold text-foreground">{gi.goal_title}</span>
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-muted-foreground">
                                ₹{gi.monthly_reservation.toLocaleString('en-IN', { minimumFractionDigits: 0 })}/mo
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  gi.is_delayed
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                }`}
                              >
                                {gi.is_delayed ? 'Delayed' : 'Protected'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Verifier Evidence Bundle Badge */}
                  {result.evidence_bundle && (
                    <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs">
                      <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
                        <ShieldCheck className="size-4" /> Evidence Grounding: {result.evidence_bundle.verification_status}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        Exact Sum: ₹{result.evidence_bundle.exact_sum.toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
