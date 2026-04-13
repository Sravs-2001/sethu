'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { CheckCircle, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react'
import clsx from 'clsx'

export const dynamic = 'force-dynamic'

interface TokenPayload {
  role: 'admin' | 'member'
  project_id: string
  exp: number
  v: number
}

function InvitePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('t')

  const [status, setStatus]   = useState<'loading' | 'valid' | 'invalid' | 'expired'>('loading')
  const [payload, setPayload] = useState<TokenPayload | null>(null)
  const [projectName, setProjectName] = useState<string>('')
  const [mode, setMode]       = useState<'register' | 'login'>('register')
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!token) { setStatus('invalid'); return }

    fetch(`/api/invite-link?t=${token}`)
      .then(r => r.json())
      .then(async data => {
        if (data.valid) {
          setPayload({ role: data.role, project_id: data.project_id, exp: 0, v: 2 })
          setStatus('valid')
          // Fetch project name for display
          if (data.project_id) {
            // Use a public-friendly fetch that doesn't require auth
            const p = JSON.parse(Buffer.from(token, 'base64url').toString('utf-8'))
            setPayload(p)
          }
        } else if (data.error?.includes('expired')) {
          setStatus('expired')
        } else {
          setStatus('invalid')
        }
      })
      .catch(() => setStatus('invalid'))
  }, [token])

  // Once we have a session, fetch the project name for the valid state display
  useEffect(() => {
    if (!payload?.project_id) return
    supabase.from('projects').select('name').eq('id', payload.project_id).single()
      .then(({ data }) => { if (data) setProjectName(data.name) })
  }, [payload?.project_id])

  async function addToProject(userId: string, role: 'admin' | 'member', projectId: string) {
    await supabase.from('project_members').upsert(
      { project_id: projectId, user_id: userId, role },
      { onConflict: 'project_id,user_id' }
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!payload) return
    setError(''); setSubmitting(true)

    const { role, project_id } = payload

    if (mode === 'register') {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { name, full_name: name, role } },
      })
      if (error) {
        setError(error.message)
      } else if (data.session) {
        await supabase.from('profiles').upsert({ id: data.session.user.id, name, role })
        await addToProject(data.session.user.id, role, project_id)
        router.push('/dashboard')
        return
      } else {
        setSuccess('Check your email to confirm your account, then sign in here.')
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message === 'Invalid login credentials' ? 'Wrong email or password.' : error.message)
      } else if (data.session) {
        // Update profile role if elevated to admin
        if (role === 'admin') {
          await supabase.from('profiles').update({ role }).eq('id', data.session.user.id)
        }
        await addToProject(data.session.user.id, role, project_id)
        router.push('/dashboard')
        return
      }
    }
    setSubmitting(false)
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0052CC]" />
      </div>
    )
  }

  if (status === 'invalid' || status === 'expired') {
    return (
      <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-[#DFE1E6] p-8 max-w-md w-full text-center shadow-lg">
          <div className="w-14 h-14 rounded-full bg-[#FFEBE6] flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-[#DE350B]" />
          </div>
          <h2 className="text-xl font-bold text-[#172B4D] mb-2">
            {status === 'expired' ? 'Invite link expired' : 'Invalid invite link'}
          </h2>
          <p className="text-sm text-[#5E6C84] mb-6">
            {status === 'expired'
              ? 'This invite link has expired. Ask your admin to send a new one.'
              : 'This invite link is invalid or has already been used.'}
          </p>
          <button onClick={() => router.push('/')} className="btn-primary mx-auto">
            Go to home page
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#DFE1E6] w-full max-w-md shadow-xl overflow-hidden">

        {/* Header */}
        <div className="px-8 py-7 text-center"
          style={{ background: 'linear-gradient(135deg, #0052CC 0%, #0065FF 100%)' }}>
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 28 28" className="w-7 h-7" fill="none">
                <path d="M14 2L3 13l5 5 6-6 6 6 5-5L14 2z" fill="white" opacity="0.9" />
                <path d="M14 26L3 15l5-5 6 6 6-6 5 5-11 11z" fill="white" opacity="0.6" />
              </svg>
            </div>
          </div>
          <h1 className="text-xl font-black text-white">You've been invited to Sethu</h1>
          {projectName && (
            <p className="text-white/70 text-sm mt-1">
              Project: <span className="font-semibold text-white">{projectName}</span>
            </p>
          )}
          <p className="text-white/60 text-sm mt-1">
            You'll join as a{' '}
            <span className={clsx(
              'font-semibold px-1.5 py-0.5 rounded text-xs',
              payload?.role === 'admin' ? 'bg-amber-400/30 text-yellow-200' : 'bg-white/20 text-white',
            )}>
              {payload?.role ?? 'member'}
            </span>
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex border-b border-[#DFE1E6]">
          {(['register', 'login'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={clsx(
                'flex-1 py-3 text-sm font-semibold transition-all border-b-2',
                mode === m ? 'border-[#0052CC] text-[#0052CC]' : 'border-transparent text-[#5E6C84] hover:text-[#172B4D]',
              )}>
              {m === 'register' ? 'Create account' : 'I already have an account'}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="px-8 py-6">
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-[#5E6C84] mb-1.5">Full Name</label>
                <input className="input" type="text" placeholder="John Doe"
                  value={name} onChange={e => setName(e.target.value)} required autoFocus />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-[#5E6C84] mb-1.5">Email</label>
              <input className="input" type="email" placeholder="you@company.com"
                value={email} onChange={e => setEmail(e.target.value)} required autoFocus={mode === 'login'} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5E6C84] mb-1.5">Password</label>
              <div className="relative">
                <input className="input pr-11" type={showPass ? 'text' : 'password'}
                  placeholder="Min. 6 characters" value={password}
                  onChange={e => setPassword(e.target.value)} required minLength={6} />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#97A0AF] hover:text-[#42526E]">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-[#FFEBE6] text-[#DE350B] px-3 py-2.5 rounded-lg text-sm">
                <span>⚠️</span><span>{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2 bg-[#E3FCEF] text-[#006644] px-3 py-2.5 rounded-lg text-sm">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{success}</span>
              </div>
            )}

            <button type="submit" disabled={submitting}
              className="w-full py-2.5 font-bold rounded-lg text-white text-sm transition-all disabled:opacity-60"
              style={{ background: '#0052CC' }}>
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {mode === 'register' ? 'Creating account…' : 'Signing in…'}
                </span>
              ) : (
                mode === 'register' ? 'Accept invite & join' : 'Sign in & join project'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function InvitePageWrapper() {
  return (
    <Suspense>
      <InvitePage />
    </Suspense>
  )
}
