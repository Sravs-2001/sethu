import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { name, key, description, avatar_color } = await request.json()

  if (!name || !key) {
    return NextResponse.json({ error: 'Missing name or key' }, { status: 400 })
  }

  // Get current user
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

  // Create the project
  const { data: project, error: projErr } = await supabaseAdmin
    .from('projects')
    .insert({ name, key, description: description || null, avatar_color: avatar_color || '#0052CC', created_by: user.id })
    .select()
    .single()

  if (projErr) {
    return NextResponse.json({ error: projErr.message }, { status: 500 })
  }

  // Auto-add creator as project admin in project_members
  const { error: memberErr } = await supabaseAdmin
    .from('project_members')
    .upsert(
      { project_id: project.id, user_id: user.id, role: 'admin', invited_by: null },
      { onConflict: 'project_id,user_id' }
    )

  if (memberErr) {
    // Don't fail the project creation, just log it
    console.error('Failed to add creator to project_members:', memberErr.message)
  }

  return NextResponse.json({ project })
}
