# Welcome to the iNA Wiki

**iNA (Universal Apple Hardware Interoperability Suite for Android)** brings native iPhone-grade AirPods, Beats, Apple Watch, AirTag, and HomePod functionality to any Android 10–16+ smartphone — **100% in user space: zero root, zero Magisk, zero iOS virtual machines.**

---

## What is iNA?

For years, Android users pairing AirPods or Apple Watches have faced crippled features:
- Disconnected or missing battery levels for buds and case.
- No access to Active Noise Cancellation (ANC), Transparency, or Adaptive Audio modes.
- No in-ear auto-pause or Conversation Awareness.
- Inability to receive notifications or media controls on Apple Watch.
- Inability to find AirTags or trigger audible chimes.

iNA permanently solves this by reverse-engineering Apple's Bluetooth Low Energy (BLE) Continuity advertising frames (`Company ID 0x004C`) and Apple Accessory Protocol (AAP) over insecure L2CAP socket channels (`PSM 0x1001`), providing a seamless on-device experience.

---

## Wiki Navigation & Topics

| Wiki Page | What it Covers |
| :--- | :--- |
| **[Hardware Compatibility Matrix](Hardware-Compatibility-Matrix)** | Full list of supported AirPods, Beats, Apple Watch, AirTag, and HomePod models. |
| **[4-Tier L2CAP Architecture](4-Tier-L2CAP-Architecture)** | Deep dive into how iNA bypasses Android L2CAP restrictions without root. |
| **[AirPods Protocol Specification](AirPods-Protocol-Specification)** | Continuity packet breakdown (`0x07`), battery byte encoding, and AAP opcodes. |
| **[Apple Watch Continuity Stack](Apple-Watch-Continuity-Stack)** | ANCS notifications, AMS media sync, and GATT heart rate telemetry. |
| **[Case Popup & Overlay System](Case-Popup-&-Overlay-System)** | How `CasePopupGate` and `TYPE_APPLICATION_OVERLAY` present the bottom sheet. |
| **[Developer Guide & Building](Developer-Guide-&-Building)** | How to build the APK, run the React 19 simulator, and run test suites. |
| **[Troubleshooting & FAQ](Troubleshooting-&-FAQ)** | Common questions, Bluetooth permissions, and OEM background app killers. |

---

## Core Principles

1. **Zero Root**: Operates strictly within user-space Android permissions. No unlocked bootloader or Magisk modules required.
2. **100% On-Device Processing**: Packets and notifications never leave the handset. Zero cloud telemetry, zero remote tracking.
3. **Dual Branch Repository**:
   - **`website`**: Interactive Web Simulator (TanStack Start, React 19, Tailwind v4) and full source tree.
   - **`android`**: Standalone native Android Studio project (Gradle 8.11.1, Jetpack Compose, Kotlin 2.1).
