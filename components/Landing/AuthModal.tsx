'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { X, Eye, EyeOff, CheckCircle, ArrowLeft } from 'lucide-react'
import { GoogleIcon, GitHubIcon, MicrosoftIcon } from '@/components/ui/OAuthIcons'
import clsx from 'clsx'

type Mode = 'login' | 'register'

const DEMO_USERS = [
  { name: 'Alice Johnson', email: 'alice@mailinator.com', role: 'Admin', color: '#0052CC' },
  { name: 'Bob Smith',     email: 'bob@mailinator.com',   role: 'Member', color: '#6554C0' },
  { name: 'Carol Davis',   email: 'carol@mailinator.com', role: 'Member', color: '#36B37E' },
  { name: 'David Wilson',  email: 'david@mailinator.com', role: 'Member', color: '#FF5630' },
  { name: 'Emma Brown',    email: 'emma@mailinator.com',  role: 'Member', color: '#00B8D9' },
]

interface Props {
  defaultMode?: Mode
  onClose: () => void
}

export default function AuthModal({ defaultMode = 'login', onClose }: Props) {
  const [mode, setMode]       = useState<Mode>(defaultMode)
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]  = useState<string | null>(null)
  const [error, setError]      = useState('')
  const [success, setSuccess]  = useState('')
  const [showDemo, setShowDemo] = useState(false)

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

  function quickFill(u: typeof DEMO_USERS[0]) {
    setEmail(u.email)
    setPassword('demo1234')
    setShowDemo(false)
    setError('')
  }

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
        onClose()
      } else {
        setSuccess('Check your email to confirm your account, then sign in.')
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message === 'Invalid login credentials' ? 'Wrong email or password.' : error.message)
      } else if (data.session) {
        onClose()
      }
    }
    setLoading(null)
  }

  async function handleOAuth(provider: 'google' | 'github' | 'azure') {
    setError(''); setLoading(provider)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: typeof window !== 'undefined'
          ? `${window.location.origin}/api/auth/callback`
          : '',
      },
    })
    if (error) {
      setError(`${provider === 'azure' ? 'Microsoft' : provider} login isn't enabled. Use email below.`)
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
      style={{ background: 'rgba(9,30,66,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl animate-slide-in">

        {/* Header */}
        <div className="relative px-8 pt-8 pb-5 text-center"
          style={{ background: 'linear-gradient(135deg, #0052CC 0%, #0065FF 100%)' }}>
          <button onClick={onClose}
            className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center text-white/60 hover:bg-white/20 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>

          {/* Logo */}
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 28 28" className="w-7 h-7" fill="none">
                <path d="M14 2L3 13l5 5 6-6 6 6 5-5L14 2z" fill="white" opacity="0.9" />
                <path d="M14 26L3 15l5-5 6 6 6-6 5 5-11 11z" fill="white" opacity="0.6" />
              </svg>
            </div>
          </div>
          <h1 className="text-xl font-black text-white">
            {mode === 'login' ? 'Log in to Sethu' : 'Create your account'}
          </h1>
          <p className="text-white/60 text-sm mt-1">
            {mode === 'login' ? 'Welcome back! Sign in to continue.' : 'Start managing your projects today.'}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-[#DFE1E6]">
          {(['login', 'register'] as Mode[]).map(m => (
            <button key={m} onClick={() => switchMode(m)}
              className={clsx(
                'flex-1 py-3 text-sm font-semibold transition-all border-b-2',
                mode === m
                  ? 'border-[#0052CC] text-[#0052CC]'
                  : 'border-transparent text-[#5E6C84] hover:text-[#172B4D]',
              )}>
              {m === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="px-8 py-6">

          {/* Demo accounts */}
          <div className="mb-5">
            <button
              onClick={() => setShowDemo(o => !o)}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors text-left"
              style={{ background: '#DEEBFF', color: '#0052CC' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#C6D9FF')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#DEEBFF')}
            >
              <span className="flex-1">⚡ Use a demo account</span>
              <span className="text-[11px] font-medium text-[#5E6C84]">password: demo1234</span>
            </button>

            {showDemo && (
              <div className="mt-2 rounded-lg border border-[#DFE1E6] overflow-hidden animate-slide-in">
                {DEMO_USERS.map(u => (
                  <button
                    key={u.email}
                    onClick={() => quickFill(u)}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-[#F4F5F7] transition-colors border-b border-[#F4F5F7] last:border-b-0"
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: u.color }}>
                      {u.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-[#172B4D]">{u.name}</div>
                      <div className="text-[11px] text-[#7A869A]">{u.email}</div>
                    </div>
                    <span className={clsx(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0',
                      u.role === 'Admin' ? 'bg-[#FFFAE6] text-amber-700' : 'bg-[#F4F5F7] text-[#5E6C84]',
                    )}>{u.role}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Social login */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[
              { id: 'google' as const, Icon: GoogleIcon, label: 'Google' },
              { id: 'github' as const, Icon: GitHubIcon, label: 'GitHub' },
              { id: 'azure'  as const, Icon: MicrosoftIcon, label: 'Microsoft' },
            ].map(({ id, Icon, label }) => (
              <button key={id} onClick={() => handleOAuth(id)} disabled={!!loading}
                className={clsx(
                  'flex items-center justify-center gap-1.5 py-2.5 border border-[#DFE1E6] rounded-lg text-[12px] font-semibold text-[#42526E] hover:bg-[#F4F5F7] transition-colors',
                  loading && loading !== id && 'opacity-40 pointer-events-none',
                )}>
                {loading === id
                  ? <span className="w-4 h-4 border-2 border-[#0052CC] border-t-transparent rounded-full animate-spin" />
                  : <Icon className="w-4 h-4" />
                }
                {label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-[#DFE1E6]" />
            <span className="text-xs text-[#7A869A] font-medium">or with email</span>
            <div className="flex-1 h-px bg-[#DFE1E6]" />
          </div>

          {/* Form */}
          <form onSubmit={handleEmail} className="space-y-3.5">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-[#5E6C84] mb-1.5">Full Name</label>
                <input
                  className="input"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#5E6C84] mb-1.5">Email</label>
              <input
                className="input"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus={mode === 'login'}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#5E6C84]">Password</label>
                {mode === 'login' && (
                  <button type="button" onClick={handleMagicLink} disabled={!!loading}
                    className="text-xs text-[#0052CC] font-semibold hover:underline">
                    {loading === 'magic' ? 'Sending…' : 'Forgot password?'}
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  className="input pr-11"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#97A0AF] hover:text-[#42526E] transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-[#FFEBE6] border border-red-100 text-[#DE350B] px-3 py-2.5 rounded-lg text-sm">
                <span className="flex-shrink-0">⚠️</span>
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2 bg-[#E3FCEF] border border-green-100 text-[#006644] px-3 py-2.5 rounded-lg text-sm">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!!loading}
              className="w-full py-2.5 font-bold rounded-lg text-white text-sm transition-all disabled:opacity-60"
              style={{ background: '#0052CC' }}
              onMouseEnter={e => !loading && ((e.currentTarget as HTMLElement).style.background = '#0747A6')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#0052CC')}
            >
              {loading === 'email' ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {mode === 'login' ? 'Signing in…' : 'Creating account…'}
                </span>
              ) : (
                mode === 'login' ? 'Log in' : 'Create account'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-[#5E6C84] mt-4">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              className="text-[#0052CC] font-semibold hover:underline"
            >
              {mode === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
