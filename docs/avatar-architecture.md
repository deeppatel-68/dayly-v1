# Dayly Avatar Architecture

Decision (June 2026): the avatar is Dayly's differentiator, and primitive
Three.js geometry hit its visual ceiling. We pivoted to an asset-based
avatar system with a renderer-agnostic architecture.

## Layers

```
<AvatarRenderer state variant …>  ← the only component screens import
  ├─ Avatar3D                     ← scene-native companion (PRIMARY)
  ├─ Avatar2D                     ← 2.5D layered assets (active when the
  │                                  manifest is filled and mode is "2d")
  ├─ CharacterScene               ← legacy primitive Three.js fallback/dev
  └─ AvatarPlaceholder            ← polished pulsing-core placeholder
```

Selection lives in `AVATAR_MODE` in `AvatarRenderer.tsx` ("3d" today).

## Shared 3D foundation (`src/components/3d/`)

- `companionModel.ts` — retained Blender GLB loader (`loadCompanion`) +
  `createCompanionInstance` (pet-node reparenting, per-instance material
  tinting, and disposal). Used by every companion scene: Avatar3D, the
  customisation preview, and My Space (`StudyRoomScene`) all load the cached
  GLB per mount. The bundled GLB is parsed once into an immutable source
  graph; instances deep-clone geometry and materials and own those disposable
  resources. Runtime accent tinting covers the core plus every shared
  `Accent_Orange_Emission` part (halo beads, VisorLip, visor contour) and the
  pod's `Platform_Inner_Glow` inner ring, so the whole silhouette tracks the
  user's colour; the EnergyCore material stays independent so its heartbeat
  pulse can run at its own intensity.
- `proceduralCompanion.ts` — legacy primitive companion rig, exercised only
  by its own test today. My Space no longer uses it: `StudyRoomScene`
  renders the same cached-GLB companion as everywhere else.
- `geometry.ts` — soft-silhouette helpers: vendored `RoundedBoxGeometry`
  (three r166 examples/jsm, vendored so Metro never has to resolve
  examples paths) plus `roundedBox`/`lathe`/`cable` mesh helpers. Default
  `ROUNDED_SEGMENTS = 2` keeps a full room of rounded meshes GPU-trivial;
  the real mobile budget is draw calls, which these helpers don't add to.
- `surfaceTextures.ts` — procedural `DataTexture` grain maps (wood stripes,
  fabric weave, paper fleck) plus a vertical alpha gradient used for wall
  shading. Near-white luminance-only textures assigned as `map` so they
  multiply the palette colour without shifting hue; deterministic LCG noise,
  generated once per scene mount before frame one (no mid-loop uploads).
- `petMotion.ts` — the state→motion controller (bob/sway/celebration spin,
  core heartbeat, expressive eyes/flippers, evolution fins, focus-node orbit,
  streak aura, halo/ring glow, blink, and tap-triggered poke bounce). One place
  to tune; scenes only apply it each frame. Idle micro-motions are exported
  constants: `SETTLE_MICRO` (a rare soft squash-and-recover every ~16.3s, like
  shifting weight), `EYE_DART_MICRO` (a quick pupil dart every ~9.7s,
  alternating direction so it reads as curiosity), and `HALO_LAG_SECONDS`
  (the halo trails the body sway by ~120ms, selling mass without a physics
  sim). Periods are deliberately non-round so beats never sync with the
  bob/blink cycles.
- `sceneRenderer.ts` — shared Expo GL quality (ACES filmic tone mapping,
  sRGB output), companion lighting, and inexpensive contact shadows. MSAA is
  set per GLView, not here: 4x for `Avatar3D`, 2x for the heavier
  `StudyRoomScene`.
- `SceneTouchLayer.tsx` + `sceneInteraction.ts` — the React Native/Three.js
  touch boundary. It distinguishes taps from drags, raycasts the pet, and owns
  camera orbit math.
- `equipment.ts` — the shop↔3D seam: item id → { slot, build } registry
  (slots: `pet`, `platform`, `room`), `attachEquipment`/`disposeEquipment`,
  and `RENDERED_EQUIPMENT_IDS`, which the shop reads to gate purchasing (an
  item that doesn't render can't be bought).

## Scenes

- `Avatar3D` (avatar card / shop preview) — pet + pod, renders `pet` and
  `platform` equipment slots. Tap for a haptic bounce; drag for a full orbit.
- `components/room/StudyRoomScene.tsx` — My Space: moonlit study nook
  (`roomBuilders.ts`: shell, window/skyline, A-frame trestle desk with mug +
  drifting steam, notebook, headphones and laptop cable, practical lamp,
  turned-base chair with a throw blanket, shelf, potted floor plant, and
  string lights with gravity sag) with the cached-GLB companion on its pod.
  Silhouette furniture uses rounded boxes/lathes (`geometry.ts`) with
  procedural grain maps (`surfaceTextures.ts`) and a ceramic + clay material
  family; budget is ~105 renderables before companion/equipment. Lighting is
  four lights and no shadow maps: hemisphere, warm key directional, the
  lamp's warm PointLight, and a cool window-rim PointLight driven by
  `environmentProfile.windowIntensity` (near-zero at midday, strongest at
  night so the sky reads as a light source against the lamp). Grounding and
  depth come from unlit fakes — contact-shadow planes, a lamp pool, wall
  shading gradient planes toward the ceiling, and an additive lamp-spill
  plane — under the project renderOrder convention: shadows/shading render
  at 1, additive glows at 10. Renders all equipment slots
  (furniture/wall art at `ROOM_ANCHORS`). Reacts to focus/reward/levelUp:
  pet motion plus desk-lamp brightening and string-light shimmer. Hosted by
  the full-screen My Space modal (`StudySpacePlaceholder`), which the study
  tab opens on focus start and the dashboard opens from the avatar card. Its
  orbit is clamped and eases back to the iOS-simulator-verified home
  composition. My Space keeps a dark environment clear colour in both app
  themes so the finite room shell never exposes a bright canvas edge, and
  throttles its render loop while the app is backgrounded.

## Customisation flow

- `app/customise.tsx` is a stack route opened from the dashboard.
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
- The compact asset includes the pear-tapered body, visor with a moulded
  `VisorRim` lip, eyes with double catchlights (`LeftCatchlight` +
  `LeftCatchlight2` and mirrored right, prefixed per face style), core,
  flippers, foot nubs, halo charm with two beads (`HaloBead`, `HaloBead2`),
  visor accent contour, and a chamfered two-tier pod with an inset
  `PlatformInnerRing` whose `Platform_Inner_Glow` material is accent-tinted
  at runtime. It has no skeletal rig.
- `companionModel.ts` adds progression geometry at runtime so the same compact
  asset visibly evolves everywhere: tier 1 energy fins, tier 2 orbiting focus
  ticks, and a tier 3/streak energy arc. These meshes share one low-cost
  material and are disposed with the companion instance.
- After model edits, rerun the script in Blender background mode, inspect the
  preview, and verify wearable and pod-equipment fit against the exported GLB.

## Rules

- Never import CharacterScene/Avatar2D directly from screens.
- New avatar reactions = new `AvatarState` value in types.ts, handled by
  every renderer (fallbacks included).
- Progression-driven visuals consume `useAvatarData`, not contexts
  directly, so all renderers stay in sync.
