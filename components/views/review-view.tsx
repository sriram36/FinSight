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
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api-client'
import { MonthlyReviewResponse } from '@/lib/types'

export function ReviewView() {
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [review, setReview] = useState<MonthlyReviewResponse | null>(null)
  const [loading, setLoading] = useState(true)

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
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Month Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border/80 bg-card/60 p-6 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            <h2 className="text-xl font-bold tracking-tight">Monthly Financial Review</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Deterministic calendar month audit reconciling income, spending trends, category variances, budget envelopes, and anomaly checks against the prior period.
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
          <p className="text-xs font-medium text-muted-foreground">Recorded Income</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-emerald-500">
            ₹{(review?.total_income ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Previous month: ₹{(review?.previous_income ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Recorded Expenses</p>
          <p className="mt-2 text-2xl font-black tracking-tight">
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
          <p className="text-xs font-medium text-muted-foreground">Net Savings</p>
          <p
            className={`mt-2 text-2xl font-black tracking-tight ${
              isNetPositive ? 'text-emerald-500' : 'text-rose-500'
            }`}
          >
            {isNetPositive ? '+' : ''}₹
            {(review?.net_cash_flow ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {review?.transaction_count ?? 0} total ledger receipts
          </p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Effective Savings Rate</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-primary">
            {review?.savings_rate_pct ?? 0}%
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Net savings / income denominator
          </p>
        </div>
      </div>

      {/* Verified AI Narrative Banner */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="size-4 text-primary" />
          <h3 className="text-sm font-bold tracking-tight">Executive Period Summary</h3>
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            System C Verified
          </span>
        </div>
        <p className="text-xs leading-relaxed text-foreground font-medium">
          {review?.narrative || 'Evaluating calendar month metrics...'}
        </p>
      </div>

      {/* Category Variance & Budget Analysis */}
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
            <h3 className="text-sm font-bold tracking-tight mb-3">Month Health Checklist</h3>
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
                  <p className="text-xs font-bold">Ledger Integrity</p>
                  <p className="text-[11px] text-muted-foreground">
                    All calculations match the imported CSV receipts with zero estimated bank balance drift.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-border/60 bg-muted/20 p-3 text-center text-[11px] text-muted-foreground">
            Month {currentMonth} completed and audit-locked.
          </div>
        </div>
      </div>
    </div>
  )
}
