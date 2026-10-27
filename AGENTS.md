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
