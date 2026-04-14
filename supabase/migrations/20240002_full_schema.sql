-- ============================================================
-- Full schema for Sethu workspace app
-- Run this ENTIRE block in Supabase → SQL Editor → New query
-- ============================================================

-- ── profiles ────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  name        text        not null default '',
  avatar_url  text,
  role        text        not null default 'member' check (role in ('admin','member')),
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='profiles_select') then
    create policy "profiles_select" on public.profiles for select to authenticated using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='profiles_insert') then
    create policy "profiles_insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='profiles_update') then
    create policy "profiles_update" on public.profiles for update to authenticated using (auth.uid() = id);
  end if;
end $$;

-- ── projects ─────────────────────────────────────────────────
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

do $$ begin
  if not exists (select 1 from pg_policies where tablename='projects' and policyname='projects_select') then
    create policy "projects_select" on public.projects for select to authenticated using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='projects' and policyname='projects_insert') then
    create policy "projects_insert" on public.projects for insert to authenticated with check (auth.uid() = created_by);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='projects' and policyname='projects_update') then
    create policy "projects_update" on public.projects for update to authenticated using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='projects' and policyname='projects_delete') then
    create policy "projects_delete" on public.projects for delete to authenticated using (auth.uid() = created_by);
  end if;
end $$;

-- ── bugs ─────────────────────────────────────────────────────
create table if not exists public.bugs (
  id           uuid        primary key default gen_random_uuid(),
  project_id   uuid        references public.projects(id) on delete cascade,
  title        text        not null,
  description  text        not null default '',
  priority     text        not null default 'medium' check (priority in ('critical','high','medium','low')),
  status       text        not null default 'todo' check (status in ('todo','in_progress','review','done')),
  assignee_id  uuid        references public.profiles(id) on delete set null,
  sprint_id    uuid,
  created_by   uuid        references public.profiles(id) on delete set null,
  tags         text[]      not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.bugs enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='bugs' and policyname='bugs_all') then
    create policy "bugs_all" on public.bugs for all to authenticated using (true) with check (true);
  end if;
end $$;

-- ── features ─────────────────────────────────────────────────
create table if not exists public.features (
  id           uuid        primary key default gen_random_uuid(),
  project_id   uuid        references public.projects(id) on delete cascade,
  title        text        not null,
  description  text        not null default '',
  priority     text        not null default 'medium' check (priority in ('critical','high','medium','low')),
  status       text        not null default 'todo' check (status in ('todo','in_progress','review','done')),
  assignee_id  uuid        references public.profiles(id) on delete set null,
  sprint_id    uuid,
  created_by   uuid        references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.features enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='features' and policyname='features_all') then
    create policy "features_all" on public.features for all to authenticated using (true) with check (true);
  end if;
end $$;

-- ── sprints ───────────────────────────────────────────────────
create table if not exists public.sprints (
  id           uuid        primary key default gen_random_uuid(),
  project_id   uuid        references public.projects(id) on delete cascade,
  name         text        not null,
  goal         text,
  start_date   text        not null default '',
  end_date     text        not null default '',
  status       text        not null default 'planning' check (status in ('planning','active','completed')),
  created_at   timestamptz not null default now()
);

alter table public.sprints enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='sprints' and policyname='sprints_all') then
    create policy "sprints_all" on public.sprints for all to authenticated using (true) with check (true);
  end if;
end $$;

-- ── channels ──────────────────────────────────────────────────
create table if not exists public.channels (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null unique,
  description text,
  created_at  timestamptz not null default now()
);

alter table public.channels enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='channels' and policyname='channels_select') then
    create policy "channels_select" on public.channels for select to authenticated using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='channels' and policyname='channels_insert') then
    create policy "channels_insert" on public.channels for insert to authenticated with check (true);
  end if;
end $$;

-- ── messages ──────────────────────────────────────────────────
create table if not exists public.messages (
  id          uuid        primary key default gen_random_uuid(),
  channel_id  uuid        not null references public.channels(id) on delete cascade,
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  content     text        not null,
  created_at  timestamptz not null default now()
);

alter table public.messages enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='messages' and policyname='messages_select') then
    create policy "messages_select" on public.messages for select to authenticated using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='messages' and policyname='messages_insert') then
    create policy "messages_insert" on public.messages for insert to authenticated with check (auth.uid() = user_id);
  end if;
end $$;

-- ── Seed default channel ──────────────────────────────────────
insert into public.channels (name, description)
values ('general', 'General team discussion')
on conflict (name) do nothing;

-- ── Enable realtime on key tables ─────────────────────────────
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.bugs;
alter publication supabase_realtime add table public.features;
