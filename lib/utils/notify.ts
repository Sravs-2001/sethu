import type { SupabaseClient } from '@supabase/supabase-js'
import type { NotificationType } from '@/types'

export interface NotifPayload {
  user_id: string
  type:    NotificationType
  title:   string
  body?:   string
  link?:   string
  data?:   Record<string, unknown>
}

/** Insert one or many notifications (no-op on empty array). */
export async function notifyMany(
  supabase: SupabaseClient,
  payloads: NotifPayload[]
) {
  if (payloads.length === 0) return
  await supabase.from('notifications').insert(
    payloads.map(p => ({
      user_id: p.user_id,
      type:    p.type,
      title:   p.title,
      body:    p.body    ?? '',
      link:    p.link    ?? null,
      data:    p.data    ?? null,
    }))
  )
}

/** Look up an actor's display name (falls back to "Someone"). */
export async function getActorName(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', userId)
    .single()
  return data?.name ?? 'Someone'
}

/** Return all user_ids in a project (uses the security-definer RPC). */
export async function getProjectMemberIds(
  supabase: SupabaseClient,
  projectId: string
): Promise<string[]> {
  const { data } = await supabase.rpc('get_project_members', { p_project_id: projectId })
  return (data ?? []).map((m: any) => m.user_id as string)
}

/** Truncate a string to `max` chars with ellipsis. */
export function truncate(str: string, max = 120): string {
  return str.length <= max ? str : str.slice(0, max).trimEnd() + '…'
}
