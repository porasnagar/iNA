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
- `EmbeddedProductArt.kt` in `src/android/` is a stub; the real Base64 version is generated in the browser at download time from `src/assets/*.png` (keeps the repo and viewer small).
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
