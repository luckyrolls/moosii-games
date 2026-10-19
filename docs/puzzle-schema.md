# Groups puzzle schema (v1)

This document is the **contract** for "groups" puzzle files and for the completion event the
game emits. Puzzle authoring tools, the Moosii backend and every renderer (web, React Native)
depend on it. The TypeScript types in [`src/core/types.ts`](../src/core/types.ts) and the
runtime validator in [`src/core/validate.ts`](../src/core/validate.ts) implement exactly this
document; a compile-time check in `validate.ts` fails the build if the two drift apart.

Changing anything here is a breaking change: bump `schema_version` and update the types,
validator, tests and this file together.

## Puzzle file

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

## Completion event

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

## Share text

The share grid is one row per submitted guess, four squares per row, each square showing
which group (by difficulty) that guessed item belonged to:

| Difficulty | Square |
| --- | --- |
| 1 | 🟧 |
| 2 | 🟦 |
| 3 | 🟪 |
| 4 | 🟫 |

It contains no item text, no labels, no title and no score.

## Game rules the contract assumes

- Mistake limit is a config value, `maxMistakes: number | null`. `null` (the default) is
  relaxed mode: the game never ends on mistakes.
- A guess with exactly three items from one group is reported as "one away".
- There are no timers.
