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
| `EmbeddedProductArt.kt` | Base64 copies of the product renders (also in `res/drawable-nodpi/`) |

## OTA rules

`OtaProtocolRuleManager` reads a signed envelope `{ "payload_b64", "sig_b64" }` from
`MANIFEST_URL`. Replace `RULES_PUBLIC_KEY_B64` with your P-256 public key before shipping;
until then remote manifests are rejected and the bundled rules stay active.
