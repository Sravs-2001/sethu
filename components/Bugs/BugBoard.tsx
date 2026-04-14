'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import { Plus, Trash2, Pencil, List, LayoutGrid, ChevronDown } from 'lucide-react'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import type { Bug as BugType, Priority, Status, IssueType } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

const STATUSES: Status[]       = ['todo', 'in_progress', 'review', 'done']
const STATUS_LABELS: Record<Status, string> = {
  todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done',
}
const STATUS_TOP_COLOR: Record<Status, string> = {
  todo: '#DFE1E6', in_progress: '#0052CC', review: '#6554C0', done: '#36B37E',
}

const ISSUE_TYPES: IssueType[] = ['epic', 'story', 'task', 'bug', 'subtask']
const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  epic: 'Epic', story: 'Story', task: 'Task', bug: 'Bug', subtask: 'Subtask',
}
const ISSUE_TYPE_ICON: Record<IssueType, string> = {
  epic: '⚡', story: '📖', task: '☑️', bug: '🐛', subtask: '↳',
}
const ISSUE_TYPE_COLOR: Record<IssueType, { text: string; bg: string }> = {
  epic:    { text: '#6554C0', bg: '#EAE6FF' },
  story:   { text: '#36B37E', bg: '#E3FCEF' },
  task:    { text: '#0052CC', bg: '#DEEBFF' },
  bug:     { text: '#DE350B', bg: '#FFEBE6' },
  subtask: { text: '#626F86', bg: '#F4F5F7' },
}

function TypeBadge({ type }: { type: IssueType }) {
  const { text, bg } = ISSUE_TYPE_COLOR[type]
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded"
      style={{ color: text, background: bg }}>
      <span>{ISSUE_TYPE_ICON[type]}</span>
      {ISSUE_TYPE_LABELS[type]}
    </span>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-[#5E6C84] mb-1">{children}</label>
}

function IssueForm({ initial, onSave, onClose, projectKey }: {
  initial?: Partial<BugType>
  onSave: (data: Partial<BugType>) => Promise<void>
  onClose: () => void
  projectKey?: string
}) {
  const { profiles, sprints } = useStore()
  const [form, setForm] = useState({
    title:       initial?.title       ?? '',
    description: initial?.description ?? '',
    issue_type:  initial?.issue_type  ?? 'task' as IssueType,
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
      {/* Issue type selector */}
      <div>
        <FieldLabel>Issue type</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {ISSUE_TYPES.map(t => (
            <button key={t} type="button" onClick={() => setForm({ ...form, issue_type: t })}
              className={clsx('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all',
                form.issue_type === t
                  ? 'border-current'
                  : 'border-[#DFE1E6] hover:border-[#B3BAC5]'
              )}
              style={form.issue_type === t ? { color: ISSUE_TYPE_COLOR[t].text, background: ISSUE_TYPE_COLOR[t].bg, borderColor: ISSUE_TYPE_COLOR[t].text } : {}}>
              <span>{ISSUE_TYPE_ICON[t]}</span>
              {ISSUE_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>Summary *</FieldLabel>
        <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
          required autoFocus placeholder={
            form.issue_type === 'bug'     ? 'Describe the bug briefly…'       :
            form.issue_type === 'epic'    ? 'Name this epic…'                  :
            form.issue_type === 'story'   ? 'As a user, I want to…'           :
            'What needs to be done?'
          } />
      </div>

      <div>
        <FieldLabel>Description</FieldLabel>
        <textarea className="input h-24 resize-none" value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          placeholder={form.issue_type === 'bug' ? 'Steps to reproduce, expected vs actual…' : 'Add more details…'} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Priority</FieldLabel>
          <select className="input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as Priority })}>
            {(['critical', 'high', 'medium', 'low'] as Priority[]).map(p => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel>Status</FieldLabel>
          <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Status })}>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Assignee</FieldLabel>
          <select className="input" value={form.assignee_id} onChange={e => setForm({ ...form, assignee_id: e.target.value })}>
            <option value="">Unassigned</option>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <FieldLabel>Sprint</FieldLabel>
          <select className="input" value={form.sprint_id} onChange={e => setForm({ ...form, sprint_id: e.target.value })}>
            <option value="">No sprint</option>
            {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-2 pt-2 border-t border-[#DFE1E6]">
        <button type="submit" className="btn-primary" disabled={saving || !form.title.trim()}>
          {saving ? 'Saving…' : initial?.id ? 'Update issue' : 'Create issue'}
        </button>
        <button type="button" onClick={onClose} className="btn-subtle">Cancel</button>
      </div>
    </form>
  )
}

export default function BugBoard() {
  const { bugs, setBugs, addBug, updateBug, deleteBug, user, project } = useStore()
  const [showCreate, setShowCreate]           = useState(false)
  const [editing, setEditing]                 = useState<BugType | null>(null)
  const [view, setView]                       = useState<'board' | 'list'>('board')
  const [filterPriority, setFilterPriority]   = useState<Priority | ''>('')
  const [filterType, setFilterType]           = useState<IssueType | ''>('')

  useEffect(() => {
    if (!project) return
    const pid = project.id
    supabase.from('bugs').select('*, assignee:profiles(*)')
      .eq('project_id', pid).order('created_at', { ascending: false })
      .then(({ data }) => data && setBugs(data as any))

    const channel = supabase.channel(`bugs-${pid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bugs' }, () => {
        supabase.from('bugs').select('*, assignee:profiles(*)')
          .eq('project_id', pid).order('created_at', { ascending: false })
          .then(({ data }) => data && setBugs(data as any))
      }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [project?.id])

  async function handleCreate(data: Partial<BugType>) {
    if (!user || !project) return
    const { data: bug } = await supabase.from('bugs')
      .insert({ ...data, issue_type: data.issue_type ?? 'task', created_by: user.id, project_id: project.id, tags: [] })
      .select('*, assignee:profiles(*)').single()
    if (bug) addBug(bug as any)
  }

  async function handleUpdate(data: Partial<BugType>) {
    if (!editing) return
    await supabase.from('bugs').update(data).eq('id', editing.id)
    updateBug(editing.id, data)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this issue?')) return
    await supabase.from('bugs').delete().eq('id', id)
    deleteBug(id)
  }

  async function handleStatusChange(bug: BugType, status: Status) {
    await supabase.from('bugs').update({ status }).eq('id', bug.id)
    updateBug(bug.id, { status })
  }

  const filtered = bugs.filter(b =>
    (!filterPriority || b.priority === filterPriority) &&
    (!filterType     || b.issue_type === filterType)
  )

  const totalOpen = bugs.filter(b => b.status !== 'done').length

  return (
    <div className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-[#DFE1E6]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <h1 className="text-lg font-bold text-[#172B4D]">Issues</h1>
          </div>
          <p className="text-xs text-[#5E6C84] mt-0.5">
            {bugs.length} total · {totalOpen} open · {project?.key}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {/* Type filter */}
          <select className="input w-36 py-1 text-xs"
            value={filterType} onChange={e => setFilterType(e.target.value as any)}>
            <option value="">All types</option>
            {ISSUE_TYPES.map(t => (
              <option key={t} value={t}>{ISSUE_TYPE_ICON[t]} {ISSUE_TYPE_LABELS[t]}</option>
            ))}
          </select>

          {/* Priority filter */}
          <select className="input w-36 py-1 text-xs"
            value={filterPriority} onChange={e => setFilterPriority(e.target.value as any)}>
            <option value="">All priorities</option>
            {(['critical', 'high', 'medium', 'low'] as Priority[]).map(p => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>

          {/* View toggle */}
          <div className="flex rounded border border-[#DFE1E6] overflow-hidden bg-white">
            <button onClick={() => setView('board')}
              className={clsx('flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors',
                view === 'board' ? 'bg-[#0052CC] text-white' : 'text-[#42526E] hover:bg-[#F4F5F7]')}>
              <LayoutGrid className="w-3.5 h-3.5" /> Board
            </button>
            <button onClick={() => setView('list')}
              className={clsx('flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors border-l border-[#DFE1E6]',
                view === 'list' ? 'bg-[#0052CC] text-white' : 'text-[#42526E] hover:bg-[#F4F5F7]')}>
              <List className="w-3.5 h-3.5" /> List
            </button>
          </div>

          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-3.5 h-3.5" /> Create issue
          </button>
        </div>
      </div>

      {/* Board view */}
      {view === 'board' && (
        <div className="grid grid-cols-4 gap-3 min-h-0">
          {STATUSES.map(status => {
            const items = filtered.filter(b => b.status === status)
            return (
              <div key={status} className="rounded-xl overflow-hidden flex flex-col"
                style={{ background: '#F8F9FC', border: '1px solid #DFE1E6', borderTopColor: STATUS_TOP_COLOR[status], borderTopWidth: 2 }}>
                {/* Column header */}
                <div className="px-3 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-[#44546F]">{STATUS_LABELS[status]}</span>
                  </div>
                  <span className="text-[10px] bg-white border border-[#DFE1E6] text-[#626F86] px-1.5 py-0.5 rounded font-bold">{items.length}</span>
                </div>

                {/* Cards */}
                <div className="p-2 space-y-2 flex-1 min-h-[80px]">
                  {items.map(bug => (
                    <div key={bug.id}
                      className="bg-white rounded-lg border border-[#DFE1E6] p-3 hover:border-[#B3BAC5] hover:shadow-sm transition-all group cursor-pointer">
                      {/* Type + key row */}
                      <div className="flex items-center justify-between mb-2">
                        <TypeBadge type={bug.issue_type ?? 'bug'} />
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditing(bug)}
                            className="p-1 text-[#7A869A] hover:text-[#0052CC] rounded hover:bg-[#DEEBFF]">
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={() => handleDelete(bug.id)}
                            className="p-1 text-[#7A869A] hover:text-[#DE350B] rounded hover:bg-[#FFEBE6]">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs font-semibold text-[#172B4D] leading-snug mb-2">{bug.title}</p>

                      <div className="flex items-center gap-1.5">
                        <PriorityBadge priority={bug.priority} />
                        {bug.assignee && (
                          <span className="w-5 h-5 rounded-full bg-[#0052CC] text-white text-[9px] font-bold flex items-center justify-center ml-auto flex-shrink-0"
                            title={bug.assignee.name}>
                            {bug.assignee.name[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Inline status change */}
                      <select value={bug.status}
                        onChange={e => handleStatusChange(bug, e.target.value as Status)}
                        className="mt-2 w-full text-[10px] border border-[#DFE1E6] rounded px-1.5 py-1 bg-white text-[#44546F] focus:outline-none focus:border-[#4C9AFF] cursor-pointer">
                        {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                      </select>
                    </div>
                  ))}

                  {items.length === 0 && (
                    <div className="py-8 text-center">
                      <p className="text-xs text-[#B3BAC5]">No issues</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="bg-white rounded-xl border border-[#DFE1E6] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#DFE1E6] bg-[#F8F9FC]">
                <th className="text-left px-4 py-2.5 text-xs font-bold text-[#626F86] uppercase tracking-wide">Summary</th>
                <th className="text-left px-4 py-2.5 text-xs font-bold text-[#626F86] uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-2.5 text-xs font-bold text-[#626F86] uppercase tracking-wide">Priority</th>
                <th className="text-left px-4 py-2.5 text-xs font-bold text-[#626F86] uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-bold text-[#626F86] uppercase tracking-wide">Assignee</th>
                <th className="text-left px-4 py-2.5 text-xs font-bold text-[#626F86] uppercase tracking-wide">Created</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-[#7A869A] text-sm">No issues found.</td></tr>
              )}
              {filtered.map(bug => (
                <tr key={bug.id} className="border-b border-[#F4F5F7] hover:bg-[#F8F9FC] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{ISSUE_TYPE_ICON[bug.issue_type ?? 'bug']}</span>
                      <div>
                        <span className="text-[10px] font-mono text-[#B3BAC5] mr-1">{project?.key}-</span>
                        <span className="font-semibold text-[#172B4D] text-sm">{bug.title}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><TypeBadge type={bug.issue_type ?? 'bug'} /></td>
                  <td className="px-4 py-3"><PriorityBadge priority={bug.priority} /></td>
                  <td className="px-4 py-3">
                    <select value={bug.status}
                      onChange={e => handleStatusChange(bug, e.target.value as Status)}
                      className="text-xs border border-[#DFE1E6] rounded px-2 py-1 bg-white text-[#44546F] focus:outline-none focus:border-[#4C9AFF]">
                      {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {bug.assignee ? (
                      <div className="flex items-center gap-1.5">
                        <span className="w-6 h-6 rounded-full bg-[#0052CC] text-white text-[10px] font-bold flex items-center justify-center">
                          {bug.assignee.name[0]?.toUpperCase()}
                        </span>
                        <span className="text-sm text-[#172B4D]">{bug.assignee.name}</span>
                      </div>
                    ) : <span className="text-[#B3BAC5] text-sm">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#7A869A] whitespace-nowrap">
                    {formatDistanceToNow(new Date(bug.created_at), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => setEditing(bug)}
                        className="p-1.5 text-[#7A869A] hover:text-[#0052CC] hover:bg-[#DEEBFF] rounded transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(bug.id)}
                        className="p-1.5 text-[#7A869A] hover:text-[#DE350B] hover:bg-[#FFEBE6] rounded transition-colors">
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
        <Modal title="Create issue" onClose={() => setShowCreate(false)} size="lg">
          <IssueForm onSave={handleCreate} onClose={() => setShowCreate(false)} projectKey={project?.key} />
        </Modal>
      )}
      {editing && (
        <Modal title="Edit issue" onClose={() => setEditing(null)} size="lg">
          <IssueForm initial={editing} onSave={handleUpdate} onClose={() => setEditing(null)} projectKey={project?.key} />
        </Modal>
      )}
    </div>
  )
}
