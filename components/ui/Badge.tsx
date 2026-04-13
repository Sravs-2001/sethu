'use client'

import type { Priority, Status } from '@/types'

const PRIORITY_STYLE: Record<Priority, { dotColor: string; bg: string; color: string; label: string }> = {
  critical: { dotColor: '#DE350B', bg: '#FFEBE6', color: '#BF2600', label: 'Critical' },
  high:     { dotColor: '#FF8B00', bg: '#FFFAE6', color: '#974F0C', label: 'High'     },
  medium:   { dotColor: '#F79233', bg: '#FFF7D6', color: '#7A4800', label: 'Medium'   },
  low:      { dotColor: '#36B37E', bg: '#E3FCEF', color: '#006644', label: 'Low'      },
}

const STATUS_STYLE: Record<Status, { dotColor: string; bg: string; color: string; label: string }> = {
  todo:        { dotColor: '#97A0AF', bg: '#DFE1E6', color: '#42526E', label: 'To Do'       },
  in_progress: { dotColor: '#0052CC', bg: '#DEEBFF', color: '#0747A6', label: 'In Progress' },
  review:      { dotColor: '#6554C0', bg: '#EAE6FF', color: '#403294', label: 'In Review'   },
  done:        { dotColor: '#36B37E', bg: '#E3FCEF', color: '#006644', label: 'Done'        },
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const s = PRIORITY_STYLE[priority]
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded-full"
      style={{ background: s.bg, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dotColor }} />
      {s.label}
    </span>
  )
}

export function StatusBadge({ status }: { status: Status }) {
  const s = STATUS_STYLE[status]
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded-full"
      style={{ background: s.bg, color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dotColor }} />
      {s.label}
    </span>
  )
}
