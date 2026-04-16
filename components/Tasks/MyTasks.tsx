'use client'

import { useEffect, useMemo, useState } from 'react'
import { bugService } from '@/lib/services'
import { useStore } from '@/store/useStore'
import {
  CheckCircle2, Clock, AlertTriangle, ListTodo,
  Search, ChevronDown, Filter, Calendar, User2,
  Loader2, LayoutGrid, List, BarChart3,
} from 'lucide-react'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge'
import {
  PRIORITY_CONFIG, STATUS_CONFIG, ISSUE_TYPE_CONFIG, STATUSES,
} from '@/lib/constants'
import { formatDistanceToNow, isPast, isToday, isTomorrow, format } from 'date-fns'
import type { Bug as Task, Priority, Status, IssueType, Project } from '@/types'
import clsx from 'clsx'

// ── Types ─────────────────────────────────────────────────────────────────────

type TaskWithProject = Task & { project?: Pick<Project, 'id' | 'name' | 'key' | 'avatar_color'> }
type GroupBy = 'status' | 'priority' | 'project' | 'due'
type ViewMode = 'list' | 'board'

// ── Due date badge ────────────────────────────────────────────────────────────

function DueBadge({ date }: { date: string }) {
  const d     = new Date(date)
  const overdue  = isPast(d) && !isToday(d)
  const dueToday = isToday(d)
  const dueTmrw  = isTomorrow(d)

  const label = overdue  ? `Overdue · ${format(d, 'MMM d')}` :
                dueToday ? 'Due today' :
                dueTmrw  ? 'Due tomorrow' :
                            format(d, 'MMM d')

  const style = overdue  ? { bg: 'var(--red-bg)',    color: 'var(--red)'    } :
                dueToday ? { bg: 'var(--orange-bg)',  color: 'var(--orange)' } :
                dueTmrw  ? { bg: 'var(--amber-bg)',   color: 'var(--amber)'  } :
                           { bg: 'var(--bg-sunken)',  color: 'var(--t3)'     }

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: style.bg, color: style.color }}>
      <Calendar className="w-2.5 h-2.5" />
      {label}
    </span>
  )
}

// ── Project chip ──────────────────────────────────────────────────────────────

function ProjectChip({ project }: { project: TaskWithProject['project'] }) {
  if (!project) return null
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: project.avatar_color + '22', color: project.avatar_color }}>
      {project.key}
    </span>
  )
}

// ── Issue type icon ───────────────────────────────────────────────────────────

function TypeIcon({ type }: { type: IssueType }) {
  const { icon, color, bg } = ISSUE_TYPE_CONFIG[type]
  return (
    <span className="w-5 h-5 rounded text-[10px] flex items-center justify-center flex-shrink-0"
      style={{ background: bg, color }}>
      {icon}
    </span>
  )
}

// ── Task row (list view) ──────────────────────────────────────────────────────

function TaskRow({ task, onOpen }: { task: TaskWithProject; onOpen: (t: TaskWithProject) => void }) {
  const cfg = STATUS_CONFIG[task.status]
  return (
    <div
      onClick={() => onOpen(task)}
      className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
      style={{ borderBottom: '1px solid var(--border)' }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-raised)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>

      <TypeIcon type={task.issue_type} />

      {/* Status dot */}
      <span className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: cfg.dotColor }} />

      {/* Title */}
      <span className="flex-1 min-w-0 text-sm font-medium truncate" style={{ color: 'var(--t1)' }}>
        {task.title}
      </span>

      {/* Badges */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <ProjectChip project={task.project} />
        <PriorityBadge priority={task.priority} />
        {task.due_date && <DueBadge date={task.due_date} />}
        <StatusBadge status={task.status} />
      </div>
    </div>
  )
}

// ── Task card (board view) ────────────────────────────────────────────────────

function TaskCard({ task, onOpen }: { task: TaskWithProject; onOpen: (t: TaskWithProject) => void }) {
  return (
    <div
      onClick={() => onOpen(task)}
      className="issue-card group animate-fade-in"
      style={{ marginBottom: '8px' }}>
      <div className="flex items-start gap-2 mb-2">
        <TypeIcon type={task.issue_type} />
        <p className="text-sm font-medium leading-snug flex-1" style={{ color: 'var(--t1)' }}>
          {task.title}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        <ProjectChip project={task.project} />
        <PriorityBadge priority={task.priority} />
        {task.due_date && <DueBadge date={task.due_date} />}
      </div>
    </div>
  )
}

// ── Group header ──────────────────────────────────────────────────────────────

function GroupHeader({
  label, count, dotColor, children,
}: {
  label: string; count: number; dotColor?: string; children?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 sticky top-0 z-10"
      style={{ background: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
      {dotColor && <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: dotColor }} />}
      {children}
      <span className="text-xs font-bold" style={{ color: 'var(--t1)' }}>{label}</span>
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
        style={{ background: 'var(--bg-sunken)', color: 'var(--t3)' }}>
        {count}
      </span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MyTasks() {
  const { user, projects } = useStore()

  const [tasks,    setTasks]    = useState<TaskWithProject[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [filterStatus,   setFilterStatus]   = useState<Status   | 'all'>('all')
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all')
  const [filterProject,  setFilterProject]  = useState<string   | 'all'>('all')
  const [groupBy,  setGroupBy]  = useState<GroupBy>('status')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selected, setSelected] = useState<TaskWithProject | null>(null)

  // ── Load all tasks assigned to me ─────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    setLoading(true)

    bugService.getByAssignee(user.id).then(({ data }) => {
      setTasks((data ?? []) as TaskWithProject[])
      setLoading(false)
    })
  }, [user?.id])

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (filterStatus   !== 'all' && t.status   !== filterStatus)   return false
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false
      if (filterProject  !== 'all' && t.project?.id !== filterProject) return false
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [tasks, search, filterStatus, filterPriority, filterProject])

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalOpen    = tasks.length
  const overdue      = tasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date))).length
  const dueToday     = tasks.filter(t => t.due_date && isToday(new Date(t.due_date))).length
  const inProgress   = tasks.filter(t => t.status === 'in_progress').length

  const stats = [
    { label: 'Open',        value: totalOpen,   icon: ListTodo,       color: 'var(--blue)',   bg: 'var(--blue-bg)'   },
    { label: 'In Progress', value: inProgress,  icon: Clock,          color: 'var(--orange)', bg: 'var(--orange-bg)' },
    { label: 'Due Today',   value: dueToday,    icon: AlertTriangle,  color: 'var(--amber)',  bg: 'var(--amber-bg)'  },
    { label: 'Overdue',     value: overdue,     icon: CheckCircle2,   color: 'var(--red)',    bg: 'var(--red-bg)'    },
  ]

  // ── Grouping ──────────────────────────────────────────────────────────────
  const grouped = useMemo<{ key: string; label: string; tasks: TaskWithProject[]; meta?: any }[]>(() => {
    if (groupBy === 'status') {
      return STATUSES
        .map(s => ({
          key:   s,
          label: STATUS_CONFIG[s].label,
          tasks: filtered.filter(t => t.status === s),
          meta:  STATUS_CONFIG[s],
        }))
        .filter(g => g.tasks.length > 0)
    }

    if (groupBy === 'priority') {
      const PRIO_ORDER: Priority[] = ['critical', 'high', 'medium', 'low']
      return PRIO_ORDER
        .map(p => ({
          key:   p,
          label: PRIORITY_CONFIG[p].label,
          tasks: filtered.filter(t => t.priority === p),
          meta:  PRIORITY_CONFIG[p],
        }))
        .filter(g => g.tasks.length > 0)
    }

    if (groupBy === 'project') {
      const projectMap = new Map<string, TaskWithProject[]>()
      filtered.forEach(t => {
        const pid = t.project?.id ?? 'unknown'
        if (!projectMap.has(pid)) projectMap.set(pid, [])
        projectMap.get(pid)!.push(t)
      })
      return Array.from(projectMap.entries()).map(([pid, list]) => ({
        key:   pid,
        label: list[0]?.project?.name ?? 'Unknown',
        tasks: list,
        meta:  list[0]?.project,
      }))
    }

    // group by due date
    const now = new Date()
    const groups = [
      { key: 'overdue',   label: 'Overdue',   tasks: filtered.filter(t => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)))  },
      { key: 'today',     label: 'Due today', tasks: filtered.filter(t => t.due_date && isToday(new Date(t.due_date)))    },
      { key: 'tomorrow',  label: 'Tomorrow',  tasks: filtered.filter(t => t.due_date && isTomorrow(new Date(t.due_date))) },
      { key: 'upcoming',  label: 'Upcoming',  tasks: filtered.filter(t => t.due_date && !isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)) && !isTomorrow(new Date(t.due_date))) },
      { key: 'no_date',   label: 'No due date', tasks: filtered.filter(t => !t.due_date) },
    ]
    return groups.filter(g => g.tasks.length > 0)
  }, [filtered, groupBy])

  function openTask(t: TaskWithProject) {
    setSelected(t)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--blue)' }} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0" style={{ background: 'var(--bg)' }}>

      {/* ── Page header ── */}
      <div className="page-header">
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold" style={{ color: 'var(--t1)' }}>My Tasks</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--t3)' }}>
            All tasks assigned to you across your projects
          </p>
        </div>

        {/* View toggle */}
        <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {([['list', List, 'List'], ['board', LayoutGrid, 'Board']] as const).map(([mode, Icon, label]) => (
            <button key={mode} onClick={() => setViewMode(mode)}
              title={label}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: viewMode === mode ? 'var(--blue)' : 'transparent',
                color:      viewMode === mode ? 'white' : 'var(--t3)',
              }}>
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:block">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Stat strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 py-3"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="flex items-center gap-2.5 py-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: bg }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <div>
              <div className="text-lg font-bold leading-none" style={{ color: 'var(--t1)' }}>{value}</div>
              <div className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--t3)' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div className="flex items-center gap-2 px-5 py-2 flex-wrap"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>

        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-[160px] max-w-xs px-2.5 py-1.5 rounded-lg"
          style={{ border: '1px solid var(--border)', background: 'var(--bg-raised)' }}>
          <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--t4)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="flex-1 text-xs bg-transparent outline-none"
            style={{ color: 'var(--t1)' }}
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-3.5 h-3.5" style={{ color: 'var(--t4)' }} />

          {/* Status filter */}
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
            className="text-xs px-2 py-1.5 rounded-lg outline-none cursor-pointer"
            style={{ border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--t1)' }}>
            <option value="all">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
          </select>

          {/* Priority filter */}
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value as any)}
            className="text-xs px-2 py-1.5 rounded-lg outline-none cursor-pointer"
            style={{ border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--t1)' }}>
            <option value="all">All priorities</option>
            {(['critical','high','medium','low'] as Priority[]).map(p => (
              <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
            ))}
          </select>

          {/* Project filter */}
          {projects.length > 1 && (
            <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
              className="text-xs px-2 py-1.5 rounded-lg outline-none cursor-pointer"
              style={{ border: '1px solid var(--border)', background: 'var(--bg-raised)', color: 'var(--t1)' }}>
              <option value="all">All projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}

          {/* Group by */}
          <div className="flex items-center gap-1 ml-1">
            <span className="text-[10px] font-semibold" style={{ color: 'var(--t3)' }}>Group:</span>
            {(['status','priority','project','due'] as GroupBy[]).map(g => (
              <button key={g} onClick={() => setGroupBy(g)}
                className="text-[11px] font-semibold px-2 py-1 rounded-lg capitalize transition-colors"
                style={{
                  background: groupBy === g ? 'var(--blue)' : 'var(--bg-raised)',
                  color:      groupBy === g ? 'white'       : 'var(--t2)',
                  border:     `1px solid ${groupBy === g ? 'var(--blue)' : 'var(--border)'}`,
                }}>
                {g === 'due' ? 'Due date' : g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'var(--bg-raised)' }}>
              <CheckCircle2 className="w-8 h-8" style={{ color: 'var(--t4)' }} />
            </div>
            <p className="text-base font-bold mb-1" style={{ color: 'var(--t1)' }}>
              {tasks.length === 0 ? 'No tasks assigned to you yet' : 'No tasks match your filters'}
            </p>
            <p className="text-sm" style={{ color: 'var(--t3)' }}>
              {tasks.length === 0
                ? 'When someone assigns you a task, it will appear here.'
                : 'Try clearing filters to see all your tasks.'}
            </p>
            {tasks.length > 0 && filtered.length === 0 && (
              <button
                onClick={() => { setSearch(''); setFilterStatus('all'); setFilterPriority('all'); setFilterProject('all') }}
                className="btn-subtle mt-3 text-xs">
                Clear filters
              </button>
            )}
          </div>
        ) : viewMode === 'list' ? (
          /* ── List view ── */
          <div style={{ background: 'var(--bg-card)' }}>
            {grouped.map(group => (
              <div key={group.key}>
                <GroupHeader
                  label={group.label}
                  count={group.tasks.length}
                  dotColor={group.meta?.dotColor ?? group.meta?.avatar_color}>
                  {groupBy === 'project' && group.meta?.avatar_color && (
                    <span className="w-4 h-4 rounded text-white text-[9px] font-bold flex items-center justify-center"
                      style={{ background: group.meta.avatar_color }}>
                      {group.meta.key?.slice(0, 2)}
                    </span>
                  )}
                </GroupHeader>
                {group.tasks.map(t => (
                  <TaskRow key={t.id} task={t} onOpen={openTask} />
                ))}
              </div>
            ))}
          </div>
        ) : (
          /* ── Board view ── */
          <div className="flex gap-4 p-5 overflow-x-auto h-full">
            {grouped.map(group => (
              <div key={group.key} className="kanban-col w-64 flex-shrink-0">
                <div className="flex items-center gap-2 px-3 py-2.5"
                  style={{ borderBottom: '1px solid var(--border)' }}>
                  {group.meta?.dotColor && (
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: group.meta.dotColor }} />
                  )}
                  <span className="text-xs font-bold flex-1" style={{ color: 'var(--t1)' }}>
                    {group.label}
                  </span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'var(--bg-sunken)', color: 'var(--t3)' }}>
                    {group.tasks.length}
                  </span>
                </div>
                <div className="p-3 flex-1 overflow-y-auto">
                  {group.tasks.map(t => (
                    <TaskCard key={t.id} task={t} onOpen={openTask} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Task detail slide-over ── */}
      {selected && (
        <TaskDetailOverlay task={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

// ── Task detail overlay (minimal, since we don't have sprint context here) ────

function TaskDetailOverlay({ task, onClose }: { task: TaskWithProject; onClose: () => void }) {
  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const statusEntries = STATUSES.map(s => ({ value: s, label: STATUS_CONFIG[s].label }))

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'var(--bg-overlay)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden animate-slide-bottom"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xl)' }}>

        {/* Header */}
        <div className="flex items-start gap-3 p-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <TypeIcon type={task.issue_type} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--t1)' }}>
              {task.title}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <ProjectChip project={task.project} />
              <PriorityBadge priority={task.priority} />
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors flex-shrink-0"
            style={{ color: 'var(--t3)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-raised)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {task.description && (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--t2)' }}>
              {task.description}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--bg-raised)' }}>
              <span style={{ color: 'var(--t4)' }}>Status</span>
              <StatusBadge status={task.status} />
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--bg-raised)' }}>
              <span style={{ color: 'var(--t4)' }}>Priority</span>
              <PriorityBadge priority={task.priority} />
            </div>
            {task.due_date && (
              <div className="flex items-center gap-2 p-2 rounded-lg col-span-2" style={{ background: 'var(--bg-raised)' }}>
                <Calendar className="w-3 h-3" style={{ color: 'var(--t4)' }} />
                <span style={{ color: 'var(--t4)' }}>Due</span>
                <DueBadge date={task.due_date} />
              </div>
            )}
          </div>

          <p className="text-xs text-center" style={{ color: 'var(--t4)' }}>
            Open the project board to edit this task in full detail.
          </p>
        </div>
      </div>
    </div>
  )
}
