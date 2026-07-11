-- Persist Dayly progress, rewards, study sessions, shop state, and settings.
-- Safe to run after the original docs/supabase-setup.sql.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  username text,
  last_reset_date text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists email text,
  add column if not exists username text,
  add column if not exists last_reset_date text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.habits
  add column if not exists updated_at timestamptz not null default now();

create index if not exists habits_user_id_idx on public.habits (user_id);

drop trigger if exists set_habits_updated_at on public.habits;
create trigger set_habits_updated_at
  before update on public.habits
  for each row execute function public.set_updated_at();

create table if not exists public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  completed_at date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, habit_id, completed_at)
);

alter table public.habit_completions
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists habit_completions_user_habit_date_key
  on public.habit_completions (user_id, habit_id, completed_at);

create index if not exists habit_completions_user_id_idx
  on public.habit_completions (user_id);

drop trigger if exists set_habit_completions_updated_at on public.habit_completions;
create trigger set_habit_completions_updated_at
  before update on public.habit_completions
  for each row execute function public.set_updated_at();

create table if not exists public.user_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  coins integer not null default 100 check (coins >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  best_streak integer not null default 0 check (best_streak >= 0),
  total_focus_seconds integer not null default 0 check (total_focus_seconds >= 0),
  total_completed_habits integer not null default 0 check (total_completed_habits >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_user_progress_updated_at on public.user_progress;
create trigger set_user_progress_updated_at
  before update on public.user_progress
  for each row execute function public.set_updated_at();

create table if not exists public.xp_awards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_type text not null,
  source_id text not null,
  award_date date not null,
  amount integer not null check (amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source_type, source_id, award_date)
);

create index if not exists xp_awards_user_id_idx on public.xp_awards (user_id);

drop trigger if exists set_xp_awards_updated_at on public.xp_awards;
create trigger set_xp_awards_updated_at
  before update on public.xp_awards
  for each row execute function public.set_updated_at();

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  duration_seconds integer not null check (duration_seconds > 0),
  xp integer not null default 0 check (xp >= 0),
  coins integer not null default 0 check (coins >= 0),
  ended_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists study_sessions_user_ended_idx
  on public.study_sessions (user_id, ended_at desc);

drop trigger if exists set_study_sessions_updated_at on public.study_sessions;
create trigger set_study_sessions_updated_at
  before update on public.study_sessions
  for each row execute function public.set_updated_at();

create table if not exists public.user_shop_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null,
  category text not null,
  equipped boolean not null default false,
  acquired_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, item_id)
);

create index if not exists user_shop_items_user_category_idx
  on public.user_shop_items (user_id, category);

drop trigger if exists set_user_shop_items_updated_at on public.user_shop_items;
create trigger set_user_shop_items_updated_at
  before update on public.user_shop_items
  for each row execute function public.set_updated_at();

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  theme text check (theme in ('light', 'dark')),
  character_data jsonb,
  migration_flags jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_user_settings_updated_at on public.user_settings;
create trigger set_user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.habits enable row level security;
alter table public.habit_completions enable row level security;
alter table public.user_progress enable row level security;
alter table public.xp_awards enable row level security;
alter table public.study_sessions enable row level security;
alter table public.user_shop_items enable row level security;
alter table public.user_settings enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Users can view own habits" on public.habits;
drop policy if exists "Users can insert own habits" on public.habits;
drop policy if exists "Users can update own habits" on public.habits;
drop policy if exists "Users can delete own habits" on public.habits;
create policy "Users can view own habits"
  on public.habits for select using (auth.uid() = user_id);
create policy "Users can insert own habits"
  on public.habits for insert with check (auth.uid() = user_id);
create policy "Users can update own habits"
  on public.habits for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own habits"
  on public.habits for delete using (auth.uid() = user_id);

drop policy if exists "Users can view own completions" on public.habit_completions;
drop policy if exists "Users can insert own completions" on public.habit_completions;
drop policy if exists "Users can update own completions" on public.habit_completions;
drop policy if exists "Users can delete own completions" on public.habit_completions;
create policy "Users can view own completions"
  on public.habit_completions for select using (auth.uid() = user_id);
create policy "Users can insert own completions"
  on public.habit_completions for insert with check (auth.uid() = user_id);
create policy "Users can update own completions"
  on public.habit_completions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own completions"
  on public.habit_completions for delete using (auth.uid() = user_id);

drop policy if exists "Users can view own progress" on public.user_progress;
drop policy if exists "Users can insert own progress" on public.user_progress;
drop policy if exists "Users can update own progress" on public.user_progress;
create policy "Users can view own progress"
  on public.user_progress for select using (auth.uid() = user_id);
create policy "Users can insert own progress"
  on public.user_progress for insert with check (auth.uid() = user_id);
create policy "Users can update own progress"
  on public.user_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can view own xp awards" on public.xp_awards;
drop policy if exists "Users can insert own xp awards" on public.xp_awards;
create policy "Users can view own xp awards"
  on public.xp_awards for select using (auth.uid() = user_id);
create policy "Users can insert own xp awards"
  on public.xp_awards for insert with check (auth.uid() = user_id);

drop policy if exists "Users can view own study sessions" on public.study_sessions;
drop policy if exists "Users can insert own study sessions" on public.study_sessions;
drop policy if exists "Users can update own study sessions" on public.study_sessions;
drop policy if exists "Users can delete own study sessions" on public.study_sessions;
create policy "Users can view own study sessions"
  on public.study_sessions for select using (auth.uid() = user_id);
create policy "Users can insert own study sessions"
  on public.study_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own study sessions"
  on public.study_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own study sessions"
  on public.study_sessions for delete using (auth.uid() = user_id);

drop policy if exists "Users can view own shop items" on public.user_shop_items;
drop policy if exists "Users can insert own shop items" on public.user_shop_items;
drop policy if exists "Users can update own shop items" on public.user_shop_items;
drop policy if exists "Users can delete own shop items" on public.user_shop_items;
create policy "Users can view own shop items"
  on public.user_shop_items for select using (auth.uid() = user_id);
create policy "Users can insert own shop items"
  on public.user_shop_items for insert with check (auth.uid() = user_id);
create policy "Users can update own shop items"
  on public.user_shop_items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own shop items"
  on public.user_shop_items for delete using (auth.uid() = user_id);

drop policy if exists "Users can view own settings" on public.user_settings;
drop policy if exists "Users can insert own settings" on public.user_settings;
drop policy if exists "Users can update own settings" on public.user_settings;
create policy "Users can view own settings"
  on public.user_settings for select using (auth.uid() = user_id);
create policy "Users can insert own settings"
  on public.user_settings for insert with check (auth.uid() = user_id);
create policy "Users can update own settings"
  on public.user_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.increment_user_progress(
  p_user_id uuid,
  p_xp integer default 0,
  p_coins integer default 0,
  p_focus_seconds integer default 0,
  p_completed_habits integer default 0,
  p_current_streak integer default null,
  p_best_streak integer default null
)
returns public.user_progress
language plpgsql
security invoker
as $$
declare
  updated_progress public.user_progress;
begin
  if p_user_id <> auth.uid() then
    raise exception 'Cannot update another user progress row';
  end if;

  insert into public.user_progress (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  update public.user_progress
  set
    xp = greatest(0, xp + coalesce(p_xp, 0)),
    coins = greatest(0, coins + coalesce(p_coins, 0)),
    total_focus_seconds = greatest(0, total_focus_seconds + coalesce(p_focus_seconds, 0)),
    total_completed_habits = greatest(0, total_completed_habits + coalesce(p_completed_habits, 0)),
    current_streak = coalesce(p_current_streak, current_streak),
    best_streak = greatest(best_streak, coalesce(p_best_streak, p_current_streak, best_streak)),
    updated_at = now()
  where user_id = p_user_id
  returning * into updated_progress;

  return updated_progress;
end;
$$;

create or replace function public.spend_user_coins(
  p_user_id uuid,
  p_amount integer
)
returns public.user_progress
language plpgsql
security invoker
as $$
declare
  updated_progress public.user_progress;
begin
  if p_user_id <> auth.uid() then
    raise exception 'Cannot update another user progress row';
  end if;

  if p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  insert into public.user_progress (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  update public.user_progress
  set coins = coins - p_amount, updated_at = now()
  where user_id = p_user_id and coins >= p_amount
  returning * into updated_progress;

  if updated_progress.user_id is null then
    raise exception 'Insufficient coins';
  end if;

  return updated_progress;
end;
$$;

create or replace function public.buy_shop_item(
  p_user_id uuid,
  p_item_id text,
  p_category text,
  p_cost integer
)
returns table(success boolean, reason text, coins integer)
language plpgsql
security invoker
as $$
declare
  next_balance integer;
begin
  if p_user_id <> auth.uid() then
    raise exception 'Cannot buy for another user';
  end if;

  insert into public.user_progress (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  if exists (
    select 1 from public.user_shop_items
    where user_id = p_user_id and item_id = p_item_id
  ) then
    return query select false, 'owned'::text, (select up.coins from public.user_progress up where up.user_id = p_user_id);
    return;
  end if;

  update public.user_progress as up
  set coins = up.coins - greatest(0, p_cost), updated_at = now()
  where up.user_id = p_user_id and up.coins >= greatest(0, p_cost)
  returning up.coins into next_balance;

  if next_balance is null then
    return query select false, 'insufficient_coins'::text, (select up.coins from public.user_progress up where up.user_id = p_user_id);
    return;
  end if;

  insert into public.user_shop_items (user_id, item_id, category, equipped)
  values (p_user_id, p_item_id, p_category, false);

  return query select true, null::text, next_balance;
end;
$$;
