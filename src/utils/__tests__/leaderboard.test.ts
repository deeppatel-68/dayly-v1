import { describe, expect, it } from "vitest";
import {
  companionGlyphFor,
  formatFocusDuration,
  formatMetricValue,
  mondayOf,
  rankLeaderboard,
} from "@/utils/leaderboard";
import type { LeaderboardRow } from "@/types/friends";

const row = (overrides: Partial<LeaderboardRow>): LeaderboardRow => ({
  userId: "u",
  username: "user",
  isSelf: false,
  companion: { bodyColor: null, accentColor: null, accessoryId: null },
  totalXp: 0,
  currentStreak: 0,
  weeklyXp: 0,
  weeklyFocusSeconds: 0,
  ...overrides,
});

describe("mondayOf", () => {
  it("returns the same day for a Monday", () => {
    expect(mondayOf("2026-07-06")).toBe("2026-07-06");
  });

  it("maps a Sunday back to the previous Monday", () => {
    expect(mondayOf("2026-07-12")).toBe("2026-07-06");
  });

  it("maps mid-week days to their Monday", () => {
    expect(mondayOf("2026-07-09")).toBe("2026-07-06"); // Thursday
    expect(mondayOf("2026-07-11")).toBe("2026-07-06"); // Saturday
  });

  it("crosses month boundaries", () => {
    expect(mondayOf("2026-08-01")).toBe("2026-07-27");
  });

  it("crosses year boundaries", () => {
    expect(mondayOf("2026-01-01")).toBe("2025-12-29");
  });
});

describe("rankLeaderboard", () => {
  it("sorts descending by the chosen metric", () => {
    const ranked = rankLeaderboard(
      [
        row({ username: "alice", weeklyXp: 10 }),
        row({ username: "bob", weeklyXp: 30 }),
        row({ username: "cara", weeklyXp: 20 }),
      ],
      "weeklyXp"
    );
    expect(ranked.map((r) => r.row.username)).toEqual([
      "bob",
      "cara",
      "alice",
    ]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("gives tied values the same rank and skips the next", () => {
    const ranked = rankLeaderboard(
      [
        row({ username: "alice", currentStreak: 5 }),
        row({ username: "bob", currentStreak: 7 }),
        row({ username: "cara", currentStreak: 7 }),
      ],
      "streak"
    );
    expect(ranked.map((r) => r.rank)).toEqual([1, 1, 3]);
    // Tie broken alphabetically for display order
    expect(ranked.map((r) => r.row.username)).toEqual([
      "bob",
      "cara",
      "alice",
    ]);
  });

  it("ranks each metric independently", () => {
    const rows = [
      row({ username: "alice", totalXp: 900, weeklyFocusSeconds: 60 }),
      row({ username: "bob", totalXp: 100, weeklyFocusSeconds: 7200 }),
    ];
    expect(rankLeaderboard(rows, "allTime")[0].row.username).toBe("alice");
    expect(rankLeaderboard(rows, "weeklyFocus")[0].row.username).toBe("bob");
  });

  it("does not mutate the input array", () => {
    const rows = [
      row({ username: "alice", weeklyXp: 1 }),
      row({ username: "bob", weeklyXp: 2 }),
    ];
    rankLeaderboard(rows, "weeklyXp");
    expect(rows[0].username).toBe("alice");
  });
});

describe("formatting", () => {
  it("formats focus durations", () => {
    expect(formatFocusDuration(0)).toBe("0m");
    expect(formatFocusDuration(59)).toBe("0m");
    expect(formatFocusDuration(60 * 25)).toBe("25m");
    expect(formatFocusDuration(3600)).toBe("1h");
    expect(formatFocusDuration(3600 * 3 + 60 * 20)).toBe("3h 20m");
  });

  it("formats each metric", () => {
    const r = row({
      weeklyXp: 120,
      currentStreak: 6,
      weeklyFocusSeconds: 5400,
      totalXp: 300, // levels 1+2 cost 100+200 → exactly level 3
    });
    expect(formatMetricValue(r, "weeklyXp")).toBe("120 XP");
    expect(formatMetricValue(r, "streak")).toBe("6d");
    expect(formatMetricValue(r, "weeklyFocus")).toBe("1h 30m");
    expect(formatMetricValue(r, "allTime")).toBe("Lv 3");
  });
});

describe("companionGlyphFor", () => {
  it("maps known accessories to glyphs", () => {
    expect(companionGlyphFor("focus-cap")).toBe("school");
    expect(companionGlyphFor("study-glasses")).toBe("glasses");
    expect(companionGlyphFor("neon-headphones")).toBe("headset");
  });

  it("falls back to null for unknown or missing accessories", () => {
    expect(companionGlyphFor("gaming-desk")).toBeNull();
    expect(companionGlyphFor(null)).toBeNull();
  });
});
