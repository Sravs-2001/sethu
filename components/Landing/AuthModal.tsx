'use client'

import { useState, useEffect } from 'react'
import { authService } from '@/lib/services'
import { X, Eye, EyeOff, CheckCircle, Bug, Rocket, MessageSquare, Sparkles } from 'lucide-react'
import JiraLogo from '@/components/ui/JiraLogo'
import { GoogleIcon, GitHubIcon, MicrosoftIcon } from '@/components/ui/OAuthIcons'
import clsx from 'clsx'

type Mode = 'login' | 'register'

interface Props {
  defaultMode?: Mode
  inviteToken?: string
  onClose: () => void
}

const APP_FEATURES = [
  { icon: Bug,           color: 'text-rose-400',    label: 'Bug tracker & Kanban' },
  { icon: Rocket,        color: 'text-sky-400',     label: 'Sprint planning boards' },
  { icon: Sparkles,      color: 'text-violet-400',  label: 'Feature roadmap' },
  { icon: MessageSquare, color: 'text-indigo-400',  label: 'Real-time team chat' },
]

export default function AuthModal({ defaultMode = 'login', inviteToken, onClose }: Props) {
  const [mode, setMode] = useState<Mode>(defaultMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const fn = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function switchMode(m: Mode) { setMode(m); setError(''); setSuccess('') }

  async function acceptInvite() {
    if (!inviteToken) return
    await fetch('/api/invite/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: inviteToken }),
    })
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading('email')

    if (mode === 'register') {
      // Create user server-side with email already confirmed (no confirmation email needed)
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error ?? 'Failed to create account.')
        setLoading(null)
        return
      }
      // Now sign in immediately
      const { data, error } = await authService.signInWithPassword(email, password)
      if (error) {
        setError(error.message)
      } else if (data.session) {
        await acceptInvite()
        window.location.href = '/dashboard'
      }
    } else {
      const { data, error } = await authService.signInWithPassword(email, password)
      if (error) {
        setError(error.message === 'Invalid login credentials' ? 'Wrong email or password.' : error.message)
      } else if (data.session) {
        await acceptInvite()
        window.location.href = '/dashboard'
      }
    }
    setLoading(null)
  }

  async function handleOAuth(provider: 'google' | 'github' | 'azure') {
    setError(''); setLoading(provider)
    const { error } = await authService.signInWithOAuth(
      provider,
      typeof window !== 'undefined' ? `${window.location.origin}/api/auth/callback` : undefined
    )
    if (error) {
      setError(error.message.includes('not enabled')
        ? `${provider === 'azure' ? 'Microsoft' : provider.charAt(0).toUpperCase() + provider.slice(1)} login isn't enabled yet. Use email below.`
        : error.message)
      setLoading(null)
    }
  }

  async function handleMagicLink() {
    if (!email) { setError('Enter your email address first.'); return }
    setError(''); setLoading('magic')
    const { error } = await authService.signInWithOtp(
      email,
      typeof window !== 'undefined' ? `${window.location.origin}/api/auth/callback` : undefined
    )
    if (error) setError(error.message)
    else setSuccess(`Magic link sent to ${email} — check your inbox!`)
    setLoading(null)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl shadow-2xl animate-slide-in overflow-hidden bg-white border border-gray-100">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <JiraLogo size={20} />
            <span className="text-gray-900 font-bold text-lg">sethu</span>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {(['login', 'register'] as Mode[]).map((m) => (
            <button key={m} onClick={() => switchMode(m)}
              className={clsx('flex-1 py-3 text-sm font-medium transition-all border-b-2',
                mode === m ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700')}>
              {m === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        <div className="px-6 py-6">
          {mode === 'register' && (
            <div className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 mb-5 text-xs text-gray-700">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-900" />
              <span>First person becomes the <strong>Admin</strong>.</span>
            </div>
          )}

          {/* OAuth buttons */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[
              { id: 'google' as const, Icon: GoogleIcon, label: 'Google' },
              { id: 'github' as const, Icon: GitHubIcon, label: 'GitHub' },
              { id: 'azure'  as const, Icon: MicrosoftIcon, label: 'Microsoft' },
            ].map(({ id, Icon, label }) => (
              <button key={id} onClick={() => handleOAuth(id)} disabled={!!loading} title={`Continue with ${label}`}
                className={clsx('flex flex-col items-center gap-1.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 transition-all active:scale-95',
                  loading && loading !== id && 'opacity-40 pointer-events-none')}>
                {loading === id
                  ? <span className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                  : <Icon className="w-4 h-4" />}
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-500 font-medium">or with email</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <form onSubmit={handleEmail} className="space-y-3">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Full Name</label>
                <input className="input" type="text" placeholder="John Doe" value={name}
                  onChange={(e) => setName(e.target.value)} required autoFocus />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
              <input className="input" type="email" placeholder="you@company.com" value={email}
                onChange={(e) => setEmail(e.target.value)} required autoFocus={mode === 'login'} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-gray-600">Password</label>
                {mode === 'login' && (
                  <button type="button" onClick={handleMagicLink} disabled={!!loading}
                    className="text-xs text-gray-900 font-medium hover:underline">
                    {loading === 'magic' ? 'Sending…' : 'Forgot password?'}
                  </button>
                )}
              </div>
              <div className="relative">
                <input className="input pr-10" type={showPass ? 'text' : 'password'}
                  placeholder="Min. 6 characters" value={password}
                  onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg text-xs">
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2 bg-green-50 border border-green-200 text-green-700 px-3 py-2.5 rounded-lg text-xs">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{success}</span>
              </div>
            )}

            <button type="submit" disabled={!!loading}
              className="w-full py-2.5 text-white font-medium rounded-lg transition-all active:scale-[0.98] text-sm disabled:opacity-60 bg-gray-900 hover:bg-gray-800">
              {loading === 'email' ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {mode === 'login' ? 'Signing in…' : 'Creating account…'}
                </span>
              ) : (
                mode === 'login' ? 'Sign in' : 'Create workspace'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-5">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              className="text-gray-900 font-medium hover:underline">
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
