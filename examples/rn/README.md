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

On **Android**, scan the QR code with **Expo Go for SDK 57** (older Android Expo Go builds can
be installed from expo.dev/go). On **iOS**, Expo Go can't open this app; see below. If the
phone isn't on the same Wi-Fi as your computer:

```bash
npx expo start --tunnel
```

The repo root does **not** need `npm install` for this app; everything resolves from
`examples/rn/node_modules`.

## Running on iOS (SDK 57)

**Why not Expo Go:** the App Store only offers the newest Expo Go, which is SDK 58
(React 19.3.0, React Native 0.88.0). Apple doesn't allow installing older versions, and this
app stays on SDK 57 (React 19.2.3, React Native 0.86.3) to match moosii-rn exactly. So iOS
Expo Go shows "Project is incompatible with this version of Expo Go".

**Instead, use moosii-rn's SDK 57 development build.** A dev build can load any SDK 57 app's
JavaScript from a Metro server. This app needs no native code beyond what every SDK 57 app
ships:

| Import | Native code? |
| --- | --- |
| `react`, `react-native` | Core only (View, Text, Pressable, ScrollView, Animated, AccessibilityInfo, StatusBar) |
| `expo` (`registerRootComponent`) | Expo's core runtime, in every SDK 57 app |
| `expo-status-bar` | None on iOS (wraps React Native's `StatusBar`; its native module is Android-only) |
| `zod` (via shared `src/`) | None, pure JavaScript |
| fixtures and word list | Bundled JSON |

### Steps

1. **Stop moosii-rn's Metro server** if it is running, or let this app use another port.
   Both default to 8081, and the dev build would otherwise open moosii-rn.
2. Start Metro for this app (from `examples/rn`):

   ```bash
   npx expo start --dev-client --port 8082
   ```

   If 8082 is taken, Expo asks to use another port; say yes and note the port it prints.
   You can ignore the warning "Unable to determine the default URI scheme… ensure that the
   expo-dev-client package is installed": this app deliberately doesn't include
   `expo-dev-client`, so its QR code can't deep-link into moosii-rn's app. You will enter the
   URL by hand instead.
3. Find your computer's LAN address (Windows: `ipconfig`, the IPv4 address, e.g.
   `192.168.68.68`). The iPhone must be on the same Wi-Fi. On Windows, allow Node.js through
   the firewall on private networks if asked.
4. On the iPhone, open the **moosii-rn development build**. If it reopens moosii-rn, shake the
   phone (or use the dev menu) and choose **Go home** to get back to the launcher.
5. In the launcher, under **Development servers**, tap **Enter URL manually** and type:

   ```
   http://192.168.68.68:8082
   ```

   using your own address and port, then tap **Connect**. The app opens as
   "Moosii Games RN proof".
6. Play **Groups** and **Word of the Day**, and try **Take a Moment**. To get back to moosii-rn
   later, use **Go home** in the dev menu and pick its server again.

**Not on the same Wi-Fi?** Start with a tunnel instead (Expo may offer to install
`@expo/ngrok` the first time):

```bash
npx expo start --dev-client --port 8082 --tunnel
```

When it prints the tunnel address (`exp://<something>.exp.direct`), enter it in the launcher
as `https://<something>.exp.direct`.

If the dev build shows an error about a missing native module, moosii-rn's build and this app
disagree on a package; report the module name rather than upgrading anything here.

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
