import { Habit } from "@/types/habits";

// The one place progression is derived. Level maths lives in utils/xp;
// everything downstream of it — level tiers, streak tiers, streak walks —
// is answered here so the avatar, dashboard, and persisted progress can
// never disagree.

export interface StreakSummary {
  currentStreak: number;
  longestStreak: number;
}

// Avatar evolution tiers: levels 1-3 / 4-6 / 7-9 / 10+ → 0..3
export const toLevelTier = (level: number) =>
  Math.min(3, Math.floor((level - 1) / 3));

// Streak glow tiers: 3 / 7 / 14 consecutive days → 1..3
export const toStreakTier = (streak: number) =>
  streak >= 14 ? 3 : streak >= 7 ? 2 : streak >= 3 ? 1 : 0;

// A streak day is a day on which ALL habits were completed. The current
// streak includes today once today is complete; an incomplete today doesn't
// break the streak (it just isn't counted yet) — any earlier gap ends it.
export function calculateStreaks(habits: Habit[]): StreakSummary {
  if (habits.length === 0) return { currentStreak: 0, longestStreak: 0 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let checkingCurrent = true;

  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split("T")[0];

    const completedAll = habits.every(
      (habit) => habit.completionHistory?.[dateKey] === true
    );

    if (completedAll) {
      tempStreak++;
      if (checkingCurrent) currentStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      if (checkingCurrent && i > 0) checkingCurrent = false;
      tempStreak = 0;
    }
  }

  return { currentStreak, longestStreak };
}

export function calculateCurrentStreak(habits: Habit[]): number {
  return calculateStreaks(habits).currentStreak;
}
