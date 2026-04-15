/**
 * Design tokens & shared configuration.
 * All colours, labels and lookup maps live here — import from this file
 * instead of repeating hex literals across components.
 */

import type { Priority, Status, IssueType, SprintStatus } from '@/types'

// ── Colour palette ────────────────────────────────────────────────────────────

export const colors = {
  // Text hierarchy
  textPrimary:     '#172B4D',
  textSecondary:   '#5E6C84',
  textMuted:       '#42526E',
  textNav:         '#44546F',
  textSubtle:      '#626F86',
  textFaint:       '#7A869A',
  textLight:       '#97A0AF',
  textPlaceholder: '#B3BAC5',

  // Surfaces & borders
  border:          '#DFE1E6',
  surfaceLight:    '#F4F5F7',
  surfaceLighter:  '#F8F9FC',
  white:           '#FFFFFF',

  // Blue – primary brand
  blue:            '#0052CC',
  blueDark:        '#0747A6',
  blueLight:       '#DEEBFF',
  blueFocus:       '#4C9AFF',
  blueNavActive:   '#E8EDFF',

  // Purple
  purple:          '#6554C0',
  purpleDark:      '#403294',
  purpleLight:     '#EAE6FF',

  // Green
  green:           '#36B37E',
  greenDark:       '#006644',
  greenLight:      '#E3FCEF',

  // Red / destructive
  red:             '#DE350B',
  redDark:         '#BF2600',
  redLight:        '#FFEBE6',

  // Orange / warning
  orange:          '#FF8B00',
  orangeWarm:      '#FF991F',
  orangeLight:     '#FFFAE6',

  // Amber / medium priority
  amber:           '#F79233',
  amberDark:       '#7A4800',
  amberLight:      '#FFF7D6',

  // Teal
  teal:            '#00B8D9',
  tealVivid:       '#FF5630',
} as const

// ── Avatar colour palette ─────────────────────────────────────────────────────

export const AVATAR_COLORS: readonly string[] = [
  colors.blue, colors.purple, colors.teal,
  colors.green, colors.tealVivid, colors.orangeWarm,
  colors.textPrimary, colors.purpleDark,
]

// ── Status ────────────────────────────────────────────────────────────────────

export const STATUSES: Status[] = ['todo', 'in_progress', 'review', 'done']

export const STATUS_CONFIG: Record<Status, {
  label:    string
  dotColor: string
  bg:       string
  color:    string
  topColor: string
}> = {
  todo:        { label: 'To Do',       dotColor: colors.textLight,  bg: colors.border,      color: colors.textMuted,   topColor: colors.border      },
  in_progress: { label: 'In Progress', dotColor: colors.blue,       bg: colors.blueLight,   color: colors.blueDark,    topColor: colors.blue        },
  review:      { label: 'Review',      dotColor: colors.purple,     bg: colors.purpleLight, color: colors.purpleDark,  topColor: colors.purple      },
  done:        { label: 'Done',        dotColor: colors.green,      bg: colors.greenLight,  color: colors.greenDark,   topColor: colors.green       },
}

// ── Priority ──────────────────────────────────────────────────────────────────

export const PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low']

export const PRIORITY_CONFIG: Record<Priority, {
  label:    string
  dotColor: string
  bg:       string
  color:    string
}> = {
  critical: { label: 'Critical', dotColor: colors.red,    bg: colors.redLight,    color: colors.redDark    },
  high:     { label: 'High',     dotColor: colors.orange, bg: colors.orangeLight, color: '#974F0C'         },
  medium:   { label: 'Medium',   dotColor: colors.amber,  bg: colors.amberLight,  color: colors.amberDark  },
  low:      { label: 'Low',      dotColor: colors.green,  bg: colors.greenLight,  color: colors.greenDark  },
}

// ── Issue types ───────────────────────────────────────────────────────────────

export const ISSUE_TYPES: IssueType[] = ['epic', 'story', 'task', 'bug', 'subtask']

export const ISSUE_TYPE_CONFIG: Record<IssueType, {
  label: string
  icon:  string
  color: string
  bg:    string
}> = {
  epic:    { label: 'Epic',    icon: '⚡', color: colors.purple,  bg: colors.purpleLight },
  story:   { label: 'Story',   icon: '📖', color: colors.green,   bg: colors.greenLight  },
  task:    { label: 'Task',    icon: '☑️', color: colors.blue,    bg: colors.blueLight   },
  bug:     { label: 'Bug',     icon: '🐛', color: colors.red,     bg: colors.redLight    },
  subtask: { label: 'Subtask', icon: '↳',  color: colors.textSubtle, bg: colors.surfaceLight },
}

// ── Sprint status ─────────────────────────────────────────────────────────────

export const SPRINT_STATUS_CONFIG: Record<SprintStatus, {
  label: string
  bg:    string
  color: string
}> = {
  planning:  { label: 'Planning',  bg: colors.border,     color: colors.textMuted  },
  active:    { label: 'Active',    bg: colors.greenLight,  color: colors.greenDark  },
  completed: { label: 'Completed', bg: colors.blueLight,   color: colors.blueDark   },
}
