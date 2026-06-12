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

function normalizeProgress(row: Partial<UserProgress> & { user_id: string }): UserProgress {
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
    return cached ? normalizeProgress(JSON.parse(cached)) : null;
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

  return persistAndPublish(normalizeProgress(data as UserProgress));
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

  return persistAndPublish(normalizeProgress(data as UserProgress));
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

  await persistAndPublish(normalizeProgress(data as UserProgress));
  return true;
}

export async function awardXpOnce(
  userId: string,
  input: XpAwardInput
): Promise<{ awarded: boolean; progress: UserProgress | null }> {
  const amount = input.amount ?? XP_PER_HABIT_COMPLETION;
  const coins = input.coins ?? COINS_PER_HABIT_COMPLETION;

  if (amount <= 0) return { awarded: false, progress: null };

  const { error } = await supabase.from("xp_awards").insert({
    user_id: userId,
    source_type: input.sourceType,
    source_id: input.sourceId,
    award_date: input.awardDate,
    amount,
  });

  if (error) {
    if (error.code === "23505") {
      return { awarded: false, progress: null };
    }
    throw error;
  }

  const progress = await incrementUserProgress(userId, {
    xp: amount,
    coins,
    completedHabits: input.sourceType === "habit" ? 1 : 0,
  });

  return { awarded: true, progress };
}
