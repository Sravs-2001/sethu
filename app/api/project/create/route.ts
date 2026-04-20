import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { name, key, description, avatar_color } = await request.json()

  if (!name || !key) {
    return NextResponse.json({ error: 'Missing name or key' }, { status: 400 })
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

  const { data: project, error: projErr } = await supabase
    .from('projects')
    .insert({ name, key, description: description || null, avatar_color: avatar_color || '#0052CC', created_by: user.id })
    .select()
    .single()

  if (projErr) {
    return NextResponse.json({ error: projErr.message }, { status: 500 })
  }

  return NextResponse.json({ project })
}
