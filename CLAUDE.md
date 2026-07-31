# Dayly Claude Instructions

Dayly is a gamified habit + study productivity app built with Expo, React Native, TypeScript, Expo Router, Supabase, and AsyncStorage.

## Product North Star

Dayly is a gamified productivity companion where your avatar grows as you do.

The 3D avatar is the core differentiator, not decoration.

Every major product loop should connect back to the avatar:

- completing habits gives XP and strengthens the avatar
- study sessions give XP/coins and trigger focus/reward states
- streaks increase aura/glow/intensity
- coins unlock visible cosmetics
- levels evolve the avatar visually
- the dashboard should make the avatar feel alive and personal

Do not build generic productivity features unless they support the avatar growth loop.

## Use These Skills

When working on Dayly, use the relevant files in `.claude/`:

- `dayly-style.md` for UI and visual polish
- `dayly-architecture.md` for app structure and state
- `dayly-feature-build.md` for new features
- `dayly-3d-character.md` for 3D avatar/study space/arena
- `dayly-supabase.md` for backend, auth, RLS, friends, leaderboards
- `dayly-testing.md` for testing and validation
- `dayly-anti-patterns.md` for what not to do

## Current App

Already built:

- Supabase auth + services layer (progress/habits/shop/settings/study; see CONTEXT.md seams)
- habits (5 max), completions by date, streaks, consistency calendars
- XP/levels/coins with award-once idempotency; study focus timer + session summary
- 3D GLB companion with idle/focus/reward/levelUp states, tap-poke + drag-orbit
- 3D study room (My Space), equipment/shop gating, Customise screen, onboarding flow
- warm terracotta/ivory/charcoal theme, motion pass, vitest suite

## Product Vision

Dayly should be:

- premium
- dark/grey/silver
- gamified
- habit-focused
- study-focused
- dopamine-rich
- clean and impressive

Core loop:
Choose habits → complete habits/study → earn XP/coins → keep streak → unlock cosmetics → customise avatar → compare with friends.

## Build Priority

1. XP + level system
2. Habit/study rewards
3. Study session summary
4. 3D character MVP
5. Shop/character polish
6. Onboarding
7. Better analytics
8. Friend leaderboard
9. Activity feed
10. Gym geofencing later

## Commands

- Before every commit: `npm run typecheck` && `npm run lint` && `npm test`
- metro.config.js changes (e.g. assetExts) require `expo start -c`
- Bundle check and companion-model rebuild steps: see the `bundle-check` and `companion-preview` skills
- 3D/expo-gl rendering gotchas: see `src/components/CLAUDE.md`

## Supabase

- Credentials in `.env` (EXPO_PUBLIC_SUPABASE_URL/ANON_KEY, see .env.example); env changes need `expo start -c`
- Auth → "Confirm email" must be OFF or signup silently fails RLS on profile insert
- Schema: docs/supabase-setup.sql (bootstrap) + supabase/migrations/ (apply via SQL editor or CLI)

## General Rules

- Inspect files before editing.
- Keep changes small.
- Do not rewrite the whole app.
- Preserve the current style.
- Improve polish only where helpful.
- Avoid unnecessary dependencies.
- Keep Expo compatibility.
- Ask at most 3 questions only if blocked.
- Optimise token usage.
- Do not print full files unless necessary.
