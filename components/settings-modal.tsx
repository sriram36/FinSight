'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import {
  X,
  Download,
  Trash2,
  ShieldAlert,
  Database,
  CheckCircle2,
  Loader2,
  Server,
  FileSpreadsheet,
  Sun,
  Moon,
  Monitor,
  Palette
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api-client'

interface SettingsModalProps {
  onClose: () => void
  onDataReset?: () => void
  currentTheme?: 'light' | 'dark' | 'system'
  onThemeChange?: (theme: 'light' | 'dark' | 'system') => void
}

export function SettingsModal({ onClose, onDataReset, currentTheme = 'system', onThemeChange }: SettingsModalProps) {
  const [resetting, setResetting] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExportCSV = () => {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://finsight-api-d84z.onrender.com'
    window.open(`${apiBase}/transactions/export?user_id=default_user`, '_blank')
  }

  const handleResetData = async () => {
    if (!confirm('Are you sure you want to clear all transactions, imports, and recommendations for this demo session?')) {
      return
    }
    setResetting(true)
    setError(null)
    try {
      await api.clearAllTransactions('default_user')
      setResetSuccess(true)
      if (onDataReset) {
        onDataReset()
      }
      setTimeout(() => {
        setResetSuccess(false)
        onClose()
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Failed to reset demo data.')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-5">
          <div className="flex items-center gap-3">
            <div className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 p-1 shadow-xs">
              <Image src="/logo.svg" alt="FinSight Logo" width={24} height={24} className="size-6 object-contain" />
            </div>
            <div>
              <h2 id="settings-modal-title" className="text-base font-semibold tracking-tight text-foreground">
                System Settings & Appearance
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Configuration boundaries, theme preferences, and demo sandbox.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close dialog">
            <X className="size-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm">
          {error && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-400">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {resetSuccess && (
            <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              <span>Session transactions and evaluation cache successfully cleared.</span>
            </div>
          )}

          {/* Theme & Visual Appearance */}
          <section className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Palette className="size-3.5 text-primary" /> Appearance & Color Theme
              </h3>
              <span className="text-[11px] text-muted-foreground">
                Active: <span className="font-semibold text-foreground capitalize">{currentTheme}</span>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => onThemeChange && onThemeChange('light')}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-all ${
                  currentTheme === 'light'
                    ? 'border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary'
                    : 'border-border/70 bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                }`}
              >
                <Sun className="size-4 text-amber-500" />
                <span>Light</span>
              </button>

              <button
                type="button"
                onClick={() => onThemeChange && onThemeChange('dark')}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-all ${
                  currentTheme === 'dark'
                    ? 'border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary'
                    : 'border-border/70 bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                }`}
              >
                <Moon className="size-4 text-primary" />
                <span>Dark</span>
              </button>

              <button
                type="button"
                onClick={() => onThemeChange && onThemeChange('system')}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-all ${
                  currentTheme === 'system'
                    ? 'border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary'
                    : 'border-border/70 bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                }`}
              >
                <Monitor className="size-4 text-primary" />
                <span>System Auto</span>
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground/80 leading-normal">
              Theme applies instantly and saves across sessions. You can also toggle it directly from the top navigation bar.
            </p>
          </section>

          {resetSuccess && (
            <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              <span>Session transactions and evaluation cache successfully cleared.</span>
            </div>
          )}

          {/* Privacy & Sandbox Notice */}
          <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 size-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="text-xs">
                <h3 className="font-semibold text-foreground">Single-User Demonstration Mode</h3>
                <p className="mt-1 text-muted-foreground leading-relaxed">
                  This instance operates as a publicly accessible evaluation sandbox scoped to <code>default_user</code>. 
                  Do not import unredacted confidential statements or private banking credentials.
                </p>
              </div>
            </div>
          </section>

          {/* Architecture & Engine Metadata */}
          <section className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Server className="size-3.5" /> Runtime Environment
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-border/60 bg-card p-3">
                <span className="text-muted-foreground">Session Identity:</span>
                <p className="mt-0.5 font-medium text-foreground">default_user (Demo)</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-card p-3">
                <span className="text-muted-foreground">Claim Verifier Margin:</span>
                <p className="mt-0.5 font-medium text-emerald-600 dark:text-emerald-400">±1.0% Relative</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-card p-3">
                <span className="text-muted-foreground">Backend Engine:</span>
                <p className="mt-0.5 font-medium text-foreground">FastAPI + Azure OpenAI</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-card p-3">
                <span className="text-muted-foreground">Database Storage:</span>
                <p className="mt-0.5 font-medium text-foreground">PostgreSQL 15 / SQLite</p>
              </div>
            </div>
          </section>

          {/* Data Actions: Export & Reset */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Database className="size-3.5" /> Data Management
            </h3>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={handleExportCSV}
                className="flex-1 justify-start gap-2 text-xs"
              >
                <Download className="size-4" />
                Export Ledger (CSV)
              </Button>

              <Button
                variant="outline"
                onClick={handleResetData}
                disabled={resetting}
                className="flex-1 justify-start gap-2 text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-200 dark:border-rose-900"
              >
                {resetting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                Reset Demo Transactions
              </Button>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 flex justify-end">
          <Button variant="ghost" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
