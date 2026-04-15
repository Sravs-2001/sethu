// ── Primitives ────────────────────────────────────────────────────────────────

export type Priority     = 'critical' | 'high' | 'medium' | 'low'
export type Status       = 'todo' | 'in_progress' | 'review' | 'done'
export type SprintStatus = 'planning' | 'active' | 'completed'
export type IssueType    = 'epic' | 'story' | 'task' | 'bug' | 'subtask'
export type View         = 'board' | 'backlog' | 'bugs' | 'features' | 'chat' | 'team' | 'projects' | 'reports' | 'settings'
export type Theme        = 'light' | 'dark'

/** Role within a specific project */
export type ProjectRole = 'admin' | 'manager' | 'developer' | 'viewer'

/** Global site role */
export type SiteRole = 'admin' | 'member'

// ── Entities ──────────────────────────────────────────────────────────────────

export interface Profile {
  id:          string
  name:        string
  avatar_url?: string
  role:        SiteRole
  created_at:  string
}

export interface Project {
  id:            string
  name:          string
  key:           string
  description?:  string
  avatar_color:  string
  created_by:    string
  created_at:    string
  /** Default layout chosen by admin */
  default_layout?: 'kanban' | 'sprint' | 'analytics' | 'list'
}

export interface ProjectMember {
  id:          string
  project_id:  string
  user_id:     string
  role:        ProjectRole
  invited_by?: string
  created_at:  string
  profile?:    Profile
}

export interface TeamInvite {
  email:       string
  role:        ProjectRole
  project_id?: string
}

export interface InviteToken {
  id:          string
  token:       string
  project_id:  string
  role:        ProjectRole
  created_by:  string
  uses:        number
  max_uses?:   number
  expires_at?: string
  created_at:  string
}

// ── Issues / Tasks ────────────────────────────────────────────────────────────

export interface Bug {
  id:            string
  project_id?:   string
  title:         string
  description:   string
  priority:      Priority
  status:        Status
  issue_type:    IssueType
  assignee_id?:  string
  assignee?:     Profile
  reporter_id?:  string
  reporter?:     Profile
  sprint_id?:    string
  due_date?:     string
  labels?:       string[]
  created_by:    string
  tags:          string[]
  created_at:    string
  updated_at:    string
  comment_count?: number
  sort_order?:   number
}

/** Alias for Bug – used by the new Kanban board */
export type Task = Bug

// ── Comments ──────────────────────────────────────────────────────────────────

export interface Comment {
  id:         string
  task_id:    string
  user_id:    string
  user?:      Profile
  content:    string
  created_at: string
  updated_at: string
}

// ── Activity ──────────────────────────────────────────────────────────────────

export interface ActivityLog {
  id:         string
  task_id:    string
  user_id:    string
  user?:      Profile
  action:     'created' | 'status_changed' | 'priority_changed' | 'assigned' | 'commented' | 'type_changed' | 'due_date_set' | 'sprint_changed'
  from?:      string
  to?:        string
  created_at: string
}

// ── Notifications ─────────────────────────────────────────────────────────────

export type NotificationType =
  | 'task_assigned'
  | 'status_changed'
  | 'mentioned'
  | 'invite_received'
  | 'comment_added'
  | 'due_soon'

export interface Notification {
  id:         string
  user_id:    string
  type:       NotificationType
  title:      string
  body:       string
  read:       boolean
  link?:      string
  data?:      Record<string, unknown>
  created_at: string
}

// ── Sprints ───────────────────────────────────────────────────────────────────

export interface Sprint {
  id:          string
  project_id?: string
  name:        string
  goal?:       string
  start_date:  string
  end_date:    string
  status:      SprintStatus
  created_at:  string
}

// ── Feature ───────────────────────────────────────────────────────────────────

export interface Feature {
  id:            string
  project_id?:   string
  title:         string
  description:   string
  priority:      Priority
  status:        Status
  assignee_id?:  string
  assignee?:     Profile
  sprint_id?:    string
  created_by:    string
  created_at:    string
  updated_at:    string
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export interface Channel {
  id:           string
  name:         string
  description?: string
  created_at:   string
}

export interface Message {
  id:         string
  channel_id: string
  user_id:    string
  user?:      Profile
  content:    string
  created_at: string
}
