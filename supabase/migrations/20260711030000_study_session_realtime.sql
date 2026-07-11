-- Analytics listens for completed-session updates so another signed-in device
-- can refresh without remounting the screen.

do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'study_sessions'
  ) then
    alter publication supabase_realtime add table public.study_sessions;
  end if;
end;
$$;
