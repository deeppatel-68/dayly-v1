import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { shopItems } from "@/data/shopItems";
import { ColorScheme } from "@/constants/Colors";
import { XP_PER_HABIT_COMPLETION } from "@/utils/xp";
import { OwnedItem } from "@/types/shop";
import { StudySession } from "@/services/studySessionService";

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

const SETTINGS_COLUMNS =
  "user_id,theme,character_data,migration_flags,created_at,updated_at";

const LEGACY_MIGRATION_FLAG = "async_storage_v1";
const THEME_STORAGE_KEY = "@app_theme";
const COINS_STORAGE_KEY = "@coins";
const OWNED_ITEMS_STORAGE_KEY = "@owned_items";
const CHARACTER_STORAGE_KEY = "@character_data";

const xpStorageKey = (userId: string) => `@xp:${userId}`;
const studyStorageKey = (userId: string) => `@study_sessions:${userId}`;

function normalizeSettings(row: Partial<UserSettings> & { user_id: string }): UserSettings {
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

function parseCoins(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
}

function itemCategory(itemId: string) {
  return shopItems.find((item) => item.id === itemId)?.category ?? "decoration";
}

export async function getUserSettings(userId: string): Promise<UserSettings> {
  const { data, error } = await supabase
    .from("user_settings")
    .upsert({ user_id: userId }, { onConflict: "user_id" })
    .select(SETTINGS_COLUMNS)
    .single();

  if (error) throw error;
  return normalizeSettings(data as UserSettings);
}

export async function updateUserSettings(
  userId: string,
  updates: Partial<Pick<UserSettings, "theme" | "character_data" | "migration_flags">>
): Promise<UserSettings> {
  const { data, error } = await supabase
    .from("user_settings")
    .upsert(
      {
        user_id: userId,
        ...updates,
      },
      { onConflict: "user_id" }
    )
    .select(SETTINGS_COLUMNS)
    .single();

  if (error) throw error;
  return normalizeSettings(data as UserSettings);
}

export async function setUserTheme(
  userId: string,
  theme: ColorScheme
): Promise<UserSettings> {
  await AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
  return updateUserSettings(userId, { theme });
}

export async function migrateLegacyUserData(userId: string): Promise<void> {
  const settings = await getUserSettings(userId);
  if (settings.migration_flags?.[LEGACY_MIGRATION_FLAG]) return;

  const [storedXp, storedCoins, storedOwnedItems, storedCharacter, storedSessions, storedTheme] =
    await Promise.all([
      AsyncStorage.getItem(xpStorageKey(userId)),
      AsyncStorage.getItem(COINS_STORAGE_KEY),
      AsyncStorage.getItem(OWNED_ITEMS_STORAGE_KEY),
      AsyncStorage.getItem(CHARACTER_STORAGE_KEY),
      AsyncStorage.getItem(studyStorageKey(userId)),
      AsyncStorage.getItem(THEME_STORAGE_KEY),
    ]);

  const legacyXp = parseJson<StoredXp>(storedXp);
  const legacyCoins = parseCoins(storedCoins);
  const legacyOwnedItems = parseJson<OwnedItem[]>(storedOwnedItems) ?? [];
  const legacyCharacter = parseJson<Record<string, unknown>>(storedCharacter);
  const legacySessions = parseJson<StudySession[]>(storedSessions) ?? [];
  const legacyTheme =
    storedTheme === "light" || storedTheme === "dark" ? storedTheme : settings.theme;

  const { data: currentProgress, error: progressError } = await supabase
    .from("user_progress")
    .upsert({ user_id: userId }, { onConflict: "user_id" })
    .select(
      "user_id,xp,coins,current_streak,best_streak,total_focus_seconds,total_completed_habits"
    )
    .single();

  if (progressError) throw progressError;

  const awardedHabitKeys = Object.keys(legacyXp?.awards ?? {});
  const totalFocusSeconds = legacySessions.reduce(
    (sum, session) => sum + Math.max(0, session.duration ?? 0),
    0
  );

  const nextProgress = {
    user_id: userId,
    xp: Math.max(currentProgress?.xp ?? 0, legacyXp?.xp ?? 0),
    coins: Math.max(currentProgress?.coins ?? 100, legacyCoins ?? 0),
    total_focus_seconds: Math.max(
      currentProgress?.total_focus_seconds ?? 0,
      totalFocusSeconds
    ),
    total_completed_habits: Math.max(
      currentProgress?.total_completed_habits ?? 0,
      awardedHabitKeys.length
    ),
  };

  await supabase.from("user_progress").upsert(nextProgress, {
    onConflict: "user_id",
  });

  const xpAwards = awardedHabitKeys
    .map((key) => {
      const separatorIndex = key.lastIndexOf(":");
      const sourceId = separatorIndex > -1 ? key.slice(0, separatorIndex) : "";
      const awardDate = separatorIndex > -1 ? key.slice(separatorIndex + 1) : "";
      if (!sourceId || !/^\d{4}-\d{2}-\d{2}$/.test(awardDate)) return null;
      return {
        user_id: userId,
        source_type: "habit",
        source_id: sourceId,
        award_date: awardDate,
        amount: XP_PER_HABIT_COMPLETION,
      };
    })
    .filter((award): award is NonNullable<typeof award> => award !== null);

  if (xpAwards.length > 0) {
    await supabase.from("xp_awards").upsert(xpAwards, {
      onConflict: "user_id,source_type,source_id,award_date",
    });
  }

  const shopRows = legacyOwnedItems
    .filter((item) => item.itemId)
    .map((item) => ({
      user_id: userId,
      item_id: item.itemId,
      category: itemCategory(item.itemId),
      equipped: item.equipped,
    }));

  if (shopRows.length > 0) {
    await supabase.from("user_shop_items").upsert(shopRows, {
      onConflict: "user_id,item_id",
    });
  }

  const sessionRows = legacySessions
    .filter((session) => (session.duration ?? 0) > 0)
    .map((session) => ({
      user_id: userId,
      duration_seconds: session.duration,
      xp: session.xp ?? 0,
      coins: session.coins ?? 0,
      ended_at: session.endedAt ?? new Date().toISOString(),
    }));

  if (sessionRows.length > 0) {
    await supabase.from("study_sessions").insert(sessionRows);
  }

  await updateUserSettings(userId, {
    theme: legacyTheme,
    character_data:
      legacyCharacter && !Array.isArray(legacyCharacter)
        ? { ...(settings.character_data ?? {}), ...legacyCharacter }
        : settings.character_data,
    migration_flags: {
      ...settings.migration_flags,
      [LEGACY_MIGRATION_FLAG]: true,
    },
  });
}
