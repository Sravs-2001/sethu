'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import { Plus, ChevronDown, ChevronRight, Zap, Play, Check } from 'lucide-react'
import type { Status, Priority, UnifiedIssue, Sprint, SprintStatus } from '@/types'
import IssueTypeIcon, { type IssueKind } from './IssueTypeIcon'
import IssueDetail from './IssueDetail'
import clsx from 'clsx'

const STATUS_LABELS: Record<Status, string> = {
  todo: 'To Do', in_progress: 'In Progress', review: 'In Review', done: 'Done',
}
const STATUS_COLOR: Record<Status, { bg: string; text: string }> = {
  todo:        { bg: '#DFE1E6', text: '#42526E' },
  in_progress: { bg: '#DEEBFF', text: '#0052CC' },
  review:      { bg: '#EAE6FF', text: '#403294' },
  done:        { bg: '#E3FCEF', text: '#006644' },
}
const PRIORITY_COLOR: Record<Priority, string> = {
  critical: '#FF5630',
  high:     '#FF7452',
  medium:   '#FFA500',
  low:      '#2684FF',
}
const SPRINT_STATUS_BADGE: Record<SprintStatus, { bg: string; text: string; label: string }> = {
  planning:  { bg: '#DFE1E6', text: '#42526E', label: 'Planning'  },
  active:    { bg: '#E3FCEF', text: '#006644', label: 'Active'    },
  completed: { bg: '#DEEBFF', text: '#0747A6', label: 'Completed' },
}

function IssueRow({ issue, projectKey, onClick }: {
  issue: UnifiedIssue
  projectKey: string
  onClick: () => void
}) {
  const kind: IssueKind = issue.kind === 'bug' ? 'bug' : 'story'
  const statusCfg = STATUS_COLOR[issue.status]
  const issueKey = `${projectKey}-${issue.id.slice(-4).toUpperCase()}`

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2 hover:bg-[#F4F5F7] cursor-pointer border-b border-[#F4F5F7] last:border-b-0 group transition-colors"
    >
      <IssueTypeIcon kind={kind} size={14} />

      <span className="text-[11px] text-[#7A869A] font-mono w-20 flex-shrink-0">{issueKey}</span>

      <span className="flex-1 text-[13px] text-[#172B4D] truncate group-hover:text-[#0052CC] transition-colors">
        {issue.title}
      </span>

      {/* Priority */}
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: PRIORITY_COLOR[issue.priority] }}
        title={issue.priority}
      />

      {/* Assignee */}
      {issue.assignee ? (
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
          style={{ background: '#0052CC' }}
          title={issue.assignee.name}
        >
          {issue.assignee.name[0].toUpperCase()}
        </div>
      ) : (
        <div className="w-5 h-5 rounded-full bg-[#DFE1E6] flex-shrink-0" />
      )}

      {/* Status badge */}
      <span
        className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap"
        style={{ background: statusCfg.bg, color: statusCfg.text }}
      >
        {STATUS_LABELS[issue.status]}
      </span>
    </div>
  )
}

function SprintSection({
  sprint,
  issues,
  projectKey,
  onIssueClick,
  onStartSprint,
  onCompleteSprint,
}: {
  sprint: Sprint | null
  issues: UnifiedIssue[]
  projectKey: string
  onIssueClick: (i: UnifiedIssue) => void
  onStartSprint?: () => void
  onCompleteSprint?: () => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const doneCount = issues.filter(i => i.status === 'done').length
  const isBacklog  = sprint === null
  const isActive   = sprint?.status === 'active'

  const headerBg = isBacklog ? '#F4F5F7' : isActive ? '#E3FCEF' : '#FAFBFC'

  return (
    <div className="mb-3 border border-[#DFE1E6] rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer"
        style={{ background: headerBg }}
        onClick={() => setCollapsed(c => !c)}
      >
        {collapsed
          ? <ChevronRight className="w-4 h-4 text-[#7A869A] flex-shrink-0" />
          : <ChevronDown  className="w-4 h-4 text-[#7A869A] flex-shrink-0" />
        }

        {isBacklog ? (
          <span className="text-[13px] font-semibold text-[#172B4D]">Backlog</span>
        ) : (
          <>
            <Zap className="w-3.5 h-3.5 flex-shrink-0" style={{ color: isActive ? '#006644' : '#7A869A' }} />
            <span className="text-[13px] font-semibold text-[#172B4D]">{sprint!.name}</span>
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full ml-1"
              style={{ ...SPRINT_STATUS_BADGE[sprint!.status] }}
            >
              {SPRINT_STATUS_BADGE[sprint!.status].label}
            </span>
          </>
        )}

        <span className="text-xs text-[#7A869A] ml-1">
          {issues.length} issue{issues.length !== 1 ? 's' : ''}
          {issues.length > 0 && ` · ${doneCount} done`}
        </span>

        {/* Sprint progress bar */}
        {!isBacklog && issues.length > 0 && (
          <div className="flex-1 mx-3">
            <div className="h-1.5 bg-[#DFE1E6] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#36B37E] rounded-full transition-all"
                style={{ width: `${Math.round((doneCount / issues.length) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Sprint action buttons */}
        {!isBacklog && (
          <div className="flex items-center gap-1.5 ml-auto flex-shrink-0" onClick={e => e.stopPropagation()}>
            {sprint!.status === 'planning' && onStartSprint && (
              <button
                onClick={onStartSprint}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded border border-[#0052CC] text-[#0052CC] hover:bg-[#DEEBFF] transition-colors"
              >
                <Play className="w-3 h-3" /> Start sprint
              </button>
            )}
            {sprint!.status === 'active' && onCompleteSprint && (
              <button
                onClick={onCompleteSprint}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded border border-[#36B37E] text-[#006644] hover:bg-[#E3FCEF] transition-colors"
              >
                <Check className="w-3 h-3" /> Complete sprint
              </button>
            )}
          </div>
        )}
      </div>

      {/* Issues */}
      {!collapsed && (
        <div>
          {issues.map(issue => (
            <IssueRow
              key={issue.id}
              issue={issue}
              projectKey={projectKey}
              onClick={() => onIssueClick(issue)}
            />
          ))}
          {issues.length === 0 && (
            <div className="px-4 py-5 text-center text-xs text-[#B3BAC5]">
              {isBacklog ? 'Your backlog is empty.' : 'No issues in this sprint.'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function BacklogView({ onCreateIssue }: { onCreateIssue: () => void }) {
  const { bugs, features, sprints, setBugs, setFeatures, setSprints, project, updateSprint } = useStore()
  const [selectedIssue, setSelectedIssue] = useState<UnifiedIssue | null>(null)

  useEffect(() => {
    if (!project) return
    const pid = project.id
    supabase.from('bugs').select('*, assignee:profiles(*)').eq('project_id', pid)
      .order('created_at', { ascending: false }).then(({ data }) => data && setBugs(data as any))
    supabase.from('features').select('*, assignee:profiles(*)').eq('project_id', pid)
      .order('created_at', { ascending: false }).then(({ data }) => data && setFeatures(data as any))
    supabase.from('sprints').select('*').eq('project_id', pid)
      .order('created_at', { ascending: true }).then(({ data }) => data && setSprints(data))
  }, [project?.id])

  const allIssues: UnifiedIssue[] = [
    ...bugs.map(b => ({ ...b, kind: 'bug' as const })),
    ...features.map(f => ({ ...f, kind: 'feature' as const })),
  ]

  const issuesBySprint = (sprintId: string) => allIssues.filter(i => i.sprint_id === sprintId)
  const backlogIssues  = allIssues.filter(i => !i.sprint_id)

  async function handleSprintStatus(sprint: Sprint, status: SprintStatus) {
    await supabase.from('sprints').update({ status }).eq('id', sprint.id)
    updateSprint(sprint.id, { status })
  }

  const projectKey = project?.key ?? 'PROJ'
  const activeSprint = sprints.find(s => s.status === 'active')
  const totalOpen    = allIssues.filter(i => i.status !== 'done').length

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-3.5 border-b border-[#DFE1E6] bg-white flex items-center gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[#172B4D]">Backlog</h1>
          <p className="text-xs text-[#5E6C84] mt-0.5">
            {allIssues.length} issues · {totalOpen} open
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onCreateIssue}
            className="btn-primary text-xs py-1.5 px-3"
          >
            <Plus className="w-3.5 h-3.5" /> Create issue
          </button>
        </div>
      </div>

      {/* Sprint + backlog sections */}
      <div className="flex-1 overflow-y-auto px-5 py-4">

        {/* Active sprint first */}
        {activeSprint && (
          <SprintSection
            sprint={activeSprint}
            issues={issuesBySprint(activeSprint.id)}
            projectKey={projectKey}
            onIssueClick={setSelectedIssue}
            onCompleteSprint={() => handleSprintStatus(activeSprint, 'completed')}
          />
        )}

        {/* Other sprints */}
        {sprints
          .filter(s => s.status !== 'active')
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .map(sprint => (
            <SprintSection
              key={sprint.id}
              sprint={sprint}
              issues={issuesBySprint(sprint.id)}
              projectKey={projectKey}
              onIssueClick={setSelectedIssue}
              onStartSprint={sprint.status === 'planning' ? () => handleSprintStatus(sprint, 'active') : undefined}
              onCompleteSprint={sprint.status === 'active' ? () => handleSprintStatus(sprint, 'completed') : undefined}
            />
          ))
        }

        {/* Backlog (no sprint) */}
        <SprintSection
          sprint={null}
          issues={backlogIssues}
          projectKey={projectKey}
          onIssueClick={setSelectedIssue}
        />

        {sprints.length === 0 && backlogIssues.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: '#DEEBFF' }}>
              <Zap className="w-8 h-8" style={{ color: '#0052CC' }} />
            </div>
            <h3 className="text-base font-semibold text-[#172B4D] mb-1">Your backlog is empty</h3>
            <p className="text-sm text-[#5E6C84] mb-4">Create issues to add them to the backlog.</p>
            <button onClick={onCreateIssue} className="btn-primary">
              <Plus className="w-3.5 h-3.5" /> Create issue
            </button>
          </div>
        )}
      </div>

      {/* Issue detail */}
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
