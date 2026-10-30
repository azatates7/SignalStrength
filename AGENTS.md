This is **Sinyal Ölçer** (English name: **Signal Strength**), an Expo/React Native Android app with two tabs: **Bağlantı Kontrol** shows the phone's current mobile network signal strength (works offline), **Hız Testi** measures ping / download / upload against Cloudflare when a connection exists. Prioritize mobile-first patterns, performance, and keeping the app small with no runtime permission prompts.

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

- **No Expo Router**: entry is `index.ts` → `App.tsx`, two tabs in a horizontal paging `ScrollView` (swipe left/right or tap the tab bar). Both pages stay mounted so a running speed test survives tab switches. No pager library is used. Add Expo Router only if the app grows to real multi-screen navigation.
- `App.tsx` — header (app name, language button showing the *other* language — "EN" while Turkish, "TR" while English — and a theme toggle: tap = light/dark, long-press = follow system), tab bar, signal tab (hero score, metric cards), `ErrorBoundary` per tab, `Centered` status/error view.
- `src/i18n/strings.ts` — **all user-facing text** in Turkish and English (`STRINGS.tr` / `STRINGS.en`, same shape enforced by TypeScript), city names for test servers, date locale.
- `src/i18n/index.tsx` — `LanguageProvider` / `useI18n()` → `{ lang, t, locale, toggleLang }`. Initial language: saved choice (native `SharedPreferences`), else device language (`tr*` → Turkish, anything else → English).
- `src/appInfo.ts` — `APP_VERSION` and `appFooter(t.appName)`.
- `locales/tr.json` — Turkish launcher name ("Sinyal Ölçer"), wired via `expo.locales` in `app.json` (Expo writes `values-b+tr/strings.xml` on prebuild).
- `src/speedtest/rateLimit.ts` — max 3 speed tests per rolling minute (in-memory).
- `src/speedtest/cloudflare.ts` — speed test engine: `fetchMeta()` (ISP + server location from `speed.cloudflare.com/meta`), `runSpeedTest()` (ping → download → upload via `__down` / `__up`, XHR timing, `CancelToken`). Endpoints and timing follow Cloudflare's MIT-licensed `@cloudflare/speedtest`.
- `src/speedtest/useNetwork.ts` — hook for the active connection (Wi-Fi / mobile data / none) from the native module.
- `src/speedtest/SpeedTestScreen.tsx` — speed test tab UI (connection card, live gauge, result tiles with ratings, explanations).
- `src/theme.tsx` — `ThemeProvider` / `useTheme()`: dark and light palettes, `tone()` for status colors, persisted theme mode (`system` | `light` | `dark`).
- `src/signal/useSignalStrength.ts` — hook wrapping the native module (initial read + `onSignalChange` listener, errors converted to `reason: 'error'`).
- `src/signal/levels.ts` — dBm → 0–100 score per technology (`RANGES`), `qualityKey()`, technology labels.
- `src/signal/metrics.ts` — unit and rating thresholds for RSRP / RSRQ / SINR / Android level; `rate()` returns a `RatingKey` + color (texts live in `strings.ts`).
- `modules/signal-strength/` — local Expo native module (Android only):
  - `index.ts` — TypeScript interface (`SignalReading`, `NetworkInfo`, `getCurrent`, `startListening`, `stopListening`, `getNetworkInfo`, `startNetworkListening`, `stopNetworkListening`, `getThemePreference`, `setThemePreference`, `getLanguagePreference`, `setLanguagePreference`, `getWifiName`). Loaded with `requireOptionalNativeModule` so a missing module never crashes the app.
  - `android/.../SignalStrengthModule.kt` — reads `TelephonyManager` / `SignalStrength`; `TelephonyCallback` on Android 12+, `PhoneStateListener` on 9–11; active network via `ConnectivityManager` (`registerDefaultNetworkCallback`); theme preference in `SharedPreferences`.

## Rules

- `android/` and `ios/` are generated (Continuous Native Generation) and git-ignored. Never create or edit them by hand — configure native behavior in `app.json`, config plugins, or the local module.
- **Permissions:** `INTERNET`, `ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE` are install-time (never prompted). Location (`ACCESS_FINE/COARSE_LOCATION`) is declared **only** for showing the Wi-Fi name (SSID) and is requested **only when the user taps "Göster"** in the speed test tab — never at startup, never for anything else. Do not use location for other purposes or add other runtime permissions (e.g. `getAllCellInfo()`) unless the user explicitly decides so.
- **Network traffic only on user action.** The signal tab never uses the internet. The speed test tab fetches only `/meta` (~1 KB, ISP + server location) while the tab is visible and online; the bandwidth test starts automatically when the user opens the "Hız Testi" tab (or taps "Testi Başlat" / "Tekrar Test Et"), limited to 3 tests per rolling minute (`src/speedtest/rateLimit.ts`, in-memory). Automatic tests (`autoPending` in `SpeedTestScreen`): on tab open, on connection type change (Wi-Fi ↔ mobile, including no connection → connected) and when a rate-limit wait ends; a pending test starts once the tab is open, internet is available and no test is running. Losing the connection cancels the running test and clears the results. Results of a superseded test are never written to state (token check in `start()`). ISP brand names come from `BRAND_BY_ASN` in `cloudflare.ts` (fallback: Cloudflare's `asOrganization`); on mobile data the operator name comes from the SIM. Do not spoof a browser User-Agent or otherwise bypass Cloudflare's bot protection — if Cloudflare blocks app requests, move to an own Cloudflare Worker instead. On metered connections (mobile data) data use is capped per direction (`METERED_LIMIT`).
- **Minimal dependencies.** Prefer extending the local native module or existing Expo packages over adding libraries (e.g. theme persistence uses the module's `SharedPreferences`, not AsyncStorage). Ask before adding a dependency.
- **Android 9 (API 28) is the minimum supported version.** Below it, `getCurrent()` returns `reason: 'unsupported_os'` and `startListening()` is a no-op (otherwise listener data would overwrite the unsupported message). Android 9 only provides the 0–4 system level; Android 10+ provides dBm, RSRP, RSRQ, SINR.
- **iOS is not supported:** Apple exposes no public API for signal strength. `expo-module.config.json` lists only `android`; adding `apple` requires a Swift implementation first.
- **Speed test service:** Cloudflare's endpoints have no formal third-party API agreement — fine for personal use; revisit before commercial distribution. Ookla/Speedtest.net has no public API and must not be scraped. Handle Cloudflare being unreachable gracefully (errors are shown, never crash).
- **Never crash on native errors.** Native callbacks catch exceptions and emit `reason: 'error'` with `errorMessage`; the hook wraps native calls in try/catch; `ErrorBoundary` catches render errors. Keep this pattern for new native calls.
- **Colors come from the theme.** Use `useTheme().colors` for all colors and `tone()` for status colors (green/amber/red). `StyleSheet` entries contain layout only — no hard-coded colors.
- **Score display:** the hero shows a 0–100 score (from dBm) drawn as 10 bars. The "Telefonun çubuk göstergesi" card shows Android's real 0–4 level with a 4-step mini icon — do not rescale it to 0–100 (it only has 5 possible values).
- **User-facing text is bilingual (Turkish / English).** Never hard-code UI text in components: add the key to both `tr` and `en` in `src/i18n/strings.ts` and read it via `useI18n().t`. Engine/hook errors are returned as codes (`SpeedErrorInfo`) and translated in the UI. Text is written for non-technical users; technical names (RSRP, SINR, …) appear only as secondary labels.
- **Launcher name vs. in-app language:** the launcher/installer name follows the *phone* language (`app.json` `name` + `locales/tr.json`) and cannot be changed at runtime; the in-app language button changes everything inside the app.

## Versioning

Version lives only in `app.json`. The app name is `expo.name` ("Signal Strength", default for all languages) plus `locales/tr.json` ("Sinyal Ölçer" for Turkish). The footer (`Sinyal Ölçer v4.0` / `Signal Strength v4.0`) is built in `src/appInfo.ts`. When releasing:

- bump `expo.version` (e.g. `4.0.0` → shown as `v4.0`)
- increment `expo.android.versionCode` by at least 1 (Play Store rejects equal or lower codes)
- run `npx expo prebuild --clean`

Author / license metadata belongs in `package.json` (`author`, `license`) and the `LICENSE` file — not in `app.json` (Expo's app config has no such fields). Keep `package.json` `version` in sync with `expo.version`.

Android package: `com.azatates.signalstrength` — do not change it (Play Store treats a new package as a different app).

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`). Run EAS CLI as `npx eas-cli@latest <command>`; substitute that for bare `eas` in docs examples. Production Play Store builds: `eas build -p android --profile production` (signed `.aab`).
Docs: https://docs.expo.dev/eas/index.md