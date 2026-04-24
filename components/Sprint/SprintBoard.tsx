'use client'

import { useEffect, useMemo, useState } from 'react'
import { bugService, featureService, sprintService } from '@/lib/services'
import { useStore } from '@/store/useStore'
import { Plus, Rocket, Calendar, Target, Bug, Sparkles, Lock, Database, Trash2, X, ChevronDown } from 'lucide-react'
import { PriorityBadge } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { STATUSES, STATUS_CONFIG, SPRINT_STATUS_CONFIG, PRIORITIES, PRIORITY_CONFIG, colors } from '@/lib/constants'
import type { Sprint, SprintStatus, Bug as BugType, Feature, Priority, Status } from '@/types'
import { format, formatDistanceToNow } from 'date-fns'
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

// ── Sprint item quick-edit panel ─────────────────────────────────────────────

type SprintItem = (BugType & { kind: 'bug' }) | (Feature & { kind: 'feature' })

function SprintItemPanel({ item, issueKey, onClose, onSave, onDelete }: {
  item:     SprintItem
  issueKey: string
  onClose:  () => void
  onSave:   (patch: { title?: string; description?: string; priority?: Priority; status?: Status; assignee_id?: string | undefined }) => Promise<void>
  onDelete: () => void
}) {
  const { profiles } = useStore()
  const [title,  setTitle]  = useState(item.title)
  const [desc,   setDesc]   = useState(item.description ?? '')
  const [status, setStatus] = useState<Status>(item.status)
  const [prio,   setPrio]   = useState<Priority>(item.priority)
  const [asgn,   setAsgn]   = useState(item.assignee_id ?? '')
  const [saving, setSaving] = useState(false)

  async function save(patch: Parameters<typeof onSave>[0]) {
    setSaving(true)
    await onSave(patch)
    setSaving(false)
  }

  const typeCfg = item.kind === 'bug' ? { icon: '🐛', label: 'Bug' } : { icon: '✨', label: 'Feature' }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-card)' }}>

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-raised)' }}>
        <span className="text-sm">{typeCfg.icon}</span>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
          style={{ background: 'var(--blue-bg)', color: 'var(--blue)' }}>
          {issueKey}
        </span>
        <span className="text-xs font-semibold flex-1" style={{ color: 'var(--t3)' }}>{typeCfg.label}</span>
        {saving && <span className="text-[10px]" style={{ color: 'var(--t4)' }}>Saving…</span>}
        <button
          onClick={onDelete}
          className="p-1.5 rounded transition-colors"
          style={{ color: 'var(--t4)' }}
          title="Delete"
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--red)'; (e.currentTarget as HTMLElement).style.background = 'var(--red-bg)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onClose}
          className="p-1.5 rounded transition-colors"
          style={{ color: 'var(--t4)' }}
          title="Close"
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-sunken)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Title */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider mb-1"
            style={{ color: 'var(--t4)' }}>Title</label>
          <textarea
            value={title}
            rows={2}
            className="w-full text-sm font-semibold resize-none rounded p-2 outline-none transition-all"
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--t1)' }}
            onChange={e => setTitle(e.target.value)}
            onBlur={() => { if (title.trim() && title !== item.title) save({ title: title.trim() }) }}
          />
        </div>

        {/* Fields */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold w-20 flex-shrink-0" style={{ color: 'var(--t4)' }}>Status</span>
            <div className="relative">
              <select
                value={status}
                onChange={e => { const s = e.target.value as Status; setStatus(s); save({ status: s }) }}
                className="appearance-none text-xs pl-2 pr-6 py-1 rounded border outline-none cursor-pointer"
                style={{ background: 'var(--bg-raised)', borderColor: 'var(--border)', color: 'var(--t1)' }}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--t4)' }} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold w-20 flex-shrink-0" style={{ color: 'var(--t4)' }}>Priority</span>
            <div className="relative">
              <select
                value={prio}
                onChange={e => { const p = e.target.value as Priority; setPrio(p); save({ priority: p }) }}
                className="appearance-none text-xs pl-2 pr-6 py-1 rounded border outline-none cursor-pointer"
                style={{ background: 'var(--bg-raised)', borderColor: 'var(--border)', color: 'var(--t1)' }}>
                {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>)}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--t4)' }} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold w-20 flex-shrink-0" style={{ color: 'var(--t4)' }}>Assignee</span>
            <div className="relative">
              <select
                value={asgn}
                onChange={e => { const id = e.target.value; setAsgn(id); save({ assignee_id: id || undefined }) }}
                className="appearance-none text-xs pl-2 pr-6 py-1 rounded border outline-none cursor-pointer"
                style={{ background: 'var(--bg-raised)', borderColor: 'var(--border)', color: 'var(--t1)' }}>
                <option value="">Unassigned</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--t4)' }} />
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider mb-1"
            style={{ color: 'var(--t4)' }}>Description</label>
          <textarea
            value={desc}
            rows={5}
            className="w-full text-xs resize-none rounded p-2 outline-none transition-all"
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--t2)' }}
            placeholder="Add description…"
            onChange={e => setDesc(e.target.value)}
            onBlur={() => { if (desc !== item.description) save({ description: desc }) }}
          />
        </div>

        {/* Meta */}
        <div className="text-[11px]" style={{ color: 'var(--t5)' }}>
          Created {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
        </div>
      </div>
    </div>
  )
}

// ── Sample bug titles for seed data ──────────────────────────────────────────

const SEED_BUGS = [
  { title: 'Login page throws 500 on invalid credentials',      issue_type: 'bug'   as const, priority: 'critical' as const, status: 'todo'        as const },
  { title: 'Implement JWT refresh token rotation',              issue_type: 'task'  as const, priority: 'high'     as const, status: 'in_progress'  as const },
  { title: 'Dashboard loads slowly on low-end devices',         issue_type: 'bug'   as const, priority: 'medium'   as const, status: 'todo'         as const },
  { title: 'Add dark mode support to settings page',            issue_type: 'story' as const, priority: 'low'      as const, status: 'todo'         as const },
  { title: 'Write unit tests for auth middleware',              issue_type: 'task'  as const, priority: 'medium'   as const, status: 'review'       as const },
  { title: 'Fix SQL injection vulnerability in search query',   issue_type: 'bug'   as const, priority: 'critical' as const, status: 'done'         as const },
  { title: 'Upgrade React from 18 to 19',                      issue_type: 'task'  as const, priority: 'high'     as const, status: 'todo'         as const },
]

// ── Main component ────────────────────────────────────────────────────────────

export default function SprintBoard() {
  const {
    sprints, setSprints, addSprint, updateSprint,
    bugs, setBugs, addBug, updateBug, deleteBug,
    features, setFeatures, updateFeature, deleteFeature,
    project, user, projectMembers, addToast, startLoading, stopLoading,
  } = useStore()
  const [showCreate,    setShowCreate]    = useState(false)
  const [activeSprint,  setActiveSprint]  = useState<Sprint | null>(null)
  const [seeding,       setSeeding]       = useState(false)
  const [selectedItem,  setSelectedItem]  = useState<SprintItem | null>(null)

  const bugKeyMap = useMemo(() => {
    const sorted = [...bugs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    return Object.fromEntries(sorted.map((b, i) => [b.id, i + 1]))
  }, [bugs])

  const featKeyMap = useMemo(() => {
    const sorted = [...features].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    return Object.fromEntries(sorted.map((f, i) => [f.id, i + 1]))
  }, [features])

  function getIssueKey(item: SprintItem) {
    const key = project?.key ?? 'PROJ'
    if (item.kind === 'bug') return `${key}-${bugKeyMap[item.id] ?? '?'}`
    return `${key}-F${featKeyMap[item.id] ?? '?'}`
  }

  async function handleSaveItem(patch: { title?: string; description?: string; priority?: Priority; status?: Status; assignee_id?: string | undefined }) {
    if (!selectedItem) return
    if (selectedItem.kind === 'bug') {
      const { error } = await bugService.update(selectedItem.id, patch)
      if (error) { addToast('error', 'Failed to update issue.'); return }
      updateBug(selectedItem.id, patch as Partial<BugType>)
      setSelectedItem(prev => prev ? { ...prev, ...patch } as SprintItem : null)
    } else {
      const { error } = await featureService.update(selectedItem.id, patch)
      if (error) { addToast('error', 'Failed to update feature.'); return }
      updateFeature(selectedItem.id, patch as Partial<Feature>)
      setSelectedItem(prev => prev ? { ...prev, ...patch } as SprintItem : null)
    }
  }

  async function handleDeleteItem() {
    if (!selectedItem || !confirm('Delete this item? This cannot be undone.')) return
    if (selectedItem.kind === 'bug') {
      const { error } = await bugService.delete(selectedItem.id)
      if (error) { addToast('error', 'Failed to delete issue.'); return }
      deleteBug(selectedItem.id)
    } else {
      const { error } = await featureService.delete(selectedItem.id)
      if (error) { addToast('error', 'Failed to delete feature.'); return }
      deleteFeature(selectedItem.id)
    }
    setSelectedItem(null)
    addToast('success', 'Item deleted.')
  }

  const isProjectAdmin =
    user?.role === 'admin' ||
    projectMembers.some(m => m.user_id === user?.id && m.role === 'admin') ||
    project?.created_by === user?.id

  useEffect(() => {
    if (!project) return
    const pid = project.id

    sprintService.getByProject(pid).then(({ data }) => {
      if (data) {
        setSprints(data)
        setActiveSprint(data.find((s: Sprint) => s.status === 'active') ?? data[0] ?? null)
      }
    })
    bugService.getByProject(pid).then(({ data }) => data && setBugs(data as any))
    featureService.getByProject(pid).then(({ data }) => data && setFeatures(data as any))
  }, [project?.id])

  async function handleCreateSprint(data: Partial<Sprint>) {
    if (!project || !isProjectAdmin) return
    startLoading()
    const { data: sprint, error } = await sprintService.create({ ...data, project_id: project.id })
    stopLoading()
    if (error) { addToast('error', 'Failed to create sprint.'); return }
    if (sprint) { addSprint(sprint); setActiveSprint(sprint); addToast('success', `Sprint "${sprint.name}" created.`) }
  }

  async function handleSprintStatusChange(sprint: Sprint, status: SprintStatus) {
    if (!isProjectAdmin) return
    startLoading()
    const { error } = await sprintService.update(sprint.id, { status })
    stopLoading()
    if (error) { addToast('error', 'Failed to update sprint status.'); return }
    updateSprint(sprint.id, { status })
    setActiveSprint({ ...sprint, status })
    addToast('success', `Sprint marked as ${status.replace('_', ' ')}.`)
  }

  async function handleSeedSampleData() {
    if (!project || !user || !isProjectAdmin) return
    setSeeding(true)
    startLoading()
    const today     = new Date()
    const twoWeeks  = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)
    const { data: sprint, error } = await sprintService.create({
      project_id: project.id,
      name:       'Sprint 1 · Q2 2026',
      goal:       'Ship core auth flow, fix critical bugs, and set up test coverage',
      start_date: today.toISOString().split('T')[0],
      end_date:   twoWeeks.toISOString().split('T')[0],
      status:     'active',
    })
    if (error) { stopLoading(); setSeeding(false); addToast('error', 'Failed to seed sample data.'); return }
    if (sprint) {
      addSprint(sprint)
      setActiveSprint(sprint)
      for (const bug of SEED_BUGS) {
        const { data: created } = await bugService.create({
          ...bug,
          project_id: project.id,
          created_by: user.id,
          sprint_id:  sprint.id,
          tags:       [],
        })
        if (created) addBug(created as any)
      }
      addToast('success', 'Sample sprint and issues loaded.')
    }
    stopLoading()
    setSeeding(false)
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
        {isProjectAdmin && (
          <button onClick={() => setShowCreate(true)} className="btn-primary ml-auto">
            <Plus className="w-3.5 h-3.5" /> Create sprint
          </button>
        )}
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
              {isProjectAdmin ? (
                <>
                  <Rocket className="w-8 h-8 mx-auto mb-3" style={{ color: colors.textPlaceholder }} />
                  <p className="text-sm mb-4" style={{ color: colors.textSecondary }}>
                    Create your first sprint to get started
                  </p>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <button onClick={() => setShowCreate(true)} className="btn-primary">
                      <Plus className="w-3.5 h-3.5" /> Create sprint
                    </button>
                    <button onClick={handleSeedSampleData} disabled={seeding}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold border transition-colors disabled:opacity-50"
                      style={{ borderColor: colors.border, color: colors.textSecondary }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = colors.surfaceLight}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                      <Database className="w-3.5 h-3.5" />
                      {seeding ? 'Seeding…' : 'Load sample sprint & bugs'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Lock className="w-8 h-8 mx-auto mb-3" style={{ color: colors.textPlaceholder }} />
                  <p className="text-sm" style={{ color: colors.textSecondary }}>
                    No sprints yet. Ask your project admin to create one.
                  </p>
                </>
              )}
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

                  {isProjectAdmin && (
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
                  )}
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
                            style={{
                              border: `1px solid ${selectedItem?.id === item.id ? colors.blue : colors.border}`,
                              boxShadow: '0 1px 2px rgba(9,30,66,0.06)',
                              background: selectedItem?.id === item.id ? colors.blueLight : colors.white,
                            }}
                            onClick={() => setSelectedItem(item)}
                            onMouseEnter={e => { if (selectedItem?.id !== item.id) e.currentTarget.style.borderColor = colors.textPlaceholder }}
                            onMouseLeave={e => { if (selectedItem?.id !== item.id) e.currentTarget.style.borderColor = colors.border }}>
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

      {/* Sprint item detail slide-over */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(9,30,66,0.35)' }}
          onClick={e => e.target === e.currentTarget && setSelectedItem(null)}>
          <div
            className="absolute right-0 top-0 bottom-0 flex flex-col"
            style={{ width: 440, boxShadow: '-8px 0 32px rgba(9,30,66,0.18)' }}>
            <SprintItemPanel
              item={selectedItem}
              issueKey={getIssueKey(selectedItem)}
              onClose={() => setSelectedItem(null)}
              onSave={handleSaveItem}
              onDelete={handleDeleteItem}
            />
          </div>
        </div>
      )}
    </div>
  )
}
