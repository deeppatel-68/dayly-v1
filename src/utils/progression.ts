import { Habit } from "@/types/habits";
import {
  addCalendarDays,
  fromLocalDateKey,
  toLocalDateKey,
} from "@/utils/dateKey";

export interface StreakSummary {
  currentStreak: number;
  longestStreak: number;
}

export const toLevelTier = (level: number) =>
  Math.min(3, Math.floor((level - 1) / 3));

export const toStreakTier = (streak: number) =>
  streak >= 14 ? 3 : streak >= 7 ? 2 : streak >= 3 ? 1 : 0;

function isHabitActiveOn(habit: Habit, dateKey: string): boolean {
  return (
    habit.startsOn <= dateKey &&
    (!habit.archivedOn || dateKey < habit.archivedOn)
  );
}

export function calculateStreaks(
  habits: Habit[],
  today = new Date()
): StreakSummary {
  if (habits.length === 0) return { currentStreak: 0, longestStreak: 0 };

  const todayKey = toLocalDateKey(today);
  const firstKey = habits
    .map((habit) => habit.startsOn)
    .filter((dateKey) => dateKey <= todayKey)
    .sort()[0];
  if (!firstKey) return { currentStreak: 0, longestStreak: 0 };

  let cursor = fromLocalDateKey(firstKey);
  const finalDay = fromLocalDateKey(todayKey);
  let run = 0;
  let longestStreak = 0;
  let todaySuccessful = false;
  let yesterdaySuccessful = false;
  let yesterdayRun = 0;

  while (cursor <= finalDay) {
    const dateKey = toLocalDateKey(cursor);
    const required = habits.filter((habit) => isHabitActiveOn(habit, dateKey));
    const successful =
      required.length > 0 &&
      required.every((habit) => habit.completionHistory?.[dateKey] === true);

    if (successful) {
      run += 1;
      longestStreak = Math.max(longestStreak, run);
    } else {
      run = 0;
    }

    if (dateKey === todayKey) todaySuccessful = successful;
    if (dateKey === toLocalDateKey(addCalendarDays(finalDay, -1))) {
      yesterdaySuccessful = successful;
      yesterdayRun = run;
    }

    cursor = addCalendarDays(cursor, 1);
  }

  return {
    currentStreak: todaySuccessful
      ? run
      : yesterdaySuccessful
      ? yesterdayRun
      : 0,
    longestStreak,
  };
}

export function calculateCurrentStreak(
  habits: Habit[],
  today = new Date()
): number {
  return calculateStreaks(habits, today).currentStreak;
}
