import { supabase } from '@/lib/supabase/client'

export const authService = {
  getUser() {
    return supabase.auth.getUser()
  },

  onAuthStateChange(callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]) {
    return supabase.auth.onAuthStateChange(callback)
  },

  async signInWithPassword(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password })
  },

  async signInWithOAuth(provider: 'google' | 'github' | 'azure', redirectTo?: string) {
    return supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectTo ?? `${window.location.origin}/dashboard` },
    })
  },

  async signInWithOtp(email: string, redirectTo?: string) {
    return supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo ?? `${window.location.origin}/dashboard` },
    })
  },

  async signOut() {
    return supabase.auth.signOut()
  },
}
