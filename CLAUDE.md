# CLAUDE.md: moosii-games conventions

Small daily puzzles for Moosii, built in isolation. Read `README.md` for the layout and
`docs/puzzle-schema.md` for the contract.

## Layer rules (lint-enforced; keep them that way)

- `src/core/`: pure TypeScript. No `react`, `react-dom`, DOM or browser globals, no timers,
  no network. No imports from `src/react` or `src/web`.
- `src/react/`: shared hooks. May import `react` and `src/core`. No `react-dom`, no DOM APIs,
  no `src/web`. This layer is reused unchanged in React Native (moosii-rn).
- `src/web/components/`: DOM renderer. Layout and styling only; all game behaviour comes from
  the hook. Plain CSS with `--mg-*` tokens, no UI library. Must not import from
  `src/web/playground`. Gets copied into moosii-reader as-is.
- `src/web/playground/`: test scaffolding only. Nothing else may depend on it.

If a change needs to break one of these rules, the design is wrong. Move the logic down a
layer instead of loosening `eslint.config.js` or `tsconfig.portable.json`.

## The schema doc is the contract

- `docs/puzzle-schema.md`, `src/core/types.ts` and `src/core/validate.ts` must always agree.
  `validate.ts` has a compile-time check that the zod schema matches the types; keep it.
- Changing the puzzle shape or the completion event shape is a breaking change: bump the
  relevant `schema_version` and update the types, validator, tests and doc in the same commit.
- `puzzle_id` seeds the starting layout. Don't change the shuffle algorithm or seed format
  without a deliberate decision. There's a snapshot test guarding it.

## No points on the client

- The completion event carries no points, score, reward or "Moosies" fields. Points are
  awarded server-side.
- The game never sends events anywhere. It hands them to `onComplete`; the host decides.
- No Supabase, auth, network calls, streaks, scheduling or check-in handoff in this repo.

## Naming and look

- The player-facing name comes only from `GAME_DISPLAY_NAME` in `src/core/constants.ts`
  (placeholder "Groups"). Don't hard-code it elsewhere.
- Do not use any New York Times game names, wording or visual style, anywhere: UI, copy,
  docs, identifiers or code comments.

## Design rules (hard requirements)

- No timers anywhere: no countdowns, no time limits, no auto-dismissing messages.
- Solved or revealed groups are identified by label + a distinct icon + a distinct pattern,
  never colour alone. The palette must not rely on red vs green.
- Base font at least 18px; tap targets at least 44px; fully keyboard operable; visible focus.
- Honour `prefers-reduced-motion` and `prefers-contrast` (and `forced-colors`).
- Selection state is shown with more than colour (a tick plus `aria-pressed`).
- Don't break words mid-word on tiles; on narrow boards the grid drops to two columns
  rather than shrinking text below 18px.

## Content

- Fixtures are placeholders: title them "FIXTURE — NOT REVIEWED CONTENT" and keep
  `makes_health_claim: false`. No health claims in cancer-domain fixtures.

## Checks before committing

`npm run lint`, `npm test` and `npm run build` must all pass with no warnings.
