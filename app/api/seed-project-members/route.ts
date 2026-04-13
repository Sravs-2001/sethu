import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const DEMO_PASSWORD = 'demo1234'
const DEMO_USERS = [
  { name: 'Alice Johnson', email: 'alice@mailinator.com', role: 'admin'  as const },
  { name: 'Bob Smith',     email: 'bob@mailinator.com',   role: 'member' as const },
  { name: 'Carol Davis',   email: 'carol@mailinator.com', role: 'member' as const },
  { name: 'David Wilson',  email: 'david@mailinator.com', role: 'member' as const },
  { name: 'Emma Brown',    email: 'emma@mailinator.com',  role: 'member' as const },
]

const SAMPLE_BUGS = [
  { title: 'Login page crashes on mobile Safari', priority: 'critical', status: 'todo' },
  { title: 'User profile photo not uploading', priority: 'high', status: 'in_progress' },
  { title: 'Search results show duplicate entries', priority: 'medium', status: 'todo' },
  { title: 'Email notifications delayed by 30+ minutes', priority: 'high', status: 'review' },
  { title: 'Dark mode flicker on page load', priority: 'low', status: 'done' },
  { title: 'CSV export missing last column', priority: 'medium', status: 'in_progress' },
  { title: 'Password reset link expires too quickly', priority: 'high', status: 'todo' },
  { title: 'Dashboard charts not rendering on Firefox', priority: 'medium', status: 'review' },
  { title: 'Tooltip overlaps dropdown menu', priority: 'low', status: 'done' },
  { title: '404 error on direct URL navigation', priority: 'critical', status: 'in_progress' },
  { title: 'Session timeout too aggressive', priority: 'medium', status: 'todo' },
  { title: 'Sorting broken after pagination', priority: 'high', status: 'todo' },
]

const SAMPLE_FEATURES = [
  { title: 'Add Slack notification integration', priority: 'high', status: 'todo' },
  { title: 'Bulk issue assignment', priority: 'medium', status: 'in_progress' },
  { title: 'Custom field support for issues', priority: 'high', status: 'todo' },
  { title: 'Time tracking on issues', priority: 'medium', status: 'review' },
  { title: 'Sprint velocity report', priority: 'medium', status: 'done' },
  { title: 'Two-factor authentication', priority: 'critical', status: 'in_progress' },
  { title: 'Kanban board swimlanes', priority: 'low', status: 'todo' },
  { title: 'Issue dependency graph', priority: 'medium', status: 'todo' },
  { title: 'Mobile app (iOS & Android)', priority: 'high', status: 'in_progress' },
  { title: 'API rate limiting dashboard', priority: 'low', status: 'done' },
  { title: 'Advanced search with filters', priority: 'high', status: 'todo' },
  { title: 'GitHub PR linking', priority: 'medium', status: 'review' },
]

export async function POST() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // 1. Get all projects
  const { data: projects, error: projErr } = await admin.from('projects').select('id, name, key')
  if (projErr || !projects?.length) {
    return NextResponse.json({ error: 'No projects found. Create projects first.', detail: projErr }, { status: 400 })
  }

  // 2. Ensure demo users exist and get their IDs
  const userIds: string[] = []
  for (const u of DEMO_USERS) {
    // Try to find existing user
    const { data: list } = await admin.auth.admin.listUsers()
    let existing = list?.users?.find((x: any) => x.email === u.email)

    if (!existing) {
      // Create the user
      const { data, error } = await admin.auth.admin.createUser({
        email: u.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { name: u.name, full_name: u.name, role: u.role },
      })
      if (data?.user) {
        existing = data.user
        await admin.from('profiles').upsert({ id: data.user.id, name: u.name, role: u.role }, { onConflict: 'id' })
      }
    } else {
      await admin.from('profiles').upsert({ id: existing.id, name: u.name, role: u.role }, { onConflict: 'id' })
    }

    if (existing) userIds.push(existing.id)
  }

  if (!userIds.length) {
    return NextResponse.json({ error: 'Could not find/create demo users' }, { status: 500 })
  }

  const createdBy = userIds[0] // Alice creates everything
  const results: any[] = []

  // 3. For each project, create sample bugs + features assigned to demo users
  for (const project of projects) {
    // Create sprints for the project
    const sprintInserts = [
      {
        name: `${project.key} Sprint 1`,
        goal: 'Initial setup and core features',
        start_date: new Date(Date.now() - 21 * 86400000).toISOString(),
        end_date:   new Date(Date.now() -  7 * 86400000).toISOString(),
        status: 'completed',
        project_id: project.id,
      },
      {
        name: `${project.key} Sprint 2`,
        goal: 'Bug fixes and performance improvements',
        start_date: new Date(Date.now() -  7 * 86400000).toISOString(),
        end_date:   new Date(Date.now() +  7 * 86400000).toISOString(),
        status: 'active',
        project_id: project.id,
      },
      {
        name: `${project.key} Sprint 3`,
        goal: 'New features and enhancements',
        start_date: new Date(Date.now() +  7 * 86400000).toISOString(),
        end_date:   new Date(Date.now() + 21 * 86400000).toISOString(),
        status: 'planning',
        project_id: project.id,
      },
    ]

    // Check if sprints already exist for this project
    const { data: existingSprints } = await admin.from('sprints')
      .select('id, status, name')
      .eq('project_id', project.id)

    let sprints = existingSprints
    if (!existingSprints?.length) {
      const { data: inserted } = await admin.from('sprints')
        .insert(sprintInserts)
        .select('id, status')
      sprints = inserted
    }

    const activeSprint = (sprints as any[] | null)?.find((s: any) => s.status === 'active')

    // Create bugs for this project (4 bugs per project from the sample list)
    const projectBugs = SAMPLE_BUGS.slice(0, 4).map((b, i) => ({
      ...b,
      project_id: project.id,
      description: `Reported for ${project.name}. Needs immediate attention.`,
      assignee_id: userIds[i % userIds.length],
      created_by:  createdBy,
      sprint_id:   activeSprint?.id ?? null,
      tags: [],
    }))

    const { data: bugsCreated } = await admin.from('bugs').insert(projectBugs).select('id')

    // Create features for this project (4 features per project)
    const projectFeatures = SAMPLE_FEATURES.slice(0, 4).map((f, i) => ({
      ...f,
      project_id: project.id,
      description: `Feature requested for ${project.name}.`,
      assignee_id: userIds[(i + 2) % userIds.length],
      created_by:  createdBy,
      sprint_id:   activeSprint?.id ?? null,
    }))

    const { data: featuresCreated } = await admin.from('features').insert(projectFeatures).select('id')

    results.push({
      project: project.name,
      bugs: bugsCreated?.length ?? 0,
      features: featuresCreated?.length ?? 0,
    })
  }

  return NextResponse.json({ ok: true, results, usersSeeded: userIds.length })
}

export async function GET() {
  return NextResponse.json({ info: 'POST to this endpoint to seed demo members & issues into all projects.' })
}
