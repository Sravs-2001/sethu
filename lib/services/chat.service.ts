import { supabase } from '@/lib/supabase/client'
import type { Message } from '@/types'

export const chatService = {
  // ── Channels ─────────────────────────────────────────────────
  async getChannels() {
    return supabase.from('channels').select('*').order('name')
  },

  async createChannel(name: string, description?: string) {
    return supabase
      .from('channels')
      .insert({ name: name.toLowerCase().replace(/\s+/g, '-'), description })
      .select()
      .single()
  },

  // ── Messages ─────────────────────────────────────────────────
  async getMessages(channelId: string, limit = 100) {
    return supabase
      .from('messages')
      .select('*, user:profiles(*)')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
      .limit(limit)
  },

  async getMessageById(id: string) {
    return supabase.from('messages').select('*, user:profiles(*)').eq('id', id).single()
  },

  async sendMessage(channelId: string, userId: string, content: string) {
    return supabase
      .from('messages')
      .insert({ channel_id: channelId, user_id: userId, content })
  },

  subscribe(onInsert: (msg: Message) => void) {
    const channel = supabase
      .channel('chat-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
        async payload => {
          const { data } = await chatService.getMessageById(payload.new.id)
          if (data) onInsert(data as Message)
        }
      )
      .subscribe()
    return () => void supabase.removeChannel(channel)
  },
}
