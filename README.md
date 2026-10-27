<div align="center">

<img src="repo_readme_image.png" alt="iNA Banner" width="100%" />

# iNA
### Universal Apple Hardware Interoperability Suite for Android (Android 10 through 16+)

[![Platform](https://img.shields.io/badge/Platform-Android%2010%E2%80%9316%2B-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://github.com/porasnagar/iNA)
[![Zero Root](https://img.shields.io/badge/Root-Not%20Required-111114?style=for-the-badge&logo=shield&logoColor=white)](https://github.com/porasnagar/iNA)
[![Kotlin](https://img.shields.io/badge/Kotlin-2.1.21-7F52FF?style=for-the-badge&logo=kotlin&logoColor=white)](https://kotlinlang.org/)
[![Compose](https://img.shields.io/badge/Jetpack%20Compose-2025.05-4285F4?style=for-the-badge&logo=jetpackcompose&logoColor=white)](https://developer.android.com/jetpack/compose)
[![Release](https://img.shields.io/badge/Release-v1.0.0-007AFF?style=for-the-badge)](https://github.com/porasnagar/iNA/releases)
[![License](https://img.shields.io/badge/License-MIT-53DA98?style=for-the-badge)](./LICENSE)

<br/>

<p align="center">
  <b>Some say iNA stands for "i Not Apple". Others swear it means "i No Cupertino Fruit Company".</b><br/>
  <i>Who are we to confirm or deny? We are just a chameleon leaping gracefully over the walled garden fence.</i>
</p>

[Interactive Web Simulator](https://ina.porasnagar.dev/simulator) · [Android Standalone App](https://github.com/porasnagar/iNA/tree/android) · [Hardware Compatibility](#hardware-compatibility) · [Architecture](#under-the-hood-4-tier-l2cap-engine) · [Releases & APKs](https://github.com/porasnagar/iNA/releases)

</div>

---

## Overview

For over a decade, consumers have faced an artificial dichotomy: remain locked inside Cupertino's walled garden, or sacrifice the world-class features of their accessories when switching to Android. Connecting premium earbuds, headphones, smartwatches, or smart home tags to an Android phone traditionally resulted in degraded functionality: missing battery levels, inaccessible noise control modes, absent ear detection, and non-functional companion features.

**iNA** brings iPhone-grade AirPods, Beats, Apple Watch, AirTag, and HomePod functionality to any Android 10–16+ device — **100% in user space: zero root, zero Magisk, zero iOS virtual machines.**

- **Case-Open Proximity Popup**: Instant modal bottom sheet displaying individual Left, Right, and Case battery percentages.
- **Quick Settings Tile**: Single-tap **iNA Noise Control** tile cycling Active Noise Cancellation (ANC) → Transparency → Adaptive → Off.
- **Persistent Status & Notification Bar**: Live battery gauges and quick toggles directly in your status drawer.
- **Smart Ear Detection & Conversation Awareness**: Sub-second auto-pause and volume attenuation upon speaking.
- **Apple Watch Bridge**: Apple Notification Center Service (ANCS) sync, Apple Media Service (AMS) crown/touch controls, and HealthKit heart rate monitoring.
- **AirTag Precision Locator**: Continuity BLE beacon tracker, distance estimation radar, and Find My chirp triggers.
- **Signed OTA Hot-Updating**: Validated protocol rule manifests to support newly released accessory models without reinstalling the app.
- **Liquid Glass Interface**: High-refresh-rate (90 / 120 / 144 Hz) translucent design system with real-time blur behind.

---

## One Repo, Two Purpose-Built Branches

Repository: <https://github.com/porasnagar/iNA>

| Branch | Contents | Build & Deployment Target |
| :--- | :--- | :--- |
| **[`website`](https://github.com/porasnagar/iNA/tree/website)** | **Full Project**: Interactive web simulator (TanStack Start, React 19, Tailwind v4) **and** native Android sources in `src/android/`. | Vercel · Production Web App |
| **[`android`](https://github.com/porasnagar/iNA/tree/android)** | **Standalone Android Studio Project**: The `src/android/` tree promoted to root, ready to open directly in Android Studio. | GitHub Actions → Release APKs |

```text
.
├── src/routes, src/components   Website + interactive app simulator (TanStack Start, React 19)
├── src/lib/ina                  Shared Apple BLE/L2CAP protocol engine (mirrors Kotlin logic)
├── src/android                  Native Android Studio project — dev.ibridge.android
│   └── .github/workflows        APK build & GitHub release workflow used on the android branch
├── public                       Favicons, icons, manifest, sitemap, robots.txt
├── .github/workflows            website → android automated sync + APK build pipeline
├── repo_readme_image.png        Official chameleon repository banner
├── logo.png                     Official chameleon-apple project emblem
└── vercel.json                  Production web deployment configuration
```

Every change made to `src/android/` on the `website` branch is automatically synced to the `android` branch by [`.github/workflows/android-branch.yml`](.github/workflows/android-branch.yml), ensuring the simulator and the native application never drift apart.

---

## Hardware Compatibility

iNA provides independent, interoperability support for the following hardware (referential fair use):

| Accessory Family | Supported Models | Functional Capabilities |
| :--- | :--- | :--- |
| **In-Ear Audio** | AirPods Pro (1st & 2nd Gen), AirPods 4 (with ANC), AirPods (2nd & 3rd Gen) | Active Noise Cancellation (ANC), Transparency, Adaptive Audio; independent Left, Right & Case battery gauges; in-ear auto-pause; Conversation Awareness; Personalized Volume; Ear Tip Fit Test; low-latency AACP control |
| **Over-Ear Audio** | AirPods Max (Lightning & USB-C editions) | Digital Crown rotation direction toggle; Noise Control button mapping; Smart Case ultra-low power state; USB-C lossless audio routing |
| **Beats Audio** | Beats Studio Pro, Beats Fit Pro, Beats Solo 4, Powerbeats Pro 2 | Proximity popups, battery reporting, active listening modes, ear detection |
| **Smartwatches** | Apple Watch (Series 4–10, Apple Watch Ultra 1 & 2, SE) | Apple Notification Center Service (ANCS) mirroring, Apple Media Service (AMS) wrist playback controls, incoming call routing, GATT battery & heart rate telemetry |
| **Trackers** | AirTag & Find My Network accessories | Continuity BLE advertising scanner (`0x004C`, type `0x12`), precision proximity radar, audible chime buzzer |
| **Smart Speakers** | HomePod & HomePod mini | Continuity beacon recognition and mDNS local network audio discovery |

---

## Under the Hood: 4-Tier L2CAP Engine

Standard Android Bluetooth APIs historically blocked non-standard L2CAP channel allocation for non-system applications. iNA solves this without requiring root access through an adaptive four-tier connection engine:

```text
┌────────────────────────────────────────────────────────┐
│             iNA Adaptive Connection Engine             │
└───────────────────────────┬────────────────────────────┘
                            │
   ┌────────────────────────┼────────────────────────┐
   ▼                        ▼                        ▼
┌──────────────┐   ┌───────────────────┐   ┌──────────────────┐
│    Tier 1    │   │      Tier 2       │   │      Tier 3      │
│ Native L2CAP │   │ Hidden API Bypass │   │  Direct Socket   │
│ Android 16+  │   │ Android 10 to 15  │   │  Android 10–14   │
└──────────────┘   └───────────────────┘   └──────────────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │      Tier 4      │
                   │  Universal BLE   │
                   │ Continuity Frames│
                   └──────────────────┘
```

- **Tier 1 (Native Insecure L2CAP — Android 16 QPR3+, OxygenOS 16+, OneUI 9+)**:  
  Allocates standard insecure L2CAP channels on PSM `0x1001` directly through official platform primitives.
- **Tier 2 (Hidden API Exemption — Android 10 through 15)**:  
  Exempts hidden platform methods via targeted runtime double-reflection on `dalvik.system.VMRuntime`, safely unlocking `BluetoothDevice.createInsecureL2capSocket(0x1001)`.
- **Tier 3 (Direct Socket Constructor — Android 10 through 14)**:  
  Directly invokes the private constructor of `BluetoothSocket` with socket type `TYPE_L2CAP` (`3`), ensuring compatibility across legacy vendor-customized ROMs.
- **Tier 4 (Universal BLE GATT Fallback — Android 8 through 16+)**:  
  Full fallback utilizing standard BLE GATT characteristics and Apple Continuity advertising frames (`Company ID 0x004C`, type `0x07` and `0x12`), guaranteeing battery popups and basic status indicators across any device.

---

## Quick Start & Developer Guide

### 1. Web Simulator

The website contains a full-featured, real-time in-browser simulator for testing protocol packets, UI sheets, and hardware states:

```sh
# Install dependencies
bun install   # or npm install / pnpm install

# Start development server
bun run dev   # launches on http://localhost:8080

# Run automated test suites (protocol, OTA rules, suggestions)
bun run test
```

### 2. Android App (Native Studio Project)

- **Open in Android Studio**: Clone the repository and open either the `src/android/` folder or the standalone [`android`](https://github.com/porasnagar/iNA/tree/android) branch.
- **JDK Requirement**: JDK 17 (Temurin recommended).
- **Pinned Toolchain**: Gradle 8.11.1, AGP 8.10.1, Kotlin 2.1.21, compileSdk 36 (Android 16).

```sh
# Build debug APK via Gradle
cd src/android
gradle assembleDebug

# Build release APK
gradle assembleRelease
```

---

## Privacy & Security Manifesto

iNA is engineered around three uncompromised privacy principles:

1. **100% On-Device Processing**: All Bluetooth packets, L2CAP frames, Apple Watch notifications, and audio telemetry are processed strictly in-memory on your handset.
2. **Zero Telemetry & Tracking**: Zero analytics SDKs, zero tracking pixels, zero advertising frameworks, and zero remote logging.
3. **Completely Offline**: Operates without requiring logins, cloud accounts, or internet connectivity.

---

## Releases & Downloads

- **Latest APK Release**: Download the signed APK directly from [GitHub Releases (v1.0.0)](https://github.com/porasnagar/iNA/releases/tag/v1.0.0).
- **Automated CI Builds**: Every push to the `android` branch builds fresh debug and release APK artifacts via GitHub Actions.

---

## Open Source Governance

- [Contributing Guide](CONTRIBUTING.md): Workflow guidelines, branch layout, and testing standards.
- [Code of Conduct](CODE_OF_CONDUCT.md): Contributor Covenant v2.1 community standards.
- [Security Policy](SECURITY.md): Vulnerability reporting procedures.
- [Verification & Test Plan](ina_test_plan.md): Comprehensive device testing checklist.
- [Changelog](CHANGELOG.md): Version history and release notes.

---

## Legal & Trademark Notice

Apple, AirPods, AirPods Pro, AirPods Max, Apple Watch, Apple Watch Ultra, AirTag, HomePod, Beats, and macOS are registered trademarks of Apple Inc., registered in the United States and other countries and regions.

iNA is an independent, community-driven, open-source software project. This software is **NOT** manufactured by, sponsored by, endorsed by, approved by, or in any way affiliated with Apple Inc. or any of its subsidiaries.

All product names, logos, brands, trademarks, and registered trademarks referenced in this repository and documentation are the property of their respective owners. All company, product, and service names used in this project are for identification, compatibility, and referential fair-use purposes only.

---

## License

This project is licensed under the [MIT License](LICENSE).
