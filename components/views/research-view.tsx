'use client'

import React, { useEffect, useState } from 'react'
import {
  FlaskConical,
  BarChart3,
  Target,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Play,
  RotateCcw,
  Loader2,
  Database,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api-client'

export function ResearchView() {
  const [audit, setAudit] = useState<any>(null)
  const [split, setSplit] = useState<any>(null)
  const [benchmark, setBenchmark] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Perturbation experiment state
  const [selectedUser, setSelectedUser] = useState('syn_user_01')
  const [targetCategory, setTargetCategory] = useState('Dining Out')
  const [deltaPct, setDeltaPct] = useState(150)
  const [seed, setSeed] = useState(42)
  const [runningPerturbation, setRunningPerturbation] = useState(false)
  const [perturbationResult, setPerturbationResult] = useState<any>(null)

  useEffect(() => {
    let mounted = true
    async function fetchResearchData() {
      setLoading(true)
      setError(null)
      try {
        const [auditRes, splitRes, benchmarkRes] = await Promise.all([
          api.getResearchAudit(),
          api.getTemporalSplit(),
          api.getBenchmark(),
        ])
        if (!mounted) return
        setAudit(auditRes)
        setSplit(splitRes)
        setBenchmark(benchmarkRes)
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to fetch research lab data')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchResearchData()
    return () => {
      mounted = false
    }
  }, [])

  const handleRunPerturbation = async () => {
    setRunningPerturbation(true)
    try {
      const res = await api.runPerturbation({
        user_id: selectedUser,
        seed,
        target_category: targetCategory,
        delta_pct: deltaPct,
      })
      setPerturbationResult(res)
    } catch (err: any) {
      alert(`Perturbation experiment failed: ${err.message}`)
    } finally {
      setRunningPerturbation(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" /> Loading Research Lab benchmark data...
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Synthetic Dataset Warning Banner */}
      <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
        <div className="flex items-start gap-3">
          <FlaskConical className="mt-0.5 size-5 text-amber-600 dark:text-amber-400" />
          <div>
            <h2 className="font-semibold text-foreground">Synthetic Research Environment</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              PersonaLedger v1.0 · 1,000 synthetic transactions across 10 reproducible personas · 70/30 temporal holdout split.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Research evaluations test algorithmic reasoning, claim verification accuracy, and invariant enforcement under controlled signal perturbations. No personal user data is ever accessed.
            </p>
          </div>
        </div>
      </section>

      {/* Dataset Audit & Temporal Split Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Dataset Scope</span>
            <Database className="size-4" />
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight">{audit?.total_rows ?? 1000} Rows</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {audit?.unique_users ?? 10} synthetic personas ({audit?.date_min} to {audit?.date_max})
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Temporal Split</span>
            <BarChart3 className="size-4" />
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight">70 / 30 Split</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {split?.baseline_partition?.row_count ?? 700} profile / {split?.holdout_partition?.row_count ?? 300} holdout
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Temporal Leakage</span>
            <ShieldCheck className="size-4 text-emerald-500" />
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {split?.no_temporal_leakage ? 'Zero Leakage' : 'Leakage Detected'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Split threshold: {split?.split_date}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Evaluation Protocols</span>
            <Target className="size-4" />
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight">4 Configurations</p>
          <p className="mt-1 text-xs text-muted-foreground">A, B, B-ablation, C (FinSight)</p>
        </div>
      </div>

      {/* Benchmark Comparison Table */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border p-5">
          <h2 className="font-semibold text-foreground">4-Way Architecture Benchmark</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Comparing deterministic baseline, unstructured generation, and evidence-grounded claim-verified models against the holdout evaluation set.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-semibold">Config</th>
                <th className="px-5 py-3 font-semibold">Model Architecture</th>
                <th className="px-5 py-3 font-semibold text-right">Decision Agreement</th>
                <th className="px-5 py-3 font-semibold text-right">Numeric Claim Pass</th>
                <th className="px-5 py-3 font-semibold text-right">Hallucination Rate</th>
                <th className="px-5 py-3 font-semibold text-right">Invariant Violations</th>
                <th className="px-5 py-3 font-semibold text-center">Evidence Grounded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {benchmark.map(row => {
                const isFinSight = row.configuration === 'C'
                return (
                  <tr
                    key={row.configuration}
                    className={isFinSight ? 'bg-primary/5 font-medium' : 'hover:bg-muted/20'}
                  >
                    <td className="px-5 py-4 font-bold text-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        {row.configuration}
                        {isFinSight && (
                          <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] text-primary">
                            Target
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-foreground">{row.name}</div>
                      <div className="text-xs text-muted-foreground max-w-xs">{row.description}</div>
                    </td>
                    <td className="px-5 py-4 text-right font-semibold">
                      <div>{(row.decision_agreement * 100).toFixed(1)}%</div>
                      {row.decision_agreement_ratio && (
                        <div className="text-[10px] text-muted-foreground font-normal">{row.decision_agreement_ratio}</div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span
                        className={
                          row.numeric_verification_pass_rate === 1.0
                            ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                            : 'text-amber-600 dark:text-amber-400'
                        }
                      >
                        {(row.numeric_verification_pass_rate * 100).toFixed(1)}%
                      </span>
                      {row.numeric_verification_ratio && (
                        <div className="text-[10px] text-muted-foreground">{row.numeric_verification_ratio}</div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span
                        className={
                          row.hallucination_rate === 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400 font-medium'
                        }
                      >
                        {(row.hallucination_rate * 100).toFixed(1)}%
                      </span>
                      {row.hallucination_ratio && (
                        <div className="text-[10px] text-muted-foreground">{row.hallucination_ratio}</div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span
                        className={
                          row.protected_category_violations === 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400 font-semibold'
                        }
                      >
                        {row.protected_category_violations}
                      </span>
                      {row.protected_violations_ratio && (
                        <div className="text-[10px] text-muted-foreground">{row.protected_violations_ratio}</div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      {row.evidence_grounded ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="size-3" /> Grounded
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          Unverifiable
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Controlled Perturbation Experiment Runner */}
      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <FlaskConical className="size-5 text-primary" />
              <h2 className="font-semibold text-foreground">Controlled Perturbation Experiment</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Inject an artificial spending anomaly into the 30% holdout window to test system sensitivity and claim fidelity.
            </p>
          </div>
          <Button
            onClick={handleRunPerturbation}
            disabled={runningPerturbation}
            className="gap-2 self-start sm:self-auto"
          >
            {runningPerturbation ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            Run Perturbation Trial
          </Button>
        </div>

        {/* Experiment Parameters */}
        <div className="grid gap-4 mt-5 sm:grid-cols-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Evaluation Persona</label>
            <select
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {audit?.user_distribution && Object.keys(audit.user_distribution).map((u: string) => (
                <option key={u} value={u}>{u}</option>
              ))}
              {!audit?.user_distribution && (
                <option value="syn_user_01">syn_user_01</option>
              )}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Target Discretionary Category</label>
            <select
              value={targetCategory}
              onChange={e => setTargetCategory(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="Dining Out">Dining Out</option>
              <option value="Shopping">Shopping</option>
              <option value="Coffee & Snacks">Coffee & Snacks</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Subscriptions">Subscriptions</option>
              <option value="Transportation">Transportation</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Forced Delta Injection</label>
            <select
              value={deltaPct}
              onChange={e => setDeltaPct(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value={50}>+50% Signal Spike</option>
              <option value={100}>+100% Signal Spike</option>
              <option value={150}>+150% Signal Spike (Standard PRD)</option>
              <option value={200}>+200% Severe Outlier</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Random Seed</label>
            <input
              type="number"
              value={seed}
              onChange={e => setSeed(Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Perturbation Outcome */}
        {perturbationResult && (
          <div className="mt-6 space-y-4 animate-in fade-in">
            <div className="grid gap-4 sm:grid-cols-4 rounded-lg bg-muted/40 p-4 text-xs">
              <div>
                <span className="text-muted-foreground">Neutralized Pre-Existing Top:</span>
                <p className="text-sm font-semibold mt-0.5 text-muted-foreground">
                  {perturbationResult.neutralized_original_category} (Scaled to baseline)
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Pre-perturbation Spend:</span>
                <p className="text-sm font-semibold mt-0.5">
                  ₹{perturbationResult.pre_perturbation_holdout_spend?.toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Post-perturbation Spend:</span>
                <p className="text-sm font-semibold mt-0.5 text-primary">
                  ₹{perturbationResult.post_perturbation_holdout_spend?.toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Injected Deviation:</span>
                <p className="text-sm font-semibold mt-0.5 text-emerald-600 dark:text-emerald-400">
                  {perturbationResult.injected_delta_pct} ({perturbationResult.post_perturbation_deviation_pct})
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(perturbationResult.evaluations).map(([cfg, evalData]: [string, any]) => {
                const isC = cfg === 'Config_C'
                return (
                  <div
                    key={cfg}
                    className={`rounded-lg border p-4 text-xs flex flex-col justify-between ${
                      isC ? 'border-primary bg-primary/5' : 'border-border bg-card'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-foreground">{cfg.replace('_', ' ')}</span>
                        {evalData.detected_shift ? (
                          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">
                            Detected
                          </span>
                        ) : (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            Missed
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground leading-relaxed">{evalData.notes}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-border/50 space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">Cited Tx IDs:</span>
                        <span className={evalData.identifies_exact_source_tx ? 'text-emerald-600 font-medium' : 'text-muted-foreground'}>
                          {evalData.identifies_exact_source_tx ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">Claim Verified:</span>
                        <span className={evalData.grounded_verification ? 'text-emerald-600 font-medium' : 'text-muted-foreground'}>
                          {evalData.grounded_verification ? '100% Pass' : 'N/A / Failed'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
