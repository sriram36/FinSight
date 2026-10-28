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
import { AffordabilityResponse, KFSAuditResponse } from '@/lib/types'
import { ForecastView } from '@/components/views/forecast-view'
import { GoalsView } from '@/components/views/goals-view'
import { Upload, FileUp, FileText } from 'lucide-react'

interface SimulateViewProps {
  initialSubTab?: 'simulator' | 'kfs-auditor' | 'forecast' | 'goals'
}

const QUICK_SCENARIOS = [
  { label: 'Weekend Getaway', amount: '12000' },
  { label: 'MacBook / Tech', amount: '85000' },
  { label: 'Dining Celebration', amount: '4500' },
  { label: 'Annual Gym Pass', amount: '18000' },
  { label: 'Smart Watch', amount: '24000' },
]

export function SimulateView({ initialSubTab = 'simulator' }: SimulateViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'simulator' | 'kfs-auditor' | 'forecast' | 'goals'>(initialSubTab)
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

  // KFS Auditor state
  const [kfsLoading, setKfsLoading] = useState(false)
  const [kfsResult, setKfsResult] = useState<KFSAuditResponse | null>(null)
  const [kfsError, setKfsError] = useState<string | null>(null)

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

  const handleAuditFile = async (file: File) => {
    setKfsLoading(true)
    setKfsError(null)
    try {
      const data = await api.auditKFS(file)
      setKfsResult(data)
    } catch (err: any) {
      setKfsError(err.message || 'Failed to audit document.')
    } finally {
      setKfsLoading(false)
    }
  }

  const handleSampleAudit = (type: 'navi_flat' | 'clean_bank' | 'health_copay') => {
    let sampleContent = ''
    let filename = ''
    if (type === 'navi_flat') {
      filename = 'navi_personal_loan_sanction.txt'
      sampleContent = `PERSONAL LOAN SANCTION LETTER & KEY FACT STATEMENT
Sanctioned Amount: Rs 1,50,000
Tenure: 12 Months
Interest Rate: 12.5% flat interest rate p.a.
Processing Fee: 3.5% + 18% GST (deducted upfront before disbursal)
Bounce Penalty: Rs 750 for each failed NACH / ECS presentation.
Pre-payment & Foreclosure Charges: 5% foreclosure penalty applies on outstanding balance if closed before 6 months.
Late Payment Interest: 36% p.a. on overdue installments.`
    } else if (type === 'clean_bank') {
      filename = 'rbi_compliant_retail_loan.txt'
      sampleContent = `RETAIL FLOATING RATE HOME/PERSONAL LOAN AGREEMENT
Sanctioned Amount: Rs 1,50,000
Tenure: 12 Months
Annual Percentage Rate (APR): 10.25% p.a. on reducing balance.
Processing Fee: 0.5% (Rs 750)
Cooling-off Period: 3 days mandatory lookup period to exit with zero foreclosure penalty.
Foreclosure Charges: NIL as per RBI retail guidelines.
Bounce Penalty: Rs 150 standard banking charge.`
    } else {
      filename = 'health_policy_terms.txt'
      sampleContent = `HEALTH INSURANCE POLICY SCHEDULE
Sum Insured: Rs 5,00,000
Room Rent Capping: 1% of Sum Insured (Rs 5,000/day max room rent). Proportionate deduction applies to all ICU, doctor consultation, and surgery charges if room cap is exceeded.
Co-payment Clause: 20% compulsory copayment on each admitted hospital claim.
Specific Disease Sub-limits: Cataract capped at Rs 25,000; Knee Replacement capped at Rs 1,20,000.`
    }
    const sampleFile = new File([sampleContent], filename, { type: 'text/plain' })
    handleAuditFile(sampleFile)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Pillar 2 Sub-Tab Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-muted/50 border border-border/60">
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
            onClick={() => setActiveSubTab('kfs-auditor')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              activeSubTab === 'kfs-auditor'
                ? 'bg-background text-foreground shadow-xs border border-border/70'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShieldAlert className="size-3.5 text-rose-500" />
            KFS & Predatory Fine-Print Auditor
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
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-mono font-extrabold text-sm px-2.5 py-0.5 rounded-full bg-background/80 border border-current shadow-2xs">
                            {result.survival_probability}% Survival
                          </span>
                          {result.survival_p10 !== undefined && result.survival_p10 !== null && result.survival_p90 !== undefined && result.survival_p90 !== null && (
                            <span className="text-[10px] font-mono opacity-80">
                              Monte Carlo 300x: P10 {result.survival_p10}% – P90 {result.survival_p90}%
                            </span>
                          )}
                        </div>
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

      {/* ── KFS & PREDATORY FINE-PRINT AUDITOR VIEW ──────────────── */}
      {activeSubTab === 'kfs-auditor' && (
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-card to-background p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex size-11 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/15 text-rose-600 dark:text-rose-400 shrink-0">
                  <ShieldAlert className="size-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold tracking-tight text-foreground">
                      Predatory Fine-Print & Key Fact Statement (KFS) Auditor
                    </h2>
                    <span className="badge-rose rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      Fiduciary Defense
                    </span>
                  </div>
                  <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
                    Apps like Navi cross-sell loans and insurance with simplified cards while burying effective APR traps, bounce penalties, and foreclosure lock-ins in legal PDF fine print. Upload any sanction letter or policy to audit its traps with zero human bias.
                  </p>
                </div>
              </div>
            </div>

            {/* Instant Sample Benchmark Buttons */}
            <div className="mt-5 pt-4 border-t border-border/60">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
                Instant Benchmark Documents
              </p>
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={() => handleSampleAudit('navi_flat')}
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 px-3.5 py-2 text-xs font-semibold text-rose-800 dark:text-rose-200 transition shadow-2xs flex items-center gap-2"
                >
                  <ShieldAlert className="size-3.5 text-rose-500" />
                  Navi / NBFC 12.5% Flat Rate Sanction Letter
                </button>
                <button
                  type="button"
                  onClick={() => handleSampleAudit('clean_bank')}
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-3.5 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200 transition shadow-2xs flex items-center gap-2"
                >
                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                  RBI-Compliant Retail Bank Loan (Clean)
                </button>
                <button
                  type="button"
                  onClick={() => handleSampleAudit('health_copay')}
                  className="rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-3.5 py-2 text-xs font-semibold text-amber-800 dark:text-amber-200 transition shadow-2xs flex items-center gap-2"
                >
                  <AlertTriangle className="size-3.5 text-amber-500" />
                  Health Policy with Room-Rent Cap & Co-pay
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Upload form */}
            <div className="lg:col-span-5 rounded-2xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Upload Document for OCR & RAG Audit</h3>
                <p className="text-xs text-muted-foreground mt-0.5 mb-4">
                  Accepts Sanction Letters, Loan KFS, Credit Card terms, or Insurance Schedules (.pdf, .txt).
                </p>

                <div className="rounded-2xl border-2 border-dashed border-border/80 hover:border-primary/50 bg-muted/20 p-8 text-center transition flex flex-col items-center justify-center">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground mb-3">
                    <FileUp className="size-6 text-primary" />
                  </div>
                  <p className="text-xs font-bold text-foreground">Drop loan sanction letter or policy PDF here</p>
                  <p className="text-[11px] text-muted-foreground mt-1">or browse files from your computer</p>
                  <label className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition cursor-pointer shadow-xs">
                    <Upload className="size-3.5" />
                    Select Document
                    <input
                      type="file"
                      accept=".pdf,.txt,.md"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          handleAuditFile(file)
                        }
                      }}
                    />
                  </label>
                </div>

                {kfsError && (
                  <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
                    {kfsError}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-border/50 text-[11px] text-muted-foreground leading-relaxed">
                Audited against RBI Digital Lending Circular (2022/2024), Key Fact Statement guidelines, and IRDAI health insurance regulations.
              </div>
            </div>

            {/* Audit Results */}
            <div className="lg:col-span-7">
              {kfsLoading ? (
                <div className="flex h-80 flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center gap-3">
                  <Loader2 className="size-7 animate-spin text-rose-500" />
                  <p className="text-sm font-bold text-foreground">Running Mathematical & Regulatory Trap Analysis...</p>
                  <p className="text-xs text-muted-foreground max-w-xs">Extracting effective APR, checking foreclosure penalties, bounce charges, and room-rent sub-limits.</p>
                </div>
              ) : !kfsResult ? (
                <div className="flex h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center text-muted-foreground">
                  <FileText className="size-8 text-muted-foreground/60 mb-2" />
                  <p className="text-sm font-bold text-foreground">No Document Audited Yet</p>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1">
                    Upload a sanction letter above or click one of the instant benchmark documents to view its Trap Score and fine-print traps.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-xs animate-in fade-in">
                  {/* Trap Score Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border/80 bg-muted/20 p-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Audited File:
                        </span>
                        <span className="font-mono text-xs font-bold text-foreground truncate max-w-[200px]">
                          {kfsResult.filename}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-foreground mt-1">{kfsResult.summary}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Trap Score</span>
                        <p className={`text-3xl font-black font-mono leading-none ${
                          kfsResult.trap_score >= 70
                            ? 'text-rose-600 dark:text-rose-400'
                            : kfsResult.trap_score >= 40
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {kfsResult.trap_score}<span className="text-base text-muted-foreground font-normal">/100</span>
                        </p>
                      </div>
                      <span className={`rounded-xl px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
                        kfsResult.risk_level === 'PREDATORY' || kfsResult.risk_level === 'HIGH_RISK'
                          ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                          : kfsResult.risk_level === 'MODERATE_RISK'
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {kfsResult.risk_level.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Effective APR Trap Highlight (if detected) */}
                  {kfsResult.effective_apr_note && (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs">
                      <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-200">
                        <AlertTriangle className="size-4 shrink-0 text-rose-600" />
                        Mathematical APR Trap Detected
                      </div>
                      <p className="mt-1 text-rose-900 dark:text-rose-100 font-semibold leading-relaxed">
                        {kfsResult.effective_apr_note}
                      </p>
                    </div>
                  )}

                  {/* Key Extracted Terms */}
                  {Object.keys(kfsResult.key_terms_extracted).length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {Object.entries(kfsResult.key_terms_extracted).map(([k, v]) => (
                        <div key={k} className="rounded-xl border border-border/70 bg-muted/20 p-2.5 text-center">
                          <p className="text-[10px] text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</p>
                          <p className="text-xs font-bold font-mono text-foreground mt-0.5">{String(v)}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Identified Traps List */}
                  <div className="space-y-3 mt-1">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Identified Traps & Plain-Language Advice ({kfsResult.flags.length})
                    </h4>
                    {kfsResult.flags.map((flag, idx) => (
                      <div key={idx} className="rounded-xl border border-border/80 bg-background p-4 text-xs space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground text-sm flex items-center gap-2">
                            <span className="size-2 rounded-full bg-rose-500 shrink-0" />
                            {flag.headline}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            flag.severity === 'HIGH' ? 'bg-rose-500/10 text-rose-600' : 'bg-amber-500/10 text-amber-600'
                          }`}>
                            {flag.severity} RISK
                          </span>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">{flag.finding}</p>
                        <div className="rounded-lg bg-primary/5 border border-primary/15 p-2.5 text-[11px] text-primary leading-relaxed font-medium">
                          <strong>Borrower Advice:</strong> {flag.plain_language_advice}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
