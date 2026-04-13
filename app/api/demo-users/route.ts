import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const DEMO_USERS = [
  { name: 'Alice Johnson', email: 'alice@mailinator.com', role: 'admin'  as const },
  { name: 'Bob Smith',     email: 'bob@mailinator.com',   role: 'member' as const },
  { name: 'Carol Davis',   email: 'carol@mailinator.com', role: 'member' as const },
  { name: 'David Wilson',  email: 'david@mailinator.com', role: 'member' as const },
  { name: 'Emma Brown',    email: 'emma@mailinator.com',  role: 'member' as const },
]

const DEMO_PASSWORD = 'demo1234'

export async function POST(request: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 })
  }

  // Optional: add users to a specific project
  let body: { project_id?: string } = {}
  try { body = await request.json() } catch { /* no body */ }
  const { project_id } = body

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const results: { email: string; status: string; id?: string; message?: string }[] = []

  for (const u of DEMO_USERS) {
    // Try to create user in Supabase Auth
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { name: u.name, full_name: u.name, role: u.role },
    })

    let userId: string | undefined

    if (error) {
      if (error.message.toLowerCase().includes('already been registered')) {
        // User exists — find them
        const { data: list } = await admin.auth.admin.listUsers()
        const existing = list?.users?.find((x: any) => x.email === u.email)
        if (existing) {
          userId = existing.id
          await admin.from('profiles').upsert(
            { id: existing.id, name: u.name, role: u.role },
            { onConflict: 'id' }
          )
          results.push({ email: u.email, status: 'exists', id: existing.id })
        } else {
          results.push({ email: u.email, status: 'error', message: error.message })
        }
      } else {
        results.push({ email: u.email, status: 'error', message: error.message })
      }
    } else {
      userId = data.user?.id
      if (userId) {
        await admin.from('profiles').upsert(
          { id: userId, name: u.name, role: u.role },
          { onConflict: 'id' }
        )
        results.push({ email: u.email, status: 'created', id: userId })
      }
    }

    // If a project_id was provided, add this user as a member of that project
    if (userId && project_id) {
      await admin.from('project_members').upsert(
        { project_id, user_id: userId, role: u.role },
        { onConflict: 'project_id,user_id' }
      )
    }
  }

  return NextResponse.json({ results, password: DEMO_PASSWORD })
}

export async function GET() {
  return NextResponse.json({
    users: DEMO_USERS.map(u => ({ name: u.name, email: u.email, role: u.role })),
    password: DEMO_PASSWORD,
  })
}
