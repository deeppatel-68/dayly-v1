import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import { supabase } from "@/lib/supabase";
import {
  normalizeRpcProgress,
  syncUserProgress,
  UserProgress,
} from "@/services/progressService";
import { FocusSession } from "@/utils/analytics";
import { FocusTimerState } from "@/utils/focusTimerState";
import { isNetworkRequestError } from "@/utils/supabaseErrors";

export type StudySessionStatus = "active" | "completed" | "abandoned";

export interface StudySession extends FocusSession {
  clientSessionId: string;
  startedAt: string;
  xp: number;
  coins: number;
  status: StudySessionStatus;
}

export interface StudySessionRewardResult {
  session: StudySession;
  progress: UserProgress;
  xp: number;
  coins: number;
  newlyCompleted: boolean;
}

interface StudySessionRow {
  id: string;
  client_session_id: string;
  started_at: string;
  duration_seconds: number;
  xp: number;
  coins: number;
  ended_at?: string | null;
  status: StudySessionStatus;
}

const SESSION_COLUMNS =
  "id,user_id,client_session_id,started_at,duration_seconds,xp,coins,ended_at,status,created_at,updated_at";
const sessionCacheKey = (userId: string) => `@study_sessions_cache:${userId}`;
const legacySessionKey = (userId: string) => `@study_sessions:${userId}`;
const timerStateKey = (userId: string) => `@focus_timer_state:${userId}`;

type SessionListener = (sessions: StudySession[]) => void;
const listeners = new Set<SessionListener>();

function normalizeSession(row: Partial<StudySessionRow> & { id: string }): StudySession {
  return {
    id: row.id,
    clientSessionId: row.client_session_id ?? row.id,
    startedAt: row.started_at ?? row.ended_at ?? new Date().toISOString(),
    duration: row.duration_seconds ?? 0,
    endedAt: row.ended_at ?? new Date().toISOString(),
    xp: row.xp ?? 0,
    coins: row.coins ?? 0,
    status: row.status ?? "completed",
  };
}

function publishSessions(userId: string, sessions: StudySession[]) {
  listeners.forEach((listener) => listener(sessions));
}

export function subscribeToStudySessions(
  listener: SessionListener
): () => void {
  listeners.add(listener);
  let active = true;
  let channel: ReturnType<typeof supabase.channel> | null = null;

  supabase.auth
    .getUser()
    .then(({ data, error }) => {
      if (error) throw error;
      if (!active || !data.user) return;

      const userId = data.user.id;
      channel = supabase
        .channel(`study-sessions:${userId}:${Date.now()}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "study_sessions",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const nextSession = payload.new as Partial<StudySessionRow>;
            if (!active || nextSession.status !== "completed") return;
            loadStudySessions(userId).catch((loadError) =>
              console.warn("Could not refresh study sessions", loadError)
            );
          }
        )
        .subscribe();
    })
    .catch((error) =>
      console.warn("Could not subscribe to study sessions", error)
    );

  return () => {
    active = false;
    listeners.delete(listener);
    if (channel) void supabase.removeChannel(channel);
  };
}

async function cacheSessions(userId: string, sessions: StudySession[]) {
  try {
    await AsyncStorage.setItem(sessionCacheKey(userId), JSON.stringify(sessions));
  } catch (error) {
    console.warn("Could not cache study sessions", error);
  }
}

async function loadCachedSessions(userId: string): Promise<StudySession[]> {
  try {
    const cached =
      (await AsyncStorage.getItem(sessionCacheKey(userId))) ??
      (await AsyncStorage.getItem(legacySessionKey(userId)));
    if (!cached) return [];

    return (JSON.parse(cached) as (StudySession & Partial<StudySessionRow>)[])
      .map((session) =>
        normalizeSession({
          id: session.id,
          client_session_id:
            session.clientSessionId ?? session.client_session_id ?? session.id,
          started_at:
            session.startedAt ?? session.started_at ?? session.endedAt,
          duration_seconds: session.duration ?? session.duration_seconds,
          ended_at: session.endedAt ?? session.ended_at,
          xp: session.xp,
          coins: session.coins,
          status: session.status ?? "completed",
        })
      )
      .filter((session) => session.status === "completed");
  } catch (error) {
    console.warn("Could not load cached study sessions", error);
    return [];
  }
}

export async function loadStudySessions(userId: string): Promise<StudySession[]> {
  try {
    const { data, error } = await supabase
      .from("study_sessions")
      .select(SESSION_COLUMNS)
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("ended_at", { ascending: false })
      .limit(200);

    if (error) throw error;
    const sessions = (data ?? []).map((row) => normalizeSession(row));
    await cacheSessions(userId, sessions);
    publishSessions(userId, sessions);
    return sessions;
  } catch (error) {
    if (!isNetworkRequestError(error)) throw error;
    const sessions = await loadCachedSessions(userId);
    publishSessions(userId, sessions);
    return sessions;
  }
}

export async function saveFocusTimerState(
  userId: string,
  state: FocusTimerState
): Promise<void> {
  await AsyncStorage.setItem(timerStateKey(userId), JSON.stringify(state));
}

export async function clearFocusTimerState(userId: string): Promise<void> {
  await AsyncStorage.removeItem(timerStateKey(userId));
}

async function loadStoredTimerState(
  userId: string
): Promise<FocusTimerState | null> {
  const stored = await AsyncStorage.getItem(timerStateKey(userId));
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored) as Partial<FocusTimerState>;
    if (
      typeof parsed.clientSessionId !== "string" ||
      typeof parsed.serverStartedAt !== "string" ||
      typeof parsed.accumulatedActiveMs !== "number" ||
      !Number.isFinite(parsed.accumulatedActiveMs) ||
      (parsed.runningSinceMs !== null &&
        (typeof parsed.runningSinceMs !== "number" ||
          !Number.isFinite(parsed.runningSinceMs)))
    ) {
      return null;
    }
    return {
      clientSessionId: parsed.clientSessionId,
      serverStartedAt: parsed.serverStartedAt,
      accumulatedActiveMs: Math.max(0, parsed.accumulatedActiveMs),
      runningSinceMs: parsed.runningSinceMs,
    };
  } catch {
    return null;
  }
}

export async function beginStudySession(
  userId: string
): Promise<FocusTimerState> {
  const clientSessionId = randomUUID();
  const { data, error } = await supabase
    .rpc("start_study_session", { p_client_session_id: clientSessionId })
    .single();
  if (error) throw error;

  const row = data as StudySessionRow;
  const state: FocusTimerState = {
    clientSessionId: row.client_session_id,
    serverStartedAt: row.started_at,
    accumulatedActiveMs: 0,
    runningSinceMs: Date.now(),
  };
  await saveFocusTimerState(userId, state);
  return state;
}

export async function resumeStudySession(
  userId: string
): Promise<FocusTimerState | null> {
  const stored = await loadStoredTimerState(userId);
  if (!stored) return null;

  try {
    const { data, error } = await supabase
      .from("study_sessions")
      .select("client_session_id,status")
      .eq("user_id", userId)
      .eq("client_session_id", stored.clientSessionId)
      .maybeSingle();
    if (error) throw error;
    if (!data || data.status !== "active") {
      await clearFocusTimerState(userId);
      return null;
    }
    return stored;
  } catch (error) {
    if (isNetworkRequestError(error)) return stored;
    throw error;
  }
}

export async function finishStudySession(
  userId: string,
  clientSessionId: string,
  activeSeconds: number
): Promise<StudySessionRewardResult> {
  const { data, error } = await supabase
    .rpc("finish_study_session", {
      p_client_session_id: clientSessionId,
      p_active_seconds: Math.max(0, Math.floor(activeSeconds)),
    })
    .single();
  if (error) throw error;

  const row = data as {
    newly_completed: boolean;
    session_id: string;
    session_client_session_id: string;
    session_started_at: string;
    session_duration_seconds: number;
    session_xp: number;
    session_coins: number;
    session_ended_at: string;
    session_status: StudySessionStatus;
    progress_user_id: string;
    progress_xp: number;
    progress_coins: number;
    progress_current_streak: number;
    progress_best_streak: number;
    progress_total_focus_seconds: number;
    progress_total_completed_habits: number;
    progress_updated_at?: string;
  };

  const session = normalizeSession({
    id: row.session_id,
    client_session_id: row.session_client_session_id,
    started_at: row.session_started_at,
    duration_seconds: row.session_duration_seconds,
    xp: row.session_xp,
    coins: row.session_coins,
    ended_at: row.session_ended_at,
    status: row.session_status,
  });
  const progress = await syncUserProgress(normalizeRpcProgress(row));
  const cached = await loadCachedSessions(userId);
  const sessions = [session, ...cached.filter((item) => item.id !== session.id)].slice(
    0,
    200
  );

  await Promise.all([
    cacheSessions(userId, sessions),
    clearFocusTimerState(userId),
  ]);
  publishSessions(userId, sessions);

  return {
    session,
    progress,
    xp: session.xp,
    coins: session.coins,
    newlyCompleted: row.newly_completed,
  };
}
