'use client'

import { create } from 'zustand'
import type { Bug, Feature, Sprint, Channel, Message, Profile, Project, ProjectMember, View } from '@/types'

interface AppState {
  user: Profile | null
  setUser: (user: Profile | null) => void

  projects: Project[]
  setProjects: (projects: Project[]) => void
  addProject: (project: Project) => void

  project: Project | null
  setProject: (project: Project | null) => void

  activeView: View
  setActiveView: (view: View) => void

  bugs: Bug[]
  setBugs: (bugs: Bug[]) => void
  addBug: (bug: Bug) => void
  updateBug: (id: string, bug: Partial<Bug>) => void
  deleteBug: (id: string) => void

  features: Feature[]
  setFeatures: (features: Feature[]) => void
  addFeature: (feature: Feature) => void
  updateFeature: (id: string, feature: Partial<Feature>) => void
  deleteFeature: (id: string) => void

  sprints: Sprint[]
  setSprints: (sprints: Sprint[]) => void
  addSprint: (sprint: Sprint) => void
  updateSprint: (id: string, sprint: Partial<Sprint>) => void

  profiles: Profile[]
  setProfiles: (profiles: Profile[]) => void

  projectMembers: ProjectMember[]
  setProjectMembers: (members: ProjectMember[]) => void
  addProjectMember: (member: ProjectMember) => void
  removeProjectMember: (id: string) => void

  channels: Channel[]
  setChannels: (channels: Channel[]) => void
  activeChannel: Channel | null
  setActiveChannel: (channel: Channel) => void
  messages: Record<string, Message[]>
  setMessages: (channelId: string, messages: Message[]) => void
  addMessage: (message: Message) => void
}

export const useStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),

  projects: [],
  setProjects: (projects) => set({ projects }),
  addProject: (project) => set((s) => ({ projects: [...s.projects, project] })),

  project: null,
  setProject: (project) => set({ project }),

  activeView: 'board',
  setActiveView: (activeView) => set({ activeView }),

  bugs: [],
  setBugs: (bugs) => set({ bugs }),
  addBug: (bug) => set((s) => ({ bugs: [bug, ...s.bugs] })),
  updateBug: (id, data) =>
    set((s) => ({ bugs: s.bugs.map((b) => (b.id === id ? { ...b, ...data } : b)) })),
  deleteBug: (id) => set((s) => ({ bugs: s.bugs.filter((b) => b.id !== id) })),

  features: [],
  setFeatures: (features) => set({ features }),
  addFeature: (feature) => set((s) => ({ features: [feature, ...s.features] })),
  updateFeature: (id, data) =>
    set((s) => ({ features: s.features.map((f) => (f.id === id ? { ...f, ...data } : f)) })),
  deleteFeature: (id) => set((s) => ({ features: s.features.filter((f) => f.id !== id) })),

  sprints: [],
  setSprints: (sprints) => set({ sprints }),
  addSprint: (sprint) => set((s) => ({ sprints: [sprint, ...s.sprints] })),
  updateSprint: (id, data) =>
    set((s) => ({ sprints: s.sprints.map((sp) => (sp.id === id ? { ...sp, ...data } : sp)) })),

  profiles: [],
  setProfiles: (profiles) => set({ profiles }),

  projectMembers: [],
  setProjectMembers: (projectMembers) => set({ projectMembers }),
  addProjectMember: (member) => set((s) => ({ projectMembers: [...s.projectMembers, member] })),
  removeProjectMember: (id) =>
    set((s) => ({ projectMembers: s.projectMembers.filter((m) => m.id !== id) })),

  channels: [],
  setChannels: (channels) => set({ channels }),
  activeChannel: null,
  setActiveChannel: (activeChannel) => set({ activeChannel }),
  messages: {},
  setMessages: (channelId, messages) =>
    set((s) => ({ messages: { ...s.messages, [channelId]: messages } })),
  addMessage: (message) =>
    set((s) => {
      const existing = s.messages[message.channel_id] || []
      return { messages: { ...s.messages, [message.channel_id]: [...existing, message] } }
    }),
}))
