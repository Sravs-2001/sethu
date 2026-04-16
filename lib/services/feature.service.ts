import { supabase } from '@/lib/supabase/client'
import type { Feature } from '@/types'

const SELECT_FEATURE = '*, assignee:profiles(*)'

export const featureService = {
  async getByProject(projectId: string) {
    return supabase
      .from('features')
      .select(SELECT_FEATURE)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
  },

  async create(payload: Partial<Feature> & { project_id: string; created_by: string }) {
    return supabase
      .from('features')
      .insert(payload)
      .select(SELECT_FEATURE)
      .single()
  },

  async update(id: string, payload: Partial<Feature>) {
    return supabase.from('features').update(payload).eq('id', id)
  },

  async delete(id: string) {
    return supabase.from('features').delete().eq('id', id)
  },

  async getStatsByProjects(projectIds: string[]) {
    return supabase.from('features').select('project_id, status').in('project_id', projectIds)
  },

  subscribe(projectId: string, onRefresh: () => void) {
    const channel = supabase
      .channel(`features-realtime-${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'features' }, onRefresh)
      .subscribe()
    return () => void supabase.removeChannel(channel)
  },
}
