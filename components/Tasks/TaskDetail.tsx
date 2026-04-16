'use client'

import { useEffect, useRef, useState } from 'react'
import {
  X, Trash2, ExternalLink, MessageSquare, Clock,
  ChevronDown, Calendar, Tag, User2, Flag, Layers,
  Send, Loader2,
} from 'lucide-react'
import { commentService, bugService } from '@/lib/services'
import { useStore } from '@/store/useStore'
import {
  STATUSES, STATUS_CONFIG, PRIORITIES, PRIORITY_CONFIG,
  ISSUE_TYPES, ISSUE_TYPE_CONFIG,
} from '@/lib/constants'
import { PriorityBadge } from '@/components/ui/Badge'
import { formatDistanceToNow, format, isPast } from 'date-fns'
import type { Bug as Task, Priority, Status, IssueType, Comment, ActivityLog } from '@/types'

// ── Props ──────────────────────────────────────────────────────────────────────

interface TaskDetailProps {
  task:     Task
  issueKey: string
  onClose:  () => void
  onSave:   (data: Partial<Task>) => Promise<void>
  onDelete: (id: string) => void
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <span style={{ color: 'var(--t4)' }}>{icon}</span>
      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--t3)' }}>
        {label}
      </span>
    </div>
  )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
      <span className="text-[11px] font-semibold w-24 flex-shrink-0 mt-1" style={{ color: 'var(--t4)' }}>
        {label}
      </span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

function InlineSelect<T extends string>({
  value, options, onChange,
}: {
  value:    T
  options:  { value: T; label: string; color?: string; bg?: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="relative inline-block">
      <select
        value={value}
        onChange={e => onChange(e.target.value as T)}
        className="appearance-none pl-2 pr-6 py-0.5 text-xs font-semibold rounded border cursor-pointer outline-none transition-all focus:ring-2"
        style={{
          background:  'var(--bg-raised)',
          border:      '1px solid var(--border)',
          color:       'var(--t1)',
          paddingRight: '1.25rem',
        }}>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: 'var(--t4)' }} />
    </div>
  )
}

// ── Activity item ─────────────────────────────────────────────────────────────

function ActivityItem({ log }: { log: ActivityLog }) {
  const verb: Record<ActivityLog['action'], string> = {
    created:          'created this issue',
    status_changed:   `changed status: ${log.from} → ${log.to}`,
    priority_changed: `changed priority: ${log.from} → ${log.to}`,
    assigned:         `assigned to ${log.to ?? 'nobody'}`,
    commented:        'added a comment',
    type_changed:     `changed type: ${log.from} → ${log.to}`,
    due_date_set:     `set due date to ${log.to ?? 'none'}`,
    sprint_changed:   `moved to sprint ${log.to ?? 'backlog'}`,
  }

  return (
    <div className="flex gap-2.5 py-2">
      <div className="w-6 h-6 rounded-full text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: 'var(--t3)' }}>
        {log.user?.name?.[0]?.toUpperCase() ?? '?'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs leading-snug" style={{ color: 'var(--t2)' }}>
          <span className="font-semibold" style={{ color: 'var(--t1)' }}>{log.user?.name ?? 'Someone'}</span>
          {' '}{verb[log.action] ?? log.action}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--t5)' }}>
          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  )
}

// ── Comment item ──────────────────────────────────────────────────────────────

function CommentItem({
  comment, currentUserId, onDelete,
}: {
  comment:       Comment
  currentUserId: string | undefined
  onDelete:      (id: string) => void
}) {
  const isOwn = comment.user_id === currentUserId

  return (
    <div className="flex gap-2.5 py-2 group">
      <div className="w-6 h-6 rounded-full text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: 'var(--blue)' }}>
        {comment.user?.name?.[0]?.toUpperCase() ?? '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold" style={{ color: 'var(--t1)' }}>
            {comment.user?.name ?? 'Unknown'}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--t5)' }}>
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
          {isOwn && (
            <button
              onClick={() => onDelete(comment.id)}
              className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
              title="Delete comment">
              <X className="w-3 h-3" style={{ color: 'var(--red)' }} />
            </button>
          )}
        </div>
        <p className="text-xs mt-0.5 leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--t2)' }}>
          {comment.content}
        </p>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TaskDetail({ task, issueKey, onClose, onSave, onDelete }: TaskDetailProps) {
  const { user, profiles, sprints, comments, setComments, addComment, deleteComment } = useStore()

  // ── Local editable state ────────────────────────────────────────────────────
  const [title,      setTitle]      = useState(task.title)
  const [desc,       setDesc]       = useState(task.description)
  const [status,     setStatus]     = useState<Status>(task.status)
  const [priority,   setPriority]   = useState<Priority>(task.priority)
  const [issueType,  setIssueType]  = useState<IssueType>(task.issue_type ?? 'task')
  const [assigneeId, setAssigneeId] = useState(task.assignee_id ?? '')
  const [dueDate,    setDueDate]    = useState(task.due_date ?? '')
  const [labels,     setLabels]     = useState<string[]>(task.labels ?? [])
  const [labelInput, setLabelInput] = useState('')
  const [sprintId,   setSprintId]   = useState(task.sprint_id ?? '')

  // ── Comments & activity ─────────────────────────────────────────────────────
  const [activity,     setActivity]     = useState<ActivityLog[]>([])
  const [commentText,  setCommentText]  = useState('')
  const [posting,      setPosting]      = useState(false)
  const [loadingComments, setLoadingComments] = useState(true)
  const [activeTab,    setActiveTab]    = useState<'comments' | 'activity'>('comments')
  const commentsEndRef = useRef<HTMLDivElement>(null)

  const taskComments = comments[task.id] ?? []
  const isOverdue    = dueDate && isPast(new Date(dueDate)) && status !== 'done'

  // ── Sync from parent when task changes ────────────────────────────────────
  useEffect(() => {
    setTitle(task.title)
    setDesc(task.description)
    setStatus(task.status)
    setPriority(task.priority)
    setIssueType(task.issue_type ?? 'task')
    setAssigneeId(task.assignee_id ?? '')
    setDueDate(task.due_date ?? '')
    setLabels(task.labels ?? [])
    setSprintId(task.sprint_id ?? '')
  }, [task.id])

  // ── Load comments & activity ──────────────────────────────────────────────
  useEffect(() => {
    setLoadingComments(true)
    Promise.all([
      commentService.getByTask(task.id).then(({ data }) => {
        if (data) setComments(task.id, data as Comment[])
      }),
      commentService.getActivity(task.id).then(({ data }) => {
        if (data) setActivity(data as ActivityLog[])
      }),
    ]).finally(() => setLoadingComments(false))
  }, [task.id])

  // ── Scroll to bottom when new comment ────────────────────────────────────
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [taskComments.length])

  // ── Save helpers (save on change for select fields) ──────────────────────
  async function saveField(data: Partial<Task>) {
    await onSave(data)
  }

  function handleStatusChange(s: Status) {
    setStatus(s)
    saveField({ status: s })
  }
  function handlePriorityChange(p: Priority) {
    setPriority(p)
    saveField({ priority: p })
  }
  function handleTypeChange(t: IssueType) {
    setIssueType(t)
    saveField({ issue_type: t })
  }
  function handleAssigneeChange(id: string) {
    setAssigneeId(id)
    saveField({ assignee_id: id || undefined })
  }
  function handleSprintChange(id: string) {
    setSprintId(id)
    saveField({ sprint_id: id || undefined })
  }

  // ── Save title/desc on blur ───────────────────────────────────────────────
  function handleTitleBlur() {
    const t = title.trim()
    if (t && t !== task.title) saveField({ title: t })
    if (!t) setTitle(task.title)
  }
  function handleDescBlur() {
    if (desc !== task.description) saveField({ description: desc })
  }
  function handleDueDateChange(d: string) {
    setDueDate(d)
    saveField({ due_date: d || undefined })
  }

  // ── Labels ────────────────────────────────────────────────────────────────
  function addLabel() {
    const l = labelInput.trim().toLowerCase()
    if (!l || labels.includes(l)) { setLabelInput(''); return }
    const next = [...labels, l]
    setLabels(next)
    setLabelInput('')
    saveField({ labels: next })
  }
  function removeLabel(l: string) {
    const next = labels.filter(x => x !== l)
    setLabels(next)
    saveField({ labels: next })
  }

  // ── Comments ──────────────────────────────────────────────────────────────
  async function postComment() {
    if (!commentText.trim() || !user) return
    setPosting(true)
    const { data } = await commentService.create(task.id, user.id, commentText.trim())
    if (data) {
      addComment(data as Comment)
      setCommentText('')
    }
    setPosting(false)
  }

  async function handleDeleteComment(commentId: string) {
    await commentService.delete(commentId)
    deleteComment(task.id, commentId)
  }

  const typeCfg   = ISSUE_TYPE_CONFIG[issueType]
  const statusCfg = STATUS_CONFIG[status]

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full text-sm" style={{ background: 'var(--bg-card)' }}>

      {/* ── Header ── */}
      <div className="flex items-start justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}>

        <div className="flex items-center gap-2 min-w-0">
          {/* Type badge */}
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
            style={{ color: typeCfg.color, background: typeCfg.bg }}>
            {typeCfg.icon} {typeCfg.label}
          </span>
          {/* Issue key */}
          <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
            style={{ background: 'var(--blue-bg)', color: 'var(--blue)' }}>
            {issueKey}
          </span>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          <button
            onClick={() => onDelete(task.id)}
            title="Delete issue"
            className="p-1.5 rounded transition-colors"
            style={{ color: 'var(--t4)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--red)'; (e.currentTarget as HTMLElement).style.background = 'var(--red-bg)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            title="Close panel"
            className="p-1.5 rounded transition-colors"
            style={{ color: 'var(--t4)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t1)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-raised)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">

        {/* Title */}
        <div className="px-4 pt-4 pb-2">
          <textarea
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            rows={2}
            className="w-full resize-none text-base font-bold leading-snug outline-none rounded p-1 -ml-1 transition-all"
            style={{
              color:      'var(--t1)',
              background: 'transparent',
              border:     '1px solid transparent',
            }}
            onFocus={e => { (e.target as HTMLElement).style.background = 'var(--bg-raised)'; (e.target as HTMLElement).style.borderColor = 'var(--border)' }}
            onBlurCapture={e => { (e.target as HTMLElement).style.background = 'transparent'; (e.target as HTMLElement).style.borderColor = 'transparent' }}
          />
        </div>

        {/* Fields */}
        <div className="px-4 pb-3">

          <FieldRow label="Status">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: statusCfg.dotColor }} />
              <InlineSelect<Status>
                value={status}
                options={STATUSES.map(s => ({ value: s, label: STATUS_CONFIG[s].label }))}
                onChange={handleStatusChange}
              />
            </div>
          </FieldRow>

          <FieldRow label="Priority">
            <div className="flex items-center gap-2">
              <PriorityBadge priority={priority} />
              <InlineSelect<Priority>
                value={priority}
                options={PRIORITIES.map(p => ({ value: p, label: PRIORITY_CONFIG[p].label }))}
                onChange={handlePriorityChange}
              />
            </div>
          </FieldRow>

          <FieldRow label="Type">
            <InlineSelect<IssueType>
              value={issueType}
              options={ISSUE_TYPES.map(t => ({ value: t, label: `${ISSUE_TYPE_CONFIG[t].icon} ${ISSUE_TYPE_CONFIG[t].label}` }))}
              onChange={handleTypeChange}
            />
          </FieldRow>

          <FieldRow label="Assignee">
            <select
              value={assigneeId}
              onChange={e => handleAssigneeChange(e.target.value)}
              className="appearance-none pl-2 pr-6 py-0.5 text-xs rounded border cursor-pointer outline-none"
              style={{ background: 'var(--bg-raised)', borderColor: 'var(--border)', color: 'var(--t1)' }}>
              <option value="">Unassigned</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </FieldRow>

          <FieldRow label="Reporter">
            <span className="text-xs" style={{ color: 'var(--t2)' }}>
              {task.reporter?.name ?? '—'}
            </span>
          </FieldRow>

          <FieldRow label="Sprint">
            <select
              value={sprintId}
              onChange={e => handleSprintChange(e.target.value)}
              className="appearance-none pl-2 pr-6 py-0.5 text-xs rounded border cursor-pointer outline-none"
              style={{ background: 'var(--bg-raised)', borderColor: 'var(--border)', color: 'var(--t1)' }}>
              <option value="">No sprint</option>
              {sprints.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </FieldRow>

          <FieldRow label="Due date">
            <input
              type="date"
              value={dueDate}
              onChange={e => handleDueDateChange(e.target.value)}
              className="appearance-none px-2 py-0.5 text-xs rounded border outline-none cursor-pointer"
              style={{
                background:  'var(--bg-raised)',
                borderColor: isOverdue ? 'var(--red)' : 'var(--border)',
                color:       isOverdue ? 'var(--red)' : 'var(--t1)',
              }}
            />
            {isOverdue && (
              <span className="ml-2 text-[10px] font-semibold" style={{ color: 'var(--red)' }}>
                Overdue
              </span>
            )}
          </FieldRow>

          {/* Labels */}
          <FieldRow label="Labels">
            <div className="flex flex-wrap gap-1 mb-1.5">
              {labels.map(l => (
                <span key={l}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--blue-bg)', color: 'var(--blue)' }}>
                  {l}
                  <button onClick={() => removeLabel(l)} className="hover:opacity-70">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-1">
              <input
                value={labelInput}
                onChange={e => setLabelInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLabel() } }}
                placeholder="Add label…"
                className="flex-1 px-2 py-0.5 text-xs rounded border outline-none"
                style={{ background: 'var(--bg-raised)', borderColor: 'var(--border)', color: 'var(--t1)', minWidth: 0 }}
              />
              <button onClick={addLabel}
                className="px-2 py-0.5 text-xs rounded font-medium transition-colors"
                style={{ background: 'var(--blue)', color: 'white' }}>
                Add
              </button>
            </div>
          </FieldRow>

          <FieldRow label="Created">
            <span className="text-xs" style={{ color: 'var(--t4)' }}>
              {format(new Date(task.created_at), 'MMM d, yyyy')}
              {' · '}
              {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
            </span>
          </FieldRow>

        </div>

        {/* Description */}
        <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-1.5 py-2 mb-1">
            <Layers className="w-3.5 h-3.5" style={{ color: 'var(--t4)' }} />
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--t3)' }}>
              Description
            </span>
          </div>
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            onBlur={handleDescBlur}
            rows={4}
            placeholder="Add a description…"
            className="w-full resize-none text-xs rounded p-2 outline-none transition-all leading-relaxed"
            style={{
              color:       'var(--t2)',
              background:  'var(--bg-raised)',
              border:      '1px solid var(--border)',
            }}
            onFocus={e => { (e.target as HTMLElement).style.borderColor = 'var(--blue)' }}
            onBlurCapture={e => { (e.target as HTMLElement).style.borderColor = 'var(--border)' }}
          />
        </div>

        {/* Tabs: Comments / Activity */}
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex px-4" style={{ borderBottom: '1px solid var(--border)' }}>
            {(['comments', 'activity'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex items-center gap-1.5 px-1 py-2.5 mr-4 text-xs font-semibold border-b-2 transition-colors capitalize"
                style={activeTab === tab
                  ? { borderColor: 'var(--blue)', color: 'var(--blue)' }
                  : { borderColor: 'transparent', color: 'var(--t3)' }}>
                {tab === 'comments'
                  ? <><MessageSquare className="w-3 h-3" /> Comments ({taskComments.length})</>
                  : <><Clock className="w-3 h-3" /> Activity</>
                }
              </button>
            ))}
          </div>

          {/* Comments tab */}
          {activeTab === 'comments' && (
            <div className="px-4 pb-4">
              {loadingComments ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--t4)' }} />
                </div>
              ) : taskComments.length === 0 ? (
                <div className="py-8 text-center">
                  <MessageSquare className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--t5)' }} />
                  <p className="text-xs" style={{ color: 'var(--t5)' }}>No comments yet. Be the first!</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {taskComments.map(c => (
                    <CommentItem
                      key={c.id}
                      comment={c}
                      currentUserId={user?.id}
                      onDelete={handleDeleteComment}
                    />
                  ))}
                </div>
              )}
              <div ref={commentsEndRef} />

              {/* Comment compose */}
              {user && (
                <div className="mt-3 flex gap-2">
                  <div className="w-6 h-6 rounded-full text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-1"
                    style={{ background: 'var(--blue)' }}>
                    {user.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <textarea
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault()
                          postComment()
                        }
                      }}
                      placeholder="Add a comment… (Ctrl+Enter to submit)"
                      rows={2}
                      className="w-full resize-none text-xs rounded p-2 outline-none transition-all"
                      style={{
                        background:  'var(--bg-raised)',
                        border:      '1px solid var(--border)',
                        color:       'var(--t1)',
                      }}
                      onFocus={e => { (e.target as HTMLElement).style.borderColor = 'var(--blue)' }}
                      onBlurCapture={e => { (e.target as HTMLElement).style.borderColor = 'var(--border)' }}
                    />
                    <div className="flex justify-end mt-1">
                      <button
                        onClick={postComment}
                        disabled={posting || !commentText.trim()}
                        className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded transition-all disabled:opacity-50"
                        style={{ background: 'var(--blue)', color: 'white' }}>
                        {posting
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Send className="w-3 h-3" />
                        }
                        {posting ? 'Posting…' : 'Comment'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Activity tab */}
          {activeTab === 'activity' && (
            <div className="px-4 pb-4">
              {activity.length === 0 ? (
                <div className="py-8 text-center">
                  <Clock className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--t5)' }} />
                  <p className="text-xs" style={{ color: 'var(--t5)' }}>No activity recorded yet.</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {activity.map(log => (
                    <ActivityItem key={log.id} log={log} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
