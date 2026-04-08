'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import { Plus, Sparkles, Trash2, Pencil } from 'lucide-react'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import type { Feature, Priority, Status } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

const STATUSES: Status[] = ['todo', 'in_progress', 'review', 'done']
const STATUS_LABELS: Record<Status, string> = {
  todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done'
}

function FeatureForm({ initial, onSave, onClose }: {
  initial?: Partial<Feature>
  onSave: (data: Partial<Feature>) => Promise<void>
  onClose: () => void
}) {
  const { profiles, sprints } = useStore()
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    priority: initial?.priority ?? 'medium' as Priority,
    status: initial?.status ?? 'todo' as Status,
    assignee_id: initial?.assignee_id ?? '',
    sprint_id: initial?.sprint_id ?? '',
  })
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({ ...form, assignee_id: form.assignee_id || undefined, sprint_id: form.sprint_id || undefined })
    setSaving(false)
    onClose()
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
        <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Feature name or user story" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea className="input h-24 resize-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Acceptance criteria, mockup links..." />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}>
            {(['critical', 'high', 'medium', 'low'] as Priority[]).map((p) => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })}>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
          <select className="input" value={form.assignee_id} onChange={(e) => setForm({ ...form, assignee_id: e.target.value })}>
            <option value="">Unassigned</option>
            {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sprint</label>
          <select className="input" value={form.sprint_id} onChange={(e) => setForm({ ...form, sprint_id: e.target.value })}>
            <option value="">No sprint</option>
            {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving...' : initial?.id ? 'Update Feature' : 'Create Feature'}
        </button>
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
      </div>
    </form>
  )
}

export default function FeatureList() {
  const { features, setFeatures, addFeature, updateFeature, deleteFeature, user } = useStore()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Feature | null>(null)
  const [filterStatus, setFilterStatus] = useState<Status | ''>('')

  useEffect(() => {
    supabase.from('features').select('*, assignee:profiles(*)').order('created_at', { ascending: false })
      .then(({ data }) => data && setFeatures(data as any))
    const channel = supabase.channel('features-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'features' }, () => {
        supabase.from('features').select('*, assignee:profiles(*)').order('created_at', { ascending: false })
          .then(({ data }) => data && setFeatures(data as any))
      }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function handleCreate(data: Partial<Feature>) {
    if (!user) return
    const { data: feat } = await supabase.from('features').insert({ ...data, created_by: user.id }).select('*, assignee:profiles(*)').single()
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

  const filtered = features.filter((f) => !filterStatus || f.status === filterStatus)
  const grouped = STATUSES.reduce((acc, s) => { acc[s] = filtered.filter(f => f.status === s); return acc }, {} as Record<Status, Feature[]>)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" /> Features
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{features.length} total · {features.filter(f => f.status !== 'done').length} active</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <select className="input w-40 py-1.5" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> New Feature
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {STATUSES.map((status) => {
          const items = grouped[status]
          if (items.length === 0 && filterStatus && filterStatus !== status) return null
          return (
            <div key={status} className="card overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
                <StatusBadge status={status} />
                <span className="text-xs text-gray-400 font-medium">{items.length} items</span>
              </div>
              {items.length === 0 ? (
                <div className="px-5 py-4 text-sm text-gray-400">No features here.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {items.map((feat) => (
                    <div key={feat.id} className="px-5 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors group">
                      <Sparkles className="w-4 h-4 text-violet-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{feat.title}</p>
                        {feat.description && <p className="text-xs text-gray-400 truncate mt-0.5">{feat.description}</p>}
                      </div>
                      <PriorityBadge priority={feat.priority} />
                      {feat.assignee && (
                        <span className="w-6 h-6 rounded-full bg-violet-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0" title={feat.assignee.name}>
                          {feat.assignee.name[0].toUpperCase()}
                        </span>
                      )}
                      <select value={feat.status} onChange={(e) => handleStatusChange(feat, e.target.value as Status)}
                        className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-600">
                        {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                      </select>
                      <span className="text-xs text-gray-400 whitespace-nowrap hidden xl:block">
                        {formatDistanceToNow(new Date(feat.created_at), { addSuffix: true })}
                      </span>
                      <div className={clsx('flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity')}>
                        <button onClick={() => setEditing(feat)} className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(feat.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
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
        <Modal title="Create Feature" onClose={() => setShowCreate(false)} size="lg">
          <FeatureForm onSave={handleCreate} onClose={() => setShowCreate(false)} />
        </Modal>
      )}
      {editing && (
        <Modal title="Edit Feature" onClose={() => setEditing(null)} size="lg">
          <FeatureForm initial={editing} onSave={handleUpdate} onClose={() => setEditing(null)} />
        </Modal>
      )}
    </div>
  )
}
