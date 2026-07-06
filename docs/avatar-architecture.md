# Dayly Avatar Architecture

Decision (June 2026): the avatar is Dayly's differentiator, and primitive
Three.js geometry hit its visual ceiling. We pivoted to an asset-based
avatar system with a renderer-agnostic architecture.

## Layers

```
<AvatarRenderer state variant …>  ← the only component screens import
  ├─ AvatarGLB                    ← Blender-authored companion model
  │                                  (PRIMARY; assets/avatar/dayly-companion.glb)
  ├─ Avatar2D                     ← 2.5D layered assets (active when the
  │                                  manifest is filled and mode is "2d")
  ├─ CharacterScene               ← primitive Three.js pet (fallback/dev;
  │                                  also AvatarGLB's load-failure fallback)
  └─ AvatarPlaceholder            ← polished pulsing-core placeholder
```

Selection lives in `AVATAR_MODE` in `AvatarRenderer.tsx` ("glb" today).

## Shared 3D foundation (`src/components/3d/`)

- `companionModel.ts` — session-level GLB cache (`loadCompanion`) +
  `createCompanionInstance` (clone, pet-node reparenting, per-instance
  material tinting for body colour/accent, disposal). Used by every scene
  that shows the pet.
- `petMotion.ts` — the state→motion controller (bob/sway/celebration spin,
  core heartbeat, halo/ring glow, blink). One place to tune; scenes only
  apply it each frame.
- `equipment.ts` — the shop↔3D seam: item id → { slot, build } registry
  (slots: `pet`, `platform`, `room`), `attachEquipment`/`disposeEquipment`,
  and `RENDERED_EQUIPMENT_IDS`, which the shop reads to gate purchasing (an
  item that doesn't render can't be bought).

## Scenes

- `AvatarGLB` (avatar card / shop preview) — pet + pod, renders `pet` and
  `platform` equipment slots.
- `components/room/StudyRoomScene.tsx` — My Space: cozy study nook
  (`roomBuilders.ts`: shell, desk setup, lamp with live light, chair, shelf,
  string lights) with the pet on its pod. Renders all equipment slots
  (furniture/wall art at `ROOM_ANCHORS`). Reacts to focus/reward/levelUp:
  pet motion plus desk-lamp brightening and string-light shimmer. Hosted by
  the full-screen My Space modal (`StudySpacePlaceholder`), which the study
  tab opens on focus start and the dashboard opens from the avatar card.

- `src/components/avatar/avatarTypes.ts` — the renderer contract:
  `AvatarState` ("idle" | "focus" | "reward" | "levelUp"), `AvatarVariant`
  ("dashboard" | "study" | "shop"), and `AvatarRendererProps` (state,
  variant, plus optional level/xpProgress/streak/accentColor/equippedItems
  overrides).
- `src/components/avatar/useAvatarData.ts` — resolves progression data:
  explicit props win, app contexts (XpContext, HabitsContext,
  CharacterContext, ShopContext) fill the rest. All renderers consume this.
- `src/components/avatar/manifest.ts` — the 2.5D asset manifest. `null`
  today; filling it activates Avatar2D everywhere at once.
- `src/components/avatar/Avatar2D.tsx` — layered Image renderer with RN
  Animated idle bob, focus glow pulse, reward bounce, level-up pulse,
  tier-driven aura opacity, and accessory overlays. No GL, no new deps.
- `src/components/avatar/AvatarPlaceholder.tsx` — premium no-asset
  fallback: breathing accent core + level badge.

Screens (dashboard arena card, study space, shop preview) render
`<AvatarRenderer/>` only. State wiring (habit completion → reward, focus
timer → focus/reward/levelUp) lives in the screens/FocusTimer and is
renderer-independent.

## Activating the 2.5D avatar

1. Export art as transparent PNGs on one shared canvas (square,
   1024×1024 recommended): one per state (idle required, others optional),
   optional aura layer, optional per-item accessory overlays aligned to the
   same canvas. Naming convention: `dayly-idle.png`, `dayly-focus.png`,
   `dayly-reward.png`, `dayly-levelup.png`, `dayly-aura.png`,
   `acc-<item-id>.png`.
2. Drop files into `assets/avatar/`.
3. Fill `avatarManifest` in `src/components/avatar/manifest.ts` (template
   in the file).

No other code changes; all three surfaces switch over together.

## GLB later

- `expo-three@8` ships `loadAsync` for GLTF/GLB.
- Add `glb` to Metro `assetExts` (create metro.config.js extending
  `expo/metro-config`) when the model lands.
- Implement `AvatarGLB` against `AvatarRendererProps` + `useAvatarData`,
  add it to the selector in `AvatarRenderer.tsx`. Keep Avatar2D as its
  fallback.

## Rules

- Never import CharacterScene/Avatar2D directly from screens.
- New avatar reactions = new `AvatarState` value in types.ts, handled by
  every renderer (fallbacks included).
- Progression-driven visuals consume `useAvatarData`, not contexts
  directly, so all renderers stay in sync.
