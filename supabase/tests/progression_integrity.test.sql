begin;

create extension if not exists pgtap with schema extensions;

create temporary table tap_output (
  position integer generated always as identity,
  line text not null
) on commit drop;

grant insert on table tap_output to authenticated;
grant usage, select on sequence tap_output_position_seq to authenticated;

insert into tap_output (line)
select plan(32);

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
set coins = 500
where user_id = '11111111-1111-4111-8111-111111111111';

set local role authenticated;

insert into tap_output (line)
select lives_ok($$
  select public.buy_shop_item('neon-lamp');
  select public.buy_shop_item('motivational-poster');
  select public.equip_shop_item('neon-lamp');
  select public.equip_shop_item('motivational-poster');
$$, 'owned items can be equipped transactionally');

insert into tap_output (line)
select is(
  (
    select item_id
    from public.user_shop_items
    where user_id = '11111111-1111-4111-8111-111111111111'
      and category = 'decoration'
      and equipped
  ),
  'motivational-poster',
  'equipping replaces the equipped item in the same category'
);

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
      "shop_items": [{"item_id": "bookshelf", "equipped": true}],
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
