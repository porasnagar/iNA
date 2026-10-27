# iNA — Universal Apple Hardware Interoperability Suite for Android

[![License: MIT](https://img.shields.io/badge/license-MIT-53DA98.svg)](./LICENSE)
![Android 10–16+](https://img.shields.io/badge/Android-10–16%2B-111114.svg)
![Zero root](https://img.shields.io/badge/root-not%20required-111114.svg)

iNA brings iPhone-grade AirPods, Beats, Apple Watch, AirTag and HomePod features to any
Android 10–16+ phone — 100% user space: zero root, zero Magisk, zero iOS VM.

- Case-open proximity pop-up with Left / Right / Case battery
- Quick Settings **iNA Noise Control** tile (ANC → Transparency → Adaptive → Off)
- Live status notification, ear detection auto-pause, Conversation Awareness,
  Personalized Volume, head gestures, Ear Tip Fit Test, Find My chirp
- Signed OTA protocol rules, so new models arrive without an app update

## One repo, two apps

```text
.
├── src/routes, src/components   Website + interactive app simulator (TanStack Start, React 19)
├── src/lib/ina                  Protocol logic shared by the simulator (mirrors Kotlin)
├── src/android                  Native Android Studio project — dev.ibridge.android
├── public                       Favicon, manifest, robots.txt, sitemap.xml
├── .github/workflows            APK builds (debug + release)
└── vercel.json                  Website deployment on Vercel
```

The website reads the Kotlin sources straight from `src/android/` for its source viewer and
one-click `.zip` export, so the site and the app never drift apart.

## Website

```sh
bun install
bun run dev      # http://localhost:8080
bun run build
bun run test
```

### Deploy on Vercel

Import the repository in Vercel — `vercel.json` sets the install and build commands and builds
the server for Vercel (`NITRO_PRESET=vercel`). No other settings are needed. The Android
project in `src/android/` is plain text and is ignored by the web build except for the source
viewer.

## Android app

- Open `src/android/` in Android Studio (JDK 17), or build from the command line with
  Gradle **8.11.1**: `cd src/android && gradle assembleDebug`.
- Toolchain is pinned: AGP 8.10.1, Kotlin 2.1.21, compileSdk 36. Don't upgrade to Gradle 9+.
- GitHub Actions builds a test and a release APK on every push; push a `v*` tag to attach
  them to a GitHub Release. Release signing secrets are described in `src/android/README.md`.
- Runs at the display's highest refresh rate (90 / 120 / 144 Hz) where supported.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Licensed under the [MIT License](./LICENSE).

AirPods, Beats, Apple Watch, AirTag and HomePod are trademarks of Apple Inc. iNA is an
independent project and is not affiliated with or endorsed by Apple.
