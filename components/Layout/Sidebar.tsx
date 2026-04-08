'use client'

import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import { useRouter } from 'next/navigation'
import type { View } from '@/types'
import { Users, LayoutDashboard, Bug, Sparkles, Rocket, MessageSquare, LogOut, Shield } from 'lucide-react'
import ArrowheadIcon from '@/components/ui/ArrowheadIcon'
import clsx from 'clsx'

const NAV: { icon: React.FC<{ className?: string }>; label: string; view: View; color: string }[] = [
  { icon: Users,           label: 'Team',      view: 'team',      color: 'text-cyan-400' },
  { icon: LayoutDashboard, label: 'Dashboard', view: 'dashboard', color: 'text-sky-400' },
  { icon: Bug,             label: 'Bugs',      view: 'bugs',      color: 'text-rose-400' },
  { icon: Sparkles,        label: 'Features',  view: 'features',  color: 'text-violet-400' },
  { icon: Rocket,          label: 'Sprints',   view: 'sprints',   color: 'text-emerald-400' },
  { icon: MessageSquare,   label: 'Chat',      view: 'chat',      color: 'text-indigo-400' },
]

export default function Sidebar() {
  const router = useRouter()
  const { activeView, setActiveView, user, bugs, features, sprints, setUser } = useStore()

  const openBugs     = bugs.filter(b => b.status !== 'done').length
  const openFeatures = features.filter(f => f.status !== 'done').length
  const activeSprint = sprints.find(s => s.status === 'active')

  const badges: Record<View, number | null> = {
    team:      null,
    dashboard: null,
    bugs:      openBugs || null,
    features:  openFeatures || null,
    sprints:   activeSprint ? 1 : null,
    chat:      null,
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
    router.push('/')
  }

  return (
    <aside className="w-[68px] flex-shrink-0 flex flex-col items-center py-5 gap-1"
      style={{ background: 'linear-gradient(180deg, #1e3a8a 0%, #1e40af 100%)', borderRight: '1px solid rgba(255,255,255,0.08)' }}>

      {/* Logo */}
      <div className="mb-5 w-10 h-10 rounded-2xl bg-white/20 border border-white/20 flex items-center justify-center shadow-lg flex-shrink-0">
        <ArrowheadIcon className="w-5 h-5 text-white" />
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col items-center gap-1.5 w-full px-2.5">
        {NAV.map(({ icon: Icon, label, view, color }) => {
          const active = activeView === view
          const badge  = badges[view]
          return (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              title={label}
              className={clsx(
                'relative w-full h-11 rounded-2xl flex items-center justify-center transition-all duration-150 group',
                active ? 'bg-white/15 shadow-inner' : 'hover:bg-white/8'
              )}
            >
              <Icon className={clsx('w-5 h-5 transition-colors', active ? color : 'text-white/30 group-hover:text-white/60')} />
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-white" />
              )}
              {badge && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-sm">
                  {badge}
                </span>
              )}
              <span className="absolute left-full ml-3 px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl border border-white/10 transition-opacity">
                {label}
              </span>
            </button>
          )
        })}
      </nav>

      {/* Bottom: user + logout */}
      <div className="flex flex-col items-center gap-2 mt-2">
        {user?.role === 'admin' && (
          <div title="Admin" className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-500/10 border border-amber-500/20">
            <Shield className="w-4 h-4 text-amber-400" />
          </div>
        )}
        <div className="relative group">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt={user.name}
              className="w-9 h-9 rounded-2xl object-cover border-2 border-white/10 shadow" />
          ) : (
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-sm font-black shadow border-2 border-white/10">
              {user?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <div className="absolute left-full ml-3 bottom-0 bg-gray-900 border border-white/10 text-white text-xs rounded-xl px-3 py-2 opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-xl">
            <div className="font-bold">{user?.name}</div>
            <div className="text-white/40 capitalize text-[10px] mt-0.5">{user?.role ?? 'member'}</div>
          </div>
        </div>
        <button onClick={handleLogout} title="Sign out"
          className="w-9 h-9 rounded-2xl flex items-center justify-center text-white/20 hover:bg-white/5 hover:text-rose-400 transition-all duration-150">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  )
}
