'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import {
  X, Pencil, Trash2, CheckCircle2, Clock, Circle,
  User, Tag, Calendar, Link as LinkIcon,
} from 'lucide-react'
import type { Bug, Feature, Status, Priority } from '@/types'
import IssueTypeIcon, { type IssueKind } from './IssueTypeIcon'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

type AnyIssue = (Bug & { kind: 'bug' }) | (Feature & { kind: 'feature' })

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string; icon: React.FC<{ className?: string }> }> = {
  todo:        { label: 'To Do',       color: '#42526E', bg: '#DFE1E6', icon: Circle },
  in_progress: { label: 'In Progress', color: '#0052CC', bg: '#DEEBFF', icon: Clock  },
  review:      { label: 'In Review',   color: '#403294', bg: '#EAE6FF', icon: Clock  },
  done:        { label: 'Done',        color: '#006644', bg: '#E3FCEF', icon: CheckCircle2 },
}

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  critical: { label: 'Critical', color: '#FF5630' },
  high:     { label: 'High',    color: '#FF7452' },
  medium:   { label: 'Medium',  color: '#FFA500' },
  low:      { label: 'Low',     color: '#2684FF' },
}

function StatusButton({ status, current, onClick }: { status: Status; current: Status; onClick: () => void }) {
  const cfg = STATUS_CONFIG[status]
  const active = status === current
  return (
    <button onClick={onClick}
      className={clsx(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
        active
          ? 'border-transparent'
          : 'border-[#DFE1E6] text-[#42526E] bg-white hover:bg-[#F4F5F7]',
      )}
      style={active ? { background: cfg.bg, color: cfg.color, borderColor: 'transparent' } : {}}>
      <cfg.icon className="w-3 h-3" />
      {cfg.label}
    </button>
  )
}

interface Props {
  issue: AnyIssue
  onClose: () => void
  onDeleted: () => void
}

export default function IssueDetail({ issue, onClose, onDeleted }: Props) {
  const { profiles, sprints, updateBug, updateFeature, deleteBug, deleteFeature, project } = useStore()
  const [editing, setEditing]   = useState(false)
  const [title, setTitle]        = useState(issue.title)
  const [description, setDescription] = useState(issue.description ?? '')
  const [status, setStatus]     = useState<Status>(issue.status)
  const [saving, setSaving]     = useState(false)

  const assignee   = profiles.find(p => p.id === issue.assignee_id)
  const sprint     = sprints.find(s => s.id === issue.sprint_id)
  const statusCfg  = STATUS_CONFIG[status]
  const priorityCfg = PRIORITY_CONFIG[issue.priority]
  const issueKind: IssueKind = issue.kind === 'bug' ? 'bug' : 'story'

  async function handleStatusChange(s: Status) {
    setStatus(s)
    if (issue.kind === 'bug') {
      await supabase.from('bugs').update({ status: s }).eq('id', issue.id)
      updateBug(issue.id, { status: s })
    } else {
      await supabase.from('features').update({ status: s }).eq('id', issue.id)
      updateFeature(issue.id, { status: s })
    }
  }

  async function handleSave() {
    setSaving(true)
    if (issue.kind === 'bug') {
      await supabase.from('bugs').update({ title, description }).eq('id', issue.id)
      updateBug(issue.id, { title, description })
    } else {
      await supabase.from('features').update({ title, description }).eq('id', issue.id)
      updateFeature(issue.id, { title, description })
    }
    setSaving(false)
    setEditing(false)
  }

  async function handleDelete() {
    if (!confirm(`Delete "${issue.title}"?`)) return
    if (issue.kind === 'bug') {
      await supabase.from('bugs').delete().eq('id', issue.id)
      deleteBug(issue.id)
    } else {
      await supabase.from('features').delete().eq('id', issue.id)
      deleteFeature(issue.id)
    }
    onDeleted()
  }

  const issueKey = `${project?.key ?? 'PROJ'}-${issue.id.slice(-4).toUpperCase()}`

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end"
      style={{ background: 'rgba(9,30,66,0.4)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-[640px] max-w-full h-full bg-white flex flex-col animate-slide-in overflow-hidden"
        style={{ boxShadow: '-4px 0 24px rgba(9,30,66,0.2)', animationName: 'none', transform: 'none' }}
      >
        {/* Top bar */}
        <div className="flex-shrink-0 flex items-center gap-2 px-5 py-3 border-b border-[#DFE1E6] bg-[#F4F5F7]">
          <IssueTypeIcon kind={issueKind} size={14} />
          <span className="text-xs font-semibold text-[#5E6C84] font-mono">{issueKey}</span>
          <div className="flex-1" />
          <button onClick={() => setEditing(e => !e)} className="p-1.5 rounded text-[#5E6C84] hover:bg-[#DFE1E6] transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleDelete} className="p-1.5 rounded text-[#5E6C84] hover:bg-[#FFEBE6] hover:text-[#DE350B] transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose} className="p-1.5 rounded text-[#5E6C84] hover:bg-[#DFE1E6] transition-colors ml-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-5">

            {/* Title */}
            {editing ? (
              <input
                className="input text-lg font-semibold w-full mb-3"
                value={title}
                onChange={e => setTitle(e.target.value)}
                autoFocus
              />
            ) : (
              <h1 className="text-xl font-semibold text-[#172B4D] mb-3 leading-snug">{issue.title}</h1>
            )}

            {/* Status buttons */}
            <div className="flex flex-wrap gap-2 mb-5">
              {(['todo', 'in_progress', 'review', 'done'] as Status[]).map(s => (
                <StatusButton key={s} status={s} current={status} onClick={() => handleStatusChange(s)} />
              ))}
            </div>

            {/* Description */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wider mb-2">Description</h3>
              {editing ? (
                <textarea
                  className="input resize-none w-full"
                  style={{ minHeight: 120 }}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Add a description..."
                />
              ) : description ? (
                <p className="text-sm text-[#172B4D] leading-relaxed whitespace-pre-wrap">{description}</p>
              ) : (
                <p className="text-sm text-[#B3BAC5] italic">No description provided.</p>
              )}
            </div>

            {editing && (
              <div className="flex gap-2 mb-6">
                <button onClick={handleSave} disabled={saving} className="btn-primary">
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                <button onClick={() => { setEditing(false); setTitle(issue.title); setDescription(issue.description ?? '') }}
                  className="btn-secondary">Cancel</button>
              </div>
            )}

            {/* Details sidebar */}
            <div className="border border-[#DFE1E6] rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 bg-[#F4F5F7] border-b border-[#DFE1E6]">
                <span className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wider">Details</span>
              </div>
              <div className="divide-y divide-[#F4F5F7]">
                {[
                  {
                    label: 'Assignee',
                    icon: User,
                    value: assignee ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                          style={{ background: '#0052CC' }}>
                          {assignee.name[0].toUpperCase()}
                        </div>
                        <span className="text-sm text-[#172B4D]">{assignee.name}</span>
                      </div>
                    ) : <span className="text-sm text-[#B3BAC5]">Unassigned</span>,
                  },
                  {
                    label: 'Priority',
                    icon: Tag,
                    value: (
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: priorityCfg.color }} />
                        <span className="text-sm text-[#172B4D]">{priorityCfg.label}</span>
                      </div>
                    ),
                  },
                  {
                    label: 'Sprint',
                    icon: Calendar,
                    value: sprint
                      ? <span className="text-sm text-[#172B4D]">{sprint.name}</span>
                      : <span className="text-sm text-[#B3BAC5]">No sprint</span>,
                  },
                  {
                    label: 'Status',
                    icon: CheckCircle2,
                    value: (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{ background: statusCfg.bg, color: statusCfg.color }}>
                        {statusCfg.label}
                      </span>
                    ),
                  },
                ].map(({ label, icon: Icon, value }) => (
                  <div key={label} className="flex items-center gap-3 px-4 py-2.5">
                    <Icon className="w-3.5 h-3.5 text-[#7A869A] flex-shrink-0" />
                    <span className="text-xs font-medium text-[#5E6C84] w-20 flex-shrink-0">{label}</span>
                    <div className="flex-1">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-3 border-t border-[#DFE1E6] bg-[#F4F5F7]">
          <p className="text-xs text-[#7A869A]">
            Created {formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
    </div>
  )
}
