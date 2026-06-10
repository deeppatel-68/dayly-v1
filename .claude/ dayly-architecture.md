# Dayly Architecture Skill

Use this skill whenever adding state, context, data persistence, routing, or cross-screen features.

## Current Stack

Dayly uses:

- Expo
- React Native
- TypeScript
- Expo Router
- Supabase
- AsyncStorage
- ThemeContext
- AuthContext
- HabitsContext
- CoinsContext
- CharacterContext
- ShopContext

## Architecture Rules

Prefer existing contexts over new global state.
Only create a new context if the feature is truly cross-screen.

Use this pattern:

- Auth/user data → Supabase
- Habits/completions → Supabase
- MVP-only local gamification → AsyncStorage
- Production gamification that must sync → Supabase later

## Routing Rules

Use Expo Router file-based routing.
Do not create custom navigation systems unless necessary.
Keep the existing tab structure unless the task specifically changes navigation.

## Data Rules

For user-specific cloud data:

- every table must include user_id or auth-linked id
- use Supabase RLS
- never expose service keys in the client
- use EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY only

## Code Rules

- Keep TypeScript strict-compatible.
- Avoid `any` unless existing code forces it.
- Keep functions small.
- Avoid duplicate calculations across screens.
- Put reusable calculations in utils.
- Avoid large rewrites.
- Do not add dependencies unless there is a clear benefit.

## Before Coding

Always inspect:

- relevant screen
- related context
- related types
- related components
- existing constants

Then give a short implementation plan before editing.
