'use client'

import { useStore } from '@/store/useStore'
import { BarChart2, TrendingUp, Bug, Sparkles, Rocket, CheckCircle2, Clock, AlertCircle, Users } from 'lucide-react'
import clsx from 'clsx'
import type { Priority, Status } from '@/types'

const PRIORITY_COLOR: Record<Priority, { bar: string; label: string }> = {
  critical: { bar: '#DE350B', label: 'Critical' },
  high:     { bar: '#FF5630', label: 'High'     },
  medium:   { bar: '#FF991F', label: 'Medium'   },
  low:      { bar: '#36B37E', label: 'Low'      },
}

const STATUS_COLOR: Record<Status, { bar: string; label: string }> = {
  todo:        { bar: '#97A0AF', label: 'To Do'       },
  in_progress: { bar: '#0052CC', label: 'In Progress' },
  review:      { bar: '#6554C0', label: 'Review'      },
  done:        { bar: '#36B37E', label: 'Done'        },
}

function BarRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[#44546F] w-24 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-[#F4F5F7] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold text-[#172B4D] w-8 text-right">{value}</span>
      <span className="text-xs text-[#97A0AF] w-8">{pct}%</span>
    </div>
  )
}

export default function Reports() {
  const { bugs, features, sprints, projectMembers, project } = useStore()

  const allIssues = [...bugs, ...features]
  const total     = allIssues.length
  const openCount = allIssues.filter(i => i.status !== 'done').length
  const doneCount = allIssues.filter(i => i.status === 'done').length

  const activeSprint = sprints.find(s => s.status === 'active')
  const sprintItems  = activeSprint
    ? [...bugs.filter(b => b.sprint_id === activeSprint.id), ...features.filter(f => f.sprint_id === activeSprint.id)]
    : []
  const sprintDone   = sprintItems.filter(i => i.status === 'done').length
  const sprintPct    = sprintItems.length > 0 ? Math.round((sprintDone / sprintItems.length) * 100) : 0

  // Priority breakdown (bugs only)
  const byPriority = (['critical','high','medium','low'] as Priority[]).map(p => ({
    p, count: bugs.filter(b => b.priority === p).length,
  }))

  // Status breakdown across all issues
  const byStatus = (['todo','in_progress','review','done'] as Status[]).map(s => ({
    s, count: allIssues.filter(i => i.status === s).length,
  }))

  // Sprint velocity: completed items per sprint
  const completedSprints = sprints.filter(s => s.status === 'completed').slice(0, 5)
  const velocity = completedSprints.map(sp => {
    const n = bugs.filter(b => b.sprint_id === sp.id && b.status === 'done').length
           + features.filter(f => f.sprint_id === sp.id && f.status === 'done').length
    return { name: sp.name.length > 12 ? sp.name.slice(0,12) + '…' : sp.name, count: n }
  })
  const maxVelocity = Math.max(...velocity.map(v => v.count), 1)

  // Assignee workload
  const assigneeCounts: Record<string, { name: string; count: number }> = {}
  allIssues.forEach(i => {
    if ((i as any).assignee) {
      const a = (i as any).assignee
      if (!assigneeCounts[a.id]) assigneeCounts[a.id] = { name: a.name, count: 0 }
      assigneeCounts[a.id].count++
    }
  })
  const workload = Object.values(assigneeCounts).sort((a, b) => b.count - a.count).slice(0, 5)

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-[#0052CC]" />
          <h1 className="text-xl font-bold text-[#172B4D]">Reports</h1>
        </div>
        <p className="text-sm text-[#5E6C84] mt-0.5">{project?.name} · Analytics overview</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Issues',  value: bugs.length,    icon: Bug,          color: '#DE350B', bg: '#FFEBE6' },
          { label: 'Open',          value: openCount,       icon: AlertCircle,  color: '#FF8B00', bg: '#FFFAE6' },
          { label: 'In Progress',   value: bugs.filter(b => b.status === 'in_progress').length, icon: Clock, color: '#0052CC', bg: '#DEEBFF' },
          { label: 'Completed',     value: doneCount,       icon: CheckCircle2, color: '#36B37E', bg: '#E3FCEF' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-lg border border-[#DFE1E6] p-4"
            style={{ boxShadow: '0 1px 2px rgba(9,30,66,0.08)' }}>
            <div className="w-8 h-8 rounded flex items-center justify-center mb-3" style={{ background: bg }}>
              <Icon style={{ width: 16, height: 16, color }} />
            </div>
            <div className="text-2xl font-bold text-[#172B4D]">{value}</div>
            <div className="text-xs font-medium text-[#5E6C84] mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Priority distribution */}
        <div className="bg-white rounded-lg border border-[#DFE1E6] p-5"
          style={{ boxShadow: '0 1px 2px rgba(9,30,66,0.08)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Bug className="w-4 h-4 text-[#DE350B]" />
            <h3 className="text-sm font-bold text-[#172B4D]">Issues by Priority</h3>
          </div>
          <div className="space-y-3">
            {byPriority.map(({ p, count }) => (
              <BarRow key={p}
                label={PRIORITY_COLOR[p].label}
                value={count}
                total={bugs.length || 1}
                color={PRIORITY_COLOR[p].bar} />
            ))}
          </div>
          {bugs.length === 0 && <p className="text-xs text-[#B3BAC5] text-center py-4">No issues yet</p>}
        </div>

        {/* Status distribution */}
        <div className="bg-white rounded-lg border border-[#DFE1E6] p-5"
          style={{ boxShadow: '0 1px 2px rgba(9,30,66,0.08)' }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-[#0052CC]" />
            <h3 className="text-sm font-bold text-[#172B4D]">All Issues by Status</h3>
          </div>
          <div className="space-y-3">
            {byStatus.map(({ s, count }) => (
              <BarRow key={s}
                label={STATUS_COLOR[s].label}
                value={count}
                total={total || 1}
                color={STATUS_COLOR[s].bar} />
            ))}
          </div>
          {total === 0 && <p className="text-xs text-[#B3BAC5] text-center py-4">No issues yet</p>}
        </div>

        {/* Sprint velocity */}
        <div className="bg-white rounded-lg border border-[#DFE1E6] p-5"
          style={{ boxShadow: '0 1px 2px rgba(9,30,66,0.08)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Rocket className="w-4 h-4 text-[#36B37E]" />
            <h3 className="text-sm font-bold text-[#172B4D]">Sprint Velocity</h3>
            <span className="ml-auto text-xs text-[#97A0AF]">Completed issues per sprint</span>
          </div>
          {velocity.length > 0 ? (
            <div className="flex items-end gap-3 h-28">
              {velocity.map((v, i) => (
                <div key={i} className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-xs font-bold text-[#172B4D]">{v.count}</span>
                  <div className="w-full rounded-t"
                    style={{
                      height: `${Math.max((v.count / maxVelocity) * 80, 4)}px`,
                      background: '#0052CC',
                      opacity: 0.7 + (i / velocity.length) * 0.3,
                    }} />
                  <span className="text-[9px] text-[#97A0AF] truncate w-full text-center">{v.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-28 text-center">
              <Rocket className="w-6 h-6 text-[#B3BAC5] mb-2" />
              <p className="text-xs text-[#B3BAC5]">No completed sprints yet</p>
            </div>
          )}
        </div>

        {/* Team workload */}
        <div className="bg-white rounded-lg border border-[#DFE1E6] p-5"
          style={{ boxShadow: '0 1px 2px rgba(9,30,66,0.08)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-[#6554C0]" />
            <h3 className="text-sm font-bold text-[#172B4D]">Team Workload</h3>
            <span className="ml-auto text-xs text-[#97A0AF]">Open issues per member</span>
          </div>
          {workload.length > 0 ? (
            <div className="space-y-3">
              {workload.map(({ name, count }) => (
                <div key={name} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                    style={{ background: `hsl(${name.charCodeAt(0) * 10 % 360}, 60%, 45%)` }}>
                    {name[0]?.toUpperCase()}
                  </div>
                  <span className="text-xs text-[#44546F] flex-1 truncate">{name}</span>
                  <div className="w-24 h-2 bg-[#F4F5F7] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#6554C0]"
                      style={{ width: `${Math.min((count / (workload[0]?.count || 1)) * 100, 100)}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-[#172B4D] w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-24 text-center">
              <Users className="w-6 h-6 text-[#B3BAC5] mb-2" />
              <p className="text-xs text-[#B3BAC5]">No assigned issues yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Active sprint progress */}
      {activeSprint && (
        <div className="bg-white rounded-lg border border-[#DFE1E6] p-5"
          style={{ boxShadow: '0 1px 2px rgba(9,30,66,0.08)' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-[#36B37E]" />
            <h3 className="text-sm font-bold text-[#172B4D]">Active Sprint: {activeSprint.name}</h3>
            <span className="ml-auto text-xs text-[#97A0AF]">
              {activeSprint.start_date} → {activeSprint.end_date}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-[#5E6C84] mb-2">
            <span>{sprintDone} of {sprintItems.length} issues completed</span>
            <span className="font-bold text-[#172B4D]">{sprintPct}%</span>
          </div>
          <div className="h-3 bg-[#F4F5F7] rounded-full overflow-hidden">
            <div className="h-full bg-[#36B37E] rounded-full transition-all duration-700"
              style={{ width: `${sprintPct}%` }} />
          </div>
          {activeSprint.goal && (
            <p className="text-xs text-[#5E6C84] mt-3 italic">Goal: {activeSprint.goal}</p>
          )}
        </div>
      )}
    </div>
  )
}
