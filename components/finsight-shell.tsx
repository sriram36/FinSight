'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  FileText,
  FileUp,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  PieChart,
  Repeat,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
  WalletCards,
  X,
  Zap,
  ArrowUpRight,
  Sun,
  Moon,
  Monitor
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
import { BudgetsView } from '@/components/views/budgets-view'
import { RecurringView } from '@/components/views/recurring-view'
import { AnomaliesView } from '@/components/views/anomalies-view'
import { ForecastView } from '@/components/views/forecast-view'
import { ReviewView } from '@/components/views/review-view'
import { ImportModal } from '@/components/import-modal'
import { SettingsModal } from '@/components/settings-modal'
import { AuthModal } from '@/components/auth-modal'
import { AuthUser } from '@/lib/types'

interface NavItem {
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  badgeClass?: string
  description?: string
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    title: 'Daily Finance',
    items: [
      { label: 'Overview', icon: LayoutDashboard, description: 'Financial snapshot' },
      { label: 'Transactions', icon: WalletCards, description: 'Full ledger history' },
      { label: 'Budgets', icon: PieChart, description: 'Spending limits' },
      { label: 'Subscriptions', icon: Repeat, description: 'Recurring payments' },
    ],
  },
  {
    title: 'AI Intelligence',
    items: [
      {
        label: 'Ask FinSight',
        icon: MessageSquareText,
        badge: 'AI',
        badgeClass: 'badge-teal',
        description: 'Copilot chat'
      },
      {
        label: 'Verified Insights',
        icon: Sparkles,
        badge: 'System C',
        badgeClass: 'badge-violet',
        description: 'Evidence-grounded'
      },
      {
        label: 'Unusual Spending',
        icon: AlertTriangle,
        badge: 'Live',
        badgeClass: 'badge-amber',
        description: 'Anomaly detection'
      },
      { label: 'Cash Flow Forecast', icon: TrendingUp, description: 'Future projections' },
    ],
  },
  {
    title: 'Planning',
    items: [
      { label: 'Goals', icon: Target, description: 'Savings milestones' },
      { label: 'Monthly Review', icon: FileText, description: 'Period summary' },
      { label: 'Simulate', icon: BarChart3, description: 'Scenario modelling' },
    ],
  },
]

export function FinSightShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [mode, setMode] = useState<'personal' | 'research'>('personal')
  const [activeView, setActiveView] = useState('Overview')
  const [showImport, setShowImport] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [importNotification, setImportNotification] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<AuthUser>({
    id: 'default_user',
    name: 'Jordan Davis',
    email: 'jordan@finsight.local',
    token: 'tok_demo_jordan_sandbox',
    is_demo: true,
  })
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')

  const applyTheme = (newTheme: 'light' | 'dark' | 'system') => {
    if (typeof window === 'undefined') return
    const root = document.documentElement
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = newTheme === 'dark' || (newTheme === 'system' && prefersDark)
    if (isDark) {
      root.classList.add('dark')
      root.classList.remove('light')
      root.setAttribute('data-theme', 'dark')
      root.style.colorScheme = 'dark'
    } else {
      root.classList.remove('dark')
      root.classList.add('light')
      root.setAttribute('data-theme', 'light')
      root.style.colorScheme = 'light'
    }
  }

  const setThemeMode = (mode: 'light' | 'dark' | 'system') => {
    setTheme(mode)
    if (typeof window !== 'undefined') {
      localStorage.setItem('finsight_theme', mode)
    }
    applyTheme(mode)
  }

  const toggleTheme = () => {
    const isCurrentlyDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
    const nextMode: 'light' | 'dark' = isCurrentlyDark ? 'light' : 'dark'
    setThemeMode(nextMode)
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('finsight_user')
      if (savedUser) {
        try {
          setCurrentUser(JSON.parse(savedUser))
        } catch {
          // ignore
        }
      }

      const savedTheme = (localStorage.getItem('finsight_theme') as 'light' | 'dark' | 'system') || 'system'
      setTheme(savedTheme)
      applyTheme(savedTheme)

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => {
        const curTheme = localStorage.getItem('finsight_theme') || 'system'
        if (curTheme === 'system') {
          applyTheme('system')
        }
      }
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  const title = mode === 'research' ? 'Research Lab' : activeView
  const subtitle =
    mode === 'research'
      ? 'PersonaLedger synthetic benchmark · 70/30 temporal holdout · zero live data leakage'
      : 'Deterministic financial math with strict evidence-grounded AI recommendations'

  const handleImportSuccess = (count: number, result?: any) => {
    const dupCount = result?.duplicate_count ?? 0
    const msg =
      dupCount > 0
        ? `Successfully committed ${count} transaction${count === 1 ? '' : 's'} (${dupCount} duplicate${dupCount === 1 ? '' : 's'} skipped).`
        : `Successfully committed ${count} transaction${count === 1 ? '' : 's'} into verified database.`
    setImportNotification(msg)
    setTimeout(() => setImportNotification(null), 6000)
  }

  const renderActiveView = () => {
    if (mode === 'research') return <ResearchView />
    switch (activeView) {
      case 'Overview':
        return <OverviewView onOpenImport={() => setShowImport(true)} onNavigateTab={(tab) => setActiveView(tab)} />
      case 'Ask FinSight':
        return <ChatView />
      case 'Verified Insights':
      case 'Recommendations':
        return <RecommendationsView onOpenImport={() => setShowImport(true)} />
      case 'Unusual Spending':
        return <AnomaliesView />
      case 'Cash Flow Forecast':
        return <ForecastView />
      case 'Monthly Review':
        return <ReviewView />
      case 'Budgets':
        return <BudgetsView />
      case 'Subscriptions':
      case 'Recurring':
        return <RecurringView />
      case 'Transactions':
        return <TransactionsView onOpenImport={() => setShowImport(true)} />
      case 'Profile':
        return <ProfileView onOpenImport={() => setShowImport(true)} />
      case 'Simulate':
        return <SimulateView />
      case 'Goals':
        return <GoalsView />
      default:
        return <OverviewView onOpenImport={() => setShowImport(true)} onNavigateTab={(tab) => setActiveView(tab)} />
    }
  }

  const initials = currentUser.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  return (
    <div className="min-h-screen bg-background text-foreground antialiased gradient-mesh selection:bg-primary/20 selection:text-primary">
      {/* Mobile overlay */}
      {mobileNavOpen && (
        <button
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[268px] flex-col border-r border-border/60 glass-sidebar px-4 py-5 transition-transform duration-300 ease-in-out lg:translate-x-0 scrollbar-thin overflow-y-auto ${
          mobileNavOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-1 mb-6">
          <div className="flex items-center gap-3">
            <div className="relative flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-sm p-1.5">
              <Image src="/logo.svg" alt="FinSight AI Logo" width={28} height={28} className="size-7 object-contain drop-shadow-xs" priority />
              <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 border-2 border-sidebar animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-[15px] font-bold tracking-tight text-foreground">FinSight AI</p>
                <span className="badge-teal rounded-md px-1.5 py-px text-[10px] font-bold">v1.2</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight">Evidence-grounded finance</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden size-8 rounded-xl text-muted-foreground hover:text-foreground"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Mode toggle */}
        <div className="mb-5 px-1">
          <p className="section-label mb-2">Workspace</p>
          <div className="flex rounded-xl bg-muted/50 p-1 border border-border/60 gap-0.5">
            <button
              onClick={() => { setMode('personal'); if (mode === 'research') setActiveView('Overview') }}
              className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-all duration-150 ${
                mode === 'personal'
                  ? 'bg-background text-foreground shadow-sm border border-border/50'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Personal
            </button>
            <button
              onClick={() => setMode('research')}
              className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-all duration-150 ${
                mode === 'research'
                  ? 'bg-background text-foreground shadow-sm border border-border/50'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Research Lab
            </button>
          </div>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 space-y-5" aria-label="Primary navigation">
          {mode === 'personal' ? (
            navGroups.map((group) => (
              <div key={group.title}>
                <p className="section-label mb-2 px-1">{group.title}</p>
                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const isActive = activeView === item.label
                    return (
                      <button
                        key={item.label}
                        onClick={() => { setActiveView(item.label); setMobileNavOpen(false) }}
                        className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-all duration-150 ${
                          isActive
                            ? 'bg-primary text-primary-foreground font-semibold nav-active-glow'
                            : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`flex size-7 items-center justify-center rounded-lg transition-all ${
                            isActive
                              ? 'bg-white/15'
                              : 'bg-muted/40 group-hover:bg-muted'
                          }`}>
                            <item.icon className="size-3.5 shrink-0" />
                          </div>
                          <div className="flex flex-col items-start">
                            <span className="text-[13px] font-medium leading-tight">{item.label}</span>
                            {item.description && !isActive && (
                              <span className="text-[10px] text-muted-foreground/70 leading-tight">{item.description}</span>
                            )}
                          </div>
                        </div>
                        {item.badge && !isActive && (
                          <span className={`rounded-full px-2 py-px text-[10px] font-bold ${item.badgeClass ?? 'badge-teal'}`}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          ) : (
            <div>
              <p className="section-label mb-2 px-1">Benchmark</p>
              <button
                onClick={() => { setMode('research'); setMobileNavOpen(false) }}
                className="flex w-full items-center gap-3 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground nav-active-glow"
              >
                <div className="flex size-7 items-center justify-center rounded-lg bg-white/15">
                  <FlaskConical className="size-3.5 shrink-0" />
                </div>
                <span>PersonaLedger</span>
              </button>
            </div>
          )}

          {/* Settings group */}
          <div>
            <p className="section-label mb-2 px-1">System</p>
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-muted-foreground hover:bg-muted/70 hover:text-foreground transition"
              >
                <div className="flex size-7 items-center justify-center rounded-lg bg-muted/40">
                  <Settings2 className="size-3.5 shrink-0" />
                </div>
                <span className="text-[13px] font-medium">Sandbox & Database</span>
              </button>
            </div>
          </div>
        </nav>

        {/* Security pill */}
        <div className="mt-4 rounded-2xl border border-border/60 bg-muted/30 p-3.5 backdrop-blur-sm">
          <div className="flex items-start gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 shrink-0 mt-0.5">
              <ShieldCheck className="size-3.5 text-emerald-500" />
            </div>
            <div>
              <p className="text-[12px] font-bold text-foreground mb-0.5">Isolated Ledger Storage</p>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Strict SQLite / PostgreSQL persistence. Deterministic Python math stops LLM drift.
              </p>
            </div>
          </div>
        </div>

        {/* User profile */}
        <div className="mt-3 flex items-center justify-between border-t border-border/50 px-1 pt-3">
          <div
            onClick={() => setShowAuthModal(true)}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-85 transition flex-1"
          >
            <div className="relative shrink-0">
              <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-primary/10 text-xs font-bold text-primary border border-primary/20">
                {initials}
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-sidebar ${
                currentUser.is_demo ? 'bg-amber-500' : 'bg-emerald-500'
              }`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold">{currentUser.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {currentUser.is_demo ? '● Demo Sandbox' : '● Authenticated'}
              </p>
            </div>
          </div>
          {!currentUser.is_demo ? (
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('finsight_token')
                  localStorage.removeItem('finsight_user')
                }
                setCurrentUser({ id: 'default_user', name: 'Jordan Davis', email: 'jordan@finsight.local', token: 'tok_demo_jordan_sandbox', is_demo: true })
              }}
              title="Sign out"
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition"
            >
              <LogOut className="size-3.5" />
            </button>
          ) : (
            <div onClick={() => setShowAuthModal(true)} className="cursor-pointer p-1.5 text-muted-foreground hover:text-foreground transition">
              <ChevronDown className="size-3.5" />
            </div>
          )}
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────── */}
      <div className="lg:pl-[268px] flex flex-col min-h-screen">

        {/* Top header */}
        <header className="sticky top-0 z-20 flex h-[62px] items-center justify-between border-b border-border/60 bg-background/80 px-5 backdrop-blur-xl sm:px-8 shadow-sm shadow-border/20">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden size-8 rounded-xl"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="size-4" />
            </Button>

            <div>
              <p className="text-[14px] font-bold text-foreground leading-tight">
                Welcome back, <span className="text-primary">{currentUser.name.split(' ')[0]}</span>
              </p>
              <div className="hidden items-center gap-2 text-[11px] text-muted-foreground sm:flex">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <code className="font-mono text-[10px] font-medium">gpt-5.6-luna</code> online
                </span>
                <span className="text-muted-foreground/40">·</span>
                <span>Claim Verifier ±1.0%</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Switcher Button */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
              aria-label="Toggle color theme"
              className="flex items-center gap-1.5 rounded-xl border border-border/70 bg-card/80 px-2.5 py-1 text-xs font-semibold hover:border-primary/30 hover:bg-primary/5 transition-all duration-150 shadow-xs h-8 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="size-3.5 text-amber-400" />
                  <span className="text-[11px] font-medium text-foreground">Light</span>
                </>
              ) : (
                <>
                  <Moon className="size-3.5 text-primary" />
                  <span className="text-[11px] font-medium text-foreground">Dark</span>
                </>
              )}
            </button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImport(true)}
              className="gap-1.5 rounded-xl text-xs font-semibold border-border/70 shadow-xs h-8 px-3"
            >
              <Upload className="size-3.5 text-primary" />
              <span className="hidden sm:inline">Import CSV</span>
            </Button>

            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-2 rounded-xl border border-border/70 bg-card/80 px-2.5 py-1.5 text-xs font-semibold hover:border-primary/30 hover:bg-primary/5 transition-all duration-150 shadow-xs"
            >
              <div className="flex size-6 items-center justify-center rounded-lg bg-primary/15 text-[10px] font-bold text-primary">
                {initials}
              </div>
              <span className="hidden sm:inline text-[12px] font-medium text-muted-foreground">
                {currentUser.is_demo ? 'Demo' : 'Account'}
              </span>
            </button>
          </div>
        </header>

        {/* Page body */}
        <main className="flex-1 mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10 space-y-8">

          {/* Import success banner */}
          {importNotification && (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/8 px-5 py-3.5 text-sm text-emerald-800 dark:text-emerald-200 animate-slide-up glow-emerald">
              <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/25 shrink-0">
                <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              {importNotification}
            </div>
          )}

          {/* Page header */}
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end animate-slide-up">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-xs">
                <span className={`size-1.5 rounded-full ${mode === 'research' ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`} />
                {mode === 'research' ? 'Synthetic Research Mode' : 'Personal Finance Mode'}
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">{title}</h1>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed max-w-2xl">{subtitle}</p>
            </div>

            {mode === 'personal' && (
              <Button
                onClick={() => setShowImport(true)}
                className="w-full gap-2 sm:w-auto rounded-xl font-semibold shadow-sm shrink-0 glow-subtle"
              >
                <Upload className="size-4" />
                Import Transactions
              </Button>
            )}
          </div>

          {/* Active view */}
          <div className="animate-slide-up">{renderActiveView()}</div>

          {/* Footer */}
          <p className="text-center text-[11px] leading-relaxed text-muted-foreground/60 border-t border-border/30 pt-8 mt-8">
            FinSight AI provides evidence-grounded financial intelligence, not regulated financial advisory. All recommendations reconcile directly with your imported ledger.
          </p>
        </main>
      </div>

      {/* Modals */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onSuccess={(count, result) => { setShowImport(false); handleImportSuccess(count || 0, result) }}
        />
      )}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onDataReset={() => setActiveView('Overview')}
          currentTheme={theme}
          onThemeChange={setThemeMode}
        />
      )}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={(user) => { setCurrentUser(user); setShowAuthModal(false) }}
        />
      )}
    </div>
  )
}
