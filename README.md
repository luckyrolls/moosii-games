# moosii-games

Small daily puzzles for Moosii (parenting, financial and life-after-cancer domains), built in
isolation. Two games so far:

- **Groups**: find four groups of four related tiles.
- **Word of the Day**: guess a 4–8 letter word tied to one lesson or activity, with a hint and a
  takeaway shown at the end.

Player-facing names come from `GAME_DISPLAY_NAME` / `WORD_DISPLAY_NAME` in `src/core` (placeholders).

This repo is the game logic, the shared React hook, the web components and a playground to try
them. **Integration is out of scope here:** no backend calls, auth, points, streaks, scheduling
or check-in handoff. Those come later, in other repos, against the contract in
[`docs/puzzle-schema.md`](docs/puzzle-schema.md).

## Run it

Requires Node 20.19+.

```bash
npm install
npm run dev       # playground at http://localhost:5173 (?game=word opens Word of the Day)
npm test          # vitest
npm run lint      # eslint, including the layer rules
npm run build     # type-check + production build into dist/
```

### Deploy (Render static site)

`render.yaml` defines it. Build command `npm ci && npm run build`, publish directory `dist`.

## Layout: three layers, lint-enforced

```
src/
  core/              Pure TypeScript. No React, no DOM.             REUSABLE
    word/            Word of the Day engine, schema, scoring.        REUSABLE
  react/             Shared hooks. React only; no react-dom, no DOM. REUSABLE (also React Native)
  web/
    components/      DOM renderers (GroupsBoard, word/WordBoard).    REUSABLE (copy into moosii-reader)
    wordlist/        Lazily loaded guess dictionary (ENABLE).        REUSABLE (web hosts)
    playground/      Game + puzzle picker, fixtures, event display.  SCAFFOLDING ONLY
fixtures/            Example puzzles (not reviewed content). Word puzzles in fixtures/word/.
examples/rn/         Throwaway Expo app proving core + react run in React Native. Standalone;
                     not part of the root build, lint, tests or deploy. See its README.
docs/puzzle-schema.md  The puzzle + completion event contract.
```

| Layer | May import | Must not import |
| --- | --- | --- |
| `src/core` | `zod`, other `src/core` files | `react`, `react-dom`, `src/react`, `src/web`, DOM/browser globals, timers |
| `src/react` | `react`, `src/core` | `react-dom`, `src/web`, DOM/browser globals, timers |
| `src/web/components` | `react`, `src/core`, `src/react`, DOM | `src/web/playground` |
| `src/web/wordlist` | its own data files | — (hosts import it; `src/core` / `src/react` never do) |
| `src/web/playground` | anything | — |

The rules are enforced by `no-restricted-imports` and `no-restricted-globals` in
[`eslint.config.js`](eslint.config.js). As a second check, `src/core` and `src/react` are
type-checked against a lib with no DOM types (`tsconfig.portable.json`), so `npm run build`
fails if they touch a DOM API.

### What is reusable

- **`src/core`**: puzzle types and validator, the game engine (a pure reducer), the seeded
  shuffle, share-grid text, completion event builder and player-facing message text.
  `src/core/word` has the same pieces for Word of the Day, plus letter scoring. Shared text
  rules (`schemaRules.ts`) and the local-date helper (`date.ts`) are used by both games.
- **`src/react`**: `useGroupsGame(puzzle, options)`, which returns state and actions (`select`,
  `deselect`, `toggle`, `submit`, `shuffle`, `clearSelection`, `reveal`), the current message,
  `isComplete`, `completionEvent` and `shareText`. It calls `options.onComplete(event)` once
  when the game ends and never sends the event anywhere. Works unchanged in React Native.
- **`src/react`**: `useWordGame(puzzle, options)` returns the grid, typed letters, keyboard
  letter marks, hint/answer/takeaway, message text (including a spoken description of each
  guess), `completionEvent`, `shareText`, and actions (`typeLetter`, `deleteLetter`, `submit`,
  `showHint`, `reveal`, `pressKey`). Options: `maxGuesses` (null = unlimited, default),
  `isValidWord` (the dictionary check, injected by the host), `onComplete`.
- **`src/web/components`**: `GroupsBoard` and `WordBoard`, which take their hook's return value and render it.
  It is layout and styling only. Styles are plain CSS with `--mg-*` custom-property tokens in
  `tokens.css`, which a host app can override.

### What is scaffolding

- **`src/web/playground`** and **`fixtures/`**: for trying puzzles and seeing the completion
  event. Not shipped anywhere else.

## Using it in a host app

```tsx
import { validatePuzzle } from './core';
import { useGroupsGame } from './react';
import { GroupsBoard } from './web/components';

const result = validatePuzzle(json);
if (!result.ok) showErrors(result.errors);

function Puzzle({ puzzle }) {
  const game = useGroupsGame(puzzle, {
    maxMistakes: null, // relaxed (default); a number ends the game after that many mistakes
    onComplete: (event) => {
      /* host decides: e.g. send to backend */
    },
  });
  return <GroupsBoard game={game} />;
}
```

### Word of the Day in a host app

```tsx
import { validateWordPuzzle } from './core';
import { useWordGame } from './react';
import { WordBoard } from './web/components';
import { createIsValidWord, loadWordList } from './web/wordlist';

// Load the dictionary for the answer's length first (one lazy chunk per length).
const isValidWord = createIsValidWord(await loadWordList(puzzle.answer.length));

function Word({ puzzle, isValidWord }) {
  const game = useWordGame(puzzle, { isValidWord, maxGuesses: null, onComplete: (event) => {} });
  return <WordBoard game={game} />;
}
```

## Word list and its license

`src/web/wordlist/data/words-{4..8}.txt` (79,300 words) are filtered from **ENABLE**
(`enable1.txt`, 172,823 words), which its authors placed in the **public domain**; see the
ENABLE README as shipped in SCOWL:
<https://sources.debian.org/src/scowl/6-2/r/enable/README>. Copy used:
<https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt>. Processing and checksum
are recorded in [`src/web/wordlist/NOTICE.md`](src/web/wordlist/NOTICE.md).

Each length is a separate chunk loaded on demand, so the list is never in the main bundle
(gzip: 4 letters 9 kB … 8 letters 92 kB). It is only for accepting guesses; puzzle answers are
always accepted.

## Fixtures

`fixtures/*.json` has Groups puzzles (at least one per domain), each titled "FIXTURE — NOT REVIEWED CONTENT".
`fixtures/invalid/` has a deliberately broken puzzle that shows the validation-error screen.
`fixtures/word/*.json` has one Word of the Day puzzle per domain (titles include
"(FIXTURE — NOT REVIEWED CONTENT)"); `fixtures/word/invalid/` has a broken one.
In the playground you can also choose **Paste JSON…** to validate and play any puzzle.
