import { Habit } from "@/types/habits";

// Define FocusSession interface locally if not available in types
export interface FocusSession {
  id: string;
  duration: number; // in seconds
  endedAt: string;
}

export interface DayStats {
  date: Date;
  dateKey: string;
  habitsCompleted: number;
  habitsTotal: number;
  studyMinutes: number;
  completionRate: number;
}

export interface HabitStats {
  habitId: string;
  name: string;
  icon: string;
  completionRate: number;
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  lastCompleted: string | null;
}

export interface PeriodStats {
  totalHabitsCompleted: number;
  averageCompletion: number;
  totalStudyMinutes: number;
  averageStudyMinutes: number;
  bestDay: DayStats | null;
  worstDay: DayStats | null;
  currentStreak: number;
  longestStreak: number;
  periodChange: number; // % change from previous period
}

// Get dates for a period
export function getDatesForPeriod(
  period: "day" | "week" | "month" | "3months"
): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysCount =
    period === "day" ? 1 : period === "week" ? 7 : period === "month" ? 30 : 90;

  for (let i = daysCount - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(date);
  }

  return dates;
}

// Calculate stats for each day
export function calculateDayStats(
  date: Date,
  habits: Habit[],
  sessions: FocusSession[] = []
): DayStats {
  const dateKey = date.toISOString().split("T")[0];

  const habitsCompleted = habits.filter(
    (h) => h.completionHistory && h.completionHistory[dateKey] === true
  ).length;

  const studyMinutes = sessions
    .filter(
      (s) =>
        s.endedAt && new Date(s.endedAt).toDateString() === date.toDateString()
    )
    .reduce((sum, s) => sum + s.duration / 60, 0);

  return {
    date,
    dateKey,
    habitsCompleted,
    habitsTotal: habits.length,
    studyMinutes: Math.round(studyMinutes),
    completionRate:
      habits.length > 0 ? (habitsCompleted / habits.length) * 100 : 0,
  };
}

// Calculate period statistics
export function calculatePeriodStats(
  habits: Habit[],
  sessions: FocusSession[] = [],
  period: "day" | "week" | "month" | "3months"
): PeriodStats {
  const dates = getDatesForPeriod(period);
  const dayStats = dates.map((date) =>
    calculateDayStats(date, habits, sessions)
  );

  // Calculate totals and averages
  const totalHabitsCompleted = dayStats.reduce(
    (sum, day) => sum + day.habitsCompleted,
    0
  );
  const totalStudyMinutes = dayStats.reduce(
    (sum, day) => sum + day.studyMinutes,
    0
  );

  // Find best and worst days
  const sortedByCompletion = [...dayStats].sort(
    (a, b) => b.completionRate - a.completionRate
  );
  const bestDay = sortedByCompletion[0] || null;
  const worstDay = sortedByCompletion[sortedByCompletion.length - 1] || null;

  // Calculate streaks (overall)
  // For overall streak, we check if ALL habits were completed on a day
  const { currentStreak, longestStreak } = calculateStreaks(habits);

  // Calculate period change (compare to previous period)
  const previousDates = getDatesForPeriod(period).map((d) => {
    const prevDate = new Date(d);
    prevDate.setDate(prevDate.getDate() - dates.length);
    return prevDate;
  });

  const previousStats = previousDates.map((date) =>
    calculateDayStats(date, habits, sessions)
  );
  const previousAverage =
    previousStats.reduce((sum, day) => sum + day.completionRate, 0) /
    (previousStats.length || 1);
  const currentAverage =
    dayStats.reduce((sum, day) => sum + day.completionRate, 0) /
    (dayStats.length || 1);
  const periodChange =
    previousAverage > 0
      ? ((currentAverage - previousAverage) / previousAverage) * 100
      : 0;

  return {
    totalHabitsCompleted,
    averageCompletion: currentAverage,
    totalStudyMinutes,
    averageStudyMinutes: totalStudyMinutes / dates.length,
    bestDay,
    worstDay,
    currentStreak,
    longestStreak,
    periodChange,
  };
}

// Calculate streaks for habits
export function calculateStreaks(habits: Habit[]): {
  currentStreak: number;
  longestStreak: number;
} {
  if (habits.length === 0) return { currentStreak: 0, longestStreak: 0 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let checkingCurrent = true;

  // Check last 365 days for streaks
  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split("T")[0];

    // A day is part of the streak if ALL habits are completed
    // Or maybe just > 0? The user prompt logic was:
    // const completedAll = habits.every(h => (h.logs[dateKey] || 0) >= h.target);
    // Let's stick to "All habits completed" for a perfect streak,
    // or maybe relaxed to > 50%? Let's stick to strict "all" for now as per prompt logic.
    const completedAll = habits.every(
      (h) => h.completionHistory && h.completionHistory[dateKey] === true
    );

    if (completedAll) {
      tempStreak++;
      if (checkingCurrent) currentStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      // If today isn't over yet, maybe don't break streak?
      // For simplicity, if not all done, streak breaks.
      if (checkingCurrent && i > 0) checkingCurrent = false;
      // If i==0 (today) and not done, we don't increment currentStreak but we don't necessarily stop checking previous days if we consider "streak active until broken by yesterday"
      // But the prompt logic: if (checkingCurrent && i > 0) checkingCurrent = false;
      // implies if today is not done, currentStreak doesn't include today, but we stop checking.
      // Actually, usually current streak includes today if done, or is based on yesterday if today not done.
      // Let's keep prompt logic: strict sequence.
      tempStreak = 0;
    }
  }

  return { currentStreak, longestStreak };
}

// Calculate individual habit statistics
export function calculateHabitStats(habit: Habit): HabitStats {
  const logs = habit.completionHistory
    ? Object.entries(habit.completionHistory)
    : [];
  const completedDays = logs.filter(([_, value]) => value === true);

  // Determine start date for completion rate.
  // Using creation date or fallback to first log or just logs length?
  // Prompt used: const totalDays = logs.length || 1; which is just days logged.
  // But completionHistory only stores true/false for specific dates.
  // Let's use a fixed period like 30 days or time since creation.
  const now = new Date();
  const createdAt = new Date(habit.createdAt);
  const daysSinceCreation = Math.max(
    1,
    Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
  );
  const totalDays = daysSinceCreation;

  // Calculate completion rate
  const completionRate = Math.min(
    100,
    (completedDays.length / totalDays) * 100
  );

  // Calculate streaks
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split("T")[0];

    if (habit.completionHistory && habit.completionHistory[dateKey] === true) {
      tempStreak++;
      if (
        i === 0 ||
        (habit.completionHistory && habit.completionHistory[dateKey] === true)
      ) {
        // This condition inside loop is redundant but follows "if completed"
        // We need to know if the streak is contiguous from today
        // Simplified:
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  // Recalculate current streak specifically
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split("T")[0];
    if (habit.completionHistory && habit.completionHistory[dateKey] === true) {
      streak++;
    } else if (i === 0) {
      // If today is not done, continue to yesterday
      continue;
    } else {
      break;
    }
  }
  currentStreak = streak;

  // Find last completed date
  const sortedCompletedDays = completedDays.sort((a, b) =>
    b[0].localeCompare(a[0])
  );
  const lastCompleted = sortedCompletedDays[0]?.[0] || null;

  return {
    habitId: habit.id,
    name: habit.title,
    icon: "📝", // Default icon as it's not in Habit type
    completionRate,
    currentStreak,
    longestStreak,
    totalCompletions: completedDays.length,
    lastCompleted,
  };
}

// Generate insights
export function generateInsights(
  habits: Habit[],
  sessions: FocusSession[] = [],
  periodStats: PeriodStats
): string[] {
  const insights: string[] = [];

  // Best performing habit
  if (habits.length > 0) {
    const habitStats = habits.map((h) => calculateHabitStats(h));
    const bestHabit = habitStats.sort(
      (a, b) => b.completionRate - a.completionRate
    )[0];
    if (bestHabit && bestHabit.completionRate > 70) {
      insights.push(
        `${bestHabit.icon} ${
          bestHabit.name
        } is your strongest habit with ${Math.round(
          bestHabit.completionRate
        )}% completion rate`
      );
    }
  }

  // Streak insight
  if (periodStats.currentStreak > 3) {
    insights.push(
      `🔥 You're on a ${periodStats.currentStreak} day streak! Keep it up!`
    );
  } else if (periodStats.currentStreak === 0) {
    insights.push(`💪 Start a new streak today by completing all your habits`);
  }

  // Study time insight
  if (periodStats.averageStudyMinutes > 60) {
    insights.push(
      `📚 Averaging ${Math.round(
        periodStats.averageStudyMinutes
      )} minutes of study per day - excellent focus!`
    );
  } else if (
    periodStats.averageStudyMinutes < 30 &&
    periodStats.averageStudyMinutes > 0
  ) {
    insights.push(
      `⏰ Try to increase your study time to at least 30 minutes per day`
    );
  }

  // Improvement insight
  if (periodStats.periodChange > 10) {
    insights.push(
      `📈 ${Math.round(
        periodStats.periodChange
      )}% improvement from last period!`
    );
  } else if (periodStats.periodChange < -10) {
    insights.push(
      `📉 Completion down ${Math.round(
        Math.abs(periodStats.periodChange)
      )}% - refocus on your goals`
    );
  }

  // Best day insight
  if (periodStats.bestDay && periodStats.bestDay.completionRate === 100) {
    const dayName = periodStats.bestDay.date.toLocaleDateString("en", {
      weekday: "long",
    });
    insights.push(`✨ Perfect completion on ${dayName}!`);
  }

  return insights;
}

// Get heatmap data for a habit
export function getHabitHeatmapData(
  habit: Habit,
  weeks: number = 12
): number[][] {
  const data: number[][] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start from the beginning of the week
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  for (let week = 0; week < weeks; week++) {
    const weekData: number[] = [];

    for (let day = 0; day < 7; day++) {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() - week * 7 + day);
      const dateKey = date.toISOString().split("T")[0];

      const isCompleted =
        habit.completionHistory && habit.completionHistory[dateKey] === true;
      const intensity = isCompleted ? 4 : 0; // Simple binary for now: 4 (green) or 0 (empty)

      weekData.push(intensity);
    }

    data.unshift(weekData); // Add to beginning to have oldest weeks first
  }

  return data;
}
