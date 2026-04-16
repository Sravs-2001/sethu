import { supabase } from '@/lib/supabase/client'
import type { Notification } from '@/types'

export const notificationService = {
  async getByUser(userId: string, limit = 30) {
    return supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
  },

  async markRead(id: string) {
    return supabase.from('notifications').update({ read: true }).eq('id', id)
  },

  async markAllRead(userId: string) {
    return supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)
  },

  subscribe(userId: string, onInsert: (n: Notification) => void) {
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'notifications',
        filter: `user_id=eq.${userId}`,
      }, payload => onInsert(payload.new as Notification))
      .subscribe()
    return () => void supabase.removeChannel(channel)
  },
}
