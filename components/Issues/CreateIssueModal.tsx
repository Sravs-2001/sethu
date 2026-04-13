'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import { X, ChevronDown, Loader2 } from 'lucide-react'
import type { Priority, Status } from '@/types'
import type { IssueKind } from './IssueTypeIcon'
import IssueTypeIcon, { ISSUE_TYPE_CONFIG } from './IssueTypeIcon'
import clsx from 'clsx'

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: '#FF5630' },
  { value: 'high',     label: 'High',    color: '#FF7452' },
  { value: 'medium',   label: 'Medium',  color: '#FFA500' },
  { value: 'low',      label: 'Low',     color: '#2684FF' },
]

const ISSUE_TYPES: IssueKind[] = ['bug', 'story', 'task', 'epic']

function PriorityDot({ priority }: { priority: Priority }) {
  const p = PRIORITIES.find(x => x.value === priority)
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: p?.color ?? '#aaa' }} />
      {p?.label}
    </span>
  )
}

export default function CreateIssueModal({ onClose }: { onClose: () => void }) {
  const { user, project, profiles, sprints, addBug, addFeature } = useStore()

  const [issueType, setIssueType]  = useState<IssueKind>('bug')
  const [title, setTitle]           = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority]    = useState<Priority>('medium')
  const [status, setStatus]        = useState<Status>('todo')
  const [assigneeId, setAssigneeId] = useState('')
  const [sprintId, setSprintId]    = useState('')
  const [saving, setSaving]        = useState(false)
  const [error, setError]          = useState('')
  const [typeOpen, setTypeOpen]    = useState(false)
  const [priorityOpen, setPriorityOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !user || !project) return
    setSaving(true); setError('')

    const payload = {
      title: title.trim(),
      description: description.trim(),
      priority,
      status,
      assignee_id: assigneeId || undefined,
      sprint_id: sprintId || undefined,
      created_by: user.id,
      project_id: project.id,
    }

    // bugs → bugs table; story/task/epic → features table
    if (issueType === 'bug') {
      const { data, error: err } = await supabase
        .from('bugs').insert({ ...payload, tags: [] })
        .select('*, assignee:profiles(*)').single()
      if (err) { setError(err.message); setSaving(false); return }
      if (data) addBug(data as any)
    } else {
      const { data, error: err } = await supabase
        .from('features').insert(payload)
        .select('*, assignee:profiles(*)').single()
      if (err) { setError(err.message); setSaving(false); return }
      if (data) addFeature(data as any)
    }

    onClose()
  }

  const activeSprints = sprints.filter(s => s.status !== 'completed')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(9,30,66,0.54)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-lg overflow-hidden animate-slide-in"
        style={{ boxShadow: '0 20px 40px rgba(9,30,66,0.35)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DFE1E6]">
          <h2 className="text-base font-semibold text-[#172B4D]">Create issue</h2>
          <button onClick={onClose} className="p-1 rounded text-[#97A0AF] hover:bg-[#F4F5F7] hover:text-[#42526E] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-4">

            {/* Project + Issue type row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#5E6C84] mb-1.5">Project</label>
                <div className="flex items-center gap-2 px-3 py-2 border border-[#DFE1E6] rounded bg-[#F4F5F7] text-[13px] text-[#172B4D]">
                  <div className="w-4 h-4 rounded flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0"
                    style={{ background: project?.avatar_color ?? '#0052CC' }}>
                    {project?.key?.slice(0, 2) ?? 'P'}
                  </div>
                  <span className="font-medium">{project?.name ?? 'Project'}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5E6C84] mb-1.5">Issue Type</label>
                <div className="relative">
                  <button type="button" onClick={() => setTypeOpen(o => !o)}
                    className="flex items-center gap-2 w-full px-3 py-2 border border-[#DFE1E6] rounded bg-white text-[13px] text-[#172B4D] hover:bg-[#F4F5F7] transition-colors text-left">
                    <IssueTypeIcon kind={issueType} size={14} />
                    <span className="flex-1 font-medium capitalize">{issueType}</span>
                    <ChevronDown className={clsx('w-3.5 h-3.5 text-[#7A869A] transition-transform', typeOpen && 'rotate-180')} />
                  </button>
                  {typeOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded border border-[#DFE1E6] overflow-hidden z-10 shadow-lg">
                      {ISSUE_TYPES.map(t => (
                        <button key={t} type="button"
                          onClick={() => { setIssueType(t); setTypeOpen(false) }}
                          className={clsx(
                            'flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-left transition-colors',
                            issueType === t ? 'bg-[#DEEBFF] text-[#0052CC]' : 'hover:bg-[#F4F5F7] text-[#172B4D]',
                          )}>
                          <IssueTypeIcon kind={t} size={14} />
                          <span className="font-medium capitalize">{t}</span>
                          <span className="text-[#7A869A] ml-1 text-xs">{ISSUE_TYPE_CONFIG[t].label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-[#DFE1E6]" />

            {/* Summary */}
            <div>
              <label className="block text-xs font-semibold text-[#5E6C84] mb-1.5">
                Summary <span className="text-[#DE350B]">*</span>
              </label>
              <input
                className="input text-sm"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Brief description of the issue"
                required
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-[#5E6C84] mb-1.5">Description</label>
              <textarea
                className="input resize-none text-sm"
                style={{ minHeight: '100px' }}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Add a description..."
              />
            </div>

            {/* Assignee + Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#5E6C84] mb-1.5">Assignee</label>
                <select className="input text-[13px]" value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
                  <option value="">Unassigned</option>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5E6C84] mb-1.5">Priority</label>
                <div className="relative">
                  <button type="button" onClick={() => setPriorityOpen(o => !o)}
                    className="flex items-center gap-2 w-full px-3 py-2 border border-[#DFE1E6] rounded bg-white text-[13px] text-[#172B4D] hover:bg-[#F4F5F7] transition-colors text-left">
                    <span className="flex-1"><PriorityDot priority={priority} /></span>
                    <ChevronDown className={clsx('w-3.5 h-3.5 text-[#7A869A] transition-transform', priorityOpen && 'rotate-180')} />
                  </button>
                  {priorityOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded border border-[#DFE1E6] overflow-hidden z-10 shadow-lg">
                      {PRIORITIES.map(p => (
                        <button key={p.value} type="button"
                          onClick={() => { setPriority(p.value); setPriorityOpen(false) }}
                          className={clsx(
                            'flex items-center gap-2 w-full px-3 py-2 text-[13px] text-left transition-colors',
                            priority === p.value ? 'bg-[#DEEBFF]' : 'hover:bg-[#F4F5F7]',
                          )}>
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                          <span className="text-[#172B4D] font-medium">{p.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sprint + Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#5E6C84] mb-1.5">Sprint</label>
                <select className="input text-[13px]" value={sprintId} onChange={e => setSprintId(e.target.value)}>
                  <option value="">No sprint</option>
                  {activeSprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5E6C84] mb-1.5">Status</label>
                <select className="input text-[13px]" value={status} onChange={e => setStatus(e.target.value as Status)}>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">In Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </div>

            {error && (
              <p className="text-xs px-3 py-2 rounded text-[#DE350B] bg-[#FFEBE6]">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 px-6 py-4 bg-[#F4F5F7] border-t border-[#DFE1E6] flex items-center justify-between gap-3">
            <div className="text-xs text-[#5E6C84]">
              Fields marked <span className="text-[#DE350B]">*</span> are required
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn-secondary px-4">Cancel</button>
              <button
                type="submit"
                disabled={saving || !title.trim()}
                className="btn-primary px-5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating…</> : 'Create'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
