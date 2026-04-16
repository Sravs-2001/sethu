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
    return supabase
      .from('comments')
      .insert({ task_id: taskId, user_id: userId, content })
      .select('*, user:profiles(*)')
      .single()
  },

  async delete(id: string) {
    return supabase.from('comments').delete().eq('id', id)
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
