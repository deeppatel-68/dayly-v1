import AsyncStorage from "@react-native-async-storage/async-storage";
import { ColorScheme } from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { StudySession } from "@/services/studySessionService";
import { OwnedItem } from "@/types/shop";
import { isNetworkRequestError } from "@/utils/supabaseErrors";

export interface UserSettings {
  user_id: string;
  theme: ColorScheme | null;
  character_data: Record<string, unknown> | null;
  migration_flags: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

interface StoredXp {
  xp?: number;
  awards?: Record<string, true>;
}

export interface LegacyMigrationPayload {
  xp: number;
  coins: number;
  total_focus_seconds: number;
  total_completed_habits: number;
  awards: { source_id: string; award_date: string }[];
  shop_items: { item_id: string; equipped: boolean }[];
  sessions: {
    legacy_id: string;
    duration_seconds: number;
    ended_at: string;
  }[];
  theme: ColorScheme | null;
  character_data: Record<string, unknown> | null;
}

const SETTINGS_COLUMNS =
  "user_id,theme,character_data,migration_flags,created_at,updated_at";
const THEME_STORAGE_KEY = "@app_theme";
const COINS_STORAGE_KEY = "@coins";
const OWNED_ITEMS_STORAGE_KEY = "@owned_items";
const CHARACTER_STORAGE_KEY = "@character_data";

const xpStorageKey = (userId: string) => `@xp:${userId}`;
const studyStorageKey = (userId: string) => `@study_sessions:${userId}`;

function normalizeSettings(
  row: Partial<UserSettings> & { user_id: string }
): UserSettings {
  return {
    user_id: row.user_id,
    theme: row.theme === "light" || row.theme === "dark" ? row.theme : null,
    character_data: row.character_data ?? null,
    migration_flags: row.migration_flags ?? {},
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function parseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function parseNonNegativeInteger(value: string | null, fallback = 0): number {
  if (value === null) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
}

export async function getUserSettings(userId: string): Promise<UserSettings> {
  try {
    const { data, error } = await supabase
      .from("user_settings")
      .upsert({ user_id: userId }, { onConflict: "user_id" })
      .select(SETTINGS_COLUMNS)
      .single();

    if (error) throw error;
    return normalizeSettings(data as UserSettings);
  } catch (error) {
    if (!isNetworkRequestError(error)) throw error;

    const [theme, characterData] = await Promise.all([
      AsyncStorage.getItem(THEME_STORAGE_KEY),
      AsyncStorage.getItem(CHARACTER_STORAGE_KEY),
    ]);

    return normalizeSettings({
      user_id: userId,
      theme: theme === "light" || theme === "dark" ? theme : null,
      character_data: parseJson<Record<string, unknown>>(characterData),
      migration_flags: {},
    });
  }
}

export async function updateUserSettings(
  userId: string,
  updates: Partial<
    Pick<UserSettings, "theme" | "character_data" | "migration_flags">
  >
): Promise<UserSettings> {
  try {
    const { data, error } = await supabase
      .from("user_settings")
      .upsert({ user_id: userId, ...updates }, { onConflict: "user_id" })
      .select(SETTINGS_COLUMNS)
      .single();

    if (error) throw error;
    return normalizeSettings(data as UserSettings);
  } catch (error) {
    if (!isNetworkRequestError(error)) throw error;
    return normalizeSettings({
      user_id: userId,
      theme: updates.theme ?? null,
      character_data: updates.character_data ?? null,
      migration_flags: updates.migration_flags ?? {},
    });
  }
}

export async function setUserTheme(
  userId: string,
  theme: ColorScheme
): Promise<UserSettings> {
  await AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
  return updateUserSettings(userId, { theme });
}

export async function getUserCharacterData(
  userId: string
): Promise<Record<string, unknown> | null> {
  return (await getUserSettings(userId)).character_data;
}

export async function setUserCharacterData(
  userId: string,
  characterData: Record<string, unknown>
): Promise<UserSettings> {
  await AsyncStorage.setItem(
    CHARACTER_STORAGE_KEY,
    JSON.stringify(characterData)
  );
  return updateUserSettings(userId, { character_data: characterData });
}

export async function migrateLegacyUserData(userId: string): Promise<void> {
  const [
    storedXp,
    storedCoins,
    storedOwnedItems,
    storedCharacter,
    storedSessions,
    storedTheme,
  ] = await Promise.all([
    AsyncStorage.getItem(xpStorageKey(userId)),
    AsyncStorage.getItem(COINS_STORAGE_KEY),
    AsyncStorage.getItem(OWNED_ITEMS_STORAGE_KEY),
    AsyncStorage.getItem(CHARACTER_STORAGE_KEY),
    AsyncStorage.getItem(studyStorageKey(userId)),
    AsyncStorage.getItem(THEME_STORAGE_KEY),
  ]);

  const legacyXp = parseJson<StoredXp>(storedXp);
  const legacyOwnedItems = parseJson<OwnedItem[]>(storedOwnedItems) ?? [];
  const legacyCharacter = parseJson<Record<string, unknown>>(storedCharacter);
  const legacySessions = parseJson<StudySession[]>(storedSessions) ?? [];
  const awards = Object.keys(legacyXp?.awards ?? {})
    .map((key) => {
      const separator = key.lastIndexOf(":");
      return {
        source_id: separator > -1 ? key.slice(0, separator) : "",
        award_date: separator > -1 ? key.slice(separator + 1) : "",
      };
    })
    .filter(
      (award) =>
        award.source_id.length > 0 &&
        /^\d{4}-\d{2}-\d{2}$/.test(award.award_date)
    );

  const payload: LegacyMigrationPayload = {
    xp: Math.max(0, legacyXp?.xp ?? 0),
    coins: parseNonNegativeInteger(storedCoins),
    total_focus_seconds: legacySessions.reduce(
      (total, session) => total + Math.max(0, session.duration ?? 0),
      0
    ),
    total_completed_habits: awards.length,
    awards,
    shop_items: legacyOwnedItems
      .filter((item) => item.itemId)
      .map((item) => ({ item_id: item.itemId, equipped: item.equipped })),
    sessions: legacySessions
      .filter((session) => session.id && session.duration > 0)
      .map((session) => ({
        legacy_id: session.id,
        duration_seconds: session.duration,
        ended_at: session.endedAt ?? new Date().toISOString(),
      })),
    theme:
      storedTheme === "light" || storedTheme === "dark" ? storedTheme : null,
    character_data: legacyCharacter,
  };

  const { error } = await supabase.rpc("migrate_legacy_user_data", {
    p_payload: payload,
  });
  if (error) throw error;
}
