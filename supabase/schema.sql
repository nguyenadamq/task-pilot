create extension if not exists pgcrypto;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text not null default '',
  priority text not null default 'medium',
  duration_minutes integer not null default 60,
  deadline timestamptz,
  status text not null default 'todo',
  fixed_start timestamptz,
  fixed_end timestamptz,
  splittable boolean not null default false,
  asap boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tasks_title_not_blank check (char_length(trim(title)) > 0),
  constraint tasks_priority_check check (priority in ('low', 'medium', 'high')),
  constraint tasks_status_check check (status in ('todo', 'in_progress', 'complete')),
  constraint tasks_duration_positive check (duration_minutes > 0),
  constraint tasks_fixed_time_check check (
    (fixed_start is null and fixed_end is null)
    or
    (fixed_start is not null and fixed_end is not null and fixed_start < fixed_end)
  )
);

create table if not exists public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  kind text not null,
  day_of_week integer not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint availability_title_not_blank check (char_length(trim(title)) > 0),
  constraint availability_kind_check check (kind in ('work', 'sleep', 'unavailable', 'preferred')),
  constraint availability_day_check check (day_of_week between 0 and 6),
  constraint availability_time_check check (start_time <> end_time)
);

create table if not exists public.schedule_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  preferred_start_time time not null default '09:00',
  preferred_end_time time not null default '18:00',
  max_work_minutes_per_day integer not null default 300,
  buffer_minutes integer not null default 10,
  horizon_days integer not null default 7,
  overflow_allowed boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint preferences_work_cap_check check (max_work_minutes_per_day between 30 and 960),
  constraint preferences_buffer_check check (buffer_minutes between 0 and 120),
  constraint preferences_horizon_check check (horizon_days between 1 and 21),
  constraint preferences_time_check check (preferred_start_time <> preferred_end_time)
);

create table if not exists public.schedule_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null default 'generated',
  horizon_start timestamptz not null,
  horizon_end timestamptz not null,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  schedule_run_id uuid not null references public.schedule_runs (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete cascade,
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  duration_minutes integer not null,
  status text not null default 'scheduled',
  source text not null default 'generated',
  created_at timestamptz not null default timezone('utc', now()),
  constraint schedule_blocks_title_not_blank check (char_length(trim(title)) > 0),
  constraint schedule_blocks_time_check check (start_at < end_at),
  constraint schedule_blocks_duration_check check (duration_minutes > 0),
  constraint schedule_blocks_status_check check (status in ('scheduled', 'in_progress', 'complete', 'missed')),
  constraint schedule_blocks_source_check check (source in ('generated', 'fixed', 'locked'))
);

create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists tasks_deadline_idx on public.tasks (deadline);
create index if not exists availability_rules_user_id_idx on public.availability_rules (user_id);
create index if not exists schedule_runs_user_id_created_idx on public.schedule_runs (user_id, created_at desc);
create index if not exists schedule_blocks_user_run_idx on public.schedule_blocks (user_id, schedule_run_id);
create index if not exists schedule_blocks_task_idx on public.schedule_blocks (task_id);

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
for each row execute function public.set_updated_at();

drop trigger if exists preferences_set_updated_at on public.schedule_preferences;
create trigger preferences_set_updated_at
before update on public.schedule_preferences
for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;
alter table public.availability_rules enable row level security;
alter table public.schedule_preferences enable row level security;
alter table public.schedule_runs enable row level security;
alter table public.schedule_blocks enable row level security;

drop policy if exists "Users can manage their own tasks" on public.tasks;
create policy "Users can manage their own tasks"
on public.tasks
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage their own availability" on public.availability_rules;
create policy "Users can manage their own availability"
on public.availability_rules
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage their own preferences" on public.schedule_preferences;
create policy "Users can manage their own preferences"
on public.schedule_preferences
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage their own schedule runs" on public.schedule_runs;
create policy "Users can manage their own schedule runs"
on public.schedule_runs
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage their own schedule blocks" on public.schedule_blocks;
create policy "Users can manage their own schedule blocks"
on public.schedule_blocks
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
