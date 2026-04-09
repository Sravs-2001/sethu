'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import { useRouter } from 'next/navigation'
import type { Project } from '@/types'
import ProjectsOverview from './ProjectsOverview'
import AdminTeamView from './AdminTeamView'
import { FolderKanban, Users, LogOut, ShieldCheck, Zap } from 'lucide-react'
import clsx from 'clsx'

type AdminView = 'projects' | 'team'

const NAV: { icon: React.FC<{ className?: string }>; label: string; view: AdminView }[] = [
  { icon: FolderKanban, label: 'Projects', view: 'projects' },
  { icon: Users,        label: 'Team',     view: 'team'     },
]

export default function AdminLayout({ onEnterProject }: {
  onEnterProject: (project: Project) => void
}) {
  const router = useRouter()
  const { user, setUser } = useStore()
  const [adminView, setAdminView] = useState<AdminView>('projects')

  async function handleLogout() {
    await supabase.auth.signOut(); setUser(null); router.push('/')
  }

  return (
    <div className="h-screen flex bg-[#F4F5F7]">
      {/* ── Admin Sidebar ── */}
      <aside className="w-[240px] flex-shrink-0 flex flex-col h-screen" style={{ background: '#172B4D' }}>

        {/* Brand + Admin badge */}
        <div className="px-4 py-4">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0" style={{ background: '#0052CC' }}>
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-base tracking-tight">Sethu</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-400/10 border border-amber-400/20 rounded-lg">
            <ShieldCheck className="w-3 h-3 text-amber-400 flex-shrink-0" />
            <span className="text-amber-300 text-xs font-semibold">Admin Panel</span>
          </div>
        </div>

        {/* Nav */}
        <div className="px-3 mb-1">
          <span className="text-[10px] font-semibold text-white/25 uppercase tracking-widest pl-3">Manage</span>
        </div>
        <nav className="flex-1 flex flex-col gap-0.5 px-3">
          {NAV.map(({ icon: Icon, label, view }) => {
            const active = adminView === view
            return (
              <button key={view} onClick={() => setAdminView(view)}
                className={clsx('nav-item', active ? 'nav-item-active' : 'nav-item-inactive')}>
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-[#4C9AFF]" />
                )}
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{label}</span>
              </button>
            )
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-3">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/[0.06] transition-colors group">
            <div className="relative flex-shrink-0">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-7 h-7 rounded-full object-cover ring-1 ring-white/10" />
              ) : (
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: '#0052CC' }}>
                  {user?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-400 rounded-full flex items-center justify-center">
                <ShieldCheck className="w-1.5 h-1.5 text-amber-900" />
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-semibold truncate leading-tight">{user?.name ?? 'Admin'}</div>
              <div className="text-white/30 text-[10px] leading-tight">Administrator</div>
            </div>
            <button onClick={handleLogout} title="Sign out"
              className="flex-shrink-0 p-1 text-white/25 hover:text-white/70 rounded-md transition-colors opacity-0 group-hover:opacity-100">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex-shrink-0 flex items-center gap-3 px-6 h-12 bg-white"
          style={{ borderBottom: '1px solid #DFE1E6' }}>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium" style={{ color: '#42526E' }}>Sethu</span>
            <span style={{ color: '#C1C7D0' }}>/</span>
            {adminView === 'projects' ? (
              <div className="flex items-center gap-1.5">
                <FolderKanban className="w-3.5 h-3.5" style={{ color: '#5E6C84' }} />
                <span className="font-semibold" style={{ color: '#172B4D' }}>Projects</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" style={{ color: '#5E6C84' }} />
                <span className="font-semibold" style={{ color: '#172B4D' }}>Team</span>
              </div>
            )}
          </div>
          <div className="ml-auto">
            <span className="text-xs rounded-full px-3 py-1 font-medium" style={{ color: '#42526E', background: '#F4F5F7', border: '1px solid #DFE1E6' }}>
              Click <span className="font-semibold" style={{ color: '#0052CC' }}>Open</span> on a project to work inside it
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {adminView === 'projects' && <ProjectsOverview onOpenProject={onEnterProject} />}
          {adminView === 'team'     && <AdminTeamView />}
        </main>
      </div>
    </div>
  )
}
