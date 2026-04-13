import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const DEMO_USERS = [
  { name: 'Alice Johnson', email: 'alice@mailinator.com', role: 'admin'  as const, color: '#0052CC' },
  { name: 'Bob Smith',     email: 'bob@mailinator.com',   role: 'member' as const, color: '#6554C0' },
  { name: 'Carol Davis',   email: 'carol@mailinator.com', role: 'member' as const, color: '#36B37E' },
  { name: 'David Wilson',  email: 'david@mailinator.com', role: 'member' as const, color: '#FF5630' },
  { name: 'Emma Brown',    email: 'emma@mailinator.com',  role: 'member' as const, color: '#00B8D9' },
]

const DEMO_PASSWORD = 'demo1234'

export async function POST() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 })
  }

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

    if (error) {
      if (error.message.toLowerCase().includes('already been registered')) {
        // User exists — try to find them and update role
        const { data: list } = await admin.auth.admin.listUsers()
        const existing = list?.users?.find((x: any) => x.email === u.email)
        if (existing) {
          await admin.from('profiles').upsert({
            id: existing.id, name: u.name, role: u.role,
          }, { onConflict: 'id' })
          results.push({ email: u.email, status: 'exists', id: existing.id })
        } else {
          results.push({ email: u.email, status: 'error', message: error.message })
        }
        continue
      }
      results.push({ email: u.email, status: 'error', message: error.message })
      continue
    }

    const userId = data.user?.id
    if (userId) {
      // Create profile record
      await admin.from('profiles').upsert({
        id: userId, name: u.name, role: u.role,
      }, { onConflict: 'id' })
      results.push({ email: u.email, status: 'created', id: userId })
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
