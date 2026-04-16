'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { authService, profileService, projectService } from '@/lib/services'
import { useStore } from '@/store/useStore'
import AppLayout from './Layout/AppLayout'
import AdminLayout from './Admin/AdminLayout'
import type { Profile, Project } from '@/types'
import JiraLogo from '@/components/ui/JiraLogo'
import { supabase } from '@/lib/supabase/client'

type AppMode = 'loading' | 'admin' | 'user' | 'no-access'

export default function AppEntry({ children }: { children?: React.ReactNode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const {
    setUser, setProject, setProjects,
    setBugs, setFeatures, setSprints,
    channels, setActiveChannel, setActiveView,
  } = useStore()

  const [appMode, setAppMode] = useState<AppMode>('loading')
  const [userRole, setUserRole] = useState<'admin' | 'member'>('member')

  useEffect(() => {
    authService.getUser().then(({ data: { user } }) => {
      if (user) loadProfile(user)
      else router.push('/')
    })

    const { data: { subscription } } = authService.onAuthStateChange(async (event, _session) => {
      if (event === 'SIGNED_OUT') router.push('/')
    })
    return () => subscription.unsubscribe()
  }, [])

  // Handle ?join=channelName invite links
  useEffect(() => {
    const joinTarget = searchParams.get('join')
    if (!joinTarget || channels.length === 0) return
    const ch = channels.find(c => c.name === joinTarget)
    if (ch) {
      setActiveChannel(ch)
      setActiveView('chat')
      router.replace('/dashboard')
    }
  }, [channels, searchParams])

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

  async function loadProfile(authUser: User) {
    const userId = authUser.id
    const meta = authUser.user_metadata ?? {}

    // Single upsert: creates on first login, returns existing on subsequent logins
    // onConflict keeps the existing row (preserves any manual role changes)
    const { data: profile } = await supabase
      .from('profiles')
      .upsert(
        {
          id: userId,
          name: meta.full_name || meta.name || meta.user_name || authUser.email?.split('@')[0] || 'User',
          avatar_url: meta.avatar_url || meta.picture || null,
          role: (meta.role as 'admin' | 'member') || 'member',
        },
        { onConflict: 'id', ignoreDuplicates: true }
      )
      .select()
      .single()

    if (!profile) {
      // Fallback: fetch existing profile if upsert returned nothing
      const { data: existing } = await profileService.getById(userId)
      if (existing) {
        setUser(existing)
        setUserRole(existing.role)
        await redeemPendingInvite()
        await checkProject(existing)
      } else {
        // Still no profile — use minimal info from auth so the app doesn't hang on loading
        const fallback = {
          id: userId,
          name: meta.full_name || meta.name || meta.user_name || authUser.email?.split('@')[0] || 'User',
          avatar_url: null,
          role: 'member' as const,
        }
        setUser(fallback as any)
        await redeemPendingInvite()
        await checkProject(fallback as any)
      }
      return
    }

    setUser(profile)
    setUserRole(profile.role)
    await redeemPendingInvite()
    await checkProject(profile)
  }

  async function checkProject(_profile: Profile) {
    try {
      const res = await fetch('/api/projects/mine')
      if (res.ok) {
        const { projects: myProjects } = await res.json()
        if (myProjects && myProjects.length > 0) {
          setProjects(myProjects as Project[])
          setProject(myProjects[0] as Project)
          setAppMode('user')
          return
        }
      }
    } catch { /* fall through */ }

    setProjects([])
    setActiveView('projects')
    setAppMode('user')
    router.push('/dashboard/projects')
  }

  function handleEnterProject(project: Project) {
    setProject(project)
    setBugs([])
    setFeatures([])
    setSprints([])
    setAppMode('user')
  }

  function handleBackToAdmin() {
    setAppMode('admin')
  }

  function handleBackToProjects() {
    setAppMode('user')
  }

  // ── Render ──────────────────────────────────────────────────────
  if (appMode === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1D2125' }}>
        <div className="flex flex-col items-center gap-4">
          <JiraLogo size={48} />
          <div className="flex items-center gap-2 mt-1">
            <span className="text-white font-black text-xl tracking-tight">sethu</span>
          </div>
          <div className="w-5 h-5 rounded-full border-2 border-[#2684FF] border-t-transparent animate-spin mt-2" />
          <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>Loading workspace…</p>
        </div>
      </div>
    )
  }

  if (appMode === 'no-access') {
    return (
      <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-white border border-[#DFE1E6] flex items-center justify-center shadow-sm">
            <JiraLogo size={36} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#172B4D] mb-1">No projects yet</h2>
            <p className="text-sm text-[#5E6C84]">
              You haven't been added to any projects. Ask your project admin to invite you using an invite link.
            </p>
          </div>
          <button
            onClick={async () => { await authService.signOut(); router.push('/') }}
            className="text-sm text-[#0052CC] hover:underline font-medium"
          >
            Sign out
          </button>
        </div>
      </div>
    )
  }

  if (appMode === 'admin') {
    return <AdminLayout onEnterProject={handleEnterProject} onBackToProjects={handleBackToProjects} />
  }

  return (
    <AppLayout
      onSignOut={async () => { await authService.signOut(); router.push('/') }}
      onGoToAdmin={userRole === 'admin' ? handleBackToAdmin : undefined}
    >
      {children ?? <div />}
    </AppLayout>
  )
}
