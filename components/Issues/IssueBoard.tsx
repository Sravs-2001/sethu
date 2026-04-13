'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import { Plus, SlidersHorizontal, ChevronDown, User } from 'lucide-react'
import type { Status, Priority, UnifiedIssue } from '@/types'
import IssueTypeIcon, { type IssueKind } from './IssueTypeIcon'
import IssueDetail from './IssueDetail'
import clsx from 'clsx'

const COLUMNS: { status: Status; label: string; color: string }[] = [
  { status: 'todo',        label: 'TO DO',       color: '#DFE1E6' },
  { status: 'in_progress', label: 'IN PROGRESS',  color: '#0052CC' },
  { status: 'review',      label: 'IN REVIEW',    color: '#6554C0' },
  { status: 'done',        label: 'DONE',         color: '#36B37E' },
]

const PRIORITY_DOT: Record<Priority, string> = {
  critical: '#FF5630',
  high:     '#FF7452',
  medium:   '#FFA500',
  low:      '#2684FF',
}

function IssueCard({ issue, onClick }: { issue: UnifiedIssue; onClick: () => void }) {
  const kind: IssueKind = issue.kind === 'bug' ? 'bug' : 'story'

  return (
    <div
      onClick={onClick}
      className="bg-white rounded border border-[#DFE1E6] p-3 cursor-pointer group hover:border-[#4C9AFF] transition-colors"
      style={{ boxShadow: '0 1px 2px rgba(9,30,66,0.06)' }}
    >
      {/* Title */}
      <p className="text-[13px] font-medium text-[#172B4D] leading-snug mb-2.5 group-hover:text-[#0052CC] transition-colors">
        {issue.title}
      </p>

      {/* Footer row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <IssueTypeIcon kind={kind} size={14} />

        {/* Priority dot */}
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: PRIORITY_DOT[issue.priority] }}
          title={issue.priority}
        />

        {/* Assignee avatar */}
        {issue.assignee && (
          <div className="ml-auto w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
            style={{ background: '#0052CC' }}
            title={issue.assignee.name}>
            {issue.assignee.name[0].toUpperCase()}
          </div>
        )}
        {!issue.assignee && (
          <div className="ml-auto w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: '#DFE1E6' }}>
            <User className="w-2.5 h-2.5 text-[#97A0AF]" />
          </div>
        )}
      </div>
    </div>
  )
}

function Column({
  column,
  issues,
  onCardClick,
  onCreateClick,
}: {
  column: { status: Status; label: string; color: string }
  issues: UnifiedIssue[]
  onCardClick: (issue: UnifiedIssue) => void
  onCreateClick: () => void
}) {
  return (
    <div className="flex-1 min-w-[200px] flex flex-col overflow-hidden rounded-lg"
      style={{ background: '#F4F5F7' }}>
      {/* Column header */}
      <div className="px-3 py-2.5 flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: column.color }}
          />
          <span className="text-[11px] font-semibold text-[#42526E] uppercase tracking-wide">
            {column.label}
          </span>
          <span className="text-[11px] text-[#7A869A] font-medium ml-0.5">
            {issues.length}
          </span>
        </div>
        <button
          onClick={onCreateClick}
          className="p-1 rounded text-[#7A869A] hover:text-[#172B4D] hover:bg-[#DFE1E6] transition-colors flex-shrink-0"
          title="Create issue"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
        {issues.map(issue => (
          <IssueCard key={issue.id} issue={issue} onClick={() => onCardClick(issue)} />
        ))}
        {issues.length === 0 && (
          <div className="py-6 flex flex-col items-center justify-center text-center">
            <p className="text-xs text-[#C1C7D0]">No issues</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function IssueBoard({ onCreateIssue }: { onCreateIssue: () => void }) {
  const { bugs, features, sprints, setBugs, setFeatures, setSprints, project, profiles, setProfiles } = useStore()
  const [selectedIssue, setSelectedIssue] = useState<UnifiedIssue | null>(null)
  const [filterAssignee, setFilterAssignee] = useState('')
  const [filterPriority, setFilterPriority] = useState<Priority | ''>('')

  useEffect(() => {
    if (!project) return
    const pid = project.id
    supabase.from('bugs').select('*, assignee:profiles(*)').eq('project_id', pid)
      .order('created_at', { ascending: false }).then(({ data }) => data && setBugs(data as any))
    supabase.from('features').select('*, assignee:profiles(*)').eq('project_id', pid)
      .order('created_at', { ascending: false }).then(({ data }) => data && setFeatures(data as any))
    supabase.from('sprints').select('*').eq('project_id', pid)
      .order('created_at', { ascending: false }).then(({ data }) => data && setSprints(data))
    supabase.from('profiles').select('*').then(({ data }) => data && setProfiles(data))

    // realtime
    const ch = supabase.channel(`board-${pid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bugs' }, () => {
        supabase.from('bugs').select('*, assignee:profiles(*)').eq('project_id', pid)
          .order('created_at', { ascending: false }).then(({ data }) => data && setBugs(data as any))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'features' }, () => {
        supabase.from('features').select('*, assignee:profiles(*)').eq('project_id', pid)
          .order('created_at', { ascending: false }).then(({ data }) => data && setFeatures(data as any))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [project?.id])

  const activeSprint = sprints.find(s => s.status === 'active')

  const allIssues: UnifiedIssue[] = [
    ...bugs.map(b => ({ ...b, kind: 'bug' as const })),
    ...features.map(f => ({ ...f, kind: 'feature' as const })),
  ].filter(i => {
    if (filterAssignee && i.assignee_id !== filterAssignee) return false
    if (filterPriority && i.priority !== filterPriority) return false
    return true
  })

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Board header */}
      <div className="flex-shrink-0 px-5 py-3.5 border-b border-[#DFE1E6] bg-white">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-semibold text-[#172B4D]">Board</h1>
            {activeSprint && (
              <p className="text-xs text-[#5E6C84] mt-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#36B37E]" />
                {activeSprint.name}
              </p>
            )}
          </div>

          {/* Filters */}
          <div className="ml-auto flex items-center gap-2">
            {/* Assignee filter */}
            {profiles.length > 0 && (
              <div className="flex items-center gap-1 -space-x-1">
                {profiles.slice(0, 5).map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => setFilterAssignee(prev => prev === p.id ? '' : p.id)}
                    title={p.name}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white transition-all hover:z-10 hover:scale-110"
                    style={{
                      background: '#0052CC',
                      opacity: filterAssignee && filterAssignee !== p.id ? 0.4 : 1,
                      zIndex: i,
                    }}
                  >
                    {p.name[0].toUpperCase()}
                  </button>
                ))}
              </div>
            )}

            {/* Priority filter */}
            <select
              className="text-xs border border-[#DFE1E6] rounded px-2 py-1.5 text-[#42526E] bg-white focus:outline-none focus:border-[#4C9AFF]"
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value as any)}
            >
              <option value="">Priority</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-[#DFE1E6] rounded text-xs font-medium text-[#42526E] hover:bg-[#F4F5F7] transition-colors">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Group by
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            <button
              onClick={onCreateIssue}
              className="btn-primary text-xs py-1.5 px-3"
            >
              <Plus className="w-3.5 h-3.5" /> Create issue
            </button>
          </div>
        </div>
      </div>

      {/* Board columns */}
      <div className="flex-1 overflow-hidden px-4 py-4">
        <div className="h-full flex gap-3">
          {COLUMNS.map(col => {
            const colIssues = allIssues.filter(i => i.status === col.status)
            return (
              <Column
                key={col.status}
                column={col}
                issues={colIssues}
                onCardClick={setSelectedIssue}
                onCreateClick={onCreateIssue}
              />
            )
          })}
        </div>
      </div>

      {/* Issue detail panel */}
      {selectedIssue && (
        <IssueDetail
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
          onDeleted={() => setSelectedIssue(null)}
        />
      )}
    </div>
  )
}
