import CharacterScene from "@/components/character/CharacterScene";
import React from "react";
import Avatar2D from "./Avatar2D";
import Avatar3D from "./Avatar3D";
import AvatarPlaceholder from "./AvatarPlaceholder";
import { avatarManifest } from "./manifest";
import { AvatarRendererProps } from "./avatarTypes";

// Renderer selection:
//   "3d"         → scene-native Three.js companion (primary)
//   "2d"         → layered image assets (requires a filled manifest)
//   "primitive"  → dev/fallback Three.js primitive pet
//   "placeholder"→ polished no-asset placeholder
type AvatarMode = "3d" | "2d" | "primitive" | "placeholder";
const AVATAR_MODE: AvatarMode = "3d";

// The single avatar entry point. Screens render <AvatarRenderer/> and never
// a specific renderer, so the art pipeline can evolve without touching
// screens, state wiring, or progression logic.
export default function AvatarRenderer(props: AvatarRendererProps) {
  if (AVATAR_MODE === "3d") {
    // Avatar3D falls back to CharacterScene itself if scene setup fails.
    return <Avatar3D {...props} />;
  }

  if (AVATAR_MODE === "2d" && avatarManifest) {
    return <Avatar2D manifest={avatarManifest} {...props} />;
  }

  if (AVATAR_MODE === "2d" || AVATAR_MODE === "primitive") {
    return (
      <CharacterScene
        variant={props.variant === "shop" ? "preview" : "full"}
        state={props.state}
      />
    );
  }

  return <AvatarPlaceholder {...props} />;
}
