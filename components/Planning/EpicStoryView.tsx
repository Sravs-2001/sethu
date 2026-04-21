'use client'

import { useEffect, useMemo, useState } from 'react'
import { bugService } from '@/lib/services'
import { useStore } from '@/store/useStore'
import { Plus, ChevronDown, ChevronRight, X, BookOpen, Zap } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import {
  PRIORITIES, PRIORITY_CONFIG, STATUSES, STATUS_CONFIG,
  ISSUE_TYPE_CONFIG, colors,
} from '@/lib/constants'
import type { Bug as Issue, Priority, Status } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: Status }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: cfg.bg, color: cfg.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dotColor }} />
      {cfg.label}
    </span>
  )
}

function PriorityDot({ priority }: { priority: Priority }) {
  const cfg = PRIORITY_CONFIG[priority]
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded"
      style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

function Avatar({ name, size = 6 }: { name: string; size?: number }) {
  return (
    <span className={`w-${size} h-${size} rounded-full text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0`}
      style={{ background: colors.blue, width: `${size * 4}px`, height: `${size * 4}px`, fontSize: 9 }}
      title={name}>
      {name[0]?.toUpperCase()}
    </span>
  )
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: colors.border }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: colors.green }} />
      </div>
      <span className="text-[10px] font-semibold tabular-nums" style={{ color: colors.textFaint }}>{pct}%</span>
    </div>
  )
}

// ── Create / Edit form ────────────────────────────────────────────────────────

function IssueForm({ type, initial, onSave, onClose }: {
  type:     'epic' | 'story'
  initial?: Partial<Issue>
  onSave:   (data: Partial<Issue>) => Promise<void>
  onClose:  () => void
}) {
  const { profiles } = useStore()
  const isEpic = type === 'epic'
  const [form, setForm] = useState({
    title:       initial?.title       ?? '',
    description: initial?.description ?? '',
    priority:    initial?.priority    ?? 'medium' as Priority,
    status:      initial?.status      ?? 'todo'   as Status,
    assignee_id: initial?.assignee_id ?? '',
  })
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({ ...form, assignee_id: form.assignee_id || undefined })
    setSaving(false)
    onClose()
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold"
        style={{
          background: isEpic ? colors.purpleLight : colors.greenLight,
          color:      isEpic ? colors.purple       : colors.green,
        }}>
        <span>{isEpic ? '⚡' : '📖'}</span>
        {isEpic ? 'Creating an Epic' : 'Creating a Story'}
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: colors.textSubtle }}>
          {isEpic ? 'Epic name' : 'User story'} *
        </label>
        <input className="input" required autoFocus value={form.title}
          placeholder={isEpic ? 'Name this epic…' : 'As a user, I want to…'}
          onChange={e => setForm({ ...form, title: e.target.value })} />
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: colors.textSubtle }}>
          {isEpic ? 'Goal / Vision' : 'Acceptance criteria'}
        </label>
        <textarea className="input resize-none" style={{ minHeight: 96 }} value={form.description}
          placeholder={isEpic
            ? 'What is the outcome or goal of this epic?'
            : 'Given… When… Then…\n\n- Criterion 1\n- Criterion 2'}
          onChange={e => setForm({ ...form, description: e.target.value })} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: colors.textSubtle }}>Priority</label>
          <select className="input" value={form.priority}
            onChange={e => setForm({ ...form, priority: e.target.value as Priority })}>
            {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: colors.textSubtle }}>Status</label>
          <select className="input" value={form.status}
            onChange={e => setForm({ ...form, status: e.target.value as Status })}>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: colors.textSubtle }}>Owner</label>
          <select className="input" value={form.assignee_id}
            onChange={e => setForm({ ...form, assignee_id: e.target.value })}>
            <option value="">Unassigned</option>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-2 pt-2" style={{ borderTop: `1px solid ${colors.border}` }}>
        <button type="submit" disabled={saving || !form.title.trim()}
          className="btn-primary">
          {saving ? 'Saving…' : initial?.id ? 'Update' : `Create ${isEpic ? 'epic' : 'story'}`}
        </button>
        <button type="button" onClick={onClose} className="btn-subtle">Cancel</button>
      </div>
    </form>
  )
}

// ── Epic card ─────────────────────────────────────────────────────────────────

function EpicCard({ epic, stories, onEdit }: {
  epic:    Issue
  stories: Issue[]
  onEdit:  (e: Issue) => void
}) {
  const [open, setOpen] = useState(false)
  const doneStories = stories.filter(s => s.status === 'done').length

  return (
    <div className="rounded-xl overflow-hidden transition-shadow hover:shadow-md"
      style={{ border: `1.5px solid ${colors.purple}22`, background: colors.white, boxShadow: '0 1px 4px rgba(9,30,66,0.06)' }}>

      {/* Epic header strip */}
      <div className="h-1" style={{ background: `linear-gradient(90deg, ${colors.purple}, ${colors.purpleDark})` }} />

      <div className="p-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-base flex-shrink-0">⚡</span>
            <h3 className="text-sm font-bold truncate" style={{ color: colors.textPrimary }}>{epic.title}</h3>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <PriorityDot priority={epic.priority} />
            <StatusPill status={epic.status} />
          </div>
        </div>

        {/* Description */}
        {epic.description && (
          <p className="text-xs leading-relaxed mb-3 line-clamp-2"
            style={{ color: colors.textSecondary }}>
            {epic.description}
          </p>
        )}

        {/* Stories progress */}
        {stories.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: colors.textSubtle }}>
                Stories
              </span>
              <span className="text-[10px] font-semibold" style={{ color: colors.textFaint }}>
                {doneStories}/{stories.length}
              </span>
            </div>
            <ProgressBar done={doneStories} total={stories.length} />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {epic.assignee && <Avatar name={epic.assignee.name} />}
            <span className="text-[11px]" style={{ color: colors.textFaint }}>
              {formatDistanceToNow(new Date(epic.created_at), { addSuffix: true })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onEdit(epic)}
              className="text-[10px] font-semibold px-2 py-1 rounded transition-colors"
              style={{ color: colors.purple, background: colors.purpleLight }}>
              Edit
            </button>
            {stories.length > 0 && (
              <button onClick={() => setOpen(o => !o)}
                className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded transition-colors"
                style={{ color: colors.textSubtle, background: colors.surfaceLight }}>
                {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {stories.length} {stories.length === 1 ? 'story' : 'stories'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stories list (expandable) */}
      {open && stories.length > 0 && (
        <div className="px-4 pb-4 space-y-2" style={{ borderTop: `1px solid ${colors.border}` }}>
          <div className="pt-3" />
          {stories.map(story => (
            <div key={story.id} className="flex items-center gap-3 px-3 py-2 rounded-lg"
              style={{ background: colors.surfaceLighter, border: `1px solid ${colors.border}` }}>
              <span className="text-sm flex-shrink-0">📖</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: colors.textPrimary }}>{story.title}</p>
                {story.description && (
                  <p className="text-[10px] truncate mt-0.5" style={{ color: colors.textFaint }}>{story.description}</p>
                )}
              </div>
              <StatusPill status={story.status} />
              {story.assignee && <Avatar name={story.assignee.name} size={5} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Story row ─────────────────────────────────────────────────────────────────

function StoryRow({ story, onEdit }: { story: Issue; onEdit: (s: Issue) => void }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="rounded-xl overflow-hidden"
      style={{ border: `1px solid ${colors.border}`, background: colors.white }}>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-base flex-shrink-0">📖</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold" style={{ color: colors.textPrimary }}>{story.title}</p>
            <PriorityDot priority={story.priority} />
          </div>
          {story.description && !expanded && (
            <p className="text-[11px] mt-0.5 line-clamp-1" style={{ color: colors.textFaint }}>{story.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusPill status={story.status} />
          {story.assignee && <Avatar name={story.assignee.name} />}
          <button onClick={() => onEdit(story)}
            className="text-[10px] font-semibold px-2 py-1 rounded"
            style={{ color: colors.green, background: colors.greenLight }}>
            Edit
          </button>
          {story.description && (
            <button onClick={() => setExpanded(o => !o)}
              className="p-1 rounded transition-colors"
              style={{ color: colors.textFaint }}>
              {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {expanded && story.description && (
        <div className="px-4 pb-4" style={{ borderTop: `1px solid ${colors.border}` }}>
          <p className="text-[11px] font-semibold uppercase tracking-wide mt-3 mb-1.5" style={{ color: colors.textSubtle }}>
            Acceptance criteria
          </p>
          <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans"
            style={{ color: colors.textSecondary }}>
            {story.description}
          </pre>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

type Tab = 'epics' | 'stories'

export default function EpicStoryView() {
  const { bugs, setBugs, addBug, updateBug, user, project } = useStore()

  const [tab,        setTab]        = useState<Tab>('epics')
  const [showCreate, setShowCreate] = useState(false)
  const [createType, setCreateType] = useState<'epic' | 'story'>('epic')
  const [editing,    setEditing]    = useState<Issue | null>(null)
  const [filterStatus, setFilterStatus] = useState<Status | ''>('')

  useEffect(() => {
    if (!project) return
    const pid = project.id
    bugService.getByProject(pid).then(({ data }) => data && setBugs(data as any))
    return bugService.subscribe(pid, () =>
      bugService.getByProject(pid).then(({ data }) => data && setBugs(data as any))
    )
  }, [project?.id])

  const epics   = useMemo(() => bugs.filter(b => b.issue_type === 'epic'
    && (!filterStatus || b.status === filterStatus)), [bugs, filterStatus])

  const stories = useMemo(() => bugs.filter(b => b.issue_type === 'story'
    && (!filterStatus || b.status === filterStatus)), [bugs, filterStatus])

  const allStories = useMemo(() => bugs.filter(b => b.issue_type === 'story'), [bugs])

  async function handleSave(data: Partial<Issue>) {
    if (editing) {
      await bugService.update(editing.id, data)
      updateBug(editing.id, data)
    } else {
      if (!user || !project) return
      const { data: created } = await bugService.create({
        ...data,
        issue_type: createType,
        created_by: user.id,
        project_id: project.id,
        tags: [],
      })
      if (created) addBug(created as any)
    }
  }

  function openCreate(type: 'epic' | 'story') {
    setCreateType(type); setEditing(null); setShowCreate(true)
  }

  const statusCounts = useMemo(() => {
    const list = tab === 'epics' ? bugs.filter(b => b.issue_type === 'epic') : allStories
    return STATUSES.reduce((acc, s) => {
      acc[s] = list.filter(b => b.status === s).length
      return acc
    }, {} as Record<Status, number>)
  }, [bugs, tab, allStories])

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: colors.surfaceLighter }}>

      {/* Header */}
      <div className="px-6 py-4 bg-white flex-shrink-0" style={{ borderBottom: `1px solid ${colors.border}` }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold" style={{ color: colors.textPrimary }}>Planning</h1>
            <p className="text-xs mt-0.5" style={{ color: colors.textFaint }}>
              {epics.length} epic{epics.length !== 1 ? 's' : ''} · {allStories.length} stor{allStories.length !== 1 ? 'ies' : 'y'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select className="input py-1 text-xs w-32" value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}>
              <option value="">All statuses</option>
              {STATUSES.map(s => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label} ({statusCounts[s]})</option>
              ))}
            </select>
            <button onClick={() => openCreate('story')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
              style={{ background: colors.greenLight, color: colors.green, borderColor: colors.green + '44' }}>
              <Plus className="w-3 h-3" /> Story
            </button>
            <button onClick={() => openCreate('epic')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
              style={{ background: colors.purpleLight, color: colors.purple, borderColor: colors.purple + '44' }}>
              <Plus className="w-3 h-3" /> Epic
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-4">
          {([
            { key: 'epics' as Tab,   icon: <Zap className="w-3.5 h-3.5" />,      label: 'Epics',   count: epics.length,   color: colors.purple },
            { key: 'stories' as Tab, icon: <BookOpen className="w-3.5 h-3.5" />, label: 'Stories', count: stories.length, color: colors.green  },
          ]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
              style={tab === t.key
                ? { background: t.color + '18', color: t.color, boxShadow: `inset 0 0 0 1.5px ${t.color}44` }
                : { color: colors.textMuted }}>
              {t.icon}
              {t.label}
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                style={{
                  background: tab === t.key ? t.color + '22' : colors.surfaceLight,
                  color:      tab === t.key ? t.color         : colors.textFaint,
                }}>
                {t.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* Epics tab */}
        {tab === 'epics' && (
          <>
            {epics.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <span className="text-5xl opacity-20">⚡</span>
                <p className="text-sm font-medium" style={{ color: colors.textPlaceholder }}>No epics yet</p>
                <button onClick={() => openCreate('epic')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold"
                  style={{ background: colors.purpleLight, color: colors.purple }}>
                  <Plus className="w-3.5 h-3.5" /> Create first epic
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4" style={{ maxWidth: 900 }}>
                {epics.map(epic => (
                  <EpicCard
                    key={epic.id}
                    epic={epic}
                    stories={allStories}
                    onEdit={e => { setEditing(e); setCreateType('epic'); setShowCreate(true) }}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Stories tab */}
        {tab === 'stories' && (
          <>
            {stories.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <span className="text-5xl opacity-20">📖</span>
                <p className="text-sm font-medium" style={{ color: colors.textPlaceholder }}>No stories yet</p>
                <button onClick={() => openCreate('story')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold"
                  style={{ background: colors.greenLight, color: colors.green }}>
                  <Plus className="w-3.5 h-3.5" /> Create first story
                </button>
              </div>
            ) : (
              <div className="space-y-3" style={{ maxWidth: 900 }}>
                {/* Group by status */}
                {STATUSES.map(status => {
                  const group = stories.filter(s => s.status === status)
                  if (group.length === 0) return null
                  const cfg = STATUS_CONFIG[status]
                  return (
                    <div key={status}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: cfg.dotColor }} />
                        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: cfg.color }}>
                          {cfg.label}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                          style={{ background: cfg.bg, color: cfg.color }}>
                          {group.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {group.map(story => (
                          <StoryRow
                            key={story.id}
                            story={story}
                            onEdit={s => { setEditing(s); setCreateType('story'); setShowCreate(true) }}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {showCreate && (
        <Modal
          title={editing
            ? `Edit ${createType}`
            : createType === 'epic' ? 'Create epic' : 'Create story'}
          onClose={() => { setShowCreate(false); setEditing(null) }}
          size="lg">
          <IssueForm
            type={createType}
            initial={editing ?? undefined}
            onSave={handleSave}
            onClose={() => { setShowCreate(false); setEditing(null) }}
          />
        </Modal>
      )}
    </div>
  )
}
