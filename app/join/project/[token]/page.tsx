'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { CheckCircle, XCircle, Loader2, ArrowRight, Users, Eye, EyeOff, Shield, User } from 'lucide-react'
import JiraLogo from '@/components/ui/JiraLogo'
import clsx from 'clsx'

interface TokenInfo {
  project_id: string
  role: 'admin' | 'member'
  expires_at: string | null
  project?: { name: string; key: string; avatar_color: string }
}

type AuthMode = 'signin' | 'signup'

export default function JoinProjectPage() {
  const { token } = useParams<{ token: string }>()
  const router    = useRouter()

  const [status,    setStatus]    = useState<'loading' | 'ready' | 'joining' | 'joined' | 'error' | 'expired'>('loading')
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)
  const [errorMsg,  setErrorMsg]  = useState('')
  const [authed,    setAuthed]    = useState(false)
  const [userId,    setUserId]    = useState<string | null>(null)

  // Inline auth form
  const [authMode,     setAuthMode]     = useState<AuthMode>('signin')
  const [name,         setName]         = useState('')
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [showPass,     setShowPass]     = useState(false)
  const [authLoading,  setAuthLoading]  = useState(false)
  const [authError,    setAuthError]    = useState('')
  const [needsConfirm, setNeedsConfirm] = useState(false)

  useEffect(() => {
    async function init() {
      // Check if already logged in
      const { data: { user } } = await supabase.auth.getUser()
      if (user) { setAuthed(true); setUserId(user.id) }

      // Load invite token info (public read — no auth required)
      const { data, error } = await supabase
        .from('invite_tokens')
        .select('*, project:projects(name, key, avatar_color)')
        .eq('token', token)
        .single()

      if (error || !data) {
        setStatus('error')
        setErrorMsg('This invite link is invalid or has been removed.')
        return
      }
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setStatus('expired')
        return
      }
      setTokenInfo(data as TokenInfo)
      setStatus('ready')
    }
    init()
  }, [token])

  // ── Accept invite via API ─────────────────────────────────────────
  async function acceptInvite(uid?: string) {
    if (!tokenInfo) return
    setStatus('joining')
    const res = await fetch('/api/invite/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setStatus('error')
      setErrorMsg(body.error ?? 'Failed to join project. Please try again.')
      return
    }
    setStatus('joined')
    setTimeout(() => { window.location.href = '/dashboard/projects' }, 1800)
  }

  // ── Auth form submit ──────────────────────────────────────────────
  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)

    if (authMode === 'signup') {
      // Create user server-side with email already confirmed (no confirmation email needed)
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      })
      const body = await res.json()
      if (!res.ok) { setAuthError(body.error ?? 'Failed to create account.'); setAuthLoading(false); return }

      // Sign in immediately after account creation
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      setAuthLoading(false)
      if (error) { setAuthError(error.message); return }
      if (data.session) {
        setAuthed(true)
        setUserId(data.session.user.id)
        await acceptInvite(data.session.user.id)
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      setAuthLoading(false)
      if (error) {
        setAuthError(error.message === 'Invalid login credentials'
          ? 'Wrong email or password.' : error.message)
        return
      }
      if (data.session) {
        setAuthed(true)
        setUserId(data.session.user.id)
        await acceptInvite(data.session.user.id)
      }
    }
  }

  function switchMode(m: AuthMode) { setAuthMode(m); setAuthError('') }

  const project = tokenInfo?.project

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: '#0A0E1A' }}>
      <div className="w-full max-w-sm space-y-6">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-[#0052CC] flex items-center justify-center shadow-lg shadow-blue-900/50">
            <JiraLogo size={22} />
          </div>
          <span className="text-white text-xl font-black">sethu</span>
        </div>

        <div className="bg-white rounded-2xl overflow-hidden shadow-2xl" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>

          {/* ── Loading ── */}
          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#0052CC]" />
              <p className="text-sm text-[#5E6C84]">Loading invite…</p>
            </div>
          )}

          {/* ── Error ── */}
          {status === 'error' && (
            <div className="flex flex-col items-center text-center py-10 px-6 gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#FFEBE6] flex items-center justify-center">
                <XCircle className="w-7 h-7 text-[#DE350B]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#172B4D] mb-1">Invalid invite</h2>
                <p className="text-sm text-[#5E6C84]">{errorMsg}</p>
              </div>
              <button onClick={() => router.push('/')} className="btn-primary">Go to home</button>
            </div>
          )}

          {/* ── Expired ── */}
          {status === 'expired' && (
            <div className="flex flex-col items-center text-center py-10 px-6 gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#FFFAE6] flex items-center justify-center">
                <XCircle className="w-7 h-7 text-[#FF8B00]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#172B4D] mb-1">Invite expired</h2>
                <p className="text-sm text-[#5E6C84]">This invite link has expired. Ask the project admin for a new one.</p>
              </div>
              <button onClick={() => router.push('/')} className="btn-secondary">Go to home</button>
            </div>
          )}

          {/* ── Joined! ── */}
          {status === 'joined' && (
            <div className="flex flex-col items-center text-center py-10 px-6 gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#E3FCEF] flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-[#36B37E]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#172B4D] mb-1">You're in!</h2>
                <p className="text-sm text-[#5E6C84]">Redirecting you to your workspace…</p>
              </div>
              <div className="w-5 h-5 rounded-full border-2 border-[#0052CC] border-t-transparent animate-spin" />
            </div>
          )}

          {/* ── Joining… ── */}
          {status === 'joining' && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#0052CC]" />
              <p className="text-sm text-[#5E6C84]">Joining project…</p>
            </div>
          )}

          {/* ── Email confirm notice ── */}
          {(status === 'ready') && needsConfirm && (
            <div className="flex flex-col items-center text-center py-10 px-6 gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#DEEBFF] flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-[#0052CC]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#172B4D] mb-1">Check your email</h2>
                <p className="text-sm text-[#5E6C84]">
                  We sent a confirmation link to <strong>{email}</strong>.<br />
                  Once you confirm, you'll be automatically added to <strong>{project?.name}</strong>.
                </p>
              </div>
              <p className="text-xs text-[#97A0AF]">You can close this page. The invite will be waiting for you.</p>
            </div>
          )}

          {/* ── Ready state ── */}
          {status === 'ready' && !needsConfirm && project && (
            <div className="p-6">

              {/* Project info */}
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-black mb-3 shadow-lg"
                  style={{ background: project.avatar_color }}>
                  {project.key.slice(0, 2)}
                </div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Users className="w-4 h-4 text-[#626F86]" />
                  <span className="text-xs text-[#626F86]">You're invited to join</span>
                </div>
                <h2 className="text-xl font-black text-[#172B4D]">{project.name}</h2>
                <span className="mt-2 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={{
                    background: tokenInfo?.role === 'admin' ? '#FFFAE6' : '#DEEBFF',
                    color:      tokenInfo?.role === 'admin' ? '#974F0C' : '#0052CC',
                  }}>
                  {tokenInfo?.role === 'admin'
                    ? <><Shield className="w-3 h-3" /> Join as Admin</>
                    : <><User   className="w-3 h-3" /> Join as Member</>}
                </span>
              </div>

              {/* ── Already authenticated — one-click join ── */}
              {authed ? (
                <button onClick={() => acceptInvite()}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-white rounded-xl transition-all"
                  style={{ background: '#0052CC' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#0065FF'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#0052CC'}>
                  Accept invite <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                /* ── Not authenticated — inline sign-in / sign-up ── */
                <>
                  {/* Tab switcher */}
                  <div className="flex rounded-xl overflow-hidden border border-[#DFE1E6] mb-4">
                    {(['signin', 'signup'] as AuthMode[]).map(m => (
                      <button key={m} onClick={() => switchMode(m)}
                        className={clsx(
                          'flex-1 py-2 text-sm font-semibold transition-colors',
                          authMode === m
                            ? 'bg-[#0052CC] text-white'
                            : 'text-[#626F86] hover:bg-[#F4F5F7]'
                        )}>
                        {m === 'signin' ? 'Sign in' : 'Create account'}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleAuth} className="space-y-3">
                    {authMode === 'signup' && (
                      <input
                        className="input"
                        type="text"
                        placeholder="Full name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                        autoFocus
                      />
                    )}
                    <input
                      className="input"
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoFocus={authMode === 'signin'}
                    />
                    <div className="relative">
                      <input
                        className="input pr-10"
                        type={showPass ? 'text' : 'password'}
                        placeholder="Password (min. 6 chars)"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      <button type="button" tabIndex={-1}
                        onClick={() => setShowPass(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B3BAC5] hover:text-[#626F86]">
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {authError && (
                      <p className="text-xs text-[#DE350B] bg-[#FFEBE6] border border-[#FFBDAD] px-3 py-2 rounded-lg">
                        {authError}
                      </p>
                    )}

                    <button type="submit" disabled={authLoading}
                      className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-white rounded-xl transition-all disabled:opacity-60"
                      style={{ background: '#0052CC' }}
                      onMouseEnter={e => !(e.currentTarget as HTMLButtonElement).disabled && ((e.currentTarget as HTMLElement).style.background = '#0065FF')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#0052CC')}>
                      {authLoading
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> {authMode === 'signin' ? 'Signing in…' : 'Creating account…'}</>
                        : <>{authMode === 'signin' ? 'Sign in & accept invite' : 'Create account & join'} <ArrowRight className="w-4 h-4" /></>
                      }
                    </button>
                  </form>
                </>
              )}
            </div>
          )}
        </div>

        {/* Back link */}
        {(status === 'error' || status === 'expired') ? null : (
          <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            <button onClick={() => router.push('/')}
              className="hover:underline transition-colors"
              style={{ color: 'rgba(255,255,255,0.4)' }}>
              ← Back to sethu
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
