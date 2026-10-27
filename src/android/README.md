# iNA — Universal Apple Hardware Interoperability Suite for Android

Package `dev.ibridge.android` · Android 10 (API 29) to Android 16 (API 36) · zero root.

## Open in Android Studio

1. Unzip and choose **File › Open** on the `iNA` folder.
2. Let Gradle sync (AGP 8.10, Kotlin 2.1, Gradle 8.11 — Android Studio downloads the wrapper automatically).
3. Run the `app` configuration on a phone with Bluetooth.

## Source map

| File | Role |
| --- | --- |
| `MainActivity.kt` | Onboarding & permission wizard, Connect a Device / Learn More, controls, rules |
| `iBridgeAndroid.kt` | `AppleProtocolSpec`, `ProximityPacketParser`, `IBridgeStateStore`, `OtaProtocolRuleManager`, `AirPodsProController`, Compose UI |
| `IBridgeForegroundService.kt` | BLE 0x004C / 0x07 scanner, case-open trigger, live status notification, boot receiver, ANCS bridge |
| `CasePopupOverlayActivity.kt` | `TYPE_APPLICATION_OVERLAY` bottom sheet, translucent fallback Activity, one-tap pairing |
| `InaQuickSettingsTileService.kt` | "iNA Noise Control" tile: ANC → Transparency → Adaptive → Off |
| `AppleDevices.kt` | Apple Watch (GATT heart rate/battery + ANCS), AirTag (Find My 0x12 scanner, distance, Play Sound), HomePod (Bonjour discovery) |
| `LiquidGlass.kt` | Liquid Glass surfaces, Android 12+ blur-behind, Reduce Transparency |
| `NextActionAdvisor.kt` | Suggested next action on the AirPods screen |
| `EmbeddedProductArt.kt` | Base64 copies of the product renders (also in `res/drawable-nodpi/`) |

## OTA rules

`OtaProtocolRuleManager` reads a signed envelope `{ "payload_b64", "sig_b64" }` from
`MANIFEST_URL`. Replace `RULES_PUBLIC_KEY_B64` with your P-256 public key before shipping;
until then remote manifests are rejected and the bundled rules stay active.

## Build on GitHub Actions

This project is the `android` branch of <https://github.com/porasnagar/iNA>. It is generated
from `src/android/` on the `website` branch — make changes there, not here.

Each change builds one `iNA-apks` artifact (kept 3 days) with:

- the test build (debug, debuggable)
- the release build (R8-optimised)

**Versions are tags.** Bump `versionName` in `app/build.gradle.kts`; the next build tags this
branch `v<versionName>` and publishes a GitHub Release with both APKs. Pushing a `v*` tag on
this branch yourself also builds and releases that commit (`.github/workflows/android.yml`).

### Signing the release build

Without secrets the release APK is signed with a throwaway debug key, so it installs but cannot
update an APK built on another run. To sign with your own key, add these repository secrets
(**Settings → Secrets and variables → Actions**):

| Secret | Value |
| --- | --- |
| `INA_KEYSTORE_BASE64` | `base64 -w0 ina-release.jks` |
| `INA_KEYSTORE_PASSWORD` | keystore password |
| `INA_KEY_ALIAS` | key alias |
| `INA_KEY_PASSWORD` | key password |

Create a keystore once with
`keytool -genkeypair -v -keystore ina-release.jks -alias ina -keyalg RSA -keysize 4096 -validity 10000`.

Toolchain is pinned: Gradle 8.11.1, AGP 8.10.1, Kotlin 2.1.21, JDK 17. Do not bump Gradle to 9.x without upgrading AGP to 9.x too.
Release lint is advisory (`checkReleaseBuilds = false`) so CI never fails on lint.
