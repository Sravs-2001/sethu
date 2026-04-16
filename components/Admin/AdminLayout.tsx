'use client'

import { useState, useRef, useEffect } from 'react'
import { authService } from '@/lib/services'
import { useStore } from '@/store/useStore'
import { useRouter } from 'next/navigation'
import type { Project } from '@/types'
import ProjectsOverview from './ProjectsOverview'
import AdminTeamView from './AdminTeamView'
import {
  Zap, FolderKanban, Users, LogOut, Shield, ChevronDown,
  Bell, HelpCircle, Search, Settings,
} from 'lucide-react'
import clsx from 'clsx'

type AdminView = 'projects' | 'team'

const NAV: { icon: React.FC<{ className?: string }>; label: string; view: AdminView }[] = [
  { icon: FolderKanban, label: 'Projects', view: 'projects' },
  { icon: Users,        label: 'People',   view: 'team'     },
]

export default function AdminLayout({ onEnterProject, onBackToProjects }: {
  onEnterProject: (project: Project) => void
  onBackToProjects?: () => void
}) {
  const router = useRouter()
  const { user, setUser } = useStore()
  const [adminView, setAdminView] = useState<AdminView>('projects')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setUserMenuOpen(false)
    }
    if (userMenuOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [userMenuOpen])

  async function handleLogout() {
    await authService.signOut(); setUser(null); router.push('/')
  }

  return (
    <div className="h-screen flex flex-col bg-[#F4F5F7]">

      {/* ── Global Top Nav ── */}
      <header className="flex-shrink-0 flex items-center px-3 h-12 z-50"
        style={{ background: '#1D2125', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>

        {/* Logo + Admin badge */}
        <div className="flex items-center gap-2.5 px-2 mr-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#0052CC' }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-sm tracking-tight hidden sm:block">Sethu</span>
          <div className="flex items-center gap-1 bg-amber-400/15 border border-amber-400/25 rounded-md px-2 py-0.5 ml-1">
            <Shield className="w-3 h-3 text-amber-400" />
            <span className="text-amber-300 text-[11px] font-semibold">Admin</span>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
          <span className="font-semibold text-white">Sethu</span>
          <span className="mx-1.5" style={{ color: 'rgba(255,255,255,0.25)' }}>/</span>
          <span>{adminView === 'projects' ? 'Projects' : 'People'}</span>
        </div>

        <div className="flex-1" />

        {/* Right */}
        <div className="flex items-center gap-1">
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors"
            style={{ color: 'rgba(255,255,255,0.6)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
            <Search className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 rounded-md transition-colors" style={{ color: 'rgba(255,255,255,0.6)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
            <HelpCircle className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded-md transition-colors" style={{ color: 'rgba(255,255,255,0.6)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
            <Bell className="w-4 h-4" />
          </button>

          <div className="relative ml-1" ref={menuRef}>
            <button onClick={() => setUserMenuOpen(o => !o)}
              className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-md transition-colors"
              style={userMenuOpen ? { background: 'rgba(255,255,255,0.12)' } : {}}
              onMouseEnter={e => !userMenuOpen && ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)')}
              onMouseLeave={e => !userMenuOpen && ((e.currentTarget as HTMLElement).style.background = '')}>
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold bg-[#0052CC]">
                  {user?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
              <span className="text-xs font-medium hidden md:block" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {user?.name?.split(' ')[0] ?? 'Admin'}
              </span>
              <ChevronDown className="w-3 h-3 hidden md:block" style={{ color: 'rgba(255,255,255,0.4)' }} />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg overflow-hidden z-50"
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
                      <div className="text-xs text-[#626F86] flex items-center gap-1">
                        <Shield className="w-3 h-3 text-amber-500" />Administrator
                      </div>
                    </div>
                  </div>
                </div>
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

      <div className="flex flex-1 min-h-0">
        {/* ── Admin Sidebar ── */}
        <aside className="w-[240px] flex-shrink-0 flex flex-col bg-white border-r border-[#DFE1E6]">
          <div className="px-3 pt-4 pb-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#626F86] px-3 mb-1">Admin Panel</div>
          </div>

          <nav className="flex-1 px-2 space-y-0.5">
            {NAV.map(({ icon: Icon, label, view }) => {
              const active = adminView === view
              return (
                <button key={view} onClick={() => setAdminView(view)}
                  className={clsx(
                    'relative flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-sm transition-colors text-left',
                    active
                      ? 'bg-[#E8EDFF] text-[#0052CC] font-semibold'
                      : 'text-[#44546F] hover:bg-[#F1F2F4] font-medium'
                  )}>
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-[#0052CC]" />
                  )}
                  <Icon className={clsx('w-4 h-4 flex-shrink-0', active ? 'text-[#0052CC]' : 'text-[#626F86]')} />
                  <span>{label}</span>
                </button>
              )
            })}
          </nav>

          <div className="p-2 border-t border-[#DFE1E6]">
            <button className="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-sm font-medium text-[#626F86] hover:bg-[#F1F2F4] transition-colors">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </div>
        </aside>

        {/* ── Main ── */}
        <div className="flex-1 overflow-y-auto">
          {adminView === 'projects' && <ProjectsOverview onOpenProject={onEnterProject} />}
          {adminView === 'team'     && <AdminTeamView />}
        </div>
      </div>
    </div>
  )
}
