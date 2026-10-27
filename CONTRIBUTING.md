# Contributing to iNA

Thanks for helping make Apple hardware work better on Android. This repo holds both the
website (with the in-browser app simulator) and the native Android app.

## Branches

- **`website`** — the full project. Open pull requests against this branch, including
  Android changes (they live in `src/android/`).
- **`android`** — generated copy of `src/android/` built by GitHub Actions. Don't open PRs
  against it; it is overwritten from `website` on every change.

## Repository layout

| Path | What lives there |
| --- | --- |
| `src/routes/`, `src/components/` | Website: TanStack Start + React 19 + Tailwind v4 |
| `src/lib/ina/` | Protocol logic used by the simulator (mirrors the Kotlin code) |
| `src/android/` | Native Android Studio project (`dev.ibridge.android`, Kotlin + Compose) |
| `.github/workflows/android-branch.yml` | Copies `src/android/` to the `android` branch, builds APKs, tags new versions |

## Getting started

```sh
bun install        # or npm install
bun run dev        # website + simulator on http://localhost:8080
bun run test       # protocol, suggestion and layout tests
```

Android: open `src/android/` in Android Studio (JDK 17), or run `gradle assembleDebug`
there with Gradle 8.11.1. Do not upgrade to Gradle 9+ — AGP 8.x does not support it.

## Ground rules

- **Keep both sides in sync.** Packet parsing (`protocol.ts` ↔ `ProximityPacketParser`),
  rules (`ota.ts` ↔ `OtaProtocolRuleManager`) and suggestions (`suggest.ts` ↔
  `NextActionAdvisor.kt`) must change together, with their tests passing.
- **Never fake battery.** When disconnected, accessory battery is `-1` and shows `--%`.
- **Zero root.** Everything must work as a normal user-space app on Android 10–16+.
- **Phone UI stays Apple dark.** The simulator and the Kotlin app use the Apple dark
  palette; the chameleon green is for the website and brand art only.
- Hardware-dependent protocol changes should say which device and firmware you tested on.

## Pull requests

1. Fork, branch from `website`, keep PRs focused.
2. Run `bun run test` and `bun run lint`.
3. Describe what changed and how you tested it (screenshots for UI changes).

By contributing you agree your work is released under the [MIT License](./LICENSE).
