'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import { useRouter } from 'next/navigation'
import Sidebar from './Sidebar'
import Dashboard from '@/components/Dashboard/Dashboard'
import BugBoard from '@/components/Bugs/BugBoard'
import FeatureList from '@/components/Features/FeatureList'
import SprintBoard from '@/components/Sprint/SprintBoard'
import ChatPanel from '@/components/Chat/ChatPanel'
import TeamView from '@/components/Team/TeamView'
import ArrowheadIcon from '@/components/ui/ArrowheadIcon'
import type { View } from '@/types'
import {
  Bell, HelpCircle, ChevronDown, LogOut, Shield,
  Search, Plus, X,
} from 'lucide-react'
import clsx from 'clsx'

const VIEW_LABELS: Record<View, string> = {
  board:    'Board',
  backlog:  'Backlog',
  bugs:     'Issues',
  features: 'Features',
  chat:     'Chat',
  team:     'People',
}

function GlobalCreateModal({ onClose }: { onClose: () => void }) {
  const { setActiveView } = useStore()
  const options = [
    { label: 'Issue',   icon: '🐛', desc: 'Bug, task, story or epic', view: 'bugs' as View },
    { label: 'Feature', icon: '✨', desc: 'New feature request',      view: 'features' as View },
    { label: 'Sprint',  icon: '🚀', desc: 'Sprint planning board',    view: 'backlog' as View },
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-28"
      style={{ background: 'rgba(9,30,66,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-80 overflow-hidden shadow-2xl"
        style={{ border: '1px solid #DFE1E6' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#F4F5F7]">
          <span className="text-sm font-bold text-[#172B4D]">Create</span>
          <button onClick={onClose} className="p-1 rounded hover:bg-[#F4F5F7] text-[#7A869A]"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-2">
          {options.map(({ label, icon, desc, view }) => (
            <button key={label}
              onClick={() => { setActiveView(view); onClose() }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left hover:bg-[#F4F5F7] transition-colors group">
              <span className="text-xl w-8 text-center">{icon}</span>
              <div>
                <div className="text-sm font-semibold text-[#172B4D] group-hover:text-[#0052CC] transition-colors">{label}</div>
                <div className="text-xs text-[#7A869A]">{desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function GlobalTopNav({ onGoToAdmin }: { onGoToAdmin?: () => void }) {
  const { user, setUser, project, activeView } = useStore()
  const router = useRouter()
  const [userMenuOpen, setUserMenuOpen]   = useState(false)
  const [createOpen, setCreateOpen]       = useState(false)
  const [searchOpen, setSearchOpen]       = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setUserMenuOpen(false)
    }
    if (userMenuOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [userMenuOpen])

  // Keyboard shortcut: 'c' to open create
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'c' && !e.metaKey && !e.ctrlKey && !['INPUT','TEXTAREA'].includes((e.target as Element)?.tagName))
        setCreateOpen(true)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut(); setUser(null); router.push('/')
  }

  return (
    <>
      <header className="flex-shrink-0 flex items-center px-3 h-12 z-40"
        style={{ background: '#1D2125', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>

        {/* Logo */}
        <div className="flex items-center gap-2 px-2 mr-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#0052CC' }}>
            <ArrowheadIcon className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-black text-sm tracking-tight hidden sm:block">sethu</span>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-md text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
          <span className="hidden md:block">Projects</span>
          <span className="hidden md:block mx-1" style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
          <span className="font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>{project?.name ?? 'Project'}</span>
          <span className="mx-1" style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
          <span>{VIEW_LABELS[activeView]}</span>
        </div>

        <div className="flex-1" />

        {/* Right actions */}
        <div className="flex items-center gap-1">
          {/* Global Create button — Jira style */}
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all mr-1"
            style={{ background: '#0052CC', color: 'white' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#0065FF'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#0052CC'}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create</span>
          </button>

          {/* Search */}
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors"
            style={{ color: 'rgba(255,255,255,0.6)' }}
            onClick={() => setSearchOpen(true)}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
            <Search className="w-3.5 h-3.5" />
            <span className="hidden lg:block">Search</span>
          </button>

          {/* Help */}
          <button className="p-1.5 rounded-md transition-colors"
            style={{ color: 'rgba(255,255,255,0.6)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Notifications */}
          <button className="p-1.5 rounded-md transition-colors relative"
            style={{ color: 'rgba(255,255,255,0.6)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
            <Bell className="w-4 h-4" />
          </button>

          {/* User menu */}
          <div className="relative ml-1" ref={menuRef}>
            <button onClick={() => setUserMenuOpen(o => !o)}
              className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-md transition-colors"
              onMouseEnter={e => !userMenuOpen && ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)')}
              onMouseLeave={e => !userMenuOpen && ((e.currentTarget as HTMLElement).style.background = '')}
              style={userMenuOpen ? { background: 'rgba(255,255,255,0.12)' } : {}}>
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: '#0052CC' }}>
                  {user?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
              <span className="text-xs font-medium hidden md:block" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {user?.name?.split(' ')[0] ?? 'User'}
              </span>
              <ChevronDown className="w-3 h-3 hidden md:block" style={{ color: 'rgba(255,255,255,0.4)' }} />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl overflow-hidden z-50"
                style={{ border: '1px solid #DFE1E6', boxShadow: '0 8px 24px rgba(9,30,66,0.18)' }}>
                <div className="px-3 py-3 border-b border-[#F4F5F7]">
                  <div className="flex items-center gap-2">
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold bg-[#0052CC]">
                        {user?.name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-semibold text-[#172B4D]">{user?.name}</div>
                      <div className="text-xs text-[#626F86] capitalize flex items-center gap-1">
                        {user?.role === 'admin' && <Shield className="w-3 h-3 text-amber-500" />}
                        {user?.role}
                      </div>
                    </div>
                  </div>
                </div>
                {onGoToAdmin && (
                  <button onClick={() => { setUserMenuOpen(false); onGoToAdmin() }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#172B4D] hover:bg-[#F4F5F7] transition-colors">
                    <Shield className="w-3.5 h-3.5 text-amber-500" />
                    Admin Panel
                  </button>
                )}
                <button onClick={() => { setUserMenuOpen(false); handleLogout() }}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-[#DE350B] hover:bg-[#FFEBE6] transition-colors">
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {createOpen && <GlobalCreateModal onClose={() => setCreateOpen(false)} />}
    </>
  )
}

export default function AppLayout({ onGoToAdmin }: { onGoToAdmin?: () => void }) {
  const { activeView, setProfiles, setProjectMembers, setChannels, setActiveChannel, project } = useStore()

  useEffect(() => {
    if (!project?.id) return

    supabase
      .from('project_members')
      .select('*, profile:profiles(*)')
      .eq('project_id', project.id)
      .then(({ data }) => {
        if (data) {
          setProjectMembers(data)
          const profiles = data.map((m: any) => m.profile).filter(Boolean)
          setProfiles(profiles)
        }
      })

    supabase.from('channels').select('*').order('name').then(({ data }) => {
      if (data) { setChannels(data); if (data.length > 0) setActiveChannel(data[0]) }
    })
  }, [project?.id])

  const isChatView = activeView === 'chat'

  const viewContent: Record<string, JSX.Element> = {
    board:    <Dashboard />,
    backlog:  <SprintBoard />,
    bugs:     <BugBoard />,
    features: <FeatureList />,
    team:     <TeamView />,
  }

  return (
    <div className="h-screen flex flex-col bg-[#F4F5F7]">
      <GlobalTopNav onGoToAdmin={onGoToAdmin} />
      <div className="flex flex-1 min-h-0">
        <Sidebar onGoToAdmin={onGoToAdmin} />
        <main className="flex-1 flex min-w-0 overflow-hidden">
          {isChatView ? (
            <ChatPanel fullWidth />
          ) : (
            <div className="flex-1 overflow-y-auto min-w-0">
              {viewContent[activeView] ?? <Dashboard />}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
