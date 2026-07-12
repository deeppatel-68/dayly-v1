// Pure leaderboard logic: week boundaries, ranking, and display formatting.
// Kept free of React/Supabase so it is fully unit-testable.

import type {
  LeaderboardMetric,
  LeaderboardRow,
  RankedLeaderboardRow,
} from "@/types/friends";
import { getLevelProgress } from "@/utils/xp";

// Monday of the week containing the given local dateKey (YYYY-MM-DD).
// Mirrors the SQL in get_friends_leaderboard:
//   week_start = local_today - (isodow - 1)
export function mondayOf(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  // Noon UTC avoids any date rollover from DST/timezone math.
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  const isoDow = date.getUTCDay() === 0 ? 7 : date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - (isoDow - 1));
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate()
  )}`;
}

export function metricValue(
  row: LeaderboardRow,
  metric: LeaderboardMetric
): number {
  switch (metric) {
    case "weeklyXp":
      return row.weeklyXp;
    case "streak":
      return row.currentStreak;
    case "weeklyFocus":
      return row.weeklyFocusSeconds;
    case "allTime":
      return row.totalXp;
  }
}

// Sort desc by metric with username tiebreak; ties share a rank
// (standard competition ranking: 1, 1, 3).
export function rankLeaderboard(
  rows: LeaderboardRow[],
  metric: LeaderboardMetric
): RankedLeaderboardRow[] {
  const sorted = [...rows].sort((a, b) => {
    const diff = metricValue(b, metric) - metricValue(a, metric);
    if (diff !== 0) return diff;
    return a.username.localeCompare(b.username);
  });

  let previousValue: number | null = null;
  let previousRank = 0;
  return sorted.map((row, index) => {
    const value = metricValue(row, metric);
    const rank = value === previousValue ? previousRank : index + 1;
    previousValue = value;
    previousRank = rank;
    return { rank, row };
  });
}

export function formatFocusDuration(seconds: number): string {
  const totalMinutes = Math.floor(Math.max(0, seconds) / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function formatMetricValue(
  row: LeaderboardRow,
  metric: LeaderboardMetric
): string {
  switch (metric) {
    case "weeklyXp":
      return `${row.weeklyXp} XP`;
    case "streak":
      return `${row.currentStreak}d`;
    case "weeklyFocus":
      return formatFocusDuration(row.weeklyFocusSeconds);
    case "allTime":
      return `Lv ${getLevelProgress(row.totalXp).level}`;
  }
}

// Ionicons glyph for the equipped accessory shown on a CompanionBadge.
export function companionGlyphFor(accessoryId: string | null): string | null {
  switch (accessoryId) {
    case "focus-cap":
      return "school";
    case "study-glasses":
      return "glasses";
    case "neon-headphones":
      return "headset";
    default:
      return null;
  }
}
