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

## Existing Dependencies

Prefer existing packages:

- three
- expo-three
- expo-gl

Avoid adding heavy 3D engines unless absolutely necessary.

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

- CharacterScene

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
