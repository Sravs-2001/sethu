'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { projectService } from '@/lib/services'
import { useStore } from '@/store/useStore'
import type { Project } from '@/types'
import {
  LayoutGrid, Sparkles, MessageSquare, Users,
  ChevronDown, Plus, Check, Loader2, Layers,
  Settings, Shield, BarChart2, Activity,
  Lock, ChevronLeft,
} from 'lucide-react'
import clsx from 'clsx'
import Modal from '@/components/ui/Modal'
import { AVATAR_COLORS } from '@/lib/constants'

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
    const { data, error: err } = await projectService.create({
      name: name.trim(), key: key || toKey(name),
      description: description.trim() || null, avatar_color: color, created_by: user.id,
    })
    if (err) { setError(err.message); setSaving(false); return }
    await projectService.addMember(data.id, user.id, 'admin', null)
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
            <p className="text-xs font-semibold mb-2 text-[#5E6C84]">Color</p>
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
          <label className="block text-xs font-semibold mb-1.5 text-[#5E6C84]">
            Project name <span className="text-[#DE350B]">*</span>
          </label>
          <input className="input" value={name} onChange={e => handleNameChange(e.target.value)} placeholder="e.g. Mobile App" required autoFocus />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5 text-[#5E6C84]">
            Project key <span className="text-[#DE350B]">*</span>
          </label>
          <input className="input" value={key}
            onChange={e => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6))}
            placeholder="PROJ" required />
          <p className="text-[11px] mt-1 text-[#7A869A]">Used to prefix issue keys (e.g. {key || 'PROJ'}-1)</p>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5 text-[#5E6C84]">
            Description <span className="font-normal text-[#97A0AF]">(optional)</span>
          </label>
          <textarea className="input resize-none h-16" value={description}
            onChange={e => setDescription(e.target.value)} placeholder="What is this project about?" />
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

interface NavItem {
  icon: React.FC<{ className?: string }>
  label: string
  href: string
  badge?: number | null
  adminOnly?: boolean
}

interface SidebarProps {
  onGoToAdmin?: () => void
}

export default function Sidebar({ onGoToAdmin }: SidebarProps) {
  const {
    user, project, projects,
    setProject, addProject,
    bugs, features, sprints,
    setBugs, setFeatures, setSprints,
    projectMembers,
  } = useStore()

  const pathname    = usePathname()
  const router      = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [dropdownOpen,   setDropdownOpen]   = useState(false)
  const [showNewProject, setShowNewProject] = useState(false)
  const [collapsed,      setCollapsed]      = useState(false)

  const isSiteAdmin    = user?.role === 'admin'
  const isProjectAdmin = isSiteAdmin
    || projectMembers.some(m => m.user_id === user?.id && m.role === 'admin')
    || project?.created_by === user?.id

  const openBugs     = bugs.filter(b => b.status !== 'done').length
  const openFeatures = features.filter(f => f.status !== 'done').length

  const allNavItems: NavItem[] = [
    { icon: Activity,      label: 'Summary',         href: '/dashboard/summary'  },
    { icon: LayoutGrid,    label: 'Board',            href: '/dashboard/board',    badge: openBugs     || null },
    { icon: Layers,        label: 'Backlog',          href: '/dashboard/backlog'  },
    { icon: Sparkles,      label: 'Features',         href: '/dashboard/features', badge: openFeatures || null },
    { icon: MessageSquare, label: 'Chat',             href: '/dashboard/chat'     },
    { icon: Users,         label: 'People',           href: '/dashboard/people'   },
    { icon: BarChart2,     label: 'Reports',          href: '/dashboard/reports',  adminOnly: true },
    { icon: Settings,      label: 'Project settings', href: '/dashboard/settings', adminOnly: true },
  ]

  const navItems = allNavItems.filter(item => !item.adminOnly || isProjectAdmin)

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
    router.push('/dashboard/board')
  }

  function handleNewProjectCreated(p: Project) {
    addProject(p); setProject(p); setBugs([]); setFeatures([]); setSprints([])
    setShowNewProject(false)
    router.push('/dashboard/board')
  }

  // ── Collapsed sidebar (icon-only rail) ───────────────────────────
  if (collapsed) {
    return (
      <>
        <aside className="w-[52px] flex-shrink-0 flex flex-col h-full bg-white"
          style={{ borderRight: '1px solid #DFE1E6' }}>
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold"
              style={{ backgroundColor: project?.avatar_color ?? '#0052CC' }}>
              {project?.key?.slice(0,2) ?? 'P'}
            </div>
          </div>
          <div className="h-px mx-2 bg-[#DFE1E6] mb-1" />
          <nav className="flex-1 flex flex-col items-center gap-0.5 px-1 py-1">
            {navItems.map(({ icon: Icon, label, href, badge }) => {
              const active = pathname === href
              return (
                <Link key={label} href={href} title={label}
                  className={clsx(
                    'relative w-9 h-9 rounded-md flex items-center justify-center transition-colors',
                    active ? 'bg-[#E8EDFF]' : 'hover:bg-[#F1F2F4]'
                  )}>
                  <Icon className={clsx('w-4 h-4', active ? 'text-[#0052CC]' : 'text-[#44546F]')} />
                  {badge != null && (
                    <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-[#DE350B]" />
                  )}
                </Link>
              )
            })}
          </nav>
          <div className="p-1.5 border-t border-[#DFE1E6] flex justify-center">
            <button onClick={() => setCollapsed(false)} title="Expand sidebar"
              className="w-8 h-8 rounded flex items-center justify-center text-[#44546F] hover:bg-[#F1F2F4]">
              <ChevronLeft className="w-4 h-4 rotate-180" />
            </button>
          </div>
        </aside>
        {showNewProject && (
          <NewProjectModal onClose={() => setShowNewProject(false)} onCreated={handleNewProjectCreated} />
        )}
      </>
    )
  }

  // ── Expanded sidebar ─────────────────────────────────────────────
  return (
    <>
      <aside className="w-[240px] flex-shrink-0 flex flex-col h-full bg-white"
        style={{ borderRight: '1px solid #DFE1E6' }}>

        {/* ── Project Switcher ── */}
        <div className="px-3 pt-3 pb-2 relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(o => !o)}
            className={clsx(
              'flex items-center gap-2 w-full px-2 py-2 rounded-md text-left transition-colors hover:bg-[#F1F2F4]',
              dropdownOpen && 'bg-[#F1F2F4]'
            )}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ backgroundColor: project?.avatar_color ?? '#0052CC' }}>
              {project?.key?.slice(0,2) ?? 'P'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <div className="text-sm font-semibold text-[#172B4D] truncate leading-tight">
                  {project?.name ?? 'My Project'}
                </div>
                <span title="Private project"><Lock className="w-3 h-3 text-[#626F86] flex-shrink-0" /></span>
              </div>
              <div className="text-[11px] text-[#626F86] leading-tight">
                {project?.key ?? 'PROJ'} · Software project
              </div>
            </div>
            <ChevronDown className={clsx(
              'w-3.5 h-3.5 flex-shrink-0 text-[#626F86] transition-transform duration-150',
              dropdownOpen && 'rotate-180'
            )} />
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 right-0 mx-3 top-full mt-1 bg-white rounded-lg overflow-hidden z-50"
              style={{ border: '1px solid #DFE1E6', boxShadow: '0 8px 24px rgba(9,30,66,0.15)' }}>
              {projects.length > 0 && (
                <>
                  <div className="px-3 pt-2.5 pb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#626F86]">Your projects</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {projects.map(p => (
                      <button key={p.id} onClick={() => switchProject(p)}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-[#F1F2F4] transition-colors">
                        <div className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                          style={{ backgroundColor: p.avatar_color }}>
                          {p.key.slice(0,2)}
                        </div>
                        <span className="text-sm flex-1 truncate font-medium text-[#172B4D]">{p.name}</span>
                        <Lock className="w-3 h-3 text-[#B3BAC5] flex-shrink-0" />
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

        {/* Role badge */}
        <div className="px-5 pb-2">
          <span className={clsx(
            'inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full',
            isProjectAdmin
              ? 'bg-[#FFFAE6] text-amber-700 border border-amber-200'
              : 'bg-[#F4F5F7] text-[#626F86] border border-[#DFE1E6]'
          )}>
            {isProjectAdmin ? <><Shield className="w-2.5 h-2.5" /> Admin</> : <><Users className="w-2.5 h-2.5" /> Member</>}
          </span>
        </div>

        <div className="h-px mx-3 bg-[#DFE1E6] mb-1" />

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto px-2 py-1">
          {/* Member section */}
          <div className="space-y-0.5 mb-3">
            {navItems.filter(i => !i.adminOnly).map(({ icon: Icon, label, href, badge }) => {
              const active = pathname === href
              return (
                <Link key={label} href={href}
                  className={clsx(
                    'relative flex items-center gap-3 w-full px-3 py-1.5 rounded-md text-sm transition-colors text-left',
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
                </Link>
              )
            })}
          </div>

          {/* Admin section */}
          {isProjectAdmin && (
            <>
              <div className="px-3 mb-1 mt-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#97A0AF] flex items-center gap-1">
                  <Shield className="w-2.5 h-2.5" /> Admin
                </span>
              </div>
              <div className="space-y-0.5">
                {navItems.filter(i => i.adminOnly).map(({ icon: Icon, label, href }) => {
                  const active = pathname === href
                  return (
                    <Link key={label} href={href}
                      className={clsx(
                        'relative flex items-center gap-3 w-full px-3 py-1.5 rounded-md text-sm transition-colors text-left',
                        active
                          ? 'bg-[#FFFAE6] text-amber-700 font-semibold'
                          : 'text-[#44546F] hover:bg-[#F1F2F4] font-medium'
                      )}>
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-amber-400" />
                      )}
                      <Icon className={clsx('w-4 h-4 flex-shrink-0', active ? 'text-amber-600' : 'text-[#626F86]')} />
                      <span className="flex-1 truncate">{label}</span>
                    </Link>
                  )
                })}
                {isSiteAdmin && onGoToAdmin && (
                  <button onClick={onGoToAdmin}
                    className="relative flex items-center gap-3 w-full px-3 py-1.5 rounded-md text-sm text-[#44546F] hover:bg-[#F1F2F4] font-medium transition-colors text-left">
                    <Shield className="w-4 h-4 flex-shrink-0 text-amber-500" />
                    <span>Site admin panel</span>
                  </button>
                )}
              </div>
            </>
          )}
        </nav>

        {/* ── Collapse button ── */}
        <div className="border-t border-[#DFE1E6] p-2">
          <button onClick={() => setCollapsed(true)}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium text-[#626F86] hover:bg-[#F1F2F4] transition-colors">
            <ChevronLeft className="w-4 h-4" />
            <span>Collapse sidebar</span>
          </button>
        </div>
      </aside>

      {showNewProject && (
        <NewProjectModal onClose={() => setShowNewProject(false)} onCreated={handleNewProjectCreated} />
      )}
    </>
  )
}
