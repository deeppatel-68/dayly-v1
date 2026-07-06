// Shared contract every avatar renderer (2.5D assets, primitive 3D fallback,
// future GLB) must satisfy. Screens depend only on this, never on a renderer.

export type AvatarState = "idle" | "focus" | "reward" | "levelUp";
export type AvatarVariant = "dashboard" | "study" | "shop";

export interface AvatarRendererProps {
  state?: AvatarState;
  variant?: AvatarVariant;

  // Progression data. All optional — when omitted, AvatarRenderer fills
  // them from the app contexts (XpContext, HabitsContext, CharacterContext,
  // ShopContext), so screens can simply render <AvatarRenderer state=... />.
  level?: number;
  xpProgress?: number; // 0..1 within the current level
  streak?: number;
  accentColor?: string;
  bodyColor?: string;
  equippedItems?: string[];
}

// Resolved (no optionals) data passed to concrete renderers
export interface AvatarData {
  level: number;
  levelTier: number; // 0..3
  xpProgress: number;
  streak: number;
  streakTier: number; // 0..3
  accentColor: string;
  bodyColor: string;
  equippedItems: string[];
}

export const toLevelTier = (level: number) =>
  Math.min(3, Math.floor((level - 1) / 3));

export const toStreakTier = (streak: number) =>
  streak >= 14 ? 3 : streak >= 7 ? 2 : streak >= 3 ? 1 : 0;
