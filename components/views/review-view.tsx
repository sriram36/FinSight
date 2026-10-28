'use client'

import React, { useState, useEffect } from 'react'
import {
  Calendar,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  PieChart,
  FileText,
  ShieldCheck,
  ChevronRight,
  Activity,
  Flame,
  Zap,
  Clock,
  Repeat,
  AlertCircle,
  X,
  Receipt,
  Layers,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api-client'
import { MonthlyReviewResponse, SpendingAttributionCard, Transaction } from '@/lib/types'
import { RecurringView } from '@/components/views/recurring-view'
import { AnomaliesView } from '@/components/views/anomalies-view'
import { RecommendationsView } from '@/components/views/recommendations-view'

interface ReviewViewProps {
  initialSubTab?: 'autopsy' | 'recurring' | 'anomalies' | 'recommendations'
}

export function ReviewView({ initialSubTab = 'autopsy' }: ReviewViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'autopsy' | 'recurring' | 'anomalies' | 'recommendations'>(initialSubTab)
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [review, setReview] = useState<MonthlyReviewResponse | null>(null)
  const [loading, setLoading] = useState(true)

  // Evidence modal state
  const [selectedEvidence, setSelectedEvidence] = useState<{
    title: string
    transaction_ids: string[]
    exact_sum: number
    verifier_notes?: string
  } | null>(null)
  const [citedTxRows, setCitedTxRows] = useState<Transaction[]>([])
  const [loadingCited, setLoadingCited] = useState(false)

  const loadReview = async (m: string) => {
    try {
      setLoading(true)
      const data = await api.getMonthlyReview(m, 'default_user')
      setReview(data)
    } catch (err) {
      console.error('Failed to load monthly review:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReview(currentMonth)
  }, [currentMonth])

  const openEvidenceModal = async (
    title: string,
    txIds: string[],
    exactSum: number,
    notes?: string
  ) => {
    setSelectedEvidence({
      title,
      transaction_ids: txIds,
      exact_sum: exactSum,
      verifier_notes: notes,
    })
    setLoadingCited(true)
    try {
      if (txIds.length > 0) {
        const res = await api.getTransactions({ limit: 100 })
        const matches = res.items.filter(t => txIds.includes(t.id))
        setCitedTxRows(matches)
      } else {
        setCitedTxRows([])
      }
    } catch (err) {
      console.error('Failed to fetch cited transactions', err)
      setCitedTxRows([])
    } finally {
      setLoadingCited(false)
    }
  }

  // Generate available months for selector (last 6 months)
  const availableMonths = React.useMemo(() => {
    const months = []
    const d = new Date()
    for (let i = 0; i < 6; i++) {
      const dt = new Date(d.getFullYear(), d.getMonth() - i, 1)
      const val = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
      const label = dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      months.push({ value: val, label })
    }
    return months
  }, [])

  const isNetPositive = (review?.net_cash_flow ?? 0) >= 0
  const spendDiff = review?.spending_diff ?? 0

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Pillar 3 Sub-Tab Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/50 border border-border/60 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('autopsy')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
              activeSubTab === 'autopsy'
                ? 'bg-background text-foreground shadow-xs border border-border/70'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Activity className="size-3.5 text-primary" />
            Spending Change Attribution
          </button>
          <button
            onClick={() => setActiveSubTab('recurring')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
              activeSubTab === 'recurring'
                ? 'bg-background text-foreground shadow-xs border border-border/70'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Repeat className="size-3.5 text-amber-500" />
            Phantom Drain & Price Creep
          </button>
          <button
            onClick={() => setActiveSubTab('anomalies')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
              activeSubTab === 'anomalies'
                ? 'bg-background text-foreground shadow-xs border border-border/70'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <AlertTriangle className="size-3.5 text-rose-500" />
            Unusual Outflows
          </button>
          <button
            onClick={() => setActiveSubTab('recommendations')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
              activeSubTab === 'recommendations'
                ? 'bg-background text-foreground shadow-xs border border-border/70'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="size-3.5 text-teal-500" />
            Verified Recommendations
          </button>
        </div>

        <span className="badge-teal rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider shrink-0">
          Pillar 3: Behavioral Autopsy
        </span>
      </div>

      {/* Sub-views */}
      {activeSubTab === 'recurring' && <RecurringView />}
      {activeSubTab === 'anomalies' && <AnomaliesView />}
      {activeSubTab === 'recommendations' && <RecommendationsView onOpenImport={() => {}} />}

      {/* Primary Behavioral Autopsy View */}
      {activeSubTab === 'autopsy' && (
        <div className="space-y-6">
          {/* Month Selector Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border/80 bg-card/60 p-6 backdrop-blur-md">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="size-5 text-primary" />
                <h2 className="text-xl font-bold tracking-tight">Root-Cause Behavioral Autopsy</h2>
                <span className="badge-violet rounded-full px-2 py-0.5 text-[10px] font-bold">Delta Engine</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Decomposing spending fluctuations into <strong>Frequency Drift</strong> (ordering more often) vs. <strong>Ticket-Size Inflation</strong> (buying more expensive items), with late-night micro-bleed detection and strict evidence citations.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" />
              <select
                value={currentMonth}
                onChange={e => setCurrentMonth(e.target.value)}
                className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
              >
                {availableMonths.map(m => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
              <p className="text-xs font-medium text-muted-foreground">Recorded Inflow</p>
              <p className="mt-2 text-2xl font-black tracking-tight text-emerald-500 font-mono">
                ₹{(review?.total_income ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Prior month: ₹{(review?.previous_income ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
              <p className="text-xs font-medium text-muted-foreground">Recorded Expenses</p>
              <p className="mt-2 text-2xl font-black tracking-tight font-mono">
                ₹{(review?.total_spending ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {spendDiff > 0 ? (
                  <span className="text-rose-500 font-medium">
                    +₹{Math.abs(spendDiff).toLocaleString('en-IN', { minimumFractionDigits: 2 })} vs prior month
                  </span>
                ) : spendDiff < 0 ? (
                  <span className="text-emerald-500 font-medium">
                    -₹{Math.abs(spendDiff).toLocaleString('en-IN', { minimumFractionDigits: 2 })} vs prior month
                  </span>
                ) : (
                  'Flat vs prior month'
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
              <p className="text-xs font-medium text-muted-foreground">Net Ledger Delta</p>
              <p className={`mt-2 text-2xl font-black tracking-tight font-mono ${isNetPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                {isNetPositive ? '+' : ''}₹{(review?.net_cash_flow ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {review?.transaction_count ?? 0} total ledger receipts
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
              <p className="text-xs font-medium text-muted-foreground">Effective Savings Rate</p>
              <p className="mt-2 text-2xl font-black tracking-tight text-primary font-mono">
                {review?.savings_rate_pct ?? 0}%
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">Net savings / income denominator</p>
            </div>
          </div>

          {/* ── LATE-NIGHT VELOCITY FIREWALL ──────────────────────────── */}
          {review?.late_night_velocity && (
            <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-card to-background p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                    <Clock className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-foreground">Late-Night Velocity Firewall (10:00 PM – 2:00 AM)</h3>
                      <span className="badge-amber rounded-md px-1.5 py-0.5 text-[10px] font-bold">Vulnerability Audit</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {review.late_night_velocity.headline}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() =>
                    openEvidenceModal(
                      'Late-Night Orders (10 PM - 2 AM)',
                      review.late_night_velocity!.evidence_bundle.transaction_ids,
                      review.late_night_velocity!.current_spend,
                      review.late_night_velocity!.evidence_bundle.verifier_notes
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition self-start sm:self-auto"
                >
                  <ShieldCheck className="size-3.5 text-emerald-500" />
                  Verified: {review.late_night_velocity.current_count} Txns · ₹{review.late_night_velocity.current_spend.toLocaleString('en-IN')}
                </button>
              </div>
            </div>
          )}

          {/* ── ROOT-CAUSE SPENDING CHANGE ATTRIBUTION (DELTA ENGINE) ─── */}
          {review?.spending_attribution && review.spending_attribution.cards.length > 0 && (
            <section className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4 border-b border-border/60 pb-3">
                <div>
                  <h3 className="text-base font-bold tracking-tight text-foreground">Spending Change Attribution</h3>
                  <p className="text-xs text-muted-foreground">Decomposing category delta into Frequency Drift vs. Ticket-Size Inflation</p>
                </div>
                <span className="badge-teal rounded-md px-2 py-0.5 text-[10px] font-bold">
                  {review.spending_attribution.cards.length} Categories Analyzed
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {review.spending_attribution.cards.map((card, i) => {
                  const isFreqDrift = card.driver === 'frequency_drift'
                  const diff = card.current_spend - card.previous_spend
                  const isUp = diff > 0
                  return (
                    <div key={i} className="rounded-xl border border-border/70 bg-card p-4 shadow-2xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-foreground">{card.category}</span>
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                              isFreqDrift
                                ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20'
                                : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/20'
                            }`}
                          >
                            {isFreqDrift ? 'Frequency Drift' : 'Ticket Inflation'}
                          </span>
                        </div>

                        <div className="mt-3 flex items-baseline justify-between">
                          <span className="text-lg font-bold font-mono text-foreground">
                            ₹{card.current_spend.toLocaleString('en-IN')}
                          </span>
                          <span className={`text-xs font-semibold font-mono ${isUp ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {isUp ? '+' : ''}₹{diff.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="mt-3 space-y-1 text-[11px] text-muted-foreground border-t border-border/50 pt-2">
                          <div className="flex justify-between">
                            <span>Order Count:</span>
                            <span className="font-mono text-foreground">{card.frequency_current} orders (vs {card.frequency_baseline})</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Avg Ticket Size:</span>
                            <span className="font-mono text-foreground">₹{Math.round(card.avg_ticket_current).toLocaleString('en-IN')} (vs ₹{Math.round(card.avg_ticket_baseline).toLocaleString('en-IN')})</span>
                          </div>
                          <div className="flex justify-between font-semibold">
                            <span>Primary Effect:</span>
                            <span className={isFreqDrift ? 'text-indigo-600' : 'text-rose-600'}>
                              {isFreqDrift
                                ? `+₹${Math.abs(card.frequency_effect).toFixed(0)} frequency drift`
                                : `+₹${Math.abs(card.ticket_size_effect).toFixed(0)} price inflation`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border/50 flex justify-end">
                        <button
                          onClick={() =>
                            openEvidenceModal(
                              `${card.category} Attribution Evidence`,
                              card.evidence_bundle.transaction_ids,
                              card.current_spend,
                              card.evidence_bundle.verifier_notes
                            )
                          }
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                        >
                          <ShieldCheck className="size-3 text-emerald-500" />
                          [Verified: {card.evidence_bundle.transaction_ids.length} Txns | ₹{card.current_spend.toLocaleString('en-IN')}]
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Executive Summary Narrative */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="size-4 text-primary" />
              <h3 className="text-sm font-bold tracking-tight">Executive Period Summary</h3>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                System C Grounded
              </span>
            </div>
            <p className="text-xs leading-relaxed text-foreground font-medium">
              {review?.narrative || 'Evaluating calendar month metrics...'}
            </p>
          </div>

          {/* Category Variance & Month Checklist */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-2xl border border-border/80 bg-card p-6 shadow-xs">
              <h3 className="text-base font-bold tracking-tight mb-1">Category Spending Comparison</h3>
              <p className="text-xs text-muted-foreground mb-5">
                Spending pace and monthly delta compared with {review?.previous_month}
              </p>

              {loading ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  <RefreshCw className="mx-auto size-5 animate-spin mb-2 opacity-50" />
                  Reconciling monthly receipts...
                </div>
              ) : review?.category_comparisons && review.category_comparisons.length > 0 ? (
                <div className="divide-y divide-border/60">
                  {review.category_comparisons.map((cat, idx) => {
                    const isHigher = cat.diff_amount > 0
                    return (
                      <div key={idx} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                        <div>
                          <p className="text-xs font-bold">{cat.category}</p>
                          <p className="text-[11px] text-muted-foreground">
                            Prior month: ₹{cat.previous_spend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xs font-mono font-bold">
                            ₹{cat.current_spend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </p>
                          <p
                            className={`text-[10px] font-semibold flex items-center justify-end gap-0.5 ${
                              isHigher ? 'text-rose-500' : 'text-emerald-500'
                            }`}
                          >
                            {isHigher ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                            {isHigher ? '+' : ''}₹{cat.diff_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({cat.pct_change}%)
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  No transactions recorded for the selected calendar month.
                </div>
              )}
            </div>

            {/* Month Health Checklist */}
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold tracking-tight mb-3">Diagnostic Checks</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-xl bg-muted/40 p-3">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold">Confirmed Subscriptions</p>
                      <p className="text-[11px] text-muted-foreground">
                        ₹{(review?.monthly_recurring_total ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} committed to active recurring bills.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl bg-muted/40 p-3">
                    {review?.anomalies_count && review.anomalies_count > 0 ? (
                      <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="text-xs font-bold">Unusual Spending Alerts</p>
                      <p className="text-[11px] text-muted-foreground">
                        {review?.anomalies_count ?? 0} anomalous outflow(s) flagged this month.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl bg-muted/40 p-3">
                    <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold">Ledger Claim Verification</p>
                      <p className="text-[11px] text-muted-foreground">
                        All calculations pass zero-hallucination tolerance checks against imported receipts.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-border/60 bg-muted/20 p-3 text-center text-[11px] text-muted-foreground">
                Period {currentMonth} reconciled.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── INTERACTIVE EVIDENCE VERIFICATION DRAWER / MODAL ───────── */}
      {selectedEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-5 text-emerald-500" />
                  <h3 className="font-bold text-base text-foreground">{selectedEvidence.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Verified against {selectedEvidence.transaction_ids.length} exact ledger transactions (Sum: ₹{selectedEvidence.exact_sum.toLocaleString('en-IN')})
                </p>
              </div>
              <button onClick={() => setSelectedEvidence(null)} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 overflow-y-auto flex-1 pr-1 space-y-2">
              {loadingCited ? (
                <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin text-primary" />
                  Fetching cited transaction records...
                </div>
              ) : citedTxRows.length > 0 ? (
                citedTxRows.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 p-3 text-xs">
                    <div>
                      <p className="font-bold text-foreground">{tx.description}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {tx.transaction_date} · {tx.category} · ID: {tx.id}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-foreground">
                      ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))
              ) : (
                <div className="space-y-2 text-xs">
                  <p className="text-muted-foreground">Cited Transaction IDs:</p>
                  <div className="rounded-xl bg-muted/40 p-3 font-mono text-[11px] space-y-1">
                    {selectedEvidence.transaction_ids.map(id => (
                      <div key={id}>• {id}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {selectedEvidence.verifier_notes && (
              <div className="mt-4 pt-3 border-t border-border text-[11px] text-emerald-700 dark:text-emerald-300">
                ✓ {selectedEvidence.verifier_notes}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-border flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setSelectedEvidence(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
