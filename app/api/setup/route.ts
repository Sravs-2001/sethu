import { NextResponse } from 'next/server'

// Derive the project ref from the public Supabase URL
const PROJECT_REF = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
  .replace('https://', '')
  .replace('.supabase.co', '')

const SQL = `
  create table if not exists public.projects (
    id           uuid        primary key default gen_random_uuid(),
    name         text        not null,
    key          text        not null,
    description  text,
    avatar_color text        not null default '#0052CC',
    created_by   uuid,
    created_at   timestamptz not null default now()
  );

  alter table public.projects enable row level security;

  -- Add project_id to bugs/features/sprints if those tables exist
  do $$ begin
    if exists (select 1 from information_schema.tables where table_schema='public' and table_name='bugs') then
      if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='bugs' and column_name='project_id') then
        alter table public.bugs add column project_id uuid references public.projects(id);
      end if;
    end if;
  end $$;

  do $$ begin
    if exists (select 1 from information_schema.tables where table_schema='public' and table_name='features') then
      if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='features' and column_name='project_id') then
        alter table public.features add column project_id uuid references public.projects(id);
      end if;
    end if;
  end $$;

  do $$ begin
    if exists (select 1 from information_schema.tables where table_schema='public' and table_name='sprints') then
      if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='sprints' and column_name='project_id') then
        alter table public.sprints add column project_id uuid references public.projects(id);
      end if;
    end if;
  end $$;

  do $$ begin
    if not exists (
      select 1 from pg_policies where tablename='projects' and policyname='projects_select'
    ) then
      create policy "projects_select" on public.projects
        for select to authenticated using (true);
    end if;
  end $$;

  do $$ begin
    if not exists (
      select 1 from pg_policies where tablename='projects' and policyname='projects_insert'
    ) then
      create policy "projects_insert" on public.projects
        for insert to authenticated with check (auth.uid() = created_by);
    end if;
  end $$;

  do $$ begin
    if not exists (
      select 1 from pg_policies where tablename='projects' and policyname='projects_update'
    ) then
      create policy "projects_update" on public.projects
        for update to authenticated using (true);
    end if;
  end $$;
`

export async function POST() {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN

  if (!accessToken) {
    return NextResponse.json(
      { error: 'SUPABASE_ACCESS_TOKEN not set. See instructions below.', needsToken: true },
      { status: 400 }
    )
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

  if (!res.ok) {
    const body = await res.text()
    return NextResponse.json({ error: body }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
