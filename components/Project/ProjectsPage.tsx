'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/store/useStore'
import { supabase } from '@/lib/supabase/client'
import Modal from '@/components/ui/Modal'
import type { Project } from '@/types'
import {
  Search, Plus, LayoutGrid, Star, Settings,
  Loader2, ExternalLink,
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
          <input className="input" value={name} onChange={e => handleNameChange(e.target.value)}
            placeholder="e.g. Mobile App" required autoFocus />
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

export default function ProjectsPage() {
  const { projects, project: activeProject, setProject, addProject, setBugs, setFeatures, setSprints } = useStore()
  const router = useRouter()
  const [search, setSearch]         = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const filtered = projects.filter(p =>
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

  return (
    <div className="flex-1 bg-white min-h-0 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#172B4D]">Projects</h1>
          <button onClick={() => setShowCreate(true)} className="btn-primary gap-1.5">
            <Plus className="w-4 h-4" />
            Create project
          </button>
        </div>

        {/* Search + filter bar */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#97A0AF]" />
            <input
              className="input pl-9"
              placeholder="Search projects"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Projects table */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-[#F4F5F7] flex items-center justify-center mx-auto mb-4">
              <LayoutGrid className="w-7 h-7 text-[#97A0AF]" />
            </div>
            <h3 className="text-base font-semibold text-[#172B4D] mb-1">
              {search ? 'No projects found' : 'No projects yet'}
            </h3>
            <p className="text-sm text-[#5E6C84] mb-4">
              {search ? 'Try a different search term.' : 'Create your first project to get started.'}
            </p>
            {!search && (
              <button onClick={() => setShowCreate(true)} className="btn-primary mx-auto">
                <Plus className="w-4 h-4" /> Create project
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white border border-[#DFE1E6] rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#DFE1E6] bg-[#F8F9FC]">
                  <th className="text-left px-4 py-3 text-xs font-bold text-[#626F86] uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-[#626F86] uppercase tracking-wide">Key</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-[#626F86] uppercase tracking-wide">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-[#626F86] uppercase tracking-wide">Lead</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}
                    className={clsx(
                      'border-b border-[#F4F5F7] hover:bg-[#F8F9FC] transition-colors cursor-pointer group',
                      activeProject?.id === p.id && 'bg-[#DEEBFF]'
                    )}
                    onClick={() => openProject(p)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: p.avatar_color }}>
                          {p.key.slice(0,2)}
                        </div>
                        <div>
                          <div className={clsx(
                            'text-sm font-semibold group-hover:text-[#0052CC] transition-colors',
                            activeProject?.id === p.id ? 'text-[#0052CC]' : 'text-[#172B4D]'
                          )}>
                            {p.name}
                          </div>
                          {p.description && (
                            <div className="text-xs text-[#626F86] truncate max-w-xs">{p.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono text-[#44546F]">{p.key}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs bg-[#DEEBFF] text-[#0052CC] px-2 py-0.5 rounded font-medium">
                        <LayoutGrid className="w-3 h-3" />
                        Scrum
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-[#626F86]">—</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={e => { e.stopPropagation(); openProject(p) }}
                          className="flex items-center gap-1 text-xs text-[#0052CC] hover:underline font-medium">
                          <ExternalLink className="w-3 h-3" />
                          Open
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-[#97A0AF] mt-4">
          Showing {filtered.length} of {projects.length} project{projects.length !== 1 ? 's' : ''}
        </p>
      </div>

      {showCreate && (
        <NewProjectModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
    </div>
  )
}
