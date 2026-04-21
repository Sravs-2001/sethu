#!/usr/bin/env node
// Seed sample issues (epics, stories, tasks, subtasks, bugs) into the first project found.

const SUPABASE_URL     = 'https://maancpslybylhejactva.supabase.co'
const SERVICE_ROLE_KEY = 'sb_secret_Yk3p2PDZVuETj6zc32bJIA_38y3_wk2'

const headers = {
  'Content-Type':  'application/json',
  'apikey':        SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'Prefer':        'return=representation',
}

async function query(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, { headers, ...opts })
  const text = await res.text()
  try { return JSON.parse(text) } catch { return text }
}

// ── 1. Get project & user ──────────────────────────────────────────────────────
const projects = await query('/projects?select=id,key,name,created_by&limit=1')
if (!projects.length) { console.error('No projects found. Create a project first.'); process.exit(1) }

const project  = projects[0]
const userId   = project.created_by
console.log(`\n📦 Project: ${project.name} (${project.key})`)
console.log(`👤 User: ${userId}\n`)

// ── 2. Helpers ─────────────────────────────────────────────────────────────────
function base(extra = {}) {
  return {
    project_id:  project.id,
    created_by:  userId,
    tags:        [],
    priority:    'medium',
    status:      'todo',
    issue_type:  'task',
    description: '',
    ...extra,
  }
}

async function insert(rows) {
  const result = await query('/bugs?select=id,title,issue_type', {
    method: 'POST',
    body:   JSON.stringify(rows),
  })
  if (!Array.isArray(result)) {
    console.error('Insert error:', result)
    return []
  }
  result.forEach(r => console.log(`  ✅ [${r.issue_type}] ${r.title}`))
  return result
}

// ── 3. Epics ───────────────────────────────────────────────────────────────────
console.log('⚡ Creating Epics…')
const epics = await insert([
  base({
    issue_type:  'epic',
    title:       'User Authentication & Onboarding',
    description: 'End-to-end sign-up, login, password reset, and first-run onboarding flow so users can get started within 2 minutes.',
    priority:    'high',
    status:      'in_progress',
    tags:        [],
  }),
  base({
    issue_type:  'epic',
    title:       'Dashboard & Analytics',
    description: 'Real-time project health dashboard with velocity charts, bug trends, and sprint burndown so teams can make data-driven decisions.',
    priority:    'medium',
    status:      'todo',
    tags:        [],
  }),
  base({
    issue_type:  'epic',
    title:       'Notification & Collaboration System',
    description: 'In-app + email notifications for assignments, comments, and status changes. Slack integration as a stretch goal.',
    priority:    'medium',
    status:      'todo',
    tags:        [],
  }),
])

// ── 4. Stories ─────────────────────────────────────────────────────────────────
console.log('\n📖 Creating Stories…')
await insert([
  base({
    issue_type:  'story',
    title:       'As a user, I can sign up with email and password',
    description: 'Given I am on the sign-up page\nWhen I enter a valid email and password\nThen my account is created and I am redirected to the dashboard\n\nAcceptance criteria:\n- Email validation on blur\n- Password must be 8+ chars\n- Success toast on creation',
    priority:    'high',
    status:      'done',
  }),
  base({
    issue_type:  'story',
    title:       'As a user, I can reset my password via email link',
    description: 'Given I have forgotten my password\nWhen I request a reset link\nThen I receive an email within 60 seconds with a secure one-time link\n\nAcceptance criteria:\n- Link expires in 1 hour\n- Old password is invalidated after reset\n- Confirmation email sent after change',
    priority:    'high',
    status:      'in_progress',
  }),
  base({
    issue_type:  'story',
    title:       'As a team lead, I can invite members via email',
    description: 'Given I am a project admin\nWhen I enter a team member\'s email and select a role\nThen they receive an invite email with a join link\n\nAcceptance criteria:\n- Role selection: Admin, Developer, Viewer\n- Link expires in 7 days\n- Duplicate invite prevented',
    priority:    'medium',
    status:      'in_progress',
  }),
  base({
    issue_type:  'story',
    title:       'As a user, I can view sprint velocity chart',
    description: 'Given I am on the Reports page\nWhen I select a date range\nThen I see a bar chart of completed story points per sprint\n\nAcceptance criteria:\n- Chart updates in real time\n- Hover shows sprint name and total\n- Export to PNG supported',
    priority:    'medium',
    status:      'todo',
  }),
  base({
    issue_type:  'story',
    title:       'As a user, I receive a notification when assigned to a task',
    description: 'Given a task is assigned to me\nWhen the assignment happens\nThen I see a bell notification within 5 seconds\n\nAcceptance criteria:\n- Notification persists until read\n- Clicking navigates to the task\n- Email fallback if app is not open',
    priority:    'low',
    status:      'todo',
  }),
])

// ── 5. Tasks ───────────────────────────────────────────────────────────────────
console.log('\n☑️  Creating Tasks…')
const tasks = await insert([
  base({
    issue_type:  'task',
    title:       'Implement JWT refresh token rotation',
    description: 'Rotate refresh tokens on every use to prevent token theft. Invalidate old token immediately after rotation.',
    priority:    'high',
    status:      'in_progress',
    tags:        ['Security', 'R&D'],
  }),
  base({
    issue_type:  'task',
    title:       'Research WebSocket vs SSE for real-time updates',
    description: 'Compare WebSocket and Server-Sent Events for our notification system. Document latency, reconnect behaviour, and Supabase Realtime compatibility.',
    priority:    'medium',
    status:      'todo',
    tags:        ['R&D', 'Research'],
  }),
  base({
    issue_type:  'task',
    title:       'Optimise bug list query with pagination',
    description: 'Current query fetches all bugs at once. Add cursor-based pagination so large projects stay fast.',
    priority:    'high',
    status:      'todo',
    tags:        ['Performance', 'Enhancement'],
  }),
  base({
    issue_type:  'task',
    title:       'Refactor useStore to split by domain',
    description: 'The global Zustand store is growing too large. Split into: authStore, projectStore, issueStore, uiStore.',
    priority:    'medium',
    status:      'todo',
    tags:        ['Refactor'],
  }),
  base({
    issue_type:  'task',
    title:       'Design system: add dark mode token set',
    description: 'Map all colors.* tokens to CSS variables and provide a dark-mode override set. Test against all major components.',
    priority:    'low',
    status:      'todo',
    tags:        ['Design', 'Enhancement'],
  }),
  base({
    issue_type:  'task',
    title:       'Set up CI pipeline with automated tests',
    description: 'Configure GitHub Actions to run ESLint, type-check, and Playwright smoke tests on every PR. Block merge on failure.',
    priority:    'high',
    status:      'review',
    tags:        ['Infra'],
  }),
  base({
    issue_type:  'task',
    title:       'Add rate limiting to API routes',
    description: 'Use Upstash Redis to limit API endpoints: 60 req/min per user for mutations, 300 req/min for reads.',
    priority:    'medium',
    status:      'todo',
    tags:        ['Security', 'Infra'],
  }),
  base({
    issue_type:  'task',
    title:       'Spike: evaluate Resend vs SendGrid for email',
    description: 'Send 1000 test emails via both providers. Compare delivery rate, latency, cost, and DX. Recommend one by Friday.',
    priority:    'low',
    status:      'done',
    tags:        ['R&D', 'Research'],
  }),
])

// ── 6. Subtasks ────────────────────────────────────────────────────────────────
console.log('\n↳  Creating Subtasks…')
await insert([
  base({
    issue_type:  'subtask',
    title:       'Create token rotation DB table & migration',
    priority:    'high',
    status:      'done',
    tags:        [],
  }),
  base({
    issue_type:  'subtask',
    title:       'Implement rotation logic in auth middleware',
    priority:    'high',
    status:      'in_progress',
    tags:        [],
  }),
  base({
    issue_type:  'subtask',
    title:       'Write unit tests for token rotation',
    priority:    'medium',
    status:      'todo',
    tags:        [],
  }),
  base({
    issue_type:  'subtask',
    title:       'Benchmark WebSocket latency with 100 concurrent clients',
    priority:    'medium',
    status:      'todo',
    tags:        [],
  }),
  base({
    issue_type:  'subtask',
    title:       'Document SSE reconnect strategy',
    priority:    'low',
    status:      'todo',
    tags:        [],
  }),
  base({
    issue_type:  'subtask',
    title:       'Add EXPLAIN ANALYZE to slow queries',
    priority:    'high',
    status:      'in_progress',
    tags:        [],
  }),
  base({
    issue_type:  'subtask',
    title:       'Add keyset pagination to /api/bugs GET',
    priority:    'high',
    status:      'todo',
    tags:        [],
  }),
])

// ── 7. Bugs ────────────────────────────────────────────────────────────────────
console.log('\n🐛 Creating Bugs…')
await insert([
  base({
    issue_type:  'bug',
    title:       'Login redirects to 404 after password reset',
    description: 'Steps to reproduce:\n1. Request password reset\n2. Click email link\n3. Enter new password\n4. Click "Update password"\n\nExpected: redirect to /dashboard\nActual: redirect to /auth/confirm which returns 404',
    priority:    'critical',
    status:      'in_progress',
    tags:        [],
  }),
  base({
    issue_type:  'bug',
    title:       'Drag and drop breaks on Safari iOS 17',
    description: 'Steps to reproduce:\n1. Open Bug Board on iPhone (Safari)\n2. Long-press a card\n3. Try to drag to another column\n\nExpected: card moves to target column\nActual: card snaps back, no status change. Touch events not firing correctly.',
    priority:    'high',
    status:      'todo',
    tags:        [],
  }),
  base({
    issue_type:  'bug',
    title:       'Sprint burndown chart shows negative points',
    description: 'When a task is re-opened after being marked done within the same sprint, the burndown chart shows negative remaining points instead of adding them back.',
    priority:    'medium',
    status:      'todo',
    tags:        [],
  }),
  base({
    issue_type:  'bug',
    title:       'Notification bell count does not reset after reading all',
    description: 'Steps:\n1. Have 3 unread notifications\n2. Click each notification to read it\n3. Bell badge still shows "3"\n\nExpected: badge disappears when all read\nActual: badge persists until page reload',
    priority:    'medium',
    status:      'review',
    tags:        [],
  }),
  base({
    issue_type:  'bug',
    title:       'Project invite link generates duplicate members on double-click',
    description: 'If a user clicks the invite link twice quickly, they get added to project_members twice causing a unique constraint warning in the console.',
    priority:    'low',
    status:      'done',
    tags:        [],
  }),
])

console.log('\n🎉 All done! Refresh the app to see your data.\n')
