import AsyncStorage from "@react-native-async-storage/async-storage";
import { FocusSession } from "./analytics";

// Shape is FocusSession-compatible so analytics can consume stored sessions
export interface StudySession extends FocusSession {
  xp: number;
  coins: number;
}

const storageKey = (userId: string) => `@study_sessions:${userId}`;
const MAX_STORED_SESSIONS = 200;

export async function loadStudySessions(
  userId: string
): Promise<StudySession[]> {
  try {
    const stored = await AsyncStorage.getItem(storageKey(userId));
    return stored ? (JSON.parse(stored) as StudySession[]) : [];
  } catch (error) {
    console.error("Error loading study sessions:", error);
    return [];
  }
}

export async function recordStudySession(
  userId: string,
  session: Omit<StudySession, "id" | "endedAt">
): Promise<void> {
  try {
    const sessions = await loadStudySessions(userId);
    sessions.push({
      ...session,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      endedAt: new Date().toISOString(),
    });
    await AsyncStorage.setItem(
      storageKey(userId),
      JSON.stringify(sessions.slice(-MAX_STORED_SESSIONS))
    );
  } catch (error) {
    console.error("Error recording study session:", error);
  }
}
