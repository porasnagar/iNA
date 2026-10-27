# Developer Guide & Building

This guide explains how to set up your local development environment, build both the native Android application and the web simulator, and run automated test suites.

---

## 1. Native Android Application

The native Android project lives under `src/android/` on the `website` branch and at the root of the standalone `android` branch.

### Toolchain Requirements
- **JDK**: JDK 17 (Temurin recommended)
- **Android SDK**: Compile SDK `36` (Android 16), Target SDK `36`, Min SDK `29` (Android 10)
- **Gradle**: `8.11.1` (Pinned — do not upgrade to Gradle 9+ without AGP 9+)
- **Android Gradle Plugin (AGP)**: `8.10.1`
- **Kotlin**: `2.1.21`

### Command-Line Build Commands

```sh
# Navigate to the Android project directory
cd src/android

# Build Debug APK (includes Protocol Rules developer tabs and hex monitors)
gradle assembleDebug

# Build Release APK (R8 / ProGuard optimized)
gradle assembleRelease

# Run unit tests
gradle testDebugUnitTest
```

Output APK locations:
- Debug: `app/build/outputs/apk/debug/app-debug.apk`
- Release: `app/build/outputs/apk/release/app-release.apk`

---

## 2. Interactive Website & Simulator

The web project is an interactive, full-stack application built with React 19, TanStack Start, and Tailwind CSS v4.

### Prerequisites
- **Node.js**: v20+ or v24+
- **Package Manager**: `bun` (recommended) or `pnpm` / `npm`

### Local Development Commands

```sh
# Install dependencies
bun install   # or pnpm install / npm install

# Start local development server (runs on http://localhost:8080)
bun run dev

# Run Vitest unit tests (protocol, suggestions, layout)
bun run test

# Production build
bun run build
```

---

## 3. CI/CD Architecture

- **`android-branch.yml`**: Runs on push to `website` and `main`. Automatically extracts `src/android/` into the standalone `android` branch and builds test/release APKs.
- **`sync-to-ina.yml`**: Runs in `porasnagar/apple-device-orbit` to auto-push updates to `porasnagar/iNA`.
- **`android.yml`**: Runs on the `android` branch whenever a `v*` release tag is pushed to compile signed production APKs and attach them to GitHub Releases.
