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
  `createCompanionInstance` (face pruning, pet-node reparenting, per-instance
  material conversion/tinting, and disposal). Used by every companion scene.
  The appropriate bundled GLB is parsed once into an immutable source graph;
  each instance removes inactive `Face_*` groups before cloning retained
  geometry and materials, preserving sharing inside the instance while keeping
  GL contexts isolated. Runtime accent tinting covers the core, orbit, face
  accents, and both pod rings. Each role owns an independent runtime material
  so motion can animate its colour without allocations or cross-role changes.
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
  `platform` equipment slots. Both variants start from the authored 10° hero
  azimuth and ease back there after interaction. Shop drag remains a free 360°
  turntable with bounded elevation; dashboard drag retains its horizontal
  clamp. `createHeroCameraOrbit` owns the complete presentation setup: both use
  a 45° vertical FOV; dashboard uses target Y `0.86`, radius `3.70`, and camera
  height `1.25`; shop uses target Y `0.89`, radius `3.60`, and camera height
  `1.29`. The framing contract covers the complete visible runtime envelope,
  not only authored GLB vertices: the pod, tier-three fins/focus orbit/aura,
  camera-facing core and halo glow sprites, the full compatible pet/platform
  equipment set, and the companion plus attached wearables at the level-up
  motion's `0.19` lift. The dashboard must remain inside `±0.95` NDC at 3:4;
  shop must remain inside `±0.85` NDC at square aspect; both must remain inside
  their camera near/far clip planes, with at least `0.02` NDC headroom on every
  screen edge for exporter/device variation. Tap produces a haptic companion
  reaction.
- `components/room/StudyRoomScene.tsx` — My Space: moonlit study nook
  (`roomBuilders.ts`: shell, window/skyline, A-frame trestle desk with mug +
  drifting steam, notebook, headphones and laptop cable, practical lamp,
  turned-base chair with a throw blanket, shelf, potted floor plant, and
  string lights with gravity sag) with the cached-GLB companion on its pod.
  Silhouette furniture uses rounded boxes/lathes (`geometry.ts`) with
  procedural grain maps (`surfaceTextures.ts`) and a ceramic + clay material
  family; the canonical room is exactly 104 logical visual pieces represented
  by 83 physical renderables before companion/equipment. Lighting is
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

## Companion asset contract

`assets/avatar/dayly-companion-build.py` is the only editable model source. It
emits two texture-free GLBs from one scene with the same origin, dimensions,
pod footprint, cosmetic envelope, face groups, and motion contract:

- `dayly-companion.glb` (`detail: "hero"`) keeps the complete authored detail
  and is selected by `Avatar3D` for dashboard, onboarding, customisation, and
  shop presentation.
- `dayly-companion-lite.glb` (`detail: "lite"`) removes sub-pixel blush and
  secondary catchlights and reduces mesh density. `StudyRoomScene` selects it
  because the companion occupies fewer pixels there. Lite is a separate asset,
  not hidden hero geometry, and preserves the same active states and cosmetics.

Both exports must retain `Body`, `Body_Charcoal`, `FacePanel`, `VisorRim`,
`LeftEye`, `RightEye`, `VisorLip`, `HaloCharm`, `EnergyCore`, `LeftFlipper`,
`RightFlipper`, and all five compatibility groups: `Face_Classic`, `Face_Eve`,
`Face_Screen`, `Face_Kirby`, and `Face_Joy`. The internal IDs remain stable for
persisted users and rig lookup; their display names are Orbit, Focus, Pixel,
Spark, and Rest. The model has no skin or authored animation clips.

Before instance resources are cloned, `createCompanionInstance` removes the
four inactive face groups and resolves the selected style's semantic eye,
pupil, and mouth nodes. A missing required node throws a model-contract error.
Every retained material slot is converted to a context-owned
`MeshBasicMaterial` for reliable Expo GL rendering. Conversion retains colour
and emission influence, maps, side, depth, alpha, blending, vertex-colour, and
multi-material slot behavior. Body tint replaces only the `Body_Charcoal`
slot, leaving the stable dark base intact. Core, orbit, face, platform ring,
and inner ring then receive independent Basic materials for allocation-free
runtime animation.

`companionModel.ts` adds cumulative progression geometry at runtime: tier 1
energy fins, tier 2 orbiting focus ticks, and a tier 3/streak energy arc. These
meshes are disposed with the companion instance.

## Generator, budgets, and visual review

From the repository root, rebuild all authored outputs with:

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python assets/avatar/dayly-companion-build.py
```

The script resolves outputs relative to itself, so the same command is valid
from a Git worktree. It writes `dayly-companion.blend`, both GLBs,
`dayly-companion-preview.png`, and
`assets/avatar/dayly-companion-manifest.json`. The manifest records bytes,
primitive/index counts, per-face active triangles, required names, and counts
of textures, skins, and animation clips. The generator aborts before accepting
an asset over these limits: hero ≤ 700 KB and 15,000 active-face triangles;
lite ≤ 450 KB and 7,000 active-face triangles; both with zero textures, skins,
or clips. `companionAssetBudget.test.ts` recalculates those facts from each GLB
instead of trusting the manifest.

Review every rebuild at original size in `assets/avatar/review/`: `front.png`,
`three-quarter.png`, `side.png`, `rear.png`, `silhouette.png`, and `unlit.png`.
The last two expose outline and Expo Basic-material parity problems that a lit
front render can hide; also inspect the silhouette at 64 px. Face-specific
merged outputs live at
`assets/avatar/face-variants/merged-check-{classic,eve,screen,kirby,joy}.png`.
Together with `dayly-companion-preview.png`, these generated artifacts are the
durable visual-review record for changes to the source script.

## Rules

- Never import CharacterScene/Avatar2D directly from screens.
- New avatar reactions = new `AvatarState` value in types.ts, handled by
  every renderer (fallbacks included).
- Progression-driven visuals consume `useAvatarData`, not contexts
  directly, so all renderers stay in sync.
