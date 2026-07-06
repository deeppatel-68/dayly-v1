import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import {
  normalizeUserProgress,
  syncUserProgress,
  UserProgress,
} from "@/services/progressService";
import { FocusSession } from "@/utils/analytics";

export interface StudySession extends FocusSession {
  xp: number;
  coins: number;
}

export interface StudySessionInput {
  duration: number;
  xp: number;
  coins: number;
  endedAt?: string;
}

export interface StudySessionRewardResult {
  session: StudySession;
  progress: UserProgress;
  xp: number;
  coins: number;
}

const SESSION_COLUMNS = "id,user_id,duration_seconds,xp,coins,ended_at,created_at,updated_at";
const sessionCacheKey = (userId: string) => `@study_sessions_cache:${userId}`;
const legacySessionKey = (userId: string) => `@study_sessions:${userId}`;

function normalizeSession(row: {
  id: string;
  duration_seconds?: number;
  duration?: number;
  ended_at?: string;
  endedAt?: string;
  xp?: number;
  coins?: number;
}): StudySession {
  return {
    id: row.id,
    duration: row.duration_seconds ?? row.duration ?? 0,
    endedAt: row.ended_at ?? row.endedAt ?? new Date().toISOString(),
    xp: row.xp ?? 0,
    coins: row.coins ?? 0,
  };
}

async function cacheSessions(userId: string, sessions: StudySession[]) {
  try {
    await AsyncStorage.setItem(sessionCacheKey(userId), JSON.stringify(sessions));
  } catch (error) {
    console.error("Error caching study sessions:", error);
  }
}

async function loadCachedSessions(userId: string): Promise<StudySession[]> {
  try {
    const cached =
      (await AsyncStorage.getItem(sessionCacheKey(userId))) ??
      (await AsyncStorage.getItem(legacySessionKey(userId)));
    return cached ? (JSON.parse(cached) as StudySession[]).map(normalizeSession) : [];
  } catch (error) {
    console.error("Error loading cached study sessions:", error);
    return [];
  }
}

export async function loadStudySessions(userId: string): Promise<StudySession[]> {
  const { data, error } = await supabase
    .from("study_sessions")
    .select(SESSION_COLUMNS)
    .eq("user_id", userId)
    .order("ended_at", { ascending: false })
    .limit(200);

  if (error) return loadCachedSessions(userId);

  const sessions = (data ?? []).map(normalizeSession);
  await cacheSessions(userId, sessions);
  return sessions;
}

export async function recordStudySession(
  userId: string,
  session: StudySessionInput
): Promise<StudySessionRewardResult> {
  const endedAt = session.endedAt ?? new Date().toISOString();
  const { data, error } = await supabase
    .rpc("record_study_session_with_reward", {
      p_user_id: userId,
      p_duration_seconds: session.duration,
      p_xp: session.xp,
      p_coins: session.coins,
      p_ended_at: endedAt,
    })
    .single();

  if (error) throw error;

  const row = data as {
    session_id: string;
    session_duration_seconds: number;
    session_xp: number;
    session_coins: number;
    session_ended_at: string;
    progress_user_id: string;
    progress_xp: number;
    progress_coins: number;
    progress_current_streak: number;
    progress_best_streak: number;
    progress_total_focus_seconds: number;
    progress_total_completed_habits: number;
    progress_updated_at?: string;
  };

  const savedSession = normalizeSession({
    id: row.session_id,
    duration_seconds: row.session_duration_seconds,
    xp: row.session_xp,
    coins: row.session_coins,
    ended_at: row.session_ended_at,
  });
  const progress = await syncUserProgress(
    normalizeUserProgress({
      user_id: row.progress_user_id,
      xp: row.progress_xp,
      coins: row.progress_coins,
      current_streak: row.progress_current_streak,
      best_streak: row.progress_best_streak,
      total_focus_seconds: row.progress_total_focus_seconds,
      total_completed_habits: row.progress_total_completed_habits,
      updated_at: row.progress_updated_at,
    })
  );

  const cached = await loadCachedSessions(userId);
  await cacheSessions(userId, [savedSession, ...cached].slice(0, 200));

  return {
    session: savedSession,
    progress,
    xp: row.session_xp,
    coins: row.session_coins,
  };
}
