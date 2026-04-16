-- ============================================================
-- Sethu — complete schema setup (safe to re-run)
-- Paste this entire block into Supabase SQL Editor → Run
-- ============================================================

-- ── 1. profiles ──────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  name        text        not null default '',
  avatar_url  text,
  role        text        not null default 'member' check (role in ('admin','member')),
  created_at  timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select to authenticated using (
  id = auth.uid()
  or id in (
    select pm2.user_id from public.project_members pm1
    join public.project_members pm2 on pm1.project_id = pm2.project_id
    where pm1.user_id = auth.uid()
  )
  or id in (
    select p.created_by from public.projects p
    where p.id in (select project_id from public.project_members where user_id = auth.uid())
       or p.created_by = auth.uid()
  )
);
drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update to authenticated using (auth.uid() = id);

-- ── 2. project_members ───────────────────────────────────────
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

drop policy if exists "pm_select" on public.project_members;
create policy "pm_select" on public.project_members for select to authenticated using (
  user_id = auth.uid()
  or project_id in (select project_id from public.project_members where user_id = auth.uid())
  or project_id in (select id from public.projects where created_by = auth.uid())
);
drop policy if exists "pm_insert" on public.project_members;
create policy "pm_insert" on public.project_members for insert to authenticated with check (
  exists (select 1 from public.projects where id = project_id and created_by = auth.uid())
  or exists (
    select 1 from public.project_members pm2
    where pm2.project_id = project_members.project_id
      and pm2.user_id = auth.uid() and pm2.role = 'admin'
  )
  or user_id = auth.uid()
);
drop policy if exists "pm_update" on public.project_members;
create policy "pm_update" on public.project_members for update to authenticated using (
  exists (select 1 from public.projects where id = project_id and created_by = auth.uid())
  or exists (
    select 1 from public.project_members pm2
    where pm2.project_id = project_members.project_id
      and pm2.user_id = auth.uid() and pm2.role = 'admin'
  )
);
drop policy if exists "pm_delete" on public.project_members;
create policy "pm_delete" on public.project_members for delete to authenticated using (
  exists (select 1 from public.projects where id = project_id and created_by = auth.uid())
  or exists (
    select 1 from public.project_members pm2
    where pm2.project_id = project_id and pm2.user_id = auth.uid() and pm2.role = 'admin'
  )
);

-- ── 3. projects RLS (tighten to privacy model) ───────────────
drop policy if exists "projects_select" on public.projects;
create policy "projects_select" on public.projects for select to authenticated using (
  created_by = auth.uid()
  or id in (select project_id from public.project_members where user_id = auth.uid())
);
drop policy if exists "projects_insert" on public.projects;
create policy "projects_insert" on public.projects for insert to authenticated with check (auth.uid() = created_by);
drop policy if exists "projects_update" on public.projects;
create policy "projects_update" on public.projects for update to authenticated using (
  created_by = auth.uid()
  or id in (select project_id from public.project_members where user_id = auth.uid() and role = 'admin')
);
drop policy if exists "projects_delete" on public.projects;
create policy "projects_delete" on public.projects for delete to authenticated using (created_by = auth.uid());

-- ── 4. invite_tokens ─────────────────────────────────────────
create table if not exists public.invite_tokens (
  id          uuid        primary key default gen_random_uuid(),
  token       text        unique not null default encode(gen_random_bytes(32), 'hex'),
  project_id  uuid        references public.projects(id) on delete cascade,
  role        text        not null default 'member' check (role in ('admin','member')),
  created_by  uuid        references public.profiles(id),
  uses        integer     not null default 0,
  max_uses    integer     default null,
  expires_at  timestamptz default null,
  created_at  timestamptz default now()
);
alter table public.invite_tokens enable row level security;

drop policy if exists "it_select" on public.invite_tokens;
create policy "it_select" on public.invite_tokens for select to authenticated using (true);
drop policy if exists "it_insert" on public.invite_tokens;
create policy "it_insert" on public.invite_tokens for insert to authenticated with check (auth.uid() = created_by);
drop policy if exists "it_update" on public.invite_tokens;
create policy "it_update" on public.invite_tokens for update to authenticated using (true) with check (true);

-- ── 5. Add missing columns to bugs ───────────────────────────
alter table public.bugs add column if not exists issue_type  text        default 'bug' check (issue_type in ('epic','story','task','bug','subtask'));
alter table public.bugs add column if not exists due_date    text        default null;
alter table public.bugs add column if not exists sort_order  integer     default 0;

-- ── 6. comments ──────────────────────────────────────────────
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

drop policy if exists "comments_read" on public.comments;
create policy "comments_read" on public.comments for select to authenticated using (
  exists (
    select 1 from public.bugs b
    join public.project_members pm on pm.project_id = b.project_id
    where b.id = comments.task_id and pm.user_id = auth.uid()
  )
  or exists (select 1 from public.projects where created_by = auth.uid()
    and id in (select project_id from public.bugs where id = comments.task_id))
);
drop policy if exists "comments_insert" on public.comments;
create policy "comments_insert" on public.comments for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "comments_delete" on public.comments;
create policy "comments_delete" on public.comments for delete to authenticated using (auth.uid() = user_id);

-- ── 7. activity_logs ─────────────────────────────────────────
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

drop policy if exists "activity_read" on public.activity_logs;
create policy "activity_read" on public.activity_logs for select to authenticated using (
  exists (
    select 1 from public.bugs b
    join public.project_members pm on pm.project_id = b.project_id
    where b.id = activity_logs.task_id and pm.user_id = auth.uid()
  )
  or exists (select 1 from public.projects where created_by = auth.uid()
    and id in (select project_id from public.bugs where id = activity_logs.task_id))
);

-- ── 8. notifications ─────────────────────────────────────────
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
create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_unread_idx  on public.notifications(user_id, read) where read = false;
alter table public.notifications enable row level security;

drop policy if exists "notifications_read" on public.notifications;
create policy "notifications_read" on public.notifications for select to authenticated using (auth.uid() = user_id);
drop policy if exists "notifications_update" on public.notifications;
create policy "notifications_update" on public.notifications for update to authenticated using (auth.uid() = user_id);

-- ── 9. Realtime ──────────────────────────────────────────────
do $$ begin
  begin alter publication supabase_realtime add table public.comments;      exception when others then null; end;
  begin alter publication supabase_realtime add table public.notifications; exception when others then null; end;
end $$;

-- ── 10. updated_at trigger for comments ──────────────────────
create or replace function public.update_updated_at_column()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists comments_updated_at on public.comments;
create trigger comments_updated_at
  before update on public.comments
  for each row execute procedure public.update_updated_at_column();
