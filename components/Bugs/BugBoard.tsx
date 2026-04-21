'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { bugService, sprintService } from '@/lib/services'
import { useStore } from '@/store/useStore'
import {
  Plus, Trash2, List, LayoutGrid,
  User, X, ChevronUp, ChevronDown as ChevronDownIcon,
} from 'lucide-react'
import { PriorityBadge } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import {
  STATUSES, STATUS_CONFIG,
  PRIORITIES, PRIORITY_CONFIG,
  ISSUE_TYPES, ISSUE_TYPE_CONFIG,
  colors,
} from '@/lib/constants'
import type { Bug as BugType, Priority, Status, IssueType } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor,
  useSensor, useSensors, closestCorners, useDroppable,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Per-type form config
const TYPE_FORM_CONFIG: Record<IssueType, {
  summaryLabel:      string
  summaryPlaceholder:string
  descLabel:         string
  descPlaceholder:   string
  showSprint:        boolean
  showAssignee:      boolean
}> = {
  epic: {
    summaryLabel:       'Epic name',
    summaryPlaceholder: 'Name this epic…',
    descLabel:          'Goal / Vision',
    descPlaceholder:    'Describe the goal or outcome of this epic…',
    showSprint:         false,
    showAssignee:       true,
  },
  story: {
    summaryLabel:       'User story',
    summaryPlaceholder: 'As a user, I want to…',
    descLabel:          'Acceptance criteria',
    descPlaceholder:    'Given… When… Then…',
    showSprint:         true,
    showAssignee:       true,
  },
  task: {
    summaryLabel:       'Task summary',
    summaryPlaceholder: 'What needs to be done?',
    descLabel:          'Details',
    descPlaceholder:    'Add any additional context…',
    showSprint:         true,
    showAssignee:       true,
  },
  bug: {
    summaryLabel:       'Bug summary',
    summaryPlaceholder: 'What is broken?',
    descLabel:          'Steps to reproduce',
    descPlaceholder:    '1. Go to…\n2. Click…\nExpected: …\nActual: …',
    showSprint:         true,
    showAssignee:       true,
  },
  subtask: {
    summaryLabel:       'Subtask',
    summaryPlaceholder: 'What is this subtask?',
    descLabel:          'Details',
    descPlaceholder:    'Describe the subtask…',
    showSprint:         false,
    showAssignee:       true,
  },
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: IssueType }) {
  const { color, bg, icon, label } = ISSUE_TYPE_CONFIG[type]
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded"
      style={{ color, background: bg }}>
      <span>{icon}</span>{label}
    </span>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-semibold mb-1 uppercase tracking-wide"
      style={{ color: colors.textSubtle }}>
      {children}
    </label>
  )
}

function IssueKey({ value }: { value: string }) {
  return (
    <span className="text-[10px] font-mono font-semibold px-1 py-0.5 rounded"
      style={{ background: colors.blueLight, color: colors.blueDark }}>
      {value}
    </span>
  )
}

// ── Card content (shared between SortableCard and DragOverlay) ────────────────

function CardContent({ bug, issueKey, isSelected, isDragOverlay = false }: {
  bug: BugType
  issueKey: string
  isSelected?: boolean
  isDragOverlay?: boolean
}) {
  return (
    <div className="rounded-lg p-3 select-none"
      style={{
        background:  isSelected ? colors.blueLight : colors.white,
        border:      `1px solid ${isSelected ? colors.blue : colors.border}`,
        boxShadow:   isDragOverlay
          ? '0 8px 24px rgba(9,30,66,0.18), 0 2px 6px rgba(9,30,66,0.1)'
          : isSelected ? `0 0 0 2px ${colors.blue}33` : '0 1px 2px rgba(9,30,66,0.06)',
        transform:   isDragOverlay ? 'rotate(2deg)' : undefined,
        cursor:      isDragOverlay ? 'grabbing' : 'pointer',
      }}>

      <div className="flex items-center justify-between mb-2">
        <TypeBadge type={bug.issue_type ?? 'task'} />
        <span className="text-[10px] font-mono" style={{ color: colors.textPlaceholder }}>
          {issueKey}
        </span>
      </div>

      <p className="text-xs font-semibold leading-snug mb-2"
        style={{ color: isSelected ? colors.blue : colors.textPrimary }}>
        {bug.title}
      </p>

      <div className="flex items-center gap-1.5">
        <PriorityBadge priority={bug.priority} />
        {bug.assignee && (
          <span className="w-5 h-5 rounded-full text-white text-[9px] font-bold flex items-center justify-center ml-auto flex-shrink-0"
            style={{ background: colors.blue }}
            title={bug.assignee.name}>
            {bug.assignee.name[0]?.toUpperCase()}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Sortable card ─────────────────────────────────────────────────────────────

function SortableCard({ bug, isSelected, issueKey, onClick }: {
  bug:        BugType
  isSelected: boolean
  issueKey:   string
  onClick:    () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: bug.id })
  return (
    <div ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform:   CSS.Transform.toString(transform),
        transition,
        opacity:     isDragging ? 0 : 1,
        cursor:      'grab',
        touchAction: 'none',
      }}
      onClick={onClick}>
      <CardContent bug={bug} issueKey={issueKey} isSelected={isSelected} />
    </div>
  )
}

// ── Droppable column ──────────────────────────────────────────────────────────

function DroppableColumn({ status, isOver, children }: {
  status:   Status
  isOver:   boolean
  children: React.ReactNode
}) {
  const { setNodeRef } = useDroppable({ id: status })
  return (
    <div ref={setNodeRef} className="flex-1 overflow-y-auto p-2 space-y-2 transition-colors"
      style={{
        minHeight:  80,
        background: isOver ? `${STATUS_CONFIG[status].bg}44` : 'transparent',
      }}>
      {children}
    </div>
  )
}

// ── Type-aware issue form ─────────────────────────────────────────────────────

function IssueForm({ initial, forcedType, onSave, onClose }: {
  initial?:    Partial<BugType>
  forcedType?: IssueType
  onSave:      (data: Partial<BugType>) => Promise<void>
  onClose:     () => void
}) {
  const { profiles, sprints } = useStore()
  const [form, setForm] = useState({
    title:       initial?.title       ?? '',
    description: initial?.description ?? '',
    issue_type:  forcedType ?? initial?.issue_type ?? 'task' as IssueType,
    priority:    initial?.priority    ?? 'medium' as Priority,
    status:      initial?.status      ?? 'todo'   as Status,
    assignee_id: initial?.assignee_id ?? '',
    sprint_id:   initial?.sprint_id   ?? '',
  })
  const [saving, setSaving] = useState(false)

  const cfg = TYPE_FORM_CONFIG[form.issue_type]

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({
      ...form,
      assignee_id: form.assignee_id || undefined,
      sprint_id:   form.sprint_id   || undefined,
    })
    setSaving(false)
    onClose()
  }

  return (
    <form onSubmit={submit} className="space-y-4">

      {/* Type selector — only show when not forced */}
      {!forcedType && (
        <div>
          <FieldLabel>Issue type</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {ISSUE_TYPES.map(t => {
              const tc     = ISSUE_TYPE_CONFIG[t]
              const active = form.issue_type === t
              return (
                <button key={t} type="button"
                  onClick={() => setForm({ ...form, issue_type: t })}
                  className={clsx('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all')}
                  style={active
                    ? { color: tc.color, background: tc.bg, borderColor: tc.color }
                    : { borderColor: colors.border, color: colors.textMuted }}>
                  <span>{tc.icon}</span>{tc.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Type banner when forced */}
      {forcedType && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold"
          style={{ background: ISSUE_TYPE_CONFIG[forcedType].bg, color: ISSUE_TYPE_CONFIG[forcedType].color }}>
          <span>{ISSUE_TYPE_CONFIG[forcedType].icon}</span>
          Creating a {ISSUE_TYPE_CONFIG[forcedType].label}
        </div>
      )}

      <div>
        <FieldLabel>{cfg.summaryLabel} *</FieldLabel>
        <input className="input" value={form.title} required autoFocus
          placeholder={cfg.summaryPlaceholder}
          onChange={e => setForm({ ...form, title: e.target.value })} />
      </div>

      <div>
        <FieldLabel>{cfg.descLabel}</FieldLabel>
        <textarea className="input resize-none" style={{ minHeight: 88 }} value={form.description}
          placeholder={cfg.descPlaceholder}
          onChange={e => setForm({ ...form, description: e.target.value })} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Priority</FieldLabel>
          <select className="input" value={form.priority}
            onChange={e => setForm({ ...form, priority: e.target.value as Priority })}>
            {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>)}
          </select>
        </div>
        <div>
          <FieldLabel>Status</FieldLabel>
          <select className="input" value={form.status}
            onChange={e => setForm({ ...form, status: e.target.value as Status })}>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
          </select>
        </div>
      </div>

      {cfg.showAssignee && (
        <div className={clsx('grid gap-3', cfg.showSprint ? 'grid-cols-2' : 'grid-cols-1')}>
          <div>
            <FieldLabel>Assignee</FieldLabel>
            <select className="input" value={form.assignee_id}
              onChange={e => setForm({ ...form, assignee_id: e.target.value })}>
              <option value="">Unassigned</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {cfg.showSprint && (
            <div>
              <FieldLabel>Sprint</FieldLabel>
              <select className="input" value={form.sprint_id}
                onChange={e => setForm({ ...form, sprint_id: e.target.value })}>
                <option value="">No sprint</option>
                {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-2" style={{ borderTop: `1px solid ${colors.border}` }}>
        <button type="submit" className="btn-primary" disabled={saving || !form.title.trim()}>
          {saving ? 'Saving…' : initial?.id ? 'Update' : 'Create'}
        </button>
        <button type="button" onClick={onClose} className="btn-subtle">Cancel</button>
      </div>
    </form>
  )
}

// ── Detail slide panel ────────────────────────────────────────────────────────

type ActivityEntry = {
  id:         string
  action:     string
  from?:      string | null
  to?:        string | null
  created_at: string
  user?:      { id: string; name: string; avatar_url?: string }
}

const ACTION_LABELS: Record<string, string> = {
  status_changed:   'changed status',
  priority_changed: 'changed priority',
  assigned:         'changed assignee',
  created:          'created this bug',
  commented:        'commented',
}

const STATUS_LABELS: Record<string, string> = {
  todo:        'To Do',
  in_progress: 'In Progress',
  review:      'Review',
  done:        'Done',
}

function formatActivityValue(action: string, val?: string | null) {
  if (!val) return '—'
  if (action === 'status_changed')   return STATUS_LABELS[val] ?? val
  if (action === 'priority_changed') return val.charAt(0).toUpperCase() + val.slice(1)
  return val
}

function DetailPanel({ bug, issueKey, onClose, onSave, onDelete }: {
  bug:      BugType
  issueKey: string
  onClose:  () => void
  onSave:   (data: Partial<BugType>) => Promise<void>
  onDelete: (id: string) => void
}) {
  const { profiles, sprints } = useStore()
  const [form, setForm] = useState({
    title:       bug.title,
    description: bug.description ?? '',
    issue_type:  bug.issue_type,
    priority:    bug.priority,
    status:      bug.status,
    assignee_id: bug.assignee_id ?? '',
    sprint_id:   bug.sprint_id   ?? '',
  })
  const [saving,       setSaving]       = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [history,      setHistory]      = useState<ActivityEntry[]>([])
  const [historyOpen,  setHistoryOpen]  = useState(true)

  const cfg = TYPE_FORM_CONFIG[form.issue_type]

  const fetchHistory = useCallback(async () => {
    const { data } = await bugService.getActivity(bug.id)
    if (data) setHistory(data as any)
  }, [bug.id])

  useEffect(() => {
    setForm({
      title:       bug.title,
      description: bug.description ?? '',
      issue_type:  bug.issue_type,
      priority:    bug.priority,
      status:      bug.status,
      assignee_id: bug.assignee_id ?? '',
      sprint_id:   bug.sprint_id   ?? '',
    })
    fetchHistory()
  }, [bug.id])

  async function save(patch: Partial<typeof form>) {
    const next = { ...form, ...patch }
    setForm(next)
    setSaving(true)
    await onSave({
      ...next,
      assignee_id: next.assignee_id || undefined,
      sprint_id:   next.sprint_id   || undefined,
    })
    setSaving(false)
    setTimeout(fetchHistory, 600)
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden"
      style={{ borderLeft: `1px solid ${colors.border}` }}>

      <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: `1px solid ${colors.border}`, background: colors.surfaceLighter }}>
        <IssueKey value={issueKey} />
        <TypeBadge type={form.issue_type} />
        <div className="ml-auto flex items-center gap-1">
          {saving && <span className="text-[10px]" style={{ color: colors.textLight }}>Saving…</span>}
          <button onClick={() => onDelete(bug.id)}
            className="p-1.5 rounded transition-colors"
            style={{ color: colors.textFaint }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = colors.red; (e.currentTarget as HTMLElement).style.background = colors.redLight }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = colors.textFaint; (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose}
            className="p-1.5 rounded transition-colors"
            style={{ color: colors.textFaint }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = colors.surfaceLight}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

        <div>
          {editingTitle ? (
            <input className="input text-sm font-semibold" value={form.title} autoFocus
              onChange={e => setForm({ ...form, title: e.target.value })}
              onBlur={() => { setEditingTitle(false); save({ title: form.title }) }}
              onKeyDown={e => {
                if (e.key === 'Enter') { setEditingTitle(false); save({ title: form.title }) }
                if (e.key === 'Escape') setEditingTitle(false)
              }} />
          ) : (
            <h2 className="text-sm font-semibold leading-snug cursor-text hover:bg-[#F4F5F7] rounded px-1 py-0.5 -mx-1 transition-colors"
              style={{ color: colors.textPrimary }}
              onClick={() => setEditingTitle(true)}>
              {form.title}
            </h2>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-24 text-[11px] font-semibold flex-shrink-0" style={{ color: colors.textSubtle }}>TYPE</span>
            <select className="input py-1 text-xs" value={form.issue_type}
              onChange={e => save({ issue_type: e.target.value as IssueType })}>
              {ISSUE_TYPES.map(t => <option key={t} value={t}>{ISSUE_TYPE_CONFIG[t].icon} {ISSUE_TYPE_CONFIG[t].label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-24 text-[11px] font-semibold flex-shrink-0" style={{ color: colors.textSubtle }}>STATUS</span>
            <select className="input py-1 text-xs" value={form.status}
              onChange={e => save({ status: e.target.value as Status })}>
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-24 text-[11px] font-semibold flex-shrink-0" style={{ color: colors.textSubtle }}>PRIORITY</span>
            <select className="input py-1 text-xs" value={form.priority}
              onChange={e => save({ priority: e.target.value as Priority })}>
              {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-24 text-[11px] font-semibold flex-shrink-0" style={{ color: colors.textSubtle }}>ASSIGNEE</span>
            <select className="input py-1 text-xs" value={form.assignee_id}
              onChange={e => save({ assignee_id: e.target.value })}>
              <option value="">Unassigned</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {cfg.showSprint && (
            <div className="flex items-center gap-3">
              <span className="w-24 text-[11px] font-semibold flex-shrink-0" style={{ color: colors.textSubtle }}>SPRINT</span>
              <select className="input py-1 text-xs" value={form.sprint_id}
                onChange={e => save({ sprint_id: e.target.value })}>
                <option value="">No sprint</option>
                {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
        </div>

        <div>
          <FieldLabel>{cfg.descLabel}</FieldLabel>
          <textarea className="input text-xs resize-none" style={{ minHeight: 100 }}
            value={form.description} placeholder={cfg.descPlaceholder}
            onChange={e => setForm({ ...form, description: e.target.value })}
            onBlur={() => save({ description: form.description })} />
        </div>

        <div className="text-[11px]" style={{ color: colors.textLight }}>
          Created {formatDistanceToNow(new Date(bug.created_at), { addSuffix: true })}
        </div>

        {/* ── History ── */}
        <div style={{ borderTop: `1px solid ${colors.border}` }}>
          <button
            onClick={() => setHistoryOpen(o => !o)}
            className="flex items-center justify-between w-full pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: colors.textSubtle }}>
            History
            {historyOpen
              ? <ChevronDownIcon className="w-3.5 h-3.5" />
              : <ChevronUp className="w-3.5 h-3.5" style={{ transform: 'rotate(180deg)' }} />}
          </button>

          {historyOpen && (
            <div className="space-y-3 pt-1 pb-2">
              {/* Bug created entry */}
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 mt-0.5"
                  style={{ background: colors.green }}>
                  ✦
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px]" style={{ color: colors.textSecondary }}>
                    Bug reported
                  </p>
                  <p className="text-[10px]" style={{ color: colors.textFaint }}>
                    {formatDistanceToNow(new Date(bug.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {history.length === 0 && (
                <p className="text-[11px] pl-7" style={{ color: colors.textPlaceholder }}>No changes yet</p>
              )}

              {history.map(entry => {
                const userName = entry.user?.name ?? 'Someone'
                const initial  = userName[0]?.toUpperCase()
                const label    = ACTION_LABELS[entry.action] ?? entry.action
                const fromVal  = formatActivityValue(entry.action, entry.from)
                const toVal    = formatActivityValue(entry.action, entry.to)

                return (
                  <div key={entry.id} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 mt-0.5"
                      style={{ background: colors.blue }}>
                      {initial}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] leading-snug" style={{ color: colors.textSecondary }}>
                        <span className="font-semibold" style={{ color: colors.textPrimary }}>{userName}</span>
                        {' '}{label}
                        {entry.from && entry.to && (
                          <>
                            {' '}from{' '}
                            <span className="font-medium" style={{ color: colors.textMuted }}>{fromVal}</span>
                            {' '}→{' '}
                            <span className="font-semibold" style={{ color: colors.blue }}>{toVal}</span>
                          </>
                        )}
                        {!entry.from && entry.to && (
                          <>
                            {' '}to{' '}
                            <span className="font-semibold" style={{ color: colors.blue }}>{toVal}</span>
                          </>
                        )}
                      </p>
                      <p className="text-[10px]" style={{ color: colors.textFaint }}>
                        {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main board component ──────────────────────────────────────────────────────

type SortField = 'title' | 'priority' | 'status' | 'created_at'

export default function BugBoard() {
  const { bugs, setBugs, addBug, updateBug, deleteBug, user, project, profiles, sprints, setSprints } = useStore()

  const [showCreate,     setShowCreate]     = useState(false)
  const [defaultStatus,  setDefaultStatus]  = useState<Status>('todo')
  const [selectedId,     setSelectedId]     = useState<string | null>(null)
  const [view,           setView]           = useState<'board' | 'list'>('board')
  const [filterPriority, setFilterPriority] = useState<Priority | ''>('')
  const [filterMine,     setFilterMine]     = useState(false)
  const [sortField,      setSortField]      = useState<SortField>('created_at')
  const [sortAsc,        setSortAsc]        = useState(false)
  const [activeBugId,    setActiveBugId]    = useState<string | null>(null)
  const [overColumnId,   setOverColumnId]   = useState<Status | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  const selectedBug = selectedId ? bugs.find(b => b.id === selectedId) ?? null : null
  const activeBug   = activeBugId ? bugs.find(b => b.id === activeBugId) ?? null : null

  const keyMap = useMemo(() => {
    const sorted = [...bugs].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    return Object.fromEntries(sorted.map((b, i) => [b.id, i + 1]))
  }, [bugs])

  // ── Data loading ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!project) return
    const pid = project.id
    const refresh = () => bugService.getByProject(pid).then(({ data }) => data && setBugs(data as any))
    refresh()
    if (sprints.length === 0) {
      sprintService.getByProject(pid).then(({ data }) => data && setSprints(data as any))
    }
    return bugService.subscribe(pid, refresh)
  }, [project?.id])

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      if (document.querySelector('[data-modal]')) return
      if (e.key === 'c' && !e.ctrlKey && !e.metaKey) { setDefaultStatus('todo'); setShowCreate(true) }
      if (e.key === 'Escape') setSelectedId(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ── CRUD handlers ──────────────────────────────────────────────────────────

  async function handleCreate(data: Partial<BugType>) {
    if (!user || !project) return
    const { data: bug } = await bugService.create({
      ...data, issue_type: data.issue_type ?? 'task', created_by: user.id, project_id: project.id, tags: [],
    })
    if (bug) addBug(bug as any)
  }

  async function handleUpdate(data: Partial<BugType>) {
    const id  = selectedId
    const bug = selectedBug
    if (!id || !user || !bug) return

    const patch: Partial<BugType> = { ...data }

    // Auto-assign: whoever changes the status becomes the assignee
    if ('status' in data && data.status !== bug.status) {
      patch.assignee_id = user.id
      patch.assignee    = profiles.find(p => p.id === user.id) as any
    }
    if ('assignee_id' in data) {
      patch.assignee = data.assignee_id
        ? (profiles.find(p => p.id === data.assignee_id) as any)
        : undefined
    }

    await bugService.update(id, patch)
    updateBug(id, patch)

    // Log activity
    if ('status' in patch && patch.status !== bug.status) {
      bugService.logActivity(id, user.id, 'status_changed', bug.status, patch.status)
    }
    if ('assignee_id' in patch && patch.assignee_id !== bug.assignee_id) {
      bugService.logActivity(id, user.id, 'assigned', bug.assignee_id ?? null, patch.assignee_id ?? null)
    }
    if ('priority' in patch && patch.priority !== bug.priority) {
      bugService.logActivity(id, user.id, 'priority_changed', bug.priority, patch.priority)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this issue?')) return
    await bugService.delete(id)
    deleteBug(id)
    if (selectedId === id) setSelectedId(null)
  }

  async function handleStatusChange(bugId: string, status: Status) {
    const bug = bugs.find(b => b.id === bugId)
    if (!bug || !user) return

    // Whoever drags the card becomes the assignee
    const patch: Partial<BugType> = {
      status,
      assignee_id: user.id,
      assignee:    profiles.find(p => p.id === user.id) as any,
    }

    await bugService.update(bugId, patch)
    updateBug(bugId, patch)
    bugService.logActivity(bugId, user.id, 'status_changed', bug.status, status)
    if (bug.assignee_id !== user.id) {
      bugService.logActivity(bugId, user.id, 'assigned', bug.assignee_id ?? null, user.id)
    }
  }

  // ── Drag & drop ────────────────────────────────────────────────────────────

  function onDragStart({ active }: DragStartEvent) {
    setActiveBugId(active.id as string)
  }

  function onDragOver({ over }: DragOverEvent) {
    if (!over) { setOverColumnId(null); return }
    const overId = over.id as string
    if ((STATUSES as string[]).includes(overId)) {
      setOverColumnId(overId as Status)
    } else {
      const overBug = bugs.find(b => b.id === overId)
      setOverColumnId(overBug?.status ?? null)
    }
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveBugId(null)
    setOverColumnId(null)
    if (!over) return

    const bug = bugs.find(b => b.id === active.id)
    if (!bug) return

    const overId       = over.id as string
    const isColumn     = (STATUSES as string[]).includes(overId)
    const targetStatus = isColumn ? overId as Status : (bugs.find(b => b.id === overId)?.status ?? null)
    if (!targetStatus) return

    if (bug.status !== targetStatus) {
      handleStatusChange(bug.id, targetStatus)
      return
    }

    if (!isColumn) {
      const col = filtered
        .filter(b => b.status === bug.status)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      const oldIdx = col.findIndex(b => b.id === bug.id)
      const newIdx = col.findIndex(b => b.id === overId)
      if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
        const reordered = arrayMove(col, oldIdx, newIdx)
        reordered.forEach((b, i) => {
          const order = i * 10
          updateBug(b.id, { sort_order: order })
          bugService.update(b.id, { sort_order: order })
        })
      }
    }
  }

  // ── Filtering & sorting ────────────────────────────────────────────────────

  const PRIORITY_ORDER: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 }

  const filtered = useMemo(() => bugs.filter(b =>
    b.issue_type === 'bug' &&
    (!filterPriority || b.priority === filterPriority) &&
    (!filterMine     || b.assignee_id === user?.id)
  ), [bugs, filterPriority, filterMine, user?.id])

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    let cmp = 0
    if (sortField === 'priority') cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    else if (sortField === 'status') cmp = STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status)
    else if (sortField === 'title')  cmp = a.title.localeCompare(b.title)
    else cmp = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    return sortAsc ? cmp : -cmp
  }), [filtered, sortField, sortAsc])

  function toggleSort(field: SortField) {
    if (sortField === field) setSortAsc(a => !a)
    else { setSortField(field); setSortAsc(true) }
  }

  const bugCount = useMemo(() => bugs.filter(b => b.issue_type === 'bug').length, [bugs])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: colors.surfaceLighter }}>

      {/* ── Header bar ── */}
      <div className="flex items-center gap-2 px-5 py-3 bg-white flex-shrink-0 flex-wrap"
        style={{ borderBottom: `1px solid ${colors.border}` }}>

        <div className="mr-2">
          <div className="flex items-center gap-2">
            <span className="text-base">🐛</span>
            <h1 className="text-sm font-bold" style={{ color: colors.textPrimary }}>Bug Board</h1>
            <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
              style={{ background: colors.redLight, color: colors.red }}>
              {bugCount}
            </span>
          </div>
          <p className="text-[11px] mt-0.5" style={{ color: colors.textLight }}>
            {project?.key} · Press <kbd className="px-1 py-0.5 rounded text-[10px] font-mono"
              style={{ background: colors.surfaceLight, border: `1px solid ${colors.border}` }}>C</kbd> to report a bug
          </p>
        </div>

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <button onClick={() => setFilterMine(m => !m)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold border transition-colors"
            style={filterMine
              ? { background: colors.blueLight, color: colors.blue, borderColor: colors.blue }
              : { background: 'white', color: colors.textMuted, borderColor: colors.border }}>
            <User className="w-3 h-3" /> Mine
          </button>

          <select className="input w-32 py-1 text-xs" value={filterPriority}
            onChange={e => setFilterPriority(e.target.value as any)}>
            <option value="">All priorities</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>)}
          </select>

          <div className="flex rounded overflow-hidden" style={{ border: `1px solid ${colors.border}` }}>
            {(['board', 'list'] as const).map((v, i) => (
              <button key={v} onClick={() => setView(v)}
                className={clsx('flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors', i > 0 && 'border-l')}
                style={view === v
                  ? { background: colors.blue, color: colors.white, borderColor: colors.blue }
                  : { background: 'white', color: colors.textMuted, borderColor: colors.border }}>
                {v === 'board'
                  ? <><LayoutGrid className="w-3.5 h-3.5" /> Board</>
                  : <><List className="w-3.5 h-3.5" /> List</>}
              </button>
            ))}
          </div>

          <button onClick={() => { setDefaultStatus('todo'); setShowCreate(true) }} className="btn-primary">
            <Plus className="w-3.5 h-3.5" /> Create
          </button>
        </div>
      </div>

      {/* ── Main area ── */}
      <div className="flex flex-1 overflow-hidden">

        <div className="flex-1 overflow-auto p-4" style={{ overflowX: 'auto', minWidth: 0 }}>

          {/* ── Board view ── */}
          {view === 'board' && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragEnd={onDragEnd}>

              <div className="flex gap-4 h-full pb-2" style={{ minWidth: 'max-content' }}>
                {STATUSES.map(status => {
                  const cfg      = STATUS_CONFIG[status]
                  const items    = filtered
                    .filter(b => b.status === status)
                    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                  const isTarget = overColumnId === status && activeBugId !== null

                  return (
                    <div key={status}
                      className="flex flex-col rounded-xl overflow-hidden transition-all flex-shrink-0"
                      style={{
                        width:          280,
                        background:     isTarget ? cfg.bg : colors.surfaceLighter,
                        border:         `1.5px solid ${isTarget ? cfg.topColor : colors.border}`,
                        borderTopColor: cfg.topColor,
                        borderTopWidth: 3,
                        boxShadow:      isTarget ? `0 0 0 2px ${cfg.topColor}33` : '0 1px 3px rgba(9,30,66,0.06)',
                      }}>

                      <div className="px-3 py-3 flex items-center justify-between flex-shrink-0"
                        style={{ borderBottom: `1px solid ${isTarget ? cfg.topColor + '33' : colors.border}` }}>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: cfg.topColor }} />
                          <span className="text-xs font-bold uppercase tracking-wider"
                            style={{ color: cfg.topColor }}>{cfg.label}</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: isTarget ? cfg.topColor : colors.surfaceLight,
                            color:      isTarget ? '#fff' : cfg.dotColor,
                          }}>
                          {items.length}
                        </span>
                      </div>

                      <SortableContext items={items.map(b => b.id)} strategy={verticalListSortingStrategy}>
                        <DroppableColumn status={status} isOver={isTarget}>
                          {items.map(bug => {
                            const issueKey = `${project?.key ?? 'PROJ'}-${keyMap[bug.id]}`
                            return (
                              <SortableCard
                                key={bug.id}
                                bug={bug}
                                issueKey={issueKey}
                                isSelected={selectedId === bug.id}
                                onClick={() => setSelectedId(selectedId === bug.id ? null : bug.id)}
                              />
                            )
                          })}

                          {items.length === 0 && !isTarget && (
                            <div className="flex flex-col items-center justify-center py-10 gap-1">
                              <span className="text-xl opacity-30">🐛</span>
                              <p className="text-xs" style={{ color: colors.textPlaceholder }}>No bugs</p>
                            </div>
                          )}
                        </DroppableColumn>
                      </SortableContext>

                      <button
                        onClick={() => { setDefaultStatus(status); setShowCreate(true) }}
                        className="flex items-center gap-1.5 w-full px-3 py-2.5 text-xs font-semibold transition-colors flex-shrink-0"
                        style={{ borderTop: `1px solid ${colors.border}`, color: colors.textSubtle, background: 'transparent' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = cfg.bg; (e.currentTarget as HTMLElement).style.color = cfg.topColor }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = colors.textSubtle }}>
                        <Plus className="w-3.5 h-3.5" />
                        Report bug
                      </button>
                    </div>
                  )
                })}
              </div>

              <DragOverlay dropAnimation={{ duration: 150, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
                {activeBug && (
                  <CardContent
                    bug={activeBug}
                    issueKey={`${project?.key ?? 'PROJ'}-${keyMap[activeBug.id]}`}
                    isSelected={false}
                    isDragOverlay
                  />
                )}
              </DragOverlay>
            </DndContext>
          )}

          {/* ── List view ── */}
          {view === 'list' && (
            <div className="bg-white rounded-xl overflow-hidden" style={{ border: `1px solid ${colors.border}` }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: colors.surfaceLighter, borderBottom: `2px solid ${colors.border}` }}>
                    {[
                      { label: 'Key',      field: null },
                      { label: 'Summary',  field: 'title'      as SortField },
                      { label: 'Type',     field: null },
                      { label: 'Priority', field: 'priority'   as SortField },
                      { label: 'Status',   field: 'status'     as SortField },
                      { label: 'Assignee', field: null },
                      { label: 'Created',  field: 'created_at' as SortField },
                      { label: '',         field: null },
                    ].map(({ label, field }) => (
                      <th key={label}
                        className={clsx('px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide', field && 'cursor-pointer hover:text-current')}
                        style={{ color: colors.textSubtle }}
                        onClick={() => field && toggleSort(field)}>
                        {label}
                        {field && sortField === field && (
                          sortAsc
                            ? <ChevronUp className="w-3 h-3 inline ml-0.5" />
                            : <ChevronDownIcon className="w-3 h-3 inline ml-0.5" />
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-sm" style={{ color: colors.textFaint }}>
                        No bugs found.
                      </td>
                    </tr>
                  )}
                  {sorted.map(bug => {
                    const issueKey   = `${project?.key ?? 'PROJ'}-${keyMap[bug.id]}`
                    const isSelected = selectedId === bug.id
                    return (
                      <tr key={bug.id}
                        onClick={() => setSelectedId(isSelected ? null : bug.id)}
                        className="cursor-pointer transition-colors group"
                        style={{ borderBottom: `1px solid ${colors.surfaceLight}`, background: isSelected ? colors.blueLight : undefined }}
                        onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = colors.surfaceLighter }}
                        onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                        <td className="px-4 py-2.5"><IssueKey value={issueKey} /></td>
                        <td className="px-4 py-2.5 max-w-[240px]">
                          <span className="font-semibold text-sm truncate block" style={{ color: colors.textPrimary }}>{bug.title}</span>
                        </td>
                        <td className="px-4 py-2.5"><TypeBadge type={bug.issue_type ?? 'task'} /></td>
                        <td className="px-4 py-2.5"><PriorityBadge priority={bug.priority} /></td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: STATUS_CONFIG[bug.status].bg, color: STATUS_CONFIG[bug.status].color }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_CONFIG[bug.status].dotColor }} />
                            {STATUS_CONFIG[bug.status].label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {bug.assignee ? (
                            <div className="flex items-center gap-1.5">
                              <span className="w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                                style={{ background: colors.blue }}>
                                {bug.assignee.name[0]?.toUpperCase()}
                              </span>
                              <span className="text-xs" style={{ color: colors.textPrimary }}>{bug.assignee.name}</span>
                            </div>
                          ) : (
                            <span className="text-xs" style={{ color: colors.textPlaceholder }}>—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xs whitespace-nowrap" style={{ color: colors.textFaint }}>
                          {formatDistanceToNow(new Date(bug.created_at), { addSuffix: true })}
                        </td>
                        <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleDelete(bug.id)}
                              className="p-1.5 rounded transition-colors"
                              style={{ color: colors.textFaint }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = colors.red; (e.currentTarget as HTMLElement).style.background = colors.redLight }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = colors.textFaint; (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Detail side panel ── */}
        {selectedBug && (
          <div className="w-[320px] flex-shrink-0 flex flex-col overflow-hidden"
            style={{ borderLeft: `1px solid ${colors.border}` }}>
            <DetailPanel
              bug={selectedBug}
              issueKey={`${project?.key ?? 'PROJ'}-${keyMap[selectedBug.id]}`}
              onClose={() => setSelectedId(null)}
              onSave={handleUpdate}
              onDelete={handleDelete}
            />
          </div>
        )}
      </div>

      {/* ── Create modal ── */}
      {showCreate && (
        <Modal title="Report a bug" onClose={() => setShowCreate(false)} size="lg">
          <IssueForm
            initial={{ status: defaultStatus }}
            forcedType="bug"
            onSave={handleCreate}
            onClose={() => setShowCreate(false)}
          />
        </Modal>
      )}
    </div>
  )
}
