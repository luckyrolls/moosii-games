# Puzzle schemas

This document is the **contract** for puzzle files and for the completion events the games
emit. Puzzle authoring tools, the Moosii backend and every renderer (web, React Native)
depend on it. Each game's TypeScript types and runtime validator implement exactly what is
written here, and a compile-time check in each validator fails the build if the two drift apart:

| Game | Types | Validator |
| --- | --- | --- |
| `groups` | [`src/core/types.ts`](../src/core/types.ts) | [`src/core/validate.ts`](../src/core/validate.ts) |
| `word` | [`src/core/word/types.ts`](../src/core/word/types.ts) | [`src/core/word/validate.ts`](../src/core/word/validate.ts) |
| `jigsaw` | [`src/core/jigsaw/types.ts`](../src/core/jigsaw/types.ts) | [`src/core/jigsaw/validate.ts`](../src/core/jigsaw/validate.ts) |

Changing anything here is a breaking change: bump that game's `schema_version` and update the
types, validator, tests and this file together.

**Shared text rules** (both games): player-facing text must be non-blank and must not start or
end with whitespace (rejected, never trimmed); fields noted as "blank-free" must also not
contain a run of 2+ underscores. Unknown fields are rejected. Values are never transformed.
Errors are reported as `path: message`, all at once.

---

# Groups (`game: "groups"`, v1)

## Groups puzzle file

```ts
interface GroupsPuzzle {
  schema_version: 1;
  game: "groups";
  puzzle_id: string;
  domain: "moosii" | "financial" | "cancer";
  title: string;
  groups: PuzzleGroup[]; // exactly 4
}

interface PuzzleGroup {
  label: string;
  items: string[];            // exactly 4
  difficulty: 1 | 2 | 3 | 4;  // each value used exactly once per puzzle
  source_lesson_ids: string[];
  makes_health_claim: boolean;
}
```

### Fields

| Field | Type | Rules |
| --- | --- | --- |
| `schema_version` | `1` | Must be exactly `1`. |
| `game` | `"groups"` | Must be exactly `"groups"`. |
| `puzzle_id` | string | Required, not blank. Stable forever: it seeds the starting tile layout, so every player sees the same board, and it identifies the puzzle in completion events. |
| `domain` | `"moosii"` \| `"financial"` \| `"cancer"` | `moosii` = parenting, `financial` = money, `cancer` = life after cancer. |
| `title` | string | Required, not blank, no leading/trailing whitespace. Shown to the player. |
| `groups` | array | Exactly 4 groups. |
| `groups[].label` | string | Required, not blank, no leading/trailing whitespace, no run of 2+ underscores. Shown when the group is found or revealed. |
| `groups[].items` | string[] | Exactly 4 non-blank strings, none with leading/trailing whitespace. Shown on the tiles. |
| `groups[].difficulty` | `1`–`4` | 1 is the most straightforward group, 4 the trickiest. Each value appears exactly once across the 4 groups. |
| `groups[].source_lesson_ids` | string[] | IDs of the lessons the group draws on. May be empty. Entries must not be blank. |
| `groups[].makes_health_claim` | boolean | Required. `true` flags the group for clinical review before publishing. |

### Cross-field rules

- **Items are unique across the whole puzzle**, compared case-insensitively (`"Swing"` and
  `"swing"` count as duplicates, because they would read as the same tile).
- **Each difficulty 1–4 is used exactly once.**
- **No unknown fields**, at the top level or inside a group. Misspelt fields are errors, not
  silently ignored.
- **No leading or trailing whitespace** in `title`, any `label` or any item (spaces, tabs,
  newlines). It is rejected rather than trimmed, for example
  `groups[1].label: must not start or end with whitespace`. Whitespace inside the text is fine.
  A value that is entirely whitespace gets only the non-blank error.
- **No blanks in labels.** A `label` must not contain two or more underscores in a row
  (`"___ rate"`): `groups[3].label: use a word instead of a blank — screen readers read underscores aloud`.
  Write it out instead, e.g. `"Comes before rate"`. A single underscore is allowed.
- **Values are not transformed.** Validation never trims or rewrites text; what is in the file
  is what players see.

Validation reports every problem it finds, each as `path: message`, for example
`groups[1].items[3]: item "Cash" duplicates groups[0].items[0]; items must be unique across the whole puzzle`.

### Example

```json
{
  "schema_version": 1,
  "game": "groups",
  "puzzle_id": "fixture-financial-001",
  "domain": "financial",
  "title": "Money basics",
  "groups": [
    { "label": "Ways to pay", "items": ["Cash", "Card", "Cheque", "Transfer"], "difficulty": 1, "source_lesson_ids": ["lesson-1"], "makes_health_claim": false },
    { "label": "Found on a payslip", "items": ["Gross pay", "Net pay", "Tax code", "Deductions"], "difficulty": 2, "source_lesson_ids": [], "makes_health_claim": false },
    { "label": "Kinds of savings account", "items": ["Easy access", "Fixed term", "Notice", "Regular saver"], "difficulty": 3, "source_lesson_ids": [], "makes_health_claim": false },
    { "label": "Comes before rate", "items": ["Interest", "Exchange", "Base", "Flat"], "difficulty": 4, "source_lesson_ids": [], "makes_health_claim": false }
  ]
}
```

## Groups completion event

Emitted once, through the `onComplete` callback of `useGroupsGame`, when a game ends. The
game never sends it anywhere; the host app decides what to do with it.

```ts
interface GroupsCompletionEvent {
  schema_version: 1;
  game: "groups";
  puzzle_id: string;
  outcome: "solved" | "revealed";
  mistakes: number;
  solve_order: number[];
  completed_local_date: string; // "YYYY-MM-DD"
}
```

| Field | Meaning |
| --- | --- |
| `schema_version` | Version of the event shape (independent of the puzzle `schema_version`). Currently `1`. |
| `game` | Always `"groups"`. |
| `puzzle_id` | The puzzle that was played. |
| `outcome` | `"solved"`: the player found all 4 groups. `"revealed"`: the game ended with groups shown, either because the mistake limit was reached or because the player chose "Show answers". |
| `mistakes` | Wrong guesses submitted. Re-submitting a set already tried does not count. |
| `solve_order` | Indices into `puzzle.groups` (0-based), in the order the player found them. Groups shown by revealing are **not** included, so a revealed game can have fewer than 4 entries. |
| `completed_local_date` | The player's local calendar date (device time zone) when the game ended. |

**The event carries no points, score or reward fields.** Points are awarded server-side later.

## Groups share text

The share grid is one row per submitted guess, four squares per row, each square showing
which group (by difficulty) that guessed item belonged to:

| Difficulty | Square |
| --- | --- |
| 1 | 🟧 |
| 2 | 🟦 |
| 3 | 🟪 |
| 4 | 🟫 |

It contains no item text, no labels, no title and no score.

## Groups rules the contract assumes

- Mistake limit is a config value, `maxMistakes: number | null`. `null` (the default) is
  relaxed mode: the game never ends on mistakes.
- A guess with exactly three items from one group is reported as "one away".
- There are no timers.

---

# Word (`game: "word"`, v1)

A single-word puzzle tied to exactly one lesson or activity the person has done or is on.
Daily selection is decided elsewhere; this contract only covers one puzzle.

## Word puzzle file

```ts
interface WordPuzzle {
  schema_version: 1;
  game: "word";
  puzzle_id: string;
  domain: "moosii" | "financial" | "cancer";
  title: string;
  answer: string;              // A–Z uppercase only, 4–8 letters
  hint: string;
  takeaway: string;
  source_lesson_id?: string;   // exactly one of these two is present
  source_activity_id?: string;
  makes_health_claim: boolean; // covers hint + takeaway
}
```

| Field | Type | Rules |
| --- | --- | --- |
| `schema_version` | `1` | Must be exactly `1`. |
| `game` | `"word"` | Must be exactly `"word"`. |
| `puzzle_id` | string | Required, not blank. Identifies the puzzle in completion events. |
| `domain` | `"moosii"` \| `"financial"` \| `"cancer"` | Same meaning as for Groups. |
| `title` | string | Required, not blank, no leading/trailing whitespace. Shown to the player. |
| `answer` | string | Only the letters `A`–`Z`, uppercase, 4–8 of them. No spaces, accents, digits or punctuation. |
| `hint` | string | Required, not blank, no leading/trailing whitespace, blank-free (no `__`). Shown when the player asks for it, and at the end. |
| `takeaway` | string | Required, not blank, no leading/trailing whitespace, blank-free. Shown prominently when the game ends. |
| `source_lesson_id` | string, optional | Not blank if present. |
| `source_activity_id` | string, optional | Not blank if present. |
| `makes_health_claim` | boolean | Required. Covers both `hint` and `takeaway`; `true` flags the puzzle for clinical review. |

### Cross-field rules

- **Exactly one of `source_lesson_id` / `source_activity_id`.** Neither, or both, is an error:
  `puzzle: must have exactly one of source_lesson_id or source_activity_id (both given)`.
- **No unknown fields.**
- The answer does **not** need to appear in the guess dictionary; it is always accepted as a guess.

### Example

```json
{
  "schema_version": 1,
  "game": "word",
  "puzzle_id": "fixture-word-financial-01",
  "domain": "financial",
  "title": "Planning your money",
  "answer": "BUDGET",
  "hint": "A plan for where your money goes",
  "takeaway": "A budget is a plan, not a judgment.",
  "source_lesson_id": "fixture-lesson-budget",
  "makes_health_claim": false
}
```

## Word completion event

Emitted once through `useWordGame`'s `onComplete` when a game ends. Never sent anywhere by the game.

```ts
interface WordCompletionEvent {
  schema_version: 1;
  game: "word";
  puzzle_id: string;
  outcome: "solved" | "revealed";
  guesses_count: number;
  hint_used: boolean;
  completed_local_date: string; // "YYYY-MM-DD"
}
```

| Field | Meaning |
| --- | --- |
| `schema_version` | Version of the event shape (independent of the puzzle `schema_version`). Currently `1`. |
| `outcome` | `"solved"`: the player typed the answer. `"revealed"`: the guess limit ran out, or the player chose "Show answer". |
| `guesses_count` | Accepted guesses, including the solving guess. Too-short, not-in-dictionary and repeated guesses don't count. |
| `hint_used` | Whether the player opened the hint before the game ended. |
| `completed_local_date` | The player's local calendar date (device time zone) when the game ended. |

**No points, score or reward fields, and no guessed words or answer.**

## Word share text

One row per accepted guess, one symbol per letter:

| Mark | Symbol | Meaning |
| --- | --- | --- |
| `in_place` | 🔵 | Right letter, right spot. |
| `elsewhere` | 🟠 | In the word, but in another spot. |
| `absent` | ⚪ | Not in the word (or no unmatched copies left). |

No letters, no word, no score. 🟩 🟨 ⬜ ⬛ are never used.

## Word rules the contract assumes

- **Scoring with repeated letters:** exact matches are credited first. Each remaining guessed
  letter, left to right, is `elsewhere` only while the answer still has an unmatched copy of
  it; otherwise `absent`. Example: answer `PACING`, guess `AAAAAA` → `absent, in_place, absent,
  absent, absent, absent`.
- **Dictionary:** the host injects `isValidWord(word)`. A guess it rejects shows a message and
  doesn't use a turn. The answer is always accepted.
- **Repeated guess:** shows a message and doesn't use a turn.
- **Guess limit:** config `maxGuesses: number | null`. `null` (default) is unlimited.
- **Hint:** can be opened once; recorded as `hint_used`.
- **Keyboard marks:** each letter shows the best mark seen so far (`in_place` > `elsewhere` > `absent`).
- There are no timers.

---

# Jigsaw (`game: "jigsaw"`, v1)

A square-tile picture puzzle: pick a tile, then another, and they swap. It is **personal**: in
the product the image is the approved illustration from a lesson the person has completed.
Daily selection and image hosting are decided elsewhere; this contract covers one puzzle.

## Jigsaw puzzle file

```ts
interface JigsawPuzzle {
  schema_version: 1;
  game: "jigsaw";
  puzzle_id: string;
  domain: "moosii" | "financial" | "cancer";
  title: string;
  image: {
    src: string;    // URL or path of the approved lesson illustration
    width: number;  // intrinsic pixels, positive integer
    height: number; // intrinsic pixels, positive integer
    alt: string;    // describes the picture for screen readers
  };
  source_lesson_id: string;
}
```

| Field | Type | Rules |
| --- | --- | --- |
| `schema_version` | `1` | Must be exactly `1`. |
| `game` | `"jigsaw"` | Must be exactly `"jigsaw"`. |
| `puzzle_id` | string | Required, not blank. Seeds the starting layout (with the difficulty) and identifies the puzzle in completion events. |
| `domain` | `"moosii"` \| `"financial"` \| `"cancer"` | Same meaning as for Groups. |
| `title` | string | Required, not blank, no leading/trailing whitespace. Shown to the player and on finish. |
| `image.src` | string | Required, not blank, no leading/trailing whitespace. |
| `image.width`, `image.height` | integer | Positive whole numbers of pixels. |
| `image.alt` | string | Required, not blank, no leading/trailing whitespace. Read to screen readers when the picture is complete. |
| `source_lesson_id` | string | Required, not blank. The completed lesson the image comes from. |

### Cross-field rules

- **Aspect** (`width / height`) must be between **1.6 and 2.1** inclusive (the lesson-image rule),
  e.g. `image: aspect ratio (width / height) must be between 1.6 and 2.1, got 1.20`.
- **Long edge** (`max(width, height)`) must be at least **1200 px**:
  `image: the long edge must be at least 1200 px, got 1000`.
- **No unknown fields**, at the top level or inside `image`.

### Example

```json
{
  "schema_version": 1,
  "game": "jigsaw",
  "puzzle_id": "fixture-jigsaw-financial-01",
  "domain": "financial",
  "title": "Growing savings",
  "image": {
    "src": "images/growing-savings.png",
    "width": 1600,
    "height": 900,
    "alt": "Three glass jars on a wooden shelf holding a small, a medium and a tall stack of gold coins, beside a potted plant with a new shoot, above a striped rug."
  },
  "source_lesson_id": "fixture-lesson-saving-habits"
}
```

## Jigsaw completion event

Emitted once through `useJigsawGame`'s `onComplete` when a game ends. Never sent anywhere by the game.

```ts
interface JigsawCompletionEvent {
  schema_version: 1;
  game: "jigsaw";
  puzzle_id: string;
  difficulty: "gentle" | "medium" | "harder";
  rows: number;
  cols: number;
  outcome: "solved" | "revealed";
  moves: number;
  used_peek: boolean;
  completed_local_date: string; // "YYYY-MM-DD"
}
```

| Field | Meaning |
| --- | --- |
| `difficulty` | The difficulty actually played. It can be easier than the one picked, if the screen was too narrow for that grid (see below). |
| `rows`, `cols` | The grid played. |
| `outcome` | `"solved"`: every tile placed. `"revealed"`: the player chose "Finish it for me". |
| `moves` | Swaps made. Picking and putting back a tile is not a move. |
| `used_peek` | Whether the player looked at the whole picture during the game. |
| `completed_local_date` | The player's local calendar date (device time zone) when the game ended. |

**No points, score or reward fields.** There is no share text for Jigsaw.

## Jigsaw rules the contract assumes

- **Grid sizing:** difficulty `gentle` / `medium` / `harder` aims for about 8 / 15 / 28 tiles.
  For an image of aspect `a`, rows are chosen so that `cols = round(rows * a)` gives a total
  closest to the target (ties go to fewer tiles), which keeps tiles close to square. Examples:
  aspect 1.6 → 2x3, 3x5, 4x6; aspect 1.8 → 2x4, 3x5, 4x7; aspect 2.1 → 2x4, 3x6, 4x8.
- **Minimum tile size:** with the board as wide as the screen allows, if a tile would be
  smaller than `minTilePx` (default 44 px) on either side, the next easier grid is used.
- **Starting layout:** seeded by `puzzle_id` and the difficulty played; no tile starts in its
  correct cell.
- **Moves:** pick a tile, then another, and they swap. Picking the same tile again puts it
  back. A tile in its correct cell is in place and can't be picked.
- **Peek** shows the whole picture while toggled on; using it is recorded, never penalised.
- No timer, no move limit.

