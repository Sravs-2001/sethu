// Thin wrapper so we can lazy-require 'pg' and give a clear error if missing
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

export async function createConnection(connectionString) {
  let Client
  try {
    const pg = require('pg')
    Client = pg.Client
  } catch {
    console.error('\n❌  Missing dependency: run  npm install  first\n')
    process.exit(1)
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },  // required for Supabase hosted Postgres
  })
  await client.connect()
  return client
}
