'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  MessageSquareText,
  Send,
  ShieldCheck,
  Sparkles,
  Receipt,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingDown,
  ArrowRight,
  Loader2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Plus,
  X,
  WalletCards,
  Lock,
  Layers
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api-client'
import { FinancialChatResponse, Transaction, UserConstraint, SafeToSpendResponse } from '@/lib/types'

interface ChatMessage {
  id: string
  sender: 'user' | 'assistant'
  text: string
  timestamp: string
  data?: FinancialChatResponse
}

const SUGGESTED_QUERIES = [
  'What is my True Safe-to-Spend today?',
  'Can I afford a ₹15,000 laptop?',
  'How much have I spent on Dining?',
  'Who owes me split bill money?',
  'Check my 30-day cash flow forecast',
  'What recurring subscriptions do I have?'
]

export function ChatView() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hello! I am **FinSight AI**, your constraint-aware conversational CFO. Unlike consumer chat apps that hallucinate figures or encourage irresponsible loans, every computation I perform runs deterministically against your verified ledger and **Active Constraint Memory**.\n\nAsk me about your Safe-to-Spend runway, stress-test upcoming purchases, or inspect who owes you split bill money.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [expandedCitations, setExpandedCitations] = useState<Record<string, boolean>>({})
  const [constraints, setConstraints] = useState<UserConstraint[]>([])
  const [safeToSpend, setSafeToSpend] = useState<SafeToSpendResponse | null>(null)
  const [loadingConstraints, setLoadingConstraints] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadSidePanelData = async () => {
    setLoadingConstraints(true)
    try {
      const [cRes, sRes] = await Promise.allSettled([
        api.getConstraints(),
        api.getSafeToSpend(),
      ])
      if (cRes.status === 'fulfilled') setConstraints(cRes.value)
      if (sRes.status === 'fulfilled') setSafeToSpend(sRes.value)
    } catch (err) {
      console.warn('Failed to load constraints for chat panel', err)
    } finally {
      setLoadingConstraints(false)
    }
  }

  useEffect(() => {
    loadSidePanelData()
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  const toggleCitations = (msgId: string) => {
    setExpandedCitations(prev => ({ ...prev, [msgId]: !prev[msgId] }))
  }

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim()
    if (!text || loading) return

    const userMsgId = `user_${Date.now()}`
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages(prev => [...prev, userMsg])
    setInputValue('')
    setLoading(true)

    try {
      const response = await api.queryChat(text, 'default_user')
      const assistantMsg: ChatMessage = {
        id: `assistant_${Date.now()}`,
        sender: 'assistant',
        text: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        data: response
      }
      setMessages(prev => [...prev, assistantMsg])
      if (response.cited_transactions && response.cited_transactions.length > 0) {
        setExpandedCitations(prev => ({ ...prev, [assistantMsg.id]: true }))
      }
      // Refresh side panel in case chat altered or checked constraints
      loadSidePanelData()
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `assistant_err_${Date.now()}`,
        sender: 'assistant',
        text: `Sorry, I encountered an error processing your inquiry: ${err.message || 'Service unavailable.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary border border-primary/20">
                <MessageSquareText className="size-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[17px] font-bold tracking-tight">AI CFO Co-Pilot</h2>
                  <span className="badge-emerald inline-flex items-center gap-1.5 rounded-full px-2.5 py-px text-[10px] font-bold">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Pillar 4: Verified Co-Pilot
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  Reads and respects <strong>Active Constraints</strong> · Zero arithmetic hallucination · Cites exact ledger rows
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-muted-foreground border border-border/70 rounded-xl px-3 py-2 bg-muted/30">
            <ShieldCheck className="size-3.5 text-emerald-500 shrink-0" />
            <span>Deterministic Math Guardrail: <strong>Active (±1.0%)</strong></span>
          </div>
        </div>

        {/* Suggested Queries Chips */}
        <div className="mt-5 pt-4 border-t border-border/50">
          <p className="section-label mb-2.5">Quick Intelligence Inquiries</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUERIES.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                disabled={loading}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/70 hover:border-primary/30 text-foreground transition-all duration-150 disabled:opacity-50"
              >
                <span>{q}</span>
                <ArrowRight className="size-3 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Chat Stream + Constraints Memory Side Panel */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(280px,0.9fr)]">
        {/* Left Column: Chat Conversation */}
        <div className="flex flex-col h-[640px] rounded-2xl border border-border/70 bg-card shadow-xs overflow-hidden">
          {/* Scrollable Messages Stream */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user'
              const citations = msg.data?.cited_transactions || []
              const hasCitations = citations.length > 0
              const isExpanded = expandedCitations[msg.id] ?? false

              return (
                <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      {isUser ? 'You' : 'FinSight Co-Pilot'}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">{msg.timestamp}</span>
                    {!isUser && msg.data?.is_verified && (
                      <span className="badge-emerald inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[9px] font-bold">
                        <CheckCircle2 className="size-2.5" /> Verified
                      </span>
                    )}
                  </div>

                  <div
                    className={`rounded-2xl px-4 py-3 text-xs leading-relaxed max-w-[88%] ${
                      isUser
                        ? 'bg-primary text-primary-foreground font-medium rounded-tr-xs shadow-xs'
                        : 'bg-muted/40 border border-border/80 text-foreground rounded-tl-xs shadow-2xs whitespace-pre-line'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Cited Transactions Drawer */}
                  {!isUser && hasCitations && (
                    <div className="mt-2 w-full max-w-[88%] rounded-xl border border-border/60 bg-muted/20 overflow-hidden text-xs">
                      <button
                        onClick={() => toggleCitations(msg.id)}
                        className="flex items-center justify-between w-full px-3 py-2 text-left font-semibold text-[11px] text-muted-foreground hover:bg-muted/40 transition"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Receipt className="size-3 text-primary" />
                          Cited {citations.length} Grounded Ledger Record{citations.length === 1 ? '' : 's'}
                        </span>
                        {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                      </button>

                      {isExpanded && (
                        <div className="px-3 pb-2.5 space-y-1.5 border-t border-border/40 pt-2">
                          {citations.map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between rounded-lg bg-card/80 p-2 text-[11px] border border-border/40">
                              <div className="truncate mr-2">
                                <span className="font-semibold text-foreground">{tx.description}</span>
                                <span className="text-muted-foreground text-[10px] ml-1.5">({tx.transaction_date})</span>
                              </div>
                              <span className="font-mono font-bold shrink-0">
                                ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2 px-1">
                <Loader2 className="size-3.5 animate-spin text-primary" />
                <span>FinSight is checking constraints and computing deterministic response...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="border-t border-border/70 p-3 bg-muted/20 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about your budget, test an upcoming purchase, or query constraints..."
              disabled={loading}
              className="flex-1 rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs"
            />
            <Button
              type="submit"
              disabled={loading || !inputValue.trim()}
              size="sm"
              className="rounded-xl px-4 h-9 gap-1.5 font-semibold shrink-0"
            >
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              Send
            </Button>
          </form>
        </div>

        {/* Right Column: Active Constraint Memory Side Panel */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Lock className="size-4 text-primary" />
                <h3 className="font-bold text-sm text-foreground">Constraint Memory</h3>
              </div>
              <span className="badge-teal rounded-md px-1.5 py-0.5 text-[10px] font-bold">
                Live Memory
              </span>
            </div>

            {/* Quick True Safe-to-Spend Widget */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 mb-4">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                True Safe-to-Spend Today
              </span>
              <p className="text-xl font-black font-mono text-foreground mt-0.5">
                ₹{safeToSpend?.safe_to_spend_today.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                <span className="text-xs font-normal text-muted-foreground"> / day</span>
              </p>
              <div className="mt-2 text-[10px] text-muted-foreground flex justify-between border-t border-border/40 pt-1.5">
                <span>Locked: ₹{safeToSpend?.locked_by_constraints.toLocaleString('en-IN') || '0'}</span>
                <span>Runway: {safeToSpend?.runway_days_remaining || 30}d</span>
              </div>
            </div>

            {/* Constraints List */}
            <p className="text-[11px] font-bold text-foreground mb-2">Active Inviolable Rules:</p>
            <div className="space-y-2">
              {constraints.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No constraints registered yet.</p>
              ) : (
                constraints.map((c) => (
                  <div
                    key={c.id}
                    className={`rounded-xl border p-2.5 text-xs transition ${
                      c.is_active ? 'border-border/80 bg-muted/20' : 'border-border/40 bg-muted/10 opacity-50 line-through'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground truncate">{c.label}</span>
                      <span className="font-mono font-bold text-foreground shrink-0 ml-2">
                        ₹{c.amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                      <span>{c.constraint_type}</span>
                      {c.due_day && <span>Due {c.due_day}th</span>}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Natural Language Constraint Injection Suggestions */}
            <div className="mt-4 pt-3 border-t border-border/60">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Prompt FinSight To Update Rules:
              </p>
              <div className="space-y-1.5">
                <button
                  onClick={() => handleSend('Set my emergency floor to ₹6,000')}
                  className="w-full text-left text-[11px] p-2 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted text-foreground transition truncate"
                >
                  💬 "Set my emergency floor to ₹6,000"
                </button>
                <button
                  onClick={() => handleSend('Add a ₹32,000 rent obligation due on the 5th')}
                  className="w-full text-left text-[11px] p-2 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted text-foreground transition truncate"
                >
                  💬 "Add ₹32,000 rent due on the 5th"
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
