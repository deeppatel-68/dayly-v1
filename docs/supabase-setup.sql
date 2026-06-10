-- Dayly — Supabase schema setup
-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Matches the tables/columns the app reads and writes
-- (AuthContext.tsx, HabitsContext.tsx).

-- ============ profiles ============
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  username text,
  -- stored as JS Date.toDateString() strings (e.g. "Wed Jun 10 2026"), so text not date
  last_reset_date text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ============ habits ============
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  target_count integer not null default 1,
  icon text,
  color text,
  frequency text not null default 'daily',
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists habits_user_id_idx on public.habits (user_id);

alter table public.habits enable row level security;

create policy "Users can view own habits"
  on public.habits for select
  using (auth.uid() = user_id);

create policy "Users can insert own habits"
  on public.habits for insert
  with check (auth.uid() = user_id);

create policy "Users can update own habits"
  on public.habits for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own habits"
  on public.habits for delete
  using (auth.uid() = user_id);

-- ============ habit_completions ============
create table if not exists public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  completed_at date not null,
  created_at timestamptz not null default now(),
  -- required: the app upserts with onConflict "habit_id,completed_at"
  unique (habit_id, completed_at)
);

create index if not exists habit_completions_user_id_idx
  on public.habit_completions (user_id);

alter table public.habit_completions enable row level security;

create policy "Users can view own completions"
  on public.habit_completions for select
  using (auth.uid() = user_id);

create policy "Users can insert own completions"
  on public.habit_completions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own completions"
  on public.habit_completions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own completions"
  on public.habit_completions for delete
  using (auth.uid() = user_id);
