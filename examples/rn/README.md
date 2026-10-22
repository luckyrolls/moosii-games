# RN proof (throwaway)

A minimal Expo app that runs the repo's shared game layers in React Native, on the same versions
as moosii-rn:

| | Version |
| --- | --- |
| Expo SDK | 57 (`expo` `^57.0.17`, resolved 57.0.30) |
| react | 19.2.3 (exact) |
| react-native | 0.86.3 (exact) |
| JS engine | Hermes |

It is **not** part of the root build, lint, tests or Render deploy. It has its own
`package.json` and `node_modules`. No polish, no navigation.

## Run it

```bash
cd examples/rn
npm install
npx expo start
```

Scan the QR code with **Expo Go** (SDK 57) on your phone. If the phone isn't on the same
Wi-Fi as your computer:

```bash
npx expo start --tunnel
```

The repo root does **not** need `npm install` for this app; everything resolves from
`examples/rn/node_modules`.

## What it proves

- **`src/core` and `src/react` run unchanged in React Native.** The app imports them straight
  from `../../src` with no copies, symlinks or publishing. `metro.config.js` adds `src/` and
  `fixtures/` to `watchFolders`, and re-resolves every package import made from those files
  (`react`, `zod`) against `examples/rn/node_modules`.
- **Exactly one copy of React is bundled.** The repo root's `node_modules` is on Metro's
  `blockList`, so nothing can load from it.
- **Both games work with RN renderers.** The renderers live only in `examples/rn/src/`, built
  from `View` / `Pressable` / `Text`; no RN code goes back into `src/`.
  - Groups (`useGroupsGame`) loads the repo's `fixtures/*.json`, including the invalid one.
  - Word of the Day (`useWordGame`) loads `fixtures/word/*.json`. `isValidWord` comes from a
    bundled JSON list of all 6-letter ENABLE words (public domain; regenerate with
    `npm run wordlist`).
  - Each game shows the completion event JSON and share text when it ends, like the web
    playground.
- **Accessibility basics carry over.** Targets are at least 44pt; there are
  `accessibilityRole`/`accessibilityLabel`/`accessibilityState` props, a live message region
  (Android `accessibilityLiveRegion`, iOS `announceForAccessibility`), and a spoken
  description of each word guess.

## Take a Moment

The home screen has a **Take a Moment** section (separate from the games) with Breathing
Garden, Ripple Pond and Grounding, driven by `useBreathing`, `useRipples` and `useGrounding`
from the shared `src/react`, with configs from `fixtures/moment/`.

- Animation is core `Animated` only, all with `useNativeDriver: true` (transform and
  opacity), so it runs on the UI thread. The JS side only reacts at breathing phase changes
  and taps.
- The OS **Reduce Motion** setting is read live through `AccessibilityInfo`: the flower fades
  instead of scaling, ripples fade in place, and leaves stop drifting.
- To check reduced motion on a phone: iOS Settings → Accessibility → Motion → Reduce Motion;
  Android Settings → Accessibility → Remove animations. You can change it while the app is open.

## Checks you can run without a phone

```bash
npm run typecheck      # tsc over the app and the shared src it imports
npm run check:bundle   # dev bundle: shared src included, src/web excluded, one React, nothing from the root node_modules
npm run check:hermes   # production export compiled to Hermes bytecode
```

`check:hermes` proves the bundle compiles for Hermes. Actually running it under Hermes needs a
device or emulator (Expo Go). The shared layers avoid Intl and locale APIs; the local date in
completion events uses only `getFullYear`/`getMonth`/`getDate`.

## Known noise

- `npm audit` reports advisories inside Expo/Metro's own dev tooling (`braces`, `micromatch`,
  `node-forge`, `uuid`, `xcode`). Fixing them would mean leaving the SDK 57 pins, so they are
  left alone in this throwaway app.
- `app.json` sets `experiments.tsconfigPaths: false`. The `paths` in `tsconfig.json` exist only
  so the shared `src/` type-checks against this app's `react` and `zod` types; Metro must not
  treat them as aliases.
