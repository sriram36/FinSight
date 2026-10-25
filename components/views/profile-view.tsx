'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  UserRound,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Sparkles,
  Loader2,
  FileUp,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api-client'
import { SpendingProfileResponse } from '@/lib/types'

interface ProfileViewProps {
  onOpenImport: () => void
}

export function ProfileView({ onOpenImport }: ProfileViewProps) {
  const [profile, setProfile] = useState<SpendingProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getProfile({ user_id: 'default_user' })
      setProfile(data)
    } catch (err) {
      console.error('Failed to load spending profile', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-muted-foreground">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="mt-3 text-sm">Calculating baseline pacing & deviations...</p>
      </div>
    )
  }

  if (!profile || Object.keys(profile.categories).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <UserRound className="size-6" />
        </div>
        <h3 className="mt-4 text-base font-semibold">No profile data yet</h3>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          Import your statement to establish baseline spending pacing and detect category shifts.
        </p>
        <Button size="sm" onClick={onOpenImport} className="mt-5 gap-2">
          <FileUp className="size-4" /> Import CSV Statement
        </Button>
      </div>
    )
  }

  const categories = Object.values(profile.categories).sort((a, b) => {
    const devA = a.percentage_deviation ?? -Infinity
    const devB = b.percentage_deviation ?? -Infinity
    return devB - devA
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Pacing Explanation Header Card */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              <Calendar className="size-3.5" />
              <span>
                Baseline ({profile.baseline_days}d): {profile.baseline_start} to {profile.baseline_end}
              </span>
              <span>•</span>
              <span>
                Recent ({profile.recent_days}d): {profile.recent_start} to {profile.recent_end}
              </span>
            </div>
            <h2 className="mt-3 text-xl font-bold tracking-tight">Personal Spending Profile</h2>
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground leading-relaxed">
              Periods of unequal duration are normalized to a consistent daily pace: Baseline Daily Pace ×
              Recent Window Days = Normalized Baseline. Only categories with adequate historical baseline are
              assigned percentage deviations.
            </p>
          </div>

          {profile.highest_deviation_category && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 sm:max-w-xs">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <TrendingUp className="size-4" />
                <span className="text-xs font-semibold">Highest Deviation Category</span>
              </div>
              <p className="mt-1 text-sm font-bold">{profile.highest_deviation_category}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Trending{' '}
                <strong className="text-amber-600 dark:text-amber-400">
                  +{profile.categories[profile.highest_deviation_category]?.percentage_deviation}%
                </strong>{' '}
                above baseline.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Metrics Summary Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">Recent Window Total Spend</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">
            ₹{profile.total_recent_spending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Over {profile.recent_days} days</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">Baseline Window Total Spend</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">
            ₹{profile.total_baseline_spending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Over {profile.baseline_days} days</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground">Tracked Categories</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{categories.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Across personal spending taxonomy</p>
        </div>
      </div>

      {/* Category Pacing Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border bg-muted/30 px-5 py-3">
          <h3 className="font-semibold text-sm">Category Baseline & Recent Pace Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/10 text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 text-right font-medium">Baseline Pace (₹/day)</th>
                <th className="px-5 py-3 text-right font-medium">Recent Pace (₹/day)</th>
                <th className="px-5 py-3 text-right font-medium">Normalized Baseline</th>
                <th className="px-5 py-3 text-right font-medium">Recent Total</th>
                <th className="px-5 py-3 text-center font-medium">Deviation</th>
                <th className="px-5 py-3 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {categories.map((cat) => (
                <tr key={cat.category} className="hover:bg-muted/20 transition">
                  <td className="px-5 py-3.5 font-medium flex items-center gap-2">
                    {cat.category}
                    {cat.is_protected && (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="size-3" /> Protected
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right text-xs text-muted-foreground">
                    ₹{cat.baseline_daily_pace.toFixed(2)}
                  </td>
                  <td className="px-5 py-3.5 text-right text-xs font-medium">
                    ₹{cat.recent_daily_pace.toFixed(2)}
                  </td>
                  <td className="px-5 py-3.5 text-right text-xs text-muted-foreground">
                    ₹{cat.normalized_baseline.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold">
                    ₹{cat.recent_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {cat.is_low_baseline ? (
                      <span className="rounded bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                        Low baseline
                      </span>
                    ) : cat.percentage_deviation !== null && cat.percentage_deviation !== undefined ? (
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          cat.percentage_deviation > 25
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            : cat.percentage_deviation > 0
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {cat.percentage_deviation > 0 ? '+' : ''}
                        {cat.percentage_deviation}%
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center text-xs text-muted-foreground">
                    {cat.transaction_count_recent} txs
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
