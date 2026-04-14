'use client'

import { useRef, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import type { View, Project } from '@/types'
import Modal from '@/components/ui/Modal'
import {
  LayoutGrid, Bug, Sparkles, MessageSquare, Users,
  ChevronDown, Plus, Check, Loader2, Layers,
  Settings, Shield,
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
      .insert({
        name: name.trim(),
        key: key || toKey(name),
        description: description.trim() || null,
        avatar_color: color,
        created_by: user.id,
      })
      .select().single()

    if (err) { setError(err.message); setSaving(false); return }

    // Try to add creator to project_members (silent if RLS blocks — checkProject
    // still finds the project via created_by query)
    await supabase.from('project_members').upsert(
      { project_id: data.id, user_id: user.id, role: 'admin', invited_by: null },
      { onConflict: 'project_id,user_id' }
    )

    onCreated(data as Project)
  }

  return (
    <Modal title="Create project" onClose={onClose} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-base font-bold flex-shrink-0"
            style={{ backgroundColor: color }}>
            {key || 'P'}
          </div>
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: '#5E6C84' }}>Color</p>
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
          <label className="block text-xs font-semibold mb-1.5" style={{ color: '#5E6C84' }}>
            Project name <span style={{color:'#DE350B'}}>*</span>
          </label>
          <input className="input" value={name} onChange={e => handleNameChange(e.target.value)}
            placeholder="e.g. Mobile App" required autoFocus />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: '#5E6C84' }}>
            Project key <span style={{color:'#DE350B'}}>*</span>
          </label>
          <input className="input" value={key}
            onChange={e => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6))}
            placeholder="PROJ" required />
          <p className="text-[11px] mt-1" style={{ color: '#7A869A' }}>Used to prefix issue keys (e.g. {key || 'PROJ'}-1)</p>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: '#5E6C84' }}>
            Description <span className="font-normal" style={{ color: '#97A0AF' }}>(optional)</span>
          </label>
          <textarea className="input resize-none h-16" value={description}
            onChange={e => setDescription(e.target.value)} placeholder="What is this project about?" />
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

interface SidebarProps {
  onGoToAdmin?: () => void
}

type NavSection = {
  label: string
  items: { icon: React.FC<{ className?: string }>; label: string; view: View; badge?: number | null }[]
}

export default function Sidebar({ onGoToAdmin }: SidebarProps) {
  const {
    activeView, setActiveView, user, project, projects,
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

  const sections: NavSection[] = [
    {
      label: 'Planning',
      items: [
        { icon: LayoutGrid, label: 'Board',   view: 'board' },
        { icon: Layers,     label: 'Backlog', view: 'backlog' },
      ],
    },
    {
      label: 'Development',
      items: [
        { icon: Bug,      label: 'Issues',   view: 'bugs',     badge: openBugs     || null },
        { icon: Sparkles, label: 'Features', view: 'features', badge: openFeatures || null },
      ],
    },
    {
      label: 'Collaborate',
      items: [
        { icon: MessageSquare, label: 'Chat',   view: 'chat' },
        { icon: Users,         label: 'People', view: 'team' },
      ],
    },
  ]

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
      <aside className="w-[240px] flex-shrink-0 flex flex-col h-full bg-white border-r border-[#DFE1E6]">

        {/* ── Project Switcher — available to ALL users ── */}
        <div className="px-3 pt-3 pb-2 relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(o => !o)}
            className={clsx(
              'flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-left transition-colors hover:bg-[#F1F2F4] cursor-pointer',
              dropdownOpen && 'bg-[#F1F2F4]'
            )}
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ backgroundColor: project?.avatar_color ?? '#0052CC' }}>
              {project?.key?.slice(0,2) ?? 'P'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-[#172B4D] truncate leading-tight">{project?.name ?? 'My Project'}</div>
              <div className="text-[11px] text-[#626F86] leading-tight">{project?.key ?? 'PROJ'} · Software project</div>
            </div>
            <ChevronDown className={clsx('w-3.5 h-3.5 flex-shrink-0 text-[#626F86] transition-transform duration-150', dropdownOpen && 'rotate-180')} />
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 top-full mt-1 w-full bg-white rounded-lg overflow-hidden z-50"
              style={{ border: '1px solid #DFE1E6', boxShadow: '0 8px 24px rgba(9,30,66,0.15)' }}>
              {projects.length > 0 && (
                <>
                  <div className="px-3 pt-2.5 pb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#626F86]">Your projects</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {projects.map(p => (
                      <button key={p.id} onClick={() => switchProject(p)}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-left transition-colors hover:bg-[#F1F2F4]">
                        <div className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                          style={{ backgroundColor: p.avatar_color }}>
                          {p.key.slice(0,2)}
                        </div>
                        <span className="text-sm flex-1 truncate font-medium text-[#172B4D]">{p.name}</span>
                        {project?.id === p.id && <Check className="w-3.5 h-3.5 flex-shrink-0 text-[#0052CC]" />}
                      </button>
                    ))}
                  </div>
                  <div className="h-px mx-3 bg-[#DFE1E6]" />
                </>
              )}
              <button
                onClick={() => { setDropdownOpen(false); setShowNewProject(true) }}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-semibold text-[#0052CC] hover:bg-[#F1F2F4] transition-colors">
                <Plus className="w-3.5 h-3.5" />
                Create new project
              </button>
            </div>
          )}
        </div>

        <div className="h-px mx-4 bg-[#DFE1E6] mb-2" />

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto px-2 space-y-4 py-1">
          {sections.map(section => (
            <div key={section.label}>
              <div className="px-3 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#626F86]">{section.label}</span>
              </div>
              <div className="space-y-0.5">
                {section.items.map(({ icon: Icon, label, view, badge }) => {
                  const active = activeView === view
                  return (
                    <button key={view} onClick={() => setActiveView(view)}
                      className={clsx(
                        'relative flex items-center gap-2.5 w-full px-3 py-1.5 rounded-md text-sm transition-colors text-left',
                        active
                          ? 'bg-[#E8EDFF] text-[#0052CC] font-semibold'
                          : 'text-[#44546F] hover:bg-[#F1F2F4] font-medium'
                      )}>
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-[#0052CC]" />
                      )}
                      <Icon className={clsx('w-4 h-4 flex-shrink-0', active ? 'text-[#0052CC]' : 'text-[#626F86]')} />
                      <span className="flex-1 truncate">{label}</span>
                      {badge != null && (
                        <span className={clsx(
                          'min-w-[18px] h-[18px] text-[10px] font-bold rounded-full flex items-center justify-center px-1',
                          active ? 'bg-[#0052CC] text-white' : 'bg-[#DFE1E6] text-[#44546F]'
                        )}>
                          {badge > 99 ? '99+' : badge}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Bottom actions ── */}
        <div className="p-2 border-t border-[#DFE1E6] space-y-0.5">
          {isAdmin && onGoToAdmin && (
            <button onClick={onGoToAdmin}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-sm font-medium text-[#626F86] hover:bg-[#F1F2F4] transition-colors">
              <Shield className="w-4 h-4 text-amber-500" />
              <span>Admin panel</span>
            </button>
          )}
          <button
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-sm font-medium text-[#626F86] hover:bg-[#F1F2F4] transition-colors">
            <Settings className="w-4 h-4" />
            <span>Project settings</span>
          </button>
        </div>
      </aside>

      {showNewProject && (
        <NewProjectModal onClose={() => setShowNewProject(false)} onCreated={handleNewProjectCreated} />
      )}
    </>
  )
}
