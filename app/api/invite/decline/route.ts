import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { notification_id, token } = await request.json()

  if (!notification_id) {
    return NextResponse.json({ error: 'Missing notification_id' }, { status: 400 })
  }

  const cookieStore = cookies()
  const supabaseUser = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )

  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Mark notification as read (dismiss it)
  await supabaseAdmin
    .from('notifications')
    .update({ read: true })
    .eq('id', notification_id)
    .eq('user_id', user.id)

  // If the invite token is single-use (created just for this user), delete it
  if (token) {
    await supabaseAdmin
      .from('invite_tokens')
      .delete()
      .eq('token', token)
  }

  return NextResponse.json({ success: true })
}
