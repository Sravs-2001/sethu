'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import { Plus, Sparkles, Trash2, Pencil } from 'lucide-react'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { STATUSES, STATUS_CONFIG, PRIORITIES, PRIORITY_CONFIG, colors } from '@/lib/constants'
import type { Feature, Priority, Status } from '@/types'
import { formatDistanceToNow } from 'date-fns'
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

// ── Feature form ──────────────────────────────────────────────────────────────

function FeatureForm({ initial, onSave, onClose }: {
  initial?: Partial<Feature>
  onSave:   (data: Partial<Feature>) => Promise<void>
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
    <form onSubmit={submit} className="space-y-3.5">
      <div>
        <FieldLabel>Summary *</FieldLabel>
        <input className="input" value={form.title} required
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
            {PRIORITIES.map(p => (
              <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
            ))}
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
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : initial?.id ? 'Update' : 'Create feature'}
        </button>
        <button type="button" onClick={onClose} className="btn-subtle">Cancel</button>
      </div>
    </form>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FeatureList() {
  const { features, setFeatures, addFeature, updateFeature, deleteFeature, user, project } = useStore()
  const [showCreate,    setShowCreate]    = useState(false)
  const [editing,       setEditing]       = useState<Feature | null>(null)
  const [filterStatus,  setFilterStatus]  = useState<Status | ''>('')

  useEffect(() => {
    if (!project) return
    const pid = project.id

    supabase.from('features').select('*, assignee:profiles(*)')
      .eq('project_id', pid).order('created_at', { ascending: false })
      .then(({ data }) => data && setFeatures(data as any))

    const channel = supabase.channel(`features-realtime-${pid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'features' }, () => {
        supabase.from('features').select('*, assignee:profiles(*)')
          .eq('project_id', pid).order('created_at', { ascending: false })
          .then(({ data }) => data && setFeatures(data as any))
      }).subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [project?.id])

  async function handleCreate(data: Partial<Feature>) {
    if (!user || !project) return
    const { data: feat } = await supabase.from('features')
      .insert({ ...data, created_by: user.id, project_id: project.id })
      .select('*, assignee:profiles(*)').single()
    if (feat) addFeature(feat as any)
  }

  async function handleUpdate(data: Partial<Feature>) {
    if (!editing) return
    await supabase.from('features').update(data).eq('id', editing.id)
    updateFeature(editing.id, data)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this feature?')) return
    await supabase.from('features').delete().eq('id', id)
    deleteFeature(id)
  }

  async function handleStatusChange(feature: Feature, status: Status) {
    await supabase.from('features').update({ status }).eq('id', feature.id)
    updateFeature(feature.id, { status })
  }

  const filtered = features.filter(f => !filterStatus || f.status === filterStatus)
  const grouped  = STATUSES.reduce((acc, s) => {
    acc[s] = filtered.filter(f => f.status === s)
    return acc
  }, {} as Record<Status, Feature[]>)

  return (
    <div className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3" style={{ borderBottom: `1px solid ${colors.border}` }}>
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: colors.purple }} />
            <h1 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>Features</h1>
          </div>
          <p className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
            {features.length} total · {features.filter(f => f.status !== 'done').length} active
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <select className="input w-40 py-1" value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}>
            <option value="">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
          </select>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-3.5 h-3.5" /> Create
          </button>
        </div>
      </div>

      {/* Grouped list */}
      <div className="space-y-3">
        {STATUSES.map(status => {
          const items = grouped[status]
          if (items.length === 0 && filterStatus && filterStatus !== status) return null
          return (
            <div key={status} className="bg-white rounded overflow-hidden"
              style={{ border: `1px solid ${colors.border}`, boxShadow: '0 1px 2px rgba(9,30,66,0.08)' }}>
              {/* Group header */}
              <div className="px-4 py-2.5 flex items-center gap-3"
                style={{ background: colors.surfaceLight, borderBottom: `1px solid ${colors.border}` }}>
                <StatusBadge status={status} />
                <span className="text-xs" style={{ color: colors.textFaint }}>
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {items.length === 0 ? (
                <div className="px-4 py-3 text-xs" style={{ color: colors.textPlaceholder }}>
                  No features here.
                </div>
              ) : (
                <div>
                  {items.map((feat, idx) => (
                    <div key={feat.id}
                      className={clsx(
                        'px-4 py-2.5 flex items-center gap-3 transition-colors group',
                        idx < items.length - 1 && 'border-b'
                      )}
                      style={{ borderColor: colors.surfaceLight }}
                      onMouseEnter={e => (e.currentTarget.style.background = colors.surfaceLight)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <Sparkles className="w-3.5 h-3.5 flex-shrink-0" style={{ color: colors.purple }} />

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: colors.textPrimary }}>
                          {feat.title}
                        </p>
                        {feat.description && (
                          <p className="text-xs truncate mt-0.5" style={{ color: colors.textFaint }}>
                            {feat.description}
                          </p>
                        )}
                      </div>

                      <PriorityBadge priority={feat.priority} />

                      {feat.assignee && (
                        <span className="w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0"
                          style={{ background: colors.purple }}
                          title={feat.assignee.name}>
                          {feat.assignee.name[0].toUpperCase()}
                        </span>
                      )}

                      <select value={feat.status}
                        onChange={e => handleStatusChange(feat, e.target.value as Status)}
                        className="text-xs rounded-sm px-1.5 py-0.5 bg-white focus:outline-none"
                        style={{ border: `1px solid ${colors.border}`, color: colors.textMuted }}>
                        {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                      </select>

                      <span className="text-xs whitespace-nowrap hidden xl:block" style={{ color: colors.textPlaceholder }}>
                        {formatDistanceToNow(new Date(feat.created_at), { addSuffix: true })}
                      </span>

                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditing(feat)}
                          className="p-1.5 rounded transition-colors"
                          style={{ color: colors.textFaint }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = colors.purple; (e.currentTarget as HTMLElement).style.background = colors.purpleLight }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = colors.textFaint; (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(feat.id)}
                          className="p-1.5 rounded transition-colors"
                          style={{ color: colors.textFaint }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = colors.red; (e.currentTarget as HTMLElement).style.background = colors.redLight }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = colors.textFaint; (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showCreate && (
        <Modal title="Create feature" onClose={() => setShowCreate(false)} size="lg">
          <FeatureForm onSave={handleCreate} onClose={() => setShowCreate(false)} />
        </Modal>
      )}
      {editing && (
        <Modal title="Edit feature" onClose={() => setEditing(null)} size="lg">
          <FeatureForm initial={editing} onSave={handleUpdate} onClose={() => setEditing(null)} />
        </Modal>
      )}
    </div>
  )
}
