import { supabase } from "@/lib/supabase";
import {
  HabitRewardResult,
  normalizeRpcProgress,
  normalizeUserProgress,
  syncUserProgress,
  UserProgress,
} from "@/services/progressService";
import { Habit } from "@/types/habits";
import { buildCompletionHistory, todayDateKey } from "@/utils/habitStats";

export type { HabitRewardResult };

export const MAX_HABITS = 5;

const DEFAULT_HABITS = [
  {
    title: "Drink Water",
    target_count: 8,
    icon: "water",
    color: "#3B82F6",
    frequency: "daily",
    description: "Stay hydrated throughout the day",
  },
  {
    title: "Exercise",
    target_count: 3,
    icon: "walk",
    color: "#22C55E",
    frequency: "daily",
    description: "Move your body",
  },
  {
    title: "Read",
    target_count: 1,
    icon: "book",
    color: "#A855F7",
    frequency: "daily",
    description: "Read for personal growth",
  },
];

interface HabitRow {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  target_count: number;
  icon: string;
  color: string;
  frequency: string;
  completed_at?: string | null;
  created_at: string;
  starts_on: string;
  archived_on?: string | null;
}

function mapHabitRow(
  row: HabitRow,
  completionHistory: Record<string, boolean>
): Habit {
  const completedToday = completionHistory[todayDateKey()] === true;

  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    description: row.description ?? undefined,
    target_count: row.target_count,
    icon: row.icon,
    color: row.color,
    frequency: row.frequency,
    completed: completedToday,
    completedAt: completedToday ? row.completed_at ?? undefined : undefined,
    createdAt: row.created_at,
    startsOn: row.starts_on,
    archivedOn: row.archived_on ?? undefined,
    completionHistory,
  };
}

async function createHabitRpc(
  habit: (typeof DEFAULT_HABITS)[number]
): Promise<Habit> {
  const { data, error } = await supabase
    .rpc("create_user_habit", {
      p_title: habit.title,
      p_description: habit.description,
      p_target_count: habit.target_count,
      p_icon: habit.icon,
      p_color: habit.color,
      p_frequency: habit.frequency,
      p_local_today: todayDateKey(),
    })
    .single();

  if (error) throw error;
  return mapHabitRow(data as HabitRow, {});
}

async function createDefaultHabits(): Promise<Habit[]> {
  const created: Habit[] = [];
  for (const habit of DEFAULT_HABITS) {
    created.push(await createHabitRpc(habit));
  }
  return created;
}

export async function loadUserHabits(userId: string): Promise<Habit[]> {
  const { data, error } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (!data || data.length === 0) return createDefaultHabits();

  const activeRows = (data as HabitRow[]).filter((row) => !row.archived_on);
  if (activeRows.length === 0) return [];

  const { data: completionRows, error: completionsError } = await supabase
    .from("habit_completions")
    .select("habit_id,completed_at")
    .eq("user_id", userId);

  if (completionsError) throw completionsError;

  const rowsByHabit = new Map<string, { completed_at?: string | null }[]>();
  completionRows?.forEach(
    (row: { habit_id: string; completed_at?: string | null }) => {
      const rows = rowsByHabit.get(row.habit_id) ?? [];
      rows.push(row);
      rowsByHabit.set(row.habit_id, rows);
    }
  );

  return activeRows.map((row) =>
    mapHabitRow(row, buildCompletionHistory(rowsByHabit.get(row.id)))
  );
}

export async function createHabit(
  userId: string,
  title: string,
  description?: string
): Promise<Habit> {
  const { data, error } = await supabase
    .rpc("create_user_habit", {
      p_title: title,
      p_description: description ?? null,
      p_target_count: 1,
      p_icon: "book",
      p_color: "#FF6B35",
      p_frequency: "daily",
      p_local_today: todayDateKey(),
    })
    .single();

  if (error) throw error;
  await refreshProgress(userId);
  return mapHabitRow(data as HabitRow, {});
}

export async function updateHabit(
  _userId: string,
  habitId: string,
  title: string,
  description?: string
): Promise<void> {
  const { error } = await supabase.rpc("update_user_habit", {
    p_habit_id: habitId,
    p_title: title,
    p_description: description ?? null,
  });
  if (error) throw error;
}

export async function deleteHabit(
  userId: string,
  habitId: string
): Promise<void> {
  const { data, error } = await supabase
    .rpc("archive_user_habit", {
      p_habit_id: habitId,
      p_local_today: todayDateKey(),
    })
    .single();

  if (error) throw error;
  await syncUserProgress(normalizeUserProgress(data as UserProgress));
  await refreshProgress(userId);
}

export async function setHabitCompletion(
  userId: string,
  habitId: string,
  dateKey: string,
  completed: boolean
): Promise<HabitRewardResult> {
  const { data, error } = await supabase
    .rpc("set_habit_completion", {
      p_habit_id: habitId,
      p_completed_at: dateKey,
      p_completed: completed,
      p_local_today: todayDateKey(),
    })
    .single();

  if (error) throw error;
  const row = data as {
    completion_id: string | null;
    awarded: boolean;
    reward_xp: number;
    reward_coins: number;
    progress_user_id: string;
    progress_xp: number;
    progress_coins: number;
    progress_current_streak: number;
    progress_best_streak: number;
    progress_total_focus_seconds: number;
    progress_total_completed_habits: number;
    progress_updated_at?: string;
  };
  const progress = await syncUserProgress(normalizeRpcProgress(row));

  if (progress.user_id !== userId) throw new Error("Progress user mismatch");
  return {
    completionId: row.completion_id,
    awarded: row.awarded,
    xp: row.reward_xp,
    coins: row.reward_coins,
    progress,
  };
}

async function refreshProgress(userId: string) {
  const { data, error } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  await syncUserProgress(normalizeUserProgress(data));
}
