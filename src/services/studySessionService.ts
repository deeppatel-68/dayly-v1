import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { incrementUserProgress } from "@/services/progressService";
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
): Promise<StudySession> {
  const endedAt = session.endedAt ?? new Date().toISOString();
  const { data, error } = await supabase
    .from("study_sessions")
    .insert({
      user_id: userId,
      duration_seconds: session.duration,
      xp: session.xp,
      coins: session.coins,
      ended_at: endedAt,
    })
    .select(SESSION_COLUMNS)
    .single();

  if (error) throw error;

  const savedSession = normalizeSession(data);
  await incrementUserProgress(userId, {
    xp: session.xp,
    coins: session.coins,
    focusSeconds: session.duration,
  });

  const cached = await loadCachedSessions(userId);
  await cacheSessions(userId, [savedSession, ...cached].slice(0, 200));

  return savedSession;
}
