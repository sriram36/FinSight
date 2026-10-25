'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Sparkles,
  ShieldCheck,
  FileCheck2,
  Calendar,
  Layers,
  ArrowRight,
  TrendingDown,
  Loader2,
  FileUp,
  X,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api-client'
import { Recommendation, RecommendationConfig, Transaction } from '@/lib/types'

interface RecommendationsViewProps {
  onOpenImport: () => void
}

export function RecommendationsView({ onOpenImport }: RecommendationsViewProps) {
  const [config, setConfig] = useState<RecommendationConfig>('C')
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null)
  const [loading, setLoading] = useState(false)
  const [evidenceData, setEvidenceData] = useState<{
    evidence: Record<string, any>
    source_transactions: Transaction[]
    is_verified: boolean
    verifier_notes?: string
  } | null>(null)
  const [showEvidenceModal, setShowEvidenceModal] = useState(false)

  const handleGenerate = useCallback(
    async (selectedConfig: RecommendationConfig = config) => {
      setLoading(true)
      try {
        const res = await api.generateRecommendation({
          user_id: 'default_user',
          configuration: selectedConfig,
        })
        setRecommendation(res)
      } catch (err) {
        console.error('Failed to generate recommendation', err)
      } finally {
        setLoading(false)
      }
    },
    [config]
  )

  useEffect(() => {
    handleGenerate(config)
  }, [config, handleGenerate])

  const handleOpenEvidence = async () => {
    if (!recommendation) return
    try {
      const data = await api.getRecommendationEvidence(recommendation.id)
      setEvidenceData(data)
      setShowEvidenceModal(true)
    } catch (err) {
      console.error('Failed to load evidence', err)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Configuration Header Bar */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Recommendation Orchestrator</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Select an advice model or inspect the evidence and calculation trail behind System C.
            </p>
          </div>
          <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-muted/40 p-1 text-xs font-medium">
            <button
              onClick={() => setConfig('C')}
              className={`rounded-lg px-3 py-1.5 transition ${
                config === 'C'
                  ? 'bg-background font-semibold text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              System C (Evidence-Grounded)
            </button>
            <button
              onClick={() => setConfig('A')}
              className={`rounded-lg px-3 py-1.5 transition ${
                config === 'A'
                  ? 'bg-background font-semibold text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              System A (Rule Baseline)
            </button>
            <button
              onClick={() => setConfig('B')}
              className={`rounded-lg px-3 py-1.5 transition ${
                config === 'B'
                  ? 'bg-background font-semibold text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              System B (Personalized AI)
            </button>
            <button
              onClick={() => setConfig('B-ablation')}
              className={`rounded-lg px-3 py-1.5 transition ${
                config === 'B-ablation'
                  ? 'bg-background font-semibold text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              B-ablation (Unstructured)
            </button>
          </div>
        </div>
      </div>

      {/* Main Recommendation Card */}
      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-20 text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="mt-3 text-sm font-medium">Synthesizing evidence-grounded recommendation...</p>
        </div>
      ) : !recommendation ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Sparkles className="size-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold">No recommendation available</h3>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Import transactions to enable spending anomaly detection and grounded advice.
          </p>
          <Button size="sm" onClick={onOpenImport} className="mt-5 gap-2">
            <FileUp className="size-4" /> Import CSV Statement
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold">
                      Configuration {recommendation.configuration}
                    </span>
                    {recommendation.category && recommendation.category !== 'None' && (
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        {recommendation.category}
                      </span>
                    )}
                    {recommendation.is_verified && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <FileCheck2 className="size-3.5" /> Verified Grounded
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-xl font-bold tracking-tight text-foreground">
                    {recommendation.action}
                  </h3>
                </div>
              </div>

              {recommendation.expected_impact && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-right">
                  <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                    Calculated Monthly Savings
                  </p>
                  <p className="mt-0.5 text-lg font-bold text-emerald-700 dark:text-emerald-300">
                    ₹{recommendation.expected_impact.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Grounded Explanation & Rationalization
              </p>
              <p className="mt-1 text-sm leading-relaxed text-foreground">{recommendation.reason}</p>
            </div>

            {/* Assumptions List */}
            {recommendation.assumptions.length > 0 && (
              <div className="mt-4">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Transparent Assumptions
                </p>
                <ul className="mt-1.5 list-inside list-disc text-xs text-muted-foreground space-y-0.5">
                  {recommendation.assumptions.map((asm, i) => (
                    <li key={i}>{asm}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Bar */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <p className="text-[11px] text-muted-foreground">
                Advice generated on {new Date(recommendation.created_at).toLocaleDateString()}
              </p>
              <div className="flex items-center gap-2">
                {Object.keys(recommendation.evidence).length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleOpenEvidence} className="gap-2">
                    <FileCheck2 className="size-3.5 text-primary" /> Inspect Grounded Evidence
                  </Button>
                )}
                <Button size="sm" onClick={() => handleGenerate(config)}>
                  Regenerate
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grounded Evidence Modal */}
      {showEvidenceModal && evidenceData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="evidence-modal-title"
            className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border p-5">
              <div>
                <h3 id="evidence-modal-title" className="text-lg font-bold tracking-tight flex items-center gap-2">
                  <FileCheck2 className="size-5 text-emerald-600" /> Evidence Audit Trail
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Mathematical proof and source transactions validating this recommendation.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowEvidenceModal(false)}
                aria-label="Close"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
              {/* Verification Status Banner */}
              <div
                className={`rounded-xl border p-4 text-xs ${
                  evidenceData.is_verified
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  <ShieldCheck className="size-4" />
                  <span>{evidenceData.is_verified ? 'Verified Grounded Status' : 'Verification Flag'}</span>
                </div>
                <p className="mt-1 leading-relaxed">{evidenceData.verifier_notes}</p>
              </div>

              {/* Evidence Key Figures Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-[11px] text-muted-foreground">Recent Total</p>
                  <p className="mt-1 text-base font-bold">
                    ₹{evidenceData.evidence.recent_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-[11px] text-muted-foreground">Baseline Total</p>
                  <p className="mt-1 text-base font-bold">
                    ₹{evidenceData.evidence.baseline_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-[11px] text-muted-foreground">Recent Pace</p>
                  <p className="mt-1 text-base font-bold">
                    ₹{evidenceData.evidence.recent_daily_pace?.toFixed(2)}/day
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-[11px] text-muted-foreground">Percentage Deviation</p>
                  <p className="mt-1 text-base font-bold text-rose-600 dark:text-rose-400">
                    +{evidenceData.evidence.percentage_deviation}%
                  </p>
                </div>
              </div>

              {/* Source Transactions Table */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Contributing Source Transactions ({evidenceData.source_transactions.length})
                </h4>
                {evidenceData.source_transactions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No individual transaction IDs linked.</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-border">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-border bg-muted/30 text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Merchant</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {evidenceData.source_transactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-muted/20">
                            <td className="px-3 py-2 text-muted-foreground">{tx.transaction_date}</td>
                            <td className="px-3 py-2 font-medium">{tx.description}</td>
                            <td className="px-3 py-2 text-right font-semibold">
                              ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end border-t border-border p-4 bg-muted/10">
              <Button onClick={() => setShowEvidenceModal(false)}>Close Audit</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
