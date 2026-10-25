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
  RotateCcw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api-client'
import { FinancialChatResponse, Transaction } from '@/lib/types'

interface ChatMessage {
  id: string
  sender: 'user' | 'assistant'
  text: string
  timestamp: string
  data?: FinancialChatResponse
}

const SUGGESTED_QUERIES = [
  'How much did I spend on Dining?',
  'Can I afford to buy a ₹15,000 laptop?',
  'Why did my savings drop?',
  'What are my top expense categories?',
  'What did I spend on Groceries?',
  'Can I spend ₹5,000 on Shopping?'
]

export function ChatView() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hello! I am **FinSight AI**, your evidence-grounded financial copilot. Unlike conventional AI chatbots that speculate or fabricate financial figures, every calculation I perform runs deterministically in code against your verified ledger. Every numeric statement is verified by our Claim Verifier before reaching your screen.\n\nAsk me about your category spending, check whether you can afford an upcoming purchase, or investigate what changed in your monthly cash flow.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [expandedCitations, setExpandedCitations] = useState<Record<string, boolean>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
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
                  <h2 className="text-[17px] font-bold tracking-tight">Ask FinSight</h2>
                  <span className="badge-emerald inline-flex items-center gap-1.5 rounded-full px-2.5 py-px text-[10px] font-bold">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Verified
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  Mathematical calculations run in Python, synthesized with{' '}
                  <code className="px-1 py-px rounded bg-muted text-[10px] font-mono">gpt-5.6-luna</code>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-muted-foreground border border-border/70 rounded-xl px-3 py-2 bg-muted/30">
            <ShieldCheck className="size-3.5 text-primary shrink-0" />
            <span>Claim Verifier: <strong>Strict (±1.0%)</strong></span>
          </div>
        </div>

        {/* Suggested Queries Chips */}
        <div className="mt-5 pt-4 border-t border-border/50">
          <p className="section-label mb-2.5">Suggested Queries</p>
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

      {/* Messages Stream */}
      <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm flex flex-col min-h-[480px] max-h-[680px] shadow-xs">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} animate-slide-up`}
            >
              <div className="flex items-center gap-2 mb-2 px-1">
                {msg.sender === 'assistant' && (
                  <div className="flex size-5 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                    <Sparkles className="size-2.5 text-primary" />
                  </div>
                )}
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {msg.sender === 'user' ? 'You' : 'FinSight Copilot'}
                </span>
                <span className="text-[10px] text-muted-foreground/50">{msg.timestamp}</span>
              </div>

              <div
                className={`max-w-[92%] sm:max-w-[82%] rounded-2xl p-4 sm:p-5 text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground font-medium shadow-sm'
                    : 'bg-card border border-border/70 text-foreground shadow-xs'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* Grounding & Verification Provenance Header for Assistant */}
                {msg.data && (
                  <div className="mt-4 pt-3.5 border-t border-border/80 flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium border bg-muted/60 text-foreground">
                      <Sparkles className="size-3 text-primary" />
                      Model: {msg.data.model_used}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium border ${
                        msg.data.is_verified
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      <ShieldCheck className="size-3" />
                      {msg.data.is_verified ? 'Math Verified (0 Hallucinations)' : 'Fallback Verification Used'}
                    </span>

                    <span className="text-[11px] text-muted-foreground ml-auto">
                      Intent: <strong>{msg.data.intent}</strong>
                    </span>
                  </div>
                )}

                {/* Structured Verified Facts Grid */}
                {msg.data && msg.data.facts && Object.keys(msg.data.facts).length > 0 && (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-muted/40 border border-border/60 text-xs">
                    {Object.entries(msg.data.facts).map(([k, v]) => {
                      if (typeof v === 'object' || v === null || v === undefined) return null
                      const label = k.replace(/_/g, ' ')
                      const isMoney = k.includes('amount') || k.includes('spent') || k.includes('balance') || k.includes('impact') || k.includes('buffer') || k.includes('savings')
                      const displayVal = isMoney && typeof v === 'number'
                        ? `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : String(v)

                      return (
                        <div key={k} className="flex flex-col">
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground">{label}</span>
                          <span className="font-semibold text-foreground truncate">{displayVal}</span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Cited Transactions Drawer */}
                {msg.data && msg.data.cited_transactions && msg.data.cited_transactions.length > 0 && (
                  <div className="mt-3.5 pt-3 border-t border-border/60">
                    <button
                      onClick={() => toggleCitations(msg.id)}
                      className="flex items-center justify-between w-full text-xs font-semibold text-foreground/90 hover:text-primary transition py-1"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Receipt className="size-3.5 text-primary" />
                        Cited Ledger Transactions ({msg.data.cited_transactions.length} receipts)
                      </span>
                      {expandedCitations[msg.id] ? (
                        <ChevronUp className="size-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="size-3.5 text-muted-foreground" />
                      )}
                    </button>

                    {expandedCitations[msg.id] && (
                      <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {msg.data.cited_transactions.map(tx => (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-card border border-border text-xs"
                          >
                            <div className="flex flex-col min-w-0 pr-2">
                              <span className="font-medium text-foreground truncate">{tx.description}</span>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <span>{tx.transaction_date}</span>
                                <span>•</span>
                                <span className="rounded bg-muted px-1.5 py-0.2">{tx.category}</span>
                              </div>
                            </div>
                            <div className="font-semibold text-foreground whitespace-nowrap">
                              ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Follow-up Prompts */}
                {msg.data && msg.data.suggested_followups && msg.data.suggested_followups.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground font-medium mr-1">Follow up:</span>
                    {msg.data.suggested_followups.map((fu, fidx) => (
                      <button
                        key={fidx}
                        onClick={() => handleSend(fu)}
                        disabled={loading}
                        className="text-xs px-2.5 py-1 rounded-md border border-border bg-muted/60 hover:bg-muted text-foreground transition text-left"
                      >
                        {fu}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-2 mb-1.5 px-1">
                <span className="text-[11px] font-medium text-muted-foreground">FinSight Financial Copilot</span>
              </div>
              <div className="rounded-2xl rounded-tl-xs p-4 bg-card border border-border text-sm flex items-center gap-3 text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-primary" />
                <span>Running deterministic calculation & verifying claims against ledger...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-border/60 bg-card/90 rounded-b-2xl">
          <form
            onSubmit={e => {
              e.preventDefault()
              handleSend()
            }}
            className="flex items-center gap-2.5"
          >
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="Ask anything about your ledger..."
              disabled={loading}
              className="flex-1 rounded-xl border border-border/60 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 disabled:opacity-50 transition-all"
            />
            <Button
              type="submit"
              disabled={loading || !inputValue.trim()}
              className="rounded-xl px-4 py-2.5 flex items-center gap-1.5 glow-subtle"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              <span className="hidden sm:inline text-[13px]">Inquire</span>
            </Button>
          </form>
          <div className="mt-2 text-center text-[11px] text-muted-foreground/50">
            Financial math is computed deterministically before LLM generation. Zero hallucination on numeric facts.
          </div>
        </div>
      </div>
    </div>
  )
}
