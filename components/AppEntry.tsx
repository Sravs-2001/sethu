'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import AppLayout from './Layout/AppLayout'
import AdminLayout from './Admin/AdminLayout'
import CreateProject from './Project/CreateProject'
import type { Profile, Project } from '@/types'
import JiraLogo from '@/components/ui/JiraLogo'

type AppMode = 'loading' | 'create-project' | 'admin' | 'user' | 'no-access'

export default function AppEntry() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const {
    setUser, setProject, setProjects,
    setBugs, setFeatures, setSprints,
    channels, setActiveChannel, setActiveView,
  } = useStore()

  const [appMode, setAppMode]   = useState<AppMode>('loading')
  const [userRole, setUserRole] = useState<'admin' | 'member'>('member')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadProfile(session.user)
      else router.push('/')
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) router.push('/')
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

  async function loadProfile(authUser: User) {
    const userId = authUser.id
    const meta   = authUser.user_metadata ?? {}

    // Single upsert: creates on first login, returns existing on subsequent logins
    // onConflict keeps the existing row (preserves any manual role changes)
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

    if (!profile) {
      // Fallback: fetch existing profile if upsert returned nothing
      const { data: existing } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (existing) {
        setUser(existing)
        setUserRole(existing.role)
        await checkProject(existing)
      }
      return
    }

    setUser(profile)
    setUserRole(profile.role)
    await checkProject(profile)
  }

  async function checkProject(profile: Profile) {
    const { id: userId } = profile

    // Run both queries in parallel to avoid sequential round trips
    const [{ data: memberships }, { data: owned }] = await Promise.all([
      // 1. Projects where this user was EXPLICITLY invited
      supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', userId),
      // 2. Projects this user created (always visible)
      supabase
        .from('projects')
        .select('id')
        .eq('created_by', userId),
    ])

    const memberIds = (memberships ?? []).map((m: any) => m.project_id)
    const ownedIds  = (owned ?? []).map((p: any) => p.id)

    const projectIds = Array.from(new Set([...memberIds, ...ownedIds]))

    if (projectIds.length === 0) {
      setAppMode('create-project')
      return
    }

    const { data: myProjects } = await supabase
      .from('projects')
      .select('*')
      .in('id', projectIds)
      .order('created_at', { ascending: true })

    if (myProjects && myProjects.length > 0) {
      setProjects(myProjects as Project[])
      setProject(myProjects[0] as Project)
      setAppMode('user')
    } else {
      setAppMode('create-project')
    }
  }

  function handleProjectCreated(project: Project) {
    setProjects([project])
    setProject(project)
    setAppMode('user')
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
            onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
            className="text-sm text-[#0052CC] hover:underline font-medium"
          >
            Sign out
          </button>
        </div>
      </div>
    )
  }

  if (appMode === 'create-project') {
    return <CreateProject onCreated={handleProjectCreated} />
  }

  if (appMode === 'admin') {
    return <AdminLayout onEnterProject={handleEnterProject} onBackToProjects={handleBackToProjects} />
  }

  return (
    <AppLayout
      onGoToAdmin={userRole === 'admin' ? handleBackToAdmin : undefined}
    />
  )
}
