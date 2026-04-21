const SUPABASE_URL     = 'https://maancpslybylhejactva.supabase.co'
const SERVICE_ROLE_KEY = 'sb_secret_Yk3p2PDZVuETj6zc32bJIA_38y3_wk2'
const PROJECT_ID       = 'be9d22f8-6301-44c4-837e-3c09e4ea8562'
const USER_ID          = 'b26189cf-ac21-41be-b278-e259e96f9aca'

const headers = {
  'Content-Type':  'application/json',
  'apikey':        SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'Prefer':        'return=representation',
}

async function insert(rows) {
  const res  = await fetch(`${SUPABASE_URL}/rest/v1/bugs?select=id,title,issue_type`, { method: 'POST', headers, body: JSON.stringify(rows) })
  const data = await res.json()
  if (!Array.isArray(data)) { console.error('Error:', JSON.stringify(data)); return [] }
  data.forEach(r => console.log(`  [${r.issue_type}] ${r.title}`))
  return data
}

function b(extra) {
  return { project_id: PROJECT_ID, created_by: USER_ID, tags: [], priority: 'medium', status: 'todo', issue_type: 'task', description: '', ...extra }
}

console.log('\nSeeding Pro-A...\n')

console.log('Epics:')
await insert([
  b({ issue_type:'epic', title:'Mobile App Foundation', priority:'high', status:'in_progress',
      description:'Build core architecture for iOS and Android using React Native — covers navigation, auth, offline support, and push notifications.' }),
  b({ issue_type:'epic', title:'Payment & Billing Integration', priority:'high', status:'todo',
      description:'Integrate Stripe for subscription plans, one-time payments, invoices, and webhook-driven status updates.' }),
  b({ issue_type:'epic', title:'AI-Powered Search & Recommendations', priority:'low', status:'todo',
      description:'Use vector embeddings to enable semantic search across all project issues and recommend related items automatically.' }),
])

console.log('\nStories:')
await insert([
  b({ issue_type:'story', title:'As a user, I can log in with Google OAuth on mobile', priority:'high', status:'done',
      description:'Given I open the mobile app\nWhen I tap Continue with Google\nThen I am authenticated and land on home within 3 seconds\n\nCriteria:\n- Works on iOS and Android\n- Token stored in device keychain\n- Session persists across restarts' }),
  b({ issue_type:'story', title:'As a user, I can subscribe to a paid plan', priority:'high', status:'in_progress',
      description:'Given I am on the Billing page\nWhen I select a plan and enter card details\nThen my subscription is activated and I see updated feature access\n\nCriteria:\n- Stripe Elements embedded\n- Failed payment shows clear error\n- Confirmation email sent on success' }),
  b({ issue_type:'story', title:'As a user, I can search issues using natural language', priority:'medium', status:'todo',
      description:'Given I type a natural language query\nWhen I press Enter\nThen I see a filtered list matching my intent\n\nCriteria:\n- Results in under 500ms\n- Fallback to keyword search if AI unavailable\n- Search history saved locally' }),
  b({ issue_type:'story', title:'As an admin, I can export project data as CSV', priority:'medium', status:'todo',
      description:'Given I am on the Reports page\nWhen I click Export\nThen a CSV file downloads with all issues, statuses, and assignees\n\nCriteria:\n- Includes filtered results\n- File name includes project key and date\n- Max 10,000 rows per export' }),
  b({ issue_type:'story', title:'As a user, I receive push notifications for task assignments', priority:'low', status:'todo',
      description:'Given the mobile app is installed\nWhen someone assigns a task to me\nThen I receive a push notification within 10 seconds\n\nCriteria:\n- Works when app is backgrounded\n- Tapping opens the specific task\n- Notification preferences respected' }),
])

console.log('\nTasks:')
await insert([
  b({ issue_type:'task', title:'Set up React Native project with Expo Router', priority:'high', status:'done', tags:['Infra'],
      description:'Initialise mobile project with Expo SDK 51, configure file-based routing, and set up TypeScript strict mode.' }),
  b({ issue_type:'task', title:'Integrate Stripe Webhooks for subscription lifecycle', priority:'high', status:'in_progress', tags:['Enhancement', 'Security'],
      description:'Handle checkout.session.completed, invoice.paid, and customer.subscription.deleted events. Update user plan in DB on each event.' }),
  b({ issue_type:'task', title:'Research OpenAI Embeddings vs Cohere for search', priority:'medium', status:'in_progress', tags:['R&D', 'Research'],
      description:'Compare embedding quality, cost per 1M tokens, latency, and rate limits. Run test queries on 500 sample issues and measure relevance.' }),
  b({ issue_type:'task', title:'Build offline-first sync engine for mobile', priority:'high', status:'todo', tags:['R&D', 'Performance'],
      description:'Use WatermelonDB or MMKV with custom sync to allow issue creation and editing without network. Sync on reconnect.' }),
  b({ issue_type:'task', title:'Refactor billing API to support multiple currencies', priority:'medium', status:'todo', tags:['Refactor', 'Enhancement'],
      description:'Current Stripe integration is USD-only. Add currency detection by IP and store currency preference per user account.' }),
  b({ issue_type:'task', title:'Implement pgvector extension for semantic search', priority:'medium', status:'todo', tags:['R&D', 'Infra'],
      description:'Enable pgvector in Supabase, create embeddings column on bugs table, write Edge Function to generate and store embeddings on insert or update.' }),
  b({ issue_type:'task', title:'Add E2E tests for checkout flow', priority:'high', status:'review', tags:['Infra'],
      description:'Use Playwright with Stripe test mode to simulate successful payment, failed payment, and webhook delivery. Run in CI on every PR.' }),
  b({ issue_type:'task', title:'Design onboarding screens for mobile', priority:'low', status:'todo', tags:['Design'],
      description:'Create 4-screen onboarding carousel: Welcome, Key Features, Permissions (push/camera), Get Started. Match design system tokens.' }),
])

console.log('\nSubtasks:')
await insert([
  b({ issue_type:'subtask', title:'Configure Expo push notification credentials (APNs + FCM)', priority:'high', status:'done' }),
  b({ issue_type:'subtask', title:'Write notification permission request flow', priority:'medium', status:'in_progress' }),
  b({ issue_type:'subtask', title:'Test push delivery on physical iOS device', priority:'medium', status:'todo' }),
  b({ issue_type:'subtask', title:'Create Stripe webhook endpoint in Next.js API', priority:'high', status:'done' }),
  b({ issue_type:'subtask', title:'Verify webhook signature with Stripe-Signature header', priority:'high', status:'in_progress' }),
  b({ issue_type:'subtask', title:'Write failing invoice retry logic', priority:'medium', status:'todo' }),
  b({ issue_type:'subtask', title:'Generate 500 test embeddings using OpenAI ada-002', priority:'medium', status:'todo' }),
  b({ issue_type:'subtask', title:'Build cosine similarity query for top-10 results', priority:'medium', status:'todo' }),
])

console.log('\nBugs:')
await insert([
  b({ issue_type:'bug', title:'Stripe checkout session expires silently after 30 min idle', priority:'critical', status:'in_progress',
      description:'Steps to reproduce:\n1. Open checkout page\n2. Leave tab idle for 30+ minutes\n3. Click Pay now\n\nExpected: prompt to restart session\nActual: silent failure, no error shown to user, payment not processed' }),
  b({ issue_type:'bug', title:'Mobile keyboard pushes form off screen on Android', priority:'high', status:'todo',
      description:'Steps:\n1. Open task create form on Android 13\n2. Tap the description field\n3. Keyboard appears\n\nExpected: form scrolls up, all fields accessible\nActual: Submit button hidden behind keyboard' }),
  b({ issue_type:'bug', title:'CSV export includes deleted projects in output', priority:'medium', status:'todo',
      description:'When a project is deleted, its issues still appear in CSV export if the date range overlaps. The project name shows as null.' }),
  b({ issue_type:'bug', title:'Search returns duplicate results on fast typing', priority:'medium', status:'review',
      description:'When typing quickly (less than 100ms between keystrokes), results from intermediate queries arrive out of order and stack up causing duplicates.' }),
  b({ issue_type:'bug', title:'OAuth login loop on Safari private mode', priority:'high', status:'todo',
      description:'Steps:\n1. Open Safari in private browsing\n2. Click Login with Google\n3. Complete Google auth\n\nExpected: redirect back to app\nActual: infinite redirect loop. Likely a cookie restriction in private mode.' }),
])

console.log('\nDone! Switch to Pro-A in the app and refresh.\n')
