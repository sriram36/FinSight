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
  MessageSquareText,
  X,
  Layers,
  Cpu
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OverviewView } from '@/components/views/overview-view'
import { TransactionsView } from '@/components/views/transactions-view'
import { ProfileView } from '@/components/views/profile-view'
import { RecommendationsView } from '@/components/views/recommendations-view'
import { SimulateView } from '@/components/views/simulate-view'
import { GoalsView } from '@/components/views/goals-view'
import { ResearchView } from '@/components/views/research-view'
import { ChatView } from '@/components/views/chat-view'
import { ImportModal } from '@/components/import-modal'
import { SettingsModal } from '@/components/settings-modal'

interface NavItem {
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  badgeVariant?: 'primary' | 'emerald' | 'amber'
}

const navItems: NavItem[] = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Ask FinSight', icon: MessageSquareText, badge: 'gpt-5.6', badgeVariant: 'emerald' },
  { label: 'Verified Insights', icon: Sparkles, badge: 'System C', badgeVariant: 'primary' },
  { label: 'Transactions', icon: WalletCards },
  { label: 'Goals', icon: Target },
  { label: 'Simulate', icon: BarChart3 },
  { label: 'Profile', icon: UserRound },
]

export function FinSightShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [mode, setMode] = useState<'personal' | 'research'>('personal')
  const [activeView, setActiveView] = useState('Overview')
  const [showImport, setShowImport] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [importNotification, setImportNotification] = useState<string | null>(null)

  const title = mode === 'research' ? 'Research Lab' : activeView
  const subtitle =
    mode === 'research'
      ? 'PersonaLedger synthetic benchmark · 70/30 temporal holdout · zero live data leakage'
      : 'Deterministic financial math with strict evidence-grounded AI recommendations'

  const handleImportSuccess = (count: number, result?: any) => {
    const dupCount = result?.duplicate_count ?? 0
    const msg =
      dupCount > 0
        ? `Successfully committed ${count} transaction${count === 1 ? '' : 's'} (${dupCount} duplicate${count === 1 ? '' : 's'} skipped).`
        : `Successfully committed ${count} transaction${count === 1 ? '' : 's'} into verified database.`
    setImportNotification(msg)
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
            onNavigateTab={(tab) => setActiveView(tab)}
          />
        )
      case 'Ask FinSight':
        return <ChatView />
      case 'Verified Insights':
      case 'Recommendations':
        return <RecommendationsView onOpenImport={() => setShowImport(true)} />
      case 'Transactions':
        return <TransactionsView onOpenImport={() => setShowImport(true)} />
      case 'Profile':
        return <ProfileView onOpenImport={() => setShowImport(true)} />
      case 'Simulate':
        return <SimulateView />
      case 'Goals':
        return <GoalsView />
      default:
        return (
          <OverviewView
            onOpenImport={() => setShowImport(true)}
            onNavigateTab={(tab) => setActiveView(tab)}
          />
        )
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
      {/* Mobile nav backdrop */}
      {mobileNavOpen && (
        <button
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card/95 px-4 py-5 backdrop-blur-md transition-transform duration-200 lg:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl border border-border bg-card p-1 shadow-xs">
              <Image
                src="/logo.svg"
                alt="FinSight AI Logo"
                width={26}
                height={26}
                className="object-contain"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-[15px] font-bold tracking-tight">FinSight AI</p>
                <span className="rounded-md bg-primary/10 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium">Evidence-grounded finance</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden size-8 rounded-lg"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Workspace mode selector */}
        <div className="mt-7 px-2">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Workspace
          </p>
          <div className="flex rounded-xl bg-muted/60 p-1 border border-border/60">
            <button
              onClick={() => {
                setMode('personal')
                if (mode === 'research') setActiveView('Overview')
              }}
              className={`flex-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                mode === 'personal'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Personal
            </button>
            <button
              onClick={() => setMode('research')}
              className={`flex-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                mode === 'research'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Research Lab
            </button>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="mt-6 flex-1 space-y-6" aria-label="Primary navigation">
          <div>
            <p className="mb-2.5 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              {mode === 'personal' ? 'Financial Intelligence' : 'Benchmark Evaluation'}
            </p>
            <div className="flex flex-col gap-1">
              {navItems.map((item) => {
                const isActive = mode === 'personal' && activeView === item.label
                return (
                  <button
                    key={item.label}
                    onClick={() => {
                      setMode('personal')
                      setActiveView(item.label)
                      setMobileNavOpen(false)
                    }}
                    className={`group relative flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition ${
                      isActive
                        ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                        : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="size-4 shrink-0" />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && !isActive && (
                      <span
                        className={`rounded-full px-2 py-0.2 text-[10px] font-bold ${
                          item.badgeVariant === 'emerald'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'bg-primary/15 text-primary'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="mb-2.5 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Research & Controls
            </p>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => {
                  setMode('research')
                  setMobileNavOpen(false)
                }}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  mode === 'research'
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                }`}
              >
                <FlaskConical className="size-4 shrink-0" />
                <span>Research Lab</span>
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted/70 hover:text-foreground"
              >
                <Settings2 className="size-4 shrink-0" />
                <span>Settings & Sandbox</span>
              </button>
            </div>
          </div>
        </nav>

        {/* Privacy badge */}
        <div className="rounded-xl border border-border/80 bg-muted/40 p-3.5">
          <div className="mb-1.5 flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-500" />
            <span className="text-xs font-bold tracking-tight">Zero-Leakage Persistence</span>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Strict local SQLite / PostgreSQL persistence. Deterministic Python math stops LLM hallucinations.
          </p>
        </div>

        {/* User profile avatar */}
        <div className="mt-4 flex items-center gap-3 border-t border-border px-2 pt-4">
          <div className="relative">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/20 text-xs font-bold text-primary">
              JD
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card bg-emerald-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold">Jordan Davis</p>
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
              className="lg:hidden size-8 rounded-lg"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="size-5" />
            </Button>
            <div>
              <p className="text-sm font-bold tracking-tight">Good day, Jordan</p>
              <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
                <span className="inline-flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <code className="text-[11px] font-mono font-medium">gpt-5.6-luna</code> online
                </span>
                <span>·</span>
                <span>Claim Verifier Active (±1.0%)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImport(true)}
              className="gap-1.5 rounded-xl text-xs font-semibold"
            >
              <Upload className="size-3.5 text-primary" />
              Import CSV
            </Button>
            <div className="ml-1 flex size-8 items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-xs">
              JD
            </div>
          </div>
        </header>

        {/* Page Container */}
        <main className="mx-auto max-w-[1480px] px-4 py-6 sm:px-8 sm:py-8">
          {importNotification && (
            <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200 animate-in fade-in">
              <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
              {importNotification}
            </div>
          )}

          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground shadow-2xs">
                <span
                  className={`size-1.5 rounded-full ${
                    mode === 'research' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                />
                {mode === 'research' ? 'Synthetic Research Mode' : 'Personal Finance Mode'}
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            </div>

            {mode === 'personal' && (
              <Button
                onClick={() => setShowImport(true)}
                className="w-full gap-2 sm:w-auto rounded-xl font-semibold shadow-xs"
              >
                <Upload className="size-4" />
                Import Transactions
              </Button>
            )}
          </div>

          {/* Active View Container */}
          {renderActiveView()}

          {/* Educational Disclaimer */}
          <p className="mt-10 text-center text-[11px] leading-relaxed text-muted-foreground border-t border-border/40 pt-6">
            FinSight AI provides evidence-grounded financial intelligence and mathematical analysis, not regulated financial advisory. All recommendations and metrics reconcile directly with your imported ledger receipts.
          </p>
        </main>
      </div>

      {/* CSV Import Modal */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onSuccess={(count, result) => {
            setShowImport(false)
            handleImportSuccess(count || 0, result)
          }}
        />
      )}

      {/* Settings & Sandbox Modal */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onDataReset={() => {
            setActiveView('Overview')
          }}
        />
      )}
    </div>
  )
}
