import { NextResponse } from 'next/server'

const PROJECT_REF = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
  .replace('https://', '')
  .replace('.supabase.co', '')

const SQL = `
  -- ── projects table ─────────────────────────────────────────────
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

  -- ── Add project_id to bugs/features/sprints if missing ─────────
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

  -- ── issue_type column on bugs ───────────────────────────────────
  do $$ begin
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='bugs' and column_name='issue_type') then
      alter table public.bugs add column issue_type text default 'bug';
    end if;
  end $$;

  -- ── invite_tokens table ─────────────────────────────────────────
  create table if not exists public.invite_tokens (
    id          uuid      primary key default gen_random_uuid(),
    token       text      unique not null default encode(gen_random_bytes(32), 'hex'),
    project_id  uuid      references public.projects(id) on delete cascade,
    role        text      not null default 'member',
    created_by  uuid      references public.profiles(id),
    uses        integer   not null default 0,
    expires_at  timestamptz default null,
    created_at  timestamptz default now()
  );
  alter table public.invite_tokens enable row level security;

  do $$ begin
    if not exists (select 1 from pg_policies where tablename='invite_tokens' and policyname='it_select') then
      create policy "it_select" on public.invite_tokens for select to authenticated using (true);
    end if;
  end $$;
  do $$ begin
    if not exists (select 1 from pg_policies where tablename='invite_tokens' and policyname='it_insert') then
      create policy "it_insert" on public.invite_tokens for insert to authenticated with check (auth.uid() = created_by);
    end if;
  end $$;
  do $$ begin
    if not exists (select 1 from pg_policies where tablename='invite_tokens' and policyname='it_update') then
      create policy "it_update" on public.invite_tokens for update to authenticated using (true) with check (true);
    end if;
  end $$;

  -- ── project_members table ───────────────────────────────────────
  create table if not exists public.project_members (
    id          uuid primary key default gen_random_uuid(),
    project_id  uuid not null references public.projects(id) on delete cascade,
    user_id     uuid not null references public.profiles(id) on delete cascade,
    role        text not null default 'member' check (role in ('admin','member')),
    invited_by  uuid references public.profiles(id) on delete set null,
    created_at  timestamptz not null default now(),
    unique (project_id, user_id)
  );
  alter table public.project_members enable row level security;

  -- ── Security-definer helpers (run as DB owner, no RLS recursion) ──
  create or replace function public.my_project_ids()
  returns setof uuid language sql security definer stable as $$
    select project_id from public.project_members where user_id = auth.uid()
  $$;

  create or replace function public.is_project_admin(pid uuid)
  returns boolean language sql security definer stable as $$
    select exists (
      select 1 from public.project_members
      where project_id = pid and user_id = auth.uid() and role = 'admin'
    )
  $$;

  create or replace function public.is_project_owner(pid uuid)
  returns boolean language sql security definer stable as $$
    select exists (
      select 1 from public.projects
      where id = pid and created_by = auth.uid()
    )
  $$;

  -- ── PRIVACY: tighten all RLS policies ──────────────────────────

  -- projects: only creator or explicit member can see it
  drop policy if exists "projects_select" on public.projects;
  create policy "projects_select" on public.projects for select to authenticated using (
    created_by = auth.uid()
    or id in (select public.my_project_ids())
  );

  drop policy if exists "projects_insert" on public.projects;
  create policy "projects_insert" on public.projects for insert to authenticated with check (auth.uid() = created_by);

  drop policy if exists "projects_update" on public.projects;
  create policy "projects_update" on public.projects for update to authenticated using (
    created_by = auth.uid()
    or public.is_project_admin(id)
  );

  drop policy if exists "projects_delete" on public.projects;
  create policy "projects_delete" on public.projects for delete to authenticated using (created_by = auth.uid());

  -- project_members: see teammates in your projects only
  -- Uses security-definer functions to avoid infinite recursion
  drop policy if exists "pm_select" on public.project_members;
  create policy "pm_select" on public.project_members for select to authenticated using (
    user_id = auth.uid()
    or project_id in (select public.my_project_ids())
    or public.is_project_owner(project_id)
  );

  drop policy if exists "pm_insert" on public.project_members;
  create policy "pm_insert" on public.project_members for insert to authenticated with check (
    public.is_project_owner(project_id)
    or public.is_project_admin(project_id)
    or user_id = auth.uid()
  );

  drop policy if exists "pm_update" on public.project_members;
  create policy "pm_update" on public.project_members for update to authenticated using (
    public.is_project_owner(project_id)
    or public.is_project_admin(project_id)
  );

  drop policy if exists "pm_delete" on public.project_members;
  create policy "pm_delete" on public.project_members for delete to authenticated using (
    public.is_project_owner(project_id)
    or public.is_project_admin(project_id)
  );

  -- profiles: only see teammates
  drop policy if exists "profiles_select" on public.profiles;
  create policy "profiles_select" on public.profiles for select to authenticated using (
    id = auth.uid()
    or id in (
      select user_id from public.project_members
      where project_id in (select public.my_project_ids())
    )
  );

  drop policy if exists "profiles_insert" on public.profiles;
  create policy "profiles_insert" on public.profiles for insert to authenticated with check (auth.uid() = id);

  drop policy if exists "profiles_update" on public.profiles;
  create policy "profiles_update" on public.profiles for update to authenticated using (auth.uid() = id);

  -- ── CLEANUP: remove seeded cross-join entries ───────────────────
  -- Seeded entries: invited_by IS NULL and user is NOT the project creator
  delete from public.project_members pm
  where pm.invited_by is null
  and pm.user_id != (select p.created_by from public.projects p where p.id = pm.project_id);
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
