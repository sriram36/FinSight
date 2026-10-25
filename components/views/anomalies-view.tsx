'use client'

import React, { useState, useEffect } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ShieldAlert,
  ArrowUpRight,
  Filter,
  Check,
  Eye,
  Calendar,
  Layers,
  FileQuestion
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api-client'
import { AnomalyItem, AnomaliesSummary } from '@/lib/types'

export function AnomaliesView() {
  const [alerts, setAlerts] = useState<AnomalyItem[]>([])
  const [summary, setSummary] = useState<AnomaliesSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [activeFilter, setActiveFilter] = useState<'all' | 'new' | 'reviewed' | 'dismissed'>('all')
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const [itemsData, summaryData] = await Promise.all([
        api.getAnomalies('default_user'),
        api.getAnomaliesSummary('default_user')
      ])
      setAlerts(itemsData || [])
      setSummary(summaryData)
    } catch (err) {
      console.error('Failed to load anomalies:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleScan = async () => {
    try {
      setScanning(true)
      const res = await api.detectAnomalies('default_user')
      setAlerts(res || [])
      const sum = await api.getAnomaliesSummary('default_user')
      setSummary(sum)
      setActionSuccess('Ledger scan complete. Evaluated all transactions against personal baselines.')
      setTimeout(() => setActionSuccess(null), 5000)
    } catch (err) {
      console.error('Error scanning anomalies:', err)
    } finally {
      setScanning(false)
    }
  }

  const handleReview = async (id: string, status: 'new' | 'reviewed' | 'confirmed_unusual' | 'dismissed') => {
    try {
      await api.reviewAnomaly(id, status, undefined, 'default_user')
      setAlerts(prev => prev.map(a => (a.id === id ? { ...a, status } : a)))
      const sum = await api.getAnomaliesSummary('default_user')
      setSummary(sum)
      setActionSuccess(`Alert marked as ${status.replace('_', ' ')}.`)
      setTimeout(() => setActionSuccess(null), 4000)
    } catch (err) {
      console.error('Error reviewing anomaly:', err)
    }
  }

  const filteredAlerts = alerts.filter(a => {
    if (activeFilter === 'all') return true
    if (activeFilter === 'new') return a.status === 'new'
    if (activeFilter === 'reviewed') return a.status === 'reviewed' || a.status === 'confirmed_unusual'
    if (activeFilter === 'dismissed') return a.status === 'dismissed'
    return true
  })

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border/80 bg-card/60 p-6 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-amber-500" />
            <h2 className="text-xl font-bold tracking-tight">Unusual-Spending Intelligence</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground max-w-2xl leading-relaxed">
            Deterministic anomaly detection evaluates spikes, potential duplicate receipts, and high-outflow new merchants against your personal historical baseline. Never labeled as fraud—always submitted for your verification.
          </p>
        </div>
        <Button
          onClick={handleScan}
          disabled={scanning}
          className="gap-2 rounded-xl font-semibold shadow-xs shrink-0 self-start sm:self-auto"
        >
          <RefreshCw className={`size-4 ${scanning ? 'animate-spin' : ''}`} />
          {scanning ? 'Analyzing Ledger...' : 'Scan Ledger Now'}
        </Button>
      </div>

      {actionSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
          <Check className="size-4 text-emerald-500" />
          {actionSuccess}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Active Unreviewed</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-amber-500">
            {summary?.new_count ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {summary?.high_severity_count ?? 0} high severity requiring review
          </p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Total Flagged Amount</p>
          <p className="mt-2 text-2xl font-black tracking-tight">
            ₹{(summary?.total_amount_flagged ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Unreviewed outflow variance</p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Reviewed Decisions</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-emerald-500">
            {summary?.reviewed_count ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Confirmed genuine or monitored</p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Total Alerts Generated</p>
          <p className="mt-2 text-2xl font-black tracking-tight">
            {summary?.total_alerts ?? 0}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Historical anomaly registry</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        {(['all', 'new', 'reviewed', 'dismissed'] as const).map(filter => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`rounded-xl px-4 py-1.5 text-xs font-semibold capitalize transition ${
              activeFilter === filter
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
            }`}
          >
            {filter === 'new' ? 'Action Required' : filter}
          </button>
        ))}
      </div>

      {/* Alert Feed */}
      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          <RefreshCw className="mx-auto size-6 animate-spin mb-2 opacity-50" />
          Evaluating transaction variance and baselines...
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-muted/20 py-16 text-center">
          <CheckCircle2 className="mx-auto size-10 text-emerald-500/80 mb-3" />
          <p className="text-base font-bold">No anomalies in this view</p>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            Your spending patterns reconcile cleanly against historical category baselines with zero duplicate charges detected.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredAlerts.map(alert => {
            const isHigh = alert.severity === 'high'
            const isDismissed = alert.status === 'dismissed'
            const isReviewed = alert.status === 'reviewed' || alert.status === 'confirmed_unusual'

            return (
              <div
                key={alert.id}
                className={`relative flex flex-col sm:flex-row sm:items-start justify-between gap-5 rounded-2xl border p-5 transition backdrop-blur-xs ${
                  isHigh
                    ? 'border-red-500/30 bg-red-500/5'
                    : 'border-border/80 bg-card hover:border-border'
                }`}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isHigh
                          ? 'bg-red-500/20 text-red-600 dark:text-red-400'
                          : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {alert.alert_type.replace('_', ' ')}
                    </span>
                    <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {alert.category}
                    </span>
                    {alert.status !== 'new' && (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        Status: {alert.status.replace('_', ' ')}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold tracking-tight">{alert.title}</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">{alert.explanation}</p>

                  <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-muted-foreground font-mono">
                    <span>
                      Observed: <strong className="text-foreground">₹{alert.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                    </span>
                    {alert.baseline_amount > 0 && (
                      <span>
                        Baseline: ₹{alert.baseline_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                    {alert.deviation_pct > 0 && (
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">
                        +{alert.deviation_pct}% spike
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 pt-2 sm:pt-0">
                  {alert.status === 'new' ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleReview(alert.id, 'reviewed')}
                        className="w-full sm:w-auto rounded-xl text-xs font-semibold gap-1.5 shadow-2xs"
                      >
                        <Check className="size-3.5" />
                        Mark Reviewed
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReview(alert.id, 'dismissed')}
                        className="w-full sm:w-auto rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground"
                      >
                        Dismiss
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReview(alert.id, 'new')}
                      className="rounded-xl text-xs text-muted-foreground hover:text-foreground"
                    >
                      Reopen Alert
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
