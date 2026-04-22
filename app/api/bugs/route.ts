import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const SELECT_BUG = '*, assignee:profiles!assignee_id(*), reporter:profiles!created_by(*)'

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

// GET /api/bugs?project_id=xxx
export async function GET(request: Request) {
  const { supabase, user } = await getAuthedClient()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const project_id = searchParams.get('project_id')
  if (!project_id) return NextResponse.json({ error: 'Missing project_id' }, { status: 400 })

  const { data, error } = await supabase
    .from('bugs')
    .select(SELECT_BUG)
    .eq('project_id', project_id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[api/bugs GET]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

// POST /api/bugs
export async function POST(request: Request) {
  const { supabase, user } = await getAuthedClient()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const body = await request.json()
  if (!body.project_id) return NextResponse.json({ error: 'Missing project_id' }, { status: 400 })

  const { data, error } = await supabase
    .from('bugs')
    .insert({ issue_type: 'task', tags: [], ...body })
    .select(SELECT_BUG)
    .single()

  if (error) {
    console.error('[api/bugs POST]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

// PATCH /api/bugs?id=xxx
export async function PATCH(request: Request) {
  const { supabase, user } = await getAuthedClient()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const body = await request.json()

  // Strip joined/virtual fields that are not real DB columns
  const { assignee, reporter, project, ...dbFields } = body
  const { data: updated, error } = await supabase
    .from('bugs').update(dbFields).eq('id', id).select('id')

  if (error) {
    console.error('[api/bugs PATCH]', JSON.stringify(error))
    return NextResponse.json({ error: error.message, details: error.details, code: error.code }, { status: 500 })
  }
  if (!updated || updated.length === 0)
    return NextResponse.json({ error: 'Issue not found.' }, { status: 404 })
  return NextResponse.json({ success: true })
}

// DELETE /api/bugs?id=xxx
export async function DELETE(request: Request) {
  const { supabase, user } = await getAuthedClient()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { data: deleted, error } = await supabase
    .from('bugs').delete().eq('id', id).select('id')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!deleted || deleted.length === 0)
    return NextResponse.json({ error: 'Issue not found.' }, { status: 404 })
  return NextResponse.json({ success: true })
}
