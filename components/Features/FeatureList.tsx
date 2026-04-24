'use client'

import { useCallback, useEffect, useState } from 'react'
import { featureService } from '@/lib/services'
import { useStore } from '@/store/useStore'
import {
  Plus, Sparkles, Trash2, X, ChevronDown, ChevronUp,
  Search, X as XIcon, Calendar, User2, Tag, Layers,
} from 'lucide-react'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { STATUSES, STATUS_CONFIG, PRIORITIES, PRIORITY_CONFIG, colors } from '@/lib/constants'
import type { Feature, Priority, Status } from '@/types'
import { formatDistanceToNow, format } from 'date-fns'
import clsx from 'clsx'

// ── Helpers ───────────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold mb-1" style={{ color: colors.textSecondary }}>
      {children}
    </label>
  )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-1.5" style={{ borderBottom: `1px solid ${colors.border}` }}>
      <span className="text-[11px] font-semibold w-20 flex-shrink-0 uppercase tracking-wide"
        style={{ color: colors.textSubtle }}>
        {label}
      </span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

// ── Feature create/edit form (modal) ──────────────────────────────────────────

function FeatureForm({ initial, onSave, onClose }: {
  initial?: Partial<Feature>
  onSave:   (data: Partial<Feature>) => Promise<boolean>
  onClose:  () => void
}) {
  const { profiles, sprints } = useStore()
  const [form, setForm] = useState({
    title:       initial?.title       ?? '',
    description: initial?.description ?? '',
    priority:    initial?.priority    ?? 'medium' as Priority,
    status:      initial?.status      ?? 'todo'   as Status,
    assignee_id: initial?.assignee_id ?? '',
    sprint_id:   initial?.sprint_id   ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    const ok = await onSave({
      ...form,
      assignee_id: form.assignee_id || undefined,
      sprint_id:   form.sprint_id   || undefined,
    })
    setSaving(false)
    if (ok) onClose()  // only close on success
  }

  return (
    <form onSubmit={submit} className="space-y-3.5">
      <div>
        <FieldLabel>Summary *</FieldLabel>
        <input className="input" value={form.title} required autoFocus
          placeholder="Feature name or user story"
          onChange={e => setForm({ ...form, title: e.target.value })} />
      </div>
      <div>
        <FieldLabel>Description</FieldLabel>
        <textarea className="input h-24 resize-none" value={form.description}
          placeholder="Acceptance criteria, mockup links…"
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

      {formError && (
        <div className="text-xs px-3 py-2 rounded"
          style={{ background: colors.redLight, color: colors.red }}>
          {formError}
        </div>
      )}

      <div className="flex gap-2 pt-2" style={{ borderTop: `1px solid ${colors.border}` }}>
        <button type="submit" className="btn-primary" disabled={saving || !form.title.trim()}>
          {saving ? 'Saving…' : initial?.id ? 'Update feature' : 'Create feature'}
        </button>
        <button type="button" onClick={onClose} className="btn-subtle">Cancel</button>
      </div>
    </form>
  )
}

// ── Feature detail side panel ─────────────────────────────────────────────────

function FeatureDetail({ feat, featKey, onClose, onSave, onDelete }: {
  feat:    Feature
  featKey: string
  onClose: () => void
  onSave:  (patch: Partial<Feature>) => Promise<void>
  onDelete:(id: string) => void
}) {
  const { profiles, sprints } = useStore()

  const [form, setForm] = useState({
    title:       feat.title,
    description: feat.description ?? '',
    priority:    feat.priority,
    status:      feat.status,
    assignee_id: feat.assignee_id ?? '',
    sprint_id:   feat.sprint_id   ?? '',
  })
  const [saving,       setSaving]       = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [descOpen,     setDescOpen]     = useState(true)

  useEffect(() => {
    setForm({
      title:       feat.title,
      description: feat.description ?? '',
      priority:    feat.priority,
      status:      feat.status,
      assignee_id: feat.assignee_id ?? '',
      sprint_id:   feat.sprint_id   ?? '',
    })
    setEditingTitle(false)
  }, [feat.id])

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

  const assignee = profiles.find(p => p.id === form.assignee_id)
  const sprint   = sprints.find(s => s.id === form.sprint_id)
  const statusCfg = STATUS_CONFIG[form.status]

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white"
      style={{ borderLeft: `1px solid ${colors.border}` }}>

      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: `1px solid ${colors.border}`, background: colors.surfaceLighter }}>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded"
          style={{ background: colors.purpleLight, color: colors.purple }}>
          ✨ Feature
        </span>
        <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded"
          style={{ background: colors.blueLight, color: colors.blue }}>
          {featKey}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {saving && (
            <span className="text-[10px] mr-1" style={{ color: colors.textLight }}>Saving…</span>
          )}
          <button
            onClick={() => onDelete(feat.id)}
            title="Delete feature"
            className="p-1.5 rounded transition-colors"
            style={{ color: colors.textFaint }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = colors.red; (e.currentTarget as HTMLElement).style.background = colors.redLight }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = colors.textFaint; (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            title="Close"
            className="p-1.5 rounded transition-colors"
            style={{ color: colors.textFaint }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = colors.surfaceLight}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">

        {/* Title */}
        <div className="px-4 pt-4 pb-2">
          {editingTitle ? (
            <textarea
              autoFocus
              rows={2}
              className="w-full resize-none text-base font-bold leading-snug outline-none rounded p-1.5 transition-all"
              style={{
                color:   colors.textPrimary,
                background: colors.surfaceLight,
                border:  `1px solid ${colors.blue}`,
              }}
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              onBlur={() => {
                setEditingTitle(false)
                if (form.title.trim() && form.title !== feat.title) save({ title: form.title.trim() })
                if (!form.title.trim()) setForm({ ...form, title: feat.title })
              }}
              onKeyDown={e => {
                if (e.key === 'Escape') { setEditingTitle(false); setForm({ ...form, title: feat.title }) }
              }}
            />
          ) : (
            <h2
              className="text-base font-bold leading-snug cursor-text rounded p-1 -m-1 transition-colors"
              style={{ color: colors.textPrimary }}
              onClick={() => setEditingTitle(true)}
              title="Click to edit title"
              onMouseEnter={e => (e.currentTarget.style.background = colors.surfaceLight)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              {form.title}
            </h2>
          )}
        </div>

        {/* Fields */}
        <div className="px-4 pb-2">

          <FieldRow label="Status">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: statusCfg.dotColor }} />
              <div className="relative">
                <select
                  value={form.status}
                  onChange={e => save({ status: e.target.value as Status })}
                  className="appearance-none text-xs pl-2 pr-6 py-0.5 rounded border cursor-pointer outline-none"
                  style={{ background: colors.surfaceLight, borderColor: colors.border, color: colors.textPrimary }}>
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                </select>
                <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: colors.textFaint }} />
              </div>
            </div>
          </FieldRow>

          <FieldRow label="Priority">
            <div className="flex items-center gap-2">
              <PriorityBadge priority={form.priority} />
              <div className="relative">
                <select
                  value={form.priority}
                  onChange={e => save({ priority: e.target.value as Priority })}
                  className="appearance-none text-xs pl-2 pr-6 py-0.5 rounded border cursor-pointer outline-none"
                  style={{ background: colors.surfaceLight, borderColor: colors.border, color: colors.textPrimary }}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>)}
                </select>
                <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: colors.textFaint }} />
              </div>
            </div>
          </FieldRow>

          <FieldRow label="Assignee">
            <div className="flex items-center gap-2">
              {assignee ? (
                <span className="w-5 h-5 rounded-full text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0"
                  style={{ background: colors.purple }}>
                  {assignee.name[0].toUpperCase()}
                </span>
              ) : (
                <User2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: colors.textPlaceholder }} />
              )}
              <div className="relative">
                <select
                  value={form.assignee_id}
                  onChange={e => save({ assignee_id: e.target.value })}
                  className="appearance-none text-xs pl-2 pr-6 py-0.5 rounded border cursor-pointer outline-none"
                  style={{ background: colors.surfaceLight, borderColor: colors.border, color: colors.textPrimary }}>
                  <option value="">Unassigned</option>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: colors.textFaint }} />
              </div>
            </div>
          </FieldRow>

          <FieldRow label="Sprint">
            <div className="relative">
              <select
                value={form.sprint_id}
                onChange={e => save({ sprint_id: e.target.value })}
                className="appearance-none text-xs pl-2 pr-6 py-0.5 rounded border cursor-pointer outline-none"
                style={{ background: colors.surfaceLight, borderColor: colors.border, color: colors.textPrimary }}>
                <option value="">No sprint</option>
                {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: colors.textFaint }} />
            </div>
          </FieldRow>

        </div>

        {/* Description */}
        <div className="px-4 py-3" style={{ borderTop: `1px solid ${colors.border}` }}>
          <button
            onClick={() => setDescOpen(o => !o)}
            className="flex items-center justify-between w-full mb-2 text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: colors.textSubtle }}>
            Description
            {descOpen
              ? <ChevronDown className="w-3.5 h-3.5" />
              : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
          {descOpen && (
            <textarea
              className="input text-xs resize-none w-full"
              style={{ minHeight: 120 }}
              value={form.description}
              placeholder="Add acceptance criteria, links to designs, or any relevant context…"
              onChange={e => setForm({ ...form, description: e.target.value })}
              onBlur={() => {
                if (form.description !== feat.description) save({ description: form.description })
              }}
            />
          )}
        </div>

        {/* Metadata */}
        <div className="px-4 py-3 space-y-1.5 text-[11px]"
          style={{ borderTop: `1px solid ${colors.border}`, color: colors.textFaint }}>
          <div>
            Created {formatDistanceToNow(new Date(feat.created_at), { addSuffix: true })}
            {' · '}{format(new Date(feat.created_at), 'MMM d, yyyy')}
          </div>
          {feat.updated_at && feat.updated_at !== feat.created_at && (
            <div>
              Last updated {formatDistanceToNow(new Date(feat.updated_at), { addSuffix: true })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FeatureList() {
  const {
    features, setFeatures, addFeature, updateFeature, deleteFeature,
    user, project, sprints, addToast, startLoading, stopLoading,
  } = useStore()

  const [showCreate,   setShowCreate]   = useState(false)
  const [selected,     setSelected]     = useState<Feature | null>(null)
  const [filterStatus, setFilterStatus] = useState<Status | ''>('')
  const [search,       setSearch]       = useState('')

  // ── Key map for feature keys ────────────────────────────────────────────────
  const keyMap: Record<string, number> = {}
  ;[...features]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .forEach((f, i) => { keyMap[f.id] = i + 1 })

  function getFeatKey(id: string) {
    return `${project?.key ?? 'PROJ'}-F${keyMap[id] ?? '?'}`
  }

  // ── Load data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!project) return
    const pid = project.id
    const refresh = () => featureService.getByProject(pid).then(({ data }) => {
      if (data) setFeatures(data as any)
    })
    refresh()
    return featureService.subscribe(pid, refresh)
  }, [project?.id])

  // ── CRUD handlers ───────────────────────────────────────────────────────────
  async function handleCreate(data: Partial<Feature>): Promise<boolean> {
    if (!user) { addToast('error', 'You must be logged in to create features.'); return false }
    if (!project) { addToast('error', 'No project selected. Please select a project first.'); return false }
    startLoading()
    const { data: feat, error } = await featureService.create({
      ...data,
      created_by: user.id,
      project_id: project.id,
    })
    stopLoading()
    if (error) {
      const msg = (error as any)?.message ?? 'Failed to create feature. Check your permissions.'
      addToast('error', msg)
      return false
    }
    if (feat) {
      addFeature(feat as any)
      addToast('success', 'Feature created.')
      return true
    }
    addToast('error', 'Feature was not created. Please try again.')
    return false
  }

  async function handleSave(patch: Partial<Feature>) {
    if (!selected) return
    const { error } = await featureService.update(selected.id, patch)
    if (error) { addToast('error', 'Failed to update feature.'); return }
    updateFeature(selected.id, patch)
    setSelected(prev => prev ? { ...prev, ...patch } : null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this feature? This cannot be undone.')) return
    startLoading()
    const { error } = await featureService.delete(id)
    stopLoading()
    if (error) { addToast('error', 'Failed to delete feature.'); return }
    deleteFeature(id)
    if (selected?.id === id) setSelected(null)
    addToast('success', 'Feature deleted.')
  }

  async function handleStatusChange(feature: Feature, status: Status) {
    const { error } = await featureService.update(feature.id, { status })
    if (error) { addToast('error', 'Failed to update status.'); return }
    updateFeature(feature.id, { status })
    if (selected?.id === feature.id) setSelected(prev => prev ? { ...prev, status } : null)
  }

  // ── Filtering ───────────────────────────────────────────────────────────────
  const filtered = features.filter(f =>
    (!filterStatus || f.status === filterStatus) &&
    (!search || f.title.toLowerCase().includes(search.toLowerCase()) ||
                f.description?.toLowerCase().includes(search.toLowerCase()))
  )

  const grouped = STATUSES.reduce((acc, s) => {
    acc[s] = filtered.filter(f => f.status === s)
    return acc
  }, {} as Record<Status, Feature[]>)

  const hasContent = features.length > 0

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: colors.surfaceLighter }}>

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-5 py-3 flex-shrink-0 flex-wrap"
        style={{ background: 'white', borderBottom: `1px solid ${colors.border}` }}>

        <div className="mr-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: colors.purple }} />
            <h1 className="text-sm font-bold" style={{ color: colors.textPrimary }}>Features</h1>
            <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
              style={{ background: colors.purpleLight, color: colors.purple }}>
              {features.length}
            </span>
          </div>
          <p className="text-[11px] mt-0.5" style={{ color: colors.textLight }}>
            {features.filter(f => f.status !== 'done').length} active · {features.filter(f => f.status === 'done').length} done
          </p>
        </div>

        {/* Search */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border"
          style={{ background: 'white', borderColor: colors.border, minWidth: 160 }}>
          <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: colors.textFaint }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search features…"
            className="bg-transparent outline-none text-xs flex-1"
            style={{ color: colors.textPrimary }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ color: colors.textFaint }}>
              <XIcon className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <select className="input w-40 py-1 text-xs" value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}>
            <option value="">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
          </select>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-3.5 h-3.5" /> Create
          </button>
        </div>
      </div>

      {/* ── Content (list + detail panel) ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Feature list ── */}
        <div className="flex-1 overflow-y-auto min-w-0" style={{ padding: '12px 16px' }}>

          {/* Empty state */}
          {!hasContent && (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4"
                style={{ background: colors.purpleLight }}>✨</div>
              <p className="text-sm font-semibold mb-1" style={{ color: colors.textSecondary }}>
                No features yet
              </p>
              <p className="text-xs mb-4" style={{ color: colors.textFaint }}>
                Features capture user-facing requirements and product ideas.
              </p>
              <button onClick={() => setShowCreate(true)} className="btn-primary text-xs">
                <Plus className="w-3.5 h-3.5" /> Create first feature
              </button>
            </div>
          )}

          {hasContent && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <p className="text-sm font-semibold mb-1" style={{ color: colors.textSecondary }}>
                No features match
              </p>
              <button
                onClick={() => { setSearch(''); setFilterStatus('') }}
                className="btn-subtle text-xs mt-2">
                Clear filters
              </button>
            </div>
          )}

          {/* Grouped list */}
          <div className="space-y-3">
            {STATUSES.map(status => {
              const items = grouped[status]
              if (!items || (items.length === 0 && (filterStatus ? filterStatus !== status : false))) return null
              if (items.length === 0 && !filterStatus && search) return null
              if (items.length === 0 && !filterStatus && !search) return null

              return (
                <div key={status} className="rounded-lg overflow-hidden"
                  style={{ border: `1px solid ${colors.border}`, background: 'white', boxShadow: '0 1px 3px rgba(9,30,66,0.07)' }}>

                  {/* Group header */}
                  <div className="px-4 py-2 flex items-center gap-3"
                    style={{ background: colors.surfaceLight, borderBottom: `1px solid ${colors.border}` }}>
                    <StatusBadge status={status} />
                    <span className="text-[11px] font-medium" style={{ color: colors.textFaint }}>
                      {items.length} {items.length === 1 ? 'feature' : 'features'}
                    </span>
                  </div>

                  {items.length === 0 ? (
                    <div className="px-4 py-3 text-xs" style={{ color: colors.textPlaceholder }}>
                      No features here.
                    </div>
                  ) : (
                    <div>
                      {items.map((feat, idx) => {
                        const isSelected = selected?.id === feat.id
                        return (
                          <div
                            key={feat.id}
                            className={clsx(
                              'px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors group',
                              idx < items.length - 1 && 'border-b'
                            )}
                            style={{
                              borderColor: colors.border,
                              background:  isSelected ? colors.blueLight : 'transparent',
                            }}
                            onClick={() => setSelected(isSelected ? null : feat)}
                            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = colors.surfaceLight }}
                            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}>

                            {/* Icon */}
                            <Sparkles className="w-3.5 h-3.5 flex-shrink-0"
                              style={{ color: isSelected ? colors.blue : colors.purple }} />

                            {/* Title & description */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate"
                                style={{ color: isSelected ? colors.blue : colors.textPrimary }}>
                                {feat.title}
                              </p>
                              {feat.description && !selected && (
                                <p className="text-xs truncate mt-0.5" style={{ color: colors.textFaint }}>
                                  {feat.description}
                                </p>
                              )}
                            </div>

                            {/* Key */}
                            <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded hidden sm:block"
                              style={{ background: colors.blueLight, color: colors.blue }}>
                              {getFeatKey(feat.id)}
                            </span>

                            {/* Priority */}
                            <PriorityBadge priority={feat.priority} />

                            {/* Assignee avatar */}
                            {feat.assignee && (
                              <span
                                className="w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0"
                                style={{ background: colors.purple }}
                                title={feat.assignee.name}>
                                {feat.assignee.name[0].toUpperCase()}
                              </span>
                            )}

                            {/* Status dropdown (quick change) */}
                            <select
                              value={feat.status}
                              onChange={e => { e.stopPropagation(); handleStatusChange(feat, e.target.value as Status) }}
                              onClick={e => e.stopPropagation()}
                              className="text-xs rounded px-1.5 py-0.5 outline-none cursor-pointer hidden sm:block"
                              style={{ background: 'white', border: `1px solid ${colors.border}`, color: colors.textMuted }}>
                              {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                            </select>

                            {/* Created time */}
                            <span className="text-xs whitespace-nowrap hidden xl:block"
                              style={{ color: colors.textPlaceholder }}>
                              {formatDistanceToNow(new Date(feat.created_at), { addSuffix: true })}
                            </span>

                            {/* Delete button (appears on hover, hidden when panel is open) */}
                            {!selected && (
                              <button
                                onClick={e => { e.stopPropagation(); handleDelete(feat.id) }}
                                className="p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                style={{ color: colors.textFaint }}
                                title="Delete"
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = colors.red; (e.currentTarget as HTMLElement).style.background = colors.redLight }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = colors.textFaint; (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Feature detail panel ── */}
        {selected && (
          <div style={{ width: 420, flexShrink: 0 }} className="h-full overflow-hidden">
            <FeatureDetail
              feat={selected}
              featKey={getFeatKey(selected.id)}
              onClose={() => setSelected(null)}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          </div>
        )}
      </div>

      {/* ── Create modal ── */}
      {showCreate && (
        <Modal title="Create feature" onClose={() => setShowCreate(false)} size="lg">
          <FeatureForm onSave={handleCreate} onClose={() => setShowCreate(false)} />
        </Modal>
      )}
    </div>
  )
}
