-- Luna Tasks database schema for Supabase.
-- Run this file in Supabase SQL Editor, then enable Auth providers as needed.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  expires_at timestamptz not null default now() + interval '14 days',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_statuses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  color text not null default '#64748b',
  position integer not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  status_id uuid references public.task_statuses(id) on delete set null,
  title text not null,
  description text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  creator_id uuid not null references public.profiles(id) on delete restrict,
  due_date date,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_assignees (
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, user_id)
);

create table if not exists public.labels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  color text not null default '#2563eb',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create table if not exists public.task_labels (
  task_id uuid not null references public.tasks(id) on delete cascade,
  label_id uuid not null references public.labels(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, label_id)
);

create table if not exists public.subtasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null,
  is_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  bucket text not null default 'task-attachments',
  path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  type text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_members_user on public.workspace_members(user_id);
create index if not exists idx_members_workspace on public.workspace_members(workspace_id);
create index if not exists idx_tasks_workspace on public.tasks(workspace_id);
create index if not exists idx_tasks_status on public.tasks(status_id);
create index if not exists idx_tasks_due on public.tasks(due_date);
create index if not exists idx_comments_task on public.comments(task_id);
create index if not exists idx_notifications_user on public.notifications(user_id, read_at);
create index if not exists idx_activity_workspace on public.activity_log(workspace_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

do $$
declare
  t text;
begin
  foreach t in array array['profiles','workspaces','invitations','task_statuses','tasks','labels','subtasks','comments'] loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', t, t);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end;
$$;

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
stable
security definer
set search_path = public
language sql
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = target_workspace_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_admin(target_workspace_id uuid)
returns boolean
stable
security definer
set search_path = public
language sql
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = target_workspace_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

create or replace function public.task_workspace_id(target_task_id uuid)
returns uuid
stable
security definer
set search_path = public
language sql
as $$
  select workspace_id from public.tasks where id = target_task_id;
$$;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.invitations enable row level security;
alter table public.task_statuses enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignees enable row level security;
alter table public.labels enable row level security;
alter table public.task_labels enable row level security;
alter table public.subtasks enable row level security;
alter table public.comments enable row level security;
alter table public.attachments enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_log enable row level security;

drop policy if exists "profiles_select_visible" on public.profiles;
create policy "profiles_select_visible" on public.profiles
for select using (
  id = auth.uid()
  or exists (
    select 1
    from public.workspace_members mine
    join public.workspace_members other_member on other_member.workspace_id = mine.workspace_id
    where mine.user_id = auth.uid()
      and other_member.user_id = profiles.id
  )
);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "workspaces_select_members" on public.workspaces;
create policy "workspaces_select_members" on public.workspaces
for select using (public.is_workspace_member(id));

drop policy if exists "workspaces_insert_owner" on public.workspaces;
create policy "workspaces_insert_owner" on public.workspaces
for insert with check (owner_id = auth.uid());

drop policy if exists "workspaces_update_admins" on public.workspaces;
create policy "workspaces_update_admins" on public.workspaces
for update using (public.is_workspace_admin(id)) with check (public.is_workspace_admin(id));

drop policy if exists "members_select_members" on public.workspace_members;
create policy "members_select_members" on public.workspace_members
for select using (public.is_workspace_member(workspace_id));

drop policy if exists "members_insert_owner_or_self" on public.workspace_members;
create policy "members_insert_owner_or_self" on public.workspace_members
for insert with check (
  (user_id = auth.uid() and role = 'owner')
  or public.is_workspace_admin(workspace_id)
);

drop policy if exists "members_update_admins" on public.workspace_members;
create policy "members_update_admins" on public.workspace_members
for update using (public.is_workspace_admin(workspace_id)) with check (public.is_workspace_admin(workspace_id));

drop policy if exists "members_delete_admins" on public.workspace_members;
create policy "members_delete_admins" on public.workspace_members
for delete using (public.is_workspace_admin(workspace_id));

drop policy if exists "invitations_select_admins" on public.invitations;
create policy "invitations_select_admins" on public.invitations
for select using (public.is_workspace_admin(workspace_id) or lower(email) = lower(auth.jwt()->>'email'));

drop policy if exists "invitations_insert_admins" on public.invitations;
create policy "invitations_insert_admins" on public.invitations
for insert with check (public.is_workspace_admin(workspace_id));

drop policy if exists "invitations_update_admins" on public.invitations;
create policy "invitations_update_admins" on public.invitations
for update using (public.is_workspace_admin(workspace_id)) with check (public.is_workspace_admin(workspace_id));

drop policy if exists "statuses_all_members" on public.task_statuses;
create policy "statuses_all_members" on public.task_statuses
for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

drop policy if exists "tasks_all_members" on public.tasks;
create policy "tasks_all_members" on public.tasks
for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

drop policy if exists "task_assignees_all_members" on public.task_assignees;
create policy "task_assignees_all_members" on public.task_assignees
for all using (public.is_workspace_member(public.task_workspace_id(task_id)))
with check (public.is_workspace_member(public.task_workspace_id(task_id)));

drop policy if exists "labels_all_members" on public.labels;
create policy "labels_all_members" on public.labels
for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

drop policy if exists "task_labels_all_members" on public.task_labels;
create policy "task_labels_all_members" on public.task_labels
for all using (public.is_workspace_member(public.task_workspace_id(task_id)))
with check (public.is_workspace_member(public.task_workspace_id(task_id)));

drop policy if exists "subtasks_all_members" on public.subtasks;
create policy "subtasks_all_members" on public.subtasks
for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

drop policy if exists "comments_all_members" on public.comments;
create policy "comments_all_members" on public.comments
for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

drop policy if exists "attachments_all_members" on public.attachments;
create policy "attachments_all_members" on public.attachments
for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

drop policy if exists "notifications_own" on public.notifications;
create policy "notifications_own" on public.notifications
for select using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "notifications_insert_members" on public.notifications;
create policy "notifications_insert_members" on public.notifications
for insert with check (public.is_workspace_member(workspace_id));

drop policy if exists "activity_select_members" on public.activity_log;
create policy "activity_select_members" on public.activity_log
for select using (public.is_workspace_member(workspace_id));

drop policy if exists "activity_insert_members" on public.activity_log;
create policy "activity_insert_members" on public.activity_log
for insert with check (public.is_workspace_member(workspace_id));

create or replace function public.log_task_activity()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
declare
  action_text text;
begin
  if tg_op = 'INSERT' then
    action_text := 'creó una tarea';
  elsif tg_op = 'UPDATE' then
    action_text := 'actualizó una tarea';
  elsif tg_op = 'DELETE' then
    insert into public.activity_log(workspace_id, task_id, actor_id, action)
    values (old.workspace_id, old.id, auth.uid(), 'eliminó una tarea');
    return old;
  end if;

  insert into public.activity_log(workspace_id, task_id, actor_id, action)
  values (new.workspace_id, new.id, auth.uid(), action_text);
  return new;
end;
$$;

drop trigger if exists task_activity on public.tasks;
create trigger task_activity
after insert or update or delete on public.tasks
for each row execute function public.log_task_activity();

create or replace function public.notify_task_assignment()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
declare
  task_title text;
  target_workspace uuid;
begin
  select title, workspace_id into task_title, target_workspace from public.tasks where id = new.task_id;
  insert into public.notifications(workspace_id, user_id, task_id, type, message)
  values (target_workspace, new.user_id, new.task_id, 'assignment', 'Te asignaron: ' || task_title);
  return new;
end;
$$;

drop trigger if exists assignment_notification on public.task_assignees;
create trigger assignment_notification
after insert on public.task_assignees
for each row execute function public.notify_task_assignment();

create or replace function public.notify_comment()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
declare
  task_title text;
  assignee uuid;
begin
  select title into task_title from public.tasks where id = new.task_id;
  for assignee in select user_id from public.task_assignees where task_id = new.task_id loop
    if assignee <> new.author_id then
      insert into public.notifications(workspace_id, user_id, task_id, type, message)
      values (new.workspace_id, assignee, new.task_id, 'comment', 'Nuevo comentario en: ' || task_title);
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists comment_notification on public.comments;
create trigger comment_notification
after insert on public.comments
for each row execute function public.notify_comment();

alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.task_assignees;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.subtasks;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.activity_log;
