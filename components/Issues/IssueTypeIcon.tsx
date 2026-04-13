'use client'

// Jira-style colored issue type icons
export type IssueKind = 'bug' | 'story' | 'task' | 'epic'

const CONFIG: Record<IssueKind, { bg: string; label: string; symbol: string }> = {
  bug:   { bg: '#FF5630', label: 'Bug',   symbol: '🐛' },
  story: { bg: '#36B37E', label: 'Story', symbol: '📖' },
  task:  { bg: '#2684FF', label: 'Task',  symbol: '✓'  },
  epic:  { bg: '#6554C0', label: 'Epic',  symbol: '⚡' },
}

export default function IssueTypeIcon({ kind, size = 16 }: { kind: IssueKind; size?: number }) {
  const config = CONFIG[kind] ?? CONFIG.task
  return (
    <span
      title={config.label}
      className="inline-flex items-center justify-center rounded-sm font-bold text-white flex-shrink-0"
      style={{ width: size, height: size, background: config.bg, fontSize: size * 0.65 }}
    >
      {config.symbol}
    </span>
  )
}

export { CONFIG as ISSUE_TYPE_CONFIG }
