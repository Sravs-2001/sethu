'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import { Plus, Rocket, Calendar, Target, Bug, Sparkles } from 'lucide-react'
import { PriorityBadge } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import type { Sprint, SprintStatus } from '@/types'
import { format } from 'date-fns'
import clsx from 'clsx'

const SPRINT_STATUS_STYLE: Record<SprintStatus, string> = {
  planning:  'bg-[#DFE1E6] text-[#42526E]',
  active:    'bg-[#E3FCEF] text-[#006644]',
  completed: 'bg-[#DEEBFF] text-[#0747A6]',
}

const COLUMN_TOP_COLOR: Record<string, string> = {
  todo:        '#DFE1E6',
  in_progress: '#0052CC',
  review:      '#6554C0',
  done:        '#36B37E',
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-[#5E6C84] mb-1">{children}</label>
}

function SprintForm({ onSave, onClose }: { onSave: (data: Partial<Sprint>) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState({
    name: '', goal: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '', status: 'planning' as SprintStatus,
  })
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave(form)
    setSaving(false)
    onClose()
  }

  return (
    <form onSubmit={submit} className="space-y-3.5">
      <div>
        <FieldLabel>Sprint name *</FieldLabel>
        <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Sprint 1 · Q2 2025" />
      </div>
      <div>
        <FieldLabel>Sprint goal</FieldLabel>
        <input className="input" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} placeholder="What should this sprint achieve?" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Start date *</FieldLabel>
          <input className="input" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
        </div>
        <div>
          <FieldLabel>End date *</FieldLabel>
          <input className="input" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required />
        </div>
      </div>
      <div>
        <FieldLabel>Status</FieldLabel>
        <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as SprintStatus })}>
          <option value="planning">Planning</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      <div className="flex gap-2 pt-2 border-t border-[#DFE1E6]">
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create sprint'}</button>
        <button type="button" onClick={onClose} className="btn-subtle">Cancel</button>
      </div>
    </form>
  )
}

export default function SprintBoard() {
  const { sprints, setSprints, addSprint, updateSprint, bugs, setBugs, features, setFeatures, project } = useStore()
  const [showCreate, setShowCreate]   = useState(false)
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null)

  useEffect(() => {
    if (!project) return
    const pid = project.id
    supabase.from('sprints').select('*').eq('project_id', pid).order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          setSprints(data)
          setActiveSprint(data.find((s: Sprint) => s.status === 'active') ?? data[0] ?? null)
        }
      })
    supabase.from('bugs').select('*, assignee:profiles(*)').eq('project_id', pid).order('created_at', { ascending: false })
      .then(({ data }) => data && setBugs(data as any))
    supabase.from('features').select('*, assignee:profiles(*)').eq('project_id', pid).order('created_at', { ascending: false })
      .then(({ data }) => data && setFeatures(data as any))
  }, [project?.id])

  async function handleCreateSprint(data: Partial<Sprint>) {
    if (!project) return
    const { data: sprint } = await supabase.from('sprints').insert({ ...data, project_id: project.id }).select().single()
    if (sprint) { addSprint(sprint); setActiveSprint(sprint) }
  }

  async function handleSprintStatusChange(sprint: Sprint, status: SprintStatus) {
    await supabase.from('sprints').update({ status }).eq('id', sprint.id)
    updateSprint(sprint.id, { status })
    setActiveSprint({ ...sprint, status })
  }

  const sprintBugs     = activeSprint ? bugs.filter(b => b.sprint_id === activeSprint.id) : []
  const sprintFeatures = activeSprint ? features.filter(f => f.sprint_id === activeSprint.id) : []
  const allItems = [
    ...sprintBugs.map(b => ({ ...b, kind: 'bug' as const })),
    ...sprintFeatures.map(f => ({ ...f, kind: 'feature' as const })),
  ]

  const columns = [
    { status: 'todo'        as const, label: 'To Do' },
    { status: 'in_progress' as const, label: 'In Progress' },
    { status: 'review'      as const, label: 'Review' },
    { status: 'done'        as const, label: 'Done' },
  ]

  const progress = allItems.length > 0
    ? Math.round((allItems.filter(i => i.status === 'done').length / allItems.length) * 100)
    : 0

  return (
    <div className="p-5 space-y-4">
      {/* Page header */}
      <div className="flex items-center gap-3 pb-3 border-b border-[#DFE1E6]">
        <div>
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-[#36B37E]" />
            <h1 className="text-lg font-semibold text-[#172B4D]">Sprint Board</h1>
          </div>
          <p className="text-xs text-[#5E6C84] mt-0.5">{sprints.length} {sprints.length === 1 ? 'sprint' : 'sprints'}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary ml-auto">
          <Plus className="w-3.5 h-3.5" /> Create sprint
        </button>
      </div>

      <div className="flex gap-4">
        {/* Sprint list sidebar */}
        <div className="w-[200px] flex-shrink-0 space-y-1">
          <div className="text-[11px] font-semibold text-[#5E6C84] uppercase tracking-wide px-2 pb-1">Sprints</div>
          {sprints.map((sprint) => (
            <button
              key={sprint.id}
              onClick={() => setActiveSprint(sprint)}
              className={clsx(
                'w-full text-left px-3 py-2 rounded text-sm transition-colors',
                activeSprint?.id === sprint.id
                  ? 'bg-[#DEEBFF] text-[#0052CC] font-semibold'
                  : 'text-[#172B4D] hover:bg-[#F4F5F7]'
              )}
            >
              <div className="truncate text-xs font-medium">{sprint.name}</div>
              <span className={clsx('inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-sm font-semibold uppercase tracking-wide',
                SPRINT_STATUS_STYLE[sprint.status])}>
                {sprint.status}
              </span>
            </button>
          ))}
          {sprints.length === 0 && (
            <div className="text-xs text-[#B3BAC5] text-center py-4">No sprints yet</div>
          )}
        </div>

        {/* Sprint detail */}
        <div className="flex-1 min-w-0 space-y-4">
          {!activeSprint ? (
            <div className="bg-white rounded border border-[#DFE1E6] p-12 text-center" style={{ boxShadow: '0 1px 2px rgba(9,30,66,0.08)' }}>
              <Rocket className="w-8 h-8 text-[#B3BAC5] mx-auto mb-3" />
              <p className="text-sm text-[#5E6C84] mb-4">Create your first sprint to get started</p>
              <button onClick={() => setShowCreate(true)} className="btn-primary mx-auto">
                <Plus className="w-3.5 h-3.5" /> Create sprint
              </button>
            </div>
          ) : (
            <>
              {/* Sprint info card */}
              <div className="bg-white rounded border border-[#DFE1E6] p-4" style={{ boxShadow: '0 1px 2px rgba(9,30,66,0.08)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-base font-semibold text-[#172B4D]">{activeSprint.name}</h2>
                      <span className={clsx('text-[11px] px-1.5 py-0.5 rounded-sm font-semibold uppercase tracking-wide', SPRINT_STATUS_STYLE[activeSprint.status])}>
                        {activeSprint.status}
                      </span>
                    </div>
                    {activeSprint.goal && (
                      <div className="flex items-center gap-1.5 text-sm text-[#5E6C84] mb-2">
                        <Target className="w-3.5 h-3.5 text-[#7A869A] flex-shrink-0" />
                        {activeSprint.goal}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-[#7A869A]">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(activeSprint.start_date), 'MMM d')} — {format(new Date(activeSprint.end_date), 'MMM d, yyyy')}
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {(['planning', 'active', 'completed'] as SprintStatus[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSprintStatusChange(activeSprint, s)}
                        className={clsx(
                          'text-xs px-2.5 py-1 rounded font-medium border transition-colors',
                          activeSprint.status === s
                            ? 'bg-[#0052CC] text-white border-[#0052CC]'
                            : 'text-[#42526E] border-[#DFE1E6] hover:bg-[#F4F5F7]'
                        )}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                {allItems.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-[#DFE1E6]">
                    <div className="flex items-center justify-between text-xs text-[#5E6C84] mb-1.5">
                      <span className="font-medium">Progress</span>
                      <span>{progress}% · {allItems.filter(i => i.status === 'done').length}/{allItems.length} done</span>
                    </div>
                    <div className="h-1.5 bg-[#DFE1E6] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#36B37E] rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Kanban columns */}
              <div className="grid grid-cols-4 gap-3">
                {columns.map(({ status, label }) => {
                  const items = allItems.filter(i => i.status === status)
                  return (
                    <div
                      key={status}
                      className="rounded overflow-hidden"
                      style={{
                        border: '1px solid #DFE1E6',
                        borderTopWidth: '2px',
                        borderTopColor: COLUMN_TOP_COLOR[status],
                        background: '#F4F5F7',
                      }}
                    >
                      <div className="px-3 py-2 bg-[#F4F5F7] flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#42526E] uppercase tracking-wide">{label}</span>
                        <span className="text-[11px] bg-[#DFE1E6] text-[#42526E] px-1.5 py-0.5 rounded-sm font-semibold">{items.length}</span>
                      </div>
                      <div className="p-2 space-y-2 min-h-[80px]">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="bg-white rounded border border-[#DFE1E6] p-2.5 hover:border-[#B3BAC5] transition-colors cursor-pointer"
                            style={{ boxShadow: '0 1px 2px rgba(9,30,66,0.06)' }}
                          >
                            <div className="flex items-center gap-1 mb-1.5">
                              {item.kind === 'bug'
                                ? <Bug className="w-3 h-3 text-[#DE350B] flex-shrink-0" />
                                : <Sparkles className="w-3 h-3 text-[#6554C0] flex-shrink-0" />
                              }
                              <span className="text-[10px] text-[#7A869A] capitalize">{item.kind}</span>
                            </div>
                            <p className="text-xs font-medium text-[#172B4D] leading-snug">{item.title}</p>
                            <div className="flex items-center gap-1 mt-1.5">
                              <PriorityBadge priority={item.priority} />
                              {item.assignee && (
                                <span className="w-4 h-4 rounded-full bg-[#0052CC] text-white text-[9px] font-bold flex items-center justify-center ml-auto flex-shrink-0">
                                  {item.assignee.name[0].toUpperCase()}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                        {items.length === 0 && (
                          <div className="py-4 text-center text-xs text-[#B3BAC5]">No issues</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {allItems.length === 0 && (
                <div className="bg-white rounded border border-[#DFE1E6] p-8 text-center text-sm text-[#5E6C84]" style={{ boxShadow: '0 1px 2px rgba(9,30,66,0.08)' }}>
                  No issues in this sprint. Assign bugs or features to <strong>{activeSprint.name}</strong> from the Bugs or Features tabs.
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showCreate && (
        <Modal title="Create sprint" onClose={() => setShowCreate(false)}>
          <SprintForm onSave={handleCreateSprint} onClose={() => setShowCreate(false)} />
        </Modal>
      )}
    </div>
  )
}
