import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { COINS_PER_HABIT_COMPLETION, XP_PER_HABIT_COMPLETION } from "@/utils/xp";

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

export interface ProgressDelta {
  xp?: number;
  coins?: number;
  focusSeconds?: number;
  completedHabits?: number;
  currentStreak?: number;
  bestStreak?: number;
}

export interface XpAwardInput {
  sourceType: string;
  sourceId: string;
  awardDate: string;
  amount?: number;
  coins?: number;
}

export interface RewardResult {
  awarded: boolean;
  xp: number;
  coins: number;
  progress: UserProgress | null;
}

export interface HabitRewardResult extends RewardResult {
  completionId: string;
}

const PROGRESS_COLUMNS =
  "user_id,xp,coins,current_streak,best_streak,total_focus_seconds,total_completed_habits,created_at,updated_at";

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

export function normalizeUserProgress(row: Partial<UserProgress> & { user_id: string }): UserProgress {
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

async function cacheProgress(progress: UserProgress) {
  try {
    await AsyncStorage.setItem(progressCacheKey(progress.user_id), JSON.stringify(progress));
  } catch (error) {
    console.error("Error caching progress:", error);
  }
}

async function loadCachedProgress(userId: string): Promise<UserProgress | null> {
  try {
    const cached = await AsyncStorage.getItem(progressCacheKey(userId));
    return cached ? normalizeUserProgress(JSON.parse(cached)) : null;
  } catch (error) {
    console.error("Error loading cached progress:", error);
    return null;
  }
}

async function persistAndPublish(progress: UserProgress): Promise<UserProgress> {
  await cacheProgress(progress);
  publishProgress(progress);
  return progress;
}

export async function syncUserProgress(progress: UserProgress): Promise<UserProgress> {
  return persistAndPublish(progress);
}

export async function getUserProgress(userId: string): Promise<UserProgress> {
  const { data, error } = await supabase
    .from("user_progress")
    .upsert({ user_id: userId }, { onConflict: "user_id" })
    .select(PROGRESS_COLUMNS)
    .single();

  if (error) {
    const cached = await loadCachedProgress(userId);
    if (cached) return cached;
    throw error;
  }

  return persistAndPublish(normalizeUserProgress(data as UserProgress));
}

export async function incrementUserProgress(
  userId: string,
  delta: ProgressDelta
): Promise<UserProgress> {
  const { data, error } = await supabase
    .rpc("increment_user_progress", {
      p_user_id: userId,
      p_xp: delta.xp ?? 0,
      p_coins: delta.coins ?? 0,
      p_focus_seconds: delta.focusSeconds ?? 0,
      p_completed_habits: delta.completedHabits ?? 0,
      p_current_streak: delta.currentStreak ?? null,
      p_best_streak: delta.bestStreak ?? null,
    })
    .single();

  if (error) throw error;

  return persistAndPublish(normalizeUserProgress(data as UserProgress));
}

export async function addXp(userId: string, amount: number): Promise<UserProgress | null> {
  if (amount <= 0) return null;
  return incrementUserProgress(userId, { xp: amount });
}

export async function addCoins(
  userId: string,
  amount: number
): Promise<UserProgress | null> {
  if (amount <= 0) return null;
  return incrementUserProgress(userId, { coins: amount });
}

export async function spendCoins(userId: string, amount: number): Promise<boolean> {
  if (amount <= 0) return true;

  const { data, error } = await supabase
    .rpc("spend_user_coins", {
      p_user_id: userId,
      p_amount: amount,
    })
    .single();

  if (error) {
    if (error.message?.toLowerCase().includes("insufficient")) return false;
    throw error;
  }

  await persistAndPublish(normalizeUserProgress(data as UserProgress));
  return true;
}

function normalizeRpcProgress(row: {
  progress_user_id: string;
  progress_xp: number;
  progress_coins: number;
  progress_current_streak: number;
  progress_best_streak: number;
  progress_total_focus_seconds: number;
  progress_total_completed_habits: number;
  progress_updated_at?: string;
}): UserProgress {
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

export async function completeHabitWithReward(
  userId: string,
  habitId: string,
  dateKey: string,
  amount = XP_PER_HABIT_COMPLETION,
  coins = COINS_PER_HABIT_COMPLETION
): Promise<HabitRewardResult> {
  const { data, error } = await supabase
    .rpc("complete_habit_with_reward", {
      p_user_id: userId,
      p_habit_id: habitId,
      p_completed_at: dateKey,
      p_xp: amount,
      p_coins: coins,
    })
    .single();

  if (error) throw error;

  const row = data as {
    completion_id: string;
    awarded: boolean;
    progress_user_id: string;
    progress_xp: number;
    progress_coins: number;
    progress_current_streak: number;
    progress_best_streak: number;
    progress_total_focus_seconds: number;
    progress_total_completed_habits: number;
    progress_updated_at?: string;
  };
  const progress = await persistAndPublish(normalizeRpcProgress(row));

  return {
    completionId: row.completion_id,
    awarded: row.awarded,
    xp: row.awarded ? amount : 0,
    coins: row.awarded ? coins : 0,
    progress,
  };
}

export async function awardXpOnce(
  userId: string,
  input: XpAwardInput
): Promise<RewardResult> {
  const amount = input.amount ?? XP_PER_HABIT_COMPLETION;
  const coins = input.coins ?? COINS_PER_HABIT_COMPLETION;

  if (amount <= 0) return { awarded: false, xp: 0, coins: 0, progress: null };

  const { error } = await supabase.from("xp_awards").insert({
    user_id: userId,
    source_type: input.sourceType,
    source_id: input.sourceId,
    award_date: input.awardDate,
    amount,
  });

  if (error) {
    if (error.code === "23505") {
      return { awarded: false, xp: 0, coins: 0, progress: null };
    }
    throw error;
  }

  const progress = await incrementUserProgress(userId, {
    xp: amount,
    coins,
    completedHabits: input.sourceType === "habit" ? 1 : 0,
  });

  return { awarded: true, xp: amount, coins, progress };
}
