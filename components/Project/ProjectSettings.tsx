'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import { Settings, Lock, Trash2, Loader2, Check, Shield, Users } from 'lucide-react'
import clsx from 'clsx'

const AVATAR_COLORS = [
  '#0052CC','#6554C0','#00B8D9','#36B37E',
  '#FF5630','#FF991F','#172B4D','#403294',
]

export default function ProjectSettings() {
  const { project, setProject, projects, setProjects, user, setActiveView, projectMembers } = useStore()

  const [name,        setName]        = useState(project?.name ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [color,       setColor]       = useState(project?.avatar_color ?? AVATAR_COLORS[0])
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)
  const [error,       setError]       = useState('')
  const [deleting,    setDeleting]    = useState(false)
  const [confirmName, setConfirmName] = useState('')

  const isProjectAdmin =
    user?.role === 'admin' ||
    projectMembers.some(m => m.user_id === user?.id && m.role === 'admin')

  if (!project) return null
  // Narrow to non-null for closures below
  const proj = project

  if (!isProjectAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-center px-6">
        <div className="w-14 h-14 bg-[#FFFAE6] rounded-2xl flex items-center justify-center mb-4">
          <Lock className="w-7 h-7 text-amber-500" />
        </div>
        <h2 className="text-base font-bold text-[#172B4D] mb-1">Access restricted</h2>
        <p className="text-sm text-[#5E6C84]">Only project admins can manage project settings.</p>
      </div>
    )
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true); setError(''); setSaved(false)

    const { data, error: err } = await supabase.from('projects')
      .update({ name: name.trim(), description: description.trim() || null, avatar_color: color })
      .eq('id', proj.id)
      .select().single()

    if (err) { setError(err.message); setSaving(false); return }
    setProject(data)
    setProjects(projects.map(p => p.id === data.id ? data : p))
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function handleDelete() {
    if (confirmName !== proj.name) return
    setDeleting(true)
    await supabase.from('bugs').delete().eq('project_id', proj.id)
    await supabase.from('features').delete().eq('project_id', proj.id)
    await supabase.from('sprints').delete().eq('project_id', proj.id)
    await supabase.from('project_members').delete().eq('project_id', proj.id)
    await supabase.from('projects').delete().eq('id', proj.id)

    const remaining = projects.filter(p => p.id !== proj.id)
    setProjects(remaining)
    if (remaining.length > 0) {
      setProject(remaining[0])
      setActiveView('board')
    } else {
      setProject(null as any)
      setActiveView('projects')
    }
    setDeleting(false)
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="w-5 h-5 text-[#0052CC]" />
        <div>
          <h1 className="text-xl font-bold text-[#172B4D]">Project Settings</h1>
          <p className="text-sm text-[#5E6C84]">{proj.key} · Manage this project</p>
        </div>
      </div>

      {/* Privacy notice */}
      <div className="flex items-start gap-3 bg-[#DEEBFF] border border-[#B3D4FF] rounded-lg px-4 py-3">
        <Lock className="w-4 h-4 text-[#0052CC] mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-[#0052CC]">This project is private</p>
          <p className="text-xs text-[#0065FF] mt-0.5">
            Only members you explicitly invite can see this project and its contents.
            No one can find or access it without an invite.
          </p>
        </div>
      </div>

      {/* General settings */}
      <div className="bg-white rounded-lg border border-[#DFE1E6] overflow-hidden"
        style={{ boxShadow: '0 1px 2px rgba(9,30,66,0.08)' }}>
        <div className="px-5 py-4 border-b border-[#DFE1E6] bg-[#F8F9FC]">
          <h3 className="text-sm font-bold text-[#172B4D]">General</h3>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {/* Avatar preview + color picker */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-lg font-black flex-shrink-0"
              style={{ backgroundColor: color }}>
              {proj.key.slice(0,2)}
            </div>
            <div>
              <p className="text-xs font-semibold text-[#5E6C84] mb-2">Project color</p>
              <div className="flex gap-2 flex-wrap">
                {AVATAR_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setColor(c)}
                    className="w-6 h-6 rounded-md transition-transform hover:scale-110 relative"
                    style={{ backgroundColor: c }}>
                    {color === c && (
                      <Check className="w-3.5 h-3.5 text-white absolute inset-0 m-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5E6C84] mb-1.5">
              Project name <span className="text-[#DE350B]">*</span>
            </label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} required />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5E6C84] mb-1.5">
              Project key
            </label>
            <input className="input bg-[#F4F5F7] cursor-not-allowed" value={proj.key} disabled />
            <p className="text-[11px] text-[#97A0AF] mt-1">Project key cannot be changed after creation.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5E6C84] mb-1.5">Description</label>
            <textarea className="input resize-none h-20"
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Describe the purpose of this project…" />
          </div>

          {error && <p className="text-xs px-3 py-2 rounded text-[#DE350B] bg-[#FFEBE6]">{error}</p>}

          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving || !name.trim()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
              {saving
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                : saved
                ? <><Check className="w-3.5 h-3.5" /> Saved!</>
                : 'Save changes'}
            </button>
            {saved && <span className="text-xs text-[#36B37E] font-medium">Project updated successfully</span>}
          </div>
        </form>
      </div>

      {/* Members summary */}
      <div className="bg-white rounded-lg border border-[#DFE1E6] overflow-hidden"
        style={{ boxShadow: '0 1px 2px rgba(9,30,66,0.08)' }}>
        <div className="px-5 py-4 border-b border-[#DFE1E6] bg-[#F8F9FC] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#172B4D]">Members</h3>
          <button onClick={() => setActiveView('team')}
            className="text-xs text-[#0052CC] hover:underline font-medium flex items-center gap-1">
            <Users className="w-3 h-3" />
            Manage members
          </button>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {projectMembers.slice(0, 5).map((m, i) => (
                <div key={m.id}
                  className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ background: `hsl(${(m.user_id?.charCodeAt(0) ?? 0) * 10 % 360}, 60%, 45%)`, zIndex: 5 - i }}>
                  {(m.profile?.name?.[0] ?? '?').toUpperCase()}
                </div>
              ))}
              {projectMembers.length > 5 && (
                <div className="w-8 h-8 rounded-full border-2 border-white bg-[#DFE1E6] flex items-center justify-center text-[10px] font-semibold text-[#626F86]"
                  style={{ zIndex: 0 }}>
                  +{projectMembers.length - 5}
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#172B4D]">{projectMembers.length} member{projectMembers.length !== 1 ? 's' : ''}</p>
              <p className="text-xs text-[#7A869A]">
                {projectMembers.filter(m => m.role === 'admin').length} admin{projectMembers.filter(m => m.role === 'admin').length !== 1 ? 's' : ''} ·{' '}
                {projectMembers.filter(m => m.role === 'member').length} member{projectMembers.filter(m => m.role === 'member').length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-lg border border-[#FFBDAD] overflow-hidden"
        style={{ boxShadow: '0 1px 2px rgba(9,30,66,0.08)' }}>
        <div className="px-5 py-4 border-b border-[#FFBDAD] bg-[#FFEBE6]">
          <h3 className="text-sm font-bold text-[#DE350B]">Danger Zone</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#172B4D]">Delete this project</p>
              <p className="text-xs text-[#7A869A] mt-0.5">
                Permanently delete <strong>{proj.name}</strong> and all its issues, features, and sprints. This cannot be undone.
              </p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5E6C84] mb-1.5">
              Type <span className="font-mono text-[#DE350B]">{proj.name}</span> to confirm
            </label>
            <input className="input border-[#FFBDAD] focus:border-[#DE350B]"
              value={confirmName} onChange={e => setConfirmName(e.target.value)}
              placeholder={proj.name} />
          </div>
          <button
            onClick={handleDelete}
            disabled={confirmName !== proj.name || deleting}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded text-sm font-semibold transition-colors',
              confirmName === proj.name
                ? 'bg-[#DE350B] text-white hover:bg-[#BF2600] cursor-pointer'
                : 'bg-[#F4F5F7] text-[#B3BAC5] cursor-not-allowed'
            )}>
            {deleting
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting…</>
              : <><Trash2 className="w-3.5 h-3.5" /> Delete project</>}
          </button>
        </div>
      </div>
    </div>
  )
}
