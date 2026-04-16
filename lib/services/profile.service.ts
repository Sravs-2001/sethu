import { supabase } from '@/lib/supabase/client'
import type { Profile } from '@/types'

export const profileService = {
  async upsert(profile: Pick<Profile, 'id' | 'name'> & Partial<Profile>) {
    return supabase
      .from('profiles')
      .upsert(profile, { onConflict: 'id', ignoreDuplicates: true })
      .select()
      .single()
  },

  async getById(id: string) {
    return supabase.from('profiles').select('*').eq('id', id).single()
  },

  async updateRole(id: string, role: 'admin' | 'member') {
    return supabase.from('profiles').update({ role }).eq('id', id)
  },
}
