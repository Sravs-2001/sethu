import { supabase } from '@/lib/supabase/client'
import type { Sprint } from '@/types'

export const sprintService = {
  async getByProject(projectId: string) {
    return supabase
      .from('sprints')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
  },

  async create(payload: Partial<Sprint> & { project_id: string }) {
    return supabase.from('sprints').insert(payload).select().single()
  },

  async update(id: string, payload: Partial<Sprint>) {
    return supabase.from('sprints').update(payload).eq('id', id)
  },

  async delete(id: string) {
    return supabase.from('sprints').delete().eq('id', id)
  },

  async getStatsByProjects(projectIds: string[]) {
    return supabase.from('sprints').select('project_id, status, name').in('project_id', projectIds)
  },
}
