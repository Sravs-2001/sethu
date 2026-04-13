'use client'

import { useRef, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import { useRouter } from 'next/navigation'
import type { View, Project } from '@/types'
import Modal from '@/components/ui/Modal'
import {
  Users, LayoutDashboard, Bug, Sparkles, Rocket, MessageSquare,
  LogOut, ShieldCheck, ChevronDown, Plus, Check, Loader2, Zap,
} from 'lucide-react'
import clsx from 'clsx'

const NAV: { icon: React.FC<{ className?: string }>; label: string; view: View }[] = [
  { icon: LayoutDashboard, label: 'Dashboard', view: 'dashboard' },
  { icon: Bug,             label: 'Bugs',      view: 'bugs'      },
  { icon: Sparkles,        label: 'Features',  view: 'features'  },
  { icon: Rocket,          label: 'Sprints',   view: 'sprints'   },
  { icon: MessageSquare,   label: 'Chat',      view: 'chat'      },
  { icon: Users,           label: 'Team',      view: 'team'      },
]

const AVATAR_COLORS = [
  '#0052CC','#6554C0','#00B8D9','#36B37E',
  '#FF5630','#FF991F','#172B4D','#403294',
]

function toKey(name: string) {
  return name.toUpperCase().replace(/[^A-Z0-9\s]/g,'').trim()
    .split(/\s+/).map(w => w[0]).join('').slice(0,4) || 'PROJ'
}

// ── New Project Modal ──────────────────────────────────────────────
function NewProjectModal({ onClose, onCreated }: {
  onClose: () => void
  onCreated: (p: Project) => void
}) {
  const { user } = useStore()
  const [name, setName]               = useState('')
  const [key, setKey]                 = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor]             = useState(AVATAR_COLORS[0])
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')

  function handleNameChange(v: string) { setName(v); setKey(toKey(v)) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !user) return
    setSaving(true); setError('')
    const { data, error: err } = await supabase.from('projects')
      .insert({ name: name.trim(), key: key || toKey(name), description: description.trim() || null, avatar_color: color, created_by: user.id })
      .select().single()
    if (err) { setError(err.message); setSaving(false); return }
    onCreated(data as Project)
  }

  return (
    <Modal title="New project" onClose={onClose} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded flex items-center justify-center text-white text-base font-bold flex-shrink-0"
            style={{ backgroundColor: color }}>
            {key || 'P'}
          </div>
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: '#5E6C84' }}>Colour</p>
            <div className="flex gap-1.5 flex-wrap">
              {AVATAR_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className="w-5 h-5 rounded transition-transform hover:scale-110"
                  style={{ backgroundColor: c, outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
                />
              ))}
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: '#5E6C84' }}>Project name *</label>
          <input className="input" value={name} onChange={e => handleNameChange(e.target.value)} placeholder="e.g. Mobile App" required autoFocus />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: '#5E6C84' }}>Project key *</label>
          <input className="input" value={key}
            onChange={e => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6))}
            placeholder="PROJ" required />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: '#5E6C84' }}>
            Description <span className="font-normal" style={{ color: '#97A0AF' }}>(optional)</span>
          </label>
          <textarea className="input resize-none h-16" value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this project about?" />
        </div>
        {error && <p className="text-xs px-3 py-2 rounded" style={{ color: '#DE350B', background: '#FFEBE6' }}>{error}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 btn-secondary justify-center">Cancel</button>
          <button type="submit" disabled={saving || !name.trim()}
            className="flex-1 btn-primary justify-center disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating…</> : 'Create project'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Sidebar ────────────────────────────────────────────────────────
export default function Sidebar() {
  const router = useRouter()
  const {
    activeView, setActiveView, user, project, projects,
    setProject, addProject,
    bugs, features, sprints,
    setBugs, setFeatures, setSprints,
    setUser,
  } = useStore()

  const [dropdownOpen, setDropdownOpen]     = useState(false)
  const [showNewProject, setShowNewProject] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const isAdmin = user?.role === 'admin'

  const openBugs     = bugs.filter(b => b.status !== 'done').length
  const openFeatures = features.filter(f => f.status !== 'done').length
  const activeSprint = sprints.find(s => s.status === 'active')

  const badges: Record<View, number | null> = {
    team: null, dashboard: null, chat: null,
    bugs:     openBugs || null,
    features: openFeatures || null,
    sprints:  activeSprint ? 1 : null,
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(false)
    }
    if (dropdownOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  function switchProject(p: Project) {
    setProject(p); setBugs([]); setFeatures([]); setSprints([])
    setDropdownOpen(false)
  }

  function handleNewProjectCreated(p: Project) {
    addProject(p); setProject(p); setBugs([]); setFeatures([]); setSprints([])
    setShowNewProject(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut(); setUser(null); router.push('/')
  }

  return (
    <>
      <aside className="w-[240px] flex-shrink-0 flex flex-col h-screen" style={{ background: '#172B4D' }}>

        {/* ── Brand ── */}
        <div className="flex items-center gap-2.5 px-4 py-4">
          <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0" style={{ background: '#0052CC' }}>
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-base tracking-tight">Sethu</span>
        </div>

        {/* ── Project switcher ── */}
        <div className="px-3 mb-2" ref={dropdownRef}>
          <button
            onClick={() => isAdmin && setDropdownOpen(o => !o)}
            className={clsx(
              'flex items-center gap-2.5 w-full px-3 py-2.5 rounded transition-colors duration-150 text-left',
              isAdmin ? 'cursor-pointer' : 'cursor-default',
            )}
            style={dropdownOpen ? { background: 'rgba(255,255,255,0.08)' } : {}}
            onMouseEnter={e => isAdmin && ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)')}
            onMouseLeave={e => !dropdownOpen && ((e.currentTarget as HTMLElement).style.background = '')}
          >
            <div className="w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: project?.avatar_color ?? '#0052CC' }}>
              {project?.key?.slice(0,2) ?? 'P'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-white text-sm font-semibold truncate leading-tight">{project?.name ?? 'My Project'}</div>
              <div className="text-xs leading-tight" style={{ color: 'rgba(255,255,255,0.4)' }}>Software project</div>
            </div>
            {isAdmin && (
              <ChevronDown className={clsx('w-3.5 h-3.5 flex-shrink-0 transition-transform duration-150', dropdownOpen && 'rotate-180')}
                style={{ color: 'rgba(255,255,255,0.35)' }} />
            )}
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="mt-1 bg-white rounded overflow-hidden animate-slide-in"
              style={{ border: '1px solid #DFE1E6', boxShadow: '0 4px 16px rgba(9,30,66,0.18)' }}>
              {projects.length > 0 && (
                <>
                  <div className="px-3 pt-2.5 pb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#7A869A' }}>Switch project</span>
                  </div>
                  <div className="max-h-44 overflow-y-auto">
                    {projects.map(p => (
                      <button key={p.id} onClick={() => switchProject(p)}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-left transition-colors"
                        style={{ color: '#172B4D' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F4F5F7'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                        <div className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                          style={{ backgroundColor: p.avatar_color }}>
                          {p.key.slice(0,2)}
                        </div>
                        <span className="text-sm flex-1 truncate font-medium" style={{ color: '#172B4D' }}>{p.name}</span>
                        {project?.id === p.id && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#0052CC' }} />}
                      </button>
                    ))}
                  </div>
                  <div className="h-px mx-3" style={{ background: '#DFE1E6' }} />
                </>
              )}
              <button
                onClick={() => { setDropdownOpen(false); setShowNewProject(true) }}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-semibold transition-colors"
                style={{ color: '#0052CC' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F4F5F7'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                <Plus className="w-3.5 h-3.5" />
                New project
              </button>
            </div>
          )}
        </div>

        {/* ── Nav ── */}
        <div className="px-3 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest pl-3" style={{ color: 'rgba(255,255,255,0.25)' }}>Workspace</span>
        </div>
        <nav className="flex-1 flex flex-col gap-0.5 px-3 overflow-y-auto">
          {NAV.map(({ icon: Icon, label, view }) => {
            const active = activeView === view
            const badge  = badges[view]
            return (
              <button key={view} onClick={() => setActiveView(view)}
                className={clsx('nav-item', active ? 'nav-item-active' : 'nav-item-inactive')}>
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full" style={{ background: '#4C9AFF' }} />
                )}
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 truncate">{label}</span>
                {badge && (
                  <span className="ml-auto min-w-[18px] h-[18px] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1"
                    style={{ background: '#DE350B' }}>
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* ── User ── */}
        <div className="px-3 py-3">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded transition-colors group"
            style={{}}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
            <div className="relative flex-shrink-0">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-7 h-7 rounded-full object-cover" style={{ outline: '1px solid rgba(255,255,255,0.15)' }} />
              ) : (
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: '#0052CC' }}>
                  {user?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
              {user?.role === 'admin' && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-400 rounded-full flex items-center justify-center">
                  <ShieldCheck className="w-1.5 h-1.5 text-amber-900" />
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-semibold truncate leading-tight">{user?.name ?? 'User'}</div>
              <div className="text-[10px] capitalize leading-tight" style={{ color: 'rgba(255,255,255,0.35)' }}>{user?.role ?? 'member'}</div>
            </div>
            <button onClick={handleLogout} title="Sign out"
              className="flex-shrink-0 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
              style={{ color: 'rgba(255,255,255,0.3)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)'}>
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {showNewProject && (
        <NewProjectModal onClose={() => setShowNewProject(false)} onCreated={handleNewProjectCreated} />
      )}
    </>
  )
}
