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
import ProjectsPage from '@/components/Project/ProjectsPage'
import ProjectSettings from '@/components/Project/ProjectSettings'
import Reports from '@/components/Dashboard/Reports'
import JiraLogo from '@/components/ui/JiraLogo'
import type { View, Project } from '@/types'
import {
  Bell, HelpCircle, ChevronDown, LogOut, Shield,
  Search, Plus, X, Settings, Check, Loader2,
  LayoutGrid, ChevronRight,
} from 'lucide-react'
import clsx from 'clsx'

const AVATAR_COLORS = [
  '#0052CC','#6554C0','#00B8D9','#36B37E',
  '#FF5630','#FF991F','#172B4D','#403294',
]

function toKey(name: string) {
  return name.toUpperCase().replace(/[^A-Z0-9\s]/g,'').trim()
    .split(/\s+/).map(w => w[0]).join('').slice(0,4) || 'PROJ'
}

// ── Quick Create Modal ──────────────────────────────────────────────
function GlobalCreateModal({ onClose }: { onClose: () => void }) {
  const { setActiveView } = useStore()
  const options = [
    { label: 'Issue',   icon: '🐛', desc: 'Bug, task, story or epic', view: 'bugs'    as View },
    { label: 'Feature', icon: '✨', desc: 'New feature request',      view: 'features' as View },
    { label: 'Sprint',  icon: '🚀', desc: 'Sprint planning board',    view: 'backlog'  as View },
    { label: 'Project', icon: '📁', desc: 'New software project',     view: 'projects' as View },
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-28"
      style={{ background: 'rgba(9,30,66,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-80 overflow-hidden shadow-2xl border border-[#DFE1E6]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#F4F5F7]">
          <span className="text-sm font-bold text-[#172B4D]">Create</span>
          <button onClick={onClose} className="p-1 rounded hover:bg-[#F4F5F7] text-[#7A869A]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-2">
          {options.map(({ label, icon, desc, view }) => (
            <button key={label}
              onClick={() => { setActiveView(view); onClose() }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left hover:bg-[#F4F5F7] transition-colors group">
              <span className="text-xl w-8 text-center">{icon}</span>
              <div>
                <div className="text-sm font-semibold text-[#172B4D] group-hover:text-[#0052CC]">{label}</div>
                <div className="text-xs text-[#7A869A]">{desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Projects Dropdown (top nav) ─────────────────────────────────────
function ProjectsDropdown({ onClose }: { onClose: () => void }) {
  const { projects, project: active, setProject, setActiveView, setBugs, setFeatures, setSprints } = useStore()

  function switchProject(p: Project) {
    setProject(p); setBugs([]); setFeatures([]); setSprints([])
    setActiveView('board')
    onClose()
  }

  return (
    <div className="absolute left-0 top-full mt-1 w-72 bg-white rounded-lg overflow-hidden z-50"
      style={{ border: '1px solid #DFE1E6', boxShadow: '0 8px 24px rgba(9,30,66,0.18)' }}>

      <div className="px-3 pt-3 pb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#626F86]">Recent projects</span>
      </div>

      {projects.slice(0, 6).map(p => (
        <button key={p.id} onClick={() => switchProject(p)}
          className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-[#F1F2F4] transition-colors">
          <div className="w-7 h-7 rounded flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
            style={{ backgroundColor: p.avatar_color }}>
            {p.key.slice(0,2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-[#172B4D] truncate">{p.name}</div>
            <div className="text-[11px] text-[#626F86]">Software project</div>
          </div>
          {active?.id === p.id && <Check className="w-3.5 h-3.5 text-[#0052CC] flex-shrink-0" />}
        </button>
      ))}

      <div className="h-px mx-3 bg-[#DFE1E6] my-1" />

      <button
        onClick={() => { setActiveView('projects'); onClose() }}
        className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium text-[#172B4D] hover:bg-[#F1F2F4] transition-colors">
        <span>View all projects</span>
        <ChevronRight className="w-3.5 h-3.5 text-[#626F86]" />
      </button>

      <button
        onClick={() => { setActiveView('projects'); onClose() }}
        className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-semibold text-[#0052CC] hover:bg-[#F1F2F4] transition-colors border-t border-[#F4F5F7]">
        <Plus className="w-3.5 h-3.5" />
        Create project
      </button>
    </div>
  )
}

// ── Top Navigation ──────────────────────────────────────────────────
function GlobalTopNav({ onGoToAdmin }: { onGoToAdmin?: () => void }) {
  const { user, setUser, project, setActiveView, activeView } = useStore()
  const router = useRouter()
  const [userMenuOpen,    setUserMenuOpen]    = useState(false)
  const [createOpen,      setCreateOpen]      = useState(false)
  const [projectsDropOpen, setProjectsDropOpen] = useState(false)
  const [searchOpen,      setSearchOpen]      = useState(false)

  const menuRef     = useRef<HTMLDivElement>(null)
  const projDropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setUserMenuOpen(false)
      if (projDropRef.current && !projDropRef.current.contains(e.target as Node)) setProjectsDropOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Keyboard shortcut: 'c' to create
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

  // Global nav only — project-specific nav lives in the sidebar
  type NavItem = { label: string; view?: View; hasDropdown?: boolean }
  const navItems: NavItem[] = [
    { label: 'Your work',   view: 'board'    },
    { label: 'Projects',    hasDropdown: true },
    { label: 'Dashboards',  view: 'reports'  },
  ]

  return (
    <>
      <header className="flex-shrink-0 flex items-center px-2 h-12 z-40 gap-1"
        style={{ background: '#1D2125', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Logo */}
        <div className="flex items-center gap-2 px-2 mr-1 flex-shrink-0 select-none">
          <JiraLogo size={26} />
          <span className="text-white font-black text-sm tracking-tight hidden sm:block">
            sethu
          </span>
        </div>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-0.5">
          {navItems.map(item => {
            const isActive = item.view ? activeView === item.view : false
            if (item.hasDropdown) {
              return (
                <div key={item.label} className="relative" ref={projDropRef}>
                  <button
                    onClick={() => setProjectsDropOpen(o => !o)}
                    className={clsx(
                      'flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-colors',
                      projectsDropOpen
                        ? 'bg-[rgba(255,255,255,0.16)] text-white'
                        : 'text-[rgba(255,255,255,0.72)] hover:bg-[rgba(255,255,255,0.1)] hover:text-white'
                    )}>
                    {item.label}
                    <ChevronDown className={clsx('w-3.5 h-3.5 transition-transform', projectsDropOpen && 'rotate-180')} />
                  </button>
                  {projectsDropOpen && (
                    <ProjectsDropdown onClose={() => setProjectsDropOpen(false)} />
                  )}
                </div>
              )
            }
            return (
              <button key={item.label}
                onClick={() => item.view && setActiveView(item.view)}
                className={clsx(
                  'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[rgba(255,255,255,0.16)] text-white'
                    : 'text-[rgba(255,255,255,0.72)] hover:bg-[rgba(255,255,255,0.1)] hover:text-white'
                )}>
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="flex-1" />

        {/* Right-side actions */}
        <div className="flex items-center gap-1">
          {/* Create button */}
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold mr-1 transition-colors"
            style={{ background: '#0052CC', color: 'white' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#0065FF'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#0052CC'}>
            <Plus className="w-3.5 h-3.5" />
            <span>Create</span>
          </button>

          {/* Search */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.1)] hover:text-white">
            <Search className="w-3.5 h-3.5" />
            <span className="hidden lg:block">Search</span>
          </button>

          {/* Help */}
          <button className="p-1.5 rounded text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.1)] hover:text-white transition-colors">
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Notifications */}
          <button className="p-1.5 rounded text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.1)] hover:text-white transition-colors relative">
            <Bell className="w-4 h-4" />
          </button>

          {/* User menu */}
          <div className="relative ml-1" ref={menuRef}>
            <button onClick={() => setUserMenuOpen(o => !o)}
              className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded transition-colors"
              style={userMenuOpen ? { background: 'rgba(255,255,255,0.12)' } : {}}
              onMouseEnter={e => !userMenuOpen && ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)')}
              onMouseLeave={e => !userMenuOpen && ((e.currentTarget as HTMLElement).style.background = '')}>
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: '#0052CC' }}>
                  {user?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl overflow-hidden z-50"
                style={{ border: '1px solid #DFE1E6', boxShadow: '0 8px 24px rgba(9,30,66,0.18)' }}>
                <div className="px-3 py-3 border-b border-[#F4F5F7]">
                  <div className="flex items-center gap-2.5">
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt={user.name} className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold bg-[#0052CC]">
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
                    Admin panel
                  </button>
                )}
                <button
                  onClick={() => { setUserMenuOpen(false); setActiveView('projects') }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[#172B4D] hover:bg-[#F4F5F7] transition-colors">
                  <Settings className="w-3.5 h-3.5 text-[#626F86]" />
                  Manage projects
                </button>
                <button onClick={() => { setUserMenuOpen(false); handleLogout() }}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-[#DE350B] hover:bg-[#FFEBE6] transition-colors border-t border-[#F4F5F7]">
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

// ── App Layout ──────────────────────────────────────────────────────
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
          setProfiles(data.map((m: any) => m.profile).filter(Boolean))
        }
      })

    supabase.from('channels').select('*').order('name').then(({ data }) => {
      if (data) { setChannels(data); if (data.length > 0) setActiveChannel(data[0]) }
    })
  }, [project?.id])

  const isProjectsView = activeView === 'projects'
  const isChatView     = activeView === 'chat'

  const viewContent: Partial<Record<View, JSX.Element>> = {
    board:    <Dashboard />,
    backlog:  <SprintBoard />,
    bugs:     <BugBoard />,
    features: <FeatureList />,
    team:     <TeamView />,
    projects: <ProjectsPage />,
    reports:  <Reports />,
    settings: <ProjectSettings />,
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: '#F4F5F7' }}>
      <GlobalTopNav onGoToAdmin={onGoToAdmin} />
      <div className="flex flex-1 min-h-0">
        {/* Hide sidebar only on full projects page */}
        {!isProjectsView && <Sidebar onGoToAdmin={onGoToAdmin} />}

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
