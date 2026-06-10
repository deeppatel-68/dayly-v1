# Dayly Supabase Skill

Use this skill whenever working with Supabase, auth, database tables, RLS, friends, profiles, cloud sync, or deployment data.

## Supabase Rules

Client may only use:

- EXPO_PUBLIC_SUPABASE_URL
- EXPO_PUBLIC_SUPABASE_ANON_KEY

Never expose:

- service role key
- private database credentials

## Existing Tables Expected

Current app expects:

- profiles
- habits
- habit_completions

## Future Tables

Likely future tables:

- xp_events
- user_stats
- study_sessions
- friendships
- activity_feed
- cheers
- shop_inventory
- equipped_items

## RLS Rules

Every user-owned table needs RLS.
Users should only access rows they own, except public/friend-visible feed data.

Use policies based on:

- auth.uid()
- user_id
- friend relationship where needed

## Migration Rule

When adding database features:

1. Provide SQL migration.
2. Explain required RLS policies.
3. Update TypeScript types if needed.
4. Handle loading/error states in app.
5. Avoid breaking local dev if table does not exist unless feature requires it.

## MVP Approach

For fast MVP:

- Keep XP/coins local if needed.
- Move to Supabase once social/leaderboards need shared data.
- Do not overbuild backend before the product loop works.
