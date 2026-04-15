'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import AppLayout from './AppLayout'
import type { Profile, Project } from '@/types'
import JiraLogo from '@/components/ui/JiraLogo'

// ── Loading screen ────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#1D2125' }}>
      <div className="flex flex-col items-center gap-4">
        <JiraLogo size={48} />
        <span className="text-white font-black text-xl tracking-tight">sethu</span>
        <div className="w-5 h-5 rounded-full border-2 border-[#2684FF] border-t-transparent animate-spin" />
        <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Loading workspace…
        </p>
      </div>
    </div>
  )
}

// ── No access screen ─────────────────────────────────────────────────────────
function NoAccessScreen({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 max-w-sm text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-white border border-[#DFE1E6] flex items-center justify-center shadow-sm">
          <JiraLogo size={36} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#172B4D] mb-1">No projects yet</h2>
          <p className="text-sm text-[#5E6C84]">
            You haven't been added to any projects. Ask your admin to invite you.
          </p>
        </div>
        <button onClick={onSignOut} className="text-sm text-[#0052CC] hover:underline font-medium">
          Sign out
        </button>
      </div>
    </div>
  )
}

// ── AppShell ──────────────────────────────────────────────────────────────────
export default function AppShell({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()

  const {
    user, setUser,
    project, setProject, setProjects,
    setBugs, setFeatures, setSprints,
    channels, setActiveChannel,
    setActiveView,
  } = useStore()

  const [status, setStatus] = useState<'loading' | 'ready' | 'no-access'>('loading')

  // ── Auth init ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // If already authenticated (navigating between views), skip re-auth
    if (user) { setStatus('ready'); return }

    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser) { router.push('/'); return }
      loadProfile(authUser)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.push('/')
    })
    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Sync URL path → activeView (for store consumers that still read it) ────
  useEffect(() => {
    const segment = pathname.split('/').filter(Boolean).pop() ?? 'summary'
    const map: Record<string, ReturnType<typeof setActiveView extends (v: infer V) => void ? () => V : never>> = {
      summary:  'board',
      board:    'bugs',
      backlog:  'backlog',
      features: 'features',
      chat:     'chat',
      people:   'team',
      reports:  'reports',
      settings: 'settings',
      projects: 'projects',
    } as any
    const view = (map as any)[segment]
    if (view) setActiveView(view)
  }, [pathname, setActiveView])

  // ── Redeem pending invite (after email confirmation) ─────────────────────
  async function redeemPendingInvite() {
    const token = localStorage.getItem('pending_invite_token')
    if (!token) return
    localStorage.removeItem('pending_invite_token')
    await fetch('/api/invite/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
  }

  // ── Profile + project loading ────────────────────────────────────────���───
  async function loadProfile(authUser: User) {
    const userId = authUser.id
    const meta   = authUser.user_metadata ?? {}

    const { data: profile } = await supabase
      .from('profiles')
      .upsert(
        {
          id:         userId,
          name:       meta.full_name || meta.name || meta.user_name || authUser.email?.split('@')[0] || 'User',
          avatar_url: meta.avatar_url || meta.picture || null,
          role:       (meta.role as 'admin' | 'member') || 'member',
        },
        { onConflict: 'id', ignoreDuplicates: true }
      )
      .select()
      .single()

    const resolved: Profile | null = profile ?? await supabase
      .from('profiles').select('*').eq('id', userId).single()
      .then(({ data }) => data)

    const fallback: Profile = {
      id:         userId,
      name:       meta.full_name || meta.name || authUser.email?.split('@')[0] || 'User',
      avatar_url: undefined,
      role:       'member',
      created_at: new Date().toISOString(),
    }

    const finalProfile = resolved ?? fallback
    setUser(finalProfile)

    await redeemPendingInvite()
    await loadProjects(finalProfile)
  }

  async function loadProjects(profile: Profile) {
    const [{ data: memberships }, { data: owned }] = await Promise.all([
      supabase.from('project_members').select('project_id').eq('user_id', profile.id),
      supabase.from('projects').select('id').eq('created_by', profile.id),
    ])

    const ids = Array.from(new Set([
      ...(memberships ?? []).map((m: any) => m.project_id),
      ...(owned       ?? []).map((p: any) => p.id),
    ]))

    if (ids.length === 0) {
      setProjects([])
      setStatus('ready')
      router.replace('/dashboard/projects')
      return
    }

    const { data: myProjects } = await supabase
      .from('projects').select('*').in('id', ids).order('created_at', { ascending: true })

    if (myProjects && myProjects.length > 0) {
      setProjects(myProjects as Project[])
      setProject(myProjects[0] as Project)
    }

    setStatus('ready')
  }

  // ── Sign out ──────────────────────────────────────────────────────────────
  async function handleSignOut() {
    await supabase.auth.signOut()
    setUser(null)
    router.push('/')
  }

  // ── Channel join via ?join= param ─────────────────────────────────────────
  useEffect(() => {
    if (status !== 'ready') return
    const params = new URLSearchParams(window.location.search)
    const joinTarget = params.get('join')
    if (!joinTarget || channels.length === 0) return
    const ch = channels.find(c => c.name === joinTarget)
    if (ch) { setActiveChannel(ch); router.replace('/dashboard/chat') }
  }, [status, channels])

  // ── Render ────────────────────────────────────────────────────────────────
  if (status === 'loading') return <LoadingScreen />
  if (status === 'no-access') return <NoAccessScreen onSignOut={handleSignOut} />

  return <AppLayout onSignOut={handleSignOut}>{children}</AppLayout>
}
