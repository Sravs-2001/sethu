'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import { Bug, Sparkles, Rocket, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge'
import { formatDistanceToNow } from 'date-fns'

export default function Dashboard() {
  const { bugs, features, sprints, setBugs, setFeatures, setSprints } = useStore()

  useEffect(() => {
    supabase.from('bugs').select('*, assignee:profiles(*)').order('created_at', { ascending: false })
      .then(({ data }) => data && setBugs(data as any))
    supabase.from('features').select('*, assignee:profiles(*)').order('created_at', { ascending: false })
      .then(({ data }) => data && setFeatures(data as any))
    supabase.from('sprints').select('*').order('created_at', { ascending: false })
      .then(({ data }) => data && setSprints(data))
  }, [])

  const activeSprint = sprints.find((s) => s.status === 'active')
  const openBugs = bugs.filter((b) => b.status !== 'done')
  const criticalBugs = bugs.filter((b) => b.priority === 'critical' && b.status !== 'done')
  const inProgressFeatures = features.filter((f) => f.status === 'in_progress')
  const completedBugs = bugs.filter((b) => b.status === 'done')

  const stats = [
    { label: 'Open Bugs', value: openBugs.length, icon: Bug, color: 'text-red-500', bg: 'bg-red-50' },
    { label: 'Critical', value: criticalBugs.length, icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'In Progress', value: inProgressFeatures.length, icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Resolved', value: completedBugs.length, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
  ]

  const recent = [
    ...bugs.slice(0, 3).map((b) => ({ ...b, kind: 'bug' as const })),
    ...features.slice(0, 3).map((f) => ({ ...f, kind: 'feature' as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Overview of your team&apos;s work</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-5">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-sm text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {activeSprint && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Rocket className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-gray-900">Active Sprint</span>
            <span className="ml-auto text-xs text-gray-400">
              {activeSprint.start_date} → {activeSprint.end_date}
            </span>
          </div>
          <div className="text-lg font-medium text-gray-800">{activeSprint.name}</div>
          {activeSprint.goal && <p className="text-sm text-gray-500 mt-1">{activeSprint.goal}</p>}
          <div className="mt-4 flex gap-6">
            {(['todo', 'in_progress', 'review', 'done'] as const).map((s) => {
              const count = [
                ...bugs.filter((b) => b.sprint_id === activeSprint.id),
                ...features.filter((f) => f.sprint_id === activeSprint.id),
              ].filter((i) => i.status === s).length
              const labels = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' }
              return (
                <div key={s} className="text-center">
                  <div className="text-xl font-bold text-gray-900">{count}</div>
                  <div className="text-xs text-gray-500">{labels[s]}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <span className="font-semibold text-gray-900">Recent Activity</span>
        </div>
        <div className="divide-y divide-gray-50">
          {recent.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">No items yet. Create a bug or feature to get started.</div>
          ) : recent.map((item) => (
            <div key={item.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50">
              {item.kind === 'bug'
                ? <Bug className="w-4 h-4 text-red-400 flex-shrink-0" />
                : <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">{item.title}</div>
                <div className="text-xs text-gray-400">{item.kind === 'bug' ? 'Bug' : 'Feature'}</div>
              </div>
              <PriorityBadge priority={item.priority} />
              <StatusBadge status={item.status} />
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
