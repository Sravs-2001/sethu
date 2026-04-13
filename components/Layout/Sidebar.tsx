'use client'

import { useRef, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import type { View, Project } from '@/types'
import Modal from '@/components/ui/Modal'
import {
  LayoutDashboard, Layers, AlignLeft, Zap, Settings,
  Users, MessageSquare, ChevronDown, Plus, Check,
  Loader2, BarChart2, Bug, Sparkles,
} from 'lucide-react'
import clsx from 'clsx'

const AVATAR_COLORS = [
  '#0052CC', '#6554C0', '#00B8D9', '#36B37E',
  '#FF5630', '#FF991F', '#172B4D', '#403294',
]

function toKey(name: string) {
  return name.toUpperCase().replace(/[^A-Z0-9\s]/g, '').trim()
    .split(/\s+/).map(w => w[0]).join('').slice(0, 4) || 'PROJ'
}

// ── New Project Modal ──────────────────────────────────────────────────
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
    // Auto-add creator as admin project member
    await supabase.from('project_members').upsert(
      { project_id: (data as any).id, user_id: user.id, role: 'admin' },
      { onConflict: 'project_id,user_id' }
    )
    onCreated(data as Project)
  }

  return (
    <Modal title="Create project" onClose={onClose} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-lg flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
            style={{ backgroundColor: color }}>
            {key.slice(0, 2) || 'P'}
          </div>
          <div>
            <p className="text-xs font-semibold mb-2 text-[#5E6C84]">Project colour</p>
            <div className="flex gap-1.5 flex-wrap">
              {AVATAR_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className="w-5 h-5 rounded-sm transition-all hover:scale-110"
                  style={{ backgroundColor: c, outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }} />
              ))}
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5 text-[#5E6C84]">Project name *</label>
          <input className="input" value={name} onChange={e => handleNameChange(e.target.value)}
            placeholder="My scrum project" required autoFocus />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5 text-[#5E6C84]">Project key *</label>
          <input className="input" value={key}
            onChange={e => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            placeholder="PROJ" required />
          <p className="text-xs text-[#5E6C84] mt-1">
            Issues will be prefixed: <strong>{key || 'PROJ'}-1</strong>
          </p>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5 text-[#5E6C84]">
            Description <span className="font-normal text-[#97A0AF]">(optional)</span>
          </label>
          <textarea className="input resize-none h-16" value={description}
            onChange={e => setDescription(e.target.value)} placeholder="Describe your project..." />
        </div>
        {error && <p className="text-xs px-3 py-2 rounded text-[#DE350B] bg-[#FFEBE6]">{error}</p>}
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

// ── Nav item ────────────────────────────────────────────────────────────
function NavItem({ icon: Icon, label, view, badge, activeView, onClick }: {
  icon: React.FC<{ className?: string }>
  label: string
  view: View
  badge?: number | null
  activeView: View
  onClick: (v: View) => void
}) {
  const active = activeView === view
  return (
    <button
      onClick={() => onClick(view)}
      className={clsx(
        'flex items-center gap-2.5 w-full px-3 py-1.5 rounded text-[13px] transition-colors text-left',
        active
          ? 'bg-[#DEEBFF] text-[#0052CC] font-semibold'
          : 'text-[#42526E] hover:bg-[#F4F5F7]',
      )}
    >
      <Icon className={clsx('w-4 h-4 flex-shrink-0', active ? 'text-[#0052CC]' : 'text-[#6B778C]')} />
      <span className="flex-1 truncate">{label}</span>
      {badge != null && badge > 0 && (
        <span className="ml-auto min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center px-1 bg-[#DE350B] text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  )
}

// ── Section header ──────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 mb-1 mt-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#97A0AF]">{children}</span>
    </div>
  )
}

// ── Sidebar ─────────────────────────────────────────────────────────────
export default function Sidebar() {
  const {
    activeView, setActiveView,
    user, project, projects,
    setProject, addProject,
    bugs, features, sprints,
    setBugs, setFeatures, setSprints,
  } = useStore()

  const [dropdownOpen, setDropdownOpen]     = useState(false)
  const [showNewProject, setShowNewProject] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const isAdmin = user?.role === 'admin'

  const openBugs     = bugs.filter(b => b.status !== 'done').length
  const openFeatures = features.filter(f => f.status !== 'done').length
  const activeSprint = sprints.find(s => s.status === 'active')

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

  return (
    <>
      <aside
        className="w-[240px] flex-shrink-0 flex flex-col h-full border-r overflow-y-auto"
        style={{ background: '#FFFFFF', borderColor: '#DFE1E6' }}
      >
        {/* ── Project selector ── */}
        <div className="p-3 border-b" style={{ borderColor: '#DFE1E6' }} ref={dropdownRef}>
          <button
            onClick={() => isAdmin && setDropdownOpen(o => !o)}
            className={clsx(
              'flex items-center gap-2.5 w-full px-2 py-2 rounded-md transition-colors text-left',
              isAdmin ? 'hover:bg-[#F4F5F7] cursor-pointer' : 'cursor-default',
            )}
          >
            <div
              className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: project?.avatar_color ?? '#0052CC' }}
            >
              {project?.key?.slice(0, 2) ?? 'P'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-[#172B4D] truncate leading-tight">
                {project?.name ?? 'My Project'}
              </div>
              <div className="text-[11px] text-[#5E6C84] leading-tight">Software project</div>
            </div>
            {isAdmin && (
              <ChevronDown className={clsx(
                'w-4 h-4 text-[#7A869A] flex-shrink-0 transition-transform duration-150',
                dropdownOpen && 'rotate-180',
              )} />
            )}
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div
              className="mt-1 bg-white rounded overflow-hidden animate-slide-in"
              style={{ border: '1px solid #DFE1E6', boxShadow: '0 8px 24px rgba(9,30,66,0.20)' }}
            >
              {projects.length > 0 && (
                <>
                  <div className="px-3 pt-2.5 pb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A869A]">Switch project</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {projects.map(p => (
                      <button key={p.id} onClick={() => switchProject(p)}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-[#F4F5F7] transition-colors">
                        <div className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                          style={{ backgroundColor: p.avatar_color }}>
                          {p.key.slice(0, 2)}
                        </div>
                        <span className="text-[13px] flex-1 truncate font-medium text-[#172B4D]">{p.name}</span>
                        {project?.id === p.id && <Check className="w-3.5 h-3.5 text-[#0052CC] flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                  <div className="h-px mx-3" style={{ background: '#DFE1E6' }} />
                </>
              )}
              <button
                onClick={() => { setDropdownOpen(false); setShowNewProject(true) }}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-[13px] font-semibold text-[#0052CC] hover:bg-[#F4F5F7] transition-colors">
                <Plus className="w-3.5 h-3.5" />
                Create project
              </button>
            </div>
          )}
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 p-2 space-y-4 pt-3">

          {/* Planning */}
          <div>
            <SectionLabel>Planning</SectionLabel>
            <div className="space-y-0.5">
              <NavItem icon={Layers}       label="Board"    view="board"    activeView={activeView} onClick={setActiveView} />
              <NavItem icon={AlignLeft}    label="Backlog"  view="backlog"  activeView={activeView} onClick={setActiveView}
                badge={activeSprint ? null : (openBugs + openFeatures) || null} />
              <NavItem icon={Zap}          label="Sprints"  view="sprints"  activeView={activeView} onClick={setActiveView}
                badge={activeSprint ? 1 : null} />
            </div>
          </div>

          {/* Views */}
          <div>
            <SectionLabel>Views</SectionLabel>
            <div className="space-y-0.5">
              <NavItem icon={LayoutDashboard} label="Dashboard" view="dashboard" activeView={activeView} onClick={setActiveView} />
              <NavItem icon={Bug}             label="Bugs"      view="bugs"      activeView={activeView} onClick={setActiveView}
                badge={openBugs || null} />
              <NavItem icon={Sparkles}        label="Features"  view="features"  activeView={activeView} onClick={setActiveView}
                badge={openFeatures || null} />
              <NavItem icon={BarChart2}       label="Reports"   view="dashboard" activeView={activeView} onClick={setActiveView} />
            </div>
          </div>

          {/* Collaborate */}
          <div>
            <SectionLabel>Collaborate</SectionLabel>
            <div className="space-y-0.5">
              <NavItem icon={Users}          label="Team" view="team" activeView={activeView} onClick={setActiveView} />
              <NavItem icon={MessageSquare}  label="Chat" view="chat" activeView={activeView} onClick={setActiveView} />
            </div>
          </div>

          {/* Project settings (admin only) */}
          {isAdmin && (
            <div>
              <SectionLabel>Project</SectionLabel>
              <div className="space-y-0.5">
                <NavItem icon={Settings} label="Project settings" view="dashboard" activeView={activeView} onClick={setActiveView} />
              </div>
            </div>
          )}
        </nav>

        {/* ── User info ── */}
        <div className="p-3 border-t" style={{ borderColor: '#DFE1E6' }}>
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#F4F5F7] transition-colors">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: '#0052CC' }}>
                {user?.name?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-[#172B4D] truncate">{user?.name ?? 'User'}</div>
              <div className="text-[11px] text-[#5E6C84] capitalize">{user?.role ?? 'member'}</div>
            </div>
          </div>
        </div>
      </aside>

      {showNewProject && (
        <NewProjectModal onClose={() => setShowNewProject(false)} onCreated={handleNewProjectCreated} />
      )}
    </>
  )
}
