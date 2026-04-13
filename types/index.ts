export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type Status = 'todo' | 'in_progress' | 'review' | 'done';
export type SprintStatus = 'planning' | 'active' | 'completed';
export type IssueType = 'bug' | 'story' | 'task' | 'epic';
export type View = 'board' | 'backlog' | 'issues' | 'sprints' | 'dashboard' | 'team' | 'chat' | 'bugs' | 'features';

export interface Project {
  id: string;
  name: string;
  key: string;
  description?: string;
  avatar_color: string;
  created_by: string;
  created_at: string;
}

export interface TeamInvite {
  email: string;
  role: 'admin' | 'member';
}

export interface Profile {
  id: string;
  name: string;
  avatar_url?: string;
  role: 'admin' | 'member';
  created_at: string;
}

export interface Bug {
  id: string;
  project_id?: string;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  assignee_id?: string;
  assignee?: Profile;
  sprint_id?: string;
  created_by: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Feature {
  id: string;
  project_id?: string;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  assignee_id?: string;
  assignee?: Profile;
  sprint_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Sprint {
  id: string;
  project_id?: string;
  name: string;
  goal?: string;
  start_date: string;
  end_date: string;
  status: SprintStatus;
  created_at: string;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  user?: Profile;
  content: string;
  created_at: string;
}

// Unified issue type for board/backlog views
export type UnifiedIssue = (Bug & { kind: 'bug' }) | (Feature & { kind: 'feature' });
