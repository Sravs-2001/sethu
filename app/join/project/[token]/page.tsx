'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { CheckCircle, XCircle, Loader2, ArrowRight, Users } from 'lucide-react'
import ArrowheadIcon from '@/components/ui/ArrowheadIcon'

interface TokenInfo {
  project_id: string
  role: 'admin' | 'member'
  expires_at: string | null
  project?: { name: string; key: string; avatar_color: string }
}

export default function JoinProjectPage() {
  const { token }  = useParams<{ token: string }>()
  const router     = useRouter()

  const [status, setStatus]     = useState<'loading' | 'ready' | 'joining' | 'joined' | 'error' | 'expired'>('loading')
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)
  const [errorMsg, setErrorMsg]  = useState('')
  const [authed, setAuthed]      = useState(false)
  const [userId, setUserId]      = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      // Check auth state
      const { data: { session } } = await supabase.auth.getSession()
      setAuthed(!!session)
      setUserId(session?.user?.id ?? null)

      // Load token info
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

      // Check expiry
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setStatus('expired')
        return
      }

      setTokenInfo(data as TokenInfo)
      setStatus('ready')
    }
    init()
  }, [token])

  async function handleJoin() {
    if (!userId || !tokenInfo) return
    setStatus('joining')

    // Use server-side API to bypass RLS and validate token properly
    const res = await fetch('/api/invite/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })

    if (!res.ok) {
      const body = await res.json()
      setStatus('error')
      setErrorMsg(body.error ?? 'Failed to join project.')
      return
    }

    setStatus('joined')
    setTimeout(() => router.push('/dashboard'), 1800)
  }

  function handleSignIn() {
    // Redirect to home with invite link stored
    router.push(`/?invite_token=${token}`)
  }

  const project = tokenInfo?.project

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#0A0E1A' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-[#0052CC] flex items-center justify-center shadow-lg shadow-blue-900/50">
            <ArrowheadIcon className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-xl font-black">sethu</span>
        </div>

        <div className="bg-white rounded-2xl overflow-hidden shadow-2xl" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#0052CC]" />
              <p className="text-sm text-[#5E6C84]">Loading invite…</p>
            </div>
          )}

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

          {(status === 'ready' || status === 'joining') && project && (
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
                <span className="mt-2 text-xs px-2.5 py-1 rounded-full font-semibold capitalize"
                  style={{
                    background: tokenInfo?.role === 'admin' ? '#FFFAE6' : '#DEEBFF',
                    color:      tokenInfo?.role === 'admin' ? '#974F0C' : '#0052CC',
                  }}>
                  Join as {tokenInfo?.role}
                </span>
              </div>

              {authed ? (
                <button onClick={handleJoin} disabled={status === 'joining'}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-white rounded-xl transition-all disabled:opacity-60"
                  style={{ background: '#0052CC' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#0065FF'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#0052CC'}>
                  {status === 'joining'
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Joining…</>
                    : <>Join project <ArrowRight className="w-4 h-4" /></>}
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-[#5E6C84] text-center">Sign in or create an account to join this project.</p>
                  <button onClick={handleSignIn}
                    className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-white rounded-xl"
                    style={{ background: '#0052CC' }}>
                    Sign in to join <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

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
        </div>
      </div>
    </div>
  )
}
