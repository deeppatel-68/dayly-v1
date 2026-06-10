# Dayly Feature Build Skill

Use this skill whenever implementing a new feature.

## Workflow

1. Inspect the repo files related to the feature.
2. Summarise what already exists.
3. Identify the smallest useful implementation.
4. Modify only necessary files.
5. Keep the existing style.
6. Add or update types.
7. Add graceful empty/loading/error states.
8. Explain how to test.

## MVP Bias

Prefer a simple working MVP over a huge perfect system.

For every feature, ask:

- Does it support the core loop?
- Can it be tested quickly?
- Does it fit the current app style?
- Is it deployable?
- Does it avoid unnecessary complexity?

## Core Dayly Loop

Choose habits → complete habits/study → earn XP/coins → keep streak → unlock cosmetics → customise avatar → compare with friends.

## Implementation Rules

- Do not implement unrelated roadmap items.
- Do not create placeholder-only features unless asked.
- Do not add backend tables unless needed.
- Do not change existing UX unless it improves the feature.
- Use existing components and constants.
- Keep token usage low by not printing full files.

## Final Response Format

After coding, respond with:

- What changed
- Files modified
- How to test
- Known limitations
- Suggested next step
