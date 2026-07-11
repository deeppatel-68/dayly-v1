import { describe, expect, it } from "vitest";
import { Habit } from "@/types/habits";
import { fromLocalDateKey } from "@/utils/dateKey";
import { calculateStreaks } from "@/utils/progression";

function habit(
  id: string,
  startsOn: string,
  completedDates: string[],
  archivedOn?: string
): Habit {
  return {
    id,
    user_id: "user-1",
    title: id,
    completed: false,
    createdAt: `${startsOn}T00:00:00.000Z`,
    startsOn,
    archivedOn,
    completionHistory: Object.fromEntries(
      completedDates.map((dateKey) => [dateKey, true])
    ),
    target_count: 1,
    icon: "book",
    color: "#ffffff",
    frequency: "daily",
  };
}

describe("all-active-habits streaks", () => {
  const today = fromLocalDateKey("2026-07-11");

  it("preserves yesterday's streak while today is incomplete", () => {
    const result = calculateStreaks(
      [habit("read", "2026-07-08", ["2026-07-09", "2026-07-10"])],
      today
    );

    expect(result).toEqual({ currentStreak: 2, longestStreak: 2 });
  });

  it("requires a newly created habit starting today without breaking grace", () => {
    const result = calculateStreaks(
      [
        habit("read", "2026-07-08", ["2026-07-09", "2026-07-10"]),
        habit("walk", "2026-07-11", []),
      ],
      today
    );

    expect(result.currentStreak).toBe(2);
  });

  it("excludes a habit from its archive date onward", () => {
    const result = calculateStreaks(
      [
        habit(
          "read",
          "2026-07-09",
          ["2026-07-09", "2026-07-10", "2026-07-11"]
        ),
        habit("walk", "2026-07-09", ["2026-07-09"], "2026-07-10"),
      ],
      today
    );

    expect(result).toEqual({ currentStreak: 3, longestStreak: 3 });
  });

  it("drops the current streak after yesterday ends incomplete", () => {
    const result = calculateStreaks(
      [habit("read", "2026-07-08", ["2026-07-08", "2026-07-09"])],
      today
    );

    expect(result).toEqual({ currentStreak: 0, longestStreak: 2 });
  });
});
