# Dayly 3D Character Skill

Use this skill whenever working on the 3D avatar, 3D study space, 3D arena, character customisation, shop preview, or accessories.

## Goal

Create a lightweight stylised 3D character that fits Dayly's premium gamified productivity style.

The character should feel:

- clean
- low-poly
- simple
- performant
- customisable
- premium, not childish

## Product Importance

The 3D character is Dayly's key differentiator.

It should not be treated as decoration.

Every major productivity action should eventually affect the character:

- habits increase XP/streak aura

- study sessions trigger focus/reward states

- coins unlock visible cosmetics

- levels evolve the character

- streaks intensify glow/flame effects

Prioritise making the character feel alive, reactive, and personal.

## Avatar Growth Philosophy

The avatar represents the user's personal growth.

It should:

- feel alive
- react to progress
- visibly evolve with level
- show streak energy
- reflect equipped cosmetics
- celebrate wins
- become the emotional anchor of the app

Avoid treating the avatar as a static 3D decoration.

## Existing Dependencies

Prefer existing packages:

- three
- expo-three
- expo-gl

Avoid adding heavy 3D engines unless absolutely necessary.

## Current 3D Stack (wave-1 polish)

The companion is a Blender-generated GLB (`assets/avatar/dayly-companion-build.py`),
loaded via `src/components/3d/companionModel.ts`: `loadCompanion` caches the
parsed source graph, `createCompanionInstance` deep-clones per scene mount.
`proceduralCompanion.ts` is legacy/test-only — My Space (`StudyRoomScene`)
uses the same GLB path as Avatar3D.

Shared modules in `src/components/3d/`:

- `geometry.ts` — vendored RoundedBoxGeometry plus `roundedBox`/`lathe`/`cable`
  helpers for soft premium silhouettes (default `ROUNDED_SEGMENTS = 2`)
- `surfaceTextures.ts` — procedural near-white DataTexture grain maps
  (wood/fabric/paper) plus a vertical gradient for wall shading; they multiply
  the palette colour and never shift hue
- `petMotion.ts` — state→motion controller plus idle micro-motions:
  `SETTLE_MICRO` (rare settle squash every ~16.3s), `EYE_DART_MICRO` (quick
  pupil dart every ~9.7s), `HALO_LAG_SECONDS` (halo trails body sway by ~120ms)

Companion nodes/materials to keep stable: `VisorRim` (moulded visor lip),
double catchlights (`LeftCatchlight2`/`RightCatchlight2` per face style),
`HaloBead` + `HaloBead2`, `PlatformInnerRing` with the `Platform_Inner_Glow`
material. Runtime accent tinting covers all shared `Accent_Orange_Emission`
parts plus `Platform_Inner_Glow`, so new accent geometry must reuse those
material names to track the user's colour.

Study room (`roomBuilders.ts` + `StudyRoomScene.tsx`):

- four lights, no shadow maps: hemisphere, warm key directional, lamp
  PointLight, and a cool window-rim PointLight driven by
  `environmentProfile.windowIntensity` (time-of-day)
- grounding via unlit fakes: contact shadows, wall-shade gradient planes, and
  additive lamp-spill; renderOrder convention: shadows 1, additive glows 10
- rounded furniture (trestle desk, turned-base chair + throw blanket, mug with
  steam, floor plant, headphones, notebook, cables), ceramic + clay materials,
  ~105 renderables before companion/equipment
- MSAA is per GLView: the room runs 2x, Avatar3D runs 4x

## MVP Character

Start with:

- simple body
- head
- eyes
- subtle idle rotation
- subtle floating/breathing animation
- character colour from CharacterContext
- basic accessory support from equipped shop items
- fallback component if GL/3D fails

## Where It Should Appear

Use one reusable component:

- AvatarRenderer (screens never import a concrete renderer;
  CharacterScene is the legacy primitive fallback behind it)

Then integrate it into:

- dashboard arena
- study space
- shop character preview

## Performance Rules

- Keep geometry simple.
- Avoid loading large external models at first.
- Avoid expensive lighting.
- Avoid heavy animation loops.
- Dispose resources if needed.
- Provide fallback UI.
- Do not block the app if GL fails.

## Visual Rules

Use:

- dark background
- subtle floor/platform
- soft lighting
- orange/silver accents
- clean avatar silhouette
- minimal accessories

Avoid:

- realistic human models
- complex rigging
- massive assets
- dependency bloat

## Implementation Plan

Recommended first pass:

1. Create `src/components/character/CharacterScene.tsx`
2. Render basic low-poly avatar using Three.js primitives.
3. Read colour/accessories from CharacterContext.
4. Add optional size/variant props.
5. Replace text placeholders in dashboard/shop/study where safe.
6. Keep fallback placeholder.

## Testing

After implementation:

- run on iOS/Android simulator or Expo Go/dev build
- test dark/light mode
- test shop preview
- test equipped items
- test fallback behaviour

Read CLAUDE.md and the relevant .claude skill files.

Historic task (completed — shipped as the Blender GLB companion; kept for
art-direction reference):
Redesign the 3D avatar into a premium digital pet.

Context:
The current avatar works technically and reacts to XP, streaks, study, and shop items, but the style still feels too generic/robot-like. I want the avatar to be the standout differentiator of Dayly.

Product north star:
Dayly is a gamified productivity companion where your avatar grows as you do.

New art direction:
Premium digital pet / modern Tamagotchi / productivity companion.

Goal:
Redesign the avatar so it feels like a memorable, ownable digital companion that users want to grow, customise, and return to daily.

Style target:

- premium digital pet
- modern Tamagotchi feel
- minimal and collectible
- cute but not childish
- dark/charcoal base
- soft glowing eyes or visor
- subtle orange energy core/accent
- small arms/flippers
- simple antenna/halo/charm
- clean platform/pod
- smooth idle bounce
- expressive reward/focus states

Avoid:

- generic robot
- chess pawn/blob
- random orange dots
- childish cartoon animal
- complex realistic body
- external GLB/GLTF models
- heavy 3D dependencies

Requirements:

- Keep using lightweight Three.js primitives.
- Do not add external 3D models.
- Do not add new dependencies.
- Preserve existing state connections:
    - idle
    - focus
    - reward
    - levelUp
    - level aura/evolution
    - streak glow
    - equipped accessories/decorations
- Make the silhouette more pet-like:
    - rounded compact body
    - bigger expressive eyes/visor
    - small side arms/flippers
    - less humanoid/robot
    - more collectible mascot feel
- Make orange feel intentional:
    - energy core
    - platform glow
    - aura
    - tiny accent details
- Add simple expression changes if practical:
    - idle: soft eyes
    - focus: concentrated/brighter eyes
    - reward: happy bounce/glow
    - levelUp: bigger pulse/evolution glow
- Keep performance safe on mobile.
- Keep fallback UI.
- Do not rewrite the whole app.

Before coding:

1. Inspect CharacterScene and where it is used.
2. Explain what currently makes the avatar feel too generic/robot-like.
3. Propose the minimal visual redesign plan.
4. Then implement the premium digital pet direction.

After coding:

- List files changed.
- Explain how to test idle, focus, reward, levelUp, level progression, and equipped items.
- Mention limitations.
r