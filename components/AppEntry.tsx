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

// admin → AdminLayout by default, member → UserLayout directly
type AppMode = 'loading' | 'create-project' | 'admin' | 'user'

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

    // 1. Try existing profile
    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    let profile: Profile
    if (existing) {
      profile = existing
      setUser(existing)
    } else {
      // 2. Create new profile — direct signup always gets admin
      const meta       = authUser.user_metadata ?? {}
      const name       = meta.full_name || meta.name || meta.user_name || authUser.email?.split('@')[0] || 'User'
      const avatar_url = meta.avatar_url || meta.picture || null
      const role: 'admin' | 'member' = (meta.role as 'admin' | 'member') || 'admin'

      const { data: created } = await supabase
        .from('profiles')
        .upsert({ id: userId, name, avatar_url, role })
        .select()
        .single()

      profile = created ?? { id: userId, name, avatar_url, role, created_at: new Date().toISOString() }
      setUser(profile)
    }

    setUserRole(profile.role)

    // 3. Load only projects this user is a member of
    await checkProject(profile.role, userId)
  }

  async function checkProject(role: 'admin' | 'member', userId: string) {
    // Try loading via project_members (project-scoped access)
    const { data: memberships, error: pmError } = await supabase
      .from('project_members')
      .select('project_id, projects(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    // If project_members table doesn't exist yet, fall back to all projects (migration pending)
    if (pmError && (pmError.code === 'PGRST116' || pmError.message?.includes('does not exist') || pmError.message?.includes('relation'))) {
      console.warn('project_members table not found — falling back to all projects. Run /api/setup to migrate.')
      const { data: allProjects, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) { setAppMode('create-project'); return }
      if (allProjects && allProjects.length > 0) {
        setProjects(allProjects as Project[])
        setProject(allProjects[0] as Project)
        setAppMode(role === 'admin' ? 'admin' : 'user')
      } else {
        setAppMode('create-project')
      }
      return
    }

    const myProjects = (memberships ?? [])
      .map((m: any) => m.projects)
      .filter(Boolean) as Project[]

    if (myProjects.length > 0) {
      setProjects(myProjects)
      setProject(myProjects[0])
      setAppMode(role === 'admin' ? 'admin' : 'user')
    } else {
      // No projects yet — admin can create one, member sees empty state
      setAppMode(role === 'admin' ? 'admin' : 'create-project')
    }
  }

  // Admin created the first project → jump to admin layout
  function handleProjectCreated(project: Project) {
    setProjects([project])
    setProject(project)
    setAppMode(userRole === 'admin' ? 'admin' : 'user')
  }

  // Admin clicks "Open project" in the admin panel → enter user layout
  function handleEnterProject(project: Project) {
    setProject(project)
    setBugs([])
    setFeatures([])
    setSprints([])
    setAppMode('user')
  }

  // Admin clicks "Back to Admin Panel" → return to admin layout
  function handleBackToAdmin() {
    setAppMode('admin')
  }

  // ── Render ──────────────────────────────────────────────────────
  if (appMode === 'loading') {
    return (
      <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#0052CC] border-t-transparent animate-spin" />
          <p className="text-sm text-[#5E6C84]">Loading…</p>
        </div>
      </div>
    )
  }

  if (appMode === 'create-project') {
    return <CreateProject onCreated={handleProjectCreated} />
  }

  if (appMode === 'admin') {
    return <AdminLayout onEnterProject={handleEnterProject} />
  }

  // user mode — admins get a "back to admin" bar, members don't
  return (
    <AppLayout onBackToAdmin={userRole === 'admin' ? handleBackToAdmin : undefined} />
  )
}
