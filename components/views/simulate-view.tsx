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
  WalletCards
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api-client'
import { AffordabilityResponse } from '@/lib/types'

export function SimulateView() {
  const [purchaseAmount, setPurchaseAmount] = useState<string>('15000')
  const [availableBalance, setAvailableBalance] = useState<string>('85000')
  const [obligations, setObligations] = useState<string>('20000')
  const [buffer, setBuffer] = useState<string>('15000')
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AffordabilityResponse | null>(null)

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!purchaseAmount) return
    setLoading(true)
    try {
      const res = await api.simulateAffordability({
        user_id: 'default_user',
        purchase_amount: parseFloat(purchaseAmount),
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

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BarChart3 className="size-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">“Can I Afford This?” Purchase Simulator</h2>
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground leading-relaxed">
              Test planned discretionary purchases against your confirmed liquid balance, known bills, a
              minimum emergency cushion, and active goal reservations. No guesses—transparent arithmetic.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(320px,1fr)_minmax(0,1.2fr)]">
        {/* Simulation Form */}
        <form onSubmit={handleSimulate} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="font-semibold text-sm border-b border-border pb-3">Purchase Parameters</h3>

          <div className="mt-4 flex flex-col gap-4 text-xs">
            <div>
              <label className="mb-1 block font-medium text-foreground">
                Proposed Purchase Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="e.g. 15000"
                value={purchaseAmount}
                onChange={(e) => setPurchaseAmount(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 flex items-center justify-between font-medium text-foreground">
                <span>Confirmed Available Balance (₹)</span>
                <span className="text-[10px] text-muted-foreground">Liquid accounts</span>
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Leave blank to test missing-data warning"
                value={availableBalance}
                onChange={(e) => setAvailableBalance(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Transaction history does not prove current balance; input your liquid account total.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block font-medium text-foreground">Upcoming Bills / Rent (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="20000"
                  value={obligations}
                  onChange={(e) => setObligations(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-foreground">Emergency Buffer (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="10000"
                  value={buffer}
                  onChange={(e) => setBuffer(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block font-medium text-foreground">Planned Purchase Date</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <Button type="submit" disabled={loading || !purchaseAmount} className="mt-6 w-full gap-2">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <BarChart3 className="size-4" />}
            Evaluate Purchase Affordability
          </Button>
        </form>

        {/* Results Card */}
        <div className="flex flex-col gap-4">
          {!result ? (
            <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
              <WalletCards className="size-10 text-muted-foreground/60" />
              <h4 className="mt-4 text-sm font-semibold">Evaluation Pending</h4>
              <p className="mt-1 max-w-xs text-xs">
                Fill in the parameters on the left and run the calculation to view safe-to-spend analysis.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
              {/* Verdict Banner */}
              <div
                className={`rounded-xl border p-4 text-xs ${
                  result.verdict === 'comfortable'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                    : result.verdict === 'caution'
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300'
                    : result.verdict === 'unaffordable'
                    ? 'border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300'
                    : 'border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-300'
                }`}
              >
                <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[11px]">
                  {result.verdict === 'comfortable' && <CheckCircle2 className="size-4" />}
                  {result.verdict === 'caution' && <AlertTriangle className="size-4" />}
                  {result.verdict === 'unaffordable' && <AlertTriangle className="size-4" />}
                  {result.verdict === 'incomplete_data' && <HelpCircle className="size-4" />}
                  <span>Verdict: {result.verdict.replace('_', ' ')}</span>
                </div>
                <p className="mt-1 text-sm font-medium leading-relaxed">{result.summary}</p>
              </div>

              {/* Remainder Figures */}
              {result.post_purchase_remainder !== null && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-border bg-muted/20 p-3">
                    <p className="text-[11px] text-muted-foreground">Uncommitted Before</p>
                    <p className="mt-1 text-lg font-bold">
                      ₹{result.uncommitted_before?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-3">
                    <p className="text-[11px] text-muted-foreground">Purchase Amount</p>
                    <p className="mt-1 text-lg font-bold text-rose-600 dark:text-rose-400">
                      -₹{result.purchase_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-3 sm:col-span-1 col-span-2">
                    <p className="text-[11px] text-muted-foreground">Safe Remainder</p>
                    <p
                      className={`mt-1 text-lg font-bold ${
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
                <div className="rounded-xl border border-border p-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Impact on Active Savings Goals
                  </h4>
                  <div className="space-y-2">
                    {result.goal_impacts.map((gi) => (
                      <div
                        key={gi.goal_id}
                        className="flex items-center justify-between text-xs rounded-lg bg-muted/30 p-2.5"
                      >
                        <span className="font-medium">{gi.goal_title}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">
                            ₹{gi.monthly_reservation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}/mo
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              gi.is_delayed
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
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
                <div className="text-[11px] text-muted-foreground">
                  <span className="font-semibold uppercase tracking-wider">Assumptions Used:</span>
                  <ul className="mt-1 list-inside list-disc space-y-0.5">
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
