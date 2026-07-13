begin;

create extension if not exists pgtap with schema extensions;

create temporary table tap_output (
  position integer generated always as identity,
  line text not null
) on commit drop;

grant insert on table tap_output to authenticated;
grant usage, select on sequence tap_output_position_seq to authenticated;

insert into tap_output (line)
select plan(45);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-4111-8111-111111111111',
    'authenticated',
    'authenticated',
    'priority6-user1@dayly.test',
    'test-password',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-4222-8222-222222222222',
    'authenticated',
    'authenticated',
    'priority6-user2@dayly.test',
    'test-password',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into tap_output (line)
select is(
  (select count(*)::integer from public.user_progress where user_id in (
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222'
  )),
  2,
  'new users receive progress rows'
);

insert into tap_output (line)
select is(
  (select count(*)::integer from public.user_shop_items where user_id in (
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222'
  ) and item_id = 'study-plant'),
  2,
  'new users receive the starter shop item'
);

insert into tap_output (line)
select is(
  (
    select equip_slot
    from public.user_shop_items
    where user_id = '11111111-1111-4111-8111-111111111111'
      and item_id = 'study-plant'
  ),
  'platform:right',
  'starter inventory copies its trusted catalog slot'
);

insert into tap_output (line)
select is(
  (select count(*)::integer from public.shop_catalog where active),
  16,
  'the active catalog includes every room and wearable item'
);

insert into tap_output (line)
select is(
  (
    select count(*)::integer
    from public.shop_catalog
    where (item_id = 'floor-plant' and equip_slot = 'room:floor_prop')
      or (item_id = 'fairy-window' and equip_slot = 'room:window_view')
  ),
  2,
  'the previously local-only room items are in the server catalog'
);

insert into tap_output (line)
select is(
  (select count(*)::integer from public.shop_catalog where equip_slot is null)
    + (select count(*)::integer from public.user_shop_items where equip_slot is null),
  0,
  'catalog and owned inventory slots are required'
);

insert into tap_output (line)
select ok(
  (
    select bool_and(
      (item_id = 'warm-desk-lamp' and cost = 75)
      or (item_id = 'woven-rug' and cost = 90)
      or (item_id = 'daily-pinboard' and cost = 80)
      or (item_id = 'soft-window-curtains' and cost = 110)
      or (item_id = 'shelf-keepsakes' and cost = 70)
      or (item_id = 'companion-cushion' and cost = 100)
    ) and count(*) = 6
    from public.shop_catalog
    where item_id in (
      'warm-desk-lamp',
      'woven-rug',
      'daily-pinboard',
      'soft-window-curtains',
      'shelf-keepsakes',
      'companion-cushion'
    )
  ),
  'new room catalog prices are seeded by the server'
);

insert into tap_output (line)
select is(
  (
    select count(distinct equip_slot)::integer
    from public.shop_catalog
    where item_id in ('focus-cap', 'study-glasses', 'neon-headphones')
  ),
  1,
  'all wearable head items retain one exclusive slot'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '11111111-1111-4111-8111-111111111111';
set local "request.jwt.claim.role" = 'authenticated';

insert into tap_output (line)
select throws_ok($$
  update public.user_progress
  set xp = 9999
  where user_id = '11111111-1111-4111-8111-111111111111'
$$);

reset role;

insert into tap_output (line)
select is(
  (select xp from public.user_progress where user_id = '11111111-1111-4111-8111-111111111111'),
  0,
  'direct progress updates are denied'
);

set local role authenticated;

insert into tap_output (line)
select throws_ok($$
  insert into public.habits (user_id, title, starts_on)
  values ('11111111-1111-4111-8111-111111111111', 'Direct habit', current_date)
$$);

insert into tap_output (line)
select lives_ok($$
  select public.create_user_habit(
    'Read', null, 1, 'book', '#ffffff', 'daily', current_date
  )
$$, 'habit creation uses the authenticated RPC');

insert into tap_output (line)
select throws_ok($$
  insert into public.habit_completions (user_id, habit_id, completed_at)
  values (
    '11111111-1111-4111-8111-111111111111',
    (select id from public.habits where title = 'Read'),
    current_date
  )
$$);

insert into tap_output (line)
select throws_ok($$
  insert into public.study_sessions (
    user_id, client_session_id, started_at, duration_seconds, status
  ) values (
    '11111111-1111-4111-8111-111111111111', 'direct-session', now(), 0, 'active'
  )
$$);

insert into tap_output (line)
select throws_ok($$
  insert into public.user_shop_items (user_id, item_id, category, equipped)
  values ('11111111-1111-4111-8111-111111111111', 'focus-cap', 'accessory', false)
$$);

insert into tap_output (line)
select throws_ok($$
  insert into public.xp_awards (user_id, source_type, source_id, award_date, amount)
  values ('11111111-1111-4111-8111-111111111111', 'habit', 'fake', current_date, 999)
$$);

insert into tap_output (line)
select is(
  (select count(*)::integer from public.user_progress where user_id = '22222222-2222-4222-8222-222222222222'),
  0,
  'another user progress row is hidden by RLS'
);

insert into tap_output (line)
select is(
  (
    select awarded
    from public.set_habit_completion(
      (select id from public.habits where title = 'Read'),
      current_date,
      true,
      current_date
    )
  ),
  true,
  'the first habit completion is rewarded'
);

insert into tap_output (line)
select is(
  (select xp from public.user_progress where user_id = '11111111-1111-4111-8111-111111111111'),
  10,
  'habit XP is fixed at 10'
);

insert into tap_output (line)
select is(
  (select coins from public.user_progress where user_id = '11111111-1111-4111-8111-111111111111'),
  105,
  'habit coins are fixed at 5'
);

insert into tap_output (line)
select lives_ok($$
  select public.set_habit_completion(
    (select id from public.habits where title = 'Read'),
    current_date,
    false,
    current_date
  )
$$, 'habit completion can be removed');

insert into tap_output (line)
select is(
  (
    select awarded
    from public.set_habit_completion(
      (select id from public.habits where title = 'Read'),
      current_date,
      true,
      current_date
    )
  ),
  false,
  're-completion does not award twice'
);

insert into tap_output (line)
select is(
  (select xp from public.user_progress where user_id = '11111111-1111-4111-8111-111111111111'),
  10,
  'duplicate completion leaves XP unchanged'
);

insert into tap_output (line)
select lives_ok(
  $$select public.start_study_session('study-session-1')$$,
  'study session starts through the authenticated RPC'
);

reset role;

update public.study_sessions
set started_at = clock_timestamp() - interval '90 seconds'
where user_id = '11111111-1111-4111-8111-111111111111'
  and client_session_id = 'study-session-1';

set local role authenticated;

insert into tap_output (line)
select ok(
  (
    select session_duration_seconds between 89 and 91
    from public.finish_study_session('study-session-1', 600)
  ),
  'study duration is bounded by server elapsed time'
);

insert into tap_output (line)
select ok(
  (
    select xp = floor(duration_seconds / 60)
      and coins = floor(floor(duration_seconds / 60) / 5)
    from public.study_sessions
    where client_session_id = 'study-session-1'
  ),
  'study rewards use server constants'
);

insert into tap_output (line)
select is(
  (
    select newly_completed
    from public.finish_study_session('study-session-1', 600)
  ),
  false,
  'duplicate study finish is idempotent'
);

insert into tap_output (line)
select is(
  (
    select progress.total_focus_seconds
    from public.user_progress progress
    where progress.user_id = '11111111-1111-4111-8111-111111111111'
  ),
  (
    select session.duration_seconds
    from public.study_sessions session
    where session.client_session_id = 'study-session-1'
  ),
  'duplicate finish does not add focus time twice'
);

insert into tap_output (line)
select is(
  (select reason from public.buy_shop_item('gaming-desk')),
  'insufficient_coins',
  'shop purchase rejects insufficient funds'
);

insert into tap_output (line)
select ok(
  (
    select success and coins = 55
    from public.buy_shop_item('focus-cap')
  ),
  'shop purchase uses the database catalog price'
);

insert into tap_output (line)
select ok(
  exists (
    select 1 from public.user_shop_items
    where user_id = '11111111-1111-4111-8111-111111111111'
      and item_id = 'focus-cap'
  ),
  'successful purchase records ownership'
);

reset role;

update public.user_progress
set coins = 1000
where user_id = '11111111-1111-4111-8111-111111111111';

set local role authenticated;

insert into tap_output (line)
select lives_ok($$
  select public.buy_shop_item('neon-lamp');
  select public.buy_shop_item('motivational-poster');
  select public.buy_shop_item('daily-pinboard');
  select public.buy_shop_item('gaming-desk');
  select public.buy_shop_item('floor-plant');
  select public.buy_shop_item('study-glasses');
  select public.equip_shop_item('neon-lamp');
  select public.equip_shop_item('motivational-poster');
  select public.equip_shop_item('daily-pinboard');
  select public.equip_shop_item('gaming-desk');
  select public.equip_shop_item('floor-plant');
  select public.equip_shop_item('focus-cap');
  select public.equip_shop_item('study-glasses');
$$, 'owned items can be equipped transactionally by slot');

insert into tap_output (line)
select is(
  (
    select item_id
    from public.user_shop_items
    where user_id = '11111111-1111-4111-8111-111111111111'
      and equip_slot = 'room:wall_art'
      and equipped
  ),
  'daily-pinboard',
  'equipping replaces only the item in the same room slot'
);

insert into tap_output (line)
select ok(
  exists (
    select 1
    from public.user_shop_items
    where user_id = '11111111-1111-4111-8111-111111111111'
      and item_id = 'neon-lamp'
      and category = 'decoration'
      and equip_slot = 'platform:left'
      and equipped
  ),
  'same-category items in different slots stay equipped'
);

insert into tap_output (line)
select is(
  (
    select item_id
    from public.user_shop_items
    where user_id = '11111111-1111-4111-8111-111111111111'
      and equip_slot = 'wearable:head'
      and equipped
  ),
  'study-glasses',
  'the latest wearable replaces the previous head item'
);

insert into tap_output (line)
select is(
  (
    select count(*)::integer
    from public.user_shop_items
    where user_id = '11111111-1111-4111-8111-111111111111'
      and equip_slot in ('room:desk', 'room:floor_prop')
      and equipped
  ),
  2,
  'furniture in distinct room slots can be equipped together'
);

reset role;

insert into tap_output (line)
select is(
  (
    select count(*)::integer
    from public.user_shop_items owned
    join public.shop_catalog catalog on catalog.item_id = owned.item_id
    where owned.user_id = '11111111-1111-4111-8111-111111111111'
      and (
        owned.category is distinct from catalog.category
        or owned.equip_slot is distinct from catalog.equip_slot
      )
  ),
  0,
  'owned inventory metadata matches the catalog'
);

insert into tap_output (line)
select throws_ok($$
  update public.user_shop_items
  set equip_slot = 'room:rug'
  where user_id = '11111111-1111-4111-8111-111111111111'
    and item_id = 'focus-cap'
$$, 'catalog metadata cannot be tampered with');

update public.shop_catalog
set active = false
where item_id = 'warm-desk-lamp';

set local role authenticated;

insert into tap_output (line)
select is(
  (select reason from public.buy_shop_item('warm-desk-lamp')),
  'unavailable',
  'inactive catalog items cannot be purchased'
);

reset role;

update public.shop_catalog
set active = true
where item_id = 'warm-desk-lamp';

set local role authenticated;

set local "request.jwt.claim.sub" = '22222222-2222-4222-8222-222222222222';

insert into tap_output (line)
select throws_ok($$
  select public.migrate_legacy_user_data('{"sessions": {}}'::jsonb)
$$);

reset role;

insert into tap_output (line)
select is(
  (
    select count(*)::integer
    from public.user_data_migrations
    where user_id = '22222222-2222-4222-8222-222222222222'
      and migration_key = 'async_storage_v1'
  ),
  0,
  'failed migration rolls back its completion marker'
);

set local role authenticated;

insert into tap_output (line)
select is(
  public.migrate_legacy_user_data(
    '{
      "xp": 40,
      "coins": 150,
      "total_focus_seconds": 120,
      "total_completed_habits": 2,
      "awards": [],
      "shop_items": [
        {"item_id": "bookshelf", "equipped": true},
        {"item_id": "focus-cap", "equipped": true},
        {"item_id": "study-glasses", "equipped": true}
      ],
      "sessions": [{
        "legacy_id": "legacy-session-1",
        "duration_seconds": 120,
        "ended_at": "2026-07-10T10:00:00Z"
      }],
      "theme": "dark",
      "character_data": {"bodyColor": "#ffffff"}
    }'::jsonb
  ),
  true,
  'valid legacy migration succeeds'
);

reset role;

insert into tap_output (line)
select ok(
  exists (
    select 1
    from public.user_data_migrations migration
    join public.user_progress progress on progress.user_id = migration.user_id
    join public.user_settings settings on settings.user_id = migration.user_id
    where migration.user_id = '22222222-2222-4222-8222-222222222222'
      and migration.migration_key = 'async_storage_v1'
      and progress.xp = 40
      and progress.coins = 150
      and settings.theme = 'dark'
      and exists (
        select 1 from public.study_sessions
        where user_id = migration.user_id
          and client_session_id = 'legacy:legacy-session-1'
      )
      and exists (
        select 1 from public.user_shop_items
        where user_id = migration.user_id and item_id = 'bookshelf'
      )
  ),
  'legacy migration commits all payload sections together'
);

insert into tap_output (line)
select ok(
  (
    select bool_and(
      case
        when item_id = 'study-glasses'
          then equipped and equip_slot = 'wearable:head'
        when item_id = 'focus-cap'
          then not equipped and equip_slot = 'wearable:head'
        else false
      end
    ) and count(*) = 2
    from public.user_shop_items
    where user_id = '22222222-2222-4222-8222-222222222222'
      and item_id in ('focus-cap', 'study-glasses')
  ),
  'legacy equipment is deduplicated by trusted slot in payload order'
);

set local role authenticated;

insert into tap_output (line)
select is(
  public.migrate_legacy_user_data('{}'::jsonb),
  false,
  'legacy migration runs only once'
);

reset role;

insert into tap_output (line)
select * from finish();

select line as tap
from tap_output
order by position;

rollback;
