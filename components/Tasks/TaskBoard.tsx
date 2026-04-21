'use client'

import { useEffect, useMemo, useState } from 'react'
import { bugService, sprintService } from '@/lib/services'
import { useStore } from '@/store/useStore'
import { Plus, X, Trash2, ChevronDown, ChevronRight, CheckSquare, Square } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import {
  STATUSES, STATUS_CONFIG, PRIORITIES, PRIORITY_CONFIG,
  ISSUE_TYPE_CONFIG, colors,
} from '@/lib/constants'
import type { Bug as Issue, Priority, Status } from '@/types'
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

// ── Tag presets ───────────────────────────────────────────────────────────────

const TAG_PRESETS = [
  { label: 'R&D',          color: '#6554C0', bg: '#EAE6FF' },
  { label: 'Enhancement',  color: '#0052CC', bg: '#DEEBFF' },
  { label: 'Research',     color: '#00B8D9', bg: '#E6FCFF' },
  { label: 'Refactor',     color: '#FF8B00', bg: '#FFFAE6' },
  { label: 'Performance',  color: '#36B37E', bg: '#E3FCEF' },
  { label: 'Security',     color: '#DE350B', bg: '#FFEBE6' },
  { label: 'Infra',        color: '#5E6C84', bg: '#F4F5F7' },
  { label: 'Design',       color: '#FF5630', bg: '#FFEBE6' },
]

function tagStyle(label: string) {
  return TAG_PRESETS.find(t => t.label === label) ?? { color: colors.textSubtle, bg: colors.surfaceLight }
}

function TagChip({ label }: { label: string }) {
  const s = tagStyle(label)
  return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
      style={{ color: s.color, background: s.bg }}>
      {label}
    </span>
  )
}

// ── Card content ──────────────────────────────────────────────────────────────

function CardContent({ task, subtaskCount, isSelected, isDragOverlay = false }: {
  task:          Issue
  subtaskCount:  number
  isSelected?:   boolean
  isDragOverlay?: boolean
}) {
  const typeColor = task.issue_type === 'subtask' ? colors.textSubtle : colors.blue
  const typeBg    = task.issue_type === 'subtask' ? colors.surfaceLight : colors.blueLight
  const typeCfg   = ISSUE_TYPE_CONFIG[task.issue_type ?? 'task']

  return (
    <div className="rounded-lg p-3 select-none"
      style={{
        background: isSelected ? colors.blueLight : colors.white,
        border:     `1px solid ${isSelected ? colors.blue : colors.border}`,
        boxShadow:  isDragOverlay
          ? '0 8px 24px rgba(9,30,66,0.18)'
          : isSelected ? `0 0 0 2px ${colors.blue}33` : '0 1px 2px rgba(9,30,66,0.06)',
        transform:  isDragOverlay ? 'rotate(2deg)' : undefined,
        cursor:     isDragOverlay ? 'grabbing' : 'pointer',
      }}>

      {/* Type + tags row */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
          style={{ color: typeColor, background: typeBg }}>
          {typeCfg.icon} {typeCfg.label}
        </span>
        {(task.tags ?? []).map(tag => <TagChip key={tag} label={tag} />)}
      </div>

      {/* Title */}
      <p className="text-xs font-semibold leading-snug mb-2"
        style={{ color: isSelected ? colors.blue : colors.textPrimary }}>
        {task.title}
      </p>

      {/* Bottom row */}
      <div className="flex items-center gap-1.5">
        {/* Priority */}
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
          style={{ background: PRIORITY_CONFIG[task.priority].bg, color: PRIORITY_CONFIG[task.priority].color }}>
          {PRIORITY_CONFIG[task.priority].label}
        </span>

        {/* Subtask count */}
        {subtaskCount > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded ml-auto"
            style={{ background: colors.surfaceLight, color: colors.textSubtle }}>
            ↳ {subtaskCount}
          </span>
        )}

        {/* Assignee */}
        {task.assignee && (
          <span className="w-5 h-5 rounded-full text-white text-[9px] font-bold flex items-center justify-center ml-auto flex-shrink-0"
            style={{ background: colors.blue }}
            title={task.assignee.name}>
            {task.assignee.name[0]?.toUpperCase()}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Sortable card ─────────────────────────────────────────────────────────────

function SortableCard({ task, subtaskCount, isSelected, onClick }: {
  task:         Issue
  subtaskCount: number
  isSelected:   boolean
  onClick:      () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0 : 1, cursor: 'grab', touchAction: 'none' }}
      onClick={onClick}>
      <CardContent task={task} subtaskCount={subtaskCount} isSelected={isSelected} />
    </div>
  )
}

// ── Droppable column ──────────────────────────────────────────────────────────

function DroppableColumn({ status, isOver, children }: { status: Status; isOver: boolean; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: status })
  return (
    <div ref={setNodeRef} className="flex-1 overflow-y-auto p-2 space-y-2 transition-colors"
      style={{ minHeight: 80, background: isOver ? `${STATUS_CONFIG[status].bg}44` : 'transparent' }}>
      {children}
    </div>
  )
}

// ── Task create/edit form ─────────────────────────────────────────────────────

function TaskForm({ initial, onSave, onClose }: {
  initial?: Partial<Issue>
  onSave:   (data: Partial<Issue>) => Promise<void>
  onClose:  () => void
}) {
  const { profiles, sprints } = useStore()
  const isSubtask = initial?.issue_type === 'subtask'
  const [form, setForm] = useState({
    title:       initial?.title       ?? '',
    description: initial?.description ?? '',
    issue_type:  initial?.issue_type  ?? 'task' as 'task' | 'subtask',
    priority:    initial?.priority    ?? 'medium' as Priority,
    status:      initial?.status      ?? 'todo'   as Status,
    assignee_id: initial?.assignee_id ?? '',
    sprint_id:   initial?.sprint_id   ?? '',
    tags:        initial?.tags        ?? [] as string[],
  })
  const [saving, setSaving] = useState(false)

  function toggleTag(tag: string) {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag],
    }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({ ...form, assignee_id: form.assignee_id || undefined, sprint_id: form.sprint_id || undefined })
    setSaving(false)
    onClose()
  }

  return (
    <form onSubmit={submit} className="space-y-4">

      {/* Task / Subtask toggle */}
      <div className="flex gap-2">
        {(['task', 'subtask'] as const).map(t => {
          const cfg    = ISSUE_TYPE_CONFIG[t]
          const active = form.issue_type === t
          return (
            <button key={t} type="button"
              onClick={() => setForm(f => ({ ...f, issue_type: t }))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all"
              style={active
                ? { color: cfg.color, background: cfg.bg, borderColor: cfg.color }
                : { color: colors.textMuted, borderColor: colors.border }}>
              {cfg.icon} {cfg.label}
            </button>
          )
        })}
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: colors.textSubtle }}>
          {form.issue_type === 'task' ? 'Task summary' : 'Subtask'} *
        </label>
        <input className="input" required autoFocus value={form.title}
          placeholder={form.issue_type === 'task' ? 'What needs to be done?' : 'Describe this subtask…'}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: colors.textSubtle }}>
          Details
        </label>
        <textarea className="input resize-none" style={{ minHeight: 72 }} value={form.description}
          placeholder="Add context, steps, or notes…"
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: colors.textSubtle }}>
          Category / Tag
        </label>
        <div className="flex flex-wrap gap-1.5">
          {TAG_PRESETS.map(tag => {
            const active = form.tags.includes(tag.label)
            return (
              <button key={tag.label} type="button"
                onClick={() => toggleTag(tag.label)}
                className="text-[10px] font-bold px-2 py-1 rounded-lg border transition-all"
                style={active
                  ? { color: tag.color, background: tag.bg, borderColor: tag.color }
                  : { color: colors.textMuted, borderColor: colors.border, background: 'transparent' }}>
                {tag.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: colors.textSubtle }}>Priority</label>
          <select className="input" value={form.priority}
            onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}>
            {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: colors.textSubtle }}>Status</label>
          <select className="input" value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value as Status }))}>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: colors.textSubtle }}>Assignee</label>
          <select className="input" value={form.assignee_id}
            onChange={e => setForm(f => ({ ...f, assignee_id: e.target.value }))}>
            <option value="">Unassigned</option>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: colors.textSubtle }}>Sprint</label>
          <select className="input" value={form.sprint_id}
            onChange={e => setForm(f => ({ ...f, sprint_id: e.target.value }))}>
            <option value="">No sprint</option>
            {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-2 pt-2" style={{ borderTop: `1px solid ${colors.border}` }}>
        <button type="submit" disabled={saving || !form.title.trim()} className="btn-primary">
          {saving ? 'Saving…' : initial?.id ? 'Update' : `Create ${form.issue_type}`}
        </button>
        <button type="button" onClick={onClose} className="btn-subtle">Cancel</button>
      </div>
    </form>
  )
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({ task, subtasks, onClose, onSave, onDelete, onAddSubtask, onToggleSubtask }: {
  task:            Issue
  subtasks:        Issue[]
  onClose:         () => void
  onSave:          (data: Partial<Issue>) => Promise<void>
  onDelete:        (id: string) => void
  onAddSubtask:    () => void
  onToggleSubtask: (id: string, done: boolean) => void
}) {
  const { profiles, sprints } = useStore()
  const [form, setForm] = useState({
    title:       task.title,
    description: task.description ?? '',
    priority:    task.priority,
    status:      task.status,
    assignee_id: task.assignee_id ?? '',
    sprint_id:   task.sprint_id   ?? '',
    tags:        task.tags        ?? [] as string[],
  })
  const [saving, setSaving] = useState(false)
  const [editTitle, setEditTitle] = useState(false)

  useEffect(() => {
    setForm({
      title:       task.title,
      description: task.description ?? '',
      priority:    task.priority,
      status:      task.status,
      assignee_id: task.assignee_id ?? '',
      sprint_id:   task.sprint_id   ?? '',
      tags:        task.tags        ?? [],
    })
  }, [task.id])

  async function save(patch: Partial<typeof form>) {
    const next = { ...form, ...patch }
    setForm(next)
    setSaving(true)
    await onSave({ ...next, assignee_id: next.assignee_id || undefined, sprint_id: next.sprint_id || undefined })
    setSaving(false)
  }

  function toggleTag(tag: string) {
    const next = form.tags.includes(tag)
      ? form.tags.filter(t => t !== tag)
      : [...form.tags, tag]
    save({ tags: next })
  }

  const doneSubtasks = subtasks.filter(s => s.status === 'done').length

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden" style={{ borderLeft: `1px solid ${colors.border}` }}>

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: `1px solid ${colors.border}`, background: colors.surfaceLighter }}>
        <span className="text-sm">{ISSUE_TYPE_CONFIG[task.issue_type ?? 'task'].icon}</span>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
          style={{ background: ISSUE_TYPE_CONFIG[task.issue_type ?? 'task'].bg, color: ISSUE_TYPE_CONFIG[task.issue_type ?? 'task'].color }}>
          {ISSUE_TYPE_CONFIG[task.issue_type ?? 'task'].label}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {saving && <span className="text-[10px]" style={{ color: colors.textLight }}>Saving…</span>}
          <button onClick={() => onDelete(task.id)}
            className="p-1.5 rounded transition-colors" style={{ color: colors.textFaint }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = colors.red; (e.currentTarget as HTMLElement).style.background = colors.redLight }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = colors.textFaint; (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose}
            className="p-1.5 rounded transition-colors" style={{ color: colors.textFaint }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = colors.surfaceLight}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

        {/* Title */}
        {editTitle ? (
          <input className="input text-sm font-semibold" value={form.title} autoFocus
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            onBlur={() => { setEditTitle(false); save({ title: form.title }) }}
            onKeyDown={e => {
              if (e.key === 'Enter') { setEditTitle(false); save({ title: form.title }) }
              if (e.key === 'Escape') setEditTitle(false)
            }} />
        ) : (
          <h2 className="text-sm font-bold leading-snug cursor-text hover:bg-[#F4F5F7] rounded px-1 py-0.5 -mx-1 transition-colors"
            style={{ color: colors.textPrimary }}
            onClick={() => setEditTitle(true)}>
            {form.title}
          </h2>
        )}

        {/* Tags */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: colors.textSubtle }}>Category</p>
          <div className="flex flex-wrap gap-1.5">
            {TAG_PRESETS.map(tag => {
              const active = form.tags.includes(tag.label)
              return (
                <button key={tag.label} type="button" onClick={() => toggleTag(tag.label)}
                  className="text-[10px] font-bold px-2 py-0.5 rounded border transition-all"
                  style={active
                    ? { color: tag.color, background: tag.bg, borderColor: tag.color }
                    : { color: colors.textMuted, borderColor: colors.border }}>
                  {tag.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-3">
          {([
            { label: 'STATUS',   node: (
              <select className="input py-1 text-xs" value={form.status}
                onChange={e => save({ status: e.target.value as Status })}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
              </select>
            )},
            { label: 'PRIORITY', node: (
              <select className="input py-1 text-xs" value={form.priority}
                onChange={e => save({ priority: e.target.value as Priority })}>
                {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>)}
              </select>
            )},
            { label: 'ASSIGNEE', node: (
              <select className="input py-1 text-xs" value={form.assignee_id}
                onChange={e => save({ assignee_id: e.target.value })}>
                <option value="">Unassigned</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )},
            { label: 'SPRINT',   node: (
              <select className="input py-1 text-xs" value={form.sprint_id}
                onChange={e => save({ sprint_id: e.target.value })}>
                <option value="">No sprint</option>
                {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )},
          ]).map(({ label, node }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="w-20 text-[10px] font-bold flex-shrink-0" style={{ color: colors.textSubtle }}>{label}</span>
              {node}
            </div>
          ))}
        </div>

        {/* Subtasks */}
        {task.issue_type === 'task' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: colors.textSubtle }}>
                Subtasks {subtasks.length > 0 && `(${doneSubtasks}/${subtasks.length})`}
              </p>
              <button onClick={onAddSubtask}
                className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded transition-colors"
                style={{ color: colors.blue, background: colors.blueLight }}>
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            {subtasks.length > 0 && (
              <div className="space-y-1">
                {/* Progress bar */}
                <div className="h-1 rounded-full overflow-hidden mb-2" style={{ background: colors.border }}>
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${subtasks.length === 0 ? 0 : Math.round((doneSubtasks / subtasks.length) * 100)}%`,
                    background: colors.green,
                  }} />
                </div>
                {subtasks.map(sub => (
                  <button key={sub.id} onClick={() => onToggleSubtask(sub.id, sub.status !== 'done')}
                    className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-lg transition-colors group"
                    style={{ background: colors.surfaceLighter }}>
                    {sub.status === 'done'
                      ? <CheckSquare className="w-3.5 h-3.5 flex-shrink-0" style={{ color: colors.green }} />
                      : <Square className="w-3.5 h-3.5 flex-shrink-0" style={{ color: colors.textPlaceholder }} />}
                    <span className="text-xs flex-1"
                      style={{
                        color:          sub.status === 'done' ? colors.textFaint : colors.textPrimary,
                        textDecoration: sub.status === 'done' ? 'line-through' : 'none',
                      }}>
                      {sub.title}
                    </span>
                    {sub.assignee && (
                      <span className="w-4 h-4 rounded-full text-white text-[8px] font-bold flex items-center justify-center flex-shrink-0"
                        style={{ background: colors.blue }}>
                        {sub.assignee.name[0]?.toUpperCase()}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
            {subtasks.length === 0 && (
              <p className="text-xs" style={{ color: colors.textPlaceholder }}>No subtasks yet</p>
            )}
          </div>
        )}

        {/* Description */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: colors.textSubtle }}>Details</p>
          <textarea className="input text-xs resize-none" style={{ minHeight: 80 }}
            value={form.description} placeholder="Add context, notes, or steps…"
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            onBlur={() => save({ description: form.description })} />
        </div>

        <div className="text-[11px]" style={{ color: colors.textLight }}>
          Created {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function TaskBoard() {
  const { bugs, setBugs, addBug, updateBug, deleteBug, user, project, sprints, setSprints } = useStore()

  const [showCreate,    setShowCreate]    = useState(false)
  const [defaultStatus, setDefaultStatus] = useState<Status>('todo')
  const [selectedId,    setSelectedId]    = useState<string | null>(null)
  const [filterTag,     setFilterTag]     = useState('')
  const [filterMine,    setFilterMine]    = useState(false)
  const [activeBugId,   setActiveBugId]   = useState<string | null>(null)
  const [overColumnId,  setOverColumnId]  = useState<Status | null>(null)
  const [addSubtaskFor, setAddSubtaskFor] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  const tasks    = useMemo(() => bugs.filter(b => b.issue_type === 'task'), [bugs])
  const subtasks = useMemo(() => bugs.filter(b => b.issue_type === 'subtask'), [bugs])

  const selectedTask = selectedId ? tasks.find(t => t.id === selectedId) ?? null : null
  const activeTask   = activeBugId ? tasks.find(t => t.id === activeBugId) ?? null : null

  // Tags present in current task set
  const allTags = useMemo(() => {
    const set = new Set<string>()
    tasks.forEach(t => (t.tags ?? []).forEach(tag => set.add(tag)))
    return Array.from(set)
  }, [tasks])

  useEffect(() => {
    let mounted = true
    if (!project) return
    const pid = project.id
    const refresh = () => bugService.getByProject(pid).then(({ data }) => {
      if (mounted && data) setBugs(data as any)
    })
    refresh()
    if (sprints.length === 0) sprintService.getByProject(pid).then(({ data }) => {
      if (mounted && data) setSprints(data as any)
    })
    const unsub = bugService.subscribe(pid, refresh)
    return () => { mounted = false; unsub() }
  }, [project?.id])

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      if (e.key === 'c' && !e.ctrlKey && !e.metaKey) { setDefaultStatus('todo'); setShowCreate(true) }
      if (e.key === 'Escape') setSelectedId(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const filtered = useMemo(() => tasks.filter(t =>
    (!filterTag  || (t.tags ?? []).includes(filterTag)) &&
    (!filterMine || t.assignee_id === user?.id)
  ), [tasks, filterTag, filterMine, user?.id])

  async function handleCreate(data: Partial<Issue>) {
    if (!user || !project) return
    const { data: created } = await bugService.create({
      ...data, issue_type: data.issue_type ?? 'task', created_by: user.id, project_id: project.id, tags: data.tags ?? [],
    })
    if (created) addBug(created as any)
  }

  async function handleUpdate(data: Partial<Issue>) {
    if (!selectedId) return
    await bugService.update(selectedId, data)
    updateBug(selectedId, data)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this task?')) return
    await bugService.delete(id)
    deleteBug(id)
    if (selectedId === id) setSelectedId(null)
  }

  async function handleToggleSubtask(id: string, done: boolean) {
    const status: Status = done ? 'done' : 'in_progress'
    await bugService.update(id, { status })
    updateBug(id, { status })
  }

  async function handleAddSubtask(data: Partial<Issue>) {
    if (!user || !project) return
    const { data: created } = await bugService.create({
      ...data, issue_type: 'subtask', created_by: user.id, project_id: project.id, tags: [],
    })
    if (created) addBug(created as any)
  }

  // Drag handlers
  function onDragStart({ active }: DragStartEvent) { setActiveBugId(active.id as string) }

  function onDragOver({ over }: DragOverEvent) {
    if (!over) { setOverColumnId(null); return }
    const overId = over.id as string
    setOverColumnId(
      (STATUSES as string[]).includes(overId)
        ? overId as Status
        : (tasks.find(t => t.id === overId)?.status ?? null)
    )
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveBugId(null); setOverColumnId(null)
    if (!over) return
    const task = tasks.find(t => t.id === active.id)
    if (!task) return
    const overId       = over.id as string
    const isColumn     = (STATUSES as string[]).includes(overId)
    const targetStatus = isColumn ? overId as Status : (tasks.find(t => t.id === overId)?.status ?? null)
    if (!targetStatus) return
    if (task.status !== targetStatus) {
      bugService.update(task.id, { status: targetStatus })
      updateBug(task.id, { status: targetStatus })
      return
    }
    if (!isColumn) {
      const col = filtered.filter(t => t.status === task.status).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      const oldIdx = col.findIndex(t => t.id === task.id)
      const newIdx = col.findIndex(t => t.id === overId)
      if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
        arrayMove(col, oldIdx, newIdx).forEach((t, i) => {
          updateBug(t.id, { sort_order: i * 10 })
          bugService.update(t.id, { sort_order: i * 10 })
        })
      }
    }
  }

  const openCount = tasks.filter(t => t.status !== 'done').length

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: colors.surfaceLighter }}>

      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3 bg-white flex-shrink-0 flex-wrap"
        style={{ borderBottom: `1px solid ${colors.border}` }}>
        <div className="mr-2">
          <div className="flex items-center gap-2">
            <span className="text-base">☑️</span>
            <h1 className="text-sm font-bold" style={{ color: colors.textPrimary }}>Tasks</h1>
            <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
              style={{ background: colors.blueLight, color: colors.blue }}>
              {openCount} open
            </span>
          </div>
          <p className="text-[11px] mt-0.5" style={{ color: colors.textLight }}>
            {project?.key} · R&D, Enhancements, Work items
          </p>
        </div>

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <button onClick={() => setFilterMine(m => !m)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold border transition-colors"
            style={filterMine
              ? { background: colors.blueLight, color: colors.blue, borderColor: colors.blue }
              : { background: 'white', color: colors.textMuted, borderColor: colors.border }}>
            Mine
          </button>

          {/* Tag filter */}
          <select className="input py-1 text-xs w-36" value={filterTag}
            onChange={e => setFilterTag(e.target.value)}>
            <option value="">All categories</option>
            {TAG_PRESETS.map(t => (
              <option key={t.label} value={t.label}>{t.label}</option>
            ))}
          </select>

          <button onClick={() => { setDefaultStatus('todo'); setShowCreate(true) }} className="btn-primary">
            <Plus className="w-3.5 h-3.5" /> Create task
          </button>
        </div>
      </div>

      {/* Active tag chips (quick filter) */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-2 px-5 py-2 bg-white flex-shrink-0 overflow-x-auto"
          style={{ borderBottom: `1px solid ${colors.border}` }}>
          <span className="text-[10px] font-semibold uppercase tracking-wide flex-shrink-0" style={{ color: colors.textSubtle }}>Filter</span>
          <button onClick={() => setFilterTag('')}
            className="text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all flex-shrink-0"
            style={filterTag === ''
              ? { background: colors.textPrimary, color: '#fff', borderColor: colors.textPrimary }
              : { color: colors.textMuted, borderColor: colors.border }}>
            All
          </button>
          {TAG_PRESETS.filter(t => allTags.includes(t.label)).map(tag => (
            <button key={tag.label} onClick={() => setFilterTag(filterTag === tag.label ? '' : tag.label)}
              className="text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all flex-shrink-0"
              style={filterTag === tag.label
                ? { color: tag.color, background: tag.bg, borderColor: tag.color }
                : { color: colors.textMuted, borderColor: colors.border }}>
              {tag.label}
            </button>
          ))}
        </div>
      )}

      {/* Board */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto p-4" style={{ overflowX: 'auto', minWidth: 0 }}>
          <DndContext sensors={sensors} collisionDetection={closestCorners}
            onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>

            <div className="flex gap-4 h-full pb-2" style={{ minWidth: 'max-content' }}>
              {STATUSES.map(status => {
                const cfg     = STATUS_CONFIG[status]
                const items   = filtered
                  .filter(t => t.status === status)
                  .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                const isTarget = overColumnId === status && activeBugId !== null

                return (
                  <div key={status} className="flex flex-col rounded-xl overflow-hidden flex-shrink-0 transition-all"
                    style={{
                      width:          284,
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
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: cfg.topColor }}>
                          {cfg.label}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: isTarget ? cfg.topColor : colors.surfaceLight, color: isTarget ? '#fff' : cfg.dotColor }}>
                        {items.length}
                      </span>
                    </div>

                    <SortableContext items={items.map(t => t.id)} strategy={verticalListSortingStrategy}>
                      <DroppableColumn status={status} isOver={isTarget}>
                        {items.map(task => (
                          <SortableCard
                            key={task.id}
                            task={task}
                            subtaskCount={subtasks.filter(s => s.project_id === task.project_id && s.status !== 'done').length}
                            isSelected={selectedId === task.id}
                            onClick={() => setSelectedId(selectedId === task.id ? null : task.id)}
                          />
                        ))}
                        {items.length === 0 && !isTarget && (
                          <div className="flex flex-col items-center justify-center py-10 gap-1">
                            <span className="text-xl opacity-25">☑️</span>
                            <p className="text-xs" style={{ color: colors.textPlaceholder }}>No tasks</p>
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
                      <Plus className="w-3.5 h-3.5" /> Add task
                    </button>
                  </div>
                )
              })}
            </div>

            <DragOverlay dropAnimation={{ duration: 150, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
              {activeTask && (
                <CardContent task={activeTask} subtaskCount={0} isDragOverlay />
              )}
            </DragOverlay>
          </DndContext>
        </div>

        {/* Detail panel */}
        {selectedTask && (
          <div className="w-[320px] flex-shrink-0 flex flex-col overflow-hidden"
            style={{ borderLeft: `1px solid ${colors.border}` }}>
            <DetailPanel
              task={selectedTask}
              subtasks={subtasks}
              onClose={() => setSelectedId(null)}
              onSave={handleUpdate}
              onDelete={handleDelete}
              onAddSubtask={() => { setAddSubtaskFor(selectedTask.id); setShowCreate(false) }}
              onToggleSubtask={handleToggleSubtask}
            />
          </div>
        )}
      </div>

      {/* Create task modal */}
      {showCreate && (
        <Modal title="Create task" onClose={() => setShowCreate(false)} size="lg">
          <TaskForm
            initial={{ status: defaultStatus, issue_type: 'task' }}
            onSave={handleCreate}
            onClose={() => setShowCreate(false)}
          />
        </Modal>
      )}

      {/* Add subtask modal */}
      {addSubtaskFor && (
        <Modal title="Add subtask" onClose={() => setAddSubtaskFor(null)} size="md">
          <TaskForm
            initial={{ status: 'todo', issue_type: 'subtask' }}
            onSave={async data => { await handleAddSubtask(data); setAddSubtaskFor(null) }}
            onClose={() => setAddSubtaskFor(null)}
          />
        </Modal>
      )}
    </div>
  )
}
