import { supabase } from '@/lib/supabase/client'
import type { Sprint } from '@/types'

export const sprintService = {
  async getByProject(projectId: string) {
    const res = await fetch(`/api/sprints?project_id=${projectId}`)
    const data = await res.json()
    if (!res.ok) return { data: null, error: data }
    return { data, error: null }
  },

  async create(payload: Partial<Sprint> & { project_id: string }) {
    const res = await fetch('/api/sprints', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) return { data: null, error: data }
    return { data, error: null }
  },

  async update(id: string, payload: Partial<Sprint>) {
    const res = await fetch(`/api/sprints?id=${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) return { data: null, error: data }
    return { data, error: null }
  },

  async delete(id: string) {
    const res = await fetch(`/api/sprints?id=${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) return { data: null, error: data }
    return { data, error: null }
  },

  async getStatsByProjects(projectIds: string[]) {
    return supabase.from('sprints').select('project_id, status, name').in('project_id', projectIds)
  },
}
