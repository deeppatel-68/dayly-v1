# Dayly — Domain & Seams

Dayly is a gamified productivity companion: you complete habits and study
sessions, earn XP and coins, keep streaks, and a 3D companion avatar grows and
reacts as you do.

This file names Dayly's **domain language** and its **good seams** so the
`improve-codebase-architecture` review has vocabulary to build on. Terms follow
the `codebase-design` glossary (module, interface, implementation, depth, seam,
adapter, leverage, locality) — use them exactly.

## Domain glossary

Product nouns and verbs. Use these names in code and suggestions.

- **Habit** — a daily commitment (max 5). **Completion** — a habit marked done
  for a `dateKey` (`YYYY-MM-DD`); presence of a completion row _is_ the truth.
- **Streak** — consecutive days with all habits completed. Bucketed into
  **streak tiers** (0/3/7/14) for avatar visuals.
- **Study session** — a focus-timer run; on finish (≥1 min) it pays out XP and
  coins and is recorded. **Focus state** — the avatar's live reaction to a
  session (`idle` / `focus` / `reward` / `levelUp`).
- **XP** — earns **levels** (level N→N+1 costs N×100). **Level tier** (0–3,
  from `level`) drives avatar evolution. **Coins** — spendable currency.
- **Reward** — XP/coins granted once per source event. Habit completion and
  study finish are the only two reward sources; neither double-awards.
- **Companion / avatar** — the interactive 3D pet. **Body colour** and
  **companion name** are live customisations. **Accessory / decoration** —
  shop items rendered through the equipment registry.
- **Shop item** — purchasable cosmetic. **Owned / equipped** — per-item state.

## Good seams (respect these)

Each is a module with a small interface hiding real behaviour.

- **`services/progressService`** — the source of truth for XP + coins + level.
  Interface: `awardXpOnce`, `addXp`, `addCoins`, `spendCoins`,
  `getUserProgress`, `subscribeToProgress`. Behind it: Supabase persistence,
  local cache, and a pub/sub listener set. `XpContext` and `CoinsContext` are
  thin **adapters** (React views) that subscribe — they hold no truth of their
  own. Award-once idempotency lives here, not in callers.
- **`services/studySessionService`** — study-session history. Interface:
  `recordStudySession`, `loadStudySessions`. Behind it: Supabase + AsyncStorage
  cache + legacy-key migration + `progressService` payout.
- **`services/shopService`** — owned/equipped items and purchases
  (`buyShopItem`, `equipShopItem`, `ensureStarterShopItem`, …). Equipping is
  exclusive **per category**, an invariant this module owns.
- **`services/settingsService`** — user settings + theme + `migrateLegacyUserData`.
- **`lib/supabase`** — the Supabase **adapter**. The only module that knows the
  backend shape; services depend on it, UI never does.

- **`utils/progression`** — the single owner of progression derivation:
  level tiers, streak tiers, and the streak walk (`calculateStreaks`).
  `habitStats` and `analytics` re-export from it; nothing else re-derives a
  tier or streak. The current streak counts today once today is complete.
- **`components/3d/equipment`** — the shop↔3D seam. Interface: `EQUIPMENT`
  registry (item id → slot + builder), `attachEquipment`, and
  `RENDERED_EQUIPMENT_IDS` (the shop gates purchasing on it: an item the 3D
  layer can't display can't be bought). Slots: `pet` (moves with the
  companion), `platform` (around its pod), `room` (study-room anchors only).
- **`components/3d/petMotion` + `companionModel`** — shared companion
  implementation behind every scene: one GLB cache/instance factory, one
  state→motion controller. Scenes (avatar card, study room) are thin
  adapters that build an environment and apply the controller per frame.
- **`components/3d/sceneRenderer` + `sceneInteraction`** — shared render and
  interaction policy. Scenes do not invent their own tone mapping, contact
  shadows, raycasting, or orbit math.

- **Avatar renderer layer** — the deepest seam. `AvatarRenderer` is the single
  interface every screen imports; it selects a renderer (`AvatarGLB` primary,
  `Avatar2D`, `CharacterScene` fallback, `AvatarPlaceholder`) behind one prop
  contract in **`avatarTypes`** (`AvatarState`, `AvatarVariant`,
  `AvatarRendererProps`). **`useAvatarData`** resolves progression signals
  (level/streak tiers, accent + body colour, equipped ids) so every renderer
  reacts identically. Adding a renderer must not touch screens. See
  `docs/avatar-architecture.md`.

## Conventions & invariants (don't re-litigate)

- **UI never imports `lib/supabase` directly** — always through a service.
- **Contexts are views, not stores** for XP/coins (truth is in
  `progressService`). Prefer adding behaviour to a service over a context.
- **Screens import only `AvatarRenderer`**, never a concrete renderer.
- Rewards are **idempotent per source event**; keep that in the service.
- `dateKey` is `YYYY-MM-DD`; a completion row's existence is the completion.
- The `deletion test`: if deleting a module only forces trivial edits at one
  call site, it was shallow — the services above pass because deleting one
  would scatter Supabase/idempotency logic across every caller.
