import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { token } = await request.json()

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  // Get the current user from the session cookie
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

  // Use admin client to bypass RLS
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Validate token
  const { data: inviteToken, error: tokenErr } = await supabaseAdmin
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

  // Ensure profile exists
  await supabaseAdmin.from('profiles').upsert(
    { id: user.id, name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User', role: 'member' },
    { onConflict: 'id', ignoreDuplicates: true }
  )

  // Add user to project — set invited_by so it's distinguishable from seeded entries
  const { error: memberErr } = await supabaseAdmin
    .from('project_members')
    .upsert(
      {
        project_id: inviteToken.project_id,
        user_id: user.id,
        role: inviteToken.role,
        invited_by: inviteToken.created_by,
      },
      { onConflict: 'project_id,user_id' }
    )

  if (memberErr) {
    return NextResponse.json({ error: memberErr.message }, { status: 500 })
  }

  // Increment uses
  await supabaseAdmin
    .from('invite_tokens')
    .update({ uses: inviteToken.uses + 1 })
    .eq('token', token)

  return NextResponse.json({ success: true, project_id: inviteToken.project_id })
}
