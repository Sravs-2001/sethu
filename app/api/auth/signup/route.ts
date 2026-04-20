import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email, password, name } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Try creating the user first
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, full_name: name },
  })

  if (!error) {
    return NextResponse.json({ user: data.user })
  }

  // If the email already exists (pre-created by an invite), update their password instead
  const alreadyExists =
    error.message.toLowerCase().includes('already been registered') ||
    error.message.toLowerCase().includes('already registered') ||
    error.message.toLowerCase().includes('already exists')

  if (alreadyExists) {
    // Find the existing user and set their password + confirm the account
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const existing = list?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())

    if (existing) {
      const { data: updated, error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
        existing.id,
        { password, email_confirm: true, user_metadata: { name, full_name: name } }
      )
      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 400 })
      }
      return NextResponse.json({ user: updated.user })
    }
  }

  return NextResponse.json({ error: error.message }, { status: 400 })
}
