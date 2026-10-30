This is **Sinyal Ölçer**, an Expo/React Native Android app that shows the phone's current mobile network signal strength **offline**. Prioritize mobile-first patterns, performance, and keeping the app small and permission-free.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json` (currently SDK 58, React Native 0.88).
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

```bash
npx expo install <package>  # ALWAYS use instead of npm add — resolves SDK-compatible versions
npx expo run:android        # dev build on a connected device (hot reload)
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions

# Release APK (sideload / testing)
npx expo prebuild --clean
cd android && ./gradlew assembleRelease   # → android/app/build/outputs/apk/release/app-release.apk
```

Run the typecheck before declaring any task done. `npx expo-modules-autolinking search` must be run with `-p android` — without it, it lists modules for iOS and the local module (Android-only) will not appear.

### When `prebuild --clean` is required

- `app.json` changed (name, version, icon, splash, userInterfaceStyle)
- Kotlin code in `modules/signal-strength/` changed
- A dependency was added or removed

Changes to `.ts` / `.tsx` files only need `gradlew assembleRelease` (or hot reload during `expo run:android`).

## Project structure

- Single-screen app, **no Expo Router**: entry is `index.ts` → `App.tsx`. Add Expo Router only if the app grows to multiple screens.
- `App.tsx` — main screen (hero score, metric cards, theme picker, footer), `ErrorBoundary`, `Centered` status/error screen.
- `src/theme.tsx` — `ThemeProvider` / `useTheme()`: dark and light palettes, `tone()` for status colors, persisted theme mode (`system` | `light` | `dark`).
- `src/signal/useSignalStrength.ts` — hook wrapping the native module (initial read + `onSignalChange` listener, errors converted to `reason: 'error'`).
- `src/signal/levels.ts` — dBm → 0–100 score per technology (`RANGES`), quality labels, technology labels.
- `src/signal/metrics.ts` — user-facing title, description, ideal range and rating thresholds for RSRP / RSRQ / SINR / Android level.
- `modules/signal-strength/` — local Expo native module (Android only):
  - `index.ts` — TypeScript interface (`SignalReading`, `getCurrent`, `startListening`, `stopListening`, `getThemePreference`, `setThemePreference`). Loaded with `requireOptionalNativeModule` so a missing module never crashes the app.
  - `android/.../SignalStrengthModule.kt` — reads `TelephonyManager` / `SignalStrength`; `TelephonyCallback` on Android 12+, `PhoneStateListener` on 9–11; theme preference in `SharedPreferences`.

## Rules

- `android/` and `ios/` are generated (Continuous Native Generation) and git-ignored. Never create or edit them by hand — configure native behavior in `app.json`, config plugins, or the local module.
- **No permissions, no internet.** The app must not request location, phone-state or network permissions. Do not use APIs that need them (e.g. `getAllCellInfo()` requires location). Keep it this way unless the user explicitly decides otherwise.
- **Minimal dependencies.** Prefer extending the local native module or existing Expo packages over adding libraries (e.g. theme persistence uses the module's `SharedPreferences`, not AsyncStorage). Ask before adding a dependency.
- **Android 9 (API 28) is the minimum supported version.** Below it, `getCurrent()` returns `reason: 'unsupported_os'` and `startListening()` is a no-op (otherwise listener data would overwrite the unsupported message). Android 9 only provides the 0–4 system level; Android 10+ provides dBm, RSRP, RSRQ, SINR.
- **iOS is not supported:** Apple exposes no public API for signal strength. `expo-module.config.json` lists only `android`; adding `apple` requires a Swift implementation first.
- **Never crash on native errors.** Native callbacks catch exceptions and emit `reason: 'error'` with `errorMessage`; the hook wraps native calls in try/catch; `ErrorBoundary` catches render errors. Keep this pattern for new native calls.
- **Colors come from the theme.** Use `useTheme().colors` for all colors and `tone()` for status colors (green/amber/red). `StyleSheet` entries contain layout only — no hard-coded colors.
- **Score display:** the hero shows a 0–100 score (from dBm) drawn as 10 bars. The "Telefonun çubuk göstergesi" card shows Android's real 0–4 level with a 4-step mini icon — do not rescale it to 0–100 (it only has 5 possible values).
- **User-facing text is Turkish** and written for non-technical users; technical names (RSRP, SINR, …) appear only as secondary labels.

## Versioning

App name and version live only in `app.json`; the footer (`Sinyal Ölçer v4.0`) reads them via `import { expo } from './app.json'`. When releasing:

- bump `expo.version` (e.g. `4.0.0` → shown as `v4.0`)
- increment `expo.android.versionCode` by at least 1 (Play Store rejects equal or lower codes)
- run `npx expo prebuild --clean`

Android package: `com.azatates.signalstrength` — do not change it (Play Store treats a new package as a different app).

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`). Run EAS CLI as `npx eas-cli@latest <command>`; substitute that for bare `eas` in docs examples. Production Play Store builds: `eas build -p android --profile production` (signed `.aab`).
Docs: https://docs.expo.dev/eas/index.md