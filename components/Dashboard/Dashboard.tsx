'use client'

import { useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { bugService, featureService, sprintService } from '@/lib/services'
import { Bug, Sparkles, Rocket, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge'
import { STATUSES, STATUS_CONFIG, colors } from '@/lib/constants'
import { formatDistanceToNow } from 'date-fns'

export default function Dashboard() {
  const { bugs, features, sprints, setBugs, setFeatures, setSprints, project } = useStore()

  useEffect(() => {
    if (!project) return
    bugService.getByProject(project.id).then(({ data }) => data && setBugs(data as any))
    featureService.getByProject(project.id).then(({ data }) => data && setFeatures(data as any))
    sprintService.getByProject(project.id).then(({ data }) => data && setSprints(data ?? []))
  }, [project?.id])

  const activeSprint       = sprints.find(s => s.status === 'active')
  const openBugs           = bugs.filter(b => b.status !== 'done')
  const criticalBugs       = bugs.filter(b => b.priority === 'critical' && b.status !== 'done')
  const inProgressFeatures = features.filter(f => f.status === 'in_progress')
  const completedBugs      = bugs.filter(b => b.status === 'done')

  const stats = [
    { label: 'Open Bugs',   value: openBugs.length,           icon: Bug,          iconColor: colors.red,    iconBg: colors.redLight    },
    { label: 'Critical',    value: criticalBugs.length,        icon: AlertCircle,  iconColor: colors.orange, iconBg: colors.orangeLight },
    { label: 'In Progress', value: inProgressFeatures.length,  icon: Clock,        iconColor: colors.blue,   iconBg: colors.blueLight   },
    { label: 'Resolved',    value: completedBugs.length,       icon: CheckCircle2, iconColor: colors.green,  iconBg: colors.greenLight  },
  ]

  const recent = [
    ...bugs.slice(0, 3).map(b => ({ ...b, kind: 'bug'     as const })),
    ...features.slice(0, 3).map(f => ({ ...f, kind: 'feature' as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6)

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold" style={{ color: colors.textPrimary }}>Dashboard</h1>
        <p className="text-sm mt-0.5" style={{ color: colors.textSecondary }}>Overview of your team's work</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, iconColor, iconBg }) => (
          <div key={label} className="card p-5">
            <div className="w-8 h-8 rounded flex items-center justify-center mb-3"
              style={{ background: iconBg }}>
              <Icon style={{ width: '16px', height: '16px', color: iconColor }} />
            </div>
            <div className="text-2xl font-bold leading-none" style={{ color: colors.textPrimary }}>{value}</div>
            <div className="text-xs mt-1.5 font-medium" style={{ color: colors.textSecondary }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Active sprint */}
      {activeSprint && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full" style={{ background: colors.green }} />
            <span className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: colors.textSecondary }}>
              Active Sprint
            </span>
            <span className="ml-auto text-xs" style={{ color: colors.textLight }}>
              {activeSprint.start_date} → {activeSprint.end_date}
            </span>
          </div>
          <div className="text-base font-semibold mb-1" style={{ color: colors.textPrimary }}>
            {activeSprint.name}
          </div>
          {activeSprint.goal && (
            <p className="text-sm mb-4" style={{ color: colors.textMuted }}>{activeSprint.goal}</p>
          )}
          <div className="flex gap-6 mt-4">
            {STATUSES.map(s => {
              const count = [
                ...bugs.filter(b => b.sprint_id === activeSprint.id),
                ...features.filter(f => f.sprint_id === activeSprint.id),
              ].filter(i => i.status === s).length
              return (
                <div key={s} className="flex flex-col gap-0.5">
                  <div className="text-xl font-bold" style={{ color: STATUS_CONFIG[s].topColor }}>{count}</div>
                  <div className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                    {STATUS_CONFIG[s].label}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5" style={{ borderBottom: `1px solid ${colors.border}` }}>
          <span className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: colors.textSecondary }}>
            Recent Activity
          </span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Title</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm"
                  style={{ color: colors.textFaint }}>
                  No items yet. Create a bug or feature to get started.
                </td>
              </tr>
            ) : recent.map(item => (
              <tr key={item.id}>
                <td>
                  <div className="flex items-center gap-1.5">
                    {item.kind === 'bug'
                      ? <Bug      className="w-3.5 h-3.5" style={{ color: colors.red    }} />
                      : <Sparkles className="w-3.5 h-3.5" style={{ color: colors.purple }} />
                    }
                    <span className="text-xs capitalize" style={{ color: colors.textFaint }}>
                      {item.kind}
                    </span>
                  </div>
                </td>
                <td className="font-medium max-w-[220px] truncate" style={{ color: colors.textPrimary }}>
                  {item.title}
                </td>
                <td><PriorityBadge priority={item.priority} /></td>
                <td><StatusBadge status={item.status} /></td>
                <td className="whitespace-nowrap text-xs" style={{ color: colors.textFaint }}>
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
