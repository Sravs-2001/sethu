-- ============================================================
-- Sethu — complete idempotent schema  (auto-run via: npm run db:setup)
-- Strategy: create all tables first, then all policies, then triggers.
-- Safe to re-run at any time.
-- ============================================================

-- ── extensions ───────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ════════════════════════════════════════════════════════════
-- PHASE 1 — TABLE DEFINITIONS (no cross-references in policies)
-- ════════════════════════════════════════════════════════════

-- ── 1. profiles ──────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  name        text        not null default '',
  avatar_url  text,
  role        text        not null default 'member' check (role in ('admin','member')),
  created_at  timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- ── 2. projects ──────────────────────────────────────────────
create table if not exists public.projects (
  id           uuid        primary key default gen_random_uuid(),
  name         text        not null,
  key          text        not null,
  description  text,
  avatar_color text        not null default '#0052CC',
  created_by   uuid        references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
alter table public.projects enable row level security;

-- ── 3. project_members ───────────────────────────────────────
create table if not exists public.project_members (
  id          uuid        primary key default gen_random_uuid(),
  project_id  uuid        not null references public.projects(id) on delete cascade,
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  role        text        not null default 'member' check (role in ('admin','member')),
  invited_by  uuid        references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (project_id, user_id)
);
alter table public.project_members enable row level security;

-- ── 4. bugs (issues) ─────────────────────────────────────────
create table if not exists public.bugs (
  id           uuid        primary key default gen_random_uuid(),
  project_id   uuid        references public.projects(id) on delete cascade,
  title        text        not null,
  description  text        not null default '',
  priority     text        not null default 'medium' check (priority in ('critical','high','medium','low')),
  status       text        not null default 'todo'   check (status   in ('todo','in_progress','review','done')),
  issue_type   text        not null default 'bug'    check (issue_type in ('epic','story','task','bug','subtask')),
  assignee_id  uuid        references public.profiles(id) on delete set null,
  sprint_id    uuid,
  created_by   uuid        references public.profiles(id) on delete set null,
  tags         text[]      not null default '{}',
  due_date     text        default null,
  sort_order   integer     not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists bugs_project_id_idx  on public.bugs(project_id);
create index if not exists bugs_assignee_id_idx on public.bugs(assignee_id);
create index if not exists bugs_sprint_id_idx   on public.bugs(sprint_id);
alter table public.bugs enable row level security;

-- Add any missing columns to existing bugs table (safe on fresh DB too)
alter table public.bugs add column if not exists issue_type  text not null default 'bug';
alter table public.bugs add column if not exists due_date    text default null;
alter table public.bugs add column if not exists sort_order  integer not null default 0;

-- ── 5. features ──────────────────────────────────────────────
create table if not exists public.features (
  id           uuid        primary key default gen_random_uuid(),
  project_id   uuid        references public.projects(id) on delete cascade,
  title        text        not null,
  description  text        not null default '',
  priority     text        not null default 'medium' check (priority in ('critical','high','medium','low')),
  status       text        not null default 'todo'   check (status   in ('todo','in_progress','review','done')),
  assignee_id  uuid        references public.profiles(id) on delete set null,
  sprint_id    uuid,
  created_by   uuid        references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists features_project_id_idx on public.features(project_id);
alter table public.features enable row level security;

-- ── 6. sprints ───────────────────────────────────────────────
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
create index if not exists sprints_project_id_idx on public.sprints(project_id);
alter table public.sprints enable row level security;

-- ── 7. channels ──────────────────────────────────────────────
create table if not exists public.channels (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null unique,
  description text,
  created_at  timestamptz not null default now()
);
alter table public.channels enable row level security;

-- ── 8. messages ──────────────────────────────────────────────
create table if not exists public.messages (
  id          uuid        primary key default gen_random_uuid(),
  channel_id  uuid        not null references public.channels(id) on delete cascade,
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  content     text        not null,
  created_at  timestamptz not null default now()
);
create index if not exists messages_channel_id_idx on public.messages(channel_id);
alter table public.messages enable row level security;

-- ── 9. invite_tokens ─────────────────────────────────────────
create table if not exists public.invite_tokens (
  id          uuid        primary key default gen_random_uuid(),
  token       text        unique not null default encode(gen_random_bytes(32), 'hex'),
  project_id  uuid        references public.projects(id) on delete cascade,
  role        text        not null default 'member' check (role in ('admin','member')),
  created_by  uuid        references public.profiles(id) on delete set null,
  uses        integer     not null default 0,
  max_uses    integer     default null,
  expires_at  timestamptz default null,
  created_at  timestamptz not null default now()
);
alter table public.invite_tokens enable row level security;

-- ── 10. comments ─────────────────────────────────────────────
create table if not exists public.comments (
  id          uuid        primary key default gen_random_uuid(),
  task_id     uuid        not null references public.bugs(id) on delete cascade,
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  content     text        not null check (char_length(content) > 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists comments_task_id_idx on public.comments(task_id);
alter table public.comments enable row level security;

-- ── 11. activity_logs ────────────────────────────────────────
create table if not exists public.activity_logs (
  id          uuid        primary key default gen_random_uuid(),
  task_id     uuid        not null references public.bugs(id) on delete cascade,
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  action      text        not null check (action in (
    'created','status_changed','priority_changed','assigned',
    'commented','type_changed','due_date_set','sprint_changed'
  )),
  "from"      text,
  "to"        text,
  created_at  timestamptz not null default now()
);
create index if not exists activity_logs_task_id_idx on public.activity_logs(task_id);
alter table public.activity_logs enable row level security;

-- ── 12. notifications ────────────────────────────────────────
create table if not exists public.notifications (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  type        text        not null check (type in (
    'task_assigned','status_changed','mentioned',
    'invite_received','comment_added','due_soon'
  )),
  title       text        not null,
  body        text        not null default '',
  read        boolean     not null default false,
  link        text,
  data        jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_user_id_idx  on public.notifications(user_id);
create index if not exists notifications_unread_idx   on public.notifications(user_id, read) where read = false;
alter table public.notifications enable row level security;

-- ════════════════════════════════════════════════════════════
-- PHASE 2 — HELPER FUNCTIONS (must come before all policies)
-- ════════════════════════════════════════════════════════════
-- These run as the DB owner (security definer) so they can query
-- project_members without triggering the same RLS policy, breaking
-- every possible direct/mutual recursion loop.

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

-- ════════════════════════════════════════════════════════════
-- PHASE 3 — RLS POLICIES (all tables + helper functions exist)
-- ════════════════════════════════════════════════════════════

-- profiles ────────────────────────────────────────────────────
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (
    id = auth.uid()
    or id in (
      -- see teammates: any profile that shares a project with you
      select user_id from public.project_members
      where project_id in (select public.my_project_ids())
    )
  );

drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update to authenticated using (auth.uid() = id);

-- projects ────────────────────────────────────────────────────
drop policy if exists "projects_select" on public.projects;
create policy "projects_select" on public.projects
  for select to authenticated using (
    created_by = auth.uid()
    or id in (select public.my_project_ids())
  );

drop policy if exists "projects_insert" on public.projects;
create policy "projects_insert" on public.projects
  for insert to authenticated with check (auth.uid() = created_by);

drop policy if exists "projects_update" on public.projects;
create policy "projects_update" on public.projects
  for update to authenticated using (
    created_by = auth.uid()
    or public.is_project_admin(id)
  );

drop policy if exists "projects_delete" on public.projects;
create policy "projects_delete" on public.projects
  for delete to authenticated using (created_by = auth.uid());

-- project_members ─────────────────────────────────────────────
drop policy if exists "pm_select" on public.project_members;
create policy "pm_select" on public.project_members
  for select to authenticated using (
    user_id = auth.uid()
    or project_id in (select public.my_project_ids())
  );

drop policy if exists "pm_insert" on public.project_members;
create policy "pm_insert" on public.project_members
  for insert to authenticated with check (
    exists (select 1 from public.projects where id = project_id and created_by = auth.uid())
    or public.is_project_admin(project_id)
    or user_id = auth.uid()
  );

drop policy if exists "pm_update" on public.project_members;
create policy "pm_update" on public.project_members
  for update to authenticated using (
    exists (select 1 from public.projects where id = project_id and created_by = auth.uid())
    or public.is_project_admin(project_id)
  );

drop policy if exists "pm_delete" on public.project_members;
create policy "pm_delete" on public.project_members
  for delete to authenticated using (
    exists (select 1 from public.projects where id = project_id and created_by = auth.uid())
    or public.is_project_admin(project_id)
  );

-- bugs ────────────────────────────────────────────────────────
drop policy if exists "bugs_select" on public.bugs;
create policy "bugs_select" on public.bugs
  for select to authenticated using (
    project_id in (select public.my_project_ids())
    or project_id in (select id from public.projects where created_by = auth.uid())
  );

drop policy if exists "bugs_insert" on public.bugs;
create policy "bugs_insert" on public.bugs
  for insert to authenticated with check (
    project_id in (select public.my_project_ids())
    or project_id in (select id from public.projects where created_by = auth.uid())
  );

drop policy if exists "bugs_update" on public.bugs;
create policy "bugs_update" on public.bugs
  for update to authenticated using (
    project_id in (select public.my_project_ids())
    or project_id in (select id from public.projects where created_by = auth.uid())
  );

drop policy if exists "bugs_delete" on public.bugs;
create policy "bugs_delete" on public.bugs
  for delete to authenticated using (
    project_id in (select public.my_project_ids())
    or project_id in (select id from public.projects where created_by = auth.uid())
  );

-- features ────────────────────────────────────────────────────
drop policy if exists "features_select" on public.features;
create policy "features_select" on public.features
  for select to authenticated using (
    project_id in (select public.my_project_ids())
    or project_id in (select id from public.projects where created_by = auth.uid())
  );

drop policy if exists "features_insert" on public.features;
create policy "features_insert" on public.features
  for insert to authenticated with check (
    project_id in (select public.my_project_ids())
    or project_id in (select id from public.projects where created_by = auth.uid())
  );

drop policy if exists "features_update" on public.features;
create policy "features_update" on public.features
  for update to authenticated using (
    project_id in (select public.my_project_ids())
    or project_id in (select id from public.projects where created_by = auth.uid())
  );

drop policy if exists "features_delete" on public.features;
create policy "features_delete" on public.features
  for delete to authenticated using (
    project_id in (select public.my_project_ids())
    or project_id in (select id from public.projects where created_by = auth.uid())
  );

-- sprints ─────────────────────────────────────────────────────
drop policy if exists "sprints_select" on public.sprints;
create policy "sprints_select" on public.sprints
  for select to authenticated using (
    project_id in (select public.my_project_ids())
    or project_id in (select id from public.projects where created_by = auth.uid())
  );

drop policy if exists "sprints_insert" on public.sprints;
create policy "sprints_insert" on public.sprints
  for insert to authenticated with check (
    project_id in (select public.my_project_ids())
    or project_id in (select id from public.projects where created_by = auth.uid())
  );

drop policy if exists "sprints_update" on public.sprints;
create policy "sprints_update" on public.sprints
  for update to authenticated using (
    project_id in (select public.my_project_ids())
    or project_id in (select id from public.projects where created_by = auth.uid())
  );

drop policy if exists "sprints_delete" on public.sprints;
create policy "sprints_delete" on public.sprints
  for delete to authenticated using (
    project_id in (select public.my_project_ids())
    or project_id in (select id from public.projects where created_by = auth.uid())
  );

-- channels
drop policy if exists "channels_select" on public.channels;
create policy "channels_select" on public.channels
  for select to authenticated using (true);

drop policy if exists "channels_insert" on public.channels;
create policy "channels_insert" on public.channels
  for insert to authenticated with check (true);

-- messages
drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages
  for select to authenticated using (true);

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert to authenticated with check (auth.uid() = user_id);

-- invite_tokens
drop policy if exists "it_select" on public.invite_tokens;
create policy "it_select" on public.invite_tokens
  for select to authenticated using (true);

drop policy if exists "it_insert" on public.invite_tokens;
create policy "it_insert" on public.invite_tokens
  for insert to authenticated with check (auth.uid() = created_by);

drop policy if exists "it_update" on public.invite_tokens;
create policy "it_update" on public.invite_tokens
  for update to authenticated using (true) with check (true);

-- comments
drop policy if exists "comments_read" on public.comments;
create policy "comments_read" on public.comments
  for select to authenticated using (
    exists (
      select 1 from public.bugs b
      where b.id = comments.task_id
        and b.project_id in (
          select id from public.projects where
            created_by = auth.uid()
            or id in (select project_id from public.project_members where user_id = auth.uid())
        )
    )
  );

drop policy if exists "comments_insert" on public.comments;
create policy "comments_insert" on public.comments
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "comments_delete" on public.comments;
create policy "comments_delete" on public.comments
  for delete to authenticated using (auth.uid() = user_id);

-- activity_logs
drop policy if exists "activity_read" on public.activity_logs;
create policy "activity_read" on public.activity_logs
  for select to authenticated using (
    exists (
      select 1 from public.bugs b
      where b.id = activity_logs.task_id
        and b.project_id in (
          select id from public.projects where
            created_by = auth.uid()
            or id in (select project_id from public.project_members where user_id = auth.uid())
        )
    )
  );

drop policy if exists "activity_insert" on public.activity_logs;
create policy "activity_insert" on public.activity_logs
  for insert to authenticated with check (auth.uid() = user_id);

-- notifications
drop policy if exists "notifications_read" on public.notifications;
create policy "notifications_read" on public.notifications
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "notifications_insert" on public.notifications;
create policy "notifications_insert" on public.notifications
  for insert to authenticated with check (true);

drop policy if exists "notifications_update" on public.notifications;
create policy "notifications_update" on public.notifications
  for update to authenticated using (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════
-- PHASE 3 — TRIGGERS & FUNCTIONS
-- ════════════════════════════════════════════════════════════

-- Auto-create profile whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, avatar_url, role)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'user_name',
      split_part(new.email, '@', 1),
      'User'
    ),
    new.raw_user_meta_data->>'avatar_url',
    'member'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- updated_at function
create or replace function public.update_updated_at_column()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists bugs_updated_at     on public.bugs;
drop trigger if exists features_updated_at on public.features;
drop trigger if exists comments_updated_at on public.comments;

create trigger bugs_updated_at
  before update on public.bugs
  for each row execute procedure public.update_updated_at_column();

create trigger features_updated_at
  before update on public.features
  for each row execute procedure public.update_updated_at_column();

create trigger comments_updated_at
  before update on public.comments
  for each row execute procedure public.update_updated_at_column();

-- ════════════════════════════════════════════════════════════
-- PHASE 4 — SEED DATA & REALTIME
-- ════════════════════════════════════════════════════════════

-- Default channel
insert into public.channels (name, description)
values ('general', 'General team discussion')
on conflict (name) do nothing;

-- Realtime subscriptions
do $$ begin
  begin alter publication supabase_realtime add table public.bugs;          exception when others then null; end;
  begin alter publication supabase_realtime add table public.features;      exception when others then null; end;
  begin alter publication supabase_realtime add table public.messages;      exception when others then null; end;
  begin alter publication supabase_realtime add table public.comments;      exception when others then null; end;
  begin alter publication supabase_realtime add table public.notifications; exception when others then null; end;
end $$;
