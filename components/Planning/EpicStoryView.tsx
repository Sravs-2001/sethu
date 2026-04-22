'use client'

import { useEffect, useMemo, useState } from 'react'
import { bugService } from '@/lib/services'
import { useStore } from '@/store/useStore'
import { Plus, ChevronDown, ChevronRight, Link2, BookOpen, Zap, Edit2, CornerDownRight } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { PRIORITIES, PRIORITY_CONFIG, STATUSES, STATUS_CONFIG, colors } from '@/lib/constants'
import type { Bug as Issue, Priority, Status } from '@/types'
import { formatDistanceToNow } from 'date-fns'

// ── Small helpers ─────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: Status }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dotColor }} />
      {cfg.label}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const cfg = PRIORITY_CONFIG[priority]
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
      style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

function Avatar({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <span
      className="rounded-full text-white font-bold flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38, background: colors.blue }}
      title={name}>
      {name[0]?.toUpperCase()}
    </span>
  )
}

// ── Create / Edit form ────────────────────────────────────────────────────────

function IssueForm({ type, initial, epics, onSave, onClose }: {
  type:     'epic' | 'story'
  initial?: Partial<Issue>
  epics:    Issue[]
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
    epic_id:     initial?.epic_id     ?? '',
  })
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({
      ...form,
      assignee_id: form.assignee_id || undefined,
      epic_id:     (!isEpic && form.epic_id) ? form.epic_id : undefined,
    })
    setSaving(false)
    onClose()
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Type badge */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold"
        style={{
          background: isEpic ? colors.purpleLight : colors.greenLight,
          color:      isEpic ? colors.purple       : colors.green,
          border:     `1px solid ${isEpic ? colors.purple : colors.green}33`,
        }}>
        <span className="text-base">{isEpic ? '⚡' : '📖'}</span>
        <span>{isEpic ? 'Epic' : 'Story'} — {initial?.id ? 'Edit' : 'New'}</span>
      </div>

      {/* Title */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: colors.textSubtle }}>
          {isEpic ? 'Epic name' : 'Story title'} *
        </label>
        <input className="input" required autoFocus value={form.title}
          placeholder={isEpic ? 'Name this epic…' : 'As a user, I want to…'}
          onChange={e => setForm({ ...form, title: e.target.value })} />
      </div>

      {/* Description */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: colors.textSubtle }}>
          {isEpic ? 'Goal / Vision' : 'Acceptance criteria'}
        </label>
        <textarea className="input resize-none" style={{ minHeight: 88 }} value={form.description}
          placeholder={isEpic
            ? 'What is the outcome or goal of this epic?'
            : 'Given… When… Then…\n\n- Criterion 1\n- Criterion 2'}
          onChange={e => setForm({ ...form, description: e.target.value })} />
      </div>

      {/* Parent epic — stories only */}
      {!isEpic && (
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: colors.textSubtle }}>
            Parent epic
          </label>
          <select className="input" value={form.epic_id}
            onChange={e => setForm({ ...form, epic_id: e.target.value })}>
            <option value="">— No epic —</option>
            {epics.map(ep => <option key={ep.id} value={ep.id}>⚡ {ep.title}</option>)}
          </select>
        </div>
      )}

      {/* Priority / Status / Owner */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: colors.textSubtle }}>Priority</label>
          <select className="input" value={form.priority}
            onChange={e => setForm({ ...form, priority: e.target.value as Priority })}>
            {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: colors.textSubtle }}>Status</label>
          <select className="input" value={form.status}
            onChange={e => setForm({ ...form, status: e.target.value as Status })}>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: colors.textSubtle }}>Owner</label>
          <select className="input" value={form.assignee_id}
            onChange={e => setForm({ ...form, assignee_id: e.target.value })}>
            <option value="">Unassigned</option>
            {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-2 pt-1" style={{ borderTop: `1px solid ${colors.border}` }}>
        <button type="submit" disabled={saving || !form.title.trim()} className="btn-primary">
          {saving ? 'Saving…' : initial?.id ? 'Save changes' : `Create ${isEpic ? 'epic' : 'story'}`}
        </button>
        <button type="button" onClick={onClose} className="btn-subtle">Cancel</button>
      </div>
    </form>
  )
}

// ── Epic card ─────────────────────────────────────────────────────────────────

function EpicCard({ epic, stories, onEdit, onEditStory, onAddStory }: {
  epic:         Issue
  stories:      Issue[]
  onEdit:       (e: Issue) => void
  onEditStory:  (s: Issue) => void
  onAddStory:   (epicId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const epicStories = stories.filter(s => s.epic_id === epic.id)
  const doneCount   = epicStories.filter(s => s.status === 'done').length

  return (
    <div className="rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-lg"
      style={{
        border:     `1.5px solid ${colors.purple}33`,
        background: colors.white,
        boxShadow:  '0 2px 8px rgba(9,30,66,0.06)',
      }}>

      {/* Purple accent strip */}
      <div className="h-1" style={{ background: `linear-gradient(90deg, ${colors.purple}, ${colors.purpleDark})` }} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
            style={{ background: colors.purpleLight }}>
            ⚡
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-bold leading-snug" style={{ color: colors.textPrimary }}>
                {epic.title}
              </h3>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <PriorityBadge priority={epic.priority} />
                <StatusPill status={epic.status} />
              </div>
            </div>
            {epic.description && (
              <p className="text-xs mt-1 line-clamp-2 leading-relaxed" style={{ color: colors.textSecondary }}>
                {epic.description}
              </p>
            )}
          </div>
        </div>

        {/* Story count */}
        {epicStories.length > 0 && (
          <div className="mb-4 px-1">
            <span className="text-[11px] font-semibold" style={{ color: colors.textFaint }}>
              {doneCount} / {epicStories.length} stories done
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {epic.assignee && <Avatar name={epic.assignee.name} size={22} />}
            {epic.assignee && (
              <span className="text-[11px] font-medium" style={{ color: colors.textSecondary }}>
                {epic.assignee.name}
              </span>
            )}
            <span className="text-[10px]" style={{ color: colors.textFaint }}>
              {formatDistanceToNow(new Date(epic.created_at), { addSuffix: true })}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => onAddStory(epic.id)}
              className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg transition-colors"
              style={{ color: colors.green, background: colors.greenLight }}>
              <Plus className="w-3 h-3" /> Story
            </button>
            <button onClick={() => onEdit(epic)}
              className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg transition-colors"
              style={{ color: colors.purple, background: colors.purpleLight }}>
              <Edit2 className="w-3 h-3" /> Edit
            </button>
            {epicStories.length > 0 && (
              <button onClick={() => setOpen(o => !o)}
                className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg transition-colors"
                style={{ color: colors.textSubtle, background: colors.surfaceLight }}>
                {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {epicStories.length}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded stories */}
      {open && epicStories.length > 0 && (
        <div className="px-5 pb-4" style={{ borderTop: `1px solid ${colors.border}` }}>
          <div className="pt-3 space-y-2">
            {epicStories.map((story, i) => (
              <div key={story.id} className="flex items-start gap-2">
                {/* Tree connector */}
                <div className="flex flex-col items-center flex-shrink-0 mt-1" style={{ width: 16 }}>
                  <div className="w-px flex-1" style={{ background: colors.border, minHeight: 8 }} />
                  <CornerDownRight className="w-3 h-3 flex-shrink-0" style={{ color: colors.border }} />
                </div>
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors hover:shadow-sm"
                  style={{
                    background: colors.surfaceLighter,
                    border: `1px solid ${colors.border}`,
                  }}
                  onClick={() => onEditStory(story)}>
                  <span className="text-xs flex-shrink-0">📖</span>
                  <p className="text-xs font-semibold flex-1 truncate" style={{ color: colors.textPrimary }}>
                    {story.title}
                  </p>
                  <StatusPill status={story.status} />
                  {story.assignee && <Avatar name={story.assignee.name} size={20} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Story row ─────────────────────────────────────────────────────────────────

function StoryRow({ story, epicTitle, onEdit }: {
  story:      Issue
  epicTitle?: string
  onEdit:     (s: Issue) => void
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="rounded-xl overflow-hidden transition-all"
      style={{
        border:     `1px solid ${colors.border}`,
        background: colors.white,
        boxShadow:  '0 1px 3px rgba(9,30,66,0.04)',
      }}>
      {/* Left green accent */}
      <div className="flex">
        <div className="w-1 flex-shrink-0 rounded-l-xl" style={{ background: colors.green }} />
        <div className="flex-1 flex items-center gap-3 px-3 py-3">
          <span className="text-sm flex-shrink-0">📖</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold" style={{ color: colors.textPrimary }}>{story.title}</p>
              <PriorityBadge priority={story.priority} />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {epicTitle && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                  style={{ background: colors.purpleLight, color: colors.purple }}>
                  ⚡ {epicTitle}
                </span>
              )}
              {story.description && !expanded && (
                <p className="text-[11px] truncate max-w-xs" style={{ color: colors.textFaint }}>
                  {story.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <StatusPill status={story.status} />
            {story.assignee && (
              <div className="flex items-center gap-1.5">
                <Avatar name={story.assignee.name} size={22} />
                <span className="text-[11px] font-medium hidden sm:block" style={{ color: colors.textSecondary }}>
                  {story.assignee.name}
                </span>
              </div>
            )}
            <button onClick={() => onEdit(story)}
              className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg"
              style={{ color: colors.green, background: colors.greenLight }}>
              <Edit2 className="w-3 h-3" /> Edit
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
      </div>

      {expanded && story.description && (
        <div className="px-4 pb-4 ml-1" style={{ borderTop: `1px solid ${colors.border}` }}>
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
  const { bugs, setBugs, addBug, updateBug, user, project, addToast, startLoading, stopLoading } = useStore()

  const [tab,          setTab]          = useState<Tab>('epics')
  const [showCreate,   setShowCreate]   = useState(false)
  const [createType,   setCreateType]   = useState<'epic' | 'story'>('epic')
  const [editing,      setEditing]      = useState<Issue | null>(null)
  const [presetEpicId, setPresetEpicId] = useState<string | undefined>()
  const [filterStatus, setFilterStatus] = useState<Status | ''>('')

  useEffect(() => {
    if (!project) return
    const pid = project.id
    bugService.getByProject(pid).then(({ data }) => data && setBugs(data as any))
    return bugService.subscribe(pid, () =>
      bugService.getByProject(pid).then(({ data }) => data && setBugs(data as any))
    )
  }, [project?.id])

  const allEpics   = useMemo(() => bugs.filter(b => b.issue_type === 'epic'), [bugs])
  const allStories = useMemo(() => bugs.filter(b => b.issue_type === 'story'), [bugs])

  const epics   = useMemo(() =>
    allEpics.filter(b => !filterStatus || b.status === filterStatus), [allEpics, filterStatus])
  const stories = useMemo(() =>
    allStories.filter(b => !filterStatus || b.status === filterStatus), [allStories, filterStatus])

  async function handleSave(data: Partial<Issue>) {
    startLoading()
    if (editing) {
      const { error } = await bugService.update(editing.id, data)
      stopLoading()
      if (error) { addToast('error', `Failed to update ${createType}.`); return }
      updateBug(editing.id, data)
      addToast('success', `${createType === 'epic' ? 'Epic' : 'Story'} updated.`)
    } else {
      if (!user || !project) { stopLoading(); return }
      const { data: created, error } = await bugService.create({
        ...data,
        issue_type: createType,
        created_by: user.id,
        project_id: project.id,
        tags: [],
      })
      stopLoading()
      if (error) { addToast('error', `Failed to create ${createType}.`); return }
      if (created) { addBug(created as any); addToast('success', `${createType === 'epic' ? 'Epic' : 'Story'} created.`) }
    }
  }

  function openCreate(type: 'epic' | 'story', epicId?: string) {
    setCreateType(type)
    setEditing(null)
    setPresetEpicId(epicId)
    setShowCreate(true)
  }

  function openEdit(issue: Issue) {
    setEditing(issue)
    setCreateType(issue.issue_type as 'epic' | 'story')
    setPresetEpicId(undefined)
    setShowCreate(true)
  }

  const epicMap = useMemo(() =>
    Object.fromEntries(allEpics.map(e => [e.id, e.title])), [allEpics])

  // Group stories by epic for the stories tab
  const storiesByEpic = useMemo(() => {
    const groups: { epicId: string | null; epicTitle: string | null; items: Issue[] }[] = []
    allEpics.forEach(ep => {
      const items = stories.filter(s => s.epic_id === ep.id)
      if (items.length > 0) groups.push({ epicId: ep.id, epicTitle: ep.title, items })
    })
    const orphans = stories.filter(s => !s.epic_id)
    if (orphans.length > 0) groups.push({ epicId: null, epicTitle: null, items: orphans })
    return groups
  }, [stories, allEpics])

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: colors.surfaceLighter }}>

      {/* Header */}
      <div className="px-6 py-4 bg-white flex-shrink-0" style={{ borderBottom: `1px solid ${colors.border}` }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold" style={{ color: colors.textPrimary }}>Planning</h1>
            <p className="text-xs mt-0.5" style={{ color: colors.textFaint }}>
              {allEpics.length} epic{allEpics.length !== 1 ? 's' : ''} · {allStories.length} stor{allStories.length !== 1 ? 'ies' : 'y'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select className="input py-1 text-xs w-36" value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}>
              <option value="">All statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
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
            { key: 'epics'   as Tab, icon: <Zap className="w-3.5 h-3.5" />,      label: 'Epics',   count: allEpics.length,   color: colors.purple },
            { key: 'stories' as Tab, icon: <BookOpen className="w-3.5 h-3.5" />, label: 'Stories', count: allStories.length, color: colors.green  },
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

        {/* ── Epics tab ── */}
        {tab === 'epics' && (
          epics.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: colors.purpleLight }}>⚡</div>
              <p className="text-sm font-semibold" style={{ color: colors.textSecondary }}>No epics yet</p>
              <p className="text-xs" style={{ color: colors.textFaint }}>Epics are large bodies of work broken into stories</p>
              <button onClick={() => openCreate('epic')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold mt-1"
                style={{ background: colors.purpleLight, color: colors.purple }}>
                <Plus className="w-3.5 h-3.5" /> Create first epic
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4" style={{ maxWidth: 860 }}>
              {epics.map(epic => (
                <EpicCard
                  key={epic.id}
                  epic={epic}
                  stories={allStories}
                  onEdit={openEdit}
                  onEditStory={openEdit}
                  onAddStory={(epicId) => openCreate('story', epicId)}
                />
              ))}
            </div>
          )
        )}

        {/* ── Stories tab ── */}
        {tab === 'stories' && (
          stories.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: colors.greenLight }}>📖</div>
              <p className="text-sm font-semibold" style={{ color: colors.textSecondary }}>No stories yet</p>
              <p className="text-xs" style={{ color: colors.textFaint }}>Stories describe user-facing requirements</p>
              <button onClick={() => openCreate('story')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold mt-1"
                style={{ background: colors.greenLight, color: colors.green }}>
                <Plus className="w-3.5 h-3.5" /> Create first story
              </button>
            </div>
          ) : (
            <div className="space-y-6" style={{ maxWidth: 860 }}>
              {storiesByEpic.map(group => (
                <div key={group.epicId ?? '__orphan__'}>
                  {/* Group header */}
                  <div className="flex items-center gap-2 mb-3">
                    {group.epicId ? (
                      <>
                        <span className="text-sm">⚡</span>
                        <span className="text-xs font-bold" style={{ color: colors.purple }}>{group.epicTitle}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                          style={{ background: colors.purpleLight, color: colors.purple }}>
                          {group.items.length}
                        </span>
                      </>
                    ) : (
                      <>
                        <Link2 className="w-3.5 h-3.5" style={{ color: colors.textSubtle }} />
                        <span className="text-xs font-bold" style={{ color: colors.textSubtle }}>No Epic</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                          style={{ background: colors.surfaceLight, color: colors.textFaint }}>
                          {group.items.length}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="space-y-2">
                    {group.items.map(story => (
                      <StoryRow
                        key={story.id}
                        story={story}
                        epicTitle={story.epic_id ? epicMap[story.epic_id] : undefined}
                        onEdit={openEdit}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Modal */}
      {showCreate && (
        <Modal
          title={editing
            ? `Edit ${createType}`
            : createType === 'epic' ? 'Create epic' : 'Create story'}
          onClose={() => { setShowCreate(false); setEditing(null); setPresetEpicId(undefined) }}
          size="lg">
          <IssueForm
            type={createType}
            epics={allEpics}
            initial={editing ?? (presetEpicId ? { epic_id: presetEpicId } : undefined)}
            onSave={handleSave}
            onClose={() => { setShowCreate(false); setEditing(null); setPresetEpicId(undefined) }}
          />
        </Modal>
      )}
    </div>
  )
}
