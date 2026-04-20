import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { notification_id } = await request.json()

  if (!notification_id) {
    return NextResponse.json({ error: 'Missing notification_id' }, { status: 400 })
  }

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Mark notification as read — notifications_update policy: auth.uid() = user_id
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notification_id)
    .eq('user_id', user.id)

  return NextResponse.json({ success: true })
}
