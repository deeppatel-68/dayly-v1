## Prioritized findings

### 1. Critical — Legacy migration RPC permits arbitrary economy and leaderboard inflation

References: [settingsService.ts:154](/Users/deeppatel/dayly-v1/src/services/settingsService.ts:154), [settingsService.ts:189](/Users/deeppatel/dayly-v1/src/services/settingsService.ts:189), [settingsService.ts:213](/Users/deeppatel/dayly-v1/src/services/settingsService.ts:213), [AuthContext.tsx:63](/Users/deeppatel/dayly-v1/src/context/AuthContext.tsx:63), [slot_backed_shop_catalog.sql:298](/Users/deeppatel/dayly-v1/supabase/migrations/20260713000000_slot_backed_shop_catalog.sql:298), [slot_backed_shop_catalog.sql:316](/Users/deeppatel/dayly-v1/supabase/migrations/20260713000000_slot_backed_shop_catalog.sql:316), [slot_backed_shop_catalog.sql:349](/Users/deeppatel/dayly-v1/supabase/migrations/20260713000000_slot_backed_shop_catalog.sql:349), [slot_backed_shop_catalog.sql:383](/Users/deeppatel/dayly-v1/supabase/migrations/20260713000000_slot_backed_shop_catalog.sql:383), [slot_backed_shop_catalog.sql:492](/Users/deeppatel/dayly-v1/supabase/migrations/20260713000000_slot_backed_shop_catalog.sql:492).

The authenticated `migrate_legacy_user_data(jsonb)` RPC trusts client-provided `xp`, `coins`, focus totals, inventory, study-session arrays, and dates. It is server-idempotent, but only once per account; that does not make its contents trustworthy.

Exploit: a modified client creates a fresh account and calls the RPC before the stock client claims the migration:

- `xp = 1_000_000_000`
- `coins = 1_000_000_000`
- every active catalog item in `shop_items`
- hundreds of 28,800-second sessions ending this week

This immediately grants spendable coins, all cosmetics, inflated all-time XP, and arbitrary weekly focus. The app automatically attempts this RPC after authentication, confirming it is part of the normal client surface.

Recommended fix:

- Immediately `REVOKE EXECUTE ON FUNCTION public.migrate_legacy_user_data(jsonb) FROM authenticated` once the migration window closes.
- If migration must remain, restrict it to a server-created eligibility table populated only for accounts existing before a fixed cutoff.
- Apply hard caps and array-size limits.
- Client-only historical balances cannot be cryptographically trusted. Keep imported values non-spendable/non-ranked, or require independently stored server evidence before converting them into authoritative economy values.

### 2. High — Unlimited habit reward farming through create → complete → archive churn

References: [progression_integrity.sql:326](/Users/deeppatel/dayly-v1/supabase/migrations/20260711000000_progression_integrity.sql:326), [progression_integrity.sql:382](/Users/deeppatel/dayly-v1/supabase/migrations/20260711000000_progression_integrity.sql:382), [historical_habit_corrections.sql:55](/Users/deeppatel/dayly-v1/supabase/migrations/20260711020000_historical_habit_corrections.sql:55), [historical_habit_corrections.sql:62](/Users/deeppatel/dayly-v1/supabase/migrations/20260711020000_historical_habit_corrections.sql:62), [historical_habit_corrections.sql:67](/Users/deeppatel/dayly-v1/supabase/migrations/20260711020000_historical_habit_corrections.sql:67), [persist_user_progress.sql:111](/Users/deeppatel/dayly-v1/supabase/migrations/20260612000000_persist_user_progress.sql:111).

The five-habit limit counts only unarchived habits. Habit award idempotency is keyed by `(user_id, source_type, habit_id, award_date)`. A new habit UUID therefore creates new reward capacity.

Exploit:

1. Create a habit.
2. Complete it today for 10 XP and 5 coins.
3. Archive it.
4. Create another habit and repeat.

Because archiving frees an active-habit slot and every new habit has a new ID, this can mint unlimited XP and coins through fully authorized RPCs.

Recommended fix:

- Add a user/date-level reward cap independent of `habit_id`.
- In `set_habit_completion`, take a transaction/advisory lock for `(user_id, award_date)` and reject or suppress a new award after the daily maximum—normally five.
- Alternatively model five immutable habit slots, so archiving/recreating a habit cannot create new same-day reward capacity.
- Add a SQL regression test that repeatedly creates, rewards, and archives habits and asserts the daily economy cap.

The existing per-habit/date award-once check is server-side and works; it is simply scoped too narrowly.

### 3. Medium — Setup documentation and migrations describe materially different security models

References: [supabase-setup.sql:16](/Users/deeppatel/dayly-v1/docs/supabase-setup.sql:16), [supabase-setup.sql:73](/Users/deeppatel/dayly-v1/docs/supabase-setup.sql:73), [persist_user_progress.sql:68](/Users/deeppatel/dayly-v1/supabase/migrations/20260612000000_persist_user_progress.sql:68), [progression_integrity.sql:981](/Users/deeppatel/dayly-v1/supabase/migrations/20260711000000_progression_integrity.sql:981), [progression_permissions.sql:5](/Users/deeppatel/dayly-v1/supabase/migrations/20260711010000_progression_permissions.sql:5), [slot_backed_shop_catalog.sql:95](/Users/deeppatel/dayly-v1/supabase/migrations/20260713000000_slot_backed_shop_catalog.sql:95).

`docs/supabase-setup.sql` contains only profiles, habits, and completions and still grants direct habit/completion writes. The final migration state removes those writes and depends on eight additional tables plus RPCs.

Specific drift:

- Docs completion uniqueness is `(habit_id, completed_at)`; migrations use `(user_id, habit_id, completed_at)`. Running docs first leaves both constraints.
- Docs omit `updated_at`, `starts_on`, `archived_on`, friend fields, and every economy/social table.
- Docs policies use bare `CREATE POLICY`, so rerunning the setup script fails when policies already exist.
- Reapplying `20260711000000_progression_integrity.sql` after the slot migration can fail: its catalog/inventory inserts omit `equip_slot`, which is now `NOT NULL`.
- Reapplying early migrations out of sequence also recreates obsolete RPC definitions and broad policies, even if later table grants currently limit their usefulness.

Exploit/impact: an operator following the documented SQL can deploy an incomplete or older authorization model, causing either RPC failures or broader client writes if the later permission migration is missed.

Recommended fix:

- Make `supabase/migrations/` the sole deployment source.
- Replace the setup document with `supabase db reset`/migration instructions or a generated current-schema snapshot.
- Never reapply historical migrations after later schema changes; add forward-only corrective migrations.
- Add CI that builds a fresh database from the complete ordered migration set.

### 4. Medium — Direct profile updates bypass username and friend-code validation

References: [persist_user_progress.sql:190](/Users/deeppatel/dayly-v1/supabase/migrations/20260612000000_persist_user_progress.sql:190), [progression_permissions.sql:25](/Users/deeppatel/dayly-v1/supabase/migrations/20260711010000_progression_permissions.sql:25), [friends.sql:32](/Users/deeppatel/dayly-v1/supabase/migrations/20260712000000_friends.sql:32), [friends.sql:44](/Users/deeppatel/dayly-v1/supabase/migrations/20260712000000_friends.sql:44), [friends.sql:95](/Users/deeppatel/dayly-v1/supabase/migrations/20260712000000_friends.sql:95).

The `set_username` RPC enforces a 3–20-character format, but authenticated users retain table-wide `UPDATE` on their own profile. RLS limits which row can be changed, not which columns.

Exploit: a client directly updates its profile with an oversized/control-character username or an arbitrary malformed `friend_code`, bypassing both domain RPC validation and generated-code format. The case-insensitive unique indexes prevent stealing an existing username/code, so this does not permit cross-user takeover.

Recommended fix:

- Revoke general profile updates.
- Grant only required columns, for example insert access to `id,email` for signup and update access only to benign legacy fields.
- Route username and friend-code changes exclusively through validated `SECURITY DEFINER` RPCs.
- Add `CHECK` constraints for username and friend-code formats as defense in depth.

### 5. Medium — Wildcard username search enables non-friend account enumeration

References: [friends.sql:320](/Users/deeppatel/dayly-v1/supabase/migrations/20260712000000_friends.sql:320), [friends.sql:332](/Users/deeppatel/dayly-v1/supabase/migrations/20260712000000_friends.sql:332), [friends.sql:336](/Users/deeppatel/dayly-v1/supabase/migrations/20260712000000_friends.sql:336), [friends.sql:353](/Users/deeppatel/dayly-v1/supabase/migrations/20260712000000_friends.sql:353), [friendsService.ts:263](/Users/deeppatel/dayly-v1/src/services/friendsService.ts:263).

This is not SQL injection—the query uses no dynamic SQL. However, `%` and `_` are not escaped before `LIKE`.

Exploit: an authenticated user calls `search_users('%%')`; it passes the two-character minimum and matches every username, returning the first ten UUID/username pairs. Pattern refinement can enumerate additional users and reveal relationship state.

Recommended fix:

- Treat `%` and `_` as literals by escaping them and using `LIKE ... ESCAPE`.
- Enforce the same allowed-character/length rules as usernames.
- Consider returning no UUID until a friendship exists; `send_friend_request` already accepts a username.
- Add server-side throttling or audit limits for search calls.

No non-friend XP, streak, appearance, inventory, or study statistics are exposed by this function.

### 6. Low — Leaderboard XP and streak values are incomplete or stale

References: [friends.sql:466](/Users/deeppatel/dayly-v1/supabase/migrations/20260712000000_friends.sql:466), [friends.sql:482](/Users/deeppatel/dayly-v1/supabase/migrations/20260712000000_friends.sql:482), [progression_integrity.sql:610](/Users/deeppatel/dayly-v1/supabase/migrations/20260711000000_progression_integrity.sql:610), [progression_integrity.sql:622](/Users/deeppatel/dayly-v1/supabase/migrations/20260711000000_progression_integrity.sql:622), [progression_integrity.sql:284](/Users/deeppatel/dayly-v1/supabase/migrations/20260711000000_progression_integrity.sql:284).

“Weekly XP” sums only `xp_awards`, which records habit XP. Study-session XP is written to `study_sessions.xp` and `user_progress.xp`, so it is omitted from weekly rankings.

The leaderboard also reads stored `current_streak`; streak recalculation occurs when the owner calls `get_user_progress` or changes habits. A friend who stops opening the app can retain a stale streak on other users’ leaderboards.

Exploit/impact: a user earning 100 study XP can rank below someone earning 10 habit XP, while an inactive friend may retain an expired streak.

Recommended fix:

- Record every XP grant in one immutable reward ledger and calculate weekly XP from that ledger.
- Derive current streak during leaderboard generation, or run a scheduled server-side recalculation rather than relying on the ranked user opening the app.

### 7. Low — Friend codes are permanent bearer credentials generated with `random()`

References: [friends.sql:69](/Users/deeppatel/dayly-v1/supabase/migrations/20260712000000_friends.sql:69), [friends.sql:82](/Users/deeppatel/dayly-v1/supabase/migrations/20260712000000_friends.sql:82), [friends.sql:254](/Users/deeppatel/dayly-v1/supabase/migrations/20260712000000_friends.sql:254), [friends.sql:291](/Users/deeppatel/dayly-v1/supabase/migrations/20260712000000_friends.sql:291).

Possession of a friend code immediately creates an accepted friendship and unlocks stats. Codes use PostgreSQL `random()`, have no expiry/rotation workflow, and the RPC has no throttling.

Exploit: a leaked or predicted code can be used without the owner approving a request. Online brute force against the full eight-character space is impractical, so severity is low.

Recommended fix: use cryptographic randomness, add RPC throttling, permit rotation, and consider making codes create pending requests rather than immediate accepted friendships.

## Final RLS/access coverage

Assuming every migration is applied in filename order:

| Table | Final direct client access |
|---|---|
| `profiles` | Own select/insert/update; no delete |
| `habits` | Own select only; mutations through RPC |
| `habit_completions` | Own select only; mutations through RPC |
| `user_progress` | Own select only; server-owned writes |
| `xp_awards` | Own select only; server-owned writes |
| `study_sessions` | Own select only; server-owned writes |
| `user_shop_items` | Own select only; server-owned purchase/equip |
| `user_settings` | Own select/insert/update; no delete |
| `shop_catalog` | Authenticated read-only |
| `user_data_migrations` | No client table policies or grants |
| `friendships` | Select only when requester/addressee; mutations through RPC |

I found no direct way to read or write another user’s habits, completions, raw progress, settings, sessions, or inventory. Friendship acceptance verifies that the caller is the addressee; accepted-friend leaderboard membership is correctly restricted to self plus accepted friends. Non-friends can only be searched by username/UUID. No dynamic-SQL injection was found.

Auth/config hygiene is good: the client loads only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` ([supabase.ts:5](/Users/deeppatel/dayly-v1/src/lib/supabase.ts:5)); `.env.example` explicitly requires the public key ([.env.example:3](/Users/deeppatel/dayly-v1/.env.example:3)); the local key classifies as a Supabase publishable key; `.env` is ignored; and no tracked service-role/private key was found.

| Priority | Finding | Severity |
|---:|---|---|
| 1 | Untrusted legacy migration grants economy and ranking values | Critical |
| 2 | Habit archive/recreate reward farming | High |
| 3 | Setup/migration security drift and reapplication failures | Medium |
| 4 | Profile update bypasses domain validation | Medium |
| 5 | Wildcard account enumeration | Medium |
| 6 | Incomplete/stale leaderboard metrics | Low |
| 7 | Permanent non-cryptographic friend codes | Low |
