import { Habit } from "@/types/habits";
import {
  addCalendarDays,
  fromLocalDateKey,
  toLocalDateKey,
} from "@/utils/dateKey";
import { calculateStreaks } from "@/utils/progression";

export type AnalyticsPeriod = "day" | "week" | "month" | "3months";

export interface FocusSession {
  id: string;
  duration: number;
  endedAt: string;
}

export interface ChartPoint {
  label: string;
  value: number;
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
  averageSessionMinutes: number;
  sessionCount: number;
  bestDay: DayStats | null;
  worstDay: DayStats | null;
  currentStreak: number;
  longestStreak: number;
  periodChange: number;
}

const PERIOD_DAYS: Record<AnalyticsPeriod, number> = {
  day: 1,
  week: 7,
  month: 30,
  "3months": 91,
};

function atLocalMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isHabitActiveOn(habit: Habit, dateKey: string): boolean {
  return (
    habit.startsOn <= dateKey &&
    (!habit.archivedOn || dateKey < habit.archivedOn)
  );
}

function sessionDateKey(session: FocusSession): string | null {
  const date = new Date(session.endedAt);
  return Number.isNaN(date.getTime()) ? null : toLocalDateKey(date);
}

export function getDatesForPeriod(
  period: AnalyticsPeriod,
  referenceDate = new Date()
): Date[] {
  const today = atLocalMidnight(referenceDate);
  return Array.from({ length: PERIOD_DAYS[period] }, (_, index) =>
    addCalendarDays(today, index - PERIOD_DAYS[period] + 1)
  );
}

export function getSessionsForPeriod(
  sessions: FocusSession[],
  period: AnalyticsPeriod,
  referenceDate = new Date()
): FocusSession[] {
  const dates = getDatesForPeriod(period, referenceDate);
  const firstKey = toLocalDateKey(dates[0]);
  const lastKey = toLocalDateKey(dates[dates.length - 1]);
  return sessions.filter((session) => {
    const dateKey = sessionDateKey(session);
    return dateKey !== null && dateKey >= firstKey && dateKey <= lastKey;
  });
}

export function calculateDayStats(
  date: Date,
  habits: Habit[],
  sessions: FocusSession[] = []
): DayStats {
  const dateKey = toLocalDateKey(date);
  const activeHabits = habits.filter((habit) =>
    isHabitActiveOn(habit, dateKey)
  );
  const habitsCompleted = activeHabits.filter(
    (habit) => habit.completionHistory?.[dateKey] === true
  ).length;
  const studySeconds = sessions
    .filter((session) => sessionDateKey(session) === dateKey)
    .reduce((sum, session) => sum + session.duration, 0);

  return {
    date,
    dateKey,
    habitsCompleted,
    habitsTotal: activeHabits.length,
    studyMinutes: Math.round(studySeconds / 60),
    completionRate:
      activeHabits.length > 0
        ? (habitsCompleted / activeHabits.length) * 100
        : 0,
  };
}

function shiftDates(dates: Date[], days: number): Date[] {
  return dates.map((date) => addCalendarDays(date, days));
}

function averageCompletionForDates(
  dates: Date[],
  habits: Habit[],
  sessions: FocusSession[]
): number {
  if (dates.length === 0) return 0;
  return (
    dates.reduce(
      (sum, date) => sum + calculateDayStats(date, habits, sessions).completionRate,
      0
    ) / dates.length
  );
}

export function calculatePeriodStats(
  habits: Habit[],
  sessions: FocusSession[] = [],
  period: AnalyticsPeriod,
  referenceDate = new Date()
): PeriodStats {
  const dates = getDatesForPeriod(period, referenceDate);
  const dayStats = dates.map((date) =>
    calculateDayStats(date, habits, sessions)
  );
  const periodSessions = getSessionsForPeriod(sessions, period, referenceDate);
  const totalStudySeconds = periodSessions.reduce(
    (sum, session) => sum + session.duration,
    0
  );
  const totalHabitsCompleted = dayStats.reduce(
    (sum, day) => sum + day.habitsCompleted,
    0
  );
  const averageCompletion = averageCompletionForDates(
    dates,
    habits,
    sessions
  );
  const rankedDays = dayStats
    .filter((day) => day.habitsTotal > 0)
    .sort((a, b) => b.completionRate - a.completionRate);
  const previousAverage = averageCompletionForDates(
    shiftDates(dates, -dates.length),
    habits,
    sessions
  );
  const { currentStreak, longestStreak } = calculateStreaks(
    habits,
    referenceDate
  );
  const averageSessionMinutes =
    periodSessions.length > 0
      ? totalStudySeconds / 60 / periodSessions.length
      : 0;

  return {
    totalHabitsCompleted,
    averageCompletion,
    totalStudyMinutes: Math.round(totalStudySeconds / 60),
    averageStudyMinutes: averageSessionMinutes,
    averageSessionMinutes,
    sessionCount: periodSessions.length,
    bestDay: rankedDays[0] ?? null,
    worstDay: rankedDays[rankedDays.length - 1] ?? null,
    currentStreak,
    longestStreak,
    periodChange:
      previousAverage > 0
        ? ((averageCompletion - previousAverage) / previousAverage) * 100
        : 0,
  };
}

function dailyChartPoints(
  sessions: FocusSession[],
  period: Exclude<AnalyticsPeriod, "3months">,
  referenceDate: Date
): ChartPoint[] {
  const dates = getDatesForPeriod(period, referenceDate);
  return dates.map((date, index) => {
    const dateKey = toLocalDateKey(date);
    const seconds = sessions
      .filter((session) => sessionDateKey(session) === dateKey)
      .reduce((sum, session) => sum + session.duration, 0);
    let label = "TODAY";
    if (period === "week") {
      label = date.toLocaleDateString("en", { weekday: "short" }).toUpperCase();
    } else if (period === "month") {
      label = index % 5 === 0 || index === dates.length - 1 ? `${date.getDate()}` : "";
    }
    return { label, value: Math.round(seconds / 60) };
  });
}

export function buildStudyChartData(
  sessions: FocusSession[],
  period: AnalyticsPeriod,
  referenceDate = new Date()
): ChartPoint[] {
  if (period !== "3months") {
    return dailyChartPoints(sessions, period, referenceDate);
  }

  const today = atLocalMidnight(referenceDate);
  return Array.from({ length: 13 }, (_, index) => {
    const weeksAgo = 12 - index;
    const end = addCalendarDays(today, -weeksAgo * 7);
    const start = addCalendarDays(end, -6);
    const startKey = toLocalDateKey(start);
    const endKey = toLocalDateKey(end);
    const seconds = sessions
      .filter((session) => {
        const dateKey = sessionDateKey(session);
        return dateKey !== null && dateKey >= startKey && dateKey <= endKey;
      })
      .reduce((sum, session) => sum + session.duration, 0);

    return {
      label:
        index % 2 === 0 || index === 12
          ? start.toLocaleDateString("en", { month: "short", day: "numeric" })
          : "",
      value: Math.round(seconds / 60),
    };
  });
}

export function calculateHabitStats(habit: Habit): HabitStats {
  const completedDays = Object.entries(habit.completionHistory ?? {})
    .filter(([, completed]) => completed)
    .map(([dateKey]) => dateKey)
    .sort((a, b) => b.localeCompare(a));
  const todayKey = toLocalDateKey();
  const finalKey = habit.archivedOn
    ? toLocalDateKey(addCalendarDays(fromLocalDateKey(habit.archivedOn), -1))
    : todayKey;
  const activeDays =
    finalKey >= habit.startsOn
      ? Math.floor(
          (fromLocalDateKey(finalKey).getTime() -
            fromLocalDateKey(habit.startsOn).getTime()) /
            86_400_000
        ) + 1
      : 0;
  const { currentStreak, longestStreak } = calculateStreaks([habit]);

  return {
    habitId: habit.id,
    name: habit.title,
    icon: habit.icon,
    completionRate:
      activeDays > 0
        ? Math.min(100, (completedDays.length / activeDays) * 100)
        : 0,
    currentStreak,
    longestStreak,
    totalCompletions: completedDays.length,
    lastCompleted: completedDays[0] ?? null,
  };
}

export function generateInsights(
  habits: Habit[],
  _sessions: FocusSession[] = [],
  periodStats: PeriodStats
): string[] {
  const insights: string[] = [];
  const bestHabit = habits
    .map(calculateHabitStats)
    .sort((a, b) => b.completionRate - a.completionRate)[0];

  if (bestHabit && bestHabit.completionRate > 70) {
    insights.push(
      `${bestHabit.name} is your strongest habit at ${Math.round(
        bestHabit.completionRate
      )}% completion.`
    );
  }
  if (periodStats.currentStreak > 3) {
    insights.push(`Your active streak is ${periodStats.currentStreak} days.`);
  }
  if (periodStats.averageSessionMinutes >= 60) {
    insights.push(
      `Your average focus session is ${Math.round(
        periodStats.averageSessionMinutes
      )} minutes.`
    );
  }
  if (periodStats.periodChange > 10) {
    insights.push(
      `Habit completion improved ${Math.round(periodStats.periodChange)}% over the previous period.`
    );
  }
  return insights;
}

export function getHabitHeatmapData(
  habit: Habit,
  weeks = 12
): number[][] {
  const today = atLocalMidnight(new Date());
  const startOfWeek = addCalendarDays(today, -today.getDay());
  return Array.from({ length: weeks }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) => {
      const weeksAgo = weeks - weekIndex - 1;
      const date = addCalendarDays(startOfWeek, dayIndex - weeksAgo * 7);
      return habit.completionHistory?.[toLocalDateKey(date)] ? 4 : 0;
    })
  );
}

export { calculateStreaks };
