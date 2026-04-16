'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/store/useStore'
import { projectService } from '@/lib/services'
import Modal from '@/components/ui/Modal'
import type { Project } from '@/types'
import {
  Search, Plus, LayoutGrid, Loader2,
  ExternalLink, Users, Crown, Lock,
} from 'lucide-react'
import clsx from 'clsx'
import { formatDistanceToNow } from 'date-fns'

const AVATAR_COLORS = [
  '#0052CC','#6554C0','#00B8D9','#36B37E',
  '#FF5630','#FF991F','#172B4D','#403294',
]

function toKey(name: string) {
  return name.toUpperCase().replace(/[^A-Z0-9\s]/g,'').trim()
    .split(/\s+/).map(w => w[0]).join('').slice(0,4) || 'PROJ'
}

// ── Create project modal ──────────────────────────────────────────────────────

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
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--t3)' }}>Color</p>
            <div className="flex gap-1.5 flex-wrap">
              {AVATAR_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className="w-5 h-5 rounded transition-transform hover:scale-110"
                  style={{ backgroundColor: c, outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }} />
              ))}
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--t3)' }}>
            Project name <span className="text-red-500">*</span>
          </label>
          <input className="input" value={name} onChange={e => handleNameChange(e.target.value)}
            placeholder="e.g. Mobile App" required autoFocus />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--t3)' }}>
            Project key <span className="text-red-500">*</span>
          </label>
          <input className="input" value={key}
            onChange={e => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6))}
            placeholder="PROJ" required />
          <p className="text-[11px] mt-1" style={{ color: 'var(--t4)' }}>
            Used to prefix issue keys (e.g. {key || 'PROJ'}-1)
          </p>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--t3)' }}>
            Description <span className="font-normal" style={{ color: 'var(--t4)' }}>(optional)</span>
          </label>
          <textarea className="input resize-none h-16" value={description}
            onChange={e => setDescription(e.target.value)} placeholder="What is this project about?" />
        </div>
        {error && <p className="text-xs px-3 py-2 rounded text-red-600 bg-red-50">{error}</p>}
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

// ── Project card ──────────────────────────────────────────────────────────────

function ProjectCard({
  p, isActive, isOwned, onOpen,
}: {
  p: Project
  isActive: boolean
  isOwned: boolean
  onOpen: (p: Project) => void
}) {
  return (
    <div
      onClick={() => onOpen(p)}
      className="group relative flex flex-col rounded-xl overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5"
      style={{
        background:  'var(--bg-card)',
        border:      `1px solid ${isActive ? 'var(--blue)' : 'var(--border)'}`,
        boxShadow:   isActive ? '0 0 0 3px var(--blue-bg)' : '0 1px 4px rgba(9,30,66,0.06)',
      }}>

      {/* Color bar */}
      <div className="h-1.5 w-full" style={{ background: p.avatar_color }} />

      <div className="p-4 flex flex-col flex-1 gap-3">
        {/* Avatar + name */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-black flex-shrink-0"
            style={{ background: p.avatar_color }}>
            {p.key.slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate leading-tight" style={{ color: 'var(--t1)' }}>
              {p.name}
            </p>
            <p className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--t4)' }}>{p.key}</p>
          </div>
        </div>

        {/* Description */}
        {p.description && (
          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--t3)' }}>
            {p.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 mt-auto pt-1">
          <Lock className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--t5)' }} />
          <span className="text-[10px] font-medium" style={{ color: 'var(--t4)' }}>Private</span>
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: isOwned ? 'var(--amber-bg, #FFFAE6)' : 'var(--blue-bg)',
              color:      isOwned ? '#974F0C'                   : 'var(--blue)',
            }}>
            {isOwned
              ? <><Crown className="w-2.5 h-2.5" /> Owner</>
              : <><Users className="w-2.5 h-2.5" /> Member</>
            }
          </span>
        </div>
      </div>

      {/* Open button on hover */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg"
          style={{ background: 'var(--blue)', color: 'white' }}>
          <ExternalLink className="w-3 h-3" /> Open
        </div>
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ tab, onCreate }: { tab: 'mine' | 'invited'; onCreate?: () => void }) {
  if (tab === 'invited') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'var(--bg-raised)' }}>
          <Users className="w-7 h-7" style={{ color: 'var(--t4)' }} />
        </div>
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--t1)' }}>No invited projects</p>
        <p className="text-sm" style={{ color: 'var(--t3)' }}>
          When someone invites you to their project, it will appear here.
        </p>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'var(--bg-raised)' }}>
        <LayoutGrid className="w-7 h-7" style={{ color: 'var(--t4)' }} />
      </div>
      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--t1)' }}>No projects yet</p>
      <p className="text-sm mb-4" style={{ color: 'var(--t3)' }}>Create your first project to get started.</p>
      {onCreate && (
        <button onClick={onCreate} className="btn-primary">
          <Plus className="w-4 h-4" /> Create project
        </button>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = 'mine' | 'invited'

export default function ProjectsPage() {
  const { projects, project: activeProject, user, setProject, addProject, setBugs, setFeatures, setSprints } = useStore()
  const router = useRouter()

  const [tab,        setTab]        = useState<Tab>('mine')
  const [search,     setSearch]     = useState('')
  const [showCreate, setShowCreate] = useState(false)

  // Split into owned vs invited
  const mine    = projects.filter(p => p.created_by === user?.id)
  const invited = projects.filter(p => p.created_by !== user?.id)

  const list    = (tab === 'mine' ? mine : invited)
    .filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.key.toLowerCase().includes(search.toLowerCase())
    )

  function openProject(p: Project) {
    setProject(p); setBugs([]); setFeatures([]); setSprints([])
    router.push('/dashboard/board')
  }

  function handleCreated(p: Project) {
    addProject(p); setProject(p); setBugs([]); setFeatures([]); setSprints([])
    setShowCreate(false)
    router.push('/dashboard/board')
  }

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: 'mine',    label: 'My Projects', count: mine.length    },
    { id: 'invited', label: 'Invited',     count: invited.length },
  ]

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--t1)' }}>Projects</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--t3)' }}>
              {projects.length} project{projects.length !== 1 ? 's' : ''} you have access to
            </p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Create project
          </button>
        </div>

        {/* Tabs + search */}
        <div className="flex items-center justify-between mb-5 gap-4">
          <div className="flex items-center gap-1 p-1 rounded-xl"
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all',
                  tab === t.id
                    ? 'bg-white shadow-sm'
                    : 'hover:bg-white/50'
                )}
                style={{ color: tab === t.id ? 'var(--t1)' : 'var(--t3)' }}>
                {t.label}
                <span className={clsx(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                )}
                  style={{
                    background: tab === t.id ? 'var(--blue-bg)' : 'var(--bg-sunken)',
                    color:      tab === t.id ? 'var(--blue)'    : 'var(--t4)',
                  }}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--t4)' }} />
            <input
              className="input pl-9 text-sm w-56"
              placeholder="Search projects…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Grid */}
        {list.length === 0 ? (
          <EmptyState tab={tab} onCreate={tab === 'mine' ? () => setShowCreate(true) : undefined} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map(p => (
              <ProjectCard
                key={p.id}
                p={p}
                isActive={activeProject?.id === p.id}
                isOwned={p.created_by === user?.id}
                onOpen={openProject}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <NewProjectModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
    </div>
  )
}
