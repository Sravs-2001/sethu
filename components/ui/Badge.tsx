'use client'

import clsx from 'clsx'
import type { Priority, Status } from '@/types'

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
      priority === 'critical' && 'bg-red-100 text-red-700',
      priority === 'high' && 'bg-orange-100 text-orange-700',
      priority === 'medium' && 'bg-yellow-100 text-yellow-700',
      priority === 'low' && 'bg-gray-100 text-gray-600',
    )}>
      <span className={clsx(
        'w-1.5 h-1.5 rounded-full',
        priority === 'critical' && 'bg-red-500',
        priority === 'high' && 'bg-orange-500',
        priority === 'medium' && 'bg-yellow-500',
        priority === 'low' && 'bg-gray-400',
      )} />
      {priority}
    </span>
  )
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
      status === 'todo' && 'bg-gray-100 text-gray-600',
      status === 'in_progress' && 'bg-blue-100 text-blue-700',
      status === 'review' && 'bg-purple-100 text-purple-700',
      status === 'done' && 'bg-green-100 text-green-700',
    )}>
      {status === 'in_progress' ? 'In Progress' : status === 'todo' ? 'To Do' : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}
