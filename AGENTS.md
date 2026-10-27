<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules

- The native Android project lives as plain text under `src/android/` and is loaded with `import.meta.glob(..., { query: "?raw" })` by `src/lib/android-source.ts`; edit Kotlin/XML there so the viewer and the zip stay in sync. Tailwind excludes that folder via `@source not`.
- Android product art is real PNGs in `src/android/app/src/main/res/drawable-nodpi/product_*.png` (downscaled copies of `src/assets/*.png`) referenced by `ProductArtKey.drawable`; regenerate them when the web renders change, because GitHub CI builds only what is in the repo.
- Developer-only Android UI (Protocol Rules tab, Preview Connected UI, hex/tier labels, tech permission lines) is gated by `BuildConfig.DEBUG` / `devOnly(...)` so release APKs stay minimal; the simulated phone mirrors the release app and keeps its preview switch only in the website's Simulator panel.
- Case-open pop-up frequency is decided only by `CasePopupGate` (in-app sheet, overlay, fallback Activity, heads-up); every close path must report `onDismissed`/`onHidden`, and `CasePopupGateTest.kt` covers the rules.
- Connect prefers AirPods already bonded in Android Bluetooth, then CompanionDeviceManager + createBond; the AAP channel tries a classic L2CAP `BluetoothSocket` via HiddenApiBypass first, and the app reports not connected rather than claiming a link it doesn't have.
- Android colours come from `InaColors` (snapshot-state palette set by `InaTheme` from `InaSettings.appearance`); the simulated phone's light mode is the `.phone-light` token override on the phone screen. Never hardcode surface/text colours in either.
- Android Kotlin can be compiled and its JVM/Robolectric tests run in the sandbox with a Nix JDK 17 + downloaded SDK/Gradle 8.11.1 against a /tmp copy of `src/android` (never build inside the repo).
- Prototype protocol logic (`src/lib/ina/protocol.ts`, `ota.ts`) mirrors `AppleProtocolSpec` / `ProximityPacketParser` / `OtaProtocolRuleManager` in Kotlin; change both sides together and keep `protocol.test.ts` passing.
- All prototype state lives in one React context (`src/lib/ina/store.tsx`); every simulated BLE packet is encoded then parsed through the real parser so the UI matches native behaviour.
- Disconnected battery values are always -1 and render as `--%`; never derive accessory battery from anything else.
- The suggested next action rules live in `src/lib/ina/suggest.ts` and are mirrored by `NextActionAdvisor.kt`; change both together and keep `suggest.test.ts` passing.
- Liquid Glass in the prototype is driven by `--glass-*` CSS variables used by the `liquid-glass`, `glass-scrim` and `bg-glass-tile` utilities; Reduce Transparency only toggles the `.reduce-transparency` class on the phone screen, so new sheets must use these utilities instead of raw blur classes.
- On Android, glass comes from `LocalGlass` (provided by `InaTheme` from `InaSettings.reduceTransparency`); set `backdropBlurred` only where something actually blurs the backdrop, so unblurred surfaces stay near-opaque for legibility.
- Release APK signing reads `INA_KEYSTORE_FILE` / `INA_KEYSTORE_PASSWORD` / `INA_KEY_ALIAS` / `INA_KEY_PASSWORD` env vars and falls back to debug signing; release lint is advisory so CI never fails on it.

- Binary Android resources (launcher PNGs in `src/android/**/res/mipmap-*`) are real files so GitHub CI can build them; `android-source.ts` excludes `*.png` from the raw glob and adds them to the zip via a `?url` glob.
- Official brand art is served from Lovable Assets pointers in `src/assets/ina-*.asset.json` via `src/components/ina/brand.ts`; favicon/manifest icons are real files in `public/`.
- Accent scoping: `.theme-brand` (root layout wrapper) sets the website accent to the brand tokens; `.theme-apple` on the phone frame resets it to the original Apple palette, so anything rendered inside the phone never inherits the website accent.
- Website motion lives in `src/components/ina/site/motion.tsx` (Reveal / Stagger / StaggerItem / FloatingArt, framer-motion springs, transform/opacity only); `<MotionConfig reducedMotion="user">` and the route `PageTransition` sit in `__root.tsx`. Never animate inside the simulated phone with these.
- The simulated phone is laid out at 390×844 and scaled by `phoneScale()` to fit the viewport (tested in `phoneScale.test.ts`); `allowBare` swaps to an edge-to-edge screen under 768px, used by `/simulator` with its Phone / Controls tabs.
- Website pages are separate routes (`/`, `/simulator`, `/architecture`, `/hardware`, `/source`) with exactly one h1 each; the home page is a long scroll that previews each page and links to it. Keep `public/sitemap.xml` in sync when adding routes.
- Android windows request the panel's fastest refresh rate via `HighRefreshRate.apply(...)` (activities and the WindowManager overlay); apply it to any new window.
- Vercel deploys use `vercel.json` (`NITRO_PRESET=vercel`); the Lovable build ignores that preset and still targets its own host. GitHub links and branch names read from `REPO` in `src/components/ina/brand.ts`.
- Git layout: `website` is the full project (synced branch, Vercel production); `android` is generated by `.github/workflows/android-branch.yml` as one commit per change from the `src/android` tree (via `git mktree`), so never edit it directly. The android branch's own workflow lives at `src/android/.github/workflows/android.yml` and is only published when an `INA_SYNC_TOKEN` secret exists, because the built-in GITHUB_TOKEN may not write workflow files; keep its build steps in step with the root workflow.
- Android releases are driven by tags: a new `versionName` in `app/build.gradle.kts` makes CI tag `v<versionName>` and publish a GitHub Release; bump it to ship.
