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
  Coins
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api-client'
import { AffordabilityResponse } from '@/lib/types'

const QUICK_SCENARIOS = [
  { label: 'Weekend Getaway', amount: '12000' },
  { label: 'MacBook / Tech', amount: '85000' },
  { label: 'Dining Celebration', amount: '4500' },
  { label: 'Annual Gym Pass', amount: '18000' },
  { label: 'Smart Watch', amount: '24000' },
]

export function SimulateView() {
  const [purchaseAmount, setPurchaseAmount] = useState<string>('15000')
  const [availableBalance, setAvailableBalance] = useState<string>('85000')
  const [obligations, setObligations] = useState<string>('20000')
  const [buffer, setBuffer] = useState<string>('15000')
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
      {/* Header Banner */}
      <div className="glass-panel rounded-2xl border border-border bg-card p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex size-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Calculator className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">“Can I Afford This?” Purchase Simulator</h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="size-3" /> Deterministic Math
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                Test planned discretionary purchases against confirmed liquid reserves, known recurring obligations, active goal reservations, and minimum emergency cushions. Transparent arithmetic without LLM hallucinations.
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

      <div className="grid gap-6 lg:grid-cols-[minmax(340px,1fr)_minmax(0,1.3fr)]">
        {/* Simulation Form */}
        <form onSubmit={(e) => handleSimulate(e)} className="glass-panel rounded-2xl border border-border bg-card p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-3.5">
            <h3 className="font-bold text-sm text-foreground">Purchase Parameters</h3>
            <span className="text-[11px] text-muted-foreground">All amounts in INR (₹)</span>
          </div>

          <div className="mt-5 flex flex-col gap-4 text-xs">
            <div>
              <label className="mb-1.5 block font-semibold text-foreground">
                Proposed Purchase Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground font-mono">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 15000"
                  value={purchaseAmount}
                  onChange={(e) => setPurchaseAmount(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-background pl-8 pr-3 text-base font-bold font-mono text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 flex items-center justify-between font-semibold text-foreground">
                <span>Confirmed Liquid Balance (₹)</span>
                <span className="text-[10px] text-muted-foreground font-normal">Savings + Checking</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground font-mono">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Leave blank to trigger missing-data warning"
                  value={availableBalance}
                  onChange={(e) => setAvailableBalance(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-background pl-8 pr-3 text-sm font-semibold font-mono text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Transaction history proves debits, not current balance; provide your liquid account total.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block font-semibold text-foreground">Upcoming Bills (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground font-mono">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="20000"
                    value={obligations}
                    onChange={(e) => setObligations(e.target.value)}
                    className="h-10 w-full rounded-xl border border-border bg-background pl-7 pr-3 text-sm font-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block font-semibold text-foreground">Emergency Buffer (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground font-mono">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="10000"
                    value={buffer}
                    onChange={(e) => setBuffer(e.target.value)}
                    className="h-10 w-full rounded-xl border border-border bg-background pl-7 pr-3 text-sm font-mono focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block font-semibold text-foreground">Planned Execution Date</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !purchaseAmount}
            className="mt-6 w-full gap-2 rounded-xl font-semibold shadow-xs"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <BarChart3 className="size-4" />}
            Evaluate Purchase Affordability
          </Button>
        </form>

        {/* Results Card */}
        <div className="flex flex-col gap-4">
          {!result ? (
            <div className="glass-panel flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 p-12 text-center text-muted-foreground">
              <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-muted/40 text-muted-foreground shadow-xs">
                <WalletCards className="size-7" />
              </div>
              <h4 className="mt-4 text-base font-bold text-foreground">Evaluation Ready</h4>
              <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">
                Set parameters or click an instant test scenario above to view safe-to-spend remainder analysis.
              </p>
            </div>
          ) : (
            <div className="glass-panel flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-xs animate-in fade-in">
              {/* Verdict Banner with High-Contrast Colors */}
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
                <div className="flex items-center gap-2 font-extrabold uppercase tracking-wider text-xs">
                  {result.verdict === 'comfortable' && <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />}
                  {result.verdict === 'caution' && <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />}
                  {result.verdict === 'unaffordable' && <AlertTriangle className="size-4 text-rose-600 dark:text-rose-400" />}
                  {result.verdict === 'incomplete_data' && <HelpCircle className="size-4 text-sky-600 dark:text-sky-400" />}
                  <span>Verdict: {result.verdict.replace('_', ' ')}</span>
                </div>
                <p className="mt-2 text-sm font-semibold leading-relaxed">{result.summary}</p>
              </div>

              {/* Arithmetic Remainder Figures */}
              {result.post_purchase_remainder !== null && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border bg-muted/20 p-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Uncommitted Before
                    </p>
                    <p className="mt-1 text-lg font-bold font-mono">
                      ₹{result.uncommitted_before?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 p-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                      Purchase Amount
                    </p>
                    <p className="mt-1 text-lg font-bold font-mono text-rose-600 dark:text-rose-400">
                      -₹{result.purchase_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 p-3.5 sm:col-span-1 col-span-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Safe Remainder
                    </p>
                    <p
                      className={`mt-1 text-lg font-bold font-mono ${
                        (result.post_purchase_remainder ?? 0) >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
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

              {/* Assumptions */}
              {result.assumptions.length > 0 && (
                <div className="text-[11px] text-muted-foreground border-t border-border/60 pt-3">
                  <span className="font-semibold uppercase tracking-wider">Evaluation Rules & Invariants:</span>
                  <ul className="mt-1 list-inside list-disc space-y-1">
                    {result.assumptions.map((asm, i) => (
                      <li key={i}>{asm}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
