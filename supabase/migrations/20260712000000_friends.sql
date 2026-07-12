-- Priority 8: friend system + friends leaderboard. No table RLS is loosened;
-- every cross-user read flows through security-definer RPCs that verify the
-- friendship internally (same pattern as 20260711000000_progression_integrity).

-- ---------------------------------------------------------------------------
-- Usernames: backfill, dedupe, then enforce case-insensitive uniqueness
-- ---------------------------------------------------------------------------

update public.profiles
set username = coalesce(
  nullif(btrim(username), ''),
  split_part(coalesce(email, 'user'), '@', 1)
)
where username is null or btrim(username) = '';

with ranked as (
  select id,
    row_number() over (
      partition by lower(username)
      order by created_at, id
    ) as position
  from public.profiles
)
update public.profiles p
set username = p.username || '_' || substr(replace(p.id::text, '-', ''), 1, 4)
from ranked
where ranked.id = p.id and ranked.position > 1;

create unique index if not exists profiles_username_lower_key
  on public.profiles (lower(username));

create or replace function public.set_username(p_username text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_username text := btrim(coalesce(p_username, ''));
  v_profile public.profiles;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if v_username !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'username_invalid';
  end if;
  if exists (
    select 1 from public.profiles
    where lower(username) = lower(v_username) and id <> v_user_id
  ) then
    raise exception 'username_taken';
  end if;

  update public.profiles
  set username = v_username
  where id = v_user_id
  returning * into v_profile;

  if v_profile.id is null then raise exception 'Profile not found'; end if;
  return v_profile;
end;
$$;

-- ---------------------------------------------------------------------------
-- Friend codes: 8 chars, no lookalike characters, unique, defaulted for
-- future signups
-- ---------------------------------------------------------------------------

create or replace function public.generate_friend_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code text;
begin
  loop
    v_code := (
      select string_agg(
        substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1),
        ''
      )
      from generate_series(1, 8)
    );
    exit when not exists (
      select 1 from public.profiles where friend_code = v_code
    );
  end loop;
  return v_code;
end;
$$;

alter table public.profiles
  add column if not exists friend_code text;

update public.profiles
set friend_code = public.generate_friend_code()
where friend_code is null;

alter table public.profiles
  alter column friend_code set default public.generate_friend_code();

create unique index if not exists profiles_friend_code_key
  on public.profiles (friend_code);

-- ---------------------------------------------------------------------------
-- Friendships
-- ---------------------------------------------------------------------------

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz,
  check (requester_id <> addressee_id)
);

create unique index if not exists friendships_pair_key
  on public.friendships (
    least(requester_id, addressee_id),
    greatest(requester_id, addressee_id)
  );

create index if not exists friendships_addressee_pending_idx
  on public.friendships (addressee_id)
  where status = 'pending';

drop trigger if exists set_friendships_updated_at on public.friendships;
create trigger set_friendships_updated_at
  before update on public.friendships
  for each row execute function public.set_updated_at();

alter table public.friendships enable row level security;

drop policy if exists "Users can view own friendships" on public.friendships;
create policy "Users can view own friendships" on public.friendships
  for select using (auth.uid() in (requester_id, addressee_id));

revoke all on table public.friendships from anon, authenticated;
grant select on table public.friendships to authenticated;

create index if not exists xp_awards_user_award_date_idx
  on public.xp_awards (user_id, award_date);

-- ---------------------------------------------------------------------------
-- Internal helpers
-- ---------------------------------------------------------------------------

create or replace function public.are_friends(p_a uuid, p_b uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and least(requester_id, addressee_id) = least(p_a, p_b)
      and greatest(requester_id, addressee_id) = greatest(p_a, p_b)
  );
$$;

-- ---------------------------------------------------------------------------
-- Social commands
-- ---------------------------------------------------------------------------

create or replace function public.send_friend_request(p_username text)
returns public.friendships
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_target uuid;
  v_existing public.friendships;
  v_result public.friendships;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  select id into v_target
  from public.profiles
  where lower(username) = lower(btrim(coalesce(p_username, '')));

  if v_target is null then raise exception 'user_not_found'; end if;
  if v_target = v_user_id then raise exception 'cannot_friend_self'; end if;

  select * into v_existing
  from public.friendships
  where least(requester_id, addressee_id) = least(v_user_id, v_target)
    and greatest(requester_id, addressee_id) = greatest(v_user_id, v_target);

  if v_existing.id is not null then
    if v_existing.status = 'accepted' then
      raise exception 'already_friends';
    end if;
    if v_existing.requester_id = v_user_id then
      raise exception 'request_already_exists';
    end if;
    -- Both sides asked: mutual intent, accept immediately.
    update public.friendships
    set status = 'accepted', accepted_at = now()
    where id = v_existing.id
    returning * into v_result;
    return v_result;
  end if;

  insert into public.friendships (requester_id, addressee_id)
  values (v_user_id, v_target)
  returning * into v_result;
  return v_result;
end;
$$;

create or replace function public.respond_friend_request(
  p_friendship_id uuid,
  p_accept boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.friendships;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  select * into v_row
  from public.friendships
  where id = p_friendship_id
    and addressee_id = v_user_id
    and status = 'pending';

  if v_row.id is null then raise exception 'request_not_found'; end if;

  if p_accept then
    update public.friendships
    set status = 'accepted', accepted_at = now()
    where id = v_row.id;
  else
    delete from public.friendships where id = v_row.id;
  end if;
end;
$$;

create or replace function public.add_friend_by_code(p_code text)
returns public.friendships
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_target uuid;
  v_existing public.friendships;
  v_result public.friendships;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  select id into v_target
  from public.profiles
  where friend_code = upper(btrim(coalesce(p_code, '')));

  if v_target is null then raise exception 'code_not_found'; end if;
  if v_target = v_user_id then raise exception 'cannot_friend_self'; end if;

  select * into v_existing
  from public.friendships
  where least(requester_id, addressee_id) = least(v_user_id, v_target)
    and greatest(requester_id, addressee_id) = greatest(v_user_id, v_target);

  if v_existing.id is not null then
    if v_existing.status = 'accepted' then
      raise exception 'already_friends';
    end if;
    update public.friendships
    set status = 'accepted', accepted_at = now()
    where id = v_existing.id
    returning * into v_result;
    return v_result;
  end if;

  -- A shared code is mutual intent: connect immediately.
  insert into public.friendships (requester_id, addressee_id, status, accepted_at)
  values (v_user_id, v_target, 'accepted', now())
  returning * into v_result;
  return v_result;
end;
$$;

create or replace function public.remove_friend(p_friend_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  delete from public.friendships
  where least(requester_id, addressee_id) = least(v_user_id, p_friend_user_id)
    and greatest(requester_id, addressee_id) = greatest(v_user_id, p_friend_user_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Social queries
-- ---------------------------------------------------------------------------

create or replace function public.search_users(p_query text)
returns table (user_id uuid, username text, relationship text)
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_query text := btrim(coalesce(p_query, ''));
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if length(v_query) < 2 then
    return;
  end if;

  return query
  select
    p.id,
    p.username,
    coalesce(
      case
        when f.status = 'accepted' then 'friends'
        when f.status = 'pending' and f.requester_id = v_user_id then 'pending_out'
        when f.status = 'pending' then 'pending_in'
      end,
      'none'
    )
  from public.profiles p
  left join public.friendships f
    on least(f.requester_id, f.addressee_id) = least(v_user_id, p.id)
    and greatest(f.requester_id, f.addressee_id) = greatest(v_user_id, p.id)
  where p.id <> v_user_id
    and lower(p.username) like lower(v_query) || '%'
  order by lower(p.username)
  limit 10;
end;
$$;

create or replace function public.get_friends_overview()
returns table (
  kind text,
  friendship_id uuid,
  user_id uuid,
  username text,
  body_color text,
  accent_color text,
  equipped_accessory_id text,
  xp integer,
  current_streak integer
)
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  return query
  select
    case
      when f.status = 'accepted' then 'friend'
      when f.requester_id = v_user_id then 'pending_out'
      else 'pending_in'
    end,
    f.id,
    other.id,
    other.username,
    case when f.status = 'accepted'
      then us.character_data ->> 'bodyColor' end,
    case when f.status = 'accepted'
      then us.character_data ->> 'color' end,
    case when f.status = 'accepted' then acc.item_id end,
    case when f.status = 'accepted' then up.xp end,
    case when f.status = 'accepted' then up.current_streak end
  from public.friendships f
  join public.profiles other
    on other.id = case
      when f.requester_id = v_user_id then f.addressee_id
      else f.requester_id
    end
  left join public.user_progress up on up.user_id = other.id
  left join public.user_settings us on us.user_id = other.id
  left join lateral (
    select usi.item_id
    from public.user_shop_items usi
    where usi.user_id = other.id
      and usi.category = 'accessory'
      and usi.equipped
    limit 1
  ) acc on true
  where v_user_id in (f.requester_id, f.addressee_id)
  order by f.status desc, lower(other.username);
end;
$$;

create or replace function public.get_friends_leaderboard(p_local_today date)
returns table (
  user_id uuid,
  username text,
  is_self boolean,
  body_color text,
  accent_color text,
  equipped_accessory_id text,
  total_xp integer,
  current_streak integer,
  weekly_xp integer,
  weekly_focus_seconds integer
)
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_week_start date;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  perform public.assert_local_today(p_local_today);
  -- ISO week: Monday start, derived from the caller's local calendar.
  v_week_start := p_local_today
    - (extract(isodow from p_local_today)::int - 1);

  return query
  with members as (
    select v_user_id as member_id
    union
    select case
      when f.requester_id = v_user_id then f.addressee_id
      else f.requester_id
    end
    from public.friendships f
    where f.status = 'accepted'
      and v_user_id in (f.requester_id, f.addressee_id)
  )
  select
    p.id,
    p.username,
    p.id = v_user_id,
    us.character_data ->> 'bodyColor',
    us.character_data ->> 'color',
    acc.item_id,
    coalesce(up.xp, 0),
    coalesce(up.current_streak, 0),
    coalesce(wxp.amount, 0)::integer,
    coalesce(wfs.seconds, 0)::integer
  from members m
  join public.profiles p on p.id = m.member_id
  left join public.user_progress up on up.user_id = m.member_id
  left join public.user_settings us on us.user_id = m.member_id
  left join lateral (
    select usi.item_id
    from public.user_shop_items usi
    where usi.user_id = m.member_id
      and usi.category = 'accessory'
      and usi.equipped
    limit 1
  ) acc on true
  left join lateral (
    -- award_date is each earner's own local date: timezone-fair per user.
    select sum(xa.amount) as amount
    from public.xp_awards xa
    where xa.user_id = m.member_id and xa.award_date >= v_week_start
  ) wxp on true
  left join lateral (
    -- Sessions only store timestamptz; UTC-date bucketing is the documented
    -- approximation for the weekly focus window.
    select sum(ss.duration_seconds) as seconds
    from public.study_sessions ss
    where ss.user_id = m.member_id
      and ss.status = 'completed'
      and (ss.ended_at at time zone 'UTC')::date >= v_week_start
  ) wfs on true
  order by lower(p.username);
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants: RPCs are the only mutation/read surface for cross-user data
-- ---------------------------------------------------------------------------

revoke all on function public.set_username(text) from public, anon;
-- Executable by authenticated: it backs the profiles.friend_code column
-- default, which fires on the client-side profile insert during signup.
revoke all on function public.generate_friend_code() from public, anon;
revoke all on function public.are_friends(uuid, uuid) from public, anon, authenticated;
revoke all on function public.send_friend_request(text) from public, anon;
revoke all on function public.respond_friend_request(uuid, boolean) from public, anon;
revoke all on function public.add_friend_by_code(text) from public, anon;
revoke all on function public.remove_friend(uuid) from public, anon;
revoke all on function public.search_users(text) from public, anon;
revoke all on function public.get_friends_overview() from public, anon;
revoke all on function public.get_friends_leaderboard(date) from public, anon;

grant execute on function public.set_username(text) to authenticated;
grant execute on function public.generate_friend_code() to authenticated;
grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.add_friend_by_code(text) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.search_users(text) to authenticated;
grant execute on function public.get_friends_overview() to authenticated;
grant execute on function public.get_friends_leaderboard(date) to authenticated;
