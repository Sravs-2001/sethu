'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import type { Project } from '@/types'
import Modal from '@/components/ui/Modal'
import {
  Bug, Sparkles, Rocket, Users, Plus, ArrowRight,
  Loader2, FolderKanban, AlertCircle,
} from 'lucide-react'
import clsx from 'clsx'
import { formatDistanceToNow } from 'date-fns'

const AVATAR_COLORS = [
  '#0052CC', '#6554C0', '#00B8D9', '#36B37E',
  '#FF5630', '#FF991F', '#172B4D', '#403294',
]

function toKey(name: string) {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .slice(0, 4) || 'PROJ'
}

interface ProjectStats {
  openBugs: number
  criticalBugs: number
  openFeatures: number
  activeSprint: string | null
  memberCount: number
}

// ── Create Project Modal ────────────────────────────────────────────
function CreateProjectModal({ onClose, onCreated }: {
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
    setSaving(true)
    setError('')
    const { data, error: err } = await supabase
      .from('projects')
      .insert({ name: name.trim(), key: key || toKey(name), description: description.trim() || null, avatar_color: color, created_by: user.id })
      .select().single()
    if (err) { setError(err.message); setSaving(false); return }
    onCreated(data as Project)
  }

  return (
    <Modal title="Create new project" onClose={onClose} size="sm">
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded flex items-center justify-center text-white text-lg font-bold flex-shrink-0" style={{ backgroundColor: color }}>
            {key || 'P'}
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#5E6C84] mb-1.5">Colour</p>
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
          <label className="block text-xs font-semibold text-[#5E6C84] mb-1">Project name <span className="text-[#DE350B]">*</span></label>
          <input className="input" value={name} onChange={e => handleNameChange(e.target.value)} placeholder="e.g. Mobile App" required autoFocus />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#5E6C84] mb-1">Project key <span className="text-[#DE350B]">*</span></label>
          <input className="input" value={key} onChange={e => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} placeholder="PROJ" required />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#5E6C84] mb-1">Description <span className="text-[#7A869A] font-normal">(optional)</span></label>
          <textarea className="input resize-none h-16" value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this project about?" />
        </div>
        {error && <p className="text-xs text-[#DE350B] bg-[#FFEBE6] px-3 py-2 rounded">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 px-3 py-1.5 text-sm font-medium text-[#5E6C84] border border-[#DFE1E6] rounded hover:bg-[#F4F5F7] transition-colors">Cancel</button>
          <button type="submit" disabled={saving || !name.trim()} className="flex-1 btn-primary justify-center disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating…</> : 'Create project'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── ProjectCard ─────────────────────────────────────────────────────
function ProjectCard({ project, stats, onOpen }: {
  project: Project
  stats: ProjectStats | null
  onOpen: () => void
}) {
  return (
    <div className="bg-white rounded-lg border border-[#DFE1E6] flex flex-col hover:shadow-md transition-shadow"
      style={{ boxShadow: '0 1px 3px rgba(9,30,66,0.10)' }}>
      {/* Card header */}
      <div className="p-5 flex items-start gap-3 border-b border-[#F4F5F7]">
        <div
          className="w-11 h-11 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ backgroundColor: project.avatar_color }}
        >
          {project.key.slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-[#172B4D] text-sm leading-tight truncate">{project.name}</div>
          <div className="text-[11px] text-[#7A869A] mt-0.5 font-mono">{project.key}</div>
          {project.description && (
            <p className="text-xs text-[#5E6C84] mt-1.5 line-clamp-2 leading-relaxed">{project.description}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 py-3.5 grid grid-cols-3 gap-3 border-b border-[#F4F5F7]">
        {stats === null ? (
          <div className="col-span-3 flex items-center justify-center py-1">
            <Loader2 className="w-4 h-4 animate-spin text-[#B3BAC5]" />
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1">
                <Bug className="w-3 h-3 text-[#DE350B]" />
                <span className="text-base font-bold text-[#172B4D]">{stats.openBugs}</span>
              </div>
              <span className="text-[10px] text-[#7A869A] font-medium">Open Bugs</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#6554C0]" />
                <span className="text-base font-bold text-[#172B4D]">{stats.openFeatures}</span>
              </div>
              <span className="text-[10px] text-[#7A869A] font-medium">Features</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 text-[#0052CC]" />
                <span className="text-base font-bold text-[#172B4D]">{stats.memberCount}</span>
              </div>
              <span className="text-[10px] text-[#7A869A] font-medium">Members</span>
            </div>
          </>
        )}
      </div>

      {/* Sprint + CTA */}
      <div className="px-5 py-3.5 flex items-center gap-2">
        {stats?.activeSprint ? (
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#36B37E] flex-shrink-0" />
            <span className="text-[11px] text-[#5E6C84] truncate font-medium">{stats.activeSprint}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#DFE1E6] flex-shrink-0" />
            <span className="text-[11px] text-[#B3BAC5]">No active sprint</span>
          </div>
        )}
        <button
          onClick={onOpen}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-[#0052CC] text-white text-xs font-semibold rounded hover:bg-[#0747A6] transition-colors"
        >
          Open <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Created at */}
      <div className="px-5 pb-3 text-[10px] text-[#B3BAC5]">
        Created {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
      </div>
    </div>
  )
}

// ── ProjectsOverview ────────────────────────────────────────────────
export default function ProjectsOverview({ onOpenProject }: {
  onOpenProject: (project: Project) => void
}) {
  const { projects, setProject, setProjects, addProject, setBugs, setFeatures, setSprints, profiles } = useStore()
  const [stats, setStats] = useState<Record<string, ProjectStats>>({})
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (projects.length === 0) { setLoading(false); return }
    const ids = projects.map(p => p.id)

    Promise.all([
      supabase.from('bugs').select('project_id, status, priority').in('project_id', ids),
      supabase.from('features').select('project_id, status').in('project_id', ids),
      supabase.from('sprints').select('project_id, status, name').in('project_id', ids),
    ]).then(([bugRes, featRes, sprintRes]) => {
      const bugs     = bugRes.data     ?? []
      const features = featRes.data    ?? []
      const sprints  = sprintRes.data  ?? []

      const computed: Record<string, ProjectStats> = {}
      for (const p of projects) {
        const pid = p.id
        const pBugs     = bugs.filter((b: any) => b.project_id === pid)
        const pFeatures = features.filter((f: any) => f.project_id === pid)
        const pSprints  = sprints.filter((s: any) => s.project_id === pid)
        const active    = pSprints.find((s: any) => s.status === 'active')
        computed[pid] = {
          openBugs:    pBugs.filter((b: any) => b.status !== 'done').length,
          criticalBugs:pBugs.filter((b: any) => b.priority === 'critical' && b.status !== 'done').length,
          openFeatures:pFeatures.filter((f: any) => f.status !== 'done').length,
          activeSprint: active ? active.name : null,
          memberCount: profiles.length,
        }
      }
      setStats(computed)
      setLoading(false)
    })
  }, [projects, profiles])

  function handleCreated(p: Project) {
    addProject(p)
    setShowCreate(false)
  }

  function handleOpen(p: Project) {
    setProject(p)
    setBugs([])
    setFeatures([])
    setSprints([])
    onOpenProject(p)
  }

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#172B4D]">Projects</h1>
          <p className="text-sm text-[#5E6C84] mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Create project
        </button>
      </div>

      {/* Empty state */}
      {projects.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-[#DEEBFF] rounded-full flex items-center justify-center mb-4">
            <FolderKanban className="w-8 h-8 text-[#0052CC]" />
          </div>
          <h2 className="text-base font-semibold text-[#172B4D] mb-1">No projects yet</h2>
          <p className="text-sm text-[#5E6C84] mb-4">Create your first project to get started.</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Create project
          </button>
        </div>
      )}

      {/* Projects grid */}
      {projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              stats={loading ? null : (stats[p.id] ?? null)}
              onOpen={() => handleOpen(p)}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateProjectModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
    </div>
  )
}
