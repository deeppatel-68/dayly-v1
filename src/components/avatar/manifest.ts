import { ImageSourcePropType } from "react-native";
import { AvatarState } from "./avatarTypes";

export interface AvatarManifest {
  // Base pose per state; missing states fall back to idle
  poses: Partial<Record<AvatarState, ImageSourcePropType>> & {
    idle: ImageSourcePropType;
  };
  // Optional glow/aura layer rendered behind the pet; its opacity scales
  // with level and streak tiers
  aura?: ImageSourcePropType;
  // Optional overlays keyed by equipped shop item id (same canvas size as
  // the poses so they layer pixel-perfectly)
  accessories?: Record<string, ImageSourcePropType>;
}

// To activate the 2.5D renderer: drop the art into assets/avatar/ and fill
// this manifest in. While it is null, AvatarRenderer uses the fallback
// (primitive CharacterScene or the polished placeholder).
//
// export const avatarManifest: AvatarManifest = {
//   poses: {
//     idle: require("../../../assets/avatar/dayly-idle.png"),
//     focus: require("../../../assets/avatar/dayly-focus.png"),
//     reward: require("../../../assets/avatar/dayly-reward.png"),
//     levelUp: require("../../../assets/avatar/dayly-levelup.png"),
//   },
//   aura: require("../../../assets/avatar/dayly-aura.png"),
//   accessories: {
//     "focus-cap": require("../../../assets/avatar/acc-focus-cap.png"),
//     "study-glasses": require("../../../assets/avatar/acc-study-glasses.png"),
//     "neon-headphones": require("../../../assets/avatar/acc-neon-headphones.png"),
//   },
// };
export const avatarManifest: AvatarManifest | null = null;
