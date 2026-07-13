import { useCharacter } from "@/context/CharacterContext";
import { useHabits } from "@/context/HabitsContext";
import { useShop } from "@/context/ShopContext";
import { useXp } from "@/context/XpContext";
import { DEFAULT_BODY_COLOR } from "@/data/avatarColors";
import { DEFAULT_FACE_STYLE } from "@/data/faceStyles";
import { toLevelTier, toStreakTier } from "@/utils/progression";
import { useMemo } from "react";
import { AvatarData, AvatarRendererProps } from "./avatarTypes";

// Resolves the avatar's progression data: explicit props win, the app
// contexts fill in the rest. Keeps every renderer reacting to the same
// level/streak/customisation signals.
export function useAvatarData(props: AvatarRendererProps): AvatarData {
  const { character } = useCharacter();
  const { ownedItems, shopItems } = useShop();
  const { level: contextLevel, progress } = useXp();
  const { currentStreak } = useHabits();

  const contextEquipped = useMemo(() => {
    const activeItemIds = new Set(shopItems.map((item) => item.id));
    return ownedItems
      .filter((item) => item.equipped && activeItemIds.has(item.itemId))
      .map((item) => item.itemId);
  }, [ownedItems, shopItems]);

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
    faceStyle: props.faceStyle ?? character.faceStyle ?? DEFAULT_FACE_STYLE,
    equippedItems: props.equippedItems ?? contextEquipped,
  };
}
