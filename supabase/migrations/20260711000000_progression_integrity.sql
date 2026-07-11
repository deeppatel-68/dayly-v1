-- Priority 6: server-owned progression, local-calendar streaks, and
-- idempotent study/shop transactions.

-- ---------------------------------------------------------------------------
-- Schema evolution and data backfills
-- ---------------------------------------------------------------------------

alter table public.habits
  add column if not exists starts_on date,
  add column if not exists archived_on date;

update public.habits
set starts_on = (created_at at time zone 'UTC')::date
where starts_on is null;

alter table public.habits
  alter column starts_on set default current_date,
  alter column starts_on set not null;

alter table public.habits
  drop constraint if exists habits_archive_date_check;
alter table public.habits
  add constraint habits_archive_date_check
  check (archived_on is null or archived_on >= starts_on);

create index if not exists habits_user_active_idx
  on public.habits (user_id, starts_on)
  where archived_on is null;

alter table public.study_sessions
  add column if not exists client_session_id text,
  add column if not exists started_at timestamptz,
  add column if not exists status text;

update public.study_sessions
set
  client_session_id = coalesce(client_session_id, id::text),
  started_at = coalesce(
    started_at,
    ended_at - make_interval(secs => greatest(duration_seconds, 0))
  ),
  status = coalesce(status, 'completed')
where client_session_id is null or started_at is null or status is null;

alter table public.study_sessions
  alter column client_session_id set not null,
  alter column started_at set not null,
  alter column status set not null,
  alter column duration_seconds set default 0,
  alter column ended_at drop default,
  alter column ended_at drop not null;

alter table public.study_sessions
  drop constraint if exists study_sessions_duration_seconds_check,
  drop constraint if exists study_sessions_status_check,
  drop constraint if exists study_sessions_completed_at_check;

alter table public.study_sessions
  add constraint study_sessions_duration_seconds_check
    check (duration_seconds >= 0 and duration_seconds <= 28800),
  add constraint study_sessions_status_check
    check (status in ('active', 'completed', 'abandoned')),
  add constraint study_sessions_completed_at_check
    check (
      (status = 'active' and ended_at is null)
      or (status in ('completed', 'abandoned') and ended_at is not null)
    );

create unique index if not exists study_sessions_user_client_key
  on public.study_sessions (user_id, client_session_id);

create unique index if not exists study_sessions_one_active_per_user_key
  on public.study_sessions (user_id)
  where status = 'active';

create index if not exists study_sessions_user_status_idx
  on public.study_sessions (user_id, status, started_at desc);

create table if not exists public.shop_catalog (
  item_id text primary key,
  category text not null check (category in ('decoration', 'furniture', 'accessory')),
  cost integer not null check (cost >= 0),
  active boolean not null default true,
  starter boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_shop_catalog_updated_at on public.shop_catalog;
create trigger set_shop_catalog_updated_at
  before update on public.shop_catalog
  for each row execute function public.set_updated_at();

insert into public.shop_catalog (item_id, category, cost, active, starter)
values
  ('study-plant', 'decoration', 30, true, true),
  ('neon-lamp', 'decoration', 80, true, false),
  ('motivational-poster', 'decoration', 60, true, false),
  ('bookshelf', 'furniture', 120, true, false),
  ('gaming-desk', 'furniture', 200, true, false),
  ('focus-cap', 'accessory', 50, true, false),
  ('study-glasses', 'accessory', 75, true, false),
  ('neon-headphones', 'accessory', 150, true, false)
on conflict (item_id) do update set
  category = excluded.category,
  cost = excluded.cost,
  active = excluded.active,
  starter = excluded.starter,
  updated_at = now();

-- Keep only the most recently updated equipped row in each category before
-- adding the database invariant.
with ranked_equipment as (
  select
    usi.id,
    row_number() over (
      partition by usi.user_id, usi.category
      order by usi.updated_at desc, usi.id desc
    ) as position
  from public.user_shop_items usi
  where usi.equipped
)
update public.user_shop_items usi
set equipped = false
from ranked_equipment ranked
where usi.id = ranked.id and ranked.position > 1;

create unique index if not exists user_shop_items_one_equipped_category_key
  on public.user_shop_items (user_id, category)
  where equipped;

create table if not exists public.user_data_migrations (
  user_id uuid not null references auth.users (id) on delete cascade,
  migration_key text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, migration_key)
);

-- Existing users receive every row that future signups receive from the auth
-- trigger below.
insert into public.user_progress (user_id)
select id from auth.users
on conflict (user_id) do nothing;

insert into public.user_settings (user_id)
select id from auth.users
on conflict (user_id) do nothing;

insert into public.user_shop_items (user_id, item_id, category, equipped)
select
  users.id,
  catalog.item_id,
  catalog.category,
  not exists (
    select 1
    from public.user_shop_items equipped_item
    where equipped_item.user_id = users.id
      and equipped_item.category = catalog.category
      and equipped_item.equipped
  )
from auth.users users
join public.shop_catalog catalog on catalog.starter and catalog.active
on conflict (user_id, item_id) do nothing;

insert into public.user_data_migrations (user_id, migration_key)
select user_id, 'async_storage_v1'
from public.user_settings
where migration_flags @> '{"async_storage_v1": true}'::jsonb
on conflict (user_id, migration_key) do nothing;

-- ---------------------------------------------------------------------------
-- Internal helpers
-- ---------------------------------------------------------------------------

create or replace function public.assert_local_today(p_local_today date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_local_today is null or abs(p_local_today - current_date) > 1 then
    raise exception 'Invalid local calendar date';
  end if;
end;
$$;

create or replace function public.recalculate_user_streak(
  p_user_id uuid,
  p_local_today date
)
returns public.user_progress
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date;
  v_first_day date;
  v_required integer;
  v_completed integer;
  v_run integer := 0;
  v_best integer := 0;
  v_yesterday_run integer := 0;
  v_today_success boolean := false;
  v_yesterday_success boolean := false;
  v_current integer := 0;
  v_progress public.user_progress;
begin
  perform public.assert_local_today(p_local_today);

  insert into public.user_progress (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select min(starts_on)
  into v_first_day
  from public.habits
  where user_id = p_user_id and starts_on <= p_local_today;

  if v_first_day is not null then
    v_day := v_first_day;
    while v_day <= p_local_today loop
      select count(*)
      into v_required
      from public.habits h
      where h.user_id = p_user_id
        and h.starts_on <= v_day
        and (h.archived_on is null or v_day < h.archived_on);

      if v_required > 0 then
        select count(distinct h.id)
        into v_completed
        from public.habits h
        join public.habit_completions hc
          on hc.habit_id = h.id
          and hc.user_id = p_user_id
          and hc.completed_at = v_day
        where h.user_id = p_user_id
          and h.starts_on <= v_day
          and (h.archived_on is null or v_day < h.archived_on);
      else
        v_completed := 0;
      end if;

      if v_required > 0 and v_completed = v_required then
        v_run := v_run + 1;
        v_best := greatest(v_best, v_run);
        if v_day = p_local_today then
          v_today_success := true;
        end if;
        if v_day = p_local_today - 1 then
          v_yesterday_success := true;
          v_yesterday_run := v_run;
        end if;
      else
        v_run := 0;
      end if;

      v_day := v_day + 1;
    end loop;
  end if;

  if v_today_success then
    v_current := v_run;
  elsif v_yesterday_success then
    v_current := v_yesterday_run;
  else
    v_current := 0;
  end if;

  update public.user_progress
  set
    current_streak = v_current,
    best_streak = v_best,
    updated_at = now()
  where user_id = p_user_id
  returning * into v_progress;

  return v_progress;
end;
$$;

create or replace function public.get_user_progress(p_local_today date)
returns public.user_progress
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  perform public.assert_local_today(p_local_today);
  return public.recalculate_user_streak(v_user_id, p_local_today);
end;
$$;

-- ---------------------------------------------------------------------------
-- Habit commands
-- ---------------------------------------------------------------------------

create or replace function public.create_user_habit(
  p_title text,
  p_description text default null,
  p_target_count integer default 1,
  p_icon text default 'book',
  p_color text default '#FF6B35',
  p_frequency text default 'daily',
  p_local_today date default current_date
)
returns public.habits
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_habit public.habits;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  perform public.assert_local_today(p_local_today);
  if nullif(btrim(p_title), '') is null then raise exception 'Habit title is required'; end if;
  if length(btrim(p_title)) > 120 then raise exception 'Habit title is too long'; end if;

  if (
    select count(*) from public.habits
    where user_id = v_user_id and archived_on is null
  ) >= 5 then
    raise exception 'Maximum habit limit reached';
  end if;

  insert into public.habits (
    user_id, title, description, target_count, icon, color, frequency, starts_on
  ) values (
    v_user_id,
    btrim(p_title),
    nullif(btrim(coalesce(p_description, '')), ''),
    greatest(1, least(coalesce(p_target_count, 1), 100)),
    coalesce(nullif(p_icon, ''), 'book'),
    coalesce(nullif(p_color, ''), '#FF6B35'),
    coalesce(nullif(p_frequency, ''), 'daily'),
    p_local_today
  )
  returning * into v_habit;

  perform public.recalculate_user_streak(v_user_id, p_local_today);
  return v_habit;
end;
$$;

create or replace function public.update_user_habit(
  p_habit_id uuid,
  p_title text,
  p_description text default null
)
returns public.habits
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_habit public.habits;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if nullif(btrim(p_title), '') is null then raise exception 'Habit title is required'; end if;
  if length(btrim(p_title)) > 120 then raise exception 'Habit title is too long'; end if;

  update public.habits
  set
    title = btrim(p_title),
    description = nullif(btrim(coalesce(p_description, '')), '')
  where id = p_habit_id and user_id = v_user_id and archived_on is null
  returning * into v_habit;

  if v_habit.id is null then raise exception 'Habit not found'; end if;
  return v_habit;
end;
$$;

create or replace function public.archive_user_habit(
  p_habit_id uuid,
  p_local_today date
)
returns public.user_progress
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_progress public.user_progress;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  perform public.assert_local_today(p_local_today);

  update public.habits
  set archived_on = p_local_today
  where id = p_habit_id and user_id = v_user_id and archived_on is null;

  if not found then raise exception 'Habit not found'; end if;
  v_progress := public.recalculate_user_streak(v_user_id, p_local_today);
  return v_progress;
end;
$$;

create or replace function public.set_habit_completion(
  p_habit_id uuid,
  p_completed_at date,
  p_completed boolean,
  p_local_today date
)
returns table (
  completion_id uuid,
  awarded boolean,
  reward_xp integer,
  reward_coins integer,
  progress_user_id uuid,
  progress_xp integer,
  progress_coins integer,
  progress_current_streak integer,
  progress_best_streak integer,
  progress_total_focus_seconds integer,
  progress_total_completed_habits integer,
  progress_updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_completion_id uuid;
  v_award_id uuid;
  v_progress public.user_progress;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  perform public.assert_local_today(p_local_today);
  if p_completed_at <> p_local_today then
    raise exception 'Habit completion must use the current local date';
  end if;

  if not exists (
    select 1 from public.habits h
    where h.id = p_habit_id
      and h.user_id = v_user_id
      and h.starts_on <= p_completed_at
      and (h.archived_on is null or p_completed_at < h.archived_on)
  ) then
    raise exception 'Habit is not active for this date';
  end if;

  insert into public.user_progress (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  if p_completed then
    insert into public.habit_completions (user_id, habit_id, completed_at)
    values (v_user_id, p_habit_id, p_completed_at)
    on conflict (user_id, habit_id, completed_at)
    do update set updated_at = now()
    returning id into v_completion_id;

    insert into public.xp_awards (user_id, source_type, source_id, award_date, amount)
    values (v_user_id, 'habit', p_habit_id::text, p_completed_at, 10)
    on conflict (user_id, source_type, source_id, award_date) do nothing
    returning id into v_award_id;

    if v_award_id is not null then
      update public.user_progress
      set
        xp = xp + 10,
        coins = coins + 5,
        total_completed_habits = total_completed_habits + 1,
        updated_at = now()
      where user_id = v_user_id;
    end if;
  else
    delete from public.habit_completions
    where user_id = v_user_id
      and habit_id = p_habit_id
      and completed_at = p_completed_at
    returning id into v_completion_id;
  end if;

  v_progress := public.recalculate_user_streak(v_user_id, p_local_today);

  return query select
    v_completion_id,
    v_award_id is not null,
    case when v_award_id is not null then 10 else 0 end,
    case when v_award_id is not null then 5 else 0 end,
    v_progress.user_id,
    v_progress.xp,
    v_progress.coins,
    v_progress.current_streak,
    v_progress.best_streak,
    v_progress.total_focus_seconds,
    v_progress.total_completed_habits,
    v_progress.updated_at;
end;
$$;

-- ---------------------------------------------------------------------------
-- Idempotent, server-bounded study sessions
-- ---------------------------------------------------------------------------

create or replace function public.start_study_session(p_client_session_id text)
returns public.study_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.study_sessions;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if nullif(btrim(p_client_session_id), '') is null or length(p_client_session_id) > 128 then
    raise exception 'Invalid client session id';
  end if;

  select * into v_session
  from public.study_sessions
  where user_id = v_user_id and client_session_id = p_client_session_id;

  if v_session.id is not null then return v_session; end if;

  update public.study_sessions
  set status = 'abandoned', ended_at = clock_timestamp(), updated_at = now()
  where user_id = v_user_id and status = 'active';

  insert into public.study_sessions (
    user_id, client_session_id, started_at, ended_at,
    duration_seconds, xp, coins, status
  ) values (
    v_user_id, p_client_session_id, clock_timestamp(), null,
    0, 0, 0, 'active'
  )
  returning * into v_session;

  return v_session;
end;
$$;

create or replace function public.finish_study_session(
  p_client_session_id text,
  p_active_seconds integer
)
returns table (
  newly_completed boolean,
  session_id uuid,
  session_client_session_id text,
  session_started_at timestamptz,
  session_duration_seconds integer,
  session_xp integer,
  session_coins integer,
  session_ended_at timestamptz,
  session_status text,
  progress_user_id uuid,
  progress_xp integer,
  progress_coins integer,
  progress_current_streak integer,
  progress_best_streak integer,
  progress_total_focus_seconds integer,
  progress_total_completed_habits integer,
  progress_updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.study_sessions;
  v_progress public.user_progress;
  v_elapsed_seconds integer;
  v_duration integer;
  v_minutes integer;
  v_now timestamptz := clock_timestamp();
  v_newly_completed boolean := false;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  select * into v_session
  from public.study_sessions
  where user_id = v_user_id and client_session_id = p_client_session_id
  for update;

  if v_session.id is null then raise exception 'Study session not found'; end if;

  insert into public.user_progress (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  if v_session.status = 'active' then
    v_elapsed_seconds := greatest(
      0,
      floor(extract(epoch from (v_now - v_session.started_at)))::integer
    );
    v_duration := least(
      greatest(coalesce(p_active_seconds, 0), 0),
      v_elapsed_seconds,
      28800
    );

    if v_duration < 60 then raise exception 'Study session must contain at least 60 active seconds'; end if;

    v_minutes := floor(v_duration / 60);
    update public.study_sessions
    set
      duration_seconds = v_duration,
      xp = v_minutes,
      coins = floor(v_minutes / 5),
      ended_at = v_now,
      status = 'completed',
      updated_at = now()
    where id = v_session.id
    returning * into v_session;

    update public.user_progress
    set
      xp = xp + v_session.xp,
      coins = coins + v_session.coins,
      total_focus_seconds = total_focus_seconds + v_session.duration_seconds,
      updated_at = now()
    where user_id = v_user_id
    returning * into v_progress;

    v_newly_completed := true;
  elsif v_session.status = 'completed' then
    select * into v_progress from public.user_progress where user_id = v_user_id;
  else
    raise exception 'Study session is no longer active';
  end if;

  return query select
    v_newly_completed,
    v_session.id,
    v_session.client_session_id,
    v_session.started_at,
    v_session.duration_seconds,
    v_session.xp,
    v_session.coins,
    v_session.ended_at,
    v_session.status,
    v_progress.user_id,
    v_progress.xp,
    v_progress.coins,
    v_progress.current_streak,
    v_progress.best_streak,
    v_progress.total_focus_seconds,
    v_progress.total_completed_habits,
    v_progress.updated_at;
end;
$$;

-- ---------------------------------------------------------------------------
-- Database-priced and transactional shop commands
-- ---------------------------------------------------------------------------

create or replace function public.buy_shop_item(p_item_id text)
returns table (success boolean, reason text, coins integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_catalog public.shop_catalog;
  v_balance integer;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  select * into v_catalog
  from public.shop_catalog
  where item_id = p_item_id and active;

  if v_catalog.item_id is null then
    return query select false, 'unavailable'::text, null::integer;
    return;
  end if;

  insert into public.user_progress (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  select up.coins into v_balance
  from public.user_progress up
  where up.user_id = v_user_id
  for update;

  if exists (
    select 1 from public.user_shop_items
    where user_id = v_user_id and item_id = p_item_id
  ) then
    return query select false, 'owned'::text, v_balance;
    return;
  end if;

  if v_balance < v_catalog.cost then
    return query select false, 'insufficient_coins'::text, v_balance;
    return;
  end if;

  update public.user_progress progress
  set coins = progress.coins - v_catalog.cost, updated_at = now()
  where progress.user_id = v_user_id
  returning progress.coins into v_balance;

  insert into public.user_shop_items (user_id, item_id, category, equipped)
  values (v_user_id, v_catalog.item_id, v_catalog.category, false);

  return query select true, null::text, v_balance;
end;
$$;

create or replace function public.equip_shop_item(p_item_id text)
returns setof public.user_shop_items
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_category text;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  select usi.category into v_category
  from public.user_shop_items usi
  join public.shop_catalog catalog on catalog.item_id = usi.item_id and catalog.active
  where usi.user_id = v_user_id and usi.item_id = p_item_id;

  if v_category is null then raise exception 'Owned shop item not found'; end if;

  update public.user_shop_items
  set equipped = false
  where user_id = v_user_id and category = v_category and equipped;

  update public.user_shop_items
  set equipped = true
  where user_id = v_user_id and item_id = p_item_id;

  return query
  select * from public.user_shop_items
  where user_id = v_user_id
  order by acquired_at asc;
end;
$$;

create or replace function public.unequip_shop_item(p_item_id text)
returns setof public.user_shop_items
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  update public.user_shop_items
  set equipped = false
  where user_id = v_user_id and item_id = p_item_id;

  return query
  select * from public.user_shop_items
  where user_id = v_user_id
  order by acquired_at asc;
end;
$$;

-- ---------------------------------------------------------------------------
-- Atomic once-only AsyncStorage migration
-- ---------------------------------------------------------------------------

create or replace function public.migrate_legacy_user_data(p_payload jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_claimed uuid;
  v_row jsonb;
  v_item public.shop_catalog;
  v_duration integer;
  v_minutes integer;
  v_ended_at timestamptz;
  v_theme text;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Invalid migration payload';
  end if;

  if exists (
    select 1 from public.user_data_migrations
    where user_id = v_user_id and migration_key = 'async_storage_v1'
  ) then
    return false;
  end if;

  insert into public.user_data_migrations (user_id, migration_key)
  values (v_user_id, 'async_storage_v1')
  on conflict (user_id, migration_key) do nothing
  returning user_id into v_claimed;

  if v_claimed is null then return false; end if;

  insert into public.user_progress (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  update public.user_progress
  set
    xp = greatest(xp, greatest(coalesce((p_payload->>'xp')::integer, 0), 0)),
    coins = greatest(coins, greatest(coalesce((p_payload->>'coins')::integer, 0), 0)),
    total_focus_seconds = greatest(
      total_focus_seconds,
      greatest(coalesce((p_payload->>'total_focus_seconds')::integer, 0), 0)
    ),
    total_completed_habits = greatest(
      total_completed_habits,
      greatest(coalesce((p_payload->>'total_completed_habits')::integer, 0), 0)
    ),
    updated_at = now()
  where user_id = v_user_id;

  for v_row in
    select value from jsonb_array_elements(coalesce(p_payload->'awards', '[]'::jsonb))
  loop
    if coalesce(v_row->>'source_id', '') <> ''
      and coalesce(v_row->>'award_date', '') ~ '^\d{4}-\d{2}-\d{2}$' then
      insert into public.xp_awards (
        user_id, source_type, source_id, award_date, amount
      ) values (
        v_user_id,
        'habit',
        v_row->>'source_id',
        (v_row->>'award_date')::date,
        10
      )
      on conflict (user_id, source_type, source_id, award_date) do nothing;
    end if;
  end loop;

  for v_row in
    select value from jsonb_array_elements(coalesce(p_payload->'shop_items', '[]'::jsonb))
  loop
    select * into v_item
    from public.shop_catalog
    where item_id = v_row->>'item_id' and active;

    if v_item.item_id is not null then
      insert into public.user_shop_items (user_id, item_id, category, equipped)
      values (v_user_id, v_item.item_id, v_item.category, false)
      on conflict (user_id, item_id) do update set category = excluded.category;

      if coalesce((v_row->>'equipped')::boolean, false) then
        update public.user_shop_items
        set equipped = false
        where user_id = v_user_id and category = v_item.category and equipped;
        update public.user_shop_items
        set equipped = true
        where user_id = v_user_id and item_id = v_item.item_id;
      end if;
    end if;
  end loop;

  for v_row in
    select value from jsonb_array_elements(coalesce(p_payload->'sessions', '[]'::jsonb))
  loop
    v_duration := least(
      greatest(coalesce((v_row->>'duration_seconds')::integer, 0), 0),
      28800
    );
    if v_duration > 0 then
      v_minutes := floor(v_duration / 60);
      v_ended_at := coalesce(
        nullif(v_row->>'ended_at', '')::timestamptz,
        clock_timestamp()
      );
      insert into public.study_sessions (
        user_id, client_session_id, started_at, ended_at,
        duration_seconds, xp, coins, status
      ) values (
        v_user_id,
        'legacy:' || coalesce(nullif(v_row->>'legacy_id', ''), md5(v_row::text)),
        v_ended_at - make_interval(secs => v_duration),
        v_ended_at,
        v_duration,
        v_minutes,
        floor(v_minutes / 5),
        'completed'
      )
      on conflict (user_id, client_session_id) do nothing;
    end if;
  end loop;

  v_theme := case
    when p_payload->>'theme' in ('light', 'dark') then p_payload->>'theme'
    else null
  end;

  insert into public.user_settings (
    user_id, theme, character_data, migration_flags
  ) values (
    v_user_id,
    v_theme,
    case
      when jsonb_typeof(p_payload->'character_data') = 'object'
        then p_payload->'character_data'
      else null
    end,
    '{"async_storage_v1": true}'::jsonb
  )
  on conflict (user_id) do update set
    theme = coalesce(excluded.theme, public.user_settings.theme),
    character_data = coalesce(public.user_settings.character_data, '{}'::jsonb)
      || coalesce(excluded.character_data, '{}'::jsonb),
    migration_flags = coalesce(public.user_settings.migration_flags, '{}'::jsonb)
      || '{"async_storage_v1": true}'::jsonb,
    updated_at = now();

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- New-user defaults
-- ---------------------------------------------------------------------------

create or replace function public.handle_dayly_user_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_progress (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.user_shop_items (user_id, item_id, category, equipped)
  select
    new.id,
    catalog.item_id,
    catalog.category,
    not exists (
      select 1
      from public.user_shop_items equipped_item
      where equipped_item.user_id = new.id
        and equipped_item.category = catalog.category
        and equipped_item.equipped
    )
  from public.shop_catalog catalog
  where catalog.starter and catalog.active
  on conflict (user_id, item_id) do nothing;

  return new;
end;
$$;

drop trigger if exists seed_dayly_user_defaults on auth.users;
create trigger seed_dayly_user_defaults
  after insert on auth.users
  for each row execute function public.handle_dayly_user_created();

-- ---------------------------------------------------------------------------
-- Remove broad client writes and legacy reward interfaces
-- ---------------------------------------------------------------------------

drop policy if exists "Users can insert own habits" on public.habits;
drop policy if exists "Users can update own habits" on public.habits;
drop policy if exists "Users can delete own habits" on public.habits;

drop policy if exists "Users can insert own completions" on public.habit_completions;
drop policy if exists "Users can update own completions" on public.habit_completions;
drop policy if exists "Users can delete own completions" on public.habit_completions;

drop policy if exists "Users can insert own progress" on public.user_progress;
drop policy if exists "Users can update own progress" on public.user_progress;
drop policy if exists "Users can insert own xp awards" on public.xp_awards;

drop policy if exists "Users can insert own study sessions" on public.study_sessions;
drop policy if exists "Users can update own study sessions" on public.study_sessions;
drop policy if exists "Users can delete own study sessions" on public.study_sessions;

drop policy if exists "Users can insert own shop items" on public.user_shop_items;
drop policy if exists "Users can update own shop items" on public.user_shop_items;
drop policy if exists "Users can delete own shop items" on public.user_shop_items;

alter table public.shop_catalog enable row level security;
alter table public.user_data_migrations enable row level security;

drop policy if exists "Authenticated users can view shop catalog" on public.shop_catalog;
create policy "Authenticated users can view shop catalog"
  on public.shop_catalog for select to authenticated using (true);

drop function if exists public.increment_user_progress(uuid, integer, integer, integer, integer, integer, integer);
drop function if exists public.spend_user_coins(uuid, integer);
drop function if exists public.buy_shop_item(uuid, text, text, integer);
drop function if exists public.complete_habit_with_reward(uuid, uuid, date, integer, integer);
drop function if exists public.record_study_session_with_reward(uuid, integer, integer, integer, timestamptz);

revoke all on function public.assert_local_today(date) from public, anon, authenticated;
revoke all on function public.recalculate_user_streak(uuid, date) from public, anon, authenticated;
revoke all on function public.handle_dayly_user_created() from public, anon, authenticated;

revoke all on function public.get_user_progress(date) from public, anon;
revoke all on function public.create_user_habit(text, text, integer, text, text, text, date) from public, anon;
revoke all on function public.update_user_habit(uuid, text, text) from public, anon;
revoke all on function public.archive_user_habit(uuid, date) from public, anon;
revoke all on function public.set_habit_completion(uuid, date, boolean, date) from public, anon;
revoke all on function public.start_study_session(text) from public, anon;
revoke all on function public.finish_study_session(text, integer) from public, anon;
revoke all on function public.buy_shop_item(text) from public, anon;
revoke all on function public.equip_shop_item(text) from public, anon;
revoke all on function public.unequip_shop_item(text) from public, anon;
revoke all on function public.migrate_legacy_user_data(jsonb) from public, anon;

grant execute on function public.get_user_progress(date) to authenticated;
grant execute on function public.create_user_habit(text, text, integer, text, text, text, date) to authenticated;
grant execute on function public.update_user_habit(uuid, text, text) to authenticated;
grant execute on function public.archive_user_habit(uuid, date) to authenticated;
grant execute on function public.set_habit_completion(uuid, date, boolean, date) to authenticated;
grant execute on function public.start_study_session(text) to authenticated;
grant execute on function public.finish_study_session(text, integer) to authenticated;
grant execute on function public.buy_shop_item(text) to authenticated;
grant execute on function public.equip_shop_item(text) to authenticated;
grant execute on function public.unequip_shop_item(text) to authenticated;
grant execute on function public.migrate_legacy_user_data(jsonb) to authenticated;
