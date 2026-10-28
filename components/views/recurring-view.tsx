'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Repeat,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Loader2,
  TrendingUp,
  CreditCard,
  ShieldCheck,
  Check,
  ArrowRight,
  RefreshCw,
  BellRing,
  Mail,
  Copy,
  FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CategoryBadge } from '@/components/ui/category-badge'
import { api } from '@/lib/api-client'
import { RecurringItem, UpcomingSchedule } from '@/lib/types'

export function RecurringView() {
  const [items, setItems] = useState<RecurringItem[]>([])
  const [upcoming, setUpcoming] = useState<UpcomingSchedule | null>(null)
  const [loading, setLoading] = useState(true)
  const [detecting, setDetecting] = useState(false)
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'unconfirmed'>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedDraftId, setExpandedDraftId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [itemList, schedule] = await Promise.all([
        api.getRecurringItems('default_user'),
        api.getUpcomingSchedule('default_user', 30)
      ])
      setItems(itemList)
      setUpcoming(schedule)
    } catch (err) {
      console.error('Failed to load recurring items', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleDetect = async () => {
    setDetecting(true)
    try {
      const detected = await api.detectRecurring('default_user')
      setItems(detected)
      const schedule = await api.getUpcomingSchedule('default_user', 30)
      setUpcoming(schedule)
    } catch (err) {
      console.error('Failed to run recurrence detection', err)
    } finally {
      setDetecting(false)
    }
  }

  const handleConfirm = async (item: RecurringItem) => {
    const newStatus = !item.is_confirmed
    try {
      // Optimistic update
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_confirmed: newStatus } : i))
      )
      await api.confirmRecurring(item.id, newStatus, 'default_user')
    } catch (err: any) {
      alert(`Failed to update confirmation: ${err.message}`)
      loadData()
    }
  }

  const totalMonthlyCommitment = useMemo(() => {
    return items
      .filter((i) => i.status === 'active')
      .reduce((acc, i) => {
        if (i.frequency === 'weekly') return acc + i.amount * 4
        if (i.frequency === 'quarterly') return acc + i.amount / 3
        return acc + i.amount
      }, 0)
  }, [items])

  const dueIn7Days = useMemo(() => {
    if (!upcoming) return 0
    return upcoming.items
      .filter((i) => (i.days_remaining ?? 999) <= 7)
      .reduce((acc, i) => acc + i.amount, 0)
  }, [upcoming])

  const filteredItems = useMemo(() => {
    if (filter === 'confirmed') return items.filter((i) => i.is_confirmed)
    if (filter === 'unconfirmed') return items.filter((i) => !i.is_confirmed)
    return items
  }, [items, filter])

  return (
    <div className="flex flex-col gap-8">
      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Detected Subscriptions */}
        <div className="glass-panel group relative overflow-hidden rounded-2xl border border-border p-5 shadow-xs transition hover:border-primary/40 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recurring Items
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-500">
              <Repeat className="size-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-foreground">
            {items.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {items.filter((i) => i.is_confirmed).length} confirmed by user
          </p>
        </div>

        {/* Monthly Recurring Commitment */}
        <div className="glass-panel group relative overflow-hidden rounded-2xl border border-border p-5 shadow-xs transition hover:border-primary/40 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Monthly Obligations
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-500">
              <CreditCard className="size-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight font-mono text-foreground">
            ₹{totalMonthlyCommitment.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Fixed & recurring baseline bills</p>
        </div>

        {/* Due Next 7 Days */}
        <div className="glass-panel group relative overflow-hidden rounded-2xl border border-border p-5 shadow-xs transition hover:border-primary/40 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Due in 7 Days
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-500">
              <BellRing className="size-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight font-mono text-rose-600 dark:text-rose-400">
            ₹{dueIn7Days.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Immediate liquidity requirement</p>
        </div>

        {/* Due Next 30 Days */}
        <div className="glass-panel group relative overflow-hidden rounded-2xl border border-border p-5 shadow-xs transition hover:border-primary/40 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Next 30 Days Total
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
              <Calendar className="size-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight font-mono text-emerald-600 dark:text-emerald-400">
            ₹{upcoming?.total_upcoming.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {upcoming?.count || 0} scheduled recurring charges
          </p>
        </div>
      </div>

      {/* Main Subscriptions List Card */}
      <section className="glass-panel rounded-2xl border border-border bg-card shadow-xs">
        <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <div className="flex items-center gap-2">
              <Repeat className="size-5 text-primary" />
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                Detected Recurring Charges & Subscriptions
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Algorithmic pattern detection scans your transaction ledger for repeat merchant intervals (monthly, weekly) and alerts on price increases.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Toggle */}
            <div className="flex rounded-xl border border-border bg-muted/40 p-1 text-xs font-medium">
              <button
                onClick={() => setFilter('all')}
                className={`rounded-lg px-3 py-1.5 transition ${
                  filter === 'all'
                    ? 'bg-background font-semibold text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All ({items.length})
              </button>
              <button
                onClick={() => setFilter('confirmed')}
                className={`rounded-lg px-3 py-1.5 transition ${
                  filter === 'confirmed'
                    ? 'bg-background font-semibold text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Confirmed
              </button>
              <button
                onClick={() => setFilter('unconfirmed')}
                className={`rounded-lg px-3 py-1.5 transition ${
                  filter === 'unconfirmed'
                    ? 'bg-background font-semibold text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Needs Review
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDetect}
              disabled={detecting}
              className="gap-2 rounded-xl text-xs font-semibold"
            >
              {detecting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5 text-primary" />
              )}
              Re-scan Ledger
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-20 text-sm font-medium text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin text-primary" /> Scanning transaction intervals...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-border bg-muted/40 text-muted-foreground shadow-xs">
              <Repeat className="size-7" />
            </div>
            <h3 className="mt-4 text-lg font-bold tracking-tight">No recurring subscriptions detected</h3>
            <p className="mt-1.5 max-w-sm mx-auto text-xs leading-relaxed text-muted-foreground">
              Import transactions or click Re-scan Ledger above to automatically identify Netflix, Spotify, gym memberships, rent, and utility debits.
            </p>
            <Button
              onClick={handleDetect}
              disabled={detecting}
              variant="outline"
              className="mt-5 gap-2 rounded-xl text-xs font-semibold"
            >
              <RefreshCw className="size-3.5 text-primary" /> Run Recurrence Detection
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 hover:bg-muted/20 transition"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Repeat className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold tracking-tight text-foreground truncate">
                        {item.merchant}
                      </h3>
                      <CategoryBadge category={item.category} showIcon={false} />
                      <span className="rounded-full bg-muted/60 border border-border px-2 py-0.5 text-[10px] font-bold text-muted-foreground uppercase">
                        {item.frequency}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>Last charge: <strong>{item.last_seen_date}</strong></span>
                      <span>•</span>
                      <span>Next expected: <strong>{item.next_due_date}</strong></span>
                    </div>

                    {item.notes && (
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="size-3.5" />
                        <span>{item.notes}</span>
                      </div>
                    )}

                    {item.cancellation_draft && (
                      <div className="mt-3 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(item.cancellation_draft!)
                              setCopiedId(item.id)
                              setTimeout(() => setCopiedId(null), 2500)
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 transition shadow-2xs"
                          >
                            {copiedId === item.id ? (
                              <>
                                <Check className="size-3 text-emerald-500" />
                                <span>Copied Email Draft!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="size-3" />
                                <span>Copy Cancellation & Dispute Email</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpandedDraftId(expandedDraftId === item.id ? null : item.id)}
                            className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
                          >
                            {expandedDraftId === item.id ? 'Hide Draft Preview' : 'Preview Draft'}
                          </button>
                        </div>

                        {expandedDraftId === item.id && (
                          <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 text-xs font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed">
                            {item.cancellation_draft}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 pt-2 sm:pt-0 border-t border-border/40 sm:border-0">
                  <div className="text-left sm:text-right">
                    <p className="text-lg font-bold font-mono text-foreground">
                      ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[11px] text-muted-foreground">per {item.frequency === 'monthly' ? 'month' : item.frequency}</p>
                  </div>

                  <button
                    onClick={() => handleConfirm(item)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                      item.is_confirmed
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : 'border-border bg-card hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    {item.is_confirmed ? (
                      <>
                        <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" /> Confirmed
                      </>
                    ) : (
                      'Confirm'
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Upcoming Obligations Schedule Table */}
      {upcoming && upcoming.items.length > 0 && (
        <section className="glass-panel rounded-2xl border border-border bg-card p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="size-5 text-primary" />
            <h3 className="text-base font-bold tracking-tight text-foreground">
              Upcoming 30-Day Payment Schedule
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Merchant / Bill</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {upcoming.items.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20 transition">
                    <td className="px-4 py-3 text-xs font-mono font-semibold text-foreground whitespace-nowrap">
                      {item.next_due_date}
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">{item.merchant}</td>
                    <td className="px-4 py-3">
                      <CategoryBadge category={item.category} showIcon={false} />
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                      ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                          (item.days_remaining ?? 999) <= 7
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        <Clock className="size-3" />
                        In {item.days_remaining} day{item.days_remaining === 1 ? '' : 's'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
