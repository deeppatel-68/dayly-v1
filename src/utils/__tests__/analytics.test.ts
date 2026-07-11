import { describe, expect, it } from "vitest";
import {
  buildStudyChartData,
  calculatePeriodStats,
  FocusSession,
} from "@/utils/analytics";

const reference = new Date("2026-07-11T02:00:00.000Z");

function session(id: string, duration: number, endedAt: string): FocusSession {
  return { id, duration, endedAt };
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
