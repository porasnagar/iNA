# Case Popup & Overlay System

The case-open proximity card is one of the most recognizable features of AirPods on iOS. When the charging case lid opens near an Android device, iNA detects the BLE advertising frame within 200ms and presents a modal bottom sheet.

---

## 1. Overlay Mechanics

Android has strict background activity start restrictions (introduced in Android 10 and expanded through Android 15). To present an instant popup over any running app or home screen without breaking OS security policies:

1. **System Overlay Window (`TYPE_APPLICATION_OVERLAY`)**:
   - When the user grants the "Draw over other apps" (`SYSTEM_ALERT_WINDOW`) permission, iNA displays the popup as an overlay window via `WindowManager`.
   - Advantages: Renders smoothly over any foreground application or lock screen without interrupting the user's active task.
2. **Translucent Activity Fallback**:
   - If overlay permission has not been granted, iNA launches a translucent `Activity` (`CasePopupOverlayActivity.kt`) with an animated Compose bottom sheet.
3. **High-Priority Heads-Up Notification**:
   - If background activity launching is blocked by OEM battery restrictions, `IBridgeForegroundService` immediately displays a high-priority heads-up status card with battery levels and a tap-to-expand action.

---

## 2. Popup Rate-Limiting: `CasePopupGate`

Repeatedly opening and closing the lid or leaving the case open next to your phone should not continuously re-trigger intrusive popups.

iNA implements a dedicated state-machine gate (`CasePopupGate.kt`, verified by `CasePopupGateTest.kt`):

```text
               Case Lid Opens (Byte 8 Bit 3 == 1)
                              │
                              ▼
                   Is Popup Already Active?
                     ├── YES ──► Ignore (Update battery percentages only)
                     └── NO  ──► Has User Dismissed Current Session?
                                   ├── YES ──► Snooze until lid is seen closed
                                   └── NO  ──► Display Case-Open Bottom Sheet
```

- **Snooze Mechanism**: Once the user taps outside the popup or presses dismiss, no further popups are shown until the case lid is confirmed closed (or the Bluetooth frame goes silent for > 60 seconds).
- **Lid Close Auto-Dismiss**: When the user closes the lid, the bottom sheet gracefully animates closed automatically.

---

## 3. High Refresh Rate Display (90 / 120 / 144 Hz)

To ensure the sheet matches the buttery-smooth 120Hz ProMotion animation of iOS:
- Windows invoke `HighRefreshRate.apply(window)`.
- Inspects `display.supportedModes` to request the maximum available refresh rate from the panel (e.g., 90Hz, 120Hz, or 144Hz on Samsung, OnePlus, Xiaomi, and Pixel devices).
