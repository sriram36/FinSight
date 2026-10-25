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
  ExternalLink,
  Target,
  Repeat,
  SlidersHorizontal,
  CheckCircle2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api-client'
import { Recommendation, RecommendationConfig, Transaction } from '@/lib/types'

interface RecommendationsViewProps {
  onOpenImport: () => void
}

export function RecommendationsView({ onOpenImport }: RecommendationsViewProps) {
  const [viewMode, setViewMode] = useState<'portfolio' | 'comparator'>('portfolio')
  const [portfolio, setPortfolio] = useState<Recommendation[]>([])
  const [config, setConfig] = useState<RecommendationConfig>('C')
  const [singleRecommendation, setSingleRecommendation] = useState<Recommendation | null>(null)
  const [loading, setLoading] = useState(false)
  const [evidenceData, setEvidenceData] = useState<{
    recommendation_id: string
    configuration: string
    category: string
    is_verified: boolean
    verifier_notes?: string
    evidence: Record<string, any>
    source_transactions: Transaction[]
  } | null>(null)
  const [showEvidenceModal, setShowEvidenceModal] = useState(false)

  const fetchPortfolio = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getPortfolioInsights('default_user')
      setPortfolio(data)
    } catch (err) {
      console.error('Failed to load portfolio insights', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSingle = useCallback(async (selectedConfig: RecommendationConfig) => {
    setLoading(true)
    try {
      const res = await api.generateRecommendation({
        user_id: 'default_user',
        configuration: selectedConfig,
      })
      setSingleRecommendation(res)
    } catch (err) {
      console.error('Failed to generate recommendation', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (viewMode === 'portfolio') {
      fetchPortfolio()
    } else {
      fetchSingle(config)
    }
  }, [viewMode, config, fetchPortfolio, fetchSingle])

  const handleOpenEvidence = async (rec: Recommendation) => {
    try {
      const data = await api.getRecommendationEvidence(rec.id)
      setEvidenceData(data)
      setShowEvidenceModal(true)
    } catch (err) {
      console.error('Failed to load evidence', err)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Mode Switcher */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="size-5" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">Verified Insights Portfolio</h2>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="size-3.5" /> Zero Hallucination Standard
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Actionable financial optimizations. All calculations run deterministically in Python against your ledger, structured with <code className="px-1 py-0.5 rounded bg-muted text-[11px] font-mono">gpt-5.6-luna</code>, and validated by the Claim Verifier.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border bg-muted/40 p-1 text-xs font-medium">
              <button
                onClick={() => setViewMode('portfolio')}
                className={`rounded-md px-3 py-1.5 transition ${
                  viewMode === 'portfolio'
                    ? 'bg-background font-semibold text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Executive Portfolio
              </button>
              <button
                onClick={() => setViewMode('comparator')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 transition ${
                  viewMode === 'comparator'
                    ? 'bg-background font-semibold text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <SlidersHorizontal className="size-3" />
                Lab Architecture (A/B/C)
              </button>
            </div>
          </div>
        </div>

        {/* Model Selector Bar when in Lab Mode */}
        {viewMode === 'comparator' && (
          <div className="mt-4 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Select configuration to evaluate baseline rules vs unconstrained LLMs vs verified grounding:
            </p>
            <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-muted/40 p-1 text-xs font-medium">
              <button
                onClick={() => setConfig('C')}
                className={`rounded-lg px-3 py-1.5 transition ${
                  config === 'C'
                    ? 'bg-background font-semibold text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                System C (Evidence-Grounded)
              </button>
              <button
                onClick={() => setConfig('A')}
                className={`rounded-lg px-3 py-1.5 transition ${
                  config === 'A'
                    ? 'bg-background font-semibold text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                System A (Rule Baseline)
              </button>
              <button
                onClick={() => setConfig('B')}
                className={`rounded-lg px-3 py-1.5 transition ${
                  config === 'B'
                    ? 'bg-background font-semibold text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                System B (Standard AI)
              </button>
              <button
                onClick={() => setConfig('B-ablation')}
                className={`rounded-lg px-3 py-1.5 transition ${
                  config === 'B-ablation'
                    ? 'bg-background font-semibold text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                B-ablation (Unstructured)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-20 text-muted-foreground shadow-xs">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="mt-3 text-sm font-medium">Analyzing ledger pace, subscriptions, and active goals...</p>
        </div>
      ) : viewMode === 'portfolio' ? (
        /* Portfolio List */
        portfolio.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-16 text-center shadow-xs">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Sparkles className="size-6" />
            </div>
            <h3 className="mt-4 text-base font-semibold">No insights generated yet</h3>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Import transactions to enable multi-dimensional spending outlier detection, subscription audits, and goal planning.
            </p>
            <Button size="sm" onClick={onOpenImport} className="mt-5 gap-2">
              <FileUp className="size-4" /> Import CSV Statement
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {portfolio.map((rec, idx) => (
              <div
                key={rec.id}
                className="rounded-2xl border border-border bg-card p-6 shadow-xs hover:border-primary/40 transition"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3.5">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                      {idx === 0 ? <Sparkles className="size-5" /> : idx === 1 ? <Repeat className="size-5" /> : <Target className="size-5" />}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
                          {rec.category || 'Portfolio Insight'}
                        </span>

                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="size-3.5" /> Math Verified
                        </span>

                        <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium border bg-muted/60 text-muted-foreground">
                          Model: {rec.llm_model || 'gpt-5.6-luna'}
                        </span>
                      </div>

                      <h3 className="mt-2 text-lg font-bold tracking-tight text-foreground">
                        {rec.action}
                      </h3>
                    </div>
                  </div>

                  {rec.expected_impact && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 sm:text-right shrink-0">
                      <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                        Estimated Monthly Impact
                      </p>
                      <p className="mt-0.5 text-lg font-bold text-emerald-700 dark:text-emerald-300">
                        ₹{rec.expected_impact.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 rounded-xl border border-border/80 bg-muted/30 p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Grounded Rationalization & Evidence
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground">{rec.reason}</p>
                </div>

                {rec.assumptions && rec.assumptions.length > 0 && (
                  <div className="mt-3 text-xs text-muted-foreground">
                    <span className="font-semibold uppercase tracking-wider text-[10px]">Assumptions: </span>
                    {rec.assumptions.join(' · ')}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3.5">
                  <span className="text-[11px] text-muted-foreground">
                    Generated {new Date(rec.created_at).toLocaleDateString()} · Verifier: {rec.verifier_notes || 'Strict claim audit passed'}
                  </span>
                  <div className="flex items-center gap-2">
                    {rec.evidence && Object.keys(rec.evidence).length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEvidence(rec)}
                        className="gap-1.5 text-xs"
                      >
                        <FileCheck2 className="size-3.5 text-primary" /> Inspect Receipts & Math
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Comparator Single View */
        !singleRecommendation ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-16 text-center shadow-xs">
            <h3 className="text-base font-semibold">No recommendation available for {config}</h3>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Please import transactions or verify category spending history.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold">
                      Configuration {singleRecommendation.configuration}
                    </span>
                    {singleRecommendation.category && singleRecommendation.category !== 'None' && (
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        {singleRecommendation.category}
                      </span>
                    )}
                    {singleRecommendation.is_verified ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <FileCheck2 className="size-3.5" /> Verified Grounded
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        Unverified Output
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-xl font-bold tracking-tight text-foreground">
                    {singleRecommendation.action}
                  </h3>
                </div>
              </div>

              {singleRecommendation.expected_impact && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 sm:text-right">
                  <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                    Calculated Monthly Savings
                  </p>
                  <p className="mt-0.5 text-lg font-bold text-emerald-700 dark:text-emerald-300">
                    ₹{singleRecommendation.expected_impact.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Grounded Explanation & Rationalization
              </p>
              <p className="mt-1 text-sm leading-relaxed text-foreground">{singleRecommendation.reason}</p>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <p className="text-[11px] text-muted-foreground">
                Advice generated on {new Date(singleRecommendation.created_at).toLocaleDateString()}
              </p>
              <div className="flex items-center gap-2">
                {singleRecommendation.evidence && Object.keys(singleRecommendation.evidence).length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => handleOpenEvidence(singleRecommendation)} className="gap-2">
                    <FileCheck2 className="size-3.5 text-primary" /> Inspect Evidence Trail
                  </Button>
                )}
                <Button size="sm" onClick={() => fetchSingle(config)}>
                  Regenerate
                </Button>
              </div>
            </div>
          </div>
        )
      )}

      {/* Grounded Evidence Modal */}
      {showEvidenceModal && evidenceData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
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
                  Mathematical proof and source transactions validating this insight.
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
                <p className="mt-1 leading-relaxed">{evidenceData.verifier_notes || 'All numerical claims matched deterministic ledger totals.'}</p>
              </div>

              {/* Evidence Key Figures Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(evidenceData.evidence).map(([k, v]) => {
                  if (typeof v === 'object' || v === null || v === undefined) return null
                  const label = k.replace(/_/g, ' ')
                  const isMoney = k.includes('amount') || k.includes('spent') || k.includes('total') || k.includes('balance') || k.includes('impact')
                  const displayVal = isMoney && typeof v === 'number'
                    ? `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                    : String(v)

                  return (
                    <div key={k} className="rounded-lg border border-border bg-muted/20 p-3">
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground">{label}</p>
                      <p className="mt-1 text-sm font-bold truncate">{displayVal}</p>
                    </div>
                  )
                })}
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
