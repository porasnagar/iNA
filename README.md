# Apple Device Orbit

Build the complete, production-grade interactive prototype and Android codebase for iNA — Universal Apple Hardware Interoperability Suite for Android 10-16+ (package dev.ibridge.android).

Strictly follow all instructions and specs in the attached specification document:
1. Start on 'Connect a Device' screen by default when disconnected, with a prominent 'Learn More' section detailing supported Apple hardware (AirPods 1-5, AirPods Pro 1-3, AirPods Max 1-2, Beats, Apple Watch Series 4-11, AirTag 1-2, HomePod) and how iNA operates (zero root, user-space BLE 0x004C/0x07 + L2CAP 0x1001 AAP). When disconnected, battery must show '--%' (never mock the phone battery). Provide an explicit 'Preview Connected UI' toggle so users can easily test connected screens.
2. System-wide Case-Open Proximity Bottom Sheet Overlay simulation: trigger realistic iOS-style proximity bottom sheet over simulated Android home screen / apps with circular Left, Right, and Case battery rings with charging bolts (⚡), 3D product visuals, and one-tap 'Connect' / pairing flow.
3. Android Control Center / Quick Settings Tile: simulated toggleable shade with 'iNA Noise Control' tile cycling ANC -> Transparency -> Adaptive -> Off.
4. Persistent Live Status / Dynamic Island notification simulator with battery levels and fast audio mode switching.
5. First-time Onboarding & Permission Wizard for BLUETOOTH_SCAN, SYSTEM_ALERT_WINDOW, CompanionDeviceManager, and Notification Listener.
6. Apple Hardware Feature Controls when connected: In-ear optical detection auto-pause, Acoustic Listening Modes (ANC, Transparency, Adaptive, Off), Conversation Awareness (0x28), Personalized Volume (0x26), Head Gestures (Nod Yes / Shake No), Stem & Crown Remapping, Ear Tip Acoustic Fit Test, and Find My Piezo Chirp locator sound.
7. OTA / ORT Dynamic Protocol Rule Engine view (OtaProtocolRuleManager) with JSON rule inspection, dynamic L2CAP PSM override, and model hot-registration.
8. Complete Native Android Source Code Viewer & Downloader tab: provide cleanly formatted, production-grade Kotlin files for MainActivity.kt, iBridgeAndroid.kt, IBridgeForegroundService.kt, CasePopupOverlayActivity.kt, InaQuickSettingsTileService.kt, AndroidManifest.xml, and strings.xml with copy & download buttons so developers can drop them straight into Android Studio.
9. Premium Apple-grade dark theme aesthetics, crisp realistic vector/3D styling for all earbud and case models, safe-area insets, and responsive layout.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f100f6b8-493c-4253-ab3f-62db56ac1113).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
