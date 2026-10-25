'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  Utensils,
  ShoppingBag,
  Home,
  Zap,
  Car,
  Repeat,
  TrendingUp,
  Film,
  HeartPulse,
  GraduationCap,
  Sparkles,
  CreditCard,
  Gift,
  Shield,
  Layers,
  HelpCircle,
  ChevronDown
} from 'lucide-react'

export interface CategoryMeta {
  label: string
  icon: React.ComponentType<{ className?: string }>
  badgeClasses: string
  dotClass: string
}

export const CATEGORY_META_MAP: Record<string, CategoryMeta> = {
  Dining: {
    label: 'Dining',
    icon: Utensils,
    badgeClasses: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    dotClass: 'bg-amber-500',
  },
  'Dining Out': {
    label: 'Dining Out',
    icon: Utensils,
    badgeClasses: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    dotClass: 'bg-amber-500',
  },
  'Coffee & Snacks': {
    label: 'Coffee & Snacks',
    icon: Utensils,
    badgeClasses: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    dotClass: 'bg-amber-500',
  },
  Groceries: {
    label: 'Groceries',
    icon: ShoppingBag,
    badgeClasses: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    dotClass: 'bg-emerald-500',
  },
  'Rent/Mortgage': {
    label: 'Rent / Mortgage',
    icon: Home,
    badgeClasses: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
    dotClass: 'bg-blue-500',
  },
  Housing: {
    label: 'Housing',
    icon: Home,
    badgeClasses: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
    dotClass: 'bg-blue-500',
  },
  Utilities: {
    label: 'Utilities',
    icon: Zap,
    badgeClasses: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20',
    dotClass: 'bg-cyan-500',
  },
  Transportation: {
    label: 'Transportation',
    icon: Car,
    badgeClasses: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20',
    dotClass: 'bg-orange-500',
  },
  Travel: {
    label: 'Travel',
    icon: Car,
    badgeClasses: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20',
    dotClass: 'bg-orange-500',
  },
  Subscriptions: {
    label: 'Subscriptions',
    icon: Repeat,
    badgeClasses: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
    dotClass: 'bg-purple-500',
  },
  Income: {
    label: 'Income',
    icon: TrendingUp,
    badgeClasses: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    dotClass: 'bg-emerald-500',
  },
  Entertainment: {
    label: 'Entertainment',
    icon: Film,
    badgeClasses: 'bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/20',
    dotClass: 'bg-pink-500',
  },
  Retail: {
    label: 'Retail',
    icon: ShoppingBag,
    badgeClasses: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20',
    dotClass: 'bg-indigo-500',
  },
  Shopping: {
    label: 'Shopping',
    icon: ShoppingBag,
    badgeClasses: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20',
    dotClass: 'bg-indigo-500',
  },
  Healthcare: {
    label: 'Healthcare',
    icon: HeartPulse,
    badgeClasses: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
    dotClass: 'bg-rose-500',
  },
  Education: {
    label: 'Education',
    icon: GraduationCap,
    badgeClasses: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
    dotClass: 'bg-sky-500',
  },
  'Personal Care': {
    label: 'Personal Care',
    icon: Sparkles,
    badgeClasses: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20',
    dotClass: 'bg-teal-500',
  },
  Insurance: {
    label: 'Insurance',
    icon: Shield,
    badgeClasses: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
    dotClass: 'bg-slate-500',
  },
  Investment: {
    label: 'Investment',
    icon: TrendingUp,
    badgeClasses: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    dotClass: 'bg-emerald-500',
  },
  'Gifts/Donations': {
    label: 'Gifts & Donations',
    icon: Gift,
    badgeClasses: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20',
    dotClass: 'bg-violet-500',
  },
  Miscellaneous: {
    label: 'Miscellaneous',
    icon: Layers,
    badgeClasses: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20',
    dotClass: 'bg-zinc-500',
  },
  Uncategorized: {
    label: 'Uncategorized',
    icon: HelpCircle,
    badgeClasses: 'bg-muted text-muted-foreground border-border',
    dotClass: 'bg-muted-foreground',
  },
}

export function getCategoryMeta(categoryName: string): CategoryMeta {
  if (CATEGORY_META_MAP[categoryName]) {
    return CATEGORY_META_MAP[categoryName]
  }
  return {
    label: categoryName,
    icon: CreditCard,
    badgeClasses: 'bg-muted text-muted-foreground border-border',
    dotClass: 'bg-muted-foreground',
  }
}

interface CategoryBadgeProps {
  category: string
  isOverride?: boolean
  showIcon?: boolean
  onSelectCategory?: (newCategory: string) => void
  categoriesList?: string[]
  className?: string
}

export function CategoryBadge({
  category,
  isOverride = false,
  showIcon = true,
  onSelectCategory,
  categoriesList,
  className = '',
}: CategoryBadgeProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const meta = getCategoryMeta(category)
  const Icon = meta.icon

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  if (!onSelectCategory || !categoriesList) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-tight ${meta.badgeClasses} ${className}`}
      >
        {showIcon && <Icon className="size-3 shrink-0" />}
        <span>{category}</span>
        {isOverride && (
          <span className="size-1.5 rounded-full bg-primary" title="User overridden" />
        )}
      </span>
    )
  }

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-tight transition hover:opacity-80 focus:outline-none focus:ring-1 focus:ring-primary ${meta.badgeClasses} ${className}`}
      >
        {showIcon && <Icon className="size-3 shrink-0" />}
        <span>{category}</span>
        {isOverride && (
          <span className="size-1.5 rounded-full bg-primary" title="User overridden" />
        )}
        <ChevronDown className="size-3 shrink-0 opacity-60" />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1 max-h-56 w-48 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95">
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50">
            Select Category
          </div>
          {categoriesList
            .filter((c) => c !== 'All')
            .map((cat) => {
              const itemMeta = getCategoryMeta(cat)
              const ItemIcon = itemMeta.icon
              const isSelected = cat === category
              return (
                <button
                  key={cat}
                  onClick={() => {
                    onSelectCategory(cat)
                    setOpen(false)
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition ${
                    isSelected
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <ItemIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{cat}</span>
                </button>
              )
            })}
        </div>
      )}
    </div>
  )
}
