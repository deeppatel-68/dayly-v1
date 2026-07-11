-- Make the intended client surface explicit for both hosted and clean local
-- Supabase projects. Reward and economy tables are read-only to clients;
-- security-definer domain RPCs own every mutation.

revoke all on table public.habits from anon, authenticated;
revoke all on table public.habit_completions from anon, authenticated;
revoke all on table public.user_progress from anon, authenticated;
revoke all on table public.xp_awards from anon, authenticated;
revoke all on table public.study_sessions from anon, authenticated;
revoke all on table public.user_shop_items from anon, authenticated;
revoke all on table public.shop_catalog from anon, authenticated;
revoke all on table public.user_data_migrations from anon, authenticated;

grant select on table public.habits to authenticated;
grant select on table public.habit_completions to authenticated;
grant select on table public.user_progress to authenticated;
grant select on table public.xp_awards to authenticated;
grant select on table public.study_sessions to authenticated;
grant select on table public.user_shop_items to authenticated;
grant select on table public.shop_catalog to authenticated;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.user_settings from anon, authenticated;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update on table public.user_settings to authenticated;
