'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { useStore } from '@/store/useStore'
import AppLayout from './Layout/AppLayout'

export default function AppEntry() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setUser, channels, setActiveChannel, setActiveView } = useStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadProfile(session.user)
      else router.push('/')
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) router.push('/')
    })
    return () => subscription.unsubscribe()
  }, [])

  // Handle ?join=channelName invite links
  useEffect(() => {
    const joinTarget = searchParams.get('join')
    if (!joinTarget || channels.length === 0) return
    const ch = channels.find(c => c.name === joinTarget)
    if (ch) {
      setActiveChannel(ch)
      setActiveView('chat')
      // Clean the param from URL
      router.replace('/dashboard')
    }
  }, [channels, searchParams])

  async function loadProfile(authUser: User) {
    const userId = authUser.id

    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (data) { setUser(data); return }

    const meta = authUser.user_metadata ?? {}
    const name =
      meta.full_name || meta.name || meta.user_name ||
      authUser.email?.split('@')[0] || 'User'
    const avatar_url = meta.avatar_url || meta.picture || null

    try {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
      const role = (count ?? 1) === 0 ? 'admin' : 'member'
      const { data: created } = await supabase
        .from('profiles')
        .upsert({ id: userId, name, avatar_url, role })
        .select()
        .single()
      if (created) { setUser(created); return }
    } catch (_) {}

    setUser({ id: userId, name, avatar_url, role: 'member', created_at: new Date().toISOString() })
  }

  return <AppLayout />
}
