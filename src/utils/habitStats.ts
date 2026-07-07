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

// Consecutive days (starting yesterday, looking back up to a year) on which
// ALL habits were completed
export function calculateCurrentStreak(habits: Habit[]): number {
  if (habits.length === 0) return 0;

  let streak = 0;
  const today = new Date();

  for (let i = 1; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const dateKey = checkDate.toISOString().split("T")[0];

    const allCompleted = habits.every((habit) =>
      isHabitCompletedOnDate(habit, dateKey)
    );

    if (allCompleted) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
