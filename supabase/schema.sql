create extension if not exists pgcrypto;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text not null default '',
  duration_minutes integer not null default 60,
  deadline timestamptz,
  priority text not null default 'medium',
  fixed_start timestamptz,
  fixed_end timestamptz,
  status text not null default 'todo',
  splittable boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tasks_title_not_blank check (char_length(trim(title)) > 0),
  constraint tasks_duration_positive check (duration_minutes > 0),
  constraint tasks_priority_check check (priority in ('low', 'medium', 'high')),
  constraint tasks_status_check check (status in ('todo', 'in_progress', 'done')),
  constraint tasks_fixed_time_check check (
    (fixed_start is null and fixed_end is null)
    or
    (fixed_start is not null and fixed_end is not null and fixed_start < fixed_end)
  )
);

create table if not exists public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  day_of_week integer not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint availability_rules_day_check check (day_of_week between 0 and 6),
  constraint availability_rules_time_check check (start_time < end_time)
);

create table if not exists public.fixed_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  day_of_week integer not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint fixed_events_title_not_blank check (char_length(trim(title)) > 0),
  constraint fixed_events_day_check check (day_of_week between 0 and 6),
  constraint fixed_events_time_check check (start_time < end_time)
);

create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists tasks_deadline_idx on public.tasks (deadline);
create index if not exists availability_rules_user_id_idx on public.availability_rules (user_id);
create index if not exists fixed_events_user_id_idx on public.fixed_events (user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;

create trigger tasks_set_updated_at
before update on public.tasks
for each row
execute function public.set_updated_at();

alter table public.tasks enable row level security;
alter table public.availability_rules enable row level security;
alter table public.fixed_events enable row level security;

drop policy if exists "Users can view their own tasks" on public.tasks;
create policy "Users can view their own tasks"
on public.tasks
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create their own tasks" on public.tasks;
create policy "Users can create their own tasks"
on public.tasks
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own tasks" on public.tasks;
create policy "Users can update their own tasks"
on public.tasks
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own tasks" on public.tasks;
create policy "Users can delete their own tasks"
on public.tasks
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can view their own availability rules" on public.availability_rules;
create policy "Users can view their own availability rules"
on public.availability_rules
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create their own availability rules" on public.availability_rules;
create policy "Users can create their own availability rules"
on public.availability_rules
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own availability rules" on public.availability_rules;
create policy "Users can update their own availability rules"
on public.availability_rules
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own availability rules" on public.availability_rules;
create policy "Users can delete their own availability rules"
on public.availability_rules
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can view their own fixed events" on public.fixed_events;
create policy "Users can view their own fixed events"
on public.fixed_events
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create their own fixed events" on public.fixed_events;
create policy "Users can create their own fixed events"
on public.fixed_events
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own fixed events" on public.fixed_events;
create policy "Users can update their own fixed events"
on public.fixed_events
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own fixed events" on public.fixed_events;
create policy "Users can delete their own fixed events"
on public.fixed_events
for delete
to authenticated
using (auth.uid() = user_id);
