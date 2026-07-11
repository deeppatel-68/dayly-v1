-- Preserve the existing consistency-calendar workflow: authenticated users may
-- correct an earlier day while the habit was active. starts_on/archived_on
-- bound the valid history and xp_awards keeps each day idempotent.

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
  if p_completed_at > p_local_today then
    raise exception 'Cannot complete a future date';
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
