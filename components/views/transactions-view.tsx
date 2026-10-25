'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Search,
  Filter,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  FileUp,
  Loader2,
  Check,
  Edit2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api-client'
import { Transaction, TransactionDirection } from '@/lib/types'

const CATEGORIES = [
  'All',
  'Groceries',
  'Dining',
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

  const handleCategoryOverride = async (txId: string, newCategory: string) => {
    try {
      await api.updateTransaction(txId, { category: newCategory })
      setTransactions((prev) =>
        prev.map((t) => (t.id === txId ? { ...t, category: newCategory, category_source: 'user_override' } : t))
      )
    } catch (err) {
      console.error('Failed to override category', err)
    }
  }

  const handleDelete = async (txId: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return
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

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Total Transactions</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{total}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-rose-600 dark:text-rose-400">Total Spending</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
            ₹{totalSpending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Total Income</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            ₹{totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search merchant or category..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(0)
              }}
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              setPage(0)
            }}
            className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-medium text-muted-foreground focus:border-primary focus:outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Direction Filter */}
          <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs font-medium">
            <button
              onClick={() => {
                setDirection('all')
                setPage(0)
              }}
              className={`rounded-md px-2.5 py-1 ${
                direction === 'all' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              All
            </button>
            <button
              onClick={() => {
                setDirection('spending')
                setPage(0)
              }}
              className={`rounded-md px-2.5 py-1 ${
                direction === 'spending' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              Expenses
            </button>
            <button
              onClick={() => {
                setDirection('income')
                setPage(0)
              }}
              className={`rounded-md px-2.5 py-1 ${
                direction === 'income' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              Income
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)} className="gap-1.5">
            <Plus className="size-3.5" /> Add Manual
          </Button>
          <Button size="sm" onClick={onOpenImport} className="gap-1.5">
            <FileUp className="size-3.5" /> Import CSV
          </Button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="mt-3 text-sm">Loading transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <FileUp className="size-6" />
            </div>
            <h3 className="mt-4 text-base font-semibold">No transactions found</h3>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              {search || category !== 'All' || direction !== 'all'
                ? 'Try adjusting your filters or search terms.'
                : 'Import a CSV statement or add your first transaction above to get started.'}
            </p>
            <Button size="sm" onClick={onOpenImport} className="mt-5 gap-2">
              <FileUp className="size-4" /> Import CSV
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Merchant / Description</th>
                  <th className="px-5 py-3 font-medium">Category (Click to Override)</th>
                  <th className="px-5 py-3 text-right font-medium">Amount</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="transition hover:bg-muted/20">
                    <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                      {tx.transaction_date}
                    </td>
                    <td className="px-5 py-3.5 font-medium">{tx.description}</td>
                    <td className="px-5 py-3.5">
                      <select
                        value={tx.category}
                        onChange={(e) => handleCategoryOverride(tx.id, e.target.value)}
                        className={`rounded-md border border-border bg-background px-2 py-1 text-xs font-medium focus:border-primary focus:outline-none ${
                          tx.category_source === 'user_override'
                            ? 'border-primary/50 text-primary'
                            : 'text-foreground'
                        }`}
                        title={
                          tx.category_source === 'user_override'
                            ? 'User-overridden category'
                            : 'Auto-categorized'
                        }
                      >
                        {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td
                      className={`px-5 py-3.5 text-right font-semibold whitespace-nowrap ${
                        tx.direction === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-foreground'
                      }`}
                    >
                      {tx.direction === 'income' ? '+' : '-'}₹
                      {tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-rose-600"
                        onClick={() => handleDelete(tx.id)}
                        aria-label="Delete transaction"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {total > limit && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
            <span>
              Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total} records
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <span className="px-2 font-medium">Page {page + 1}</span>
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                disabled={(page + 1) * limit >= total}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="size-3.5" />
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
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 id="manual-add-title" className="font-semibold">
                Add Transaction
              </h3>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={() => setShowAddModal(false)}
                aria-label="Close"
              >
                ✕
              </Button>
            </div>
            <div className="mt-4 flex flex-col gap-3 text-xs">
              <div>
                <label className="mb-1 block font-medium text-muted-foreground">Date</label>
                <input
                  type="date"
                  value={addDate}
                  onChange={(e) => setAddDate(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block font-medium text-muted-foreground">Merchant / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Swiggy, Uber, Rent"
                  value={addDesc}
                  onChange={(e) => setAddDesc(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium text-muted-foreground">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-muted-foreground">Type</label>
                  <select
                    value={addDir}
                    onChange={(e) => setAddDir(e.target.value as TransactionDirection)}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
                  >
                    <option value="spending">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block font-medium text-muted-foreground">Category</label>
                <select
                  value={addCat}
                  onChange={(e) => setAddCat(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
                >
                  {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={adding}>
                {adding ? 'Saving...' : 'Add Transaction'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
