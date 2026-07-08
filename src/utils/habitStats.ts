import { Habit } from "@/types/habits";

// Pure habit statistics helpers. No I/O, no React — the maths that screens
// and services share.

export const todayDateKey = () => new Date().toISOString().split("T")[0];

// Presence of a completion row IS the completion (completed_at is a date)
export function buildCompletionHistory(
  rows: { completed_at?: string | null }[] | null | undefined
): { [date: string]: boolean } {
  const history: { [date: string]: boolean } = {};
  rows?.forEach((row) => {
    if (row.completed_at) history[row.completed_at] = true;
  });
  return history;
}

export function isHabitCompletedOnDate(
  habit: Pick<Habit, "completionHistory">,
  dateKey: string
): boolean {
  return habit.completionHistory?.[dateKey] === true;
}

export function calculateCompletedCount(habits: Habit[]): number {
  return habits.filter((habit) => habit.completed).length;
}

export function calculateCompletionPercentage(
  completedCount: number,
  totalCount: number
): number {
  return totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
}

// Streak semantics live in utils/progression — the single owner of streak
// and tier derivation — so the UI streak and the persisted streak can never
// disagree. Re-exported here to keep one import site for habit stats.
// Note: the consolidated streak counts today once today is complete.
export { calculateCurrentStreak } from "./progression";
