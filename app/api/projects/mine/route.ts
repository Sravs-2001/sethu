import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
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

  // Get all project IDs this user belongs to (member or owner)
  const [{ data: memberships }, { data: owned }] = await Promise.all([
    supabaseAdmin
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id),
    supabaseAdmin
      .from('projects')
      .select('id')
      .eq('created_by', user.id),
  ])

  const memberIds = (memberships ?? []).map((m: any) => m.project_id as string)
  const ownedIds  = (owned ?? []).map((p: any) => p.id as string)
  const projectIds = Array.from(new Set([...memberIds, ...ownedIds]))

  if (projectIds.length === 0) {
    return NextResponse.json({ projects: [] })
  }

  const { data: projects, error } = await supabaseAdmin
    .from('projects')
    .select('*')
    .in('id', projectIds)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ projects: projects ?? [] })
}
