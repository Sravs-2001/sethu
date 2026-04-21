import { supabase } from '@/lib/supabase/client'
import type { Sprint } from '@/types'

export const sprintService = {
  async getByProject(projectId: string) {
    try {
      const res = await fetch(`/api/sprints?project_id=${projectId}`)
      const data = await res.json()
      if (!res.ok) return { data: null, error: data }
      return { data, error: null }
    } catch {
      return { data: null, error: { message: 'Network error' } }
    }
  },

  async create(payload: Partial<Sprint> & { project_id: string }) {
    try {
      const res = await fetch('/api/sprints', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) return { data: null, error: data }
      return { data, error: null }
    } catch {
      return { data: null, error: { message: 'Network error' } }
    }
  },

  async update(id: string, payload: Partial<Sprint>) {
    try {
      const res = await fetch(`/api/sprints?id=${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) return { data: null, error: data }
      return { data, error: null }
    } catch {
      return { data: null, error: { message: 'Network error' } }
    }
  },

  async delete(id: string) {
    try {
      const res = await fetch(`/api/sprints?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) return { data: null, error: data }
      return { data, error: null }
    } catch {
      return { data: null, error: { message: 'Network error' } }
    }
  },

  async getStatsByProjects(projectIds: string[]) {
    return supabase.from('sprints').select('project_id, status, name').in('project_id', projectIds)
  },
}
