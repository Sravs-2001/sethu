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

const SPRINT_STATUS_COLORS: Record<SprintStatus, string> = {
  planning: 'bg-gray-100 text-gray-600',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
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
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Sprint Name *</label>
        <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Sprint 1 · Q2 2025" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Goal</label>
        <input className="input" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} placeholder="What should this sprint achieve?" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
          <input className="input" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
          <input className="input" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
        <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as SprintStatus })}>
          <option value="planning">Planning</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create Sprint'}</button>
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
      </div>
    </form>
  )
}

export default function SprintBoard() {
  const { sprints, setSprints, addSprint, updateSprint, bugs, setBugs, features, setFeatures } = useStore()
  const [showCreate, setShowCreate] = useState(false)
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null)

  useEffect(() => {
    supabase.from('sprints').select('*').order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          setSprints(data)
          setActiveSprint(data.find((s: Sprint) => s.status === 'active') ?? data[0] ?? null)
        }
      })
    supabase.from('bugs').select('*, assignee:profiles(*)').order('created_at', { ascending: false })
      .then(({ data }) => data && setBugs(data as any))
    supabase.from('features').select('*, assignee:profiles(*)').order('created_at', { ascending: false })
      .then(({ data }) => data && setFeatures(data as any))
  }, [])

  async function handleCreateSprint(data: Partial<Sprint>) {
    const { data: sprint } = await supabase.from('sprints').insert(data).select().single()
    if (sprint) { addSprint(sprint); setActiveSprint(sprint) }
  }

  async function handleSprintStatusChange(sprint: Sprint, status: SprintStatus) {
    await supabase.from('sprints').update({ status }).eq('id', sprint.id)
    updateSprint(sprint.id, { status })
    setActiveSprint({ ...sprint, status })
  }

  const sprintBugs = activeSprint ? bugs.filter(b => b.sprint_id === activeSprint.id) : []
  const sprintFeatures = activeSprint ? features.filter(f => f.sprint_id === activeSprint.id) : []
  const allItems = [
    ...sprintBugs.map(b => ({ ...b, kind: 'bug' as const })),
    ...sprintFeatures.map(f => ({ ...f, kind: 'feature' as const })),
  ]

  const columns = [
    { status: 'todo' as const, label: 'To Do' },
    { status: 'in_progress' as const, label: 'In Progress' },
    { status: 'review' as const, label: 'Review' },
    { status: 'done' as const, label: 'Done' },
  ]

  const progress = allItems.length > 0
    ? Math.round((allItems.filter(i => i.status === 'done').length / allItems.length) * 100)
    : 0

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Rocket className="w-5 h-5 text-emerald-500" /> Sprint Board
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{sprints.length} sprints</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary ml-auto">
          <Plus className="w-4 h-4" /> New Sprint
        </button>
      </div>

      <div className="flex gap-6">
        <div className="w-48 flex-shrink-0 space-y-2">
          {sprints.map((sprint) => (
            <button key={sprint.id} onClick={() => setActiveSprint(sprint)}
              className={clsx('w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                activeSprint?.id === sprint.id ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50')}>
              <div className="truncate">{sprint.name}</div>
              <span className={clsx('inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                activeSprint?.id === sprint.id ? 'bg-white/20 text-white' : SPRINT_STATUS_COLORS[sprint.status])}>
                {sprint.status}
              </span>
            </button>
          ))}
          {sprints.length === 0 && <div className="text-sm text-gray-400 text-center py-4">No sprints yet</div>}
        </div>

        <div className="flex-1 min-w-0">
          {!activeSprint ? (
            <div className="card p-12 text-center">
              <Rocket className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Create your first sprint to get started</p>
              <button onClick={() => setShowCreate(true)} className="btn-primary mt-4 mx-auto"><Plus className="w-4 h-4" /> Create Sprint</button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-lg font-semibold text-gray-900">{activeSprint.name}</h2>
                      <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', SPRINT_STATUS_COLORS[activeSprint.status])}>
                        {activeSprint.status}
                      </span>
                    </div>
                    {activeSprint.goal && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Target className="w-4 h-4 text-gray-400" />{activeSprint.goal}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-400 mt-2">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(new Date(activeSprint.start_date), 'MMM d')} — {format(new Date(activeSprint.end_date), 'MMM d, yyyy')}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {(['planning', 'active', 'completed'] as SprintStatus[]).map((s) => (
                      <button key={s} onClick={() => handleSprintStatusChange(activeSprint, s)}
                        className={clsx('text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors',
                          activeSprint.status === s ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-600 border-gray-200 hover:bg-gray-50')}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                {allItems.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                      <span>Progress</span>
                      <span>{progress}% · {allItems.filter(i => i.status === 'done').length}/{allItems.length} done</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-4 gap-3">
                {columns.map(({ status, label }) => {
                  const items = allItems.filter(i => i.status === status)
                  return (
                    <div key={status} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="px-3 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-600">{label}</span>
                        <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">{items.length}</span>
                      </div>
                      <div className="p-2 space-y-2 min-h-[100px]">
                        {items.map((item) => (
                          <div key={item.id} className="bg-gray-50 hover:bg-gray-100 rounded-lg p-2.5 transition-colors">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              {item.kind === 'bug'
                                ? <Bug className="w-3 h-3 text-red-400 flex-shrink-0" />
                                : <Sparkles className="w-3 h-3 text-violet-400 flex-shrink-0" />}
                              <span className="text-[10px] text-gray-400">{item.kind}</span>
                            </div>
                            <p className="text-xs font-medium text-gray-800 leading-snug">{item.title}</p>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <PriorityBadge priority={item.priority} />
                              {item.assignee && (
                                <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center ml-auto">
                                  {item.assignee.name[0].toUpperCase()}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                        {items.length === 0 && <div className="py-4 text-center text-xs text-gray-300">Empty</div>}
                      </div>
                    </div>
                  )
                })}
              </div>

              {allItems.length === 0 && (
                <div className="card p-8 text-center text-sm text-gray-400">
                  No items in this sprint. Assign bugs or features to <strong>{activeSprint.name}</strong> from the Bugs or Features tabs.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <Modal title="Create Sprint" onClose={() => setShowCreate(false)}>
          <SprintForm onSave={handleCreateSprint} onClose={() => setShowCreate(false)} />
        </Modal>
      )}
    </div>
  )
}
