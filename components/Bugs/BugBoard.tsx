'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import { Plus, Bug, Trash2, Pencil, List, LayoutGrid } from 'lucide-react'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import type { Bug as BugType, Priority, Status } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

const STATUSES: Status[] = ['todo', 'in_progress', 'review', 'done']
const STATUS_LABELS: Record<Status, string> = {
  todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done'
}
const STATUS_HEADER_COLOR: Record<Status, string> = {
  todo:        'border-t-[#DFE1E6]',
  in_progress: 'border-t-[#0052CC]',
  review:      'border-t-[#6554C0]',
  done:        'border-t-[#36B37E]',
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-[#5E6C84] mb-1">{children}</label>
}

function BugForm({ initial, onSave, onClose }: {
  initial?: Partial<BugType>
  onSave: (data: Partial<BugType>) => Promise<void>
  onClose: () => void
}) {
  const { profiles, sprints } = useStore()
  const [form, setForm] = useState({
    title:       initial?.title       ?? '',
    description: initial?.description ?? '',
    priority:    initial?.priority    ?? 'medium' as Priority,
    status:      initial?.status      ?? 'todo'   as Status,
    assignee_id: initial?.assignee_id ?? '',
    sprint_id:   initial?.sprint_id   ?? '',
  })
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({ ...form, assignee_id: form.assignee_id || undefined, sprint_id: form.sprint_id || undefined })
    setSaving(false)
    onClose()
  }

  return (
    <form onSubmit={submit} className="space-y-3.5">
      <div>
        <FieldLabel>Summary *</FieldLabel>
        <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Brief description of the bug" />
      </div>
      <div>
        <FieldLabel>Description</FieldLabel>
        <textarea className="input h-24 resize-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Steps to reproduce, expected vs actual..." />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Priority</FieldLabel>
          <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}>
            {(['critical', 'high', 'medium', 'low'] as Priority[]).map((p) => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel>Status</FieldLabel>
          <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })}>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Assignee</FieldLabel>
          <select className="input" value={form.assignee_id} onChange={(e) => setForm({ ...form, assignee_id: e.target.value })}>
            <option value="">Unassigned</option>
            {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <FieldLabel>Sprint</FieldLabel>
          <select className="input" value={form.sprint_id} onChange={(e) => setForm({ ...form, sprint_id: e.target.value })}>
            <option value="">No sprint</option>
            {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2 pt-2 border-t border-[#DFE1E6]">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving...' : initial?.id ? 'Update' : 'Create bug'}
        </button>
        <button type="button" onClick={onClose} className="btn-subtle">Cancel</button>
      </div>
    </form>
  )
}

export default function BugBoard() {
  const { bugs, setBugs, addBug, updateBug, deleteBug, user, project } = useStore()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing]       = useState<BugType | null>(null)
  const [view, setView]             = useState<'board' | 'list'>('board')
  const [filterPriority, setFilterPriority] = useState<Priority | ''>('')

  useEffect(() => {
    if (!project) return
    const pid = project.id
    supabase.from('bugs').select('*, assignee:profiles(*)').eq('project_id', pid).order('created_at', { ascending: false })
      .then(({ data }) => data && setBugs(data as any))
    const channel = supabase.channel(`bugs-realtime-${pid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bugs' }, () => {
        supabase.from('bugs').select('*, assignee:profiles(*)').eq('project_id', pid).order('created_at', { ascending: false })
          .then(({ data }) => data && setBugs(data as any))
      }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [project?.id])

  async function handleCreate(data: Partial<BugType>) {
    if (!user || !project) return
    const { data: bug } = await supabase.from('bugs').insert({ ...data, created_by: user.id, project_id: project.id }).select('*, assignee:profiles(*)').single()
    if (bug) addBug(bug as any)
  }

  async function handleUpdate(data: Partial<BugType>) {
    if (!editing) return
    await supabase.from('bugs').update(data).eq('id', editing.id)
    updateBug(editing.id, data)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this bug?')) return
    await supabase.from('bugs').delete().eq('id', id)
    deleteBug(id)
  }

  async function handleStatusChange(bug: BugType, status: Status) {
    await supabase.from('bugs').update({ status }).eq('id', bug.id)
    updateBug(bug.id, { status })
  }

  const filtered = bugs.filter((b) => !filterPriority || b.priority === filterPriority)

  return (
    <div className="p-5 space-y-4">
      {/* Page header */}
      <div className="flex items-center gap-3 pb-3 border-b border-[#DFE1E6]">
        <div>
          <div className="flex items-center gap-2">
            <Bug className="w-4 h-4 text-[#DE350B]" />
            <h1 className="text-lg font-semibold text-[#172B4D]">Bug Tracker</h1>
          </div>
          <p className="text-xs text-[#5E6C84] mt-0.5">{bugs.length} total · {bugs.filter(b => b.status !== 'done').length} open</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <select
            className="input w-36 py-1"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as any)}
          >
            <option value="">All priorities</option>
            {(['critical', 'high', 'medium', 'low'] as Priority[]).map((p) => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
          {/* View toggle */}
          <div className="flex rounded border border-[#DFE1E6] overflow-hidden bg-white">
            <button
              onClick={() => setView('board')}
              className={clsx('flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors',
                view === 'board' ? 'bg-[#0052CC] text-white' : 'text-[#42526E] hover:bg-[#F4F5F7]')}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Board
            </button>
            <button
              onClick={() => setView('list')}
              className={clsx('flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors border-l border-[#DFE1E6]',
                view === 'list' ? 'bg-[#0052CC] text-white' : 'text-[#42526E] hover:bg-[#F4F5F7]')}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-3.5 h-3.5" /> Create
          </button>
        </div>
      </div>

      {/* Board view */}
      {view === 'board' && (
        <div className="grid grid-cols-4 gap-3">
          {STATUSES.map((status) => {
            const items = filtered.filter((b) => b.status === status)
            return (
              <div
                key={status}
                className={clsx('rounded border-t-2 bg-[#F4F5F7] overflow-hidden', STATUS_HEADER_COLOR[status])}
                style={{ border: '1px solid #DFE1E6', borderTopWidth: '2px' }}
              >
                {/* Column header */}
                <div className="px-3 py-2.5 flex items-center justify-between bg-[#F4F5F7]">
                  <span className="text-xs font-semibold text-[#42526E] uppercase tracking-wide">{STATUS_LABELS[status]}</span>
                  <span className="text-xs bg-[#DFE1E6] text-[#42526E] px-1.5 py-0.5 rounded-sm font-semibold">{items.length}</span>
                </div>
                {/* Cards */}
                <div className="p-2 space-y-2 min-h-[100px]">
                  {items.map((bug) => (
                    <div
                      key={bug.id}
                      className="bg-white rounded border border-[#DFE1E6] p-2.5 hover:border-[#B3BAC5] transition-colors group cursor-pointer"
                      style={{ boxShadow: '0 1px 2px rgba(9,30,66,0.06)' }}
                    >
                      <div className="flex items-start justify-between gap-1.5 mb-2">
                        <p className="text-xs font-medium text-[#172B4D] leading-snug flex-1">{bug.title}</p>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button onClick={() => setEditing(bug)} className="p-1 text-[#7A869A] hover:text-[#0052CC] rounded hover:bg-[#DEEBFF]">
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={() => handleDelete(bug.id)} className="p-1 text-[#7A869A] hover:text-[#DE350B] rounded hover:bg-[#FFEBE6]">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <PriorityBadge priority={bug.priority} />
                        {bug.assignee && (
                          <span
                            className="w-5 h-5 rounded-full bg-[#0052CC] text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 ml-auto"
                            title={bug.assignee.name}
                          >
                            {bug.assignee.name[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <select
                        value={bug.status}
                        onChange={(e) => handleStatusChange(bug, e.target.value as Status)}
                        className="mt-2 w-full text-xs border border-[#DFE1E6] rounded-sm px-1.5 py-0.5 bg-white text-[#42526E] focus:outline-none focus:border-[#4C9AFF]"
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                      </select>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="py-6 text-center text-xs text-[#B3BAC5]">No issues</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="bg-white rounded border border-[#DFE1E6]" style={{ boxShadow: '0 1px 2px rgba(9,30,66,0.08)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#DFE1E6]">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#5E6C84] uppercase tracking-wide bg-[#F4F5F7]">Summary</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#5E6C84] uppercase tracking-wide bg-[#F4F5F7]">Priority</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#5E6C84] uppercase tracking-wide bg-[#F4F5F7]">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#5E6C84] uppercase tracking-wide bg-[#F4F5F7]">Assignee</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#5E6C84] uppercase tracking-wide bg-[#F4F5F7]">Created</th>
                <th className="px-4 py-2.5 bg-[#F4F5F7]"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[#7A869A]">No bugs found.</td></tr>
              )}
              {filtered.map((bug) => (
                <tr key={bug.id} className="border-b border-[#F4F5F7] hover:bg-[#F4F5F7] transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Bug className="w-3.5 h-3.5 text-[#DE350B] flex-shrink-0" />
                      <span className="font-medium text-[#172B4D]">{bug.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5"><PriorityBadge priority={bug.priority} /></td>
                  <td className="px-4 py-2.5">
                    <select
                      value={bug.status}
                      onChange={(e) => handleStatusChange(bug, e.target.value as Status)}
                      className="text-xs border border-[#DFE1E6] rounded-sm px-1.5 py-0.5 bg-white text-[#42526E] focus:outline-none focus:border-[#4C9AFF]"
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    {bug.assignee ? (
                      <div className="flex items-center gap-1.5">
                        <span className="w-6 h-6 rounded-full bg-[#0052CC] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                          {bug.assignee.name[0].toUpperCase()}
                        </span>
                        <span className="text-sm text-[#172B4D]">{bug.assignee.name}</span>
                      </div>
                    ) : <span className="text-[#B3BAC5]">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[#7A869A] whitespace-nowrap">
                    {formatDistanceToNow(new Date(bug.created_at), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => setEditing(bug)} className="p-1.5 text-[#7A869A] hover:text-[#0052CC] hover:bg-[#DEEBFF] rounded transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(bug.id)} className="p-1.5 text-[#7A869A] hover:text-[#DE350B] hover:bg-[#FFEBE6] rounded transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <Modal title="Create bug" onClose={() => setShowCreate(false)} size="lg">
          <BugForm onSave={handleCreate} onClose={() => setShowCreate(false)} />
        </Modal>
      )}
      {editing && (
        <Modal title="Edit bug" onClose={() => setEditing(null)} size="lg">
          <BugForm initial={editing} onSave={handleUpdate} onClose={() => setEditing(null)} />
        </Modal>
      )}
    </div>
  )
}
