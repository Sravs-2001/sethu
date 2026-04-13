-- ============================================================
-- Run this ENTIRE block in Supabase → SQL Editor → New query
-- ============================================================

-- Drop old version if it exists (safe re-run)
drop table if exists public.projects cascade;

create table public.projects (
  id           uuid        primary key default gen_random_uuid(),
  name         text        not null,
  key          text        not null,
  description  text,
  avatar_color text        not null default '#0052CC',
  created_by   uuid,                          -- no FK constraint, just stores auth uid
  created_at   timestamptz not null default now()
);

-- Enable RLS
alter table public.projects enable row level security;

-- Allow all authenticated users to read
create policy "projects_select"
  on public.projects for select
  to authenticated
  using (true);

-- Allow authenticated users to insert (created_by must match their uid)
create policy "projects_insert"
  on public.projects for insert
  to authenticated
  with check (auth.uid() = created_by);

-- Allow authenticated users to update
create policy "projects_update"
  on public.projects for update
  to authenticated
  using (true);

-- ============================================================
-- After running: go to Supabase → API → click "Reload schema"
-- ============================================================
