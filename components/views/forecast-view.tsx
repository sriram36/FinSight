'use client'

import React, { useState, useEffect } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Info,
  RefreshCw,
  Wallet,
  Sparkles,
  Layers
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api-client'
import { ForecastResponse } from '@/lib/types'

export function ForecastView() {
  const [horizonDays, setHorizonDays] = useState<7 | 30 | 90>(30)
  const [startingBalanceInput, setStartingBalanceInput] = useState<string>('')
  const [forecast, setForecast] = useState<ForecastResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const loadForecast = async (horizon: number, startingBal?: number) => {
    try {
      setLoading(true)
      const data = await api.getForecast(horizon, startingBal, 'default_user')
      setForecast(data)
    } catch (err) {
      console.error('Failed to load forecast:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const bal = startingBalanceInput.trim() ? parseFloat(startingBalanceInput) : undefined
    loadForecast(horizonDays, isNaN(bal as number) ? undefined : bal)
  }, [horizonDays])

  const handleApplyStartingBalance = (e: React.FormEvent) => {
    e.preventDefault()
    const bal = startingBalanceInput.trim() ? parseFloat(startingBalanceInput) : undefined
    loadForecast(horizonDays, isNaN(bal as number) ? undefined : bal)
  }

  const isNetPositive = (forecast?.projected_net_cash_flow ?? 0) >= 0

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 rounded-2xl border border-border/80 bg-card/60 p-6 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="size-5 text-primary" />
            <h2 className="text-xl font-bold tracking-tight">Deterministic Cash-Flow Forecasting</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground max-w-2xl leading-relaxed">
            Forward-looking liquidity modeling grounded strictly in confirmed upcoming obligations and your observed 60-day burn rate. We never invent bank balances—view your projected net trajectory or enter an optional starting balance below.
          </p>
        </div>

        {/* Horizon selector buttons */}
        <div className="flex items-center gap-1.5 rounded-xl bg-muted/60 p-1 border border-border/60 shrink-0 self-start lg:self-auto">
          {[7, 30, 90].map(days => (
            <button
              key={days}
              onClick={() => setHorizonDays(days as 7 | 30 | 90)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                horizonDays === days
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {days} Days
            </button>
          ))}
        </div>
      </div>

      {/* Optional Starting Balance Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border/70 bg-card/40 px-6 py-4">
        <div className="flex items-center gap-3">
          <Wallet className="size-5 text-muted-foreground" />
          <div>
            <p className="text-xs font-bold">Optional: Current Account Balance</p>
            <p className="text-[11px] text-muted-foreground">
              Provide your real opening bank balance to project closing balances.
            </p>
          </div>
        </div>

        <form onSubmit={handleApplyStartingBalance} className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
              ₹
            </span>
            <input
              type="number"
              placeholder="e.g. 25000"
              value={startingBalanceInput}
              onChange={e => setStartingBalanceInput(e.target.value)}
              className="w-36 rounded-xl border border-border bg-background py-1.5 pl-7 pr-3 text-xs font-mono focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>
          <Button type="submit" size="sm" variant="outline" className="rounded-xl text-xs font-semibold">
            Apply
          </Button>
          {startingBalanceInput && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setStartingBalanceInput('')
                loadForecast(horizonDays, undefined)
              }}
              className="rounded-xl text-xs text-muted-foreground"
            >
              Clear
            </Button>
          )}
        </form>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Projected Net Trajectory</p>
          <p
            className={`mt-2 text-2xl font-black tracking-tight ${
              isNetPositive ? 'text-emerald-500' : 'text-rose-500'
            }`}
          >
            {isNetPositive ? '+' : ''}₹
            {(forecast?.projected_net_cash_flow ?? 0).toLocaleString('en-IN', {
              minimumFractionDigits: 2
            })}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Over the next {horizonDays} days
          </p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Confirmed Obligations</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-amber-500">
            ₹
            {(forecast?.upcoming_obligations_total ?? 0).toLocaleString('en-IN', {
              minimumFractionDigits: 2
            })}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            From verified recurring commitments
          </p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Projected Variable Outflow</p>
          <p className="mt-2 text-2xl font-black tracking-tight">
            ₹
            {(forecast?.projected_variable_spend ?? 0).toLocaleString('en-IN', {
              minimumFractionDigits: 2
            })}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            At daily pace: ₹{(forecast?.daily_burn_rate ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}/day
          </p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
          <p className="text-xs font-medium text-muted-foreground">Projected Closing Balance</p>
          <p className="mt-2 text-2xl font-black tracking-tight">
            {forecast?.projected_closing_balance !== null && forecast?.projected_closing_balance !== undefined ? (
              `₹${forecast.projected_closing_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
            ) : (
              <span className="text-xs font-normal text-muted-foreground">Set starting balance above</span>
            )}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Confidence score: {Math.round((forecast?.confidence ?? 0) * 100)}%
          </p>
        </div>
      </div>

      {/* Upcoming Events Schedule & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-border/80 bg-card p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold tracking-tight">Anticipated Cash-Flow Schedule</h3>
              <p className="text-xs text-muted-foreground">
                Confirmed commitments and projected inflows in the next {horizonDays} days
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
              {forecast?.events.length ?? 0} scheduled events
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              <RefreshCw className="mx-auto size-5 animate-spin mb-2 opacity-50" />
              Calculating forward projection curves...
            </div>
          ) : forecast?.events && forecast.events.length > 0 ? (
            <div className="divide-y divide-border/60">
              {forecast.events.map((evt, idx) => {
                const isDebit = evt.amount < 0
                return (
                  <div key={idx} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex size-8 items-center justify-center rounded-xl ${
                          isDebit ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'
                        }`}
                      >
                        {isDebit ? <ArrowDownRight className="size-4" /> : <ArrowUpRight className="size-4" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold">{evt.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {evt.category} · Due {evt.date}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p
                        className={`text-xs font-mono font-bold ${
                          isDebit ? 'text-foreground' : 'text-emerald-500'
                        }`}
                      >
                        {isDebit ? '-' : '+'}₹
                        {Math.abs(evt.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        {evt.is_confirmed ? 'Confirmed commitment' : 'Estimated projection'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-muted-foreground">
              No specific recurring events falling within the selected {horizonDays}-day horizon.
            </div>
          )}
        </div>

        {/* Assumptions & Mathematical Audit */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="size-4 text-emerald-500" />
              <h3 className="text-sm font-bold tracking-tight">Grounding & Assumptions</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              FinSight AI enforces strict mathematical integrity: predictions explicitly separate observed historical receipts from forward estimates.
            </p>

            <div className="space-y-2.5">
              {forecast?.assumptions.map((assump, idx) => (
                <div key={idx} className="flex items-start gap-2 rounded-xl bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
                  <Info className="size-3.5 text-primary shrink-0 mt-0.5" />
                  <span>{assump}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-border/60 bg-muted/20 p-3 text-center text-[11px] text-muted-foreground">
            Next-day update triggered automatically upon new CSV statements.
          </div>
        </div>
      </div>
    </div>
  )
}
