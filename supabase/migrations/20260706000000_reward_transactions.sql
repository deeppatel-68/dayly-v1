-- Atomic reward flows for habit completions and focus sessions.

create or replace function public.complete_habit_with_reward(
  p_user_id uuid,
  p_habit_id uuid,
  p_completed_at date,
  p_xp integer default 10,
  p_coins integer default 5
)
returns table (
  completion_id uuid,
  awarded boolean,
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
security invoker
as $$
declare
  v_completion_id uuid;
  v_award_id uuid;
  v_progress public.user_progress;
begin
  if p_user_id <> auth.uid() then
    raise exception 'Cannot complete a habit for another user';
  end if;

  if p_xp < 0 or p_coins < 0 then
    raise exception 'Reward values cannot be negative';
  end if;

  if not exists (
    select 1
    from public.habits h
    where h.id = p_habit_id and h.user_id = p_user_id
  ) then
    raise exception 'Habit does not belong to user';
  end if;

  insert into public.user_progress (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  insert into public.habit_completions (user_id, habit_id, completed_at)
  values (p_user_id, p_habit_id, p_completed_at)
  on conflict (user_id, habit_id, completed_at)
  do update set updated_at = now()
  returning id into v_completion_id;

  insert into public.xp_awards (
    user_id,
    source_type,
    source_id,
    award_date,
    amount
  )
  values (
    p_user_id,
    'habit',
    p_habit_id::text,
    p_completed_at,
    p_xp
  )
  on conflict (user_id, source_type, source_id, award_date)
  do nothing
  returning id into v_award_id;

  if v_award_id is not null then
    update public.user_progress as up
    set
      xp = up.xp + p_xp,
      coins = up.coins + p_coins,
      total_completed_habits = up.total_completed_habits + 1,
      updated_at = now()
    where up.user_id = p_user_id
    returning * into v_progress;
  else
    select * into v_progress
    from public.user_progress up
    where up.user_id = p_user_id;
  end if;

  return query select
    v_completion_id,
    v_award_id is not null,
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

create or replace function public.record_study_session_with_reward(
  p_user_id uuid,
  p_duration_seconds integer,
  p_xp integer default 0,
  p_coins integer default 0,
  p_ended_at timestamptz default now()
)
returns table (
  session_id uuid,
  session_duration_seconds integer,
  session_xp integer,
  session_coins integer,
  session_ended_at timestamptz,
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
security invoker
as $$
declare
  v_session public.study_sessions;
  v_progress public.user_progress;
begin
  if p_user_id <> auth.uid() then
    raise exception 'Cannot record a study session for another user';
  end if;

  if p_duration_seconds <= 0 then
    raise exception 'Study session duration must be positive';
  end if;

  if p_xp < 0 or p_coins < 0 then
    raise exception 'Reward values cannot be negative';
  end if;

  insert into public.user_progress (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  insert into public.study_sessions (
    user_id,
    duration_seconds,
    xp,
    coins,
    ended_at
  )
  values (
    p_user_id,
    p_duration_seconds,
    p_xp,
    p_coins,
    p_ended_at
  )
  returning * into v_session;

  update public.user_progress as up
  set
    xp = up.xp + p_xp,
    coins = up.coins + p_coins,
    total_focus_seconds = up.total_focus_seconds + p_duration_seconds,
    updated_at = now()
  where up.user_id = p_user_id
  returning * into v_progress;

  return query select
    v_session.id,
    v_session.duration_seconds,
    v_session.xp,
    v_session.coins,
    v_session.ended_at,
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
