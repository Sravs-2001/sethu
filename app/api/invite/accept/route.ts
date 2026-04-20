import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { token, notification_id } = await request.json()

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
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

  // Read invite token — it_select policy: any authenticated user can read
  const { data: inviteToken, error: tokenErr } = await supabase
    .from('invite_tokens')
    .select('*')
    .eq('token', token)
    .single()

  if (tokenErr || !inviteToken) {
    return NextResponse.json({ error: 'Invalid invite token' }, { status: 404 })
  }

  if (inviteToken.expires_at && new Date(inviteToken.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invite link has expired' }, { status: 410 })
  }

  // Ensure profile exists — profiles_insert policy allows auth.uid() = id
  await supabase.from('profiles').upsert(
    {
      id:   user.id,
      name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
      role: 'member',
    },
    { onConflict: 'id', ignoreDuplicates: true }
  )

  // Add user to project — pm_insert policy allows user_id = auth.uid()
  const { error: memberErr } = await supabase
    .from('project_members')
    .upsert(
      {
        project_id: inviteToken.project_id,
        user_id:    user.id,
        role:       inviteToken.role,
        invited_by: inviteToken.created_by ?? null,
      },
      { onConflict: 'project_id,user_id' }
    )

  if (memberErr) {
    console.error('[invite/accept] project_members upsert error:', memberErr)
    return NextResponse.json({ error: memberErr.message }, { status: 500 })
  }

  // Increment token uses — it_update policy allows with check (true)
  await supabase
    .from('invite_tokens')
    .update({ uses: inviteToken.uses + 1 })
    .eq('token', token)

  // Mark notification read if provided
  if (notification_id) {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notification_id)
      .eq('user_id', user.id)
  }

  // Return the project
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', inviteToken.project_id)
    .single()

  return NextResponse.json({ success: true, project_id: inviteToken.project_id, project })
}
