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

## One repo, two branches

Repository: <https://github.com/porasnagar/iNA>

| Branch | Contents | Built by |
| --- | --- | --- |
| [`website`](https://github.com/porasnagar/iNA/tree/website) | Full project: website, simulator **and** the Android sources in `src/android/`. Edit here. | Lovable · Vercel |
| [`android`](https://github.com/porasnagar/iNA/tree/android) | Standalone Android Studio project (a copy of `src/android/` at the root). Generated — don't edit. | GitHub Actions → APKs |

Every change to `src/android/` on `website` is copied to `android` as one new commit by
`.github/workflows/android-branch.yml`, which then builds the test and release APKs.

```text
.
├── src/routes, src/components   Website + interactive app simulator (TanStack Start, React 19)
├── src/lib/ina                  Protocol logic shared by the simulator (mirrors Kotlin)
├── src/android                  Native Android Studio project — dev.ibridge.android
│   └── .github/workflows        APK workflow used at the root of the android branch
├── public                       Favicon, manifest, robots.txt, sitemap.xml
├── .github/workflows            website → android branch sync + APK build
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

Import the repository in Vercel and set **Settings → Git → Production Branch** to `website`.
`vercel.json` sets the install and build commands and builds the server for Vercel
(`NITRO_PRESET=vercel`). No other settings are needed.

## Android app

- Open the `android` branch (or `src/android/` on `website`) in Android Studio (JDK 17), or
  build from the command line with Gradle **8.11.1**: `gradle assembleDebug`.
- Toolchain is pinned: AGP 8.10.1, Kotlin 2.1.21, compileSdk 36. Don't upgrade to Gradle 9+.
- Runs at the display's highest refresh rate (90 / 120 / 144 Hz) where supported.

### Releases and tags

- Every sync builds a test (debug) and a release APK, kept as a 3-day Actions artifact.
- **New version = new tag.** Bump `versionName` in `src/android/app/build.gradle.kts`; the
  next build tags the `android` branch `v<versionName>` (e.g. `v1.1.0`) and publishes a
  [GitHub Release](https://github.com/porasnagar/iNA/releases) with both APKs.
- You can also push a `v*` tag on the `android` branch yourself to release that commit. This needs
  the android branch's own workflow, which is only copied over when the repository has an
  `INA_SYNC_TOKEN` secret (a GitHub token with the `workflow` scope); GitHub blocks the built-in token from writing workflow files.
- Release signing secrets are described in `src/android/README.md`.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Licensed under the [MIT License](./LICENSE).

AirPods, Beats, Apple Watch, AirTag and HomePod are trademarks of Apple Inc. iNA is an
independent project and is not affiliated with or endorsed by Apple.
