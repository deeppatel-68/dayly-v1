import { describe, expect, it } from "vitest";
import {
  buildCompletionChartData,
  buildStudyChartData,
  calculatePeriodStats,
  FocusSession,
  generateInsights,
  PeriodStats,
} from "@/utils/analytics";
import { Habit } from "@/types/habits";
import { toLocalDateKey } from "@/utils/dateKey";

const reference = new Date("2026-07-11T02:00:00.000Z");

function session(id: string, duration: number, endedAt: string): FocusSession {
  return { id, duration, endedAt };
}

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: "h1",
    user_id: "u1",
    title: "Read",
    completed: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    startsOn: "2026-01-01",
    completionHistory: {},
    target_count: 1,
    icon: "book",
    color: "#000",
    frequency: "daily",
    ...overrides,
  };
}

describe("study analytics aggregation", () => {
  const sessions = [
    session("midnight", 1_200, "2026-07-10T14:05:00.000Z"),
    session("today", 600, "2026-07-11T01:00:00.000Z"),
    session("yesterday", 1_800, "2026-07-10T01:00:00.000Z"),
  ];

  it("groups sessions by their local Brisbane completion date", () => {
    const points = buildStudyChartData(sessions, "week", reference);
    expect(points.at(-1)?.value).toBe(30);
    expect(points.at(-2)?.value).toBe(30);
  });

  it("reports average minutes per session instead of average seconds", () => {
    const stats = calculatePeriodStats([], sessions, "week", reference);
    expect(stats.totalStudyMinutes).toBe(60);
    expect(stats.sessionCount).toBe(3);
    expect(stats.averageSessionMinutes).toBe(20);
  });

  it("builds the required point count for every period", () => {
    expect(buildStudyChartData([], "day", reference)).toHaveLength(1);
    expect(buildStudyChartData([], "week", reference)).toHaveLength(7);
    expect(buildStudyChartData([], "month", reference)).toHaveLength(30);
    expect(buildStudyChartData([], "3months", reference)).toHaveLength(13);
  });
});

describe("buildCompletionChartData", () => {
  const todayKey = toLocalDateKey(reference);

  it("reports 100 for a fully completed day", () => {
    const habits = [
      habit({ id: "a", startsOn: "2026-01-01", completionHistory: { [todayKey]: true } }),
    ];
    const points = buildCompletionChartData(habits, "day", reference);
    expect(points).toHaveLength(1);
    expect(points[0].value).toBe(100);
  });

  it("reports a partial percentage when only some active habits are completed", () => {
    const habits = [
      habit({ id: "a", startsOn: "2026-01-01", completionHistory: { [todayKey]: true } }),
      habit({ id: "b", startsOn: "2026-01-01", completionHistory: {} }),
    ];
    const points = buildCompletionChartData(habits, "day", reference);
    expect(points[0].value).toBe(50);
  });

  it("excludes a habit that has not started yet from the denominator", () => {
    const futureStart = toLocalDateKey(new Date(reference.getTime() + 7 * 86_400_000));
    const habits = [
      habit({ id: "a", startsOn: "2026-01-01", completionHistory: { [todayKey]: true } }),
      habit({ id: "b", startsOn: futureStart, completionHistory: {} }),
    ];
    const points = buildCompletionChartData(habits, "day", reference);
    expect(points[0].value).toBe(100);
  });

  it("excludes an archived habit from the denominator on/after its archive date", () => {
    const habits = [
      habit({ id: "a", startsOn: "2026-01-01", completionHistory: { [todayKey]: true } }),
      habit({
        id: "b",
        startsOn: "2026-01-01",
        archivedOn: todayKey,
        completionHistory: {},
      }),
    ];
    const points = buildCompletionChartData(habits, "day", reference);
    expect(points[0].value).toBe(100);
  });

  it("marks days without active habits as unavailable", () => {
    const points = buildCompletionChartData([], "day", reference);
    expect(points[0].value).toBe(0);
    expect(points[0].applicable).toBe(false);
  });

  it("builds the required point count and labels per period", () => {
    expect(buildCompletionChartData([], "day", reference)).toHaveLength(1);
    expect(buildCompletionChartData([], "week", reference)).toHaveLength(7);
    expect(buildCompletionChartData([], "month", reference)).toHaveLength(30);
    const threeMonths = buildCompletionChartData([], "3months", reference);
    expect(threeMonths).toHaveLength(13);
    expect(threeMonths.at(-1)?.label).not.toBe("");
  });
});

describe("generateInsights", () => {
  const basePeriodStats: PeriodStats = {
    totalHabitsCompleted: 0,
    averageCompletion: 0,
    totalStudyMinutes: 0,
    averageSessionMinutes: 0,
    sessionCount: 0,
    bestDay: null,
    worstDay: null,
    currentStreak: 5,
    longestStreak: 5,
    periodChange: 0,
  };

  it("voices the streak insight with the companion name when provided", () => {
    const insights = generateInsights([], [], basePeriodStats, "Momo");
    expect(insights.some((line) => line.includes("Momo"))).toBe(true);
    expect(insights.some((line) => line.includes("5-day streak"))).toBe(true);
  });

  it("stays neutral without a companion name", () => {
    const insights = generateInsights([], [], basePeriodStats);
    expect(insights.some((line) => line.includes("Momo"))).toBe(false);
    expect(insights.some((line) => line.includes("active streak is 5 days"))).toBe(true);
  });

  it("falls back to an encouragement voiced with the name when nothing qualifies", () => {
    const flatStats: PeriodStats = { ...basePeriodStats, currentStreak: 0 };
    const insights = generateInsights([], [], flatStats, "Momo");
    expect(insights).toHaveLength(1);
    expect(insights[0]).toContain("Momo");
  });

  it("falls back to a neutral encouragement when nothing qualifies and no name is given", () => {
    const flatStats: PeriodStats = { ...basePeriodStats, currentStreak: 0 };
    const insights = generateInsights([], [], flatStats);
    expect(insights).toHaveLength(1);
    expect(insights[0]).not.toContain("Momo");
  });
});
