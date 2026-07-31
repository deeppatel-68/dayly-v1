# Profile and Auth Companion Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring Profile, sign-in, password recovery, and password reset into the Ember Nocturne Companion Gallery system without changing authentication or progress behavior.

**Architecture:** Reuse `StudioPrimitives`, semantic theme colors, and `StudioType` rather than introducing a separate auth theme. Keep all Supabase calls, routes, validation rules, and current account actions intact; the work is limited to layout, copy hierarchy, input affordances, and accessible interaction feedback.

**Tech Stack:** Expo Router, React Native, TypeScript, Expo vector icons, existing Dayly theme contexts.

## Global Constraints

- Preserve all existing Supabase authentication calls, reset-password redirect URLs, validation, and error handling.
- Preserve the Ember Nocturne dark palette and the existing adaptive light theme.
- Use 44pt minimum interactive targets and existing `StudioType`, `Spacing`, `BorderRadius`, `StudioButton`, `StudioGroup`, `StudioRow`, and `StudioSheet` where appropriate.
- Do not touch 3D companion, shop catalog, Supabase migrations, progress contexts, or navigation destinations.
- Use system type for utility UI; reserve Outfit for the `dayly` wordmark and companion-specific copy.

---

### Task 1: Profile Gallery Refresh

**Files:**
- Modify: `app/profile.tsx`

**Interfaces:**
- Consumes: `useAuth()`, `useCharacter()`, `useHabits()`, `useXp()`, and `useTheme()` exactly as currently used.
- Produces: the same edit-username, companion-customise, friends, appearance, and sign-out actions with a more deliberate visual hierarchy.

- [ ] **Step 1: Preserve the profile data contract**

Keep `username`, `email`, `level`, `xp`, habit metrics, companion navigation, theme toggle, and `confirmSignOut` unchanged. Do not add persistence or fields.

- [ ] **Step 2: Recompose the profile header**

Make the account identity a clear gallery header: compact context label, avatar monogram, username/edit affordance, email, and a quiet progress badge. Keep username editing in `StudioSheet`; the sheet must retain the exact `updateUsername(nextUsername)` behavior and current loading/error states.

- [ ] **Step 3: Refine grouped settings**

Use existing studio groups for identity-adjacent activity, companion, community, appearance, and sign-out actions. Maintain visible chevrons only for navigations and use the existing destructive treatment only for sign out.

- [ ] **Step 4: Improve accessibility and responsive layout**

Give the header controls descriptive labels, preserve `numberOfLines` for long emails and usernames, and use only stable flex layouts so dynamic type does not overlap the edit action or metrics.

- [ ] **Step 5: Validate**

Run `npm run lint` and `npm run typecheck`. Manually verify username edit, theme toggle, companion navigation, friends navigation, and sign-out confirmation.

### Task 2: Auth and Password Recovery Refresh

**Files:**
- Modify: `src/components/auth/AuthScreen.tsx`
- Modify: `app/auth/reset-password.tsx`

**Interfaces:**
- Consumes: `signIn(email, password)`, `signUp(email, password)`, `supabase.auth.resetPasswordForEmail`, `supabase.auth.updateUser`, and the current Expo Router URLs.
- Produces: visual and interaction polish only; no changed routes, request payloads, or auth messages that materially change user expectations.

- [ ] **Step 1: Preserve all auth flows**

Keep sign-in, sign-up confirmation, forgot-password, and reset-password calls intact. Retain `Linking.createURL("/auth/reset-password")` and `router.replace("/")` after a successful password reset.

- [ ] **Step 2: Establish a focused entry composition**

Use a restrained wordmark, a display-style welcome/title moment, explanatory copy, and an opaque elevated form surface. Add visible email/password labels or reliably accessible equivalents, focused borders through `colors.focusRing`, and adequate keyboard-safe scrolling.

- [ ] **Step 3: Clarify auth mode and recovery actions**

Distinguish primary sign-in/sign-up action from mode switching and password recovery with hierarchy, not extra decoration. Preserve the current loading lockout and make disabled/loading states evident through opacity and accessibility state.

- [ ] **Step 4: Align password reset**

Use the same form surface, title scale, labels, input treatment, primary action, and quiet return action in the reset route. Replace hardcoded white button content with `colors.onAccent`; retain every validation and alert branch.

- [ ] **Step 5: Validate**

Run `npm run lint`, `npm run typecheck`, and `npm test`. Manually confirm sign-in, sign-up confirmation, forgot-password submission, reset-password mismatch validation, and light/dark presentation.

### Task 3: Integration Review

**Files:**
- Review: `app/profile.tsx`
- Review: `src/components/auth/AuthScreen.tsx`
- Review: `app/auth/reset-password.tsx`

- [ ] **Step 1: Inspect the implemented diff**

Check that every changed control still has its original callback and that no unrelated services, data contracts, or navigation destinations changed.

- [ ] **Step 2: Run full validation**

Run `git diff --check`, `npm run lint`, `npm run typecheck`, and `npm test`.

- [ ] **Step 3: Perform visual verification**

Launch the Expo app and inspect Profile, sign-in, forgot-password, and reset-password on a compact iPhone viewport. Confirm text fits, all primary controls meet 44pt targets, and keyboard interaction leaves the submit action reachable.
