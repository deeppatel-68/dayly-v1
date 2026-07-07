import { supabase } from "@/lib/supabase";
import {
  completeHabitWithReward,
  HabitRewardResult,
} from "@/services/progressService";
import { Habit } from "@/types/habits";
import { buildCompletionHistory, todayDateKey } from "@/utils/habitStats";
import { logSupabaseError } from "@/utils/supabaseErrors";

// Habits persistence seam: every Supabase habit/completion query lives here,
// alongside the once-per-habit-per-date reward (the atomic
// complete_habit_with_reward RPC via progressService). HabitsContext is a
// thin view over this interface, matching progress/shop/settings/study.

export type { HabitRewardResult };

export const MAX_HABITS = 5;

const DEFAULT_HABITS = [
  {
    title: "Drink Water",
    target_count: 8,
    icon: "water",
    color: "#3B82F6", // blue
    frequency: "daily",
    description: "Stay hydrated throughout the day",
  },
  {
    title: "Exercise",
    target_count: 3,
    icon: "walk",
    color: "#22C55E", // green
    frequency: "daily",
    description: "Move your body",
  },
  {
    title: "Read",
    target_count: 1,
    icon: "book",
    color: "#A855F7", // purple
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
}

function mapHabitRow(
  row: HabitRow,
  completionHistory: { [date: string]: boolean }
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
    completedAt: completedToday ? (row.completed_at ?? undefined) : undefined,
    createdAt: row.created_at,
    completionHistory,
  };
}

// Load the user's habits with completion history; first-time users get the
// default starter habits created for them.
export async function loadUserHabits(userId: string): Promise<Habit[]> {
  const { data, error } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  if (!data || data.length === 0) {
    try {
      return await createDefaultHabits(userId);
    } catch (creationError) {
      logSupabaseError("Error creating default habits:", creationError);
      return [];
    }
  }

  // One query for every completion, grouped per habit
  const { data: completionRows, error: completionsError } = await supabase
    .from("habit_completions")
    .select("habit_id,completed_at")
    .eq("user_id", userId);

  if (completionsError) throw completionsError;

  const rowsByHabit = new Map<string, { completed_at?: string | null }[]>();
  completionRows?.forEach(
    (row: { habit_id: string; completed_at?: string }) => {
      const list = rowsByHabit.get(row.habit_id) ?? [];
      list.push(row);
      rowsByHabit.set(row.habit_id, list);
    }
  );

  return (data as HabitRow[]).map((row) =>
    mapHabitRow(row, buildCompletionHistory(rowsByHabit.get(row.id)))
  );
}

async function createDefaultHabits(userId: string): Promise<Habit[]> {
  const habitsToCreate = DEFAULT_HABITS.map((habit) => ({
    ...habit,
    user_id: userId,
  }));

  const { data, error } = await supabase
    .from("habits")
    .insert(habitsToCreate)
    .select();

  if (error) throw error;

  return (data as HabitRow[]).map((row) => mapHabitRow(row, {}));
}

export async function createHabit(
  userId: string,
  title: string,
  description?: string
): Promise<Habit> {
  // The limit is a habits-domain invariant, enforced behind the seam
  const { count, error: countError } = await supabase
    .from("habits")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (countError) throw countError;
  if ((count ?? 0) >= MAX_HABITS) {
    throw new Error(`Maximum habit limit reached (${MAX_HABITS} habits)`);
  }

  const { data, error } = await supabase
    .from("habits")
    .insert([
      {
        user_id: userId,
        title: title.trim(),
        description: description?.trim() || null,
        target_count: 1,
        icon: "book",
        color: "#FF6B35", // orange
        frequency: "daily",
      },
    ])
    .select()
    .single();

  if (error) throw error;

  return mapHabitRow(data as HabitRow, {});
}

export async function updateHabit(
  userId: string,
  habitId: string,
  title: string,
  description?: string
): Promise<void> {
  const { error } = await supabase
    .from("habits")
    .update({
      title: title.trim(),
      description: description?.trim() || null,
    })
    .eq("id", habitId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function deleteHabit(
  userId: string,
  habitId: string
): Promise<void> {
  const { error } = await supabase
    .from("habits")
    .delete()
    .eq("id", habitId)
    .eq("user_id", userId);

  if (error) throw error;
}

// Set a habit's completion for a date. Completing runs the atomic
// completion+reward RPC (once per habit per date — uncomplete/recomplete
// can never double-award) and returns the reward result for celebration UI.
export async function setHabitCompletion(
  userId: string,
  habitId: string,
  dateKey: string,
  completed: boolean
): Promise<HabitRewardResult | undefined> {
  if (completed) {
    return completeHabitWithReward(userId, habitId, dateKey);
  }

  const { error } = await supabase
    .from("habit_completions")
    .delete()
    .eq("habit_id", habitId)
    .eq("user_id", userId)
    .eq("completed_at", dateKey);

  if (error) throw error;
  return undefined;
}

// New-day check against profiles.last_reset_date. Returns true when a new
// day was detected (callers clear local completed-today flags). Never
// throws — matching the previous fire-and-forget behaviour.
export async function syncDailyReset(userId: string): Promise<boolean> {
  try {
    const today = new Date().toDateString();

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("last_reset_date")
      .eq("id", userId)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      // PGRST116 is "not found" - handled below
      throw profileError;
    }

    const lastReset = profile?.last_reset_date || null;
    if (lastReset === today) return false;

    const { error: updateError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        last_reset_date: today,
      },
      {
        onConflict: "id",
      }
    );

    if (updateError) {
      if (
        updateError.code === "42501" &&
        updateError.message &&
        updateError.message.includes("row-level security")
      ) {
        logSupabaseError(
          "Failed to update last reset date due to row-level security (RLS) on the 'profiles' table. Ensure your Supabase RLS policies allow authenticated users to upsert their own profile records. Update your Supabase policy for table 'profiles' to allow upserts for authenticated users where user id = auth.uid().",
          updateError
        );
      } else {
        logSupabaseError("Error updating last reset date:", updateError);
      }
    }

    return true;
  } catch (error) {
    logSupabaseError("Error checking and resetting daily:", error);
    return false;
  }
}
