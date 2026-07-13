-- Slot-backed shop inventory. Catalog metadata is authoritative for price,
-- availability, category, and the equipment exclusivity slot.

alter table public.shop_catalog
  add column if not exists equip_slot text;

alter table public.user_shop_items
  add column if not exists equip_slot text;

-- Seed every currently supported item before inventory is backfilled. Items
-- that share a physical placement share an equip_slot; all head wearables
-- intentionally remain mutually exclusive.
insert into public.shop_catalog (
  item_id, category, cost, active, starter, equip_slot
)
values
  ('study-plant', 'decoration', 30, true, true, 'platform:right'),
  ('neon-lamp', 'decoration', 80, true, false, 'platform:left'),
  ('motivational-poster', 'decoration', 60, true, false, 'room:wall_art'),
  ('floor-plant', 'decoration', 90, true, false, 'room:floor_prop'),
  ('fairy-window', 'decoration', 110, true, false, 'room:window_view'),
  ('warm-desk-lamp', 'decoration', 75, true, false, 'room:lamp'),
  ('woven-rug', 'furniture', 90, true, false, 'room:rug'),
  ('daily-pinboard', 'decoration', 80, true, false, 'room:wall_art'),
  ('soft-window-curtains', 'decoration', 110, true, false, 'room:window_view'),
  ('shelf-keepsakes', 'decoration', 70, true, false, 'room:shelf'),
  ('companion-cushion', 'furniture', 100, true, false, 'room:companion_corner'),
  ('bookshelf', 'furniture', 120, true, false, 'room:floor_prop'),
  ('gaming-desk', 'furniture', 200, true, false, 'room:desk'),
  ('focus-cap', 'accessory', 50, true, false, 'wearable:head'),
  ('study-glasses', 'accessory', 75, true, false, 'wearable:head'),
  ('neon-headphones', 'accessory', 150, true, false, 'wearable:head')
on conflict (item_id) do update set
  category = excluded.category,
  cost = excluded.cost,
  active = excluded.active,
  starter = excluded.starter,
  equip_slot = excluded.equip_slot,
  updated_at = now();

-- Preserve pre-catalog ownership without making unknown items purchasable.
-- Their per-item legacy slot avoids silently unequipping unrelated inventory.
insert into public.shop_catalog (
  item_id, category, cost, active, starter, equip_slot
)
select distinct on (owned.item_id)
  owned.item_id,
  case
    when owned.category in ('decoration', 'furniture', 'accessory')
      then owned.category
    else 'decoration'
  end,
  0,
  false,
  false,
  'legacy_item:' || owned.item_id
from public.user_shop_items owned
left join public.shop_catalog catalog on catalog.item_id = owned.item_id
where catalog.item_id is null
order by owned.item_id, owned.updated_at desc, owned.id desc;

update public.shop_catalog
set equip_slot = 'legacy_item:' || item_id
where equip_slot is null or btrim(equip_slot) = '';

-- Rank against the original inventory timestamps. The metadata update below
-- fires the shared updated_at trigger, so deduplication must happen first.
with ranked_equipment as (
  select
    owned.id,
    row_number() over (
      partition by owned.user_id, catalog.equip_slot
      order by owned.updated_at desc, owned.id desc
    ) as position
  from public.user_shop_items owned
  join public.shop_catalog catalog on catalog.item_id = owned.item_id
  where owned.equipped
)
update public.user_shop_items owned
set equipped = false
from ranked_equipment ranked
where owned.id = ranked.id and ranked.position > 1;

update public.user_shop_items owned
set
  category = catalog.category,
  equip_slot = catalog.equip_slot
from public.shop_catalog catalog
where catalog.item_id = owned.item_id
  and (
    owned.category is distinct from catalog.category
    or owned.equip_slot is distinct from catalog.equip_slot
  );

alter table public.shop_catalog
  alter column equip_slot set not null;

alter table public.user_shop_items
  alter column equip_slot set not null;

alter table public.shop_catalog
  drop constraint if exists shop_catalog_equip_slot_check;
alter table public.shop_catalog
  add constraint shop_catalog_equip_slot_check
  check (btrim(equip_slot) <> '');

alter table public.user_shop_items
  drop constraint if exists user_shop_items_equip_slot_check;
alter table public.user_shop_items
  add constraint user_shop_items_equip_slot_check
  check (btrim(equip_slot) <> '');

alter table public.user_shop_items
  drop constraint if exists user_shop_items_catalog_metadata_fkey;

alter table public.shop_catalog
  drop constraint if exists shop_catalog_item_metadata_key;
alter table public.shop_catalog
  add constraint shop_catalog_item_metadata_key
  unique (item_id, category, equip_slot);

alter table public.user_shop_items
  add constraint user_shop_items_catalog_metadata_fkey
  foreign key (item_id, category, equip_slot)
  references public.shop_catalog (item_id, category, equip_slot)
  on update cascade;

drop index if exists public.user_shop_items_one_equipped_category_key;

create unique index if not exists user_shop_items_one_equipped_slot_key
  on public.user_shop_items (user_id, equip_slot)
  where equipped;

create index if not exists user_shop_items_user_slot_idx
  on public.user_shop_items (user_id, equip_slot);

-- Database-priced and slot-aware shop commands.
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

  select progress.coins into v_balance
  from public.user_progress progress
  where progress.user_id = v_user_id
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

  insert into public.user_shop_items (
    user_id, item_id, category, equip_slot, equipped
  ) values (
    v_user_id,
    v_catalog.item_id,
    v_catalog.category,
    v_catalog.equip_slot,
    false
  );

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
  v_catalog public.shop_catalog;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  select catalog.* into v_catalog
  from public.shop_catalog catalog
  join public.user_shop_items owned
    on owned.item_id = catalog.item_id
    and owned.category = catalog.category
    and owned.equip_slot = catalog.equip_slot
  where owned.user_id = v_user_id
    and owned.item_id = p_item_id
    and catalog.active;

  if v_catalog.item_id is null then raise exception 'Owned shop item not found'; end if;

  update public.user_shop_items
  set equipped = false
  where user_id = v_user_id
    and equip_slot = v_catalog.equip_slot
    and equipped;

  update public.user_shop_items
  set equipped = true
  where user_id = v_user_id and item_id = v_catalog.item_id;

  return query
  select * from public.user_shop_items
  where user_id = v_user_id
  order by updated_at asc, id asc;
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

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  update public.user_shop_items
  set equipped = false
  where user_id = v_user_id and item_id = p_item_id;

  return query
  select * from public.user_shop_items
  where user_id = v_user_id
  order by updated_at asc, id asc;
end;
$$;

-- Atomic once-only AsyncStorage migration, now using catalog-owned slots.
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

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

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
      insert into public.user_shop_items (
        user_id, item_id, category, equip_slot, equipped
      ) values (
        v_user_id,
        v_item.item_id,
        v_item.category,
        v_item.equip_slot,
        false
      )
      on conflict (user_id, item_id) do update set
        category = excluded.category,
        equip_slot = excluded.equip_slot;

      if coalesce((v_row->>'equipped')::boolean, false) then
        update public.user_shop_items
        set equipped = false
        where user_id = v_user_id
          and equip_slot = v_item.equip_slot
          and equipped;
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

-- New-user defaults carry trusted catalog metadata into inventory.
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

  insert into public.user_shop_items (
    user_id, item_id, category, equip_slot, equipped
  )
  select
    new.id,
    catalog.item_id,
    catalog.category,
    catalog.equip_slot,
    not exists (
      select 1
      from public.user_shop_items equipped_item
      where equipped_item.user_id = new.id
        and equipped_item.equip_slot = catalog.equip_slot
        and equipped_item.equipped
    )
  from public.shop_catalog catalog
  where catalog.starter and catalog.active
  on conflict (user_id, item_id) do update set
    category = excluded.category,
    equip_slot = excluded.equip_slot;

  return new;
end;
$$;

revoke all on function public.handle_dayly_user_created() from public, anon, authenticated;
revoke all on function public.buy_shop_item(text) from public, anon;
revoke all on function public.equip_shop_item(text) from public, anon;
revoke all on function public.unequip_shop_item(text) from public, anon;
revoke all on function public.migrate_legacy_user_data(jsonb) from public, anon;

grant execute on function public.buy_shop_item(text) to authenticated;
grant execute on function public.equip_shop_item(text) to authenticated;
grant execute on function public.unequip_shop_item(text) to authenticated;
grant execute on function public.migrate_legacy_user_data(jsonb) to authenticated;
