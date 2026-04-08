'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import { Plus, Bug, Trash2, Pencil } from 'lucide-react'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import type { Bug as BugType, Priority, Status } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

const STATUSES: Status[] = ['todo', 'in_progress', 'review', 'done']
const STATUS_LABELS: Record<Status, string> = {
  todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done'
}
const STATUS_COLORS: Record<Status, string> = {
  todo: 'border-gray-300', in_progress: 'border-blue-400', review: 'border-purple-400', done: 'border-green-400'
}

function BugForm({ initial, onSave, onClose }: {
  initial?: Partial<BugType>
  onSave: (data: Partial<BugType>) => Promise<void>
  onClose: () => void
}) {
  const { profiles, sprints } = useStore()
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    priority: initial?.priority ?? 'medium' as Priority,
    status: initial?.status ?? 'todo' as Status,
    assignee_id: initial?.assignee_id ?? '',
    sprint_id: initial?.sprint_id ?? '',
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
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
        <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Brief description of the bug" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea className="input h-24 resize-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Steps to reproduce, expected vs actual..." />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}>
            {(['critical', 'high', 'medium', 'low'] as Priority[]).map((p) => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })}>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
          <select className="input" value={form.assignee_id} onChange={(e) => setForm({ ...form, assignee_id: e.target.value })}>
            <option value="">Unassigned</option>
            {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sprint</label>
          <select className="input" value={form.sprint_id} onChange={(e) => setForm({ ...form, sprint_id: e.target.value })}>
            <option value="">No sprint</option>
            {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving...' : initial?.id ? 'Update Bug' : 'Create Bug'}
        </button>
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
      </div>
    </form>
  )
}

export default function BugBoard() {
  const { bugs, setBugs, addBug, updateBug, deleteBug, user } = useStore()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<BugType | null>(null)
  const [view, setView] = useState<'board' | 'list'>('board')
  const [filterPriority, setFilterPriority] = useState<Priority | ''>('')

  useEffect(() => {
    supabase.from('bugs').select('*, assignee:profiles(*)').order('created_at', { ascending: false })
      .then(({ data }) => data && setBugs(data as any))
    const channel = supabase.channel('bugs-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bugs' }, () => {
        supabase.from('bugs').select('*, assignee:profiles(*)').order('created_at', { ascending: false })
          .then(({ data }) => data && setBugs(data as any))
      }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function handleCreate(data: Partial<BugType>) {
    if (!user) return
    const { data: bug } = await supabase.from('bugs').insert({ ...data, created_by: user.id }).select('*, assignee:profiles(*)').single()
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
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Bug className="w-5 h-5 text-red-500" /> Bug Tracker
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{bugs.length} total · {bugs.filter(b => b.status !== 'done').length} open</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <select className="input w-36 py-1.5" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as any)}>
            <option value="">All priorities</option>
            {(['critical', 'high', 'medium', 'low'] as Priority[]).map((p) => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(['board', 'list'] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={clsx('px-3 py-1.5 text-sm font-medium transition-colors',
                  view === v ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50')}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> New Bug
          </button>
        </div>
      </div>

      {view === 'board' && (
        <div className="grid grid-cols-4 gap-4 pb-4">
          {STATUSES.map((status) => {
            const items = filtered.filter((b) => b.status === status)
            return (
              <div key={status} className={clsx('rounded-xl border-t-4 bg-white shadow-sm overflow-hidden', STATUS_COLORS[status])}>
                <div className="px-4 py-3 bg-white border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-gray-700">{STATUS_LABELS[status]}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{items.length}</span>
                  </div>
                </div>
                <div className="p-3 space-y-2 min-h-[120px]">
                  {items.map((bug) => (
                    <div key={bug.id} className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors group">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-medium text-gray-800 leading-tight flex-1">{bug.title}</p>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button onClick={() => setEditing(bug)} className="p-1 text-gray-400 hover:text-blue-600"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(bug.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <PriorityBadge priority={bug.priority} />
                        {bug.assignee && (
                          <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0" title={bug.assignee.name}>
                            {bug.assignee.name[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <select value={bug.status} onChange={(e) => handleStatusChange(bug, e.target.value as Status)}
                        className="mt-2 text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white text-gray-600 w-full">
                        {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                      </select>
                    </div>
                  ))}
                  {items.length === 0 && <div className="py-6 text-center text-xs text-gray-300">Drop items here</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {view === 'list' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Priority</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Assignee</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No bugs found.</td></tr>}
              {filtered.map((bug) => (
                <tr key={bug.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{bug.title}</td>
                  <td className="px-4 py-3"><PriorityBadge priority={bug.priority} /></td>
                  <td className="px-4 py-3">
                    <select value={bug.status} onChange={(e) => handleStatusChange(bug, e.target.value as Status)}
                      className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-600">
                      {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{bug.assignee?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    {formatDistanceToNow(new Date(bug.created_at), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => setEditing(bug)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(bug.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <Modal title="Create Bug" onClose={() => setShowCreate(false)} size="lg">
          <BugForm onSave={handleCreate} onClose={() => setShowCreate(false)} />
        </Modal>
      )}
      {editing && (
        <Modal title="Edit Bug" onClose={() => setEditing(null)} size="lg">
          <BugForm initial={editing} onSave={handleUpdate} onClose={() => setEditing(null)} />
        </Modal>
      )}
    </div>
  )
}
