'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
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
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { name, full_name: name } },
      })
      if (error) {
        setError(error.message)
      } else if (data.session) {
        await acceptInvite()
        window.location.href = '/dashboard'
      } else {
        // Email confirmation required — persist token so it's accepted after confirmation
        if (inviteToken) localStorage.setItem('pending_invite_token', inviteToken)
        setSuccess('Check your email to confirm your account, then sign in.')
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
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
      style={{ background: 'rgba(9,30,66,0.72)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-3xl rounded-xl shadow-2xl animate-slide-in overflow-hidden flex min-h-[520px]"
        style={{ border: '1px solid rgba(255,255,255,0.08)' }}>

        {/* Left: branded dark panel — matches app nav color #1D2125 */}
        <div className="hidden md:flex flex-col w-64 flex-shrink-0 p-7 relative overflow-hidden"
          style={{ background: '#1D2125', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center gap-2.5 mb-8">
              <JiraLogo size={32} />
              <span className="text-white text-lg font-black">sethu</span>
            </div>
            <h2 className="text-white text-2xl font-black leading-tight mb-2">
              Everything your<br />team needs.
            </h2>
            <p className="text-white/40 text-sm mb-8 leading-relaxed">
              One workspace for bugs, features, sprints, and team chat.
            </p>
            <div className="space-y-2.5 mb-8">
              {APP_FEATURES.map(({ icon: Icon, color, label }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                  </div>
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{label}</span>
                </div>
              ))}
            </div>
            <div className="mt-auto grid grid-cols-2 gap-2">
              {[['10k+', 'Issues tracked'], ['500+', 'Teams']].map(([n, l]) => (
                <div key={l} className="rounded-lg p-3"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="text-white font-black text-lg">{n}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: form panel */}
        <div className="flex-1 bg-white flex flex-col">
          <div className="flex border-b border-[#DFE1E6] relative">
            <button onClick={onClose}
              className="absolute top-3 right-3 w-7 h-7 rounded-full hover:bg-[#F4F5F7] flex items-center justify-center text-[#7A869A] transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
            {(['login', 'register'] as Mode[]).map((m) => (
              <button key={m} onClick={() => switchMode(m)}
                className={clsx('flex-1 py-3.5 text-sm font-bold transition-all border-b-2',
                  mode === m ? 'border-[#0052CC] text-[#0052CC]' : 'border-transparent text-[#626F86] hover:text-[#172B4D]')}>
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <div className="flex-1 px-7 py-6 overflow-y-auto">
            {mode === 'register' && (
              <div className="flex items-start gap-2 bg-[#DEEBFF] border border-[#B3D4FF] rounded-lg px-3.5 py-3 mb-5 text-sm text-[#0052CC]">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#0052CC]" />
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
                  className={clsx('flex flex-col items-center gap-1.5 py-3 bg-[#F4F5F7] border border-[#DFE1E6] rounded-lg text-[11px] font-semibold text-[#42526E] hover:bg-[#DEEBFF] hover:border-[#4C9AFF] hover:text-[#0052CC] transition-all active:scale-95',
                    loading && loading !== id && 'opacity-40 pointer-events-none')}>
                  {loading === id
                    ? <span className="w-5 h-5 border-2 border-[#0052CC] border-t-transparent rounded-full animate-spin" />
                    : <Icon className="w-5 h-5" />}
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-[#DFE1E6]" />
              <span className="text-xs text-[#97A0AF] font-medium">or with email</span>
              <div className="flex-1 h-px bg-[#DFE1E6]" />
            </div>

            <form onSubmit={handleEmail} className="space-y-3.5">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-[#5E6C84] mb-1.5">Full Name</label>
                  <input className="input" type="text" placeholder="John Doe" value={name}
                    onChange={(e) => setName(e.target.value)} required autoFocus />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-[#5E6C84] mb-1.5">Email</label>
                <input className="input" type="email" placeholder="you@company.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} required autoFocus={mode === 'login'} />
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
                <div className="flex items-start gap-2 bg-[#FFEBE6] border border-[#FFBDAD] text-[#DE350B] px-3.5 py-3 rounded-lg text-sm">
                  <span>⚠️</span><span>{error}</span>
                </div>
              )}
              {success && (
                <div className="flex items-start gap-2 bg-[#E3FCEF] border border-[#ABF5D1] text-[#006644] px-3.5 py-3 rounded-lg text-sm">
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{success}</span>
                </div>
              )}

              <button type="submit" disabled={!!loading}
                className="w-full py-2.5 text-white font-bold rounded-lg shadow-sm transition-all active:scale-[0.98] text-sm disabled:opacity-60"
                style={{ background: '#0052CC' }}
                onMouseEnter={e => !(e.currentTarget as HTMLButtonElement).disabled && ((e.currentTarget as HTMLElement).style.background = '#0065FF')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#0052CC')}>
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

            <p className="text-center text-sm text-[#5E6C84] mt-4">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                className="text-[#0052CC] font-bold hover:underline">
                {mode === 'login' ? 'Sign up free' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
