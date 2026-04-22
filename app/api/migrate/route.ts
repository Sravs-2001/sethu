import { NextResponse } from 'next/server'

const PROJECT_REF = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
  .replace('https://', '')
  .replace('.supabase.co', '')

const SQL = `
  do $$ declare cname text;
  begin
    select constraint_name into cname
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'bugs'
      and constraint_type = 'CHECK'
      and constraint_name ilike '%status%';
    if cname is not null then
      execute 'alter table public.bugs drop constraint ' || quote_ident(cname);
    end if;
  end $$;

  alter table public.bugs
    drop constraint if exists bugs_status_check;

  alter table public.bugs
    add constraint bugs_status_check
    check (status in ('unassigned','assigned','todo','in_progress','review','done'));
`

export async function POST() {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN
  if (!accessToken) {
    return NextResponse.json({ error: 'SUPABASE_ACCESS_TOKEN not set' }, { status: 400 })
  }

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: SQL }),
    }
  )

  const body = await res.text()
  if (!res.ok) {
    console.error('[migrate] failed:', body)
    return NextResponse.json({ error: body }, { status: 500 })
  }

  return NextResponse.json({ ok: true, message: 'bugs_status_check constraint updated' })
}
