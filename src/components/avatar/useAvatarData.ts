import { useCharacter } from "@/context/CharacterContext";
import { useHabits } from "@/context/HabitsContext";
import { useShop } from "@/context/ShopContext";
import { useXp } from "@/context/XpContext";
import { DEFAULT_BODY_COLOR } from "@/data/avatarColors";
import { shopItems } from "@/data/shopItems";
import { useMemo } from "react";
import {
  AvatarData,
  AvatarRendererProps,
  toLevelTier,
  toStreakTier,
} from "./avatarTypes";

// Resolves the avatar's progression data: explicit props win, the app
// contexts fill in the rest. Keeps every renderer reacting to the same
// level/streak/customisation signals.
export function useAvatarData(props: AvatarRendererProps): AvatarData {
  const { character } = useCharacter();
  const { isEquipped } = useShop();
  const { level: contextLevel, progress } = useXp();
  const { currentStreak } = useHabits();

  const contextEquipped = useMemo(
    () =>
      shopItems
        .filter(
          (item) =>
            (item.category === "accessory" || item.category === "decoration") &&
            isEquipped(item.id)
        )
        .map((item) => item.id),
    [isEquipped]
  );

  const level = props.level ?? contextLevel;
  const streak = props.streak ?? currentStreak;

  return {
    level,
    levelTier: toLevelTier(level),
    xpProgress: props.xpProgress ?? progress,
    streak,
    streakTier: toStreakTier(streak),
    accentColor: props.accentColor ?? character.color ?? "#D97757",
    bodyColor: props.bodyColor ?? character.bodyColor ?? DEFAULT_BODY_COLOR,
    equippedItems: props.equippedItems ?? contextEquipped,
  };
}
