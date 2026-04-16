import { supabase } from '@/lib/supabase/client'
import type { Bug } from '@/types'

const SELECT_BUG = '*, assignee:profiles(*), reporter:profiles(*)'

export const bugService = {
  async getByProject(projectId: string) {
    return supabase
      .from('bugs')
      .select(SELECT_BUG)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
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
    return supabase
      .from('bugs')
      .insert({ issue_type: 'task', tags: [], ...payload })
      .select(SELECT_BUG)
      .single()
  },

  async update(id: string, payload: Partial<Bug>) {
    return supabase.from('bugs').update(payload).eq('id', id)
  },

  async delete(id: string) {
    return supabase.from('bugs').delete().eq('id', id)
  },

  async getStatsByProjects(projectIds: string[]) {
    return supabase.from('bugs').select('project_id, status, priority').in('project_id', projectIds)
  },

  /** Subscribe to all changes on a project's bugs and re-fetch on each event */
  subscribe(projectId: string, onRefresh: () => void) {
    const channel = supabase
      .channel(`kanban-${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bugs' }, onRefresh)
      .subscribe()
    return () => void supabase.removeChannel(channel)
  },
}
