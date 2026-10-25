'use client'

import { useState } from 'react'
import { FileUp, X, Check, AlertCircle, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api-client'
import { CSVPreviewSummary } from '@/lib/types'

interface ImportModalProps {
  onClose: () => void
  onSuccess: (count?: number, result?: any) => void
}

export function ImportModal({ onClose, onSuccess }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<CSVPreviewSummary | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)
    setError(null)
    setLoading(true)

    try {
      const summary = await api.previewCSV(selected)
      setPreview(summary)
    } catch (err: any) {
      setError(err.message || 'Failed to parse CSV preview.')
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!preview || !file) return
    setConfirming(true)
    setError(null)

    try {
      const validTxs = preview.sample_preview
        .filter((r) => r.status === 'valid')
        .map((r) => ({
          transaction_date: r.mapped_date!,
          description: r.mapped_description!,
          amount: r.mapped_amount!,
          direction: r.mapped_direction || 'spending',
          category: r.mapped_category || 'Uncategorized',
          category_source: 'csv_import',
        }))

      const result = await api.confirmImport({
        user_id: 'default_user',
        file_name: file.name,
        transactions: validTxs,
        total_rows: preview.total_rows,
        rejected_rows: preview.rejected_rows,
        duplicate_rows: preview.duplicate_rows,
      })

      onSuccess(result.accepted_count, result)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to confirm import.')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-modal-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-card shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h2 id="import-modal-title" className="text-lg font-semibold tracking-tight">
              Import Transactions
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Preview and map statement columns. Nothing is saved until confirmed.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close dialog">
            <X className="size-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-400">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!preview ? (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center transition hover:bg-muted/40">
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={handleFileChange}
                disabled={loading}
              />
              {loading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="size-8 animate-spin text-primary" />
                  <p className="text-sm font-medium">Analyzing CSV structure...</p>
                </div>
              ) : (
                <>
                  <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <FileUp className="size-6" />
                  </div>
                  <span className="mt-3 text-sm font-medium">
                    {file ? file.name : 'Select or drop a CSV statement'}
                  </span>
                  <span className="mt-1 text-xs text-muted-foreground">
                    Bank statements, credit card exports, or expense spreadsheets
                  </span>
                </>
              )}
            </label>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-3">
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-[11px] text-muted-foreground">Total Rows</p>
                  <p className="mt-1 text-lg font-semibold">{preview.total_rows}</p>
                </div>
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Accepted</p>
                  <p className="mt-1 text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                    {preview.accepted_rows}
                  </p>
                </div>
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                  <p className="text-[11px] text-amber-600 dark:text-amber-400">Duplicates</p>
                  <p className="mt-1 text-lg font-semibold text-amber-600 dark:text-amber-400">
                    {preview.duplicate_rows}
                  </p>
                </div>
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
                  <p className="text-[11px] text-rose-600 dark:text-rose-400">Rejected</p>
                  <p className="mt-1 text-lg font-semibold text-rose-600 dark:text-rose-400">
                    {preview.rejected_rows}
                  </p>
                </div>
              </div>

              {/* Sample Table Preview */}
              <div className="rounded-xl border border-border">
                <div className="border-b border-border bg-muted/40 px-4 py-2.5 text-xs font-semibold">
                  Preview Sample ({Math.min(5, preview.sample_preview.length)} of {preview.total_rows} rows)
                </div>
                <div className="max-h-56 overflow-x-auto overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border bg-muted/20 text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Description</th>
                        <th className="px-3 py-2">Category</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                        <th className="px-3 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {preview.sample_preview.slice(0, 5).map((row, i) => (
                        <tr key={i} className="hover:bg-muted/30">
                          <td className="px-3 py-2 whitespace-nowrap">{row.mapped_date || '—'}</td>
                          <td className="max-w-[180px] truncate px-3 py-2">{row.mapped_description}</td>
                          <td className="px-3 py-2">
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                              {row.mapped_category}
                            </span>
                          </td>
                          <td
                            className={`px-3 py-2 text-right font-medium whitespace-nowrap ${
                              row.mapped_direction === 'income'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : ''
                            }`}
                          >
                            {row.mapped_direction === 'income' ? '+' : '-'}₹
                            {row.mapped_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {row.status === 'valid' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600">
                                <Check className="size-3" /> Valid
                              </span>
                            ) : (
                              <span className="text-[10px] text-rose-500">{row.status}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border p-4 bg-card/60">
          <Button
            variant="ghost"
            onClick={() => {
              if (preview) {
                setPreview(null)
                setFile(null)
              } else {
                onClose()
              }
            }}
          >
            {preview ? 'Choose different file' : 'Cancel'}
          </Button>

          {preview && (
            <Button
              disabled={confirming || preview.accepted_rows === 0}
              onClick={handleConfirm}
              className="gap-2"
            >
              {confirming ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Confirming...
                </>
              ) : (
                <>
                  Confirm Import ({preview.accepted_rows} rows) <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
