import { supabase } from '@/lib/supabase/client'
import type { Feature } from '@/types'

const SELECT_FEATURE = '*, assignee:profiles(*)'

export const featureService = {
  async getByProject(projectId: string) {
    try {
      const res = await fetch(`/api/features?project_id=${projectId}`)
      const data = await res.json()
      if (!res.ok) return { data: null, error: data }
      return { data, error: null }
    } catch {
      return { data: null, error: { message: 'Network error' } }
    }
  },

  async create(payload: Partial<Feature> & { project_id: string; created_by: string }) {
    try {
      const res = await fetch('/api/features', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) return { data: null, error: { ...data, status: res.status } }
      return { data, error: null }
    } catch {
      return { data: null, error: { message: 'Network error', status: 0 } }
    }
  },

  async update(id: string, payload: Partial<Feature>) {
    try {
      const res = await fetch(`/api/features?id=${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) return { data: null, error: { ...data, status: res.status } }
      return { data, error: null }
    } catch {
      return { data: null, error: { message: 'Network error', status: 0 } }
    }
  },

  async delete(id: string) {
    try {
      const res = await fetch(`/api/features?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) return { data: null, error: { ...data, status: res.status } }
      return { data, error: null }
    } catch {
      return { data: null, error: { message: 'Network error', status: 0 } }
    }
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
