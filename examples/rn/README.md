# RN proof (throwaway)

A minimal Expo app that runs the repo's shared game layers in React Native, on the same versions
as moosii-rn:

| | Version |
| --- | --- |
| Expo SDK | 58 (`expo` 58.0.19, exact) |
| react | 19.3.0 (exact) |
| react-native | 0.88.0 (exact) |
| JS engine | Hermes |

It is **not** part of the root build, lint, tests or Render deploy. It has its own
`package.json` and `node_modules`. No polish, no navigation.

## Run it on your phone (Expo Go)

The App Store and Play Store Expo Go is SDK 58, the same as this app, so Expo Go opens it
directly. No development build is needed.

1. Install the app's own packages (once, from `examples/rn`). The repo root does **not** need
   `npm install` for this; everything resolves from `examples/rn/node_modules`.

   ```bash
   npm install
   ```

2. Find your computer's **current** Wi-Fi IPv4 address. The router can reassign it, so check
   each time. On Windows, `ipconfig` shows it under the Wi-Fi adapter, e.g. `192.168.68.61`.
   The phone must be on the same Wi-Fi.
3. Start Metro with that address and `--lan`. Use a port other than 8081 if moosii-rn's server
   is running there.

   PowerShell:

   ```powershell
   $env:REACT_NATIVE_PACKAGER_HOSTNAME = "192.168.68.61"
   npx expo start --lan --port 8082
   ```

   bash:

   ```bash
   REACT_NATIVE_PACKAGER_HOSTNAME=192.168.68.61 npx expo start --lan --port 8082
   ```

   A server keeps the address it started with; if your IP changes, stop it (Ctrl+C) and start
   again with the new one.
4. Open it on the phone, either way:
   - **iPhone camera:** point it at the QR code in the terminal and tap the Expo Go banner.
   - **Expo Go:** it appears under the development servers on the Home tab; or tap
     **Enter URL manually** and type `exp://192.168.68.61:8082` (your address and port).
5. Play **Groups** and **Word of the Day**, and try **Take a Moment**.

If Expo prints a `localhost` URL anywhere, don't type that into the phone: on the phone,
`localhost` means the phone itself ("localhost is currently unavailable"). To check what the
server advertises, open `http://192.168.68.61:8082` in a browser on this computer; `hostUri`
and `launchAsset.url` should show your address.

**Not on the same Wi-Fi?** Use a tunnel instead (Expo may offer to install `@expo/ngrok` the
first time) and scan the QR code it prints:

```bash
npx expo start --tunnel --port 8082
```

**Windows firewall and network profile.** The phone has to reach Node.js on this computer.
Check that an inbound **Allow** rule for your `node.exe` covers the profile your Wi-Fi uses
(Settings → Network & internet → Wi-Fi → your network → Network profile type). With nvm, the
rule must name the real path of the Node version you use (e.g. `D:\nvm\v24.22.1\node.exe`), not
the `nvm4w\nodejs` link. For a home network, the usual setup is profile **Private** with
Node.js allowed on Private; allowing Node.js on Public networks also lets it accept connections
on café or airport Wi-Fi.

**Packages beyond `react` and `react-native`:** `expo` (core runtime), `expo-status-bar`
(on iOS, a wrapper around React Native's `StatusBar`; registered as a config plugin in
`app.json`, which `expo install --fix` adds on SDK 58) and `zod` (pure JavaScript, used by the
shared validators). No other native packages.

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
npm run check:hermes   # production export for iOS and Android, compiled to Hermes bytecode
```

`check:hermes` proves the bundle compiles for Hermes. Actually running it under Hermes needs a
device (Expo Go). The shared layers avoid Intl and locale APIs; the local date in
completion events uses only `getFullYear`/`getMonth`/`getDate`.

## Known noise

- `npm audit` reports `node-forge` (inside Expo's CLI tooling) and `zod` < 4.6.6 (the shared
  validators use zod 3; moving to zod 4 is a separate change for the whole repo). Fixing
  `node-forge` would mean leaving the SDK 58 pins, so it is left alone in this throwaway app.
- `app.json` sets `experiments.tsconfigPaths: false`. The `paths` in `tsconfig.json` exist only
  so the shared `src/` type-checks against this app's `react` and `zod` types; Metro must not
  treat them as aliases.
