'use client'

import { create } from 'zustand'
import type {
  Bug, Feature, Sprint, Channel, Message, Profile,
  Project, ProjectMember, View, Notification, Comment, Theme,
} from '@/types'

interface AppState {
  // ── Auth ────────────────────────────────────────────────────────────────────
  user:    Profile | null
  setUser: (user: Profile | null) => void

  // ── Projects ─────────────────────────────────────────────────────────────
  projects:    Project[]
  setProjects: (projects: Project[]) => void
  addProject:  (project: Project) => void

  project:    Project | null
  setProject: (project: Project | null) => void

  // ── UI state ──────────────────────────────────────────────────────────────
  activeView:    View
  setActiveView: (view: View) => void

  theme:    Theme
  setTheme: (theme: Theme) => void

  // ── Bugs / Tasks ──────────────────────────────────────────────────────────
  bugs:       Bug[]
  setBugs:    (bugs: Bug[]) => void
  addBug:     (bug: Bug) => void
  updateBug:  (id: string, bug: Partial<Bug>) => void
  deleteBug:  (id: string) => void

  // ── Features ──────────────────────────────────────────────────────────────
  features:       Feature[]
  setFeatures:    (features: Feature[]) => void
  addFeature:     (feature: Feature) => void
  updateFeature:  (id: string, feature: Partial<Feature>) => void
  deleteFeature:  (id: string) => void

  // ── Sprints ───────────────────────────────────────────────────────────────
  sprints:      Sprint[]
  setSprints:   (sprints: Sprint[]) => void
  addSprint:    (sprint: Sprint) => void
  updateSprint: (id: string, sprint: Partial<Sprint>) => void

  // ── Team ──────────────────────────────────────────────────────────────────
  profiles:           Profile[]
  setProfiles:        (profiles: Profile[]) => void

  projectMembers:        ProjectMember[]
  setProjectMembers:     (members: ProjectMember[]) => void
  addProjectMember:      (member: ProjectMember) => void
  removeProjectMember:   (id: string) => void

  // ── Comments ──────────────────────────────────────────────────────────────
  /** Keyed by task id */
  comments:       Record<string, Comment[]>
  setComments:    (taskId: string, comments: Comment[]) => void
  addComment:     (comment: Comment) => void
  deleteComment:  (taskId: string, commentId: string) => void

  // ── Notifications ─────────────────────────────────────────────────────────
  notifications:         Notification[]
  setNotifications:      (notifications: Notification[]) => void
  addNotification:       (notification: Notification) => void
  markNotificationRead:  (id: string) => void
  markAllNotificationsRead: () => void

  // ── Chat ──────────────────────────────────────────────────────────────────
  channels:         Channel[]
  setChannels:      (channels: Channel[]) => void
  activeChannel:    Channel | null
  setActiveChannel: (channel: Channel) => void
  messages:         Record<string, Message[]>
  setMessages:      (channelId: string, messages: Message[]) => void
  addMessage:       (message: Message) => void
}

export const useStore = create<AppState>((set) => ({
  // ── Auth ───────────────────────────────────────────────────────────────────
  user:    null,
  setUser: (user) => set({ user }),

  // ── Projects ──────────────────────────────────────────────────────────────
  projects:    [],
  setProjects: (projects) => set({ projects }),
  addProject:  (project) => set((s) => ({ projects: [...s.projects, project] })),

  project:    null,
  setProject: (project) => set({ project }),

  // ── UI state ─────────────────────────────────────────────────────────────
  activeView:    'board',
  setActiveView: (activeView) => set({ activeView }),

  theme:    'light',
  setTheme: (theme) => set({ theme }),

  // ── Bugs / Tasks ─────────────────────────────────────────────────────────
  bugs:    [],
  setBugs: (bugs) => set({ bugs }),
  addBug:  (bug) => set((s) => ({ bugs: [bug, ...s.bugs] })),
  updateBug: (id, data) =>
    set((s) => ({ bugs: s.bugs.map((b) => (b.id === id ? { ...b, ...data } : b)) })),
  deleteBug: (id) => set((s) => ({ bugs: s.bugs.filter((b) => b.id !== id) })),

  // ── Features ─────────────────────────────────────────────────────────────
  features:    [],
  setFeatures: (features) => set({ features }),
  addFeature:  (feature) => set((s) => ({ features: [feature, ...s.features] })),
  updateFeature: (id, data) =>
    set((s) => ({ features: s.features.map((f) => (f.id === id ? { ...f, ...data } : f)) })),
  deleteFeature: (id) => set((s) => ({ features: s.features.filter((f) => f.id !== id) })),

  // ── Sprints ───────────────────────────────────────────────────────────────
  sprints:    [],
  setSprints: (sprints) => set({ sprints }),
  addSprint:  (sprint) => set((s) => ({ sprints: [sprint, ...s.sprints] })),
  updateSprint: (id, data) =>
    set((s) => ({ sprints: s.sprints.map((sp) => (sp.id === id ? { ...sp, ...data } : sp)) })),

  // ── Team ──────────────────────────────────────────────────────────────────
  profiles:    [],
  setProfiles: (profiles) => set({ profiles }),

  projectMembers:      [],
  setProjectMembers:   (projectMembers) => set({ projectMembers }),
  addProjectMember:    (member) => set((s) => ({ projectMembers: [...s.projectMembers, member] })),
  removeProjectMember: (id) =>
    set((s) => ({ projectMembers: s.projectMembers.filter((m) => m.id !== id) })),

  // ── Comments ─────────────────────────────────────────────────────────────
  comments:    {},
  setComments: (taskId, comments) =>
    set((s) => ({ comments: { ...s.comments, [taskId]: comments } })),
  addComment: (comment) =>
    set((s) => {
      const existing = s.comments[comment.task_id] ?? []
      return { comments: { ...s.comments, [comment.task_id]: [...existing, comment] } }
    }),
  deleteComment: (taskId, commentId) =>
    set((s) => ({
      comments: {
        ...s.comments,
        [taskId]: (s.comments[taskId] ?? []).filter((c) => c.id !== commentId),
      },
    })),

  // ── Notifications ─────────────────────────────────────────────────────────
  notifications:    [],
  setNotifications: (notifications) => set({ notifications }),
  addNotification:  (notification) =>
    set((s) => ({ notifications: [notification, ...s.notifications] })),
  markNotificationRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    })),
  markAllNotificationsRead: () =>
    set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),

  // ── Chat ──────────────────────────────────────────────────────────────────
  channels:         [],
  setChannels:      (channels) => set({ channels }),
  activeChannel:    null,
  setActiveChannel: (activeChannel) => set({ activeChannel }),
  messages:         {},
  setMessages:      (channelId, messages) =>
    set((s) => ({ messages: { ...s.messages, [channelId]: messages } })),
  addMessage: (message) =>
    set((s) => {
      const existing = s.messages[message.channel_id] ?? []
      return { messages: { ...s.messages, [message.channel_id]: [...existing, message] } }
    }),
}))
