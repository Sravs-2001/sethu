import { supabase } from '@/lib/supabase/client'

export const commentService = {
  async getByTask(taskId: string) {
    return supabase
      .from('comments')
      .select('*, user:profiles(*)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })
  },

  async create(taskId: string, userId: string, content: string) {
    try {
      const res = await fetch('/api/comments', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ task_id: taskId, content }),
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
      const res = await fetch(`/api/comments?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) return { data: null, error: data }
      return { data, error: null }
    } catch {
      return { data: null, error: { message: 'Network error' } }
    }
  },

  async getActivity(taskId: string) {
    return supabase
      .from('activity_logs')
      .select('*, user:profiles(*)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
  },

  subscribe(taskId: string, onRefresh: () => void) {
    const channel = supabase
      .channel(`comments-${taskId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments',
        filter: `task_id=eq.${taskId}` }, onRefresh)
      .subscribe()
    return () => void supabase.removeChannel(channel)
  },
}
