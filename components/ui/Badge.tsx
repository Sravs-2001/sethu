'use client'

import type { Priority, Status } from '@/types'
import { PRIORITY_CONFIG, STATUS_CONFIG } from '@/lib/constants'

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { bg, color, dotColor, label } = PRIORITY_CONFIG[priority]
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded-full"
      style={{ background: bg, color }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dotColor }} />
      {label}
    </span>
  )
}

export function StatusBadge({ status }: { status: Status }) {
  const { bg, color, dotColor, label } = STATUS_CONFIG[status]
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded-full"
      style={{ background: bg, color }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dotColor }} />
      {label}
    </span>
  )
}
