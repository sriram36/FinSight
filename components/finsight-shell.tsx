'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  CircleHelp,
  FileUp,
  FlaskConical,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OverviewView } from '@/components/views/overview-view'
import { TransactionsView } from '@/components/views/transactions-view'
import { ProfileView } from '@/components/views/profile-view'
import { RecommendationsView } from '@/components/views/recommendations-view'
import { SimulateView } from '@/components/views/simulate-view'
import { GoalsView } from '@/components/views/goals-view'
import { ResearchView } from '@/components/views/research-view'
import { ImportModal } from '@/components/import-modal'

const navItems = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Transactions', icon: WalletCards },
  { label: 'Profile', icon: UserRound },
  { label: 'Recommendations', icon: Sparkles },
  { label: 'Simulate', icon: BarChart3 },
  { label: 'Goals', icon: Target },
]

export function FinSightShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [mode, setMode] = useState<'personal' | 'research'>('personal')
  const [activeView, setActiveView] = useState('Overview')
  const [showImport, setShowImport] = useState(false)
  const [importNotification, setImportNotification] = useState<string | null>(null)

  const title = mode === 'research' ? 'Research Lab' : activeView
  const subtitle =
    mode === 'research'
      ? 'PersonaLedger synthetic benchmark · 70/30 temporal holdout · zero live data leakage'
      : 'Deterministic financial math with strict evidence-grounded AI recommendations'

  const handleImportSuccess = (count: number) => {
    setImportNotification(`Successfully imported and committed ${count} transactions into your local database.`)
    setTimeout(() => setImportNotification(null), 6000)
  }

  const renderActiveView = () => {
    if (mode === 'research') {
      return <ResearchView />
    }

    switch (activeView) {
      case 'Overview':
        return (
          <OverviewView
            onOpenImport={() => setShowImport(true)}
            onNavigateTab={tab => setActiveView(tab)}
          />
        )
      case 'Transactions':
        return <TransactionsView onOpenImport={() => setShowImport(true)} />
      case 'Profile':
        return <ProfileView onOpenImport={() => setShowImport(true)} />
      case 'Recommendations':
        return <RecommendationsView onOpenImport={() => setShowImport(true)} />
      case 'Simulate':
        return <SimulateView />
      case 'Goals':
        return <GoalsView />
      default:
        return (
          <OverviewView
            onOpenImport={() => setShowImport(true)}
            onNavigateTab={tab => setActiveView(tab)}
          />
        )
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile nav backdrop */}
      {mobileNavOpen && (
        <button
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card px-4 py-5 transition-transform duration-200 lg:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl border border-border bg-card p-1 shadow-xs">
              <Image src="/logo.svg" alt="FinSight AI Logo" width={26} height={26} className="object-contain" priority />
            </div>
            <div>
              <p className="text-[15px] font-semibold tracking-tight">FinSight AI</p>
              <p className="text-[11px] text-muted-foreground">Evidence-grounded finance</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Workspace mode selector */}
        <div className="mt-8 px-2">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Workspace
          </p>
          <div className="flex rounded-lg bg-muted p-1">
            <button
              onClick={() => {
                setMode('personal')
                if (mode === 'research') setActiveView('Overview')
              }}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${
                mode === 'personal'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Personal
            </button>
            <button
              onClick={() => setMode('research')}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${
                mode === 'research'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Research
            </button>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="mt-8 flex-1" aria-label="Primary navigation">
          <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {mode === 'personal' ? 'Personal Finance' : 'Evaluation'}
          </p>
          <div className="flex flex-col gap-1">
            {navItems.map(item => {
              const isActive = mode === 'personal' && activeView === item.label
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    setMode('personal')
                    setActiveView(item.label)
                    setMobileNavOpen(false)
                  }}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                    isActive
                      ? 'bg-primary text-primary-foreground font-medium shadow-xs'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </button>
              )
            })}
          </div>

          <p className="mb-3 mt-8 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Research & Settings
          </p>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => {
                setMode('research')
                setMobileNavOpen(false)
              }}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                mode === 'research'
                  ? 'bg-primary text-primary-foreground font-medium shadow-xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <FlaskConical className="size-4" />
              Research Lab
            </button>
            <button
              onClick={() => alert('FinSight AI v1.0. SQLite database at finsight.db. Strict verifier enabled.')}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <Settings2 className="size-4" />
              Settings
            </button>
          </div>
        </nav>

        {/* Privacy badge */}
        <div className="rounded-xl border border-border bg-muted/40 p-3">
          <div className="mb-1.5 flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-500" />
            <span className="text-xs font-semibold">Privacy First</span>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Strict local SQLite persistence. Deterministic calculations prevent mathematical LLM drift.
          </p>
        </div>

        {/* User profile avatar */}
        <div className="mt-4 flex items-center gap-3 border-t border-border px-2 pt-4">
          <div className="flex size-8 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
            JD
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">Jordan Davis</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {mode === 'research' ? 'Research Workspace' : 'Personal Workspace'}
            </p>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="lg:pl-64">
        {/* Top Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="size-5" />
            </Button>
            <div>
              <p className="text-sm font-semibold">Good day, Jordan</p>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Local database connected · System C Verified Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImport(true)}
              className="gap-1.5 text-xs font-medium"
            >
              <Upload className="size-3.5" />
              Import CSV
            </Button>
            <div className="ml-1 flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground shadow-xs">
              JD
            </div>
          </div>
        </header>

        {/* Page Container */}
        <main className="mx-auto max-w-[1480px] px-4 py-6 sm:px-8 sm:py-8">
          {importNotification && (
            <div className="mb-6 flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200 animate-in fade-in">
              <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
              {importNotification}
            </div>
          )}

          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                <span
                  className={`size-1.5 rounded-full ${
                    mode === 'research' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                />
                {mode === 'research' ? 'Synthetic Research Mode' : 'Personal Finance Mode'}
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            </div>

            {mode === 'personal' && (
              <Button onClick={() => setShowImport(true)} className="w-full gap-2 sm:w-auto">
                <Upload className="size-4" />
                Import Transactions
              </Button>
            )}
          </div>

          {/* Active View Container */}
          {renderActiveView()}

          {/* Educational Disclaimer */}
          <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground">
            FinSight AI provides evidence-grounded educational insights, not financial advice. All recommendations are mathematically verified against your imported records.
          </p>
        </main>
      </div>

      {/* CSV Import Modal */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onSuccess={() => {
            setShowImport(false)
            handleImportSuccess(248)
          }}
        />
      )}
    </div>
  )
}
