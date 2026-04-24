import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { notifyMany, getActorName, getProjectMemberIds, truncate, type NotifPayload } from '@/lib/utils/notify'

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

  // ── Notifications ──────────────────────────────────────────────────────────
  if (data) {
    const [actorName, memberIds] = await Promise.all([
      getActorName(supabase, user.id),
      getProjectMemberIds(supabase, body.project_id),
    ])

    const typeLabel = data.issue_type === 'bug'   ? 'bug'
                    : data.issue_type === 'story'  ? 'story'
                    : data.issue_type === 'epic'   ? 'epic'
                    : data.issue_type === 'subtask'? 'subtask'
                    : 'task'

    const notifs: NotifPayload[] = memberIds
      .filter(uid => uid !== user.id)
      .map(uid => ({
        user_id: uid,
        type:    'issue_created' as const,
        title:   `${actorName} added a ${typeLabel}: ${truncate(data.title, 60)}`,
        body:    data.description ? truncate(data.description, 100) : '',
        data:    { bug_id: data.id, project_id: body.project_id },
      }))

    // Also notify assignee if set and not the creator
    if (data.assignee_id && data.assignee_id !== user.id) {
      const alreadyNotified = notifs.some(n => n.user_id === data.assignee_id)
      if (!alreadyNotified) {
        notifs.push({
          user_id: data.assignee_id,
          type:    'task_assigned' as const,
          title:   `You were assigned: ${truncate(data.title, 60)}`,
          body:    `Assigned by ${actorName}`,
          data:    { bug_id: data.id, project_id: body.project_id },
        })
      } else {
        // Upgrade the existing notification to task_assigned for the assignee
        const idx = notifs.findIndex(n => n.user_id === data.assignee_id)
        notifs[idx] = {
          user_id: data.assignee_id,
          type:    'task_assigned' as const,
          title:   `You were assigned: ${truncate(data.title, 60)}`,
          body:    `Assigned by ${actorName}`,
          data:    { bug_id: data.id, project_id: body.project_id },
        }
      }
    }

    await notifyMany(supabase, notifs)
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
  const { assignee, reporter, project, ...dbFields } = body

  // Fetch current bug for notification diffs
  const { data: current } = await supabase
    .from('bugs')
    .select('title, assignee_id, created_by, project_id, status')
    .eq('id', id)
    .single()

  const { data: updated, error } = await supabase
    .from('bugs').update(dbFields).eq('id', id).select('id')

  if (error) {
    console.error('[api/bugs PATCH]', JSON.stringify(error))
    return NextResponse.json({ error: error.message, details: error.details, code: error.code }, { status: 500 })
  }
  if (!updated || updated.length === 0)
    return NextResponse.json({ error: 'Issue not found.' }, { status: 404 })

  // ── Notifications ──────────────────────────────────────────────────────────
  if (current) {
    const notifs: Parameters<typeof notifyMany>[1] = []
    const actorName = await getActorName(supabase, user.id)

    // 1. Assignee changed
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
        data:    { bug_id: id, project_id: current.project_id },
      })
    }

    // 2. Status changed — notify assignee and reporter
    if (
      'status' in dbFields &&
      dbFields.status &&
      dbFields.status !== current.status
    ) {
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
            data:    { bug_id: id, project_id: current.project_id },
          })
        }
      }
    }

    await notifyMany(supabase, notifs)
  }

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
