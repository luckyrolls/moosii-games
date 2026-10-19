# moosii-games

Small daily puzzles for Moosii (parenting, financial and life-after-cancer domains), built in
isolation. The first game is **Groups**: find four groups of four related tiles.

This repo is the game logic, the shared React hook, the web components and a playground to try
them. **Integration is out of scope here:** no backend calls, auth, points, streaks, scheduling
or check-in handoff. Those come later, in other repos, against the contract in
[`docs/puzzle-schema.md`](docs/puzzle-schema.md).

## Run it

Requires Node 20.19+.

```bash
npm install
npm run dev       # playground at http://localhost:5173
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
  react/             Shared hooks. React only; no react-dom, no DOM. REUSABLE (also React Native)
  web/
    components/      DOM renderer (GroupsBoard + parts, plain CSS).  REUSABLE (copy into moosii-reader)
    playground/      Puzzle picker, fixture loading, event display.  SCAFFOLDING ONLY
fixtures/            Example puzzles (not reviewed content).
docs/puzzle-schema.md  The puzzle + completion event contract.
```

| Layer | May import | Must not import |
| --- | --- | --- |
| `src/core` | `zod`, other `src/core` files | `react`, `react-dom`, `src/react`, `src/web`, DOM/browser globals, timers |
| `src/react` | `react`, `src/core` | `react-dom`, `src/web`, DOM/browser globals, timers |
| `src/web/components` | `react`, `src/core`, `src/react`, DOM | `src/web/playground` |
| `src/web/playground` | anything | — |

The rules are enforced by `no-restricted-imports` and `no-restricted-globals` in
[`eslint.config.js`](eslint.config.js). As a second check, `src/core` and `src/react` are
type-checked against a lib with no DOM types (`tsconfig.portable.json`), so `npm run build`
fails if they touch a DOM API.

### What is reusable

- **`src/core`**: puzzle types and validator, the game engine (a pure reducer), the seeded
  shuffle, share-grid text, completion event builder and player-facing message text.
- **`src/react`**: `useGroupsGame(puzzle, options)`, which returns state and actions (`select`,
  `deselect`, `toggle`, `submit`, `shuffle`, `clearSelection`, `reveal`), the current message,
  `isComplete`, `completionEvent` and `shareText`. It calls `options.onComplete(event)` once
  when the game ends and never sends the event anywhere. Works unchanged in React Native.
- **`src/web/components`**: `GroupsBoard`, which takes the hook's return value and renders it.
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

## Fixtures

`fixtures/*.json` has one puzzle per domain, each titled "FIXTURE — NOT REVIEWED CONTENT".
`fixtures/invalid/` has a deliberately broken puzzle that shows the validation-error screen.
In the playground you can also choose **Paste JSON…** to validate and play any puzzle.
