import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const SELECT_FEATURE = '*, assignee:profiles!assignee_id(*)'

function sessionClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
}

async function getAuthedClient() {
  const supabase = sessionClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

// GET /api/features?project_id=xxx
export async function GET(request: Request) {
  const { supabase, user } = await getAuthedClient()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const project_id = searchParams.get('project_id')
  if (!project_id) return NextResponse.json({ error: 'Missing project_id' }, { status: 400 })

  const { data, error } = await supabase
    .from('features')
    .select(SELECT_FEATURE)
    .eq('project_id', project_id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[api/features GET]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

// POST /api/features
export async function POST(request: Request) {
  const { supabase, user } = await getAuthedClient()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const body = await request.json()
  if (!body.project_id) return NextResponse.json({ error: 'Missing project_id' }, { status: 400 })
  if (!body.title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })

  const { data, error } = await supabase
    .from('features')
    .insert({
      project_id:  body.project_id,
      title:       body.title.trim(),
      description: body.description ?? '',
      priority:    body.priority    ?? 'medium',
      status:      body.status      ?? 'todo',
      assignee_id: body.assignee_id ?? null,
      sprint_id:   body.sprint_id   ?? null,
      created_by:  user.id,
    })
    .select(SELECT_FEATURE)
    .single()

  if (error) {
    console.error('[api/features POST]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

// PATCH /api/features?id=xxx
export async function PATCH(request: Request) {
  const { supabase, user } = await getAuthedClient()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const body = await request.json()
  const { assignee, ...dbFields } = body

  const { data: updated, error } = await supabase
    .from('features')
    .update(dbFields)
    .eq('id', id)
    .select('id')

  if (error) {
    console.error('[api/features PATCH]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!updated || updated.length === 0)
    return NextResponse.json({ error: 'Feature not found.' }, { status: 404 })
  return NextResponse.json({ success: true })
}

// DELETE /api/features?id=xxx
export async function DELETE(request: Request) {
  const { supabase, user } = await getAuthedClient()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { data: deleted, error } = await supabase
    .from('features')
    .delete()
    .eq('id', id)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!deleted || deleted.length === 0)
    return NextResponse.json({ error: 'Feature not found.' }, { status: 404 })
  return NextResponse.json({ success: true })
}
