import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { notifyMany, getActorName, getProjectMemberIds, truncate } from '@/lib/utils/notify'

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

  // ── Notifications ──────────────────────────────────────────────────────────
  if (data) {
    const [actorName, memberIds] = await Promise.all([
      getActorName(supabase, user.id),
      getProjectMemberIds(supabase, body.project_id),
    ])

    const notifs: Parameters<typeof notifyMany>[1] = memberIds
      .filter(uid => uid !== user.id)
      .map(uid => ({
        user_id: uid,
        type:    'issue_created' as const,
        title:   `${actorName} added a feature: ${truncate(data.title, 60)}`,
        body:    data.description ? truncate(data.description, 100) : '',
        data:    { feature_id: data.id, project_id: body.project_id },
      }))

    // Upgrade to task_assigned for the assignee
    if (data.assignee_id && data.assignee_id !== user.id) {
      const idx = notifs.findIndex(n => n.user_id === data.assignee_id)
      const assignedNotif = {
        user_id: data.assignee_id,
        type:    'task_assigned' as const,
        title:   `You were assigned: ${truncate(data.title, 60)}`,
        body:    `Assigned by ${actorName}`,
        data:    { feature_id: data.id, project_id: body.project_id },
      }
      if (idx >= 0) notifs[idx] = assignedNotif
      else notifs.push(assignedNotif)
    }

    await notifyMany(supabase, notifs)
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

  // Fetch current feature for notification diffs
  const { data: current } = await supabase
    .from('features')
    .select('title, assignee_id, created_by, project_id, status')
    .eq('id', id)
    .single()

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

  // ── Notifications ──────────────────────────────────────────────────────────
  if (current) {
    const notifs: Parameters<typeof notifyMany>[1] = []
    const actorName = await getActorName(supabase, user.id)

    // Assignee changed
    if (
      'assignee_id' in dbFields &&
      dbFields.assignee_id &&
      dbFields.assignee_id !== current.assignee_id &&
      dbFields.assignee_id !== user.id
    ) {
      notifs.push({
        user_id: dbFields.assignee_id,
        type:    'task_assigned',
        title:   `You were assigned: ${truncate(current.title, 60)}`,
        body:    `Assigned by ${actorName}`,
        data:    { feature_id: id, project_id: current.project_id },
      })
    }

    // Status changed
    if ('status' in dbFields && dbFields.status && dbFields.status !== current.status) {
      const recipients = new Set<string>()
      if (current.assignee_id && current.assignee_id !== user.id) recipients.add(current.assignee_id)
      if (current.created_by  && current.created_by  !== user.id) recipients.add(current.created_by)

      const newStatus = (dbFields.status as string).replace(/_/g, ' ')
      for (const uid of Array.from(recipients)) {
        if (!notifs.some(n => n.user_id === uid && n.type === 'task_assigned')) {
          notifs.push({
            user_id: uid,
            type:    'status_changed',
            title:   `${actorName} updated: ${truncate(current.title, 60)}`,
            body:    `Status → ${newStatus}`,
            data:    { feature_id: id, project_id: current.project_id },
          })
        }
      }
    }

    await notifyMany(supabase, notifs)
  }

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
