-- ── Comments ──────────────────────────────────────────────────────────────────

create table if not exists comments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references bugs(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  content     text not null check (char_length(content) > 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists comments_task_id_idx on comments(task_id);
create index if not exists comments_user_id_idx on comments(user_id);

-- ── Activity logs ─────────────────────────────────────────────────────────────

create table if not exists activity_logs (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references bugs(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  action      text not null check (action in (
    'created', 'status_changed', 'priority_changed', 'assigned',
    'commented', 'type_changed', 'due_date_set', 'sprint_changed'
  )),
  "from"      text,
  "to"        text,
  created_at  timestamptz not null default now()
);

create index if not exists activity_logs_task_id_idx on activity_logs(task_id);

-- ── Notifications ─────────────────────────────────────────────────────────────

create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  type        text not null check (type in (
    'task_assigned', 'status_changed', 'mentioned',
    'invite_received', 'comment_added', 'due_soon'
  )),
  title       text not null,
  body        text not null default '',
  read        boolean not null default false,
  link        text,
  data        jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on notifications(user_id);
create index if not exists notifications_unread_idx  on notifications(user_id, read) where read = false;

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table comments        enable row level security;
alter table activity_logs   enable row level security;
alter table notifications   enable row level security;

-- Comments: project members can read; author can insert/delete
create policy "comments_read" on comments
  for select using (
    exists (
      select 1 from bugs b
      join project_members pm on pm.project_id = b.project_id
      where b.id = comments.task_id and pm.user_id = auth.uid()
    )
  );

create policy "comments_insert" on comments
  for insert with check (auth.uid() = user_id);

create policy "comments_delete" on comments
  for delete using (auth.uid() = user_id);

-- Activity logs: project members can read; service role inserts
create policy "activity_read" on activity_logs
  for select using (
    exists (
      select 1 from bugs b
      join project_members pm on pm.project_id = b.project_id
      where b.id = activity_logs.task_id and pm.user_id = auth.uid()
    )
  );

-- Notifications: owner only
create policy "notifications_read" on notifications
  for select using (auth.uid() = user_id);

create policy "notifications_update" on notifications
  for update using (auth.uid() = user_id);

-- ── Auto-update updated_at on comments ───────────────────────────────────────

create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists comments_updated_at on comments;
create trigger comments_updated_at
  before update on comments
  for each row execute procedure update_updated_at_column();

-- ── Realtime ──────────────────────────────────────────────────────────────────

alter publication supabase_realtime add table comments;
alter publication supabase_realtime add table notifications;
