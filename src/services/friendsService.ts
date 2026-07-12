import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { toLocalDateKey } from "@/utils/dateKey";
import {
  isMissingBackendObjectError,
  isNetworkRequestError,
} from "@/utils/supabaseErrors";
import {
  EMPTY_FRIENDS_OVERVIEW,
  FriendsOverview,
  FriendRelationship,
  LeaderboardRow,
  UserSearchResult,
} from "@/types/friends";

// Friend system access. All cross-user reads go through security-definer
// RPCs (supabase/migrations/20260712000000_friends.sql); this service adds
// the app conventions: AsyncStorage cache, pub/sub, and graceful
// degradation when offline or when the migration isn't applied yet.

interface OverviewRpcRow {
  kind: "friend" | "pending_in" | "pending_out";
  friendship_id: string;
  user_id: string;
  username: string | null;
  body_color: string | null;
  accent_color: string | null;
  equipped_accessory_id: string | null;
  xp: number | null;
  current_streak: number | null;
}

interface LeaderboardRpcRow {
  user_id: string;
  username: string | null;
  is_self: boolean;
  body_color: string | null;
  accent_color: string | null;
  equipped_accessory_id: string | null;
  total_xp: number | null;
  current_streak: number | null;
  weekly_xp: number | null;
  weekly_focus_seconds: number | null;
}

const friendsCacheKey = (userId: string) => `@friends_cache:${userId}`;
const leaderboardCacheKey = (userId: string) =>
  `@friends_leaderboard_cache:${userId}`;

type FriendsListener = (overview: FriendsOverview) => void;
const listeners = new Set<FriendsListener>();
let warnedUnavailable = false;

export function subscribeToFriends(listener: FriendsListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function publishOverview(overview: FriendsOverview) {
  listeners.forEach((listener) => listener(overview));
}

function isFriendsUnavailableError(error: unknown): boolean {
  if (isNetworkRequestError(error)) return true;
  if (isMissingBackendObjectError(error)) {
    if (!warnedUnavailable) {
      warnedUnavailable = true;
      console.warn(
        "friendsService: friends migration not applied; social features disabled."
      );
    }
    return true;
  }
  return false;
}

export function normalizeFriendsOverview(
  rows: OverviewRpcRow[]
): FriendsOverview {
  const overview: FriendsOverview = {
    friends: [],
    pendingIn: [],
    pendingOut: [],
  };
  for (const row of rows) {
    const username = row.username ?? "unknown";
    if (row.kind === "friend") {
      overview.friends.push({
        userId: row.user_id,
        username,
        companion: {
          bodyColor: row.body_color,
          accentColor: row.accent_color,
          accessoryId: row.equipped_accessory_id,
        },
        xp: row.xp ?? 0,
        currentStreak: row.current_streak ?? 0,
      });
    } else {
      const entry = {
        friendshipId: row.friendship_id,
        userId: row.user_id,
        username,
      };
      if (row.kind === "pending_in") overview.pendingIn.push(entry);
      else overview.pendingOut.push(entry);
    }
  }
  return overview;
}

export function normalizeLeaderboardRow(row: LeaderboardRpcRow): LeaderboardRow {
  return {
    userId: row.user_id,
    username: row.username ?? "unknown",
    isSelf: row.is_self,
    companion: {
      bodyColor: row.body_color,
      accentColor: row.accent_color,
      accessoryId: row.equipped_accessory_id,
    },
    totalXp: row.total_xp ?? 0,
    currentStreak: row.current_streak ?? 0,
    weeklyXp: row.weekly_xp ?? 0,
    weeklyFocusSeconds: row.weekly_focus_seconds ?? 0,
  };
}

async function cacheJson(key: string, value: unknown) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("Could not cache friends data", error);
  }
}

async function loadCachedJson<T>(key: string): Promise<T | null> {
  try {
    const cached = await AsyncStorage.getItem(key);
    return cached ? (JSON.parse(cached) as T) : null;
  } catch (error) {
    console.warn("Could not load cached friends data", error);
    return null;
  }
}

export async function getFriendsOverview(
  userId: string
): Promise<FriendsOverview> {
  try {
    const { data, error } = await supabase.rpc("get_friends_overview");
    if (error) throw error;
    const overview = normalizeFriendsOverview((data ?? []) as OverviewRpcRow[]);
    await cacheJson(friendsCacheKey(userId), overview);
    publishOverview(overview);
    return overview;
  } catch (error) {
    if (!isFriendsUnavailableError(error)) throw error;
    const cached = await loadCachedJson<FriendsOverview>(
      friendsCacheKey(userId)
    );
    return cached ?? EMPTY_FRIENDS_OVERVIEW;
  }
}

export async function getLeaderboard(
  userId: string
): Promise<LeaderboardRow[]> {
  try {
    const { data, error } = await supabase.rpc("get_friends_leaderboard", {
      p_local_today: toLocalDateKey(),
    });
    if (error) throw error;
    const rows = ((data ?? []) as LeaderboardRpcRow[]).map(
      normalizeLeaderboardRow
    );
    await cacheJson(leaderboardCacheKey(userId), rows);
    return rows;
  } catch (error) {
    if (!isFriendsUnavailableError(error)) throw error;
    const cached = await loadCachedJson<LeaderboardRow[]>(
      leaderboardCacheKey(userId)
    );
    return cached ?? [];
  }
}

// Human-readable messages for the RPCs' typed errors
const RPC_ERROR_MESSAGES: Record<string, string> = {
  user_not_found: "No user found with that username",
  code_not_found: "That friend code doesn't match anyone",
  cannot_friend_self: "That's your own account",
  already_friends: "You're already friends",
  request_already_exists: "Request already sent",
  request_not_found: "This request is no longer available",
};

function toFriendlyError(error: unknown): Error {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : "";
  for (const [token, friendly] of Object.entries(RPC_ERROR_MESSAGES)) {
    if (message.includes(token)) return new Error(friendly);
  }
  return error instanceof Error ? error : new Error("Something went wrong");
}

async function refreshAfterMutation(userId: string) {
  try {
    await getFriendsOverview(userId);
  } catch {
    // Mutation succeeded; a refresh failure shouldn't surface as an error.
  }
}

export async function sendFriendRequest(
  userId: string,
  username: string
): Promise<void> {
  const { error } = await supabase.rpc("send_friend_request", {
    p_username: username,
  });
  if (error) throw toFriendlyError(error);
  await refreshAfterMutation(userId);
}

export async function respondToRequest(
  userId: string,
  friendshipId: string,
  accept: boolean
): Promise<void> {
  const { error } = await supabase.rpc("respond_friend_request", {
    p_friendship_id: friendshipId,
    p_accept: accept,
  });
  if (error) throw toFriendlyError(error);
  await refreshAfterMutation(userId);
}

export async function addFriendByCode(
  userId: string,
  code: string
): Promise<void> {
  const { error } = await supabase.rpc("add_friend_by_code", {
    p_code: code,
  });
  if (error) throw toFriendlyError(error);
  await refreshAfterMutation(userId);
}

export async function removeFriend(
  userId: string,
  friendUserId: string
): Promise<void> {
  const { error } = await supabase.rpc("remove_friend", {
    p_friend_user_id: friendUserId,
  });
  if (error) throw toFriendlyError(error);
  await refreshAfterMutation(userId);
}

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  try {
    const { data, error } = await supabase.rpc("search_users", {
      p_query: trimmed,
    });
    if (error) throw error;
    return ((data ?? []) as {
      user_id: string;
      username: string | null;
      relationship: string;
    }[]).map((row) => ({
      userId: row.user_id,
      username: row.username ?? "unknown",
      relationship: (row.relationship ?? "none") as FriendRelationship,
    }));
  } catch (error) {
    if (isFriendsUnavailableError(error)) return [];
    throw error;
  }
}

export interface MyFriendProfile {
  username: string | null;
  friendCode: string | null;
}

export async function getMyFriendProfile(
  userId: string
): Promise<MyFriendProfile> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("username, friend_code")
      .eq("id", userId)
      .single();
    if (error) throw error;
    return {
      username: data?.username ?? null,
      friendCode: data?.friend_code ?? null,
    };
  } catch (error) {
    if (isFriendsUnavailableError(error)) {
      return { username: null, friendCode: null };
    }
    throw error;
  }
}
