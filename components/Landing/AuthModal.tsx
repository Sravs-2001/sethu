'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { X, Eye, EyeOff, CheckCircle, Bug, Rocket, MessageSquare, Sparkles } from 'lucide-react'
import ArrowheadIcon from '@/components/ui/ArrowheadIcon'
import { GoogleIcon, GitHubIcon, MicrosoftIcon } from '@/components/ui/OAuthIcons'
import clsx from 'clsx'

type Mode = 'login' | 'register'

interface Props {
  defaultMode?: Mode
  onClose: () => void
}

const APP_FEATURES = [
  { icon: Bug,           color: 'text-rose-400',    label: 'Bug tracker & Kanban' },
  { icon: Rocket,        color: 'text-sky-400',     label: 'Sprint planning boards' },
  { icon: Sparkles,      color: 'text-violet-400',  label: 'Feature roadmap' },
  { icon: MessageSquare, color: 'text-indigo-400',  label: 'Real-time team chat' },
]

export default function AuthModal({ defaultMode = 'login', onClose }: Props) {
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

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading('email')

    if (mode === 'register') {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { name, full_name: name } },
      })
      if (error) {
        setError(error.message)
      } else if (data.session) {
        window.location.href = '/dashboard'
      } else {
        setSuccess('Check your email to confirm your account, then sign in.')
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message === 'Invalid login credentials' ? 'Wrong email or password.' : error.message)
      } else if (data.session) {
        window.location.href = '/dashboard'
      }
    }
    setLoading(null)
  }

  async function handleOAuth(provider: 'google' | 'github' | 'azure') {
    setError(''); setLoading(provider)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/api/auth/callback` : '',
      },
    })
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
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/api/auth/callback` : '' },
    })
    if (error) setError(error.message)
    else setSuccess(`Magic link sent to ${email} — check your inbox!`)
    setLoading(null)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(6, 13, 31, 0.85)', backdropFilter: 'blur(10px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-3xl rounded-3xl shadow-2xl animate-slide-in overflow-hidden flex min-h-[540px]">

        {/* Left: branded dark panel */}
        <div className="hidden md:flex flex-col w-72 flex-shrink-0 p-8 relative overflow-hidden"
          style={{ background: 'linear-gradient(160deg, #060d1f 0%, #0a1628 50%, #0d1f3c 100%)' }}>
          <div className="dot-grid absolute inset-0 opacity-50 pointer-events-none" />
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center gap-2.5 mb-8">
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <ArrowheadIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-white text-xl font-black">sethu</span>
            </div>
            <h2 className="text-white text-2xl font-black leading-tight mb-2">
              Everything your<br />team needs.
            </h2>
            <p className="text-white/40 text-sm mb-8 leading-relaxed">
              One workspace for bugs, features, sprints, and team chat.
            </p>
            <div className="space-y-3 mb-8">
              {APP_FEATURES.map(({ icon: Icon, color, label }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                  </div>
                  <span className="text-white/60 text-sm">{label}</span>
                </div>
              ))}
            </div>
            <div className="mt-auto grid grid-cols-2 gap-2.5">
              {[['10k+', 'Bugs resolved'], ['500+', 'Teams']].map(([n, l]) => (
                <div key={l} className="bg-white/6 border border-white/10 rounded-2xl p-3.5">
                  <div className="text-white font-black text-xl">{n}</div>
                  <div className="text-white/35 text-xs mt-0.5">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: form panel */}
        <div className="flex-1 bg-white flex flex-col">
          <div className="flex border-b border-gray-100 relative">
            <button onClick={onClose}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
            {(['login', 'register'] as Mode[]).map((m) => (
              <button key={m} onClick={() => switchMode(m)}
                className={clsx('flex-1 py-4 text-sm font-bold transition-all border-b-2',
                  mode === m ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-400 hover:text-gray-700')}>
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <div className="flex-1 px-7 py-6 overflow-y-auto">
            {mode === 'register' && (
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3.5 py-3 mb-5 text-sm text-blue-700">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
                <span>First person to register becomes the <strong>Admin</strong> — set up your workspace.</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 mb-5">
              {[
                { id: 'google' as const, Icon: GoogleIcon, label: 'Google' },
                { id: 'github' as const, Icon: GitHubIcon, label: 'GitHub' },
                { id: 'azure'  as const, Icon: MicrosoftIcon, label: 'Microsoft' },
              ].map(({ id, Icon, label }) => (
                <button key={id} onClick={() => handleOAuth(id)} disabled={!!loading} title={`Continue with ${label}`}
                  className={clsx('flex flex-col items-center gap-1.5 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-[11px] font-semibold text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all active:scale-95',
                    loading && loading !== id && 'opacity-40 pointer-events-none')}>
                  {loading === id
                    ? <span className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    : <Icon className="w-5 h-5" />}
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400 font-medium">or with email</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <form onSubmit={handleEmail} className="space-y-3.5">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Full Name</label>
                  <input className="input" type="text" placeholder="John Doe" value={name}
                    onChange={(e) => setName(e.target.value)} required autoFocus />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email</label>
                <input className="input" type="email" placeholder="you@company.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} required autoFocus={mode === 'login'} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Password</label>
                  {mode === 'login' && (
                    <button type="button" onClick={handleMagicLink} disabled={!!loading}
                      className="text-xs text-blue-600 font-semibold hover:underline">
                      {loading === 'magic' ? 'Sending…' : 'Forgot password?'}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input className="input pr-11" type={showPass ? 'text' : 'password'}
                    placeholder="Min. 6 characters" value={password}
                    onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-600 px-3.5 py-3 rounded-xl text-sm">
                  <span>⚠️</span><span>{error}</span>
                </div>
              )}
              {success && (
                <div className="flex items-start gap-2 bg-green-50 border border-green-100 text-green-700 px-3.5 py-3 rounded-xl text-sm">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{success}</span>
                </div>
              )}

              <button type="submit" disabled={!!loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] text-sm">
                {loading === 'email' ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {mode === 'login' ? 'Signing in…' : 'Creating account…'}
                  </span>
                ) : (
                  mode === 'login' ? 'Sign in to Sethu →' : 'Create my workspace →'
                )}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-4">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                className="text-blue-600 font-bold hover:underline">
                {mode === 'login' ? 'Sign up free' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
