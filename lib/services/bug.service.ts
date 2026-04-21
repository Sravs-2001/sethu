import { supabase } from '@/lib/supabase/client'
import type { Bug } from '@/types'

export const bugService = {
  async logActivity(taskId: string, userId: string, action: string, from?: string | null, to?: string | null) {
    return supabase.from('activity_logs').insert({ task_id: taskId, user_id: userId, action, from: from ?? null, to: to ?? null })
  },

  async getActivity(taskId: string) {
    return supabase
      .from('activity_logs')
      .select('*, user:profiles!user_id(id, name, avatar_url)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
      .limit(50)
  },
  async getByProject(projectId: string) {
    const res = await fetch(`/api/bugs?project_id=${projectId}`)
    const data = await res.json()
    if (!res.ok) return { data: null, error: data }
    return { data, error: null }
  },

  async getByAssignee(userId: string) {
    return supabase
      .from('bugs')
      .select('*, project:projects(id, name, key, avatar_color)')
      .eq('assignee_id', userId)
      .neq('status', 'done')
      .order('updated_at', { ascending: false })
  },

  async create(payload: Partial<Bug> & { project_id: string; created_by: string }) {
    const res = await fetch('/api/bugs', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) return { data: null, error: data }
    return { data, error: null }
  },

  async update(id: string, payload: Partial<Bug>) {
    const res = await fetch(`/api/bugs?id=${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) return { data: null, error: data }
    return { data, error: null }
  },

  async delete(id: string) {
    const res = await fetch(`/api/bugs?id=${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) return { data: null, error: data }
    return { data, error: null }
  },

  async getStatsByProjects(projectIds: string[]) {
    return supabase.from('bugs').select('project_id, status, priority').in('project_id', projectIds)
  },

  subscribe(projectId: string, onRefresh: () => void) {
    const channel = supabase
      .channel(`kanban-${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bugs' }, onRefresh)
      .subscribe()
    return () => void supabase.removeChannel(channel)
  },
}
