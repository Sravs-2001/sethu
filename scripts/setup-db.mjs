#!/usr/bin/env node
// ============================================================
// Sethu — automated database setup
// Usage:  npm run db:setup
// Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_ACCESS_TOKEN from .env.local
// No database password needed — uses Supabase Management API
// ============================================================

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Validate env ─────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN

if (!SUPABASE_URL || !ACCESS_TOKEN) {
  console.error('\n❌  Missing env vars in .env.local:')
  if (!SUPABASE_URL) console.error('   NEXT_PUBLIC_SUPABASE_URL  — your Supabase project URL')
  if (!ACCESS_TOKEN) console.error('   SUPABASE_ACCESS_TOKEN     — Supabase Dashboard → Account → Access Tokens')
  process.exit(1)
}

// Extract project ref from URL: https://XXXX.supabase.co → XXXX
const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]

// ── Load schema ───────────────────────────────────────────────
const schemaPath = join(__dirname, '..', 'supabase', 'schema.sql')
const sql = readFileSync(schemaPath, 'utf8')

console.log(`\n🗄️  Project: ${projectRef}`)
console.log('⚙️   Applying schema...\n')

// ── Run via Supabase Management API ──────────────────────────
const res = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
  {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ query: sql }),
  }
)

const body = await res.json().catch(() => ({}))

if (!res.ok) {
  console.error('❌  Failed:', body.message ?? body.error ?? JSON.stringify(body))
  console.error(`   HTTP ${res.status}\n`)
  process.exit(1)
}

console.log('✅  Schema applied successfully!')
console.log('   All tables, RLS policies, triggers and realtime subs are set up.\n')
