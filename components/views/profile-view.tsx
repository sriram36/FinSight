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
  Info,
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CategoryBadge } from '@/components/ui/category-badge'
import { api } from '@/lib/api-client'
import { SpendingProfileResponse } from '@/lib/types'

interface ProfileViewProps {
  onOpenImport: () => void
}

export function ProfileView({ onOpenImport }: ProfileViewProps) {
  const [profile, setProfile] = useState<SpendingProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)

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

  const handleSeed = async () => {
    setSeeding(true)
    try {
      await api.seedDemoData('default_user')
      await loadProfile()
    } catch (err) {
      console.error('Failed to seed demo data', err)
    } finally {
      setSeeding(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 text-muted-foreground">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="mt-3 text-sm font-medium">Computing baseline pacing & category deviations...</p>
      </div>
    )
  }

  if (!profile || Object.keys(profile.categories).length === 0) {
    return (
      <div className="glass-panel flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-16 text-center shadow-xs">
        <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-muted/40 text-muted-foreground shadow-xs">
          <UserRound className="size-7" />
        </div>
        <h3 className="mt-4 text-lg font-bold tracking-tight">No spending profile established</h3>
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
          Import your statement or load the Jordan Davis demo ledger to establish baseline daily pacing and detect category shifts.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeed}
            disabled={seeding}
            className="gap-2 rounded-xl text-xs"
          >
            {seeding ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5 text-primary" />}
            Load Demo Ledger (Jordan Davis)
          </Button>
          <Button size="sm" onClick={onOpenImport} className="gap-2 rounded-xl text-xs">
            <FileUp className="size-3.5" /> Import CSV Statement
          </Button>
        </div>
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
      <div className="glass-panel rounded-2xl border border-border bg-card p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-semibold text-muted-foreground">
              <Calendar className="size-3.5 text-primary" />
              <span>
                Baseline ({profile.baseline_days}d): <strong>{profile.baseline_start}</strong> to <strong>{profile.baseline_end}</strong>
              </span>
              <span>•</span>
              <span>
                Recent ({profile.recent_days}d): <strong>{profile.recent_start}</strong> to <strong>{profile.recent_end}</strong>
              </span>
            </div>
            <h2 className="mt-3 text-xl font-bold tracking-tight">Personal Spending Taxonomy Profile</h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              Historical baseline spending is normalized to compare windows of unequal duration: 
              <code className="mx-1 px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-[11px]">Normalized Baseline = (Baseline Spend / Baseline Days) × Recent Days</code>.
              Only categories with adequate baseline transactions receive percentage deviation ratings.
            </p>
          </div>

          {profile.highest_deviation_category && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:max-w-xs shrink-0 shadow-2xs">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <TrendingUp className="size-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Top Pace Expansion</span>
              </div>
              <p className="mt-1 text-base font-extrabold text-foreground">{profile.highest_deviation_category}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Pacing{' '}
                <strong className="text-amber-600 dark:text-amber-400 font-mono">
                  +{profile.categories[profile.highest_deviation_category]?.percentage_deviation}%
                </strong>{' '}
                above normalized historical baseline.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Metrics Summary Row with Glass Panels */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="glass-panel group relative overflow-hidden rounded-2xl border border-border p-5 shadow-xs transition hover:border-primary/40 hover:shadow-md">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Window Spend
          </span>
          <p className="mt-3 text-3xl font-extrabold tracking-tight font-mono text-foreground">
            ₹{profile.total_recent_spending.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Across {profile.recent_days} active days</p>
        </div>

        <div className="glass-panel group relative overflow-hidden rounded-2xl border border-border p-5 shadow-xs transition hover:border-primary/40 hover:shadow-md">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Baseline Window Spend
          </span>
          <p className="mt-3 text-3xl font-extrabold tracking-tight font-mono text-foreground">
            ₹{profile.total_baseline_spending.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Across {profile.baseline_days} historical days</p>
        </div>

        <div className="glass-panel group relative overflow-hidden rounded-2xl border border-border p-5 shadow-xs transition hover:border-primary/40 hover:shadow-md">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Active Categories
          </span>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-foreground">{categories.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Across individual spending taxonomy</p>
        </div>
      </div>

      {/* Category Pacing Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        <div className="border-b border-border bg-muted/30 px-5 py-4">
          <h3 className="font-bold text-sm text-foreground">
            Category Daily Pacing & Deviation Breakdown
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Mathematical deviation reflects whether spending expanded or contracted relative to personal daily baseline.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5 text-right">Baseline Pace</th>
                <th className="px-5 py-3.5 text-right">Recent Pace</th>
                <th className="px-5 py-3.5 text-right">Normalized Baseline</th>
                <th className="px-5 py-3.5 text-right">Recent Actual</th>
                <th className="px-5 py-3.5 text-center">Pacing Deviation</th>
                <th className="px-5 py-3.5 text-center">Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {categories.map((cat, idx) => {
                const dev = cat.percentage_deviation
                const isOver = dev !== null && dev !== undefined && dev > 0
                const isHigh = dev !== null && dev !== undefined && dev > 25

                return (
                  <tr key={cat.category} className="group transition hover:bg-muted/30">
                    {/* Category with icon badge */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-semibold text-muted-foreground w-4">
                          #{idx + 1}
                        </span>
                        <CategoryBadge category={cat.category} showIcon={true} />
                        {cat.is_protected && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-600 dark:text-sky-400 border border-sky-500/20">
                            <ShieldCheck className="size-3" /> Protected
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Baseline daily pace */}
                    <td className="px-5 py-4 text-right text-xs font-mono text-muted-foreground">
                      ₹{cat.baseline_daily_pace.toFixed(2)}/day
                    </td>

                    {/* Recent daily pace */}
                    <td className="px-5 py-4 text-right text-xs font-mono font-semibold text-foreground">
                      ₹{cat.recent_daily_pace.toFixed(2)}/day
                    </td>

                    {/* Normalized baseline */}
                    <td className="px-5 py-4 text-right text-xs font-mono text-muted-foreground">
                      ₹{cat.normalized_baseline.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Recent Total */}
                    <td className="px-5 py-4 text-right font-mono font-bold text-sm text-foreground">
                      ₹{cat.recent_total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Deviation badge */}
                    <td className="px-5 py-4 text-center">
                      {cat.is_low_baseline ? (
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground border border-border">
                          Low baseline
                        </span>
                      ) : dev !== null && dev !== undefined ? (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold font-mono border ${
                            isHigh
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                              : isOver
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          }`}
                        >
                          {isOver ? (
                            <ArrowUpRight className="size-3" />
                          ) : (
                            <ArrowDownRight className="size-3" />
                          )}
                          {isOver ? '+' : ''}
                          {dev}%
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Transaction count */}
                    <td className="px-5 py-4 text-center text-xs text-muted-foreground font-mono">
                      {cat.transaction_count_recent} txs
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
