// Shared contract every avatar renderer (2.5D assets, primitive 3D fallback,
// future GLB) must satisfy. Screens depend only on this, never on a renderer.

import type {
  CompanionMood,
  CompanionReaction,
  CompanionReactionToken,
} from "@/components/companion/companionBehavior";
import type { FaceStyle } from "@/data/faceStyles";

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
  faceStyle?: FaceStyle;
  equippedItems?: string[];
  mood?: CompanionMood;
  reactionToken?: CompanionReactionToken | null;
  onInteract?: () => CompanionReaction | void;
  onReady?: () => void;
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
  faceStyle: FaceStyle;
  equippedItems: string[];
}

// Tier derivation lives in utils/progression (the single owner of
// progression maths); import it from there.
