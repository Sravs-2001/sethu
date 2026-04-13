import { createBrowserClient } from '@supabase/ssr'

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

export function getSupabase() {
  if (typeof window === 'undefined') {
    throw new Error('Supabase client can only be used in the browser')
  }

  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables')
    }

    supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      realtime: { params: { eventsPerSecond: 10 } },
    })
  }

  return supabaseClient
}

// Export for backwards compatibility - will call getSupabase() lazily
// @ts-ignore - Proxy type inference limitation, works correctly at runtime
export const supabase = new Proxy({} as ReturnType<typeof createBrowserClient>, {
  get: (_, prop: string | symbol) => {
    const client = getSupabase()
    return Reflect.get(client, prop)
  },
})

export const getRedirectUrl = () => {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/api/auth/callback`
}
