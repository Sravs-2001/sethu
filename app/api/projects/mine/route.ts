import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
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

  // Try full RLS query first (works once schema/policies are up to date)
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: true })

  if (!error) {
    return NextResponse.json({ projects: projects ?? [] })
  }

  // Fallback for old recursive RLS: query only projects the user created.
  // Filtering by created_by = user.id makes the RLS policy's first OR condition
  // always true, so PostgreSQL short-circuits and never calls my_project_ids().
  if (error.message?.includes('infinite recursion') || error.code === '42P17') {
    const { data: ownProjects, error: fallbackErr } = await supabase
      .from('projects')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: true })

    if (fallbackErr) {
      return NextResponse.json({ error: fallbackErr.message }, { status: 500 })
    }
    return NextResponse.json({ projects: ownProjects ?? [] })
  }

  return NextResponse.json({ error: error.message }, { status: 500 })
}
