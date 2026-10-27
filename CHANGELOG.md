# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-25

### Added
- Multi-tier L2CAP connection engine supporting Android 10 through Android 16+.
- Full Apple accessory matrix catalog: AirPods Pro 2/3, AirPods 4 ANC, AirPods Max (Lightning & USB-C), Beats Studio Pro, Beats Fit Pro, Solo 4, AirTag, and HomePod.
- Dynamic Protocol Hot-Updater for silent OTA manifest retrieval without app reinstall.
- Apple Watch GATT ANCS (Apple Notification Center Service) and AMS (Apple Media Service) companion stack.
- Apple Watch Wi-Fi Continuity Bonjour listener and TCP telemetry server on port 58443.
- Hands-Free Profile (HFP) wrist voice call integration via TelecomManager and InCallService.
- Jetpack Compose Liquid Glass design system across 4 distinct functional screens:
  - AirPods Settings Screen (real-time 3-channel battery HUD, active listening mode toggles, spatial audio).
  - Control Center Dual-Pill HUD Screen.
  - Apple Watch Companion Manager Screen with HealthKit telemetry gauges.
  - Camera Accessory Pair Screen.
- Official chameleon-apple project logo across all Android mipmap densities (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi) and high-res UI drawables.
- Automated GitHub Actions CI pipeline compiling APK release artifacts directly to GitHub Releases and the apk-bin branch.
- Automated unit test suite (25 tests) and Compose UI test suite (23 tests).

### Fixed
- Fixed Kotlin 2.0 compiler syntax issue on unused exception parameters.
- Fixed Android Gradle Plugin evaluation issue in release signing configuration.
- Added missing gradle.properties with android.useAndroidX=true.
- Added ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE to IBridgeForegroundService for Android 14+ safety.
- Handled Android 10-12 runtime permission gating gracefully without failing on API 31+ permissions.
