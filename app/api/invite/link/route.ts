import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { project_id, role = 'member', created_by } = await request.json()

  if (!project_id || !created_by) {
    return NextResponse.json({ error: 'Missing project_id or created_by' }, { status: 400 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Create a new invite token (expires in 7 days)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabaseAdmin
    .from('invite_tokens')
    .insert({ project_id, role, created_by, expires_at: expiresAt })
    .select('token')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const url    = `${appUrl}/join/project/${data.token}`

  return NextResponse.json({ url, token: data.token })
}
