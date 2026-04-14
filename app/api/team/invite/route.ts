import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email, role, project_id, invited_by } = await request.json()

  if (!email || !role) {
    return NextResponse.json({ error: 'Missing email or role' }, { status: 400 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Invite or look up the user
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { role },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/auth/callback?next=/dashboard`,
  })

  if (error && !error.message.includes('already been registered')) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get the user id (either from invite or existing user lookup)
  let userId = data?.user?.id
  if (!userId) {
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers()
    const found = existing?.users?.find((u) => u.email === email)
    userId = found?.id
  }

  // If we have a project_id and user id, add them to project_members
  if (userId && project_id) {
    // Ensure a profile row exists (may not exist yet for pending invites)
    await supabaseAdmin.from('profiles').upsert(
      { id: userId, name: email.split('@')[0], role },
      { onConflict: 'id', ignoreDuplicates: true }
    )

    const { error: pmErr } = await supabaseAdmin
      .from('project_members')
      .upsert(
        { project_id, user_id: userId, role, invited_by: invited_by ?? null },
        { onConflict: 'project_id,user_id' }
      )

    if (pmErr) {
      return NextResponse.json({ error: pmErr.message }, { status: 500 })
    }
  }

  return NextResponse.json({ id: userId ?? null })
}
