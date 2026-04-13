import { NextResponse } from 'next/server'

// Derive the project ref from the public Supabase URL
const PROJECT_REF = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
  .replace('https://', '')
  .replace('.supabase.co', '')

const SQL = `
  -- Projects table
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

  -- Project members table (controls who can see each project)
  create table if not exists public.project_members (
    id         uuid        primary key default gen_random_uuid(),
    project_id uuid        not null references public.projects(id) on delete cascade,
    user_id    uuid        not null references auth.users(id) on delete cascade,
    role       text        not null default 'member' check (role in ('admin','member')),
    created_at timestamptz not null default now(),
    unique (project_id, user_id)
  );
  alter table public.project_members enable row level security;

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

  -- RLS policies for projects: visible only to members
  do $$ begin
    if not exists (select 1 from pg_policies where tablename='projects' and policyname='projects_select') then
      create policy "projects_select" on public.projects
        for select to authenticated using (
          exists (select 1 from public.project_members where project_id = id and user_id = auth.uid())
          or created_by = auth.uid()
        );
    end if;
  end $$;

  do $$ begin
    if not exists (select 1 from pg_policies where tablename='projects' and policyname='projects_insert') then
      create policy "projects_insert" on public.projects
        for insert to authenticated with check (auth.uid() = created_by);
    end if;
  end $$;

  do $$ begin
    if not exists (select 1 from pg_policies where tablename='projects' and policyname='projects_update') then
      create policy "projects_update" on public.projects
        for update to authenticated using (
          exists (select 1 from public.project_members where project_id = id and user_id = auth.uid() and role = 'admin')
          or created_by = auth.uid()
        );
    end if;
  end $$;

  -- RLS policies for project_members
  do $$ begin
    if not exists (select 1 from pg_policies where tablename='project_members' and policyname='pm_select') then
      create policy "pm_select" on public.project_members
        for select to authenticated using (
          user_id = auth.uid()
          or exists (select 1 from public.project_members pm2 where pm2.project_id = project_id and pm2.user_id = auth.uid())
        );
    end if;
  end $$;

  do $$ begin
    if not exists (select 1 from pg_policies where tablename='project_members' and policyname='pm_insert') then
      create policy "pm_insert" on public.project_members
        for insert to authenticated with check (true);
    end if;
  end $$;

  do $$ begin
    if not exists (select 1 from pg_policies where tablename='project_members' and policyname='pm_update') then
      create policy "pm_update" on public.project_members
        for update to authenticated using (
          exists (select 1 from public.project_members pm2 where pm2.project_id = project_id and pm2.user_id = auth.uid() and pm2.role = 'admin')
        );
    end if;
  end $$;

  do $$ begin
    if not exists (select 1 from pg_policies where tablename='project_members' and policyname='pm_delete') then
      create policy "pm_delete" on public.project_members
        for delete to authenticated using (
          exists (select 1 from public.project_members pm2 where pm2.project_id = project_id and pm2.user_id = auth.uid() and pm2.role = 'admin')
        );
    end if;
  end $$;

  -- Migrate existing projects: add creators as admins in project_members
  insert into public.project_members (project_id, user_id, role)
  select id, created_by, 'admin'
  from public.projects
  where created_by is not null
  on conflict (project_id, user_id) do nothing;
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
