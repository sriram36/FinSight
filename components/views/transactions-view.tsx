'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Search,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  FileUp,
  Loader2,
  WalletCards,
  Calendar,
  Sparkles,
  TrendingUp,
  X,
  CreditCard,
  DollarSign
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CategoryBadge } from '@/components/ui/category-badge'
import { api } from '@/lib/api-client'
import { Transaction, TransactionDirection } from '@/lib/types'

const CATEGORIES = [
  'All',
  'Dining',
  'Groceries',
  'Retail',
  'Entertainment',
  'Travel',
  'Transportation',
  'Utilities',
  'Rent/Mortgage',
  'Healthcare',
  'Education',
  'Personal Care',
  'Subscriptions',
  'Insurance',
  'Investment',
  'Gifts/Donations',
  'Miscellaneous',
  'Income',
  'Uncategorized',
]

interface TransactionsViewProps {
  onOpenImport: () => void
}

export function TransactionsView({ onOpenImport }: TransactionsViewProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [totalSpending, setTotalSpending] = useState(0)
  const [totalIncome, setTotalIncome] = useState(0)
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [direction, setDirection] = useState<'all' | 'spending' | 'income'>('all')
  const [page, setPage] = useState(0)
  const limit = 20

  // Manual Add Modal State
  const [showAddModal, setShowAddModal] = useState(false)
  const [addDate, setAddDate] = useState(new Date().toISOString().slice(0, 10))
  const [addDesc, setAddDesc] = useState('')
  const [addAmount, setAddAmount] = useState('')
  const [addDir, setAddDir] = useState<TransactionDirection>('spending')
  const [addCat, setAddCat] = useState('Dining')
  const [adding, setAdding] = useState(false)

  const loadTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.getTransactions({
        user_id: 'default_user',
        search: search.trim() || undefined,
        category: category !== 'All' ? category : undefined,
        direction: direction !== 'all' ? direction : undefined,
        limit,
        offset: page * limit,
      })
      setTransactions(res.items)
      setTotal(res.total)
      setTotalSpending(res.total_spending)
      setTotalIncome(res.total_income)
    } catch (err) {
      console.error('Failed to load transactions', err)
    } finally {
      setLoading(false)
    }
  }, [search, category, direction, page])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  const handleSeed = async () => {
    setSeeding(true)
    try {
      await api.seedDemoData('default_user')
      await loadTransactions()
    } catch (err) {
      console.error('Failed to seed demo data', err)
    } finally {
      setSeeding(false)
    }
  }

  const handleCategoryOverride = async (txId: string, newCategory: string) => {
    try {
      await api.updateTransaction(txId, { category: newCategory })
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === txId
            ? { ...t, category: newCategory, category_source: 'user_override' }
            : t
        )
      )
    } catch (err) {
      console.error('Failed to override category', err)
    }
  }

  const handleDelete = async (txId: string) => {
    if (!confirm('Are you sure you want to delete this transaction from the verified ledger?')) return
    try {
      await api.deleteTransaction(txId)
      loadTransactions()
    } catch (err) {
      console.error('Failed to delete transaction', err)
    }
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addDesc || !addAmount) return
    setAdding(true)
    try {
      await api.createTransaction({
        user_id: 'default_user',
        transaction_date: addDate,
        description: addDesc,
        amount: parseFloat(addAmount),
        direction: addDir,
        category: addCat,
      })
      setShowAddModal(false)
      setAddDesc('')
      setAddAmount('')
      loadTransactions()
    } catch (err) {
      console.error('Failed to add transaction', err)
    } finally {
      setAdding(false)
    }
  }

  const netCashFlow = useMemo(() => {
    return totalIncome - totalSpending
  }, [totalIncome, totalSpending])

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner Stats with Glass Panels & Icon Badges */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Ledger Entries */}
        <div className="glass-panel group relative overflow-hidden rounded-2xl border border-border p-5 shadow-xs transition hover:border-primary/40 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ledger Entries
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10 text-sky-500">
              <WalletCards className="size-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-foreground">{total}</p>
          <p className="mt-1 text-xs text-muted-foreground">Verified transactions on record</p>
        </div>

        {/* Total Spending */}
        <div className="glass-panel group relative overflow-hidden rounded-2xl border border-border p-5 shadow-xs transition hover:border-rose-500/40 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Total Spending
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-500">
              <ArrowDownLeft className="size-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400">
            ₹{totalSpending.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Debits & categorized expenses</p>
        </div>

        {/* Total Income */}
        <div className="glass-panel group relative overflow-hidden rounded-2xl border border-border p-5 shadow-xs transition hover:border-emerald-500/40 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Total Income
            </span>
            <div className="flex size-9 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
              <ArrowUpRight className="size-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
            ₹{totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Credits, salary & refunds</p>
        </div>

        {/* Net Cash Flow */}
        <div className="glass-panel group relative overflow-hidden rounded-2xl border border-border p-5 shadow-xs transition hover:border-indigo-500/40 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Net Cash Flow
            </span>
            <div
              className={`flex size-9 items-center justify-center rounded-xl border ${
                netCashFlow >= 0
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                  : 'border-rose-500/20 bg-rose-500/10 text-rose-500'
              }`}
            >
              <TrendingUp className="size-4" />
            </div>
          </div>
          <p
            className={`mt-3 text-3xl font-extrabold tracking-tight ${
              netCashFlow >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {netCashFlow >= 0 ? '+' : ''}₹
            {netCashFlow.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {netCashFlow >= 0 ? 'Net surplus retained' : 'Deficit in active window'}
          </p>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="glass-panel flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search merchant, ID, or description..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
              className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-8 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="relative">
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value)
                setPage(0)
              }}
              className="h-10 rounded-xl border border-border bg-background px-3.5 pr-8 text-xs font-semibold text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c === 'All' ? 'All Categories' : c}
                </option>
              ))}
            </select>
          </div>

          {/* Direction Filter Segmented Control */}
          <div className="flex rounded-xl border border-border bg-muted/40 p-1 text-xs font-medium">
            <button
              onClick={() => {
                setDirection('all')
                setPage(0)
              }}
              className={`rounded-lg px-3 py-1.5 transition ${
                direction === 'all'
                  ? 'bg-background font-semibold text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => {
                setDirection('spending')
                setPage(0)
              }}
              className={`rounded-lg px-3 py-1.5 transition ${
                direction === 'spending'
                  ? 'bg-background font-semibold text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Expenses
            </button>
            <button
              onClick={() => {
                setDirection('income')
                setPage(0)
              }}
              className={`rounded-lg px-3 py-1.5 transition ${
                direction === 'income'
                  ? 'bg-background font-semibold text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Income
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="gap-1.5 rounded-xl text-xs font-semibold"
          >
            <Plus className="size-3.5 text-primary" /> Add Transaction
          </Button>
          <Button
            size="sm"
            onClick={onOpenImport}
            className="gap-1.5 rounded-xl text-xs font-semibold shadow-xs"
          >
            <FileUp className="size-3.5" /> Import Statement
          </Button>
        </div>
      </div>

      {/* Transactions Table Card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="mt-3 text-sm font-medium">Fetching verified ledger receipts...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-muted/40 text-muted-foreground shadow-xs">
              <FileUp className="size-7" />
            </div>
            <h3 className="mt-4 text-lg font-bold tracking-tight">No ledger transactions found</h3>
            <p className="mt-1.5 max-w-md text-xs leading-relaxed text-muted-foreground">
              {search || category !== 'All' || direction !== 'all'
                ? 'No transactions matched your active query. Try clearing filters or searching another keyword.'
                : 'Your database has zero recorded transactions. Seed the demo dataset or import a CSV statement to unlock deterministic financial analytics.'}
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
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Merchant / Description</th>
                  <th className="px-5 py-3.5">Category (Click to Override)</th>
                  <th className="px-5 py-3.5 text-right">Amount</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((tx) => {
                  const isIncome = tx.direction === 'income'
                  return (
                    <tr
                      key={tx.id}
                      className="group transition hover:bg-muted/30"
                    >
                      {/* Date */}
                      <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap font-mono">
                        {tx.transaction_date}
                      </td>

                      {/* Description & ID */}
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-foreground tracking-tight">
                          {tx.description}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          ID: {tx.id.slice(0, 14)}
                        </div>
                      </td>

                      {/* Category Badge with interactive selector */}
                      <td className="px-5 py-3.5">
                        <CategoryBadge
                          category={tx.category}
                          isOverride={tx.category_source === 'user_override'}
                          categoriesList={CATEGORIES}
                          onSelectCategory={(newCat) => handleCategoryOverride(tx.id, newCat)}
                        />
                      </td>

                      {/* Amount */}
                      <td
                        className={`px-5 py-3.5 text-right font-bold text-sm tracking-tight whitespace-nowrap font-mono ${
                          isIncome
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-foreground'
                        }`}
                      >
                        {isIncome ? '+' : '-'}₹
                        {tx.amount.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-lg text-muted-foreground opacity-60 transition hover:bg-rose-500/10 hover:text-rose-600 hover:opacity-100 dark:hover:bg-rose-500/20"
                          onClick={() => handleDelete(tx.id)}
                          aria-label={`Delete transaction ${tx.description}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {total > limit && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3.5 text-xs text-muted-foreground bg-muted/10">
            <span>
              Showing <strong>{page * limit + 1}</strong> to{' '}
              <strong>{Math.min((page + 1) * limit, total)}</strong> of <strong>{total}</strong> verified records
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                className="size-8 rounded-lg"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="px-2.5 font-semibold text-foreground">
                Page {page + 1} of {Math.ceil(total / limit)}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-8 rounded-lg"
                disabled={(page + 1) * limit >= total}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Next page"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleAddSubmit}
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-add-title"
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 id="manual-add-title" className="text-base font-bold tracking-tight">
                  Add Transaction
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Commit a verified ledger receipt for financial math auditing.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                className="size-8 rounded-lg"
                onClick={() => setShowAddModal(false)}
                aria-label="Close"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="mt-5 flex flex-col gap-4 text-xs">
              <div>
                <label className="mb-1.5 block font-semibold text-foreground">Transaction Date</label>
                <input
                  type="date"
                  value={addDate}
                  onChange={(e) => setAddDate(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block font-semibold text-foreground">Merchant / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Swiggy Gourmet, Netflix, TechCorp Salary"
                  value={addDesc}
                  onChange={(e) => setAddDesc(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block font-semibold text-foreground">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-mono font-bold focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block font-semibold text-foreground">Transaction Type</label>
                  <select
                    value={addDir}
                    onChange={(e) => setAddDir(e.target.value as TransactionDirection)}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                  >
                    <option value="spending">Expense (Debit)</option>
                    <option value="income">Income (Credit)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block font-semibold text-foreground">Category Taxonomy</label>
                <select
                  value={addCat}
                  onChange={(e) => setAddCat(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
                >
                  {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={adding} className="rounded-xl gap-2 font-semibold">
                {adding ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Recording...
                  </>
                ) : (
                  'Commit Transaction'
                )}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
