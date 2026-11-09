This is **Sinyal Ölçer** (English name: **Signal Strength**), an Expo/React Native Android app with three tabs: **Mobil Hat Kontrol** (EN: Mobile Signal) shows the phone's current mobile network signal strength with a live 2-minute chart (works offline), **Hız Testi** measures ping / download / upload against Cloudflare when a connection exists, **Bağlantı Bilgisi** shows IP details (local IP, IPv6, router/gateway IP, public IP, DNS, static IP yes/no), the Wi-Fi signal card (on Wi-Fi) and the VPN status. Prioritize mobile-first patterns, performance, and keeping the app small with no runtime permission prompts.

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
npm test                    # unit tests (Jest, jest-expo preset)
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions

# Release APK (sideload / testing)
npx expo prebuild --clean
cd android && ./gradlew assembleRelease   # → android/app/build/outputs/apk/release/app-release.apk
```

Run the typecheck **and `npm test`** before declaring any task done. Unit tests live next to the code in `__tests__/` folders (`*.test.ts`) and cover pure logic: `levels`, `metrics`, `wifi` (band / channel / standard, `pushSample`), `rateLimit`, `history`, `share`, `usage`, `summary`, `stability`, `xlsx` (zip structure, CRC-32, CSV quoting), `cloudflare` helpers (`parseServerTiming`, `median`, `pingStats`) and the privacy policy JSON (TR/EN same structure, e-mail contact). When you change or add pure logic, add or update its test. Keep native-dependent code out of these modules so they stay testable (`modules/signal-strength` resolves to `null` under Jest). `npx expo-modules-autolinking search` must be run with `-p android` — without it, it lists modules for iOS and the local module (Android-only) will not appear.

### When `prebuild --clean` is required

- `app.json` changed (name, version, icon, splash, userInterfaceStyle)
- Kotlin code in `modules/signal-strength/` changed
- A dependency was added or removed

Changes to `.ts` / `.tsx` files only need `gradlew assembleRelease` (or hot reload during `expo run:android`).

## Project structure

- **No Expo Router**: entry is `index.ts` → `App.tsx`, three tabs in a horizontal paging `ScrollView` (swipe left/right or tap the tab bar). All pages stay mounted so a running speed test survives tab switches. Tab labels shrink to fit (`adjustsFontSizeToFit`). No pager library is used. Add Expo Router only if the app grows to real multi-screen navigation.
- `App.tsx` — header (top padding = status bar height from the native `getStatusBarHeight()` (window insets, incl. camera cutout) because the app draws edge-to-edge and `StatusBar.currentHeight` returns 0 on some phones; app name, language button showing the *current* page language — "TR" while Turkish, "EN" while English; tapping switches — and a theme toggle showing the *current* theme — 🌙 while dark, ☀️ while light — tap = light/dark, long-press = follow system), tab bar, signal tab (hero score, metric cards), `ErrorBoundary` per tab, `Centered` status/error view.
- `src/i18n/strings.ts` — **all user-facing text** in Turkish and English (`STRINGS.tr` / `STRINGS.en`, same shape enforced by TypeScript), city names for test servers, date locale.
- `src/i18n/index.tsx` — `LanguageProvider` / `useI18n()` → `{ lang, t, locale, toggleLang }`. Initial language: saved choice (native `SharedPreferences`), else device language (`tr*` → Turkish, anything else → English).
- `src/appInfo.ts` — `APP_VERSION` and `appFooter(t.appName)`.
- `src/AppFooter.tsx` — page footer used on every page: app name + version and the "Gizlilik politikası / Privacy policy" link (opens the in-app privacy dialog).
- `src/privacy/policy.json` — **single source** of the privacy policy text (Turkish + English; blocks `p` / `h2` / `h3` / `list` / `table`; inline `**bold**`, `https://…` and e-mail addresses become links). Contact is by e-mail, not GitHub.
- `src/privacy/PrivacyPolicy.tsx` — `PrivacyPolicyProvider` (wraps `Root` in `App.tsx`) shows the policy as an in-app dialog: automatically on launch until the user ticks "Bir daha gösterme / Don't show again" and closes it (stored natively: `getPrivacyNoticeDismissed` / `setPrivacyNoticeDismissed`); always available via `usePrivacyPolicy().open()` from the footer link. The checkbox is hidden once dismissed.
- `scripts/build-privacy-page.mjs` — generates `docs/privacy/index.html` from `policy.json` (`node scripts/build-privacy-page.mjs`). Never edit the HTML by hand. The page exists only because Play Console requires a public privacy policy URL; the app itself never opens it.
- `locales/tr.json` — Turkish launcher name ("Sinyal Ölçer"), wired via `expo.locales` in `app.json` (Expo writes `values-b+tr/strings.xml` on prebuild).
- `src/speedtest/history.ts` — speed test history: last 20 results (`MAX_HISTORY`), stored natively as JSON in `SharedPreferences` (`getSpeedHistory` / `setSpeedHistory`), shown as "Son testler" on the speed tab (5 visible, expandable, "Temizle" deletes). Stores date, connection type, VPN flag, ISP name and the measured values — **never IP addresses or the Wi-Fi name**. `parseHistory` tolerates corrupt data.
- `src/speedtest/ShareCard.tsx` + `share.ts` — "Sonucu paylaş" shares the result **as an image**: `ShareCard` is rendered off-screen, captured with `react-native-view-shot` (`captureRef`, PNG tmpfile) and shared with `expo-sharing`. `expo-sharing` cannot attach text to a file on Android, so a separate "Metin olarak paylaş" link shares `buildShareText()` via React Native `Share`; if the image cannot be created, the text is shared instead. No IP / SSID in the image or text. Both packages were added deliberately for this feature.
- `src/speedtest/UsageCard.tsx` + `usage.ts` — "Bu hız neye yeter?" card after a test: web / HD / 4K video / video call / gaming verdicts (`ok` / `maybe` / `no`) and 1 GB transfer time. Thresholds are in `usage.ts` (tested).
- `src/speedtest/StabilityCard.tsx` + `stability.ts` — 30 s connection stability test: one small request every 0.5 s via native `pingOnce` (2 s timeout = lost), live latency chart, median / jitter / loss / max and a verdict. Runs only when the user starts it, never together with the speed test (each blocks the other). Results are not stored.
- Live speed chart — `SpeedTestScreen` samples `onProgress` Mbps (≤ 5/s, ≤ 150 per direction) and draws it in the gauge with `Sparkline` (`floor={0}`); after the test both download and upload lines stay visible.
- `src/speedtest/summary.ts` — history summary (download trend, Wi-Fi / mobile averages) shown at the bottom of "Son testler".
- `src/speedtest/xlsx.ts` + `exportHistory.ts` — export the history as **XLSX** (own minimal writer: one sheet, inline strings, numbers stay numbers, bold header, STORE zip + CRC-32 — no spreadsheet library) or **CSV** (RFC 4180, UTF-8 BOM). The file is written to the cache with `expo-file-system` (`File`, `Paths.cache`) and shared with `expo-sharing`. No IP / SSID in the file.
- `src/speedtest/format.ts` — `formatMbps`, `formatDateTime` (shared by screen, history and share text).
- `src/speedtest/rateLimit.ts` — max 3 speed tests per rolling minute (in-memory).
- `src/speedtest/cloudflare.ts` — speed test engine (ping is measured natively by `measurePing` in the Kotlin module — XHR timing included React Native bridge delay and over-reported ping; the XHR loop remains as a fallback): `fetchMeta()` (ISP + server location from `speed.cloudflare.com/meta`), `runSpeedTest()` (ping → download → upload via `__down` / `__up`, XHR timing, `CancelToken`). Endpoints and timing follow Cloudflare's MIT-licensed `@cloudflare/speedtest`.
- `src/speedtest/useNetwork.ts` — `useNetwork` (active connection: Wi-Fi / mobile data / none, plus `vpn`), `useWifiName` (SSID, opt-in location permission; if the phone's location service is off the state is `locationOff` and "Konumu aç / Turn on location" opens the system location settings via `openLocationSettings()`; the name is re-read when the app returns to the foreground), `useCellularName` (operator + technology, updated live from `onSignalChange` so 4G ↔ 5G changes show without a connection change).
- `src/speedtest/SpeedTestScreen.tsx` — speed test tab UI (connection card, live gauge, result tiles with ratings, explanations).
- `src/info/ConnectionInfoScreen.tsx` — "Bağlantı Bilgisi" tab. Local data from native `getIpInfo()` (no internet; on VPN it describes the underlying Wi-Fi / mobile network): `ipv4`, `ipv6` (non link-local), `gateway` (default route; usually none on mobile data), `dns`, `assignment` (`dhcp` / `static` / `carrier` — Android 11+ via `LinkProperties.dhcpServerAddress`, Android 9–10 via `WifiManager.dhcpInfo`). "Statik IP" refers to the phone's local IP only; whether the ISP gives a fixed public IP cannot be detected on the device (the UI says so). Public IP = `clientIp` from Cloudflare `/meta`, fetched only while the tab is visible and online, once per connection (or on "Yenile"). The VPN status lives here (moved from the speed test card).
- `src/theme.tsx` — `ThemeProvider` / `useTheme()`: dark and light palettes, `tone()` for status colors, persisted theme mode (`system` | `light` | `dark`).
- `src/signal/WifiCard.tsx` / `useWifiSignal.ts` / `wifi.ts` — Wi-Fi signal card on the "Bağlantı Bilgisi" tab (shown only on Wi-Fi): RSSI (dBm, rated with `METRICS.wifi` thresholds −55 / −67 / −75), band and channel from the frequency, link speed (↓/↑ on Android 10+), Wi-Fi standard (Android 11+). Native `getWifiSignal()` reads `WifiInfo` (Android 12+ from `NetworkCapabilities.transportInfo`, below from `WifiManager.connectionInfo`) — **no location permission** (only SSID/BSSID need it). Polled every 2 s while the app is in the foreground.
- `src/signal/useSampleHistory.ts` + `src/ui/Sparkline.tsx` / `SignalChart.tsx` — live chart of the last 2 minutes (1 sample/s, nothing stored, no samples in the background). The line is drawn with rotated `View`s — no chart / SVG library.
- `src/signal/useSignalStrength.ts` — hook wrapping the native module (initial read + `onSignalChange` listener, errors converted to `reason: 'error'`).
- `src/signal/levels.ts` — dBm → 0–100 score per technology (`RANGES`), `qualityKey()`, technology labels.
- `src/signal/metrics.ts` — unit and rating thresholds for RSRP / RSRQ / SINR / Android level; `rate()` returns a `RatingKey` + color (texts live in `strings.ts`).
- `modules/signal-strength/` — local Expo native module (Android only):
  - `index.ts` — TypeScript interface (`SignalReading`, `NetworkInfo`, `getCurrent`, `startListening`, `stopListening`, `getNetworkInfo`, `startNetworkListening`, `stopNetworkListening`, `getThemePreference`, `setThemePreference`, `getLanguagePreference`, `setLanguagePreference`, `getWifiName`). Loaded with `requireOptionalNativeModule` so a missing module never crashes the app.
  - `android/.../SignalStrengthModule.kt` — reads `TelephonyManager` / `SignalStrength`; `TelephonyCallback` on Android 12+, `PhoneStateListener` on 9–11; active network via `ConnectivityManager` (`registerDefaultNetworkCallback`); theme / language preference in `SharedPreferences`.
  - **Home screen widgets** — `SignalWidgetProvider.kt`, `SpeedWidgetProvider.kt`, shared `WidgetStyle.kt`, `android/src/main/AndroidManifest.xml`, `android/src/main/res/` (all resources prefixed `ss_widget_` / `ss_speed_`).
    - **Signal widget** (3×1, resizable): mobile dBm, 10 bars, 0–100 score + quality, operator · technology, last update time, ⟳ refresh.
    - **Speed test widget** (3×1): last result from `speed_history` (↓ / ↑ Mbps, ping, date) and a "Başlat" button. The test cannot run inside a widget; "Başlat" opens `signalstrength://speedtest?start=1` (`expo.scheme` in `app.json`), the rest of the widget opens `signalstrength://speedtest`. `App.tsx` handles the URL (`Linking.getInitialURL` + `url` event): switches to the speed tab and bumps `startRequest`; `SpeedTestScreen` starts the test (also on mobile data — the user asked for it) unless one is already running. Updated after every test via `setSpeedHistory`.
    - **Theme** (`WidgetStyle`): the ☀️/🌙 button on each widget toggles light/dark for both widgets (`widget_theme` pref); without it the widgets follow the app theme (`theme`), then the system. Colors are set in code (`setBackgroundResource`, `setTextColor`, `setColorFilter`), not via `values-night` (those are only for the picker preview). Declared in the module's own manifest, which Gradle merges into the app — no config plugin needed. Updates: `updatePeriodMillis` 30 min (Android's minimum), ⟳ (broadcast `WIDGET_REFRESH`), and while the app is open on every signal event (`updateThrottled`, ≤ 1 per 10 s) plus on language change. Texts follow the in-app language (SharedPreferences `language`). **Score ranges, quality thresholds, bar colors and technology labels are duplicated from `levels.ts` / `App.tsx` / `strings.ts` — keep them in sync.** No foreground service: live updates in the background would need one (battery, Play declaration) — deliberately not done.
  - **Quick Settings tile** — `SignalTileService.kt` (`BIND_QUICK_SETTINGS_TILE` service in the module manifest, icon `ss_tile_signal`): label "−81 dBm", subtitle "Turkcell · 4G (LTE)" (Android 10+), state description = quality · score (Android 11+). Re-reads the signal each time the panel opens (`onStartListening`); tap opens the app (`startActivityAndCollapse`, PendingIntent on Android 14+). Uses `SignalWidgetProvider.read / score / quality / techLabel` (internal).
  - **Dual SIM:** signal, technology and operator always come from the **mobile data SIM** (`SubscriptionManager.getDefaultDataSubscriptionId()` → `TelephonyManager.createForSubscriptionId`, falling back to the default `TelephonyManager`). When the data SIM changes, the signal listener is re-registered on the new SIM (checked on every network change).

## Rules

- `android/` and `ios/` are generated (Continuous Native Generation) and git-ignored. Never create or edit them by hand — configure native behavior in `app.json`, config plugins, or the local module.
- **Permissions:** `INTERNET`, `ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE` are install-time (never prompted). Location (`ACCESS_FINE/COARSE_LOCATION`) is declared **only** for showing the Wi-Fi name (SSID) and is requested **only when the user taps "Göster"** in the speed test tab — never at startup, never for anything else. Do not use location for other purposes or add other runtime permissions (e.g. `getAllCellInfo()`) unless the user explicitly decides so.
- **Network traffic only on user action.** The signal tab never uses the internet. The speed test tab and the connection info tab each fetch only `/meta` (~1 KB, ISP + server location + public IP) while the tab is visible and online; the bandwidth test starts automatically when the user opens the "Hız Testi" tab (or taps "Testi Başlat" / "Tekrar Test Et"), limited to 3 tests per rolling minute (`src/speedtest/rateLimit.ts`, in-memory). Automatic tests (`autoPending` in `SpeedTestScreen`) run **only on unmetered connections (Wi-Fi)** — on mobile data (`info.metered`) a data-usage info box is shown and the user starts the test manually; the box disappears once a test is started and reappears after a connection change. Triggers: tab open, on connection type change (Wi-Fi ↔ mobile, including no connection → connected) and when a rate-limit wait ends; a pending test starts once the tab is open, internet is available and no test is running. Losing the connection cancels the running test and clears the results. Results of a superseded test are never written to state (token check in `start()`). ISP brand names come from `BRAND_BY_ASN` in `cloudflare.ts` (fallback: Cloudflare's `asOrganization`); on mobile data the operator name comes from the SIM. Do not spoof a browser User-Agent or otherwise bypass Cloudflare's bot protection — if Cloudflare blocks app requests, move to an own Cloudflare Worker instead. On metered connections (mobile data) data use is capped per direction (`METERED_LIMIT`).
- **VPN:** `NetworkInfo.vpn` is `true` when the default network has `TRANSPORT_VPN`. Android also reports the underlying transport on VPN networks, so `type` stays `wifi` / `cellular`; the "Bağlantı Bilgisi" tab shows the VPN status (on/off, with a note that the public IP and speed test go through the VPN). Turning the VPN on/off counts as a connection change (`connKey` in `SpeedTestScreen`): the running test is cancelled, meta is re-fetched and the auto test is re-armed.
- **Listeners pause in the background.** `useSignalStrength` and `useNetwork` stop their native listeners when `AppState` becomes `background` and, on `active`, re-read the current value and restart them. Keep this for any new native listener (battery).
- **Privacy policy must match the app.** If you add a permission, a network request, a new server, storage of data or any analytics/ads, update `src/privacy/policy.json` (both languages) and the effective date in `app.json` → `expo.extra.privacyPolicyDate`, run `node scripts/build-privacy-page.mjs` and the Play Console Data safety form in the same change.
- **Release builds use R8.** `expo-build-properties` in `app.json` enables `enableMinifyInReleaseBuilds` (code shrinking / obfuscation) and `enableShrinkResourcesInReleaseBuilds`; `extraProguardRules` keeps `expo.modules.signalstrength.**`. After changing native code, always test a **release** build on a device (`gradlew assembleRelease`) — R8 problems (missing classes, crashes on start) only show up there, not in `expo run:android` debug builds. If a crash only happens in release, check `android/app/build/outputs/mapping/release/` and add a keep rule.
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

**Single source: `app.json`.** Never write the version or the privacy policy date anywhere else.

| What | Where | Shown as |
|---|---|---|
| App version | `expo.version` (`"10.0.0"`) | footer `Sinyal Ölçer v10.0` (`src/appInfo.ts` → `APP_VERSION`) |
| Privacy policy effective date | `expo.extra.privacyPolicyDate` (`"2026-11"`, YYYY-MM) | "Kasım 2026" / "November 2026" — `policy.json` only contains the `{date}` placeholder; `PrivacyPolicy.tsx` and `scripts/build-privacy-page.mjs` fill it (`formatMonth`) |
| Play Store build number | `expo.android.versionCode` | not shown; must increase by ≥ 1 for every upload |

`package.json` has no `version` (`"private": true`); do not add one back. The app name is `expo.name` ("Signal Strength", default for all languages) plus `locales/tr.json` ("Sinyal Ölçer" for Turkish). When releasing:

- bump `expo.version` (e.g. `10.0.0` → `10.1.0`, shown as `v10.1`)
- increment `expo.android.versionCode` by at least 1 (Play Store rejects equal or lower codes)
- if the privacy policy text changed: set `expo.extra.privacyPolicyDate` and run `node scripts/build-privacy-page.mjs`
- run `npx expo prebuild --clean`

Author / license metadata belongs in `package.json` (`author`, `license`) and the `LICENSE` file — not in `app.json` (Expo's app config has no such fields).

Android package: `com.azatates.signalstrength` — do not change it (Play Store treats a new package as a different app).

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`). Run EAS CLI as `npx eas-cli@latest <command>`; substitute that for bare `eas` in docs examples. Production Play Store builds: `eas build -p android --profile production` (signed `.aab`).
Docs: https://docs.expo.dev/eas/index.md