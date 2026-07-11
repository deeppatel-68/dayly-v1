import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { toLocalDateKey } from "@/utils/dateKey";
import { isNetworkRequestError } from "@/utils/supabaseErrors";

export interface UserProgress {
  user_id: string;
  xp: number;
  coins: number;
  current_streak: number;
  best_streak: number;
  total_focus_seconds: number;
  total_completed_habits: number;
  created_at?: string;
  updated_at?: string;
}

export interface HabitRewardResult {
  completionId: string | null;
  awarded: boolean;
  xp: number;
  coins: number;
  progress: UserProgress;
}

interface RpcProgressRow {
  progress_user_id: string;
  progress_xp: number;
  progress_coins: number;
  progress_current_streak: number;
  progress_best_streak: number;
  progress_total_focus_seconds: number;
  progress_total_completed_habits: number;
  progress_updated_at?: string;
}

const progressCacheKey = (userId: string) => `@progress_cache:${userId}`;

type ProgressListener = (progress: UserProgress) => void;
const listeners = new Set<ProgressListener>();

export function subscribeToProgress(listener: ProgressListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function publishProgress(progress: UserProgress) {
  listeners.forEach((listener) => listener(progress));
}

export function normalizeUserProgress(
  row: Partial<UserProgress> & { user_id: string }
): UserProgress {
  return {
    user_id: row.user_id,
    xp: row.xp ?? 0,
    coins: row.coins ?? 100,
    current_streak: row.current_streak ?? 0,
    best_streak: row.best_streak ?? 0,
    total_focus_seconds: row.total_focus_seconds ?? 0,
    total_completed_habits: row.total_completed_habits ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function normalizeRpcProgress(row: RpcProgressRow): UserProgress {
  return normalizeUserProgress({
    user_id: row.progress_user_id,
    xp: row.progress_xp,
    coins: row.progress_coins,
    current_streak: row.progress_current_streak,
    best_streak: row.progress_best_streak,
    total_focus_seconds: row.progress_total_focus_seconds,
    total_completed_habits: row.progress_total_completed_habits,
    updated_at: row.progress_updated_at,
  });
}

async function cacheProgress(progress: UserProgress) {
  try {
    await AsyncStorage.setItem(
      progressCacheKey(progress.user_id),
      JSON.stringify(progress)
    );
  } catch (error) {
    console.warn("Could not cache user progress", error);
  }
}

async function loadCachedProgress(userId: string): Promise<UserProgress | null> {
  try {
    const cached = await AsyncStorage.getItem(progressCacheKey(userId));
    return cached ? normalizeUserProgress(JSON.parse(cached)) : null;
  } catch (error) {
    console.warn("Could not load cached user progress", error);
    return null;
  }
}

export async function syncUserProgress(
  progress: UserProgress
): Promise<UserProgress> {
  await cacheProgress(progress);
  publishProgress(progress);
  return progress;
}

export async function getUserProgress(userId: string): Promise<UserProgress> {
  try {
    const { data, error } = await supabase
      .rpc("get_user_progress", { p_local_today: toLocalDateKey() })
      .single();

    if (error) throw error;
    return syncUserProgress(normalizeUserProgress(data as UserProgress));
  } catch (error) {
    if (!isNetworkRequestError(error)) throw error;
    const cached = await loadCachedProgress(userId);
    if (cached) {
      publishProgress(cached);
      return cached;
    }
    return normalizeUserProgress({ user_id: userId });
  }
}
