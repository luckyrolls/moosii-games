# CLAUDE.md: moosii-games conventions

Small daily puzzles for Moosii, built in isolation. Read `README.md` for the layout and
`docs/puzzle-schema.md` for the contract.

## Games

- **Groups**: `src/core` (top level), `useGroupsGame`, `src/web/components/GroupsBoard`,
  fixtures in `fixtures/*.json`.
- **Word of the Day**: `src/core/word`, `useWordGame`, `src/web/components/word/WordBoard`,
  fixtures in `fixtures/word/`. Each puzzle is tied to exactly one lesson or activity.
- **Jigsaw**: `src/core/jigsaw`, `useJigsawGame`, `src/web/components/jigsaw/JigsawBoard`,
  fixtures in `fixtures/jigsaw/` (images in `fixtures/jigsaw/images/`). Personal: the picture is
  the approved illustration from a lesson the person has **completed**; at integration images
  come only from completed lessons, never from this repo or another source.

New games follow the same shape: engine + schema in `src/core/<game>/`, a hook in `src/react/`,
a board in `src/web/components/<game>/`, fixtures in `fixtures/<game>/`, a playground entry.
Shared helpers live in `src/core/schemaRules.ts` (text rules, issue formatting) and
`src/core/date.ts`. Work on one game must leave the others' behaviour and tests unchanged.

## Layer rules (lint-enforced; keep them that way)

- `src/core/`: pure TypeScript. No `react`, `react-dom`, DOM or browser globals, no timers,
  no network. No imports from `src/react` or `src/web`.
- `src/react/`: shared hooks. May import `react` and `src/core`. No `react-dom`, no DOM APIs,
  no `src/web`. This layer is reused unchanged in React Native (moosii-rn).
- `src/web/components/`: DOM renderer. Layout and styling only; all game behaviour comes from
  the hook. Plain CSS with `--mg-*` tokens, no UI library. Must not import from
  `src/web/playground`. Gets copied into moosii-reader as-is.
- `src/web/wordlist/`: lazily loaded ENABLE dictionary (public domain, see its NOTICE.md).
  Hosts load it and inject `isValidWord`; `src/core` and `src/react` never import it, and it
  must stay out of the main bundle (one dynamic chunk per word length).
- `src/web/playground/`: test scaffolding only. Nothing else may depend on it.

If a change needs to break one of these rules, the design is wrong. Move the logic down a
layer instead of loosening `eslint.config.js` or `tsconfig.portable.json`.

## The schema doc is the contract

- `docs/puzzle-schema.md` and each game's `types.ts` / `validate.ts` must always agree. Each
  validator has a compile-time check that the zod schema matches the types; keep it.
- Changing a puzzle shape or a completion event shape is a breaking change: bump the
  relevant `schema_version` and update the types, validator, tests and doc in the same commit.
- Groups: `puzzle_id` seeds the starting layout. Don't change the shuffle algorithm or seed
  format without a deliberate decision. There's a snapshot test guarding it.
- Word: duplicate-letter scoring (in-place first, then elsewhere against remaining counts) is
  part of the contract and heavily tested; keep those tests.

## No points on the client

- Completion events carry no points, score, reward or "Moosies" fields. Points are awarded
  server-side. The word event also never carries guessed words or the answer.
- The games never send events anywhere. They hand them to `onComplete`; the host decides.
- No Supabase, auth, network calls, streaks, daily selection, scheduling or check-in handoff
  in this repo.

## Naming and look

- Player-facing names come only from `GAME_DISPLAY_NAME` (`src/core/constants.ts`, placeholder
  "Groups"), `WORD_DISPLAY_NAME` (`src/core/word/constants.ts`, placeholder "Word of the
  Day") and `JIGSAW_DISPLAY_NAME` (`src/core/jigsaw/constants.ts`, placeholder "Jigsaw").
  Don't hard-code them elsewhere.
- Do not use any New York Times game names, wording, colours or visual style, anywhere: UI,
  copy, docs, identifiers or code comments.
- Word share text uses only 🔵 🟠 ⚪, never 🟩 🟨 ⬜ ⬛. Word marks are a blue filled disc
  (in place), an orange ring (elsewhere) and a muted cell with a dash (absent). No flip
  animation.

## Design rules (hard requirements)

- No timers in the puzzles: no countdowns, no time limits, no auto-dismissing messages, no
  `setTimeout` / `requestAnimationFrame` tricks in components. The one scoped exception is
  Take a Moment's pacing clock (see below).
- Groups: solved or revealed groups are identified by label + a distinct icon + a distinct
  pattern, never colour alone. Word: every mark pairs a shape with its colour.
- The palette must not rely on red vs green.
- Base font at least 18px; tap targets at least 44px; fully keyboard operable; visible focus;
  works at 375px width with no horizontal scroll.
- Honour `prefers-reduced-motion` and `prefers-contrast` (and `forced-colors`).
- Groups selection is shown with more than colour (a tick plus `aria-pressed`).
- Groups tiles never break words mid-word; on narrow boards the grid drops to two columns
  rather than shrinking text below 18px.
- Word keyboard: on narrow boards QWERTY halves stack five keys wide so keys stay >= 44px.
  Physical keyboard works too. Guess results are announced through an aria-live region.

## Jigsaw rules

- Square tiles and a swap mechanic only: no knobbed pieces, no drag-and-drop, no image
  libraries. Web shows tiles with CSS `background-position`; React Native with `Image` inside a
  view with `overflow: 'hidden'`.
- Images must be landscape, aspect 1.6–2.1, long edge >= 1200 px, with non-empty alt text
  (validated). Grid sizing (`chooseJigsawGrid`) steps down to an easier grid so **no tile is
  ever smaller than 44px/pt**; keep that guarantee and its tests.
- The starting layout is seeded by `puzzle_id` + difficulty played, with no tile starting in
  place; a snapshot test guards it.
- No timer, no move limit, no move counter on screen, nothing that reads as failing. Peek and
  "Finish it for me" are always available; using them is recorded, not penalised.
- The completion event has no points and records the difficulty actually played.
- Swaps animate briefly (CSS transform / native-driven `Animated`) and are instant under
  reduced motion; the picked tile is raised and outlined, never colour alone.

## Take a Moment (relaxation, not a game)

- Lives in `src/core/moment/`, `useBreathing` / `useRipples` / `useGrounding`, and
  `src/web/components/moment/`. Visibly separate from Daily Games in every host.
- **No goals, scores, points, streaks, completion events or "finished" states, by design.**
  Nothing is typed, saved or sent. Don't add an `onComplete`, a counter, a "well done" or a
  progress bar that implies success or failure.
- **Breathing patterns and the grounding script are clinician-owned config**, loaded from
  `fixtures/moment/*.json` and validated (inhale/exhale 2–10 s, holds 0–2 s, unknown fields
  rejected; grounding must be 5-4-3-2-1). Don't hard-code patterns or prompts in components.
  Fixtures are marked "FIXTURE — PENDING CLINICIAN REVIEW".
- On-screen breathing words are only "Breathe in", "Breathe out" and "Pause". No claims about
  effects anywhere (copy, docs, comments, config).
- **Time:** `src/core` and `src/react` stay timer-free; hooks take an injected `MomentClock`.
  `src/web/components/moment/clock.ts` (and the RN example's `rnClock`) is the only place that
  schedules anything, and only to pace breathing phases. Never show a countdown.
- **Animation:** CSS transitions/keyframes on web, core `Animated` with `useNativeDriver` on
  React Native. No new libraries (no canvas, Skia, Reanimated, audio). No sound in v1.
- **Reduced motion:** flower fades instead of scaling; ripples fade in place; leaves still.
- Always-visible way to leave; >= 44px targets; keyboard operable on web (the pond takes
  arrows + Enter); no red/green reliance.

## Known iOS pitfalls (React Native renderers, incl. moosii-rn)

- **Narrow single glyphs can vanish.** In Word of the Day on iOS, a typed bold capital "I"
  left an empty box: the letter was in the game state but not drawn, so the next letter
  looked like it skipped a box. Cause: a `Text` that shrink-wraps a single narrow glyph inside
  a centred container (`alignItems: 'center'`) can be measured a fraction too narrow on iOS
  and clipped to nothing. Fix pattern: give single-letter `Text` (grid cells, keyboard keys,
  tiles) `width: '100%'` and `textAlign: 'center'` inside its fixed-size box, instead of
  relying on the parent to centre a shrink-wrapped `Text`. Web is unaffected. See
  `cellText` / `keyText` in `examples/rn/src/WordScreen.tsx`. A JS unit test can't catch
  this; check on a real iPhone, typing I, J, L and T.

## Content

- Fixtures are placeholders: Groups titles contain "FIXTURE — NOT REVIEWED CONTENT", Word
  titles contain "(FIXTURE — NOT REVIEWED CONTENT)". Keep `makes_health_claim: false`. No
  health claims in cancer-domain fixtures.
- Labels, hints and takeaways never use "___" blanks (screen readers read them aloud).

## Checks before committing

`npm run lint`, `npm test` and `npm run build` must all pass with no warnings.
