'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import { Plus, Rocket, Calendar, Target, Bug, Sparkles } from 'lucide-react'
import { PriorityBadge } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { STATUSES, STATUS_CONFIG, SPRINT_STATUS_CONFIG, colors } from '@/lib/constants'
import type { Sprint, SprintStatus } from '@/types'
import { format } from 'date-fns'
import clsx from 'clsx'

// ── Sub-components ────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold mb-1"
      style={{ color: colors.textSecondary }}>
      {children}
    </label>
  )
}

function SprintStatusBadge({ status }: { status: SprintStatus }) {
  const { bg, color, label } = SPRINT_STATUS_CONFIG[status]
  return (
    <span className="text-[11px] px-1.5 py-0.5 rounded-sm font-semibold uppercase tracking-wide"
      style={{ background: bg, color }}>
      {label}
    </span>
  )
}

// ── Sprint form ───────────────────────────────────────────────────────────────

function SprintForm({ onSave, onClose }: {
  onSave:  (data: Partial<Sprint>) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState({
    name:       '',
    goal:       '',
    start_date: new Date().toISOString().split('T')[0],
    end_date:   '',
    status:     'planning' as SprintStatus,
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
        <input className="input" value={form.name} required
          placeholder="Sprint 1 · Q2 2025"
          onChange={e => setForm({ ...form, name: e.target.value })} />
      </div>
      <div>
        <FieldLabel>Sprint goal</FieldLabel>
        <input className="input" value={form.goal}
          placeholder="What should this sprint achieve?"
          onChange={e => setForm({ ...form, goal: e.target.value })} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Start date *</FieldLabel>
          <input className="input" type="date" value={form.start_date} required
            onChange={e => setForm({ ...form, start_date: e.target.value })} />
        </div>
        <div>
          <FieldLabel>End date *</FieldLabel>
          <input className="input" type="date" value={form.end_date} required
            onChange={e => setForm({ ...form, end_date: e.target.value })} />
        </div>
      </div>

      <div>
        <FieldLabel>Status</FieldLabel>
        <select className="input" value={form.status}
          onChange={e => setForm({ ...form, status: e.target.value as SprintStatus })}>
          {(Object.keys(SPRINT_STATUS_CONFIG) as SprintStatus[]).map(s => (
            <option key={s} value={s}>{SPRINT_STATUS_CONFIG[s].label}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 pt-2" style={{ borderTop: `1px solid ${colors.border}` }}>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Creating…' : 'Create sprint'}
        </button>
        <button type="button" onClick={onClose} className="btn-subtle">Cancel</button>
      </div>
    </form>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SprintBoard() {
  const {
    sprints, setSprints, addSprint, updateSprint,
    bugs, setBugs, features, setFeatures, project,
  } = useStore()
  const [showCreate,   setShowCreate]   = useState(false)
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
    supabase.from('bugs').select('*, assignee:profiles(*)')
      .eq('project_id', pid).order('created_at', { ascending: false })
      .then(({ data }) => data && setBugs(data as any))
    supabase.from('features').select('*, assignee:profiles(*)')
      .eq('project_id', pid).order('created_at', { ascending: false })
      .then(({ data }) => data && setFeatures(data as any))
  }, [project?.id])

  async function handleCreateSprint(data: Partial<Sprint>) {
    if (!project) return
    const { data: sprint } = await supabase.from('sprints')
      .insert({ ...data, project_id: project.id }).select().single()
    if (sprint) { addSprint(sprint); setActiveSprint(sprint) }
  }

  async function handleSprintStatusChange(sprint: Sprint, status: SprintStatus) {
    await supabase.from('sprints').update({ status }).eq('id', sprint.id)
    updateSprint(sprint.id, { status })
    setActiveSprint({ ...sprint, status })
  }

  const sprintBugs     = activeSprint ? bugs.filter(b => b.sprint_id === activeSprint.id)     : []
  const sprintFeatures = activeSprint ? features.filter(f => f.sprint_id === activeSprint.id) : []
  const allItems       = [
    ...sprintBugs.map(b     => ({ ...b, kind: 'bug'     as const })),
    ...sprintFeatures.map(f => ({ ...f, kind: 'feature' as const })),
  ]

  const progress = allItems.length > 0
    ? Math.round((allItems.filter(i => i.status === 'done').length / allItems.length) * 100)
    : 0

  return (
    <div className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3" style={{ borderBottom: `1px solid ${colors.border}` }}>
        <div>
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4" style={{ color: colors.green }} />
            <h1 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>Sprint Board</h1>
          </div>
          <p className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
            {sprints.length} {sprints.length === 1 ? 'sprint' : 'sprints'}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary ml-auto">
          <Plus className="w-3.5 h-3.5" /> Create sprint
        </button>
      </div>

      <div className="flex gap-4">
        {/* Sprint list sidebar */}
        <div className="w-[200px] flex-shrink-0 space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-wide px-2 pb-1"
            style={{ color: colors.textSecondary }}>
            Sprints
          </div>
          {sprints.map(sprint => (
            <button key={sprint.id} onClick={() => setActiveSprint(sprint)}
              className={clsx(
                'w-full text-left px-3 py-2 rounded text-sm transition-colors',
                activeSprint?.id === sprint.id ? 'font-semibold' : 'font-medium'
              )}
              style={activeSprint?.id === sprint.id
                ? { background: colors.blueLight, color: colors.blue }
                : { color: colors.textPrimary }
              }
              onMouseEnter={e => { if (activeSprint?.id !== sprint.id) (e.currentTarget as HTMLElement).style.background = colors.surfaceLight }}
              onMouseLeave={e => { if (activeSprint?.id !== sprint.id) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
              <div className="truncate text-xs font-medium">{sprint.name}</div>
              <SprintStatusBadge status={sprint.status} />
            </button>
          ))}
          {sprints.length === 0 && (
            <div className="text-xs text-center py-4" style={{ color: colors.textPlaceholder }}>
              No sprints yet
            </div>
          )}
        </div>

        {/* Sprint detail */}
        <div className="flex-1 min-w-0 space-y-4">
          {!activeSprint ? (
            <div className="bg-white rounded p-12 text-center"
              style={{ border: `1px solid ${colors.border}`, boxShadow: '0 1px 2px rgba(9,30,66,0.08)' }}>
              <Rocket className="w-8 h-8 mx-auto mb-3" style={{ color: colors.textPlaceholder }} />
              <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
                Create your first sprint to get started
              </p>
              <button onClick={() => setShowCreate(true)} className="btn-primary mx-auto">
                <Plus className="w-3.5 h-3.5" /> Create sprint
              </button>
            </div>
          ) : (
            <>
              {/* Sprint info card */}
              <div className="bg-white rounded p-4"
                style={{ border: `1px solid ${colors.border}`, boxShadow: '0 1px 2px rgba(9,30,66,0.08)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-base font-semibold" style={{ color: colors.textPrimary }}>
                        {activeSprint.name}
                      </h2>
                      <SprintStatusBadge status={activeSprint.status} />
                    </div>
                    {activeSprint.goal && (
                      <div className="flex items-center gap-1.5 text-sm mb-2"
                        style={{ color: colors.textSecondary }}>
                        <Target className="w-3.5 h-3.5 flex-shrink-0" style={{ color: colors.textFaint }} />
                        {activeSprint.goal}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: colors.textFaint }}>
                      <Calendar className="w-3 h-3" />
                      {format(new Date(activeSprint.start_date), 'MMM d')} —{' '}
                      {format(new Date(activeSprint.end_date), 'MMM d, yyyy')}
                    </div>
                  </div>

                  <div className="flex gap-1.5 flex-wrap">
                    {(Object.keys(SPRINT_STATUS_CONFIG) as SprintStatus[]).map(s => (
                      <button key={s} onClick={() => handleSprintStatusChange(activeSprint, s)}
                        className="text-xs px-2.5 py-1 rounded font-medium border transition-colors"
                        style={activeSprint.status === s
                          ? { background: colors.blue, color: colors.white, borderColor: colors.blue }
                          : { color: colors.textMuted, borderColor: colors.border }
                        }
                        onMouseEnter={e => { if (activeSprint.status !== s) (e.currentTarget as HTMLElement).style.background = colors.surfaceLight }}
                        onMouseLeave={e => { if (activeSprint.status !== s) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                        {SPRINT_STATUS_CONFIG[s].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Progress bar */}
                {allItems.length > 0 && (
                  <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${colors.border}` }}>
                    <div className="flex items-center justify-between text-xs mb-1.5"
                      style={{ color: colors.textSecondary }}>
                      <span className="font-medium">Progress</span>
                      <span>
                        {progress}% · {allItems.filter(i => i.status === 'done').length}/{allItems.length} done
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: colors.border }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${progress}%`, background: colors.green }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Kanban columns */}
              <div className="grid grid-cols-4 gap-3">
                {STATUSES.map(status => {
                  const cfg   = STATUS_CONFIG[status]
                  const items = allItems.filter(i => i.status === status)
                  return (
                    <div key={status} className="rounded overflow-hidden"
                      style={{
                        border:          `1px solid ${colors.border}`,
                        borderTopWidth:  '2px',
                        borderTopColor:  cfg.topColor,
                        background:      colors.surfaceLight,
                      }}>
                      <div className="px-3 py-2 flex items-center justify-between"
                        style={{ background: colors.surfaceLight }}>
                        <span className="text-[11px] font-semibold uppercase tracking-wide"
                          style={{ color: colors.textMuted }}>
                          {cfg.label}
                        </span>
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-sm"
                          style={{ background: colors.border, color: colors.textMuted }}>
                          {items.length}
                        </span>
                      </div>

                      <div className="p-2 space-y-2 min-h-[80px]">
                        {items.map(item => (
                          <div key={item.id}
                            className="bg-white rounded p-2.5 cursor-pointer transition-colors"
                            style={{ border: `1px solid ${colors.border}`, boxShadow: '0 1px 2px rgba(9,30,66,0.06)' }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = colors.textPlaceholder)}
                            onMouseLeave={e => (e.currentTarget.style.borderColor = colors.border)}>
                            <div className="flex items-center gap-1 mb-1.5">
                              {item.kind === 'bug'
                                ? <Bug      className="w-3 h-3 flex-shrink-0" style={{ color: colors.red    }} />
                                : <Sparkles className="w-3 h-3 flex-shrink-0" style={{ color: colors.purple }} />
                              }
                              <span className="text-[10px] capitalize" style={{ color: colors.textFaint }}>
                                {item.kind}
                              </span>
                            </div>
                            <p className="text-xs font-medium leading-snug" style={{ color: colors.textPrimary }}>
                              {item.title}
                            </p>
                            <div className="flex items-center gap-1 mt-1.5">
                              <PriorityBadge priority={item.priority} />
                              {item.assignee && (
                                <span className="w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center ml-auto flex-shrink-0"
                                  style={{ background: colors.blue }}>
                                  {item.assignee.name[0].toUpperCase()}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                        {items.length === 0 && (
                          <div className="py-4 text-center text-xs" style={{ color: colors.textPlaceholder }}>
                            No issues
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {allItems.length === 0 && (
                <div className="bg-white rounded p-8 text-center text-sm"
                  style={{
                    border: `1px solid ${colors.border}`,
                    boxShadow: '0 1px 2px rgba(9,30,66,0.08)',
                    color: colors.textSecondary,
                  }}>
                  No issues in this sprint. Assign bugs or features to{' '}
                  <strong>{activeSprint.name}</strong> from the Bugs or Features tabs.
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
