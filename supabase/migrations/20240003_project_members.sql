-- ============================================================
-- Project-scoped membership & visibility
-- Run in Supabase → SQL Editor → New query
-- ============================================================

-- ── project_members ──────────────────────────────────────────
create table if not exists public.project_members (
  id          uuid        primary key default gen_random_uuid(),
  project_id  uuid        not null references public.projects(id) on delete cascade,
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  role        text        not null default 'member' check (role in ('admin', 'member')),
  invited_by  uuid        references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (project_id, user_id)
);

alter table public.project_members enable row level security;

-- Admins see all project memberships; members see their own projects
do $$ begin
  if not exists (select 1 from pg_policies where tablename='project_members' and policyname='pm_select') then
    create policy "pm_select" on public.project_members for select to authenticated using (
      auth.uid() = user_id
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
      or project_id in (select project_id from public.project_members where user_id = auth.uid())
    );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='project_members' and policyname='pm_insert') then
    create policy "pm_insert" on public.project_members for insert to authenticated with check (
      exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='project_members' and policyname='pm_delete') then
    create policy "pm_delete" on public.project_members for delete to authenticated using (
      exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    );
  end if;
end $$;

-- ── Tighten projects visibility ───────────────────────────────
-- Drop old permissive select, replace with scoped one
drop policy if exists "projects_select" on public.projects;

create policy "projects_select" on public.projects for select to authenticated using (
  -- Global admins see everything
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  or
  -- Members only see projects they belong to
  id in (select project_id from public.project_members where user_id = auth.uid())
);

-- ── Tighten profiles visibility ───────────────────────────────
-- Members should only see profiles of people in shared projects
drop policy if exists "profiles_select" on public.profiles;

create policy "profiles_select" on public.profiles for select to authenticated using (
  -- Always see your own profile
  auth.uid() = id
  or
  -- Global admins see all profiles
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  or
  -- See profiles of people in the same project
  id in (
    select pm2.user_id
    from public.project_members pm1
    join public.project_members pm2 on pm1.project_id = pm2.project_id
    where pm1.user_id = auth.uid()
  )
);

-- ── Allow admins to update any profile role ───────────────────
drop policy if exists "profiles_update" on public.profiles;

create policy "profiles_update" on public.profiles for update to authenticated using (
  auth.uid() = id
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- ── Seed: add all existing admins to all existing projects ────
insert into public.project_members (project_id, user_id, role)
select p.id, pr.id, 'admin'
from public.projects p
cross join public.profiles pr
where pr.role = 'admin'
on conflict (project_id, user_id) do nothing;
