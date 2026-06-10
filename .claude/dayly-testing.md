# Dayly Testing Skill

Use this skill after code changes.

## Required Checks

After implementing a feature, check:

- TypeScript errors
- lint errors
- Expo compatibility
- import paths
- missing dependencies
- invalid hooks usage
- broken navigation
- dark/light mode
- loading state
- empty state
- error state

## Commands

Prefer:
npm run lint
npm run typecheck
npx expo-doctor

If typecheck script does not exist, suggest adding:
"typescript": "tsc --noEmit"

## Manual Test Format

Provide manual test steps:

1. Start app
2. Sign in
3. Navigate to changed screen
4. Perform feature action
5. Confirm expected UI/state
6. Restart app if persistence is involved

## Bug Fixing Rule

If a check fails:

- identify the exact cause
- fix the smallest possible area
- do not rewrite unrelated code
