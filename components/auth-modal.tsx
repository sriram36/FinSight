'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { X, Lock, Mail, User, ShieldCheck, Check, AlertCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api-client'
import { AuthUser } from '@/lib/types'

interface AuthModalProps {
  onClose: () => void
  onSuccess: (user: AuthUser) => void
}

export function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [isRegister, setIsRegister] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isRegister) {
        if (!name.trim()) throw new Error('Name is required.')
        const res = await api.registerUser({ name, email, password })
        if (typeof window !== 'undefined') {
          localStorage.setItem('finsight_token', res.token)
          localStorage.setItem('finsight_user', JSON.stringify(res))
        }
        onSuccess(res)
      } else {
        const res = await api.loginUser({ email, password })
        if (typeof window !== 'undefined') {
          localStorage.setItem('finsight_token', res.token)
          localStorage.setItem('finsight_user', JSON.stringify(res))
        }
        onSuccess(res)
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleUseDemo = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('finsight_token')
      localStorage.removeItem('finsight_user')
    }
    onSuccess({
      id: 'default_user',
      name: 'Jordan Davis',
      email: 'jordan@finsight.local',
      token: 'tok_demo_jordan_sandbox',
      is_demo: true
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="relative flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 p-1 shadow-xs">
              <Image src="/logo.svg" alt="FinSight Logo" width={22} height={22} className="size-5.5 object-contain" />
            </div>
            <h2 className="text-lg font-bold tracking-tight">
              {isRegister ? 'Create FinSight Account' : 'Sign In to FinSight'}
            </h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isRegister
              ? 'Your financial records will be strictly isolated with PBKDF2 encryption and verified access tokens.'
              : 'Sign in to access your personal encrypted ledger and verified portfolio.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold mb-1 text-muted-foreground">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="text"
                  required
                  placeholder="Jordan Davis"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold mb-1 text-muted-foreground">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-muted-foreground">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full rounded-xl font-semibold shadow-xs">
            {loading ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-5 pt-4 border-t border-border/60 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {isRegister ? 'Already have an account?' : 'Need a personal account?'}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister)
                setError(null)
              }}
              className="font-semibold text-primary hover:underline"
            >
              {isRegister ? 'Sign In' : 'Register'}
            </button>
          </div>

          <button
            type="button"
            onClick={handleUseDemo}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border/80 bg-muted/40 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/80 hover:text-foreground transition"
          >
            <span>Switch to Jordan Davis (Demo Sandbox)</span>
            <ArrowRight className="size-3" />
          </button>
        </div>
      </div>
    </div>
  )
}
