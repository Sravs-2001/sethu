import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { notifyMany, getActorName, truncate } from '@/lib/utils/notify'

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

// POST /api/comments
export async function POST(request: Request) {
  const { supabase, user } = await getAuthedClient()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const body = await request.json()
  const { task_id, content } = body

  if (!task_id) return NextResponse.json({ error: 'Missing task_id' }, { status: 400 })
  if (!content?.trim()) return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 })

  // Insert comment
  const { data: comment, error } = await supabase
    .from('comments')
    .insert({ task_id, user_id: user.id, content: content.trim() })
    .select('*, user:profiles(*)')
    .single()

  if (error) {
    console.error('[api/comments POST]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // ── Notifications ──────────────────────────────────────────────────────────
  if (comment) {
    // Look up the bug to find who to notify
    const { data: bug } = await supabase
      .from('bugs')
      .select('title, assignee_id, created_by, project_id')
      .eq('id', task_id)
      .single()

    if (bug) {
      const actorName = await getActorName(supabase, user.id)
      const recipients = new Set<string>()

      // Notify the assignee (if not the commenter)
      if (bug.assignee_id && bug.assignee_id !== user.id) recipients.add(bug.assignee_id)
      // Notify the reporter/creator (if not the commenter and not the same as assignee)
      if (bug.created_by && bug.created_by !== user.id) recipients.add(bug.created_by)

      const notifs = Array.from(recipients).map(uid => ({
        user_id: uid,
        type:    'comment_added' as const,
        title:   `${actorName} commented on: ${truncate(bug.title, 60)}`,
        body:    truncate(content.trim(), 120),
        data:    { bug_id: task_id, comment_id: comment.id, project_id: bug.project_id },
      }))

      await notifyMany(supabase, notifs)
    }
  }

  return NextResponse.json(comment)
}

// DELETE /api/comments?id=xxx
export async function DELETE(request: Request) {
  const { supabase, user } = await getAuthedClient()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)  // can only delete own comments

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
