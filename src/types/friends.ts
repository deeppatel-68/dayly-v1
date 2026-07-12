// Friend system domain types. Shapes mirror the RPCs in
// supabase/migrations/20260712000000_friends.sql.

export type FriendshipStatus = "pending" | "accepted";

// Relationship between the current user and another user, from the
// current user's perspective.
export type FriendRelationship = "none" | "friends" | "pending_out" | "pending_in";

// Companion appearance snapshot for rendering a friend's 2D badge.
export interface CompanionAppearance {
  bodyColor: string | null;
  accentColor: string | null;
  accessoryId: string | null;
}

export interface FriendSummary {
  userId: string;
  username: string;
  companion: CompanionAppearance;
  xp: number;
  currentStreak: number;
}

export interface FriendRequestEntry {
  friendshipId: string;
  userId: string;
  username: string;
}

export interface FriendsOverview {
  friends: FriendSummary[];
  pendingIn: FriendRequestEntry[];
  pendingOut: FriendRequestEntry[];
}

export interface UserSearchResult {
  userId: string;
  username: string;
  relationship: FriendRelationship;
}

export type LeaderboardMetric =
  | "weeklyXp"
  | "streak"
  | "weeklyFocus"
  | "allTime";

export interface LeaderboardRow {
  userId: string;
  username: string;
  isSelf: boolean;
  companion: CompanionAppearance;
  totalXp: number;
  currentStreak: number;
  weeklyXp: number;
  weeklyFocusSeconds: number;
}

export interface RankedLeaderboardRow {
  rank: number;
  row: LeaderboardRow;
}

export const EMPTY_FRIENDS_OVERVIEW: FriendsOverview = {
  friends: [],
  pendingIn: [],
  pendingOut: [],
};
