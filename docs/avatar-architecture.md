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

- `companionModel.ts` — bundled GLB loader (`loadCompanion`) +
  `createCompanionInstance` (pet-node reparenting, per-instance material
  tinting, and disposal). Used by every scene that shows the pet. Each Expo
  GL context deep-clones an immutable loaded graph and owns its resources;
  mutating or sharing the loader's internally cached graph caused later
  native contexts to intermittently render empty.
- `petMotion.ts` — the state→motion controller (bob/sway/celebration spin,
  core heartbeat, halo/ring glow, blink, and tap-triggered poke bounce). One
  place to tune; scenes only apply it each frame.
- `sceneRenderer.ts` — shared Expo GL quality (4x MSAA, ACES filmic tone
  mapping, sRGB output), companion lighting, and inexpensive contact shadows.
- `SceneTouchLayer.tsx` + `sceneInteraction.ts` — the React Native/Three.js
  touch boundary. It distinguishes taps from drags, raycasts the pet, and owns
  camera orbit math.
- `equipment.ts` — the shop↔3D seam: item id → { slot, build } registry
  (slots: `pet`, `platform`, `room`), `attachEquipment`/`disposeEquipment`,
  and `RENDERED_EQUIPMENT_IDS`, which the shop reads to gate purchasing (an
  item that doesn't render can't be bought).

## Scenes

- `AvatarGLB` (avatar card / shop preview) — pet + pod, renders `pet` and
  `platform` equipment slots. Tap for a haptic bounce; drag for a full orbit.
- `components/room/StudyRoomScene.tsx` — My Space: cozy study nook
  (`roomBuilders.ts`: shell, desk setup, lamp with live light, chair, shelf,
  string lights) with the pet on its pod. Renders all equipment slots
  (furniture/wall art at `ROOM_ANCHORS`). Reacts to focus/reward/levelUp:
  pet motion plus desk-lamp brightening and string-light shimmer. Hosted by
  the full-screen My Space modal (`StudySpacePlaceholder`), which the study
  tab opens on focus start and the dashboard opens from the avatar card. Its
  orbit is clamped and eases back to the iOS-simulator-verified home
  composition. My Space keeps a dark environment clear colour in both app
  themes so the finite room shell never exposes a bright canvas edge.

## Customisation flow

- `app/(tabs)/customise.tsx` is a hidden tab route opened from the dashboard.
  It owns the live preview, companion name, body colour, and equipment state.
- `components/customise/BodyColorPicker.tsx` is shared with onboarding.
- Owned items equip or unequip through `ShopContext`; unowned rendered items
  open the existing shop. The UI does not mutate equipment state directly.
- The dashboard scene stays interactive. Separate `My Space` and `Customise`
  actions own navigation, so dragging never opens a modal accidentally.

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

## Blender asset pipeline

- `assets/avatar/dayly-companion-build.py` is the source of truth for the GLB,
  `.blend`, and preview. Keep node names stable because `companionModel.ts`
  uses them for animation and material tinting.
- The compact asset includes the body/visor/eyes/core, flippers, foot nubs,
  halo charm, visor accent contour, and two-tier pod. It has no skeletal rig.
- After model edits, rerun the script in Blender background mode, inspect the
  preview, and verify wearable and pod-equipment fit against the exported GLB.

## Rules

- Never import CharacterScene/Avatar2D directly from screens.
- New avatar reactions = new `AvatarState` value in types.ts, handled by
  every renderer (fallbacks included).
- Progression-driven visuals consume `useAvatarData`, not contexts
  directly, so all renderers stay in sync.
