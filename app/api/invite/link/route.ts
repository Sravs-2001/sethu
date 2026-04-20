import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { project_id, role = 'member', created_by, origin } = await request.json()

  if (!project_id || !created_by) {
    return NextResponse.json({ error: 'Missing project_id or created_by' }, { status: 400 })
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

  // Create a new invite token (expires in 7 days)
  // it_insert policy: auth.uid() = created_by
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('invite_tokens')
    .insert({ project_id, role, created_by: user.id, expires_at: expiresAt })
    .select('token')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Prefer origin sent by client, then env var, then request origin header
  const base = origin
    || process.env.NEXT_PUBLIC_APP_URL
    || request.headers.get('origin')
    || ''

  const url = `${base}/join/project/${data.token}`

  return NextResponse.json({ url, token: data.token })
}
