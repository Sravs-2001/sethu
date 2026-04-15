'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  DndContext, DragOverlay, closestCorners,
  PointerSensor, KeyboardSensor,
  useSensor, useSensors,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import {
  Plus, List, LayoutGrid, User, Search,
  ChevronUp, ChevronDown, GripVertical, Calendar,
  MessageSquare, Paperclip, X,
} from 'lucide-react'
import { PriorityBadge } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import TaskDetail from '@/components/Tasks/TaskDetail'
import {
  STATUSES, STATUS_CONFIG, PRIORITIES, PRIORITY_CONFIG,
  ISSUE_TYPES, ISSUE_TYPE_CONFIG, colors,
} from '@/lib/constants'
import type { Bug as Task, Priority, Status, IssueType } from '@/types'
import { formatDistanceToNow, isPast, format } from 'date-fns'
import clsx from 'clsx'

// ── Issue key helper ──────────────────────────────────────────────────────────

function useKeyMap(tasks: Task[]) {
  return useMemo(() => {
    const sorted = [...tasks].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    return Object.fromEntries(sorted.map((t, i) => [t.id, i + 1]))
  }, [tasks])
}

// ── Field label ───────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-bold uppercase tracking-wider mb-1"
      style={{ color: 'var(--t3)' }}>
      {children}
    </label>
  )
}

// ── Type badge ────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: IssueType }) {
  const { color, bg, icon, label } = ISSUE_TYPE_CONFIG[type]
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded"
      style={{ color, background: bg }}>
      {icon} {label}
    </span>
  )
}

// ── Issue key pill ────────────────────────────────────────────────────────────

function IssueKey({ value }: { value: string }) {
  return (
    <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded"
      style={{ background: 'var(--blue-bg)', color: 'var(--blue)' }}>
      {value}
    </span>
  )
}

// ── Issue create/edit form ────────────────────────────────────────────────────

function IssueForm({ initial, onSave, onClose }: {
  initial?: Partial<Task>
  onSave:   (data: Partial<Task>) => Promise<void>
  onClose:  () => void
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
    due_date:    initial?.due_date    ?? '',
  })
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({
      ...form,
      assignee_id: form.assignee_id || undefined,
      sprint_id:   form.sprint_id   || undefined,
      due_date:    form.due_date    || undefined,
    })
    setSaving(false)
    onClose()
  }

  const placeholder =
    form.issue_type === 'bug'   ? 'Describe the bug briefly…'  :
    form.issue_type === 'epic'  ? 'Name this epic…'             :
    form.issue_type === 'story' ? 'As a user, I want to…'      :
    'What needs to be done?'

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Type pills */}
      <div>
        <FieldLabel>Issue type</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {ISSUE_TYPES.map(t => {
            const cfg    = ISSUE_TYPE_CONFIG[t]
            const active = form.issue_type === t
            return (
              <button key={t} type="button"
                onClick={() => setForm({ ...form, issue_type: t })}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all"
                style={active
                  ? { color: cfg.color, background: cfg.bg, borderColor: cfg.color }
                  : { borderColor: 'var(--border)', color: 'var(--t2)' }}>
                {cfg.icon} {cfg.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <FieldLabel>Summary *</FieldLabel>
        <input className="input" value={form.title} required autoFocus
          placeholder={placeholder}
          onChange={e => setForm({ ...form, title: e.target.value })} />
      </div>

      <div>
        <FieldLabel>Description</FieldLabel>
        <textarea className="input resize-none" style={{ height: 80 }} value={form.description}
          placeholder="Add details, acceptance criteria…"
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Assignee</FieldLabel>
          <select className="input" value={form.assignee_id}
            onChange={e => setForm({ ...form, assignee_id: e.target.value })}>
            <option value="">Unassigned</option>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <FieldLabel>Sprint</FieldLabel>
          <select className="input" value={form.sprint_id}
            onChange={e => setForm({ ...form, sprint_id: e.target.value })}>
            <option value="">No sprint</option>
            {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div>
        <FieldLabel>Due date</FieldLabel>
        <input className="input" type="date" value={form.due_date}
          onChange={e => setForm({ ...form, due_date: e.target.value })} />
      </div>

      <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
        <button type="submit" className="btn-primary"
          disabled={saving || !form.title.trim()}>
          {saving ? 'Saving…' : initial?.id ? 'Update issue' : 'Create issue'}
        </button>
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
      </div>
    </form>
  )
}

// ── Sortable card ─────────────────────────────────────────────────────────────

function SortableCard({
  task, issueKey, isSelected, onClick,
}: {
  task:      Task
  issueKey:  string
  isSelected: boolean
  onClick:   () => void
}) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform:  CSS.Transform.toString(transform),
    transition,
    opacity:    isDragging ? 0.35 : 1,
    zIndex:     isDragging ? 999 : undefined,
  }

  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'done'

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={clsx(
        'issue-card group relative',
        isSelected && 'ring-2'
      )}
      style={{
        ...style,
        background: isSelected ? 'var(--blue-nav)' : 'var(--bg-card)',
        borderColor: isSelected ? 'var(--blue)' : 'var(--border)',
        boxShadow: isSelected ? '0 0 0 2px var(--focus-ring)' : 'var(--shadow-xs)',
      }}>

      {/* Drag handle */}
      <div
        className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 cursor-grab active:cursor-grabbing transition-opacity"
        {...attributes}
        {...listeners}>
        <GripVertical className="w-3 h-3" style={{ color: 'var(--t4)' }} />
      </div>

      {/* Top row: type + key */}
      <div className="flex items-center justify-between mb-2 pl-3">
        <TypeBadge type={task.issue_type ?? 'task'} />
        <IssueKey value={issueKey} />
      </div>

      {/* Title */}
      <p className="text-xs font-semibold leading-snug mb-2.5 pl-3"
        style={{ color: isSelected ? 'var(--blue)' : 'var(--t1)' }}>
        {task.title}
      </p>

      {/* Bottom row: priority + meta */}
      <div className="flex items-center gap-1.5 pl-3 flex-wrap">
        <PriorityBadge priority={task.priority} />

        {task.due_date && (
          <span className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded"
            style={{
              background: isOverdue ? 'var(--red-bg)' : 'var(--bg-raised)',
              color: isOverdue ? 'var(--red)' : 'var(--t3)',
            }}>
            <Calendar className="w-2.5 h-2.5" />
            {format(new Date(task.due_date), 'MMM d')}
          </span>
        )}

        {(task.comment_count ?? 0) > 0 && (
          <span className="flex items-center gap-0.5 text-[10px]" style={{ color: 'var(--t4)' }}>
            <MessageSquare className="w-2.5 h-2.5" />
            {task.comment_count}
          </span>
        )}

        {task.assignee && (
          <span
            className="w-5 h-5 rounded-full text-white text-[9px] font-bold flex items-center justify-center ml-auto flex-shrink-0"
            title={task.assignee.name}
            style={{ background: colors.blue }}>
            {task.assignee.name[0]?.toUpperCase()}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Card overlay (shown while dragging) ──────────────────────────────────────

function CardOverlay({ task, issueKey }: { task: Task; issueKey: string }) {
  return (
    <div className="dnd-overlay w-64">
      <div className="flex items-center justify-between mb-2">
        <TypeBadge type={task.issue_type ?? 'task'} />
        <IssueKey value={issueKey} />
      </div>
      <p className="text-xs font-semibold leading-snug mb-2" style={{ color: 'var(--t1)' }}>
        {task.title}
      </p>
      <PriorityBadge priority={task.priority} />
    </div>
  )
}

// ── Column ────────────────────────────────────────────────────────────────────

function Column({
  status, tasks, keyMap, selectedId,
  onCardClick, onQuickAdd,
}: {
  status:     Status
  tasks:      Task[]
  keyMap:     Record<string, number>
  selectedId: string | null
  onCardClick:  (task: Task) => void
  onQuickAdd:   (status: Status) => void
}) {
  const cfg = STATUS_CONFIG[status]
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div className="kanban-col flex flex-col"
      style={{
        borderTopColor: cfg.topColor,
        borderTopWidth: 3,
        background: isOver ? `${cfg.bg}44` : 'var(--bg-raised)',
        boxShadow: isOver ? `0 0 0 2px ${cfg.topColor}44` : undefined,
        minWidth: 260,
        width: 280,
        maxWidth: 280,
        transition: 'background 0.15s, box-shadow 0.15s',
      }}>

      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: cfg.topColor }} />
          <span className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: 'var(--t2)' }}>
            {cfg.label}
          </span>
        </div>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: isOver ? cfg.bg : 'var(--bg-sunken)', color: cfg.dotColor }}>
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <div ref={setNodeRef} className="flex-1 overflow-y-auto p-2 space-y-2"
        style={{ minHeight: 80 }}>
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <SortableCard
              key={task.id}
              task={task}
              issueKey={`${task.project_id ? '' : ''}${keyMap[task.id] ? `#${keyMap[task.id]}` : task.id.slice(0,6)}`}
              isSelected={selectedId === task.id}
              onClick={() => onCardClick(task)}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && !isOver && (
          <div className="py-8 text-center">
            <p className="text-xs" style={{ color: 'var(--t5)' }}>No issues</p>
          </div>
        )}

        {isOver && (
          <div className="rounded-lg py-4 border-2 border-dashed text-center text-xs font-semibold"
            style={{ borderColor: cfg.topColor, color: cfg.topColor }}>
            Drop here
          </div>
        )}
      </div>

      {/* Quick-add */}
      <button
        onClick={() => onQuickAdd(status)}
        className="flex items-center gap-1.5 w-full px-3 py-2 text-xs font-medium transition-all flex-shrink-0"
        style={{ borderTop: '1px solid var(--border)', color: 'var(--t3)' }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = cfg.bg
          ;(e.currentTarget as HTMLElement).style.color = cfg.topColor
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'transparent'
          ;(e.currentTarget as HTMLElement).style.color = 'var(--t3)'
        }}>
        <Plus className="w-3 h-3" /> Add issue
      </button>
    </div>
  )
}

// ── List view ─────────────────────────────────────────────────────────────────

type SortField = 'title' | 'priority' | 'status' | 'due_date' | 'created_at'

function ListView({
  tasks, keyMap, selectedId, project, onRowClick,
}: {
  tasks:      Task[]
  keyMap:     Record<string, number>
  selectedId: string | null
  project:    { key: string } | null
  onRowClick: (task: Task) => void
}) {
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortAsc,   setSortAsc]   = useState(false)

  const PRIORITY_ORDER: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 }

  const sorted = [...tasks].sort((a, b) => {
    let cmp = 0
    if (sortField === 'priority')   cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    else if (sortField === 'status') cmp = STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status)
    else if (sortField === 'title')  cmp = a.title.localeCompare(b.title)
    else if (sortField === 'due_date') {
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      cmp = new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    }
    else cmp = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    return sortAsc ? cmp : -cmp
  })

  function toggleSort(f: SortField) {
    if (sortField === f) setSortAsc(a => !a)
    else { setSortField(f); setSortAsc(true) }
  }

  function SortArrow({ field }: { field: SortField }) {
    if (sortField !== field) return null
    return sortAsc
      ? <ChevronUp   className="w-3 h-3 inline ml-0.5" />
      : <ChevronDown className="w-3 h-3 inline ml-0.5" />
  }

  const headers: { label: string; field: SortField | null }[] = [
    { label: 'Key',      field: null },
    { label: 'Summary',  field: 'title' },
    { label: 'Type',     field: null },
    { label: 'Priority', field: 'priority' },
    { label: 'Status',   field: 'status' },
    { label: 'Assignee', field: null },
    { label: 'Due',      field: 'due_date' },
    { label: 'Created',  field: 'created_at' },
  ]

  return (
    <div className="rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--bg-raised)' }}>
            {headers.map(({ label, field }) => (
              <th key={label}
                className={clsx(
                  'px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider',
                  field && 'cursor-pointer select-none'
                )}
                style={{ color: 'var(--t3)' }}
                onClick={() => field && toggleSort(field)}>
                {label}{field && <SortArrow field={field} />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-12 text-center text-sm"
                style={{ color: 'var(--t4)' }}>
                No issues found.
              </td>
            </tr>
          )}
          {sorted.map(task => {
            const key       = `${project?.key ?? 'PROJ'}-${keyMap[task.id] ?? '?'}`
            const isSelected = selectedId === task.id
            const isOverdue  = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'done'
            return (
              <tr key={task.id}
                onClick={() => onRowClick(task)}
                className="cursor-pointer transition-colors group"
                style={{
                  borderBottom: '1px solid var(--border)',
                  background:   isSelected ? 'var(--blue-nav)' : undefined,
                }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--bg-raised)' }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                <td className="px-4 py-2.5">
                  <IssueKey value={key} />
                </td>
                <td className="px-4 py-2.5 max-w-[240px]">
                  <span className="font-semibold text-sm truncate block" style={{ color: 'var(--t1)' }}>
                    {task.title}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <TypeBadge type={task.issue_type ?? 'task'} />
                </td>
                <td className="px-4 py-2.5">
                  <PriorityBadge priority={task.priority} />
                </td>
                <td className="px-4 py-2.5">
                  <span className="badge"
                    style={{
                      background: STATUS_CONFIG[task.status].bg,
                      color:      STATUS_CONFIG[task.status].color,
                    }}>
                    <span className="w-1.5 h-1.5 rounded-full"
                      style={{ background: STATUS_CONFIG[task.status].dotColor }} />
                    {STATUS_CONFIG[task.status].label}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  {task.assignee ? (
                    <div className="flex items-center gap-1.5">
                      <span className="w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0"
                        style={{ background: colors.blue }}>
                        {task.assignee.name[0]?.toUpperCase()}
                      </span>
                      <span className="text-xs truncate max-w-[80px]" style={{ color: 'var(--t1)' }}>
                        {task.assignee.name}
                      </span>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--t5)' }}>—</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {task.due_date ? (
                    <span className="text-xs font-medium"
                      style={{ color: isOverdue ? 'var(--red)' : 'var(--t3)' }}>
                      {format(new Date(task.due_date), 'MMM d')}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--t5)' }}>—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-xs whitespace-nowrap" style={{ color: 'var(--t4)' }}>
                  {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Main board ────────────────────────────────────────────────────────────────

export default function KanbanBoard() {
  const { bugs, setBugs, addBug, updateBug, deleteBug, user, project } = useStore()

  const [view,           setView]           = useState<'board' | 'list'>('board')
  const [showCreate,     setShowCreate]     = useState(false)
  const [defaultStatus,  setDefaultStatus]  = useState<Status>('todo')
  const [selectedId,     setSelectedId]     = useState<string | null>(null)
  const [activeId,       setActiveId]       = useState<string | null>(null)
  const [search,         setSearch]         = useState('')
  const [filterPriority, setFilterPriority] = useState<Priority | ''>('')
  const [filterType,     setFilterType]     = useState<IssueType | ''>('')
  const [filterMine,     setFilterMine]     = useState(false)

  const keyMap     = useKeyMap(bugs)
  const selectedTask = selectedId ? bugs.find(b => b.id === selectedId) ?? null : null
  const activeTask   = activeId  ? bugs.find(b => b.id === activeId)   ?? null : null

  // ── dnd-kit sensors ──────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // ── Data loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!project) return
    const pid = project.id

    supabase.from('bugs').select('*, assignee:profiles(*), reporter:profiles(*)')
      .eq('project_id', pid).order('created_at', { ascending: false })
      .then(({ data }) => data && setBugs(data as any))

    const channel = supabase.channel(`kanban-${pid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bugs' }, () => {
        supabase.from('bugs').select('*, assignee:profiles(*), reporter:profiles(*)')
          .eq('project_id', pid).order('created_at', { ascending: false })
          .then(({ data }) => data && setBugs(data as any))
      }).subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [project?.id])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
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

  // ── CRUD ──────────────────────────────────────────────────────────────────
  async function handleCreate(data: Partial<Task>) {
    if (!user || !project) return
    const { data: bug } = await supabase.from('bugs')
      .insert({ ...data, issue_type: data.issue_type ?? 'task', created_by: user.id, project_id: project.id, tags: [], labels: [] })
      .select('*, assignee:profiles(*)').single()
    if (bug) addBug(bug as any)
  }

  async function handleUpdate(data: Partial<Task>) {
    if (!selectedTask) return
    await supabase.from('bugs').update(data).eq('id', selectedTask.id)
    updateBug(selectedTask.id, data)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this issue?')) return
    await supabase.from('bugs').delete().eq('id', id)
    deleteBug(id)
    if (selectedId === id) setSelectedId(null)
  }

  // ── DnD handlers ──────────────────────────────────────────────────────────
  function onDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
    setSelectedId(null)
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const draggedTask = bugs.find(b => b.id === active.id)
    if (!draggedTask) return

    // Hovering over a column droppable
    if ((STATUSES as readonly string[]).includes(over.id as string)) {
      const newStatus = over.id as Status
      if (draggedTask.status !== newStatus) {
        updateBug(draggedTask.id, { status: newStatus })
      }
      return
    }

    // Hovering over another card
    const overTask = bugs.find(b => b.id === over.id)
    if (overTask && draggedTask.status !== overTask.status) {
      updateBug(draggedTask.id, { status: overTask.status })
    }
  }

  function onDragEnd(event: DragEndEvent) {
    const { active } = event
    const task = bugs.find(b => b.id === active.id)
    if (task) {
      supabase.from('bugs').update({ status: task.status }).eq('id', task.id)
    }
    setActiveId(null)
  }

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => bugs.filter(b =>
    (!search         || b.title.toLowerCase().includes(search.toLowerCase())) &&
    (!filterPriority || b.priority === filterPriority) &&
    (!filterType     || b.issue_type === filterType) &&
    (!filterMine     || b.assignee_id === user?.id)
  ), [bugs, search, filterPriority, filterType, filterMine, user?.id])

  const totalOpen = bugs.filter(b => b.status !== 'done').length
  const hasFilter = !!(search || filterPriority || filterType || filterMine)

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0 flex-wrap"
        style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>

        <div className="flex items-center gap-2 mr-1">
          <span className="text-lg">📋</span>
          <div>
            <h1 className="text-sm font-bold leading-none" style={{ color: 'var(--t1)' }}>Issues</h1>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--t4)' }}>
              {bugs.length} total · {totalOpen} open
              {hasFilter && ` · ${filtered.length} shown`}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border text-xs"
          style={{ background: 'var(--bg-raised)', borderColor: 'var(--border)', minWidth: 160 }}>
          <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--t4)' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search issues…"
            className="bg-transparent outline-none text-xs flex-1 min-w-0"
            style={{ color: 'var(--t1)' }} />
          {search && (
            <button onClick={() => setSearch('')} style={{ color: 'var(--t4)' }}>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {/* Mine */}
          <button onClick={() => setFilterMine(m => !m)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold border transition-all"
            style={filterMine
              ? { background: 'var(--blue-bg)', color: 'var(--blue)', borderColor: 'var(--blue)' }
              : { background: 'var(--bg-card)', color: 'var(--t2)', borderColor: 'var(--border)' }}>
            <User className="w-3 h-3" /> Mine
          </button>

          {/* Type */}
          <select className="input py-1 text-xs" style={{ width: 120 }}
            value={filterType} onChange={e => setFilterType(e.target.value as any)}>
            <option value="">All types</option>
            {ISSUE_TYPES.map(t => (
              <option key={t} value={t}>{ISSUE_TYPE_CONFIG[t].icon} {ISSUE_TYPE_CONFIG[t].label}</option>
            ))}
          </select>

          {/* Priority */}
          <select className="input py-1 text-xs" style={{ width: 120 }}
            value={filterPriority} onChange={e => setFilterPriority(e.target.value as any)}>
            <option value="">All priorities</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>)}
          </select>

          {/* View toggle */}
          <div className="flex rounded overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {(['board', 'list'] as const).map((v, i) => (
              <button key={v} onClick={() => setView(v)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-all"
                style={view === v
                  ? { background: 'var(--blue)', color: 'white' }
                  : { background: 'var(--bg-card)', color: 'var(--t2)', borderLeft: i > 0 ? '1px solid var(--border)' : undefined }}>
                {v === 'board'
                  ? <><LayoutGrid className="w-3.5 h-3.5" /> Board</>
                  : <><List className="w-3.5 h-3.5" /> List</>}
              </button>
            ))}
          </div>

          <button onClick={() => { setDefaultStatus('todo'); setShowCreate(true) }} className="btn-primary">
            <Plus className="w-3.5 h-3.5" /> Create
            <kbd className="ml-1 text-[10px] opacity-60 font-mono">C</kbd>
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Board / List */}
        <div className={clsx(
          'flex-1 overflow-auto',
          view === 'board' ? 'p-4' : 'p-4',
          selectedTask && 'min-w-0'
        )}>
          {view === 'board' && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragEnd={onDragEnd}>
              <div className="flex gap-3 h-full" style={{ minWidth: 'fit-content' }}>
                {STATUSES.map(status => (
                  <Column
                    key={status}
                    status={status}
                    tasks={filtered.filter(b => b.status === status)}
                    keyMap={keyMap}
                    selectedId={selectedId}
                    onCardClick={t => setSelectedId(t.id === selectedId ? null : t.id)}
                    onQuickAdd={s => { setDefaultStatus(s); setShowCreate(true) }}
                  />
                ))}
              </div>

              <DragOverlay>
                {activeTask && (
                  <CardOverlay
                    task={activeTask}
                    issueKey={`${project?.key ?? 'PROJ'}-${keyMap[activeTask.id] ?? '?'}`}
                  />
                )}
              </DragOverlay>
            </DndContext>
          )}

          {view === 'list' && (
            <ListView
              tasks={filtered}
              keyMap={keyMap}
              selectedId={selectedId}
              project={project}
              onRowClick={t => setSelectedId(t.id === selectedId ? null : t.id)}
            />
          )}
        </div>

        {/* Task detail panel */}
        {selectedTask && (
          <div className="flex-shrink-0 animate-slide-right"
            style={{
              width: 380,
              borderLeft: '1px solid var(--border)',
              background: 'var(--bg-card)',
              overflowY: 'auto',
            }}>
            <TaskDetail
              task={selectedTask}
              issueKey={`${project?.key ?? 'PROJ'}-${keyMap[selectedTask.id] ?? '?'}`}
              onClose={() => setSelectedId(null)}
              onSave={handleUpdate}
              onDelete={handleDelete}
            />
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <Modal title="Create issue" onClose={() => setShowCreate(false)} size="lg">
          <IssueForm
            initial={{ status: defaultStatus }}
            onSave={handleCreate}
            onClose={() => setShowCreate(false)}
          />
        </Modal>
      )}
    </div>
  )
}
