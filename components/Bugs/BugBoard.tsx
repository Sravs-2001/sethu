'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import {
  Plus, Trash2, List, LayoutGrid,
  User, X, ChevronUp, ChevronDown as ChevronDownIcon, GripVertical,
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

// ── Issue create / edit form ──────────────────────────────────────────────────

function IssueForm({ initial, onSave, onClose }: {
  initial?: Partial<BugType>
  onSave:   (data: Partial<BugType>) => Promise<void>
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
  })
  const [saving, setSaving] = useState(false)

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

  const placeholder =
    form.issue_type === 'bug'   ? 'Describe the bug briefly…'  :
    form.issue_type === 'epic'  ? 'Name this epic…'             :
    form.issue_type === 'story' ? 'As a user, I want to…'      :
    'What needs to be done?'

  return (
    <form onSubmit={submit} className="space-y-3.5">
      {/* Issue type pills */}
      <div>
        <FieldLabel>Issue type</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {ISSUE_TYPES.map(t => {
            const cfg    = ISSUE_TYPE_CONFIG[t]
            const active = form.issue_type === t
            return (
              <button key={t} type="button"
                onClick={() => setForm({ ...form, issue_type: t })}
                className={clsx(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all',
                  active ? 'border-current' : 'hover:border-[#B3BAC5]'
                )}
                style={active
                  ? { color: cfg.color, background: cfg.bg, borderColor: cfg.color }
                  : { borderColor: colors.border }}>
                <span>{cfg.icon}</span>{cfg.label}
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
        <textarea className="input h-24 resize-none" value={form.description}
          placeholder={form.issue_type === 'bug' ? 'Steps to reproduce, expected vs actual…' : 'Add more details…'}
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

      <div className="flex gap-2 pt-2" style={{ borderTop: `1px solid ${colors.border}` }}>
        <button type="submit" className="btn-primary" disabled={saving || !form.title.trim()}>
          {saving ? 'Saving…' : initial?.id ? 'Update issue' : 'Create issue'}
        </button>
        <button type="button" onClick={onClose} className="btn-subtle">Cancel</button>
      </div>
    </form>
  )
}

// ── Detail slide panel ────────────────────────────────────────────────────────

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
  const [saving, setSaving] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)

  // Keep form in sync when parent bug changes
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
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden"
      style={{ borderLeft: `1px solid ${colors.border}` }}>

      {/* Panel header */}
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

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

        {/* Title */}
        <div>
          {editingTitle ? (
            <input
              className="input text-sm font-semibold"
              value={form.title}
              autoFocus
              onChange={e => setForm({ ...form, title: e.target.value })}
              onBlur={() => { setEditingTitle(false); save({ title: form.title }) }}
              onKeyDown={e => { if (e.key === 'Enter') { setEditingTitle(false); save({ title: form.title }) } if (e.key === 'Escape') setEditingTitle(false) }}
            />
          ) : (
            <h2 className="text-sm font-semibold leading-snug cursor-text hover:bg-[#F4F5F7] rounded px-1 py-0.5 -mx-1 transition-colors"
              style={{ color: colors.textPrimary }}
              onClick={() => setEditingTitle(true)}>
              {form.title}
            </h2>
          )}
        </div>

        {/* Fields grid */}
        <div className="space-y-3">
          {/* Status */}
          <div className="flex items-center gap-3">
            <span className="w-20 text-[11px] font-semibold flex-shrink-0" style={{ color: colors.textSubtle }}>STATUS</span>
            <select className="input py-1 text-xs" value={form.status}
              onChange={e => save({ status: e.target.value as Status })}>
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
            </select>
          </div>

          {/* Priority */}
          <div className="flex items-center gap-3">
            <span className="w-20 text-[11px] font-semibold flex-shrink-0" style={{ color: colors.textSubtle }}>PRIORITY</span>
            <select className="input py-1 text-xs" value={form.priority}
              onChange={e => save({ priority: e.target.value as Priority })}>
              {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>)}
            </select>
          </div>

          {/* Type */}
          <div className="flex items-center gap-3">
            <span className="w-20 text-[11px] font-semibold flex-shrink-0" style={{ color: colors.textSubtle }}>TYPE</span>
            <select className="input py-1 text-xs" value={form.issue_type}
              onChange={e => save({ issue_type: e.target.value as IssueType })}>
              {ISSUE_TYPES.map(t => <option key={t} value={t}>{ISSUE_TYPE_CONFIG[t].icon} {ISSUE_TYPE_CONFIG[t].label}</option>)}
            </select>
          </div>

          {/* Assignee */}
          <div className="flex items-center gap-3">
            <span className="w-20 text-[11px] font-semibold flex-shrink-0" style={{ color: colors.textSubtle }}>ASSIGNEE</span>
            <select className="input py-1 text-xs" value={form.assignee_id}
              onChange={e => save({ assignee_id: e.target.value })}>
              <option value="">Unassigned</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Sprint */}
          <div className="flex items-center gap-3">
            <span className="w-20 text-[11px] font-semibold flex-shrink-0" style={{ color: colors.textSubtle }}>SPRINT</span>
            <select className="input py-1 text-xs" value={form.sprint_id}
              onChange={e => save({ sprint_id: e.target.value })}>
              <option value="">No sprint</option>
              {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <FieldLabel>Description</FieldLabel>
          <textarea
            className="input text-xs resize-none"
            style={{ minHeight: 80 }}
            value={form.description}
            placeholder="Add a description…"
            onChange={e => setForm({ ...form, description: e.target.value })}
            onBlur={() => save({ description: form.description })}
          />
        </div>

        {/* Meta */}
        <div className="text-[11px] space-y-1 pt-2" style={{ borderTop: `1px solid ${colors.border}`, color: colors.textLight }}>
          <div>Created {formatDistanceToNow(new Date(bug.created_at), { addSuffix: true })}</div>
          {bug.updated_at && bug.updated_at !== bug.created_at && (
            <div>Updated {formatDistanceToNow(new Date(bug.updated_at), { addSuffix: true })}</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main board component ──────────────────────────────────────────────────────

type SortField = 'title' | 'priority' | 'status' | 'created_at'

export default function BugBoard() {
  const { bugs, setBugs, addBug, updateBug, deleteBug, user, project } = useStore()

  const [showCreate,     setShowCreate]     = useState(false)
  const [defaultStatus,  setDefaultStatus]  = useState<Status>('todo')
  const [selectedId,     setSelectedId]     = useState<string | null>(null)
  const [view,           setView]           = useState<'board' | 'list'>('board')
  const [filterPriority, setFilterPriority] = useState<Priority | ''>('')
  const [filterType,     setFilterType]     = useState<IssueType | ''>('')
  const [filterMine,     setFilterMine]     = useState(false)
  const [dragId,         setDragId]         = useState<string | null>(null)
  const [dropTarget,     setDropTarget]     = useState<Status | null>(null)
  const [sortField,      setSortField]      = useState<SortField>('created_at')
  const [sortAsc,        setSortAsc]        = useState(false)

  // Derive the selected bug from the live store (so edits are instantly reflected)
  const selectedBug = selectedId ? bugs.find(b => b.id === selectedId) ?? null : null

  // Stable issue keys: sort by created_at ascending → PROJECT-1, PROJECT-2, …
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

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      if (e.key === 'c' && !e.ctrlKey && !e.metaKey) {
        setDefaultStatus('todo')
        setShowCreate(true)
      }
      if (e.key === 'Escape') setSelectedId(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ── CRUD handlers ──────────────────────────────────────────────────────────

  async function handleCreate(data: Partial<BugType>) {
    if (!user || !project) return
    const { data: bug } = await supabase.from('bugs')
      .insert({ ...data, issue_type: data.issue_type ?? 'task', created_by: user.id, project_id: project.id, tags: [] })
      .select('*, assignee:profiles(*)').single()
    if (bug) addBug(bug as any)
  }

  async function handleUpdate(data: Partial<BugType>) {
    if (!selectedBug) return
    await supabase.from('bugs').update(data).eq('id', selectedBug.id)
    updateBug(selectedBug.id, data)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this issue?')) return
    await supabase.from('bugs').delete().eq('id', id)
    deleteBug(id)
    if (selectedId === id) setSelectedId(null)
  }

  async function handleStatusChange(bugId: string, status: Status) {
    await supabase.from('bugs').update({ status }).eq('id', bugId)
    updateBug(bugId, { status })
  }

  // ── Drag & drop ────────────────────────────────────────────────────────────

  function onDragStart(id: string) {
    setDragId(id)
  }

  function onDragEnd() {
    setDragId(null)
    setDropTarget(null)
  }

  function onDragOver(e: React.DragEvent, status: Status) {
    e.preventDefault()
    setDropTarget(status)
  }

  function onDrop(e: React.DragEvent, status: Status) {
    e.preventDefault()
    if (dragId) handleStatusChange(dragId, status)
    setDragId(null)
    setDropTarget(null)
  }

  // ── Filtering & sorting ────────────────────────────────────────────────────

  const PRIORITY_ORDER: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 }

  const filtered = bugs.filter(b =>
    (!filterPriority || b.priority  === filterPriority) &&
    (!filterType     || b.issue_type === filterType) &&
    (!filterMine     || b.assignee_id === user?.id)
  )

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0
    if (sortField === 'priority') cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    else if (sortField === 'status') cmp = STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status)
    else if (sortField === 'title')  cmp = a.title.localeCompare(b.title)
    else cmp = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    return sortAsc ? cmp : -cmp
  })

  function toggleSort(field: SortField) {
    if (sortField === field) setSortAsc(a => !a)
    else { setSortField(field); setSortAsc(true) }
  }

  const totalOpen = bugs.filter(b => b.status !== 'done').length

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: colors.surfaceLighter }}>

      {/* ── Header bar ── */}
      <div className="flex items-center gap-2 px-5 py-3 bg-white flex-shrink-0 flex-wrap"
        style={{ borderBottom: `1px solid ${colors.border}` }}>

        <div className="mr-2">
          <div className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <h1 className="text-sm font-bold" style={{ color: colors.textPrimary }}>Issues</h1>
            <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
              style={{ background: colors.blueLight, color: colors.blueDark }}>
              {bugs.length}
            </span>
          </div>
          <p className="text-[11px] mt-0.5" style={{ color: colors.textLight }}>
            {totalOpen} open · {project?.key} · Press <kbd className="px-1 py-0.5 rounded text-[10px] font-mono" style={{ background: colors.surfaceLight, border: `1px solid ${colors.border}` }}>C</kbd> to create
          </p>
        </div>

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {/* Mine toggle */}
          <button
            onClick={() => setFilterMine(m => !m)}
            className={clsx('flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold border transition-colors')}
            style={filterMine
              ? { background: colors.blueLight, color: colors.blue, borderColor: colors.blue }
              : { background: 'white', color: colors.textMuted, borderColor: colors.border }}>
            <User className="w-3 h-3" /> Mine
          </button>

          {/* Type filter */}
          <select className="input w-32 py-1 text-xs" value={filterType}
            onChange={e => setFilterType(e.target.value as any)}>
            <option value="">All types</option>
            {ISSUE_TYPES.map(t => (
              <option key={t} value={t}>{ISSUE_TYPE_CONFIG[t].icon} {ISSUE_TYPE_CONFIG[t].label}</option>
            ))}
          </select>

          {/* Priority filter */}
          <select className="input w-32 py-1 text-xs" value={filterPriority}
            onChange={e => setFilterPriority(e.target.value as any)}>
            <option value="">All priorities</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>)}
          </select>

          {/* View toggle */}
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

      {/* ── Main area (board/list + optional detail panel) ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Board / List content */}
        <div className={clsx('flex-1 overflow-auto p-4', selectedBug && 'min-w-0')}>

          {/* ── Board view ── */}
          {view === 'board' && (
            <div className="grid grid-cols-4 gap-3 h-full" style={{ minHeight: 0 }}>
              {STATUSES.map(status => {
                const cfg   = STATUS_CONFIG[status]
                const items = filtered.filter(b => b.status === status)
                const isTarget = dropTarget === status && dragId !== null

                return (
                  <div key={status}
                    className="flex flex-col rounded-xl overflow-hidden transition-all"
                    style={{
                      background:     isTarget ? `${cfg.bg}55` : colors.white,
                      border:         `1px solid ${isTarget ? cfg.topColor : colors.border}`,
                      borderTopColor: cfg.topColor,
                      borderTopWidth: 3,
                      boxShadow:      isTarget ? `0 0 0 2px ${cfg.topColor}33` : undefined,
                    }}
                    onDragOver={e => onDragOver(e, status)}
                    onDrop={e => onDrop(e, status)}
                    onDragLeave={() => setDropTarget(null)}>

                    {/* Column header */}
                    <div className="px-3 py-2.5 flex items-center justify-between flex-shrink-0"
                      style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: cfg.topColor }} />
                        <span className="text-[11px] font-bold uppercase tracking-wider"
                          style={{ color: colors.textNav }}>{cfg.label}</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: isTarget ? cfg.bg : colors.surfaceLight, color: cfg.dotColor }}>
                        {items.length}
                      </span>
                    </div>

                    {/* Cards */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-2" style={{ minHeight: 80 }}>
                      {items.map(bug => {
                        const issueKey = `${project?.key ?? 'PROJ'}-${keyMap[bug.id]}`
                        const isSelected = selectedId === bug.id
                        const isDragging = dragId === bug.id
                        return (
                          <div key={bug.id}
                            draggable
                            onDragStart={() => onDragStart(bug.id)}
                            onDragEnd={onDragEnd}
                            onClick={() => setSelectedId(isSelected ? null : bug.id)}
                            className="rounded-lg p-3 cursor-pointer select-none transition-all group"
                            style={{
                              background:  isSelected ? colors.blueLight : colors.white,
                              border:      `1px solid ${isSelected ? colors.blue : colors.border}`,
                              opacity:     isDragging ? 0.4 : 1,
                              boxShadow:   isSelected ? `0 0 0 2px ${colors.blue}33` : '0 1px 2px rgba(9,30,66,0.06)',
                            }}>

                            {/* Top row */}
                            <div className="flex items-center justify-between mb-2">
                              <TypeBadge type={bug.issue_type ?? 'bug'} />
                              <div className="flex items-center gap-1">
                                <GripVertical className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity cursor-grab"
                                  style={{ color: colors.textLight }} />
                                <span className="text-[10px] font-mono" style={{ color: colors.textPlaceholder }}>
                                  {issueKey}
                                </span>
                              </div>
                            </div>

                            {/* Title */}
                            <p className="text-xs font-semibold leading-snug mb-2"
                              style={{ color: isSelected ? colors.blue : colors.textPrimary }}>
                              {bug.title}
                            </p>

                            {/* Bottom row */}
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
                      })}

                      {/* Empty state + quick-add */}
                      {items.length === 0 && !isTarget && (
                        <div className="py-6 text-center">
                          <p className="text-xs mb-2" style={{ color: colors.textPlaceholder }}>No issues</p>
                        </div>
                      )}
                      {isTarget && (
                        <div className="rounded-lg border-2 border-dashed py-4 text-center text-xs"
                          style={{ borderColor: cfg.topColor, color: cfg.topColor }}>
                          Drop here
                        </div>
                      )}
                    </div>

                    {/* Quick-add footer */}
                    <button
                      onClick={() => { setDefaultStatus(status); setShowCreate(true) }}
                      className="flex items-center gap-1.5 w-full px-3 py-2 text-xs font-medium transition-colors flex-shrink-0"
                      style={{ borderTop: `1px solid ${colors.border}`, color: colors.textSubtle }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = cfg.bg; (e.currentTarget as HTMLElement).style.color = cfg.topColor }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = colors.textSubtle }}>
                      <Plus className="w-3 h-3" /> Add issue
                    </button>
                  </div>
                )
              })}
            </div>
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
                        No issues found.
                      </td>
                    </tr>
                  )}
                  {sorted.map(bug => {
                    const issueKey  = `${project?.key ?? 'PROJ'}-${keyMap[bug.id]}`
                    const isSelected = selectedId === bug.id
                    return (
                      <tr key={bug.id}
                        onClick={() => setSelectedId(isSelected ? null : bug.id)}
                        className="cursor-pointer transition-colors group"
                        style={{
                          borderBottom: `1px solid ${colors.surfaceLight}`,
                          background: isSelected ? colors.blueLight : undefined,
                        }}
                        onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = colors.surfaceLighter }}
                        onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                        <td className="px-4 py-2.5">
                          <IssueKey value={issueKey} />
                        </td>
                        <td className="px-4 py-2.5 max-w-[240px]">
                          <span className="font-semibold text-sm truncate block" style={{ color: colors.textPrimary }}>
                            {bug.title}
                          </span>
                        </td>
                        <td className="px-4 py-2.5"><TypeBadge type={bug.issue_type ?? 'bug'} /></td>
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
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ opacity: isSelected ? 1 : undefined }}>
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
          <div className="w-[320px] flex-shrink-0 flex flex-col overflow-hidden transition-all"
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
